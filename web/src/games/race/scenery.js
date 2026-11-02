import { WALL, ROAD, pointAt } from './track.js'
import { mulberry32 } from '../ascii/random.js'

// What lies round a Neon Laps track, laid out from the track's seed so it's the same on every
// screen: city blocks with lit windows and street lamps along the walls for the city circuit;
// a frozen lake, pine trees and rocks for the ice track; and marks on the road. All of it stays
// clear of the walls. Kept free of drawing, as plain shapes in world units.

const CLEAR = WALL + 3 // nothing stands nearer the middle line than this

const cache = new Map()

// How far a point is from the middle line, looking along all of it
function distance (track, x, y) {
  let best = Infinity
  for (let k = 0; k < track.n; k += 2) {
    const dx = track.x[k] - x
    const dy = track.y[k] - y
    const d = dx * dx + dy * dy
    if (d < best) best = d
  }
  return Math.sqrt(best)
}

/** The box round the track, with `margin` units to spare all round. */
export function boundsOf (track, margin = 0) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity
  for (let k = 0; k < track.n; k++) {
    minX = Math.min(minX, track.x[k]); maxX = Math.max(maxX, track.x[k])
    minY = Math.min(minY, track.y[k]); maxY = Math.max(maxY, track.y[k])
  }
  return { minX: minX - margin, minY: minY - margin, maxX: maxX + margin, maxY: maxY + margin }
}

function cityScenery (track, random, box) {
  const buildings = []
  const neon = ['#ff5fd2', '#3fe0d0', '#ffb000']
  for (let tries = 0; tries < 900 && buildings.length < 70; tries++) {
    const w = 8 + Math.round(random() * 13) * 2
    const h = 8 + Math.round(random() * 13) * 2
    const x = Math.round(box.minX + random() * (box.maxX - box.minX - w))
    const y = Math.round(box.minY + random() * (box.maxY - box.minY - h))
    // Clear of the road everywhere, checked on a fine grid over the block
    let clear = true
    for (let gx = 0; gx <= w && clear; gx += Math.min(w, 6)) {
      for (let gy = 0; gy <= h && clear; gy += Math.min(h, 6)) {
        if (distance(track, x + gx, y + gy) < CLEAR) clear = false
      }
    }
    if (!clear || buildings.some(b => x < b.x + b.w + 3 && x + w + 3 > b.x && y < b.y + b.h + 3 && y + h + 3 > b.y)) continue
    const windows = []
    for (let wx = x + 1.6; wx < x + w - 1.6; wx += 2.4) {
      for (let wy = y + 1.6; wy < y + h - 1.6; wy += 2.4) {
        if (random() < 0.32) windows.push([wx, wy])
      }
    }
    buildings.push({ x, y, w, h, windows, neon: random() < 0.22 ? neon[Math.floor(random() * neon.length)] : null, roof: random() < 0.5 })
  }
  // Street lamps just outside the walls, on alternate sides
  const lamps = []
  for (let s = 0, side = 1; s < track.length; s += 26, side = -side) {
    const p = pointAt(track, s, side * (WALL + 2))
    if (distance(track, p.x, p.y) > WALL + 1) lamps.push({ x: p.x, y: p.y })
  }
  // Dashes down the middle of the road on the straights
  const dashes = []
  for (let s = 0; s < track.length; s += 6) {
    const k = Math.floor(s / track.step) % track.n
    if (Math.abs(track.bend[k]) > 0.012) continue
    const a = pointAt(track, s, 0)
    const b = pointAt(track, s + 3, 0)
    dashes.push([a.x, a.y, b.x, b.y])
  }
  return { buildings, lamps, dashes, trees: [], rocks: [], lake: null, cracks: [], streaks: [] }
}

function iceScenery (track, random, box) {
  // The lake: a rough circle in the middle of the loop, pulled in wherever it comes near the road
  const cx = (box.minX + box.maxX) / 2
  const cy = (box.minY + box.maxY) / 2
  const lake = []
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2
    let r = 95 * (0.85 + random() * 0.3)
    while (r > 8 && distance(track, cx + Math.cos(a) * r, cy + Math.sin(a) * r) < CLEAR + 8) r -= 2
    lake.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  const inLake = (x, y) => {
    let inside = false
    for (let i = 0, j = lake.length - 1; i < lake.length; j = i++) {
      const [xi, yi] = lake[i]
      const [xj, yj] = lake[j]
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
  }
  // Cracks across the ice of the lake
  const cracks = []
  for (let i = 0; i < 26; i++) {
    let x = cx + (random() - 0.5) * 120
    let y = cy + (random() - 0.5) * 90
    if (!inLake(x, y)) continue
    let a = random() * Math.PI * 2
    const crack = [[x, y]]
    for (let j = 0; j < 6; j++) {
      a += (random() - 0.5) * 1.2
      x += Math.cos(a) * (2 + random() * 5)
      y += Math.sin(a) * (2 + random() * 5)
      if (!inLake(x, y)) break
      crack.push([x, y])
    }
    if (crack.length > 1) cracks.push(crack)
  }
  const trees = []
  for (let tries = 0; tries < 1400 && trees.length < 170; tries++) {
    const x = box.minX + random() * (box.maxX - box.minX)
    const y = box.minY + random() * (box.maxY - box.minY)
    const r = 1.6 + random() * 2.4
    if (inLake(x, y) || distance(track, x, y) < CLEAR + r) continue
    if (trees.some(t => Math.hypot(t.x - x, t.y - y) < t.r + r + 0.6)) continue
    trees.push({ x, y, r })
  }
  const rocks = []
  for (let tries = 0; tries < 300 && rocks.length < 24; tries++) {
    const x = box.minX + random() * (box.maxX - box.minX)
    const y = box.minY + random() * (box.maxY - box.minY)
    const r = 1 + random() * 1.8
    if (inLake(x, y) || distance(track, x, y) < CLEAR + r || trees.some(t => Math.hypot(t.x - x, t.y - y) < t.r + r + 1)) continue
    rocks.push({ x, y, r, sides: 5 + Math.floor(random() * 3), turn: random() * Math.PI })
  }
  // Polished streaks along the ice of the road, where cars slide
  const streaks = []
  for (let i = 0; i < 260; i++) {
    const s = random() * track.length
    const d = (random() * 2 - 1) * (ROAD - 0.8)
    const a = pointAt(track, s, d)
    const b = pointAt(track, s + 2 + random() * 6, d + (random() - 0.5))
    streaks.push([a.x, a.y, b.x, b.y])
  }
  return { buildings: [], lamps: [], dashes: [], trees, rocks, lake, cracks, streaks }
}

/** A track's scenery: { buildings, lamps, dashes, trees, rocks, lake, cracks, streaks, box }. */
export function sceneryOf (track) {
  if (cache.has(track)) return cache.get(track)
  const random = mulberry32(track.seed * 7919 + 13)
  const box = boundsOf(track, 70)
  const scenery = { ...(track.theme === 'ice' ? iceScenery(track, random, box) : cityScenery(track, random, box)), box }
  cache.set(track, scenery)
  return scenery
}
