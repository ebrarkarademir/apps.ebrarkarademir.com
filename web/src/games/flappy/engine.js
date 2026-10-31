import { mulberry32 } from '../ascii/random'

// Flappy ASCII simulation, kept free of drawing and timing so it plays the same everywhere.
// A seed fixes the whole course, which is how every player in an online race flies through
// the same pipes on their own device.
//
// Positions are in character cells: x in columns, y in rows. A column is 0.6 rows wide, the
// shape of a JetBrains Mono glyph. Time is in seconds, advanced in fixed steps.

export const COLS = 60
export const ROWS = 60
export const CELL_ASPECT = 0.6
export const GROUND_Y = 54 // the ground line; everything below it is ground
export const BIRD_X = 16 // the bird's center, in columns from the left edge of the view
export const STEP = 1 / 120

export const GRAVITY = 118 // rows/s²
export const FLAP_VY = -37 // rows/s
export const MAX_FALL = 58 // rows/s

export const PIPE_W = 10
export const CAP_OVER = 1 // the cap sticks out this far on each side of the pipe
export const CAP_H = 3
export const SPACING = 34 // from one pipe to the next
export const FIRST_PIPE = COLS + 6 // the first pipe starts just past the right edge
const SWING_RATE = 0.08 // radians per column flown: a sliding gap goes up and down every ~79 columns
const TOP_LIMIT = 8 // gaps stay between these two rows
const BOTTOM_LIMIT = GROUND_Y - 5

export const READY_Y = 26
// The hitbox is a little smaller than the drawing, so grazes with the beak don't count
const HALF_W = 2.3
export const HALF_H = 0.95
// Outlines are drawn through the middle of the character cells at the pipe edges
const EDGE = 0.5

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

// The courses, from slow with wide gaps to fast with gaps that slide up and down. Each value
// pair goes from the first pipe to the `ramp`th, where the course is at its hardest.
// speed: columns/s · gap: height of the gaps · shift: how far one gap can move from the last
// one · moving: the share of pipes whose gap slides · swing: how far a sliding gap goes each way
export const LEVELS = {
  easy: { speed: 20, gap: [19, 15.5], shift: [9, 15], ramp: 60, moving: [0, 0], swing: 0 },
  normal: { speed: 24, gap: [16, 12.5], shift: [12, 20], ramp: 45, moving: [0, 0], swing: 0 },
  hard: { speed: 27, gap: [15, 12], shift: [12, 18], ramp: 40, moving: [0.1, 0.45], swing: 3 },
  insane: { speed: 31, gap: [13.5, 11.5], shift: [13, 18], ramp: 30, moving: [0.35, 0.8], swing: 3.5 }
}
export const LEVEL_NAMES = Object.keys(LEVELS)
export const levelOf = (name) => LEVELS[name] || LEVELS.normal
const lerp = ([from, to], ramp) => from + (to - from) * ramp

/**
 * The pipes for one seed and level, made on demand: pipe(i) -> { x, top, bottom, swing, phase },
 * where x is the left edge of the pipe and top/bottom are the edges of its gap at rest.
 */
export function createCourse (seed, level = 'normal') {
  const settings = levelOf(level)
  const random = mulberry32(seed)
  const pipes = []
  let center = READY_Y
  return (i) => {
    while (pipes.length <= i) {
      const n = pipes.length
      const ramp = Math.min(1, n / settings.ramp)
      const gap = lerp(settings.gap, ramp)
      const shift = lerp(settings.shift, ramp)
      // Levels without sliding gaps draw no extra numbers, so a seed gives the same pipes as before
      const swing = settings.swing && random() < lerp(settings.moving, ramp) ? settings.swing : 0
      const phase = swing ? random() * Math.PI * 2 : 0
      const x = FIRST_PIPE + n * SPACING
      // `center` is where the gap is as the bird flies through it. A sliding gap keeps a little
      // closer to the last one, since it can still be moving away while the bird is inside.
      const reach = shift - swing
      const offset = swing * Math.sin(phase + (x + PIPE_W / 2 - BIRD_X) * SWING_RATE)
      const lo = TOP_LIMIT + gap / 2 + swing
      const hi = BOTTOM_LIMIT - gap / 2 - swing
      const target = lo + random() * (hi - lo)
      const rest = clamp(clamp(target + offset, center - reach, center + reach) - offset, lo, hi)
      center = rest + offset
      pipes.push({ x, top: rest - gap / 2, bottom: rest + gap / 2, swing, phase })
    }
    return pipes[i]
  }
}

/**
 * The edges of a pipe's gap once the view has scrolled to `dist`. A sliding gap moves with the
 * distance flown rather than the clock, so it is in the same place for everyone who gets there.
 */
export function gapAt (p, dist) {
  if (!p.swing) return p
  const offset = p.swing * Math.sin(p.phase + dist * SWING_RATE)
  return { top: p.top + offset, bottom: p.bottom + offset }
}

/** Pipes that are at least partly on screen when the view starts at `camera`. */
export function pipesInView (course, camera) {
  const first = Math.max(0, Math.floor((camera - PIPE_W - CAP_OVER - FIRST_PIPE) / SPACING))
  const last = Math.floor((camera + COLS + CAP_OVER - FIRST_PIPE) / SPACING)
  const list = []
  for (let i = first; i <= last; i++) list.push(course(i))
  return list
}

// A pipe counts as passed once the bird's center is past the pipe's center
export function scoreAt (dist) {
  const passed = dist + BIRD_X - (FIRST_PIPE + PIPE_W / 2)
  return passed < 0 ? 0 : Math.floor(passed / SPACING) + 1
}

function hitsPipe (course, dist, y) {
  const left = dist + BIRD_X - HALF_W
  const right = dist + BIRD_X + HALF_W
  const top = y - HALF_H
  const bottom = y + HALF_H
  const first = Math.max(0, Math.floor((left - PIPE_W - CAP_OVER - FIRST_PIPE) / SPACING))
  for (let i = first; i <= first + 1; i++) {
    const p = course(i)
    const gap = gapAt(p, dist)
    const inBody = right > p.x + EDGE && left < p.x + PIPE_W - EDGE
    if (inBody && (top < gap.top || bottom > gap.bottom)) return true
    // The caps are wider than the pipes and two rows deep
    const inCap = right > p.x - CAP_OVER + EDGE && left < p.x + PIPE_W + CAP_OVER - EDGE
    const capDepth = CAP_H - 1
    if (inCap && ((top < gap.top && bottom > gap.top - capDepth) || (bottom > gap.bottom && top < gap.bottom + capDepth))) return true
  }
  return false
}

// Nose up after a flap, tipping into a dive as the bird falls faster
export const tiltFor = (vy, down = false) => (down ? 85 : vy < 8 ? -20 : Math.min(80, -20 + (vy - 8) * 2.1))

/**
 * One flight. phase: ready (hovering until the first flap) -> play -> dead (hit a pipe and
 * falling) -> over (lying on the ground).
 */
export const createRun = (course, speed = LEVELS.normal.speed) => ({
  course,
  speed,
  phase: 'ready',
  time: 0,
  y: READY_Y,
  vy: 0,
  dist: 0,
  score: 0,
  tilt: 0,
  flapAt: -1
})

/** Flap; the first flap also takes off. Returns whether the bird flapped. */
export function flap (run) {
  if (run.phase === 'ready') run.phase = 'play'
  if (run.phase !== 'play') return false
  run.vy = FLAP_VY
  run.flapAt = run.time
  return true
}

/** Ends a flight from outside, e.g. when the host counts a silent player out. */
export function knockOut (run) {
  if (run.phase !== 'ready' && run.phase !== 'play') return false
  run.phase = 'dead'
  run.vy = Math.max(run.vy, 0)
  return true
}

/** Advances a run by dt seconds. Returns what happened: 'score', 'hit' (crashed) and 'over'. */
export function stepRun (run, dt) {
  const events = []
  run.time += dt
  if (run.phase === 'ready') {
    run.y = READY_Y + Math.sin(run.time * 5) * 0.7
  } else if (run.phase !== 'over') {
    run.vy = Math.min(MAX_FALL, run.vy + GRAVITY * dt)
    run.y += run.vy * dt
    if (run.phase === 'play') {
      run.dist += run.speed * dt
      if (run.y < HALF_H) {
        run.y = HALF_H
        run.vy = Math.max(0, run.vy)
      }
      const score = scoreAt(run.dist)
      if (score > run.score) {
        run.score = score
        events.push('score')
      }
      if (hitsPipe(run.course, run.dist, run.y)) {
        run.phase = 'dead'
        run.vy = Math.max(run.vy, 6)
        events.push('hit')
      }
    }
    if (run.y + HALF_H >= GROUND_Y) {
      run.y = GROUND_Y - HALF_H
      run.vy = 0
      if (run.phase === 'play') events.push('hit')
      run.phase = 'over'
      events.push('over')
    }
  }
  const down = run.phase === 'dead' || run.phase === 'over'
  const target = run.phase === 'ready' ? 0 : tiltFor(run.vy, down)
  run.tilt += (target - run.tilt) * Math.min(1, dt * 12)
  return events
}

/**
 * Where another player's bird probably is now, from their last live sample and how many
 * seconds ago it arrived: gravity keeps acting and a flying bird keeps moving forward.
 * sample: { p: 0 ready | 1 flying | 2 down, y, v, d }
 */
export function ghostAt (sample, age, alive, speed) {
  if (sample.p === 0) return { d: sample.d, y: sample.y, vy: 0, down: false }
  const t = clamp(age, 0, 0.4)
  const flying = alive && sample.p === 1
  const vy = Math.min(MAX_FALL, sample.v + GRAVITY * t)
  const y = clamp(sample.y + ((sample.v + vy) / 2) * t, HALF_H, GROUND_Y - HALF_H)
  return {
    d: flying ? sample.d + speed * clamp(age, 0, 1) : sample.d,
    y,
    vy: y >= GROUND_Y - HALF_H ? 0 : vy,
    down: !flying
  }
}
