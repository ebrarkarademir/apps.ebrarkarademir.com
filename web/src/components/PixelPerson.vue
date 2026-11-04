<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { SHEETS } from '../games/blackjack/people/sheets'
import { LOOKS, FRAME_W, FRAME_H, TICKS_PER_SECOND, frameAt, breathAt } from '../games/blackjack/suitFrames'
import { characterOf } from '../online/characters'

// Someone's picture on the site: the pixel-art person they picked (see online/characters.js),
// from the Blackjack table's frames (games/blackjack/people). `av` is their avatar number, which
// says who; `character` names one outright (for the picker). `face` is the head and shoulders,
// still, for lists and chat lines; without it they're shown down to the waist, alive: breathing,
// and the man in the suit now and then talking with his hands. `size` is the picture's width
// (any CSS length).
const props = defineProps({
  face: { type: Boolean, default: false },
  size: { type: String, default: '2rem' },
  av: { type: Number, default: 0 },
  character: { type: String, default: '' },
  seed: { type: Number, default: 0 } // so two of them on one page don't move together
})

const FACE = { x: 64, y: 6, w: 58, h: 58 } // the head and shoulders in a frame, the same for everyone

const who = computed(() => (LOOKS[props.character] ? props.character : characterOf(props.av)))
const look = computed(() => LOOKS[who.value])

const tick = ref(0)
let timer = null
onMounted(() => {
  if (props.face || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  timer = setInterval(() => { tick.value++ }, 1000 / TICKS_PER_SECOND)
})
onUnmounted(() => clearInterval(timer))

const frame = computed(() => (props.face ? look.value.still : frameAt(tick.value, { seed: props.seed, character: who.value })))

// The part of the sheet shown: a whole frame, or the face in one
const style = computed(() => {
  const crop = props.face ? FACE : { x: 0, y: 0, w: FRAME_W, h: FRAME_H }
  const sheetW = FRAME_W * look.value.frames.length
  const left = frame.value * FRAME_W + crop.x
  return {
    width: props.size,
    aspectRatio: `${crop.w} / ${crop.h}`,
    backgroundImage: `url(${SHEETS[who.value]})`,
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
