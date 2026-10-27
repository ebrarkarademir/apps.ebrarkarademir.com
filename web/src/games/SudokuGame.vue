<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import confetti from 'canvas-confetti'
import TermWindow from '../components/TermWindow.vue'
import OnlineRoom from '../online/OnlineRoom.vue'
import { useOnlineRoom } from '../online/useOnlineRoom'
import SudokuStage from './sudoku/SudokuStage.vue'
import { CELLS, DIFFICULTIES, MAX_MISTAKES, HINTS, generate, isPuzzleText } from './sudoku/engine'
import { JP, useJapaneseFont } from './ascii/paint'

const props = defineProps({
  t: { type: Object, required: true },
  // Room code from a shared invite link
  initialCode: { type: String, default: '' },
  // Open a room straight away: a chat invite is waiting for its code
  hostRoom: { type: Boolean, default: false }
})

const emit = defineEmits(['go-back'])

const SAVE_KEY = 'sudokuSave'
const BEST_KEY = 'sudokuBest'
const COUNTDOWN_MS = 3000
const ENDING_MS = 4500 // the full board and the winner show before the results
const MAX_RACERS = 4

const TITLE_ART = [
  '+-------+-------+-------+',
  '| 5 3 . | . 7 . | . . . |',
  '| 6 . . | 1 9 5 | . . . |',
  '| . 9 8 | . . . | . 6 . |',
  '+-------+-------+-------+'
].join('\n')
// One cursor on a cell, or two going for the same one
const SOLO_ART = ['+---+---+', '| 5 |>? |', '+---+---+'].join('\n')
const ONLINE_ART = ['+---+---+---+', '| 5 |>?<| 3 |', '+---+---+---+'].join('\n')
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

// null while choosing, then solo or online; an invite link or a chat invite goes straight online
const mode = ref(props.initialCode || props.hostRoom ? 'online' : null)

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
  if (document.hidden && mode.value === 'solo' && play.value && !session.result) session.paused = true
}

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility)
  useJapaneseFont('完')
})
onUnmounted(() => document.removeEventListener('visibilitychange', onVisibility))

// ---------- Online: host-side rules ----------
//
// Everyone plays the same puzzle on one shared board. Each device checks its own digits for
// the effects; the host decides who got each cell first and keeps the points: a right digit is
// worth one, a wrong one costs one. The round ends when the board is full.

// Digits that arrive just before the host's tick opens the board still count
const boardOpen = (s) => s.phase === 'playing' || (s.phase === 'countdown' && Date.now() >= s.deadline)
const openCells = (s) => [...s.puzzle].filter(ch => ch === '0').length

function endRound (s) {
  s.standings = Object.entries(s.scores)
    .map(([id, points]) => ({ id, points }))
    .sort((a, b) => b.points - a.points)
  const [first, second] = s.standings
  const winner = first && first.points !== second?.points ? first.id : null
  if (winner) s.wins[winner] = (s.wins[winner] || 0) + 1
  s.outcome = { winner }
  s.time = Math.round((Date.now() - s.startedAt) / 1000)
  s.phase = 'ending'
  s.deadline = Date.now() + ENDING_MS
}

function onAction (s, playerId, action) {
  const isHost = playerId === s.hostId
  switch (action.type) {
    case 'level':
      if (isHost && s.phase === 'lobby' && DIFFICULTIES.includes(action.level)) s.level = action.level
      break
    case 'start': {
      if (!isHost || (s.phase !== 'lobby' && s.phase !== 'results')) return
      s.players = s.players.filter(p => p.online)
      if (s.players.length < 2) return
      const { puzzle, solution } = generate(s.level)
      s.round++
      s.puzzle = puzzle
      s.solution = solution
      s.owners = {}
      // Up to four race; anyone past that watches the round
      s.scores = Object.fromEntries(s.players.slice(0, MAX_RACERS).map(p => [p.id, 0]))
      s.standings = []
      s.outcome = null
      s.deadline = Date.now() + COUNTDOWN_MS
      s.startedAt = s.deadline
      s.phase = 'countdown'
      break
    }
    case 'place': {
      const { cell, d } = action
      if (!boardOpen(s) || !(playerId in s.scores)) return
      if (!Number.isInteger(cell) || cell < 0 || cell >= CELLS || !Number.isInteger(d) || d < 1 || d > 9) return
      // A cell someone already got is gone: a late digit there neither scores nor costs
      if (s.puzzle[cell] !== '0' || s.owners[cell]) return
      if (s.solution[cell] === String(d)) {
        s.owners[cell] = playerId
        s.scores[playerId]++
        if (Object.keys(s.owners).length === openCells(s)) endRound(s)
      } else {
        s.scores[playerId]--
      }
      break
    }
    case 'lobby':
      if (!isHost || s.phase !== 'results') return
      s.players = s.players.filter(p => p.online)
      s.phase = 'lobby'
      break
  }
}

const room = useOnlineRoom({
  game: 'sudoku',
  initialCode: props.initialCode,
  hostRoom: props.hostRoom,
  initialState: () => ({ level: 'easy', round: 0, puzzle: '', solution: '', deadline: null, startedAt: 0, owners: {}, scores: {}, standings: [], wins: {}, outcome: null, time: 0 }),
  // A page that comes in mid-round needs to know how long the round has been going
  project: (s) => (s.phase === 'playing' ? { ...s, msPlayed: Date.now() - s.startedAt } : s),
  onAction,
  onTick: (s, now) => {
    if (s.phase === 'countdown' && now >= s.deadline) {
      s.phase = 'playing'
      s.deadline = null
    } else if (s.phase === 'ending' && now >= s.deadline) {
      s.phase = 'results'
      s.deadline = null
    }
  }
})

// ---------- Online: view ----------

const view = computed(() => room.view)
const onBoard = computed(() => ['countdown', 'playing', 'ending'].includes(view.value?.phase))
const names = computed(() => Object.fromEntries((view.value?.players || []).map(p => [p.id, p.name])))
const racing = computed(() => room.myId in (view.value?.scores || {}))

// When the board opens, on this device's clock: from the countdown, or for a page that came in
// mid-round, from how long the round has been going
const startAt = ref(0)
const seenRound = ref(0)
watch(() => [view.value?.phase, view.value?.round, view.value?.deadline], ([phase, round, deadline]) => {
  if (phase === 'countdown' && deadline) {
    startAt.value = deadline
    seenRound.value = round
  } else if (phase === 'playing' && seenRound.value !== round) {
    startAt.value = Date.now() - (view.value.msPlayed || 0)
    seenRound.value = round
  }
}, { immediate: true })

const standings = computed(() => (view.value?.standings || []).map((entry, index) => ({
  ...entry,
  rank: index + 1,
  name: names.value[entry.id] || '?',
  wins: view.value.wins?.[entry.id] || 0
})))
const winner = computed(() => (view.value?.outcome?.winner ? standings.value.find(entry => entry.id === view.value.outcome.winner) : null))

watch(() => (view.value?.phase === 'results' ? view.value.round : 0), (round) => {
  if (round && winner.value?.id === room.myId) {
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ['#00ff00', '#00b300', '#007a00'], shapes: ['square'] })
  }
})

const cardClass = 'term-card group flex flex-col gap-2 p-4 text-left'
const modeCardClass = 'term-card group flex flex-col gap-3 p-5 text-left'
</script>

<template>
  <!-- Choose solo or online -->
  <TermWindow v-if="mode === null" class="max-w-2xl" :title="t.sudokuTitle" :backLabel="t.back" @back="emit('go-back')">
    <div class="space-y-6">
      <div class="overflow-hidden text-center" aria-hidden="true">
        <span class="inline-block whitespace-pre text-left text-[0.6rem] min-[400px]:text-xs sm:text-sm leading-tight">{{ TITLE_ART }}</span>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <button type="button" :class="modeCardClass" @click="mode = 'solo'">
          <span class="whitespace-pre text-sm leading-tight" aria-hidden="true">{{ SOLO_ART }}</span>
          <span class="font-display text-3xl leading-none uppercase">{{ t.sudokuSolo }}</span>
          <span class="term-muted text-sm leading-relaxed">{{ t.sudokuSoloDesc }}</span>
          <span class="mt-auto flex items-center justify-between gap-2 pt-1">
            <span v-if="savedGame" class="term-chip">{{ t.sudokuContinue }}: {{ levelName(savedGame.level) }}</span>
            <span class="ml-auto text-sm font-semibold uppercase tracking-widest term-muted group-hover:text-term" aria-hidden="true">&gt; run</span>
          </span>
        </button>

        <button type="button" :class="modeCardClass" @click="mode = 'online'">
          <span class="whitespace-pre text-sm leading-tight" aria-hidden="true">{{ ONLINE_ART }}</span>
          <span class="font-display text-3xl leading-none uppercase">{{ t.sudokuOnline }}</span>
          <span class="term-muted text-sm leading-relaxed">{{ t.sudokuOnlineDesc }}</span>
          <span class="mt-auto flex items-center justify-end pt-1">
            <span class="text-sm font-semibold uppercase tracking-widest term-muted group-hover:text-term" aria-hidden="true">&gt; run</span>
          </span>
        </button>
      </div>
    </div>
  </TermWindow>

  <!-- Solo: choose a level, or pick up the game in progress -->
  <TermWindow v-else-if="mode === 'solo' && !play" class="max-w-2xl" :title="t.sudokuTitle" :backLabel="t.back" @back="mode = null">
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

  <!-- Solo: the board -->
  <SudokuStage
    v-else-if="mode === 'solo'"
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

  <!-- Online race -->
  <OnlineRoom v-else :room="room" :t="t" :title="t.sudokuTitle" :minPlayers="2" @go-back="mode = null" @start="room.act('start')">
    <template #lobby="{ view: lobby, isHost }">
      <div class="space-y-4">
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span class="term-label mr-1">&gt; {{ t.sudokuLevel }}</span>
          <button
            v-for="level in DIFFICULTIES"
            :key="level"
            type="button"
            @click="room.act('level', { level })"
            :disabled="!isHost"
            :class="['term-option min-h-8 px-3 text-sm font-semibold', { 'is-active': lobby.level === level }]"
          >
            {{ levelName(level) }}
          </button>
        </div>
        <div class="space-y-2 text-sm leading-relaxed">
          <p class="term-muted">&gt; {{ t.sudokuLobbyHint }}</p>
          <p class="term-muted">&gt; {{ t.sudokuControlsOnline }}</p>
        </div>
      </div>
    </template>

    <SudokuStage
      v-if="onBoard"
      mode="online"
      :t="t"
      :title="t.sudokuTitle"
      :exitLabel="t.onlineLeave"
      :levelLabel="levelName(view.level)"
      :puzzle="view.puzzle"
      :solution="view.solution"
      :gameId="view.round"
      :startAt="startAt"
      :player="racing"
      :myId="room.myId"
      :owners="view.owners"
      :scores="view.scores"
      :names="names"
      :outcome="view.outcome"
      @exit="room.leave()"
      @place="room.act('place', $event)"
    />

    <!-- Round results -->
    <div v-else-if="view.phase === 'results'" class="space-y-6">
      <div class="text-center">
        <p class="seal mx-auto mb-4" aria-hidden="true" :style="{ fontFamily: JP }">完</p>
        <h2 class="font-display text-5xl leading-none uppercase">{{ fmt(t.sudokuRoundResults, { n: view.round }) }}</h2>
        <p class="term-muted mt-2">&gt; {{ winner ? fmt(t.sudokuWinner, { name: winner.name }) : t.sudokuDraw }}</p>
        <p class="mt-3 flex justify-center gap-2">
          <span class="term-chip">{{ levelName(view.level) }}</span>
          <span class="term-chip tabular-nums">{{ formatTime(view.time) }}</span>
        </p>
      </div>

      <div>
        <div class="flex items-center gap-3 px-4 pb-2 term-label">
          <span class="w-8">#</span>
          <span class="flex-1">{{ t.onlinePlayers }}</span>
          <span class="w-14 text-right">{{ t.sudokuWins }}</span>
          <span class="w-14 text-right">{{ t.sudokuPoints }}</span>
        </div>
        <ol class="border border-term-low divide-y divide-term-low">
          <li
            v-for="entry in standings"
            :key="entry.id"
            :class="['flex items-center gap-3 px-4 py-3', { 'term-inverse': winner && entry.id === winner.id, 'bg-term-deep': !(winner && entry.id === winner.id) && entry.id === room.myId }]"
          >
            <span class="w-8 tabular-nums font-semibold">#{{ entry.rank }}</span>
            <span :class="['flex-1 truncate', { 'font-semibold': entry.id === room.myId }]">{{ entry.name }}</span>
            <span class="w-14 text-right tabular-nums text-sm">{{ entry.wins }}</span>
            <span class="w-14 text-right font-bold tabular-nums">{{ entry.points }}</span>
          </li>
        </ol>
      </div>

      <template v-if="room.isHost">
        <button type="button" class="term-btn term-btn-primary w-full min-h-12" @click="room.act('start')">{{ t.playAgain }}</button>
        <button type="button" class="term-btn w-full" @click="room.act('lobby')">{{ t.onlineBackToLobby }}</button>
      </template>
      <p v-else class="term-muted text-center text-sm"><span class="term-cursor">{{ t.onlineWaitingHost }}</span></p>
    </div>
  </OnlineRoom>
</template>

<style scoped>
/* The 完 seal, as it was stamped on the board, on the solved card and the round results */
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
