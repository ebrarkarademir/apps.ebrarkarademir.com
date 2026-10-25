<script setup>
import { ref, computed, watch } from 'vue'
import { quizQuestions } from './quizQuestions'
import { useOnlineRoom } from '../online/useOnlineRoom'
import OnlineRoom from '../online/OnlineRoom.vue'

const props = defineProps({
  t: { type: Object, required: true },
  // Room code from a shared invite link
  initialCode: { type: String, default: '' }
})

defineEmits(['go-back'])

const QUESTION_MS = 20000
const ROUND_OPTIONS = [5, 10, 15]
const ANSWER_KEYS = ['A', 'B', 'C', 'D']
const TIMER_CELLS = 24

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
// [#################.......] draining as the clock runs
const timerBar = computed(() => {
  const filled = view.value?.phase === 'question' ? Math.ceil(timeFraction.value * TIMER_CELLS) : 0
  return '#'.repeat(filled) + '.'.repeat(TIMER_CELLS - filled)
})

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

const optionClass = {
  idle: 'border-term-low hover:border-term hover:bg-term-deep',
  chosen: 'border-term bg-term-deep',
  correct: 'term-inverse border-term',
  wrong: 'border-dashed border-term-low text-term-low line-through',
  dim: 'border-term-low opacity-40'
}
const optionMark = { idle: '', chosen: '<', correct: '[ok]', wrong: '[x]', dim: '' }

const listClass = 'border border-term-low divide-y divide-term-low'
const primary = 'term-btn term-btn-primary w-full min-h-12'
</script>

<template>
  <OnlineRoom :room="room" :t="t" :title="t.quizTitle" @go-back="$emit('go-back')" @start="room.act('start')">
    <template #lobby="{ view: lobby, isHost }">
      <div class="flex items-center gap-2 text-sm">
        <span class="term-label mr-1">&gt; {{ t.quizRounds }}</span>
        <button
          v-for="count in ROUND_OPTIONS"
          :key="count"
          @click="room.act('setRounds', { n: count })"
          :disabled="!isHost"
          :class="['term-option min-h-8 w-12 px-0 text-sm font-semibold tabular-nums', { 'is-active': lobby.rounds === count }]"
        >
          {{ count }}
        </button>
      </div>
    </template>

    <!-- Question / reveal -->
    <div v-if="(view.phase === 'question' || view.phase === 'reveal') && currentQuestion" class="space-y-5">
      <div class="flex items-center justify-between gap-3 text-sm">
        <span class="term-label">{{ fmt(t.quizQuestionOf, { n: view.round, total: view.totalRounds }) }}</span>
        <span v-if="view.phase === 'question'" :class="['font-display text-3xl leading-none tabular-nums', { 'term-blink': secondsLeft <= 5 }]">
          {{ String(secondsLeft).padStart(2, '0') }}s
        </span>
        <span v-else class="term-muted">{{ t.quizTimeUpOrDone }}</span>
      </div>

      <p class="text-sm whitespace-pre overflow-hidden" aria-hidden="true">[{{ timerBar }}]</p>

      <h2 class="text-xl sm:text-2xl font-semibold leading-snug min-h-[3.5rem]">&gt; {{ currentQuestion.text }}</h2>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          v-for="(option, slot) in currentQuestion.options"
          :key="option.original"
          @click="answer(option.original)"
          :disabled="view.phase !== 'question' || hasAnswered"
          :class="[
            'flex items-center gap-3 min-h-[3.75rem] px-4 py-3 border text-left font-semibold transition-colors duration-100 disabled:cursor-default',
            optionClass[optionState(option)]
          ]"
        >
          <span class="shrink-0" aria-hidden="true">[{{ ANSWER_KEYS[slot] }}]</span>
          <span class="flex-1">{{ option.label }}</span>
          <span v-if="optionMark[optionState(option)]" class="shrink-0" aria-hidden="true">{{ optionMark[optionState(option)] }}</span>
        </button>
      </div>

      <div v-if="view.phase === 'question'" class="term-muted text-center text-sm">
        <span v-if="hasAnswered">{{ t.quizLocked }} :: </span>
        {{ fmt(t.quizAnswered, { n: answeredCount, total: onlinePlayers.length }) }}
      </div>

      <template v-else>
        <div :class="['px-4 py-3 text-center font-semibold', myResult.lastPoints > 0 ? 'term-inverse' : 'border border-dashed border-term']">
          {{ myResult.lastPoints > 0 ? '[+] ' + fmt(t.quizCorrect, { points: myResult.lastPoints }) : '[x] ' + (myResult.answered ? t.quizWrong : t.quizNoAnswer) }}
        </div>

        <ol :class="listClass">
          <li v-for="(player, index) in leaderboard" :key="player.id" :class="['flex items-center gap-3 px-4 py-2.5 text-sm', { 'bg-term-deep': player.id === room.myId }]">
            <span class="w-6 term-muted tabular-nums">{{ String(index + 1).padStart(2, '0') }}</span>
            <span :class="['truncate', { 'font-semibold': player.id === room.myId, 'opacity-40': !player.online }]">{{ player.name }}</span>
            <span v-if="player.lastPoints" class="text-xs font-semibold">+{{ player.lastPoints }}</span>
            <span class="ml-auto font-semibold tabular-nums">{{ player.score }}</span>
          </li>
        </ol>

        <button v-if="room.isHost" @click="room.act('next')" :class="primary">
          {{ view.round >= view.totalRounds ? t.quizSeeResults : t.quizNext }}
        </button>
        <p v-else class="term-muted text-center text-sm"><span class="term-cursor">{{ t.onlineWaitingNext }}</span></p>
      </template>
    </div>

    <!-- Final results -->
    <div v-else-if="view.phase === 'final'" class="space-y-6">
      <div class="text-center">
        <pre class="inline-block text-left text-xs sm:text-sm leading-tight mb-3" aria-hidden="true">
 ___________
'._==_==_=_.'
.-\:      /-.
| (|:.     |) |
 '-|:.     |-'
   \::.    /
    '::. .'
      ) (
    _.' '._
   '-------'</pre>
        <h2 class="font-display text-5xl leading-none uppercase">{{ t.quizFinalTitle }}</h2>
        <p v-if="leaderboard[0]" class="term-muted mt-2">
          &gt; {{ isTie ? t.quizTie : fmt(t.quizWinner, { name: leaderboard[0].name }) }}
        </p>
      </div>

      <ol :class="listClass">
        <li
          v-for="(player, index) in leaderboard"
          :key="player.id"
          :class="['flex items-center gap-3 px-4 py-3', { 'term-inverse': index === 0, 'bg-term-deep': index > 0 && player.id === room.myId }]"
        >
          <span class="w-8 tabular-nums font-semibold">#{{ index + 1 }}</span>
          <span :class="['truncate', { 'font-semibold': player.id === room.myId }]">{{ player.name }}</span>
          <span class="ml-auto font-bold tabular-nums">{{ player.score }}</span>
        </li>
      </ol>

      <button v-if="room.isHost" @click="room.act('again')" :class="primary">{{ t.playAgain }}</button>
      <p v-else class="term-muted text-center text-sm"><span class="term-cursor">{{ t.onlineWaitingHost }}</span></p>
    </div>
  </OnlineRoom>
</template>
