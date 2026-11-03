import { Table, RULES } from './table.js'
import { socialState, sendEmote, placeOrder, pruneSocial, projectSocial } from './social.js'

// Blackjack in a room (see online/session.js), with no server of our own: the host's device runs
// the table and everyone else sees what the host sends them. Solo play runs the very same rules
// in a room of one (online/useLocalRoom.js).
//
// The room's state keeps the table as plain data (`bj`, see Table.save), each player's chips
// (`wallets`, by player id), the last thing refused to each player (`notes`), and the emotes,
// bar orders and gifts going round the table (`social`, see social.js). A player's
// chips live on their own device: they bring them when they arrive and keep a copy of the room's
// figure as it changes (loadChips / saveChips). So chips can't be checked by anyone, and the
// host's device knows the cards: fine for play money among friends.
//
// Phases: 'lobby', then 'table' once the host starts. Everyone in the room with their chips here
// gets a seat, up to five; the others watch until a seat frees up. A player whose connection
// drops keeps their seat (their turns go quickly) until someone is waiting for it.

const CHIPS_KEY = 'blackjackChips'
const OLD_CHIPS_KEY = 'blackjackPractice' // the practice table's chips, from before rooms
const BANK_KEY = 'blackjackBank100k' // set once a wallet from the $1,000 days has been topped up
const MAX_CENTS = 1e11
const STAT_KEYS = ['hands', 'wins', 'losses', 'pushes', 'blackjacks', 'busts', 'net', 'biggestWin', 'peak', 'refills', 'wagered', 'doubles', 'splits', 'sideBets', 'sideWins', 'barTab', 'gifts']
const MAX_KEYS = ['biggestWin', 'peak'] // the best so far, not a running total

// ---------- This player's chips, on this device ----------

/** Chips and stats as the room may keep them; anything odd starts over at $100,000. */
export function cleanWallet (raw) {
  const ok = Number.isInteger(raw?.balance) && raw.balance >= 0 && raw.balance <= MAX_CENTS
  const balance = ok ? raw.balance : RULES.startBalance
  const stats = {}
  for (const key of STAT_KEYS) {
    const value = ok ? raw.stats?.[key] : undefined
    if (Number.isFinite(value) && Math.abs(value) <= MAX_CENTS * 1000) stats[key] = Math.round(value)
  }
  stats.peak = Math.max(stats.peak || 0, balance)
  return { balance, stats }
}

export function loadChips () {
  let wallet = null
  try {
    for (const key of [CHIPS_KEY, OLD_CHIPS_KEY]) {
      const saved = localStorage.getItem(key)
      if (saved) {
        wallet = cleanWallet(JSON.parse(saved))
        break
      }
    }
  } catch {
    // Start over
  }
  return topUp(wallet || cleanWallet(null))
}

// Everyone starts with $100,000 now: a wallet saved when it was $1,000 is brought up to that once
function topUp (wallet) {
  try {
    if (localStorage.getItem(BANK_KEY)) return wallet
    localStorage.setItem(BANK_KEY, '1')
  } catch {
    return wallet
  }
  if (wallet.balance < RULES.startBalance) {
    wallet.balance = RULES.startBalance
    wallet.stats.peak = Math.max(wallet.stats.peak || 0, wallet.balance)
    saveChips(wallet)
  }
  return wallet
}

export function saveChips (wallet) {
  try {
    localStorage.setItem(CHIPS_KEY, JSON.stringify(cleanWallet(wallet)))
  } catch {
    // Without storage the chips only last this visit
  }
}

/** Out of chips: another $100,000, counted in the stats. Returns the error, if refused. */
export function refill (wallet) {
  if (wallet.balance >= RULES.minBet) return 'notBroke'
  wallet.balance = RULES.startBalance
  wallet.stats.refills = (wallet.stats.refills || 0) + 1
  wallet.stats.peak = Math.max(wallet.stats.peak || 0, wallet.balance)
  return ''
}

// ---------- The room, on the host ----------

export const initialState = () => ({ bj: null, wallets: {}, notes: {}, solo: false, social: socialState() })

// A fresh table starts with nothing on it, but the numbering goes on, so no browser takes a new
// emote for one it has already shown
const freshSocial = (s) => socialState(s.social?.n || 0)

// The table's wallet, over the chips in the room's state
function walletOf (s) {
  const of = (id) => s.wallets[id]
  return {
    balance: (id) => of(id)?.balance ?? 0,
    debit (id, cents) {
      const wallet = of(id)
      if (!wallet || wallet.balance < cents) return false
      wallet.balance -= cents
      return true
    },
    credit (id, cents) {
      const wallet = of(id)
      if (!wallet) return
      wallet.balance += cents
      wallet.stats.peak = Math.max(wallet.stats.peak || 0, wallet.balance)
    },
    record (id, delta) {
      const wallet = of(id)
      if (!wallet) return
      for (const [key, value] of Object.entries(delta)) {
        wallet.stats[key] = MAX_KEYS.includes(key) ? Math.max(wallet.stats[key] || 0, value) : (wallet.stats[key] || 0) + value
      }
    }
  }
}

const loadTable = (s) => Table.load(s.bj, walletOf(s))

// Runs `fn` on the table and keeps the result in the state when anything changed
function withTable (s, fn) {
  const table = loadTable(s)
  const before = table.seq
  const result = fn(table)
  if (table.seq !== before) s.bj = table.save()
  return result
}

function note (s, playerId, err) {
  s.notes[playerId] = { err, n: (s.notes[playerId]?.n || 0) + 1 }
}

// The seats follow the room: away while gone and back on return, the name as it is now, and a
// seat for whoever is waiting with their chips, if need be the seat of someone who's gone
function syncSeats (s, table, now) {
  const online = new Map(s.players.filter(p => p.online).map(p => [p.id, p]))
  for (const seat of table.seats) {
    if (!seat) continue
    const player = online.get(seat.playerId)
    table.setAway(seat.playerId, !player, now)
    if (player && seat.name !== player.name) {
      seat.name = player.name
      table.changed()
    }
  }
  for (const player of online.values()) {
    if (!s.wallets[player.id] || table.seatOf(player.id)) continue
    if (table.sit(player.id, player.name).ok) continue
    const idle = table.seats.find(seat => seat?.away && !seat.hands.length)
    if (!idle) continue
    table.leave(idle.playerId, now)
    table.sit(player.id, player.name)
  }
}

const sync = (s, now = Date.now()) => {
  if (s.phase === 'table' && s.bj) withTable(s, table => syncSeats(s, table, now))
}

// Back to the lobby in the middle of a hand: stakes that haven't been settled come back
function refundOpenHands (s) {
  if (!s.bj || (s.bj.phase !== 'playing' && s.bj.phase !== 'dealer')) return
  const wallet = walletOf(s)
  for (const seat of s.bj.seats) {
    for (const hand of seat?.hands || []) {
      if (!hand.outcome) wallet.credit(seat.playerId, hand.bet)
    }
  }
}

export function onAction (s, playerId, action) {
  const isHost = playerId === s.hostId
  const now = Date.now()
  switch (action.type) {
    // A player's chips, from their device, once per room
    case 'wallet':
      if (s.wallets[playerId]) return
      s.wallets[playerId] = cleanWallet(action.wallet)
      sync(s, now)
      return
    case 'start':
      if (!isHost || s.phase !== 'lobby') return
      s.bj = new Table({ id: 'room', kind: s.solo ? 'solo' : 'shared', wallet: walletOf(s) }).save()
      s.notes = {}
      s.social = freshSocial(s)
      s.phase = 'table'
      sync(s, now)
      return
    case 'lobby':
      if (!isHost || s.phase !== 'table') return
      refundOpenHands(s)
      s.bj = null
      s.social = freshSocial(s)
      s.phase = 'lobby'
      return
    // An emote, from anyone at the table, seated or watching; too many too fast are dropped
    case 'emote':
      if (s.phase !== 'table') return
      sendEmote(s.social ||= socialState(), playerId, action.k, now)
      return
    // Something from the bar, for themselves, someone seated, or the dealer
    case 'buy': {
      if (s.phase !== 'table' || !s.bj) return
      if (!s.wallets[playerId]) return note(s, playerId, 'unknown')
      const seated = (id) => s.bj.seats.some(seat => seat?.playerId === id)
      const to = typeof action.to === 'string' ? action.to : ''
      const err = placeOrder(s.social ||= socialState(), walletOf(s), playerId, { k: action.k, to }, now, seated)
      if (err && err !== 'slow') note(s, playerId, err)
      return
    }
    case 'refill': {
      const wallet = s.wallets[playerId]
      const err = wallet ? refill(wallet) : 'unknown'
      if (err) note(s, playerId, err)
      return
    }
    // A bet: the main one, or with `key` a side bet ('pp' or 't3')
    case 'bet':
    case 'ready':
    case 'act': {
      if (s.phase !== 'table' || !s.bj) return
      const res = withTable(s, (table) => {
        if (action.type === 'bet') {
          return action.key && action.key !== 'main'
            ? table.sideBet(playerId, action.key, action.amount, now)
            : table.bet(playerId, action.amount, now)
        }
        if (action.type === 'ready') return table.ready(playerId, now)
        return table.act(playerId, action.action, now)
      })
      if (!res.ok) note(s, playerId, res.err === 'seat' ? 'phase' : res.err)
    }
  }
}

// Turns that ran out, the dealer's cards and the next round, a few times a second; and what's
// been finished at the bar cleared away
export function onTick (s, now) {
  if (s.social) pruneSocial(s.social, now)
  if (s.phase !== 'table' || !s.bj) return
  withTable(s, (table) => {
    syncSeats(s, table, now)
    table.tick(now)
  })
}

export const onJoin = (s) => sync(s)
export const onLeave = (s) => sync(s)

/**
 * What one player sees: the table without the shoe or the face-down card, their own chips, and
 * what's going on round the table.
 */
export function project (s, playerId) {
  const { bj, wallets, notes, social, ...room } = s
  const now = Date.now()
  return {
    ...room,
    table: bj ? loadTable(s).view(playerId, now) : null,
    me: wallets[playerId] || null,
    note: notes[playerId] || null,
    balances: Object.fromEntries(Object.entries(wallets).map(([id, wallet]) => [id, wallet.balance])),
    social: projectSocial(social, now)
  }
}
