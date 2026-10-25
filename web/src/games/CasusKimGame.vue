<script setup>
import { ref, computed, onUnmounted } from 'vue'
import confetti from 'canvas-confetti'

const props = defineProps({
  isDarkMode: {
    type: Boolean,
    default: false
  },
  t: {
    type: Object,
    required: true
  }
})

defineEmits(['go-back'])

const MIN_PLAYERS = 3
const MAX_PLAYERS = 12
const TWO_SPIES_MIN_PLAYERS = 6
const FLIP_MS = 500
const ACCUSE_REVEAL_MS = 1200
const GUESS_OPTION_COUNT = 8
const STORAGE_KEY = 'spyGamePlayers'

// Same index in EN and TR refers to the same word, so switching language mid-round stays consistent
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

const format = (text, values) =>
  Object.entries(values).reduce((out, [key, value]) => out.replace(`{${key}}`, value), text)

const loadSavedPlayers = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(saved) ? saved.filter(name => typeof name === 'string').slice(0, MAX_PLAYERS) : []
  } catch {
    return []
  }
}

// Setup
const phase = ref('setup') // setup, reveal, discussion, voting, tally, spyGuess, result
const players = ref(loadSavedPlayers())
const nameInput = ref('')
const nameError = ref('')
const themeChoice = ref('random')
const discussionMinutes = ref(2)
const spyCount = ref(1)

const effectiveSpyCount = computed(() =>
  players.value.length >= TWO_SPIES_MIN_PLAYERS ? spyCount.value : 1
)
const canStart = computed(() => players.value.length >= MIN_PLAYERS)

const addPlayer = () => {
  const name = nameInput.value.trim()
  if (!name) return
  if (players.value.length >= MAX_PLAYERS) {
    nameError.value = 'spyMaxPlayers'
    return
  }
  if (players.value.some(p => p.toLowerCase() === name.toLowerCase())) {
    nameError.value = 'spyDuplicateName'
    return
  }
  players.value.push(name)
  nameInput.value = ''
  nameError.value = ''
}

const removePlayer = (index) => {
  players.value.splice(index, 1)
  nameError.value = ''
}

// Round state
const lang = computed(() => (props.t.langCode === 'TR' ? 'TR' : 'EN'))
const roundNumber = ref(0)
const themeKey = ref('')
const wordIndex = ref(-1)
const spies = ref([])
const firstAsker = ref(-1)
const scores = ref({})
let lastWordId = ''

const word = computed(() => (themeKey.value ? themeWords[themeKey.value][lang.value][wordIndex.value] : ''))
const themeLabel = computed(() => (themeKey.value ? props.t[themeKey.value] : ''))
const isSpy = (index) => spies.value.includes(index)

let pendingTimeout = null
const later = (fn, ms) => {
  clearTimeout(pendingTimeout)
  pendingTimeout = setTimeout(fn, prefersReducedMotion() ? 0 : ms)
}

const startGame = () => {
  if (!canStart.value) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players.value))
  } catch {
    // Remembering players is a convenience only
  }
  scores.value = Object.fromEntries(players.value.map(name => [name, 0]))
  roundNumber.value = 0
  startRound()
}

const startRound = () => {
  stopTimer()
  clearTimeout(pendingTimeout)
  roundNumber.value++

  themeKey.value = themeChoice.value === 'random' ? themeKeys[randomInt(themeKeys.length)] : themeChoice.value
  const wordCount = themeWords[themeKey.value].EN.length
  do {
    wordIndex.value = randomInt(wordCount)
  } while (`${themeKey.value}:${wordIndex.value}` === lastWordId)
  lastWordId = `${themeKey.value}:${wordIndex.value}`

  spies.value = shuffle(players.value.map((_, i) => i)).slice(0, effectiveSpyCount.value)
  firstAsker.value = randomInt(players.value.length)

  revealIndex.value = 0
  cardFlipped.value = false
  isAdvancing.value = false
  isRunoff.value = false
  accused.value = null
  outcome.value = null
  phase.value = 'reveal'
}

// Role reveal
const revealIndex = ref(0)
const cardFlipped = ref(false)
const isAdvancing = ref(false)
const allRevealed = computed(() => revealIndex.value >= players.value.length)

const hideAndPass = () => {
  if (isAdvancing.value) return
  cardFlipped.value = false
  isAdvancing.value = true
  // Wait for the card to flip back so the next player's role never shows mid-flip
  later(() => {
    revealIndex.value++
    isAdvancing.value = false
  }, FLIP_MS)
}

// Discussion
const timeLeft = ref(0)
const totalTime = ref(0)
const isPaused = ref(false)
let timerInterval = null

const RING_CIRCUMFERENCE = 2 * Math.PI * 52
const ringOffset = computed(() =>
  totalTime.value ? RING_CIRCUMFERENCE * (1 - timeLeft.value / totalTime.value) : 0
)
const formattedTime = computed(() => {
  const minutes = Math.floor(timeLeft.value / 60)
  const seconds = timeLeft.value % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})
const isLowTime = computed(() => timeLeft.value <= 10)
const exampleQuestions = computed(() => [1, 2, 3, 4, 5, 6].map(n => props.t[`spyQ${n}`]))

const stopTimer = () => {
  clearInterval(timerInterval)
  timerInterval = null
}

const startDiscussion = () => {
  totalTime.value = discussionMinutes.value * 60
  timeLeft.value = totalTime.value
  isPaused.value = false
  phase.value = 'discussion'
  stopTimer()
  timerInterval = setInterval(() => {
    if (isPaused.value) return
    timeLeft.value--
    if (timeLeft.value <= 0) startVoting(players.value.map((_, i) => i), false)
  }, 1000)
}

const addTime = () => {
  timeLeft.value += 30
  totalTime.value = Math.max(totalTime.value, timeLeft.value)
}

// Voting
const candidates = ref([])
const isRunoff = ref(false)
const votes = ref({}) // voter index -> candidate index
const voterIndex = ref(0)
const voterStage = ref('handoff') // handoff, choose
const pendingVote = ref(null)

const startVoting = (candidateList, runoff) => {
  stopTimer()
  candidates.value = candidateList
  isRunoff.value = runoff
  votes.value = {}
  voterIndex.value = 0
  voterStage.value = 'handoff'
  pendingVote.value = null
  phase.value = 'voting'
}

const voteOptions = computed(() => candidates.value.filter(i => i !== voterIndex.value))

const confirmVote = () => {
  if (pendingVote.value === null) return
  votes.value[voterIndex.value] = pendingVote.value
  pendingVote.value = null
  if (voterIndex.value + 1 < players.value.length) {
    voterIndex.value++
    voterStage.value = 'handoff'
  } else {
    openTally()
  }
}

// Tally
const accused = ref(null)
const accusedRevealed = ref(false)

const tally = computed(() => {
  const counts = Object.fromEntries(candidates.value.map(i => [i, 0]))
  Object.values(votes.value).forEach(target => { counts[target]++ })
  return candidates.value
    .map(index => ({ index, count: counts[index] }))
    .sort((a, b) => b.count - a.count)
})
const maxVotes = computed(() => Math.max(1, ...tally.value.map(row => row.count)))
const leaders = computed(() => tally.value.filter(row => row.count === tally.value[0]?.count).map(row => row.index))
const isTie = computed(() => leaders.value.length > 1)

const openTally = () => {
  phase.value = 'tally'
  accusedRevealed.value = false
  if (isTie.value) {
    accused.value = null
    return
  }
  accused.value = leaders.value[0]
  later(() => { accusedRevealed.value = true }, ACCUSE_REVEAL_MS)
}

const afterTally = () => {
  if (accused.value !== null && isSpy(accused.value)) {
    openSpyGuess()
  } else {
    finishRound('spy')
  }
}

// Spy's last chance
const guessOptions = ref([])
const guessedIndex = ref(null)
const guessCorrect = computed(() => guessedIndex.value === wordIndex.value)

const openSpyGuess = () => {
  const decoys = shuffle(themeWords[themeKey.value].EN.map((_, i) => i).filter(i => i !== wordIndex.value))
  guessOptions.value = shuffle([wordIndex.value, ...decoys.slice(0, GUESS_OPTION_COUNT - 1)])
  guessedIndex.value = null
  phase.value = 'spyGuess'
}

// Result
const outcome = ref(null) // group, spy, spyGuess
const lastVotes = ref({})
const spyTeamWon = computed(() => outcome.value === 'spy' || outcome.value === 'spyGuess')

const finishRound = (result) => {
  outcome.value = result
  lastVotes.value = { ...votes.value }
  players.value.forEach((name, index) => {
    if (result === 'group' && !isSpy(index)) scores.value[name] += 1
    if (result !== 'group' && isSpy(index)) {
      scores.value[name] += result === 'spyGuess' && index === accused.value ? 3 : 2
    }
  })
  phase.value = 'result'
  if (result === 'group' && !prefersReducedMotion()) {
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } })
  }
}

const scoreboard = computed(() =>
  players.value
    .map(name => ({ name, points: scores.value[name] || 0 }))
    .sort((a, b) => b.points - a.points)
)

const newGame = () => {
  stopTimer()
  clearTimeout(pendingTimeout)
  phase.value = 'setup'
}

onUnmounted(() => {
  stopTimer()
  clearTimeout(pendingTimeout)
})

// Shared button styles
const optionClass = (active, disabled = false) => [
  'px-4 py-3 rounded-xl font-medium transition-all duration-50',
  disabled
    ? 'opacity-40 cursor-not-allowed ' + (props.isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-400')
    : active
      ? 'bg-blue-500 text-white shadow-md'
      : props.isDarkMode
        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
]
const primaryClass = 'w-full px-6 py-4 rounded-xl font-semibold bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-50'
const secondaryClass = computed(() => [
  'w-full px-6 py-3 rounded-xl font-semibold transition-all duration-50',
  props.isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-100' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
])
const mutedText = computed(() => (props.isDarkMode ? 'text-gray-400' : 'text-gray-500'))
const panelClass = computed(() => [
  'rounded-2xl p-4 border',
  props.isDarkMode ? 'bg-gray-900/40 border-gray-700' : 'bg-gray-50 border-gray-200'
])
</script>

<template>
  <div
    :class="[
      'max-w-2xl mx-auto rounded-2xl shadow-lg p-6 sm:p-8 transition-colors duration-50 backdrop-blur-sm',
      isDarkMode ? 'bg-gray-800/90 shadow-gray-900/30' : 'bg-white/90 shadow-gray-200/70'
    ]"
  >
    <!-- Header -->
    <div class="flex justify-between items-center gap-4 mb-8">
      <button
        @click="$emit('go-back')"
        :class="[
          'px-4 py-2 rounded-lg transition-all duration-50 flex items-center gap-2',
          isDarkMode
            ? 'text-gray-300 hover:text-white hover:bg-gray-700'
            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
        ]"
      >
        <span class="text-lg">←</span>
        <span>{{ t.back }}</span>
      </button>
      <div class="text-right">
        <h1 class="text-2xl font-bold">🕵️ {{ t.casusTitle }}</h1>
        <p v-if="phase !== 'setup'" :class="['text-sm', mutedText]">
          {{ format(t.spyRound, { n: roundNumber }) }}
        </p>
      </div>
    </div>

    <!-- Setup -->
    <div v-if="phase === 'setup'" class="space-y-8">
      <section class="space-y-3">
        <div class="flex items-baseline justify-between">
          <h2 class="text-lg font-semibold">{{ t.addPlayers }}</h2>
          <span :class="['text-sm', mutedText]">{{ players.length }} / {{ MAX_PLAYERS }}</span>
        </div>
        <form class="flex gap-2" @submit.prevent="addPlayer">
          <input
            v-model="nameInput"
            type="text"
            maxlength="16"
            :placeholder="t.spyNamePlaceholder"
            :disabled="players.length >= MAX_PLAYERS"
            :class="[
              'flex-1 min-w-0 px-4 py-2 rounded-lg border-2 transition-colors duration-50',
              isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'
            ]"
          />
          <button
            type="submit"
            :disabled="!nameInput.trim() || players.length >= MAX_PLAYERS"
            class="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors duration-50"
          >
            {{ t.addPlayer }}
          </button>
        </form>
        <p v-if="nameError" class="text-sm text-red-500" role="alert">{{ t[nameError] }}</p>

        <div v-if="players.length" class="flex flex-wrap gap-2">
          <span
            v-for="(player, index) in players"
            :key="player"
            :class="[
              'inline-flex items-center gap-2 pl-3 pr-1 py-1 rounded-full text-sm font-medium',
              isDarkMode ? 'bg-gray-700 text-gray-100' : 'bg-gray-100 text-gray-800'
            ]"
          >
            {{ player }}
            <button
              @click="removePlayer(index)"
              :aria-label="format(t.spyRemovePlayer, { name: player })"
              :class="[
                'h-6 w-6 rounded-full flex items-center justify-center text-xs transition-colors',
                isDarkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
              ]"
            >
              ✕
            </button>
          </span>
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="text-lg font-semibold">{{ t.selectTheme }}</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button @click="themeChoice = 'random'" :class="optionClass(themeChoice === 'random')">
            🎲 {{ t.spyRandomTheme }}
          </button>
          <button
            v-for="key in themeKeys"
            :key="key"
            @click="themeChoice = key"
            :class="optionClass(themeChoice === key)"
          >
            {{ themeWords[key].icon }} {{ t[key] }}
          </button>
        </div>
      </section>

      <section class="grid sm:grid-cols-2 gap-6">
        <div class="space-y-3">
          <h2 class="text-lg font-semibold">{{ t.spyDiscussionLength }}</h2>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="minutes in [1, 2, 3, 5]"
              :key="minutes"
              @click="discussionMinutes = minutes"
              :class="optionClass(discussionMinutes === minutes)"
            >
              {{ format(t.spyMinutes, { n: minutes }) }}
            </button>
          </div>
        </div>
        <div class="space-y-3">
          <h2 class="text-lg font-semibold">{{ t.spySpyCount }}</h2>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="count in [1, 2]"
              :key="count"
              @click="spyCount = count"
              :disabled="count === 2 && players.length < TWO_SPIES_MIN_PLAYERS"
              :class="optionClass(effectiveSpyCount === count, count === 2 && players.length < TWO_SPIES_MIN_PLAYERS)"
            >
              {{ '🕵️'.repeat(count) }} {{ count }}
            </button>
          </div>
          <p v-if="players.length < TWO_SPIES_MIN_PLAYERS" :class="['text-xs', mutedText]">{{ t.spyTwoSpiesHint }}</p>
        </div>
      </section>

      <div class="space-y-2">
        <button @click="startGame" :disabled="!canStart" :class="primaryClass">
          {{ t.startGame }}
        </button>
        <p v-if="!canStart" :class="['text-sm text-center', mutedText]">{{ t.spyMinPlayers }}</p>
      </div>
    </div>

    <!-- Role reveal -->
    <div v-else-if="phase === 'reveal'" class="space-y-6 text-center">
      <template v-if="!allRevealed">
        <div class="flex justify-center gap-1.5" aria-hidden="true">
          <span
            v-for="(_, index) in players"
            :key="index"
            :class="[
              'h-2 rounded-full transition-all duration-300',
              index === revealIndex ? 'w-6 bg-blue-500' : index < revealIndex ? 'w-2 bg-blue-300' : isDarkMode ? 'w-2 bg-gray-600' : 'w-2 bg-gray-300'
            ]"
          ></span>
        </div>

        <div>
          <p :class="['text-sm', mutedText]">{{ t.spyPassTo }}</p>
          <h2 class="text-3xl font-bold mt-1">{{ players[revealIndex] }}</h2>
        </div>

        <button
          type="button"
          class="flip-card mx-auto block w-full max-w-xs aspect-[3/4] focus:outline-none"
          :class="{ flipped: cardFlipped }"
          :disabled="isAdvancing"
          @click="cardFlipped = true"
          :aria-label="t.spyTapToReveal"
        >
          <div class="flip-card-inner">
            <!-- Front (face down) -->
            <div
              :class="[
                'flip-card-face rounded-3xl shadow-xl flex flex-col items-center justify-center gap-4 p-6 border',
                isDarkMode
                  ? 'bg-gradient-to-br from-indigo-900 to-gray-900 border-indigo-700/50'
                  : 'bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-300 text-white'
              ]"
            >
              <span class="text-6xl">🕵️</span>
              <span class="font-semibold text-white">{{ t.spyTapToReveal }}</span>
              <span class="text-sm text-white/70">{{ t.spyKeepSecret }}</span>
            </div>
            <!-- Back (role) -->
            <div
              :class="[
                'flip-card-face flip-card-back rounded-3xl shadow-xl flex flex-col items-center justify-center gap-3 p-6 text-white',
                isSpy(revealIndex) ? 'bg-gradient-to-br from-red-500 to-rose-700' : 'bg-gradient-to-br from-emerald-500 to-teal-700'
              ]"
            >
              <template v-if="isSpy(revealIndex)">
                <span class="text-6xl">🕶️</span>
                <span class="text-2xl font-bold">{{ t.youAreSpy }}</span>
                <span class="text-sm uppercase tracking-[0.18em] opacity-80 mt-2">{{ t.spyTheme }}</span>
                <span class="text-xl font-semibold">{{ themeWords[themeKey].icon }} {{ themeLabel }}</span>
                <span class="text-sm opacity-90 mt-2">{{ t.spyHint }}</span>
              </template>
              <template v-else>
                <span class="text-sm uppercase tracking-[0.18em] opacity-80">{{ t.spyTheme }}</span>
                <span class="text-lg font-semibold">{{ themeWords[themeKey].icon }} {{ themeLabel }}</span>
                <span class="text-sm uppercase tracking-[0.18em] opacity-80 mt-4">{{ t.spySecretWord }}</span>
                <span class="text-3xl font-bold break-words">{{ word }}</span>
              </template>
            </div>
          </div>
        </button>

        <button v-if="cardFlipped" @click="hideAndPass" :disabled="isAdvancing" :class="primaryClass">
          {{ t.spyHideAndPass }}
        </button>
        <p :class="['text-sm', mutedText]">{{ revealIndex + 1 }} / {{ players.length }}</p>
      </template>

      <template v-else>
        <div class="text-6xl">✅</div>
        <h2 class="text-2xl font-bold">{{ t.spyEveryoneReady }}</h2>
        <button @click="startDiscussion" :class="primaryClass">{{ t.spyStartDiscussion }}</button>
      </template>
    </div>

    <!-- Discussion -->
    <div v-else-if="phase === 'discussion'" class="space-y-6 text-center">
      <h2 class="text-xl font-semibold">{{ t.discussionTime }}</h2>

      <div class="relative mx-auto w-52 h-52" :class="{ 'low-time': isLowTime && !isPaused }">
        <svg viewBox="0 0 120 120" class="w-full h-full -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r="52" fill="none" stroke-width="8" :class="isDarkMode ? 'stroke-gray-700' : 'stroke-gray-200'" />
          <circle
            cx="60" cy="60" r="52" fill="none" stroke-width="8" stroke-linecap="round"
            :class="isLowTime ? 'stroke-red-500' : 'stroke-blue-500'"
            :stroke-dasharray="RING_CIRCUMFERENCE"
            :stroke-dashoffset="ringOffset"
            style="transition: stroke-dashoffset 1s linear"
          />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span :class="['text-5xl font-bold tabular-nums', isLowTime ? 'text-red-500' : '']" role="timer" aria-live="off">
            {{ formattedTime }}
          </span>
          <span v-if="isPaused" :class="['text-sm font-medium mt-1', mutedText]">{{ t.spyPaused }}</span>
        </div>
      </div>

      <div :class="[panelClass, 'text-lg']">
        🎤 {{ format(t.spyFirstAsker, { name: players[firstAsker] }) }}
      </div>

      <div class="grid grid-cols-2 gap-3">
        <button @click="isPaused = !isPaused" :class="secondaryClass">
          {{ isPaused ? '▶ ' + t.spyResume : '⏸ ' + t.spyPause }}
        </button>
        <button @click="addTime" :class="secondaryClass">⏱ {{ t.spyAddTime }}</button>
      </div>

      <details :class="[panelClass, 'text-left']">
        <summary class="cursor-pointer font-medium">💡 {{ t.spyNeedIdeas }}</summary>
        <ul class="mt-3 space-y-2">
          <li v-for="question in exampleQuestions" :key="question" :class="['text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-600']">
            “{{ question }}”
          </li>
        </ul>
      </details>

      <button @click="startVoting(players.map((_, i) => i), false)" :class="primaryClass">
        {{ t.endDiscussion }}
      </button>
    </div>

    <!-- Voting -->
    <div v-else-if="phase === 'voting'" class="space-y-6 text-center">
      <div>
        <p v-if="isRunoff" class="inline-block mb-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-[0.18em] bg-amber-500/20 text-amber-600">
          {{ t.spyRunoff }}
        </p>
        <p :class="['text-sm', mutedText]">
          {{ format(t.spyVoteProgress, { current: voterIndex + 1, total: players.length }) }}
        </p>
      </div>

      <template v-if="voterStage === 'handoff'">
        <div class="text-6xl">🗳️</div>
        <div>
          <p :class="['text-sm', mutedText]">{{ t.spyPassTo }}</p>
          <h2 class="text-3xl font-bold mt-1">{{ players[voterIndex] }}</h2>
        </div>
        <button @click="voterStage = 'choose'" :class="primaryClass">
          {{ format(t.spyImPlayer, { name: players[voterIndex] }) }}
        </button>
      </template>

      <template v-else>
        <h2 class="text-xl font-semibold">{{ format(t.spyVoteFor, { name: players[voterIndex] }) }}</h2>
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="index in voteOptions"
            :key="index"
            @click="pendingVote = index"
            :class="optionClass(pendingVote === index)"
            :aria-pressed="pendingVote === index"
          >
            {{ players[index] }}
          </button>
        </div>
        <button @click="confirmVote" :disabled="pendingVote === null" :class="primaryClass">
          {{ t.spyConfirmVote }}
        </button>
      </template>
    </div>

    <!-- Tally -->
    <div v-else-if="phase === 'tally'" class="space-y-6 text-center">
      <h2 class="text-2xl font-bold">{{ t.spyVotesIn }}</h2>

      <ul class="space-y-2 text-left">
        <li v-for="row in tally" :key="row.index" class="flex items-center gap-3">
          <span class="w-24 shrink-0 truncate font-medium">{{ players[row.index] }}</span>
          <div :class="['flex-1 h-8 rounded-lg overflow-hidden', isDarkMode ? 'bg-gray-700' : 'bg-gray-100']">
            <div
              class="tally-bar h-full rounded-lg flex items-center justify-end px-2 text-sm font-bold text-white"
              :class="leaders.includes(row.index) ? 'bg-red-500' : 'bg-blue-400'"
              :style="{ width: `${Math.max(row.count / maxVotes * 100, row.count ? 12 : 0)}%` }"
            >
              <span v-if="row.count">{{ row.count }}</span>
            </div>
          </div>
        </li>
      </ul>

      <div aria-live="polite" class="space-y-4">
        <template v-if="isTie">
          <p class="text-lg font-semibold text-amber-500">{{ isRunoff ? t.spyNoOneCaught : t.spyTie }}</p>
          <button v-if="!isRunoff" @click="startVoting(leaders, true)" :class="primaryClass">{{ t.spyStartRunoff }}</button>
          <button v-else @click="finishRound('spy')" :class="primaryClass">{{ t.spyContinue }}</button>
        </template>
        <template v-else>
          <p class="text-xl font-semibold">{{ format(t.spyAccused, { name: players[accused] }) }}</p>
          <Transition name="pop">
            <div v-if="accusedRevealed" class="space-y-4">
              <p :class="['text-2xl font-bold', isSpy(accused) ? 'text-green-500' : 'text-red-500']">
                {{ isSpy(accused) ? '🎯 ' + t.spyWasSpy : '😬 ' + t.spyWasNotSpy }}
              </p>
              <button @click="afterTally" :class="primaryClass">{{ t.spyContinue }}</button>
            </div>
          </Transition>
        </template>
      </div>
    </div>

    <!-- Spy's last chance -->
    <div v-else-if="phase === 'spyGuess'" class="space-y-6 text-center">
      <div class="text-6xl">🕶️</div>
      <h2 class="text-2xl font-bold">{{ t.spyLastChance }}</h2>
      <p class="text-lg">{{ format(t.spyGuessWord, { name: players[accused] }) }}</p>

      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="option in guessOptions"
          :key="option"
          @click="guessedIndex === null && (guessedIndex = option)"
          :disabled="guessedIndex !== null"
          :class="[
            'px-4 py-3 rounded-xl font-medium transition-all duration-50',
            guessedIndex === null
              ? isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-100' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
              : option === wordIndex
                ? 'bg-green-500 text-white'
                : option === guessedIndex
                  ? 'bg-red-500 text-white'
                  : 'opacity-40 ' + (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')
          ]"
        >
          {{ themeWords[themeKey][lang][option] }}
        </button>
      </div>

      <Transition name="pop">
        <div v-if="guessedIndex !== null" class="space-y-4" aria-live="polite">
          <p :class="['text-2xl font-bold', guessCorrect ? 'text-red-500' : 'text-green-500']">
            {{ guessCorrect ? t.spyGuessedRight : t.spyGuessedWrong }}
          </p>
          <button @click="finishRound(guessCorrect ? 'spyGuess' : 'group')" :class="primaryClass">
            {{ t.spyContinue }}
          </button>
        </div>
      </Transition>
    </div>

    <!-- Result -->
    <div v-else-if="phase === 'result'" class="space-y-6">
      <div
        :class="[
          'rounded-3xl p-6 text-center text-white shadow-lg',
          spyTeamWon ? 'bg-gradient-to-br from-red-500 to-rose-700' : 'bg-gradient-to-br from-emerald-500 to-teal-700'
        ]"
      >
        <div class="text-6xl mb-2">{{ spyTeamWon ? '🕶️' : '🎉' }}</div>
        <h2 class="text-3xl font-bold">{{ spyTeamWon ? t.spyWins : t.groupWins }}</h2>
        <p v-if="outcome === 'spyGuess'" class="mt-2 opacity-90">{{ t.spyGuessedRight }}</p>
      </div>

      <div class="grid sm:grid-cols-2 gap-3">
        <div :class="panelClass">
          <p :class="['text-xs font-bold uppercase tracking-[0.18em] mb-1', mutedText]">
            {{ spies.length > 1 ? t.spySpiesWere : t.spyWas }}
          </p>
          <p class="text-lg font-semibold">🕵️ {{ spies.map(i => players[i]).join(', ') }}</p>
        </div>
        <div :class="panelClass">
          <p :class="['text-xs font-bold uppercase tracking-[0.18em] mb-1', mutedText]">{{ t.wordWas }}</p>
          <p class="text-lg font-semibold">{{ themeWords[themeKey].icon }} {{ word }}</p>
        </div>
      </div>

      <div v-if="Object.keys(lastVotes).length" :class="panelClass">
        <p :class="['text-xs font-bold uppercase tracking-[0.18em] mb-2', mutedText]">{{ t.spyVotes }}</p>
        <ul class="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <li v-for="(target, voter) in lastVotes" :key="voter" class="flex gap-2">
            <span class="font-medium truncate">{{ players[voter] }}</span>
            <span :class="mutedText">{{ t.spyVotedFor }}</span>
            <span :class="['truncate', isSpy(target) ? 'text-green-500 font-semibold' : '']">{{ players[target] }}</span>
          </li>
        </ul>
      </div>

      <div :class="panelClass">
        <p :class="['text-xs font-bold uppercase tracking-[0.18em] mb-3', mutedText]">🏆 {{ t.spyScoreboard }}</p>
        <ol class="space-y-2">
          <li v-for="(row, rank) in scoreboard" :key="row.name" class="flex items-center gap-3">
            <span class="w-6 text-center">{{ ['🥇', '🥈', '🥉'][rank] || rank + 1 }}</span>
            <span class="flex-1 truncate font-medium">
              {{ row.name }}
              <span v-if="isSpy(players.indexOf(row.name))" class="text-xs">🕵️</span>
            </span>
            <span class="font-bold tabular-nums">{{ row.points }} {{ t.spyPoints }}</span>
          </li>
        </ol>
        <p :class="['text-xs mt-3', mutedText]">{{ t.spyScoringInfo }}</p>
      </div>

      <div class="grid sm:grid-cols-2 gap-3">
        <button @click="newGame" :class="secondaryClass">{{ t.spyNewGame }}</button>
        <button @click="startRound" :class="primaryClass">{{ t.spyNextRound }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
input:focus {
  outline: none;
  border-color: rgb(59, 130, 246);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

button:focus-visible {
  outline: 2px solid rgb(59, 130, 246);
  outline-offset: 2px;
}

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
.flip-card:not(.flipped):not(:disabled):hover .flip-card-inner {
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
