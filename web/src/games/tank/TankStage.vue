<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import {
  SIZE, STEP, HEARTS, TANK_SPEED, TURN_SPEED, FIRE_COOLDOWN, MAX_SHELLS, INVULNERABLE,
  mapWalls, spawnTank, moveTank, fireShell, stepShell, touches, aimPath, tankAt, wrapAngle, angleDiff
} from './engine'
import { createRenderer } from './renderer'
import { LEVELS, newBrain, botHeld } from './bots'
import ArcadeStage from '../ascii/ArcadeStage.vue'
import FullscreenButton from '../ascii/FullscreenButton.vue'
import { useFullscreen } from '../ascii/fullscreen'
import { GREEN, DIM, watchFonts } from '../ascii/paint'
import { startLoop } from '../ascii/loop'
import { stepParticles, burst } from '../ascii/physics'
import { SPARKS, sparks as throwSparks } from '../ascii/fx'
import { sound } from '../ascii/sound'
import { haptics } from '../ascii/haptics'

// The full-screen battle: a square arena as large as the screen allows with the hearts and the
// clock beside it, the game loop, input and sound. The whole screen is one button: holding it
// (or Space) drives the tank forward and fires on the press; letting go stops it and it turns
// on the spot. The full-screen switch leaves nothing on screen but the arena, the hearts and
// the clock.
//
// This device moves its own tank and decides when a shell hits it. Positions go out as live
// samples, shots and hits as events, and the host keeps the hearts. The host's device (or a
// solo game) also drives the bot tanks (`drones`) the same way: their positions ride along in
// its own samples, and it decides when they're hit.

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
  tanks: { type: Object, required: true }, // id -> { slot, hearts, alive, hits }
  names: { type: Object, required: true }, // id -> name
  live: { type: Object, required: true }, // { samples: { id -> sample }, at }
  inbox: { type: Array, required: true }, // events from the others: { from, data }
  outcome: { type: Object, default: null }, // { reason, winner } once the round is decided
  drones: { type: Array, default: () => [] }, // ids of the bot tanks this device drives
  level: { type: String, default: 'normal' } // how good those bots are
})

const emit = defineEmits(['exit', 'sample', 'shot', 'hit'])

const SAMPLE_MS = 50
const FIGHT_SECONDS = 0.9
const INFO = 44 // the hearts and the clock, in a row with the arena
const SIDE = 140 // full screen on a wide screen: room either side of the arena for them instead
const GAP = 8
const BUTTON_KEYS = new Set(['Space', 'Enter', 'ArrowUp', 'KeyW'])
const DEBRIS = ['#', '*', '@', '%', '+', 'x', '=', '"']

const area = ref(null)
const canvas = ref(null)
const box = reactive({ size: 0, beside: false })
const held = ref(false)
const now = ref(Date.now()) // for the clock in the bar; updated once a second at most

const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let renderer = null
let observer = null
let stopLoop = null
let stopFonts = null
let alpha = 0
let others = [] // the other tanks still in the fight, for this frame's steps

let walls = []
let me = null // { x, y, a, moving, travel, alive } and prev* for smooth drawing
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
const drones = new Map() // id -> a bot tank this device drives: a tank plus { brain, held, safeUntil, lastShot }
const known = new Map() // id -> { hearts, alive } as last seen, to spot changes
const particles = []
const pointers = new Set()
let keyDown = false

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const upper = (text) => text.toLocaleUpperCase(props.t.langCode.toLowerCase())
const round2 = (value) => Math.round(value * 100) / 100
const fighting = () => Date.now() >= props.startAt && props.phase !== 'ending'

const myHearts = computed(() => (props.fighter ? props.tanks[props.myId]?.hearts ?? 0 : 0))
// <3 for each heart left, a broken </3 for each one lost; watchers see none
const HEART = '<3'
const BROKEN_HEART = '</3'
const heartList = computed(() => (props.fighter ? Array.from({ length: HEARTS }, (_, i) => i < myHearts.value) : []))

const clockText = computed(() => {
  if (!props.endsAt) return '-:--'
  const seconds = Math.max(0, Math.ceil((props.endsAt - now.value) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
})
const lastSeconds = computed(() => props.endsAt && props.endsAt - now.value < 10500 && props.phase === 'playing')

function newRound () {
  walls = mapWalls(props.map)
  renderer?.setMap(props.map)
  const mine = props.tanks[props.myId]
  me = props.fighter && mine ? { ...spawnTank(mine.slot), alive: mine.alive } : null
  if (me) Object.assign(me, { prevX: me.x, prevY: me.y, prevA: me.a })
  shells.clear()
  ghosts.clear()
  drones.clear()
  for (const id of props.drones) {
    const info = props.tanks[id]
    if (!info) continue
    const tank = spawnTank(info.slot)
    drones.set(id, { ...tank, prevX: tank.x, prevY: tank.y, prevA: tank.a, alive: info.alive, hurtUntil: 0, safeUntil: 0, lastShot: -Infinity, held: false, brain: newBrain() })
  }
  known.clear()
  particles.length = 0
  started = false
  lastCount = 0
  safeUntil = 0
  lastShot = -Infinity
  fightTimer = flash = shake = 0
  sampleClock = SAMPLE_MS
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

const { full, toggle: toggleFull } = useFullscreen(() => area.value?.closest('.arena'))

function onFullClick (event) {
  sound.unlock()
  toggleFull(event)
}

watch(full, () => nextTick(fit))

// ---------- Shells and hits ----------

function addShell (shot, owner) {
  if (shells.has(shot.id)) return
  shells.set(shot.id, { id: shot.id, owner, x: shot.x, y: shot.y, prevX: shot.x, prevY: shot.y, dx: shot.dx, dy: shot.dy, age: 0, bounces: 0, trail: [], trailClock: 0 })
}

function fire () {
  if (!me?.alive || !fighting()) return
  let inAir = 0
  for (const shell of shells.values()) if (shell.owner === props.myId) inAir++
  if (clock - lastShot < FIRE_COOLDOWN || inAir >= MAX_SHELLS) return
  lastShot = clock
  const shot = { id: `${props.round}.${props.myId}.${++shotSeq}`, ...fireShell(me, walls) }
  addShell(shot, props.myId)
  emit('shot', { k: 'shot', ...shot })
  sound.play('fire')
  muzzle(shot)
}

// A bot's press: the same limits as anyone's
function droneFire (id, drone) {
  let inAir = 0
  for (const shell of shells.values()) if (shell.owner === id) inAir++
  if (clock - drone.lastShot < FIRE_COOLDOWN || inAir >= MAX_SHELLS) return
  drone.lastShot = clock
  const shot = { id: `${props.round}.${id}.${++shotSeq}`, ...fireShell(drone, walls) }
  addShell(shot, id)
  emit('shot', { k: 'shot', o: id, ...shot })
  sound.play('fire')
  muzzle(shot)
}

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)

function readInbox () {
  while (props.inbox.length) {
    const { from, data } = props.inbox.shift()
    if (data.k === 'shot' && typeof data.id === 'string' && data.id.startsWith(`${props.round}.`) &&
        [data.x, data.y, data.dx, data.dy].every(isNumber)) {
      // A bot's shot comes from the host's device, with the bot as its owner
      addShell(data, typeof data.o === 'string' && props.tanks[data.o]?.bot ? data.o : from)
      muzzle(data)
    } else if (data.k === 'hit' && typeof data.sid === 'string') {
      shells.delete(data.sid)
      if (isNumber(data.x) && isNumber(data.y)) sparks(data.x, data.y, 8)
    }
  }
}

function gotHit (shell) {
  safeUntil = clock + INVULNERABLE
  emit('hit', { by: shell.owner, sid: shell.id, x: round2(shell.x), y: round2(shell.y) })
  sound.play('hit')
  haptics.buzz('hit')
  sparks(shell.x, shell.y, 10)
  if (!reduceMotion) {
    flash = 1
    shake = 1
  }
}

// Hearts and wrecks come from the host: show what changed
function watchTanks () {
  for (const [id, info] of Object.entries(props.tanks)) {
    const before = known.get(id)
    known.set(id, { hearts: info.hearts, alive: info.alive })
    if (!before) continue
    const body = id === props.myId ? me : drones.get(id) || ghosts.get(id)
    if (!body) continue
    if (info.hearts < before.hearts && body !== me) body.hurtUntil = clock + INVULNERABLE
    if (before.alive && !info.alive && body.alive) explode(body, body === me)
  }
}

// ---------- Effects ----------

const sparks = (x, y, count) => throwSparks(particles, x, y, { count })

function explode (body, mine) {
  body.alive = false
  burst(particles, body.x, body.y, { chars: DEBRIS, colors: [GREEN, DIM, DIM], count: 22, speed: 14, life: 1, drag: 3 })
  sound.play('boom')
  if (mine) haptics.buzz('boom')
  if (mine && !reduceMotion) {
    shake = 1.5
    flash = 1
  }
}

function muzzle (shot) {
  if (reduceMotion) return
  for (let i = 0; i < 3; i++) {
    particles.push({ ch: SPARKS[i], x: shot.x, y: shot.y, vx: shot.dx * (6 + i * 3), vy: shot.dy * (6 + i * 3), drag: 3, life: 0.16, ttl: 0.16, color: GREEN })
  }
}

function effects (dt) {
  flash = Math.max(0, flash - dt * 4)
  shake = Math.max(0, shake - dt * 3)
  fightTimer = Math.max(0, fightTimer - dt)
  stepParticles(particles, dt)
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

function tick () {
  clock += STEP
  if (me) {
    me.prevX = me.x
    me.prevY = me.y
    me.prevA = me.a
    if (me.alive && props.phase !== 'ending') {
      me.moving = fighting() && held.value
      moveTank(me, walls, others, STEP)
    }
  }
  driveDrones()
  for (const shell of shells.values()) {
    shell.prevX = shell.x
    shell.prevY = shell.y
    const result = stepShell(shell, walls, STEP)
    if (result === 'gone') {
      shells.delete(shell.id)
      throwSparks(particles, shell.x, shell.y, { count: 3, speed: 5, life: 0.3 })
      continue
    }
    if (result === 'bounce' && shell.owner === props.myId) sound.play('bounce')
    shell.trailClock += STEP
    if (shell.trailClock >= 0.03) {
      shell.trailClock = 0
      shell.trail.push({ x: shell.x, y: shell.y })
      if (shell.trail.length > 4) shell.trail.shift()
    }
    if (me?.alive && shell.owner !== props.myId && clock >= safeUntil && touches(shell, me)) {
      shells.delete(shell.id)
      gotHit(shell)
      continue
    }
    // A bot tank this device drives: its hits are decided here
    let struck = false
    for (const [id, drone] of drones) {
      if (drone.alive && id !== shell.owner && clock >= drone.safeUntil && touches(shell, drone)) {
        shells.delete(shell.id)
        drone.safeUntil = clock + INVULNERABLE
        emit('hit', { target: id, by: shell.owner, sid: shell.id, x: round2(shell.x), y: round2(shell.y) })
        sparks(shell.x, shell.y, 8)
        struck = true
        break
      }
    }
    if (struck) continue
    // Shells vanish into other tanks right away; whether that cost a heart is up to their owner
    for (const [id, ghost] of ghosts) {
      if (ghost.alive && id !== shell.owner && touches(shell, ghost)) {
        shells.delete(shell.id)
        sparks(shell.x, shell.y, 6)
        break
      }
    }
  }
}

// The bots: each decides whether its button is down, then drives like anyone
function driveDrones () {
  if (!drones.size) return
  const level = LEVELS[props.level] || LEVELS.normal
  const active = fighting()
  const bodies = []
  if (me?.alive) bodies.push({ id: props.myId, tank: me })
  for (const [id, ghost] of ghosts) if (ghost.alive) bodies.push({ id, tank: ghost })
  for (const [id, drone] of drones) if (drone.alive) bodies.push({ id, tank: drone })
  const flying = [...shells.values()]
  for (const [id, drone] of drones) {
    drone.prevX = drone.x
    drone.prevY = drone.y
    drone.prevA = drone.a
    if (!drone.alive || props.phase === 'ending') continue
    const others = bodies.filter(b => b.id !== id).map(b => b.tank)
    let down = false
    if (active) {
      const seen = flying.map(s => ({ x: s.x, y: s.y, dx: s.dx, dy: s.dy, mine: s.owner === id }))
      down = botHeld(drone, drone.brain, { clock, walls, targets: others, shells: seen }, level)
    }
    if (down !== drone.held) {
      drone.held = down
      if (down) {
        drone.spin = -drone.spin
        droneFire(id, drone)
      }
    }
    drone.moving = active && drone.held
    moveTank(drone, walls, others, STEP)
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
      ghost = { ...spawnTank(info.slot), alive: info.alive, hurtUntil: 0 }
      ghosts.set(id, ghost)
    }
    if (!ghost.alive || props.phase === 'ending') continue
    const sample = samples[id]
    if (!sample || sample.r !== props.round || !isNumber(sample.x)) {
      ghost.a = wrapAngle(ghost.a + TURN_SPEED * ghost.spin * dt)
      continue
    }
    const estimate = tankAt(sample, age, walls)
    if (Math.hypot(estimate.x - ghost.x, estimate.y - ghost.y) > 6) {
      ghost.x = estimate.x
      ghost.y = estimate.y
    } else {
      ghost.x += (estimate.x - ghost.x) * ease
      ghost.y += (estimate.y - ghost.y) * ease
    }
    ghost.a = wrapAngle(ghost.a + angleDiff(ghost.a, estimate.a) * ease)
    ghost.moving = estimate.moving
    ghost.spin = estimate.spin
    if (ghost.moving) ghost.travel += TANK_SPEED * dt
  }
}

const pose = (tank) => ({ x: round2(tank.x), y: round2(tank.y), a: Math.round(tank.a * 1000) / 1000, m: tank.moving ? 1 : 0, s: tank.spin })

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

const heartsLabel = (hearts) => '<3'.repeat(Math.max(0, hearts))

function tread (tank) {
  if (!tank.alive || props.phase === 'ending') return 0
  return Math.floor(tank.moving ? tank.travel / 0.6 : clock * 7) % 2
}

// Banners are laid out on a 48-unit grid and scaled to the arena, so they keep their size on screen
const BANNER = SIZE / 48

function banners (texts) {
  const nowMs = Date.now()
  const banner = (text, y, size, style = {}) => texts.push({ text: upper(text), y: y * BANNER, size: size * BANNER, ...style })
  if (nowMs < props.startAt) {
    banner(props.t.tankGetReady, 15, 5, { display: true })
    banner(String(Math.ceil((props.startAt - nowMs) / 1000)), 26, 13, { display: true })
    if (props.fighter) banner(props.t.tankHold, 33, 1.3, { min: 12, color: DIM })
  }
  if (fightTimer > 0) {
    banner(props.t.tankFight, 24, 9, { display: true, alpha: Math.min(1, fightTimer / 0.3) })
  }
  if (props.phase === 'ending' && props.outcome) {
    const { reason, winner } = props.outcome
    if (reason === 'time') banner(props.t.tankTimeUp, 17.5, 1.4, { min: 13 })
    banner(winner ? fmt(props.t.tankWinner, { name: props.names[winner] || '?' }) : props.t.tankDraw, 22, 5, { display: true })
    return
  }
  if (me && !me.alive) {
    banner(props.t.tankDestroyed, 21, 5, { display: true })
    banner(props.t.tankWatching, 25, 1.15, { min: 12, color: DIM })
  } else if (!me && nowMs >= props.startAt) {
    banner(props.t.tankNextRound, 44, 2.6, { display: true })
  }
}

function render () {
  const lerp = (from, to) => from + (to - from) * alpha
  const blinking = Math.floor(clock * 12) % 2 === 0
  const scene = { tanks: [], shells: [], aim: [], particles, texts: [], flash, shake }
  for (const [id, ghost] of ghosts) {
    scene.tanks.push({
      x: ghost.x,
      y: ghost.y,
      a: ghost.a,
      me: false,
      alive: ghost.alive,
      tread: tread(ghost),
      alpha: ghost.hurtUntil > clock && blinking ? 0.3 : 1,
      label: ghost.alive ? `${props.names[id] || '?'} ${heartsLabel(props.tanks[id]?.hearts)}` : ''
    })
  }
  for (const [id, drone] of drones) {
    scene.tanks.push({
      x: lerp(drone.prevX, drone.x),
      y: lerp(drone.prevY, drone.y),
      a: drone.prevA + angleDiff(drone.prevA, drone.a) * alpha,
      me: false,
      alive: drone.alive,
      tread: tread(drone),
      alpha: drone.hurtUntil > clock && blinking ? 0.3 : 1,
      label: drone.alive ? `${props.names[id] || '?'} ${heartsLabel(props.tanks[id]?.hearts)}` : ''
    })
  }
  if (me) {
    const tank = {
      x: lerp(me.prevX, me.x),
      y: lerp(me.prevY, me.y),
      a: me.prevA + angleDiff(me.prevA, me.a) * alpha,
      me: true,
      alive: me.alive,
      tread: tread(me),
      alpha: clock < safeUntil && blinking ? 0.3 : 1,
      label: me.alive ? heartsLabel(myHearts.value) : ''
    }
    scene.tanks.push(tank)
    if (me.alive && props.phase !== 'ending') scene.aim = aimPath(tank, walls, held.value ? 10 : 30)
  }
  for (const shell of shells.values()) {
    scene.shells.push({ x: lerp(shell.prevX, shell.x), y: lerp(shell.prevY, shell.y), mine: shell.owner === props.myId, trail: shell.trail })
  }
  banners(scene.texts)
  renderer.draw(scene)
}

// ---------- Loop ----------

function before (dt) {
  readInbox()
  watchTanks()
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
}

// The arena stays square and gets all the room it can, with the hearts and the clock in a row
// under it, or above it in full screen. On a wide screen in full screen they go in the corners
// instead, either side of the arena, when that leaves it bigger.
function fit () {
  const el = area.value
  if (!el || !renderer) return
  const style = getComputedStyle(el)
  const w = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
  const h = el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
  const stacked = Math.min(w, h - INFO - GAP)
  const beside = full.value ? Math.min(w - SIDE * 2, h) : 0
  box.beside = beside > stacked
  box.size = Math.floor(Math.max(0, box.beside ? beside : stacked))
  renderer.resize(box.size, Math.min(window.devicePixelRatio || 1, 3))
}

watch(() => props.round, newRound)

onMounted(() => {
  renderer = createRenderer(canvas.value)
  newRound()
  observer = new ResizeObserver(fit)
  observer.observe(area.value)
  fit()
  stopFonts = watchFonts(() => renderer?.rebuild())
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
    window.__tank = { get me () { return me }, get ghosts () { return ghosts }, get drones () { return drones }, get shells () { return shells }, get held () { return held.value } }
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
      :class="['relative flex-1 min-h-0 flex flex-col items-center justify-center gap-2 touch-none', full ? 'p-1' : 'p-2 sm:p-4']"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @contextmenu.prevent
    >
      <div class="stage relative shrink-0" :style="{ width: `${box.size}px`, height: `${box.size}px` }">
        <canvas ref="canvas" class="block" role="img" :aria-label="title"></canvas>
      </div>

      <!-- Hearts and the clock: under the arena, above it in full screen, or in the corners
           either side of it on a wide screen -->
      <div
        :class="['info flex items-center gap-3', full && box.beside ? 'absolute inset-x-2 top-2 z-10 items-start' : 'w-full shrink-0', { 'order-first': full && !box.beside }]"
        :style="full && box.beside ? {} : { maxWidth: `${box.size}px`, height: `${INFO}px` }"
      >
        <div class="flex items-center gap-2 font-display text-3xl leading-none whitespace-nowrap" :aria-label="`${myHearts} / ${HEARTS}`">
          <span v-for="(whole, i) in heartList" :key="i" :class="{ 'term-muted opacity-50': !whole }">{{ whole ? HEART : BROKEN_HEART }}</span>
        </div>
        <div :class="['ml-auto flex items-center font-display text-3xl leading-none tabular-nums', { 'term-blink': lastSeconds }]">
          {{ clockText }}
        </div>
        <FullscreenButton v-if="full" :t="t" full class="bg-black/70" @toggle="onFullClick" />
      </div>
    </div>
  </ArcadeStage>
</template>

<style scoped>
.stage {
  box-shadow: 0 0 0 1px var(--color-term-low), 0 0 18px rgb(0 255 0 / 0.15);
}
</style>
