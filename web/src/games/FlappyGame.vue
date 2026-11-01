<script setup>
import { reactive, computed, onMounted, onUnmounted } from 'vue'
import FlappyStage from './flappy/FlappyStage.vue'

// Flappy: one bird, one course that gets harder level by level, and the best score kept on
// this device. Opening the game goes straight to the bird, waiting for the first tap.

defineProps({
  t: { type: Object, required: true }
})

const emit = defineEmits(['go-back'])

const BEST_KEY = 'flappyBest'
const OVER_DELAY_MS = 450 // the score card waits for the bird to hit the ground

// Medals at the same scores as the original game
const MEDALS = [
  { min: 40, key: 'flappyMedalPlatinum', mark: '#' },
  { min: 30, key: 'flappyMedalGold', mark: '*' },
  { min: 20, key: 'flappyMedalSilver', mark: '+' },
  { min: 10, key: 'flappyMedalBronze', mark: 'o' }
]
const NO_MEDAL_ART = [' .--.', '( - x)>', " `--'"].join('\n')
const medalArt = (mark) => [' \\ /', ".-'-.", `| ${mark} |`, "'---'"].join('\n')

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const randomSeed = () => Math.floor(Math.random() * 2 ** 31)

function readBest () {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

function writeBest (score) {
  try {
    localStorage.setItem(BEST_KEY, String(score))
  } catch {
    // It just isn't kept
  }
}

const game = reactive({ runId: 1, seed: randomSeed(), phase: 'ready', score: 0, level: 1, best: readBest(), paused: false, over: false, newBest: false })
let overTimer = null

const medal = computed(() => MEDALS.find(m => game.score >= m.min) || null)

function onState ({ phase, score, level }) {
  game.phase = phase
  game.score = score
  game.level = level
  if (phase !== 'over' || game.over || overTimer) return
  game.newBest = score > game.best
  if (game.newBest) {
    game.best = score
    writeBest(score)
  }
  overTimer = setTimeout(() => {
    overTimer = null
    game.over = true
  }, OVER_DELAY_MS)
}

function retry () {
  clearTimeout(overTimer)
  overTimer = null
  Object.assign(game, { runId: game.runId + 1, seed: randomSeed(), phase: 'ready', score: 0, level: 1, paused: false, over: false, newBest: false })
}

function quit () {
  clearTimeout(overTimer)
  overTimer = null
  emit('go-back')
}

// Space or a tap resumes a paused game and retries once the score card is up
function onTap () {
  if (game.paused) game.paused = false
  else if (game.over) retry()
}

function togglePause () {
  if (game.paused || game.phase === 'play') game.paused = !game.paused
}

function onPauseClick (event) {
  togglePause()
  if (event.detail) event.currentTarget.blur()
}

function onVisibility () {
  if (document.hidden && game.phase === 'play') game.paused = true
}

onMounted(() => document.addEventListener('visibilitychange', onVisibility))
onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  clearTimeout(overTimer)
})
</script>

<template>
  <FlappyStage
    :t="t"
    :title="t.flappyTitle"
    :exitLabel="t.flappyQuit"
    :seed="game.seed"
    :runId="game.runId"
    :paused="game.paused"
    @exit="quit"
    @tap="onTap"
    @pause="togglePause"
    @state="onState"
  >
    <template #actions>
      <span class="hidden min-[420px]:inline shrink-0 term-muted text-xs tabular-nums whitespace-nowrap">{{ t.flappyBest }}: {{ game.best }}</span>
      <button
        type="button"
        class="term-icon-btn shrink-0 h-9 text-xs"
        :aria-label="game.paused ? t.flappyResume : t.flappyPause"
        :disabled="!game.paused && game.phase !== 'play'"
        @click="onPauseClick"
      >
        {{ game.paused ? '[>]' : '[||]' }}
      </button>
    </template>

    <template #overlay>
      <div v-if="game.over" class="absolute inset-0 flex items-center justify-center p-3 bg-black/40">
        <div class="term-window w-full max-w-xs p-5 text-center" role="dialog" aria-modal="false" :aria-label="t.flappyGameOver">
          <h2 class="font-display text-5xl leading-none uppercase">{{ t.flappyGameOver }}</h2>
          <p class="mt-2"><span class="term-chip">{{ fmt(t.flappyReachedLevel, { n: game.level }) }}</span></p>

          <div class="mt-4 flex items-center justify-center gap-5">
            <span class="whitespace-pre text-left text-sm leading-tight" aria-hidden="true">{{ medal ? medalArt(medal.mark) : NO_MEDAL_ART }}</span>
            <dl class="grid grid-cols-[auto_auto] items-baseline gap-x-4 text-left">
              <dt class="term-label">{{ t.flappyScore }}</dt>
              <dd class="font-display text-4xl leading-none tabular-nums">{{ game.score }}</dd>
              <dt class="term-label">{{ t.flappyBest }}</dt>
              <dd class="font-display text-4xl leading-none tabular-nums">{{ game.best }}</dd>
            </dl>
          </div>

          <p class="mt-3 text-sm term-muted">{{ medal ? fmt(t.flappyMedal, { medal: t[medal.key] }) : t.flappyNoMedal }}</p>
          <p v-if="game.newBest && game.score > 0" class="term-inverse inline-block mt-3 px-2 py-0.5 text-sm font-bold uppercase tracking-widest">{{ t.flappyNewBest }}</p>

          <button type="button" class="term-btn term-btn-primary w-full mt-5" @click="retry">{{ t.flappyRetry }}</button>
          <button type="button" class="term-btn w-full mt-2" @click="quit">{{ t.flappyQuit }}</button>
          <p class="term-muted text-xs mt-3">{{ t.flappyTapToRetry }}</p>
        </div>
      </div>

      <div v-else-if="game.paused" class="absolute inset-0 flex items-center justify-center p-3 bg-black/60">
        <div class="term-window w-full max-w-xs p-5 text-center">
          <h2 class="font-display text-5xl leading-none uppercase term-blink">{{ t.flappyPaused }}</h2>
          <button type="button" class="term-btn term-btn-primary w-full mt-5" @click="game.paused = false">{{ t.flappyResume }}</button>
          <p class="term-muted text-xs mt-3">{{ t.flappyTapToResume }}</p>
        </div>
      </div>
    </template>
  </FlappyStage>
</template>
