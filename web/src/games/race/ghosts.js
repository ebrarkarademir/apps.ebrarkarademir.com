import { angleDiff } from './track.js'

// Other players' cars, smoothly. Each device sends where its car is about twenty times a
// second, stamped with its race clock (`c`, ms since the green light), and the host passes
// them on, so they arrive unevenly and a little late. Each car is drawn a tenth of a second in
// the past, between the two samples either side of that moment, so it glides from one to the
// next instead of jumping. How late a car's samples run is measured as they come: the
// quickest any has been, creeping up slowly if the connection gets slower. When no sample has
// come for a moment the car carries on the way it was going, for a quarter of a second at most.

export const INTERP_MS = 100
const KEEP = 14 // samples kept per car
const AHEAD_MS = 250 // the most a car is carried on past its last sample

export const newBuffer = () => ({ samples: [], lag: null })

/** A sample arrived at `at` (this device's Date.now()). Repeats of one already here are ignored. */
export function addSample (buffer, sample, at) {
  if (!Number.isFinite(sample?.c) || !Number.isFinite(sample.x) || !Number.isFinite(sample.y)) return
  const list = buffer.samples
  if (list.some(old => old.c === sample.c)) return
  const lag = at - sample.c
  if (buffer.lag === null || lag < buffer.lag) buffer.lag = lag
  else buffer.lag += (lag - buffer.lag) * 0.02
  let i = list.length
  while (i > 0 && list[i - 1].c > sample.c) i--
  list.splice(i, 0, sample)
  if (list.length > KEEP) list.splice(0, list.length - KEEP)
}

/**
 * Where a car should be drawn at `now` (this device's Date.now()): the sample it's nearest,
 * with x, y, a, vx, vy, steer (st) and progress (p) eased between samples. null without any.
 */
export function poseAt (buffer, now) {
  const list = buffer.samples
  if (!list.length) return null
  const at = now - buffer.lag - INTERP_MS
  if (at <= list[0].c) return { ...list[0] }
  for (let i = list.length - 1; i > 0; i--) {
    const a = list[i - 1]
    const b = list[i]
    if (at < a.c || at > b.c) continue
    const f = b.c > a.c ? (at - a.c) / (b.c - a.c) : 1
    const mix = (key) => (Number.isFinite(a[key]) && Number.isFinite(b[key]) ? a[key] + (b[key] - a[key]) * f : b[key])
    return { ...b, x: mix('x'), y: mix('y'), vx: mix('vx'), vy: mix('vy'), st: mix('st'), p: mix('p'), a: a.a + angleDiff(a.a, b.a) * f }
  }
  // Past the newest: carried on along its velocity for a little while
  const last = list[list.length - 1]
  const t = Math.min(at - last.c, AHEAD_MS) / 1000
  return { ...last, x: last.x + (last.vx || 0) * t, y: last.y + (last.vy || 0) * t }
}
