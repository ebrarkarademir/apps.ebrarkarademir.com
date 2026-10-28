// The third-person camera and the input that drives it, the way online role-playing games do it.
// The camera orbits the player and glides: every turn, tilt and zoom eases in, and the point it
// follows trails the player a little. Drag (either mouse button) to look around, scroll or pinch
// to zoom, Q and E to turn. Running forward swings the camera round behind the player by itself;
// backing off or sidestepping leaves it be. W A S D and the arrows walk relative to where the
// camera looks, both mouse buttons together run forward, and on touch screens a joystick
// appears wherever the left thumb goes down. A press that doesn't drag is a click.

const DRAG_PX = 6
const FOLLOW_AFTER_MS = 900 // after the last manual turn, running brings the camera back behind
const STICK_PX = 56 // how far the joystick's knob travels
const KEYS = {
  KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r',
  KeyQ: 'turnLeft', KeyE: 'turnRight'
}
const WALK_KEYS = ['f', 'b', 'l', 'r']

const typing = (target) => !!target?.closest?.('input, textarea, select, [contenteditable="true"]')
const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle))
const ease = (rate, dt) => 1 - Math.exp(-rate * dt)

export function createControls (dom, { onClick }) {
  const held = new Set()
  // Where the camera is headed (menus and input change this) and where it is now
  const view = { yaw: Math.PI, pitch: 0.42, distance: 9, min: 3.2, max: 18, lastDrag: 0 }
  const cam = { yaw: view.yaw, pitch: view.pitch, distance: view.distance }
  const look = { x: 0, y: 0, z: 0, ready: false } // the followed point, trailing the player
  const pointers = new Map()
  let pinch = 0
  let enabled = true
  let bothButtons = false
  let stick = null // { id, x, y, dx, dy } while a thumb is on the joystick

  // The joystick: a ring and a knob, shown under the thumb
  const ring = document.createElement('div')
  ring.className = 'stick'
  const knob = document.createElement('div')
  knob.className = 'knob'
  ring.appendChild(knob)
  dom.parentElement?.appendChild(ring)

  function showStick () {
    ring.classList.toggle('on', !!stick)
    if (!stick) return
    ring.style.left = `${stick.x}px`
    ring.style.top = `${stick.y}px`
    knob.style.transform = `translate(${stick.dx}px, ${stick.dy}px)`
  }

  // A thumb landing on the left part of a touch screen starts the joystick there
  const joystickZone = (event) => {
    const box = dom.getBoundingClientRect()
    return event.pointerType === 'touch' && event.clientX - box.left < box.width * 0.42 && event.clientY - box.top > box.height * 0.3
  }

  function onDown (event) {
    if (!enabled) return
    dom.setPointerCapture?.(event.pointerId)
    if (event.pointerType === 'mouse') bothButtons = event.buttons === 3
    if (!stick && joystickZone(event)) {
      const box = dom.getBoundingClientRect()
      stick = { id: event.pointerId, x: event.clientX - box.left, y: event.clientY - box.top, dx: 0, dy: 0, startX: event.clientX, startY: event.clientY }
      showStick()
      return
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false })
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      pinch = Math.hypot(a.x - b.x, a.y - b.y)
    }
  }

  function onMove (event) {
    if (event.pointerType === 'mouse') bothButtons = event.buttons === 3
    if (stick?.id === event.pointerId) {
      let dx = event.clientX - stick.startX
      let dy = event.clientY - stick.startY
      const length = Math.hypot(dx, dy)
      if (length > STICK_PX) {
        dx = (dx / length) * STICK_PX
        dy = (dy / length) * STICK_PX
      }
      stick.dx = dx
      stick.dy = dy
      if (length > DRAG_PX) stick.pushed = true
      showStick()
      return
    }
    const p = pointers.get(event.pointerId)
    if (!p) return
    const dx = event.clientX - p.x
    const dy = event.clientY - p.y
    p.x = event.clientX
    p.y = event.clientY
    if (!p.moved && Math.hypot(p.x - p.startX, p.y - p.startY) > DRAG_PX) p.moved = true
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      const spread = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinch) zoom((pinch - spread) * 0.01)
      pinch = spread
      return
    }
    if (!p.moved) return
    view.yaw = wrap(view.yaw - dx * 0.007)
    view.pitch = Math.min(1.3, Math.max(0.08, view.pitch + dy * 0.0045))
    view.lastDrag = performance.now()
  }

  function onUp (event) {
    if (event.pointerType === 'mouse') bothButtons = event.buttons === 3
    if (stick?.id === event.pointerId) {
      // A tap there, without pushing the stick, is still a click
      const tapped = !stick.pushed && event.type === 'pointerup'
      stick = null
      showStick()
      if (tapped) onClick(event.clientX, event.clientY)
      return
    }
    const p = pointers.get(event.pointerId)
    if (!p) return
    pointers.delete(event.pointerId)
    if (pointers.size < 2) pinch = 0
    // Only a plain press of the main button (or a tap) is a click
    if (!p.moved && pointers.size === 0 && event.type === 'pointerup' && event.button === 0) onClick(event.clientX, event.clientY)
  }

  function zoom (amount) {
    view.distance = Math.min(view.max, Math.max(view.min, view.distance * (1 + amount)))
  }

  function onWheel (event) {
    if (!enabled) return
    event.preventDefault()
    zoom(Math.sign(event.deltaY) * Math.min(0.22, Math.abs(event.deltaY) * 0.0015))
  }

  function onKey (event) {
    const code = KEYS[event.code]
    if (!code) return
    if (event.type === 'keydown') {
      if (!enabled || typing(event.target) || event.ctrlKey || event.metaKey || event.altKey) return
      held.add(code)
      event.preventDefault()
    } else {
      held.delete(code)
    }
  }

  // Keys held when the window loses focus never see their keyup
  const onBlur = () => {
    held.clear()
    bothButtons = false
  }
  const noMenu = (event) => event.preventDefault()

  dom.addEventListener('pointerdown', onDown)
  dom.addEventListener('pointermove', onMove)
  dom.addEventListener('pointerup', onUp)
  dom.addEventListener('pointercancel', onUp)
  dom.addEventListener('wheel', onWheel, { passive: false })
  dom.addEventListener('contextmenu', noMenu)
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKey)
  window.addEventListener('blur', onBlur)

  // Whether the player is running "forward", the only way of moving that pulls the camera round
  function runningForward () {
    if (stick) return -stick.dy > Math.abs(stick.dx) * 0.8
    if (WALK_KEYS.some(key => held.has(key))) return held.has('f') && !held.has('b')
    return true // walking to a clicked spot, or on both mouse buttons
  }

  return {
    view,
    get enabled () {
      return enabled
    },
    set enabled (on) {
      enabled = on
      if (!on) {
        held.clear()
        pointers.clear()
        bothButtons = false
        stick = null
        showStick()
      }
    },

    /** Jumps the camera straight to where it's headed (a new room, a new view). */
    snap () {
      cam.yaw = view.yaw
      cam.pitch = view.pitch
      cam.distance = view.distance
      look.ready = false
    },

    /**
     * Which way to walk, on the ground, relative to the camera: { x, z, strength } with strength
     * from 0 to 1 (the joystick walks slower when pushed less), or null.
     */
    walkInput () {
      let forward = (held.has('f') || bothButtons ? 1 : 0) - (held.has('b') ? 1 : 0)
      let side = (held.has('r') ? 1 : 0) - (held.has('l') ? 1 : 0)
      let strength = 1
      if (stick) {
        const push = Math.hypot(stick.dx, stick.dy) / STICK_PX
        if (push < 0.18) return null
        forward = -stick.dy
        side = stick.dx
        strength = Math.min(1, 0.35 + push * 0.75)
      }
      if (!forward && !side) return null
      const fx = -Math.sin(view.yaw)
      const fz = -Math.cos(view.yaw)
      // Right of the way the camera looks
      const x = fx * forward - fz * side
      const z = fz * forward + fx * side
      const length = Math.hypot(x, z)
      return { x: x / length, z: z / length, strength }
    },

    /** Moves the camera after `target` (a Vector3) for this frame; `heading` is set while the player walks. */
    update (camera, target, dt, heading = null) {
      const turn = (held.has('turnLeft') ? 1 : 0) - (held.has('turnRight') ? 1 : 0)
      if (turn && enabled) {
        view.yaw = wrap(view.yaw + turn * dt * 2.2)
        view.lastDrag = performance.now()
      }
      if (heading !== null && runningForward() && performance.now() - view.lastDrag > FOLLOW_AFTER_MS) {
        const behind = wrap(heading + Math.PI - view.yaw)
        if (Math.abs(behind) < 1.9) view.yaw = wrap(view.yaw + behind * Math.min(1, dt * 2.4))
      }
      // Glide toward the view asked for, and after the player
      const k = ease(14, dt)
      cam.yaw = wrap(cam.yaw + wrap(view.yaw - cam.yaw) * k)
      cam.pitch += (view.pitch - cam.pitch) * k
      cam.distance += (view.distance - cam.distance) * ease(9, dt)
      if (!look.ready) {
        Object.assign(look, { x: target.x, y: target.y, z: target.z, ready: true })
      } else {
        const f = ease(12, dt)
        look.x += (target.x - look.x) * f
        look.y += (target.y - look.y) * f
        look.z += (target.z - look.z) * f
      }
      const flat = Math.cos(cam.pitch) * cam.distance
      camera.position.set(
        look.x + Math.sin(cam.yaw) * flat,
        look.y + Math.sin(cam.pitch) * cam.distance,
        look.z + Math.cos(cam.yaw) * flat
      )
      camera.lookAt(look.x, look.y, look.z)
    },

    dispose () {
      dom.removeEventListener('pointerdown', onDown)
      dom.removeEventListener('pointermove', onMove)
      dom.removeEventListener('pointerup', onUp)
      dom.removeEventListener('pointercancel', onUp)
      dom.removeEventListener('wheel', onWheel)
      dom.removeEventListener('contextmenu', noMenu)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      window.removeEventListener('blur', onBlur)
      ring.remove()
    }
  }
}
