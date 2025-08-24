<script setup>
import { ref, computed } from 'vue'

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

// Game states
const gamePhase = ref('setup') // setup, assign-roles, discussion, voting, result
const players = ref([])
const theme = ref('')
const word = ref('')
const spyIndex = ref(-1)
const playerName = ref('')
const currentPlayerIndex = ref(-1)
const votes = ref({})
const timer = ref(120) // 2 minutes in seconds
const timerInterval = ref(null)
const showWord = ref(false)
const executedPlayer = ref(null)
const isGameOver = ref(false)

// Sample themes and words
const themeWords = {
  animals: {
    words: ['Lion', 'Elephant', 'Giraffe', 'Penguin', 'Kangaroo', 'Dolphin'],
    label: computed(() => props.t.animals)
  },
  countries: {
    words: ['Turkey', 'Japan', 'Brazil', 'Egypt', 'France', 'India'],
    label: computed(() => props.t.countries)
  },
  jobs: {
    words: ['Doctor', 'Teacher', 'Chef', 'Pilot', 'Artist', 'Engineer'],
    label: computed(() => props.t.jobs)
  },
  foods: {
    words: ['Pizza', 'Sushi', 'Kebab', 'Pasta', 'Burger', 'Taco'],
    label: computed(() => props.t.foods)
  },
  sports: {
    words: ['Football', 'Basketball', 'Tennis', 'Swimming', 'Boxing', 'Golf'],
    label: computed(() => props.t.sports)
  }
}

// Computed properties
const availableThemes = computed(() => Object.keys(themeWords).map(key => ({
  key,
  label: themeWords[key].label.value
})))
const canStartGame = computed(() => players.value.length >= 3 && theme.value && word.value)
const currentPlayer = computed(() => players.value[currentPlayerIndex.value])
const isSpyWin = computed(() => executedPlayer.value !== players.value[spyIndex.value])
const formattedTime = computed(() => {
  const minutes = Math.floor(timer.value / 60)
  const seconds = timer.value % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

// Game functions
const addPlayer = () => {
  if (playerName.value.trim()) {
    players.value.push(playerName.value.trim())
    playerName.value = ''
  }
}

const removePlayer = (index) => {
  players.value.splice(index, 1)
}

const selectTheme = (selectedTheme) => {
  theme.value = selectedTheme
  const words = themeWords[selectedTheme].words
  word.value = words[Math.floor(Math.random() * words.length)]
}

const startGame = () => {
  spyIndex.value = Math.floor(Math.random() * players.value.length)
  currentPlayerIndex.value = 0
  gamePhase.value = 'assign-roles'
  showWord.value = false
}

const showNextPlayer = () => {
  showWord.value = false
  currentPlayerIndex.value++
  if (currentPlayerIndex.value >= players.value.length) {
    startDiscussion()
  }
}

const startDiscussion = () => {
  gamePhase.value = 'discussion'
  timer.value = 120
  timerInterval.value = setInterval(() => {
    if (timer.value > 0) {
      timer.value--
    } else {
      clearInterval(timerInterval.value)
      startVoting()
    }
  }, 1000)
}

const startVoting = () => {
  gamePhase.value = 'voting'
  clearInterval(timerInterval.value)
  votes.value = {}
}

const vote = (votedPlayerIndex) => {
  votes.value[currentPlayerIndex.value] = votedPlayerIndex
  currentPlayerIndex.value = (currentPlayerIndex.value + 1) % players.value.length
  
  if (Object.keys(votes.value).length === players.value.length) {
    endVoting()
  }
}

const endVoting = () => {
  const voteCounts = {}
  Object.values(votes.value).forEach(index => {
    voteCounts[index] = (voteCounts[index] || 0) + 1
  })
  
  const maxVotes = Math.max(...Object.values(voteCounts))
  const executed = Object.entries(voteCounts)
    .find(([_, count]) => count === maxVotes)[0]
  
  executedPlayer.value = parseInt(executed)
  gamePhase.value = 'result'
  isGameOver.value = true
}

const resetGame = () => {
  gamePhase.value = 'setup'
  players.value = []
  theme.value = ''
  word.value = ''
  spyIndex.value = -1
  currentPlayerIndex.value = -1
  votes.value = {}
  timer.value = 120
  showWord.value = false
  executedPlayer.value = null
  isGameOver.value = false
  clearInterval(timerInterval.value)
}
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
      <h1 class="text-2xl font-bold">{{ t.casusTitle }}</h1>
    </div>

    <!-- Setup Phase -->
    <div v-if="gamePhase === 'setup'" class="space-y-8">
      <!-- Player Input -->
      <div class="space-y-4">
        <h2 class="text-xl font-semibold">{{ t.addPlayers }}</h2>
        <div class="flex gap-2">
          <input
            v-model="playerName"
            @keyup.enter="addPlayer"
            type="text"
            :placeholder="t.addPlayers"
            :class="[
              'flex-1 px-4 py-2 rounded-lg border-2 transition-colors duration-50',
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-200'
            ]"
          />
          <button
            @click="addPlayer"
            class="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-50"
          >
            {{ t.addPlayer }}
          </button>
        </div>

        <!-- Player List -->
        <div class="space-y-2">
          <div
            v-for="(player, index) in players"
            :key="index"
            class="flex justify-between items-center p-3 rounded-lg"
            :class="isDarkMode ? 'bg-gray-700' : 'bg-gray-100'"
          >
            <span>{{ player }}</span>
            <button
              @click="removePlayer(index)"
              class="text-red-500 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- Theme Selection -->
      <div class="space-y-4">
        <h2 class="text-xl font-semibold">{{ t.selectTheme }}</h2>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="themeKey in Object.keys(themeWords)"
            :key="themeKey"
            @click="selectTheme(themeKey)"
            :class="[
              'px-4 py-3 rounded-lg font-medium transition-all duration-50',
              theme === themeKey
                ? 'bg-blue-500 text-white'
                : isDarkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            ]"
          >
            {{ themeWords[themeKey].label }}
          </button>
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

    <!-- Assign Roles Phase -->
    <div v-else-if="gamePhase === 'assign-roles'" class="space-y-8 text-center">
      <h2 class="text-xl font-semibold">
        {{ currentPlayer }}'s Turn
      </h2>
      
      <div v-if="!showWord" class="space-y-4">
        <p>{{ currentPlayer }}, {{ t.clickToSeeRole }}</p>
        <button
          @click="showWord = true"
          class="px-6 py-4 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-all duration-50"
        >
          {{ t.showRole }}
        </button>
      </div>

      <div v-else class="space-y-4">
        <div 
          class="text-2xl font-bold p-6 rounded-xl"
          :class="currentPlayerIndex === spyIndex
            ? 'bg-red-500 text-white'
            : 'bg-green-500 text-white'"
        >
          {{ currentPlayerIndex === spyIndex ? t.youAreSpy : word }}
        </div>
        
        <button
          @click="showNextPlayer"
          class="px-6 py-4 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-all duration-50"
        >
          {{ t.nextPlayer }}
        </button>
      </div>
    </div>

    <!-- Discussion Phase -->
    <div v-else-if="gamePhase === 'discussion'" class="space-y-8 text-center">
      <h2 class="text-xl font-semibold">{{ t.discussionTime }}</h2>
      <div class="text-4xl font-bold">{{ formattedTime }}</div>
      <p>{{ t.discussAndFind }}</p>
      
      <button
        @click="startVoting"
        class="px-6 py-4 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-all duration-50"
      >
        {{ t.endDiscussion }}
      </button>
    </div>

    <!-- Voting Phase -->
    <div v-else-if="gamePhase === 'voting'" class="space-y-8">
      <h2 class="text-xl font-semibold text-center">
        {{ currentPlayer }}, {{ t.voteText }}
      </h2>
      
      <div class="grid grid-cols-2 gap-4">
        <button
          v-for="(player, index) in players"
          :key="index"
          @click="vote(index)"
          :disabled="index === currentPlayerIndex"
          :class="[
            'px-4 py-3 rounded-xl font-medium transition-all duration-50',
            index === currentPlayerIndex
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          ]"
        >
          {{ player }}
        </button>
      </div>
    </div>

    <!-- Result Phase -->
    <div v-else-if="gamePhase === 'result'" class="space-y-8 text-center">
      <h2 class="text-2xl font-bold mb-4">{{ t.gameOver }}</h2>
      
      <div class="space-y-4">
        <p class="text-xl">
          {{ players[executedPlayer] }} {{ t.wasExecuted }}
        </p>
        <p class="text-xl" :class="isSpyWin ? 'text-red-500' : 'text-green-500'">
          {{ isSpyWin ? t.spyWins : t.groupWins }}
        </p>
        <p class="text-lg">
          {{ t.spyWas }} {{ players[spyIndex] }}
        </p>
        <p class="text-lg">
          {{ t.wordWas }} {{ word }}
        </p>
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