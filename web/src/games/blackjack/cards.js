// Cards for Blackjack: a shoe of standard 52-card decks, shuffled with a cryptographic random
// source, and what a hand is worth. Pure functions.
//
// A card is two characters: its rank (A 2 3 4 5 6 7 8 9 T J Q K) and its suit (S H D C), e.g.
// 'AS' is the ace of spades and 'TD' the ten of diamonds.

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K']
export const SUITS = ['S', 'H', 'D', 'C']

const CARD = /^[A2-9TJQK][SHDC]$/
export const isCard = (card) => typeof card === 'string' && CARD.test(card)
export const rankOf = (card) => card[0]
export const suitOf = (card) => card[1]

/** What one card counts for, an ace as 1 (handValue decides when it's 11). */
export function cardPoints (card) {
  const rank = rankOf(card)
  if (rank === 'A') return 1
  if ('TJQK'.includes(rank)) return 10
  return Number(rank)
}

/**
 * What a hand is worth. An ace counts 11 while that doesn't take the hand over 21, which makes
 * the hand soft. A blackjack is 21 with the first two cards (a split hand can't have one; the
 * table says so with `split`).
 * Returns { total, soft, blackjack, bust }.
 */
export function handValue (cards, { split = false } = {}) {
  let total = 0
  let aces = 0
  for (const card of cards) {
    total += cardPoints(card)
    if (rankOf(card) === 'A') aces++
  }
  const soft = aces > 0 && total + 10 <= 21
  if (soft) total += 10
  return { total, soft, blackjack: !split && cards.length === 2 && total === 21, bust: total > 21 }
}

/** Whether two cards make a pair that can be split: the same value, so a king and a queen too. */
export const canPair = (a, b) => cardPoints(a) === cardPoints(b) && (rankOf(a) === 'A') === (rankOf(b) === 'A')

/** A whole number from 0 to n - 1, evenly spread, from crypto.getRandomValues. */
export function secureInt (n) {
  const limit = Math.floor(0x100000000 / n) * n // values at or above this would favour the low numbers
  const box = new Uint32Array(1)
  for (;;) {
    globalThis.crypto.getRandomValues(box)
    if (box[0] < limit) return box[0] % n
  }
}

/** Shuffles a list in place (Fisher-Yates); `randomInt(n)` gives 0 to n - 1. */
export function shuffle (list, randomInt = secureInt) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    const swap = list[i]
    list[i] = list[j]
    list[j] = swap
  }
  return list
}

/** A fresh shoe of `decks` standard decks, shuffled. */
export function newShoe (decks = 6, randomInt = secureInt) {
  const shoe = []
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) for (const rank of RANKS) shoe.push(rank + suit)
  }
  return shuffle(shoe, randomInt)
}
