<script setup>
import { ref, watch, nextTick } from 'vue'
import Icon from './Icon.vue'

// The chat log of the room and the line to type in. Bubbles over heads show what's said too;
// this keeps the last few dozen lines to scroll back through.
const props = defineProps({
  t: { type: Object, required: true },
  log: { type: Array, required: true } // [{ key, name, text, mine, system }]
})

const emit = defineEmits(['send', 'close'])

const text = ref('')
const input = ref(null)
const list = ref(null)

function send () {
  const line = text.value.trim()
  if (!line) return
  emit('send', line)
  text.value = ''
}

function onKey (event) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    if (text.value) text.value = ''
    else {
      input.value.blur()
      emit('close')
    }
  }
}

watch(() => props.log.length, async () => {
  await nextTick()
  if (list.value) list.value.scrollTop = list.value.scrollHeight
}, { immediate: true })

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <section class="chat panel" :aria-label="t.worldChat">
    <ol ref="list" class="log" aria-live="polite">
      <li v-if="!log.length" class="muted empty">{{ t.worldChatEmpty }}</li>
      <li v-for="line in log" :key="line.key" :class="{ mine: line.mine, system: line.system }">
        <template v-if="line.system">{{ line.text }}</template>
        <template v-else><b>{{ line.name }}</b> {{ line.text }}</template>
      </li>
    </ol>
    <form class="say" @submit.prevent="send">
      <input
        ref="input"
        v-model="text"
        class="field"
        maxlength="120"
        enterkeyhint="send"
        autocomplete="off"
        :placeholder="t.worldSayPlaceholder"
        :aria-label="t.worldSayPlaceholder"
        @keydown="onKey"
      />
      <button type="submit" class="btn round" :disabled="!text.trim()" :aria-label="t.worldSend" :title="t.worldSend"><Icon name="send" :size="20" /></button>
    </form>
  </section>
</template>

<style scoped>
.chat {
  position: absolute;
  left: 1rem;
  bottom: 6.6rem;
  width: min(22rem, calc(100% - 2rem));
  display: flex;
  flex-direction: column;
  border-radius: 24px;
  z-index: 18;
}
.log {
  max-height: 12.5rem;
  margin: 0;
  padding: 0.7rem 0.9rem 0.3rem;
  overflow-y: auto;
  list-style: none;
  font-size: 0.86rem;
  line-height: 1.35;
  user-select: text;
}
.log li { padding: 0.12rem 0; overflow-wrap: anywhere; }
.log b { font-weight: 900; color: var(--lilac); }
.log .mine b { color: var(--pink); }
.log .system { color: var(--ink-soft); font-style: italic; font-size: 0.8rem; }
.empty { font-size: 0.82rem; }
.say { display: flex; gap: 0.45rem; padding: 0.5rem; }
.say .field { min-height: 2.75rem; }
@media (max-width: 640px) {
  .chat { left: 0.5rem; right: 0.5rem; width: auto; bottom: 5.6rem; }
  .log { max-height: 8.5rem; }
}
</style>
