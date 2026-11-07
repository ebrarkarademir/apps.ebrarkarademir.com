import { W, GROUND, GOAL_W, HEAD_Y, HEAD_R, BALL_R, facing } from './engine.js'

// The computer player. It sees the ball a little late (later on the easy level), guesses where
// it's going, and keeps between it and its own goal: when the ball is on the right side of it,
// it runs at it and kicks it at the other goal; when it's not, it gets back round it. It jumps
// for balls coming in over its head and now and then just goes for it.

export const LEVELS = {
  easy: { delay: 18, speed: 0.6, jump: 0.35, kick: 0.5, aim: 14 },
  normal: { delay: 9, speed: 0.85, jump: 0.7, kick: 0.8, aim: 7 },
  hard: { delay: 3, speed: 1, jump: 0.95, kick: 1, aim: 2 }
}

export function newBrain () {
  return { seen: [], wobble: 0, wobbleAt: 0, hold: 0, jumpHold: 0, think: 0 }
}

// Where the ball will be after `t` seconds, roughly, without bounces off players
function ahead (ball, vx, vy, t) {
  let x = ball.x + vx * t
  const y = Math.min(GROUND - BALL_R, ball.y + vy * t + 210 * t * t)
  if (x < BALL_R) x = BALL_R * 2 - x
  if (x > W - BALL_R) x = (W - BALL_R) * 2 - x
  return { x, y }
}

/** The bot's controls for this step: { move, jump, kick }. */
export function botControls (m, side, brain, level = LEVELS.normal) {
  const p = m.players[side]
  const b = m.ball
  brain.seen.push({ x: b.x, y: b.y, vx: b.vx, vy: b.vy })
  if (brain.seen.length > level.delay + 1) brain.seen.shift()
  const ball = brain.seen[0]
  const dir = facing(side)
  const ownGoal = side === 0 ? GOAL_W : W - GOAL_W
  if (m.phase !== 'play') return { move: 0, jump: false, kick: false }

  // A small miss every now and then, so it isn't perfect
  brain.think--
  if (brain.think <= 0) {
    brain.think = 20 + Math.floor(Math.random() * 20)
    brain.wobble = (Math.random() - 0.5) * 2 * level.aim
  }

  const soon = ahead(ball, ball.vx, ball.vy, 0.25)
  // Ahead of the ball means between it and the other goal: then get back behind it
  const behind = (soon.x - p.x) * dir > -4
  let target
  if (behind) {
    target = soon.x - dir * (BALL_R + 10) + brain.wobble
  } else {
    // Round the ball, back towards its own goal, and come at it again
    target = soon.x - dir * 30
  }
  // When the ball is far up the other end, wait a little way out from its own goal
  const far = (ball.x - W / 2) * dir > 30 && ball.vx * dir > -40
  if (far) target = level.speed < 1 ? (target + ownGoal + dir * 50) / 2 : (target * 2 + ownGoal + dir * 70) / 3
  target = Math.max(HEAD_R + 2, Math.min(W - HEAD_R - 2, target))

  const gap = target - p.x
  let move = Math.abs(gap) > 3 ? Math.sign(gap) : 0
  if (move && Math.random() > level.speed) move = 0

  // Jump for a ball dropping in over its head, or one coming at the goal high
  const headY = p.y - HEAD_Y
  const dx = ball.x - p.x
  let jump = false
  if (brain.jumpHold > 0) {
    brain.jumpHold--
    jump = true
  } else if (p.ground && ball.y < headY - 6 && ball.y > headY - 70 && Math.abs(dx + ball.vx * 0.12) < 22 && Math.random() < level.jump * 0.25) {
    brain.jumpHold = 6
    jump = true
  }

  // A ball coming at its goal over its head: jump to block it, just in time
  const coming = -ball.vx * dir
  if (!jump && p.ground && coming > 60) {
    const t = (p.x - ball.x) / ball.vx
    if (t > 0 && t < 0.4) {
      const y = ball.y + ball.vy * t + 210 * t * t
      const peak = 0.45 - t // the jump should meet it near its top
      if (y < headY - 4 && y > headY - 64 && peak > 0 && Math.random() < level.jump * 0.5) {
        brain.jumpHold = 10
        jump = true
      }
    }
  }

  // On the wrong side of the ball and running back past it: hop over it, not through it
  if (!jump && p.ground && !behind && Math.abs(dx) < 30 && ball.y > p.y - 30 && move === -dir) {
    brain.jumpHold = 10
    jump = true
  }

  // Toe to toe with the other player and the ball between them: jump, to get over it
  const foe = m.players[1 - side]
  const between = (ball.x - p.x) * dir > 0 && (foe.x - ball.x) * dir > 0
  if (!jump && p.ground && between && Math.abs(foe.x - p.x) < 44 && Math.random() < level.jump * 0.04) {
    brain.jumpHold = 8
    jump = true
  }

  // Kick when the ball is in reach of the foot, in front
  const front = dx * dir
  const low = ball.y > p.y - 34
  const kick = front > -2 && front < 24 && low && Math.random() < level.kick * 0.5

  return { move, jump, kick }
}
