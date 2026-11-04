// The people you can be on the site: who's drawn for you on the Users tab, in lobbies and their
// chat, and at the Blackjack table. Pure, so it can be tested.
//
// Which one rides in the number every profile already carries everywhere (`av`, the avatar):
// its last four bits, a slot. Slot 0 is the man in the suit, the one everyone was before there
// was a choice; a visitor who hasn't picked one is set to it (see profile.js). Nothing new has
// to travel, and someone on an older page still shows up as somebody.

export const CHARACTER_IDS = ['suit', 'casual', 'explorer']
const SLOTS = 16

const slotOf = (av) => ((Math.trunc(Number(av) || 0) % SLOTS) + SLOTS) % SLOTS

/** Who someone is, from their avatar number. */
export const characterOf = (av) => CHARACTER_IDS[slotOf(av)] || 'suit'

/** The same avatar number, made to be `id` (the rest of it, used to tell people apart, stays). */
export function withCharacter (av, id) {
  const base = Number.isInteger(av) ? av : 0
  return base - slotOf(base) + Math.max(0, CHARACTER_IDS.indexOf(id))
}
