import { COLS, ROWS, GROUND_Y, CAP_OVER, CAP_H, pipesInView, gapAt } from './engine'
import { GREEN, DIM, LOW, tileOut, paint, drawSprite, drawText } from '../ascii/paint'
import { mulberry32 } from '../ascii/random'

// Draws Flappy on a canvas, from sprites painted with the shared ASCII look.

// Wing up, level and down, then the crashed bird
const BIRD_FRAMES = [
  [' .--.', '( ^ @)>', " `--'"],
  [' .--.', '( - @)>', " `--'"],
  [' .--.', '( v @)>', " `--'"],
  [' .--.', '( - x)>', " `--'"]
]
export const WING_CYCLE = [0, 1, 2, 1]
export const DEAD_FRAME = 3

const PIPE_BODY = '|#=-:.  .|'
const PIPE_CAP = ['.----------.', '|#==-:.   .|', "'----------'"]

const GROUND_TILE = 24
const SKY_TILE = 96
const SKY_ROWS = 14
const STAR_TILE = 120
const STAR_ROWS = 36

function groundTile () {
  const random = mulberry32(11)
  const sand = () => Array.from({ length: GROUND_TILE }, () => {
    const r = random()
    return r < 0.07 ? '.' : r < 0.1 ? ':' : r < 0.12 ? "'" : r < 0.13 ? ',' : ' '
  }).join('')
  return ['='.repeat(GROUND_TILE), '//  '.repeat(GROUND_TILE / 4), ...Array.from({ length: ROWS - GROUND_Y }, sand)]
}

// A city of outlined buildings with lit windows, far behind the pipes
function skylineTile () {
  const random = mulberry32(5)
  const grid = Array.from({ length: SKY_ROWS }, () => Array(SKY_TILE).fill(' '))
  let x = 1
  for (;;) {
    const w = 4 + Math.floor(random() * 7)
    if (x + w > SKY_TILE - 1) break
    const h = 3 + Math.floor(random() * (SKY_ROWS - 4))
    const top = SKY_ROWS - h
    for (let row = top; row < SKY_ROWS; row++) {
      for (let i = 0; i < w; i++) {
        const edge = i === 0 || i === w - 1
        let ch = ' '
        if (row === top) ch = edge ? '.' : '-'
        else if (edge) ch = '|'
        else if ((row - top) % 2 === 0 && i % 2 === 0 && random() < 0.6) ch = ':'
        grid[row][x + i] = ch
      }
    }
    if (h > 6 && random() < 0.35) grid[top - 1][x + Math.floor(w / 2)] = '|'
    x += w + Math.floor(random() * 3)
  }
  return grid.map(line => line.join(''))
}

function starTile () {
  const random = mulberry32(3)
  return Array.from({ length: STAR_ROWS }, () => Array.from({ length: STAR_TILE }, () => {
    const r = random()
    return r < 0.006 ? '.' : r < 0.009 ? "'" : r < 0.011 ? '+' : r < 0.012 ? '*' : ' '
  }).join(''))
}

function buildSprites (row, col, dpr) {
  const cw = col * dpr
  const rh = row * dpr
  const glow = Math.max(1.5, row * 0.4) * dpr
  const lit = { cw, rh, glow }
  const soft = { cw, rh, glow: glow / 2 }
  const flat = { cw, rh, glow: 0 }
  // The birds are drawn heavier than the scenery so they stand out
  const hero = { cw, rh, glow: glow * 1.6, weight: 700, scale: 1.12 }
  // Bright outlines, shading fading from a bright left edge
  const pipeColor = (ch, x, y, line) => (x === 0 || x === line.length - 1 || ch === '#' ? GREEN : DIM)
  return {
    bird: BIRD_FRAMES.map(lines => paint(lines, () => GREEN, { ...hero, halo: 0.2 })),
    body: paint(Array(ROWS + 2).fill(PIPE_BODY), pipeColor, lit),
    cap: paint(PIPE_CAP, (ch, x, y, line) => (y === 1 ? pipeColor(ch, x, y, line) : GREEN), lit),
    ground: paint(tileOut(groundTile(), COLS + GROUND_TILE), (ch, x, y) => (y === 0 ? GREEN : y === 1 ? DIM : LOW), soft),
    skyline: paint(tileOut(skylineTile(), COLS + SKY_TILE), () => LOW, flat),
    stars: paint(tileOut(starTile(), COLS + STAR_TILE), ch => (ch === '*' || ch === '+' ? DIM : LOW), flat)
  }
}

export function createRenderer (canvas) {
  const ctx = canvas.getContext('2d')
  let width = 0
  let height = 0
  let dpr = 1
  let row = 0
  let col = 0
  let sprites = null

  const snap = (value) => Math.round(value * dpr) / dpr

  // Draws a sprite with the top-left corner of its first cell at (x, y), in CSS pixels
  function blit (sprite, x, y) {
    const { canvas: image, pad } = sprite
    ctx.drawImage(image, snap(x - pad / dpr), snap(y - pad / dpr), image.width / dpr, image.height / dpr)
  }

  // A strip that repeats every `tile` columns, scrolled left by `offset` columns
  function strip (sprite, tile, offset, y) {
    blit(sprite, -(((offset % tile) + tile) % tile) * col, y)
  }

  // Pipe body rows between two heights (in rows). The rows line up with the cap they meet:
  // taken from the top of the sprite under a cap, from its bottom above one.
  function pipeBody (x, top, bottom, underCap) {
    const { canvas: image, pad } = sprites.body
    const sh = Math.min((bottom - top) * row * dpr, image.height - pad * 2)
    if (sh <= 0) return
    const sy = underCap ? pad : image.height - pad - sh
    const dh = sh / dpr
    const dy = underCap ? top * row : bottom * row - dh
    ctx.drawImage(image, 0, sy, image.width, sh, snap(x - pad / dpr), snap(dy), image.width / dpr, dh)
  }

  // The caps sit so that their outlines run exactly along the edges of the gap
  function pipe (p, camera) {
    const x = (p.x - camera) * col
    const capX = x - CAP_OVER * col
    const gap = gapAt(p, camera)
    const topCap = gap.top - CAP_H + 0.5
    const bottomCap = gap.bottom - 0.5
    pipeBody(x, -2, topCap, false)
    blit(sprites.cap, capX, topCap * row)
    blit(sprites.cap, capX, bottomCap * row)
    pipeBody(x, bottomCap + CAP_H, GROUND_Y, true)
  }

  // A bird centered on (x, y) in cells, tilted by `tilt` degrees
  function bird (sprite, x, y, tilt, alpha = 1) {
    drawSprite(ctx, sprite, x * col, y * row, { angle: (tilt * Math.PI) / 180, alpha, dpr })
  }

  // Text centered on (x, y) in cells; size is in rows
  function text (str, { x = COLS / 2, y, size = 1, ...style }) {
    drawText(ctx, str, x * col, y * row, { px: size * row, dpr, ...style })
  }

  /**
   * scene: { course, camera, ground, bird, particles, score, pop, texts, flash, shake }
   * camera and ground are scroll positions in columns; the bird is { x, y, tilt, frame } in cells.
   */
  function draw (scene) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    if (!sprites) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.save()
    if (scene.shake > 0) {
      ctx.translate((Math.random() * 2 - 1) * scene.shake * col * 1.2, (Math.random() * 2 - 1) * scene.shake * row * 0.8)
    }
    strip(sprites.stars, STAR_TILE, scene.ground * 0.05, row)
    strip(sprites.skyline, SKY_TILE, scene.ground * 0.25, (GROUND_Y - SKY_ROWS) * row)
    if (scene.course) {
      for (const p of pipesInView(scene.course, scene.camera)) pipe(p, scene.camera)
    }
    // The ground covers the feet of the pipes
    ctx.fillStyle = '#000'
    ctx.fillRect(-col * 4, GROUND_Y * row, width + col * 8, height)
    strip(sprites.ground, GROUND_TILE, scene.ground, (GROUND_Y - 0.5) * row)

    if (scene.bird) bird(sprites.bird[scene.bird.frame], scene.bird.x, scene.bird.y, scene.bird.tilt)
    for (const p of scene.particles) {
      text(p.ch, { x: p.x, y: p.y, color: p.color, alpha: Math.max(0, p.life / p.ttl), glow: false, outline: false })
    }
    ctx.restore()

    if (scene.score !== null) text(String(scene.score), { y: 6.5, size: 7 * (1 + scene.pop * 0.18), display: true })
    for (const item of scene.texts) text(item.text, item)
    if (scene.flash > 0) {
      ctx.fillStyle = `rgba(0, 255, 0, ${0.28 * scene.flash})`
      ctx.fillRect(0, 0, width, height)
    }
  }

  return {
    resize (cssWidth, cssHeight, pixelRatio) {
      width = cssWidth
      height = cssHeight
      dpr = pixelRatio
      row = height / ROWS
      col = width / COLS
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      sprites = width && height ? buildSprites(row, col, dpr) : null
    },
    // Fonts that finish loading later need the sprites drawn again
    rebuild () {
      if (width && height) sprites = buildSprites(row, col, dpr)
    },
    draw
  }
}
