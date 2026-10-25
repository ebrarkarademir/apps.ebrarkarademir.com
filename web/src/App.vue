<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import LanguageToggle from './components/LanguageToggle.vue'
import TermWindow from './components/TermWindow.vue'
import GameMenu from './views/GameMenu.vue'
// import WordleGame from './games/WordleGame.vue' // under development
import NumberGuessingGame from './games/NumberGuessingGame.vue'
import BottleSpinGame from './games/BottleSpinGame.vue'
import CasusKimGame from './games/CasusKimGame.vue'
import TabuGame from './games/TabuGame.vue'
import QuizRaceGame from './games/QuizRaceGame.vue'
import { translations } from './translations'
import { rules, rulesLabels } from './rules'

// Initialize language from localStorage or default to 'EN'
const currentLang = ref(localStorage.getItem('preferredLanguage') || 'EN')

// Translation helper
const t = computed(() => translations[currentLang.value])

// Persist language preference; the page language also makes uppercase text correct in Turkish
watch(currentLang, (newLang) => {
  localStorage.setItem('preferredLanguage', newLang)
  document.documentElement.lang = newLang.toLowerCase()
}, { immediate: true })

const games = computed(() => [
  {
    id: 'quiz-race',
    category: 'party',
    title: t.value.quizTitle,
    description: t.value.quizDesc,
    icon: '[?]'
  },
  {
    id: 'number-guess',
    category: 'solo',
    title: t.value.numberGuessTitle,
    description: t.value.numberGuessDesc,
    icon: '[#]'
  },
  {
    id: 'wordle',
    category: 'solo',
    title: t.value.wordleTitle,
    description: t.value.wordleDesc,
    icon: '[W]'
  },
  {
    id: 'bottle-spin',
    category: 'party',
    title: t.value.bottleTitle,
    description: t.value.bottleDesc,
    icon: '[@]'
  },
  {
    id: 'casus-kim',
    category: 'party',
    title: t.value.casusTitle,
    description: t.value.casusDesc,
    icon: '[*]'
  },
  {
    id: 'tabu',
    category: 'party',
    title: t.value.tabuTitle,
    description: t.value.tabuDesc,
    icon: '[!]'
  },
  {
    id: 'coming-soon-1',
    category: 'solo',
    title: t.value.memoryMatchTitle,
    description: t.value.comingSoonDesc,
    icon: '[=]'
  },
  {
    id: 'coming-soon-2',
    category: 'solo',
    title: t.value.wordPuzzleTitle,
    description: t.value.comingSoonDesc,
    icon: '[A]'
  }
])

// ---------- URL routing ----------
// /            menu, all games
// /party       menu, one category (also /solo)
// /quiz-race   a game, by its id
// Unknown paths fall back to the menu. Firebase serves index.html for every path.

const CATEGORY_KEYS = ['all', 'party', 'solo']
const GAME_IDS = games.value.map(game => game.id)

const parsePath = (pathname) => {
  const slug = decodeURIComponent(pathname).replace(/^\/+|\/+$/g, '').toLowerCase()
  if (GAME_IDS.includes(slug)) return { category: null, game: slug }
  if (CATEGORY_KEYS.includes(slug) && slug !== 'all') return { category: slug, game: null }
  return { category: 'all', game: null }
}

const categoryPath = (key) => (key === 'all' ? '/' : `/${key}`)

// An invite link (/quiz-race?join=CODE) opens that online game with the room code filled in.
// Older links used /?join=CODE&game=quiz-race.
const ONLINE_GAMES = ['quiz-race', 'casus-kim', 'tabu']
const inviteParams = new URLSearchParams(window.location.search)
const initialRoute = parsePath(window.location.pathname)
const legacyInviteGame = ONLINE_GAMES.includes(inviteParams.get('game')) ? inviteParams.get('game') : null
const inviteGame = legacyInviteGame || (ONLINE_GAMES.includes(initialRoute.game) ? initialRoute.game : null)
const inviteCode = inviteGame ? (inviteParams.get('join') || '') : ''
if (legacyInviteGame) initialRoute.game = legacyInviteGame

const selectedGame = ref(initialRoute.game)
// The invite code only applies to the game the link was for
const inviteCodeFor = (gameId) => (gameId === inviteGame ? inviteCode : '')
const showRules = ref(false)

// Nav bar categories
const selectedCategory = ref(initialRoute.category || 'all')

// Show the canonical address for where we landed: drops the invite query and unknown paths
window.history.replaceState(
  { inApp: false },
  '',
  initialRoute.game ? `/${initialRoute.game}` : categoryPath(selectedCategory.value)
)

const applyRoute = ({ category, game }) => {
  if (category) selectedCategory.value = category
  selectedGame.value = game
  showRules.value = false
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
  { key: 'solo', label: t.value.navSolo }
])

// Inside a game, highlight the category that game belongs to
const activeCategory = computed(() => {
  if (!selectedGame.value) return selectedCategory.value
  return games.value.find(game => game.id === selectedGame.value)?.category ?? selectedCategory.value
})

const filteredGames = computed(() =>
  selectedCategory.value === 'all'
    ? games.value
    : games.value.filter(game => game.category === selectedCategory.value)
)

const selectedGameTitle = computed(() => games.value.find(game => game.id === selectedGame.value)?.title || '')

// The shell prompt in the nav doubles as a breadcrumb: ~, ~/party, ~/party/tabu
const promptPath = computed(() => {
  const parts = ['~']
  if (activeCategory.value !== 'all') parts.push(activeCategory.value)
  if (selectedGame.value) parts.push(selectedGame.value)
  return parts.join('/')
})

const selectCategory = (key) => navigate(categoryPath(key))

// Tab title follows the page
watch([selectedGame, selectedGameTitle], () => {
  document.title = selectedGame.value ? `${selectedGameTitle.value} | Games & Tools` : 'Games & Tools'
}, { immediate: true })

const currentRules = computed(() => {
  const entry = rules[selectedGame.value] || rules.menu
  return entry[currentLang.value] || entry.EN
})
const rulesText = computed(() => rulesLabels[currentLang.value] || rulesLabels.EN)

// Same tile styles as Wordle: inverted = right spot, dashed = wrong spot, faint = not in word
const legendStyles = {
  green: 'term-inverse',
  yellow: 'border border-dashed border-term',
  gray: 'border border-term-low text-term-low'
}

const onKeydown = (e) => {
  if (e.key === 'Escape') showRules.value = false
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('popstate', onPopState)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('popstate', onPopState)
})

const toggleLanguage = () => {
  currentLang.value = currentLang.value === 'EN' ? 'TR' : 'EN'
}
</script>

<template>
  <div class="crt min-h-screen bg-black text-term font-mono">
    <nav :aria-label="t.navLabel" class="sticky top-0 z-30 bg-black/90 border-b border-term-low">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex flex-wrap md:flex-nowrap items-center gap-x-6 gap-y-3">
        <!-- Shell prompt -->
        <p class="order-1 flex-1 basis-0 md:flex-none md:basis-auto min-w-0 truncate text-sm font-semibold" aria-hidden="true">
          <span class="term-muted">guest@apps</span>:<span>{{ promptPath }}</span>$<span class="term-cursor"></span>
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
          <LanguageToggle
            :currentLang="currentLang"
            @toggle="toggleLanguage"
          />
        </div>
      </div>
    </nav>

    <div class="px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10 max-w-7xl mx-auto">
      <GameMenu
        v-if="!selectedGame"
        :games="filteredGames"
        :t="t"
        @select-game="openGame"
      />

      <QuizRaceGame
        v-else-if="selectedGame === 'quiz-race'"
        :t="t"
        :initialCode="inviteCodeFor('quiz-race')"
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
        @go-back="closeGame"
      />

      <TabuGame
        v-else-if="selectedGame === 'tabu'"
        :t="t"
        :initialCode="inviteCodeFor('tabu')"
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

@media (prefers-reduced-motion: reduce) {
  .rules-enter-active .rules-panel,
  .rules-leave-active .rules-panel {
    animation: none;
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
