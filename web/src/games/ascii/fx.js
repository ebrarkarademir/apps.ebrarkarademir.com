import { GREEN, DIM, LOW, HOT, MONO } from './paint'

// Ready-made effects for the ASCII arcade games, all drawn with characters: lightning that
// flickers down out of the sky, hanabi fireworks, falling sakura petals and katakana glitches.
// Positions are in each game's own units; the particle ones add to a list for stepParticles.

// Full-width katakana, for glitches and decoding effects
export const KATAKANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'

export const glitch = (random = Math.random) => KATAKANA[Math.floor(random() * KATAKANA.length)]

// ---------- Lightning ----------

// Midpoint displacement: every pass puts a kink in the middle of each stretch, sideways by up
// to `jag` times the stretch's length
function kinks (points, jag, passes, random) {
  let list = points
  for (let pass = 0; pass < passes; pass++) {
    const next = [list[0]]
    for (let i = 1; i < list.length; i++) {
      const [ax, ay] = list[i - 1]
      const [bx, by] = list[i]
      const len = Math.hypot(bx - ax, by - ay) || 1
      const offset = (random() * 2 - 1) * jag * len
      next.push([(ax + bx) / 2 - ((by - ay) / len) * offset, (ay + by) / 2 + ((bx - ax) / len) * offset], list[i])
    }
    list = next
  }
  return list
}

/**
 * A lightning bolt from (x0, y0) to (x1, y1): a jagged main channel plus a few forks, each a
 * list of [x, y] points.
 */
export function makeBolt (x0, y0, x1, y1, { jag = 0.24, passes = 6, forks = 2, random = Math.random } = {}) {
  const main = kinks([[x0, y0], [x1, y1]], jag, passes, random)
  const length = Math.hypot(x1 - x0, y1 - y0)
  const heading = Math.atan2(y1 - y0, x1 - x0)
  const branches = Array.from({ length: forks }, () => {
    const [sx, sy] = main[Math.floor((0.15 + random() * 0.55) * (main.length - 1))]
    const angle = heading + (random() < 0.5 ? -1 : 1) * (0.35 + random() * 0.6)
    const reach = length * (0.12 + random() * 0.2)
    return kinks([[sx, sy], [sx + Math.cos(angle) * reach, sy + Math.sin(angle) * reach]], jag, passes - 2, random)
  })
  return { main, branches }
}

// The character that draws a stretch of bolt heading (dx, dy) on screen
function slantOf (dx, dy) {
  const slope = Math.abs(dx) / (Math.abs(dy) || 1e-6)
  if (slope < 0.35) return '|'
  if (slope > 2.4) return '-'
  return (dx > 0) === (dy > 0) ? '\\' : '/'
}

/**
 * Lays characters along a bolt, one every `spacing` units: | where it drops straight down,
 * / and \ where it slants and - where it runs sideways. Returns [{ ch, x, y, fork }].
 */
export function boltGlyphs ({ main, branches }, spacing) {
  const glyphs = []
  const walk = (points, fork) => {
    let next = 0
    for (let i = 1; i < points.length; i++) {
      const [ax, ay] = points[i - 1]
      const [bx, by] = points[i]
      const len = Math.hypot(bx - ax, by - ay)
      const ch = slantOf(bx - ax, by - ay)
      for (; next < len; next += spacing) glyphs.push({ ch, x: ax + ((bx - ax) * next) / len, y: ay + ((by - ay) * next) / len, fork })
      next -= len
    }
  }
  walk(main, false)
  branches.forEach(branch => walk(branch, true))
  return glyphs
}

/** How bright a bolt is `age` seconds after it strikes: a stroke, a gap, a second stroke down the same channel, then a fade. */
export function boltAlpha (age) {
  if (age < 0.05) return 1
  if (age < 0.09) return 0.15
  if (age < 0.17) return 1
  return Math.max(0, 1 - (age - 0.17) / 0.38)
}

/**
 * Draws bolt glyphs, px tall, at the CSS pixel positions toX(x) and toY(y): a green bloom with
 * a white-hot core down the main channel, and dimmer forks.
 */
export function drawBolt (ctx, glyphs, { px, alpha = 1, dpr = 1, toX, toY }) {
  if (alpha <= 0) return
  ctx.save()
  ctx.font = `700 ${px}px ${MONO}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = GREEN
  ctx.shadowBlur = px * 0.8 * dpr
  ctx.fillStyle = GREEN
  for (const g of glyphs) {
    ctx.globalAlpha = alpha * (g.fork ? 0.5 : 1)
    ctx.fillText(g.ch, toX(g.x), toY(g.y))
  }
  ctx.shadowBlur = px * 0.2 * dpr
  ctx.fillStyle = HOT
  ctx.globalAlpha = alpha
  for (const g of glyphs) if (!g.fork) ctx.fillText(g.ch, toX(g.x), toY(g.y))
  ctx.restore()
}

// ---------- Particles ----------

export const SPARKS = ['*', "'", '.', '`', '+', ',']
const PETALS = ['*', "'", ',', '`', '.', '*']

/** Sparks thrown from (x, y), slowing as they fly. */
export function sparks (list, x, y, { count = 10, speed = 9, life = 0.45, random = Math.random } = {}) {
  for (let i = 0; i < count; i++) {
    const angle = random() * Math.PI * 2
    const v = speed * (0.4 + random() * 0.6)
    list.push({ ch: SPARKS[i % SPARKS.length], x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, drag: 3, life: life * (0.6 + random() * 0.4), ttl: life, color: i % 3 ? DIM : GREEN })
  }
}

/**
 * A sakura petal at (x, y) that drifts down, turning and swaying, for `life` seconds. With
 * `pop` it's first thrown up and out, like blossom shaken from a branch.
 */
export function petal (list, x, y, { size = 1, life = 3.5, pop = 0, color = DIM, random = Math.random } = {}) {
  const angle = -Math.PI / 2 + (random() * 2 - 1) * 1.2
  list.push({
    ch: PETALS[Math.floor(random() * PETALS.length)],
    x,
    y,
    vx: Math.cos(angle) * pop * size + (random() * 2 - 1) * 0.3 * size,
    vy: Math.sin(angle) * pop * size,
    gravity: 2.2 * size,
    drag: 1.4,
    sway: (0.5 + random() * 0.7) * size,
    swayRate: 0.35 + random() * 0.35,
    phase: random() * Math.PI * 2,
    spin: (random() * 2 - 1) * 3,
    angle: random() * Math.PI * 2,
    life: life * (0.7 + random() * 0.3),
    ttl: life,
    color
  })
}

/**
 * A hanabi shell bursting at (x, y): a ring of sparks that opens to about `size` units across,
 * droops and twinkles out, with a smaller ring inside.
 */
export function firework (list, x, y, { size = 3, count = 30, random = Math.random } = {}) {
  const turn = random() * Math.PI * 2
  const ring = (n, reach, chars, colors, life) => {
    for (let i = 0; i < n; i++) {
      const angle = turn + (i / n) * Math.PI * 2
      const v = reach * 1.6 * (0.9 + random() * 0.2)
      list.push({ ch: chars[i % chars.length], x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, gravity: size * 0.7, drag: 1.6, life: life * (0.8 + random() * 0.2), ttl: life, color: colors[i % colors.length], twinkle: true })
    }
  }
  ring(count, size, ['*', '+', '*', 'o'], [GREEN, GREEN, DIM], 1.5)
  ring(Math.round(count / 2), size * 0.45, ['.', "'", '.'], [DIM, LOW], 1.1)
}

/**
 * A rocket that climbs about `height` units from (x, y), leaving a trail, and bursts as a
 * firework at the top of its climb. onBurst(x, y) runs as it bursts (for the bang).
 */
export function rocket (list, x, y, { height, size = 3, onBurst, random = Math.random }) {
  // With gravity this strong every rocket takes the same time to reach the top: √(2/1.6) s
  const gravity = height * 1.6
  const speed = Math.sqrt(2 * gravity * height)
  const time = speed / gravity
  list.push({
    ch: '|',
    x,
    y,
    vx: (random() * 2 - 1) * height * 0.04,
    vy: -speed,
    gravity,
    life: time,
    ttl: time,
    color: GREEN,
    trail: 40,
    trailColor: DIM,
    onEnd: (p) => {
      firework(list, p.x, p.y, { size, random })
      onBurst?.(p.x, p.y)
    }
  })
}
