<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import {
  STEP, HALF_W, CIRCLE_R, RESTART_TIME,
  createMatch, stepMatch, setInput, pressKick, snapshot, viewOf, readSnapshot, attackDir, stepPlayer
} from './engine'
import { LEVELS, newBrain, botControls } from './bots'
import { createRenderer, VIEW_W, VIEW_H } from './renderer'
import ArcadeStage from '../ascii/ArcadeStage.vue'
import FullscreenButton from '../ascii/FullscreenButton.vue'
import { useFullscreen } from '../ascii/fullscreen'
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
// this player's team attacking up it. The full-screen switch leaves nothing on screen but the
// court, with the score small in a corner.
//
// In a solo game and on an online host this device runs the match (engine.js) and plays the
// bots. The host also sends everyone a snapshot of it many times a second and takes their
// controls in. Everyone else draws the snapshots a tenth of a second late, so motion stays
// smooth between them, and sends their own controls.
//
// A guest's own player doesn't wait for the host: it moves on this device the moment the
// controls change, by the same rules the host plays by. Each set of controls goes out with a
// number, and every snapshot says how many steps the host has played with the latest one it
// has. When a snapshot comes, the guest starts again from where the host has its player and
// plays back the steps the host hasn't got to yet, so the two agree; any small difference
// (a bump with another player, say) is eased away rather than jumped.

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
  snaps: { type: Array, default: null }, // guest: snapshots from the host, oldest first
  connection: { type: Object, default: null }, // guest: { kind: direct | relay, ms } on the way to the host
  pings: { type: Object, default: null } // host: id -> { ms, relay } for each guest
})

const emit = defineEmits(['exit', 'pause', 'snapshot', 'input', 'end'])

const DELAY = 0.1 // guests draw this far behind the host
const INPUT_MS = 30 // guests send their controls at most this often...
const INPUT_RESEND_MS = 250 // ...and at least this often, in case one got lost
const STALL_MS = 1500 // nothing from the host this long: say so
const AWAY_MS = 2000 // host: no controls from a guest this long and a bot plays for them
const HISTORY = 480 // guest: steps of its own controls kept for playing back (4 s)
const SNAP_TO = 4 // guest: a correction bigger than this (a line-up after a goal) jumps
const EASE = 12 // guest: how fast a small correction is eased away, per second
const STICK_RADIUS = 56 // CSS pixels a finger moves for full speed
const TOP_BAR = 44
const BOTTOM_BAR = 40 // a spectator's "you're watching" line
const GAP = 8
const MOVE_KEYS = {
  ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0]
}
const KICK_KEYS = new Set(['Space', 'KeyX', 'KeyK'])
const CONFETTI = ['*', '+', 'o', '.', "'", '*']

const area = ref(null)
const canvas = ref(null)
const box = reactive({ w: 0, h: 0, top: TOP_BAR, bottom: 0 })
const hud = reactive({ score: [0, 0], clock: '', status: '', golden: false, hurry: false })
const stick = reactive({ on: false, x: 0, y: 0, kx: 0, ky: 0 })
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

// Guest: its own player, moved here ahead of the host (see the top)
let inputSeq = 0 // numbers each set of controls sent
let sentKey = ''
let sent = { x: 0, y: 0, held: false } // the controls last sent, which the player here runs on
let history = [] // { q, k, x, y, held } for every step not yet confirmed: k counts the steps with controls q
let stepsOnSent = 0 // steps run so far on the controls last sent
let own = null // { x, y, vx, vy, team, px, py }: where this device has the player
const ownShift = { x: 0, y: 0 } // a correction still being eased away
let ownPhase = { phase: 'ready', kickoff: 0 } // from the latest snapshot
let drawAlpha = 0
const acks = new Map() // host: id -> { q, steps }: a guest's latest controls, and steps played with them

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
const upper = (text) => text.toLocaleUpperCase(props.t.langCode.toLowerCase())
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
  sentKey = ''
  sent = { x: 0, y: 0, held: false }
  stepsOnSent = 0
  history = []

  own = null
  ownShift.x = ownShift.y = 0
  acks.clear()
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

// Every touch on the play area belongs to the game: the browser gets none of them, so no pinch,
// double tap or drag can zoom or move the page. Buttons and the windows over the court (pause,
// full time) still work as usual.
function guardTouch (event) {
  if (!event.cancelable || event.target.closest?.('button, a, input, select, textarea, .term-window')) return
  event.preventDefault()
}

// ---------- Full screen ----------

// Just the court, filling the screen
const { full, toggle: toggleFull } = useFullscreen(() => area.value?.closest('.arena'))

function onFullClick (event) {
  sound.unlock()
  toggleFull(event)
}

watch(full, () => nextTick(fit))

// Guest: the controls go to the host as they change. The direction is rounded to one of 32
// headings and three speeds, so a wobbling thumb doesn't flood the connection.
function sendControls (now = false) {
  if (props.mode !== 'guest' || meIndex < 0) return
  const at = performance.now()
  const due = (key) => now || (key === lastSentKey ? at - lastSent >= INPUT_RESEND_MS : at - lastSent >= INPUT_MS)
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
  if (!due(key)) return
  // New controls get a new number; the player here runs on them from now, as the host will
  const controls = `${x},${y},${held}`
  if (controls !== sentKey) {
    sentKey = controls
    inputSeq++
    stepsOnSent = 0
    sent = { x, y, held: held === 1 }
  }
  lastSentKey = key
  lastSent = at
  emit('input', { r: props.round, x, y, h: held, n: kickCount, q: inputSeq })
}

// Guest: one step of its own player, on the controls last sent
function predict () {
  if (props.mode !== 'guest' || meIndex < 0) return
  sendControls()
  stepsOnSent++
  if (!own) return
  history.push({ q: inputSeq, k: stepsOnSent, x: sent.x, y: sent.y, held: sent.held })

  if (history.length > HISTORY) history.shift()
  own.px = own.x
  own.py = own.y
  stepPlayer(own, sent, ownPhase.phase, ownPhase.kickoff)
}

const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

// Guest: a new snapshot. Start from where the host has the player and play back the steps it
// hasn't seen yet; whatever that moves the player by on screen is eased away.
function reconcile (snap, acked) {
  if (meIndex < 0) return
  ownPhase = { phase: snap.phase, kickoff: snap.kickoff }
  const host = snap.players[meIndex]
  const ack = Array.isArray(acked?.[meIndex]) ? acked[meIndex] : null
  const next = { x: host.x, y: host.y, vx: ack ? num(ack[2]) : 0, vy: ack ? num(ack[3]) : 0, team: myTeam() }
  if (ack && Number.isInteger(ack[0]) && Number.isInteger(ack[1])) {
    const [q, steps] = ack
    // Controls the host has moved past are done with, and so are the steps it has played
    // with the ones it has now
    history = history.filter(entry => entry.q > q || (entry.q === q && entry.k > steps))
    for (const entry of history) stepPlayer(next, entry, snap.phase, snap.kickoff)
  } else {
    history = []
  }
  if (own) {
    const sx = own.x + ownShift.x - next.x
    const sy = own.y + ownShift.y - next.y
    const far = Math.hypot(sx, sy) > SNAP_TO
    ownShift.x = far ? 0 : sx
    ownShift.y = far ? 0 : sy
  }
  own = { ...next, px: next.x, py: next.y }
}

// Guest: where its own player is drawn this frame, or null to draw the host's
function ownSpot () {
  if (props.mode !== 'guest' || !own) return null
  return { x: lerp(own.px, own.x, drawAlpha) + ownShift.x, y: lerp(own.py, own.y, drawAlpha) + ownShift.y }
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
  // Count the steps played with each set of controls, for the guest to catch up from
  if (Number.isInteger(input.q)) {
    let ack = acks.get(id)
    if (!ack || ack.q !== input.q) acks.set(id, (ack = { q: input.q, steps: 0 }))
    ack.steps++
  }
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
  if (props.mode === 'guest') {
    predict()
    return
  }
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
    reconcile(snap, data.a)
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
    const spot = ownSpot()
    view.players.forEach((p, i) => {
      const entry = props.roster[i]
      if (!entry) return
      const me = i === meIndex
      const look = me ? 'me' : (mine < 0 ? entry.team === 0 : entry.team === mine) ? 'mate' : 'foe'
      const at = me && spot ? spot : p
      scene.players.push({ x: at.x, y: at.y, team: entry.team, mark: entry.mark || '?', look, held: me ? kickDown() : p.held, label: entry.bot ? '' : entry.name, marker: me })
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
  drawAlpha = alpha
  const ease = Math.exp(-EASE * dt)
  ownShift.x *= ease
  ownShift.y *= ease
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
  if (props.mode === 'host' && match) emit('snapshot', { r: props.round, ...snapshot(match), a: guestAcks() })
  sendControls()
}

// Host: for each guest playing, the number of their latest controls, the steps played with
// them, and how fast their player is going, so they can carry on from there
function guestAcks () {
  let acked = null
  props.roster.forEach((entry, i) => {
    const ack = acks.get(entry.id)
    if (entry.bot || !ack || !guestHere(entry.id)) return
    const p = match.players[i]
    acked ||= {}
    acked[i] = [ack.q, ack.steps, Math.round(p.vx * 100) / 100, Math.round(p.vy * 100) / 100]
  })
  return acked
}

// How the connection is doing, in amber in a corner of the court: a guest sees its own way to
// the host, the host sees each guest's
const netLines = computed(() => {
  if (props.mode === 'guest') {
    const c = props.connection
    if (!c?.kind) return []
    return [`${c.ms === null ? '--' : Math.round(c.ms)} ms · ${c.kind}`]
  }
  if (props.mode !== 'host' || !props.pings) return []
  const lines = props.roster
    .filter(entry => !entry.bot && entry.id !== props.myId && props.pings[entry.id])
    .map(entry => `${entry.name} ${props.pings[entry.id].ms} ms · ${props.pings[entry.id].relay ? 'relay' : 'direct'}`)
  return lines.length > 3 ? [...lines.slice(0, 3), `+${lines.length - 3}`] : lines
})

// The court keeps its shape and gets all the room it can, standing on end when that makes it
// clearly bigger, as on a phone held upright. Full screen, the scoreboard goes too.
function fit () {
  const el = area.value
  if (!el || !renderer) return
  const style = getComputedStyle(el)
  const w = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
  const h = el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
  box.top = full.value ? 0 : TOP_BAR
  box.bottom = watching.value ? BOTTOM_BAR : 0
  const gaps = (box.top ? GAP : 0) + (box.bottom ? GAP : 0)
  const room = Math.max(0, h - box.top - box.bottom - gaps)
  const flat = Math.min(w, (room * VIEW_W) / VIEW_H)
  const upright = Math.min(w, (room * VIEW_H) / VIEW_W)
  turn = upright / VIEW_H > (flat / VIEW_W) * 1.2 ? (myTeam() === 1 ? -1 : 1) : 0
  box.w = Math.floor(Math.max(0, turn ? upright : flat))
  box.h = Math.floor(turn ? (box.w * VIEW_W) / VIEW_H : (box.w * VIEW_H) / VIEW_W)
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
  for (const type of ['touchstart', 'touchmove', 'touchend']) area.value.addEventListener(type, guardTouch, { passive: false })
  stopLoop = startLoop({ step: STEP, tick, after, draw: frame, paused: () => props.paused })
  // Development builds expose the match, for scripted play-testing
  if (import.meta.env.DEV) {
    window.__futsal = { get match () { return match }, get view () { return lastView }, get me () { return meIndex }, get mode () { return props.mode }, get own () { return own && { ...own, shift: { ...ownShift }, history: history.length } } }

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
  <ArcadeStage :t="t" :title="title" :exitLabel="exitLabel" :bare="full" @exit="emit('exit')">
    <template #actions>
      <slot name="actions" />
      <FullscreenButton :t="t" @toggle="onFullClick" />
    </template>

    <div
      ref="area"
      :class="['relative flex-1 min-h-0 flex flex-col items-center justify-center gap-2 touch-none', full ? 'p-0' : 'p-2 sm:p-4']"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @contextmenu.prevent
    >
      <!-- Scoreboard: each team's score boxed beside its name, the clock between, and a waiting kick-off under it -->
      <div v-if="!full" class="w-full shrink-0 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4" :style="{ maxWidth: `${Math.max(box.w, 300)}px`, height: `${TOP_BAR}px` }" aria-hidden="true">
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
        <div v-if="netLines.length" class="net absolute right-1 bottom-1 pointer-events-none text-right" aria-hidden="true">
          <p v-for="line in netLines" :key="line">{{ line }}</p>
        </div>
        <slot name="overlay" />
      </div>

      <div v-if="watching" class="w-full shrink-0 border border-term-low flex items-center justify-center px-2 text-center text-xs uppercase tracking-widest term-muted" :style="{ maxWidth: `${Math.max(box.w, 300)}px`, height: `${box.bottom}px` }">{{ t.futsalWatching }}</div>

      <!-- Full screen: the score small in one corner and the way out in the other -->
      <template v-if="full">
        <p class="mini-score absolute left-2 top-2 z-10 pointer-events-none font-display text-xl leading-none tabular-nums whitespace-nowrap" aria-hidden="true">
          (#) {{ hud.score[0] }} : {{ hud.score[1] }} ( ) <span :class="['term-muted', { 'term-blink': hud.hurry }]">{{ hud.clock }}</span>
        </p>
        <FullscreenButton :t="t" full class="absolute right-2 top-2 z-10 bg-black/70" @toggle="onFullClick" />
      </template>

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

.net {
  padding: 0.1rem 0.3rem;
  background: rgb(0 0 0 / 0.55);
  color: #ffb000;
  font-size: 10px;
  line-height: 1.35;
  text-shadow: 0 0 4px rgb(255 176 0 / 0.5);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.mini-score {
  padding: 0.15rem 0.4rem 0;
  background: rgb(0 0 0 / 0.6);
  opacity: 0.85;
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
