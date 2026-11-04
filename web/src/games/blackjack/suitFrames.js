// The man in the suit, animated from his own frames: people/suit-frames.png, one sheet of twelve
// 160×160 frames side by side (made from the drawings, background taken out, each lined up on his
// suit so he doesn't jump between them). Pure: which frame shows at a given moment.
//
//   idle    standing, now and then talking with his hands (empty_hand 1..3)
//   drink   his glass at his chest, raised, a sip, and down by his side (drinking 1..4)
//   smoke   the cigar by his side smoking, up to his lips, a cloud breathed out, down again
//   win     once, when a hand is won: talking with his hands, pleased
//
// Time goes in ticks, ten a second.

export const FRAME_W = 160
export const FRAME_H = 160
export const TICKS_PER_SECOND = 10

export const FRAMES = [
  'empty_hand_1', 'empty_hand_2', 'empty_hand_3', 'empty_hand_4',
  'drinking_1', 'drinking_2', 'drinking_3', 'drinking_4',
  'smoking_1', 'smoking_2', 'smoking_3', 'smoking_4'
]

const INDEX = Object.fromEntries(FRAMES.map((name, i) => [name, i]))

// Each animation as [frame, ticks it stays]
export const SEQUENCES = {
  idle: [['empty_hand_4', 70], ['empty_hand_1', 6], ['empty_hand_2', 6], ['empty_hand_3', 6], ['empty_hand_2', 5]],
  drink: [['drinking_1', 24], ['drinking_2', 3], ['drinking_3', 12], ['drinking_2', 3], ['drinking_1', 12], ['drinking_4', 18]],
  smoke: [['smoking_1', 20], ['smoking_2', 14], ['smoking_3', 16], ['smoking_4', 18]],
  win: [['empty_hand_2', 4], ['empty_hand_3', 4], ['empty_hand_2', 4], ['empty_hand_3', 4], ['empty_hand_1', 6]]
}

export const LENGTHS = Object.fromEntries(Object.entries(SEQUENCES).map(([name, steps]) => [name, steps.reduce((sum, [, n]) => sum + n, 0)]))

const DRINKS = ['tea', 'coffee', 'cola', 'beer', 'wine', 'raki', 'cocktail', 'whiskey', 'champagne']
const SMOKES = ['cigarette', 'cigar', 'hookah']

/** Which animation goes with what he has from the bar. */
export const animationFor = (held) => (DRINKS.includes(held) ? 'drink' : SMOKES.includes(held) ? 'smoke' : 'idle')

function frameIn (name, tick) {
  const steps = SEQUENCES[name]
  let t = tick % LENGTHS[name]
  for (const [frame, n] of steps) {
    if (t < n) return INDEX[frame]
    t -= n
  }
  return INDEX[steps[0][0]]
}

/**
 * The frame (an index into FRAMES) at a tick. held: what he has from the bar; seed: so people at
 * one table don't move together; reaction: { kind, at } (the tick it began), played once.
 */
export function frameAt (tick, { held = '', seed = 0, reaction = null } = {}) {
  if (reaction && SEQUENCES[reaction.kind]) {
    const r = tick - reaction.at
    if (r >= 0 && r < LENGTHS[reaction.kind]) return frameIn(reaction.kind, r)
  }
  return frameIn(animationFor(held), tick + seed * 23)
}

/** Breathing: up a pixel every other second or so. */
export const breathAt = (tick, seed = 0) => Math.floor((tick + seed * 5) / 14) % 2
