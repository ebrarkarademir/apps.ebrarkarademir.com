<script setup>
import { computed } from 'vue'
import { avatarUrl, heldKind, canHold, emberOf, MOUTH_AT, W, H } from './avatars'

// Someone at the table in pixel art (see avatars.js): a player on their chair behind the rail, or
// the dealer. Whatever they hold from the bar they use, the way a person at a bar does: a sip of
// beer every few seconds with their eyes shut, a bite of a burger, or a cigarette: its lit end
// glowing and smoking in their hand, then up to the lips for a long draw that makes it glow
// brighter, and a big cloud of smoke breathed out after. They blink, and breathe.
// `size` is the picture's width (any CSS length).
const props = defineProps({
  look: { type: Object, required: true },
  held: { type: String, default: '' }, // a bar item id
  seed: { type: Number, default: 0 }, // so people at one table don't all move at once
  size: { type: String, default: '' }
})

const item = computed(() => (canHold(props.held) ? props.held : ''))
const kind = computed(() => (item.value ? heldKind(item.value) : ''))
const ember = computed(() => emberOf(item.value))

const layers = computed(() => {
  const url = (options) => avatarUrl(props.look, options)
  return {
    chair: url({ part: 'chair' }),
    person: url({ part: 'person' }),
    shut: url({ part: 'person', closed: true }),
    rail: url({ part: 'rail' }),
    down: url({ part: 'arm', pose: 'down', held: item.value }),
    up: item.value ? url({ part: 'arm', pose: 'up', held: item.value }) : ''
  }
})

const at = (point) => ({ left: `${point.x * 100}%`, top: `${point.y * 100}%` })
const mouth = at(MOUTH_AT)

const style = computed(() => ({
  '--seed': props.seed % 7,
  '--gw': W,
  '--gh': H,
  ...(props.size ? { '--av': props.size } : {})
}))
</script>

<template>
  <div :class="['avatar', kind && `does-${kind}`]" :style="style" aria-hidden="true">
    <span class="ground"></span>
    <img class="layer" :src="layers.chair" alt="" draggable="false" />
    <img class="layer breathe" :src="layers.person" alt="" draggable="false" />
    <img class="layer breathe blink" :src="layers.shut" alt="" draggable="false" />
    <img v-if="kind && kind !== 'eat'" class="layer breathe savour" :src="layers.shut" alt="" draggable="false" />
    <img class="layer" :src="layers.rail" alt="" draggable="false" />
    <img :class="['layer breathe', { rest: kind }]" :src="layers.down" alt="" draggable="false" />
    <img v-if="kind" class="layer breathe lift" :src="layers.up" alt="" draggable="false" />

    <!-- The lit end, glowing and smoking while it's down in the hand... -->
    <span v-if="ember" class="ember at-rest" :style="at(ember.down)">
      <b class="glow"></b>
      <i v-for="i in 4" :key="i" class="wisp" :style="{ '--i': i - 1 }"></i>
    </span>
    <!-- ...and glowing bright during a draw -->
    <span v-if="ember" class="ember at-lips" :style="at(ember.up)">
      <b class="glow"></b>
      <i v-for="i in 2" :key="i" class="wisp" :style="{ '--i': i - 1 }"></i>
    </span>
    <!-- The cloud breathed out after it -->
    <span v-if="kind === 'smoke'" class="exhale" :style="mouth">
      <i v-for="i in 7" :key="i" :style="{ '--i': i - 1 }"></i>
    </span>
  </div>
</template>

<style scoped>
.avatar {
  --w: var(--av, 72px);
  --p: calc(var(--w) / var(--gw, 40));
  --cycle: 7s;
  --offset: calc(var(--seed) * -1.37s);
  position: relative;
  flex: none;
  width: var(--w);
  height: calc(var(--w) * var(--gh, 44) / var(--gw, 40));
  pointer-events: none;
}

.does-eat { --cycle: 5s; }
.does-smoke { --cycle: 8s; }

/* A soft shadow on the felt round them, so they stand out from it */
.ground {
  position: absolute;
  left: -8%;
  right: -8%;
  bottom: -6%;
  height: 40%;
  background: radial-gradient(ellipse at 50% 60%, rgb(0 0 0 / 0.45), transparent 70%);
}

.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  max-width: none;
  height: 100%;
  image-rendering: pixelated;
}

/* Breathing: up a pixel and back, every couple of seconds */
.breathe {
  animation: breathe 2.6s steps(1, end) infinite;
  animation-delay: calc(var(--seed) * -0.41s);
}

@keyframes breathe {
  0%, 55% { transform: none; }
  56%, 100% { transform: translateY(calc(var(--p) * -1)); }
}

/* A blink every few seconds */
.blink {
  opacity: 0;
  animation: breathe 2.6s steps(1, end) infinite, blink 4.3s steps(1, end) infinite;
  animation-delay: calc(var(--seed) * -0.41s), calc(var(--seed) * -0.7s);
}

@keyframes blink {
  0%, 95% { opacity: 0; }
  96%, 100% { opacity: 1; }
}

/* The arm on the rail, and up at the mouth for a while each cycle */
.rest {
  animation: breathe 2.6s steps(1, end) infinite, rest var(--cycle) steps(1, end) infinite;
  animation-delay: calc(var(--seed) * -0.41s), var(--offset);
}

.lift {
  opacity: 0;
  animation: breathe 2.6s steps(1, end) infinite, lift var(--cycle) steps(1, end) infinite;
  animation-delay: calc(var(--seed) * -0.41s), var(--offset);
}

/* Eyes shut while sipping or drawing on it */
.savour {
  opacity: 0;
  animation: breathe 2.6s steps(1, end) infinite, savour var(--cycle) steps(1, end) infinite;
  animation-delay: calc(var(--seed) * -0.41s), var(--offset);
}

@keyframes rest {
  0%, 59% { opacity: 1; }
  60%, 83% { opacity: 0; }
  84%, 100% { opacity: 1; }
}

@keyframes lift {
  0%, 59% { opacity: 0; }
  60%, 83% { opacity: 1; }
  84%, 100% { opacity: 0; }
}

@keyframes savour {
  0%, 63% { opacity: 0; }
  64%, 81% { opacity: 1; }
  82%, 100% { opacity: 0; }
}

/* A bite is quicker: two up and downs a cycle */
.does-eat .rest { animation-name: breathe, rest-eat; }
.does-eat .lift { animation-name: breathe, lift-eat; }

@keyframes rest-eat {
  0%, 49% { opacity: 1; }
  50%, 61% { opacity: 0; }
  62%, 71% { opacity: 1; }
  72%, 83% { opacity: 0; }
  84%, 100% { opacity: 1; }
}

@keyframes lift-eat {
  0%, 49% { opacity: 0; }
  50%, 61% { opacity: 1; }
  62%, 71% { opacity: 0; }
  72%, 83% { opacity: 1; }
  84%, 100% { opacity: 0; }
}

/* ---------- Smoke ---------- */

/* The lit end: a glow over its pixel, and smoke curling up off it. It's where the cigarette is:
   in the hand while it rests, at the lips during a draw. */
.ember {
  position: absolute;
  width: 0;
  height: 0;
}

.ember.at-rest {
  animation: rest var(--cycle) steps(1, end) infinite;
  animation-delay: var(--offset);
}

.ember.at-lips {
  opacity: 0;
  animation: lift var(--cycle) steps(1, end) infinite;
  animation-delay: var(--offset);
}

.glow {
  position: absolute;
  left: calc(var(--p) * -2.5);
  top: calc(var(--p) * -2.5);
  width: calc(var(--p) * 5);
  height: calc(var(--p) * 5);
  border-radius: 50%;
  background: radial-gradient(circle, rgb(255 235 150 / 0.95) 0 18%, rgb(255 120 40 / 0.7) 35%, rgb(255 80 20 / 0) 70%);
  animation: smoulder 1.6s ease-in-out infinite;
}

/* At the lips it burns bright with the draw */
.at-lips .glow {
  left: calc(var(--p) * -3.5);
  top: calc(var(--p) * -3.5);
  width: calc(var(--p) * 7);
  height: calc(var(--p) * 7);
  animation: draw 0.5s ease-in-out infinite alternate;
}

@keyframes smoulder {
  0%, 100% { opacity: 0.55; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1.1); }
}

@keyframes draw {
  from { opacity: 0.8; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1.3); }
}

.wisp {
  position: absolute;
  left: calc(var(--p) * -1.5);
  top: calc(var(--p) * -3);
  width: calc(var(--p) * 3);
  height: calc(var(--p) * 3);
  border-radius: 30%;
  background: #f3f5f7;
  box-shadow: 0 0 0 calc(var(--p) * 0.5) rgb(255 255 255 / 0.3);
  opacity: 0;
  animation: wisp 2.8s steps(14) infinite;
  animation-delay: calc(var(--i) * -0.7s);
}

@keyframes wisp {
  0% { opacity: 0; transform: translate(0, 0) scale(0.6); }
  12% { opacity: 0.95; }
  35% { transform: translate(calc(var(--p) * 1.5), calc(var(--p) * -5)) scale(1); }
  65% { opacity: 0.7; transform: translate(calc(var(--p) * -1.5), calc(var(--p) * -10)) scale(1.6); }
  100% { opacity: 0; transform: translate(calc(var(--p) * 1), calc(var(--p) * -16)) scale(2.2); }
}

/* The cloud breathed out after a draw: puffs out of the mouth, swelling as they rise and drift */
.exhale {
  position: absolute;
  width: 0;
  height: 0;
}

.exhale i {
  position: absolute;
  left: calc(var(--p) * -1.5);
  top: calc(var(--p) * -1.5);
  width: calc(var(--p) * 3);
  height: calc(var(--p) * 3);
  border-radius: 30%;
  background: #f1f4f6;
  box-shadow: 0 0 0 calc(var(--p) * 0.5) rgb(255 255 255 / 0.35);
  opacity: 0;
  animation: exhale var(--cycle) linear infinite;
  animation-delay: calc(var(--offset) - var(--i) * 0.12s);
}

.exhale i:nth-child(odd) { margin-left: calc(var(--p) * -2); }
.exhale i:nth-child(3n) { margin-top: calc(var(--p) * 1.5); }

@keyframes exhale {
  0%, 83.5% { opacity: 0; transform: translate(0, 0) scale(0.4); }
  85% { opacity: 0.95; transform: translate(calc(var(--p) * -2), calc(var(--p) * -1)) scale(1); }
  89% { opacity: 0.85; transform: translate(calc(var(--p) * -5), calc(var(--p) * -4)) scale(1.8); }
  94% { opacity: 0.55; transform: translate(calc(var(--p) * -7), calc(var(--p) * -9)) scale(2.6); }
  99% { opacity: 0.1; transform: translate(calc(var(--p) * -6), calc(var(--p) * -15)) scale(3.4); }
  100% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .layer, .glow {
    animation: none !important;
  }

  .blink, .savour, .lift, .at-lips {
    opacity: 0;
  }

  .wisp, .exhale {
    display: none;
  }
}
</style>
