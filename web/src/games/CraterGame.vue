<script setup>
import { ref, reactive, computed, watch, markRaw } from 'vue'
import TermWindow from '../components/TermWindow.vue'
import OnlineRoom from '../online/OnlineRoom.vue'
import { useOnlineRoom, currentRoom } from '../online/useOnlineRoom'
import { useLocalRoom } from '../online/useLocalRoom'
import CraterMatch from './crater/CraterMatch.vue'
import { createTerrain, spawnUnits, WATER_START, LEVEL_IDS } from './crater/terrain'
import { simulate, startAmmo, MAX_WALK, WEAPON_IDS, WEAPONS } from './crater/physics'
import { LEVELS as BOT_LEVELS, planShot, thinkTime } from './crater/bots'

const props = defineProps({
  t: { type: Object, required: true },
  // Room code from a shared invite link
  initialCode: { type: String, default: '' },
  // Open a room straight away: a chat invite is waiting for its code
  hostRoom: { type: Boolean, default: false }
})

const emit = defineEmits(['go-back'])

const MAX_SIDES = 6
const UNIT_OPTIONS = [1, 2, 3]
const TIME_OPTIONS = [15, 20, 30]
const LEVEL_OPTIONS = ['random', ...LEVEL_IDS]
const LEVEL_KEYS = { random: 'craterRandom', hills: 'craterHills', mountain: 'craterMountain', valley: 'craterValley', islands: 'craterIslands', plateaus: 'craterPlateaus', canyon: 'craterCanyon', caverns: 'craterCaverns', sky: 'craterSky', city: 'craterCity', cheese: 'craterCheese' }
const BOT_LEVEL_NAMES = Object.keys(BOT_LEVELS)
const SUDDEN_TURN = 8 // from this turn on the sea rises
const WATER_RISE = 3 // cells a turn
const AWAY_TURNS = 2 // turns a player can be gone before their side leaves the battle
const REPLAY_PAD_MS = 1300 // after the recording, before the next turn
const SETUP_KEY = 'craterSolo'

const LETTERS = {
  C: ['  ___ ', ' / __|', '| (__ ', ' \\___|'],
  R: [' ___ ', '| _ \\', '|   /', '|_|_\\'],
  A: ['   _   ', '  /_\\  ', ' / _ \\ ', '/_/ \\_\\'],
  T: [' _____ ', '|_   _|', '  | |  ', '  |_|  '],
  E: [' ___ ', '| __|', '| _| ', '|___|']
}
const TITLE_ART = [0, 1, 2, 3].map(row => [...'CRATER'].map(letter => LETTERS[letter][row]).join(' ')).join('\n')
const SOLO_ART = [' o          o   o', '/|\\  ~*~   /|\\ /|\\', '/ \\        / \\ / \\'].join('\n')
const ONLINE_ART = [' o    o    o    o', '/|\\  /|\\  /|\\  /|\\', '/ \\  / \\  / \\  / \\'].join('\n')
const UNIT_ART = [' o      o ', '/|\\ ~~ /|\\', '/ \\    / \\'].join('\n')

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const botLevelName = (level) => props.t[`bot${level[0].toUpperCase()}${level.slice(1)}`]

// null while choosing, then setup (solo options), solo or online; an invite goes straight online
const mode = ref(props.initialCode || props.hostRoom || currentRoom.value?.game === 'crater' ? 'online' : null)

// ---------- Host-side rules, for an online room and a solo game alike ----------
//
// Two to six sides, each a person or a bot, every side for itself. Each turn all of them aim
// at once; the host keeps the shots to itself until every side is in (or the clock runs out),
// then plays the turn out on its own copy of the ground and sends everyone the recording. The
// host also aims for the bots. A solo game is a room where this device is the host.

let ground = null // host: the ground the turns are played out on
let shots = [] // host: this turn's shots, by side
let walked = [] // host: where each side's unit walked to this turn, from live data
let away = [] // host: turns in a row each side's player has been gone
let botAt = [] // host: when each bot side fires this turn (host clock), or 0

const sideList = (s) => s.sides.map((_, side) => side)
const isBot = (s, id) => s.bots.some(b => b.id === id)
const present = (s, id) => isBot(s, id) || s.players.some(p => p.id === id && p.online)
const aliveOn = (s, side) => s.units.some(u => u.side === side && u.alive)
const people = (s) => s.players.filter(p => p.online)
const between = (s) => s.phase === 'lobby' || s.phase === 'over'
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
  s.locked = s.sides.map(() => false)
  shots = s.sides.map(() => null)
  walked = s.sides.map(() => null)
  // The bots take a moment over their shots, like anyone
  const latest = s.aimSeconds * 1000 - 1500
  botAt = s.sides.map((id, side) => (isBot(s, id) && aliveOn(s, side) ? now + Math.min(latest, thinkTime(s.botLevel)) : 0))
  s.phase = 'aim'
  s.deadline = now + s.aimSeconds * 1000
}

// The match ends when one side or none has units left
function finished (s) {
  const standing = sideList(s).filter(side => aliveOn(s, side))
  if (standing.length > 1) return false
  const winner = standing.length ? standing[0] : -1
  // Won because everyone else walked away
  const reason = winner >= 0 && sideList(s).every(side => side === winner || s.left[side]) ? 'left' : 'units'
  s.outcome = { winner, reason }
  s.phase = 'over'
  s.deadline = null
  s.locked = s.sides.map(() => false)
  if (winner >= 0) {
    const id = s.sides[winner]
    s.score[id] = (s.score[id] || 0) + 1
  }
  return true
}

function resolve (s, now = Date.now()) {
  const units = s.units.map(u => ({ ...u }))
  for (const side of sideList(s)) {
    const moved = shots[side] || walked[side]
    const unit = moved && units[moved.unit]
    if (unit?.alive && unit.side === side && validSpot(s, unit, moved.x, moved.y)) {
      unit.x = moved.x
      unit.y = moved.y
    }
    away[side] = present(s, s.sides[side]) || !aliveOn(s, side) ? 0 : (away[side] || 0) + 1
    // Gone too long: that side leaves the battle
    if (away[side] >= AWAY_TURNS && aliveOn(s, side)) {
      s.left[side] = true
      shots[side] = null
      units.forEach(u => {
        if (u.side === side) u.alive = false
      })
    }
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

// A side's shot is in; once every side still standing has fired, the turn plays out
function lockShot (s, side, shot) {
  // A limited weapon with none left fires a shell instead
  let weapon = shot.weapon
  if (WEAPONS[weapon].ammo) {
    if ((s.ammo[side][weapon] || 0) > 0) s.ammo[side][weapon]--
    else weapon = 'shell'
  }
  shots[side] = { unit: shot.unit, x: Number(shot.x), y: Number(shot.y), angle: shot.angle, power: Math.max(0.05, Math.min(1, shot.power)), weapon }
  s.locked[side] = true
  allIn(s)
}

function allIn (s) {
  if (s.phase === 'aim' && sideList(s).every(side => s.locked[side] || !aliveOn(s, side))) resolve(s)
}

function onAction (s, playerId, action) {
  const isHost = playerId === s.hostId
  const side = s.sides.indexOf(playerId)
  switch (action.type) {
    case 'settings':
      if (!isHost || !between(s)) return
      if (UNIT_OPTIONS.includes(action.perSide)) s.perSide = action.perSide
      if (TIME_OPTIONS.includes(action.aimSeconds)) s.aimSeconds = action.aimSeconds
      if (LEVEL_OPTIONS.includes(action.level)) s.level = action.level
      if (BOT_LEVEL_NAMES.includes(action.botLevel)) s.botLevel = action.botLevel
      break
    case 'addBot':
      if (!isHost || !between(s) || people(s).length + s.bots.length >= MAX_SIDES) return
      s.botSeq++
      s.bots.push({ id: `bot${s.botSeq}`, n: s.botSeq })
      break
    case 'removeBot':
      if (!isHost || !between(s)) return
      s.bots = s.bots.filter(b => b.id !== action.id)
      break
    case 'start': {
      if (!isHost || !between(s)) return
      const rematch = s.phase === 'over'
      s.players = people(s)
      // People first, then bots, up to six sides; anyone past that watches
      const ids = [...s.players.map(p => p.id), ...s.bots.map(b => b.id)].slice(0, MAX_SIDES)
      if (ids.length < 2) return
      // The same line-up again: everyone moves one place along, so the ends change
      const same = rematch && ids.length === s.sides.length && ids.every(id => s.sides.includes(id))
      s.sides = same ? [...s.sides.slice(1), s.sides[0]] : ids
      s.seed = Math.floor(Math.random() * 2 ** 31)
      s.mapLevel = s.level === 'random' ? LEVEL_IDS[Math.floor(Math.random() * LEVEL_IDS.length)] : s.level
      ground = createTerrain(s.seed, s.mapLevel)
      s.ammo = s.sides.map(() => startAmmo())
      s.units = spawnUnits(ground, s.perSide, Math.random, s.sides.length)
      s.left = s.sides.map(() => false)
      s.craters = []
      s.round++
      s.turn = 0
      s.water = WATER_START
      s.wind = 0
      s.replay = null
      s.outcome = null
      away = s.sides.map(() => 0)
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
      lockShot(s, side, { unit: action.unit, x: action.x, y: action.y, angle, power, weapon: action.weapon })
      break
    }
    case 'lobby':
      if (!isHost || s.phase !== 'over') return
      s.players = people(s)
      s.phase = 'lobby'
      break
  }
}

// Where a player's unit has walked to this turn, from their live data
function noteWalk (s, playerId, data) {
  const side = s?.sides?.indexOf(playerId) ?? -1
  if (side < 0 || !data || data.turn !== s.turn) return
  walked[side] = { unit: data.u, x: round2(Number(data.x)), y: Number(data.y) }
}

function onTick (s, now) {
  if (s.phase === 'aim') {
    // The bots whose moment has come fire
    for (const side of sideList(s)) {
      if (s.phase !== 'aim') break
      if (!botAt[side] || now < botAt[side] || s.locked[side]) continue
      botAt[side] = 0
      const shot = planShot({ ground, units: s.units, side, wind: s.wind, water: s.water, ammo: s.ammo[side], level: s.botLevel })
      if (shot) lockShot(s, side, shot)
      else {
        s.locked[side] = true
        allIn(s)
      }
    }
    if (s.phase === 'aim' && now >= s.deadline) resolve(s, now)
  } else if (s.phase === 'resolve' && now >= s.deadline && !finished(s)) {
    nextTurn(s, now)
  }
}

const initialState = () => ({
  perSide: 2,
  aimSeconds: 20,
  level: 'random', // the host's pick
  mapLevel: 'hills', // this match's map
  botLevel: 'normal',
  bots: [],
  botSeq: 0,
  ammo: [],
  round: 0,
  turn: 0,
  seed: 0,
  sides: [],
  left: [],
  units: [],
  craters: [],
  wind: 0,
  water: WATER_START,
  deadline: null,
  locked: [],
  replay: null,
  outcome: null,
  score: {}
})

// The players' walking, many times a second: shown on everyone's screen as it happens
const live = markRaw({ samples: {} })

// ---------- Online ----------

function onLive (data) {
  const view = room.view
  if (!view) return
  const samples = {}
  for (const [id, sample] of Object.entries(data)) {
    const side = view.sides?.indexOf(id) ?? -1
    if (side >= 0 && sample && typeof sample === 'object') samples[side] = sample
  }
  live.samples = samples
  // The host's own walking counts too, as a guest's does
  if (room.isHost) noteWalk(view, room.myId, data[room.myId])
}


const room = useOnlineRoom({
  game: 'crater',
  initialCode: props.initialCode,
  hostRoom: props.hostRoom,
  liveMs: 80,
  initialState,
  onAction,
  onLive,
  onGuestLive: (playerId, data) => noteWalk(room.view, playerId, data),
  onTick
})

// Development builds expose the room, for scripted play-testing
if (import.meta.env.DEV) window.__craterRoom = room

const lobbyCount = computed(() => (room.view ? people(room.view).length + room.view.bots.length : 0))

// ---------- Solo ----------

const loadSetup = () => {
  const fallback = { bots: 1, botLevel: 'normal', perSide: 2, aimSeconds: 20, level: 'random' }
  try {
    const saved = JSON.parse(localStorage.getItem(SETUP_KEY) || '{}')
    return {
      bots: saved.bots >= 1 && saved.bots < MAX_SIDES ? saved.bots : fallback.bots,
      botLevel: BOT_LEVEL_NAMES.includes(saved.botLevel) ? saved.botLevel : fallback.botLevel,
      perSide: UNIT_OPTIONS.includes(saved.perSide) ? saved.perSide : fallback.perSide,
      aimSeconds: TIME_OPTIONS.includes(saved.aimSeconds) ? saved.aimSeconds : fallback.aimSeconds,
      level: LEVEL_OPTIONS.includes(saved.level) ? saved.level : fallback.level
    }
  } catch {
    return fallback
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

const solo = useLocalRoom({ initialState, onAction, onTick, onGuestLive: (playerId, data) => noteWalk(solo.view, playerId, data) })


const savedName = () => {
  try {
    return localStorage.getItem('onlineName') || ''
  } catch {
    return ''
  }
}

function startSolo () {
  const bots = Array.from({ length: setup.bots }, (_, i) => ({ id: `bot${i + 1}`, n: i + 1 }))
  solo.open(savedName() || props.t.gameYou, {
    perSide: setup.perSide,
    aimSeconds: setup.aimSeconds,
    level: setup.level,
    botLevel: setup.botLevel,
    bots,
    botSeq: bots.length
  })
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
  <TermWindow v-if="mode === null" class="max-w-2xl" :title="t.craterTitle" :backLabel="t.back" @back="emit('go-back')">
    <div class="space-y-6">
      <div class="overflow-hidden text-center" aria-hidden="true">
        <span class="inline-block whitespace-pre text-left text-[0.55rem] min-[400px]:text-xs sm:text-sm leading-tight">{{ TITLE_ART }}</span>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <button type="button" :class="cardClass" @click="mode = 'setup'">
          <span class="whitespace-pre text-xs sm:text-sm leading-tight" aria-hidden="true">{{ SOLO_ART }}</span>
          <span class="font-display text-3xl leading-none uppercase">{{ t.gameSolo }}</span>
          <span class="term-muted text-sm leading-relaxed">{{ t.craterSoloDesc }}</span>
          <span class="mt-auto flex items-center justify-end pt-1">
            <span class="text-sm font-semibold uppercase tracking-widest term-muted group-hover:text-term" aria-hidden="true">&gt; run</span>
          </span>
        </button>

        <button type="button" :class="cardClass" @click="mode = 'online'">
          <span class="whitespace-pre text-xs sm:text-sm leading-tight" aria-hidden="true">{{ ONLINE_ART }}</span>
          <span class="font-display text-3xl leading-none uppercase">{{ t.gameOnline }}</span>
          <span class="term-muted text-sm leading-relaxed">{{ t.craterOnlineDesc }}</span>
          <span class="mt-auto flex items-center justify-end pt-1">
            <span class="text-sm font-semibold uppercase tracking-widest term-muted group-hover:text-term" aria-hidden="true">&gt; run</span>
          </span>
        </button>
      </div>

      <p class="term-muted text-center text-xs sm:text-sm leading-relaxed">{{ t.craterControls }}</p>
    </div>
  </TermWindow>

  <!-- Solo: opponents, bots, units, time and map -->
  <TermWindow v-else-if="mode === 'setup'" class="max-w-2xl" :title="t.craterTitle" :backLabel="t.back" @back="mode = null">
    <div class="space-y-6">
      <h2 class="font-display text-4xl leading-none uppercase">{{ t.gameSolo }}</h2>

      <div class="space-y-4 text-sm">
        <div class="flex flex-wrap items-center gap-2">
          <span class="term-label w-full sm:w-44">&gt; {{ t.craterEnemies }}</span>
          <button v-for="n in MAX_SIDES - 1" :key="n" type="button" :class="optionClass(setup.bots === n)" @click="setup.bots = n">{{ n }}</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="term-label w-full sm:w-44">&gt; {{ t.botLevel }}</span>
          <button v-for="level in BOT_LEVEL_NAMES" :key="level" type="button" :class="optionClass(setup.botLevel === level)" @click="setup.botLevel = level">{{ botLevelName(level) }}</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="term-label w-full sm:w-44">&gt; {{ t.craterUnits }}</span>
          <button v-for="n in UNIT_OPTIONS" :key="n" type="button" :class="optionClass(setup.perSide === n)" @click="setup.perSide = n">{{ n }}</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="term-label w-full sm:w-44">&gt; {{ t.craterTurnTime }}</span>
          <button v-for="n in TIME_OPTIONS" :key="n" type="button" :class="optionClass(setup.aimSeconds === n)" @click="setup.aimSeconds = n">{{ fmt(t.craterSeconds, { n }) }}</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="term-label w-full sm:w-44">&gt; {{ t.craterMap }}</span>
          <button v-for="id in LEVEL_OPTIONS" :key="id" type="button" :class="optionClass(setup.level === id)" @click="setup.level = id">{{ t[LEVEL_KEYS[id]] }}</button>
        </div>
      </div>

      <p class="term-muted text-sm leading-relaxed">&gt; {{ fmt(t.craterSoloHint, { n: setup.bots }) }} {{ t.craterAmmoHint }}</p>

      <button type="button" class="term-btn term-btn-primary w-full min-h-12" @click="startSolo">{{ t.startGame }}</button>
      <p class="term-muted text-center text-xs sm:text-sm leading-relaxed">{{ t.craterControls }}</p>
    </div>
  </TermWindow>

  <!-- Solo game -->
  <CraterMatch v-else-if="mode === 'solo' && solo.view" :t="t" :room="solo" :live="live" :suddenTurn="SUDDEN_TURN" solo @exit="leaveSolo" @setup="leaveSolo" />

  <!-- Online -->
  <OnlineRoom
    v-else
    :room="room"
    :t="t"
    :title="t.craterTitle"
    :canStart="lobbyCount >= 2"
    :startHint="t.craterNeedTwo"
    @go-back="mode = null"
    @start="room.act('start')"
  >
    <template #lobby="{ view: lobby, isHost }">
      <div class="space-y-4">
        <div class="text-center" aria-hidden="true">
          <span class="inline-block whitespace-pre text-left text-sm leading-tight">{{ UNIT_ART }}</span>
        </div>

        <!-- Bots fill the battle up to six sides -->
        <div class="space-y-2">
          <h2 class="term-label">{{ t.gameBots }} [{{ lobby.bots.length }}]</h2>
          <ul v-if="lobby.bots.length" class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <li v-for="bot in lobby.bots" :key="bot.id" class="flex items-center gap-2 border border-term-low px-3 py-2 text-sm">
              <span class="shrink-0 text-[10px] uppercase tracking-wider term-muted">[bot]</span>
              <span class="truncate">{{ fmt(t.botName, { n: bot.n }) }}</span>
              <button v-if="isHost" type="button" class="ml-auto shrink-0 term-link text-xs" :aria-label="fmt(t.removeBot, { name: fmt(t.botName, { n: bot.n }) })" @click="room.act('removeBot', { id: bot.id })">[x]</button>
            </li>
          </ul>
          <button v-if="isHost && lobbyCount < MAX_SIDES" type="button" class="term-link text-xs" @click="room.act('addBot')">[+] {{ t.addBot }}</button>
        </div>

        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span class="term-label w-full sm:w-44">&gt; {{ t.botLevel }}</span>
          <button
            v-for="level in BOT_LEVEL_NAMES"
            :key="level"
            type="button"
            :disabled="!isHost"
            :class="optionClass(lobby.botLevel === level)"
            @click="room.act('settings', { botLevel: level })"
          >{{ botLevelName(level) }}</button>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span class="term-label w-full sm:w-44">&gt; {{ t.craterUnits }}</span>
          <button
            v-for="n in UNIT_OPTIONS"
            :key="n"
            type="button"
            :disabled="!isHost"
            :class="optionClass(lobby.perSide === n)"
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
            :class="optionClass(lobby.aimSeconds === n)"
            @click="room.act('settings', { aimSeconds: n })"
          >{{ fmt(t.craterSeconds, { n }) }}</button>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span class="term-label w-full sm:w-44">&gt; {{ t.craterMap }}</span>
          <button
            v-for="id in LEVEL_OPTIONS"
            :key="id"
            type="button"
            :disabled="!isHost"
            :class="optionClass(lobby.level === id)"
            @click="room.act('settings', { level: id })"
          >{{ t[LEVEL_KEYS[id]] }}</button>
        </div>
        <div class="space-y-2 text-sm leading-relaxed">
          <p class="term-muted">&gt; {{ t.craterLobbyHint }}</p>
          <p class="term-muted">&gt; {{ t.craterAmmoHint }}</p>
          <p class="term-muted">&gt; {{ t.craterControls }}</p>
        </div>
      </div>
    </template>

    <CraterMatch :t="t" :room="room" :live="live" :suddenTurn="SUDDEN_TURN" @exit="room.leave()" />
  </OnlineRoom>
</template>
