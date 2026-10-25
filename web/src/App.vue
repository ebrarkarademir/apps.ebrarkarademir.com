<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import ThemeToggle from './components/ThemeToggle.vue'
import LanguageToggle from './components/LanguageToggle.vue'
import GameMenu from './views/GameMenu.vue'
import WordleGame from './games/WordleGame.vue'
import NumberGuessingGame from './games/NumberGuessingGame.vue'
import BottleSpinGame from './games/BottleSpinGame.vue'
import CasusKimGame from './games/CasusKimGame.vue'
import TabuGame from './games/TabuGame.vue'
import CvAnalyzerGame from './games/CvAnalyzerGame.vue'
import InstaCommentPickerGame from './games/InstaCommentPickerGame.vue'
import { translations } from './translations'

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
    id: 'number-guess',
    title: t.value.numberGuessTitle,
    description: t.value.numberGuessDesc,
    icon: '🎲'
  },
  {
    id: 'wordle',
    title: t.value.wordleTitle,
    description: t.value.wordleDesc,
    icon: '📝'
  },
  {
    id: 'bottle-spin',
    title: t.value.bottleTitle,
    description: t.value.bottleDesc,
    icon: '🍾'
  },
  {
    id: 'casus-kim',
    title: t.value.casusTitle,
    description: t.value.casusDesc,
    icon: '🕵️'
  },
  {
    id: 'tabu',
    title: t.value.tabuTitle,
    description: t.value.tabuDesc,
    icon: '🎯'
  },
  {
    id: 'insta-picker',
    title: t.value.instaMenuTitle,
    description: t.value.instaMenuDesc,
    icon: '📷'
  },
  {
    id: 'cv-analyzer',
    title: t.value.cvMenuTitle,
    description: t.value.cvMenuDesc,
    icon: '📄'
  },
  {
    id: 'coming-soon-1',
    title: t.value.memoryMatchTitle || 'Memory Match',
    description: t.value.comingSoonDesc,
    icon: '🎮'
  },
  {
    id: 'coming-soon-2',
    title: t.value.wordPuzzleTitle || 'Word Puzzle',
    description: t.value.comingSoonDesc,
    icon: '📚'
  }
])

const selectedGame = ref(null)
const showRules = ref(false)

const rulesByGame = {
  'number-guess': {
    title: 'Number Guessing Game',
    rules: [
      'Pick a number between 1 and 100.',
      'The game tells you whether your guess is too high or too low.',
      'Keep guessing until you find the correct number.'
    ]
  },
  wordle: {
    title: 'Wordle Game',
    rules: [
      'Guess the hidden word using the selected word length.',
      'Letters in the right place turn green.',
      'Letters that exist but are in the wrong place turn yellow.'
    ]
  },
  'bottle-spin': {
    title: 'Bottle Spin Game',
    rules: [
      'Choose the player count and enter names.',
      'Spin the bottle to decide who answers a truth or dare prompt.',
      'The selected player completes the challenge or answer.'
    ]
  },
  'casus-kim': {
    title: 'Who Is the Spy?',
    rules: [
      'Each player receives a secret role and a topic word.',
      'The spy does not know the topic word.',
      'Discuss, ask questions, and vote to identify the spy.'
    ]
  },
  tabu: {
    title: 'Tabu',
    rules: [
      'One player explains the target word without saying the forbidden words.',
      'If the team guesses correctly, they earn points.',
      'Skipping or using a forbidden word ends the turn.'
    ]
  },
  'insta-picker': {
    title: 'Instagram Comment Picker',
    rules: [
      'Paste a public Instagram post URL or upload comments.',
      'Filter comments by keyword or regex.',
      'Choose how many winners you want and pick them.'
    ]
  },
  'cv-analyzer': {
    title: 'CV Analyzer',
    rules: [
      'Upload or paste a CV in plain text.',
      'The app scans structure, skills, and common hiring signals.',
      'Review the mock analysis and suggested improvements.'
    ]
  }
}

const currentRules = computed(() => {
  if (selectedGame.value && rulesByGame[selectedGame.value]) {
    return rulesByGame[selectedGame.value]
  }

  return currentLang.value === 'TR'
    ? {
        title: 'Oyun Seçimi',
        rules: [
          'Bir oyun kartı seç.',
          'Seçtiğin oyunun kuralını burada görebilirsin.',
          'İstediğin oyuna girip tekrar yardım butonunu kullanabilirsin.'
        ]
      }
    : {
        title: 'Game Selection',
        rules: [
          'Choose a game card from the menu.',
          'You can review the rules for any selected game here.',
          'Open a game and use the help button anytime.'
        ]
      }
})

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
}

const toggleLanguage = () => {
  currentLang.value = currentLang.value === 'EN' ? 'TR' : 'EN'
}
</script>

<template>
  <div :class="[
    'min-h-screen transition-colors duration-50 font-sans',
    isDarkMode 
      ? 'bg-gray-900 text-white' 
      : 'bg-gray-50 text-gray-900'
  ]">
    <div class="fixed top-4 right-4 flex items-center gap-2 z-30">
      <button
        @click="showRules = true"
        :class="[
          'w-12 h-12 rounded-full shadow-lg transition-all duration-50 backdrop-blur-sm flex items-center justify-center font-bold text-lg',
          isDarkMode
            ? 'bg-gray-800/90 text-blue-400 hover:bg-gray-700/90'
            : 'bg-white/90 text-gray-800 hover:bg-gray-50/90'
        ]"
        aria-label="Game rules"
        title="Game rules"
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

    <div class="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <GameMenu
        v-if="!selectedGame"
        :games="games"
        :isDarkMode="isDarkMode"
        :t="t"
        @select-game="selectedGame = $event"
      />

      <NumberGuessingGame
        v-else-if="selectedGame === 'number-guess'"
        :isDarkMode="isDarkMode"
        :t="t"
        @go-back="selectedGame = null"
      />

      <WordleGame
        v-else-if="selectedGame === 'wordle'"
        :isDarkMode="isDarkMode"
        :t="t"
        @go-back="selectedGame = null"
      />

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
        @go-back="selectedGame = null"
      />

      <TabuGame
        v-else-if="selectedGame === 'tabu'"
        :isDarkMode="isDarkMode"
        :t="t"
        @go-back="selectedGame = null"
      />

      <InstaCommentPickerGame
        v-else-if="selectedGame === 'insta-picker'"
        :isDarkMode="isDarkMode"
        :t="t"
        @go-back="selectedGame = null"
      />

      <CvAnalyzerGame
        v-else-if="selectedGame === 'cv-analyzer'"
        :isDarkMode="isDarkMode"
        :t="t"
        @go-back="selectedGame = null"
      />

      <!-- Placeholder for other games -->
      <div v-else
        :class="[
          'max-w-lg mx-auto rounded-3xl border overflow-hidden shadow-2xl backdrop-blur-sm transition-all duration-50',
          isDarkMode
            ? 'bg-gray-800/90 border-gray-700 shadow-gray-950/40'
            : 'bg-white/90 border-gray-200 shadow-gray-200/70'
        ]"
      >
        <div
          :class="[
            'px-5 py-4 sm:px-6 border-b',
            isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-100 bg-gray-50/80'
          ]"
        >
          <div class="flex items-center justify-between gap-4">
            <button
              @click="selectedGame = null"
              :class="[
                'px-3 py-2 rounded-xl transition-all duration-50 flex items-center gap-2 text-sm font-medium',
                isDarkMode
                  ? 'text-gray-300 hover:text-white hover:bg-gray-700/60'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              ]"
            >
              <span class="text-lg">←</span>
              <span>{{ t.back }}</span>
            </button>

            <span
              :class="[
                'inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]',
                isDarkMode
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-400/40'
                  : 'bg-purple-100 text-purple-700 border border-purple-200'
              ]"
            >
              beta
            </span>
          </div>
        </div>

        <div class="p-6 sm:p-8 text-center">
          <div
            :class="[
              'mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl text-4xl shadow-lg',
              isDarkMode
                ? 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-300 shadow-purple-900/20'
                : 'bg-gradient-to-br from-purple-100 to-blue-100 text-purple-600 shadow-purple-200/80'
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
              'mt-6 rounded-2xl p-4 border text-left',
              isDarkMode
                ? 'bg-gray-900/40 border-gray-700 text-gray-200'
                : 'bg-gray-50 border-gray-200 text-gray-700'
            ]"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.18em] mb-2 opacity-80">Status</p>
            <p class="text-sm leading-relaxed">
              This game is being designed and polished for a better experience. Check back soon for the full release.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showRules"
      class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      @click.self="showRules = false"
    >
      <div
        :class="[
          'w-full max-w-lg rounded-2xl shadow-2xl p-6 border',
          isDarkMode
            ? 'bg-gray-800 border-gray-700 text-white'
            : 'bg-white border-gray-200 text-gray-900'
        ]"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold">{{ currentRules.title }}</h2>
          <button
            @click="showRules = false"
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors',
              isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            ]"
            aria-label="Close rules"
          >
            ×
          </button>
        </div>

        <ul class="space-y-3">
          <li
            v-for="(rule, index) in currentRules.rules"
            :key="index"
            :class="[
              'flex gap-3 items-start rounded-xl p-3 border',
              isDarkMode
                ? 'bg-gray-700/60 border-gray-600 text-gray-100'
                : 'bg-gray-50 border-gray-200 text-gray-700'
            ]"
          >
            <span
              :class="[
                'mt-1.5 h-2.5 w-2.5 rounded-full shrink-0',
                isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
              ]"
            ></span>
            <span class="leading-relaxed">{{ rule }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style>
/* Global styles */
:root {
  --app-blur: blur(20px);
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
               Helvetica, Arial, sans-serif, "Apple Color Emoji", 
               "Segoe UI Emoji", "Segoe UI Symbol";
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

/* Remove tap highlight on mobile */
* {
  -webkit-tap-highlight-color: transparent;
}
</style>


