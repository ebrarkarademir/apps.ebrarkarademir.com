<script setup>
import { computed } from 'vue'
import { itemName } from '../text.js'
import ItemCard from './ItemCard.vue'
import Icon from './Icon.vue'

// Decorating the home: a tray of furniture to take out, and what to do with the piece picked
const props = defineProps({
  t: { type: Object, required: true },
  catalog: { type: Array, required: true },
  inventory: { type: Object, required: true },
  placed: { type: Object, required: true }, // item id -> how many are in the room
  selected: { type: String, default: null }, // a placed piece's item id
  holding: { type: Boolean, default: false }
})

const emit = defineEmits(['hold', 'rotate', 'move', 'remove', 'done'])

const tray = computed(() => props.catalog
  .filter(item => item.kind === 'furniture' && (props.inventory[item.id] || 0) > 0)
  .map(item => ({ item, free: props.inventory[item.id] - (props.placed[item.id] || 0) })))
</script>

<template>
  <section class="decor panel" :aria-label="t.worldDecorate">
    <div class="bar">
      <p class="what">
        <b>{{ t.worldDecorate }}</b>
        <span class="muted">{{ holding ? t.worldDecorHolding : selected ? itemName(catalog.find(item => item.id === selected), t) : t.worldDecorHint }}</span>
      </p>
      <div class="actions">
        <button type="button" class="btn lilac small" :disabled="!selected && !holding" :title="`${t.worldRotate} (R)`" @click="emit('rotate')"><Icon name="rotate" :size="18" /><span class="label">{{ t.worldRotate }}</span></button>
        <button type="button" class="btn sky small" :disabled="!selected" :title="t.worldMove" @click="emit('move')"><Icon name="move" :size="18" /><span class="label">{{ t.worldMove }}</span></button>
        <button type="button" class="btn peach small" :disabled="!selected" :title="`${t.worldStore} (Del)`" @click="emit('remove')"><Icon name="trash" :size="18" /><span class="label">{{ t.worldStore }}</span></button>
        <button type="button" class="btn mint small" @click="emit('done')"><Icon name="check" :size="18" />{{ t.worldDone }}</button>
      </div>
    </div>
    <div class="tray">
      <ItemCard
        v-for="{ item, free } in tray"
        :key="item.id"
        :item="item"
        :name="itemName(item, t)"
        :flag="`${free}`"
        :class="{ spent: free <= 0 }"
        :disabled="free <= 0"
        @click="emit('hold', item.id)"
      />
    </div>
  </section>
</template>

<style scoped>
.decor {
  position: absolute;
  left: 50%;
  bottom: 0.9rem;
  transform: translateX(-50%);
  width: min(52rem, calc(100% - 1.5rem));
  border-radius: 26px;
  z-index: 16;
}
.bar { display: flex; align-items: center; gap: 0.6rem; padding: 0.7rem 0.8rem 0.3rem 1.1rem; flex-wrap: wrap; }
.what { flex: 1; min-width: 10rem; margin: 0; display: flex; flex-direction: column; line-height: 1.2; }
.what b { font-weight: 900; }
.what span { font-size: 0.8rem; }
.actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.tray { display: flex; gap: 0.5rem; padding: 0.4rem 0.8rem 0.8rem; overflow-x: auto; scrollbar-width: thin; }
.tray :deep(.card) { flex: 0 0 6rem; }
.tray :deep(.card img), .tray :deep(.card .ph) { width: 3.6rem; height: 3.6rem; }
.spent { opacity: 0.45; }
@media (max-width: 640px) {
  .decor { bottom: 0.5rem; }
  .label { display: none; }
}
</style>
