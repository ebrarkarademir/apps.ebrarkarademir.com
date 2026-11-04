// The man in the navy suit (people/suit.js) at the Blackjack table, in layers like the drawn
// people of avatars.js: the person (eyes open or shut), the padded rail in front of him, and what
// he has from the bar, once on the rail in front of him and once raised to his mouth by his left
// arm. While it's raised, the part of that arm that hung by his side is painted over as the side
// of his jacket, so he never has three arms.
//
// The grid is the picture's own, 112×139. Things from the bar are drawn at twice the size of the
// drawn people's (each of their pixels 2×2 here), to suit him.

import { SUIT } from './people/suit.js'
import { HELD, HELD_COLORS, heldKind } from './avatars.js'

export const FW = SUIT.w
export const FH = SUIT.h

const SLEEVE = ['#3d4c78', '#273354', '#141b33']
const CUFF = ['#ffffff', '#eceef3', '#b4bac8']
const SKIN = ['#f2b98b', '#e5a277', '#bf7655']
const JACKET = '#273354'
const JACKET_DARK = '#1a213e'
const LEATHER = ['#cf5e52', '#93322d', '#581918']
const BRASS = ['#fff4b0', '#e9c55a', '#a8801f']
const LID = '#d78962'
const LASH = '#271c21'
const OUTLINE = '#0b0f1c'

const RAIL_TOP = 124 // the rail's top edge; things stand on it
const SEAM = 86 // the arm hangs to the right of this column, below the elbow
const MOUTH = [43.5, 36.5]

// ---------- A grid ----------

const mat = (tones, toneAt = null) => ({ tones, toneAt })
const flat = (color) => ({ color })

class Grid {
  constructor () {
    this.cells = Array(FW * FH).fill(null)
  }

  get (x, y) {
    return x < 0 || y < 0 || x >= FW || y >= FH ? null : this.cells[y * FW + x]
  }

  set (x, y, cell) {
    if (x >= 0 && y >= 0 && x < FW && y < FH) this.cells[y * FW + x] = cell
  }

  rect (x0, y0, x1, y1, cell) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, cell)
  }

  // A thick line through points [x, y], round at the joints
  limb (points, r, cell) {
    for (let i = 1; i < points.length; i++) {
      const [ax, ay] = points[i - 1]
      const [bx, by] = points[i]
      const dx = bx - ax
      const dy = by - ay
      const len = dx * dx + dy * dy || 1
      for (let y = Math.floor(Math.min(ay, by) - r); y <= Math.ceil(Math.max(ay, by) + r); y++) {
        for (let x = Math.floor(Math.min(ax, bx) - r); x <= Math.ceil(Math.max(ax, bx) + r); x++) {
          const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len))
          const px = ax + t * dx - x
          const py = ay + t * dy - y
          if (px * px + py * py <= r * r) this.set(x, y, cell)
        }
      }
    }
  }

  // A small picture in letters, each letter `scale` × `scale` pixels, top left at x, y
  sprite (rows, x, y, colors, scale = 2) {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const color = colors[row[i]]
        if (color) this.rect(x + i * scale, y + j * scale, x + i * scale + scale - 1, y + j * scale + scale - 1, flat(color))
      }
    })
  }
}

// Shaded as if lit from the top left, with an outline round what's drawn (see avatars.js)
function paint (grid, { outline = true } = {}) {
  const out = Array(FW * FH).fill(null)
  const same = (cell, x, y) => grid.get(x, y) === cell
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      const cell = grid.get(x, y)
      if (!cell) continue
      if (cell.color) {
        out[y * FW + x] = cell.color
        continue
      }
      let tone = cell.toneAt ? cell.toneAt(x, y) : 1
      const lit = !same(cell, x, y - 1) || !same(cell, x - 1, y)
      const dark = !same(cell, x, y + 1) || !same(cell, x + 1, y)
      if (dark && !lit) tone = 2
      else if (lit && !dark && tone === 1) tone = 0
      out[y * FW + x] = cell.tones[tone]
    }
  }
  if (!outline) return out
  const lined = out.slice()
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      if (out[y * FW + x]) continue
      if ([[0, -1], [-1, 0], [1, 0], [0, 1]].some(([dx, dy]) => grid.get(x + dx, y + dy))) lined[y * FW + x] = OUTLINE
    }
  }
  return lined
}

function toUrl (cells) {
  const paths = new Map()
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW;) {
      const color = cells[y * FW + x]
      let end = x + 1
      while (end < FW && cells[y * FW + end] === color) end++
      if (color) paths.set(color, (paths.get(color) || '') + `M${x} ${y}h${end - x}v1h${x - end}z`)
      x = end
    }
  }
  const body = [...paths].map(([color, d]) => `<path fill="${color}" d="${d}"/>`).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FW} ${FH}" shape-rendering="crispEdges">${body}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

// ---------- The man ----------

function person (closed) {
  const cells = []
  for (const row of SUIT.rows) for (const ch of row) cells.push(ch === '.' ? null : SUIT.palette[ch])
  if (closed) {
    // Eyelids down over each eye, a line of lashes along their bottom
    for (const [x0, x1] of [[35, 41], [46, 53]]) {
      for (let y = 25; y <= 27; y++) for (let x = x0; x <= x1; x++) cells[y * FW + x] = y === 27 && x > x0 && x < x1 ? LASH : LID
    }
  }
  return cells
}

// ---------- What's in hand ----------

const ASHTRAY = ['s.........s', 'sGGGGGGGGGs', '.sssssssss.']
const COLORS = { ...HELD_COLORS, G: '#6a7280' }
const sizeOf = (art) => ({ w: art[0].length * 2, h: art.length * 2 })
const smoking = (held) => heldKind(held) === 'smoke'
const reversed = (art) => art.map(row => [...row].reverse().join(''))

// Where the held thing is drawn, its top left, in each pose
function placeOf (held, pose) {
  const art = HELD[held]
  const { w, h } = sizeOf(art)
  if (pose === 'up') {
    if (smoking(held)) return { art, x: 44, y: 35 } // from the lips out to the right
    if (heldKind(held) === 'eat') return { art, x: 54 - w, y: 37 - Math.ceil(h / 2) }
    return { art, x: 54 - w, y: 30 } // the rim at his lips
  }
  // On the rail in front of him, to his left of the name on the rail: a cigarette in an ashtray,
  // its lit end to the left
  if (smoking(held)) return { art: reversed(art), x: 84, y: RAIL_TOP - 8 }
  return { art, x: 90 - Math.floor(w / 2), y: RAIL_TOP - h }
}

/** Where the lit end of a cigarette is, as a share of the picture, down and up; or null. */
export function suitEmber (held) {
  if (held !== 'cigarette' && held !== 'cigar') return null
  const at = (pose) => {
    const { art, x, y } = placeOf(held, pose)
    const i = pose === 'up' ? art[0].length - 1 : 0
    return { x: (x + i * 2 + 1) / FW, y: (y + 1) / FH }
  }
  return { down: at('down'), up: at('up') }
}

export const SUIT_MOUTH = Object.freeze({ x: MOUTH[0] / FW, y: MOUTH[1] / FH })

// What he has, on the rail in front of him
function onRail (held) {
  const g = new Grid()
  if (!HELD[held]) return paint(g)
  const place = placeOf(held, 'down')
  if (smoking(held)) g.sprite(ASHTRAY, 82, RAIL_TOP - 6, COLORS)
  g.sprite(place.art, place.x, place.y, COLORS)
  return paint(g)
}

// His left arm up at his mouth with it, and his jacket where the arm hung
function raised (held) {
  const g = new Grid()
  // The side of his jacket, where the arm was: plain cloth, darker to the edge
  for (let y = 88; y < RAIL_TOP; y++) {
    const row = SUIT.rows[y]
    let edge = row.length - 1
    while (edge > SEAM && row[edge] === '.') edge--
    for (let x = SEAM + 1; x < edge; x++) g.set(x, y, flat(x >= edge - 3 ? JACKET_DARK : JACKET))
  }
  const smoke = smoking(held)
  const wrist = smoke ? [63, 46] : [64, 52]
  const sleeve = mat(SLEEVE, (x) => (x >= 98 ? 2 : 1))
  g.limb([[92, 62], [100, 90]], 8.5, sleeve) // the upper arm, down to the elbow
  g.limb([[100, 90], wrist], 7, mat(SLEEVE, (x, y) => (y >= 80 ? 2 : 1))) // the forearm, up to his face
  g.limb([[wrist[0] + 4, wrist[1] + 4], wrist], 4.5, mat(CUFF)) // the shirt cuff
  const skin = mat(SKIN, (x) => (x >= 58 ? 2 : 1))
  const place = HELD[held] ? placeOf(held, 'up') : null
  if (smoke) {
    // Fingers over and under the cigarette, the palm beside his cheek
    g.rect(52, 31, 58, 34, skin)
    g.rect(52, 39, 58, 42, skin)
    g.rect(56, 31, 61, 44, skin)
    if (place) g.sprite(place.art, place.x, place.y, COLORS)
  } else {
    if (place) g.sprite(place.art, place.x, place.y, COLORS)
    g.rect(50, 39, 59, 50, skin)
    for (const y of [42, 45, 48]) g.rect(50, y, 53, y, flat(SKIN[2])) // fingers round the glass
  }
  return paint(g)
}

function rail (dealer) {
  const g = new Grid()
  if (dealer) return paint(g)
  g.rect(0, RAIL_TOP, FW - 1, FH - 3, mat(LEATHER, (x, y) => (y <= RAIL_TOP + 1 ? 0 : y >= FH - 5 ? 2 : 1)))
  for (let x = 4; x < FW; x += 12) g.rect(x, RAIL_TOP + 6, x + 1, RAIL_TOP + 7, flat(BRASS[2]))
  g.rect(0, FH - 2, FW - 1, FH - 1, mat(BRASS))
  return paint(g)
}

// ---------- Frames for the animations (see suitAnim.js) ----------
//
// A frame is a stack of layers: his body (with the side of his jacket where his left arm hung,
// whenever that arm is drawn elsewhere), his eyes, his mouth, the rail, the arm with whatever it
// holds, and smoke. Each layer is its own image; the animation swaps them about ten times a second.

const SHOULDER = [92, 62]

// Where his left arm is in each pose: the elbow, the wrist, and what the hand is doing. In between
// two poses the elbow and wrist are eased from one to the other.
export const POSES = {
  side: { elbow: [100, 92], wrist: [97, 116], hand: 'open' }, // hanging, empty
  chest: { elbow: [101, 104], wrist: [80, 94], hand: 'grip' }, // a glass held at his chest
  chestSmoke: { elbow: [101, 104], wrist: [80, 90], hand: 'pinch' }, // a cigarette held there
  mouth: { elbow: [100, 88], wrist: [62, 44], hand: 'grip' }, // the glass at his lips
  mouthSmoke: { elbow: [100, 88], wrist: [63, 40], hand: 'pinch', atLips: true }, // the cigarette there
  fistUp: { elbow: [104, 70], wrist: [95, 42], hand: 'fist' }, // a fist in the air
  fistMid: { elbow: [104, 78], wrist: [97, 56], hand: 'fist' },
  forehead: { elbow: [100, 78], wrist: [64, 30], hand: 'palm' } // a hand on his forehead
}

// The hand's middle: a little past the wrist, along the forearm
function handAt (pose) {
  const [ex, ey] = pose.elbow
  const [wx, wy] = pose.wrist
  const len = Math.hypot(wx - ex, wy - ey) || 1
  return { dx: (wx - ex) / len, dy: (wy - ey) / len, c: [Math.round(wx + ((wx - ex) / len) * 5), Math.round(wy + ((wy - ey) / len) * 5)] }
}

/**
 * Where what he holds goes in a pose: { art, x, y } for the thing, and ember [x, y], the lit
 * end of a cigarette (or null). `lift` raises it a pixel or two, as in a sip.
 */
export function heldLayout (pose, held, lift = 0) {
  const art = HELD[held]
  if (!art) return { item: null, ember: null }
  const { w, h } = sizeOf(art)
  const { c } = handAt(pose)
  const lit = held === 'cigarette' || held === 'cigar'
  if (pose.hand === 'pinch') {
    // At the lips it points out to the right of his face; at his chest, away to the left
    if (pose.atLips) return { item: { art, x: 46, y: 35 }, ember: lit ? [46 + w - 1, 36] : null }
    const x = c[0] - w + 2
    const y = c[1] - 2
    return { item: { art: reversed(art), x, y }, ember: lit ? [x, y + 1] : null }
  }
  return { item: { art, x: c[0] - 3 - w + 2, y: c[1] - Math.floor(h / 2) - lift }, ember: null }
}

// The hand, by what it's doing
function drawHand (g, pose) {
  const { c } = handAt(pose)
  const [x, y] = c
  const skin = mat(SKIN, (px) => (px >= x + 2 ? 2 : 1))
  const crease = flat(SKIN[2])
  switch (pose.hand) {
    case 'grip': // round a glass, fingers on its side, the thumb over the top
      g.rect(x - 4, y - 5, x + 4, y + 4, skin)
      for (const fy of [y - 2, y + 1]) g.rect(x - 4, fy, x - 1, fy, crease)
      g.rect(x - 4, y - 5, x - 2, y - 5, flat(SKIN[0]))
      break
    case 'pinch': // the cigarette between two fingers
      g.rect(x - 3, y - 4, x + 3, y + 4, skin)
      g.rect(x - 3, y, x + 1, y, crease)
      break
    case 'fist': // knuckles on top, the thumb across
      g.rect(x - 4, y - 4, x + 4, y + 4, skin)
      for (const kx of [x - 2, x + 1]) g.rect(kx, y - 4, kx, y - 2, crease)
      g.rect(x - 4, y + 1, x, y + 1, crease)
      g.rect(x - 4, y - 4, x + 4, y - 4, flat(SKIN[0]))
      break
    case 'palm': // flat across his forehead, fingers to the left
      g.rect(x - 8, y - 3, x + 5, y + 3, skin)
      for (const fy of [y - 1, y + 1]) g.rect(x - 8, fy, x - 3, fy, crease)
      break
    default: // open, hanging
      g.rect(x - 3, y - 4, x + 3, y + 5, skin)
      for (const fx of [x - 1, x + 1]) g.rect(fx, y + 3, fx, y + 5, crease)
  }
}

// His left arm in a pose, with what it holds; or, with no pose, what he has on the rail
function armCells ({ pose, held = '', lift = 0, onRail: railed = false }) {
  const g = new Grid()
  if (railed && HELD[held]) {
    const place = placeOf(held, 'down')
    if (smoking(held)) g.sprite(ASHTRAY, 82, RAIL_TOP - 6, COLORS)
    g.sprite(place.art, place.x, place.y, COLORS)
  }
  if (pose) {
    const { dx, dy } = handAt(pose)
    const [wx, wy] = pose.wrist
    const cuff = [wx - dx * 4, wy - dy * 4]
    g.limb([SHOULDER, pose.elbow], 8.5, mat(SLEEVE, (x) => (x >= 98 ? 2 : 1)))
    g.limb([pose.elbow, cuff], 7, mat(SLEEVE, (x, y) => (y >= 80 ? 2 : 1)))
    g.limb([cuff, pose.wrist], 4.6, mat(CUFF))
    const { item } = railed ? { item: null } : heldLayout(pose, held, lift)
    if (pose.hand === 'pinch') {
      drawHand(g, pose)
      if (item) g.sprite(item.art, item.x, item.y, COLORS)
    } else {
      if (item) g.sprite(item.art, item.x, item.y, COLORS)
      drawHand(g, pose)
    }
  }
  return paint(g)
}

// His body, and with `patched` the side of his jacket painted over where his left arm hung
function bodyCells (patched) {
  const cells = person(false)
  if (!patched) return cells
  for (let y = 88; y < RAIL_TOP; y++) {
    const row = SUIT.rows[y]
    let edge = row.length - 1
    while (edge > SEAM && row[edge] === '.') edge--
    for (let x = SEAM + 1; x < edge; x++) cells[y * FW + x] = x >= edge - 3 ? JACKET_DARK : JACKET
  }
  return cells
}

// Eyelids: half down, or shut
function eyesCells (eyes) {
  const cells = Array(FW * FH).fill(null)
  if (eyes !== 'half' && eyes !== 'closed') return cells
  for (const [x0, x1] of [[35, 41], [46, 53]]) {
    const rows = eyes === 'half' ? [25, 26] : [25, 26, 27]
    for (const y of rows) for (let x = x0; x <= x1; x++) cells[y * FW + x] = LID
    const lash = eyes === 'half' ? 26 : 27
    for (let x = x0 + 1; x < x1; x++) cells[lash * FW + x] = LASH
  }
  return cells
}

// The mouth, in his beard: a grin with teeth, open for a bite, an O for blowing smoke, a flat line
function mouthCells (mouth) {
  const cells = Array(FW * FH).fill(null)
  const set = (x, y, c) => { cells[y * FW + x] = c }
  const DARK = '#3a1418'
  const LIP = '#8a3a3a'
  const TEETH = '#f4efe6'
  if (mouth === 'grin') {
    for (let x = 39; x <= 47; x++) set(x, 35, TEETH)
    for (let x = 40; x <= 46; x++) set(x, 36, DARK)
    set(38, 34, LIP)
    set(48, 34, LIP)
    set(38, 35, LIP)
    set(48, 35, LIP)
    for (let x = 40; x <= 46; x++) set(x, 37, LIP)
  } else if (mouth === 'open' || mouth === 'o') {
    const [x0, x1] = mouth === 'open' ? [40, 46] : [42, 44]
    for (let y = 35; y <= 37; y++) for (let x = x0; x <= x1; x++) set(x, y, DARK)
    for (let x = x0; x <= x1; x++) set(x, 34, LIP)
    for (let x = x0; x <= x1; x++) set(x, 38, LIP)
  } else if (mouth === 'chew') {
    for (let x = 40; x <= 46; x++) set(x, 36, LIP)
    set(41, 35, DARK)
    set(45, 35, DARK)
  } else if (mouth === 'flat') {
    for (let x = 39; x <= 47; x++) set(x, 36, DARK)
    for (let x = 39; x <= 47; x++) set(x, 35, LIP)
  }
  return cells
}

// Smoke, as round puffs of pixels thinning out (dithered) as they fade; and the glow round a lit
// end, bright during a draw
function fxCells ({ puffs = [], ember = null, glow = 0 }) {
  const cells = Array(FW * FH).fill(null)
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < FW && y < FH) cells[y * FW + x] = c }
  for (const { x, y, r, fade } of puffs) {
    for (let py = Math.floor(y - r); py <= Math.ceil(y + r); py++) {
      for (let px = Math.floor(x - r); px <= Math.ceil(x + r); px++) {
        const d = Math.hypot(px - x, py - y)
        if (d > r) continue
        const k = (px + py) & 3
        if ((fade === 1 && k === 0) || (fade === 2 && (k & 1)) || (fade >= 3 && k !== 0)) continue
        set(px, py, d > r - 1 ? '#c3cad2' : '#eef1f4')
      }
    }
  }
  if (ember) {
    const [ex, ey] = ember
    if (glow >= 1) for (const [dx, dy] of [[-1, 0], [2, 0], [0, -1], [1, -1], [0, 2], [1, 2]]) set(ex + dx, ey + dy, glow >= 2 ? '#ffb347' : '#e8682a')
    if (glow >= 2) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) set(ex + dx, ey + dy, '#fff1a8')
  }
  return cells
}

// Frames repeat (the same pose, the same puff), so their images are kept; but not without end
const frames = new Map()
const FRAMES_MAX = 600

function frameUrl (key, make) {
  if (!frames.has(key)) {
    if (frames.size >= FRAMES_MAX) frames.delete(frames.keys().next().value)
    frames.set(key, toUrl(make()))
  }
  return frames.get(key)
}

/** The layers of one frame (see suitAnim.js frameAt) as image URLs. */
export function suitFrame (state, { held = '', dealer = false } = {}) {
  const pose = state.pose
  const arm = { pose, held, lift: state.lift || 0, onRail: !!state.onRail }
  return {
    body: frameUrl(`b${pose ? 1 : 0}`, () => bodyCells(!!pose)),
    eyes: frameUrl(`e${state.eyes || ''}`, () => eyesCells(state.eyes)),
    mouth: frameUrl(`m${state.mouth || ''}`, () => mouthCells(state.mouth)),
    rail: suitUrl({ part: 'rail', dealer }),
    arm: frameUrl(`a${JSON.stringify(arm)}`, () => armCells(arm)),
    fx: frameUrl(`f${JSON.stringify(state.fx || {})}`, () => fxCells(state.fx || {}))
  }
}

const cache = new Map()

/** A layer of the man as an image URL: 'chair' (none), 'person', 'rail' or 'arm' (see avatars.js). */
export function suitUrl ({ part = 'person', pose = 'down', held = '', closed = false, dealer = false } = {}) {
  const key = JSON.stringify([part, pose, held, closed, dealer])
  if (!cache.has(key)) {
    let cells
    if (part === 'person') cells = person(closed)
    else if (part === 'rail') cells = rail(dealer)
    else if (part === 'arm') cells = pose === 'up' ? raised(held) : onRail(held)
    else cells = Array(FW * FH).fill(null)
    cache.set(key, toUrl(cells))
  }
  return cache.get(key)
}
