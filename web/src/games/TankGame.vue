<script setup>
import { ref, computed, watch, markRaw } from 'vue'
import confetti from 'canvas-confetti'
import OnlineRoom from '../online/OnlineRoom.vue'
import { useOnlineRoom } from '../online/useOnlineRoom'
import TankStage from './tank/TankStage.vue'
import { HEARTS, INVULNERABLE, MAPS, SPAWNS } from './tank/engine'

const props = defineProps({
  t: { type: Object, required: true },
  // Room code from a shared invite link
  initialCode: { type: String, default: '' },
  // Open a room straight away: a chat invite is waiting for its code
  hostRoom: { type: Boolean, default: false }
})

const emit = defineEmits(['go-back'])

const COUNTDOWN_MS = 3000
const ROUND_MS = 150000
const ENDING_MS = 2600 // the winner banner shows in the arena before the results
const LIVE_TIMEOUT_MS = 5000 // a tank that sends nothing this long is counted out

const WINNER_ART = ['  \\|/', ' #=#=#', ' [(@)]=-', ' #=#=#'].join('\n')

const heartsText = (hearts) => (hearts > 0 ? '<3'.repeat(hearts) : 'x')
const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const shuffle = (list) => {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// ---------- Host-side rules ----------
//
// Every device drives its own tank and decides when a shell hits it, then reports the hit.
// The host keeps the hearts, so a heart is only ever lost once.

const live = markRaw({ samples: {}, at: 0 }) // everyone's latest position
const inbox = markRaw([]) // shots and hits from the others, for the arena to pick up
const freshness = {} // host: id -> { q, at }, when each tank's sample last changed
const lastHit = {} // host: id -> when it last lost a heart
let fightStart = 0 // host clock

function onLive (data) {
  live.samples = data
  live.at = Date.now()
  if (!room.isHost) return
  const round = room.view?.round
  for (const [id, sample] of Object.entries(data)) {
    if (sample?.r !== round) continue
    if (freshness[id]?.q !== sample.q) freshness[id] = { q: sample.q, at: live.at }
  }
}

function onEvent (data, from) {
  if (data?.k === 'shot' || data?.k === 'hit') inbox.push({ from, data })
}

const fightOn = (s) => s.phase === 'playing' || (s.phase === 'countdown' && Date.now() >= s.deadline)

function endRound (s, reason) {
  const entries = Object.entries(s.tanks)
  // Survivors first, then the most hearts, then whoever lasted longer, then hits
  s.standings = entries
    .map(([id, tank]) => ({ id, hearts: tank.alive ? tank.hearts : 0, hits: tank.hits, alive: tank.alive, out: tank.out }))
    .sort((a, b) => Number(b.alive) - Number(a.alive) || b.hearts - a.hearts || b.out - a.out || b.hits - a.hits)
  const [first, second] = s.standings
  const winner = first?.alive && !(second?.alive && second.hearts === first.hearts) ? first.id : null
  if (winner && entries.length > 1) s.wins[winner] = (s.wins[winner] || 0) + 1
  s.outcome = { reason, winner }
  s.phase = 'ending'
  s.deadline = Date.now() + ENDING_MS
}

function knockOut (s, id) {
  const tank = s.tanks[id]
  if (!tank?.alive) return
  tank.alive = false
  tank.hearts = 0
  tank.out = ++s.knockedOut
  if ((s.phase === 'countdown' || s.phase === 'playing') && Object.values(s.tanks).filter(t => t.alive).length <= 1) {
    endRound(s, 'last')
  }
}

function onAction (s, playerId, action) {
  const isHost = playerId === s.hostId
  switch (action.type) {
    case 'start': {
      if (!isHost || (s.phase !== 'lobby' && s.phase !== 'results')) return
      s.players = s.players.filter(p => p.online)
      if (s.players.length < 2) return
      const slots = shuffle(SPAWNS.map((_, i) => i).slice(0, Math.min(SPAWNS.length, s.players.length)))
      s.round++
      s.map = Math.floor(Math.random() * MAPS.length)
      // Up to eight tanks; anyone past that watches the round
      s.tanks = Object.fromEntries(s.players.slice(0, SPAWNS.length).map((p, i) => [p.id, { slot: slots[i], hearts: HEARTS, alive: true, hits: 0, out: 0 }]))
      s.knockedOut = 0
      s.standings = []
      s.outcome = null
      s.deadline = Date.now() + COUNTDOWN_MS
      s.phase = 'countdown'
      fightStart = s.deadline
      Object.keys(lastHit).forEach(id => delete lastHit[id])
      break
    }
    case 'hit': {
      const tank = s.tanks[playerId]
      if (!fightOn(s) || !tank?.alive) return
      // One heart per hit, with the same short safety the tank shows after it
      const now = Date.now()
      if (now - (lastHit[playerId] || 0) < INVULNERABLE * 700) return
      lastHit[playerId] = now
      tank.hearts--
      const shooter = s.tanks[action.by]
      if (shooter && action.by !== playerId) shooter.hits++
      if (tank.hearts <= 0) knockOut(s, playerId)
      break
    }
    case 'lobby':
      if (!isHost || s.phase !== 'results') return
      s.players = s.players.filter(p => p.online)
      s.phase = 'lobby'
      break
  }
}

const room = useOnlineRoom({
  game: 'tanks',
  initialCode: props.initialCode,
  hostRoom: props.hostRoom,
  liveMs: 50,
  initialState: () => ({ round: 0, map: 0, deadline: null, tanks: {}, knockedOut: 0, standings: [], wins: {}, outcome: null }),
  onAction,
  onLive,
  onEvent,
  onLeave: (s, player) => {
    if (s.phase === 'countdown' || s.phase === 'playing') knockOut(s, player.id)
  },
  onTick: (s, now) => {
    if (s.phase === 'countdown' && now >= s.deadline) {
      s.phase = 'playing'
      s.deadline = now + ROUND_MS
    } else if (s.phase === 'playing') {
      if (now >= s.deadline) {
        endRound(s, 'time')
        return
      }
      for (const [id, tank] of Object.entries(s.tanks)) {
        if (s.phase !== 'playing') break
        if (tank.alive && now - Math.max(freshness[id]?.at || 0, fightStart) > LIVE_TIMEOUT_MS) knockOut(s, id)
      }
    } else if (s.phase === 'ending' && now >= s.deadline) {
      s.phase = 'results'
      s.deadline = null
    }
  }
})

// ---------- View ----------

const view = computed(() => room.view)
const inArena = computed(() => ['countdown', 'playing', 'ending'].includes(view.value?.phase))
const names = computed(() => Object.fromEntries((view.value?.players || []).map(p => [p.id, p.name])))

// The deadline is the start while counting down and the end of the round once it's on. Only a
// page that saw the countdown fights in that round: one reloaded mid-round watches.
const startAt = ref(0)
const endsAt = ref(0)
const countedDown = ref(0) // round
watch(() => [view.value?.phase, view.value?.round, view.value?.deadline], ([phase, round, deadline]) => {
  if (phase === 'countdown' && deadline) {
    startAt.value = deadline
    endsAt.value = 0
    countedDown.value = round
  } else if (phase === 'playing' && deadline) {
    endsAt.value = deadline
  }
}, { immediate: true })
const fighter = computed(() => !!view.value?.tanks?.[room.myId] && countedDown.value === view.value.round)

// A fresh arena never sees shots from an earlier round
watch(() => view.value?.round, () => { inbox.length = 0 })

function onHit ({ by, sid, x, y }) {
  room.act('hit', { by })
  room.sendEvent({ k: 'hit', sid, x, y })
}

const standings = computed(() => (view.value?.standings || []).map((entry, index) => ({
  ...entry,
  rank: index + 1,
  name: names.value[entry.id] || '?',
  wins: view.value.wins?.[entry.id] || 0
})))
const winner = computed(() => (view.value?.outcome?.winner ? standings.value.find(entry => entry.id === view.value.outcome.winner) : null))

watch(() => (view.value?.phase === 'results' ? view.value.round : 0), (round) => {
  if (round && winner.value?.id === room.myId) {
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ['#00ff00', '#00b300', '#007a00'], shapes: ['square'] })
  }
})
</script>

<template>
  <OnlineRoom :room="room" :t="t" :title="t.tankTitle" :minPlayers="2" @go-back="emit('go-back')" @start="room.act('start')">
    <template #lobby>
      <div class="space-y-2 text-sm leading-relaxed">
        <p class="term-muted">&gt; {{ t.tankLobbyHint }}</p>
        <p class="term-muted">&gt; {{ t.tankControls }}</p>
      </div>
    </template>

    <TankStage
      v-if="inArena"
      :t="t"
      :title="t.tankTitle"
      :exitLabel="t.onlineLeave"
      :round="view.round"
      :map="view.map"
      :phase="view.phase"
      :startAt="startAt"
      :endsAt="endsAt"
      :fighter="fighter"
      :myId="room.myId"
      :tanks="view.tanks"
      :names="names"
      :live="live"
      :inbox="inbox"
      :outcome="view.outcome"
      @exit="room.leave()"
      @sample="room.sendLive($event)"
      @shot="room.sendEvent($event)"
      @hit="onHit"
    />

    <!-- Round results -->
    <div v-else-if="view.phase === 'results'" class="space-y-6">
      <div class="text-center">
        <span class="inline-block whitespace-pre text-left text-sm leading-tight mb-3" aria-hidden="true">{{ WINNER_ART }}</span>
        <h2 class="font-display text-5xl leading-none uppercase">{{ fmt(t.tankRoundResults, { n: view.round }) }}</h2>
        <p class="term-muted mt-2">&gt; {{ winner ? fmt(t.tankWinner, { name: winner.name }) : t.tankDraw }}</p>
      </div>

      <div>
        <div class="flex items-center gap-3 px-4 pb-2 term-label">
          <span class="w-8">#</span>
          <span class="flex-1">{{ t.onlinePlayers }}</span>
          <span class="w-16 text-right">{{ t.tankHearts }}</span>
          <span class="w-12 text-right">{{ t.tankHits }}</span>
          <span class="w-12 text-right">{{ t.tankWins }}</span>
        </div>
        <ol class="border border-term-low divide-y divide-term-low">
          <li
            v-for="entry in standings"
            :key="entry.id"
            :class="['flex items-center gap-3 px-4 py-3', { 'term-inverse': winner && entry.id === winner.id, 'bg-term-deep': !(winner && entry.id === winner.id) && entry.id === room.myId }]"
          >
            <span class="w-8 tabular-nums font-semibold">#{{ entry.rank }}</span>
            <span :class="['flex-1 truncate', { 'font-semibold': entry.id === room.myId }]">{{ entry.name }}</span>
            <span class="w-16 text-right text-sm font-semibold whitespace-nowrap">{{ heartsText(entry.hearts) }}</span>
            <span class="w-12 text-right tabular-nums">{{ entry.hits }}</span>
            <span class="w-12 text-right font-bold tabular-nums">{{ entry.wins }}</span>
          </li>
        </ol>
      </div>

      <template v-if="room.isHost">
        <button type="button" class="term-btn term-btn-primary w-full min-h-12" @click="room.act('start')">{{ t.playAgain }}</button>
        <button type="button" class="term-btn w-full" @click="room.act('lobby')">{{ t.onlineBackToLobby }}</button>
      </template>
      <p v-else class="term-muted text-center text-sm"><span class="term-cursor">{{ t.onlineWaitingHost }}</span></p>
    </div>
  </OnlineRoom>
</template>
