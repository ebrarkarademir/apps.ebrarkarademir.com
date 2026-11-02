<script setup>
import { ref, computed, watch } from 'vue'
import confetti from 'canvas-confetti'
import TermWindow from '../../components/TermWindow.vue'
import RaceStage from './RaceStage.vue'
import { CAR_COLORS } from './renderer.js'
import { TRACKS } from './track.js'
import { formatTime } from './race.js'
import { bestLap, offerLap } from './records.js'
import { recordWin } from '../../online/profile'

// A race of Neon Laps and its results, the same for a solo race against bots and an online
// room. `room` is either room (useOnlineRoom or useLocalRoom); its host-side rules are in
// room.js.

const props = defineProps({
  t: { type: Object, required: true },
  room: { type: Object, required: true },
  live: { type: Object, required: true },
  inbox: { type: Array, required: true },
  solo: { type: Boolean, default: false }
})

const emit = defineEmits(['exit', 'setup'])

const FLAG_ART = ['|#_#_#_#', '|_#_#_#_', '|#_#_#_#', '|', '|'].join('\n')

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')

const view = computed(() => props.room.view)
const cars = computed(() => view.value?.cars || {})
const colorOf = (id) => CAR_COLORS[(cars.value[id]?.color ?? 0) % CAR_COLORS.length]
const inRace = computed(() => ['countdown', 'racing', 'ending'].includes(view.value?.phase))
const trackId = computed(() => TRACKS[view.value?.track ?? 0]?.id || 'city')
const trackName = computed(() => props.t[`raceTrack_${trackId.value}`] || trackId.value)
// People by their names, bots by a name in this device's language
const names = computed(() => {
  const list = Object.fromEntries((view.value?.players || []).map(p => [p.id, p.name]))
  for (const [id, car] of Object.entries(cars.value)) if (car.bot) list[id] = fmt(props.t.botName, { n: car.bot })
  return list
})
// The host's device drives the bots
const drones = computed(() => (props.room.isHost ? Object.keys(cars.value).filter(id => cars.value[id].bot) : []))

// The deadline is the green light while counting down, and when the race is called off once
// it's on; that only shows after the winner is home. Only a page that saw the countdown drives
// in that race: one reloaded mid-race watches.
const startAt = ref(0)
const countedDown = ref(0) // round
const record = ref(0)
watch(() => [view.value?.phase, view.value?.round, view.value?.deadline], ([phase, round, deadline]) => {
  if (phase === 'countdown' && deadline) {
    startAt.value = deadline
    countedDown.value = round
    record.value = bestLap(trackId.value)
  }
}, { immediate: true })
const endsAt = computed(() => (view.value?.phase === 'racing' && view.value.order?.length ? view.value.deadline || 0 : 0))
const driver = computed(() => !!cars.value[props.room.myId] && countedDown.value === view.value?.round)
const winner = computed(() => {
  const first = view.value?.standings?.[0]
  return first?.place === 1 ? first.id : ''
})

function onHit ({ target, by, sid, x, y, b }) {
  props.room.act('hit', { by, ...(target ? { bot: target } : {}) })
  props.room.sendEvent({ k: 'hit', sid, x, y, ...(b ? { b: 1 } : {}) })
}

// ---------- Results ----------

const rows = computed(() => {
  const list = view.value?.standings || []
  const first = list.find(entry => entry.place === 1)
  return list.map((entry, i) => ({
    ...entry,
    rank: i + 1,
    name: names.value[entry.id] || '?',
    color: colorOf(entry.id),
    shown: entry.place
      ? (entry.place === 1 || !first ? formatTime(entry.time) : `+${formatTime(entry.time - first.time)}`)
      : entry.out ? props.t.raceOut : props.t.raceDnf,
    lap: entry.best ? formatTime(entry.best) : '-'
  }))
})

// A new best lap on this track for this device, and a win for the medals
const newRecord = ref(false)
watch(() => (view.value?.phase === 'results' ? view.value.round : 0), (round) => {
  if (!round) return
  const mine = (view.value.standings || []).find(entry => entry.id === props.room.myId)
  newRecord.value = !!mine?.best && offerLap(trackId.value, mine.best)
  if (mine?.place === 1) {
    recordWin('race')
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ['#00ff00', '#00b300', '#ffd23f'], shapes: ['square'] })
  }
}, { immediate: true })

// Solo results sit in a window of their own; online ones in the room's
const frame = computed(() => (props.solo ? { is: TermWindow, attrs: { class: 'max-w-2xl', title: props.t.raceTitle, backLabel: props.t.back } } : { is: 'div', attrs: {} }))
</script>

<template>
  <RaceStage
    v-if="inRace"
    :t="t"
    :title="`${t.raceTitle}: ${trackName}`"
    :exitLabel="solo ? t.gameQuit : t.onlineLeave"
    :round="view.round"
    :track="view.track"
    :laps="view.laps"
    :phase="view.phase"
    :startAt="startAt"
    :endsAt="endsAt"
    :driver="driver"
    :myId="room.myId"
    :cars="cars"
    :names="names"
    :live="live"
    :inbox="inbox"
    :pickups="view.pickups || []"
    :drones="drones"
    :level="view.level"
    :record="record"
    :winner="winner"
    @exit="emit('exit')"
    @sample="room.sendLive($event)"
    @shot="room.sendEvent($event)"
    @hit="onHit"
    @grab="room.act('grab', $event)"
    @gate="room.act('gate', $event)"
  />

  <!-- Race results -->
  <component :is="frame.is" v-else-if="view.phase === 'results'" v-bind="frame.attrs" @back="emit('setup')">
    <div class="space-y-6">
      <div class="text-center">
        <span class="inline-block whitespace-pre text-left text-sm leading-tight mb-3" aria-hidden="true">{{ FLAG_ART }}</span>
        <h2 class="font-display text-5xl leading-none uppercase">{{ t.raceResults }}</h2>
        <p class="term-muted mt-2">&gt; {{ trackName }} &middot; {{ fmt(t.raceLapsCount, { n: view.laps }) }}</p>
        <p v-if="newRecord" class="mt-2 font-semibold" style="color: #ffd23f">&gt; {{ t.raceNewRecordSaved }}</p>
      </div>

      <div>
        <div class="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 pb-2 term-label">
          <span class="w-7 sm:w-8">#</span>
          <span class="flex-1">{{ t.onlinePlayers }}</span>
          <span class="w-24 text-right">{{ t.raceTime }}</span>
          <span class="w-20 text-right max-sm:hidden">{{ t.raceBest }}</span>
        </div>
        <ol class="border border-term-low divide-y divide-term-low">
          <li
            v-for="row in rows"
            :key="row.id"
            :class="['flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3', { 'term-inverse': row.place === 1, 'bg-term-deep': row.place !== 1 && row.id === room.myId }]"
          >
            <span class="w-7 sm:w-8 tabular-nums font-semibold">#{{ row.rank }}</span>
            <span class="flex-1 min-w-0">
              <span :class="['flex items-center gap-2', { 'font-semibold': row.id === room.myId }]">
                <span class="swatch" :style="{ background: row.color }" aria-hidden="true"></span>
                <span class="truncate">{{ row.name }}</span>
              </span>
              <span class="sm:hidden block truncate text-xs opacity-75">{{ t.raceBest }} {{ row.lap }}</span>
            </span>
            <span class="w-24 text-right tabular-nums font-semibold">{{ row.shown }}</span>
            <span class="w-20 text-right tabular-nums max-sm:hidden">{{ row.lap }}</span>
          </li>
        </ol>
      </div>

      <template v-if="room.isHost">
        <button type="button" class="term-btn term-btn-primary w-full min-h-12" @click="room.act('start')">{{ t.raceAgain }}</button>
        <button v-if="solo" type="button" class="term-btn w-full" @click="emit('setup')">{{ t.gameChangeSetup }}</button>
        <button v-else type="button" class="term-btn w-full" @click="room.act('lobby')">{{ t.onlineBackToLobby }}</button>
      </template>
      <p v-else class="term-muted text-center text-sm"><span class="term-cursor">{{ t.onlineWaitingHost }}</span></p>
    </div>
  </component>
</template>

<style scoped>
/* Each car's color, as it was on the track */
.swatch {
  flex-shrink: 0;
  width: 0.7rem;
  height: 0.7rem;
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.6);
}
</style>
