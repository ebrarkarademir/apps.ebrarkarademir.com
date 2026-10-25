<script setup>
import { ref, computed } from 'vue'
import TermWindow from '../components/TermWindow.vue'

const props = defineProps({
  t: {
    type: Object,
    required: true
  }
})

defineEmits(['go-back'])

const MIN = 1
const MAX = 100
const BAR_CELLS = 20 // each cell of the range bar stands for 5 numbers

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

// [....#########......] with # where the target can still be
const rangeBar = computed(() => {
  const span = (MAX - MIN + 1) / BAR_CELLS
  return Array.from({ length: BAR_CELLS }, (_, i) => {
    const cellLow = MIN + i * span
    const cellHigh = cellLow + span - 1
    if (gameWon.value) return targetNumber.value >= cellLow && targetNumber.value <= cellHigh ? '@' : '.'
    return cellHigh >= low.value && cellLow <= high.value ? '#' : '.'
  }).join('')
})

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
</script>

<template>
  <TermWindow class="max-w-2xl" :title="t.numberGuessTitle" :backLabel="t.back" @back="$emit('go-back')">
    <div class="space-y-6">
      <!-- Range still possible -->
      <div class="term-panel border-term p-5 text-center">
        <p class="term-label">{{ t.attempts }}: {{ String(attempts).padStart(2, '0') }}</p>
        <p class="font-display text-7xl leading-none my-3 tabular-nums">
          <template v-if="gameWon"><span class="term-inverse px-3">{{ targetNumber }}</span></template>
          <template v-else>{{ low }}<span class="term-muted"> - </span>{{ high }}</template>
        </p>
        <p class="text-sm sm:text-base whitespace-pre overflow-hidden" aria-hidden="true">
          <span class="term-muted">{{ MIN }} </span>[{{ rangeBar }}]<span class="term-muted"> {{ MAX }}</span>
        </p>
        <p class="term-muted text-sm mt-3">{{ t.numberGuessDesc }}</p>
      </div>

      <!-- Feedback -->
      <div
        v-if="message"
        aria-live="polite"
        :class="['px-4 py-3 text-center font-semibold', gameWon ? 'term-inverse' : 'border border-term']"
      >
        {{ message }}
      </div>

      <!-- Input -->
      <div v-if="!gameWon" class="flex flex-col sm:flex-row gap-3">
        <label class="relative sm:flex-1">
          <span class="sr-only">{{ t.enterGuess }}</span>
          <span class="absolute left-3 top-1/2 -translate-y-1/2 font-semibold" aria-hidden="true">&gt;</span>
          <input
            v-model="currentGuess"
            type="number"
            inputmode="numeric"
            :min="MIN"
            :max="MAX"
            :placeholder="t.enterGuess"
            @keyup.enter="checkGuess"
            class="term-input h-12 pl-8 text-lg"
          />
        </label>
        <button @click="checkGuess" :disabled="currentGuess === ''" class="term-btn term-btn-primary min-h-12 sm:px-6">
          {{ t.submitGuess }}
        </button>
      </div>
      <button v-else @click="newGame" class="term-btn term-btn-primary w-full min-h-12">{{ t.newGame }}</button>

      <!-- Guess history -->
      <div v-if="guesses.length">
        <p class="term-label mb-2">&gt; {{ t.guessHistory }}</p>
        <ul class="flex flex-wrap gap-2">
          <li
            v-for="(guess, index) in guesses"
            :key="guesses.length - index"
            :class="[
              'px-2.5 py-1 text-sm font-semibold tabular-nums',
              guess.result === 'correct' ? 'term-inverse' : 'border border-term-low term-muted'
            ]"
          >
            {{ guess.value }} {{ guess.result === 'high' ? '[v]' : guess.result === 'low' ? '[^]' : '[ok]' }}
          </li>
        </ul>
      </div>
    </div>
  </TermWindow>
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
