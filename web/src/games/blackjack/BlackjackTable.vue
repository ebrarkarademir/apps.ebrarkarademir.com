<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import PlayingCard from './PlayingCard.vue'
import ChipStack from './ChipStack.vue'
import SeatItems from './SeatItems.vue'
import EmoteBubble from './EmoteBubble.vue'
import { CHIP_LOOKS, money, chipLabel } from './chips'
import { iconUrl, itemUrl } from './pixels'
import { DEALER } from './social'
import { sound } from '../ascii/sound'

// The table, sized to the screen it's on: dealer and shoe at the top, the seats round the curve of
// the felt, and under it (beside it on a phone held sideways) the dock with this player's chips,
// moves and the way to the emotes and the bar. Each seat has its main bet with the two side bets
// either side of it, and whatever its player has from the bar.
// Everything shown comes from the table view the host sent; every button only asks.
const props = defineProps({
  t: { type: Object, required: true },
  table: { type: Object, required: true },
  profile: { type: Object, required: true }, // { balance, stats }
  busy: { type: Boolean, default: false },
  items: { type: Object, default: () => ({}) }, // player id or 'dealer' -> [{ n, k, from, until }]
  hidden: { type: Object, default: null }, // numbers of items still flying in
  bubbles: { type: Object, default: () => ({}) }, // player id or 'dealer' -> { k, id }
  nameOf: { type: Function, default: (id) => id },
  keys: { type: Boolean, default: true }, // off while the sheet is open
  watching: { type: String, default: '' } // why this player has no seat
})

const emit = defineEmits(['bet', 'deal', 'act', 'refill', 'social'])

const STAGGER = 260 // ms between cards of one deal
const MOVES = [
  { action: 'hit', key: 'H', label: 'bjHit' },
  { action: 'stand', key: 'S', label: 'bjStand' },
  { action: 'double', key: 'D', label: 'bjDoubleDown' },
  { action: 'split', key: 'P', label: 'bjSplit' }
]
const OUTCOME_KEYS = { blackjack: 'bjBlackjack', win: 'bjWin', push: 'bjPush', lose: 'bjLose', bust: 'bjBust' }
const SPOTS = ['pp', 'main', 't3'] // left to right in front of a seat
const SPOT_NAMES = { pp: 'PP', main: '', t3: '21+3' }
const NO_BETS = Object.freeze({ main: 0, pp: 0, t3: 0 })

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')

// ---------- What's on the table ----------

const rules = computed(() => props.table.rules)
const seats = computed(() => props.table.seats)
const mine = computed(() => seats.value.findIndex(seat => seat?.me))
const mySeat = computed(() => (mine.value >= 0 ? seats.value[mine.value] : null))
const phase = computed(() => props.table.phase)
const turn = computed(() => props.table.turn)
const isMyTurn = computed(() => phase.value === 'playing' && turn.value?.seat === mine.value && mine.value >= 0)
const isTurn = (seat, hand) => phase.value === 'playing' && turn.value?.seat === seat && turn.value?.hand === hand
const turnName = computed(() => (turn.value ? seats.value[turn.value.seat]?.name || '' : ''))
// A host on an older version has no side bets
const hasSides = computed(() => !!rules.value.sideMax)
const spotsShown = computed(() => (hasSides.value ? SPOTS : ['main']))
// More than one player at the table: on a phone held upright, everything a little smaller
const crowded = computed(() => seats.value.filter(Boolean).length > 1)

// A clock for the countdowns, ticking while one runs
const now = ref(Date.now())
let clock = null
const msLeft = computed(() => (props.table.deadline ? Math.max(0, props.table.deadline - now.value) : 0))
const secondsLeft = computed(() => Math.ceil(msLeft.value / 1000))
// How much of the turn is left, against how long it was when it began
const timerTotal = ref(1)
watch(() => props.table.deadline, (deadline) => { timerTotal.value = Math.max(1, (deadline || 0) - Date.now()) }, { immediate: true })
const timerShare = computed(() => Math.min(1, msLeft.value / timerTotal.value))

// ---------- Dealing, card by card ----------

// Cards that are new to this page get delays in the order they were dealt, so a fresh deal
// goes round the table one card at a time. The side bets' results wait for those cards to land.
const delays = new Map()
let seenRound = -1
let seenCard = -1
const revealAt = ref(0)
watch(() => props.table, (view) => {
  if (view.round !== seenRound) {
    seenRound = view.round
    seenCard = -1
    revealAt.value = 0
  }
  const fresh = []
  const collect = (cards) => cards.forEach(card => { if (card.n > seenCard) fresh.push(card.n) })
  collect(view.dealer.cards)
  view.seats.forEach(seat => seat?.hands.forEach(hand => collect(hand.cards)))
  fresh.sort((a, b) => a - b).forEach((n, i) => delays.set(`${view.round}:${n}`, i * STAGGER))
  if (fresh.length) seenCard = Math.max(seenCard, ...fresh)
  if (view.phase !== 'betting' && !revealAt.value) revealAt.value = Date.now() + Math.max(0, fresh.length - 1) * STAGGER + 520
}, { immediate: true, flush: 'pre' })
const delayOf = (card) => delays.get(`${props.table.round}:${card.n}`) || 0
const cardKey = (card) => `${props.table.round}-${card.n}`
const sidesShown = computed(() => revealAt.value > 0 && now.value >= revealAt.value)

const shoe = ref(null)
const fromShoe = () => shoe.value?.getBoundingClientRect() || null

// ---------- Hands and results ----------

// A soft total reads both ways (7/17) while the hand can still change; a finished one just 17
const dealerTotal = computed(() => {
  const d = props.table.dealer
  if (!d.cards.length) return ''
  if (d.blackjack) return props.t.bjBlackjack
  if (d.bust) return `${d.total} · ${props.t.bjBust}`
  const open = d.cards.some(card => !card.c)
  return open && d.soft && d.total < 21 ? `${d.total - 10}/${d.total}` : String(d.total)
})

const handTotal = (hand) => {
  if (hand.blackjack) return 'BJ'
  if (hand.bust) return props.t.bjBust
  return !hand.done && hand.soft && hand.total < 21 ? `${hand.total - 10}/${hand.total}` : String(hand.total)
}

// What a seat's main bet has in front of it: the bet before the deal, the hands' stakes while
// they play, and once the round is settled what comes back (a lost bet is gone from the felt)
const stakeOf = (seat) => {
  if (!seat.hands.length) return seat.bet
  const key = phase.value === 'settled' ? 'payout' : 'bet'
  return seat.hands.reduce((sum, hand) => sum + hand[key], 0)
}

// This player's round, added up across their hands and side bets
const myResult = computed(() => {
  if (phase.value !== 'settled' || !mySeat.value?.hands.length) return null
  const hands = mySeat.value.hands
  const sides = mySeat.value.sides || []
  const net = hands.reduce((sum, hand) => sum + hand.payout - hand.bet, 0) + sides.reduce((sum, side) => sum + side.payout - side.bet, 0)
  const blackjack = hands.some(hand => hand.outcome === 'blackjack')
  let text
  if (blackjack && net > 0) text = fmt(props.t.bjResultBlackjack, { amount: money(net) })
  else if (net > 0) text = fmt(props.t.bjResultWin, { amount: money(net) })
  else if (net < 0) text = fmt(props.t.bjResultLose, { amount: money(-net) })
  else text = props.t.bjResultPush
  return { net, blackjack, text }
})

// The line in the middle of the felt
const centerText = computed(() => {
  if (phase.value === 'betting') {
    return props.table.deadline ? fmt(props.t.bjDealingIn, { n: secondsLeft.value }) : props.t.bjBetsOpen
  }
  if (phase.value === 'playing') return isMyTurn.value ? props.t.bjYourTurn : fmt(props.t.bjTheirTurn, { name: turnName.value })
  if (phase.value === 'dealer') return props.t.bjDealerTurn
  return myResult.value?.text || fmt(props.t.bjNextRound, { n: secondsLeft.value })
})

// ---------- Betting ----------

// Chips go on the main bet or on one of the side bets: tap its circle (or the button by the chips)
const target = ref('main')
const aimedAt = computed(() => (hasSides.value ? target.value : 'main'))
const canBetNow = computed(() => phase.value === 'betting' && !!mySeat.value && !mySeat.value.ready)

function aim (key) {
  if (!canBetNow.value || !spotsShown.value.includes(key)) return
  target.value = key
}

// Arrow keys move along the felt; the button by the chips goes round, main bet first
function aimBy (step) {
  aim(SPOTS[Math.max(0, Math.min(SPOTS.length - 1, SPOTS.indexOf(aimedAt.value) + step))])
}

const AIM_ORDER = ['main', 'pp', 't3']
const aimNext = () => aim(AIM_ORDER[(AIM_ORDER.indexOf(aimedAt.value) + 1) % AIM_ORDER.length])

// Quick clicks each add to the bets this page has, not to the last ones the host confirmed;
// once every request has its answer, the host's bets show again
const placed = computed(() => (mySeat.value ? { main: mySeat.value.bet, pp: mySeat.value.side?.pp || 0, t3: mySeat.value.side?.t3 || 0 } : NO_BETS))
const pending = ref(null)
let betsInFlight = 0
const shownBets = computed(() => pending.value || placed.value)
const shownTotal = computed(() => shownBets.value.main + shownBets.value.pp + shownBets.value.t3)

function sendBet (key, amount) {
  betsInFlight++
  emit('bet', { key, amount }, () => {
    if (--betsInFlight === 0) pending.value = null
  })
}

function setBets (next) {
  const before = shownBets.value
  pending.value = next
  // Taking the main bet back takes the side bets with it
  if (!next.main && before.main) {
    sendBet('main', 0)
    return
  }
  for (const key of ['main', 'pp', 't3']) if (next[key] !== before[key]) sendBet(key, next[key])
}

const limitOf = (key) => (key === 'main' ? rules.value.maxBet : rules.value.sideMax || 0)
const canAdd = (chip) => canBetNow.value &&
  shownBets.value[aimedAt.value] + chip <= limitOf(aimedAt.value) &&
  shownTotal.value + chip <= props.profile.balance

function addChip (chip) {
  if (!canAdd(chip)) return
  sound.unlock()
  sound.play('chip')
  setBets({ ...shownBets.value, [aimedAt.value]: shownBets.value[aimedAt.value] + chip })
}

function clearBets () {
  if (!canBetNow.value || !shownTotal.value) return
  setBets({ ...NO_BETS })
}

const canDeal = computed(() => canBetNow.value && pending.value === null && mySeat.value.bet >= rules.value.minBet)
const broke = computed(() => props.profile.balance < rules.value.minBet && !shownTotal.value && phase.value === 'betting')
const betHint = computed(() => {
  if (!mySeat.value) return ''
  if (mySeat.value.ready) return props.table.deadline ? fmt(props.t.bjDealingIn, { n: secondsLeft.value }) : props.t.bjWaitingOthers
  if (aimedAt.value !== 'main') return fmt(props.t.bjSideHint, { min: money(rules.value.sideMin), max: money(rules.value.sideMax) })
  if (mySeat.value.bet < rules.value.minBet) return fmt(props.t.bjMinBet, { min: money(rules.value.minBet), max: money(rules.value.maxBet) })
  if (props.table.deadline) return fmt(props.t.bjDealingIn, { n: secondsLeft.value })
  return hasSides.value ? props.t.bjSideTip : ''
})

function deal () {
  if (!canDeal.value) return
  sound.unlock()
  emit('deal')
}

function move (action) {
  if (!isMyTurn.value || !props.table.options[action] || props.busy) return
  sound.unlock()
  emit('act', action)
}

// The circles in front of a seat: what's on each, and how a side bet did once it's paid
function spotsOf (seat) {
  return spotsShown.value.map((key) => {
    if (phase.value === 'betting') {
      const amount = seat.me ? shownBets.value[key] : key === 'main' ? seat.bet : seat.side?.[key] || 0
      return { key, amount }
    }
    if (key === 'main') return { key, amount: stakeOf(seat) }
    const side = seat.sides?.find(s => s.key === key)
    if (!side) return { key, amount: 0 }
    if (!sidesShown.value) return { key, amount: side.bet }
    return side.kind ? { key, amount: side.payout, win: side } : { key, amount: 0, lost: true }
  })
}

const spotLabel = (spot) => {
  const name = spot.key === 'main' ? props.t.bjBet : spot.key === 'pp' ? props.t.bjSidePP : props.t.bjSide21
  return spot.amount ? `${name}: ${money(spot.amount)}` : name
}

// ---------- The social side ----------

const itemsOf = (id) => props.items[id] || []
// Emotes from people watching, who have no seat for them to show over
const railBubbles = computed(() => Object.entries(props.bubbles)
  .filter(([pid]) => pid !== DEALER && !seats.value.some(seat => seat?.pid === pid))
  .map(([pid, bubble]) => ({ pid, k: bubble.k, n: bubble.id })))
const giftTo = (id) => emit('social', { tab: 'bar', to: id, cat: id === DEALER ? 'drinks' : 'fun' })

// ---------- Sounds ----------

watch(() => `${props.table.round}:${phase.value}`, () => {
  const result = myResult.value
  if (!result) return
  sound.play(result.blackjack && result.net > 0 ? 'blackjack' : result.net > 0 ? 'win' : result.net < 0 ? 'lose' : 'chip')
})

watch(sidesShown, (shown) => {
  if (shown && mySeat.value?.sides?.some(side => side.payout > 0)) sound.play('win')
})

// ---------- Keys ----------

function onKey (event) {
  if (!props.keys || event.ctrlKey || event.metaKey || event.altKey || event.target.closest?.('input, textarea, select')) return
  const key = event.key.toLowerCase()
  const action = MOVES.find(m => m.key.toLowerCase() === key)?.action
  if (action && isMyTurn.value) {
    event.preventDefault()
    move(action)
  } else if ((key === 'enter' || key === ' ') && canDeal.value && !event.target.closest?.('button')) {
    event.preventDefault()
    deal()
  } else if (/^[1-4]$/.test(key) && phase.value === 'betting') {
    addChip(rules.value.chips[Number(key) - 1])
  } else if ((key === 'arrowleft' || key === 'arrowright') && canBetNow.value && hasSides.value) {
    event.preventDefault()
    aimBy(key === 'arrowleft' ? -1 : 1)
  } else if ((key === 'backspace' || key === 'c') && phase.value === 'betting') {
    clearBets()
  } else if (key === 'e') {
    emit('social', { tab: 'emote' })
  } else if (key === 'b') {
    emit('social', { tab: 'bar' })
  }
}

onMounted(() => {
  clock = setInterval(() => { now.value = Date.now() }, 200)
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  clearInterval(clock)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="bj">
    <div :class="['felt', { crowded }]">
      <!-- The shoe the cards come from, and how much of it is left -->
      <div ref="shoe" class="shoe" :title="`${table.shoe.left}`" aria-hidden="true">
        <span v-for="i in 3" :key="i" class="shoe-card" :style="{ transform: `translate(${(3 - i) * 3}px, ${(3 - i) * -2}px)` }"></span>
        <span class="shoe-count">{{ table.shoe.left }}</span>
      </div>

      <!-- Emotes from people watching -->
      <div v-if="railBubbles.length" class="rail">
        <EmoteBubble v-for="b in railBubbles" :key="`${b.pid}-${b.n}`" :k="b.k" :label="t[`bjEmote_${b.k}`]" :name="nameOf(b.pid)" />
      </div>

      <!-- The dealer, with whatever they've been given -->
      <section class="dealer" data-pid="dealer" :aria-label="t.bjDealer">
        <button type="button" class="who" :title="t.bjGiftDealer" @click="giftTo(DEALER)">{{ t.bjDealer }}</button>
        <div class="dealer-row">
          <SeatItems class="dealer-items" :t="t" :items="itemsOf(DEALER)" :now="now" :hidden="hidden" :name-of="nameOf" :max="4" />
          <div class="dealer-hand">
            <SeatItems class="over-items" :t="t" :items="itemsOf(DEALER)" :now="now" :hidden="hidden" :name-of="nameOf" :max="1" over />
            <div class="hand-cards dealer-cards" :style="{ '--n': table.dealer.cards.length }">
              <div v-for="(card, i) in table.dealer.cards" :key="cardKey(card)" class="slot" :style="{ '--i': i }">
                <PlayingCard :card="card.c" :delay="delayOf(card)" :origin="fromShoe" />
              </div>
            </div>
            <span v-if="bubbles.dealer" class="bubble-at dealer-bubble">
              <EmoteBubble :key="bubbles.dealer.id" :k="bubbles.dealer.k" :label="t[`bjEmote_${bubbles.dealer.k}`]" />
            </span>
          </div>
        </div>
        <span v-if="dealerTotal" :class="['total', { bust: table.dealer.bust, bj: table.dealer.blackjack }]">{{ dealerTotal }}</span>
      </section>

      <!-- The printing on the felt, and what's happening -->
      <div class="felt-mid">
        <svg class="arc" viewBox="0 0 600 90" aria-hidden="true">
          <path id="bj-arc" d="M 40 10 Q 300 110 560 10" fill="none" />
          <text><textPath href="#bj-arc" startOffset="50%" text-anchor="middle">{{ t.bjPaysArc }}</textPath></text>
        </svg>
        <p class="rule" aria-hidden="true">{{ t.bjDealerRule }}</p>
        <p class="center" role="status">
          <span :class="{ 'is-good': myResult?.net > 0, 'is-bad': myResult?.net < 0 }">{{ centerText }}</span>
        </p>
      </div>

      <!-- The seats round the curve -->
      <div class="seats" :style="{ '--seats': seats.length }">
        <div
          v-for="(seat, index) in seats"
          :key="index"
          :data-pid="seat?.pid"
          :class="['seat', `seat-${index}-of-${seats.length}`, { me: seat?.me, active: phase === 'playing' && turn?.seat === index, empty: !seat }]"
        >
          <template v-if="seat">
            <SeatItems class="over-items" :t="t" :items="itemsOf(seat.pid)" :now="now" :hidden="hidden" :name-of="nameOf" :max="1" over />

            <!-- An emote shows over the cards, or just over the bets before there are any -->
            <div :class="['hands', { bare: !seat.hands.length }]">
              <span v-if="bubbles[seat.pid]" class="bubble-at">
                <EmoteBubble :key="bubbles[seat.pid].id" :k="bubbles[seat.pid].k" :label="t[`bjEmote_${bubbles[seat.pid].k}`]" />
              </span>
              <div v-for="(hand, h) in seat.hands" :key="h" :class="['hand', { active: isTurn(index, h), done: phase === 'playing' && hand.done }]">
                <div class="hand-cards" :style="{ '--n': hand.cards.length }">
                  <div v-for="(card, i) in hand.cards" :key="cardKey(card)" class="slot" :style="{ '--i': i }">
                    <PlayingCard :card="card.c" :delay="delayOf(card)" :origin="fromShoe" />
                  </div>
                </div>
                <span :class="['total', { bust: hand.bust, bj: hand.blackjack }]">{{ handTotal(hand) }}<span v-if="hand.doubled"> ×2</span></span>
                <span v-if="hand.outcome" :class="['outcome', `is-${hand.outcome}`]">
                  {{ t[OUTCOME_KEYS[hand.outcome]] }}
                  <span class="outcome-amount">{{ money(hand.payout - hand.bet, { sign: true }) }}</span>
                </span>
              </div>
            </div>

            <div class="spots-row">
              <div class="spots">
                <component
                  :is="seat.me && canBetNow ? 'button' : 'div'"
                  v-for="spot in spotsOf(seat)"
                  :key="spot.key"
                  :type="seat.me && canBetNow ? 'button' : undefined"
                  :class="['spot', spot.key === 'main' ? 'main-spot' : 'side-spot', {
                    aimed: seat.me && canBetNow && hasSides && aimedAt === spot.key,
                    win: spot.win,
                    lost: spot.lost
                  }]"
                  :aria-label="seat.me ? spotLabel(spot) : undefined"
                  :aria-pressed="seat.me && canBetNow ? aimedAt === spot.key : undefined"
                  @click="seat.me && aim(spot.key)"
                >
                  <span v-if="SPOT_NAMES[spot.key]" class="spot-name" aria-hidden="true">{{ SPOT_NAMES[spot.key] }}</span>
                  <ChipStack :amount="spot.amount" :max="spot.key === 'main' ? 6 : 3" />
                  <span v-if="spot.win" class="spot-win">×{{ spot.win.odds }}</span>
                  <span v-if="spot.amount && (spot.key === 'main' || seat.me)" class="spot-amount">{{ money(spot.amount) }}</span>
                </component>
              </div>
              <SeatItems class="seat-items" :t="t" :items="itemsOf(seat.pid)" :now="now" :hidden="hidden" :name-of="nameOf" :max="seat.me ? 4 : 3" />
            </div>

            <component
              :is="seat.me ? 'p' : 'button'"
              :type="seat.me ? undefined : 'button'"
              class="plate"
              :title="seat.me ? undefined : fmt(t.bjGiftTo, { name: seat.name })"
              @click="!seat.me && giftTo(seat.pid)"
            >
              <span class="plate-name">{{ seat.me ? t.bjYou : seat.name }}</span>
              <span v-if="seat.away" class="plate-tag">{{ t.bjAway }}</span>
              <span v-else-if="phase === 'betting' && seat.ready" class="plate-tag is-ready">{{ t.bjReady }}</span>
              <span v-else-if="!seat.me" class="plate-gift" aria-hidden="true"><img :src="iconUrl('gift')" alt="" /></span>
            </component>
            <span v-if="phase === 'playing' && turn?.seat === index" class="turn-bar" aria-hidden="true"><span :style="{ width: `${timerShare * 100}%` }"></span></span>
          </template>
          <span v-else class="open-seat">{{ t.bjOpenSeat }}</span>
        </div>
      </div>
    </div>

    <!-- This player's chips and moves, and the way to the emotes and the bar -->
    <div class="dock">
      <div class="dock-inner">
        <p class="bank">
          <span class="bank-label">{{ t.bjBalance }}</span>
          <span class="bank-amount">{{ money(profile.balance) }}</span>
        </p>

        <div class="social" role="group" :aria-label="t.bjSocial">
          <button type="button" class="px-btn" :title="`${t.bjTab_emote} (E)`" :aria-label="t.bjTab_emote" @click="emit('social', { tab: 'emote' })">
            <img :src="iconUrl('laugh')" alt="" draggable="false" />
          </button>
          <button type="button" class="px-btn" :title="`${t.bjTab_bar} (B)`" :aria-label="t.bjTab_bar" @click="emit('social', { tab: 'bar' })">
            <img :src="itemUrl('beer')" alt="" draggable="false" />
          </button>
          <button type="button" class="px-btn" :title="t.bjGift" :aria-label="t.bjGift" @click="emit('social', { tab: 'bar', gift: true, cat: 'fun' })">
            <img :src="iconUrl('gift')" alt="" draggable="false" />
          </button>
          <button v-if="hasSides" type="button" class="px-btn px-text" :title="t.bjPaysTitle" :aria-label="t.bjPaysTitle" @click="emit('social', { tab: 'pays' })">x:1</button>
        </div>

        <div class="dock-main">
          <template v-if="phase === 'betting' && mySeat">
            <div v-if="broke" class="broke">
              <span>{{ t.bjBroke }}</span>
              <button type="button" class="term-btn term-btn-primary min-h-10" @click="emit('refill')">{{ t.bjRefill }}</button>
            </div>
            <div v-else class="bet-row">
              <button
                v-if="hasSides"
                type="button"
                class="aim-btn"
                :disabled="!canBetNow"
                :title="t.bjAimHint"
                :aria-label="`${t.bjAimHint}: ${aimedAt === 'main' ? t.bjBet : aimedAt === 'pp' ? t.bjSidePP : t.bjSide21}`"
                @click="aimNext"
              >
                <span class="aim-label">{{ t.bjAimOn }}</span>
                <span class="aim-value">{{ aimedAt === 'main' ? t.bjBet : SPOT_NAMES[aimedAt] }}</span>
              </button>
              <div class="tray" role="group" :aria-label="t.bjBet">
                <button
                  v-for="(chip, i) in rules.chips"
                  :key="chip"
                  type="button"
                  class="chip-button"
                  :style="{ '--face': CHIP_LOOKS[chip].face, '--edge': CHIP_LOOKS[chip].edge, '--ink': CHIP_LOOKS[chip].text }"
                  :disabled="!canAdd(chip)"
                  :aria-label="`${t.bjBet} ${money(chip)}`"
                  :title="`${money(chip)} (${i + 1})`"
                  @click="addChip(chip)"
                >
                  <span>{{ chipLabel(chip) }}</span>
                </button>
              </div>
              <button type="button" class="clear-btn" :disabled="!shownTotal || !canBetNow" :title="`${t.bjClear} (C)`" :aria-label="t.bjClear" @click="clearBets">
                <span aria-hidden="true">×</span>
              </button>
              <button type="button" class="term-btn term-btn-primary deal-btn" :disabled="!canDeal || busy" @click="deal">
                {{ t.bjDeal }} <span v-if="shownTotal">· {{ money(shownTotal) }}</span>
              </button>
            </div>
            <p class="hint">{{ betHint }}</p>
          </template>

          <template v-else-if="isMyTurn">
            <div class="moves">
              <button
                v-for="m in MOVES"
                :key="m.action"
                type="button"
                :class="['term-btn move', { 'term-btn-primary': m.action === 'hit' || m.action === 'stand' }]"
                :disabled="!table.options[m.action] || busy"
                @click="move(m.action)"
              >
                <span class="key" aria-hidden="true">{{ m.key }}</span> {{ t[m.label] }}
              </button>
            </div>
            <span class="turn-bar wide" aria-hidden="true"><span :style="{ width: `${timerShare * 100}%` }"></span></span>
          </template>

          <p v-else class="hint status">{{ mySeat ? centerText : watching || centerText }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bj {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  max-width: 82rem;
  height: 100%;
  margin: 0 auto;
}

/* ---------- The felt ----------
   Felt inside a padded rail with a gold line, straight along the dealer's side and curved round
   the players. Everything inside is sized by the felt's own width and height (container units),
   so the whole table fits on one screen, a phone's or a monitor's. */
.felt {
  container: felt / size;
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0.6rem 0.75rem 1rem;
  border: 12px solid #3a2414;
  border-radius: 28px 28px 50% 50% / 28px 28px 30% 30%;
  background:
    radial-gradient(ellipse at 50% 22%, rgb(255 255 255 / 0.08), transparent 60%),
    repeating-linear-gradient(45deg, rgb(0 0 0 / 0.035) 0 2px, transparent 2px 6px),
    radial-gradient(ellipse at 50% 35%, #1f7f4c 0%, #136036 55%, #0a3d22 100%);
  box-shadow: inset 0 0 0 3px #c9a227, inset 0 0 60px rgb(0 0 0 / 0.55), 0 12px 30px rgb(0 0 0 / 0.6), 0 0 0 1px #000;
  color: #fdf6e3;
  text-shadow: none;
  overflow: hidden;
}

@media (orientation: portrait) {
  .felt {
    padding: 0.5rem 0.4rem 0.8rem;
    border-width: 9px;
    border-radius: 22px 22px 40% 40% / 22px 22px 12% 12%;
  }
}

.shoe {
  position: absolute;
  top: 0.8rem;
  right: 1rem;
  width: 46px;
  height: 64px;
  z-index: 1;
}

.shoe-card {
  position: absolute;
  inset: 0;
  border-radius: 5px;
  border: 3px solid #f4f1e8;
  background:
    repeating-linear-gradient(45deg, rgb(255 215 120 / 0.28) 0 2px, transparent 2px 7px),
    linear-gradient(160deg, #a3132b, #6e0b1c);
  box-shadow: 0 2px 6px rgb(0 0 0 / 0.5);
}

.shoe-count {
  position: absolute;
  left: 50%;
  bottom: -18px;
  transform: translateX(-50%);
  font-size: 10px;
  color: rgb(253 246 227 / 0.7);
  font-variant-numeric: tabular-nums;
}

/* Bubbles from people watching, down the left of the felt */
.rail {
  position: absolute;
  left: 0.6rem;
  top: 2.6rem;
  z-index: 6;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

/* ---------- The dealer ---------- */

.dealer {
  --card-w: clamp(28px, 7vw, 78px);
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}

.who {
  padding: 0 0.5rem;
  font-size: 0.7rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: rgb(253 246 227 / 0.7);
}

.who:hover,
.who:focus-visible {
  color: #ffe58a;
}

.dealer-row {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

/* What the dealer's been given stands to the left of their cards, out of the way */
.dealer-items {
  --item: clamp(18px, 5cqh, 30px);
  position: absolute;
  right: calc(100% + 0.5rem);
  bottom: 0;
}

.dealer-hand {
  position: relative;
}

/* Cards in a hand overlap like a fan; the dealer's spread a little wider */
.hand-cards {
  --step: 0.44;
  position: relative;
  height: calc(var(--card-w) * 1.4);
  width: calc(var(--card-w) + var(--card-w) * var(--step) * (max(var(--n), 1) - 1));
}

.dealer-cards {
  --step: 0.62;
}

.slot {
  position: absolute;
  top: 0;
  left: calc(var(--card-w) * var(--step) * var(--i));
}

.total {
  padding: 0.05rem 0.55rem;
  border-radius: 9999px;
  background: rgb(0 0 0 / 0.55);
  font-size: 0.8rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.total.bust {
  background: #8b1a1a;
}

.total.bj {
  background: #c9a227;
  color: #1a1203;
}

/* An emote over a seat's cards, and over the dealer's cards on their right */
.bubble-at {
  --emote: clamp(34px, 9cqh, 52px);
  position: absolute;
  z-index: 8;
  width: max-content;
  left: 50%;
  bottom: calc(100% - 0.4rem);
  transform: translateX(-50%);
}

.dealer-bubble {
  left: 100%;
  bottom: 40%;
  transform: translateX(0.4rem);
}

/* ---------- The printing on the felt ---------- */

.felt-mid {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.arc {
  display: block;
  width: min(100%, 560px);
  max-height: 13cqh;
  margin: 0 auto;
  fill: rgb(233 197 90 / 0.75);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 24px;
  letter-spacing: 0.18em;
}

.rule {
  margin-top: -0.3rem;
  text-align: center;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 0.68rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: rgb(253 246 227 / 0.45);
}

.center {
  min-height: 1.5rem;
  margin: 0.35rem 0;
  text-align: center;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.center .is-good {
  color: #ffe58a;
}

.center .is-bad {
  color: #ffb3b3;
}

/* ---------- The seats, along the curve: the outer ones sit higher ---------- */

.seats {
  flex: none;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 0.5rem;
}

.seat {
  --card-w: clamp(24px, 4.4vw, 58px);
  --spot: clamp(2.4rem, 4.6vw, 3.6rem);
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  max-width: 16rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.2rem 0.45rem;
  border-radius: 14px;
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

.seat.me {
  --card-w: clamp(32px, 5.6vw, 68px);
  --spot: clamp(2.8rem, 5.4vw, 4rem);
}

.seat-0-of-5, .seat-4-of-5 { transform: translateY(-2.6rem); }
.seat-1-of-5, .seat-3-of-5 { transform: translateY(-0.8rem); }

.seat.active {
  background: rgb(255 229 138 / 0.08);
  box-shadow: 0 0 0 2px rgb(255 229 138 / 0.6), 0 0 18px rgb(255 229 138 / 0.25);
}

.seat.empty {
  align-self: flex-end;
}

.open-seat {
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--spot) * 1.15);
  height: calc(var(--spot) * 1.15);
  border: 2px dashed rgb(253 246 227 / 0.25);
  border-radius: 9999px;
  font-size: 0.55rem;
  text-align: center;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(253 246 227 / 0.4);
}

.hands {
  position: relative;
  display: flex;
  justify-content: center;
  gap: 0.4rem;
  min-height: calc(var(--card-w) * 1.4 + 1.5rem);
}

.hands.bare .bubble-at {
  bottom: 0;
}

.hand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem;
  border-radius: 8px;
  transition: opacity 0.2s ease;
}

.hand.active {
  box-shadow: 0 0 0 2px #ffe58a;
}

.seat.active .hand.done {
  opacity: 0.6;
}

.outcome {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 0.1rem 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  animation: pop 0.35s cubic-bezier(0.2, 1.6, 0.4, 1);
}

.outcome-amount {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}

.outcome.is-blackjack, .outcome.is-win {
  background: #c9a227;
  color: #1a1203;
}

.outcome.is-push {
  background: rgb(253 246 227 / 0.85);
  color: #1a1a1a;
}

.outcome.is-lose, .outcome.is-bust {
  background: #7d1616;
  color: #ffe4e4;
}

@keyframes pop {
  from { transform: scale(0.4); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* A cloud someone sent hangs over the seat */
.over-items {
  --item-over: clamp(30px, 10cqh, 56px);
  position: absolute;
  z-index: 7;
  left: 50%;
  top: -0.4rem;
  transform: translateX(-50%);
  pointer-events: none;
}

/* ---------- The betting circles: the main bet, a side bet either side ---------- */

.spots-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: center;
  gap: 0.2rem 0.4rem;
  max-width: 100%;
}

.spots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
}

.spot {
  --chip: calc(var(--size) * 0.44);
  --size: var(--spot);
  position: relative;
  flex: none;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: var(--size);
  height: var(--size);
  padding-bottom: calc(var(--size) * 0.12);
  border: 2px solid rgb(233 197 90 / 0.45);
  border-radius: 9999px;
  color: inherit;
  transition: box-shadow 0.15s ease, border-color 0.15s ease, opacity 0.3s ease;
}

.side-spot {
  --size: calc(var(--spot) * 0.68);
  border-style: dashed;
  align-self: flex-end;
}

.spot-name {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: calc(var(--size) * 0.26);
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgb(233 197 90 / 0.6);
  pointer-events: none;
}

button.spot {
  cursor: pointer;
}

button.spot:hover {
  border-color: rgb(255 229 138 / 0.8);
}

.spot.aimed {
  border-style: solid;
  border-color: #ffe58a;
  box-shadow: 0 0 0 2px rgb(255 229 138 / 0.35), 0 0 14px rgb(255 229 138 / 0.5);
}

.spot.win {
  border-style: solid;
  border-color: #ffe58a;
  box-shadow: 0 0 16px rgb(255 229 138 / 0.7);
  animation: pop 0.4s cubic-bezier(0.2, 1.6, 0.4, 1);
}

.spot.lost {
  opacity: 0.45;
}

.spot-amount {
  position: absolute;
  left: 50%;
  top: calc(100% + 1px);
  transform: translateX(-50%);
  padding: 0 0.3rem;
  border-radius: 9999px;
  background: rgb(0 0 0 / 0.55);
  color: #fdf6e3;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1.35;
  white-space: nowrap;
  pointer-events: none;
}

.spot-win {
  position: absolute;
  z-index: 2;
  top: -0.55rem;
  right: -0.55rem;
  padding: 0 0.25rem;
  border-radius: 4px;
  background: #ffe58a;
  color: #1a1203;
  font-size: 0.68rem;
  font-weight: 800;
  line-height: 1.4;
  animation: pop 0.4s cubic-bezier(0.2, 1.6, 0.4, 1);
}

/* What someone has from the bar, beside their bets */
.seat-items {
  --item: clamp(16px, 5cqh, 28px);
  min-height: 0;
}

.seat.me .seat-items {
  --item: clamp(20px, 6.2cqh, 34px);
}

.plate {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  max-width: 100%;
  margin-top: 0.75rem;
  padding: 0.1rem 0.6rem;
  border-radius: 9999px;
  background: rgb(0 0 0 / 0.45);
  color: #fdf6e3;
  font-size: 0.75rem;
  font-weight: 700;
}

button.plate:hover,
button.plate:focus-visible {
  background: rgb(0 0 0 / 0.7);
  box-shadow: 0 0 0 1px #e9c55a;
}

.seat.me .plate {
  background: #c9a227;
  color: #1a1203;
}

.plate-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plate-tag {
  font-size: 0.6rem;
  text-transform: uppercase;
  opacity: 0.75;
}

.plate-tag.is-ready {
  color: #8ff0a4;
  opacity: 1;
}

.plate-gift {
  display: flex;
  opacity: 0.75;
}

.plate-gift img {
  width: 0.9rem;
  height: 0.9rem;
  image-rendering: pixelated;
}

.turn-bar {
  display: block;
  width: 80%;
  height: 4px;
  border-radius: 9999px;
  background: rgb(0 0 0 / 0.4);
  overflow: hidden;
}

.turn-bar > span {
  display: block;
  height: 100%;
  background: #ffe58a;
  transition: width 0.2s linear;
}

.turn-bar.wide {
  width: 100%;
  height: 6px;
}

/* ---------- Sizes that follow the felt ---------- */

/* Each seat's share of the width goes by how many seats the table has */
@supports (container-type: size) {
  .dealer { --card-w: clamp(26px, min(7.5cqw, 12.5cqh), 80px); }
  .seat { --card-w: clamp(20px, min(calc(23cqw / var(--seats, 5)), 9cqh), 60px); --spot: clamp(2.1rem, min(calc(25cqw / var(--seats, 5)), 9.5cqh), 3.6rem); }
  .seat.me { --card-w: clamp(28px, min(calc(29cqw / var(--seats, 5)), 12cqh), 72px); --spot: clamp(2.5rem, min(calc(30cqw / var(--seats, 5)), 11cqh), 4.2rem); }
  .seat-0-of-5, .seat-4-of-5 { transform: translateY(-5cqh); }
  .seat-1-of-5, .seat-3-of-5 { transform: translateY(-1.6cqh); }
}

/* A short, wide felt (a phone held sideways): the cards take more of the height there is, with
   less room round them */
@container felt (max-height: 340px) and (min-aspect-ratio: 1 / 1) {
  .dealer {
    --card-w: clamp(24px, min(7.5cqw, 15cqh), 64px);
    gap: 0.1rem;
  }

  .who {
    font-size: 0.6rem;
  }

  .seat {
    --card-w: clamp(20px, min(calc(23cqw / var(--seats, 5)), 12cqh), 56px);
    --spot: clamp(1.9rem, min(calc(25cqw / var(--seats, 5)), 12cqh), 3rem);
    gap: 0.15rem;
    padding: 0.15rem 0.2rem 0.25rem;
    transform: none !important;
  }

  .seat.me {
    --card-w: clamp(26px, min(calc(29cqw / var(--seats, 5)), 15cqh), 64px);
    --spot: clamp(2.2rem, min(calc(30cqw / var(--seats, 5)), 13cqh), 3.4rem);
  }

  .hands {
    min-height: calc(var(--card-w) * 1.4 + 1.2rem);
  }

  .hand {
    gap: 0.1rem;
    padding: 0.1rem;
  }

  .center {
    min-height: 1.2rem;
    margin: 0.1rem 0;
    font-size: 0.8rem;
  }
}

/* Taller than wide (a phone upright): the others in a row of small seats, this player's seat a
   row of its own at the bottom, bigger */
@container felt (max-aspect-ratio: 1 / 1) {
  .dealer { --card-w: clamp(26px, min(13cqw, 10cqh), 64px); }

  .seats {
    flex-wrap: wrap;
    gap: 0.3rem 0.2rem;
  }

  .seat {
    --card-w: clamp(18px, min(8.5cqw, 6.6cqh), 44px);
    --spot: clamp(1.9rem, min(10cqw, 7cqh), 3rem);
    flex: 1 1 22%;
    padding: 0.25rem 0.1rem 0.3rem;
    transform: none !important;
  }

  .seat.me {
    --card-w: clamp(28px, min(15cqw, 12cqh), 74px);
    --spot: clamp(2.5rem, min(14cqw, 9.5cqh), 4rem);
    order: 9;
    flex-basis: 100%;
    max-width: none;
  }

  .seat.empty {
    display: none;
  }

  .seat:not(.me) .plate {
    margin-top: 0.15rem;
    font-size: 0.68rem;
  }

  .seat:not(.me) .side-spot {
    --size: calc(var(--spot) * 0.6);
  }

  .seat:not(.me) .spots {
    gap: 0.15rem;
  }

  /* Others at the table too: a row of them above this player's seat, so all of it a size down */
  .felt.crowded .dealer {
    --card-w: clamp(24px, min(11cqw, 8cqh), 56px);
    gap: 0.15rem;
  }

  .felt.crowded .seat {
    --card-w: clamp(18px, min(7.5cqw, 5.6cqh), 40px);
    --spot: clamp(1.8rem, min(9cqw, 6.2cqh), 2.6rem);
    gap: 0.15rem;
    padding: 0.1rem 0.1rem 0.15rem;
  }

  .felt.crowded .seat.me {
    --card-w: clamp(28px, min(13cqw, 9.5cqh), 66px);
    --spot: clamp(2.3rem, min(12cqw, 8.5cqh), 3.4rem);
  }

  .felt.crowded .seat.me .plate {
    margin-top: 0.6rem;
  }

  .felt.crowded .center {
    min-height: 1.2rem;
    margin: 0.15rem 0;
  }
}

/* Not much height: the printing goes, and the small seats lose their labels */
@container felt (max-height: 440px) {
  .arc, .rule {
    display: none;
  }
}

@container felt (max-height: 330px) {
  .seat:not(.me) .spot-amount,
  .seat:not(.me) .plate-gift {
    display: none;
  }

  .plate {
    margin-top: 0.15rem;
  }

  .center {
    margin: 0.15rem 0;
  }
}

/* Browsers without container sizes: a phone still gets its own layout */
@supports not (container-type: size) {
  @media (max-width: 640px) {
    .seats { flex-wrap: wrap; gap: 0.4rem 0.25rem; }
    .seat { --card-w: 30px; --spot: 2.4rem; flex: 1 1 22%; transform: none !important; }
    .seat.me { --card-w: 54px; --spot: 3.2rem; order: 9; flex-basis: 100%; max-width: none; }
    .seat.empty { display: none; }
  }
}

/* ---------- The dock ---------- */

.dock {
  container: dock / inline-size;
  flex: none;
  border: 1px solid var(--color-term-low);
  background: rgb(0 20 8 / 0.6);
}

.dock-inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: "bank social" "main main";
  align-items: center;
  gap: 0.4rem 0.5rem;
  padding: 0.45rem 0.55rem 0.55rem;
}

.bank {
  grid-area: bank;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.bank-label {
  font-size: 0.65rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-term-dim);
}

.bank-amount {
  overflow: hidden;
  font-family: var(--font-display);
  font-size: 1.9rem;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.social {
  grid-area: social;
  display: flex;
  gap: 0.3rem;
}

.px-btn {
  display: grid;
  place-items: center;
  width: 2.6rem;
  height: 2.6rem;
  border: 1px solid var(--color-term-low);
  background: rgb(0 0 0 / 0.35);
  transition: border-color 80ms, transform 80ms;
}

.px-btn img {
  width: 1.65rem;
  height: auto;
  image-rendering: pixelated;
}

.px-btn:hover,
.px-btn:focus-visible {
  border-color: var(--color-term);
}

.px-btn:active {
  transform: translateY(1px);
}

.px-text {
  color: #e9c55a;
  font-family: var(--font-display);
  font-size: 1.25rem;
  line-height: 1;
}

.dock-main {
  grid-area: main;
  min-height: 6.4rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.4rem;
}

.bet-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.aim-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 3.6rem;
  height: 2.9rem;
  padding: 0 0.35rem;
  border: 1px solid #c9a227;
  background: rgb(201 162 39 / 0.12);
  color: #ffe58a;
  line-height: 1.1;
}

.aim-btn:disabled {
  opacity: 0.45;
}

.aim-label {
  font-size: 0.55rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgb(255 229 138 / 0.75);
}

.aim-value {
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
}

.tray {
  display: flex;
  justify-content: center;
  gap: 0.4rem;
}

.chip-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.9rem;
  height: 2.9rem;
  border-radius: 9999px;
  background:
    radial-gradient(circle, var(--face) 0 50%, transparent 51%),
    repeating-conic-gradient(var(--edge) 0 15deg, var(--face) 15deg 45deg);
  box-shadow: 0 3px 0 rgb(0 0 0 / 0.5), inset 0 0 0 3px rgb(0 0 0 / 0.2);
  color: var(--ink);
  font-weight: 800;
  font-size: 0.9rem;
  text-shadow: 0 1px 2px rgb(0 0 0 / 0.6);
  transition: transform 0.1s ease, filter 0.1s ease;
}

.chip-button span {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 62%;
  height: 62%;
  border: 2px dashed rgb(255 255 255 / 0.55);
  border-radius: 9999px;
}

.chip-button:not(:disabled):hover {
  transform: translateY(-3px);
}

.chip-button:not(:disabled):active {
  transform: translateY(1px);
}

.chip-button:disabled {
  filter: grayscale(0.8) brightness(0.55);
  cursor: not-allowed;
}

.clear-btn {
  width: 2.6rem;
  height: 2.9rem;
  border: 1px solid var(--color-term-low);
  color: var(--color-term);
  font-size: 1.4rem;
  line-height: 1;
}

.clear-btn:disabled {
  color: var(--color-term-low);
  cursor: not-allowed;
}

.deal-btn {
  flex: 1 1 100%;
  min-height: 2.9rem;
}

.moves {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.4rem;
}

.move {
  min-height: 3.1rem;
  padding: 0.25rem;
  font-size: 0.85rem;
  letter-spacing: 0.04em;
}

.move .key {
  display: inline-block;
  min-width: 1.3em;
  margin-right: 0.25em;
  border: 1px solid currentColor;
  font-size: 0.75em;
  opacity: 0.7;
}

.hint {
  min-height: 1.1rem;
  text-align: center;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--color-term-dim);
}

.hint.status {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-term);
}

.broke {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-weight: 700;
}

/* A narrow phone: the moves lose their key letters to keep their words */
@container dock (max-width: 420px) {
  .move .key {
    display: none;
  }

  .move {
    font-size: 0.78rem;
  }
}

/* A wide screen: everything on one line, balance on the left and the bar on the right */
@container dock (min-width: 760px) {
  .dock-inner {
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas: "bank main social";
    gap: 0.5rem 1rem;
  }

  .bank {
    flex-direction: column;
    gap: 0.15rem;
  }

  .dock-main {
    min-height: 4.6rem;
  }

  .bet-row {
    flex-wrap: nowrap;
  }

  .deal-btn {
    flex: 0 1 15rem;
  }
}

/* A dock down the side (a phone held sideways): one thing under another, the chips in a row of
   their own and Deal beside the buttons for where they go */
@container dock (max-width: 300px) {
  .dock-inner {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: "bank" "social" "main";
    gap: 0.35rem;
    padding: 0.4rem 0.45rem 0.45rem;
  }

  .bank-amount {
    font-size: 1.6rem;
  }

  .social {
    justify-content: space-between;
  }

  .px-btn {
    width: 2.35rem;
    height: 2.35rem;
  }

  .dock-main {
    min-height: 0;
    gap: 0.3rem;
  }

  .bet-row {
    gap: 0.35rem;
  }

  .tray {
    order: 1;
    flex-basis: 100%;
    gap: 0.35rem;
  }

  .chip-button {
    width: 2.45rem;
    height: 2.45rem;
  }

  .aim-btn {
    order: 2;
    min-width: 3.2rem;
    height: 2.6rem;
  }

  .clear-btn {
    order: 3;
    height: 2.6rem;
  }

  .deal-btn {
    order: 4;
    flex: 1 1 0;
    min-width: 0;
    min-height: 2.6rem;
    padding: 0.25rem 0.4rem;
  }

  .moves {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .move {
    min-height: 2.6rem;
  }
}

/* A phone held sideways: the dock beside the table rather than under it */
@media (orientation: landscape) and (max-height: 520px) {
  .bj {
    flex-direction: row;
  }

  .dock {
    width: 15.5rem;
    overflow-y: auto;
  }

  /* A flatter curve, so the end seats aren't cut off by it */
  .felt {
    padding: 0.4rem 1.4rem 0.6rem;
    border-width: 8px;
    border-radius: 20px 20px 34% 34% / 20px 20px 14% 14%;
  }

  .shoe {
    transform: scale(0.7);
    transform-origin: top right;
  }
}

@media (orientation: portrait) {
  .shoe {
    transform: scale(0.75);
    transform-origin: top right;
  }
}
</style>
