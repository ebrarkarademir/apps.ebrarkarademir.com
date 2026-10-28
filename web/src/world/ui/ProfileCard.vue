<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { livePreview } from '../preview.js'
import { STATE } from '../avatar/avatar.js'
import Icon from './Icon.vue'

// Someone's card: their avatar turning, name, level, and what you can do as friends
const props = defineProps({
  t: { type: Object, required: true },
  profile: { type: Object, required: true }, // { id, name, level, avatar, online, status }
  busy: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'add', 'accept', 'remove', 'visit', 'edit', 'logout'])

const stage = ref(null)
const preview = livePreview()
let waveTimer = null
let host = null

// Says hello once, then stands
const show = () => {
  if (props.profile.avatar) preview.showAvatar(props.profile.avatar)
  preview.pose(STATE.wave)
  clearTimeout(waveTimer)
  waveTimer = setTimeout(() => preview.pose(STATE.idle), 2200)
}

watch(() => props.profile.id, show)
onMounted(() => {
  host = stage.value
  preview.attach(host)
  show()
})
onUnmounted(() => {
  clearTimeout(waveTimer)
  preview.detach(host)
})
</script>

<template>
  <section class="sheet panel profile" :aria-label="profile.name">
    <div class="panel-head">
      <span class="badge-icon" style="--c: var(--lilac); --hi: var(--lilac-hi)" aria-hidden="true"><Icon name="user" /></span>
      <h2>{{ t.worldProfile }}</h2>
      <button type="button" class="btn gray small round" :aria-label="t.worldClose" :title="t.worldClose" @click="emit('close')"><Icon name="close" :size="18" /></button>
    </div>

    <div ref="stage" class="portrait"></div>

    <div class="who">
      <span class="level big" :title="t.worldLevel">{{ profile.level }}</span>
      <div class="text">
        <p class="name">{{ profile.name }}</p>
        <p class="muted state"><span :class="['dot', { on: profile.online }]" aria-hidden="true"></span>{{ profile.online ? t.worldOnline : t.worldOffline }}</p>
      </div>
    </div>

    <div class="actions">
      <template v-if="profile.status === 'me'">
        <button type="button" class="btn pink" @click="emit('edit')"><Icon name="pencil" :size="18" />{{ t.worldEditLook }}</button>
        <button type="button" class="btn gray small" :disabled="busy" @click="emit('logout')"><Icon name="exit" :size="16" />{{ t.worldSignOut }}</button>
      </template>
      <button v-else-if="profile.status === 'none'" type="button" class="btn mint" :disabled="busy" @click="emit('add', profile.id)"><Icon name="userPlus" :size="20" />{{ t.worldAddFriend }}</button>
      <button v-else-if="profile.status === 'outgoing'" type="button" class="btn gray" disabled>{{ t.worldRequestSent }}</button>
      <button v-else-if="profile.status === 'incoming'" type="button" class="btn mint" :disabled="busy" @click="emit('accept', profile.id)"><Icon name="check" :size="20" />{{ t.worldAccept }}</button>
      <template v-else-if="profile.status === 'friend'">
        <button type="button" class="btn sky" :disabled="busy" @click="emit('visit', profile.id)"><Icon name="home" :size="18" />{{ t.worldVisitHome }}</button>
        <button type="button" class="btn gray small" :disabled="busy" @click="emit('remove', profile.id)">{{ t.worldUnfriend }}</button>
      </template>
    </div>
  </section>
</template>

<style scoped>
.profile { bottom: auto; }
.portrait {
  position: relative;
  height: 15rem;
  margin: 0 1.1rem;
  border-radius: 22px;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 88%, rgba(203, 188, 255, 0.7), transparent 62%), linear-gradient(180deg, #eef4ff, #fbf2ff);
  cursor: grab;
}
.portrait :deep(canvas) { position: absolute; inset: 0; width: 100%; height: 100%; }
.who { display: flex; align-items: center; gap: 0.7rem; padding: 0.9rem 1.2rem 0.4rem; }
.level.big { width: 2.8rem; height: 2.8rem; font-size: 1.15rem; flex-shrink: 0; }
.text { min-width: 0; }
.text p { margin: 0; }
.name { font-size: 1.3rem; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.state { display: flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; font-weight: 800; }
.dot { width: 0.6rem; height: 0.6rem; border-radius: 50%; background: #cfcadf; }
.dot.on { background: #3fcf7a; }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; padding: 0.6rem 1.2rem 1.2rem; }
.actions .btn:not(.small) { flex: 1; }
@media (max-width: 640px) {
  .profile { height: auto; max-height: 70%; }
  .portrait { height: 11rem; flex-shrink: 0; }
}
</style>
