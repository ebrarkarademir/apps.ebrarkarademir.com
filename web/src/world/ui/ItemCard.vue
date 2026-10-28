<script setup>
import { ref, watch } from 'vue'
import { picture } from '../preview.js'

// A shop or inventory card: the item's picture (rendered in the background), its name, and a
// price or a little flag
const props = defineProps({
  item: { type: Object, required: true },
  name: { type: String, required: true },
  price: { type: Number, default: null },
  flag: { type: String, default: '' },
  on: { type: Boolean, default: false }
})

const src = ref(null)

watch(() => props.item.id, (id) => {
  src.value = null
  picture(props.item, (url) => {
    if (props.item.id === id) src.value = url
  })
}, { immediate: true })
</script>

<template>
  <button type="button" :class="['card', { on }]" :aria-pressed="on" :title="name">
    <img v-if="src" :src="src" alt="" draggable="false" />
    <span v-else class="ph" aria-hidden="true"></span>
    <span class="name">{{ name }}</span>
    <span v-if="price !== null" class="price"><span class="coin" aria-hidden="true"></span>{{ price }}</span>
    <span v-if="flag" class="flag">{{ flag }}</span>
  </button>
</template>
