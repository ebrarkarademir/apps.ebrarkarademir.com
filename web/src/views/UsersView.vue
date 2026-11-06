<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import TermWindow from '../components/TermWindow.vue'
import PixelPerson from '../components/PixelPerson.vue'
import CharacterPicker from '../components/CharacterPicker.vue'
import MedalBadge from '../components/MedalBadge.vue'
import { flagPng } from '../online/ipInfo'
import { MAX_TEXT } from '../online/useUsers'
import { profile, autoCountry, cleanName, cleanBio, randomName, MAX_NAME, MAX_BIO, MEDALS, medalProgress } from '../online/profile'
import { COUNTRY_CODES } from '../online/countries'
import { currentRoom } from '../online/session'

// The Users page: everyone with the site open, each as a little Linux user: a name and user
// number, an ASCII face, nationality, a few words, medals named like groups, and what they're
// doing right now. Pick someone to chat, invite them to a game or ask to join their lobby.
// Your own entry is where you change your name, face, words and nationality. The list and the
// chats live in App (see useUsers.js), so messages reach the visitor anywhere on the site.

const props = defineProps({
  users: { type: Object, required: true },
  // The online games someone can be invited to, and every game, for what people are doing
  games: { type: Array, required: true },
  allGames: { type: Array, required: true },
  t: { type: Object, required: true },
  // Id of the person picked
  selected: { type: String, default: null },
  // Ids of the people this tab asked to join, still waiting for an answer
  asked: { type: Array, default: () => [] }
})

// invite: { to, game } opens a room to invite someone into; join: { game, code } joins one;
// ask: an id, to ask that person to let you in; answer: { id, messageId, ok } to a request
const emit = defineEmits(['back', 'update:selected', 'invite', 'join', 'ask', 'answer'])

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')

const locale = computed(() => props.t.langCode.toLowerCase())
const now = ref(Date.now())
let clockTimer = null

const regionName = (code) => {
  try {
    return new Intl.DisplayNames([locale.value], { type: 'region' }).of(code) || code
  } catch {
    return code
  }
}

const clock = (at) => new Date(at).toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })

const onlineFor = (since) => {
  const minutes = Math.floor((now.value - since) / 60000)
  if (minutes >= 60) return fmt(props.t.usersHours, { n: Math.floor(minutes / 60) })
  return fmt(props.t.cardMinutes, { n: minutes < 1 ? '<1' : minutes })
}

const titleOf = (id) => props.allGames.find(game => game.id === id)?.title || id
const nameOf = (person) => person?.name || props.t.usersGuest

// What someone is doing: the lobby they're in, or the page they have open
function activity (person) {
  const room = person.room
  if (room) return fmt(room.phase === 'lobby' ? props.t.usersInLobby : props.t.usersPlaying, { game: titleOf(room.game), code: room.code })
  if (!person.act || person.act === 'menu') return props.t.usersActivityMenu
  if (person.act === 'users') return props.t.usersActivityUsers
  if (person.act === 'lobby') return props.t.usersActivityLobby
  return fmt(props.t.usersActivityGame, { game: titleOf(person.act) })
}

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

const unreadFrom = (item) => props.users.chats.get(item.id)?.unread || 0

// ---------- Their profile ----------

const medals = computed(() => {
  const have = new Set(person.value?.md || [])
  return MEDALS.map(medal => ({ medal, earned: have.has(medal.id) }))
})
const pickedMedal = ref(null)
watch(() => person.value?.id, () => { pickedMedal.value = null })
const medalShown = computed(() => medals.value.find(item => item.medal.id === pickedMedal.value) || null)
const medalStatus = (item) => {
  if (item.earned) return props.t.usersMedalEarned
  if (!person.value?.self) return props.t.usersMedalLocked
  const { have, goal } = medalProgress(item.medal)
  return item.medal.id === 'sys' ? props.t.usersMedalLocked : fmt(props.t.usersMedalProgress, { have, goal })
}

// Asking to join their lobby only makes sense when they're in one and you aren't
const canAsk = computed(() => {
  const p = person.value
  return !!(p && !p.self && p.room && currentRoom.value?.code !== p.room.code && props.users.canChatWith(p))
})
const sameLobby = computed(() => !!(person.value?.room && currentRoom.value?.code === person.value.room.code && !person.value.self))
const askedAlready = computed(() => props.asked.includes(person.value?.id))

// ---------- Your own profile ----------

const edit = reactive({ name: '', bio: '', country: '' })
const saved = ref(false)
let savedTimer = null

function loadEdit () {
  edit.name = profile.name
  edit.bio = profile.bio
  edit.country = profile.country
}
watch(() => person.value?.self, (self) => { if (self) loadEdit() }, { immediate: true })

const countries = computed(() => COUNTRY_CODES
  .map(code => ({ code, name: regionName(code) }))
  .sort((a, b) => a.name.localeCompare(b.name, locale.value)))

const editDirty = computed(() => cleanName(edit.name) !== profile.name || cleanBio(edit.bio) !== profile.bio || edit.country !== profile.country)

function saveProfile () {
  const name = cleanName(edit.name)
  if (name && name !== profile.name) {
    profile.name = name
    profile.custom = true
  }
  profile.bio = cleanBio(edit.bio)
  profile.country = edit.country
  loadEdit()
  saved.value = true
  clearTimeout(savedTimer)
  savedTimer = setTimeout(() => { saved.value = false }, 1800)
}

const newName = () => { edit.name = randomName(profile.uid || 1 + Math.floor(Math.random() * 999)) }

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
onUnmounted(() => {
  clearInterval(clockTimer)
  clearTimeout(savedTimer)
})
</script>

<template>
  <TermWindow class="max-w-6xl" :title="t.usersTitle" :backLabel="t.back" @back="emit('back')">
    <template #status>
      <span class="term-chip text-term">
        <span :class="['term-dot', { 'is-off': !users.online }]" aria-hidden="true"></span>
        {{ users.online ? fmt(t.usersCount, { n: users.list.length }) : t.onlineConnecting }}
      </span>
    </template>

    <div class="grid gap-6 md:grid-cols-[17rem_minmax(0,1fr)] lg:grid-cols-[19rem_minmax(0,1fr)]">
      <!-- Everyone here -->
      <section :class="{ 'hidden md:block': showingDetail }" aria-labelledby="users-list-title">
        <h2 id="users-list-title" class="term-label mb-3">{{ t.usersOnlineNow }} · {{ users.list.length }}</h2>
        <ul class="space-y-2">
          <li v-for="item in users.list" :key="item.id">
            <button
              type="button"
              :aria-current="item.id === selected ? 'true' : undefined"
              :class="[
                'term-card w-full flex items-center gap-3 px-3 py-2 text-left',
                { 'is-picked': item.id === selected }
              ]"
              @click="select(item.id)"
            >
              <PixelPerson face :av="item.av || 0" size="2.75rem" class="-my-1 bg-term-deep" />
              <span class="min-w-0 flex-1">
                <span class="flex items-center gap-2">
                  <img
                    v-if="item.cc"
                    :src="flagPng(item.cc, 40)"
                    :alt="regionName(item.cc)"
                    width="16"
                    height="12"
                    class="h-3 w-4 shrink-0 object-cover"
                  />
                  <span class="truncate text-sm font-semibold">{{ nameOf(item) }}</span>
                </span>
                <span class="block truncate text-xs term-muted">
                  <template v-if="item.self"><span class="text-term">{{ t.usersYou }}</span> · </template>{{ activity(item) }}
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
        <p class="font-display text-5xl leading-none mb-3" aria-hidden="true"><i class="pxi pxi-close" aria-hidden="true"></i></p>
        <p class="leading-relaxed">{{ fmt(t.usersGone, { name: nameOf(departed) }) }}</p>
        <button type="button" class="term-btn mt-5" @click="select(null)">{{ t.usersBackToList }}</button>
      </section>

      <!-- The one picked -->
      <section v-else-if="person" class="min-w-0 space-y-5" aria-labelledby="users-person-title">
        <button type="button" class="term-link -ml-1.5 md:hidden" @click="select(null)">
          <span aria-hidden="true"><i class="pxi pxi-back" aria-hidden="true"></i></span>
          <span>{{ t.usersBackToList }}</span>
        </button>

        <!-- On a phone the lettered name goes under the face, where it has the whole width -->
        <header class="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          <div class="px-frame self-start shrink-0 bg-term-deep px-1 pt-1">
            <PixelPerson size="8.5rem" :av="person.av || 0" :seed="(person.av || 0) % 7" />
          </div>
          <div class="min-w-0 flex-1 w-full">
            <h2 id="users-person-title" class="min-w-0">
              <span class="sr-only">{{ nameOf(person) }}</span>
              <span class="name-banner block font-display text-4xl sm:text-5xl leading-tight truncate" aria-hidden="true">{{ nameOf(person) }}</span>
            </h2>
            <p class="flex flex-wrap items-center gap-2 mt-3">
              <span v-if="person.self" class="term-chip text-term">{{ t.usersYou }}</span>
              <span class="term-chip tabular-nums">{{ fmt(t.usersUid, { n: person.uid || '?' }) }}</span>
              <span v-if="person.cc" class="term-chip">
                <img :src="flagPng(person.cc, 40)" alt="" width="16" height="12" class="h-3 w-4 object-cover" />
                {{ regionName(person.cc) }}
              </span>
              <span class="term-chip">{{ fmt(t.usersOnlineFor, { time: onlineFor(person.since) }) }}</span>
            </p>
          </div>
        </header>

        <p class="text-sm leading-relaxed border-l-2 border-term pl-3" :class="{ 'term-muted italic': !person.bio }">{{ person.bio || t.usersNoBio }}</p>

        <!-- Right now -->
        <div class="term-panel p-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <p class="flex-1 min-w-0 text-sm">
            <span class="term-label mr-2">{{ t.usersNow }}</span>
            <span class="term-cursor">{{ activity(person) }}</span>
          </p>
          <button v-if="canAsk" type="button" class="term-btn min-h-9 text-sm shrink-0" :disabled="askedAlready" @click="emit('ask', person.id)">
            {{ askedAlready ? t.usersAskSent : t.usersAskJoin }}
          </button>
          <span v-else-if="sameLobby" class="term-chip shrink-0">{{ t.usersSameLobby }}</span>
        </div>

        <div class="grid gap-5 xl:grid-cols-2 xl:items-start">
          <div class="space-y-5 min-w-0">
            <!-- As a Linux box would describe them -->
            <section class="term-panel p-3 text-xs sm:text-sm overflow-x-auto" aria-labelledby="users-finger-title">
              <h3 id="users-finger-title" class="sr-only">{{ t.usersAbout }}</h3>
              <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5">
                <dt class="term-label leading-5">{{ t.usersLogin }}</dt><dd class="break-words">{{ nameOf(person) }}</dd>
                <dt class="term-label leading-5">{{ t.usersFrom }}</dt><dd class="break-words">{{ person.cc ? regionName(person.cc) : '?' }}</dd>
                <dt class="term-label leading-5">{{ t.usersOnSince }}</dt><dd class="break-words">{{ clock(person.since) }} ({{ onlineFor(person.since) }})</dd>
                <dt class="term-label leading-5">{{ t.usersNow }}</dt><dd class="break-words">{{ activity(person) }}</dd>
                <dt class="term-label leading-5">{{ t.usersPlan }}</dt><dd class="break-words">{{ person.bio || '-' }}</dd>
                <dt class="term-label leading-5">UID</dt><dd class="tabular-nums">{{ person.uid || '?' }}</dd>
              </dl>
            </section>

            <!-- Medals -->
            <section aria-labelledby="users-medals-title">
              <h3 id="users-medals-title" class="term-label mb-3">{{ t.usersMedals }} · {{ medals.filter(item => item.earned).length }}/{{ medals.length }}</h3>
              <ul class="grid grid-cols-3 sm:grid-cols-4 gap-2">
                <li v-for="(item, index) in medals" :key="item.medal.id">
                  <button
                    type="button"
                    class="w-full"
                    :aria-pressed="pickedMedal === item.medal.id"
                    :aria-label="`${item.medal.id}: ${t['medal_' + item.medal.id]}`"
                    @click="pickedMedal = pickedMedal === item.medal.id ? null : item.medal.id"
                  >
                    <MedalBadge class="w-full" :medal="item.medal" :earned="item.earned" :selected="pickedMedal === item.medal.id" :index="index" />
                  </button>
                </li>
              </ul>
              <div v-if="medalShown" class="term-panel border-term mt-3 p-3 space-y-2" role="status">
                <p :class="['medal-title font-display text-2xl leading-tight uppercase truncate', { 'is-earned': medalShown.earned }]" aria-hidden="true">{{ medalShown.medal.id }}</p>
                <p class="text-sm"><span class="font-semibold">{{ medalShown.medal.id }}</span> · {{ t['medal_' + medalShown.medal.id] }}</p>
                <p class="text-xs term-muted">{{ medalStatus(medalShown) }}</p>
              </div>
            </section>
          </div>

          <!-- Chat -->
          <section v-if="!person.self" class="term-panel flex flex-col" aria-labelledby="users-chat-title">
            <div class="flex items-center gap-2 px-3 py-2 border-b border-term-low">
              <h3 id="users-chat-title" class="term-label">{{ t.usersChat }}</h3>
              <span v-if="theyCanChat" class="term-chip ml-auto">{{ t.usersEncrypted }}</span>
            </div>
            <ol ref="log" class="h-64 overflow-y-auto px-3 py-2 space-y-1.5 text-sm" aria-live="polite">
              <li v-if="!messages.length" class="term-muted leading-relaxed">
                {{ !users.canChat ? t.usersCantChatHere : !theyCanChat ? t.usersCantChatThem : t.usersChatEmpty }}
              </li>
              <li v-for="message in messages" :key="message.id" class="break-words leading-relaxed">
                <span class="term-muted tabular-nums mr-2">{{ clock(message.at) }}</span>
                <span :class="['mr-2', message.mine ? 'term-muted' : 'font-semibold']">{{ message.mine ? t.usersYou : nameOf(person) }}:</span>
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
                <template v-else-if="message.request">
                  <span class="mr-2">{{ message.mine ? t.usersAskedThem : t.usersAskedYou }}</span>
                  <template v-if="!message.mine && !message.answered">
                    <button type="button" class="term-btn min-h-8 px-2 py-0.5 text-xs mr-1" @click="emit('answer', { id: person.id, messageId: message.id, ok: true })">{{ t.usersAccept }}</button>
                    <button type="button" class="term-btn min-h-8 px-2 py-0.5 text-xs" @click="emit('answer', { id: person.id, messageId: message.id, ok: false })">{{ t.usersDecline }}</button>
                  </template>
                </template>
                <span v-else-if="message.reply" class="term-muted">{{ t.usersDeclined }}</span>
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
                <span aria-hidden="true">{{ picking ? '−' : '+' }}</span>
                <span>{{ t.usersInvite }}</span>
              </button>
              <div v-if="picking" class="mt-2 px-1">
                <p class="term-muted text-xs leading-relaxed mb-2">{{ fmt(t.usersInviteHint, { name: nameOf(person) }) }}</p>
                <ul class="grid grid-cols-2 gap-2">
                  <li v-for="game in games" :key="game.id">
                    <button type="button" class="term-option w-full min-h-10 justify-start text-left text-sm" @click="invite(game.id)">
                      <span class="truncate">{{ game.title }}</span>
                    </button>
                  </li>
                </ul>
              </div>
            </div>
            <p class="px-3 pb-3 term-muted text-xs leading-relaxed">{{ t.usersChatNote }}</p>
          </section>

          <!-- Your own profile -->
          <form v-else class="term-panel p-4 space-y-4" aria-labelledby="users-edit-title" @submit.prevent="saveProfile">
            <h3 id="users-edit-title" class="term-label">{{ t.usersEditProfile }}</h3>
            <div>
              <span class="term-label">{{ t.charPick }}</span>
              <CharacterPicker :t="t" class="mt-2" />
            </div>
            <label class="block">
              <span class="term-label">{{ t.usersName }}</span>
              <span class="flex gap-2 mt-2">
                <input v-model="edit.name" :maxlength="MAX_NAME" autocomplete="off" spellcheck="false" class="term-input h-10 min-w-0" />
                <button type="button" class="term-btn min-h-10 px-3 text-sm shrink-0" @click="newName">{{ t.usersRandomName }}</button>
              </span>
            </label>
            <label class="block">
              <span class="term-label">{{ t.usersBio }}</span>
              <textarea v-model="edit.bio" :maxlength="MAX_BIO" rows="2" :placeholder="t.usersBioPlaceholder" class="term-input mt-2 h-auto py-2 resize-none"></textarea>
            </label>
            <label class="block">
              <span class="term-label">{{ t.usersNationality }}</span>
              <select v-model="edit.country" class="term-input mt-2 h-10">
                <option value="">{{ autoCountry ? fmt(t.usersNationalityAuto, { country: regionName(autoCountry) }) : t.usersNationalityNone }}</option>
                <option v-for="country in countries" :key="country.code" :value="country.code">{{ country.name }}</option>
              </select>
            </label>
            <button type="submit" class="term-btn term-btn-primary w-full min-h-10" :disabled="!editDirty || !cleanName(edit.name)">
              {{ saved ? t.usersSaved : t.usersSave }}
            </button>
            <p class="term-muted text-xs leading-relaxed">{{ t.usersThisIsYou }}</p>
          </form>
        </div>
      </section>

      <p v-else class="hidden md:flex term-panel border-dashed p-6 items-center justify-center text-center text-sm term-muted self-start">
        {{ t.usersPick }}
      </p>
    </div>
  </TermWindow>
</template>

<style scoped>
/* The name, big, shining gold now and then */
.name-banner {
  animation: banner-glow 3s steps(1) infinite;
}

.medal-title {
  color: var(--color-term-low);
}

.medal-title.is-earned {
  color: var(--color-term);
  animation: banner-glow 2s ease-in-out infinite;
}

@keyframes banner-glow {
  0%, 70%, 100% { color: var(--color-gold); }
  80% { color: var(--color-term); }
}

@media (prefers-reduced-motion: reduce) {
  .name-banner,
  .medal-title.is-earned {
    animation: none;
  }
}
</style>
