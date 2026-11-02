<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { emoteUrl, itemUrl, iconUrl } from './pixels'
import { EMOTES, CATEGORIES, MENU } from './social'
import { money } from './chips'

// The sheet that slides up over the table: emotes to send, the bar (for yourself, or as a gift
// for someone at the table or the dealer), and what the side bets pay. Choosing an emote or an
// order sends it and closes the sheet, so the table shows it arriving.
const props = defineProps({
  t: { type: Object, required: true },
  initialTab: { type: String, default: 'emote' }, // 'emote', 'bar' or 'pays'
  initialTo: { type: String, default: '' },
  initialCat: { type: String, default: '' },
  recipients: { type: Array, default: () => [] }, // { id, name }, who can be given something
  balance: { type: Number, default: 0 },
  rules: { type: Object, required: true }
})

const emit = defineEmits(['close', 'emote', 'buy'])

const TABS = ['emote', 'bar', 'pays']
const TAB_ICONS = { emote: () => iconUrl('laugh'), bar: () => itemUrl('beer'), pays: () => itemUrl('horseshoe') }
const SUIT = { S: '♠', H: '♥', D: '♦', C: '♣' }
// An example hand for each side bet win
const EXAMPLES = {
  perfect: ['8H', '8H'],
  colored: ['8H', '8D'],
  mixed: ['8H', '8S'],
  suitedTrips: ['7S', '7S', '7S'],
  straightFlush: ['7S', '8S', '9S'],
  trips: ['7S', '7H', '7D'],
  straight: ['7S', '8H', '9D'],
  flush: ['2S', '9S', 'KS']
}

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')

const tab = ref(TABS.includes(props.initialTab) ? props.initialTab : 'emote')
const to = ref(props.recipients.some(r => r.id === props.initialTo) ? props.initialTo : props.recipients[0]?.id || '')
const cat = ref(CATEGORIES.includes(props.initialCat) ? props.initialCat : 'drinks')
const menu = computed(() => MENU.filter(item => item.cat === cat.value))
const pays = computed(() => props.rules.pays || {})

const cardText = (card) => (card[0] === 'T' ? '10' : card[0]) + SUIT[card[1]]
const isRed = (card) => card[1] === 'H' || card[1] === 'D'

// ---------- Keys and focus ----------

const closeButton = ref(null)
let opener = null

function onKey (event) {
  if (event.key !== 'Escape') return
  event.preventDefault()
  event.stopPropagation()
  emit('close')
}

onMounted(() => {
  opener = document.activeElement
  closeButton.value?.focus({ preventScroll: true })
  window.addEventListener('keydown', onKey, true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey, true)
  if (opener?.isConnected) opener.focus?.({ preventScroll: true })
})
</script>

<template>
  <div class="sheet-wrap" @pointerdown.self="emit('close')">
    <section class="sheet" role="dialog" aria-modal="true" :aria-label="t[`bjTab_${tab}`]">
      <header class="sheet-head">
        <div class="tabs" role="tablist">
          <button
            v-for="name in TABS"
            :key="name"
            type="button"
            role="tab"
            :aria-selected="tab === name"
            :class="['tab', { on: tab === name }]"
            @click="tab = name"
          >
            <img :src="TAB_ICONS[name]()" alt="" draggable="false" />
            <span>{{ t[`bjTab_${name}`] }}</span>
          </button>
        </div>
        <button ref="closeButton" type="button" class="term-icon-btn shrink-0 h-9" :aria-label="t.bjClose" :title="t.bjClose" @click="emit('close')">[X]</button>
      </header>

      <!-- Emotes -->
      <div v-if="tab === 'emote'" class="sheet-body">
        <div class="emote-grid">
          <button
            v-for="k in EMOTES"
            :key="k"
            type="button"
            class="emote-btn"
            :aria-label="t[`bjEmote_${k}`]"
            :title="t[`bjEmote_${k}`]"
            @click="emit('emote', k)"
          >
            <img :src="emoteUrl(k)" alt="" draggable="false" />
          </button>
        </div>
      </div>

      <!-- The bar -->
      <div v-else-if="tab === 'bar'" class="sheet-body">
        <div class="for-row" role="radiogroup" :aria-label="t.bjFor">
          <span class="for-label">{{ t.bjFor }}</span>
          <button
            v-for="r in recipients"
            :key="r.id"
            type="button"
            role="radio"
            :aria-checked="to === r.id"
            :class="['for-btn', { on: to === r.id }]"
            @click="to = r.id"
          >
            {{ r.name }}
          </button>
        </div>
        <div class="cats" role="tablist">
          <button
            v-for="c in CATEGORIES"
            :key="c"
            type="button"
            role="tab"
            :aria-selected="cat === c"
            :class="['cat', { on: cat === c }]"
            @click="cat = c"
          >
            {{ t[`bjCat_${c}`] }}
          </button>
        </div>
        <ul class="menu">
          <li v-for="item in menu" :key="item.id">
            <button type="button" class="menu-item" :disabled="item.price > balance || !to" @click="emit('buy', { k: item.id, to })">
              <img :src="itemUrl(item.id)" alt="" draggable="false" />
              <span class="menu-name">{{ t[`bjItem_${item.id}`] }}</span>
              <span class="menu-price">{{ money(item.price) }}</span>
            </button>
          </li>
        </ul>
        <p class="sheet-foot">{{ t.bjBalance }} <strong>{{ money(balance) }}</strong></p>
      </div>

      <!-- What the side bets pay -->
      <div v-else class="sheet-body">
        <section v-for="key in ['pp', 't3']" :key="key" class="pays">
          <h3 class="pays-title">{{ key === 'pp' ? t.bjSidePP : t.bjSide21 }}</h3>
          <p class="pays-note">{{ t[`bjSideAbout_${key}`] }}</p>
          <dl class="pays-table">
            <div v-for="(odds, kind) in pays[key]" :key="kind" class="pays-row">
              <dt>
                <span>{{ t[`bjSideWin_${kind}`] }}</span>
                <span class="example" aria-hidden="true">
                  <span v-for="(card, i) in EXAMPLES[kind]" :key="i" :class="['mini-card', { red: isRed(card) }]">{{ cardText(card) }}</span>
                </span>
              </dt>
              <dd>{{ odds }}:1</dd>
            </div>
          </dl>
        </section>
        <p class="sheet-foot">{{ fmt(t.bjSideLimits, { min: money(rules.sideMin || 0), max: money(rules.sideMax || 0) }) }}</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.sheet-wrap {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgb(0 0 0 / 0.45);
  animation: wrap-in 0.15s ease-out both;
}

.sheet {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: min(78%, 34rem);
  border-top: 1px solid var(--color-term);
  background: #000;
  box-shadow: 0 -8px 30px rgb(0 255 0 / 0.12);
  animation: sheet-in 0.22s cubic-bezier(0.2, 0.9, 0.3, 1) both;
}

/* On a big screen, a panel over the bottom right of the table */
@media (min-width: 768px) {
  .sheet-wrap {
    justify-content: flex-end;
    padding: 0 1rem 1rem;
    background: rgb(0 0 0 / 0.25);
  }

  .sheet {
    width: 26rem;
    max-height: min(80%, 36rem);
    border: 1px solid var(--color-term);
  }
}

.sheet-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid var(--color-term-low);
}

.tabs {
  flex: 1;
  display: flex;
  gap: 0.35rem;
  min-width: 0;
}

.tab {
  flex: 1 1 0;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 2.5rem;
  padding: 0 0.4rem;
  border: 1px solid var(--color-term-low);
  color: var(--color-term-dim);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.tab img {
  width: 1.4rem;
  height: auto;
  image-rendering: pixelated;
}

.tab span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab.on {
  border-color: var(--color-term);
  background: var(--color-term);
  color: #000;
  text-shadow: none;
}

.sheet-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0.6rem;
}

/* ---------- Emotes ---------- */

.emote-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.4rem;
}

@media (min-width: 480px) {
  .emote-grid {
    grid-template-columns: repeat(8, minmax(0, 1fr));
  }
}

@media (min-width: 768px) {
  .emote-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.emote-btn {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  border: 1px solid var(--color-term-low);
  background: #0a1a0f;
  transition: transform 80ms, border-color 80ms;
}

.emote-btn img {
  width: 76%;
  max-width: 3.6rem;
  height: auto;
  image-rendering: pixelated;
}

.emote-btn:hover,
.emote-btn:focus-visible {
  border-color: var(--color-term);
  transform: translateY(-2px);
}

.emote-btn:active {
  transform: scale(0.94);
}

/* ---------- The bar ---------- */

.for-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0 -0.6rem 0.5rem;
  padding: 0 0.6rem 0.1rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.for-row::-webkit-scrollbar {
  display: none;
}

.for-label {
  flex: none;
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--color-term-dim);
}

.for-btn {
  flex: none;
  max-width: 9rem;
  min-height: 2.25rem;
  padding: 0 0.7rem;
  overflow: hidden;
  border: 1px solid var(--color-term-low);
  color: var(--color-term-dim);
  font-size: 0.8rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.for-btn.on {
  border-color: #e9c55a;
  background: #e9c55a;
  color: #1a1203;
  text-shadow: none;
}

.cats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.3rem;
  margin-bottom: 0.6rem;
}

.cat {
  min-height: 2.25rem;
  border-bottom: 2px solid var(--color-term-low);
  color: var(--color-term-dim);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.cat.on {
  border-color: var(--color-term);
  color: var(--color-term);
}

.menu {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (min-width: 480px) and (max-width: 767px) {
  .menu {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

.menu-item {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.45rem 0.25rem;
  border: 1px solid var(--color-term-low);
  background: #0a1a0f;
  transition: transform 80ms, border-color 80ms;
}

.menu-item img {
  width: 2.75rem;
  height: 2.75rem;
  image-rendering: pixelated;
}

.menu-name {
  max-width: 100%;
  overflow: hidden;
  color: #fdf6e3;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-price {
  color: #e9c55a;
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.menu-item:not(:disabled):hover,
.menu-item:focus-visible {
  border-color: var(--color-term);
  transform: translateY(-2px);
}

.menu-item:not(:disabled):active {
  transform: scale(0.96);
}

.menu-item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.sheet-foot {
  margin-top: 0.6rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--color-term-dim);
}

.sheet-foot strong {
  color: #e9c55a;
}

/* ---------- What side bets pay ---------- */

.pays + .pays {
  margin-top: 1rem;
}

.pays-title {
  font-family: var(--font-display);
  font-size: 1.6rem;
  line-height: 1;
  text-transform: uppercase;
}

.pays-note {
  margin: 0.25rem 0 0.5rem;
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--color-term-dim);
}

.pays-table {
  display: grid;
  gap: 0.25rem;
}

.pays-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--color-term-low);
}

.pays-row dt {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.6rem;
  font-size: 0.8rem;
}

.pays-row dd {
  font-family: var(--font-display);
  font-size: 1.5rem;
  line-height: 1;
  color: #e9c55a;
}

.example {
  display: inline-flex;
  gap: 2px;
}

.mini-card {
  min-width: 1.5rem;
  padding: 0 0.15rem;
  border-radius: 2px;
  background: #fdfaf2;
  color: #1a1a1a;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.35;
  text-align: center;
  text-shadow: none;
}

.mini-card.red {
  color: #c62828;
}

@keyframes wrap-in {
  from { opacity: 0; }
}

@keyframes sheet-in {
  from { transform: translateY(40px); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .sheet,
  .sheet-wrap {
    animation: none;
  }
}
</style>
