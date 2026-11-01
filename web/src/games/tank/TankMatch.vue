<script setup>
import { ref, computed, watch } from 'vue'
import confetti from 'canvas-confetti'
import TermWindow from '../../components/TermWindow.vue'
import TankStage from './TankStage.vue'
import { ARMOR } from './engine'

// A round of Tank and its results, the same for a solo game against bots and an online room.
// `room` is either room (useOnlineRoom or useLocalRoom); its host-side rules are in TankGame.

const props = defineProps({
  t: { type: Object, required: true },
  room: { type: Object, required: true },
  live: { type: Object, required: true },
  inbox: { type: Array, required: true },
  solo: { type: Boolean, default: false }
})

const emit = defineEmits(['exit', 'setup'])

const WINNER_ART = ['  \\|/', ' #=#=#', ' [(@)]=-', ' #=#=#'].join('\n')

// How a tank came out of the round, in words: intact, scratched, battered, burning or wrecked
const conditionText = (entry) => props.t[`tankState${entry.alive ? Math.max(0, Math.min(3, ARMOR - entry.hp)) : 4}`]
const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')

const view = computed(() => props.room.view)
const inArena = computed(() => ['countdown', 'playing', 'ending'].includes(view.value?.phase))
// People by their names, bots by a name in this device's language
const names = computed(() => {
  const list = Object.fromEntries((view.value?.players || []).map(p => [p.id, p.name]))
  for (const [id, tank] of Object.entries(view.value?.tanks || {})) if (tank.bot) list[id] = fmt(props.t.botName, { n: tank.bot })
  return list
})
// The host's device drives the bots
const drones = computed(() => (props.room.isHost ? Object.keys(view.value?.tanks || {}).filter(id => view.value.tanks[id].bot) : []))

// The deadline is the start while counting down and the end of the round once it's on. Only a
// page that saw the countdown fights in that round: one reloaded mid-round watches.
const startAt = ref(0)
const endsAt = ref(0)
const countedDown = ref(0) // round
watch(() => [view.value?.phase, view.value?.round, view.value?.deadline], ([phase, round, deadline]) => {
  if (phase === 'countdown' && deadline) {
    startAt.value = deadline
    endsAt.value = 0
    countedDown.value = round
  } else if (phase === 'playing' && deadline) {
    endsAt.value = deadline
  }
}, { immediate: true })
const fighter = computed(() => !!view.value?.tanks?.[props.room.myId] && countedDown.value === view.value.round)

// A fresh arena never sees shots from an earlier round
watch(() => view.value?.round, () => { props.inbox.length = 0 })

function onHit ({ target, by, sid, x, y, dmg, b }) {
  if (target) props.room.act('botHit', { id: target, by, dmg })
  else props.room.act('hit', { by, dmg })
  props.room.sendEvent({ k: 'hit', sid, x, y, ...(b ? { b: 1 } : {}) })
}

// A shell from this device (or one of the bots it drives) popped a gift
const onGrab = ({ gift, bot }) => props.room.act('grab', { gift, ...(bot ? { bot } : {}) })

const standings = computed(() => (view.value?.standings || []).map((entry, index) => ({
  ...entry,
  rank: index + 1,
  name: names.value[entry.id] || '?',
  wins: view.value.wins?.[entry.id] || 0
})))
const winner = computed(() => (view.value?.outcome?.winner ? standings.value.find(entry => entry.id === view.value.outcome.winner) : null))

watch(() => (view.value?.phase === 'results' ? view.value.round : 0), (round) => {
  if (round && winner.value?.id === props.room.myId) {
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ['#00ff00', '#00b300', '#007a00'], shapes: ['square'] })
  }
})

// Solo results sit in a window of their own; online ones in the room's
const frame = computed(() => (props.solo ? { is: TermWindow, attrs: { class: 'max-w-2xl', title: props.t.tankTitle, backLabel: props.t.back } } : { is: 'div', attrs: {} }))
</script>

<template>
  <TankStage
    v-if="inArena"
    :t="t"
    :title="t.tankTitle"
    :exitLabel="solo ? t.gameQuit : t.onlineLeave"
    :round="view.round"
    :map="view.map"
    :phase="view.phase"
    :startAt="startAt"
    :endsAt="endsAt"
    :fighter="fighter"
    :myId="room.myId"
    :tanks="view.tanks"
    :names="names"
    :live="live"
    :inbox="inbox"
    :gifts="view.gifts || []"
    :outcome="view.outcome"
    :drones="drones"
    :level="view.level"
    @exit="emit('exit')"
    @sample="room.sendLive($event)"
    @shot="room.sendEvent($event)"
    @hit="onHit"
    @grab="onGrab"
  />

  <!-- Round results -->
  <component :is="frame.is" v-else-if="view.phase === 'results'" v-bind="frame.attrs" @back="emit('setup')">
    <div class="space-y-6">
      <div class="text-center">
        <span class="inline-block whitespace-pre text-left text-sm leading-tight mb-3" aria-hidden="true">{{ WINNER_ART }}</span>
        <h2 class="font-display text-5xl leading-none uppercase">{{ fmt(t.tankRoundResults, { n: view.round }) }}</h2>
        <p class="term-muted mt-2">&gt; {{ winner ? fmt(t.tankWinner, { name: winner.name }) : t.tankDraw }}</p>
      </div>

      <div>
        <div class="flex items-center gap-3 px-4 pb-2 term-label">
          <span class="w-8">#</span>
          <span class="flex-1">{{ t.onlinePlayers }}</span>
          <span class="w-24 text-right">{{ t.tankCondition }}</span>
          <span class="w-12 text-right">{{ t.tankHits }}</span>
          <span class="w-12 text-right">{{ t.tankWins }}</span>
        </div>
        <ol class="border border-term-low divide-y divide-term-low">
          <li
            v-for="entry in standings"
            :key="entry.id"
            :class="['flex items-center gap-3 px-4 py-3', { 'term-inverse': winner && entry.id === winner.id, 'bg-term-deep': !(winner && entry.id === winner.id) && entry.id === room.myId }]"
          >
            <span class="w-8 tabular-nums font-semibold">#{{ entry.rank }}</span>
            <span :class="['flex-1 truncate', { 'font-semibold': entry.id === room.myId }]">{{ entry.name }}</span>
            <span class="w-24 text-right text-xs sm:text-sm font-semibold truncate">{{ conditionText(entry) }}</span>
            <span class="w-12 text-right tabular-nums">{{ entry.hits }}</span>
            <span class="w-12 text-right font-bold tabular-nums">{{ entry.wins }}</span>
          </li>
        </ol>
      </div>

      <template v-if="room.isHost">
        <button type="button" class="term-btn term-btn-primary w-full min-h-12" @click="room.act('start')">{{ t.playAgain }}</button>
        <button v-if="solo" type="button" class="term-btn w-full" @click="emit('setup')">{{ t.gameChangeSetup }}</button>
        <button v-else type="button" class="term-btn w-full" @click="room.act('lobby')">{{ t.onlineBackToLobby }}</button>
      </template>
      <p v-else class="term-muted text-center text-sm"><span class="term-cursor">{{ t.onlineWaitingHost }}</span></p>
    </div>
  </component>
</template>
