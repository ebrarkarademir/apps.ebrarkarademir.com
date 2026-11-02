// Blackjack's side bets: what Perfect Pairs and 21+3 pay on which cards (src/games/blackjack/
// sidebets.js), and how a table takes them, pays them at the deal and offers them again.
//   npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { perfectPairs, twentyOnePlus3, PAYS } from '../src/games/blackjack/sidebets.js'
import { Table, RULES } from '../src/games/blackjack/table.js'

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

// A solo table on a stacked shoe with its player seated, nothing bet yet.
// Deal order: player, dealer (up), player, dealer (down), then whatever is drawn.
function soloTable (shoe, balance = RULES.startBalance) {
  const wallet = makeWallet({ p: balance })
  const table = new Table({ id: 't', kind: 'solo', wallet, shoe })
  table.sit('p', 'Pat')
  return { table, wallet }
}

test('Perfect Pairs: the same rank only, paid by colour and suit', () => {
  assert.deepEqual(perfectPairs('8H', '8H'), { kind: 'perfect', odds: 25 })
  assert.deepEqual(perfectPairs('8H', '8D'), { kind: 'colored', odds: 12 })
  assert.deepEqual(perfectPairs('8S', '8C'), { kind: 'colored', odds: 12 })
  assert.deepEqual(perfectPairs('8H', '8S'), { kind: 'mixed', odds: 6 })
  assert.equal(perfectPairs('KH', 'QH'), null) // both worth ten, but not a pair
  assert.equal(perfectPairs('AS', '2S'), null)
})

test('21+3: flushes, straights (ace high or low, never round the corner) and three of a kind', () => {
  assert.equal(twentyOnePlus3('7S', '7S', '7S').kind, 'suitedTrips')
  assert.equal(twentyOnePlus3('7S', '9S', '8S').kind, 'straightFlush')
  assert.equal(twentyOnePlus3('AS', '2S', '3S').kind, 'straightFlush')
  assert.equal(twentyOnePlus3('7S', '7H', '7D').kind, 'trips')
  assert.equal(twentyOnePlus3('9D', '7S', '8H').kind, 'straight')
  assert.equal(twentyOnePlus3('QS', 'KH', 'AD').kind, 'straight')
  assert.equal(twentyOnePlus3('AS', '2H', '3D').kind, 'straight')
  assert.equal(twentyOnePlus3('KS', 'AH', '2D'), null)
  assert.equal(twentyOnePlus3('2S', '9S', 'KS').kind, 'flush')
  assert.equal(twentyOnePlus3('2S', '9H', 'KD'), null)
  assert.equal(twentyOnePlus3('7S', '7S', '8S').kind, 'flush')
  for (const [kind, odds] of Object.entries(PAYS.t3)) assert.ok(odds > 0, kind)
})

test('side bets leave the wallet with the deal and are paid on the first cards at once', () => {
  // Player 8H 8D under the dealer's 9C: a coloured pair, and nothing for 21+3
  const { table, wallet } = soloTable(['8H', '9C', '8D', 'TS'])
  assert.equal(table.bet('p', 1000, 0).ok, true)
  assert.equal(table.sideBet('p', 'pp', 500, 0).ok, true)
  assert.equal(table.sideBet('p', 't3', 500, 0).ok, true)
  assert.equal(table.ready('p', 0).ok, true)
  assert.equal(table.phase, 'playing')

  const seat = table.seats[0]
  assert.deepEqual(seat.sides, [
    { key: 'pp', bet: 500, kind: 'colored', odds: 12, payout: 6500 },
    { key: 't3', bet: 500, kind: null, odds: 0, payout: 0 }
  ])
  // $20 down, $65 back from the pair, before anyone has played
  assert.equal(wallet.balances.p, RULES.startBalance - 2000 + 6500)
  assert.equal(wallet.stats.p.sideBets, 2)
  assert.equal(wallet.stats.p.sideWins, 1)
  assert.equal(wallet.stats.p.wagered, 2000)
  assert.equal(wallet.stats.p.biggestWin, 6000)

  // Everyone sees the bets and how they did
  const seen = table.view('p', 0).seats[0]
  assert.equal(seen.pid, 'p')
  assert.deepEqual(seen.side, { pp: 500, t3: 500 })
  assert.equal(seen.sides[0].kind, 'colored')
  assert.deepEqual(table.view('p', 0).rules.pays, PAYS)
})

test('a 21+3 straight flush pays 40 to 1', () => {
  const { table, wallet } = soloTable(['7S', '9S', '8S', 'TD'])
  table.bet('p', 500, 0)
  table.sideBet('p', 't3', 1000, 0)
  table.ready('p', 0)
  assert.equal(table.seats[0].sides[0].kind, 'straightFlush')
  assert.equal(wallet.balances.p, RULES.startBalance - 1500 + 1000 * 41)
})

test('side bets have their own limits, and everything down has to be covered', () => {
  const { table } = soloTable(null, 1500)
  assert.equal(table.sideBet('p', 'pp', 300, 0).err, 'sideMin')
  assert.equal(table.sideBet('p', 'pp', RULES.sideMax + 100, 0).err, 'sideMax')
  assert.equal(table.sideBet('p', 'pp', 550, 0).err, 'amount')
  assert.equal(table.sideBet('p', 'xx', 500, 0).err, 'side')

  assert.equal(table.bet('p', 1000, 0).ok, true)
  assert.equal(table.sideBet('p', 'pp', 500, 0).ok, true)
  assert.equal(table.sideBet('p', 't3', 500, 0).err, 'funds')
  assert.equal(table.bet('p', 1500, 0).err, 'funds')
  assert.deepEqual(table.seats[0].side, { pp: 500, t3: 0 })
})

test('taking the main bet back takes the side bets with it, and no main bet means no deal', () => {
  const { table } = soloTable(null)
  table.sideBet('p', 'pp', 500, 0)
  assert.equal(table.ready('p', 0).err, 'min')
  table.bet('p', 1000, 0)
  table.bet('p', 0, 0)
  assert.deepEqual(table.seats[0].side, { pp: 0, t3: 0 })
})

test('the next round offers the same side bets again, when the chips cover them', () => {
  // Player 20 against the dealer's 19, no pair, no poker hand
  const { table, wallet } = soloTable(['TS', '9H', 'QD', 'TC'], 3000)
  table.bet('p', 1000, 0)
  table.sideBet('p', 'pp', 500, 0)
  table.sideBet('p', 't3', 500, 0)
  table.ready('p', 0)
  table.act('p', 'stand', 0)
  for (let now = 10000; table.phase !== 'settled'; now += 5000) table.tick(now)
  // The hand won $10 and the side bets lost $10: back where it started
  assert.equal(wallet.balances.p, 3000)
  table.tick(Date.now() + 60000)
  assert.equal(table.phase, 'betting')
  assert.equal(table.seats[0].bet, 1000)
  assert.deepEqual(table.seats[0].side, { pp: 500, t3: 500 })
  assert.deepEqual(table.seats[0].sides, [])

  // Short of chips for all of it: just the main bet comes back
  wallet.balances.p = 1200
  table.newRound(0)
  assert.equal(table.seats[0].bet, 1000)
  assert.deepEqual(table.seats[0].side, { pp: 0, t3: 0 })
})
