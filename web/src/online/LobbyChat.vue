<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { session, CHAT_TEXT } from './session'
import { switchTargets } from './gameSwitch'
import PixelPerson from '../components/PixelPerson.vue'

// The lobby chat (see session.js): everyone in the room, plus a line from the host when
// someone comes, goes, takes a new name or the game changes. Lines read here count as read.
const props = defineProps({
  t: { type: Object, required: true },
  // Height of the message list, as a class
  height: { type: String, default: 'h-48' }
})

const draft = ref('')
const log = ref(null)

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const gameTitle = (id) => switchTargets.value.find(game => game.id === id)?.title || id
const clock = (at) => new Date(at).toLocaleTimeString(props.t.langCode?.toLowerCase(), { hour: '2-digit', minute: '2-digit' })

const SYSTEM_KEYS = { join: 'lobbyChatJoined', leave: 'lobbyChatLeft', game: 'lobbyChatGame', rename: 'lobbyChatRenamed' }
const systemText = (line) => fmt(props.t[SYSTEM_KEYS[line.sys]] || '', { name: line.name, to: line.to, game: gameTitle(line.game) })

const lines = computed(() => session.chat)

function send () {
  if (session.sendChat(draft.value)) draft.value = ''
}

const seen = () => {
  if (!document.hidden) session.markChatSeen()
}

watch(() => lines.value.length, async () => {
  await nextTick()
  if (log.value) log.value.scrollTop = log.value.scrollHeight
  seen()
})

onMounted(() => {
  if (log.value) log.value.scrollTop = log.value.scrollHeight
  seen()
  document.addEventListener('visibilitychange', seen)
})
onUnmounted(() => document.removeEventListener('visibilitychange', seen))
</script>

<template>
  <section class="term-panel flex flex-col" aria-labelledby="lobby-chat-title">
    <h2 id="lobby-chat-title" class="term-label px-3 py-2 border-b border-term-low">{{ t.lobbyChat }}</h2>
    <ol ref="log" :class="[height, 'overflow-y-auto px-3 py-2 space-y-1 text-sm']" aria-live="polite">
      <li v-if="!lines.length" class="term-muted leading-relaxed">{{ t.lobbyChatEmpty }}</li>
      <li v-for="line in lines" :key="line.id" class="break-words leading-relaxed">
        <span class="term-muted tabular-nums mr-2">[{{ clock(line.at) }}]</span>
        <span v-if="line.sys" class="term-muted italic">*** {{ systemText(line) }}</span>
        <template v-else>
          <span :class="['mr-2 whitespace-nowrap', line.from === session.myId ? 'term-muted' : 'font-semibold']">
            <PixelPerson face :av="line.av || 0" size="1.85em" class="-my-1.5 mr-1" />{{ line.name }}&gt;
          </span>
          <span>{{ line.text }}</span>
        </template>
      </li>
    </ol>
    <form class="flex gap-2 p-2 border-t border-term-low" @submit.prevent="send">
      <input
        v-model="draft"
        :maxlength="CHAT_TEXT"
        :placeholder="t.lobbyChatPlaceholder"
        :aria-label="t.lobbyChatPlaceholder"
        autocomplete="off"
        enterkeyhint="send"
        class="term-input h-10 min-w-0"
      />
      <button type="submit" class="term-btn min-h-10 px-3 text-sm" :disabled="!draft.trim()">{{ t.usersSend }}</button>
    </form>
  </section>
</template>
