// Tank ASCII simulation: tanks, shells and walls, kept free of drawing and networking. Each
// device moves its own tank, and every device flies every shell: a shell's path depends only
// on where and which way it was fired, so it bounces the same way on every screen.
//
// Positions are in units of one character row; a column is 0.6 units wide. The arena is a
// square of 120 columns by 72 rows. Angles are radians, clockwise on screen.

export const COLS = 120
export const ROWS = 72
export const CELL_ASPECT = 0.6
export const SIZE = ROWS // the arena is SIZE units on each side
export const STEP = 1 / 120

export const TANK_R = 1.6
export const TANK_SPEED = 12 // units/s while the button is held
export const TURN_SPEED = 2.2 // radians/s while it isn't: a full turn in under 3 s
export const BARREL = TANK_R + 0.9 // shells leave from the end of the barrel
export const SHELL_R = 0.35
export const SHELL_SPEED = 32
export const SHELL_LIFE = 3 // seconds
export const SHELL_BOUNCES = 1 // a shell bounces off a wall once, then breaks on the next
export const FIRE_COOLDOWN = 0.35 // seconds
export const MAX_SHELLS = 3 // one tank's shells in the air at once
export const HEARTS = 3
export const INVULNERABLE = 1.2 // seconds of safety after losing a heart

// Walls as cells: [col, row, cols, rows]. The border is two columns wide and one row high,
// so it is about one unit thick all round.
export const BORDER = [[0, 0, COLS, 1], [0, ROWS - 1, COLS, 1], [0, 0, 2, ROWS], [COLS - 2, 0, 2, ROWS]]

// Each map is mirrored left-right and top-bottom, so every spawn point is as good as another
export const MAPS = [
  // Crossfire: a center block, four bars, two side posts and four small pillars
  [
    [52, 30, 16, 12], [24, 16, 21, 3], [75, 16, 21, 3], [24, 53, 21, 3], [75, 53, 21, 3],
    [27, 31, 6, 10], [87, 31, 6, 10], [40, 27, 5, 3], [75, 27, 5, 3], [40, 42, 5, 3], [75, 42, 5, 3]
  ],
  // Pillars: a three-by-three grid
  [
    [26, 15, 8, 6], [56, 15, 8, 6], [86, 15, 8, 6], [26, 33, 8, 6], [56, 33, 8, 6], [86, 33, 8, 6],
    [26, 51, 8, 6], [56, 51, 8, 6], [86, 51, 8, 6]
  ],
  // Bunkers: an L in every corner and a cross in the middle
  [
    [21, 13, 18, 3], [21, 13, 4, 12], [81, 13, 18, 3], [95, 13, 4, 12],
    [21, 56, 18, 3], [21, 47, 4, 12], [81, 56, 18, 3], [95, 47, 4, 12],
    [48, 35, 24, 2], [57, 25, 6, 22]
  ]
]

// Corners first, then the middle of each side
export const SPAWNS = [[7, 7], [65, 65], [65, 7], [7, 65], [36, 6], [36, 66], [6, 36], [66, 36]]

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const TAU = Math.PI * 2
export const wrapAngle = (a) => ((a % TAU) + TAU) % TAU
// The short way round from a to b
export const angleDiff = (a, b) => ((((b - a) % TAU) + TAU * 1.5) % TAU) - Math.PI

export function mulberry32 (seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** All walls of a map as cells, border included. */
export const mapCells = (map) => [...BORDER, ...MAPS[map % MAPS.length]]

/** All walls of a map in units: { x, y, w, h }. */
export const mapWalls = (map) => mapCells(map).map(([col, row, cols, rows]) => ({
  x: col * CELL_ASPECT,
  y: row,
  w: cols * CELL_ASPECT,
  h: rows
}))

/** Where a tank starts, facing the middle of the arena and turning clockwise. */
export function spawnTank (slot) {
  const [x, y] = SPAWNS[slot % SPAWNS.length]
  return { x, y, a: wrapAngle(Math.atan2(SIZE / 2 - y, SIZE / 2 - x)), spin: 1, moving: false, travel: 0 }
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

/**
 * One step for a tank: driving straight ahead while `moving`, otherwise turning on the spot
 * the way `spin` says (1 clockwise, -1 the other way). Other tanks (`others`, as { x, y })
 * push it away, and so do the walls.
 */
export function moveTank (tank, walls, others, dt) {
  if (tank.moving) {
    tank.x += Math.cos(tank.a) * TANK_SPEED * dt
    tank.y += Math.sin(tank.a) * TANK_SPEED * dt
    tank.travel += TANK_SPEED * dt
  } else {
    tank.a = wrapAngle(tank.a + TURN_SPEED * tank.spin * dt)
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

const touchesWall = (shell, walls) => walls.some(w =>
  shell.x > w.x - SHELL_R && shell.x < w.x + w.w + SHELL_R && shell.y > w.y - SHELL_R && shell.y < w.y + w.h + SHELL_R)

/** One step for a shell. Returns 'bounce', 'gone' (spent or broken on a wall) or null. */
export function stepShell (shell, walls, dt) {
  shell.age += dt
  if (shell.age >= SHELL_LIFE) return 'gone'
  let bounced = false
  shell.x += shell.dx * SHELL_SPEED * dt
  if (touchesWall(shell, walls)) {
    shell.x -= shell.dx * SHELL_SPEED * dt
    shell.dx = -shell.dx
    bounced = true
  }
  shell.y += shell.dy * SHELL_SPEED * dt
  if (touchesWall(shell, walls)) {
    shell.y -= shell.dy * SHELL_SPEED * dt
    shell.dy = -shell.dy
    bounced = true
  }
  if (!bounced) return null
  shell.bounces++
  return shell.bounces > SHELL_BOUNCES ? 'gone' : 'bounce'
}

export const touches = (shell, tank) => Math.hypot(shell.x - tank.x, shell.y - tank.y) < TANK_R + SHELL_R

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
 * sample: { x, y, a, m, s } where m is 1 while driving and s is the way it turns (1 or -1).
 */
export function tankAt (sample, age, walls) {
  const t = clamp(age, 0, 0.3)
  const tank = { x: sample.x, y: sample.y, a: sample.a, spin: sample.s === -1 ? -1 : 1, moving: !!sample.m }
  if (tank.moving) {
    tank.x += Math.cos(tank.a) * TANK_SPEED * t
    tank.y += Math.sin(tank.a) * TANK_SPEED * t
    pushOut(tank, TANK_R, walls)
  } else {
    tank.a = wrapAngle(tank.a + TURN_SPEED * tank.spin * t)
  }
  return tank
}
