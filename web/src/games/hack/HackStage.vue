<script setup>
import { reactive, ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import confetti from 'canvas-confetti'
import ArcadeStage from '../ascii/ArcadeStage.vue'
import { sound } from '../ascii/sound'
import { haptics } from '../ascii/haptics'
import { KEYBOARDS, normalize, upper, isLetter, pickPassword } from './words'
import {
  TRACE_MAX, TRACE_PER_TRY, TRACE_PER_SCAN, TRACE_TICK_SECONDS, TRACE_ALARM,
  lengthForLayer, mark, rememberKeys, traceRefund, points
} from './engine'

// One sitting at the terminal: a hack run (layer after layer under the trace meter) or practice
// (one password at a time, no meter). Letters come from the keyboard or the on-screen keys;
// each attempt is marked letter by letter as its tiles turn over.

const props = defineProps({
  t: { type: Object, required: true },
  title: { type: String, required: true },
  exitLabel: { type: String, required: true },
  mode: { type: String, default: 'run' }, // run | practice
  lang: { type: String, required: true },
  length: { type: Number, default: 5 }, // practice only
  best: { type: Number, default: 0 } // run only: the best score so far, for the New best! badge
})

const emit = defineEmits(['exit', 'over'])

const TILE_MS = 120 // between one tile turning over and the next
const CRACKED_MS = 1700 // the cracked password shows before the next layer boots
const BOOT_MS = 650 // the password slots scramble while a layer boots
const SCRAMBLE_MS = 55
const run = props.mode === 'run'

const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const up = (text) => upper(props.lang, text)

const s = reactive({
  phase: 'boot', // boot | play | reveal | cracked | over | lost (practice: gave up)
  layer: 1,
  length: 4,
  password: [],
  rows: [], // { letters, marks, shown }: shown is how many tiles have turned over
  input: [],
  keys: {}, // letter -> best mark so far
  known: [], // per position: the letter, once a hit or a scan has shown it
  scanned: [], // positions a scan showed
  tries: 0,
  scans: 0,
  trace: 0,
  score: 0,
  cracked: 0,
  gained: 0, // points for the layer just cracked
  message: '',
  error: false,
  shake: 0, // bumped to shake the row being typed
  paused: false,
  newBest: false,
  scramble: [] // letters flashing through the slots while a layer boots
})

const used = new Set()
let timers = []
let tickTimer = null
let traceClock = 0
let scrambleTimer = null

const later = (ms, run) => {
  const id = setTimeout(() => {
    timers = timers.filter(other => other !== id)
    run()
  }, reduceMotion ? Math.min(ms, 150) : ms)
  timers.push(id)
}

function clearTimers () {
  timers.forEach(clearTimeout)
  timers = []
  clearInterval(scrambleTimer)
  scrambleTimer = null
}

// ---------- Layers ----------

function start () {
  clearTimers()
  used.clear()
  Object.assign(s, { layer: 1, trace: 0, score: 0, cracked: 0, newBest: false, paused: false })
  boot()
}

// A new password: the slots scramble, then it's ready
function boot () {
  const length = run ? lengthForLayer(s.layer) : props.length
  const word = pickPassword(props.lang, length, used)
  used.add(word)
  Object.assign(s, {
    phase: 'boot',
    length,
    password: [...word],
    rows: [],
    input: [],
    keys: {},
    known: Array(length).fill(''),
    scanned: [],
    tries: 0,
    scans: 0,
    gained: 0,
    error: false,
    message: run ? fmt(props.t.hackLayerUp, { n: s.layer, len: length }) : fmt(props.t.hackLetters, { n: length })
  })
  traceClock = 0
  sound.play('glitch')
  const letters = [...(KEYBOARDS[props.lang].join(''))]
  scrambleTimer = setInterval(() => {
    s.scramble = Array.from({ length }, () => letters[Math.floor(Math.random() * letters.length)])
  }, SCRAMBLE_MS)
  later(BOOT_MS, () => {
    clearInterval(scrambleTimer)
    scrambleTimer = null
    s.scramble = []
    s.phase = 'play'
    sound.play('go')
  })
}

// ---------- Typing ----------

const canType = () => s.phase === 'play' && !s.paused

function type (ch) {
  if (!canType() || s.input.length >= s.length) return
  s.input.push(ch)
  s.error = false
  sound.play('tock')
  haptics.buzz('tick')
}

function erase () {
  if (!canType() || !s.input.length) return
  s.input.pop()
  s.error = false
}

function complain (text) {
  s.message = text
  s.error = true
  s.shake++
  sound.play('board', 0.8)
  haptics.buzz('wrong')
}

function submit () {
  if (!canType()) return
  if (s.input.length < s.length) {
    complain(fmt(props.t.hackNeedLetters, { n: s.length }))
    return
  }
  const word = s.input.join('')
  if (s.rows.some(row => row.letters.join('') === word)) {
    complain(props.t.hackRepeat)
    return
  }
  const letters = [...s.input]
  const marks = mark(letters, s.password)
  s.rows.push({ letters, marks, shown: 0 })
  s.input = []
  s.tries++
  s.error = false
  s.message = ''
  s.phase = 'reveal'
  if (run) addTrace(TRACE_PER_TRY)
  haptics.buzz('tap')
  scrollLog()
  turnOver(s.rows.length - 1, 0)
}

// The tiles turn over one by one, each with its own sound: a rising koto string for every hit
function turnOver (index, tile) {
  const row = s.rows[index]
  if (tile >= s.length) {
    settle(row)
    return
  }
  row.shown = tile + 1
  const result = row.marks[tile]
  if (result === 'hit') sound.play('koto', 2 + tile)
  else if (result === 'near') sound.play('bounce')
  later(TILE_MS, () => turnOver(index, tile + 1))
}

// Once every tile is over: the keyboard and the password slots learn from it, then the layer
// either falls or the next attempt is up
function settle (row) {
  rememberKeys(s.keys, row.letters, row.marks)
  row.marks.forEach((result, i) => {
    if (result === 'hit') s.known[i] = row.letters[i]
  })
  if (row.marks.every(result => result === 'hit')) {
    crack()
    return
  }
  if (run && s.trace >= TRACE_MAX) {
    caught()
    return
  }
  s.phase = 'play'
}

function crack () {
  s.phase = 'cracked'
  s.cracked++
  s.message = up(props.t.hackGranted)
  sound.play('strum', 3, 6)
  later(250, () => sound.play('rin'))
  haptics.buzz('win')
  if (!run) return
  s.gained = points(s.length, s.tries, s.scans)
  s.score += s.gained
  s.trace = Math.max(0, s.trace - traceRefund(s.tries))
  later(CRACKED_MS, () => {
    s.layer++
    boot()
  })
}

// ---------- The trace ----------

function addTrace (amount) {
  const before = s.trace
  s.trace = Math.min(TRACE_MAX, s.trace + amount)
  if (before < TRACE_ALARM && s.trace >= TRACE_ALARM) {
    sound.play('tick')
    later(160, () => sound.play('tick'))
    haptics.buzz('combo')
  }
}

function caught () {
  clearTimers()
  s.phase = 'over'
  s.newBest = s.score > props.best
  s.message = ''
  sound.play('boom')
  later(350, () => sound.play('fall'))
  haptics.buzz('over')
  emit('over', { score: s.score, layer: s.layer, cracked: s.cracked })
  if (s.newBest && s.score > 0 && !reduceMotion) {
    later(500, () => confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ['#00ff00', '#00b300', '#007a00'], shapes: ['square'] }))
  }
}

// Time raises the trace by 1% every few seconds while a password is up, not while paused
function onTick () {
  if (!run || s.paused || document.hidden || (s.phase !== 'play' && s.phase !== 'reveal')) return
  traceClock++
  if (traceClock < TRACE_TICK_SECONDS) return
  traceClock = 0
  addTrace(1)
  if (s.trace >= TRACE_MAX && s.phase === 'play') caught()
}

// ---------- Scan, give up, pause ----------

const unknown = computed(() => s.known.map((ch, i) => (ch ? -1 : i)).filter(i => i >= 0))
// A scan never shows the last unknown letter: that one is yours to find
const canScan = computed(() => s.phase === 'play' && !s.paused && unknown.value.length >= 2)

function scan () {
  if (s.phase !== 'play' || s.paused) return
  if (!canScan.value) {
    complain(props.t.hackNoScan)
    return
  }
  const i = unknown.value[Math.floor(Math.random() * unknown.value.length)]
  const ch = s.password[i]
  s.known[i] = ch
  s.scanned.push(i)
  s.keys[ch] = 'hit'
  s.scans++
  s.error = false
  s.message = ''
  sound.play('glitch')
  haptics.buzz('combo')
  if (run) {
    addTrace(TRACE_PER_SCAN)
    if (s.trace >= TRACE_MAX) caught()
  }
}

function giveUp () {
  if (run || s.phase !== 'play') return
  s.phase = 'lost'
  s.known = [...s.password]
  s.message = ''
  sound.play('fall')
  haptics.buzz('wrong')
}

function togglePause () {
  if (!run || (s.phase !== 'play' && s.phase !== 'reveal' && !s.paused)) return
  s.paused = !s.paused
}

function onVisibility () {
  if (document.hidden && run && (s.phase === 'play' || s.phase === 'reveal')) s.paused = true
}

// ---------- Input ----------

function onKey (event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (event.target.closest?.('button') && (event.key === 'Enter' || event.key === ' ')) return
  sound.unlock()
  if (event.key === 'Escape') {
    togglePause()
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    if (s.phase === 'over') start()
    else if (s.phase === 'cracked' && !run) boot()
    else if (s.phase === 'lost') boot()
    else submit()
  } else if (event.key === 'Backspace') {
    event.preventDefault()
    erase()
  } else if (event.key === '?') {
    event.preventDefault()
    scan()
  } else {
    const ch = normalize(props.lang, event.key)
    if (isLetter(props.lang, ch)) {
      event.preventDefault()
      type(ch)
    }
  }
}

// Clicked buttons let go of focus, so Enter goes back to the game
function press (event, run) {
  sound.unlock()
  run()
  if (event.detail) event.currentTarget.blur()
}

// ---------- View ----------

const log = ref(null)
function scrollLog () {
  nextTick(() => {
    if (log.value) log.value.scrollTop = log.value.scrollHeight
  })
}

const keyRows = computed(() => KEYBOARDS[props.lang].map(row => [...row]))
const slots = computed(() => s.known.map((ch, i) => (s.scramble.length ? s.scramble[i] : ch)))
const typing = computed(() => Array.from({ length: s.length }, (_, i) => s.input[i] || ''))
const traceCells = 20
const traceBar = computed(() => {
  const filled = Math.round((s.trace / TRACE_MAX) * traceCells)
  return '#'.repeat(filled) + '.'.repeat(traceCells - filled)
})
const alarm = computed(() => run && s.trace >= TRACE_ALARM && s.phase !== 'over')
// Tiles as big as the screen's width allows for this many letters, up to 3.25rem
const tileStyle = computed(() => ({ '--tile': `min(3.25rem, calc((100vw - 2.5rem) / ${s.length} - 0.4rem))` }))

const markWord = (result) => ({ hit: props.t.hackHit, near: props.t.hackNear, miss: props.t.hackMiss })[result]
const rowLabel = (row) => row.letters.map((ch, i) => `${up(ch)}: ${markWord(row.marks[i])}`).join(', ')

watch(() => s.message, () => scrollLog())

onMounted(() => {
  window.addEventListener('keydown', onKey)
  document.addEventListener('visibilitychange', onVisibility)
  tickTimer = setInterval(onTick, 1000)
  start()
})

onUnmounted(() => {
  clearTimers()
  clearInterval(tickTimer)
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <ArcadeStage :t="t" :title="title" :exitLabel="exitLabel" :soundKey="false" @exit="emit('exit')">
    <template #actions>
      <button
        v-if="run"
        type="button"
        class="term-icon-btn shrink-0 h-9 text-xs"
        :aria-label="s.paused ? t.hackResume : t.hackPause"
        :disabled="s.phase === 'over' || s.phase === 'cracked' || s.phase === 'boot'"
        @click="press($event, togglePause)"
      >
        {{ s.paused ? '[>]' : '[||]' }}
      </button>
    </template>

    <div class="relative flex-1 min-h-0 flex flex-col items-center px-2 pt-2 pb-2 sm:px-4 sm:pt-4 touch-manipulation" :style="tileStyle">
      <div class="w-full max-w-lg flex-1 min-h-0 flex flex-col gap-2">
        <!-- Layer, score and the trace meter; practice counts tries -->
        <div v-if="run" class="hud">
          <span class="term-chip tabular-nums">{{ fmt(t.hackLayer, { n: s.layer }) }}</span>
          <span class="flex-1 text-center tabular-nums"><span class="term-label">{{ t.hackScore }}</span> <span class="font-display text-2xl leading-none">{{ s.score }}</span></span>
          <span class="tabular-nums term-muted text-xs">{{ t.hackBest }} {{ Math.max(best, s.score) }}</span>
        </div>
        <div v-if="run" :class="['trace', { 'is-alarm': alarm }]" role="meter" :aria-label="t.hackTrace" aria-valuemin="0" :aria-valuemax="TRACE_MAX" :aria-valuenow="Math.round(s.trace)">
          <span class="term-label shrink-0">{{ t.hackTrace }}</span>
          <span class="flex-1 min-w-0 overflow-hidden whitespace-pre" aria-hidden="true">[{{ traceBar }}]</span>
          <span class="shrink-0 w-12 text-right tabular-nums font-semibold">{{ Math.round(s.trace) }}%</span>
        </div>
        <div v-else class="hud">
          <span class="term-chip">{{ fmt(t.hackLetters, { n: s.length }) }}</span>
          <span class="flex-1"></span>
          <span class="tabular-nums"><span class="term-label">{{ t.hackTries }}</span> <span class="font-display text-2xl leading-none">{{ s.tries }}</span></span>
        </div>

        <!-- What's known of the password so far -->
        <div class="flex items-center justify-center gap-2">
          <span class="term-label shrink-0 max-[379px]:hidden">{{ t.hackPassword }}</span>
          <div class="row" :aria-label="t.hackPassword">
            <span
              v-for="(ch, i) in slots"
              :key="i"
              :class="['slot', { 'is-known': ch && !s.scramble.length, 'is-scan': s.scanned.includes(i) && !s.scramble.length, 'is-boot': s.scramble.length }]"
            >{{ ch ? up(ch) : '_' }}</span>
          </div>
        </div>

        <!-- Every attempt on this layer, and the one being typed -->
        <div ref="log" class="log flex-1 min-h-0 overflow-y-auto py-1">
          <div class="flex flex-col items-center gap-1.5">
            <div v-for="(row, index) in s.rows" :key="index" class="row" role="img" :aria-label="rowLabel(row)">
              <span
                v-for="(ch, i) in row.letters"
                :key="i"
                :class="['tile', i < row.shown ? `is-${row.marks[i]} is-turned` : 'is-typed']"
              >{{ up(ch) }}</span>
            </div>

            <div v-if="s.phase === 'play' || s.phase === 'boot'" :key="`typing-${s.shake}`" :class="['row', { 'is-shaking': s.shake && s.error }]">
              <span
                v-for="(ch, i) in typing"
                :key="i"
                :class="['tile', ch ? 'is-typed' : 'is-empty', { 'is-cursor': i === s.input.length && s.phase === 'play' }]"
              >{{ up(ch) }}</span>
            </div>
          </div>
        </div>

        <!-- Messages: errors, layers, and the result of a layer -->
        <p :class="['message', { 'is-error': s.error, 'is-good': s.phase === 'cracked' }]" aria-live="polite">
          <template v-if="s.phase === 'cracked' && run">&gt; {{ s.message }} <span class="font-semibold">+{{ s.gained }}</span></template>
          <template v-else-if="s.message">&gt; {{ s.message }}</template>
        </p>

        <!-- Scan, and give up in practice -->
        <div class="flex gap-2">
          <button type="button" class="term-btn act flex-1" :disabled="!canScan" @click="press($event, scan)">
            [?] {{ t.hackScan }}<span v-if="run" class="cost">{{ fmt(t.hackScanCost, { n: TRACE_PER_SCAN }) }}</span>
          </button>
          <button v-if="!run" type="button" class="term-btn act flex-1" :disabled="s.phase !== 'play'" @click="press($event, giveUp)">{{ t.hackGiveUp }}</button>
        </div>

        <!-- The keyboard, laid out like the password language's own; Enter and Delete on the last row -->
        <div class="keyboard" role="group" :aria-label="t.hackKeyboard">
          <div v-for="(row, r) in keyRows" :key="r" class="key-row">
            <button
              v-if="r === keyRows.length - 1"
              type="button"
              class="key wide"
              :aria-label="t.hackEnter"
              @click="press($event, submit)"
            >{{ t.hackEnter }}</button>
            <button
              v-for="ch in row"
              :key="ch"
              type="button"
              :class="['key', s.keys[ch] ? `is-${s.keys[ch]}` : '']"
              @click="press($event, () => type(ch))"
            >{{ up(ch) }}</button>
            <button
              v-if="r === keyRows.length - 1"
              type="button"
              class="key wide"
              :aria-label="t.hackDelete"
              @click="press($event, erase)"
            >&lt;-</button>
          </div>
        </div>
      </div>

      <!-- Cracked in practice, or given up -->
      <div v-if="!run && (s.phase === 'cracked' || s.phase === 'lost')" class="overlay">
        <div class="term-window w-full max-w-xs p-5 text-center" role="dialog" aria-modal="false">
          <p class="term-label">{{ s.phase === 'cracked' ? t.hackGranted : t.hackLockedOut }}</p>
          <p class="font-display text-5xl leading-none mt-2 tracking-widest">{{ up(s.password.join('')) }}</p>
          <p class="mt-2 text-sm term-muted">{{ s.phase === 'cracked' ? fmt(t.hackCracked, { n: s.tries }) : t.hackGaveUp }}</p>
          <button type="button" class="term-btn term-btn-primary w-full mt-5" @click="press($event, boot)">{{ t.hackNext }}</button>
          <button type="button" class="term-btn w-full mt-2" @click="emit('exit')">{{ t.hackMenu }}</button>
        </div>
      </div>

      <!-- Caught -->
      <div v-else-if="s.phase === 'over'" class="overlay">
        <div class="term-window w-full max-w-xs p-5 text-center" role="dialog" aria-modal="false" :aria-label="t.hackCaught">
          <p class="font-display text-5xl leading-none uppercase term-blink">{{ t.hackCaught }}</p>
          <p class="mt-2 text-sm term-muted">{{ fmt(t.hackCaughtDesc, { n: s.layer }) }}</p>
          <p class="mt-1 text-sm">{{ fmt(t.hackWas, { word: up(s.password.join('')) }) }}</p>
          <dl class="mt-4 grid grid-cols-[auto_auto] justify-center items-baseline gap-x-4 gap-y-1 text-left">
            <dt class="term-label">{{ t.hackScore }}</dt>
            <dd class="font-display text-4xl leading-none tabular-nums">{{ s.score }}</dd>
            <dt class="term-label">{{ t.hackLayers }}</dt>
            <dd class="font-display text-3xl leading-none tabular-nums">{{ s.cracked }}</dd>
            <dt class="term-label">{{ t.hackBest }}</dt>
            <dd class="font-display text-3xl leading-none tabular-nums">{{ Math.max(best, s.score) }}</dd>
          </dl>
          <p v-if="s.newBest && s.score > 0" class="term-inverse inline-block mt-3 px-2 py-0.5 text-sm font-bold uppercase tracking-widest">{{ t.hackNewBest }}</p>
          <button type="button" class="term-btn term-btn-primary w-full mt-5" @click="press($event, start)">{{ t.hackRetry }}</button>
          <button type="button" class="term-btn w-full mt-2" @click="emit('exit')">{{ t.hackMenu }}</button>
        </div>
      </div>

      <!-- Paused -->
      <div v-else-if="s.paused" class="overlay bg-black/80">
        <div class="term-window w-full max-w-xs p-5 text-center">
          <h2 class="font-display text-5xl leading-none uppercase term-blink">{{ t.hackPaused }}</h2>
          <button type="button" class="term-btn term-btn-primary w-full mt-5" @click="press($event, togglePause)">{{ t.hackResume }}</button>
          <p class="term-muted text-xs mt-3">{{ t.hackPausedHint }}</p>
        </div>
      </div>
    </div>
  </ArcadeStage>
</template>

<style scoped>
.hud {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2rem;
  font-size: 0.875rem;
}

.trace {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-term-dim);
}
.trace.is-alarm {
  color: var(--color-term);
  animation: alarm 0.8s steps(2, jump-none) infinite;
}

.row {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: var(--tile);
  gap: 0.4rem;
}

/* The password's slots: what's known shows lit, a scanned letter dashed */
.slot {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(var(--tile) * 0.85);
  border-bottom: 2px solid var(--color-term-low);
  font-family: var(--font-display);
  font-size: calc(var(--tile) * 0.62);
  line-height: 1;
  color: var(--color-term-low);
}
.slot.is-known {
  color: var(--color-term);
  border-bottom-color: var(--color-term);
  text-shadow: 0 0 8px rgb(0 255 0 / 0.6);
  animation: decode 0.35s ease-out;
}
.slot.is-scan {
  border-bottom-style: dashed;
}
.slot.is-boot {
  color: var(--color-term-dim);
}

.tile {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--tile);
  height: var(--tile);
  border: 1px solid var(--color-term-low);
  font-family: var(--font-display);
  font-size: calc(var(--tile) * 0.66);
  line-height: 1;
}
.tile.is-empty {
  border-style: dashed;
}
.tile.is-typed {
  border-color: var(--color-term);
}
.tile.is-cursor {
  border-color: var(--color-term);
  box-shadow: inset 0 -3px 0 var(--color-term);
  animation: cursor 1s steps(2, jump-none) infinite;
}
/* Marks: lit block for the right place, dashed for elsewhere, faint for not in it */
.tile.is-hit {
  background: var(--color-term);
  border-color: var(--color-term);
  color: var(--color-black);
  text-shadow: none;
  box-shadow: 0 0 10px rgb(0 255 0 / 0.45);
}
.tile.is-near {
  border: 2px dashed var(--color-term);
}
.tile.is-miss {
  color: var(--color-term-low);
  border-color: var(--color-term-deep);
  text-shadow: none;
}
.tile.is-turned {
  animation: turn 0.32s ease-out;
}
.row.is-shaking {
  animation: shake 0.4s ease-in-out;
}

.log {
  scrollbar-width: none;
  mask-image: linear-gradient(to bottom, transparent, black 0.75rem);
}
.log::-webkit-scrollbar {
  display: none;
}

.message {
  min-height: 1.25rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--color-term-dim);
}
.message.is-error {
  color: var(--color-term);
}
.message.is-good {
  color: var(--color-term);
  font-weight: 600;
  letter-spacing: 0.08em;
}

.act {
  min-height: 2.5rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
}
.act .cost {
  margin-left: 0.4rem;
  font-size: 0.7rem;
  opacity: 0.75;
}

.keyboard {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding-bottom: env(safe-area-inset-bottom);
}
.key-row {
  display: flex;
  justify-content: center;
  gap: 0.25rem;
}
.key {
  flex: 1 1 0;
  min-width: 0;
  max-width: 2.75rem;
  height: 2.9rem;
  border: 1px solid var(--color-term-low);
  background: transparent;
  color: var(--color-term);
  font-family: var(--font-display);
  font-size: 1.45rem;
  line-height: 1;
  touch-action: manipulation;
}
.key.wide {
  flex: 1.6 1 0;
  max-width: 4.5rem;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.key:active {
  background: var(--color-term-deep);
}
.key.is-hit {
  background: var(--color-term);
  border-color: var(--color-term);
  color: var(--color-black);
  text-shadow: none;
}
.key.is-near {
  border: 2px dashed var(--color-term);
}
.key.is-miss {
  color: var(--color-term-low);
  border-color: var(--color-term-deep);
  text-shadow: none;
}

.overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
  background: rgb(0 0 0 / 0.6);
}

@keyframes turn {
  0% { transform: rotateX(90deg); filter: brightness(2.5); }
  100% { transform: none; filter: none; }
}
@keyframes shake {
  0%, 100% { transform: none; }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
@keyframes decode {
  0% { transform: scale(1.5); filter: brightness(2.5); }
  100% { transform: none; filter: none; }
}
@keyframes cursor {
  0% { box-shadow: inset 0 -3px 0 var(--color-term); }
  50% { box-shadow: none; }
}
@keyframes alarm {
  0% { opacity: 1; }
  50% { opacity: 0.45; }
}

@media (prefers-reduced-motion: reduce) {
  .tile.is-turned,
  .row.is-shaking,
  .slot.is-known,
  .tile.is-cursor,
  .trace.is-alarm {
    animation: none;
  }
}
</style>
