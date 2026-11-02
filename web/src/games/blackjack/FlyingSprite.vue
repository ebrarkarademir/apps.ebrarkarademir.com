<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// Something from the bar on its way across the table: from the bar (or whoever sent it) up in an
// arc and down at the seat it's for. `from` and `to` are points in the stage, in px.
const props = defineProps({
  src: { type: String, required: true },
  from: { type: Object, required: true },
  to: { type: Object, required: true }
})

const emit = defineEmits(['done'])

const el = ref(null)
let animation = null
let timer = null
let landed = false

function land () {
  if (landed) return
  landed = true
  emit('done')
}

onMounted(() => {
  const dx = props.to.x - props.from.x
  const dy = props.to.y - props.from.y
  const lift = Math.min(140, 50 + Math.abs(dx) * 0.25)
  if (!el.value?.animate) {
    land()
    return
  }
  animation = el.value.animate([
    { transform: 'translate(-50%, -50%) scale(0.5) rotate(-20deg)', opacity: 0 },
    { transform: `translate(-50%, -50%) translate(${dx * 0.15}px, ${dy * 0.15 - lift * 0.5}px) scale(1.3) rotate(-8deg)`, opacity: 1, offset: 0.15 },
    { transform: `translate(-50%, -50%) translate(${dx * 0.55}px, ${dy * 0.55 - lift}px) scale(1.5) rotate(6deg)`, opacity: 1, offset: 0.55 },
    { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(1) rotate(0deg)`, opacity: 1 }
  ], { duration: 950, easing: 'cubic-bezier(0.35, 0.1, 0.35, 1)', fill: 'forwards' })
  animation.onfinish = land
  // In a tab in the background the animation may never run: it lands anyway
  timer = setTimeout(land, 1600)
})

onUnmounted(() => {
  animation?.cancel()
  clearTimeout(timer)
})
</script>

<template>
  <img ref="el" class="flying" :src="src" alt="" draggable="false" :style="{ left: `${from.x}px`, top: `${from.y}px` }" />
</template>

<style scoped>
.flying {
  position: absolute;
  z-index: 25;
  width: 36px;
  max-width: none;
  height: 36px;
  image-rendering: pixelated;
  pointer-events: none;
  filter: drop-shadow(0 4px 0 rgb(0 0 0 / 0.35));
  opacity: 0;
}
</style>
