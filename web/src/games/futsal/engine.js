// Futsal simulation: the players, the ball, the court and the rules, kept free of drawing and
// networking. One device runs it (the only one in a solo game, the host in an online room) and
// the others draw the snapshots it sends.
//
// Everyone is a disc of the same size, and the disc is all there is to a player: what they
// bump into, what the ball bounces off and what a kick reaches from. The ball never goes out:
// it bounces off the lines round the court, while players can run on past them. A kick goes off
// the moment the button is pressed with the ball in reach, or as soon as the ball comes into
// reach while it's held, and always sends the ball straight away from the kicker's middle.
//
// Positions are in units of one character row; a column is 0.6 units wide. The court's middle
// is (0, 0): it runs 60 units between the goal lines (x) and 30 between the touchlines (y).
// Home attacks to the right, away to the left. Times are in seconds.

export const STEP = 1 / 120

// ---------- The court ----------

export const HALF_W = 30
export const HALF_H = 15
export const WALL_X = 34.5 // the hall's walls: room to run behind the goal lines...
export const WALL_Y = 19 // ...and beside the touchlines
export const GOAL_HALF = 6 // post to post is 12 units
export const GOAL_DEPTH = 3
export const POST_R = 0.45
export const AREA_R = 7 // the penalty area: a quarter circle this far round each post, closed by a straight line
export const CIRCLE_R = 5 // the center circle
export const SECOND_SPOT = 15 // the second penalty mark, from the goal line

// ---------- Players and the ball ----------

export const PLAYER_R = 1.5
export const BALL_R = 1
export const RUN_SPEED = 12
export const HOLD_SPEED = 0.72 // share of full speed left while holding kick
export const GRIP = 6 // how fast a player gets to the speed they're after, per second: low enough to carry momentum
export const BALL_DRAG = 0.7 // the ball loses this share of its speed per second...
export const BALL_ROLL = 0.9 // ...and this much more (units/s²), so it comes to rest
export const BALL_MAX = 42
export const KICK = 26 // the speed a kick adds to the ball
export const KICK_REACH = 0.55 // how far apart the edges of a player and the ball can be for a kick
export const KICK_GRACE = 0.1 // a press stays ready this long even if the button is already let go
const KICK_COOLDOWN = 0.12
// The ball is half as heavy as a player, so in a bump it gives way twice as much
const PLAYER_SHARE = 1 / 3
const BALL_SHARE = 2 / 3
const PLAYER_BOUNCE = 0.3 // how lively a bump between two players is...
const BALL_BOUNCE = 0.3 // ...between a player and the ball...
const LINE_BOUNCE = 0.55 // ...the ball off a line...
const POST_BOUNCE = 0.5 // ...and the ball off a post

// ---------- Rules ----------

export const MAX_TEAM = 5
export const READY_TIME = 3 // countdown before the first kick-off
export const RESTART_TIME = 4 // a kick-off not taken this soon goes to the other team
export const GOAL_TIME = 2.8 // celebrating, before the kick-off
export const END_TIME = 3 // "full time" on screen before the results
export const GOLDEN_TIME = 120 // a golden goal that doesn't come in this long leaves it a draw
export const MINUTES = [2, 3, 5]
export const GOAL_LIMITS = [0, 3, 5, 10] // 0: no limit

export const PHASES = ['ready', 'kickoff', 'play', 'goal', 'end']

// Kick-off places by team size, for a team attacking to the right, from the back to the front.
// Bots take the places at the back, so a bot keeps goal while people play up front.
const FORMATIONS = [
  [],
  [[-9, 0]],
  [[-21, 0], [-8, 0]],
  [[-23, 0], [-11, -6], [-11, 6]],
  [[-24, 0], [-15, -7], [-15, 7], [-7, 0]],
  [[-24, 0], [-16, -8], [-16, 8], [-7, -4], [-7, 4]]
]

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const finite = (value, min, max) => (Number.isFinite(value) ? clamp(value, min, max) : 0)

export const attackDir = (team) => (team === 0 ? 1 : -1)

/** A player's kick-off place in their team's frame (attacking to the right), by team size and slot. */
export const formationSpot = (size, slot) => FORMATIONS[clamp(size, 1, MAX_TEAM)][slot] || [-10, 0]

/**
 * A new match, waiting for its countdown. roster: [{ id, team, bot }] in an order every device
 * knows (snapshots list the players in this order). minutes: the length of play; goals: the
 * score that wins outright, 0 for none; kickoff: the team that kicks off first.
 */
export function createMatch ({ roster, minutes = 4, goals = 0, kickoff = 0 }) {
  const players = roster.map(entry => ({
    id: entry.id,
    team: entry.team === 1 ? 1 : 0,
    bot: !!entry.bot,
    slot: 0,
    size: 1,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    ix: 0,
    iy: 0,
    held: false, // the kick button is down
    ready: false, // a press waiting for the ball to come into reach
    readyUntil: 0,
    cooldown: 0
  }))
  for (const team of [0, 1]) {
    const members = players.filter(p => p.team === team)
    const order = [...members.filter(p => p.bot), ...members.filter(p => !p.bot)]
    order.forEach((p, slot) => {
      p.slot = slot
      p.size = members.length
    })
  }
  const match = {
    players,
    ball: { x: 0, y: 0, vx: 0, vy: 0 },
    phase: 'ready',
    timer: READY_TIME,
    clock: minutes * 60, // play left; it stops from a goal to the kick-off
    golden: false, // full time came with the scores level: the next goal wins
    goalLimit: goals,
    score: [0, 0],
    kickoff, // the team whose kick-off it is
    lastTouch: -1,
    time: 0,
    played: 0,
    counts: { kicks: 0, posts: 0, whistles: 0, goals: 0, bounces: 0 },
    lastKick: 0,
    lastBounce: 0,
    longWhistle: false,
    lastGoal: null,
    goals: [], // { team, by, own, at }: at is seconds of play
    winner: null,
    over: false
  }
  lineUp(match, kickoff)
  return match
}

// Everyone back to their kick-off places and the ball on the center spot. The kicking-off
// team's front player stands at the ball.
function lineUp (match, kickoff) {
  for (const p of match.players) {
    let [x, y] = formationSpot(p.size, p.slot)
    if (p.team === kickoff && p.slot === p.size - 1) {
      x = -(PLAYER_R + BALL_R + 0.4)
      y = 0
    }
    p.x = x * attackDir(p.team)
    p.y = y
    p.vx = p.vy = 0
    p.ready = false
  }
  Object.assign(match.ball, { x: 0, y: 0, vx: 0, vy: 0 })
}

/** What a player's controls say: a direction (up to 1 long) and whether kick is held down. */
export function setInput (match, index, x, y, held) {
  const p = match.players[index]
  if (!p) return
  p.ix = finite(x, -1, 1)
  p.iy = finite(y, -1, 1)
  p.held = !!held
}

/**
 * The kick button went down. The kick goes off as soon as the ball is in reach: straight away,
 * or the moment it arrives while the button's held (and for a moment after a quick tap).
 */
export function pressKick (match, index) {
  const p = match.players[index]
  if (!p) return
  p.ready = true
  p.readyUntil = match.time + KICK_GRACE
}

/** Moves the match on by one STEP. Returns what happened, for sounds: [{ type, ... }]. */
export function stepMatch (match) {
  const events = []
  const dt = STEP
  const { ball, phase } = match
  match.time += dt
  const still = phase === 'ready' || phase === 'end'

  for (const p of match.players) {
    p.cooldown = Math.max(0, p.cooldown - dt)
    let ix = still ? 0 : p.ix
    let iy = still ? 0 : p.iy
    const length = Math.hypot(ix, iy)
    if (length > 1) {
      ix /= length
      iy /= length
    }
    const top = RUN_SPEED * (p.held ? HOLD_SPEED : 1)
    const grip = 1 - Math.exp(-GRIP * dt)
    p.vx += (ix * top - p.vx) * grip
    p.vy += (iy * top - p.vy) * grip
    p.x += p.vx * dt
    p.y += p.vy * dt
  }

  if (phase === 'ready' || phase === 'kickoff') {
    ball.vx = ball.vy = 0
  } else {
    const speed = Math.hypot(ball.vx, ball.vy)
    if (speed > 0) {
      const next = Math.min(BALL_MAX, Math.max(0, speed * Math.exp(-BALL_DRAG * dt) - BALL_ROLL * dt))
      ball.vx *= next / speed
      ball.vy *= next / speed
    }
    ball.x += ball.vx * dt
    ball.y += ball.vy * dt
  }

  collide(match, events)
  keepRules(match, dt)
  walls(match, events)
  kicks(match, events)
  referee(match, events)
  return events
}

// ---------- Contact ----------

/**
 * Pushes two discs apart if they overlap and bounces them off each other. `wa` and `wb` are how
 * much each gives way (they add up to 1; 0 doesn't move), `e` how lively the bounce is. Returns
 * the speed they met at, or -1 when they don't touch.
 */
function bounce (a, b, distance, wa, wb, e) {
  let dx = b.x - a.x
  let dy = b.y - a.y
  const d2 = dx * dx + dy * dy
  if (d2 >= distance * distance) return -1
  let d = Math.sqrt(d2)
  if (d < 1e-6) {
    dx = 1
    dy = 0
    d = 1
  }
  const nx = dx / d
  const ny = dy / d
  const overlap = distance - Math.sqrt(d2)
  a.x -= nx * overlap * wa
  a.y -= ny * overlap * wa
  b.x += nx * overlap * wb
  b.y += ny * overlap * wb
  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
  if (vn >= 0) return 0
  const j = (1 + e) * vn
  a.vx += nx * j * wa
  a.vy += ny * j * wa
  b.vx -= nx * j * wb
  b.vy -= ny * j * wb
  return -vn
}

// Keeps a disc of radius r off a stretch of net from (x0, y0) to (x1, y1), on whichever side
// it's on. The ball bounces off softly and loses some pace (`soak`); a player just stops.
function net (disc, r, x0, y0, x1, y1, e = 0, soak = 1) {
  const sx = x1 - x0
  const sy = y1 - y0
  const t = clamp(((disc.x - x0) * sx + (disc.y - y0) * sy) / (sx * sx + sy * sy), 0, 1)
  const px = x0 + sx * t
  const py = y0 + sy * t
  let dx = disc.x - px
  let dy = disc.y - py
  const d = Math.hypot(dx, dy)
  if (d >= r) return
  if (d < 1e-6) {
    dx = -sy
    dy = sx
  }
  const length = Math.hypot(dx, dy)
  const nx = dx / length
  const ny = dy / length
  disc.x = px + nx * r
  disc.y = py + ny * r
  const vn = disc.vx * nx + disc.vy * ny
  if (vn >= 0) return
  disc.vx = (disc.vx - nx * vn * (1 + e)) * soak
  disc.vy = (disc.vy - ny * vn * (1 + e)) * soak
}

const POSTS = [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sy]) => ({ x: sx * HALF_W, y: sy * GOAL_HALF, vx: 0, vy: 0 }))

function collide (match, events) {
  const { players, ball, phase } = match
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) bounce(players[i], players[j], PLAYER_R * 2, 0.5, 0.5, PLAYER_BOUNCE)
  }
  players.forEach((p, i) => {
    // Before the whistle, and for the other team at a kick-off, the ball doesn't budge;
    // the kicking-off team's first touch puts it in play
    const fixed = phase === 'ready' || phase === 'end' || (phase === 'kickoff' && p.team !== match.kickoff)
    const met = bounce(p, ball, PLAYER_R + BALL_R, fixed ? 1 : PLAYER_SHARE, fixed ? 0 : BALL_SHARE, fixed ? 0 : BALL_BOUNCE)
    if (met < 0 || fixed) return
    match.lastTouch = i
    if (match.phase === 'kickoff') startPlay(match)
  })
  for (const post of POSTS) {
    if (bounce(post, ball, POST_R + BALL_R, 0, 1, POST_BOUNCE) > 4) {
      match.counts.posts++
      events.push({ type: 'post' })
    }
    for (const p of players) bounce(post, p, POST_R + PLAYER_R, 0, 1, PLAYER_BOUNCE)
  }
  for (const [x0, y0, x1, y1] of NETS) net(ball, BALL_R, x0, y0, x1, y1, 0.1, 0.8)
  playerNets(players)
}

// The nets: the back and two sides of each goal
const NETS = [-1, 1].flatMap(side => {
  const line = side * HALF_W
  const back = side * (HALF_W + GOAL_DEPTH)
  return [[back, -GOAL_HALF, back, GOAL_HALF], [line, -GOAL_HALF, back, -GOAL_HALF], [line, GOAL_HALF, back, GOAL_HALF]]
})

// Players can step into a goal mouth, to clear a ball off the line or tap it in, but not
// through the netting
function playerNets (players) {
  for (const [x0, y0, x1, y1] of NETS) for (const p of players) net(p, PLAYER_R, x0, y0, x1, y1)
}

// Eases a player out of a circle they mustn't be in, and stops them running back in
function keepOut (p, cx, cy, radius, dt) {
  let dx = p.x - cx
  let dy = p.y - cy
  let d = Math.hypot(dx, dy)
  if (d >= radius) return
  if (d < 1e-6) {
    dx = -attackDir(p.team)
    dy = 0
    d = 1
  }
  const nx = dx / d
  const ny = dy / d
  const move = Math.min(radius - Math.hypot(p.x - cx, p.y - cy), 40 * dt)
  p.x += nx * move
  p.y += ny * move
  const vn = p.vx * nx + p.vy * ny
  if (vn < 0) {
    p.vx -= vn * nx
    p.vy -= vn * ny
  }
}

// Until the kick-off is taken everyone stays in their own half, and the other team out of the
// center circle
function keepRules (match, dt) {
  if (match.phase !== 'kickoff' && match.phase !== 'ready') return
  for (const p of match.players) {
    const dir = attackDir(p.team)
    if (p.x * dir > 0) {
      p.x = 0
      if (p.vx * dir > 0) p.vx = 0
    }
    if (p.team !== match.kickoff) keepOut(p, 0, 0, CIRCLE_R + PLAYER_R, dt)
  }
}

// The ball bounces off the touchlines and the goal lines either side of the goal; players run
// on past them to the hall's walls
function walls (match, events) {
  for (const p of match.players) {
    const mx = WALL_X - PLAYER_R
    const my = WALL_Y - PLAYER_R
    if (Math.abs(p.x) > mx) {
      p.x = Math.sign(p.x) * mx
      p.vx = 0
    }
    if (Math.abs(p.y) > my) {
      p.y = Math.sign(p.y) * my
      p.vy = 0
    }
  }
  const { ball } = match
  let hit = 0
  const by = HALF_H - BALL_R
  if (Math.abs(ball.y) > by) {
    ball.y = Math.sign(ball.y) * by
    if (ball.vy * ball.y > 0) {
      hit = Math.max(hit, Math.abs(ball.vy))
      ball.vy *= -LINE_BOUNCE
    }
  }
  // Between the posts the goal is open; the posts themselves cover the corners of the gap
  const bx = HALF_W - BALL_R
  if (Math.abs(ball.x) > bx && Math.abs(ball.y) >= GOAL_HALF) {
    ball.x = Math.sign(ball.x) * bx
    if (ball.vx * ball.x > 0) {
      hit = Math.max(hit, Math.abs(ball.vx))
      ball.vx *= -LINE_BOUNCE
    }
  }
  if (hit > 6 && match.phase === 'play') {
    match.counts.bounces++
    match.lastBounce = Math.min(1, hit / BALL_MAX)
    events.push({ type: 'bounce' })
  }
  // A ball held against a line doesn't give way, so the player pressing it does
  for (const p of match.players) bounce(p, ball, PLAYER_R + BALL_R, 1, 0, 0)
  playerNets(match.players)
}

function startPlay (match) {
  match.phase = 'play'
  match.timer = 0
}

function kicks (match, events) {
  const { ball } = match
  match.players.forEach((p, i) => {
    if (p.ready && !p.held && match.time > p.readyUntil) p.ready = false
    if (!p.ready || p.cooldown > 0) return
    // Read the phase for every player: the first kick of a kick-off puts the ball in play
    const { phase } = match
    if (phase === 'ready' || phase === 'end') {
      p.ready = false
      return
    }
    // Only the team kicking off can play the ball before it's in play
    if (phase === 'kickoff' && p.team !== match.kickoff) return
    const dx = ball.x - p.x
    const dy = ball.y - p.y
    const d = Math.hypot(dx, dy)
    if (d > PLAYER_R + BALL_R + KICK_REACH) return
    const nx = d > 1e-6 ? dx / d : attackDir(p.team)
    const ny = d > 1e-6 ? dy / d : 0
    // The kick adds to the ball's own pace: a ball rolling the way it's kicked flies, one
    // coming at the kicker is mostly stopped
    ball.vx += nx * KICK
    ball.vy += ny * KICK
    const speed = Math.hypot(ball.vx, ball.vy)
    if (speed > BALL_MAX) {
      ball.vx *= BALL_MAX / speed
      ball.vy *= BALL_MAX / speed
    }
    p.ready = false
    p.cooldown = KICK_COOLDOWN
    match.counts.kicks++
    match.lastKick = Math.min(1, speed / BALL_MAX)
    match.lastTouch = i
    events.push({ type: 'kick', by: i, power: match.lastKick })
    if (phase === 'kickoff') startPlay(match)
  })
}

// ---------- Rules ----------

function whistle (match, events, long = false) {
  match.counts.whistles++
  match.longWhistle = long
  events.push({ type: 'whistle', long })
}

function referee (match, events) {
  const { ball } = match
  switch (match.phase) {
    case 'ready':
      match.timer -= STEP
      if (match.timer <= 0) {
        match.phase = 'kickoff'
        match.timer = RESTART_TIME
        whistle(match, events)
      }
      break
    case 'kickoff':
      match.timer -= STEP
      if (match.timer <= 0) {
        // Four seconds gone: the kick-off goes to the other team
        match.kickoff = 1 - match.kickoff
        match.timer = RESTART_TIME
        whistle(match, events)
        events.push({ type: 'turnover' })
      }
      break
    case 'play':
      match.played += STEP
      if (match.golden) {
        match.clock -= STEP
        if (match.clock <= -GOLDEN_TIME) {
          finish(match, events)
          return
        }
      } else {
        match.clock = Math.max(0, match.clock - STEP)
        if (match.clock <= 0) {
          if (match.score[0] !== match.score[1]) {
            finish(match, events)
            return
          }
          match.golden = true
          whistle(match, events)
          events.push({ type: 'golden' })
        }
      }
      // The whole ball over the line between the posts
      if (Math.abs(ball.x) > HALF_W + BALL_R && Math.abs(ball.y) < GOAL_HALF) goal(match, events, ball.x > 0 ? 0 : 1)
      break
    case 'goal':
      match.timer -= STEP
      if (match.timer <= 0) {
        const { team } = match.lastGoal
        if (match.golden || (match.goalLimit && match.score[team] >= match.goalLimit)) {
          finish(match, events)
          return
        }
        // The team that let it in kicks off
        match.kickoff = 1 - team
        lineUp(match, match.kickoff)
        match.phase = 'kickoff'
        match.timer = RESTART_TIME
        whistle(match, events)
      }
      break
    case 'end':
      match.timer -= STEP
      if (match.timer <= 0) match.over = true
      break
  }
}

function goal (match, events, team) {
  const by = match.lastTouch
  const own = by >= 0 && match.players[by].team !== team
  match.score[team]++
  match.counts.goals++
  match.lastGoal = { team, by, own }
  match.goals.push({ team, by, own, at: Math.round(match.played) })
  match.phase = 'goal'
  match.timer = GOAL_TIME
  events.push({ type: 'goal', team, by, own })
}

function finish (match, events) {
  match.phase = 'end'
  match.timer = END_TIME
  const [home, away] = match.score
  match.winner = home === away ? null : home > away ? 0 : 1
  whistle(match, events, true)
  events.push({ type: 'end' })
}

// ---------- Snapshots ----------
//
// What the host sends ten to twenty times a second. Players are listed in roster order, so no
// ids travel; event counts let a device that missed a snapshot still play every sound.

const r2 = (value) => Math.round(value * 100) / 100

export function snapshot (match) {
  const { ball, lastGoal, counts } = match
  return {
    t: Math.round(match.time * 1000) / 1000,
    ph: PHASES.indexOf(match.phase),
    tm: r2(match.timer),
    c: r2(match.clock),
    gg: match.golden ? 1 : 0,
    s: match.score.slice(),
    ko: match.kickoff,
    b: [r2(ball.x), r2(ball.y)],
    p: match.players.map(p => [r2(p.x), r2(p.y), p.held ? 1 : 0]),
    n: [counts.kicks, counts.posts, counts.whistles, counts.goals, counts.bounces],
    lk: r2(match.lastKick),
    lb: r2(match.lastBounce),
    lw: match.longWhistle ? 1 : 0,
    lg: lastGoal ? [lastGoal.team, lastGoal.by, lastGoal.own ? 1 : 0] : null
  }
}

/**
 * The match as the screen shows it: { t, phase, timer, clock, golden, score, kickoff, ball,
 * players: [{ x, y, held }], counts, lastKick, lastBounce, longWhistle, lastGoal }. Snapshots
 * read back into the same shape.
 */
export function viewOf (match) {
  const { ball, lastGoal, counts } = match
  return {
    t: match.time,
    phase: match.phase,
    timer: match.timer,
    clock: match.clock,
    golden: match.golden,
    score: match.score,
    kickoff: match.kickoff,
    ball: { x: ball.x, y: ball.y },
    players: match.players.map(p => ({ x: p.x, y: p.y, held: p.held })),
    counts: [counts.kicks, counts.posts, counts.whistles, counts.goals, counts.bounces],
    lastKick: match.lastKick,
    lastBounce: match.lastBounce,
    longWhistle: match.longWhistle,
    lastGoal
  }
}

const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null)
const int = (value, max) => (Number.isInteger(value) && value >= 0 && value <= max ? value : null)

/** A snapshot from the host, checked and read back: null if it isn't one for `count` players. */
export function readSnapshot (data, count) {
  if (!data || typeof data !== 'object') return null
  const t = num(data.t)
  const phase = PHASES[data.ph]
  if (t === null || !phase || !Array.isArray(data.p) || data.p.length !== count) return null
  if (!Array.isArray(data.b) || num(data.b[0]) === null || num(data.b[1]) === null) return null
  const players = []
  for (const entry of data.p) {
    if (!Array.isArray(entry) || num(entry[0]) === null || num(entry[1]) === null) return null
    players.push({ x: entry[0], y: entry[1], held: entry[2] === 1 })
  }
  const score = Array.isArray(data.s) ? [int(data.s[0], 999) ?? 0, int(data.s[1], 999) ?? 0] : [0, 0]
  const counts = Array.isArray(data.n) ? [0, 1, 2, 3, 4].map(i => int(data.n[i], 1e9) ?? 0) : [0, 0, 0, 0, 0]
  const lg = Array.isArray(data.lg) ? data.lg : null
  return {
    t,
    phase,
    timer: num(data.tm) ?? 0,
    clock: num(data.c) ?? 0,
    golden: data.gg === 1,
    score,
    kickoff: data.ko === 1 ? 1 : 0,
    ball: { x: data.b[0], y: data.b[1] },
    players,
    counts,
    lastKick: clamp(num(data.lk) || 0, 0, 1),
    lastBounce: clamp(num(data.lb) || 0, 0, 1),
    longWhistle: data.lw === 1,
    lastGoal: lg ? { team: lg[0] === 1 ? 1 : 0, by: int(lg[1], count - 1) ?? -1, own: lg[2] === 1 } : null
  }
}
