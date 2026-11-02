import { wrapS } from './track.js'

// The rules of a race, as plain functions for the host's room and every screen: checkpoints,
// laps, how far each car has got, and the order they're in.
//
// A lap counts only through every checkpoint (gate) in order. A car starts behind the start
// line with `lap` 0 and gate 0, the start line, next. Crossing it puts the car on lap 1 and the
// next gate becomes 1, then 2, and so on round; crossing the start line again after the last
// one begins lap 2. So a car that reverses over the line and back doesn't count a lap twice,
// and one can't skip a part of the track: the walls keep every car on the road, and the gates
// must come in turn. The race is over for a car when it crosses the line with `lap` past the
// number of laps.

export const MAX_CARS = 6

/**
 * How far a car has got in the race, in units: how far round the lap it is, plus a whole lap's
 * length for every lap behind it. The gates it has passed say which lap a place belongs to, so
 * a car just over the line isn't taken for one just short of it. Negative on the grid.
 */
export function progressOf (track, lap, next, s) {
  const gates = track.gates
  const prev = (next + gates.length - 1) % gates.length
  return (lap - 1) * track.length + gates[prev] + wrapS(s - gates[prev], track.length)
}

/** Whether a car going from `before` to `after` round the lap drove forward over the line at `gate`. */
export function crossed (track, gate, before, after) {
  const from = wrapS(before - gate, track.length)
  const to = wrapS(after - gate, track.length)
  return from < 0 && to >= 0 && to - from < track.length / 4
}

/**
 * A car moving on from `before` to `after` round the lap: whether that takes it over its next
 * gate, and where that leaves it. Returns null if not, or { gate, lap, next } with the gate it
 * passed and its new lap and next gate.
 */
export function passGate (track, lap, next, before, after) {
  if (!crossed(track, track.gates[next], before, after)) return null
  const gate = next
  return { gate, lap: gate === 0 ? lap + 1 : lap, next: (next + 1) % track.gates.length }
}

/**
 * The order of the cars right now, first to last: cars that have finished by the order they
 * finished in, then the others by how far they've got, then any that left the race.
 * cars: [{ id, place (0 until finished), progress, out }]. Returns the ids.
 */
export function rankCars (cars) {
  return [...cars]
    .sort((a, b) =>
      Number(!!a.out) - Number(!!b.out) ||
      (a.place || Infinity) - (b.place || Infinity) ||
      b.progress - a.progress)
    .map(car => car.id)
}

/**
 * The final order once the race is over, from what the host knows of every car: those that
 * finished by when, then the ones still going by how many gates they had passed and how early
 * they passed the last, then the ones that left.
 * cars: { id -> { place, time, passed, gateAt, out } }. Returns the ids.
 */
export function finalOrder (cars) {
  return Object.entries(cars)
    .sort(([, a], [, b]) =>
      Number(!!a.out && !a.place) - Number(!!b.out && !b.place) ||
      (a.place || Infinity) - (b.place || Infinity) ||
      b.passed - a.passed ||
      a.gateAt - b.gateAt)
    .map(([id]) => id)
}

/** A time in ms as m:ss.cc, e.g. 1:04.37. */
export function formatTime (ms) {
  if (!Number.isFinite(ms) || ms < 0) return '-:--.--'
  const hundredths = Math.floor(ms / 10)
  const minutes = Math.floor(hundredths / 6000)
  const seconds = Math.floor(hundredths / 100) % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(hundredths % 100).padStart(2, '0')}`
}

/** 1 -> "1st" and so on, in the words of `t` (the page's translations). */
export function ordinal (t, n) {
  const key = n === 1 ? 'raceFirst' : n === 2 ? 'raceSecond' : n === 3 ? 'raceThird' : 'raceNth'
  return (t[key] || '{n}.').replace('{n}', n)
}
