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
  'p-3 w-12 h-12 rounded-full shadow-lg transition-all duration-50 backdrop-blur-sm flex items-center justify-center',
      isDarkMode 
        ? 'bg-gray-800/90 text-yellow-400 hover:bg-gray-700/90' 
        : 'bg-white/90 text-gray-800 hover:bg-gray-50/90'
    ]"
    >
    <img 
      :src="currentLang === 'TR' 
        ? '/images/tr-lang-icon.png'
        : '/images/en-lang-icon.png'"
      :alt="currentLang === 'TR' ? 'Türkçe' : 'English'"
      class="w-6 h-6"
    />
  </button>
</template> 