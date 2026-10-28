<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import './world.css'
import { createConnection } from './net.js'
import { createGame } from './game.js'
import { sound } from './sound.js'
import { releasePreviews } from './preview.js'
import { DEFAULT_LOOK } from './palette.js'
import { EMOTES } from './avatar/avatar.js'
import { fmt, itemName, levelProgress } from './text.js'
import Icon from './ui/Icon.vue'
import AuthPanel from './ui/AuthPanel.vue'
import AvatarCreator from './ui/AvatarCreator.vue'
import ShopPanel from './ui/ShopPanel.vue'
import InventoryPanel from './ui/InventoryPanel.vue'
import FriendsPanel from './ui/FriendsPanel.vue'
import ProfileCard from './ui/ProfileCard.vue'
import ChatBox from './ui/ChatBox.vue'
import DecorBar from './ui/DecorBar.vue'

// Sunny Square, the 3D world: signing in, making an avatar, and then the plaza and homes with
// their chat, shop, inventory, friends and decorating. The 3D side lives in game.js; this is the
// part around it that talks to the server and draws the menus.

const props = defineProps({
  t: { type: Object, required: true }
})

const emit = defineEmits(['go-back'])

const TOKEN_KEY = 'worldToken'
const CHAT_LINES = 60
const TOAST_MS = 4500
const SAVE_MS = 600 // home layout changes are saved after this much quiet
const EMOJI = { wave: '👋', dance: '💃', sit: '🪑', laugh: '😂' }

const store = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set: (value) => {
    try {
      if (value) localStorage.setItem(TOKEN_KEY, value)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      // Without storage the player signs in again next time
    }
  }
}

const view = ref(null)
const canvas = ref(null)
const labelLayer = ref(null)
const chatBox = ref(null)

const status = ref('connecting') // the line: connecting | open | down
const phase = ref('connecting') // connecting | auth | creator | world | kicked
const busy = ref(false)
const authError = ref('')
const me = reactive({ id: null, name: '', coins: 0, xp: 0, level: 1, avatar: null, inventory: {}, friends: [] })
const catalog = ref([])
const catalogMap = computed(() => Object.fromEntries(catalog.value.map(item => [item.id, item])))
const room = ref(null) // { id, kind, owner, ownerName }
const layout = ref([]) // the home's furniture, while in a home
const panel = ref(null) // shop | inventory | friends | profile | creator
const shopTab = ref('clothes')
const inventoryTab = ref('clothes')
const profile = ref(null)
const chatOpen = ref(false)
const chatLog = ref([])
const unread = ref(0)
const emotesOpen = ref(false)
const placesOpen = ref(false)
const toasts = ref([])
const gains = ref([]) // coins floating up from the wallet
const muted = ref(sound.muted)
const decorating = ref(false)
const decorSelected = ref(null)
const holding = ref(false)

let game = null
let conn = null
let names = new Map() // player id -> name, for the chat log
let lastRoom = null // where to go back to after the line drops: { room: 'plaza' } or { room: 'home', owner }
let seq = 0
let bonus = 0 // the daily bonus, announced once the player is in the world
let saveTimer = null
let resizeObserver = null
const unsubscribe = []

const atHome = computed(() => room.value?.kind === 'home')
const atOwnHome = computed(() => atHome.value && room.value.owner === me.id)
const roomLabel = computed(() => {
  if (!room.value) return ''
  if (!atHome.value) return props.t.worldPlaza
  return atOwnHome.value ? props.t.worldMyHome : fmt(props.t.worldHomeOf, { name: room.value.ownerName })
})
const xpShare = computed(() => `${Math.round(levelProgress(me.xp) * 100)}%`)
const requests = computed(() => me.friends.filter(f => f.status === 'incoming').length)
const placed = computed(() => {
  const counts = {}
  for (const piece of layout.value) counts[piece.i] = (counts[piece.i] || 0) + 1
  return counts
})
const errorText = (err) => props.t.worldErrors[err] ?? props.t.worldErrors.server

// ---------- Little messages ----------

function toast (text, icon = 'star', action = null) {
  const id = ++seq
  toasts.value.push({ id, text, icon, action })
  if (toasts.value.length > 3) toasts.value.shift()
  setTimeout(() => dismiss(id), action ? TOAST_MS * 2 : TOAST_MS)
}
const dismiss = (id) => {
  toasts.value = toasts.value.filter(item => item.id !== id)
}
function runToast (item) {
  dismiss(item.id)
  item.action.run()
}

function line (entry) {
  chatLog.value.push({ key: ++seq, ...entry })
  if (chatLog.value.length > CHAT_LINES) chatLog.value.shift()
}

function gain (n) {
  const id = ++seq
  gains.value.push({ id, n })
  setTimeout(() => { gains.value = gains.value.filter(item => item.id !== id) }, 1600)
}

// ---------- Signing in ----------

async function onOpen () {
  if (phase.value === 'kicked') return
  const token = store.get()
  if (token) {
    const res = await conn.call('resume', { token })
    if (res.ok) return signedIn(res)
    if (res.err === 'offline') return // the line dropped again; this runs again when it's back
    store.set(null)
  }
  showAuth()
}

function showAuth () {
  phase.value = 'auth'
  room.value = null
  panel.value = null
  game.showcase()
  game.setBlur(true)
}

async function submitAuth ({ mode, name, pass }) {
  busy.value = true
  authError.value = ''
  const res = await conn.call(mode, { name, pass })
  busy.value = false
  if (!res.ok) {
    authError.value = errorText(res.err)
    sound.play('nope')
    return
  }
  signedIn(res)
}

function signedIn (res) {
  store.set(res.token)
  Object.assign(me, res.me)
  catalog.value = res.catalog
  authError.value = ''
  if (res.bonus) bonus = res.bonus.coins
  if (!me.avatar) {
    phase.value = 'creator'
    return
  }
  // After a dropped line, back to the room the player was in
  if (lastRoom) joinRoom(lastRoom, true)
  else joinRoom({ room: 'plaza' })
}

async function signOut () {
  busy.value = true
  await conn.call('logout', { token: store.get() })
  busy.value = false
  store.set(null)
  lastRoom = null
  stopDecorating()
  chatLog.value = []
  showAuth()
}

// ---------- Rooms ----------

async function joinRoom (spec, rejoining = false) {
  if (decorating.value) stopDecorating()
  busy.value = true
  const res = await conn.call('join', spec)
  busy.value = false
  if (!res.ok) {
    if (res.err === 'here') {
      panel.value = null
      return
    }
    if (res.err === 'offline') return
    sound.play('nope')
    toast(errorText(res.err), 'close')
    // Nowhere to be (a friend's home closed to us after a reconnect): the plaza it is
    if ((rejoining || phase.value !== 'world') && spec.room !== 'plaza') joinRoom({ room: 'plaza' })
    return
  }
  lastRoom = res.room.kind === 'home' ? { room: 'home', owner: res.room.owner } : { room: 'plaza' }
  room.value = res.room
  layout.value = res.room.layout || []
  names = new Map(res.players.map(p => [p.id, p.name]))
  game.enter(res, me.id, catalogMap.value)
  game.setBlur(false)
  phase.value = 'world'
  panel.value = null
  emotesOpen.value = false
  placesOpen.value = false
  line({ system: true, text: fmt(props.t.worldYouEntered, { room: roomLabel.value }) })
  if (bonus) {
    toast(fmt(props.t.worldDailyBonus, { coins: bonus }), 'star')
    gain(bonus)
    sound.play('coin')
    bonus = 0
  }
}

const goHome = () => joinRoom({ room: 'home' })
const goPlaza = () => joinRoom({ room: 'plaza' })
const visitHome = (id) => joinRoom({ room: 'home', owner: id })

// ---------- What the server says ----------

function listen () {
  const on = (type, fn) => unsubscribe.push(conn.on(type, fn))
  on('status', (next) => {
    status.value = next
    if (next === 'open') onOpen()
  })
  on('snap', (msg) => game.snapshot(msg.p))
  on('enter', ({ player }) => {
    names.set(player.id, player.name)
    game.addPlayer(player)
    if (atHome.value) line({ system: true, text: fmt(props.t.worldArrived, { name: player.name }) })
  })
  on('exit', ({ id }) => {
    game.removePlayer(id)
    if (atHome.value && names.has(id)) line({ system: true, text: fmt(props.t.worldLeft, { name: names.get(id) }) })
  })
  on('say', ({ id, text }) => {
    game.say(id, text)
    const mine = id === me.id
    line({ name: names.get(id) ?? '?', text, mine })
    if (!mine) {
      sound.play('blip')
      if (!chatOpen.value) unread.value++
    }
  })
  on('look', ({ id, avatar }) => game.setLook(id, avatar))
  on('level', ({ id, level }) => game.setLevel(id, level))
  on('layout', ({ items }) => {
    if (!atHome.value) return
    layout.value = items
    game.setLayout(items, catalogMap.value)
  })
  on('wallet', (msg) => {
    const gained = msg.coins - me.coins
    Object.assign(me, { coins: msg.coins, xp: msg.xp, level: msg.level })
    if (gained > 0) gain(gained)
    if (msg.levelUp) {
      game.setLevel(me.id, msg.level)
      game.confetti()
      sound.play('levelUp')
      toast(fmt(props.t.worldLevelUp, { level: msg.level }), 'star')
    } else if (gained > 0) {
      sound.play('coin')
    }
  })
  on('friends', ({ friends }) => {
    me.friends = friends
    // An open card follows along: a request accepted, a friend gone offline
    if (profile.value && profile.value.status !== 'me') {
      const friend = friends.find(f => f.id === profile.value.id)
      profile.value = { ...profile.value, status: friend?.status ?? 'none', online: friend ? friend.online : profile.value.online }
    }
  })
  on('notice', ({ kind, from, name }) => {
    if (kind === 'slow') {
      sound.play('nope')
      toast(props.t.worldSlowDown, 'chat')
      return
    }
    sound.play('notify')
    if (kind === 'request') toast(fmt(props.t.worldWantsFriend, { name }), 'userPlus', { label: props.t.worldAccept, run: () => addFriend(from) })
    else if (kind === 'accepted') toast(fmt(props.t.worldNowFriends, { name }), 'friends')
    else if (kind === 'invite') toast(fmt(props.t.worldInvitesYou, { name }), 'home', { label: props.t.worldVisit, run: () => visitHome(from) })
  })
  on('kicked', () => {
    conn.close()
    // Signed out already: a save now would only fail
    clearTimeout(saveTimer)
    saveTimer = null
    stopDecorating()
    phase.value = 'kicked'
    panel.value = null
    room.value = null
    game.leave()
  })
}

function playHere () {
  phase.value = 'connecting'
  conn.open()
}

// ---------- Avatar, shop and inventory ----------

async function setLook (look) {
  busy.value = true
  const res = await conn.call('avatar', { avatar: look })
  busy.value = false
  if (!res.ok) {
    sound.play('nope')
    toast(errorText(res.err), 'close')
    return false
  }
  me.avatar = res.avatar
  game.setLook(me.id, res.avatar)
  return true
}

async function saveLook (look) {
  const first = phase.value === 'creator'
  if (!(await setLook(look))) return
  sound.play('buy')
  if (first) joinRoom({ room: 'plaza' })
  else {
    panel.value = null
    game.sparkle()
  }
}

async function wear (item) {
  if (await setLook({ ...me.avatar, [item.kind]: item.id })) {
    sound.play('click')
    game.sparkle()
  }
}

async function takeOff (slot) {
  if (await setLook({ ...me.avatar, [slot]: null })) sound.play('click')
}

async function buy (item) {
  busy.value = true
  const res = await conn.call('buy', { item: item.id })
  busy.value = false
  if (!res.ok) {
    sound.play('nope')
    toast(errorText(res.err), 'close')
    return
  }
  me.coins = res.coins
  me.inventory = res.inventory
  game.sparkle()
  sound.play('buy')
  toast(fmt(props.t.worldBought, { item: itemName(item, props.t) }), 'shop')
}

// ---------- Friends ----------

async function openProfile (id) {
  const res = await conn.call('profile', { user: id })
  if (!res.ok) return
  profile.value = res.profile
  openPanel('profile', true)
}

async function addFriend (id) {
  busy.value = true
  const res = await conn.call('friendAdd', { user: id })
  busy.value = false
  if (!res.ok) {
    toast(errorText(res.err), 'close')
    return
  }
  if (profile.value?.id === id) profile.value = { ...profile.value, status: res.status }
  const name = me.friends.find(f => f.id === id)?.name ?? profile.value?.name ?? ''
  if (res.status === 'friend') {
    sound.play('notify')
    toast(fmt(props.t.worldNowFriends, { name }), 'friends')
  } else {
    sound.play('click')
    toast(fmt(props.t.worldRequestSentTo, { name }), 'userPlus')
  }
}

async function removeFriend (id) {
  busy.value = true
  await conn.call('friendRemove', { user: id })
  busy.value = false
  if (profile.value?.id === id) profile.value = { ...profile.value, status: 'none' }
  sound.play('click')
}

async function inviteFriend (id) {
  const res = await conn.call('invite', { user: id })
  if (!res.ok) {
    toast(errorText(res.err), 'close')
    return
  }
  sound.play('click')
  toast(fmt(props.t.worldInviteSent, { name: me.friends.find(f => f.id === id)?.name ?? '' }), 'home')
}

// ---------- Decorating ----------

function startDecorating (item = null) {
  if (!atOwnHome.value) return
  panel.value = null
  chatOpen.value = false
  emotesOpen.value = false
  if (!decorating.value) {
    decorating.value = true
    game.editor.start(layout.value, catalogMap.value, (next) => {
      layout.value = next
      clearTimeout(saveTimer)
      saveTimer = setTimeout(saveLayout, SAVE_MS)
    })
  }
  if (item) hold(item.id)
}

function hold (id) {
  game.editor.hold(id)
  holding.value = true
  decorSelected.value = null
  sound.play('click')
}

function decor (action) {
  const editor = game.editor
  if (!editor) return
  if (action === 'move' && decorSelected.value) holding.value = true
  editor[action]()
  sound.play('click')
}

function cancelHolding () {
  game.editor?.cancel()
  holding.value = false
}

function stopDecorating () {
  if (!decorating.value) return
  game.editor?.stop()
  decorating.value = false
  holding.value = false
  decorSelected.value = null
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveLayout()
  }
}

async function saveLayout () {
  saveTimer = null
  const res = await conn.call('layout', { items: layout.value })
  if (!res.ok) toast(props.t.worldSaveFailed, 'close')
}

// What the 3D side tells the menus
function onGameEvent (type, data) {
  if (type === 'profile') openProfile(data)
  else if (type === 'shop') {
    shopTab.value = data
    openPanel('shop', true)
  } else if (type === 'editSelect') decorSelected.value = data
  else if (type === 'editPlaced') {
    holding.value = false
    sound.play('place')
  }
}

// ---------- Menus ----------

function openPanel (name, keep = false) {
  emotesOpen.value = false
  placesOpen.value = false
  if (panel.value === name && !keep) {
    panel.value = null
    sound.play('close')
    return
  }
  if (decorating.value) stopDecorating()
  panel.value = name
  sound.play('open')
}

function closePanel () {
  if (!panel.value) return
  panel.value = null
  sound.play('close')
}

async function toggleChat () {
  emotesOpen.value = false
  chatOpen.value = !chatOpen.value
  sound.play(chatOpen.value ? 'open' : 'close')
  if (chatOpen.value) {
    unread.value = 0
    await nextTick()
    chatBox.value?.focus()
  }
}

function sendChat (text) {
  conn.send('chat', { text })
}

function emote (name) {
  emotesOpen.value = false
  game.emote(name)
  sound.play('click')
}

function toggleMute () {
  muted.value = !muted.value
  sound.setMuted(muted.value)
  sound.play('click')
}

// Menus blur the world behind them
watch([panel, phase], () => {
  if (phase.value === 'world') game?.setBlur(!!panel.value)
})

// ---------- Keys ----------

const typing = (target) => !!target?.closest?.('input, textarea, select, [contenteditable="true"]')

function onKeydown (event) {
  sound.unlock()
  if (event.ctrlKey || event.metaKey || event.altKey || typing(event.target)) return
  if (phase.value !== 'world') return
  const key = event.key
  if (key === 'Escape') {
    if (decorating.value) holding.value ? cancelHolding() : stopDecorating()
    else if (emotesOpen.value) emotesOpen.value = false
    else if (placesOpen.value) placesOpen.value = false
    else if (panel.value) closePanel()
    else if (chatOpen.value) chatOpen.value = false
    return
  }
  if (decorating.value) {
    if (key === 'r' || key === 'R') decor('rotate')
    else if ((key === 'Delete' || key === 'Backspace') && decorSelected.value) decor('remove')
    return
  }
  if (key === 'Enter' && !panel.value) {
    if (event.target.closest?.('button')) return
    event.preventDefault()
    if (!chatOpen.value) toggleChat()
    else chatBox.value?.focus()
    return
  }
  const n = Number(key)
  if (n >= 1 && n <= EMOTES.length && !panel.value) emote(EMOTES[n - 1])
}

// ---------- Start and end ----------

let savedOverflow = ''
const unlockSound = () => sound.unlock()

onMounted(() => {
  // Full screen: the page under it stays put, and the site's Esc leaves the world alone
  savedOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  document.body.dataset.arcade = ''
  if (!document.getElementById('world-font')) {
    const link = document.createElement('link')
    link.id = 'world-font'
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap'
    document.head.appendChild(link)
  }

  game = createGame({ canvas: canvas.value, labelLayer: labelLayer.value, on: onGameEvent })
  game.setSend((state) => conn.send('move', state))
  game.showcase()
  game.setBlur(true)
  // For a look at frame times and draw calls from the console while developing
  if (import.meta.env.DEV) window.worldGame = game
  resizeObserver = new ResizeObserver(() => game.resize())
  resizeObserver.observe(view.value)

  conn = createConnection()
  listen()
  conn.open()
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('pointerdown', unlockSound)
})

onUnmounted(() => {
  // Furniture moved just now still gets saved
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveLayout()
  }
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('pointerdown', unlockSound)
  unsubscribe.forEach(off => off())
  conn.close()
  resizeObserver?.disconnect()
  game.dispose()
  releasePreviews()
  if (import.meta.env.DEV) delete window.worldGame
  document.body.style.overflow = savedOverflow
  delete document.body.dataset.arcade
})
</script>

<template>
  <div class="world">
    <div ref="view" class="view">
      <canvas ref="canvas" :aria-label="t.worldTitle"></canvas>
      <div ref="labelLayer" class="labels"></div>
    </div>

    <!-- ---------- Before the world: connecting, signing in, the first avatar ---------- -->

    <Transition name="pop">
      <div v-if="phase === 'connecting' || phase === 'kicked'" class="center">
        <div class="panel notice-card">
          <template v-if="phase === 'kicked'">
            <span class="big-icon" aria-hidden="true"><Icon name="user" :size="34" /></span>
            <p class="title">{{ t.worldKicked }}</p>
            <div class="row">
              <button type="button" class="btn gray" @click="emit('go-back')">{{ t.worldBackToGames }}</button>
              <button type="button" class="btn mint" @click="playHere">{{ t.worldPlayHere }}</button>
            </div>
          </template>
          <template v-else>
            <span class="spinner" aria-hidden="true"></span>
            <p class="title">{{ status === 'down' ? t.worldNoServer : t.worldConnecting }}</p>
            <p v-if="status === 'down'" class="muted">{{ t.worldNoServerHint }}</p>
            <button type="button" class="btn gray small" @click="emit('go-back')">{{ t.worldBackToGames }}</button>
          </template>
        </div>
      </div>
    </Transition>

    <Transition name="pop">
      <div v-if="phase === 'auth'" class="center">
        <AuthPanel :t="t" :busy="busy || status !== 'open'" :error="status === 'down' ? t.worldNoServer : authError" @submit="submitAuth" />
        <button type="button" class="btn gray small back" @click="emit('go-back')"><Icon name="exit" :size="18" />{{ t.worldBackToGames }}</button>
      </div>
    </Transition>

    <Transition name="pop">
      <div v-if="phase === 'creator' || panel === 'creator'" class="center dim">
        <AvatarCreator
          :t="t"
          :look="me.avatar || DEFAULT_LOOK"
          :catalog="catalog"
          :inventory="me.inventory"
          :first="phase === 'creator'"
          :busy="busy"
          @save="saveLook"
          @cancel="closePanel"
        />
      </div>
    </Transition>

    <!-- ---------- In the world ---------- -->

    <template v-if="phase === 'world'">
      <div v-if="panel && panel !== 'creator'" class="scrim" @click="closePanel"></div>

      <header class="hud-top">
        <button type="button" class="btn gray round" :aria-label="t.worldBackToGames" :title="t.worldBackToGames" @click="emit('go-back')"><Icon name="exit" :size="22" /></button>
        <button type="button" class="pill me" :title="t.worldProfile" @click="openProfile(me.id)">
          <span class="ring" :style="{ '--xp': xpShare }"><span class="level" :aria-label="`${t.worldLevel} ${me.level}`">{{ me.level }}</span></span>
          <span class="who">
            <b>{{ me.name }}</b>
            <span class="xp" :title="`${me.xp} XP`"><i :style="{ width: xpShare }"></i></span>
          </span>
        </button>
        <div class="where">
          <button type="button" class="pill place" :aria-expanded="placesOpen" @click="placesOpen = !placesOpen; sound.play('click')">
            <span class="place-icon" aria-hidden="true"><Icon :name="atHome ? 'home' : 'plaza'" :size="18" /></span>
            <span class="label">{{ roomLabel }}</span>
            <span class="caret" aria-hidden="true"><Icon name="chevron" :size="16" /></span>
          </button>
          <Transition name="pop">
            <div v-if="placesOpen" class="places panel">
              <button type="button" class="chip" :disabled="!atHome || busy" @click="placesOpen = false; goPlaza()"><Icon name="plaza" :size="18" />{{ t.worldPlaza }}</button>
              <button type="button" class="chip" :disabled="atOwnHome || busy" @click="placesOpen = false; goHome()"><Icon name="home" :size="18" />{{ t.worldMyHome }}</button>
            </div>
          </Transition>
        </div>
        <span class="spacer"></span>
        <span class="pill wallet" :title="t.worldCoins">
          <span class="coin" aria-hidden="true">✦</span>
          <b>{{ me.coins }}</b>
          <span class="sr-only">{{ t.worldCoins }}</span>
          <span v-for="g in gains" :key="g.id" class="gain" aria-hidden="true">+{{ g.n }}</span>
        </span>
        <button type="button" class="btn gray round" :aria-label="muted ? t.worldSoundOff : t.worldSoundOn" :aria-pressed="!muted" :title="muted ? t.worldSoundOff : t.worldSoundOn" @click="toggleMute"><Icon :name="muted ? 'mute' : 'sound'" :size="22" /></button>
      </header>

      <Transition name="pop">
        <ChatBox v-if="chatOpen && !decorating" ref="chatBox" :t="t" :log="chatLog" @send="sendChat" @close="chatOpen = false" />
      </Transition>

      <Transition name="pop">
        <div v-if="emotesOpen" class="emotes panel" role="menu" :aria-label="t.worldEmotes">
          <button v-for="(name, i) in EMOTES" :key="name" type="button" role="menuitem" class="emote" @click="emote(name)">
            <span class="emoji" aria-hidden="true">{{ EMOJI[name] }}</span>
            <span>{{ t.worldEmoteNames[name] }}</span>
            <kbd>{{ i + 1 }}</kbd>
          </button>
        </div>
      </Transition>

      <Transition name="pop">
        <button v-if="atOwnHome && !decorating && !panel" type="button" class="btn lilac decorate" @click="startDecorating()">
          <Icon name="pencil" :size="20" />{{ t.worldDecorate }}
        </button>
      </Transition>

      <Transition name="pop" mode="out-in">
        <DecorBar
          v-if="decorating"
          :t="t"
          :catalog="catalog"
          :inventory="me.inventory"
          :placed="placed"
          :selected="decorSelected"
          :holding="holding"
          @hold="hold"
          @rotate="decor('rotate')"
          @move="decor('move')"
          @remove="decor('remove')"
          @done="stopDecorating"
        />
        <nav v-else class="toolbar" :aria-label="t.worldTitle">
          <button type="button" :class="['tool', { on: chatOpen }]" style="--c: var(--sky); --hi: var(--sky-hi)" @click="toggleChat">
            <span class="face"><Icon name="chat" :size="26" /><span v-if="unread" class="badge">{{ unread > 9 ? '9+' : unread }}</span></span>{{ t.worldChat }}
          </button>
          <button type="button" :class="['tool', { on: emotesOpen }]" style="--c: var(--lemon); --hi: var(--lemon-hi)" @click="emotesOpen = !emotesOpen; sound.play('click')">
            <span class="face"><Icon name="smile" :size="26" /></span>{{ t.worldEmotes }}
          </button>
          <button type="button" :class="['tool', { on: panel === 'shop' }]" @click="openPanel('shop')">
            <span class="face"><Icon name="shop" :size="26" /></span>{{ t.worldShop }}
          </button>
          <button type="button" :class="['tool', { on: panel === 'inventory' }]" style="--c: var(--lilac); --hi: var(--lilac-hi)" @click="openPanel('inventory')">
            <span class="face"><Icon name="bag" :size="26" /></span>{{ t.worldInventory }}
          </button>
          <button type="button" :class="['tool', { on: panel === 'friends' }]" style="--c: var(--mint); --hi: var(--mint-hi)" @click="openPanel('friends')">
            <span class="face"><Icon name="friends" :size="26" /><span v-if="requests" class="badge">{{ requests }}</span></span>{{ t.worldFriends }}
          </button>
          <button v-if="atHome" type="button" class="tool" style="--c: var(--peach); --hi: var(--peach-hi)" :disabled="busy" @click="goPlaza">
            <span class="face"><Icon name="plaza" :size="26" /></span>{{ t.worldPlaza }}
          </button>
          <button v-else type="button" class="tool" style="--c: var(--peach); --hi: var(--peach-hi)" :disabled="busy" @click="goHome">
            <span class="face"><Icon name="home" :size="26" /></span>{{ t.worldHome }}
          </button>
        </nav>
      </Transition>

      <Transition name="pop" mode="out-in">
        <ShopPanel
          v-if="panel === 'shop'"
          v-model:tab="shopTab"
          :t="t"
          :catalog="catalog"
          :inventory="me.inventory"
          :coins="me.coins"
          :look="me.avatar"
          :busy="busy"
          @close="closePanel"
          @buy="buy"
          @wear="wear"
        />
        <InventoryPanel
          v-else-if="panel === 'inventory'"
          v-model:tab="inventoryTab"
          :t="t"
          :catalog="catalog"
          :inventory="me.inventory"
          :look="me.avatar"
          :placed="atOwnHome ? placed : null"
          :at-home="atOwnHome"
          :busy="busy"
          @close="closePanel"
          @wear="wear"
          @take-off="takeOff"
          @place="startDecorating"
          @go-home="goHome"
        />
        <FriendsPanel
          v-else-if="panel === 'friends'"
          :t="t"
          :friends="me.friends"
          :at-home="atOwnHome"
          :busy="busy"
          @close="closePanel"
          @visit="visitHome"
          @invite="inviteFriend"
          @accept="addFriend"
          @remove="removeFriend"
          @profile="openProfile"
        />
        <ProfileCard
          v-else-if="panel === 'profile' && profile"
          :t="t"
          :profile="profile"
          :busy="busy"
          @close="closePanel"
          @add="addFriend"
          @accept="addFriend"
          @remove="removeFriend"
          @visit="visitHome"
          @edit="openPanel('creator')"
          @logout="signOut"
        />
      </Transition>

      <Transition name="fade">
        <div v-if="status !== 'open'" class="center dim reconnect">
          <div class="panel notice-card">
            <span class="spinner" aria-hidden="true"></span>
            <p class="title">{{ t.worldReconnecting }}</p>
          </div>
        </div>
      </Transition>
    </template>

    <TransitionGroup tag="div" name="pop" class="toasts" aria-live="polite">
      <div v-for="item in toasts" :key="item.id" class="toast">
        <span class="badge-icon toast-icon" aria-hidden="true"><Icon :name="item.icon" :size="18" /></span>
        <span class="text">{{ item.text }}</span>
        <button v-if="item.action" type="button" class="btn mint small" @click="runToast(item)">{{ item.action.label }}</button>
        <button type="button" class="btn gray small round" :aria-label="t.worldClose" @click="dismiss(item.id)"><Icon name="close" :size="14" /></button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.9rem;
  padding: 1rem;
  z-index: 30;
  overflow-y: auto;
}
.center.dim { background: rgba(80, 60, 140, 0.18); }
.back { flex-shrink: 0; }
.notice-card {
  width: min(24rem, 100%);
  padding: 1.6rem 1.4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  text-align: center;
}
.notice-card p { margin: 0; }
.notice-card .title { font-size: 1.15rem; font-weight: 900; }
.notice-card .row { display: flex; gap: 0.6rem; flex-wrap: wrap; justify-content: center; }
.big-icon { display: grid; place-items: center; width: 4rem; height: 4rem; border-radius: 22px; color: #fff; background: linear-gradient(160deg, var(--lilac-hi), var(--lilac)); }
.spinner { width: 2.6rem; height: 2.6rem; border-radius: 50%; border: 5px solid #f1e9ff; border-top-color: var(--pink); animation: world-spin 0.9s linear infinite; }
.reconnect { z-index: 50; }
.scrim { position: absolute; inset: 0; z-index: 9; }

/* Top bar */
.hud-top .spacer { flex: 1; }
.me { border: 0; color: inherit; cursor: pointer; padding-right: 1rem; }
.me .who { display: flex; flex-direction: column; align-items: flex-start; gap: 0.25rem; line-height: 1; }
.me b { max-width: 9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.where { position: relative; }
.place { padding-left: 0.4rem; border: 0; color: inherit; }
.caret { display: grid; color: var(--ink-soft); margin-left: -0.2rem; }
.places { position: absolute; top: calc(100% + 0.4rem); left: 0; display: flex; flex-direction: column; gap: 0.35rem; padding: 0.45rem; border-radius: 20px; min-width: 10rem; }
.places .chip { justify-content: flex-start; }
.places .chip:disabled { opacity: 0.45; }
.place-icon { display: grid; place-items: center; width: 2rem; height: 2rem; border-radius: 50%; color: #fff; background: linear-gradient(160deg, var(--peach-hi), var(--peach)); }
.wallet { position: relative; padding-right: 1.1rem; font-size: 1.1rem; }
.wallet b { font-weight: 900; color: #b06d00; min-width: 2ch; }
.gain { position: absolute; right: 0.8rem; top: -0.4rem; font-weight: 900; color: #e89a00; text-shadow: 0 1px 0 #fff; animation: world-float 1.6s ease-out forwards; pointer-events: none; }

/* Toolbar extras */
.tool:disabled { opacity: 0.6; }
.badge { position: absolute; top: -0.35rem; right: -0.35rem; min-width: 1.3rem; height: 1.3rem; padding: 0 0.3rem; border-radius: 99px; background: #ff4f7a; color: #fff; font-size: 0.7rem; font-weight: 900; line-height: 1.3rem; box-shadow: 0 0 0 2px #fff; }
.decorate { position: absolute; right: 1rem; bottom: 6.8rem; z-index: 14; }

.emotes {
  position: absolute;
  left: 50%;
  bottom: 6.6rem;
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
  padding: 0.5rem;
  border-radius: 24px;
  z-index: 17;
}
.emote { position: relative; display: flex; flex-direction: column; align-items: center; gap: 0.15rem; min-width: 4.6rem; padding: 0.5rem 0.4rem; border: 0; border-radius: 18px; background: #fff; color: var(--ink); font-size: 0.78rem; font-weight: 800; box-shadow: 0 3px 10px -5px rgba(70, 40, 120, 0.4); transition: transform 0.12s; }
.emote:hover { transform: translateY(-2px); }
.emoji { font-size: 1.7rem; line-height: 1.1; }
kbd { position: absolute; top: 0.25rem; right: 0.4rem; font: inherit; font-size: 0.62rem; color: var(--ink-soft); }

.toast .text { max-width: 20rem; }
.toast-icon { width: 2rem; height: 2rem; border-radius: 12px; flex-shrink: 0; }

.ring { display: grid; border-radius: 50%; }

@media (max-width: 640px) {
  /* A phone's top bar: the level badge alone, its ring showing how far to the next level */
  .world .hud-top { top: 0.5rem; left: 0.5rem; right: 0.5rem; gap: 0.4rem; }
  .hud-top .btn.round { width: 2.45rem; min-height: 2.45rem; }
  .me { padding: 0.2rem; }
  .me .who { display: none; }
  .ring { padding: 3px; background: conic-gradient(var(--pink) var(--xp), #ece6fb 0); }
  .ring .level { width: 1.95rem; height: 1.95rem; }
  .place .label { display: none; }
  .place { padding: 0.3rem 0.35rem; }
  .wallet { font-size: 1rem; padding-right: 0.8rem; }
  .wallet .coin { width: 1.7rem; height: 1.7rem; }
  .decorate { right: 0.5rem; bottom: 5.8rem; }
  .emotes { bottom: 5.6rem; }
  .emote { min-width: 3.9rem; }
  .toasts { width: calc(100% - 1rem); }
  .toast .text { max-width: none; flex: 1; font-size: 0.85rem; }
}
</style>
