<script setup>
import { ref, computed, watch } from 'vue'
import { useOnlineRoom } from '../online/useOnlineRoom'
import OnlineRoom from '../online/OnlineRoom.vue'

const props = defineProps({
  isDarkMode: {
    type: Boolean,
    default: false
  },
  t: {
    type: Object,
    required: true
  },
  // Room code from a shared invite link
  initialCode: { type: String, default: '' }
})

defineEmits(['go-back'])

const PROMPT_COUNT = 10
const SPIN_MS = 4200
const REDUCED_SPIN_MS = 600

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// ---------- Host-side game rules ----------

const randomPrompt = (choice, previous) => {
  let key
  do {
    key = `${choice}Q${1 + Math.floor(Math.random() * PROMPT_COUNT)}`
  } while (key === previous)
  return key
}

const isOnline = (s, id) => s.players.some(p => p.id === id && p.online)

// The player the bottle last picked spins next; the host can always step in
const maySpin = (s, playerId) =>
  playerId === s.spinnerId || playerId === s.hostId || !isOnline(s, s.spinnerId)

function spin (s) {
  const seats = s.players
  const candidates = seats.map((p, i) => (p.online ? i : -1)).filter(i => i >= 0)
  if (!candidates.length) return
  const target = candidates[Math.floor(Math.random() * candidates.length)]
  const slice = 360 / seats.length
  // Land somewhere inside the target's slice, not always dead center
  const targetAngle = target * slice + (Math.random() - 0.5) * slice * 0.6
  const current = ((s.rotation % 360) + 360) % 360
  const delta = (((targetAngle - current) % 360) + 360) % 360
  s.rotation += (4 + Math.floor(Math.random() * 3)) * 360 + delta
  s.spinTarget = seats[target].id
  s.selected = null
  s.choice = null
  s.promptKey = null
  s.spinning = true
  s.deadline = Date.now() + SPIN_MS
}

function onAction (s, playerId, action) {
  const isHost = playerId === s.hostId
  switch (action.type) {
    case 'start':
      if (isHost && s.phase === 'lobby') {
        Object.assign(s, { phase: 'play', spinnerId: s.hostId, selected: null, choice: null, promptKey: null, spinning: false })
      }
      break
    case 'spin':
      if (s.phase === 'play' && !s.spinning && maySpin(s, playerId)) spin(s)
      break
    case 'choose':
      if (s.phase === 'play' && !s.spinning && playerId === s.selected && ['truth', 'dare'].includes(action.choice)) {
        s.choice = action.choice
        s.promptKey = randomPrompt(action.choice, s.promptKey)
      }
      break
    case 'another':
      if (s.phase === 'play' && s.choice && (playerId === s.selected || isHost)) {
        s.promptKey = randomPrompt(s.choice, s.promptKey)
      }
      break
    case 'end':
      if (isHost) {
        s.players = s.players.filter(p => p.online)
        Object.assign(s, { phase: 'lobby', spinning: false, selected: null, choice: null, promptKey: null, deadline: null })
      }
      break
  }
}

const room = useOnlineRoom({
  game: 'bottle-spin',
  initialCode: props.initialCode,
  initialState: () => ({
    rotation: 0, spinning: false, spinTarget: null, deadline: null,
    selected: null, spinnerId: null, choice: null, promptKey: null
  }),
  // Guests must not know where the bottle will stop before it does
  project: ({ spinTarget, ...visible }) => visible,
  onAction,
  onTick: (s, now) => {
    if (s.spinning && now >= s.deadline) {
      s.spinning = false
      s.selected = s.spinTarget
      s.spinnerId = s.spinTarget
      s.deadline = null
    }
  }
})

// ---------- View ----------

const view = computed(() => room.view)
const players = computed(() => view.value?.players || [])
const nameOf = (id) => players.value.find(p => p.id === id)?.name || ''
const selectedIndex = computed(() => players.value.findIndex(p => p.id === view.value?.selected))
const iWasPicked = computed(() => view.value?.selected === room.myId)
const canSpin = computed(() => {
  const v = view.value
  if (!v || v.spinning) return false
  return room.myId === v.spinnerId || room.isHost || !players.value.some(p => p.id === v.spinnerId && p.online)
})

// Each player sits at an angle measured clockwise from the top of the table
const sliceAngle = computed(() => 360 / Math.max(1, players.value.length))

const getPlayerStyle = (index) => {
  const angle = (index * sliceAngle.value * Math.PI) / 180
  const radius = 41
  return {
    left: `${50 + radius * Math.sin(angle)}%`,
    top: `${50 - radius * Math.cos(angle)}%`
  }
}

const spotlightStyle = computed(() => {
  if (selectedIndex.value < 0) return {}
  const start = selectedIndex.value * sliceAngle.value - sliceAngle.value / 2
  const color = props.isDarkMode ? 'rgba(139, 92, 246, 0.25)' : 'rgba(139, 92, 246, 0.16)'
  return {
    background: `conic-gradient(from ${start}deg, ${color} 0deg ${sliceAngle.value}deg, transparent ${sliceAngle.value}deg)`
  }
})

// Animate each new spin over the time the host has left on it
const spinDuration = ref(0)
watch(() => view.value?.rotation, (next, previous) => {
  if (previous === undefined || !view.value?.spinning) {
    spinDuration.value = 0
    return
  }
  const remaining = Math.max(0, (view.value.deadline || 0) - Date.now())
  spinDuration.value = prefersReducedMotion() ? Math.min(remaining, REDUCED_SPIN_MS) : remaining
})

const bottleStyle = computed(() => ({
  transform: `translate(-50%, -50%) rotate(${view.value?.rotation || 0}deg)`,
  transition: spinDuration.value ? `transform ${spinDuration.value}ms cubic-bezier(0.12, 0.75, 0.2, 1)` : 'none'
}))

const currentPrompt = computed(() => (view.value?.promptKey ? props.t[view.value.promptKey] : ''))

const statusText = computed(() => {
  const v = view.value
  if (v.spinning) return props.t.spinning
  if (v.selected) return iWasPicked.value ? props.t.bottleYouPicked : fmt(props.t.bottlePicked, { name: nameOf(v.selected) })
  return canSpin.value ? props.t.tapBottleToSpin : fmt(props.t.bottleWaitSpin, { name: nameOf(v.spinnerId) })
})

const muted = computed(() => (props.isDarkMode ? 'text-gray-400' : 'text-gray-500'))
const primary = 'w-full px-6 py-4 rounded-lg font-semibold bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 transition-colors'
</script>

<template>
  <OnlineRoom :room="room" :t="t" :isDarkMode="isDarkMode" :title="t.bottleTitle" :minPlayers="2" @go-back="$emit('go-back')" @start="room.act('start')">
    <div class="space-y-6">
      <!-- Table -->
      <div class="relative mx-auto w-full max-w-sm aspect-square">
        <div
          :class="[
            'absolute inset-[9%] rounded-full border-4 shadow-inner',
            isDarkMode
              ? 'bg-gradient-to-br from-emerald-900/60 to-gray-900 border-gray-700'
              : 'bg-gradient-to-br from-emerald-100 to-emerald-50 border-emerald-200'
          ]"
        ></div>

        <!-- Spotlight towards the selected player -->
        <div
          class="absolute inset-[9%] rounded-full transition-opacity duration-500"
          :class="selectedIndex < 0 ? 'opacity-0' : 'opacity-100'"
          :style="spotlightStyle"
        ></div>

        <!-- Players -->
        <div
          v-for="(player, index) in players"
          :key="player.id"
          :style="getPlayerStyle(index)"
          class="absolute -translate-x-1/2 -translate-y-1/2 z-10"
        >
          <div
            :class="[
              'max-w-[6.5rem] truncate px-3 py-1.5 rounded-lg text-sm font-semibold shadow-md transition-all duration-300',
              selectedIndex === index
                ? 'bg-violet-600 text-white scale-110 player-picked'
                : isDarkMode
                  ? 'bg-gray-800 text-gray-200 border border-gray-700'
                  : 'bg-white text-gray-700 border border-gray-200',
              { 'opacity-40': !player.online, 'ring-2 ring-violet-400': player.id === room.myId && selectedIndex !== index }
            ]"
          >
            {{ player.name }}
          </div>
        </div>

        <!-- Bottle (drawn pointing up; the neck points at the chosen player) -->
        <button
          type="button"
          @click="room.act('spin')"
          :disabled="!canSpin"
          :aria-label="t.spin"
          class="absolute top-1/2 left-1/2 h-[52%] aspect-[1/3] cursor-pointer disabled:cursor-default focus:outline-none"
          :style="bottleStyle"
        >
          <svg viewBox="0 0 40 120" class="h-full w-full bottle-shadow" aria-hidden="true">
            <defs>
              <linearGradient id="bottle-glass" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stop-color="#065f46" />
                <stop offset="45%" stop-color="#10b981" />
                <stop offset="100%" stop-color="#064e3b" />
              </linearGradient>
            </defs>
            <rect x="15" y="2" width="10" height="7" rx="2" fill="#f59e0b" />
            <path
              d="M15 9 h10 v24 c0 6 11 10 11 22 v55 a8 8 0 0 1 -8 8 h-16 a8 8 0 0 1 -8 -8 v-55 c0 -12 11 -16 11 -22 z"
              fill="url(#bottle-glass)"
            />
            <rect x="8" y="66" width="24" height="26" rx="3" fill="#fef3c7" opacity="0.9" />
            <rect x="11" y="74" width="18" height="3" rx="1.5" fill="#b45309" opacity="0.6" />
            <rect x="13" y="80" width="14" height="2" rx="1" fill="#b45309" opacity="0.4" />
            <path d="M10 56 v48" stroke="white" stroke-width="2.5" stroke-linecap="round" opacity="0.35" />
          </svg>
        </button>
      </div>

      <!-- Status -->
      <p
        :class="['text-center font-semibold transition-colors', view.selected && !view.spinning ? 'text-xl text-violet-500' : muted]"
        aria-live="polite"
      >
        {{ statusText }}
      </p>

      <!-- Game Controls -->
      <div class="space-y-4">
        <button v-if="!view.selected || view.spinning" @click="room.act('spin')" :disabled="!canSpin" :class="primary">
          {{ view.spinning ? t.spinning : t.spin }}
        </button>

        <template v-else>
          <div v-if="!view.choice && iWasPicked" class="flex gap-4">
            <button
              @click="room.act('choose', { choice: 'truth' })"
              class="flex-1 px-6 py-4 rounded-lg font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
            >
              {{ t.truth }}
            </button>
            <button
              @click="room.act('choose', { choice: 'dare' })"
              class="flex-1 px-6 py-4 rounded-lg font-semibold bg-rose-500 text-white hover:bg-rose-600 transition-colors"
            >
              {{ t.dare }}
            </button>
          </div>
          <p v-else-if="!view.choice" :class="['text-center text-sm', muted]">
            {{ fmt(t.bottleWaitChoose, { name: nameOf(view.selected) }) }}
          </p>

          <!-- Question/Dare Display -->
          <Transition name="prompt" mode="out-in">
            <div
              v-if="view.choice"
              :key="view.promptKey"
              :class="[
                'p-6 rounded-lg text-center border',
                view.choice === 'truth'
                  ? isDarkMode ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-100' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : isDarkMode ? 'bg-rose-500/10 border-rose-500/40 text-rose-100' : 'bg-rose-50 border-rose-200 text-rose-900'
              ]"
            >
              <p class="text-xs font-bold uppercase tracking-[0.18em] mb-2 opacity-70">
                {{ nameOf(view.selected) }} · {{ view.choice === 'truth' ? t.truth : t.dare }}
              </p>
              <p class="text-lg font-medium">{{ currentPrompt }}</p>
            </div>
          </Transition>

          <div v-if="view.choice && (iWasPicked || room.isHost)" class="flex gap-4">
            <button
              @click="room.act('another')"
              :class="[
                'flex-1 px-4 py-3 rounded-lg font-semibold border transition-colors',
                isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'
              ]"
            >
              {{ t.anotherPrompt }}
            </button>
            <button
              v-if="canSpin"
              @click="room.act('spin')"
              class="flex-1 px-4 py-3 rounded-lg font-semibold bg-violet-600 text-white hover:bg-violet-500 transition-colors"
            >
              {{ t.spinAgain }}
            </button>
          </div>
          <p v-else-if="view.choice" :class="['text-center text-sm', muted]">
            {{ fmt(t.bottleWaitSpin, { name: nameOf(view.spinnerId) }) }}
          </p>
        </template>

        <button
          v-if="room.isHost"
          @click="room.act('end')"
          :disabled="view.spinning"
          :class="['w-full text-sm disabled:opacity-50', isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700']"
        >
          {{ t.onlineBackToLobby }}
        </button>
      </div>
    </div>
  </OnlineRoom>
</template>

<style scoped>
.bottle-shadow {
  filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.3));
}

.player-picked {
  animation: picked-pulse 1.2s ease-in-out infinite;
}

@keyframes picked-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.5); }
  50% { box-shadow: 0 0 0 10px rgba(139, 92, 246, 0); }
}

.prompt-enter-active,
.prompt-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.prompt-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.prompt-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (prefers-reduced-motion: reduce) {
  .player-picked {
    animation: none;
  }
}
</style>
