<script setup>
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import ArcadeStage from '../ascii/ArcadeStage.vue'
import FullscreenButton from '../ascii/FullscreenButton.vue'
import { useFullscreen } from '../ascii/fullscreen'
import BlackjackTable from './BlackjackTable.vue'
import TableSheet from './TableSheet.vue'
import FlyingSprite from './FlyingSprite.vue'
import { itemUrl } from './pixels'
import { DEALER, itemOf } from './social'
import { sound } from '../ascii/sound'

// The table on a screen of its own, solo or online: the whole window (the whole screen, with the
// full-screen switch), whatever the device. Round the table it shows what the room's `social`
// feed says is happening: emotes popping up over seats, orders and gifts flying from the bar or
// from whoever sent them to the seat they're for, with a note of each at the top. The sheet for
// sending emotes and ordering slides up over it.
const props = defineProps({
  t: { type: Object, required: true },
  table: { type: Object, required: true },
  profile: { type: Object, required: true },
  social: { type: Object, default: null }, // { feed, items } from the room
  names: { type: Object, default: () => ({}) }, // player id -> name
  myId: { type: String, required: true },
  exitLabel: { type: String, required: true },
  canLobby: { type: Boolean, default: false },
  error: { type: String, default: '' },
  watching: { type: String, default: '' }
})

const emit = defineEmits(['exit', 'lobby', 'bet', 'deal', 'act', 'refill', 'emote', 'buy'])

const FRESH_MS = 3000 // older news than this isn't shown to a page that has just opened
const BUBBLE_MS = 2600
const TOAST_MS = 4200
const TOASTS_MAX = 3

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// ---------- Full screen ----------

const area = ref(null)
const { full, toggle: toggleFull } = useFullscreen(() => area.value?.closest('.arena'))

// ---------- Who's who ----------

function nameOf (id) {
  if (id === DEALER) return props.t.bjDealer
  if (id === props.myId) return props.t.bjYou
  return props.names[id] || props.table.seats.find(seat => seat?.pid === id)?.name || '?'
}

const mySeat = computed(() => props.table.seats.find(seat => seat?.me) || null)
// Who can be given something: this player (if seated), the dealer, and everyone else seated
const recipients = computed(() => {
  const list = []
  if (mySeat.value?.pid) list.push({ id: mySeat.value.pid, name: props.t.bjForMe })
  list.push({ id: DEALER, name: props.t.bjDealer })
  for (const seat of props.table.seats) if (seat && !seat.me && seat.pid) list.push({ id: seat.pid, name: seat.name })
  return list
})

// ---------- What's at each seat, with its time on this device ----------

const items = ref({})
watch(() => props.social?.items, (all) => {
  const now = Date.now()
  const next = {}
  for (const [id, list] of Object.entries(all || {})) next[id] = list.map(item => ({ ...item, until: now + item.left }))
  items.value = next
}, { immediate: true })

// ---------- The feed: each thing shown once, as it happens ----------

const bubbles = reactive({}) // player id or 'dealer' -> { k, id }
const toasts = ref([])
const flights = ref([])
const flying = reactive(new Set()) // items still on their way, not yet at their seat
const timers = new Set()

function later (fn, ms) {
  const timer = setTimeout(() => {
    timers.delete(timer)
    fn()
  }, ms)
  timers.add(timer)
}

onUnmounted(() => timers.forEach(clearTimeout))

let seen = 0
watch(() => props.social?.feed, (feed) => {
  if (!feed?.length) return
  // A new room numbers from the start again
  if (Math.max(...feed.map(event => event.n)) < seen) seen = 0
  for (const event of [...feed].sort((a, b) => a.n - b.n)) {
    if (event.n <= seen) continue
    seen = event.n
    if (event.age > FRESH_MS) continue
    if (event.type !== 'emote' && itemOf(event.k)) flying.add(event.n)
    later(() => show(event), Math.max(0, -event.age))
  }
}, { immediate: true })

function show (event) {
  if (event.type === 'emote') {
    bubbles[event.from] = { k: event.k, id: event.n }
    later(() => {
      if (bubbles[event.from]?.id === event.n) delete bubbles[event.from]
    }, BUBBLE_MS)
    sound.play('emote')
    return
  }
  const item = itemOf(event.k)
  if (!item) return
  const name = props.t[`bjItem_${event.k}`] || event.k
  const gift = event.type === 'gift'
  let text
  if (gift) text = fmt(props.t.bjToastGift, { from: nameOf(event.from), to: nameOf(event.to), item: name })
  else if (event.from === props.myId) text = fmt(props.t.bjToastOrderMe, { item: name })
  else text = fmt(props.t.bjToastOrder, { name: nameOf(event.from), item: name })
  toast({ id: event.n, icon: itemUrl(event.k), text, note: gift ? props.t[`bjGiftNote_${event.k}`] || '' : '' })
  fly(event)
}

function toast (entry) {
  toasts.value = [...toasts.value.slice(1 - TOASTS_MAX), entry]
  later(() => { toasts.value = toasts.value.filter(other => other.id !== entry.id) }, TOAST_MS)
}

// From the bar (off at the top left) for an order; from the giver's seat for a gift
function fly (event) {
  const root = area.value
  const box = root?.getBoundingClientRect()
  const seatOf = (id) => root?.querySelector(`[data-pid="${CSS.escape(id)}"]`)
  const target = seatOf(event.to)?.querySelector('[data-items]') || seatOf(event.to)
  if (!root || !target || reduceMotion) {
    landed(event.n)
    return
  }
  const middle = (rect) => ({ x: rect.left + rect.width / 2 - box.left, y: rect.top + rect.height / 2 - box.top })
  const giver = event.type === 'gift' ? seatOf(event.from) : null
  const from = giver ? middle(giver.getBoundingClientRect()) : { x: 28, y: 28 }
  flights.value.push({ id: event.n, src: itemUrl(event.k), from, to: middle(target.getBoundingClientRect()) })
}

function landed (id) {
  flights.value = flights.value.filter(flight => flight.id !== id)
  flying.delete(id)
  sound.play('clink')
}

// ---------- The sheet ----------

const sheet = ref(null) // { tab, to, cat, key }

function openSheet ({ tab = 'emote', to = '', cat = '', gift = false } = {}) {
  sound.unlock()
  let who = to
  if (!who && tab === 'bar') {
    const others = recipients.value.filter(r => r.id !== DEALER && r.id !== mySeat.value?.pid)
    who = gift ? (others[0]?.id || DEALER) : (mySeat.value?.pid || DEALER)
  }
  sheet.value = { tab, to: who, cat, key: Date.now() }
}

function sendEmote (k) {
  sheet.value = null
  emit('emote', k)
}

function buy (order) {
  sheet.value = null
  emit('buy', order)
}
</script>

<template>
  <ArcadeStage :t="t" :title="t.blackjackTitle" :exitLabel="exitLabel" :bare="full" @exit="emit('exit')">
    <template #actions>
      <button v-if="canLobby" type="button" class="term-icon-btn shrink-0 h-9 w-auto px-2 text-xs" :title="t.onlineBackToLobby" @click="emit('lobby')">
        [{{ t.bjLobbyShort }}]
      </button>
      <FullscreenButton :t="t" :full="full" @toggle="toggleFull" />
    </template>

    <div ref="area" :class="['stage', { 'is-full': full }]">
      <BlackjackTable
        :t="t"
        :table="table"
        :profile="profile"
        :items="items"
        :hidden="flying"
        :bubbles="bubbles"
        :name-of="nameOf"
        :keys="!sheet"
        :watching="watching"
        @bet="(bet, done) => emit('bet', bet, done)"
        @deal="emit('deal')"
        @act="(action) => emit('act', action)"
        @refill="emit('refill')"
        @social="openSheet"
      />

      <!-- In full screen there's no header: the way back out -->
      <FullscreenButton v-if="full" :t="t" full class="full-exit" @toggle="toggleFull" />

      <!-- What just happened at the bar -->
      <ul class="toasts" aria-live="polite">
        <li v-for="entry in toasts" :key="entry.id" class="toast">
          <img :src="entry.icon" alt="" draggable="false" />
          <span class="toast-text">
            <span>{{ entry.text }}</span>
            <span v-if="entry.note" class="toast-note">“{{ entry.note }}”</span>
          </span>
        </li>
      </ul>

      <p v-if="error" role="alert" class="stage-error">
        <span aria-hidden="true">[!]</span> {{ error }}
      </p>

      <FlyingSprite v-for="flight in flights" :key="flight.id" :src="flight.src" :from="flight.from" :to="flight.to" @done="landed(flight.id)" />

      <TableSheet
        v-if="sheet"
        :key="sheet.key"
        :t="t"
        :initial-tab="sheet.tab"
        :initial-to="sheet.to"
        :initial-cat="sheet.cat"
        :recipients="recipients"
        :balance="profile.balance"
        :rules="table.rules"
        @close="sheet = null"
        @emote="sendEmote"
        @buy="buy"
      />
    </div>
  </ArcadeStage>
</template>

<style scoped>
.stage {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  padding: 0.5rem;
  overflow: hidden;
}

.stage.is-full {
  padding: max(0.4rem, env(safe-area-inset-top)) max(0.4rem, env(safe-area-inset-right)) max(0.4rem, env(safe-area-inset-bottom)) max(0.4rem, env(safe-area-inset-left));
}

@media (min-width: 768px) {
  .stage {
    padding: 0.75rem 1rem 1rem;
  }
}

.full-exit {
  position: absolute;
  z-index: 20;
  left: 1.1rem;
  top: 1.1rem;
  background: rgb(0 0 0 / 0.7);
}

.toasts {
  position: absolute;
  z-index: 22;
  left: 50%;
  top: 0.9rem;
  transform: translateX(-50%);
  width: min(92%, 26rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  margin: 0;
  padding: 0;
  list-style: none;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  max-width: 100%;
  padding: 0.25rem 0.6rem 0.25rem 0.35rem;
  border: 1px solid rgb(233 197 90 / 0.6);
  background: rgb(0 0 0 / 0.82);
  color: #fdf6e3;
  font-size: 0.75rem;
  line-height: 1.3;
  text-shadow: none;
  animation: toast 4.2s ease both;
}

.toast img {
  flex: none;
  width: 1.75rem;
  height: 1.75rem;
  image-rendering: pixelated;
}

.toast-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.toast-text > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toast-note {
  color: #e9c55a;
  font-style: italic;
}

@keyframes toast {
  0% { transform: translateY(-8px); opacity: 0; }
  6%, 85% { transform: none; opacity: 1; }
  100% { opacity: 0; }
}

.stage-error {
  position: absolute;
  z-index: 23;
  left: 50%;
  bottom: 9rem;
  transform: translateX(-50%);
  width: max-content;
  max-width: 90%;
  padding: 0.4rem 0.75rem;
  border: 1px dashed var(--color-term);
  background: rgb(0 0 0 / 0.88);
  font-size: 0.85rem;
  text-align: center;
}

@media (orientation: landscape) and (max-height: 520px) {
  .stage-error {
    bottom: 1rem;
    left: calc(50% - 8rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .toast {
    animation: none;
  }
}
</style>
