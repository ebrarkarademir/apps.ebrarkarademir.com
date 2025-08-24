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
    <div class="fixed top-4 right-4 flex items-center gap-2">
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
          'max-w-md mx-auto rounded-2xl shadow-lg backdrop-blur-sm p-6 sm:p-8 transition-all duration-50',
          isDarkMode 
            ? 'bg-gray-800/90 shadow-gray-900/30' 
            : 'bg-white/90 shadow-gray-200/70'
        ]"
      >
        <div class="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 sm:gap-0">
          <button 
            @click="selectedGame = null"
            :class="[
              'px-4 py-2 rounded-xl transition-all duration-50 flex items-center gap-2',
              isDarkMode 
                ? 'text-gray-300 hover:text-white hover:bg-gray-700/50' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100/50'
            ]"
          >
            <span class="text-lg">←</span>
            <span>{{ t.back }}</span>
          </button>
          <h1 class="text-xl sm:text-2xl font-medium">{{ t.comingSoon }}</h1>
        </div>
        <p :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'" 
           class="text-center text-sm sm:text-base leading-relaxed">
          {{ t.comingSoonDesc }}
        </p>
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


