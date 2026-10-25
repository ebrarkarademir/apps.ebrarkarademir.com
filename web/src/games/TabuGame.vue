<script setup>
import { computed } from 'vue'
import { useOnlineRoom } from '../online/useOnlineRoom'
import OnlineRoom from '../online/OnlineRoom.vue'

const props = defineProps({
  isDarkMode: {
    type: Boolean,
    default: false
  },
  t: {
    type: Object,
    required: true
  },
  // Room code from a shared invite link
  initialCode: { type: String, default: '' }
})

defineEmits(['go-back'])

const ROUND_MS = 60000

// Card database: each card has an EN and a TR version so the shown card follows each device's language
const cards = [
  { id: 'phone', TR: { word: 'TELEFON', taboo: ['ARAMAK', 'NUMARA', 'CEP', 'KONUŞMAK', 'MESAJ'] }, EN: { word: 'PHONE', taboo: ['CALL', 'NUMBER', 'MOBILE', 'TALK', 'TEXT'] } },
  { id: 'coffee', TR: { word: 'KAHVE', taboo: ['İÇMEK', 'SICAK', 'FİNCAN', 'TÜRK', 'NESCAFE'] }, EN: { word: 'COFFEE', taboo: ['DRINK', 'HOT', 'CUP', 'CAFFEINE', 'MORNING'] } },
  { id: 'computer', TR: { word: 'BİLGİSAYAR', taboo: ['KLAVYE', 'MOUSE', 'EKRAN', 'İNTERNET', 'LAPTOP'] }, EN: { word: 'COMPUTER', taboo: ['KEYBOARD', 'MOUSE', 'SCREEN', 'INTERNET', 'LAPTOP'] } },
  { id: 'football', TR: { word: 'FUTBOL', taboo: ['TOP', 'GOL', 'STADYUM', 'TAKIM', 'MAÇ'] }, EN: { word: 'FOOTBALL', taboo: ['BALL', 'GOAL', 'STADIUM', 'TEAM', 'MATCH'] } },
  { id: 'book', TR: { word: 'KİTAP', taboo: ['OKUMAK', 'SAYFA', 'YAZAR', 'ROMAN', 'KAPAK'] }, EN: { word: 'BOOK', taboo: ['READ', 'PAGE', 'AUTHOR', 'NOVEL', 'COVER'] } },
  { id: 'beach', TR: { word: 'PLAJ', taboo: ['DENİZ', 'KUM', 'GÜNEŞ', 'YÜZMEK', 'TATİL'] }, EN: { word: 'BEACH', taboo: ['SEA', 'SAND', 'SUN', 'SWIM', 'HOLIDAY'] } },
  { id: 'doctor', TR: { word: 'DOKTOR', taboo: ['HASTANE', 'HASTA', 'İLAÇ', 'REÇETE', 'MUAYENE'] }, EN: { word: 'DOCTOR', taboo: ['HOSPITAL', 'SICK', 'MEDICINE', 'PRESCRIPTION', 'NURSE'] } },
  { id: 'cinema', TR: { word: 'SİNEMA', taboo: ['FİLM', 'SALON', 'BİLET', 'PATLAMIŞ MISIR', 'PERDE'] }, EN: { word: 'CINEMA', taboo: ['MOVIE', 'THEATER', 'TICKET', 'POPCORN', 'SCREEN'] } },
  { id: 'cake', TR: { word: 'PASTA', taboo: ['TATLI', 'KREMALI', 'DOĞUM GÜNÜ', 'ŞEKER', 'FIRIN'] }, EN: { word: 'CAKE', taboo: ['SWEET', 'CREAM', 'BIRTHDAY', 'SUGAR', 'BAKE'] } },
  { id: 'car', TR: { word: 'ARABA', taboo: ['SÜRMEK', 'TEKERLEK', 'MOTOR', 'YOLCULUK', 'EHLİYET'] }, EN: { word: 'CAR', taboo: ['DRIVE', 'WHEEL', 'ENGINE', 'ROAD', 'LICENSE'] } }
  // Add more cards as needed
]

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')

const shuffle = (array) => {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// ---------- Host-side game rules ----------

const teamMembers = (s, team) => s.players.filter(p => p.online && s.teams[p.id] === team)

// Explainers rotate within each team, one turn per round
const explainerOf = (s) => {
  const members = teamMembers(s, s.currentTeam)
  return members.length ? members[s.turns[s.currentTeam] % members.length].id : null
}

const smallerTeam = (s) => (teamMembers(s, 0).length <= teamMembers(s, 1).length ? 0 : 1)

function endRound (s) {
  s.playing = false
  s.deadline = null
  if (s.cardIndex >= s.deck.length) {
    s.phase = 'score'
    return
  }
  // The team that just played moves on to its next explainer, then the other team plays
  s.turns[s.currentTeam]++
  s.currentTeam = (s.currentTeam + 1) % 2
}

// Guessed, skipped and buzzed cards all leave the deck for the rest of the game
function nextCard (s) {
  s.cardIndex++
  if (s.cardIndex >= s.deck.length) endRound(s)
}

function onAction (s, playerId, action) {
  const isHost = playerId === s.hostId
  const isExplainer = playerId === explainerOf(s)
  switch (action.type) {
    case 'setTeam':
      if (s.phase === 'lobby' && [0, 1].includes(action.team)) s.teams[playerId] = action.team
      break
    case 'shuffleTeams':
      if (isHost && s.phase === 'lobby') {
        shuffle(s.players.filter(p => p.online)).forEach((p, i) => { s.teams[p.id] = i % 2 })
      }
      break
    case 'start':
      if (!isHost || s.phase !== 'lobby' || !teamMembers(s, 0).length || !teamMembers(s, 1).length) return
      Object.assign(s, {
        phase: 'play',
        deck: shuffle(cards.map((_, i) => i)),
        cardIndex: 0,
        scores: [0, 0],
        currentTeam: 0,
        turns: [0, 0],
        playing: false,
        deadline: null
      })
      break
    case 'startRound':
      if (s.phase === 'play' && !s.playing && (isExplainer || isHost)) {
        s.playing = true
        s.deadline = Date.now() + ROUND_MS
      }
      break
    case 'correct':
      if (s.playing && isExplainer) {
        s.scores[s.currentTeam]++
        nextCard(s)
      }
      break
    case 'skip':
      if (s.playing && isExplainer) nextCard(s)
      break
    case 'taboo':
      // Only the other team can call a taboo word
      if (s.playing && s.teams[playerId] === 1 - s.currentTeam) nextCard(s)
      break
    case 'again':
      if (isHost && s.phase === 'score') {
        s.players = s.players.filter(p => p.online)
        s.phase = 'lobby'
      }
      break
  }
}

const room = useOnlineRoom({
  game: 'tabu',
  initialCode: props.initialCode,
  initialState: () => ({
    teams: {}, deck: [], cardIndex: 0, scores: [0, 0], currentTeam: 0, turns: [0, 0], playing: false, deadline: null
  }),
  // The card goes only to the explainer and the other team, never to the guessers
  project: (s, playerId) => {
    const { deck, ...visible } = s
    const explainer = explainerOf(s)
    const seesCard = s.playing && (playerId === explainer || s.teams[playerId] === 1 - s.currentTeam)
    return {
      ...visible,
      explainer,
      cardsLeft: deck.length - s.cardIndex,
      card: seesCard ? deck[s.cardIndex] : null
    }
  },
  onAction,
  onJoin: (s, player) => { s.teams[player.id] ??= smallerTeam(s) },
  onTick: (s, now) => { if (s.playing && now >= s.deadline) endRound(s) }
})

// ---------- View ----------

const view = computed(() => room.view)
const lang = computed(() => (props.t.langCode === 'TR' ? 'TR' : 'EN'))
const teamName = (index) => fmt(props.t.tabuTeam, { n: index + 1 })
const nameOf = (id) => view.value?.players.find(p => p.id === id)?.name || ''
const membersOf = (team) => (view.value?.players || []).filter(p => view.value.teams[p.id] === team)
const bothTeamsReady = computed(() => [0, 1].every(team => membersOf(team).some(p => p.online)))

const myTeam = computed(() => view.value?.teams[room.myId])
const amExplainer = computed(() => view.value?.explainer === room.myId)
const amWatcher = computed(() => myTeam.value === 1 - view.value?.currentTeam)
const shownCard = computed(() => (view.value?.card != null ? cards[view.value.card][lang.value] : null))

const secondsLeft = computed(() => Math.max(0, Math.ceil(((view.value?.deadline || 0) - room.now) / 1000)))
const formattedTime = computed(() => {
  const seconds = view.value?.playing ? secondsLeft.value : ROUND_MS / 1000
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`
})

const winnerText = computed(() => {
  const [first, second] = view.value.scores
  if (first === second) return props.t.tabuDraw
  return fmt(props.t.tabuTeamWins, { team: teamName(first > second ? 0 : 1) })
})

const muted = computed(() => (props.isDarkMode ? 'text-gray-400' : 'text-gray-600'))
const panel = computed(() => ['rounded-lg border', props.isDarkMode ? 'border-gray-800 bg-gray-950/40' : 'border-gray-200 bg-gray-50'])
const primary = 'w-full px-6 py-4 rounded-lg font-semibold bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 transition-colors'
</script>

<template>
  <OnlineRoom
    :room="room"
    :t="t"
    :isDarkMode="isDarkMode"
    :title="t.tabuTitle"
    :minPlayers="2"
    :canStart="bothTeamsReady"
    :startHint="t.tabuNeedTeams"
    @go-back="$emit('go-back')"
    @start="room.act('start')"
  >
    <!-- Team picker replaces the plain player list -->
    <template #players>
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div v-for="team in [0, 1]" :key="team" :class="[panel, 'p-3 space-y-2']">
            <div class="flex items-center justify-between gap-2">
              <h2 class="font-semibold">{{ teamName(team) }}</h2>
              <button
                v-if="myTeam !== team"
                @click="room.act('setTeam', { team })"
                class="h-7 px-2.5 rounded-md bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 transition-colors"
              >
                {{ t.tabuJoinTeam }}
              </button>
            </div>
            <ul class="space-y-1.5">
              <li
                v-for="player in membersOf(team)"
                :key="player.id"
                :class="['flex items-center gap-2 text-sm', { 'font-semibold': player.id === room.myId, 'opacity-40': !player.online }]"
              >
                <span :class="['h-2 w-2 rounded-full shrink-0', player.online ? 'bg-emerald-500' : 'bg-gray-400']"></span>
                <span class="truncate">{{ player.name }}</span>
              </li>
            </ul>
          </div>
        </div>
        <button
          v-if="room.isHost"
          @click="room.act('shuffleTeams')"
          :class="['w-full text-sm', isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-800']"
        >
          🔀 {{ t.tabuShuffleTeams }}
        </button>
      </div>
    </template>

    <!-- Play Phase -->
    <div v-if="view.phase === 'play'" class="space-y-6">
      <!-- Scores -->
      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="team in [0, 1]"
          :key="team"
          :class="[
            'rounded-lg px-4 py-2 flex items-center justify-between border transition-colors',
            team === view.currentTeam
              ? 'border-violet-500'
              : isDarkMode ? 'border-gray-800 bg-gray-950/40' : 'border-gray-200 bg-gray-50'
          ]"
        >
          <span class="font-medium truncate">
            {{ teamName(team) }}<span v-if="myTeam === team" :class="['text-xs font-normal', muted]"> · {{ t.tabuYourTeam }}</span>
          </span>
          <span class="text-xl font-bold tabular-nums">{{ view.scores[team] }}</span>
        </div>
      </div>

      <!-- Game Info -->
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-xl font-semibold">{{ teamName(view.currentTeam) }}</h2>
          <p class="text-sm opacity-75">{{ fmt(t.tabuPlayerTurn, { name: nameOf(view.explainer) }) }}</p>
          <p class="text-xs opacity-60">{{ fmt(t.tabuCardsLeft, { n: view.cardsLeft }) }}</p>
        </div>
        <div :class="['text-4xl font-bold tabular-nums', view.playing && secondsLeft <= 10 ? 'text-rose-500' : '']">
          {{ formattedTime }}
        </div>
      </div>

      <!-- Before the round -->
      <template v-if="!view.playing">
        <div :class="[panel, 'p-6 text-center text-lg']">
          {{ amExplainer ? t.tabuYouExplain : fmt(t.tabuGetReady, { name: nameOf(view.explainer), team: teamName(view.currentTeam) }) }}
        </div>
        <button v-if="amExplainer || room.isHost" @click="room.act('startRound')" :class="primary">
          {{ t.startRound }}
        </button>
        <p v-else :class="['text-center text-sm', muted]">{{ fmt(t.tabuWaitStart, { name: nameOf(view.explainer) }) }}</p>
      </template>

      <!-- During the round: explainer and the other team see the card -->
      <template v-else-if="shownCard">
        <div :class="[panel, 'p-6 text-center']">
          <p v-if="amWatcher" :class="['text-xs font-semibold uppercase tracking-wider mb-3', muted]">
            {{ fmt(t.tabuWatch, { name: nameOf(view.explainer) }) }}
          </p>
          <h3 class="text-3xl font-bold mb-6">{{ shownCard.word }}</h3>
          <div class="space-y-2">
            <div v-for="(word, index) in shownCard.taboo" :key="index" class="text-lg font-medium text-rose-500">
              {{ word }}
            </div>
          </div>
        </div>

        <div v-if="amExplainer" class="flex gap-4">
          <button
            @click="room.act('skip')"
            class="flex-1 px-6 py-4 rounded-lg font-semibold bg-rose-500 text-white hover:bg-rose-600 transition-colors"
          >
            {{ t.skip }}
          </button>
          <button
            @click="room.act('correct')"
            class="flex-1 px-6 py-4 rounded-lg font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
          >
            {{ t.correct }}
          </button>
        </div>
        <button
          v-else
          @click="room.act('taboo')"
          class="w-full px-6 py-4 rounded-lg font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
        >
          🚫 {{ t.tabuBuzz }}
        </button>
      </template>

      <!-- Guessers never get the card -->
      <div v-else :class="[panel, 'p-10 text-center space-y-2']">
        <div class="text-5xl">🤔</div>
        <p class="text-xl font-semibold">{{ fmt(t.tabuGuess, { name: nameOf(view.explainer) }) }}</p>
      </div>
    </div>

    <!-- Score Phase -->
    <div v-else-if="view.phase === 'score'" class="space-y-6 text-center">
      <h2 class="text-2xl font-bold">{{ t.gameOver }}</h2>

      <div class="grid grid-cols-2 gap-3">
        <div v-for="team in [0, 1]" :key="team" :class="[panel, 'p-6']">
          <h3 class="text-lg font-semibold mb-2">{{ teamName(team) }}</h3>
          <p class="text-3xl font-bold tabular-nums">{{ view.scores[team] }}</p>
        </div>
      </div>

      <div class="text-xl font-bold">{{ winnerText }}</div>

      <button v-if="room.isHost" @click="room.act('again')" :class="primary">{{ t.playAgain }}</button>
      <p v-else :class="['text-sm', muted]">{{ t.onlineWaitingHost }}</p>
    </div>
  </OnlineRoom>
</template>
