// The Blackjack rules and table, without the network: hand values, the shoe, and whole rounds
// played on a stacked shoe so every outcome is known in advance.
//   npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handValue, newShoe, secureInt, canPair } from '../src/games/blackjack/cards.js'
import { Table, RULES } from '../src/games/blackjack/table.js'

// A wallet in memory, as the table expects one
function makeWallet (balances = {}) {
  const stats = {}
  return {
    balances,
    stats,
    balance: (id) => balances[id] ?? 0,
    debit (id, cents) {
      if ((balances[id] ?? 0) < cents) return false
      balances[id] -= cents
      return true
    },
    credit (id, cents) {
      balances[id] = (balances[id] ?? 0) + cents
    },
    record (id, delta) {
      const s = (stats[id] ||= {})
      for (const [key, value] of Object.entries(delta)) s[key] = key === 'biggestWin' ? Math.max(s[key] || 0, value) : (s[key] || 0) + value
    }
  }
}

const START = RULES.startBalance
const BET = 1000 // $10

// A solo table on a stacked shoe, with its player's bet down and the cards dealt.
// Deal order: player, dealer (up), player, dealer (down), then whatever is drawn.
function dealSolo (shoe, { bet = BET, balance = START } = {}) {
  const wallet = makeWallet({ p: balance })
  const table = new Table({ id: 't', kind: 'solo', wallet, shoe })
  let now = 1000
  table.sit('p', 'Pat')
  assert.equal(table.bet('p', bet, now).ok, true)
  assert.equal(table.ready('p', now).ok, true)
  return { table, wallet, at: () => now, later: (ms) => (now += ms) }
}

// Runs the dealer (and any timed steps) to the end of the round
function finish (game) {
  for (let i = 0; i < 20 && game.table.phase !== 'settled'; i++) game.table.tick(game.later(5000))
  assert.equal(game.table.phase, 'settled')
}

const hand = (game, seat = 0, index = 0) => game.table.seats[seat].hands[index]
const totalOf = (h) => handValue(h.cards.map(card => card.c), { split: h.split }).total

test('hand values: aces, soft totals, Blackjack and busts', () => {
  assert.deepEqual(handValue(['AS', 'KH']), { total: 21, soft: true, blackjack: true, bust: false })
  assert.deepEqual(handValue(['AS', 'AH']), { total: 12, soft: true, blackjack: false, bust: false })
  assert.equal(handValue(['AS', 'AH', '9C']).total, 21)
  assert.deepEqual(handValue(['AS', '6D', 'KH']), { total: 17, soft: false, blackjack: false, bust: false })
  assert.equal(handValue(['KS', 'QH', '2C']).bust, true)
  assert.equal(handValue(['AS', 'KH'], { split: true }).blackjack, false)
  assert.equal(canPair('KS', 'QD'), true)
  assert.equal(canPair('AS', 'AD'), true)
  assert.equal(canPair('9S', 'TD'), false)
})

test('a shoe holds six whole decks, shuffled', () => {
  const shoe = newShoe(6)
  assert.equal(shoe.length, 312)
  const counts = {}
  for (const card of shoe) counts[card] = (counts[card] || 0) + 1
  assert.equal(Object.keys(counts).length, 52)
  assert.ok(Object.values(counts).every(n => n === 6))
  assert.notDeepEqual(shoe, newShoe(6))
  for (let i = 0; i < 1000; i++) {
    const n = secureInt(7)
    assert.ok(Number.isInteger(n) && n >= 0 && n < 7)
  }
})

test('Blackjack pays 3:2', () => {
  const game = dealSolo(['AS', '9H', 'KD', '7C'])
  assert.equal(game.table.phase, 'dealer') // nothing left to play
  finish(game)
  assert.equal(hand(game).outcome, 'blackjack')
  assert.equal(game.wallet.balances.p, START - BET + BET + 1500)
  assert.equal(game.wallet.stats.p.blackjacks, 1)
})

test('a dealer Blackjack ends the round; Blackjack against Blackjack pushes', () => {
  const lost = dealSolo(['9S', 'AH', '8D', 'KC'])
  finish(lost)
  assert.equal(hand(lost).outcome, 'lose')
  assert.equal(lost.wallet.balances.p, START - BET)
  assert.equal(lost.table.dealer.cards.length, 2)

  const pushed = dealSolo(['AS', 'AH', 'KD', 'QC'])
  finish(pushed)
  assert.equal(hand(pushed).outcome, 'push')
  assert.equal(pushed.wallet.balances.p, START)
})

test('hitting past 21 busts, and the dealer doesn\'t draw for a bust hand', () => {
  const game = dealSolo(['TS', '7H', '6D', '9C', 'KH', '5S'])
  assert.equal(game.table.act('p', 'hit', game.at()).ok, true)
  assert.equal(totalOf(hand(game)), 26)
  finish(game)
  assert.equal(hand(game).outcome, 'bust')
  assert.equal(game.table.dealer.cards.length, 2)
  assert.equal(game.wallet.balances.p, START - BET)
})

test('the dealer stands on soft 17 and draws on 16', () => {
  const soft = dealSolo(['TS', '6H', '8D', 'AC'])
  soft.table.act('p', 'stand', soft.at())
  finish(soft)
  assert.equal(soft.table.dealer.cards.length, 2)
  assert.equal(hand(soft).outcome, 'win')
  assert.equal(soft.wallet.balances.p, START + BET)

  const sixteen = dealSolo(['TS', '9H', '9D', '7C', '5S'])
  sixteen.table.act('p', 'stand', sixteen.at())
  finish(sixteen)
  assert.equal(sixteen.table.dealer.cards.length, 3)
  assert.equal(hand(sixteen).outcome, 'lose')
})

test('doubling takes a second stake and one more card', () => {
  const game = dealSolo(['6S', '9H', '5D', '7C', 'TS', '2H'])
  assert.equal(game.table.options('p').double, true)
  assert.equal(game.table.act('p', 'double', game.at()).ok, true)
  assert.equal(hand(game).bet, BET * 2)
  assert.equal(hand(game).cards.length, 3)
  finish(game)
  assert.equal(hand(game).outcome, 'win')
  assert.equal(game.wallet.balances.p, START + BET * 2)
  assert.equal(game.wallet.stats.p.doubles, 1)
})

test('splitting plays two hands; split aces get one card each and 21 is no Blackjack', () => {
  const eights = dealSolo(['8S', '6H', '8D', 'TC', '3C', '2H', 'KS'])
  assert.equal(eights.table.act('p', 'split', eights.at()).ok, true)
  assert.equal(eights.table.seats[0].hands.length, 2)
  eights.table.act('p', 'stand', eights.at())
  eights.table.act('p', 'stand', eights.at())
  finish(eights)
  assert.deepEqual(eights.table.seats[0].hands.map(h => h.outcome), ['win', 'win'])
  assert.equal(eights.wallet.balances.p, START + BET * 2)

  const aces = dealSolo(['AS', '9H', 'AD', '7C', 'KH', '5C', '2S'])
  assert.equal(aces.table.act('p', 'split', aces.at()).ok, true)
  assert.equal(aces.table.phase, 'dealer') // both aces are done after one card
  finish(aces)
  const [first, second] = aces.table.seats[0].hands
  assert.equal(totalOf(first), 21)
  assert.equal(first.outcome, 'win') // 1:1, not 3:2
  assert.equal(second.outcome, 'lose')
  assert.equal(aces.wallet.balances.p, START)
})

test('bets and moves are checked: limits, money, phase and turn', () => {
  const wallet = makeWallet({ p: 3000, q: START })
  const table = new Table({ id: 't', wallet, shoe: ['TS', '9H', '7D', '8C', 'TH', '6D'] })
  table.sit('p', 'Pat')
  table.sit('q', 'Quinn')
  assert.equal(table.bet('p', 200).err, 'min')
  assert.equal(table.bet('p', RULES.maxBet + 100).err, 'max')
  assert.equal(table.bet('p', 5000).err, 'funds')
  assert.equal(table.bet('p', 1550).err, 'amount')
  assert.equal(table.act('p', 'hit').err, 'phase')
  table.bet('p', 2000)
  table.bet('q', 1000)
  table.ready('p', 0)
  assert.equal(table.phase, 'betting') // waiting for Quinn
  table.ready('q', 0)
  assert.equal(table.phase, 'playing')
  assert.equal(table.act('q', 'hit').err, 'turn')
  // Pat has $10 left: not enough to double a $20 bet
  assert.equal(table.options('p').double, false)
  assert.equal(table.act('p', 'double').err, 'funds')
})

test('a turn that runs out stands, and a shared table deals when its betting clock runs out', () => {
  const wallet = makeWallet({ p: START, q: START })
  const table = new Table({ id: 't', wallet, shoe: ['TS', 'TH', '7D', '9H', '8C', '7S', '6C'] })
  table.sit('p', 'Pat')
  table.sit('q', 'Quinn')
  table.bet('p', BET, 0)
  table.bet('q', BET, 0)
  table.ready('p', 0)
  assert.equal(table.phase, 'betting')
  assert.equal(table.deadline, RULES.betMs)
  table.tick(RULES.betMs + 1)
  assert.equal(table.phase, 'playing') // Quinn had a bet down: in
  assert.deepEqual(table.turn, { seat: 0, hand: 0 })
  table.tick(table.deadline + 1)
  assert.deepEqual(table.turn, { seat: 1, hand: 0 })
  assert.equal(table.seats[0].hands[0].done, true)
})

test('a shared table waits for a player who has not bet yet, but not for one who is gone', () => {
  const wallet = makeWallet({ p: START, q: START, r: START })
  const table = new Table({ id: 't', wallet, shoe: ['TS', '9S', '8S', '9H', 'TD', '7D', '9C', '8C'] })
  table.sit('p', 'Pat')
  table.sit('q', 'Quinn')
  table.bet('p', BET, 0)
  table.ready('p', 0)
  assert.equal(table.phase, 'betting') // Quinn hasn't bet
  assert.equal(table.deadline, RULES.betMs)
  table.bet('q', BET, 10)
  table.ready('q', 10)
  assert.equal(table.phase, 'playing') // everyone's in: no need to wait for the clock
  assert.equal(table.seats.filter(seat => seat?.hands.length).length, 2)

  const wallet2 = makeWallet({ p: START, q: START })
  const other = new Table({ id: 'u', wallet: wallet2, shoe: ['TS', '9S', '8S', '9H', 'TD', '7D'] })
  other.sit('p', 'Pat')
  other.sit('q', 'Quinn')
  other.bet('p', BET, 0)
  other.ready('p', 0)
  other.setAway('q', true, 5) // Quinn's connection dropped: Pat plays on
  assert.equal(other.phase, 'playing')
})

test('two players: turns in seat order, each paid on their own hand', () => {
  // Deal: Pat, Quinn, dealer up, Pat, Quinn, dealer down
  const wallet = makeWallet({ p: START, q: START })
  const table = new Table({ id: 't', wallet, shoe: ['TS', '9S', '9H', 'TD', '7D', '8C', '5H'] })
  table.sit('p', 'Pat')
  table.sit('q', 'Quinn')
  table.bet('p', BET, 0)
  table.bet('q', BET * 2, 0)
  table.ready('p', 0)
  table.ready('q', 0)
  assert.equal(table.act('p', 'stand', 1).ok, true) // 20
  assert.equal(table.act('q', 'stand', 2).ok, true) // 16
  for (let now = 3; table.phase !== 'settled'; now += 5000) table.tick(now)
  // Dealer: 9 + 8 = 17 stands
  assert.equal(table.seats[0].hands[0].outcome, 'win')
  assert.equal(table.seats[1].hands[0].outcome, 'lose')
  assert.equal(wallet.balances.p, START + BET)
  assert.equal(wallet.balances.q, START - BET * 2)
})

test('players only ever see the dealer\'s face-up card until it\'s turned', () => {
  const game = dealSolo(['TS', '9H', '7D', '8C'])
  const view = game.table.view('p', game.at())
  assert.equal(view.dealer.cards[0].c, '9H')
  assert.equal(view.dealer.cards[1].c, null)
  assert.equal(view.dealer.total, 9)
  assert.ok(!JSON.stringify(view).includes('8C'))
  assert.equal(view.shoe.left, view.shoe.size - 4)
  game.table.act('p', 'stand', game.at())
  finish(game)
  assert.equal(game.table.view('p').dealer.cards[1].c, '8C')
})

test('the next round offers the last bet again, and leaving mid-round waits for the round to end', () => {
  const game = dealSolo(['TS', '9H', '7D', '8C', 'TH', '9D', '7S', '8H'])
  game.table.act('p', 'stand', game.at())
  finish(game)
  game.table.tick(game.later(RULES.settleMs + 1))
  assert.equal(game.table.phase, 'betting')
  assert.equal(game.table.seats[0].bet, BET)
  game.table.ready('p', game.at())
  assert.equal(game.table.phase, 'playing')
  game.table.leave('p', game.at())
  assert.equal(game.table.seats[0].leaving, true)
  finish(game)
  game.table.tick(game.later(RULES.settleMs + 1))
  assert.equal(game.table.players, 0)
})
