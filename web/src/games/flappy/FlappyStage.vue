<script setup>
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { COLS, ROWS, CELL_ASPECT, STEP, SPEED, BIRD_X, createCourse, createRun, flap, knockOut, stepRun, ghostAt, tiltFor } from './engine'
import { createRenderer, WING_CYCLE, DEAD_FRAME, GREEN, DIM, LOW } from './renderer'
import { sound } from './sound'

// The full-screen play area: a canvas as large as the screen allows, the game loop, input and
// sound. Solo runs take off on the first tap. Online runs take off together at `startAt` and
// show the other players as ghosts, from the live samples every player sends a few times a
// second; after a crash the view follows whoever is still flying.

const props = defineProps({
  t: { type: Object, required: true },
  title: { type: String, required: true },
  exitLabel: { type: String, required: true },
  mode: { type: String, default: 'solo' }, // solo | online
  seed: { type: Number, required: true },
  // A new run starts whenever this changes
  runId: { type: Number, required: true },
  paused: { type: Boolean, default: false },
  // Online only
  startAt: { type: Number, default: 0 }, // Date.now() time when everyone takes off
  runner: { type: Boolean, default: true }, // false: just watching this round
  out: { type: Boolean, default: false }, // the host counted this player out
  myId: { type: String, default: '' },
  round: { type: Number, default: 0 },
  runners: { type: Object, default: () => ({}) }, // id -> { alive, score }
  names: { type: Object, default: () => ({}) }, // id -> name
  live: { type: Object, default: null } // { samples: { id -> sample }, at }
})

const emit = defineEmits(['exit', 'tap', 'pause', 'state', 'crash', 'sample'])

const ASPECT = (COLS * CELL_ASPECT) / ROWS
const SAMPLE_MS = 100
const RESTING_SAMPLE_MS = 1000 // once the bird lies on the ground nothing changes
const GO_SECONDS = 0.8
const FLAP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW'])
const FEATHERS = ["'", ',', '`', '.', '*', '~', "'", '.']

const area = ref(null)
const canvas = ref(null)
const box = reactive({ w: 0, h: 0 })
const muted = ref(sound.muted)

const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let renderer = null
let observer = null
let raf = 0
let lastFrame = 0
let acc = 0
let alpha = 0
let savedOverflow = ''

let course = null
let run = null
let camera = 0
let ground = 0
const prev = { camera: 0, ground: 0, dist: 0, y: 0, tilt: 0 } // last step, for smooth drawing
let reported = ''
let crashed = false
let sampleClock = 0
let sampleSeq = 0
let lastCount = 0
let flash = 0
let shake = 0
let pop = 0
let goTimer = 0
let leader = null // { id, d } of the furthest bird still flying
const particles = []
const ghosts = new Map() // id -> smoothed position of another player's bird

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const upper = (text) => text.toLocaleUpperCase(props.t.langCode === 'TR' ? 'tr' : 'en')
const round2 = (value) => Math.round(value * 100) / 100

function newRun () {
  course = createCourse(props.seed)
  run = props.runner && !props.out ? createRun(course) : null
  camera = 0
  ground = 0
  Object.assign(prev, { camera: 0, ground: 0, dist: 0, y: run ? run.y : 0, tilt: 0 })
  reported = ''
  crashed = false
  sampleClock = SAMPLE_MS
  lastCount = 0
  flash = shake = pop = goTimer = 0
  particles.length = 0
  ghosts.clear()
  report()
}

function report () {
  const key = run ? `${run.phase}:${run.score}` : ''
  if (key === reported) return
  reported = key
  if (run) emit('state', { phase: run.phase, score: run.score })
}

// ---------- Input ----------

function takeOff () {
  if (!flap(run)) return
  if (props.mode === 'online') {
    sound.play('go')
    goTimer = GO_SECONDS
  } else {
    sound.play('flap')
  }
  puff()
  report()
}

function input () {
  sound.unlock()
  if (props.paused || !run) return emit('tap')
  if (run.phase === 'ready') {
    if (props.mode === 'solo') takeOff()
    return
  }
  if (run.phase === 'play') {
    if (flap(run)) {
      sound.play('flap')
      puff()
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
  } else if (event.code === 'KeyM' && !event.repeat) {
    toggleSound()
  }
}

function toggleSound () {
  sound.setMuted(!sound.muted)
  muted.value = sound.muted
  if (!muted.value) sound.unlock()
}

// Clicked buttons let go of focus, so Space goes back to flapping
function onSoundClick (event) {
  toggleSound()
  if (event.detail) event.currentTarget.blur()
}

// ---------- Simulation ----------

function onEvent (event) {
  if (event === 'score') {
    sound.play('score')
    pop = 1
  } else if (event === 'hit') {
    sound.play('hit')
    if (run.phase === 'dead') sound.play('fall')
    if (!reduceMotion) {
      flash = 1
      shake = 1
    }
    feathers()
    crash()
  }
  report()
}

function crash () {
  if (crashed) return
  crashed = true
  emit('crash', { score: run.score, dist: round2(run.dist) })
  sampleClock = SAMPLE_MS // let the others know right away
}

// Online: everyone takes off together when the countdown runs out
function countdown () {
  if (!run || run.phase !== 'ready') return
  const msLeft = props.startAt - Date.now()
  if (msLeft <= 0) {
    takeOff()
    return
  }
  const count = Math.ceil(msLeft / 1000)
  if (count !== lastCount && count <= 3) sound.play('tick')
  lastCount = count
}

function followLeader () {
  if (!leader || leader.d <= camera) return
  const behind = leader.d - camera
  camera += Math.min(behind, Math.max(SPEED, behind * 3) * STEP)
}

function tick () {
  prev.camera = camera
  prev.ground = ground
  if (run) {
    prev.dist = run.dist
    prev.y = run.y
    prev.tilt = run.tilt
    for (const event of stepRun(run, STEP)) onEvent(event)
  }
  if (run && run.phase === 'play') camera = run.dist
  else if (props.mode === 'online' && (!run || run.phase === 'dead' || run.phase === 'over')) followLeader()
  // The ground keeps moving while waiting to take off, then moves with the view
  const waiting = run ? run.phase === 'ready' : Date.now() < props.startAt
  ground += waiting ? SPEED * STEP : camera - prev.camera
}

// Other players' birds, eased toward where their last sample says they are now
function updateGhosts (dt) {
  leader = null
  const samples = props.live?.samples || {}
  const age = (Date.now() - (props.live?.at || 0)) / 1000
  const ease = 1 - Math.exp(-dt * 16)
  const seen = new Set()
  for (const id in samples) {
    const sample = samples[id]
    const info = props.runners[id]
    if (id === props.myId || !info || !sample || sample.r !== props.round) continue
    const estimate = ghostAt(sample, age, info.alive !== false)
    let ghost = ghosts.get(id)
    if (!ghost) {
      ghost = { y: estimate.y, d: estimate.d, tilt: 0 }
      ghosts.set(id, ghost)
    }
    ghost.y += (estimate.y - ghost.y) * ease
    ghost.d += (estimate.d - ghost.d) * Math.min(1, ease * 2)
    ghost.tilt += (tiltFor(estimate.vy, estimate.down) - ghost.tilt) * ease
    ghost.down = estimate.down
    seen.add(id)
    if (!estimate.down && sample.p === 1 && (!leader || ghost.d > leader.d)) leader = { id, d: ghost.d, score: sample.s }
  }
  for (const id of ghosts.keys()) {
    if (!seen.has(id)) ghosts.delete(id)
  }
}

function sendSample (dt) {
  if (props.mode !== 'online' || !run) return
  sampleClock += dt * 1000
  if (sampleClock < (run.phase === 'over' ? RESTING_SAMPLE_MS : SAMPLE_MS)) return
  sampleClock = 0
  emit('sample', {
    r: props.round,
    p: run.phase === 'ready' ? 0 : run.phase === 'play' ? 1 : 2,
    y: round2(run.y),
    v: round2(run.vy),
    d: round2(run.dist),
    s: run.score,
    q: ++sampleSeq
  })
}

// ---------- Effects ----------

function puff () {
  if (reduceMotion || !run) return
  particles.push(
    { ch: '-', x: BIRD_X - 3.4, y: run.y + 0.3, vx: -SPEED * 0.6, vy: 4, gravity: 0, life: 0.3, ttl: 0.3, color: LOW },
    { ch: '=', x: BIRD_X - 3, y: run.y + 0.8, vx: -SPEED * 0.5, vy: 6, gravity: 0, life: 0.25, ttl: 0.3, color: LOW }
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
  goTimer = Math.max(0, goTimer - dt)
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.life -= dt
    if (p.life <= 0) {
      particles.splice(i, 1)
      continue
    }
    p.vy += p.gravity * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
  }
}

// ---------- Drawing ----------

function hudEntries () {
  const samples = props.live?.samples || {}
  return Object.entries(props.runners).map(([id, info]) => {
    const name = props.names[id] || '?'
    if (id === props.myId && run) {
      return { name, score: run.score, alive: run.phase === 'ready' || run.phase === 'play', me: true }
    }
    const sample = samples[id]?.r === props.round ? samples[id] : null
    return {
      name,
      score: Math.max(info.score || 0, sample?.s || 0),
      alive: info.alive !== false && !(sample && sample.p === 2),
      me: id === props.myId
    }
  }).sort((a, b) => b.score - a.score || Number(b.alive) - Number(a.alive))
}

function lastBirdFlying () {
  const others = Object.keys(props.runners).filter(id => id !== props.myId)
  return others.length > 0 && others.every(id => props.runners[id].alive === false || ghosts.get(id)?.down)
}

function onlineScene (scene, cam) {
  const wing = WING_CYCLE[Math.floor(performance.now() / 110) % 4]
  for (const [id, ghost] of ghosts) {
    scene.ghosts.push({ x: BIRD_X + ghost.d - cam, y: ghost.y, tilt: ghost.tilt, frame: ghost.down ? DEAD_FRAME : wing, name: props.names[id] || '' })
  }
  scene.hud = hudEntries()

  const now = Date.now()
  const started = run ? run.phase !== 'ready' : now >= props.startAt
  if (!started) {
    scene.texts.push({ text: upper(props.t.flappyGetReady), y: 14, size: 5, display: true })
    scene.texts.push({ text: String(Math.max(1, Math.ceil((props.startAt - now) / 1000))), y: 29, size: 15, display: true })
  }
  if (goTimer > 0) {
    scene.texts.push({ text: upper(props.t.flappyGo), y: 29, size: 11, display: true, alpha: Math.min(1, goTimer / 0.3) })
  }
  if (run?.phase === 'play' && lastBirdFlying()) {
    scene.texts.push({ text: upper(props.t.flappyLastBird), y: 12, size: 2.6, display: true })
  }
  if (started && (!run || run.phase === 'dead' || run.phase === 'over')) {
    // While watching, the big number is the score of the bird being followed
    scene.score = leader ? leader.score : run ? run.score : null
    const head = run ? fmt(props.t.flappyCrashed, { score: run.score }) : props.t.flappyNextRound
    scene.texts.push({ text: upper(head), y: 45.5, size: 3.4, display: true })
    if (leader) {
      scene.texts.push({ text: upper(fmt(props.t.flappyWatching, { name: props.names[leader.id] || '' })), y: 49, size: 1.15, color: DIM })
    }
  }
}

function render () {
  if (!renderer) return
  const lerp = (from, to) => from + (to - from) * alpha
  const cam = lerp(prev.camera, camera)
  const scene = {
    course,
    camera: cam,
    ground: lerp(prev.ground, ground),
    bird: null,
    ghosts: [],
    particles,
    score: null,
    pop,
    hud: null,
    texts: [],
    flash,
    shake
  }
  if (run) {
    const down = run.phase === 'dead' || run.phase === 'over'
    const wingRate = run.time - run.flapAt < 0.3 ? 20 : 9 // beats faster right after a flap
    scene.bird = {
      x: BIRD_X + lerp(prev.dist, run.dist) - cam,
      y: lerp(prev.y, run.y),
      tilt: lerp(prev.tilt, run.tilt),
      frame: down ? DEAD_FRAME : WING_CYCLE[Math.floor(run.time * wingRate) % 4]
    }
    if (run.phase !== 'ready') scene.score = run.score
  }
  if (props.mode === 'online') {
    onlineScene(scene, cam)
  } else if (run?.phase === 'ready') {
    scene.texts.push({ text: upper(props.t.flappyGetReady), y: 14, size: 6, display: true })
    if (Math.floor(performance.now() / 500) % 2 === 0) {
      scene.texts.push({ text: `> ${upper(props.t.flappyTapToFlap)} <`, y: 37.5, size: 1.5 })
    }
    scene.texts.push({ text: upper(props.t.flappyKeysHint), y: 40.5, size: 1.05, color: DIM })
  }
  renderer.draw(scene)
}

// ---------- Loop ----------

function frame (now) {
  raf = requestAnimationFrame(frame)
  // Long gaps (a hidden tab) are cut short instead of fast-forwarding the game
  const dt = Math.min(0.1, Math.max(0, (now - lastFrame) / 1000))
  lastFrame = now
  if (!props.paused) {
    if (props.mode === 'online') {
      countdown()
      updateGhosts(dt)
    }
    acc += dt
    while (acc >= STEP) {
      tick()
      acc -= STEP
    }
    alpha = acc / STEP
    effects(dt)
    sendSample(dt)
  }
  render()
}

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

// The sprites are drawn with the page fonts, so draw them again once a font has loaded
const onFontsLoaded = () => renderer?.rebuild()

watch(() => props.runId, newRun)

watch(() => props.out, (out) => {
  if (!out || !run || !knockOut(run)) return
  sound.play('hit')
  feathers()
  crash()
  report()
})

onMounted(() => {
  renderer = createRenderer(canvas.value)
  observer = new ResizeObserver(fit)
  observer.observe(area.value)
  fit()
  Promise.all(['600 16px "JetBrains Mono"', '700 16px "JetBrains Mono"', '16px "VT323"'].map(font => document.fonts?.load(font))).then(onFontsLoaded, () => {})
  document.fonts?.addEventListener?.('loadingdone', onFontsLoaded)
  window.addEventListener('keydown', onKey)
  savedOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  document.activeElement?.blur?.()
  newRun()
  lastFrame = performance.now()
  raf = requestAnimationFrame(frame)
  // Development builds expose the run, for scripted play-testing
  if (import.meta.env.DEV) window.__flappy = { get run () { return run }, get camera () { return camera } }
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  observer?.disconnect()
  document.fonts?.removeEventListener?.('loadingdone', onFontsLoaded)
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = savedOverflow
  if (import.meta.env.DEV) delete window.__flappy
})
</script>

<template>
  <div
    class="arena fixed inset-0 z-40 flex flex-col bg-black select-none"
    @pointerdown="onPointer"
    @pointerup="sound.unlock()"
    @contextmenu.prevent
  >
    <header class="shrink-0 flex items-center gap-2 h-12 px-2 sm:px-4 border-b border-term-low">
      <button type="button" class="term-link shrink-0" @click="emit('exit')">
        <span aria-hidden="true">[&lt;]</span>
        <span>{{ exitLabel }}</span>
      </button>
      <h1 class="flex-1 min-w-0 truncate text-center font-display text-2xl leading-none uppercase">[ {{ title }} ]</h1>
      <slot name="actions" />
      <button
        type="button"
        class="term-icon-btn shrink-0 h-9 text-xs"
        :aria-label="t.flappySound"
        :aria-pressed="!muted"
        @click="onSoundClick"
      >
        {{ muted ? 'SND:OFF' : 'SND:ON' }}
      </button>
    </header>

    <div ref="area" class="flex-1 min-h-0 flex items-center justify-center p-2 sm:p-4 touch-none">
      <div class="stage relative" :style="{ width: `${box.w}px`, height: `${box.h}px` }">
        <canvas ref="canvas" class="block" role="img" :aria-label="title"></canvas>
        <slot name="overlay" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.arena {
  -webkit-touch-callout: none;
}

.stage {
  box-shadow: 0 0 0 1px var(--color-term-low), 0 0 18px rgb(0 255 0 / 0.15);
}
</style>
