// The phosphor look shared by the ASCII arcade games. Everything is made of characters,
// pre-rendered once at the screen's full pixel density with the glow baked in, then drawn at
// fractional positions, so motion stays smooth and the glyphs stay sharp.

export const GREEN = '#00ff00'
export const DIM = '#00b300'
export const LOW = '#007a00'
export const DEEP = '#002600'
// Phosphor driven past full brightness, for the core of a lightning bolt
export const HOT = '#c8ffc8'
export const GLOW = 'rgba(0, 255, 0, 0.45)'
export const MONO = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace'
export const DISPLAY = '"VT323", "JetBrains Mono", monospace'
// Kanji and kana: a dot-matrix Japanese font (see useJapaneseFont), and the smooth gothic each
// system has for text that should look printed
export const JP = '"DotGothic16", "JetBrains Mono", monospace'
export const JP_PRINT = '"Hiragino Sans", "Yu Gothic", "YuGothic", "Meiryo", "Noto Sans JP", "Noto Sans CJK JP", sans-serif'

// Fonts the canvas draws with. Sprites are painted with whatever is loaded, so games paint
// them again once these have arrived.
export const CANVAS_FONTS = ['600 16px "JetBrains Mono"', '700 16px "JetBrains Mono"', '16px "VT323"']

/**
 * Calls `onLoad` once the canvas fonts have arrived, and again whenever more fonts finish
 * loading later, so sprites first painted with a fallback font get painted again. A font can
 * be [font, text] to load the part of a large font that covers that text. Returns a function
 * that stops listening.
 */
export function watchFonts (onLoad, fonts = CANVAS_FONTS) {
  const load = (font) => (Array.isArray(font) ? document.fonts?.load(font[0], font[1]) : document.fonts?.load(font))
  Promise.all(fonts.map(load)).then(() => onLoad(), () => {})
  const onDone = () => onLoad()
  document.fonts?.addEventListener?.('loadingdone', onDone)
  return () => document.fonts?.removeEventListener?.('loadingdone', onDone)
}

const JP_CSS = 'https://fonts.googleapis.com/css2?family=DotGothic16&display=swap'

/**
 * Brings in DotGothic16, a dot-matrix font with kanji and kana, the first time a game needs
 * it. It's large, so it isn't part of the page for everyone; Google Fonts only sends the
 * pieces that cover the characters in use.
 */
export function useJapaneseFont (text = '') {
  if (document.querySelector(`link[href="${JP_CSS}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = JP_CSS
  // Drawing on a canvas doesn't fetch a font, so ask for the characters the game paints
  if (text) link.onload = () => document.fonts?.load('16px "DotGothic16"', text).catch(() => {})
  document.head.appendChild(link)
}

// Repeats a tile of text rows out to `width` columns
export const tileOut = (tile, width) => tile.map(line => line.repeat(Math.ceil(width / line.length)).slice(0, width))

export const truncate = (text, max) => (text.length > max ? text.slice(0, max - 1) + '~' : text)

/**
 * Paints rows of text one character per cell, so the grid holds whatever the font's metrics.
 * cw and rh are the cell size in device pixels; `scale` enlarges the glyphs within their cells
 * and `halo` puts a soft phosphor bloom of that strength behind them. `pivot` is the cell
 * position [col, row] the sprite is drawn and turned around (its middle by default).
 * Returns { canvas, pad, cx, cy } with the pivot at (cx, cy) device pixels.
 */
export function paint (lines, colorOf, { cw, rh, glow, weight = 600, scale = 1, halo = 0, pivot = null, font = MONO }) {
  const pad = Math.ceil(glow * 2) + Math.ceil(rh * (scale - 1)) + 1
  const cols = Math.max(...lines.map(line => line.length))
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(cols * cw + pad * 2)
  canvas.height = Math.ceil(lines.length * rh + pad * 2)
  const cx = pivot ? pad + pivot[0] * cw : canvas.width / 2
  const cy = pivot ? pad + pivot[1] * rh : canvas.height / 2
  const ctx = canvas.getContext('2d')
  if (halo) {
    // An ellipse that fades out before the canvas edges, so it never shows a hard border
    const radius = Math.min(cx, canvas.width - cx)
    const bloom = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
    bloom.addColorStop(0, `rgba(0, 255, 0, ${halo})`)
    bloom.addColorStop(1, 'rgba(0, 255, 0, 0)')
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1, Math.min(cy, canvas.height - cy) / radius)
    ctx.fillStyle = bloom
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2)
    ctx.restore()
  }
  ctx.font = `${weight} ${rh * scale}px ${font}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (glow) {
    ctx.shadowColor = GLOW
    ctx.shadowBlur = glow
  }
  lines.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) {
      const ch = line[col]
      if (ch === ' ') continue
      ctx.fillStyle = colorOf(ch, col, row, line)
      ctx.fillText(ch, pad + (col + 0.5) * cw, pad + (row + 0.5) * rh)
    }
  })
  return { canvas, pad, cx, cy }
}

/** Draws a sprite with its pivot at (x, y) CSS pixels, turned by `angle` radians and grown by `scale`. */
export function drawSprite (ctx, sprite, x, y, { angle = 0, alpha = 1, dpr = 1, scale = 1 } = {}) {
  const { canvas, cx, cy } = sprite
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  if (angle) ctx.rotate(angle)
  if (scale !== 1) ctx.scale(scale, scale)
  ctx.drawImage(canvas, -cx / dpr, -cy / dpr, canvas.width / dpr, canvas.height / dpr)
  ctx.restore()
}

/** One character centered on (x, y) CSS pixels, px tall, with no glow: quick enough for particles. */
export function drawGlyph (ctx, ch, x, y, { px, color = GREEN, alpha = 1, angle = 0, font = MONO, weight = 600 }) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  if (angle) ctx.rotate(angle)
  ctx.font = `${weight} ${px}px ${font}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.fillText(ch, 0, 0)
  ctx.restore()
}

/**
 * Text centered on (x, y) CSS pixels, px tall. A black outline keeps it readable over anything.
 * `font` sets any other font family, such as JP for kanji.
 */
export function drawText (ctx, str, x, y, { px, dpr = 1, display = false, font = null, color = GREEN, alpha = 1, glow = true, outline = true }) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.font = font ? `${px}px ${font}` : display ? `${px}px ${DISPLAY}` : `600 ${px}px ${MONO}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (outline) {
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(2, px * 0.16)
    ctx.strokeStyle = '#000'
    ctx.strokeText(str, x, y)
  }
  if (glow) {
    ctx.shadowColor = GLOW
    ctx.shadowBlur = Math.max(2, px * 0.15) * dpr
  }
  ctx.fillStyle = color
  ctx.fillText(str, x, y)
  ctx.restore()
}
