<script setup>
import { ref, reactive, watch, nextTick, onMounted, onUnmounted } from 'vue'
import {
  CELLS, MAX_MISTAKES, HINTS, UNITS, rowOf, colOf,
  createGame, restore, snapshot, place, toggleNote, erase, undo, hint,
  isGiven, isSolved, isOver, clashes, placedCounts
} from './engine'
import { createRenderer } from './renderer'
import ArcadeStage from '../ascii/ArcadeStage.vue'
import { GREEN, DIM, watchFonts, useJapaneseFont, CANVAS_FONTS } from '../ascii/paint'
import { startLoop } from '../ascii/loop'
import { stepParticles, stepSpring } from '../ascii/physics'
import { KATAKANA, glitch, makeBolt, boltGlyphs, boltAlpha, sparks, petal, rocket } from '../ascii/fx'
import { sound } from '../ascii/sound'
import { haptics } from '../ascii/haptics'

// The full-screen puzzle: the board drawn on a canvas that covers the whole play area, so the
// effects can use all of it, with the number pad and tools laid out as buttons around it. The
// game itself lives in the engine; this keeps the time, takes input and plays the effects.
// Progress goes out as `save` after every move, and `finish` once the puzzle is solved or lost.

const props = defineProps({
  t: { type: Object, required: true },
  title: { type: String, required: true },
  exitLabel: { type: String, required: true },
  levelLabel: { type: String, required: true },
  puzzle: { type: String, required: true },
  solution: { type: String, required: true },
  // A new game starts whenever this changes
  gameId: { type: Number, required: true },
  // { progress, time } to pick up from, or null
  saved: { type: Object, default: null },
  paused: { type: Boolean, default: false }
})

const emit = defineEmits(['exit', 'pause', 'save', 'finish'])

const STEP = 1 / 60
const SAVE_SECONDS = 10
const STATUS_H = 28
const PAD_H = 56
const TOOLS_H = 44
const GAP = 12
const SIDE_W = 232 // the controls column beside the board, in landscape
const BOLT_SECONDS = 0.6
const DECODE_SECONDS = 0.6
const GLITCH_EVERY = 0.05
const JP_TEXT = KATAKANA

const area = ref(null)
const canvas = ref(null)
const boardEl = ref(null)
const box = reactive({ size: 0, landscape: false })
const ui = reactive({
  selected: -1,
  notes: false,
  mistakes: 0,
  hints: 0,
  time: 0,
  counts: new Array(10).fill(0),
  canUndo: false
})

const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let renderer = null
let observer = null
let stopLoop = null
let stopFonts = null

let game = null
let clock = 0 // seconds of play on this screen, for effects
let elapsed = 0 // seconds on the puzzle's clock, kept with the save
let saveClock = 0
let finished = false
let later = [] // [{ at, run }] effects waiting their turn, on `clock`

// Per-cell effects, read by the renderer
const marks = new Uint8Array(CELLS)
const pops = new Float32Array(CELLS).fill(1)
const popSprings = Array.from({ length: CELLS }, () => ({ value: 1, velocity: 0 }))
const glow = new Float32Array(CELLS)
const reveal = new Float32Array(CELLS)
const decode = new Float32Array(CELLS)
const glitches = new Array(CELLS).fill('')
let glitchClock = 0
const cursorX = { value: 4, velocity: 0 }
const cursorY = { value: 4, velocity: 0 }
let cursorShown = false

let particles = []
let drift = []
let driftClock = 0
let bolts = []
let floats = []
let debris = null
let stamp = null
let flash = 0
let shake = 0

const schedule = (delay, run) => later.push({ at: clock + delay, run })
const formatTime = (seconds) => {
  const s = Math.floor(seconds)
  const mm = String(Math.floor(s / 60) % 60).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return s >= 3600 ? `${Math.floor(s / 3600)}:${mm}:${ss}` : `${mm}:${ss}`
}
const isActive = () => game && !finished && !isSolved(game) && !isOver(game)

// ---------- Game ----------

function newGame () {
  game = createGame(props.puzzle, props.solution)
  elapsed = 0
  if (props.saved) {
    restore(game, props.saved.progress)
    elapsed = Math.max(0, Number(props.saved.time) || 0)
  }
  finished = false
  later = []
  saveClock = 0
  particles = []
  bolts = []
  floats = []
  debris = null
  stamp = null
  flash = 0
  shake = 0
  glow.fill(0)
  decode.fill(0)
  for (let i = 0; i < CELLS; i++) {
    popSprings[i].value = pops[i] = 1
    popSprings[i].velocity = 0
    // The board types itself in, from the top-left corner down
    reveal[i] = reduceMotion ? 0 : 0.05 + (rowOf(i) + colOf(i)) * 0.03 + Math.random() * 0.06
  }
  ui.selected = -1
  ui.notes = false
  cursorShown = false
  if (!reduceMotion) sound.play('glitch')
  sync()
}

// Brings the buttons and marks in line with the game after a move
function sync () {
  ui.mistakes = game.mistakes
  ui.hints = game.hints
  ui.time = Math.floor(elapsed)
  ui.counts = Array.from(placedCounts(game))
  ui.canUndo = game.history.length > 0 && isActive()
  marks.fill(0)
  const { wrong, against } = clashes(game)
  for (const i of against) marks[i] |= 2
  for (const i of wrong) marks[i] |= 1
}

// A game that's over leaves nothing to pick up again, so its save is dropped (null)
function save () {
  if (!game) return
  emit('save', isActive() ? { progress: snapshot(game), time: elapsed } : null)
}

function select (cell) {
  if (cell < 0 || cell >= CELLS) return
  if (!cursorShown) {
    cursorX.value = colOf(cell)
    cursorY.value = rowOf(cell)
    cursorX.velocity = cursorY.velocity = 0
    cursorShown = true
  }
  ui.selected = cell
}

function move (dr, dc) {
  const from = ui.selected < 0 ? 40 : ui.selected
  if (ui.selected < 0) return select(from)
  select(((rowOf(from) + dr + 9) % 9) * 9 + ((colOf(from) + dc + 9) % 9))
}

function input (d, asNote = false) {
  if (!isActive() || props.paused || ui.selected < 0) return
  if (asNote || ui.notes) note(d)
  else put(d)
}

function put (d) {
  const result = place(game, ui.selected, d)
  if (!result) return
  sync()
  save()
  played(result)
}

function note (d) {
  if (!toggleNote(game, ui.selected, d)) return
  sound.play('tock')
  haptics.buzz('tick')
  sync()
  save()
}

function clear () {
  if (!isActive() || props.paused || ui.selected < 0 || !erase(game, ui.selected)) return
  sound.play('tock')
  haptics.buzz('tick')
  sync()
  save()
}

function takeBack () {
  if (!isActive() || props.paused) return
  const cell = undo(game)
  if (cell < 0) return
  select(cell)
  glow[cell] = 0.5
  sound.play('tock')
  haptics.buzz('tick')
  sync()
  save()
}

function askHint () {
  if (!isActive() || props.paused || game.hints >= HINTS) return
  const result = hint(game, ui.selected)
  if (!result) return
  select(result.cell)
  sync()
  save()
  // The digit scrambles through katakana before it settles
  sound.play('glitch')
  haptics.buzz('tick')
  decode[result.cell] = reduceMotion ? 0 : DECODE_SECONDS
  played(result, reduceMotion ? 0 : DECODE_SECONDS)
}

function toggleNotes () {
  ui.notes = !ui.notes
  haptics.buzz('tick')
}

// ---------- Effects ----------

// A right digit rings a koto string, higher for bigger digits; completing a row, column or
// box sweeps light through it; the last of a digit rings the bowl; the last cell wins.
function played (result, delay = 0) {
  if (!result.right) return strike(result)
  const { cell, d } = result
  const x = colOf(cell) + 0.5
  const y = rowOf(cell) + 0.5
  schedule(delay, () => {
    sound.play('koto', d + 1)
    haptics.buzz('tap')
    pop(cell, 1.45)
    glow[cell] = 1
    if (!reduceMotion) sparks(particles, x, y, { count: 6, speed: 4, life: 0.4 })
  })
  if (result.units.length) {
    schedule(delay + 0.06, () => {
      sound.play('strum', 3, 4 + result.units.length * 2)
      haptics.buzz('combo')
    })
    for (const unit of result.units) {
      const cells = [...UNITS[unit]].sort((a, b) => distance(a, cell) - distance(b, cell))
      cells.forEach((i, k) => schedule(delay + 0.06 + k * 0.035, () => {
        glow[i] = Math.max(glow[i], 0.85)
        pop(i, 1.18)
      }))
    }
  }
  if (result.digitDone) {
    schedule(delay + 0.3, () => {
      sound.play('rin')
      for (let i = 0; i < CELLS; i++) {
        if (game.values[i] !== d) continue
        glow[i] = 1
        pop(i, 1.25)
      }
    })
  }
  if (result.solved) schedule(delay + 0.55, win)
}

const distance = (a, b) => Math.hypot(rowOf(a) - rowOf(b), colOf(a) - colOf(b))

function pop (cell, scale) {
  if (reduceMotion) return
  popSprings[cell].value = scale
  popSprings[cell].velocity = 0
}

// Lightning from the top of the screen down to (x, y), in cells
function bolt (x, y) {
  if (reduceMotion || !renderer) return
  const top = renderer.bounds().top - 0.5
  const from = x + (Math.random() * 2 - 1) * 2.5
  bolts.push({ glyphs: boltGlyphs(makeBolt(from, top, x, y, { forks: 2 }), 0.32), age: 0, alpha: 1 })
}

// A wrong digit: lightning strikes the cell, and the cells it clashes with blink
function strike ({ cell, over }) {
  const x = colOf(cell) + 0.5
  const y = rowOf(cell) + 0.5
  bolt(x, y)
  sound.play('thunder')
  haptics.buzz('wrong')
  if (!reduceMotion) {
    sparks(particles, x, y, { count: 14, speed: 7, life: 0.5 })
    flash = 0.8
    shake = 0.8
  }
  floats.push({ text: `${game.mistakes}/${MAX_MISTAKES}`, x, y: y - 0.6, vy: -1.2, size: 0.55, display: true, life: 1.1, ttl: 1.1 })
  if (over) lose()
}

// Out of mistakes: more lightning, and every digit falls off the board
function lose () {
  finished = true
  schedule(0.35, () => {
    sound.play('thunder')
    sound.play('taiko')
    haptics.buzz('over')
    bolt(2 + Math.random(), 3 + Math.random() * 3)
    bolt(6 + Math.random(), 3 + Math.random() * 3)
    if (reduceMotion) return
    flash = 1
    shake = 1.4
    debris = []
    for (let i = 0; i < CELLS; i++) {
      if (!game.values[i]) continue
      debris.push({
        d: game.values[i],
        given: isGiven(game, i),
        x: colOf(i) + 0.5,
        y: rowOf(i) + 0.5,
        vx: (Math.random() * 2 - 1) * 3 + (colOf(i) - 4) * 0.4,
        vy: -2 - Math.random() * 6,
        angle: 0,
        spin: (Math.random() * 2 - 1) * 6
      })
    }
  })
  schedule(1.7, () => emit('finish', { won: false, time: elapsed, mistakes: game.mistakes, hints: game.hints }))
}

// Solved: a full strum, the 完 seal stamped across the board, then fireworks and petals
function win () {
  finished = true
  ui.canUndo = false
  sound.play('strum', 0, 9, 0.06)
  haptics.buzz('win')
  schedule(0.45, () => {
    stamp = { age: 0, spring: { value: reduceMotion ? 1 : 2.6, velocity: 0 } }
  })
  schedule(0.6, () => {
    sound.play('taiko')
    haptics.buzz('stamp')
    if (reduceMotion) return
    shake = 0.6
    for (let k = 0; k < 8; k++) sparks(particles, 4.5 + Math.cos(k * 0.8) * 1.9, 4.5 + Math.sin(k * 0.8) * 1.9, { count: 3, speed: 6 })
    const b = renderer.bounds()
    for (let k = 0; k < 40; k++) petal(particles, b.left + Math.random() * (b.right - b.left), b.top - Math.random() * 3, { life: 6, color: k % 3 ? DIM : GREEN })
  })
  if (!reduceMotion) for (let k = 0; k < 6; k++) schedule(1 + k * 0.5, launch)
  schedule(1.5, () => emit('finish', { won: true, time: elapsed, mistakes: game.mistakes, hints: game.hints }))
}

function launch () {
  const b = renderer.bounds()
  const x = b.left + 1 + Math.random() * Math.max(1, b.right - b.left - 2)
  const top = Math.max(b.top + 1, -1) + Math.random() * 5
  sound.play('launch')
  rocket(particles, x, b.bottom, { height: b.bottom - top, size: 2.2 + Math.random(), onBurst: () => sound.play('pop') })
}

// Sakura petals drift down behind the digits now and then
function stepDrift (dt) {
  stepParticles(drift, dt)
  if (reduceMotion || finished) return
  driftClock -= dt
  if (driftClock > 0) return
  driftClock = 1.4 + Math.random() * 1.6
  petal(drift, Math.random() * 9, -0.4, { size: 0.8, life: 7, color: DIM })
}

// ---------- Simulation ----------

function tick () {
  clock += STEP
  for (let k = later.length - 1; k >= 0; k--) {
    if (later[k].at > clock) continue
    const { run } = later[k]
    later.splice(k, 1)
    run()
  }
  for (let i = 0; i < CELLS; i++) {
    const spring = popSprings[i]
    if (spring.value !== 1 || spring.velocity) {
      stepSpring(spring, 1, STEP, 320, 14)
      if (Math.abs(spring.value - 1) < 0.002 && Math.abs(spring.velocity) < 0.02) {
        spring.value = 1
        spring.velocity = 0
      }
      pops[i] = spring.value
    }
    if (reveal[i] > 0) {
      reveal[i] -= STEP
      if (reveal[i] <= 0 && game.values[i]) decode[i] = 0.22
    }
  }
  if (ui.selected >= 0) {
    stepSpring(cursorX, colOf(ui.selected), STEP, 700)
    stepSpring(cursorY, rowOf(ui.selected), STEP, 700)
  }
  if (stamp) {
    stamp.age += STEP
    stepSpring(stamp.spring, 1, STEP, 260, 15)
  }
  if (debris) {
    for (const piece of debris) {
      piece.vy += 30 * STEP
      piece.x += piece.vx * STEP
      piece.y += piece.vy * STEP
      piece.angle += piece.spin * STEP
    }
  }
}

function after (dt) {
  if (isActive() && !reveal.some(r => r > 0)) {
    elapsed += dt
    saveClock += dt
    if (Math.floor(elapsed) !== ui.time) ui.time = Math.floor(elapsed)
    if (saveClock >= SAVE_SECONDS) {
      saveClock = 0
      save()
    }
  }
  flash = Math.max(0, flash - dt * 3)
  shake = Math.max(0, shake - dt * 3)
  for (let i = 0; i < CELLS; i++) {
    if (glow[i] > 0) glow[i] = Math.max(0, glow[i] - dt * 2.2)
    if (decode[i] > 0) decode[i] = Math.max(0, decode[i] - dt)
  }
  glitchClock += dt
  if (glitchClock >= GLITCH_EVERY) {
    glitchClock = 0
    for (let i = 0; i < CELLS; i++) if (decode[i] > 0) glitches[i] = glitch()
  }
  for (const b of bolts) {
    b.age += dt
    b.alpha = boltAlpha(b.age)
  }
  bolts = bolts.filter(b => b.age < BOLT_SECONDS)
  for (const f of floats) {
    f.life -= dt
    f.y += f.vy * dt
    f.alpha = Math.min(1, f.life / (f.ttl * 0.5))
  }
  floats = floats.filter(f => f.life > 0)
  stepParticles(particles, dt)
  stepDrift(dt)
}

// ---------- Drawing ----------

function render () {
  if (!renderer || !game) return
  const selected = ui.selected
  renderer.draw({
    board: game,
    marks,
    selected,
    cursor: selected >= 0 && !finished ? { x: cursorX.value, y: cursorY.value } : null,
    focus: selected >= 0 ? game.values[selected] : 0,
    hidden: props.paused,
    blink: Math.floor(clock * 3) % 2 === 0,
    pops,
    glow,
    reveal,
    decode,
    glitches,
    drift,
    particles,
    bolts,
    stamp: stamp && { scale: stamp.spring.value, alpha: Math.min(1, stamp.age / 0.1) },
    debris,
    texts: floats.map(f => ({ ...f, color: GREEN })),
    flash,
    shake
  })
}

// ---------- Layout and input ----------

// The board is as big as the screen allows with the controls below it, or beside it when
// that leaves a bigger board
function fit () {
  const el = area.value
  if (!el || !renderer) return
  const style = getComputedStyle(el)
  const w = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
  const h = el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
  const below = Math.min(w, h - STATUS_H - TOOLS_H - PAD_H - GAP * 3)
  const beside = Math.min(h, w - SIDE_W - GAP * 2)
  box.landscape = beside > below
  box.size = Math.floor(Math.max(0, box.landscape ? beside : below))
  renderer.resize(el.clientWidth, el.clientHeight, Math.min(window.devicePixelRatio || 1, 3))
  nextTick(placeBoard)
}

function placeBoard () {
  if (!renderer || !boardEl.value || !area.value) return
  const a = area.value.getBoundingClientRect()
  const b = boardEl.value.getBoundingClientRect()
  renderer.setBoard(b.left - a.left, b.top - a.top, box.size)
}

function onBoardPointer (event) {
  sound.unlock()
  if (props.paused || !box.size) return
  const rect = boardEl.value.getBoundingClientRect()
  const c = Math.floor(((event.clientX - rect.left) / rect.width) * 9)
  const r = Math.floor(((event.clientY - rect.top) / rect.height) * 9)
  if (r >= 0 && r < 9 && c >= 0 && c < 9) select(r * 9 + c)
}

// Clicked buttons let go of focus, so the keyboard keeps working on the board
function press (event, run) {
  sound.unlock()
  run()
  if (event.detail) event.currentTarget.blur()
}

const MOVES = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
  KeyW: [-1, 0],
  KeyS: [1, 0],
  KeyA: [0, -1],
  KeyD: [0, 1]
}

function onKey (event) {
  if (event.altKey || event.metaKey) return
  sound.unlock()
  const { code } = event
  if ((code === 'KeyP' || code === 'Escape') && !event.repeat) {
    emit('pause')
    return
  }
  if (props.paused) return
  if (event.ctrlKey) {
    if (code === 'KeyZ') {
      event.preventDefault()
      takeBack()
    }
    return
  }
  const digit = /^(Digit|Numpad)([0-9])$/.exec(code)
  if (digit) {
    event.preventDefault()
    const d = Number(digit[2])
    if (d) input(d, event.shiftKey)
    else clear()
  } else if (MOVES[code]) {
    event.preventDefault()
    move(...MOVES[code])
  } else if (code === 'Backspace' || code === 'Delete') {
    event.preventDefault()
    clear()
  } else if (code === 'KeyN' && !event.repeat) {
    toggleNotes()
  } else if (code === 'KeyU' && !event.repeat) {
    takeBack()
  } else if (code === 'KeyH' && !event.repeat) {
    askHint()
  }
}

watch(() => props.gameId, newGame)

onMounted(() => {
  renderer = createRenderer(canvas.value)
  observer = new ResizeObserver(fit)
  observer.observe(area.value)
  fit()
  // The katakana of the hint effect come from a Japanese pixel font
  useJapaneseFont(JP_TEXT)
  stopFonts = watchFonts(() => renderer?.rebuild(), [...CANVAS_FONTS, ['16px "DotGothic16"', JP_TEXT]])
  window.addEventListener('keydown', onKey)
  newGame()
  stopLoop = startLoop({ step: STEP, paused: () => props.paused, tick, after, draw: render })
  // Development builds expose the game, for scripted play-testing
  if (import.meta.env.DEV) window.__sudoku = { get game () { return game }, select, input }
})

onUnmounted(() => {
  if (isActive()) save()
  stopLoop?.()
  observer?.disconnect()
  stopFonts?.()
  window.removeEventListener('keydown', onKey)
  if (import.meta.env.DEV) delete window.__sudoku
})
</script>

<template>
  <ArcadeStage :t="t" :title="title" :exitLabel="exitLabel" @exit="emit('exit')" @contextmenu.prevent>
    <template #actions>
      <slot name="actions" />
    </template>

    <div ref="area" class="relative flex-1 min-h-0 p-2 sm:p-4 touch-manipulation">
      <canvas ref="canvas" class="absolute inset-0 pointer-events-none" aria-hidden="true" />

      <div :class="['relative h-full flex items-center justify-center', box.landscape ? 'flex-row gap-6' : 'flex-col gap-3']">
        <!-- In portrait the status line sits above the board -->
        <div v-if="!box.landscape" class="status" :style="{ width: `${box.size}px` }">
          <span class="term-chip">{{ levelLabel }}</span>
          <span class="flex-1 text-center tracking-widest" :aria-label="`${t.sudokuMistakes}: ${ui.mistakes}/${MAX_MISTAKES}`">
            <span v-for="n in MAX_MISTAKES" :key="n" :class="n <= ui.mistakes ? 'text-term' : 'text-term-low'">{{ n <= ui.mistakes ? 'X' : '.' }}</span>
          </span>
          <span class="tabular-nums font-semibold">{{ formatTime(ui.time) }}</span>
        </div>

        <!-- The board itself is drawn on the canvas, under this -->
        <div
          ref="boardEl"
          class="shrink-0 cursor-pointer"
          :style="{ width: `${box.size}px`, height: `${box.size}px` }"
          role="grid"
          :aria-label="t.sudokuTitle"
          @pointerdown="onBoardPointer"
        />

        <div :class="['controls flex flex-col gap-3', box.landscape ? 'side' : '']" :style="box.landscape ? {} : { width: `${box.size}px` }">
          <div v-if="box.landscape" class="status">
            <span class="term-chip">{{ levelLabel }}</span>
            <span class="flex-1 text-center tracking-widest" :aria-label="`${t.sudokuMistakes}: ${ui.mistakes}/${MAX_MISTAKES}`">
              <span v-for="n in MAX_MISTAKES" :key="n" :class="n <= ui.mistakes ? 'text-term' : 'text-term-low'">{{ n <= ui.mistakes ? 'X' : '.' }}</span>
            </span>
            <span class="tabular-nums font-semibold">{{ formatTime(ui.time) }}</span>
          </div>

          <div class="grid grid-cols-4 gap-1.5">
            <button type="button" class="tool term-icon-btn" :disabled="!ui.canUndo || paused" :aria-label="t.sudokuUndo" @click="press($event, takeBack)">
              <span aria-hidden="true">&lt;-</span><span class="label">{{ t.sudokuUndo }}</span>
            </button>
            <button type="button" class="tool term-icon-btn" :disabled="paused" :aria-label="t.sudokuErase" @click="press($event, clear)">
              <span aria-hidden="true">[x]</span><span class="label">{{ t.sudokuErase }}</span>
            </button>
            <button
              type="button"
              :class="['tool term-icon-btn', { 'is-on': ui.notes }]"
              :aria-pressed="ui.notes"
              :aria-label="t.sudokuNotes"
              @click="press($event, toggleNotes)"
            >
              <span aria-hidden="true">{{ ui.notes ? '[#]' : '[ ]' }}</span><span class="label">{{ t.sudokuNotes }}</span>
            </button>
            <button type="button" class="tool term-icon-btn" :disabled="ui.hints >= HINTS || paused" :aria-label="t.sudokuHint" @click="press($event, askHint)">
              <span aria-hidden="true">[?]{{ HINTS - ui.hints }}</span><span class="label">{{ t.sudokuHint }}</span>
            </button>
          </div>

          <div :class="['pad grid gap-1.5', box.landscape ? 'grid-cols-3' : 'grid-cols-9']">
            <button
              v-for="d in 9"
              :key="d"
              type="button"
              :class="['key term-icon-btn', { 'is-done': ui.counts[d] >= 9 }]"
              :disabled="paused || ui.counts[d] >= 9"
              :aria-label="String(d)"
              @click="press($event, () => input(d))"
            >
              <span class="font-display digit">{{ d }}</span>
              <span class="left tabular-nums" aria-hidden="true">{{ 9 - ui.counts[d] }}</span>
            </button>
          </div>
        </div>
      </div>

      <slot name="overlay" />
    </div>
  </ArcadeStage>
</template>

<style scoped>
.status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 28px;
  font-size: 0.875rem;
}

.side {
  width: 232px;
}

.tool {
  height: 44px;
  min-width: 0;
  padding: 0 0.25rem;
  font-size: 0.75rem;
  flex-direction: column;
  gap: 0;
  line-height: 1.1;
}
.tool .label {
  font-size: 0.625rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-term-dim);
}
.tool.is-on {
  background: var(--color-term);
  border-color: var(--color-term);
  color: var(--color-black);
}
.tool.is-on .label {
  color: var(--color-black);
}
.tool:disabled,
.key:disabled {
  color: var(--color-term-low);
  border-color: var(--color-term-low);
  background: transparent;
  cursor: not-allowed;
}

.key {
  position: relative;
  height: 56px;
  min-width: 0;
  padding: 0;
}
.side .key {
  height: 52px;
}
.key .digit {
  font-size: 2rem;
  line-height: 1;
}
.key .left {
  position: absolute;
  right: 3px;
  bottom: 1px;
  font-size: 0.6rem;
  color: var(--color-term-dim);
}
.key.is-done .left {
  visibility: hidden;
}
</style>
