// The phosphor look shared by the ASCII arcade games. Everything is made of characters,
// pre-rendered once at the screen's full pixel density with the glow baked in, then drawn at
// fractional positions, so motion stays smooth and the glyphs stay sharp.

export const GREEN = '#00ff00'
export const DIM = '#00b300'
export const LOW = '#007a00'
export const GLOW = 'rgba(0, 255, 0, 0.45)'
export const MONO = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace'
export const DISPLAY = '"VT323", "JetBrains Mono", monospace'

// Fonts the canvas draws with. Sprites are painted with whatever is loaded, so games paint
// them again once these have arrived.
export const CANVAS_FONTS = ['600 16px "JetBrains Mono"', '700 16px "JetBrains Mono"', '16px "VT323"']

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
export function paint (lines, colorOf, { cw, rh, glow, weight = 600, scale = 1, halo = 0, pivot = null }) {
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
  ctx.font = `${weight} ${rh * scale}px ${MONO}`
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

/** Draws a sprite with its pivot at (x, y) CSS pixels, turned by `angle` radians. */
export function drawSprite (ctx, sprite, x, y, { angle = 0, alpha = 1, dpr = 1 } = {}) {
  const { canvas, cx, cy } = sprite
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  if (angle) ctx.rotate(angle)
  ctx.drawImage(canvas, -cx / dpr, -cy / dpr, canvas.width / dpr, canvas.height / dpr)
  ctx.restore()
}

/** Text centered on (x, y) CSS pixels, px tall. A black outline keeps it readable over anything. */
export function drawText (ctx, str, x, y, { px, dpr = 1, display = false, color = GREEN, alpha = 1, glow = true, outline = true }) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.font = display ? `${px}px ${DISPLAY}` : `600 ${px}px ${MONO}`
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
