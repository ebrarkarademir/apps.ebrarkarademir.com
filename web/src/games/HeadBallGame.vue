<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, markRaw } from 'vue'
import confetti from 'canvas-confetti'
import { recordWin } from '../online/profile'
import TermWindow from '../components/TermWindow.vue'
import OnlineRoom from '../online/OnlineRoom.vue'
import { useOnlineRoom, currentRoom } from '../online/useOnlineRoom'
import HeadBallStage from './headball/HeadBallStage.vue'
import { LENGTHS } from './headball/engine'
import { LEVELS } from './headball/bots'
import { CHARACTERS, lookOf, otherLook } from './headball/characters'
import { portrait } from './headball/renderer'

// Head Ball: one against one, big heads, a side-on pitch. Solo against the computer, or online:
// two seats, red and blue, and anyone else in the room watches. An empty seat at kick-off gets
// the computer.

const props = defineProps({
  t: { type: Object, required: true },
  initialCode: { type: String, default: '' },
  hostRoom: { type: Boolean, default: false }
})

const emit = defineEmits(['go-back'])

const SETUP_KEY = 'headballSolo'
const LOOK_KEY = 'headballLook'
const LEVEL_NAMES = Object.keys(LEVELS)
const SIDES = [0, 1]
const CONFETTI = { particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ['#e8402a', '#2f6ee8', '#ffd23a', '#ffffff'], shapes: ['square'] }

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const clockText = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const levelName = (level) => props.t[`bot${level[0].toUpperCase()}${level.slice(1)}`]
const lengthName = (s) => (s % 60 ? fmt(props.t.headballSeconds, { n: s }) : fmt(props.t.headballMinutes, { n: s / 60 }))
const sideName = (side) => [props.t.headballRed, props.t.headballBlue][side]

const mode = ref(props.initialCode || props.hostRoom || currentRoom.value?.game === 'headball' ? 'online' : null)

// The look this device picked, remembered, used solo and taken into online rooms
const myLook = ref((() => {
  try {
    return lookOf(Number(localStorage.getItem(LOOK_KEY)))
  } catch {
    return 0
  }
})())
watch(myLook, (n) => {
  try {
    localStorage.setItem(LOOK_KEY, String(n))
  } catch {
    // Remembering it is a convenience only
  }
})

const portraits = computed(() => CHARACTERS.map((_, i) => portrait(i, 0)))
const portraitsBlue = computed(() => CHARACTERS.map((_, i) => portrait(i, 1)))

// ---------- Solo ----------

const loadSetup = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(SETUP_KEY) || '{}')
    return {
      level: LEVEL_NAMES.includes(saved.level) ? saved.level : 'normal',
      length: LENGTHS.includes(saved.length) ? saved.length : 90
    }
  } catch {
    return { level: 'normal', length: 90 }
  }
}

const setup = reactive(loadSetup())
const solo = reactive({ round: 0, paused: false, result: null, cpuLook: 1 })

watch(setup, (value) => {
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify(value))
  } catch {
    // Remembering the choice is a convenience only
  }
})

const savedName = () => {
  try {
    return localStorage.getItem('onlineName') || ''
  } catch {
    return ''
  }
}

const soloPlayers = computed(() => [
  { id: 'me', name: savedName() || props.t.headballYou, look: myLook.value, bot: false },
  { id: 'cpu', name: props.t.headballCpu, look: solo.cpuLook, bot: true }
])

function kickOffSolo () {
  Object.assign(solo, { round: solo.round + 1, paused: false, result: null, cpuLook: otherLook(myLook.value) })
  mode.value = 'solo'
}

function onSoloEnd (result) {
  solo.result = result
  if (result.winner === 0) {
    recordWin('headball')
    confetti(CONFETTI)
  }
}

function togglePause () {
  if (!solo.result) solo.paused = !solo.paused
}

function onPauseClick (event) {
  togglePause()
  if (event.detail) event.currentTarget.blur()
}

function onVisibility () {
  if (document.hidden && mode.value === 'solo' && !solo.result) solo.paused = true
}

onMounted(() => document.addEventListener('visibilitychange', onVisibility))
onUnmounted(() => document.removeEventListener('visibilitychange', onVisibility))

const goalList = (goals, players) => goals.map(goal => ({ ...goal, name: players[goal.side]?.name || '?' }))
const soloGoals = computed(() => (solo.result ? goalList(solo.result.goals, soloPlayers.value) : []))
const soloVerdict = computed(() => {
  if (!solo.result) return ''
  const { winner } = solo.result
  return winner === null ? props.t.headballDraw : winner === 0 ? props.t.headballYouWin : props.t.headballYouLose
})

// ---------- Online: host-side rules ----------
//
// The host's device runs the match (see HeadBallStage) and sends snapshots of it as its live
// data; the other player sends their controls as theirs. The room state holds the seats, each
// person's look, the settings and the results.

const inputs = markRaw(new Map())
const snaps = markRaw([])

const seated = (s) => s.seats.filter(id => id && s.players.some(p => p.id === id && p.online))

function onAction (s, playerId, action) {
  const isHost = playerId === s.hostId
  const between = s.phase === 'lobby' || s.phase === 'results'
  switch (action.type) {
    case 'seat': {
      if (!between) return
      const side = SIDES.includes(action.side) ? action.side : null
      if (side !== null && s.seats[side] && s.seats[side] !== playerId && s.players.some(p => p.id === s.seats[side] && p.online)) return
      s.seats = s.seats.map(id => (id === playerId ? null : id))
      if (side !== null) s.seats[side] = playerId
      break
    }
    case 'look':
      if (Number.isInteger(action.n) && action.n >= 0 && action.n < CHARACTERS.length) s.looks[playerId] = action.n
      break
    case 'settings':
      if (!isHost || !between) return
      if (LENGTHS.includes(action.length)) s.length = action.length
      if (LEVEL_NAMES.includes(action.level)) s.level = action.level
      break
    case 'start': {
      if (!isHost || !between) return
      s.players = s.players.filter(p => p.online)
      s.seats = s.seats.map(id => (id && s.players.some(p => p.id === id) ? id : null))
      if (!s.seats.some(Boolean)) return
      s.round++
      const taken = s.seats.map(id => (id ? lookOf(s.looks[id]) : null))
      s.lineup = s.seats.map((id, side) => {
        if (id) return { id, name: s.players.find(p => p.id === id)?.name || '?', look: taken[side], bot: false }
        return { id: `cpu${side}`, name: '', look: otherLook(taken[1 - side] ?? 0), bot: true }
      })
      s.result = null
      s.phase = 'match'
      break
    }
    case 'end': {
      if (!isHost || s.phase !== 'match' || !Array.isArray(action.score) || !Array.isArray(action.goals)) return
      const winner = SIDES.includes(action.winner) ? action.winner : null
      s.result = { score: action.score.slice(0, 2), winner, goals: action.goals.slice(0, 60).map(g => ({ side: g.side === 1 ? 1 : 0, at: g.at | 0 })) }
      if (winner !== null) s.wins[winner]++
      s.phase = 'results'
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
  game: 'headball',
  initialCode: props.initialCode,
  hostRoom: props.hostRoom,
  liveMs: 50,
  initialState: () => ({ seats: [null, null], looks: {}, length: 90, level: 'normal', round: 0, lineup: [], result: null, wins: [0, 0] }),
  onAction,
  // A newcomer takes a free seat; during a match they watch
  onJoin: (s, player) => {
    if (s.phase !== 'lobby' || s.seats.includes(player.id)) return
    const free = s.seats.findIndex(id => !id || !s.players.some(p => p.id === id && p.online))
    if (free >= 0) s.seats[free] = player.id
  },
  onLeave: (s, player) => {
    if (s.phase === 'lobby') s.seats = s.seats.map(id => (id === player.id ? null : id))
    inputs.delete(player.id)
  },
  onGuestLive: (playerId, data) => {
    if (data && typeof data === 'object') inputs.set(playerId, { ...data, at: Date.now() })
  },
  onLive: (data) => {
    if (room.isHost) return
    const snap = data?.[room.view?.hostId]
    if (snap && typeof snap === 'object') {
      snaps.push(snap)
      if (snaps.length > 60) snaps.splice(0, snaps.length - 60)
    }
  }
})

// ---------- Online: view ----------

const view = computed(() => room.view)
const inMatch = computed(() => view.value?.phase === 'match')
const online = computed(() => Object.fromEntries((view.value?.players || []).map(p => [p.id, p.online])))
const mySeat = computed(() => view.value?.seats?.indexOf(room.myId) ?? -1)
const lookFor = (id) => lookOf(view.value?.looks?.[id])

// Bring this device's look into the room, once it's in
watch(() => view.value && room.myId && view.value.looks?.[room.myId], (have) => {
  if (view.value && room.myId && have === undefined) room.act('look', { n: myLook.value })
}, { immediate: true })

function pickLook (n) {
  myLook.value = n
  if (mode.value === 'online' && view.value) room.act('look', { n })
}

const seatInfo = (side) => {
  const s = view.value
  const id = s?.seats?.[side]
  const player = id ? s.players.find(p => p.id === id) : null
  if (!player || !player.online) return { empty: true, name: props.t.headballCpu, look: null }
  return { empty: false, id, name: player.name, look: lookFor(id), me: id === room.myId, host: id === s.hostId }
}

const watchers = computed(() => (view.value?.players || []).filter(p => p.online && !view.value.seats.includes(p.id)))
const canStart = computed(() => !!view.value && seated(view.value).length > 0)

const lineup = computed(() => (view.value?.lineup || []).map(e => ({ ...e, name: e.bot ? props.t.headballCpu : e.name })))

const result = computed(() => view.value?.result || null)
const resultGoals = computed(() => (result.value ? goalList(result.value.goals, lineup.value) : []))
const resultText = computed(() => {
  if (!result.value) return ''
  const { winner } = result.value
  return winner === null ? props.t.headballDraw : fmt(props.t.headballWins, { name: lineup.value[winner]?.name || '?' })
})

watch(() => (view.value?.phase === 'results' ? view.value.round : 0), (round) => {
  if (!round || result.value?.winner == null) return
  if (view.value.lineup[result.value.winner]?.id === room.myId) {
    recordWin('headball')
    confetti(CONFETTI)
  }
})

watch(() => view.value?.round, () => {
  snaps.length = 0
  inputs.clear()
})

const cardClass = 'term-card group flex flex-col gap-3 p-5 text-left'
const optionClass = (active) => ['term-option min-h-10 px-3 text-sm font-semibold', { 'is-active': active }]
</script>

<template>
  <!-- Choose solo or online -->
  <TermWindow v-if="mode === null" class="max-w-2xl" :title="t.headballTitle" :backLabel="t.back" @back="emit('go-back')">
    <div class="space-y-6">
      <div class="flex items-end justify-center gap-4" aria-hidden="true">
        <img :src="portraits[myLook]" alt="" class="hb-portrait w-20 h-24">
        <span class="font-display text-5xl sm:text-6xl leading-none uppercase pb-3">{{ t.headballTitle }}</span>
        <img :src="portraitsBlue[(myLook + 2) % CHARACTERS.length]" alt="" class="hb-portrait w-20 h-24">
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <button type="button" :class="cardClass" @click="mode = 'setup'">
          <span class="font-display text-3xl leading-none uppercase">{{ t.headballSolo }}</span>
          <span class="term-muted text-sm leading-relaxed">{{ t.headballSoloDesc }}</span>
          <span class="mt-auto flex items-center justify-end pt-1">
            <span class="text-sm font-semibold uppercase tracking-widest term-muted group-hover:text-term" aria-hidden="true">&gt; run</span>
          </span>
        </button>

        <button type="button" :class="cardClass" @click="mode = 'online'">
          <span class="font-display text-3xl leading-none uppercase">{{ t.headballOnline }}</span>
          <span class="term-muted text-sm leading-relaxed">{{ t.headballOnlineDesc }}</span>
          <span class="mt-auto flex items-center justify-end pt-1">
            <span class="text-sm font-semibold uppercase tracking-widest term-muted group-hover:text-term" aria-hidden="true">&gt; run</span>
          </span>
        </button>
      </div>

      <p class="term-muted text-center text-xs sm:text-sm leading-relaxed">{{ t.headballControls }}</p>
    </div>
  </TermWindow>

  <!-- Solo: your player, the computer's level and the length -->
  <TermWindow v-else-if="mode === 'setup'" class="max-w-2xl" :title="t.headballTitle" :backLabel="t.back" @back="mode = null">
    <div class="space-y-6">
      <h2 class="font-display text-4xl leading-none uppercase">{{ t.headballSolo }}</h2>

      <div class="space-y-4">
        <div>
          <span class="term-label block mb-2">&gt; {{ t.headballPlayer }}</span>
          <div class="grid grid-cols-6 gap-1.5 sm:gap-2" role="radiogroup" :aria-label="t.headballPlayer">
            <button
              v-for="(char, n) in CHARACTERS"
              :key="char.id"
              type="button"
              role="radio"
              :aria-checked="myLook === n"
              :aria-label="`${t.headballPlayer} ${n + 1}`"
              :class="['hb-pick', { 'is-active': myLook === n }]"
              @click="pickLook(n)"
            >
              <img :src="portraits[n]" alt="" class="hb-portrait w-full">
            </button>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="term-label w-full sm:w-32">&gt; {{ t.headballLevel }}</span>
          <button v-for="level in LEVEL_NAMES" :key="level" type="button" :class="optionClass(setup.level === level)" @click="setup.level = level">{{ levelName(level) }}</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="term-label w-full sm:w-32">&gt; {{ t.headballLength }}</span>
          <button v-for="length in LENGTHS" :key="length" type="button" :class="optionClass(setup.length === length)" @click="setup.length = length">{{ lengthName(length) }}</button>
        </div>
      </div>

      <p class="term-muted text-sm leading-relaxed">&gt; {{ t.headballRulesHint }}</p>

      <button type="button" class="term-btn term-btn-primary w-full min-h-12" @click="kickOffSolo">{{ t.headballKickOff }}</button>
      <p class="term-muted text-center text-xs sm:text-sm leading-relaxed">{{ t.headballControls }}</p>
    </div>
  </TermWindow>

  <!-- Solo match -->
  <HeadBallStage
    v-else-if="mode === 'solo'"
    mode="solo"
    :t="t"
    :title="t.headballTitle"
    :exitLabel="t.headballQuit"
    :round="solo.round"
    :players="soloPlayers"
    myId="me"
    :length="setup.length"
    :level="setup.level"
    :paused="solo.paused"
    @exit="mode = 'setup'"
    @pause="togglePause"
    @end="onSoloEnd"
  >
    <template #actions>
      <button
        type="button"
        class="term-icon-btn shrink-0 h-9 text-xs"
        :aria-label="solo.paused ? t.headballResume : t.headballPause"
        :disabled="!!solo.result"
        @click="onPauseClick"
      >
        {{ solo.paused ? '[>]' : '[||]' }}
      </button>
    </template>

    <template #overlay>
      <div v-if="solo.result" class="absolute inset-0 flex items-center justify-center p-2 bg-black/50">
        <div class="term-window w-full max-w-sm max-h-full overflow-y-auto p-4 text-center" role="dialog" aria-modal="false" :aria-label="t.headballFullTime">
          <p class="font-display text-5xl leading-none tabular-nums">{{ solo.result.score[0] }} : {{ solo.result.score[1] }}</p>
          <p :class="['inline-block mt-2 px-2 py-0.5 text-sm font-bold uppercase tracking-widest', { 'term-inverse': solo.result.winner === 0 }]">{{ soloVerdict }}</p>
          <ul v-if="soloGoals.length" class="mt-3 space-y-0.5 text-left text-sm max-h-24 overflow-y-auto">
            <li v-for="(goal, index) in soloGoals" :key="index" class="flex gap-2">
              <span class="w-10 shrink-0 tabular-nums term-muted">{{ clockText(goal.at) }}</span>
              <span :class="['hb-dot shrink-0', goal.side ? 'blue' : 'red']" aria-hidden="true"></span>
              <span class="truncate">{{ goal.name }}</span>
            </li>
          </ul>
          <div class="grid grid-cols-2 gap-2 mt-4">
            <button type="button" class="term-btn term-btn-primary min-h-11" @click="kickOffSolo">{{ t.playAgain }}</button>
            <button type="button" class="term-btn min-h-11" @click="mode = 'setup'">{{ t.headballChangeSetup }}</button>
          </div>
        </div>
      </div>

      <div v-else-if="solo.paused" class="absolute inset-0 flex items-center justify-center p-2 bg-black/60">
        <div class="term-window w-full max-w-xs p-4 text-center">
          <h2 class="font-display text-4xl leading-none uppercase term-blink">{{ t.headballPaused }}</h2>
          <div class="grid grid-cols-2 gap-2 mt-4">
            <button type="button" class="term-btn term-btn-primary min-h-11" @click="solo.paused = false">{{ t.headballResume }}</button>
            <button type="button" class="term-btn min-h-11" @click="mode = 'setup'">{{ t.headballQuit }}</button>
          </div>
        </div>
      </div>
    </template>
  </HeadBallStage>

  <!-- Online -->
  <OnlineRoom
    v-else
    :room="room"
    :t="t"
    :title="t.headballTitle"
    :canStart="canStart"
    :startHint="t.headballNeedPlayer"
    @go-back="mode = null"
    @start="room.act('start')"
  >
    <!-- Two seats instead of the plain player list -->
    <template #players>
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div v-for="side in SIDES" :key="side" :class="['term-panel p-3 min-w-0 flex flex-col items-center gap-2 text-center', { 'border-term': mySeat === side }]">
            <h2 class="flex items-center gap-2 font-display text-2xl leading-none uppercase">
              <span :class="['hb-dot', side ? 'blue' : 'red']" aria-hidden="true"></span>{{ sideName(side) }}
            </h2>
            <img
              :src="(side ? portraitsBlue : portraits)[seatInfo(side).empty ? (side ? 1 : 0) : seatInfo(side).look]"
              alt=""
              :class="['hb-portrait w-16 h-[4.6rem]', { 'opacity-40': seatInfo(side).empty }]"
            >
            <p :class="['text-sm truncate max-w-full', { 'font-semibold': seatInfo(side).me, 'term-muted': seatInfo(side).empty }]">
              <span v-if="seatInfo(side).empty" class="text-[10px] uppercase tracking-wider">[cpu] </span>{{ seatInfo(side).name }}
              <span v-if="seatInfo(side).host" class="text-[10px] uppercase tracking-wider term-muted"> · {{ t.onlineHostBadge }}</span>
            </p>
            <button v-if="seatInfo(side).empty" type="button" class="term-link text-xs min-h-8" @click="room.act('seat', { side })">[+] {{ t.headballSit }}</button>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span class="term-label">{{ t.headballWatchers }} [{{ watchers.length }}]</span>
          <span v-for="player in watchers" :key="player.id" :class="['flex items-center gap-2', { 'font-semibold': player.id === room.myId }]">
            <span class="term-dot"></span>
            <span class="truncate max-w-[10rem]">{{ player.name }}</span>
          </span>
          <button v-if="mySeat >= 0" type="button" class="term-link text-xs min-h-8" @click="room.act('seat', { side: null })">[~] {{ t.headballJustWatch }}</button>
        </div>
      </div>
    </template>

    <template #lobby="{ view: lobby, isHost }">
      <div class="space-y-4">
        <div>
          <span class="term-label block mb-2">&gt; {{ t.headballPlayer }}</span>
          <div class="grid grid-cols-6 gap-1.5 sm:gap-2" role="radiogroup" :aria-label="t.headballPlayer">
            <button
              v-for="(char, n) in CHARACTERS"
              :key="char.id"
              type="button"
              role="radio"
              :aria-checked="lookFor(room.myId) === n"
              :aria-label="`${t.headballPlayer} ${n + 1}`"
              :class="['hb-pick', { 'is-active': lookFor(room.myId) === n }]"
              @click="pickLook(n)"
            >
              <img :src="(mySeat === 1 ? portraitsBlue : portraits)[n]" alt="" class="hb-portrait w-full">
            </button>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="term-label w-full sm:w-32">&gt; {{ t.headballLength }}</span>
          <button v-for="length in LENGTHS" :key="length" type="button" :disabled="!isHost" :class="optionClass(lobby.length === length)" @click="room.act('settings', { length })">{{ lengthName(length) }}</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="term-label w-full sm:w-32">&gt; {{ t.headballLevel }}</span>
          <button v-for="level in LEVEL_NAMES" :key="level" type="button" :disabled="!isHost" :class="optionClass(lobby.level === level)" @click="room.act('settings', { level })">{{ levelName(level) }}</button>
        </div>
        <div class="space-y-2 text-sm leading-relaxed">
          <p class="term-muted">&gt; {{ t.headballLobbyHint }}</p>
          <p class="term-muted">&gt; {{ t.headballControls }}</p>
        </div>
      </div>
    </template>

    <HeadBallStage
      v-if="inMatch"
      :mode="room.isHost ? 'host' : 'guest'"
      :t="t"
      :title="t.headballTitle"
      :exitLabel="t.onlineLeave"
      :round="view.round"
      :players="lineup"
      :myId="room.myId"
      :length="view.length"
      :level="view.level"
      :online="online"
      :inputs="inputs"
      :snaps="snaps"
      @exit="room.leave()"
      @snapshot="room.sendLive($event)"
      @input="room.sendLive($event)"
      @end="room.act('end', $event)"
    />

    <!-- Full time -->
    <div v-else-if="view.phase === 'results' && result" class="space-y-6">
      <div class="text-center">
        <h2 class="font-display text-5xl leading-none uppercase">{{ t.headballFullTime }}</h2>
        <div class="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div class="flex flex-col items-end gap-1 min-w-0">
            <img :src="portraits[lineup[0]?.look ?? 0]" alt="" class="hb-portrait w-12 h-14">
            <p :class="['text-sm font-semibold truncate max-w-full', { 'term-inverse px-2': result.winner === 0 }]">{{ lineup[0]?.name }}</p>
          </div>
          <p class="font-display text-6xl leading-none tabular-nums">{{ result.score[0] }} : {{ result.score[1] }}</p>
          <div class="flex flex-col items-start gap-1 min-w-0">
            <img :src="portraitsBlue[lineup[1]?.look ?? 0]" alt="" class="hb-portrait w-12 h-14">
            <p :class="['text-sm font-semibold truncate max-w-full', { 'term-inverse px-2': result.winner === 1 }]">{{ lineup[1]?.name }}</p>
          </div>
        </div>
        <p class="term-muted mt-3">&gt; {{ resultText }}</p>
      </div>

      <div>
        <h3 class="term-label mb-2">{{ t.headballGoals }}</h3>
        <ol v-if="resultGoals.length" class="border border-term-low divide-y divide-term-low">
          <li v-for="(goal, index) in resultGoals" :key="index" class="flex items-center gap-3 px-4 py-2 text-sm">
            <span class="w-12 tabular-nums term-muted">{{ clockText(goal.at) }}</span>
            <span :class="['hb-dot', goal.side ? 'blue' : 'red']" aria-hidden="true"></span>
            <span class="flex-1 truncate">{{ goal.name }}</span>
          </li>
        </ol>
        <p v-else class="term-muted text-sm">{{ t.headballNoGoals }}</p>
        <p class="term-muted text-xs uppercase tracking-widest mt-3">{{ t.headballWinsTally }}: {{ t.headballRed }} {{ view.wins[0] }} · {{ t.headballBlue }} {{ view.wins[1] }}</p>
      </div>

      <template v-if="room.isHost">
        <button type="button" class="term-btn term-btn-primary w-full min-h-12" :disabled="!canStart" @click="room.act('start')">{{ t.playAgain }}</button>
        <button type="button" class="term-btn w-full min-h-11" @click="room.act('lobby')">{{ t.onlineBackToLobby }}</button>
      </template>
      <p v-else class="term-muted text-center text-sm"><span class="term-cursor">{{ t.onlineWaitingHost }}</span></p>
    </div>
  </OnlineRoom>
</template>

<style scoped>
.hb-portrait {
  image-rendering: pixelated;
  object-fit: contain;
}
.hb-pick {
  padding: 4px;
  border: 1px solid var(--color-term-low);
  background: #000;
  aspect-ratio: 40 / 46;
  min-height: 44px;
}
.hb-pick.is-active {
  border-color: var(--color-term);
  background: rgb(0 255 0 / 0.12);
  box-shadow: 0 0 0 1px var(--color-term);
}
.hb-dot {
  display: inline-block;
  width: 0.65rem;
  height: 0.65rem;
}
.hb-dot.red {
  background: #e8402a;
}
.hb-dot.blue {
  background: #2f6ee8;
}
</style>
