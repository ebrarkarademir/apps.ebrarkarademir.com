<script setup>
defineProps({
  currentLang: {
    type: String,
    required: true
  }
})

defineEmits(['toggle'])
</script>

<template>
  <button
    @click="$emit('toggle')"
    class="term-icon-btn"
    :aria-label="currentLang === 'TR' ? 'Dil: Türkçe' : 'Language: English'"
  >
    <span
      v-for="(lang, index) in ['EN', 'TR']"
      :key="lang"
      :class="['px-1', currentLang === lang ? 'term-inverse' : 'term-muted', { 'ml-0.5': index }]"
    >
      {{ lang }}
    </span>
  </button>
</template>
