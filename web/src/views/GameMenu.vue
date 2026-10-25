<script setup>
import GameCard from '../components/GameCard.vue'

defineProps({
  games: {
    type: Array,
    required: true
  },
  t: {
    type: Object,
    required: true
  },
  // Id of the card turned over to its info side; one at a time
  flipped: {
    type: String,
    default: null
  }
})

defineEmits(['select-game', 'update:flipped'])
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
      <GameCard
        v-for="(game, index) in games"
        :key="game.id"
        :game="game"
        :t="t"
        :flipped="flipped === game.id"
        :shortcut="index < 9 ? index + 1 : 0"
        @flip="$emit('update:flipped', $event ? game.id : null)"
        @run="$emit('select-game', game.id)"
      />
    </div>
  </div>
</template>
