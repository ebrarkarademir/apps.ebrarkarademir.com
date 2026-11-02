import { trackOf, trackCount } from './track.js'
import { MAX_CARS, finalOrder } from './race.js'
import { pickKind, pickupSpot, PICKUP_COUNT, RESPAWN_MS, SHIELD_MS } from './items.js'

// Neon Laps in a room (see online/session.js), as the host's device runs it. A solo race runs
// the very same rules in a room of one (online/useLocalRoom.js).
//
// Every device drives its own car and decides when it passes a gate, picks something up or is
// hit by a shell, and tells the host. The host keeps the race: each car's laps and times, who
// has finished and in what order, which pickups are lying on the road, and who holds what. The
// host's device also drives the bots and tells the room the same things about them.
//
// Phases: 'lobby', 'countdown' (the cars on the grid, `deadline` the green light), 'racing'
// (`deadline` when the race is called off however far anyone has got: generous to begin with,
// and close once the winner is home), 'ending' (the result on the track for a moment) and
// 'results'.
//
// Times in the state that every device reads (lap times, when a gate was passed) are ms since
// the green light, as the device that drove the car measured them. A device's clock can be a
// little off the host's, so the host only checks they're about right. `goAt`, `back` and
// `shieldUntil` are on the host's own clock and mean nothing anywhere else.

export const LAP_CHOICES = [3, 5]
export const BOT_LEVELS = ['easy', 'normal', 'hard']
export const COUNTDOWN_MS = 3000
export const ENDING_MS = 3500 // the result shows on the track before the table
const LAP_ALLOWANCE_MS = 90000 // a race is called off this long per lap after the start, at most
const CLOCK_SLACK_MS = 4000 // how far a device's race time may stray from the host's
const HIT_GAP_MS = 900 // a car can't be hit again this soon after a hit
export const QUIET_MS = 8000 // a person whose car sends nothing this long has left the race
const MIN_GATE_MS = 400 // gates are far apart: no car passes two this close together

/** How long the others get after the winner, from the winner's time. */
export const closingTime = (winnerMs) => Math.min(60000, Math.max(20000, winnerMs * 0.35))

export const initialState = () => ({
  round: 0,
  track: 0,
  laps: 3,
  weapons: true,
  level: 'normal',
  bots: [],
  botSeq: 0,
  solo: false,
  deadline: null,
  goAt: 0,
  cars: {},
  order: [], // ids in the order they finished
  pickups: [], // [{ id, kind, up, back, s, d }], where on the track as track.pointAt takes it
  standings: [], // after a race: [{ id, place, time, best, out }]
  grid: [] // the last race's result, for the next race's grid
})

const between = (s) => s.phase === 'lobby' || s.phase === 'results'
const racing = (s) => s.phase === 'racing'
const people = (s) => s.players.filter(p => p.online)

// The host's race clock: ms since the green light
const raceTime = (s, now = Date.now()) => now - s.goAt

/** The cars that will race, people first, then bots, as many as there's room for. */
export const entrants = (s) => [...people(s).map(p => ({ id: p.id, bot: 0 })), ...s.bots.map(b => ({ id: b.id, bot: b.n }))].slice(0, MAX_CARS)

// The grid: the last race's winner starts at the back. Anyone new to the room starts at the front.
function gridOrder (s, ids) {
  const last = s.grid.filter(id => ids.includes(id))
  const fresh = ids.filter(id => !last.includes(id)).sort(() => Math.random() - 0.5)
  return [...fresh, ...last.reverse()]
}

function startRace (s, now) {
  const cars = entrants(s)
  if (!cars.length) return
  s.players = people(s)
  const order = gridOrder(s, cars.map(car => car.id))
  s.round++
  // Each car's color comes from its place in the list (people in the order they came, then
  // bots), so a player keeps the same one from race to race
  s.cars = Object.fromEntries(cars.map((car, i) => [car.id, {
    slot: order.indexOf(car.id),
    color: i,
    bot: car.bot,
    lap: 0,
    next: 0,
    passed: 0,
    gateAt: 0,
    lapAt: null,
    last: null,
    best: null,
    place: 0,
    time: null,
    boosts: 0,
    shield: false,
    shieldUntil: 0,
    shells: 0,
    hits: 0,
    hitBy: null,
    hitAt: 0,
    out: false
  }]))
  s.order = []
  s.standings = []
  const track = trackOf(s.track)
  s.pickups = Array.from({ length: PICKUP_COUNT }, (_, id) => ({ id, kind: pickKind(s.weapons), up: true, back: 0, ...pickupSpot(track, id) }))
  s.phase = 'countdown'
  s.deadline = now + COUNTDOWN_MS
  s.goAt = s.deadline
}

function endRace (s, now) {
  const order = finalOrder(s.cars)
  s.standings = order.map(id => {
    const car = s.cars[id]
    return { id, place: car.place, time: car.time, best: car.best, out: car.out && !car.place }
  })
  s.grid = order.filter(id => !s.cars[id].out)
  s.phase = 'ending'
  s.deadline = now + ENDING_MS
}

// Everyone still in the race is home: no need to wait for the clock
function checkDone (s, now) {
  if (!racing(s)) return
  if (Object.values(s.cars).every(car => car.place || car.out)) endRace(s, now)
}

// A car of this player's, or of a bot this host drives
function carFor (s, playerId, action) {
  if (typeof action.bot === 'string') return playerId === s.hostId && s.cars[action.bot]?.bot ? [action.bot, s.cars[action.bot]] : [null, null]
  return [playerId, s.cars[playerId] || null]
}

// A race time a device sent: kept if it's about right, otherwise the host's own
function timeFrom (s, value, now) {
  const own = raceTime(s, now)
  return Number.isFinite(value) && Math.abs(value - own) <= CLOCK_SLACK_MS ? Math.max(0, Math.round(value)) : own
}

function passGate (s, id, car, gate, at, now) {
  const track = trackOf(s.track)
  if (car.place || car.out || gate !== car.next) return
  if (car.passed && at - car.gateAt < MIN_GATE_MS) return
  car.next = (gate + 1) % track.gates.length
  car.passed++
  car.gateAt = at
  if (gate !== 0) return
  car.lap++
  if (car.lapAt !== null) {
    car.last = at - car.lapAt
    if (car.best === null || car.last < car.best) car.best = car.last
  }
  car.lapAt = at
  if (car.lap <= s.laps) return
  // Home
  s.order.push(id)
  car.place = s.order.length
  car.time = at
  car.shield = false
  if (car.place === 1) s.deadline = Math.min(s.deadline, now + closingTime(at))
  checkDone(s, now)
}

export function onAction (s, playerId, action, now = Date.now()) {
  const isHost = playerId === s.hostId
  switch (action.type) {
    case 'addBot':
      if (!isHost || !between(s) || people(s).length + s.bots.length >= MAX_CARS) return
      s.botSeq++
      s.bots.push({ id: `bot${s.botSeq}`, n: s.botSeq })
      break
    case 'removeBot':
      if (!isHost || !between(s)) return
      s.bots = s.bots.filter(b => b.id !== action.id)
      break
    case 'settings':
      if (!isHost || !between(s)) return
      if (Number.isInteger(action.track) && action.track >= 0 && action.track < trackCount()) s.track = action.track
      if (LAP_CHOICES.includes(action.laps)) s.laps = action.laps
      if (BOT_LEVELS.includes(action.level)) s.level = action.level
      if (typeof action.weapons === 'boolean') s.weapons = action.weapons
      break
    case 'start':
      if (!isHost || !between(s)) return
      startRace(s, now)
      break
    // A car over its next gate: { g, t } with t its race time then
    case 'gate': {
      if (!racing(s)) return
      const [id, car] = carFor(s, playerId, action)
      if (!car || !Number.isInteger(action.g)) return
      passGate(s, id, car, action.g, timeFrom(s, action.t, now), now)
      break
    }
    // A car through a pickup: it's the car's if it's still there
    case 'grab': {
      if (!racing(s)) return
      const [, car] = carFor(s, playerId, action)
      const pickup = s.pickups.find(p => p.id === action.pickup)
      if (!car || car.place || car.out || !pickup?.up) return
      pickup.up = false
      pickup.back = now + RESPAWN_MS
      if (pickup.kind === 'boost') {
        car.boosts++
      } else if (pickup.kind === 'shield') {
        car.shield = true
        car.shieldUntil = now + SHIELD_MS
      } else {
        car.shells++
      }
      break
    }
    // A shell hit a car: its shield takes it if it has one
    case 'hit': {
      if (!racing(s)) return
      const [, car] = carFor(s, playerId, action)
      if (!car || car.place || car.out || now - car.hitAt < HIT_GAP_MS) return
      car.hitAt = now
      if (car.shield) {
        car.shield = false
        return
      }
      car.hits++
      car.hitBy = typeof action.by === 'string' && s.cars[action.by] ? action.by : null
      break
    }
    case 'lobby':
      if (!isHost || s.phase !== 'results') return
      s.players = people(s)
      s.phase = 'lobby'
      break
  }
}

export function onTick (s, now = Date.now()) {
  if (s.phase === 'countdown' && now >= s.deadline) {
    s.phase = 'racing'
    s.goAt = s.deadline
    s.deadline = s.goAt + s.laps * LAP_ALLOWANCE_MS
  } else if (racing(s)) {
    if (now >= s.deadline) {
      endRace(s, now)
      return
    }
    for (const pickup of s.pickups) {
      if (pickup.up || now < pickup.back) continue
      Object.assign(pickup, { up: true, kind: pickKind(s.weapons) }, pickupSpot(trackOf(s.track), pickup.id))
    }
    for (const car of Object.values(s.cars)) {
      if (car.shield && now >= car.shieldUntil) car.shield = false
    }
  } else if (s.phase === 'ending' && now >= s.deadline) {
    s.phase = 'results'
    s.deadline = null
  }
}

/** A player gone from the room, or quiet too long: out of the race, if they were in it. */
export function dropOut (s, id, now = Date.now()) {
  const car = s.cars[id]
  if (!car || car.out || car.place || (s.phase !== 'countdown' && !racing(s))) return
  car.out = true
  car.shield = false
  checkDone(s, now)
}

export const onLeave = (s, player) => dropOut(s, player.id)
