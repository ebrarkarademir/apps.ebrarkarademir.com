<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import ArcadeStage from '../ascii/ArcadeStage.vue'
import { GREEN, DIM, watchFonts } from '../ascii/paint'
import { startLoop } from '../ascii/loop'
import { stepParticles } from '../ascii/physics'
import { sparks } from '../ascii/fx'
import { sound } from '../ascii/sound'
import { haptics } from '../ascii/haptics'
import { createTerrain, W } from './terrain'
import { STEP, SAMPLE, MAX_WALK, WALK_SPEED, WEAPON_IDS, WEAPONS, KINDS, launch, previewArc } from './physics'
import { createRenderer, SIDE_COLORS } from './renderer'

// The full-screen match. In the aiming part of a turn this player picks a unit, walks it,
// aims by dragging (pull back, like a slingshot) and fires; the shot goes to the host, which
// plays the turn out once both have fired or the clock runs out. Then everyone plays back the
// host's recording: shots flying, craters opening, units thrown about.

const props = defineProps({
  t: { type: Object, required: true },
  title: { type: String, required: true },
  exitLabel: { type: String, required: true },
  phase: { type: String, required: true }, // aim | resolve | over
  turn: { type: Number, required: true },
  seed: { type: Number, required: true },
  level: { type: String, required: true }, // the kind of map; with the seed it makes the ground
  craters: { type: Array, required: true }, // [x, y, r] in the order they happened
  units: { type: Array, required: true }, // [{ side, x, y, hp, alive }]
  mySide: { type: Number, default: -1 }, // 0 or 1, or -1 watching
  names: { type: Array, required: true },
  wind: { type: Number, default: 0 }, // -1 to 1
  water: { type: Number, required: true },
  sudden: { type: Boolean, default: false }, // the sea rises every turn now
  deadline: { type: Number, default: 0 },
  locked: { type: Array, default: () => [false, false] }, // by side: has fired this turn
  replay: { type: Object, default: null }, // { turn, before, frames, events, duration }
  live: { type: Object, required: true }, // { samples: { side: { turn, u, x, y } } }, the other player walking
  ammo: { type: Array, default: () => [{}, {}] } // by side: what's left of each limited weapon
})

const emit = defineEmits(['exit', 'fire', 'walk'])

const AIM_DRAG = 0.42 // a pull this share of the shorter screen side is full power
const LIVE_EVERY = 0.1

const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const WEAPON_KEYS = { shell: 'craterShell', grenade: 'craterGrenade', cluster: 'craterCluster', molotov: 'craterMolotov', dynamite: 'craterDynamite' }
const WEAPON_ICONS = { shell: 'o', grenade: '@', cluster: '*', molotov: '!', dynamite: '|' }
const LEVEL_KEYS = { hills: 'craterHills', mountain: 'craterMountain', valley: 'craterValley', islands: 'craterIslands', plateaus: 'craterPlateaus', canyon: 'craterCanyon', caverns: 'craterCaverns', sky: 'craterSky', city: 'craterCity', cheese: 'craterCheese' }
const FIRE_COLORS = ['#ffe680', '#ffb000', '#ff6a2a']
const SMOKE = '#7f8f7f'

const arena = ref(null)
const canvas = ref(null)
const ui = reactive({
  selected: -1, // index into units
  angle: Math.PI / 4,
  power: 0.6,
  weapon: 'shell',
  fired: false,
  seconds: 0,
  walked: 0
})

let renderer = null
let observer = null
let stopLoop = null
let stopFonts = null

// ---------- The ground on screen ----------
// Built from the seed, then every crater so far; during a replay, its craters open as they
// happen

let display = null
let applied = 0

function rebuild (count) {
  display = createTerrain(props.seed, props.level)
  applied = 0
  applyCraters(count)
}

function applyCraters (count) {
  if (count < applied) {
    rebuild(count)
    return
  }
  for (; applied < count && applied < props.craters.length; applied++) {
    const [x, y, r] = props.craters[applied]
    display.carve(x, y, r)
  }
}

// ---------- This player's unit ----------

const playing = computed(() => props.mySide >= 0)
const mine = computed(() => props.units.map((u, i) => (u.side === props.mySide && u.alive ? i : -1)).filter(i => i >= 0))
const canAct = () => playing.value && props.phase === 'aim' && !ui.fired && !props.locked[props.mySide] && Date.now() < props.deadline

const walk = { x: 0, y: 0, startX: 0, dir: 0 } // the selected unit's spot this turn
let liveClock = 0

function selectUnit (index) {
  if (!mine.value.includes(index)) return
  ui.selected = index
  const u = props.units[index]
  Object.assign(walk, { x: u.x, y: u.y, startX: u.x })
  ui.walked = 0
}

function newTurn () {
  ui.fired = false
  if (!playing.value) return
  if (!mine.value.includes(ui.selected)) ui.selected = mine.value[0] ?? -1
  if (ui.selected >= 0) selectUnit(ui.selected)
  // Face the other side to start with
  const facingRight = props.mySide === 0
  const elevation = Math.cos(ui.angle) >= 0 ? ui.angle : Math.PI - ui.angle
  ui.angle = facingRight ? elevation : Math.PI - elevation
}

function nextUnit () {
  if (!canAct() || mine.value.length < 2) return
  const at = mine.value.indexOf(ui.selected)
  selectUnit(mine.value[(at + 1) % mine.value.length])
  sound.play('tock')
}

function face (right) {
  const isRight = Math.cos(ui.angle) >= 0
  if (isRight !== right) ui.angle = Math.PI - ui.angle
}

function stepWalk (dt) {
  if (!walk.dir || !canAct() || ui.selected < 0) return
  face(walk.dir > 0)
  const nx = walk.x + walk.dir * WALK_SPEED * dt
  if (Math.abs(nx - walk.startX) > MAX_WALK) return
  const y = display.stepTo(nx, walk.y, props.water)
  if (y === null) return
  walk.x = nx
  walk.y = y
  walkingUntil = clock + 0.12
  ui.walked = Math.abs(walk.x - walk.startX)
}

function fire () {
  if (!canAct() || ui.selected < 0) return
  if (left(ui.weapon) <= 0) ui.weapon = 'shell'
  ui.fired = true
  walk.dir = 0
  sound.play('fire')
  haptics.buzz('tap')
  emit('fire', { unit: ui.selected, x: Math.round(walk.x * 100) / 100, y: walk.y, angle: ui.angle, power: ui.power, weapon: ui.weapon, turn: props.turn })
}

// What's left of a weapon for this player: Infinity for the shell
const left = (id) => (WEAPONS[id].ammo ? props.ammo[props.mySide]?.[id] ?? 0 : Infinity)

function pickWeapon (id) {
  if (left(id) <= 0) return
  ui.weapon = id
  sound.play('tock')
}

// ---------- Playback ----------

let play = null // { replay, time, next (event index), frame }
let shotsShown = []
let particles = []
let texts = []
let flash = 0
let shake = 0
let clock = 0
let cam = { x: 0, manualUntil: 0 }
const flashUntil = {} // unit -> clock time its hit flash ends
let walkingUntil = 0

function startReplay (replay) {
  // The ground as it was when the turn began
  if (applied !== replay.before) rebuild(replay.before)
  play = { replay, time: 0, next: 0 }
}

function endReplay () {
  play = null
  shotsShown = []
  applyCraters(props.craters.length)
}

function unitAt (frame, i) {
  return { x: frame.u[i * 2], y: frame.u[i * 2 + 1] }
}

function frameAt (time) {
  const frames = play.replay.frames
  const f = Math.min(frames.length - 1, time / (STEP * SAMPLE))
  const i = Math.floor(f)
  const a = frames[i]
  const b = frames[Math.min(frames.length - 1, i + 1)]
  const k = f - i
  const units = a.u.map((v, j) => v + ((b.u[j] ?? v) - v) * k)
  const shots = []
  for (let j = 0; j < a.p.length; j += 5) {
    const id = a.p[j]
    let bx = a.p[j + 1]
    let by = a.p[j + 2]
    for (let m = 0; m < b.p.length; m += 5) {
      if (b.p[m] === id) {
        bx = b.p[m + 1]
        by = b.p[m + 2]
        break
      }
    }
    shots.push({ x: a.p[j + 1] + (bx - a.p[j + 1]) * k, y: a.p[j + 2] + (by - a.p[j + 2]) * k, kind: a.p[j + 3], side: a.p[j + 4] })
  }
  return { u: units, shots }
}

function rise (text, x, y, color, size = 1.8) {
  texts.push({ text, x, y, vy: -6, size, color, life: 1.3, ttl: 1.3, display: true, min: 14 })
}

function happen (event, frame) {
  if (event.k === 'fire') {
    const u = unitAt(frame, event.u)
    sound.play('fire')
    if (!reduceMotion) sparks(particles, u.x, u.y - 1.5, { count: 6, speed: 10, life: 0.3 })
  } else if (event.k === 'boom') {
    const removed = display.carve(event.x, event.y, event.r)
    applied++
    sound.play('boom')
    haptics.buzz('boom')
    if (reduceMotion) return
    flash = Math.max(flash, 0.5 + event.r * 0.06)
    shake = Math.max(shake, 0.2 + event.r * 0.07)
    sparks(particles, event.x, event.y, { count: 10 + event.r * 2, speed: 18, life: 0.5 })
    // A fireball, then smoke rising from it
    for (let k = 0; k < 8 + event.r * 3; k++) {
      const a = Math.random() * Math.PI * 2
      const v = Math.random() * event.r * 3.5
      particles.push({ ch: ['@', '#', '*', 'O'][k % 4], x: event.x, y: event.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, drag: 3, life: 0.35 + Math.random() * 0.35, ttl: 0.7, color: FIRE_COLORS[k % 3], size: 1.4 + event.r * 0.12 })
    }
    for (let k = 0; k < 4 + event.r; k++) {
      particles.push({ ch: ['o', 'O', '(', ')'][k % 4], x: event.x + (Math.random() * 2 - 1) * event.r * 0.6, y: event.y - Math.random() * event.r * 0.5, vx: (Math.random() * 2 - 1) * 2, vy: -3 - Math.random() * 3, life: 1.2 + Math.random() * 0.8, ttl: 2, color: SMOKE, size: 1.3 + Math.random(), alpha: 0.6 })
    }
    // The ground it blew away flies out as its own characters
    const chars = ['#', '%', ':', '"', '.']
    for (let i = 0; i < removed.length && i < 70; i += 2 * Math.max(1, Math.floor(removed.length / 70))) {
      const x = removed[i] + 0.5
      const y = removed[i + 1] + 0.5
      const dx = x - event.x
      const dy = y - event.y
      const d = Math.hypot(dx, dy) || 1
      particles.push({ ch: chars[i % chars.length], x, y, vx: (dx / d) * (10 + Math.random() * 18), vy: (dy / d) * 10 - 12 - Math.random() * 14, gravity: 40, drag: 0.6, life: 0.9 + Math.random() * 0.6, ttl: 1.5, color: i % 3 ? DIM : GREEN, spin: (Math.random() * 2 - 1) * 8, size: 1.3 })
    }
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2
      particles.push({ ch: 'o', x: event.x, y: event.y, vx: Math.cos(a) * event.r * 6, vy: Math.sin(a) * event.r * 6, drag: 5, life: 0.35, ttl: 0.35, color: '#ffe680', size: 1.2 })
    }
  } else if (event.k === 'dmg') {
    const u = unitAt(frame, event.u)
    flashUntil[event.u] = clock + 0.25
    sound.play('hit')
    rise(`-${event.n}`, u.x, u.y - 4, SIDE_COLORS[props.units[event.u]?.side ?? 0])
  } else if (event.k === 'die') {
    const u = unitAt(frame, event.u)
    sound.play('fall')
    haptics.buzz('crash')
    rise(event.why === 'water' ? '~blub~' : 'x_x', u.x, Math.min(u.y, props.water) - 3, SIDE_COLORS[props.units[event.u]?.side ?? 0], 1.6)
  } else if (event.k === 'bounce') {
    sound.play('bounce')
  } else if (event.k === 'splash') {
    sound.play('board', 0.4)
    if (!reduceMotion) {
      for (let k = 0; k < 8; k++) particles.push({ ch: '~', x: event.x, y: props.water - 0.5, vx: (Math.random() * 2 - 1) * 8, vy: -10 - Math.random() * 10, gravity: 40, life: 0.6, ttl: 0.6, color: '#3fd0ff', size: 1.2 })
    }
  }
}

function stepReplay (dt) {
  if (!play) return null
  play.time += dt
  const frame = frameAt(play.time)
  const events = play.replay.events
  const tick = play.time / STEP
  while (play.next < events.length && events[play.next].t <= tick) happen(events[play.next++], frame)
  shotsShown = frame.shots
  if (!reduceMotion && Math.floor(clock * 30) !== Math.floor((clock - dt) * 30)) {
    for (const s of frame.shots) {
      if (KINDS[s.kind] === 'flame') {
        if (Math.random() < 0.25) particles.push({ ch: '.', x: s.x + (Math.random() - 0.5), y: s.y - 1, vx: 0, vy: -4, life: 0.6, ttl: 0.6, color: SMOKE, size: 1, alpha: 0.6 })
        continue
      }
      const ember = KINDS[s.kind] === 'molotov'
      particles.push({ ch: ember ? '*' : '.', x: s.x, y: s.y, vx: 0, vy: ember ? -1 : -0.5, life: 0.6, ttl: 0.6, color: ember ? FIRE_COLORS[Math.floor(Math.random() * 3)] : SMOKE, size: 1.2, alpha: 0.8 })
    }
  }
  if (play.time >= play.replay.duration + 0.3 && play.next >= events.length) {
    endReplay()
    return null
  }
  return frame
}

// ---------- The loop ----------

const keys = new Set()

let currentFrame = null
let lastDt = 0

function after (dt) {
  clock += dt
  lastDt = dt
  currentFrame = stepReplay(dt)
  // Held keys: arrows walk and aim, W and S set the power
  if (canAct()) {
    const left = keys.has('ArrowLeft') || keys.has('KeyA')
    const right = keys.has('ArrowRight') || keys.has('KeyD')
    if (left || right) walk.dir = left === right ? 0 : left ? -1 : 1
    const facingRight = Math.cos(ui.angle) >= 0
    const turn = (keys.has('ArrowUp') ? 1 : 0) - (keys.has('ArrowDown') ? 1 : 0)
    if (turn) {
      const elevation = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2, (facingRight ? ui.angle : Math.PI - ui.angle) + turn * 1.1 * dt))
      ui.angle = facingRight ? elevation : Math.PI - elevation
    }
    const charge = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0)
    if (charge) ui.power = Math.max(0.05, Math.min(1, ui.power + charge * 0.6 * dt))
  }
  stepWalk(dt)
  liveClock += dt
  if (playing.value && props.phase === 'aim' && ui.selected >= 0 && liveClock >= LIVE_EVERY) {
    liveClock = 0
    emit('walk', { turn: props.turn, u: ui.selected, x: Math.round(walk.x * 10) / 10, y: walk.y })
  }
  // The clock's last seconds tick
  const left = props.phase === 'aim' ? Math.max(0, Math.ceil((props.deadline - Date.now()) / 1000)) : 0
  if (left !== ui.seconds) {
    ui.seconds = left
    if (left > 0 && left <= 5 && canAct()) sound.play('tick')
  }
  flash = Math.max(0, flash - dt * 2.5)
  shake = Math.max(0, shake - dt * 2.5)
  stepParticles(particles, dt)
  for (const t of texts) {
    t.life -= dt
    t.y += t.vy * dt
    t.alpha = Math.min(1, t.life / (t.ttl * 0.5))
  }
  texts = texts.filter(t => t.life > 0)
}

function render () {
  if (!renderer) return
  const dt = lastDt
  const frame = currentFrame
  const units = props.units.map((u, i) => {
    let x = u.x
    let y = u.y
    if (frame) {
      x = frame.u[i * 2]
      y = frame.u[i * 2 + 1]
    } else if (props.phase === 'aim' && i === ui.selected && playing.value) {
      x = walk.x
      y = walk.y
    } else if (props.phase === 'aim') {
      const sample = props.live.samples?.[u.side]
      if (sample && sample.turn === props.turn && sample.u === i && u.side !== props.mySide) {
        x = sample.x
        y = sample.y
      }
    }
    // A unit the replay kills stays up until the replay gets there
    const alive = frame ? u.alive || diedBy(i) : u.alive
    const aiming = i === ui.selected && props.phase === 'aim' && playing.value
    const facing = aiming ? (Math.cos(ui.angle) < 0 ? 1 : 0) : u.side
    return {
      x,
      y,
      side: u.side,
      alive,
      hp: frame ? hpAt(i) : u.hp,
      facing,
      angle: aiming ? ui.angle : facing ? Math.PI - 0.35 : 0.35,
      walking: aiming && clock < walkingUntil,
      selected: aiming && !ui.fired,
      blink: Math.floor(clock * 3) % 2 === 0,
      flash: (flashUntil[i] || 0) - clock
    }
  })
  // The camera: on the unit being aimed with, then after the shots, unless the strip was used
  let target = cam.x + renderer.visible / 2
  if (clock < cam.manualUntil) target = cam.target
  else if (frame && shotsShown.length) target = shotsShown.reduce((sum, s) => sum + s.x, 0) / shotsShown.length
  else if (props.phase === 'aim' && playing.value && ui.selected >= 0) target = walk.x
  else if (!frame) {
    const alive = units.filter(u => u.alive)
    if (alive.length) target = alive.reduce((sum, u) => sum + u.x, 0) / alive.length
  }
  const goal = Math.max(0, Math.min(W - renderer.visible, target - renderer.visible / 2))
  cam.x += (goal - cam.x) * Math.min(1, dt * (clock < cam.manualUntil ? 12 : 3.5))

  let aim = null
  if (canAct() && ui.selected >= 0) {
    const shot = launch(walk.x, walk.y, ui.angle, ui.power, ui.weapon)
    aim = { points: previewArc(walk.x, walk.y, ui.angle, ui.power, ui.weapon), tip: { x: shot.x + Math.cos(ui.angle) * 2.5, y: shot.y - Math.sin(ui.angle) * 2.5 }, side: props.mySide }
  }
  renderer.draw({
    terrain: display,
    water: props.water,
    time: clock,
    camX: cam.x,
    units,
    shots: shotsShown,
    aim,
    particles,
    texts: [...texts, ...banners()],
    flash,
    shake
  })
}

// A unit's health during the replay: what it had, less the hits so far
function hpAt (i) {
  const unit = props.units[i]
  if (!play) return unit.hp
  let hp = unit.hp
  const events = play.replay.events
  for (let k = play.next; k < events.length; k++) if (events[k].k === 'dmg' && events[k].u === i) hp += events[k].n
  return Math.max(0, hp)
}

function diedBy (i) {
  return play.replay.events.slice(play.next).some(e => e.k === 'die' && e.u === i)
}

function banners () {
  const list = []
  const middle = cam.x + (renderer?.visible || W) / 2
  const since = clock - turnStartedAt
  if (props.phase === 'aim' && since < 1.8) {
    const alpha = Math.min(1, (1.8 - since) / 0.5)
    const first = props.turn === 1
    list.push({ text: upperT(first ? props.t.craterFight : fmt(props.t.craterTurn, { n: props.turn })), x: middle, y: 13, size: 3, color: GREEN, display: true, min: 24, alpha })
    if (first) list.push({ text: upperT(props.t[LEVEL_KEYS[props.level]] || ''), x: middle, y: 18, size: 1.6, color: GREEN, display: true, min: 14, alpha: alpha * 0.8 })
    else if (props.sudden) list.push({ text: upperT(props.t.craterSeaRising), x: middle, y: 18, size: 1.5, color: '#3fd0ff', display: true, min: 13, alpha })
  }
  return list
}

const upperT = (text) => text.toLocaleUpperCase(props.t.langCode.toLowerCase())
let turnStartedAt = 0

// ---------- Input ----------

let drag = null // { id, x, y } while aiming by pulling back

function local (event) {
  const rect = arena.value.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

function onPointerDown (event) {
  sound.unlock()
  if (event.button > 0 || !renderer) return
  const p = local(event)
  const strip = renderer.minimapRect()
  if (strip && p.y <= strip.y + strip.h + 8 && p.x >= strip.x - 6 && p.x <= strip.x + strip.w + 6) {
    drag = { id: event.pointerId, pan: true }
    panTo(p.x, strip)
    arena.value.setPointerCapture?.(event.pointerId)
    return
  }
  if (!canAct()) return
  const at = renderer.toMap(p.x, p.y)
  const touched = mine.value.find(i => Math.abs(props.units[i].x - at.x) < 2.2 && at.y > props.units[i].y - 4.5 && at.y < props.units[i].y + 1)
  if (touched !== undefined && touched !== ui.selected) {
    selectUnit(touched)
    sound.play('tock')
  }
  drag = { id: event.pointerId, x: p.x, y: p.y, pan: false }
  arena.value.setPointerCapture?.(event.pointerId)
}

function panTo (px, strip) {
  cam.target = ((px - strip.x) / strip.w) * W
  cam.manualUntil = clock + 4
}

function onPointerMove (event) {
  if (!drag || event.pointerId !== drag.id) return
  const p = local(event)
  if (drag.pan) {
    panTo(p.x, renderer.minimapRect() || { x: 0, w: 1 })
    return
  }
  if (!canAct()) return
  // Pulling back aims the other way, harder the further
  const dx = drag.x - p.x
  const dy = drag.y - p.y
  const len = Math.hypot(dx, dy)
  if (len < 8) return
  const rect = arena.value.getBoundingClientRect()
  ui.angle = Math.atan2(-dy, dx)
  ui.power = Math.max(0.05, Math.min(1, len / (Math.min(rect.width, rect.height) * AIM_DRAG)))
}

function onPointerUp (event) {
  if (drag && event.pointerId === drag.id) drag = null
}

// The walk buttons walk while held
function holdWalk (dir) {
  sound.unlock()
  if (canAct()) walk.dir = dir
}

const KEY_WEAPONS = { Digit1: 'shell', Digit2: 'grenade', Digit3: 'cluster' }

function onKeyDown (event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  sound.unlock()
  if (event.target.closest?.('button') && (event.code === 'Enter' || event.code === 'Space')) return
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'].includes(event.code)) {
    event.preventDefault()
    keys.add(event.code)
  } else if ((event.code === 'Space' || event.code === 'Enter') && !event.repeat) {
    event.preventDefault()
    fire()
  } else if (KEY_WEAPONS[event.code]) {
    pickWeapon(KEY_WEAPONS[event.code])
  } else if (event.code === 'Tab') {
    event.preventDefault()
    nextUnit()
  }
}

function releaseKeys () {
  keys.clear()
  walk.dir = 0
}

function onKeyUp (event) {
  keys.delete(event.code)
  if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(event.code)) walk.dir = 0
}

function press (event, run) {
  sound.unlock()
  run()
  if (event.detail) event.currentTarget.blur()
}

// ---------- HUD ----------

const teams = computed(() => [0, 1].map(side => {
  const list = props.units.filter(u => u.side === side)
  const hp = list.reduce((sum, u) => sum + (u.alive ? u.hp : 0), 0)
  return { side, name: props.names[side] || '?', hp, units: list.map(u => (u.alive ? u.hp : 0)), me: side === props.mySide, fired: props.locked[side] }
}))
// The wind as a gauge out from the middle, five marks at full strength
const windGauge = computed(() => {
  const n = Math.round(Math.abs(props.wind) * 5)
  const toLeft = props.wind < 0 ? ' '.repeat(5 - n) + '<'.repeat(n) : '     '
  const toRight = props.wind > 0 ? '>'.repeat(n) + ' '.repeat(5 - n) : '     '
  return toLeft + '|' + toRight
})
const powerBar = computed(() => {
  const filled = Math.round(ui.power * 10)
  return '#'.repeat(filled) + '.'.repeat(10 - filled)
})
const degrees = computed(() => {
  const elevation = Math.cos(ui.angle) >= 0 ? ui.angle : Math.PI - ui.angle
  return Math.round((elevation * 180) / Math.PI)
})
const status = computed(() => {
  if (props.phase === 'resolve') return props.t.craterImpact
  if (props.phase !== 'aim') return ''
  if (!playing.value) return props.t.craterWatching
  if (!mine.value.length) return props.t.craterOut
  if (ui.fired || props.locked[props.mySide]) return fmt(props.t.craterWaiting, { name: props.names[1 - props.mySide] || '?' })
  return ''
})
const showControls = computed(() => playing.value && props.phase === 'aim' && mine.value.length > 0 && !ui.fired && !props.locked[props.mySide])

// ---------- Life cycle ----------

watch(() => props.seed, () => {
  rebuild(props.craters.length)
  particles = []
  texts = []
  play = null
})
let playedTurn = 0
watch(() => props.replay, (replay) => {
  if (!replay || replay.turn === playedTurn) return
  playedTurn = replay.turn
  startReplay(replay)
})
watch(() => [props.turn, props.phase], ([turn, phase], before) => {
  if (phase === 'aim' && (!before || turn !== before[0] || before[1] !== 'aim')) {
    newTurn()
    turnStartedAt = clock
    if (playing.value && mine.value.length) {
      sound.play('go')
      haptics.buzz('tap')
    }
  }
  // A slow screen still playing the last turn jumps to its end, so the ground matches the host's
  if (phase === 'aim' && play) endReplay()
  if (phase === 'aim') applyCraters(props.craters.length)
})
watch(() => props.units.map(u => u.alive).join(), () => {
  if (!mine.value.includes(ui.selected)) ui.selected = mine.value[0] ?? -1
})

function fit () {
  const el = arena.value
  if (!el || !renderer) return
  renderer.resize(el.clientWidth, el.clientHeight, window.devicePixelRatio || 1)
}

onMounted(() => {
  renderer = createRenderer(canvas.value)
  rebuild(props.replay && props.phase === 'resolve' ? props.replay.before : props.craters.length)
  observer = new ResizeObserver(fit)
  observer.observe(arena.value)
  fit()
  stopFonts = watchFonts(() => renderer?.rebuild())
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', releaseKeys)
  if (props.phase === 'aim') {
    newTurn()
    turnStartedAt = 0
  }
  if (props.replay && props.phase === 'resolve') {
    playedTurn = props.replay.turn
    startReplay(props.replay)
  } else if (props.replay) {
    playedTurn = props.replay.turn
  }
  cam.x = Math.max(0, (playing.value && ui.selected >= 0 ? walk.x : W / 2) - (renderer.visible || W) / 2)
  stopLoop = startLoop({ step: STEP, tick: () => {}, after, draw: render })
  if (import.meta.env.DEV) window.__crater = { ui, walk, fire, get display () { return display } }
})

onUnmounted(() => {
  stopLoop?.()
  observer?.disconnect()
  stopFonts?.()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', releaseKeys)
  if (import.meta.env.DEV) delete window.__crater
})
</script>

<template>
  <ArcadeStage :t="t" :title="title" :exitLabel="exitLabel" @exit="emit('exit')" @contextmenu.prevent>
    <div class="relative flex-1 min-h-0 flex flex-col">
      <!-- Both sides' health, the clock and the wind -->
      <div class="hud">
        <div v-for="team in teams" :key="team.side" :class="['team', team.side ? 'side-1 text-right items-end' : 'side-0 items-start', { 'is-me': team.me }]" :style="{ color: SIDE_COLORS[team.side] }">
          <span class="name truncate">{{ team.name }}<span v-if="team.fired && phase === 'aim'" class="ok"> [ok]</span></span>
          <span class="pips" aria-hidden="true">
            <span v-for="(hp, k) in team.units" :key="k" :class="['pip', { 'is-down': !hp }]"><span :style="{ width: hp + '%', background: SIDE_COLORS[team.side] }"></span></span>
          </span>
          <span class="sr-only">{{ team.hp }}</span>
        </div>
        <div class="center">
          <span class="text-[10px] uppercase tracking-widest term-muted">{{ fmt(t.craterTurn, { n: turn }) }}</span>
          <span :class="['font-display text-3xl leading-none tabular-nums', { 'term-blink': phase === 'aim' && ui.seconds <= 5 }]">{{ phase === 'aim' ? ui.seconds : '--' }}</span>
          <span class="wind" :title="t.craterWind"><span class="term-muted">{{ t.craterWind }}</span> <span class="gauge">[{{ windGauge }}]</span></span>
        </div>
      </div>

      <!-- The battlefield: drag to aim; the strip at the top shows the whole map on narrow screens -->
      <div
        ref="arena"
        class="relative flex-1 min-h-0 touch-none select-none"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <canvas ref="canvas" class="absolute inset-0" role="img" :aria-label="title"></canvas>
        <p v-if="status" class="status" aria-live="polite">&gt; <span class="term-cursor">{{ status }}</span></p>
      </div>

      <!-- Walk, weapon, aim and fire -->
      <div v-if="showControls" class="controls">
        <div class="flex gap-1.5">
          <button type="button" class="term-icon-btn ctl" :aria-label="t.craterWalkLeft" @pointerdown="holdWalk(-1)" @pointerup="walk.dir = 0" @pointerleave="walk.dir = 0" @pointercancel="walk.dir = 0">&lt;</button>
          <button type="button" class="term-icon-btn ctl" :aria-label="t.craterWalkRight" @pointerdown="holdWalk(1)" @pointerup="walk.dir = 0" @pointerleave="walk.dir = 0" @pointercancel="walk.dir = 0">&gt;</button>
          <button v-if="mine.length > 1" type="button" class="term-icon-btn ctl" :aria-label="t.craterNextUnit" :title="`${t.craterNextUnit} (Tab)`" @click="press($event, nextUnit)">&#8635;</button>
        </div>
        <div class="flex gap-1.5 flex-1 min-w-0" role="group" :aria-label="t.craterWeapons">
          <button
            v-for="(id, index) in WEAPON_IDS"
            :key="id"
            type="button"
            :class="['weapon term-option', { 'is-active': ui.weapon === id }]"
            :aria-pressed="ui.weapon === id"
            :disabled="left(id) <= 0"
            :title="`${t[WEAPON_KEYS[id]]} (${index + 1})`"
            :aria-label="`${t[WEAPON_KEYS[id]]}: ${left(id) === Infinity ? '∞' : left(id)}`"
            @click="press($event, () => pickWeapon(id))"
          >
            <span :class="['icon', `is-${id}`]">{{ WEAPON_ICONS[id] }}</span>
            <span class="label">{{ t[WEAPON_KEYS[id]] }}</span>
            <span class="count tabular-nums">{{ left(id) === Infinity ? '∞' : left(id) }}</span>
          </button>
        </div>
        <div class="readout tabular-nums" aria-live="off">
          <span>{{ degrees }}°</span>
          <span class="power" :aria-label="`${Math.round(ui.power * 100)}%`">[{{ powerBar }}]</span>
        </div>
        <button type="button" class="term-btn term-btn-primary fire" @click="press($event, fire)">{{ t.craterFire }}</button>
      </div>
      <p v-else-if="playing && phase === 'aim' && mine.length" class="controls-note term-muted">&gt; {{ t.craterLocked }}</p>
      <p v-else class="controls-note term-muted"></p>

      <slot name="overlay" />
    </div>
  </ArcadeStage>
</template>

<style scoped>
.hud {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
  padding: 0.35rem 0.75rem;
  border-bottom: 1px solid var(--color-term-low);
  min-height: 3rem;
}
.hud .team {
  display: flex;
  flex-direction: column;
  min-width: 0;
  font-size: 0.75rem;
  line-height: 1.25;
  text-shadow: 0 0 5px currentColor;
}
.hud .side-0 {
  grid-column: 1;
  grid-row: 1;
}
.hud .side-1 {
  grid-column: 3;
  grid-row: 1;
}
.hud .center {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
}
.hud .name {
  max-width: 100%;
  font-weight: 700;
  font-size: 0.8rem;
}
.hud .is-me .name {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.hud .ok {
  font-weight: 400;
}
.pips {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.2rem;
}
.side-1 .pips {
  flex-direction: row-reverse;
}
.pip {
  position: relative;
  width: 2.4rem;
  height: 0.45rem;
  border: 1px solid currentColor;
  overflow: hidden;
}
.pip > span {
  position: absolute;
  inset: 0 auto 0 0;
  box-shadow: 0 0 6px currentColor;
  transition: width 0.4s ease-out;
}
.pip.is-down {
  opacity: 0.35;
}
.wind {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
}
.wind .gauge {
  white-space: pre;
  letter-spacing: 0;
  color: var(--color-term);
}

.status {
  position: absolute;
  left: 50%;
  bottom: 0.75rem;
  transform: translateX(-50%);
  max-width: calc(100% - 1.5rem);
  padding: 0.25rem 0.6rem;
  background: rgb(0 0 0 / 0.75);
  border: 1px solid var(--color-term-low);
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.6rem;
  padding: 0.45rem 0.6rem calc(0.45rem + env(safe-area-inset-bottom));
  border-top: 1px solid var(--color-term-low);
}
.controls-note {
  min-height: 3.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid var(--color-term-low);
  font-size: 0.85rem;
  padding-bottom: env(safe-area-inset-bottom);
}
.ctl {
  width: 2.9rem;
  height: 2.6rem;
  font-size: 1.1rem;
  touch-action: none;
}
.weapon {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  min-height: 2.6rem;
  padding: 0 0.3rem;
  flex-direction: column;
  gap: 0;
  line-height: 1.1;
}
.weapon .icon {
  font-weight: 700;
  font-size: 1rem;
  line-height: 1;
}
.weapon .icon.is-molotov {
  color: #ffb000;
}
.weapon .icon.is-dynamite {
  color: #ff4a3d;
}
.weapon .count {
  position: absolute;
  top: 1px;
  right: 3px;
  font-size: 0.6rem;
  font-weight: 700;
}
.weapon:disabled {
  opacity: 0.35;
}
.weapon .label {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.readout {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 0.75rem;
  line-height: 1.25;
  min-width: 2.6rem;
}
.readout .power {
  font-size: 0.6rem;
  letter-spacing: 0;
}
@media (max-width: 520px) {
  .weapon .label {
    display: none;
  }
}
.fire {
  min-height: 2.6rem;
  padding: 0 0.9rem;
  font-size: 0.9rem;
}
@media (max-width: 520px) {
  .controls .fire {
    flex: 1 1 100%;
  }
}
</style>
