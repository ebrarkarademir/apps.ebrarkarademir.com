<script setup>
defineProps({
  isDarkMode: Boolean
})

defineEmits(['toggle'])
</script>

<template>
  <button
    @click="$emit('toggle')"
    :aria-label="isDarkMode ? 'Light mode' : 'Dark mode'"
    :class="[
      'w-10 h-10 rounded-lg border transition-colors duration-150 flex items-center justify-center',
      isDarkMode
        ? 'bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-gray-700'
        : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
    ]"
  >
    <span class="text-base">{{ isDarkMode ? '☀️' : '🌙' }}</span>
  </button>
</template>
