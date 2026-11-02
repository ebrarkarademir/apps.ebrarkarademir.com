import { W, H, TANK_R, BARREL, PAD_R, GIFT_R, mapOf } from './engine'
import { SHIELD_COLOR, REPAIR_COLOR, PAD_COLOR, FIRE } from './effects'
import { rgba, shade, drawBlob, drawParticles as paintParticles } from './glow'
import { GREEN, GLOW, MONO, drawText, truncate } from '../ascii/paint'
import { mulberry32 } from '../ascii/random'

// Draws Tank on a canvas in glowing vector lines, phosphor on black like the rest of the
// arcade. The floor, walls and teleporter bases are painted once per map and size into a layer
// of their own, and scorch marks are stamped onto it as they happen; everything that moves is
// drawn on top every frame.
//
// On a screen taller than it is wide the arena stands on end (`turn`): the world turns a
// quarter clockwise, while text stays upright.

// Every tank's own color, the same on every screen, and its shells' too. None is green, so
// tanks stand out against the walls; your own tank has a marker over it instead.
export const TANK_COLORS = ['#4da3ff', '#ff5f5f', '#ffd23f', '#f2f6ea', '#ff7ad9', '#ff9a3c', '#b48cff', '#3fe0d0']
export const GIFT_COLORS = { shield: SHIELD_COLOR, speed: '#ffb000', power: '#ff5c5c', repair: REPAIR_COLOR }

const TAU = Math.PI * 2
const FLOOR = '#051207'
const TRACK_SIDE = 1.27 // how far each tread runs from the middle of the tank

const easeOutBack = (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2)

// A tank's colors, dimmer and dirtier the more damage it has taken
const palettes = new Map()
function paletteOf (color, damage) {
  const key = `${color}${damage}`
  let p = palettes.get(key)
  if (!p) {
    const f = [1, 0.8, 0.62, 0.46][damage] ?? 1
    p = {
      line: shade(color, f),
      body: shade(color, 0.28 * f),
      turret: shade(color, 0.4 * f),
      detail: rgba(color, 0.5 * f),
      link: shade(color, 0.42 * f),
      tread: '#0a0f0a'
    }
    palettes.set(key, p)
  }
  return p
}

// Where each tank's damage goes: the same scorch marks, scratches and flames on it every frame,
// different from tank to tank
const layouts = new Map()
function layoutOf (seed) {
  let l = layouts.get(seed)
  if (!l) {
    const r = mulberry32(seed)
    const on = (w, h) => [(r() * 2 - 1) * w, (r() * 2 - 1) * h]
    l = {
      scorch: Array.from({ length: 7 }, () => {
        const [x, y] = on(1.25, 0.85)
        return { x, y, s: 0.75 + r() * 0.6 }
      }),
      scratches: Array.from({ length: 5 }, () => {
        const [x, y] = on(1.2, 0.8)
        const a = r() * TAU
        const len = 0.35 + r() * 0.5
        return [x, y, x + Math.cos(a) * len, y + Math.sin(a) * len]
      }),
      crack: (() => {
        const a = r() * TAU
        return Array.from({ length: 5 }, (_, i) => {
          const d = -0.75 + i * 0.37
          const side = (i % 2 ? 1 : -1) * 0.12
          return [-0.12 + Math.cos(a) * d - Math.sin(a) * side, Math.sin(a) * d + Math.cos(a) * side]
        })
      })(),
      gapSide: r() < 0.5 ? -1 : 1,
      gapX: -1.3 + r() * 1.9,
      flames: Array.from({ length: 3 }, () => {
        const [x, y] = on(1.05, 0.65)
        return { x, y, p: r() * TAU }
      }),
      turret: { x: -0.5 + r() * 0.5, y: (r() - 0.5) * 1.3, a: (r() - 0.5) * 2.6 }
    }
    layouts.set(seed, l)
  }
  return l
}

export function createRenderer (canvas) {
  const ctx = canvas.getContext('2d')
  let width = 0 // CSS pixels
  let height = 0
  let dpr = 1
  let unit = 0 // CSS pixels per unit
  let turn = false
  let map = 0
  let arena = null
  const marks = [] // scorch marks, to stamp again when the arena is painted afresh

  // World units to device pixels on canvas `g`, nudged by (sx, sy) CSS pixels
  function toWorld (g, sx = 0, sy = 0) {
    const k = unit * dpr
    if (turn) g.setTransform(0, k, -k, 0, k * H + sx * dpr, sy * dpr)
    else g.setTransform(k, 0, 0, k, sx * dpr, sy * dpr)
  }
  const toScreen = (x, y) => (turn ? [(H - y) * unit, x * unit] : [x * unit, y * unit])

  const blob = (color, x, y, size, alpha, kind = 'glow') => drawBlob(ctx, color, x, y, size, alpha, kind)

  function roundRect (g, x, y, w, h, r) {
    g.beginPath()
    g.moveTo(x + r, y)
    g.arcTo(x + w, y, x + w, y + h, r)
    g.arcTo(x + w, y + h, x, y + h, r)
    g.arcTo(x, y + h, x, y, r)
    g.arcTo(x, y, x + w, y, r)
    g.closePath()
  }

  function hexagon (r, turnBy = Math.PI / 6) {
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const a = turnBy + (i / 6) * TAU
      if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    ctx.closePath()
  }

  // ---------- The arena layer ----------

  function paintFloor (g) {
    const random = mulberry32(4242 + map * 101)
    g.fillStyle = FLOOR
    g.fillRect(0, 0, W, H)
    // Steel plates ten units across, each a slightly different shade
    for (let x = 0; x < W; x += 10) {
      for (let y = 0; y < H; y += 10) {
        g.fillStyle = `rgba(90, 255, 90, ${0.012 + random() * 0.03})`
        g.fillRect(x, y, 10, 10)
      }
    }
    // A fine grid, then the seams between the plates with a lit edge
    g.beginPath()
    for (let x = 2; x < W; x += 2) { g.moveTo(x, 0); g.lineTo(x, H) }
    for (let y = 2; y < H; y += 2) { g.moveTo(0, y); g.lineTo(W, y) }
    g.lineWidth = 0.05
    g.strokeStyle = 'rgba(0, 255, 0, 0.05)'
    g.stroke()
    g.beginPath()
    for (let x = 10; x < W; x += 10) { g.moveTo(x, 0); g.lineTo(x, H) }
    for (let y = 10; y < H; y += 10) { g.moveTo(0, y); g.lineTo(W, y) }
    g.lineWidth = 0.2
    g.strokeStyle = 'rgba(0, 0, 0, 0.75)'
    g.stroke()
    g.beginPath()
    for (let x = 10; x < W; x += 10) { g.moveTo(x + 0.14, 0); g.lineTo(x + 0.14, H) }
    for (let y = 10; y < H; y += 10) { g.moveTo(0, y + 0.14); g.lineTo(W, y + 0.14) }
    g.lineWidth = 0.06
    g.strokeStyle = 'rgba(0, 255, 0, 0.09)'
    g.stroke()
    // Bolts in the plates' corners
    g.fillStyle = 'rgba(0, 255, 0, 0.16)'
    for (let x = 0; x < W; x += 10) {
      for (let y = 0; y < H; y += 10) {
        for (const [bx, by] of [[0.7, 0.7], [9.3, 0.7], [0.7, 9.3], [9.3, 9.3]]) {
          g.beginPath()
          g.arc(x + bx, y + by, 0.13, 0, TAU)
          g.fill()
        }
      }
    }
    // Oil stains
    for (let i = 0; i < 12; i++) {
      const x = random() * W
      const y = random() * H
      const r = 1.2 + random() * 2.4
      const stain = g.createRadialGradient(x, y, 0, x, y, r)
      stain.addColorStop(0, 'rgba(0, 0, 0, 0.4)')
      stain.addColorStop(1, 'rgba(0, 0, 0, 0)')
      g.fillStyle = stain
      g.fillRect(x - r, y - r, r * 2, r * 2)
    }
    // Cracks wandering across the plates
    for (let i = 0; i < 16; i++) {
      let x = random() * W
      let y = random() * H
      let a = random() * TAU
      const points = [[x, y]]
      for (let j = 0, n = 4 + Math.floor(random() * 6); j < n; j++) {
        a += (random() - 0.5) * 1.4
        const len = 0.5 + random() * 1.1
        x += Math.cos(a) * len
        y += Math.sin(a) * len
        points.push([x, y])
      }
      for (const [color, width, shift] of [['rgba(0, 0, 0, 0.7)', 0.1, 0], ['rgba(0, 255, 0, 0.06)', 0.05, 0.1]]) {
        g.beginPath()
        points.forEach(([px, py], j) => (j ? g.lineTo(px + shift, py + shift) : g.moveTo(px + shift, py + shift)))
        g.lineWidth = width
        g.strokeStyle = color
        g.stroke()
      }
    }
    // Dust
    for (let i = 0; i < 320; i++) {
      g.fillStyle = `rgba(120, 255, 120, ${0.04 + random() * 0.1})`
      g.fillRect(random() * W, random() * H, 0.12, 0.12)
    }
  }

  function paintPads (g) {
    for (const pad of mapOf(map).pads) {
      const reach = PAD_R + 2.2
      const glow = g.createRadialGradient(pad.x, pad.y, 0, pad.x, pad.y, reach)
      glow.addColorStop(0, rgba(PAD_COLOR, 0.22))
      glow.addColorStop(1, rgba(PAD_COLOR, 0))
      g.fillStyle = glow
      g.fillRect(pad.x - reach, pad.y - reach, reach * 2, reach * 2)
      g.beginPath()
      g.arc(pad.x, pad.y, PAD_R, 0, TAU)
      g.fillStyle = '#0d0716'
      g.fill()
      g.lineWidth = 0.15
      g.strokeStyle = rgba(PAD_COLOR, 0.7)
      g.stroke()
      // Marks round the rim
      g.beginPath()
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU
        g.moveTo(pad.x + Math.cos(a) * (PAD_R + 0.25), pad.y + Math.sin(a) * (PAD_R + 0.25))
        g.lineTo(pad.x + Math.cos(a) * (PAD_R + 0.65), pad.y + Math.sin(a) * (PAD_R + 0.65))
      }
      g.lineWidth = 0.13
      g.strokeStyle = rgba(PAD_COLOR, 0.5)
      g.stroke()
      for (const [r, a] of [[PAD_R * 0.7, 0.35], [PAD_R * 0.38, 0.55]]) {
        g.beginPath()
        g.arc(pad.x, pad.y, r, 0, TAU)
        g.lineWidth = 0.08
        g.strokeStyle = rgba(PAD_COLOR, a)
        g.stroke()
      }
    }
  }

  // The parts of a wall's top edge no other wall covers, as [from, to] along x
  function openTop (w, walls) {
    let spans = [[w.x, w.x + w.w]]
    for (const o of walls) {
      if (o === w || !(o.y < w.y && o.y + o.h > w.y)) continue
      spans = spans.flatMap(([a, b]) => {
        if (o.x >= b || o.x + o.w <= a) return [[a, b]]
        return [[a, Math.max(a, o.x)], [Math.min(b, o.x + o.w), b]].filter(([p, q]) => q - p > 0.05)
      })
    }
    return spans
  }

  function paintWalls (g) {
    const { walls } = mapOf(map)
    const blocks = walls.slice(4)
    const k = unit * dpr
    // Shadows thrown down and to the right
    g.save()
    g.shadowColor = 'rgba(0, 0, 0, 0.9)'
    g.shadowBlur = 0.9 * k
    g.fillStyle = 'rgba(0, 0, 0, 0.7)'
    for (const w of blocks) g.fillRect(w.x + 0.35, w.y + 0.55, w.w, w.h)
    g.restore()
    // Glowing edges: stroked twice as thick as they show, and the walls filled over the inner
    // half, so where walls meet no line runs through them
    g.save()
    g.shadowColor = GLOW
    g.shadowBlur = 0.8 * k
    g.strokeStyle = GREEN
    g.lineWidth = 0.32
    for (const w of walls) g.strokeRect(w.x, w.y, w.w, w.h)
    g.restore()
    for (const w of walls) {
      const fill = g.createLinearGradient(0, w.y, 0, w.y + Math.max(w.h, 2))
      fill.addColorStop(0, '#0f3e13')
      fill.addColorStop(1, '#05200a')
      g.fillStyle = fill
      g.fillRect(w.x, w.y, w.w, w.h)
    }
    // Hatching, like walls cut through on a plan
    g.save()
    g.beginPath()
    for (const w of walls) g.rect(w.x, w.y, w.w, w.h)
    g.clip()
    g.beginPath()
    for (let d = -H; d < W; d += 0.8) { g.moveTo(d, 0); g.lineTo(d + H, H) }
    g.lineWidth = 0.1
    g.strokeStyle = 'rgba(0, 255, 0, 0.09)'
    g.stroke()
    g.restore()
    // The border: hazard stripes
    g.save()
    g.beginPath()
    for (const w of walls.slice(0, 4)) g.rect(w.x, w.y, w.w, w.h)
    g.clip()
    g.beginPath()
    for (let d = -H; d < W + H; d += 1.6) { g.moveTo(d, 0); g.lineTo(d - H, H) }
    g.lineWidth = 0.55
    g.strokeStyle = 'rgba(0, 255, 0, 0.16)'
    g.stroke()
    g.restore()
    // A lit top edge on each block, and rivets in its corners
    for (const w of blocks) {
      g.fillStyle = 'rgba(170, 255, 170, 0.14)'
      for (const [a, b] of openTop(w, walls)) g.fillRect(a, w.y, b - a, 0.24)
      g.fillStyle = 'rgba(120, 255, 120, 0.45)'
      for (const [cx, cy] of [[w.x + 0.5, w.y + 0.55], [w.x + w.w - 0.5, w.y + 0.55], [w.x + 0.5, w.y + w.h - 0.5], [w.x + w.w - 0.5, w.y + w.h - 0.5]]) {
        if (w.w < 1.6 && w.h < 1.6) continue
        const buried = walls.some(o => o !== w && cx > o.x - 0.3 && cx < o.x + o.w + 0.3 && cy > o.y - 0.3 && cy < o.y + o.h + 0.3)
        if (buried) continue
        g.beginPath()
        g.arc(cx, cy, 0.14, 0, TAU)
        g.fill()
      }
    }
  }

  // A scorch mark burnt into the floor; a crater where a tank went up
  function stamp (g, { x, y, size, crater, seed }) {
    const r = mulberry32(seed)
    const burn = g.createRadialGradient(x, y, 0, x, y, size)
    burn.addColorStop(0, `rgba(0, 0, 0, ${crater ? 0.92 : 0.8})`)
    burn.addColorStop(0.55, 'rgba(0, 0, 0, 0.5)')
    burn.addColorStop(1, 'rgba(0, 0, 0, 0)')
    g.fillStyle = burn
    g.beginPath()
    g.arc(x, y, size, 0, TAU)
    g.fill()
    g.beginPath()
    for (let i = 0, n = crater ? 16 : 9; i < n; i++) {
      const a = r() * TAU
      const from = size * (0.2 + r() * 0.2)
      const to = size * (0.8 + r() * 0.7)
      g.moveTo(x + Math.cos(a) * from, y + Math.sin(a) * from)
      g.lineTo(x + Math.cos(a) * to, y + Math.sin(a) * to)
    }
    g.lineWidth = 0.1
    g.strokeStyle = 'rgba(0, 0, 0, 0.55)'
    g.stroke()
    g.beginPath()
    g.arc(x, y, size * 0.72, 0, TAU)
    g.lineWidth = size * 0.1
    g.strokeStyle = 'rgba(170, 195, 160, 0.1)'
    g.stroke()
    if (crater) {
      g.fillStyle = 'rgba(150, 175, 140, 0.3)'
      for (let i = 0; i < 14; i++) {
        const a = r() * TAU
        const d = size * (0.5 + r() * 0.8)
        g.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, 0.15 + r() * 0.2, 0.15 + r() * 0.2)
      }
    }
  }

  function buildArena () {
    if (!width || !height) return
    arena = document.createElement('canvas')
    arena.width = canvas.width
    arena.height = canvas.height
    const g = arena.getContext('2d')
    toWorld(g)
    paintFloor(g)
    paintPads(g)
    paintWalls(g)
    for (const mark of marks) stamp(g, mark)
  }

  // ---------- What moves ----------

  // Tread marks, fading as they age, drawn in four bands of age
  function drawTracks (tracks, time, life) {
    if (!tracks.length) return
    ctx.lineWidth = 0.55
    for (let band = 0; band < 4; band++) {
      ctx.beginPath()
      let any = false
      for (const m of tracks) {
        const age = (time - m.t) / life
        if (age >= 1 || Math.min(3, Math.floor(age * 4)) !== band) continue
        any = true
        const c = Math.cos(m.a)
        const s = Math.sin(m.a)
        for (const side of [-TRACK_SIDE, TRACK_SIDE]) {
          const px = m.x - s * side
          const py = m.y + c * side
          ctx.moveTo(px - c * 0.17, py - s * 0.17)
          ctx.lineTo(px + c * 0.17, py + s * 0.17)
        }
      }
      if (!any) continue
      ctx.strokeStyle = `rgba(0, 0, 0, ${0.6 * (1 - band / 4)})`
      ctx.stroke()
    }
  }

  function drawPads (charges, time) {
    mapOf(map).pads.forEach((pad, i) => {
      const charge = charges[i] || 0
      ctx.save()
      ctx.translate(pad.x, pad.y)
      ctx.globalCompositeOperation = 'lighter'
      blob(PAD_COLOR, 0, 0, PAD_R * (3 + charge * 1.6), 0.16 + 0.06 * Math.sin(time * 2.4 + i) + charge * 0.35)
      ctx.globalCompositeOperation = 'source-over'
      ctx.rotate(time * (i % 2 ? -0.7 : 0.7))
      ctx.setLineDash([0.9, 0.55])
      ctx.lineWidth = 0.13
      ctx.strokeStyle = rgba(PAD_COLOR, 0.8)
      ctx.beginPath()
      ctx.arc(0, 0, PAD_R - 0.35, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
      // The swirl in the middle, faster as it charges
      ctx.rotate(-time * (2.2 + charge * 6))
      ctx.lineWidth = 0.15
      ctx.strokeStyle = rgba(PAD_COLOR, 0.6 + charge * 0.4)
      for (let j = 0; j < 3; j++) {
        ctx.beginPath()
        ctx.arc(0, 0, PAD_R * 0.5, (j / 3) * TAU, (j / 3) * TAU + 1.1)
        ctx.stroke()
      }
      ctx.restore()
      if (charge > 0) {
        ctx.beginPath()
        ctx.arc(pad.x, pad.y, PAD_R + 0.2, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, charge))
        ctx.lineWidth = 0.34
        ctx.lineCap = 'round'
        ctx.strokeStyle = '#f4dcff'
        ctx.stroke()
        ctx.lineCap = 'butt'
      }
    })
  }

  function drawIcon (kind, color) {
    ctx.fillStyle = color
    ctx.strokeStyle = color
    if (kind === 'shield') {
      ctx.beginPath()
      ctx.moveTo(0, -0.85)
      ctx.lineTo(0.72, -0.56)
      ctx.lineTo(0.64, 0.18)
      ctx.quadraticCurveTo(0.5, 0.66, 0, 0.92)
      ctx.quadraticCurveTo(-0.5, 0.66, -0.64, 0.18)
      ctx.lineTo(-0.72, -0.56)
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(0, -0.55)
      ctx.lineTo(0, 0.62)
      ctx.lineWidth = 0.13
      ctx.strokeStyle = '#05090a'
      ctx.stroke()
    } else if (kind === 'repair') {
      // A green + with a white edge
      ctx.beginPath()
      ctx.moveTo(-0.24, -0.82)
      for (const [x, y] of [[0.24, -0.82], [0.24, -0.24], [0.82, -0.24], [0.82, 0.24], [0.24, 0.24], [0.24, 0.82], [-0.24, 0.82], [-0.24, 0.24], [-0.82, 0.24], [-0.82, -0.24], [-0.24, -0.24]]) ctx.lineTo(x, y)
      ctx.closePath()
      ctx.lineJoin = 'round'
      ctx.lineWidth = 0.2
      ctx.strokeStyle = '#ffffff'
      ctx.stroke()
      ctx.fill()
      ctx.lineJoin = 'miter'
    } else if (kind === 'speed') {
      ctx.lineWidth = 0.3
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      for (const x of [-0.4, 0.25]) {
        ctx.beginPath()
        ctx.moveTo(x - 0.3, -0.62)
        ctx.lineTo(x + 0.3, 0)
        ctx.lineTo(x - 0.3, 0.62)
        ctx.stroke()
      }
      ctx.lineJoin = 'miter'
      ctx.lineCap = 'butt'
    } else {
      ctx.beginPath()
      for (let i = 0; i < 16; i++) {
        const r = i % 2 ? 0.4 : 0.95
        const a = (i / 16) * TAU - Math.PI / 2
        if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
        else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
      }
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.arc(0, 0, 0.24, 0, TAU)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
    }
  }

  function drawGift (gift, time) {
    const color = GIFT_COLORS[gift.kind] || '#ffffff'
    const scale = easeOutBack(Math.min(1, gift.age / 0.45))
    if (scale < 0.02) return
    const alpha = gift.left < 3 && Math.floor(time * 8) % 2 ? 0.3 : 1
    ctx.save()
    ctx.translate(gift.x, gift.y)
    ctx.globalCompositeOperation = 'lighter'
    blob(color, 0, 0, 6.5 * scale, (0.3 + 0.1 * Math.sin(time * 4)) * alpha)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = alpha
    ctx.save()
    ctx.rotate(time * 1.2)
    ctx.setLineDash([0.55, 0.4])
    ctx.lineWidth = 0.12
    ctx.strokeStyle = rgba(color, 0.85)
    ctx.beginPath()
    ctx.arc(0, 0, (GIFT_R + 0.45) * scale, 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
    // The box and its sign stay upright on screen
    if (turn) ctx.rotate(-Math.PI / 2)
    const s = scale * (1 + 0.05 * Math.sin(time * 5))
    ctx.scale(s, s)
    hexagon(GIFT_R)
    ctx.fillStyle = '#05090a'
    ctx.fill()
    ctx.fillStyle = rgba(color, 0.2)
    ctx.fill()
    ctx.lineWidth = 0.16
    // A repair kit is edged in white, with a second ring pulsing out of it, so it shows against
    // the green arena
    ctx.strokeStyle = gift.kind === 'repair' ? '#ffffff' : color
    ctx.stroke()
    if (gift.kind === 'repair') {
      const pulse = (time * 1.2) % 1
      hexagon(GIFT_R * (1 + pulse * 0.6))
      ctx.globalAlpha = alpha * (1 - pulse) * 0.8
      ctx.lineWidth = 0.1
      ctx.stroke()
      ctx.globalAlpha = alpha
    }
    drawIcon(gift.kind, color)
    ctx.restore()
  }

  // The dotted line from your barrel, in your tank's color: bigger, glowing dots while you have
  // power shots
  function drawAim (aim) {
    if (!aim?.points.length) return
    const n = aim.points.length
    const r = aim.power ? 0.28 : 0.19
    if (aim.power) {
      ctx.globalCompositeOperation = 'lighter'
      aim.points.forEach((point, i) => blob(aim.color, point.x, point.y, 1.3, (point.bounced ? 0.25 : 0.5) * (1 - i / n)))
      ctx.globalCompositeOperation = 'source-over'
    }
    ctx.fillStyle = aim.color
    aim.points.forEach((point, i) => {
      ctx.globalAlpha = (point.bounced ? 0.35 : 0.85) * (1 - i / n)
      ctx.beginPath()
      ctx.arc(point.x, point.y, r, 0, TAU)
      ctx.fill()
    })
    ctx.globalAlpha = 1
  }

  function drawDamage (t, layout, time) {
    const d = t.damage
    for (const spot of layout.scorch.slice(0, [0, 3, 5, 7][d])) blob('#000000', spot.x, spot.y, spot.s * (d >= 3 ? 1.45 : 1.2), 0.9 * t.alpha, 'smoke')
    ctx.beginPath()
    for (const [x0, y0, x1, y1] of layout.scratches.slice(0, d >= 2 ? 5 : 3)) {
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
    }
    ctx.lineWidth = 0.05
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'
    ctx.stroke()
    if (d >= 2) {
      // A crack across the turret and a broken stretch of track
      ctx.beginPath()
      layout.crack.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      ctx.lineWidth = 0.1
      ctx.strokeStyle = '#000'
      ctx.stroke()
      const y0 = layout.gapSide < 0 ? -1.62 : 0.92
      ctx.fillStyle = '#000'
      ctx.fillRect(layout.gapX, y0, 0.55, 0.72)
      ctx.beginPath()
      ctx.moveTo(layout.gapX + 0.55, y0 + 0.36)
      ctx.lineTo(layout.gapX + 0.2, y0 + (layout.gapSide < 0 ? -0.3 : 1.02))
      ctx.lineWidth = 0.11
      ctx.strokeStyle = '#3c423c'
      ctx.stroke()
    }
    if (d >= 3) {
      // Burning: flames licking over the hull
      ctx.globalCompositeOperation = 'lighter'
      layout.flames.forEach((f, i) => {
        const flick = 0.7 + 0.3 * Math.sin(time * (16 + i * 3) + f.p) * Math.sin(time * 7 + f.p * 2)
        blob(FIRE[3], f.x, f.y, 1.7 * flick + 0.4, 0.8 * t.alpha)
        blob(FIRE[1], f.x, f.y, 1 * flick, 0.9 * t.alpha)
        blob(FIRE[0], f.x, f.y, 0.45 * flick, t.alpha)
      })
      ctx.globalCompositeOperation = 'source-over'
    }
  }

  // A tank seen from above, facing right before it's turned: two treads, the hull, the barrel
  // and the turret over it, then its damage
  function drawTank (t, time) {
    const pal = paletteOf(t.color, t.damage)
    const a = t.alpha
    ctx.save()
    ctx.translate(t.x, t.y)
    ctx.globalCompositeOperation = 'lighter'
    blob(t.color, 0, 0, t.me ? 10 : 8, (t.me ? 0.2 : 0.12) * a)
    if (t.fast) blob(GIFT_COLORS.speed, 0, 0, 9, 0.16 * a)
    ctx.globalCompositeOperation = 'source-over'
    ctx.rotate(t.a)
    // Speed: flames out of the exhausts, longer while it drives, and streaks behind
    if (t.fast) {
      ctx.globalCompositeOperation = 'lighter'
      const flick = 0.75 + 0.25 * Math.sin(time * 40 + t.seed)
      const reach = t.moving ? 1.6 : 0.7
      for (const side of [-0.55, 0.55]) {
        blob(FIRE[2], -1.9 - reach * 0.5, side, 1.4 * reach * flick + 0.6, 0.75 * a)
        blob(FIRE[0], -1.85, side, 0.7, 0.9 * a)
      }
      if (t.moving) {
        ctx.beginPath()
        for (const y of [-1.6, 0, 1.6]) {
          const off = (time * 30 + y * 7 + 10) % 1.6
          ctx.moveTo(-2.4 - off, y)
          ctx.lineTo(-3.9 - off, y)
        }
        ctx.lineWidth = 0.1
        ctx.strokeStyle = rgba(GIFT_COLORS.speed, 0.5 * a)
        ctx.stroke()
      }
      ctx.globalCompositeOperation = 'source-over'
    }
    ctx.globalAlpha = a
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    roundRect(ctx, -1.5, -1.25, 3.6, 3.2, 0.5)
    ctx.fill()
    for (const side of [-1, 1]) {
      const y0 = side < 0 ? -1.6 : 0.94
      roundRect(ctx, -1.85, y0, 3.7, 0.66, 0.28)
      ctx.fillStyle = pal.tread
      ctx.fill()
      ctx.lineWidth = 0.08
      ctx.strokeStyle = pal.link
      ctx.stroke()
      const phase = (((side < 0 ? t.treadL : t.treadR) % 0.42) + 0.42) % 0.42
      ctx.beginPath()
      for (let x = -1.8 + phase; x < 1.8; x += 0.42) {
        ctx.moveTo(x, y0 + 0.1)
        ctx.lineTo(x, y0 + 0.56)
      }
      ctx.lineWidth = 0.11
      ctx.stroke()
    }
    roundRect(ctx, -1.55, -1.02, 3.1, 2.04, 0.36)
    ctx.fillStyle = pal.body
    ctx.fill()
    ctx.lineWidth = 0.13
    ctx.strokeStyle = pal.line
    ctx.stroke()
    // The front plate and the engine grille
    ctx.beginPath()
    ctx.moveTo(1.02, -0.86)
    ctx.lineTo(1.02, 0.86)
    for (let i = 0; i < 4; i++) {
      const y = -0.5 + i * 0.33
      ctx.moveTo(-1.38, y)
      ctx.lineTo(-0.98, y)
    }
    ctx.lineWidth = 0.07
    ctx.strokeStyle = pal.detail
    ctx.stroke()
    // The barrel, kicked back by a shot, bent on a tank about to go
    ctx.save()
    if (t.damage >= 3) ctx.rotate(0.07)
    const kick = t.recoil * 0.5
    ctx.fillStyle = pal.turret
    ctx.strokeStyle = pal.line
    ctx.lineWidth = 0.08
    ctx.beginPath()
    ctx.rect(0.4 - kick, -0.19, BARREL - 0.84, 0.38)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.rect(BARREL - 0.46 - kick, -0.27, 0.46, 0.54)
    if (t.power) ctx.fillStyle = GIFT_COLORS.power
    ctx.fill()
    ctx.stroke()
    if (t.power) {
      ctx.globalCompositeOperation = 'lighter'
      blob(GIFT_COLORS.power, BARREL - 0.2 - kick, 0, 1.9 + 0.3 * Math.sin(time * 9), 0.8 * a)
      ctx.globalCompositeOperation = 'source-over'
    }
    ctx.restore()
    ctx.beginPath()
    ctx.arc(-0.12, 0, 0.86, 0, TAU)
    ctx.fillStyle = pal.turret
    ctx.fill()
    ctx.lineWidth = 0.12
    ctx.strokeStyle = pal.line
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(-0.42, 0.3, 0.24, 0, TAU)
    ctx.lineWidth = 0.07
    ctx.strokeStyle = pal.detail
    ctx.stroke()
    // Power shots left: lamps round the back of the turret
    if (t.power) {
      const n = Math.min(6, t.power)
      ctx.fillStyle = GIFT_COLORS.power
      for (let i = 0; i < n; i++) {
        const ang = Math.PI + (i - (n - 1) / 2) * 0.42
        ctx.beginPath()
        ctx.arc(-0.12 + Math.cos(ang) * 0.6, Math.sin(ang) * 0.6, 0.1, 0, TAU)
        ctx.fill()
      }
    }
    if (t.damage) drawDamage(t, layoutOf(t.seed), time)
    // Just hit: a white flash
    if (t.flash > 0) {
      ctx.globalCompositeOperation = 'lighter'
      blob('#ffffff', 0, 0, 6, t.flash * 0.75)
      roundRect(ctx, -1.55, -1.02, 3.1, 2.04, 0.36)
      ctx.globalAlpha = t.flash
      ctx.lineWidth = 0.18
      ctx.strokeStyle = '#ffffff'
      ctx.stroke()
      ctx.globalCompositeOperation = 'source-over'
    }
    ctx.restore()
  }

  // What's left of a tank: burnt out, the turret blown off its ring, burning for a while
  function drawWreck (t, time) {
    const layout = layoutOf(t.seed)
    ctx.save()
    ctx.translate(t.x, t.y)
    ctx.rotate(t.a)
    ctx.fillStyle = '#0d100d'
    roundRect(ctx, -1.85, -1.6, 3.7, 0.66, 0.28)
    ctx.fill()
    roundRect(ctx, -1.55, 0.94, 3, 0.66, 0.28)
    ctx.fill()
    roundRect(ctx, -1.55, -1.02, 3.1, 2.04, 0.36)
    ctx.fillStyle = '#131713'
    ctx.fill()
    ctx.lineWidth = 0.1
    ctx.strokeStyle = shade(t.color, 0.28)
    ctx.stroke()
    for (const spot of layout.scorch) blob('#000000', spot.x, spot.y, spot.s * 1.3, 0.9, 'smoke')
    ctx.save()
    ctx.translate(layout.turret.x, layout.turret.y)
    ctx.rotate(layout.turret.a)
    ctx.fillStyle = '#191d19'
    ctx.strokeStyle = shade(t.color, 0.32)
    ctx.lineWidth = 0.08
    ctx.beginPath()
    ctx.rect(0.3, -0.17, BARREL - 1.2, 0.34)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, 0, 0.8, 0, TAU)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
    const heat = Math.max(0, 1 - t.diedAge / 7)
    if (heat > 0) {
      ctx.globalCompositeOperation = 'lighter'
      layout.flames.forEach((f, i) => {
        const flick = 0.7 + 0.3 * Math.sin(time * (14 + i * 3) + f.p)
        blob(FIRE[3], f.x, f.y, (2 * flick + 0.5) * heat, 0.8)
        blob(FIRE[1], f.x, f.y, 1.1 * flick * heat, 0.9)
      })
      ctx.globalCompositeOperation = 'source-over'
    }
    ctx.restore()
  }

  function drawShield (t, time) {
    const r = TANK_R + 1.2
    ctx.save()
    ctx.translate(t.x, t.y)
    ctx.globalCompositeOperation = 'lighter'
    blob(SHIELD_COLOR, 0, 0, r * 2.5, (0.16 + 0.05 * Math.sin(time * 3)) * t.alpha)
    ctx.rotate(time * 0.6)
    hexagon(r)
    ctx.lineWidth = 0.15
    ctx.strokeStyle = rgba(SHIELD_COLOR, 0.85 * t.alpha)
    ctx.stroke()
    ctx.rotate(-time * 1.4)
    hexagon(r * 0.86)
    ctx.lineWidth = 0.06
    ctx.strokeStyle = rgba(SHIELD_COLOR, 0.35 * t.alpha)
    ctx.stroke()
    const glint = time * 2.5
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.93, glint, glint + 0.7)
    ctx.lineWidth = 0.2
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * t.alpha})`
    ctx.stroke()
    ctx.restore()
  }

  function drawShells (shells) {
    if (!shells.length) return
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineCap = 'round'
    // Shells glow in their tank's color; a power shell is bigger, with a white-hot heart
    for (const s of shells) {
      const points = [...s.trail, s]
      for (let i = 1; i < points.length; i++) {
        const f = i / (points.length - 1)
        ctx.globalAlpha = (s.power ? 0.7 : 0.55) * f
        ctx.lineWidth = (s.power ? 0.72 : 0.34) * f
        ctx.strokeStyle = s.color
        ctx.beginPath()
        ctx.moveTo(points[i - 1].x, points[i - 1].y)
        ctx.lineTo(points[i].x, points[i].y)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      blob(s.color, s.x, s.y, s.power ? 4.2 : 2.3, s.power ? 1 : 0.85)
      if (s.power) blob('#ffffff', s.x, s.y, 1.5, 0.7)
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.lineCap = 'butt'
    ctx.fillStyle = '#ffffff'
    for (const s of shells) {
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.power ? 0.33 : 0.21, 0, TAU)
      ctx.fill()
    }
  }

  const drawParticles = (list) => paintParticles(ctx, list)

  // ---------- Text, upright on screen ----------

  // Names over the tanks, and an arrow over your own (with YOU over it as the round starts).
  // Near the top edge they go under the tank instead.
  function drawLabels (tanks, time) {
    const px = Math.max(10, unit * 0.95)
    const arrow = Math.max(4, unit * 0.6) // half the arrow's width
    for (const t of tanks) {
      if (!t.alive || (!t.label && !t.me)) continue
      const [sx, sy] = toScreen(t.x, t.y)
      const reach = (TANK_R + 1) * unit
      const tall = (t.me ? arrow * 1.6 : 0) + (t.label ? px * 1.3 : 0)
      const side = sy - reach - tall < 0 ? -1 : 1 // 1: above the tank, -1: under it
      let y = sy - side * reach
      if (t.me) {
        const tip = y - side * Math.sin(time * 5) * arrow * 0.3
        const base = tip - side * arrow * 1.3
        ctx.beginPath()
        ctx.moveTo(sx, tip)
        ctx.lineTo(sx - arrow, base)
        ctx.lineTo(sx + arrow, base)
        ctx.closePath()
        ctx.lineJoin = 'round'
        ctx.lineWidth = 3
        ctx.strokeStyle = '#000'
        ctx.stroke()
        ctx.fillStyle = t.color
        ctx.fill()
        ctx.lineJoin = 'miter'
        y = base - side * arrow * 0.3
      }
      if (!t.label) continue
      const label = truncate(t.label, 16)
      ctx.font = `600 ${px}px ${MONO}`
      const half = ctx.measureText(label).width / 2 + 4
      const x = Math.min(width - half, Math.max(half, sx))
      drawText(ctx, label, x, y - side * px * 0.65, { px, dpr, color: t.color, alpha: t.alpha, glow: false })
    }
  }

  // Who destroyed whom, in a short list in the top left corner: small outlined words that fade
  // after a few seconds, so they keep out of the way
  function drawFeed (feed) {
    if (!feed?.length) return
    const px = Math.max(11, Math.min(14, unit * 1.1))
    const say = (text, x, y, color, alpha) => {
      if (!text) return 0
      ctx.globalAlpha = alpha
      ctx.strokeText(text, x, y)
      ctx.fillStyle = color
      ctx.fillText(text, x, y)
      return ctx.measureText(text).width
    }
    ctx.save()
    ctx.font = `600 ${px}px ${MONO}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(2.5, px * 0.3)
    ctx.strokeStyle = '#000'
    const left = px * 0.6 + unit * 0.8
    let y = px * 0.9 + unit * 0.8
    for (const item of feed) {
      let x = left
      if (item.killer) {
        x += say(truncate(item.killer.name, 12), x, y, item.killer.color, item.alpha) + px * 0.45
        // A shell on its way from one to the other
        const w = px * 1.15
        const h = px * 0.46
        ctx.globalAlpha = item.alpha
        ctx.beginPath()
        ctx.moveTo(x, y - h / 2)
        ctx.lineTo(x + w * 0.62, y - h / 2)
        ctx.quadraticCurveTo(x + w, y, x + w * 0.62, y + h / 2)
        ctx.lineTo(x, y + h / 2)
        ctx.closePath()
        ctx.stroke()
        ctx.fillStyle = item.killer.color
        ctx.fill()
        x += w + px * 0.45
        say(truncate(item.victim.name, 12), x, y, item.victim.color, item.alpha)
      } else {
        // A tank that left the fight
        x += say(item.before, x, y, '#9aa69a', item.alpha)
        x += say(truncate(item.victim.name, 12), x, y, item.victim.color, item.alpha)
        say(item.after, x, y, '#9aa69a', item.alpha)
      }
      y += px * 1.55
    }
    ctx.restore()
  }

  function drawNotes (notes) {
    const px = Math.max(11, unit * 1.15)
    for (const n of notes) {
      const [sx, sy] = toScreen(n.x, n.y)
      const age = n.ttl - n.life
      const y = sy - (TANK_R + 2.4) * unit - age * unit * 2.5
      drawText(ctx, n.text, Math.min(width - px * 3, Math.max(px * 3, sx)), Math.max(px, y), { px, dpr, color: n.color, alpha: Math.min(1, n.life / 0.4) })
    }
  }

  // Banners are laid out on a 48-unit grid across the arena's short side, from its middle
  function drawBanners (items) {
    const s = Math.min(width, height) / 48
    for (const b of items) {
      drawText(ctx, b.text, width / 2, height / 2 + (b.y - 24) * s, { px: Math.max(b.min || 0, b.size * s), dpr, display: b.display, color: b.color || GREEN, alpha: b.alpha ?? 1 })
    }
  }

  function drawClock (clock) {
    if (!clock) return
    const px = Math.max(18, Math.min(width, height) * 0.075)
    const dim = clock.blink && Math.floor(performance.now() / 250) % 2
    drawText(ctx, clock.text, width / 2, px * 0.7, { px, dpr, display: true, color: GREEN, alpha: dim ? 0.35 : 0.85 })
  }

  /**
   * scene: {
   *   time,  seconds, for anything that flickers, turns or pulses
   *   tanks: [{ x, y, a, color, me, alive, damage (0-3), seed, treadL, treadR, recoil, flash,
   *             alpha, shield, fast, moving, power (shots left), diedAge, label }],
   *   shells: [{ x, y, color, power, trail: [{ x, y }] }],
   *   gifts: [{ x, y, kind, age, left }], charges: [0-1 for each teleporter],
   *   aim: { points: [{ x, y, bounced }], color, power } | null,
   *   tracks: [{ x, y, a, t }], trackLife, particles,
   *   notes: [{ text, x, y, color, life, ttl }], banners: [{ text, y, size, display, color, alpha, min }],
   *   feed: [{ killer: { name, color } | null, victim: { name, color }, before, after, alpha }],
   *   clock: { text, blink } | null, flash, shake
   * }
   * Positions are in units.
   */
  function draw (scene) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    if (!arena) return
    const sx = scene.shake > 0 ? (Math.random() * 2 - 1) * scene.shake * unit * 0.8 : 0
    const sy = scene.shake > 0 ? (Math.random() * 2 - 1) * scene.shake * unit * 0.8 : 0
    ctx.setTransform(1, 0, 0, 1, sx * dpr, sy * dpr)
    ctx.drawImage(arena, 0, 0)
    toWorld(ctx, sx, sy)
    drawTracks(scene.tracks, scene.time, scene.trackLife)
    drawPads(scene.charges, scene.time)
    for (const gift of scene.gifts) drawGift(gift, scene.time)
    drawAim(scene.aim)
    for (const t of scene.tanks) if (!t.alive) drawWreck(t, scene.time)
    for (const t of scene.tanks) if (t.alive) drawTank(t, scene.time)
    drawShells(scene.shells)
    drawParticles(scene.particles)
    for (const t of scene.tanks) if (t.alive && t.shield) drawShield(t, scene.time)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.globalAlpha = 1
    drawLabels(scene.tanks, scene.time)
    drawNotes(scene.notes)
    drawFeed(scene.feed)
    drawBanners(scene.banners)
    drawClock(scene.clock)
    if (scene.flash > 0) {
      ctx.fillStyle = `rgba(210, 255, 210, ${0.22 * scene.flash})`
      ctx.fillRect(0, 0, width, height)
    }
  }

  return {
    // CSS size, pixel ratio, and whether the arena stands on end
    resize (cssWidth, cssHeight, pixelRatio, turned) {
      width = cssWidth
      height = cssHeight
      dpr = pixelRatio
      turn = turned
      unit = (turn ? height : width) / W
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      buildArena()
    },
    // A fresh round: its map, with no scorch marks yet
    newRound (index) {
      map = index
      marks.length = 0
      buildArena()
    },
    scorch (x, y, size, crater = false) {
      const mark = { x, y, size, crater, seed: Math.floor(Math.random() * 1e9) }
      marks.push(mark)
      if (marks.length > 160) marks.shift()
      if (!arena) return
      const g = arena.getContext('2d')
      toWorld(g)
      stamp(g, mark)
    },
    draw
  }
}
