<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { createRenderer, VIEW_W, VIEW_H } from './renderer'
import { formationSpot, attackDir } from './engine'
import { watchFonts } from '../ascii/paint'

// A small picture of the court and kits being picked: three a side lined up for a kick-off,
// with the boards' message scrolling. It's drawn by the match's own renderer.
const props = defineProps({
  court: { type: String, required: true },
  kits: { type: Array, required: true },
  labels: { type: Array, required: true }, // the teams' names, [home, away]
  label: { type: String, default: '' }
})

const box = ref(null)
const canvas = ref(null)
let renderer = null
let observer = null
let stopFonts = null
let frame = 0
let fitted = 0 // the width last drawn at

const players = []
for (const team of [0, 1]) {
  for (let slot = 0; slot < 3; slot++) {
    const [x, y] = formationSpot(3, slot)
    players.push({ x: x * attackDir(team), y, team, mark: String(slot + 1 + team * 3), look: 'mate', facing: team === 0 ? 0 : Math.PI })
  }
}

const labelsOf = () => [`(#) ${props.labels[0].toUpperCase()}`, `${props.labels[1].toUpperCase()} ( )`]

function draw (now) {
  renderer.draw({
    ball: { x: 0, y: 0 },
    trail: [],
    players,
    zone: null,
    countdown: null,
    rings: [],
    net: null,
    board: { text: `***  FUTSAL  ***  ${props.labels[0].toUpperCase()} 0 : 0 ${props.labels[1].toUpperCase()}  ` },
    particles: [],
    texts: [],
    flash: 0,
    shake: 0,
    time: now / 1000
  })
  frame = requestAnimationFrame(draw)
}

// Only a new width needs a new picture: the height follows from it
function fit () {
  const w = box.value?.clientWidth || 0
  if (!w || w === fitted) return
  fitted = w
  renderer.resize(w, Math.round((w * VIEW_H) / VIEW_W), Math.min(window.devicePixelRatio || 1, 2), 0)
}

watch(() => [props.court, ...props.kits], () => renderer?.setLook({ court: props.court, kits: props.kits }))
watch(() => props.labels.join(), () => renderer?.setLabels(labelsOf()))

onMounted(() => {
  renderer = createRenderer(canvas.value)
  renderer.setLook({ court: props.court, kits: props.kits })
  renderer.setLabels(labelsOf())
  observer = new ResizeObserver(fit)
  observer.observe(box.value)
  fit()
  stopFonts = watchFonts(() => renderer?.rebuild())
  frame = requestAnimationFrame(draw)
})

onUnmounted(() => {
  cancelAnimationFrame(frame)
  observer?.disconnect()
  stopFonts?.()
})
</script>

<template>
  <div ref="box" class="w-full overflow-hidden">
    <canvas ref="canvas" class="block" role="img" :aria-label="label"></canvas>
  </div>
</template>
