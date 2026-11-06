<script setup>
import { ref, watch, nextTick } from 'vue'
import PixelArt from './PixelArt.vue'

// A game as a cartridge: the face shows its pixel art, tapping flips it over to the
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
        <span class="flex items-center justify-between gap-2 text-[0.6875rem] sm:text-xs font-semibold" aria-hidden="true">
          <span class="term-muted">{{ game.players }}P</span>
          <span class="flex items-center gap-2">
            <span v-if="game.version" class="term-muted tabular-nums">v{{ game.version }}</span>
            <span v-if="shortcut" class="card-key hidden pointer-fine:inline-flex">{{ shortcut }}</span>
          </span>
        </span>

        <span class="card-screen mt-2 shrink-0" aria-hidden="true">
          <PixelArt :art="game.art" class="card-art" />
        </span>

        <span class="flex-1 min-h-0 flex flex-col items-center justify-center gap-2 sm:gap-3 pt-2">
          <span class="font-display text-xl sm:text-2xl leading-tight uppercase text-center text-balance">{{ game.title }}</span>
          <span class="term-chip" aria-hidden="true">{{ game.soon ? t.cardSoon : game.mode }}</span>
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
          <h2 class="term-label min-w-0 pt-1 leading-snug line-clamp-2">{{ game.title }}</h2>
          <button
            type="button"
            class="term-link -mr-1.5 -mt-0.5 shrink-0"
            :aria-label="t.cardFlipBack"
            @click.stop="emit('flip', false)"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <p class="term-muted shrink-0 text-xs lg:text-sm leading-snug max-[22rem]:line-clamp-1 line-clamp-2 lg:line-clamp-3">{{ game.description }}</p>

        <dl class="shrink-0 grid grid-cols-[auto_1fr] gap-x-2 sm:gap-x-3 gap-y-0.5 border-y-2 border-term-deep py-1.5 sm:py-2 text-[0.6875rem] leading-tight sm:text-xs lg:text-sm">
          <dt class="term-muted uppercase">{{ t.cardPlayers }}</dt>
          <dd class="font-semibold">{{ game.players }}</dd>
          <dt class="term-muted uppercase">{{ t.cardTime }}</dt>
          <dd class="font-semibold">{{ game.duration }}</dd>
          <dt class="term-muted uppercase">{{ t.cardMode }}</dt>
          <dd class="font-semibold">{{ game.soon ? t.cardSoon : game.mode }}</dd>
          <template v-if="game.version">
            <dt class="term-muted uppercase">{{ t.cardVersion }}</dt>
            <dd class="font-semibold tabular-nums">v{{ game.version }}</dd>
          </template>
        </dl>

        <button
          ref="runButton"
          type="button"
          class="term-btn term-btn-primary shrink-0 mt-auto w-full min-h-8 sm:min-h-9 px-2 py-1 text-xs sm:text-sm"
          @click.stop="emit('run')"
        >
          ▶ {{ t.cardRun }}
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
  transition: transform 0.42s steps(7, jump-none);
  transform-style: preserve-3d;
}
.game-card.is-flipped .game-card-inner {
  transform: rotateY(180deg);
}
.game-card-face {
  position: absolute;
  inset: 0;
  overflow: hidden;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

/* The art sits in a sunk-in screen, like the label on a cartridge */
.card-screen {
  display: block;
  background: var(--color-well);
  box-shadow: 0 0 0 2px var(--color-well), 0 0 0 4px var(--color-term-deep);
  margin: 2px;
}
.card-art {
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 3;
}

.card-key {
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.25rem;
  background: var(--color-term-deep);
  color: var(--color-term);
  box-shadow: inset 0 -2px 0 0 rgb(0 0 0 / 0.35);
}

/* The back: the card's other side, gold-edged over a pattern of little squares */
.game-card-back {
  transform: rotateY(180deg);
  background:
    linear-gradient(90deg, rgb(255 255 255 / 0.04) 50%, transparent 50%) 0 0 / 8px 8px,
    linear-gradient(rgb(255 255 255 / 0.04) 50%, transparent 50%) 0 0 / 8px 8px,
    var(--color-panel);
  box-shadow:
    0 calc(var(--px) * -1) 0 0 var(--color-gold),
    0 var(--px) 0 0 var(--color-gold),
    calc(var(--px) * -1) 0 0 0 var(--color-gold),
    var(--px) 0 0 0 var(--color-gold),
    inset 0 var(--px) 0 0 rgb(255 255 255 / 0.1);
  cursor: pointer;
}

@media (prefers-reduced-motion: reduce) {
  .game-card-inner {
    transition: none;
  }
}
</style>
