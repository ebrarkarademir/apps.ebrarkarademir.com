<script setup>
// One medal as ASCII art: a ribbon and a disc with the medal's mark. An earned one swings on
// its ribbon, its mark twinkles and a glint runs across it; one still to earn sits dim with a ?.
defineProps({
  medal: { type: Object, required: true }, // { id, gid, mark } from profile.js
  earned: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  // Staggers the animations, so a row of medals doesn't move in step
  index: { type: Number, default: 0 }
})
</script>

<template>
  <span
    :class="['medal', { 'is-earned': earned, 'is-selected': selected }]"
    :style="{ '--delay': `${-index * 0.45}s` }"
  >
    <pre class="medal-art" aria-hidden="true"><span class="medal-ribbon"> \\   //
  \\_//  </span>
<span class="medal-disc">  .-'-.
 /  <span class="medal-mark">{{ earned ? medal.mark : '?' }}</span>  \
 \     /
  '---'  </span></pre>
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
  padding: 0.5rem 0.25rem 0.4rem;
  border: 1px dashed var(--color-term-low);
  color: var(--color-term-low);
  text-shadow: none;
  overflow: hidden;
}

.medal.is-earned {
  border-style: solid;
  border-color: var(--color-term-low);
  color: var(--color-term);
  text-shadow: 0 0 5px rgb(0 255 0 / 0.45);
}

.medal.is-selected {
  border-color: var(--color-term);
  background: var(--color-term-deep);
}

.medal-art {
  margin: 0;
  font-family: inherit;
  font-size: 0.8rem;
  line-height: 1.05;
  white-space: pre;
}

.medal-disc {
  display: inline-block;
  transform-origin: 50% -40%;
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
  animation: medal-swing 3.2s ease-in-out infinite;
  animation-delay: var(--delay);
}

.is-earned .medal-mark {
  display: inline-block;
  animation: medal-twinkle 2.4s ease-in-out infinite;
  animation-delay: var(--delay);
}

/* A glint: brightens the green letters only, the black around them stays black */
.is-earned::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 35%, rgb(255 255 255 / 0.85) 50%, transparent 65%);
  background-size: 300% 100%;
  mix-blend-mode: color-dodge;
  pointer-events: none;
  animation: medal-glint 4.5s ease-in-out infinite;
  animation-delay: var(--delay);
}

@keyframes medal-swing {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}

@keyframes medal-twinkle {
  0%, 70%, 100% { transform: scale(1); opacity: 1; }
  80% { transform: scale(1.5); opacity: 0.6; }
  90% { transform: scale(0.9); opacity: 1; }
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
