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

const targetNumber = ref(Math.floor(Math.random() * 100) + 1)
const currentGuess = ref('')
const attempts = ref(0)
const messageKey = ref('') // congrats, tooHigh or tooLow; translated at render so it follows the language
const message = computed(() =>
  messageKey.value ? props.t[messageKey.value].replace('{attempts}', attempts.value) : ''
)
const gameWon = ref(false)

const checkGuess = () => {
  const guess = parseInt(currentGuess.value)
  
  if (isNaN(guess) || guess < 1 || guess > 100) {
    return
  }
  
  attempts.value++
  
  if (guess === targetNumber.value) {
    gameWon.value = true
    messageKey.value = 'congrats'
  } else if (guess > targetNumber.value) {
    messageKey.value = 'tooHigh'
  } else {
    messageKey.value = 'tooLow'
  }
  
  currentGuess.value = ''
}

const newGame = () => {
  targetNumber.value = Math.floor(Math.random() * 100) + 1
  currentGuess.value = ''
  attempts.value = 0
  messageKey.value = ''
  gameWon.value = false
}
</script>

<template>
  <div 
    :class="[
      'max-w-md mx-auto rounded-2xl shadow-lg p-6 sm:p-8 transition-colors duration-50 backdrop-blur-sm',
      isDarkMode ? 'bg-gray-800/90 shadow-gray-900/30' : 'bg-white/90 shadow-gray-200/70'
    ]"
  >
    <!-- Header -->
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
      <h1 class="text-2xl font-bold">{{ t.numberGuessTitle }}</h1>
    </div>

    <!-- Game Content -->
    <div class="space-y-6">
      <!-- Input Section -->
      <div class="space-y-4">
        <div class="flex gap-2">
          <input
            v-model="currentGuess"
            type="number"
            min="1"
            max="100"
            :placeholder="t.enterGuess"
            @keyup.enter="checkGuess"
            :class="[
              'flex-1 px-4 py-2 rounded-lg border-2 transition-colors duration-50',
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-200'
            ]"
          />
          <button
            @click="checkGuess"
            class="px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-50"
          >
            {{ t.submitGuess }}
          </button>
        </div>

        <!-- Attempts Counter -->
        <div class="text-center">
          <span :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
            {{ t.attempts }}: {{ attempts }}
          </span>
        </div>
      </div>

      <!-- Message Display -->
      <div v-if="message" 
        :class="[
          'p-4 rounded-xl text-center transition-all duration-50',
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
               bg-green-500 hover:bg-green-600 transition-all duration-50"
      >
        {{ t.newGame }}
      </button>
    </div>
  </div>
</template>

<style scoped>
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type=number] {
  -moz-appearance: textfield;
}

/* Add smooth hover transitions */
button {
  transition: all 0.2s ease;
}

/* Improve focus states */
button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
</style> 