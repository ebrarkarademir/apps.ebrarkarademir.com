// Who sits at the Blackjack table, and how to draw them. For now everyone, the players and the
// dealer alike, is the man in the suit, played from his own frames (SuitAvatar.vue,
// suitFrames.js). The people drawn from scratch, a look for each player id (avatars.js), stay
// here for when there's a choice of people again.
//
// A drawn figure: { w, h } its grid, url(options) its layers as images (see avatars.js
// avatarUrl), ember(held) where a cigarette's lit end is, mouth where smoke comes out of.

import { lookOf as drawnLook, DEALER_LOOK as DRAWN_DEALER, avatarUrl, emberOf, MOUTH_AT, W, H } from './avatars.js'

export const DEFAULT_FIGURE = 'suit'

/** Who a player is at the table. */
export const lookOf = (id) => (DEFAULT_FIGURE === 'suit' ? { figure: 'suit' } : drawnLook(id))

/** Who the dealer is. */
export const DEALER_LOOK = DEFAULT_FIGURE === 'suit' ? Object.freeze({ figure: 'suit', dealer: true }) : DRAWN_DEALER

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
