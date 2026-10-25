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

defineEmits(['go-back'])

const MIN = 1
const MAX = 100

const randomTarget = () => Math.floor(Math.random() * MAX) + MIN

const targetNumber = ref(randomTarget())
const currentGuess = ref('')
const guesses = ref([]) // { value, result: 'high' | 'low' | 'correct' }, newest first
const attempts = computed(() => guesses.value.length)
const messageKey = ref('') // congrats, tooHigh or tooLow; translated at render so it follows the language
const message = computed(() =>
  messageKey.value ? props.t[messageKey.value].replace('{attempts}', attempts.value) : ''
)
const gameWon = ref(false)

// The range the target can still be in, narrowed by every miss
const low = computed(() => Math.max(MIN, ...guesses.value.filter(g => g.result === 'low').map(g => g.value + 1)))
const high = computed(() => Math.min(MAX, ...guesses.value.filter(g => g.result === 'high').map(g => g.value - 1)))

const checkGuess = () => {
  const guess = parseInt(currentGuess.value)

  if (gameWon.value || isNaN(guess) || guess < MIN || guess > MAX) {
    return
  }

  let result
  if (guess === targetNumber.value) {
    gameWon.value = true
    result = 'correct'
    messageKey.value = 'congrats'
  } else if (guess > targetNumber.value) {
    result = 'high'
    messageKey.value = 'tooHigh'
  } else {
    result = 'low'
    messageKey.value = 'tooLow'
  }
  guesses.value.unshift({ value: guess, result })

  currentGuess.value = ''
}

const newGame = () => {
  targetNumber.value = randomTarget()
  currentGuess.value = ''
  guesses.value = []
  messageKey.value = ''
  gameWon.value = false
}

const muted = computed(() => (props.isDarkMode ? 'text-gray-400' : 'text-gray-600'))
const label = computed(() => ['text-xs font-semibold uppercase tracking-wider', props.isDarkMode ? 'text-gray-400' : 'text-gray-500'])
const inputClass = computed(() => [
  'w-full h-12 px-3 rounded-lg border outline-none transition-colors focus:ring-2 focus:ring-violet-500/40',
  props.isDarkMode ? 'bg-gray-950 border-gray-700 text-white focus:border-violet-400' : 'bg-white border-gray-300 focus:border-violet-500'
])
const primary = 'w-full h-12 rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
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
        @click="$emit('go-back')"
        :class="[
          'px-3 py-2 rounded-lg transition-colors duration-150 flex items-center gap-2 text-sm font-medium',
          isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        ]"
      >
        <span class="text-lg">←</span>
        <span>{{ t.back }}</span>
      </button>
      <h1 class="text-xl sm:text-2xl font-bold truncate">{{ t.numberGuessTitle }}</h1>
    </div>

    <div class="space-y-6">
      <!-- Range still possible -->
      <div :class="['rounded-lg border p-5 text-center', isDarkMode ? 'border-gray-800 bg-gray-950/50' : 'border-gray-200 bg-gray-50']">
        <p :class="label">{{ t.attempts }} · {{ attempts }}</p>
        <p class="font-mono text-5xl font-bold my-3 tabular-nums">
          <template v-if="gameWon"><span class="text-emerald-500">{{ targetNumber }}</span></template>
          <template v-else>{{ low }}<span :class="muted"> – </span>{{ high }}</template>
        </p>
        <p :class="['text-sm', muted]">{{ t.numberGuessDesc }}</p>
      </div>

      <!-- Feedback -->
      <div
        v-if="message"
        aria-live="polite"
        :class="[
          'rounded-lg border px-4 py-3 text-center font-medium',
          gameWon
            ? (isDarkMode ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800')
            : (isDarkMode ? 'border-violet-500/40 bg-violet-500/10 text-violet-200' : 'border-violet-200 bg-violet-50 text-violet-800')
        ]"
      >
        {{ message }}
      </div>

      <!-- Input -->
      <div v-if="!gameWon" class="flex flex-col sm:flex-row gap-3">
        <input
          v-model="currentGuess"
          type="number"
          inputmode="numeric"
          :min="MIN"
          :max="MAX"
          :placeholder="t.enterGuess"
          @keyup.enter="checkGuess"
          :class="[inputClass, 'font-mono text-lg text-center sm:flex-1']"
        />
        <button @click="checkGuess" :disabled="currentGuess === ''" :class="[primary, 'sm:w-auto sm:px-6']">
          {{ t.submitGuess }}
        </button>
      </div>
      <button v-else @click="newGame" :class="primary">{{ t.newGame }}</button>

      <!-- Guess history -->
      <ul v-if="guesses.length" class="flex flex-wrap gap-2">
        <li
          v-for="(guess, index) in guesses"
          :key="guesses.length - index"
          :class="[
            'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-mono font-semibold',
            guess.result === 'correct'
              ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-800')
              : (isDarkMode ? 'border-gray-800 text-gray-200' : 'border-gray-200 text-gray-700')
          ]"
        >
          {{ guess.value }}
          <span :class="guess.result === 'correct' ? '' : muted">{{ guess.result === 'high' ? '↓' : guess.result === 'low' ? '↑' : '✓' }}</span>
        </li>
      </ul>
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
</style>
