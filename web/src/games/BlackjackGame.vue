<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import TermWindow from '../components/TermWindow.vue'
import OnlineRoom from '../online/OnlineRoom.vue'
import { useOnlineRoom, currentRoom } from '../online/useOnlineRoom'
import { useLocalRoom, LOCAL_ID } from '../online/useLocalRoom'
import BlackjackStage from './blackjack/BlackjackStage.vue'
import ChipsPanel from './blackjack/ChipsPanel.vue'
import { money } from './blackjack/chips'
import { RULES } from './blackjack/table.js'
import { initialState, onAction, onTick, onJoin, onLeave, project, loadChips, saveChips, refill } from './blackjack/room'
import { profile as siteProfile } from '../online/profile'

// Blackjack against the dealer: solo, or at one table of up to five in an online room, like
// the other online games, with no server of our own (see blackjack/room.js). Chips and stats
// stay on this device. The table takes the whole screen (see blackjack/BlackjackStage.vue),
// with side bets, emotes, the bar and gifts.
const props = defineProps({
  t: { type: Object, required: true },
  // Room code from a shared invite link
  initialCode: { type: String, default: '' },
  // Open a room straight away: a chat invite is waiting for its code
  hostRoom: { type: Boolean, default: false }
})

const emit = defineEmits(['go-back'])

const ERROR_MS = 3500
const SOLO_ART = ['.------.        ', '|A     |  .----', '|  /\\  |  |?   ', "'------'  '----"].join('\n')
const ONLINE_ART = [' o    o    o    o    o', '/|\\  /|\\  /|\\  /|\\  /|\\', '/ \\  / \\  / \\  / \\  / \\'].join('\n')
const cardClass = 'term-card group flex flex-col gap-2 sm:gap-3 p-3 sm:p-5 text-left min-w-0'

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const nameOf = () => siteProfile.name || props.t.bjYou

// null while choosing, then solo or online; an invite goes straight online
const mode = ref(props.initialCode || props.hostRoom || currentRoom.value?.game === 'blackjack' ? 'online' : null)

const room = useOnlineRoom({
  game: 'blackjack',
  initialCode: props.initialCode,
  hostRoom: props.hostRoom,
  initialState,
  project,
  onAction,
  onTick,
  onJoin,
  onLeave
})

const solo = useLocalRoom({ initialState, onAction, onTick })

// What this player sees of whichever room the page shows
const view = computed(() => (mode.value === 'solo' ? (solo.view ? project(solo.view, LOCAL_ID) : null) : room.view))
const act = (type, payload) => (mode.value === 'solo' ? solo.act(type, payload) : room.act(type, payload))

// The table with its countdown as a time on this device
const table = computed(() => {
  const shown = view.value?.table
  return shown ? { ...shown, deadline: shown.msLeft ? Date.now() + shown.msLeft : 0 } : null
})
const seated = computed(() => !!table.value?.seats.some(seat => seat?.me))
const myChips = computed(() => view.value?.me || { balance: 0, stats: {} })
const myId = computed(() => (mode.value === 'solo' ? LOCAL_ID : room.myId))
const names = computed(() => Object.fromEntries((view.value?.players || []).map(player => [player.id, player.name])))
// Everyone's avatar number, which says who they are at the table (see online/characters.js);
// this player's own from their profile, so a solo table has them too
const avs = computed(() => ({ ...Object.fromEntries((view.value?.players || []).map(player => [player.id, player.av])), [myId.value]: siteProfile.avatar }))

// ---------- Chips on this device ----------

// For the menu, read again whenever it shows
const chips = ref(loadChips())
watch(mode, (next) => {
  if (next === null) chips.value = loadChips()
})

function refillHere () {
  const err = refill(chips.value)
  if (err) showError(err)
  else saveChips(chips.value)
}

// Stakes still on the table: kept with the chips on this device, so a room that closes in the
// middle of a hand gives them back
const stake = computed(() => {
  const shown = table.value
  if (!shown || (shown.phase !== 'playing' && shown.phase !== 'dealer')) return 0
  const seat = shown.seats.find(s => s?.me)
  return seat ? seat.hands.filter(hand => !hand.outcome).reduce((sum, hand) => sum + hand.bet, 0) : 0
})

// The room's figure for this player is saved here as it changes
watch(() => {
  const me = view.value?.me
  return me ? JSON.stringify({ balance: me.balance + stake.value, stats: me.stats }) : ''
}, (json) => {
  if (json) saveChips(JSON.parse(json))
})

// Online, this player brings their chips to the room; asked again until the host has them
let askedAt = 0
watch(() => room.now, () => {
  if (mode.value !== 'online' || !room.view || room.view.me || Date.now() - askedAt < 2000) return
  askedAt = Date.now()
  room.act('wallet', { wallet: loadChips() })
})

// ---------- Errors ----------

const error = ref('')
let errorTimer = null

function showError (err) {
  error.value = err || 'unknown'
  clearTimeout(errorTimer)
  errorTimer = setTimeout(() => { error.value = '' }, ERROR_MS)
}

// The host notes what it refused this player
watch(() => view.value?.note?.n || 0, (n, old) => {
  if (n > (old || 0)) showError(view.value.note.err)
})

const errorText = computed(() => {
  if (!error.value) return ''
  const text = props.t[`bjErr_${error.value}`] || props.t.bjErr_unknown
  return fmt(text, { min: money(RULES.minBet), max: money(RULES.maxBet), sideMin: money(RULES.sideMin), sideMax: money(RULES.sideMax) })
})

onUnmounted(() => clearTimeout(errorTimer))

// ---------- Playing ----------

// The table shows a bet as it's being built until the room has it: at once on this device, or
// once the host's next state arrives. `key` says which: 'main', or a side bet ('pp', 't3').
function bet ({ key, amount }, done) {
  act('bet', { key, amount })
  if (mode.value === 'solo' || room.isHost) {
    nextTick(done)
    return
  }
  const timer = setTimeout(finish, 1500)
  const stop = watch(view, finish)
  function finish () {
    clearTimeout(timer)
    stop()
    done()
  }
}

function startSolo () {
  solo.open(nameOf(), { solo: true, wallets: { [LOCAL_ID]: loadChips() } })
  solo.act('start')
  mode.value = 'solo'
}

function leaveSolo () {
  solo.close()
  mode.value = null
}
</script>

<template>
  <!-- Your chips, and solo or online -->
  <TermWindow v-if="mode === null" class="max-w-4xl" :title="t.blackjackTitle" :backLabel="t.back" @back="emit('go-back')">
    <div class="space-y-4 sm:space-y-6">
      <p v-if="errorText" role="alert" class="flex gap-3 border border-dashed border-term px-4 py-2 text-sm">
        <span class="shrink-0 term-blink" aria-hidden="true">[!]</span>
        <span>{{ errorText }}</span>
      </p>

      <ChipsPanel :t="t" :wallet="chips" :name="nameOf()" @refill="refillHere" />

      <div class="grid grid-cols-2 gap-3 sm:gap-4">
        <button type="button" :class="cardClass" @click="startSolo">
          <span class="whitespace-pre text-[0.55rem] min-[400px]:text-xs sm:text-sm leading-tight overflow-hidden" aria-hidden="true">{{ SOLO_ART }}</span>
          <span class="font-display text-2xl sm:text-3xl leading-none uppercase">{{ t.gameSolo }}</span>
          <span class="term-muted text-xs sm:text-sm leading-relaxed">{{ t.bjPlaySoloHint }}</span>
          <span class="mt-auto flex items-center justify-end pt-1">
            <span class="text-xs sm:text-sm font-semibold uppercase tracking-widest term-muted group-hover:text-term" aria-hidden="true">&gt; run</span>
          </span>
        </button>

        <button type="button" :class="cardClass" @click="mode = 'online'">
          <span class="whitespace-pre text-[0.55rem] min-[400px]:text-xs sm:text-sm leading-tight overflow-hidden" aria-hidden="true">{{ ONLINE_ART }}</span>
          <span class="font-display text-2xl sm:text-3xl leading-none uppercase">{{ t.gameOnline }}</span>
          <span class="term-muted text-xs sm:text-sm leading-relaxed">{{ t.bjOpenTableHint }}</span>
          <span class="mt-auto flex items-center justify-end pt-1">
            <span class="text-xs sm:text-sm font-semibold uppercase tracking-widest term-muted group-hover:text-term" aria-hidden="true">&gt; run</span>
          </span>
        </button>
      </div>

      <p class="term-muted text-xs leading-relaxed text-center">{{ t.bjChipsNote }}</p>
    </div>
  </TermWindow>

  <!-- Solo: a table of your own -->
  <template v-else-if="mode === 'solo'">
    <BlackjackStage
      v-if="table"
      :t="t"
      :table="table"
      :profile="myChips"
      :social="view?.social"
      :names="names"
      :avs="avs"
      :my-id="myId"
      :exit-label="t.back"
      :error="errorText"
      @exit="leaveSolo"
      @bet="bet"
      @deal="act('ready')"
      @act="(action) => act('act', { action })"
      @refill="act('refill')"
      @emote="(k) => act('emote', { k })"
      @buy="(order) => act('buy', order)"
    />
  </template>

  <!-- Online: everyone in the room at one table -->
  <OnlineRoom
    v-else
    :room="room"
    :t="t"
    :title="t.blackjackTitle"
    wide
    @go-back="mode = null"
    @start="room.act('start')"
  >
    <template #lobby>
      <div class="space-y-4">
        <p v-if="errorText" role="alert" class="flex gap-3 border border-dashed border-term px-4 py-2 text-sm">
          <span class="shrink-0 term-blink" aria-hidden="true">[!]</span>
          <span>{{ errorText }}</span>
        </p>
        <ChipsPanel :t="t" :wallet="view?.me" :name="room.me?.name || ''" @refill="act('refill')" />
        <p class="term-muted text-sm leading-relaxed">&gt; {{ t.bjLobbyHint }}</p>
      </div>
    </template>

    <BlackjackStage
      v-if="table"
      :t="t"
      :table="table"
      :profile="myChips"
      :social="view?.social"
      :names="names"
      :avs="avs"
      :my-id="myId"
      :exit-label="t.onlineLeave"
      :can-lobby="room.isHost"
      :error="errorText"
      :watching="seated ? '' : t.bjWatching"
      online
      @exit="room.leave()"
      @lobby="room.act('lobby')"
      @bet="bet"
      @deal="act('ready')"
      @act="(action) => act('act', { action })"
      @refill="act('refill')"
      @emote="(k) => act('emote', { k })"
      @buy="(order) => act('buy', order)"
    />
  </OnlineRoom>
</template>
