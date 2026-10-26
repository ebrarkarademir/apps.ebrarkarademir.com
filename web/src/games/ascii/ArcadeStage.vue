<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { sound } from './sound'
import { haptics } from './haptics'

// The full-screen frame every ASCII arcade game plays in: a header with the exit command, the
// title, the game's own buttons (the `actions` slot) and the sound and vibration switches,
// over the play area in the default slot. While it's open the page behind it doesn't scroll,
// and M switches the sound.

defineProps({
  t: { type: Object, required: true },
  title: { type: String, required: true },
  exitLabel: { type: String, required: true }
})

const emit = defineEmits(['exit'])

const muted = ref(sound.muted)
const buzzing = ref(haptics.on)
let savedOverflow = ''

function toggleSound () {
  sound.setMuted(!sound.muted)
  muted.value = sound.muted
  if (!muted.value) sound.unlock()
}

function toggleHaptics () {
  haptics.setOn(!haptics.on)
  buzzing.value = haptics.on
  haptics.buzz('tap')
}

// Clicked buttons let go of focus, so Space goes back to the game
function onSwitch (event, toggle) {
  toggle()
  if (event.detail) event.currentTarget.blur()
}

function onKey (event) {
  if (event.code === 'KeyM' && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) toggleSound()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  savedOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  // Tells the page that Esc belongs to the game while it's open
  document.body.dataset.arcade = ''
  document.activeElement?.blur?.()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = savedOverflow
  delete document.body.dataset.arcade
})
</script>

<template>
  <div class="arena fixed inset-0 z-40 flex flex-col bg-black select-none">
    <header class="shrink-0 flex items-center gap-2 h-12 px-2 sm:px-4 border-b border-term-low">
      <button type="button" class="term-link shrink-0" @click="emit('exit')">
        <span aria-hidden="true">[&lt;]</span>
        <span>{{ exitLabel }}</span>
      </button>
      <h1 class="flex-1 min-w-0 truncate text-center font-display text-2xl leading-none uppercase">[ {{ title }} ]</h1>
      <slot name="actions" />
      <button
        v-if="haptics.supported"
        type="button"
        class="term-icon-btn shrink-0 h-9 text-xs"
        :aria-label="t.vibration"
        :aria-pressed="buzzing"
        @click="onSwitch($event, toggleHaptics)"
      >
        {{ buzzing ? 'VIB:ON' : 'VIB:OFF' }}
      </button>
      <button
        type="button"
        class="term-icon-btn shrink-0 h-9 text-xs"
        :aria-label="t.sound"
        :aria-pressed="!muted"
        @click="onSwitch($event, toggleSound)"
      >
        {{ muted ? 'SND:OFF' : 'SND:ON' }}
      </button>
    </header>

    <slot />
  </div>
</template>

<style scoped>
.arena {
  -webkit-touch-callout: none;
}
</style>
