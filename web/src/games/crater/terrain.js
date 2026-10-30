import { mulberry32 } from '../ascii/random'

// The ground of Crater Duel: a grid of cells, solid or open, that explosions bite into. A map
// comes from a seed alone, made with nothing but random numbers and plain arithmetic, so every
// device builds exactly the same one; craters (whole-number centers) carve the same cells too.
//
// Positions are in cells: x to the right, y down. A unit's position is its feet: standing, its
// y is the top edge of the solid cell under it.

export const W = 160
export const H = 72
export const WATER_START = H - 4 // the sea's surface at the start; it rises in sudden death
export const CLIMB = 3 // how many cells a unit can step up while walking
export const STYLES = ['hills', 'mountain', 'valley', 'islands', 'plateaus']

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

export function createTerrain (seed) {
  const random = mulberry32(seed)
  const style = STYLES[Math.floor(random() * STYLES.length)]
  const cells = new Uint8Array(W * H) // 1 solid, 0 open
  const big = noise(random, 40, 12)
  const mid = noise(random, 16, 6)
  const fine = noise(random, 6, 1.5)
  const surface = new Float64Array(W)
  for (let x = 0; x < W; x++) {
    let y = H * 0.56 + big(x) + mid(x) + fine(x)
    if (style === 'mountain') y -= 22 * bell(x, W / 2, W * 0.26)
    if (style === 'valley') y += 20 * bell(x, W / 2, W * 0.22)
    if (style === 'plateaus') y = Math.round(y / 7) * 7
    surface[x] = y
  }
  if (style === 'islands') {
    // Two or three channels of sea between the islands
    const count = 2 + Math.floor(random() * 2)
    for (let k = 1; k <= count; k++) {
      const middle = (W * k) / (count + 1) + (random() * 2 - 1) * 6
      for (let x = 0; x < W; x++) surface[x] += 34 * bell(x, middle, 6 + random() * 3)
    }
  }
  for (let x = 0; x < W; x++) {
    const top = Math.max(12, Math.min(H - 6, Math.round(surface[x])))
    for (let y = top; y < H; y++) cells[y * W + x] = 1
  }
  // A few caves and arches, never through the sea floor
  const caves = Math.floor(random() * 4)
  for (let k = 0; k < caves; k++) {
    const cx = 20 + random() * (W - 40)
    const cy = surface[Math.floor(cx)] + 5 + random() * 8
    const rx = 4 + random() * 7
    const ry = 2 + random() * 2.5
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        if (x < 0 || x >= W || y < 0 || y >= H - 3) continue
        const dx = (x - cx) / rx
        const dy = (y - cy) / ry
        if (dx * dx + dy * dy <= 1) cells[y * W + x] = 0
      }
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
      return cells[cy * W + cx] === 1
    },

    /** Carves a crater; returns the cells it removed, [x, y, ...], for the flying debris. */
    carve (cx, cy, r) {
      const removed = []
      const r2 = r * r
      for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(H - 2, Math.ceil(cy + r)); y++) {
        for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(W - 1, Math.ceil(cx + r)); x++) {
          const dx = x + 0.5 - cx
          const dy = y + 0.5 - cy
          if (dx * dx + dy * dy > r2 || !cells[y * W + x]) continue
          cells[y * W + x] = 0
          removed.push(x, y)
        }
      }
      if (removed.length) terrain.version++
      return removed
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
 * Spots for the units: each side on its own half, on dry ground with room to stand, kept
 * apart. Side 0 starts on the left.
 */
export function spawnUnits (terrain, perSide, random) {
  const units = []
  for (let side = 0; side < 2; side++) {
    const from = side === 0 ? 8 : W * 0.58
    const to = side === 0 ? W * 0.42 : W - 8
    for (let k = 0; k < perSide; k++) {
      let spot = null
      for (let tries = 0; tries < 200 && !spot; tries++) {
        const x = Math.floor(from + random() * (to - from)) + 0.5
        const y = terrain.top(x)
        if (y >= WATER_START - 2 || terrain.solid(x, y - 1) || terrain.solid(x, y - 2)) continue
        if (units.some(u => Math.abs(u.x - x) < 9)) continue
        spot = { x, y }
      }
      spot ||= { x: Math.floor(from + (to - from) * (k + 0.5) / perSide) + 0.5, y: 0 }
      if (!spot.y) spot.y = terrain.top(spot.x)
      units.push({ side, x: spot.x, y: spot.y, hp: 100, alive: true })
    }
  }
  return units
}
