import { WALL, ROAD, pointAt, gridSpot } from './track.js'
import { PICKUP_R } from './items.js'
import { MAX_CARS } from './race.js'
import { sceneryOf, boundsOf } from './scenery.js'
import { drawBlob, drawParticles, rgba, shade } from '../tank/glow.js'
import { SHIELD_COLOR } from '../tank/effects.js'
import { GREEN, DIM, MONO, DISPLAY, drawText, truncate } from '../ascii/paint.js'

// Draws Neon Laps on a canvas: glowing vector lines on black, like the rest of the arcade.
// The track is bigger than the screen, so a camera follows a car and everything in the world
// is drawn through it each frame; the shapes of the road and the scenery are built once per
// track as paths, which the canvas only has to fill and stroke. Over the world, in screen
// pixels: names over the cars, the minimap, the standings, lap and time, what this car holds,
// the race feed and the big words in the middle.

// Every car's own color, the same on every screen: the same set as Tank's tanks
export const CAR_COLORS = ['#4da3ff', '#ff5f5f', '#ffd23f', '#f2f6ea', '#ff7ad9', '#ff9a3c', '#b48cff', '#3fe0d0']
export const PICKUP_COLORS = { boost: '#ffb000', shield: SHIELD_COLOR, shell: '#ff5c5c' }

const TAU = Math.PI * 2
const easeOutBack = (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2)

const THEMES = {
  city: {
    ground: '#020403',
    grid: 'rgba(0, 255, 0, 0.04)',
    verge: '#08100b',
    road: '#14171a',
    edge: 'rgba(225, 235, 225, 0.55)',
    dash: 'rgba(240, 235, 170, 0.32)',
    kerb: ['#ff4a4a', '#e8e8e8'],
    wall: GREEN,
    wallGlow: 'rgba(0, 255, 0, 0.16)',
    skid: '0, 0, 0',
    skidAlpha: 0.6,
    smoke: '#c8d0c8',
    spray: '#6f8a6f'
  },
  ice: {
    ground: '#02060a',
    grid: 'rgba(127, 230, 255, 0.035)',
    verge: '#0d1a24',
    road: '#0c2131',
    edge: 'rgba(170, 235, 255, 0.6)',
    dash: 'rgba(190, 240, 255, 0.1)',
    kerb: ['#4da3ff', '#e8f6ff'],
    wall: '#bff4ff',
    wallGlow: 'rgba(191, 244, 255, 0.14)',
    skid: '210, 245, 255',
    skidAlpha: 0.22,
    smoke: '#e6f8ff',
    spray: '#e8f8ff'
  }
}

/** The look of a track's theme, for the effects the stage throws. */
export const themeOf = (track) => THEMES[track.theme] || THEMES.city

// A car's colors: its line bright, its body a deep shade of the same
const palettes = new Map()
function paletteOf (color) {
  let p = palettes.get(color)
  if (!p) {
    p = { line: color, body: shade(color, 0.3), roof: shade(color, 0.18), detail: rgba(color, 0.55), stripe: rgba(color, 0.75) }
    palettes.set(color, p)
  }
  return p
}

function roundRect (g, x, y, w, h, r) {
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

// ---------- The track's shapes, built once ----------

function ringAt (track, d) {
  const out = []
  for (let k = 0; k < track.n; k++) out.push([track.x[k] + track.nx[k] * d, track.y[k] + track.ny[k] * d])
  return out
}

function addLoop (path, points) {
  points.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)))
  path.closePath()
}

function addSegments (path, segments) {
  for (const [x0, y0, x1, y1] of segments) {
    path.moveTo(x0, y0)
    path.lineTo(x1, y1)
  }
}

function buildShapes (track) {
  const scenery = sceneryOf(track)
  const shapes = { scenery }
  shapes.verge = new Path2D()
  addLoop(shapes.verge, ringAt(track, -WALL))
  addLoop(shapes.verge, ringAt(track, WALL))
  shapes.road = new Path2D()
  addLoop(shapes.road, ringAt(track, -ROAD))
  addLoop(shapes.road, ringAt(track, ROAD))
  shapes.edges = new Path2D()
  addLoop(shapes.edges, ringAt(track, -ROAD + 0.35))
  addLoop(shapes.edges, ringAt(track, ROAD - 0.35))
  shapes.walls = new Path2D()
  addLoop(shapes.walls, ringAt(track, -WALL))
  addLoop(shapes.walls, ringAt(track, WALL))
  // Kerbs round the bends, on both edges of the road
  shapes.kerbs = new Path2D()
  for (let k = 0; k < track.n;) {
    if (Math.abs(track.bend[k]) < 0.018) {
      k++
      continue
    }
    let end = k
    while (end < track.n && Math.abs(track.bend[end]) >= 0.018) end++
    for (const side of [-1, 1]) {
      for (let j = Math.max(0, k - 3); j <= Math.min(track.n - 1, end + 3); j++) {
        const x = track.x[j] + track.nx[j] * side * (ROAD + 0.35)
        const y = track.y[j] + track.ny[j] * side * (ROAD + 0.35)
        if (j === Math.max(0, k - 3)) shapes.kerbs.moveTo(x, y)
        else shapes.kerbs.lineTo(x, y)
      }
    }
    k = end
  }
  shapes.marks = new Path2D()
  addSegments(shapes.marks, track.theme === 'ice' ? scenery.streaks : scenery.dashes)
  // The start line: two rows of checks across the road
  shapes.checks = new Path2D()
  const cells = Math.round(ROAD * 2 / 1.25)
  const cell = (ROAD * 2) / cells
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < cells; col++) {
      if ((row + col) % 2) continue
      const s0 = (row - 1) * cell
      const d0 = -ROAD + col * cell
      const corners = [[s0, d0], [s0 + cell, d0], [s0 + cell, d0 + cell], [s0, d0 + cell]].map(([s, d]) => pointAt(track, s, d))
      corners.forEach((p, i) => (i ? shapes.checks.lineTo(p.x, p.y) : shapes.checks.moveTo(p.x, p.y)))
      shapes.checks.closePath()
    }
  }
  // A bracket painted on the road at each grid spot
  shapes.grid = new Path2D()
  for (let slot = 0; slot < MAX_CARS; slot++) {
    const spot = gridSpot(track, slot)
    const at = (ds, dd) => {
      const fx = Math.cos(spot.a)
      const fy = Math.sin(spot.a)
      return [spot.x + fx * ds - fy * dd, spot.y + fy * ds + fx * dd]
    }
    const points = [at(1.2, -1.6), at(3, -1.6), at(3, 1.6), at(1.2, 1.6)]
    points.forEach(([x, y], i) => (i ? shapes.grid.lineTo(x, y) : shapes.grid.moveTo(x, y)))
  }
  // Scenery
  shapes.blocks = new Path2D()
  shapes.roofs = new Path2D()
  shapes.windows = new Path2D()
  for (const b of scenery.buildings) {
    shapes.blocks.rect(b.x, b.y, b.w, b.h)
    if (b.roof) shapes.roofs.rect(b.x + 1.2, b.y + 1.2, b.w - 2.4, b.h - 2.4)
    for (const [x, y] of b.windows) shapes.windows.rect(x - 0.45, y - 0.3, 0.9, 0.6)
  }
  shapes.neon = scenery.buildings.filter(b => b.neon)
  shapes.trees = new Path2D()
  for (const t of scenery.trees) {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU
      const r = i % 2 ? t.r * 0.55 : t.r
      if (i) shapes.trees.lineTo(t.x + Math.cos(a) * r, t.y + Math.sin(a) * r)
      else shapes.trees.moveTo(t.x + r, t.y)
    }
    shapes.trees.closePath()
  }
  shapes.snowcaps = new Path2D()
  for (const t of scenery.trees) {
    shapes.snowcaps.moveTo(t.x + t.r * 0.3, t.y)
    shapes.snowcaps.arc(t.x, t.y, t.r * 0.3, 0, TAU)
  }
  shapes.rocks = new Path2D()
  for (const rock of scenery.rocks) {
    for (let i = 0; i < rock.sides; i++) {
      const a = rock.turn + (i / rock.sides) * TAU
      const r = rock.r * (i % 2 ? 0.8 : 1)
      if (i) shapes.rocks.lineTo(rock.x + Math.cos(a) * r, rock.y + Math.sin(a) * r)
      else shapes.rocks.moveTo(rock.x + Math.cos(a) * r, rock.y + Math.sin(a) * r)
    }
    shapes.rocks.closePath()
  }
  shapes.lake = null
  if (scenery.lake) {
    shapes.lake = new Path2D()
    addLoop(shapes.lake, scenery.lake)
  }
  shapes.cracks = new Path2D()
  for (const crack of scenery.cracks) crack.forEach(([x, y], i) => (i ? shapes.cracks.lineTo(x, y) : shapes.cracks.moveTo(x, y)))
  // The minimap's line, in the track's own units; scaled when drawn
  shapes.box = boundsOf(track, WALL + 2)
  shapes.outline = new Path2D()
  for (let k = 0; k < track.n; k += 2) {
    if (k) shapes.outline.lineTo(track.x[k], track.y[k])
    else shapes.outline.moveTo(track.x[k], track.y[k])
  }
  shapes.outline.closePath()
  return shapes
}

export function createRenderer (canvas) {
  const ctx = canvas.getContext('2d')
  let width = 0 // CSS pixels
  let height = 0
  let dpr = 1
  let track = null
  let shapes = null
  let theme = THEMES.city
  // This frame's view: world units to CSS pixels
  let scale = 1
  let originX = 0
  let originY = 0
  let view = { x0: 0, y0: 0, x1: 0, y1: 0 }

  const blob = (color, x, y, size, alpha, kind) => drawBlob(ctx, color, x, y, size, alpha, kind)
  const toScreen = (x, y) => [(x - originX) * scale, (y - originY) * scale]
  const inView = (x, y, r = 0) => x + r > view.x0 && x - r < view.x1 && y + r > view.y0 && y - r < view.y1

  // ---------- The world ----------

  function drawGround () {
    ctx.fillStyle = theme.ground
    ctx.fillRect(view.x0 - 1, view.y0 - 1, view.x1 - view.x0 + 2, view.y1 - view.y0 + 2)
    ctx.beginPath()
    for (let x = Math.floor(view.x0 / 10) * 10; x < view.x1; x += 10) {
      ctx.moveTo(x, view.y0)
      ctx.lineTo(x, view.y1)
    }
    for (let y = Math.floor(view.y0 / 10) * 10; y < view.y1; y += 10) {
      ctx.moveTo(view.x0, y)
      ctx.lineTo(view.x1, y)
    }
    ctx.lineWidth = 0.08
    ctx.strokeStyle = theme.grid
    ctx.stroke()
  }

  function drawLake (time) {
    if (!shapes.lake) return
    ctx.fillStyle = '#04141d'
    ctx.fill(shapes.lake)
    ctx.lineWidth = 0.35
    ctx.strokeStyle = 'rgba(127, 230, 255, 0.35)'
    ctx.stroke(shapes.lake)
    ctx.lineWidth = 0.12
    ctx.strokeStyle = `rgba(127, 230, 255, ${0.16 + 0.04 * Math.sin(time * 0.8)})`
    ctx.stroke(shapes.cracks)
  }

  function drawRoad () {
    ctx.fillStyle = theme.verge
    ctx.fill(shapes.verge, 'evenodd')
    ctx.fillStyle = theme.road
    ctx.fill(shapes.road, 'evenodd')
    ctx.lineWidth = 0.22
    ctx.strokeStyle = theme.dash
    ctx.stroke(shapes.marks)
    // Kerbs: stripes of two colors
    ctx.lineWidth = 0.9
    ctx.setLineDash([1.3, 1.3])
    ctx.strokeStyle = theme.kerb[0]
    ctx.stroke(shapes.kerbs)
    ctx.lineDashOffset = 1.3
    ctx.strokeStyle = theme.kerb[1]
    ctx.stroke(shapes.kerbs)
    ctx.setLineDash([])
    ctx.lineDashOffset = 0
    ctx.lineWidth = 0.16
    ctx.strokeStyle = theme.edge
    ctx.stroke(shapes.edges)
    ctx.fillStyle = 'rgba(240, 240, 240, 0.85)'
    ctx.fill(shapes.checks)
    ctx.lineWidth = 0.18
    ctx.strokeStyle = 'rgba(240, 240, 240, 0.4)'
    ctx.stroke(shapes.grid)
  }

  // The walls glow: a wide faint line under a thin bright one
  function drawWalls () {
    ctx.lineJoin = 'round'
    ctx.lineWidth = 1.6
    ctx.strokeStyle = theme.wallGlow
    ctx.stroke(shapes.walls)
    ctx.lineWidth = 0.32
    ctx.strokeStyle = theme.wall
    ctx.stroke(shapes.walls)
    ctx.lineJoin = 'miter'
  }

  function drawScenery (time) {
    const { scenery } = shapes
    if (scenery.buildings.length) {
      ctx.fillStyle = '#050a07'
      ctx.fill(shapes.blocks)
      ctx.lineWidth = 0.3
      ctx.strokeStyle = DIM
      ctx.stroke(shapes.blocks)
      ctx.lineWidth = 0.1
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.25)'
      ctx.stroke(shapes.roofs)
      ctx.fillStyle = 'rgba(255, 190, 70, 0.45)'
      ctx.fill(shapes.windows)
      // Neon signs along some roofs, flickering now and then
      for (const b of shapes.neon) {
        if (!inView(b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h))) continue
        const flicker = Math.sin(time * 13 + b.x) > 0.97 ? 0.3 : 1
        ctx.lineWidth = 0.35
        ctx.strokeStyle = rgba(b.neon, 0.85 * flicker)
        ctx.strokeRect(b.x + 0.6, b.y + 0.6, b.w - 1.2, b.h - 1.2)
      }
    }
    for (const lamp of scenery.lamps) {
      if (!inView(lamp.x, lamp.y, 8)) continue
      ctx.globalCompositeOperation = 'lighter'
      blob('#ffcf7a', lamp.x, lamp.y, 13, 0.1)
      ctx.globalCompositeOperation = 'source-over'
      ctx.beginPath()
      ctx.arc(lamp.x, lamp.y, 0.45, 0, TAU)
      ctx.fillStyle = '#ffe2a8'
      ctx.fill()
    }
    if (scenery.trees.length) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.save()
      ctx.translate(0.5, 0.7)
      ctx.fill(shapes.trees)
      ctx.restore()
      ctx.fillStyle = '#03180b'
      ctx.fill(shapes.trees)
      ctx.lineWidth = 0.18
      ctx.strokeStyle = DIM
      ctx.stroke(shapes.trees)
      ctx.fillStyle = 'rgba(230, 248, 255, 0.55)'
      ctx.fill(shapes.snowcaps)
    }
    if (scenery.rocks.length) {
      ctx.fillStyle = '#0d1418'
      ctx.fill(shapes.rocks)
      ctx.lineWidth = 0.14
      ctx.strokeStyle = 'rgba(170, 220, 235, 0.45)'
      ctx.stroke(shapes.rocks)
    }
  }

  // Tyre marks, fading as they age, drawn in four bands of age
  function drawSkids (skids, time, life) {
    if (!skids.length) return
    ctx.lineWidth = 0.42
    ctx.lineCap = 'round'
    for (let band = 0; band < 4; band++) {
      ctx.beginPath()
      let any = false
      for (const m of skids) {
        const age = (time - m.t) / life
        if (age >= 1 || Math.min(3, Math.floor(age * 4)) !== band) continue
        if (!inView(m.x0, m.y0, 2)) continue
        any = true
        ctx.moveTo(m.x0, m.y0)
        ctx.lineTo(m.x1, m.y1)
      }
      if (!any) continue
      ctx.strokeStyle = `rgba(${theme.skid}, ${theme.skidAlpha * (1 - band / 4)})`
      ctx.stroke()
    }
    ctx.lineCap = 'butt'
  }

  function hexagon (r) {
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i / 6) * TAU
      if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    ctx.closePath()
  }

  function drawIcon (kind, color) {
    ctx.fillStyle = color
    ctx.strokeStyle = color
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    if (kind === 'shield') {
      ctx.beginPath()
      ctx.moveTo(0, -0.7)
      ctx.lineTo(0.6, -0.46)
      ctx.lineTo(0.53, 0.15)
      ctx.quadraticCurveTo(0.42, 0.55, 0, 0.76)
      ctx.quadraticCurveTo(-0.42, 0.55, -0.53, 0.15)
      ctx.lineTo(-0.6, -0.46)
      ctx.closePath()
      ctx.fill()
    } else if (kind === 'boost') {
      ctx.lineWidth = 0.26
      for (const x of [-0.34, 0.2]) {
        ctx.beginPath()
        ctx.moveTo(x - 0.25, -0.5)
        ctx.lineTo(x + 0.25, 0)
        ctx.lineTo(x - 0.25, 0.5)
        ctx.stroke()
      }
    } else {
      // A shell: a ball with a band round it
      ctx.beginPath()
      ctx.arc(0, 0, 0.55, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(-0.55, 0)
      ctx.lineTo(0.55, 0)
      ctx.lineWidth = 0.14
      ctx.strokeStyle = '#05090a'
      ctx.stroke()
    }
    ctx.lineJoin = 'miter'
    ctx.lineCap = 'butt'
  }

  function drawPickup (p, time) {
    if (!inView(p.x, p.y, 4)) return
    if (!p.up) {
      // Where one will come back: a faint dashed ring
      ctx.setLineDash([0.45, 0.45])
      ctx.lineWidth = 0.1
      ctx.strokeStyle = 'rgba(200, 220, 200, 0.22)'
      ctx.beginPath()
      ctx.arc(p.x, p.y, PICKUP_R * 0.8, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
      return
    }
    const color = PICKUP_COLORS[p.kind] || '#ffffff'
    const grow = easeOutBack(Math.min(1, p.age / 0.45))
    if (grow < 0.02) return
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.globalCompositeOperation = 'lighter'
    blob(color, 0, 0, 6 * grow, 0.3 + 0.1 * Math.sin(time * 4 + p.x))
    ctx.globalCompositeOperation = 'source-over'
    ctx.save()
    ctx.rotate(time * 1.4)
    ctx.setLineDash([0.5, 0.38])
    ctx.lineWidth = 0.11
    ctx.strokeStyle = rgba(color, 0.85)
    ctx.beginPath()
    ctx.arc(0, 0, (PICKUP_R + 0.4) * grow, 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
    const s = grow * (1 + 0.06 * Math.sin(time * 5 + p.y))
    ctx.scale(s, s)
    hexagon(PICKUP_R)
    ctx.fillStyle = '#05090a'
    ctx.fill()
    ctx.fillStyle = rgba(color, 0.22)
    ctx.fill()
    ctx.lineWidth = 0.15
    ctx.strokeStyle = color
    ctx.stroke()
    drawIcon(p.kind, color)
    ctx.restore()
  }

  function drawShells (shells) {
    if (!shells.length) return
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineCap = 'round'
    for (const s of shells) {
      const points = [...s.trail, s]
      for (let i = 1; i < points.length; i++) {
        const f = i / (points.length - 1)
        ctx.globalAlpha = 0.6 * f
        ctx.lineWidth = 0.5 * f
        ctx.strokeStyle = s.color
        ctx.beginPath()
        ctx.moveTo(points[i - 1].x, points[i - 1].y)
        ctx.lineTo(points[i].x, points[i].y)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      blob(s.color, s.x, s.y, 3.2, 0.95)
      blob('#ffffff', s.x, s.y, 1.1, 0.6)
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.lineCap = 'butt'
    for (const s of shells) {
      ctx.beginPath()
      ctx.arc(s.x, s.y, 0.42, 0, TAU)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(s.x, s.y, 0.42, 0, TAU)
      ctx.lineWidth = 0.12
      ctx.strokeStyle = s.color
      ctx.stroke()
    }
  }

  // A tyre, seen from above, with the tread rolling round it
  function tyre (x, y, w, h, turn, roll) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(turn)
    ctx.fillStyle = '#050605'
    ctx.beginPath()
    roundRect(ctx, -w / 2, -h / 2, w, h, 0.12)
    ctx.fill()
    ctx.beginPath()
    const phase = ((roll % 0.3) + 0.3) % 0.3
    for (let tx = -w / 2 + phase; tx < w / 2; tx += 0.3) {
      ctx.moveTo(tx, -h / 2 + 0.06)
      ctx.lineTo(tx, h / 2 - 0.06)
    }
    ctx.lineWidth = 0.06
    ctx.strokeStyle = '#2a2f2a'
    ctx.stroke()
    ctx.restore()
  }

  // A formula car seen from above, facing right before it's turned: four bare wheels on their
  // arms, a front wing across the nose and a rear wing at the back, the narrow body with its
  // sidepods, and the driver's helmet in the cockpit
  function drawCar (c, time) {
    if (!inView(c.x, c.y, 6)) return
    const pal = paletteOf(c.color)
    ctx.save()
    ctx.translate(c.x, c.y)
    ctx.globalCompositeOperation = 'lighter'
    blob(c.color, 0, 0, c.me ? 10 : 8, (c.me ? 0.18 : 0.11) * c.alpha)
    ctx.globalCompositeOperation = 'source-over'
    ctx.rotate(c.a)
    ctx.globalAlpha = c.alpha
    if (c.boost) {
      ctx.globalCompositeOperation = 'lighter'
      const flick = 0.75 + 0.25 * Math.sin(time * 45 + c.seed)
      blob('#ff7a2a', -3, 0, 2.8 * flick, 0.85 * c.alpha)
      blob('#fff3b0', -2.4, 0, 1.2, 0.95 * c.alpha)
      ctx.globalCompositeOperation = 'source-over'
    }
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
    ctx.beginPath()
    roundRect(ctx, -1.9, -0.85, 4.3, 2.2, 0.5)
    ctx.fill()
    // Suspension arms out to the wheels
    ctx.beginPath()
    for (const [wx, side] of [[1.25, 1], [1.25, -1], [-1.35, 1], [-1.35, -1]]) {
      ctx.moveTo(wx - 0.25, side * 0.35)
      ctx.lineTo(wx, side * 0.85)
      ctx.moveTo(wx + 0.25, side * 0.3)
      ctx.lineTo(wx, side * 0.85)
    }
    ctx.lineWidth = 0.09
    ctx.strokeStyle = '#8a948a'
    ctx.stroke()
    const roll = c.roll || 0
    const turn = c.steer * 0.45
    tyre(1.25, -0.93, 0.78, 0.42, turn, roll)
    tyre(1.25, 0.93, 0.78, 0.42, turn, roll)
    tyre(-1.35, -0.95, 0.95, 0.52, 0, roll)
    tyre(-1.35, 0.95, 0.95, 0.52, 0, roll)
    // Rear wing
    ctx.fillStyle = pal.body
    ctx.strokeStyle = pal.line
    ctx.lineWidth = 0.1
    ctx.beginPath()
    ctx.rect(-2.25, -0.78, 0.5, 1.56)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = pal.stripe
    ctx.fillRect(-2.2, -0.78, 0.12, 1.56)
    // The body: wide at the sidepods, narrowing to the nose
    ctx.beginPath()
    ctx.moveTo(-1.85, -0.32)
    ctx.lineTo(-0.9, -0.42)
    ctx.quadraticCurveTo(-0.5, -0.72, 0.15, -0.66)
    ctx.lineTo(0.55, -0.34)
    ctx.lineTo(1.9, -0.17)
    ctx.quadraticCurveTo(2.15, 0, 1.9, 0.17)
    ctx.lineTo(0.55, 0.34)
    ctx.lineTo(0.15, 0.66)
    ctx.quadraticCurveTo(-0.5, 0.72, -0.9, 0.42)
    ctx.lineTo(-1.85, 0.32)
    ctx.closePath()
    ctx.fillStyle = pal.body
    ctx.fill()
    ctx.lineWidth = 0.13
    ctx.strokeStyle = pal.line
    ctx.stroke()
    // A stripe down the middle, nose to engine cover
    ctx.beginPath()
    ctx.moveTo(1.9, 0)
    ctx.lineTo(-1.7, 0)
    ctx.lineWidth = 0.16
    ctx.strokeStyle = pal.stripe
    ctx.stroke()
    // Front wing, across the nose
    ctx.fillStyle = pal.line
    ctx.beginPath()
    roundRect(ctx, 1.95, -1.1, 0.34, 2.2, 0.1)
    ctx.fill()
    ctx.fillStyle = pal.body
    ctx.fillRect(2.02, -1.0, 0.16, 2.0)
    // The cockpit, its halo, and the driver's helmet
    ctx.beginPath()
    roundRect(ctx, -0.45, -0.3, 0.95, 0.6, 0.25)
    ctx.fillStyle = '#020302'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(0.05, 0, 0.44, -1.2, 1.2)
    ctx.lineWidth = 0.08
    ctx.strokeStyle = 'rgba(200, 210, 200, 0.7)'
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(-0.05, 0, 0.24, 0, TAU)
    ctx.fillStyle = '#f2f6ea'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(0.04, 0, 0.13, -1.3, 1.3)
    ctx.lineWidth = 0.08
    ctx.strokeStyle = pal.line
    ctx.stroke()
    // The rain light at the back, glowing
    ctx.fillStyle = '#ff3b3b'
    ctx.fillRect(-1.98, -0.08, 0.14, 0.16)
    if (c.braking) {
      ctx.globalCompositeOperation = 'lighter'
      blob('#ff2a2a', -2.1, 0, 1.6, 0.7 * c.alpha)
      ctx.globalCompositeOperation = 'source-over'
    }
    if (c.flash > 0) {
      ctx.globalCompositeOperation = 'lighter'
      blob('#ffffff', 0, 0, 7, c.flash * 0.8)
      ctx.globalCompositeOperation = 'source-over'
    }
    ctx.restore()
  }

  function drawShield (c, time) {
    const r = 3.2
    ctx.save()
    ctx.translate(c.x, c.y)
    ctx.globalCompositeOperation = 'lighter'
    blob(SHIELD_COLOR, 0, 0, r * 2.5, (0.16 + 0.05 * Math.sin(time * 3)) * c.alpha)
    ctx.rotate(time * 0.6)
    hexagon(r)
    ctx.lineWidth = 0.15
    ctx.strokeStyle = rgba(SHIELD_COLOR, 0.85 * c.alpha)
    ctx.stroke()
    ctx.rotate(-time * 1.4)
    hexagon(r * 0.86)
    ctx.lineWidth = 0.06
    ctx.strokeStyle = rgba(SHIELD_COLOR, 0.35 * c.alpha)
    ctx.stroke()
    ctx.restore()
  }

  // Stars round a car that's spinning out
  function drawDizzy (c, time) {
    ctx.save()
    ctx.translate(c.x, c.y)
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 4; i++) {
      const a = time * 7 + (i / 4) * TAU
      blob('#fff3b0', Math.cos(a) * 2.6, Math.sin(a) * 2.6, 1.3, 0.85)
    }
    ctx.restore()
  }

  // ---------- Words and panels, in screen pixels ----------

  // Text from the left (or right, or the middle) at (x, y), with a black outline
  function say (text, x, y, { px, color = GREEN, alpha = 1, align = 'left', display = false, weight = 600 }) {
    if (!text) return 0
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.font = display ? `${px}px ${DISPLAY}` : `${weight} ${px}px ${MONO}`
    ctx.textAlign = align
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(2.5, px * 0.2)
    ctx.strokeStyle = '#000'
    ctx.strokeText(text, x, y)
    ctx.fillStyle = color
    ctx.fillText(text, x, y)
    const w = ctx.measureText(text).width
    ctx.restore()
    return w
  }

  // Names over the cars, and an arrow over this player's own
  function drawLabels (cars, time) {
    const px = Math.max(10, Math.min(14, scale * 1.05))
    const arrow = Math.max(5, scale * 0.6)
    for (const c of cars) {
      if (!c.label && !c.me) continue
      if (!inView(c.x, c.y, 10)) continue
      const [sx, sy] = toScreen(c.x, c.y)
      let y = sy - 3.2 * scale
      if (c.me) {
        const tip = y - Math.sin(time * 5) * arrow * 0.3
        ctx.beginPath()
        ctx.moveTo(sx, tip)
        ctx.lineTo(sx - arrow, tip - arrow * 1.3)
        ctx.lineTo(sx + arrow, tip - arrow * 1.3)
        ctx.closePath()
        ctx.lineJoin = 'round'
        ctx.lineWidth = 3
        ctx.strokeStyle = '#000'
        ctx.stroke()
        ctx.fillStyle = c.color
        ctx.fill()
        ctx.lineJoin = 'miter'
        y = tip - arrow * 1.6
      }
      if (c.label) say(truncate(c.label, 14), sx, y - px * 0.6, { px, color: c.color, alpha: c.alpha, align: 'center' })
    }
  }

  function drawNotes (notes) {
    const px = Math.max(11, Math.min(16, scale * 1.15))
    for (const n of notes) {
      const [sx, sy] = toScreen(n.x, n.y)
      const age = n.ttl - n.life
      say(n.text, sx, sy - 4 * scale - age * scale * 2.5, { px, color: n.color, alpha: Math.min(1, n.life / 0.4), align: 'center' })
    }
  }

  // The minimap in the top right corner: the track's line and a dot for every car
  function drawMinimap (map, size) {
    const { box } = shapes
    const k = Math.min(size / (box.maxX - box.minX), size / (box.maxY - box.minY))
    const w = (box.maxX - box.minX) * k
    const h = (box.maxY - box.minY) * k
    const x0 = width - w - 10
    const y0 = 10
    ctx.fillStyle = 'rgba(0, 0, 0, 0.82)'
    ctx.fillRect(x0 - 5, y0 - 5, w + 10, h + 10)
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.25)'
    ctx.strokeRect(x0 - 5.5, y0 - 5.5, w + 11, h + 11)
    ctx.save()
    ctx.translate(x0, y0)
    ctx.scale(k, k)
    ctx.translate(-box.minX, -box.minY)
    ctx.lineJoin = 'round'
    ctx.lineWidth = 5 / k
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.18)'
    ctx.stroke(shapes.outline)
    ctx.lineWidth = 1.4 / k
    ctx.strokeStyle = theme === THEMES.ice ? '#9fe8ff' : DIM
    ctx.stroke(shapes.outline)
    const start = pointAt(track, 0, 0)
    ctx.beginPath()
    ctx.arc(start.x, start.y, 3 / k, 0, TAU)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.restore()
    // Other cars first, so this player's dot is on top
    for (const c of [...map.cars].sort((a, b) => Number(a.me) - Number(b.me))) {
      const x = x0 + (c.x - box.minX) * k
      const y = y0 + (c.y - box.minY) * k
      ctx.beginPath()
      ctx.arc(x, y, c.me ? 4.5 : 3.2, 0, TAU)
      ctx.fillStyle = c.color
      ctx.globalAlpha = c.alpha ?? 1
      ctx.fill()
      ctx.lineWidth = c.me ? 2 : 1
      ctx.strokeStyle = c.me ? '#ffffff' : '#000000'
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    return { x: x0 - 5, y: y0 + h + 5, w: w + 10 }
  }

  // The standings, under the minimap
  function drawBoard (board, under, px) {
    let y = under.y + px * 1.2
    const right = width - 10
    for (const row of board) {
      const alpha = row.out ? 0.4 : 1
      const name = truncate(row.name, 11)
      say(name, right, y, { px, color: row.color, alpha, align: 'right', weight: row.me ? 800 : 600 })
      // A car that's home has its place in white
      say(`${row.place}`, right - under.w + 4, y, { px, color: row.me || row.done ? '#ffffff' : DIM, alpha, align: 'left' })
      y += px * 1.45
    }
  }

  function drawPickupIcon (kind, x, y, size) {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(size, size)
    hexagon(1)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fill()
    ctx.lineWidth = 0.12
    ctx.strokeStyle = PICKUP_COLORS[kind]
    ctx.stroke()
    drawIcon(kind, PICKUP_COLORS[kind])
    ctx.restore()
  }

  // Place, lap, times and what this car holds, in the top left corner
  function drawHud (hud, px) {
    if (!hud) return 10
    let y = 10
    const x = 12
    const big = Math.max(30, Math.min(58, Math.min(width, height) * 0.1))
    if (hud.place) {
      const w = say(hud.place, x, y + big * 0.5, { px: big, color: hud.placeColor || GREEN, display: true })
      say(hud.of, x + w + 4, y + big * 0.62, { px: big * 0.5, color: DIM, display: true })
      y += big * 0.95
    }
    if (hud.lap) {
      say(hud.lap, x, y + px * 0.8, { px: px * 1.35, color: GREEN, display: true })
      y += px * 1.6
    }
    for (const line of hud.lines || []) {
      say(line.text, x, y + px * 0.6, { px, color: line.color || DIM })
      y += px * 1.3
    }
    if (hud.items?.length) {
      const size = px * 0.85
      let ix = x + size
      y += size * 0.4
      for (const kind of hud.items) {
        drawPickupIcon(kind, ix, y + size, size)
        ix += size * 2.3
      }
      y += size * 2.4
    }
    return y
  }

  // The race feed: who passed whom, hit whom, finished. Names in their colors, words dim;
  // each line fades out at the end of its time.
  function drawFeed (feed, top, px) {
    let y = top + px * 0.8
    for (const line of feed) {
      let x = 12
      for (const part of line.parts) {
        x += say(part.text, x, y, { px, color: part.color || '#a8b8a8', alpha: line.alpha })
      }
      y += px * 1.45
    }
  }

  // Banners are laid out on a 48-unit grid across the screen's short side, from its middle
  function drawBanners (items) {
    const s = Math.min(width, height) / 48
    for (const b of items) {
      drawText(ctx, b.text, width / 2, height / 2 + (b.y - 24) * s, { px: Math.max(b.min || 0, b.size * s), dpr, display: b.display, color: b.color || GREEN, alpha: b.alpha ?? 1 })
    }
  }

  /**
   * scene: {
   *   time, camera: { x, y, span (units across the screen's short side) }, shake (px),
   *   cars: [{ x, y, a, color, steer, roll (how far its wheels have rolled), me, braking, boost, spin,
   *           flash, shield, alpha, seed, label }],
   *   shells: [{ x, y, color, trail }], pickups: [{ x, y, kind, up, age }],
   *   skids: [{ x0, y0, x1, y1, t }], skidLife, particles, notes: [{ text, x, y, color, life, ttl }],
   *   hud: { place, of, placeColor, lap, lines: [{ text, color }], items: [kind] } | null,
   *   board: [{ place, name, color, me, done, out }], map: { cars: [{ x, y, color, me, alpha }] },
   *   feed: [{ parts: [{ text, color }], alpha }], banners: [{ text, y, size, display, color, alpha, min }],
   *   flash
   * }
   */
  function draw (scene) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    if (!shapes || !width) return
    const { camera } = scene
    scale = Math.min(width, height) / camera.span
    const sx = scene.shake ? (Math.random() * 2 - 1) * scene.shake : 0
    const sy = scene.shake ? (Math.random() * 2 - 1) * scene.shake : 0
    originX = camera.x - width / 2 / scale - sx / scale
    originY = camera.y - height / 2 / scale - sy / scale
    view = { x0: originX, y0: originY, x1: originX + width / scale, y1: originY + height / scale }
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, -originX * scale * dpr, -originY * scale * dpr)
    drawGround()
    drawLake(scene.time)
    drawRoad()
    drawSkids(scene.skids, scene.time, scene.skidLife)
    drawWalls()
    drawScenery(scene.time)
    for (const p of scene.pickups) drawPickup(p, scene.time)
    drawShells(scene.shells)
    for (const c of scene.cars) drawCar(c, scene.time)
    drawParticles(ctx, scene.particles)
    for (const c of scene.cars) {
      if (c.shield) drawShield(c, scene.time)
      if (c.spin) drawDizzy(c, scene.time)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.globalAlpha = 1
    drawLabels(scene.cars, scene.time)
    drawNotes(scene.notes)
    const px = Math.max(11, Math.min(15, Math.min(width, height) * 0.03))
    const mapSize = Math.max(80, Math.min(190, Math.min(width, height) * 0.27))
    const under = drawMinimap(scene.map, mapSize)
    drawBoard(scene.board, under, px)
    const below = drawHud(scene.hud, px)
    drawFeed(scene.feed, below, px)
    drawBanners(scene.banners)
    if (scene.flash > 0) {
      ctx.fillStyle = `rgba(255, 240, 220, ${0.2 * scene.flash})`
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
    },
    setTrack (next) {
      if (track === next) return
      track = next
      theme = themeOf(track)
      shapes = buildShapes(track)
    },
    draw
  }
}
