<script setup>
defineProps({
  game: {
    type: Object,
    required: true
  },
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

// Emit click so parent listeners like @click work
defineEmits(['click'])
</script>

<template>
  <div 
    :class="[
      'rounded-2xl shadow-lg p-6 sm:p-8 cursor-pointer transform transition-all duration-50 backdrop-blur-sm',
      'hover:scale-105 hover:shadow-xl active:scale-95',
      isDarkMode 
        ? 'bg-gray-800/90 hover:bg-gray-700/90 shadow-gray-900/30' 
        : 'bg-white/90 hover:bg-gray-50/90 shadow-gray-200/70'
    ]"
    @click="$emit('click')"
  >
    <div class="text-4xl sm:text-5xl mb-4 sm:mb-5">{{ game.icon }}</div>
    <h2 class="text-xl sm:text-2xl font-medium mb-2">{{ game.title }}</h2>
    <p :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'" 
       class="text-sm sm:text-base leading-relaxed">
      {{ game.description }}
    </p>
  </div>
</template> 