// The world at play: the 3D side of a session, kept apart from the menus around it.
//
// It runs the scene (plaza or a home), walks the local player (keys or click-to-walk, sliding
// along whatever is in the way, sitting down on benches and furniture), shows everyone else
// where the server says they are (smoothed a moment behind, so they glide instead of jump),
// and handles home decorating. The menus talk to it through the functions it returns and
// hear back through `on(event, data)`.
import * as THREE from 'three'
import { createStage } from './engine/stage.js'
import { createControls } from './engine/controls.js'
import { createLabels } from './engine/labels.js'
import { createBursts } from './engine/particles.js'
import { createAvatar, STATE, EMOTE_MS } from './avatar/avatar.js'
import { createEnv } from './scenes/env.js'
import { createPlaza } from './scenes/plaza.js'
import { createHome, HOME_CELLS } from './scenes/home.js'
import { buildFurniture } from './scenes/furniture.js'
import { parseItem } from './palette.js'

const WALK_SPEED = 3.6 // meters a second
const RADIUS = 0.3 // how wide a player is, for bumping into things
const SEND_MS = 100 // own position goes out ten times a second at most
const DELAY_MS = 120 // others are drawn this far in the past, between two known positions
const SEAT_REACH = 1.6 // sitting down finds a seat this close
const CLICK_SEAT = 0.9 // clicking this close to a seat walks there and sits

const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle))
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

export function createGame ({ canvas, labelLayer, on }) {
  const stage = createStage(canvas)
  const env = createEnv()
  const labels = createLabels(labelLayer)
  const bursts = createBursts()
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const clock = new THREE.Clock()
  const controls = createControls(canvas, { onClick: click })

  let world = null // the current scene (plaza or home)
  let me = null // { id, avatar, x, z, ry, state, ... }
  const others = new Map() // id -> { avatar, samples, x, z, ry, st, speed }
  let target = null // where click-to-walk is heading
  let pendingSeat = null // sit down on arrival
  let emoteUntil = 0
  let seat = null
  let lastSent = { t: 0, key: '' }
  let frameRequest = 0
  let editor = null
  let blurred = false
  let showcasing = false
  const focus = new THREE.Vector3()

  // A ring on the ground where a click sent the player
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.32, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }))
  marker.rotation.x = -Math.PI / 2

  // ---------- Scenes and players ----------

  function enter ({ room, players }, myId, catalog) {
    leave()
    showcasing = false
    controls.enabled = true
    world = room.kind === 'home' ? createHome(env) : createPlaza(env)
    if (room.kind === 'home') world.setLayout(room.layout || [], catalog)
    world.room = room
    world.scene.add(bursts.object, marker)
    stage.setScene(world.scene)
    for (const p of players) {
      if (p.id === myId) addMe(p)
      else addOther(p)
    }
    // Start the camera behind the player
    controls.view.yaw = (me?.ry ?? 0) + Math.PI
    controls.view.distance = room.kind === 'home' ? 7.5 : 9
    controls.view.pitch = 0.42
    controls.snap()
    stage.resize()
    start()
  }

  // An empty plaza with the camera slowly circling it: the backdrop of the sign-in screens
  function showcase () {
    if (showcasing) return
    enter({ room: { kind: 'plaza' }, players: [] }, null, {})
    showcasing = true
    controls.enabled = false
    controls.view.distance = 17
    controls.view.pitch = 0.3
    controls.snap()
  }

  function leave () {
    editor?.stop()
    editor = null
    for (const id of [...others.keys()]) removeOther(id)
    if (me) {
      labels.remove(me.id)
      me.avatar.dispose()
      me = null
    }
    world = null
    target = null
    pendingSeat = null
    seat = null
  }

  function addMe (p) {
    const avatar = createAvatar(p.avatar)
    world.scene.add(avatar.root)
    me = { id: p.id, name: p.name, avatar, x: p.x, z: p.z, ry: p.ry, state: STATE.idle, speed: 0, blocked: 0 }
    labels.add(p.id, avatar.label, p.name, p.level, true)
  }

  function addOther (p) {
    if (!world) return
    removeOther(p.id)
    const avatar = createAvatar(p.avatar)
    avatar.root.position.set(p.x, 0, p.z)
    avatar.root.rotation.y = p.ry
    avatar.hitTargets.forEach(mesh => { mesh.userData.playerId = p.id })
    world.scene.add(avatar.root)
    others.set(p.id, { id: p.id, avatar, samples: [{ t: performance.now(), x: p.x, z: p.z, ry: p.ry, st: p.st }], x: p.x, z: p.z, ry: p.ry, st: p.st, speed: 0 })
    labels.add(p.id, avatar.label, p.name, p.level)
  }

  function removeOther (id) {
    const other = others.get(id)
    if (!other) return
    other.avatar.dispose()
    labels.remove(id)
    others.delete(id)
  }

  function snapshot (list) {
    const now = performance.now()
    for (const [id, x, z, ry, st] of list) {
      const other = others.get(id)
      if (!other) continue
      other.samples.push({ t: now, x, z, ry, st })
      if (other.samples.length > 20) other.samples.shift()
    }
  }

  // Where another player should be drawn right now: between the two samples around
  // "a moment ago", or at the latest one
  function interpolate (other, now) {
    const at = now - DELAY_MS
    const s = other.samples
    let a = s[0]
    let b = s[s.length - 1]
    for (let i = s.length - 1; i > 0; i--) {
      if (s[i - 1].t <= at) {
        a = s[i - 1]
        b = s[i]
        break
      }
    }
    const k = b.t > a.t ? clamp((at - a.t) / (b.t - a.t), 0, 1) : 1
    return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, ry: a.ry + wrap(b.ry - a.ry) * k, st: b.st }
  }

  // A seat under someone, if they're sitting on one (otherwise they sit on the floor)
  const seatAt = (x, z) => world?.seats.find(s => Math.hypot(s.x - x, s.z - z) < 0.3) || null

  // ---------- Moving the local player ----------

  function collide (x, z) {
    for (const c of world.colliders) {
      if (c.r !== undefined) {
        const dx = x - c.x
        const dz = z - c.z
        const d = Math.hypot(dx, dz)
        const min = c.r + RADIUS
        if (d < min && d > 1e-4) {
          x = c.x + (dx / d) * min
          z = c.z + (dz / d) * min
        }
      } else {
        const cx = clamp(x, c.minX, c.maxX)
        const cz = clamp(z, c.minZ, c.maxZ)
        const dx = x - cx
        const dz = z - cz
        const d = Math.hypot(dx, dz)
        if (d < RADIUS) {
          if (d > 1e-4) {
            x = cx + (dx / d) * RADIUS
            z = cz + (dz / d) * RADIUS
          } else {
            // Inside the box: out the nearest side
            const sides = [[c.minX - RADIUS - x, 0], [c.maxX + RADIUS - x, 0], [0, c.minZ - RADIUS - z], [0, c.maxZ + RADIUS - z]]
            const [mx, mz] = sides.sort((p, q) => Math.abs(p[0] + p[1]) - Math.abs(q[0] + q[1]))[0]
            x += mx
            z += mz
          }
        }
      }
    }
    return [clamp(x, world.bounds.min, world.bounds.max), clamp(z, world.bounds.min, world.bounds.max)]
  }

  function sitDown (spot) {
    seat = spot
    me.x = spot.x
    me.z = spot.z
    me.ry = spot.ry
    me.state = STATE.sit
    emoteUntil = Infinity
  }

  function standUp () {
    seat = null
    emoteUntil = 0
  }

  function moveMe (dt, now) {
    let dir = controls.enabled ? controls.walkInput() : null
    if (dir) {
      target = null
      pendingSeat = null
    } else if (target) {
      const dx = target.x - me.x
      const dz = target.z - me.z
      const d = Math.hypot(dx, dz)
      if (d < 0.12) {
        target = null
        marker.material.opacity = 0
        if (pendingSeat) {
          sitDown(pendingSeat)
          pendingSeat = null
        }
      } else {
        dir = { x: dx / d, z: dz / d }
      }
    }
    if (dir) {
      if (seat || emoteUntil > now) standUp()
      const step = WALK_SPEED * (dir.strength ?? 1) * dt
      const [x, z] = collide(me.x + dir.x * step, me.z + dir.z * step)
      const moved = Math.hypot(x - me.x, z - me.z)
      // Walking into a wall for a while gives up on a click target
      me.blocked = moved < step * 0.2 ? me.blocked + dt : 0
      if (me.blocked > 0.4 && target) {
        target = null
        pendingSeat = null
        marker.material.opacity = 0
      }
      me.x = x
      me.z = z
      me.speed = moved / Math.max(dt, 1e-4)
      me.ry = wrap(me.ry + wrap(Math.atan2(dir.x, dir.z) - me.ry) * Math.min(1, dt * 12))
      me.state = STATE.walk
    } else {
      me.speed = 0
      if (emoteUntil <= now && !seat) me.state = STATE.idle
    }
  }

  /** Plays an emote; sitting looks for a seat nearby first. */
  function emote (name) {
    if (!me || editor?.active) return
    const now = performance.now()
    target = null
    pendingSeat = null
    if (name === 'sit') {
      const free = (world.seats || [])
        .filter(s => Math.hypot(s.x - me.x, s.z - me.z) < SEAT_REACH)
        .filter(s => ![...others.values()].some(o => Math.hypot(o.x - s.x, o.z - s.z) < 0.3))
        .sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z))[0]
      if (free) sitDown(free)
      else {
        seat = null
        me.state = STATE.sit
        emoteUntil = Infinity
      }
      return
    }
    seat = null
    me.state = STATE[name]
    emoteUntil = EMOTE_MS[name] ? now + EMOTE_MS[name] : Infinity
  }

  // Tell the server where the player is: whenever something changed, ten times a second at most
  function sendState (now, send) {
    const key = `${me.x.toFixed(2)},${me.z.toFixed(2)},${me.ry.toFixed(2)},${me.state}`
    if (key === lastSent.key || now - lastSent.t < SEND_MS) return
    lastSent = { t: now, key }
    send({ x: +me.x.toFixed(2), z: +me.z.toFixed(2), ry: +me.ry.toFixed(2), st: me.state })
  }

  // ---------- Clicks ----------

  function hit (x, y, objects) {
    const box = canvas.getBoundingClientRect()
    pointer.set(((x - box.left) / box.width) * 2 - 1, -((y - box.top) / box.height) * 2 + 1)
    raycaster.setFromCamera(pointer, stage.camera)
    return raycaster.intersectObjects(objects, true)[0] || null
  }

  function click (x, y) {
    if (!world || !me) return
    if (editor?.active) return editor.click(x, y)
    // Another player: their profile
    const people = [...others.values()].flatMap(o => o.avatar.hitTargets)
    const person = hit(x, y, people)
    if (person) {
      on('profile', person.object.userData.playerId)
      return
    }
    const thing = hit(x, y, world.interactives)
    if (thing) {
      let node = thing.object
      while (node && !node.userData.action) node = node.parent
      if (node?.userData.action?.type === 'shop') on('shop', node.userData.action.tab)
      return
    }
    const ground = hit(x, y, world.ground)
    if (!ground) return
    const p = ground.point
    // Near a seat: walk there and sit down
    const near = (world.seats || []).find(s => Math.hypot(s.x - p.x, s.z - p.z) < CLICK_SEAT)
    target = near ? { x: near.x, z: near.z } : { x: clamp(p.x, world.bounds.min, world.bounds.max), z: clamp(p.z, world.bounds.min, world.bounds.max) }
    pendingSeat = near || null
    marker.position.set(target.x, 0.03, target.z)
    marker.material.opacity = 0.9
  }

  // ---------- The frame ----------

  function frame (send) {
    frameRequest = requestAnimationFrame(() => frame(send))
    const dt = Math.min(0.05, clock.getDelta())
    const now = performance.now()
    const t = clock.elapsedTime
    if (!world) return
    env.update(dt)
    if (me) {
      moveMe(dt, now)
      me.avatar.root.position.set(me.x, 0, me.z)
      me.avatar.root.rotation.y = me.ry
      me.avatar.update(dt, t, { state: me.state, speed: me.speed, seat })
      sendState(now, send)
      focus.set(me.x, 1.25, me.z)
    } else {
      focus.copy(world.center)
      if (showcasing) controls.view.yaw += dt * 0.05
    }
    for (const other of others.values()) {
      const at = interpolate(other, now)
      other.speed = Math.hypot(at.x - other.x, at.z - other.z) / Math.max(dt, 1e-4)
      other.x = at.x
      other.z = at.z
      other.ry = at.ry
      other.st = at.st
      other.avatar.root.position.set(at.x, 0, at.z)
      other.avatar.root.rotation.y = at.ry
      other.avatar.update(dt, t, { state: at.st, speed: other.speed, seat: at.st === STATE.sit ? seatAt(at.x, at.z) : null })
    }
    marker.material.opacity = Math.max(0, marker.material.opacity - dt * 0.8)
    controls.update(stage.camera, focus, dt, me && me.state === STATE.walk ? me.ry : null)
    // Level of detail: faces and shadows only near the camera
    if (me) me.avatar.setDistance(stage.camera.position.distanceTo(focus))
    for (const other of others.values()) other.avatar.setDistance(stage.camera.position.distanceTo(other.avatar.root.position))
    world.update(dt, focus, stage.camera, t)
    bursts.update(dt)
    editor?.update()
    if (blurred) stage.setBlur(true, stage.camera.position.distanceTo(focus))
    stage.render(dt * 1000)
    const box = canvas.getBoundingClientRect()
    labels.update(stage.camera, box.width, box.height)
  }

  let sendFn = () => {}
  function start () {
    if (!frameRequest) {
      clock.getDelta()
      frame((state) => sendFn(state))
    }
  }

  // ---------- Decorating ----------
  // In their own home the owner picks furniture up and puts it down on the floor grid. A
  // see-through copy follows the pointer: green where it fits, red where it doesn't.

  function createEditor () {
    const state = { active: false, layout: [], catalog: {}, holding: null, selected: null, onChange: null, ghost: null, cell: null }
    const ghostMaterial = new THREE.MeshStandardMaterial({ color: '#7fe0a0', transparent: true, opacity: 0.55, emissive: '#3fbf70', emissiveIntensity: 0.35, depthWrite: false })
    const footprint = (item, r) => (r % 2 ? [item.size[1], item.size[0]] : item.size)

    // Whether a piece fits at x, z (turned r times), ignoring the one being moved
    function fits (itemId, x, z, r, skip = -1) {
      const item = state.catalog[itemId]
      const [w, d] = footprint(item, r)
      if (x < 0 || z < 0 || x + w > HOME_CELLS || z + d > HOME_CELLS) return false
      if (item.floor) return true
      return !state.layout.some((p, i) => {
        if (i === skip) return false
        const other = state.catalog[p.i]
        if (!other || other.floor) return false
        const [ow, od] = footprint(other, p.r)
        return x < p.x + ow && p.x < x + w && z < p.z + od && p.z < z + d
      })
    }

    function setGhost (itemId) {
      if (state.ghost) {
        world.scene.remove(state.ghost)
        state.ghost = null
      }
      if (!itemId) return
      const look = parseItem(itemId)
      const built = buildFurniture(env, state.catalog[itemId].model, look.hex)
      built.object.traverse(node => {
        if (node.isMesh) {
          node.material = ghostMaterial
          node.castShadow = false
        }
      })
      state.ghost = built.object
      world.scene.add(state.ghost)
    }

    function commit () {
      world.setLayout(state.layout, state.catalog)
      state.onChange?.(state.layout.map(p => ({ ...p })))
    }

    // The floor cell under the pointer, for the piece being held
    function cellAt (x, y) {
      const floorHit = hit(x, y, world.ground)
      if (!floorHit || !state.holding) return null
      const item = state.catalog[state.holding.i]
      const [w, d] = footprint(item, state.holding.r)
      return { x: Math.round(floorHit.point.x - w / 2), z: Math.round(floorHit.point.z - d / 2) }
    }

    function onMove (event) {
      if (!state.active || !state.holding) return
      state.cell = cellAt(event.clientX, event.clientY)
    }

    return {
      get active () {
        return state.active
      },
      start (layout, catalog, onChange) {
        Object.assign(state, { active: true, layout: layout.map(p => ({ ...p })), catalog, onChange, holding: null, selected: null, cell: null })
        world.showGrid(true)
        canvas.addEventListener('pointermove', onMove)
      },
      stop () {
        if (!state.active) return
        // Something still in hand goes back where it came from
        if (state.holding?.from) {
          state.layout.push(state.holding.from)
          commit()
        }
        state.active = false
        state.holding = null
        state.selected = null
        setGhost(null)
        world?.showGrid(false)
        canvas.removeEventListener('pointermove', onMove)
        on('editSelect', null)
      },
      /** Takes a piece from the inventory into hand. */
      hold (itemId) {
        state.holding = { i: itemId, r: 0, from: null }
        state.selected = null
        setGhost(itemId)
        on('editSelect', null)
      },
      rotate () {
        if (state.holding) {
          state.holding.r = (state.holding.r + 1) % 4
          return
        }
        if (state.selected === null) return
        const p = state.layout[state.selected]
        const r = (p.r + 1) % 4
        if (fits(p.i, p.x, p.z, r, state.selected)) {
          p.r = r
          commit()
        }
      },
      /** Picks the selected piece up to put it somewhere else. */
      move () {
        if (state.selected === null) return
        const [p] = state.layout.splice(state.selected, 1)
        state.selected = null
        commit()
        state.holding = { i: p.i, r: p.r, from: p }
        setGhost(p.i)
        on('editSelect', null)
      },
      remove () {
        if (state.selected === null) return
        state.layout.splice(state.selected, 1)
        state.selected = null
        commit()
        on('editSelect', null)
      },
      cancel () {
        if (state.holding?.from) {
          state.layout.push(state.holding.from)
          commit()
        }
        state.holding = null
        setGhost(null)
      },
      click (x, y) {
        if (state.holding) {
          const cell = cellAt(x, y)
          if (cell && fits(state.holding.i, cell.x, cell.z, state.holding.r)) {
            state.layout.push({ i: state.holding.i, x: cell.x, z: cell.z, r: state.holding.r })
            commit()
            const placed = state.holding
            state.holding = null
            setGhost(null)
            on('editPlaced', placed.i)
          }
          return
        }
        const piece = hit(x, y, [world.furniture])
        state.selected = piece ? piece.object.userData.placed ?? null : null
        on('editSelect', state.selected === null ? null : state.layout[state.selected].i)
      },
      update () {
        if (!state.ghost || !state.holding) return
        const cell = state.cell
        if (!cell) {
          state.ghost.visible = false
          return
        }
        const item = state.catalog[state.holding.i]
        const [w, d] = footprint(item, state.holding.r)
        state.ghost.visible = true
        state.ghost.position.set(cell.x + w / 2, 0.02, cell.z + d / 2)
        state.ghost.rotation.y = -state.holding.r * (Math.PI / 2)
        const ok = fits(state.holding.i, cell.x, cell.z, state.holding.r)
        ghostMaterial.color.set(ok ? '#7fe0a0' : '#ff8a8a')
        ghostMaterial.emissive.set(ok ? '#3fbf70' : '#e05050')
      }
    }
  }

  // ---------- What the menus can do ----------

  return {
    stage,
    controls,
    enter,
    showcase,
    leave,
    setSend (fn) {
      sendFn = fn
    },
    addPlayer: addOther,
    removePlayer: removeOther,
    snapshot,
    say: (id, text) => labels.say(id, text),
    setLevel: (id, level) => labels.level(id, level),
    setLook (id, avatar) {
      if (me?.id === id) me.avatar.setLook(avatar)
      else others.get(id)?.avatar.setLook(avatar)
    },
    setLayout (layout, catalog) {
      if (world?.kind === 'home') world.setLayout(layout, catalog)
    },
    emote,
    get mine () {
      return me
    },
    get room () {
      return world?.room ?? null
    },
    get state () {
      return me?.state ?? STATE.idle
    },
    /** Blurs the world (depth of field) behind open menus. */
    setBlur (on) {
      blurred = on
      if (!on) stage.setBlur(false)
    },
    sparkle () {
      if (me) bursts.sparkle(new THREE.Vector3(me.x, 1.4, me.z))
    },
    confetti () {
      if (me) bursts.confetti(new THREE.Vector3(me.x, 1.2, me.z))
    },
    get editor () {
      if (!editor && world?.kind === 'home') editor = createEditor()
      return editor
    },
    resize: () => stage.resize(),
    dispose () {
      cancelAnimationFrame(frameRequest)
      frameRequest = 0
      leave()
      controls.dispose()
      labels.clear()
      stage.dispose()
    }
  }
}
