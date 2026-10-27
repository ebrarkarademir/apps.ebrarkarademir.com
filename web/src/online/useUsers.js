import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { RELAY_BROKERS, connectRelay, relayTopic } from './relay'
import { canEncrypt, makeKeys, sharedKey, seal, unseal } from './chatCrypto'
import { IPV4 } from './ipInfo'

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
// Chats are end-to-end encrypted (see chatCrypto.js) and only kept in the two tabs' memory.
// When someone leaves, the chat with them is deleted, and a tab that loses its own connection
// loses everyone and so deletes all of its chats, just as everyone else deletes theirs with it.

const KEEPALIVE_S = 60 // background tabs may only run timers once a minute, and pings must keep up
const RECONNECT_MS = 3000
const UNREACHABLE_MS = 10000 // retry delay for a broker that couldn't be reached at all
const MAX_PEOPLE = 200
const MAX_MESSAGES = 200 // per chat; older ones are dropped
export const MAX_TEXT = 500

const ID = /^[0-9a-z]{14}$/
const PUBLIC_KEY = /^[A-Za-z0-9+/]{87}=$/ // a raw P-256 public key: 65 bytes

const randomId = () => Array.from(crypto.getRandomValues(new Uint32Array(2)), n => n.toString(36).padStart(7, '0')).join('')

/**
 * @param {object} options
 * @param {import('vue').Ref<string>} options.ip  This visitor's IPv4 address; anything else counts as unknown.
 * @param {string} options.space  Keeps the live site's list apart from the dev sites'.
 * @param {(person: object, text: string) => void} [options.onMessage]  Someone sent this tab a chat message.
 */
export function useUsers ({ ip, space, onMessage }) {
  const myId = randomId()
  const arrived = Date.now()

  const people = reactive(new Map()) // everyone else, by id -> { id, ip, key, since }
  const chats = reactive(new Map()) // by the other person's id -> { messages: [{ id, mine, text, at }], unread }
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

  const myIp = computed(() => (IPV4.test(ip.value) ? ip.value : ''))
  const me = computed(() => ({ id: myId, ip: myIp.value, since: arrived, self: true }))
  // You first, then everyone else in the order they arrived
  const list = computed(() => [me.value, ...[...people.values()].sort((a, b) => a.since - b.since)])
  const unread = computed(() => [...chats.values()].reduce((sum, chat) => sum + chat.unread, 0))

  // What this tab tells the others about itself; `up` is how long it has been here
  const card = () => ({ id: myId, ip: myIp.value, key: keys?.publicKey || '', up: Date.now() - arrived })

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
    await relay.subscribe(hereTopic('+'))
    await relay.subscribe(inboxTopic(myId))
    relay.publish(hereTopic(myId), { type: 'hello', ...card() })
  }

  function retry (url, ms, myAttempt) {
    if (attempt === myAttempt && !retryTimers.has(url)) retryTimers.set(url, setTimeout(() => join(url, myAttempt), ms))
  }

  function receive (url, name, msg) {
    if (!msg || typeof msg !== 'object') return
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

  function readCard (msg) {
    const valid = (msg.ip === '' || IPV4.test(msg.ip)) && (msg.key === '' || PUBLIC_KEY.test(msg.key)) &&
      Number.isFinite(msg.up) && msg.up >= 0
    return valid ? { id: msg.id, ip: msg.ip, key: msg.key, since: Date.now() - msg.up } : null
  }

  function see (person, url) {
    const known = people.get(person.id)
    // The key someone arrived with stays theirs: a card with another key is somebody else on
    // the public broker trying to step into their chats
    if (known && known.key !== person.key) return
    if (!known && people.size >= MAX_PEOPLE) return
    if (!seenOn.has(person.id)) seenOn.set(person.id, new Set())
    seenOn.get(person.id).add(url)
    if (!known) people.set(person.id, person)
    else if (known.ip !== person.ip) known.ip = person.ip
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

  // The address is looked up after the page opens: tell everyone once it's known
  watch(myIp, () => relays.forEach(relay => relay.publish(hereTopic(myId), { type: 'here', ...card() })))

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

  /** Encrypts a message and sends it through every broker. Resolves false if it couldn't be sent. */
  async function send (id, rawText) {
    const text = String(rawText).trim().slice(0, MAX_TEXT)
    const person = people.get(id)
    if (!text || !canChatWith(person)) return false
    const message = { id: randomId(), mine: true, text, at: Date.now() }
    let sealed
    try {
      sealed = await seal(await keyFor(person), { from: myId, to: id, id: message.id, text })
    } catch {
      return false
    }
    if (!people.has(id)) return false // they left while it was being encrypted
    relays.forEach(relay => relay.publish(inboxTopic(id), { type: 'msg', from: myId, ...sealed }))
    addMessage(id, message)
    return true
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
    if (plain?.from !== msg.from || plain.to !== myId || typeof plain.text !== 'string' || !ID.test(plain.id)) return
    const text = plain.text.trim().slice(0, MAX_TEXT)
    // Gone in the meantime, or the same message again through the other broker
    if (!text || !people.has(msg.from) || chats.get(msg.from)?.messages.some(m => m.id === plain.id)) return
    const chat = addMessage(msg.from, { id: plain.id, mine: false, text, at: Date.now() })
    if (active.value !== msg.from || document.hidden) chat.unread++
    onMessage?.(person, text)
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
    myId, online, canChat, list, people, chats, active, unread,
    canChatWith, send
  })
}
