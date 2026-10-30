<script setup>
import { computed, watch, markRaw, ref, onUnmounted } from 'vue'
import confetti from 'canvas-confetti'
import OnlineRoom from '../online/OnlineRoom.vue'
import { useOnlineRoom } from '../online/useOnlineRoom'
import CraterStage from './crater/CraterStage.vue'
import { createTerrain, spawnUnits, WATER_START } from './crater/terrain'
import { simulate, MAX_WALK, WEAPON_IDS } from './crater/physics'
import { SIDE_COLORS } from './crater/renderer'

const props = defineProps({
  t: { type: Object, required: true },
  // Room code from a shared invite link
  initialCode: { type: String, default: '' },
  // Open a room straight away: a chat invite is waiting for its code
  hostRoom: { type: Boolean, default: false }
})

const emit = defineEmits(['go-back'])

const UNIT_OPTIONS = [1, 2, 3]
const TIME_OPTIONS = [15, 20, 30]
const SUDDEN_TURN = 8 // from this turn on the sea rises
const WATER_RISE = 3 // cells a turn
const AWAY_TURNS = 2 // turns a player can be gone before losing
const REPLAY_PAD_MS = 1300 // after the recording, before the next turn
const RESULT_MS = 1600

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')

// ---------- Host-side rules ----------
//
// The host and the first to join play: side 0 starts on the left. Each turn both aim at once;
// the host keeps the shots to itself until both are in (or the clock runs out), then plays the
// turn out on its own copy of the ground and sends everyone the recording.

let ground = null // host: the ground the turns are played out on
let shots = [null, null] // host: this turn's shots, by side
const walked = [null, null] // host: where each side's unit walked to this turn, from live data
const away = [0, 0] // host: turns in a row each side has been gone

const sideOf = (s, id) => s.sides.indexOf(id)
const isOnline = (s, id) => s.players.some(p => p.id === id && p.online)
const aliveOn = (s, side) => s.units.some(u => u.side === side && u.alive)
const round2 = (n) => Math.round(n * 100) / 100

// A unit may only end its walk standing on dry ground within reach of where it began
function validSpot (s, unit, x, y) {
  return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - unit.x) <= MAX_WALK + 0.6 && ground.standing(x, y) && y < s.water
}

function nextTurn (s, now = Date.now()) {
  s.turn++
  if (s.turn >= SUDDEN_TURN) {
    s.water -= WATER_RISE
    s.units.forEach(u => {
      if (u.alive && u.y >= s.water) u.alive = false
    })
  }
  if (finished(s)) return
  // The wind changes every turn, mostly a little
  s.wind = Math.max(-1, Math.min(1, Math.round((s.wind * 0.4 + (Math.random() * 2 - 1) * 0.8) * 10) / 10))
  s.locked = [false, false]
  shots = [null, null]
  walked[0] = walked[1] = null
  s.phase = 'aim'
  s.deadline = now + s.aimSeconds * 1000
}

// The game ends when a side has no units left, or its player has been gone too long
function finished (s) {
  const alive = [aliveOn(s, 0), aliveOn(s, 1)]
  let winner = null
  let reason = 'units'
  if (!alive[0] && !alive[1]) winner = -1
  else if (!alive[0]) winner = 1
  else if (!alive[1]) winner = 0
  else if (away[0] >= AWAY_TURNS) [winner, reason] = [1, 'left']
  else if (away[1] >= AWAY_TURNS) [winner, reason] = [0, 'left']
  if (winner === null) return false
  s.outcome = { winner, reason }
  s.phase = 'over'
  s.deadline = null
  s.locked = [false, false]
  if (winner >= 0) {
    const id = s.sides[winner]
    s.score[id] = (s.score[id] || 0) + 1
  }
  return true
}

function resolve (s, now = Date.now()) {
  const units = s.units.map(u => ({ ...u }))
  for (const side of [0, 1]) {
    const moved = shots[side] || walked[side]
    const unit = moved && units[moved.unit]
    if (unit?.alive && unit.side === side && validSpot(s, unit, moved.x, moved.y)) {
      unit.x = moved.x
      unit.y = moved.y
    }
    away[side] = isOnline(s, s.sides[side]) || !aliveOn(s, side) ? 0 : away[side] + 1
  }
  const before = s.craters.length
  const result = simulate({
    terrain: ground,
    units,
    shots: shots.filter(Boolean).map(shot => ({ unit: shot.unit, angle: shot.angle, power: shot.power, weapon: shot.weapon })),
    wind: s.wind,
    water: s.water
  })
  s.craters.push(...result.craters)
  s.units = result.units
  s.replay = { turn: s.turn, before, ...result.replay }
  s.phase = 'resolve'
  s.deadline = now + result.replay.duration * 1000 + REPLAY_PAD_MS
}

function onAction (s, playerId, action) {
  const isHost = playerId === s.hostId
  const side = sideOf(s, playerId)
  switch (action.type) {
    case 'settings':
      if (!isHost || s.phase !== 'lobby') return
      if (UNIT_OPTIONS.includes(action.perSide)) s.perSide = action.perSide
      if (TIME_OPTIONS.includes(action.aimSeconds)) s.aimSeconds = action.aimSeconds
      break
    case 'start': {
      if (!isHost || (s.phase !== 'lobby' && s.phase !== 'over')) return
      const rematch = s.phase === 'over'
      s.players = s.players.filter(p => p.online)
      if (s.players.length < 2) return
      const pair = [s.players[0].id, s.players[1].id]
      const same = rematch && pair.every(id => s.sides.includes(id))
      // The same two again swap ends
      s.sides = same ? [s.sides[1], s.sides[0]] : pair
      s.seed = Math.floor(Math.random() * 2 ** 31)
      ground = createTerrain(s.seed)
      s.units = spawnUnits(ground, s.perSide, Math.random)
      s.craters = []
      s.round++
      s.turn = 0
      s.water = WATER_START
      s.wind = 0
      s.replay = null
      s.outcome = null
      away[0] = away[1] = 0
      nextTurn(s)
      break
    }
    case 'fire': {
      if (side < 0 || s.phase !== 'aim' || s.locked[side] || action.turn !== s.turn) return
      const unit = s.units[action.unit]
      if (!unit?.alive || unit.side !== side || !WEAPON_IDS.includes(action.weapon)) return
      const angle = Number(action.angle)
      const power = Number(action.power)
      if (!Number.isFinite(angle) || !Number.isFinite(power)) return
      shots[side] = { unit: action.unit, x: Number(action.x), y: Number(action.y), angle, power: Math.max(0.05, Math.min(1, power)), weapon: action.weapon }
      s.locked[side] = true
      // Both in (or the other side has nothing left to fire with): the turn plays out now
      if ([0, 1].every(other => s.locked[other] || !aliveOn(s, other))) resolve(s)
      break
    }
    case 'lobby':
      if (!isHost || s.phase !== 'over') return
      s.players = s.players.filter(p => p.online)
      s.phase = 'lobby'
      break
  }
}

// The players' walking, many times a second: shown on everyone's screen as it happens
const live = markRaw({ samples: {} })

function onLive (data) {
  const view = room.view
  if (!view) return
  const samples = {}
  for (const [id, sample] of Object.entries(data)) {
    const side = view.sides?.indexOf(id) ?? -1
    if (side >= 0 && sample && typeof sample === 'object') samples[side] = sample
  }
  live.samples = samples
}

const room = useOnlineRoom({
  game: 'crater',
  initialCode: props.initialCode,
  hostRoom: props.hostRoom,
  liveMs: 80,
  initialState: () => ({
    perSide: 2,
    aimSeconds: 20,
    round: 0,
    turn: 0,
    seed: 0,
    sides: [],
    units: [],
    craters: [],
    wind: 0,
    water: WATER_START,
    deadline: null,
    locked: [false, false],
    replay: null,
    outcome: null,
    score: {}
  }),
  onAction,
  onLive,
  onGuestLive: (playerId, data) => {
    const s = room.view
    const side = s?.sides?.indexOf(playerId) ?? -1
    if (side < 0 || !data || data.turn !== s.turn) return
    walked[side] = { unit: data.u, x: round2(Number(data.x)), y: Number(data.y) }
  },
  onTick: (s, now) => {
    if (s.phase === 'aim' && now >= s.deadline) resolve(s, now)
    else if (s.phase === 'resolve' && now >= s.deadline && !finished(s)) nextTurn(s, now)
  }
})

// Development builds expose the room, for scripted play-testing
if (import.meta.env.DEV) window.__craterRoom = room

// ---------- View ----------

const view = computed(() => room.view)
const onField = computed(() => ['aim', 'resolve', 'over'].includes(view.value?.phase))
const nameOf = (id) => view.value?.players.find(p => p.id === id)?.name || '?'
const names = computed(() => (view.value?.sides || []).map(nameOf))
const mySide = computed(() => view.value?.sides?.indexOf(room.myId) ?? -1)
const onlineCount = computed(() => view.value?.players.filter(p => p.online).length || 0)

function sendWalk (sample) {
  room.sendLive(sample)
}

// The result comes up after the last turn has played out
const resultShown = ref(false)
let resultTimer = null
watch(() => (view.value?.phase === 'over' ? view.value.round : 0), (round) => {
  clearTimeout(resultTimer)
  resultShown.value = false
  if (!round) return
  resultTimer = setTimeout(() => {
    resultShown.value = true
    if (view.value?.outcome?.winner === mySide.value && mySide.value >= 0) {
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ['#00ff00', '#ffb000', '#f2f6ea'], shapes: ['square'] })
    }
  }, RESULT_MS)
})
onUnmounted(() => clearTimeout(resultTimer))

const result = computed(() => {
  const outcome = view.value?.outcome
  if (!outcome) return null
  const { winner, reason } = outcome
  const title = winner < 0
    ? props.t.craterDraw
    : mySide.value < 0
      ? fmt(props.t.craterWins, { name: names.value[winner] })
      : winner === mySide.value ? props.t.craterVictory : props.t.craterDefeat
  const line = winner < 0 ? props.t.craterDrawLine : reason === 'left' ? fmt(props.t.craterLeft, { name: names.value[1 - winner] }) : fmt(props.t.craterWins, { name: names.value[winner] })
  return { title, line, color: winner >= 0 ? SIDE_COLORS[winner] : undefined }
})
const scoreLine = computed(() => (view.value?.sides || []).map(id => view.value.score?.[id] || 0).join(' – '))

const UNIT_ART = [' o      o ', '/|\\ ~~ /|\\', '/ \\    / \\'].join('\n')
</script>

<template>
  <OnlineRoom :room="room" :t="t" :title="t.craterTitle" :minPlayers="2" @go-back="emit('go-back')" @start="room.act('start')">
    <template #lobby="{ view: lobby, isHost }">
      <div class="space-y-4">
        <div class="text-center" aria-hidden="true">
          <span class="inline-block whitespace-pre text-left text-sm leading-tight">{{ UNIT_ART }}</span>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span class="term-label w-full sm:w-44">&gt; {{ t.craterUnits }}</span>
          <button
            v-for="n in UNIT_OPTIONS"
            :key="n"
            type="button"
            :disabled="!isHost"
            :class="['term-option min-h-8 px-3 text-sm font-semibold', { 'is-active': lobby.perSide === n }]"
            @click="room.act('settings', { perSide: n })"
          >{{ n }}</button>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span class="term-label w-full sm:w-44">&gt; {{ t.craterTurnTime }}</span>
          <button
            v-for="n in TIME_OPTIONS"
            :key="n"
            type="button"
            :disabled="!isHost"
            :class="['term-option min-h-8 px-3 text-sm font-semibold', { 'is-active': lobby.aimSeconds === n }]"
            @click="room.act('settings', { aimSeconds: n })"
          >{{ fmt(t.craterSeconds, { n }) }}</button>
        </div>
        <div class="space-y-2 text-sm leading-relaxed">
          <p class="term-muted">&gt; {{ t.craterLobbyHint }}</p>
          <p class="term-muted">&gt; {{ t.craterControls }}</p>
        </div>
      </div>
    </template>

    <CraterStage
      v-if="onField"
      :t="t"
      :title="t.craterTitle"
      :exitLabel="t.onlineLeave"
      :phase="view.phase"
      :turn="view.turn"
      :seed="view.seed"
      :craters="view.craters"
      :units="view.units"
      :mySide="mySide"
      :names="names"
      :wind="view.wind"
      :water="view.water"
      :sudden="view.turn >= SUDDEN_TURN"
      :deadline="view.deadline || 0"
      :locked="view.locked"
      :replay="view.replay"
      :live="live"
      @exit="room.leave()"
      @fire="room.act('fire', $event)"
      @walk="sendWalk"
    >
      <template #overlay>
        <div v-if="result && resultShown" class="absolute inset-0 z-20 flex items-center justify-center p-3 bg-black/60">
          <div class="term-window w-full max-w-xs p-5 text-center" role="dialog" aria-modal="false" :aria-label="result.title">
            <h2 class="font-display text-5xl leading-none uppercase" :style="{ color: result.color }">{{ result.title }}</h2>
            <p class="mt-2 text-sm term-muted">&gt; {{ result.line }}</p>
            <div class="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <span class="truncate text-right text-sm" :style="{ color: SIDE_COLORS[0] }">{{ names[0] }}</span>
              <span class="font-display text-4xl leading-none tabular-nums">{{ scoreLine }}</span>
              <span class="truncate text-left text-sm" :style="{ color: SIDE_COLORS[1] }">{{ names[1] }}</span>
            </div>
            <template v-if="room.isHost">
              <button type="button" class="term-btn term-btn-primary w-full mt-5" :disabled="onlineCount < 2" @click="room.act('start')">{{ t.craterRematch }}</button>
              <p class="mt-1 text-xs term-muted">{{ onlineCount < 2 ? fmt(t.onlineNeedPlayers, { n: 2 }) : t.craterRematchHint }}</p>
              <button type="button" class="term-btn w-full mt-3" @click="room.act('lobby')">{{ t.onlineBackToLobby }}</button>
            </template>
            <p v-else class="mt-5 term-muted text-sm"><span class="term-cursor">{{ t.onlineWaitingHost }}</span></p>
          </div>
        </div>
      </template>
    </CraterStage>
  </OnlineRoom>
</template>
