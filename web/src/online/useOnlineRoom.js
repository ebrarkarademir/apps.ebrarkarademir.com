import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import Peer from 'peerjs'

// Peer-to-peer rooms shared by every online game.
//
// One device hosts: it owns the full game state, applies every player's actions and pushes
// each guest a snapshot of what that guest may see (`project`). Guests only render what they
// receive and send actions back. No server of our own is involved; PeerJS's public broker
// just introduces the devices to each other.
//
// A top-level `deadline` (host clock, ms) is sent as time remaining and turned back into a
// deadline on the guest's clock, so timers line up even when device clocks disagree.

const PEER_PREFIX = 'ebrarkarademir-'
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CONNECT_TIMEOUT_MS = 12000
const TICK_MS = 250
const NAME_KEY = 'onlineName'
const CLIENT_KEY = 'onlineClientId'

const randomCode = () =>
  Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')

export const cleanName = (name) => String(name || '').trim().slice(0, 18)

// Stable per-tab id, so a player who drops out (phone locked, page reloaded) rejoins as themselves
const getClientId = () => {
  try {
    let id = sessionStorage.getItem(CLIENT_KEY)
    if (!id) {
      id = Math.random().toString(36).slice(2, 12)
      sessionStorage.setItem(CLIENT_KEY, id)
    }
    return id
  } catch {
    return Math.random().toString(36).slice(2, 12)
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
 * @param {string} [options.initialCode] Room code from an invite link; joins straight away.
 */
export function useOnlineRoom (options) {
  const { game, initialState, project = (state) => state, onAction, onJoin, onLeave, onTick } = options

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

  let peer = null
  let hostConn = null
  let connectTimer = null
  let tickTimer = null
  const guests = new Map() // peer id -> { conn, playerId }

  const freshState = () => ({ phase: 'lobby', hostId: myId, players: [], ...initialState() })

  const view = computed(() => {
    if (role.value === 'host') return state.value ? project(state.value, myId) : null
    return remote.value
  })
  const me = computed(() => view.value?.players.find(p => p.id === myId) || null)
  const isHost = computed(() => role.value === 'host')
  const shareLink = computed(() => `${window.location.origin}/?join=${roomCode.value}&game=${game}`)

  const peerId = (code) => `${PEER_PREFIX}${game}-${code}`

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
    const hostPeer = new Peer(peerId(code))
    peer = hostPeer
    hostPeer.on('open', () => {
      roomCode.value = code
      state.value = freshState()
      addPlayer(myId, playerName.value)
      screen.value = 'room'
    })
    hostPeer.on('connection', (conn) => {
      conn.on('data', (msg) => handleGuestMessage(conn, msg))
      conn.on('close', () => dropGuest(conn.peer))
      conn.on('error', () => dropGuest(conn.peer))
    })
    hostPeer.on('error', (err) => {
      if (peer !== hostPeer) return
      if (err.type === 'unavailable-id') {
        hostPeer.destroy()
        openHostPeer(randomCode())
      } else if (screen.value === 'connecting') {
        fail('onlineErrConnection')
      }
    })
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

  function handleGuestMessage (conn, msg) {
    if (!state.value || typeof msg !== 'object' || !msg) return
    if (msg.type === 'join' && typeof msg.clientId === 'string') {
      // The same tab reconnecting replaces its old connection
      guests.forEach((guest, key) => {
        if (guest.playerId === msg.clientId && key !== conn.peer) guests.delete(key)
      })
      guests.set(conn.peer, { conn, playerId: msg.clientId })
      addPlayer(msg.clientId, msg.name)
      sendTo(guests.get(conn.peer))
    } else if (msg.type === 'action') {
      const guest = guests.get(conn.peer)
      if (guest) onAction(state.value, guest.playerId, msg.action || {})
    }
  }

  function dropGuest (peerKey) {
    const guest = guests.get(peerKey)
    if (!guest || !state.value) return
    guests.delete(peerKey)
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
    if (guest?.conn.open && state.value) {
      guest.conn.send({ type: 'state', state: serialize(project(state.value, guest.playerId)) })
    }
  }

  // Any change to the host's state reaches every guest on the next tick
  watch(state, () => guests.forEach(sendTo), { deep: true })

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
    connectTimer = setTimeout(() => fail('onlineErrConnection'), CONNECT_TIMEOUT_MS)

    const guestPeer = new Peer()
    peer = guestPeer
    guestPeer.on('open', () => {
      const conn = guestPeer.connect(peerId(code), { reliable: true })
      hostConn = conn
      conn.on('open', () => conn.send({ type: 'join', name: playerName.value, clientId: myId }))
      conn.on('data', (msg) => {
        if (hostConn !== conn || msg?.type !== 'state') return
        clearTimeout(connectTimer)
        const next = msg.state
        if (typeof next.msLeft === 'number') {
          next.deadline = Date.now() + next.msLeft
          delete next.msLeft
        }
        remote.value = next
        screen.value = 'room'
      })
      // Events from a connection we already left are ignored
      conn.on('close', () => {
        if (hostConn === conn) fail('onlineErrDisconnected')
      })
    })
    guestPeer.on('error', (err) => {
      if (peer !== guestPeer) return
      if (err.type === 'peer-unavailable') fail('onlineErrNotFound')
      // Once in the room, the data connection survives broker hiccups
      else if (screen.value === 'connecting') fail('onlineErrConnection')
    })
  }

  // ---------- Shared ----------

  /** Send an action to the host (or apply it directly when this device is the host). */
  function act (type, payload = {}) {
    const action = { type, ...payload }
    if (role.value === 'host') onAction(state.value, myId, action)
    else if (hostConn?.open) hostConn.send({ type: 'action', action })
  }

  function fail (key) {
    resetConnection()
    errorKey.value = key
    screen.value = 'home'
  }

  function resetConnection () {
    clearTimeout(connectTimer)
    guests.clear()
    const oldConn = hostConn
    const oldPeer = peer
    hostConn = null
    peer = null
    oldConn?.close()
    oldPeer?.destroy()
    state.value = null
    remote.value = null
  }

  function leave () {
    resetConnection()
    role.value = null
    screen.value = 'home'
  }

  onMounted(() => {
    tickTimer = setInterval(() => {
      now.value = Date.now()
      if (role.value === 'host' && state.value) onTick?.(state.value, now.value)
    }, TICK_MS)
    if (joinCode.value.length === 4 && playerName.value) joinRoom()
  })

  onUnmounted(() => {
    clearInterval(tickTimer)
    resetConnection()
  })

  return reactive({
    screen, role, isHost, roomCode, errorKey, playerName, joinCode, now, myId,
    view, me, shareLink,
    createRoom, joinRoom, leave, act
  })
}
