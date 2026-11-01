<script setup>
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { COLS, ROWS, CELL_ASPECT, STEP, BIRD_X, LEVELS, createCourse, createRun, flap, stepRun, speedAt, levelAt } from './engine'
import { createRenderer, WING_CYCLE, DEAD_FRAME } from './renderer'
import ArcadeStage from '../ascii/ArcadeStage.vue'
import { GREEN, DIM, LOW, watchFonts } from '../ascii/paint'
import { startLoop } from '../ascii/loop'
import { stepParticles } from '../ascii/physics'
import { sound } from '../ascii/sound'
import { haptics } from '../ascii/haptics'

// The full-screen play area: a canvas as large as the screen allows, the game loop, input and
// sound. A run takes off on the first tap and gets harder the further it goes: each new level
// is announced over the pipes, and the level number stays small under the score.

const props = defineProps({
  t: { type: Object, required: true },
  title: { type: String, required: true },
  exitLabel: { type: String, required: true },
  seed: { type: Number, required: true },
  // A new run starts whenever this changes
  runId: { type: Number, required: true },
  paused: { type: Boolean, default: false }
})

const emit = defineEmits(['exit', 'tap', 'pause', 'state'])

const ASPECT = (COLS * CELL_ASPECT) / ROWS
const LEVEL_UP_SECONDS = 1.8
const FLAP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW'])
const FEATHERS = ["'", ',', '`', '.', '*', '~', "'", '.']
// What each level brings, from level 2: the first with sliding gaps says so, the rest go faster
const LEVEL_NEWS = LEVELS.map((stage, i) => (i === 0 ? '' : stage.moving && !LEVELS[i - 1].moving ? 'flappySliding' : 'flappyFaster'))

const area = ref(null)
const canvas = ref(null)
const box = reactive({ w: 0, h: 0 })

const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let renderer = null
let observer = null
let stopLoop = null
let stopFonts = null
let alpha = 0

let course = null
let run = null
let camera = 0
let ground = 0
const prev = { camera: 0, ground: 0, dist: 0, y: 0, tilt: 0 } // last step, for smooth drawing
let reported = ''
let level = 1
let levelUp = 0 // seconds left of the new level's banner
let flash = 0
let shake = 0
let pop = 0
const particles = []

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const upper = (text) => text.toLocaleUpperCase(props.t.langCode.toLowerCase())

function newRun () {
  course = createCourse(props.seed)
  run = createRun(course)
  camera = 0
  ground = 0
  Object.assign(prev, { camera: 0, ground: 0, dist: 0, y: run.y, tilt: 0 })
  reported = ''
  level = 1
  levelUp = flash = shake = pop = 0
  particles.length = 0
  report()
}

function report () {
  const key = `${run.phase}:${run.score}`
  if (key === reported) return
  reported = key
  emit('state', { phase: run.phase, score: run.score, level })
}

// ---------- Input ----------

function input () {
  sound.unlock()
  if (props.paused || !run) return emit('tap')
  if (run.phase === 'ready' || run.phase === 'play') {
    if (flap(run)) {
      sound.play('flap')
      puff()
      report()
    }
    return
  }
  emit('tap')
}

function onPointer (event) {
  if (event.button > 0 || event.target.closest('button, a, input, header')) return
  event.preventDefault()
  input()
}

function onKey (event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (FLAP_KEYS.has(event.code)) {
    // A focused button keeps Space for itself
    if (event.code === 'Space' && event.target.closest?.('button, a, input')) return
    event.preventDefault()
    if (!event.repeat) input()
  } else if ((event.code === 'KeyP' || event.code === 'Escape') && !event.repeat) {
    emit('pause')
  }
}

// ---------- Simulation ----------

function onEvent (event) {
  if (event === 'score') {
    sound.play('score')
    pop = 1
    const now = levelAt(run.score)
    if (now > level) {
      level = now
      levelUp = LEVEL_UP_SECONDS
      sound.play('go')
      haptics.buzz('tap')
    }
  } else if (event === 'hit') {
    sound.play('hit')
    haptics.buzz('crash')
    if (run.phase === 'dead') sound.play('fall')
    if (!reduceMotion) {
      flash = 1
      shake = 1
    }
    feathers()
  }
  report()
}

function tick () {
  prev.camera = camera
  prev.ground = ground
  prev.dist = run.dist
  prev.y = run.y
  prev.tilt = run.tilt
  for (const event of stepRun(run, STEP)) onEvent(event)
  if (run.phase === 'play') camera = run.dist
  // The ground keeps moving while waiting to take off, then moves with the view
  ground += run.phase === 'ready' ? speedAt(0) * STEP : camera - prev.camera
}

// ---------- Effects ----------

function puff () {
  if (reduceMotion || !run) return
  particles.push(
    { ch: '-', x: BIRD_X - 3.4, y: run.y + 0.3, vx: -run.speed * 0.6, vy: 4, gravity: 0, life: 0.3, ttl: 0.3, color: LOW },
    { ch: '=', x: BIRD_X - 3, y: run.y + 0.8, vx: -run.speed * 0.5, vy: 6, gravity: 0, life: 0.25, ttl: 0.3, color: LOW }
  )
}

function feathers () {
  if (reduceMotion || !run) return
  const x = BIRD_X + run.dist - camera
  FEATHERS.forEach((ch, i) => particles.push({
    ch,
    x,
    y: run.y,
    vx: (Math.random() * 2 - 1) * 14,
    vy: -6 - Math.random() * 18,
    gravity: 45,
    life: 0.7 + Math.random() * 0.4,
    ttl: 1.1,
    color: i % 2 ? GREEN : DIM
  }))
}

function effects (dt) {
  flash = Math.max(0, flash - dt * 4)
  shake = Math.max(0, shake - dt * 3.5)
  pop = Math.max(0, pop - dt * 6)
  levelUp = Math.max(0, levelUp - dt)
  stepParticles(particles, dt)
}

// ---------- Drawing ----------

function render () {
  if (!renderer || !run) return
  const lerp = (from, to) => from + (to - from) * alpha
  const cam = lerp(prev.camera, camera)
  const down = run.phase === 'dead' || run.phase === 'over'
  const wingRate = run.time - run.flapAt < 0.3 ? 20 : 9 // beats faster right after a flap
  const scene = {
    course,
    camera: cam,
    ground: lerp(prev.ground, ground),
    bird: {
      x: BIRD_X + lerp(prev.dist, run.dist) - cam,
      y: lerp(prev.y, run.y),
      tilt: lerp(prev.tilt, run.tilt),
      frame: down ? DEAD_FRAME : WING_CYCLE[Math.floor(run.time * wingRate) % 4]
    },
    particles,
    score: run.phase === 'ready' ? null : run.score,
    pop,
    texts: [],
    flash,
    shake
  }
  const levelText = upper(fmt(props.t.flappyLevelN, { n: level }))
  if (run.phase === 'ready') {
    scene.texts.push({ text: upper(props.t.flappyGetReady), y: 14, size: 6, display: true })
    scene.texts.push({ text: `[ ${levelText} ]`, y: 19.5, size: 1.3, color: DIM })
    if (Math.floor(performance.now() / 500) % 2 === 0) {
      scene.texts.push({ text: `> ${upper(props.t.flappyTapToFlap)} <`, y: 37.5, size: 1.5 })
    }
    scene.texts.push({ text: upper(props.t.flappyKeysHint), y: 40.5, size: 1.05, color: DIM })
  } else {
    scene.texts.push({ text: levelText, y: 11, size: 1.15, color: DIM })
  }
  if (levelUp > 0 && !down) {
    const fade = Math.min(1, levelUp / 0.3)
    scene.texts.push({ text: levelText, y: 21, size: 5, display: true, alpha: fade })
    const news = LEVEL_NEWS[level - 1]
    if (news) scene.texts.push({ text: upper(props.t[news]), y: 25.5, size: 1.4, alpha: fade })
  }
  renderer.draw(scene)
}

// ---------- Loop ----------

// The play area keeps the view's shape and fills as much of the screen as it can
function fit () {
  const el = area.value
  if (!el || !renderer) return
  const style = getComputedStyle(el)
  const w = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
  const h = el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
  box.h = Math.floor(Math.max(0, Math.min(h, w / ASPECT)))
  box.w = Math.floor(box.h * ASPECT)
  renderer.resize(box.w, box.h, Math.min(window.devicePixelRatio || 1, 3))
}

watch(() => props.runId, newRun)

onMounted(() => {
  renderer = createRenderer(canvas.value)
  observer = new ResizeObserver(fit)
  observer.observe(area.value)
  fit()
  // The sprites are drawn with the page fonts, so draw them again once a font has loaded
  stopFonts = watchFonts(() => renderer?.rebuild())
  window.addEventListener('keydown', onKey)
  newRun()
  stopLoop = startLoop({
    step: STEP,
    paused: () => props.paused,
    tick,
    after: effects,
    draw: (value) => {
      alpha = value
      render()
    }
  })
  // Development builds expose the run, for scripted play-testing
  if (import.meta.env.DEV) window.__flappy = { get run () { return run }, get camera () { return camera }, get level () { return level } }
})

onUnmounted(() => {
  stopLoop?.()
  observer?.disconnect()
  stopFonts?.()
  window.removeEventListener('keydown', onKey)
  if (import.meta.env.DEV) delete window.__flappy
})
</script>

<template>
  <ArcadeStage
    :t="t"
    :title="title"
    :exitLabel="exitLabel"
    @exit="emit('exit')"
    @pointerdown="onPointer"
    @pointerup="sound.unlock()"
    @contextmenu.prevent
  >
    <template #actions>
      <slot name="actions" />
    </template>

    <div ref="area" class="flex-1 min-h-0 flex items-center justify-center p-2 sm:p-4 touch-none">
      <div class="stage relative" :style="{ width: `${box.w}px`, height: `${box.h}px` }">
        <canvas ref="canvas" class="block" role="img" :aria-label="title"></canvas>
        <slot name="overlay" />
      </div>
    </div>
  </ArcadeStage>
</template>

<style scoped>
.stage {
  box-shadow: 0 0 0 1px var(--color-term-low), 0 0 18px rgb(0 255 0 / 0.15);
}
</style>
