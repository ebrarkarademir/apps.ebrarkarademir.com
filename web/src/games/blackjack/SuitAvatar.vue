<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { canHold } from './avatars'
import { suitFrame, FW, FH } from './suitFigure'
import { frameAt, FPS } from './suitAnim'

// The man in the suit at the table, animated frame by frame (see suitAnim.js): breathing and
// blinking, drinking, smoking or eating whatever he has from the bar, and a fist in the air or a
// hand to his forehead when a hand is won or lost (`react`: { kind: 'win' | 'lose', id }, a new id
// for each). `size` is the picture's width (any CSS length).
const props = defineProps({
  held: { type: String, default: '' },
  seed: { type: Number, default: 0 },
  react: { type: Object, default: null },
  dealer: { type: Boolean, default: false },
  size: { type: String, default: '' }
})

const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const f = ref(0)
let timer = null
onMounted(() => {
  if (!still) timer = setInterval(() => { f.value++ }, 1000 / FPS)
})
onUnmounted(() => clearInterval(timer))

// A reaction starts on the frame it arrives; the same one isn't played twice
const reaction = ref(null)
watch(() => props.react?.id, (id) => {
  if (id && props.react?.kind) reaction.value = { kind: props.react.kind, at: f.value }
})

const item = computed(() => (canHold(props.held) ? props.held : ''))
const state = computed(() => frameAt(f.value, { held: item.value, seed: props.seed, reaction: reaction.value }))
const layers = computed(() => suitFrame(state.value, { held: item.value, dealer: props.dealer }))

const style = computed(() => ({ '--gw': FW, '--gh': FH, ...(props.size ? { '--av': props.size } : {}) }))
</script>

<template>
  <div class="avatar" :style="style" aria-hidden="true">
    <span class="ground"></span>
    <div class="body" :style="{ transform: state.breath ? 'translateY(calc(var(--p) * -1))' : 'none' }">
      <img class="layer" :src="layers.body" alt="" draggable="false" />
      <img class="layer" :src="layers.eyes" alt="" draggable="false" />
      <img class="layer" :src="layers.mouth" alt="" draggable="false" />
    </div>
    <img class="layer" :src="layers.rail" alt="" draggable="false" />
    <img class="layer" :src="layers.arm" alt="" draggable="false" />
    <img class="layer" :src="layers.fx" alt="" draggable="false" />
  </div>
</template>

<style scoped>
.avatar {
  --w: var(--av, 72px);
  --p: calc(var(--w) / var(--gw, 112));
  position: relative;
  flex: none;
  width: var(--w);
  height: calc(var(--w) * var(--gh, 139) / var(--gw, 112));
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

.body,
.layer {
  position: absolute;
  inset: 0;
}

.layer {
  width: 100%;
  max-width: none;
  height: 100%;
  image-rendering: pixelated;
}
</style>
