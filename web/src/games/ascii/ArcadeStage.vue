<script setup>
import { ref, inject, provide, watch, nextTick, onMounted, onUnmounted } from 'vue'
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
  bare: { type: Boolean, default: false },
  // The green terminal look the site used to have, for games with art of their own (Tank, Race,
  // Crater, Blackjack), which keep the frame they were made with
  classic: { type: Boolean, default: false }
})

// The buttons the games put in the header (see FullscreenButton) follow the frame
provide('arcadeClassic', props.classic)

const emit = defineEmits(['exit'])

// The open game's version (provided by App), by the title
const version = inject('gameVersion', null)

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
  <div :class="['arena fixed inset-0 z-40 flex flex-col bg-black select-none', classic ? 'term-classic' : 'is-pixel']">
    <header v-show="!bare" ref="header" class="arena-bar shrink-0 flex items-center gap-2 h-12 px-2 sm:px-4 border-b border-term-low">
      <!-- On a narrow phone just the arrow, to leave the game's buttons room -->
      <button type="button" class="term-link shrink-0" :title="exitLabel" @click="emit('exit')">
        <span aria-hidden="true"><template v-if="classic">[&lt;]</template><i v-else class="pxi pxi-back"></i></span>
        <span class="max-[399px]:sr-only">{{ exitLabel }}</span>
      </button>
      <h1 ref="titleEl" :class="['flex-1 min-w-0 truncate text-center font-display leading-none uppercase', classic ? 'text-2xl' : 'text-xl sm:text-2xl', { 'sr-only': tight }]"><template v-if="classic">[ </template>{{ title }}<span v-if="version" class="version"> v{{ version }}</span><template v-if="classic"> ]</template></h1>
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
        <template v-if="classic">{{ buzzing ? 'VIB:ON' : 'VIB:OFF' }}</template>
        <span v-else :class="['flex items-center gap-1', { 'opacity-45': !buzzing }]"><i class="pxi pxi-vibe" aria-hidden="true"></i>{{ buzzing ? 'ON' : 'OFF' }}</span>
      </button>
      <button
        type="button"
        class="term-icon-btn shrink-0 h-9 text-xs"
        :aria-label="t.sound"
        :aria-pressed="!muted"
        @click="onSwitch($event, toggleSound)"
      >
        <template v-if="classic">{{ muted ? 'SND:OFF' : 'SND:ON' }}</template>
        <span v-else :class="['flex items-center gap-1', { 'opacity-45': muted }]"><i :class="['pxi', muted ? 'pxi-mute' : 'pxi-sound']" aria-hidden="true"></i>{{ muted ? 'OFF' : 'ON' }}</span>
      </button>
    </header>

    <slot />
  </div>
</template>

<style scoped>
.version {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: none;
  vertical-align: middle;
  opacity: 0.6;
}
.arena {
  -webkit-touch-callout: none;
}
/* The pixel header: a panel bar with a dark edge under it */
.is-pixel .arena-bar {
  background: var(--color-panel);
  border-bottom: var(--px) solid var(--color-well);
  box-shadow: inset 0 calc(var(--px) * -1) 0 0 rgb(0 0 0 / 0.25);
}
</style>
