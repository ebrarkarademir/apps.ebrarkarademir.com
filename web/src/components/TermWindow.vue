<script setup>
import { inject } from 'vue'

// Frame shared by every game screen: a pixel panel with its title on a gold tab across the
// top edge, like a game's menu window, and a back command in the corner. The open game's
// version (provided by App) sits by the title.
const version = inject('gameVersion', null)

defineProps({
  title: { type: String, required: true },
  backLabel: { type: String, required: true }
})

defineEmits(['back'])
</script>

<template>
  <section class="term-window mx-auto w-full mt-6 px-4 pt-8 pb-5 sm:px-8 sm:pb-8">
    <h1 class="window-tab absolute -top-4 left-3 sm:left-6 max-w-[calc(100%-1.5rem)] truncate px-3 font-display text-xl leading-8 uppercase">
      {{ title }}<span v-if="version" class="version"> v{{ version }}</span>
    </h1>

    <div class="flex items-center justify-between gap-3 mb-6">
      <button @click="$emit('back')" class="term-link -ml-1.5">
        <span aria-hidden="true"><i class="pxi pxi-back" aria-hidden="true"></i></span>
        <span>{{ backLabel }}</span>
      </button>
      <slot name="status" />
    </div>

    <slot />
  </section>
</template>

<style scoped>
.window-tab {
  background: var(--color-gold);
  color: var(--color-black);
  text-shadow: none;
  box-shadow:
    0 -3px 0 0 var(--color-well),
    0 3px 0 0 var(--color-well),
    -3px 0 0 0 var(--color-well),
    3px 0 0 0 var(--color-well),
    inset 0 3px 0 0 rgb(255 255 255 / 0.45),
    inset 0 -3px 0 0 rgb(150 70 20 / 0.45);
}
.version {
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  text-transform: none;
  vertical-align: middle;
  opacity: 0.6;
}
</style>
