// Neon Laps tracks: a closed road with a wall on each side, kept free of drawing and
// networking. A track is drawn as a polygon whose corners are rounded off with arcs of a given
// radius, so every bend is a true curve and the road always closes on itself. The polygon is
// turned into a middle line of points DS units apart, measured from the start line (s = 0) in
// the direction of the race.
//
// Everything on the road is placed by how far round the lap it is (s) and how far it is to the
// right of the middle line (d, negative to the left). The walls are WALL units either side of
// the middle, so a car can never leave the road's corridor or cut across to another part of the
// track: finding where a car is only ever looks a little way along the line from where it was.
//
// Positions are in units, y grows downward, angles are radians, clockwise on screen.
//
// Import paths name their files in full (track.js, not track) so tests can run these modules in
// Node as they are.

export const DS = 1.5 // units between points of the middle line
export const ROAD = 7.5 // half the width of the tarmac
export const VERGE = 4.5 // the run-off between the tarmac's edge and the wall
export const WALL = ROAD + VERGE // the walls' distance from the middle line
export const GATES = 12 // checkpoints round the lap, the first on the start line

// How the ground holds a car, as fractions of the tarmac's (see car.js): grip sideways,
// acceleration, top speed and braking
const TARMAC = { grip: 1, accel: 1, top: 1, brake: 1 }
const PAVEMENT = { grip: 0.8, accel: 0.6, top: 0.55, brake: 0.85 }
const ICE = { grip: 0.5, accel: 0.8, top: 0.97, brake: 0.55 }
const SNOW = { grip: 0.55, accel: 0.5, top: 0.5, brake: 0.7 }

// Each corner is [x, y, radius]; the race goes round them in order. Radii stay well above WALL,
// so the inside wall of a bend never folds over itself. `start` is near where the start line
// goes, and `seed` lays out the scenery.
export const TRACKS = [
  {
    // A night-time street circuit round the city blocks: hard right-angle corners, a twisty
    // section round one block, and a long straight past the start
    id: 'city',
    theme: 'city',
    road: TARMAC,
    verge: PAVEMENT,
    points: [
      [70, 270, 20], [300, 270, 18], [300, 205, 16], [380, 205, 16], [380, 70, 22],
      [250, 70, 16], [250, 145, 15], [170, 145, 15], [170, 50, 18], [70, 50, 20]
    ],
    start: [150, 270],
    seed: 11
  },
  {
    // A loop round a frozen lake: long flowing bends where the cars slide, a fast sweeper and a
    // tight hairpin at the top
    id: 'ice',
    theme: 'ice',
    road: ICE,
    verge: SNOW,
    points: [
      [70, 255, 34], [205, 300, 46], [330, 262, 40], [430, 296, 30], [470, 190, 32],
      [380, 140, 26], [440, 60, 28], [305, 36, 30], [235, 112, 17], [150, 46, 28], [50, 118, 30]
    ],
    start: [140, 280],
    seed: 23
  }
]

export const TRACK_IDS = TRACKS.map(track => track.id)

const TAU = Math.PI * 2
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

/** The short way round from angle a to angle b, in [-π, π). */
export const angleDiff = (a, b) => ((((b - a) % TAU) + TAU * 1.5) % TAU) - Math.PI

/** A distance along the lap, wrapped into [-L/2, L/2): how far ahead (or behind) it is. */
export const wrapS = (s, length) => {
  const w = ((s % length) + length) % length
  return w >= length / 2 ? w - length : w
}

// ---------- Building a track ----------

// The rounded polygon as a fine list of points, a quarter unit apart
function outline (points) {
  const n = points.length
  const corners = points.map(([x, y, r], i) => {
    const [px, py] = points[(i + n - 1) % n]
    const [qx, qy] = points[(i + 1) % n]
    const inLen = Math.hypot(x - px, y - py)
    const outLen = Math.hypot(qx - x, qy - y)
    const ix = (x - px) / inLen
    const iy = (y - py) / inLen
    const ox = (qx - x) / outLen
    const oy = (qy - y) / outLen
    const turn = Math.atan2(ix * oy - iy * ox, ix * ox + iy * oy)
    const t = r * Math.tan(Math.abs(turn) / 2)
    const ax = x - ix * t
    const ay = y - iy * t
    // The centre is to the side the road turns towards
    const side = turn > 0 ? 1 : -1
    const cx = ax - iy * r * side
    const cy = ay + ix * r * side
    return { x, y, r, turn, t, ax, ay, bx: x + ox * t, by: y + oy * t, cx, cy, inLen, outLen }
  })
  const fine = []
  const line = (x0, y0, x1, y1) => {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.25))
    for (let k = 0; k < steps; k++) fine.push([x0 + ((x1 - x0) * k) / steps, y0 + ((y1 - y0) * k) / steps])
  }
  corners.forEach((c, i) => {
    const prev = corners[(i + n - 1) % n]
    line(prev.bx, prev.by, c.ax, c.ay)
    const from = Math.atan2(c.ay - c.cy, c.ax - c.cx)
    const steps = Math.max(2, Math.ceil((Math.abs(c.turn) * c.r) / 0.25))
    for (let k = 0; k < steps; k++) {
      const a = from + (c.turn * k) / steps
      fine.push([c.cx + Math.cos(a) * c.r, c.cy + Math.sin(a) * c.r])
    }
  })
  return { fine, corners }
}

// Points exactly `spacing` apart along a closed line
function resample (fine, spacing) {
  const lengths = [0]
  for (let i = 1; i <= fine.length; i++) {
    const [x0, y0] = fine[i - 1]
    const [x1, y1] = fine[i % fine.length]
    lengths.push(lengths[i - 1] + Math.hypot(x1 - x0, y1 - y0))
  }
  const total = lengths[fine.length]
  const count = Math.round(total / spacing)
  const step = total / count
  const out = []
  let j = 0
  for (let k = 0; k < count; k++) {
    const at = k * step
    while (lengths[j + 1] < at) j++
    const f = (at - lengths[j]) / (lengths[j + 1] - lengths[j] || 1)
    const [x0, y0] = fine[j]
    const [x1, y1] = fine[(j + 1) % fine.length]
    out.push([x0 + (x1 - x0) * f, y0 + (y1 - y0) * f])
  }
  return { points: out, step }
}

/**
 * Lays the racing line: the path a good driver takes, as far as `room` units either side of the
 * middle. It's the line that bends least overall: into a corner from the outside, across to
 * the inside at its middle and out to the outside again, which lets a car through it fastest.
 *
 * How sharply the line bends at a point is how far it is from halfway between its neighbours
 * (its "second difference"). Each pass moves every point a little the way that makes the sum
 * of the squares of those smaller, which also eases the bend at its neighbours: that's what
 * draws the line out wide before a corner. Far neighbours first, for the shape of whole bends,
 * then nearer ones, so no ripple is left between them. Returns each point's offset from the
 * middle line.
 */
function racingLine (xs, ys, nx, ny, room) {
  const n = xs.length
  const off = new Float64Array(n)
  const qx = new Float64Array(n)
  const qy = new Float64Array(n)
  const dx = new Float64Array(n)
  const dy = new Float64Array(n)
  for (const [reach, passes] of [[24, 400], [12, 400], [6, 400], [3, 400], [1, 600]]) {
    for (let pass = 0; pass < passes; pass++) {
      for (let i = 0; i < n; i++) {
        qx[i] = xs[i] + nx[i] * off[i]
        qy[i] = ys[i] + ny[i] * off[i]
      }
      for (let i = 0; i < n; i++) {
        const a = (i + n - reach) % n
        const b = (i + reach) % n
        dx[i] = qx[a] - 2 * qx[i] + qx[b]
        dy[i] = qy[a] - 2 * qy[i] + qy[b]
      }
      for (let i = 0; i < n; i++) {
        const a = (i + n - reach) % n
        const b = (i + reach) % n
        const gx = dx[a] - 2 * dx[i] + dx[b]
        const gy = dy[a] - 2 * dy[i] + dy[b]
        off[i] = clamp(off[i] - (gx * nx[i] + gy * ny[i]) * 0.06, -room, room)
      }
    }
  }
  return off
}

// How sharply a line through three points bends: 1 / the radius of the circle through them
function bendOf (x0, y0, x1, y1, x2, y2) {
  const a = Math.hypot(x1 - x0, y1 - y0)
  const b = Math.hypot(x2 - x1, y2 - y1)
  const c = Math.hypot(x2 - x0, y2 - y0)
  const cross = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0)
  return a * b * c > 1e-9 ? (2 * cross) / (a * b * c) : 0
}

const built = new Map()

/**
 * A track ready to race on:
 *   id, theme, road, verge  from TRACKS
 *   n, length, step  how many points the middle line has, the lap's length and the spacing
 *   x, y, tx, ty, nx, ny, bend, s  each point's place, its direction of travel, the normal to
 *                    its right, how sharply the road bends there (signed) and its distance
 *                    round the lap
 *   gates            each checkpoint's distance round the lap, gate 0 on the start line
 *   line             the racing line: { off, x, y } for each point
 *   corners          the rounded polygon, for the checks in the tests
 */
export function trackOf (index) {
  const i = ((index % TRACKS.length) + TRACKS.length) % TRACKS.length
  if (built.has(i)) return built.get(i)
  const def = TRACKS[i]
  const { fine, corners } = outline(def.points)
  let { points, step } = resample(fine, DS)
  // Start counting from the point nearest the start line
  let first = 0
  let best = Infinity
  points.forEach(([x, y], k) => {
    const d = Math.hypot(x - def.start[0], y - def.start[1])
    if (d < best) {
      best = d
      first = k
    }
  })
  points = [...points.slice(first), ...points.slice(0, first)]
  const n = points.length
  const x = new Float64Array(n)
  const y = new Float64Array(n)
  const tx = new Float64Array(n)
  const ty = new Float64Array(n)
  const nx = new Float64Array(n)
  const ny = new Float64Array(n)
  const s = new Float64Array(n)
  const bend = new Float64Array(n)
  points.forEach(([px, py], k) => {
    x[k] = px
    y[k] = py
    s[k] = k * step
  })
  for (let k = 0; k < n; k++) {
    const a = (k + n - 1) % n
    const b = (k + 1) % n
    const dx = x[b] - x[a]
    const dy = y[b] - y[a]
    const len = Math.hypot(dx, dy) || 1
    tx[k] = dx / len
    ty[k] = dy / len
    // The normal points to the right of the direction of travel (y grows downward)
    nx[k] = -ty[k]
    ny[k] = tx[k]
  }
  for (let k = 0; k < n; k++) {
    const a = (k + n - 2) % n
    const b = (k + 2) % n
    bend[k] = bendOf(x[a], y[a], x[k], y[k], x[b], y[b])
  }
  const length = n * step
  const off = racingLine(x, y, nx, ny, ROAD - 1.9)
  const lx = new Float64Array(n)
  const ly = new Float64Array(n)
  for (let k = 0; k < n; k++) {
    lx[k] = x[k] + nx[k] * off[k]
    ly[k] = y[k] + ny[k] * off[k]
  }
  const gates = Array.from({ length: GATES }, (_, g) => (g * length) / GATES)
  const track = {
    id: def.id,
    theme: def.theme,
    road: def.road,
    verge: def.verge,
    seed: def.seed,
    n,
    length,
    step,
    x,
    y,
    tx,
    ty,
    nx,
    ny,
    s,
    bend,
    gates,
    line: { off, x: lx, y: ly },
    corners
  }
  built.set(i, track)
  return track
}

/** How many tracks there are to pick from. */
export const trackCount = () => TRACKS.length

// ---------- Places on the track ----------

/** The point `s` round the lap and `d` to the right of the middle, with the road's heading there. */
export function pointAt (track, s, d = 0) {
  const { n, step } = track
  const at = ((s % track.length) + track.length) % track.length
  const k = Math.floor(at / step) % n
  const f = at / step - Math.floor(at / step)
  const k1 = (k + 1) % n
  const px = track.x[k] + (track.x[k1] - track.x[k]) * f
  const py = track.y[k] + (track.y[k1] - track.y[k]) * f
  const nx = track.nx[k] + (track.nx[k1] - track.nx[k]) * f
  const ny = track.ny[k] + (track.ny[k1] - track.ny[k]) * f
  const len = Math.hypot(nx, ny) || 1
  // The heading is the normal turned back a quarter
  return { x: px + (nx / len) * d, y: py + (ny / len) * d, a: Math.atan2(-nx / len, ny / len), index: k }
}

const WINDOW = 14 // segments looked at either way of the last known one

/**
 * Where a point is on the track: the nearest place on the middle line, looked for a little way
 * either side of `hint` (the index from last time), or along the whole line without one.
 * Returns { i, s, d, nx, ny } with d the signed distance to the right of the middle line and
 * (nx, ny) the normal there, pointing right.
 */
export function locate (track, px, py, hint = -1) {
  const { n, x, y } = track
  let bestD2 = Infinity
  let bestK = 0
  let bestU = 0
  const check = (k) => {
    const k1 = k + 1 === n ? 0 : k + 1
    const ex = x[k1] - x[k]
    const ey = y[k1] - y[k]
    const len2 = ex * ex + ey * ey || 1
    const u = clamp(((px - x[k]) * ex + (py - y[k]) * ey) / len2, 0, 1)
    const qx = x[k] + ex * u - px
    const qy = y[k] + ey * u - py
    const d2 = qx * qx + qy * qy
    if (d2 < bestD2) {
      bestD2 = d2
      bestK = k
      bestU = u
    }
  }
  if (hint < 0) {
    for (let k = 0; k < n; k++) check(k)
  } else {
    for (let o = -WINDOW; o <= WINDOW; o++) check(((hint + o) % n + n) % n)
  }
  const k = bestK
  const k1 = k + 1 === n ? 0 : k + 1
  const ex = x[k1] - x[k]
  const ey = y[k1] - y[k]
  const len = Math.hypot(ex, ey) || 1
  // The normal of the segment itself, so d is exactly the distance from it
  const nx = -ey / len
  const ny = ex / len
  const d = (px - (x[k] + ex * bestU)) * nx + (py - (y[k] + ey * bestU)) * ny
  return { i: k, s: track.s[k] + bestU * track.step, d, nx, ny }
}

/** Whether a distance from the middle line is on the tarmac or on the run-off beside it. */
export const surfaceAt = (track, d) => (Math.abs(d) <= ROAD ? track.road : track.verge)

/**
 * Where each car starts: two columns behind the start line, the second column half a row
 * further back, every car facing the way of the race.
 */
export function gridSpot (track, slot) {
  const row = Math.floor(slot / 2)
  const col = slot % 2
  const s = -5 - row * 7 - col * 3.5
  const p = pointAt(track, s, col ? 3 : -3)
  return { x: p.x, y: p.y, a: p.a, s: ((s % track.length) + track.length) % track.length, index: p.index }
}
