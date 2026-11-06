// The site's pixel art: one 16-color palette (Sweetie 16), little pictures drawn on a grid of
// art pixels, and pixel text for canvases. The same grid makes an SVG for a page (see
// PixelArt.vue) or a canvas for a game, so both look the same.

// Each color has a letter, so a picture can be written as rows of letters too
export const PAL = {
  k: '#10111d', // outline, near black
  K: '#1a1c2c', // night blue, the page
  d: '#333c57', // dark slate
  s: '#566c86', // slate
  g: '#94b0c2', // light gray
  w: '#f4f4f4', // white
  p: '#5d275d', // plum
  r: '#b13e53', // red
  o: '#ef7d57', // orange
  y: '#ffcd75', // gold
  l: '#a7f070', // lime
  G: '#38b764', // green
  t: '#257179', // teal
  n: '#29366f', // navy
  b: '#3b5dc9', // blue
  c: '#41a6f6', // sky
  C: '#73eff7', // cyan
  P: '#262b44' // panel
}

export const FONT_PIXEL = '"Press Start 2P", "Pixelify Sans", monospace'
export const FONT_BODY = '"Pixelify Sans", "Handjet", monospace'

// Fonts the canvases draw with: games repaint their sprites once these have arrived
export const PIXEL_FONTS = ['16px "Press Start 2P"', '600 16px "Pixelify Sans"', '700 16px "Pixelify Sans"']

const hexRgb = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
export const rgba = (hex, alpha) => `rgba(${hexRgb(hex).join(', ')}, ${alpha})`
export const mix = (a, b, k) => '#' + hexRgb(a).map((v, i) => Math.round(v + (hexRgb(b)[i] - v) * k).toString(16).padStart(2, '0')).join('')

/**
 * A picture `w` by `h` art pixels to draw on. Colors are palette letters (or any CSS color);
 * '.' or null is empty. Returns the drawing calls, which chain.
 */
export function grid (w, h) {
  const cells = Array.from({ length: h }, () => Array(w).fill(null))
  const set = (x, y, c) => {
    x = Math.round(x)
    y = Math.round(y)
    if (x >= 0 && y >= 0 && x < w && y < h) cells[y][x] = c === '.' ? null : c
  }
  const api = {
    w,
    h,
    cells,
    get: (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? cells[y][x] : null),
    px (x, y, c) { set(x, y, c); return api },
    rect (x, y, rw, rh, c) {
      for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) set(x + i, y + j, c)
      return api
    },
    // A rectangle's edge, one pixel wide
    box (x, y, rw, rh, c) {
      for (let i = 0; i < rw; i++) { set(x + i, y, c); set(x + i, y + rh - 1, c) }
      for (let j = 0; j < rh; j++) { set(x, y + j, c); set(x + rw - 1, y + j, c) }
      return api
    },
    line (x0, y0, x1, y1, c) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
      for (let i = 0; i <= n; i++) set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c)
      return api
    },
    // A filled circle round the middle of pixel (cx, cy); r can be a half
    disc (cx, cy, r, c) {
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
          if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + r * 0.6) set(x, y, c)
        }
      }
      return api
    },
    ring (cx, cy, r, c) {
      for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
        for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
          const d = Math.hypot(x - cx, y - cy)
          if (Math.abs(d - r) < 0.55) set(x, y, c)
        }
      }
      return api
    },
    // Rows of letters, from (x, y); '.' leaves what's under it
    rows (x, y, rows, colors = null) {
      rows.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) {
          const ch = row[i]
          if (ch !== '.' && ch !== ' ') set(x + i, y + j, colors ? colors[ch] ?? ch : ch)
        }
      })
      return api
    },
    // Color every empty pixel that touches a drawn one (not corners), for a dark outline
    outline (c = 'k') {
      const add = []
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (cells[y][x]) continue
          if (api.get(x - 1, y) || api.get(x + 1, y) || api.get(x, y - 1) || api.get(x, y + 1)) add.push([x, y])
        }
      }
      for (const [x, y] of add) cells[y][x] = c
      return api
    },
    flip () {
      for (const row of cells) row.reverse()
      return api
    }
  }
  return api
}

/** A sprite from rows of letters ('.' is empty), with an outline round it unless told not to. */
export function sprite (rows, { colors = null, outline = 'k', pad = outline ? 1 : 0 } = {}) {
  const art = grid(rows[0].length + pad * 2, rows.length + pad * 2).rows(pad, pad, rows, colors)
  return outline ? art.outline(outline) : art
}

const colorOf = (c) => PAL[c] || c

/** The picture as a canvas, one canvas pixel to an art pixel. */
export function toCanvas (art) {
  const canvas = document.createElement('canvas')
  canvas.width = art.w
  canvas.height = art.h
  const g = canvas.getContext('2d')
  art.cells.forEach((row, y) => row.forEach((c, x) => {
    if (!c) return
    g.fillStyle = colorOf(c)
    g.fillRect(x, y, 1, 1)
  }))
  return canvas
}

/** The picture as SVG rectangles (runs of one color along a row become one rectangle). */
export function toSvgRects (art) {
  const rects = []
  art.cells.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const c = row[x]
      let run = 1
      while (x + run < row.length && row[x + run] === c) run++
      if (c) rects.push({ x, y, w: run, fill: colorOf(c) })
      x += run
    }
  })
  return rects
}

/**
 * Draws a canvas sprite with its middle at (x, y), `scale` screen pixels to an art pixel, with
 * hard edges. `angle` turns it, `flip` mirrors it.
 */
export function blit (ctx, image, x, y, scale, { angle = 0, alpha = 1, flip = false, anchorY = 0.5 } = {}) {
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  if (angle) ctx.rotate(angle)
  if (flip) ctx.scale(-1, 1)
  ctx.drawImage(image, (-image.width * scale) / 2, -image.height * scale * anchorY, image.width * scale, image.height * scale)
  ctx.restore()
}

/**
 * Pixel text centered on (x, y): Press Start 2P (or `font`), with a dark outline drawn as hard
 * copies one step away each way and a drop shadow below, so it reads over anything.
 */
export function pixelText (ctx, str, x, y, { px, color = PAL.w, alpha = 1, font = FONT_PIXEL, align = 'center', shadow = true, edge = PAL.k, weight = '' }) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.font = `${weight ? weight + ' ' : ''}${Math.round(px)}px ${font}`
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  const step = Math.max(1, Math.round(px / 8))
  if (shadow) {
    ctx.fillStyle = edge
    ctx.fillText(str, x + step, y + step * 2)
    for (const [dx, dy] of [[-step, 0], [step, 0], [0, -step], [0, step], [step, step]]) ctx.fillText(str, x + dx, y + dy)
  }
  ctx.fillStyle = color
  ctx.fillText(str, x, y)
  ctx.restore()
}

/** A string cut to `max` characters, with an ellipsis. */
export const clip = (text, max) => (text.length > max ? text.slice(0, max - 1) + '…' : text)

/** A pixel spark burst: square bits of color that fly out and fall. Returns the new bits. */
export function burst (list, x, y, { count = 12, speed = 10, life = 0.6, colors = ['y', 'o', 'w'], random = Math.random, size = 1 } = {}) {
  for (let i = 0; i < count; i++) {
    const a = random() * Math.PI * 2
    const v = speed * (0.4 + random() * 0.8)
    list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3, life: life * (0.6 + random() * 0.6), ttl: life, color: colorOf(colors[Math.floor(random() * colors.length)]), size })
  }
  return list
}

/** Moves burst bits on by `dt` seconds under `gravity`, dropping the spent ones. */
export function stepBits (list, dt, gravity = 30) {
  for (let i = list.length - 1; i >= 0; i--) {
    const b = list[i]
    b.life -= dt
    if (b.life <= 0) { list.splice(i, 1); continue }
    b.vy += gravity * dt
    b.x += b.vx * dt
    b.y += b.vy * dt
  }
}

/** Draws burst bits as squares `unit` screen pixels across per size step. */
export function drawBits (ctx, list, toScreen, unit) {
  for (const b of list) {
    const [sx, sy] = toScreen(b.x, b.y)
    const s = Math.max(2, Math.round(unit * b.size))
    ctx.globalAlpha = Math.min(1, (b.life / b.ttl) * 1.5)
    ctx.fillStyle = b.color
    ctx.fillRect(Math.round(sx - s / 2), Math.round(sy - s / 2), s, s)
  }
  ctx.globalAlpha = 1
}

// A 3 by 5 pixel font for numbers and a few letters in little pictures
const TINY = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
  '?': ['111', '001', '011', '000', '010'],
  '!': ['010', '010', '010', '000', '010'],
  A: ['010', '101', '111', '101', '101'],
  D: ['110', '101', '101', '101', '110'],
  K: ['101', '101', '110', '101', '101'],
  N: ['101', '111', '111', '101', '101'],
  O: ['111', '101', '101', '101', '111'],
  R: ['110', '101', '110', '101', '101'],
  U: ['101', '101', '101', '101', '111'],
  W: ['101', '101', '101', '111', '101'],
  '#': ['101', '111', '101', '111', '101'],
  '@': ['111', '101', '111', '100', '111'],
  '%': ['101', '001', '010', '100', '101']
}

/** Writes `str` in the tiny font into a grid at (x, y), `scale` art pixels to a font pixel. */
export function tinyText (art, x, y, str, c, scale = 1) {
  ;[...String(str)].forEach((ch, n) => {
    const glyph = TINY[ch]
    if (!glyph) return
    glyph.forEach((row, j) => {
      for (let i = 0; i < 3; i++) if (row[i] === '1') art.rect(x + (n * 4 + i) * scale, y + j * scale, scale, scale, c)
    })
  })
  return art
}

// ---------- Effects for the games that were drawn in characters ----------

// Those games still hand their particles the old terminal colors; these are what they become
const TERM_INK = { '#00ff00': PAL.y, '#00b300': PAL.c, '#007a00': PAL.s, '#002600': PAL.d, '#c8ffc8': PAL.w }

/** A color from a terminal-era game, in this palette (`map` can say otherwise per color). */
export const inkOf = (color, map = null) => map?.[color] ?? TERM_INK[color] ?? color ?? PAL.w

/**
 * A particle as pixel blocks centered on (x, y) CSS pixels, `s` CSS pixels to a block: a cross
 * for '*' and '+', a ring for 'o', a bar for '|', '-' and '=', a single block for the rest.
 */
export function pixelBit (ctx, ch, x, y, s, color, alpha = 1) {
  if (alpha <= 0) return
  s = Math.max(1, Math.round(s))
  const bx = Math.round(x - s / 2)
  const by = Math.round(y - s / 2)
  ctx.globalAlpha = Math.min(1, alpha)
  ctx.fillStyle = color
  if (ch === '*' || ch === '+') {
    ctx.fillRect(bx - s, by, s * 3, s)
    ctx.fillRect(bx, by - s, s, s * 3)
  } else if (ch === 'o' || ch === 'O' || ch === '@') {
    ctx.fillRect(bx - s, by - s, s * 3, s)
    ctx.fillRect(bx - s, by + s, s * 3, s)
    ctx.fillRect(bx - s, by, s, s)
    ctx.fillRect(bx + s, by, s, s)
  } else if (ch === '|') {
    ctx.fillRect(bx, by - s, s, s * 3)
  } else if (ch === '-' || ch === '=' || ch === '~') {
    ctx.fillRect(bx - s, by, s * 3, s)
  } else {
    ctx.fillRect(bx, by, s, s)
  }
  ctx.globalAlpha = 1
}

/**
 * A bolt of lightning laid out by fx.boltGlyphs, as blocks: a cyan glow round a white core down
 * the main channel, and dimmer forks. toX and toY turn its positions into CSS pixels.
 */
export function pixelBolt (ctx, glyphs, { size, alpha = 1, toX, toY }) {
  if (alpha <= 0) return
  const s = Math.max(2, Math.round(size))
  ctx.save()
  for (const pass of [0, 1]) {
    for (const g of glyphs) {
      if (pass && g.fork) continue
      const x = Math.round(toX(g.x))
      const y = Math.round(toY(g.y))
      ctx.globalAlpha = alpha * (g.fork ? 0.55 : 1)
      ctx.fillStyle = pass ? PAL.w : PAL.C
      const k = pass ? s : s * 2
      ctx.fillRect(x - Math.round(k / 2), y - Math.round(k / 2), k, k)
    }
  }
  ctx.restore()
}
