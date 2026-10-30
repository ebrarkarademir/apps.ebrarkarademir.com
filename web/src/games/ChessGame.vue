<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import OnlineRoom from '../online/OnlineRoom.vue'
import { useOnlineRoom } from '../online/useOnlineRoom'
import ChessStage from './chess/ChessStage.vue'
import { START_FEN, parseFen, toFen, findMove, toSan, applyMove, positionKey, gameOver, canMate, other } from './chess/engine'

const props = defineProps({
  t: { type: Object, required: true },
  // Room code from a shared invite link
  initialCode: { type: String, default: '' },
  // Open a room straight away: a chat invite is waiting for its code
  hostRoom: { type: Boolean, default: false }
})

const emit = defineEmits(['go-back'])

const COUNTDOWN_MS = 3000
const RESULT_MS = 1800 // the finale plays on the board before the result comes up
const AWAY_MS = 30000 // how long a player can be gone before the other may claim the win
const CLOCKS = [0, 3, 5, 10] // minutes each; 0 plays without a clock
const SIDES = ['random', 'w', 'b'] // which side the host plays

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')

// ---------- Host-side rules ----------
//
// One game at a time between the host and whoever joined first; anyone else watches. The host
// checks every move, runs both clocks and decides how the game ends. Each new game in the same
// room swaps the sides.

const seatOf = (s, id) => (s.white === id ? 'w' : s.black === id ? 'b' : '')
const idOf = (s, color) => (color === 'w' ? s.white : s.black)
const inGame = (s) => s.phase === 'countdown' || s.phase === 'playing'

// Host only, for this game: how often each position has come up, and when a player dropped out
let seen = new Map()
const awaySince = {}

function begin (s, now) {
  s.phase = 'playing'
  s.turnAt = now
  s.deadline = s.clock ? now + s.times.w : null
}

// A move can come in just before the host's tick ends the countdown
function opened (s, now) {
  if (s.phase === 'countdown' && now >= s.deadline) begin(s, now)
  return s.phase === 'playing'
}

function finish (s, winner, reason, now = Date.now()) {
  if (s.phase === 'playing' && s.clock) {
    const turn = parseFen(s.fen).turn
    s.times[turn] = Math.max(0, s.times[turn] - (now - s.turnAt))
  }
  s.outcome = { winner, reason }
  s.phase = 'over'
  s.deadline = null
  s.drawOffer = ''
  s.claim = ''
  for (const color of ['w', 'b']) {
    const id = idOf(s, color)
    const points = !winner ? 0.5 : winner === color ? 1 : 0
    s.score[id] = (s.score[id] || 0) + points
  }
}

// Out of time: a loss, unless the other side couldn't mate anyway
function flag (s, color, now) {
  s.turnAt = now
  s.times[color] = 0
  const rival = other(color)
  if (canMate(parseFen(s.fen).board, rival)) finish(s, rival, 'time', now)
  else finish(s, null, 'timeDraw', now)
}

function move (s, playerId, { from, to, promo, ply }) {
  const now = Date.now()
  const color = seatOf(s, playerId)
  // A move for an older position is a repeat that already counted, or came too late
  if (!color || !opened(s, now) || ply !== s.moves.length) return
  const pos = parseFen(s.fen)
  if (pos.turn !== color) return
  const chosen = findMove(pos, from, to, typeof promo === 'string' ? promo : '')
  if (!chosen) return
  if (s.clock) {
    s.times[color] -= now - s.turnAt
    if (s.times[color] <= 0) {
      flag(s, color, now)
      return
    }
  }
  const san = toSan(pos, chosen)
  const next = applyMove(pos, chosen)
  s.fen = toFen(next)
  s.moves.push({ from, to, promo: chosen.promo, san })
  s.turnAt = now
  // Moving instead of answering a draw offer turns it down
  if (s.drawOffer && s.drawOffer !== color) s.drawOffer = ''
  const key = positionKey(next)
  seen.set(key, (seen.get(key) || 0) + 1)
  const over = gameOver(next, seen.get(key))
  if (over) finish(s, over.winner, over.reason, now)
  else s.deadline = s.clock ? now + s.times[next.turn] : null
}

function onAction (s, playerId, action) {
  const isHost = playerId === s.hostId
  const color = seatOf(s, playerId)
  switch (action.type) {
    case 'clock':
      if (isHost && s.phase === 'lobby' && CLOCKS.includes(action.clock)) s.clock = action.clock
      break
    case 'side':
      if (isHost && s.phase === 'lobby' && SIDES.includes(action.side)) s.side = action.side
      break
    case 'start': {
      if (!isHost || (s.phase !== 'lobby' && s.phase !== 'over')) return
      const rematch = s.phase === 'over'
      s.players = s.players.filter(p => p.online)
      if (s.players.length < 2) return
      // The host and the first to join play; the same two again swap sides
      const [host, rival] = s.players
      const same = rematch && [s.white, s.black].includes(host.id) && [s.white, s.black].includes(rival.id)
      const hostWhite = same ? s.black === host.id : s.side === 'random' ? Math.random() < 0.5 : s.side === 'w'
      s.white = hostWhite ? host.id : rival.id
      s.black = hostWhite ? rival.id : host.id
      s.round++
      s.fen = START_FEN
      s.moves = []
      s.times = { w: s.clock * 60000, b: s.clock * 60000 }
      s.drawOffer = ''
      s.offeredAt = { w: -1, b: -1 }
      s.claim = ''
      s.outcome = null
      s.phase = 'countdown'
      s.deadline = Date.now() + COUNTDOWN_MS
      seen = new Map([[positionKey(parseFen(START_FEN)), 1]])
      delete awaySince.w
      delete awaySince.b
      break
    }
    case 'move':
      move(s, playerId, action)
      break
    case 'resign':
      if (color && inGame(s)) finish(s, other(color), 'resign')
      break
    case 'draw':
      // Agreeing to the other side's offer ends it; otherwise it's an offer, one per move
      if (!color || !opened(s, Date.now())) return
      if (s.drawOffer === other(color)) finish(s, null, 'agreement')
      else if (!s.drawOffer && s.offeredAt[color] !== s.moves.length) {
        s.drawOffer = color
        s.offeredAt[color] = s.moves.length
      }
      break
    case 'decline':
      if (color && s.drawOffer === other(color)) s.drawOffer = ''
      break
    case 'claim':
      if (color && inGame(s) && s.claim === color) finish(s, color, 'abandon')
      break
    case 'lobby':
      if (!isHost || s.phase !== 'over') return
      s.players = s.players.filter(p => p.online)
      s.phase = 'lobby'
      break
  }
}

const room = useOnlineRoom({
  game: 'chess',
  initialCode: props.initialCode,
  hostRoom: props.hostRoom,
  initialState: () => ({
    clock: 5,
    side: 'random',
    round: 0,
    white: '',
    black: '',
    fen: START_FEN,
    moves: [],
    times: { w: 0, b: 0 },
    deadline: null,
    turnAt: 0,
    drawOffer: '',
    offeredAt: { w: -1, b: -1 },
    claim: '',
    outcome: null,
    score: {}
  }),
  onAction,
  onJoin: (s, player) => {
    const color = seatOf(s, player.id)
    if (!color) return
    delete awaySince[color]
    if (s.claim === other(color)) s.claim = ''
  },
  onLeave: (s, player) => {
    const color = seatOf(s, player.id)
    if (color && inGame(s)) awaySince[color] = Date.now()
  },
  onTick: (s, now) => {
    if (s.phase === 'countdown' && now >= s.deadline) begin(s, now)
    if (s.phase !== 'playing') return
    if (s.clock && now >= s.deadline) {
      flag(s, parseFen(s.fen).turn, now)
      return
    }
    for (const color of ['w', 'b']) {
      if (awaySince[color] && now - awaySince[color] >= AWAY_MS && !s.claim) s.claim = other(color)
    }
  }
})

// ---------- View ----------

const view = computed(() => room.view)
const onBoard = computed(() => ['countdown', 'playing', 'over'].includes(view.value?.phase))
const playerById = computed(() => Object.fromEntries((view.value?.players || []).map(p => [p.id, p])))
const seat = (color) => playerById.value[idOf(view.value || {}, color)]
const names = computed(() => ({ w: seat('w')?.name || '?', b: seat('b')?.name || '?' }))
const online = computed(() => ({ w: !!seat('w')?.online, b: !!seat('b')?.online }))
const scores = computed(() => ({ w: view.value?.score?.[view.value.white] || 0, b: view.value?.score?.[view.value.black] || 0 }))
const myColor = computed(() => (view.value ? seatOf(view.value, room.myId) : ''))
const onlineCount = computed(() => view.value?.players.filter(p => p.online).length || 0)
const watchers = computed(() => Math.max(0, onlineCount.value - 2))

const clockLabel = (minutes) => (minutes ? props.t.cardMinutes.replace('{n}', minutes) : props.t.chessNoClock)
const sideLabel = (side) => (side === 'w' ? props.t.chessWhite : side === 'b' ? props.t.chessBlack : props.t.chessRandom)

// The result comes up once the finale has played on the board, and can be put away to look at
// the final position
const resultShown = ref(false)
const resultHidden = ref(false)
let resultTimer = null
watch(() => (view.value?.phase === 'over' ? view.value.round : 0), (round) => {
  clearTimeout(resultTimer)
  resultShown.value = false
  resultHidden.value = false
  if (round) resultTimer = setTimeout(() => { resultShown.value = true }, RESULT_MS)
})
onUnmounted(() => clearTimeout(resultTimer))

const TITLE_KEYS = {
  checkmate: 'chessCheckmate',
  resign: 'chessResigned',
  time: 'chessTimeUp',
  abandon: 'chessAbandoned',
  stalemate: 'chessStalemate'
}
const DRAW_KEYS = {
  stalemate: 'chessDrawStalemate',
  material: 'chessDrawMaterial',
  fifty: 'chessDrawFifty',
  repetition: 'chessDrawRepetition',
  agreement: 'chessDrawAgreed',
  timeDraw: 'chessDrawTime'
}

const result = computed(() => {
  const outcome = view.value?.outcome
  if (!outcome) return null
  const { winner, reason } = outcome
  const loser = winner ? other(winner) : ''
  return {
    title: props.t[TITLE_KEYS[reason] || 'chessDraw'],
    line: winner
      ? fmt(reason === 'resign' ? props.t.chessWinsResign : reason === 'abandon' ? props.t.chessWinsAbandon : props.t.chessWins, { name: names.value[winner], loser: names.value[loser] })
      : props.t[DRAW_KEYS[reason]],
    mine: !myColor.value ? '' : !winner ? 'draw' : winner === myColor.value ? 'won' : 'lost'
  }
})

const fmtScore = (points) => {
  const whole = Math.floor(points)
  return points - whole >= 0.5 ? `${whole || ''}½` : String(whole)
}

// A king in glory, a king going under, two kings sharing the point, two kings at the board
const RESULT_ART = {
  won: [' \\ | /', '-- K --', ' / | \\'].join('\n'),
  lost: ['   K', '~~~~~~~'].join('\n'),
  draw: 'K ½ K',
  watch: 'K · K'
}
const TITLE_ART = [
  '  r n b q k b n r',
  '  p p p p p p p p',
  '  . : . : . : . :',
  '  : . : . : . : .',
  '  P P P P P P P P',
  '  R N B Q K B N R'
].join('\n')
</script>

<template>
  <OnlineRoom :room="room" :t="t" :title="t.chessTitle" :minPlayers="2" @go-back="emit('go-back')" @start="room.act('start')">
    <template #lobby="{ view: lobby, isHost }">
      <div class="space-y-4">
        <div class="overflow-hidden text-center" aria-hidden="true">
          <span class="inline-block whitespace-pre text-left text-xs sm:text-sm leading-tight term-muted">{{ TITLE_ART }}</span>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span class="term-label mr-1">&gt; {{ t.chessClock }}</span>
          <button
            v-for="minutes in CLOCKS"
            :key="minutes"
            type="button"
            @click="room.act('clock', { clock: minutes })"
            :disabled="!isHost"
            :class="['term-option min-h-8 px-3 text-sm font-semibold', { 'is-active': lobby.clock === minutes }]"
          >
            {{ clockLabel(minutes) }}
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span class="term-label mr-1">&gt; {{ t.chessHostPlays }}</span>
          <button
            v-for="side in SIDES"
            :key="side"
            type="button"
            @click="room.act('side', { side })"
            :disabled="!isHost"
            :class="['term-option min-h-8 px-3 text-sm font-semibold', { 'is-active': lobby.side === side }]"
          >
            {{ sideLabel(side) }}
          </button>
        </div>
        <div class="space-y-2 text-sm leading-relaxed">
          <p class="term-muted">&gt; {{ t.chessLobbyHint }}</p>
          <p class="term-muted">&gt; {{ t.chessControls }}</p>
        </div>
      </div>
    </template>

    <ChessStage
      v-if="onBoard"
      :t="t"
      :title="t.chessTitle"
      :exitLabel="t.onlineLeave"
      :round="view.round"
      :phase="view.phase"
      :fen="view.fen"
      :moves="view.moves"
      :myColor="myColor"
      :names="names"
      :online="online"
      :scores="scores"
      :clock="view.clock"
      :times="view.times"
      :deadline="view.deadline || 0"
      :drawOffer="view.drawOffer"
      :claim="view.claim"
      :outcome="view.outcome"
      @exit="room.leave()"
      @move="room.act('move', $event)"
      @resign="room.act('resign')"
      @draw="room.act('draw')"
      @decline="room.act('decline')"
      @claim="room.act('claim')"
    >
      <template #overlay>
        <div v-if="result && resultShown && !resultHidden" class="absolute inset-0 z-20 flex items-center justify-center p-3 bg-black/50">
          <div class="term-window w-full max-w-xs p-5 text-center" role="dialog" aria-modal="false" :aria-label="result.title">
            <span class="inline-block whitespace-pre text-left text-sm leading-tight" aria-hidden="true">{{ RESULT_ART[result.mine || 'watch'] }}</span>
            <h2 class="mt-2 font-display text-5xl leading-none uppercase">{{ result.title }}</h2>
            <p class="mt-2 text-sm term-muted">&gt; {{ result.line }}</p>

            <!-- Games won between the two, half a point each for a draw -->
            <div class="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <span class="truncate text-right text-sm">{{ names.w }}</span>
              <span class="font-display text-4xl leading-none tabular-nums">{{ fmtScore(scores.w) }} – {{ fmtScore(scores.b) }}</span>
              <span class="truncate text-left text-sm">{{ names.b }}</span>
            </div>
            <p v-if="watchers" class="mt-1 text-xs term-muted">{{ fmt(t.chessWatchers, { n: watchers }) }}</p>

            <template v-if="room.isHost">
              <button type="button" class="term-btn term-btn-primary w-full mt-5" :disabled="onlineCount < 2" @click="room.act('start')">{{ t.chessRematch }}</button>
              <p class="mt-1 text-xs term-muted">{{ onlineCount < 2 ? fmt(t.onlineNeedPlayers, { n: 2 }) : t.chessRematchHint }}</p>
              <button type="button" class="term-btn w-full mt-3" @click="room.act('lobby')">{{ t.onlineBackToLobby }}</button>
            </template>
            <p v-else class="mt-5 term-muted text-sm"><span class="term-cursor">{{ t.onlineWaitingHost }}</span></p>
            <button type="button" class="term-link mt-3 text-xs" @click="resultHidden = true">[-] {{ t.chessShowBoard }}</button>
          </div>
        </div>

        <button
          v-else-if="result && resultShown"
          type="button"
          class="term-btn term-btn-primary absolute z-20 bottom-3 left-1/2 -translate-x-1/2 min-h-10 px-4 text-sm"
          @click="resultHidden = false"
        >
          [+] {{ result.title }} · {{ fmtScore(scores.w) }}–{{ fmtScore(scores.b) }}
        </button>
      </template>
    </ChessStage>
  </OnlineRoom>
</template>
