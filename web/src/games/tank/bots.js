import { TANK_R, TANK_SPEED, TURN_SPEED, SHELL_SPEED, castRay, angleDiff } from './engine'

// Bot tanks. A bot has the same one button as a person: held, its tank drives ahead and fires
// on the press; let go, it turns on the spot, the other way after every press. Each moment it
// decides only whether the button is down.
//
// It picks the nearest tank, waits for its barrel to swing round onto it and taps to fire when
// the way is clear. With a wall in between it finds the most open way towards the target and
// drives along it. Better bots react sooner, aim finer, lead a moving target and get out of
// the way of shells coming at them.

export const LEVELS = {
  easy: { react: 0.5, aim: 0.24, fire: 0.5, lead: 0, dodge: 0, drive: 0.6 },
  normal: { react: 0.25, aim: 0.13, fire: 0.85, lead: 0.6, dodge: 0.35, drive: 0.8 },
  hard: { react: 0.1, aim: 0.07, fire: 1, lead: 1, dodge: 0.75, drive: 1 }
}

export const newBrain = () => ({ until: 0, held: false, next: 0, goal: null, goalAt: 0, dodgeAt: 0, x: 0, y: 0, checked: 0 })

const TAP = 0.07 // seconds a tap holds the button: a shot and barely a move
const DIRECTIONS = 16

const rand = (min, max) => min + Math.random() * (max - min)

// How far a tank can drive from (x, y) heading `a` before meeting a wall
const room = (x, y, a, walls, max) => castRay(x, y, Math.cos(a), Math.sin(a), walls, max).t

/**
 * Whether a bot's button is down this moment.
 * world: { clock, walls, targets: [{ x, y, a, moving }], shells: [{ x, y, dx, dy, mine }] }
 */
export function botHeld (bot, brain, world, level = LEVELS.normal) {
  const { clock, walls } = world

  // Holding: until the time's up, or sooner against a wall or when it stopped getting anywhere
  if (brain.held) {
    if (clock >= brain.until) return release(brain, clock, level)
    if (clock - brain.checked > 0.25) {
      const moved = Math.hypot(bot.x - brain.x, bot.y - brain.y)
      brain.checked = clock
      brain.x = bot.x
      brain.y = bot.y
      if (moved < TANK_SPEED * 0.25 * 0.3) return release(brain, clock, level)
    }
    if (room(bot.x, bot.y, bot.a, walls, TANK_R + 2) < TANK_R + 0.8) return release(brain, clock, level)
    return true
  }

  // Just let go: a moment before it acts again, longer for a slower bot. Otherwise it looks
  // every step, so a barrel swinging past the target is caught in time.
  if (clock < brain.next) return false

  // A shell on its way in: drive out of its path
  if (level.dodge && clock >= brain.dodgeAt && threatened(bot, world.shells)) {
    brain.dodgeAt = clock + 0.4
    if (Math.random() < level.dodge && room(bot.x, bot.y, bot.a, walls, 6) > 4) return press(brain, bot, clock, 0.3)
  }

  const target = nearest(bot, world.targets)
  if (!target) return false
  const dist = Math.hypot(target.x - bot.x, target.y - bot.y)
  // Where the target will be when a shell gets there
  let tx = target.x
  let ty = target.y
  if (target.moving && level.lead) {
    const t = (dist / SHELL_SPEED) * level.lead
    tx += Math.cos(target.a) * TANK_SPEED * t
    ty += Math.sin(target.a) * TANK_SPEED * t
  }
  const want = Math.atan2(ty - bot.y, tx - bot.x)
  const diff = angleDiff(bot.a, want)
  const clear = room(bot.x, bot.y, want, walls, dist) >= dist - TANK_R

  if (clear) {
    brain.goal = null
    // Lined up: fire, and close in on a target that's far off
    if (Math.abs(diff) < level.aim * (dist < 15 ? 2 : 1)) {
      if (Math.random() > level.fire) {
        brain.next = clock + 0.6
        return false
      }
      const drive = dist > 22 && Math.random() < level.drive ? Math.min(1.2, Math.max(0.2, (dist - 16) / TANK_SPEED)) * rand(0.6, 1) : TAP
      return press(brain, bot, clock, drive)
    }
    // Turning the long way round: a tap swings it back the short way
    return flipIfLong(brain, bot, clock, diff)
  }

  // No clear shot: head the most open way that leads towards the target
  if (brain.goal === null || clock >= brain.goalAt) {
    brain.goal = openWay(bot, want, walls)
    brain.goalAt = clock + 1.5
  }

  const toGoal = angleDiff(bot.a, brain.goal)
  if (Math.abs(toGoal) < 0.25) {
    const free = room(bot.x, bot.y, bot.a, walls, 30)
    brain.goal = null
    return press(brain, bot, clock, Math.min(1.1, Math.max(0.2, (free - TANK_R * 2) / TANK_SPEED)) * rand(0.7, 1) * level.drive + TAP)
  }
  return flipIfLong(brain, bot, clock, toGoal)
}

function press (brain, bot, clock, seconds) {
  brain.held = true
  brain.until = clock + seconds
  brain.checked = clock
  brain.x = bot.x
  brain.y = bot.y
  return true
}

function release (brain, clock, level) {
  brain.held = false
  brain.next = clock + level.react * rand(0.3, 0.8)
  return false
}

// The tank turns the way `spin` says (1 is clockwise, the way angles grow). When the way it
// wants to face is well round the other way, a tap flips the turn.
function flipIfLong (brain, bot, clock, diff) {
  if (Math.abs(diff) > 1.9 && Math.sign(diff) !== bot.spin && Math.abs(diff) / TURN_SPEED > 0.8) return press(brain, bot, clock, TAP)
  return false
}

function nearest (bot, targets) {
  let best = null
  let bestD = Infinity
  for (const t of targets) {
    const d = Math.hypot(t.x - bot.x, t.y - bot.y)
    if (d < bestD) {
      bestD = d
      best = t
    }
  }
  return best
}

// The heading with the most room to drive, weighed against how far it turns from the target
function openWay (bot, want, walls) {
  let best = want
  let bestScore = -Infinity
  for (let i = 0; i < DIRECTIONS; i++) {
    const a = (i / DIRECTIONS) * Math.PI * 2
    const free = Math.min(25, room(bot.x, bot.y, a, walls, 25))
    const score = free - Math.abs(angleDiff(a, want)) * 6 + Math.random() * 2
    if (free > TANK_R * 3 && score > bestScore) {
      bestScore = score
      best = a
    }
  }
  return best
}

// A shell not its own that will pass close in the next half second
function threatened (bot, shells) {
  for (const s of shells) {
    if (s.mine) continue
    const rx = bot.x - s.x
    const ry = bot.y - s.y
    const along = rx * s.dx + ry * s.dy
    if (along <= 0 || along > SHELL_SPEED * 0.5) continue
    const side = Math.abs(rx * s.dy - ry * s.dx)
    if (side < TANK_R * 1.8) return true
  }
  return false
}
