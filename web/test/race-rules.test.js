// Neon Laps' race rules (src/games/race/race.js) and its room as the host's device runs it
// (src/games/race/room.js): laps only through every checkpoint in order, the order of the cars
// as they race and once they're home, pickups, shells and shields, and smooth drawing of other
// players' cars (src/games/race/ghosts.js).
//   npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { trackOf, GATES } from '../src/games/race/track.js'
import { progressOf, passGate, crossed, rankCars, finalOrder, formatTime } from '../src/games/race/race.js'
import { initialState, onAction, onTick, dropOut, closingTime, COUNTDOWN_MS, ENDING_MS } from '../src/games/race/room.js'
import { pickKind, RESPAWN_MS, SHIELD_MS, PICKUP_COUNT } from '../src/games/race/items.js'
import { newBuffer, addSample, poseAt, INTERP_MS } from '../src/games/race/ghosts.js'

const track = trackOf(0)
const L = track.length
const gate = (g) => track.gates[g]

// Drives a car's lap state from `from` to `to` round the lap in small steps, as a car would,
// passing every gate on the way
function drive (state, from, to) {
  for (let s = from; s < to; s += 1) {
    const pass = passGate(track, state.lap, state.next, ((s % L) + L) % L, (((s + 1) % L) + L) % L)
    if (pass) {
      state.lap = pass.lap
      state.next = pass.next
      state.gates.push(pass.gate)
    }
  }
  return state
}

test('a lap counts only through every gate in order', () => {
  // From the grid, over the start line: lap 1 begins
  const car = drive({ lap: 0, next: 0, gates: [] }, -10, 5)
  assert.deepEqual(car.gates, [0])
  assert.equal(car.lap, 1)
  assert.equal(car.next, 1)
  // Backing over the line and driving over it again doesn't count it twice
  assert.equal(passGate(track, car.lap, car.next, 2, L - 3), null)
  assert.equal(passGate(track, car.lap, car.next, L - 3, 3), null)
  // Round the lap: every gate in turn, then the line begins lap 2
  drive(car, 5, L + 5)
  assert.deepEqual(car.gates, [0, ...Array.from({ length: GATES - 1 }, (_, g) => g + 1), 0])
  assert.equal(car.lap, 2)
  // A gate out of turn is never passed, however it's crossed
  assert.equal(passGate(track, 2, 1, gate(5) - 2, gate(5) + 2), null)
  // Crossing backwards isn't crossing
  assert.equal(crossed(track, gate(3), gate(3) + 1, gate(3) - 1), false)
  assert.equal(crossed(track, gate(3), gate(3) - 1, gate(3) + 1), true)
})

test("how far a car has got doesn't jump at the start line", () => {
  // On the grid it's behind the start; just over the line it's just ahead
  assert.ok(progressOf(track, 0, 0, L - 10) < 0)
  assert.ok(Math.abs(progressOf(track, 0, 0, L - 10) + 10) < 1e-6)
  assert.ok(Math.abs(progressOf(track, 1, 1, 3) - 3) < 1e-6)
  // A car on lap 2 is a lap ahead of the same place on lap 1
  assert.ok(Math.abs(progressOf(track, 2, 4, gate(3) + 5) - progressOf(track, 1, 4, gate(3) + 5) - L) < 1e-6)
  // Just short of the line at the end of lap 1, with the line still to cross
  assert.ok(Math.abs(progressOf(track, 1, 0, L - 2) - (L - 2)) < 1e-6)
  // Reversed back over the line just after crossing it: just behind, not a lap ahead
  assert.ok(Math.abs(progressOf(track, 1, 1, L - 1) + 1) < 1e-6)
})

test('the order of the cars: finished first by place, then by progress, then those who left', () => {
  const order = rankCars([
    { id: 'slow', place: 0, progress: 300 },
    { id: 'gone', place: 0, progress: 900, out: true },
    { id: 'second', place: 2, progress: 4000 },
    { id: 'fast', place: 0, progress: 1200 },
    { id: 'first', place: 1, progress: 3900 }
  ])
  assert.deepEqual(order, ['first', 'second', 'fast', 'slow', 'gone'])
  // After the race: still racing ones by gates passed, then by who passed the last one first
  const final = finalOrder({
    a: { place: 2, time: 90000, passed: 37, gateAt: 90000, out: false },
    b: { place: 0, time: null, passed: 30, gateAt: 70000, out: false },
    c: { place: 1, time: 85000, passed: 37, gateAt: 85000, out: false },
    d: { place: 0, time: null, passed: 30, gateAt: 69000, out: false },
    e: { place: 0, time: null, passed: 35, gateAt: 80000, out: true }
  })
  assert.deepEqual(final, ['c', 'a', 'd', 'b', 'e'])
  assert.equal(formatTime(64370), '1:04.37')
  assert.equal(formatTime(5), '0:00.00')
})

// ---------- The room ----------

const player = (id) => ({ id, name: id.toUpperCase(), av: 0, online: true })

function makeRoom (ids, extra = {}) {
  return { game: 'race', phase: 'lobby', ready: true, hostId: ids[0], players: ids.map(player), sessionEnds: Date.now() + 3600000, ...initialState(), ...extra }
}

// Starts a race and lets the countdown run out; returns the host's clock at the green light
function startRace (s, now = 1_000_000) {
  onAction(s, s.hostId, { type: 'start' }, now)
  assert.equal(s.phase, 'countdown')
  onTick(s, now + COUNTDOWN_MS)
  assert.equal(s.phase, 'racing')
  return now + COUNTDOWN_MS
}

// A car going round: every gate of every lap, `lapMs` a lap, from `t0` (race ms)
function lapsFor (s, id, laps, lapMs, go, { bot = false, t0 = 500 } = {}) {
  let t = t0
  for (let lap = 0; lap <= laps; lap++) {
    for (let g = 0; g < GATES; g++) {
      if (lap === laps && g > 0) break
      onAction(s, bot ? s.hostId : id, { type: 'gate', g, t, ...(bot ? { bot: id } : {}) }, go + t)
      t += lapMs / GATES
    }
  }
  return t - lapMs / GATES
}

test('the host sets up the race: track, laps, bots and weapons, then the grid', () => {
  const s = makeRoom(['host', 'guest'])
  onAction(s, 'guest', { type: 'settings', laps: 5 })
  assert.equal(s.laps, 3, 'only the host sets things up')
  onAction(s, 'host', { type: 'settings', track: 1, laps: 5, level: 'hard', weapons: false })
  onAction(s, 'host', { type: 'settings', laps: 4, track: 9 })
  assert.deepEqual([s.track, s.laps, s.level, s.weapons], [1, 5, 'hard', false])
  for (let i = 0; i < 6; i++) onAction(s, 'host', { type: 'addBot' })
  assert.equal(s.bots.length, 4, 'six cars at most')
  startRace(s)
  assert.deepEqual(Object.keys(s.cars).sort(), ['bot1', 'bot2', 'bot3', 'bot4', 'guest', 'host'])
  // Every car has its own grid slot and color
  assert.deepEqual(Object.values(s.cars).map(c => c.slot).sort(), [0, 1, 2, 3, 4, 5])
  assert.deepEqual(Object.values(s.cars).map(c => c.color).sort(), [0, 1, 2, 3, 4, 5])
  // With weapons off, every pickup is a boost
  assert.equal(s.pickups.length, PICKUP_COUNT)
  assert.ok(s.pickups.every(p => p.kind === 'boost' && p.up))
  // Each somewhere along its own stretch of the lap
  const stretch = trackOf(1).length / PICKUP_COUNT
  assert.ok(s.pickups.every(p => p.s >= p.id * stretch && p.s <= (p.id + 1) * stretch && Math.abs(p.d) < 7))
})

test('laps, lap times and the finish: the winner first, then the race closes on everyone else', () => {
  const s = makeRoom(['a', 'b', 'c'])
  const go = startRace(s)
  // c laps slowly; a and b quicker, a quickest
  lapsFor(s, 'a', 3, 30000, go)
  assert.equal(s.cars.a.lap, 4)
  assert.equal(s.cars.a.place, 1)
  assert.equal(s.cars.a.best, 30000)
  assert.equal(s.cars.a.last, 30000)
  assert.equal(s.order[0], 'a')
  // The winner's time: three laps after the first crossing of the line
  assert.equal(s.cars.a.time, 500 + 3 * 30000)
  // Now the others have a while to finish
  const closesAt = go + s.cars.a.time + closingTime(s.cars.a.time)
  assert.equal(s.deadline, closesAt)
  lapsFor(s, 'b', 3, 31000, go)
  assert.equal(s.cars.b.place, 2)
  assert.equal(s.phase, 'racing', 'c is still out there')
  // c is a lap down when time's up
  lapsFor(s, 'c', 2, 40000, go)
  onTick(s, closesAt + 1)
  assert.equal(s.phase, 'ending')
  assert.deepEqual(s.standings.map(e => e.id), ['a', 'b', 'c'])
  assert.equal(s.standings[2].place, 0)
  onTick(s, closesAt + 1 + ENDING_MS)
  assert.equal(s.phase, 'results')
  // Next race, the winner starts at the back
  onAction(s, 'a', { type: 'start' }, closesAt + 10000)
  assert.equal(s.cars.a.slot, 2)
  assert.equal(s.cars.c.slot, 0)
})

test('a race ends as soon as everyone still in it is home', () => {
  const s = makeRoom(['a', 'b'])
  const go = startRace(s)
  lapsFor(s, 'a', 3, 30000, go)
  dropOut(s, 'b', go + 95000)
  assert.equal(s.phase, 'ending')
  assert.deepEqual(s.standings.map(e => [e.id, e.out]), [['a', false], ['b', true]])
})

test('gates come in turn, at believable times, from the car itself (or the host, for a bot)', () => {
  const s = makeRoom(['host', 'guest'])
  onAction(s, 'host', { type: 'addBot' })
  const go = startRace(s)
  onAction(s, 'guest', { type: 'gate', g: 1, t: 1000 }, go + 1000)
  assert.equal(s.cars.guest.passed, 0, 'gate 1 before gate 0')
  onAction(s, 'guest', { type: 'gate', g: 0, t: 500 }, go + 500)
  onAction(s, 'guest', { type: 'gate', g: 1, t: 520 }, go + 520)
  assert.equal(s.cars.guest.passed, 1, 'too soon after the last gate')
  // A time far off the host's clock is replaced by the host's
  onAction(s, 'guest', { type: 'gate', g: 1, t: 999999 }, go + 3000)
  assert.equal(s.cars.guest.gateAt, 3000)
  // Only the host speaks for a bot
  onAction(s, 'guest', { type: 'gate', g: 0, t: 600, bot: 'bot1' }, go + 600)
  assert.equal(s.cars.bot1.passed, 0)
  onAction(s, 'host', { type: 'gate', g: 0, t: 600, bot: 'bot1' }, go + 600)
  assert.equal(s.cars.bot1.passed, 1)
})

test('pickups: whoever gets there first, then back a few seconds later', () => {
  const s = makeRoom(['a', 'b'])
  const go = startRace(s)
  s.pickups[0].kind = 'boost'
  s.pickups[1].kind = 'shield'
  s.pickups[2].kind = 'shell'
  onAction(s, 'a', { type: 'grab', pickup: 0 }, go + 1000)
  onAction(s, 'b', { type: 'grab', pickup: 0 }, go + 1010)
  assert.equal(s.cars.a.boosts, 1)
  assert.equal(s.cars.b.boosts, 0, 'already gone')
  onAction(s, 'b', { type: 'grab', pickup: 1 }, go + 1000)
  onAction(s, 'b', { type: 'grab', pickup: 2 }, go + 1000)
  assert.equal(s.cars.b.shield, true)
  assert.equal(s.cars.b.shells, 1)
  assert.equal(s.pickups[0].up, false)
  onTick(s, go + 1000 + RESPAWN_MS - 1)
  assert.equal(s.pickups[0].up, false)
  const was = { s: s.pickups[0].s, d: s.pickups[0].d }
  onTick(s, go + 1000 + RESPAWN_MS)
  assert.equal(s.pickups[0].up, true)
  assert.notDeepEqual({ s: s.pickups[0].s, d: s.pickups[0].d }, was, 'back somewhere else')
  // A shield wears off if nothing hits it
  onTick(s, go + 1000 + SHIELD_MS)
  assert.equal(s.cars.b.shield, false)
  // Weapons off: pickups are only ever boosts
  assert.ok(Array.from({ length: 50 }, () => pickKind(false)).every(kind => kind === 'boost'))
  const kinds = new Set(Array.from({ length: 200 }, () => pickKind(true)))
  assert.deepEqual([...kinds].sort(), ['boost', 'shell', 'shield'])
})

test('a shell hit: a shield takes it, otherwise it counts, and not twice in a moment', () => {
  const s = makeRoom(['a', 'b'])
  const go = startRace(s)
  s.cars.b.shield = true
  onAction(s, 'b', { type: 'hit', by: 'a' }, go + 2000)
  assert.equal(s.cars.b.shield, false)
  assert.equal(s.cars.b.hits, 0)
  onAction(s, 'b', { type: 'hit', by: 'a' }, go + 2100)
  assert.equal(s.cars.b.hits, 0, 'too soon after the last')
  onAction(s, 'b', { type: 'hit', by: 'a' }, go + 4000)
  assert.equal(s.cars.b.hits, 1)
  assert.equal(s.cars.b.hitBy, 'a')
})

test("other players' cars glide between their samples, a moment in the past", () => {
  const buffer = newBuffer()
  // Samples every 50 ms of the sender's race clock, arriving 80 ms later
  for (let c = 0; c <= 500; c += 50) addSample(buffer, { c, x: c / 10, y: 0, a: 0, vx: 100, vy: 0 }, 10000 + c + 80)
  // A repeat changes nothing
  addSample(buffer, { c: 500, x: 999, y: 0 }, 10700)
  assert.equal(buffer.samples.filter(s => s.c === 500).length, 1)
  // Drawn INTERP_MS behind the newest: between two samples, eased
  const now = 10000 + 500 + 80
  const pose = poseAt(buffer, now)
  assert.ok(Math.abs(pose.x - (500 - INTERP_MS) / 10) < 1e-6, `x ${pose.x}`)
  const mid = poseAt(buffer, now - 25)
  assert.ok(Math.abs(mid.x - (475 - INTERP_MS) / 10) < 1e-6)
  // With nothing new it carries on along its velocity, but not for long
  const later = poseAt(buffer, now + INTERP_MS + 100)
  assert.ok(Math.abs(later.x - (50 + 100 * 0.1)) < 1e-6, `x ${later.x}`)
  const muchLater = poseAt(buffer, now + 5000)
  assert.ok(Math.abs(muchLater.x - (50 + 100 * 0.25)) < 1e-6)
  // Angles take the short way round
  const turn = newBuffer()
  addSample(turn, { c: 0, x: 0, y: 0, a: 6.2 }, 1000)
  addSample(turn, { c: 100, x: 0, y: 0, a: 0.1 }, 1100)
  const half = poseAt(turn, 1000 + 50 + INTERP_MS)
  assert.ok(Math.abs(Math.sin(half.a) - Math.sin((6.2 + 0.1 + 2 * Math.PI) / 2)) < 0.02, `a ${half.a}`)
})
