// Futsal simulation: the players, the ball, the court and the rules, kept free of drawing and
// networking. One device runs it (the only one in a solo game, the host in an online room) and
// the others draw the snapshots it sends.
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
export const GOAL_HALF = 5.5 // post to post is 11 units
export const GOAL_DEPTH = 2.4
export const POST_R = 0.45
export const AREA_R = 7 // the penalty area: a quarter circle this far round each post, closed by a straight line
export const CIRCLE_R = 5 // the center circle
export const SECOND_SPOT = 15 // the second penalty mark, from the goal line

// ---------- Players and the ball ----------

export const PLAYER_R = 1.5
export const BALL_R = 0.8
export const RUN_SPEED = 13
export const WINDUP_SPEED = 0.6 // share of full speed left while winding up a kick
export const GRIP = 11 // how fast a player gets to the speed they're after, per second
export const BALL_DRAG = 1 // the ball loses this share of its speed per second...
export const BALL_ROLL = 1.5 // ...and this much more (units/s²), so it comes to rest
export const BALL_MAX = 46
export const KICK_MIN = 14 // a tap: a pass
export const KICK_MAX = 44 // a full wind-up: a shot
export const FULL_CHARGE = 0.75 // seconds of winding up for a full-power kick
export const KICK_REACH = 0.8 // how far past touching a kick still reaches the ball
export const KICK_GRACE = 0.16 // a kick let go just before the ball arrives still happens
export const KICK_COOLDOWN = 0.25
// In a bump between a player and the ball the ball gives way three times as much
const PLAYER_SHARE = 0.25
const BALL_SHARE = 0.75

// ---------- Rules ----------

export const MAX_TEAM = 5
export const READY_TIME = 3 // countdown before the first kick-off
export const RESTART_TIME = 4 // the four-second rule: take a restart in time or the other team gets it
export const RESTART_GAP = 5 // how far opponents keep from a ball waiting for a restart
export const OUT_TIME = 0.8 // the ball rolls on this long after leaving the court
export const GOAL_TIME = 2.8 // celebrating, before the kick-off
export const END_TIME = 3 // "full time" on screen before the results
export const GOLDEN_TIME = 120 // a golden goal that doesn't come in this long leaves it a draw
export const MINUTES = [2, 3, 5]
export const GOAL_LIMITS = [0, 3, 5, 10] // 0: no limit

export const PHASES = ['ready', 'kickoff', 'play', 'out', 'set', 'goal', 'end']
export const RESTARTS = ['kickoff', 'kickin', 'corner', 'clearance']

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
    charging: false,
    windup: 0,
    kick: null,
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
    clock: minutes * 60, // play left; it stops while the ball is out
    golden: false, // full time came with the scores level: the next goal wins
    goalLimit: goals,
    score: [0, 0],
    restart: { kind: 'kickoff', team: kickoff, x: 0, y: 0 },
    lastTouch: -1,
    time: 0,
    played: 0,
    counts: { kicks: 0, posts: 0, whistles: 0, goals: 0 },
    lastKick: 0,
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
    p.kick = null
  }
  Object.assign(match.ball, { x: 0, y: 0, vx: 0, vy: 0 })
}

/** What a player's controls say: a direction (up to 1 long) and whether a kick is winding up. */
export function setInput (match, index, x, y, charging) {
  const p = match.players[index]
  if (!p) return
  p.ix = finite(x, -1, 1)
  p.iy = finite(y, -1, 1)
  p.charging = !!charging
}

/**
 * A kick let go at `power`: 0 is a tap, 1 fully wound up. It happens as soon as the ball is in
 * reach, if that's within a moment.
 */
export function kick (match, index, power) {
  const p = match.players[index]
  if (!p || p.cooldown > 0) return
  p.kick = { power: finite(power, 0, 1), until: match.time + KICK_GRACE }
}

/** Moves the match on by one STEP. Returns what happened, for sounds: [{ type, ... }]. */
export function stepMatch (match) {
  const events = []
  const dt = STEP
  const { ball, phase } = match
  match.time += dt
  const dead = phase === 'ready' || phase === 'kickoff' || phase === 'set'
  const still = phase === 'ready' || phase === 'end'

  for (const p of match.players) {
    p.cooldown = Math.max(0, p.cooldown - dt)
    p.windup = p.charging ? p.windup + dt : 0
    let ix = still ? 0 : p.ix
    let iy = still ? 0 : p.iy
    const length = Math.hypot(ix, iy)
    if (length > 1) {
      ix /= length
      iy /= length
    }
    const top = RUN_SPEED * (p.charging ? WINDUP_SPEED : 1)
    const grip = 1 - Math.exp(-GRIP * dt)
    p.vx += (ix * top - p.vx) * grip
    p.vy += (iy * top - p.vy) * grip
    p.x += p.vx * dt
    p.y += p.vy * dt
  }

  if (dead) {
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

  collide(match, events, dead)
  keepRules(match, dt)
  walls(match)
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

// Bounces the ball off a stretch of net from (x0, y0) to (x1, y1); nets soak most of it up
function net (ball, x0, y0, x1, y1) {
  const sx = x1 - x0
  const sy = y1 - y0
  const t = clamp(((ball.x - x0) * sx + (ball.y - y0) * sy) / (sx * sx + sy * sy), 0, 1)
  const px = x0 + sx * t
  const py = y0 + sy * t
  let dx = ball.x - px
  let dy = ball.y - py
  const d = Math.hypot(dx, dy)
  if (d >= BALL_R) return 0
  if (d < 1e-6) {
    dx = -sy
    dy = sx
  }
  const length = Math.hypot(dx, dy)
  const nx = dx / length
  const ny = dy / length
  ball.x = px + nx * BALL_R
  ball.y = py + ny * BALL_R
  const vn = ball.vx * nx + ball.vy * ny
  if (vn >= 0) return 0
  ball.vx = (ball.vx - nx * vn * 1.25) * 0.85
  ball.vy = (ball.vy - ny * vn * 1.25) * 0.85
  return -vn
}

const POSTS = [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sy]) => ({ x: sx * HALF_W, y: sy * GOAL_HALF, vx: 0, vy: 0 }))

function collide (match, events, dead) {
  const { players, ball } = match
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) bounce(players[i], players[j], PLAYER_R * 2, 0.5, 0.5, 0.2)
  }
  // A dead ball doesn't budge until the restart is taken
  players.forEach((p, i) => {
    // A dull bounce, so a player running with the ball keeps it close
    const met = bounce(p, ball, PLAYER_R + BALL_R, dead ? 1 : PLAYER_SHARE, dead ? 0 : BALL_SHARE, 0.15)
    if (met >= 0 && !dead) touch(match, i)
  })
  for (const post of POSTS) {
    if (bounce(post, ball, POST_R + BALL_R, 0, 1, 0.6) > 4) {
      match.counts.posts++
      events.push({ type: 'post' })
    }
    for (const p of players) bounce(post, p, POST_R + PLAYER_R, 0, 1, 0.2)
  }
  for (const side of [-1, 1]) {
    const line = side * HALF_W
    const back = side * (HALF_W + GOAL_DEPTH)
    net(ball, back, -GOAL_HALF, back, GOAL_HALF)
    net(ball, line, -GOAL_HALF, back, -GOAL_HALF)
    net(ball, line, GOAL_HALF, back, GOAL_HALF)
    // Nobody stands in the net
    for (const p of players) outOfBox(p, Math.min(line, back), Math.max(line, back), -GOAL_HALF, GOAL_HALF)
  }
}

// Moves a player's disc out of a box it overlaps
function outOfBox (p, x0, x1, y0, y1) {
  const px = clamp(p.x, x0, x1)
  const py = clamp(p.y, y0, y1)
  const dx = p.x - px
  const dy = p.y - py
  const d2 = dx * dx + dy * dy
  if (d2 >= PLAYER_R * PLAYER_R) return
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2)
    p.x = px + (dx / d) * PLAYER_R
    p.y = py + (dy / d) * PLAYER_R
  } else {
    // The middle is inside: leave by the nearest side
    const exits = [[p.x - x0, x0 - PLAYER_R, null], [x1 - p.x, x1 + PLAYER_R, null], [p.y - y0, null, y0 - PLAYER_R], [y1 - p.y, null, y1 + PLAYER_R]]
    exits.sort((a, b) => a[0] - b[0])
    if (exits[0][1] !== null) p.x = exits[0][1]
    else p.y = exits[0][2]
  }
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

// While a restart waits, the other team keeps its distance; at a kick-off everyone stays in
// their own half and the other team out of the center circle
function keepRules (match, dt) {
  const { phase, restart, ball } = match
  if (phase === 'set') {
    for (const p of match.players) {
      if (p.team !== restart.team) keepOut(p, ball.x, ball.y, RESTART_GAP + PLAYER_R, dt)
    }
  } else if (phase === 'kickoff' || phase === 'ready') {
    for (const p of match.players) {
      const dir = attackDir(p.team)
      if (p.x * dir > 0) {
        p.x = 0
        if (p.vx * dir > 0) p.vx = 0
      }
      if (p.team !== restart.team) keepOut(p, 0, 0, CIRCLE_R + PLAYER_R, dt)
    }
  }
}

// The hall's walls: players stop at them, the ball bounces off
function walls (match) {
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
  const bx = WALL_X - BALL_R
  const by = WALL_Y - BALL_R
  if (Math.abs(ball.x) > bx) {
    ball.x = Math.sign(ball.x) * bx
    ball.vx *= -0.4
  }
  if (Math.abs(ball.y) > by) {
    ball.y = Math.sign(ball.y) * by
    ball.vy *= -0.4
  }
}

const touch = (match, index) => { match.lastTouch = index }

function kicks (match, events) {
  const { ball } = match
  match.players.forEach((p, i) => {
    const order = p.kick
    if (!order) return
    // Read the phase for every player: the first kick of a restart puts the ball in play
    const dead = match.phase === 'kickoff' || match.phase === 'set'
    if (match.time > order.until || !(dead || match.phase === 'play')) {
      p.kick = null
      return
    }
    const dx = ball.x - p.x
    const dy = ball.y - p.y
    const d = Math.hypot(dx, dy)
    if (d > PLAYER_R + BALL_R + KICK_REACH) return
    // A restart is only for the team it was given to
    if (dead && p.team !== match.restart.team) {
      p.kick = null
      return
    }
    const nx = d > 1e-6 ? dx / d : attackDir(p.team)
    const ny = d > 1e-6 ? dy / d : 0
    const speed = KICK_MIN + (KICK_MAX - KICK_MIN) * order.power
    // A little of the run carries into the ball
    ball.vx = nx * speed + p.vx * 0.3
    ball.vy = ny * speed + p.vy * 0.3
    p.kick = null
    p.cooldown = KICK_COOLDOWN
    match.counts.kicks++
    match.lastKick = order.power
    touch(match, i)
    events.push({ type: 'kick', by: i, power: order.power })
    if (match.phase !== 'play') {
      match.phase = 'play'
      match.restart = null
      match.timer = 0
    }
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
    case 'set':
      match.timer -= STEP
      if (match.timer <= 0) {
        // Four seconds gone: the restart goes to the other team
        match.restart.team = 1 - match.restart.team
        match.timer = RESTART_TIME
        whistle(match, events)
        events.push({ type: 'turnover' })
      }
      break
    case 'play': {
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
      const side = Math.abs(ball.x) > HALF_W + BALL_R ? Math.sign(ball.x) : 0
      // The whole ball over the line between the posts
      if (side && Math.abs(ball.y) < GOAL_HALF) {
        goal(match, events, side > 0 ? 0 : 1)
        return
      }
      const lastTeam = match.lastTouch >= 0 ? match.players[match.lastTouch].team : -1
      if (Math.abs(ball.y) > HALF_H + BALL_R) {
        out(match, events, 'kickin', lastTeam === 0 ? 1 : 0, clamp(ball.x, -HALF_W + 1, HALF_W - 1), Math.sign(ball.y) * (HALF_H - 0.4))
      } else if (side) {
        // Over a goal line: a corner if the defenders touched it last, a goal clearance if not
        const defenders = side > 0 ? 1 : 0
        const vertical = Math.sign(ball.y) || 1
        if (lastTeam === defenders) out(match, events, 'corner', 1 - defenders, side * (HALF_W - 0.6), vertical * (HALF_H - 0.6))
        else out(match, events, 'clearance', defenders, side * (HALF_W - 4), vertical * 3)
      }
      break
    }
    case 'out':
      match.timer -= STEP
      if (match.timer <= 0) {
        // The ball is put down for the restart, which has four seconds
        const { x, y } = match.restart
        Object.assign(ball, { x, y, vx: 0, vy: 0 })
        match.phase = 'set'
        match.timer = RESTART_TIME
      }
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
        lineUp(match, 1 - team)
        match.restart = { kind: 'kickoff', team: 1 - team, x: 0, y: 0 }
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

function out (match, events, kind, team, x, y) {
  match.phase = 'out'
  match.timer = OUT_TIME
  match.restart = { kind, team, x, y }
  whistle(match, events)
  events.push({ type: 'out', kind, team })
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
  match.restart = null
  events.push({ type: 'goal', team, by, own })
}

function finish (match, events) {
  match.phase = 'end'
  match.timer = END_TIME
  match.restart = null
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
  const { ball, restart, lastGoal, counts } = match
  return {
    t: Math.round(match.time * 1000) / 1000,
    ph: PHASES.indexOf(match.phase),
    tm: r2(match.timer),
    c: r2(match.clock),
    gg: match.golden ? 1 : 0,
    s: match.score.slice(),
    rs: restart ? [RESTARTS.indexOf(restart.kind), restart.team] : null,
    b: [r2(ball.x), r2(ball.y)],
    p: match.players.map(p => [r2(p.x), r2(p.y), Math.round(Math.min(1, p.windup / FULL_CHARGE) * 10)]),
    n: [counts.kicks, counts.posts, counts.whistles, counts.goals],
    lk: r2(match.lastKick),
    lw: match.longWhistle ? 1 : 0,
    lg: lastGoal ? [lastGoal.team, lastGoal.by, lastGoal.own ? 1 : 0] : null
  }
}

/**
 * The match as the screen shows it: { t, phase, timer, clock, golden, score, restart, ball,
 * players: [{ x, y, charge }], counts, lastKick, longWhistle, lastGoal }. Snapshots read back
 * into the same shape.
 */
export function viewOf (match) {
  const { ball, restart, lastGoal, counts } = match
  return {
    t: match.time,
    phase: match.phase,
    timer: match.timer,
    clock: match.clock,
    golden: match.golden,
    score: match.score,
    restart: restart ? { kind: restart.kind, team: restart.team } : null,
    ball: { x: ball.x, y: ball.y },
    players: match.players.map(p => ({ x: p.x, y: p.y, charge: Math.min(1, p.windup / FULL_CHARGE) })),
    counts: [counts.kicks, counts.posts, counts.whistles, counts.goals],
    lastKick: match.lastKick,
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
    players.push({ x: entry[0], y: entry[1], charge: clamp(num(entry[2]) || 0, 0, 10) / 10 })
  }
  const score = Array.isArray(data.s) ? [int(data.s[0], 999) ?? 0, int(data.s[1], 999) ?? 0] : [0, 0]
  const counts = Array.isArray(data.n) ? [0, 1, 2, 3].map(i => int(data.n[i], 1e9) ?? 0) : [0, 0, 0, 0]
  const kind = Array.isArray(data.rs) ? RESTARTS[data.rs[0]] : null
  const lg = Array.isArray(data.lg) ? data.lg : null
  return {
    t,
    phase,
    timer: num(data.tm) ?? 0,
    clock: num(data.c) ?? 0,
    golden: data.gg === 1,
    score,
    restart: kind ? { kind, team: data.rs[1] === 1 ? 1 : 0 } : null,
    ball: { x: data.b[0], y: data.b[1] },
    players,
    counts,
    lastKick: clamp(num(data.lk) || 0, 0, 1),
    longWhistle: data.lw === 1,
    lastGoal: lg ? { team: lg[0] === 1 ? 1 : 0, by: int(lg[1], count - 1) ?? -1, own: lg[2] === 1 } : null
  }
}
