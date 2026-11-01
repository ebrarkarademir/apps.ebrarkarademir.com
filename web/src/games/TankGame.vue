<script setup>
import { ref, reactive, computed, watch, markRaw } from 'vue'
import TermWindow from '../components/TermWindow.vue'
import OnlineRoom from '../online/OnlineRoom.vue'
import { useOnlineRoom } from '../online/useOnlineRoom'
import { useLocalRoom } from '../online/useLocalRoom'
import TankMatch from './tank/TankMatch.vue'
import { ARMOR, INVULNERABLE, MAPS, POWER_DAMAGE, GIFT_LIFE, MAX_GIFTS, freeSpot, mapOf } from './tank/engine'
import { LEVELS } from './tank/bots'

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
const MAX_TANKS = mapOf(0).spawns.length
const SETUP_KEY = 'tankSolo'
const LEVEL_NAMES = Object.keys(LEVELS)

const LETTERS = {
  T: [' _____ ', '|_   _|', '  | |  ', '  |_|  '],
  A: ['   _   ', '  /_\\  ', ' / _ \\ ', '/_/ \\_\\'],
  N: [' _  _ ', '| \\| |', '| .` |', '|_|\\_|'],
  K: [' _  __', '| |/ /', "| ' < ", '|_|\\_\\']
}
const TITLE_ART = [0, 1, 2, 3].map(row => [...'TANK'].map(letter => LETTERS[letter][row]).join(' ')).join('\n')
const SOLO_ART = [' #=#=#         #=#=#', ' [(@)]=- o  -=[(B)]', ' #=#=#         #=#=#'].join('\n')
const ONLINE_ART = [' #=#=#  #=#=#    #=#=#', ' [(A)]=-[(B)]= -=[(C)]', ' #=#=#  #=#=#    #=#=#'].join('\n')

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const shuffle = (list) => {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
const levelName = (level) => props.t[`bot${level[0].toUpperCase()}${level.slice(1)}`]

// null while choosing, then setup (solo options), solo or online; an invite goes straight online
const mode = ref(props.initialCode || props.hostRoom ? 'online' : null)

// ---------- Host-side rules, for an online room and a solo game alike ----------
//
// Every device drives its own tank and decides when a shell hits it, then reports the hit.
// The host keeps the armor, so a hit only ever counts once. It also drops the gifts and says
// who got each one: a shield that takes the next hit instead of the tank, a spell of speed,
// power shots that count as two hits, or a repair that mends a hit and gives a little speed
// (counters each tank's own device acts on). It credits each destroyed tank to whoever fired
// the last shot. The host's device also drives the bots and decides their hits; a solo game is
// a room where this device is the host.

const live = markRaw({ samples: {}, at: 0 }) // everyone's latest position
const inbox = markRaw([]) // shots and hits from the others, for the arena to pick up
const freshness = {} // host: id -> { q, at }, when each tank's sample last changed
const lastHit = {} // host: id -> when it was last hit
let fightStart = 0 // host clock
let nextGiftAt = 0 // host clock

const fightOn = (s) => s.phase === 'playing' || (s.phase === 'countdown' && Date.now() >= s.deadline)
const between = (s) => s.phase === 'lobby' || s.phase === 'results'
const people = (s) => s.players.filter(p => p.online)

function endRound (s, reason) {
  const entries = Object.entries(s.tanks)
  // Survivors first, then the least damaged, then whoever lasted longer, then hits
  s.standings = entries
    .map(([id, tank]) => ({ id, hp: tank.alive ? tank.hp : 0, hits: tank.hits, kills: tank.kills || 0, alive: tank.alive, out: tank.out }))
    .sort((a, b) => Number(b.alive) - Number(a.alive) || b.hp - a.hp || b.out - a.out || b.hits - a.hits)
  const [first, second] = s.standings
  const winner = first?.alive && !(second?.alive && second.hp === first.hp) ? first.id : null
  if (winner && entries.length > 1) s.wins[winner] = (s.wins[winner] || 0) + 1
  s.outcome = { reason, winner }
  s.phase = 'ending'
  s.deadline = Date.now() + ENDING_MS
}

// Out of the round: destroyed by `by`, or gone quiet or left with nobody to blame
function knockOut (s, id, by = null) {
  const tank = s.tanks[id]
  if (!tank?.alive) return
  tank.alive = false
  tank.hp = 0
  tank.by = by && by !== id && s.tanks[by] ? by : null
  if (tank.by) s.tanks[by].kills = (s.tanks[by].kills || 0) + 1
  tank.out = ++s.knockedOut
  if ((s.phase === 'countdown' || s.phase === 'playing') && Object.values(s.tanks).filter(t => t.alive).length <= 1) {
    endRound(s, 'last')
  }
}

// A hit: a shield takes it if the tank has one, otherwise it costs armor (two for a power
// shot), with the same short safety the tank shows after it
function takeHit (s, id, by, dmg) {
  const tank = s.tanks[id]
  if (!fightOn(s) || !tank?.alive) return
  const now = Date.now()
  if (now - (lastHit[id] || 0) < INVULNERABLE * 700) return
  lastHit[id] = now
  if (tank.shield) {
    tank.shield = false
    return
  }
  tank.hp = Math.max(0, tank.hp - (dmg === POWER_DAMAGE ? POWER_DAMAGE : 1))
  const shooter = s.tanks[by]
  if (shooter && by !== id) shooter.hits++
  if (tank.hp <= 0) knockOut(s, id, by)
}

// Where the tanks are, so a gift doesn't land on one
const tankSpots = (s) => Object.entries(live.samples)
  .filter(([id, sample]) => s.tanks[id]?.alive && Number.isFinite(sample?.x) && Number.isFinite(sample?.y))
  .map(([, sample]) => ({ x: sample.x, y: sample.y, r: 7 }))

// Shields most often, repairs least, so rounds don't drag on
const GIFT_ODDS = [['shield', 0.32], ['speed', 0.25], ['power', 0.25], ['repair', 0.18]]
const pickGift = () => {
  let r = Math.random()
  for (const [kind, odds] of GIFT_ODDS) {
    r -= odds
    if (r < 0) return kind
  }
  return 'shield'
}

// Every so often a gift lands in open ground, up to MAX_GIFTS at a time, and each fades after
// GIFT_LIFE. `at` is when it landed, in ms since the fight started, which every device can
// work out the time from without sharing a clock.
function dropGifts (s, now) {
  const age = now - fightStart
  const life = GIFT_LIFE * 1000
  if (s.gifts.some(g => age - g.at > life)) s.gifts = s.gifts.filter(g => age - g.at <= life)
  if (now < nextGiftAt) return
  nextGiftAt = now + 6000 + Math.random() * 5000
  if (s.gifts.length >= MAX_GIFTS) return
  const spot = freeSpot(s.map, Math.random, [...s.gifts, ...tankSpots(s)])
  if (!spot) return
  s.gifts.push({ id: ++s.giftSeq, kind: pickGift(), x: Math.round(spot.x * 10) / 10, y: Math.round(spot.y * 10) / 10, at: Math.round(age) })
}

function onAction (s, playerId, action) {
  const isHost = playerId === s.hostId
  switch (action.type) {
    case 'addBot':
      if (!isHost || !between(s) || people(s).length + s.bots.length >= MAX_TANKS) return
      s.botSeq++
      s.bots.push({ id: `bot${s.botSeq}`, n: s.botSeq })
      break
    case 'removeBot':
      if (!isHost || !between(s)) return
      s.bots = s.bots.filter(b => b.id !== action.id)
      break
    case 'settings':
      if (!isHost || !between(s)) return
      if (LEVEL_NAMES.includes(action.level)) s.level = action.level
      break
    case 'start': {
      if (!isHost || !between(s)) return
      s.players = people(s)
      // People first, then bots, up to eight tanks; anyone past that watches the round
      const fighters = [...s.players.map(p => ({ id: p.id, bot: 0 })), ...s.bots.map(b => ({ id: b.id, bot: b.n }))].slice(0, MAX_TANKS)
      if (fighters.length < 2) return
      const slots = shuffle(Array.from({ length: fighters.length }, (_, i) => i))
      s.round++
      s.map = Math.floor(Math.random() * MAPS.length)
      // Each tank's color comes from its place in the list (people in the order they came,
      // then bots), so a player keeps the same one from round to round
      s.tanks = Object.fromEntries(fighters.map((f, i) => [f.id, { slot: slots[i], color: i, hp: ARMOR, alive: true, hits: 0, kills: 0, by: null, out: 0, bot: f.bot, shield: false, speed: 0, power: 0, repair: 0 }]))
      s.gifts = []
      s.knockedOut = 0
      s.standings = []
      s.outcome = null
      s.deadline = Date.now() + COUNTDOWN_MS
      s.phase = 'countdown'
      fightStart = s.deadline
      nextGiftAt = fightStart + 5000 + Math.random() * 3000
      Object.keys(lastHit).forEach(id => delete lastHit[id])
      break
    }
    case 'hit':
      takeHit(s, playerId, action.by, action.dmg)
      break
    // The host's device says one of the bots was hit
    case 'botHit':
      if (!isHost || !s.tanks[action.id]?.bot) return
      takeHit(s, action.id, action.by, action.dmg)
      break
    // A shell popped a gift: it goes to the tank that fired it, if it's still there. The host's
    // device asks for its bots too.
    case 'grab': {
      if (!fightOn(s)) return
      const id = action.bot === undefined ? playerId : isHost && s.tanks[action.bot]?.bot ? action.bot : null
      const tank = id ? s.tanks[id] : null
      const index = s.gifts.findIndex(g => g.id === action.gift)
      if (!tank?.alive || index < 0) return
      const [gift] = s.gifts.splice(index, 1)
      if (gift.kind === 'shield') {
        tank.shield = true
      } else if (gift.kind === 'speed') {
        tank.speed++
      } else if (gift.kind === 'power') {
        tank.power++
      } else {
        tank.hp = Math.min(ARMOR, tank.hp + 1)
        tank.repair++
      }
      break
    }
    case 'lobby':
      if (!isHost || s.phase !== 'results') return
      s.players = people(s)
      s.phase = 'lobby'
      break
  }
}

function onTick (s, now) {
  if (s.phase === 'countdown' && now >= s.deadline) {
    s.phase = 'playing'
    s.deadline = now + ROUND_MS
  } else if (s.phase === 'playing') {
    if (now >= s.deadline) {
      endRound(s, 'time')
      return
    }
    dropGifts(s, now)
    // A person whose tank has gone quiet left the fight; bots and a solo game don't go quiet
    if (s.solo) return
    for (const [id, tank] of Object.entries(s.tanks)) {
      if (s.phase !== 'playing') break
      if (tank.alive && !tank.bot && now - Math.max(freshness[id]?.at || 0, fightStart) > LIVE_TIMEOUT_MS) knockOut(s, id)
    }
  } else if (s.phase === 'ending' && now >= s.deadline) {
    s.phase = 'results'
    s.deadline = null
  }
}

const initialState = () => ({ round: 0, map: 0, deadline: null, tanks: {}, gifts: [], giftSeq: 0, knockedOut: 0, standings: [], wins: {}, outcome: null, bots: [], botSeq: 0, level: 'normal', solo: false })

// ---------- Online ----------

// The host's sample carries the bots' places too (as `b`): each bot becomes a sample of its own
function readSamples (data) {
  const samples = {}
  for (const [id, sample] of Object.entries(data)) {
    if (!sample || typeof sample !== 'object') continue
    samples[id] = sample
    if (sample.b && typeof sample.b === 'object') {
      for (const [bot, pose] of Object.entries(sample.b)) if (pose) samples[bot] = { ...pose, r: sample.r }
    }
  }
  live.samples = samples
  live.at = Date.now()
}

function onLive (data) {
  readSamples(data)
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

const room = useOnlineRoom({
  game: 'tanks',
  initialCode: props.initialCode,
  hostRoom: props.hostRoom,
  liveMs: 50,
  initialState,
  onAction,
  onLive,
  onEvent,
  onLeave: (s, player) => {
    if (s.phase === 'countdown' || s.phase === 'playing') knockOut(s, player.id)
  },
  onTick
})

const lobbyCount = computed(() => (room.view ? people(room.view).length + room.view.bots.length : 0))

// ---------- Solo ----------

const loadSetup = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(SETUP_KEY) || '{}')
    return {
      bots: saved.bots >= 1 && saved.bots < MAX_TANKS ? saved.bots : 3,
      level: LEVEL_NAMES.includes(saved.level) ? saved.level : 'normal'
    }
  } catch {
    return { bots: 3, level: 'normal' }
  }
}

const setup = reactive(loadSetup())
watch(setup, (value) => {
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify(value))
  } catch {
    // Remembering the choice is a convenience only
  }
})

// A solo game hears this device's own samples too, so gifts can keep clear of the tanks
const solo = useLocalRoom({ initialState, onAction, onTick, onGuestLive: (id, data) => readSamples({ [id]: data }) })

const savedName = () => {
  try {
    return localStorage.getItem('onlineName') || ''
  } catch {
    return ''
  }
}

function startSolo () {
  const bots = Array.from({ length: setup.bots }, (_, i) => ({ id: `bot${i + 1}`, n: i + 1 }))
  solo.open(savedName() || props.t.gameYou, { solo: true, level: setup.level, bots, botSeq: bots.length })
  inbox.length = 0
  live.samples = {}
  solo.act('start')
  mode.value = 'solo'
}

function leaveSolo () {
  solo.close()
  mode.value = 'setup'
}

const cardClass = 'term-card group flex flex-col gap-3 p-5 text-left'
const optionClass = (active) => ['term-option min-h-8 px-3 text-sm font-semibold', { 'is-active': active }]
</script>

<template>
  <!-- Choose solo or online -->
  <TermWindow v-if="mode === null" class="max-w-2xl" :title="t.tankTitle" :backLabel="t.back" @back="emit('go-back')">
    <div class="space-y-6">
      <div class="overflow-hidden text-center" aria-hidden="true">
        <span class="inline-block whitespace-pre text-left text-[0.6rem] min-[400px]:text-xs sm:text-sm leading-tight">{{ TITLE_ART }}</span>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <button type="button" :class="cardClass" @click="mode = 'setup'">
          <span class="whitespace-pre text-xs sm:text-sm leading-tight" aria-hidden="true">{{ SOLO_ART }}</span>
          <span class="font-display text-3xl leading-none uppercase">{{ t.gameSolo }}</span>
          <span class="term-muted text-sm leading-relaxed">{{ t.tankSoloDesc }}</span>
          <span class="mt-auto flex items-center justify-end pt-1">
            <span class="text-sm font-semibold uppercase tracking-widest term-muted group-hover:text-term" aria-hidden="true">&gt; run</span>
          </span>
        </button>

        <button type="button" :class="cardClass" @click="mode = 'online'">
          <span class="whitespace-pre text-xs sm:text-sm leading-tight" aria-hidden="true">{{ ONLINE_ART }}</span>
          <span class="font-display text-3xl leading-none uppercase">{{ t.gameOnline }}</span>
          <span class="term-muted text-sm leading-relaxed">{{ t.tankOnlineDesc }}</span>
          <span class="mt-auto flex items-center justify-end pt-1">
            <span class="text-sm font-semibold uppercase tracking-widest term-muted group-hover:text-term" aria-hidden="true">&gt; run</span>
          </span>
        </button>
      </div>

      <p class="term-muted text-center text-xs sm:text-sm leading-relaxed">{{ t.tankControls }}</p>
    </div>
  </TermWindow>

  <!-- Solo: how many bots and how good -->
  <TermWindow v-else-if="mode === 'setup'" class="max-w-2xl" :title="t.tankTitle" :backLabel="t.back" @back="mode = null">
    <div class="space-y-6">
      <h2 class="font-display text-4xl leading-none uppercase">{{ t.gameSolo }}</h2>

      <div class="space-y-4">
        <div class="flex flex-wrap items-center gap-2">
          <span class="term-label w-full sm:w-40">&gt; {{ t.tankEnemies }}</span>
          <button v-for="n in MAX_TANKS - 1" :key="n" type="button" :class="optionClass(setup.bots === n)" @click="setup.bots = n">{{ n }}</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="term-label w-full sm:w-40">&gt; {{ t.botLevel }}</span>
          <button v-for="level in LEVEL_NAMES" :key="level" type="button" :class="optionClass(setup.level === level)" @click="setup.level = level">{{ levelName(level) }}</button>
        </div>
      </div>

      <p class="term-muted text-sm leading-relaxed">&gt; {{ fmt(t.tankSoloHint, { n: setup.bots }) }} {{ t.tankLobbyHint }}</p>

      <button type="button" class="term-btn term-btn-primary w-full min-h-12" @click="startSolo">{{ t.startGame }}</button>
      <p class="term-muted text-center text-xs sm:text-sm leading-relaxed">{{ t.tankControls }}</p>
    </div>
  </TermWindow>

  <!-- Solo game -->
  <TankMatch v-else-if="mode === 'solo' && solo.view" :t="t" :room="solo" :live="live" :inbox="inbox" solo @exit="leaveSolo" @setup="leaveSolo" />

  <!-- Online -->
  <OnlineRoom
    v-else
    :room="room"
    :t="t"
    :title="t.tankTitle"
    :canStart="lobbyCount >= 2"
    :startHint="t.tankNeedTwo"
    @go-back="mode = null"
    @start="room.act('start')"
  >
    <template #lobby="{ view: lobby, isHost }">
      <div class="space-y-4">
        <!-- Bots fill the arena up to eight tanks -->
        <div class="space-y-2">
          <h2 class="term-label">{{ t.gameBots }} [{{ lobby.bots.length }}]</h2>
          <ul v-if="lobby.bots.length" class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <li v-for="bot in lobby.bots" :key="bot.id" class="flex items-center gap-2 border border-term-low px-3 py-2 text-sm">
              <span class="shrink-0 text-[10px] uppercase tracking-wider term-muted">[bot]</span>
              <span class="truncate">{{ fmt(t.botName, { n: bot.n }) }}</span>
              <button v-if="isHost" type="button" class="ml-auto shrink-0 term-link text-xs" :aria-label="fmt(t.removeBot, { name: fmt(t.botName, { n: bot.n }) })" @click="room.act('removeBot', { id: bot.id })">[x]</button>
            </li>
          </ul>
          <button v-if="isHost && lobbyCount < MAX_TANKS" type="button" class="term-link text-xs" @click="room.act('addBot')">[+] {{ t.addBot }}</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="term-label w-full sm:w-36">&gt; {{ t.botLevel }}</span>
          <button v-for="level in LEVEL_NAMES" :key="level" type="button" :disabled="!isHost" :class="optionClass(lobby.level === level)" @click="room.act('settings', { level })">{{ levelName(level) }}</button>
        </div>
        <div class="space-y-2 text-sm leading-relaxed">
          <p class="term-muted">&gt; {{ t.tankLobbyHint }}</p>
          <p class="term-muted">&gt; {{ t.tankControls }}</p>
        </div>
      </div>
    </template>

    <TankMatch :t="t" :room="room" :live="live" :inbox="inbox" @exit="room.leave()" />
  </OnlineRoom>
</template>
