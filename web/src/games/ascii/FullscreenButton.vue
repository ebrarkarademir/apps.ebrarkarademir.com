<script setup>
// The switch into a game's full-screen view, [FULL], and the way back out of it, [X]
defineProps({
  t: { type: Object, required: true },
  full: { type: Boolean, default: false }
})

defineEmits(['toggle'])
</script>

<template>
  <button
    type="button"
    class="term-icon-btn shrink-0 h-9 text-xs"
    :aria-label="full ? t.gameExitFullscreen : t.gameFullscreen"
    :title="full ? t.gameExitFullscreen : t.gameFullscreen"
    @click="$emit('toggle', $event)"
  >
    {{ full ? '[X]' : '[FULL]' }}
  </button>
</template>
