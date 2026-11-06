<script setup>
import { computed } from 'vue'
import { toSvgRects } from '../pixel/kit'

// A pixel picture (a grid from pixel/kit.js) as an SVG, so it stays sharp at any size
const props = defineProps({
  art: { type: Object, required: true }
})

const rects = computed(() => toSvgRects(props.art))
</script>

<template>
  <svg
    :viewBox="`0 0 ${art.w} ${art.h}`"
    shape-rendering="crispEdges"
    aria-hidden="true"
    class="pixel-art"
  >
    <rect v-for="(r, i) in rects" :key="i" :x="r.x" :y="r.y" :width="r.w" height="1" :fill="r.fill" />
  </svg>
</template>

<style scoped>
.pixel-art {
  display: block;
  overflow: visible;
}
</style>
