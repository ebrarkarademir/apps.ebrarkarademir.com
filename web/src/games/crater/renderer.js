import { W, H, LEVELS } from './terrain.js'
import { GREEN, drawText } from '../ascii/paint.js'
import { rgba, shade, drawBlob, drawParticles } from '../tank/glow.js'
import { FIRE } from './effects.js'

// Draws Crater Duel in glowing vector shapes, the way Tank is drawn: a sky with hills far off,
// solid ground lit along its top and shaded deeper down, scorched round its craters, soldiers
// with their guns at their aim, shots that glow, and a sea (or lava) with waves along it. The
// ground is drawn once into a layer of its own and again only when a crater changes it. The
// view shows the whole height of the map; when the screen is too narrow for its whole width it
// shows part of it (camX, in cells, is its left edge), with a strip along the top showing all
// of it. Everything on the map is drawn in cells, under a transform; words on top in pixels.

// One color per side, up to six: white, amber, red, violet, pink and sky blue
export const SIDE_COLORS = ['#f2f6ea', '#ffb000', '#ff5c5c', '#c58bff', '#ff8ad8', '#8ec8ff']
const MINIMAP_H = 16
const FIGURE = 1.3 // soldiers are drawn this much bigger than the room they take up, to read well
const TAU = Math.PI * 2

// Each level's look: its sky, the hills far off, its ground from the top down, its rock, and
// its sea (or lava); `dirt` is what a blast throws up
const THEMES = {
  grass: { sky: ['#010a04', '#06240f'], hills: ['#0a2412', '#0f331a'], edge: '#5cff74', soil: ['#2c7a34', '#0b2410'], rock: '#56685a', sea: '#3fd0ff', dirt: ['#2c7a34', '#1d5223', '#5cff74'] },
  snow: { sky: ['#030b12', '#10283a'], hills: ['#11293a', '#1a3a4e'], edge: '#f2fbff', soil: ['#86b0c2', '#1a2c36'], rock: '#8a9aa6', sea: '#7fe6ff', dirt: ['#cfe8f2', '#86b0c2', '#ffffff'] },
  sand: { sky: ['#0c0802', '#2a1e08'], hills: ['#2a200b', '#3a2c10'], edge: '#ffe27a', soil: ['#b8903c', '#352610'], rock: '#8a7a5c', sea: '#3fd0ff', dirt: ['#d8b05a', '#b8903c', '#ffe27a'] },
  cave: { sky: ['#050705', '#0b120b'], hills: ['#0b140b', '#101c10'], edge: '#8fe88f', soil: ['#3c5e3c', '#0c180c'], rock: '#56605a', sea: '#ff6a2a', dirt: ['#3c5e3c', '#2a422a', '#8fe88f'], lava: true },
  sky: { sky: ['#01061a', '#0c2650'], hills: null, edge: '#c8ffc8', soil: ['#4a8e4e', '#12301a'], rock: '#7a8c7e', sea: '#3fd0ff', dirt: ['#4a8e4e', '#356a38', '#c8ffc8'], clouds: true },
  city: { sky: ['#03040c', '#121a34'], hills: ['#0c1224', '#111a30'], edge: '#c8ffc8', soil: ['#5a6a68', '#18201f'], rock: '#7f8f92', sea: '#3fd0ff', dirt: ['#7a8a88', '#5a6a68', '#c8ffc8'], towers: true }
}

const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 997
const hexRgb = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
const mix = (a, b, k) => {
  const [x, y] = [hexRgb(a), hexRgb(b)]
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(', ')})`
}
const DEPTHS = 14 // shades of ground, from the top down

export function createRenderer (canvas) {
  const ctx = canvas.getContext('2d')
  let width = 0
  let height = 0
  let dpr = 1
  let cell = 6
  let oy = 0 // the map's top edge on screen
  let layer = null
  let layerVersion = -1
  let layerTerrain = null
  let layerScorch = -1
  let theme = THEMES.grass
  let shades = []

  function build () {
    shades = Array.from({ length: DEPTHS }, (_, i) => mix(theme.soil[0], theme.soil[1], Math.pow(i / (DEPTHS - 1), 0.6)))
    layerVersion = -1
  }

  // The ground, drawn whole into its own layer: each cell shaded by how deep it is under the
  // open air above it, rock in blocks, a lit edge along every top, and scorch round the craters
  function drawLayer (terrain, scorch) {
    if (!layer) layer = document.createElement('canvas')
    const cw = cell * dpr
    layer.width = Math.ceil(W * cw)
    layer.height = Math.ceil(H * cw)
    const g = layer.getContext('2d')
    g.clearRect(0, 0, layer.width, layer.height)
    const px = (v) => Math.floor(v * cw)
    const at = (x, y) => (x >= 0 && x < W && y >= 0 && y < H ? terrain.cells[y * W + x] : 0)
    const tops = []
    const bottoms = []
    for (let x = 0; x < W; x++) {
      let depth = 0
      for (let y = 0; y < H; y++) {
        const value = at(x, y)
        if (!value) {
          depth = 0
          continue
        }
        const x0 = px(x)
        const y0 = px(y)
        const w = px(x + 1) - x0
        const h = px(y + 1) - y0
        const n = hash(x, y)
        if (value === 2) {
          // Rock: blocks with a lighter top and a dark seam; in the city, lit windows
          g.fillStyle = shade(theme.rock, 0.55 + (n % 5) * 0.04)
          g.fillRect(x0, y0, w, h)
          g.fillStyle = 'rgba(255, 255, 255, 0.07)'
          g.fillRect(x0, y0, w, Math.max(1, h * 0.25))
          if ((x + (y % 2) * 2) % 4 === 0) {
            g.fillStyle = 'rgba(0, 0, 0, 0.35)'
            g.fillRect(x0, y0, Math.max(1, w * 0.12), h)
          }
          if (theme.towers && n % 3 === 0) {
            g.fillStyle = n % 2 ? 'rgba(255, 226, 122, 0.75)' : 'rgba(255, 226, 122, 0.3)'
            g.fillRect(x0 + w * 0.3, y0 + h * 0.3, w * 0.4, h * 0.4)
          }
        } else {
          g.fillStyle = shades[Math.min(DEPTHS - 1, depth)]
          g.fillRect(x0, y0, w, h)
          // Grain: a few lighter and darker specks
          if (n % 6 === 0) {
            g.fillStyle = 'rgba(255, 255, 255, 0.08)'
            g.fillRect(x0 + w * 0.2, y0 + h * 0.3, Math.max(1, w * 0.3), Math.max(1, h * 0.3))
          } else if (n % 6 === 1) {
            g.fillStyle = 'rgba(0, 0, 0, 0.22)'
            g.fillRect(x0 + w * 0.5, y0 + h * 0.5, Math.max(1, w * 0.35), Math.max(1, h * 0.35))
          }
        }
        if (!at(x, y - 1)) tops.push(x0, y0, w, value)
        if (y < H - 1 && !at(x, y + 1)) bottoms.push(x0, y0 + h, w)
        depth++
      }
    }
    // Overhangs: a shadow under ground with open air below it
    g.fillStyle = 'rgba(0, 0, 0, 0.45)'
    for (let i = 0; i < bottoms.length; i += 3) g.fillRect(bottoms[i], bottoms[i + 1] - Math.max(1, cw * 0.3), bottoms[i + 2], Math.max(1, cw * 0.3))
    // Scorch round every crater, only on the ground that's left
    g.save()
    g.globalCompositeOperation = 'source-atop'
    for (const [x, y, r] of scorch) {
      const gradient = g.createRadialGradient(x * cw, y * cw, r * cw * 0.6, x * cw, y * cw, (r + 3.4) * cw)
      gradient.addColorStop(0, 'rgba(8, 4, 0, 0.85)')
      gradient.addColorStop(0.55, 'rgba(24, 12, 2, 0.45)')
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      g.fillStyle = gradient
      g.fillRect((x - r - 3) * cw, (y - r - 3) * cw, (r + 3) * 2 * cw, (r + 3) * 2 * cw)
    }
    g.restore()
    // The lit edge along every top, glowing (rock gets a cooler, fainter one)
    const strip = Math.max(1, Math.round(cw * 0.32))
    g.save()
    g.shadowColor = theme.edge
    g.shadowBlur = cw * 0.9
    g.fillStyle = theme.edge
    for (let i = 0; i < tops.length; i += 4) if (tops[i + 3] !== 2) g.fillRect(tops[i], tops[i + 1], tops[i + 2], strip)
    g.shadowBlur = 0
    g.fillStyle = rgba('#ffffff', 0.25)
    for (let i = 0; i < tops.length; i += 4) if (tops[i + 3] === 2) g.fillRect(tops[i], tops[i + 1], tops[i + 2], strip)
    g.restore()
    layerVersion = terrain.version
    layerTerrain = terrain
    layerScorch = scorch.length
  }

  const view = { camX: 0, visible: W, ox: 0 }
  const X = (x) => (x - view.camX) * cell + view.ox
  const Y = (y) => y * cell + oy

  // ---------- The sky ----------

  function sky (time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, theme.sky[0])
    gradient.addColorStop(1, theme.sky[1])
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
    // A few stars, and in the sky level clouds drifting by
    for (let i = 0; i < 40; i++) {
      const sx = ((hash(i, 7) * 13.7 - view.camX * cell * 0.15) % (width + 40) + width + 40) % (width + 40) - 20
      const sy = (hash(i, 3) / 997) * height * 0.55
      ctx.fillStyle = rgba('#ffffff', (0.15 + (hash(i, 11) % 5) * 0.08) * (0.75 + 0.25 * Math.sin(time * 1.3 + i)))
      ctx.fillRect(sx, sy, 1.5, 1.5)
    }
    if (theme.clouds) {
      for (let i = 0; i < 7; i++) {
        const span = width + 300
        const sx = ((hash(i, 5) * 3 + time * (6 + i) - view.camX * cell * 0.3) % span + span) % span - 150
        const sy = height * (0.15 + (hash(i, 9) % 50) / 100)
        drawBlob(ctx, '#8fb4ff', sx, sy, cell * (18 + (i % 3) * 8), 0.12, 'smoke')
      }
    }
    // Hills far off (towers in the city), two rows, the nearer moving more with the view
    if (!theme.hills) return
    theme.hills.forEach((color, row) => {
      const drift = view.camX * cell * (0.25 + row * 0.25)
      const base = oy + H * cell * (0.48 + row * 0.12)
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(0, height)
      for (let sx = 0; sx <= width + 8; sx += 8) {
        const u = (sx + drift) / cell
        const y = theme.towers
          ? base - (6 + (hash(Math.floor(u / 6), row) % 9)) * cell
          : base - (Math.sin(u * 0.045 + row * 2) * 7 + Math.sin(u * 0.11 + row) * 3) * cell
        ctx.lineTo(sx, y)
      }
      ctx.lineTo(width, height)
      ctx.closePath()
      ctx.fill()
    })
  }

  // ---------- The strip along the top ----------

  function minimapRect () {
    if (view.visible >= W) return null
    const w = Math.min(width - 16, 260)
    return { x: (width - w) / 2, y: 6, w, h: MINIMAP_H }
  }

  function minimap (scene) {
    const rect = minimapRect()
    if (!rect) return
    const sx = rect.w / W
    const sy = rect.h / H
    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
    ctx.fillRect(rect.x - 2, rect.y - 2, rect.w + 4, rect.h + 4)
    ctx.fillStyle = rgba(theme.edge, 0.45)
    for (let x = 0; x < W; x += 2) {
      const top = scene.terrain.top(x)
      if (top < H) ctx.fillRect(rect.x + x * sx, rect.y + top * sy, Math.max(1, sx * 2), rect.h - top * sy)
    }
    ctx.fillStyle = rgba(theme.sea, 0.35)
    ctx.fillRect(rect.x, rect.y + scene.water * sy, rect.w, rect.h - scene.water * sy)
    for (const u of scene.units) {
      if (!u.alive) continue
      ctx.fillStyle = SIDE_COLORS[u.color] || GREEN
      ctx.fillRect(rect.x + u.x * sx - 1.5, rect.y + (u.y - 2) * sy, 3, 4)
    }
    ctx.strokeStyle = GREEN
    ctx.lineWidth = 1
    ctx.strokeRect(rect.x + view.camX * sx + 0.5, rect.y - 1.5, view.visible * sx - 1, rect.h + 3)
    ctx.restore()
  }

  // ---------- On the map, in cells ----------

  // A soldier in its side's color: legs that step, a body with a belt, a helmeted head, its gun
  // at its aim, scorch on it as it gets hurt; a ring and an arrow on the one being aimed with
  function unit (u, time) {
    ctx.save()
    ctx.translate(u.x, u.y)
    ctx.scale(FIGURE, FIGURE)
    ctx.translate(-u.x, -u.y)
    figure(u, time)
    ctx.restore()
  }

  function figure (u, time) {
    const color = SIDE_COLORS[u.color] || GREEN
    const { x, y } = u
    if (!u.alive) {
      // A grave: a stone with a cross in the side's color
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
      ctx.beginPath()
      ctx.ellipse(x, y, 1.1, 0.3, 0, 0, TAU)
      ctx.fill()
      ctx.fillStyle = '#4a524c'
      ctx.beginPath()
      ctx.roundRect(x - 0.7, y - 1.9, 1.4, 1.9, [0.7, 0.7, 0.1, 0.1])
      ctx.fill()
      ctx.strokeStyle = rgba(color, 0.8)
      ctx.lineWidth = 0.2
      ctx.beginPath()
      ctx.moveTo(x, y - 1.6)
      ctx.lineTo(x, y - 0.5)
      ctx.moveTo(x - 0.35, y - 1.25)
      ctx.lineTo(x + 0.35, y - 1.25)
      ctx.stroke()
      return
    }
    if (u.selected) {
      ctx.save()
      ctx.strokeStyle = color
      ctx.globalAlpha = 0.5 + Math.sin(time * 6) * 0.25
      ctx.lineWidth = 0.18
      ctx.beginPath()
      ctx.ellipse(x, y, 2, 0.6, 0, 0, TAU)
      ctx.stroke()
      ctx.restore()
      drawBlob(ctx, color, x, y, 4.5, 0.25)
    }
    // Its shadow on the ground
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
    ctx.beginPath()
    ctx.ellipse(x, y, 1, 0.28, 0, 0, TAU)
    ctx.fill()

    const f = u.facing ? -1 : 1
    const bob = u.selected && !u.walking ? Math.sin(time * 4) * 0.06 : 0
    const step = u.walking ? Math.sin(time * 14) : 0
    const flash = u.flash > 0
    const body = flash ? '#ffffff' : color
    const dark = flash ? '#dddddd' : shade(color, 0.45)
    const hurt = u.hp < 50 ? (u.hp < 25 ? 2 : 1) : 0

    ctx.save()
    ctx.translate(x, y + bob)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // Legs
    ctx.strokeStyle = dark
    ctx.lineWidth = 0.34
    ctx.beginPath()
    ctx.moveTo(0, -1.15)
    ctx.lineTo(0.35 * f + step * 0.35, -0.05)
    ctx.moveTo(0, -1.15)
    ctx.lineTo(-0.3 * f - step * 0.35, -0.05)
    ctx.stroke()
    // Body, with a belt
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.roundRect(-0.6, -2.45, 1.2, 1.4, 0.35)
    ctx.fill()
    ctx.fillStyle = dark
    ctx.fillRect(-0.6, -1.45, 1.2, 0.18)
    // Scorch marks once it's been hurt
    if (hurt) {
      ctx.fillStyle = 'rgba(20, 14, 8, 0.6)'
      ctx.beginPath()
      ctx.arc(-0.2 * f, -1.95, 0.22, 0, TAU)
      if (hurt > 1) {
        ctx.moveTo(0.25 * f + 0.18, -1.7)
        ctx.arc(0.25 * f, -1.7, 0.18, 0, TAU)
      }
      ctx.fill()
    }
    // Head and helmet
    ctx.fillStyle = flash ? '#ffffff' : '#e8d4b8'
    ctx.beginPath()
    ctx.arc(0.08 * f, -2.95, 0.5, 0, TAU)
    ctx.fill()
    ctx.fillStyle = dark
    ctx.beginPath()
    ctx.arc(0.08 * f, -3.02, 0.58, Math.PI, TAU)
    ctx.fill()
    ctx.fillRect(0.08 * f - 0.72, -3.06, 1.44, 0.14)
    // An eye, looking its way
    ctx.fillStyle = '#101410'
    ctx.beginPath()
    ctx.arc(0.3 * f, -2.85, 0.09, 0, TAU)
    ctx.fill()
    ctx.restore()

    // The gun, out from the shoulder at its aim
    const angle = u.angle ?? (u.facing ? Math.PI : 0)
    const sx = x
    const sy = y + bob - 1.9
    const dx = Math.cos(angle)
    const dy = -Math.sin(angle)
    ctx.save()
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#2a302b'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(sx - dx * 0.3, sy - dy * 0.3)
    ctx.lineTo(sx + dx * 2, sy + dy * 2)
    ctx.stroke()
    ctx.strokeStyle = color
    ctx.lineWidth = 0.22
    ctx.beginPath()
    ctx.moveTo(sx + dx * 0.4, sy + dy * 0.4)
    ctx.lineTo(sx + dx * 2.05, sy + dy * 2.05)
    ctx.stroke()
    ctx.restore()
    if (u.selected) drawBlob(ctx, color, sx + dx * 2.1, sy + dy * 2.1, 1.2, 0.5)

    // Health: a bar over its head
    const bw = 3
    const by = y - 4.25
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
    ctx.fillRect(x - bw / 2 - 0.12, by - 0.12, bw + 0.24, 0.5)
    ctx.fillStyle = u.hp < 25 ? '#ff5c5c' : color
    ctx.fillRect(x - bw / 2, by, (bw * Math.max(0, u.hp)) / 100, 0.26)
    // An arrow bobbing over the one being aimed with
    if (u.selected) {
      const ay = by - 1.9 + Math.sin(time * 5) * 0.25
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(x - 0.55, ay - 0.6)
      ctx.lineTo(x + 0.55, ay - 0.6)
      ctx.lineTo(x, ay)
      ctx.closePath()
      ctx.fill()
    }
  }

  // What flies: shell, grenade, cluster, bomblet, molotov, dynamite, flame (see KINDS in physics.js)
  function shot (s, time) {
    const color = SIDE_COLORS[s.color] || '#ffd27a'
    const { x, y } = s
    switch (s.kind) {
      case 6: { // a flame
        const flicker = 0.75 + Math.random() * 0.5
        drawBlob(ctx, FIRE[1 + Math.floor(Math.random() * 3)], x, y - 0.3, 2.2 * flicker, 0.9)
        drawBlob(ctx, '#fff3b0', x, y - 0.2, 0.9 * flicker, 0.8)
        return
      }
      case 5: { // dynamite: a red stick, its fuse fizzing
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(Math.sin(time * 3 + x) * 0.3)
        ctx.fillStyle = '#d8312a'
        ctx.fillRect(-0.3, -0.9, 0.6, 1.8)
        ctx.fillStyle = '#ffd27a'
        ctx.fillRect(-0.3, -0.25, 0.6, 0.18)
        ctx.strokeStyle = '#cfc8b0'
        ctx.lineWidth = 0.1
        ctx.beginPath()
        ctx.moveTo(0, -0.9)
        ctx.quadraticCurveTo(0.3, -1.2, 0.2, -1.4)
        ctx.stroke()
        ctx.restore()
        drawBlob(ctx, FIRE[Math.floor(Math.random() * 2)], x + 0.2, y - 1.4, 1 + Math.random() * 0.8, 1)
        return
      }
      case 4: { // a molotov: a bottle turning over, alight at the neck
        const spin = time * 10 + x
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(spin)
        ctx.fillStyle = '#3f7a3a'
        ctx.beginPath()
        ctx.roundRect(-0.35, -0.3, 0.7, 1, 0.2)
        ctx.fill()
        ctx.fillRect(-0.14, -0.75, 0.28, 0.5)
        ctx.restore()
        drawBlob(ctx, '#ffb347', x + Math.sin(spin) * 0.8, y - Math.cos(spin) * 0.8, 1.8, 0.95)
        return
      }
      case 1: { // a grenade: dark and round, a light blinking on it
        drawBlob(ctx, color, x, y, 2.4, 0.35)
        ctx.fillStyle = '#2f3a2c'
        ctx.beginPath()
        ctx.arc(x, y, 0.55, 0, TAU)
        ctx.fill()
        ctx.strokeStyle = '#5a6a52'
        ctx.lineWidth = 0.12
        ctx.beginPath()
        ctx.arc(x, y, 0.55, time * 8, time * 8 + Math.PI * 0.6)
        ctx.stroke()
        if (Math.floor(time * 6) % 2) drawBlob(ctx, '#ff4a3d', x, y - 0.5, 0.9, 1)
        return
      }
      case 2: // a cluster bomb: a bigger, brighter shell
        drawBlob(ctx, color, x, y, 3.6, 0.6)
        drawBlob(ctx, '#ffffff', x, y, 1.2, 0.9)
        ctx.fillStyle = shade(color, 0.6)
        ctx.beginPath()
        ctx.arc(x, y, 0.5, 0, TAU)
        ctx.fill()
        return
      case 3: // a bomblet
        drawBlob(ctx, color, x, y, 1.8, 0.8)
        drawBlob(ctx, '#ffffff', x, y, 0.6, 0.9)
        return
      default: // a shell
        drawBlob(ctx, color, x, y, 2.8, 0.75)
        drawBlob(ctx, '#ffffff', x, y, 0.9, 0.95)
    }
  }

  // The aim: glowing dots along the first stretch of the flight, and a sight where it points
  function aim (a, time) {
    const color = SIDE_COLORS[a.color] || GREEN
    const pts = a.points
    for (let i = 0; i < pts.length; i += 2) {
      const k = 1 - i / pts.length
      drawBlob(ctx, color, pts[i], pts[i + 1], 1.1, 0.25 + k * 0.6)
      ctx.fillStyle = rgba('#ffffff', k * 0.8)
      ctx.fillRect(pts[i] - 0.1, pts[i + 1] - 0.1, 0.2, 0.2)
    }
    const { x, y } = a.tip
    const r = 0.8 + Math.sin(time * 6) * 0.08
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 0.16
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TAU)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      ctx.moveTo(x + dx * r * 0.5, y + dy * r * 0.5)
      ctx.lineTo(x + dx * r * 1.5, y + dy * r * 1.5)
    }
    ctx.stroke()
    ctx.restore()
  }

  // The sea, or lava: a deepening wash, and a glowing line of waves along its top
  function sea (water, time) {
    const left = Math.floor(view.camX) - 2
    const right = view.camX + view.visible + 2
    const bottom = H + Math.max(0, (height - oy) / cell - H) + 2
    const wave = (x) => water + Math.sin(time * 2 + x * 0.35) * 0.25 + Math.sin(time * 1.3 + x * 0.12) * 0.2
    const gradient = ctx.createLinearGradient(0, water, 0, bottom)
    gradient.addColorStop(0, rgba(theme.sea, theme.lava ? 0.55 : 0.3))
    gradient.addColorStop(1, theme.lava ? rgba('#7a1e08', 0.9) : rgba('#06223a', 0.8))
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.moveTo(left, bottom)
    for (let x = left; x <= right; x += 0.5) ctx.lineTo(x, wave(x))
    ctx.lineTo(right, bottom)
    ctx.closePath()
    ctx.fill()
    ctx.save()
    ctx.strokeStyle = theme.sea
    ctx.lineWidth = 0.22
    ctx.shadowColor = theme.sea
    ctx.shadowBlur = cell * dpr * 0.8
    ctx.beginPath()
    for (let x = left; x <= right; x += 0.5) ctx[x === left ? 'moveTo' : 'lineTo'](x, wave(x))
    ctx.stroke()
    ctx.restore()
    // Light glinting on it, or lava bubbling
    for (let i = 0; i < view.visible / 6; i++) {
      const gx = view.camX + ((hash(i, 1) % 600) / 600) * view.visible
      const k = (Math.sin(time * (theme.lava ? 2 : 1.5) + i * 1.7) + 1) / 2
      if (theme.lava) drawBlob(ctx, '#ffc24d', gx, water + 0.6 + (1 - k) * 1.5, 1.4 * k, k * 0.7)
      else {
        ctx.fillStyle = rgba('#ffffff', k * 0.35)
        ctx.fillRect(gx, wave(gx) + 0.7 + (hash(i, 4) % 5) * 0.5, 1.2, 0.12)
      }
    }
  }

  /**
   * scene: {
   *   terrain, water, time (seconds), camX, scorch: [[x, y, r], ...] (the craters so far),
   *   units: [{ x, y, color (index into SIDE_COLORS), alive, hp, facing, angle, walking, selected, flash }],
   *   shots: [{ x, y, kind (see shot()), color }],
   *   aim: { points: [x, y, ...], tip: { x, y }, color } | null,
   *   particles (see effects.js), texts: [{ text, x, y, size, color, alpha }], flash, shake
   * }
   */
  function draw (scene) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!shades.length) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const wanted = THEMES[LEVELS[scene.terrain.style]?.theme] || THEMES.grass
    if (wanted !== theme) {
      theme = wanted
      build()
    }
    const scorch = scene.scorch || []
    if (scene.terrain !== layerTerrain || scene.terrain.version !== layerVersion || scorch.length !== layerScorch) drawLayer(scene.terrain, scorch)
    view.camX = Math.max(0, Math.min(W - view.visible, scene.camX))

    sky(scene.time)

    const shakeX = scene.shake > 0 ? (Math.random() * 2 - 1) * scene.shake * cell : 0
    const shakeY = scene.shake > 0 ? (Math.random() * 2 - 1) * scene.shake * cell : 0
    const cw = cell * dpr
    ctx.drawImage(layer, view.camX * cw, 0, Math.min(layer.width, view.visible * cw), layer.height, view.ox + shakeX, oy + shakeY, Math.min(W, view.visible) * cell, H * cell)

    // The map, in cells
    ctx.setTransform(dpr * cell, 0, 0, dpr * cell, dpr * (view.ox - view.camX * cell + shakeX), dpr * (oy + shakeY))
    for (const u of scene.units) unit(u, scene.time)
    if (scene.aim) aim(scene.aim, scene.time)
    drawParticles(ctx, scene.particles)
    for (const s of scene.shots) shot(s, scene.time)
    sea(scene.water, scene.time)

    // Words, in pixels
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    for (const u of scene.units) {
      if (u.alive) drawText(ctx, String(u.hp), X(u.x), Y(u.y - 5.15 * FIGURE), { px: Math.max(9, cell * 1.2), dpr, color: SIDE_COLORS[u.color] || GREEN, glow: false })
    }
    for (const item of scene.texts) {
      drawText(ctx, item.text, item.screen ? item.x : X(item.x), item.screen ? item.y : Y(item.y), { px: Math.max(item.min || 0, item.size * cell), dpr, color: item.color || GREEN, alpha: item.alpha ?? 1, display: item.display ?? true })
    }
    minimap(scene)
    if (scene.flash > 0) {
      ctx.fillStyle = `rgba(255, 220, 120, ${0.18 * scene.flash})`
      ctx.fillRect(0, 0, width, height)
    }
  }

  return {
    // The play area is cssWidth × cssHeight; the map is scaled to its height, and to its width
    // too when the screen is wide enough, and is otherwise seen part at a time
    resize (cssWidth, cssHeight, pixelRatio) {
      width = cssWidth
      height = cssHeight
      dpr = Math.min(2, pixelRatio)
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      const fitAll = Math.min(width / W, height / H)
      cell = fitAll >= 5 ? fitAll : Math.min(height / H, 7.5)
      view.visible = Math.min(W, width / cell)
      view.ox = view.visible >= W ? (width - W * cell) / 2 : 0
      oy = Math.max(0, height - H * cell)
      build()
    },
    // Screen point -> map position, in cells
    toMap: (px, py) => ({ x: (px - view.ox) / cell + view.camX, y: (py - oy) / cell }),
    get cell () { return cell },
    get visible () { return view.visible },
    get width () { return width },
    // The colors of the ground a blast throws up, and of the sea, for this level
    get dirt () { return theme.dirt },
    get sea () { return theme.sea },
    minimapRect,
    // Fonts that finish loading later: the ground is drawn again
    rebuild: build,
    draw
  }
}
