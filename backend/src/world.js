// The world: who is signed in, which room they're in, what they say, own and earn.
//
// Clients report where they walk and what they do; the server passes that on to the others
// in the room ten times a second. Coins, the shop, homes and friendships are the server's
// alone: a client can ask to buy or place something, and the server decides.
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { ITEMS, ITEM, STARTER, DEFAULT_LAYOUT, owns } from './catalog.js'
import { cleanText, isClean, createBucket } from './filter.js'

const scrypt = promisify(scryptCallback)

export const PLAZA_SIZE = 30 // players per plaza; more open another copy of it
export const HOME_CELLS = 8 // a home is 8×8 floor cells
const HOME_VISITORS = 12
const SNAPSHOT_MS = 100
const START_COINS = 300
const DAILY = { coins: 100, xp: 50 }
const PER_MINUTE = { coins: 5, xp: 10 } // for each active minute in a room
const ACTIVE_MS = 5 * 60 * 1000 // idle longer than this and the minutes stop paying
const PLAZA_EDGE = 19 // the plaza runs from -19 to 19 on both axes
const NAME = /^[\p{L}\p{N}_.-]{3,16}$/u
const MAX_LAYOUT = 80

const AVATAR = { skin: 8, face: 3, eyes: 5, eyeColor: 6, brows: 4, hair: 8, hairColor: 10 }
const SLOTS = ['top', 'bottom', 'shoes', 'acc']
// States a client can report: 0 idle, 1 walk, then the emotes
const STATES = 6

/** Level from experience: level L takes 50·L·(L−1) XP (100 for level 2, 300 for 3, 600 for 4…). */
export const levelOf = (xp) => Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2)

const round2 = (n) => Math.round(n * 100) / 100
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

async function hashPassword (pass) {
  const salt = randomBytes(16)
  const hash = await scrypt(pass, salt, 32)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

async function checkPassword (pass, stored) {
  const [salt, hash] = String(stored).split(':')
  if (!salt || !hash) return false
  const expected = Buffer.from(hash, 'hex')
  const actual = await scrypt(pass, Buffer.from(salt, 'hex'), expected.length)
  return timingSafeEqual(expected, actual)
}

// An avatar as the creator sends it, checked: every choice in range, clothes the player owns.
// Top, bottom and shoes are always worn; the accessory is optional.
export function cleanAvatar (raw, inventory) {
  if (!raw || typeof raw !== 'object') return null
  const avatar = { body: raw.body === 'f' ? 'f' : 'm' }
  for (const [key, count] of Object.entries(AVATAR)) {
    const n = Number(raw[key])
    if (!Number.isInteger(n) || n < 0 || n >= count) return null
    avatar[key] = n
  }
  for (const slot of SLOTS) {
    const id = raw[slot]
    if ((id === null || id === undefined || id === '') && slot === 'acc') {
      avatar[slot] = null
      continue
    }
    const item = ITEM[id]
    if (!item || item.kind !== slot || !owns(item, inventory)) return null
    avatar[slot] = id
  }
  return avatar
}

// A home layout, checked: furniture the owner has enough of, inside the room, and nothing but
// rugs sharing a floor cell
export function cleanLayout (raw, inventory) {
  if (!Array.isArray(raw) || raw.length > MAX_LAYOUT) return null
  const used = {}
  const taken = new Set()
  const layout = []
  for (const placed of raw) {
    const item = ITEM[placed?.i]
    const { x, z, r } = placed || {}
    if (!item || item.kind !== 'furniture' || ![x, z, r].every(Number.isInteger) || r < 0 || r > 3) return null
    const [w, d] = r % 2 ? [item.size[1], item.size[0]] : item.size
    if (x < 0 || z < 0 || x + w > HOME_CELLS || z + d > HOME_CELLS) return null
    used[item.id] = (used[item.id] || 0) + 1
    if (used[item.id] > (inventory[item.id] || 0)) return null
    if (!item.floor) {
      for (let cx = x; cx < x + w; cx++) {
        for (let cz = z; cz < z + d; cz++) {
          const cell = cx * HOME_CELLS + cz
          if (taken.has(cell)) return null
          taken.add(cell)
        }
      }
    }
    layout.push({ i: item.id, x, z, r })
  }
  return layout
}

class Player {
  constructor (ws, ip) {
    this.ws = ws
    this.ip = ip
    this.user = null
    this.room = null
    this.x = 0
    this.z = 0
    this.ry = 0
    this.st = 0
    this.lastMove = 0
    this.active = Date.now()
    this.chatBucket = createBucket(5, 1500)
    this.authBucket = createBucket(6, 10000)
  }

  send (message) {
    this.ws.send(typeof message === 'string' ? message : JSON.stringify(message))
  }
}

/**
 * @param {object} db  From openDatabase()
 * @param {object} [options]
 * @param {number} [options.rewardMs]  How often active players earn (a minute; tests use less)
 * @param {() => string} [options.today]  Today's date as YYYY-MM-DD, for the daily bonus
 */
export function createWorld (db, { rewardMs = 60000, today = () => new Date().toISOString().slice(0, 10) } = {}) {
  const players = new Set()
  const online = new Map() // user id -> Player
  const rooms = new Map() // room id -> { id, kind, ownerId, ownerName, members: Map, layout, bounds, dirty }

  // ---------- Rooms ----------

  function plazaWithSpace () {
    for (let n = 1; ; n++) {
      const id = `plaza-${n}`
      if (!rooms.has(id)) rooms.set(id, { id, kind: 'plaza', members: new Map(), bounds: [-PLAZA_EDGE, PLAZA_EDGE], dirty: false })
      const room = rooms.get(id)
      if (room.members.size < PLAZA_SIZE) return room
    }
  }

  function homeOf (owner) {
    const id = `home-${owner.id}`
    if (!rooms.has(id)) {
      rooms.set(id, { id, kind: 'home', ownerId: owner.id, ownerName: owner.name, members: new Map(), layout: db.layout(owner.id), bounds: [0.3, HOME_CELLS - 0.3], dirty: false })
    }
    return rooms.get(id)
  }

  const publicOf = (p) => ({ id: p.user.id, name: p.user.name, level: levelOf(p.user.xp), avatar: p.user.avatar, x: round2(p.x), z: round2(p.z), ry: round2(p.ry), st: p.st })

  function broadcast (room, message, except = null) {
    const text = JSON.stringify(message)
    for (const member of room.members.values()) if (member !== except) member.send(text)
  }

  function leaveRoom (p) {
    const room = p.room
    if (!room) return
    room.members.delete(p.user.id)
    p.room = null
    broadcast(room, { t: 'exit', id: p.user.id })
    // Empty homes and extra plazas close; the first plaza always stays
    if (!room.members.size && room.id !== 'plaza-1') rooms.delete(room.id)
  }

  function join (p, msg) {
    if (!p.user.avatar) return { ok: false, err: 'avatar' }
    let room
    if (msg.room === 'plaza') {
      if (p.room?.kind === 'plaza') return { ok: false, err: 'here' }
      room = plazaWithSpace()
    } else if (msg.room === 'home') {
      const ownerId = msg.owner === undefined ? p.user.id : Number(msg.owner)
      const owner = Number.isInteger(ownerId) ? db.userById(ownerId) : null
      if (!owner) return { ok: false, err: 'bad' }
      if (owner.id !== p.user.id && db.friendStatus(p.user.id, owner.id) !== 'friend') return { ok: false, err: 'notFriend' }
      room = homeOf(owner)
      if (room.members.size >= HOME_VISITORS && !room.members.has(p.user.id)) return { ok: false, err: 'full' }
    } else {
      return { ok: false, err: 'bad' }
    }
    leaveRoom(p)
    // Plaza visitors arrive in front of the fountain, guests by the door of a home
    const angle = Math.random() * Math.PI * 2
    if (room.kind === 'plaza') Object.assign(p, { x: Math.sin(angle) * 6, z: 7 + Math.cos(angle) * 2, ry: Math.PI })
    else Object.assign(p, { x: HOME_CELLS / 2 + (Math.random() - 0.5), z: HOME_CELLS - 1, ry: Math.PI })
    p.st = 0
    room.members.set(p.user.id, p)
    p.room = room
    room.dirty = true
    broadcast(room, { t: 'enter', player: publicOf(p) }, p)
    return {
      ok: true,
      room: { id: room.id, kind: room.kind, owner: room.ownerId ?? null, ownerName: room.ownerName ?? null, layout: room.layout ?? null },
      players: [...room.members.values()].map(publicOf)
    }
  }

  // Positions go out together, ten times a second, and only from rooms where something moved
  function snapshots () {
    for (const room of rooms.values()) {
      if (!room.dirty || !room.members.size) continue
      room.dirty = false
      const list = [...room.members.values()].map(m => [m.user.id, round2(m.x), round2(m.z), round2(m.ry), m.st])
      broadcast(room, { t: 'snap', p: list })
    }
  }

  function move (p, msg) {
    if (!p.room) return
    const now = Date.now()
    if (now - p.lastMove < 45) return // at most about 20 updates a second
    p.lastMove = now
    const x = Number(msg.x)
    const z = Number(msg.z)
    const ry = Number(msg.ry)
    const st = Number(msg.st)
    if (![x, z, ry].every(Number.isFinite) || !Number.isInteger(st) || st < 0 || st >= STATES) return
    const [lo, hi] = p.room.bounds
    const nx = clamp(x, lo, hi)
    const nz = clamp(z, lo, hi)
    if (nx !== p.x || nz !== p.z || st !== p.st) p.active = now
    p.x = nx
    p.z = nz
    p.ry = ry
    p.st = st
    p.room.dirty = true
  }

  // ---------- Accounts ----------

  function meOf (p) {
    const u = p.user
    return { id: u.id, name: u.name, coins: u.coins, xp: u.xp, level: levelOf(u.xp), avatar: u.avatar, inventory: db.inventory(u.id), friends: friendList(u.id) }
  }

  async function auth (p, msg) {
    if (!p.authBucket.take()) return { ok: false, err: 'slow' }
    let user
    let token = null
    if (msg.t === 'resume') {
      token = String(msg.token || '')
      user = token && db.userByToken(token)
      if (!user) return { ok: false, err: 'session' }
    } else {
      const name = String(msg.name || '').trim()
      const pass = String(msg.pass || '')
      if (msg.t === 'register') {
        if (!NAME.test(name) || !isClean(name)) return { ok: false, err: 'badName' }
        if (pass.length < 6 || pass.length > 72) return { ok: false, err: 'badPass' }
        if (db.userByName(name)) return { ok: false, err: 'nameTaken' }
        const hash = await hashPassword(pass)
        if (db.userByName(name)) return { ok: false, err: 'nameTaken' }
        user = db.createUser(name, hash, START_COINS, STARTER, DEFAULT_LAYOUT)
      } else {
        const found = db.userByName(name)
        if (!found || !(await checkPassword(pass, found.pass))) return { ok: false, err: 'wrongLogin' }
        user = found
      }
    }
    if (!p.ws.open) return { ok: false, err: 'gone' }
    // One connection per account: signing in somewhere else signs the older one out
    const older = online.get(user.id)
    if (older && older !== p) {
      older.send({ t: 'kicked' })
      signOut(older)
      older.ws.close()
    }
    p.user = user
    online.set(user.id, p)
    token ??= db.createSession(user.id)
    // The first sign-in of the day pays the daily bonus
    let bonus = null
    const day = today()
    if (user.last_daily !== day) {
      p.user = db.grant(user.id, DAILY.coins, DAILY.xp, day)
      bonus = { ...DAILY }
    }
    pushFriendsOf(user.id)
    return { ok: true, token, me: meOf(p), bonus, catalog: ITEMS }
  }

  function signOut (p) {
    if (!p.user) return
    leaveRoom(p)
    const id = p.user.id
    if (online.get(id) === p) online.delete(id)
    p.user = null
    pushFriendsOf(id)
  }

  // ---------- Friends ----------

  const friendList = (id) => db.friends(id).map(f => ({ id: f.id, name: f.name, level: levelOf(f.xp), status: f.status, online: online.has(f.id), avatar: f.avatar }))

  function pushFriends (id) {
    online.get(id)?.send({ t: 'friends', friends: friendList(id) })
  }

  // Everyone who has this player on their list hears about it (online, offline, new request)
  function pushFriendsOf (id) {
    for (const f of db.friends(id)) pushFriends(f.id)
  }

  function notice (id, kind, from) {
    online.get(id)?.send({ t: 'notice', kind, from: from.id, name: from.name })
  }

  // ---------- Earning ----------

  function reward () {
    const now = Date.now()
    for (const p of online.values()) {
      if (!p.room || now - p.active > ACTIVE_MS) continue
      const before = levelOf(p.user.xp)
      p.user = db.grant(p.user.id, PER_MINUTE.coins, PER_MINUTE.xp)
      const level = levelOf(p.user.xp)
      p.send({ t: 'wallet', coins: p.user.coins, xp: p.user.xp, level, gain: PER_MINUTE.coins, levelUp: level > before })
      if (level > before) broadcast(p.room, { t: 'level', id: p.user.id, level })
    }
  }

  // ---------- Messages ----------

  async function handle (p, text) {
    let msg
    try {
      msg = JSON.parse(text)
    } catch {
      return
    }
    if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') return
    const reply = (data) => {
      if (msg.id !== undefined) p.send({ t: 'res', id: msg.id, ...data })
    }
    try {
      if (msg.t === 'ping') return reply({ ok: true })
      if (!p.user) {
        if (['register', 'login', 'resume'].includes(msg.t)) return reply(await auth(p, msg))
        return reply({ ok: false, err: 'auth' })
      }
      const me = p.user.id
      switch (msg.t) {
        case 'move':
          return move(p, msg)
        case 'chat': {
          if (!p.room) return
          const line = cleanText(msg.text)
          if (!line) return
          if (!p.chatBucket.take()) return p.send({ t: 'notice', kind: 'slow' })
          p.active = Date.now()
          return broadcast(p.room, { t: 'say', id: me, text: line })
        }
        case 'join':
          return reply(join(p, msg))
        case 'leave':
          leaveRoom(p)
          return reply({ ok: true })
        case 'avatar': {
          const avatar = cleanAvatar(msg.avatar, db.inventory(me))
          if (!avatar) return reply({ ok: false, err: 'bad' })
          db.setAvatar(me, avatar)
          p.user.avatar = avatar
          if (p.room) broadcast(p.room, { t: 'look', id: me, avatar }, p)
          return reply({ ok: true, avatar })
        }
        case 'buy': {
          const item = ITEM[msg.item]
          if (!item || item.price <= 0) return reply({ ok: false, err: 'bad' })
          // Clothes are bought once; furniture as many times as you like
          if (item.kind !== 'furniture' && (db.inventory(me)[item.id] || 0) > 0) return reply({ ok: false, err: 'owned' })
          const coins = db.buy(me, item.id, item.price)
          if (coins === null) return reply({ ok: false, err: 'coins' })
          p.user.coins = coins
          p.active = Date.now()
          return reply({ ok: true, coins, inventory: db.inventory(me) })
        }
        case 'layout': {
          const layout = cleanLayout(msg.items, db.inventory(me))
          if (!layout) return reply({ ok: false, err: 'bad' })
          db.setLayout(me, layout)
          const room = rooms.get(`home-${me}`)
          if (room) {
            room.layout = layout
            broadcast(room, { t: 'layout', items: layout }, p)
          }
          return reply({ ok: true })
        }
        case 'friends':
          return reply({ ok: true, friends: friendList(me) })
        case 'profile': {
          const user = db.userById(Number(msg.user))
          if (!user) return reply({ ok: false, err: 'bad' })
          return reply({ ok: true, profile: { id: user.id, name: user.name, level: levelOf(user.xp), avatar: user.avatar, online: online.has(user.id), status: user.id === me ? 'me' : db.friendStatus(me, user.id) || 'none' } })
        }
        case 'friendAdd': {
          const other = db.userById(Number(msg.user))
          if (!other || other.id === me) return reply({ ok: false, err: 'bad' })
          const status = db.friendStatus(me, other.id)
          if (status === 'incoming') {
            db.acceptFriend(me, other.id)
            notice(other.id, 'accepted', p.user)
          } else if (!status) {
            db.requestFriend(me, other.id)
            notice(other.id, 'request', p.user)
          }
          pushFriends(me)
          pushFriends(other.id)
          return reply({ ok: true, status: db.friendStatus(me, other.id) })
        }
        case 'friendRemove': {
          const other = Number(msg.user)
          db.removeFriend(me, other)
          pushFriends(me)
          pushFriends(other)
          return reply({ ok: true })
        }
        case 'invite': {
          const other = Number(msg.user)
          if (db.friendStatus(me, other) !== 'friend' || !online.has(other)) return reply({ ok: false, err: 'bad' })
          notice(other, 'invite', p.user)
          return reply({ ok: true })
        }
        case 'logout':
          if (msg.token) db.deleteSession(String(msg.token))
          signOut(p)
          return reply({ ok: true })
        case 'register':
        case 'login':
        case 'resume':
          return reply({ ok: false, err: 'signedIn' })
        default:
          return reply({ ok: false, err: 'bad' })
      }
    } catch (err) {
      console.error('world:', err)
      reply({ ok: false, err: 'server' })
    }
  }

  // ---------- Connections ----------

  function connect (ws, ip = '') {
    const p = new Player(ws, ip)
    players.add(p)
    ws.onmessage = (text) => handle(p, text)
    ws.onclose = () => {
      players.delete(p)
      signOut(p)
    }
  }

  const timers = [
    setInterval(snapshots, SNAPSHOT_MS),
    setInterval(reward, rewardMs),
    // Pings keep proxies from closing quiet connections, and find ones that died silently
    setInterval(() => {
      const now = Date.now()
      for (const p of players) {
        if (now - p.ws.lastSeen > 60000) p.ws.close(1001)
        else p.ws.ping()
      }
    }, 20000)
  ]

  return {
    connect,
    stats: () => ({ connections: players.size, online: online.size, rooms: [...rooms.values()].map(r => ({ id: r.id, players: r.members.size })) }),
    close () {
      timers.forEach(clearInterval)
      for (const p of players) p.ws.close(1001)
    }
  }
}
