<script setup>
defineProps({
  currentLang: {
    type: String,
    required: true
  },
  isDarkMode: Boolean
})

defineEmits(['toggle'])
</script>

<template>
  <button
    @click="$emit('toggle')"
    :class="[
      'h-10 px-2.5 rounded-lg border transition-colors duration-150 flex items-center gap-2 text-xs font-semibold',
      isDarkMode
        ? 'bg-gray-900 border-gray-800 text-gray-200 hover:bg-gray-800 hover:border-gray-700'
        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
    ]"
  >
    <img
      :src="currentLang === 'TR'
        ? '/images/tr-lang-icon.png'
        : '/images/en-lang-icon.png'"
      :alt="currentLang === 'TR' ? 'Türkçe' : 'English'"
      class="w-5 h-5"
    />
    <span>{{ currentLang }}</span>
  </button>
</template>
