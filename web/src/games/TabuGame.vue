<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['go-back'])

// Game states
const gamePhase = ref('setup') // setup, play, score
const teams = ref([
  { name: 'Team 1', score: 0, players: [] },
  { name: 'Team 2', score: 0, players: [] }
])
const currentTeam = ref(0)
const currentPlayer = ref('')
const timer = ref(60)
const timerInterval = ref(null)
const playerName = ref('')
const currentCard = ref(null)
const skippedCards = ref([])
const correctCards = ref([])
const isPlaying = ref(false)

// Card database
const cards = [
  {
    word: 'TELEFON',
    tabooWords: ['ARAMAK', 'NUMARA', 'CEP', 'KONUŞMAK', 'MESAJ']
  },
  {
    word: 'KAHVE',
    tabooWords: ['İÇMEK', 'SICAK', 'FİNCAN', 'TÜRK', 'NESCAFE']
  },
  {
    word: 'BİLGİSAYAR',
    tabooWords: ['KLAVYE', 'MOUSE', 'EKRAN', 'İNTERNET', 'LAPTOP']
  },
  {
    word: 'FUTBOL',
    tabooWords: ['TOP', 'GOL', 'STADYUM', 'TAKIM', 'MAÇI']
  },
  {
    word: 'KİTAP',
    tabooWords: ['OKUMAK', 'SAYFA', 'YAZAR', 'ROMAN', 'KAPAK']
  },
  {
    word: 'PLAJ',
    tabooWords: ['DENİZ', 'KUM', 'GÜNEŞ', 'YÜZMEK', 'TATİL']
  },
  {
    word: 'DOKTOR',
    tabooWords: ['HASTANE', 'HASTA', 'İLAÇ', 'REÇETE', 'MUAYENE']
  },
  {
    word: 'SİNEMA',
    tabooWords: ['FİLM', 'SALON', 'BİLET', 'PATLAMIŞ MISIR', 'PERDE']
  },
  {
    word: 'PASTA',
    tabooWords: ['TATLI', 'KREMALİ', 'DOĞUM GÜNÜ', 'ŞEKER', 'FIRINDA']
  },
  {
    word: 'ARABA',
    tabooWords: ['SÜRMEK', 'TEKERLEK', 'MOTOR', 'YOLCULUK', 'EHLİYET']
  }
  // Add more cards as needed
]

// Computed properties
const canStartGame = computed(() => {
  return teams.value.every(team => team.players.length > 0)
})

const currentTeamName = computed(() => teams.value[currentTeam.value].name)

const shuffledCards = computed(() => {
  return [...cards].sort(() => Math.random() - 0.5)
})

const remainingCards = computed(() => {
  const usedCards = [...skippedCards.value, ...correctCards.value]
  return shuffledCards.value.filter(card => 
    !usedCards.find(used => used.word === card.word)
  )
})

// Game functions
const addPlayer = (teamIndex) => {
  if (playerName.value.trim()) {
    teams.value[teamIndex].players.push(playerName.value.trim())
    playerName.value = ''
  }
}

const removePlayer = (teamIndex, playerIndex) => {
  teams.value[teamIndex].players.splice(playerIndex, 1)
}

const startGame = () => {
  gamePhase.value = 'play'
  currentTeam.value = 0
  currentPlayer.value = teams.value[0].players[0]
  resetRound()
}

const resetRound = () => {
  timer.value = 60
  skippedCards.value = []
  correctCards.value = []
  isPlaying.value = false
  currentCard.value = remainingCards.value[0]
}

const startRound = () => {
  isPlaying.value = true
  timerInterval.value = setInterval(() => {
    if (timer.value > 0) {
      timer.value--
    } else {
      endRound()
    }
  }, 1000)
}

const skipCard = () => {
  if (!isPlaying.value) return
  skippedCards.value.push(currentCard.value)
  currentCard.value = remainingCards.value[skippedCards.value.length + correctCards.value.length]
}

const correctCard = () => {
  if (!isPlaying.value) return
  correctCards.value.push(currentCard.value)
  teams.value[currentTeam.value].score++
  currentCard.value = remainingCards.value[skippedCards.value.length + correctCards.value.length]
}

const endRound = () => {
  clearInterval(timerInterval.value)
  isPlaying.value = false
  
  // Switch to next team
  currentTeam.value = (currentTeam.value + 1) % 2
  
  // Switch to next player in the team
  const currentTeamPlayers = teams.value[currentTeam.value].players
  const currentPlayerIndex = currentTeamPlayers.indexOf(currentPlayer.value)
  const nextPlayerIndex = (currentPlayerIndex + 1) % currentTeamPlayers.length
  currentPlayer.value = currentTeamPlayers[nextPlayerIndex]
  
  // Check if game should end
  if (remainingCards.value.length === 0) {
    gamePhase.value = 'score'
  } else {
    resetRound()
  }
}

const resetGame = () => {
  gamePhase.value = 'setup'
  teams.value = [
    { name: 'Team 1', score: 0, players: [] },
    { name: 'Team 2', score: 0, players: [] }
  ]
  currentTeam.value = 0
  currentPlayer.value = ''
  resetRound()
}

const formattedTime = computed(() => {
  const minutes = Math.floor(timer.value / 60)
  const seconds = timer.value % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})
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
        <span>Back</span>
      </button>
      <h1 class="text-2xl font-bold">Tabu</h1>
    </div>

    <!-- Setup Phase -->
    <div v-if="gamePhase === 'setup'" class="space-y-8">
      <!-- Team Setup -->
      <div v-for="(team, teamIndex) in teams" :key="team.name" class="space-y-4">
        <h2 class="text-xl font-semibold">{{ team.name }}</h2>
        <div class="flex gap-2">
          <input
            v-model="playerName"
            @keyup.enter="addPlayer(teamIndex)"
            type="text"
            :placeholder="`Add player to ${team.name}`"
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
            Add
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
        Start Game
      </button>
    </div>

    <!-- Play Phase -->
    <div v-else-if="gamePhase === 'play'" class="space-y-8">
      <!-- Game Info -->
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-xl font-semibold">{{ currentTeamName }}</h2>
          <p class="text-sm opacity-75">{{ currentPlayer }}'s turn</p>
        </div>
        <div class="text-4xl font-bold">{{ formattedTime }}</div>
      </div>

      <!-- Card Display -->
      <div v-if="currentCard" class="space-y-6">
        <div 
          class="p-6 rounded-xl text-center"
          :class="isDarkMode ? 'bg-gray-700' : 'bg-gray-100'"
        >
          <h3 class="text-3xl font-bold mb-6">{{ currentCard.word }}</h3>
          <div class="space-y-2">
            <div
              v-for="(word, index) in currentCard.tabooWords"
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
            Skip
          </button>
          <button
            @click="correctCard"
            :disabled="!isPlaying"
            class="flex-1 px-6 py-4 rounded-xl font-semibold bg-green-500 text-white 
                   hover:bg-green-600 disabled:opacity-50 transition-all duration-50"
          >
            Correct
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
        Start Round
      </button>
    </div>

    <!-- Score Phase -->
    <div v-else class="space-y-8 text-center">
      <h2 class="text-2xl font-bold mb-4">Game Over!</h2>
      
      <div class="space-y-6">
        <div
          v-for="team in teams"
          :key="team.name"
          class="p-6 rounded-xl"
          :class="isDarkMode ? 'bg-gray-700' : 'bg-gray-100'"
        >
          <h3 class="text-xl font-semibold mb-2">{{ team.name }}</h3>
          <p class="text-3xl font-bold">{{ team.score }}</p>
        </div>
      </div>

      <div class="text-xl font-bold">
        {{ teams[0].score > teams[1].score ? teams[0].name : teams[1].name }} Wins!
      </div>

      <button
        @click="resetGame"
        class="px-6 py-4 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-all duration-50"
      >
        Play Again
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