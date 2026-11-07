// Head Ball's match: two big-headed players on a short pitch seen from the side, a goal with a
// crossbar at each end, and a ball that bounces off everything. Player 0 starts on the left and
// scores in the right goal; player 1 the other way round. The pitch is measured in the pixels
// of its art (W by H), so what moves and what's drawn line up exactly.
//
// The match runs in fixed steps (STEP seconds). Each player has controls: run left or right,
// jump, and kick. Heading needs no button: the ball bounces off a head, harder when the head is
// moving into it. A kick swings the foot for a moment and sends the ball off forward and up if
// it's in reach. A goal stops play for a moment, then both players line up again and the ball
// drops from the middle. When the clock runs out it's over, unless it's level: then the next
// goal wins.

export const STEP = 1 / 60
export const W = 320
export const H = 180
export const GROUND = 158 // the top of the grass
export const GOAL_W = 24 // how deep each goal is, from the end of the pitch
export const GOAL_H = 54 // from the grass to the underside of the crossbar
export const BAR = 4 // the crossbar's thickness
export const BAR_Y = GROUND - GOAL_H - BAR // the crossbar's top
export const BALL_R = 6
export const HEAD_R = 12
export const HEAD_Y = 25 // the head's middle, above the feet
export const BODY_R = 7
export const BODY_Y = 8 // the body's middle, above the feet
export const LENGTHS = [60, 90, 120] // seconds in a match
export const READY_TIME = 2.4 // the countdown before the first drop
export const AGAIN_TIME = 1.2 // the shorter one after a goal
export const GOAL_TIME = 2 // the celebration after a goal

const GRAVITY = 560
const BALL_GRAVITY = 420
const RUN = 100 // running speed, px a second
const JUMP = 255 // the speed a jump starts at
const KICK_TIME = 0.2 // how long the foot is out
const KICK_REST = 0.35 // from one kick to the next
const KICK_REACH = 15 // from the feet, forward, to the foot
const FOOT_R = 8
const MAX_BALL = 400
const HEADER_MAX = 300
const START_X = 72 // how far from each end the players line up

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// The way a player attacks: +1 to the right, -1 to the left
export const facing = (side) => (side === 0 ? 1 : -1)

function newPlayer (side) {
  return { side, x: side === 0 ? START_X : W - START_X, y: GROUND, vx: 0, vy: 0, ground: true, kick: 0, rest: 0, kicked: false, move: 0, jump: false, press: false, run: 0 }
}

/**
 * A new match. `length` is in seconds; `golden` says whether a draw at the end goes on until
 * someone scores (otherwise it ends level).
 */
export function createMatch ({ length = 90, golden = true } = {}) {
  const m = {
    players: [newPlayer(0), newPlayer(1)],
    ball: { x: W / 2, y: 60, vx: 0, vy: 0, spin: 0 },
    score: [0, 0],
    clock: length,
    length,
    goldenRule: golden,
    golden: false,
    phase: 'ready', // ready | play | goal | end
    timer: READY_TIME,
    time: 0, // seconds played, for the goal list
    over: false,
    winner: null,
    goals: [], // [{ side, at }]
    lastGoal: null,
    lastHit: 0.5, // how hard the last kick or header was, 0 to 1
    lastBounce: 0.5,
    counts: [0, 0, 0, 0, 0, 0] // kicks, headers, posts, whistles, goals, bounces: they only go up
  }
  lineUp(m)
  return m
}

function lineUp (m) {
  m.players = [newPlayer(0), newPlayer(1)]
  const b = m.ball
  b.x = W / 2
  b.y = 58
  b.vx = (Math.random() - 0.5) * 30
  b.vy = 0
  b.spin = 0
}

/** Sets a player's controls: move -1, 0 or 1, and whether jump is held. */
export function setInput (m, side, move, jump) {
  const p = m.players[side]
  p.move = clamp(Math.round(move), -1, 1)
  p.jump = !!jump
}

/** A kick button press; it goes off at the next step. */
export function pressKick (m, side) {
  m.players[side].press = true
}

export function stepMatch (m) {
  if (m.over) return
  const dt = STEP
  if (m.phase === 'ready') {
    m.timer -= dt
    stepPlayers(m, dt)
    if (m.timer <= 0) {
      m.phase = 'play'
      m.counts[3]++
    }
    return
  }
  if (m.phase === 'goal') {
    m.timer -= dt
    stepBall(m, dt, true)
    stepPlayers(m, dt)
    if (m.timer <= 0) {
      if (m.golden && m.lastGoal) return finish(m)
      lineUp(m)
      m.phase = 'ready'
      m.timer = AGAIN_TIME
    }
    return
  }
  if (m.phase !== 'play') return
  m.time += dt
  if (!m.golden) {
    m.clock = Math.max(0, m.clock - dt)
    if (m.clock <= 0) {
      if (m.score[0] === m.score[1] && m.goldenRule) {
        m.golden = true
      } else {
        finish(m)
        return
      }
    }
  }
  stepPlayers(m, dt)
  stepBall(m, dt, false)
  for (const p of m.players) hitBall(m, p)
  scored(m)
}

function finish (m) {
  m.phase = 'end'
  m.over = true
  m.winner = m.score[0] === m.score[1] ? null : m.score[0] > m.score[1] ? 0 : 1
  m.counts[3]++
}

// ---------- Players ----------

function stepPlayers (m, dt) {
  const play = m.phase === 'play' || m.phase === 'goal'
  for (const p of m.players) {
    const move = play ? p.move : 0
    p.vx = move * RUN
    if (move) p.run += dt * 10
    if (play && p.jump && p.ground) {
      p.vy = -JUMP
      p.ground = false
    }
    p.vy += GRAVITY * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    if (p.y >= GROUND) {
      p.y = GROUND
      p.vy = 0
      p.ground = true
    }
    // Under a crossbar the head stops at it
    const inGoal = p.x < GOAL_W + HEAD_R - 2 || p.x > W - GOAL_W - HEAD_R + 2
    const top = p.y - HEAD_Y - HEAD_R
    if (inGoal && top < GROUND - GOAL_H && p.y - HEAD_Y > BAR_Y) {
      p.y = GROUND - GOAL_H + HEAD_Y + HEAD_R
      p.vy = Math.max(0, p.vy)
    }
    p.x = clamp(p.x, HEAD_R + 2, W - HEAD_R - 2)
    // A player can't climb onto a crossbar: from above it, the goal is a wall
    if (p.y - HEAD_Y < BAR_Y) {
      if (p.x < GOAL_W + HEAD_R) p.x = GOAL_W + HEAD_R
      if (p.x > W - GOAL_W - HEAD_R) p.x = W - GOAL_W - HEAD_R
    }
    if (p.kick > 0) p.kick = Math.max(0, p.kick - dt)
    if (p.rest > 0) p.rest = Math.max(0, p.rest - dt)
    if (p.press) {
      p.press = false
      if (play && p.rest <= 0) {
        p.kick = KICK_TIME
        p.rest = KICK_REST
        p.kicked = false
      }
    }
  }
  // The players push each other apart, side to side
  const [a, b] = m.players
  const dx = b.x - a.x
  const dy = (b.y - HEAD_Y) - (a.y - HEAD_Y)
  const reach = HEAD_R * 2 - 2
  if (Math.abs(dx) < reach && Math.abs(dy) < HEAD_R * 2) {
    const push = (reach - Math.abs(dx)) / 2
    const dir = dx === 0 ? (a.side === 0 ? 1 : -1) : Math.sign(dx)
    a.x = clamp(a.x - dir * push, HEAD_R + 2, W - HEAD_R - 2)
    b.x = clamp(b.x + dir * push, HEAD_R + 2, W - HEAD_R - 2)
  }
}

/** Where a player's foot is while kicking, or null. */
export function footOf (p) {
  if (p.kick <= 0) return null
  const swing = Math.min(1, (1 - p.kick / KICK_TIME) * 1.6) // 0 to 1, quickly, then held
  return { x: p.x + facing(p.side) * (5 + swing * (KICK_REACH - 5)), y: p.y - 3 - swing * 9, r: FOOT_R }
}

// ---------- The ball ----------

function stepBall (m, dt, settling) {
  const b = m.ball
  b.vy += BALL_GRAVITY * dt
  b.vx *= 1 - 0.12 * dt
  b.x += b.vx * dt
  b.y += b.vy * dt
  b.spin += (b.vx / BALL_R) * dt
  // Grass
  if (b.y + BALL_R > GROUND) {
    b.y = GROUND - BALL_R
    if (b.vy > 40) bounce(m, b.vy / 300)
    b.vy = -b.vy * 0.68
    if (Math.abs(b.vy) < 25) b.vy = 0
    b.vx *= 0.94
  }
  // The sky
  if (b.y - BALL_R < 0) {
    b.y = BALL_R
    b.vy = Math.abs(b.vy) * 0.8
  }
  // The ends: the back of the net, and the stands above it
  if (b.x - BALL_R < 0) {
    b.x = BALL_R
    b.vx = Math.abs(b.vx) * (b.y > BAR_Y ? 0.25 : 0.75)
  }
  if (b.x + BALL_R > W) {
    b.x = W - BALL_R
    b.vx = -Math.abs(b.vx) * (b.y > BAR_Y ? 0.25 : 0.75)
  }
  crossbar(m, b, 0, GOAL_W, settling)
  crossbar(m, b, W - GOAL_W, W, settling)
  // A ball sitting on a crossbar rolls off it, back onto the pitch
  if (b.y < BAR_Y && b.y > BAR_Y - BALL_R - 1.5 && Math.abs(b.vy) < 60) {
    if (b.x < GOAL_W + BALL_R) b.vx += 260 * dt
    else if (b.x > W - GOAL_W - BALL_R) b.vx -= 260 * dt
  }
}

// The crossbar is a solid bar the ball bounces off on any side
function crossbar (m, b, x0, x1, settling) {
  const cx = clamp(b.x, x0, x1)
  const cy = clamp(b.y, BAR_Y, BAR_Y + BAR)
  const dx = b.x - cx
  const dy = b.y - cy
  const d = Math.hypot(dx, dy)
  if (d >= BALL_R) return
  let nx = 0
  let ny = -1
  if (d > 0.001) {
    nx = dx / d
    ny = dy / d
  }
  b.x = cx + nx * BALL_R
  b.y = cy + ny * BALL_R
  const into = b.vx * nx + b.vy * ny
  if (into < 0) {
    b.vx -= 1.75 * into * nx
    b.vy -= 1.75 * into * ny
    if (!settling && -into > 60) {
      m.counts[2]++
      m.lastBounce = Math.min(1, -into / 300)
    }
  }
}

function bounce (m, power) {
  m.counts[5]++
  m.lastBounce = Math.min(1, power)
}

// The ball against a round part of a player: pushed out, and bounced off it as if the part were
// a wall moving at the player's speed, with a lift for a header
function bumpCircle (m, p, cx, cy, r, give, isHead) {
  const b = m.ball
  const dx = b.x - cx
  const dy = b.y - cy
  const d = Math.hypot(dx, dy)
  const reach = r + BALL_R
  if (d >= reach) return false
  const nx = d > 0.001 ? dx / d : 0
  const ny = d > 0.001 ? dy / d : -1
  b.x = cx + nx * reach
  b.y = cy + ny * reach
  // Half the player's own speed goes into it, so a header is firm but not a rocket
  const pvx = p.vx * 0.5
  const pvy = p.vy * 0.5
  const rvx = b.vx - pvx
  const rvy = b.vy - pvy
  const into = rvx * nx + rvy * ny
  if (into >= 0) return true
  b.vx -= (1 + give) * into * nx
  b.vy -= (1 + give) * into * ny
  if (isHead) {
    // A header always has some push forward, and more when the head was rising into it
    b.vx += facing(p.side) * 30
    if (p.vy < 0) b.vy += p.vy * 0.15
    const power = Math.min(1, Math.hypot(b.vx, b.vy) / 360)
    if (-into > 70) {
      m.counts[1]++
      m.lastHit = power
    }
  }
  limit(b, isHead ? HEADER_MAX : MAX_BALL)
  return true
}

function hitBall (m, p) {
  const b = m.ball
  const foot = footOf(p)
  if (foot && !p.kicked) {
    const d = Math.hypot(b.x - foot.x, b.y - foot.y)
    if (d < foot.r + BALL_R + 3) {
      p.kicked = true
      const dir = facing(p.side)
      // Low balls go up more, high ones flatter; a ball behind the foot still goes forward
      const low = clamp((b.y - (p.y - 22)) / 12, 0, 1)
      b.vx = dir * (250 + Math.abs(p.vx) * 0.6)
      b.vy = -(130 + low * 140) + Math.min(0, p.vy) * 0.3
      b.x = foot.x + dir * (foot.r + BALL_R - 2)
      b.y = Math.min(b.y, GROUND - BALL_R)
      limit(b)
      m.counts[0]++
      m.lastHit = Math.min(1, Math.hypot(b.vx, b.vy) / 360)
      return
    }
  }
  bumpCircle(m, p, p.x, p.y - HEAD_Y, HEAD_R, 0.55, true)
  bumpCircle(m, p, p.x, p.y - BODY_Y, BODY_R, 0.4, false)
}

function limit (b, max = MAX_BALL) {
  const s = Math.hypot(b.vx, b.vy)
  if (s > max) {
    b.vx *= max / s
    b.vy *= max / s
  }
}

// All of the ball over the line, under the crossbar
function scored (m) {
  const b = m.ball
  if (b.y - BALL_R <= BAR_Y + BAR) return
  let side = -1
  if (b.x + BALL_R < GOAL_W) side = 1
  else if (b.x - BALL_R > W - GOAL_W) side = 0
  if (side < 0) return
  m.score[side]++
  m.goals.push({ side, at: Math.round(m.time) })
  m.lastGoal = { side }
  m.counts[4]++
  m.phase = 'goal'
  m.timer = GOAL_TIME
}

// ---------- Online ----------

const r1 = (v) => Math.round(v * 10) / 10

/** What the host sends everyone, many times a second. */
export function snapshot (m) {
  return {
    t: Math.round(performance.now()) / 1000,
    ph: m.phase,
    tm: r1(m.timer),
    c: r1(m.clock),
    s: m.score.slice(),
    g: m.golden ? 1 : 0,
    b: [r1(m.ball.x), r1(m.ball.y), r1(m.ball.spin)],
    p: m.players.map(p => [r1(p.x), r1(p.y), Math.round(p.kick * 100), p.ground ? 1 : 0, r1(p.run)]),
    n: m.counts.slice(),
    lg: m.lastGoal ? m.lastGoal.side : -1,
    lh: r1(m.lastHit),
    lb: r1(m.lastBounce)
  }
}

const num = (v) => typeof v === 'number' && Number.isFinite(v)

/** A snapshot from the host, read back into the shape viewOf gives; null if it's not one. */
export function readSnapshot (d) {
  if (!d || !num(d.t) || !Array.isArray(d.b) || !Array.isArray(d.p) || d.p.length !== 2 || !Array.isArray(d.s) || !Array.isArray(d.n)) return null
  if (!d.b.every(num) || !d.p.every(p => Array.isArray(p) && p.every(num))) return null
  return {
    t: d.t,
    phase: ['ready', 'play', 'goal', 'end'].includes(d.ph) ? d.ph : 'play',
    timer: num(d.tm) ? d.tm : 0,
    clock: num(d.c) ? d.c : 0,
    score: [d.s[0] | 0, d.s[1] | 0],
    golden: d.g === 1,
    ball: { x: d.b[0], y: d.b[1], spin: d.b[2] },
    players: d.p.map(([x, y, kick, ground, run], side) => ({ side, x, y, kick: kick / 100, ground: ground === 1, run })),
    counts: d.n.map(v => v | 0),
    lastGoal: d.lg === 0 || d.lg === 1 ? { side: d.lg } : null,
    lastHit: num(d.lh) ? d.lh : 0.5,
    lastBounce: num(d.lb) ? d.lb : 0.5
  }
}

/** What the screen needs from a running match, in the same shape as a snapshot read back. */
export function viewOf (m) {
  return {
    phase: m.phase,
    timer: m.timer,
    clock: m.clock,
    score: m.score.slice(),
    golden: m.golden,
    ball: { x: m.ball.x, y: m.ball.y, spin: m.ball.spin },
    players: m.players.map(p => ({ side: p.side, x: p.x, y: p.y, kick: p.kick, ground: p.ground, run: p.run })),
    counts: m.counts.slice(),
    lastGoal: m.lastGoal,
    lastHit: m.lastHit,
    lastBounce: m.lastBounce
  }
}

export const KICK_LENGTH = KICK_TIME
