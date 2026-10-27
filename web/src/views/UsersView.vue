<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import TermWindow from '../components/TermWindow.vue'
import { lookUpIp, flagEmoji, flagPng } from '../online/ipInfo'
import { MAX_TEXT } from '../online/useUsers'

// The Users page: everyone with the site open, what their IP address gives away, and a chat with
// whoever is picked, where they can also be invited to an online game. The list and the chats
// themselves live in App (see useUsers.js), so messages reach the visitor anywhere on the site.

const props = defineProps({
  users: { type: Object, required: true },
  // The online games someone can be invited to
  games: { type: Array, required: true },
  t: { type: Object, required: true },
  // Id of the person picked
  selected: { type: String, default: null }
})

// invite: { to, game } opens a room to invite someone into; join: { game, code } joins one
const emit = defineEmits(['back', 'update:selected', 'invite', 'join'])

const LANGUAGE_CODE = /^[a-z]{2,3}(-[A-Z]{2})?$/

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')

const locale = computed(() => props.t.langCode.toLowerCase())
const now = ref(Date.now())
let clockTimer = null

// A country, language or currency name in the page language, or the code if Intl can't name it
const nameOf = (type, code) => {
  try {
    return new Intl.DisplayNames([locale.value], { type }).of(code) || code
  } catch {
    return code
  }
}
const nameWithCode = (type, code) => {
  const name = nameOf(type, code)
  return name === code ? code : `${name} (${code})`
}
// Languages Intl has no name for come back as codes; they're left out unless none has a name
const languageNames = (codes) => {
  const names = codes.slice(0, 6).map(code => nameOf('language', code))
  const named = names.filter(name => !LANGUAGE_CODE.test(name))
  return (named.length ? named : names).join(', ')
}

const number = (value) => Number(value).toLocaleString(locale.value)
const clock = (at) => new Date(at).toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })

const onlineFor = (since) => {
  const minutes = Math.floor((now.value - since) / 60000)
  if (minutes >= 60) return fmt(props.t.usersHours, { n: Math.floor(minutes / 60) })
  return fmt(props.t.cardMinutes, { n: minutes < 1 ? '<1' : minutes })
}

// ---------- IP lookups ----------

// By IP: { status: 'loading' | 'done' | 'failed', info }
const lookups = reactive({})

async function load (ip) {
  if (!ip || ['loading', 'done'].includes(lookups[ip]?.status)) return
  lookups[ip] = { status: 'loading', info: null }
  try {
    lookups[ip] = { status: 'done', info: await lookUpIp(ip) }
  } catch {
    lookups[ip] = { status: 'failed', info: null }
  }
}

// The list shows everyone's flag, so everyone is looked up as they arrive
watch(() => props.users.list.map(person => person.ip), ips => ips.forEach(load), { immediate: true })

const countryOf = (person) => lookups[person.ip]?.info?.countryCode || null

// ---------- Who is picked ----------

const person = computed(() => props.users.list.find(item => item.id === props.selected) || null)
// The person picked, once they've left: their chat is gone, and the page says so
const departed = ref(null)
const drafts = reactive({}) // unsent chat text, by person id
const showingDetail = computed(() => !!(person.value || departed.value))

watch(person, (current, previous) => {
  if (current || !previous || previous.id !== props.selected) return
  departed.value = { ...previous }
  delete drafts[previous.id]
})

function select (id) {
  departed.value = null
  emit('update:selected', id)
}

// People behind the same address (or none) get a short tag to tell them apart
const sharedIps = computed(() => {
  const seen = new Set()
  const shared = new Set()
  props.users.list.forEach(({ ip }) => (seen.has(ip) ? shared.add(ip) : seen.add(ip)))
  return shared
})
const showTag = (item) => !item.ip || sharedIps.value.has(item.ip)

const unreadFrom = (item) => props.users.chats.get(item.id)?.unread || 0

// ---------- What the IP gives away ----------

const lookup = computed(() => (person.value?.ip ? lookups[person.value.ip] : null))
const info = computed(() => (lookup.value?.status === 'done' ? lookup.value.info : null))
const countryName = computed(() => (info.value?.countryCode ? nameOf('region', info.value.countryCode) : info.value?.country))

const placeLine = computed(() => {
  const found = info.value
  return found ? [found.city, found.region, countryName.value].filter(Boolean).join(', ') : ''
})

const localTime = (timeZone) => {
  try {
    return new Intl.DateTimeFormat(locale.value, { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(now.value)
  } catch {
    return null
  }
}

const groups = computed(() => {
  const found = info.value
  if (!found) return []
  const t = props.t
  const code = found.countryCode
  const hasPlace = found.latitude !== null && found.longitude !== null
  const lat = hasPlace && Number(found.latitude).toFixed(4)
  const lon = hasPlace && Number(found.longitude).toFixed(4)
  const list = [
    {
      title: t.usersLocation,
      rows: [
        { label: t.usersAddress, value: [found.city, [found.region, found.postal].filter(Boolean).join(' '), countryName.value].filter(Boolean).join(', ') },
        { label: t.usersContinent, value: found.continentCode && (t.usersContinents[found.continentCode] || found.continentCode) },
        hasPlace && { label: t.usersCoordinates, value: `${lat}, ${lon}`, href: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=11/${lat}/${lon}` },
        { label: t.usersTimezone, value: found.timezone && (found.utcOffset ? `${found.timezone} (UTC${found.utcOffset})` : found.timezone) },
        { label: t.usersLocalTime, value: found.timezone && localTime(found.timezone) }
      ]
    },
    {
      title: t.usersNetwork,
      rows: [
        { label: t.usersVersion, value: found.version },
        { label: t.usersHostname, value: found.hostname },
        { label: t.usersIsp, value: found.isp },
        { label: t.usersOrg, value: found.org !== found.isp && found.org },
        { label: t.usersAsn, value: found.asn },
        { label: t.usersDomain, value: found.domain },
        { label: t.usersNetworkBlock, value: found.network }
      ]
    },
    {
      title: t.usersCountry,
      rows: [
        { label: t.usersCountry, value: code ? [countryName.value, code, found.countryCode3].filter(Boolean).join(' · ') : found.country },
        code && { label: t.usersFlag, value: flagEmoji(code) },
        code && { label: t.usersFlagPng, value: `${code.toLowerCase()}.png`, href: flagPng(code, 1280) },
        { label: t.usersCapital, value: found.capital },
        { label: t.usersCallingCode, value: found.callingCode },
        { label: t.usersCurrency, value: found.currency && nameWithCode('currency', found.currency) },
        { label: t.usersLanguages, value: found.languages && languageNames(found.languages) },
        { label: t.usersPopulation, value: found.population && number(found.population) },
        { label: t.usersArea, value: found.area && `${number(found.area)} km²` },
        { label: t.usersTld, value: found.tld },
        { label: t.usersEu, value: typeof found.inEu === 'boolean' ? (found.inEu ? t.usersYes : t.usersNo) : null },
        { label: t.usersNeighbours, value: found.borders?.map(border => nameOf('region', border)).join(', ') }
      ]
    }
  ]
  return list
    .map(group => ({ ...group, rows: group.rows.filter(row => row && row.value) }))
    .filter(group => group.rows.length)
})

// ---------- Chat ----------

const log = ref(null)

const messages = computed(() => (person.value ? props.users.chats.get(person.value.id)?.messages || [] : []))
const theyCanChat = computed(() => props.users.canChatWith(person.value))

async function sendDraft () {
  const id = person.value?.id
  const text = drafts[id]?.trim()
  if (!id || !text) return
  drafts[id] = ''
  if (!(await props.users.send(id, text)) && props.users.people.has(id)) drafts[id] = text
}

// Keep the newest message in view
watch([() => person.value?.id, () => messages.value.length], async () => {
  await nextTick()
  if (log.value) log.value.scrollTop = log.value.scrollHeight
})

// ---------- Game invites ----------

const picking = ref(false) // the game picker is open
const gameTitle = (id) => props.games.find(game => game.id === id)?.title || id

watch(() => person.value?.id, () => { picking.value = false })

function invite (game) {
  picking.value = false
  emit('invite', { to: person.value.id, game })
}

onMounted(() => {
  clockTimer = setInterval(() => { now.value = Date.now() }, 1000)
})
onUnmounted(() => clearInterval(clockTimer))
</script>

<template>
  <TermWindow class="max-w-6xl" :title="t.usersTitle" :backLabel="t.back" @back="emit('back')">
    <template #status>
      <span class="term-chip text-term">
        <span :class="['term-dot', { 'is-off': !users.online }]" aria-hidden="true"></span>
        {{ users.online ? fmt(t.usersCount, { n: users.list.length }) : t.onlineConnecting }}
      </span>
    </template>

    <!-- On a phone it makes way for the person picked -->
    <p :class="['gap-3 border border-dashed border-term-low px-4 py-3 text-sm mb-6', showingDetail ? 'hidden md:flex' : 'flex']">
      <span class="shrink-0" aria-hidden="true">[i]</span>
      <span class="term-muted leading-relaxed">{{ t.usersNotice }}</span>
    </p>

    <div class="grid gap-6 md:grid-cols-[16rem_minmax(0,1fr)] lg:grid-cols-[18rem_minmax(0,1fr)]">
      <!-- Everyone here -->
      <section :class="{ 'hidden md:block': showingDetail }" aria-labelledby="users-list-title">
        <h2 id="users-list-title" class="term-label mb-3">{{ t.usersOnlineNow }} [{{ users.list.length }}]</h2>
        <ul class="space-y-2">
          <li v-for="item in users.list" :key="item.id">
            <button
              type="button"
              :aria-current="item.id === selected ? 'true' : undefined"
              :class="[
                'term-card w-full flex items-center gap-3 px-3 py-2 text-left',
                { 'border-term bg-term-deep': item.id === selected }
              ]"
              @click="select(item.id)"
            >
              <span class="term-dot" aria-hidden="true"></span>
              <img
                v-if="countryOf(item)"
                :src="flagPng(countryOf(item), 40)"
                :alt="nameOf('region', countryOf(item))"
                width="20"
                height="15"
                class="h-[15px] w-5 shrink-0 object-cover"
              />
              <span v-else class="w-5 shrink-0 text-center text-xs term-muted" aria-hidden="true">--</span>
              <span class="min-w-0 flex-1">
                <span class="flex items-baseline gap-2">
                  <span class="truncate text-sm font-semibold tabular-nums">{{ item.ip || t.usersUnknownIp }}</span>
                  <span v-if="showTag(item)" class="shrink-0 text-xs term-muted">#{{ item.id.slice(0, 4) }}</span>
                </span>
                <span class="block text-xs term-muted tabular-nums">
                  <template v-if="item.self"><span class="text-term">{{ t.usersYou }}</span> · </template>{{ onlineFor(item.since) }}
                </span>
              </span>
              <span v-if="unreadFrom(item)" class="shrink-0 term-inverse px-1.5 text-xs font-bold tabular-nums">
                <span aria-hidden="true">{{ unreadFrom(item) }}</span>
                <span class="sr-only">{{ fmt(t.usersUnread, { n: unreadFrom(item) }) }}</span>
              </span>
            </button>
          </li>
        </ul>
        <p v-if="users.online && users.list.length === 1" class="term-muted text-sm leading-relaxed mt-4">{{ t.usersAlone }}</p>
      </section>

      <!-- They left while picked -->
      <section v-if="departed" class="term-panel border-term p-6 text-center self-start" role="status">
        <p class="font-display text-5xl leading-none mb-3" aria-hidden="true">[x]</p>
        <p class="leading-relaxed">{{ fmt(t.usersGone, { name: departed.ip || t.usersUnknownIp }) }}</p>
        <button type="button" class="term-btn mt-5" @click="select(null)">{{ t.usersBackToList }}</button>
      </section>

      <!-- The one picked -->
      <section v-else-if="person" class="min-w-0 space-y-5" aria-labelledby="users-person-title">
        <button type="button" class="term-link -ml-1.5 md:hidden" @click="select(null)">
          <span aria-hidden="true">[&lt;]</span>
          <span>{{ t.usersBackToList }}</span>
        </button>

        <header class="flex items-center gap-4">
          <a
            v-if="info?.countryCode"
            :href="flagPng(info.countryCode, 1280)"
            target="_blank"
            rel="noopener noreferrer"
            class="shrink-0"
          >
            <img
              :src="flagPng(info.countryCode, 160)"
              :srcset="`${flagPng(info.countryCode, 320)} 2x`"
              :alt="fmt(t.usersFlagOf, { country: countryName })"
              class="h-14 sm:h-16 w-auto border border-term-low"
            />
          </a>
          <span
            v-else
            class="h-14 w-20 sm:h-16 sm:w-24 shrink-0 border border-dashed border-term-low flex items-center justify-center font-display text-3xl term-muted"
            aria-hidden="true"
          >??</span>
          <div class="min-w-0">
            <h2 id="users-person-title" class="font-display text-4xl sm:text-5xl leading-none truncate">{{ person.ip || t.usersUnknownIp }}</h2>
            <p v-if="placeLine" class="term-muted text-sm mt-1 truncate">{{ placeLine }}</p>
            <p class="flex flex-wrap gap-2 mt-2">
              <span v-if="person.self" class="term-chip text-term">{{ t.usersYou }}</span>
              <span class="term-chip">{{ fmt(t.usersOnlineFor, { time: onlineFor(person.since) }) }}</span>
            </p>
          </div>
        </header>

        <div class="grid gap-5 xl:grid-cols-2 xl:items-start">
          <!-- Chat -->
          <section v-if="!person.self" class="term-panel flex flex-col xl:order-2" aria-labelledby="users-chat-title">
            <div class="flex items-center gap-2 px-3 py-2 border-b border-term-low">
              <h3 id="users-chat-title" class="term-label">{{ t.usersChat }}</h3>
              <span v-if="theyCanChat" class="term-chip ml-auto">{{ t.usersEncrypted }}</span>
            </div>
            <ol ref="log" class="h-64 overflow-y-auto px-3 py-2 space-y-1.5 text-sm" aria-live="polite">
              <li v-if="!messages.length" class="term-muted leading-relaxed">
                {{ !users.canChat ? t.usersCantChatHere : !theyCanChat ? t.usersCantChatThem : t.usersChatEmpty }}
              </li>
              <li v-for="message in messages" :key="message.id" class="break-words leading-relaxed">
                <span class="term-muted tabular-nums mr-2">[{{ clock(message.at) }}]</span>
                <span :class="['mr-2', message.mine ? 'term-muted' : 'font-semibold']">{{ message.mine ? t.usersYou : person.ip || t.usersGuest }}&gt;</span>
                <template v-if="message.invite">
                  <span class="mr-2">{{ fmt(message.mine ? t.usersInvitedThem : t.usersInvitedYou, { game: gameTitle(message.invite.game) }) }}</span>
                  <span class="term-chip mr-2 tracking-[0.25em]">{{ message.invite.code }}</span>
                  <button
                    v-if="!message.mine"
                    type="button"
                    class="term-btn min-h-8 px-2 py-0.5 text-xs"
                    @click="emit('join', message.invite)"
                  >
                    {{ t.onlineJoin }}
                  </button>
                </template>
                <span v-else>{{ message.text }}</span>
              </li>
            </ol>
            <form class="flex gap-2 p-2 border-t border-term-low" @submit.prevent="sendDraft">
              <input
                v-model="drafts[person.id]"
                :maxlength="MAX_TEXT"
                :disabled="!theyCanChat"
                :placeholder="t.usersChatPlaceholder"
                :aria-label="t.usersChatPlaceholder"
                autocomplete="off"
                enterkeyhint="send"
                class="term-input h-10 min-w-0"
              />
              <button type="submit" class="term-btn min-h-10 px-3 text-sm" :disabled="!theyCanChat || !drafts[person.id]?.trim()">
                {{ t.usersSend }}
              </button>
            </form>
            <!-- Invite to an online game: this device opens a room in it, and they get a Join button -->
            <div class="px-2 pb-2">
              <button
                type="button"
                class="term-link"
                :aria-expanded="picking"
                :disabled="!theyCanChat"
                @click="picking = !picking"
              >
                <span aria-hidden="true">{{ picking ? '[-]' : '[+]' }}</span>
                <span>{{ t.usersInvite }}</span>
              </button>
              <div v-if="picking" class="mt-2 px-1">
                <p class="term-muted text-xs leading-relaxed mb-2">{{ fmt(t.usersInviteHint, { name: person.ip || t.usersGuest }) }}</p>
                <ul class="grid grid-cols-2 gap-2">
                  <li v-for="game in games" :key="game.id">
                    <button type="button" class="term-option w-full min-h-10 justify-start text-left text-sm" @click="invite(game.id)">
                      <span class="shrink-0" aria-hidden="true">{{ game.icon }}</span>
                      <span class="truncate">{{ game.title }}</span>
                    </button>
                  </li>
                </ul>
              </div>
            </div>
            <p class="px-3 pb-3 term-muted text-xs leading-relaxed">{{ t.usersChatNote }}</p>
          </section>
          <p v-else class="term-panel p-4 text-sm leading-relaxed term-muted xl:order-2">{{ t.usersThisIsYou }}</p>

          <!-- Everything the IP gives away -->
          <section class="min-w-0 xl:order-1" aria-labelledby="users-info-title">
            <h3 id="users-info-title" class="sr-only">{{ t.usersIpInfo }}</h3>

            <p v-if="!person.ip" class="term-panel p-4 text-sm leading-relaxed term-muted">{{ t.usersNoIp }}</p>

            <div v-else-if="!lookup || lookup.status === 'loading'" class="flex items-center gap-3 py-6 text-sm term-muted" role="status">
              <span class="term-spinner font-display text-2xl leading-none" aria-hidden="true"></span>
              <span>{{ t.usersLookingUp }}</span>
            </div>

            <div v-else-if="lookup.status === 'failed'" class="term-panel p-4 text-sm space-y-3" role="alert">
              <p class="flex gap-3">
                <span class="shrink-0" aria-hidden="true">[!]</span>
                <span class="leading-relaxed">{{ t.usersLookupFailed }}</span>
              </p>
              <button type="button" class="term-btn min-h-9 text-sm" @click="load(person.ip)">{{ t.usersRetry }}</button>
            </div>

            <template v-else>
              <div v-for="group in groups" :key="group.title" class="mb-5">
                <h4 class="term-label mb-2 pb-1 border-b border-term-low">{{ group.title }}</h4>
                <dl class="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
                  <template v-for="row in group.rows" :key="row.label">
                    <dt class="term-muted">{{ row.label }}</dt>
                    <dd class="min-w-0 break-words">
                      <a v-if="row.href" :href="row.href" target="_blank" rel="noopener noreferrer" class="term-crumb">{{ row.value }}</a>
                      <template v-else>{{ row.value }}</template>
                    </dd>
                  </template>
                </dl>
              </div>
              <p class="term-muted text-xs leading-relaxed">{{ t.usersApprox }}</p>
              <p class="term-muted text-xs mt-1">{{ t.usersSources }}: {{ info.sources.join(' · ') }}</p>
            </template>
          </section>
        </div>
      </section>

      <p v-else class="hidden md:flex term-panel border-dashed p-6 items-center justify-center text-center text-sm term-muted self-start">
        {{ t.usersPick }}
      </p>
    </div>
  </TermWindow>
</template>
