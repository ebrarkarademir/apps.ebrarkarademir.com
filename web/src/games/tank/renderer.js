import { COLS, ROWS, SIZE, TANK_R, mapCells, mulberry32 } from './engine'
import { GREEN, DIM, LOW, MONO, paint, drawSprite, drawText, truncate } from '../ascii/paint'

// Draws Tank ASCII on a canvas: the arena is painted once per map and size, tanks and shells
// are pre-painted sprites turned and moved freely on top.

// Tanks face right: treads above and below, the hull with its turret, then the barrel. The
// two tread frames roll the track while the tank drives or turns.
const TANK_FRAMES = [
  [' #=#=#', ' [(@)]=-', ' #=#=#'],
  [' =#=#=', ' [(@)]=-', ' =#=#=']
]
const WRECK = [' x.#,x', ' [x%x]', " ,#.x'"]
const TANK_PIVOT = [3.5, 1.5] // the middle of the hull

// The whole arena as text: a dotted floor, a double-line border and hatched blocks
function arenaLines (map) {
  const random = mulberry32(17)
  const grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => {
    const r = random()
    return r < 0.012 ? '.' : r < 0.018 ? "'" : r < 0.022 ? ',' : r < 0.024 ? '`' : ' '
  }))
  const kind = Array.from({ length: ROWS }, () => Array(COLS).fill('floor'))
  mapCells(map).forEach(([c0, r0, w, h], index) => {
    const border = index < 4
    for (let r = r0; r < r0 + h; r++) {
      for (let c = c0; c < c0 + w; c++) {
        const top = r === r0
        const bottom = r === r0 + h - 1
        const side = c === c0 || c === c0 + w - 1
        let ch
        if (border) ch = h === 1 ? '=' : '|'
        else if ((top || bottom) && side) ch = top ? '.' : "'"
        else if (top || bottom) ch = '-'
        else if (side) ch = '|'
        else ch = '/' // hatched, like a wall cut through on a plan
        grid[r][c] = ch
        kind[r][c] = border || top || bottom || side ? 'edge' : 'fill'
      }
    }
  })
  return { lines: grid.map(row => row.join('')), kind }
}

export function createRenderer (canvas) {
  const ctx = canvas.getContext('2d')
  let size = 0
  let dpr = 1
  let unit = 0 // CSS pixels per unit (one row)
  let map = 0
  let sprites = null

  function build () {
    if (!size) return
    const rh = unit * dpr
    const cw = rh * 0.6
    const glow = Math.max(1.5, unit * 0.4) * dpr
    const arena = arenaLines(map)
    const hero = { cw, rh, glow: glow * 1.5, weight: 700, scale: 1.1, pivot: TANK_PIVOT }
    sprites = {
      arena: paint(arena.lines, (ch, x, y) => ({ edge: GREEN, fill: DIM, floor: LOW })[arena.kind[y][x]], { cw, rh, glow: glow / 2 }),
      mine: TANK_FRAMES.map(lines => paint(lines, () => GREEN, { ...hero, halo: 0.22 })),
      enemy: TANK_FRAMES.map(lines => paint(lines, () => DIM, { ...hero, glow })),
      wreck: paint(WRECK, () => LOW, { cw, rh, glow: 0, pivot: TANK_PIVOT }),
      shell: paint(['*'], () => GREEN, { cw, rh, glow: glow * 1.5, weight: 700, scale: 1.5 }),
      ownShell: paint(['o'], () => GREEN, { cw, rh, glow, weight: 700, scale: 1.2 })
    }
  }

  const px = (units) => units * unit
  // Sizes are in units, but small text and marks never shrink below `min` CSS pixels, so the
  // zoomed-out arena stays readable on a phone
  const text = (str, x, y, { size = 1, min = 0, ...style } = {}) =>
    drawText(ctx, str, px(x), px(y), { px: Math.max(min, size * unit), dpr, ...style })

  /**
   * scene: {
   *   tanks: [{ x, y, a, me, tread, alive, alpha, label }],
   *   shells: [{ x, y, mine, trail: [{ x, y }] }],
   *   aim: [{ x, y, bounced }], particles: [{ x, y, ch, color, life, ttl }],
   *   texts: [{ text, x, y, size, display, color, alpha }], flash, shake
   * }
   * All positions in units.
   */
  function draw (scene) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    if (!sprites) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.save()
    if (scene.shake > 0) ctx.translate((Math.random() * 2 - 1) * scene.shake * unit * 0.8, (Math.random() * 2 - 1) * scene.shake * unit * 0.8)
    const { canvas: arena, pad } = sprites.arena
    ctx.drawImage(arena, -pad / dpr, -pad / dpr, arena.width / dpr, arena.height / dpr)

    scene.aim.forEach((dot, i) => {
      const fade = 1 - i / Math.max(1, scene.aim.length)
      text('.', dot.x, dot.y, { size: 1.4, min: 12, color: GREEN, alpha: (dot.bounced ? 0.35 : 0.8) * fade, glow: false, outline: false })
    })
    for (const tank of scene.tanks) {
      if (!tank.alive) drawSprite(ctx, sprites.wreck, px(tank.x), px(tank.y), { angle: tank.a, dpr })
    }
    for (const tank of scene.tanks) {
      if (!tank.alive) continue
      const frames = tank.me ? sprites.mine : sprites.enemy
      drawSprite(ctx, frames[tank.tread], px(tank.x), px(tank.y), { angle: tank.a, alpha: tank.alpha, dpr })
    }
    for (const shell of scene.shells) {
      shell.trail.forEach((point, i) => {
        text('.', point.x, point.y, { min: 9, color: DIM, alpha: (i + 1) / (shell.trail.length + 1) * 0.7, glow: false, outline: false })
      })
      drawSprite(ctx, shell.mine ? sprites.ownShell : sprites.shell, px(shell.x), px(shell.y), { dpr })
    }
    for (const p of scene.particles) {
      text(p.ch, p.x, p.y, { min: 8, color: p.color, alpha: Math.max(0, p.life / p.ttl), glow: false, outline: false })
    }
    ctx.restore()

    // Labels sit just above each tank (below it at the top edge), kept inside the arena
    const labelPx = Math.max(10, unit * 0.95)
    const offset = TANK_R * unit * 1.45 + labelPx * 0.6
    ctx.font = `600 ${labelPx}px ${MONO}`
    for (const tank of scene.tanks) {
      if (!tank.label) continue
      const label = truncate(tank.label, 16)
      const half = ctx.measureText(label).width / 2 + unit * 1.4 // clear of the side walls too
      const x = Math.min(size - half, Math.max(half, px(tank.x)))
      const above = px(tank.y) - offset
      const y = above > labelPx ? above : px(tank.y) + offset
      drawText(ctx, label, x, y, { px: labelPx, dpr, color: tank.me ? GREEN : DIM, glow: false })
    }
    for (const item of scene.texts) text(item.text, item.x ?? SIZE / 2, item.y, item)
    if (scene.flash > 0) {
      ctx.fillStyle = `rgba(0, 255, 0, ${0.25 * scene.flash})`
      ctx.fillRect(0, 0, size, size)
    }
  }

  return {
    resize (cssSize, pixelRatio) {
      size = cssSize
      dpr = pixelRatio
      unit = size / ROWS
      canvas.width = Math.max(1, Math.round(size * dpr))
      canvas.height = Math.max(1, Math.round(size * dpr))
      canvas.style.width = `${size}px`
      canvas.style.height = `${size}px`
      build()
    },
    setMap (index) {
      if (index === map && sprites) return
      map = index
      build()
    },
    // Fonts that finish loading later need the sprites painted again
    rebuild: build,
    draw
  }
}
