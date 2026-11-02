import { HALF_W, HALF_H, WALL_X, WALL_Y, GOAL_HALF, GOAL_DEPTH, AREA_R, CIRCLE_R, SECOND_SPOT, PLAYER_R, BALL_R } from './engine'
import { GREEN, DIM, LOW, DEEP, HOT, GLOW, MONO, drawSprite, drawText, truncate } from '../ascii/paint'
import { mulberry32 } from '../ascii/random'

// Draws Futsal on a canvas. The court is painted once per size out of characters laid along its
// lines; players and the ball are pre-painted discs moved freely on top, drawn at exactly the
// size they are in the engine, so what touches on screen touches in the match.
//
// On a screen taller than it is wide the court stands on end, turned so that one team attacks up
// the screen (turn 1: home, turn -1: away). Characters always stay upright; only where they go
// turns, and lines pick the characters that run their way on screen.

export const VIEW_W = WALL_X * 2
export const VIEW_H = WALL_Y * 2

// Home players are filled discs and away players hollow ones, so the teams tell apart without
// colour; everyone is the same size
const TEAM_LOOKS = [
  { fill: DIM, mark: DEEP },
  { fill: '#000', mark: GREEN }
]
const BALL_FILL = '#ffffff'
const BALL_GLOW = 'rgba(230, 255, 230, 0.9)'

// The character for a stretch of line heading (dx, dy) on screen
function slant (dx, dy) {
  const slope = Math.abs(dy) / (Math.abs(dx) || 1e-6)
  if (slope < 0.42) return '-'
  if (slope > 2.4) return '|'
  return (dx > 0) === (dy > 0) ? '\\' : '/'
}

// Points every `gap` units round an arc, for laying characters along it
function arcPoints (cx, cy, r, from, to, gap = 0.55) {
  const steps = Math.max(2, Math.ceil((Math.abs(to - from) * r) / gap))
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / steps
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
  })
}

/**
 * A disc `r` units across the middle, painted at the screen's pixel density: a fill, a ring whose
 * outside is the disc's edge, and a character in the middle. `halo` is [r, g, b, alpha] for a
 * soft bloom round it. Returns a sprite for drawSprite.
 */
function paintDisc (unit, dpr, { r, fill, ring, width, mark = '', markColor = GREEN, glow = 0, glowColor = GLOW, halo = null }) {
  const k = unit * dpr
  const radius = r * k
  const bloom = halo ? radius * 2 : 0
  const pad = Math.ceil(Math.max(glow * 2, bloom - radius)) + 2
  const size = Math.ceil(radius * 2 + pad * 2)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const c = size / 2
  if (halo) {
    const [red, green, blue, alpha] = halo
    const gradient = ctx.createRadialGradient(c, c, radius * 0.7, c, c, bloom)
    gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, ${alpha})`)
    gradient.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
  }
  const line = Math.max(1.5 * dpr, width * k)
  ctx.beginPath()
  ctx.arc(c, c, radius - line / 2, 0, Math.PI * 2)
  if (glow) {
    ctx.shadowColor = glowColor
    ctx.shadowBlur = glow
  }
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = line
  ctx.strokeStyle = ring
  ctx.stroke()
  if (mark) {
    ctx.shadowBlur = 0
    ctx.font = `700 ${radius * 1.15}px ${MONO}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = markColor
    ctx.fillText(mark, c, c + radius * 0.06)
  }
  return { canvas, pad, cx: c, cy: c }
}

/** Screen size in units, and where a court position lands on screen (units from the top left). */
export function screenOf (turn) {
  if (turn === 1) return { w: VIEW_H, h: VIEW_W, at: (x, y) => [y + WALL_Y, WALL_X - x] }
  if (turn === -1) return { w: VIEW_H, h: VIEW_W, at: (x, y) => [WALL_Y - y, x + WALL_X] }
  return { w: VIEW_W, h: VIEW_H, at: (x, y) => [x + WALL_X, y + WALL_Y] }
}

/**
 * The court as one picture, `unit` CSS pixels to a unit: the floor, the lines, the goals and the
 * hall's walls. `labels` names the two teams, [home, away].
 */
function paintCourt (unit, dpr, labels, turn) {
  const k = unit * dpr
  const screen = screenOf(turn)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(screen.w * k))
  canvas.height = Math.max(1, Math.round(screen.h * k))
  const ctx = canvas.getContext('2d')
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // Characters go at screen positions in units
  const glyph = (ch, sx, sy, color = DIM, size = 1, weight = 600) => {
    ctx.font = `${weight} ${size * k}px ${MONO}`
    ctx.fillStyle = color
    ctx.fillText(ch, sx * k, sy * k)
  }
  const put = (ch, x, y, color, size, weight) => glyph(ch, ...screen.at(x, y), color, size, weight)

  // The playing surface, a shade lighter than the run-off round it, with a little grain
  const [ax, ay] = screen.at(-HALF_W, -HALF_H)
  const [bx, by] = screen.at(HALF_W, HALF_H)
  ctx.fillStyle = DEEP
  ctx.globalAlpha = 0.55
  ctx.fillRect(Math.min(ax, bx) * k, Math.min(ay, by) * k, Math.abs(bx - ax) * k, Math.abs(by - ay) * k)
  ctx.globalAlpha = 1
  const random = mulberry32(29)
  for (let sy = 0.5; sy < screen.h; sy += 1) {
    for (let sx = 0.3; sx < screen.w; sx += 0.6) {
      const inside = sx > Math.min(ax, bx) + 0.5 && sx < Math.max(ax, bx) - 0.5 && sy > Math.min(ay, by) + 0.5 && sy < Math.max(ay, by) - 0.5
      const r = random()
      if (r < (inside ? 0.045 : 0.02)) glyph(r < 0.02 ? '.' : r < 0.032 ? "'" : ',', sx, sy, LOW, 1, 400)
    }
  }

  ctx.shadowColor = GLOW
  ctx.shadowBlur = Math.max(1, k * 0.25)
  // A straight line between two court points: dashes across the screen, bars down it
  const line = (x0, y0, x1, y1, { color = DIM, dotted = false, ends = true } = {}) => {
    const [s0x, s0y] = screen.at(x0, y0)
    const [s1x, s1y] = screen.at(x1, y1)
    const across = Math.abs(s1x - s0x) > Math.abs(s1y - s0y)
    const length = Math.hypot(s1x - s0x, s1y - s0y)
    const gap = across ? (dotted ? 1.2 : 0.6) : 1
    const steps = Math.max(1, Math.round(length / gap))
    for (let i = ends ? 0 : 1; i <= (ends ? steps : steps - 1); i++) {
      glyph(across ? '-' : dotted ? ':' : '|', s0x + ((s1x - s0x) * i) / steps, s0y + ((s1y - s0y) * i) / steps, color)
    }
  }
  const curve = (points, color = DIM) => {
    for (let i = 1; i < points.length; i++) {
      const [s0x, s0y] = screen.at(...points[i - 1])
      const [s1x, s1y] = screen.at(...points[i])
      glyph(slant(s1x - s0x, s1y - s0y), (s0x + s1x) / 2, (s0y + s1y) / 2, color)
    }
  }

  // The touchlines and the goal lines either side of the goals, which the ball bounces off, are
  // bright; the goal mouths are open. Then the halfway line and the center circle.
  for (const s of [-1, 1]) {
    line(-HALF_W, s * HALF_H, HALF_W, s * HALF_H, { color: GREEN, ends: false })
    line(s * HALF_W, -HALF_H, s * HALF_W, -GOAL_HALF, { color: GREEN, ends: false })
    line(s * HALF_W, GOAL_HALF, s * HALF_W, HALF_H, { color: GREEN, ends: false })
    line(s * HALF_W, -GOAL_HALF, s * HALF_W, GOAL_HALF, { dotted: true, ends: false })
  }
  line(0, -HALF_H, 0, HALF_H, { dotted: true, ends: false })
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) put('+', sx * HALF_W, sy * HALF_H, GREEN)
  curve(arcPoints(0, 0, CIRCLE_R, 0, Math.PI * 2))
  put('+', 0, 0, GREEN)

  for (const s of [-1, 1]) {
    const goalLine = s * HALF_W
    const back = s * (HALF_W + GOAL_DEPTH)
    // The penalty area: a quarter circle round each post, joined by a straight line
    const inward = s > 0 ? Math.PI : 0
    curve(arcPoints(goalLine, -GOAL_HALF, AREA_R, inward + (s > 0 ? Math.PI / 2 : -Math.PI / 2), inward))
    curve(arcPoints(goalLine, GOAL_HALF, AREA_R, inward, inward + (s > 0 ? -Math.PI / 2 : Math.PI / 2)))
    const front = goalLine - s * AREA_R
    line(front, -GOAL_HALF, front, GOAL_HALF, { ends: false })
    put('+', front, 0, GREEN)
    put('+', goalLine - s * SECOND_SPOT, 0)
    // The goal: the net's mesh, its frame and the posts
    for (let x = HALF_W + 0.45; x < HALF_W + GOAL_DEPTH - 0.2; x += 0.6) {
      for (let y = -GOAL_HALF + 0.75; y < GOAL_HALF - 0.4; y += 1) put('#', s * x, y, LOW, 0.9, 400)
    }
    line(back, -GOAL_HALF, back, GOAL_HALF)
    for (const sy of [-1, 1]) line(goalLine, sy * GOAL_HALF, back, sy * GOAL_HALF, { ends: false })
    for (const sy of [-1, 1]) put('o', goalLine, sy * GOAL_HALF, GREEN, 1.3, 800)
  }

  // The hall's walls
  for (const sy of [0.35, screen.h - 0.35]) {
    for (let sx = 0.6; sx <= screen.w - 0.6; sx += 0.6) glyph('=', sx, sy, LOW)
  }
  for (const sx of [0.3, screen.w - 0.3]) {
    for (let sy = 1; sy <= screen.h - 1; sy += 1) glyph('|', sx, sy, LOW)
  }

  // Each team's end, and which way it plays
  ctx.shadowBlur = 0
  if (labels) {
    if (turn === 0) {
      put(`${labels[0]} >>`, -HALF_W / 2, HALF_H + 2.2, LOW)
      put(`<< ${labels[1]}`, HALF_W / 2, HALF_H + 2.2, LOW)
    } else {
      // Beside the nets: the team attacking up the screen defends the bottom end
      const [up, down] = turn === 1 ? [labels[0], labels[1]] : [labels[1], labels[0]]
      glyph(`${down} v`, 7.2, 2.3, LOW)
      glyph(`${up} ^`, 7.2, screen.h - 2.3, LOW)
    }
  }
  return canvas
}

export function createRenderer (canvas) {
  const ctx = canvas.getContext('2d')
  let width = 0
  let height = 0
  let dpr = 1
  let unit = 0 // CSS pixels per unit
  let turn = 0
  let screen = screenOf(0)
  let labels = null
  let court = null
  let ball = null
  const sprites = new Map() // `${team}${mark}${me}${held}` -> a player sprite

  function build () {
    sprites.clear()
    if (!width) return
    court = paintCourt(unit, dpr, labels, turn)
    // White, glowing and ringed in black, so it stands out against the floor and the players alike
    ball = paintDisc(unit, dpr, { r: BALL_R, fill: BALL_FILL, ring: '#000', width: 0.14, glow: Math.max(3, unit * 0.7) * dpr, glowColor: BALL_GLOW, halo: [220, 255, 220, 0.3] })
  }

  // me: this device's own player, with a halo; held: the kick button's down, which lights the ring
  function playerSprite (team, mark, me, held) {
    const key = `${team}${mark}${me}${held}`
    let sprite = sprites.get(key)
    if (!sprite) {
      const look = TEAM_LOOKS[team]
      const glow = Math.max(1.5, unit * 0.4) * dpr
      sprite = paintDisc(unit, dpr, {
        r: PLAYER_R,
        fill: look.fill,
        ring: held ? HOT : GREEN,
        width: held ? 0.3 : 0.17,
        mark,
        markColor: look.mark,
        glow: held || me ? glow * 1.6 : glow,
        halo: me ? [0, 255, 0, 0.2] : null
      })
      sprites.set(key, sprite)
    }
    return sprite
  }

  // Court units to CSS pixels on the canvas
  const at = (x, y) => {
    const [sx, sy] = screen.at(x, y)
    return [sx * unit, sy * unit]
  }
  // Sizes are in units, but small text never shrinks below `min` CSS pixels, so the court
  // stays readable zoomed out on a phone
  const text = (str, [x, y], { size = 1, min = 0, ...style } = {}) =>
    drawText(ctx, str, x, y, { px: Math.max(min, size * unit), dpr, ...style })

  /**
   * scene: {
   *   ball: { x, y }, trail: [{ x, y }],
   *   players: [{ x, y, team, mark, look, held, label, marker }] (look: me, mate or foe),
   *   zone: { x, y, r } (the ring the kick-off keeps opponents out of), countdown: { x, y, text },
   *   particles: [{ x, y, ch, color, life, ttl }],
   *   texts: [{ text, dy, size, display, color, alpha }] (dy: units below the middle of the screen),
   *   flash, shake, time
   * }
   * Positions are court units, except the texts, which stay put on screen whichever way it's turned.
   */
  function draw (scene) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    if (!court) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.save()
    if (scene.shake > 0) ctx.translate((Math.random() * 2 - 1) * scene.shake * unit * 0.6, (Math.random() * 2 - 1) * scene.shake * unit * 0.6)
    ctx.drawImage(court, 0, 0, court.width / dpr, court.height / dpr)

    // The kick-off's ring: dots that slowly turn, so it reads as a rule rather than a line
    if (scene.zone) {
      const { x, y, r } = scene.zone
      const count = Math.round(r * 5)
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + scene.time * 0.4
        text('.', at(x + Math.cos(a) * r, y + Math.sin(a) * r), { size: 1.2, min: 9, color: DIM, alpha: 0.75, glow: false, outline: false })
      }
    }

    scene.trail.forEach((point, i) => {
      text('.', at(point.x, point.y), { size: 1.3, min: 8, color: HOT, alpha: ((i + 1) / (scene.trail.length + 1)) * 0.7, glow: false, outline: false })
    })

    for (const p of scene.players) {
      drawSprite(ctx, playerSprite(p.team, p.mark, p.look === 'me', !!p.held), ...at(p.x, p.y), { dpr })
    }

    drawSprite(ctx, ball, ...at(scene.ball.x, scene.ball.y), { dpr })

    for (const p of scene.particles) {
      text(p.ch, at(p.x, p.y), { min: 8, color: p.color, alpha: Math.max(0, p.life / p.ttl), glow: false, outline: false })
    }
    ctx.restore()

    // Names over the players, and a marker over this device's own
    const labelPx = Math.max(9, unit * 0.9)
    for (const p of scene.players) {
      const [x, y] = at(p.x, p.y)
      const above = y - PLAYER_R * unit - labelPx * 0.75
      if (p.marker) drawText(ctx, 'v', x, above, { px: labelPx * 1.1, dpr, color: GREEN })
      else if (p.label) drawText(ctx, truncate(p.label, 12), x, above, { px: labelPx, dpr, color: p.look === 'foe' ? DIM : GREEN, glow: false })
    }
    if (scene.countdown) text(scene.countdown.text, at(scene.countdown.x, scene.countdown.y), { size: 2.2, min: 16, display: true, color: GREEN })
    for (const item of scene.texts) text(item.text, [width / 2, height / 2 + item.dy * unit], item)
    if (scene.flash > 0) {
      ctx.fillStyle = `rgba(0, 255, 0, ${0.22 * scene.flash})`
      ctx.fillRect(0, 0, width, height)
    }
  }

  return {
    resize (cssWidth, cssHeight, pixelRatio, nextTurn = 0) {
      width = cssWidth
      height = cssHeight
      dpr = pixelRatio
      turn = nextTurn
      screen = screenOf(turn)
      unit = width / screen.w
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      build()
    },
    setLabels (next) {
      if (next?.join() === labels?.join()) return
      labels = next
      build()
    },
    // Fonts that finish loading later need the court and sprites painted again
    rebuild: build,
    draw
  }
}
