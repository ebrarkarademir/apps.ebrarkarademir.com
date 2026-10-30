import { W, H } from './terrain'

// A turn of Crater Duel, played out. Both players' shots fly at once under gravity and the
// turn's wind: a shell bursts where it lands, a grenade bounces until its fuse runs out, a
// cluster bomb bursts into bomblets. Each burst carves a crater, hurts the units near it and
// throws them; units fall into holes (hard landings hurt), and the sea takes anything that
// reaches it.
//
// Only the host plays a turn out. Everyone else gets the recording: where every shot and unit
// was, every few steps, and what happened when (bursts, hits, losses), and plays it back.

export const STEP = 1 / 60
export const SAMPLE = 2 // record every this many steps
export const GRAVITY = 38 // cells/s²
export const MAX_SPEED = 72 // cells/s, at full power
export const WIND_MAX = 10 // cells/s² sideways, at full wind
export const MAX_WALK = 14 // cells a unit can walk in a turn
export const WALK_SPEED = 7 // cells/s
const MAX_SECONDS = 12
const UNIT_HIT = 1.4 // how close a shot passes to a unit's middle to hit it
const FALL_SAFE = 30 // landing speed that doesn't hurt
const SETTLE_STEPS = 20

export const WEAPONS = {
  shell: { radius: 5, damage: 45 },
  grenade: { radius: 6, damage: 50, fuse: 2.5, bounce: 0.45 },
  cluster: { radius: 3, damage: 20, bomblets: 5, bombletRadius: 2.5, bombletDamage: 16 }
}
export const WEAPON_IDS = Object.keys(WEAPONS)

/** Where a shot leaves a unit at (x, y), and its velocity, for an angle (radians, up from the right) and power 0-1. */
export function launch (x, y, angle, power) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const speed = MAX_SPEED * Math.max(0.08, Math.min(1, power))
  return { x: x + cos * 1.6, y: y - 1.5 - sin * 1.6, vx: cos * speed, vy: -sin * speed }
}

/** The first stretch of a shot's flight, without wind, for the aim preview: [x, y, ...]. */
export function previewArc (x, y, angle, power, seconds = 0.45) {
  const shot = launch(x, y, angle, power)
  const points = []
  let { x: px, y: py, vx, vy } = shot
  const dt = 0.03
  for (let t = 0; t < seconds; t += dt) {
    vy += GRAVITY * dt
    px += vx * dt
    py += vy * dt
    points.push(px, py)
  }
  return points
}

const round1 = (n) => Math.round(n * 10) / 10

/**
 * Plays a turn out on `terrain` (changed in place). `units` [{ side, x, y, hp, alive }] are
 * copied, not changed; `shots` [{ unit, angle, power, weapon }]. Returns the recording
 * { frames, events, duration } and the units afterwards, plus the craters, [x, y, r] each.
 */
export function simulate ({ terrain, units: start, shots, wind, water, random = Math.random }) {
  const units = start.map(u => ({ ...u, vx: 0, vy: 0, air: false }))
  const projectiles = []
  const frames = []
  const events = []
  const craters = []
  let nextId = 1
  let tick = 0
  let quiet = 0

  for (const shot of shots) {
    const u = units[shot.unit]
    if (!u?.alive || !WEAPONS[shot.weapon]) continue
    const fired = launch(u.x, u.y, shot.angle, shot.power)
    projectiles.push({ id: nextId++, kind: shot.weapon, side: u.side, owner: shot.unit, ...fired, age: 0, rest: false, fuse: WEAPONS[shot.weapon].fuse || 0 })
    events.push({ t: 0, k: 'fire', u: shot.unit, w: shot.weapon })
  }

  const die = (u, index, why) => {
    if (!u.alive) return
    u.alive = false
    u.hp = Math.max(0, u.hp)
    u.air = false
    events.push({ t: tick, k: 'die', u: index, why })
  }

  function hurt (u, index, amount) {
    if (!u.alive || amount <= 0) return
    u.hp -= amount
    events.push({ t: tick, k: 'dmg', u: index, n: amount })
    if (u.hp <= 0) die(u, index, 'hp')
  }

  function burst (x, y, radius, damage, side) {
    const cx = Math.round(x)
    const cy = Math.round(y)
    terrain.carve(cx, cy, radius)
    craters.push([cx, cy, radius])
    events.push({ t: tick, k: 'boom', x: cx, y: cy, r: radius, s: side })
    const reach = radius + 3
    units.forEach((u, index) => {
      if (!u.alive) return
      const dx = u.x - x
      const dy = u.y - 1 - y
      const d = Math.hypot(dx, dy)
      if (d >= reach) return
      const f = 1 - d / reach
      hurt(u, index, Math.round(damage * (0.35 + 0.65 * f)))
      if (!u.alive) return
      const nx = d > 0.01 ? dx / d : 0
      const ny = d > 0.01 ? dy / d : -1
      u.vx += nx * 34 * f
      u.vy += ny * 34 * f - 14 * f
      u.air = true
    })
  }

  // The way a shot bounces: away from the solid cells around where it hit
  function normalAt (x, y) {
    let nx = 0
    let ny = 0
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (terrain.solid(x + dx, y + dy)) {
          nx -= dx
          ny -= dy
        }
      }
    }
    const len = Math.hypot(nx, ny)
    return len ? { x: nx / len, y: ny / len } : { x: 0, y: -1 }
  }

  function moveProjectile (p) {
    const weapon = WEAPONS[p.kind]
    p.age += STEP
    if (p.kind === 'grenade') {
      p.fuse -= STEP
      if (p.fuse <= 0) {
        burst(p.x, p.y, weapon.radius, weapon.damage, p.side)
        return false
      }
      if (p.rest) {
        if (!terrain.solid(p.x, p.y + 1)) p.rest = false
        else return true
      }
    }
    p.vx += wind * WIND_MAX * STEP * (p.kind === 'grenade' ? 0.6 : 1)
    p.vy += GRAVITY * STEP
    // Two half steps, so a fast shot can't pass through a thin wall
    for (let half = 0; half < 2; half++) {
      const px = p.x
      const py = p.y
      p.x += (p.vx * STEP) / 2
      p.y += (p.vy * STEP) / 2
      if (p.y >= water) {
        events.push({ t: tick, k: 'splash', x: round1(p.x) })
        return false
      }
      if (p.x < -12 || p.x > W + 12 || p.y > H + 4) return false
      const struck = units.findIndex((u, index) => u.alive && !(index === p.owner && p.age < 0.25) && Math.hypot(u.x - p.x, u.y - 1 - p.y) < UNIT_HIT)
      const ground = terrain.solid(p.x, p.y)
      if (struck < 0 && !ground) continue
      if (p.kind === 'grenade' && struck < 0) {
        const n = normalAt(p.x, p.y)
        p.x = px
        p.y = py
        const along = p.vx * n.x + p.vy * n.y
        p.vx = (p.vx - 2 * along * n.x) * weapon.bounce
        p.vy = (p.vy - 2 * along * n.y) * weapon.bounce
        if (Math.hypot(p.vx, p.vy) > 6) events.push({ t: tick, k: 'bounce', x: round1(p.x), y: round1(p.y) })
        if (Math.hypot(p.vx, p.vy) < 4 && n.y < -0.5) {
          p.vx = 0
          p.vy = 0
          p.rest = true
        }
        return true
      }
      burst(p.x, p.y, weapon.radius, weapon.damage, p.side)
      if (p.kind === 'cluster') {
        for (let k = 0; k < weapon.bomblets; k++) {
          projectiles.push({ id: nextId++, kind: 'bomblet', side: p.side, owner: -1, x: px, y: py - 1, vx: (k - (weapon.bomblets - 1) / 2) * 9 + (random() * 2 - 1) * 3, vy: -22 - random() * 10, age: 0, rest: false, fuse: 0 })
        }
      }
      return false
    }
    return true
  }

  function moveBomblet (p) {
    p.age += STEP
    p.vy += GRAVITY * STEP
    p.vx += wind * WIND_MAX * STEP
    p.x += p.vx * STEP
    p.y += p.vy * STEP
    if (p.y >= water) {
      events.push({ t: tick, k: 'splash', x: round1(p.x) })
      return false
    }
    if (p.x < -12 || p.x > W + 12 || p.y > H + 4) return false
    const hit = terrain.solid(p.x, p.y) || units.some(u => u.alive && Math.hypot(u.x - p.x, u.y - 1 - p.y) < UNIT_HIT)
    if (!hit) return true
    burst(p.x, p.y, WEAPONS.cluster.bombletRadius, WEAPONS.cluster.bombletDamage, p.side)
    return false
  }

  function moveUnit (u, index) {
    if (!u.alive) return
    if (!u.air) {
      if (terrain.standing(u.x, u.y)) return
      u.air = true
      u.vx = 0
      u.vy = 0
    }
    u.vy += GRAVITY * STEP
    let nx = u.x + u.vx * STEP
    let ny = u.y + u.vy * STEP
    // Walls stop it sideways, a ceiling stops it going up
    if (terrain.solid(nx, ny - 1) || terrain.solid(nx, ny - 2)) {
      nx = u.x
      u.vx *= -0.3
    }
    if (u.vy < 0 && terrain.solid(nx, ny - 2.5)) {
      ny = u.y
      u.vy = 0
    }
    if (u.vy >= 0 && terrain.solid(nx, ny)) {
      // Landed: up onto the top of the ground it came down into
      let top = Math.floor(ny)
      while (top > 0 && terrain.solid(nx, top - 1) && Math.floor(ny) - top < 3) top--
      const speed = u.vy
      u.x = nx
      u.y = top
      u.vx = 0
      u.vy = 0
      u.air = false
      if (speed > FALL_SAFE) hurt(u, index, Math.round((speed - FALL_SAFE) * 1.5))
      return
    }
    u.x = nx
    u.y = ny
    if (u.y >= water) die(u, index, 'water')
    else if (u.x < 0 || u.x >= W) die(u, index, 'out')
  }

  function record () {
    frames.push({
      u: units.flatMap(u => [round1(u.x), round1(u.y)]),
      p: projectiles.flatMap(p => [p.id, round1(p.x), round1(p.y), p.kind === 'bomblet' ? 3 : WEAPON_IDS.indexOf(p.kind), p.side])
    })
  }

  record()
  while (tick < MAX_SECONDS / STEP) {
    tick++
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i]
      const alive = p.kind === 'bomblet' ? moveBomblet(p) : moveProjectile(p)
      if (!alive) projectiles.splice(projectiles.indexOf(p), 1)
    }
    // Two shots that meet in the air both go off
    for (let i = 0; i < projectiles.length; i++) {
      for (let j = i + 1; j < projectiles.length; j++) {
        const a = projectiles[i]
        const b = projectiles[j]
        if (a.side === b.side || Math.hypot(a.x - b.x, a.y - b.y) > 1.2) continue
        burst((a.x + b.x) / 2, (a.y + b.y) / 2, 4, 25, -1)
        a.dead = b.dead = true
      }
    }
    for (let i = projectiles.length - 1; i >= 0; i--) if (projectiles[i].dead) projectiles.splice(i, 1)
    units.forEach(moveUnit)
    if (tick % SAMPLE === 0) record()
    const moving = projectiles.length || units.some(u => u.alive && u.air)
    quiet = moving ? 0 : quiet + 1
    if (quiet >= SETTLE_STEPS && tick > 30) break
  }
  if (tick % SAMPLE !== 0) record()

  // Whatever is still in the air when time is up comes down where it is
  for (const u of units) {
    if (!u.alive || !u.air) continue
    const y = terrain.groundBelow(u.x, u.y, water)
    if (y === null) u.alive = false
    else u.y = y
    u.air = false
  }

  return {
    replay: { frames, events, duration: (frames.length - 1) * SAMPLE * STEP },
    units: units.map(u => ({ side: u.side, x: round1(u.x), y: u.air ? round1(u.y) : u.y, hp: Math.max(0, Math.round(u.hp)), alive: u.alive })),
    craters
  }
}
