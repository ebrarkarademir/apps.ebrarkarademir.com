// The rules of Password Hack.
//
// Every attempt at a password comes back marked letter by letter: 'hit' for the right letter in
// the right place, 'near' for a letter the password has somewhere else, 'miss' for one it
// doesn't have (or has no more of: a letter only gets as many hits and nears as the password
// holds it). A hit's letter shows in the password from then on.
//
// A run goes through layer after layer of passwords, longer the deeper it gets. The trace
// meter is how close the system is to catching you: every attempt raises it, time raises it
// slowly, a scan raises it more, and cracking a layer brings it down, the more the fewer
// attempts it took. At 100% the run is over.

export const TRACE_MAX = 100
export const TRACE_PER_TRY = 8
export const TRACE_PER_SCAN = 12
export const TRACE_TICK_SECONDS = 5 // time adds 1% every this many seconds
export const TRACE_ALARM = 75 // from here the meter warns

/** How many letters the password on layer n (from 1) has. */
export const lengthForLayer = (layer) => (layer <= 2 ? 4 : layer <= 5 ? 5 : layer <= 8 ? 6 : 7)

/** Marks an attempt against the password; both are arrays of letters of the same length. */
export function mark (guess, answer) {
  const result = guess.map(() => 'miss')
  const left = new Map() // letters of the password not matched in place, and how many of each
  answer.forEach((ch, i) => {
    if (guess[i] === ch) result[i] = 'hit'
    else left.set(ch, (left.get(ch) || 0) + 1)
  })
  guess.forEach((ch, i) => {
    if (result[i] === 'hit' || !left.get(ch)) return
    result[i] = 'near'
    left.set(ch, left.get(ch) - 1)
  })
  return result
}

const RANK = { miss: 1, near: 2, hit: 3 }

/** The keyboard's state after an attempt: each letter keeps the best mark it has had. */
export function rememberKeys (keys, guess, marks) {
  guess.forEach((ch, i) => {
    if ((RANK[marks[i]] || 0) > (RANK[keys[ch]] || 0)) keys[ch] = marks[i]
  })
  return keys
}

/** How far the trace comes down when a layer falls after `tries` attempts. */
export const traceRefund = (tries) => 30 + 5 * Math.max(0, 6 - tries)

/** Points for cracking a password of `length` letters in `tries` attempts with `scans` scans. */
export function points (length, tries, scans) {
  const base = length * 50 * Math.max(1, 8 - tries)
  return Math.max(length * 20, base - scans * length * 30)
}
