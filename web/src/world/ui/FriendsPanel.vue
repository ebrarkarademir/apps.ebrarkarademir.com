<script setup>
import { computed } from 'vue'
import Icon from './Icon.vue'

// Friends, who's online, requests waiting, and visiting each other's homes
const props = defineProps({
  t: { type: Object, required: true },
  friends: { type: Array, required: true }, // [{ id, name, level, status, online }]
  atHome: { type: Boolean, default: false }, // in their own home: friends can be invited over
  busy: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'visit', 'invite', 'accept', 'remove', 'profile'])

const byOnline = (a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name)
const incoming = computed(() => props.friends.filter(f => f.status === 'incoming'))
const friends = computed(() => props.friends.filter(f => f.status === 'friend').sort(byOnline))
const outgoing = computed(() => props.friends.filter(f => f.status === 'outgoing'))
const onlineCount = computed(() => friends.value.filter(f => f.online).length)
</script>

<template>
  <section class="sheet panel" :aria-label="t.worldFriends">
    <div class="panel-head">
      <span class="badge-icon" style="--c: var(--mint); --hi: var(--mint-hi)" aria-hidden="true"><Icon name="friends" /></span>
      <h2>{{ t.worldFriends }}</h2>
      <span v-if="friends.length" class="muted count">{{ onlineCount }}/{{ friends.length }} {{ t.worldOnline }}</span>
      <button type="button" class="btn gray small round" :aria-label="t.worldClose" :title="t.worldClose" @click="emit('close')"><Icon name="close" :size="18" /></button>
    </div>

    <div class="list">
      <template v-if="incoming.length">
        <h3>{{ t.worldRequests }}</h3>
        <div v-for="f in incoming" :key="f.id" class="row request">
          <button type="button" class="who" @click="emit('profile', f.id)">
            <span class="level" aria-hidden="true">{{ f.level }}</span>
            <span class="name">{{ f.name }}</span>
          </button>
          <button type="button" class="btn mint small" :disabled="busy" @click="emit('accept', f.id)"><Icon name="check" :size="16" />{{ t.worldAccept }}</button>
          <button type="button" class="btn gray small round" :disabled="busy" :aria-label="t.worldDecline" :title="t.worldDecline" @click="emit('remove', f.id)"><Icon name="close" :size="16" /></button>
        </div>
      </template>

      <h3>{{ t.worldFriends }}</h3>
      <p v-if="!friends.length" class="muted empty">{{ t.worldNoFriends }}</p>
      <div v-for="f in friends" :key="f.id" class="row">
        <button type="button" class="who" @click="emit('profile', f.id)">
          <span class="level" aria-hidden="true">{{ f.level }}</span>
          <span class="name">{{ f.name }}</span>
          <span :class="['dot', { on: f.online }]" :title="f.online ? t.worldOnline : t.worldOffline"></span>
          <span class="sr-only">{{ f.online ? t.worldOnline : t.worldOffline }}</span>
        </button>
        <button v-if="atHome && f.online" type="button" class="btn lilac small" :disabled="busy" @click="emit('invite', f.id)"><Icon name="plus" :size="16" />{{ t.worldInvite }}</button>
        <button type="button" class="btn sky small" :disabled="busy" @click="emit('visit', f.id)"><Icon name="home" :size="16" />{{ t.worldVisit }}</button>
      </div>

      <template v-if="outgoing.length">
        <h3>{{ t.worldSent }}</h3>
        <div v-for="f in outgoing" :key="f.id" class="row">
          <button type="button" class="who" @click="emit('profile', f.id)">
            <span class="level" aria-hidden="true">{{ f.level }}</span>
            <span class="name">{{ f.name }}</span>
          </button>
          <button type="button" class="btn gray small" :disabled="busy" @click="emit('remove', f.id)">{{ t.worldCancel }}</button>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.count { font-size: 0.8rem; font-weight: 800; }
.list { flex: 1; min-height: 0; overflow-y: auto; padding: 0 1.1rem 1rem; }
h3 { margin: 0.6rem 0 0.4rem; font-size: 0.8rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-soft); }
.row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.45rem;
  padding: 0.35rem 0.4rem 0.35rem 0.35rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 3px 10px -5px rgba(70, 40, 120, 0.35);
}
.row.request { background: #fff3d6; }
.who { flex: 1; min-width: 0; display: flex; align-items: center; gap: 0.5rem; padding: 0; border: 0; background: none; color: inherit; text-align: left; }
.who .level { width: 1.9rem; height: 1.9rem; font-size: 0.8rem; flex-shrink: 0; }
.name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 800; }
.dot { width: 0.6rem; height: 0.6rem; border-radius: 50%; background: #cfcadf; flex-shrink: 0; }
.dot.on { background: #3fcf7a; box-shadow: 0 0 0 3px rgba(63, 207, 122, 0.25); }
.empty { margin: 0 0 0.6rem; font-size: 0.85rem; }
</style>
