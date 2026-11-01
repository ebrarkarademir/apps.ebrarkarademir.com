<script setup>
import { computed, watch, ref, onUnmounted } from 'vue'
import confetti from 'canvas-confetti'
import { recordWin } from '../../online/profile'
import CraterStage from './CraterStage.vue'
import { SIDE_COLORS } from './renderer'

// A match of Crater Duel and its result, the same for a solo game against bots and an online
// room. `room` is either room (useOnlineRoom or useLocalRoom); the rules are in CraterGame.

const props = defineProps({
  t: { type: Object, required: true },
  room: { type: Object, required: true },
  live: { type: Object, required: true },
  suddenTurn: { type: Number, required: true },
  solo: { type: Boolean, default: false }
})

const emit = defineEmits(['exit', 'setup'])

const RESULT_MS = 1600

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')

const view = computed(() => props.room.view)
const onField = computed(() => ['aim', 'resolve', 'over'].includes(view.value?.phase))
// People by their names, bots by a name in this device's language
const nameOf = (id) => {
  const bot = view.value?.bots?.find(b => b.id === id)
  if (bot) return fmt(props.t.botName, { n: bot.n })
  return view.value?.players.find(p => p.id === id)?.name || '?'
}
const names = computed(() => (view.value?.sides || []).map(nameOf))
const mySide = computed(() => view.value?.sides?.indexOf(props.room.myId) ?? -1)
const fighters = computed(() => (view.value ? view.value.players.filter(p => p.online).length + (view.value.bots?.length || 0) : 0))

// The result comes up after the last turn has played out
const resultShown = ref(false)
let resultTimer = null
watch(() => (view.value?.phase === 'over' ? view.value.round : 0), (round) => {
  clearTimeout(resultTimer)
  resultShown.value = false
  if (!round) return
  resultTimer = setTimeout(() => {
    resultShown.value = true
    if (view.value?.outcome?.winner === mySide.value && mySide.value >= 0) {
      recordWin('crater')
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ['#00ff00', '#ffb000', '#f2f6ea'], shapes: ['square'] })
    }
  }, RESULT_MS)
}, { immediate: true })
onUnmounted(() => clearTimeout(resultTimer))

const result = computed(() => {
  const outcome = view.value?.outcome
  if (!outcome) return null
  const { winner, reason } = outcome
  const title = winner < 0
    ? props.t.craterDraw
    : mySide.value < 0
      ? fmt(props.t.craterWins, { name: names.value[winner] })
      : winner === mySide.value ? props.t.craterVictory : props.t.craterDefeat
  const others = names.value.filter((_, side) => side !== winner)
  const line = winner < 0
    ? props.t.craterDrawLine
    : reason === 'left' && others.length === 1 ? fmt(props.t.craterLeft, { name: others[0] }) : fmt(props.t.craterWins, { name: names.value[winner] })
  return { title, line, color: winner >= 0 ? SIDE_COLORS[winner] : undefined }
})
// Every side's wins in this room, the most first
const scores = computed(() => (view.value?.sides || [])
  .map((id, side) => ({ side, name: names.value[side], wins: view.value.score?.[id] || 0 }))
  .sort((a, b) => b.wins - a.wins))
</script>

<template>
  <CraterStage
    v-if="onField"
    :t="t"
    :title="t.craterTitle"
    :exitLabel="solo ? t.gameQuit : t.onlineLeave"
    :phase="view.phase"
    :turn="view.turn"
    :seed="view.seed"
    :level="view.mapLevel"
    :ammo="view.ammo"
    :craters="view.craters"
    :units="view.units"
    :mySide="mySide"
    :names="names"
    :wind="view.wind"
    :water="view.water"
    :sudden="view.turn >= suddenTurn"
    :deadline="view.deadline || 0"
    :locked="view.locked"
    :replay="view.replay"
    :live="live"
    @exit="emit('exit')"
    @fire="room.act('fire', $event)"
    @walk="room.sendLive($event)"
  >
    <template #overlay>
      <div v-if="result && resultShown" class="absolute inset-0 z-20 flex items-center justify-center p-3 bg-black/60">
        <div class="term-window w-full max-w-xs max-h-full overflow-y-auto p-5 text-center" role="dialog" aria-modal="false" :aria-label="result.title">
          <h2 class="font-display text-5xl leading-none uppercase" :style="{ color: result.color }">{{ result.title }}</h2>
          <p class="mt-2 text-sm term-muted">&gt; {{ result.line }}</p>
          <ul class="mt-4 space-y-1 text-sm text-left">
            <li v-for="entry in scores" :key="entry.side" class="flex items-center gap-2" :style="{ color: SIDE_COLORS[entry.side] }">
              <span :class="['flex-1 truncate', { 'font-semibold underline underline-offset-2': entry.side === mySide }]">{{ entry.name }}</span>
              <span class="font-display text-2xl leading-none tabular-nums">{{ entry.wins }}</span>
            </li>
          </ul>
          <template v-if="room.isHost">
            <button type="button" class="term-btn term-btn-primary w-full mt-5" :disabled="fighters < 2" @click="room.act('start')">{{ t.craterRematch }}</button>
            <p class="mt-1 text-xs term-muted">{{ fighters < 2 ? fmt(t.onlineNeedPlayers, { n: 2 }) : t.craterRematchHint }}</p>
            <button v-if="solo" type="button" class="term-btn w-full mt-3" @click="emit('setup')">{{ t.gameChangeSetup }}</button>
            <button v-else type="button" class="term-btn w-full mt-3" @click="room.act('lobby')">{{ t.onlineBackToLobby }}</button>
          </template>
          <p v-else class="mt-5 term-muted text-sm"><span class="term-cursor">{{ t.onlineWaitingHost }}</span></p>
        </div>
      </div>
    </template>
  </CraterStage>
</template>
