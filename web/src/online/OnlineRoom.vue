<script setup>
import { ref, computed } from 'vue'
import TermWindow from '../components/TermWindow.vue'

// Shared frame for online games: header, name + create/join screen, connecting spinner and
// the lobby. Games put lobby options in the `lobby` slot and their own screens in the
// default slot, which shows once the host has started (phase is no longer 'lobby').
const props = defineProps({
  room: { type: Object, required: true },
  t: { type: Object, required: true },
  title: { type: String, required: true },
  minPlayers: { type: Number, default: 1 },
  // Extra start condition from the game (e.g. both teams need someone)
  canStart: { type: Boolean, default: true },
  startHint: { type: String, default: '' }
})

const emit = defineEmits(['go-back', 'start'])

const copied = ref(false)

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')

const view = computed(() => props.room.view)
const onlineCount = computed(() => view.value?.players.filter(p => p.online).length || 0)
const enoughPlayers = computed(() => onlineCount.value >= props.minPlayers)
const startDisabled = computed(() => !enoughPlayers.value || !props.canStart)

function onBack () {
  if (props.room.screen === 'home') emit('go-back')
  else props.room.leave()
}

async function shareRoom () {
  const link = props.room.shareLink
  if (navigator.share) {
    try {
      await navigator.share({ title: props.title, url: link })
      return
    } catch (err) {
      if (err?.name === 'AbortError') return // share sheet dismissed
    }
  }
  if (await copyText(link)) {
    copied.value = true
    setTimeout(() => { copied.value = false }, 1800)
  } else {
    // Nothing worked: the link stays selected in the field below for a manual copy
    linkField.value?.select()
  }
}

// The share and clipboard APIs only exist on https (or localhost), so plain http pages such
// as the dev server opened over Wi-Fi fall back to the old copy command
async function copyText (text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
    document.body.appendChild(area)
    area.select()
    area.setSelectionRange(0, text.length)
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      // Copy blocked
    }
    area.remove()
    return ok
  }
}

const linkField = ref(null)

// Not v-model: it waits for the keyboard to finish a "word", which on Android leaves the
// code empty (and Join disabled) while the player is still typing it
function onCodeInput (event) {
  const code = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
  props.room.joinCode = code
  event.target.value = code
}
</script>

<template>
  <TermWindow class="max-w-2xl" :title="title" :backLabel="room.screen === 'home' ? t.back : t.onlineLeave" @back="onBack">
    <template #status>
      <span v-if="room.screen === 'room'" class="term-chip text-term">
        {{ t.onlineRoomLabel }}: <span class="font-mono tracking-[0.25em]">{{ room.roomCode }}</span>
      </span>
    </template>

    <!-- Name + create or join -->
    <div v-if="room.screen === 'home'" class="space-y-6">
      <div v-if="room.errorKey" role="alert" class="flex gap-3 border border-dashed border-term px-4 py-3 text-sm">
        <span class="shrink-0 term-blink" aria-hidden="true">[!]</span>
        <span>{{ t[room.errorKey] }}</span>
      </div>

      <label class="block">
        <span class="term-label">&gt; {{ t.onlineYourName }}</span>
        <input v-model="room.playerName" maxlength="18" :placeholder="t.onlineNamePlaceholder" class="term-input mt-2" />
      </label>

      <div class="grid sm:grid-cols-2 gap-4">
        <div class="term-panel p-4 flex flex-col gap-3">
          <div>
            <h2 class="font-display text-2xl leading-none uppercase">[+] {{ t.onlineCreateRoom }}</h2>
            <p class="term-muted text-sm mt-2">{{ t.onlineCreateHint }}</p>
          </div>
          <button
            @click="room.createRoom()"
            :disabled="!room.playerName.trim()"
            class="term-btn term-btn-primary mt-auto"
          >
            {{ t.onlineCreateRoom }}
          </button>
        </div>

        <div class="term-panel p-4 flex flex-col gap-3">
          <div>
            <h2 class="font-display text-2xl leading-none uppercase">[&gt;] {{ t.onlineJoinRoom }}</h2>
            <p class="term-muted text-sm mt-2">{{ t.onlineJoinHint }}</p>
          </div>
          <input
            :value="room.joinCode"
            @input="onCodeInput"
            @keyup.enter="room.joinRoom()"
            maxlength="4"
            autocapitalize="characters"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            :placeholder="t.onlineCodePlaceholder"
            class="term-input text-lg tracking-[0.4em] uppercase text-center"
          />
          <button
            @click="room.joinRoom()"
            :disabled="!room.playerName.trim() || room.joinCode.length !== 4"
            class="term-btn mt-auto"
          >
            {{ t.onlineJoin }}
          </button>
        </div>
      </div>
    </div>

    <!-- Connecting -->
    <div v-else-if="room.screen === 'connecting' || !view" class="py-16 flex flex-col items-center gap-4" role="status">
      <span class="term-spinner font-display text-5xl leading-none" aria-hidden="true"></span>
      <p class="term-muted uppercase tracking-widest text-sm">{{ t.onlineConnecting }}</p>
    </div>

    <!-- Lobby -->
    <div v-else-if="view.phase === 'lobby'" class="space-y-6">
      <div class="term-panel border-term p-5 text-center">
        <p class="term-label">{{ t.onlineRoomLabel }}</p>
        <p class="font-display text-7xl leading-none tracking-[0.3em] my-3 pl-[0.3em]">{{ room.roomCode }}</p>
        <p class="term-muted text-sm">{{ fmt(t.onlineShareHint, { game: title }) }}</p>
        <button @click="shareRoom" class="term-btn mt-4 min-h-9 text-sm">
          {{ copied ? t.onlineCopied : t.onlineCopyLink }}
        </button>
        <input
          ref="linkField"
          :value="room.shareLink"
          readonly
          :aria-label="t.onlineCopyLink"
          @focus="$event.target.select()"
          class="term-input mt-3 h-9 text-xs text-center term-muted"
        />
      </div>

      <slot name="players" :players="view.players">
        <div>
          <h2 class="term-label mb-3">{{ t.onlinePlayers }} [{{ view.players.length }}]</h2>
          <ul class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <li
              v-for="player in view.players"
              :key="player.id"
              :class="[
                'flex items-center gap-2 border px-3 py-2 text-sm',
                player.id === room.myId ? 'border-term bg-term-deep' : 'border-term-low'
              ]"
            >
              <span :class="['term-dot', { 'is-off': !player.online }]"></span>
              <span class="truncate font-medium">{{ player.name }}</span>
              <span v-if="player.id === view.hostId" class="ml-auto text-[10px] uppercase tracking-wider term-muted">
                {{ t.onlineHostBadge }}
              </span>
            </li>
          </ul>
        </div>
      </slot>

      <slot name="lobby" :view="view" :is-host="room.isHost" />

      <template v-if="room.isHost">
        <button @click="emit('start')" :disabled="startDisabled" class="term-btn term-btn-primary w-full min-h-12">
          {{ t.onlineStart }}
        </button>
        <p v-if="!enoughPlayers" class="term-muted text-center text-sm">{{ fmt(t.onlineNeedPlayers, { n: minPlayers }) }}</p>
        <p v-else-if="!canStart && startHint" class="term-muted text-center text-sm">{{ startHint }}</p>
      </template>
      <p v-else class="term-muted text-center text-sm py-2"><span class="term-cursor">{{ t.onlineWaitingHost }}</span></p>
    </div>

    <!-- The game itself -->
    <slot v-else :view="view" />
  </TermWindow>
</template>
