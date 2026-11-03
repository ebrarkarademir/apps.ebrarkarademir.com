// The people at the table, in pixel art: each player sits on a chair at the table's padded rail,
// and the dealer stands behind the cards. A look (skin, hair, clothes) comes from the player's id,
// so everyone at the table sees the same person for the same player.
//
// Each picture is drawn on a 28×30 grid in layers: the chair, the body, the rail in front of it,
// and the arm with whatever the player has in hand from the bar, once resting on the rail and once
// raised to the mouth. Parts are filled with materials of three tones (light, base, shadow) and
// shaded as if lit from the top left, and every layer gets a dark outline in its own colours, so
// the figures read round rather than flat. The table swaps the arm's two poses and the eyes to
// make someone sip a beer or draw on a cigarette (see SeatAvatar.vue).

export const W = 28
export const H = 30

// ---------- Colours ----------

const SKINS = [
  ['#ffe3c8', '#f6c79c', '#d39566'],
  ['#f6d0aa', '#e3aa7a', '#b47448'],
  ['#dfa77a', '#bf7f52', '#8d5532'],
  ['#b27b52', '#8f5a37', '#633a21'],
  ['#8a5a3a', '#6b4129', '#472716']
]

const HAIRS = [
  ['#5a4b63', '#2f2738', '#18131e'], // black
  ['#a6713f', '#714524', '#4b2b13'], // brown
  ['#fff0a0', '#ecc54c', '#b98f24'], // blond
  ['#f39a5b', '#cc5d27', '#8c3814'], // red
  ['#ececf0', '#bcc0c8', '#868b96'], // grey
  ['#ffc0e0', '#f07ab8', '#b04582'], // pink
  ['#9fdcff', '#4c9fe8', '#2b62b0'] // blue
]

const CLOTHES = [
  ['#ff8a80', '#e04848', '#a42a33'],
  ['#8fd0ff', '#3f8fe0', '#24589c'],
  ['#a6ec8a', '#4cab52', '#2b6d3a'],
  ['#ffe17a', '#e8a92c', '#a86b14'],
  ['#d9a8ff', '#9b5cd6', '#63358f'],
  ['#9ff0e6', '#2fb3a6', '#1b6f6a'],
  ['#ffb3d1', '#e8659c', '#a63a6a'],
  ['#e8e8ee', '#b4b8c4', '#787d8c'],
  ['#5f6675', '#3a404c', '#22262e'],
  ['#ffc49a', '#f07b38', '#ad4d1c']
]

const INNER = ['#fffaf0', '#f4ecd8', '#cfc4a8']
const WOOD = ['#d49a5e', '#9a6232', '#64391a']
const LEATHER = ['#c4554a', '#8c2f2b', '#561817']
const BRASS = ['#fff1a8', '#e9c55a', '#a8801f']
const DEALER_VEST = ['#4a4f5c', '#2b2f38', '#16181e']
const OUTLINE = '#21160f'
const EYE = '#21160f'
const BLUSH = '#f4918a'
const MOUTH = '#9a3b32'

// ---------- A grid of materials ----------

// A material: three tones, and optionally which tone a cell takes by where it is
const mat = (tones, toneAt = null) => ({ tones, toneAt })
// A cell of one fixed colour, left out of the shading
const flat = (color) => ({ color })

class Grid {
  constructor () {
    this.cells = Array(W * H).fill(null)
  }

  get (x, y) {
    return x < 0 || y < 0 || x >= W || y >= H ? null : this.cells[y * W + x]
  }

  set (x, y, cell) {
    if (x >= 0 && y >= 0 && x < W && y < H) this.cells[y * W + x] = cell
  }

  span (y, x0, x1, cell) {
    for (let x = x0; x <= x1; x++) this.set(x, y, cell)
  }

  rect (x0, y0, x1, y1, cell) {
    for (let y = y0; y <= y1; y++) this.span(y, x0, x1, cell)
  }

  // Rows of [y, x0, x1]
  rows (list, cell) {
    for (const [y, x0, x1] of list) this.span(y, x0, x1, cell)
  }

  // A small picture in letters (see HELD), with its top left at x, y
  sprite (rows, x, y, colors) {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const color = colors[row[i]]
        if (color) this.set(x + i, y + j, flat(color))
      }
    })
  }
}

/**
 * Colours for every cell: shaded materials as if lit from the top left (a cell on a part's top or
 * left edge takes the light tone, on its bottom or right edge the shadow, the material's own rule
 * otherwise), then an outline round the whole layer, darker than whatever it borders.
 */
function paint (grid) {
  const out = Array(W * H).fill(null)
  const same = (cell, x, y) => grid.get(x, y) === cell
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = grid.get(x, y)
      if (!cell) continue
      if (cell.color) {
        out[y * W + x] = cell.color
        continue
      }
      let tone = cell.toneAt ? cell.toneAt(x, y) : 1
      const lit = !same(cell, x, y - 1) || !same(cell, x - 1, y)
      const dark = !same(cell, x, y + 1) || !same(cell, x + 1, y)
      if (dark && !lit) tone = 2
      else if (lit && !dark && tone === 1) tone = 0
      out[y * W + x] = cell.tones[tone]
    }
  }
  // The outline goes round the layer, on the cells beside it that are empty
  const lined = out.slice()
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (out[y * W + x]) continue
      const near = [[0, -1], [-1, 0], [1, 0], [0, 1]].map(([dx, dy]) => grid.get(x + dx, y + dy)).find(Boolean)
      if (near) lined[y * W + x] = near.tones ? shade(near.tones[2], 0.55) : OUTLINE
    }
  }
  return lined
}

// A colour darkened by a share (0..1)
function shade (hex, share) {
  const n = parseInt(hex.slice(1), 16)
  const part = (v) => Math.round(v * (1 - share)).toString(16).padStart(2, '0')
  return `#${part(n >> 16)}${part((n >> 8) & 255)}${part(n & 255)}`
}

/** Painted layers (colour or null for each cell), each over the ones before. */
function stack (layers) {
  const out = Array(W * H).fill(null)
  for (const layer of layers) layer.forEach((color, i) => { if (color) out[i] = color })
  return out
}

/** Cells as an SVG image URL, one path per colour, sharp at any size. */
export function toUrl (cells) {
  const paths = new Map()
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W;) {
      const color = cells[y * W + x]
      let end = x + 1
      while (end < W && cells[y * W + end] === color) end++
      if (color) paths.set(color, (paths.get(color) || '') + `M${x} ${y}h${end - x}v1h${x - end}z`)
      x = end
    }
  }
  const body = [...paths].map(([color, d]) => `<path fill="${color}" d="${d}"/>`).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">${body}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

// ---------- Who looks like what ----------

const HAIR_STYLES = ['short', 'long', 'bun', 'spiky', 'cap', 'bob', 'mohawk', 'curly']
const OUTFITS = ['tee', 'vneck', 'jacket', 'stripes', 'hoodie']

// The same number for the same id, everywhere
function hash (text) {
  let h = 2166136261
  for (const ch of String(text)) {
    h ^= ch.codePointAt(0)
    h = Math.imul(h, 16777619)
  }
  // Stir the bits, so ids that differ only at the end still look different
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  return h >>> 0
}

/** A look for a player id: indexes into the colours and styles above. */
export function lookOf (id) {
  // Each feature from its own hash, so they don't go together
  const pick = (what, n) => hash(`${what}:${id}`) % n
  return {
    skin: pick('skin', SKINS.length),
    hair: pick('hair', HAIRS.length),
    style: HAIR_STYLES[pick('style', HAIR_STYLES.length)],
    outfit: OUTFITS[pick('outfit', OUTFITS.length)],
    clothes: pick('clothes', CLOTHES.length),
    accent: pick('accent', CLOTHES.length),
    glasses: pick('glasses', 5) === 0
  }
}

export const DEALER_LOOK = Object.freeze({ skin: 1, hair: 0, style: 'slick', outfit: 'dealer', clothes: 7, accent: 0, glasses: false })

// ---------- Drawing a person ----------

const HEAD = [[3, 10, 17], [4, 9, 18], [5, 8, 19], [6, 8, 19], [7, 8, 19], [8, 8, 19], [9, 8, 19], [10, 8, 19], [11, 8, 19], [12, 8, 19], [13, 9, 18], [14, 10, 17]]
const TORSO = [[17, 8, 19], [18, 6, 21], ...Array.from({ length: 11 }, (_, i) => [19 + i, 5, 22])]

function drawHair (g, style, hair) {
  const back = hair // behind the head, in the same material
  switch (style) {
    case 'long':
      g.rows([[2, 10, 17], [3, 8, 19], [4, 7, 20], [5, 7, 20], [6, 7, 9], [6, 17, 20], [7, 7, 8], [7, 19, 20]], hair)
      for (let y = 8; y <= 19; y++) {
        g.span(y, 6, 7, back)
        g.span(y, 20, 21, back)
      }
      g.span(6, 10, 16, hair)
      break
    case 'bob':
      g.rows([[2, 10, 17], [3, 8, 19], [4, 7, 20], [5, 7, 20], [6, 7, 20], [7, 7, 8], [7, 19, 20]], hair)
      for (let y = 8; y <= 13; y++) {
        g.span(y, 7, 7, hair)
        g.span(y, 20, 20, hair)
      }
      g.span(14, 7, 9, hair)
      g.span(14, 18, 20, hair)
      break
    case 'bun':
      g.rows([[0, 12, 15], [1, 11, 16], [2, 10, 17], [3, 8, 19], [4, 7, 20], [5, 7, 20], [6, 7, 10], [6, 15, 20], [7, 7, 8], [7, 19, 20], [8, 7, 7], [8, 20, 20]], hair)
      break
    case 'spiky':
      g.rows([[0, 9, 9], [0, 13, 13], [0, 17, 17], [1, 9, 10], [1, 12, 14], [1, 16, 18], [2, 8, 19], [3, 7, 20], [4, 7, 20], [5, 7, 20], [6, 7, 11], [6, 13, 14], [6, 16, 20], [7, 7, 8], [7, 19, 20]], hair)
      break
    case 'mohawk':
      g.rows([[0, 12, 15], [1, 12, 15], [2, 12, 15], [3, 11, 16], [4, 12, 15], [5, 8, 8], [5, 19, 19], [6, 8, 8], [6, 19, 19]], hair)
      break
    case 'curly':
      g.rows([[1, 9, 11], [1, 13, 15], [1, 17, 18], [2, 8, 19], [3, 7, 20], [4, 6, 21], [5, 6, 21], [6, 6, 9], [6, 11, 12], [6, 15, 16], [6, 18, 21], [7, 6, 8], [7, 19, 21], [8, 6, 7], [8, 20, 21], [9, 6, 7], [9, 20, 21], [10, 7, 7], [10, 20, 20]], hair)
      break
    case 'cap':
      break // drawn with the clothes, see drawCap
    case 'slick':
      g.rows([[2, 10, 17], [3, 8, 19], [4, 8, 19], [5, 8, 19], [6, 8, 9], [6, 18, 19], [7, 8, 8], [7, 19, 19]], hair)
      g.span(5, 12, 13, flat(HAIRS[0][0])) // the shine of the gel
      break
    default: // short
      g.rows([[2, 10, 17], [3, 8, 19], [4, 7, 20], [5, 7, 20], [6, 7, 12], [6, 14, 20], [7, 7, 8], [7, 19, 20], [8, 7, 7], [8, 20, 20]], hair)
  }
}

function drawCap (g, hair, colour) {
  // Hair showing under the cap at the sides, then the cap and its peak
  g.rows([[6, 7, 8], [6, 19, 20], [7, 7, 8], [7, 19, 20], [8, 7, 7], [8, 20, 20]], hair)
  const cap = mat(colour, (x) => (x >= 17 ? 2 : 1))
  g.rows([[1, 11, 16], [2, 9, 18], [3, 8, 19], [4, 7, 20], [5, 7, 20]], cap)
  g.rows([[6, 6, 15]], mat(colour.map(c => shade(c, 0.2))))
  g.set(13, 1, flat('#ffffff'))
}

function drawFace (g, look, closed, skin) {
  const eyes = [11, 16]
  for (const x of eyes) {
    if (closed) {
      g.set(x, 10, flat(EYE))
      g.set(x - 1, 10, flat(shade(skin.tones[2], 0.2)))
    } else {
      g.set(x, 9, flat(EYE))
      g.set(x, 10, flat(EYE))
      g.set(x + 1, 9, flat('#ffffff'))
    }
  }
  if (look.glasses) {
    const rim = flat('#2a2a33')
    for (const x of eyes) {
      g.rows([[8, x - 1, x + 1], [11, x - 1, x + 1]], rim)
      g.set(x - 2, 9, rim)
      g.set(x - 2, 10, rim)
      g.set(x + 2, 9, rim)
      g.set(x + 2, 10, rim)
    }
    g.set(13, 9, rim)
    g.set(14, 9, rim)
  }
  g.set(10, 12, flat(BLUSH))
  g.set(17, 12, flat(BLUSH))
  g.set(13, 11, flat(skin.tones[2])) // the nose's shadow
  g.span(12, 13, 14, flat(MOUTH))
}

function drawOutfit (g, look, skinMat) {
  const tones = CLOTHES[look.clothes]
  const accent = CLOTHES[look.accent === look.clothes ? (look.accent + 3) % CLOTHES.length : look.accent]
  // Round: the right of the body and the bottom in shadow, the left of the chest in the light
  const round = (x, y) => (x >= 19 || y >= 27 ? 2 : x <= 8 && y <= 22 ? 0 : 1)
  const body = mat(tones, round)
  if (look.outfit === 'dealer') {
    g.rows(TORSO, mat(INNER, round))
    const vest = mat(DEALER_VEST, round)
    for (const [y, x0, x1] of TORSO) {
      if (y < 19) continue
      const open = Math.max(0, 23 - y) // the vest's V, narrowing down the chest
      g.span(y, x0, 13 - Math.ceil(open / 2), vest)
      g.span(y, 14 + Math.ceil(open / 2), x1, vest)
    }
    g.rows([[17, 12, 15], [18, 12, 15]], mat(INNER))
    // A bow tie
    g.rows([[17, 11, 12], [18, 11, 12], [17, 15, 16], [18, 15, 16]], flat('#c8283a'))
    g.span(17, 13, 14, flat('#8e1626'))
    g.span(18, 13, 14, flat('#8e1626'))
    g.set(13, 22, flat(BRASS[1]))
    g.set(13, 25, flat(BRASS[1]))
    return
  }
  g.rows(TORSO, body)
  switch (look.outfit) {
    case 'vneck':
      g.rows([[17, 12, 15], [18, 12, 15], [19, 13, 14]], skinMat)
      break
    case 'jacket': {
      const inner = mat(accent, round)
      for (let y = 17; y <= 29; y++) g.span(y, 11, 16, inner)
      g.rows([[17, 10, 10], [18, 10, 11], [19, 10, 11], [17, 17, 17], [18, 16, 17], [19, 16, 17]], mat(tones.map(c => shade(c, 0.15))))
      g.set(13, 23, flat(BRASS[1]))
      g.set(13, 26, flat(BRASS[1]))
      break
    }
    case 'stripes':
      for (const y of [20, 23, 26, 29]) g.span(y, 5, 22, mat(accent, round))
      g.span(17, 11, 16, skinMat)
      break
    case 'hoodie':
      g.rows([[16, 9, 18], [17, 7, 20]], mat(tones.map(c => shade(c, 0.12)), (x) => (x >= 17 ? 2 : 1)))
      g.set(11, 19, flat(INNER[1]))
      g.set(11, 20, flat(INNER[1]))
      g.set(16, 19, flat(INNER[1]))
      g.set(16, 20, flat(INNER[1]))
      g.rows([[24, 9, 18], [25, 9, 18]], mat(tones.map(c => shade(c, 0.1))))
      break
    default: // tee, with a collar
      g.span(17, 11, 16, skinMat)
      g.span(17, 11, 11, mat(tones.map(c => shade(c, 0.2))))
      g.span(17, 16, 16, mat(tones.map(c => shade(c, 0.2))))
  }
}

// The arm on the left (the player's right), resting with its hand on the rail
function drawFarArm (g, look, skinMat) {
  const tones = look.outfit === 'dealer' ? INNER : CLOTHES[look.clothes]
  const sleeve = mat(tones, (x, y) => (y >= 23 ? 2 : 1))
  g.rows([[18, 4, 6], [19, 3, 6], [20, 3, 6], [21, 3, 6], [22, 3, 6], [23, 3, 7], [24, 4, 8]], sleeve)
  g.rows([[24, 8, 10], [25, 7, 10]], skinMat)
}

// ---------- What's in hand ----------

// Little versions of the bar's things, as they look in a hand: letters are colours in HELD_COLORS
const HELD = {
  beer: ['WWWW.', 'yyyys', 'yYyy.', 'yyyys', 'yyyy.'],
  wine: ['s.s', 'RRR', '.R.', '.s.', 'sss'],
  champagne: ['sys', 'sys', '.y.', '.s.', 'sss'],
  cocktail: ['ppppp', '.ppp.', '..s..', '..s..', '.sss.'],
  whiskey: ['s...s', 'sOOOs', 'sOOOs', 'sssss'],
  raki: ['sWWs', 'sWWs', 'sWWs', 'ssss'],
  tea: ['aaaa', '.aa.', 'aaaa'],
  coffee: ['TTT.', 'WWWW', 'WWW.'],
  cola: ['rrr', 'rWr', 'rrr', 'rrr'],
  cigarette: ['tWWWWo'],
  cigar: ['TTTTTo'],
  hookah: ['GGGGb'],
  burger: ['.ttt.', 'ttttt', 'eeeee', 'TTTTT', 'ttttt'],
  pizza: ['tttt', 'yry.', 'yy..', 'y...'],
  fries: ['y.y.y', 'yyyyy', 'rrrrr', 'rrrrr'],
  doner: ['WtW', 'tTt', 'tTt', 'WtW'],
  simit: ['.tt.', 't..t', 't..t', '.tt.'],
  nuts: ['.tO.', 'tOtO']
}

const HELD_COLORS = {
  W: '#fbf6e8',
  y: '#ffd84a',
  Y: '#d19b1d',
  s: '#cfe3ee',
  R: '#a01f2b',
  p: '#ff8fc0',
  O: '#e08a2b',
  a: '#a33a1c',
  T: '#5e3519',
  r: '#e8463c',
  t: '#d0904e',
  o: '#ff6a2b',
  G: '#6a7280',
  b: '#4aa3e8',
  e: '#5bbd4f'
}

/** What a player does with a thing from the bar: drink it, smoke it, eat it, or nothing. */
export function heldKind (id) {
  if (['cigarette', 'cigar', 'hookah'].includes(id)) return 'smoke'
  if (['burger', 'pizza', 'fries', 'doner', 'simit', 'nuts'].includes(id)) return 'eat'
  return HELD[id] ? 'drink' : ''
}

/** Whether a thing from the bar can be held. */
export const canHold = (id) => Object.hasOwn(HELD, id)

// The arm on the right (the player's left), with what it holds: down on the rail, or up at the
// mouth for a sip, a bite or a draw
function drawNearArm (g, look, skinMat, pose, held) {
  const tones = look.outfit === 'dealer' ? INNER : CLOTHES[look.clothes]
  const sleeve = mat(tones, (x) => (x >= 22 ? 2 : 1))
  const art = HELD[held]
  if (pose === 'up') {
    g.rows([[18, 21, 23], [19, 20, 24], [20, 20, 24], [21, 20, 23]], sleeve)
    g.rows([[15, 18, 20], [16, 18, 21], [17, 19, 22], [18, 19, 21]], sleeve)
    g.rows([[13, 17, 19], [14, 17, 19]], skinMat)
    if (art) {
      const smoke = heldKind(held) === 'smoke'
      // A cigarette sits at the corner of the mouth; a glass or a bite is held up to it
      const x = smoke ? 14 : 16 - art[0].length
      const y = smoke ? 12 : 14 - art.length + 1
      g.sprite(art, x, y, HELD_COLORS)
      g.set(17, 13, skinMat) // the fingers over the glass
    }
    return
  }
  g.rows([[18, 21, 23], [19, 21, 24], [20, 21, 24], [21, 21, 24], [22, 20, 24], [23, 18, 23], [24, 17, 21]], sleeve)
  g.rows([[24, 15, 17], [25, 15, 17]], skinMat)
  if (art) {
    const smoke = heldKind(held) === 'smoke'
    const x = smoke ? 15 - art[0].length + 2 : 16 - art[0].length
    const y = smoke ? 24 : 26 - art.length
    // Down in the hand, a cigarette points away from it, its lit end out to the left
    g.sprite(smoke ? art.map(row => [...row].reverse().join('')) : art, x, y, HELD_COLORS)
    g.set(15, 24, skinMat)
  }
}

// ---------- The pictures ----------

const cache = new Map()

function build (look, { pose = 'down', held = '', closed = false, part = 'all' }) {
  const skinMat = mat(SKINS[look.skin], (x) => (x >= 18 ? 2 : 1))
  const hairMat = mat(look.style === 'slick' ? HAIRS[0] : HAIRS[look.hair], (x, y) => (y <= 3 && x <= 12 ? 0 : x >= 18 ? 2 : 1))
  const dealer = look.outfit === 'dealer'
  const layers = []
  const has = (name) => part === 'all' || part === name

  // The chair's back, behind the shoulders
  if (has('chair') && !dealer) {
    const chair = new Grid()
    const wood = mat(WOOD, (x) => (x >= 22 ? 2 : 1))
    chair.rows([[11, 4, 23], [12, 3, 24], [13, 3, 24]], mat(LEATHER, (x) => (x >= 20 ? 2 : 1)))
    chair.rect(3, 14, 4, 29, wood)
    chair.rect(23, 14, 24, 29, wood)
    chair.set(3, 12, flat(BRASS[1]))
    chair.set(24, 12, flat(BRASS[1]))
    layers.push(paint(chair))
  }

  if (has('person')) {
    const body = new Grid()
    // The neck, in the shadow of the chin
    body.rect(12, 15, 15, 17, mat(SKINS[look.skin].map(c => shade(c, 0.12))))
    drawOutfit(body, look, skinMat)
    body.rows(HEAD, skinMat)
    body.set(7, 9, skinMat)
    body.set(7, 10, skinMat)
    body.set(20, 9, skinMat)
    body.set(20, 10, skinMat)
    drawHair(body, look.style, hairMat)
    if (look.style === 'cap') drawCap(body, hairMat, CLOTHES[look.accent])
    // A shadow under the hair across the forehead
    for (let x = 8; x <= 19; x++) {
      for (let y = 4; y <= 9; y++) {
        const cell = body.get(x, y)
        if (cell === skinMat && (body.get(x, y - 1) === hairMat || body.get(x, y - 1)?.tones === CLOTHES[look.accent])) {
          body.set(x, y, flat(SKINS[look.skin][2]))
          break
        }
      }
    }
    drawFace(body, look, closed, skinMat)
    drawFarArm(body, look, skinMat)
    layers.push(paint(body))
  }

  // The table's padded rail in front of them, with its brass trim
  if (has('rail') && !dealer) {
    const rail = new Grid()
    rail.rect(0, 26, W - 1, 28, mat(LEATHER, (x, y) => (y === 26 ? 0 : y >= 28 ? 2 : 1)))
    rail.span(29, 0, W - 1, mat(BRASS))
    layers.push(paint(rail))
  }

  if (has('arm')) {
    const arm = new Grid()
    drawNearArm(arm, look, skinMat, pose, held)
    layers.push(paint(arm))
  }
  return stack(layers)
}

/**
 * A picture of someone as an image URL, or one layer of it (part): 'chair', 'person', 'rail' (the
 * table's edge in front of them), 'arm' (the near arm, with what's in hand), or 'all'.
 */
export function avatarUrl (look, options = {}) {
  const key = JSON.stringify([look, options])
  if (!cache.has(key)) cache.set(key, toUrl(build(look, options)))
  return cache.get(key)
}
