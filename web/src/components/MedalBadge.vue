<script setup>
import { computed } from 'vue'
import PixelArt from './PixelArt.vue'
import { sprite } from '../pixel/kit'

// One medal as pixel art: a ribbon and a disc with the medal's mark. An earned one swings on
// its ribbon, its mark twinkles and a glint runs across it; one still to earn sits gray with a ?.
const props = defineProps({
  medal: { type: Object, required: true }, // { id, gid, mark } from profile.js
  earned: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  // Staggers the animations, so a row of medals doesn't move in step
  index: { type: Number, default: 0 }
})

// Each medal its own metal and ribbon, picked by its place in the list
const METALS = [
  { m: 'y', M: 'w', d: 'o', a: 'r', b: 'b' },
  { m: 'g', M: 'w', d: 's', a: 'b', b: 'c' },
  { m: 'o', M: 'y', d: 'r', a: 'G', b: 'l' },
  { m: 'C', M: 'w', d: 'c', a: 'p', b: 'r' }
]
const LOCKED = { m: 'd', M: 's', d: 'K', a: 's', b: 's' }

const RIBBON = [
  'aa......bb',
  '.aa....bb.',
  '..aa..bb..',
  '...abba...'
]
const DISC = [
  '...mmmm...',
  '..mMMmmm..',
  '.mMmmmmdm.',
  '.mmmmmmdm.',
  '.mmmmmmdm.',
  '.mmmmmddm.',
  '..mdddmm..',
  '...mmmm...'
]

const colors = computed(() => (props.earned ? METALS[props.index % METALS.length] : LOCKED))
const ribbon = computed(() => sprite(RIBBON, { colors: colors.value }))
const disc = computed(() => sprite(DISC, { colors: colors.value }))
</script>

<template>
  <span
    :class="['medal', { 'is-earned': earned, 'is-selected': selected }]"
    :style="{ '--delay': `${-index * 0.45}s` }"
  >
    <span class="medal-art" aria-hidden="true">
      <PixelArt :art="ribbon" class="medal-ribbon" />
      <span class="medal-disc">
        <PixelArt :art="disc" class="w-full h-auto" />
        <span class="medal-mark">{{ earned ? medal.mark : '?' }}</span>
      </span>
    </span>
    <span class="medal-name">{{ medal.id }}</span>
    <span class="medal-gid">gid {{ medal.gid }}</span>
  </span>
</template>

<style scoped>
.medal {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  width: 100%;
  padding: 0.5rem 0.25rem 0.4rem;
  background: var(--color-panel);
  box-shadow: 0 0 0 2px var(--color-well);
  color: var(--color-term-low);
  overflow: hidden;
}

.medal.is-earned {
  color: var(--color-term);
}

.medal.is-selected {
  background: var(--color-term-deep);
  box-shadow: 0 0 0 2px var(--color-gold);
}

.medal-art {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 3rem;
}
.medal-ribbon {
  width: 2.5rem;
  height: auto;
}

.medal-disc {
  position: relative;
  display: block;
  width: 2.5rem;
  margin-top: -0.25rem;
  transform-origin: 50% -40%;
}

.medal-mark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 0.7rem;
  color: var(--color-well);
}

.medal-name {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.medal-gid {
  font-size: 0.65rem;
  opacity: 0.7;
}

.is-earned .medal-disc {
  animation: medal-swing 3.2s steps(6) infinite;
  animation-delay: var(--delay);
}

.is-earned .medal-mark {
  animation: medal-twinkle 2.4s steps(4) infinite;
  animation-delay: var(--delay);
}

/* A glint that runs across now and then */
.is-earned::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 42%, rgb(255 255 255 / 0.35) 42% 50%, transparent 50%);
  background-size: 300% 100%;
  pointer-events: none;
  animation: medal-glint 4.5s steps(12) infinite;
  animation-delay: var(--delay);
}

@keyframes medal-swing {
  0%, 100% { transform: rotate(-6deg); }
  50% { transform: rotate(6deg); }
}

@keyframes medal-twinkle {
  0%, 70%, 100% { transform: scale(1); }
  80% { transform: scale(1.4); }
}

@keyframes medal-glint {
  0%, 55% { background-position: 100% 0; }
  85%, 100% { background-position: 0 0; }
}

@media (prefers-reduced-motion: reduce) {
  .is-earned .medal-disc,
  .is-earned .medal-mark,
  .is-earned::after {
    animation: none;
  }
}
</style>
