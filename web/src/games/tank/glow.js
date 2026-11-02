// The glowing look Tank and Neon Laps share: soft blobs of light (or smoke) and the particles
// of their effects (see tank/effects.js), drawn in world units on a canvas already set up for
// them.

const rgbOf = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
export const rgba = (hex, a) => `rgba(${rgbOf(hex).join(', ')}, ${a})`
export const shade = (hex, f) => `rgb(${rgbOf(hex).map(v => Math.round(v * f)).join(', ')})`

// Soft round blobs of light (or of smoke), painted once per color and stretched to any size
const blobs = new Map()
export function blobOf (color, kind) {
  const key = `${color}${kind}`
  let sprite = blobs.get(key)
  if (!sprite) {
    sprite = document.createElement('canvas')
    sprite.width = sprite.height = 96
    const g = sprite.getContext('2d')
    const gradient = g.createRadialGradient(48, 48, 0, 48, 48, 48)
    if (kind === 'smoke') {
      gradient.addColorStop(0, rgba(color, 0.9))
      gradient.addColorStop(0.5, rgba(color, 0.45))
    } else {
      gradient.addColorStop(0, rgba(color, 1))
      gradient.addColorStop(0.22, rgba(color, 0.65))
    }
    gradient.addColorStop(1, rgba(color, 0))
    g.fillStyle = gradient
    g.fillRect(0, 0, 96, 96)
    blobs.set(key, sprite)
  }
  return sprite
}

/** A blob `size` across, centred on (x, y). */
export function drawBlob (ctx, color, x, y, size, alpha, kind = 'glow') {
  if (alpha <= 0.004 || size <= 0) return
  const before = ctx.globalAlpha
  ctx.globalAlpha = Math.min(1, alpha)
  ctx.drawImage(blobOf(color, kind), x - size / 2, y - size / 2, size, size)
  ctx.globalAlpha = before
}

/** Every particle in the list (see tank/effects.js for the kinds). */
export function drawParticles (ctx, list) {
  // Smoke and scraps of metal, then everything that glows, added on top
  for (const p of list) {
    const k = p.life / p.ttl
    if (p.kind === 'smoke') {
      const age = p.ttl - p.life
      drawBlob(ctx, p.color, p.x, p.y, p.size + p.grow * age, p.alpha * k * Math.min(1, age / 0.08), 'smoke')
    } else if (p.kind === 'chunk') {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.angle || 0)
      ctx.globalAlpha = Math.min(1, k * 3)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6)
      ctx.restore()
    }
  }
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  for (const p of list) {
    const k = p.life / p.ttl
    if (p.kind === 'flash') drawBlob(ctx, p.color, p.x, p.y, p.size, k * k)
    else if (p.kind === 'fire') drawBlob(ctx, p.color, p.x, p.y, p.size * (0.35 + 0.65 * k), Math.min(1, k * 1.6))
    else if (p.kind === 'chunk' && p.glow) drawBlob(ctx, p.color, p.x, p.y, p.size * 2.4, k * 0.6)
    else if (p.kind === 'plus') {
      const s = p.size * 0.5
      ctx.globalAlpha = Math.min(1, k * 1.5)
      ctx.strokeStyle = p.color
      ctx.lineWidth = p.size * 0.3
      ctx.beginPath()
      ctx.moveTo(p.x - s, p.y)
      ctx.lineTo(p.x + s, p.y)
      ctx.moveTo(p.x, p.y - s)
      ctx.lineTo(p.x, p.y + s)
      ctx.stroke()
    } else if (p.kind === 'spark') {
      ctx.globalAlpha = k
      ctx.strokeStyle = p.color
      ctx.lineWidth = 0.13
      ctx.beginPath()
      ctx.moveTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
    } else if (p.kind === 'ring') {
      ctx.globalAlpha = k
      ctx.strokeStyle = p.color
      ctx.lineWidth = 0.08 + 0.22 * k
      ctx.beginPath()
      ctx.arc(p.x, p.y, Math.max(0.05, p.size + p.grow * (p.ttl - p.life)), 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  ctx.lineCap = 'butt'
}
