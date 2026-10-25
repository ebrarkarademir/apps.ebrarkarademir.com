<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import confetti from 'canvas-confetti'
import { useOnlineRoom } from '../online/useOnlineRoom'
import OnlineRoom from '../online/OnlineRoom.vue'

const props = defineProps({
  isDarkMode: {
    type: Boolean,
    default: false
  },
  t: {
    type: Object,
    required: true
  },
  // Room code from a shared invite link
  initialCode: { type: String, default: '' }
})

defineEmits(['go-back'])

const MIN_PLAYERS = 3
const MAX_PLAYERS = 12
const TWO_SPIES_MIN_PLAYERS = 6
const ACCUSE_REVEAL_MS = 1200
const GUESS_OPTION_COUNT = 8
const ADD_TIME_MS = 30000

// Same index in EN and TR refers to the same word, so every device can show its own language
const themeWords = {
  animals: {
    icon: '🦁',
    EN: ['Lion', 'Elephant', 'Giraffe', 'Penguin', 'Kangaroo', 'Dolphin', 'Owl', 'Crocodile', 'Panda', 'Horse', 'Octopus', 'Butterfly'],
    TR: ['Aslan', 'Fil', 'Zürafa', 'Penguen', 'Kanguru', 'Yunus', 'Baykuş', 'Timsah', 'Panda', 'At', 'Ahtapot', 'Kelebek']
  },
  countries: {
    icon: '🌍',
    EN: ['Turkey', 'Japan', 'Brazil', 'Egypt', 'France', 'India', 'Italy', 'Mexico', 'Canada', 'Australia', 'Norway', 'Greece'],
    TR: ['Türkiye', 'Japonya', 'Brezilya', 'Mısır', 'Fransa', 'Hindistan', 'İtalya', 'Meksika', 'Kanada', 'Avustralya', 'Norveç', 'Yunanistan']
  },
  jobs: {
    icon: '💼',
    EN: ['Doctor', 'Teacher', 'Chef', 'Pilot', 'Painter', 'Engineer', 'Firefighter', 'Lawyer', 'Farmer', 'Dentist', 'Photographer', 'Police officer'],
    TR: ['Doktor', 'Öğretmen', 'Aşçı', 'Pilot', 'Ressam', 'Mühendis', 'İtfaiyeci', 'Avukat', 'Çiftçi', 'Diş hekimi', 'Fotoğrafçı', 'Polis']
  },
  foods: {
    icon: '🍕',
    EN: ['Pizza', 'Sushi', 'Kebab', 'Pasta', 'Burger', 'Taco', 'Baklava', 'Soup', 'Pancake', 'Salad', 'Ice cream', 'Popcorn'],
    TR: ['Pizza', 'Suşi', 'Kebap', 'Makarna', 'Hamburger', 'Tako', 'Baklava', 'Çorba', 'Pankek', 'Salata', 'Dondurma', 'Patlamış mısır']
  },
  sports: {
    icon: '⚽',
    EN: ['Football', 'Basketball', 'Tennis', 'Swimming', 'Boxing', 'Golf', 'Volleyball', 'Skiing', 'Cycling', 'Chess', 'Archery', 'Surfing'],
    TR: ['Futbol', 'Basketbol', 'Tenis', 'Yüzme', 'Boks', 'Golf', 'Voleybol', 'Kayak', 'Bisiklet', 'Satranç', 'Okçuluk', 'Sörf']
  },
  places: {
    icon: '📍',
    EN: ['Beach', 'Hospital', 'School', 'Airport', 'Cinema', 'Library', 'Supermarket', 'Museum', 'Zoo', 'Restaurant', 'Gym', 'Train station'],
    TR: ['Plaj', 'Hastane', 'Okul', 'Havalimanı', 'Sinema', 'Kütüphane', 'Süpermarket', 'Müze', 'Hayvanat bahçesi', 'Restoran', 'Spor salonu', 'Tren garı']
  },
  objects: {
    icon: '🧸',
    EN: ['Umbrella', 'Mirror', 'Guitar', 'Clock', 'Toothbrush', 'Candle', 'Backpack', 'Scissors', 'Pillow', 'Camera', 'Key', 'Glasses'],
    TR: ['Şemsiye', 'Ayna', 'Gitar', 'Saat', 'Diş fırçası', 'Mum', 'Sırt çantası', 'Makas', 'Yastık', 'Fotoğraf makinesi', 'Anahtar', 'Gözlük']
  }
}
const themeKeys = Object.keys(themeWords)

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const randomInt = (max) => Math.floor(Math.random() * max)

const shuffle = (array) => {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')

// ---------- Host-side game rules ----------

const onlineIds = (s) => s.players.filter(p => p.online).map(p => p.id)
// Players dealt into this round who are still connected
const activeRoster = (s) => s.roster.filter(id => s.players.some(p => p.id === id && p.online))
const effectiveSpyCount = (s, playerCount) => (playerCount >= TWO_SPIES_MIN_PLAYERS ? s.spyCount : 1)

const countVotes = (s) => {
  const counts = Object.fromEntries(s.candidates.map(id => [id, 0]))
  Object.values(s.votes).forEach(target => { if (target in counts) counts[target]++ })
  return s.candidates.map(id => ({ id, count: counts[id] })).sort((a, b) => b.count - a.count)
}
const leadersOf = (s) => {
  const rows = countVotes(s)
  return rows.filter(row => row.count === rows[0]?.count).map(row => row.id)
}

function startRound (s) {
  s.roundNumber++
  s.roster = onlineIds(s)
  s.themeKey = s.themeChoice === 'random' ? themeKeys[randomInt(themeKeys.length)] : s.themeChoice
  const wordCount = themeWords[s.themeKey].EN.length
  let index
  do {
    index = randomInt(wordCount)
  } while (`${s.themeKey}:${index}` === s.lastWordId)
  s.wordIndex = index
  s.lastWordId = `${s.themeKey}:${index}`
  s.spies = shuffle(s.roster).slice(0, effectiveSpyCount(s, s.roster.length))
  s.firstAsker = s.roster[randomInt(s.roster.length)]
  Object.assign(s, {
    ready: {}, votes: {}, candidates: [], runoff: false, accused: null,
    guessOptions: [], guessed: null, outcome: null, deadline: null, pausedLeft: null,
    phase: 'reveal'
  })
}

function startDiscussion (s) {
  s.deadline = Date.now() + s.minutes * 60000
  s.pausedLeft = null
  s.phase = 'discussion'
}

function startVoting (s, candidates, runoff) {
  s.deadline = null
  s.pausedLeft = null
  s.candidates = candidates
  s.runoff = runoff
  s.votes = {}
  s.phase = 'voting'
}

function openTally (s) {
  const leaders = leadersOf(s)
  s.accused = leaders.length === 1 ? leaders[0] : null
  s.phase = 'tally'
}

function openSpyGuess (s) {
  const decoys = shuffle(themeWords[s.themeKey].EN.map((_, i) => i).filter(i => i !== s.wordIndex))
  s.guessOptions = shuffle([s.wordIndex, ...decoys.slice(0, GUESS_OPTION_COUNT - 1)])
  s.guessed = null
  s.phase = 'spyGuess'
}

function finishRound (s, result) {
  s.outcome = result
  s.roster.forEach(id => {
    const isSpy = s.spies.includes(id)
    if (result === 'group' && !isSpy) s.scores[id] = (s.scores[id] || 0) + 1
    if (result !== 'group' && isSpy) {
      s.scores[id] = (s.scores[id] || 0) + (result === 'spyGuess' && id === s.accused ? 3 : 2)
    }
  })
  s.phase = 'result'
}

// Move on as soon as every connected player in the round has acted
function checkProgress (s) {
  const active = activeRoster(s)
  if (s.phase === 'reveal' && active.every(id => s.ready[id])) startDiscussion(s)
  else if (s.phase === 'voting' && active.every(id => id in s.votes)) openTally(s)
}

function onAction (s, playerId, action) {
  const isHost = playerId === s.hostId
  const inRound = s.roster.includes(playerId)
  switch (action.type) {
    case 'setTheme':
      if (isHost && s.phase === 'lobby' && (action.value === 'random' || themeKeys.includes(action.value))) s.themeChoice = action.value
      break
    case 'setMinutes':
      if (isHost && s.phase === 'lobby' && [1, 2, 3, 5].includes(action.value)) s.minutes = action.value
      break
    case 'setSpyCount':
      if (isHost && s.phase === 'lobby' && [1, 2].includes(action.value)) s.spyCount = action.value
      break
    case 'start':
      if (!isHost || s.phase !== 'lobby' || onlineIds(s).length < MIN_PLAYERS) return
      s.scores = {}
      s.roundNumber = 0
      startRound(s)
      break
    case 'ready':
      if (s.phase === 'reveal' && inRound) {
        s.ready[playerId] = true
        checkProgress(s)
      }
      break
    case 'startDiscussion':
      if (isHost && s.phase === 'reveal') startDiscussion(s)
      break
    case 'pause':
      if (isHost && s.phase === 'discussion' && s.deadline) {
        s.pausedLeft = Math.max(0, s.deadline - Date.now())
        s.deadline = null
      }
      break
    case 'resume':
      if (isHost && s.phase === 'discussion' && s.pausedLeft !== null) {
        s.deadline = Date.now() + s.pausedLeft
        s.pausedLeft = null
      }
      break
    case 'addTime':
      if (isHost && s.phase === 'discussion') {
        if (s.pausedLeft !== null) s.pausedLeft += ADD_TIME_MS
        else s.deadline += ADD_TIME_MS
      }
      break
    case 'endDiscussion':
      if (isHost && s.phase === 'discussion') startVoting(s, [...s.roster], false)
      break
    case 'vote':
      if (s.phase === 'voting' && inRound && action.target !== playerId && s.candidates.includes(action.target)) {
        s.votes[playerId] = action.target
        checkProgress(s)
      }
      break
    case 'runoff':
      if (isHost && s.phase === 'tally' && s.accused === null && !s.runoff) startVoting(s, leadersOf(s), true)
      break
    case 'continue':
      if (!isHost) return
      if (s.phase === 'tally') {
        if (s.accused !== null && s.spies.includes(s.accused)) openSpyGuess(s)
        else if (s.accused !== null || s.runoff) finishRound(s, 'spy')
      } else if (s.phase === 'spyGuess') {
        finishRound(s, s.guessed === s.wordIndex ? 'spyGuess' : 'group')
      }
      break
    case 'guess':
      if (s.phase === 'spyGuess' && playerId === s.accused && s.guessed === null && s.guessOptions.includes(action.index)) {
        s.guessed = action.index
      }
      break
    case 'nextRound':
      if (isHost && s.phase === 'result') {
        if (onlineIds(s).length >= MIN_PLAYERS) startRound(s)
        else s.phase = 'lobby'
      }
      break
    case 'newGame':
      if (isHost && s.phase === 'result') {
        s.players = s.players.filter(p => p.online)
        s.phase = 'lobby'
      }
      break
  }
}

const room = useOnlineRoom({
  game: 'casus-kim',
  initialCode: props.initialCode,
  initialState: () => ({
    themeChoice: 'random', minutes: 2, spyCount: 1,
    roundNumber: 0, roster: [], themeKey: '', wordIndex: -1, lastWordId: '', spies: [], firstAsker: null,
    ready: {}, deadline: null, pausedLeft: null,
    candidates: [], runoff: false, votes: {}, accused: null,
    guessOptions: [], guessed: null, outcome: null, scores: {}
  }),
  // Each player gets only their own role. Spies, the word and individual votes stay on the
  // host until the round ends.
  project: (s, playerId) => {
    const { spies, wordIndex, votes, lastWordId, ...visible } = s
    const revealAll = s.phase === 'result'
    const inRound = s.roster.includes(playerId)
    const amSpy = spies.includes(playerId)
    const knowsWord = revealAll || (inRound && !amSpy) || (s.phase === 'spyGuess' && s.guessed !== null)
    const accusedKnown = ['tally', 'spyGuess', 'result'].includes(s.phase) && s.accused !== null
    return {
      ...visible,
      me: { inRound, isSpy: amSpy },
      wordIndex: knowsWord ? wordIndex : null,
      spies: revealAll ? spies : [],
      accusedIsSpy: accusedKnown ? spies.includes(s.accused) : null,
      voted: Object.keys(votes),
      myVote: votes[playerId] ?? null,
      tally: s.phase === 'tally' ? countVotes(s) : [],
      lastVotes: revealAll ? votes : {}
    }
  },
  onAction,
  onLeave: checkProgress,
  onTick: (s, now) => {
    if (s.phase === 'discussion' && s.deadline && now >= s.deadline) startVoting(s, [...s.roster], false)
  }
})

// ---------- View ----------

const view = computed(() => room.view)
const lang = computed(() => (props.t.langCode === 'TR' ? 'TR' : 'EN'))
const players = computed(() => view.value?.players || [])
const nameOf = (id) => players.value.find(p => p.id === id)?.name || ''
const onlineCount = computed(() => players.value.filter(p => p.online).length)
const rosterOnline = computed(() => (view.value?.roster || []).filter(id => players.value.some(p => p.id === id && p.online)))

const me = computed(() => view.value?.me || { inRound: false, isSpy: false })
const theme = computed(() => (view.value?.themeKey ? themeWords[view.value.themeKey] : null))
const themeLabel = computed(() => (view.value?.themeKey ? props.t[view.value.themeKey] : ''))
const word = computed(() => (theme.value && view.value.wordIndex !== null ? theme.value[lang.value][view.value.wordIndex] : ''))
const isSpy = (id) => view.value?.spies.includes(id)

// Role card
const cardFlipped = ref(false)
const showMyCard = ref(false)
const isReady = computed(() => !!view.value?.ready[room.myId])
const readyCount = computed(() => rosterOnline.value.filter(id => view.value.ready[id]).length)

watch(() => view.value?.roundNumber, () => {
  cardFlipped.value = false
  showMyCard.value = false
})

// Discussion
const RING_CIRCUMFERENCE = 2 * Math.PI * 52
const msLeft = computed(() => {
  const v = view.value
  if (!v) return 0
  if (v.pausedLeft !== null) return v.pausedLeft
  return Math.max(0, (v.deadline || 0) - room.now)
})
const timeLeft = computed(() => Math.ceil(msLeft.value / 1000))
const totalTime = computed(() => Math.max((view.value?.minutes || 1) * 60, timeLeft.value))
const ringOffset = computed(() => RING_CIRCUMFERENCE * (1 - timeLeft.value / totalTime.value))
const formattedTime = computed(() => `${Math.floor(timeLeft.value / 60)}:${(timeLeft.value % 60).toString().padStart(2, '0')}`)
const isPaused = computed(() => view.value?.pausedLeft !== null)
const isLowTime = computed(() => timeLeft.value <= 10)
const exampleQuestions = computed(() => [1, 2, 3, 4, 5, 6].map(n => props.t[`spyQ${n}`]))

// Voting
const pendingVote = ref(null)
watch(() => [view.value?.phase, view.value?.runoff], () => { pendingVote.value = null })
const voteOptions = computed(() => (view.value?.candidates || []).filter(id => id !== room.myId))
const hasVoted = computed(() => view.value?.myVote !== null && view.value?.myVote !== undefined)
const votedCount = computed(() => rosterOnline.value.filter(id => view.value.voted.includes(id)).length)

// Tally: the accused's role is revealed after a short drumroll on every device
const accusedRevealed = ref(false)
let revealTimer = null
watch(() => view.value?.phase, (phase) => {
  clearTimeout(revealTimer)
  accusedRevealed.value = false
  if (phase === 'tally') revealTimer = setTimeout(() => { accusedRevealed.value = true }, prefersReducedMotion() ? 0 : ACCUSE_REVEAL_MS)
})
onUnmounted(() => clearTimeout(revealTimer))

const maxVotes = computed(() => Math.max(1, ...(view.value?.tally || []).map(row => row.count)))
const leaders = computed(() => {
  const rows = view.value?.tally || []
  return rows.filter(row => row.count === rows[0]?.count).map(row => row.id)
})
const isTie = computed(() => view.value?.phase === 'tally' && view.value.accused === null)

// Spy's last chance
const amAccused = computed(() => view.value?.accused === room.myId)
const guessCorrect = computed(() => view.value?.guessed !== null && view.value?.guessed === view.value?.wordIndex)

// Result
const spyTeamWon = computed(() => view.value?.outcome === 'spy' || view.value?.outcome === 'spyGuess')
watch(() => view.value?.phase, (phase) => {
  if (phase === 'result' && view.value.outcome === 'group' && !prefersReducedMotion()) {
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } })
  }
})

const scoreboard = computed(() =>
  players.value
    .map(p => ({ id: p.id, name: p.name, points: view.value.scores[p.id] || 0 }))
    .sort((a, b) => b.points - a.points)
)

// Shared button styles
const optionClass = (active, disabled = false) => [
  'px-4 py-3 rounded-lg font-medium border transition-colors',
  disabled
    ? 'opacity-40 cursor-not-allowed ' + (props.isDarkMode ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-gray-400')
    : active
      ? 'bg-violet-600 border-violet-600 text-white'
      : props.isDarkMode
        ? 'border-gray-700 text-gray-200 hover:bg-gray-800'
        : 'border-gray-300 text-gray-700 hover:bg-gray-100'
]
const primaryClass = 'w-full px-6 py-4 rounded-lg font-semibold bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
const secondaryClass = computed(() => [
  'w-full px-6 py-3 rounded-lg font-semibold border transition-colors',
  props.isDarkMode ? 'border-gray-700 hover:bg-gray-800 text-gray-100' : 'border-gray-300 hover:bg-gray-100 text-gray-700'
])
const mutedText = computed(() => (props.isDarkMode ? 'text-gray-400' : 'text-gray-500'))
const panelClass = computed(() => [
  'rounded-lg p-4 border',
  props.isDarkMode ? 'bg-gray-950/40 border-gray-800' : 'bg-gray-50 border-gray-200'
])
</script>

<template>
  <OnlineRoom
    :room="room"
    :t="t"
    :isDarkMode="isDarkMode"
    :title="'🕵️ ' + t.casusTitle"
    :minPlayers="MIN_PLAYERS"
    :canStart="onlineCount <= MAX_PLAYERS"
    :startHint="t.spyMaxPlayers"
    @go-back="$emit('go-back')"
    @start="room.act('start')"
  >
    <!-- Lobby settings (host chooses, everyone sees) -->
    <template #lobby="{ view: lobby, isHost }">
      <div class="space-y-6">
        <section class="space-y-3">
          <h2 class="font-semibold">{{ t.selectTheme }}</h2>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button @click="room.act('setTheme', { value: 'random' })" :disabled="!isHost" :class="[optionClass(lobby.themeChoice === 'random'), 'disabled:cursor-default']">
              🎲 {{ t.spyRandomTheme }}
            </button>
            <button
              v-for="key in themeKeys"
              :key="key"
              @click="room.act('setTheme', { value: key })"
              :disabled="!isHost"
              :class="[optionClass(lobby.themeChoice === key), 'disabled:cursor-default']"
            >
              {{ themeWords[key].icon }} {{ t[key] }}
            </button>
          </div>
        </section>

        <section class="grid sm:grid-cols-2 gap-6">
          <div class="space-y-3">
            <h2 class="font-semibold">{{ t.spyDiscussionLength }}</h2>
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="minutes in [1, 2, 3, 5]"
                :key="minutes"
                @click="room.act('setMinutes', { value: minutes })"
                :disabled="!isHost"
                :class="[optionClass(lobby.minutes === minutes), 'disabled:cursor-default px-2']"
              >
                {{ fmt(t.spyMinutes, { n: minutes }) }}
              </button>
            </div>
          </div>
          <div class="space-y-3">
            <h2 class="font-semibold">{{ t.spySpyCount }}</h2>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="count in [1, 2]"
                :key="count"
                @click="room.act('setSpyCount', { value: count })"
                :disabled="!isHost || (count === 2 && onlineCount < TWO_SPIES_MIN_PLAYERS)"
                :class="optionClass(
                  (onlineCount >= TWO_SPIES_MIN_PLAYERS ? lobby.spyCount : 1) === count,
                  count === 2 && onlineCount < TWO_SPIES_MIN_PLAYERS
                )"
              >
                {{ '🕵️'.repeat(count) }} {{ count }}
              </button>
            </div>
            <p v-if="onlineCount < TWO_SPIES_MIN_PLAYERS" :class="['text-xs', mutedText]">{{ t.spyTwoSpiesHint }}</p>
          </div>
        </section>
      </div>
    </template>

    <div class="space-y-6">
      <p :class="['text-sm text-center', mutedText]">{{ fmt(t.spyRound, { n: view.roundNumber }) }}</p>

      <!-- Joined mid-round: no card until the next one -->
      <div v-if="!me.inRound && view.phase !== 'result'" :class="[panelClass, 'text-center py-10 space-y-2']">
        <div class="text-5xl">⏳</div>
        <p class="font-semibold">{{ t.spyNotInRound }}</p>
      </div>

      <!-- Role reveal -->
      <div v-else-if="view.phase === 'reveal'" class="space-y-6 text-center">
        <button
          type="button"
          class="flip-card mx-auto block w-full max-w-xs aspect-[3/4] focus:outline-none"
          :class="{ flipped: cardFlipped }"
          @click="cardFlipped = !cardFlipped"
          :aria-label="t.spyTapToReveal"
        >
          <div class="flip-card-inner">
            <!-- Front (face down) -->
            <div class="flip-card-face rounded-xl shadow-xl flex flex-col items-center justify-center gap-4 p-6 border border-violet-400/40 bg-gradient-to-br from-violet-600 to-indigo-800 text-white">
              <span class="text-6xl">🕵️</span>
              <span class="font-semibold">{{ t.spyTapToReveal }}</span>
              <span class="text-sm text-white/70">{{ t.spyKeepSecret }}</span>
            </div>
            <!-- Back (role) -->
            <div
              :class="[
                'flip-card-face flip-card-back rounded-xl shadow-xl flex flex-col items-center justify-center gap-3 p-6 text-white',
                me.isSpy ? 'bg-gradient-to-br from-rose-500 to-rose-800' : 'bg-gradient-to-br from-emerald-500 to-teal-800'
              ]"
            >
              <template v-if="me.isSpy">
                <span class="text-6xl">🕶️</span>
                <span class="text-2xl font-bold">{{ t.youAreSpy }}</span>
                <span class="text-sm uppercase tracking-[0.18em] opacity-80 mt-2">{{ t.spyTheme }}</span>
                <span class="text-xl font-semibold">{{ theme.icon }} {{ themeLabel }}</span>
                <span class="text-sm opacity-90 mt-2">{{ t.spyHint }}</span>
              </template>
              <template v-else>
                <span class="text-sm uppercase tracking-[0.18em] opacity-80">{{ t.spyTheme }}</span>
                <span class="text-lg font-semibold">{{ theme.icon }} {{ themeLabel }}</span>
                <span class="text-sm uppercase tracking-[0.18em] opacity-80 mt-4">{{ t.spySecretWord }}</span>
                <span class="text-3xl font-bold break-words">{{ word }}</span>
              </template>
            </div>
          </div>
        </button>

        <button v-if="!isReady" @click="cardFlipped = false; room.act('ready')" :disabled="!cardFlipped" :class="primaryClass">
          {{ t.spyReady }}
        </button>
        <p :class="['text-sm', mutedText]">{{ fmt(t.spyReadyCount, { n: readyCount, total: rosterOnline.length }) }}</p>
        <button v-if="room.isHost" @click="room.act('startDiscussion')" :class="secondaryClass">{{ t.spyStartDiscussion }}</button>
      </div>

      <!-- Discussion -->
      <div v-else-if="view.phase === 'discussion'" class="space-y-6 text-center">
        <h2 class="text-xl font-semibold">{{ t.discussionTime }}</h2>

        <div class="relative mx-auto w-52 h-52" :class="{ 'low-time': isLowTime && !isPaused }">
          <svg viewBox="0 0 120 120" class="w-full h-full -rotate-90" aria-hidden="true">
            <circle cx="60" cy="60" r="52" fill="none" stroke-width="8" :class="isDarkMode ? 'stroke-gray-800' : 'stroke-gray-200'" />
            <circle
              cx="60" cy="60" r="52" fill="none" stroke-width="8" stroke-linecap="round"
              :class="isLowTime ? 'stroke-rose-500' : 'stroke-violet-500'"
              :stroke-dasharray="RING_CIRCUMFERENCE"
              :stroke-dashoffset="ringOffset"
              style="transition: stroke-dashoffset 1s linear"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span :class="['text-5xl font-bold tabular-nums', isLowTime ? 'text-rose-500' : '']" role="timer" aria-live="off">
              {{ formattedTime }}
            </span>
            <span v-if="isPaused" :class="['text-sm font-medium mt-1', mutedText]">{{ t.spyPaused }}</span>
          </div>
        </div>

        <div :class="[panelClass, 'text-lg']">
          🎤 {{ fmt(t.spyFirstAsker, { name: nameOf(view.firstAsker) }) }}
        </div>

        <!-- Peek at your own role again -->
        <button @click="showMyCard = !showMyCard" :class="secondaryClass">👁 {{ t.spyMyCard }}</button>
        <div
          v-if="showMyCard"
          :class="['rounded-lg p-4 text-white', me.isSpy ? 'bg-gradient-to-br from-rose-500 to-rose-800' : 'bg-gradient-to-br from-emerald-500 to-teal-800']"
        >
          <p class="text-sm opacity-80">{{ theme.icon }} {{ themeLabel }}</p>
          <p class="text-2xl font-bold">{{ me.isSpy ? t.youAreSpy : word }}</p>
        </div>

        <div v-if="room.isHost" class="grid grid-cols-2 gap-3">
          <button @click="room.act(isPaused ? 'resume' : 'pause')" :class="secondaryClass">
            {{ isPaused ? '▶ ' + t.spyResume : '⏸ ' + t.spyPause }}
          </button>
          <button @click="room.act('addTime')" :class="secondaryClass">⏱ {{ t.spyAddTime }}</button>
        </div>

        <details :class="[panelClass, 'text-left']">
          <summary class="cursor-pointer font-medium">💡 {{ t.spyNeedIdeas }}</summary>
          <ul class="mt-3 space-y-2">
            <li v-for="question in exampleQuestions" :key="question" :class="['text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-600']">
              “{{ question }}”
            </li>
          </ul>
        </details>

        <button v-if="room.isHost" @click="room.act('endDiscussion')" :class="primaryClass">
          {{ t.endDiscussion }}
        </button>
      </div>

      <!-- Voting: everyone votes on their own device at the same time -->
      <div v-else-if="view.phase === 'voting'" class="space-y-6 text-center">
        <p v-if="view.runoff" class="inline-block px-3 py-1 rounded-md text-xs font-bold uppercase tracking-[0.18em] bg-amber-500/20 text-amber-600">
          {{ t.spyRunoff }}
        </p>

        <template v-if="!hasVoted">
          <h2 class="text-xl font-semibold">{{ fmt(t.spyVoteFor, { name: room.me?.name || '' }) }}</h2>
          <div class="grid grid-cols-2 gap-3">
            <button
              v-for="id in voteOptions"
              :key="id"
              @click="pendingVote = id"
              :class="optionClass(pendingVote === id)"
              :aria-pressed="pendingVote === id"
            >
              {{ nameOf(id) }}
            </button>
          </div>
          <button @click="room.act('vote', { target: pendingVote })" :disabled="pendingVote === null" :class="primaryClass">
            {{ t.spyConfirmVote }}
          </button>
        </template>
        <div v-else :class="[panelClass, 'py-8 space-y-2']">
          <div class="text-5xl">🗳️</div>
          <p class="font-semibold">{{ t.spyVoteCast }}</p>
        </div>
        <p :class="['text-sm', mutedText]">{{ fmt(t.spyVotedCount, { n: votedCount, total: rosterOnline.length }) }}</p>
      </div>

      <!-- Tally -->
      <div v-else-if="view.phase === 'tally'" class="space-y-6 text-center">
        <h2 class="text-2xl font-bold">{{ t.spyVotesIn }}</h2>

        <ul class="space-y-2 text-left">
          <li v-for="row in view.tally" :key="row.id" class="flex items-center gap-3">
            <span class="w-24 shrink-0 truncate font-medium">{{ nameOf(row.id) }}</span>
            <div :class="['flex-1 h-8 rounded-md overflow-hidden', isDarkMode ? 'bg-gray-800' : 'bg-gray-100']">
              <div
                class="tally-bar h-full rounded-md flex items-center justify-end px-2 text-sm font-bold text-white"
                :class="leaders.includes(row.id) ? 'bg-rose-500' : 'bg-violet-400'"
                :style="{ width: `${Math.max(row.count / maxVotes * 100, row.count ? 12 : 0)}%` }"
              >
                <span v-if="row.count">{{ row.count }}</span>
              </div>
            </div>
          </li>
        </ul>

        <div aria-live="polite" class="space-y-4">
          <template v-if="isTie">
            <p class="text-lg font-semibold text-amber-500">{{ view.runoff ? t.spyNoOneCaught : t.spyTie }}</p>
            <template v-if="room.isHost">
              <button v-if="!view.runoff" @click="room.act('runoff')" :class="primaryClass">{{ t.spyStartRunoff }}</button>
              <button v-else @click="room.act('continue')" :class="primaryClass">{{ t.spyContinue }}</button>
            </template>
          </template>
          <template v-else>
            <p class="text-xl font-semibold">{{ fmt(t.spyAccused, { name: nameOf(view.accused) }) }}</p>
            <Transition name="pop">
              <div v-if="accusedRevealed" class="space-y-4">
                <p :class="['text-2xl font-bold', view.accusedIsSpy ? 'text-emerald-500' : 'text-rose-500']">
                  {{ view.accusedIsSpy ? '🎯 ' + t.spyWasSpy : '😬 ' + t.spyWasNotSpy }}
                </p>
                <button v-if="room.isHost" @click="room.act('continue')" :class="primaryClass">{{ t.spyContinue }}</button>
              </div>
            </Transition>
          </template>
          <p v-if="!room.isHost" :class="['text-sm', mutedText]">{{ t.onlineWaitingNext }}</p>
        </div>
      </div>

      <!-- Spy's last chance: only the caught spy can pick -->
      <div v-else-if="view.phase === 'spyGuess'" class="space-y-6 text-center">
        <div class="text-6xl">🕶️</div>
        <h2 class="text-2xl font-bold">{{ t.spyLastChance }}</h2>
        <p class="text-lg">
          {{ amAccused ? fmt(t.spyGuessWord, { name: nameOf(view.accused) }) : fmt(t.spyGuessing, { name: nameOf(view.accused) }) }}
        </p>

        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="option in view.guessOptions"
            :key="option"
            @click="room.act('guess', { index: option })"
            :disabled="!amAccused || view.guessed !== null"
            :class="[
              'px-4 py-3 rounded-lg font-medium border transition-colors',
              view.guessed === null
                ? (isDarkMode ? 'border-gray-700 text-gray-100' : 'border-gray-300 text-gray-800') + (amAccused ? (isDarkMode ? ' hover:bg-gray-800' : ' hover:bg-gray-100') : ' cursor-default')
                : option === view.wordIndex
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : option === view.guessed
                    ? 'bg-rose-500 border-rose-500 text-white'
                    : 'opacity-40 ' + (isDarkMode ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-500')
            ]"
          >
            {{ themeWords[view.themeKey][lang][option] }}
          </button>
        </div>

        <Transition name="pop">
          <div v-if="view.guessed !== null" class="space-y-4" aria-live="polite">
            <p :class="['text-2xl font-bold', guessCorrect ? 'text-rose-500' : 'text-emerald-500']">
              {{ guessCorrect ? t.spyGuessedRight : t.spyGuessedWrong }}
            </p>
          </div>
        </Transition>
        <button v-if="room.isHost && view.guessed !== null" @click="room.act('continue')" :class="primaryClass">
          {{ t.spyContinue }}
        </button>
      </div>

      <!-- Result -->
      <div v-else-if="view.phase === 'result'" class="space-y-6">
        <div
          :class="[
            'rounded-xl p-6 text-center text-white shadow-lg',
            spyTeamWon ? 'bg-gradient-to-br from-rose-500 to-rose-800' : 'bg-gradient-to-br from-emerald-500 to-teal-800'
          ]"
        >
          <div class="text-6xl mb-2">{{ spyTeamWon ? '🕶️' : '🎉' }}</div>
          <h2 class="text-3xl font-bold">{{ spyTeamWon ? t.spyWins : t.groupWins }}</h2>
          <p v-if="view.outcome === 'spyGuess'" class="mt-2 opacity-90">{{ t.spyGuessedRight }}</p>
        </div>

        <div class="grid sm:grid-cols-2 gap-3">
          <div :class="panelClass">
            <p :class="['text-xs font-bold uppercase tracking-[0.18em] mb-1', mutedText]">
              {{ view.spies.length > 1 ? t.spySpiesWere : t.spyWas }}
            </p>
            <p class="text-lg font-semibold">🕵️ {{ view.spies.map(nameOf).join(', ') }}</p>
          </div>
          <div :class="panelClass">
            <p :class="['text-xs font-bold uppercase tracking-[0.18em] mb-1', mutedText]">{{ t.wordWas }}</p>
            <p class="text-lg font-semibold">{{ theme.icon }} {{ word }}</p>
          </div>
        </div>

        <div v-if="Object.keys(view.lastVotes).length" :class="panelClass">
          <p :class="['text-xs font-bold uppercase tracking-[0.18em] mb-2', mutedText]">{{ t.spyVotes }}</p>
          <ul class="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <li v-for="(target, voter) in view.lastVotes" :key="voter" class="flex gap-2">
              <span class="font-medium truncate">{{ nameOf(voter) }}</span>
              <span :class="mutedText">{{ t.spyVotedFor }}</span>
              <span :class="['truncate', isSpy(target) ? 'text-emerald-500 font-semibold' : '']">{{ nameOf(target) }}</span>
            </li>
          </ul>
        </div>

        <div :class="panelClass">
          <p :class="['text-xs font-bold uppercase tracking-[0.18em] mb-3', mutedText]">🏆 {{ t.spyScoreboard }}</p>
          <ol class="space-y-2">
            <li v-for="(row, rank) in scoreboard" :key="row.id" class="flex items-center gap-3">
              <span class="w-6 text-center">{{ ['🥇', '🥈', '🥉'][rank] || rank + 1 }}</span>
              <span :class="['flex-1 truncate font-medium', { 'font-bold': row.id === room.myId }]">
                {{ row.name }}
                <span v-if="isSpy(row.id)" class="text-xs">🕵️</span>
              </span>
              <span class="font-bold tabular-nums">{{ row.points }} {{ t.spyPoints }}</span>
            </li>
          </ol>
          <p :class="['text-xs mt-3', mutedText]">{{ t.spyScoringInfo }}</p>
        </div>

        <div v-if="room.isHost" class="grid sm:grid-cols-2 gap-3">
          <button @click="room.act('newGame')" :class="secondaryClass">{{ t.spyNewGame }}</button>
          <button @click="room.act('nextRound')" :class="primaryClass">{{ t.spyNextRound }}</button>
        </div>
        <p v-else :class="['text-center text-sm', mutedText]">{{ t.onlineWaitingNext }}</p>
      </div>
    </div>
  </OnlineRoom>
</template>

<style scoped>
/* Role card flip */
.flip-card {
  perspective: 1200px;
}
.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}
.flip-card.flipped .flip-card-inner {
  transform: rotateY(180deg);
}
.flip-card-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.flip-card-back {
  transform: rotateY(180deg);
}
.flip-card:not(.flipped):hover .flip-card-inner {
  transform: rotateY(8deg);
}

/* Last 10 seconds */
.low-time {
  animation: low-time-pulse 1s ease-in-out infinite;
}
@keyframes low-time-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
}

.tally-bar {
  animation: grow 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  transform-origin: left;
}
@keyframes grow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

.pop-enter-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1.4);
}
.pop-enter-from {
  opacity: 0;
  transform: scale(0.9);
}

@media (prefers-reduced-motion: reduce) {
  .flip-card-inner,
  .pop-enter-active {
    transition: none;
  }
  .low-time,
  .tally-bar {
    animation: none;
  }
}
</style>
