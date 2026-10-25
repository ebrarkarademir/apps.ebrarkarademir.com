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

// Game settings
const settings = ref({
  language: props.t.langCode === 'TR' ? 'TR' : 'EN',
  wordLength: 5,
})

// Expanded word lists
const wordLists = {
  EN: {
    5: ['apple', 'beach', 'cloud', 'dance', 'eagle', 'flame', 'grape', 'heart', 'image', 'juice'],
    6: ['banana', 'castle', 'dragon', 'flower', 'garden', 'hammer', 'island', 'jungle', 'knight'],
    7: ['dolphin', 'elephant', 'freedom', 'harmony', 'journey', 'kingdom', 'library', 'morning']
  },
  TR: {
    5: ['kalem', 'kitap', 'masa', 'deniz', 'güneş', 'çiçek', 'yemek', 'köpek', 'kuşak', 'balık'],
    6: ['balkon', 'çiçek', 'kahve', 'müzik', 'rüzgar', 'telefon', 'kalem', 'kitap', 'deniz'],
    7: ['bilgili', 'güzelim', 'kelebek', 'yıldız', 'özgürlük', 'telefon', 'kitaplık', 'merhaba']
  }
}

const showSettings = ref(true)
const activeRow = ref(0)
const currentGuess = ref('')
const guesses = ref([])
const targetWord = ref('')
const message = ref('')
const gameWon = ref(false)
const shake = ref(false)
const flip = ref(false)

// UI text follows the app language; settings.language only picks the word list
const t = computed(() => props.t)

const availableWordLengths = computed(() => {
  return Object.keys(wordLists[settings.value.language]).map(Number)
})

// Create empty grid for current word
const currentGuessArray = computed(() => {
  const arr = currentGuess.value.split('')
  while (arr.length < settings.value.wordLength) {
    arr.push('')
  }
  return arr
})

// Create empty rows for remaining guesses
const emptyRows = computed(() => {
  const rows = []
  const totalRows = 6 // Maximum 6 rows
  const remainingRows = totalRows - guesses.value.length - 1
  for (let i = 0; i < remainingRows; i++) {
    const row = Array(settings.value.wordLength).fill('')
    rows.push(row)
  }
  return rows
})

const startGame = () => {
  const words = wordLists[settings.value.language][settings.value.wordLength]
  targetWord.value = words[Math.floor(Math.random() * words.length)]
  showSettings.value = false
  guesses.value = []
  currentGuess.value = ''
  gameWon.value = false
  message.value = ''
}

const submitGuess = () => {
  if (currentGuess.value.length !== settings.value.wordLength) {
    message.value = t.value.wordLengthError.replace('{length}', settings.value.wordLength)
    shake.value = true
    setTimeout(() => { shake.value = false }, 500)
    return
  }

  flip.value = true
  setTimeout(() => { flip.value = false }, 500)

  const guess = currentGuess.value.toLowerCase()
  const result = {
    word: guess,
    letters: guess.split('').map((letter, index) => ({
      letter,
      status: letter === targetWord.value[index] ? 'correct' : 
              targetWord.value.includes(letter) ? 'present' : 'absent'
    }))
  }

  guesses.value.push(result)
  currentGuess.value = ''
  activeRow.value++

  if (guess === targetWord.value) {
    gameWon.value = true
    message.value = `${t.value.congrats}\n${t.value.tryCount.replace('{tries}', guesses.value.length)}`
  }
}

const resetGame = () => {
  showSettings.value = true
}

// Handle keyboard input
const handleKeydown = (e) => {
  if (gameWon.value || showSettings.value) return
  
  if (e.key === 'Enter') {
    submitGuess()
  } else if (e.key === 'Backspace') {
    currentGuess.value = currentGuess.value.slice(0, -1)
  } else if (e.key.match(/^[a-zA-ZğüşıöçĞÜŞİÖÇ]$/) && currentGuess.value.length < settings.value.wordLength) {
    currentGuess.value += e.key.toUpperCase()
  }
}

// Add keyboard listener
watch(() => showSettings.value, (newValue) => {
  if (!newValue) {
    window.addEventListener('keydown', handleKeydown)
  } else {
    window.removeEventListener('keydown', handleKeydown)
  }
})

// Add new game function
const newGame = () => {
  const words = wordLists[settings.value.language][settings.value.wordLength]
  targetWord.value = words[Math.floor(Math.random() * words.length)]
  guesses.value = []
  currentGuess.value = ''
  gameWon.value = false
  message.value = ''
  activeRow.value = 0
}
</script>

<template>
  <div 
    :class="[
      'max-w-md mx-auto rounded-2xl shadow-lg p-6 sm:p-8 transition-colors duration-50 backdrop-blur-sm',
      isDarkMode ? 'bg-gray-800/90 shadow-gray-900/30' : 'bg-white/90 shadow-gray-200/70'
    ]"
  >
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 sm:gap-0">
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
      <button
        v-if="!showSettings"
        @click="resetGame"
        class="px-4 py-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
      >
        {{ t.wordSettings }}
      </button>
    </div>

    <!-- Game Title -->
    <div class="text-center mb-8">
      <h1 class="text-2xl sm:text-3xl font-bold mb-3">{{ t.wordleTitle }}</h1>
      <p :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'" class="text-sm sm:text-base">
        {{ t.wordleDesc }}
      </p>
    </div>

    <!-- Settings Section -->
    <div v-if="showSettings" class="space-y-6">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">{{ t.wordLanguage }}</label>
          <div class="flex gap-2">
            <button
              v-for="lang in ['EN', 'TR']"
              :key="lang"
              @click="settings.language = lang"
              :class="[
                'flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-50',
                settings.language === lang
                  ? 'bg-blue-500 text-white'
                  : isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              ]"
            >
              {{ lang }}
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">{{ t.wordLength }}</label>
          <div class="flex gap-2">
            <button
              v-for="length in availableWordLengths"
              :key="length"
              @click="settings.wordLength = length"
              :class="[
                'flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-50',
                settings.wordLength === length
                  ? 'bg-blue-500 text-white'
                  : isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              ]"
            >
              {{ length }}
            </button>
          </div>
        </div>
      </div>

      <button
        @click="startGame"
        class="w-full px-6 py-4 rounded-xl text-white text-base font-semibold
               bg-blue-500 hover:bg-blue-600 transition-all duration-50 transform hover:scale-102"
      >
        {{ t.startGame }}
      </button>
    </div>

    <!-- Game Section -->
    <div v-else class="space-y-6">
      <!-- Guesses Display -->
      <div class="space-y-2">
        <!-- Previous Guesses -->
        <div
          v-for="(guess, index) in guesses"
          :key="'guess-' + index"
          class="flex gap-2 justify-center"
        >
          <div
            v-for="(letterObj, letterIndex) in guess.letters"
            :key="letterIndex"
            :class="[
              'w-14 h-14 flex items-center justify-center rounded-lg font-bold text-xl uppercase transition-all duration-200',
              'animate-flip-in',
              letterObj.status === 'correct'
                ? 'bg-green-500 text-white'
                : letterObj.status === 'present'
                  ? 'bg-yellow-500 text-white'
                  : isDarkMode
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-200 text-gray-700'
            ]"
          >
            {{ letterObj.letter }}
          </div>
        </div>

        <!-- Current Row -->
        <div 
          class="flex gap-2 justify-center"
          :class="{ 'animate-shake': shake }"
        >
          <div
            v-for="(letter, index) in currentGuessArray"
            :key="'current-' + index"
            :class="[
              'w-14 h-14 flex items-center justify-center rounded-lg font-bold text-xl uppercase border-2 transition-all duration-200',
              letter ? (isDarkMode ? 'border-gray-400 bg-gray-700' : 'border-gray-400 bg-gray-100') 
                    : (isDarkMode ? 'border-gray-700' : 'border-gray-200'),
              isDarkMode ? 'text-white' : 'text-gray-900',
              letter ? 'scale-105' : 'scale-100'
            ]"
          >
            {{ letter }}
          </div>
        </div>

        <!-- Empty Rows -->
        <div
          v-for="(row, rowIndex) in emptyRows"
          :key="'empty-' + rowIndex"
          class="flex gap-2 justify-center"
        >
          <div
            v-for="(_, letterIndex) in row"
            :key="letterIndex"
            :class="[
              'w-14 h-14 flex items-center justify-center rounded-lg font-bold text-xl uppercase border-2',
              isDarkMode ? 'border-gray-700' : 'border-gray-100'
            ]"
          >
          </div>
        </div>
      </div>

      <!-- Game Instructions -->
      <div class="text-center text-sm"
           :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
      >
        {{ gameWon ? t.playAgain : t.startTyping }}
      </div>

      <!-- Message Display and New Game Button -->
      <div v-if="message" class="space-y-4">
        <div 
          :class="[
            'p-4 rounded-xl text-center text-base transition-all duration-50',
            gameWon 
              ? (isDarkMode ? 'bg-green-900/50 text-green-200' : 'bg-green-100 text-green-700')
              : (isDarkMode ? 'bg-blue-900/50 text-blue-200' : 'bg-blue-100 text-blue-700')
          ]"
        >
          <p class="font-medium whitespace-pre-line">{{ message }}</p>
        </div>

        <!-- New Game Button -->
        <button
          v-if="gameWon"
          @click="newGame"
          class="w-full px-6 py-4 rounded-xl text-white text-base font-semibold
                 bg-green-500 hover:bg-green-600 transition-all duration-50 
                 transform hover:scale-102 hover:shadow-lg"
        >
          {{ t.newGame }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Improve focus states */
button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

input {
  text-transform: uppercase;
}

/* Animations */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(5px); }
  75% { transform: translateX(-5px); }
}

@keyframes flip-in {
  0% { transform: rotateX(0); }
  100% { transform: rotateX(360deg); }
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}

.animate-flip-in {
  animation: flip-in 0.5s ease-out;
}

/* Glass effect */
.backdrop-blur-sm {
  backdrop-filter: blur(8px);
}

/* Add new animation for letter input */
@keyframes pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.scale-105 {
  animation: pop 0.1s ease-in-out;
}
</style> 