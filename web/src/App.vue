<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import ThemeToggle from './components/ThemeToggle.vue'
import LanguageToggle from './components/LanguageToggle.vue'
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
const isDarkMode = ref(localStorage.getItem('darkMode') === 'true')

// Translation helper
const t = computed(() => translations[currentLang.value])

// Persist language preference
watch(currentLang, (newLang) => {
  localStorage.setItem('preferredLanguage', newLang)
})

// Persist theme preference
watch(isDarkMode, (newMode) => {
  localStorage.setItem('darkMode', newMode)
})

const games = computed(() => [
  {
    id: 'quiz-race',
    category: 'party',
    title: t.value.quizTitle,
    description: t.value.quizDesc,
    icon: '⚡'
  },
  {
    id: 'number-guess',
    category: 'solo',
    title: t.value.numberGuessTitle,
    description: t.value.numberGuessDesc,
    icon: '🎲'
  },
  {
    id: 'wordle',
    category: 'solo',
    title: t.value.wordleTitle,
    description: t.value.wordleDesc,
    icon: '📝'
  },
  {
    id: 'bottle-spin',
    category: 'party',
    title: t.value.bottleTitle,
    description: t.value.bottleDesc,
    icon: '🍾'
  },
  {
    id: 'casus-kim',
    category: 'party',
    title: t.value.casusTitle,
    description: t.value.casusDesc,
    icon: '🕵️'
  },
  {
    id: 'tabu',
    category: 'party',
    title: t.value.tabuTitle,
    description: t.value.tabuDesc,
    icon: '🎯'
  },
  {
    id: 'coming-soon-1',
    category: 'solo',
    title: t.value.memoryMatchTitle,
    description: t.value.comingSoonDesc,
    icon: '🎮'
  },
  {
    id: 'coming-soon-2',
    category: 'solo',
    title: t.value.wordPuzzleTitle,
    description: t.value.comingSoonDesc,
    icon: '📚'
  }
])

// An invite link (?join=CODE&game=ID) opens that online game with the room code filled in
const ONLINE_GAMES = ['quiz-race', 'casus-kim', 'tabu']
const inviteParams = new URLSearchParams(window.location.search)
const inviteGame = ONLINE_GAMES.includes(inviteParams.get('game')) ? inviteParams.get('game') : null
const inviteCode = inviteGame ? (inviteParams.get('join') || '') : ''
if (inviteParams.has('join')) window.history.replaceState(null, '', window.location.pathname)

const selectedGame = ref(inviteGame)
// The invite code only applies to the game the link was for
const inviteCodeFor = (gameId) => (gameId === inviteGame ? inviteCode : '')
const showRules = ref(false)

// Nav bar categories
const selectedCategory = ref('all')

const categories = computed(() => [
  { key: 'all', label: t.value.navAll, icon: '🏠' },
  { key: 'party', label: t.value.navParty, icon: '🎉' },
  { key: 'solo', label: t.value.navSolo, icon: '🧩' }
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

const selectCategory = (key) => {
  selectedCategory.value = key
  selectedGame.value = null
  window.scrollTo({ top: 0 })
}

const currentRules = computed(() => {
  const entry = rules[selectedGame.value] || rules.menu
  return entry[currentLang.value] || entry.EN
})
const rulesText = computed(() => rulesLabels[currentLang.value] || rulesLabels.EN)

const legendColors = {
  green: 'bg-green-500 text-white',
  yellow: 'bg-yellow-400 text-gray-900',
  gray: 'bg-gray-400 text-white'
}

const onKeydown = (e) => {
  if (e.key === 'Escape') showRules.value = false
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
}

const toggleLanguage = () => {
  currentLang.value = currentLang.value === 'EN' ? 'TR' : 'EN'
}
</script>

<template>
  <div :class="[
    'min-h-screen transition-colors duration-150 font-sans antialiased',
    isDarkMode
      ? 'bg-gray-950 text-gray-100'
      : 'bg-gray-50 text-gray-900'
  ]">
    <nav
      :aria-label="t.navLabel"
      :class="[
        'sticky top-0 z-30 backdrop-blur-md border-b transition-colors duration-50',
        isDarkMode ? 'bg-gray-950/80 border-gray-800' : 'bg-white/80 border-gray-200'
      ]"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex flex-wrap md:flex-nowrap items-center gap-3">
        <!-- Category items: own scrollable row on phones, left side on desktop -->
        <ul class="order-2 md:order-1 w-full md:w-auto md:flex-1 flex gap-1 overflow-x-auto no-scrollbar">
          <li v-for="category in categories" :key="category.key" class="shrink-0">
            <button
              @click="selectCategory(category.key)"
              :aria-current="activeCategory === category.key ? 'page' : undefined"
              :class="[
                'flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-150',
                activeCategory === category.key
                  ? isDarkMode
                    ? 'bg-white text-gray-900'
                    : 'bg-gray-900 text-white'
                  : isDarkMode
                    ? 'text-gray-400 hover:bg-gray-900 hover:text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              ]"
            >
              <span aria-hidden="true">{{ category.icon }}</span>
              <span>{{ category.label }}</span>
            </button>
          </li>
        </ul>

        <div class="order-1 md:order-2 ml-auto flex items-center gap-2">
          <button
            @click="showRules = true"
            :class="[
              'w-10 h-10 rounded-lg border transition-colors duration-150 flex items-center justify-center font-semibold text-base',
              isDarkMode
                ? 'bg-gray-900 border-gray-800 text-gray-200 hover:bg-gray-800 hover:border-gray-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
            ]"
            :aria-label="t.gameRules"
            :title="t.gameRules"
          >
            ?
          </button>
          <LanguageToggle
            :currentLang="currentLang"
            :isDarkMode="isDarkMode"
            @toggle="toggleLanguage"
          />
          <ThemeToggle
            :isDarkMode="isDarkMode"
            @toggle="toggleTheme"
          />
        </div>
      </div>
    </nav>

    <div class="px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10 max-w-7xl mx-auto">
      <GameMenu
        v-if="!selectedGame"
        :games="filteredGames"
        :isDarkMode="isDarkMode"
        :t="t"
        @select-game="selectedGame = $event"
      />

      <QuizRaceGame
        v-else-if="selectedGame === 'quiz-race'"
        :isDarkMode="isDarkMode"
        :t="t"
        :initialCode="inviteCodeFor('quiz-race')"
        @go-back="selectedGame = null"
      />

      <NumberGuessingGame
        v-else-if="selectedGame === 'number-guess'"
        :isDarkMode="isDarkMode"
        :t="t"
        @go-back="selectedGame = null"
      />

      <!-- Wordle is under development: re-enable this block to restore the game
      <WordleGame
        v-else-if="selectedGame === 'wordle'"
        :isDarkMode="isDarkMode"
        :t="t"
        @go-back="selectedGame = null"
      />
      -->

      <BottleSpinGame
        v-else-if="selectedGame === 'bottle-spin'"
        :isDarkMode="isDarkMode"
        :t="t"
        @go-back="selectedGame = null"
      />

      <CasusKimGame
        v-else-if="selectedGame === 'casus-kim'"
        :isDarkMode="isDarkMode"
        :t="t"
        :initialCode="inviteCodeFor('casus-kim')"
        @go-back="selectedGame = null"
      />

      <TabuGame
        v-else-if="selectedGame === 'tabu'"
        :isDarkMode="isDarkMode"
        :t="t"
        :initialCode="inviteCodeFor('tabu')"
        @go-back="selectedGame = null"
      />

      <!-- Placeholder for other games -->
      <div v-else
        :class="[
          'max-w-lg mx-auto rounded-xl border overflow-hidden transition-colors duration-150',
          isDarkMode
            ? 'bg-gray-900 border-gray-800'
            : 'bg-white border-gray-200 shadow-lg'
        ]"
      >
        <div
          :class="[
            'px-5 py-4 sm:px-6 border-b',
            isDarkMode ? 'border-gray-800' : 'border-gray-200'
          ]"
        >
          <div class="flex items-center justify-between gap-4">
            <button
              @click="selectedGame = null"
              :class="[
                'px-3 py-2 rounded-lg transition-colors duration-150 flex items-center gap-2 text-sm font-medium',
                isDarkMode
                  ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              ]"
            >
              <span class="text-lg">←</span>
              <span>{{ t.back }}</span>
            </button>

            <span
              :class="[
                'inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                isDarkMode
                  ? 'bg-violet-500/10 text-violet-300 border-violet-500/40'
                  : 'bg-violet-50 text-violet-700 border-violet-200'
              ]"
            >
              beta
            </span>
          </div>
        </div>

        <div class="p-6 sm:p-8 text-center">
          <div
            :class="[
              'mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl border text-3xl',
              isDarkMode
                ? 'bg-gray-800 border-gray-700'
                : 'bg-gray-50 border-gray-200'
            ]"
          >
            🚧
          </div>

          <h1 class="text-2xl sm:text-3xl font-semibold mb-3">{{ t.comingSoon }}</h1>

          <p
            :class="[
              'text-sm sm:text-base leading-relaxed max-w-md mx-auto',
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            ]"
          >
            {{ t.comingSoonDesc }}
          </p>

          <div
            :class="[
              'mt-6 rounded-lg p-4 border text-left',
              isDarkMode
                ? 'bg-gray-950/60 border-gray-800 text-gray-200'
                : 'bg-gray-50 border-gray-200 text-gray-700'
            ]"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.18em] mb-2 opacity-80">{{ t.comingSoonStatus }}</p>
            <p class="text-sm leading-relaxed">
              {{ t.comingSoonStatusText }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <Transition name="rules">
      <div
        v-if="showRules"
        class="rules-backdrop fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
        @click.self="showRules = false"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rules-title"
          :class="[
            'rules-panel w-full sm:max-w-lg max-h-[90vh] flex flex-col rounded-t-xl sm:rounded-xl shadow-2xl border overflow-hidden',
            isDarkMode
              ? 'bg-gray-900 border-gray-800 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          ]"
        >
          <div
            :class="[
              'relative px-6 pt-6 pb-5 border-b',
              isDarkMode
                ? 'border-gray-800'
                : 'border-gray-200'
            ]"
          >
            <button
              @click="showRules = false"
              :class="[
                'absolute top-4 right-4 w-8 h-8 rounded-lg border flex items-center justify-center text-lg transition-colors',
                isDarkMode
                  ? 'border-gray-800 hover:bg-gray-800 text-gray-300'
                  : 'border-gray-200 hover:bg-gray-100 text-gray-600'
              ]"
              :aria-label="rulesText.close"
            >
              ×
            </button>

            <div class="flex items-center gap-4 pr-10">
              <div
                :class="[
                  'h-12 w-12 shrink-0 rounded-lg border flex items-center justify-center text-2xl',
                  isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                ]"
              >
                {{ currentRules.icon }}
              </div>
              <div class="min-w-0">
                <h2 id="rules-title" class="text-xl sm:text-2xl font-semibold leading-tight">
                  {{ currentRules.title }}
                </h2>
                <div v-if="currentRules.players || currentRules.duration" class="mt-2 flex flex-wrap gap-2">
                  <span
                    v-for="chip in [currentRules.players && '👥 ' + currentRules.players, currentRules.duration && '⏱ ' + currentRules.duration].filter(Boolean)"
                    :key="chip"
                    :class="[
                      'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                      isDarkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-600'
                    ]"
                  >
                    {{ chip }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="overflow-y-auto px-6 py-5 space-y-6">
            <div
              :class="[
                'rounded-lg p-4 border-l-2',
                isDarkMode
                  ? 'bg-violet-500/10 border-violet-400 text-violet-100'
                  : 'bg-violet-50 border-violet-500 text-violet-950'
              ]"
            >
              <p class="text-xs font-bold uppercase tracking-[0.18em] mb-1 opacity-80">{{ rulesText.goal }}</p>
              <p class="leading-relaxed">{{ currentRules.goal }}</p>
            </div>

            <section>
              <h3 :class="['text-xs font-bold uppercase tracking-[0.18em] mb-3', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                {{ rulesText.howToPlay }}
              </h3>
              <ol class="space-y-3">
                <li
                  v-for="(step, index) in currentRules.steps"
                  :key="index"
                  class="flex gap-3 items-start"
                >
                  <span
                    :class="[
                      'h-6 w-6 shrink-0 rounded-md border flex items-center justify-center text-xs font-semibold tabular-nums',
                      isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-200' : 'border-gray-200 bg-gray-50 text-gray-700'
                    ]"
                  >
                    {{ index + 1 }}
                  </span>
                  <span :class="['leading-relaxed pt-0.5', isDarkMode ? 'text-gray-200' : 'text-gray-700']">{{ step }}</span>
                </li>
              </ol>
            </section>

            <div v-if="currentRules.legend" class="grid gap-2">
              <div
                v-for="item in currentRules.legend"
                :key="item.color"
                class="flex items-center gap-3"
              >
                <span :class="['h-8 w-8 shrink-0 rounded-lg flex items-center justify-center font-bold', legendColors[item.color]]">A</span>
                <span :class="['text-sm', isDarkMode ? 'text-gray-200' : 'text-gray-700']">{{ item.text }}</span>
              </div>
            </div>

            <section v-if="currentRules.tips?.length">
              <h3 :class="['text-xs font-bold uppercase tracking-[0.18em] mb-3', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                {{ rulesText.tips }}
              </h3>
              <ul class="space-y-2">
                <li
                  v-for="(tip, index) in currentRules.tips"
                  :key="index"
                  :class="[
                    'flex gap-3 items-start rounded-lg p-3 text-sm',
                    isDarkMode ? 'bg-yellow-400/10 text-yellow-100' : 'bg-yellow-50 text-yellow-900'
                  ]"
                >
                  <span class="shrink-0">💡</span>
                  <span class="leading-relaxed">{{ tip }}</span>
                </li>
              </ul>
            </section>
          </div>

          <div :class="['px-6 py-4 border-t', isDarkMode ? 'border-gray-800' : 'border-gray-200']">
            <button
              @click="showRules = false"
              :class="[
                'w-full rounded-lg py-2.5 text-sm font-semibold transition-colors',
                isDarkMode ? 'bg-white text-gray-900 hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-700'
              ]"
            >
              {{ rulesText.gotIt }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
/* Global styles */
:root {
  --app-blur: blur(20px);
}

body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Better button and input defaults */
button, input {
  font-family: inherit;
}

/* Rules modal transition */
.rules-enter-active,
.rules-leave-active {
  transition: opacity 0.15s ease;
}
.rules-enter-active .rules-panel,
.rules-leave-active .rules-panel {
  transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.rules-enter-from,
.rules-leave-to {
  opacity: 0;
}
.rules-enter-from .rules-panel,
.rules-leave-to .rules-panel {
  transform: translateY(8px) scale(0.99);
}

/* Horizontally scrollable nav items without a visible scrollbar */
.no-scrollbar {
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Remove tap highlight on mobile */
* {
  -webkit-tap-highlight-color: transparent;
}
</style>


