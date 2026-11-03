// Emotes, the bar and gifts at a Blackjack table, as the host's device runs them
// (src/games/blackjack/social.js through room.js): who can send what to whom, what it costs,
// how long it stays, and what everyone gets to see.
//   npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState, onAction, onTick, project } from '../src/games/blackjack/room.js'
import { RULES } from '../src/games/blackjack/table.js'
import { MENU, EMOTES, CATEGORIES, itemOf } from '../src/games/blackjack/social.js'

const player = (id) => ({ id, name: id.toUpperCase(), av: 0, online: true })

// A room at the table with everyone seated and $1,000 each
function tableRoom (ids) {
  const s = { game: 'blackjack', phase: 'lobby', ready: true, hostId: ids[0], players: ids.map(player), sessionEnds: Date.now() + 3600000, ...initialState() }
  for (const id of ids) onAction(s, id, { type: 'wallet', wallet: { balance: RULES.startBalance, stats: {} } })
  onAction(s, ids[0], { type: 'start' })
  return s
}

// The room reads the time itself: this runs `fn` with the clock moved on
function later (ms, fn) {
  const realNow = Date.now
  const at = realNow() + ms
  Date.now = () => at
  try {
    fn()
  } finally {
    Date.now = realNow
  }
}

test('the menu: every item has a known category, a price in whole dollars and a time', () => {
  for (const item of MENU) {
    assert.ok(CATEGORIES.includes(item.cat), item.id)
    assert.ok(Number.isInteger(item.price) && item.price > 0 && item.price % 100 === 0, item.id)
    assert.ok(item.ms >= 10000, item.id)
    assert.ok(!item.thanks || EMOTES.includes(item.thanks), item.id)
  }
  assert.equal(new Set(MENU.map(item => item.id)).size, MENU.length)
  for (const cat of CATEGORIES) assert.ok(MENU.some(item => item.cat === cat), cat)
  assert.equal(itemOf('constructor'), null)
  assert.equal(itemOf('beer').cat, 'drinks')
})

test('emotes reach everyone, one a second per player at most', () => {
  const s = tableRoom(['a', 'b'])
  onAction(s, 'a', { type: 'emote', k: 'laugh' })
  onAction(s, 'a', { type: 'emote', k: 'heart' }) // too soon: dropped
  onAction(s, 'b', { type: 'emote', k: 'nope' }) // no such emote
  assert.equal(s.social.feed.length, 1)
  later(1500, () => onAction(s, 'a', { type: 'emote', k: 'heart' }))
  assert.deepEqual(s.social.feed.map(e => [e.type, e.from, e.k]), [['emote', 'a', 'laugh'], ['emote', 'a', 'heart']])

  const seen = project(s, 'b').social
  assert.equal(seen.feed.length, 2)
  assert.ok(seen.feed.every(e => typeof e.age === 'number' && e.at === undefined))
  assert.equal(JSON.stringify(seen).includes('"last"'), false)
})

test('an order for yourself is paid in chips and stands at your seat', () => {
  const s = tableRoom(['a', 'b'])
  onAction(s, 'a', { type: 'buy', k: 'beer' })
  assert.equal(s.wallets.a.balance, RULES.startBalance - itemOf('beer').price)
  assert.equal(s.wallets.a.stats.barTab, itemOf('beer').price)
  assert.equal(s.social.items.a.length, 1)
  assert.equal(s.social.feed.at(-1).type, 'order')

  const seen = project(s, 'b').social.items.a[0]
  assert.equal(seen.k, 'beer')
  assert.equal(seen.from, 'a')
  assert.ok(seen.left > 0 && seen.left <= itemOf('beer').ms)
  assert.equal(seen.until, undefined)
})

test('a gift goes to someone at the table, and counts for the one who sends it', () => {
  const s = tableRoom(['a', 'b'])
  onAction(s, 'a', { type: 'buy', k: 'duck', to: 'b' })
  assert.equal(s.wallets.a.balance, RULES.startBalance - itemOf('duck').price)
  assert.equal(s.wallets.b.balance, RULES.startBalance)
  assert.equal(s.social.items.b[0].k, 'duck')
  assert.equal(s.social.items.b[0].from, 'a')
  assert.deepEqual(s.social.feed.at(-1), { n: s.social.n, at: s.social.feed.at(-1).at, type: 'gift', from: 'a', to: 'b', k: 'duck' })
  assert.equal(s.wallets.a.stats.gifts, 1)
})

test('the dealer takes gifts too, and answers with an emote a moment later', () => {
  const s = tableRoom(['a'])
  onAction(s, 'a', { type: 'buy', k: 'lemon', to: 'dealer' })
  assert.equal(s.social.items.dealer[0].k, 'lemon')
  const reply = project(s, 'a').social.feed.at(-1)
  assert.equal(reply.type, 'emote')
  assert.equal(reply.from, 'dealer')
  assert.equal(reply.k, 'angry')
  assert.ok(reply.age < 0, 'still to come')
})

test('refused orders: unknown items, people who aren’t seated, too few chips, too fast', () => {
  const s = tableRoom(['a', 'b'])
  onAction(s, 'a', { type: 'buy', k: 'unicorn' })
  assert.equal(s.notes.a.err, 'item')
  onAction(s, 'a', { type: 'buy', k: 'rose', to: 'zz' })
  assert.equal(s.notes.a.err, 'giftSeat')

  s.wallets.a.balance = 100
  onAction(s, 'a', { type: 'buy', k: 'champagne' })
  assert.equal(s.notes.a.err, 'funds')
  assert.equal(s.wallets.a.balance, 100)
  assert.equal(s.social.items.a, undefined)

  // Out of chips doesn't hold up the next order
  s.wallets.a.balance = RULES.startBalance
  onAction(s, 'a', { type: 'buy', k: 'tea' })
  onAction(s, 'a', { type: 'buy', k: 'tea' }) // too soon: dropped without a fuss
  assert.equal(s.social.items.a.length, 1)
  assert.equal(s.notes.a.err, 'funds')
})

test('someone watching can send gifts, but has no seat to order to', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f']
  const s = tableRoom(ids)
  assert.ok(!s.bj.seats.some(seat => seat?.playerId === 'f'))
  onAction(s, 'f', { type: 'buy', k: 'cola' })
  assert.equal(s.notes.f.err, 'seat')
  onAction(s, 'f', { type: 'buy', k: 'cola', to: 'a' })
  assert.equal(s.social.items.a[0].from, 'f')
  onAction(s, 'f', { type: 'emote', k: 'wow' })
  assert.equal(s.social.feed.at(-1).from, 'f')
})

test('finished items and old news are cleared away; the numbering carries on into a new table', () => {
  const s = tableRoom(['a'])
  onAction(s, 'a', { type: 'buy', k: 'cloud' })
  onAction(s, 'a', { type: 'emote', k: 'cry' })
  const n = s.social.n
  onTick(s, Date.now() + 10000)
  assert.equal(s.social.feed.length, 0)
  assert.equal(s.social.items.a.length, 1)
  onTick(s, Date.now() + itemOf('cloud').ms + 1000)
  assert.equal(s.social.items.a, undefined)

  later(1000, () => onAction(s, 'a', { type: 'buy', k: 'beer' }))
  assert.equal(s.social.items.a.length, 1)
  onAction(s, 'a', { type: 'lobby' })
  assert.deepEqual(s.social.items, {})
  onAction(s, 'a', { type: 'start' })
  assert.equal(s.social.n, n + 1)
  // Nothing social in the lobby: it has its chat
  onAction(s, 'a', { type: 'lobby' })
  onAction(s, 'a', { type: 'emote', k: 'gg' })
  assert.equal(s.social.feed.length, 0)
})

test('side bets go through the room with a key', () => {
  const s = tableRoom(['a'])
  onAction(s, 'a', { type: 'bet', amount: 1000 })
  onAction(s, 'a', { type: 'bet', key: 'pp', amount: 500 })
  onAction(s, 'a', { type: 'bet', key: 't3', amount: 2500 })
  assert.deepEqual(project(s, 'a').table.seats[0].side, { pp: 500, t3: 2500 })
  onAction(s, 'a', { type: 'bet', key: 't3', amount: RULES.sideMax + 500 })
  assert.equal(s.notes.a.err, 'sideMax')
})
