<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, markRaw } from 'vue'
import confetti from 'canvas-confetti'
import TermWindow from '../components/TermWindow.vue'
import OnlineRoom from '../online/OnlineRoom.vue'
import { useOnlineRoom } from '../online/useOnlineRoom'
import FutsalStage from './futsal/FutsalStage.vue'
import { MAX_TEAM, MINUTES, GOAL_LIMITS } from './futsal/engine'
import { LEVELS } from './futsal/bots'

const props = defineProps({
  t: { type: Object, required: true },
  // Room code from a shared invite link
  initialCode: { type: String, default: '' },
  // Open a room straight away: a chat invite is waiting for its code
  hostRoom: { type: Boolean, default: false }
})

const emit = defineEmits(['go-back'])

const SETUP_KEY = 'futsalSolo'
const LEVEL_NAMES = Object.keys(LEVELS)
const TEAMS = [0, 1]
const SHAPE = ['(#)', '( )']

const LETTERS = {
  F: [' ___ ', '| __|', '| _| ', '|_|  '],
  U: [' _   _ ', '| | | |', '| |_| |', ' \\___/ '],
  T: [' _____ ', '|_   _|', '  | |  ', '  |_|  '],
  S: [' ___ ', '/ __|', '\\__ \\', '|___/'],
  A: ['   _   ', '  /_\\  ', ' / _ \\ ', '/_/ \\_\\'],
  L: [' _    ', '| |   ', '| |__ ', '|____|']
}
const TITLE_ART = [0, 1, 2, 3].map(row => [...'FUTSAL'].map(letter => LETTERS[letter][row]).join(' ')).join('\n')
const SOLO_ART = [' .-.            .-.', '(#*#)   o      ( 2 )', " '-'            '-'"].join('\n')
const ONLINE_ART = [' .-. .-.      .-. .-.', '(#A#)(#B#)  o ( C )( D )', " '-' '-'      '-' '-'"].join('\n')
const TROPHY_ART = [' .---.', '(|   |)', " '-.-'", '  _|_'].join('\n')

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const shuffle = (list) => {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
// The letter on a player's shirt: the first letter or digit of their name
const markOf = (name) => (String(name).match(/[\p{L}\p{N}]/u)?.[0] || '?').toLocaleUpperCase()
const clockText = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

const teamName = (team) => [props.t.futsalHome, props.t.futsalAway][team]
const levelName = (level) => props.t[`futsal${level[0].toUpperCase()}${level.slice(1)}`]
const goalsName = (n) => (n ? String(n) : props.t.futsalNoLimit)

// null while choosing, then setup (solo options), solo or online; an invite goes straight online
const mode = ref(props.initialCode || props.hostRoom ? 'online' : null)

// ---------- Solo ----------

const loadSetup = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(SETUP_KEY) || '{}')
    return {
      size: saved.size >= 1 && saved.size <= MAX_TEAM ? saved.size : 3,
      level: LEVEL_NAMES.includes(saved.level) ? saved.level : 'normal',
      minutes: MINUTES.includes(saved.minutes) ? saved.minutes : 3
    }
  } catch {
    return { size: 3, level: 'normal', minutes: 3 }
  }
}

const setup = reactive(loadSetup())
const solo = reactive({ round: 0, kickoff: 0, paused: false, result: null })

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

// You up front for home with bot teammates, against a team of bots
const soloRoster = computed(() => {
  const roster = [{ id: 'me', team: 0, name: props.t.futsalYou, mark: markOf(savedName() || props.t.futsalYou), bot: 0 }]
  let n = 0
  for (const team of TEAMS) {
    for (let i = team === 0 ? 1 : 0; i < setup.size; i++) {
      n++
      roster.push({ id: `bot${n}`, team, name: fmt(props.t.futsalBot, { n }), mark: String(n % 10), bot: n })
    }
  }
  return roster
})

function kickOffSolo () {
  Object.assign(solo, { round: solo.round + 1, kickoff: Math.random() < 0.5 ? 0 : 1, paused: false, result: null })
  mode.value = 'solo'
}

function onSoloEnd (result) {
  solo.result = result
  if (result.winner === 0) confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ['#00ff00', '#00b300', '#007a00'], shapes: ['square'] })
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

// Who scored, for the score card: [{ team, name, own, at }]
const goalList = (goals, roster) => goals.map(goal => ({
  ...goal,
  name: roster.find(entry => entry.id === goal.id)?.name || '?'
}))

const soloGoals = computed(() => (solo.result ? goalList(solo.result.goals.map(g => ({ ...g, id: soloRoster.value[g.by]?.id })), soloRoster.value) : []))
const soloVerdict = computed(() => {
  if (!solo.result) return ''
  const { winner } = solo.result
  return winner === null ? props.t.futsalDraw : winner === 0 ? props.t.futsalYouWin : props.t.futsalYouLose
})

// ---------- Online: host-side rules ----------
//
// The host's device runs the match itself (see FutsalStage) and sends everyone snapshots of it
// as its live data. Everyone else sends their controls as theirs, which the host takes in as
// they arrive. The room state only holds the teams, the settings and the results.

const inputs = markRaw(new Map()) // host: player id -> the latest controls they sent, and when
const snaps = markRaw([]) // guest: snapshots from the host, for the stage to pick up

const onTeam = (s, team) => s.players.filter(p => p.online && s.teams[p.id] === team).length + s.bots.filter(b => b.team === team).length
const openTeam = (s) => {
  const [home, away] = TEAMS.map(team => onTeam(s, team))
  if (Math.min(home, away) >= MAX_TEAM) return null
  return home <= away ? 0 : 1
}

// The line-up for a match: each team's people, then its bots
function lineUp (s) {
  const roster = []
  for (const team of TEAMS) {
    for (const p of s.players) {
      if (p.online && s.teams[p.id] === team) roster.push({ id: p.id, team, name: p.name, bot: 0 })
    }
    for (const b of s.bots) if (b.team === team) roster.push({ id: b.id, team, name: '', bot: b.n })
  }
  return roster
}

function onAction (s, playerId, action) {
  const isHost = playerId === s.hostId
  const between = s.phase === 'lobby' || s.phase === 'results'
  switch (action.type) {
    case 'team': {
      if (!between) return
      const team = TEAMS.includes(action.team) ? action.team : null
      if (team !== null && s.teams[playerId] !== team && onTeam(s, team) >= MAX_TEAM) return
      s.teams[playerId] = team
      break
    }
    case 'addBot':
      if (!isHost || !between || !TEAMS.includes(action.team) || onTeam(s, action.team) >= MAX_TEAM) return
      s.botSeq++
      s.bots.push({ id: `bot${s.botSeq}`, team: action.team, n: s.botSeq })
      break
    case 'removeBot':
      if (!isHost || !between) return
      s.bots = s.bots.filter(b => b.id !== action.id)
      break
    case 'shuffle': {
      if (!isHost || !between) return
      const people = s.players.filter(p => p.online && s.teams[p.id] != null)
      shuffle([...people, ...s.bots]).forEach((member, i) => {
        if ('n' in member) member.team = i % 2
        else s.teams[member.id] = i % 2
      })
      break
    }
    case 'settings':
      if (!isHost || !between) return
      if (MINUTES.includes(action.minutes)) s.minutes = action.minutes
      if (GOAL_LIMITS.includes(action.goals)) s.goalLimit = action.goals
      if (LEVEL_NAMES.includes(action.level)) s.level = action.level
      break
    case 'start': {
      if (!isHost || !between) return
      s.players = s.players.filter(p => p.online)
      if (!TEAMS.every(team => onTeam(s, team) > 0)) return
      s.round++
      s.roster = lineUp(s)
      s.kickoff = Math.random() < 0.5 ? 0 : 1
      s.result = null
      s.phase = 'match'
      break
    }
    case 'end': {
      if (!isHost || s.phase !== 'match' || !Array.isArray(action.score) || !Array.isArray(action.goals)) return
      const winner = TEAMS.includes(action.winner) ? action.winner : null
      s.result = {
        score: action.score,
        winner,
        goals: action.goals.map(g => ({ team: g.team, id: s.roster[g.by]?.id || null, own: !!g.own, at: g.at }))
      }
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
  game: 'futsal',
  initialCode: props.initialCode,
  hostRoom: props.hostRoom,
  liveMs: 50,
  initialState: () => ({
    teams: {}, bots: [], botSeq: 0, minutes: 3, goalLimit: 0, level: 'normal',
    round: 0, roster: [], kickoff: 0, result: null, wins: [0, 0]
  }),
  onAction,
  // Newcomers take the team with room for them; during a match they watch
  onJoin: (s, player) => {
    if (s.teams[player.id] === undefined) s.teams[player.id] = s.phase === 'lobby' ? openTeam(s) : null
  },
  onLeave: (s, player) => {
    if (s.phase === 'lobby') delete s.teams[player.id]
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
const myTeam = computed(() => view.value?.teams?.[room.myId] ?? null)
const online = computed(() => Object.fromEntries((view.value?.players || []).map(p => [p.id, p.online])))

// Each device names the bots in its own language
const nameEntry = (entry) => {
  const name = entry.bot ? fmt(props.t.futsalBot, { n: entry.bot }) : entry.name
  return { ...entry, name, mark: entry.bot ? String(entry.bot % 10) : markOf(name) }
}
const roster = computed(() => (view.value?.roster || []).map(nameEntry))

const membersOf = (team) => {
  const s = view.value
  if (!s) return []
  return [
    ...s.players.filter(p => s.teams[p.id] === team).map(p => ({ id: p.id, name: p.name, online: p.online, bot: 0 })),
    ...s.bots.filter(b => b.team === team).map(b => ({ id: b.id, name: fmt(props.t.futsalBot, { n: b.n }), online: true, bot: b.n }))
  ]
}
const watchers = computed(() => (view.value?.players || []).filter(p => view.value.teams[p.id] == null))
const teamCount = (team) => membersOf(team).filter(m => m.online).length
const bothTeamsReady = computed(() => TEAMS.every(team => teamCount(team) > 0))

const result = computed(() => view.value?.result || null)
const resultGoals = computed(() => (result.value ? goalList(result.value.goals, roster.value) : []))
const resultText = computed(() => {
  if (!result.value) return ''
  const { winner } = result.value
  return winner === null ? props.t.futsalDraw : fmt(props.t.futsalTeamWins, { team: teamName(winner) })
})

watch(() => (view.value?.phase === 'results' ? view.value.round : 0), (round) => {
  if (round && result.value?.winner !== null && result.value?.winner === view.value.roster.find(e => e.id === room.myId)?.team) {
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ['#00ff00', '#00b300', '#007a00'], shapes: ['square'] })
  }
})

// A new match never sees the last one's snapshots or controls
watch(() => view.value?.round, () => {
  snaps.length = 0
  inputs.clear()
})

const cardClass = 'term-card group flex flex-col gap-3 p-5 text-left'
const optionClass = (active) => ['term-option min-h-8 px-3 text-sm font-semibold', { 'is-active': active }]
</script>

<template>
  <!-- Choose solo or online -->
  <TermWindow v-if="mode === null" class="max-w-2xl" :title="t.futsalTitle" :backLabel="t.back" @back="emit('go-back')">
    <div class="space-y-6">
      <div class="overflow-hidden text-center" aria-hidden="true">
        <span class="inline-block whitespace-pre text-left text-[0.55rem] min-[400px]:text-xs sm:text-sm leading-tight">{{ TITLE_ART }}</span>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <button type="button" :class="cardClass" @click="mode = 'setup'">
          <span class="whitespace-pre text-xs sm:text-sm leading-tight" aria-hidden="true">{{ SOLO_ART }}</span>
          <span class="font-display text-3xl leading-none uppercase">{{ t.futsalSolo }}</span>
          <span class="term-muted text-sm leading-relaxed">{{ t.futsalSoloDesc }}</span>
          <span class="mt-auto flex items-center justify-end pt-1">
            <span class="text-sm font-semibold uppercase tracking-widest term-muted group-hover:text-term" aria-hidden="true">&gt; run</span>
          </span>
        </button>

        <button type="button" :class="cardClass" @click="mode = 'online'">
          <span class="whitespace-pre text-xs sm:text-sm leading-tight" aria-hidden="true">{{ ONLINE_ART }}</span>
          <span class="font-display text-3xl leading-none uppercase">{{ t.futsalOnline }}</span>
          <span class="term-muted text-sm leading-relaxed">{{ t.futsalOnlineDesc }}</span>
          <span class="mt-auto flex items-center justify-end pt-1">
            <span class="text-sm font-semibold uppercase tracking-widest term-muted group-hover:text-term" aria-hidden="true">&gt; run</span>
          </span>
        </button>
      </div>

      <p class="term-muted text-center text-xs sm:text-sm leading-relaxed">{{ t.futsalControls }}</p>
    </div>
  </TermWindow>

  <!-- Solo: team size, bots and length -->
  <TermWindow v-else-if="mode === 'setup'" class="max-w-2xl" :title="t.futsalTitle" :backLabel="t.back" @back="mode = null">
    <div class="space-y-6">
      <h2 class="font-display text-4xl leading-none uppercase">{{ t.futsalSolo }}</h2>

      <div class="space-y-4">
        <div class="flex flex-wrap items-center gap-2">
          <span class="term-label w-full sm:w-40">&gt; {{ t.futsalTeamSize }}</span>
          <button v-for="size in MAX_TEAM" :key="size" type="button" :class="optionClass(setup.size === size)" @click="setup.size = size">{{ size }} v {{ size }}</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="term-label w-full sm:w-40">&gt; {{ t.futsalLevel }}</span>
          <button v-for="level in LEVEL_NAMES" :key="level" type="button" :class="optionClass(setup.level === level)" @click="setup.level = level">{{ levelName(level) }}</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="term-label w-full sm:w-40">&gt; {{ t.futsalLength }}</span>
          <button v-for="minutes in MINUTES" :key="minutes" type="button" :class="optionClass(setup.minutes === minutes)" @click="setup.minutes = minutes">{{ fmt(t.futsalMinutes, { n: minutes }) }}</button>
        </div>
      </div>

      <p class="term-muted text-sm leading-relaxed">&gt; {{ setup.size > 1 ? fmt(t.futsalSoloTeamHint, { n: setup.size - 1 }) : t.futsalSoloAloneHint }} {{ t.futsalRulesHint }}</p>

      <button type="button" class="term-btn term-btn-primary w-full min-h-12" @click="kickOffSolo">{{ t.futsalKickOffButton }}</button>
      <p class="term-muted text-center text-xs sm:text-sm leading-relaxed">{{ t.futsalControls }}</p>
    </div>
  </TermWindow>

  <!-- Solo match -->
  <FutsalStage
    v-else-if="mode === 'solo'"
    mode="solo"
    :t="t"
    :title="t.futsalTitle"
    :exitLabel="t.futsalQuit"
    :round="solo.round"
    :roster="soloRoster"
    myId="me"
    :minutes="setup.minutes"
    :level="setup.level"
    :kickoff="solo.kickoff"
    :paused="solo.paused"
    @exit="mode = 'setup'"
    @pause="togglePause"
    @end="onSoloEnd"
  >
    <template #actions>
      <button
        type="button"
        class="term-icon-btn shrink-0 h-9 text-xs"
        :aria-label="solo.paused ? t.futsalResume : t.futsalPause"
        :disabled="!!solo.result"
        @click="onPauseClick"
      >
        {{ solo.paused ? '[>]' : '[||]' }}
      </button>
    </template>

    <template #overlay>
      <div v-if="solo.result" class="absolute inset-0 flex items-center justify-center p-3 bg-black/50">
        <div class="term-window w-full max-w-sm max-h-full overflow-y-auto p-5 text-center" role="dialog" aria-modal="false" :aria-label="t.futsalFullTime">
          <h2 class="font-display text-5xl leading-none uppercase">{{ t.futsalFullTime }}</h2>
          <p class="mt-3 font-display text-5xl leading-none tabular-nums">{{ solo.result.score[0] }} : {{ solo.result.score[1] }}</p>
          <p class="term-muted text-xs uppercase tracking-widest mt-1">{{ SHAPE[0] }} {{ t.futsalHome }} · {{ t.futsalAway }} {{ SHAPE[1] }}</p>
          <p :class="['inline-block mt-3 px-2 py-0.5 text-sm font-bold uppercase tracking-widest', { 'term-inverse': solo.result.winner === 0 }]">{{ soloVerdict }}</p>

          <ul v-if="soloGoals.length" class="mt-4 space-y-1 text-left text-sm">
            <li v-for="(goal, index) in soloGoals" :key="index" class="flex gap-2">
              <span class="w-10 shrink-0 tabular-nums term-muted">{{ clockText(goal.at) }}</span>
              <span class="shrink-0" aria-hidden="true">{{ SHAPE[goal.team] }}</span>
              <span class="truncate">{{ goal.name }}<span v-if="goal.own" class="term-muted"> ({{ t.futsalOwnGoalShort }})</span></span>
            </li>
          </ul>
          <p v-else class="term-muted text-sm mt-4">{{ t.futsalNoGoals }}</p>

          <button type="button" class="term-btn term-btn-primary w-full mt-5" @click="kickOffSolo">{{ t.playAgain }}</button>
          <button type="button" class="term-btn w-full mt-2" @click="mode = 'setup'">{{ t.futsalChangeSetup }}</button>
        </div>
      </div>

      <div v-else-if="solo.paused" class="absolute inset-0 flex items-center justify-center p-3 bg-black/60">
        <div class="term-window w-full max-w-xs p-5 text-center">
          <h2 class="font-display text-5xl leading-none uppercase term-blink">{{ t.futsalPaused }}</h2>
          <button type="button" class="term-btn term-btn-primary w-full mt-5" @click="solo.paused = false">{{ t.futsalResume }}</button>
          <button type="button" class="term-btn w-full mt-2" @click="mode = 'setup'">{{ t.futsalQuit }}</button>
          <p class="term-muted text-xs mt-3">{{ t.futsalPausedHint }}</p>
        </div>
      </div>
    </template>
  </FutsalStage>

  <!-- Online match -->
  <OnlineRoom
    v-else
    :room="room"
    :t="t"
    :title="t.futsalTitle"
    :canStart="bothTeamsReady"
    :startHint="t.futsalNeedTeams"
    @go-back="mode = null"
    @start="room.act('start')"
  >
    <!-- Teams instead of the plain player list -->
    <template #players>
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div v-for="team in TEAMS" :key="team" :class="['term-panel p-3 space-y-2 min-w-0', { 'border-term': myTeam === team }]">
            <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <h2 class="font-display text-2xl leading-none uppercase whitespace-nowrap">
                <span class="mr-2" aria-hidden="true">{{ SHAPE[team] }}</span>{{ teamName(team) }}
                <span class="text-base term-muted tabular-nums">{{ teamCount(team) }}/{{ MAX_TEAM }}</span>
              </h2>
              <button
                v-if="myTeam !== team && teamCount(team) < MAX_TEAM"
                type="button"
                class="term-link text-xs"
                @click="room.act('team', { team })"
              >
                [+] {{ t.futsalJoin }}
              </button>
            </div>
            <ul class="space-y-1.5">
              <li
                v-for="member in membersOf(team)"
                :key="member.id"
                :class="['flex items-center gap-2 text-sm min-w-0', { 'font-semibold': member.id === room.myId, 'opacity-40': !member.online }]"
              >
                <span v-if="member.bot" class="shrink-0 text-[10px] uppercase tracking-wider term-muted">[bot]</span>
                <span v-else :class="['term-dot', { 'is-off': !member.online }]"></span>
                <span class="truncate">{{ member.name }}</span>
                <span v-if="member.id === view.hostId" class="ml-auto shrink-0 text-[10px] uppercase tracking-wider term-muted">{{ t.onlineHostBadge }}</span>
                <button
                  v-if="member.bot && room.isHost"
                  type="button"
                  class="ml-auto shrink-0 term-link text-xs"
                  :aria-label="fmt(t.futsalRemoveBot, { name: member.name })"
                  @click="room.act('removeBot', { id: member.id })"
                >
                  [x]
                </button>
              </li>
            </ul>
            <button
              v-if="room.isHost && teamCount(team) < MAX_TEAM"
              type="button"
              class="term-link text-xs"
              @click="room.act('addBot', { team })"
            >
              [+] {{ t.futsalAddBot }}
            </button>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span class="term-label">{{ t.futsalWatchers }} [{{ watchers.length }}]</span>
          <span v-for="player in watchers" :key="player.id" :class="['flex items-center gap-2', { 'font-semibold': player.id === room.myId }]">
            <span :class="['term-dot', { 'is-off': !player.online }]"></span>
            <span class="truncate max-w-[10rem]">{{ player.name }}</span>
          </span>
          <button v-if="myTeam !== null" type="button" class="term-link text-xs" @click="room.act('team', { team: null })">[~] {{ t.futsalJustWatch }}</button>
          <button v-if="room.isHost" type="button" class="term-link text-xs ml-auto" @click="room.act('shuffle')">
            <span aria-hidden="true">[~]</span>
            <span>{{ t.futsalShuffle }}</span>
          </button>
        </div>
      </div>
    </template>

    <template #lobby="{ view: lobby, isHost }">
      <div class="space-y-4">
        <div class="space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="term-label w-full sm:w-36">&gt; {{ t.futsalLength }}</span>
            <button v-for="minutes in MINUTES" :key="minutes" type="button" :disabled="!isHost" :class="optionClass(lobby.minutes === minutes)" @click="room.act('settings', { minutes })">{{ fmt(t.futsalMinutes, { n: minutes }) }}</button>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="term-label w-full sm:w-36">&gt; {{ t.futsalGoalsToWin }}</span>
            <button v-for="goals in GOAL_LIMITS" :key="goals" type="button" :disabled="!isHost" :class="optionClass(lobby.goalLimit === goals)" @click="room.act('settings', { goals })">{{ goalsName(goals) }}</button>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="term-label w-full sm:w-36">&gt; {{ t.futsalLevel }}</span>
            <button v-for="level in LEVEL_NAMES" :key="level" type="button" :disabled="!isHost" :class="optionClass(lobby.level === level)" @click="room.act('settings', { level })">{{ levelName(level) }}</button>
          </div>
        </div>
        <div class="space-y-2 text-sm leading-relaxed">
          <p class="term-muted">&gt; {{ t.futsalLobbyHint }}</p>
          <p class="term-muted">&gt; {{ t.futsalControls }}</p>
        </div>
      </div>
    </template>

    <FutsalStage
      v-if="inMatch"
      :mode="room.isHost ? 'host' : 'guest'"
      :t="t"
      :title="t.futsalTitle"
      :exitLabel="t.onlineLeave"
      :round="view.round"
      :roster="roster"
      :myId="room.myId"
      :minutes="view.minutes"
      :goals="view.goalLimit"
      :level="view.level"
      :kickoff="view.kickoff"
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
        <span class="inline-block whitespace-pre text-left text-sm leading-tight mb-3" aria-hidden="true">{{ TROPHY_ART }}</span>
        <h2 class="font-display text-5xl leading-none uppercase">{{ t.futsalFullTime }}</h2>
        <div class="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <p :class="['text-right text-sm font-semibold uppercase tracking-wider', { 'term-inverse px-2 py-1 justify-self-end': result.winner === 0 }]">{{ SHAPE[0] }} {{ t.futsalHome }}</p>
          <p class="font-display text-6xl leading-none tabular-nums">{{ result.score[0] }} : {{ result.score[1] }}</p>
          <p :class="['text-left text-sm font-semibold uppercase tracking-wider', { 'term-inverse px-2 py-1 justify-self-start': result.winner === 1 }]">{{ t.futsalAway }} {{ SHAPE[1] }}</p>
        </div>
        <p class="term-muted mt-3">&gt; {{ resultText }}</p>
      </div>

      <div>
        <h3 class="term-label mb-2">{{ t.futsalGoals }}</h3>
        <ol v-if="resultGoals.length" class="border border-term-low divide-y divide-term-low">
          <li v-for="(goal, index) in resultGoals" :key="index" class="flex items-center gap-3 px-4 py-2 text-sm">
            <span class="w-12 tabular-nums term-muted">{{ clockText(goal.at) }}</span>
            <span aria-hidden="true">{{ SHAPE[goal.team] }}</span>
            <span :class="['flex-1 truncate', { 'font-semibold': goal.id === room.myId }]">{{ goal.name }}<span v-if="goal.own" class="term-muted"> ({{ t.futsalOwnGoalShort }})</span></span>
          </li>
        </ol>
        <p v-else class="term-muted text-sm">{{ t.futsalNoGoals }}</p>
        <p class="term-muted text-xs uppercase tracking-widest mt-3">{{ t.futsalWins }}: {{ t.futsalHome }} {{ view.wins[0] }} · {{ t.futsalAway }} {{ view.wins[1] }}</p>
      </div>

      <!-- Someone who only watched can get on a team for the next match -->
      <div v-if="myTeam === null" class="term-panel p-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span class="term-muted">&gt; {{ t.futsalPickTeam }}</span>
        <template v-for="team in TEAMS" :key="team">
          <button v-if="teamCount(team) < MAX_TEAM" type="button" class="term-link" @click="room.act('team', { team })">
            [+] {{ SHAPE[team] }} {{ teamName(team) }}
          </button>
        </template>
      </div>

      <template v-if="room.isHost">
        <button type="button" class="term-btn term-btn-primary w-full min-h-12" :disabled="!bothTeamsReady" @click="room.act('start')">{{ t.playAgain }}</button>
        <button type="button" class="term-btn w-full" @click="room.act('lobby')">{{ t.onlineBackToLobby }}</button>
      </template>
      <p v-else class="term-muted text-center text-sm"><span class="term-cursor">{{ t.onlineWaitingHost }}</span></p>
    </div>
  </OnlineRoom>
</template>
