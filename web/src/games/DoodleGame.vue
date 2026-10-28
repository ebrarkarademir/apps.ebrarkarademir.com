<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted, markRaw } from 'vue'
import confetti from 'canvas-confetti'
import { useOnlineRoom } from '../online/useOnlineRoom'
import OnlineRoom from '../online/OnlineRoom.vue'
import DoodleBoard from './doodle/DoodleBoard.vue'
import { createSketch, SHADES, ERASER, SIZES } from './doodle/sketch'
import { WORDS, LANGS, shownWord, isRightGuess, isCloseGuess, hintFor, pickChoices } from './doodle/words'
import { sound } from './ascii/sound'
import { haptics } from './ascii/haptics'

const props = defineProps({
  t: { type: Object, required: true },
  // Room code from a shared invite link
  initialCode: { type: String, default: '' },
  // Open a room straight away: a chat invite is waiting for its code
  hostRoom: { type: Boolean, default: false }
})

defineEmits(['go-back'])

const CHOOSE_MS = 15000
const REVEAL_MS = 6000
const ROUND_OPTIONS = [1, 2, 3]
const TIME_OPTIONS = [60, 90, 120]
const HINT_AT = [0.5, 0.75] // shares of the drawing time after which another letter shows
const MAX_CHAT = 40
const MAX_TEXT = 60
const SAY_GAP_MS = 350 // one message per player this often, at most
const SEND_MS = 50 // how often the drawer's newest points go out
const SYNC_RETRY_MS = 3000
const TIMER_CELLS = 24
const TOOLS = [
  { id: 'pen', icon: '[/]', key: 'P', label: 'doodlePen' },
  { id: 'fill', icon: '[%]', key: 'F', label: 'doodleFill' },
  { id: 'eraser', icon: '[x]', key: 'E', label: 'doodleEraser' }
]

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')

// ---------- Host-side game rules ----------
// A turn: the drawer picks a word ('choose'), draws it while the others guess in the chat
// ('draw'), then everyone sees the word and the points ('reveal'). Every player draws once a
// round; after the last round come the final scores.

const isOnline = (s, id) => s.players.some(p => p.id === id && p.online)
const guessersOnline = (s) => s.players.filter(p => p.online && p.id !== s.drawer)
const everyoneGuessed = (s) => {
  const list = guessersOnline(s)
  return list.length > 0 && list.every(p => s.guessed.includes(p.id))
}

function say (s, message) {
  s.chat.push({ id: ++s.chatId, ...message })
  if (s.chat.length > MAX_CHAT) s.chat.splice(0, s.chat.length - MAX_CHAT)
}

// The next online player in the order draws; after the last one a new round begins
function nextTurn (s) {
  for (let tries = 0; tries <= s.order.length * (s.rounds + 1); tries++) {
    s.drawerIndex++
    if (s.drawerIndex >= s.order.length) {
      s.drawerIndex = 0
      s.round++
      if (s.round > s.rounds) break
    }
    const id = s.order[s.drawerIndex]
    if (!isOnline(s, id)) continue
    Object.assign(s, {
      phase: 'choose',
      turn: s.turn + 1,
      drawer: id,
      choices: pickChoices(s.used),
      word: null,
      level: 0,
      revealed: 0,
      guessed: [],
      gained: {},
      ended: null,
      deadline: Date.now() + CHOOSE_MS
    })
    say(s, { kind: 'turn', by: id })
    return
  }
  Object.assign(s, { phase: 'final', drawer: null, choices: [], deadline: null })
}

function chooseWord (s, slot) {
  const id = s.choices[slot]
  if (id === undefined) return
  s.used.push(id)
  Object.assign(s, {
    phase: 'draw',
    word: id,
    level: WORDS[id].level,
    choices: [],
    revealed: 0,
    drawMs: s.seconds * 1000,
    deadline: Date.now() + s.seconds * 1000
  })
}

// The drawer earns the average of what the guessers scored, so a drawing that everyone gets
// quickly pays best
function endTurn (s, reason) {
  const could = s.players.filter(p => p.id !== s.drawer && (p.online || s.guessed.includes(p.id)))
  const total = s.guessed.reduce((sum, id) => sum + (s.gained[id] || 0), 0)
  const earned = could.length ? Math.round(total / could.length / 5) * 5 : 0
  if (earned) {
    s.gained[s.drawer] = earned
    s.scores[s.drawer] = (s.scores[s.drawer] || 0) + earned
  }
  Object.assign(s, { phase: 'reveal', ended: reason, deadline: Date.now() + REVEAL_MS })
  say(s, { kind: 'word', word: s.word })
}

// A chat line, which while someone draws is also a guess
function hear (s, playerId, raw) {
  const text = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT)
  const now = Date.now()
  if (!text || s.phase === 'lobby' || now - (s.spoke[playerId] || 0) < SAY_GAP_MS) return
  s.spoke[playerId] = now
  if (s.phase !== 'draw') {
    say(s, { kind: 'say', by: playerId, text })
    return
  }
  // No spelling the word out: the drawer can't type while drawing
  if (playerId === s.drawer) return
  // Those who know the word only talk among themselves
  if (s.guessed.includes(playerId)) {
    say(s, { kind: 'inner', by: playerId, text, aud: [s.drawer, ...s.guessed] })
    return
  }
  if (isRightGuess(text, s.word, s.langs[playerId])) {
    // 40 to 100 points, more the quicker the guess, times the word's level
    const left = Math.max(0, s.deadline - now) / s.drawMs
    const points = s.level * Math.round((40 + 60 * left) / 5) * 5
    s.guessed.push(playerId)
    s.gained[playerId] = points
    s.scores[playerId] = (s.scores[playerId] || 0) + points
    say(s, { kind: 'got', by: playerId, n: points })
    if (everyoneGuessed(s)) endTurn(s, 'all')
    return
  }
  say(s, { kind: 'say', by: playerId, text })
  if (isCloseGuess(text, s.word)) say(s, { kind: 'close', by: playerId, text, to: playerId })
}

function onAction (s, playerId, action) {
  const isHost = playerId === s.hostId
  switch (action.type) {
    case 'lang':
      if (LANGS.includes(action.lang)) s.langs[playerId] = action.lang
      break
    case 'settings':
      if (!isHost || s.phase !== 'lobby') return
      if (ROUND_OPTIONS.includes(action.rounds)) s.rounds = action.rounds
      if (TIME_OPTIONS.includes(action.seconds)) s.seconds = action.seconds
      if (typeof action.hints === 'boolean') s.hints = action.hints
      break
    case 'start': {
      const playing = s.players.filter(p => p.online)
      if (!isHost || s.phase !== 'lobby' || playing.length < 2) return
      Object.assign(s, {
        order: playing.map(p => p.id),
        scores: Object.fromEntries(s.players.map(p => [p.id, 0])),
        round: 1,
        drawerIndex: -1,
        used: [],
        chat: []
      })
      nextTurn(s)
      break
    }
    case 'choose':
      if (s.phase === 'choose' && playerId === s.drawer && [0, 1, 2].includes(action.slot)) chooseWord(s, action.slot)
      break
    case 'giveUp':
      if (s.phase === 'draw' && playerId === s.drawer) endTurn(s, 'skip')
      break
    case 'say':
      hear(s, playerId, action.text)
      break
    case 'again':
      if (!isHost || s.phase !== 'final') return
      Object.assign(s, { phase: 'lobby', players: s.players.filter(p => p.online), drawer: null, word: null, chat: [], round: 0 })
      break
  }
}

const room = useOnlineRoom({
  game: 'doodle',
  initialCode: props.initialCode,
  hostRoom: props.hostRoom,
  initialState: () => ({
    rounds: 2,
    seconds: 90,
    hints: true,
    round: 0,
    turn: 0, // keeps counting across games, so drawing messages from an old turn are easy to spot
    order: [],
    drawerIndex: -1,
    drawer: null,
    choices: [],
    word: null,
    level: 0,
    drawMs: 0,
    deadline: null,
    revealed: 0,
    guessed: [],
    gained: {},
    ended: null,
    scores: {},
    langs: {},
    chat: [],
    chatId: 0,
    used: [],
    spoke: {}
  }),
  // Guessers never get the word: only the hint, built in their own language. Players who know
  // it see it, and the chat lines meant for them.
  project: (s, playerId) => {
    const { used, spoke, langs, choices, word, chat, ...visible } = s
    const drawing = playerId === s.drawer
    const knows = drawing || s.guessed.includes(playerId) || s.phase === 'reveal' || s.phase === 'final'
    return {
      ...visible,
      word: knows ? word : null,
      choices: drawing && s.phase === 'choose' ? choices : [],
      hint: s.phase === 'draw' && !knows ? hintFor(word, langs[playerId] || 'EN', s.revealed, s.turn * 7919 + word) : null,
      chat: chat.filter(m => (m.to ? m.to === playerId : m.aud ? m.aud.includes(playerId) : true))
    }
  },
  onAction,
  onJoin: (s, player) => {
    s.scores[player.id] ??= 0
    // Joining mid-game: guess straight away, draw later in the round
    if (s.phase !== 'lobby' && !s.order.includes(player.id)) s.order.push(player.id)
  },
  onLeave: (s, player) => {
    if (s.phase === 'choose' && player.id === s.drawer) {
      say(s, { kind: 'skip', by: player.id })
      nextTurn(s)
    } else if (s.phase === 'draw') {
      if (player.id === s.drawer) endTurn(s, 'gone')
      else if (everyoneGuessed(s)) endTurn(s, 'all')
    }
  },
  onTick: (s, now) => {
    if (s.phase === 'choose' && now >= s.deadline) {
      chooseWord(s, Math.floor(Math.random() * s.choices.length))
    } else if (s.phase === 'draw') {
      if (now >= s.deadline) {
        endTurn(s, 'time')
      } else if (s.hints) {
        const due = HINT_AT.filter(at => now >= s.deadline - s.drawMs * (1 - at)).length
        if (due > s.revealed) s.revealed = due
      }
    } else if (s.phase === 'reveal' && now >= s.deadline) {
      nextTurn(s)
    }
  },
  onEvent
})

// ---------- The drawing, on every device ----------
// The drawer's strokes travel as events numbered per turn: 'line' starts a stroke, 'more' adds
// points to it, 'fill', 'clear' and 'undo' do what they say. Anyone who misses one (or joins
// mid-turn) asks for the whole drawing with 'sync', and the host, which passes every message
// on and so always has the full drawing, sends it back with 'all'.

const sketch = markRaw(createSketch())
// turn: whose drawing this is; q: the last message applied (or sent, for the drawer);
// ready: false while waiting for the whole drawing
const board = reactive({ turn: 0, q: 0, ready: true })
const DRAWING = ['line', 'more', 'fill', 'clear', 'undo']
let syncTimer = null
// The drawer's side
let opCount = 0
let current = null // the stroke being drawn
let pending = [] // its points that haven't gone out yet
let sendTimer = null

function newBoard (turn, ready) {
  board.turn = turn
  board.q = 0
  board.ready = ready
  current = null
  pending = []
  sketch.reset()
}

function requestSync () {
  clearTimeout(syncTimer)
  // The host passes every message on, so it already has all of them
  if (room.isHost) {
    board.ready = true
    return
  }
  board.ready = false
  room.sendEvent({ k: 'sync', turn: board.turn })
  syncTimer = setTimeout(() => { if (!board.ready) requestSync() }, SYNC_RETRY_MS)
}

function applyDrawing (m) {
  if (m.k === 'line') sketch.add({ id: m.id, t: 'line', c: m.c, w: m.w, p: m.p })
  else if (m.k === 'more') sketch.extend(m.id, m.p)
  else if (m.k === 'fill') sketch.add({ id: m.id, t: 'fill', c: m.c, x: m.x, y: m.y })
  else if (m.k === 'clear') sketch.add({ id: m.id, t: 'clear' })
  else if (m.k === 'undo') sketch.undo()
}

function onEvent (data, from) {
  if (!data || typeof data !== 'object' || typeof data.turn !== 'number') return
  if (data.k === 'sync') {
    if (room.isHost && data.turn === board.turn) room.sendEventTo(from, { k: 'all', turn: board.turn, q: board.q, ops: sketch.ops })
    return
  }
  if (data.k === 'all') {
    if (from !== room.view?.hostId || data.turn < board.turn) return
    if (data.turn > board.turn) newBoard(data.turn, false)
    sketch.load(data.ops)
    board.q = Number(data.q) || 0
    board.ready = true
    clearTimeout(syncTimer)
    return
  }
  if (!DRAWING.includes(data.k) || from !== room.view?.drawer || data.turn < board.turn) return
  // A new turn's first strokes can get here before the state saying it began
  if (data.turn > board.turn) newBoard(data.turn, true)
  if (data.q <= board.q) return
  if (data.q !== board.q + 1) {
    if (board.ready) requestSync()
    return
  }
  board.q = data.q
  applyDrawing(data)
}

const view = computed(() => room.view)
const phase = computed(() => view.value?.phase)

// A turn seen from its start gets a blank board; one already under way asks for its drawing
watch(() => [view.value?.turn, phase.value], ([turn, stage]) => {
  if (!turn || turn <= board.turn) return
  if (stage === 'choose') {
    newBoard(turn, true)
  } else if (stage === 'draw' || stage === 'reveal') {
    newBoard(turn, false)
    requestSync()
  }
}, { immediate: true })

// ---------- Drawing (the drawer) ----------

const tool = ref('pen')
const shade = ref(0)
const size = ref(1)

const amDrawer = computed(() => !!view.value && view.value.drawer === room.myId)
const canDraw = computed(() => phase.value === 'draw' && amDrawer.value && board.ready)

const newId = () => `${room.myId.slice(0, 4)}-${board.turn}-${++opCount}`

function send (message) {
  board.q++
  room.sendEvent({ ...message, turn: board.turn, q: board.q })
}

function flushPoints () {
  clearTimeout(sendTimer)
  sendTimer = null
  if (current && pending.length) send({ k: 'more', id: current, p: pending })
  pending = []
}

function startStroke (x, y) {
  if (!canDraw.value) return
  flushPoints()
  const op = { id: newId(), t: 'line', c: tool.value === 'eraser' ? ERASER : SHADES[shade.value], w: SIZES[size.value], p: [x, y] }
  if (!sketch.add(op)) return
  current = op.id
  send({ k: 'line', id: op.id, c: op.c, w: op.w, p: op.p })
}

function moveStroke (points) {
  if (!current || !canDraw.value || !sketch.extend(current, points)) return
  pending.push(...points)
  sendTimer ??= setTimeout(flushPoints, SEND_MS)
}

function endStroke () {
  flushPoints()
  current = null
}

function fillAt (x, y) {
  if (!canDraw.value) return
  const op = { id: newId(), t: 'fill', c: SHADES[shade.value], x, y }
  if (sketch.add(op)) send({ k: 'fill', id: op.id, c: op.c, x, y })
}

function undo () {
  if (!canDraw.value) return
  endStroke()
  if (sketch.undo()) send({ k: 'undo' })
}

function clearBoard () {
  if (!canDraw.value || !sketch.ops.length) return
  endStroke()
  const id = newId()
  if (sketch.add({ id, t: 'clear' })) send({ k: 'clear', id })
}

function pickShade (index) {
  shade.value = index
  if (tool.value === 'eraser') tool.value = 'pen'
}

// P, F and E pick a tool, 1 to 3 a size, Ctrl+Z undoes
function onKey (event) {
  sound.unlock()
  if (!canDraw.value || event.altKey || event.target.closest?.('input, textarea')) return
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    undo()
    return
  }
  if (event.ctrlKey || event.metaKey) return
  const key = event.key.toUpperCase()
  const picked = TOOLS.find(item => item.key === key)
  if (picked) tool.value = picked.id
  else if (['1', '2', '3'].includes(key)) size.value = Number(key) - 1
}

// ---------- View ----------

const lang = computed(() => (LANGS.includes(props.t.langCode) ? props.t.langCode : 'EN'))
const upper = (text) => text.toLocaleUpperCase(lang.value.toLowerCase())
const players = computed(() => view.value?.players || [])
const nameOf = (id) => players.value.find(p => p.id === id)?.name || '?'
const iGuessed = computed(() => !!view.value?.guessed?.includes(room.myId))
const shown = (id) => upper(shownWord(id, lang.value))
const wordText = computed(() => (view.value?.word != null ? shown(view.value.word) : ''))

// The word in the room's other languages, once everyone may see it
const otherSpellings = computed(() => {
  const id = view.value?.word
  if (id == null) return ''
  const mine = shownWord(id, lang.value)
  return [...new Set(LANGS.map(code => shownWord(id, code)))].filter(word => word !== mine).join(' · ')
})

// Tell the host which language to build this player's hints in
watch([() => room.screen, lang], () => {
  if (room.screen === 'room') room.act('lang', { lang: lang.value })
}, { immediate: true })

const hintChars = computed(() => [...(view.value?.hint || '')].map(ch => (ch === '_' || ch === ' ' ? ch : upper(ch))))
const hintLengths = computed(() => (view.value?.hint || '').split(' ').filter(Boolean).map(part => part.length).join(' '))
const hintLabel = computed(() => hintChars.value.map(ch => (ch === '_' ? '?' : ch)).join(''))

const levelStars = (level) => `[${'*'.repeat(level)}${'.'.repeat(3 - level)}]`
const levelName = (level) => [props.t.doodleEasy, props.t.doodleMedium, props.t.doodleHard][level - 1]

const msLeft = computed(() => Math.max(0, (view.value?.deadline || 0) - room.now))
const phaseMs = computed(() => (phase.value === 'draw' ? view.value.drawMs : phase.value === 'choose' ? CHOOSE_MS : REVEAL_MS))
// The shared clock ticks four times a second, so cap the count at the phase's own length
const secondsLeft = computed(() => Math.min(Math.ceil(msLeft.value / 1000), Math.round(phaseMs.value / 1000)))
// [#################.......] draining as the clock runs
const timerBar = computed(() => {
  const filled = Math.ceil(Math.min(1, msLeft.value / (phaseMs.value || 1)) * TIMER_CELLS)
  return '#'.repeat(filled) + '.'.repeat(TIMER_CELLS - filled)
})

const endedText = computed(() => ({
  time: props.t.doodleTimeUp,
  all: props.t.doodleAllGuessed,
  gone: props.t.doodleDrawerLeft,
  skip: props.t.doodleGaveUp
})[view.value?.ended] || '')

const leaderboard = computed(() =>
  players.value
    .map(p => ({ ...p, score: view.value.scores?.[p.id] || 0, gained: view.value.gained?.[p.id] || 0 }))
    .sort((a, b) => b.score - a.score)
)
const isTie = computed(() => leaderboard.value.length > 1 && leaderboard.value[0].score === leaderboard.value[1].score)
const turnResults = computed(() =>
  Object.entries(view.value?.gained || {})
    .map(([id, n]) => ({ id, n, name: nameOf(id), drew: id === view.value.drawer }))
    .sort((a, b) => b.n - a.n)
)

// ---------- Chat ----------

const text = ref('')
const chatBox = ref(null)

const inputHint = computed(() => {
  if (phase.value !== 'draw') return props.t.doodleChatHere
  return iGuessed.value ? props.t.doodleInnerHere : props.t.doodleGuessHere
})

function sendText () {
  const line = text.value.trim()
  if (!line) return
  room.act('say', { text: line })
  text.value = ''
}

function describe (m) {
  const name = nameOf(m.by)
  switch (m.kind) {
    case 'say': return { who: name, text: m.text, mine: m.by === room.myId }
    case 'inner': return { who: name, text: m.text, mine: m.by === room.myId, inner: true }
    case 'got': return { note: m.by === room.myId ? fmt(props.t.doodleYouGotIt, { n: m.n }) : fmt(props.t.doodleGotIt, { name, n: m.n }), style: 'got' }
    case 'close': return { note: fmt(props.t.doodleClose, { text: m.text }), style: 'close' }
    case 'turn': return { note: m.by === room.myId ? props.t.doodleYourTurn : fmt(props.t.doodleNowDrawing, { name }) }
    case 'skip': return { note: fmt(props.t.doodleSkipped, { name }) }
    case 'word': return { note: fmt(props.t.doodleWordWas, { word: shown(m.word) }) }
    default: return { note: '' }
  }
}

const chatLines = computed(() => (view.value?.chat || []).map(m => ({ id: m.id, ...describe(m) })))

watch(() => chatLines.value.at(-1)?.id, async () => {
  await nextTick()
  if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight
})

// ---------- Sound ----------

const muted = ref(sound.muted)
const toggleSound = () => {
  sound.setMuted(!sound.muted)
  muted.value = sound.muted
}

let heard = -1 // the last chat line a sound was played for; -1 until the first state is in
watch(() => view.value?.chat, (chat) => {
  const lines = chat || []
  const newest = lines.at(-1)?.id ?? 0
  if (heard < 0) {
    heard = newest
    return
  }
  for (const m of lines) {
    if (m.id <= heard) continue
    if (m.kind === 'got' && m.by === room.myId) {
      sound.play('rin')
      haptics.buzz('combo')
    } else if (m.kind === 'got') {
      sound.play('pop')
    } else if (m.kind === 'close') {
      sound.play('tock')
    } else if (m.kind === 'turn' && m.by === room.myId) {
      sound.play('go')
      haptics.buzz('tap')
    } else if (m.kind === 'word') {
      sound.play('strum')
    }
  }
  heard = Math.max(heard, newest)
})

// The last seconds of a drawing tick away
watch(secondsLeft, (seconds, before) => {
  if (phase.value === 'draw' && seconds !== before && seconds > 0 && seconds <= 5) sound.play('tick')
})

watch(phase, (now) => {
  if (now === 'final' && leaderboard.value[0]?.id === room.myId && !isTie.value) {
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ['#00ff00', '#00b300', '#007a00'], shapes: ['square'] })
    haptics.buzz('win')
  }
})

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  clearTimeout(syncTimer)
  clearTimeout(sendTimer)
})

const optionClass = (active) => ['term-option min-h-8 px-3 text-sm font-semibold', { 'is-active': active }]
const toolClass = (active) => ['tool term-option min-h-10 px-2 gap-1.5 text-xs font-semibold uppercase', { 'is-active': active }]
const listClass = 'border border-term-low divide-y divide-term-low'
const primary = 'term-btn term-btn-primary w-full min-h-12'
</script>

<template>
  <OnlineRoom
    :room="room"
    :t="t"
    :title="t.doodleTitle"
    :minPlayers="2"
    wide
    @go-back="$emit('go-back')"
    @start="room.act('start')"
  >
    <template #lobby="{ view: lobby, isHost }">
      <div class="space-y-4">
        <div class="space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="term-label w-full sm:w-40">&gt; {{ t.doodleRounds }}</span>
            <button v-for="n in ROUND_OPTIONS" :key="n" type="button" :disabled="!isHost" :class="optionClass(lobby.rounds === n)" @click="room.act('settings', { rounds: n })">{{ n }}</button>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="term-label w-full sm:w-40">&gt; {{ t.doodleTime }}</span>
            <button v-for="n in TIME_OPTIONS" :key="n" type="button" :disabled="!isHost" :class="optionClass(lobby.seconds === n)" @click="room.act('settings', { seconds: n })">{{ fmt(t.doodleSeconds, { n }) }}</button>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="term-label w-full sm:w-40">&gt; {{ t.doodleHints }}</span>
            <button v-for="on in [true, false]" :key="String(on)" type="button" :disabled="!isHost" :class="optionClass(lobby.hints === on)" @click="room.act('settings', { hints: on })">{{ on ? t.doodleOn : t.doodleOff }}</button>
          </div>
        </div>
        <p class="term-muted text-sm leading-relaxed">&gt; {{ t.doodleLobbyHint }}</p>
      </div>
    </template>

    <!-- Final scores -->
    <div v-if="view.phase === 'final'" class="max-w-2xl mx-auto space-y-6">
      <div class="text-center">
        <pre class="inline-block text-left text-xs sm:text-sm leading-tight mb-3" aria-hidden="true">
 .-----------.
 | \|/   /\  |
 | -O-  /  \ |
 | /|\  |[]| |
 '-----------'
    |     |</pre>
        <h2 class="font-display text-5xl leading-none uppercase">{{ t.doodleFinalTitle }}</h2>
        <p v-if="leaderboard[0]" class="term-muted mt-2">
          &gt; {{ isTie ? t.doodleTie : fmt(t.doodleWinner, { name: leaderboard[0].name }) }}
        </p>
      </div>

      <ol :class="listClass">
        <li
          v-for="(player, index) in leaderboard"
          :key="player.id"
          :class="['flex items-center gap-3 px-4 py-3', { 'term-inverse': index === 0, 'bg-term-deep': index > 0 && player.id === room.myId }]"
        >
          <span class="w-8 tabular-nums font-semibold">#{{ index + 1 }}</span>
          <span :class="['truncate', { 'font-semibold': player.id === room.myId, 'opacity-40': !player.online }]">{{ player.name }}</span>
          <span class="ml-auto font-bold tabular-nums">{{ player.score }}</span>
        </li>
      </ol>

      <button v-if="room.isHost" @click="room.act('again')" :class="primary">{{ t.playAgain }}</button>
      <p v-else class="term-muted text-center text-sm"><span class="term-cursor">{{ t.onlineWaitingHost }}</span></p>
    </div>

    <!-- A turn: picking a word, drawing it, seeing it -->
    <div v-else class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start" @pointerdown="sound.unlock()">
      <div class="min-w-0 space-y-2">
        <!-- Round and drawer, the word or its hint, the clock -->
        <div class="flex items-center gap-3 min-h-12">
          <div class="shrink-0 w-24 sm:w-32 min-w-0 leading-tight">
            <p class="term-label">{{ fmt(t.doodleRound, { n: view.round, total: view.rounds }) }}</p>
            <p class="text-xs term-muted truncate"><span aria-hidden="true">[/] </span>{{ nameOf(view.drawer) }}</p>
          </div>

          <div class="flex-1 min-w-0 text-center" aria-live="polite">
            <template v-if="phase === 'draw' && view.hint !== null && view.hint !== undefined">
              <span class="sr-only">{{ t.doodleHint }}: {{ hintLabel }}</span>
              <span class="hint font-display text-3xl sm:text-4xl leading-none whitespace-nowrap" aria-hidden="true"><span
                v-for="(ch, index) in hintChars"
                :key="index"
                :class="ch === ' ' ? 'gap' : ch === '_' ? 'blank' : 'shown'"
              >{{ ch === ' ' ? '' : ch }}</span></span>
              <span class="ml-2 term-muted text-xs tabular-nums whitespace-nowrap">({{ hintLengths }})</span>
            </template>
            <template v-else-if="phase === 'draw' && wordText">
              <span v-if="amDrawer" class="term-label mr-1">{{ t.doodleDrawThis }}:</span> <span class="font-display text-3xl sm:text-4xl leading-none break-words">{{ wordText }}</span> <span v-if="iGuessed" class="ml-1 text-sm font-semibold">[ok]</span>
            </template>
            <span v-else-if="phase === 'choose'" class="term-muted text-sm">
              {{ amDrawer ? t.doodleYourTurn : fmt(t.doodlePicking, { name: nameOf(view.drawer) }) }}
            </span>
            <span v-else-if="phase === 'reveal'" class="term-muted text-sm">{{ endedText }}</span>
          </div>

          <div :class="['shrink-0 font-display text-4xl leading-none tabular-nums w-14 text-right', { 'term-blink': phase === 'draw' && secondsLeft <= 10 }]">
            {{ secondsLeft }}
          </div>
        </div>
        <p class="text-xs whitespace-pre overflow-hidden term-muted" aria-hidden="true">[{{ timerBar }}]</p>

        <div class="mx-auto w-full" :style="{ maxWidth: 'max(20rem, calc((100dvh - 17rem) * 4 / 3))' }">
          <DoodleBoard
            :sketch="sketch"
            :canDraw="canDraw"
            :tool="tool"
            :size="SIZES[size]"
            :label="t.doodleBoard"
            @start="startStroke"
            @move="moveStroke"
            @end="endStroke"
            @fill="fillAt"
          >
            <!-- Picking the word -->
            <div v-if="phase === 'choose'" class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 p-4 text-center">
              <template v-if="amDrawer">
                <p class="term-label">{{ t.doodlePick }}</p>
                <div class="grid gap-2 w-full max-w-sm">
                  <button
                    v-for="(id, slot) in view.choices"
                    :key="id"
                    type="button"
                    class="term-btn min-h-12 text-left"
                    @click="room.act('choose', { slot })"
                  >
                    <span class="truncate">{{ shown(id) }}</span>
                    <span class="ml-auto shrink-0 text-xs font-normal normal-case">{{ levelStars(WORDS[id].level) }} {{ levelName(WORDS[id].level) }} ×{{ WORDS[id].level }}</span>
                  </button>
                </div>
              </template>
              <p v-else class="text-lg"><span class="term-cursor">{{ fmt(t.doodlePicking, { name: nameOf(view.drawer) }) }}</span></p>
            </div>

            <!-- The word, and who scored -->
            <div v-else-if="phase === 'reveal'" class="absolute inset-x-0 bottom-0 bg-black/85 border-t border-term-low px-4 py-3 text-center">
              <p class="term-label">{{ endedText }}</p>
              <p class="font-display text-4xl sm:text-5xl leading-none break-words mt-1">{{ wordText }}</p>
              <p v-if="otherSpellings" class="term-muted text-xs mt-1">{{ otherSpellings }}</p>
              <ul class="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
                <li v-for="row in turnResults" :key="row.id" class="whitespace-nowrap">
                  <span v-if="row.drew" aria-hidden="true">[/] </span>{{ row.name }} <span class="font-semibold">+{{ row.n }}</span>
                </li>
                <li v-if="!turnResults.length" class="term-muted">{{ t.doodleNobody }}</li>
              </ul>
            </div>

            <!-- Joined mid-drawing: the picture is on its way -->
            <div v-else-if="!board.ready" class="absolute inset-0 flex items-center justify-center bg-black/70" role="status">
              <span class="term-muted text-sm uppercase tracking-widest"><span class="term-spinner" aria-hidden="true"></span> {{ t.doodleLoading }}</span>
            </div>
          </DoodleBoard>
        </div>

      </div>

      <!-- Tools, guesses, chat and scores. On a phone the tools, or the box to type in, come
           first, right under the drawing -->
      <div class="min-w-0 flex flex-col gap-3">
        <div v-if="amDrawer && phase === 'draw'" class="order-first space-y-2">
          <div class="grid grid-cols-3 gap-1" role="group" :aria-label="t.doodleTools">
            <button
              v-for="item in TOOLS"
              :key="item.id"
              type="button"
              :aria-pressed="tool === item.id"
              :title="`${t[item.label]} (${item.key})`"
              :class="toolClass(tool === item.id)"
              @click="tool = item.id"
            >
              <span class="max-[379px]:hidden" aria-hidden="true">{{ item.icon }}</span>
              <span>{{ t[item.label] }}</span>
            </button>
          </div>

          <div class="grid grid-cols-[4fr_3fr] gap-3">
            <div class="grid grid-cols-4 gap-1" role="group" :aria-label="t.doodleShades">
              <button
                v-for="(color, index) in SHADES"
                :key="color"
                type="button"
                :aria-label="fmt(t.doodleShade, { n: index + 1 })"
                :aria-pressed="shade === index && tool !== 'eraser'"
                :class="['swatch', { 'is-active': shade === index && tool !== 'eraser' }]"
                :style="{ background: color }"
                @click="pickShade(index)"
              ></button>
            </div>
            <div class="grid grid-cols-3 gap-1" role="group" :aria-label="t.doodleSizes">
              <button
                v-for="(width, index) in SIZES"
                :key="width"
                type="button"
                :aria-label="fmt(t.doodleSize, { n: index + 1 })"
                :aria-pressed="size === index"
                :title="`${fmt(t.doodleSize, { n: index + 1 })} (${index + 1})`"
                :class="['size term-option aspect-square w-full min-h-0 px-0', { 'is-active': size === index }]"
                @click="size = index"
              >
                <span class="dot" :style="{ width: `${4 + index * 5}px`, height: `${4 + index * 5}px` }" aria-hidden="true"></span>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-1">
            <button type="button" :class="toolClass(false)" :title="`${t.doodleUndo} (Ctrl+Z)`" @click="undo">
              <span class="max-[379px]:hidden" aria-hidden="true">&lt;-</span><span>{{ t.doodleUndo }}</span>
            </button>
            <button type="button" :class="toolClass(false)" @click="clearBoard">
              <span class="max-[379px]:hidden" aria-hidden="true">[ ]</span><span>{{ t.doodleClear }}</span>
            </button>
            <button type="button" :class="toolClass(false)" @click="room.act('giveUp')">
              <span class="max-[379px]:hidden" aria-hidden="true">[?]</span><span>{{ t.doodleGiveUp }}</span>
            </button>
          </div>
          <p class="term-muted text-xs hidden lg:block">&gt; {{ t.doodleControls }}</p>
        </div>

        <p v-if="phase === 'draw' && amDrawer" class="order-1 lg:order-3 border border-dashed border-term-low px-3 py-2 text-sm term-muted">&gt; {{ t.doodleNoTalking }}</p>
        <form v-else class="order-1 lg:order-3 flex gap-2" @submit.prevent="sendText">
          <input
            v-model="text"
            :placeholder="inputHint"
            :aria-label="inputHint"
            maxlength="60"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            enterkeyhint="send"
            class="term-input flex-1 min-w-0"
          />
          <button type="submit" :disabled="!text.trim()" class="term-btn min-h-11 px-3 text-sm">{{ t.doodleSend }}</button>
        </form>

        <div ref="chatBox" role="log" aria-live="polite" class="order-2 h-44 lg:h-72 overflow-y-auto border border-term-low px-3 py-2 text-sm space-y-1">
          <p v-for="line in chatLines" :key="line.id" :class="['leading-snug break-words', line.style === 'got' ? 'term-inverse px-1' : line.style === 'close' ? 'border border-dashed border-term px-1' : '']">
            <template v-if="line.who">
              <span :class="line.inner ? 'term-muted' : line.mine ? 'term-muted' : 'font-semibold'">
                <span v-if="line.inner" :title="t.doodleInner">(*) </span>{{ line.who }}&gt;
              </span>
              <span :class="{ 'term-muted': line.inner }"> {{ line.text }}</span>
            </template>
            <span v-else :class="{ 'term-muted': !line.style }">&gt; {{ line.note }}</span>
          </p>
        </div>

        <div class="order-3 lg:order-1">
          <div class="flex items-center justify-between gap-2 mb-2">
            <h2 class="term-label">{{ t.onlinePlayers }} [{{ players.length }}]</h2>
            <button type="button" class="term-icon-btn h-8 text-xs" :aria-pressed="!muted" @click="toggleSound">{{ muted ? 'SND:OFF' : 'SND:ON' }}</button>
          </div>
          <ol :class="listClass">
            <li
              v-for="(player, index) in leaderboard"
              :key="player.id"
              :class="['flex items-center gap-2 px-3 py-1.5 text-sm', { 'bg-term-deep': player.id === room.myId, 'opacity-40': !player.online }]"
            >
              <span class="w-5 term-muted tabular-nums text-xs">{{ index + 1 }}.</span>
              <span :class="['truncate', { 'font-semibold': player.id === room.myId }]">{{ player.name }}</span>
              <span v-if="player.id === view.drawer" class="shrink-0" :title="t.doodleDrawing">[/]</span>
              <span v-else-if="view.guessed?.includes(player.id)" class="shrink-0 term-inverse px-1 text-xs">ok</span>
              <span v-if="player.gained && phase !== 'choose'" class="shrink-0 text-xs term-muted">+{{ player.gained }}</span>
              <span class="ml-auto tabular-nums font-semibold">{{ player.score }}</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </OnlineRoom>
</template>

<style scoped>
/* Hint letters as fixed-width slots: blanks underlined, a wider gap between words */
.hint > span {
  display: inline-block;
  width: 0.62em;
  margin: 0 0.06em;
  text-align: center;
}
.hint > .blank {
  color: var(--color-term-dim);
}
.hint > .gap {
  width: 0.5em;
}

.swatch {
  width: 100%;
  aspect-ratio: 1;
  border: 1px solid var(--color-term-low);
  box-shadow: inset 0 0 0 3px var(--color-black);
}
.swatch.is-active {
  border-color: var(--color-term);
  outline: 1px solid var(--color-term);
  outline-offset: 2px;
}

.size .dot {
  display: block;
  background: currentColor;
}
</style>
