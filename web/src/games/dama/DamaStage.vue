<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import {
  START_FEN, parseFen, legalMoves, applyMove, findMove, toSan, toFen, material, colorOf, rowOf, colOf, other, FILES
} from './engine'
import { createRenderer } from '../chess/renderer'
import ChessPiece from '../chess/ChessPiece.vue'
import { DAMA_PIECES, DAMA_SET } from './pieces'
import ArcadeStage from '../ascii/ArcadeStage.vue'
import { DIM, GREEN, watchFonts } from '../ascii/paint'
import { startLoop } from '../ascii/loop'
import { stepParticles, stepSpring } from '../ascii/physics'
import { makeBolt, boltGlyphs, boltAlpha, sparks, petal, rocket } from '../ascii/fx'
import { sound } from '../ascii/sound'
import { haptics } from '../ascii/haptics'

// The full-screen game of Dama, made from the chess one so the two look alike: the board drawn
// on a canvas that covers the whole play area, so the effects can use all of it, with both
// players' bars, the moves and the buttons laid out around it. The host keeps the game; this
// shows it, takes moves and plays the effects.
//
// A move is picked a hop at a time: the piece, then each square it lands on. As soon as only
// one legal move starts that way it's made, so a single capture or step takes one tap. It shows
// the moment it's made and goes out as `move` with the number of moves before it, so the host
// can tell a repeat from a new one; until the host has it, it goes again now and then. If the
// host never takes it (the clock ran out first), the board goes back to the host's position.

const props = defineProps({
  t: { type: Object, required: true },
  title: { type: String, required: true },
  exitLabel: { type: String, required: true },
  // A new game starts whenever this changes
  round: { type: Number, required: true },
  phase: { type: String, required: true }, // countdown | playing | over
  fen: { type: String, required: true },
  moves: { type: Array, required: true }, // [{ from, path, san }]
  myColor: { type: String, default: '' }, // w | b, or '' while watching
  names: { type: Object, required: true }, // w and b -> name
  online: { type: Object, required: true }, // w and b -> still connected
  scores: { type: Object, required: true }, // w and b -> points across games
  clock: { type: Number, default: 0 }, // minutes each, 0 for no clock
  times: { type: Object, required: true }, // w and b -> ms left when the turn began
  // The countdown's end, then while playing when the side to move runs out (Date.now() time)
  deadline: { type: Number, default: 0 },
  drawOffer: { type: String, default: '' }, // the side offering a draw
  claim: { type: String, default: '' }, // the side that may claim the win, the other having left
  outcome: { type: Object, default: null } // { winner, reason } once it's over
})

const emit = defineEmits(['exit', 'move', 'resign', 'draw', 'decline', 'claim'])

const STEP = 1 / 60
const BAR_H = 36
const ACTIONS_H = 40
const MOVES_H = 30
const GAP = 8
const SIDE_W = 264 // the column beside the board, in landscape
const SIDE_GAP = 24
const RESEND_SECONDS = 1.5 // a move the host hasn't answered for goes again
const GO_SECONDS = 0.8
const LOW_MS = 10000
const ARMED_SECONDS = 3 // how long Resign waits to be pressed again
const BOLT_SECONDS = 0.6

const area = ref(null)
const canvas = ref(null)
const boardEl = ref(null)
const movesEl = ref(null)
const box = reactive({ size: 0, landscape: false })
const ui = reactive({
  selected: -1,
  targets: [], // [{ sq, capture }]
  hops: [], // the squares picked so far along a capture
  turn: 'w',
  material: material(parseFen(START_FEN).board),
  clocks: { w: '', b: '' },
  low: { w: false, b: false },
  running: '',
  pendingSan: '',
  armed: false
})

const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let renderer = null
let observer = null
let stopLoop = null
let stopFonts = null

let pos = parseFen(START_FEN) // the position on screen
let ply = 0 // how many moves led to it
let legal = [] // the moves that can be made on it, when they're ours to make
let pending = null // our move until the host has it: { ply, from, path, sentAt }
let seenRound = -1
let started = false // the countdown is over
let lastCount = 0
let goTimer = 0
let ended = false // the finale has played
let clock = 0 // seconds on this screen, for effects
let later = [] // [{ at, run }] effects waiting their turn, on `clock`
let armedUntil = 0
let lastTick = 0 // the low-time second last ticked

// Per-square effects, read by the renderer
const pops = new Float32Array(64).fill(1)
const popSprings = Array.from({ length: 64 }, () => ({ value: 1, velocity: 0 }))
const glow = new Float32Array(64)
const reveal = new Float32Array(64)
const decode = new Float32Array(64)
const glitches = new Array(64).fill('')
let glitchClock = 0

let anims = [] // pieces gliding to their squares: { piece, fx, fy, tx, ty, sq, age, dur, victim, land }
let debris = [] // pieces knocked off the board
let fallen = new Set() // squares whose piece is gone in the finale
let particles = []
let bolts = []
let floats = []
let flash = 0
let shake = 0
let drag = null // { sq, id, x, y, sx, sy, moved, again } while a piece is held
const cursor = { x: { value: 4, velocity: 0 }, y: { value: 6, velocity: 0 }, sq: { x: 4, y: 6 }, shown: false }

const schedule = (delay, run) => later.push({ at: clock + delay, run })
const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const upper = (text) => text.toLocaleUpperCase(props.t.langCode.toLowerCase())

// ---------- Board geometry ----------

// Black sees the board from their side; anyone watching sees it from White's
const flipped = () => props.myColor === 'b'
const toScreen = (sq) => (flipped() ? { x: 7 - colOf(sq), y: 7 - rowOf(sq) } : { x: colOf(sq), y: rowOf(sq) })
const squareAt = (x, y) => (x < 0 || x > 7 || y < 0 || y > 7 ? -1 : flipped() ? (7 - y) * 8 + (7 - x) : y * 8 + x)
const files = () => (flipped() ? [...FILES].reverse() : [...FILES])
const ranks = () => (flipped() ? ['1', '2', '3', '4', '5', '6', '7', '8'] : ['8', '7', '6', '5', '4', '3', '2', '1'])

// ---------- The game on screen ----------

const isOn = () => props.phase === 'playing' || (props.phase === 'countdown' && Date.now() >= props.deadline)
const myTurn = () => !!props.myColor && !ended && !pending && isOn() && pos.turn === props.myColor

// Puts a position on screen and works out what can be done on it
function show (next, plies) {
  pos = next
  ply = plies
  legal = props.myColor && pos.turn === props.myColor ? legalMoves(pos) : []
  ui.turn = pos.turn
  ui.material = material(pos.board)
}

function newGame () {
  seenRound = props.round
  later = []
  anims = []
  debris = []
  fallen = new Set()
  particles = []
  bolts = []
  floats = []
  flash = 0
  shake = 0
  pending = null
  ui.pendingSan = ''
  ended = false
  drag = null
  glow.fill(0)
  decode.fill(0)
  reveal.fill(0)
  for (let i = 0; i < 64; i++) {
    popSprings[i].value = pops[i] = 1
    popSprings[i].velocity = 0
  }
  deselect()
  ui.armed = false
  show(parseFen(props.fen) || parseFen(START_FEN), props.moves.length)
  started = props.phase !== 'countdown' || Date.now() >= props.deadline
  lastCount = 0
  goTimer = 0
  lastTick = 0
  // A new game types itself in; a page that comes in mid-game just shows it
  if (props.phase === 'countdown' && !props.moves.length) typeIn()
  if (props.outcome) finale(true)
}

function typeIn () {
  for (let sq = 0; sq < 64; sq++) {
    const { x, y } = toScreen(sq)
    reveal[sq] = reduceMotion ? 0 : 0.08 + y * 0.09 + x * 0.025
  }
  if (!reduceMotion) sound.play('glitch')
}

// Brings the board in line with the host's game: our own move coming back, the other
// player's move, or anything else (a page catching up) shown as it is
function sync () {
  if (props.round !== seenRound) {
    newGame()
    return
  }
  const count = props.moves.length
  if (pending) {
    if (count <= pending.ply) {
      // The game ended before the host took our move: show its position
      if (props.phase === 'over') snap()
      return
    }
    const answer = props.moves[pending.ply]
    const ours = answer.from === pending.from && (answer.path || []).join() === pending.path.join()
    pending = null
    ui.pendingSan = ''
    if (!ours) {
      snap()
      return
    }
    if (count === ply) {
      show(pos, count)
      return
    }
  }
  if (count === ply) return
  if (count === ply + 1) {
    const last = props.moves[count - 1]
    const move = findMove(pos, last.from, last.path)
    if (move) {
      settle()
      const before = pos
      const after = applyMove(before, move)
      if (toFen(after) === props.fen) {
        show(after, count)
        played(before, move, after)
        return
      }
    }
  }
  snap()
}

function snap () {
  settle(true)
  pending = null
  ui.pendingSan = ''
  deselect()
  show(parseFen(props.fen) || pos, props.moves.length)
}

// ---------- Moving ----------

// The legal moves that start the way picked so far
const candidates = () => legal.filter(move => move.from === ui.selected && ui.hops.every((sq, i) => move.path[i] === sq))

function select (sq) {
  ui.selected = sq
  ui.hops = []
  aim()
}

// The next squares the piece can land on
function aim () {
  const seen = new Set()
  ui.targets = candidates()
    .filter(move => move.path.length > ui.hops.length)
    .map(move => move.path[ui.hops.length])
    .filter(sq => !seen.has(sq) && seen.add(sq))
    .map(sq => ({ sq, capture: false }))
}

function deselect () {
  ui.selected = -1
  ui.hops = []
  ui.targets = []
}

const isTarget = (sq) => ui.targets.some(target => target.sq === sq)

// A hop to a square: once only one move is left that starts this way, it's made
function tryMove (from, to, { slide = true } = {}) {
  if (from !== ui.selected) return
  ui.hops = [...ui.hops, to]
  const left = candidates()
  if (!left.length) {
    deselect()
    return
  }
  if (left.length === 1) {
    commit(left[0], { slide })
    return
  }
  sound.play('tock')
  haptics.buzz('tick')
  aim()
}

function commit (move, { slide = true } = {}) {
  const before = pos
  const san = toSan(before, move)
  pending = { ply, from: move.from, path: move.path, sentAt: 0 }
  ui.pendingSan = san
  send()
  deselect()
  settle()
  const after = applyMove(before, move)
  show(after, ply + 1)
  played(before, move, after, { slide })
}

function send () {
  pending.sentAt = clock
  emit('move', { from: pending.from, path: pending.path, ply: pending.ply })
}

// ---------- Effects ----------

// A move glides over a hop at a time (unless it was dropped there): a clack for a step, and
// every piece it jumps knocked off the board as it passes; a man that reaches the far row is
// crowned with a flicker and a chord
function played (before, move, after, { slide = true } = {}) {
  const glide = slide && !reduceMotion
  const stops = [move.from, ...move.path]
  let delay = 0
  move.path.forEach((sq, k) => {
    const from = toScreen(stops[k])
    const to = toScreen(sq)
    const victimSq = move.captures[k]
    const victim = victimSq !== undefined ? { piece: before.board[victimSq], ...toScreen(victimSq) } : null
    const last = k === move.path.length - 1
    const land = () => {
      if (victim) knockOff(victim)
      else sound.play('tock')
      haptics.buzz(victim ? 'hit' : 'tick')
      if (!last) return
      pop(move.to, 1.28)
      glow[move.to] = Math.max(glow[move.to], 0.6)
      if (move.promo) {
        decode[move.to] = reduceMotion ? 0 : 0.4
        schedule(reduceMotion ? 0 : 0.4, () => {
          sound.play('strum', 4, 5)
          glow[move.to] = 1
          pop(move.to, 1.4)
          const at = toScreen(move.to)
          rise(upper(props.t.damaCrowned), at.x + 0.5, at.y + 0.5)
        })
      }
    }
    const dur = 0.1 + Math.sqrt(Math.hypot(to.x - from.x, to.y - from.y)) * 0.06
    if (glide) anims.push({ piece: move.piece, fx: from.x, fy: from.y, tx: to.x, ty: to.y, sq: move.to, age: -delay, dur, victim, land })
    else land()
    delay += dur
  })
}

// Finishes every glide at once, landing and all, or quietly when the board is reset
function settle (quiet = false) {
  const landing = anims
  anims = []
  if (!quiet) landing.forEach(anim => anim.land())
}

function pop (sq, scale) {
  if (reduceMotion) return
  popSprings[sq].value = scale
  popSprings[sq].velocity = 0
}

// A taken piece flies off the board, spinning, in a spray of sparks
function knockOff ({ piece, x, y }) {
  sound.play('kick', 0.7)
  if (reduceMotion) return
  sparks(particles, x + 0.5, y + 0.5, { count: 12, speed: 6, life: 0.45 })
  debris.push({ piece, x: x + 0.5, y: y + 0.5, vx: (Math.random() * 2 - 1) * 3, vy: -4 - Math.random() * 3, angle: 0, spin: (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 5) })
  shake = Math.max(shake, 0.35)
}

// Text that rises from (x, y), in squares, and fades
function rise (text, x, y, size = 0.42) {
  // Kept on the board: a note over an edge file would hang off it
  const half = Math.min(4, text.length * size * 0.32 + 0.1)
  x = Math.min(8 - half, Math.max(half, x))
  floats.push({ text, x, y: y - 0.55, vy: -1.1, size, display: true, life: 1.2, ttl: 1.2 })
}

// Lightning from the top of the screen down to (x, y), in squares
function bolt (x, y) {
  if (reduceMotion || !renderer) return
  const top = renderer.bounds().top - 0.5
  bolts.push({ glyphs: boltGlyphs(makeBolt(x + (Math.random() * 2 - 1) * 2, top, x, y, { forks: 2 }), 0.3), age: 0, alpha: 1 })
}

function launch () {
  const b = renderer.bounds()
  const x = b.left + 1 + Math.random() * Math.max(1, b.right - b.left - 2)
  const top = Math.max(b.top + 1, -1) + Math.random() * 4
  sound.play('launch')
  rocket(particles, x, b.bottom, { height: b.bottom - top, size: 2 + Math.random(), onBurst: () => sound.play('pop') })
}

// The game is over: once the last move has landed, lightning strikes a mated king, a resigning
// king falls over, a flag falls with a drum, a draw brings petals down, and the winner gets
// fireworks
function finale (quiet = false) {
  if (ended) return
  ended = true
  if (quiet) settle(true)
  if (pending && props.moves.length <= pending.ply) snap()
  pending = null
  ui.pendingSan = ''
  deselect()
  ui.armed = false
  if (quiet) return
  const outcome = props.outcome
  const landed = anims.reduce((most, anim) => Math.max(most, anim.dur - anim.age), 0)
  schedule(landed, () => celebrate(outcome))
}

function celebrate ({ winner, reason }) {
  const loser = winner && other(winner)
  const kingSq = loser ? pos.board.findIndex(piece => colorOf(piece) === loser) : -1
  const king = kingSq >= 0 ? toScreen(kingSq) : null
  const topple = (delay) => schedule(delay, () => {
    if (reduceMotion) return
    fallen.add(kingSq)
    debris.push({ piece: pos.board[kingSq], x: king.x + 0.5, y: king.y + 0.5, vx: (Math.random() * 2 - 1) * 2, vy: -5, angle: 0, spin: (Math.random() < 0.5 ? -1 : 1) * 5 })
  })
  if (reason === 'pieces' || reason === 'blocked') {
    schedule(0.3, () => {
      if (king) bolt(king.x + 0.5, king.y + 0.5)
      sound.play('thunder')
      haptics.buzz(winner === props.myColor ? 'win' : 'over')
      if (!reduceMotion) {
        flash = 1
        shake = 1.2
        if (king) sparks(particles, king.x + 0.5, king.y + 0.5, { count: 18, speed: 8, life: 0.6 })
      }
    })
    if (king) topple(0.45)
  } else if (reason === 'resign') {
    sound.play('fall')
    if (king) topple(0.1)
  } else if (reason === 'time') {
    sound.play('taiko')
    haptics.buzz(winner === props.myColor ? 'win' : 'over')
    if (!reduceMotion) flash = 0.8
  } else if (!winner) {
    sound.play('rin')
    if (!reduceMotion) {
      const b = renderer.bounds()
      for (let k = 0; k < 30; k++) petal(particles, b.left + Math.random() * (b.right - b.left), b.top - Math.random() * 3, { life: 6, color: k % 3 ? DIM : GREEN })
    }
  }
  if (winner && winner === props.myColor) {
    schedule(0.6, () => sound.play('strum', 0, 9, 0.06))
    if (!reduceMotion) for (let k = 0; k < 6; k++) schedule(1 + k * 0.5, launch)
  }
}

// ---------- Clocks ----------

const hostTurn = () => props.fen.split(' ')[1] || 'w'

function formatClock (ms) {
  const left = Math.max(0, ms)
  if (left < LOW_MS) return `0:0${Math.floor(left / 1000)}.${Math.floor((left % 1000) / 100)}`
  const s = Math.ceil(left / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function updateClocks () {
  const running = props.phase === 'playing' ? hostTurn() : ''
  if (ui.running !== running) ui.running = running
  if (!props.clock) return
  for (const color of ['w', 'b']) {
    const ticking = running === color && props.deadline
    const ms = ticking ? props.deadline - Date.now() : props.times[color]
    const text = formatClock(ms)
    if (ui.clocks[color] !== text) ui.clocks[color] = text
    const low = !!ticking && ms < LOW_MS
    if (ui.low[color] !== low) ui.low[color] = low
    // Our own last seconds tick away out loud
    if (low && color === props.myColor && ms > 0) {
      const second = Math.ceil(ms / 1000)
      if (second !== lastTick) {
        lastTick = second
        sound.play('tick')
      }
    }
  }
}

// ---------- Simulation ----------

// The countdown ticks over the board, then Go! and White moves
function countdown () {
  if (started) return
  const msLeft = props.deadline - Date.now()
  if (props.phase === 'countdown' && msLeft > 0) {
    const count = Math.ceil(msLeft / 1000)
    if (count !== lastCount && count <= 3) sound.play('tick')
    lastCount = count
    return
  }
  started = true
  goTimer = GO_SECONDS
  sound.play('go')
  haptics.buzz('tap')
}

function tick () {
  clock += STEP
  for (let k = later.length - 1; k >= 0; k--) {
    if (later[k].at > clock) continue
    const { run } = later[k]
    later.splice(k, 1)
    run()
  }
  for (let i = 0; i < 64; i++) {
    const spring = popSprings[i]
    if (spring.value !== 1 || spring.velocity) {
      stepSpring(spring, 1, STEP, 320, 14)
      if (Math.abs(spring.value - 1) < 0.002 && Math.abs(spring.velocity) < 0.02) {
        spring.value = 1
        spring.velocity = 0
      }
      pops[i] = spring.value
    }
    if (reveal[i] > 0) {
      reveal[i] -= STEP
      if (reveal[i] <= 0 && pos.board[i]) decode[i] = 0.2
    }
  }
  for (let k = anims.length - 1; k >= 0; k--) {
    const anim = anims[k]
    anim.age += STEP
    if (anim.age < anim.dur) continue
    anims.splice(k, 1)
    anim.land()
  }
  stepSpring(cursor.x, cursor.sq.x, STEP, 700)
  stepSpring(cursor.y, cursor.sq.y, STEP, 700)
  const bottom = renderer ? renderer.bounds().bottom + 2 : 12
  for (const piece of debris) {
    piece.vy += 22 * STEP
    piece.x += piece.vx * STEP
    piece.y += piece.vy * STEP
    piece.angle += piece.spin * STEP
  }
  debris = debris.filter(piece => piece.y < bottom)
}

function after (dt) {
  updateClocks()
  if (pending && clock - pending.sentAt >= RESEND_SECONDS && isOn()) send()
  if (ui.armed && clock >= armedUntil) ui.armed = false
  goTimer = Math.max(0, goTimer - dt)
  flash = Math.max(0, flash - dt * 3)
  shake = Math.max(0, shake - dt * 3)
  for (let i = 0; i < 64; i++) {
    if (glow[i] > 0) glow[i] = Math.max(0, glow[i] - dt * 2.2)
    if (decode[i] > 0) decode[i] = Math.max(0, decode[i] - dt)
  }
  glitchClock += dt
  if (glitchClock >= 0.05) {
    glitchClock = 0
    for (let i = 0; i < 64; i++) {
      if (decode[i] <= 0) continue
      const side = colorOf(pos.board[i]) || 'w'
      glitches[i] = Math.random() < 0.5 ? side : side.toUpperCase()
    }
  }
  for (const b of bolts) {
    b.age += dt
    b.alpha = boltAlpha(b.age)
  }
  bolts = bolts.filter(b => b.age < BOLT_SECONDS)
  for (const f of floats) {
    f.life -= dt
    f.y += f.vy * dt
    f.alpha = Math.min(1, f.life / (f.ttl * 0.5))
  }
  floats = floats.filter(f => f.life > 0)
  stepParticles(particles, dt)
}

// ---------- Drawing ----------

// Get ready, who plays which side and the count, then Go!
function banners () {
  const texts = []
  if (!started && props.phase === 'countdown') {
    const role = props.myColor
      ? fmt(props.t.chessYouPlay, { color: props.myColor === 'w' ? props.t.chessWhite : props.t.chessBlack })
      : `${props.names.w} – ${props.names.b}`
    texts.push({ text: upper(props.t.chessGetReady), y: 2.5, size: 0.7, display: true })
    texts.push({ text: upper(role), y: 3.3, size: Math.min(0.55, 14 / role.length), display: true })
    texts.push({ text: String(Math.max(1, Math.ceil((props.deadline - Date.now()) / 1000))), y: 4.9, size: 2.2, display: true })
  } else if (goTimer > 0) {
    texts.push({ text: upper(props.t.chessGo), y: 4, size: 2, display: true, alpha: Math.min(1, goTimer / 0.3) })
  }
  return texts
}

function render () {
  if (!renderer) return
  const hidden = new Set(fallen)
  const moving = []
  for (const anim of anims) {
    hidden.add(anim.sq)
    if (anim.victim) moving.push({ piece: anim.victim.piece, x: anim.victim.x, y: anim.victim.y })
  }
  for (const anim of anims) {
    if (anim.age < 0) continue
    const k = Math.max(0, Math.min(1, anim.age / anim.dur))
    const eased = 1 - Math.pow(1 - k, 3)
    moving.push({ piece: anim.piece, x: anim.fx + (anim.tx - anim.fx) * eased, y: anim.fy + (anim.ty - anim.fy) * eased, scale: 1 + Math.sin(Math.PI * k) * 0.14 })
  }
  if (drag?.moved) moving.push({ piece: pos.board[drag.sq], x: drag.x - 0.5, y: drag.y - 0.5, scale: 1.22 })
  renderer.draw({
    board: pos.board,
    squareAt,
    files: files(),
    ranks: ranks(),
    lastMove: lastMove(),
    check: null,
    blink: Math.floor(clock * 2.5) % 2 === 0 || ended,
    selected: ui.selected >= 0 ? toScreen(ui.selected) : null,
    targets: ui.targets.map(target => ({ ...toScreen(target.sq), capture: target.capture })),
    cursor: cursor.shown && !ended ? { x: cursor.x.value, y: cursor.y.value } : null,
    hidden,
    ghost: drag?.moved ? drag.sq : -1,
    reveal,
    decode,
    glitches,
    pops,
    glow,
    moving,
    debris,
    particles,
    bolts,
    texts: [...floats, ...banners()],
    flash,
    shake
  })
}

function lastMove () {
  const move = pending || props.moves[ply - 1]
  return move ? [move.from, ...(move.path || [])].map(toScreen) : []
}

// ---------- Bars, moves and buttons ----------

const fmtScore = (points) => {
  const whole = Math.floor(points || 0)
  const half = (points || 0) - whole >= 0.5
  return half ? `${whole || ''}½` : String(whole)
}

// The other side above the board, yours below; someone watching has White below
const bottomColor = computed(() => (props.myColor === 'b' ? 'b' : 'w'))
const anyScore = computed(() => (props.scores.w || 0) + (props.scores.b || 0) > 0)
const bars = computed(() => [other(bottomColor.value), bottomColor.value].map((color, index) => ({
  slot: index ? 'bottom' : 'top',
  color,
  name: props.names[color] || '?',
  online: props.online[color],
  me: color === props.myColor,
  score: anyScore.value ? fmtScore(props.scores[color]) : '',
  // The other side's pieces this player has taken, best first
  taken: ui.material[color].taken,
  lead: ui.material[color].lead,
  time: ui.clocks[color],
  running: ui.running === color,
  low: ui.low[color],
  turn: props.phase === 'playing' && ui.turn === color
})))

// The moves so far, in pairs, ours included before the host has it
const moveRows = computed(() => {
  const list = props.moves.map(move => move.san)
  if (ui.pendingSan) list.push(ui.pendingSan)
  const rows = []
  for (let k = 0; k < list.length; k += 2) rows.push({ n: k / 2 + 1, white: list[k], black: list[k + 1] || '', last: k + 2 >= list.length ? (list.length % 2 ? 'w' : 'b') : '' })
  return rows
})

watch(() => props.moves.length + (ui.pendingSan ? 1 : 0), () => nextTick(() => {
  const el = movesEl.value
  if (!el) return
  el.scrollLeft = el.scrollWidth
  el.scrollTop = el.scrollHeight
}))

const playing = computed(() => !!props.myColor && (props.phase === 'playing' || props.phase === 'countdown'))
const offered = computed(() => props.drawOffer && props.drawOffer !== props.myColor ? props.drawOffer : '')
const opponent = computed(() => (props.myColor ? props.names[other(props.myColor)] || '?' : ''))
const opponentAway = computed(() => !!props.myColor && !props.online[other(props.myColor)])

function resign () {
  if (!ui.armed) {
    ui.armed = true
    armedUntil = clock + ARMED_SECONDS
    haptics.buzz('tick')
    return
  }
  ui.armed = false
  emit('resign')
}

// Clicked buttons let go of focus, so the keyboard keeps working on the board
function press (event, run) {
  sound.unlock()
  run()
  if (event.detail) event.currentTarget.blur()
}


// ---------- Layout and input ----------

// The board is as big as the screen allows with the bars and buttons above and below it, or
// beside it when that leaves a bigger board
function fit () {
  const el = area.value
  if (!el || !renderer) return
  const style = getComputedStyle(el)
  const w = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
  const h = el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
  const below = Math.min(w, h - BAR_H * 2 - ACTIONS_H - MOVES_H - GAP * 4)
  const beside = Math.min(h, w - SIDE_W - SIDE_GAP)
  box.landscape = beside > below
  box.size = Math.floor(Math.max(0, box.landscape ? beside : below) / 8) * 8
  renderer.resize(el.clientWidth, el.clientHeight, Math.min(window.devicePixelRatio || 1, 3))
  nextTick(placeBoard)
}

function placeBoard () {
  if (!renderer || !boardEl.value || !area.value) return
  const a = area.value.getBoundingClientRect()
  const b = boardEl.value.getBoundingClientRect()
  renderer.setBoard(b.left - a.left, b.top - a.top, box.size)
}

// Where on the board a pointer is, in squares on screen
function pointAt (event) {
  const rect = boardEl.value.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 8
  const y = ((event.clientY - rect.top) / rect.height) * 8
  return { x, y, sq: squareAt(Math.floor(x), Math.floor(y)) }
}

// A tap or a click picks a piece up, or puts the picked one down; a drag carries it there
function onPointerDown (event) {
  sound.unlock()
  if (!box.size || event.button > 0) return
  const { x, y, sq } = pointAt(event)
  if (sq < 0) return
  if (cursor.shown) moveCursorTo(toScreen(sq))
  if (ui.selected >= 0 && isTarget(sq)) {
    tryMove(ui.selected, sq)
    return
  }
  if (!myTurn() || colorOf(pos.board[sq]) !== props.myColor) {
    deselect()
    return
  }
  if (!legal.some(move => move.from === sq)) {
    if (legal[0]?.captures.length) mustTake(sq)
    deselect()
    return
  }
  const again = ui.selected === sq
  select(sq)
  drag = { sq, id: event.pointerId, x, y, sx: event.clientX, sy: event.clientY, moved: false, again }
  boardEl.value.setPointerCapture?.(event.pointerId)
}

// Taking is compulsory: the stones that can take pulse, and a note rises
function mustTake (sq) {
  const at = toScreen(sq)
  rise(upper(props.t.damaMustTake), at.x + 0.5, at.y + 0.5, 0.36)
  sound.play('board', 0.4)
  haptics.buzz('wrong')
  for (const from of new Set(legal.map(move => move.from))) {
    pop(from, 1.35)
    glow[from] = 1
  }
}

function onPointerMove (event) {
  if (!drag || event.pointerId !== drag.id) return
  const { x, y } = pointAt(event)
  drag.x = x
  drag.y = y
  if (!drag.moved && Math.hypot(event.clientX - drag.sx, event.clientY - drag.sy) > 6) drag.moved = true
}

function onPointerUp (event) {
  if (!drag || event.pointerId !== drag.id) return
  const held = drag
  drag = null
  if (held.moved) {
    const sq = squareAt(Math.floor(held.x), Math.floor(held.y))
    if (sq >= 0 && isTarget(sq) && myTurn()) tryMove(held.sq, sq, { slide: false })
  } else if (held.again) {
    deselect()
  }
}

function onPointerCancel () {
  drag = null
}

function moveCursorTo ({ x, y }) {
  cursor.sq = { x, y }
}

// The keyboard has a cursor of its own: arrows move it, Enter or Space picks up and puts down
function moveCursor (dx, dy) {
  if (!cursor.shown) {
    cursor.shown = true
    const start = ui.selected >= 0 ? toScreen(ui.selected) : cursor.sq
    cursor.x.value = start.x
    cursor.y.value = start.y
    cursor.x.velocity = cursor.y.velocity = 0
    moveCursorTo(start)
    return
  }
  moveCursorTo({ x: (cursor.sq.x + dx + 8) % 8, y: (cursor.sq.y + dy + 8) % 8 })
}

function pressCursor () {
  if (!cursor.shown) {
    moveCursor(0, 0)
    return
  }
  const sq = squareAt(cursor.sq.x, cursor.sq.y)
  if (ui.selected >= 0 && isTarget(sq)) tryMove(ui.selected, sq)
  else if (ui.selected === sq) deselect()
  else if (myTurn() && legal.some(move => move.from === sq)) select(sq)
  else if (myTurn() && colorOf(pos.board[sq]) === props.myColor && legal[0]?.captures.length) mustTake(sq)
  else deselect()
}

const MOVES = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  KeyW: [0, -1],
  KeyS: [0, 1],
  KeyA: [-1, 0],
  KeyD: [1, 0]
}

function onKey (event) {
  if (event.altKey || event.metaKey || event.ctrlKey) return
  if (event.target.closest?.('button') && (event.code === 'Enter' || event.code === 'Space')) return
  sound.unlock()
  const { code } = event
  if (MOVES[code]) {
    event.preventDefault()
    moveCursor(...MOVES[code])
  } else if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
    event.preventDefault()
    pressCursor()
  } else if (code === 'Escape') {
    deselect()
  }
}

watch(() => [props.round, props.moves.length, props.fen, props.phase], sync)
watch(() => props.outcome, (outcome) => {
  if (outcome && props.round === seenRound) finale()
})

onMounted(() => {
  renderer = createRenderer(canvas.value, DAMA_SET)
  observer = new ResizeObserver(fit)
  observer.observe(area.value)
  fit()
  stopFonts = watchFonts(() => renderer?.rebuild())
  window.addEventListener('keydown', onKey)
  newGame()
  stopLoop = startLoop({ step: STEP, before: countdown, tick, after, draw: render })
  // Development builds expose the game, for scripted play-testing
  if (import.meta.env.DEV) window.__dama = { get pos () { return pos }, get legal () { return legal }, select, tryMove }
})

onUnmounted(() => {
  stopLoop?.()
  observer?.disconnect()
  stopFonts?.()
  window.removeEventListener('keydown', onKey)
  if (import.meta.env.DEV) delete window.__dama
})
</script>

<template>
  <ArcadeStage :t="t" :title="title" :exitLabel="exitLabel" @exit="emit('exit')" @contextmenu.prevent>
    <div ref="area" class="relative flex-1 min-h-0 p-2 sm:p-4 touch-manipulation">
      <canvas ref="canvas" class="absolute inset-0 pointer-events-none" aria-hidden="true" />

      <div class="relative h-full flex items-center justify-center">
      <div
        :class="['layout', box.landscape ? 'is-landscape' : '']"
        :style="{ '--board': `${box.size}px`, '--side': `${SIDE_W}px` }"
      >
        <!-- Each player: name, games won, pieces taken and the clock -->
        <div
          v-for="bar in bars"
          :key="bar.slot"
          :class="['bar', bar.slot, { 'is-turn': bar.turn, 'is-me': bar.me }]"
        >
          <span class="side-mark" :title="bar.color === 'w' ? t.chessWhite : t.chessBlack"><ChessPiece type="king" :set="DAMA_PIECES" :color="bar.color" /></span>
          <span :class="['term-dot shrink-0', { 'is-off': !bar.online }]"></span>
          <span class="name truncate">{{ bar.name }}</span>
          <span v-if="bar.score" class="score tabular-nums" :aria-label="`${t.chessScore}: ${bar.score}`">[{{ bar.score }}]</span>
          <span class="taken" aria-hidden="true">
            <ChessPiece v-for="(type, index) in bar.taken" :key="index" :type="type" :set="DAMA_PIECES" :color="bar.color === 'w' ? 'b' : 'w'" />
            <span v-if="bar.lead" class="lead">+{{ bar.lead }}</span>
          </span>
          <span v-if="clock" :class="['clock font-display tabular-nums', { 'is-running': bar.running, 'is-low': bar.low }]">{{ bar.time }}</span>
        </div>

        <!-- The board itself is drawn on the canvas, under this -->
        <div
          ref="boardEl"
          class="board cursor-pointer touch-none"
          role="grid"
          :aria-label="t.damaTitle"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerCancel"
        />

        <!-- Resign, draws, claiming the win; or a note for anyone watching -->
        <div class="actions">
          <template v-if="playing">
            <template v-if="claim === myColor">
              <button type="button" class="term-btn term-btn-primary act flex-1" @click="press($event, () => emit('claim'))">{{ t.chessClaim }}</button>
            </template>
            <template v-else-if="opponentAway">
              <span class="flex-1 min-w-0 text-xs leading-snug term-muted">&gt; {{ fmt(t.chessOpponentLeft, { name: opponent }) }}</span>
              <button type="button" :class="['term-btn act', { 'term-btn-primary': ui.armed }]" @click="press($event, resign)">
                {{ ui.armed ? t.chessResignSure : t.chessResign }}
              </button>
            </template>
            <template v-else-if="offered">
              <span class="offer-text text-sm">&gt; {{ fmt(t.chessDrawOffer, { name: opponent }) }}</span>
              <button type="button" class="term-btn term-btn-primary act flex-1" @click="press($event, () => emit('draw'))">{{ t.chessAccept }}</button>
              <button type="button" class="term-btn act flex-1" @click="press($event, () => emit('decline'))">{{ t.chessDecline }}</button>
            </template>
            <template v-else>
              <button
                type="button"
                class="term-btn act flex-1"
                :disabled="phase !== 'playing' || drawOffer === myColor"
                @click="press($event, () => emit('draw'))"
              >
                {{ drawOffer === myColor ? t.chessDrawOffered : t.chessOfferDraw }}
              </button>
              <button type="button" :class="['term-btn act flex-1', { 'term-btn-primary': ui.armed }]" @click="press($event, resign)">
                {{ ui.armed ? t.chessResignSure : t.chessResign }}
              </button>
            </template>
          </template>
          <p v-else-if="!myColor" class="text-sm term-muted truncate">&gt; {{ t.chessWatching }}</p>
        </div>

        <!-- The moves so far: one scrolling line in portrait, a list in landscape -->
        <ol ref="movesEl" class="moves" :aria-label="t.chessMoves">
          <li v-for="row in moveRows" :key="row.n" class="move-row">
            <span class="n">{{ row.n }}.</span>
            <span :class="['san', { 'is-last': row.last === 'w' }]">{{ row.white }}</span>
            <span :class="['san', { 'is-last': row.last === 'b' }]">{{ row.black }}</span>
          </li>
        </ol>

      </div>
      </div>

      <slot name="overlay" />
    </div>
  </ArcadeStage>
</template>

<style scoped>
/* One set of pieces, two layouts: in portrait everything stacks round the board, in landscape
   the bars, moves and buttons make a column beside it */
.layout {
  display: grid;
  justify-content: center;
  align-content: center;
  grid-template-columns: var(--board);
  grid-template-areas: "top" "board" "bottom" "actions" "moves";
  row-gap: 8px;
}
.layout.is-landscape {
  grid-template-columns: var(--board) var(--side);
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  grid-template-areas:
    "board top"
    "board moves"
    "board actions"
    "board bottom";
  column-gap: 24px;
  height: var(--board);
}

.board {
  grid-area: board;
  width: var(--board);
  height: var(--board);
}
.is-landscape .board {
  align-self: center;
}
.board-over {
  grid-area: board;
  z-index: 10;
  width: var(--board);
  height: var(--board);
}

.bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 36px;
  min-width: 0;
  padding: 0 0 0 0.5rem;
  border: 1px solid var(--color-term-low);
  font-size: 0.875rem;
  color: var(--color-term-dim);
}
.bar.top {
  grid-area: top;
}
.bar.bottom {
  grid-area: bottom;
}
.bar.is-me {
  color: var(--color-term);
}
.bar.is-turn {
  border-color: var(--color-term);
  box-shadow: 0 0 8px rgb(0 255 0 / 0.25);
}
.bar .name {
  flex: 0 1 auto;
  font-weight: 600;
}
.bar .score {
  flex-shrink: 0;
  font-size: 0.75rem;
}
/* Taken pieces overlap a little, like a row of them set down beside the board */
.bar .taken {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  overflow: hidden;
  font-size: 1.1rem;
}
.bar .taken .chess-piece + .chess-piece {
  margin-left: -0.35em;
}
.bar .lead {
  margin-left: 0.3rem;
  font-size: 0.75rem;
  color: var(--color-term);
  font-weight: 600;
}
.bar .clock {
  flex-shrink: 0;
  align-self: stretch;
  display: flex;
  align-items: center;
  margin-left: auto;
  padding: 0 0.6rem;
  min-width: 4.6rem;
  justify-content: flex-end;
  border-left: 1px solid var(--color-term-low);
  font-size: 1.6rem;
  line-height: 1;
  color: var(--color-term-dim);
}
.bar .clock.is-running {
  background: var(--color-term);
  color: var(--color-black);
}
.bar .clock.is-low {
  animation: low 1s steps(2, jump-none) infinite;
}

/* The side a player has: a king in that side's color */
.side-mark {
  display: flex;
  flex-shrink: 0;
  font-size: 1.5rem;
}

.actions {
  grid-area: actions;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem 0.5rem;
  min-height: 40px;
  min-width: 0;
}
/* A draw offer gets a line of its own above the buttons */
.offer-text {
  flex-basis: 100%;
  min-width: 0;
}
.act {
  min-height: 36px;
  min-width: 0;
  padding: 0.2rem 0.5rem;
  gap: 0.35rem;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  line-height: 1.15;
}

.moves {
  grid-area: moves;
  display: flex;
  gap: 0.9rem;
  height: 30px;
  align-items: center;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  white-space: nowrap;
  font-size: 0.8rem;
  border-top: 1px dashed var(--color-term-low);
}
.moves::-webkit-scrollbar {
  display: none;
}
.is-landscape .moves {
  display: grid;
  grid-template-columns: 1fr;
  align-content: start;
  gap: 0;
  height: auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: thin;
  border: 1px solid var(--color-term-low);
  padding: 0.25rem 0;
}
.move-row {
  display: inline-flex;
  gap: 0.4rem;
}
.is-landscape .move-row {
  display: grid;
  grid-template-columns: 2.5rem 1fr 1fr;
  padding: 0.1rem 0.5rem;
}
.move-row .n {
  color: var(--color-term-low);
}
.move-row .san.is-last {
  background: var(--color-term);
  color: var(--color-black);
  padding: 0 0.2rem;
}


@keyframes low {
  0% { opacity: 1; }
  50% { opacity: 0.45; }
}

@media (prefers-reduced-motion: reduce) {
  .bar .clock.is-low {
    animation: none;
  }
}
</style>
