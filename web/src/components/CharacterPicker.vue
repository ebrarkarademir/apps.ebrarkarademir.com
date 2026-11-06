<script setup>
import { computed } from 'vue'
import PixelPerson from './PixelPerson.vue'
import { CHARACTER_IDS, characterOf } from '../online/characters'
import { profile, setCharacter } from '../online/profile'

// Who you are on the site: the people to pick from, each shown head and shoulders. A pick counts
// at once, here, on the Users tab and in the room you're in (see online/characters.js).
defineProps({
  t: { type: Object, required: true }
})

const LABELS = { suit: 'charSuit', casual: 'charCasual', explorer: 'charExplorer' }
const mine = computed(() => characterOf(profile.avatar))
</script>

<template>
  <div role="radiogroup" :aria-label="t.charPick" class="grid grid-cols-3 gap-2">
    <button
      v-for="id in CHARACTER_IDS"
      :key="id"
      type="button"
      role="radio"
      :aria-checked="mine === id"
      :class="['term-card flex flex-col items-center gap-1 px-1 pt-2 pb-1.5 text-xs', { 'is-picked': mine === id }]"
      @click="setCharacter(id)"
    >
      <PixelPerson face :character="id" size="3.25rem" />
      <span :class="['truncate max-w-full', mine === id ? 'font-semibold' : 'term-muted']">{{ t[LABELS[id]] }}</span>
    </button>
  </div>
</template>
