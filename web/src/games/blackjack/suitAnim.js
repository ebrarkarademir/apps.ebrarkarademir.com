// The man in the suit's animations, frame by frame, at ten frames a second. Pure functions: given
// the frame number, what he has in hand and any reaction he's in the middle of, frameAt says how
// he looks (suitFigure.js suitFrame draws it).
//
//   idle    always: he breathes (a pixel up and down) and blinks (half shut, shut, half shut)
//   drink   48 frames: the glass at his chest, up to his lips in 6, a sip of 10 with his eyes
//           shut, down again in 6
//   smoke   60 frames: the cigarette at his chest, its lit end flickering and smoking; up in 6, a
//           draw of 10 with the end burning bright, down in 6, and a cloud breathed out over 14
//   eat     41 frames: up in 5, a bite of 3 with his mouth open, down in 5, chewing for 8
//   win     23 frames, once: a fist in the air, pumped twice, a big grin
//   lose    24 frames, once: a hand to his forehead, eyes shut, his mouth a flat line

import { POSES, heldLayout } from './suitFigure.js'
import { heldKind } from './avatars.js'

export const FPS = 10

const ease = (t) => t * t * (3 - 2 * t)
const mix = (a, b, u) => Math.round((a + (b - a) * u) * 2) / 2

// A pose eased part of the way (u, 0..1) to another; the hand changes half way, and a cigarette
// is only at the lips once the hand has got there
function between (a, b, u) {
  const e = ease(u)
  return {
    elbow: [mix(a.elbow[0], b.elbow[0], e), mix(a.elbow[1], b.elbow[1], e)],
    wrist: [mix(a.wrist[0], b.wrist[0], e), mix(a.wrist[1], b.wrist[1], e)],
    hand: e < 0.5 ? a.hand : b.hand,
    ...((u <= 0 && a.atLips) || (u >= 1 && b.atLips) ? { atLips: true } : {})
  }
}

// Each animation as steps: n frames, holding a pose or easing from one to another, with what the
// eyes, the mouth and the smoke do meanwhile. '@start' is where the arm is when it isn't busy.
const SEQUENCES = {
  drink: [
    { n: 26, pose: 'chest' },
    { n: 6, from: 'chest', to: 'mouth' },
    { n: 10, pose: 'mouth', eyes: 'closed', sip: true },
    { n: 6, from: 'mouth', to: 'chest' }
  ],
  smoke: [
    { n: 24, pose: 'chestSmoke', wisp: true },
    { n: 6, from: 'chestSmoke', to: 'mouthSmoke' },
    { n: 10, pose: 'mouthSmoke', eyes: 'half', draw: true },
    { n: 6, from: 'mouthSmoke', to: 'chestSmoke' },
    { n: 14, pose: 'chestSmoke', wisp: true, exhale: true }
  ],
  eat: [
    { n: 20, pose: 'chest' },
    { n: 5, from: 'chest', to: 'mouth' },
    { n: 3, pose: 'mouth', eyes: 'closed', mouth: 'open' },
    { n: 5, from: 'mouth', to: 'chest' },
    { n: 8, pose: 'chest', chew: true }
  ],
  win: [
    { n: 4, from: '@start', to: 'fistUp', mouth: 'grin' },
    { n: 8, pump: true, mouth: 'grin' },
    { n: 6, pose: 'fistUp', mouth: 'grin' },
    { n: 5, from: 'fistUp', to: '@start', mouth: 'grin' }
  ],
  lose: [
    { n: 5, from: '@start', to: 'forehead' },
    { n: 14, pose: 'forehead', eyes: 'closed', mouth: 'flat' },
    { n: 5, from: 'forehead', to: '@start' }
  ]
}

const lengthOf = (steps) => steps.reduce((sum, step) => sum + step.n, 0)
export const LENGTHS = Object.fromEntries(Object.entries(SEQUENCES).map(([name, steps]) => [name, lengthOf(steps)]))

// The step a frame falls in, and how far into it
function stepAt (steps, f) {
  let left = f
  for (const step of steps) {
    if (left < step.n) return { step, i: left }
    left -= step.n
  }
  const last = steps[steps.length - 1]
  return { step: last, i: last.n - 1 }
}

/** What he does with a thing from the bar: 'drink', 'smoke', 'eat', or '' (nothing in hand). */
export const useOf = (held) => heldKind(held) || ''

/**
 * How he looks at frame f (counting from 0, ten a second, going on for ever).
 * held: what he has from the bar ('' for nothing); seed: so people at one table don't all move
 * together; reaction: { kind: 'win' | 'lose', at: the frame it began } or null.
 * Returns { pose (POSES-like, or null for his own arm hanging), eyes, mouth, lift, onRail, breath,
 * fx: { puffs, ember, glow } }.
 */
export function frameAt (f, { held = '', seed = 0, reaction = null, mouthAt = [43.5, 36.5] } = {}) {
  const use = useOf(held)
  const state = { pose: null, eyes: '', mouth: '', lift: 0, onRail: false, breath: Math.floor((f + seed * 5) / 14) % 2, fx: {} }

  // A reaction takes over the arm; anything in hand waits on the rail meanwhile
  const r = reaction && SEQUENCES[reaction.kind] ? f - reaction.at : -1
  const reacting = r >= 0 && r < LENGTHS[reaction?.kind]
  const steps = reacting ? SEQUENCES[reaction.kind] : use ? SEQUENCES[use] : null
  if (steps) {
    const at = reacting ? r : (f + seed * 17) % lengthOf(steps)
    const { step, i } = stepAt(steps, at)
    const start = !reacting && use === 'smoke' ? 'chestSmoke' : !reacting && use ? 'chest' : 'side'
    const poseOf = (name) => POSES[name === '@start' ? start : name]
    if (step.pump) state.pose = POSES[Math.floor(i / 2) % 2 ? 'fistMid' : 'fistUp']
    else if (step.from) state.pose = between(poseOf(step.from), poseOf(step.to), (i + 1) / step.n)
    else state.pose = poseOf(step.pose)
    if (reacting) state.onRail = !!held
    if (step.eyes) state.eyes = step.eyes
    if (step.mouth) state.mouth = step.mouth
    if (step.chew) state.mouth = Math.floor(i / 2) % 2 ? 'chew' : ''
    if (step.sip) state.lift = i >= 3 && i <= 7 ? 2 : 1

    // Smoke: off the lit end while it's held, out of his mouth after a draw
    if (!reacting && use === 'smoke') {
      const { ember } = heldLayout(state.pose, held)
      const puffs = []
      if (ember && step.wisp) {
        for (let k = 0; k < 4; k++) {
          const a = (f + k * 6) % 24
          puffs.push({ x: ember[0] + Math.round(Math.sin((a + k * 3) / 3) * 2), y: ember[1] - 2 - a * 1.2, r: 1.2 + a * 0.09, fade: Math.min(3, Math.floor(a / 7)) })
        }
      }
      if (step.exhale) {
        if (i < 6) state.mouth = 'o'
        for (let k = 0; k < 6; k++) {
          const age = i - k
          if (age < 0) continue
          puffs.push({ x: mouthAt[0] - 2 - age * 1.5 - k, y: mouthAt[1] + 1 - age * 1.3 + (k % 2) * 2, r: 2 + age * 0.5, fade: Math.min(3, Math.floor(age / 5)) })
        }
      }
      // The lit end flickers while it's held, and burns bright with a draw
      const glow = step.draw ? (i % 2 ? 2 : 1) : (f % 5 < 2 ? 1 : 0)
      state.fx = { puffs, ember, glow }
    }
  }

  // A blink every few seconds, unless his eyes are already doing something
  if (!state.eyes) {
    const b = (f + seed * 13) % 43
    if (b === 0 || b === 2) state.eyes = 'half'
    else if (b === 1) state.eyes = 'closed'
  }
  return state
}
