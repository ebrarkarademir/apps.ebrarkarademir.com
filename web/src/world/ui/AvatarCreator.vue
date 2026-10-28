<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { livePreview } from '../preview.js'
import { SKIN, HAIR, EYES, CHOICES, COLORS } from '../palette.js'
import { STATE } from '../avatar/avatar.js'
import { itemName } from '../text.js'
import Icon from './Icon.vue'

// Make or change an avatar: a turntable preview on one side, the choices on the other
const props = defineProps({
  t: { type: Object, required: true },
  look: { type: Object, required: true },
  catalog: { type: Array, required: true },
  inventory: { type: Object, required: true },
  first: { type: Boolean, default: false }, // the very first avatar: no cancelling
  busy: { type: Boolean, default: false }
})

const emit = defineEmits(['save', 'cancel'])

const draft = reactive({ ...props.look })
const tab = ref('body')
const stage = ref(null)
const preview = livePreview()

const owned = (item) => item.price === 0 || (props.inventory[item.id] || 0) > 0
const wardrobe = computed(() => {
  const slots = { top: [], bottom: [], shoes: [], acc: [] }
  for (const item of props.catalog) if (slots[item.kind] && owned(item)) slots[item.kind].push(item)
  return slots
})

const pick = (list) => list[Math.floor(Math.random() * list.length)]
function randomize () {
  draft.body = Math.random() < 0.5 ? 'm' : 'f'
  for (const [key, count] of Object.entries(CHOICES)) draft[key] = Math.floor(Math.random() * count)
  for (const slot of ['top', 'bottom', 'shoes']) draft[slot] = pick(wardrobe.value[slot]).id
  draft.acc = Math.random() < 0.4 || !wardrobe.value.acc.length ? null : pick(wardrobe.value.acc).id
}

const TABS = ['body', 'face', 'hair', 'clothes']

let waveTimer = null
let host = null
watch(draft, () => {
  preview.showAvatar({ ...draft })
  // A little wave to show off each change
  preview.pose(STATE.wave)
  clearTimeout(waveTimer)
  waveTimer = setTimeout(() => preview.pose(STATE.idle), 1400)
}, { deep: true })

onMounted(() => {
  host = stage.value
  preview.attach(host)
  preview.showAvatar({ ...draft })
  preview.pose(STATE.idle)
})
onUnmounted(() => {
  clearTimeout(waveTimer)
  preview.detach(host)
})
</script>

<template>
  <div class="creator panel">
    <div class="stage" ref="stage" :aria-label="t.worldCreatorTitle"></div>

    <div class="side">
      <div class="panel-head">
        <span class="badge-icon" aria-hidden="true"><Icon name="user" /></span>
        <h2>{{ first ? t.worldCreatorTitle : t.worldEditLook }}</h2>
        <button type="button" class="btn lemon small round" :title="t.worldRandom" :aria-label="t.worldRandom" @click="randomize"><Icon name="dice" :size="20" /></button>
      </div>

      <div class="tabs" role="tablist">
        <button v-for="name in TABS" :key="name" type="button" role="tab" :aria-selected="tab === name" :class="['chip', { on: tab === name }]" @click="tab = name">
          {{ t[`world${name[0].toUpperCase()}${name.slice(1)}`] }}
        </button>
      </div>

      <div class="options">
        <template v-if="tab === 'body'">
          <h3>{{ t.worldBodyType }}</h3>
          <div class="row">
            <button v-for="body in ['f', 'm']" :key="body" type="button" :class="['chip', { on: draft.body === body }]" @click="draft.body = body">{{ body === 'f' ? t.worldFemale : t.worldMale }}</button>
          </div>
          <h3>{{ t.worldSkin }}</h3>
          <div class="row">
            <button v-for="(hex, i) in SKIN" :key="hex" type="button" :class="['swatch', { on: draft.skin === i }]" :style="{ background: hex }" :aria-label="`${t.worldSkin} ${i + 1}`" @click="draft.skin = i"></button>
          </div>
        </template>

        <template v-else-if="tab === 'face'">
          <h3>{{ t.worldFaceShape }}</h3>
          <div class="row">
            <button v-for="(label, i) in t.worldFaceShapes" :key="label" type="button" :class="['chip', { on: draft.face === i }]" @click="draft.face = i">{{ label }}</button>
          </div>
          <h3>{{ t.worldEyes }}</h3>
          <div class="row">
            <button v-for="(label, i) in t.worldEyeStyles" :key="label" type="button" :class="['chip', { on: draft.eyes === i }]" @click="draft.eyes = i">{{ label }}</button>
          </div>
          <h3>{{ t.worldEyeColor }}</h3>
          <div class="row">
            <button v-for="(hex, i) in EYES" :key="hex" type="button" :class="['swatch', { on: draft.eyeColor === i }]" :style="{ background: hex }" :aria-label="`${t.worldEyeColor} ${i + 1}`" @click="draft.eyeColor = i"></button>
          </div>
          <h3>{{ t.worldBrows }}</h3>
          <div class="row">
            <button v-for="(label, i) in t.worldBrowStyles" :key="label" type="button" :class="['chip', { on: draft.brows === i }]" @click="draft.brows = i">{{ label }}</button>
          </div>
        </template>

        <template v-else-if="tab === 'hair'">
          <h3>{{ t.worldHairStyle }}</h3>
          <div class="row">
            <button v-for="(label, i) in t.worldHairStyles" :key="label" type="button" :class="['chip', { on: draft.hair === i }]" @click="draft.hair = i">{{ label }}</button>
          </div>
          <h3>{{ t.worldHairColor }}</h3>
          <div class="row">
            <button v-for="(hex, i) in HAIR" :key="hex" type="button" :class="['swatch', { on: draft.hairColor === i }]" :style="{ background: hex }" :aria-label="`${t.worldHairColor} ${i + 1}`" @click="draft.hairColor = i"></button>
          </div>
        </template>

        <template v-else>
          <template v-for="slot in ['top', 'bottom', 'shoes', 'acc']" :key="slot">
            <h3>{{ t.worldSlots[slot] }}</h3>
            <div class="row">
              <button v-if="slot === 'acc'" type="button" :class="['chip', { on: !draft.acc }]" @click="draft.acc = null">{{ t.worldNone }}</button>
              <button v-for="item in wardrobe[slot]" :key="item.id" type="button" :class="['chip', 'cloth', { on: draft[slot] === item.id }]" @click="draft[slot] = item.id">
                <span class="dot" :style="{ background: COLORS[item.color] }" aria-hidden="true"></span>{{ itemName(item, t) }}
              </button>
            </div>
          </template>
          <p class="muted note">{{ t.worldMoreInShop }}</p>
        </template>
      </div>

      <div class="actions">
        <button v-if="!first" type="button" class="btn gray" @click="emit('cancel')">{{ t.worldCancel }}</button>
        <button type="button" class="btn mint grow" :disabled="busy" @click="emit('save', { ...draft })">
          <Icon name="check" :size="20" />{{ first ? t.worldStart : t.worldSave }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.creator {
  width: min(58rem, calc(100% - 1.5rem));
  height: min(38rem, calc(100% - 1.5rem));
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  overflow: hidden;
}
.stage {
  position: relative;
  min-height: 12rem;
  background: radial-gradient(ellipse at 50% 85%, rgba(255, 178, 211, 0.55), transparent 60%), linear-gradient(180deg, #e9f3ff, #fff3f9);
  cursor: grab;
}
.stage :deep(canvas) { position: absolute; inset: 0; width: 100%; height: 100%; }
.side { display: flex; flex-direction: column; min-height: 0; }
.options { flex: 1; overflow-y: auto; padding: 0 1.1rem 0.6rem; }
h3 { margin: 0.8rem 0 0.45rem; font-size: 0.82rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-soft); }
.row { display: flex; flex-wrap: wrap; gap: 0.45rem; }
.swatch {
  width: 2.3rem;
  height: 2.3rem;
  border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 2px 8px -2px rgba(70, 40, 120, 0.4);
  transition: transform 0.12s;
}
.swatch:hover { transform: scale(1.08); }
.swatch.on { box-shadow: 0 0 0 3px var(--pink), 0 4px 10px -2px rgba(70, 40, 120, 0.4); transform: scale(1.1); }
.cloth { font-size: 0.82rem; }
.dot { width: 0.9rem; height: 0.9rem; border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12); }
.note { margin: 0.8rem 0 0; font-size: 0.82rem; }
.actions { display: flex; gap: 0.6rem; padding: 0.8rem 1.1rem 1.1rem; }
.grow { flex: 1; }
@media (max-width: 720px) {
  .creator { grid-template-columns: 1fr; grid-template-rows: 38% 62%; height: calc(100% - 1rem); }
}
</style>
