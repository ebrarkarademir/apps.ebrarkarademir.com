import { colorOf } from './engine'
import { GREEN, DIM, LOW, GLOW, MONO, paint, drawSprite, drawText, drawGlyph } from '../ascii/paint'
import { drawBolt } from '../ascii/fx'

// Draws Chess ASCII on a canvas that covers the whole play area, so lightning can come down
// from the top of the screen and fireworks can go up anywhere. The board sits wherever the
// page lays out its slot (setBoard). Positions in a scene are in squares on screen, from the
// board's top-left corner, whichever way round it is; effects off the board are just numbers
// outside 0-8.
//
// The pieces are their letters: White's lit up, Black's black with a lit outline.

const PIECES = 'PNBRQKpnbrqk'
const INK = '#000'
const DARK = 'rgba(0, 255, 0, 0.13)'
const LAST_WASH = 'rgba(0, 255, 0, 0.2)'

export function createRenderer (canvas) {
  const ctx = canvas.getContext('2d')
  let width = 0
  let height = 0
  let dpr = 1
  let bx = 0 // the board's top-left corner and size, in CSS pixels
  let by = 0
  let size = 0
  let cell = 0
  let sprites = null

  // One piece letter: White's filled, Black's an outline round black. `ink` is for the
  // selected square, a lit block: White's letter black, Black's outline black.
  function piece (ch, { ink = false } = {}) {
    const px = cell * 0.74
    const white = colorOf(ch) === 'w'
    const glow = ink ? 0 : Math.max(1.5, cell * 0.08) * dpr
    const pad = Math.ceil(glow * 2) + 2
    const side = Math.ceil(cell * dpr)
    const image = document.createElement('canvas')
    image.width = image.height = side + pad * 2
    const g = image.getContext('2d')
    g.font = `700 ${px * dpr}px ${MONO}`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.lineJoin = 'round'
    const x = image.width / 2
    const y = image.height / 2 + px * dpr * 0.04
    const letter = ch.toUpperCase()
    if (glow) {
      g.shadowColor = GLOW
      g.shadowBlur = glow
    }
    if (white) {
      g.fillStyle = ink ? INK : GREEN
      g.fillText(letter, x, y)
    } else {
      g.lineWidth = Math.max(1.5, px * 0.075) * dpr
      g.strokeStyle = ink ? INK : GREEN
      g.strokeText(letter, x, y)
      g.shadowBlur = 0
      g.fillStyle = ink ? GREEN : INK
      g.fillText(letter, x, y)
    }
    return { canvas: image, cx: image.width / 2, cy: image.height / 2 }
  }

  function build () {
    if (!cell) return
    const cw = cell * dpr
    const glyph = (ch, color, px, lit = true) => paint([ch], () => color, { cw, rh: px * dpr, glow: lit ? Math.max(1.5, cell * 0.08) * dpr : 0, weight: 700 })
    sprites = {
      piece: Object.fromEntries([...PIECES].map(ch => [ch, piece(ch)])),
      ink: Object.fromEntries([...PIECES].map(ch => [ch, piece(ch, { ink: true })])),
      // Where the selected piece can go: a dot on an empty square, brackets round a capture
      dot: glyph('•', DIM, cell * 0.5, false),
      open: glyph('[', GREEN, cell * 0.8),
      close: glyph(']', GREEN, cell * 0.8),
      // A dark square: phosphor dots, so the board reads like a screen of characters
      grain: paint(['. . ', ' . .', '. . ', ' . .'], () => LOW, { cw: cw / 4, rh: cw / 4, glow: 0, weight: 400 })
    }
  }

  // Square edges snap to whole device pixels, so fills meet exactly
  const edgeX = (k) => Math.round((bx + k * cell) * dpr) / dpr
  const edgeY = (k) => Math.round((by + k * cell) * dpr) / dpr
  const X = (x) => bx + x * cell
  const Y = (y) => by + y * cell

  function fill (x, y, style) {
    ctx.fillStyle = style
    ctx.fillRect(edgeX(x), edgeY(y), edgeX(x + 1) - edgeX(x), edgeY(y + 1) - edgeY(y))
  }

  function squares (scene) {
    ctx.fillStyle = '#000'
    ctx.fillRect(bx, by, size, size)
    const { canvas: grain, pad } = sprites.grain
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if ((x + y) % 2 === 0) continue
        fill(x, y, DARK)
        ctx.globalAlpha = 0.55
        ctx.drawImage(grain, pad, pad, grain.width - pad * 2, grain.height - pad * 2, edgeX(x), edgeY(y), cell, cell)
        ctx.globalAlpha = 1
      }
    }
    for (const at of scene.lastMove || []) fill(at.x, at.y, LAST_WASH)
    if (scene.check && scene.blink) fill(scene.check.x, scene.check.y, 'rgba(0, 255, 0, 0.42)')
    if (scene.selected) fill(scene.selected.x, scene.selected.y, GREEN)
  }

  function frame () {
    const thick = Math.max(2, Math.round(cell * 0.05 * dpr)) / dpr
    ctx.save()
    ctx.shadowColor = GLOW
    ctx.shadowBlur = cell * 0.3 * dpr
    ctx.strokeStyle = GREEN
    ctx.lineWidth = thick
    ctx.strokeRect(bx - thick / 2, by - thick / 2, size + thick, size + thick)
    ctx.restore()
  }

  // Files along the bottom row and ranks up the left column, inside the corner of each square
  function coordinates (scene) {
    const px = Math.max(8, cell * 0.2)
    ctx.save()
    ctx.font = `600 ${px}px ${MONO}`
    ctx.fillStyle = DIM
    ctx.textBaseline = 'alphabetic'
    for (let k = 0; k < 8; k++) {
      ctx.textAlign = 'right'
      ctx.fillText(scene.files[k], X(k + 1) - cell * 0.07, Y(8) - cell * 0.07)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(scene.ranks[k], X(0) + cell * 0.07, Y(k) + cell * 0.06)
      ctx.textBaseline = 'alphabetic'
    }
    ctx.restore()
  }

  function pieces (scene) {
    const { board, selected } = scene
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const sq = scene.squareAt(x, y)
        const ch = board[sq]
        if (!ch || scene.hidden.has(sq) || scene.reveal[sq] > 0) continue
        const cx = X(x + 0.5)
        const cy = Y(y + 0.5)
        if (scene.decode[sq] > 0) {
          drawGlyph(ctx, scene.glitches[sq] || ch.toUpperCase(), cx, cy, { px: cell * 0.74, weight: 700, color: GREEN })
          continue
        }
        const isSelected = selected && selected.x === x && selected.y === y
        const set = isSelected ? sprites.ink : sprites.piece
        const scale = scene.pops[sq] || 1
        const alpha = scene.ghost === sq ? 0.3 : 1
        drawSprite(ctx, set[ch], cx, cy, { scale, alpha, dpr })
        if (!isSelected && scene.glow[sq] > 0) {
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          drawSprite(ctx, set[ch], cx, cy, { scale, alpha: scene.glow[sq] * alpha, dpr })
          ctx.restore()
        }
      }
    }
  }

  function targets (scene) {
    for (const target of scene.targets) {
      const cx = X(target.x + 0.5)
      const cy = Y(target.y + 0.5)
      if (target.capture) {
        drawSprite(ctx, sprites.open, cx - cell * 0.39, cy, { dpr })
        drawSprite(ctx, sprites.close, cx + cell * 0.39, cy, { dpr })
      } else {
        drawSprite(ctx, sprites.dot, cx, cy, { dpr })
      }
    }
  }

  // The keyboard cursor: corner marks round the square, gliding between squares
  function cursor ({ x, y }) {
    const inset = cell * 0.06
    const arm = cell * 0.24
    const left = X(x) + inset
    const top = Y(y) + inset
    const right = X(x + 1) - inset
    const bottom = Y(y + 1) - inset
    ctx.save()
    ctx.strokeStyle = GREEN
    ctx.lineWidth = Math.max(2, cell * 0.05)
    ctx.shadowColor = GLOW
    ctx.shadowBlur = cell * 0.2 * dpr
    ctx.beginPath()
    for (const [cx, cy, dx, dy] of [[left, top, 1, 1], [right, top, -1, 1], [left, bottom, 1, -1], [right, bottom, -1, -1]]) {
      ctx.moveTo(cx, cy + dy * arm)
      ctx.lineTo(cx, cy)
      ctx.lineTo(cx + dx * arm, cy)
    }
    ctx.stroke()
    ctx.restore()
  }

  function particle (p) {
    let alpha = Math.max(0, Math.min(1, p.life / p.ttl))
    if (p.twinkle && p.life < p.ttl * 0.6) alpha *= 0.4 + Math.random() * 0.6
    drawGlyph(ctx, p.ch, X(p.x), Y(p.y), { px: cell * (p.size || 0.42), color: p.color, alpha, angle: p.angle || 0, font: p.font })
  }

  /**
   * scene: {
   *   board (64 piece letters), squareAt(x, y) -> square, files and ranks (labels left to
   *   right and top to bottom), lastMove: [{ x, y }], check: { x, y } | null, blink,
   *   selected: { x, y } | null, targets: [{ x, y, capture }], cursor: { x, y } | null,
   *   hidden (squares whose piece is drawn moving instead), ghost (the square a dragged piece
   *   left), reveal, decode, glitches, pops, glow (per square),
   *   moving: [{ piece, x, y, scale, alpha }], debris: [{ piece, x, y, angle, alpha }],
   *   particles, bolts: [{ glyphs, alpha }], texts: [{ text, x, y, size, display, alpha }],
   *   flash, shake
   * }
   */
  function draw (scene) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!sprites || !size) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.save()
    if (scene.shake > 0) ctx.translate((Math.random() * 2 - 1) * scene.shake * cell * 0.2, (Math.random() * 2 - 1) * scene.shake * cell * 0.2)
    squares(scene)
    frame()
    coordinates(scene)
    pieces(scene)
    targets(scene)
    if (scene.cursor) cursor(scene.cursor)
    for (const item of scene.moving) {
      drawSprite(ctx, sprites.piece[item.piece], X(item.x + 0.5), Y(item.y + 0.5), { scale: item.scale || 1, alpha: item.alpha ?? 1, dpr })
    }
    for (const piece of scene.debris) {
      drawSprite(ctx, sprites.piece[piece.piece], X(piece.x), Y(piece.y), { angle: piece.angle, alpha: piece.alpha ?? 1, dpr })
    }
    for (const p of scene.particles) particle(p)
    for (const bolt of scene.bolts) drawBolt(ctx, bolt.glyphs, { px: cell * 0.5, alpha: bolt.alpha, dpr, toX: X, toY: Y })
    ctx.restore()

    for (const item of scene.texts) {
      drawText(ctx, item.text, X(item.x ?? 4), Y(item.y), { px: item.size * cell, dpr, ...item })
    }
    if (scene.flash > 0) {
      ctx.fillStyle = `rgba(0, 255, 0, ${0.2 * scene.flash})`
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
      cell = size / 8
      if (changed || !sprites) build()
    },
    // The edges of the canvas in squares, for effects that start off the board
    bounds: () => (cell ? { left: -bx / cell, top: -by / cell, right: (width - bx) / cell, bottom: (height - by) / cell } : { left: 0, top: -1, right: 8, bottom: 9 }),
    // Fonts that finish loading later need the sprites painted again
    rebuild: build,
    draw
  }
}
