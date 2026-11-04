// Who sits at the Blackjack table, and how to draw them. Each player is the person they picked
// (the man in the suit, in the sweatshirt or in the hat; see online/characters.js), played from
// their own frames (SuitAvatar.vue, suitFrames.js); the dealer is the man in the suit. The people
// drawn from scratch, a look for each player id (avatars.js), stay here unused.
//
// A drawn figure: { w, h } its grid, url(options) its layers as images (see avatars.js
// avatarUrl), ember(held) where a cigarette's lit end is, mouth where smoke comes out of.

import { lookOf as drawnLook, DEALER_LOOK as DRAWN_DEALER, avatarUrl, emberOf, MOUTH_AT, W, H } from './avatars.js'
import { characterOf } from '../../online/characters.js'

export const DEFAULT_FIGURE = 'suit'

/** Who a player is at the table, from their avatar number. */
export const lookOf = (id, av = 0) => (DEFAULT_FIGURE === 'suit' ? { figure: 'suit', character: characterOf(av) } : drawnLook(id))

/** Who the dealer is. */
export const DEALER_LOOK = DEFAULT_FIGURE === 'suit' ? Object.freeze({ figure: 'suit', character: 'suit', dealer: true }) : DRAWN_DEALER

/**
 * Whether this person shows what they have from the bar in their own hands (the drawn people);
 * the man in the suit has his own glass and cigar in his frames, so what was ordered stays on
 * the table in front of him.
 */
export const holdsOrders = (look) => look?.figure !== 'suit'

/** How to draw one of the drawn people. */
export function figureOf (look) {
  return { w: W, h: H, ember: emberOf, mouth: MOUTH_AT, url: (options) => avatarUrl(look, options) }
}
