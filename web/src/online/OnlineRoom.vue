<script setup>
import { ref, computed } from 'vue'

// Shared frame for online games: header, name + create/join screen, connecting spinner and
// the lobby. Games put lobby options in the `lobby` slot and their own screens in the
// default slot, which shows once the host has started (phase is no longer 'lobby').
const props = defineProps({
  room: { type: Object, required: true },
  t: { type: Object, required: true },
  isDarkMode: { type: Boolean, default: false },
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

const muted = computed(() => (props.isDarkMode ? 'text-gray-400' : 'text-gray-600'))
const label = computed(() => ['text-xs font-semibold uppercase tracking-wider', props.isDarkMode ? 'text-gray-400' : 'text-gray-500'])
const inputClass = computed(() => [
  'w-full h-11 px-3 rounded-lg border outline-none transition-colors focus:ring-2 focus:ring-violet-500/40',
  props.isDarkMode ? 'bg-gray-950 border-gray-700 text-white focus:border-violet-400' : 'bg-white border-gray-300 focus:border-violet-500'
])

function onBack () {
  if (props.room.screen === 'home') emit('go-back')
  else props.room.leave()
}

async function shareRoom () {
  try {
    if (navigator.share) {
      await navigator.share({ title: props.title, url: props.room.shareLink })
      return
    }
    await navigator.clipboard.writeText(props.room.shareLink)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1800)
  } catch {
    // Share sheet dismissed or clipboard blocked; the code is still on screen
  }
}

function onCodeInput () {
  props.room.joinCode = props.room.joinCode.toUpperCase().replace(/[^A-Z0-9]/g, '')
}
</script>

<template>
  <div
    :class="[
      'max-w-2xl mx-auto rounded-xl border p-5 sm:p-8 transition-colors duration-150',
      isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-lg'
    ]"
  >
    <!-- Header -->
    <div class="flex justify-between items-center gap-3 mb-6">
      <button
        @click="onBack"
        :class="[
          'px-3 py-2 rounded-lg transition-colors duration-150 flex items-center gap-2 text-sm font-medium',
          isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        ]"
      >
        <span class="text-lg">←</span>
        <span>{{ room.screen === 'home' ? t.back : t.onlineLeave }}</span>
      </button>
      <div class="flex items-center gap-2 min-w-0">
        <span
          v-if="room.screen === 'room'"
          :class="[
            'font-mono text-sm font-semibold tracking-widest px-2 py-1 rounded-md border',
            isDarkMode ? 'border-gray-700 text-gray-200' : 'border-gray-200 text-gray-700'
          ]"
        >
          {{ room.roomCode }}
        </span>
        <h1 class="text-xl sm:text-2xl font-bold truncate">{{ title }}</h1>
      </div>
    </div>

    <!-- Name + create or join -->
    <div v-if="room.screen === 'home'" class="space-y-6">
      <div
        v-if="room.errorKey"
        :class="[
          'rounded-lg border px-4 py-3 text-sm',
          isDarkMode ? 'border-rose-500/40 bg-rose-500/10 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-800'
        ]"
      >
        {{ t[room.errorKey] }}
      </div>

      <label class="block">
        <span :class="label">{{ t.onlineYourName }}</span>
        <input v-model="room.playerName" maxlength="18" :placeholder="t.onlineNamePlaceholder" :class="[inputClass, 'mt-2']" />
      </label>

      <div class="grid sm:grid-cols-2 gap-4">
        <div :class="['rounded-lg border p-4 flex flex-col gap-3', isDarkMode ? 'border-gray-800' : 'border-gray-200']">
          <div>
            <h2 class="font-semibold">{{ t.onlineCreateRoom }}</h2>
            <p :class="['text-sm mt-1', muted]">{{ t.onlineCreateHint }}</p>
          </div>
          <button
            @click="room.createRoom()"
            :disabled="!room.playerName.trim()"
            class="mt-auto h-11 rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {{ t.onlineCreateRoom }}
          </button>
        </div>

        <div :class="['rounded-lg border p-4 flex flex-col gap-3', isDarkMode ? 'border-gray-800' : 'border-gray-200']">
          <div>
            <h2 class="font-semibold">{{ t.onlineJoinRoom }}</h2>
            <p :class="['text-sm mt-1', muted]">{{ t.onlineJoinHint }}</p>
          </div>
          <input
            v-model="room.joinCode"
            @input="onCodeInput"
            @keyup.enter="room.joinRoom()"
            maxlength="4"
            autocapitalize="characters"
            autocomplete="off"
            :placeholder="t.onlineCodePlaceholder"
            :class="[inputClass, 'font-mono text-lg tracking-[0.4em] uppercase text-center']"
          />
          <button
            @click="room.joinRoom()"
            :disabled="!room.playerName.trim() || room.joinCode.length !== 4"
            :class="[
              'mt-auto h-11 rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors',
              isDarkMode ? 'bg-white text-gray-900 hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-700'
            ]"
          >
            {{ t.onlineJoin }}
          </button>
        </div>
      </div>
    </div>

    <!-- Connecting -->
    <div v-else-if="room.screen === 'connecting' || !view" class="py-16 flex flex-col items-center gap-4">
      <div class="h-8 w-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"></div>
      <p :class="muted">{{ t.onlineConnecting }}</p>
    </div>

    <!-- Lobby -->
    <div v-else-if="view.phase === 'lobby'" class="space-y-6">
      <div :class="['rounded-lg border p-5 text-center', isDarkMode ? 'border-gray-800 bg-gray-950/50' : 'border-gray-200 bg-gray-50']">
        <p :class="label">{{ t.onlineRoomLabel }}</p>
        <p class="font-mono text-5xl font-bold tracking-[0.3em] my-3 pl-[0.3em]">{{ room.roomCode }}</p>
        <p :class="['text-sm', muted]">{{ fmt(t.onlineShareHint, { game: title }) }}</p>
        <button
          @click="shareRoom"
          :class="[
            'mt-4 h-9 px-4 rounded-lg border text-sm font-medium transition-colors',
            isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-white'
          ]"
        >
          {{ copied ? t.onlineCopied : t.onlineCopyLink }}
        </button>
      </div>

      <slot name="players" :players="view.players">
        <div>
          <h2 :class="[label, 'mb-3']">{{ t.onlinePlayers }} · {{ view.players.length }}</h2>
          <ul class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <li
              v-for="player in view.players"
              :key="player.id"
              :class="[
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                player.id === room.myId
                  ? (isDarkMode ? 'bg-violet-500/10 border-violet-500/40' : 'bg-violet-50 border-violet-200')
                  : (isDarkMode ? 'border-gray-800' : 'border-gray-200')
              ]"
            >
              <span :class="['h-2 w-2 rounded-full shrink-0', player.online ? 'bg-emerald-500' : 'bg-gray-400']"></span>
              <span class="truncate font-medium">{{ player.name }}</span>
              <span v-if="player.id === view.hostId" :class="['ml-auto text-[10px] uppercase tracking-wider', isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                {{ t.onlineHostBadge }}
              </span>
            </li>
          </ul>
        </div>
      </slot>

      <slot name="lobby" :view="view" :is-host="room.isHost" />

      <template v-if="room.isHost">
        <button
          @click="emit('start')"
          :disabled="startDisabled"
          class="w-full h-12 rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {{ t.onlineStart }}
        </button>
        <p v-if="!enoughPlayers" :class="['text-center text-sm', muted]">{{ fmt(t.onlineNeedPlayers, { n: minPlayers }) }}</p>
        <p v-else-if="!canStart && startHint" :class="['text-center text-sm', muted]">{{ startHint }}</p>
      </template>
      <p v-else :class="['text-center text-sm py-2', muted]">{{ t.onlineWaitingHost }}</p>
    </div>

    <!-- The game itself -->
    <slot v-else :view="view" />
  </div>
</template>
