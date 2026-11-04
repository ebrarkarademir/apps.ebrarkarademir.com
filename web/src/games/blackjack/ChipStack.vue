<script setup>
import { computed } from 'vue'
import { CHIP_LOOKS } from './chips'

// A stack of casino chips for an amount (cents), biggest chips at the bottom, with the amount
// under it. Each chip has its colour by value and the striped edge of a real one.
const props = defineProps({
  amount: { type: Number, default: 0 },
  label: { type: String, default: '' },
  // The most chips drawn, for a small spot
  max: { type: Number, default: 8 }
})

const VALUES = [100000000, 10000000, 2500000, 500000, 100000, 50000, 10000, 2500, 500]
const RISE = 3 // px each chip sits above the one under it

const chips = computed(() => {
  let left = props.amount
  const list = []
  for (const value of VALUES) {
    while (left >= value && list.length < 40) {
      list.push(value)
      left -= value
    }
  }
  return list.slice(0, props.max).reverse()
})
</script>

<template>
  <span v-if="amount > 0" class="stack">
    <span class="chips" :style="{ '--rise': `${(max - 1) * RISE}px` }" aria-hidden="true">
      <span
        v-for="(value, i) in chips"
        :key="i"
        class="chip"
        :style="{ '--face': CHIP_LOOKS[value].face, '--edge': CHIP_LOOKS[value].edge, bottom: `${i * RISE}px` }"
      ></span>
    </span>
    <span v-if="label" class="amount">{{ label }}</span>
  </span>
</template>

<style scoped>
.stack {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.chips {
  position: relative;
  width: var(--chip, 30px);
  height: calc(var(--chip, 30px) + var(--rise, 21px));
}

.chip {
  position: absolute;
  left: 0;
  width: var(--chip, 30px);
  height: var(--chip, 30px);
  border-radius: 9999px;
  background:
    radial-gradient(circle, var(--face) 0 52%, transparent 53%),
    repeating-conic-gradient(var(--edge) 0 15deg, var(--face) 15deg 45deg);
  box-shadow: 0 2px 0 rgb(0 0 0 / 0.45), inset 0 0 0 2px rgb(0 0 0 / 0.25);
}

.amount {
  padding: 1px 6px;
  border-radius: 9999px;
  background: rgb(0 0 0 / 0.55);
  color: #fdf6e3;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
  white-space: nowrap;
  text-shadow: none;
}
</style>
