<script setup>
import { computed } from 'vue'
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

const ROUND_MS = 60000

// Card database: each card comes in every site language so the shown card follows each device's language
const cards = [
  { id: 'phone', TR: { word: 'TELEFON', taboo: ['ARAMAK', 'NUMARA', 'CEP', 'KONUŞMAK', 'MESAJ'] }, EN: { word: 'PHONE', taboo: ['CALL', 'NUMBER', 'MOBILE', 'TALK', 'TEXT'] }, RU: { word: 'ТЕЛЕФОН', taboo: ['ЗВОНИТЬ', 'НОМЕР', 'МОБИЛЬНЫЙ', 'ГОВОРИТЬ', 'СООБЩЕНИЕ'] }, KK: { word: 'ТЕЛЕФОН', taboo: ['ҚОҢЫРАУ', 'НӨМІР', 'ҰЯЛЫ', 'СӨЙЛЕСУ', 'ХАБАРЛАМА'] } },
  { id: 'coffee', TR: { word: 'KAHVE', taboo: ['İÇMEK', 'SICAK', 'FİNCAN', 'TÜRK', 'NESCAFE'] }, EN: { word: 'COFFEE', taboo: ['DRINK', 'HOT', 'CUP', 'CAFFEINE', 'MORNING'] }, RU: { word: 'КОФЕ', taboo: ['ПИТЬ', 'ГОРЯЧИЙ', 'ЧАШКА', 'КОФЕИН', 'УТРО'] }, KK: { word: 'КОФЕ', taboo: ['ІШУ', 'ЫСТЫҚ', 'КЕСЕ', 'КОФЕИН', 'ТАҢЕРТЕҢ'] } },
  { id: 'computer', TR: { word: 'BİLGİSAYAR', taboo: ['KLAVYE', 'MOUSE', 'EKRAN', 'İNTERNET', 'LAPTOP'] }, EN: { word: 'COMPUTER', taboo: ['KEYBOARD', 'MOUSE', 'SCREEN', 'INTERNET', 'LAPTOP'] }, RU: { word: 'КОМПЬЮТЕР', taboo: ['КЛАВИАТУРА', 'МЫШЬ', 'ЭКРАН', 'ИНТЕРНЕТ', 'НОУТБУК'] }, KK: { word: 'КОМПЬЮТЕР', taboo: ['ПЕРНЕТАҚТА', 'ТЫШҚАН', 'ЭКРАН', 'ИНТЕРНЕТ', 'НОУТБУК'] } },
  { id: 'football', TR: { word: 'FUTBOL', taboo: ['TOP', 'GOL', 'STADYUM', 'TAKIM', 'MAÇ'] }, EN: { word: 'FOOTBALL', taboo: ['BALL', 'GOAL', 'STADIUM', 'TEAM', 'MATCH'] }, RU: { word: 'ФУТБОЛ', taboo: ['МЯЧ', 'ГОЛ', 'СТАДИОН', 'КОМАНДА', 'МАТЧ'] }, KK: { word: 'ФУТБОЛ', taboo: ['ДОП', 'ГОЛ', 'СТАДИОН', 'КОМАНДА', 'МАТЧ'] } },
  { id: 'book', TR: { word: 'KİTAP', taboo: ['OKUMAK', 'SAYFA', 'YAZAR', 'ROMAN', 'KAPAK'] }, EN: { word: 'BOOK', taboo: ['READ', 'PAGE', 'AUTHOR', 'NOVEL', 'COVER'] }, RU: { word: 'КНИГА', taboo: ['ЧИТАТЬ', 'СТРАНИЦА', 'АВТОР', 'РОМАН', 'ОБЛОЖКА'] }, KK: { word: 'КІТАП', taboo: ['ОҚУ', 'БЕТ', 'АВТОР', 'РОМАН', 'МҰҚАБА'] } },
  { id: 'beach', TR: { word: 'PLAJ', taboo: ['DENİZ', 'KUM', 'GÜNEŞ', 'YÜZMEK', 'TATİL'] }, EN: { word: 'BEACH', taboo: ['SEA', 'SAND', 'SUN', 'SWIM', 'HOLIDAY'] }, RU: { word: 'ПЛЯЖ', taboo: ['МОРЕ', 'ПЕСОК', 'СОЛНЦЕ', 'ПЛАВАТЬ', 'ОТПУСК'] }, KK: { word: 'ЖАҒАЖАЙ', taboo: ['ТЕҢІЗ', 'ҚҰМ', 'КҮН', 'ЖҮЗУ', 'ДЕМАЛЫС'] } },
  { id: 'doctor', TR: { word: 'DOKTOR', taboo: ['HASTANE', 'HASTA', 'İLAÇ', 'REÇETE', 'MUAYENE'] }, EN: { word: 'DOCTOR', taboo: ['HOSPITAL', 'SICK', 'MEDICINE', 'PRESCRIPTION', 'NURSE'] }, RU: { word: 'ВРАЧ', taboo: ['БОЛЬНИЦА', 'БОЛЬНОЙ', 'ЛЕКАРСТВО', 'РЕЦЕПТ', 'МЕДСЕСТРА'] }, KK: { word: 'ДӘРІГЕР', taboo: ['АУРУХАНА', 'НАУҚАС', 'ДӘРІ', 'РЕЦЕПТ', 'МЕЙІРБИКЕ'] } },
  { id: 'cinema', TR: { word: 'SİNEMA', taboo: ['FİLM', 'SALON', 'BİLET', 'PATLAMIŞ MISIR', 'PERDE'] }, EN: { word: 'CINEMA', taboo: ['MOVIE', 'THEATER', 'TICKET', 'POPCORN', 'SCREEN'] }, RU: { word: 'КИНОТЕАТР', taboo: ['ФИЛЬМ', 'ЗАЛ', 'БИЛЕТ', 'ПОПКОРН', 'ЭКРАН'] }, KK: { word: 'КИНОТЕАТР', taboo: ['ФИЛЬМ', 'ЗАЛ', 'БИЛЕТ', 'ПОПКОРН', 'ЭКРАН'] } },
  { id: 'cake', TR: { word: 'PASTA', taboo: ['TATLI', 'KREMALI', 'DOĞUM GÜNÜ', 'ŞEKER', 'FIRIN'] }, EN: { word: 'CAKE', taboo: ['SWEET', 'CREAM', 'BIRTHDAY', 'SUGAR', 'BAKE'] }, RU: { word: 'ТОРТ', taboo: ['СЛАДКИЙ', 'КРЕМ', 'ДЕНЬ РОЖДЕНИЯ', 'САХАР', 'ПЕЧЬ'] }, KK: { word: 'ТОРТ', taboo: ['ТӘТТІ', 'КРЕМ', 'ТУҒАН КҮН', 'ҚАНТ', 'ПЕШ'] } },
  { id: 'car', TR: { word: 'ARABA', taboo: ['SÜRMEK', 'TEKERLEK', 'MOTOR', 'YOLCULUK', 'EHLİYET'] }, EN: { word: 'CAR', taboo: ['DRIVE', 'WHEEL', 'ENGINE', 'ROAD', 'LICENSE'] }, RU: { word: 'МАШИНА', taboo: ['ВОДИТЬ', 'КОЛЕСО', 'ДВИГАТЕЛЬ', 'ДОРОГА', 'ПРАВА'] }, KK: { word: 'КӨЛІК', taboo: ['ЖҮРГІЗУ', 'ДӨҢГЕЛЕК', 'ҚОЗҒАЛТҚЫШ', 'ЖОЛ', 'КУӘЛІК'] } }
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
  hostRoom: props.hostRoom,
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
const lang = computed(() => (props.t.langCode in cards[0] ? props.t.langCode : 'EN'))
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

const primary = 'term-btn term-btn-primary w-full min-h-14'
</script>

<template>
  <OnlineRoom
    :room="room"
    :t="t"
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
          <div v-for="team in [0, 1]" :key="team" :class="['term-panel p-3 space-y-2', { 'border-term': myTeam === team }]">
            <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <h2 class="font-display text-2xl leading-none uppercase whitespace-nowrap">{{ teamName(team) }}</h2>
              <button
                v-if="myTeam !== team"
                @click="room.act('setTeam', { team })"
                class="term-link text-xs"
              >
                [+] {{ t.tabuJoinTeam }}
              </button>
            </div>
            <ul class="space-y-1.5">
              <li
                v-for="player in membersOf(team)"
                :key="player.id"
                :class="['flex items-center gap-2 text-sm', { 'font-semibold': player.id === room.myId, 'opacity-40': !player.online }]"
              >
                <span :class="['term-dot', { 'is-off': !player.online }]"></span>
                <span class="truncate">{{ player.name }}</span>
              </li>
            </ul>
          </div>
        </div>
        <div v-if="room.isHost" class="text-center">
          <button @click="room.act('shuffleTeams')" class="term-link">
            <span aria-hidden="true">[~]</span>
            <span>{{ t.tabuShuffleTeams }}</span>
          </button>
        </div>
      </div>
    </template>

    <!-- Play Phase -->
    <div v-if="view.phase === 'play'" class="space-y-6">
      <!-- Scores -->
      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="team in [0, 1]"
          :key="team"
          :class="['px-4 py-2 flex items-center justify-between gap-2 border', team === view.currentTeam ? 'border-term bg-term-deep' : 'border-term-low']"
        >
          <span class="min-w-0">
            <span class="block text-sm font-semibold uppercase truncate">
              <span v-if="team === view.currentTeam" aria-hidden="true">&gt; </span>{{ teamName(team) }}
            </span>
            <span v-if="myTeam === team" class="block term-muted text-xs truncate">{{ t.tabuYourTeam }}</span>
          </span>
          <span class="font-display text-3xl leading-none tabular-nums">{{ view.scores[team] }}</span>
        </div>
      </div>

      <!-- Game Info -->
      <div class="flex justify-between items-center gap-4">
        <div class="min-w-0">
          <h2 class="font-display text-3xl leading-none uppercase">{{ teamName(view.currentTeam) }}</h2>
          <p class="text-sm mt-1">{{ fmt(t.tabuPlayerTurn, { name: nameOf(view.explainer) }) }}</p>
          <p class="term-muted text-xs mt-0.5">{{ fmt(t.tabuCardsLeft, { n: view.cardsLeft }) }}</p>
        </div>
        <div :class="['font-display text-6xl leading-none tabular-nums', { 'term-blink': view.playing && secondsLeft <= 10 }]">
          {{ formattedTime }}
        </div>
      </div>

      <!-- Before the round -->
      <template v-if="!view.playing">
        <div class="term-panel p-6 text-center text-lg">
          &gt; {{ amExplainer ? t.tabuYouExplain : fmt(t.tabuGetReady, { name: nameOf(view.explainer), team: teamName(view.currentTeam) }) }}
        </div>
        <button v-if="amExplainer || room.isHost" @click="room.act('startRound')" :class="primary">
          {{ t.startRound }}
        </button>
        <p v-else class="term-muted text-center text-sm"><span class="term-cursor">{{ fmt(t.tabuWaitStart, { name: nameOf(view.explainer) }) }}</span></p>
      </template>

      <!-- During the round: explainer and the other team see the card -->
      <template v-else-if="shownCard">
        <div class="term-window p-6 text-center">
          <p v-if="amWatcher" class="term-label mb-3">
            {{ fmt(t.tabuWatch, { name: nameOf(view.explainer) }) }}
          </p>
          <h3 class="font-display text-6xl leading-none mb-5 break-words">{{ shownCard.word }}</h3>
          <div class="border-t border-dashed border-term-low pt-4 space-y-1.5">
            <div v-for="(word, index) in shownCard.taboo" :key="index" class="text-lg font-medium">
              <span class="term-muted" aria-hidden="true">[x] </span>{{ word }}
            </div>
          </div>
        </div>

        <div v-if="amExplainer" class="grid grid-cols-2 gap-4">
          <button @click="room.act('skip')" class="term-btn min-h-14">
            {{ t.skip }}
          </button>
          <button @click="room.act('correct')" class="term-btn term-btn-primary min-h-14">
            {{ t.correct }}
          </button>
        </div>
        <button v-else @click="room.act('taboo')" class="term-btn term-btn-primary w-full min-h-14 text-lg">
          {{ t.tabuBuzz }}
        </button>
      </template>

      <!-- Guessers never get the card -->
      <div v-else class="term-panel p-10 text-center space-y-3">
        <div class="font-display text-7xl leading-none term-blink" aria-hidden="true">???</div>
        <p class="text-xl font-semibold">{{ fmt(t.tabuGuess, { name: nameOf(view.explainer) }) }}</p>
      </div>
    </div>

    <!-- Score Phase -->
    <div v-else-if="view.phase === 'score'" class="space-y-6 text-center">
      <h2 class="font-display text-5xl leading-none uppercase">{{ t.gameOver }}</h2>

      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="team in [0, 1]"
          :key="team"
          :class="['p-6 border', view.scores[team] > view.scores[1 - team] ? 'term-inverse border-term' : 'border-term-low']"
        >
          <h3 class="text-sm font-semibold uppercase tracking-wider mb-2">{{ teamName(team) }}</h3>
          <p class="font-display text-6xl leading-none tabular-nums">{{ view.scores[team] }}</p>
        </div>
      </div>

      <div class="text-xl font-bold">&gt; {{ winnerText }}</div>

      <button v-if="room.isHost" @click="room.act('again')" :class="primary">{{ t.playAgain }}</button>
      <p v-else class="term-muted text-sm"><span class="term-cursor">{{ t.onlineWaitingHost }}</span></p>
    </div>
  </OnlineRoom>
</template>
