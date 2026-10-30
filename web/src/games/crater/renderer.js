import { W, H, LEVELS } from './terrain'
import { GREEN, DIM, LOW, MONO, paint, drawSprite, drawText, drawGlyph } from '../ascii/paint'

// Draws Crater Duel. The ground is made of characters on a wash of its level's color, drawn
// once into a layer of its own and again only when a crater changes it. The view shows the
// whole height of the map; when the screen is too narrow for its whole width it shows part of
// it (camX, in cells, is its left edge), with a strip along the top showing all of it.

export const SIDE_COLORS = ['#f2f6ea', '#ffb000']
const MINIMAP_H = 16
const FIRE = ['#ffe680', '#ffb000', '#ff6a2a']
const SMOKE = '#7f8f7f'

// Each level's look: the characters and colors of its ground, and its sea (or lava)
const THEMES = {
  grass: { top: ['"', "'", '^', '"'], topColor: GREEN, upper: ['#', '#', '%'], upperColor: DIM, deep: [':', '.', '%', ':', ' '], deepColor: LOW, mass: 'rgba(0, 255, 0, 0.11)', rock: ['=', 'H', '#'], rockColor: '#8fb08f', sea: '#3fd0ff', wash: 'rgba(30, 150, 220, 0.2)' },
  snow: { top: ['*', '"', '*', "'"], topColor: '#e6ffe6', upper: ['#', '%', '#'], upperColor: '#9fe09f', deep: [':', '.', '%', ' '], deepColor: LOW, mass: 'rgba(160, 255, 160, 0.1)', rock: ['=', 'H'], rockColor: '#a8c8a8', sea: '#7fe6ff', wash: 'rgba(80, 180, 230, 0.2)' },
  sand: { top: ['~', '.', ',', '~'], topColor: '#c8ff5a', upper: ['%', ':', '%'], upperColor: '#8fcf2a', deep: ['.', ':', ' ', '.'], deepColor: '#5a8a1a', mass: 'rgba(180, 255, 60, 0.1)', rock: ['=', 'H'], rockColor: '#a0b070', sea: '#3fd0ff', wash: 'rgba(30, 150, 220, 0.2)' },
  cave: { top: ['^', '.', ':', '^'], topColor: '#7fdf7f', upper: ['%', '#', ':'], upperColor: '#3f9f3f', deep: [':', '.', ' ', ' '], deepColor: '#2f6f2f', mass: 'rgba(0, 200, 60, 0.09)', rock: ['@', 'H', '='], rockColor: '#6f8f6f', sea: '#ff6a2a', wash: 'rgba(255, 90, 30, 0.22)' },
  sky: { top: ['"', '^', "'", '*'], topColor: '#b8ffb8', upper: ['#', '%'], upperColor: DIM, deep: [':', '.', ' '], deepColor: LOW, mass: 'rgba(120, 255, 120, 0.12)', rock: ['@', '='], rockColor: '#9ab89a', sea: '#3fd0ff', wash: 'rgba(30, 150, 220, 0.2)' },
  city: { top: ['_', '=', '_', '-'], topColor: '#c8ffc8', upper: ['#', 'H', '#'], upperColor: '#7fcf7f', deep: ['#', ':', '.', ' '], deepColor: LOW, mass: 'rgba(120, 255, 120, 0.12)', rock: ['='], rockColor: '#9ab89a', sea: '#3fd0ff', wash: 'rgba(30, 150, 220, 0.2)' }
}

// The soldier, facing right; a step swaps the legs. The gun is drawn on its own, at the aim.
const BODY = [[' @ ', '/|\\', '/ \\'], [' @ ', '/|\\', ' |\\']]
const GRAVE = [' + ', '_|_']
// What flies: shell, grenade, cluster, bomblet, molotov, dynamite, flame (see KINDS in physics.js)
const SHOT_CHARS = ['o', '@', '*', '*', '!', '|', '^']

const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 997
const mirror = (line) => [...line].reverse().map(ch => ({ '/': '\\', '\\': '/' }[ch] || ch)).join('')

export function createRenderer (canvas) {
  const ctx = canvas.getContext('2d')
  let width = 0
  let height = 0
  let dpr = 1
  let cell = 6
  let oy = 0 // the map's top edge on screen
  let sprites = null
  let layer = null
  let layerVersion = -1
  let layerTerrain = null
  let theme = THEMES.grass

  function build () {
    const cw = cell * dpr
    const glyph = (ch, color, glow = 0) => paint([ch], () => color, { cw, rh: cw, glow, weight: 700 })
    const lit = Math.max(1, cell * 0.25) * dpr
    const set = (chars, color, glow = 0) => chars.map(ch => (ch === ' ' ? null : glyph(ch, color, glow)))
    sprites = {
      top: set(theme.top, theme.topColor, lit),
      upper: set(theme.upper, theme.upperColor),
      deep: set(theme.deep, theme.deepColor),
      rock: set(theme.rock, theme.rockColor),
      wave: glyph('~', theme.sea, lit),
      // [side][facing: 0 right, 1 left][pose]
      units: SIDE_COLORS.map(color => [0, 1].map(facing => BODY.map(rows => paint(facing ? rows.map(mirror) : rows, () => color, { cw, rh: cw, glow: lit * 1.5, weight: 700 })))),
      hurt: BODY.map(rows => paint(rows, () => '#ffffff', { cw, rh: cw, glow: lit * 2, weight: 700 })),
      graves: SIDE_COLORS.map(color => paint(GRAVE, () => color, { cw, rh: cw, glow: 0, weight: 600 }))
    }
    layerVersion = -1
  }

  // The ground, drawn whole into its own layer
  function drawLayer (terrain) {
    if (!layer) layer = document.createElement('canvas')
    const cw = cell * dpr
    layer.width = Math.ceil(W * cw)
    layer.height = Math.ceil(H * cw)
    const g = layer.getContext('2d')
    g.clearRect(0, 0, layer.width, layer.height)
    for (const [value, color] of [[1, theme.mass], [2, 'rgba(160, 200, 160, 0.16)']]) {
      g.fillStyle = color
      for (let y = 0; y < H; y++) {
        let run = -1
        for (let x = 0; x <= W; x++) {
          const on = x < W && terrain.cells[y * W + x] === value
          if (on && run < 0) run = x
          if (!on && run >= 0) {
            g.fillRect(Math.floor(run * cw), Math.floor(y * cw), Math.ceil((x - run) * cw), Math.ceil(cw))
            run = -1
          }
        }
      }
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const value = terrain.cells[y * W + x]
        if (!value) continue
        const h = hash(x, y)
        let list
        if (value === 2) list = sprites.rock
        else {
          const above = y > 0 && terrain.cells[(y - 1) * W + x] !== 0
          const above2 = y > 1 && terrain.cells[(y - 2) * W + x] !== 0
          list = !above ? sprites.top : !above2 ? sprites.upper : sprites.deep
        }
        const sprite = list[h % list.length]
        if (!sprite) continue
        g.drawImage(sprite.canvas, sprite.pad, sprite.pad, sprite.canvas.width - sprite.pad * 2, sprite.canvas.height - sprite.pad * 2, x * cw, y * cw, cw, cw)
      }
    }
    layerVersion = terrain.version
    layerTerrain = terrain
  }

  const view = { camX: 0, visible: W, ox: 0 }
  const X = (x) => (x - view.camX) * cell + view.ox
  const Y = (y) => y * cell + oy

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
    ctx.fillStyle = 'rgba(0, 255, 0, 0.35)'
    for (let x = 0; x < W; x += 2) {
      const top = scene.terrain.top(x)
      if (top < H) ctx.fillRect(rect.x + x * sx, rect.y + top * sy, Math.max(1, sx * 2), rect.h - top * sy)
    }
    ctx.fillStyle = theme.wash
    ctx.fillRect(rect.x, rect.y + scene.water * sy, rect.w, rect.h - scene.water * sy)
    for (const u of scene.units) {
      if (!u.alive) continue
      ctx.fillStyle = SIDE_COLORS[u.side]
      ctx.fillRect(rect.x + u.x * sx - 1.5, rect.y + (u.y - 2) * sy, 3, 4)
    }
    ctx.strokeStyle = GREEN
    ctx.lineWidth = 1
    ctx.strokeRect(rect.x + view.camX * sx + 0.5, rect.y - 1.5, view.visible * sx - 1, rect.h + 3)
    ctx.restore()
  }

  // A soldier: its body facing its way, its gun at its aim, a health bar over its head, and
  // under the one being aimed with, a ring
  function unit (u, time) {
    const x = X(u.x)
    const feet = Y(u.y)
    if (!u.alive) {
      drawSprite(ctx, sprites.graves[u.side], x, feet - cell, { dpr, alpha: 0.55 })
      return
    }
    const color = SIDE_COLORS[u.side]
    if (u.selected) {
      ctx.save()
      ctx.strokeStyle = color
      ctx.globalAlpha = 0.45 + Math.sin(time * 6) * 0.25
      ctx.lineWidth = Math.max(1, cell * 0.18)
      ctx.beginPath()
      ctx.ellipse(x, feet, cell * 2, cell * 0.6, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
    // The gun, out from the shoulder
    const angle = u.angle ?? (u.facing ? Math.PI : 0)
    const sx = x
    const sy = feet - cell * 1.55
    const ex = sx + Math.cos(angle) * cell * 2.1
    const ey = sy - Math.sin(angle) * cell * 2.1
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(1.5, cell * 0.38)
    ctx.shadowColor = color
    ctx.shadowBlur = cell * 0.6
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(ex, ey)
    ctx.stroke()
    ctx.restore()
    const pose = u.walking ? Math.floor(time * 8) % 2 : 0
    const body = u.flash > 0 ? sprites.hurt[pose] : sprites.units[u.side][u.facing ? 1 : 0][pose]
    const bob = u.selected && !u.walking ? Math.sin(time * 4) * cell * 0.08 : 0
    drawSprite(ctx, body, x, feet - cell * 1.5 + bob, { dpr })
    // Health: a bar, and the number over it
    const bw = cell * 3.2
    const bh = Math.max(2, cell * 0.32)
    const by = feet - cell * 3.9
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(x - bw / 2 - 1, by - 1, bw + 2, bh + 2)
    ctx.fillStyle = color
    ctx.fillRect(x - bw / 2, by, (bw * Math.max(0, u.hp)) / 100, bh)
    drawText(ctx, String(u.hp), x, by - cell * 0.9, { px: Math.max(9, cell * 1.25), dpr, color, glow: false })
    if (u.selected && u.blink) drawText(ctx, 'v', x, by - cell * 2.3, { px: Math.max(10, cell * 1.6), dpr, color })
  }

  function shot (s, time) {
    const x = X(s.x)
    const y = Y(s.y)
    const color = SIDE_COLORS[s.side] || GREEN
    if (s.kind === 6) {
      // A flame: flickering, never quite the same size
      const flicker = 0.75 + Math.random() * 0.5
      drawGlyph(ctx, Math.random() < 0.5 ? '^' : 'A', x, y - cell * 0.4, { px: cell * 1.5 * flicker, color: FIRE[Math.floor(Math.random() * 3)], weight: 700 })
      return
    }
    if (s.kind === 5) {
      // Dynamite: a red stick with its fuse fizzing
      drawGlyph(ctx, '|', x, y, { px: cell * 2.2, color: '#ff4a3d', weight: 700 })
      drawGlyph(ctx, '*', x + cell * 0.3, y - cell * 1.1, { px: cell * (1 + Math.random() * 0.6), color: FIRE[Math.floor(Math.random() * 2)], weight: 700 })
      return
    }
    const spin = s.kind === 1 || s.kind === 4 ? time * 12 + s.x : 0
    ctx.save()
    ctx.shadowColor = color
    ctx.shadowBlur = cell * 0.9
    drawGlyph(ctx, SHOT_CHARS[s.kind] || 'o', x, y, { px: Math.max(11, cell * (s.kind === 3 ? 1.5 : 2)), color: s.kind === 4 ? '#ffd27f' : color, weight: 700, angle: spin })
    ctx.restore()
  }

  /**
   * scene: {
   *   terrain, water, time (seconds), camX,
   *   units: [{ x, y, side, alive, hp, facing, angle, walking, selected, blink, flash }],
   *   shots: [{ x, y, kind (see SHOT_CHARS), side }],
   *   aim: { points: [x, y, ...], tip: { x, y }, side } | null,
   *   particles, texts: [{ text, x, y, size, color, alpha }], flash, shake
   * }
   */
  function draw (scene) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!sprites) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const wanted = THEMES[LEVELS[scene.terrain.style]?.theme] || THEMES.grass
    if (wanted !== theme) {
      theme = wanted
      build()
    }
    if (scene.terrain !== layerTerrain || scene.terrain.version !== layerVersion) drawLayer(scene.terrain)
    view.camX = Math.max(0, Math.min(W - view.visible, scene.camX))

    ctx.save()
    if (scene.shake > 0) ctx.translate((Math.random() * 2 - 1) * scene.shake * cell, (Math.random() * 2 - 1) * scene.shake * cell)

    const cw = cell * dpr
    ctx.drawImage(layer, view.camX * cw, 0, Math.min(layer.width, view.visible * cw), layer.height, view.ox, oy, Math.min(W, view.visible) * cell, H * cell)

    for (const u of scene.units) unit(u, scene.time)

    // The aim: the first stretch of the flight, and a cross where the barrel points
    if (scene.aim) {
      const color = SIDE_COLORS[scene.aim.side]
      const pts = scene.aim.points
      for (let i = 0; i < pts.length; i += 2) {
        drawGlyph(ctx, '.', X(pts[i]), Y(pts[i + 1]), { px: Math.max(10, cell * 2), color, alpha: 1 - (i / pts.length) * 0.8 })
      }
      drawGlyph(ctx, '+', X(scene.aim.tip.x), Y(scene.aim.tip.y), { px: Math.max(12, cell * 2.2), color, weight: 700 })
    }

    for (const p of scene.particles) {
      const alpha = Math.max(0, Math.min(1, p.life / p.ttl)) * (p.alpha ?? 1)
      drawGlyph(ctx, p.ch, X(p.x), Y(p.y), { px: cell * (p.size || 1.4), color: p.color, alpha, angle: p.angle || 0, font: p.font || MONO })
    }
    for (const s of scene.shots) shot(s, scene.time)

    // The sea, or lava: a wash with waves rolling along its top
    const sea = Y(scene.water)
    ctx.fillStyle = theme.wash
    ctx.fillRect(0, sea, width, Math.max(0, height - sea))
    const shift = (scene.time * 2) % 2
    for (let x = Math.floor(view.camX) - 2; x < view.camX + view.visible + 2; x += 2) {
      drawSprite(ctx, sprites.wave, X(x + shift), sea + Math.sin(scene.time * 2 + x * 0.4) * cell * 0.25, { dpr })
    }
    ctx.restore()

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
    minimapRect,
    // Fonts that finish loading later need the sprites painted again
    rebuild: build,
    draw
  }
}
