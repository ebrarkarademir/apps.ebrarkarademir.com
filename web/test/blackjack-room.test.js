// Blackjack in a room, as the host's device runs it (src/games/blackjack/room.js): chips that
// players bring, seats that follow who is in the room, what each player gets to see, and going
// back to the lobby in the middle of a hand.
//   npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState, onAction, onTick, onJoin, onLeave, project, cleanWallet } from '../src/games/blackjack/room.js'
import { RULES } from '../src/games/blackjack/table.js'

const player = (id) => ({ id, name: id.toUpperCase(), av: 0, online: true })

// A room as session.js keeps it on the host
function makeRoom (ids, extra = {}) {
  return { game: 'blackjack', phase: 'lobby', ready: true, hostId: ids[0], players: ids.map(player), sessionEnds: Date.now() + 3600000, ...initialState(), ...extra }
}

const bring = (s, id, balance = RULES.startBalance) => onAction(s, id, { type: 'wallet', wallet: { balance, stats: {} } })

// Runs the room's clock until the table reaches `phase` (a turn, the dealer, the next round)
function runUntil (s, phase) {
  let now = Date.now()
  for (let i = 0; i < 50 && s.bj.phase !== phase; i++) {
    now = Math.max(now, s.bj.deadline || now) + 1
    onTick(s, now)
  }
  assert.equal(s.bj.phase, phase)
}

// Cards in the order they come: a card each, one for the dealer, and again
const stack = (s, cards) => {
  s.bj.shoe = [...cards, ...s.bj.shoe.slice(cards.length)]
}

test('solo: a round from bet to payout, with the chips in the room state', () => {
  const s = makeRoom(['me'], { solo: true, wallets: { me: cleanWallet({ balance: 100000, stats: {} }) } })
  onAction(s, 'me', { type: 'start' })
  assert.equal(s.phase, 'table')
  assert.equal(s.bj.kind, 'solo')
  assert.equal(s.bj.seats.length, 1)
  assert.equal(s.bj.seats[0].playerId, 'me')

  // Player 20 against the dealer's 17
  stack(s, ['TS', '9H', 'TD', '8C'])
  onAction(s, 'me', { type: 'bet', amount: 1000 })
  onAction(s, 'me', { type: 'ready' })
  assert.equal(s.bj.phase, 'playing')
  assert.equal(s.wallets.me.balance, 99000)
  onAction(s, 'me', { type: 'act', action: 'stand' })
  runUntil(s, 'settled')
  assert.equal(s.wallets.me.balance, 101000)
  assert.equal(s.wallets.me.stats.hands, 1)
  assert.equal(s.wallets.me.stats.wins, 1)
  assert.equal(s.wallets.me.stats.peak, 101000)
})

test('what a player sees: no shoe, no face-down card, and only their own chips', () => {
  const s = makeRoom(['a', 'b'])
  bring(s, 'a')
  bring(s, 'b', 50000)
  onAction(s, 'a', { type: 'start' })
  stack(s, ['TS', '9H', 'TD', '8C', '2S', '3S'])
  onAction(s, 'a', { type: 'bet', amount: 500 })
  onAction(s, 'b', { type: 'bet', amount: 500 })
  onAction(s, 'a', { type: 'ready' })
  onAction(s, 'b', { type: 'ready' })
  assert.equal(s.bj.phase, 'playing')

  const seen = JSON.parse(JSON.stringify(project(s, 'b')))
  assert.equal(seen.bj, undefined)
  assert.equal(seen.wallets, undefined)
  assert.equal(seen.table.dealer.cards[1].c, null)
  assert.ok(!JSON.stringify(seen).includes('"shoe":['))
  assert.equal(seen.me.balance, 49500)
  assert.equal(seen.table.seats.find(seat => seat?.me).name, 'B')
  assert.deepEqual(seen.balances, { a: RULES.startBalance - 500, b: 49500 })
  // The room's own fields stay, for the lobby around the game
  assert.equal(seen.hostId, 'a')
  assert.equal(seen.players.length, 2)
})

test('everyone with chips gets a seat, up to five; the rest watch until one frees up', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f']
  const s = makeRoom(ids)
  onAction(s, 'a', { type: 'start' })
  // Nobody is seated before their chips arrive
  assert.equal(s.bj.seats.filter(Boolean).length, 0)
  ids.forEach(id => bring(s, id))
  assert.deepEqual(s.bj.seats.map(seat => seat?.playerId), ['a', 'b', 'c', 'd', 'e'])
  assert.equal(project(s, 'f').table.seats.some(seat => seat?.me), false)

  // A seated player drops out: away at first, and their seat goes to the one waiting
  s.players.find(p => p.id === 'c').online = false
  onLeave(s, s.players[2])
  assert.equal(s.bj.seats[2].playerId, 'f')

  // Back again, they wait in turn
  s.players.find(p => p.id === 'c').online = true
  onJoin(s, s.players[2])
  assert.equal(s.bj.seats.filter(Boolean).length, 5)
  assert.ok(!s.bj.seats.some(seat => seat?.playerId === 'c'))
})

test('a dropped player keeps their seat when nobody is waiting, and is marked away', () => {
  const s = makeRoom(['a', 'b'])
  bring(s, 'a')
  bring(s, 'b')
  onAction(s, 'a', { type: 'start' })
  s.players[1].online = false
  onLeave(s, s.players[1])
  assert.equal(s.bj.seats[1].playerId, 'b')
  assert.equal(s.bj.seats[1].away, true)
  s.players[1].online = true
  onJoin(s, s.players[1])
  assert.equal(s.bj.seats[1].away, false)
})

test('chips come once per room: sending them again changes nothing', () => {
  const s = makeRoom(['a'])
  bring(s, 'a', 2000)
  bring(s, 'a', 99999900)
  assert.equal(s.wallets.a.balance, 2000)
})

test('refused moves are noted for that player, and refills only when out of chips', () => {
  const s = makeRoom(['a'])
  bring(s, 'a', 1000)
  onAction(s, 'a', { type: 'start' })
  onAction(s, 'a', { type: 'bet', amount: 5000 })
  assert.equal(s.notes.a.err, 'funds')
  onAction(s, 'a', { type: 'refill' })
  assert.equal(s.notes.a.err, 'notBroke')
  assert.equal(s.notes.a.n, 2)

  s.wallets.a.balance = 0
  onAction(s, 'a', { type: 'refill' })
  assert.equal(s.wallets.a.balance, RULES.startBalance)
  assert.equal(s.wallets.a.stats.refills, 1)
})

test('back to the lobby in the middle of a hand gives the stakes back', () => {
  const s = makeRoom(['a', 'b'])
  bring(s, 'a')
  bring(s, 'b')
  onAction(s, 'a', { type: 'start' })
  stack(s, ['TS', '9H', 'TD', '8C', '2S', '3S'])
  onAction(s, 'a', { type: 'bet', amount: 2500 })
  onAction(s, 'b', { type: 'bet', amount: 500 })
  onAction(s, 'a', { type: 'ready' })
  onAction(s, 'b', { type: 'ready' })
  assert.equal(s.wallets.a.balance, RULES.startBalance - 2500)

  // Only the host can end the table
  onAction(s, 'b', { type: 'lobby' })
  assert.equal(s.phase, 'table')
  onAction(s, 'a', { type: 'lobby' })
  assert.equal(s.phase, 'lobby')
  assert.equal(s.bj, null)
  assert.equal(s.wallets.a.balance, RULES.startBalance)
  assert.equal(s.wallets.b.balance, RULES.startBalance)
})

test('chips from a device are checked: anything odd starts over at $1,000', () => {
  assert.deepEqual(cleanWallet({ balance: -5, stats: { hands: 3 } }), { balance: RULES.startBalance, stats: { peak: RULES.startBalance } })
  assert.deepEqual(cleanWallet({ balance: 1.5 }), { balance: RULES.startBalance, stats: { peak: RULES.startBalance } })
  assert.deepEqual(cleanWallet(null).balance, RULES.startBalance)
  const kept = cleanWallet({ balance: 4200, stats: { hands: 7, wins: 'x', evil: 1, peak: 9000 } })
  assert.deepEqual(kept, { balance: 4200, stats: { hands: 7, peak: 9000 } })
})
