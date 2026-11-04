// The people at the table, in pixel art: each player sits on a chair at the table's padded rail,
// and the dealer stands behind the cards. A look (skin, hair, eyes, clothes) comes from the
// player's id, so everyone at the table sees the same person for the same player.
//
// Each picture is drawn on a 40×44 grid in layers: the chair, the person, the rail in front of
// them, and the near arm with whatever they have in hand from the bar, once resting on the rail and
// once raised to the mouth. Parts are filled with materials of three tones (light, base, shadow)
// and shaded as if lit from the top left, and every layer gets a dark outline in its own colours,
// so the figures read round rather than flat. The table swaps the arm's two poses and the eyes to
// make someone sip a beer or draw on a cigarette (see SeatAvatar.vue).
//
// The grid, for drawing a new person (or tracing one from a picture in the same style):
//   head x 11..28, y 1..22, the eyes on rows 11..13, the mouth on row 18
//   neck y 22..25, shoulders y 25..27, the body down to the rail
//   the chair's back y 14..19 behind the shoulders; the rail y 38..43 in front of the body
//   the near arm's hand on the rail at x 22..25, y 33..37, or up at the mouth at x 23..27, y 16..21

export const W = 40
export const H = 44

// ---------- Colours ----------

const SKINS = [
  ['#ffe6cf', '#f7cba2', '#d8986a', '#b5764c'],
  ['#f7d3ae', '#e6ad7e', '#bb7a4c', '#955a33'],
  ['#e3ab7e', '#c48255', '#965a35', '#73401f'],
  ['#b88159', '#935d3a', '#6a3f23', '#4f2c16'],
  ['#8e5e3d', '#6e432a', '#4c2b18', '#371c0e']
]

const HAIRS = [
  ['#5f5068', '#30283a', '#18131f'], // black
  ['#b07a44', '#7a4b26', '#4f2d14'], // brown
  ['#fff3a8', '#efc84e', '#b88d22'], // blond
  ['#f7a265', '#d0602a', '#8e3a14'], // red
  ['#f2f2f6', '#c1c5cd', '#868b96'], // grey
  ['#ffc6e3', '#f07ab8', '#ac4280'], // pink
  ['#a8e0ff', '#4c9fe8', '#2a5fae'], // blue
  ['#c9a6ff', '#8a5ad6', '#55308f'] // purple
]

const EYES = ['#5a3a22', '#3d6fd1', '#3f9a4f', '#2b2b33', '#8a5a2b', '#6a8fa8']

const CLOTHES = [
  ['#ff8f85', '#e04848', '#a12a33'],
  ['#94d4ff', '#3f8fe0', '#24589c'],
  ['#acee8f', '#4cab52', '#2b6d3a'],
  ['#ffe27e', '#e8a92c', '#a86b14'],
  ['#ddb0ff', '#9b5cd6', '#61348c'],
  ['#a3f2e8', '#2fb3a6', '#1b6f6a'],
  ['#ffb8d4', '#e8659c', '#a33a69'],
  ['#ececf2', '#b8bcc8', '#7a7f8e'],
  ['#66707f', '#3b414d', '#22262e'],
  ['#ffc89f', '#f07b38', '#ab4b1b'],
  ['#8fa8ff', '#4458c8', '#283380'],
  ['#d7c19a', '#a68a5b', '#6d5733']
]

const INNER = ['#fffdf6', '#f1ead8', '#c9bea2']
const WOOD = ['#d9a066', '#9c6434', '#643a1a']
const LEATHER = ['#cf5e52', '#93322d', '#581918']
const BRASS = ['#fff4b0', '#e9c55a', '#a8801f']
const VEST = ['#545a68', '#2d313b', '#16181e']
const OUTLINE = '#21160f'
const LASH = '#24170f'
const SCLERA = '#fbf8f2'
const GLINT = '#ffffff'
const BLUSH = '#f39a8f'
const LIP = '#b8484a'
const MOUTH = '#7a2a2a'
const TEETH = '#fbf3e6'

// ---------- A grid of materials ----------

// A material: three tones, and optionally which tone a cell takes by where it is
const mat = (tones, toneAt = null) => ({ tones, toneAt })
// A cell of one fixed colour, left out of the shading
const flat = (color) => ({ color })
const mirror = (x) => W - 1 - x

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

  // Rows of [y, x0, x1] on the left, and the same on the right, mirrored
  both (list, cell) {
    for (const [y, x0, x1] of list) {
      this.span(y, x0, x1, cell)
      this.span(y, mirror(x1), mirror(x0), cell)
    }
  }

  // A point on the left, and its mirror
  pair (x, y, cell) {
    this.set(x, y, cell)
    this.set(mirror(x), y, cell)
  }

  // A thick line through points [x, y], round at the joints: an arm, a leg of a chair
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
  const part = (v) => Math.max(0, Math.min(255, Math.round(v * (1 - share)))).toString(16).padStart(2, '0')
  return `#${part(n >> 16)}${part((n >> 8) & 255)}${part(n & 255)}`
}

const darker = (tones, share) => tones.map(c => shade(c, share))

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

const HAIR_STYLES = ['short', 'long', 'bun', 'spiky', 'cap', 'bob', 'mohawk', 'curly', 'ponytail', 'side']
const OUTFITS = ['tee', 'vneck', 'jacket', 'stripes', 'hoodie', 'shirt']
const FACIAL = ['none', 'none', 'none', 'stubble', 'mustache', 'beard']

// The same number for the same text, everywhere
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
    eyes: pick('eyes', EYES.length),
    style: HAIR_STYLES[pick('style', HAIR_STYLES.length)],
    outfit: OUTFITS[pick('outfit', OUTFITS.length)],
    clothes: pick('clothes', CLOTHES.length),
    accent: pick('accent', CLOTHES.length),
    facial: FACIAL[pick('facial', FACIAL.length)],
    glasses: pick('glasses', 5) === 0,
    earring: pick('earring', 4) === 0
  }
}

export const DEALER_LOOK = Object.freeze({ skin: 1, hair: 0, eyes: 0, style: 'slick', outfit: 'dealer', clothes: 7, accent: 0, facial: 'mustache', glasses: false, earring: false })

// ---------- The head ----------

const HEAD = [
  [3, 15, 24], [4, 13, 26], [5, 12, 27],
  ...Array.from({ length: 12 }, (_, i) => [6 + i, 11, 28]),
  [18, 12, 27], [19, 12, 27], [20, 13, 26], [21, 14, 25], [22, 16, 23]
]

function drawHead (g, look, skin, closed) {
  const tones = SKINS[look.skin]
  g.rows(HEAD, skin)
  // Ears, with their inside in shadow
  g.both([[11, 9, 10], [12, 9, 10], [13, 9, 10], [14, 10, 10]], skin)
  g.pair(10, 12, flat(tones[2]))
  g.pair(10, 13, flat(tones[2]))
  if (look.earring) g.set(mirror(10), 15, flat(BRASS[1]))
  // The light on the left cheek, the shadow under the jaw
  g.rows([[13, 12, 13], [14, 12, 13]], flat(tones[0]))
  g.span(21, 15, 24, flat(tones[2]))
  // Eyebrows
  const brow = flat(look.style === 'slick' ? HAIRS[0][2] : HAIRS[look.hair][2])
  g.both([[9, 13, 16], [10, 12, 12]], brow)
  // Eyes: a lash line over white, a coloured iris with a glint, looking a little to the left
  const iris = EYES[look.eyes]
  if (closed) {
    g.both([[12, 13, 16]], flat(LASH))
    g.pair(12, 11, flat(LASH))
    g.pair(17, 11, flat(LASH))
  } else {
    g.both([[11, 13, 16]], flat(LASH))
    g.pair(12, 11, flat(LASH))
    for (const [x0, flip] of [[13, false], [23, true]]) {
      const col = (i) => (flip ? x0 + 3 - i : x0 + i)
      g.set(col(0), 12, flat(SCLERA))
      g.set(col(0), 13, flat(SCLERA))
      g.set(col(3), 12, flat(SCLERA))
      g.set(col(3), 13, flat(shade(SCLERA, 0.12)))
      g.set(x0 + 1, 12, flat(GLINT))
      g.set(x0 + 2, 12, flat(iris))
      g.set(x0 + 1, 13, flat(iris))
      g.set(x0 + 2, 13, flat(shade(iris, 0.45)))
    }
    g.both([[14, 14, 15]], flat(tones[2])) // the shadow under each eye
  }
  // The nose: a light on its bridge and a shadow under it
  g.set(19, 14, flat(tones[0]))
  g.set(19, 15, flat(tones[0]))
  g.set(20, 15, flat(tones[2]))
  g.rows([[16, 18, 20]], flat(tones[2]))
  g.set(19, 16, flat(tones[3]))
  // Cheeks
  g.both([[16, 12, 13]], flat(BLUSH))
  // The mouth: a smile with a glimpse of teeth, and the lower lip
  g.pair(16, 17, flat(MOUTH))
  g.span(18, 17, 22, flat(MOUTH))
  g.span(18, 18, 21, flat(TEETH))
  g.span(19, 18, 21, flat(LIP))
  g.set(18, 19, flat(shade(LIP, 0.2)))
}

function drawFacialHair (g, look) {
  const hair = HAIRS[look.style === 'slick' ? 0 : look.hair]
  if (look.facial === 'mustache') {
    g.rows([[17, 16, 23]], flat(hair[1]))
    g.pair(16, 18, flat(hair[1]))
    g.span(17, 18, 21, flat(hair[2]))
  } else if (look.facial === 'beard') {
    const beard = mat(hair, (x) => (x >= 24 ? 2 : 1))
    g.rows([[17, 15, 24], [20, 13, 26], [21, 14, 25], [22, 15, 24], [23, 17, 22]], beard)
    g.both([[18, 12, 16], [19, 12, 16], [14, 11, 11], [15, 11, 12], [16, 11, 13], [17, 12, 14]], beard)
    g.span(18, 17, 22, flat(MOUTH))
    g.span(19, 18, 21, flat(LIP))
  } else if (look.facial === 'stubble') {
    const dot = flat(shade(SKINS[look.skin][1], 0.22))
    for (let y = 17; y <= 21; y++) {
      for (let x = 13; x <= 26; x++) {
        if ((x + y) % 2 === 0 && g.get(x, y)?.tones && (y >= 20 || x <= 15 || x >= 24)) g.set(x, y, dot)
      }
    }
  }
}

function drawGlasses (g) {
  const rim = flat('#2a2a35')
  const lens = flat('#cfe8f5')
  for (const x0 of [12, 22]) {
    g.span(10, x0, x0 + 5, rim)
    g.span(14, x0, x0 + 5, rim)
    g.rect(x0, 11, x0, 13, rim)
    g.rect(x0 + 5, 11, x0 + 5, 13, rim)
  }
  g.span(11, 18, 21, rim)
  g.set(13, 11, lens) // a shine on each lens
  g.set(23, 11, lens)
}

// ---------- Hair ----------

// Hair is shaded in bands: a shine across the crown, strands darker towards the ends
const hairMaterial = (tones) => mat(tones, (x, y) => {
  if (y >= 4 && y <= 5 && x >= 13 && x <= 18) return 0
  if (x >= 25) return 2
  if (y >= 9 && (x % 3 === 0)) return 2
  return 1
})

// Long hair behind the shoulders goes in before the body
function drawHairBack (g, style, hair) {
  if (style === 'long') g.both([...Array.from({ length: 20 }, (_, i) => [8 + i, 7, 11])], hair)
  if (style === 'ponytail') g.limb([[30, 8], [33, 14], [33, 22], [31, 28]], 2.2, hair)
  if (style === 'curly') g.both([[16, 8, 11], [17, 8, 11], [18, 9, 11]], hair)
}

function drawHair (g, look, hair) {
  const style = look.style
  const crown = [[2, 15, 19], [3, 12, 19], [4, 11, 19], [5, 10, 19], [6, 10, 19], [7, 10, 19]]
  switch (style) {
    case 'long':
    case 'bob':
      g.both([[1, 15, 19], ...crown.slice(1), [8, 9, 12]], hair)
      g.rows([[8, 13, 17]], hair) // a fringe swept to one side
      g.both(Array.from({ length: style === 'bob' ? 11 : 14 }, (_, i) => [9 + i, 9, 11]), hair)
      if (style === 'bob') g.both([[20, 9, 13], [21, 10, 12]], hair)
      break
    case 'bun':
      g.both([[0, 17, 19], [1, 16, 19], ...crown, [8, 10, 11], [9, 10, 10]], hair)
      g.both([[2, 18, 19]], flat(HAIRS[look.hair][2])) // the band round the bun
      break
    case 'spiky':
      g.both([[0, 12, 12], [0, 16, 17], [1, 11, 13], [1, 15, 19], ...crown.slice(1), [8, 10, 11], [9, 10, 11], [10, 10, 10]], hair)
      g.rows([[8, 14, 15], [8, 19, 20], [8, 24, 25]], hair) // spikes over the forehead
      break
    case 'mohawk':
      g.rows([[0, 18, 21], [1, 17, 22], [2, 17, 22], [3, 17, 22], [4, 18, 21], [5, 18, 21], [6, 18, 21]], hair)
      g.both([[7, 11, 12], [8, 11, 11], [9, 11, 11]], flat(shade(SKINS[look.skin][1], 0.25))) // shaved sides
      break
    case 'curly':
      g.both([[0, 14, 16], [1, 12, 19], [2, 10, 19], [3, 9, 19], [4, 8, 19], [5, 8, 19], [6, 8, 19], [7, 8, 19], [8, 8, 13], [9, 8, 11], [10, 8, 11], [11, 8, 10], [12, 8, 10], [13, 8, 10], [14, 8, 10], [15, 9, 10]], hair)
      g.rows([[8, 16, 17], [8, 22, 23]], hair)
      for (let y = 1; y <= 14; y++) {
        for (let x = 8; x <= 31; x++) if ((x * 3 + y * 5) % 7 === 0 && g.get(x, y) === hair) g.set(x, y, flat(HAIRS[look.hair][2]))
      }
      break
    case 'ponytail':
      g.both([[1, 15, 19], ...crown.slice(1), [8, 10, 11], [9, 10, 10]], hair)
      g.rows([[8, 12, 16]], hair)
      g.set(29, 7, flat(BRASS[1])) // the tie
      break
    case 'side':
      g.both([[1, 16, 19], ...crown.slice(1), [8, 10, 11], [9, 10, 10]], hair)
      g.rows([[8, 12, 22], [9, 12, 18], [10, 12, 14]], hair) // a long fringe swept across
      break
    case 'cap': {
      g.both([[8, 10, 11], [9, 10, 11], [10, 10, 10]], hair)
      const tones = CLOTHES[look.accent]
      const cap = mat(tones, (x) => (x >= 25 ? 2 : 1))
      g.both([[1, 15, 19], [2, 13, 19], [3, 11, 19], [4, 10, 19], [5, 10, 19], [6, 10, 19]], cap)
      g.rows([[7, 8, 30]], mat(darker(tones, 0.25))) // the peak
      g.rows([[8, 9, 29]], flat(shade(tones[2], 0.4))) // its shadow on the forehead
      g.rect(18, 3, 21, 5, flat(INNER[1])) // a badge on the front
      g.set(19, 4, flat(tones[1]))
      g.set(19, 0, flat(tones[2]))
      g.set(20, 0, flat(tones[2]))
      break
    }
    case 'slick':
      g.both([[2, 15, 19], [3, 12, 19], [4, 11, 19], [5, 10, 19], [6, 10, 19], [7, 10, 11], [8, 10, 10], [9, 10, 10]], hair)
      g.rows([[7, 12, 17]], hair)
      g.set(16, 4, flat(HAIRS[0][0])) // the shine of the gel, and the parting
      g.set(17, 4, flat(HAIRS[0][0]))
      g.set(15, 5, flat(HAIRS[0][0]))
      g.rect(14, 2, 14, 6, flat(HAIRS[0][2]))
      break
    default: // short
      g.both([[1, 15, 19], ...crown.slice(1), [8, 10, 11], [9, 10, 11], [10, 10, 10]], hair)
      g.rows([[8, 13, 16], [8, 20, 21]], hair)
  }
}

// ---------- The body ----------

const TORSO = [[25, 14, 25], [26, 10, 29], [27, 8, 31], ...Array.from({ length: 16 }, (_, i) => [28 + i, 7, 32])]

function drawOutfit (g, look, skin) {
  const tones = CLOTHES[look.clothes]
  const accentTones = CLOTHES[look.accent === look.clothes ? (look.accent + 4) % CLOTHES.length : look.accent]
  // Round: the right of the body and its bottom in shadow, the left of the chest in the light
  const round = (x, y) => (x >= 27 || y >= 36 ? 2 : x <= 11 && y <= 31 ? 0 : 1)
  const fold = flat(tones[2]) // creases in the cloth
  if (look.outfit === 'dealer') {
    g.rows(TORSO, mat(INNER, round))
    const vest = mat(VEST, round)
    for (const [y, x0, x1] of TORSO) {
      if (y < 27) continue
      const open = Math.max(0, 34 - y) // the vest's V, narrowing down the chest
      g.span(y, x0, 19 - Math.ceil(open / 2), vest)
      g.span(y, 20 + Math.ceil(open / 2), x1, vest)
    }
    g.rows([[25, 16, 23], [26, 16, 23]], mat(INNER))
    g.both([[25, 16, 17], [26, 17, 17]], flat(INNER[2])) // collar points
    // A bow tie, with a knot
    g.rows([[25, 14, 17], [26, 14, 18], [27, 15, 17], [25, 22, 25], [26, 21, 25], [27, 22, 24]], flat('#d02c40'))
    g.rows([[25, 18, 21], [26, 19, 20], [27, 19, 20]], flat('#8e1626'))
    g.set(14, 25, flat('#ff6a7a'))
    for (const y of [32, 35]) g.set(19, y, flat(BRASS[1]))
    g.rows([[30, 24, 27]], flat(BRASS[1])) // a name badge
    g.rows([[31, 24, 27]], flat(INNER[1]))
    return
  }
  g.rows(TORSO, mat(tones, round))
  switch (look.outfit) {
    case 'vneck':
      g.rows([[25, 16, 23], [26, 17, 22], [27, 18, 21], [28, 19, 20]], skin)
      g.both([[26, 16, 16], [27, 17, 17], [28, 18, 18]], flat(tones[2]))
      break
    case 'jacket': {
      const inner = mat(accentTones, round)
      for (let y = 25; y <= 43; y++) g.span(y, 16, 23, inner)
      // Lapels
      const lapel = mat(darker(tones, 0.12))
      g.both([[25, 14, 15], [26, 14, 16], [27, 15, 17], [28, 15, 17], [29, 16, 17], [30, 16, 16]], lapel)
      g.both([[31, 15, 15], [32, 15, 15], [33, 15, 15], [34, 15, 15], [35, 15, 15], [36, 15, 15], [37, 15, 15]], flat(tones[2]))
      for (const y of [32, 35]) g.set(14, y, flat(BRASS[1]))
      g.rows([[30, 25, 28]], flat(accentTones[0])) // a pocket square
      g.rows([[31, 25, 28]], flat(tones[2]))
      break
    }
    case 'stripes':
      for (const y of [29, 32, 35, 38, 41]) g.span(y, 7, 32, mat(accentTones, round))
      g.rows([[25, 16, 23]], skin)
      g.both([[26, 16, 16]], flat(tones[2]))
      break
    case 'hoodie': {
      const hood = mat(darker(tones, 0.1), (x) => (x >= 26 ? 2 : 1))
      g.rows([[23, 13, 26], [24, 11, 28], [25, 10, 29]], hood)
      g.rows([[24, 16, 23], [25, 17, 22]], flat(shade(tones[2], 0.2))) // the hood's opening
      g.rect(16, 26, 16, 31, flat(INNER[1])) // drawstrings
      g.rect(23, 26, 23, 30, flat(INNER[1]))
      g.set(16, 32, flat(INNER[2]))
      g.set(23, 31, flat(INNER[2]))
      g.rows([[34, 12, 27], [35, 11, 28]], mat(darker(tones, 0.08))) // the front pocket
      g.span(34, 12, 27, fold)
      break
    }
    case 'shirt': {
      // A shirt with a collar, a button line and a pocket
      g.rows([[25, 16, 23]], skin)
      g.both([[25, 14, 16], [26, 14, 17], [27, 16, 18]], mat(darker(tones, -0.15)))
      g.rect(19, 27, 19, 43, flat(tones[2]))
      for (const y of [29, 32, 35]) g.set(20, y, flat(INNER[0]))
      g.rows([[30, 23, 27]], flat(tones[2]))
      g.rect(23, 31, 23, 33, flat(tones[2]))
      g.rect(27, 31, 27, 33, flat(tones[2]))
      break
    }
    default: { // tee, with a round collar and a print on the chest
      g.rows([[25, 16, 23]], skin)
      g.both([[25, 14, 15], [26, 15, 17]], flat(tones[2]))
      g.span(26, 18, 21, flat(tones[2]))
      g.rect(17, 30, 22, 33, flat(accentTones[1]))
      g.rect(18, 31, 21, 32, flat(accentTones[0]))
    }
  }
  // Creases where the arms meet the body
  g.rows([[33, 10, 11], [34, 11, 12], [33, 28, 29], [34, 27, 28]], fold)
}

// A hand, its fingers drawn in: knuckles in the light, the gaps between fingers in shadow
function drawHand (g, x, y, skin, tones, { flip = false } = {}) {
  g.rect(x, y, x + 3, y + 3, skin)
  g.set(flip ? x + 3 : x, y + 3, null)
  const gap = flat(tones[2])
  g.set(x + 1, y + 3, gap)
  g.set(x + 2, y + 3, gap)
  g.set(flip ? x : x + 3, y, flat(tones[0]))
}

function sleeveOf (look) {
  const tones = look.outfit === 'dealer' ? INNER : CLOTHES[look.clothes]
  return { tones, cuff: look.outfit === 'dealer' ? flat(INNER[2]) : flat(tones[2]) }
}

// The arm on the left (the player's right), resting with its hand on the rail
function drawFarArm (g, look, skin) {
  const { tones, cuff } = sleeveOf(look)
  g.limb([[9, 28], [7, 33], [9, 35]], 2.6, mat(tones, (x, y) => (y >= 33 ? 2 : 1)))
  g.set(10, 34, cuff)
  g.set(10, 35, cuff)
  g.set(10, 36, cuff)
  drawHand(g, 11, 34, skin, SKINS[look.skin])
}

// ---------- What's in hand ----------

// The bar's things as they look in a hand: letters are colours in HELD_COLORS. A cigarette's lit
// end is its last letter, so it can glow.
export const HELD = {
  beer: ['.WWWW...', 'WWwWWW..', 'shyyysSS', 'shyYys.S', 'shyyYs.S', 'shyyysSS', 'syyyys..', 'sSSSSs..'],
  wine: ['s...s', 'sRrRs', 'shRRs', '.sRs.', '..s..', '..s..', '..s..', '.sss.'],
  champagne: ['s.s', 'sys', 'hys', 'sys', 'sYs', '.s.', '.s.', '.s.', 'sss'],
  cocktail: ['spppeps', '.sppps.', '..sps..', '...s...', '...s...', '..sss..'],
  whiskey: ['s....s', 'sOOOOs', 'shOcOs', 'sOOOOs', 'ssssss'],
  raki: ['s..s', 'sWWs', 'shWs', 'sWWs', 'sWWs', 'sWWs', 'ssss'],
  tea: ['.saas.', '.haas.', '..aa..', '.saas.', 'YYYYYY'],
  coffee: ['WTTTW..', 'WWWWWWW', 'WwWWW.W', 'WWWWWWW', 'wWWWw..'],
  cola: ['gGGg', 'rrrr', 'rWWr', 'rrrr', 'hrrr', 'rrrr', 'gGGg'],
  cigarette: ['ooWWWWWWWf', 'OOwwwwwwwF'],
  cigar: ['TTTTTTTTYtf', 'tttttttttTF'],
  hookah: ['YGGGGGGG', 'YgggggggG'],
  burger: ['.ttWttt.', 'tWttttWt', 'eeeeeeee', 'yyyyyyyy', 'TTTTTTTT', 'tttttttt'],
  pizza: ['TTTTTTT', 'yyryyry', '.yyyry.', '..yry..', '...y...'],
  fries: ['y.yy.y.', 'yyyyyyy', 'yyyyyyy', 'rrrrrrr', 'rWrrWrr', 'rrrrrrr'],
  doner: ['eWeWe', 'TtTtT', 'WtttW', 'WWWWW', 'WwWwW', 'WWWWW', '.WWW.'],
  simit: ['..ttt..', '.tTtTt.', 'tt...tt', 'tt...tt', '.tTtTt.', '..ttt..'],
  nuts: ['OtOtOtO', 'sssssss', '.sssss.', '..sss..']
}

export const HELD_COLORS = {
  W: '#fffaf0',
  w: '#e3dccb',
  y: '#ffcc33',
  Y: '#d99a1a',
  s: '#d4ecf6',
  S: '#9fc3d4',
  h: '#ffffff',
  R: '#8e1730',
  r: '#d8343c',
  p: '#ff8fc0',
  e: '#5bbd4f',
  O: '#e08a2b',
  c: '#e8f8ff',
  a: '#a33a1c',
  T: '#5e3519',
  t: '#d0904e',
  o: '#e8a04a',
  f: '#ff6a1f', // the lit end
  F: '#c0341a',
  G: '#6a7280',
  g: '#4a505c'
}

/** What a player does with a thing from the bar: drink it, smoke it, eat it, or nothing. */
export function heldKind (id) {
  if (['cigarette', 'cigar', 'hookah'].includes(id)) return 'smoke'
  if (['burger', 'pizza', 'fries', 'doner', 'simit', 'nuts'].includes(id)) return 'eat'
  return HELD[id] ? 'drink' : ''
}

/** Whether a thing from the bar can be held. */
export const canHold = (id) => Object.hasOwn(HELD, id)

// Where the held thing goes, its top left on the grid, in each pose
function placeHeld (held, pose) {
  const art = HELD[held]
  const w = art[0].length
  const h = art.length
  const smoke = heldKind(held) === 'smoke'
  if (pose === 'up') {
    if (smoke) return { x: 21, y: 18, art } // from the corner of the mouth, out to the right
    if (heldKind(held) === 'eat') return { x: 24 - w, y: 19 - Math.ceil(h / 2), art }
    return { x: 24 - w, y: 16, art } // the rim at the lips
  }
  // Between draws a cigarette is held up in front of the chest, the elbow on the rail, its lit
  // end out to the left; anything else stands on the rail by the hand
  if (smoke) return { x: 23 - w, y: 29, art: art.map(row => [...row].reverse().join('')) }
  return { x: 24 - w, y: 38 - h, art }
}

/**
 * Where the lit end of a cigarette is, as a share of the picture (0..1) for each pose, so the
 * table can put the glow and the smoke on it; null for anything else.
 */
export function emberOf (held) {
  if (held !== 'cigarette' && held !== 'cigar') return null
  const at = (pose) => {
    const { x, y, art } = placeHeld(held, pose)
    const i = pose === 'up' ? art[0].length - 1 : 0
    return { x: (x + i + 0.5) / W, y: (y + 0.5) / H }
  }
  return { down: at('down'), up: at('up') }
}

/** Where the mouth is, as a share of the picture: smoke comes out of it. */
export const MOUTH_AT = Object.freeze({ x: 19.5 / W, y: 18.5 / H })

// The arm on the right (the player's left), with what it holds: down on the rail, or up at the
// mouth for a sip, a bite or a draw
function drawNearArm (g, look, skin, pose, held) {
  const { tones, cuff } = sleeveOf(look)
  const tonesSkin = SKINS[look.skin]
  const sleeve = mat(tones, (x) => (x >= 32 ? 2 : 1))
  const place = HELD[held] ? placeHeld(held, pose) : null
  if (pose === 'up') {
    const smoke = heldKind(held) === 'smoke'
    const wrist = smoke ? [27, 22] : [26, 23]
    g.limb([[30, 28], [32, 33]], 2.6, sleeve) // the upper arm, down to the elbow
    g.limb([[32, 33], wrist], 2.4, mat(tones, (x) => (x >= 30 ? 2 : 1))) // the forearm, up to the face
    g.rect(wrist[0] - 1, wrist[1] - 1, wrist[0] + 1, wrist[1], cuff)
    if (smoke) {
      // The cigarette held at the lips between two fingers, one over it and one under, the whole
      // of it in sight with its lit end out past the hand
      g.rect(24, 16, 27, 17, skin)
      g.rect(24, 20, 27, 20, skin)
      g.rect(26, 16, 28, 21, skin)
      g.set(24, 16, flat(tonesSkin[0]))
      g.set(28, 21, flat(tonesSkin[2]))
      g.set(27, 21, flat(tonesSkin[2]))
      if (place) g.sprite(place.art, place.x, place.y, HELD_COLORS)
    } else {
      if (place) g.sprite(place.art, place.x, place.y, HELD_COLORS)
      drawHand(g, 22, 18, skin, tonesSkin, { flip: true })
    }
    return
  }
  if (heldKind(held) === 'smoke') {
    g.limb([[30, 28], [32, 35], [27, 31]], 2.6, mat(tones, (x, y) => (y >= 34 ? 2 : x >= 32 ? 2 : 1)))
    g.rect(25, 29, 26, 31, cuff)
    if (place) g.sprite(place.art, place.x, place.y, HELD_COLORS)
    drawHand(g, 21, 28, skin, tonesSkin, { flip: true })
    g.set(21, 29, null) // the gap between the fingers it's held in
    g.set(21, 30, null)
    if (place) g.sprite(place.art.map(row => row.slice(-2)), place.x + place.art[0].length - 2, place.y, HELD_COLORS)
    return
  }
  g.limb([[30, 28], [32, 34], [27, 35]], 2.6, mat(tones, (x, y) => (y >= 33 ? 2 : x >= 32 ? 2 : 1)))
  g.set(26, 34, cuff)
  g.set(26, 35, cuff)
  g.set(26, 36, cuff)
  if (place) g.sprite(place.art, place.x, place.y, HELD_COLORS)
  drawHand(g, 22, 34, skin, tonesSkin, { flip: true })
}

// ---------- The pictures ----------

const cache = new Map()

function build (look, { pose = 'down', held = '', closed = false, part = 'all' }) {
  const skin = mat(SKINS[look.skin], (x) => (x >= 26 ? 2 : 1))
  const hairTones = look.style === 'slick' ? HAIRS[0] : HAIRS[look.hair]
  const hair = hairMaterial(hairTones)
  const dealer = look.outfit === 'dealer'
  const layers = []
  const has = (name) => part === 'all' || part === name

  // The chair's back, padded and studded, behind the shoulders
  if (has('chair') && !dealer) {
    const chair = new Grid()
    const wood = mat(WOOD, (x) => (x >= 35 || (x >= 5 && x <= 6) ? 2 : 1))
    chair.rect(3, 19, 6, 43, wood)
    chair.rect(33, 19, 36, 43, wood)
    const pad = mat(LEATHER, (x, y) => (y >= 18 || x >= 32 ? 2 : y <= 14 ? 0 : 1))
    chair.rows([[13, 5, 34], [14, 3, 36], [15, 2, 37], [16, 2, 37], [17, 2, 37], [18, 3, 36]], pad)
    for (let x = 5; x <= 34; x += 5) chair.set(x, 16, flat(BRASS[1]))
    chair.rows([[19, 3, 36]], mat(WOOD))
    layers.push(paint(chair))
  }

  if (has('person')) {
    const body = new Grid()
    drawHairBack(body, look.style, hair)
    // The neck, in the shadow of the chin
    body.rect(16, 21, 23, 26, mat(darker(SKINS[look.skin], 0.1), (x) => (x >= 22 ? 2 : 1)))
    body.span(22, 16, 23, flat(SKINS[look.skin][2]))
    drawOutfit(body, look, skin)
    drawHead(body, look, skin, closed)
    drawHair(body, look, hair)
    // A shadow under the hair across the forehead
    for (let x = 11; x <= 28; x++) {
      for (let y = 3; y <= 12; y++) {
        const cell = body.get(x, y)
        const above = body.get(x, y - 1)
        if (cell === skin && above && above !== skin && (above === hair || above.tones)) {
          body.set(x, y, flat(SKINS[look.skin][2]))
          break
        }
      }
    }
    drawFacialHair(body, look)
    if (look.glasses) drawGlasses(body)
    drawFarArm(body, look, skin)
    layers.push(paint(body))
  }

  // The table's padded rail in front of them, with studs and its brass trim
  if (has('rail') && !dealer) {
    const rail = new Grid()
    rail.rect(0, 38, W - 1, 42, mat(LEATHER, (x, y) => (y === 38 ? 0 : y >= 41 ? 2 : 1)))
    for (let x = 2; x < W; x += 6) rail.set(x, 40, flat(BRASS[2]))
    rail.span(43, 0, W - 1, mat(BRASS))
    layers.push(paint(rail))
  }

  if (has('arm')) {
    const arm = new Grid()
    drawNearArm(arm, look, skin, pose, held)
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

