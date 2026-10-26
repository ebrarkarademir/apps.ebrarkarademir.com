<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import TermWindow from '../components/TermWindow.vue'
import SudokuStage from './sudoku/SudokuStage.vue'
import { DIFFICULTIES, MAX_MISTAKES, HINTS, generate, isPuzzleText } from './sudoku/engine'
import { JP, useJapaneseFont } from './ascii/paint'

const props = defineProps({
  t: { type: Object, required: true }
})

const emit = defineEmits(['go-back'])

const SAVE_KEY = 'sudokuSave'
const BEST_KEY = 'sudokuBest'

const TITLE_ART = [
  '+-------+-------+-------+',
  '| 5 3 . | . 7 . | . . . |',
  '| 6 . . | 1 9 5 | . . . |',
  '| . 9 8 | . . . | . 6 . |',
  '+-------+-------+-------+'
].join('\n')
const LOSE_ART = [' \\ | /', '-- ! --', ' / | \\'].join('\n')

const LEVEL_KEYS = { easy: 'sudokuEasy', medium: 'sudokuMedium', hard: 'sudokuHard', expert: 'sudokuExpert' }
const LEVEL_DESC_KEYS = { easy: 'sudokuEasyDesc', medium: 'sudokuMediumDesc', hard: 'sudokuHardDesc', expert: 'sudokuExpertDesc' }
const LEVEL_MARKS = { easy: '[*   ]', medium: '[**  ]', hard: '[*** ]', expert: '[****]' }

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const levelName = (level) => props.t[LEVEL_KEYS[level]] || level

const formatTime = (seconds) => {
  const s = Math.floor(seconds)
  const mm = String(Math.floor(s / 60) % 60).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return s >= 3600 ? `${Math.floor(s / 3600)}:${mm}:${ss}` : `${mm}:${ss}`
}

// ---------- Kept on this device ----------

function readJson (key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}

function writeJson (key, value) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Progress and best times just aren't kept
  }
}

// A saved game: { level, puzzle, solution, progress, time }
function loadSave () {
  const saved = readJson(SAVE_KEY)
  if (!saved || !DIFFICULTIES.includes(saved.level) || !isPuzzleText(saved.puzzle) || !isPuzzleText(saved.solution)) return null
  return saved
}

const savedGame = ref(loadSave())
const best = ref(readJson(BEST_KEY) || {})

// Share of the open cells filled in, for the Continue card
const savedProgress = computed(() => {
  const saved = savedGame.value
  if (!saved?.progress?.values) return 0
  let open = 0
  let done = 0
  for (let i = 0; i < 81; i++) {
    if (saved.puzzle[i] !== '0') continue
    open++
    if (saved.progress.values[i] === saved.solution[i]) done++
  }
  return open ? Math.round((done / open) * 100) : 0
})

// ---------- Playing ----------

// null on the menu; otherwise the game on the board
const play = ref(null) // { level, puzzle, solution }
// The game saves go to: still set while the board closes, as it saves one last time then
let current = null
const session = reactive({ gameId: 0, saved: null, paused: false, result: null })

function start (level, puzzle, solution, saved = null) {
  play.value = current = { level, puzzle, solution }
  Object.assign(session, { gameId: session.gameId + 1, saved, paused: false, result: null })
}

function newPuzzle (level) {
  const { puzzle, solution } = generate(level)
  start(level, puzzle, solution)
  onSave({ progress: null, time: 0 })
}

function resume () {
  const saved = savedGame.value
  if (saved) start(saved.level, saved.puzzle, saved.solution, { progress: saved.progress, time: saved.time })
}

// The same puzzle from the start, after running out of mistakes
function retry () {
  const { level, puzzle, solution } = play.value
  start(level, puzzle, solution)
  onSave({ progress: null, time: 0 })
}

function toMenu () {
  play.value = null
}

function onSave (state) {
  if (!current) return
  const value = state && { ...current, progress: state.progress, time: state.time }
  savedGame.value = value
  writeJson(SAVE_KEY, value)
}

function onFinish ({ won, time, mistakes, hints }) {
  const level = play.value.level
  const previous = best.value[level]
  const newBest = won && (!previous || time < previous)
  if (newBest) {
    best.value = { ...best.value, [level]: Math.floor(time) }
    writeJson(BEST_KEY, best.value)
  }
  session.paused = false
  session.result = { won, time, mistakes, hints, newBest, best: best.value[level] }
}

function togglePause () {
  if (session.result) return
  session.paused = !session.paused
}

function onPauseClick (event) {
  togglePause()
  if (event.detail) event.currentTarget.blur()
}

function onVisibility () {
  if (document.hidden && play.value && !session.result) session.paused = true
}

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility)
  useJapaneseFont('完')
})
onUnmounted(() => document.removeEventListener('visibilitychange', onVisibility))

const cardClass = 'term-card group flex flex-col gap-2 p-4 text-left'
</script>

<template>
  <!-- Choose a level, or pick up the game in progress -->
  <TermWindow v-if="!play" class="max-w-2xl" :title="t.sudokuTitle" :backLabel="t.back" @back="emit('go-back')">
    <div class="space-y-6">
      <div class="overflow-hidden text-center" aria-hidden="true">
        <span class="inline-block whitespace-pre text-left text-[0.6rem] min-[400px]:text-xs sm:text-sm leading-tight">{{ TITLE_ART }}</span>
      </div>

      <button v-if="savedGame" type="button" :class="[cardClass, 'w-full']" @click="resume">
        <span class="flex items-center justify-between gap-2">
          <span class="font-display text-3xl leading-none uppercase">{{ t.sudokuContinue }}</span>
          <span class="text-sm font-semibold uppercase tracking-widest term-muted group-hover:text-term" aria-hidden="true">&gt; run</span>
        </span>
        <span class="flex flex-wrap gap-2">
          <span class="term-chip">{{ levelName(savedGame.level) }}</span>
          <span class="term-chip tabular-nums">{{ formatTime(savedGame.time || 0) }}</span>
          <span class="term-chip tabular-nums">{{ savedProgress }}%</span>
        </span>
      </button>

      <section>
        <h2 class="term-label mb-3">{{ savedGame ? t.sudokuNewGame : t.sudokuChooseLevel }}</h2>
        <div class="grid grid-cols-2 gap-3">
          <button v-for="level in DIFFICULTIES" :key="level" type="button" :class="cardClass" @click="newPuzzle(level)">
            <span class="text-sm tracking-widest" aria-hidden="true">{{ LEVEL_MARKS[level] }}</span>
            <span class="font-display text-3xl leading-none uppercase">{{ levelName(level) }}</span>
            <span class="term-muted text-xs sm:text-sm leading-relaxed">{{ t[LEVEL_DESC_KEYS[level]] }}</span>
            <span class="mt-auto pt-1">
              <span class="term-chip tabular-nums">{{ t.sudokuBest }}: {{ best[level] ? formatTime(best[level]) : '--:--' }}</span>
            </span>
          </button>
        </div>
      </section>

      <p class="term-muted text-center text-xs sm:text-sm leading-relaxed">{{ t.sudokuControls }}</p>
    </div>
  </TermWindow>

  <SudokuStage
    v-else
    :t="t"
    :title="t.sudokuTitle"
    :exitLabel="t.sudokuMenu"
    :levelLabel="levelName(play.level)"
    :puzzle="play.puzzle"
    :solution="play.solution"
    :gameId="session.gameId"
    :saved="session.saved"
    :paused="session.paused"
    @exit="toMenu"
    @pause="togglePause"
    @save="onSave"
    @finish="onFinish"
  >
    <template #actions>
      <button
        type="button"
        class="term-icon-btn shrink-0 h-9 text-xs"
        :aria-label="session.paused ? t.sudokuResume : t.sudokuPause"
        :disabled="!!session.result"
        @click="onPauseClick"
      >
        {{ session.paused ? '[>]' : '[||]' }}
      </button>
    </template>

    <template #overlay>
      <div v-if="session.result" class="absolute inset-0 z-20 flex items-center justify-center p-3 bg-black/40">
        <div class="term-window w-full max-w-xs p-5 text-center" role="dialog" aria-modal="false" :aria-label="session.result.won ? t.sudokuSolved : t.sudokuGameOver">
          <p v-if="session.result.won" class="seal mx-auto" aria-hidden="true" :style="{ fontFamily: JP }">完</p>
          <span v-else class="inline-block whitespace-pre text-left text-sm leading-tight" aria-hidden="true">{{ LOSE_ART }}</span>
          <h2 class="mt-2 font-display text-5xl leading-none uppercase">{{ session.result.won ? t.sudokuSolved : t.sudokuGameOver }}</h2>
          <p v-if="!session.result.won" class="mt-2 text-sm term-muted">{{ fmt(t.sudokuOutOfMistakes, { n: MAX_MISTAKES }) }}</p>

          <dl v-if="session.result.won" class="mt-4 grid grid-cols-[auto_auto] justify-center items-baseline gap-x-4 gap-y-1 text-left">
            <dt class="term-label">{{ t.sudokuTime }}</dt>
            <dd class="font-display text-4xl leading-none tabular-nums">{{ formatTime(session.result.time) }}</dd>
            <dt class="term-label">{{ t.sudokuBest }}</dt>
            <dd class="font-display text-4xl leading-none tabular-nums">{{ formatTime(session.result.best) }}</dd>
            <dt class="term-label">{{ t.sudokuMistakes }}</dt>
            <dd class="tabular-nums">{{ session.result.mistakes }}/{{ MAX_MISTAKES }}</dd>
            <dt class="term-label">{{ t.sudokuHints }}</dt>
            <dd class="tabular-nums">{{ session.result.hints }}/{{ HINTS }}</dd>
          </dl>
          <p v-if="session.result.newBest" class="term-inverse inline-block mt-3 px-2 py-0.5 text-sm font-bold uppercase tracking-widest">{{ t.sudokuNewBest }}</p>

          <button v-if="!session.result.won" type="button" class="term-btn term-btn-primary w-full mt-5" @click="retry">{{ t.sudokuRetry }}</button>
          <button type="button" :class="['term-btn w-full', session.result.won ? 'term-btn-primary mt-5' : 'mt-2']" @click="newPuzzle(play.level)">{{ t.sudokuNewPuzzle }}</button>
          <button type="button" class="term-btn w-full mt-2" @click="toMenu">{{ t.sudokuMenu }}</button>
        </div>
      </div>

      <div v-else-if="session.paused" class="absolute inset-0 z-20 flex items-center justify-center p-3 bg-black/60">
        <div class="term-window w-full max-w-xs p-5 text-center">
          <h2 class="font-display text-5xl leading-none uppercase term-blink">{{ t.sudokuPaused }}</h2>
          <button type="button" class="term-btn term-btn-primary w-full mt-5" @click="session.paused = false">{{ t.sudokuResume }}</button>
          <p class="term-muted text-xs mt-3">{{ t.sudokuPausedHint }}</p>
        </div>
      </div>
    </template>
  </SudokuStage>
</template>

<style scoped>
/* The 完 seal, as it was stamped on the board */
.seal {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4.5rem;
  height: 4.5rem;
  border: 4px double var(--color-term);
  font-size: 2.75rem;
  line-height: 1;
  transform: rotate(-9deg);
  box-shadow: 0 0 12px rgb(0 255 0 / 0.35);
}
</style>
