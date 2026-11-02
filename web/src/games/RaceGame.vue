<script setup>
import { ref, reactive, computed, watch, markRaw } from 'vue'
import TermWindow from '../components/TermWindow.vue'
import OnlineRoom from '../online/OnlineRoom.vue'
import { useOnlineRoom, currentRoom } from '../online/useOnlineRoom'
import { useLocalRoom } from '../online/useLocalRoom'
import RaceMatch from './race/RaceMatch.vue'
import { TRACKS } from './race/track.js'
import { MAX_CARS, formatTime } from './race/race.js'
import { initialState, onAction, onTick, onLeave, dropOut, entrants, LAP_CHOICES, BOT_LEVELS, QUIET_MS } from './race/room.js'
import { newBuffer, addSample } from './race/ghosts.js'
import { bestLap } from './race/records.js'

const props = defineProps({
  t: { type: Object, required: true },
  // Room code from a shared invite link
  initialCode: { type: String, default: '' },
  // Open a room straight away: a chat invite is waiting for its code
  hostRoom: { type: Boolean, default: false }
})

const emit = defineEmits(['go-back'])

const SETUP_KEY = 'raceSolo'
const TITLE_ART = [
  ' _____________________________',
  '/ H=[@]=-   H=[B]=-  H=[C]=-   \\',
  '|  ___________________________ |',
  '| |#_#|                       ||',
  '\\_|_#_|_______________________/'
].join('\n')
const SOLO_ART = [' o.  .o     o.  .o', 'H=[@]=-    H=[B]=-', " o'  'o     o'  'o"].join('\n')
const ONLINE_ART = [' o.  .o   o.  .o   o.  .o', 'H=[A]=-  H=[B]=-  H=[C]=-', " o'  'o   o'  'o   o'  'o"].join('\n')

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const levelName = (level) => props.t[`bot${level[0].toUpperCase()}${level.slice(1)}`]
const trackName = (index) => props.t[`raceTrack_${TRACKS[index].id}`]
const trackNote = (index) => props.t[`raceTrackNote_${TRACKS[index].id}`]
const bestOn = (index) => {
  const ms = bestLap(TRACKS[index].id)
  return ms ? fmt(props.t.raceBestOn, { time: formatTime(ms) }) : props.t.raceNoBest
}

// null while choosing, then setup (solo options), solo or online; an invite goes straight online
const mode = ref(props.initialCode || props.hostRoom || currentRoom.value?.game === 'race' ? 'online' : null)

// ---------- Live places ----------
//
// Every car's samples, kept a few at a time so other players' cars can be drawn smoothly (see
// race/ghosts.js). The host's own samples carry the bots' places too (as `b`).

const live = markRaw({ buffers: {}, round: 0 })
const inbox = markRaw([]) // shots and hits from the others, for the race to pick up
const lastSeen = {} // host: player id -> when their car last sent its place

function keep (id, sample, now) {
  live.buffers[id] ||= newBuffer()
  addSample(live.buffers[id], sample, now)
}

function readLive (data, round) {
  if (round !== live.round) {
    live.buffers = {}
    live.round = round
  }
  const now = Date.now()
  for (const [id, sample] of Object.entries(data)) {
    if (!sample || typeof sample !== 'object' || sample.r !== round) continue
    keep(id, sample, now)
    if (sample.b && typeof sample.b === 'object') {
      for (const [bot, pose] of Object.entries(sample.b)) if (pose && typeof pose === 'object') keep(bot, pose, now)
    }
  }
}

// ---------- Online ----------

// The host's rules, plus one of its own: a person whose car has sent nothing for a while has
// left the race (a locked phone, a closed tab). Bots and solo races don't go quiet, and nor
// does the host, whose page keeps the room going.
function tickRace (s, now) {
  onTick(s, now)
  if (s.phase !== 'racing' || s.solo) return
  for (const [id, car] of Object.entries(s.cars)) {
    if (car.bot || car.out || car.place || id === s.hostId) continue
    if (now - Math.max(lastSeen[id] || 0, s.goAt) > QUIET_MS) dropOut(s, id, now)
  }
}

const room = useOnlineRoom({
  game: 'race',
  initialCode: props.initialCode,
  hostRoom: props.hostRoom,
  liveMs: 50,
  initialState,
  onAction: (s, playerId, action) => onAction(s, playerId, action),
  onLive: (data) => readLive(data, room.view?.round),
  onGuestLive: (playerId) => {
    lastSeen[playerId] = Date.now()
  },
  onEvent: (data, from) => {
    if (data?.k === 'shot' || data?.k === 'hit') inbox.push({ from, data })
  },
  onLeave,
  onTick: tickRace
})

const lobbyCount = computed(() => (room.view ? entrants(room.view).length : 0))
const peopleCount = computed(() => (room.view ? room.view.players.filter(p => p.online).length : 0))

// ---------- Solo ----------

const loadSetup = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(SETUP_KEY) || '{}')
    return {
      track: Number.isInteger(saved.track) && saved.track >= 0 && saved.track < TRACKS.length ? saved.track : 0,
      laps: LAP_CHOICES.includes(saved.laps) ? saved.laps : 3,
      bots: Number.isInteger(saved.bots) && saved.bots >= 0 && saved.bots < MAX_CARS ? saved.bots : 3,
      level: BOT_LEVELS.includes(saved.level) ? saved.level : 'normal',
      weapons: typeof saved.weapons === 'boolean' ? saved.weapons : true
    }
  } catch {
    return { track: 0, laps: 3, bots: 3, level: 'normal', weapons: true }
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

const solo = useLocalRoom({ initialState, onAction: (s, playerId, action) => onAction(s, playerId, action), onTick })

const savedName = () => {
  try {
    return localStorage.getItem('onlineName') || ''
  } catch {
    return ''
  }
}

function startSolo () {
  const bots = Array.from({ length: setup.bots }, (_, i) => ({ id: `bot${i + 1}`, n: i + 1 }))
  solo.open(savedName() || props.t.gameYou, { solo: true, track: setup.track, laps: setup.laps, level: setup.level, weapons: setup.weapons, bots, botSeq: bots.length })
  inbox.length = 0
  live.buffers = {}
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
  <TermWindow v-if="mode === null" class="max-w-2xl" :title="t.raceTitle" :backLabel="t.back" @back="emit('go-back')">
    <div class="space-y-6">
      <div class="overflow-hidden text-center" aria-hidden="true">
        <span class="inline-block whitespace-pre text-left text-[0.6rem] min-[400px]:text-xs sm:text-sm leading-tight">{{ TITLE_ART }}</span>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <button type="button" :class="cardClass" @click="mode = 'setup'">
          <span class="whitespace-pre text-xs sm:text-sm leading-tight" aria-hidden="true">{{ SOLO_ART }}</span>
          <span class="font-display text-3xl leading-none uppercase">{{ t.gameSolo }}</span>
          <span class="term-muted text-sm leading-relaxed">{{ t.raceSoloDesc }}</span>
          <span class="mt-auto flex items-center justify-end pt-1">
            <span class="text-sm font-semibold uppercase tracking-widest term-muted group-hover:text-term" aria-hidden="true">&gt; run</span>
          </span>
        </button>

        <button type="button" :class="cardClass" @click="mode = 'online'">
          <span class="whitespace-pre text-xs sm:text-sm leading-tight" aria-hidden="true">{{ ONLINE_ART }}</span>
          <span class="font-display text-3xl leading-none uppercase">{{ t.gameOnline }}</span>
          <span class="term-muted text-sm leading-relaxed">{{ t.raceOnlineDesc }}</span>
          <span class="mt-auto flex items-center justify-end pt-1">
            <span class="text-sm font-semibold uppercase tracking-widest term-muted group-hover:text-term" aria-hidden="true">&gt; run</span>
          </span>
        </button>
      </div>

      <p class="term-muted text-center text-xs sm:text-sm leading-relaxed">{{ t.raceControls }}</p>
    </div>
  </TermWindow>

  <!-- Solo: the track, the laps and the bots -->
  <TermWindow v-else-if="mode === 'setup'" class="max-w-2xl" :title="t.raceTitle" :backLabel="t.back" @back="mode = null">
    <div class="space-y-6">
      <h2 class="font-display text-4xl leading-none uppercase">{{ t.gameSolo }}</h2>

      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="(track, index) in TRACKS"
            :key="track.id"
            type="button"
            :class="['term-option flex flex-col items-start gap-1 px-3 py-2 text-left', { 'is-active': setup.track === index }]"
            @click="setup.track = index"
          >
            <span class="font-semibold">{{ trackName(index) }}</span>
            <span class="text-xs opacity-75">{{ trackNote(index) }}</span>
            <span class="text-xs opacity-75 tabular-nums">{{ bestOn(index) }}</span>
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="term-label w-full sm:w-40">&gt; {{ t.raceLaps }}</span>
          <button v-for="n in LAP_CHOICES" :key="n" type="button" :class="optionClass(setup.laps === n)" @click="setup.laps = n">{{ n }}</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="term-label w-full sm:w-40">&gt; {{ t.raceBotCars }}</span>
          <button v-for="n in MAX_CARS" :key="n" type="button" :class="optionClass(setup.bots === n - 1)" @click="setup.bots = n - 1">{{ n - 1 }}</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="term-label w-full sm:w-40">&gt; {{ t.botLevel }}</span>
          <button v-for="level in BOT_LEVELS" :key="level" type="button" :disabled="!setup.bots" :class="optionClass(setup.level === level)" @click="setup.level = level">{{ levelName(level) }}</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="term-label w-full sm:w-40">&gt; {{ t.raceWeapons }}</span>
          <button type="button" :class="optionClass(setup.weapons)" @click="setup.weapons = true">{{ t.raceWeaponsOn }}</button>
          <button type="button" :class="optionClass(!setup.weapons)" @click="setup.weapons = false">{{ t.raceWeaponsOff }}</button>
        </div>
      </div>

      <p class="term-muted text-sm leading-relaxed">&gt; {{ setup.bots ? fmt(t.raceSoloHint, { n: setup.bots }) : t.raceTimeTrial }} {{ t.raceLobbyHint }}</p>

      <button type="button" class="term-btn term-btn-primary w-full min-h-12" @click="startSolo">{{ t.startGame }}</button>
      <p class="term-muted text-center text-xs sm:text-sm leading-relaxed">{{ t.raceControls }}</p>
    </div>
  </TermWindow>

  <!-- Solo race -->
  <RaceMatch v-else-if="mode === 'solo' && solo.view" :t="t" :room="solo" :live="live" :inbox="inbox" solo @exit="leaveSolo" @setup="leaveSolo" />

  <!-- Online -->
  <OnlineRoom
    v-else
    :room="room"
    :t="t"
    :title="t.raceTitle"
    :canStart="lobbyCount >= 1"
    @go-back="mode = null"
    @start="room.act('start')"
  >
    <template #lobby="{ view: lobby, isHost }">
      <div class="space-y-4">
        <!-- Bots fill the grid up to six cars -->
        <div class="space-y-2">
          <h2 class="term-label">{{ t.gameBots }} [{{ lobby.bots.length }}]</h2>
          <ul v-if="lobby.bots.length" class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <li v-for="bot in lobby.bots" :key="bot.id" class="flex items-center gap-2 border border-term-low px-3 py-2 text-sm">
              <span class="shrink-0 text-[10px] uppercase tracking-wider term-muted">[bot]</span>
              <span class="truncate">{{ fmt(t.botName, { n: bot.n }) }}</span>
              <button v-if="isHost" type="button" class="ml-auto shrink-0 term-link text-xs" :aria-label="fmt(t.removeBot, { name: fmt(t.botName, { n: bot.n }) })" @click="room.act('removeBot', { id: bot.id })">[x]</button>
            </li>
          </ul>
          <button v-if="isHost && peopleCount + lobby.bots.length < MAX_CARS" type="button" class="term-link text-xs" @click="room.act('addBot')">[+] {{ t.addBot }}</button>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="(track, index) in TRACKS"
            :key="track.id"
            type="button"
            :disabled="!isHost"
            :class="['term-option flex flex-col items-start gap-1 px-3 py-2 text-left', { 'is-active': lobby.track === index }]"
            @click="room.act('settings', { track: index })"
          >
            <span class="font-semibold">{{ trackName(index) }}</span>
            <span class="text-xs opacity-75">{{ trackNote(index) }}</span>
            <span class="text-xs opacity-75 tabular-nums">{{ bestOn(index) }}</span>
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="term-label w-full sm:w-36">&gt; {{ t.raceLaps }}</span>
          <button v-for="n in LAP_CHOICES" :key="n" type="button" :disabled="!isHost" :class="optionClass(lobby.laps === n)" @click="room.act('settings', { laps: n })">{{ n }}</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="term-label w-full sm:w-36">&gt; {{ t.botLevel }}</span>
          <button v-for="level in BOT_LEVELS" :key="level" type="button" :disabled="!isHost" :class="optionClass(lobby.level === level)" @click="room.act('settings', { level })">{{ levelName(level) }}</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="term-label w-full sm:w-36">&gt; {{ t.raceWeapons }}</span>
          <button type="button" :disabled="!isHost" :class="optionClass(lobby.weapons)" @click="room.act('settings', { weapons: true })">{{ t.raceWeaponsOn }}</button>
          <button type="button" :disabled="!isHost" :class="optionClass(!lobby.weapons)" @click="room.act('settings', { weapons: false })">{{ t.raceWeaponsOff }}</button>
        </div>
        <div class="space-y-2 text-sm leading-relaxed">
          <p class="term-muted">&gt; {{ t.raceLobbyHint }}</p>
          <p class="term-muted">&gt; {{ t.raceControls }}</p>
        </div>
      </div>
    </template>

    <RaceMatch :t="t" :room="room" :live="live" :inbox="inbox" @exit="room.leave()" />
  </OnlineRoom>
</template>
