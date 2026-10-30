import { mulberry32 } from '../ascii/random'

// The ground of Crater Duel: a grid of cells, open, earth (explosions bite into it) or rock
// (nothing does). A map comes from a seed and a level alone, made with nothing but random
// numbers and plain arithmetic, so every device builds exactly the same one; craters
// (whole-number centers) carve the same cells too.
//
// Positions are in cells: x to the right, y down. A unit's position is its feet: standing, its
// y is the top edge of the solid cell under it.

export const W = 160
export const H = 72
export const WATER_START = H - 4 // the sea's surface at the start; it rises in sudden death
export const CLIMB = 3 // how many cells a unit can step up while walking

const OPEN = 0
const EARTH = 1
const ROCK = 2

// Every level: how its ground is made, and the look it's drawn in (see renderer.js)
export const LEVELS = {
  hills: { theme: 'grass' },
  mountain: { theme: 'snow' },
  valley: { theme: 'grass' },
  islands: { theme: 'grass' },
  plateaus: { theme: 'sand' },
  canyon: { theme: 'sand' },
  caverns: { theme: 'cave' },
  sky: { theme: 'sky' },
  city: { theme: 'city' },
  cheese: { theme: 'grass' }
}
export const LEVEL_IDS = Object.keys(LEVELS)

const smooth = (t) => t * t * (3 - 2 * t)
// A soft bump 1 at the middle, 0 from `half` away on
const bell = (x, middle, half) => {
  const d = (x - middle) / half
  return Math.abs(d) >= 1 ? 0 : (1 - d * d) * (1 - d * d)
}

// Value noise: random heights every `step` columns, eased in between
function noise (random, step, amp) {
  const nodes = Array.from({ length: Math.ceil(W / step) + 2 }, () => (random() * 2 - 1) * amp)
  return (x) => {
    const i = Math.floor(x / step)
    const t = smooth((x % step) / step)
    return nodes[i] + (nodes[i + 1] - nodes[i]) * t
  }
}

/** The ground for a seed; `level` picks the kind of map, or the seed picks one. */
export function createTerrain (seed, level = null) {
  const random = mulberry32(seed)
  const pick = random()
  const style = LEVELS[level] ? level : LEVEL_IDS[Math.floor(pick * LEVEL_IDS.length)]
  const cells = new Uint8Array(W * H)
  const set = (x, y, value) => {
    if (x >= 0 && x < W && y >= 0 && y < H) cells[y * W + x] = value
  }
  const get = (x, y) => (x >= 0 && x < W && y >= 0 && y < H ? cells[y * W + x] : OPEN)

  function ellipse (cx, cy, rx, ry, value, { keepRock = true, floor = H - 3 } = {}) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        if (x < 0 || x >= W || y < 0 || y >= floor) continue
        const dx = (x + 0.5 - cx) / rx
        const dy = (y + 0.5 - cy) / ry
        if (dx * dx + dy * dy > 1) continue
        if (keepRock && get(x, y) === ROCK) continue
        set(x, y, value)
      }
    }
  }

  function rect (x0, y0, w, h, value) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, value)
  }

  // Ground up from a surface line
  function fill (surface, from = 0, to = W) {
    for (let x = from; x < to; x++) {
      const top = Math.max(4, Math.min(H, Math.round(surface(x))))
      for (let y = top; y < H; y++) set(x, y, EARTH)
    }
  }

  function caves (count, depth = [5, 13]) {
    for (let k = 0; k < count; k++) {
      const cx = 14 + random() * (W - 28)
      let top = 0
      while (top < H && !get(Math.floor(cx), top)) top++
      const cy = top + depth[0] + random() * (depth[1] - depth[0])
      ellipse(cx, cy, 3.5 + random() * 7, 1.8 + random() * 2.5, OPEN)
    }
  }

  const big = noise(random, 40, 12)
  const mid = noise(random, 16, 6)
  const fine = noise(random, 6, 1.5)
  const rolling = (x) => H * 0.56 + big(x) + mid(x) + fine(x)

  if (style === 'hills') {
    fill(rolling)
    caves(2 + Math.floor(random() * 3))
  } else if (style === 'mountain') {
    fill(x => rolling(x) - 24 * bell(x, W / 2, W * 0.27))
    // A tunnel through the mountain, and caves
    const ty = H * 0.5 + random() * 6
    ellipse(W / 2, ty, 18 + random() * 6, 2.4, OPEN)
    caves(1 + Math.floor(random() * 3))
  } else if (style === 'valley') {
    fill(x => rolling(x) + 20 * bell(x, W / 2, W * 0.22))
    caves(Math.floor(random() * 4))
  } else if (style === 'islands') {
    const count = 2 + Math.floor(random() * 2)
    const channels = Array.from({ length: count }, (_, k) => ({ middle: (W * (k + 1)) / (count + 1) + (random() * 2 - 1) * 6, half: 6 + random() * 3 }))
    fill(x => rolling(x) + channels.reduce((sum, c) => sum + 34 * bell(x, c.middle, c.half), 0))
    caves(Math.floor(random() * 3))
  } else if (style === 'plateaus') {
    fill(x => Math.round(rolling(x) / 7) * 7)
    caves(1 + Math.floor(random() * 3))
  } else if (style === 'canyon') {
    // Two high plateaus with a gorge between them and a thin bridge across
    const left = H * 0.42 + random() * 6
    const right = H * 0.42 + random() * 6
    fill(x => {
      if (x < W * 0.38) return left + mid(x) * 0.5 + fine(x)
      if (x > W * 0.62) return right + mid(x) * 0.5 + fine(x)
      return H
    })
    const bridgeY = Math.round(Math.min(left, right) + 1)
    for (let x = Math.floor(W * 0.36); x < Math.ceil(W * 0.64); x++) {
      const sag = Math.round(3 * bell(x, W / 2, W * 0.14))
      rect(x, bridgeY + sag, 1, 2, EARTH)
    }
    caves(2 + Math.floor(random() * 2), [6, 14])
  } else if (style === 'caverns') {
    // Under a rock ceiling with earth hanging from it, over a lava lake
    fill(x => H * 0.66 + mid(x) + fine(x))
    const ceiling = noise(random, 14, 4)
    for (let x = 0; x < W; x++) {
      const bottom = Math.round(11 + ceiling(x))
      for (let y = 0; y < bottom; y++) set(x, y, y < 4 ? ROCK : EARTH)
    }
    const spikes = 5 + Math.floor(random() * 4)
    for (let k = 0; k < spikes; k++) {
      const sx = Math.floor(8 + random() * (W - 16))
      const length = 5 + Math.floor(random() * 9)
      for (let d = 0; d < length; d++) {
        const half = Math.max(0, Math.round((1 - d / length) * 2.5))
        let y = 4
        while (y < H && get(sx, y)) y++
        rect(sx - half, y, half * 2 + 1, 1, EARTH)
      }
    }
    caves(2 + Math.floor(random() * 3), [4, 9])
  } else if (style === 'sky') {
    // Islands floating over the sea, each with a core of rock
    const count = 5 + Math.floor(random() * 2)
    for (let k = 0; k < count; k++) {
      const cx = (W * (k + 0.5)) / count + (random() * 2 - 1) * 5
      const half = 8 + random() * 6
      const top = 22 + random() * 24
      const thick = 6 + random() * 8
      for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
        const t = (x - cx) / half
        if (Math.abs(t) > 1) continue
        const y0 = Math.round(top + fine(x) * 1.5 + t * t * 3)
        const y1 = Math.round(top + thick * (1 - t * t) + 2)
        for (let y = y0; y <= y1; y++) set(x, y, EARTH)
      }
      ellipse(cx, top + thick * 0.55, half * 0.35, Math.max(1.2, thick * 0.22), ROCK, { keepRock: false })
    }
  } else if (style === 'city') {
    // Ruined buildings with windows on flat ground
    const ground = H * 0.66
    fill(x => ground + fine(x) * 0.6)
    let x = 4 + Math.floor(random() * 6)
    while (x < W - 10) {
      const w = 8 + Math.floor(random() * 9)
      const h = 8 + Math.floor(random() * 18)
      const base = Math.round(ground)
      rect(x, base - h, w, h, EARTH)
      for (let wy = base - h + 2; wy < base - 2; wy += 4) {
        for (let wx = x + 2; wx < x + w - 2; wx += 4) {
          if (random() < 0.75) rect(wx, wy, 2, 2, OPEN)
        }
      }
      // A broken roof now and then
      if (random() < 0.5) ellipse(x + random() * w, base - h, 2 + random() * 3, 2 + random() * 2, OPEN)
      x += w + 3 + Math.floor(random() * 10)
    }
  } else if (style === 'cheese') {
    fill(x => rolling(x) - 4)
    const holes = 12 + Math.floor(random() * 8)
    for (let k = 0; k < holes; k++) {
      const cx = 8 + random() * (W - 16)
      let top = 0
      while (top < H && !get(Math.floor(cx), top)) top++
      ellipse(cx, top + 3 + random() * 18, 1.5 + random() * 4, 1.5 + random() * 3, OPEN)
    }
  }

  const terrain = {
    style,
    cells,
    // Bumped on every change, so whatever draws the ground knows to draw it again
    version: 0,

    solid (x, y) {
      const cx = Math.floor(x)
      const cy = Math.floor(y)
      if (cx < 0 || cx >= W || cy < 0) return false
      if (cy >= H) return true
      return cells[cy * W + cx] !== OPEN
    },

    /** Carves a crater through earth (rock stays); returns the cells it removed, [x, y, ...]. */
    carve (cx, cy, r) {
      const removed = []
      const r2 = r * r
      for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(H - 2, Math.ceil(cy + r)); y++) {
        for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(W - 1, Math.ceil(cx + r)); x++) {
          const dx = x + 0.5 - cx
          const dy = y + 0.5 - cy
          if (dx * dx + dy * dy > r2 || cells[y * W + x] !== EARTH) continue
          cells[y * W + x] = OPEN
          removed.push(x, y)
        }
      }
      if (removed.length) terrain.version++
      return removed
    },

    rock (x, y) {
      return get(Math.floor(x), Math.floor(y)) === ROCK
    },

    /** Whether a unit with its feet at (x, y) stands on ground. */
    standing (x, y) {
      return Number.isInteger(y) && terrain.solid(x, y) && !terrain.solid(x, y - 1)
    },

    /**
     * Where a unit at (x, y) ends up stepping to column nx: the new feet height, or null when
     * a wall is in the way, there's no room, or there's nothing below but the sea.
     */
    stepTo (nx, y, water) {
      if (nx < 0.5 || nx > W - 0.5) return null
      const base = Math.round(y)
      for (let cy = base - CLIMB; cy < H; cy++) {
        if (!terrain.solid(nx, cy)) continue
        if (cy === base - CLIMB) return null // a wall taller than a step
        if (terrain.solid(nx, cy - 1) || terrain.solid(nx, cy - 2)) return null
        return cy >= water ? null : cy
      }
      return null
    },

    /** The first ground below (x, y), as a feet height, or null if there's none above the sea. */
    groundBelow (x, y, water) {
      for (let cy = Math.max(0, Math.floor(y)); cy < H; cy++) {
        if (terrain.solid(x, cy) && !terrain.solid(x, cy - 1)) return cy < water ? cy : null
      }
      return null
    },

    /** The top of the ground in column x, from the sky. */
    top (x) {
      for (let cy = 0; cy < H; cy++) if (terrain.solid(x, cy)) return cy
      return H
    }
  }
  return terrain
}

/**
 * Spots for the units: each side on its own half, standing on dry ground with room above,
 * kept apart. Side 0 starts on the left.
 */
export function spawnUnits (terrain, perSide, random) {
  const units = []
  const spotsIn = (x) => {
    const spots = []
    for (let y = 6; y < WATER_START - 2; y++) {
      if (terrain.solid(x, y) && !terrain.solid(x, y - 1) && !terrain.solid(x, y - 2) && !terrain.solid(x, y - 3)) spots.push(y)
    }
    return spots
  }
  for (let side = 0; side < 2; side++) {
    const from = side === 0 ? 6 : W * 0.58
    const to = side === 0 ? W * 0.42 : W - 6
    for (let k = 0; k < perSide; k++) {
      let spot = null
      for (let tries = 0; tries < 300 && !spot; tries++) {
        const x = Math.floor(from + random() * (to - from)) + 0.5
        if (units.some(u => Math.abs(u.x - x) < 8)) continue
        const spots = spotsIn(x)
        if (spots.length) spot = { x, y: spots[Math.floor(random() * spots.length)] }
      }
      if (!spot) {
        // Nowhere found: anywhere in the half there's ground at all
        for (let x = Math.floor(from); x < to && !spot; x++) {
          const spots = spotsIn(x + 0.5)
          if (spots.length && !units.some(u => Math.abs(u.x - x - 0.5) < 3)) spot = { x: x + 0.5, y: spots[0] }
        }
      }
      spot ||= { x: Math.floor((from + to) / 2) + 0.5, y: terrain.top(Math.floor((from + to) / 2)) }
      units.push({ side, x: spot.x, y: spot.y, hp: 100, alive: true })
    }
  }
  return units
}
