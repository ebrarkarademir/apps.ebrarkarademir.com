<script setup>
import { computed } from 'vue'

// A meter of blocks, for the timers and tallies the games used to draw as [####....]: `bar` is
// that same string, a block lit for each '#'. Lit blocks turn from the `color` to red when
// `warn` is set (time running out).
const props = defineProps({
  bar: { type: String, required: true },
  color: { type: String, default: 'var(--color-lime)' },
  warn: { type: Boolean, default: false }
})

// '#' is a lit block; '@' a gold one (the answer, once it's found)
const cells = computed(() => [...props.bar].map(ch => (ch === '@' ? 'var(--color-gold)' : ch === '#' ? true : false)))
</script>

<template>
  <span class="pixel-bar" aria-hidden="true">
    <span
      v-for="(on, i) in cells"
      :key="i"
      class="seg"
      :style="on ? { background: typeof on === 'string' ? on : warn ? 'var(--color-red)' : color } : null"
    ></span>
  </span>
</template>

<style scoped>
.pixel-bar {
  display: flex;
  gap: 2px;
  width: 100%;
  height: 0.85rem;
  padding: 2px;
  background: var(--color-well);
}
.seg {
  flex: 1 1 0;
  min-width: 0;
  background: var(--color-term-deep);
  box-shadow: inset 0 -2px 0 0 rgb(0 0 0 / 0.25);
}
</style>
