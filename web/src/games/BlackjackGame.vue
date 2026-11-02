<script setup>
import { ref, computed, watch } from 'vue'
import TermWindow from '../components/TermWindow.vue'
import BlackjackTable from './blackjack/BlackjackTable.vue'
import { useBlackjack } from './blackjack/useBlackjack'
import { money } from './blackjack/chips'
import { profile as siteProfile } from '../online/profile'

// Blackjack against the dealer, alone or at a table of up to five, with chips that last: the
// tables run on the server (backend/src/blackjack), which keeps everyone's balance and stats.
// This page is the lobby (your chips and stats, a table of your own, one to share, or a
// friend's by code) and then the table itself.
const props = defineProps({
  t: { type: Object, required: true },
  // A table code from a shared link
  initialCode: { type: String, default: '' }
})

const emit = defineEmits(['go-back'])

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const nameOf = () => siteProfile.name || props.t.bjYou

const bj = useBlackjack(nameOf)
const { state } = bj

const joinCode = ref((props.initialCode || '').toUpperCase())
const listed = ref(true)
const copied = ref(false)

const atTable = computed(() => !!state.table)
const stats = computed(() => state.profile?.stats || {})
const winRate = computed(() => {
  const decided = (stats.value.wins || 0) + (stats.value.losses || 0)
  return decided ? `${Math.round(((stats.value.wins || 0) / decided) * 100)}%` : '–'
})
const statRows = computed(() => [
  { label: props.t.bjStatHands, value: stats.value.hands || 0 },
  { label: props.t.bjStatWinRate, value: winRate.value },
  { label: props.t.bjStatBlackjacks, value: stats.value.blackjacks || 0 },
  { label: props.t.bjStatBiggest, value: money(stats.value.biggestWin || 0) },
  { label: props.t.bjStatNet, value: money(stats.value.net || 0, { sign: true }) },
  { label: props.t.bjStatPeak, value: money(stats.value.peak || 0) },
  { label: props.t.bjStatPushes, value: stats.value.pushes || 0 },
  { label: props.t.bjStatBusts, value: stats.value.busts || 0 },
  { label: props.t.bjStatRefills, value: stats.value.refills || 0 }
])

const broke = computed(() => state.profile && state.profile.balance < state.rules.minBet)
const errorText = computed(() => {
  if (!state.error) return ''
  const text = props.t[`bjErr_${state.error}`] || props.t.bjErr_unknown
  return fmt(text, { min: money(state.rules.minBet), max: money(state.rules.maxBet) })
})

// A shared link brings a friend straight to the table, once the server knows them
let usedCode = false
watch(() => state.ready, (ready) => {
  if (!ready || usedCode || !joinCode.value || joinCode.value.length !== 4) return
  usedCode = true
  bj.join(joinCode.value)
})

const shareLink = computed(() => (state.table?.code ? `${location.origin}/blackjack?join=${state.table.code}` : ''))

async function copyLink () {
  const link = shareLink.value
  if (!link) return
  if (navigator.share) {
    try {
      await navigator.share({ title: props.t.blackjackTitle, url: link })
      return
    } catch (err) {
      if (err?.name === 'AbortError') return
    }
  }
  try {
    await navigator.clipboard.writeText(link)
  } catch {
    const area = document.createElement('textarea')
    area.value = link
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    area.remove()
  }
  copied.value = true
  setTimeout(() => { copied.value = false }, 1800)
}

function onBack () {
  if (state.practice) bj.stopPractice()
  else if (atTable.value) bj.leave()
  else emit('go-back')
}

function onCodeInput (event) {
  const code = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
  joinCode.value = code
  event.target.value = code
}

const statusText = computed(() => {
  if (state.practice) return props.t.bjPracticeLabel
  if (state.ready) return props.t.bjOnline
  if (state.status === 'down') return props.t.bjOffline
  return props.t.bjConnecting
})
</script>

<template>
  <TermWindow
    :class="atTable ? 'max-w-6xl' : 'max-w-4xl'"
    :title="t.blackjackTitle"
    :backLabel="atTable ? t.bjLeave : t.back"
    @back="onBack"
  >
    <template #status>
      <span class="flex flex-wrap items-center justify-end gap-2">
        <span v-if="state.table?.code && !state.practice" class="term-chip text-term">
          {{ t.bjTableCode }}: <span class="font-mono tracking-[0.25em]">{{ state.table.code }}</span>
        </span>
        <button v-if="state.table?.kind === 'shared'" type="button" class="term-btn min-h-8 px-2 text-xs" @click="copyLink">
          {{ copied ? t.bjCopied : t.bjCopyLink }}
        </button>
        <span class="term-chip">
          <span :class="['term-dot', { 'is-off': !state.ready && !state.practice }]" aria-hidden="true"></span>
          {{ statusText }}
        </span>
      </span>
    </template>

    <p v-if="errorText" role="alert" class="mb-4 flex gap-3 border border-dashed border-term px-4 py-2 text-sm">
      <span class="shrink-0 term-blink" aria-hidden="true">[!]</span>
      <span>{{ errorText }}</span>
    </p>

    <!-- At a table -->
    <template v-if="atTable && state.profile">
      <p v-if="state.practice" class="mb-3 text-center text-xs term-muted">{{ t.bjPracticeNote }}</p>
      <BlackjackTable
        :t="t"
        :table="state.table"
        :profile="state.profile"
        :busy="state.busy"
        @bet="(amount, done) => bj.bet(amount).then(done)"
        @deal="bj.deal"
        @act="bj.act"
        @refill="bj.refill"
      />
    </template>

    <!-- Not connected -->
    <div v-else-if="!state.ready" class="py-10 flex flex-col items-center gap-4 text-center" role="status">
      <template v-if="state.status === 'down'">
        <p class="font-display text-5xl leading-none" aria-hidden="true">[x]</p>
        <p class="max-w-md text-sm leading-relaxed term-muted">{{ t.bjOfflineText }}</p>
        <div class="flex flex-wrap justify-center gap-3">
          <button type="button" class="term-btn min-h-11" @click="bj.reconnect()">{{ t.bjRetry }}</button>
          <button type="button" class="term-btn term-btn-primary min-h-11" @click="bj.startPractice()">{{ t.bjPractice }}</button>
        </div>
      </template>
      <template v-else>
        <span class="term-spinner font-display text-5xl leading-none" aria-hidden="true"></span>
        <p class="term-muted uppercase tracking-widest text-sm">{{ t.bjConnecting }}</p>
      </template>
    </div>

    <!-- The lobby -->
    <div v-else class="space-y-6">
      <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <section class="term-panel border-term p-4 text-center flex flex-col justify-center" aria-labelledby="bj-balance">
          <h2 id="bj-balance" class="term-label">{{ t.bjBalance }}</h2>
          <p class="font-display text-6xl leading-none my-2 tabular-nums">{{ money(state.profile?.balance || 0) }}</p>
          <p class="term-muted text-xs">{{ state.profile?.name }}</p>
          <div v-if="broke" class="mt-3 flex flex-col items-center gap-2">
            <span class="text-sm font-semibold">{{ t.bjBroke }}</span>
            <button type="button" class="term-btn term-btn-primary min-h-10" @click="bj.refill()">{{ t.bjRefill }}</button>
          </div>
        </section>

        <section class="term-panel p-4" aria-labelledby="bj-stats">
          <h2 id="bj-stats" class="term-label mb-3">{{ t.bjStats }}</h2>
          <dl class="grid grid-cols-3 gap-x-3 gap-y-3">
            <div v-for="row in statRows" :key="row.label" class="min-w-0">
              <dt class="text-[10px] uppercase tracking-wider term-muted truncate">{{ row.label }}</dt>
              <dd class="font-display text-2xl leading-none tabular-nums truncate">{{ row.value }}</dd>
            </div>
          </dl>
        </section>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <div class="term-panel p-4 flex flex-col gap-3">
          <h2 class="font-display text-2xl leading-none uppercase">[1] {{ t.bjPlaySolo }}</h2>
          <p class="term-muted text-sm leading-relaxed">{{ t.bjPlaySoloHint }}</p>
          <button type="button" class="term-btn term-btn-primary mt-auto" :disabled="state.busy" @click="bj.playSolo()">{{ t.bjPlaySolo }}</button>
        </div>
        <div class="term-panel p-4 flex flex-col gap-3">
          <h2 class="font-display text-2xl leading-none uppercase">[5] {{ t.bjOpenTable }}</h2>
          <p class="term-muted text-sm leading-relaxed">{{ t.bjOpenTableHint }}</p>
          <label class="flex items-center gap-2 text-sm">
            <input v-model="listed" type="checkbox" class="accent-[#00ff00]" />
            <span>{{ t.bjPublic }}</span>
          </label>
          <button type="button" class="term-btn mt-auto" :disabled="state.busy" @click="bj.openTable(listed)">{{ t.bjOpenTable }}</button>
        </div>
        <div class="term-panel p-4 flex flex-col gap-3">
          <h2 class="font-display text-2xl leading-none uppercase">[&gt;] {{ t.bjJoinTable }}</h2>
          <p class="term-muted text-sm leading-relaxed">{{ t.bjJoinHint }}</p>
          <input
            :value="joinCode"
            maxlength="4"
            autocapitalize="characters"
            autocomplete="off"
            spellcheck="false"
            :placeholder="t.bjCode"
            :aria-label="t.bjCode"
            class="term-input text-lg tracking-[0.4em] uppercase text-center"
            @input="onCodeInput"
            @keyup.enter="joinCode.length === 4 && bj.join(joinCode)"
          />
          <button type="button" class="term-btn mt-auto" :disabled="joinCode.length !== 4 || state.busy" @click="bj.join(joinCode)">{{ t.bjJoin }}</button>
        </div>
      </div>

      <section aria-labelledby="bj-tables">
        <div class="flex items-center justify-between gap-3 mb-2">
          <h2 id="bj-tables" class="term-label">{{ t.bjOpenTables }} [{{ state.tables.length }}]</h2>
          <button type="button" class="term-link text-xs" @click="bj.listTables()">[~] {{ t.bjRefresh }}</button>
        </div>
        <p v-if="!state.tables.length" class="term-panel border-dashed p-4 text-sm term-muted">{{ t.bjNoTables }}</p>
        <ul v-else class="grid gap-2 sm:grid-cols-2">
          <li v-for="table in state.tables" :key="table.code" class="term-panel p-3 flex items-center gap-3">
            <span class="term-chip tracking-[0.2em]">{{ table.code }}</span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm truncate">{{ table.names.join(', ') }}</span>
              <span class="block text-xs term-muted">{{ fmt(t.bjSeatsTaken, { n: table.players, max: table.seats }) }}</span>
            </span>
            <button type="button" class="term-btn min-h-9 text-sm" @click="bj.join(table.code)">{{ t.bjJoin }}</button>
          </li>
        </ul>
      </section>

      <p class="term-muted text-xs leading-relaxed text-center">{{ t.bjLobbyNote }}</p>
    </div>
  </TermWindow>
</template>
