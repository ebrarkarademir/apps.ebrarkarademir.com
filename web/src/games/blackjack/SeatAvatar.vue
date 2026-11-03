<script setup>
import { computed } from 'vue'
import { avatarUrl, heldKind, canHold } from './avatars'

// Someone at the table in pixel art (see avatars.js): a player on their chair behind the rail, or
// the dealer. Whatever they hold from the bar they use, the way a person at a bar does: a sip of
// beer every few seconds with their eyes shut, a draw on a cigarette and a puff of smoke after,
// a bite of a burger. They blink, and breathe. `size` is the picture's width (any CSS length).
const props = defineProps({
  look: { type: Object, required: true },
  held: { type: String, default: '' }, // a bar item id
  seed: { type: Number, default: 0 }, // so people at one table don't all move at once
  size: { type: String, default: '' }
})

const item = computed(() => (canHold(props.held) ? props.held : ''))
const kind = computed(() => (item.value ? heldKind(item.value) : ''))

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

const style = computed(() => ({ '--seed': props.seed % 7, ...(props.size ? { '--av': props.size } : {}) }))
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
    <span v-if="kind === 'smoke'" class="puff">
      <i v-for="i in 4" :key="i" :style="{ '--i': i - 1 }"></i>
    </span>
    <span v-if="kind === 'smoke'" class="wisp">
      <i v-for="i in 2" :key="i" :style="{ '--i': i - 1 }"></i>
    </span>
  </div>
</template>

<style scoped>
.avatar {
  --w: var(--av, 72px);
  --p: calc(var(--w) / 28);
  --cycle: 7s;
  --offset: calc(var(--seed) * -1.37s);
  position: relative;
  flex: none;
  width: var(--w);
  height: calc(var(--w) * 30 / 28);
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

/* The puff of smoke after a draw, out of the mouth and up */
.puff i,
.wisp i {
  position: absolute;
  width: calc(var(--p) * 2);
  height: calc(var(--p) * 2);
  background: #e6eaee;
  opacity: 0;
}

.puff i {
  left: 50%;
  top: 40%;
  animation: puff var(--cycle) steps(1, end) infinite;
  animation-delay: calc(var(--offset) - var(--i) * 0.08s);
}

@keyframes puff {
  0%, 84% { opacity: 0; transform: none; }
  85% { opacity: 0.9; transform: translate(calc(var(--p) * 1), calc(var(--p) * -1)) scale(1); }
  88% { opacity: 0.85; transform: translate(calc(var(--p) * 3), calc(var(--p) * -3)) scale(1.4); }
  91% { opacity: 0.7; transform: translate(calc(var(--p) * 4), calc(var(--p) * -6)) scale(1.9); }
  94% { opacity: 0.45; transform: translate(calc(var(--p) * 3), calc(var(--p) * -9)) scale(2.4); }
  97% { opacity: 0.2; transform: translate(calc(var(--p) * 4), calc(var(--p) * -12)) scale(2.8); }
  100% { opacity: 0; }
}

.puff i:nth-child(2) { margin-left: calc(var(--p) * -2); }
.puff i:nth-child(3) { margin-top: calc(var(--p) * 1); }
.puff i:nth-child(4) { margin-left: calc(var(--p) * 2); margin-top: calc(var(--p) * -1); }

/* A thin line of smoke off the lit end, while it rests in the hand */
.wisp {
  animation: rest var(--cycle) steps(1, end) infinite;
  animation-delay: var(--offset);
}

.wisp i {
  left: 39%;
  top: 76%;
  width: var(--p);
  height: calc(var(--p) * 2);
  animation: wisp 2.2s steps(6) infinite;
  animation-delay: calc(var(--i) * -1.1s);
}

@keyframes wisp {
  0% { opacity: 0; transform: none; }
  20% { opacity: 0.8; }
  50% { transform: translate(calc(var(--p) * -1), calc(var(--p) * -4)); }
  100% { opacity: 0; transform: translate(calc(var(--p) * 1), calc(var(--p) * -9)); }
}

@media (prefers-reduced-motion: reduce) {
  .layer {
    animation: none !important;
  }

  .blink, .savour, .lift {
    opacity: 0;
  }

  .puff, .wisp {
    display: none;
  }
}
</style>
