<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import LanguageMenu from './components/LanguageMenu.vue'
import TermWindow from './components/TermWindow.vue'
import GameMenu from './views/GameMenu.vue'
import UsersView from './views/UsersView.vue'
// import WordleGame from './games/WordleGame.vue' // under development
import NumberGuessingGame from './games/NumberGuessingGame.vue'
import BottleSpinGame from './games/BottleSpinGame.vue'
import CasusKimGame from './games/CasusKimGame.vue'
import TabuGame from './games/TabuGame.vue'
import QuizRaceGame from './games/QuizRaceGame.vue'
import FlappyGame from './games/FlappyGame.vue'
import TankGame from './games/TankGame.vue'
import FutsalGame from './games/FutsalGame.vue'
import DoodleGame from './games/DoodleGame.vue'
import SudokuGame from './games/SudokuGame.vue'
import { translations } from './translations'
import { rules, rulesLabels } from './rules'
import { cardArt } from './cardArt'
import { useUsers } from './online/useUsers'
import { currentRoom } from './online/useOnlineRoom'

// The language menu lists every language in translations.js, each by its own name
const languages = Object.entries(translations).map(([code, text]) => ({ code, name: text.languageName }))

// Initialize language from localStorage or default to 'EN'
const savedLang = localStorage.getItem('preferredLanguage')
const currentLang = ref(Object.hasOwn(translations, savedLang ?? '') ? savedLang : 'EN')

// Translation helper: anything a language doesn't have yet shows in English
const t = computed(() => ({ ...translations.EN, ...translations[currentLang.value] }))

// Persist language preference; the page language also makes uppercase text correct in Turkish
watch(currentLang, (newLang) => {
  localStorage.setItem('preferredLanguage', newLang)
  document.documentElement.lang = newLang.toLowerCase()
}, { immediate: true })

const minutes = (n) => t.value.cardMinutes.replace('{n}', n)

// Menu cards: `players`, `duration` and `mode` fill the info side of each card, and
// `soon` marks games that still open the Coming Soon screen
const games = computed(() => [
  {
    id: 'flappy',
    category: ['solo', 'online', 'party'],
    title: t.value.flappyTitle,
    description: t.value.flappyDesc,
    icon: '[^]',
    art: cardArt.flappy,
    players: '1+',
    duration: minutes('1–5'),
    mode: t.value.cardModeSoloOnline
  },
  {
    id: 'tanks',
    category: ['online', 'party'],
    title: t.value.tankTitle,
    description: t.value.tankDesc,
    icon: '[T]',
    art: cardArt.tanks,
    players: '2–8',
    duration: minutes('2–5'),
    mode: t.value.cardModeOnline
  },
  {
    id: 'futsal',
    category: ['solo', 'online', 'party'],
    title: t.value.futsalTitle,
    description: t.value.futsalDesc,
    icon: '[o]',
    art: cardArt.futsal,
    players: '1–10',
    duration: minutes('3–8'),
    mode: t.value.cardModeSoloOnline
  },
  {
    id: 'doodle',
    category: ['online', 'party'],
    title: t.value.doodleTitle,
    description: t.value.doodleDesc,
    icon: '[/]',
    art: cardArt.doodle,
    players: '2–10',
    duration: minutes('10–20'),
    mode: t.value.cardModeOnline
  },
  {
    id: 'sudoku',
    category: ['solo', 'online'],
    title: t.value.sudokuTitle,
    description: t.value.sudokuDesc,
    icon: '[9]',
    art: cardArt.sudoku,
    players: '1–4',
    duration: minutes('5–30'),
    mode: t.value.cardModeSoloOnline
  },
  {
    id: 'quiz-race',
    category: ['online', 'party'],
    title: t.value.quizTitle,
    description: t.value.quizDesc,
    icon: '[?]',
    art: cardArt['quiz-race'],
    players: '1–10',
    duration: minutes('5–10'),
    mode: t.value.cardModeOnline
  },
  {
    id: 'number-guess',
    category: 'solo',
    title: t.value.numberGuessTitle,
    description: t.value.numberGuessDesc,
    icon: '[#]',
    art: cardArt['number-guess'],
    players: '1',
    duration: minutes('1–3'),
    mode: t.value.cardModeSolo
  },
  {
    id: 'wordle',
    category: 'solo',
    title: t.value.wordleTitle,
    description: t.value.wordleDesc,
    icon: '[W]',
    art: cardArt.wordle,
    players: '1',
    duration: minutes('2–5'),
    mode: t.value.cardModeSolo,
    soon: true
  },
  {
    id: 'bottle-spin',
    category: 'party',
    title: t.value.bottleTitle,
    description: t.value.bottleDesc,
    icon: '[@]',
    art: cardArt['bottle-spin'],
    players: '2+',
    duration: t.value.cardUnlimited,
    mode: t.value.cardModeOnePhone
  },
  {
    id: 'casus-kim',
    category: ['online', 'party'],
    title: t.value.casusTitle,
    description: t.value.casusDesc,
    icon: '[*]',
    art: cardArt['casus-kim'],
    players: '3–12',
    duration: minutes('5–10'),
    mode: t.value.cardModeOnline
  },
  {
    id: 'tabu',
    category: ['online', 'party'],
    title: t.value.tabuTitle,
    description: t.value.tabuDesc,
    icon: '[!]',
    art: cardArt.tabu,
    players: '2+',
    duration: t.value.cardPerTurn,
    mode: t.value.cardModeOnline
  },
  {
    id: 'coming-soon-1',
    category: 'solo',
    title: t.value.memoryMatchTitle,
    description: t.value.comingSoonDesc,
    icon: '[=]',
    art: cardArt['coming-soon-1'],
    players: '1',
    duration: '—',
    mode: t.value.cardModeSolo,
    soon: true
  },
  {
    id: 'coming-soon-2',
    category: 'solo',
    title: t.value.wordPuzzleTitle,
    description: t.value.comingSoonDesc,
    icon: '[A]',
    art: cardArt['coming-soon-2'],
    players: '1',
    duration: '—',
    mode: t.value.cardModeSolo,
    soon: true
  }
])

// ---------- URL routing ----------
// /            menu, all games
// /party       menu, one category (also /online and /solo)
// /quiz-race   a game, by its id
// /users       a page that isn't a game: everyone online
// Unknown paths fall back to the menu. Firebase serves index.html for every path.

const CATEGORY_KEYS = ['all', 'party', 'online', 'solo']
const GAME_IDS = games.value.map(game => game.id)
const PAGES = ['users']

const parsePath = (pathname) => {
  const slug = decodeURIComponent(pathname).replace(/^\/+|\/+$/g, '').toLowerCase()
  if (GAME_IDS.includes(slug)) return { category: null, game: slug }
  if (PAGES.includes(slug)) return { category: null, game: null, page: slug }
  if (CATEGORY_KEYS.includes(slug) && slug !== 'all') return { category: slug, game: null }
  return { category: 'all', game: null }
}

const categoryPath = (key) => (key === 'all' ? '/' : `/${key}`)

// An invite link (/quiz-race?join=CODE) opens that online game with the room code filled in.
// Older links used /?join=CODE&game=quiz-race.
const ONLINE_GAMES = ['flappy', 'tanks', 'futsal', 'doodle', 'sudoku', 'quiz-race', 'casus-kim', 'tabu']
const inviteParams = new URLSearchParams(window.location.search)
const initialRoute = parsePath(window.location.pathname)
const legacyInviteGame = ONLINE_GAMES.includes(inviteParams.get('game')) ? inviteParams.get('game') : null
const inviteGame = legacyInviteGame || (ONLINE_GAMES.includes(initialRoute.game) ? initialRoute.game : null)
const inviteCode = inviteGame ? (inviteParams.get('join') || '') : ''
if (legacyInviteGame) initialRoute.game = legacyInviteGame

const selectedGame = ref(initialRoute.game)
const page = ref(initialRoute.page || null)
// An online game can open with a room in mind: { game, code } to join one (an invite link or a
// chat invite), or { game, host: true } to open one for a chat invite. It only applies to that
// game, until the visitor leaves it.
const launch = ref(inviteCode ? { game: inviteGame, code: inviteCode } : null)
// Bumped by every launch from the chat, so a game that's already open starts over
const launches = ref(0)
const inviteCodeFor = (gameId) => (launch.value?.game === gameId ? launch.value.code || '' : '')
const hostRoomFor = (gameId) => launch.value?.game === gameId && !!launch.value.host
const showRules = ref(false)

// The dev Firebase site (apps-76619-dev.web.app) and the local dev server get a DEV mark
// so they can't be mistaken for the live site
const isDevSite = import.meta.env.DEV || window.location.hostname.includes('-dev.')

// The shell prompt shows the visitor's public IPv4 address as the user name. The site has no
// server of its own, so a public lookup service is asked once per browser session; until it
// answers, or if it's blocked, the visitor stays "guest".
const IP_KEY = 'publicIp'
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/

const visitor = ref((() => {
  try {
    return sessionStorage.getItem(IP_KEY) || 'guest'
  } catch {
    return 'guest'
  }
})())

async function lookUpIp () {
  if (visitor.value !== 'guest') return
  try {
    const response = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout?.(5000) })
    const { ip } = await response.json()
    if (!IPV4.test(ip)) return
    visitor.value = ip
    sessionStorage.setItem(IP_KEY, ip)
  } catch {
    // Offline, blocked or no IPv4 address: stay "guest"
  }
}

// ---------- Online users ----------
// Every visitor shows up on the Users page, whichever page they're on, and can be messaged and
// invited to online games there. A message whose chat isn't on screen pops up at the bottom for
// a few seconds.

const TOAST_MS = 7000

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const gameTitle = (id) => games.value.find(game => game.id === id)?.title || id
const personName = (person) => person.ip || t.value.usersGuest
// What the chat's game picker offers
const onlineGames = computed(() => ONLINE_GAMES.map(id => games.value.find(game => game.id === id)))

const users = useUsers({ ip: visitor, space: isDevSite ? 'dev' : 'live', games: ONLINE_GAMES, onMessage: onChatMessage })
const selectedUser = ref(null)
// { id, title, text, hint, run }: id is the person it's about, run what clicking it does, if anything
const toast = ref(null)
let toastTimer = null

function showToast (next) {
  toast.value = next
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, TOAST_MS)
}

function onChatMessage (person, { text, invite }) {
  if (users.active === person.id) return
  const name = personName(person)
  if (invite) {
    showToast({
      id: person.id,
      title: fmt(t.value.usersInviteFrom, { name }),
      text: `${gameTitle(invite.game)} · ${t.value.onlineRoomLabel}: ${invite.code}`,
      hint: t.value.onlineJoin,
      run: () => joinGame(invite)
    })
    return
  }
  // Opening the chat leaves the page, and with it any online room this tab is in
  const inRoom = !!currentRoom.value
  showToast({
    id: person.id,
    title: fmt(t.value.usersNewMessage, { name }),
    text,
    hint: inRoom ? t.value.usersReplyLater : t.value.usersOpenChat,
    run: inRoom ? null : () => openChat(person.id)
  })
}

const openChat = (id) => {
  toast.value = null
  selectedUser.value = id
  navigate('/users')
}

// Messages from whoever is picked count as read only while the Users page is open
watch([page, selectedUser], () => {
  users.active = page.value === 'users' ? selectedUser.value : null
}, { immediate: true })

// ---------- Game invites ----------
// Inviting someone opens a room in that game on this device, and the invite with the room code
// goes out as soon as the room is open. Joining opens the game with the code filled in.

const inviting = ref(null) // { to, game } until the room is open

function launchGame (next) {
  launch.value = next
  launches.value++
  navigate(`/${next.game}`)
}

function inviteToGame ({ to, game }) {
  const person = users.people.get(to)
  if (!person || !ONLINE_GAMES.includes(game)) return
  inviting.value = { to, game }
  launchGame({ game, host: true })
  showToast({ id: to, title: fmt(t.value.usersInviteWaiting, { name: personName(person) }), text: gameTitle(game) })
}

function joinGame ({ game, code }) {
  if (!ONLINE_GAMES.includes(game)) return
  toast.value = null
  launchGame({ game, code })
}

watch(currentRoom, async (room) => {
  const pending = inviting.value
  if (!room?.isHost || room.game !== pending?.game) return
  inviting.value = null
  const person = users.people.get(pending.to)
  if (person && await users.sendInvite(pending.to, room.game, room.code)) {
    showToast({
      id: pending.to,
      title: fmt(t.value.usersInviteSent, { name: personName(person) }),
      text: `${gameTitle(room.game)} · ${t.value.onlineRoomLabel}: ${room.code}`
    })
  }
})

// Menu card turned over to its info side
const flippedGame = ref(null)

// Nav bar categories
const selectedCategory = ref(initialRoute.category || 'all')

// Show the canonical address for where we landed: drops the invite query and unknown paths
window.history.replaceState(
  { inApp: false },
  '',
  initialRoute.game || initialRoute.page ? `/${initialRoute.game || initialRoute.page}` : categoryPath(selectedCategory.value)
)

const applyRoute = ({ category, game, page: pageName }) => {
  if (category) selectedCategory.value = category
  selectedGame.value = game
  page.value = pageName || null
  // A launch, and an invite waiting for its room, only last while their game is open
  if (launch.value?.game !== game) launch.value = null
  if (inviting.value?.game !== game) inviting.value = null
  showRules.value = false
  flippedGame.value = null
}

const navigate = (path) => {
  if (path === window.location.pathname) return
  // inApp marks entries opened from inside the app, so a game's Back can use history.back()
  window.history.pushState({ inApp: true }, '', path)
  applyRoute(parsePath(path))
  window.scrollTo({ top: 0 })
}

const openGame = (id) => navigate(`/${id}`)

// A game's Back goes to the list it was opened from; on a direct link, to that game's menu
const closeGame = () => {
  if (window.history.state?.inApp) window.history.back()
  else navigate(categoryPath(selectedCategory.value))
}

const onPopState = () => {
  applyRoute(parsePath(window.location.pathname))
  window.scrollTo({ top: 0 })
}

const categories = computed(() => [
  { key: 'all', label: t.value.navAll },
  { key: 'party', label: t.value.navParty },
  { key: 'online', label: t.value.navOnline },
  { key: 'solo', label: t.value.navSolo }
])

// A game can belong to more than one category
const categoriesOf = (game) => [].concat(game.category)

// Inside a game, highlight the category that game belongs to: the open list when it's one of them.
// A page of its own (Users) has its own tab instead.
const activeCategory = computed(() => {
  if (page.value) return null
  if (!selectedGame.value) return selectedCategory.value
  const game = games.value.find(item => item.id === selectedGame.value)
  if (!game) return selectedCategory.value
  const list = categoriesOf(game)
  return list.includes(selectedCategory.value) ? selectedCategory.value : list[0]
})

// On a phone the tabs scroll sideways: keep the active one in view, e.g. Users at the far end,
// also when the labels change length with the language
watch([activeCategory, page, currentLang], () => {
  document.querySelector('nav li [aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}, { flush: 'post' })

const filteredGames = computed(() =>
  selectedCategory.value === 'all'
    ? games.value
    : games.value.filter(game => categoriesOf(game).includes(selectedCategory.value))
)

const selectedGameTitle = computed(() => games.value.find(game => game.id === selectedGame.value)?.title || '')

// The shell prompt in the nav doubles as a breadcrumb: ~, ~/party, ~/party/tabu.
// Every part but the last is a link to that level.
const crumbs = computed(() => {
  const list = [{ text: '~', path: '/', label: t.value.crumbHome }]
  if (activeCategory.value && activeCategory.value !== 'all') {
    const category = categories.value.find(item => item.key === activeCategory.value)
    list.push({ text: activeCategory.value, path: categoryPath(activeCategory.value), label: category?.label })
  }
  if (selectedGame.value || page.value) list.push({ text: selectedGame.value || page.value })
  return list.map((crumb, index) => (index === list.length - 1 ? { ...crumb, path: null } : crumb))
})

const selectCategory = (key) => navigate(categoryPath(key))

// Tab title follows the page, with the number of unread chat messages in front
const pageTitle = computed(() => (page.value === 'users' ? t.value.usersTitle : selectedGameTitle.value))

watch([pageTitle, () => users.unread], () => {
  let title = pageTitle.value ? `${pageTitle.value} | Games & Tools` : 'Games & Tools'
  if (users.unread) title = `(${users.unread}) ${title}`
  document.title = isDevSite ? `[DEV] ${title}` : title
}, { immediate: true })

const currentRules = computed(() => {
  const entry = rules[selectedGame.value || page.value] || rules.menu
  return entry[currentLang.value] || entry.EN
})
const rulesText = computed(() => rulesLabels[currentLang.value] || rulesLabels.EN)

// Same tile styles as Wordle: inverted = right spot, dashed = wrong spot, faint = not in word
const legendStyles = {
  green: 'term-inverse',
  yellow: 'border border-dashed border-term',
  gray: 'border border-term-low text-term-low'
}

const isTyping = (target) => !!target.closest?.('input, textarea, select, [contenteditable="true"]')

// Esc climbs one level: game or page -> its list, category -> all. Online games ignore it,
// since leaving would drop the player out of the room, and so does a full-screen arcade game,
// which uses it to pause.
const goUp = () => {
  if ('arcade' in document.body.dataset) return
  if (selectedGame.value) {
    if (!ONLINE_GAMES.includes(selectedGame.value)) closeGame()
  } else if (page.value) {
    closeGame()
  } else if (selectedCategory.value !== 'all') {
    navigate('/')
  }
}

const onKeydown = (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return

  if (e.key === 'Escape') {
    if (showRules.value) showRules.value = false
    else if (flippedGame.value) flippedGame.value = null
    else if (!isTyping(e.target)) goUp()
    return
  }

  // 1-9 on the menu opens the game on that card
  if (selectedGame.value || page.value || showRules.value || isTyping(e.target)) return
  const game = /^[1-9]$/.test(e.key) && filteredGames.value[Number(e.key) - 1]
  if (game) openGame(game.id)
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('popstate', onPopState)
  lookUpIp()
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('popstate', onPopState)
})
</script>

<template>
  <div class="crt min-h-screen bg-black text-term font-mono">
    <nav :aria-label="t.navLabel" class="sticky top-0 z-30 bg-black/90 border-b border-term-low">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex flex-wrap md:flex-nowrap items-center gap-x-6 gap-y-3">
        <span v-if="isDevSite" class="order-1 -mr-3 term-inverse px-1.5 text-xs font-bold tracking-widest" title="Development site">DEV</span>

        <!-- Shell prompt -->
        <p class="order-1 flex-1 basis-0 md:flex-none md:basis-auto min-w-0 truncate text-sm font-semibold">
          <span aria-hidden="true"><span class="term-muted">{{ visitor }}@apps</span>:</span>
          <template v-for="(crumb, index) in crumbs" :key="crumb.text">
            <span v-if="index" aria-hidden="true">/</span>
            <button v-if="crumb.path" type="button" class="term-crumb" :aria-label="crumb.label" @click="navigate(crumb.path)">{{ crumb.text }}</button>
            <span v-else aria-current="page">{{ crumb.text }}</span>
          </template>
          <span class="term-cursor" aria-hidden="true">$</span>
        </p>

        <!-- Category items: own scrollable row on phones, middle on desktop -->
        <ul class="order-3 md:order-2 w-full md:w-auto md:flex-1 flex gap-1 overflow-x-auto no-scrollbar">
          <li v-for="category in categories" :key="category.key" class="shrink-0">
            <button
              @click="selectCategory(category.key)"
              :aria-current="activeCategory === category.key ? 'page' : undefined"
              :class="['term-tab px-2 sm:px-3 text-xs sm:text-sm', { 'is-active': activeCategory === category.key }]"
            >
              <span aria-hidden="true">{{ activeCategory === category.key ? '(*)' : '( )' }}</span>
              <span>{{ category.label }}</span>
            </button>
          </li>
          <li class="shrink-0 flex items-center px-1 text-term-low" aria-hidden="true">|</li>
          <li class="shrink-0">
            <button
              @click="navigate('/users')"
              :aria-current="page === 'users' ? 'page' : undefined"
              :class="['term-tab px-2 sm:px-3 text-xs sm:text-sm', { 'is-active': page === 'users' }]"
            >
              <span aria-hidden="true">{{ page === 'users' ? '(*)' : '( )' }}</span>
              <span>{{ t.navUsers }}</span>
              <span class="tabular-nums">[{{ users.online ? users.list.length : '-' }}]</span>
              <span v-if="users.unread" :class="['px-1 tabular-nums', page === 'users' ? 'bg-black text-term' : 'term-inverse']">
                <span aria-hidden="true">{{ users.unread }}</span>
                <span class="sr-only">{{ t.usersUnread.replace('{n}', users.unread) }}</span>
              </span>
            </button>
          </li>
        </ul>

        <div class="order-2 md:order-3 ml-auto flex items-center gap-2">
          <button
            @click="showRules = true"
            class="term-icon-btn"
            :aria-label="t.gameRules"
            :title="t.gameRules"
          >
            [?]
          </button>
          <LanguageMenu
            :currentLang="currentLang"
            :languages="languages"
            :label="t.languageMenu"
            @select="currentLang = $event"
          />
        </div>
      </div>
    </nav>

    <div :key="launches" class="px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10 max-w-7xl mx-auto">
      <UsersView
        v-if="page === 'users'"
        v-model:selected="selectedUser"
        :users="users"
        :games="onlineGames"
        :t="t"
        @back="closeGame"
        @invite="inviteToGame"
        @join="joinGame"
      />

      <GameMenu
        v-else-if="!selectedGame"
        v-model:flipped="flippedGame"
        :games="filteredGames"
        :t="t"
        @select-game="openGame"
      />

      <FlappyGame
        v-else-if="selectedGame === 'flappy'"
        :t="t"
        :initialCode="inviteCodeFor('flappy')"
        :hostRoom="hostRoomFor('flappy')"
        @go-back="closeGame"
      />

      <TankGame
        v-else-if="selectedGame === 'tanks'"
        :t="t"
        :initialCode="inviteCodeFor('tanks')"
        :hostRoom="hostRoomFor('tanks')"
        @go-back="closeGame"
      />

      <FutsalGame
        v-else-if="selectedGame === 'futsal'"
        :t="t"
        :initialCode="inviteCodeFor('futsal')"
        :hostRoom="hostRoomFor('futsal')"
        @go-back="closeGame"
      />

      <DoodleGame
        v-else-if="selectedGame === 'doodle'"
        :t="t"
        :initialCode="inviteCodeFor('doodle')"
        :hostRoom="hostRoomFor('doodle')"
        @go-back="closeGame"
      />

      <SudokuGame
        v-else-if="selectedGame === 'sudoku'"
        :t="t"
        :initialCode="inviteCodeFor('sudoku')"
        :hostRoom="hostRoomFor('sudoku')"
        @go-back="closeGame"
      />

      <QuizRaceGame
        v-else-if="selectedGame === 'quiz-race'"
        :t="t"
        :initialCode="inviteCodeFor('quiz-race')"
        :hostRoom="hostRoomFor('quiz-race')"
        @go-back="closeGame"
      />

      <NumberGuessingGame
        v-else-if="selectedGame === 'number-guess'"
        :t="t"
        @go-back="closeGame"
      />

      <!-- Wordle is under development: re-enable this block to restore the game
      <WordleGame
        v-else-if="selectedGame === 'wordle'"
        :t="t"
        @go-back="closeGame"
      />
      -->

      <BottleSpinGame
        v-else-if="selectedGame === 'bottle-spin'"
        :t="t"
        @go-back="closeGame"
      />

      <CasusKimGame
        v-else-if="selectedGame === 'casus-kim'"
        :t="t"
        :initialCode="inviteCodeFor('casus-kim')"
        :hostRoom="hostRoomFor('casus-kim')"
        @go-back="closeGame"
      />

      <TabuGame
        v-else-if="selectedGame === 'tabu'"
        :t="t"
        :initialCode="inviteCodeFor('tabu')"
        :hostRoom="hostRoomFor('tabu')"
        @go-back="closeGame"
      />

      <!-- Placeholder for other games -->
      <TermWindow v-else class="max-w-lg" :title="selectedGameTitle" :backLabel="t.back" @back="closeGame">
        <template #status>
          <span class="term-chip">beta</span>
        </template>

        <div class="text-center">
          <p class="font-display text-6xl leading-none term-blink mb-4" aria-hidden="true">/!\</p>
          <h2 class="font-display text-4xl leading-none uppercase mb-3">{{ t.comingSoon }}</h2>
          <p class="term-muted text-sm leading-relaxed max-w-md mx-auto">
            {{ t.comingSoonDesc }}
          </p>

          <div class="term-panel mt-6 p-4 text-left">
            <p class="term-label mb-2">{{ t.comingSoonStatus }}</p>
            <p class="text-sm leading-relaxed">&gt; {{ t.comingSoonStatusText }}</p>
          </div>
        </div>
      </TermWindow>
    </div>

    <Transition name="rules">
      <div
        v-if="showRules"
        class="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4"
        @click.self="showRules = false"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rules-title"
          class="rules-panel term-window w-full sm:max-w-lg max-h-[90vh] flex flex-col"
        >
          <div class="relative px-5 pt-5 pb-4 border-b border-term-low">
            <button
              @click="showRules = false"
              class="term-icon-btn absolute top-3 right-3"
              :aria-label="rulesText.close"
            >
              [x]
            </button>

            <div class="flex items-center gap-4 pr-12">
              <div class="h-12 w-12 shrink-0 border border-term flex items-center justify-center font-display text-2xl" aria-hidden="true">
                {{ currentRules.icon }}
              </div>
              <div class="min-w-0">
                <h2 id="rules-title" class="font-display text-3xl leading-none uppercase">
                  {{ currentRules.title }}
                </h2>
                <div v-if="currentRules.players || currentRules.duration" class="mt-2 flex flex-wrap gap-2">
                  <span
                    v-for="chip in [currentRules.players, currentRules.duration].filter(Boolean)"
                    :key="chip"
                    class="term-chip"
                  >
                    {{ chip }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="overflow-y-auto px-5 py-5 space-y-6">
            <div class="border-l-2 border-term pl-4 py-1">
              <p class="term-label mb-1">{{ rulesText.goal }}</p>
              <p class="leading-relaxed">{{ currentRules.goal }}</p>
            </div>

            <section>
              <h3 class="term-label mb-3">
                {{ rulesText.howToPlay }}
              </h3>
              <ol class="space-y-3">
                <li
                  v-for="(step, index) in currentRules.steps"
                  :key="index"
                  class="flex gap-3 items-start"
                >
                  <span class="shrink-0 term-muted tabular-nums">{{ String(index + 1).padStart(2, '0') }}.</span>
                  <span class="leading-relaxed">{{ step }}</span>
                </li>
              </ol>
            </section>

            <div v-if="currentRules.legend" class="grid gap-2">
              <div
                v-for="item in currentRules.legend"
                :key="item.color"
                class="flex items-center gap-3"
              >
                <span :class="['h-8 w-8 shrink-0 flex items-center justify-center font-bold', legendStyles[item.color]]">A</span>
                <span class="text-sm">{{ item.text }}</span>
              </div>
            </div>

            <section v-if="currentRules.tips?.length">
              <h3 class="term-label mb-3">
                {{ rulesText.tips }}
              </h3>
              <ul class="space-y-2">
                <li
                  v-for="(tip, index) in currentRules.tips"
                  :key="index"
                  class="flex gap-3 items-start border border-dashed border-term-low p-3 text-sm"
                >
                  <span class="shrink-0" aria-hidden="true">[i]</span>
                  <span class="leading-relaxed term-muted">{{ tip }}</span>
                </li>
              </ul>
            </section>
          </div>

          <div class="px-5 py-4 border-t border-term-low">
            <button @click="showRules = false" class="term-btn term-btn-primary w-full">
              {{ rulesText.gotIt }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- A chat message or game invite from someone whose chat isn't on screen, or how an invite is going -->
    <Transition name="toast">
      <div
        v-if="toast && users.people.has(toast.id)"
        role="status"
        class="term-window fixed z-30 bottom-4 left-4 right-4 sm:left-auto sm:w-96 flex items-start gap-2 p-3"
      >
        <component
          :is="toast.run ? 'button' : 'div'"
          :type="toast.run ? 'button' : undefined"
          class="flex-1 min-w-0 text-left"
          @click="toast.run?.()"
        >
          <span class="term-label block">[&gt;] {{ toast.title }}</span>
          <span class="block truncate mt-1">{{ toast.text }}</span>
          <span v-if="toast.hint" class="block text-xs term-muted mt-1 uppercase tracking-wider">{{ toast.hint }}</span>
        </component>
        <button type="button" class="term-icon-btn shrink-0 h-8 min-w-8" :aria-label="t.usersDismiss" @click="toast = null">
          [x]
        </button>
      </div>
    </Transition>
  </div>
</template>

<style>
/* Rules dialog: the backdrop fades while the panel switches on like a CRT */
.rules-enter-active,
.rules-leave-active {
  transition: opacity 0.18s ease;
}
.rules-enter-from,
.rules-leave-to {
  opacity: 0;
}
.rules-enter-active .rules-panel {
  animation: crt-on 0.22s ease-out;
}
.rules-leave-active .rules-panel {
  animation: crt-off 0.16s ease-in forwards;
}

@keyframes crt-on {
  0% { transform: scale(1, 0.01); filter: brightness(3); }
  60% { transform: scale(1, 1.03); filter: brightness(1.4); }
  100% { transform: none; filter: none; }
}
@keyframes crt-off {
  0% { transform: none; }
  60% { transform: scale(1, 0.01); filter: brightness(3); }
  100% { transform: scale(0, 0.01); }
}

/* Chat message pop-up: slides up from the bottom edge */
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(1rem);
}

@media (prefers-reduced-motion: reduce) {
  .rules-enter-active .rules-panel,
  .rules-leave-active .rules-panel {
    animation: none;
  }
  .toast-enter-active,
  .toast-leave-active {
    transition: opacity 0.18s ease;
  }
  .toast-enter-from,
  .toast-leave-to {
    transform: none;
  }
}

/* Horizontally scrollable nav items without a visible scrollbar */
.no-scrollbar {
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
