<script setup>
import { ref, computed, watch } from 'vue'

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
const gamePhase = ref('setup') // setup, play
const playerCount = ref(0)
const players = ref([])
const playerNames = ref([])
const selectedPlayer = ref(null)
const isSpinning = ref(false)
const showOptions = ref(false)
const currentChoice = ref(null) // 'truth' or 'dare'

// Sample questions and dares
const questions = {
  truth: [
    { text: 'En son kimi kıskandın?', label: computed(() => props.t.truthQ1) },
    { text: 'En büyük pişmanlığın nedir?', label: computed(() => props.t.truthQ2) },
    { text: 'En çok utandığın an neydi?', label: computed(() => props.t.truthQ3) },
    { text: 'En son söylediğin yalan neydi?', label: computed(() => props.t.truthQ4) },
    { text: 'Gizli bir yeteneğin var mı?', label: computed(() => props.t.truthQ5) }
  ],
  dare: [
    { text: 'Tavuk gibi ses çıkar', label: computed(() => props.t.dareQ1) },
    { text: 'En sevdiğin şarkıyı söyle', label: computed(() => props.t.dareQ2) },
    { text: '10 şınav çek', label: computed(() => props.t.dareQ3) },
    { text: 'Komik bir dans yap', label: computed(() => props.t.dareQ4) },
    { text: 'En iyi taklitini yap', label: computed(() => props.t.dareQ5) }
  ]
}

// When player count is selected
const selectPlayerCount = (count) => {
  playerCount.value = count
  // Initialize empty array with selected count
  playerNames.value = Array(count).fill('')
}

// Check if all names are filled
const areAllNamesFilled = computed(() => {
  return playerNames.value.every(name => name.trim() !== '') && 
         playerNames.value.length === playerCount.value
})

// Start game with entered names
const startGame = () => {
  if (areAllNamesFilled.value) {
    players.value = [...playerNames.value]
    gamePhase.value = 'play'
  }
}

// Rastgele soru/görev seçme
const getRandomItem = (array) => {
  return array[Math.floor(Math.random() * array.length)]
}

// Şişeyi döndürme
const spinBottle = () => {
  if (isSpinning.value) return
  
  isSpinning.value = true
  currentChoice.value = null
  
  // Rastgele dönüş derecesi (720° ile 1440° arası + oyuncu pozisyonu için ek derece)
  const minSpins = 2
  const maxSpins = 4
  const baseRotation = (Math.random() * (maxSpins - minSpins) + minSpins) * 360
  const playerAngle = (Math.floor(Math.random() * players.value.length)) * (360 / players.value.length)
  
  rotationDegree.value = baseRotation + playerAngle
  
  setTimeout(() => {
    isSpinning.value = false
    selectedPlayer.value = Math.floor((rotationDegree.value % 360) / (360 / players.value.length))
  }, 3000)
}

// Seçim yapma
const makeChoice = (choice) => {
  currentChoice.value = choice
  if (choice === 'truth') {
    currentQuestion.value = getRandomItem(truthQuestions)
  } else {
    currentQuestion.value = getRandomItem(dareActions)
  }
}

// Oyunu sıfırlama
const resetGame = () => {
  gamePhase.value = 'setup'
  players.value = []
  playerCount.value = 0
  playerNames.value = []
  selectedPlayer.value = null
  currentChoice.value = null
  rotationDegree.value = 0
  currentQuestion.value = ''
}

// Add array of colors for sections
const sectionColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-orange-500'
]

// Calculate section styles
const getSectionStyle = (index, total) => {
  const degree = 360 / total
  const rotation = index * degree
  return {
    transform: `rotate(${rotation}deg)`,
    width: '50%',
    height: '50%',
    transformOrigin: '100% 100%',
    position: 'absolute',
    left: '0',
    top: '0',
    clipPath: `polygon(100% 0, 100% 100%, 0 100%)`
  }
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
      <h1 class="text-2xl font-bold">{{ t.bottleTitle }}</h1>
    </div>

    <!-- Setup Phase -->
    <div v-if="gamePhase === 'setup'" class="space-y-8">
      <div v-if="!playerCount" class="space-y-4">
        <h2 class="text-xl font-semibold text-center">{{ t.selectPlayerCount }}</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <button
            v-for="count in [3,4,5,6,7,8]"
            :key="count"
            @click="selectPlayerCount(count)"
            :class="[
              'px-6 py-4 rounded-xl font-semibold transition-all duration-50',
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600' 
                : 'bg-gray-100 hover:bg-gray-200'
            ]"
          >
            {{ count }}
          </button>
        </div>
      </div>

      <div v-else class="space-y-4">
        <h2 class="text-xl font-semibold text-center">{{ t.enterNames }}</h2>
        <div 
          v-for="(name, index) in playerNames" 
          :key="index"
          class="flex gap-2"
        >
          <input
            v-model="playerNames[index]"
            type="text"
            :placeholder="t.playerNamePlaceholder + ' ' + (index + 1)"
            :class="[
              'flex-1 px-4 py-2 rounded-lg border-2 transition-colors duration-50',
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-200'
            ]"
          />
        </div>

        <button
          @click="startGame"
          :disabled="!areAllNamesFilled"
          :class="[
            'w-full px-6 py-4 rounded-xl font-semibold transition-all duration-50',
            areAllNamesFilled
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
          ]"
        >
          {{ t.startGame }}
        </button>
      </div>
    </div>

    <!-- Game Phase -->
    <div v-else class="space-y-8">
      <!-- Bottle and Players -->
      <div class="relative aspect-square">
        <!-- Players -->
        <div
          v-for="(player, index) in players"
          :key="index"
          :style="getPlayerStyle(index)"
          class="absolute transform -translate-x-1/2 -translate-y-1/2 text-center"
        >
          <div 
            :class="[
              'px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap',
              selectedPlayer === index
                ? 'bg-blue-500 text-white'
                : isDarkMode
                  ? 'bg-gray-700 text-gray-300'
                  : 'bg-gray-100 text-gray-600'
            ]"
          >
            {{ player }}
          </div>
        </div>

        <!-- Bottle -->
        <div 
          class="absolute top-1/2 left-1/2 w-48 h-12 -ml-24 -mt-6 transform origin-center"
          :style="{ transform: `translate(-50%, -50%) rotate(${rotation}deg)` }"
        >
          <div 
            :class="[
              'w-full h-full rounded-full shadow-lg transform transition-colors duration-50',
              isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
            ]"
          >
            <div class="w-1/4 h-full bg-blue-500 rounded-l-full"></div>
          </div>
        </div>
      </div>

      <!-- Game Controls -->
      <div class="space-y-4">
        <button
          v-if="!showOptions"
          @click="spinBottle"
          :disabled="isSpinning"
          class="w-full px-6 py-4 rounded-xl font-semibold bg-blue-500 text-white 
                 hover:bg-blue-600 disabled:opacity-50 transition-all duration-50"
        >
          {{ t.spin }}
        </button>

        <div v-else class="flex gap-4">
          <button
            @click="selectChoice('truth')"
            class="flex-1 px-6 py-4 rounded-xl font-semibold bg-green-500 text-white 
                   hover:bg-green-600 transition-all duration-50"
          >
            {{ t.truth }}
          </button>
          <button
            @click="selectChoice('dare')"
            class="flex-1 px-6 py-4 rounded-xl font-semibold bg-red-500 text-white 
                   hover:bg-red-600 transition-all duration-50"
          >
            {{ t.dare }}
          </button>
        </div>

        <!-- Question/Dare Display -->
        <div
          v-if="currentChoice"
          :class="[
            'p-6 rounded-xl text-center transition-all duration-50',
            currentChoice === 'truth'
              ? isDarkMode ? 'bg-green-900/50' : 'bg-green-100'
              : isDarkMode ? 'bg-red-900/50' : 'bg-red-100'
          ]"
        >
          <p class="text-lg font-medium" :class="currentChoice === 'truth' ? 'text-green-700' : 'text-red-700'">
            {{ getCurrentQuestion() }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ease-out {
  transition-timing-function: cubic-bezier(0.33, 1, 0.68, 1);
}

/* Add smooth transitions for disabled states */
button:disabled {
  transition: all 0.3s ease;
}

/* Improve input focus states */
input:focus {
  outline: none;
  border-color: rgb(59, 130, 246);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

/* Add smooth section transitions */
.section-transition {
  transition: opacity 0.3s ease;
}

/* Improve bottle appearance */
.bottle-shadow {
  filter: drop-shadow(0 0 8px rgba(0, 0, 0, 0.2));
}
</style> 