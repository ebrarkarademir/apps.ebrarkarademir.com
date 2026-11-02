<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import PlayingCard from './PlayingCard.vue'
import ChipStack from './ChipStack.vue'
import { CHIP_LOOKS, money, chipLabel } from './chips'
import { sound } from '../ascii/sound'

// The table: dealer and shoe at the top, the seats round the curve of the felt, and under it
// the controls for this player: chips and Deal while bets are open, the moves on their turn.
// Everything shown comes from the table view the server sent; every button only asks.
const props = defineProps({
  t: { type: Object, required: true },
  table: { type: Object, required: true },
  profile: { type: Object, required: true }, // { name, balance, stats }
  busy: { type: Boolean, default: false }
})

const emit = defineEmits(['bet', 'deal', 'act', 'refill'])

const STAGGER = 260 // ms between cards of one deal
const MOVES = [
  { action: 'hit', key: 'H', label: 'bjHit' },
  { action: 'stand', key: 'S', label: 'bjStand' },
  { action: 'double', key: 'D', label: 'bjDoubleDown' },
  { action: 'split', key: 'P', label: 'bjSplit' }
]
const OUTCOME_KEYS = { blackjack: 'bjBlackjack', win: 'bjWin', push: 'bjPush', lose: 'bjLose', bust: 'bjBust' }

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
const broke = computed(() => props.profile.balance < rules.value.minBet && !(mySeat.value?.bet) && phase.value === 'betting')

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
// goes round the table one card at a time
const delays = new Map()
let seenRound = -1
let seenCard = -1
watch(() => props.table, (view) => {
  if (view.round !== seenRound) {
    seenRound = view.round
    seenCard = -1
  }
  const fresh = []
  const collect = (cards) => cards.forEach(card => { if (card.n > seenCard) fresh.push(card.n) })
  collect(view.dealer.cards)
  view.seats.forEach(seat => seat?.hands.forEach(hand => collect(hand.cards)))
  fresh.sort((a, b) => a - b).forEach((n, i) => delays.set(`${view.round}:${n}`, i * STAGGER))
  if (fresh.length) seenCard = Math.max(seenCard, ...fresh)
}, { immediate: true, flush: 'pre' })
const delayOf = (card) => delays.get(`${props.table.round}:${card.n}`) || 0
const cardKey = (card) => `${props.table.round}-${card.n}`

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

// What a seat has in front of it: the bet before the deal, the hands' stakes while they play,
// and once the round is settled what comes back (a lost bet is gone from the felt)
const stakeOf = (seat) => {
  if (!seat.hands.length) return seat.bet
  const key = phase.value === 'settled' ? 'payout' : 'bet'
  return seat.hands.reduce((sum, hand) => sum + hand[key], 0)
}

// This player's round, added up across their hands
const myResult = computed(() => {
  if (phase.value !== 'settled' || !mySeat.value?.hands.length) return null
  const hands = mySeat.value.hands
  const net = hands.reduce((sum, hand) => sum + hand.payout - hand.bet, 0)
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

// Quick clicks each add to the bet this page has, not to the last one the server confirmed;
// once every request has its answer, the server's bet shows again
const pendingBet = ref(null)
let betsInFlight = 0
const shownBet = computed(() => pendingBet.value ?? mySeat.value?.bet ?? 0)

function setBet (amount) {
  pendingBet.value = amount
  betsInFlight++
  emit('bet', amount, () => {
    if (--betsInFlight === 0) pendingBet.value = null
  })
}

// The chips in a seat's betting ring: this player's own bet as they build it
const spotOf = (seat) => (seat.me && phase.value === 'betting' ? shownBet.value : stakeOf(seat))

const canAdd = (chip) => phase.value === 'betting' && mySeat.value && !mySeat.value.ready &&
  shownBet.value + chip <= Math.min(rules.value.maxBet, props.profile.balance)

function addChip (chip) {
  if (!canAdd(chip)) return
  sound.unlock()
  sound.play('chip')
  setBet(shownBet.value + chip)
}

const canDeal = computed(() => phase.value === 'betting' && mySeat.value && !mySeat.value.ready && pendingBet.value === null && mySeat.value.bet >= rules.value.minBet)
const betHint = computed(() => {
  if (!mySeat.value) return ''
  if (mySeat.value.ready) return props.table.deadline ? fmt(props.t.bjDealingIn, { n: secondsLeft.value }) : props.t.bjWaitingOthers
  if (mySeat.value.bet < rules.value.minBet) return fmt(props.t.bjMinBet, { min: money(rules.value.minBet), max: money(rules.value.maxBet) })
  return props.table.deadline ? fmt(props.t.bjDealingIn, { n: secondsLeft.value }) : ''
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

// ---------- Sounds ----------

watch(() => `${props.table.round}:${phase.value}`, () => {
  const result = myResult.value
  if (!result) return
  sound.play(result.blackjack && result.net > 0 ? 'blackjack' : result.net > 0 ? 'win' : result.net < 0 ? 'lose' : 'chip')
})

// ---------- Keys ----------

function onKey (event) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest?.('input, textarea, select')) return
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
  } else if ((key === 'backspace' || key === 'c') && phase.value === 'betting' && shownBet.value && !mySeat.value.ready) {
    setBet(0)
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
    <div class="felt">
      <!-- The shoe the cards come from, and how much of it is left -->
      <div ref="shoe" class="shoe" :title="`${table.shoe.left}`" aria-hidden="true">
        <span v-for="i in 3" :key="i" class="shoe-card" :style="{ transform: `translate(${(3 - i) * 3}px, ${(3 - i) * -2}px)` }"></span>
        <span class="shoe-count">{{ table.shoe.left }}</span>
      </div>

      <!-- The dealer -->
      <section class="dealer" :aria-label="t.bjDealer">
        <p class="who">{{ t.bjDealer }}</p>
        <div class="hand-cards dealer-cards" :style="{ '--n': table.dealer.cards.length }">
          <div v-for="(card, i) in table.dealer.cards" :key="cardKey(card)" class="slot" :style="{ '--i': i }">
            <PlayingCard :card="card.c" :delay="delayOf(card)" :origin="fromShoe" />
          </div>
        </div>
        <span v-if="dealerTotal" :class="['total', { bust: table.dealer.bust, bj: table.dealer.blackjack }]">{{ dealerTotal }}</span>
      </section>

      <!-- The printing on the felt -->
      <svg class="arc" viewBox="0 0 600 90" aria-hidden="true">
        <path id="bj-arc" d="M 40 10 Q 300 110 560 10" fill="none" />
        <text><textPath href="#bj-arc" startOffset="50%" text-anchor="middle">{{ t.bjPaysArc }}</textPath></text>
      </svg>
      <p class="rule" aria-hidden="true">{{ t.bjDealerRule }}</p>

      <p class="center" role="status">
        <span :class="{ 'is-good': myResult?.net > 0, 'is-bad': myResult?.net < 0 }">{{ centerText }}</span>
      </p>

      <!-- The seats round the curve -->
      <div class="seats" :style="{ '--seats': seats.length }">
        <div
          v-for="(seat, index) in seats"
          :key="index"
          :class="['seat', `seat-${index}-of-${seats.length}`, { me: seat?.me, active: phase === 'playing' && turn?.seat === index, empty: !seat }]"
        >
          <template v-if="seat">
            <div class="hands">
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
            <div class="bet-spot">
              <ChipStack :amount="spotOf(seat)" :label="spotOf(seat) ? money(spotOf(seat)) : ''" />
            </div>
            <p class="plate">
              <span class="plate-name">{{ seat.me ? t.bjYou : seat.name }}</span>
              <span v-if="seat.away" class="plate-tag">{{ t.bjAway }}</span>
              <span v-else-if="phase === 'betting' && seat.ready" class="plate-tag is-ready">{{ t.bjReady }}</span>
            </p>
            <span v-if="phase === 'playing' && turn?.seat === index" class="turn-bar" aria-hidden="true"><span :style="{ width: `${timerShare * 100}%` }"></span></span>
          </template>
          <span v-else class="open-seat">{{ t.bjOpenSeat }}</span>
        </div>
      </div>
    </div>

    <!-- This player's controls -->
    <div class="controls">
      <p class="bank">
        <span class="bank-label">{{ t.bjBalance }}</span>
        <span class="bank-amount">{{ money(profile.balance) }}</span>
      </p>

      <template v-if="phase === 'betting' && mySeat">
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
        <div class="bet-buttons">
          <button type="button" class="term-btn min-h-11" :disabled="!shownBet || mySeat.ready" @click="setBet(0)">{{ t.bjClear }}</button>
          <button type="button" class="term-btn term-btn-primary min-h-11 flex-1" :disabled="!canDeal || busy" @click="deal">
            {{ t.bjDeal }} <span v-if="shownBet">· {{ money(shownBet) }}</span>
          </button>
        </div>
        <p class="hint">{{ betHint }}</p>
        <div v-if="broke" class="broke">
          <span>{{ t.bjBroke }}</span>
          <button type="button" class="term-btn term-btn-primary min-h-10" @click="emit('refill')">{{ t.bjRefill }}</button>
        </div>
      </template>

      <template v-else-if="isMyTurn">
        <div class="moves">
          <button
            v-for="m in MOVES"
            :key="m.action"
            type="button"
            :class="['term-btn min-h-12 move', { 'term-btn-primary': m.action === 'hit' || m.action === 'stand' }]"
            :disabled="!table.options[m.action] || busy"
            @click="move(m.action)"
          >
            <span class="key" aria-hidden="true">{{ m.key }}</span> {{ t[m.label] }}
          </button>
        </div>
        <span class="turn-bar wide" aria-hidden="true"><span :style="{ width: `${timerShare * 100}%` }"></span></span>
      </template>

      <p v-else class="hint status">{{ centerText }}</p>

      <p class="keys">{{ t.bjKeys }}</p>
    </div>
  </div>
</template>

<style scoped>
.bj {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* The table: felt inside a padded rail with a gold line, straight along the dealer's side and curved round the players */
.felt {
  position: relative;
  min-height: 30rem;
  padding: 1rem 1rem 1.5rem;
  border: 14px solid #3a2414;
  border-radius: 28px 28px 50% 50% / 28px 28px 32% 32%;
  background:
    radial-gradient(ellipse at 50% 22%, rgb(255 255 255 / 0.08), transparent 60%),
    repeating-linear-gradient(45deg, rgb(0 0 0 / 0.035) 0 2px, transparent 2px 6px),
    radial-gradient(ellipse at 50% 35%, #1f7f4c 0%, #136036 55%, #0a3d22 100%);
  box-shadow: inset 0 0 0 3px #c9a227, inset 0 0 60px rgb(0 0 0 / 0.55), 0 12px 30px rgb(0 0 0 / 0.6), 0 0 0 1px #000;
  color: #fdf6e3;
  text-shadow: none;
  overflow: hidden;
}

.shoe {
  position: absolute;
  top: 0.8rem;
  right: 1rem;
  width: 46px;
  height: 64px;
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

.dealer {
  --card-w: clamp(50px, 7vw, 78px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  min-height: calc(var(--card-w) * 1.4 + 3.2rem);
}

.who {
  font-size: 0.7rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: rgb(253 246 227 / 0.7);
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

.arc {
  display: block;
  width: min(100%, 560px);
  margin: 0.2rem auto 0;
  fill: rgb(233 197 90 / 0.75);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 24px;
  letter-spacing: 0.18em;
}

.rule {
  margin-top: -0.4rem;
  text-align: center;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 0.7rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: rgb(253 246 227 / 0.45);
}

.center {
  min-height: 1.6rem;
  margin: 0.6rem 0;
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

/* The seats, along the curve: the outer ones sit higher */
.seats {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 0.5rem;
}

.seat {
  --card-w: clamp(34px, 4.4vw, 58px);
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  max-width: 15rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.2rem 0.5rem;
  border-radius: 14px;
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

.seat.me {
  --card-w: clamp(46px, 5.6vw, 68px);
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
  width: 4.2rem;
  height: 4.2rem;
  border: 2px dashed rgb(253 246 227 / 0.25);
  border-radius: 9999px;
  font-size: 0.6rem;
  text-align: center;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(253 246 227 / 0.4);
}

.hands {
  display: flex;
  justify-content: center;
  gap: 0.4rem;
  min-height: calc(var(--card-w) * 1.4 + 1.7rem);
}

.hand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem;
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

/* The ring a bet sits in */
.bet-spot {
  --chip: 26px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  min-width: 4rem;
  min-height: 4rem;
  padding-bottom: 0.25rem;
  border: 2px solid rgb(233 197 90 / 0.45);
  border-radius: 9999px;
}

.plate {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  max-width: 100%;
  padding: 0.1rem 0.6rem;
  border-radius: 9999px;
  background: rgb(0 0 0 / 0.45);
  font-size: 0.75rem;
  font-weight: 700;
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

/* The controls under the table */
.controls {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.75rem;
  border: 1px solid var(--color-term-low);
  background: rgb(0 20 8 / 0.6);
}

.bank {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.6rem;
}

.bank-label {
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-term-dim);
}

.bank-amount {
  font-family: var(--font-display);
  font-size: 2rem;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.tray {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}

.chip-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.4rem;
  height: 3.4rem;
  border-radius: 9999px;
  background:
    radial-gradient(circle, var(--face) 0 50%, transparent 51%),
    repeating-conic-gradient(var(--edge) 0 15deg, var(--face) 15deg 45deg);
  box-shadow: 0 3px 0 rgb(0 0 0 / 0.5), inset 0 0 0 3px rgb(0 0 0 / 0.2);
  color: var(--ink);
  font-weight: 800;
  font-size: 0.95rem;
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

.bet-buttons, .moves {
  display: flex;
  gap: 0.5rem;
}

.moves {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
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
  min-height: 1.25rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--color-term-dim);
}

.hint.status {
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

.keys {
  text-align: center;
  font-size: 0.7rem;
  color: var(--color-term-low);
}

/* A phone: this player's seat gets a row of its own at the bottom, bigger; the others shrink */
@media (max-width: 640px) {
  .felt {
    min-height: 0;
    padding: 0.75rem 0.5rem 1rem;
    border-width: 9px;
    border-radius: 20px 20px 42% 42% / 20px 20px 14% 14%;
  }

  .shoe {
    transform: scale(0.75);
    transform-origin: top right;
  }

  .seats {
    flex-wrap: wrap;
    gap: 0.4rem 0.25rem;
  }

  .seat {
    --card-w: 30px;
    flex: 1 1 22%;
    transform: none !important;
  }

  .seat.me {
    --card-w: 54px;
    order: 9;
    flex-basis: 100%;
    max-width: none;
  }

  .seat.empty {
    display: none;
  }

  .bet-spot {
    --chip: 22px;
    min-width: 3.2rem;
    min-height: 3.2rem;
  }

  .arc {
    font-size: 30px;
  }

  .chip-button {
    width: 3rem;
    height: 3rem;
  }

  .keys {
    display: none;
  }
}
</style>
