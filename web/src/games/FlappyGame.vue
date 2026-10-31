<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, markRaw } from 'vue'
import confetti from 'canvas-confetti'
import TermWindow from '../components/TermWindow.vue'
import OnlineRoom from '../online/OnlineRoom.vue'
import { useOnlineRoom } from '../online/useOnlineRoom'
import FlappyStage from './flappy/FlappyStage.vue'
import { LEVEL_NAMES } from './flappy/engine'

const props = defineProps({
  t: { type: Object, required: true },
  // Room code from a shared invite link
  initialCode: { type: String, default: '' },
  // Open a room straight away: a chat invite is waiting for its code
  hostRoom: { type: Boolean, default: false }
})

const emit = defineEmits(['go-back'])

// Normal keeps the key from before there were levels, so nobody loses their best score
const bestKey = (level) => (level === 'normal' ? 'flappyBest' : `flappyBest-${level}`)
const LEVEL_KEY = 'flappyLevel'
const COUNTDOWN_MS = 3000
const LIVE_TIMEOUT_MS = 5000 // a flying player silent this long is counted out
const OVER_DELAY_MS = 450 // the score card waits for the bird to hit the ground

// Medals at the same scores as the original game
const MEDALS = [
  { min: 40, key: 'flappyMedalPlatinum', mark: '#' },
  { min: 30, key: 'flappyMedalGold', mark: '*' },
  { min: 20, key: 'flappyMedalSilver', mark: '+' },
  { min: 10, key: 'flappyMedalBronze', mark: 'o' }
]

const LETTERS = {
  F: [' ___ ', '| __|', '| _| ', '|_|  '],
  L: [' _    ', '| |   ', '| |__ ', '|____|'],
  A: ['   _   ', '  /_\\  ', ' / _ \\ ', '/_/ \\_\\'],
  P: [' ___ ', '| _ \\', '|  _/', '|_|  '],
  Y: ['__   __', '\\ \\ / /', ' \\ V / ', '  |_|  ']
}
const TITLE_ART = [0, 1, 2, 3].map(row => [...'FLAPPY'].map(letter => LETTERS[letter][row]).join(' ')).join('\n')
const SOLO_ART = [' .--.', '( ^ @)>  ~', " `--'"].join('\n')
const ONLINE_ART = [' .--.    .--.', '( ^ @)> ( v @)>', " `--'    `--'"].join('\n')
const WINNER_ART = ['  /\\/\\', '  .--.', ' ( ^ @)>', "  `--'"].join('\n')
const NO_MEDAL_ART = [' .--.', '( - x)>', " `--'"].join('\n')
const LEVEL_KEYS = { easy: 'flappyEasy', normal: 'flappyNormal', hard: 'flappyHard', insane: 'flappyInsane' }
const LEVEL_DESC_KEYS = { easy: 'flappyEasyDesc', normal: 'flappyNormalDesc', hard: 'flappyHardDesc', insane: 'flappyInsaneDesc' }
const LEVEL_MARKS = { easy: '[*   ]', normal: '[**  ]', hard: '[*** ]', insane: '[****]' }
const medalArt = (mark) => [' \\ /', ".-'-.", `| ${mark} |`, "'---'"].join('\n')

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const levelName = (level) => props.t[LEVEL_KEYS[level]] || level
const randomSeed = () => Math.floor(Math.random() * 2 ** 31)

// null while choosing, then solo or online; an invite link or a chat invite goes straight online
const mode = ref(props.initialCode || props.hostRoom ? 'online' : null)

// ---------- Solo ----------

function read (key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write (key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // It just isn't kept
  }
}

const savedLevel = read(LEVEL_KEY)
const level = ref(LEVEL_NAMES.includes(savedLevel) ? savedLevel : 'normal')
const bests = reactive(Object.fromEntries(LEVEL_NAMES.map(name => [name, Number(read(bestKey(name))) || 0])))
const best = computed(() => bests[level.value])
const solo = reactive({ runId: 1, seed: randomSeed(), phase: 'ready', score: 0, paused: false, over: false, newBest: false })
let overTimer = null

const medal = computed(() => MEDALS.find(m => solo.score >= m.min) || null)

function chooseLevel (name) {
  level.value = name
  write(LEVEL_KEY, name)
}

function onSoloState ({ phase, score }) {
  solo.phase = phase
  solo.score = score
  if (phase !== 'over' || solo.over || overTimer) return
  solo.newBest = score > best.value
  if (solo.newBest) {
    bests[level.value] = score
    write(bestKey(level.value), String(score))
  }
  overTimer = setTimeout(() => {
    overTimer = null
    solo.over = true
  }, OVER_DELAY_MS)
}

function retry () {
  clearTimeout(overTimer)
  overTimer = null
  Object.assign(solo, { runId: solo.runId + 1, seed: randomSeed(), phase: 'ready', score: 0, paused: false, over: false, newBest: false })
}

function startSolo () {
  retry()
  mode.value = 'solo'
}

function quitSolo () {
  clearTimeout(overTimer)
  overTimer = null
  mode.value = null
}

// Space or a tap resumes a paused game and retries once the score card is up
function onSoloTap () {
  if (solo.paused) solo.paused = false
  else if (solo.over) retry()
}

function togglePause () {
  if (solo.paused || solo.phase === 'play') solo.paused = !solo.paused
}

function onPauseClick (event) {
  togglePause()
  if (event.detail) event.currentTarget.blur()
}

function onVisibility () {
  if (document.hidden && mode.value === 'solo' && solo.phase === 'play') solo.paused = true
}

onMounted(() => document.addEventListener('visibilitychange', onVisibility))
onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  clearTimeout(overTimer)
})

// ---------- Online: host-side rules ----------
//
// Everyone flies the same seeded course on their own device and reports only a crash. Bird
// positions travel as live data (room.sendLive), which the host also uses to spot players
// who went silent mid-flight.

const live = markRaw({ samples: {}, at: 0 }) // everyone's latest live sample
const freshness = {} // host: id -> { q, at }, when each player's sample last changed
let roundStart = 0 // host clock

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

function lastSample (s, id) {
  const sample = live.samples[id]
  return sample?.r === s.round ? sample : null
}

function finishIfDone (s) {
  const entries = Object.entries(s.runners)
  if (!entries.length || entries.some(([, runner]) => runner.alive)) return
  s.standings = entries
    .map(([id, runner]) => ({ id, score: runner.score, dist: runner.dist }))
    .sort((a, b) => b.score - a.score || b.dist - a.dist)
  if (entries.length > 1) {
    const winner = s.standings[0].id
    s.wins[winner] = (s.wins[winner] || 0) + 1
  }
  s.phase = 'results'
  s.deadline = null
}

function crashRunner (s, id, score, dist) {
  const runner = s.runners[id]
  if (!runner?.alive) return
  runner.alive = false
  runner.score = Math.max(0, Math.floor(Number(score)) || 0)
  runner.dist = Math.max(0, Number(dist) || 0)
  finishIfDone(s)
}

function onAction (s, playerId, action) {
  const isHost = playerId === s.hostId
  switch (action.type) {
    case 'level':
      if (isHost && s.phase === 'lobby' && LEVEL_NAMES.includes(action.level)) s.level = action.level
      break
    case 'start':
      if (!isHost || (s.phase !== 'lobby' && s.phase !== 'results')) return
      s.players = s.players.filter(p => p.online)
      s.round++
      s.seed = randomSeed()
      s.runners = Object.fromEntries(s.players.map(p => [p.id, { alive: true, score: 0, dist: 0 }]))
      s.standings = []
      s.deadline = Date.now() + COUNTDOWN_MS
      s.phase = 'countdown'
      roundStart = s.deadline
      break
    case 'crash':
      if (s.phase === 'countdown' || s.phase === 'playing') crashRunner(s, playerId, action.score, action.dist)
      break
    case 'lobby':
      if (!isHost || s.phase !== 'results') return
      s.players = s.players.filter(p => p.online)
      s.phase = 'lobby'
      break
  }
}

function countOut (s, id) {
  const sample = lastSample(s, id)
  crashRunner(s, id, sample?.s, sample?.d)
}

const room = useOnlineRoom({
  game: 'flappy',
  initialCode: props.initialCode,
  hostRoom: props.hostRoom,
  initialState: () => ({ level: level.value, round: 0, seed: 0, deadline: null, runners: {}, standings: [], wins: {} }),
  onAction,
  onLive,
  onLeave: (s, player) => {
    if (s.phase === 'countdown' || s.phase === 'playing') countOut(s, player.id)
  },
  onTick: (s, now) => {
    if (s.phase === 'countdown' && now >= s.deadline) {
      s.phase = 'playing'
      s.deadline = null
    }
    if (s.phase !== 'playing') return
    for (const [id, runner] of Object.entries(s.runners)) {
      if (runner.alive && now - Math.max(freshness[id]?.at || 0, roundStart) > LIVE_TIMEOUT_MS) countOut(s, id)
    }
  }
})

// ---------- Online: view ----------

const view = computed(() => room.view)
const flying = computed(() => view.value?.phase === 'countdown' || view.value?.phase === 'playing')
const names = computed(() => Object.fromEntries((view.value?.players || []).map(p => [p.id, p.name])))
const knockedOut = computed(() => view.value?.runners?.[room.myId]?.alive === false)

// Take-off time on this device's clock, from the countdown. Only a page that saw the countdown
// flies in that round: one reloaded mid-round watches, and the host counts the old flight out
// when its live data stops.
const startAt = ref(0)
const countedDown = ref(0) // round
watch(() => [view.value?.phase, view.value?.round, view.value?.deadline], ([phase, round, deadline]) => {
  if (phase === 'countdown' && deadline) {
    startAt.value = deadline
    countedDown.value = round
  }
}, { immediate: true })
const amRunner = computed(() => !!view.value?.runners?.[room.myId] && countedDown.value === view.value.round)

const standings = computed(() => (view.value?.standings || []).map((entry, index) => ({
  ...entry,
  rank: index + 1,
  name: names.value[entry.id] || '?',
  wins: view.value.wins?.[entry.id] || 0
})))
const winner = computed(() => (standings.value.length > 1 ? standings.value[0] : null))

watch(() => (view.value?.phase === 'results' ? view.value.round : 0), (round) => {
  if (round && winner.value?.id === room.myId) {
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ['#00ff00', '#00b300', '#007a00'], shapes: ['square'] })
  }
})

const cardClass = 'term-card group flex flex-col gap-3 p-5 text-left'
</script>

<template>
  <!-- Choose solo or online -->
  <TermWindow v-if="mode === null" class="max-w-2xl" :title="t.flappyTitle" :backLabel="t.back" @back="emit('go-back')">
    <div class="space-y-6">
      <div class="overflow-hidden text-center" aria-hidden="true">
        <span class="inline-block whitespace-pre text-left text-[0.6rem] min-[400px]:text-xs sm:text-sm leading-tight">{{ TITLE_ART }}</span>
      </div>

      <section>
        <h2 class="term-label mb-3">{{ t.flappyChooseLevel }}</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" :aria-label="t.flappyLevel">
          <button
            v-for="name in LEVEL_NAMES"
            :key="name"
            type="button"
            role="radio"
            :aria-checked="level === name"
            :class="['term-option flex flex-col items-start gap-1 px-3 py-2 text-left', { 'is-active': level === name }]"
            @click="chooseLevel(name)"
          >
            <span class="text-xs tracking-widest" aria-hidden="true">{{ LEVEL_MARKS[name] }}</span>
            <span class="font-display text-2xl leading-none uppercase">{{ levelName(name) }}</span>
            <span class="text-xs tabular-nums opacity-80">{{ t.flappyBest }}: {{ bests[name] }}</span>
          </button>
        </div>
        <p class="term-muted text-sm leading-relaxed mt-3">&gt; {{ t[LEVEL_DESC_KEYS[level]] }}</p>
      </section>

      <div class="grid sm:grid-cols-2 gap-4">
        <button type="button" :class="cardClass" @click="startSolo">
          <span class="whitespace-pre text-sm leading-tight" aria-hidden="true">{{ SOLO_ART }}</span>
          <span class="font-display text-3xl leading-none uppercase">{{ t.flappySolo }}</span>
          <span class="term-muted text-sm leading-relaxed">{{ t.flappySoloDesc }}</span>
          <span class="mt-auto flex items-center justify-between gap-2 pt-1">
            <span class="term-chip">{{ levelName(level) }} · {{ t.flappyBest }}: {{ best }}</span>
            <span class="text-sm font-semibold uppercase tracking-widest term-muted group-hover:text-term" aria-hidden="true">&gt; run</span>
          </span>
        </button>

        <button type="button" :class="cardClass" @click="mode = 'online'">
          <span class="whitespace-pre text-sm leading-tight" aria-hidden="true">{{ ONLINE_ART }}</span>
          <span class="font-display text-3xl leading-none uppercase">{{ t.flappyOnline }}</span>
          <span class="term-muted text-sm leading-relaxed">{{ t.flappyOnlineDesc }}</span>
          <span class="mt-auto flex items-center justify-end pt-1">
            <span class="text-sm font-semibold uppercase tracking-widest term-muted group-hover:text-term" aria-hidden="true">&gt; run</span>
          </span>
        </button>
      </div>

      <p class="term-muted text-center text-xs sm:text-sm leading-relaxed">{{ t.flappyControls }}</p>
    </div>
  </TermWindow>

  <!-- Solo -->
  <FlappyStage
    v-else-if="mode === 'solo'"
    :t="t"
    :title="t.flappyTitle"
    :exitLabel="t.flappyQuit"
    :seed="solo.seed"
    :level="level"
    :levelLabel="levelName(level)"
    :runId="solo.runId"
    :paused="solo.paused"
    @exit="quitSolo"
    @tap="onSoloTap"
    @pause="togglePause"
    @state="onSoloState"
  >
    <template #actions>
      <button
        type="button"
        class="term-icon-btn shrink-0 h-9 text-xs"
        :aria-label="solo.paused ? t.flappyResume : t.flappyPause"
        :disabled="!solo.paused && solo.phase !== 'play'"
        @click="onPauseClick"
      >
        {{ solo.paused ? '[>]' : '[||]' }}
      </button>
    </template>

    <template #overlay>
      <div v-if="solo.over" class="absolute inset-0 flex items-center justify-center p-3 bg-black/40">
        <div class="term-window w-full max-w-xs p-5 text-center" role="dialog" aria-modal="false" :aria-label="t.flappyGameOver">
          <h2 class="font-display text-5xl leading-none uppercase">{{ t.flappyGameOver }}</h2>
          <p class="mt-2"><span class="term-chip">{{ LEVEL_MARKS[level] }} {{ levelName(level) }}</span></p>

          <div class="mt-4 flex items-center justify-center gap-5">
            <span class="whitespace-pre text-left text-sm leading-tight" aria-hidden="true">{{ medal ? medalArt(medal.mark) : NO_MEDAL_ART }}</span>
            <dl class="grid grid-cols-[auto_auto] items-baseline gap-x-4 text-left">
              <dt class="term-label">{{ t.flappyScore }}</dt>
              <dd class="font-display text-4xl leading-none tabular-nums">{{ solo.score }}</dd>
              <dt class="term-label">{{ t.flappyBest }}</dt>
              <dd class="font-display text-4xl leading-none tabular-nums">{{ best }}</dd>
            </dl>
          </div>

          <p class="mt-3 text-sm term-muted">{{ medal ? fmt(t.flappyMedal, { medal: t[medal.key] }) : t.flappyNoMedal }}</p>
          <p v-if="solo.newBest && solo.score > 0" class="term-inverse inline-block mt-3 px-2 py-0.5 text-sm font-bold uppercase tracking-widest">{{ t.flappyNewBest }}</p>

          <button type="button" class="term-btn term-btn-primary w-full mt-5" @click="retry">{{ t.flappyRetry }}</button>
          <button type="button" class="term-btn w-full mt-2" @click="quitSolo">{{ t.flappyMenu }}</button>
          <p class="term-muted text-xs mt-3">{{ t.flappyTapToRetry }}</p>
        </div>
      </div>

      <div v-else-if="solo.paused" class="absolute inset-0 flex items-center justify-center p-3 bg-black/60">
        <div class="term-window w-full max-w-xs p-5 text-center">
          <h2 class="font-display text-5xl leading-none uppercase term-blink">{{ t.flappyPaused }}</h2>
          <button type="button" class="term-btn term-btn-primary w-full mt-5" @click="solo.paused = false">{{ t.flappyResume }}</button>
          <p class="term-muted text-xs mt-3">{{ t.flappyTapToResume }}</p>
        </div>
      </div>
    </template>
  </FlappyStage>

  <!-- Online race -->
  <OnlineRoom v-else :room="room" :t="t" :title="t.flappyTitle" @go-back="mode = null" @start="room.act('start')">
    <template #lobby="{ view: lobby, isHost }">
      <div class="space-y-4">
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span class="term-label mr-1">&gt; {{ t.flappyLevel }}</span>
          <button
            v-for="name in LEVEL_NAMES"
            :key="name"
            type="button"
            @click="room.act('level', { level: name })"
            :disabled="!isHost"
            :class="['term-option min-h-8 px-3 text-sm font-semibold', { 'is-active': lobby.level === name }]"
          >
            {{ levelName(name) }}
          </button>
        </div>
        <div class="space-y-2 text-sm leading-relaxed">
          <p class="term-muted">&gt; {{ t[LEVEL_DESC_KEYS[lobby.level]] }}</p>
          <p class="term-muted">&gt; {{ t.flappyLobbyHint }}</p>
        </div>
      </div>
    </template>

    <FlappyStage
      v-if="flying"
      mode="online"
      :t="t"
      :title="t.flappyTitle"
      :exitLabel="t.onlineLeave"
      :seed="view.seed"
      :level="view.level"
      :levelLabel="levelName(view.level)"
      :runId="view.round"
      :round="view.round"
      :startAt="startAt"
      :runner="amRunner"
      :out="knockedOut"
      :myId="room.myId"
      :runners="view.runners"
      :names="names"
      :live="live"
      @exit="room.leave()"
      @crash="room.act('crash', $event)"
      @sample="room.sendLive($event)"
    />

    <!-- Round results -->
    <div v-else-if="view.phase === 'results'" class="space-y-6">
      <div class="text-center">
        <span class="inline-block whitespace-pre text-left text-sm leading-tight mb-3" aria-hidden="true">{{ WINNER_ART }}</span>
        <h2 class="font-display text-5xl leading-none uppercase">{{ fmt(t.flappyRoundResults, { n: view.round }) }}</h2>
        <p class="mt-2"><span class="term-chip">{{ LEVEL_MARKS[view.level] }} {{ levelName(view.level) }}</span></p>
        <p v-if="winner" class="term-muted mt-2">&gt; {{ fmt(t.flappyRoundWinner, { name: winner.name }) }}</p>
      </div>

      <div>
        <div class="flex items-center gap-3 px-4 pb-2 term-label">
          <span class="w-8">#</span>
          <span class="flex-1">{{ t.onlinePlayers }}</span>
          <span class="w-14 text-right">{{ t.flappyWins }}</span>
          <span class="w-14 text-right">{{ t.flappyPipes }}</span>
        </div>
        <ol class="border border-term-low divide-y divide-term-low">
          <li
            v-for="entry in standings"
            :key="entry.id"
            :class="['flex items-center gap-3 px-4 py-3', { 'term-inverse': winner && entry.rank === 1, 'bg-term-deep': !(winner && entry.rank === 1) && entry.id === room.myId }]"
          >
            <span class="w-8 tabular-nums font-semibold">#{{ entry.rank }}</span>
            <span :class="['flex-1 truncate', { 'font-semibold': entry.id === room.myId }]">{{ entry.name }}</span>
            <span class="w-14 text-right tabular-nums text-sm">{{ entry.wins }}</span>
            <span class="w-14 text-right font-bold tabular-nums">{{ entry.score }}</span>
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
