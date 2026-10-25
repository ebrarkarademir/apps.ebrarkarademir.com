<script setup>
import { ref, computed, onUnmounted } from 'vue'
import TermWindow from '../components/TermWindow.vue'

// Played on one phone passed around the table, so there is no online room
const props = defineProps({
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
  return {
    background: `conic-gradient(from ${start}deg, rgba(0, 255, 0, 0.18) 0deg ${sliceAngle.value}deg, transparent ${sliceAngle.value}deg)`
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
</script>

<template>
  <TermWindow class="max-w-2xl" :title="t.bottleTitle" :backLabel="t.back" @back="$emit('go-back')">
    <!-- Setup Phase -->
    <form v-if="gamePhase === 'setup'" class="space-y-6" @submit.prevent="startGame">
      <div>
        <h2 class="term-label mb-3">&gt; {{ t.selectPlayerCount }}</h2>
        <div class="grid grid-cols-4 sm:grid-cols-7 gap-2">
          <button
            v-for="count in [2, 3, 4, 5, 6, 7, 8]"
            :key="count"
            type="button"
            @click="selectPlayerCount(count)"
            :class="['term-option font-semibold tabular-nums', { 'is-active': playerCount === count }]"
            :aria-pressed="playerCount === count"
          >
            {{ count }}
          </button>
        </div>
      </div>

      <div v-if="playerCount" class="space-y-3">
        <h2 class="term-label">&gt; {{ t.enterNames }}</h2>
        <div class="grid sm:grid-cols-2 gap-2">
          <label v-for="(name, index) in playerNames" :key="index" class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 term-muted text-sm tabular-nums" aria-hidden="true">
              {{ String(index + 1).padStart(2, '0') }}
            </span>
            <input
              v-model="playerNames[index]"
              type="text"
              maxlength="16"
              :placeholder="t.playerNamePlaceholder + ' ' + (index + 1)"
              class="term-input pl-11"
            />
          </label>
        </div>
      </div>

      <button v-if="playerCount" type="submit" :disabled="!areAllNamesFilled" class="term-btn term-btn-primary w-full min-h-12">
        {{ t.startGame }}
      </button>
    </form>

    <!-- Game Phase -->
    <div v-else class="space-y-6">
      <!-- Table: a wireframe radar scope -->
      <div class="relative mx-auto w-full max-w-sm aspect-square">
        <div class="absolute inset-[9%] rounded-full border border-term scope-glow"></div>
        <div class="absolute inset-[24%] rounded-full border border-dashed border-term-low"></div>
        <div class="absolute inset-[39%] rounded-full border border-dashed border-term-low"></div>
        <div class="absolute left-[9%] right-[9%] top-1/2 h-px bg-term-low"></div>
        <div class="absolute top-[9%] bottom-[9%] left-1/2 w-px bg-term-low"></div>

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
              'max-w-[6.5rem] truncate px-2 py-1 text-xs sm:text-sm font-semibold uppercase transition-colors duration-150',
              selectedPlayer === index ? 'term-inverse player-picked' : 'bg-black border border-term-low term-muted'
            ]"
          >
            {{ player }}
          </div>
        </div>

        <!-- Bottle (drawn pointing up; the solid cap points at the chosen player) -->
        <button
          type="button"
          @click="spinBottle"
          :disabled="isSpinning"
          :aria-label="t.spin"
          class="absolute top-1/2 left-1/2 h-[52%] aspect-[1/3] text-term cursor-pointer disabled:cursor-default focus:outline-none"
          :style="bottleStyle"
        >
          <svg viewBox="0 0 40 120" class="h-full w-full bottle-glow" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter" aria-hidden="true">
            <rect x="15" y="2" width="10" height="7" fill="currentColor" />
            <path
              d="M15 9 h10 v24 c0 6 11 10 11 22 v55 a8 8 0 0 1 -8 8 h-16 a8 8 0 0 1 -8 -8 v-55 c0 -12 11 -16 11 -22 z"
              fill="#000"
            />
            <rect x="8" y="66" width="24" height="26" stroke-dasharray="3 2" />
            <path d="M12 75 h16 M14 81 h12" stroke-width="1" />
          </svg>
        </button>
      </div>

      <!-- Status -->
      <p
        :class="['text-center', selectedPlayer !== null ? 'font-display text-4xl leading-none' : 'term-muted text-sm font-semibold uppercase tracking-wider']"
        aria-live="polite"
      >
        &gt; {{ statusText }}
      </p>

      <!-- Game Controls -->
      <div class="space-y-4">
        <button v-if="selectedPlayer === null" @click="spinBottle" :disabled="isSpinning" class="term-btn term-btn-primary w-full min-h-14">
          {{ isSpinning ? t.spinning : t.spin }}
        </button>

        <template v-else>
          <div v-if="!currentChoice" class="grid grid-cols-2 gap-4">
            <button @click="pickPrompt('truth')" class="term-btn min-h-14">
              {{ t.truth }}
            </button>
            <button @click="pickPrompt('dare')" class="term-btn min-h-14">
              {{ t.dare }}
            </button>
          </div>

          <!-- Question/Dare Display -->
          <Transition name="prompt" mode="out-in">
            <div
              v-if="currentChoice"
              :key="currentPromptKey"
              :class="['p-6 text-center border border-term', currentChoice === 'dare' ? 'border-dashed' : '']"
            >
              <p class="term-label mb-3">
                {{ players[selectedPlayer] }} :: {{ currentChoice === 'truth' ? t.truth : t.dare }}
              </p>
              <p class="text-lg font-medium leading-relaxed">{{ currentPrompt }}</p>
            </div>
          </Transition>

          <div v-if="currentChoice" class="grid grid-cols-2 gap-4">
            <button @click="pickPrompt(currentChoice)" class="term-btn text-sm">
              {{ t.anotherPrompt }}
            </button>
            <button @click="spinBottle" class="term-btn term-btn-primary text-sm">
              {{ t.spinAgain }}
            </button>
          </div>
        </template>

        <div class="text-center">
          <button @click="resetGame" :disabled="isSpinning" class="term-link">
            <span aria-hidden="true">[~]</span>
            <span>{{ t.changePlayers }}</span>
          </button>
        </div>
      </div>
    </div>
  </TermWindow>
</template>

<style scoped>
.scope-glow {
  box-shadow: 0 0 18px rgba(0, 255, 0, 0.2), inset 0 0 30px rgba(0, 255, 0, 0.12);
}

.bottle-glow {
  filter: drop-shadow(0 0 4px rgba(0, 255, 0, 0.7));
}

.player-picked {
  animation: picked-pulse 1.2s ease-in-out infinite;
}

@keyframes picked-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0, 255, 0, 0.6); }
  50% { box-shadow: 0 0 0 8px rgba(0, 255, 0, 0); }
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
