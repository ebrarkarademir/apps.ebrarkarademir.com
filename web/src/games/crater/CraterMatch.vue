<script setup>
import { computed, watch, ref, onMounted, onUnmounted } from 'vue'
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
  resultMs: { type: Number, default: 1600 }, // after the last turn, before the results come up
  solo: { type: Boolean, default: false }
})

const emit = defineEmits(['exit', 'setup'])

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
// Each side's color, the same on every screen and from round to round
const colorOf = (side) => SIDE_COLORS[(view.value?.colors?.[side] ?? side) % SIDE_COLORS.length]
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
  }, props.resultMs)
}, { immediate: true })
onUnmounted(() => clearTimeout(resultTimer))

// A match is a few rounds in a row; the most round wins takes it, and a tie at the top is a draw
const rounds = computed(() => view.value?.rounds || 1)
const matchOver = computed(() => (view.value?.played || 0) >= rounds.value)

// Seconds until the next round of the match starts by itself
const nowMs = ref(Date.now())
let clockTimer = null
onMounted(() => { clockTimer = setInterval(() => { nowMs.value = Date.now() }, 250) })
onUnmounted(() => clearInterval(clockTimer))
const nextIn = computed(() => (view.value?.phase === 'over' && view.value.deadline ? Math.max(0, Math.ceil((view.value.deadline - nowMs.value) / 1000)) : null))

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
  // Over several rounds: which round this was, and at the end who took the match
  const heading = rounds.value > 1 ? fmt(props.t.tankRoundOf, { n: view.value.played, total: rounds.value }) : ''
  let match = ''
  if (rounds.value > 1 && matchOver.value) {
    const [first, second] = scores.value
    match = first?.wins && !(second && second.wins === first.wins) ? fmt(props.t.tankMatchWinner, { name: first.name }) : props.t.tankMatchDraw
  }
  return { title, line, heading, match, color: winner >= 0 ? colorOf(winner) : undefined }
})
// Every side's round wins in this match, the most first, with its kills this round
const scores = computed(() => (view.value?.sides || [])
  .map((id, side) => ({ side, name: names.value[side], wins: view.value.score?.[id] || 0, kills: view.value.kills?.[side] || 0 }))
  .sort((a, b) => b.wins - a.wins || b.kills - a.kills))
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
    :colors="view.colors || []"
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
          <p v-if="result.heading" class="mb-1 text-xs uppercase tracking-widest term-muted">{{ result.heading }}</p>
          <h2 class="font-display text-5xl leading-none uppercase" :style="{ color: result.color }">{{ result.title }}</h2>
          <p class="mt-2 text-sm term-muted">&gt; {{ result.line }}</p>
          <p v-if="result.match" class="mt-1 text-sm font-semibold">{{ result.match }}</p>
          <p v-if="nextIn !== null" class="mt-1 text-xs term-muted" role="status">{{ fmt(t.tankNextRoundIn, { s: nextIn }) }}</p>
          <div class="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-wider term-muted">
            <span class="flex-1 text-left">{{ t.onlinePlayers }}</span>
            <span class="w-10 text-right">{{ t.tankKills }}</span>
            <span class="w-10 text-right">{{ t.tankWins }}</span>
          </div>
          <ul class="mt-1 space-y-1 text-sm text-left">
            <li v-for="entry in scores" :key="entry.side" class="flex items-center gap-2" :style="{ color: colorOf(entry.side) }">
              <span class="swatch" :style="{ background: colorOf(entry.side) }" aria-hidden="true"></span>
              <span :class="['flex-1 truncate', { 'font-semibold underline underline-offset-2': entry.side === mySide }]">{{ entry.name }}</span>
              <span class="w-10 text-right tabular-nums">{{ entry.kills }}</span>
              <span class="w-10 text-right font-display text-2xl leading-none tabular-nums">{{ entry.wins }}</span>
            </li>
          </ul>
          <template v-if="room.isHost">
            <button type="button" class="term-btn term-btn-primary w-full mt-5" :disabled="fighters < 2" @click="room.act('start')">{{ matchOver ? (rounds > 1 ? t.playAgain : t.craterRematch) : t.tankNextRoundNow }}</button>
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

<style scoped>
/* Each side's color, as it is on the battlefield */
.swatch {
  flex-shrink: 0;
  width: 0.7rem;
  height: 0.7rem;
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.6);
}
</style>
