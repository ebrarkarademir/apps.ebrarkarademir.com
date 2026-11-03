<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'

// The table's chat: what people say, and the table's own announcements in between (who won what,
// a Blackjack, the dealer busting, a gift, someone sitting down). BlackjackStage keeps the lines;
// this shows them, newest at the bottom, and sends what's typed.
//
// A line: { id, kind: 'chat', name, text, mine } or { id, kind: 'news', text, tone, icon }, tone
// being 'good', 'bad', 'big' or ''.
const props = defineProps({
  t: { type: Object, required: true },
  lines: { type: Array, required: true },
  maxLength: { type: Number, default: 200 },
  closable: { type: Boolean, default: false }
})

const emit = defineEmits(['send', 'close'])

const draft = ref('')
const log = ref(null)
const input = ref(null)

function send () {
  const text = draft.value.trim()
  if (!text) return
  emit('send', text)
  draft.value = ''
}

// Kept scrolled to the newest line, unless someone has scrolled up to read
let pinned = true
function onScroll () {
  const el = log.value
  if (el) pinned = el.scrollHeight - el.scrollTop - el.clientHeight < 40
}

async function toBottom (force = false) {
  await nextTick()
  if (log.value && (pinned || force)) log.value.scrollTop = log.value.scrollHeight
}

watch(() => props.lines.length, () => toBottom())
onMounted(() => toBottom(true))

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <section class="chat" :aria-label="t.bjChat">
    <header class="chat-head">
      <span class="chat-title">{{ t.bjChat }}</span>
      <button v-if="closable" type="button" class="chat-close" :aria-label="t.bjChatClose" :title="t.bjChatClose" @click="emit('close')">×</button>
    </header>

    <ol ref="log" class="chat-log" aria-live="polite" @scroll="onScroll">
      <li v-if="!lines.length" class="line empty">{{ t.bjChatEmpty }}</li>
      <li v-for="line in lines" :key="line.id" :class="['line', `is-${line.kind}`, line.tone && `tone-${line.tone}`, { mine: line.mine }]">
        <template v-if="line.kind === 'chat'">
          <span class="who">{{ line.name }}</span>
          <span class="text">{{ line.text }}</span>
        </template>
        <template v-else>
          <img v-if="line.icon" class="icon" :src="line.icon" alt="" draggable="false" />
          <span class="text">{{ line.text }}</span>
        </template>
      </li>
    </ol>

    <form class="chat-form" @submit.prevent="send">
      <input
        ref="input"
        v-model="draft"
        :maxlength="maxLength"
        :placeholder="t.bjChatPlaceholder"
        :aria-label="t.bjChatPlaceholder"
        autocomplete="off"
        enterkeyhint="send"
        class="chat-input"
        @keydown.stop
      />
      <button type="submit" class="chat-send" :disabled="!draft.trim()">{{ t.bjChatSend }}</button>
    </form>
  </section>
</template>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  border: 2px solid #3a2414;
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgb(0 0 0 / 0.25), transparent 40%),
    #1a120c;
  box-shadow: inset 0 0 0 1px #c9a227, 0 8px 24px rgb(0 0 0 / 0.5);
  color: #fdf6e3;
  text-shadow: none;
  overflow: hidden;
}

.chat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.4rem 0.7rem;
  border-bottom: 1px solid rgb(201 162 39 / 0.4);
  background: rgb(201 162 39 / 0.08);
}

.chat-title {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #e9c55a;
}

.chat-close {
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 9999px;
  color: #fdf6e3;
  font-size: 1.2rem;
  line-height: 1;
}

.chat-close:hover,
.chat-close:focus-visible {
  background: rgb(255 255 255 / 0.1);
}

.chat-log {
  flex: 1 1 0;
  min-height: 0;
  margin: 0;
  padding: 0.5rem 0.6rem;
  overflow-y: auto;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.78rem;
  line-height: 1.35;
  overscroll-behavior: contain;
}

.line {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  overflow-wrap: anywhere;
  animation: line-in 0.25s ease both;
}

.line.empty {
  color: rgb(253 246 227 / 0.5);
  font-style: italic;
}

.is-chat .who {
  flex: none;
  max-width: 45%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 800;
  color: #8fd0ff;
}

.is-chat .who::after {
  content: ':';
}

.is-chat.mine .who {
  color: #ffe58a;
}

/* The table's announcements: a coloured strip, gold for a big win */
.is-news {
  align-items: center;
  padding: 0.2rem 0.45rem;
  border-left: 3px solid rgb(253 246 227 / 0.35);
  border-radius: 4px;
  background: rgb(255 255 255 / 0.05);
  color: rgb(253 246 227 / 0.85);
  font-size: 0.74rem;
}

.is-news.tone-good {
  border-left-color: #5bd47a;
  color: #b9f5c8;
}

.is-news.tone-bad {
  border-left-color: #e05a5a;
  color: #ffc6c6;
}

.is-news.tone-big {
  border-left-color: #ffe58a;
  background: linear-gradient(90deg, rgb(255 229 138 / 0.22), rgb(255 229 138 / 0.04));
  color: #ffe58a;
  font-weight: 800;
}

.icon {
  flex: none;
  width: 1.2rem;
  height: 1.2rem;
  image-rendering: pixelated;
}

.chat-form {
  display: flex;
  gap: 0.35rem;
  padding: 0.45rem;
  border-top: 1px solid rgb(201 162 39 / 0.4);
}

.chat-input {
  flex: 1 1 auto;
  min-width: 0;
  height: 2.3rem;
  padding: 0 0.6rem;
  border: 1px solid rgb(201 162 39 / 0.5);
  border-radius: 8px;
  background: rgb(0 0 0 / 0.45);
  color: #fdf6e3;
  font-size: 16px; /* no zooming in on a phone */
}

.chat-input:focus {
  outline: none;
  border-color: #ffe58a;
  box-shadow: 0 0 0 2px rgb(255 229 138 / 0.25);
}

.chat-send {
  flex: none;
  height: 2.3rem;
  padding: 0 0.75rem;
  border-radius: 8px;
  background: #c9a227;
  color: #1a1203;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
}

.chat-send:disabled {
  opacity: 0.45;
}

@keyframes line-in {
  from { transform: translateY(4px); opacity: 0; }
  to { transform: none; opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .line {
    animation: none;
  }
}
</style>
