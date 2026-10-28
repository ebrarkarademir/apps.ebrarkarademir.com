<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { livePreview } from '../preview.js'
import { itemName, fmt } from '../text.js'
import ItemCard from './ItemCard.vue'
import Icon from './Icon.vue'

// The shop: clothes and furniture, a turning preview of the one picked, and its price
const props = defineProps({
  t: { type: Object, required: true },
  catalog: { type: Array, required: true },
  inventory: { type: Object, required: true },
  coins: { type: Number, required: true },
  look: { type: Object, required: true },
  tab: { type: String, default: 'clothes' }, // clothes | furniture
  busy: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'buy', 'wear', 'update:tab'])

const SLOTS = ['top', 'bottom', 'shoes', 'acc']
const slot = ref('all')
const selected = ref(null)
const stage = ref(null)
const preview = livePreview()

// Free things everyone already has aren't for sale
const items = computed(() => props.catalog.filter(item => {
  if (item.price <= 0) return false
  if (props.tab === 'furniture') return item.kind === 'furniture'
  return item.kind !== 'furniture' && (slot.value === 'all' || item.kind === slot.value)
}))

const count = (item) => props.inventory[item.id] || 0
const owned = (item) => item.kind !== 'furniture' && count(item) > 0
const worn = (item) => props.look[item.kind] === item.id
const flag = (item) => {
  if (item.kind === 'furniture') return count(item) ? `×${count(item)}` : ''
  return owned(item) ? '✓' : ''
}

watch(items, (list) => {
  if (!list.some(item => item.id === selected.value?.id)) selected.value = list[0] ?? null
}, { immediate: true })

watch([selected, () => props.look], ([item]) => {
  if (item) preview.showItem(item, props.look)
})

let host = null
onMounted(() => {
  host = stage.value
  preview.attach(host, { shift: 0.2 })
  if (selected.value) preview.showItem(selected.value, props.look)
})
onUnmounted(() => preview.detach(host))
</script>

<template>
  <section class="shop sheet panel" :aria-label="t.worldShop">
    <div class="panel-head">
      <span class="badge-icon" style="--c: var(--lemon); --hi: var(--lemon-hi)" aria-hidden="true"><Icon name="shop" /></span>
      <h2>{{ t.worldShop }}</h2>
      <span class="wallet"><span class="coin" aria-hidden="true"></span>{{ coins }}</span>
      <button type="button" class="btn gray small round" :aria-label="t.worldClose" :title="t.worldClose" @click="emit('close')"><Icon name="close" :size="18" /></button>
    </div>

    <div class="tabs" role="tablist">
      <button type="button" role="tab" :aria-selected="tab === 'clothes'" :class="['chip', { on: tab === 'clothes' }]" @click="emit('update:tab', 'clothes')"><Icon name="shirt" :size="18" />{{ t.worldClothes }}</button>
      <button type="button" role="tab" :aria-selected="tab === 'furniture'" :class="['chip', { on: tab === 'furniture' }]" @click="emit('update:tab', 'furniture')"><Icon name="sofa" :size="18" />{{ t.worldFurniture }}</button>
    </div>

    <div v-if="tab === 'clothes'" class="filters">
      <button type="button" :class="['chip', 'mini', { on: slot === 'all' }]" @click="slot = 'all'">{{ t.worldAll }}</button>
      <button v-for="name in SLOTS" :key="name" type="button" :class="['chip', 'mini', { on: slot === name }]" @click="slot = name">{{ t.worldSlots[name] }}</button>
    </div>

    <div class="showcase">
      <div ref="stage" class="stage"></div>
      <div v-if="selected" class="deal">
        <p class="title">{{ itemName(selected, t) }}</p>
        <p v-if="selected.kind === 'furniture' && count(selected)" class="muted small">{{ fmt(t.worldYouHave, { n: count(selected) }) }}</p>
        <button v-if="owned(selected)" type="button" class="btn mint small" :disabled="worn(selected) || busy" @click="emit('wear', selected)">
          <Icon name="shirt" :size="18" />{{ worn(selected) ? t.worldWearing : t.worldWear }}
        </button>
        <button v-else type="button" class="btn lemon small" :disabled="busy || coins < selected.price" @click="emit('buy', selected)">
          <span class="coin tiny" aria-hidden="true"></span>{{ selected.price }} · {{ t.worldBuy }}
        </button>
        <p v-if="!owned(selected) && coins < selected.price" class="short">{{ t.worldNotEnough }}</p>
      </div>
    </div>

    <div class="cards">
      <ItemCard
        v-for="item in items"
        :key="item.id"
        :item="item"
        :name="itemName(item, t)"
        :price="owned(item) ? null : item.price"
        :flag="flag(item)"
        :on="selected?.id === item.id"
        @click="selected = item"
      />
    </div>
  </section>
</template>

<style scoped>
.wallet { display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 900; color: #b06d00; }
.wallet .coin { width: 1.4rem; height: 1.4rem; }
.filters { display: flex; gap: 0.35rem; padding: 0 1.1rem 0.5rem; overflow-x: auto; scrollbar-width: none; }
.chip.mini { min-height: 2rem; padding: 0.2rem 0.75rem; font-size: 0.8rem; flex-shrink: 0; }
.showcase {
  position: relative;
  flex-shrink: 0;
  height: 11.5rem;
  margin: 0 1.1rem 0.6rem;
  border-radius: 22px;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 90%, rgba(255, 225, 120, 0.55), transparent 60%), linear-gradient(180deg, #eef6ff, #fff6e8);
}
.stage { position: absolute; inset: 0; cursor: grab; }
.stage :deep(canvas) { width: 100%; height: 100%; }
.deal {
  position: absolute;
  right: 0.6rem;
  bottom: 0.6rem;
  max-width: 55%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3rem;
  text-align: right;
  pointer-events: none;
}
.deal > * { pointer-events: auto; }
.deal p { margin: 0; }
.title { font-weight: 900; line-height: 1.15; text-shadow: 0 1px 0 #fff; }
.small { font-size: 0.78rem; }
.short { font-size: 0.75rem; font-weight: 800; color: #d6336c; }
.coin.tiny { width: 1.1rem; height: 1.1rem; }
.cards { flex: 1; align-content: start; }
</style>
