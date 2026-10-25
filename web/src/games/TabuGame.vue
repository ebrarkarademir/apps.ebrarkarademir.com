<script setup>
import { ref, computed, onUnmounted } from 'vue'

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

const emit = defineEmits(['go-back'])

const ROUND_SECONDS = 60

// Game states
const gamePhase = ref('setup') // setup, play, score
const teams = ref([
  { score: 0, players: [] },
  { score: 0, players: [] }
])
const playerNames = ref(['', '']) // one name input per team
const currentTeam = ref(0)
const playerTurns = ref([0, 0]) // how many turns each team has had, used to rotate explainers
const timer = ref(ROUND_SECONDS)
const isPlaying = ref(false)
const deck = ref([])
const cardIndex = ref(0)
let timerInterval = null

// Card database: each card has an EN and a TR version so the shown card follows the app language
const cards = [
  { id: 'phone', TR: { word: 'TELEFON', taboo: ['ARAMAK', 'NUMARA', 'CEP', 'KONUŞMAK', 'MESAJ'] }, EN: { word: 'PHONE', taboo: ['CALL', 'NUMBER', 'MOBILE', 'TALK', 'TEXT'] } },
  { id: 'coffee', TR: { word: 'KAHVE', taboo: ['İÇMEK', 'SICAK', 'FİNCAN', 'TÜRK', 'NESCAFE'] }, EN: { word: 'COFFEE', taboo: ['DRINK', 'HOT', 'CUP', 'CAFFEINE', 'MORNING'] } },
  { id: 'computer', TR: { word: 'BİLGİSAYAR', taboo: ['KLAVYE', 'MOUSE', 'EKRAN', 'İNTERNET', 'LAPTOP'] }, EN: { word: 'COMPUTER', taboo: ['KEYBOARD', 'MOUSE', 'SCREEN', 'INTERNET', 'LAPTOP'] } },
  { id: 'football', TR: { word: 'FUTBOL', taboo: ['TOP', 'GOL', 'STADYUM', 'TAKIM', 'MAÇ'] }, EN: { word: 'FOOTBALL', taboo: ['BALL', 'GOAL', 'STADIUM', 'TEAM', 'MATCH'] } },
  { id: 'book', TR: { word: 'KİTAP', taboo: ['OKUMAK', 'SAYFA', 'YAZAR', 'ROMAN', 'KAPAK'] }, EN: { word: 'BOOK', taboo: ['READ', 'PAGE', 'AUTHOR', 'NOVEL', 'COVER'] } },
  { id: 'beach', TR: { word: 'PLAJ', taboo: ['DENİZ', 'KUM', 'GÜNEŞ', 'YÜZMEK', 'TATİL'] }, EN: { word: 'BEACH', taboo: ['SEA', 'SAND', 'SUN', 'SWIM', 'HOLIDAY'] } },
  { id: 'doctor', TR: { word: 'DOKTOR', taboo: ['HASTANE', 'HASTA', 'İLAÇ', 'REÇETE', 'MUAYENE'] }, EN: { word: 'DOCTOR', taboo: ['HOSPITAL', 'SICK', 'MEDICINE', 'PRESCRIPTION', 'NURSE'] } },
  { id: 'cinema', TR: { word: 'SİNEMA', taboo: ['FİLM', 'SALON', 'BİLET', 'PATLAMIŞ MISIR', 'PERDE'] }, EN: { word: 'CINEMA', taboo: ['MOVIE', 'THEATER', 'TICKET', 'POPCORN', 'SCREEN'] } },
  { id: 'cake', TR: { word: 'PASTA', taboo: ['TATLI', 'KREMALI', 'DOĞUM GÜNÜ', 'ŞEKER', 'FIRIN'] }, EN: { word: 'CAKE', taboo: ['SWEET', 'CREAM', 'BIRTHDAY', 'SUGAR', 'BAKE'] } },
  { id: 'car', TR: { word: 'ARABA', taboo: ['SÜRMEK', 'TEKERLEK', 'MOTOR', 'YOLCULUK', 'EHLİYET'] }, EN: { word: 'CAR', taboo: ['DRIVE', 'WHEEL', 'ENGINE', 'ROAD', 'LICENSE'] } }
  // Add more cards as needed
]

const format = (text, values) =>
  Object.entries(values).reduce((out, [key, value]) => out.replace(`{${key}}`, value), text)

const lang = computed(() => (props.t.langCode === 'TR' ? 'TR' : 'EN'))
const teamName = (index) => format(props.t.tabuTeam, { n: index + 1 })

const shuffle = (array) => {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// Computed properties
const canStartGame = computed(() => {
  return teams.value.every(team => team.players.length > 0)
})

const currentTeamName = computed(() => teamName(currentTeam.value))
const currentPlayer = computed(() => {
  const players = teams.value[currentTeam.value].players
  return players.length ? players[playerTurns.value[currentTeam.value] % players.length] : ''
})
const currentCard = computed(() => deck.value[cardIndex.value] || null)
const shownCard = computed(() => (currentCard.value ? currentCard.value[lang.value] : null))
const cardsLeft = computed(() => deck.value.length - cardIndex.value)

const winnerText = computed(() => {
  const [first, second] = teams.value.map(team => team.score)
  if (first === second) return props.t.tabuDraw
  return format(props.t.tabuTeamWins, { team: teamName(first > second ? 0 : 1) })
})

const formattedTime = computed(() => {
  const minutes = Math.floor(timer.value / 60)
  const seconds = timer.value % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

// Game functions
const addPlayer = (teamIndex) => {
  const name = playerNames.value[teamIndex].trim()
  if (name) {
    teams.value[teamIndex].players.push(name)
    playerNames.value[teamIndex] = ''
  }
}

const removePlayer = (teamIndex, playerIndex) => {
  teams.value[teamIndex].players.splice(playerIndex, 1)
}

const stopTimer = () => {
  clearInterval(timerInterval)
  timerInterval = null
}

const startGame = () => {
  if (!canStartGame.value) return
  deck.value = shuffle(cards)
  cardIndex.value = 0
  teams.value.forEach(team => { team.score = 0 })
  currentTeam.value = 0
  playerTurns.value = [0, 0]
  timer.value = ROUND_SECONDS
  isPlaying.value = false
  gamePhase.value = 'play'
}

const startRound = () => {
  if (isPlaying.value || cardsLeft.value === 0) return
  timer.value = ROUND_SECONDS
  isPlaying.value = true
  stopTimer()
  timerInterval = setInterval(() => {
    timer.value--
    if (timer.value <= 0) endRound()
  }, 1000)
}

// Skipped and guessed cards both leave the deck for the rest of the game
const nextCard = () => {
  cardIndex.value++
  if (cardsLeft.value === 0) endRound()
}

const skipCard = () => {
  if (!isPlaying.value) return
  nextCard()
}

const correctCard = () => {
  if (!isPlaying.value) return
  teams.value[currentTeam.value].score++
  nextCard()
}

const endRound = () => {
  stopTimer()
  isPlaying.value = false

  if (cardsLeft.value === 0) {
    gamePhase.value = 'score'
    return
  }

  // The team that just played moves on to its next explainer, then the other team plays
  playerTurns.value[currentTeam.value]++
  currentTeam.value = (currentTeam.value + 1) % 2
  timer.value = ROUND_SECONDS
}

const resetGame = () => {
  stopTimer()
  gamePhase.value = 'setup'
  isPlaying.value = false
  teams.value = [
    { score: 0, players: [] },
    { score: 0, players: [] }
  ]
  playerNames.value = ['', '']
  deck.value = []
  cardIndex.value = 0
  currentTeam.value = 0
  playerTurns.value = [0, 0]
  timer.value = ROUND_SECONDS
}

onUnmounted(stopTimer)
</script>

<template>
  <div
    :class="[
      'max-w-2xl mx-auto rounded-2xl shadow-lg p-6 sm:p-8 transition-colors duration-50 backdrop-blur-sm',
      isDarkMode ? 'bg-gray-800/90 shadow-gray-900/30' : 'bg-white/90 shadow-gray-200/70'
    ]"
  >
    <!-- Header -->
    <div class="flex justify-between items-center mb-8">
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
      <h1 class="text-2xl font-bold">{{ t.tabuTitle }}</h1>
    </div>

    <!-- Setup Phase -->
    <div v-if="gamePhase === 'setup'" class="space-y-8">
      <!-- Team Setup -->
      <div v-for="(team, teamIndex) in teams" :key="teamIndex" class="space-y-4">
        <h2 class="text-xl font-semibold">{{ teamName(teamIndex) }}</h2>
        <div class="flex gap-2">
          <input
            v-model="playerNames[teamIndex]"
            @keyup.enter="addPlayer(teamIndex)"
            type="text"
            :placeholder="format(t.tabuAddPlayerTo, { team: teamName(teamIndex) })"
            :class="[
              'flex-1 px-4 py-2 rounded-lg border-2 transition-colors duration-50',
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-200'
            ]"
          />
          <button
            @click="addPlayer(teamIndex)"
            class="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-50"
          >
            {{ t.addPlayer }}
          </button>
        </div>

        <!-- Player List -->
        <div class="space-y-2">
          <div
            v-for="(player, playerIndex) in team.players"
            :key="playerIndex"
            class="flex justify-between items-center p-3 rounded-lg"
            :class="isDarkMode ? 'bg-gray-700' : 'bg-gray-100'"
          >
            <span>{{ player }}</span>
            <button
              @click="removePlayer(teamIndex, playerIndex)"
              class="text-red-500 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- Start Game Button -->
      <button
        @click="startGame"
        :disabled="!canStartGame"
        :class="[
          'w-full px-6 py-4 rounded-xl font-semibold transition-all duration-50',
          canStartGame
            ? 'bg-green-500 text-white hover:bg-green-600'
            : 'bg-gray-400 text-gray-200 cursor-not-allowed'
        ]"
      >
        {{ t.startGame }}
      </button>
    </div>

    <!-- Play Phase -->
    <div v-else-if="gamePhase === 'play'" class="space-y-8">
      <!-- Scores -->
      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="(team, teamIndex) in teams"
          :key="teamIndex"
          :class="[
            'rounded-xl px-4 py-2 flex items-center justify-between border-2 transition-colors duration-50',
            teamIndex === currentTeam
              ? 'border-blue-500'
              : isDarkMode ? 'border-transparent bg-gray-700/50' : 'border-transparent bg-gray-100'
          ]"
        >
          <span class="font-medium truncate">{{ teamName(teamIndex) }}</span>
          <span class="text-xl font-bold tabular-nums">{{ team.score }}</span>
        </div>
      </div>

      <!-- Game Info -->
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-xl font-semibold">{{ currentTeamName }}</h2>
          <p class="text-sm opacity-75">{{ format(t.tabuPlayerTurn, { name: currentPlayer }) }}</p>
          <p class="text-xs opacity-60">{{ format(t.tabuCardsLeft, { n: cardsLeft }) }}</p>
        </div>
        <div :class="['text-4xl font-bold tabular-nums', isPlaying && timer <= 10 ? 'text-red-500' : '']">
          {{ formattedTime }}
        </div>
      </div>

      <!-- Before the round: hide the card so the next explainer can't peek -->
      <div
        v-if="!isPlaying"
        class="p-6 rounded-xl text-center text-lg"
        :class="isDarkMode ? 'bg-gray-700' : 'bg-gray-100'"
      >
        {{ format(t.tabuGetReady, { name: currentPlayer, team: currentTeamName }) }}
      </div>

      <!-- Card Display -->
      <div v-else-if="shownCard" class="space-y-6">
        <div
          class="p-6 rounded-xl text-center"
          :class="isDarkMode ? 'bg-gray-700' : 'bg-gray-100'"
        >
          <h3 class="text-3xl font-bold mb-6">{{ shownCard.word }}</h3>
          <div class="space-y-2">
            <div
              v-for="(word, index) in shownCard.taboo"
              :key="index"
              class="text-lg font-medium text-red-500"
            >
              {{ word }}
            </div>
          </div>
        </div>

        <!-- Game Controls -->
        <div class="flex gap-4">
          <button
            @click="skipCard"
            :disabled="!isPlaying"
            class="flex-1 px-6 py-4 rounded-xl font-semibold bg-red-500 text-white
                   hover:bg-red-600 disabled:opacity-50 transition-all duration-50"
          >
            {{ t.skip }}
          </button>
          <button
            @click="correctCard"
            :disabled="!isPlaying"
            class="flex-1 px-6 py-4 rounded-xl font-semibold bg-green-500 text-white
                   hover:bg-green-600 disabled:opacity-50 transition-all duration-50"
          >
            {{ t.correct }}
          </button>
        </div>
      </div>

      <!-- Round Controls -->
      <button
        v-if="!isPlaying"
        @click="startRound"
        class="w-full px-6 py-4 rounded-xl font-semibold bg-blue-500 text-white
               hover:bg-blue-600 transition-all duration-50"
      >
        {{ t.startRound }}
      </button>
    </div>

    <!-- Score Phase -->
    <div v-else class="space-y-8 text-center">
      <h2 class="text-2xl font-bold mb-4">{{ t.gameOver }}</h2>

      <div class="space-y-6">
        <div
          v-for="(team, teamIndex) in teams"
          :key="teamIndex"
          class="p-6 rounded-xl"
          :class="isDarkMode ? 'bg-gray-700' : 'bg-gray-100'"
        >
          <h3 class="text-xl font-semibold mb-2">{{ teamName(teamIndex) }}</h3>
          <p class="text-3xl font-bold">{{ team.score }}</p>
        </div>
      </div>

      <div class="text-xl font-bold">
        {{ winnerText }}
      </div>

      <button
        @click="resetGame"
        class="px-6 py-4 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-all duration-50"
      >
        {{ t.playAgain }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Add smooth transitions */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Improve button focus states */
button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

/* Improve input focus states */
input:focus {
  outline: none;
  border-color: rgb(59, 130, 246);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}
</style>
