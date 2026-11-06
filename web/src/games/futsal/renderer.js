import { HALF_W, HALF_H, WALL_X, WALL_Y, GOAL_HALF, GOAL_DEPTH, AREA_R, CIRCLE_R, SECOND_SPOT, PLAYER_R, BALL_R } from './engine'
import { GREEN, DIM, LOW, HOT } from '../ascii/paint'
import { PAL, grid, toCanvas, pixelText, clip } from '../../pixel/kit'

// Draws Futsal as pixel art. The court is painted once per size at a low resolution, P art
// pixels to a court unit, then blown up onto the screen with hard edges: a striped green floor,
// white lines, nets and boards round the hall. Players are round sprites in their team's color
// (home blue, away red), the ball a white one; they move freely over the court at the size they
// are in the engine, so what touches on screen touches in the match. Words go on top at the
// screen's own resolution.
//
// On a screen taller than it is wide the court stands on end, turned so that one team attacks up
// the screen (turn 1: home, turn -1: away). Words always stay upright.

export const VIEW_W = WALL_X * 2
export const VIEW_H = WALL_Y * 2

const P = 4 // art pixels to a court unit

// Each team's colors: main, light, dark
export const TEAM_COLORS = [
  { main: PAL.b, light: PAL.c, dark: PAL.n, name: PAL.c },
  { main: PAL.r, light: PAL.o, dark: PAL.p, name: PAL.o }
]

/** Screen size in units, and where a court position lands on screen (units from the top left). */
export function screenOf (turn) {
  if (turn === 1) return { w: VIEW_H, h: VIEW_W, at: (x, y) => [y + WALL_Y, WALL_X - x] }
  if (turn === -1) return { w: VIEW_H, h: VIEW_W, at: (x, y) => [WALL_Y - y, x + WALL_X] }
  return { w: VIEW_W, h: VIEW_H, at: (x, y) => [x + WALL_X, y + WALL_Y] }
}

/** The court as a small picture, P art pixels to a unit. */
function paintCourt (turn) {
  const screen = screenOf(turn)
  const w = Math.round(screen.w * P)
  const h = Math.round(screen.h * P)
  const art = grid(w, h)
  const pt = (x, y) => screen.at(x, y).map(v => Math.round(v * P))
  // A rectangle between two court corners, whichever way the court is turned
  const fill = (x0, y0, x1, y1, c) => {
    const [ax, ay] = pt(x0, y0)
    const [bx, by] = pt(x1, y1)
    art.rect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay), c)
  }
  const line = (x0, y0, x1, y1, c = 'w') => {
    const [ax, ay] = pt(x0, y0)
    const [bx, by] = pt(x1, y1)
    art.line(ax, ay, bx, by, c)
  }
  const arc = (cx, cy, r, from, to, c = 'w') => {
    const steps = Math.ceil(Math.abs(to - from) * r * P * 1.5)
    for (let i = 0; i <= steps; i++) {
      const a = from + ((to - from) * i) / steps
      const [x, y] = pt(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
      art.px(x, y, c)
    }
  }

  // The hall floor round the court, then the court in stripes across its length
  art.rect(0, 0, w, h, 't')
  const stripe = HALF_W / 5
  for (let i = 0; i < 10; i++) fill(-HALF_W + i * stripe, -HALF_H, -HALF_W + (i + 1) * stripe, HALF_H, i % 2 ? '#34a75b' : 'G')

  // Boards round the hall, in colors
  const boards = ['r', 'y', 'b', 'w']
  for (let i = 0; i * 16 < w; i++) {
    const c = boards[i % boards.length]
    art.rect(i * 16, 0, 15, 3, c).rect(i * 16, h - 3, 15, 3, c)
  }
  for (let i = 0; i * 16 < h; i++) {
    const c = boards[(i + 2) % boards.length]
    art.rect(0, i * 16, 3, 15, c).rect(w - 3, i * 16, 3, 15, c)
  }
  art.box(3, 3, w - 6, h - 6, 'k')

  // The lines: touchlines and goal lines, halfway, the center circle and spot
  for (const s of [-1, 1]) {
    line(-HALF_W, s * HALF_H, HALF_W, s * HALF_H)
    line(s * HALF_W, -HALF_H, s * HALF_W, HALF_H)
  }
  line(0, -HALF_H, 0, HALF_H)
  arc(0, 0, CIRCLE_R, 0, Math.PI * 2)
  const spot = (x, y) => { const [sx, sy] = pt(x, y); art.rect(sx - 1, sy - 1, 2, 2, 'w') }
  spot(0, 0)

  for (const s of [-1, 1]) {
    const goalLine = s * HALF_W
    const inward = s > 0 ? Math.PI : 0
    arc(goalLine, -GOAL_HALF, AREA_R, inward + (s > 0 ? Math.PI / 2 : -Math.PI / 2), inward)
    arc(goalLine, GOAL_HALF, AREA_R, inward, inward + (s > 0 ? -Math.PI / 2 : Math.PI / 2))
    const front = goalLine - s * AREA_R
    line(front, -GOAL_HALF, front, GOAL_HALF)
    spot(front, 0)
    spot(goalLine - s * SECOND_SPOT, 0)

    // The goal: a net of squares in its frame, and the posts
    const back = s * (HALF_W + GOAL_DEPTH)
    fill(goalLine, -GOAL_HALF, back, GOAL_HALF, 'd')
    const [ax, ay] = pt(goalLine, -GOAL_HALF)
    const [bx, by] = pt(back, GOAL_HALF)
    for (let y = Math.min(ay, by); y < Math.max(ay, by); y++) {
      for (let x = Math.min(ax, bx); x < Math.max(ax, bx); x++) if ((x + y) % 3 === 0 || (x - y) % 3 === 0) art.px(x, y, 'g')
    }
    line(back, -GOAL_HALF, back, GOAL_HALF, 'w')
    line(goalLine, -GOAL_HALF, back, -GOAL_HALF, 'w')
    line(goalLine, GOAL_HALF, back, GOAL_HALF, 'w')
    for (const sy of [-1, 1]) {
      const [px, py] = pt(goalLine, sy * GOAL_HALF)
      art.rect(px - 1, py - 1, 3, 3, 'w').box(px - 2, py - 2, 5, 5, 'k')
    }
  }
  return toCanvas(art)
}

/** A round sprite d art pixels across: a fill with a light top left and a dark bottom right. */
function disc (d, { main, light, dark, ring = null, outline = PAL.k }) {
  const size = d + 6
  const art = grid(size, size)
  const c = (size - 1) / 2
  const r = d / 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x - c, y - c)
      if (dist > r) continue
      const shade = (x - c) + (y - c)
      art.px(x, y, shade < -r * 0.7 ? light : shade > r * 0.6 ? dark : main)
    }
  }
  art.outline(outline)
  if (ring) art.outline(ring)
  return toCanvas(art)
}

function ballSprite () {
  const d = Math.round(BALL_R * 2 * P)
  const art = grid(d + 2, d + 2)
  art.disc((d + 1) / 2, (d + 1) / 2, d / 2 - 0.2, 'w')
  // A few dark patches, like a ball's panels
  const m = Math.floor((d + 1) / 2)
  art.rect(m - 1, m - 1, 2, 2, 'k').px(m - 3, m + 1, 'k').px(m + 2, m - 3, 'k').px(m + 2, m + 2, 'g').px(m - 3, m - 2, 'g')
  return toCanvas(art.outline('k'))
}

// Particle colors, from the stage's terminal palette to this picture's
const CONFETTI = [PAL.y, PAL.c, PAL.r, PAL.w, PAL.l, PAL.o]
const inkOf = (p) => (p.color === LOW ? PAL.g : CONFETTI[(p.ch?.charCodeAt(0) || 0) % CONFETTI.length])
const textInk = (color) => (color === DIM ? PAL.g : color === LOW ? PAL.s : color === HOT ? PAL.y : color === GREEN || !color ? PAL.w : color)

export function createRenderer (canvas) {
  const ctx = canvas.getContext('2d')
  const art = document.createElement('canvas')
  const g = art.getContext('2d')
  let width = 0
  let height = 0
  let dpr = 1
  let unit = 0 // CSS pixels per unit
  let turn = 0
  let screen = screenOf(0)
  let labels = null
  let court = null
  let ball = null
  const sprites = new Map() // `${team}${me}${held}` -> a player sprite

  function build () {
    sprites.clear()
    if (!width) return
    court = paintCourt(turn)
    art.width = court.width
    art.height = court.height
    ball = ballSprite()
  }

  function playerSprite (team, me, held) {
    const key = `${team}${me}${held}`
    let sprite = sprites.get(key)
    if (!sprite) {
      const look = TEAM_COLORS[team] || TEAM_COLORS[0]
      sprite = disc(Math.round(PLAYER_R * 2 * P), { ...look, outline: held ? PAL.w : PAL.k, ring: me ? PAL.y : null })
      sprites.set(key, sprite)
    }
    return sprite
  }

  // Court units to art pixels, and to CSS pixels on the canvas
  const artAt = (x, y) => screen.at(x, y).map(v => v * P)
  const at = (x, y) => screen.at(x, y).map(v => v * unit)
  const put = (image, x, y) => {
    const [ax, ay] = artAt(x, y)
    g.drawImage(image, Math.round(ax - image.width / 2), Math.round(ay - image.height / 2))
  }

  // Words, sized in units but never smaller than `min` CSS pixels. Press Start 2P is wide, so a
  // size is drawn a little smaller than asked.
  const text = (str, [x, y], { size = 1, min = 0, display = false, color, alpha = 1 } = {}) => {
    const px = Math.max(min * 0.75, size * unit * (display ? 0.6 : 0.72))
    pixelText(ctx, str, x, y, { px, color: textInk(color), alpha })
  }

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
    ctx.fillStyle = PAL.K
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    if (!court) return

    g.imageSmoothingEnabled = false
    g.drawImage(court, 0, 0)

    // The kick-off's ring: dots that slowly turn
    if (scene.zone) {
      const { x, y, r } = scene.zone
      const count = Math.round(r * 5)
      g.fillStyle = PAL.y
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + scene.time * 0.4
        const [ax, ay] = artAt(x + Math.cos(a) * r, y + Math.sin(a) * r)
        g.fillRect(Math.round(ax), Math.round(ay), 2, 2)
      }
    }

    scene.trail.forEach((point, i) => {
      const [ax, ay] = artAt(point.x, point.y)
      g.globalAlpha = ((i + 1) / (scene.trail.length + 1)) * 0.6
      g.fillStyle = PAL.w
      g.fillRect(Math.round(ax - 1), Math.round(ay - 1), 2, 2)
    })
    g.globalAlpha = 1

    // Shadows first, so nobody stands on another's shadow
    g.fillStyle = 'rgba(16, 17, 29, 0.35)'
    for (const p of scene.players) {
      const [ax, ay] = artAt(p.x, p.y)
      g.fillRect(Math.round(ax - PLAYER_R * P + 2), Math.round(ay + PLAYER_R * P - 1), Math.round(PLAYER_R * 2 * P - 2), 2)
    }
    for (const p of scene.players) put(playerSprite(p.team, p.look === 'me', !!p.held), p.x, p.y)
    put(ball, scene.ball.x, scene.ball.y)

    for (const p of scene.particles) {
      const [ax, ay] = artAt(p.x, p.y)
      g.globalAlpha = Math.max(0, Math.min(1, p.life / p.ttl))
      g.fillStyle = inkOf(p)
      g.fillRect(Math.round(ax), Math.round(ay), 2, 2)
    }
    g.globalAlpha = 1

    // Blown up onto the screen, shaken if a goal just went in
    ctx.imageSmoothingEnabled = false
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.save()
    if (scene.shake > 0) ctx.translate(Math.round((Math.random() * 2 - 1) * scene.shake * unit * 0.6), Math.round((Math.random() * 2 - 1) * scene.shake * unit * 0.6))
    ctx.drawImage(art, 0, 0, width, height)
    ctx.restore()

    // Each player's mark, on their shirt
    const markPx = Math.max(7, unit * 1.1)
    for (const p of scene.players) {
      if (!p.mark || p.mark === '?') continue
      const [x, y] = at(p.x, p.y)
      pixelText(ctx, p.mark.slice(0, 1).toUpperCase(), x + 0.5, y + 1, { px: markPx, color: PAL.w, shadow: false })
    }

    // Each team's end and which way it plays
    if (labels) {
      const px = Math.max(7, unit * 0.75)
      if (turn === 0) {
        pixelText(ctx, `${labels[0]} ▶`, ...at(-HALF_W / 2, HALF_H + 2.2), { px, color: TEAM_COLORS[0].name, alpha: 0.85 })
        pixelText(ctx, `◀ ${labels[1]}`, ...at(HALF_W / 2, HALF_H + 2.2), { px, color: TEAM_COLORS[1].name, alpha: 0.85 })
      } else {
        const [up, down] = turn === 1 ? [0, 1] : [1, 0]
        pixelText(ctx, labels[down], 7.5 * unit, 2.3 * unit, { px, color: TEAM_COLORS[down].name, alpha: 0.85 })
        pixelText(ctx, labels[up], 7.5 * unit, height - 2.3 * unit, { px, color: TEAM_COLORS[up].name, alpha: 0.85 })
      }
    }

    // Names over the players, and an arrow over this device's own
    const labelPx = Math.max(7, unit * 0.75)
    for (const p of scene.players) {
      const [x, y] = at(p.x, p.y)
      const above = y - PLAYER_R * unit - labelPx * 1.1
      if (p.marker) {
        const s = Math.max(2, Math.round(unit * 0.35))
        const bob = Math.round(Math.sin(scene.time * 6) * s * 0.5)
        ctx.fillStyle = PAL.k
        ctx.fillRect(Math.round(x - s * 2.5), Math.round(above - s + bob), s * 5, s * 3)
        ctx.fillStyle = PAL.y
        ctx.fillRect(Math.round(x - s * 1.5), Math.round(above + bob), s * 3, s)
        ctx.fillRect(Math.round(x - s * 0.5), Math.round(above + s + bob), s, s)
      } else if (p.label) {
        pixelText(ctx, clip(p.label, 12), x, above, { px: labelPx, color: p.look === 'foe' ? PAL.g : PAL.w })
      }
    }
    if (scene.countdown) text(scene.countdown.text, at(scene.countdown.x, scene.countdown.y), { size: 2.2, min: 16, display: true, color: PAL.y })
    for (const item of scene.texts) text(item.text, [width / 2, height / 2 + item.dy * unit], item)
    if (scene.flash > 0) {
      ctx.fillStyle = `rgba(255, 205, 117, ${0.3 * scene.flash})`
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
      labels = next
    },
    // Words are drawn fresh every frame, so a font that loads later needs nothing done
    rebuild () {},
    draw
  }
}

