<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import TermWindow from '../components/TermWindow.vue'
import LobbyChat from '../online/LobbyChat.vue'
import { session, roomInfo, SESSION_MS } from '../online/session'
import PixelPerson from '../components/PixelPerson.vue'

// The Lobby page: every lobby open on the site right now (from the users list, see useUsers.js),
// what each plays, who's inside and how long it has left, with a Join button. The lobby this
// tab is in comes first, with its chat. A new lobby can be opened here too.
const props = defineProps({
  users: { type: Object, required: true },
  // The online games: [{ id, title, icon }]
  games: { type: Array, required: true },
  t: { type: Object, required: true }
})

// join: { game, code }; open: a game id, to go to that game's page; create: a game id
const emit = defineEmits(['back', 'join', 'open', 'create'])

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')

const now = ref(Date.now())
let clock = null
onMounted(() => { clock = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => clearInterval(clock))

const gameOf = (id) => props.games.find(game => game.id === id) || { id, title: id, icon: '[?]' }
const minutesLeft = (ends) => Math.min(SESSION_MS / 60000, Math.max(0, Math.ceil((ends - now.value) / 60000)))
const phaseText = (phase) => (phase === 'lobby' ? props.t.lobbyPhaseLobby : props.t.lobbyPhasePlaying)

const mine = computed(() => roomInfo.value)
// Fullest first; the one this tab is in is shown above, not again in the list
const lobbies = computed(() => props.users.lobbies
  .filter(lobby => lobby.ends > now.value && lobby.code !== mine.value?.code)
  .sort((a, b) => b.players.length - a.players.length))

const openCode = ref(null) // the lobby whose details are open
const toggle = (code) => { openCode.value = openCode.value === code ? null : code }

const picking = ref(false)
function create (game) {
  picking.value = false
  emit('create', game)
}
</script>

<template>
  <TermWindow class="max-w-6xl" :title="t.lobbyTitle" :backLabel="t.back" @back="emit('back')">
    <template #status>
      <span class="term-chip text-term">
        <span :class="['term-dot', { 'is-off': !users.online }]" aria-hidden="true"></span>
        {{ users.online ? fmt(t.lobbyCount, { n: lobbies.length + (mine ? 1 : 0) }) : t.onlineConnecting }}
      </span>
    </template>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      <!-- The lobby this tab is in -->
      <section v-if="mine" class="space-y-4" aria-labelledby="lobby-mine-title">
        <div class="term-panel border-term p-4 space-y-4">
          <div class="flex items-start gap-4">
            <div class="min-w-0 flex-1">
              <h2 id="lobby-mine-title" class="term-label">{{ t.lobbyYours }}</h2>
              <p class="font-display text-5xl leading-none tracking-[0.3em] mt-2">{{ mine.code }}</p>
              <p class="mt-2 text-sm">
                <span class="mr-1.5" aria-hidden="true">{{ gameOf(mine.game).icon }}</span>{{ gameOf(mine.game).title }}
                <span class="term-muted">· {{ phaseText(mine.phase) }} · {{ fmt(t.onlineTimeLeft, { n: minutesLeft(mine.ends) }) }}</span>
              </p>
            </div>
          </div>
          <ul class="grid grid-cols-2 gap-2">
            <li v-for="player in mine.players" :key="player.id" :class="['flex items-center gap-2 border px-2 py-1.5 text-sm', player.id === session.myId ? 'border-term bg-term-deep' : 'border-term-low']">
              <PixelPerson face :av="player.av || 0" size="1.75rem" class="-my-1" />
              <span class="truncate">{{ player.name }}</span>
              <span v-if="player.host" class="ml-auto text-[10px] uppercase tracking-wider term-muted">{{ t.onlineHostBadge }}</span>
            </li>
          </ul>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="term-btn term-btn-primary min-h-10 flex-1" @click="emit('open', mine.game)">{{ t.lobbyOpenGame }}</button>
            <button type="button" class="term-btn min-h-10" @click="session.leave()">{{ t.onlineLeave }}</button>
          </div>
        </div>
        <LobbyChat :t="t" height="h-64" />
      </section>

      <!-- Everyone else's -->
      <section aria-labelledby="lobby-list-title" :class="{ 'lg:col-span-2': !mine }">
        <h2 id="lobby-list-title" class="term-label mb-3">{{ t.lobbyList }} [{{ lobbies.length }}]</h2>
        <p v-if="!lobbies.length" class="term-panel border-dashed p-4 text-sm term-muted leading-relaxed">{{ t.lobbyNone }}</p>
        <ul v-else :class="['grid grid-cols-1 gap-3', mine ? '' : 'md:grid-cols-2']">
          <li v-for="lobby in lobbies" :key="lobby.code" class="term-panel">
            <button
              type="button"
              class="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-term-deep"
              :aria-expanded="openCode === lobby.code"
              @click="toggle(lobby.code)"
            >
              <span class="h-10 w-10 shrink-0 border border-term-low flex items-center justify-center font-mono text-xs" aria-hidden="true">{{ gameOf(lobby.game).icon }}</span>
              <span class="min-w-0 flex-1">
                <span class="flex items-baseline gap-2">
                  <span class="font-semibold truncate">{{ gameOf(lobby.game).title }}</span>
                  <span class="term-chip shrink-0 tracking-[0.2em]">{{ lobby.code }}</span>
                </span>
                <span class="block text-xs term-muted mt-1 truncate">
                  {{ fmt(t.lobbyHostedBy, { name: lobby.hostName }) }} · {{ fmt(t.lobbyPlayersN, { n: lobby.players.length }) }} · {{ phaseText(lobby.phase) }}
                </span>
                <!-- On a phone the time left goes under, so the game's name has the room -->
                <span class="sm:hidden block text-xs tabular-nums term-muted mt-0.5">{{ fmt(t.onlineTimeLeft, { n: minutesLeft(lobby.ends) }) }}</span>
              </span>
              <span class="max-sm:hidden shrink-0 text-xs tabular-nums term-muted">{{ fmt(t.onlineTimeLeft, { n: minutesLeft(lobby.ends) }) }}</span>
              <span class="shrink-0" aria-hidden="true">{{ openCode === lobby.code ? '[-]' : '[+]' }}</span>
            </button>
            <div v-if="openCode === lobby.code" class="px-3 pb-3 space-y-3 border-t border-term-low pt-3">
              <h3 class="term-label">{{ t.lobbyInside }}</h3>
              <ul class="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2">
                <li v-for="player in lobby.players" :key="player.name" class="flex items-center gap-2 border border-term-low px-2 py-1.5 text-sm">
                  <PixelPerson face :av="player.av || 0" size="1.75rem" class="-my-1" />
                  <span class="truncate">{{ player.name }}</span>
                  <span v-if="player.host" class="ml-auto text-[10px] uppercase tracking-wider term-muted">{{ t.onlineHostBadge }}</span>
                </li>
              </ul>
              <button type="button" class="term-btn term-btn-primary w-full min-h-10" @click="emit('join', { game: lobby.game, code: lobby.code })">
                {{ t.lobbyJoin }}
              </button>
              <p v-if="mine" class="term-muted text-xs leading-relaxed">{{ t.lobbyJoinLeaves }}</p>
            </div>
          </li>
        </ul>

        <!-- A new lobby -->
        <div class="mt-6">
          <button type="button" class="term-btn w-full min-h-10" :aria-expanded="picking" @click="picking = !picking">[+] {{ t.lobbyNew }}</button>
          <div v-if="picking" class="mt-3 space-y-3">
            <p class="term-muted text-sm text-center">{{ mine?.host ? t.lobbyNewSwitches : mine ? t.lobbyJoinLeaves : t.lobbyNewHint }}</p>
            <ul class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <li v-for="game in games" :key="game.id">
                <button type="button" class="term-card w-full h-full flex items-center gap-2 px-3 py-2 text-left text-sm" @click="create(game.id)">
                  <span class="shrink-0 font-mono text-xs term-muted" aria-hidden="true">{{ game.icon }}</span>
                  <span class="truncate font-medium">{{ game.title }}</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  </TermWindow>
</template>
