<script setup>
import { ref, computed, watch } from 'vue'
import { quizQuestions } from './quizQuestions'
import { useOnlineRoom } from '../online/useOnlineRoom'
import OnlineRoom from '../online/OnlineRoom.vue'

const props = defineProps({
  isDarkMode: { type: Boolean, default: false },
  t: { type: Object, required: true },
  // Room code from a shared invite link
  initialCode: { type: String, default: '' }
})

defineEmits(['go-back'])

const QUESTION_MS = 20000
const ROUND_OPTIONS = [5, 10, 15]

const answerStyles = [
  { shape: '▲', color: 'bg-rose-500 hover:bg-rose-600' },
  { shape: '◆', color: 'bg-sky-500 hover:bg-sky-600' },
  { shape: '●', color: 'bg-amber-500 hover:bg-amber-600' },
  { shape: '■', color: 'bg-emerald-500 hover:bg-emerald-600' }
]

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')

const shuffle = (list) => {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// ---------- Host-side game rules ----------

const blankResult = () => ({ score: 0, answered: false, lastChoice: null, lastPoints: 0 })

const everyoneAnswered = (s) => s.players.filter(p => p.online).every(p => s.results[p.id]?.answered)

function nextQuestion (s) {
  s.round++
  if (s.round > s.totalRounds) {
    s.phase = 'final'
    s.question = null
    s.deadline = null
    return
  }
  s.question = { qid: s.order[s.round - 1], order: shuffle([0, 1, 2, 3]) }
  Object.values(s.results).forEach(r => { r.answered = false; r.lastChoice = null; r.lastPoints = 0 })
  s.deadline = Date.now() + QUESTION_MS
  s.phase = 'question'
}

function onAction (s, playerId, action) {
  const isHost = playerId === s.hostId
  switch (action.type) {
    case 'setRounds':
      if (isHost && s.phase === 'lobby' && ROUND_OPTIONS.includes(action.n)) s.rounds = action.n
      break
    case 'start':
      if (!isHost || s.phase !== 'lobby') return
      s.order = shuffle(quizQuestions.map((_, i) => i)).slice(0, s.rounds)
      s.totalRounds = s.order.length
      s.round = 0
      s.results = Object.fromEntries(s.players.map(p => [p.id, blankResult()]))
      nextQuestion(s)
      break
    case 'answer': {
      const result = s.results[playerId]
      if (s.phase !== 'question' || !result || result.answered || ![0, 1, 2, 3].includes(action.choice)) return
      const remaining = Math.max(0, s.deadline - Date.now())
      result.answered = true
      result.lastChoice = action.choice
      // Correct answers earn 500 plus up to 500 more for speed (answer 0 is always the right one)
      result.lastPoints = action.choice === 0 ? 500 + Math.round((500 * remaining) / QUESTION_MS) : 0
      result.score += result.lastPoints
      if (everyoneAnswered(s)) s.phase = 'reveal'
      break
    }
    case 'next':
      if (isHost && s.phase === 'reveal') nextQuestion(s)
      break
    case 'again':
      if (!isHost || s.phase !== 'final') return
      s.players = s.players.filter(p => p.online)
      s.results = {}
      s.phase = 'lobby'
      break
  }
}

const room = useOnlineRoom({
  game: 'quiz-race',
  initialCode: props.initialCode,
  initialState: () => ({ rounds: 10, round: 0, totalRounds: 0, question: null, deadline: null, order: [], results: {} }),
  // Guests don't need the list of upcoming questions
  project: ({ order, ...visible }) => visible,
  onAction,
  onJoin: (s, player) => { s.results[player.id] ??= blankResult() },
  onLeave: (s) => { if (s.phase === 'question' && everyoneAnswered(s)) s.phase = 'reveal' },
  onTick: (s, now) => { if (s.phase === 'question' && now >= s.deadline) s.phase = 'reveal' }
})

// ---------- View ----------

const view = computed(() => room.view)
const lang = computed(() => props.t.langCode)
const myResult = computed(() => view.value?.results[room.myId] || blankResult())
const myChoice = ref(null) // shown immediately, before the host confirms

watch(() => view.value?.round, () => { myChoice.value = null })

const leaderboard = computed(() =>
  (view.value?.players || [])
    .map(p => ({ ...p, ...(view.value.results[p.id] || blankResult()) }))
    .sort((a, b) => b.score - a.score)
)
const onlinePlayers = computed(() => (view.value?.players || []).filter(p => p.online))
const answeredCount = computed(() => onlinePlayers.value.filter(p => view.value.results[p.id]?.answered).length)
const isTie = computed(() => leaderboard.value.length > 1 && leaderboard.value[0].score === leaderboard.value[1].score)
const hasAnswered = computed(() => myChoice.value !== null || myResult.value.answered)

const currentQuestion = computed(() => {
  const q = view.value?.question
  if (!q) return null
  const entry = quizQuestions[q.qid][lang.value] || quizQuestions[q.qid].EN
  return {
    text: entry.q,
    // Display slot -> original answer index
    options: q.order.map(original => ({ original, label: entry.a[original] }))
  }
})

const msLeft = computed(() => Math.max(0, (view.value?.deadline || 0) - room.now))
const secondsLeft = computed(() => Math.ceil(msLeft.value / 1000))
const timeFraction = computed(() => Math.min(1, msLeft.value / QUESTION_MS))

function answer (choice) {
  if (view.value?.phase !== 'question' || hasAnswered.value) return
  myChoice.value = choice
  room.act('answer', { choice })
}

const optionState = (option) => {
  const chosen = (myResult.value.lastChoice ?? myChoice.value) === option.original
  if (view.value.phase === 'reveal') {
    if (option.original === 0) return 'correct'
    return chosen ? 'wrong' : 'dim'
  }
  if (hasAnswered.value) return chosen ? 'chosen' : 'dim'
  return 'idle'
}

const muted = computed(() => (props.isDarkMode ? 'text-gray-400' : 'text-gray-600'))
const listClass = computed(() => ['rounded-lg border divide-y', props.isDarkMode ? 'border-gray-800 divide-gray-800' : 'border-gray-200 divide-gray-200'])
const primary = 'w-full h-12 rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-500 transition-colors'
</script>

<template>
  <OnlineRoom :room="room" :t="t" :isDarkMode="isDarkMode" :title="t.quizTitle" @go-back="$emit('go-back')" @start="room.act('start')">
    <template #lobby="{ view: lobby, isHost }">
      <div class="flex items-center gap-2 text-sm">
        <span :class="muted">{{ t.quizRounds }}</span>
        <button
          v-for="count in ROUND_OPTIONS"
          :key="count"
          @click="room.act('setRounds', { n: count })"
          :disabled="!isHost"
          :class="[
            'h-8 w-10 rounded-md border text-sm font-semibold tabular-nums transition-colors disabled:cursor-default',
            lobby.rounds === count
              ? (isDarkMode ? 'bg-white text-gray-900 border-white' : 'bg-gray-900 text-white border-gray-900')
              : (isDarkMode ? 'border-gray-700 enabled:hover:bg-gray-800' : 'border-gray-300 enabled:hover:bg-gray-100')
          ]"
        >
          {{ count }}
        </button>
      </div>
    </template>

    <!-- Question / reveal -->
    <div v-if="(view.phase === 'question' || view.phase === 'reveal') && currentQuestion" class="space-y-5">
      <div class="flex items-center justify-between text-sm">
        <span :class="muted">{{ fmt(t.quizQuestionOf, { n: view.round, total: view.totalRounds }) }}</span>
        <span v-if="view.phase === 'question'" class="font-mono font-semibold tabular-nums">{{ secondsLeft }}s</span>
        <span v-else :class="muted">{{ t.quizTimeUpOrDone }}</span>
      </div>

      <div :class="['h-1 w-full rounded-full overflow-hidden', isDarkMode ? 'bg-gray-800' : 'bg-gray-200']">
        <div
          class="h-full bg-violet-500 transition-[width] duration-200 ease-linear"
          :style="{ width: (view.phase === 'question' ? timeFraction * 100 : 0) + '%' }"
        ></div>
      </div>

      <h2 class="text-xl sm:text-2xl font-semibold leading-snug min-h-[3.5rem]">{{ currentQuestion.text }}</h2>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          v-for="(option, slot) in currentQuestion.options"
          :key="option.original"
          @click="answer(option.original)"
          :disabled="view.phase !== 'question' || hasAnswered"
          :class="[
            'relative flex items-center gap-3 min-h-[3.75rem] px-4 py-3 rounded-lg text-left text-white font-semibold transition-all duration-150',
            answerStyles[slot].color,
            isDarkMode ? 'ring-offset-gray-900' : 'ring-offset-white',
            {
              'opacity-30': optionState(option) === 'dim',
              'ring-4 ring-offset-2 ring-violet-400': optionState(option) === 'chosen',
              'ring-4 ring-offset-2 ring-emerald-400': optionState(option) === 'correct',
              'opacity-50 line-through': optionState(option) === 'wrong',
              'active:scale-[0.98]': optionState(option) === 'idle'
            }
          ]"
        >
          <span class="text-lg opacity-80 w-5 text-center" aria-hidden="true">{{ answerStyles[slot].shape }}</span>
          <span class="flex-1">{{ option.label }}</span>
          <span v-if="optionState(option) === 'correct'" aria-hidden="true">✓</span>
        </button>
      </div>

      <div v-if="view.phase === 'question'" :class="['text-center text-sm', muted]">
        <span v-if="hasAnswered">{{ t.quizLocked }} · </span>
        {{ fmt(t.quizAnswered, { n: answeredCount, total: onlinePlayers.length }) }}
      </div>

      <template v-else>
        <div
          :class="[
            'rounded-lg border px-4 py-3 text-center font-semibold',
            myResult.lastPoints > 0
              ? (isDarkMode ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800')
              : (isDarkMode ? 'border-rose-500/40 bg-rose-500/10 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-800')
          ]"
        >
          {{ myResult.lastPoints > 0 ? fmt(t.quizCorrect, { points: myResult.lastPoints }) : (myResult.answered ? t.quizWrong : t.quizNoAnswer) }}
        </div>

        <ol :class="listClass">
          <li v-for="(player, index) in leaderboard" :key="player.id" class="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span :class="['w-5 tabular-nums', isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ index + 1 }}</span>
            <span :class="['truncate', { 'font-semibold': player.id === room.myId, 'opacity-40': !player.online }]">{{ player.name }}</span>
            <span v-if="player.lastPoints" class="text-emerald-500 text-xs font-semibold">+{{ player.lastPoints }}</span>
            <span class="ml-auto font-mono font-semibold tabular-nums">{{ player.score }}</span>
          </li>
        </ol>

        <button v-if="room.isHost" @click="room.act('next')" :class="primary">
          {{ view.round >= view.totalRounds ? t.quizSeeResults : t.quizNext }}
        </button>
        <p v-else :class="['text-center text-sm', muted]">{{ t.onlineWaitingNext }}</p>
      </template>
    </div>

    <!-- Final results -->
    <div v-else-if="view.phase === 'final'" class="space-y-6">
      <div class="text-center">
        <div class="text-5xl mb-3">🏆</div>
        <h2 class="text-2xl font-bold">{{ t.quizFinalTitle }}</h2>
        <p v-if="leaderboard[0]" :class="['mt-1', muted]">
          {{ isTie ? t.quizTie : fmt(t.quizWinner, { name: leaderboard[0].name }) }}
        </p>
      </div>

      <ol :class="listClass">
        <li v-for="(player, index) in leaderboard" :key="player.id" class="flex items-center gap-3 px-4 py-3">
          <span class="w-7 text-lg">{{ ['🥇', '🥈', '🥉'][index] || index + 1 }}</span>
          <span :class="['truncate', { 'font-semibold': player.id === room.myId }]">{{ player.name }}</span>
          <span class="ml-auto font-mono font-bold tabular-nums">{{ player.score }}</span>
        </li>
      </ol>

      <button v-if="room.isHost" @click="room.act('again')" :class="primary">{{ t.playAgain }}</button>
      <p v-else :class="['text-center text-sm', muted]">{{ t.onlineWaitingHost }}</p>
    </div>
  </OnlineRoom>
</template>
