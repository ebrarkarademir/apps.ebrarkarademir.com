<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import sheet from '../games/blackjack/people/suit-frames.png'
import { FRAMES, FRAME_W, FRAME_H, TICKS_PER_SECOND, frameAt, breathAt } from '../games/blackjack/suitFrames'

// Everyone's picture on the site for now: the pixel-art man in the navy suit, from the Blackjack
// table's frames (games/blackjack/people/suit-frames.png). `face` is his head and shoulders, still,
// for lists and chat lines; without it he's shown down to the waist, alive: breathing, and now and
// then talking with his hands. `size` is the picture's width (any CSS length).
const props = defineProps({
  face: { type: Boolean, default: false },
  size: { type: String, default: '2rem' },
  seed: { type: Number, default: 0 } // so two of him on one page don't move together
})

const STILL_FRAME = FRAMES.indexOf('empty_hand_4') // standing, hands down
const FACE = { x: 64, y: 6, w: 58, h: 58 } // his head and shoulders in a frame

const tick = ref(0)
let timer = null
onMounted(() => {
  if (props.face || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  timer = setInterval(() => { tick.value++ }, 1000 / TICKS_PER_SECOND)
})
onUnmounted(() => clearInterval(timer))

const frame = computed(() => (props.face ? STILL_FRAME : frameAt(tick.value, { seed: props.seed })))

// The part of the sheet shown: a whole frame, or the face in one
const style = computed(() => {
  const crop = props.face ? FACE : { x: 0, y: 0, w: FRAME_W, h: FRAME_H }
  const sheetW = FRAME_W * FRAMES.length
  const left = frame.value * FRAME_W + crop.x
  return {
    width: props.size,
    aspectRatio: `${crop.w} / ${crop.h}`,
    backgroundImage: `url(${sheet})`,
    backgroundSize: `${(sheetW / crop.w) * 100}% ${(FRAME_H / crop.h) * 100}%`,
    backgroundPosition: `${(left / (sheetW - crop.w)) * 100}% ${crop.h < FRAME_H ? (crop.y / (FRAME_H - crop.h)) * 100 : 0}%`,
    transform: !props.face && breathAt(tick.value, props.seed) ? `translateY(-${100 / FRAME_H}%)` : 'none'
  }
})
</script>

<template>
  <span class="pixel-person" :style="style" aria-hidden="true"></span>
</template>

<style scoped>
.pixel-person {
  display: inline-block;
  flex: none;
  vertical-align: middle;
  background-repeat: no-repeat;
  image-rendering: pixelated;
}
</style>
