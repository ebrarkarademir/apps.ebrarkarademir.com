<script setup>
import { ref, watch, nextTick } from 'vue'

// A game as a playing card: the face shows its ASCII art, tapping flips it over to the
// info on the back (players, time, mode) and the Run command that opens the game
const props = defineProps({
  game: {
    type: Object,
    required: true
  },
  t: {
    type: Object,
    required: true
  },
  flipped: {
    type: Boolean,
    default: false
  },
  // Number key that opens this game, shown in the corner on devices with a keyboard
  shortcut: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['flip', 'run'])

const face = ref(null)
const back = ref(null)
const runButton = ref(null)

// The hidden side is inert, so carry keyboard focus over to the side that turns up
watch(() => props.flipped, async (flipped) => {
  const from = flipped ? face.value : back.value
  if (!from?.contains(document.activeElement)) return
  await nextTick()
  ;(flipped ? runButton.value : face.value)?.focus({ preventScroll: true })
})
</script>

<template>
  <div :class="['game-card', { 'is-flipped': flipped }]">
    <div class="game-card-inner">
      <!-- Face -->
      <button
        ref="face"
        type="button"
        class="game-card-face term-card group flex flex-col p-3 sm:p-4 text-left"
        :aria-label="`${game.title}, ${t.cardShowInfo}`"
        :inert="flipped || undefined"
        @click="emit('flip', true)"
      >
        <span class="flex items-start justify-between gap-2 text-xs sm:text-sm font-semibold" aria-hidden="true">
          <span>{{ game.icon }}</span>
          <span v-if="shortcut" class="term-muted hidden pointer-fine:inline">{{ shortcut }}</span>
        </span>

        <span class="flex-1 min-h-0 flex items-center justify-center" aria-hidden="true">
          <span class="block whitespace-pre font-mono text-[0.6875rem] sm:text-sm lg:text-lg leading-tight">{{ game.art.join('\n') }}</span>
        </span>

        <span class="font-display text-xl sm:text-2xl leading-none uppercase text-center text-balance">{{ game.title }}</span>

        <span class="mt-2 sm:mt-3 flex items-end justify-between gap-2" aria-hidden="true">
          <span class="term-chip">{{ game.soon ? t.cardSoon : game.mode }}</span>
          <span class="rotate-180 text-xs sm:text-sm font-semibold">{{ game.icon }}</span>
        </span>
      </button>

      <!-- Back: tapping it flips the card face up again -->
      <div
        ref="back"
        class="game-card-face game-card-back flex flex-col gap-1.5 sm:gap-2 lg:gap-3 p-2.5 sm:p-3 lg:p-4"
        :inert="!flipped || undefined"
        @click="emit('flip', false)"
      >
        <div class="shrink-0 flex items-start justify-between gap-2">
          <h2 class="term-label text-term min-w-0 pt-1 leading-snug line-clamp-2 tracking-[0.06em] sm:tracking-[0.14em]">{{ game.icon }} {{ game.title }}</h2>
          <button
            type="button"
            class="term-link -mr-1.5 -mt-0.5 shrink-0"
            :aria-label="t.cardFlipBack"
            @click.stop="emit('flip', false)"
          >
            [x]
          </button>
        </div>

        <p class="term-muted shrink-0 text-xs lg:text-sm leading-snug max-[22rem]:line-clamp-1 line-clamp-2 lg:line-clamp-3">{{ game.description }}</p>

        <dl class="shrink-0 grid grid-cols-[auto_1fr] gap-x-2 sm:gap-x-3 gap-y-0.5 border-y border-dashed border-term-low py-1.5 sm:py-2 text-[0.6875rem] leading-tight sm:text-xs lg:text-sm">
          <dt class="term-muted uppercase">{{ t.cardPlayers }}</dt>
          <dd class="font-semibold">{{ game.players }}</dd>
          <dt class="term-muted uppercase">{{ t.cardTime }}</dt>
          <dd class="font-semibold">{{ game.duration }}</dd>
          <dt class="term-muted uppercase">{{ t.cardMode }}</dt>
          <dd class="font-semibold">{{ game.soon ? t.cardSoon : game.mode }}</dd>
        </dl>

        <button
          ref="runButton"
          type="button"
          class="term-btn term-btn-primary shrink-0 mt-auto w-full min-h-8 sm:min-h-9 px-2 py-1 text-xs sm:text-sm"
          @click.stop="emit('run')"
        >
          &gt; {{ t.cardRun }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Card flip, the same turn as the role card in Who is the Spy? */
/* A little taller than a poker card on phones, where the info side needs the room */
.game-card {
  aspect-ratio: 2 / 3;
  perspective: 1200px;
}
@media (min-width: 40rem) {
  .game-card {
    aspect-ratio: 5 / 7;
  }
}
.game-card-inner {
  position: relative;
  height: 100%;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}
.game-card.is-flipped .game-card-inner {
  transform: rotateY(180deg);
}
@media (hover: hover) {
  .game-card:not(.is-flipped):hover .game-card-inner {
    transform: rotateY(8deg);
  }
}
.game-card-face {
  position: absolute;
  inset: 0;
  overflow: hidden;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

/* The back is lit like an open window, over a faint hatch like the back of a playing card */
.game-card-back {
  transform: rotateY(180deg);
  border: 1px solid var(--color-term);
  background:
    repeating-linear-gradient(45deg, rgb(0 255 0 / 0.07) 0 1px, transparent 1px 7px),
    var(--color-black);
  box-shadow: 0 0 14px rgb(0 255 0 / 0.2), inset 0 0 28px rgb(0 255 0 / 0.06);
  cursor: pointer;
}

@media (prefers-reduced-motion: reduce) {
  .game-card-inner {
    transition: none;
  }
}
</style>
