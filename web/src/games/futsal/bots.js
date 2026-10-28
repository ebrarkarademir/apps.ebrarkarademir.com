import {
  HALF_W, HALF_H, WALL_X, WALL_Y, GOAL_HALF, PLAYER_R, BALL_R, RUN_SPEED, BALL_DRAG, KICK_REACH,
  KICK_MIN, KICK_MAX, FULL_CHARGE, RESTART_TIME, attackDir, formationSpot
} from './engine'

// Computer players for Futsal. A bot sizes up the match a few times a second and settles on a
// plan: go for the ball, guard the goal or keep its place in the team's shape. Between looks it
// sticks to the plan, so it reacts a beat late, like a person. Better bots look more often, run
// faster and aim truer. They use the same controls as people: a direction, and a kick that has
// to be wound up first.

// keeper: how much a keeper reads where a shot is going rather than just following the ball
export const LEVELS = {
  easy: { think: 0.36, speed: 0.72, aim: 2.6, power: 0.8, keeper: 0 },
  normal: { think: 0.2, speed: 0.86, aim: 1.4, power: 0.92, keeper: 0.15 },
  hard: { think: 0.1, speed: 0.97, aim: 0.6, power: 1, keeper: 0.35 }
}

const TOUCHING = PLAYER_R + BALL_R
const REACH = TOUCHING + KICK_REACH * 0.8
const SHOT_RANGE = 22
const KEEPER_RANGE = 8 // a keeper comes out for a ball this close to its goal
const AIM_HOLD = 0.8 // seconds a bot keeps the spot it aims for
const SHOT_TOLERANCE = Math.cos(0.12) // how straight a shot must line up (about 7°)
const PASS_TOLERANCE = Math.cos(0.3)
const POKE_TOLERANCE = Math.cos(1.2) // a poke out of a scramble only has to go forward
const STUCK_TIME = 0.5 // at the ball this long without getting lined up: poke it forward

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y)

// How hard to kick for the ball to reach a teammate that far away with a little pace left
const passPower = (d) => clamp((d * 1.3 + 4 - KICK_MIN) / (KICK_MAX - KICK_MIN), 0, 1)

// Where the ball will be in t seconds, rolling on and slowing
function ballAt (ball, t) {
  const roll = (1 - Math.exp(-BALL_DRAG * t)) / BALL_DRAG
  return { x: ball.x + ball.vx * roll, y: ball.y + ball.vy * roll }
}

// About where a player running at `speed` catches the ball up: a few rounds of "how long to get there"
function meetPoint (me, ball, speed) {
  let at = ball
  for (let i = 0; i < 4; i++) at = ballAt(ball, Math.max(0, distance(me, at) - TOUCHING) / speed)
  return { x: clamp(at.x, -WALL_X + BALL_R, WALL_X - BALL_R), y: clamp(at.y, -WALL_Y + BALL_R, WALL_Y - BALL_R) }
}

export const newBrain = () => ({ next: 0, tx: 0, ty: 0, lined: false, windup: null, aim: null, plan: null, stuck: 0 })

// How well a kick from where `me` stands would send the ball toward (x, y): 1 is dead on
function lineUp (me, ball, x, y) {
  const kx = ball.x - me.x
  const ky = ball.y - me.y
  const ax = x - ball.x
  const ay = y - ball.y
  return (kx * ax + ky * ay) / ((Math.hypot(kx, ky) * Math.hypot(ax, ay)) || 1)
}

/**
 * The controls a bot works this step: { x, y, charging, kick }, where kick is the power of a
 * kick it lets go now, or null.
 */
export function botControls (match, index, brain, level, random = Math.random) {
  const me = match.players[index]
  if (match.time >= brain.next) {
    think(match, index, brain, level, random)
    brain.next = match.time + level.think * (0.7 + random() * 0.6)
  }
  let dx = brain.tx - me.x
  let dy = brain.ty - me.y
  const d = Math.hypot(dx, dy)
  // Slow down into the spot instead of running past it and back
  const pace = d > 0.05 ? (level.speed * Math.min(1, d / 1.5)) / d : 0
  dx *= pace
  dy *= pace
  // ...and keep out of teammates' way
  for (const other of match.players) {
    if (other === me || other.team !== me.team) continue
    const ox = me.x - other.x
    const oy = me.y - other.y
    const gap = Math.hypot(ox, oy)
    if (gap > 0.01 && gap < PLAYER_R * 2.6) {
      const push = (PLAYER_R * 2.6 - gap) / (PLAYER_R * 2.6) * 0.8
      dx += (ox / gap) * push
      dy += (oy / gap) * push
    }
  }
  let charging = false
  let kick = null
  const windup = brain.windup
  if (windup) {
    const live = match.phase === 'play' || match.phase === 'kickoff' || match.phase === 'set'
    if (!live || match.time > windup.giveUp) {
      brain.windup = null
    } else if (match.time >= windup.ready && distance(me, match.ball) <= REACH &&
        lineUp(me, match.ball, windup.x, windup.y) >= windup.tolerance) {
      kick = windup.power
      brain.windup = null
    } else {
      charging = true
    }
  }
  return { x: dx, y: dy, charging, kick }
}

function think (match, index, brain, level, random) {
  const me = match.players[index]
  const dir = attackDir(me.team)
  const mates = []
  match.players.forEach((p, i) => { if (p.team === me.team) mates.push(i) })
  // In a team of three or more, the bot at the back keeps goal
  const keeper = mates.length >= 3 ? mates.find(i => match.players[i].bot && match.players[i].slot === 0) : undefined
  switch (match.phase) {
    case 'kickoff':
    case 'set':
      if (match.restart.team === me.team && nearest(match, mates) === index) {
        takeRestart(match, index, brain, level, random)
      } else {
        brain.windup = null
        hold(match, me, brain, dir, index === keeper, level)
      }
      return
    case 'play': {
      const comeOut = nearest(match, mates) === index && distance(match.ball, { x: -dir * HALF_W, y: 0 }) < KEEPER_RANGE
      if (index === keeper && !comeOut) {
        brain.windup = null
        guard(match, me, brain, dir, level)
      } else if (index === keeper || chaser(match, mates, keeper) === index) {
        attack(match, index, brain, level, random)
      } else {
        brain.windup = null
        hold(match, me, brain, dir, false, level)
      }
      return
    }
    default:
      // Out of play, celebrating or waiting for the whistle: back into shape
      brain.windup = null
      brain.aim = null
      hold(match, me, brain, dir, index === keeper, level)
  }
}

function nearest (match, list) {
  let best = -1
  let bestD = Infinity
  for (const i of list) {
    const d = distance(match.players[i], match.ball)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

// Who on the team goes for the ball: the nearest, counting a player already goal-side of it
// (facing up the court) as nearer. A person counts too, so bots leave them the ball.
function chaser (match, mates, keeper) {
  const { ball } = match
  let best = -1
  let bestCost = Infinity
  for (const i of mates) {
    if (i === keeper) continue
    const p = match.players[i]
    const cost = distance(p, ball) + ((ball.x - p.x) * attackDir(p.team) > 0 ? 0 : 4)
    if (cost < bestCost) {
      bestCost = cost
      best = i
    }
  }
  return best
}

// The team with a player at the ball, or -1 while it's loose
function possession (match) {
  let best = null
  let bestD = TOUCHING + 1.5
  for (const p of match.players) {
    const d = distance(p, match.ball)
    if (d < bestD) {
      bestD = d
      best = p
    }
  }
  return best ? best.team : -1
}

// Its place in the team's shape, which slides up and down the court with the ball: pushed up
// and spread wide to be passed to while the team has the ball, tucked in behind it while not
function hold (match, me, brain, dir, isKeeper, level) {
  if (isKeeper) {
    guard(match, me, brain, dir, level)
    return
  }
  const { ball } = match
  const [fx, fy] = formationSpot(me.size, me.slot)
  const bx = ball.x * dir
  let x
  let y
  if (match.phase === 'play' && possession(match) === me.team) {
    x = fx + 12 + clamp(bx, -10, 20) * 0.6
    y = fy * 1.4 + ball.y * 0.15
  } else {
    x = fx + clamp(bx + 6, -8, 18) * 0.65
    y = fy * 0.85 + ball.y * 0.3
  }
  brain.tx = clamp(x, -HALF_W + 3, HALF_W - 4) * dir
  brain.ty = clamp(y, -HALF_H + 2, HALF_H - 2)
}

// A keeper stands just off its line, on the way from the ball to the middle of the goal. A
// good one also steps across to where a shot is headed.
function guard (match, me, brain, dir, level) {
  const { ball } = match
  const goalX = -dir * HALF_W
  const lineX = goalX + dir * 1.8
  const span = ball.x - goalX
  // Not all the way across for a ball that's close: that's how a shot gets past
  let y = span * dir > 0.5 ? ball.y * clamp((lineX - goalX) / (dir * Math.max(span * dir, 8)), 0, 1) : 0
  if (ball.vx * -dir > 8 && (ball.x - lineX) * dir > 0) {
    const headed = ball.y + ball.vy * ((lineX - ball.x) / ball.vx)
    y += (headed - y) * level.keeper
  }
  brain.tx = lineX
  brain.ty = clamp(y, -(GOAL_HALF + 0.3), GOAL_HALF + 0.3)
}

/**
 * Heads for the spot behind the ball, as seen from (aimX, aimY), walking round the ball rather
 * than through it. With `through` it then runs on through the ball, which pushes it that way;
 * otherwise it stops there, ready to kick. Sets brain.lined while it's in place.
 */
function approach (me, brain, ball, aimX, aimY, through) {
  let ux = aimX - ball.x
  let uy = aimY - ball.y
  const length = Math.hypot(ux, uy) || 1
  ux /= length
  uy /= length
  const ox = me.x - ball.x
  const oy = me.y - ball.y
  const behind = -(ox * ux + oy * uy) // how far behind the ball, seen from the aim
  const across = ox * -uy + oy * ux // how far off to one side
  brain.lined = behind > 0.3 && Math.abs(across) < (through ? PLAYER_R * 0.6 : 0.45)
  let tx
  let ty
  if (brain.lined && through) {
    tx = ball.x + ux * 2
    ty = ball.y + uy * 2
  } else if (behind > -TOUCHING * 0.3 || Math.abs(across) > TOUCHING + 0.8) {
    tx = ball.x - ux * (TOUCHING + 0.15)
    ty = ball.y - uy * (TOUCHING + 0.15)
  } else {
    // On the wrong side: go round it first, well clear
    const s = across >= 0 ? 1 : -1
    tx = ball.x - uy * s * (TOUCHING + 2) - ux * 0.5
    ty = ball.y + ux * s * (TOUCHING + 2) - uy * 0.5
  }
  brain.tx = clamp(tx, -WALL_X + PLAYER_R, WALL_X - PLAYER_R)
  brain.ty = clamp(ty, -WALL_Y + PLAYER_R, WALL_Y - PLAYER_R)
}

function windUp (match, brain, power, patience, x, y, tolerance) {
  if (brain.windup) return
  const ready = match.time + power * FULL_CHARGE
  brain.windup = { power, ready, giveUp: ready + patience, x, y, tolerance }
}

// The opponent nearest the line from `from` to (x, y), and how near: for spotting a blocked lane
function laneBlock (match, me, from, x, y) {
  const lx = x - from.x
  const ly = y - from.y
  const length = Math.hypot(lx, ly) || 1
  let worst = Infinity
  let who = null
  for (const p of match.players) {
    if (p.team === me.team) continue
    const along = ((p.x - from.x) * lx + (p.y - from.y) * ly) / length
    if (along < 0 || along > length) continue
    const off = Math.abs((p.x - from.x) * ly - (p.y - from.y) * lx) / length
    if (off < worst) {
      worst = off
      who = p
    }
  }
  return { off: worst, who }
}

// An open teammate to pass to from `from`, led a little in the way they're running, or null
function findPass (match, me, from, dir, random) {
  const opponents = match.players.filter(p => p.team !== me.team)
  let best = null
  let bestScore = -Infinity
  for (const p of match.players) {
    if (p === me || p.team !== me.team) continue
    const lead = { x: p.x + p.vx * 0.4, y: p.y + p.vy * 0.4 }
    const d = distance(lead, from)
    if (d < 5 || d > 26 || Math.abs(lead.y) > HALF_H - 1 || Math.abs(lead.x) > HALF_W - 1) continue
    if (lead.x * dir < -HALF_W + 12 || (lead.x - from.x) * dir < -6) continue
    const open = Math.min(12, ...opponents.map(o => distance(o, lead)))
    if (open < 3.5 || laneBlock(match, me, from, lead.x, lead.y).off < TOUCHING + 0.4) continue
    const score = open * 1.2 + (lead.x - from.x) * dir * 0.5 - d * 0.1 + random() * 2
    if (score > bestScore) {
      bestScore = score
      best = { x: lead.x, y: lead.y, power: passPower(d) }
    }
  }
  return best
}

// What to do with the ball once there: clear it, shoot, pass, or run with it
function chooseAim (match, me, spot, dir, level, random) {
  const goalX = dir * HALF_W
  const toGoal = Math.hypot(goalX - spot.x, spot.y)
  const until = match.time + AIM_HOLD
  // Deep in its own end a bot clears the ball out toward a wing instead of walking it out
  if (spot.x * dir < -HALF_W + 11) {
    return { mode: 'clear', until, x: spot.x + dir * 18, y: clamp(spot.y * 1.4 + (Math.sign(spot.y) || 1) * 4, -HALF_H + 5, HALF_H - 5), power: 0.6 }
  }
  if (toGoal < SHOT_RANGE) {
    // The corner further from the keeper, a little off for weaker bots
    const keeper = match.players.filter(p => p.team !== me.team).sort((a, b) => Math.abs(a.x - goalX) - Math.abs(b.x - goalX))[0]
    const first = keeper && Math.abs(keeper.x - goalX) < 6 ? (keeper.y > 0 ? -1 : 1) : -(Math.sign(spot.y) || 1)
    for (const side of [first, -first]) {
      const y = clamp(side * (GOAL_HALF - 1.9) + (random() * 2 - 1) * level.aim, -GOAL_HALF + 1.2, GOAL_HALF - 1.2)
      const { off, who } = laneBlock(match, me, spot, goalX + dir, y)
      // A defender right at the ball would block it: try the other corner
      if (who && who !== keeper && off < TOUCHING && distance(who, spot) < 5) continue
      return { mode: 'shoot', until, x: goalX + dir, y, power: clamp(0.55 + toGoal / 45, 0.6, 1) * level.power }
    }
    const pass = findPass(match, me, spot, dir, random)
    if (pass) return { mode: 'pass', until, ...pass }
  }
  // Up the court, keeping away from the touchlines; under pressure or blocked, pass if someone's free
  const x = spot.x + dir * 10
  let y = clamp(spot.y * 0.5, -HALF_H + 5, HALF_H - 5)
  const pressure = Math.min(...match.players.filter(p => p.team !== me.team).map(p => distance(p, spot)))
  const { off, who } = laneBlock(match, me, spot, x, y)
  const blocked = !!who && off < TOUCHING + 0.5 && distance(who, spot) < 7
  if (pressure < 4.5 || blocked) {
    const pass = findPass(match, me, spot, dir, random)
    if (pass) return { mode: 'pass', until, ...pass }
  }
  if (blocked) y = clamp(spot.y + (who.y > spot.y ? -6 : 6), -HALF_H + 4, HALF_H - 4)
  return { mode: 'dribble', until, x, y, power: 0 }
}

function attack (match, index, brain, level, random) {
  const me = match.players[index]
  const { ball } = match
  const dir = attackDir(me.team)
  // Go to where the ball is headed, not where it is
  const spot = meetPoint(me, ball, RUN_SPEED * level.speed)
  const inRange = Math.hypot(dir * HALF_W - spot.x, spot.y) < SHOT_RANGE
  const aim = brain.aim
  if (!aim || match.time > aim.until || (aim.mode === 'dribble' && inRange) || (aim.mode === 'shoot' && !inRange)) {
    brain.aim = chooseAim(match, me, spot, dir, level, random)
    brain.windup = null
  }
  const { mode, x, y, power } = brain.aim
  if (mode === 'dribble') {
    if (brain.windup?.tolerance !== POKE_TOLERANCE) brain.windup = null
    approach(me, brain, spot, x, y, true)
    if (!brain.lined) poke(match, me, brain, dir)
    return
  }
  approach(me, brain, spot, x, y, false)
  if (brain.lined && distance(me, ball) < REACH + 1) {
    windUp(match, brain, power, 0.7, x, y, mode === 'shoot' ? SHOT_TOLERANCE : PASS_TOLERANCE)
    brain.stuck = 0
  } else {
    poke(match, me, brain, dir)
  }
}

// At the ball but someone's in the way of getting lined up: after a moment, just poke it on
function poke (match, me, brain, dir) {
  if (distance(me, match.ball) > REACH + 0.3) {
    brain.stuck = 0
    return
  }
  if (!brain.stuck) brain.stuck = match.time
  if (match.time - brain.stuck < STUCK_TIME) return
  brain.stuck = 0
  windUp(match, brain, 0.25, 0.4, match.ball.x + dir * 30, match.ball.y * 0.5, POKE_TOLERANCE)
}

// Set pieces: pick where the ball should go once, take a breath, then play it
function takeRestart (match, index, brain, level, random) {
  const me = match.players[index]
  const { ball, restart } = match
  const dir = attackDir(me.team)
  const key = `${restart.kind}:${restart.team}:${ball.x.toFixed(1)}:${ball.y.toFixed(1)}`
  if (brain.plan?.key !== key) {
    brain.plan = { key, ...pickTarget(match, me, dir, random) }
    brain.windup = null
  }
  const { x, y, power } = brain.plan
  approach(me, brain, ball, x, y, false)
  if (brain.lined && distance(me, ball) < REACH + 0.5 && match.timer < RESTART_TIME - 0.6) {
    windUp(match, brain, power, 2, x, y, PASS_TOLERANCE)
  }
}

function pickTarget (match, me, dir, random) {
  const { ball, restart } = match
  const goalX = dir * HALF_W
  // From the kick-off spot the ball can only go forward: a short one out to a side
  if (restart.kind === 'kickoff') return { x: dir * 8, y: (random() < 0.5 ? -1 : 1) * 6, power: 0.05 }
  if (restart.kind === 'corner') return { x: goalX - dir * 6, y: (random() * 2 - 1) * 3, power: 0.25 }
  const pass = findPass(match, me, ball, dir, random)
  if (pass) return pass
  const toGoal = Math.hypot(goalX - ball.x, ball.y)
  if (toGoal < SHOT_RANGE) return { x: goalX + dir, y: (random() * 2 - 1) * (GOAL_HALF - 1), power: 1 }
  return { x: ball.x + dir * 18, y: clamp(ball.y * 0.5, -HALF_H + 4, HALF_H - 4), power: 0.4 }
}
