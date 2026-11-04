// Who sits at the Blackjack table, and how to draw them. For now everyone, the players and the
// dealer alike, is the man in the navy suit (suitFigure.js, from the picture the table's people
// are made from). The people drawn from scratch, a look for each player id (avatars.js), stay
// here for when there's a choice of people again.
//
// A figure: { w, h } its grid, url(options) its layers as images (see avatars.js avatarUrl),
// ember(held) where a cigarette's lit end is, mouth where smoke comes out of.

import { lookOf as drawnLook, DEALER_LOOK as DRAWN_DEALER, avatarUrl, emberOf, MOUTH_AT, W, H } from './avatars.js'
import { suitUrl, suitEmber, SUIT_MOUTH, FW, FH } from './suitFigure.js'

export const DEFAULT_FIGURE = 'suit'

/** Who a player is at the table. */
export const lookOf = (id) => (DEFAULT_FIGURE === 'suit' ? { figure: 'suit' } : drawnLook(id))

/** Who the dealer is. */
export const DEALER_LOOK = DEFAULT_FIGURE === 'suit' ? Object.freeze({ figure: 'suit', dealer: true }) : DRAWN_DEALER

const SUIT = { w: FW, h: FH, ember: suitEmber, mouth: SUIT_MOUTH }

/** How to draw someone with this look. */
export function figureOf (look) {
  if (look?.figure === 'suit') return { ...SUIT, url: (options) => suitUrl({ ...options, dealer: !!look.dealer }) }
  return { w: W, h: H, ember: emberOf, mouth: MOUTH_AT, url: (options) => avatarUrl(look, options) }
}
