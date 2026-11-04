<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import ArcadeStage from '../ascii/ArcadeStage.vue'
import FullscreenButton from '../ascii/FullscreenButton.vue'
import { useFullscreen } from '../ascii/fullscreen'
import { GREEN, watchFonts } from '../ascii/paint'
import { startLoop } from '../ascii/loop'
import { stepParticles } from '../ascii/physics'
import { sound } from '../ascii/sound'
import { haptics } from '../ascii/haptics'
import { createTerrain, W } from './terrain'
import { STEP, SAMPLE, MAX_WALK, WALK_SPEED, WEAPON_IDS, WEAPONS, KINDS, launch, previewArc } from './physics'
import { createRenderer, SIDE_COLORS } from './renderer'
import * as fx from './effects'

// The full-screen match. In the aiming part of a turn this player picks a unit, walks it,
// aims by dragging (pull back, like a slingshot) and fires; the shot goes to the host, which
// plays the turn out once every side has fired or the clock runs out. Then everyone plays back
// the host's recording: shots flying, craters opening, units thrown about. There are two to six
// sides, each a person or a bot, every side for itself. The full-screen switch leaves the
// battlefield, the scores over it and the controls under it, and nothing else. A short list in
// the corner says who took out whom; a unit that's been hurt smokes, and one near the end burns.

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
  mySide: { type: Number, default: -1 }, // this player's side, or -1 watching
  names: { type: Array, required: true },
  colors: { type: Array, default: () => [] }, // by side: its color, an index into SIDE_COLORS
  wind: { type: Number, default: 0 }, // -1 to 1
  water: { type: Number, required: true },
  sudden: { type: Boolean, default: false }, // the sea rises every turn now
  deadline: { type: Number, default: 0 },
  locked: { type: Array, default: () => [] }, // by side: has fired this turn
  replay: { type: Object, default: null }, // { turn, before, frames, events, duration }
  live: { type: Object, required: true }, // { samples: { side: { turn, u, x, y } } }, the other player walking
  ammo: { type: Array, default: () => [] } // by side: what's left of each limited weapon
})

const emit = defineEmits(['exit', 'fire', 'walk'])

const AIM_DRAG = 0.42 // a pull this share of the shorter screen side is full power
const LIVE_EVERY = 0.1
const FEED_LIFE = 4.5 // seconds a line stays in the list of who took out whom
const FEED_MAX = 4
const POP_LIFE = 1.8 // seconds "You took out ..." shows
const OUT_LIFE = 3 // seconds "Eliminated" shows, then it clears the way to watch the rest
const YOU_SECONDS = 2.5 // YOU shows over your units this long into a round

const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const WEAPON_KEYS = { shell: 'craterShell', grenade: 'craterGrenade', cluster: 'craterCluster', molotov: 'craterMolotov', dynamite: 'craterDynamite' }
const WEAPON_ICONS = { shell: 'o', grenade: '@', cluster: '*', molotov: '!', dynamite: '|' }
const LEVEL_KEYS = { hills: 'craterHills', mountain: 'craterMountain', valley: 'craterValley', islands: 'craterIslands', plateaus: 'craterPlateaus', canyon: 'craterCanyon', caverns: 'craterCaverns', sky: 'craterSky', city: 'craterCity', cheese: 'craterCheese' }

const arena = ref(null)
const canvas = ref(null)
const ui = reactive({
  selected: -1, // index into units
  angle: Math.PI / 4,
  power: 0.6,
  weapon: 'shell',
  fired: false,
  seconds: 0,
  walked: 0,
  strip: false, // the strip with the whole map is along the top
  feed: [], // who took out whom: { id, killer (side or -1), victim (side), at }
  pop: null // { text, color, at }: this player took one out
})

// Each side's color, the same on every screen and from round to round
const colorIndex = (side) => (props.colors[side] ?? side) % SIDE_COLORS.length
const colorOf = (side) => SIDE_COLORS[colorIndex(side)] || GREEN
let feedSeq = 0

// The battlefield with the scores and the controls, filling the screen; the way out joins the scores
const { full, toggle: toggleFull } = useFullscreen(() => arena.value?.closest('.arena'))

function onFullClick (event) {
  sound.unlock()
  toggleFull(event)
}

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
  // Face the nearest enemy to start with
  const facingRight = enemyToRight()
  const elevation = Math.cos(ui.angle) >= 0 ? ui.angle : Math.PI - ui.angle
  ui.angle = facingRight ? elevation : Math.PI - elevation
}

function enemyToRight () {
  const me = props.units[ui.selected]
  if (!me) return true
  let nearest = null
  for (const u of props.units) {
    if (!u.alive || u.side === props.mySide) continue
    if (!nearest || Math.abs(u.x - me.x) < Math.abs(nearest.x - me.x)) nearest = u
  }
  return nearest ? nearest.x >= me.x : me.x < W / 2
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
    const side = props.units[event.u]?.side ?? 0
    sound.play('fire')
    if (reduceMotion) return
    // The flash at the gun, the way the shot left it
    const sx = u.x
    const sy = u.y - 1.9
    const away = frameAt(STEP * SAMPLE * 2).shots.find(s => s.side === side)
    const angle = away ? Math.atan2(-(away.y - sy), away.x - sx) : (u.x > W / 2 ? Math.PI - 0.6 : 0.6)
    fx.muzzle(particles, sx + Math.cos(angle) * 2, sy - Math.sin(angle) * 2, angle, colorOf(side))
  } else if (event.k === 'boom') {
    const removed = display.carve(event.x, event.y, event.r)
    applied++
    sound.play('boom')
    haptics.buzz('boom')
    if (reduceMotion) return
    flash = Math.max(flash, 0.5 + event.r * 0.06)
    shake = Math.max(shake, 0.2 + event.r * 0.07)
    // A fireball, a shock wave, smoke, sparks, and the ground it blew away flying out
    fx.blast(particles, event.x, event.y, event.r, removed, renderer?.dirt)
  } else if (event.k === 'dmg') {
    const u = unitAt(frame, event.u)
    flashUntil[event.u] = clock + 0.25
    sound.play('hit')
    rise(`-${event.n}`, u.x, u.y - 4, colorOf(props.units[event.u]?.side ?? 0))
    if (!reduceMotion) fx.hit(particles, u.x, u.y - 1.8, colorOf(props.units[event.u]?.side ?? 0))
  } else if (event.k === 'die') {
    const u = unitAt(frame, event.u)
    const victim = props.units[event.u]?.side ?? 0
    sound.play('fall')
    haptics.buzz('crash')
    rise(event.why === 'water' ? '~blub~' : 'x_x', u.x, Math.min(u.y, props.water) - 3, colorOf(victim), 1.6)
    noteKill(event.by ?? -1, victim)
    if (!reduceMotion && event.why !== 'water') fx.knockOut(particles, u.x, u.y - 1.6, colorOf(victim))
    // This player's last unit: out of the round, watching the rest
    // (the replay is past this event, so diedBy covers the units still to go down)
    if (victim === props.mySide && !props.units.some((v, i) => v.side === victim && i !== event.u && (v.alive || diedBy(i)))) outAt = clock
  } else if (event.k === 'bounce') {
    sound.play('bounce')
    if (!reduceMotion) fx.knock(particles, event.x, event.y)
  } else if (event.k === 'splash') {
    sound.play('board', 0.4)
    if (!reduceMotion) fx.splash(particles, event.x, props.water, renderer?.sea)
  }
}

// Someone's unit is down: a line in the list, and a moment of glory if this player did it.
// Taking out your own, or the sea doing it, shows with nobody's name in front.
function noteKill (by, victim) {
  const killer = by >= 0 && by !== victim ? by : -1
  ui.feed.push({ id: ++feedSeq, killer, victim, at: clock })
  if (ui.feed.length > FEED_MAX) ui.feed.shift()
  if (killer >= 0 && killer === props.mySide) {
    ui.pop = { text: fmt(props.t.craterYouKilled, { name: props.names[victim] || '?' }), color: colorOf(killer), at: clock }
    sound.play('kill')
  }
}

let outAt = -Infinity

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
      const kind = KINDS[s.kind]
      if (kind === 'flame' && Math.random() > 0.3) continue
      fx.trail(particles, s.x, s.y, kind, colorOf(s.side))
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
  while (ui.feed.length && clock - ui.feed[0].at > FEED_LIFE) ui.feed.shift()
  if (ui.pop && clock - ui.pop.at > POP_LIFE) ui.pop = null
  hurtSmoke(dt)
  stepParticles(particles, dt)
  for (const t of texts) {
    t.life -= dt
    t.y += t.vy * dt
    t.alpha = Math.min(1, t.life / (t.ttl * 0.5))
  }
  texts = texts.filter(t => t.life > 0)
}

// Damage you can see: a unit under half its health trails smoke, and under a quarter it burns
let smokeClock = 0
function hurtSmoke (dt) {
  smokeClock += dt
  if (reduceMotion || smokeClock < 0.12 || !renderer) return
  smokeClock = 0
  for (const u of shownUnits) {
    if (!u.alive || u.hp >= 50) continue
    const burning = u.hp < 25
    if (Math.random() < (burning ? 0.9 : 0.55)) fx.hurtSmoke(particles, u.x, u.y - 3, props.wind, burning)
  }
}

let shownUnits = [] // the units as last drawn, where the smoke comes from

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
    // Everyone else faces the middle of the map
    const facing = aiming ? (Math.cos(ui.angle) < 0 ? 1 : 0) : u.x > W / 2 ? 1 : 0
    return {
      x,
      y,
      side: u.side,
      color: colorIndex(u.side),
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
  shownUnits = units
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
    aim = { points: previewArc(walk.x, walk.y, ui.angle, ui.power, ui.weapon), tip: { x: shot.x + Math.cos(ui.angle) * 2.5, y: shot.y - Math.sin(ui.angle) * 2.5 }, color: colorIndex(props.mySide) }
  }
  renderer.draw({
    terrain: display,
    // Scorch round the craters opened so far
    scorch: props.craters.slice(0, applied),
    water: props.water,
    time: clock,
    camX: cam.x,
    units,
    shots: shotsShown.map(s => ({ ...s, color: s.side >= 0 ? colorIndex(s.side) : -1 })),
    aim,
    particles,
    texts: [...texts, ...banners(units)],
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

function banners (units) {
  const list = []
  const middle = cam.x + (renderer?.visible || W) / 2
  const since = clock - turnStartedAt
  // YOU over this player's units as a round starts, so they know which are theirs
  if (playing.value && props.turn === 1 && props.phase === 'aim' && since < YOU_SECONDS) {
    const alpha = Math.min(1, (YOU_SECONDS - since) / 0.5)
    for (const u of units) {
      if (u.alive && u.side === props.mySide) list.push({ text: upperT(props.t.gameYou), x: u.x, y: u.y - 10, size: 1.3, color: colorOf(u.side), display: true, min: 12, alpha })
    }
  }
  // Out of the round: a big word for a moment, then out of the way so the rest can be watched
  const out = clock - outAt
  if (out >= 0 && out < OUT_LIFE) list.push({ text: upperT(props.t.craterEliminated), x: middle, y: 15, size: 3, color: '#ff5c5c', display: true, min: 24, alpha: Math.min(1, (OUT_LIFE - out) / 0.5) })
  if (ui.pop) list.push({ text: ui.pop.text, x: middle, y: 9, size: 1.5, color: ui.pop.color, display: true, min: 13, alpha: Math.min(1, (POP_LIFE - (clock - ui.pop.at)) / 0.4) })
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

const teams = computed(() => props.names.map((name, side) => {
  const list = props.units.filter(u => u.side === side)
  const hp = list.reduce((sum, u) => sum + (u.alive ? u.hp : 0), 0)
  return { side, name: name || '?', color: colorOf(side), hp, units: list.map(u => (u.alive ? u.hp : 0)), me: side === props.mySide, fired: props.locked[side] }
}))
// The list of who took out whom, by name and color
const feedLines = computed(() => ui.feed.map(item => ({
  id: item.id,
  killer: item.killer >= 0 ? { name: props.names[item.killer] || '?', color: colorOf(item.killer) } : null,
  victim: { name: props.names[item.victim] || '?', color: colorOf(item.victim) }
})))
// The first half of the sides down the left of the bar, the rest down the right; past two,
// each one takes a single line
const halves = computed(() => {
  const n = Math.ceil(teams.value.length / 2)
  return [teams.value.slice(0, n), teams.value.slice(n)]
})
const compact = computed(() => teams.value.length > 2)
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
  if (ui.fired || props.locked[props.mySide]) {
    // Everyone still to fire, by name
    const waiting = props.names.filter((_, side) => side !== props.mySide && !props.locked[side] && props.units.some(u => u.side === side && u.alive))
    return fmt(props.t.craterWaiting, { name: waiting.join(', ') || '…' })
  }
  return ''
})
const showControls = computed(() => playing.value && props.phase === 'aim' && mine.value.length > 0 && !ui.fired && !props.locked[props.mySide])

// ---------- Life cycle ----------

watch(() => props.seed, () => {
  rebuild(props.craters.length)
  particles = []
  texts = []
  play = null
  ui.feed = []
  ui.pop = null
  outAt = -Infinity
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
  ui.strip = !!renderer.minimapRect()
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
  <ArcadeStage :t="t" :title="title" :exitLabel="exitLabel" :bare="full" @exit="emit('exit')" @contextmenu.prevent>
    <template #actions>
      <FullscreenButton :t="t" @toggle="onFullClick" />
    </template>

    <div class="relative flex-1 min-h-0 flex flex-col">
      <!-- Every side's health, the clock and the wind; in full screen, the way out too -->
      <div :class="['hud', { 'is-full': full }]">
        <div v-for="(half, h) in halves" :key="h" :class="['group', h ? 'side-1 items-end' : 'side-0 items-start']">
          <div v-for="team in half" :key="team.side" :class="['team', h ? 'text-right items-end' : 'items-start', { 'is-me': team.me, compact }]" :style="{ color: team.color }">
            <span class="name truncate">{{ team.name }}<span v-if="team.fired && phase === 'aim'" class="ok"> [ok]</span></span>
            <span class="pips" aria-hidden="true">
              <span v-for="(hp, k) in team.units" :key="k" :class="['pip', { 'is-down': !hp }]"><span :style="{ width: hp + '%', background: team.color }"></span></span>
            </span>
            <span class="sr-only">{{ team.hp }}</span>
          </div>
        </div>
        <div class="center">
          <span class="text-[10px] uppercase tracking-widest term-muted">{{ fmt(t.craterTurn, { n: turn }) }}</span>
          <span :class="['font-display text-3xl leading-none tabular-nums', { 'term-blink': phase === 'aim' && ui.seconds <= 5 }]">{{ phase === 'aim' ? ui.seconds : '--' }}</span>
          <span class="wind" :title="t.craterWind"><span class="term-muted">{{ t.craterWind }}</span> <span class="gauge">[{{ windGauge }}]</span></span>
        </div>
        <FullscreenButton v-if="full" :t="t" full class="exit-full" @toggle="onFullClick" />
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
        <!-- Who took out whom: a few short lines that fade -->
        <ol :class="['feed', { 'below-strip': ui.strip }]" aria-live="polite">
          <li v-for="line in feedLines" :key="line.id">
            <template v-if="line.killer">
              <span class="who" :style="{ color: line.killer.color }">{{ line.killer.name }}</span>
              <span class="arrow" :style="{ color: line.killer.color }" aria-hidden="true">-&gt;</span>
              <span class="sr-only">{{ t.craterFeedTook }}</span>
              <span class="who" :style="{ color: line.victim.color }">{{ line.victim.name }}</span>
            </template>
            <template v-else>
              <span class="who" :style="{ color: line.victim.color }">{{ line.victim.name }}</span>
              <span class="down">x_x</span>
            </template>
          </li>
        </ol>
        <p v-if="status" class="status" aria-live="polite">&gt; <span class="term-cursor">{{ status }}</span></p>
      </div>

      <!-- Walk, weapon, aim and fire -->
      <div v-if="showControls" class="controls">
        <div class="walk flex gap-1.5">
          <button type="button" class="term-icon-btn ctl" :aria-label="t.craterWalkLeft" @pointerdown="holdWalk(-1)" @pointerup="walk.dir = 0" @pointerleave="walk.dir = 0" @pointercancel="walk.dir = 0">&lt;</button>
          <button type="button" class="term-icon-btn ctl" :aria-label="t.craterWalkRight" @pointerdown="holdWalk(1)" @pointerup="walk.dir = 0" @pointerleave="walk.dir = 0" @pointercancel="walk.dir = 0">&gt;</button>
          <button v-if="mine.length > 1" type="button" class="term-icon-btn ctl" :aria-label="t.craterNextUnit" :title="`${t.craterNextUnit} (Tab)`" @click="press($event, nextUnit)">&#8635;</button>
        </div>
        <div class="weapons flex gap-1.5 flex-1 min-w-0" role="group" :aria-label="t.craterWeapons">
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
.hud.is-full {
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto;
  padding-right: 0.5rem;
}
.hud .exit-full {
  grid-column: 4;
  grid-row: 1;
}
.hud .group {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}
.hud .team {
  display: flex;
  flex-direction: column;
  max-width: 100%;
  min-width: 0;
  font-size: 0.75rem;
  line-height: 1.25;
  text-shadow: 0 0 5px currentColor;
}
.hud .team.compact {
  flex-direction: row;
  align-items: center;
  gap: 0.4rem;
}
.hud .side-1 .team.compact {
  flex-direction: row-reverse;
}
.hud .compact .name {
  font-size: 0.7rem;
}
.hud .compact .pips {
  margin-top: 0;
  flex-shrink: 0;
}
.hud .compact .pip {
  width: 1.3rem;
  height: 0.4rem;
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

.feed {
  position: absolute;
  top: 0.4rem;
  left: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  max-width: calc(100% - 1rem);
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.25;
  pointer-events: none;
  text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 4px #000;
}
.feed.below-strip {
  top: 1.9rem;
}
.feed li {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  white-space: nowrap;
  animation: feed-life 4.5s linear forwards;
}
.feed .who {
  max-width: 9rem;
  overflow: hidden;
  text-overflow: ellipsis;
}
.feed .down {
  color: #9aa69a;
}
@keyframes feed-life {
  0% { opacity: 0; transform: translateX(-0.4rem); }
  6% { opacity: 1; transform: none; }
  86% { opacity: 1; }
  100% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .feed li {
    animation: none;
  }
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
/* A phone held upright: walking and the aim readout on one row, the weapons and fire under
   them, so each weapon gets a button a thumb can hit */
@media (max-width: 520px) {
  .controls {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: "walk readout" "weapons fire";
  }
  .controls .walk {
    grid-area: walk;
  }
  .controls .readout {
    grid-area: readout;
    flex-direction: row;
    align-items: baseline;
    gap: 0.5rem;
  }
  .controls .weapons {
    grid-area: weapons;
  }
  .controls .fire {
    grid-area: fire;
  }
}
/* Four or more sides on a narrow phone: slimmer health bars leave room for the names */
@media (max-width: 400px) {
  .hud .compact .pip {
    width: 0.9rem;
  }
  .hud {
    gap: 0.5rem;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }
}
</style>
