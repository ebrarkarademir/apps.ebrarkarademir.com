<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Peer from 'peerjs'
import { quizQuestions } from './quizQuestions'

const props = defineProps({
  isDarkMode: { type: Boolean, default: false },
  t: { type: Object, required: true },
  // Room code from a shared link (?quiz=CODE)
  initialCode: { type: String, default: '' }
})

defineEmits(['go-back'])

// One device hosts the room and owns the game state; guests connect to it peer-to-peer
// and receive a full state snapshot after every change.
const PEER_PREFIX = 'ebrarkarademir-quiz-'
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const QUESTION_MS = 20000
const CONNECT_TIMEOUT_MS = 12000
const HOST_ID = 'host'

const answerStyles = [
  { shape: '▲', color: 'bg-rose-500 hover:bg-rose-600' },
  { shape: '◆', color: 'bg-sky-500 hover:bg-sky-600' },
  { shape: '●', color: 'bg-amber-500 hover:bg-amber-600' },
  { shape: '■', color: 'bg-emerald-500 hover:bg-emerald-600' }
]

const screen = ref('home') // home | connecting | room
const role = ref(null) // host | guest
const playerName = ref(localStorage.getItem('quizName') || '')
const joinCode = ref(props.initialCode.toUpperCase())
const roomCode = ref('')
const errorKey = ref('')
const copied = ref(false)
const rounds = ref(10)
const myChoice = ref(null)
const now = ref(Date.now())
const deadline = ref(0)

const game = ref(emptyGame())

let peer = null
let hostConn = null
let connectTimer = null
let tickTimer = null
let questionOrder = []
const guests = new Map() // peer id -> DataConnection (host only)

function emptyGame () {
  return { phase: 'lobby', players: [], round: 0, totalRounds: 10, question: null }
}

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')

const shuffle = (list) => {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const randomCode = () =>
  Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')

const cleanName = (name) => String(name || '').trim().slice(0, 18) || 'Player'

// ---------- Derived view state ----------

const lang = computed(() => props.t.langCode)
const myId = computed(() => (role.value === 'host' ? HOST_ID : peer?.id))
const me = computed(() => game.value.players.find(p => p.id === myId.value))
const onlinePlayers = computed(() => game.value.players.filter(p => !p.offline))
const leaderboard = computed(() => [...game.value.players].sort((a, b) => b.score - a.score))
const isTie = computed(() => leaderboard.value.length > 1 && leaderboard.value[0].score === leaderboard.value[1].score)
const answeredCount = computed(() => onlinePlayers.value.filter(p => p.answered).length)

const currentQuestion = computed(() => {
  const q = game.value.question
  if (!q) return null
  const entry = quizQuestions[q.qid][lang.value] || quizQuestions[q.qid].EN
  return {
    text: entry.q,
    // Display slot -> original answer index (0 is always the correct one)
    options: q.order.map(original => ({ original, label: entry.a[original] }))
  }
})

const secondsLeft = computed(() => Math.max(0, Math.ceil((deadline.value - now.value) / 1000)))
const timeFraction = computed(() => Math.max(0, Math.min(1, (deadline.value - now.value) / QUESTION_MS)))

const shareLink = computed(() => `${window.location.origin}/?quiz=${roomCode.value}`)

// ---------- Host ----------

function createRoom () {
  if (!rememberName()) return
  resetConnection()
  role.value = 'host'
  screen.value = 'connecting'
  openHostPeer(randomCode())
}

function openHostPeer (code) {
  const hostPeer = new Peer(PEER_PREFIX + code)
  peer = hostPeer
  peer.on('open', () => {
    roomCode.value = code
    game.value = emptyGame()
    game.value.totalRounds = rounds.value
    game.value.players.push(newPlayer(HOST_ID, playerName.value))
    screen.value = 'room'
  })
  peer.on('connection', (conn) => {
    conn.on('data', (msg) => handleGuestMessage(conn, msg))
    conn.on('close', () => dropGuest(conn.peer))
    conn.on('error', () => dropGuest(conn.peer))
  })
  peer.on('error', (err) => {
    if (peer !== hostPeer) return
    if (err.type === 'unavailable-id') {
      hostPeer.destroy()
      openHostPeer(randomCode())
    } else if (screen.value === 'connecting') {
      fail('quizErrConnection')
    }
  })
}

function newPlayer (id, name) {
  return { id, name, score: 0, answered: false, lastChoice: null, lastPoints: 0, offline: false }
}

function handleGuestMessage (conn, msg) {
  if (msg?.type === 'join') {
    const name = cleanName(msg.name)
    // A returning player (e.g. phone screen locked) gets their old score back
    const returning = game.value.players.find(p => p.offline && p.name === name)
    if (returning) {
      returning.id = conn.peer
      returning.offline = false
    } else {
      const taken = new Set(game.value.players.map(p => p.name))
      let unique = name
      for (let n = 2; taken.has(unique); n++) unique = `${name} ${n}`
      game.value.players.push(newPlayer(conn.peer, unique))
    }
    guests.set(conn.peer, conn)
    broadcast()
  } else if (msg?.type === 'answer') {
    submitAnswer(conn.peer, msg.choice)
  }
}

function dropGuest (id) {
  if (!guests.has(id)) return
  guests.delete(id)
  if (game.value.phase === 'lobby') {
    game.value.players = game.value.players.filter(p => p.id !== id)
  } else {
    const player = game.value.players.find(p => p.id === id)
    if (player) player.offline = true
  }
  if (game.value.phase === 'question' && everyoneAnswered()) reveal()
  else broadcast()
}

function startGame () {
  questionOrder = shuffle(quizQuestions.map((_, i) => i)).slice(0, rounds.value)
  game.value.totalRounds = questionOrder.length
  game.value.round = 0
  game.value.players.forEach(p => { p.score = 0 })
  nextQuestion()
}

function nextQuestion () {
  const g = game.value
  g.round++
  if (g.round > g.totalRounds) {
    g.phase = 'final'
    g.question = null
    broadcast()
    return
  }
  g.question = { qid: questionOrder[g.round - 1], order: shuffle([0, 1, 2, 3]) }
  g.players.forEach(p => { p.answered = false; p.lastChoice = null; p.lastPoints = 0 })
  g.phase = 'question'
  myChoice.value = null
  deadline.value = Date.now() + QUESTION_MS
  broadcast()
}

function submitAnswer (playerId, choice) {
  const player = game.value.players.find(p => p.id === playerId)
  if (game.value.phase !== 'question' || !player || player.answered) return
  if (![0, 1, 2, 3].includes(choice)) return
  const remaining = Math.max(0, deadline.value - Date.now())
  player.answered = true
  player.lastChoice = choice
  // Correct answers earn 500 plus up to 500 more for speed
  player.lastPoints = choice === 0 ? 500 + Math.round((500 * remaining) / QUESTION_MS) : 0
  player.score += player.lastPoints
  if (everyoneAnswered()) reveal()
  else broadcast()
}

const everyoneAnswered = () => game.value.players.filter(p => !p.offline).every(p => p.answered)

function reveal () {
  game.value.phase = 'reveal'
  broadcast()
}

function playAgain () {
  game.value.phase = 'lobby'
  game.value.players = game.value.players.filter(p => !p.offline)
  game.value.players.forEach(p => { p.score = 0; p.answered = false; p.lastChoice = null; p.lastPoints = 0 })
  broadcast()
}

function broadcast () {
  const remainingMs = game.value.phase === 'question' ? Math.max(0, deadline.value - Date.now()) : 0
  const state = JSON.parse(JSON.stringify({ ...game.value, remainingMs }))
  guests.forEach(conn => {
    if (conn.open) conn.send({ type: 'state', state })
  })
}

// ---------- Guest ----------

function joinRoom () {
  if (!rememberName()) return
  const code = joinCode.value.trim().toUpperCase()
  if (code.length !== 4) {
    errorKey.value = 'quizErrCode'
    return
  }
  resetConnection()
  role.value = 'guest'
  roomCode.value = code
  screen.value = 'connecting'
  connectTimer = setTimeout(() => fail('quizErrConnection'), CONNECT_TIMEOUT_MS)

  const guestPeer = new Peer()
  peer = guestPeer
  peer.on('open', () => {
    const conn = guestPeer.connect(PEER_PREFIX + code, { reliable: true })
    hostConn = conn
    conn.on('open', () => conn.send({ type: 'join', name: playerName.value }))
    conn.on('data', (msg) => {
      if (hostConn !== conn) return
      if (msg?.type !== 'state') return
      clearTimeout(connectTimer)
      const previousRound = game.value.round
      const previousPhase = game.value.phase
      game.value = msg.state
      if (msg.state.phase === 'question' && (msg.state.round !== previousRound || previousPhase !== 'question')) {
        myChoice.value = null
        deadline.value = Date.now() + msg.state.remainingMs
      }
      screen.value = 'room'
    })
    // Events from a connection we already left are ignored
    conn.on('close', () => {
      if (hostConn === conn) fail('quizErrDisconnected')
    })
  })
  peer.on('error', (err) => {
    if (peer !== guestPeer) return
    if (err.type === 'peer-unavailable') fail('quizErrNotFound')
    // Once in the room, the data connection survives signaling-server hiccups
    else if (screen.value === 'connecting') fail('quizErrConnection')
  })
}

function answer (choice) {
  if (game.value.phase !== 'question' || myChoice.value !== null || me.value?.answered) return
  myChoice.value = choice
  if (role.value === 'host') submitAnswer(HOST_ID, choice)
  else hostConn?.send({ type: 'answer', choice })
}

// ---------- Shared ----------

function rememberName () {
  playerName.value = cleanName(playerName.value)
  localStorage.setItem('quizName', playerName.value)
  errorKey.value = ''
  return true
}

function fail (key) {
  clearTimeout(connectTimer)
  resetConnection()
  errorKey.value = key
  screen.value = 'home'
}

function resetConnection () {
  clearTimeout(connectTimer)
  guests.clear()
  hostConn?.close()
  peer?.destroy()
  peer = null
  hostConn = null
  game.value = emptyGame()
  myChoice.value = null
}

function leaveRoom () {
  resetConnection()
  role.value = null
  screen.value = 'home'
}

async function copyLink () {
  try {
    if (navigator.share) {
      await navigator.share({ title: props.t.quizTitle, url: shareLink.value })
      return
    }
    await navigator.clipboard.writeText(shareLink.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1800)
  } catch {
    // Share sheet dismissed or clipboard blocked; the code is still on screen
  }
}

const optionState = (option) => {
  const phase = game.value.phase
  const chosen = (me.value?.lastChoice ?? myChoice.value) === option.original
  if (phase === 'reveal') {
    if (option.original === 0) return 'correct'
    return chosen ? 'wrong' : 'dim'
  }
  if (myChoice.value !== null || me.value?.answered) return chosen ? 'chosen' : 'dim'
  return 'idle'
}

onMounted(() => {
  tickTimer = setInterval(() => {
    now.value = Date.now()
    if (role.value === 'host' && game.value.phase === 'question' && now.value >= deadline.value) reveal()
  }, 200)
  if (joinCode.value.length === 4 && playerName.value) joinRoom()
})

onUnmounted(() => {
  clearInterval(tickTimer)
  resetConnection()
})
</script>

<template>
  <div
    :class="[
      'max-w-2xl mx-auto rounded-xl border p-5 sm:p-8 transition-colors duration-150',
      isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-lg'
    ]"
  >
    <!-- Header -->
    <div class="flex justify-between items-center gap-3 mb-6">
      <button
        @click="screen === 'home' ? $emit('go-back') : leaveRoom()"
        :class="[
          'px-3 py-2 rounded-lg transition-colors duration-150 flex items-center gap-2 text-sm font-medium',
          isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        ]"
      >
        <span class="text-lg">←</span>
        <span>{{ screen === 'home' ? t.back : t.quizLeave }}</span>
      </button>
      <div class="flex items-center gap-2">
        <span
          v-if="screen === 'room'"
          :class="[
            'font-mono text-sm font-semibold tracking-widest px-2 py-1 rounded-md border',
            isDarkMode ? 'border-gray-700 text-gray-200' : 'border-gray-200 text-gray-700'
          ]"
        >
          {{ roomCode }}
        </span>
        <h1 class="text-xl sm:text-2xl font-bold">{{ t.quizTitle }}</h1>
      </div>
    </div>

    <!-- Home: name + create or join -->
    <div v-if="screen === 'home'" class="space-y-6">
      <div
        v-if="errorKey"
        :class="[
          'rounded-lg border px-4 py-3 text-sm',
          isDarkMode ? 'border-rose-500/40 bg-rose-500/10 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-800'
        ]"
      >
        {{ t[errorKey] }}
      </div>

      <label class="block">
        <span :class="['text-xs font-semibold uppercase tracking-wider', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
          {{ t.quizYourName }}
        </span>
        <input
          v-model="playerName"
          maxlength="18"
          :placeholder="t.quizNamePlaceholder"
          :class="[
            'mt-2 w-full h-11 px-3 rounded-lg border outline-none transition-colors focus:ring-2 focus:ring-violet-500/40',
            isDarkMode ? 'bg-gray-950 border-gray-700 text-white focus:border-violet-400' : 'bg-white border-gray-300 focus:border-violet-500'
          ]"
        />
      </label>

      <div class="grid sm:grid-cols-2 gap-4">
        <div :class="['rounded-lg border p-4 flex flex-col gap-3', isDarkMode ? 'border-gray-800' : 'border-gray-200']">
          <div>
            <h2 class="font-semibold">{{ t.quizCreateRoom }}</h2>
            <p :class="['text-sm mt-1', isDarkMode ? 'text-gray-400' : 'text-gray-600']">{{ t.quizCreateHint }}</p>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <span :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">{{ t.quizRounds }}</span>
            <button
              v-for="count in [5, 10, 15]"
              :key="count"
              @click="rounds = count"
              :class="[
                'h-8 w-10 rounded-md border text-sm font-semibold tabular-nums transition-colors',
                rounds === count
                  ? (isDarkMode ? 'bg-white text-gray-900 border-white' : 'bg-gray-900 text-white border-gray-900')
                  : (isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100')
              ]"
            >
              {{ count }}
            </button>
          </div>
          <button
            @click="createRoom"
            :disabled="!playerName.trim()"
            class="mt-auto h-11 rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {{ t.quizCreateRoom }}
          </button>
        </div>

        <div :class="['rounded-lg border p-4 flex flex-col gap-3', isDarkMode ? 'border-gray-800' : 'border-gray-200']">
          <div>
            <h2 class="font-semibold">{{ t.quizJoinRoom }}</h2>
            <p :class="['text-sm mt-1', isDarkMode ? 'text-gray-400' : 'text-gray-600']">{{ t.quizJoinHint }}</p>
          </div>
          <input
            v-model="joinCode"
            @input="joinCode = joinCode.toUpperCase().replace(/[^A-Z0-9]/g, '')"
            @keyup.enter="joinRoom"
            maxlength="4"
            autocapitalize="characters"
            autocomplete="off"
            :placeholder="t.quizCodePlaceholder"
            :class="[
              'h-11 px-3 rounded-lg border outline-none font-mono text-lg tracking-[0.4em] uppercase text-center transition-colors focus:ring-2 focus:ring-violet-500/40',
              isDarkMode ? 'bg-gray-950 border-gray-700 text-white focus:border-violet-400' : 'bg-white border-gray-300 focus:border-violet-500'
            ]"
          />
          <button
            @click="joinRoom"
            :disabled="!playerName.trim() || joinCode.length !== 4"
            :class="[
              'mt-auto h-11 rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors',
              isDarkMode ? 'bg-white text-gray-900 hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-700'
            ]"
          >
            {{ t.quizJoin }}
          </button>
        </div>
      </div>
    </div>

    <!-- Connecting -->
    <div v-else-if="screen === 'connecting'" class="py-16 flex flex-col items-center gap-4">
      <div class="h-8 w-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"></div>
      <p :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">{{ t.quizConnecting }}</p>
    </div>

    <!-- In a room -->
    <template v-else>
      <!-- Lobby -->
      <div v-if="game.phase === 'lobby'" class="space-y-6">
        <div
          v-if="role === 'host'"
          :class="['rounded-lg border p-5 text-center', isDarkMode ? 'border-gray-800 bg-gray-950/50' : 'border-gray-200 bg-gray-50']"
        >
          <p :class="['text-xs font-semibold uppercase tracking-wider', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            {{ t.quizRoomLabel }}
          </p>
          <p class="font-mono text-5xl font-bold tracking-[0.3em] my-3 pl-[0.3em]">{{ roomCode }}</p>
          <p :class="['text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-600']">{{ t.quizShareHint }}</p>
          <button
            @click="copyLink"
            :class="[
              'mt-4 h-9 px-4 rounded-lg border text-sm font-medium transition-colors',
              isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-white'
            ]"
          >
            {{ copied ? t.quizCopied : t.quizCopyLink }}
          </button>
        </div>

        <div>
          <h2 :class="['text-xs font-semibold uppercase tracking-wider mb-3', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            {{ t.quizPlayers }} · {{ game.players.length }}
          </h2>
          <ul class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <li
              v-for="player in game.players"
              :key="player.id"
              :class="[
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                isDarkMode ? 'border-gray-800' : 'border-gray-200',
                player.id === myId && (isDarkMode ? 'bg-violet-500/10 border-violet-500/40' : 'bg-violet-50 border-violet-200')
              ]"
            >
              <span class="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span class="truncate font-medium">{{ player.name }}</span>
              <span v-if="player.id === HOST_ID" :class="['ml-auto text-[10px] uppercase tracking-wider', isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                {{ t.quizHostBadge }}
              </span>
            </li>
          </ul>
        </div>

        <button
          v-if="role === 'host'"
          @click="startGame"
          class="w-full h-12 rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-500 transition-colors"
        >
          {{ t.quizStart }}
          <span class="opacity-70 font-normal">· {{ fmt(t.quizRoundsCount, { n: rounds }) }}</span>
        </button>
        <p v-else :class="['text-center text-sm py-2', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
          {{ t.quizWaitingHost }}
        </p>
      </div>

      <!-- Question / reveal -->
      <div v-else-if="(game.phase === 'question' || game.phase === 'reveal') && currentQuestion" class="space-y-5">
        <div class="flex items-center justify-between text-sm">
          <span :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
            {{ fmt(t.quizQuestionOf, { n: game.round, total: game.totalRounds }) }}
          </span>
          <span v-if="game.phase === 'question'" class="font-mono font-semibold tabular-nums">{{ secondsLeft }}s</span>
          <span v-else :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">{{ t.quizTimeUpOrDone }}</span>
        </div>

        <div :class="['h-1 w-full rounded-full overflow-hidden', isDarkMode ? 'bg-gray-800' : 'bg-gray-200']">
          <div
            class="h-full bg-violet-500 transition-[width] duration-200 ease-linear"
            :style="{ width: (game.phase === 'question' ? timeFraction * 100 : 0) + '%' }"
          ></div>
        </div>

        <h2 class="text-xl sm:text-2xl font-semibold leading-snug min-h-[3.5rem]">{{ currentQuestion.text }}</h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            v-for="(option, slot) in currentQuestion.options"
            :key="option.original"
            @click="answer(option.original)"
            :disabled="game.phase !== 'question' || myChoice !== null || me?.answered"
            :class="[
              'relative flex items-center gap-3 min-h-[3.75rem] px-4 py-3 rounded-lg text-left text-white font-semibold transition-all duration-150',
              answerStyles[slot].color,
              optionState(option) === 'dim' && 'opacity-30',
              optionState(option) === 'chosen' && 'ring-4 ring-offset-2 ring-violet-400',
              optionState(option) === 'correct' && 'ring-4 ring-offset-2 ring-emerald-400',
              optionState(option) === 'wrong' && 'opacity-50 line-through',
              isDarkMode ? 'ring-offset-gray-900' : 'ring-offset-white',
              optionState(option) === 'idle' && 'active:scale-[0.98]'
            ]"
          >
            <span class="text-lg opacity-80 w-5 text-center" aria-hidden="true">{{ answerStyles[slot].shape }}</span>
            <span class="flex-1">{{ option.label }}</span>
            <span v-if="optionState(option) === 'correct'" aria-hidden="true">✓</span>
          </button>
        </div>

        <!-- Status line -->
        <div
          v-if="game.phase === 'question'"
          :class="['text-center text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-600']"
        >
          <span v-if="myChoice !== null || me?.answered">{{ t.quizLocked }} · </span>
          {{ fmt(t.quizAnswered, { n: answeredCount, total: onlinePlayers.length }) }}
        </div>

        <template v-else>
          <div
            :class="[
              'rounded-lg border px-4 py-3 text-center font-semibold',
              me?.lastPoints > 0
                ? (isDarkMode ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800')
                : (isDarkMode ? 'border-rose-500/40 bg-rose-500/10 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-800')
            ]"
          >
            {{ me?.lastPoints > 0 ? fmt(t.quizCorrect, { points: me.lastPoints }) : (me?.answered ? t.quizWrong : t.quizNoAnswer) }}
          </div>

          <ol :class="['rounded-lg border divide-y', isDarkMode ? 'border-gray-800 divide-gray-800' : 'border-gray-200 divide-gray-200']">
            <li v-for="(player, index) in leaderboard" :key="player.id" class="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span :class="['w-5 tabular-nums', isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ index + 1 }}</span>
              <span :class="['truncate', player.id === myId && 'font-semibold', player.offline && 'opacity-40']">{{ player.name }}</span>
              <span v-if="player.lastPoints" class="text-emerald-500 text-xs font-semibold">+{{ player.lastPoints }}</span>
              <span class="ml-auto font-mono font-semibold tabular-nums">{{ player.score }}</span>
            </li>
          </ol>

          <button
            v-if="role === 'host'"
            @click="nextQuestion"
            class="w-full h-12 rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-500 transition-colors"
          >
            {{ game.round >= game.totalRounds ? t.quizSeeResults : t.quizNext }}
          </button>
          <p v-else :class="['text-center text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-600']">{{ t.quizWaitingNext }}</p>
        </template>
      </div>

      <!-- Final results -->
      <div v-else-if="game.phase === 'final'" class="space-y-6">
        <div class="text-center">
          <div class="text-5xl mb-3">🏆</div>
          <h2 class="text-2xl font-bold">{{ t.quizFinalTitle }}</h2>
          <p v-if="leaderboard[0]" :class="['mt-1', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
            {{ isTie ? t.quizTie : fmt(t.quizWinner, { name: leaderboard[0].name }) }}
          </p>
        </div>

        <ol :class="['rounded-lg border divide-y', isDarkMode ? 'border-gray-800 divide-gray-800' : 'border-gray-200 divide-gray-200']">
          <li v-for="(player, index) in leaderboard" :key="player.id" class="flex items-center gap-3 px-4 py-3">
            <span class="w-7 text-lg">{{ ['🥇', '🥈', '🥉'][index] || index + 1 }}</span>
            <span :class="['truncate', player.id === myId && 'font-semibold']">{{ player.name }}</span>
            <span class="ml-auto font-mono font-bold tabular-nums">{{ player.score }}</span>
          </li>
        </ol>

        <button
          v-if="role === 'host'"
          @click="playAgain"
          class="w-full h-12 rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-500 transition-colors"
        >
          {{ t.playAgain }}
        </button>
        <p v-else :class="['text-center text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-600']">{{ t.quizWaitingHost }}</p>
      </div>
    </template>
  </div>
</template>
