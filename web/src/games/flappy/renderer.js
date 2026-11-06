import { COLS, ROWS, GROUND_Y, CAP_OVER, CAP_H, PIPE_W, pipesInView, gapAt } from './engine'
import { mulberry32 } from '../ascii/random'
import { PAL, sprite, grid, toCanvas, pixelText, FONT_PIXEL } from '../../pixel/kit'
import { GREEN, DIM, LOW } from '../ascii/paint'

// Draws Flappy as pixel art. The world is painted at a low resolution, ART_H art pixels from
// top to bottom, into a small picture of its own, then blown up onto the screen with hard edges,
// so every pixel shows: a sky with clouds and a town far off, green pipes with caps, grass over
// striped sand, and the bird. Words go on top at the screen's own resolution.
//
// The sky changes with the level: day, then sunset, then night with stars.

const ART_H = 240
const ART_W = Math.round((ART_H * COLS * 0.6) / ROWS) // the view's shape: 0.6 of a row to a column
const RX = ART_W / COLS // art pixels to a column
const RY = ART_H / ROWS // art pixels to a row
const GROUND_PX = Math.round(GROUND_Y * RY)

// The bird: wing up, level and down, then crashed
const BIRD_ROWS = [
  [
    '....kkkk....',
    '..kkyyyykk..',
    '.kwwkyyywwk.',
    'kwwwwkyywkwk',
    'kwwwwkyywkwk',
    'kywwyyyyywwk',
    '.kyyyyyykooo',
    '..kkyyykoook',
    '....kkkkkkk.'
  ],
  [
    '....kkkk....',
    '..kkyyyykk..',
    '.kyyyyyywwk.',
    'kkkkkyyywkwk',
    'kwwwwkyywkwk',
    'kywwwkyyywwk',
    '.kkkkyyykooo',
    '..kkyyykoook',
    '....kkkkkkk.'
  ],
  [
    '....kkkk....',
    '..kkyyyykk..',
    '.kyyyyyywwk.',
    'kyyyyyyywkwk',
    'kkkkkyyywkwk',
    'kwwwwkyyywwk',
    'kwwwkyyykooo',
    '.kkkyyykoook',
    '....kkkkkkk.'
  ],
  [
    '....kkkk....',
    '..kkyyyykk..',
    '.kyyyyyywwk.',
    'kyyyyyywkwkw',
    'kkkkkyyywkwk',
    'kwwwwkyywkwk',
    'kwwwkyyykooo',
    '.kkkyyykoook',
    '....kkkkkkk.'
  ]
]
export const WING_CYCLE = [0, 1, 2, 1]
export const DEAD_FRAME = 3

const THEMES = [
  // day
  { sky: ['c', 'c', 'c', 'C', 'C'], cloud: 'w', town: 'g', windows: 'w', hills: 'G', stars: false },
  // sunset
  { sky: ['p', 'r', 'o', 'o', 'y'], cloud: 'y', town: 'p', windows: 'y', hills: 't', stars: false },
  // night
  { sky: ['K', 'K', 'n', 'n', 'b'], cloud: 'd', town: 'd', windows: 'y', hills: 'n', stars: true }
]
const themeOf = (level) => (level >= 5 ? 2 : level >= 3 ? 1 : 0)

const CLOUD_TILE = 160
const TOWN_TILE = 192
const HILL_TILE = 128
const SAND_TILE = 8

// The far-off picture, one strip per layer, built once per theme
function buildLayers (theme) {
  const t = THEMES[theme]
  const random = mulberry32(5)
  // Sky: bands from the top down, with a dithered seam between each two
  const band = GROUND_PX / t.sky.length
  const skyCanvas = document.createElement('canvas')
  skyCanvas.width = ART_W
  skyCanvas.height = GROUND_PX
  const sg = skyCanvas.getContext('2d')
  for (let y = 0; y < GROUND_PX; y++) {
    const i = Math.floor(y / band)
    const into = y - i * band
    for (let x = 0; x < ART_W; x++) {
      const next = into >= band - 2 && (x + y) % 2 === 0 ? Math.min(i + 1, t.sky.length - 1) : i
      sg.fillStyle = PAL[t.sky[next]]
      sg.fillRect(x, y, 1, 1)
    }
  }

  // Clouds: puffs of rectangles
  const clouds = grid(CLOUD_TILE, 40)
  for (let n = 0; n < 4; n++) {
    const x = 6 + n * 40 + Math.floor(random() * 14)
    const y = 6 + Math.floor(random() * 26)
    const w = 14 + Math.floor(random() * 12)
    clouds.rect(x, y + 3, w, 4, t.cloud).rect(x + 3, y + 1, w - 7, 2, t.cloud).rect(x + 6, y, w - 13, 1, t.cloud)
  }
  if (t.stars) {
    for (let i = 0; i < 26; i++) clouds.px(Math.floor(random() * CLOUD_TILE), Math.floor(random() * 40), random() < 0.3 ? 'y' : 'w')
  }

  // A town of blocks with lit windows
  const townH = 70
  const town = grid(TOWN_TILE, townH)
  let x = 0
  while (x < TOWN_TILE - 6) {
    const w = 10 + Math.floor(random() * 14)
    const h = 20 + Math.floor(random() * (townH - 24))
    const right = Math.min(x + w, TOWN_TILE)
    town.rect(x, townH - h, right - x, h, t.town)
    for (let wy = townH - h + 4; wy < townH - 3; wy += 5) {
      for (let wx = x + 2; wx < right - 2; wx += 4) if (random() < 0.55) town.rect(wx, wy, 2, 2, t.windows)
    }
    if (random() < 0.4) town.rect(x + Math.floor(w / 2), townH - h - 4, 1, 4, t.town)
    x += w + Math.floor(random() * 4)
  }

  // Bushy hills just behind the ground
  const hillH = 26
  const hills = grid(HILL_TILE, hillH)
  for (let hx = 0; hx < HILL_TILE; hx++) {
    const top = Math.round(12 + Math.sin(hx * 0.1) * 5 + Math.sin(hx * 0.37) * 2)
    hills.rect(hx, top, 1, hillH - top, t.hills)
  }

  // The ground: grass on top, then sand with stripes that scroll
  const ground = grid(SAND_TILE, ART_H - GROUND_PX)
  ground.rect(0, 0, SAND_TILE, ART_H - GROUND_PX, 'y')
  ground.rect(0, 0, SAND_TILE, 2, 'l').rect(0, 2, SAND_TILE, 2, 'G').rect(0, 4, SAND_TILE, 1, 't')
  for (let gy = 6; gy < ART_H - GROUND_PX; gy++) for (let gx = 0; gx < SAND_TILE; gx++) if ((gx + gy) % SAND_TILE < 2) ground.px(gx, gy, 'o')
  ground.px(1, 0, 'G').px(5, 0, 'G')

  return {
    sky: skyCanvas,
    clouds: toCanvas(clouds),
    town: toCanvas(town),
    hills: toCanvas(hills),
    ground: toCanvas(ground)
  }
}

// A pipe as tall as the view, with a light stripe and a dark side, and its cap
function buildPipe () {
  const w = Math.round(PIPE_W * RX)
  const body = grid(w, 1)
  body.rect(0, 0, w, 1, 'G').px(0, 0, 'k').px(w - 1, 0, 'k').rect(2, 0, 2, 1, 'l').px(5, 0, 'l').rect(w - 5, 0, 3, 1, 't')
  const capW = Math.round((PIPE_W + CAP_OVER * 2) * RX)
  const capH = Math.round(CAP_H * RY)
  const cap = grid(capW, capH)
  cap.rect(0, 0, capW, capH, 'G').box(0, 0, capW, capH, 'k').rect(2, 1, 2, capH - 2, 'l').rect(5, 1, 1, capH - 2, 'l').rect(capW - 5, 1, 3, capH - 2, 't')
  return { body: toCanvas(body), cap: toCanvas(cap), w, capW, capH }
}

// The colors the stage gives particles and words, in this picture's palette
const ink = (color) => (color === DIM ? PAL.y : color === LOW ? PAL.w : color === GREEN ? PAL.w : color || PAL.w)

export function createRenderer (canvas) {
  const ctx = canvas.getContext('2d')
  const art = document.createElement('canvas')
  art.width = ART_W
  art.height = ART_H
  const g = art.getContext('2d')
  g.imageSmoothingEnabled = false
  let width = 0
  let height = 0
  let dpr = 1
  let row = 0
  let col = 0
  const layers = []
  let pipe = null
  let birds = null

  const layersFor = (level) => {
    const theme = themeOf(level)
    if (!layers[theme]) layers[theme] = buildLayers(theme)
    return layers[theme]
  }

  // A strip that repeats sideways, scrolled left by `offset` art pixels
  function strip (image, offset, y) {
    const w = image.width
    let x = -(((Math.round(offset) % w) + w) % w)
    for (; x < ART_W; x += w) g.drawImage(image, x, y)
  }

  function drawPipe (p, camera) {
    const x = Math.round((p.x - camera) * RX + 1)
    const capX = Math.round((p.x - CAP_OVER - camera) * RX + 1)
    const gap = gapAt(p, camera)
    const top = Math.round(gap.top * RY)
    const bottom = Math.round(gap.bottom * RY)
    g.drawImage(pipe.body, x, 0, pipe.w - 2, Math.max(0, top - pipe.capH))
    g.drawImage(pipe.cap, capX, top - pipe.capH)
    g.drawImage(pipe.body, x, bottom + pipe.capH, pipe.w - 2, Math.max(0, GROUND_PX - bottom - pipe.capH))
    g.drawImage(pipe.cap, capX, bottom)
  }

  // Text centered on (x, y) in cells; size is in rows. Press Start 2P is a wide font, so it's
  // drawn a little smaller than the size asked for, and smaller still if it wouldn't fit.
  function text (str, { x = COLS / 2, y, size = 1, display = false, color, alpha = 1 }) {
    let px = size * row * (display ? 0.62 : 0.72)
    ctx.font = `${Math.round(px)}px ${FONT_PIXEL}`
    const room = width * 0.94
    const w = ctx.measureText(str).width
    if (w > room) px *= room / w
    pixelText(ctx, str, x * col, y * row, { px: Math.max(6, px), color: ink(color), alpha })
  }

  /**
   * scene: { course, camera, ground, bird, particles, score, pop, texts, flash, shake, level }
   * camera and ground are scroll positions in columns; the bird is { x, y, tilt, frame } in cells.
   */
  function draw (scene) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = PAL.K
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    if (!width) return
    const L = layersFor(scene.level || 1)
    const ground = scene.ground * RX

    // The world, at art resolution
    g.save()
    g.drawImage(L.sky, 0, 0, ART_W, GROUND_PX)
    if (scene.shake > 0) g.translate(Math.round((Math.random() * 2 - 1) * scene.shake * 3), Math.round((Math.random() * 2 - 1) * scene.shake * 3))
    strip(L.clouds, ground * 0.06, 14)
    strip(L.town, ground * 0.2, GROUND_PX - L.town.height - 10)
    strip(L.hills, ground * 0.45, GROUND_PX - L.hills.height + 2)
    if (scene.course) for (const p of pipesInView(scene.course, scene.camera)) drawPipe(p, scene.camera)
    strip(L.ground, ground, GROUND_PX)

    if (scene.bird) {
      const b = scene.bird
      const image = birds[b.frame]
      g.save()
      g.translate(Math.round(b.x * RX), Math.round(b.y * RY))
      g.rotate((b.tilt * Math.PI) / 180)
      g.drawImage(image, -Math.round(image.width / 2), -Math.round(image.height / 2))
      g.restore()
    }
    // Feathers and puffs: little squares
    for (const p of scene.particles) {
      g.globalAlpha = Math.max(0, p.life / p.ttl)
      g.fillStyle = p.color === LOW ? PAL.w : (p.ch.charCodeAt(0) % 2 ? PAL.y : PAL.w)
      const s = p.ch === '*' || p.ch === '=' ? 2 : 1
      g.fillRect(Math.round(p.x * RX), Math.round(p.y * RY), s + 1, s)
    }
    g.globalAlpha = 1
    g.restore()

    // Blown up onto the screen with hard edges
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(art, 0, 0, canvas.width, canvas.height)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    if (scene.score !== null) text(String(scene.score), { y: 6.5, size: 6 * (1 + scene.pop * 0.18), display: true })
    for (const item of scene.texts) text(item.text, item)
    if (scene.flash > 0) {
      ctx.fillStyle = `rgba(244, 244, 244, ${0.5 * scene.flash})`
      ctx.fillRect(0, 0, width, height)
    }
  }

  function build () {
    pipe = buildPipe()
    birds = BIRD_ROWS.map(rows => toCanvas(sprite(rows, { outline: null })))
  }
  build()

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
    },
    // Text is drawn fresh every frame, so a font that loads later needs nothing done
    rebuild () {},
    draw
  }
}
