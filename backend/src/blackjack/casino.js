// The Blackjack server: players' connections, the tables and their messages. Every table runs
// here (table.js); browsers only send what a player chooses (bet, deal, hit, stand, double,
// split) and get back what they may see. The shoe's order and the dealer's face-down card never
// leave the server, and only the table logic moves chips (store.js), so a browser can't cheat.
//
// Messages are JSON with a type `t`; a message with an `id` gets an answer
// { t: 'res', id, ok, err? }. The server pushes { t: 'table', view, me } whenever a player's
// table changes, where `me` is their own chips and stats.
import { Table, RULES } from './table.js'
import { cleanText, createBucket } from '../filter.js'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const TICK_MS = 200
const MAX_TABLES = 300
const GRACE_MS = 60000 // someone whose connection dropped keeps their seat this long
const REFILL_COOLDOWN_MS = 60000
const NEW_PLAYERS_PER_HOUR = 20 // per address, so nobody can mint chips endlessly

const randomCode = () => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')

/**
 * @param {object} store  From openStore()
 * @param {object} [options]
 * @param {() => number} [options.now]
 * @param {object} [options.rules]  Table rules (tests use shorter times)
 * @param {(tableId: string) => string[]} [options.shoeFor]  A fixed shoe for a table, for tests
 * @param {number} [options.tickMs]  How often timed steps are checked
 */
export function createCasino (store, { now = () => Date.now(), rules = RULES, shoeFor = null, tickMs = TICK_MS } = {}) {
  const clients = new Set()
  const online = new Map() // player id -> client
  const tables = new Map() // table id -> { table, public, away: Map(player id -> since) }
  const codes = new Map() // code -> table id
  const newPlayers = new Map() // address -> bucket
  let nextTable = 1

  // The table's chips come from the store, by player id
  const wallet = {
    balance: (id) => store.balance(id),
    debit: (id, cents) => store.debit(id, cents),
    credit: (id, cents) => store.credit(id, cents),
    record: (id, delta) => store.record(id, delta)
  }

  // ---------- Telling players ----------

  function send (client, message) {
    client.ws.send(JSON.stringify(message))
  }

  function tableMessage (entry, playerId) {
    return { t: 'table', view: entry.table.view(playerId, now()), me: store.profile(playerId) }
  }

  // Everyone at a table gets their own view of it
  function broadcast (entry) {
    for (const seat of entry.table.seats) {
      if (!seat) continue
      const client = online.get(seat.playerId)
      if (client?.tableId === entry.table.id) send(client, tableMessage(entry, seat.playerId))
    }
  }

  // ---------- Tables ----------

  function openTable (kind, isPublic) {
    if (tables.size >= MAX_TABLES) return null
    let code = randomCode()
    while (codes.has(code)) code = randomCode()
    const id = `t${nextTable++}`
    const table = new Table({ id, code, kind, wallet, rules, shoe: shoeFor?.(id) || null })
    const entry = { table, public: kind === 'shared' && isPublic, away: new Map() }
    tables.set(id, entry)
    codes.set(code, id)
    return entry
  }

  function closeTable (entry) {
    tables.delete(entry.table.id)
    codes.delete(entry.table.code)
  }

  // Gets up from the table this client sits at (their cards in play still settle)
  function standUp (client) {
    const entry = tables.get(client.tableId)
    client.tableId = null
    if (!entry) return
    entry.table.leave(client.player.id, now())
    entry.away.delete(client.player.id)
    if (!entry.table.players) closeTable(entry)
    else broadcast(entry)
  }

  function seatAt (client, entry) {
    if (client.tableId === entry.table.id) return { ok: true }
    if (client.tableId) standUp(client)
    // Back at a table they were still seated at (a reload, a dropped line)
    if (entry.table.seatOf(client.player.id)) {
      client.tableId = entry.table.id
      entry.table.setAway(client.player.id, false, now())
      entry.away.delete(client.player.id)
      broadcast(entry)
      return { ok: true }
    }
    const result = entry.table.sit(client.player.id, client.player.name)
    if (!result.ok) return result
    client.tableId = entry.table.id
    broadcast(entry)
    return { ok: true }
  }

  // The table a player still has a seat at, if any
  function tableOf (playerId) {
    for (const entry of tables.values()) if (entry.table.seatOf(playerId)) return entry
    return null
  }

  const publicTables = () => [...tables.values()]
    .filter(entry => entry.public && entry.table.players < entry.table.seats.length)
    .map(entry => ({
      code: entry.table.code,
      players: entry.table.players,
      seats: entry.table.seats.length,
      names: entry.table.seats.filter(Boolean).map(seat => seat.name),
      phase: entry.table.phase
    }))
    .slice(0, 40)

  // ---------- Messages ----------

  function hello (client, msg) {
    const name = cleanText(msg.name, 18) || 'Player'
    let player = store.byToken(msg.token)
    let token = null
    if (!player) {
      let bucket = newPlayers.get(client.ip)
      if (!bucket) newPlayers.set(client.ip, (bucket = createBucket(NEW_PLAYERS_PER_HOUR, 3600000 / NEW_PLAYERS_PER_HOUR)))
      if (!bucket.take()) return { ok: false, err: 'slow' }
      ;({ token, player } = store.create(name, now()))
    } else if (player.name !== name) {
      store.rename(player.id, name)
      player = { ...player, name }
    }
    // One connection per player: a newer one takes over
    const older = online.get(player.id)
    if (older && older !== client) {
      send(older, { t: 'replaced' })
      older.player = null
      older.tableId = null
      older.ws.close(1000)
    }
    if (client.player && client.player.id !== player.id) online.delete(client.player.id)
    client.player = player
    online.set(player.id, client)
    store.seen(player.id, now())
    const entry = tableOf(player.id)
    if (entry) {
      client.tableId = entry.table.id
      entry.table.setAway(player.id, false, now())
      entry.away.delete(player.id)
      const seat = entry.table.seatOf(player.id)?.seat
      if (seat) seat.name = player.name
      broadcast(entry)
    }
    return { ok: true, token, profile: store.profile(player.id), rules }
  }

  function handle (client, text) {
    let msg
    try {
      msg = JSON.parse(text)
    } catch {
      return
    }
    if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') return
    const reply = (data) => {
      if (msg.id !== undefined) send(client, { t: 'res', id: msg.id, ...data })
    }
    if (!client.bucket.take()) return reply({ ok: false, err: 'slow' })
    if (msg.t === 'ping') return reply({ ok: true })
    if (msg.t === 'hello') return reply(hello(client, msg))
    if (!client.player) return reply({ ok: false, err: 'hello' })
    const id = client.player.id
    const entry = tables.get(client.tableId)
    const table = entry?.table

    switch (msg.t) {
      case 'profile':
        return reply({ ok: true, profile: store.profile(id) })
      case 'tables':
        return reply({ ok: true, tables: publicTables() })
      case 'create': {
        const opened = openTable(msg.kind === 'solo' ? 'solo' : 'shared', msg.public !== false)
        if (!opened) return reply({ ok: false, err: 'busy' })
        const result = seatAt(client, opened)
        if (!result.ok) {
          closeTable(opened)
          return reply(result)
        }
        return reply({ ok: true, code: opened.table.code })
      }
      case 'join': {
        const found = tables.get(codes.get(String(msg.code || '').toUpperCase()))
        if (!found || found.table.kind === 'solo') return reply({ ok: false, err: 'notFound' })
        const result = seatAt(client, found)
        return reply(result.ok ? { ok: true, code: found.table.code } : result)
      }
      case 'leave':
        standUp(client)
        return reply({ ok: true })
      case 'refill': {
        if (table?.seatOf(id)?.seat.hands.length && table.phase !== 'betting') return reply({ ok: false, err: 'phase' })
        const result = store.refill(id, { below: rules.minBet, cooldownMs: REFILL_COOLDOWN_MS, now: now() })
        if (result.ok && entry) broadcast(entry)
        return reply({ ...result, profile: store.profile(id) })
      }
      case 'bet':
      case 'ready':
      case 'act': {
        if (!table) return reply({ ok: false, err: 'table' })
        const result = msg.t === 'bet' ? table.bet(id, msg.amount, now())
          : msg.t === 'ready' ? table.ready(id, now())
            : table.act(id, msg.action, now())
        if (result.ok) broadcast(entry)
        return reply(result)
      }
      default:
        return reply({ ok: false, err: 'unknown' })
    }
  }

  // ---------- Connections ----------

  function connect (ws, ip = '') {
    const client = { ws, ip, player: null, tableId: null, bucket: createBucket(30, 100) }
    clients.add(client)
    ws.onmessage = (text) => handle(client, text)
    ws.onclose = () => {
      clients.delete(client)
      if (!client.player || online.get(client.player.id) !== client) return
      online.delete(client.player.id)
      // Their seat waits a while, in case they're back; their turns go quickly meanwhile
      const entry = tables.get(client.tableId)
      if (entry) {
        entry.table.setAway(client.player.id, true, now())
        entry.away.set(client.player.id, now())
        broadcast(entry)
      }
    }
  }

  // Timed steps (turns running out, the dealer's cards, the next round) and empty seats
  function tick () {
    const at = now()
    for (const entry of [...tables.values()]) {
      const { table } = entry
      if (table.tick(at)) broadcast(entry)
      for (const [playerId, since] of entry.away) {
        if (at - since < GRACE_MS) continue
        entry.away.delete(playerId)
        table.leave(playerId, at)
      }
      if (!table.players) closeTable(entry)
    }
  }

  const timers = [
    setInterval(tick, tickMs),
    setInterval(() => {
      const at = now()
      for (const client of clients) {
        if (at - client.ws.lastSeen > 60000) client.ws.close(1001)
        else client.ws.ping()
      }
    }, 20000)
  ]

  return {
    connect,
    tick,
    stats: () => ({ connections: clients.size, tables: tables.size, seated: [...tables.values()].reduce((sum, e) => sum + e.table.players, 0) }),
    close () {
      timers.forEach(clearInterval)
      for (const client of clients) client.ws.close(1001)
    }
  }
}
