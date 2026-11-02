// A Blackjack table: seats, bets, the deal, everyone's turns, the dealer and the payouts. Pure
// game logic with no networking. In an online room the host's browser runs it (see room.js).
//
// Money is whole cents, so 3:2 on any bet is exact. Chips come from a wallet the table is given
// ({ balance, debit, credit, record }); the table takes a stake when the cards are dealt (and
// when a hand doubles or splits) and pays out when the round settles.
//
// Time comes in from outside (`now`, ms) so the room and tests drive it: tick(now) runs
// whatever is due, like a turn that ran out or the dealer's next card.
//
// The rules: a 6-deck shoe reshuffled when three quarters are dealt; the dealer draws to 17 and
// stands on every 17, soft ones too; Blackjack pays 3:2; double on any first two cards, also
// after a split; split any pair of equal value, up to four hands, aces once with one card each;
// 21 after a split isn't a Blackjack. The dealer checks for Blackjack when showing an ace or a
// ten, and a dealer Blackjack ends the round at once.
//
// Next to the main bet a seat can put down two side bets, Perfect Pairs and 21+3 (see
// sidebets.js). They go with the main bet, leave the wallet with it when the cards are dealt,
// and are paid on those first cards straight away.

import { handValue, canPair, newShoe, secureInt } from './cards.js'
import { SIDE_KEYS, PAYS, sideResult } from './sidebets.js'

export const RULES = Object.freeze({
  decks: 6,
  penetration: 0.75, // share of the shoe dealt before it's shuffled again
  seats: 5,
  minBet: 500, // $5
  maxBet: 50000, // $500
  sideMin: 500, // $5, each side bet
  sideMax: 10000, // $100
  startBalance: 100000, // $1,000
  maxHands: 4,
  betMs: 15000, // a shared table deals this long after the first player is ready
  turnMs: 20000, // a turn not taken in time stands
  awayMs: 3000, // ...or this soon for someone who isn't there
  cardMs: 380, // the time each card takes to deal, before the first turn
  dealerMs: 750, // between the dealer's cards
  settleMs: 4500 // the results stay up this long before the next round's bets
})

// Chips to bet with, in cents
export const CHIPS = [500, 2500, 10000, 50000]

export const PHASES = ['betting', 'playing', 'dealer', 'settled']
const ACTIONS = ['hit', 'stand', 'double', 'split']

const fail = (err) => ({ ok: false, err })
const OK = { ok: true }

// A seat's side bets for the next deal, by key; a seat from before side bets has none
const NO_SIDES = Object.freeze({ pp: 0, t3: 0 })
const sidesOf = (seat) => ({ ...NO_SIDES, ...seat.side })
const sideTotal = (side) => SIDE_KEYS.reduce((sum, key) => sum + (side[key] || 0), 0)
// Everything a seat has down for the next deal
const stakeOf = (seat) => seat.bet + sideTotal(sidesOf(seat))

export class Table {
  /**
   * @param {object} options
   * @param {string} options.id
   * @param {string} [options.code]   What friends type to join
   * @param {'solo'|'shared'} [options.kind]  A solo table has one seat and deals as soon as its player is ready
   * @param {object} options.wallet   { balance(id), debit(id, cents) -> bool, credit(id, cents), record(id, stats) }
   * @param {string[]} [options.shoe] A fixed card order, for tests
   * @param {(n: number) => number} [options.randomInt]
   */
  constructor ({ id, code = '', kind = 'shared', wallet, rules = RULES, shoe = null, randomInt = secureInt }) {
    this.id = id
    this.code = code
    this.kind = kind
    this.rules = rules
    this.wallet = wallet
    this.randomInt = randomInt
    this.fixedShoe = shoe
    this.seats = Array(kind === 'solo' ? 1 : rules.seats).fill(null)
    this.phase = 'betting'
    this.round = 0
    this.dealer = { cards: [], hidden: true }
    this.turn = null // { seat, hand }
    this.deadline = 0 // when the next timed step is due; 0 for none
    this.seq = 0 // goes up on every change, so the room knows when to tell everyone
    this.dealt = 0 // cards dealt this round, numbering them for the browsers' animations
    this.shuffled = 0 // rounds that started with a fresh shoe
    this.newShoe()
  }

  // ---------- Saving and loading ----------
  // The room keeps a table as plain data in its state (which goes over the network and back),
  // and the host turns it into a Table again for each move.

  /** The table as plain data: everything but the wallet and the random source. */
  save () {
    const { wallet, randomInt, fixedShoe, ...data } = this
    return JSON.parse(JSON.stringify(data))
  }

  /** A Table again from save(), with a wallet. */
  static load (data, wallet, randomInt = secureInt) {
    const table = Object.create(Table.prototype)
    Object.assign(table, JSON.parse(JSON.stringify(data)), { wallet, randomInt, fixedShoe: null })
    return table
  }

  // ---------- The shoe ----------

  newShoe () {
    this.shoe = this.fixedShoe ? [...this.fixedShoe] : newShoe(this.rules.decks, this.randomInt)
    this.cutAt = Math.floor(this.shoe.length * this.rules.penetration)
    this.used = 0
    this.shuffled++
  }

  draw () {
    if (this.used >= this.shoe.length) this.newShoe()
    return { c: this.shoe[this.used++], n: this.dealt++ }
  }

  // ---------- Seats ----------

  seatOf (playerId) {
    const index = this.seats.findIndex(seat => seat?.playerId === playerId)
    return index < 0 ? null : { index, seat: this.seats[index] }
  }

  get players () {
    return this.seats.filter(Boolean).length
  }

  /** Takes a free seat (the one asked for, if it's free). */
  sit (playerId, name, at = -1) {
    if (this.seatOf(playerId)) return fail('seated')
    const index = at >= 0 && at < this.seats.length && !this.seats[at] ? at : this.seats.findIndex(seat => !seat)
    if (index < 0) return fail('full')
    this.seats[index] = { playerId, name, bet: 0, lastBet: 0, side: { ...NO_SIDES }, lastSide: { ...NO_SIDES }, sides: [], ready: false, hands: [], away: false, leaving: false }
    this.changed()
    return { ok: true, seat: index }
  }

  /** Leaves the table. A player with cards in play leaves when the round is over; their hands stand. */
  leave (playerId, now = Date.now()) {
    const found = this.seatOf(playerId)
    if (!found) return fail('seat')
    const { index, seat } = found
    if (seat.hands.length && this.phase !== 'betting' && this.phase !== 'settled') {
      seat.leaving = true
      seat.away = true
      if (this.turn?.seat === index) this.deadline = now
    } else {
      this.seats[index] = null
      this.checkBets(now)
    }
    this.changed()
    return OK
  }

  /** Someone lost their connection (or got it back): their turns go quickly while they're away. */
  setAway (playerId, away, now = Date.now()) {
    const found = this.seatOf(playerId)
    if (!found || found.seat.away === away) return
    found.seat.away = away
    if (away && this.turn?.seat === found.index) this.deadline = Math.min(this.deadline, now + this.rules.awayMs)
    this.checkBets(now)
    this.changed()
  }

  // ---------- Betting ----------

  /** Sets this player's bet for the next deal. 0 takes it back, and its side bets with it. */
  bet (playerId, amount, now = Date.now()) {
    if (this.phase !== 'betting') return fail('phase')
    const found = this.seatOf(playerId)
    if (!found) return fail('seat')
    if (!Number.isInteger(amount) || amount < 0 || amount % 100) return fail('amount')
    if (amount && amount < this.rules.minBet) return fail('min')
    if (amount > this.rules.maxBet) return fail('max')
    const seat = found.seat
    const sides = amount ? sideTotal(sidesOf(seat)) : 0
    if (amount + sides > this.wallet.balance(playerId)) return fail('funds')
    seat.bet = amount
    if (!amount) seat.side = { ...NO_SIDES }
    seat.ready = false
    this.checkBets(now)
    this.changed()
    return OK
  }

  /** Sets a side bet for the next deal: 'pp' (Perfect Pairs) or 't3' (21+3); 0 takes it back. */
  sideBet (playerId, key, amount, now = Date.now()) {
    if (this.phase !== 'betting') return fail('phase')
    if (!SIDE_KEYS.includes(key)) return fail('side')
    const found = this.seatOf(playerId)
    if (!found) return fail('seat')
    if (!Number.isInteger(amount) || amount < 0 || amount % 100) return fail('amount')
    if (amount && amount < this.rules.sideMin) return fail('sideMin')
    if (amount > this.rules.sideMax) return fail('sideMax')
    const seat = found.seat
    const side = { ...sidesOf(seat), [key]: amount }
    if (seat.bet + sideTotal(side) > this.wallet.balance(playerId)) return fail('funds')
    seat.side = side
    seat.ready = false
    this.checkBets(now)
    this.changed()
    return OK
  }

  /** Bets placed: deal. A shared table waits for everyone who has bet, or for its betting clock. */
  ready (playerId, now = Date.now()) {
    if (this.phase !== 'betting') return fail('phase')
    const found = this.seatOf(playerId)
    if (!found) return fail('seat')
    if (found.seat.bet < this.rules.minBet) return fail('min')
    if (stakeOf(found.seat) > this.wallet.balance(playerId)) return fail('funds')
    found.seat.ready = true
    this.checkBets(now)
    this.changed()
    return OK
  }

  // Everyone at the table ready with a bet: deal now. Otherwise the first one ready starts the
  // betting clock, and whoever hasn't bet when it runs out sits that hand out. Someone whose
  // connection dropped doesn't hold the table up.
  checkBets (now) {
    if (this.phase !== 'betting') return
    const betting = this.seats.filter(seat => seat && !seat.leaving && seat.bet >= this.rules.minBet)
    if (!betting.length) {
      this.deadline = 0
      return
    }
    const present = this.seats.filter(seat => seat && !seat.leaving && !seat.away)
    const allIn = present.every(seat => seat.ready && seat.bet >= this.rules.minBet) && betting.every(seat => seat.ready)
    if (allIn) this.deal(now)
    else if (betting.some(seat => seat.ready) && !this.deadline) this.deadline = now + this.rules.betMs
  }

  // ---------- The deal ----------

  deal (now) {
    const playing = []
    this.seats.forEach((seat, index) => {
      if (!seat || seat.leaving || seat.bet < this.rules.minBet) return
      // The stake, side bets and all, leaves the wallet now; someone who can no longer cover it
      // sits this one out
      const stake = stakeOf(seat)
      if (!this.wallet.debit(seat.playerId, stake)) {
        seat.bet = 0
        seat.side = { ...NO_SIDES }
        seat.ready = false
        return
      }
      this.wallet.record(seat.playerId, { wagered: stake })
      playing.push(index)
    })
    if (!playing.length) {
      this.deadline = 0
      return
    }
    if (this.used >= this.cutAt) this.newShoe()
    this.round++
    this.dealt = 0
    this.dealer = { cards: [], hidden: true }
    for (const index of playing) {
      const seat = this.seats[index]
      seat.hands = [{ cards: [], bet: seat.bet, doubled: false, split: false, done: false, outcome: null, payout: 0 }]
      seat.lastBet = seat.bet
      seat.lastSide = sidesOf(seat)
      seat.ready = false
    }
    // One card each and one for the dealer, face up; then a second each and the dealer's face down
    for (let pass = 0; pass < 2; pass++) {
      for (const index of playing) this.seats[index].hands[0].cards.push(this.draw())
      this.dealer.cards.push(this.draw())
    }
    for (const index of playing) this.settleSides(this.seats[index])
    const dealTime = this.dealt * this.rules.cardMs
    for (const index of playing) {
      const hand = this.seats[index].hands[0]
      if (handValue(hand.cards.map(card => card.c)).blackjack) hand.done = true
    }
    // The dealer checks under an ace or a ten: a Blackjack there settles everyone at once
    const up = this.dealer.cards[0].c[0]
    if ((up === 'A' || 'TJQK'.includes(up)) && handValue(this.dealer.cards.map(card => card.c)).blackjack) {
      for (const index of playing) this.seats[index].hands[0].done = true
    }
    this.phase = 'playing'
    this.turn = null
    this.next(now, dealTime)
  }

  // ---------- Turns ----------

  // The next hand still to play, from the one in turn onwards; the dealer once there's none
  next (now, delay = 0) {
    const from = this.turn ? { seat: this.turn.seat, hand: this.turn.hand + 1 } : { seat: 0, hand: 0 }
    for (let s = from.seat; s < this.seats.length; s++) {
      const seat = this.seats[s]
      if (!seat?.hands.length) continue
      for (let h = s === from.seat ? from.hand : 0; h < seat.hands.length; h++) {
        if (seat.hands[h].done) continue
        this.turn = { seat: s, hand: h }
        this.deadline = now + delay + (seat.away ? this.rules.awayMs : this.rules.turnMs)
        return
      }
    }
    this.turn = null
    this.phase = 'dealer'
    this.deadline = now + delay + this.rules.dealerMs
  }

  /** hit, stand, double or split, for the hand in turn. */
  act (playerId, action, now = Date.now()) {
    if (!ACTIONS.includes(action)) return fail('action')
    if (this.phase !== 'playing' || !this.turn) return fail('phase')
    const seat = this.seats[this.turn.seat]
    if (seat?.playerId !== playerId) return fail('turn')
    const hand = seat.hands[this.turn.hand]
    const result = this[action](seat, hand)
    if (!result.ok) return result
    if (hand.done) this.next(now)
    else this.deadline = now + (seat.away ? this.rules.awayMs : this.rules.turnMs)
    this.changed()
    return OK
  }

  /** What the hand in turn may do: { hit, stand, double, split }. */
  options (playerId) {
    const none = { hit: false, stand: false, double: false, split: false }
    if (this.phase !== 'playing' || !this.turn) return none
    const seat = this.seats[this.turn.seat]
    if (seat?.playerId !== playerId) return none
    const hand = seat.hands[this.turn.hand]
    const balance = this.wallet.balance(playerId)
    const two = hand.cards.length === 2
    const splitAces = hand.split && hand.cards[0].c[0] === 'A'
    return {
      hit: true,
      stand: true,
      double: two && !splitAces && balance >= hand.bet,
      split: two && canPair(hand.cards[0].c, hand.cards[1].c) && seat.hands.length < this.rules.maxHands && balance >= hand.bet
    }
  }

  hit (seat, hand) {
    hand.cards.push(this.draw())
    const value = handValue(hand.cards.map(card => card.c), { split: hand.split })
    if (value.total >= 21) hand.done = true
    return OK
  }

  stand (seat, hand) {
    hand.done = true
    return OK
  }

  double (seat, hand) {
    if (hand.cards.length !== 2) return fail('double')
    if (hand.split && hand.cards[0].c[0] === 'A') return fail('double')
    if (!this.wallet.debit(seat.playerId, hand.bet)) return fail('funds')
    this.wallet.record(seat.playerId, { wagered: hand.bet, doubles: 1 })
    hand.bet *= 2
    hand.doubled = true
    hand.cards.push(this.draw())
    hand.done = true
    return OK
  }

  split (seat, hand) {
    if (hand.cards.length !== 2 || !canPair(hand.cards[0].c, hand.cards[1].c)) return fail('split')
    if (seat.hands.length >= this.rules.maxHands) return fail('split')
    if (!this.wallet.debit(seat.playerId, hand.bet)) return fail('funds')
    this.wallet.record(seat.playerId, { wagered: hand.bet, splits: 1 })
    const aces = hand.cards[0].c[0] === 'A'
    const other = { cards: [hand.cards.pop()], bet: hand.bet, doubled: false, split: true, done: false, outcome: null, payout: 0 }
    hand.split = true
    seat.hands.splice(this.turn.hand + 1, 0, other)
    // Each hand gets its second card; split aces get just that one
    for (const h of [hand, other]) {
      h.cards.push(this.draw())
      if (aces || handValue(h.cards.map(card => card.c), { split: true }).total === 21) h.done = true
    }
    return OK
  }

  // ---------- Side bets ----------

  // Paid on the cards just dealt, the player's first two and the dealer's up card, before anyone
  // plays: { key, bet, kind, odds, payout } each, kind null for a side bet that lost
  settleSides (seat) {
    const cards = seat.hands[0].cards.map(card => card.c)
    const up = this.dealer.cards[0].c
    const side = sidesOf(seat)
    seat.sides = []
    for (const key of SIDE_KEYS) {
      const bet = side[key]
      if (!bet) continue
      const hit = sideResult(key, cards, up)
      const payout = hit ? bet + bet * hit.odds : 0
      if (payout) this.wallet.credit(seat.playerId, payout)
      seat.sides.push({ key, bet, kind: hit?.kind || null, odds: hit?.odds || 0, payout })
      const net = payout - bet
      this.wallet.record(seat.playerId, { sideBets: 1, sideWins: hit ? 1 : 0, net, biggestWin: Math.max(0, net) })
    }
  }

  // ---------- The dealer and the payout ----------

  // Hands still waiting on the dealer: not bust and not a Blackjack (that's paid either way)
  liveHands () {
    return this.seats.some(seat => seat?.hands.some(hand => {
      const value = handValue(hand.cards.map(card => card.c), { split: hand.split })
      return !value.bust && !value.blackjack
    }))
  }

  dealerStep (now) {
    if (this.dealer.hidden) {
      this.dealer.hidden = false
      this.deadline = now + this.rules.dealerMs
      return
    }
    const value = handValue(this.dealer.cards.map(card => card.c))
    if (this.liveHands() && !value.blackjack && value.total < 17) {
      this.dealer.cards.push(this.draw())
      this.deadline = now + this.rules.dealerMs
      return
    }
    this.settle(now)
  }

  settle (now) {
    const dealer = handValue(this.dealer.cards.map(card => card.c))
    for (const seat of this.seats) {
      if (!seat?.hands.length) continue
      for (const hand of seat.hands) {
        const value = handValue(hand.cards.map(card => card.c), { split: hand.split })
        let outcome
        if (value.bust) outcome = 'bust'
        else if (value.blackjack && !dealer.blackjack) outcome = 'blackjack'
        else if (dealer.blackjack && !value.blackjack) outcome = 'lose'
        else if (value.blackjack) outcome = 'push'
        else if (dealer.bust || value.total > dealer.total) outcome = 'win'
        else if (value.total === dealer.total) outcome = 'push'
        else outcome = 'lose'
        // Blackjack pays 3:2 and a win 1:1, on top of the stake back; a push returns the stake
        const payout = outcome === 'blackjack' ? hand.bet + Math.floor((hand.bet * 3) / 2)
          : outcome === 'win' ? hand.bet * 2
            : outcome === 'push' ? hand.bet
              : 0
        hand.outcome = outcome
        hand.payout = payout
        if (payout) this.wallet.credit(seat.playerId, payout)
        const net = payout - hand.bet
        this.wallet.record(seat.playerId, {
          hands: 1,
          wins: outcome === 'win' || outcome === 'blackjack' ? 1 : 0,
          losses: outcome === 'lose' || outcome === 'bust' ? 1 : 0,
          pushes: outcome === 'push' ? 1 : 0,
          blackjacks: outcome === 'blackjack' ? 1 : 0,
          busts: outcome === 'bust' ? 1 : 0,
          net,
          biggestWin: Math.max(0, net)
        })
      }
    }
    this.phase = 'settled'
    this.turn = null
    this.deadline = now + this.rules.settleMs
  }

  // A new round: cards cleared, and everyone's last bet offered again if they can still cover it,
  // with its side bets if they can cover those too
  newRound (now) {
    this.seats.forEach((seat, index) => {
      if (!seat) return
      if (seat.leaving) {
        this.seats[index] = null
        return
      }
      seat.hands = []
      seat.sides = []
      seat.ready = false
      const balance = this.wallet.balance(seat.playerId)
      const bet = seat.lastBet >= this.rules.minBet && seat.lastBet <= balance ? seat.lastBet : 0
      const side = { ...NO_SIDES, ...seat.lastSide }
      seat.bet = bet
      seat.side = bet && bet + sideTotal(side) <= balance ? side : { ...NO_SIDES }
    })
    this.phase = 'betting'
    this.dealer = { cards: [], hidden: true }
    this.turn = null
    this.deadline = 0
    this.checkBets(now)
  }

  // ---------- Time ----------

  /** Runs whatever is due by `now`. Returns whether anything changed. */
  tick (now = Date.now()) {
    if (!this.deadline || now < this.deadline) return false
    if (this.phase === 'betting') {
      this.deadline = 0
      this.deal(now)
    } else if (this.phase === 'playing') {
      // Out of time: the hand stands
      const seat = this.seats[this.turn.seat]
      seat.hands[this.turn.hand].done = true
      this.next(now)
    } else if (this.phase === 'dealer') {
      this.dealerStep(now)
    } else if (this.phase === 'settled') {
      this.newRound(now)
    }
    this.changed()
    return true
  }

  changed () {
    this.seq++
  }

  // ---------- What a player may see ----------

  /**
   * The table as one player sees it: the dealer's face-down card stays hidden and the shoe's
   * order never leaves the table. Cards are { c, n }: the card (null when face down) and the
   * order it was dealt in this round. msLeft: until the next timed step (a turn, the betting).
   */
  view (playerId, now = Date.now()) {
    const visible = this.dealer.hidden ? this.dealer.cards.slice(0, 1) : this.dealer.cards
    const dealerValue = handValue(visible.map(card => card.c))
    return {
      id: this.id,
      code: this.code,
      kind: this.kind,
      phase: this.phase,
      round: this.round,
      seq: this.seq,
      msLeft: this.deadline ? Math.max(0, this.deadline - now) : 0,
      turn: this.turn,
      dealer: {
        cards: this.dealer.cards.map((card, i) => (i === 1 && this.dealer.hidden ? { c: null, n: card.n } : card)),
        total: dealerValue.total,
        soft: dealerValue.soft,
        blackjack: !this.dealer.hidden && dealerValue.blackjack,
        bust: dealerValue.bust
      },
      seats: this.seats.map(seat => seat && {
        pid: seat.playerId,
        name: seat.name,
        me: seat.playerId === playerId,
        bet: seat.bet,
        side: sidesOf(seat),
        sides: seat.sides || [],
        ready: seat.ready,
        away: seat.away,
        leaving: seat.leaving,
        hands: seat.hands.map(hand => {
          const value = handValue(hand.cards.map(card => card.c), { split: hand.split })
          return { cards: hand.cards, bet: hand.bet, doubled: hand.doubled, split: hand.split, done: hand.done, outcome: hand.outcome, payout: hand.payout, ...value }
        })
      }),
      options: this.options(playerId),
      shoe: { left: this.shoe.length - this.used, size: this.shoe.length, shuffled: this.shuffled },
      rules: { minBet: this.rules.minBet, maxBet: this.rules.maxBet, sideMin: this.rules.sideMin, sideMax: this.rules.sideMax, pays: PAYS, chips: CHIPS, seats: this.seats.length }
    }
  }
}
