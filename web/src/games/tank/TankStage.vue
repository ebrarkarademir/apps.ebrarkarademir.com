<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  SIZE, STEP, HEARTS, TANK_SPEED, TURN_SPEED, FIRE_COOLDOWN, MAX_SHELLS, INVULNERABLE,
  mapWalls, spawnTank, moveTank, fireShell, stepShell, touches, aimPath, tankAt, wrapAngle, angleDiff
} from './engine'
import { createRenderer } from './renderer'
import { GREEN, DIM, CANVAS_FONTS } from '../ascii/paint'
import { sound } from '../ascii/sound'

// The full-screen battle: a square arena as large as the screen allows, one big button under
// it, the game loop, input and sound. Holding the button (anywhere on screen, or Space) drives
// the tank forward and fires on the press; letting go stops it and it turns on the spot.
//
// This device moves its own tank and decides when a shell hits it. Positions go out as live
// samples, shots and hits as events, and the host keeps the hearts.

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
  outcome: { type: Object, default: null } // { reason, winner } once the round is decided
})

const emit = defineEmits(['exit', 'sample', 'shot', 'hit'])

const SAMPLE_MS = 50
const FIGHT_SECONDS = 0.9
const BAR_MIN = 56
const GAP = 8
const BUTTON_KEYS = new Set(['Space', 'Enter', 'ArrowUp', 'KeyW'])
const SPARKS = ['*', "'", '.', '`', '+', ',']
const DEBRIS = ['#', '*', '@', '%', '+', 'x', '=', '"']

const area = ref(null)
const canvas = ref(null)
const box = reactive({ size: 0, bar: BAR_MIN })
const held = ref(false)
const muted = ref(sound.muted)
const now = ref(Date.now()) // for the clock in the bar; updated once a second at most

const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let renderer = null
let observer = null
let raf = 0
let lastFrame = 0
let acc = 0
let alpha = 0
let savedOverflow = ''

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
const known = new Map() // id -> { hearts, alive } as last seen, to spot changes
const particles = []
const pointers = new Set()
let keyDown = false

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const upper = (text) => text.toLocaleUpperCase(props.t.langCode === 'TR' ? 'tr' : 'en')
const round2 = (value) => Math.round(value * 100) / 100
const fighting = () => Date.now() >= props.startAt && props.phase !== 'ending'

const myHearts = computed(() => (props.fighter ? props.tanks[props.myId]?.hearts ?? 0 : 0))
// <3 for each heart left, a broken </3 for each one lost; watchers see none
const HEART = '<3'
const BROKEN_HEART = '</3'
const heartList = computed(() => (props.fighter ? Array.from({ length: HEARTS }, (_, i) => i < myHearts.value) : []))

// Under the arena: hearts, the button and the clock in one row, or on a tall screen the
// hearts and clock above a big button that takes the rest of the room
const barStyle = computed(() => {
  const tall = box.bar >= 110
  return {
    maxWidth: `${box.size}px`,
    height: `${box.bar}px`,
    gridTemplateColumns: tall ? '1fr auto' : 'auto 1fr auto',
    gridTemplateRows: tall ? 'auto 1fr' : '1fr',
    gridTemplateAreas: tall ? '"hearts clock" "button button"' : '"hearts button clock"'
  }
})
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
  } else if (event.code === 'KeyM' && !event.repeat) {
    toggleSound()
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

function toggleSound () {
  sound.setMuted(!sound.muted)
  muted.value = sound.muted
  if (!muted.value) sound.unlock()
}

// Clicked buttons let go of focus, so Space goes back to the tank
function onSoundClick (event) {
  toggleSound()
  if (event.detail) event.currentTarget.blur()
}

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

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)

function readInbox () {
  while (props.inbox.length) {
    const { from, data } = props.inbox.shift()
    if (data.k === 'shot' && typeof data.id === 'string' && data.id.startsWith(`${props.round}.`) &&
        [data.x, data.y, data.dx, data.dy].every(isNumber)) {
      addShell(data, from)
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
    const body = id === props.myId ? me : ghosts.get(id)
    if (!body) continue
    if (info.hearts < before.hearts && body !== me) body.hurtUntil = clock + INVULNERABLE
    if (before.alive && !info.alive && body.alive) explode(body, body === me)
  }
}

// ---------- Effects ----------

function burst (x, y, chars, count, speed, life) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const v = speed * (0.4 + Math.random() * 0.6)
    particles.push({ ch: chars[i % chars.length], x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, life: life * (0.6 + Math.random() * 0.4), ttl: life, color: i % 3 ? DIM : GREEN })
  }
}

const sparks = (x, y, count) => burst(x, y, SPARKS, count, 9, 0.45)

function explode (body, mine) {
  body.alive = false
  burst(body.x, body.y, DEBRIS, 22, 14, 1)
  sound.play('boom')
  if (mine && !reduceMotion) {
    shake = 1.5
    flash = 1
  }
}

function muzzle (shot) {
  if (reduceMotion) return
  for (let i = 0; i < 3; i++) {
    particles.push({ ch: SPARKS[i], x: shot.x, y: shot.y, vx: shot.dx * (6 + i * 3), vy: shot.dy * (6 + i * 3), life: 0.16, ttl: 0.16, color: GREEN })
  }
}

function effects (dt) {
  flash = Math.max(0, flash - dt * 4)
  shake = Math.max(0, shake - dt * 3)
  fightTimer = Math.max(0, fightTimer - dt)
  const drag = Math.exp(-dt * 3)
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.life -= dt
    if (p.life <= 0) {
      particles.splice(i, 1)
      continue
    }
    p.vx *= drag
    p.vy *= drag
    p.x += p.vx * dt
    p.y += p.vy * dt
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

function tick (others) {
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
  for (const shell of shells.values()) {
    shell.prevX = shell.x
    shell.prevY = shell.y
    const result = stepShell(shell, walls, STEP)
    if (result === 'gone') {
      shells.delete(shell.id)
      burst(shell.x, shell.y, SPARKS, 3, 5, 0.3)
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

// Other players' tanks, eased toward where their last sample says they are now
function updateGhosts (dt) {
  const samples = props.live.samples || {}
  const age = (Date.now() - (props.live.at || 0)) / 1000
  const ease = 1 - Math.exp(-dt * 18)
  for (const id in props.tanks) {
    if (id === props.myId) continue
    const info = props.tanks[id]
    let ghost = ghosts.get(id)
    if (!ghost) {
      ghost = { ...spawnTank(info.slot), alive: info.alive, hurtUntil: 0 }
      ghosts.set(id, ghost)
    }
    if (!ghost.alive || props.phase === 'ending') continue
    const sample = samples[id]
    if (!sample || sample.r !== props.round) {
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

function sendSample (dt) {
  if (!me?.alive) return
  sampleClock += dt * 1000
  if (sampleClock < SAMPLE_MS) return
  sampleClock = 0
  emit('sample', { r: props.round, x: round2(me.x), y: round2(me.y), a: Math.round(me.a * 1000) / 1000, m: me.moving ? 1 : 0, s: me.spin, q: ++sampleSeq })
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

function frame (time) {
  raf = requestAnimationFrame(frame)
  const dt = Math.min(0.1, Math.max(0, (time - lastFrame) / 1000))
  lastFrame = time
  readInbox()
  watchTanks()
  startCheck()
  updateGhosts(dt)
  const others = []
  for (const ghost of ghosts.values()) if (ghost.alive) others.push(ghost)
  acc += dt
  while (acc >= STEP) {
    tick(others)
    acc -= STEP
  }
  alpha = acc / STEP
  effects(dt)
  sendSample(dt)
  if (Math.floor(Date.now() / 1000) !== Math.floor(now.value / 1000)) now.value = Date.now()
  if (renderer) render()
}

// The arena stays square; the button below it gets the room that's left, within limits
function fit () {
  const el = area.value
  if (!el || !renderer) return
  const style = getComputedStyle(el)
  const w = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
  const h = el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
  box.size = Math.floor(Math.max(0, Math.min(w, h - BAR_MIN - GAP)))
  box.bar = Math.floor(Math.max(BAR_MIN, h - box.size - GAP))
  renderer.resize(box.size, Math.min(window.devicePixelRatio || 1, 3))
}

const onFontsLoaded = () => renderer?.rebuild()

watch(() => props.round, newRound)

onMounted(() => {
  renderer = createRenderer(canvas.value)
  newRound()
  observer = new ResizeObserver(fit)
  observer.observe(area.value)
  fit()
  Promise.all(CANVAS_FONTS.map(font => document.fonts?.load(font))).then(onFontsLoaded, () => {})
  document.fonts?.addEventListener?.('loadingdone', onFontsLoaded)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', releaseAll)
  document.addEventListener('visibilitychange', onVisibility)
  savedOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  document.activeElement?.blur?.()
  lastFrame = performance.now()
  raf = requestAnimationFrame(frame)
  // Development builds expose the battle, for scripted play-testing
  if (import.meta.env.DEV) {
    window.__tank = { get me () { return me }, get ghosts () { return ghosts }, get shells () { return shells }, get held () { return held.value } }
  }
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  observer?.disconnect()
  document.fonts?.removeEventListener?.('loadingdone', onFontsLoaded)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', releaseAll)
  document.removeEventListener('visibilitychange', onVisibility)
  document.body.style.overflow = savedOverflow
  if (import.meta.env.DEV) delete window.__tank
})
</script>

<template>
  <div class="arena fixed inset-0 z-40 flex flex-col bg-black select-none">
    <header class="shrink-0 flex items-center gap-2 h-12 px-2 sm:px-4 border-b border-term-low">
      <button type="button" class="term-link shrink-0" @click="emit('exit')">
        <span aria-hidden="true">[&lt;]</span>
        <span>{{ exitLabel }}</span>
      </button>
      <h1 class="flex-1 min-w-0 truncate text-center font-display text-2xl leading-none uppercase">[ {{ title }} ]</h1>
      <button
        type="button"
        class="term-icon-btn shrink-0 h-9 text-xs"
        :aria-label="t.sound"
        :aria-pressed="!muted"
        @click="onSoundClick"
      >
        {{ muted ? 'SND:OFF' : 'SND:ON' }}
      </button>
    </header>

    <!-- The whole area is the button -->
    <div
      ref="area"
      class="flex-1 min-h-0 flex flex-col items-center justify-center gap-2 p-2 sm:p-4 touch-none"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @contextmenu.prevent
    >
      <div class="stage relative" :style="{ width: `${box.size}px`, height: `${box.size}px` }">
        <canvas ref="canvas" class="block" role="img" :aria-label="title"></canvas>
      </div>

      <div class="grid w-full gap-x-3 gap-y-2" :style="barStyle">
        <div class="flex items-center gap-2 font-display text-3xl leading-none whitespace-nowrap" style="grid-area: hearts" :aria-label="`${myHearts} / ${HEARTS}`">
          <span v-for="(full, i) in heartList" :key="i" :class="{ 'term-muted opacity-50': !full }">{{ full ? HEART : BROKEN_HEART }}</span>
        </div>
        <div
          :class="[
            'flex items-center justify-center border px-2 text-center text-xs sm:text-sm font-semibold uppercase tracking-widest',
            held ? 'term-inverse border-term' : 'border-term-low term-muted'
          ]"
          style="grid-area: button"
          aria-hidden="true"
        >
          {{ held ? t.tankHolding : t.tankHold }}
        </div>
        <div :class="['flex items-center justify-end font-display text-3xl leading-none tabular-nums', { 'term-blink': lastSeconds }]" style="grid-area: clock">
          {{ clockText }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.arena {
  -webkit-touch-callout: none;
}

.stage {
  box-shadow: 0 0 0 1px var(--color-term-low), 0 0 18px rgb(0 255 0 / 0.15);
}
</style>
