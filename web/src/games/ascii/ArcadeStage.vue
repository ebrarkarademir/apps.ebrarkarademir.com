<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { sound } from './sound'
import { haptics } from './haptics'

// The full-screen frame every ASCII arcade game plays in: a header with the exit command, the
// title, the game's own buttons (the `actions` slot) and the sound and vibration switches,
// over the play area in the default slot. While it's open the page behind it doesn't scroll,
// and M switches the sound.

const props = defineProps({
  t: { type: Object, required: true },
  title: { type: String, required: true },
  exitLabel: { type: String, required: true },
  // Off for games where M is something you type
  soundKey: { type: Boolean, default: true },
  // Just the play area, no header: a game's full-screen view, which brings its own way out
  bare: { type: Boolean, default: false }
})

const emit = defineEmits(['exit'])

const muted = ref(sound.muted)
const buzzing = ref(haptics.on)
let savedOverflow = ''

// On a narrow phone the buttons leave the title too little room: rather than a stub like
// "[ CR…", it goes (for the eye; screen readers still have it) until there's room for all of it
const header = ref(null)
const titleEl = ref(null)
const roomEl = ref(null)
const tight = ref(false)
let titleWidth = 0
let headerObserver = null

function fitTitle () {
  if (!tight.value) {
    const el = titleEl.value
    if (el && el.scrollWidth > el.clientWidth + 1) {
      titleWidth = el.scrollWidth
      tight.value = true
    }
  } else if (roomEl.value && roomEl.value.clientWidth >= titleWidth) {
    tight.value = false
    nextTick(fitTitle)
  }
}

watch(() => props.title, () => {
  tight.value = false
  nextTick(fitTitle)
})
// The room left changes when the game's own buttons do, too
watch(roomEl, (el, old) => {
  if (old) headerObserver?.unobserve(old)
  if (el) headerObserver?.observe(el)
})

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
  if (props.soundKey && event.code === 'KeyM' && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) toggleSound()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  savedOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  // Tells the page that Esc belongs to the game while it's open
  document.body.dataset.arcade = ''
  document.activeElement?.blur?.()
  headerObserver = new ResizeObserver(fitTitle)
  headerObserver.observe(header.value)
  headerObserver.observe(titleEl.value)
  fitTitle()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  headerObserver?.disconnect()
  document.body.style.overflow = savedOverflow
  delete document.body.dataset.arcade
})
</script>

<template>
  <div class="arena fixed inset-0 z-40 flex flex-col bg-black select-none">
    <header v-show="!bare" ref="header" class="shrink-0 flex items-center gap-2 h-12 px-2 sm:px-4 border-b border-term-low">
      <!-- On a narrow phone just [<], to leave the game's buttons room -->
      <button type="button" class="term-link shrink-0" :title="exitLabel" @click="emit('exit')">
        <span aria-hidden="true">[&lt;]</span>
        <span class="max-[399px]:sr-only">{{ exitLabel }}</span>
      </button>
      <h1 ref="titleEl" :class="['flex-1 min-w-0 truncate text-center font-display text-2xl leading-none uppercase', { 'sr-only': tight }]">[ {{ title }} ]</h1>
      <span v-if="tight" ref="roomEl" class="flex-1 min-w-0" aria-hidden="true"></span>
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
