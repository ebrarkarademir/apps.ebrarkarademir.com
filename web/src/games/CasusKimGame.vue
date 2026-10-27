<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import confetti from 'canvas-confetti'
import { useOnlineRoom } from '../online/useOnlineRoom'
import OnlineRoom from '../online/OnlineRoom.vue'

const props = defineProps({
  t: {
    type: Object,
    required: true
  },
  // Room code from a shared invite link
  initialCode: { type: String, default: '' },
  // Open a room straight away: a chat invite is waiting for its code
  hostRoom: { type: Boolean, default: false }
})

defineEmits(['go-back'])

const MIN_PLAYERS = 3
const MAX_PLAYERS = 12
const TWO_SPIES_MIN_PLAYERS = 6
const ACCUSE_REVEAL_MS = 1200
const GUESS_OPTION_COUNT = 8
const ADD_TIME_MS = 30000
const BAR_CELLS = 24
const TALLY_CELLS = 12

// Same index in EN and TR refers to the same word, so every device can show its own language
const themeWords = {
  animals: {
    EN: ['Lion', 'Elephant', 'Giraffe', 'Penguin', 'Kangaroo', 'Dolphin', 'Owl', 'Crocodile', 'Panda', 'Horse', 'Octopus', 'Butterfly'],
    TR: ['Aslan', 'Fil', 'Zürafa', 'Penguen', 'Kanguru', 'Yunus', 'Baykuş', 'Timsah', 'Panda', 'At', 'Ahtapot', 'Kelebek']
  },
  countries: {
    EN: ['Turkey', 'Japan', 'Brazil', 'Egypt', 'France', 'India', 'Italy', 'Mexico', 'Canada', 'Australia', 'Norway', 'Greece'],
    TR: ['Türkiye', 'Japonya', 'Brezilya', 'Mısır', 'Fransa', 'Hindistan', 'İtalya', 'Meksika', 'Kanada', 'Avustralya', 'Norveç', 'Yunanistan']
  },
  jobs: {
    EN: ['Doctor', 'Teacher', 'Chef', 'Pilot', 'Painter', 'Engineer', 'Firefighter', 'Lawyer', 'Farmer', 'Dentist', 'Photographer', 'Police officer'],
    TR: ['Doktor', 'Öğretmen', 'Aşçı', 'Pilot', 'Ressam', 'Mühendis', 'İtfaiyeci', 'Avukat', 'Çiftçi', 'Diş hekimi', 'Fotoğrafçı', 'Polis']
  },
  foods: {
    EN: ['Pizza', 'Sushi', 'Kebab', 'Pasta', 'Burger', 'Taco', 'Baklava', 'Soup', 'Pancake', 'Salad', 'Ice cream', 'Popcorn'],
    TR: ['Pizza', 'Suşi', 'Kebap', 'Makarna', 'Hamburger', 'Tako', 'Baklava', 'Çorba', 'Pankek', 'Salata', 'Dondurma', 'Patlamış mısır']
  },
  sports: {
    EN: ['Football', 'Basketball', 'Tennis', 'Swimming', 'Boxing', 'Golf', 'Volleyball', 'Skiing', 'Cycling', 'Chess', 'Archery', 'Surfing'],
    TR: ['Futbol', 'Basketbol', 'Tenis', 'Yüzme', 'Boks', 'Golf', 'Voleybol', 'Kayak', 'Bisiklet', 'Satranç', 'Okçuluk', 'Sörf']
  },
  places: {
    EN: ['Beach', 'Hospital', 'School', 'Airport', 'Cinema', 'Library', 'Supermarket', 'Museum', 'Zoo', 'Restaurant', 'Gym', 'Train station'],
    TR: ['Plaj', 'Hastane', 'Okul', 'Havalimanı', 'Sinema', 'Kütüphane', 'Süpermarket', 'Müze', 'Hayvanat bahçesi', 'Restoran', 'Spor salonu', 'Tren garı']
  },
  objects: {
    EN: ['Umbrella', 'Mirror', 'Guitar', 'Clock', 'Toothbrush', 'Candle', 'Backpack', 'Scissors', 'Pillow', 'Camera', 'Key', 'Glasses'],
    TR: ['Şemsiye', 'Ayna', 'Gitar', 'Saat', 'Diş fırçası', 'Mum', 'Sırt çantası', 'Makas', 'Yastık', 'Fotoğraf makinesi', 'Anahtar', 'Gözlük']
  }
}
const themeKeys = Object.keys(themeWords)

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const randomInt = (max) => Math.floor(Math.random() * max)

const shuffle = (array) => {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')

// ---------- Host-side game rules ----------

const onlineIds = (s) => s.players.filter(p => p.online).map(p => p.id)
// Players dealt into this round who are still connected
const activeRoster = (s) => s.roster.filter(id => s.players.some(p => p.id === id && p.online))
const effectiveSpyCount = (s, playerCount) => (playerCount >= TWO_SPIES_MIN_PLAYERS ? s.spyCount : 1)

const countVotes = (s) => {
  const counts = Object.fromEntries(s.candidates.map(id => [id, 0]))
  Object.values(s.votes).forEach(target => { if (target in counts) counts[target]++ })
  return s.candidates.map(id => ({ id, count: counts[id] })).sort((a, b) => b.count - a.count)
}
const leadersOf = (s) => {
  const rows = countVotes(s)
  return rows.filter(row => row.count === rows[0]?.count).map(row => row.id)
}

function startRound (s) {
  s.roundNumber++
  s.roster = onlineIds(s)
  s.themeKey = s.themeChoice === 'random' ? themeKeys[randomInt(themeKeys.length)] : s.themeChoice
  const wordCount = themeWords[s.themeKey].EN.length
  let index
  do {
    index = randomInt(wordCount)
  } while (`${s.themeKey}:${index}` === s.lastWordId)
  s.wordIndex = index
  s.lastWordId = `${s.themeKey}:${index}`
  s.spies = shuffle(s.roster).slice(0, effectiveSpyCount(s, s.roster.length))
  s.firstAsker = s.roster[randomInt(s.roster.length)]
  Object.assign(s, {
    ready: {}, votes: {}, candidates: [], runoff: false, accused: null,
    guessOptions: [], guessed: null, outcome: null, deadline: null, pausedLeft: null,
    phase: 'reveal'
  })
}

function startDiscussion (s) {
  s.deadline = Date.now() + s.minutes * 60000
  s.pausedLeft = null
  s.phase = 'discussion'
}

function startVoting (s, candidates, runoff) {
  s.deadline = null
  s.pausedLeft = null
  s.candidates = candidates
  s.runoff = runoff
  s.votes = {}
  s.phase = 'voting'
}

function openTally (s) {
  const leaders = leadersOf(s)
  s.accused = leaders.length === 1 ? leaders[0] : null
  s.phase = 'tally'
}

function openSpyGuess (s) {
  const decoys = shuffle(themeWords[s.themeKey].EN.map((_, i) => i).filter(i => i !== s.wordIndex))
  s.guessOptions = shuffle([s.wordIndex, ...decoys.slice(0, GUESS_OPTION_COUNT - 1)])
  s.guessed = null
  s.phase = 'spyGuess'
}

function finishRound (s, result) {
  s.outcome = result
  s.roster.forEach(id => {
    const isSpy = s.spies.includes(id)
    if (result === 'group' && !isSpy) s.scores[id] = (s.scores[id] || 0) + 1
    if (result !== 'group' && isSpy) {
      s.scores[id] = (s.scores[id] || 0) + (result === 'spyGuess' && id === s.accused ? 3 : 2)
    }
  })
  s.phase = 'result'
}

// Move on as soon as every connected player in the round has acted
function checkProgress (s) {
  const active = activeRoster(s)
  if (s.phase === 'reveal' && active.every(id => s.ready[id])) startDiscussion(s)
  else if (s.phase === 'voting' && active.every(id => id in s.votes)) openTally(s)
}

function onAction (s, playerId, action) {
  const isHost = playerId === s.hostId
  const inRound = s.roster.includes(playerId)
  switch (action.type) {
    case 'setTheme':
      if (isHost && s.phase === 'lobby' && (action.value === 'random' || themeKeys.includes(action.value))) s.themeChoice = action.value
      break
    case 'setMinutes':
      if (isHost && s.phase === 'lobby' && [1, 2, 3, 5].includes(action.value)) s.minutes = action.value
      break
    case 'setSpyCount':
      if (isHost && s.phase === 'lobby' && [1, 2].includes(action.value)) s.spyCount = action.value
      break
    case 'start':
      if (!isHost || s.phase !== 'lobby' || onlineIds(s).length < MIN_PLAYERS) return
      s.scores = {}
      s.roundNumber = 0
      startRound(s)
      break
    case 'ready':
      if (s.phase === 'reveal' && inRound) {
        s.ready[playerId] = true
        checkProgress(s)
      }
      break
    case 'startDiscussion':
      if (isHost && s.phase === 'reveal') startDiscussion(s)
      break
    case 'pause':
      if (isHost && s.phase === 'discussion' && s.deadline) {
        s.pausedLeft = Math.max(0, s.deadline - Date.now())
        s.deadline = null
      }
      break
    case 'resume':
      if (isHost && s.phase === 'discussion' && s.pausedLeft !== null) {
        s.deadline = Date.now() + s.pausedLeft
        s.pausedLeft = null
      }
      break
    case 'addTime':
      if (isHost && s.phase === 'discussion') {
        if (s.pausedLeft !== null) s.pausedLeft += ADD_TIME_MS
        else s.deadline += ADD_TIME_MS
      }
      break
    case 'endDiscussion':
      if (isHost && s.phase === 'discussion') startVoting(s, [...s.roster], false)
      break
    case 'vote':
      if (s.phase === 'voting' && inRound && action.target !== playerId && s.candidates.includes(action.target)) {
        s.votes[playerId] = action.target
        checkProgress(s)
      }
      break
    case 'runoff':
      if (isHost && s.phase === 'tally' && s.accused === null && !s.runoff) startVoting(s, leadersOf(s), true)
      break
    case 'continue':
      if (!isHost) return
      if (s.phase === 'tally') {
        if (s.accused !== null && s.spies.includes(s.accused)) openSpyGuess(s)
        else if (s.accused !== null || s.runoff) finishRound(s, 'spy')
      } else if (s.phase === 'spyGuess') {
        finishRound(s, s.guessed === s.wordIndex ? 'spyGuess' : 'group')
      }
      break
    case 'guess':
      if (s.phase === 'spyGuess' && playerId === s.accused && s.guessed === null && s.guessOptions.includes(action.index)) {
        s.guessed = action.index
      }
      break
    case 'nextRound':
      if (isHost && s.phase === 'result') {
        if (onlineIds(s).length >= MIN_PLAYERS) startRound(s)
        else s.phase = 'lobby'
      }
      break
    case 'newGame':
      if (isHost && s.phase === 'result') {
        s.players = s.players.filter(p => p.online)
        s.phase = 'lobby'
      }
      break
  }
}

const room = useOnlineRoom({
  game: 'casus-kim',
  initialCode: props.initialCode,
  hostRoom: props.hostRoom,
  initialState: () => ({
    themeChoice: 'random', minutes: 2, spyCount: 1,
    roundNumber: 0, roster: [], themeKey: '', wordIndex: -1, lastWordId: '', spies: [], firstAsker: null,
    ready: {}, deadline: null, pausedLeft: null,
    candidates: [], runoff: false, votes: {}, accused: null,
    guessOptions: [], guessed: null, outcome: null, scores: {}
  }),
  // Each player gets only their own role. Spies, the word and individual votes stay on the
  // host until the round ends.
  project: (s, playerId) => {
    const { spies, wordIndex, votes, lastWordId, ...visible } = s
    const revealAll = s.phase === 'result'
    const inRound = s.roster.includes(playerId)
    const amSpy = spies.includes(playerId)
    const knowsWord = revealAll || (inRound && !amSpy) || (s.phase === 'spyGuess' && s.guessed !== null)
    const accusedKnown = ['tally', 'spyGuess', 'result'].includes(s.phase) && s.accused !== null
    return {
      ...visible,
      me: { inRound, isSpy: amSpy },
      wordIndex: knowsWord ? wordIndex : null,
      spies: revealAll ? spies : [],
      accusedIsSpy: accusedKnown ? spies.includes(s.accused) : null,
      voted: Object.keys(votes),
      myVote: votes[playerId] ?? null,
      tally: s.phase === 'tally' ? countVotes(s) : [],
      lastVotes: revealAll ? votes : {}
    }
  },
  onAction,
  onLeave: checkProgress,
  onTick: (s, now) => {
    if (s.phase === 'discussion' && s.deadline && now >= s.deadline) startVoting(s, [...s.roster], false)
  }
})

// ---------- View ----------

const view = computed(() => room.view)
const lang = computed(() => (props.t.langCode === 'TR' ? 'TR' : 'EN'))
const players = computed(() => view.value?.players || [])
const nameOf = (id) => players.value.find(p => p.id === id)?.name || ''
const onlineCount = computed(() => players.value.filter(p => p.online).length)
const rosterOnline = computed(() => (view.value?.roster || []).filter(id => players.value.some(p => p.id === id && p.online)))

const me = computed(() => view.value?.me || { inRound: false, isSpy: false })
const theme = computed(() => (view.value?.themeKey ? themeWords[view.value.themeKey] : null))
const themeLabel = computed(() => (view.value?.themeKey ? props.t[view.value.themeKey] : ''))
const word = computed(() => (theme.value && view.value.wordIndex !== null ? theme.value[lang.value][view.value.wordIndex] : ''))
const isSpy = (id) => view.value?.spies.includes(id)

// Role card
const cardFlipped = ref(false)
const showMyCard = ref(false)
const isReady = computed(() => !!view.value?.ready[room.myId])
const readyCount = computed(() => rosterOnline.value.filter(id => view.value.ready[id]).length)

watch(() => view.value?.roundNumber, () => {
  cardFlipped.value = false
  showMyCard.value = false
})

// Discussion
const msLeft = computed(() => {
  const v = view.value
  if (!v) return 0
  if (v.pausedLeft !== null) return v.pausedLeft
  return Math.max(0, (v.deadline || 0) - room.now)
})
const timeLeft = computed(() => Math.ceil(msLeft.value / 1000))
const totalTime = computed(() => Math.max((view.value?.minutes || 1) * 60, timeLeft.value))
// [#################.......] draining as the clock runs
const timeBar = computed(() => {
  const filled = Math.ceil((timeLeft.value / totalTime.value) * BAR_CELLS)
  return '#'.repeat(filled) + '.'.repeat(BAR_CELLS - filled)
})
const formattedTime = computed(() => `${Math.floor(timeLeft.value / 60)}:${(timeLeft.value % 60).toString().padStart(2, '0')}`)
const isPaused = computed(() => view.value?.pausedLeft !== null)
const isLowTime = computed(() => timeLeft.value <= 10)
const exampleQuestions = computed(() => [1, 2, 3, 4, 5, 6].map(n => props.t[`spyQ${n}`]))

// Voting
const pendingVote = ref(null)
watch(() => [view.value?.phase, view.value?.runoff], () => { pendingVote.value = null })
const voteOptions = computed(() => (view.value?.candidates || []).filter(id => id !== room.myId))
const hasVoted = computed(() => view.value?.myVote !== null && view.value?.myVote !== undefined)
const votedCount = computed(() => rosterOnline.value.filter(id => view.value.voted.includes(id)).length)

// Tally: the accused's role is revealed after a short drumroll on every device
const accusedRevealed = ref(false)
let revealTimer = null
watch(() => view.value?.phase, (phase) => {
  clearTimeout(revealTimer)
  accusedRevealed.value = false
  if (phase === 'tally') revealTimer = setTimeout(() => { accusedRevealed.value = true }, prefersReducedMotion() ? 0 : ACCUSE_REVEAL_MS)
})
onUnmounted(() => clearTimeout(revealTimer))

const maxVotes = computed(() => Math.max(1, ...(view.value?.tally || []).map(row => row.count)))
const tallyBar = (count) => {
  const filled = Math.round((count / maxVotes.value) * TALLY_CELLS)
  return '#'.repeat(filled) + '.'.repeat(TALLY_CELLS - filled)
}
const leaders = computed(() => {
  const rows = view.value?.tally || []
  return rows.filter(row => row.count === rows[0]?.count).map(row => row.id)
})
const isTie = computed(() => view.value?.phase === 'tally' && view.value.accused === null)

// Spy's last chance
const amAccused = computed(() => view.value?.accused === room.myId)
const guessCorrect = computed(() => view.value?.guessed !== null && view.value?.guessed === view.value?.wordIndex)

// Result
const spyTeamWon = computed(() => view.value?.outcome === 'spy' || view.value?.outcome === 'spyGuess')
watch(() => view.value?.phase, (phase) => {
  if (phase === 'result' && view.value.outcome === 'group' && !prefersReducedMotion()) {
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ['#00ff00', '#00b300', '#007a00'], shapes: ['square'] })
  }
})

const scoreboard = computed(() =>
  players.value
    .map(p => ({ id: p.id, name: p.name, points: view.value.scores[p.id] || 0 }))
    .sort((a, b) => b.points - a.points)
)

// Shared button styles
const optionClass = (active, unavailable = false) => ['term-option', { 'is-active': active, 'is-off': unavailable }]
const primaryClass = 'term-btn term-btn-primary w-full min-h-14'
const secondaryClass = 'term-btn w-full'
const panelClass = 'term-panel p-4'
</script>

<template>
  <OnlineRoom
    :room="room"
    :t="t"
    :title="t.casusTitle"
    :minPlayers="MIN_PLAYERS"
    :canStart="onlineCount <= MAX_PLAYERS"
    :startHint="t.spyMaxPlayers"
    @go-back="$emit('go-back')"
    @start="room.act('start')"
  >
    <!-- Lobby settings (host chooses, everyone sees) -->
    <template #lobby="{ view: lobby, isHost }">
      <div class="space-y-6">
        <section class="space-y-3">
          <h2 class="term-label">&gt; {{ t.selectTheme }}</h2>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button @click="room.act('setTheme', { value: 'random' })" :disabled="!isHost" :class="optionClass(lobby.themeChoice === 'random')">
              [?] {{ t.spyRandomTheme }}
            </button>
            <button
              v-for="key in themeKeys"
              :key="key"
              @click="room.act('setTheme', { value: key })"
              :disabled="!isHost"
              :class="optionClass(lobby.themeChoice === key)"
            >
              {{ t[key] }}
            </button>
          </div>
        </section>

        <section class="grid sm:grid-cols-2 gap-6">
          <div class="space-y-3">
            <h2 class="term-label">&gt; {{ t.spyDiscussionLength }}</h2>
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="minutes in [1, 2, 3, 5]"
                :key="minutes"
                @click="room.act('setMinutes', { value: minutes })"
                :disabled="!isHost"
                :class="[optionClass(lobby.minutes === minutes), 'px-1']"
              >
                {{ fmt(t.spyMinutes, { n: minutes }) }}
              </button>
            </div>
          </div>
          <div class="space-y-3">
            <h2 class="term-label">&gt; {{ t.spySpyCount }}</h2>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="count in [1, 2]"
                :key="count"
                @click="room.act('setSpyCount', { value: count })"
                :disabled="!isHost || (count === 2 && onlineCount < TWO_SPIES_MIN_PLAYERS)"
                :class="optionClass(
                  (onlineCount >= TWO_SPIES_MIN_PLAYERS ? lobby.spyCount : 1) === count,
                  count === 2 && onlineCount < TWO_SPIES_MIN_PLAYERS
                )"
              >
                {{ '[*]'.repeat(count) }} {{ count }}
              </button>
            </div>
            <p v-if="onlineCount < TWO_SPIES_MIN_PLAYERS" class="term-muted text-xs">{{ t.spyTwoSpiesHint }}</p>
          </div>
        </section>
      </div>
    </template>

    <div class="space-y-6">
      <p class="term-label text-center">{{ fmt(t.spyRound, { n: view.roundNumber }) }}</p>

      <!-- Joined mid-round: no card until the next one -->
      <div v-if="!me.inRound && view.phase !== 'result'" class="term-panel text-center py-10 space-y-3">
        <div class="term-spinner font-display text-6xl leading-none" aria-hidden="true"></div>
        <p class="font-semibold">{{ t.spyNotInRound }}</p>
      </div>

      <!-- Role reveal -->
      <div v-else-if="view.phase === 'reveal'" class="space-y-6 text-center">
        <button
          type="button"
          class="flip-card mx-auto block w-full max-w-xs aspect-[3/4] focus:outline-none"
          :class="{ flipped: cardFlipped }"
          @click="cardFlipped = !cardFlipped"
          :aria-label="t.spyTapToReveal"
        >
          <div class="flip-card-inner">
            <!-- Front (face down) -->
            <div class="flip-card-face term-window flex flex-col items-center justify-center gap-4 p-6">
              <span class="font-display text-7xl leading-none" aria-hidden="true">[***]</span>
              <span class="font-semibold uppercase tracking-wider term-cursor">{{ t.spyTapToReveal }}</span>
              <span class="term-muted text-sm">{{ t.spyKeepSecret }}</span>
            </div>
            <!-- Back (role) -->
            <div :class="['flip-card-face flip-card-back flex flex-col items-center justify-center gap-3 p-6', me.isSpy ? 'term-inverse' : 'term-window']">
              <template v-if="me.isSpy">
                <span class="font-display text-7xl leading-none" aria-hidden="true">[*]</span>
                <span class="font-display text-4xl leading-none uppercase">{{ t.youAreSpy }}</span>
                <span class="text-xs font-semibold uppercase tracking-[0.18em] mt-3">{{ t.spyTheme }}</span>
                <span class="text-xl font-semibold">{{ themeLabel }}</span>
                <span class="text-sm mt-2">{{ t.spyHint }}</span>
              </template>
              <template v-else>
                <span class="term-label">{{ t.spyTheme }}</span>
                <span class="text-lg font-semibold">{{ themeLabel }}</span>
                <span class="term-label mt-4">{{ t.spySecretWord }}</span>
                <span class="font-display text-5xl leading-none uppercase break-words">{{ word }}</span>
              </template>
            </div>
          </div>
        </button>

        <button v-if="!isReady" @click="cardFlipped = false; room.act('ready')" :disabled="!cardFlipped" :class="primaryClass">
          {{ t.spyReady }}
        </button>
        <p class="term-muted text-sm">{{ fmt(t.spyReadyCount, { n: readyCount, total: rosterOnline.length }) }}</p>
        <button v-if="room.isHost" @click="room.act('startDiscussion')" :class="secondaryClass">{{ t.spyStartDiscussion }}</button>
      </div>

      <!-- Discussion -->
      <div v-else-if="view.phase === 'discussion'" class="space-y-6 text-center">
        <h2 class="font-display text-3xl leading-none uppercase">{{ t.discussionTime }}</h2>

        <div>
          <span
            :class="['font-display text-8xl leading-none tabular-nums', { 'term-blink': isLowTime && !isPaused }]"
            role="timer"
            aria-live="off"
          >
            {{ formattedTime }}
          </span>
          <p class="text-sm whitespace-pre overflow-hidden mt-2" aria-hidden="true">[{{ timeBar }}]</p>
          <p v-if="isPaused" class="term-label term-blink mt-2">[||] {{ t.spyPaused }}</p>
        </div>

        <div class="term-panel border-term p-4 text-lg">
          &gt; {{ fmt(t.spyFirstAsker, { name: nameOf(view.firstAsker) }) }}
        </div>

        <!-- Peek at your own role again -->
        <button @click="showMyCard = !showMyCard" :class="secondaryClass" :aria-expanded="showMyCard">{{ t.spyMyCard }}</button>
        <div v-if="showMyCard" :class="['p-4', me.isSpy ? 'term-inverse' : 'border border-term']">
          <p class="text-sm">{{ themeLabel }}</p>
          <p class="font-display text-4xl leading-none uppercase mt-1">{{ me.isSpy ? t.youAreSpy : word }}</p>
        </div>

        <div v-if="room.isHost" class="grid grid-cols-2 gap-3">
          <button @click="room.act(isPaused ? 'resume' : 'pause')" :class="[secondaryClass, 'text-sm']">
            {{ isPaused ? t.spyResume : t.spyPause }}
          </button>
          <button @click="room.act('addTime')" :class="[secondaryClass, 'text-sm normal-case']">{{ t.spyAddTime }}</button>
        </div>

        <details class="group term-panel p-4 text-left">
          <summary class="cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true"><span class="group-open:hidden">[+]</span><span class="hidden group-open:inline">[-]</span></span>
            {{ t.spyNeedIdeas }}
          </summary>
          <ul class="mt-3 space-y-2">
            <li v-for="question in exampleQuestions" :key="question" class="term-muted text-sm">
              &gt; “{{ question }}”
            </li>
          </ul>
        </details>

        <button v-if="room.isHost" @click="room.act('endDiscussion')" :class="primaryClass">
          {{ t.endDiscussion }}
        </button>
      </div>

      <!-- Voting: everyone votes on their own device at the same time -->
      <div v-else-if="view.phase === 'voting'" class="space-y-6 text-center">
        <p v-if="view.runoff" class="term-inverse inline-block px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
          [!] {{ t.spyRunoff }}
        </p>

        <template v-if="!hasVoted">
          <h2 class="font-display text-3xl leading-none uppercase">{{ fmt(t.spyVoteFor, { name: room.me?.name || '' }) }}</h2>
          <div class="grid grid-cols-2 gap-3">
            <button
              v-for="id in voteOptions"
              :key="id"
              @click="pendingVote = id"
              :class="optionClass(pendingVote === id)"
              :aria-pressed="pendingVote === id"
            >
              {{ nameOf(id) }}
            </button>
          </div>
          <button @click="room.act('vote', { target: pendingVote })" :disabled="pendingVote === null" :class="primaryClass">
            {{ t.spyConfirmVote }}
          </button>
        </template>
        <div v-else class="term-panel py-8 space-y-3">
          <div class="font-display text-6xl leading-none" aria-hidden="true">[OK]</div>
          <p class="font-semibold term-cursor">{{ t.spyVoteCast }}</p>
        </div>
        <p class="term-muted text-sm">{{ fmt(t.spyVotedCount, { n: votedCount, total: rosterOnline.length }) }}</p>
      </div>

      <!-- Tally -->
      <div v-else-if="view.phase === 'tally'" class="space-y-6 text-center">
        <h2 class="font-display text-5xl leading-none uppercase">{{ t.spyVotesIn }}</h2>

        <ul class="space-y-2 text-left">
          <li v-for="row in view.tally" :key="row.id" :class="['flex items-center gap-3 text-sm', leaders.includes(row.id) ? '' : 'term-muted']">
            <span class="w-24 shrink-0 truncate font-semibold">{{ nameOf(row.id) }}</span>
            <span class="whitespace-pre" aria-hidden="true">[{{ tallyBar(row.count) }}]</span>
            <span class="ml-auto font-display text-2xl leading-none tabular-nums">{{ row.count }}</span>
          </li>
        </ul>

        <div aria-live="polite" class="space-y-4">
          <template v-if="isTie">
            <p class="text-lg font-semibold">[!] {{ view.runoff ? t.spyNoOneCaught : t.spyTie }}</p>
            <template v-if="room.isHost">
              <button v-if="!view.runoff" @click="room.act('runoff')" :class="primaryClass">{{ t.spyStartRunoff }}</button>
              <button v-else @click="room.act('continue')" :class="primaryClass">{{ t.spyContinue }}</button>
            </template>
          </template>
          <template v-else>
            <p class="text-xl font-semibold">&gt; {{ fmt(t.spyAccused, { name: nameOf(view.accused) }) }}</p>
            <p v-if="!accusedRevealed" class="font-display text-4xl leading-none term-blink" aria-hidden="true">. . .</p>
            <Transition name="pop">
              <div v-if="accusedRevealed" class="space-y-4">
                <p :class="['font-display text-4xl leading-none uppercase px-4 py-3', view.accusedIsSpy ? 'term-inverse' : 'border border-dashed border-term']">
                  {{ view.accusedIsSpy ? '[ok] ' + t.spyWasSpy : '[x] ' + t.spyWasNotSpy }}
                </p>
                <button v-if="room.isHost" @click="room.act('continue')" :class="primaryClass">{{ t.spyContinue }}</button>
              </div>
            </Transition>
          </template>
          <p v-if="!room.isHost" class="term-muted text-sm"><span class="term-cursor">{{ t.onlineWaitingNext }}</span></p>
        </div>
      </div>

      <!-- Spy's last chance: only the caught spy can pick -->
      <div v-else-if="view.phase === 'spyGuess'" class="space-y-6 text-center">
        <div class="font-display text-7xl leading-none term-blink" aria-hidden="true">[*]</div>
        <h2 class="font-display text-4xl leading-none uppercase">{{ t.spyLastChance }}</h2>
        <p class="text-lg">
          &gt; {{ amAccused ? fmt(t.spyGuessWord, { name: nameOf(view.accused) }) : fmt(t.spyGuessing, { name: nameOf(view.accused) }) }}
        </p>

        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="option in view.guessOptions"
            :key="option"
            @click="room.act('guess', { index: option })"
            :disabled="!amAccused || view.guessed !== null"
            :class="[
              'px-4 py-3 border font-medium transition-colors disabled:cursor-default',
              view.guessed === null
                ? 'border-term-low' + (amAccused ? ' hover:border-term hover:bg-term-deep' : '')
                : option === view.wordIndex
                  ? 'term-inverse border-term'
                  : option === view.guessed
                    ? 'border-dashed border-term-low text-term-low line-through'
                    : 'border-term-low opacity-40'
            ]"
          >
            {{ themeWords[view.themeKey][lang][option] }}
          </button>
        </div>

        <Transition name="pop">
          <div v-if="view.guessed !== null" aria-live="polite">
            <p :class="['font-display text-4xl leading-none uppercase px-4 py-3', guessCorrect ? 'term-inverse' : 'border border-dashed border-term']">
              {{ guessCorrect ? '[ok] ' + t.spyGuessedRight : '[x] ' + t.spyGuessedWrong }}
            </p>
          </div>
        </Transition>
        <button v-if="room.isHost && view.guessed !== null" @click="room.act('continue')" :class="primaryClass">
          {{ t.spyContinue }}
        </button>
      </div>

      <!-- Result -->
      <div v-else-if="view.phase === 'result'" class="space-y-6">
        <div class="term-inverse p-6 text-center">
          <div class="font-display text-7xl leading-none mb-2" aria-hidden="true">{{ spyTeamWon ? '[*]' : '[+]' }}</div>
          <h2 class="font-display text-5xl leading-none uppercase">{{ spyTeamWon ? t.spyWins : t.groupWins }}</h2>
          <p v-if="view.outcome === 'spyGuess'" class="mt-2 font-semibold">{{ t.spyGuessedRight }}</p>
        </div>

        <div class="grid sm:grid-cols-2 gap-3">
          <div :class="panelClass">
            <p class="term-label mb-1">
              {{ view.spies.length > 1 ? t.spySpiesWere : t.spyWas }}
            </p>
            <p class="text-lg font-semibold">[*] {{ view.spies.map(nameOf).join(', ') }}</p>
          </div>
          <div :class="panelClass">
            <p class="term-label mb-1">{{ t.wordWas }}</p>
            <p class="text-lg font-semibold">&gt; {{ word }}</p>
          </div>
        </div>

        <div v-if="Object.keys(view.lastVotes).length" :class="panelClass">
          <p class="term-label mb-2">{{ t.spyVotes }}</p>
          <ul class="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <li v-for="(target, voter) in view.lastVotes" :key="voter" class="flex gap-2">
              <span class="font-medium truncate">{{ nameOf(voter) }}</span>
              <span class="term-muted">{{ t.spyVotedFor }}</span>
              <span :class="['truncate', isSpy(target) ? 'font-bold underline underline-offset-4' : 'term-muted']">{{ nameOf(target) }}</span>
            </li>
          </ul>
        </div>

        <div :class="panelClass">
          <p class="term-label mb-3">{{ t.spyScoreboard }}</p>
          <ol class="space-y-2">
            <li v-for="(row, rank) in scoreboard" :key="row.id" :class="['flex items-center gap-3', { 'bg-term-deep -mx-2 px-2': row.id === room.myId }]">
              <span class="w-8 tabular-nums font-semibold">#{{ rank + 1 }}</span>
              <span :class="['flex-1 truncate font-medium', { 'font-bold': row.id === room.myId }]">
                {{ row.name }}
                <span v-if="isSpy(row.id)" class="text-xs term-muted">[*]</span>
              </span>
              <span class="font-bold tabular-nums">{{ row.points }} {{ t.spyPoints }}</span>
            </li>
          </ol>
          <p class="term-muted text-xs mt-3">{{ t.spyScoringInfo }}</p>
        </div>

        <div v-if="room.isHost" class="grid sm:grid-cols-2 gap-3">
          <button @click="room.act('newGame')" :class="secondaryClass">{{ t.spyNewGame }}</button>
          <button @click="room.act('nextRound')" :class="primaryClass">{{ t.spyNextRound }}</button>
        </div>
        <p v-else class="term-muted text-center text-sm"><span class="term-cursor">{{ t.onlineWaitingNext }}</span></p>
      </div>
    </div>
  </OnlineRoom>
</template>

<style scoped>
/* Role card flip */
.flip-card {
  perspective: 1200px;
}
.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}
.flip-card.flipped .flip-card-inner {
  transform: rotateY(180deg);
}
.flip-card-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.flip-card-back {
  transform: rotateY(180deg);
}
.flip-card:not(.flipped):hover .flip-card-inner {
  transform: rotateY(8deg);
}

.pop-enter-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1.4);
}
.pop-enter-from {
  opacity: 0;
  transform: scale(0.9);
}

@media (prefers-reduced-motion: reduce) {
  .flip-card-inner,
  .pop-enter-active {
    transition: none;
  }
}
</style>
