import { W, H } from './terrain'
import { GREEN, DIM, LOW, MONO, paint, drawSprite, drawText, drawGlyph } from '../ascii/paint'

// Draws Crater Duel. The ground is made of characters on a dark green wash, drawn once into a
// layer of its own and again only when a crater changes it. The view shows the whole height of
// the map; when the screen is too narrow for its whole width it shows part of it (camX, in
// cells, is its left edge), with a strip along the top showing all of it.

export const SIDE_COLORS = ['#f2f6ea', '#ffb000']
const WATER = '#3fd0ff'
const MASS = 'rgba(0, 255, 0, 0.11)'
const MINIMAP_H = 16

const UNIT = [' o ', '/|\\', '/ \\']
const GRAVE = [' + ', '_|_']
const SHOT_CHARS = ['o', '@', '*', '*'] // shell, grenade, cluster, bomblet

const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 997

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

  function build () {
    const cw = cell * dpr
    const glyph = (ch, color, glow = 0) => paint([ch], () => color, { cw, rh: cw, glow, weight: 700 })
    const lit = Math.max(1, cell * 0.25) * dpr
    sprites = {
      top: ['"', "'", '^', '"'].map(ch => glyph(ch, GREEN, lit)),
      upper: ['#', '#', '%'].map(ch => glyph(ch, DIM)),
      deep: [':', '.', '%', ':', ' '].map(ch => (ch === ' ' ? null : glyph(ch, LOW))),
      wave: glyph('~', WATER, lit),
      units: SIDE_COLORS.map(color => paint(UNIT, () => color, { cw, rh: cw, glow: lit * 1.5, weight: 700 })),
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
    g.fillStyle = MASS
    for (let y = 0; y < H; y++) {
      let run = -1
      for (let x = 0; x <= W; x++) {
        const solid = x < W && terrain.cells[y * W + x] === 1
        if (solid && run < 0) run = x
        if (!solid && run >= 0) {
          g.fillRect(Math.floor(run * cw), Math.floor(y * cw), Math.ceil((x - run) * cw), Math.ceil(cw))
          run = -1
        }
      }
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (terrain.cells[y * W + x] !== 1) continue
        const h = hash(x, y)
        const above = y > 0 && terrain.cells[(y - 1) * W + x] === 1
        const above2 = y > 1 && terrain.cells[(y - 2) * W + x] === 1
        const set = !above ? sprites.top : !above2 ? sprites.upper : sprites.deep
        const sprite = set[h % set.length]
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
    ctx.fillStyle = 'rgba(63, 208, 255, 0.4)'
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

  /**
   * scene: {
   *   terrain, water, time (seconds, for the waves), camX,
   *   units: [{ x, y, side, alive, hp, selected, blink }],
   *   shots: [{ x, y, kind (0 shell, 1 grenade, 2 cluster, 3 bomblet), side }],
   *   aim: { points: [x, y, ...], tip: { x, y }, side } | null,
   *   particles, texts: [{ text, x, y, size, color, alpha }], flash, shake
   * }
   */
  function draw (scene) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!sprites) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (scene.terrain !== layerTerrain || scene.terrain.version !== layerVersion) drawLayer(scene.terrain)
    view.camX = Math.max(0, Math.min(W - view.visible, scene.camX))

    ctx.save()
    if (scene.shake > 0) ctx.translate((Math.random() * 2 - 1) * scene.shake * cell, (Math.random() * 2 - 1) * scene.shake * cell)

    // Ground
    const cw = cell * dpr
    ctx.drawImage(layer, view.camX * cw, 0, Math.min(layer.width, view.visible * cw), layer.height, view.ox, oy, Math.min(W, view.visible) * cell, H * cell)

    // Units, their health and the one being aimed with
    for (const u of scene.units) {
      const sprite = u.alive ? sprites.units[u.side] : sprites.graves[u.side]
      const rows = u.alive ? UNIT.length : GRAVE.length
      drawSprite(ctx, sprite, X(u.x), Y(u.y) - (rows * cell) / 2, { dpr, alpha: u.alive ? 1 : 0.55 })
      if (!u.alive) continue
      drawText(ctx, String(u.hp), X(u.x), Y(u.y) - 3.9 * cell, { px: Math.max(9, cell * 1.35), dpr, color: SIDE_COLORS[u.side], glow: false })
      if (u.selected && u.blink) drawText(ctx, 'v', X(u.x), Y(u.y) - 5.4 * cell, { px: Math.max(10, cell * 1.6), dpr, color: SIDE_COLORS[u.side] })
    }

    // The aim: the first stretch of the flight, and a cross where the barrel points
    if (scene.aim) {
      const color = SIDE_COLORS[scene.aim.side]
      const pts = scene.aim.points
      for (let i = 0; i < pts.length; i += 2) {
        drawGlyph(ctx, '.', X(pts[i]), Y(pts[i + 1]), { px: Math.max(10, cell * 2), color, alpha: 1 - i / pts.length * 0.8 })
      }
      drawGlyph(ctx, '+', X(scene.aim.tip.x), Y(scene.aim.tip.y), { px: Math.max(12, cell * 2.2), color, weight: 700 })
    }

    for (const s of scene.shots) {
      drawGlyph(ctx, SHOT_CHARS[s.kind] || 'o', X(s.x), Y(s.y), { px: Math.max(11, cell * (s.kind === 3 ? 1.5 : 2)), color: SIDE_COLORS[s.side] || GREEN, weight: 700 })
    }

    for (const p of scene.particles) {
      const alpha = Math.max(0, Math.min(1, p.life / p.ttl))
      drawGlyph(ctx, p.ch, X(p.x), Y(p.y), { px: cell * (p.size || 1.4), color: p.color, alpha, angle: p.angle || 0, font: p.font || MONO })
    }

    // The sea: a wash with waves rolling along its top
    const sea = Y(scene.water)
    ctx.fillStyle = 'rgba(30, 150, 220, 0.2)'
    ctx.fillRect(0, sea, width, Math.max(0, height - sea))
    const shift = (scene.time * 2) % 2
    for (let x = Math.floor(view.camX) - 2; x < view.camX + view.visible + 2; x += 2) {
      drawSprite(ctx, sprites.wave, X(x + shift), sea + Math.sin(scene.time * 2 + x * 0.4) * cell * 0.25, { dpr })
    }
    ctx.restore()

    for (const item of scene.texts) {
      drawText(ctx, item.text, X(item.x), Y(item.y), { px: Math.max(item.min || 0, item.size * cell), dpr, color: item.color || GREEN, alpha: item.alpha ?? 1, display: item.display ?? true })
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
    minimapRect,
    // Fonts that finish loading later need the sprites painted again
    rebuild: build,
    draw
  }
}
