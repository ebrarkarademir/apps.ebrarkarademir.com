import { pointAt, wrapS, angleDiff, ROAD } from './track.js'
import { forwardSpeed } from './car.js'

// Bot drivers. A bot drives the same car a person does, the same way: the engine always on, and
// only the steering to say where to go (see car.js). It follows the track's racing line (see
// track.js), aiming at a point a little way ahead along it, further the faster it goes, so it
// turns in early and lets the bend take its speed off, drifting where the grip runs out.
//
// Better bots have a stronger engine (`power`, which the page gives their car) and keep closer
// to the line; easy ones wander about the road. Like a person, a bot takes a moment to react to
// the green light. It moves over to get past a slower car in front, swerves for pickups near
// its line, fires its shells at a car ahead when it has a clear shot, and backs out if it gets
// stuck.

export const LEVELS = {
  easy: { power: 0.86, wander: 2.4, fire: 0.25, aim: 0.06, greed: 0.3, start: 0.6 },
  normal: { power: 0.93, wander: 1.1, fire: 0.6, aim: 0.09, greed: 0.65, start: 0.4 },
  hard: { power: 0.99, wander: 0.35, fire: 1, aim: 0.12, greed: 1, start: 0.25 }
}

const LANE = ROAD - 2.6 // the farthest a bot moves off its line, to pass or for a pickup

export const newBrain = (seed = Math.random()) => ({ seed, goAt: null, lane: 0, laneUntil: 0, stuck: 0, reverse: 0, steerBack: 1, fireAt: 0 })

/**
 * What a bot does this step: { gas, brake, steer, fire }. The gas is always down, except while
 * it backs out of somewhere it got stuck.
 * world: { track, clock and dt (seconds), go (whether the race has started), cars (the other
 *          cars: { x, y, a, vx, vy, s }), pickups (ones lying there: { x, y, s, d }), ammo }
 */
export function botInput (car, brain, world, level = LEVELS.normal) {
  const { track, clock } = world
  const input = { gas: false, brake: false, steer: 0, fire: false }
  if (!world.go) return input
  // Off the line a moment after the green light, as a person would be
  if (brain.goAt === null) brain.goAt = clock + (level.start || 0) * (0.6 + 0.8 * brain.seed)
  if (clock < brain.goAt) return input
  const speed = forwardSpeed(car)

  // Stuck against something: back out, turning the other way
  if (brain.reverse > 0) {
    brain.reverse -= world.dt
    input.brake = true
    input.steer = brain.steerBack
    return input
  }
  brain.stuck = Math.abs(speed) < 2.5 && car.spin <= 0 ? brain.stuck + world.dt : 0
  if (brain.stuck > 1) {
    brain.stuck = 0
    brain.reverse = 0.8
    // Back the nose away from the wall it's pointing at
    brain.steerBack = car.d > 0 ? 1 : -1
  }
  input.gas = true

  // Where to go: the line, moved over to pass or for a pickup, and wandering a little
  if (clock >= brain.laneUntil) brain.lane *= 0.98
  const ahead = carAhead(car, world.cars, track)
  if (ahead && clock >= brain.laneUntil) {
    const lineHere = pointAt(track, car.s, 0)
    const theirs = (ahead.x - lineHere.x) * track.nx[lineHere.index] + (ahead.y - lineHere.y) * track.ny[lineHere.index]
    brain.lane = theirs > car.d ? -LANE * 0.7 : LANE * 0.7
    brain.laneUntil = clock + 1.4
  }
  const pickup = level.greed && clock >= brain.laneUntil ? pickupAhead(car, world.pickups, track, brain, level) : null
  if (pickup) {
    brain.lane = pickup.d - track.line.off[pointAt(track, pickup.s, 0).index]
    brain.laneUntil = clock + 0.6
  }
  const wander = Math.sin(clock * 0.7 + brain.seed * 40) * level.wander
  const reach = 6 + Math.max(0, speed) * 0.36
  const target = linePoint(track, car.s + reach, brain.lane + wander)
  const want = Math.atan2(target.y - car.y, target.x - car.x)
  // Sliding, the car points one way and goes another: steer for where it's going as well
  const going = Math.hypot(car.vx, car.vy) > 6 ? Math.atan2(car.vy, car.vx) : car.a
  const aim = angleDiff(car.a, want) * 0.6 + angleDiff(going, want) * 0.4
  input.steer = Math.max(-1, Math.min(1, aim * 3))

  // A clear shot at a car ahead
  if (world.ammo > 0 && level.fire && clock >= brain.fireAt && shotAt(car, world.cars, level)) {
    brain.fireAt = clock + 1.2 / level.fire
    input.fire = true
  }
  return input
}

// The racing line `s` round the lap, moved `lane` units to its right, kept on the road
function linePoint (track, s, lane) {
  const p = pointAt(track, s, 0)
  const off = Math.max(-ROAD + 1.6, Math.min(ROAD - 1.6, track.line.off[p.index] + lane))
  const q = pointAt(track, s, off)
  return { x: q.x, y: q.y }
}

// A slower car just in front, in the way
function carAhead (car, cars, track) {
  let best = null
  let bestGap = Infinity
  const speed = forwardSpeed(car)
  for (const other of cars) {
    const gap = wrapS(other.s - car.s, track.length)
    if (gap <= 0 || gap > 14) continue
    const side = Math.abs((other.x - car.x) * -Math.sin(car.a) + (other.y - car.y) * Math.cos(car.a))
    if (side > 3.4 || forwardSpeed(other) > speed + 1) continue
    if (gap < bestGap) {
      bestGap = gap
      best = other
    }
  }
  return best
}

// A pickup coming up near the line, worth going for
function pickupAhead (car, pickups, track, brain, level) {
  for (const pickup of pickups || []) {
    const gap = wrapS(pickup.s - car.s, track.length)
    if (gap < 4 || gap > 26) continue
    const line = track.line.off[pointAt(track, pickup.s, 0).index]
    if (Math.abs(pickup.d - line) > 5) continue
    // Easier bots don't always bother
    if (((brain.seed * 1000 + pickup.s) % 1) > level.greed) continue
    return pickup
  }
  return null
}

// A car ahead lined up with this one's nose, near enough to hit
function shotAt (car, cars, level) {
  for (const other of cars) {
    const dx = other.x - car.x
    const dy = other.y - car.y
    const d = Math.hypot(dx, dy)
    if (d < 5 || d > 45) continue
    if (Math.abs(angleDiff(car.a, Math.atan2(dy, dx))) < level.aim) return other
  }
  return null
}
