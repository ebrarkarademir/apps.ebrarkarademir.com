<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  STEP, HALF_W, CIRCLE_R, RESTART_TIME,
  createMatch, stepMatch, setInput, pressKick, snapshot, viewOf, readSnapshot, attackDir
} from './engine'
import { LEVELS, newBrain, botControls } from './bots'
import { createRenderer, VIEW_W, VIEW_H } from './renderer'
import ArcadeStage from '../ascii/ArcadeStage.vue'
import { GREEN, DIM, HOT, watchFonts } from '../ascii/paint'
import { startLoop } from '../ascii/loop'
import { stepParticles, burst } from '../ascii/physics'
import { sparks as throwSparks } from '../ascii/fx'
import { sound } from '../ascii/sound'
import { haptics } from '../ascii/haptics'

// The full-screen match: the court as large as the screen allows with the score and clock
// above it, the game loop, the controls and the sound. Arrow keys or WASD run; Space kicks, the
// moment the ball is in reach while it's held. On a touch screen the left half of the screen is
// a stick and the right half the kick button. On a tall screen the court stands on end, with
// this player's team attacking up it.
//
// In a solo game and on an online host this device runs the match (engine.js) and plays the
// bots. The host also sends everyone a snapshot of it many times a second and takes their
// controls in. Everyone else draws the snapshots a tenth of a second late, so motion stays
// smooth between them, and sends their own controls.

const props = defineProps({
  t: { type: Object, required: true },
  title: { type: String, required: true },
  exitLabel: { type: String, required: true },
  mode: { type: String, default: 'solo' }, // solo | host | guest
  round: { type: Number, default: 1 }, // a new match starts whenever this changes
  roster: { type: Array, required: true }, // [{ id, team, name, mark, bot }]
  myId: { type: String, default: '' },
  minutes: { type: Number, default: 3 },
  goals: { type: Number, default: 0 },
  level: { type: String, default: 'normal' },
  kickoff: { type: Number, default: 0 },
  paused: { type: Boolean, default: false },
  online: { type: Object, default: () => ({}) }, // host: id -> still in the room
  inputs: { type: Map, default: null }, // host: id -> the latest controls that guest sent
  snaps: { type: Array, default: null } // guest: snapshots from the host, oldest first
})

const emit = defineEmits(['exit', 'pause', 'snapshot', 'input', 'end'])

const DELAY = 0.1 // guests draw this far behind the host
const INPUT_MS = 30 // guests send their controls at most this often...
const INPUT_RESEND_MS = 250 // ...and at least this often, in case one got lost
const STALL_MS = 1500 // nothing from the host this long: say so
const AWAY_MS = 2000 // host: no controls from a guest this long and a bot plays for them
const STICK_RADIUS = 56 // CSS pixels a finger moves for full speed
const TOP_BAR = 44
const BOTTOM_MIN = 48
const GAP = 8
const MOVE_KEYS = {
  ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0]
}
const KICK_KEYS = new Set(['Space', 'KeyX', 'KeyK'])
const CONFETTI = ['*', '+', 'o', '.', "'", '*']

const area = ref(null)
const canvas = ref(null)
const box = reactive({ w: 0, h: 0, bottom: BOTTOM_MIN })
const hud = reactive({ score: [0, 0], clock: '', status: '', golden: false, hurry: false, kicking: false })
const stick = reactive({ on: false, x: 0, y: 0, kx: 0, ky: 0 })
const touchUi = window.matchMedia?.('(pointer: coarse)').matches
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let renderer = null
let turn = 0 // which way the court is drawn: 0 flat, 1 with home attacking up the screen, -1 away
let observer = null
let stopLoop = null
let stopFonts = null

let meIndex = -1
let match = null // solo and host: the match itself
let prev = null // solo and host: where everything was a step ago, for smooth drawing
let ended = false
const brains = new Map() // player index -> bot brain
const seenKicks = new Map() // host: id -> the last kick count from that guest

let buffer = [] // guest: snapshots read back, oldest first
let offsets = [] // guest: arrival time minus host time, for the last few snapshots
let lastSnapAt = 0
let mountedAt = 0
let lastSent = 0
let lastSentKey = ''
let kickCount = 0

const keys = new Set()
let stickPointer = null // { id, ox, oy, x, y }
const kickPointers = new Set()
let kickKey = false
let kickWasDown = false

const particles = []
const trail = []
let trailClock = 0
let flash = 0
let shake = 0
let message = null // { text, sub, until }: a banner over the court for a moment
let lastView = null
let lastBall = null

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const upper = (text) => text.toLocaleUpperCase(props.t.langCode === 'TR' ? 'tr' : 'en')
const seconds = () => performance.now() / 1000
const lerp = (a, b, f) => a + (b - a) * f

const teamNames = computed(() => [props.t.futsalHome, props.t.futsalAway])
const myTeam = () => (meIndex >= 0 ? props.roster[meIndex]?.team ?? 0 : -1)
const nameOf = (index) => props.roster[index]?.name || '?'
const watching = computed(() => !props.roster.some(p => p.id === props.myId))

function newMatch () {
  meIndex = props.roster.findIndex(p => p.id === props.myId)
  brains.clear()
  seenKicks.clear()
  buffer = []
  offsets = []
  lastSnapAt = 0
  mountedAt = performance.now()
  lastSentKey = ''
  kickCount = 0
  particles.length = 0
  trail.length = 0
  flash = shake = 0
  message = null
  lastView = null
  lastBall = null
  ended = false
  if (props.mode === 'guest') {
    match = null
    return
  }
  match = createMatch({ roster: props.roster, minutes: props.minutes, goals: props.goals, kickoff: props.kickoff })
  prev = { ball: { x: 0, y: 0 }, players: match.players.map(() => ({ x: 0, y: 0 })) }
  remember()
}

function remember () {
  prev.ball.x = match.ball.x
  prev.ball.y = match.ball.y
  match.players.forEach((p, i) => {
    prev.players[i].x = p.x
    prev.players[i].y = p.y
  })
}

// ---------- Controls ----------

// Where the controls point on screen, as a direction on the court
function direction () {
  const [x, y] = screenDirection()
  if (turn === 1) return [-y, x]
  if (turn === -1) return [y, -x]
  return [x, y]
}

function screenDirection () {
  if (stickPointer) {
    const dx = stickPointer.x - stickPointer.ox
    const dy = stickPointer.y - stickPointer.oy
    const d = Math.hypot(dx, dy)
    if (d < 6) return [0, 0]
    const reach = Math.min(1, d / STICK_RADIUS)
    return [(dx / d) * reach, (dy / d) * reach]
  }
  let x = 0
  let y = 0
  for (const code of keys) {
    x += MOVE_KEYS[code][0]
    y += MOVE_KEYS[code][1]
  }
  const d = Math.hypot(x, y)
  return d ? [x / d, y / d] : [0, 0]
}

const kickDown = () => kickKey || kickPointers.size > 0

// Pressing kick readies a kick, which goes off as soon as the ball is in reach. A guest counts
// its presses, so the host hears even a tap that's let go before the next message.
function syncKick () {
  const down = kickDown()
  if (down === kickWasDown) return
  kickWasDown = down
  if (meIndex < 0 || props.paused) return
  if (match) {
    if (down) pressKick(match, meIndex)
  } else {
    if (down) kickCount++
    sendControls(true)
  }
}

function onKeyDown (event) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest?.('input, textarea')) return
  if (MOVE_KEYS[event.code]) {
    event.preventDefault()
    keys.add(event.code)
    sound.unlock()
  } else if (KICK_KEYS.has(event.code)) {
    // A focused button keeps Space for itself
    if (event.code === 'Space' && event.target.closest?.('button, a')) return
    event.preventDefault()
    if (event.repeat) return
    sound.unlock()
    kickKey = true
    syncKick()
  } else if ((event.code === 'KeyP' || event.code === 'Escape') && !event.repeat && props.mode === 'solo') {
    emit('pause')
  }
}

function onKeyUp (event) {
  if (MOVE_KEYS[event.code]) keys.delete(event.code)
  if (KICK_KEYS.has(event.code)) {
    kickKey = false
    syncKick()
  }
}

function areaPoint (event) {
  const rect = area.value.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top, half: rect.width / 2 }
}

// The left half of the screen is the stick, centered wherever the finger lands; the right half kicks
function onPointerDown (event) {
  if (event.button > 0 || event.target.closest('button, a, header')) return
  event.preventDefault()
  sound.unlock()
  const { x, y, half } = areaPoint(event)
  if (x < half) {
    if (stickPointer) return
    stickPointer = { id: event.pointerId, ox: x, oy: y, x, y }
    Object.assign(stick, { on: true, x, y, kx: 0, ky: 0 })
  } else {
    kickPointers.add(event.pointerId)
    syncKick()
  }
  try {
    event.currentTarget.setPointerCapture?.(event.pointerId)
  } catch {
    // A pointer the browser no longer knows: it just isn't captured
  }
}

function onPointerMove (event) {
  if (stickPointer?.id !== event.pointerId) return
  const { x, y } = areaPoint(event)
  stickPointer.x = x
  stickPointer.y = y
  const dx = x - stickPointer.ox
  const dy = y - stickPointer.oy
  const d = Math.hypot(dx, dy)
  const reach = Math.min(d, STICK_RADIUS)
  stick.kx = d ? (dx / d) * reach : 0
  stick.ky = d ? (dy / d) * reach : 0
}

function onPointerUp (event) {
  if (stickPointer?.id === event.pointerId) {
    stickPointer = null
    stick.on = false
  }
  if (kickPointers.delete(event.pointerId)) syncKick()
}

// Switching apps or windows lets go of everything
function releaseAll () {
  keys.clear()
  stickPointer = null
  stick.on = false
  kickPointers.clear()
  kickKey = false
  kickWasDown = false
}

const onVisibility = () => {
  if (document.hidden) releaseAll()
}

// Guest: the controls go to the host as they change. The direction is rounded to one of 32
// headings and three speeds, so a wobbling thumb doesn't flood the connection.
function sendControls (now = false) {
  if (props.mode !== 'guest' || meIndex < 0) return
  const at = performance.now()
  let [x, y] = direction()
  const reach = Math.hypot(x, y)
  if (reach > 0) {
    const angle = Math.round((Math.atan2(y, x) / (Math.PI * 2)) * 32) * ((Math.PI * 2) / 32)
    const speed = reach > 0.75 ? 1 : reach > 0.3 ? 0.55 : 0
    x = Math.round(Math.cos(angle) * speed * 100) / 100
    y = Math.round(Math.sin(angle) * speed * 100) / 100
  }
  const held = kickDown() ? 1 : 0
  const key = `${x},${y},${held},${kickCount}`
  if (!now && (key === lastSentKey ? at - lastSent < INPUT_RESEND_MS : at - lastSent < INPUT_MS)) return
  lastSentKey = key
  lastSent = at
  emit('input', { r: props.round, x, y, h: held, n: kickCount })
}

// ---------- Running the match (solo and host) ----------

// Host: a guest whose controls keep coming in (they're resent a few times a second even when
// nothing changes) plays their own player; one that went quiet, or left, gets a bot
function guestHere (id) {
  const input = props.inputs?.get(id)
  return props.online[id] !== false && input?.r === props.round && Date.now() - input.at < AWAY_MS
}

function guestControls (index, id) {
  const input = props.inputs.get(id)
  setInput(match, index, input.x, input.y, input.h === 1)
  const seen = seenKicks.get(id) ?? 0
  if (Number.isInteger(input.n)) {
    // A page that came back counts its presses from zero again
    if (input.n < seen) seenKicks.set(id, input.n)
    else if (input.n > seen) {
      seenKicks.set(id, input.n)
      pressKick(match, index)
    }
  }
}

function tick () {
  if (!match || match.over) return
  remember()
  const level = LEVELS[props.level] || LEVELS.normal
  props.roster.forEach((entry, i) => {
    if (i === meIndex) {
      const [x, y] = direction()
      setInput(match, i, x, y, kickDown())
    } else if (!entry.bot && props.mode === 'host' && guestHere(entry.id)) {
      guestControls(i, entry.id)
    } else {
      // A bot, or a person who dropped out or switched away: a bot plays for them until they're back
      let brain = brains.get(i)
      if (!brain) brains.set(i, (brain = newBrain()))
      const c = botControls(match, i, brain, level)
      setInput(match, i, c.x, c.y, c.held)
      if (c.press) pressKick(match, i)
    }
  })
  stepMatch(match)
  if (match.over && !ended) {
    ended = true
    emit('end', { score: match.score.slice(), winner: match.winner, goals: match.goals.map(g => ({ ...g })) })
  }
}

function hostView (alpha) {
  const view = viewOf(match)
  view.ball.x = lerp(prev.ball.x, view.ball.x, alpha)
  view.ball.y = lerp(prev.ball.y, view.ball.y, alpha)
  view.players.forEach((p, i) => {
    p.x = lerp(prev.players[i].x, p.x, alpha)
    p.y = lerp(prev.players[i].y, p.y, alpha)
  })
  return view
}

// ---------- Following the host (guest) ----------

function pullSnapshots () {
  const now = seconds()
  while (props.snaps?.length) {
    const data = props.snaps.shift()
    if (data?.r !== props.round) continue
    const snap = readSnapshot(data, props.roster.length)
    if (!snap || (buffer.length && snap.t <= buffer[buffer.length - 1].t)) continue
    buffer.push(snap)
    offsets.push(now - snap.t)
    if (offsets.length > 40) offsets.shift()
    lastSnapAt = performance.now()
  }
}

// The match as it was DELAY seconds ago by the host's clock, blended between the two snapshots
// either side of that moment
function guestView () {
  if (!buffer.length) return null
  const at = seconds() - Math.min(...offsets) - DELAY
  while (buffer.length > 2 && buffer[1].t <= at) buffer.shift()
  const [a, b] = buffer
  if (!b || at <= a.t) return a
  if (at >= b.t) return b
  const f = (at - a.t) / (b.t - a.t)
  const since = at - a.t
  // Line-ups after a goal jump; those aren't slid across the court
  const blend = (p, q) => (Math.hypot(q.x - p.x, q.y - p.y) > 6 ? { x: q.x, y: q.y } : { x: lerp(p.x, q.x, f), y: lerp(p.y, q.y, f) })
  return {
    ...a,
    timer: ['ready', 'kickoff'].includes(a.phase) ? a.timer - since : a.timer,
    clock: a.phase === 'play' ? a.clock - since : a.clock,
    ball: blend(a.ball, b.ball),
    players: a.players.map((p, i) => ({ ...blend(p, b.players[i]), held: p.held }))
  }
}

// ---------- Sounds, effects and messages ----------

function say (text, sub, time) {
  message = { text, sub, until: seconds() + time }
}

// What changed since the last frame: counts of kicks, posts, whistles, goals and bounces only go
// up, so a skipped snapshot still sounds every one of them
function react (before, view) {
  if (!before) return
  const [kicks0, posts0, whistles0, goals0, bounces0] = before.counts
  const [kicks1, posts1, whistles1, goals1, bounces1] = view.counts
  if (kicks1 > kicks0) {
    sound.play('kick', view.lastKick)
    throwSparks(particles, view.ball.x, view.ball.y, { count: 3 + Math.round(view.lastKick * 6), speed: 6 + view.lastKick * 10, life: 0.3 })
    if (view.lastKick > 0.85 && !reduceMotion) shake = Math.max(shake, 0.35)
  }
  if (posts1 > posts0) {
    sound.play('post')
    haptics.buzz('hit')
    throwSparks(particles, view.ball.x, view.ball.y, { count: 8, speed: 9, life: 0.4 })
  }
  if (bounces1 > bounces0) sound.play('board', view.lastBounce)
  if (whistles1 > whistles0) sound.play('whistle', view.longWhistle)
  if (goals1 > goals0 && view.lastGoal) celebrate(view)
  if (view.golden && !before.golden) say(props.t.futsalGolden, props.t.futsalGoldenHint, 2.5)
  if (before.phase === 'kickoff' && view.phase === 'kickoff' && view.kickoff !== before.kickoff) {
    say(props.t.futsalTooSlow, fmt(props.t.futsalTeamBall, { team: teamNames.value[view.kickoff] }), 1.4)
  }
  if (view.phase === 'ready' && Math.ceil(view.timer) !== Math.ceil(before.timer)) sound.play('tick')
  if (view.phase === 'end' && before.phase !== 'end') {
    const mine = myTeam()
    if (mine >= 0) haptics.buzz(view.score[mine] > view.score[1 - mine] ? 'win' : 'over')
  }
}

function celebrate (view) {
  const { team, by, own } = view.lastGoal
  let sub = ''
  if (by === meIndex) sub = own ? props.t.futsalYouOwnGoal : props.t.futsalYouScore
  else if (by >= 0) sub = fmt(own ? props.t.futsalOwnGoalBy : props.t.futsalScoredBy, { name: nameOf(by) })
  say(own ? props.t.futsalOwnGoal : props.t.futsalGoal, sub, 2.6)
  sound.play('cheer')
  const mine = myTeam()
  if (mine >= 0) haptics.buzz(team === mine ? 'win' : 'wrong')
  // The net the ball went into: home scores on the right
  const side = team === 0 ? 1 : -1
  burst(particles, side * (HALF_W + 1), view.ball.y, { chars: CONFETTI, colors: [GREEN, DIM, HOT], count: reduceMotion ? 10 : 34, speed: 16, life: 1.3, drag: 2.2 })
  if (!reduceMotion) flash = 1
}

function effects (dt) {
  flash = Math.max(0, flash - dt * 3)
  shake = Math.max(0, shake - dt * 3)
  stepParticles(particles, dt)
}

// A fast ball leaves a short dotted trail
function followBall (view, dt) {
  const { x, y } = view.ball
  const speed = lastBall ? Math.hypot(x - lastBall.x, y - lastBall.y) / Math.max(dt, 1e-3) : 0
  lastBall = { x, y }
  trailClock += dt
  if (trailClock < 0.03) return
  trailClock = 0
  if (speed > 18) trail.push({ x, y })
  else trail.shift()
  if (trail.length > 5) trail.shift()
}

// ---------- Drawing ----------

// Big words over the middle of the screen; dy is how far below the middle, in units
function banners (view, texts) {
  const banner = (text, dy, size, style = {}) => texts.push({ text: upper(text), dy, size, ...style })
  const now = seconds()
  if (view.phase === 'ready') {
    banner(props.t.futsalGetReady, -5.5, 2.6, { display: true })
    banner(String(Math.max(1, Math.ceil(view.timer))), 1.5, 8, { display: true })
  }
  if (view.phase === 'end') {
    const [home, away] = view.score
    banner(props.t.futsalFullTime, -4, 5, { display: true })
    banner(home === away ? props.t.futsalDraw : fmt(props.t.futsalTeamWins, { team: teamNames.value[home > away ? 0 : 1] }), 1.5, 1.8, { min: 13 })
  } else if (message && now < message.until) {
    banner(message.text, -3, 6, { display: true, alpha: Math.min(1, (message.until - now) / 0.3) })
    if (message.sub) banner(message.sub, 2.2, 1.6, { min: 12 })
  }
}

function render (view, time) {
  const scene = { ball: { x: 0, y: 0 }, trail, players: [], zone: null, countdown: null, particles, texts: [], flash, shake, time }
  if (view) {
    scene.ball = view.ball
    const mine = myTeam()
    view.players.forEach((p, i) => {
      const entry = props.roster[i]
      if (!entry) return
      const me = i === meIndex
      const look = me ? 'me' : (mine < 0 ? entry.team === 0 : entry.team === mine) ? 'mate' : 'foe'
      scene.players.push({ x: p.x, y: p.y, team: entry.team, mark: entry.mark || '?', look, held: me ? kickDown() : p.held, label: entry.bot ? '' : entry.name, marker: me })
    })
    if (view.phase === 'kickoff') scene.zone = { x: 0, y: 0, r: CIRCLE_R }
    // In front of the ball, in the half the kicker faces, which the other team keeps clear of
    if (view.phase === 'kickoff' && view.timer < RESTART_TIME - 0.5) {
      scene.countdown = { x: view.ball.x + attackDir(view.kickoff) * 3.6, y: view.ball.y, text: String(Math.max(1, Math.ceil(view.timer))) }
    }
    banners(view, scene.texts)
  }
  if (props.mode === 'guest' && performance.now() - (lastSnapAt || mountedAt) > STALL_MS) {
    scene.texts.push({ text: upper(props.t.futsalWaitingHost), dy: 6, size: 1.3, min: 11 })
  }
  renderer.draw(scene)
}

function updateHud (view) {
  hud.kicking = kickDown()
  if (!view) return
  if (hud.score[0] !== view.score[0] || hud.score[1] !== view.score[1]) hud.score = view.score.slice()
  hud.golden = view.golden
  const left = Math.max(0, Math.ceil(view.clock))
  hud.clock = view.golden ? upper(props.t.futsalGolden) : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
  hud.hurry = !view.golden && view.phase === 'play' && left <= 10
  hud.status = view.phase === 'kickoff' ? upper(`${props.t.futsalKickOff} · ${teamNames.value[view.kickoff]}`) : ''
}

let lastFrame = 0

function frame (alpha) {
  const now = performance.now()
  const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0
  lastFrame = now
  if (props.mode === 'guest') pullSnapshots()
  const view = match ? hostView(alpha) : guestView()
  if (view) {
    react(lastView, view)
    lastView = view
    if (!props.paused) followBall(view, dt)
  }
  if (!props.paused) effects(dt)
  render(view, now / 1000)
  updateHud(view)
}

function after () {
  if (props.mode === 'host' && match) emit('snapshot', { r: props.round, ...snapshot(match) })
  sendControls()
}

// The court keeps its shape and gets all the room it can, standing on end when that makes it
// clearly bigger, as on a phone held upright. The bar under it gets what's left.
function fit () {
  const el = area.value
  if (!el || !renderer) return
  const style = getComputedStyle(el)
  const w = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
  const h = el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
  const room = Math.max(0, h - TOP_BAR - BOTTOM_MIN - GAP * 2)
  const flat = Math.min(w, (room * VIEW_W) / VIEW_H)
  const upright = Math.min(w, (room * VIEW_H) / VIEW_W)
  turn = upright / VIEW_H > (flat / VIEW_W) * 1.2 ? (myTeam() === 1 ? -1 : 1) : 0
  box.w = Math.floor(Math.max(0, turn ? upright : flat))
  box.h = Math.floor(turn ? (box.w * VIEW_W) / VIEW_H : (box.w * VIEW_H) / VIEW_W)
  box.bottom = Math.floor(Math.max(BOTTOM_MIN, Math.min(h - TOP_BAR - box.h - GAP * 2, touchUi ? Infinity : 160)))
  renderer.resize(box.w, box.h, Math.min(window.devicePixelRatio || 1, 3), turn)
}

watch(() => props.round, () => {
  newMatch()
  fit()
})
const courtLabels = (names) => [`(#) ${upper(names[0])}`, `${upper(names[1])} ( )`]
watch(teamNames, (names) => renderer?.setLabels(courtLabels(names)))

onMounted(() => {
  renderer = createRenderer(canvas.value)
  renderer.setLabels(courtLabels(teamNames.value))
  newMatch()
  observer = new ResizeObserver(fit)
  observer.observe(area.value)
  fit()
  stopFonts = watchFonts(() => renderer?.rebuild())
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', releaseAll)
  document.addEventListener('visibilitychange', onVisibility)
  stopLoop = startLoop({ step: STEP, tick, after, draw: frame, paused: () => props.paused })
  // Development builds expose the match, for scripted play-testing
  if (import.meta.env.DEV) {
    window.__futsal = { get match () { return match }, get view () { return lastView }, get me () { return meIndex }, get mode () { return props.mode } }
  }
})

onUnmounted(() => {
  stopLoop?.()
  observer?.disconnect()
  stopFonts?.()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', releaseAll)
  document.removeEventListener('visibilitychange', onVisibility)
  if (import.meta.env.DEV) delete window.__futsal
})
</script>

<template>
  <ArcadeStage :t="t" :title="title" :exitLabel="exitLabel" @exit="emit('exit')">
    <template #actions>
      <slot name="actions" />
    </template>

    <div
      ref="area"
      class="relative flex-1 min-h-0 flex flex-col items-center justify-center gap-2 p-2 sm:p-4 touch-none"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @contextmenu.prevent
    >
      <!-- Scoreboard: each team's score boxed beside its name, the clock between, and a waiting kick-off under it -->
      <div class="w-full shrink-0 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4" :style="{ maxWidth: `${Math.max(box.w, 300)}px`, height: `${TOP_BAR}px` }" aria-hidden="true">
        <p class="flex items-center justify-end gap-2 min-w-0">
          <span class="truncate text-xs sm:text-sm font-semibold uppercase tracking-wider">(#) {{ teamNames[0] }}</span>
          <span class="score">{{ hud.score[0] }}</span>
        </p>
        <div class="text-center leading-none">
          <p :class="['font-display tabular-nums whitespace-nowrap', hud.golden ? 'text-lg' : 'text-3xl', { 'term-blink': hud.hurry }]">{{ hud.clock }}</p>
          <p class="h-3 mt-0.5 text-[10px] font-semibold uppercase tracking-widest term-muted whitespace-nowrap">{{ hud.status }}</p>
        </div>
        <p class="flex items-center gap-2 min-w-0">
          <span class="score">{{ hud.score[1] }}</span>
          <span class="truncate text-xs sm:text-sm font-semibold uppercase tracking-wider">{{ teamNames[1] }} ( )</span>
        </p>
      </div>
      <p class="sr-only" aria-live="polite">{{ teamNames[0] }} {{ hud.score[0] }}, {{ teamNames[1] }} {{ hud.score[1] }}</p>

      <div class="stage relative shrink-0" :style="{ width: `${box.w}px`, height: `${box.h}px` }">
        <canvas ref="canvas" class="block" role="img" :aria-label="title"></canvas>
        <slot name="overlay" />
      </div>

      <!-- What the controls do; on a touch screen each half of the screen is one of them -->
      <div class="w-full shrink-0 grid grid-cols-2 gap-2 text-xs uppercase tracking-widest" :style="{ maxWidth: `${box.w}px`, height: `${box.bottom}px` }" aria-hidden="true">
        <template v-if="!watching">
          <div class="border border-term-low flex items-center justify-center px-2 text-center term-muted">
            {{ touchUi ? t.futsalStickHint : t.futsalKeysHint }}
          </div>
          <div :class="['border flex flex-col items-center justify-center gap-1 px-2 text-center', hud.kicking ? 'border-term' : 'border-term-low term-muted']">
            <span class="font-semibold tracking-normal">{{ hud.kicking ? '((o))' : '(o)' }}</span>
            <span>{{ touchUi ? t.futsalHoldKick : t.futsalKickKeys }}</span>
          </div>
        </template>
        <div v-else class="col-span-2 border border-term-low flex items-center justify-center px-2 text-center term-muted">{{ t.futsalWatching }}</div>
      </div>

      <!-- The stick, under the finger that's steering -->
      <div v-if="stick.on" class="stick" :style="{ left: `${stick.x}px`, top: `${stick.y}px` }" aria-hidden="true">
        <span class="knob" :style="{ transform: `translate(${stick.kx}px, ${stick.ky}px)` }"></span>
      </div>
    </div>
  </ArcadeStage>
</template>

<style scoped>
.stage {
  box-shadow: 0 0 0 1px var(--color-term-low), 0 0 18px rgb(0 255 0 / 0.15);
}

.score {
  min-width: 2.4rem;
  padding: 0.2rem 0.4rem 0;
  border: 1px solid var(--color-term);
  font-family: var(--font-display);
  font-size: 2rem;
  line-height: 1;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.stick {
  position: absolute;
  width: 112px;
  height: 112px;
  margin: -56px 0 0 -56px;
  border: 1px dashed var(--color-term-dim);
  border-radius: 9999px;
  pointer-events: none;
}

.knob {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 44px;
  height: 44px;
  margin: -22px 0 0 -22px;
  border: 1px solid var(--color-term);
  border-radius: 9999px;
  background: rgb(0 255 0 / 0.15);
  box-shadow: 0 0 12px rgb(0 255 0 / 0.35);
}
</style>
