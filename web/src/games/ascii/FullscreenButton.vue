<script setup>
import { inject } from 'vue'

// The switch into a game's full-screen view, [FULL], and the way back out of it, [X]
defineProps({
  t: { type: Object, required: true },
  full: { type: Boolean, default: false }
})

defineEmits(['toggle'])

// In a frame with the old terminal look (see ArcadeStage), the old words
const classic = inject('arcadeClassic', false)
</script>

<template>
  <button
    type="button"
    class="term-icon-btn shrink-0 h-9 text-xs"
    :aria-label="full ? t.gameExitFullscreen : t.gameFullscreen"
    :title="full ? t.gameExitFullscreen : t.gameFullscreen"
    @click="$emit('toggle', $event)"
  >
    <template v-if="classic">{{ full ? '[X]' : '[FULL]' }}</template>
    <i v-else :class="['pxi', full ? 'pxi-unfull' : 'pxi-full']" aria-hidden="true"></i>
  </button>
</template>
