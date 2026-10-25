<script setup>
import GameCard from '../components/GameCard.vue'

defineProps({
  games: {
    type: Array,
    required: true
  },
  isDarkMode: {
    type: Boolean,
    default: false
  },
  t: {
    type: Object,
    required: true
  }
})

defineEmits(['select-game'])
</script>

<template>
  <div class="max-w-6xl mx-auto">
    
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
      <GameCard
        v-for="game in games" 
        :key="game.id"
        :game="game"
        :isDarkMode="isDarkMode"
        @click="$emit('select-game', game.id)"
      />
    </div>
  </div>
</template> 