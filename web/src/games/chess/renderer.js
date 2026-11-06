import { colorOf, typeOf } from './engine'
import { PIECES } from './pieces'
import { pieceArt } from './pixelPieces'
import { GREEN, DIM } from '../ascii/paint'
import { PAL, toCanvas, pixelText, pixelBit, pixelBolt, inkOf } from '../../pixel/kit'

// Draws Chess (and Dama, with its own set) as a pixel-art board on a canvas that covers the
// whole play area, so lightning can come down from the top of the screen and fireworks can go
// up anywhere. The board sits wherever the page lays out its slot (setBoard). Positions in a
// scene are in squares on screen, from the board's top-left corner, whichever way round it is;
// effects off the board are just numbers outside 0-8.
//
// The board is wood in two tones inside a dark frame; the pieces are 16 by 16 pixel sprites
// (see pixelPieces.js), White's white and Black's slate blue, blown up with hard edges.

// The chess set; another game can bring its own (see createRenderer)
const CHESS = { letters: 'PNBRQKpnbrqk', colorOf, typeOf, pieces: PIECES }
const PIECE_SIZE = 0.9 // of a square
const LIGHT = '#e4c08a'
const DARK = '#b07a48'
const FRAME = '#5d3a22'
const LAST_WASH = 'rgba(255, 205, 117, 0.45)'
const CHECK_WASH = 'rgba(177, 62, 83, 0.75)'
const SELECT_WASH = 'rgba(65, 166, 246, 0.6)'

/**
 * `set` is the pieces to draw: { letters (every piece character), colorOf(ch) -> 'w' | 'b',
 * typeOf(ch) -> a key of `pieces` (a chess letter, or man / king) }.
 */
export function createRenderer (canvas, set = CHESS) {
  const ctx = canvas.getContext('2d')
  let width = 0
  let height = 0
  let dpr = 1
  let bx = 0 // the board's top-left corner and size, in CSS pixels
  let by = 0
  let size = 0
  let cell = 0
  let sprites = null

  function build () {
    sprites = { piece: Object.fromEntries([...set.letters].map(ch => [ch, toCanvas(pieceArt(set.typeOf(ch), set.colorOf(ch)))])) }
  }

  // A piece centered on (x, y) CSS pixels, a square across, grown by `scale`
  function drawPiece (ch, x, y, { scale = 1, alpha = 1, angle = 0, lighter = false } = {}) {
    const image = sprites.piece[ch]
    if (!image) return
    const s = cell * PIECE_SIZE * scale
    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.globalAlpha = alpha
    if (lighter) ctx.globalCompositeOperation = 'lighter'
    ctx.translate(x, y)
    if (angle) ctx.rotate(angle)
    ctx.drawImage(image, -s / 2, -s / 2, s, s)
    ctx.restore()
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
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) fill(x, y, (x + y) % 2 ? DARK : LIGHT)
    }
    // A little grain in the wood: a darker pixel here and there
    const g = Math.max(1, Math.round(cell / 12))
    ctx.fillStyle = 'rgba(93, 58, 34, 0.22)'
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        for (let k = 0; k < 3; k++) ctx.fillRect(Math.round(X(x) + ((x * 7 + y * 3 + k * 5) % 11) / 11 * cell), Math.round(Y(y) + ((k * 4 + x + y * 5) % 9 + 1) / 10 * cell), g * 3, g)
      }
    }
    for (const at of scene.lastMove || []) fill(at.x, at.y, LAST_WASH)
    if (scene.check && scene.blink) fill(scene.check.x, scene.check.y, CHECK_WASH)
    if (scene.selected) fill(scene.selected.x, scene.selected.y, SELECT_WASH)
  }

  // A thick dark wooden frame with a hard shadow under it
  function frame () {
    const t = Math.max(4, Math.round(cell * 0.12))
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
    ctx.fillRect(bx - t, by + size + t, size + t * 2, t)
    ctx.fillStyle = FRAME
    ctx.fillRect(bx - t, by - t, size + t * 2, t)
    ctx.fillRect(bx - t, by + size, size + t * 2, t)
    ctx.fillRect(bx - t, by, t, size)
    ctx.fillRect(bx + size, by, t, size)
    ctx.fillStyle = PAL.k
    const o = Math.max(2, Math.round(t / 3))
    ctx.fillRect(bx - t - o, by - t - o, size + (t + o) * 2, o)
    ctx.fillRect(bx - t - o, by + size + t, size + (t + o) * 2, o)
    ctx.fillRect(bx - t - o, by - t, o, size + t * 2)
    ctx.fillRect(bx + size + t, by - t, o, size + t * 2)
  }

  // Files along the bottom row and ranks up the left column, inside the corner of each square
  function coordinates (scene) {
    const px = Math.max(7, Math.round(cell * 0.15))
    ctx.save()
    ctx.font = `${px}px "Press Start 2P", monospace`
    ctx.fillStyle = 'rgba(93, 58, 34, 0.85)'
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
        // Flickering in (a new game, a promotion): other pieces of its side flash past first
        if (scene.decode[sq] > 0) {
          drawPiece(scene.glitches[sq] || ch, cx, cy, { alpha: 0.35 + Math.random() * 0.65 })
          continue
        }
        const isSelected = selected && selected.x === x && selected.y === y
        const scale = scene.pops[sq] || 1
        const alpha = scene.ghost === sq ? 0.3 : 1
        drawPiece(ch, cx, cy, { scale, alpha })
        if (!isSelected && scene.glow[sq] > 0) drawPiece(ch, cx, cy, { scale, alpha: scene.glow[sq] * alpha * 0.6, lighter: true })
      }
    }
  }

  // Where the selected piece can go: a square dot on an empty square, red corners round a capture
  function targets (scene) {
    const s = Math.max(2, Math.round(cell * 0.07))
    for (const target of scene.targets) {
      if (target.capture) {
        corners(target, PAL.r, s * 1.5, cell * 0.28)
      } else {
        const d = Math.round(cell * 0.22)
        ctx.fillStyle = 'rgba(16, 17, 29, 0.35)'
        ctx.fillRect(Math.round(X(target.x + 0.5) - d / 2), Math.round(Y(target.y + 0.5) - d / 2), d, d)
      }
    }
  }

  // Corner marks round a square
  function corners ({ x, y }, color, thick, arm) {
    const t = Math.round(thick)
    const a = Math.round(arm)
    const inset = Math.round(cell * 0.05)
    const left = Math.round(X(x)) + inset
    const top = Math.round(Y(y)) + inset
    const right = Math.round(X(x + 1)) - inset
    const bottom = Math.round(Y(y + 1)) - inset
    ctx.fillStyle = color
    ctx.fillRect(left, top, a, t)
    ctx.fillRect(left, top, t, a)
    ctx.fillRect(right - a, top, a, t)
    ctx.fillRect(right - t, top, t, a)
    ctx.fillRect(left, bottom - t, a, t)
    ctx.fillRect(left, bottom - a, t, a)
    ctx.fillRect(right - a, bottom - t, a, t)
    ctx.fillRect(right - t, bottom - a, t, a)
  }

  // The keyboard cursor: gold corner marks round the square, gliding between squares
  function cursor (at) {
    corners(at, PAL.k, Math.max(3, cell * 0.09), cell * 0.3)
    corners(at, PAL.y, Math.max(2, cell * 0.06), cell * 0.27)
  }

  function particle (p) {
    let alpha = Math.max(0, Math.min(1, p.life / p.ttl))
    if (p.twinkle && p.life < p.ttl * 0.6) alpha *= 0.4 + Math.random() * 0.6
    pixelBit(ctx, p.ch, X(p.x), Y(p.y), cell * (p.size || 0.42) * 0.2, inkOf(p.color, p.spin !== undefined ? { [GREEN]: '#ffb3d9', [DIM]: '#f4f4f4' } : null), alpha)
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
    if (scene.shake > 0) ctx.translate(Math.round((Math.random() * 2 - 1) * scene.shake * cell * 0.2), Math.round((Math.random() * 2 - 1) * scene.shake * cell * 0.2))
    squares(scene)
    frame()
    coordinates(scene)
    pieces(scene)
    targets(scene)
    if (scene.cursor) cursor(scene.cursor)
    for (const item of scene.moving) {
      drawPiece(item.piece, X(item.x + 0.5), Y(item.y + 0.5), { scale: item.scale || 1, alpha: item.alpha ?? 1 })
    }
    for (const piece of scene.debris) {
      drawPiece(piece.piece, X(piece.x), Y(piece.y), { angle: piece.angle, alpha: piece.alpha ?? 1 })
    }
    for (const p of scene.particles) particle(p)
    for (const bolt of scene.bolts) pixelBolt(ctx, bolt.glyphs, { size: cell * 0.12, alpha: bolt.alpha, toX: X, toY: Y })
    ctx.restore()

    for (const item of scene.texts) {
      pixelText(ctx, item.text, X(item.x ?? 4), Y(item.y), { px: item.size * cell * (item.display ? 0.55 : 0.62), color: inkOf(item.color === GREEN || !item.color ? PAL.w : item.color), alpha: item.alpha ?? 1 })
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
      if (!sprites) build()
    },
    // Where the board is on the canvas, in CSS pixels
    setBoard (x, y, boardSize) {
      bx = Math.round(x * dpr) / dpr
      by = Math.round(y * dpr) / dpr
      size = boardSize
      cell = size / 8
      if (!sprites) build()
    },
    // The edges of the canvas in squares, for effects that start off the board
    bounds: () => (cell ? { left: -bx / cell, top: -by / cell, right: (width - bx) / cell, bottom: (height - by) / cell } : { left: 0, top: -1, right: 8, bottom: 9 }),
    // The pieces are pictures and the words are drawn fresh every frame: nothing to redo
    rebuild () {},
    draw
  }
}
