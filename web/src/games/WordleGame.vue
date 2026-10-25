<script setup>
import { ref, computed, watch } from 'vue'
import TermWindow from '../components/TermWindow.vue'

const props = defineProps({
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

// Tiles shrink to fit the row on narrow screens, up to 3.5rem each
const rowStyle = computed(() => ({ gridTemplateColumns: `repeat(${settings.value.wordLength}, minmax(0, 3.5rem))` }))

// Inverted = right spot, dashed = wrong spot, faint = not in the word
const tileClass = {
  correct: 'term-inverse',
  present: 'border border-dashed border-term',
  absent: 'border border-term-low text-term-low'
}

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
  <TermWindow class="max-w-md" :title="t.wordleTitle" :backLabel="t.back" @back="$emit('go-back')">
    <template #status>
      <button v-if="!showSettings" @click="resetGame" class="term-link">
        <span aria-hidden="true">[~]</span>
        <span>{{ t.wordSettings }}</span>
      </button>
    </template>

    <p class="term-muted text-sm text-center mb-6">{{ t.wordleDesc }}</p>

    <!-- Settings Section -->
    <div v-if="showSettings" class="space-y-6">
      <div class="space-y-4">
        <div>
          <p class="term-label mb-2">&gt; {{ t.wordLanguage }}</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="lang in ['EN', 'TR']"
              :key="lang"
              @click="settings.language = lang"
              :class="['term-option font-semibold', { 'is-active': settings.language === lang }]"
            >
              {{ lang }}
            </button>
          </div>
        </div>

        <div>
          <p class="term-label mb-2">&gt; {{ t.wordLength }}</p>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="length in availableWordLengths"
              :key="length"
              @click="settings.wordLength = length"
              :class="['term-option font-semibold tabular-nums', { 'is-active': settings.wordLength === length }]"
            >
              {{ length }}
            </button>
          </div>
        </div>
      </div>

      <button @click="startGame" class="term-btn term-btn-primary w-full min-h-14">
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
          class="grid gap-2 justify-center"
          :style="rowStyle"
        >
          <div
            v-for="(letterObj, letterIndex) in guess.letters"
            :key="letterIndex"
            :class="['aspect-square flex items-center justify-center font-display text-3xl uppercase animate-flip-in', tileClass[letterObj.status]]"
          >
            {{ letterObj.letter }}
          </div>
        </div>

        <!-- Current Row -->
        <div
          class="grid gap-2 justify-center"
          :class="{ 'animate-shake': shake }"
          :style="rowStyle"
        >
          <div
            v-for="(letter, index) in currentGuessArray"
            :key="'current-' + index"
            :class="[
              'aspect-square flex items-center justify-center font-display text-3xl uppercase border',
              letter ? 'border-term bg-term-deep scale-105' : 'border-term-low'
            ]"
          >
            {{ letter }}
          </div>
        </div>

        <!-- Empty Rows -->
        <div
          v-for="(row, rowIndex) in emptyRows"
          :key="'empty-' + rowIndex"
          class="grid gap-2 justify-center"
          :style="rowStyle"
        >
          <div
            v-for="(_, letterIndex) in row"
            :key="letterIndex"
            class="aspect-square border border-dashed border-term-low"
          ></div>
        </div>
      </div>

      <!-- Game Instructions -->
      <p class="term-muted text-center text-sm">
        &gt; <span class="term-cursor">{{ gameWon ? t.playAgain : t.startTyping }}</span>
      </p>

      <!-- Message Display and New Game Button -->
      <div v-if="message" class="space-y-4">
        <div :class="['p-4 text-center', gameWon ? 'term-inverse' : 'border border-dashed border-term']">
          <p class="font-medium whitespace-pre-line">{{ message }}</p>
        </div>

        <button v-if="gameWon" @click="newGame" class="term-btn term-btn-primary w-full min-h-14">
          {{ t.newGame }}
        </button>
      </div>
    </div>
  </TermWindow>
</template>

<style scoped>
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

/* Letter input pop */
@keyframes pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.scale-105 {
  animation: pop 0.1s ease-in-out;
}

@media (prefers-reduced-motion: reduce) {
  .animate-shake,
  .animate-flip-in,
  .scale-105 {
    animation: none;
  }
}
</style>
