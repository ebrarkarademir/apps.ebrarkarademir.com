// Blackjack's side bets ("yan bahis"), settled the moment the cards are dealt. Pure functions.
//
// Perfect Pairs looks at the player's first two cards. Two of the same rank pay 6:1 when they are
// different colours (a mixed pair), 12:1 when they share a colour but not a suit (a coloured
// pair), and 25:1 when they are the very same card from two of the shoe's decks (a perfect pair).
//
// 21+3 takes the player's first two cards with the dealer's up card as a three-card poker hand:
// a flush pays 5:1, a straight 10:1, three of a kind 30:1, a straight flush 40:1 and three of a
// kind all in one suit 100:1. An ace is high or low in a straight (A-2-3, Q-K-A), but a straight
// doesn't turn the corner (K-A-2).
//
// A winning side bet gets its stake back with the winnings on top.

import { RANKS, rankOf, suitOf } from './cards.js'

export const SIDE_KEYS = ['pp', 't3']

// What each hand pays, to one, best first
export const PAYS = Object.freeze({
  pp: Object.freeze({ perfect: 25, colored: 12, mixed: 6 }),
  t3: Object.freeze({ suitedTrips: 100, straightFlush: 40, trips: 30, straight: 10, flush: 5 })
})

const isRed = (card) => suitOf(card) === 'H' || suitOf(card) === 'D'

/** Perfect Pairs on the first two cards: { kind, odds }, or null when they aren't a pair. */
export function perfectPairs (a, b) {
  if (rankOf(a) !== rankOf(b)) return null
  const kind = suitOf(a) === suitOf(b) ? 'perfect' : isRed(a) === isRed(b) ? 'colored' : 'mixed'
  return { kind, odds: PAYS.pp[kind] }
}

// Three values in a row, in any order
const inRow = (values) => {
  const [x, y, z] = [...values].sort((p, q) => p - q)
  return y === x + 1 && z === y + 1
}

function isStraight (cards) {
  const low = cards.map(card => RANKS.indexOf(rankOf(card)) + 1) // ace 1 ... king 13
  return inRow(low) || inRow(low.map(value => (value === 1 ? 14 : value)))
}

/** 21+3 on the player's two cards and the dealer's up card: { kind, odds }, or null. */
export function twentyOnePlus3 (a, b, up) {
  const cards = [a, b, up]
  const flush = cards.every(card => suitOf(card) === suitOf(a))
  const trips = cards.every(card => rankOf(card) === rankOf(a))
  const straight = !trips && isStraight(cards)
  let kind = null
  if (trips && flush) kind = 'suitedTrips'
  else if (straight && flush) kind = 'straightFlush'
  else if (trips) kind = 'trips'
  else if (straight) kind = 'straight'
  else if (flush) kind = 'flush'
  return kind ? { kind, odds: PAYS.t3[kind] } : null
}

/** One side bet on a fresh deal: the player's first two cards and the dealer's up card. */
export function sideResult (key, cards, up) {
  if (key === 'pp') return perfectPairs(cards[0], cards[1])
  if (key === 't3') return twentyOnePlus3(cards[0], cards[1], up)
  return null
}
