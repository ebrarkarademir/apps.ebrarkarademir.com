<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { STEP, W, H, GOAL_W, GROUND, createMatch, stepMatch, setInput, pressKick, snapshot, viewOf, readSnapshot } from './engine'
import { LEVELS, newBrain, botControls } from './bots'
import { createRenderer } from './renderer'
import ArcadeStage from '../ascii/ArcadeStage.vue'
import FullscreenButton from '../ascii/FullscreenButton.vue'
import { useFullscreen } from '../ascii/fullscreen'
import { watchFonts } from '../ascii/paint'
import { startLoop } from '../ascii/loop'
import { sound } from '../ascii/sound'
import { haptics } from '../ascii/haptics'

// The match screen, made for a phone first: the pitch as big as the screen allows with the
// score and clock above it, and big buttons for the thumbs: left and right arrows bottom left,
// JUMP and KICK bottom right. Held upright, the buttons sit under the pitch; turned sideways
// they sit over its bottom corners. On a computer: arrows or A D run, W or up jumps, Space or
// K kicks. The full-screen switch turns a phone sideways (where it can) and leaves nothing but
// the pitch, the buttons and the score small at the top.
//
// In a solo game and on an online host this device runs the match (engine.js) and plays the
// computer player. The host sends a snapshot of it many times a second and takes the other
// player's controls in; the guest draws the snapshots a tenth of a second late, so motion
// stays smooth between them, and sends its controls.

const props = defineProps({
  t: { type: Object, required: true },
  title: { type: String, required: true },
  exitLabel: { type: String, required: true },
  mode: { type: String, default: 'solo' }, // solo | host | guest
  round: { type: Number, default: 1 }, // a new match starts whenever this changes
  players: { type: Array, required: true }, // [{ id, name, look, bot }] for side 0 and side 1
  myId: { type: String, default: '' },
  length: { type: Number, default: 90 },
  level: { type: String, default: 'normal' },
  paused: { type: Boolean, default: false },
  online: { type: Object, default: () => ({}) }, // host: id -> still in the room
  inputs: { type: Map, default: null }, // host: id -> the latest controls that guest sent
  snaps: { type: Array, default: null } // guest: snapshots from the host, oldest first
})

const emit = defineEmits(['exit', 'pause', 'snapshot', 'input', 'end'])

const DELAY = 0.1
const INPUT_MS = 30
const INPUT_RESEND_MS = 250
const STALL_MS = 1500
const AWAY_MS = 2000
const PADS_H = 132 // the band for the buttons under the pitch, held upright
const KEYS_LEFT = new Set(['ArrowLeft', 'KeyA'])
const KEYS_RIGHT = new Set(['ArrowRight', 'KeyD'])
const KEYS_JUMP = new Set(['ArrowUp', 'KeyW'])
const KEYS_KICK = new Set(['Space', 'KeyK', 'KeyX', 'ArrowDown', 'KeyS'])
const CONFETTI = ['#ffd23a', '#e8402a', '#2f6ee8', '#f6f6f0', '#7ad94a', '#ff8ad8']

const area = ref(null)
const canvas = ref(null)
const box = reactive({ w: 0, h: 0, reserve: 0 })
const hud = reactive({ score: [0, 0], clock: '', golden: false, hurry: false })
const pads = reactive({ left: false, right: false, jump: false, kick: false })
const touchUi = ref(typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches)
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let renderer = null
let observer = null
let stopLoop = null
let stopFonts = null

let mySide = -1
let match = null
let prev = null
let ended = false
const brains = [null, null]
let seenKicks = 0

let buffer = []
let offsets = []
let lastSnapAt = 0
let mountedAt = 0
let lastSent = 0
let lastSentKey = ''
let kickCount = 0

const keys = new Set()
const grips = { left: null, right: null, jump: null, kick: null }

const particles = []
let flash = 0
let shake = 0
let crowdJump = 0
let cheer = -1
let message = null
let lastView = null

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const upper = (text) => text.toLocaleUpperCase((props.t.langCode || 'en').toLowerCase())
const seconds = () => performance.now() / 1000
const lerp = (a, b, f) => a + (b - a) * f

const names = computed(() => props.players.map(p => p.name))
const watching = computed(() => !props.players.some(p => p.id === props.myId))
const looks = computed(() => props.players.map(p => p.look))

function newMatch () {
  mySide = props.players.findIndex(p => p.id === props.myId)
  brains[0] = newBrain()
  brains[1] = newBrain()
  seenKicks = 0
  buffer = []
  offsets = []
  lastSnapAt = 0
  mountedAt = performance.now()
  lastSentKey = ''
  kickCount = 0
  particles.length = 0
  flash = shake = crowdJump = 0
  cheer = -1
  message = null
  lastView = null
  ended = false
  if (props.mode === 'guest') {
    match = null
    return
  }
  match = createMatch({ length: props.length })
  prev = { ball: { ...match.ball }, players: match.players.map(p => ({ x: p.x, y: p.y })) }
}

function remember () {
  prev.ball.x = match.ball.x
  prev.ball.y = match.ball.y
  prev.ball.spin = match.ball.spin
  match.players.forEach((p, i) => {
    prev.players[i].x = p.x
    prev.players[i].y = p.y
  })
}

// ---------- Controls ----------

const moveDir = () => {
  const left = pads.left || [...KEYS_LEFT].some(k => keys.has(k))
  const right = pads.right || [...KEYS_RIGHT].some(k => keys.has(k))
  return (right ? 1 : 0) - (left ? 1 : 0)
}
const jumpHeld = () => pads.jump || [...KEYS_JUMP].some(k => keys.has(k))

function kick () {
  if (mySide < 0 || props.paused) return
  if (match) pressKick(match, mySide)
  else {
    kickCount++
    sendControls(true)
  }
}

function onKeyDown (event) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest?.('input, textarea')) return
  const code = event.code
  if (KEYS_LEFT.has(code) || KEYS_RIGHT.has(code) || KEYS_JUMP.has(code)) {
    event.preventDefault()
    keys.add(code)
    sound.unlock()
    sendControls()
  } else if (KEYS_KICK.has(code)) {
    if (code === 'Space' && event.target.closest?.('button, a')) return
    event.preventDefault()
    if (event.repeat) return
    sound.unlock()
    kick()
  } else if ((code === 'KeyP' || code === 'Escape') && !event.repeat && props.mode === 'solo') {
    emit('pause')
  }
}

function onKeyUp (event) {
  keys.delete(event.code)
  sendControls()
}

// Each button follows its own finger, so a thumb on an arrow and one on JUMP work together
function padDown (name, event) {
  event.preventDefault()
  sound.unlock()
  touchUi.value = true
  try {
    event.currentTarget.setPointerCapture?.(event.pointerId)
  } catch {
    // A pointer the browser no longer knows: it just isn't captured
  }
  grips[name] = event.pointerId
  pads[name] = true
  haptics.buzz('tick')
  if (name === 'kick') kick()
  sendControls(true)
}

function padUp (name, event) {
  if (grips[name] !== event.pointerId) return
  grips[name] = null
  pads[name] = false
  sendControls(true)
}

function releaseAll () {
  keys.clear()
  for (const name of Object.keys(grips)) {
    grips[name] = null
    pads[name] = false
  }
  sendControls(true)
}

const onVisibility = () => {
  if (document.hidden) releaseAll()
}

const onTouch = () => {
  touchUi.value = true
}

// Every touch on the game belongs to it: no pinch, double tap or drag moves the page
function guardTouch (event) {
  if (!event.cancelable || event.target.closest?.('a, input, select, textarea, .term-window, .hb-panel button')) return
  event.preventDefault()
}

// ---------- Full screen ----------

const { full, toggle: toggleFull } = useFullscreen(() => area.value?.closest('.arena'), { orientation: 'landscape' })

function onFullClick (event) {
  sound.unlock()
  toggleFull(event)
}

watch(full, () => nextTick(fit))

function sendControls (now = false) {
  if (props.mode !== 'guest' || mySide < 0) return
  const at = performance.now()
  const m = moveDir()
  const j = jumpHeld() ? 1 : 0
  const key = `${m},${j},${kickCount}`
  if (!now && (key === lastSentKey ? at - lastSent < INPUT_RESEND_MS : at - lastSent < INPUT_MS)) return
  lastSentKey = key
  lastSent = at
  emit('input', { r: props.round, m, j, n: kickCount })
}

// ---------- Running the match (solo and host) ----------

function guestHere (id) {
  const input = props.inputs?.get(id)
  return props.online[id] !== false && input?.r === props.round && Date.now() - input.at < AWAY_MS
}

function tick () {
  if (!match || match.over) return
  remember()
  const level = LEVELS[props.level] || LEVELS.normal
  props.players.forEach((entry, side) => {
    if (side === mySide) {
      setInput(match, side, moveDir(), jumpHeld())
    } else if (!entry.bot && props.mode === 'host' && guestHere(entry.id)) {
      const input = props.inputs.get(entry.id)
      setInput(match, side, input.m, input.j === 1)
      if (Number.isInteger(input.n)) {
        if (input.n < seenKicks) seenKicks = input.n
        else if (input.n > seenKicks) {
          seenKicks = input.n
          pressKick(match, side)
        }
      }
    } else {
      // The computer, or a person who dropped out: the computer plays for them until they're back
      const c = botControls(match, side, brains[side], level)
      setInput(match, side, c.move, c.jump)
      if (c.kick) pressKick(match, side)
    }
  })
  stepMatch(match)
  if (match.over && !ended) {
    ended = true
    emit('end', { score: match.score.slice(), winner: match.winner, goals: match.goals.map(g => ({ ...g })) })
  }
}

function hostView (alpha) {
  const view = viewOf(match)
  view.ball.x = lerp(prev.ball.x, view.ball.x, alpha)
  view.ball.y = lerp(prev.ball.y, view.ball.y, alpha)
  view.players.forEach((p, i) => {
    p.x = lerp(prev.players[i].x, p.x, alpha)
    p.y = lerp(prev.players[i].y, p.y, alpha)
  })
  return view
}

// ---------- Following the host (guest) ----------

function pullSnapshots () {
  const now = seconds()
  while (props.snaps?.length) {
    const data = props.snaps.shift()
    if (data?.r !== props.round) continue
    const snap = readSnapshot(data)
    if (!snap || (buffer.length && snap.t <= buffer[buffer.length - 1].t)) continue
    buffer.push(snap)
    offsets.push(now - snap.t)
    if (offsets.length > 40) offsets.shift()
    lastSnapAt = performance.now()
  }
}

function guestView () {
  if (!buffer.length) return null
  const at = seconds() - Math.min(...offsets) - DELAY
  while (buffer.length > 2 && buffer[1].t <= at) buffer.shift()
  const [a, b] = buffer
  if (!b || at <= a.t) return a
  if (at >= b.t) return b
  const f = (at - a.t) / (b.t - a.t)
  const since = at - a.t
  // The line-up after a goal jumps; that isn't slid across the pitch
  const blend = (p, q) => (Math.hypot(q.x - p.x, q.y - p.y) > 40 ? { x: q.x, y: q.y } : { x: lerp(p.x, q.x, f), y: lerp(p.y, q.y, f) })
  return {
    ...a,
    timer: a.phase === 'play' ? a.timer : a.timer - since,
    clock: a.phase === 'play' && !a.golden ? a.clock - since : a.clock,
    ball: { ...blend(a.ball, b.ball), spin: lerp(a.ball.spin, b.ball.spin, f) },
    players: a.players.map((p, i) => ({ ...p, ...blend(p, b.players[i]) }))
  }
}

// ---------- Sounds, effects and messages ----------

function say (text, sub, time, color) {
  message = { text, sub, until: seconds() + time, color }
}

function burst (x, y, count, speed, colors, life = 1.2) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2
    const s = speed * (0.4 + Math.random() * 0.6)
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.5, life: life * (0.6 + Math.random() * 0.4), color: colors[i % colors.length], size: Math.random() < 0.3 ? 2 : 1 })
  }
}

// Counts of kicks, headers, posts, whistles, goals and bounces only go up, so a skipped
// snapshot still sounds every one of them
function react (before, view) {
  if (!before) return
  const [kicks0, heads0, posts0, whistles0, goals0, bounces0] = before.counts
  const [kicks1, heads1, posts1, whistles1, goals1, bounces1] = view.counts
  if (kicks1 > kicks0) {
    sound.play('kick', view.lastHit)
    burst(view.ball.x, view.ball.y, 5, 50, ['#f6f6f0', '#c4f27a'], 0.35)
    if (view.lastHit > 0.85 && !reduceMotion) shake = Math.max(shake, 0.3)
  }
  if (heads1 > heads0) sound.play('board', Math.max(0.4, view.lastHit))
  if (posts1 > posts0) {
    sound.play('post')
    haptics.buzz('hit')
    burst(view.ball.x, view.ball.y, 8, 70, ['#ffd23a', '#f6f6f0'], 0.4)
  }
  if (bounces1 > bounces0) sound.play('bounce')
  if (whistles1 > whistles0) sound.play('whistle', view.phase === 'end')
  if (goals1 > goals0 && view.lastGoal) celebrate(view)
  if (view.golden && !before.golden) say(props.t.headballGolden, props.t.headballGoldenHint, 2.5, '#ffd23a')
  if (view.phase === 'ready' && Math.ceil(view.timer) !== Math.ceil(before.timer) && view.timer > 0) sound.play('tick')
  if (view.phase === 'end' && before.phase !== 'end' && mySide >= 0) {
    haptics.buzz(view.score[mySide] > view.score[1 - mySide] ? 'win' : 'over')
  }
}

function celebrate (view) {
  const { side } = view.lastGoal
  const sub = side === mySide ? props.t.headballYouScore : fmt(props.t.headballScoredBy, { name: names.value[side] || '?' })
  say(props.t.headballGoal, sub, 2, side === 0 ? '#ff8a6a' : '#8ab4ff')
  sound.play('cheer')
  if (mySide >= 0) haptics.buzz(side === mySide ? 'win' : 'wrong')
  cheer = side
  crowdJump = 1
  const x = side === 0 ? W - GOAL_W / 2 : GOAL_W / 2
  burst(x, GROUND - 30, reduceMotion ? 12 : 50, 120, CONFETTI, 1.6)
  if (!reduceMotion) flash = 1
}

function effects (dt) {
  flash = Math.max(0, flash - dt * 3)
  shake = Math.max(0, shake - dt * 3)
  crowdJump = Math.max(0, crowdJump - dt * 0.5)
  for (let i = particles.length - 1; i >= 0; i--) {
    const q = particles[i]
    q.life -= dt
    if (q.life <= 0) {
      particles.splice(i, 1)
      continue
    }
    q.vy += 160 * dt
    q.vx *= 1 - 1.5 * dt
    q.x += q.vx * dt
    q.y += q.vy * dt
  }
}

// ---------- Drawing ----------

function banners (view, texts) {
  const add = (text, dy, size, style = {}) => texts.push({ text: upper(text), dy, size, ...style })
  const now = seconds()
  if (view.phase === 'ready') {
    add(String(Math.max(1, Math.ceil(view.timer))), -2, 5, { color: '#ffd23a' })
  }
  if (view.phase === 'end') {
    const [a, b] = view.score
    add(props.t.headballFullTime, -3.5, 4)
    add(a === b ? props.t.headballDraw : fmt(props.t.headballWins, { name: names.value[a > b ? 0 : 1] || '?' }), 0.8, 1.6, { min: 14 })
  } else if (message && now < message.until) {
    const alpha = Math.min(1, (message.until - now) / 0.3)
    add(message.text, -3, 5, { color: message.color, alpha })
    if (message.sub) add(message.sub, 1, 1.5, { min: 13, alpha })
  }
}

function render (view, time) {
  const scene = { view, looks: looks.value, me: mySide, cheer: -1, crowdJump, particles, texts: [], flash, shake, time }
  if (view) {
    if (view.phase === 'goal' || view.phase === 'end') {
      scene.cheer = view.phase === 'end' ? (view.score[0] === view.score[1] ? -1 : view.score[0] > view.score[1] ? 0 : 1) : cheer
    }
    banners(view, scene.texts)
  }
  if (props.mode === 'guest' && performance.now() - (lastSnapAt || mountedAt) > STALL_MS) {
    scene.texts.push({ text: upper(props.t.headballWaitingHost), dy: 4, size: 1.3, min: 12 })
  }
  renderer.draw(scene)
}

function updateHud (view) {
  if (!view) return
  if (hud.score[0] !== view.score[0] || hud.score[1] !== view.score[1]) hud.score = view.score.slice()
  hud.golden = view.golden
  const left = Math.max(0, Math.ceil(view.clock))
  hud.clock = view.golden ? upper(props.t.headballGoldenShort) : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
  hud.hurry = !view.golden && view.phase === 'play' && left <= 10
}

let lastFrame = 0

function frame (alpha) {
  const now = performance.now()
  const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0
  lastFrame = now
  if (props.mode === 'guest') pullSnapshots()
  const view = match ? hostView(alpha) : guestView()
  if (view) {
    react(lastView, view)
    lastView = view
  }
  if (!props.paused) effects(dt)
  render(view, now / 1000)
  updateHud(view)
}

function after () {
  if (props.mode === 'host' && match) emit('snapshot', { r: props.round, ...snapshot(match) })
  sendControls()
}

// The pitch keeps its shape and gets all the room it can. Held upright on a touch screen the
// buttons get a band of their own under it; sideways they sit over its corners.
function fit () {
  const el = area.value
  if (!el || !renderer) return
  const w = el.clientWidth
  const h = el.clientHeight
  const upright = h > w
  const reserve = touchUi.value && upright && !watching.value ? PADS_H : 0
  box.reserve = reserve
  const room = Math.max(0, h - reserve - (reserve && !full.value ? 56 : 0)) // and the hint under it
  const scale = Math.min(w / W, room / H)
  box.w = Math.floor(W * scale)
  box.h = Math.floor(H * scale)
  renderer.resize(box.w, box.h, Math.min(window.devicePixelRatio || 1, 3))
}

watch(() => props.round, () => {
  newMatch()
  fit()
})
watch(touchUi, () => nextTick(fit))

onMounted(() => {
  renderer = createRenderer(canvas.value)
  newMatch()
  observer = new ResizeObserver(fit)
  observer.observe(area.value)
  fit()
  stopFonts = watchFonts(() => {})
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', releaseAll)
  window.addEventListener('touchstart', onTouch, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
  for (const type of ['touchstart', 'touchmove', 'touchend']) area.value.addEventListener(type, guardTouch, { passive: false })
  stopLoop = startLoop({ step: STEP, tick, after, draw: frame, paused: () => props.paused })
  if (import.meta.env.DEV) {
    window.__headball = { get match () { return match }, get view () { return lastView }, get side () { return mySide }, get mode () { return props.mode } }
  }
})

onUnmounted(() => {
  stopLoop?.()
  observer?.disconnect()
  stopFonts?.()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', releaseAll)
  window.removeEventListener('touchstart', onTouch)
  document.removeEventListener('visibilitychange', onVisibility)
  if (import.meta.env.DEV) delete window.__headball
})

const showPads = computed(() => touchUi.value && !watching.value)
</script>

<template>
  <ArcadeStage :t="t" :title="title" :exitLabel="exitLabel" :bare="full" @exit="emit('exit')">
    <template #actions>
      <slot name="actions" />
      <FullscreenButton :t="t" @toggle="onFullClick" />
    </template>

    <div :class="['hb-ui relative flex-1 min-h-0 flex flex-col', { 'is-full': full }]">
      <!-- Score bar: each player's name and score, the clock between; full screen, smaller, with the way out -->
      <div class="hud" aria-hidden="true">
        <p class="side side-0">
          <span class="chip red"></span>
          <span class="name truncate">{{ names[0] }}</span>
          <span class="score">{{ hud.score[0] }}</span>
        </p>
        <p :class="['clock', { hurry: hud.hurry, golden: hud.golden }]">{{ hud.clock }}</p>
        <p class="side side-1">
          <span class="score">{{ hud.score[1] }}</span>
          <span class="name truncate">{{ names[1] }}</span>
          <span class="chip blue"></span>
        </p>
        <FullscreenButton v-if="full" :t="t" full class="exit-full" @toggle="onFullClick" />
      </div>
      <p class="sr-only" aria-live="polite">{{ names[0] }} {{ hud.score[0] }}, {{ names[1] }} {{ hud.score[1] }}</p>

      <div
        ref="area"
        class="relative flex-1 min-h-0 flex flex-col items-center justify-center touch-none select-none"
        :style="{ paddingBottom: box.reserve ? `${box.reserve}px` : null }"
        @contextmenu.prevent
      >
        <div class="stage relative shrink-0" :style="{ width: `${box.w}px`, height: `${box.h}px` }">
          <canvas ref="canvas" class="block" role="img" :aria-label="title"></canvas>
          <slot name="overlay" />
        </div>

        <div v-if="watching" class="watching">{{ t.headballWatching }}</div>
        <p v-else-if="box.reserve && !full" class="turn-hint">{{ t.headballTurnHint }}</p>

        <!-- The thumbs: run on the left, jump and kick on the right -->
        <template v-if="showPads">
          <div class="pads-left">
            <button
              v-for="side in ['left', 'right']"
              :key="side"
              type="button"
              :class="['pad', { held: pads[side] }]"
              :aria-label="side === 'left' ? t.headballLeft : t.headballRight"
              @pointerdown="padDown(side, $event)"
              @pointerup="padUp(side, $event)"
              @pointercancel="padUp(side, $event)"
            >
              <svg viewBox="-50 -50 100 100" aria-hidden="true">
                <path :d="side === 'left' ? 'M 18 -28 L -24 0 L 18 28 Z' : 'M -18 -28 L 24 0 L -18 28 Z'" />
              </svg>
            </button>
          </div>
          <div class="pads-right">
            <button
              type="button"
              :class="['pad jump', { held: pads.jump }]"
              :aria-label="t.headballJump"
              @pointerdown="padDown('jump', $event)"
              @pointerup="padUp('jump', $event)"
              @pointercancel="padUp('jump', $event)"
            >
              <svg viewBox="-50 -50 100 100" aria-hidden="true">
                <path d="M 0 -26 L 26 10 L -26 10 Z" />
              </svg>
              <span class="word">{{ t.headballJump }}</span>
            </button>
            <button
              type="button"
              :class="['pad kick', { held: pads.kick }]"
              :aria-label="t.headballKick"
              @pointerdown="padDown('kick', $event)"
              @pointerup="padUp('kick', $event)"
              @pointercancel="padUp('kick', $event)"
            >
              <span class="word big">{{ t.headballKick }}</span>
            </button>
          </div>
        </template>
      </div>
    </div>
  </ArcadeStage>
</template>

<style scoped>
/* Crater Duel's pixel panels: dark slate, hard black edges with a lighter bevel, the pixel font */
.hb-ui {
  --ui-bg: #1d1a33;
  --ui-deep: #100e1e;
  --ui-hi: #3c3766;
  --ui-text: #f2efe6;
  --ui-dim: #9c97bc;
  --ui-gold: #ffd23a;
  --pixel-edge: 0 0 0 2px #000, inset 2px 2px 0 var(--ui-hi), inset -2px -2px 0 var(--ui-deep);
  background: var(--ui-deep);
  color: var(--ui-text);
  font-family: var(--font-display);
  text-shadow: none;
}

.hud {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.6rem;
  background: var(--ui-bg);
  border-bottom: 3px solid #000;
  flex-shrink: 0;
}
.is-full .hud {
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto;
  padding: 0.2rem 0.5rem;
  padding-top: max(0.2rem, env(safe-area-inset-top));
}
.side {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}
.side-1 {
  justify-content: flex-end;
}
.chip {
  flex-shrink: 0;
  width: 0.7rem;
  height: 0.7rem;
  box-shadow: 0 0 0 2px #000;
}
.chip.red {
  background: #e8402a;
}
.chip.blue {
  background: #2f6ee8;
}
.name {
  font-size: 1.15rem;
  line-height: 1;
  min-width: 0;
}
.score {
  flex-shrink: 0;
  min-width: 2.2rem;
  padding: 0.05rem 0.4rem 0;
  background: var(--ui-deep);
  box-shadow: var(--pixel-edge);
  font-size: 2rem;
  line-height: 1;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.is-full .score {
  font-size: 1.5rem;
  min-width: 1.8rem;
}
.clock {
  padding: 0.1rem 0.7rem 0;
  background: var(--ui-deep);
  box-shadow: var(--pixel-edge);
  font-size: 1.9rem;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.is-full .clock {
  font-size: 1.4rem;
}
.clock.hurry {
  color: #ff5c4a;
}
.clock.golden {
  color: var(--ui-gold);
  font-size: 1.2rem;
  padding-top: 0.25rem;
  padding-bottom: 0.15rem;
}
.exit-full {
  background: var(--ui-deep);
}

.stage {
  box-shadow: 0 0 0 3px #000;
  image-rendering: pixelated;
}

.watching {
  margin-top: 0.5rem;
  padding: 0.2rem 0.6rem;
  background: var(--ui-bg);
  box-shadow: var(--pixel-edge);
  color: var(--ui-dim);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.turn-hint {
  margin-top: 0.8rem;
  padding: 0 1rem;
  color: var(--ui-dim);
  font-size: 1.1rem;
  line-height: 1.2;
  text-align: center;
}

/* The thumb buttons: big pixel blocks in the bottom corners */
.pads-left,
.pads-right {
  position: absolute;
  bottom: max(14px, env(safe-area-inset-bottom));
  display: flex;
  align-items: flex-end;
  gap: 12px;
  z-index: 5;
}
.pads-left {
  left: max(12px, env(safe-area-inset-left));
}
.pads-right {
  right: max(12px, env(safe-area-inset-right));
}
.pad {
  position: relative;
  width: 76px;
  height: 76px;
  background: rgb(29 26 51 / 0.72);
  box-shadow: var(--pixel-edge);
  color: var(--ui-text);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.pad svg {
  width: 100%;
  height: 100%;
}
.pad path {
  fill: var(--ui-text);
}
.pad.held {
  background: rgb(60 55 102 / 0.9);
  transform: translateY(2px);
}
.pad.jump {
  margin-bottom: 34px;
}
.pad.jump svg {
  height: 70%;
}
.pad.kick {
  width: 92px;
  height: 92px;
  background: rgb(232 64 42 / 0.8);
  box-shadow: 0 0 0 2px #000, inset 3px 3px 0 #ff8a6a, inset -3px -3px 0 #9a2216;
}
.pad.kick.held {
  background: rgb(200 50 30 / 0.95);
}
.word {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 4px;
  font-size: 0.95rem;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.word.big {
  position: static;
  font-size: 1.6rem;
}

/* A short phone held sideways: smaller buttons, so they cover less of the pitch */
@media (max-height: 430px) {
  .pad {
    width: 64px;
    height: 64px;
  }
  .pad.kick {
    width: 78px;
    height: 78px;
  }
  .pad.jump {
    margin-bottom: 26px;
  }
}
</style>
