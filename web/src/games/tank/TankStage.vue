<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import {
  W, H, STEP, ARMOR, TANK_SPEED, FIRE_COOLDOWN, MAX_SHELLS, INVULNERABLE, SLOW,
  POWER_DAMAGE, SPEED_TIME, SPEED_BOOST, POWER_SHOTS, POWER_MAX, REPAIR_TIME, REPAIR_BOOST, PAD_WAIT, GIFT_LIFE,
  mapOf, spawnTank, moveTank, fireShell, shellSpeed, stepShell, touches, touchesGift, padAt,
  aimPath, tankAt, turnRate, wrapAngle, angleDiff
} from './engine'
import { createRenderer, TANK_COLORS, GIFT_COLORS } from './renderer'
import * as fx from './effects'
import { LEVELS, newBrain, botHeld } from './bots'
import ArcadeStage from '../ascii/ArcadeStage.vue'
import FullscreenButton from '../ascii/FullscreenButton.vue'
import { useFullscreen } from '../ascii/fullscreen'
import { DIM, watchFonts } from '../ascii/paint'
import { startLoop } from '../ascii/loop'
import { stepParticles } from '../ascii/physics'
import { sound } from '../ascii/sound'
import { haptics } from '../ascii/haptics'

// The full-screen battle: the arena, twice as wide as it is high, as large as the screen allows
// (standing on end on a phone held upright), with a bar under it for the clock and what this
// tank has picked up. The full-screen switch leaves nothing but the arena, turned sideways on a
// phone. The whole screen is one button: holding it (or Space) drives the tank forward and fires
// on the press; letting go stops it and it turns on the spot.
//
// A tank shows its own damage, so there are no hearts to count: scorched after one hit,
// battered after two, burning and slow after three, and the fourth destroys it. Gifts the host
// drops in the open go to whoever shoots them, and a tank that waits on a teleporter for three
// seconds jumps to another. Every tank has its own color, the same on every screen, and so do
// its shells; a short list in the corner says who destroyed whom.
//
// This device moves its own tank and decides when a shell hits it. Positions go out as live
// samples, shots and hits as events, and the host keeps the armor, the gifts and who has
// picked up what. The host's device (or a solo game) also drives the bot tanks (`drones`) the
// same way: their positions ride along in its own samples, and it decides when they're hit.

const props = defineProps({
  t: { type: Object, required: true },
  title: { type: String, required: true },
  exitLabel: { type: String, required: true },
  round: { type: Number, required: true },
  map: { type: Number, required: true },
  phase: { type: String, required: true }, // countdown | playing | ending
  startAt: { type: Number, default: 0 }, // Date.now() time the fight starts
  endsAt: { type: Number, default: 0 }, // Date.now() time the round runs out, once it's on
  fighter: { type: Boolean, default: false }, // false: just watching this round
  myId: { type: String, required: true },
  tanks: { type: Object, required: true }, // id -> { slot, hp, alive, hits, shield, speed, power }
  names: { type: Object, required: true }, // id -> name
  live: { type: Object, required: true }, // { samples: { id -> sample }, at }
  inbox: { type: Array, required: true }, // events from the others: { from, data }
  gifts: { type: Array, default: () => [] }, // waiting to be shot: { id, kind, x, y, at (ms into the fight) }
  outcome: { type: Object, default: null }, // { reason, winner } once the round is decided
  drones: { type: Array, default: () => [] }, // ids of the bot tanks this device drives
  level: { type: String, default: 'normal' } // how good those bots are
})

const emit = defineEmits(['exit', 'sample', 'shot', 'hit', 'grab'])

const SAMPLE_MS = 50
const FIGHT_SECONDS = 0.9
const INFO = 40 // the bar under the arena
const GAP = 8
const BUTTON_KEYS = new Set(['Space', 'Enter', 'ArrowUp', 'KeyW'])
const MAX_PARTICLES = 700
const TRACK_GAP = 0.6 // units driven between tread marks
const TRACK_LIFE = 9 // seconds a tread mark takes to fade
const MAX_TRACKS = 480
const WRECK_FIRE = 7 // seconds a wreck burns, then it smoulders
const GIFT_NAMES = { shield: 'tankGiftShield', speed: 'tankGiftSpeed', power: 'tankGiftPower', repair: 'tankGiftRepair' }
const FEED_LIFE = 4.5 // seconds a line stays in the list of who destroyed whom
const FEED_MAX = 4
const POP_LIFE = 1.8 // seconds "You destroyed ..." shows
const DESTROYED_LIFE = 3 // seconds "Destroyed" shows, then it clears the way to watch the rest
const YOU_SECONDS = 2 // YOU shows over your tank until this long into the fight

const area = ref(null)
const canvas = ref(null)
const box = reactive({ w: 0, h: 0 })
const held = ref(false)
const now = ref(Date.now()) // for the clock in the bar; updated once a second at most
const hud = reactive({ shield: false, speed: 0, power: 0 }) // what this tank has picked up

const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let renderer = null
let observer = null
let stopLoop = null
let stopFonts = null
let alpha = 0
let turn = false // the arena stands on end
let others = [] // the other tanks still in the fight, for this frame's steps

let level = mapOf(0)
let walls = level.walls
let me = null // this device's own tank, see newBody
let clock = 0 // seconds of simulation
let started = false
let lastCount = 0
let safeUntil = 0
let lastShot = -Infinity
let shotSeq = 0
let sampleClock = 0
let sampleSeq = 0
let fightTimer = 0
let flash = 0
let shake = 0
const shells = new Map()
const ghosts = new Map() // id -> another player's tank, eased toward their samples
const drones = new Map() // id -> a bot tank this device drives: a body plus { brain, held, safeUntil, lastShot }
const known = new Map() // id -> what the host last said about it, to spot changes
const particles = []
const notes = [] // words floating up off a tank: { text, id, x, y, color, life, ttl }
const tracks = [] // tread marks: { x, y, a, t }
const taken = new Map() // gift id -> when a shell popped it on this screen
const seenGifts = new Set()
const feed = [] // who destroyed whom: { killer, victim, at }
let pop = null // this player's last kill, for a moment: { text, color, at }
let gifts = [] // this frame's gifts still to be shot: { id, kind, x, y, age, left }
const pointers = new Set()
let keyDown = false

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const upper = (text) => text.toLocaleUpperCase(props.t.langCode.toLowerCase())
const round2 = (value) => Math.round(value * 100) / 100
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)
const fighting = () => Date.now() >= props.startAt && props.phase !== 'ending'

const armorOf = (id) => props.tanks[id]?.hp ?? ARMOR
const damageOf = (id) => Math.max(0, Math.min(3, ARMOR - armorOf(id)))
const colorOf = (id) => {
  const info = props.tanks[id]
  return TANK_COLORS[(info?.color ?? info?.slot ?? 0) % TANK_COLORS.length]
}
const bodyOf = (id) => (id === props.myId ? me : drones.get(id) || ghosts.get(id))
const shielded = (id, body) => !!props.tanks[id]?.shield && !body.shieldGone

const clockText = computed(() => {
  if (!props.endsAt) return '-:--'
  const seconds = Math.max(0, Math.ceil((props.endsAt - now.value) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
})
const lastSeconds = computed(() => props.endsAt && props.endsAt - now.value < 10500 && props.phase === 'playing')

/**
 * A tank as this screen keeps it: where it is and was (prev*, for smooth drawing), and
 *   own        driven here (this player's tank or a bot), not eased toward samples
 *   pace       how fast it drives, from its damage and any speed gift
 *   recoil, flash  the barrel's kick from a shot and the white flash of a hit, fading to 0
 *   treadL/R   how far each tread has rolled; trackAt the travel at its last tread mark
 *   portPad, portTime, portLock  the teleporter it's on, how long it's waited there, and the
 *              one it arrived on (no going back until it has driven off)
 *   tp         teleports so far, so the others can show them
 *   speedLeft, boostLeft, powerLeft  seconds of speed (from a speed gift, and the little bit
 *              from a repair) and power shots left (own tanks); fast, power the same as last
 *              heard (other players' tanks)
 */
function newBody (slot, alive, own) {
  const tank = spawnTank(props.map, slot)
  return {
    ...tank,
    prevX: tank.x,
    prevY: tank.y,
    prevA: tank.a,
    alive,
    own,
    recoil: 0,
    flash: 0,
    hurtUntil: 0,
    treadL: 0,
    treadR: 0,
    trackAt: 0,
    portPad: -1,
    portTime: 0,
    portLock: -1,
    tp: 0,
    speedLeft: 0,
    boostLeft: 0,
    powerLeft: 0,
    fast: false,
    power: 0,
    smokeAt: 0,
    diedAt: 0,
    shieldGone: false
  }
}

function newRound () {
  level = mapOf(props.map)
  walls = level.walls
  renderer?.newRound(props.map)
  const mine = props.tanks[props.myId]
  me = props.fighter && mine ? newBody(mine.slot, mine.alive, true) : null
  shells.clear()
  ghosts.clear()
  drones.clear()
  for (const id of props.drones) {
    const info = props.tanks[id]
    if (!info) continue
    drones.set(id, Object.assign(newBody(info.slot, info.alive, true), { safeUntil: 0, lastShot: -Infinity, held: false, brain: newBrain() }))
  }
  known.clear()
  taken.clear()
  seenGifts.clear()
  feed.length = 0
  pop = null
  particles.length = 0
  notes.length = 0
  tracks.length = 0
  gifts = []
  started = false
  lastCount = 0
  safeUntil = 0
  lastShot = -Infinity
  fightTimer = flash = shake = 0
  sampleClock = SAMPLE_MS
  Object.assign(hud, { shield: false, speed: 0, power: 0 })
}

// ---------- Input: one button ----------

// Every press fires, drives, and flips which way the tank turns once it's let go
function setHeld (down) {
  if (down === held.value) return
  held.value = down
  if (!down) return
  if (me?.alive && props.phase !== 'ending') me.spin = -me.spin
  fire()
}

const syncHeld = () => setHeld(pointers.size > 0 || keyDown)

function onPointerDown (event) {
  if (event.button > 0 || event.target.closest('button, a, header')) return
  event.preventDefault()
  sound.unlock()
  pointers.add(event.pointerId)
  event.currentTarget.setPointerCapture?.(event.pointerId)
  syncHeld()
}

function onPointerUp (event) {
  sound.unlock()
  pointers.delete(event.pointerId)
  syncHeld()
}

function onKeyDown (event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (BUTTON_KEYS.has(event.code)) {
    // A focused button keeps Space and Enter for itself
    if ((event.code === 'Space' || event.code === 'Enter') && event.target.closest?.('button, a, input')) return
    event.preventDefault()
    if (event.repeat) return
    sound.unlock()
    keyDown = true
    syncHeld()
  }
}

function onKeyUp (event) {
  if (!BUTTON_KEYS.has(event.code)) return
  keyDown = false
  syncHeld()
}

// Switching apps or windows lets go of the button
function releaseAll () {
  pointers.clear()
  keyDown = false
  syncHeld()
}

const onVisibility = () => {
  if (document.hidden) releaseAll()
}

// ---------- Full screen ----------

// Phones that can are turned sideways for it, so the arena fills the screen
const { full, toggle: toggleFull } = useFullscreen(() => area.value?.closest('.arena'), { orientation: 'landscape' })

function onFullClick (event) {
  sound.unlock()
  toggleFull(event)
}

watch(full, () => nextTick(fit))

// ---------- Shells ----------

function addShell (shot, owner) {
  if (shells.has(shot.id)) return
  const power = shot.p === 1
  shells.set(shot.id, { id: shot.id, owner, power, speed: shellSpeed(power), x: shot.x, y: shot.y, prevX: shot.x, prevY: shot.y, dx: shot.dx, dy: shot.dy, age: 0, bounces: 0, trail: [], trailClock: 0 })
}

function canFire (owner, last) {
  if (clock - last < FIRE_COOLDOWN) return false
  let inAir = 0
  for (const shell of shells.values()) if (shell.owner === owner) inAir++
  return inAir < MAX_SHELLS
}

// A shot leaving a barrel: the bang, the barrel's kick and the muzzle flash
function fired (body, shot, color) {
  sound.play(shot.p === 1 ? 'heavy' : 'fire')
  if (body) body.recoil = 1
  if (!reduceMotion) fx.muzzle(particles, shot.x, shot.y, shot.dx, shot.dy, shot.p === 1, color)
}

// A tank driven here fires, a power shot while it has any
function shoot (id, body) {
  const power = body.powerLeft > 0
  if (power) body.powerLeft--
  const shot = { id: `${props.round}.${id}.${++shotSeq}`, ...fireShell(body, walls), ...(power ? { p: 1 } : {}) }
  addShell(shot, id)
  emit('shot', { k: 'shot', ...(id === props.myId ? {} : { o: id }), ...shot })
  fired(body, shot, colorOf(id))
}

function fire () {
  if (!me?.alive || !fighting() || !canFire(props.myId, lastShot)) return
  lastShot = clock
  shoot(props.myId, me)
}

// A bot's press: the same limits as anyone's
function droneFire (id, drone) {
  if (!canFire(id, drone.lastShot)) return
  drone.lastShot = clock
  shoot(id, drone)
}

function readInbox () {
  while (props.inbox.length) {
    const { from, data } = props.inbox.shift()
    if (data.k === 'shot' && typeof data.id === 'string' && data.id.startsWith(`${props.round}.`) &&
        [data.x, data.y, data.dx, data.dy].every(isNumber)) {
      if (shells.has(data.id)) continue
      // A bot's shot comes from the host's device, with the bot as its owner
      const owner = typeof data.o === 'string' && props.tanks[data.o]?.bot ? data.o : from
      addShell(data, owner)
      fired(bodyOf(owner), data, colorOf(owner))
    } else if (data.k === 'hit' && typeof data.sid === 'string') {
      const shell = shells.get(data.sid)
      shells.delete(data.sid)
      // A shield that took the hit shows when the host says it's gone
      if (isNumber(data.x) && isNumber(data.y) && !data.b) struck(data.x, data.y, shell && colorOf(shell.owner))
    }
  }
}

// ---------- Hits, gifts and wrecks ----------

// A shell striking a tank: the bang, sparks in the shooter's color, and a scorch mark left on
// the ground
function struck (x, y, color) {
  sound.play('hit')
  if (!reduceMotion) fx.impact(particles, x, y, color)
  renderer?.scorch(x, y, 1.5)
}

function breakShield (body) {
  body.shieldGone = true
  sound.play('shield')
  if (!reduceMotion) fx.shieldBreak(particles, body.x, body.y)
}

function gotHit (shell) {
  safeUntil = clock + INVULNERABLE
  const blocked = shielded(props.myId, me)
  emit('hit', { by: shell.owner, sid: shell.id, x: round2(shell.x), y: round2(shell.y), dmg: shell.power ? POWER_DAMAGE : 1, b: blocked ? 1 : 0 })
  if (blocked) {
    breakShield(me)
    haptics.buzz('tap')
    return
  }
  struck(shell.x, shell.y, colorOf(shell.owner))
  me.flash = 1
  haptics.buzz('hit')
  if (!reduceMotion) {
    flash = 1
    shake = shell.power ? 1.4 : 1
  }
}

function gotGift (id, body, kind) {
  notes.push({ text: `+${upper(props.t[GIFT_NAMES[kind]])}`, id, x: body.x, y: body.y, color: GIFT_COLORS[kind], life: 1.5, ttl: 1.5 })
  if (body === me) {
    sound.play(kind === 'repair' ? 'heal' : 'pickup')
    haptics.buzz('combo')
  }
}

// Someone destroyed: a line in the list, and a moment of glory if this player did it. With no
// one to blame, the tank left the fight.
function announce (victim, killer) {
  const by = typeof killer === 'string' && killer !== victim && props.tanks[killer] ? killer : null
  feed.push({ killer: by, victim, at: clock })
  if (feed.length > FEED_MAX) feed.shift()
  if (by && by === props.myId) {
    pop = { text: fmt(props.t.tankYouKilled, { name: props.names[victim] || '?' }), color: colorOf(by), at: clock }
    sound.play('kill')
    haptics.buzz('combo')
  }
}

// Armor, gifts and wrecks come from the host: show what changed
function watchTanks () {
  for (const [id, info] of Object.entries(props.tanks)) {
    const before = known.get(id)
    const after = { hp: info.hp, alive: info.alive, shield: !!info.shield, speed: info.speed || 0, power: info.power || 0, repair: info.repair || 0 }
    known.set(id, after)
    if (!before) continue
    if (before.alive && !after.alive) announce(id, info.by)
    const body = bodyOf(id)
    if (!body) continue
    if (after.hp < before.hp && body !== me) {
      body.hurtUntil = clock + INVULNERABLE
      body.flash = 1
    }
    if (after.shield && !before.shield) {
      body.shieldGone = false
      gotGift(id, body, 'shield')
    } else if (!after.shield && before.shield) {
      if (!body.shieldGone && body.alive) breakShield(body)
      body.shieldGone = false
    }
    if (after.speed > before.speed) {
      if (body.own) body.speedLeft = SPEED_TIME
      gotGift(id, body, 'speed')
    }
    if (after.power > before.power) {
      if (body.own) body.powerLeft = Math.min(POWER_MAX, body.powerLeft + POWER_SHOTS * (after.power - before.power))
      gotGift(id, body, 'power')
    }
    // A repair: the host has already mended a hit; the tank glows green and gets a little speed
    if (after.repair > before.repair) {
      if (body.own) body.boostLeft = REPAIR_TIME
      gotGift(id, body, 'repair')
      body.flash = 1
      if (!reduceMotion && body.alive) fx.heal(particles, body.x, body.y)
    }
    if (before.alive && !after.alive && body.alive) explode(id, body)
  }
}

function explode (id, body) {
  const mine = body === me
  body.alive = false
  body.diedAt = clock
  if (!reduceMotion) fx.explosion(particles, body.x, body.y, colorOf(id))
  renderer?.scorch(body.x, body.y, 3.6, true)
  sound.play('boom')
  if (mine) haptics.buzz('boom')
  if (!reduceMotion) {
    shake = Math.max(shake, mine ? 1.5 : 0.5)
    flash = Math.max(flash, mine ? 1 : 0.25)
  }
}

// The host's gifts as this frame sees them. One a shell popped here stays hidden while the host
// hands it out; if it's still there two seconds later nobody got it, and it shows again.
function readGifts () {
  const elapsed = props.startAt ? (Date.now() - props.startAt) / 1000 : null
  const present = new Set()
  const list = []
  for (const gift of props.gifts) {
    if (!gift || !isNumber(gift.id) || !isNumber(gift.x) || !isNumber(gift.y)) continue
    present.add(gift.id)
    const poppedAt = taken.get(gift.id)
    if (poppedAt !== undefined) {
      if (clock - poppedAt < 2) continue
      taken.delete(gift.id)
    }
    const age = elapsed === null ? 1 : Math.max(0, elapsed - (gift.at || 0) / 1000)
    if (!seenGifts.has(gift.id)) {
      seenGifts.add(gift.id)
      if (age < 1) {
        sound.play('spawn')
        if (!reduceMotion) fx.giftArrive(particles, gift.x, gift.y, GIFT_COLORS[gift.kind])
      }
    }
    list.push({ id: gift.id, kind: gift.kind, x: gift.x, y: gift.y, age, left: elapsed === null ? GIFT_LIFE : GIFT_LIFE - age })
  }
  for (const id of taken.keys()) if (!present.has(id)) taken.delete(id)
  gifts = list
}

// A shell that runs into a gift pops it, and whoever fired it asks the host for it
function popGift (shell) {
  for (const gift of gifts) {
    if (taken.has(gift.id) || !touchesGift(shell, gift)) continue
    shells.delete(shell.id)
    taken.set(gift.id, clock)
    sound.play('gift')
    if (!reduceMotion) fx.giftBurst(particles, gift.x, gift.y, GIFT_COLORS[gift.kind])
    if (shell.owner === props.myId) emit('grab', { gift: gift.id })
    else if (drones.has(shell.owner)) emit('grab', { gift: gift.id, bot: shell.owner })
    return true
  }
  return false
}

// ---------- Effects ----------

function addTrack (body) {
  tracks.push({ x: body.x, y: body.y, a: body.a, t: clock })
  if (tracks.length > MAX_TRACKS) tracks.shift()
}

// The treads roll as the tank drives (and the other way round as it turns), leaving marks
function roll (body, dt) {
  if (body.moving) {
    const step = TANK_SPEED * body.pace * dt
    body.treadL += step
    body.treadR += step
    if (body.travel - body.trackAt > TRACK_GAP) {
      body.trackAt = body.travel
      addTrack(body)
    }
  } else {
    const step = turnRate(body.pace) * body.spin * dt * 1.3
    body.treadL += step
    body.treadR -= step
  }
}

function * everyBody () {
  if (me) yield [props.myId, me]
  yield * drones
  yield * ghosts
}

function effects (dt) {
  flash = Math.max(0, flash - dt * 4)
  shake = Math.max(0, shake - dt * 3)
  fightTimer = Math.max(0, fightTimer - dt)
  for (const [id, body] of everyBody()) {
    body.recoil = Math.max(0, body.recoil - dt * 6)
    body.flash = Math.max(0, body.flash - dt * 3)
    if (reduceMotion) continue
    body.smokeAt -= dt
    if (body.smokeAt > 0) continue
    if (!body.alive) {
      // A wreck burns, then smoulders
      const burning = clock - body.diedAt < WRECK_FIRE
      fx.smokePuff(particles, body.x, body.y, { dark: true, size: burning ? 1.2 : 0.9 })
      if (burning && Math.random() < 0.7) fx.ember(particles, body.x, body.y)
      body.smokeAt = burning ? 0.12 : 0.5
      continue
    }
    // Battered tanks smoke; one on its last legs smokes black and throws embers
    const damage = damageOf(id)
    if (damage < 2) continue
    fx.smokePuff(particles, body.x, body.y, { dark: damage >= 3 })
    if (damage >= 3 && Math.random() < 0.6) fx.ember(particles, body.x, body.y)
    body.smokeAt = damage >= 3 ? 0.1 : 0.3
  }
  stepParticles(particles, dt)
  if (particles.length > MAX_PARTICLES) particles.splice(0, particles.length - MAX_PARTICLES)
  for (let i = notes.length - 1; i >= 0; i--) {
    notes[i].life -= dt
    if (notes[i].life <= 0) notes.splice(i, 1)
  }
  while (tracks.length && clock - tracks[0].t > TRACK_LIFE) tracks.shift()
  while (feed.length && clock - feed[0].at > FEED_LIFE) feed.shift()
}

// ---------- Teleporters ----------

// Waiting on a teleporter charges it; after PAD_WAIT seconds the tank jumps to another one,
// a free one if there is one, and must drive off that one before it can go again
function stepPort (body, mine) {
  const pad = padAt(level, body.x, body.y)
  if (pad !== body.portLock) body.portLock = -1
  if (pad < 0 || pad === body.portLock) {
    body.portPad = pad
    body.portTime = 0
    return
  }
  if (pad !== body.portPad) {
    body.portPad = pad
    body.portTime = 0
  }
  const before = body.portTime
  body.portTime += STEP
  if (!reduceMotion && Math.random() < 0.25) fx.charge(particles, level.pads[pad].x, level.pads[pad].y)
  if (mine && Math.floor(body.portTime) > Math.floor(before) && body.portTime < PAD_WAIT) sound.play('tick')
  if (body.portTime >= PAD_WAIT) teleport(body, pad, mine)
}

function teleport (body, from, mine) {
  const pads = level.pads
  const occupied = (pad) => {
    for (const [, other] of everyBody()) {
      if (other !== body && other.alive && Math.hypot(other.x - pad.x, other.y - pad.y) < 4.5) return true
    }
    return false
  }
  const choices = pads.map((_, i) => i).filter(i => i !== from)
  const free = choices.filter(i => !occupied(pads[i]))
  const pool = free.length ? free : choices
  const to = pool[Math.floor(Math.random() * pool.length)]
  if (to === undefined) return
  if (!reduceMotion) fx.warp(particles, body.x, body.y)
  body.x = body.prevX = pads[to].x
  body.y = body.prevY = pads[to].y
  body.portLock = to
  body.portPad = to
  body.portTime = 0
  body.tp++
  if (!reduceMotion) fx.warp(particles, body.x, body.y)
  sound.play('warp')
  if (mine) {
    haptics.buzz('tap')
    if (!reduceMotion) flash = Math.max(flash, 0.5)
  }
}

// ---------- Simulation ----------

function startCheck () {
  const msLeft = props.startAt - Date.now()
  if (msLeft > 0) {
    const count = Math.ceil(msLeft / 1000)
    if (count !== lastCount && count <= 3) sound.play('tick')
    lastCount = count
  } else if (!started && props.phase !== 'ending') {
    started = true
    fightTimer = FIGHT_SECONDS
    sound.play('go')
    // Someone already holding the button takes off now, shot included
    if (held.value) fire()
  }
}

// One step for a tank driven here: its pace, the drive or turn, the treads, the teleporters
function steer (id, body, near) {
  body.speedLeft = Math.max(0, body.speedLeft - STEP)
  body.boostLeft = Math.max(0, body.boostLeft - STEP)
  const boost = body.speedLeft > 0 ? SPEED_BOOST : body.boostLeft > 0 ? REPAIR_BOOST : 1
  body.pace = (armorOf(id) <= 1 ? SLOW : 1) * boost
  moveTank(body, walls, near, STEP)
  roll(body, STEP)
  if (fighting()) stepPort(body, body === me)
}

function tick () {
  clock += STEP
  if (me) {
    me.prevX = me.x
    me.prevY = me.y
    me.prevA = me.a
    if (me.alive && props.phase !== 'ending') {
      me.moving = fighting() && held.value
      steer(props.myId, me, others)
    }
  }
  driveDrones()
  for (const shell of shells.values()) {
    shell.prevX = shell.x
    shell.prevY = shell.y
    const result = stepShell(shell, walls, STEP)
    if (result === 'gone') {
      shells.delete(shell.id)
      if (!reduceMotion) fx.fizzle(particles, shell.x, shell.y, shell.power ? GIFT_COLORS.power : colorOf(shell.owner))
      continue
    }
    if (result === 'bounce' && shell.owner === props.myId) sound.play('bounce')
    if (shell.power && !reduceMotion && Math.random() < 0.3) fx.trail(particles, shell.x, shell.y, colorOf(shell.owner))
    shell.trailClock += STEP
    if (shell.trailClock >= 0.02) {
      shell.trailClock = 0
      shell.trail.push({ x: shell.x, y: shell.y })
      if (shell.trail.length > 7) shell.trail.shift()
    }
    if (me?.alive && shell.owner !== props.myId && clock >= safeUntil && touches(shell, me)) {
      shells.delete(shell.id)
      gotHit(shell)
      continue
    }
    if (hitDrone(shell) || hitGhost(shell)) continue
    popGift(shell)
  }
}

// A bot tank this device drives: its hits are decided here
function hitDrone (shell) {
  for (const [id, drone] of drones) {
    if (!drone.alive || id === shell.owner || clock < drone.safeUntil || !touches(shell, drone)) continue
    shells.delete(shell.id)
    drone.safeUntil = clock + INVULNERABLE
    const blocked = shielded(id, drone)
    emit('hit', { target: id, by: shell.owner, sid: shell.id, x: round2(shell.x), y: round2(shell.y), dmg: shell.power ? POWER_DAMAGE : 1, b: blocked ? 1 : 0 })
    if (blocked) {
      breakShield(drone)
    } else {
      struck(shell.x, shell.y, colorOf(shell.owner))
      drone.flash = 1
    }
    return true
  }
  return false
}

// Shells vanish into other players' tanks right away; what that does is up to their owner
function hitGhost (shell) {
  for (const [id, ghost] of ghosts) {
    if (!ghost.alive || id === shell.owner || !touches(shell, ghost)) continue
    shells.delete(shell.id)
    if (!reduceMotion) fx.fizzle(particles, shell.x, shell.y, '#ffe9a8')
    return true
  }
  return false
}

// The bots: each decides whether its button is down, then drives like anyone
function driveDrones () {
  if (!drones.size) return
  const skill = LEVELS[props.level] || LEVELS.normal
  const active = fighting()
  const bodies = []
  if (me?.alive) bodies.push({ id: props.myId, tank: me })
  for (const [id, ghost] of ghosts) if (ghost.alive) bodies.push({ id, tank: ghost })
  for (const [id, drone] of drones) if (drone.alive) bodies.push({ id, tank: drone })
  const flying = [...shells.values()]
  const open = gifts.filter(gift => !taken.has(gift.id))
  for (const [id, drone] of drones) {
    drone.prevX = drone.x
    drone.prevY = drone.y
    drone.prevA = drone.a
    if (!drone.alive || props.phase === 'ending') continue
    const near = bodies.filter(b => b.id !== id).map(b => b.tank)
    let down = false
    if (active) {
      const seen = flying.map(s => ({ x: s.x, y: s.y, dx: s.dx, dy: s.dy, mine: s.owner === id }))
      const wanted = armorOf(id) < ARMOR ? open : open.filter(gift => gift.kind !== 'repair')
      down = botHeld(drone, drone.brain, { clock, walls, targets: near, shells: seen, gifts: wanted }, skill)
    }
    if (down !== drone.held) {
      drone.held = down
      if (down) {
        drone.spin = -drone.spin
        droneFire(id, drone)
      }
    }
    drone.moving = active && drone.held
    steer(id, drone, near)
  }
}

// Other players' tanks, eased toward where their last sample says they are now
function updateGhosts (dt) {
  const samples = props.live.samples || {}
  const age = (Date.now() - (props.live.at || 0)) / 1000
  const ease = 1 - Math.exp(-dt * 18)
  for (const id in props.tanks) {
    if (id === props.myId || drones.has(id)) continue
    const info = props.tanks[id]
    let ghost = ghosts.get(id)
    if (!ghost) {
      ghost = newBody(info.slot, info.alive, false)
      ghosts.set(id, ghost)
    }
    if (!ghost.alive || props.phase === 'ending') continue
    const sample = samples[id]
    if (!sample || sample.r !== props.round || !isNumber(sample.x)) {
      ghost.a = wrapAngle(ghost.a + turnRate(ghost.pace) * ghost.spin * dt)
      continue
    }
    const estimate = tankAt(sample, age, walls)
    const tp = isNumber(sample.t) ? sample.t : 0
    if (tp !== ghost.tp) {
      // It went through a teleporter: a flash where it left and where it lands
      if (!reduceMotion) {
        fx.warp(particles, ghost.x, ghost.y)
        fx.warp(particles, estimate.x, estimate.y)
      }
      sound.play('warp')
      ghost.tp = tp
      ghost.x = estimate.x
      ghost.y = estimate.y
      ghost.portLock = padAt(level, ghost.x, ghost.y)
      ghost.portTime = 0
    } else if (Math.hypot(estimate.x - ghost.x, estimate.y - ghost.y) > 6) {
      ghost.x = estimate.x
      ghost.y = estimate.y
    } else {
      ghost.x += (estimate.x - ghost.x) * ease
      ghost.y += (estimate.y - ghost.y) * ease
    }
    ghost.a = wrapAngle(ghost.a + angleDiff(ghost.a, estimate.a) * ease)
    ghost.moving = estimate.moving
    ghost.spin = estimate.spin
    ghost.pace = estimate.pace
    ghost.fast = sample.f === 1
    ghost.power = isNumber(sample.w) ? Math.max(0, Math.min(POWER_MAX, Math.round(sample.w))) : 0
    if (ghost.moving) ghost.travel += TANK_SPEED * ghost.pace * dt
    roll(ghost, dt)
    // A guess at how far its teleporter has charged, for the ring round it
    const pad = padAt(level, ghost.x, ghost.y)
    if (pad !== ghost.portLock) ghost.portLock = -1
    if (pad >= 0 && pad !== ghost.portLock && !ghost.moving) {
      if (pad !== ghost.portPad) ghost.portTime = 0
      ghost.portTime = Math.min(PAD_WAIT, ghost.portTime + dt)
      if (!reduceMotion && Math.random() < dt * 30) fx.charge(particles, level.pads[pad].x, level.pads[pad].y)
    } else {
      ghost.portTime = 0
    }
    ghost.portPad = pad
  }
}

function pose (tank) {
  const p = { x: round2(tank.x), y: round2(tank.y), a: Math.round(tank.a * 1000) / 1000, m: tank.moving ? 1 : 0, s: tank.spin }
  if (Math.abs(tank.pace - 1) > 0.01) p.v = round2(tank.pace)
  if (tank.speedLeft > 0 || tank.boostLeft > 0) p.f = 1
  if (tank.powerLeft > 0) p.w = tank.powerLeft
  if (tank.tp) p.t = tank.tp
  return p
}

// This tank's place, and the bots' as `b`, so everyone else can draw them
function sendSample (dt) {
  let bots = null
  for (const [id, drone] of drones) {
    if (!drone.alive) continue
    bots ||= {}
    bots[id] = pose(drone)
  }
  if (!me?.alive && !bots) return
  sampleClock += dt * 1000
  if (sampleClock < SAMPLE_MS) return
  sampleClock = 0
  emit('sample', { r: props.round, ...(me?.alive ? pose(me) : {}), ...(bots ? { b: bots } : {}), q: ++sampleSeq })
}

// ---------- Drawing ----------

function banners (list) {
  const nowMs = Date.now()
  const banner = (text, y, size, style = {}) => list.push({ text: upper(text), y, size, ...style })
  if (nowMs < props.startAt) {
    banner(props.t.tankGetReady, 15, 5, { display: true })
    banner(String(Math.ceil((props.startAt - nowMs) / 1000)), 26, 13, { display: true })
    if (props.fighter) banner(props.t.tankHold, 33, 1.3, { min: 12, color: DIM })
  }
  if (fightTimer > 0) {
    banner(props.t.tankFight, 24, 9, { display: true, alpha: Math.min(1, fightTimer / 0.3) })
  }
  // Small, above the middle, gone in a moment: it shouldn't get in the way of the next fight
  if (pop && clock - pop.at < POP_LIFE) {
    const age = clock - pop.at
    banner(pop.text, 17, 2.3 * (age < 0.15 ? 1.3 - age * 2 : 1), { display: true, color: pop.color, alpha: Math.min(1, (POP_LIFE - age) / 0.5), min: 14 })
  }
  if (props.phase === 'ending' && props.outcome) {
    const { reason, winner } = props.outcome
    if (reason === 'time') banner(props.t.tankTimeUp, 17.5, 1.4, { min: 13 })
    banner(winner ? fmt(props.t.tankWinner, { name: props.names[winner] || '?' }) : props.t.tankDraw, 22, 5, { display: true })
    return
  }
  if (me && !me.alive) {
    const age = clock - me.diedAt
    if (age < DESTROYED_LIFE) {
      const alpha = Math.min(1, (DESTROYED_LIFE - age) / 0.5)
      banner(props.t.tankDestroyed, 21, 5, { display: true, alpha })
      banner(props.t.tankWatching, 25, 1.15, { min: 12, color: DIM, alpha })
    }
  } else if (!me && nowMs >= props.startAt) {
    banner(props.t.tankNextRound, 42, 2.6, { display: true })
  }
}

function render () {
  const lerp = (from, to) => from + (to - from) * alpha
  const blinking = Math.floor(clock * 12) % 2 === 0
  const scene = {
    time: clock,
    tanks: [],
    shells: [],
    gifts: gifts.filter(gift => !taken.has(gift.id)),
    charges: level.pads.map(() => 0),
    aim: null,
    tracks,
    trackLife: TRACK_LIFE,
    particles,
    notes: [],
    banners: [],
    feed: [],
    clock: full.value ? { text: clockText.value, blink: lastSeconds.value } : null,
    flash,
    shake
  }
  const add = (id, body, smooth) => {
    const info = props.tanks[id]
    const mine = body === me
    const safe = mine ? clock < safeUntil : body.hurtUntil > clock
    const tank = {
      x: smooth ? lerp(body.prevX, body.x) : body.x,
      y: smooth ? lerp(body.prevY, body.y) : body.y,
      a: smooth ? body.prevA + angleDiff(body.prevA, body.a) * alpha : body.a,
      color: colorOf(id),
      me: mine,
      alive: body.alive,
      damage: damageOf(id),
      seed: (info?.slot ?? 0) * 977 + 31,
      treadL: body.treadL,
      treadR: body.treadR,
      recoil: body.recoil,
      flash: body.flash,
      alpha: safe && blinking ? 0.45 : 1,
      shield: body.alive && shielded(id, body),
      fast: body.own ? body.speedLeft > 0 || body.boostLeft > 0 : body.fast,
      moving: body.moving,
      power: body.own ? body.powerLeft : body.power,
      diedAge: body.alive ? 0 : clock - body.diedAt,
      label: !body.alive ? '' : mine ? (Date.now() < props.startAt + YOU_SECONDS * 1000 ? upper(props.t.gameYou) : '') : props.names[id] || '?'
    }
    scene.tanks.push(tank)
    if (body.alive && body.portPad >= 0 && body.portTime > 0) {
      scene.charges[body.portPad] = Math.max(scene.charges[body.portPad], body.portTime / PAD_WAIT)
    }
    return tank
  }
  for (const [id, ghost] of ghosts) add(id, ghost, false)
  for (const [id, drone] of drones) add(id, drone, true)
  if (me) {
    const tank = add(props.myId, me, true)
    if (me.alive && props.phase !== 'ending') scene.aim = { points: aimPath(tank, walls, held.value ? 10 : 30), color: tank.color, power: me.powerLeft > 0 }
  }
  for (const shell of shells.values()) {
    scene.shells.push({ x: lerp(shell.prevX, shell.x), y: lerp(shell.prevY, shell.y), color: colorOf(shell.owner), power: shell.power, trail: shell.trail })
  }
  // Words float up off the tank they're about, following it
  for (const note of notes) {
    const body = bodyOf(note.id)
    if (body?.alive) {
      note.x = body.x
      note.y = body.y
    }
    scene.notes.push(note)
  }
  // The list of who destroyed whom, fading out at the end of each line's time
  for (const item of feed) {
    const name = (id) => ({ name: props.names[id] || '?', color: colorOf(id) })
    const [before, after] = item.killer ? ['', ''] : props.t.tankFeedLeft.split('{name}')
    scene.feed.push({ killer: item.killer && name(item.killer), victim: name(item.victim), before, after: after ?? '', alpha: Math.min(1, (FEED_LIFE - (clock - item.at)) / 0.6) })
  }
  banners(scene.banners)
  renderer.draw(scene)
}

// ---------- Loop ----------

function before (dt) {
  readInbox()
  watchTanks()
  readGifts()
  startCheck()
  updateGhosts(dt)
  others = []
  for (const ghost of ghosts.values()) if (ghost.alive) others.push(ghost)
  for (const drone of drones.values()) if (drone.alive) others.push(drone)
}

function after (dt) {
  effects(dt)
  sendSample(dt)
  if (Math.floor(Date.now() / 1000) !== Math.floor(now.value / 1000)) now.value = Date.now()
  const shield = !!(me?.alive && shielded(props.myId, me))
  const speed = me?.alive ? Math.ceil(Math.max(me.speedLeft, me.boostLeft)) : 0
  const power = me?.alive ? me.powerLeft : 0
  if (hud.shield !== shield) hud.shield = shield
  if (hud.speed !== speed) hud.speed = speed
  if (hud.power !== power) hud.power = power
}

// The arena keeps its shape and gets all the room it can, with the bar under it (none in full
// screen). It stands on end when that makes it clearly bigger, as on a phone held upright.
function fit () {
  const el = area.value
  if (!el || !renderer) return
  const style = getComputedStyle(el)
  const w = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
  const h = el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
  const room = Math.max(0, h - (full.value ? 0 : INFO + GAP))
  const flat = Math.min(w / W, room / H)
  const upright = Math.min(w / H, room / W)
  turn = upright > flat * 1.15
  const unit = Math.max(0, turn ? upright : flat)
  box.w = Math.floor((turn ? H : W) * unit)
  box.h = Math.floor((turn ? W : H) * unit)
  renderer.resize(box.w, box.h, Math.min(window.devicePixelRatio || 1, 2), turn)
}

watch(() => props.round, newRound)

onMounted(() => {
  renderer = createRenderer(canvas.value)
  newRound()
  observer = new ResizeObserver(fit)
  observer.observe(area.value)
  fit()
  // The canvas draws its words in the page's fonts: make sure they're loaded
  stopFonts = watchFonts(() => {})
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', releaseAll)
  document.addEventListener('visibilitychange', onVisibility)
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
  // Development builds expose the battle, for scripted play-testing
  if (import.meta.env.DEV) {
    window.__tank = {
      get me () { return me },
      get ghosts () { return ghosts },
      get drones () { return drones },
      get shells () { return shells },
      get gifts () { return gifts },
      get held () { return held.value },
      get level () { return level },
      get props () { return props }
    }
  }
})

onUnmounted(() => {
  stopLoop?.()
  observer?.disconnect()
  stopFonts?.()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', releaseAll)
  document.removeEventListener('visibilitychange', onVisibility)
  if (import.meta.env.DEV) delete window.__tank
})
</script>

<template>
  <ArcadeStage :t="t" :title="title" :exitLabel="exitLabel" :bare="full" @exit="emit('exit')">
    <template #actions>
      <FullscreenButton :t="t" @toggle="onFullClick" />
    </template>

    <!-- The whole area is the button -->
    <div
      ref="area"
      :class="['relative flex-1 min-h-0 flex flex-col items-center justify-center gap-2 touch-none', full ? 'p-0' : 'p-2 sm:p-4']"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @contextmenu.prevent
    >
      <div class="stage relative shrink-0" :style="{ width: `${box.w}px`, height: `${box.h}px` }">
        <canvas ref="canvas" class="block" role="img" :aria-label="title"></canvas>
      </div>

      <!-- What this tank has picked up, and the clock. Full screen, the clock is on the arena. -->
      <div v-if="!full" class="w-full shrink-0 flex items-center gap-2 overflow-hidden" :style="{ maxWidth: `${Math.max(box.w, 240)}px`, height: `${INFO}px` }">
        <span v-if="hud.shield" class="chip" :style="{ color: GIFT_COLORS.shield }">[#] {{ upper(t.tankGiftShield) }}</span>
        <span v-if="hud.speed" class="chip" :style="{ color: GIFT_COLORS.speed }">&gt;&gt; {{ upper(t.tankGiftSpeed) }} {{ hud.speed }}</span>
        <span v-if="hud.power" class="chip" :style="{ color: GIFT_COLORS.power }">(*) {{ upper(t.tankGiftPower) }} &times;{{ hud.power }}</span>
        <div :class="['ml-auto flex items-center font-display text-3xl leading-none tabular-nums', { 'term-blink': lastSeconds }]">
          {{ clockText }}
        </div>
      </div>

      <!-- Full screen: just the way out, in a corner -->
      <FullscreenButton v-if="full" :t="t" full class="absolute right-2 top-2 z-10 bg-black/70" @toggle="onFullClick" />
    </div>
  </ArcadeStage>
</template>

<style scoped>
.stage {
  box-shadow: 0 0 0 1px var(--color-term-low), 0 0 18px rgb(0 255 0 / 0.15);
}

.chip {
  flex-shrink: 0;
  padding: 0.15rem 0.45rem;
  border: 1px solid currentColor;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  white-space: nowrap;
}
</style>
