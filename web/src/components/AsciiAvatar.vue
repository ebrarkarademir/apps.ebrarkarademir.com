<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { faceLines } from '../online/profile'

// Someone's ASCII face (see profile.js). A living one blinks now and then.
const props = defineProps({
  seed: { type: Number, default: 0 },
  alive: { type: Boolean, default: true }
})

const blinking = ref(false)
const lines = computed(() => faceLines(props.seed, blinking.value).join('\n'))

let timer = null
function nextBlink () {
  timer = setTimeout(() => {
    blinking.value = true
    timer = setTimeout(() => {
      blinking.value = false
      nextBlink()
    }, 160)
  }, 2200 + Math.random() * 4200)
}

onMounted(() => {
  if (props.alive && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) nextBlink()
})
onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <pre class="ascii-face" aria-hidden="true">{{ lines }}</pre>
</template>

<style scoped>
.ascii-face {
  margin: 0;
  font-family: inherit;
  line-height: 1.05;
  white-space: pre;
  animation: face-bob 3.6s ease-in-out infinite;
}

/* Breathing: a pixel up and down */
@keyframes face-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-1px); }
}

@media (prefers-reduced-motion: reduce) {
  .ascii-face {
    animation: none;
  }
}
</style>
