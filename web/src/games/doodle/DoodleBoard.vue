<script setup>
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { WIDTH, HEIGHT } from './sketch'

// The board on screen: the sketch scaled to fit, with a phosphor halo. When it's this player's
// turn it also turns mouse, pen and finger input into board coordinates for the game.
const props = defineProps({
  sketch: { type: Object, required: true },
  canDraw: { type: Boolean, default: false },
  tool: { type: String, default: 'pen' }, // pen | eraser | fill
  size: { type: Number, default: 10 }, // brush width on the board
  label: { type: String, default: '' }
})

const emit = defineEmits(['start', 'move', 'end', 'fill'])

const MIN_STEP = 2 // board pixels the pen has to move before the next point counts

const frame = ref(null)
const screen = ref(null)
const halo = ref(null)
const ring = reactive({ show: false, x: 0, y: 0, px: 0 })
let frameRequest = 0
let observer = null
let active = null // the pointer drawing right now
let last = null

function paint () {
  frameRequest = 0
  for (const canvas of [screen.value, halo.value]) {
    const ctx = canvas?.getContext('2d')
    if (!ctx) continue
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(props.sketch.canvas, 0, 0, canvas.width, canvas.height)
  }
}

const schedule = () => {
  if (!frameRequest) frameRequest = requestAnimationFrame(paint)
}

// Canvas pixels follow the frame's size; the halo only needs half of them, it gets blurred
function fit () {
  const box = frame.value?.getBoundingClientRect()
  if (!box?.width) return
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  screen.value.width = Math.round(box.width * dpr)
  screen.value.height = Math.round(box.height * dpr)
  halo.value.width = Math.round(box.width / 2)
  halo.value.height = Math.round(box.height / 2)
  paint()
}

const toBoard = (event) => {
  const box = screen.value.getBoundingClientRect()
  return [
    Math.min(WIDTH - 1, Math.max(0, Math.round(((event.clientX - box.left) / box.width) * WIDTH))),
    Math.min(HEIGHT - 1, Math.max(0, Math.round(((event.clientY - box.top) / box.height) * HEIGHT)))
  ]
}

// The square under the mouse shows how big the brush is
function moveRing (event) {
  if (!props.canDraw || props.tool === 'fill' || event.pointerType === 'touch') {
    ring.show = false
    return
  }
  const box = frame.value.getBoundingClientRect()
  ring.show = true
  ring.x = event.clientX - box.left
  ring.y = event.clientY - box.top
  ring.px = Math.max(4, (props.size * box.width) / WIDTH)
}

function onDown (event) {
  if (!props.canDraw || active !== null) return
  if (event.pointerType === 'mouse' && event.button !== 0) return
  event.preventDefault()
  const [x, y] = toBoard(event)
  if (props.tool === 'fill') {
    emit('fill', x, y)
    return
  }
  active = event.pointerId
  screen.value.setPointerCapture?.(event.pointerId)
  last = [x, y]
  emit('start', x, y)
}

function onMove (event) {
  moveRing(event)
  if (event.pointerId !== active) return
  const points = []
  // Fast strokes come in as several events per frame; take them all for a smooth line
  for (const sample of event.getCoalescedEvents?.() || [event]) {
    const [x, y] = toBoard(sample)
    if (Math.hypot(x - last[0], y - last[1]) < MIN_STEP) continue
    points.push(x, y)
    last = [x, y]
  }
  if (points.length) emit('move', points)
}

function onUp (event) {
  if (event.pointerId !== active) return
  active = null
  emit('end')
}

// Time running out mid-stroke ends the stroke
watch(() => props.canDraw, (can) => {
  if (!can && active !== null) {
    active = null
    emit('end')
  }
  if (!can) ring.show = false
})

onMounted(() => {
  props.sketch.onChange = schedule
  observer = new ResizeObserver(fit)
  observer.observe(frame.value)
  fit()
})

onUnmounted(() => {
  if (props.sketch.onChange === schedule) props.sketch.onChange = null
  observer?.disconnect()
  cancelAnimationFrame(frameRequest)
})
</script>

<template>
  <div ref="frame" class="board relative w-full aspect-[4/3] border border-term-low bg-black overflow-hidden select-none">
    <canvas
      ref="screen"
      :class="['absolute inset-0 w-full h-full', { 'is-drawing': canDraw, 'is-filling': canDraw && tool === 'fill' }]"
      role="img"
      :aria-label="label"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
      @lostpointercapture="onUp"
      @pointerleave="ring.show = false"
    ></canvas>
    <canvas ref="halo" class="halo absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true"></canvas>
    <div
      v-if="ring.show"
      class="absolute pointer-events-none border border-term"
      :style="{ left: `${ring.x - ring.px / 2}px`, top: `${ring.y - ring.px / 2}px`, width: `${ring.px}px`, height: `${ring.px}px` }"
      aria-hidden="true"
    ></div>
    <slot />
  </div>
</template>

<style scoped>
/* A blurred copy on top, added like light: the strokes glow like the rest of the screen */
.halo {
  filter: blur(4px);
  mix-blend-mode: screen;
  opacity: 0.7;
}
.is-drawing {
  cursor: none;
  touch-action: none;
}
.is-filling {
  cursor: crosshair;
}
</style>
