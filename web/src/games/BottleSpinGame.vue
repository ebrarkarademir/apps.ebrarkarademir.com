<script setup>
import { ref, computed, onUnmounted } from 'vue'

// Played on one phone passed around the table, so there is no online room
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

const PROMPT_COUNT = 10
const SPIN_MS = 4200
const REDUCED_SPIN_MS = 600

// Game states
const gamePhase = ref('setup') // setup, play
const playerCount = ref(0)
const players = ref([])
const playerNames = ref([])
const selectedPlayer = ref(null)
const isSpinning = ref(false)
const rotation = ref(0)
const spinDuration = ref(SPIN_MS)
const currentChoice = ref(null) // 'truth' or 'dare'
const currentPromptKey = ref(null)
let spinTimeout = null

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const selectPlayerCount = (count) => {
  // Keep names already typed when the count changes
  playerNames.value = Array.from({ length: count }, (_, i) => playerNames.value[i] || '')
  playerCount.value = count
}

const areAllNamesFilled = computed(() => {
  return playerNames.value.length === playerCount.value &&
         playerNames.value.every(name => name.trim() !== '')
})

const startGame = () => {
  if (!areAllNamesFilled.value) return
  players.value = playerNames.value.map(name => name.trim())
  gamePhase.value = 'play'
}

// Each player sits at an angle measured clockwise from the top of the table
const sliceAngle = computed(() => 360 / players.value.length)

const getPlayerStyle = (index) => {
  const angle = (index * sliceAngle.value * Math.PI) / 180
  const radius = 41
  return {
    left: `${50 + radius * Math.sin(angle)}%`,
    top: `${50 - radius * Math.cos(angle)}%`
  }
}

const spotlightStyle = computed(() => {
  if (selectedPlayer.value === null) return {}
  const start = selectedPlayer.value * sliceAngle.value - sliceAngle.value / 2
  const color = props.isDarkMode ? 'rgba(139, 92, 246, 0.25)' : 'rgba(139, 92, 246, 0.16)'
  return {
    background: `conic-gradient(from ${start}deg, ${color} 0deg ${sliceAngle.value}deg, transparent ${sliceAngle.value}deg)`
  }
})

const bottleStyle = computed(() => ({
  transform: `translate(-50%, -50%) rotate(${rotation.value}deg)`,
  transition: isSpinning.value
    ? `transform ${spinDuration.value}ms cubic-bezier(0.12, 0.75, 0.2, 1)`
    : 'none'
}))

const spinBottle = () => {
  if (isSpinning.value || players.value.length === 0) return

  const target = Math.floor(Math.random() * players.value.length)
  // Land somewhere inside the target's slice, not always dead center
  const jitter = (Math.random() - 0.5) * sliceAngle.value * 0.6
  const targetAngle = target * sliceAngle.value + jitter
  const current = ((rotation.value % 360) + 360) % 360
  const delta = (((targetAngle - current) % 360) + 360) % 360
  const fullTurns = 4 + Math.floor(Math.random() * 3)

  spinDuration.value = prefersReducedMotion() ? REDUCED_SPIN_MS : SPIN_MS
  selectedPlayer.value = null
  currentChoice.value = null
  currentPromptKey.value = null
  isSpinning.value = true
  rotation.value += fullTurns * 360 + delta

  spinTimeout = setTimeout(() => {
    isSpinning.value = false
    selectedPlayer.value = target
  }, spinDuration.value)
}

const pickPrompt = (choice) => {
  let key
  do {
    key = `${choice}Q${1 + Math.floor(Math.random() * PROMPT_COUNT)}`
  } while (key === currentPromptKey.value)
  currentChoice.value = choice
  currentPromptKey.value = key
}

const currentPrompt = computed(() =>
  currentPromptKey.value ? props.t[currentPromptKey.value] : ''
)

const statusText = computed(() => {
  if (isSpinning.value) return props.t.spinning
  if (selectedPlayer.value !== null) {
    return props.t.bottlePicked.replace('{name}', players.value[selectedPlayer.value])
  }
  return props.t.tapBottleToSpin
})

// Back to the name list, keeping the names for a quick edit
const resetGame = () => {
  clearTimeout(spinTimeout)
  gamePhase.value = 'setup'
  selectedPlayer.value = null
  isSpinning.value = false
  currentChoice.value = null
  currentPromptKey.value = null
  rotation.value = 0
}

onUnmounted(() => clearTimeout(spinTimeout))

const muted = computed(() => (props.isDarkMode ? 'text-gray-400' : 'text-gray-500'))
const label = computed(() => ['text-xs font-semibold uppercase tracking-wider', props.isDarkMode ? 'text-gray-400' : 'text-gray-500'])
const inputClass = computed(() => [
  'w-full h-11 px-3 rounded-lg border outline-none transition-colors focus:ring-2 focus:ring-violet-500/40',
  props.isDarkMode ? 'bg-gray-950 border-gray-700 text-white focus:border-violet-400' : 'bg-white border-gray-300 focus:border-violet-500'
])
const primary = 'w-full px-6 py-4 rounded-lg font-semibold bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
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
      <h1 class="text-xl sm:text-2xl font-bold truncate">{{ t.bottleTitle }}</h1>
    </div>

    <!-- Setup Phase -->
    <form v-if="gamePhase === 'setup'" class="space-y-6" @submit.prevent="startGame">
      <div>
        <h2 :class="[label, 'mb-3']">{{ t.selectPlayerCount }}</h2>
        <div class="grid grid-cols-4 sm:grid-cols-7 gap-2">
          <button
            v-for="count in [2, 3, 4, 5, 6, 7, 8]"
            :key="count"
            type="button"
            @click="selectPlayerCount(count)"
            :class="[
              'h-11 rounded-lg border font-semibold transition-colors',
              playerCount === count
                ? 'bg-violet-600 border-violet-600 text-white'
                : isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'
            ]"
          >
            {{ count }}
          </button>
        </div>
      </div>

      <div v-if="playerCount" class="space-y-3">
        <h2 :class="label">{{ t.enterNames }}</h2>
        <div class="grid sm:grid-cols-2 gap-2">
          <input
            v-for="(name, index) in playerNames"
            :key="index"
            v-model="playerNames[index]"
            type="text"
            maxlength="16"
            :placeholder="t.playerNamePlaceholder + ' ' + (index + 1)"
            :class="inputClass"
          />
        </div>
      </div>

      <button v-if="playerCount" type="submit" :disabled="!areAllNamesFilled" :class="primary">
        {{ t.startGame }}
      </button>
    </form>

    <!-- Game Phase -->
    <div v-else class="space-y-6">
      <!-- Table -->
      <div class="relative mx-auto w-full max-w-sm aspect-square">
        <div
          :class="[
            'absolute inset-[9%] rounded-full border-4 shadow-inner',
            isDarkMode
              ? 'bg-gradient-to-br from-emerald-900/60 to-gray-900 border-gray-700'
              : 'bg-gradient-to-br from-emerald-100 to-emerald-50 border-emerald-200'
          ]"
        ></div>

        <!-- Spotlight towards the selected player -->
        <div
          class="absolute inset-[9%] rounded-full transition-opacity duration-500"
          :class="selectedPlayer === null ? 'opacity-0' : 'opacity-100'"
          :style="spotlightStyle"
        ></div>

        <!-- Players -->
        <div
          v-for="(player, index) in players"
          :key="index"
          :style="getPlayerStyle(index)"
          class="absolute -translate-x-1/2 -translate-y-1/2 z-10"
        >
          <div
            :class="[
              'max-w-[6.5rem] truncate px-3 py-1.5 rounded-lg text-sm font-semibold shadow-md transition-all duration-300',
              selectedPlayer === index
                ? 'bg-violet-600 text-white scale-110 player-picked'
                : isDarkMode
                  ? 'bg-gray-800 text-gray-200 border border-gray-700'
                  : 'bg-white text-gray-700 border border-gray-200'
            ]"
          >
            {{ player }}
          </div>
        </div>

        <!-- Bottle (drawn pointing up; the neck points at the chosen player) -->
        <button
          type="button"
          @click="spinBottle"
          :disabled="isSpinning"
          :aria-label="t.spin"
          class="absolute top-1/2 left-1/2 h-[52%] aspect-[1/3] cursor-pointer disabled:cursor-default focus:outline-none"
          :style="bottleStyle"
        >
          <svg viewBox="0 0 40 120" class="h-full w-full bottle-shadow" aria-hidden="true">
            <defs>
              <linearGradient id="bottle-glass" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stop-color="#065f46" />
                <stop offset="45%" stop-color="#10b981" />
                <stop offset="100%" stop-color="#064e3b" />
              </linearGradient>
            </defs>
            <rect x="15" y="2" width="10" height="7" rx="2" fill="#f59e0b" />
            <path
              d="M15 9 h10 v24 c0 6 11 10 11 22 v55 a8 8 0 0 1 -8 8 h-16 a8 8 0 0 1 -8 -8 v-55 c0 -12 11 -16 11 -22 z"
              fill="url(#bottle-glass)"
            />
            <rect x="8" y="66" width="24" height="26" rx="3" fill="#fef3c7" opacity="0.9" />
            <rect x="11" y="74" width="18" height="3" rx="1.5" fill="#b45309" opacity="0.6" />
            <rect x="13" y="80" width="14" height="2" rx="1" fill="#b45309" opacity="0.4" />
            <path d="M10 56 v48" stroke="white" stroke-width="2.5" stroke-linecap="round" opacity="0.35" />
          </svg>
        </button>
      </div>

      <!-- Status -->
      <p
        :class="['text-center font-semibold transition-colors', selectedPlayer !== null ? 'text-xl text-violet-500' : muted]"
        aria-live="polite"
      >
        {{ statusText }}
      </p>

      <!-- Game Controls -->
      <div class="space-y-4">
        <button v-if="selectedPlayer === null" @click="spinBottle" :disabled="isSpinning" :class="primary">
          {{ isSpinning ? t.spinning : t.spin }}
        </button>

        <template v-else>
          <div v-if="!currentChoice" class="flex gap-4">
            <button
              @click="pickPrompt('truth')"
              class="flex-1 px-6 py-4 rounded-lg font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
            >
              {{ t.truth }}
            </button>
            <button
              @click="pickPrompt('dare')"
              class="flex-1 px-6 py-4 rounded-lg font-semibold bg-rose-500 text-white hover:bg-rose-600 transition-colors"
            >
              {{ t.dare }}
            </button>
          </div>

          <!-- Question/Dare Display -->
          <Transition name="prompt" mode="out-in">
            <div
              v-if="currentChoice"
              :key="currentPromptKey"
              :class="[
                'p-6 rounded-lg text-center border',
                currentChoice === 'truth'
                  ? isDarkMode ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-100' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : isDarkMode ? 'bg-rose-500/10 border-rose-500/40 text-rose-100' : 'bg-rose-50 border-rose-200 text-rose-900'
              ]"
            >
              <p class="text-xs font-bold uppercase tracking-[0.18em] mb-2 opacity-70">
                {{ players[selectedPlayer] }} · {{ currentChoice === 'truth' ? t.truth : t.dare }}
              </p>
              <p class="text-lg font-medium">{{ currentPrompt }}</p>
            </div>
          </Transition>

          <div v-if="currentChoice" class="flex gap-4">
            <button
              @click="pickPrompt(currentChoice)"
              :class="[
                'flex-1 px-4 py-3 rounded-lg font-semibold border transition-colors',
                isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'
              ]"
            >
              {{ t.anotherPrompt }}
            </button>
            <button
              @click="spinBottle"
              class="flex-1 px-4 py-3 rounded-lg font-semibold bg-violet-600 text-white hover:bg-violet-500 transition-colors"
            >
              {{ t.spinAgain }}
            </button>
          </div>
        </template>

        <button
          @click="resetGame"
          :disabled="isSpinning"
          :class="['w-full text-sm disabled:opacity-50', isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700']"
        >
          {{ t.changePlayers }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bottle-shadow {
  filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.3));
}

.player-picked {
  animation: picked-pulse 1.2s ease-in-out infinite;
}

@keyframes picked-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.5); }
  50% { box-shadow: 0 0 0 10px rgba(139, 92, 246, 0); }
}

.prompt-enter-active,
.prompt-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.prompt-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.prompt-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (prefers-reduced-motion: reduce) {
  .player-picked {
    animation: none;
  }
}
</style>
