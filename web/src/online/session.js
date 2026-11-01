import { ref, reactive, computed, watch } from 'vue'
import Peer from 'peerjs'
import { iceServers } from './iceServers'
import { RELAY_BROKERS, connectRelay, relayTopic } from './relay'
import { profile, ensureName, cleanName, recordStat, ONLINE_GAME_IDS } from './profile'

// The online room ("lobby") this tab is in. There's one at a time and it isn't tied to a page:
// it stays open while the visitor looks around the site, and the host can switch the game it
// plays without anyone reconnecting. It ends when someone leaves on purpose, when the host's
// tab goes, or when its hour is up.
//
// One device hosts: it owns the full room state, applies every player's actions and pushes
// each guest a snapshot of what that guest may see (the game's `project`). Guests only render
// what they receive and send actions back. No server of our own is involved; PeerJS's public
// broker just introduces the devices to each other.
//
// Guests first try a direct WebRTC link. Many routers block that even between devices on the
// same Wi-Fi, so when it doesn't come up quickly the same messages go through a public MQTT
// relay instead (see relay.js). The host listens on both from the start.
//
// The state has a few fields of the room's own (game, phase, ready, hostId, players,
// sessionEnds) and the rest belongs to the game. When the host picks another game, the
// players stay and the game's part starts over from that game's initialState. Each game page
// hands its rules over with registerRules (useOnlineRoom does it), and they stay registered
// after the page closes, so a round goes on while the host looks at another page.
//
// Deadlines (host clock, ms) are sent as time remaining and turned back into a deadline on the
// guest's clock, so timers line up even when device clocks disagree: the game's `deadline` and
// the room's `sessionEnds`.
//
// Real-time games also send "live" data (positions and the like) many times a second. That
// stays out of the state: the host keeps each player's latest and passes everyone's on in one
// small message, ten times a second by default. One-off "events" (a shot fired) are passed on
// to everyone straight away instead; the host can also send one to a single player.
//
// The lobby chat travels next to the state: the host stamps each line and passes it on, and a
// newcomer gets the last lines when they join. The host also adds a line when someone joins,
// leaves, changes their name or the game changes.
//
// A guest times a small echo from the host once a second: `connection` says how it reaches the
// host (direct or relay) and the round trip in ms, and the host keeps every guest's in `pings`.

const PEER_PREFIX = 'ebrarkarademir-room-'
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CONNECT_TIMEOUT_MS = 25000
const DIRECT_MS = 7000 // how long a guest tries the direct link before switching to the relay
const RELAY_ANSWER_MS = 5000 // per relay broker, how long a guest waits for the host to answer
const RELAY_PING_MS = 4000
const RELAY_TIMEOUT_MS = 15000 // silence after which a relayed player counts as gone
const RECONNECT_MS = 1000
const TICK_MS = 250
const LIVE_MS = 100 // how often the host passes on the players' live data
const RTT_MS = 1000 // how often a guest times the way to the host and back
const CLOSE_MS = 400 // host: time for the "room closed" message to go out before the room does
const CLIENT_KEY = 'onlineClientId'

export const SESSION_MS = 60 * 60 * 1000 // a room lasts an hour from when it opens
export const CHAT_TEXT = 200
const CHAT_KEEP = 60
const SYSTEM_LINES = ['join', 'leave', 'game', 'rename']
const CLOSE_REASONS = ['onlineErrExpired', 'onlineErrHostLeft']

const peerOptions = { config: { iceServers } }

const randomCode = () =>
  Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')

const randomId = () => Math.random().toString(36).slice(2, 12)

const waitFor = (check, ms) => new Promise((resolve) => {
  const started = Date.now()
  const timer = setInterval(() => {
    if (check() || Date.now() - started > ms) {
      clearInterval(timer)
      resolve(check())
    }
  }, 100)
})

const isGame = (game) => ONLINE_GAME_IDS.includes(game)

// Stable per-tab id, so a player who drops out (phone locked, page reloaded) rejoins as themselves
const getClientId = () => {
  try {
    let id = sessionStorage.getItem(CLIENT_KEY)
    if (!id) {
      id = randomId()
      sessionStorage.setItem(CLIENT_KEY, id)
    }
    return id
  } catch {
    return randomId()
  }
}

// ---------- State ----------

const screen = ref('home') // home | connecting | room
const role = ref(null) // host | guest
const roomCode = ref('')
const errorKey = ref('')
const joinCode = ref('')
const now = ref(Date.now())
const myId = getClientId()

const state = ref(null) // full state, host only
const remote = ref(null) // projected state received by a guest
const chat = ref([]) // lobby chat: { id, at, from, name, av, text } or { id, at, sys, ... }
const chatSeenAt = ref(0) // host time of the last line read

// Guest: how it reaches the host and how long a message takes there and back
const connection = reactive({ kind: null, ms: null })
// Host: the same for every guest, by player id: { ms, relay }
const pings = reactive({})

let attempt = 0 // bumped on every reset, so callbacks from an abandoned connection do nothing
let opening = 0 // bumped by every create, join and leave, so a start still waiting for a name gives up
let peer = null
let connectTimer = null
let directTimer = null
// Host: guests by link key (PeerJS peer id or 'relay:' + relay id) -> { playerId, send, relay, lastSeen }
const guests = new Map()
const hostRelays = [] // host: one connection per relay broker
// Guest: the way to the host, direct or relayed -> { send, close }
let hostLink = null
let guestRelay = null
let relayTimer = null
let lastHostMessage = 0
// Host: each player's latest live data, by player id; sent on when something changed
const liveData = new Map()
let liveChanged = false
let liveTimer = null
let rttTimer = null
let closing = false
let countedJoin = '' // the room whose join already counts for the medals
let roomMs = 0 // time spent in rooms, towards the next minute for the medals

// ---------- Games ----------

const rulesByGame = new Map() // game -> { initialState, project, onAction, onJoin, onLeave, onTick, onGuestLive, liveMs }
const renderByGame = new Map() // game -> { token, onLive, onEvent }: only while that game's page is open

/** A game page hands over the rules its host runs. They stay until the page opens again. */
export function registerRules (game, rules) {
  rulesByGame.set(game, rules)
  initGame()
  restartLive()
}

/** A game page's handlers for live data and events, which draw on that page. */
export function registerRender (game, render) {
  const token = Symbol(game)
  renderByGame.set(game, { token, ...render })
  return token
}

export function unregisterRender (game, token) {
  if (renderByGame.get(game)?.token === token) renderByGame.delete(game)
}

const currentGame = computed(() => (role.value === 'host' ? state.value?.game : remote.value?.game) || '')
const rulesNow = () => (state.value?.ready ? rulesByGame.get(state.value.game) : null)
const renderNow = () => renderByGame.get(currentGame.value)

// A game's mistake shouldn't take the room down with it
function safely (fn, ...args) {
  if (!fn) return undefined
  try {
    return fn(...args)
  } catch (err) {
    console.error(err)
    return undefined
  }
}

function project (s, playerId) {
  const rules = s.ready ? rulesByGame.get(s.game) : null
  if (!rules?.project) return s
  try {
    return rules.project(s, playerId)
  } catch (err) {
    console.error(err)
    return s
  }
}

const view = computed(() => {
  if (role.value === 'host') return state.value ? project(state.value, myId) : null
  return remote.value
})

// Host: the game's own part of the state, once that game's rules are here
function initGame () {
  const s = state.value
  if (role.value !== 'host' || !s || s.ready) return
  const rules = rulesByGame.get(s.game)
  if (!rules) return
  const base = { game: s.game, phase: 'lobby', hostId: s.hostId, players: s.players, sessionEnds: s.sessionEnds }
  Object.assign(s, safely(rules.initialState) || {}, base, { ready: true })
  s.players.forEach(player => safely(rules.onJoin, s, player))
}

// ---------- Host ----------

async function createRoom (game) {
  if (!isGame(game)) return
  const ticket = ++opening
  errorKey.value = ''
  screen.value = 'connecting'
  await ensureName()
  if (ticket !== opening) return
  resetConnection()
  role.value = 'host'
  openHostPeer(randomCode(), game)
}

/** Opens a room in this game, or switches the room this tab hosts to it. */
function hostFor (game) {
  if (role.value === 'host' && screen.value === 'room') switchGame(game)
  else createRoom(game)
}

function openHostPeer (code, game) {
  const hostPeer = new Peer(PEER_PREFIX + code, peerOptions)
  peer = hostPeer
  const myAttempt = attempt
  hostPeer.on('open', () => {
    // 'open' fires again after a reconnect; the room must survive that
    if (state.value || attempt !== myAttempt) return
    roomCode.value = code
    chat.value = []
    chatSeenAt.value = 0
    state.value = { game, phase: 'lobby', ready: false, hostId: myId, players: [], sessionEnds: Date.now() + SESSION_MS }
    addPlayer(myId, profile.name, profile.avatar)
    initGame()
    screen.value = 'room'
    recordStat('hosted')
    restartLive()
    RELAY_BROKERS.forEach(url => openHostRelay(url, code, myAttempt))
  })
  hostPeer.on('connection', (conn) => {
    const link = { send: (msg) => conn.open && conn.send(msg) }
    conn.on('data', (msg) => handleGuestMessage(conn.peer, link, msg))
    conn.on('close', () => dropGuest(conn.peer))
    conn.on('error', () => dropGuest(conn.peer))
  })
  // Phones drop the broker connection when the host switches apps (e.g. to send the code).
  // Without it new guests get "room not found", so get the same code back.
  hostPeer.on('disconnected', () => {
    if (peer === hostPeer && !hostPeer.destroyed) setTimeout(() => reconnectHost(hostPeer), RECONNECT_MS)
  })
  hostPeer.on('error', (err) => {
    if (peer !== hostPeer) return
    if (err.type === 'unavailable-id' && !state.value) {
      hostPeer.destroy()
      openHostPeer(randomCode(), game)
    } else if (screen.value === 'connecting') {
      fail('onlineErrConnection')
    }
  })
}

function reconnectHost (hostPeer) {
  if (peer === hostPeer && hostPeer.disconnected && !hostPeer.destroyed) hostPeer.reconnect()
}

const hostTopic = (code) => relayTopic('room', code, 'host')
const guestTopic = (code, relayId) => relayTopic('room', code, 'guest', relayId)

// Listen for relayed guests on one broker, and keep trying if it is unreachable or drops
async function openHostRelay (url, code, myAttempt) {
  const retry = (ms) => setTimeout(() => {
    if (attempt === myAttempt) openHostRelay(url, code, myAttempt)
  }, ms)
  let relay
  try {
    relay = await connectRelay(url, {
      onMessage: (topic, envelope) => onRelayedMessage(relay, code, envelope),
      onClose: () => {
        const index = hostRelays.indexOf(relay)
        if (index >= 0) hostRelays.splice(index, 1)
        retry(RECONNECT_MS * 3)
      }
    })
  } catch {
    retry(RECONNECT_MS * 10)
    return
  }
  if (attempt !== myAttempt) {
    relay.close()
    return
  }
  hostRelays.push(relay)
  await relay.subscribe(hostTopic(code))
}

function onRelayedMessage (relay, code, envelope) {
  const { from, msg } = envelope || {}
  if (typeof from !== 'string' || !msg || typeof msg !== 'object') return
  const key = 'relay:' + from
  const send = (reply) => relay.publish(guestTopic(code, from), reply)
  if (msg.type === 'join') {
    handleGuestMessage(key, { relay: true, send }, msg)
  } else if (msg.type === 'leave') {
    dropGuest(key)
  } else if (msg.type === 'ping') {
    const guest = guests.get(key)
    if (guest) guest.lastSeen = Date.now()
    // A guest we already dropped for silence is still there: have it join again
    send({ type: guest ? 'pong' : 'rejoin' })
  } else {
    handleGuestMessage(key, null, msg)
  }
}

function uniqueName (s, name, id) {
  const taken = new Set(s.players.filter(p => p.id !== id).map(p => p.name))
  let unique = name
  for (let n = 2; taken.has(unique); n++) unique = `${name} ${n}`
  return unique
}

function addPlayer (id, rawName, av) {
  const s = state.value
  const avatar = Number.isInteger(av) ? av : 0
  const existing = s.players.find(p => p.id === id)
  if (existing) {
    existing.online = true
    existing.av = avatar
    safely(rulesNow()?.onJoin, s, existing)
    return
  }
  const player = { id, name: uniqueName(s, cleanName(rawName) || 'Player', id), av: avatar, online: true }
  s.players.push(player)
  if (id !== myId) systemChat({ sys: 'join', name: player.name })
  safely(rulesNow()?.onJoin, s, player)
}

function handleGuestMessage (key, link, msg) {
  if (!state.value || typeof msg !== 'object' || !msg) return
  const known = guests.get(key)
  if (known) known.lastSeen = Date.now()
  if (msg.type === 'join' && typeof msg.clientId === 'string' && link) {
    // The same tab reconnecting (or switching to the relay) replaces its old connection
    guests.forEach((guest, other) => {
      if (guest.playerId === msg.clientId && other !== key) guests.delete(other)
    })
    const guest = { ...link, playerId: msg.clientId, lastSeen: Date.now() }
    guests.set(key, guest)
    addPlayer(msg.clientId, msg.name, msg.av)
    sendTo(guest)
    guest.send({ type: 'chatlog', list: chat.value })
  } else if (msg.type === 'action' && known) {
    hostAction(known.playerId, msg.action || {})
  } else if (msg.type === 'live' && known) {
    liveData.set(known.playerId, msg.data)
    liveChanged = true
    safely(rulesNow()?.onGuestLive, known.playerId, msg.data)
  } else if (msg.type === 'event' && known && msg.data && typeof msg.data === 'object') {
    passOnEvent(known.playerId, msg.data)
  } else if (msg.type === 'rtt' && known) {
    // Echo it straight back, and keep the round trip the guest last measured
    known.send({ type: 'rtt', t: msg.t })
    if (Number.isFinite(msg.last)) pings[known.playerId] = { ms: Math.round(msg.last), relay: !!known.relay }
  } else if (msg.type === 'chat' && known) {
    hostChat(known.playerId, msg.text)
  } else if (msg.type === 'profile' && known) {
    applyProfile(known.playerId, msg)
  }
}

function hostAction (playerId, action) {
  const rules = rulesNow()
  if (rules) safely(rules.onAction, state.value, playerId, action)
}

// Host: an event goes to every other player at once
function passOnEvent (from, data) {
  guests.forEach(guest => {
    if (guest.playerId !== from) guest.send({ type: 'event', from, data })
  })
  if (from !== myId) safely(renderNow()?.onEvent, data, from)
}

function dropGuest (key) {
  const guest = guests.get(key)
  if (!guest || !state.value) return
  guests.delete(key)
  liveData.delete(guest.playerId)
  delete pings[guest.playerId]
  liveChanged = true
  const s = state.value
  const player = s.players.find(p => p.id === guest.playerId)
  if (!player) return
  if (s.phase === 'lobby') s.players = s.players.filter(p => p !== player)
  else player.online = false
  systemChat({ sys: 'leave', name: player.name })
  safely(rulesNow()?.onLeave, s, player)
}

function applyProfile (id, { name, av }) {
  const s = state.value
  const player = s?.players.find(p => p.id === id)
  if (!player) return
  if (Number.isInteger(av)) player.av = av
  const clean = cleanName(name)
  if (!clean) return
  const unique = uniqueName(s, clean, id)
  if (unique === player.name) return
  systemChat({ sys: 'rename', name: player.name, to: unique })
  player.name = unique
}

/** Host, in the lobby: play another game with the same players, in the same room. */
function switchGame (next) {
  const s = state.value
  if (role.value !== 'host' || !s || s.game === next || !isGame(next)) return
  liveData.clear()
  liveChanged = true
  state.value = {
    game: next,
    phase: 'lobby',
    ready: false,
    hostId: s.hostId,
    players: s.players.filter(p => p.online).map(({ id, name, av, online }) => ({ id, name, av, online })),
    sessionEnds: s.sessionEnds
  }
  systemChat({ sys: 'game', game: next })
  initGame()
  restartLive()
}

function closeRoom (key) {
  if (closing) return
  closing = true
  guests.forEach(guest => guest.send({ type: 'closed', key }))
  setTimeout(() => fail(key), CLOSE_MS)
}

function serialize (snapshot) {
  const data = JSON.parse(JSON.stringify(snapshot))
  if (typeof data.deadline === 'number') {
    data.msLeft = Math.max(0, data.deadline - Date.now())
    delete data.deadline
  }
  if (typeof data.sessionEnds === 'number') {
    data.sessionLeft = Math.max(0, data.sessionEnds - Date.now())
    delete data.sessionEnds
  }
  return data
}

function sendTo (guest) {
  if (guest && state.value) guest.send({ type: 'state', state: serialize(project(state.value, guest.playerId)) })
}

// Any change to the host's state reaches every guest on the next tick
watch(state, () => guests.forEach(sendTo), { deep: true })

function flushLive () {
  if (role.value !== 'host' || !state.value || !liveChanged) return
  liveChanged = false
  const data = Object.fromEntries(liveData)
  guests.forEach(guest => guest.send({ type: 'live', data }))
  safely(renderNow()?.onLive, data)
}

// The game decides how often live data goes out
function restartLive () {
  clearInterval(liveTimer)
  liveTimer = null
  if (role.value !== 'host' || !state.value) return
  liveTimer = setInterval(flushLive, rulesByGame.get(state.value.game)?.liveMs || LIVE_MS)
}

// ---------- Chat ----------

const cleanText = (text) => String(text || '').replace(/\s+/g, ' ').trim().slice(0, CHAT_TEXT)

function addChat (line) {
  chat.value.push(line)
  if (chat.value.length > CHAT_KEEP) chat.value.splice(0, chat.value.length - CHAT_KEEP)
}

function pushChat (line) {
  addChat(line)
  guests.forEach(guest => guest.send({ type: 'chat', line }))
}

function hostChat (from, raw) {
  const text = cleanText(raw)
  const player = state.value?.players.find(p => p.id === from)
  if (text && player) pushChat({ id: randomId(), at: Date.now(), from, name: player.name, av: player.av || 0, text })
}

function systemChat (entry) {
  if (state.value) pushChat({ id: randomId(), at: Date.now(), ...entry })
}

// A guest only keeps lines that look like the host's
function readLine (line) {
  if (!line || typeof line !== 'object' || typeof line.id !== 'string' || !Number.isFinite(line.at)) return null
  if (SYSTEM_LINES.includes(line.sys)) {
    return { id: line.id, at: line.at, sys: line.sys, name: cleanName(line.name), to: cleanName(line.to), game: isGame(line.game) ? line.game : '' }
  }
  const text = cleanText(line.text)
  if (!text || typeof line.from !== 'string') return null
  return { id: line.id, at: line.at, from: line.from, name: cleanName(line.name), av: Number.isInteger(line.av) ? line.av : 0, text }
}

/** Sends a line to the lobby chat. */
function sendChat (raw) {
  const text = cleanText(raw)
  if (!text || screen.value !== 'room') return false
  recordStat('chats')
  if (role.value === 'host') hostChat(myId, text)
  else hostLink?.send({ type: 'chat', text })
  return true
}

const chatUnread = computed(() => chat.value.filter(line => !line.sys && line.from !== myId && line.at > chatSeenAt.value).length)

function markChatSeen () {
  const last = chat.value[chat.value.length - 1]
  if (last && last.at > chatSeenAt.value) chatSeenAt.value = last.at
}

// ---------- Guest ----------

async function joinRoom (rawCode) {
  const code = String(rawCode ?? joinCode.value).trim().toUpperCase()
  if (!/^[A-Z0-9]{4}$/.test(code)) {
    errorKey.value = 'onlineErrCode'
    return
  }
  // Already there, or on the way
  if (screen.value !== 'home' && roomCode.value === code && role.value === 'guest') return
  const ticket = ++opening
  errorKey.value = ''
  joinCode.value = code
  screen.value = 'connecting'
  await ensureName()
  if (ticket !== opening) return
  resetConnection()
  role.value = 'guest'
  roomCode.value = code
  const myAttempt = attempt
  const status = { reachedBroker: false, notFound: false, relayStarted: false }
  connectTimer = setTimeout(() => {
    fail(status.notFound ? 'onlineErrNotFound' : status.reachedBroker ? 'onlineErrNoRoute' : 'onlineErrConnection')
  }, CONNECT_TIMEOUT_MS)

  // Direct link didn't come up: drop it and go through the relay
  const toRelay = () => {
    if (attempt !== myAttempt || status.relayStarted || screen.value !== 'connecting') return
    status.relayStarted = true
    clearTimeout(directTimer)
    const directPeer = peer
    peer = null
    hostLink = null
    directPeer?.destroy()
    joinViaRelay(code, myAttempt, randomId())
  }
  directTimer = setTimeout(toRelay, DIRECT_MS)

  const guestPeer = new Peer(peerOptions)
  peer = guestPeer
  guestPeer.on('open', () => {
    status.reachedBroker = true
    const conn = guestPeer.connect(PEER_PREFIX + code, { reliable: true })
    const link = { send: (msg) => conn.open && conn.send(msg), close: () => conn.close() }
    hostLink = link
    connection.kind = 'direct'
    conn.on('open', () => conn.send(joinMessage()))
    conn.on('iceStateChanged', (iceState) => {
      if (hostLink === link && iceState === 'failed') toRelay()
    })
    conn.on('data', (msg) => {
      if (hostLink === link) receiveFromHost(msg)
    })
    // Events from a connection we already left are ignored
    conn.on('close', () => {
      if (hostLink === link) fail('onlineErrDisconnected')
    })
  })
  guestPeer.on('error', (err) => {
    if (peer !== guestPeer) return
    if (err.type === 'peer-unavailable') status.notFound = true
    // Once in the room, the data connection survives broker hiccups
    if (screen.value === 'connecting') toRelay()
  })
}

const joinMessage = () => ({ type: 'join', name: profile.name, av: profile.avatar, clientId: myId })

function receiveFromHost (msg) {
  lastHostMessage = Date.now()
  if (!msg || typeof msg !== 'object') return
  if (msg.type === 'rejoin') hostLink?.send(joinMessage())
  if (msg.type === 'rtt') {
    if (Number.isFinite(msg.t)) {
      const ms = performance.now() - msg.t
      // Eased a little, so one slow message doesn't make the number jump
      connection.ms = connection.ms === null ? ms : connection.ms * 0.6 + ms * 0.4
    }
    return
  }
  if (msg.type === 'live') {
    if (msg.data && typeof msg.data === 'object') safely(renderNow()?.onLive, msg.data)
    return
  }
  if (msg.type === 'event') {
    if (msg.data && typeof msg.data === 'object') safely(renderNow()?.onEvent, msg.data, msg.from)
    return
  }
  if (msg.type === 'chat') {
    const line = readLine(msg.line)
    if (line && !chat.value.some(known => known.id === line.id)) addChat(line)
    return
  }
  if (msg.type === 'chatlog') {
    chat.value = (Array.isArray(msg.list) ? msg.list : []).map(readLine).filter(Boolean).slice(-CHAT_KEEP)
    markChatSeen()
    return
  }
  if (msg.type === 'closed') {
    fail(CLOSE_REASONS.includes(msg.key) ? msg.key : 'onlineErrDisconnected')
    return
  }
  if (msg.type !== 'state' || !msg.state || typeof msg.state !== 'object') return
  clearTimeout(connectTimer)
  clearTimeout(directTimer)
  const next = msg.state
  if (typeof next.msLeft === 'number') {
    next.deadline = Date.now() + next.msLeft
    delete next.msLeft
  }
  if (typeof next.sessionLeft === 'number') {
    next.sessionEnds = Date.now() + next.sessionLeft
    delete next.sessionLeft
  }
  remote.value = next
  if (screen.value !== 'room') {
    screen.value = 'room'
    if (countedJoin !== roomCode.value) {
      countedJoin = roomCode.value
      recordStat('joined')
    }
  }
  startTiming()
}

// Once a second the guest sends the time and the host sends it straight back
function startTiming () {
  if (rttTimer) return
  const send = () => hostLink?.send({ type: 'rtt', t: performance.now(), last: connection.ms })
  send()
  rttTimer = setInterval(send, RTT_MS)
}

// Try each broker until the host answers there. Also used to get back in after the relay drops.
async function joinViaRelay (code, myAttempt, relayId) {
  for (const url of RELAY_BROKERS) {
    if (attempt !== myAttempt) return
    let relay
    try {
      relay = await connectRelay(url, {
        onMessage: (topic, msg) => {
          if (guestRelay === relay) receiveFromHost(msg)
        },
        onClose: () => {
          if (guestRelay !== relay || attempt !== myAttempt) return
          guestRelay = null
          hostLink = null
          joinViaRelay(code, myAttempt, relayId)
        }
      })
    } catch {
      continue
    }
    if (attempt !== myAttempt) {
      relay.close()
      return
    }
    guestRelay = relay
    connection.kind = 'relay'
    connection.ms = null
    await relay.subscribe(guestTopic(code, relayId))
    const link = {
      send: (msg) => relay.publish(hostTopic(code), { from: relayId, msg }),
      close: () => {
        link.send({ type: 'leave' })
        relay.close()
      }
    }
    hostLink = link
    const asked = Date.now()
    link.send(joinMessage())
    if (await waitFor(() => attempt !== myAttempt || lastHostMessage > asked, RELAY_ANSWER_MS)) {
      if (attempt === myAttempt) watchRelayedHost(myAttempt)
      return
    }
    guestRelay = null
    hostLink = null
    relay.close()
  }
}

// Relayed messages have no connection to close, so both sides ping and watch for silence
function watchRelayedHost (myAttempt) {
  clearInterval(relayTimer)
  relayTimer = setInterval(() => {
    if (attempt !== myAttempt) return
    hostLink?.send({ type: 'ping' })
    if (Date.now() - lastHostMessage > RELAY_TIMEOUT_MS) fail('onlineErrDisconnected')
  }, RELAY_PING_MS)
}

// ---------- Shared ----------

/** Send an action to the host (or apply it directly when this device is the host). */
function act (type, payload = {}) {
  if (screen.value !== 'room') return
  const action = { type, ...payload }
  if (role.value === 'host') hostAction(myId, action)
  else hostLink?.send({ type: 'action', action })
}

/** Share this player's latest live data; it replaces what they sent before. */
function sendLive (data) {
  if (screen.value !== 'room') return
  if (role.value === 'host') {
    liveData.set(myId, data)
    liveChanged = true
  } else {
    hostLink?.send({ type: 'live', data })
  }
}

/** Send a one-off event to every other player, right away. */
function sendEvent (data) {
  if (screen.value !== 'room') return
  if (role.value === 'host') passOnEvent(myId, data)
  else hostLink?.send({ type: 'event', data })
}

/** Host: send a one-off event to one player only, e.g. to catch up someone who joined late. */
function sendEventTo (playerId, data) {
  if (role.value !== 'host') return
  if (playerId === myId) {
    safely(renderNow()?.onEvent, data, myId)
    return
  }
  guests.forEach(guest => {
    if (guest.playerId === playerId) guest.send({ type: 'event', from: myId, data })
  })
}

// A new name or face reaches the room at once
function shareProfile () {
  if (screen.value !== 'room') return
  if (role.value === 'host') applyProfile(myId, { name: profile.name, av: profile.avatar })
  else hostLink?.send({ type: 'profile', name: profile.name, av: profile.avatar })
}
watch(() => [profile.name, profile.avatar], shareProfile)

/** Picks a new name, here and in the room. */
function rename (raw) {
  const name = cleanName(raw)
  if (!name) return false
  profile.name = name
  profile.custom = true
  return true
}

function fail (key) {
  resetConnection()
  role.value = null
  errorKey.value = key
  screen.value = 'home'
}

// `linger` keeps the old connections open a moment, so a last message can still go out
function resetConnection ({ linger = 0 } = {}) {
  attempt++
  closing = false
  clearTimeout(connectTimer)
  clearTimeout(directTimer)
  clearInterval(relayTimer)
  clearInterval(rttTimer)
  clearInterval(liveTimer)
  rttTimer = null
  liveTimer = null
  connection.kind = null
  connection.ms = null
  Object.keys(pings).forEach(id => delete pings[id])
  guests.clear()
  liveData.clear()
  liveChanged = false
  const oldLink = hostLink
  const oldPeer = peer
  const oldRelays = [...hostRelays, guestRelay].filter(Boolean)
  hostLink = null
  peer = null
  guestRelay = null
  hostRelays.length = 0
  const closeOld = () => {
    oldLink?.close()
    oldPeer?.destroy()
    oldRelays.forEach(relay => relay.close())
  }
  if (linger) setTimeout(closeOld, linger)
  else closeOld()
  state.value = null
  remote.value = null
  roomCode.value = ''
  chat.value = []
  chatSeenAt.value = 0
}

function leave () {
  opening++
  // The host takes the room with them: tell everyone, rather than let them find out
  const hosting = role.value === 'host' && guests.size > 0
  if (hosting) guests.forEach(guest => guest.send({ type: 'closed', key: 'onlineErrHostLeft' }))
  resetConnection({ linger: hosting ? CLOSE_MS : 0 })
  role.value = null
  errorKey.value = ''
  screen.value = 'home'
}

// Coming back to the app: reconnect the host to the broker right away
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && role.value === 'host' && peer) reconnectHost(peer)
})

setInterval(() => {
  now.value = Date.now()
  if (screen.value === 'room') {
    roomMs += TICK_MS
    if (roomMs >= 60000) {
      roomMs -= 60000
      recordStat('minutes')
    }
  }
  if (role.value !== 'host' || !state.value) return
  guests.forEach((guest, key) => {
    if (guest.relay && now.value - guest.lastSeen > RELAY_TIMEOUT_MS) dropGuest(key)
  })
  if (now.value >= state.value.sessionEnds) {
    closeRoom('onlineErrExpired')
    return
  }
  const rules = rulesNow()
  if (rules) safely(rules.onTick, state.value, now.value)
}, TICK_MS)

// Each round started counts as a game played, for the medal that asks for every game
watch(() => `${currentGame.value}|${view.value?.phase || ''}`, (current, previous) => {
  const [game, phase] = current.split('|')
  const [oldGame, oldPhase] = (previous || '').split('|')
  if (game && game === oldGame && oldPhase === 'lobby' && phase && phase !== 'lobby' && view.value?.players?.some(p => p.id === myId)) {
    recordStat('played', game)
  }
})

// ---------- For the rest of the app ----------

/** The room this tab is in: { game, code, isHost }, or null. */
export const currentRoom = computed(() =>
  screen.value === 'room' && currentGame.value ? { game: currentGame.value, code: roomCode.value, isHost: role.value === 'host' } : null)

/** What the users list tells everyone about the room: who's in, the game, how long it has left. */
export const roomInfo = computed(() => {
  const v = screen.value === 'room' ? view.value : null
  if (!v?.players) return null
  const online = v.players.filter(p => p.online)
  return {
    code: roomCode.value,
    game: v.game,
    host: role.value === 'host',
    phase: v.phase,
    ends: v.sessionEnds,
    players: online.map(p => ({ id: p.id, name: p.name, av: p.av || 0, host: p.id === v.hostId }))
  }
})

// The dev server lets tests look inside
if (import.meta.env.DEV) window.__session = { state, remote, chat }

export const session = reactive({
  screen, role, roomCode, errorKey, joinCode, now, myId, connection, pings, chat, chatSeenAt, view,
  game: currentGame,
  isHost: computed(() => role.value === 'host'),
  chatUnread,

  createRoom, hostFor, joinRoom, leave, act, sendLive, sendEvent, sendEventTo, switchGame, sendChat, markChatSeen, rename
})
