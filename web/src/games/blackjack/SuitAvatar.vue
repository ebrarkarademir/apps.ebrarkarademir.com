<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import sheet from './people/suit-frames.png'
import { FRAMES, FRAME_W, FRAME_H, TICKS_PER_SECOND, frameAt, breathAt } from './suitFrames'

// The man in the suit at the table, played from his own frames (see suitFrames.js): standing and
// now and then talking with his hands, drinking or smoking if he has something from the bar, and
// pleased when he wins a hand (`react`: { kind: 'win', id }, a new id each time). Players stand
// behind the table's padded rail; the dealer has the cards in front of him instead.
// `size` is the picture's width (any CSS length).
const props = defineProps({
  held: { type: String, default: '' },
  seed: { type: Number, default: 0 },
  react: { type: Object, default: null },
  dealer: { type: Boolean, default: false },
  size: { type: String, default: '' }
})

const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const tick = ref(0)
let timer = null
onMounted(() => {
  if (!still) timer = setInterval(() => { tick.value++ }, 1000 / TICKS_PER_SECOND)
})
onUnmounted(() => clearInterval(timer))

// A reaction starts on the tick it arrives; the same one isn't played twice
const reaction = ref(null)
watch(() => props.react?.id, (id) => {
  if (id && props.react?.kind) reaction.value = { kind: props.react.kind, at: tick.value }
})

const frame = computed(() => frameAt(tick.value, { held: props.held, seed: props.seed, reaction: reaction.value }))
const up = computed(() => breathAt(tick.value, props.seed))

const style = computed(() => ({ ...(props.size ? { '--av': props.size } : {}) }))
const spriteStyle = computed(() => ({
  backgroundImage: `url(${sheet})`,
  backgroundSize: `${FRAMES.length * 100}% 100%`,
  backgroundPosition: `${(frame.value / (FRAMES.length - 1)) * 100}% 0`,
  transform: up.value ? 'translateY(calc(var(--p) * -1))' : 'none'
}))
</script>

<template>
  <div class="suit-avatar" :style="style" aria-hidden="true">
    <span class="ground"></span>
    <span class="sprite" :style="spriteStyle"></span>
    <span v-if="!dealer" class="rail"></span>
  </div>
</template>

<style scoped>
.suit-avatar {
  /* His frames leave room round him for his hands and the smoke: a size up to make up for it */
  --w: calc(var(--av, 72px) * 1.3);
  --p: calc(var(--w) / v-bind(FRAME_W));
  position: relative;
  flex: none;
  width: var(--w);
  height: calc(var(--w) * v-bind(FRAME_H) / v-bind(FRAME_W));
  pointer-events: none;
}

/* A soft shadow on the felt round him, so he stands out from it */
.ground {
  position: absolute;
  left: -8%;
  right: -8%;
  bottom: -6%;
  height: 40%;
  background: radial-gradient(ellipse at 50% 60%, rgb(0 0 0 / 0.45), transparent 70%);
}

.sprite {
  position: absolute;
  inset: 0;
  background-repeat: no-repeat;
  image-rendering: pixelated;
}

/* The table's padded rail in front of him, with its brass trim, over his belt */
.rail {
  position: absolute;
  left: -4%;
  right: -4%;
  bottom: 0;
  height: calc(var(--p) * 14);
  border: max(1px, calc(var(--p) * 0.8)) solid #21160f;
  background:
    repeating-linear-gradient(90deg, transparent 0 calc(var(--p) * 11), #a8801f calc(var(--p) * 11) calc(var(--p) * 13)) 0 calc(var(--p) * 5) / 100% calc(var(--p) * 2) no-repeat,
    linear-gradient(#cf5e52 0 18%, #93322d 18% 72%, #581918 72% 82%, #e9c55a 82%);
}
</style>
