import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import Peer from 'peerjs'
import { iceServers } from './iceServers'
import { RELAY_BROKERS, connectRelay, relayTopic } from './relay'

// Peer-to-peer rooms shared by every online game.
//
// One device hosts: it owns the full game state, applies every player's actions and pushes
// each guest a snapshot of what that guest may see (`project`). Guests only render what they
// receive and send actions back. No server of our own is involved; PeerJS's public broker
// just introduces the devices to each other.
//
// Guests first try a direct WebRTC link. Many routers block that even between devices on the
// same Wi-Fi, so when it doesn't come up quickly the same messages go through a public MQTT
// relay instead (see relay.js). The host listens on both from the start.
//
// A top-level `deadline` (host clock, ms) is sent as time remaining and turned back into a
// deadline on the guest's clock, so timers line up even when device clocks disagree.
//
// Real-time games also send "live" data (positions and the like) many times a second. That
// stays out of the game state: the host keeps each player's latest and passes everyone's on
// in one small message, ten times a second.

const PEER_PREFIX = 'ebrarkarademir-'
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CONNECT_TIMEOUT_MS = 25000
const DIRECT_MS = 7000 // how long a guest tries the direct link before switching to the relay
const RELAY_ANSWER_MS = 5000 // per relay broker, how long a guest waits for the host to answer
const RELAY_PING_MS = 4000
const RELAY_TIMEOUT_MS = 15000 // silence after which a relayed player counts as gone
const RECONNECT_MS = 1000
const TICK_MS = 250
const LIVE_MS = 100 // how often the host passes on the players' live data
const NAME_KEY = 'onlineName'
const CLIENT_KEY = 'onlineClientId'

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

export const cleanName = (name) => String(name || '').trim().slice(0, 18)

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

const loadName = () => {
  try {
    return localStorage.getItem(NAME_KEY) || localStorage.getItem('quizName') || ''
  } catch {
    return ''
  }
}

/**
 * @param {object} options
 * @param {string} options.game         Game id; rooms are separate per game.
 * @param {() => object} options.initialState  Game fields merged into a fresh room state.
 * @param {(state, playerId) => object} [options.project]  What one player may see.
 * @param {(state, playerId, action) => void} options.onAction  Host: apply a player's action.
 * @param {(state, player) => void} [options.onJoin]   Host: a player joined or came back.
 * @param {(state, player) => void} [options.onLeave]  Host: a player dropped out.
 * @param {(state, now) => void} [options.onTick]      Host: runs a few times a second (timeouts).
 * @param {(data) => void} [options.onLive]  Everyone: every player's latest live data, by player id.
 * @param {string} [options.initialCode] Room code from an invite link; joins straight away.
 */
export function useOnlineRoom (options) {
  const { game, initialState, project = (state) => state, onAction, onJoin, onLeave, onTick, onLive } = options

  const screen = ref('home') // home | connecting | room
  const role = ref(null) // host | guest
  const roomCode = ref('')
  const errorKey = ref('')
  const playerName = ref(loadName())
  const joinCode = ref((options.initialCode || '').toUpperCase())
  const now = ref(Date.now())
  const myId = getClientId()

  const state = ref(null) // full state, host only
  const remote = ref(null) // projected state received by a guest

  let attempt = 0 // bumped on every reset, so callbacks from an abandoned connection do nothing
  let peer = null
  let connectTimer = null
  let directTimer = null
  let tickTimer = null
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

  const freshState = () => ({ phase: 'lobby', hostId: myId, players: [], ...initialState() })

  const view = computed(() => {
    if (role.value === 'host') return state.value ? project(state.value, myId) : null
    return remote.value
  })
  const me = computed(() => view.value?.players.find(p => p.id === myId) || null)
  const isHost = computed(() => role.value === 'host')
  const shareLink = computed(() => `${window.location.origin}/${game}?join=${roomCode.value}`)

  const peerId = (code) => `${PEER_PREFIX}${game}-${code}`
  const hostTopic = (code) => relayTopic(game, code, 'host')
  const guestTopic = (code, relayId) => relayTopic(game, code, 'guest', relayId)

  function rememberName () {
    playerName.value = cleanName(playerName.value)
    try {
      localStorage.setItem(NAME_KEY, playerName.value)
    } catch {
      // Remembering the name is a convenience only
    }
    errorKey.value = ''
    return playerName.value !== ''
  }

  // ---------- Host ----------

  function createRoom () {
    if (!rememberName()) return
    resetConnection()
    role.value = 'host'
    screen.value = 'connecting'
    openHostPeer(randomCode())
  }

  function openHostPeer (code) {
    const hostPeer = new Peer(peerId(code), peerOptions)
    peer = hostPeer
    hostPeer.on('open', () => {
      // 'open' fires again after a reconnect; the room must survive that
      if (state.value) return
      roomCode.value = code
      state.value = freshState()
      addPlayer(myId, playerName.value)
      screen.value = 'room'
      RELAY_BROKERS.forEach(url => openHostRelay(url, code, attempt))
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
        openHostPeer(randomCode())
      } else if (screen.value === 'connecting') {
        fail('onlineErrConnection')
      }
    })
  }

  function reconnectHost (hostPeer) {
    if (peer === hostPeer && hostPeer.disconnected && !hostPeer.destroyed) hostPeer.reconnect()
  }

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

  function addPlayer (id, rawName) {
    const s = state.value
    const name = cleanName(rawName) || 'Player'
    const existing = s.players.find(p => p.id === id)
    if (existing) {
      existing.online = true
      onJoin?.(s, existing)
      return
    }
    const taken = new Set(s.players.map(p => p.name))
    let unique = name
    for (let n = 2; taken.has(unique); n++) unique = `${name} ${n}`
    const player = { id, name: unique, online: true }
    s.players.push(player)
    onJoin?.(s, player)
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
      guests.set(key, { ...link, playerId: msg.clientId, lastSeen: Date.now() })
      addPlayer(msg.clientId, msg.name)
      sendTo(guests.get(key))
    } else if (msg.type === 'action' && known) {
      onAction(state.value, known.playerId, msg.action || {})
    } else if (msg.type === 'live' && known) {
      liveData.set(known.playerId, msg.data)
      liveChanged = true
    }
  }

  function dropGuest (key) {
    const guest = guests.get(key)
    if (!guest || !state.value) return
    guests.delete(key)
    liveData.delete(guest.playerId)
    liveChanged = true
    const s = state.value
    const player = s.players.find(p => p.id === guest.playerId)
    if (!player) return
    if (s.phase === 'lobby') s.players = s.players.filter(p => p !== player)
    else player.online = false
    onLeave?.(s, player)
  }

  function serialize (snapshot) {
    const data = JSON.parse(JSON.stringify(snapshot))
    if (typeof data.deadline === 'number') {
      data.msLeft = Math.max(0, data.deadline - Date.now())
      delete data.deadline
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
    onLive?.(data)
  }

  // ---------- Guest ----------

  function joinRoom () {
    if (!rememberName()) return
    const code = joinCode.value.trim().toUpperCase()
    if (code.length !== 4) {
      errorKey.value = 'onlineErrCode'
      return
    }
    resetConnection()
    role.value = 'guest'
    roomCode.value = code
    screen.value = 'connecting'
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
      const conn = guestPeer.connect(peerId(code), { reliable: true })
      const link = { send: (msg) => conn.open && conn.send(msg), close: () => conn.close() }
      hostLink = link
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

  const joinMessage = () => ({ type: 'join', name: playerName.value, clientId: myId })

  function receiveFromHost (msg) {
    lastHostMessage = Date.now()
    if (msg?.type === 'rejoin') hostLink?.send(joinMessage())
    if (msg?.type === 'live') {
      if (msg.data && typeof msg.data === 'object') onLive?.(msg.data)
      return
    }
    if (msg?.type !== 'state') return
    clearTimeout(connectTimer)
    clearTimeout(directTimer)
    const next = msg.state
    if (typeof next.msLeft === 'number') {
      next.deadline = Date.now() + next.msLeft
      delete next.msLeft
    }
    remote.value = next
    screen.value = 'room'
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
    const action = { type, ...payload }
    if (role.value === 'host') onAction(state.value, myId, action)
    else hostLink?.send({ type: 'action', action })
  }

  /** Share this player's latest live data; it replaces what they sent before. */
  function sendLive (data) {
    if (role.value === 'host') {
      liveData.set(myId, data)
      liveChanged = true
    } else {
      hostLink?.send({ type: 'live', data })
    }
  }

  function fail (key) {
    resetConnection()
    errorKey.value = key
    screen.value = 'home'
  }

  function resetConnection () {
    attempt++
    clearTimeout(connectTimer)
    clearTimeout(directTimer)
    clearInterval(relayTimer)
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
    oldLink?.close()
    oldPeer?.destroy()
    oldRelays.forEach(relay => relay.close())
    state.value = null
    remote.value = null
  }

  function leave () {
    resetConnection()
    role.value = null
    screen.value = 'home'
  }

  // Coming back to the app: reconnect the host to the broker right away
  function onVisible () {
    if (document.visibilityState === 'visible' && role.value === 'host' && peer) reconnectHost(peer)
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisible)
    tickTimer = setInterval(() => {
      now.value = Date.now()
      if (role.value !== 'host' || !state.value) return
      guests.forEach((guest, key) => {
        if (guest.relay && now.value - guest.lastSeen > RELAY_TIMEOUT_MS) dropGuest(key)
      })
      onTick?.(state.value, now.value)
    }, TICK_MS)
    liveTimer = setInterval(flushLive, LIVE_MS)
    if (joinCode.value.length === 4 && playerName.value) joinRoom()
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisible)
    clearInterval(tickTimer)
    clearInterval(liveTimer)
    resetConnection()
  })

  return reactive({
    screen, role, isHost, roomCode, errorKey, playerName, joinCode, now, myId,
    view, me, shareLink,
    createRoom, joinRoom, leave, act, sendLive
  })
}
