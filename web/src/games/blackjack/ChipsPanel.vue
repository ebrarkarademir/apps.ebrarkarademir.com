<script setup>
import { computed } from 'vue'
import { money } from './chips'
import { RULES } from './table.js'

// A player's balance and Blackjack stats, with a refill when they're out of chips
const props = defineProps({
  t: { type: Object, required: true },
  wallet: { type: Object, default: null }, // { balance, stats }
  name: { type: String, default: '' }
})

const emit = defineEmits(['refill'])

const stats = computed(() => props.wallet?.stats || {})
const winRate = computed(() => {
  const decided = (stats.value.wins || 0) + (stats.value.losses || 0)
  return decided ? `${Math.round(((stats.value.wins || 0) / decided) * 100)}%` : '–'
})
const rows = computed(() => [
  { label: props.t.bjStatHands, value: stats.value.hands || 0 },
  { label: props.t.bjStatWinRate, value: winRate.value },
  { label: props.t.bjStatBlackjacks, value: stats.value.blackjacks || 0 },
  { label: props.t.bjStatBiggest, value: money(stats.value.biggestWin || 0) },
  { label: props.t.bjStatNet, value: money(stats.value.net || 0, { sign: true }) },
  { label: props.t.bjStatPeak, value: money(stats.value.peak || 0) },
  { label: props.t.bjStatPushes, value: stats.value.pushes || 0 },
  { label: props.t.bjStatBusts, value: stats.value.busts || 0 },
  { label: props.t.bjStatRefills, value: stats.value.refills || 0 }
])
const broke = computed(() => props.wallet && props.wallet.balance < RULES.minBet)
</script>

<template>
  <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
    <section class="term-panel border-term p-4 text-center flex flex-col justify-center" aria-labelledby="bj-balance">
      <h2 id="bj-balance" class="term-label">{{ t.bjBalance }}</h2>
      <p class="font-display text-6xl leading-none my-2 tabular-nums">{{ money(wallet?.balance || 0) }}</p>
      <p v-if="name" class="term-muted text-xs">{{ name }}</p>
      <div v-if="broke" class="mt-3 flex flex-col items-center gap-2">
        <span class="text-sm font-semibold">{{ t.bjBroke }}</span>
        <button type="button" class="term-btn term-btn-primary min-h-10" @click="emit('refill')">{{ t.bjRefill }}</button>
      </div>
    </section>

    <section class="term-panel p-4" aria-labelledby="bj-stats">
      <h2 id="bj-stats" class="term-label mb-3">{{ t.bjStats }}</h2>
      <dl class="grid grid-cols-3 gap-x-3 gap-y-3">
        <div v-for="row in rows" :key="row.label" class="min-w-0">
          <dt class="text-[10px] uppercase tracking-wider term-muted truncate">{{ row.label }}</dt>
          <dd class="font-display text-2xl leading-none tabular-nums truncate">{{ row.value }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>
