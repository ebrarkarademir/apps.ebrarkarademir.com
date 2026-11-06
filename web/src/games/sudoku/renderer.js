import { rowOf, colOf, boxOf } from './engine'
import { GREEN, DIM, JP } from '../ascii/paint'
import { PAL, FONT_PIXEL, pixelText, pixelBit, pixelBolt, inkOf } from '../../pixel/kit'

// Draws Sudoku as a pixel-art board on a canvas that covers the whole play area, so lightning
// can come down from the top of the screen and fireworks can go up anywhere. The board sits
// wherever the page lays out its slot (setBoard). Positions in a scene are in cells from the
// board's top-left corner; effects off the board are just numbers outside 0-9.
//
// The board is a panel of night-blue cells, every other box a shade lighter, with dark lines
// between them. Givens are white, your own digits sky blue, other players' slate. The cursor is
// a gold block. Digits are Press Start 2P; in kanji mode, the dot-matrix DotGothic16.

export const KANJI = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']

const CELL = '#2a3050'
const CELL_ALT = '#363f63'
const PEER_WASH = 'rgba(65, 166, 246, 0.2)'
const SAME_WASH = 'rgba(255, 205, 117, 0.3)'
const INK = PAL.K

// The cells a cursor at (x, y) covers, up to four while it glides between them
function under (x, y) {
  const cells = []
  for (let r = Math.floor(y); r <= Math.ceil(y) && r < 9; r++) {
    for (let c = Math.floor(x); c <= Math.ceil(x) && c < 9; c++) if (r >= 0 && c >= 0) cells.push(r * 9 + c)
  }
  return cells
}

// Sakura petals and sparks: pink and white for the petals, gold and sky for the rest
const PETAL_INK = { [GREEN]: '#ffb3d9', [DIM]: '#f4f4f4' }

export function createRenderer (canvas) {
  const ctx = canvas.getContext('2d')
  let width = 0
  let height = 0
  let dpr = 1
  let bx = 0 // the board's top-left corner and size, in CSS pixels
  let by = 0
  let size = 0
  let cell = 0
  let kanji = false
  let hatch = null // a pattern

  // A wrong digit's cell: red, with pixel stripes across it
  function build () {
    if (!cell) return
    const n = Math.max(4, Math.round(cell / 3))
    hatch = document.createElement('canvas')
    hatch.width = hatch.height = n
    const g = hatch.getContext('2d')
    g.fillStyle = 'rgba(177, 62, 83, 0.55)'
    g.fillRect(0, 0, n, n)
    g.fillStyle = 'rgba(177, 62, 83, 0.9)'
    for (let i = 0; i < n; i++) g.fillRect((i + Math.floor(n / 2)) % n, i, Math.max(1, Math.round(n / 4)), 1)
    hatch = ctx.createPattern(hatch, 'repeat')
  }

  // Cell edges snap to whole device pixels, so lines and fills meet exactly
  const edgeX = (k) => Math.round((bx + k * cell) * dpr) / dpr
  const edgeY = (k) => Math.round((by + k * cell) * dpr) / dpr
  const X = (x) => bx + x * cell
  const Y = (y) => by + y * cell
  const px = () => Math.max(2, Math.round(cell * 0.06))

  function fillCell (i, style) {
    const r = rowOf(i)
    const c = colOf(i)
    ctx.fillStyle = style
    ctx.fillRect(edgeX(c), edgeY(r), edgeX(c + 1) - edgeX(c), edgeY(r + 1) - edgeY(r))
  }

  function lines () {
    const thin = Math.max(1, Math.round(cell * 0.03))
    const thick = px()
    ctx.fillStyle = PAL.K
    for (let k = 1; k < 9; k++) {
      if (k % 3 === 0) continue
      ctx.fillRect(edgeX(k) - thin / 2, by, thin, size)
      ctx.fillRect(bx, edgeY(k) - thin / 2, size, thin)
    }
    ctx.fillStyle = PAL.k
    for (let k = 0; k <= 9; k += 3) {
      ctx.fillRect(edgeX(k) - thick / 2, by - thick / 2, thick, size + thick)
      ctx.fillRect(bx - thick / 2, edgeY(k) - thick / 2, size + thick, thick)
    }
  }

  // A digit centered in a cell: Press Start 2P, or a kanji in the dot-matrix font
  function digit (d, x, y, { color, scale = 1, alpha = 1, small = false }) {
    const str = kanji ? KANJI[d] : String(d)
    const fontPx = Math.round(cell * (small ? 0.24 : kanji ? 0.62 : 0.46) * scale)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.font = `${fontPx}px ${kanji ? JP : FONT_PIXEL}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (!small && color !== INK) {
      ctx.fillStyle = 'rgba(16, 17, 29, 0.7)'
      ctx.fillText(str, x + Math.max(1, fontPx / 10), y + Math.max(1, fontPx / 10) + 1)
    }
    ctx.fillStyle = color
    ctx.fillText(str, x, y + (kanji ? 0 : 1))
    ctx.restore()
  }

  // The digit or pencil marks in one cell; `ink` draws them dark, for under the cursor
  function contents (scene, i, ink) {
    const { values, givens, notes } = scene.board
    if (scene.reveal[i] > 0) return
    const x = X(colOf(i) + 0.5)
    const y = Y(rowOf(i) + 0.5)
    if (scene.decode[i] > 0) {
      ctx.save()
      ctx.font = `${Math.round(cell * 0.56)}px ${JP}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = ink ? INK : PAL.l
      ctx.fillText(scene.glitches[i], x, y)
      ctx.restore()
      return
    }
    const d = values[i]
    if (d) {
      const color = ink ? INK : givens[i] ? PAL.w : scene.theirs?.[i] ? PAL.s : PAL.c
      const faded = scene.marks[i] & 1 && !scene.blink
      digit(d, x, y, { color, scale: scene.pops[i] || 1, alpha: faded ? 0.35 : 1 })
      if (!ink && scene.glow[i] > 0) digit(d, x, y, { color: PAL.l, scale: scene.pops[i] || 1, alpha: scene.glow[i] })
      // A digit that clashes with a wrong one: red corners round it
      if (!ink && scene.marks[i] & 2 && scene.blink) {
        const s = px()
        const l = Math.round(cell * 0.22)
        const x0 = edgeX(colOf(i)) + s
        const y0 = edgeY(rowOf(i)) + s
        const x1 = edgeX(colOf(i) + 1) - s * 2
        const y1 = edgeY(rowOf(i) + 1) - s * 2
        ctx.fillStyle = PAL.r
        for (const [cx, cy, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
          ctx.fillRect(dx > 0 ? cx : cx - l + s, cy, l, s)
          ctx.fillRect(cx, dy > 0 ? cy : cy - l + s, s, l)
        }
      }
      return
    }
    const mask = notes[i]
    if (!mask) return
    for (let n = 1; n <= 9; n++) {
      if (!(mask & (1 << n))) continue
      const color = ink ? INK : n === scene.focus ? PAL.y : PAL.g
      digit(n, x + (((n - 1) % 3) - 1) * cell * 0.3, y + (Math.floor((n - 1) / 3) - 1) * cell * 0.3, { color, small: true })
    }
  }

  function board (scene) {
    const { values } = scene.board
    // A frame round the board, and the cells, box by box
    const edge = px() * 2
    ctx.fillStyle = PAL.k
    ctx.fillRect(bx - edge, by - edge, size + edge * 2, size + edge * 2)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
    ctx.fillRect(bx - edge, by + size + edge, size + edge * 2, edge)
    for (let i = 0; i < 81; i++) {
      const b = boxOf(i)
      fillCell(i, (Math.floor(b / 3) + b) % 2 ? CELL_ALT : CELL)
    }
    const selected = scene.selected
    if (selected >= 0 && !scene.hidden) {
      for (let i = 0; i < 81; i++) {
        if (i === selected) continue
        if (scene.focus && values[i] === scene.focus && !scene.debris) fillCell(i, SAME_WASH)
        else if (rowOf(i) === rowOf(selected) || colOf(i) === colOf(selected) || boxOf(i) === boxOf(selected)) fillCell(i, PEER_WASH)
      }
    }
    if (!scene.hidden && !scene.debris) {
      for (let i = 0; i < 81; i++) {
        if (scene.marks[i] & 1 && hatch) fillCell(i, hatch)
        if (scene.glow[i] > 0) fillCell(i, `rgba(167, 240, 112, ${0.4 * scene.glow[i]})`)
      }
    }
    for (const p of scene.drift) particle(p, 0.45)
    const cursor = !scene.hidden && scene.cursor
    if (cursor) {
      ctx.fillStyle = PAL.y
      ctx.fillRect(X(cursor.x), Y(cursor.y), cell, cell)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
      ctx.fillRect(X(cursor.x), Y(cursor.y), cell, px())
      ctx.fillStyle = 'rgba(150, 70, 20, 0.45)'
      ctx.fillRect(X(cursor.x), Y(cursor.y) + cell - px(), cell, px())
    }
    lines()
    if (scene.hidden || scene.debris) return
    for (let i = 0; i < 81; i++) contents(scene, i, false)
    if (cursor) {
      // Whatever the cursor covers shows through it in dark ink
      ctx.save()
      ctx.beginPath()
      ctx.rect(X(cursor.x), Y(cursor.y), cell, cell)
      ctx.clip()
      for (const i of under(cursor.x, cursor.y)) contents(scene, i, true)
      ctx.restore()
    }
  }

  function particle (p, strength = 1) {
    let alpha = Math.max(0, Math.min(1, p.life / p.ttl)) * strength
    if (p.twinkle && p.life < p.ttl * 0.6) alpha *= 0.4 + Math.random() * 0.6
    const petalish = p.spin !== undefined
    pixelBit(ctx, p.ch, X(p.x), Y(p.y), cell * (p.size || 0.42) * 0.22, inkOf(p.color, petalish ? PETAL_INK : null), alpha)
  }

  // The seal that says it's done: a red pixel frame with 完, "complete", tilted a little
  function stamp ({ scale, alpha }) {
    const side = cell * 3.4 * scale
    const s = Math.max(2, Math.round(cell * 0.12 * scale))
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(X(4.5), Y(4.5))
    ctx.rotate(-0.16)
    ctx.fillStyle = 'rgba(244, 244, 244, 0.9)'
    ctx.fillRect(-side / 2, -side / 2, side, side)
    ctx.fillStyle = PAL.r
    ctx.fillRect(-side / 2, -side / 2, side, s)
    ctx.fillRect(-side / 2, side / 2 - s, side, s)
    ctx.fillRect(-side / 2, -side / 2, s, side)
    ctx.fillRect(side / 2 - s, -side / 2, s, side)
    const inset = s * 2.5
    ctx.fillRect(-side / 2 + inset, -side / 2 + inset, side - inset * 2, Math.max(1, s / 2))
    ctx.fillRect(-side / 2 + inset, side / 2 - inset, side - inset * 2, Math.max(1, s / 2))
    ctx.font = `${Math.round(side * 0.55)}px ${JP}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('完', 0, side * 0.03)
    ctx.restore()
  }

  /**
   * scene: {
   *   board: { values, givens, notes }, marks (1 wrong, 2 clashes with a wrong digit),
   *   theirs (online: 1 where another player got the digit), selected,
   *   cursor: { x, y } | null, focus (digit to highlight), hidden, blink,
   *   pops, glow, reveal, decode, glitches (per cell), drift, particles,
   *   bolts: [{ glyphs, alpha }], stamp: { scale, alpha } | null, debris: [{ d, given, x, y, angle }] | null,
   *   texts: [{ text, x, y, size, display, color, alpha }], flash, shake
   * }
   */
  function draw (scene) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!size) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = false

    ctx.save()
    if (scene.shake > 0) ctx.translate(Math.round((Math.random() * 2 - 1) * scene.shake * cell * 0.22), Math.round((Math.random() * 2 - 1) * scene.shake * cell * 0.22))
    board(scene)
    if (scene.debris) {
      for (const piece of scene.debris) {
        ctx.save()
        ctx.translate(X(piece.x), Y(piece.y))
        ctx.rotate(piece.angle)
        digit(piece.d, 0, 0, { color: piece.given ? PAL.w : PAL.c, alpha: piece.alpha ?? 1 })
        ctx.restore()
      }
    }
    for (const p of scene.particles) particle(p)
    for (const bolt of scene.bolts) pixelBolt(ctx, bolt.glyphs, { size: cell * 0.14, alpha: bolt.alpha, toX: X, toY: Y })
    if (scene.stamp) stamp(scene.stamp)
    ctx.restore()

    for (const item of scene.texts) {
      const fontPx = Math.max((item.min || 0) * 0.7, item.size * cell * (item.display ? 0.55 : 0.62))
      pixelText(ctx, item.text, X(item.x ?? 4.5), Y(item.y), { px: fontPx, color: inkOf(item.color === GREEN || !item.color ? PAL.w : item.color), alpha: item.alpha ?? 1 })
    }
    if (scene.flash > 0) {
      ctx.fillStyle = `rgba(255, 205, 117, ${0.25 * scene.flash})`
      ctx.fillRect(0, 0, width, height)
    }
  }

  return {
    resize (cssWidth, cssHeight, pixelRatio) {
      width = cssWidth
      height = cssHeight
      dpr = pixelRatio
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      build()
    },
    // Where the board is on the canvas, in CSS pixels
    setBoard (x, y, boardSize) {
      bx = Math.round(x * dpr) / dpr
      by = Math.round(y * dpr) / dpr
      size = boardSize
      cell = size / 9
      build()
    },
    setKanji (on) {
      kanji = on
    },
    // The edges of the canvas in cells, for effects that start off the board
    bounds: () => (cell ? { left: -bx / cell, top: -by / cell, right: (width - bx) / cell, bottom: (height - by) / cell } : { left: 0, top: -1, right: 9, bottom: 10 }),
    // Digits are drawn fresh every frame, so a font that loads later needs nothing done
    rebuild () {},
    draw
  }
}
