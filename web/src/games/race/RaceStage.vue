<script setup>
import { ref, reactive, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { trackOf, gridSpot, locate, pointAt, angleDiff, ROAD } from './track.js'
import { STEP, newCar, stepCar, bump, spinOut, forwardSpeed, BOOST_TIME, TOP_SPEED } from './car.js'
import { progressOf, passGate, rankCars, formatTime, ordinal } from './race.js'
import { fireShell, newShell, stepShell, shellHits, touchesPickup, MAX_AMMO } from './items.js'
import { LEVELS, newBrain, botInput } from './bots.js'
import { poseAt } from './ghosts.js'
import { createRenderer, CAR_COLORS, PICKUP_COLORS, themeOf } from './renderer.js'
import * as fx from './effects.js'
import ArcadeStage from '../ascii/ArcadeStage.vue'
import FullscreenButton from '../ascii/FullscreenButton.vue'
import { useFullscreen } from '../ascii/fullscreen'
import { DIM, watchFonts } from '../ascii/paint'
import { startLoop } from '../ascii/loop'
import { stepParticles } from '../ascii/physics'
import { sound } from '../ascii/sound'
import { haptics } from '../ascii/haptics'

// The full-screen race: the track as big as the screen with a camera following this player's
// car, the minimap and the standings in the top right, place, lap and times in the top left.
// The car drives itself; the player steers: left and right (or A and D) on a keyboard, a
// steering wheel bottom left on a touch screen. Turning slows the car, so that's how a bend is
// taken. Space (or the button bottom right) fires a shell. A car stuck against a wall backs out
// by itself.
//
// This device drives its own car and decides when it passes a gate, drives through a pickup
// or is hit by a shell, and tells the room (see room.js). Its place goes out as live samples,
// shells as events. The host's device (or a solo race) also drives the bots (`drones`) the same
// way, their places riding along in its own samples. Everyone else's cars are drawn from their
// samples, a little in the past so they move smoothly (see ghosts.js).
//
// After the finish line a car drives on by itself, faded, and nothing can touch it.

const props = defineProps({
  t: { type: Object, required: true },
  title: { type: String, required: true },
  exitLabel: { type: String, required: true },
  round: { type: Number, required: true },
  track: { type: Number, required: true },
  laps: { type: Number, required: true },
  phase: { type: String, required: true }, // countdown | racing | ending
  startAt: { type: Number, default: 0 }, // Date.now() time of the green light
  endsAt: { type: Number, default: 0 }, // Date.now() time the race is called off, once the winner is home
  driver: { type: Boolean, default: false }, // false: just watching this race
  myId: { type: String, required: true },
  cars: { type: Object, required: true }, // id -> what the host knows (see room.js)
  names: { type: Object, required: true }, // id -> name
  live: { type: Object, required: true }, // { buffers: { id -> samples, see ghosts.js } }
  inbox: { type: Array, required: true }, // events from the others: { from, data }
  pickups: { type: Array, default: () => [] }, // the host's: [{ id, kind, up, s, d }]
  drones: { type: Array, default: () => [] }, // ids of the bots this device drives
  level: { type: String, default: 'normal' }, // how good those bots are
  record: { type: Number, default: 0 }, // this device's best lap on this track, ms
  winner: { type: String, default: '' } // once the race is over
})

const emit = defineEmits(['exit', 'sample', 'shot', 'hit', 'grab', 'gate'])

const SAMPLE_MS = 50
const GO_SECONDS = 0.9
const MAX_PARTICLES = 700
const SKID_LIFE = 7 // seconds a tyre mark takes to fade
const MAX_SKIDS = 900
const FEED_LIFE = 5 // seconds a line stays in the race feed
const FEED_MAX = 4
const NOTE_LIFE = 1.4
const FIRE_GAP = 0.35 // seconds between shots
const SPAN = 62 // units across the screen's short side, standing still
const SMALL_SPAN = 46 // the same on a phone, closer in, so the cars aren't too small
const PASS_HOLD = 0.8 // seconds a new order has to last before "passed" goes in the feed
const AUTOPILOT = { ...LEVELS.easy, fire: 0, greed: 0 }
const AUTOPILOT_POWER = 0.72 // how hard a car that's finished drives on
const WHEEL_LOCK = 90 // degrees the wheel turns for full lock
const WHEEL_MAX = 120 // and the most it turns at all
const FIRE_KEYS = new Set(['Space', 'Enter', 'KeyF', 'KeyX'])
const DRIVE_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'])

const area = ref(null)
const canvas = ref(null)
const ammo = ref(0) // for the fire button
const touchUi = ref(typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches)
const wheel = reactive({ on: false, turn: 0 }) // the touch wheel: held, and turned how many degrees

const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let renderer = null
let observer = null
let stopLoop = null
let stopFonts = null
let engine = null
let alpha = 0
let width = 0
let height = 0

let track = trackOf(props.track)
let me = null // this device's car, see newDriver
const drones = new Map() // id -> a bot car this device drives
const ghosts = new Map() // id -> another player's car, as drawn this frame
const shells = new Map()
const known = new Map() // id -> what the host last said about a car, to spot changes
const taken = new Map() // pickup id -> when a car drove through it on this screen
const appeared = new Map() // pickup id -> when it last came back, for its pop-up
const particles = []
const skids = [] // tyre marks: { x0, y0, x1, y1, t }
const notes = [] // words floating up off a car
const feed = [] // the race feed: { kind, a, b, place, at }
const cam = { x: 0, y: 0, span: SPAN }
let clock = 0 // seconds of simulation
let started = false
let lastCount = 0
let goTimer = 0
let shotSeq = 0
let sampleClock = 0
let sampleSeq = 0
let shake = 0
let flash = 0
let order = [] // the standings as they are now
let held = { order: [], since: 0 } // a new order waiting to last before it goes in the feed
let shown = [] // the order the feed last went by
let finishBanner = 0 // seconds left of "Finished" in the middle
let pickupsNow = [] // this frame's pickups, see readPickups
let testDrive = null // development builds: a bot level that drives this player's car, for play-testing
let skidSound = 0
const keys = new Set()

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const upper = (text) => text.toLocaleUpperCase(props.t.langCode.toLowerCase())
const round2 = (value) => Math.round(value * 100) / 100
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)
const racing = () => props.phase === 'racing' && Date.now() >= props.startAt
const raceMs = () => Math.max(0, Date.now() - props.startAt)
const colorOf = (id) => CAR_COLORS[(props.cars[id]?.color ?? 0) % CAR_COLORS.length]
const nameOf = (id) => props.names[id] || '?'

/**
 * A car driven here, this player's or a bot's: the car itself (car.js) and, beside it, how far
 * it has got (lap, next gate), its lap times in race ms, the shells it holds, whether it has
 * finished, a brain for driving itself, and what its effects need.
 */
function newDriver (id) {
  const info = props.cars[id]
  // The car carries what its effects need, as another player's car does
  const car = Object.assign(newCar(track, gridSpot(track, info?.slot ?? 0)), { rear: null, smokeAt: 0, sprayAt: 0 })
  return {
    id,
    car,
    prevX: car.x,
    prevY: car.y,
    prevA: car.a,
    lap: 0,
    next: 0,
    lapStart: null,
    last: null,
    best: null,
    ammo: 0,
    done: false,
    brain: newBrain(),
    lastShot: -Infinity,
    shieldGone: false,
    flash: 0,
    wrong: 0,
    stuck: 0,
    backing: 0,
    backSteer: 1
  }
}

function newRace () {
  track = trackOf(props.track)
  renderer?.setTrack(track)
  me = props.driver && props.cars[props.myId] ? newDriver(props.myId) : null
  drones.clear()
  const power = (LEVELS[props.level] || LEVELS.normal).power
  for (const id of props.drones) if (props.cars[id]) drones.set(id, newDriver(id))
  for (const drone of drones.values()) drone.car.power = power
  ghosts.clear()
  shells.clear()
  known.clear()
  taken.clear()
  appeared.clear()
  particles.length = 0
  skids.length = 0
  notes.length = 0
  feed.length = 0
  order = []
  shown = []
  held = { order: [], since: 0 }
  started = false
  lastCount = 0
  goTimer = shake = flash = finishBanner = 0
  sampleClock = SAMPLE_MS
  ammo.value = 0
  const focus = me?.car || [...drones.values()][0]?.car || gridSpot(track, 0)
  cam.x = focus.x
  cam.y = focus.y
  cam.span = baseSpan()
}

// ---------- Input ----------

// Steering only: the gas is always down. The touch wheel steers as far as it's turned; keys
// steer to full lock.
function controls () {
  const left = keys.has('ArrowLeft') || keys.has('KeyA')
  const right = keys.has('ArrowRight') || keys.has('KeyD')
  const steer = wheel.on ? wheel.turn / WHEEL_LOCK : (right ? 1 : 0) - (left ? 1 : 0)
  return { gas: true, brake: false, steer: Math.max(-1, Math.min(1, steer)) }
}

// A car up against a wall, going nowhere, backs out for a moment, turning its nose away
function unstick (driver, input) {
  const car = driver.car
  if (driver.backing > 0) {
    driver.backing -= STEP
    return { gas: false, brake: true, steer: driver.backSteer }
  }
  driver.stuck = Math.abs(forwardSpeed(car)) < 2.5 && car.spin <= 0 ? driver.stuck + STEP : 0
  if (driver.stuck > 1) {
    driver.stuck = 0
    driver.backing = 0.8
    driver.backSteer = car.d > 0 ? 1 : -1
  }
  return input
}

function onKeyDown (event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (FIRE_KEYS.has(event.code)) {
    // A focused button keeps Space and Enter for itself
    if ((event.code === 'Space' || event.code === 'Enter') && event.target.closest?.('button, a, input')) return
    event.preventDefault()
    sound.unlock()
    if (!event.repeat) fire()
  } else if (DRIVE_KEYS.has(event.code)) {
    event.preventDefault()
    sound.unlock()
    keys.add(event.code)
  }
}

function onKeyUp (event) {
  keys.delete(event.code)
}

// The touch wheel turns with the thumb round its middle, as a real one would, and springs back
// to straight when let go
let wheelGrip = null // { id, cx, cy, last } while a thumb holds it

const angleAt = (grip, event) => (Math.atan2(event.clientY - grip.cy, event.clientX - grip.cx) * 180) / Math.PI

function wheelDown (event) {
  event.preventDefault()
  sound.unlock()
  touchUi.value = true
  if (wheelGrip) return
  try {
    event.currentTarget.setPointerCapture?.(event.pointerId)
  } catch {
    // A pointer the browser no longer knows: it just isn't captured
  }
  const rect = event.currentTarget.getBoundingClientRect()
  wheelGrip = { id: event.pointerId, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, last: 0 }
  wheelGrip.last = angleAt(wheelGrip, event)
  wheel.on = true
}

function wheelMove (event) {
  if (wheelGrip?.id !== event.pointerId) return
  // Too near the middle to tell which way it went
  if (Math.hypot(event.clientX - wheelGrip.cx, event.clientY - wheelGrip.cy) < 12) return
  const now = angleAt(wheelGrip, event)
  const turned = ((now - wheelGrip.last + 540) % 360) - 180
  wheelGrip.last = now
  wheel.turn = Math.max(-WHEEL_MAX, Math.min(WHEEL_MAX, wheel.turn + turned))
}

function wheelUp (event) {
  if (wheelGrip?.id !== event.pointerId) return
  wheelGrip = null
  wheel.on = false
  wheel.turn = 0
}

function fireDown (event) {
  event.preventDefault()
  sound.unlock()
  fire()
}

// Switching apps or windows lets go of everything
function releaseAll () {
  keys.clear()
  wheelGrip = null
  wheel.on = false
  wheel.turn = 0
}

const onVisibility = () => {
  if (document.hidden) releaseAll()
}

// Any touch on the screen brings out the buttons, for a laptop with a touch screen
const onTouch = () => {
  touchUi.value = true
}

// Every touch on the race belongs to the game: no pinch, double tap or drag moves the page
function guardTouch (event) {
  if (!event.cancelable || event.target.closest?.('button, a, header')) return
  event.preventDefault()
}

// ---------- Full screen ----------

// Phones that can are turned sideways for it
const { full, toggle: toggleFull } = useFullscreen(() => area.value?.closest('.arena'), { orientation: 'landscape' })

function onFullClick (event) {
  sound.unlock()
  toggleFull(event)
}

watch(full, () => nextTick(fit))

// ---------- Shells ----------

function addShell (shot, owner) {
  if (shells.has(shot.id)) return
  shells.set(shot.id, { id: shot.id, owner, ...newShell(shot, track), prevX: shot.x, prevY: shot.y, trail: [], trailClock: 0 })
}

function launch (driver, id) {
  driver.ammo--
  driver.lastShot = clock
  const shot = { id: `${props.round}.${id}.${++shotSeq}`, ...fireShell(driver.car) }
  addShell(shot, id)
  emit('shot', { k: 'shot', ...(id === props.myId ? {} : { o: id }), ...shot })
  sound.play('fire')
  if (!reduceMotion) fx.muzzle(particles, shot.x, shot.y, shot.vx / 70, shot.vy / 70, false, colorOf(id))
}

function fire () {
  if (!me || me.done || !racing() || me.ammo <= 0 || clock - me.lastShot < FIRE_GAP) return
  launch(me, props.myId)
  ammo.value = me.ammo
}

function readInbox () {
  while (props.inbox.length) {
    const { from, data } = props.inbox.shift()
    if (data.k === 'shot' && typeof data.id === 'string' && data.id.startsWith(`${props.round}.`) && [data.x, data.y, data.vx, data.vy].every(isNumber)) {
      if (shells.has(data.id)) continue
      // A bot's shot comes from the host's device, with the bot as its owner
      const owner = typeof data.o === 'string' && props.cars[data.o]?.bot ? data.o : from
      addShell(data, owner)
      sound.play('fire')
      if (!reduceMotion) fx.muzzle(particles, data.x, data.y, data.vx / 70, data.vy / 70, false, colorOf(owner))
    } else if (data.k === 'hit' && typeof data.sid === 'string') {
      const shell = shells.get(data.sid)
      shells.delete(data.sid)
      if (isNumber(data.x) && isNumber(data.y) && !data.b) struck(data.x, data.y, shell && colorOf(shell.owner))
    }
  }
}

// A shell striking a car: the bang and sparks in the shooter's color
function struck (x, y, color) {
  sound.play('hit')
  if (!reduceMotion) fx.impact(particles, x, y, color)
}

// A shell on a car driven here. A shield takes it if the host says there's one; otherwise the car
// spins out.
function hitDriver (id, driver, shell) {
  shells.delete(shell.id)
  const blocked = !!props.cars[id]?.shield && !driver.shieldGone
  emit('hit', { ...(id === props.myId ? {} : { target: id }), by: shell.owner, sid: shell.id, x: round2(shell.x), y: round2(shell.y), b: blocked ? 1 : 0 })
  if (blocked) {
    driver.shieldGone = true
    sound.play('shield')
    if (!reduceMotion) fx.shieldBreak(particles, driver.car.x, driver.car.y)
    return
  }
  const side = (shell.x - driver.car.x) * Math.sin(driver.car.a) - (shell.y - driver.car.y) * Math.cos(driver.car.a)
  spinOut(driver.car, side > 0 ? 1 : -1)
  struck(shell.x, shell.y, colorOf(shell.owner))
  driver.flash = 1
  if (!reduceMotion) fx.spinBurst(particles, driver.car.x, driver.car.y, colorOf(id))
  if (driver === me) {
    sound.play('spinout')
    haptics.buzz('hit')
    if (!reduceMotion) {
      shake = 9
      flash = 0.8
    }
  }
}

// ---------- What the host says ----------

function note (id, text, color) {
  notes.push({ text: upper(text), id, x: 0, y: 0, color, life: NOTE_LIFE, ttl: NOTE_LIFE })
}

function addFeed (line) {
  feed.push({ ...line, at: clock })
  if (feed.length > FEED_MAX) feed.shift()
}

const driverOf = (id) => (id === props.myId ? me : drones.get(id))
const bodyOf = (id) => driverOf(id)?.car || ghosts.get(id)

// Boosts, shields, shells, hits, finishers and leavers come from the host: show what changed
function watchCars () {
  for (const [id, info] of Object.entries(props.cars)) {
    const before = known.get(id)
    const after = { boosts: info.boosts || 0, shield: !!info.shield, shells: info.shells || 0, hits: info.hits || 0, place: info.place || 0, out: !!info.out }
    known.set(id, after)
    if (!before) continue
    const driver = driverOf(id)
    const body = bodyOf(id)
    if (after.boosts > before.boosts) {
      if (driver) driver.car.boost = BOOST_TIME * catchUp(id)
      note(id, `+${props.t.racePickBoost}`, PICKUP_COLORS.boost)
      if (driver === me) {
        sound.play('boost')
        haptics.buzz('combo')
      }
    }
    if (after.shield && !before.shield) {
      if (driver) driver.shieldGone = false
      note(id, `+${props.t.racePickShield}`, PICKUP_COLORS.shield)
      if (driver === me) sound.play('pickup')
    } else if (!after.shield && before.shield) {
      // Taken by a shell (shown already if it hit a car driven here) or worn off
      if (body && !driver?.shieldGone && !after.place) {
        sound.play('shield')
        if (!reduceMotion) fx.shieldBreak(particles, body.x, body.y)
      }
      if (driver) driver.shieldGone = false
    }
    if (after.shells > before.shells) {
      if (driver) driver.ammo = Math.min(MAX_AMMO, driver.ammo + after.shells - before.shells)
      note(id, `+${props.t.racePickShell}`, PICKUP_COLORS.shell)
      if (driver === me) {
        sound.play('pickup')
        ammo.value = me.ammo
      }
    }
    if (after.hits > before.hits) {
      const by = info.hitBy && info.hitBy !== id && props.cars[info.hitBy] ? info.hitBy : null
      if (by) addFeed({ kind: 'hit', a: by, b: id })
      if (by && by === props.myId) {
        sound.play('kill')
        haptics.buzz('combo')
      }
      // Someone else's car: the spin shows where it's drawn
      if (!driver && body && !reduceMotion) fx.spinBurst(particles, body.x, body.y, colorOf(id))
    }
    if (after.place && !before.place) {
      addFeed({ kind: 'finish', a: id, place: after.place })
      if (body && !reduceMotion) fx.confetti(particles, body.x, body.y, [colorOf(id), '#ffffff', '#ffd23f'])
      if (id === props.myId) {
        finishBanner = 3.2
        sound.play(after.place === 1 ? 'win' : 'lap')
        haptics.buzz(after.place === 1 ? 'win' : 'combo')
      }
    }
    if (after.out && !before.out) addFeed({ kind: 'left', a: id })
  }
}

// A boost lasts longer the further back its car is, to help the ones behind catch up
function catchUp (id) {
  const place = order.indexOf(id)
  return order.length > 1 && place > 0 ? 1 + (0.8 * place) / (order.length - 1) : 1
}

// The host's pickups as this frame sees them: one a car drove through here stays hidden while
// the host hands it out; if it's still there two seconds later nobody got it, and it shows again
function readPickups () {
  const list = []
  for (const state of props.pickups) {
    if (!state || !isNumber(state.s) || !isNumber(state.d)) continue
    const spot = { s: state.s, d: state.d, ...pointAt(track, state.s, state.d) }
    let up = !!state.up
    const grabbed = taken.get(state.id)
    if (grabbed !== undefined) {
      if (!up || clock - grabbed >= 2) taken.delete(state.id)
      else up = false
    }
    if (up && !appeared.has(state.id)) appeared.set(state.id, clock)
    if (!state.up) appeared.delete(state.id)
    list.push({ id: state.id, kind: state.kind, up, x: spot.x, y: spot.y, s: spot.s, d: spot.d, age: up ? clock - (appeared.get(state.id) ?? clock) + (started ? 0 : 1) : 0 })
  }
  return list
}

// ---------- Driving ----------

function startCheck () {
  const msLeft = props.startAt - Date.now()
  if (msLeft > 0) {
    const count = Math.ceil(msLeft / 1000)
    if (count !== lastCount && count <= 3) sound.play('tick')
    lastCount = count
  } else if (!started && props.phase !== 'ending') {
    started = true
    goTimer = GO_SECONDS
    sound.play('go')
  }
}

// How far a car driven here has got
const progressOfDriver = (driver) => progressOf(track, driver.lap, driver.next, driver.car.s)

// One step for a car driven here: the pedals and steering, the gates it passes, the pickups it
// drives through
function drive (id, driver, input, pickups) {
  driver.prevX = driver.car.x
  driver.prevY = driver.car.y
  driver.prevA = driver.car.a
  if (!started) return
  const before = driver.car.s
  stepCar(driver.car, input, track, STEP)
  if (driver.done || props.phase !== 'racing') return
  const pass = passGate(track, driver.lap, driver.next, before, driver.car.s)
  if (pass) {
    driver.lap = pass.lap
    driver.next = pass.next
    const t = raceMs()
    emit('gate', { g: pass.gate, t, ...(id === props.myId ? {} : { bot: id }) })
    if (pass.gate === 0) lapDone(id, driver, t)
  }
  for (const pickup of pickups) {
    if (!pickup.up || taken.has(pickup.id) || !touchesPickup(driver.car, pickup)) continue
    taken.set(pickup.id, clock)
    sound.play('gift')
    if (!reduceMotion) fx.giftBurst(particles, pickup.x, pickup.y, PICKUP_COLORS[pickup.kind])
    emit('grab', { pickup: pickup.id, ...(id === props.myId ? {} : { bot: id }) })
  }
}

// Over the start line again: a lap time, and the finish after the last lap
function lapDone (id, driver, t) {
  if (driver.lapStart !== null) {
    driver.last = t - driver.lapStart
    if (driver.best === null || driver.last < driver.best) driver.best = driver.last
    if (driver === me) {
      sound.play('lap')
      const record = props.record && driver.last < props.record
      note(id, record ? props.t.raceNewRecord : formatTime(driver.last), record ? '#ffd23f' : '#ffffff')
    }
  }
  driver.lapStart = t
  if (driver.lap > props.laps) {
    driver.done = true
    driver.car.power = AUTOPILOT_POWER
    driver.ammo = 0
    if (driver === me) ammo.value = 0
  }
}

// Bumps between cars, each pair once. Two cars driven here share the knock; another player's
// car only pushes this one away, since its own device moves it. Finished cars touch nothing.
function bumps () {
  const local = []
  if (me && !me.done) local.push(me)
  for (const drone of drones.values()) if (!drone.done) local.push(drone)
  for (let i = 0; i < local.length; i++) {
    for (let j = i + 1; j < local.length; j++) bump(local[i].car, local[j].car, 0.5)
    for (const ghost of ghosts.values()) {
      if (!ghost.done) bump(local[i].car, ghost, 1)
    }
  }
}

function tick () {
  clock += STEP
  const pickups = pickupsNow
  if (me) {
    const own = testDrive ? testInput(pickups) : controls()
    // Only a car that should be going can be stuck: not one waiting on the grid
    const input = me.done || props.phase === 'ending' ? autopilot(props.myId, me, pickups) : racing() ? unstick(me, own) : own
    drive(props.myId, me, racing() || props.phase === 'ending' ? input : { gas: false, brake: false, steer: 0 }, pickups)
  }
  driveDrones(pickups)
  bumps()
  for (const shell of shells.values()) {
    shell.prevX = shell.x
    shell.prevY = shell.y
    const result = stepShell(shell, track, STEP)
    if (result === 'gone') {
      shells.delete(shell.id)
      if (!reduceMotion) fx.fizzle(particles, shell.x, shell.y, colorOf(shell.owner))
      continue
    }
    if (result === 'bounce' && (shell.owner === props.myId || drones.has(shell.owner))) sound.play('bounce')
    shell.trailClock += STEP
    if (shell.trailClock >= 0.02) {
      shell.trailClock = 0
      shell.trail.push({ x: shell.x, y: shell.y })
      if (shell.trail.length > 7) shell.trail.shift()
    }
    if (props.phase !== 'racing') continue
    if (me && !me.done && shellHits(shell, me.car, shell.owner === props.myId)) {
      hitDriver(props.myId, me, shell)
      continue
    }
    let gone = false
    for (const [id, drone] of drones) {
      if (drone.done || !shellHits(shell, drone.car, shell.owner === id)) continue
      hitDriver(id, drone, shell)
      gone = true
      break
    }
    if (gone) continue
    // Into another player's car: it's theirs to say what that did
    for (const ghost of ghosts.values()) {
      if (ghost.done || ghost.owner === shell.owner || !shellHits(shell, ghost)) continue
      shells.delete(shell.id)
      if (!reduceMotion) fx.fizzle(particles, shell.x, shell.y, '#ffe9a8')
      break
    }
  }
}

// Development builds: this player's car driven like a bot, shells and all
function testInput (pickups) {
  const others = []
  for (const [other, body] of everyCar()) if (other !== props.myId && !body.done) others.push(body)
  const open = pickups.filter(p => p.up && !taken.has(p.id))
  const input = botInput(me.car, me.brain, { track, clock, dt: STEP, go: racing(), cars: others, pickups: open, ammo: me.ammo }, LEVELS[testDrive] || LEVELS.normal)
  if (input.fire) fire()
  return input
}

// A car driving itself: a bot, or this player's after the finish
function autopilot (id, driver, pickups) {
  const others = []
  for (const [other, body] of everyCar()) if (other !== id && !body.done) others.push(body)
  return botInput(driver.car, driver.brain, { track, clock, dt: STEP, go: started, cars: others, pickups: [], ammo: 0 }, AUTOPILOT)
}

function driveDrones (pickups) {
  if (!drones.size) return
  const skill = LEVELS[props.level] || LEVELS.normal
  const open = pickups.filter(p => p.up && !taken.has(p.id))
  for (const [id, drone] of drones) {
    let input
    if (drone.done || props.phase === 'ending') {
      input = autopilot(id, drone, pickups)
    } else {
      const others = []
      for (const [other, body] of everyCar()) if (other !== id && !body.done) others.push(body)
      input = botInput(drone.car, drone.brain, { track, clock, dt: STEP, go: racing(), cars: others, pickups: open, ammo: drone.ammo }, skill)
      if (input.fire && racing() && drone.ammo > 0 && clock - drone.lastShot >= FIRE_GAP) launch(drone, id)
    }
    drive(id, drone, input, pickups)
  }
}

// Every car on this screen, as [id, body] with the body's x, y, a, vx, vy, s and done
function * everyCar () {
  if (me) yield [props.myId, Object.assign(me.car, { done: me.done })]
  for (const [id, drone] of drones) yield [id, Object.assign(drone.car, { done: drone.done })]
  yield * ghosts
}

// Other players' cars, from their samples (see ghosts.js)
function updateGhosts () {
  const now = Date.now()
  for (const id in props.cars) {
    if (id === props.myId || drones.has(id)) continue
    const info = props.cars[id]
    const buffer = props.live.buffers?.[id]
    const pose = buffer && !info.out ? poseAt(buffer, now) : null
    if (!pose) {
      ghosts.delete(id)
      continue
    }
    const ghost = ghosts.get(id) || { owner: id, rear: null, smokeAt: 0, sprayAt: 0, hint: -1 }
    const flags = isNumber(pose.f) ? pose.f : 0
    Object.assign(ghost, {
      x: pose.x,
      y: pose.y,
      a: pose.a,
      vx: pose.vx || 0,
      vy: pose.vy || 0,
      steer: pose.st || 0,
      progress: isNumber(pose.p) ? pose.p : -Infinity,
      braking: !!(flags & 1),
      slide: !!(flags & 2),
      boost: flags & 4 ? 1 : 0,
      spin: flags & 8 ? 1 : 0,
      done: !!(flags & 16),
      off: !!(flags & 32)
    })
    // Where it is on the track, for the bots to see it coming
    const at = locate(track, ghost.x, ghost.y, ghost.hint)
    ghost.hint = at.i
    ghost.s = at.s
    ghosts.set(id, ghost)
  }
}

// ---------- Effects ----------

// Tyre marks behind a sliding or hard-braking car, smoke off its tyres, grit off the run-off,
// flame while it boosts
function carEffects (body, dt, sliding, braking, off) {
  const theme = themeOf(track)
  const fx0 = Math.cos(body.a)
  const fy0 = Math.sin(body.a)
  const rears = [[body.x - fx0 * 1.32 + fy0 * 1.1, body.y - fy0 * 1.32 - fx0 * 1.1], [body.x - fx0 * 1.32 - fy0 * 1.1, body.y - fy0 * 1.32 + fx0 * 1.1]]
  const speed = Math.hypot(body.vx, body.vy)
  // The wheels roll with the car
  body.roll = (body.roll || 0) + (body.vx * fx0 + body.vy * fy0) * dt
  const marking = (sliding || (braking && speed > 18)) && speed > 4
  if (marking && body.rear) {
    rears.forEach(([x, y], i) => {
      const [x0, y0] = body.rear[i]
      if (Math.hypot(x - x0, y - y0) > 0.15) skids.push({ x0, y0, x1: x, y1: y, t: clock })
    })
    if (skids.length > MAX_SKIDS) skids.splice(0, skids.length - MAX_SKIDS)
  }
  body.rear = marking ? rears : null
  if (reduceMotion) return
  body.smokeAt -= dt
  if (sliding && body.smokeAt <= 0) {
    body.smokeAt = 0.05
    for (const [x, y] of rears) fx.tyreSmoke(particles, x, y, body.skid || 8, theme.smoke)
  }
  body.sprayAt -= dt
  if (off && speed > 8 && body.sprayAt <= 0) {
    body.sprayAt = 0.04
    for (const [x, y] of rears) fx.spray(particles, x, y, body.a, speed, theme.spray)
  }
  if (body.boost > 0 && Math.random() < 0.6) fx.boostFlame(particles, body.x - fx0 * 2.4, body.y - fy0 * 2.4, body.a)
}

function effects (dt) {
  flash = Math.max(0, flash - dt * 3)
  shake = Math.max(0, shake - dt * 30)
  goTimer = Math.max(0, goTimer - dt)
  finishBanner = Math.max(0, finishBanner - dt)
  for (const driver of [me, ...drones.values()]) {
    if (!driver) continue
    const car = driver.car
    driver.flash = Math.max(0, driver.flash - dt * 3)
    carEffects(car, dt, car.slide && car.skid > 4, car.braking, Math.abs(car.d) > ROAD)
    if (car.bump > 4) {
      if (!reduceMotion) fx.scrape(particles, car.x, car.y, car.vx, car.vy, car.bump)
      if (driver === me) {
        sound.play('board', Math.min(1, car.bump / 25))
        if (car.bump > 12) {
          haptics.buzz('crash')
          if (!reduceMotion) shake = Math.max(shake, Math.min(8, car.bump * 0.3))
        }
      }
      car.bump = 0
    }
  }
  for (const ghost of ghosts.values()) carEffects(ghost, dt, ghost.slide, ghost.braking, ghost.off)
  stepParticles(particles, dt)
  if (particles.length > MAX_PARTICLES) particles.splice(0, particles.length - MAX_PARTICLES)
  for (let i = notes.length - 1; i >= 0; i--) {
    notes[i].life -= dt
    if (notes[i].life <= 0) notes.splice(i, 1)
  }
  while (skids.length && clock - skids[0].t > SKID_LIFE) skids.shift()
  while (feed.length && clock - feed[0].at > FEED_LIFE) feed.shift()
}

// The engine follows this player's car; a tyre squeals while it slides
function sounds (dt) {
  if (!me || !engine) return
  const speed = Math.abs(forwardSpeed(me.car))
  const input = controls()
  engine.set(Math.min(1.2, speed / TOP_SPEED + (me.car.boost > 0 ? 0.15 : 0)), input.gas && !me.done ? 1 : 0.2)
  skidSound -= dt
  if (me.car.slide && me.car.skid > 5 && skidSound <= 0) {
    skidSound = 0.12
    sound.play('skid', Math.min(1, me.car.skid / 18))
  }
}

// ---------- Standings ----------

function standingsNow () {
  const entries = []
  for (const [id, info] of Object.entries(props.cars)) {
    const driver = driverOf(id)
    const ghost = ghosts.get(id)
    const progress = driver ? progressOfDriver(driver) : ghost ? ghost.progress : -Infinity
    entries.push({ id, place: info.place || 0, progress, out: !!info.out })
  }
  return rankCars(entries)
}

// A new order goes in the feed as "X passed Y" once it has lasted a moment, so two cars side by
// side don't fill it with passes back and forth. Not in the first seconds, while everyone sorts
// themselves out off the grid.
function watchPasses () {
  const key = order.join()
  if (key !== held.order.join()) {
    held = { order: [...order], since: clock }
    return
  }
  if (clock - held.since < PASS_HOLD || key === shown.join()) return
  if (raceMs() > 4000 && props.phase === 'racing' && shown.length) {
    let lines = 0
    for (const [i, id] of order.entries()) {
      const was = shown.indexOf(id)
      if (was <= i || props.cars[id]?.place) continue
      // Everyone it went past
      for (const other of shown.slice(i, was)) {
        if (other === id || order.indexOf(other) < i || props.cars[other]?.place || props.cars[other]?.out) continue
        if (lines++ < 2) addFeed({ kind: 'pass', a: id, b: other })
      }
    }
  }
  shown = [...order]
}

// ---------- Drawing ----------

function focusBody () {
  if (me) return me.car
  // Watching: the leader
  for (const id of order) {
    const body = bodyOf(id)
    if (body) return body
  }
  return null
}

// How much of the track the camera takes in standing still: less on a small screen
const baseSpan = () => Math.max(SMALL_SPAN, Math.min(SPAN, Math.min(width, height) / 7.2))

function updateCamera (dt) {
  const body = focusBody()
  if (!body) return
  const speed = Math.hypot(body.vx || 0, body.vy || 0)
  const lead = Math.min(0.3, 14 / Math.max(speed, 1))
  const ease = 1 - Math.exp(-dt * 5)
  cam.x += (body.x + (body.vx || 0) * lead - cam.x) * ease
  cam.y += (body.y + (body.vy || 0) * lead - cam.y) * ease
  const span = baseSpan() * (1 + Math.min(1.3, speed / TOP_SPEED) * 0.22)
  cam.span += (span - cam.span) * (1 - Math.exp(-dt * 1.5))
}

function lineParts (line) {
  const template = { pass: props.t.raceFeedPass, hit: props.t.raceFeedHit, finish: props.t.raceFeedFinish, left: props.t.raceFeedLeft }[line.kind] || ''
  const parts = []
  for (const piece of template.split(/(\{\w+\})/)) {
    if (!piece) continue
    if (piece === '{a}') parts.push({ text: nameOf(line.a), color: colorOf(line.a) })
    else if (piece === '{b}') parts.push({ text: nameOf(line.b), color: colorOf(line.b) })
    else if (piece === '{place}') parts.push({ text: ordinal(props.t, line.place), color: '#ffffff' })
    else parts.push({ text: piece })
  }
  return parts
}

function banners (list) {
  const nowMs = Date.now()
  const banner = (text, y, size, style = {}) => list.push({ text: upper(text), y, size, ...style })
  if (nowMs < props.startAt) {
    banner(props.t.raceGetReady, 15, 5, { display: true })
    banner(String(Math.ceil((props.startAt - nowMs) / 1000)), 26, 13, { display: true })
    if (me && !touchUi.value) banner(props.t.raceKeys, 33, 1.3, { min: 12, color: DIM })
  }
  if (goTimer > 0) banner(props.t.raceGo, 24, 9, { display: true, alpha: Math.min(1, goTimer / 0.3) })
  if (props.phase === 'ending') {
    banner(props.winner ? fmt(props.t.raceWinner, { name: nameOf(props.winner) }) : props.t.raceOver, 22, 5, { display: true })
    return
  }
  if (finishBanner > 0 && me) {
    const place = props.cars[props.myId]?.place
    banner(place ? fmt(props.t.raceFinishedPlace, { place: ordinal(props.t, place) }) : props.t.raceFinished, 22, 5, { display: true, alpha: Math.min(1, finishBanner / 0.5) })
  }
  if (me && !me.done && me.wrong > 1.2 && Math.floor(clock * 3) % 2 === 0) banner(props.t.raceWrongWay, 30, 3.2, { display: true, color: '#ff5f5f' })
  if (props.endsAt && props.phase === 'racing' && (!me || !me.done)) {
    const seconds = Math.max(0, Math.ceil((props.endsAt - nowMs) / 1000))
    banner(fmt(props.t.raceClosing, { time: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` }), 6, 1.6, { min: 12, color: '#ffd23f' })
  }
  if (!me && nowMs >= props.startAt) banner(props.t.raceNextRace, 42, 2.4, { display: true })
}

function hudOf () {
  if (!me) return null
  const info = props.cars[props.myId] || {}
  const place = info.place || order.indexOf(props.myId) + 1
  const lines = []
  const now = raceMs()
  if (!me.done) lines.push({ text: `${props.t.raceTime} ${formatTime(me.lapStart === null ? (racing() ? now : 0) : now - me.lapStart)}`, color: '#ffffff' })
  if (me.last !== null) lines.push({ text: `${props.t.raceLast} ${formatTime(me.last)}` })
  const best = [me.best, props.record || null].filter(v => v !== null).reduce((a, b) => Math.min(a, b), Infinity)
  if (Number.isFinite(best)) lines.push({ text: `${props.t.raceBest} ${formatTime(best)}`, color: me.best !== null && me.best <= best ? '#ffd23f' : DIM })
  const items = []
  if (info.shield && !me.shieldGone) items.push('shield')
  for (let i = 0; i < me.ammo; i++) items.push('shell')
  return {
    place: place > 0 ? upper(ordinal(props.t, place)) : '',
    of: `/${Object.keys(props.cars).length}`,
    placeColor: info.place === 1 ? '#ffd23f' : undefined,
    lap: me.done ? upper(props.t.raceFinished) : fmt(props.t.raceLap, { lap: Math.min(props.laps, Math.max(1, me.lap)), laps: props.laps }),
    lines,
    items
  }
}

function render () {
  const lerp = (from, to) => from + (to - from) * alpha
  const blink = Math.floor(clock * 6) % 2 === 0
  const cars = []
  const map = { cars: [] }
  const add = (id, body, smooth, extra) => {
    const info = props.cars[id]
    const mine = id === props.myId
    const x = smooth ? lerp(extra.prevX, body.x) : body.x
    const y = smooth ? lerp(extra.prevY, body.y) : body.y
    const done = !!extra.done
    cars.push({
      x,
      y,
      a: smooth ? extra.prevA + angleDiff(extra.prevA, body.a) * alpha : body.a,
      color: colorOf(id),
      steer: body.steer || 0,
      roll: body.roll || 0,
      me: mine,
      braking: !!body.braking,
      boost: body.boost > 0,
      spin: body.spin > 0,
      flash: extra.flash || 0,
      shield: !!info?.shield && !extra.shieldGone && !done,
      alpha: done ? 0.45 : body.spin > 0 && blink ? 0.7 : 1,
      seed: (info?.color ?? 0) * 977 + 31,
      label: mine ? (Date.now() < props.startAt + 2500 ? upper(props.t.gameYou) : '') : nameOf(id)
    })
    map.cars.push({ x, y, color: colorOf(id), me: mine, alpha: done ? 0.5 : 1 })
  }
  for (const [id, ghost] of ghosts) add(id, ghost, false, ghost)
  for (const [id, drone] of drones) add(id, drone.car, true, drone)
  if (me) add(props.myId, me.car, true, me)
  // Words float up off the car they're about, following it
  for (const n of notes) {
    const body = bodyOf(n.id)
    if (body) {
      n.x = body.x
      n.y = body.y
    }
  }
  const shellList = []
  for (const shell of shells.values()) shellList.push({ x: lerp(shell.prevX, shell.x), y: lerp(shell.prevY, shell.y), color: colorOf(shell.owner), trail: shell.trail })
  const board = order.map((id, i) => ({ place: i + 1, name: nameOf(id), color: colorOf(id), me: id === props.myId, done: !!props.cars[id]?.place, out: !!props.cars[id]?.out }))
  const scene = {
    time: clock,
    camera: cam,
    shake,
    cars,
    shells: shellList,
    pickups: pickupsNow,
    skids,
    skidLife: SKID_LIFE,
    particles,
    notes,
    hud: hudOf(),
    board,
    map,
    feed: feed.map(line => ({ parts: lineParts(line), alpha: Math.min(1, (FEED_LIFE - (clock - line.at)) / 0.6) })),
    banners: [],
    flash
  }
  banners(scene.banners)
  renderer.draw(scene)
}

// ---------- Loop ----------

let passClock = 0

function before () {
  readInbox()
  watchCars()
  startCheck()
  updateGhosts()
  pickupsNow = readPickups()
}

function after (dt) {
  effects(dt)
  sounds(dt)
  sendSample(dt)
  updateCamera(dt)
  passClock += dt
  if (passClock >= 0.25) {
    passClock = 0
    order = standingsNow()
    watchPasses()
  }
  // Driving the wrong way round for a moment
  if (me && !me.done && racing()) {
    const k = me.car.hint
    const heading = Math.atan2(track.ty[k], track.tx[k])
    me.wrong = Math.abs(angleDiff(me.car.a, heading)) > 2 && forwardSpeed(me.car) > 4 ? me.wrong + dt : 0
  }
}

function pose (driver) {
  const car = driver.car
  const flags = (car.braking ? 1 : 0) | (car.slide && car.skid > 4 ? 2 : 0) | (car.boost > 0 ? 4 : 0) | (car.spin > 0 ? 8 : 0) | (driver.done ? 16 : 0) | (Math.abs(car.d) > ROAD ? 32 : 0)
  return {
    x: round2(car.x),
    y: round2(car.y),
    a: Math.round(car.a * 1000) / 1000,
    vx: round2(car.vx),
    vy: round2(car.vy),
    st: round2(car.steer),
    p: Math.round(progressOfDriver(driver) * 10) / 10,
    c: raceMs(),
    f: flags
  }
}

// This car's place, and the bots' as `b`, so everyone else can draw them
function sendSample (dt) {
  if (!me && !drones.size) return
  sampleClock += dt * 1000
  if (sampleClock < SAMPLE_MS) return
  sampleClock = 0
  let bots = null
  for (const [id, drone] of drones) {
    bots ||= {}
    bots[id] = pose(drone)
  }
  emit('sample', { r: props.round, ...(me ? pose(me) : {}), ...(bots ? { b: bots } : {}), q: ++sampleSeq })
}

// The canvas fills the play area
function fit () {
  const el = area.value
  if (!el || !renderer) return
  width = el.clientWidth
  height = el.clientHeight
  renderer.resize(width, height, Math.min(window.devicePixelRatio || 1, 2))
}

watch(() => props.round, newRace)

onMounted(() => {
  renderer = createRenderer(canvas.value)
  newRace()
  observer = new ResizeObserver(fit)
  observer.observe(area.value)
  fit()
  // The canvas draws its words in the page's fonts: make sure they're loaded
  stopFonts = watchFonts(() => {})
  engine = sound.engine()
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', releaseAll)
  window.addEventListener('touchstart', onTouch, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
  area.value.addEventListener('touchmove', guardTouch, { passive: false })
  stopLoop = startLoop({
    step: STEP,
    before,
    tick,
    after,
    draw: (value) => {
      alpha = value
      if (renderer) render()
    }
  })
  // Development builds expose the race, for scripted play-testing; `autopilot` drives this
  // player's car the way a bot would
  if (import.meta.env.DEV) {
    window.__race = {
      get me () { return me },
      get drones () { return drones },
      get ghosts () { return ghosts },
      get shells () { return shells },
      get order () { return order },
      get track () { return track },
      get props () { return props },
      get feed () { return feed },
      keys,
      drive (level) { testDrive = level || null }
    }
  }
})

onUnmounted(() => {
  stopLoop?.()
  observer?.disconnect()
  stopFonts?.()
  engine?.stop()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', releaseAll)
  window.removeEventListener('touchstart', onTouch)
  document.removeEventListener('visibilitychange', onVisibility)
  if (import.meta.env.DEV) delete window.__race
})
</script>

<template>
  <ArcadeStage :t="t" :title="title" :exitLabel="exitLabel" :bare="full" @exit="emit('exit')">
    <template #actions>
      <FullscreenButton :t="t" @toggle="onFullClick" />
    </template>

    <div ref="area" class="relative flex-1 min-h-0 overflow-hidden touch-none" @contextmenu.prevent>
      <canvas ref="canvas" class="block" role="img" :aria-label="title"></canvas>

      <!-- Touch controls: the steering wheel bottom left, fire bottom right -->
      <template v-if="touchUi && driver">
        <div
          :class="['wheel', { held: wheel.on }]"
          :aria-label="t.raceWheel"
          role="slider"
          :aria-valuenow="Math.round(wheel.turn)"
          @pointerdown="wheelDown"
          @pointermove="wheelMove"
          @pointerup="wheelUp"
          @pointercancel="wheelUp"
        >
          <svg viewBox="-50 -50 100 100" :style="{ transform: `rotate(${wheel.turn}deg)` }" aria-hidden="true">
            <circle class="rim" r="44" />
            <circle class="rim-in" r="36" />
            <path class="spoke" d="M -36 2 L -10 6 M 36 2 L 10 6 M 0 10 L 0 36" />
            <circle class="hub" r="10" />
            <rect class="mark" x="-3" y="-49" width="6" height="10" rx="1" />
          </svg>
        </div>
        <button
          v-if="ammo > 0"
          type="button"
          class="fire"
          :aria-label="t.raceFire"
          @pointerdown="fireDown"
        >
          <span aria-hidden="true">(*)</span>
          <span class="count">{{ ammo }}</span>
        </button>
      </template>

      <!-- Full screen: just the way out, in a corner -->
      <FullscreenButton v-if="full" :t="t" full class="absolute left-1/2 -translate-x-1/2 top-2 z-10 bg-black/70" @toggle="onFullClick" />
    </div>
  </ArcadeStage>
</template>

<style scoped>
.wheel {
  position: absolute;
  left: max(14px, env(safe-area-inset-left));
  bottom: max(14px, env(safe-area-inset-bottom));
  width: 150px;
  height: 150px;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.wheel svg {
  width: 100%;
  height: 100%;
  transition: transform 0.15s ease-out;
  filter: drop-shadow(0 0 6px rgb(0 255 0 / 0.35));
}

/* Held, it follows the thumb exactly; let go, it springs back */
.wheel.held svg {
  transition: none;
}

.rim {
  fill: none;
  stroke: var(--color-term);
  stroke-width: 7;
  opacity: 0.85;
}

.rim-in {
  fill: rgb(0 0 0 / 0.35);
  stroke: var(--color-term-dim);
  stroke-width: 1;
}

.spoke {
  fill: none;
  stroke: var(--color-term);
  stroke-width: 6;
  stroke-linecap: round;
  opacity: 0.8;
}

.hub {
  fill: rgb(0 40 0 / 0.9);
  stroke: var(--color-term);
  stroke-width: 2;
}

.mark {
  fill: #ffd23f;
}

.fire {
  position: absolute;
  right: max(16px, env(safe-area-inset-right));
  bottom: max(24px, env(safe-area-inset-bottom));
  width: 88px;
  height: 88px;
  border-radius: 9999px;
  border: 1px solid #ff5c5c;
  background: rgb(0 0 0 / 0.4);
  color: #ffb0b0;
  font-family: var(--font-display);
  font-size: 1.5rem;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.fire:active {
  background: rgb(255 80 80 / 0.25);
}

.fire .count {
  position: absolute;
  right: -2px;
  top: -2px;
  min-width: 22px;
  height: 22px;
  border-radius: 9999px;
  background: #ff5c5c;
  color: #000;
  font-family: var(--font-mono, monospace);
  font-size: 12px;
  font-weight: 700;
  line-height: 22px;
}
</style>
