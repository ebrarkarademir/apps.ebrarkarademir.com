// Tank simulation: tanks, shells, walls, teleporters and gifts, kept free of drawing and
// networking. Each device moves its own tank, and every device flies every shell: a shell's
// path depends only on where and which way it was fired (and whether it's a power shot), so it
// bounces the same way on every screen.
//
// Positions are in units. The arena is W units wide and H high: twice as wide as it is high,
// about the shape of a phone held sideways. Angles are radians, clockwise on screen.

export const W = 120
export const H = 60
export const STEP = 1 / 120

export const TANK_R = 1.9
export const TANK_SPEED = 12 // units/s while the button is held
export const TURN_SPEED = 2.2 // radians/s while it isn't: a full turn in under 3 s
export const BARREL = TANK_R + 1.1 // shells leave from the end of the barrel
export const SHELL_R = 0.38
export const SHELL_SPEED = 32
export const SHELL_LIFE = 3 // seconds
export const SHELL_BOUNCES = 1 // a shell bounces off a wall once, then breaks on the next
export const FIRE_COOLDOWN = 0.35 // seconds
export const MAX_SHELLS = 3 // one tank's shells in the air at once
// Hits a tank takes. Each one shows on it: scorched, then battered, then burning and slow on
// its last legs; the next destroys it.
export const ARMOR = 4
export const INVULNERABLE = 1.2 // seconds of safety after a hit
export const SLOW = 0.6 // how fast a tank on its last legs drives

// Gifts appear now and then in open ground; the tank whose shell hits one gets it
export const GIFT_KINDS = ['shield', 'speed', 'power']
export const GIFT_R = 1.7
export const GIFT_LIFE = 20 // seconds a gift waits before it fades
export const MAX_GIFTS = 3
export const SPEED_TIME = 8 // seconds of speed
export const SPEED_BOOST = 1.6
export const POWER_SHOTS = 3 // power shots per gift
export const POWER_MAX = 6
export const POWER_DAMAGE = 2 // a power shot counts as two hits
export const POWER_SPEED = 1.3
const POWER_R = 0.6 // how far a power shell reaches into a tank

// Teleporters: a tank that stays on one for PAD_WAIT seconds jumps to another
export const PAD_R = 2.6
export const PAD_WAIT = 3
const PAD_REACH = PAD_R * 0.8 // how near the middle a tank has to be to count as on it

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const TAU = Math.PI * 2
export const wrapAngle = (a) => ((a % TAU) + TAU) % TAU
// The short way round from a to b
export const angleDiff = (a, b) => ((((b - a) % TAU) + TAU * 1.5) % TAU) - Math.PI

// The border is one unit thick all round
const BORDER = [[0, 0, W, 1], [0, H - 1, W, 1], [0, 0, 1, H], [W - 1, 0, 1, H]]

// Every map is the same mirrored left-right and top-bottom, so no spawn point is better than
// another: each wall [x, y, w, h] and teleporter [x, y] is given once and copied into the other
// quarters (a piece across the middle line stays one piece). Spawn points come corners first,
// then the middle of each side.
export const MAPS = [
  {
    name: 'fortress',
    walls: [
      [46, 18, 10, 2], [46, 18, 2, 8], // the fort in the middle, open on all four sides
      [10, 8, 14, 2], [10, 8, 2, 10], // a bunker in every corner, a teleporter in its crook
      [31, 1, 2, 10], // stubs off the long walls
      [20, 26, 7, 8], // blocks halfway along the short walls
      [36, 22, 4, 4], [40, 6, 3, 3] // pillars by the fort, and crates
    ],
    pads: [[60, 30], [18, 14]],
    spawns: [[5, 5], [115, 55], [115, 5], [5, 55], [60, 5], [60, 55], [5, 30], [115, 30]]
  },
  {
    name: 'crossroads',
    walls: [
      [50, 29, 20, 2], [59, 19, 2, 22], // a cross in the middle
      [14, 12, 16, 2], [38, 6, 2, 10], // lanes in the corners
      [26, 22, 2, 16], // walls across the left and right thirds
      [8, 22, 10, 2],
      [44, 1, 2, 7], // stubs off the long walls
      [48, 10, 3, 3] // crates
    ],
    pads: [[40, 30], [60, 10]],
    spawns: [[5, 5], [115, 55], [115, 5], [5, 55], [30, 5], [90, 55], [5, 30], [115, 30]]
  },
  {
    name: 'pillars',
    walls: [
      [22, 10, 5, 5], [46, 10, 5, 5], // a field of pillars
      [34, 27, 6, 6], [57, 25, 6, 10],
      [10, 21, 5, 4],
      [58, 1, 4, 6], [1, 28, 6, 4] // stubs in the middle of every side
    ],
    pads: [[34, 16], [12, 30]],
    spawns: [[5, 5], [115, 55], [115, 5], [5, 55], [40, 5], [80, 55], [80, 5], [40, 55]]
  },
  {
    name: 'canyon',
    walls: [
      [12, 17, 32, 2], [44, 17, 2, 6], // two long walls make three lanes
      [28, 7, 2, 10], // rooms in the top and bottom lanes
      [54, 25, 12, 10], // a block in the middle
      [20, 27, 6, 6], // and halfway down the middle lane
      [50, 9, 3, 3] // crates in the top and bottom lanes
    ],
    pads: [[37, 10], [8, 30]],
    spawns: [[5, 5], [115, 55], [115, 5], [5, 55], [20, 5], [100, 55], [100, 5], [20, 55]]
  }
]

function quarters ([x, y, w = 0, h = 0]) {
  return [[x, y], [W - x - w, y], [x, H - y - h], [W - x - w, H - y - h]]
}

function mirrored (pieces) {
  const seen = new Set()
  const out = []
  for (const piece of pieces) {
    const [, , w, h] = piece
    for (const [x, y] of quarters(piece)) {
      const key = `${x},${y}`
      if (seen.has(`${key},${w},${h}`)) continue
      seen.add(`${key},${w},${h}`)
      out.push(w === undefined ? [x, y] : [x, y, w, h])
    }
  }
  return out
}

const built = new Map()

/**
 * A map ready to play: { name, walls: [{ x, y, w, h }] (the border's four first), pads: [{ x, y }],
 * spawns: [[x, y]] }.
 */
export function mapOf (index) {
  const i = ((index % MAPS.length) + MAPS.length) % MAPS.length
  if (!built.has(i)) {
    const def = MAPS[i]
    built.set(i, {
      name: def.name,
      walls: [...BORDER, ...mirrored(def.walls)].map(([x, y, w, h]) => ({ x, y, w, h })),
      pads: mirrored(def.pads).map(([x, y]) => ({ x, y })),
      spawns: def.spawns
    })
  }
  return built.get(i)
}

/** Where a tank starts, facing the middle of the arena and turning clockwise. */
export function spawnTank (map, slot) {
  const { spawns } = mapOf(map)
  const [x, y] = spawns[slot % spawns.length]
  return { x, y, a: wrapAngle(Math.atan2(H / 2 - y, W / 2 - x)), spin: 1, moving: false, travel: 0, pace: 1 }
}

// How far a point is from a wall (0 inside it)
function distToWall (x, y, w) {
  const dx = Math.max(w.x - x, 0, x - (w.x + w.w))
  const dy = Math.max(w.y - y, 0, y - (w.y + w.h))
  return Math.hypot(dx, dy)
}

// Moves a circle out of any wall it overlaps
function pushOut (body, radius, walls) {
  for (const w of walls) {
    const px = clamp(body.x, w.x, w.x + w.w)
    const py = clamp(body.y, w.y, w.y + w.h)
    const dx = body.x - px
    const dy = body.y - py
    const d2 = dx * dx + dy * dy
    if (d2 >= radius * radius) continue
    if (d2 > 1e-9) {
      const d = Math.sqrt(d2)
      body.x = px + (dx / d) * radius
      body.y = py + (dy / d) * radius
    } else {
      // The middle is inside the wall: leave by the nearest side
      const exits = [
        [body.x - w.x, w.x - radius, null],
        [w.x + w.w - body.x, w.x + w.w + radius, null],
        [body.y - w.y, null, w.y - radius],
        [w.y + w.h - body.y, null, w.y + w.h + radius]
      ].sort((a, b) => a[0] - b[0])
      if (exits[0][1] !== null) body.x = exits[0][1]
      else body.y = exits[0][2]
    }
  }
}

/** How fast a tank turns at a given pace: half as much faster or slower as it drives. */
export const turnRate = (pace = 1) => TURN_SPEED * (1 + (pace - 1) * 0.5)

/**
 * One step for a tank: driving straight ahead while `moving`, otherwise turning on the spot
 * the way `spin` says (1 clockwise, -1 the other way), both at its `pace` (1 is normal). Other
 * tanks (`others`, as { x, y }) push it away, and so do the walls.
 */
export function moveTank (tank, walls, others, dt) {
  const pace = tank.pace || 1
  if (tank.moving) {
    const step = TANK_SPEED * pace * dt
    tank.x += Math.cos(tank.a) * step
    tank.y += Math.sin(tank.a) * step
    tank.travel += step
  } else {
    tank.a = wrapAngle(tank.a + turnRate(pace) * tank.spin * dt)
  }
  for (const other of others) {
    const dx = tank.x - other.x
    const dy = tank.y - other.y
    const d = Math.hypot(dx, dy)
    if (d > 1e-6 && d < TANK_R * 2) {
      tank.x += (dx / d) * (TANK_R * 2 - d)
      tank.y += (dy / d) * (TANK_R * 2 - d)
    }
  }
  pushOut(tank, TANK_R, walls)
}

/**
 * How far a shell can fly from (x, y) along (dx, dy) before touching a wall, up to `max`,
 * and which way the wall faces: 'x' for a side, 'y' for a top or bottom, null for no wall.
 */
export function castRay (x, y, dx, dy, walls, max) {
  let best = max
  let axis = null
  const slab = (from, d, lo, hi) => {
    if (d === 0) return from > lo && from < hi ? [-Infinity, Infinity] : [Infinity, -Infinity]
    const a = (lo - from) / d
    const b = (hi - from) / d
    return a < b ? [a, b] : [b, a]
  }
  for (const w of walls) {
    const [x0, x1] = slab(x, dx, w.x - SHELL_R, w.x + w.w + SHELL_R)
    const [y0, y1] = slab(y, dy, w.y - SHELL_R, w.y + w.h + SHELL_R)
    const enter = Math.max(x0, y0)
    const exit = Math.min(x1, y1)
    if (exit < enter || enter < 0 || enter >= best) continue
    best = enter
    axis = x0 > y0 ? 'x' : 'y'
  }
  return { t: best, axis }
}

const round4 = (value) => Math.round(value * 10000) / 10000

/** A new shell from the end of a tank's barrel, or nearer when the barrel is up against a wall. */
export function fireShell (tank, walls) {
  const dx = round4(Math.cos(tank.a))
  const dy = round4(Math.sin(tank.a))
  const room = castRay(tank.x, tank.y, dx, dy, walls, BARREL + 1).t - 0.05
  const reach = clamp(room, 0, BARREL)
  return { x: round4(tank.x + dx * reach), y: round4(tank.y + dy * reach), dx, dy }
}

/** How fast a shell flies: power shells are quicker. */
export const shellSpeed = (power) => SHELL_SPEED * (power ? POWER_SPEED : 1)

const touchesWall = (shell, walls) => walls.some(w =>
  shell.x > w.x - SHELL_R && shell.x < w.x + w.w + SHELL_R && shell.y > w.y - SHELL_R && shell.y < w.y + w.h + SHELL_R)

/** One step for a shell. Returns 'bounce', 'gone' (spent or broken on a wall) or null. */
export function stepShell (shell, walls, dt) {
  shell.age += dt
  if (shell.age >= SHELL_LIFE) return 'gone'
  const speed = shell.speed || SHELL_SPEED
  let bounced = false
  shell.x += shell.dx * speed * dt
  if (touchesWall(shell, walls)) {
    shell.x -= shell.dx * speed * dt
    shell.dx = -shell.dx
    bounced = true
  }
  shell.y += shell.dy * speed * dt
  if (touchesWall(shell, walls)) {
    shell.y -= shell.dy * speed * dt
    shell.dy = -shell.dy
    bounced = true
  }
  if (!bounced) return null
  shell.bounces++
  return shell.bounces > SHELL_BOUNCES ? 'gone' : 'bounce'
}

export const touches = (shell, tank) => Math.hypot(shell.x - tank.x, shell.y - tank.y) < TANK_R + (shell.power ? POWER_R : SHELL_R)

export const touchesGift = (shell, gift) => Math.hypot(shell.x - gift.x, shell.y - gift.y) < GIFT_R + SHELL_R

/** The teleporter a point is on, as its index in the map's pads, or -1. */
export function padAt (map, x, y) {
  return map.pads.findIndex(pad => Math.hypot(pad.x - x, pad.y - y) < PAD_REACH)
}

/**
 * A random place for a gift: in the open, clear of walls and teleporters, and away from the
 * points in `avoid` (other gifts, tanks). null if no place turns up.
 */
export function freeSpot (map, random = Math.random, avoid = []) {
  const { walls, pads } = mapOf(map)
  for (let tries = 0; tries < 80; tries++) {
    const x = 4 + random() * (W - 8)
    const y = 4 + random() * (H - 8)
    if (walls.some(w => distToWall(x, y, w) < GIFT_R + 1.4)) continue
    if (pads.some(p => Math.hypot(p.x - x, p.y - y) < PAD_R + GIFT_R + 2)) continue
    if (avoid.some(p => Math.hypot(p.x - x, p.y - y) < (p.r || 9))) continue
    return { x, y }
  }
  return null
}

/**
 * The dotted aiming line from the barrel: where a shell fired now would go, bounce included.
 * Returns points { x, y, bounced }.
 */
export function aimPath (tank, walls, length = 30, gap = 1.5) {
  const points = []
  let x = tank.x
  let y = tank.y
  let dx = Math.cos(tank.a)
  let dy = Math.sin(tank.a)
  let left = length
  let next = BARREL
  for (let bounces = 0; bounces <= SHELL_BOUNCES && left > 0; bounces++) {
    const hit = castRay(x, y, dx, dy, walls, left)
    for (; next < hit.t; next += gap) points.push({ x: x + dx * next, y: y + dy * next, bounced: bounces > 0 })
    if (!hit.axis) break
    x += dx * hit.t
    y += dy * hit.t
    left -= hit.t
    next -= hit.t
    if (hit.axis === 'x') dx = -dx
    else dy = -dy
  }
  return points
}

/**
 * Where another player's tank probably is now, from its last live sample and how many seconds
 * ago that arrived: it keeps driving or turning the way it was.
 * sample: { x, y, a, m, s, v } where m is 1 while driving, s is the way it turns (1 or -1) and
 * v its pace when that isn't 1.
 */
export function tankAt (sample, age, walls) {
  const t = clamp(age, 0, 0.3)
  const pace = typeof sample.v === 'number' && sample.v > 0 && sample.v < 3 ? sample.v : 1
  const tank = { x: sample.x, y: sample.y, a: sample.a, spin: sample.s === -1 ? -1 : 1, moving: !!sample.m, pace }
  if (tank.moving) {
    tank.x += Math.cos(tank.a) * TANK_SPEED * pace * t
    tank.y += Math.sin(tank.a) * TANK_SPEED * pace * t
    pushOut(tank, TANK_R, walls)
  } else {
    tank.a = wrapAngle(tank.a + turnRate(pace) * tank.spin * t)
  }
  return tank
}
