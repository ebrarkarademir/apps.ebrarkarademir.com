<script setup>
import { computed } from 'vue'
import { itemName, fmt } from '../text.js'
import ItemCard from './ItemCard.vue'
import Icon from './Icon.vue'

// What the player owns: clothes to put on, furniture to place at home
const props = defineProps({
  t: { type: Object, required: true },
  catalog: { type: Array, required: true },
  inventory: { type: Object, required: true },
  look: { type: Object, required: true },
  placed: { type: Object, default: null }, // item id -> how many stand in the home, when at home
  atHome: { type: Boolean, default: false },
  tab: { type: String, default: 'clothes' },
  busy: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'wear', 'takeOff', 'place', 'goHome', 'update:tab'])

const SLOTS = ['top', 'bottom', 'shoes', 'acc']
const owns = (item) => item.price === 0 || (props.inventory[item.id] || 0) > 0

const clothes = computed(() => SLOTS.map(slot => ({
  slot,
  items: props.catalog.filter(item => item.kind === slot && owns(item))
})))
const furniture = computed(() => props.catalog.filter(item => item.kind === 'furniture' && (props.inventory[item.id] || 0) > 0))
const free = (item) => (props.inventory[item.id] || 0) - (props.placed?.[item.id] || 0)

function pickCloth (item) {
  if (props.busy) return
  // A worn accessory comes off again; the other slots always have something on
  if (props.look[item.kind] === item.id) {
    if (item.kind === 'acc') emit('takeOff', 'acc')
    return
  }
  emit('wear', item)
}

function pickFurniture (item) {
  if (props.atHome && free(item) > 0) emit('place', item)
}
</script>

<template>
  <section class="sheet panel" :aria-label="t.worldInventory">
    <div class="panel-head">
      <span class="badge-icon" style="--c: var(--sky); --hi: var(--sky-hi)" aria-hidden="true"><Icon name="bag" /></span>
      <h2>{{ t.worldInventory }}</h2>
      <button type="button" class="btn gray small round" :aria-label="t.worldClose" :title="t.worldClose" @click="emit('close')"><Icon name="close" :size="18" /></button>
    </div>

    <div class="tabs" role="tablist">
      <button type="button" role="tab" :aria-selected="tab === 'clothes'" :class="['chip', { on: tab === 'clothes' }]" @click="emit('update:tab', 'clothes')"><Icon name="shirt" :size="18" />{{ t.worldClothes }}</button>
      <button type="button" role="tab" :aria-selected="tab === 'furniture'" :class="['chip', { on: tab === 'furniture' }]" @click="emit('update:tab', 'furniture')"><Icon name="sofa" :size="18" />{{ t.worldFurniture }}</button>
    </div>

    <div v-if="tab === 'clothes'" class="list">
      <p class="muted hint">{{ t.worldWearHint }}</p>
      <template v-for="group in clothes" :key="group.slot">
        <h3>{{ t.worldSlots[group.slot] }}</h3>
        <div class="cards">
          <ItemCard
            v-for="item in group.items"
            :key="item.id"
            :item="item"
            :name="itemName(item, t)"
            :flag="look[item.kind] === item.id ? t.worldOn : ''"
            :on="look[item.kind] === item.id"
            @click="pickCloth(item)"
          />
        </div>
      </template>
    </div>

    <div v-else class="list">
      <p v-if="atHome" class="muted hint">{{ t.worldPlaceHint }}</p>
      <div v-else class="away">
        <p class="muted">{{ t.worldGoHomeHint }}</p>
        <button type="button" class="btn mint small" @click="emit('goHome')"><Icon name="home" :size="18" />{{ t.worldGoHome }}</button>
      </div>
      <p v-if="!furniture.length" class="muted hint">{{ t.worldNoFurniture }}</p>
      <div class="cards">
        <ItemCard
          v-for="item in furniture"
          :key="item.id"
          :item="item"
          :name="itemName(item, t)"
          :flag="atHome && placed ? fmt(t.worldFree, { n: free(item), total: inventory[item.id] }) : `×${inventory[item.id]}`"
          :class="{ spent: atHome && free(item) <= 0 }"
          @click="pickFurniture(item)"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.list { flex: 1; min-height: 0; overflow-y: auto; padding-bottom: 0.8rem; }
.list .cards { overflow: visible; padding-bottom: 0.4rem; }
h3 { margin: 0.5rem 1.1rem 0.4rem; font-size: 0.8rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-soft); }
.hint { margin: 0 1.1rem 0.5rem; font-size: 0.82rem; }
.away { display: flex; align-items: center; gap: 0.6rem; margin: 0 1.1rem 0.7rem; padding: 0.6rem 0.8rem; border-radius: 18px; background: #eafff6; }
.away p { flex: 1; margin: 0; font-size: 0.82rem; }
.spent { opacity: 0.5; }
</style>
