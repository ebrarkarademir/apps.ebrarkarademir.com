import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { RELAY_BROKERS, connectRelay, relayTopic } from './relay'
import { canEncrypt, makeKeys, sharedKey, seal, unseal } from './chatCrypto'
import { setUid, cleanName, cleanBio, MEDAL_IDS } from './profile'
import { SESSION_MS } from './session'

// Everyone who has the site open right now, and private chats between them.
//
// Each tab connects to the public MQTT brokers the online games relay through and says hello on
// a shared topic; everyone already there answers in the newcomer's inbox, so every tab builds
// the same list. Leaving is announced twice over: the tab says goodbye as the page goes away,
// and if its connection just drops (lost network, laptop lid shut) the broker publishes the
// will the tab left with it. Nothing is retained on the brokers.
//
// Tabs join every broker they can reach and the lists are merged: someone counts as here while
// they're on at least one broker we share.
//
// What a tab tells the others (its "card") is its profile, not its address: name, user number,
// ASCII face, a few words, nationality and medals, plus what it's doing right now and the
// lobby it's in. Whenever that changes, the tab tells everyone again. The lobbies everyone is
// in make the Lobby page's list.
//
// User numbers count up across the site: a retained message on each broker holds the last one
// handed out, and a newcomer takes the next (see profile.js).
//
// Chats are end-to-end encrypted (see chatCrypto.js) and only kept in the two tabs' memory.
// When someone leaves, the chat with them is deleted, and a tab that loses its own connection
// loses everyone and so deletes all of its chats, just as everyone else deletes theirs with it.
// A chat message is text, an invite to an online game room, a request to join someone's
// lobby, or the answer "not now" to one.

const KEEPALIVE_S = 60 // background tabs may only run timers once a minute, and pings must keep up
const RECONNECT_MS = 3000
const UNREACHABLE_MS = 10000 // retry delay for a broker that couldn't be reached at all
const MAX_PEOPLE = 200
const MAX_MESSAGES = 200 // per chat; older ones are dropped
export const MAX_TEXT = 500

const ID = /^[0-9a-z]{14}$/
const PUBLIC_KEY = /^[A-Za-z0-9+/]{87}=$/ // a raw P-256 public key: 65 bytes
const ROOM_CODE = /^[A-Z0-9]{4}$/
const COUNTRY = /^[A-Z]{2}$/
const PAGE = /^[a-z-]{1,20}$/
const MAX_UID = 1e7
const CLAIM_MS = 1500 // how long a newcomer listens for the counter and the others before taking a number
const STATUS_MS = 400 // changes to the card go out together

const randomId = () => Array.from(crypto.getRandomValues(new Uint32Array(2)), n => n.toString(36).padStart(7, '0')).join('')

/**
 * @param {object} options
 * @param {import('vue').Ref<object>} options.status  What this tab tells the others:
 *   { name, uid, av, bio, cc, md, act, room } (see readCard); room.ends is a time on this device.
 * @param {string} options.space  Keeps the live site's list apart from the dev sites'.
 * @param {string[]} [options.games]  Ids of the online games someone can be invited to.
 * @param {(person: object, message: object) => void} [options.onMessage]
 *   Someone sent this tab a chat message: { text }, { invite: { game, code } },
 *   { request: { game, code } } or { reply: { ok: false } }, each with its id.
 */
export function useUsers ({ status, space, games = [], onMessage }) {
  const myId = randomId()
  const arrived = Date.now()

  const people = reactive(new Map()) // everyone else, by id -> { id, key, since, ...their card }
  // By the other person's id -> { messages: [{ id, mine, at, text } or { id, mine, at, invite: { game, code } }], unread }
  const chats = reactive(new Map())
  const active = ref(null) // whose chat is on screen; what they send doesn't count as unread
  const online = ref(false) // connected to at least one broker
  const canChat = ref(false) // this tab has its keys

  const relays = new Map() // broker url -> relay
  const seenOn = new Map() // person id -> urls of the brokers they're on
  const chatKeys = new Map() // person id -> promise of the key we share
  const retryTimers = new Map() // broker url -> timer
  let keysMade = null
  let keys = null
  let running = false
  let attempt = 0 // bumped by stop(), so connections still opening from before are dropped

  const topic = (...parts) => relayTopic('users', space, ...parts)
  const hereTopic = (id) => topic('here', id)
  const inboxTopic = (id) => topic('inbox', id)
  const counterTopic = topic('counter')

  const me = computed(() => ({ id: myId, since: arrived, self: true, key: canChat.value ? 'self' : '', ...status.value }))
  // You first, then everyone else in the order they arrived
  const list = computed(() => [me.value, ...[...people.values()].sort((a, b) => a.since - b.since)])
  const unread = computed(() => [...chats.values()].reduce((sum, chat) => sum + chat.unread, 0))
  // Every open lobby, from its host's card
  const lobbies = computed(() => list.value
    .filter(person => person.room?.host && person.room.ends > Date.now() - 1000)
    .map(person => ({ ...person.room, hostId: person.id, hostName: person.name, hostAv: person.av })))

  // What this tab tells the others about itself; `up` is how long it has been here, and the
  // lobby's end goes as the time it has left, since clocks differ
  const card = () => {
    const { room, ...rest } = status.value
    const wireRoom = room ? { ...room, ends: undefined, left: Math.max(0, Math.round(room.ends - Date.now())) } : null
    return { id: myId, key: keys?.publicKey || '', up: Date.now() - arrived, ...rest, room: wireRoom }
  }

  // ---------- Who's here ----------

  async function join (url, myAttempt) {
    retryTimers.delete(url)
    if (attempt !== myAttempt || relays.has(url)) return
    let relay
    try {
      relay = await connectRelay(url, {
        keepAlive: KEEPALIVE_S,
        will: { topic: hereTopic(myId), message: { type: 'gone', id: myId } },
        onMessage: (name, msg) => receive(url, name, msg),
        onClose: () => {
          if (relays.get(url) !== relay) return
          relays.delete(url)
          forgetBroker(url)
          retry(url, RECONNECT_MS, myAttempt)
        }
      })
    } catch {
      retry(url, UNREACHABLE_MS, myAttempt)
      return
    }
    if (attempt !== myAttempt || relays.has(url)) {
      relay.close()
      return
    }
    relays.set(url, relay)
    online.value = true
    await relay.subscribe(counterTopic)
    await relay.subscribe(hereTopic('+'))
    await relay.subscribe(inboxTopic(myId))
    relay.publish(hereTopic(myId), { type: 'hello', ...card() })
    planClaim()
  }

  function retry (url, ms, myAttempt) {
    if (attempt === myAttempt && !retryTimers.has(url)) retryTimers.set(url, setTimeout(() => join(url, myAttempt), ms))
  }

  function receive (url, name, msg) {
    if (!msg || typeof msg !== 'object') return
    if (name === counterTopic) {
      readCounter(url, msg)
      return
    }
    const inInbox = name === inboxTopic(myId)
    if (msg.type === 'msg') {
      if (inInbox) readMessage(msg)
      return
    }
    // On the shared topic, people only speak for themselves
    if (!ID.test(msg.id) || msg.id === myId || (!inInbox && name !== hereTopic(msg.id))) return
    if (msg.type === 'gone') {
      lose(msg.id, url)
    } else if (msg.type === 'hello' || msg.type === 'here') {
      const person = readCard(msg)
      if (!person) return
      // A newcomer hears from everyone already here, in its inbox
      if (msg.type === 'hello') relays.get(url)?.publish(inboxTopic(person.id), { type: 'here', ...card() })
      see(person, url)
    }
  }

  function readRoom (room) {
    if (!room || typeof room !== 'object' || !ROOM_CODE.test(room.code) || !games.includes(room.game)) return null
    const left = Number(room.left)
    return {
      code: room.code,
      game: room.game,
      host: room.host === true,
      phase: typeof room.phase === 'string' ? room.phase.slice(0, 16) : '',
      ends: Date.now() + (Number.isFinite(left) ? Math.max(0, Math.min(SESSION_MS, left)) : 0),
      players: (Array.isArray(room.players) ? room.players.slice(0, 16) : [])
        .map(player => ({ name: cleanName(player?.name), av: Number.isInteger(player?.av) ? player.av : 0, host: player?.host === true }))
        .filter(player => player.name)
    }
  }

  // Only what a card may hold, cut to size
  function readCard (msg) {
    if ((msg.key !== '' && !PUBLIC_KEY.test(msg.key)) || !Number.isFinite(msg.up) || msg.up < 0) return null
    return {
      id: msg.id,
      key: msg.key,
      since: Date.now() - msg.up,
      name: cleanName(msg.name),
      uid: Number.isInteger(msg.uid) && msg.uid > 0 && msg.uid < MAX_UID ? msg.uid : 0,
      av: Number.isInteger(msg.av) ? msg.av : 0,
      bio: cleanBio(msg.bio),
      cc: COUNTRY.test(msg.cc || '') ? msg.cc : '',
      md: Array.isArray(msg.md) ? MEDAL_IDS.filter(id => msg.md.includes(id)) : [],
      act: PAGE.test(msg.act || '') ? msg.act : '',
      room: readRoom(msg.room)
    }
  }

  function see (person, url) {
    const known = people.get(person.id)
    // The key someone arrived with stays theirs: a card with another key is somebody else on
    // the public broker trying to step into their chats
    if (known && known.key !== person.key) return
    if (!known && people.size >= MAX_PEOPLE) return
    if (!seenOn.has(person.id)) seenOn.set(person.id, new Set())
    seenOn.get(person.id).add(url)
    if (!known) {
      people.set(person.id, person)
      return
    }
    // The same card again through the other broker changes nothing
    const { since, ...fields } = person
    for (const [field, value] of Object.entries(fields)) {
      if (JSON.stringify(known[field]) !== JSON.stringify(value)) known[field] = value
    }
  }

  function lose (id, url) {
    const where = seenOn.get(id)
    if (!where || !where.delete(url) || where.size) return
    seenOn.delete(id)
    people.delete(id)
    chatKeys.delete(id)
    chats.delete(id) // the chat goes with them
  }

  function forgetBroker (url) {
    online.value = relays.size > 0
    for (const id of [...seenOn.keys()]) lose(id, url)
  }

  // A new name, face, page or lobby: tell everyone, a moment later so changes go out together.
  // The time a lobby has left isn't a change; it goes out with whatever changes next.
  let statusTimer = null
  watch(() => JSON.stringify(status.value), () => {
    clearTimeout(statusTimer)
    statusTimer = setTimeout(() => relays.forEach(relay => relay.publish(hereTopic(myId), { type: 'here', ...card() })), STATUS_MS)
  })

  // ---------- User numbers ----------

  let counterSeen = 0 // the highest number handed out, as far as the brokers know
  let claimTimer = null

  function readCounter (url, msg) {
    const n = Number(msg.n)
    if (!Number.isInteger(n) || n < 1 || n >= MAX_UID) return
    counterSeen = Math.max(counterSeen, n)
    // A broker that lost count learns it back from whoever has a higher number
    const mine = status.value.uid
    if (mine > n) relays.get(url)?.publish(counterTopic, { n: mine }, { retain: true })
  }

  // A newcomer listens a moment for the counter and the people already here, then takes the next number
  function planClaim () {
    if (status.value.uid || claimTimer) return
    claimTimer = setTimeout(() => {
      claimTimer = null
      if (status.value.uid) return
      const highest = Math.max(counterSeen, ...[...people.values()].map(person => person.uid || 0))
      const n = highest + 1
      setUid(n)
      relays.forEach(relay => relay.publish(counterTopic, { n }, { retain: true }))
    }, CLAIM_MS)
  }

  // ---------- Chat ----------

  const canChatWith = (person) => canChat.value && !!person?.key

  const keyFor = (person) => {
    if (!chatKeys.has(person.id)) chatKeys.set(person.id, sharedKey(keys.privateKey, person.key))
    return chatKeys.get(person.id)
  }

  function addMessage (id, message) {
    if (!chats.has(id)) chats.set(id, { messages: [], unread: 0 })
    const chat = chats.get(id)
    chat.messages.push(message)
    if (chat.messages.length > MAX_MESSAGES) chat.messages.shift()
    return chat
  }

  // An invite names one of the online games and a room code; so does a request to join one
  const readInvite = (invite) =>
    invite && games.includes(invite.game) && ROOM_CODE.test(invite.code) ? { game: invite.game, code: invite.code } : null

  // Encrypts { text }, { invite }, { request } or { reply } and sends it through every broker
  async function deliver (id, content) {
    const person = people.get(id)
    if (!canChatWith(person)) return false
    const message = { id: randomId(), mine: true, at: Date.now(), ...content }
    let sealed
    try {
      sealed = await seal(await keyFor(person), { from: myId, to: id, id: message.id, ...content })
    } catch {
      return false
    }
    if (!people.has(id)) return false // they left while it was being encrypted
    relays.forEach(relay => relay.publish(inboxTopic(id), { type: 'msg', from: myId, ...sealed }))
    addMessage(id, message)
    return true
  }

  /** Sends a chat message. Resolves false if it couldn't be sent. */
  async function send (id, rawText) {
    const text = String(rawText).trim().slice(0, MAX_TEXT)
    return text ? deliver(id, { text }) : false
  }

  /** Invites someone into an online game room. Resolves false if it couldn't be sent. */
  async function sendInvite (id, game, code) {
    const invite = readInvite({ game, code })
    return invite ? deliver(id, { invite }) : false
  }

  /** Asks someone to let this tab into the lobby they're in. Resolves false if it couldn't be sent. */
  async function sendRequest (id) {
    const request = readInvite(people.get(id)?.room)
    return request ? deliver(id, { request }) : false
  }

  /** Answers a request to join with "not now". */
  const sendDecline = (id) => deliver(id, { reply: { ok: false } })

  /** Marks a request in the chat with someone as answered, so its buttons go away. */
  function markAnswered (id, messageId) {
    const message = chats.get(id)?.messages.find(item => item.id === messageId)
    if (message) message.answered = true
  }

  async function readMessage (msg) {
    const person = people.get(msg.from)
    if (!canChatWith(person) || typeof msg.iv !== 'string' || typeof msg.data !== 'string' || msg.data.length > 8000) return
    let plain
    try {
      plain = await unseal(await keyFor(person), msg)
    } catch {
      return // changed on the way, or not sealed by who it claims to be from
    }
    // Sender and receiver are checked inside the encryption too, so nobody can bounce a
    // message back to the person who wrote it
    if (plain?.from !== msg.from || plain.to !== myId || !ID.test(plain.id)) return
    const invite = readInvite(plain.invite)
    const request = readInvite(plain.request)
    const reply = plain.reply?.ok === false ? { ok: false } : null
    const text = typeof plain.text === 'string' ? plain.text.trim().slice(0, MAX_TEXT) : ''
    const content = invite ? { invite } : request ? { request } : reply ? { reply } : { text }
    // Empty, gone in the meantime, or the same message again through the other broker
    if ((!invite && !request && !reply && !text) || !people.has(msg.from) || chats.get(msg.from)?.messages.some(m => m.id === plain.id)) return
    const chat = addMessage(msg.from, { id: plain.id, mine: false, at: Date.now(), ...content })
    if (active.value !== msg.from || document.hidden) chat.unread++
    onMessage?.(person, { ...content, id: plain.id })
  }

  function markRead () {
    const chat = chats.get(active.value)
    if (chat && !document.hidden) chat.unread = 0
  }

  watch(active, markRead)

  // ---------- Coming and going ----------

  async function start () {
    if (running) return
    running = true
    const myAttempt = attempt
    keysMade ??= canEncrypt ? makeKeys().catch(() => null) : Promise.resolve(null)
    keys = await keysMade
    canChat.value = !!keys
    if (attempt === myAttempt) RELAY_BROKERS.forEach(url => join(url, myAttempt))
  }

  // Says goodbye on every broker and forgets everyone, chats included
  function stop () {
    if (!running) return
    running = false
    attempt++
    retryTimers.forEach(timer => clearTimeout(timer))
    retryTimers.clear()
    relays.forEach(relay => {
      relay.publish(hereTopic(myId), { type: 'gone', id: myId })
      relay.close()
    })
    relays.clear()
    seenOn.clear()
    people.clear()
    chatKeys.clear()
    chats.clear()
    online.value = false
  }

  // Coming back to the page from the browser's back/forward cache says hello again
  const onPageShow = (event) => {
    if (event.persisted) start()
  }

  onMounted(() => {
    window.addEventListener('pagehide', stop)
    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('visibilitychange', markRead)
    start()
  })

  onUnmounted(() => {
    window.removeEventListener('pagehide', stop)
    window.removeEventListener('pageshow', onPageShow)
    document.removeEventListener('visibilitychange', markRead)
    stop()
  })

  return reactive({
    myId, online, canChat, list, people, chats, active, unread, lobbies,
    canChatWith, send, sendInvite, sendRequest, sendDecline, markAnswered
  })
}
