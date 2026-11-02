import { locate, surfaceAt, angleDiff, WALL } from './track.js'

// How a Neon Laps car drives: kept free of drawing and networking, so every car moves by the
// same rules whoever drives it (a person, a bot, or a test).
//
// It's an arcade car, not a simulation. There are no pedals for the players: the engine always
// pushes the car along the way it points, and turning the wheel slows it, so a bend is taken by
// steering into it and letting the speed bleed away. (The brake is only there for backing out
// of a wall.) The steering turns the car itself, faster the faster it goes. Its velocity
// doesn't turn with it on its own: the tyres pull the sideways part of it away, but only so
// hard. Turn more sharply than they can hold and the car slides, nose in and tail out, and it
// slides much more easily once it has started: a drift, which is the quick way round a bend.
// Steer the other way and it grips again.
//
// The ground changes all of that: ice grips less than tarmac, and the run-off beside the road
// is slow. A car is two circles, front and back, for the walls and for bumping other cars.

export const STEP = 1 / 120
export const CAR_LENGTH = 4.4
export const CAR_WIDTH = 2.3
export const CAR_R = 1.2 // each of the two circles a car is made of
export const AXLE = 1.05 // how far those circles sit ahead of and behind its middle

export const TOP_SPEED = 44 // units/s on tarmac
export const ACCEL = 32 // units/s² from standing; less as the car nears its top speed
export const BRAKE = 68
export const REVERSE_TOP = 14
export const REVERSE_ACCEL = 20
export const COAST = 5 // how fast a car slows with neither pedal down
export const STEER_RATE = 2.75 // radians/s at full lock, once it's moving
export const STEER_IN = 6 // how fast the wheel turns, full lock per second
export const STEER_OUT = 9 // and straightens again
export const GRIP = 50 // the sideways pull the tyres hold before they slide, units/s²
export const SLIDE_GRIP = 0.66 // what's left of it once sliding
export const SLIDING = 2 // sideways speed from which the car counts as sliding
export const DRIFT_TURN = 1.32 // how much faster a sliding car turns
export const DRIFT_ANGLE = 0.62 // radians between where a car points and where it goes, past which a drift is held
export const TURN_DRAG = 0.55 // of its speed a car loses each second at full lock
export const BOUNCE = 0.3 // how much of its speed into a wall a car keeps, bouncing off
export const BOOST_TIME = 1.4 // seconds of a boost
export const BOOST_TOP = 1.32 // top speed while boosting, of the usual
export const BOOST_ACCEL = 2.2
export const SPIN_TIME = 1.1 // seconds a car spins after a shell hits it
export const SPIN_KEEP = 0.35 // of its speed a car keeps when a shell hits it

const TAU = Math.PI * 2
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const wrapAngle = (a) => ((a % TAU) + TAU) % TAU

/**
 * A car at rest at a place on the track. Besides where it is and its velocity:
 *   steer   where the wheel is, -1 (left) to 1 (right)
 *   knock   extra turning from a knock against a wall or a car, dying away
 *   spin    seconds of spinning left after a shell hit, and spinDir which way
 *   boost   seconds of boost left
 *   slide   whether it's sliding, skid how fast sideways
 *   bump    how hard it hit something this step (units/s), for sparks and sounds
 *   hint, s, d  where it is on the track (see track.locate)
 *   power   how strong its engine is, 1 for everyone but easier bots
 */
export function newCar (track, spot) {
  const at = locate(track, spot.x, spot.y, spot.index ?? -1)
  return {
    x: spot.x,
    y: spot.y,
    a: spot.a,
    vx: 0,
    vy: 0,
    steer: 0,
    knock: 0,
    spin: 0,
    spinDir: 1,
    boost: 0,
    slide: false,
    skid: 0,
    bump: 0,
    braking: false,
    power: 1,
    hint: at.i,
    s: at.s,
    d: at.d
  }
}

/** How fast a car goes along the way it points (negative in reverse). */
export const forwardSpeed = (car) => car.vx * Math.cos(car.a) + car.vy * Math.sin(car.a)

/** The largest turning rate the steering gives at a speed. */
export function turnRate (speed) {
  const v = Math.abs(speed)
  return STEER_RATE * clamp(0.25 + v / 9, 0, 1) * (1 - 0.28 * clamp((v - 18) / 28, 0, 1))
}

/**
 * One step of driving. input: { gas, brake, steer } with gas and brake true or false and steer
 * from -1 (left) to 1 (right). Players and bots race with the gas always down; brake, which
 * reverses once the car has stopped, backs a stuck car out. Afterwards the car is out of the walls and knows where it is on the track.
 */
export function stepCar (car, input, track, dt) {
  const ground = surfaceAt(track, car.d)
  const spinning = car.spin > 0
  const want = spinning ? 0 : clamp(input.steer || 0, -1, 1)
  const rate = want === 0 || Math.sign(want) !== Math.sign(car.steer) ? STEER_OUT : STEER_IN
  car.steer += clamp(want - car.steer, -rate * dt, rate * dt)

  const fx = Math.cos(car.a)
  const fy = Math.sin(car.a)
  // The car's right, with y growing downward
  const rx = -fy
  const ry = fx
  let vf = car.vx * fx + car.vy * fy
  let vs = car.vx * rx + car.vy * ry

  const boosting = car.boost > 0
  if (boosting) car.boost = Math.max(0, car.boost - dt)
  const top = TOP_SPEED * ground.top * (boosting ? BOOST_TOP : 1) * (car.power || 1)
  const gas = !spinning && !!input.gas
  const brake = !spinning && !!input.brake
  car.braking = brake && vf > 1
  if (brake && vf > 1) {
    vf = Math.max(0, vf - BRAKE * ground.brake * dt)
  } else if (brake) {
    vf = Math.max(-REVERSE_TOP, vf - REVERSE_ACCEL * ground.accel * dt)
  } else if (gas && vf < 0) {
    vf = Math.min(0, vf + BRAKE * ground.brake * dt)
  } else if (gas && vf < top) {
    const f = vf / top
    vf = Math.min(top, vf + ACCEL * ground.accel * (boosting ? BOOST_ACCEL : 1) * (1 - f * f) * dt)
  } else if (!gas) {
    vf -= Math.sign(vf) * Math.min(Math.abs(vf), COAST * dt)
  }
  // Turning the wheel slows the car, the harder the more
  vf -= vf * TURN_DRAG * Math.abs(car.steer) * dt
  // Faster than the ground allows (a boost running out, a wheel onto the run-off): eased back
  if (vf > top) vf = Math.max(top, vf - (vf - top) * 2.4 * dt)

  // The tyres pull the sideways speed away, up to their grip
  let grip = GRIP * ground.grip * (car.slide ? SLIDE_GRIP : 1)
  if (spinning) grip *= 0.5
  const hold = grip * dt
  vs = Math.abs(vs) <= hold ? 0 : vs - Math.sign(vs) * hold
  car.skid = Math.abs(vs)
  car.slide = car.skid > SLIDING
  // Sliding scrubs off speed
  if (car.slide) vf -= vf * 0.25 * dt * Math.min(1, car.skid / 12)

  let yaw = car.steer * turnRate(vf) * (vf < 0 ? -1 : 1) * (car.slide ? DRIFT_TURN : 1)
  // Deep in a drift, turning further into it eases off, so a held key holds the drift at a
  // good angle instead of spinning the car round. Steering out of it is never held back.
  const slip = Math.atan2(-vs, Math.abs(vf))
  if (vf > 8 && yaw * slip > 0) yaw *= clamp(1 - (Math.abs(slip) - DRIFT_ANGLE) * 1.8, 0.15, 1)
  if (spinning) {
    yaw = car.spinDir * 9 * (car.spin / SPIN_TIME + 0.15)
    car.spin = Math.max(0, car.spin - dt)
  }
  yaw += car.knock
  car.knock *= Math.exp(-8 * dt)

  car.vx = fx * vf + rx * vs
  car.vy = fy * vf + ry * vs
  car.a = wrapAngle(car.a + yaw * dt)
  car.x += car.vx * dt
  car.y += car.vy * dt
  hitWalls(car, track)
}

// Keeps the car's two circles inside the walls. A circle over a wall is put back, the car
// bounces off a little and loses some speed along the wall, and the end that hit swings the car
// round to run along it, so a car never sticks nose-first into a wall.
function hitWalls (car, track) {
  car.bump = 0
  const limit = WALL - CAR_R
  for (const end of [1, -1]) {
    const fx = Math.cos(car.a)
    const fy = Math.sin(car.a)
    const at = locate(track, car.x + fx * AXLE * end, car.y + fy * AXLE * end, car.hint)
    const over = Math.abs(at.d) - limit
    if (over <= 0) continue
    // The way back onto the road
    const sign = Math.sign(at.d)
    const inx = -at.nx * sign
    const iny = -at.ny * sign
    car.x += inx * over
    car.y += iny * over
    const vn = car.vx * inx + car.vy * iny
    if (vn >= 0) continue
    car.vx -= (1 + BOUNCE) * vn * inx
    car.vy -= (1 + BOUNCE) * vn * iny
    const keep = 1 - Math.min(0.45, -vn * 0.012)
    car.vx *= keep
    car.vy *= keep
    car.bump = Math.max(car.bump, -vn)
    // Along the wall, whichever way is nearer the way the car points
    let along = Math.atan2(inx, -iny)
    if (Math.abs(angleDiff(car.a, along)) > Math.PI / 2) along += Math.PI
    car.knock += clamp(angleDiff(car.a, along) * Math.min(1, -vn / 8) * 5, -4, 4)
  }
  const at = locate(track, car.x, car.y, car.hint)
  car.hint = at.i
  car.s = at.s
  car.d = at.d
}

// The middles of a car's two circles
const circles = (car) => {
  const fx = Math.cos(car.a) * AXLE
  const fy = Math.sin(car.a) * AXLE
  return [[car.x + fx, car.y + fy], [car.x - fx, car.y - fy]]
}

/**
 * Two cars running into each other. `share` is how much of the push apart goes to `a`: half
 * for two cars driven on this device, all of it when `b` is another player's car, which only
 * its own device moves. Both are cars as above (b needs x, y, a, vx, vy). Returns how hard
 * they hit, 0 if they didn't touch.
 */
export function bump (a, b, share = 0.5) {
  let best = null
  for (const [ax, ay] of circles(a)) {
    for (const [bx, by] of circles(b)) {
      const dx = ax - bx
      const dy = ay - by
      const d = Math.hypot(dx, dy)
      const over = CAR_R * 2 - d
      if (over > 0 && (!best || over > best.over)) best = { over, nx: d > 1e-6 ? dx / d : 1, ny: d > 1e-6 ? dy / d : 0, ax, ay, bx, by }
    }
  }
  if (!best) return 0
  const { over, nx, ny } = best
  a.x += nx * over * share
  a.y += ny * over * share
  if (share < 1) {
    b.x -= nx * over * (1 - share)
    b.y -= ny * over * (1 - share)
  }
  const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny
  if (closing >= 0) return 0
  // Two cars of the same weight: each takes half the knock
  const j = (-(1 + BOUNCE) * closing) / 2
  a.vx += nx * j
  a.vy += ny * j
  if (share < 1) {
    b.vx -= nx * j
    b.vy -= ny * j
  }
  // A knock off-centre turns a car a little
  const side = (best.ax - a.x) * ny - (best.ay - a.y) * nx
  a.knock = clamp(a.knock + side * j * 0.03, -4, 4)
  return -closing
}

/** A shell hit: the car spins, losing most of its speed. */
export function spinOut (car, dir = 1) {
  car.spin = SPIN_TIME
  car.spinDir = dir < 0 ? -1 : 1
  car.vx *= SPIN_KEEP
  car.vy *= SPIN_KEEP
  car.boost = 0
}
