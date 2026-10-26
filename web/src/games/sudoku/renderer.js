import { rowOf, colOf, boxOf } from './engine'
import { GREEN, DIM, LOW, GLOW, MONO, DISPLAY, JP, JP_PRINT, paint, drawSprite, drawText, drawGlyph } from '../ascii/paint'
import { drawBolt } from '../ascii/fx'
import { mulberry32 } from '../ascii/random'

// Draws Sudoku ASCII on a canvas that covers the whole play area, so lightning can come down
// from the top of the screen and fireworks can go up anywhere. The board sits wherever the
// page lays out its slot (setBoard). Positions in a scene are in cells from the board's
// top-left corner; effects off the board are just numbers outside 0-9.

export const KANJI = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']

// Highlights: the selected cell's row, column and box, and every cell holding its digit
const PEER_WASH = 'rgba(0, 255, 0, 0.1)'
const SAME_WASH = 'rgba(0, 255, 0, 0.26)'
const INK = '#000'

const digits = (make) => Array.from({ length: 10 }, (_, d) => (d ? make(d) : null))

// The cells a cursor at (x, y) covers, up to four while it glides between them
function under (x, y) {
  const cells = []
  for (let r = Math.floor(y); r <= Math.ceil(y) && r < 9; r++) {
    for (let c = Math.floor(x); c <= Math.ceil(x) && c < 9; c++) if (r >= 0 && c >= 0) cells.push(r * 9 + c)
  }
  return cells
}

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
  let sprites = null

  // Givens look printed: bold, smooth. Your own digits look typed: the pixel font. In an online
  // race the digits other players got are typed too, but dim.
  function build () {
    if (!cell) return
    const cw = cell * dpr
    const glow = Math.max(1.5, cell * 0.09) * dpr
    const glyph = (ch, color, { px, font = MONO, weight = 600, lit = true }) =>
      paint([ch], () => color, { cw, rh: px * dpr, glow: lit ? glow : 0, weight, font })
    const given = (d, color, lit) => (kanji
      ? glyph(KANJI[d], color, { px: cell * 0.56, font: JP_PRINT, weight: 700, lit })
      : glyph(String(d), color, { px: cell * 0.66, weight: 700, lit }))
    const typed = (d, color, lit) => (kanji
      ? glyph(KANJI[d], color, { px: cell * 0.6, font: JP, weight: 400, lit })
      : glyph(String(d), color, { px: cell * 0.86, font: DISPLAY, weight: 400, lit }))
    const note = (d, color, lit) => glyph(String(d), color, { px: cell * 0.27, lit })
    sprites = {
      given: digits(d => given(d, GREEN, true)),
      givenInk: digits(d => given(d, INK, false)),
      typed: digits(d => typed(d, GREEN, true)),
      typedInk: digits(d => typed(d, INK, false)),
      theirs: digits(d => typed(d, DIM, false)),
      note: digits(d => note(d, DIM, false)),
      noteLit: digits(d => note(d, GREEN, true)),
      noteInk: digits(d => note(d, INK, false)),
      // A wrong digit's cell is hatched, like a wall cut through on a plan
      hatch: paint(['/////', '/////', '/////'], () => LOW, { cw: cw / 5, rh: cw / 3, glow: 0, weight: 400 }),
      open: glyph('[', GREEN, { px: cell * 0.7 }),
      close: glyph(']', GREEN, { px: cell * 0.7 }),
      stamp: stamp()
    }
  }

  // A hanko seal reading 完, "complete": a double frame and the character, with the ink worn
  // away in flecks the way a real stamp prints
  function stamp () {
    const side = Math.ceil(cell * 3.6 * dpr)
    const pad = Math.ceil(cell * 0.8 * dpr)
    const image = document.createElement('canvas')
    image.width = image.height = side + pad * 2
    const g = image.getContext('2d')
    g.translate(pad, pad)
    g.shadowColor = GLOW
    g.shadowBlur = cell * 0.35 * dpr
    g.strokeStyle = GREEN
    g.fillStyle = GREEN
    const thick = cell * 0.17 * dpr
    g.lineWidth = thick
    g.strokeRect(thick / 2, thick / 2, side - thick, side - thick)
    const inset = cell * 0.36 * dpr
    g.lineWidth = cell * 0.05 * dpr
    g.strokeRect(inset, inset, side - inset * 2, side - inset * 2)
    g.font = `700 ${side * 0.6}px ${JP_PRINT}`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('完', side / 2, side / 2 + side * 0.03)
    g.globalCompositeOperation = 'destination-out'
    g.shadowBlur = 0
    const random = mulberry32(9)
    for (let n = 0; n < 160; n++) {
      g.beginPath()
      g.arc(random() * side, random() * side, (0.2 + random()) * cell * 0.045 * dpr, 0, Math.PI * 2)
      g.fill()
    }
    return { canvas: image, cx: image.width / 2, cy: image.height / 2 }
  }

  // Cell edges snap to whole device pixels, so lines and fills meet exactly
  const edgeX = (k) => Math.round((bx + k * cell) * dpr) / dpr
  const edgeY = (k) => Math.round((by + k * cell) * dpr) / dpr
  const X = (x) => bx + x * cell
  const Y = (y) => by + y * cell

  function fillCell (i, style) {
    const r = rowOf(i)
    const c = colOf(i)
    ctx.fillStyle = style
    ctx.fillRect(edgeX(c), edgeY(r), edgeX(c + 1) - edgeX(c), edgeY(r + 1) - edgeY(r))
  }

  function grid () {
    const thin = Math.max(1, Math.round(dpr)) / dpr
    const thick = Math.max(2, Math.round(cell * 0.06 * dpr)) / dpr
    ctx.fillStyle = LOW
    for (let k = 1; k < 9; k++) {
      if (k % 3 === 0) continue
      ctx.fillRect(edgeX(k) - thin / 2, by, thin, size)
      ctx.fillRect(bx, edgeY(k) - thin / 2, size, thin)
    }
    ctx.save()
    ctx.shadowColor = GLOW
    ctx.shadowBlur = cell * 0.3 * dpr
    ctx.fillStyle = GREEN
    for (let k = 0; k <= 9; k += 3) {
      ctx.fillRect(edgeX(k) - thick / 2, by - thick / 2, thick, size + thick)
      ctx.fillRect(bx - thick / 2, edgeY(k) - thick / 2, size + thick, thick)
    }
    ctx.restore()
  }

  // The digit or pencil marks in one cell; `ink` draws them black, for under the cursor
  function contents (scene, i, ink) {
    const { values, givens, notes } = scene.board
    if (scene.reveal[i] > 0) return
    const x = X(colOf(i) + 0.5)
    const y = Y(rowOf(i) + 0.5)
    if (scene.decode[i] > 0) {
      drawGlyph(ctx, scene.glitches[i], x, y, { px: cell * 0.6, font: JP, weight: 400, color: ink ? INK : GREEN })
      return
    }
    const d = values[i]
    if (d) {
      const set = givens[i]
        ? (ink ? sprites.givenInk : sprites.given)
        : (ink ? sprites.typedInk : scene.theirs?.[i] ? sprites.theirs : sprites.typed)
      const faded = scene.marks[i] & 1 && !scene.blink
      drawSprite(ctx, set[d], x, y, { scale: scene.pops[i] || 1, alpha: faded ? 0.35 : 1, dpr })
      if (!ink && scene.glow[i] > 0) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        drawSprite(ctx, set[d], x, y, { scale: scene.pops[i] || 1, alpha: scene.glow[i], dpr })
        ctx.restore()
      }
      if (!ink && scene.marks[i] & 2 && scene.blink) {
        drawSprite(ctx, sprites.open, x - cell * 0.34, y, { dpr })
        drawSprite(ctx, sprites.close, x + cell * 0.34, y, { dpr })
      }
      return
    }
    const mask = notes[i]
    if (!mask) return
    for (let n = 1; n <= 9; n++) {
      if (!(mask & (1 << n))) continue
      const set = ink ? sprites.noteInk : n === scene.focus ? sprites.noteLit : sprites.note
      drawSprite(ctx, set[n], x + (((n - 1) % 3) - 1) * cell * 0.3, y + (Math.floor((n - 1) / 3) - 1) * cell * 0.3, { dpr })
    }
  }

  function board (scene) {
    const { values } = scene.board
    ctx.fillStyle = '#000'
    ctx.fillRect(bx, by, size, size)
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
        if (scene.marks[i] & 1) {
          const { canvas: image, pad } = sprites.hatch
          ctx.globalAlpha = 0.9
          ctx.drawImage(image, pad, pad, image.width - pad * 2, image.height - pad * 2, edgeX(colOf(i)), edgeY(rowOf(i)), cell, cell)
          ctx.globalAlpha = 1
        }
        if (scene.glow[i] > 0) fillCell(i, `rgba(0, 255, 0, ${0.45 * scene.glow[i]})`)
      }
    }
    for (const p of scene.drift) particle(p, 0.45)
    const cursor = !scene.hidden && scene.cursor
    if (cursor) {
      ctx.fillStyle = GREEN
      ctx.fillRect(X(cursor.x), Y(cursor.y), cell, cell)
    }
    grid()
    if (scene.hidden || scene.debris) return
    for (let i = 0; i < 81; i++) contents(scene, i, false)
    if (cursor) {
      // The cursor is an inverted block, so whatever it covers shows through in black
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
    drawGlyph(ctx, p.ch, X(p.x), Y(p.y), { px: cell * (p.size || 0.42), color: p.color, alpha, angle: p.angle || 0, font: p.font })
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
    if (!sprites || !size) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.save()
    if (scene.shake > 0) ctx.translate((Math.random() * 2 - 1) * scene.shake * cell * 0.22, (Math.random() * 2 - 1) * scene.shake * cell * 0.22)
    board(scene)
    if (scene.debris) {
      for (const piece of scene.debris) {
        const set = piece.given ? sprites.given : sprites.typed
        drawSprite(ctx, set[piece.d], X(piece.x), Y(piece.y), { angle: piece.angle, alpha: piece.alpha ?? 1, dpr })
      }
    }
    for (const p of scene.particles) particle(p)
    for (const bolt of scene.bolts) drawBolt(ctx, bolt.glyphs, { px: cell * 0.5, alpha: bolt.alpha, dpr, toX: X, toY: Y })
    if (scene.stamp) drawSprite(ctx, sprites.stamp, X(4.5), Y(4.5), { angle: -0.16, scale: scene.stamp.scale, alpha: scene.stamp.alpha, dpr })
    ctx.restore()

    for (const item of scene.texts) {
      drawText(ctx, item.text, X(item.x ?? 4.5), Y(item.y), { px: Math.max(item.min || 0, item.size * cell), dpr, ...item })
    }
    if (scene.flash > 0) {
      ctx.fillStyle = `rgba(0, 255, 0, ${0.22 * scene.flash})`
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
      const changed = boardSize !== size
      bx = Math.round(x * dpr) / dpr
      by = Math.round(y * dpr) / dpr
      size = boardSize
      cell = size / 9
      if (changed || !sprites) build()
    },
    setKanji (on) {
      if (on === kanji) return
      kanji = on
      build()
    },
    // The edges of the canvas in cells, for effects that start off the board
    bounds: () => (cell ? { left: -bx / cell, top: -by / cell, right: (width - bx) / cell, bottom: (height - by) / cell } : { left: 0, top: -1, right: 9, bottom: 10 }),
    // Fonts that finish loading later need the sprites painted again
    rebuild: build,
    draw
  }
}
