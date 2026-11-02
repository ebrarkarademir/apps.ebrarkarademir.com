// Neon Laps' bots on the real tracks (src/games/race/bots.js), driving the real cars: a whole
// race of six, as a solo race plays it, with the checkpoints counted the way every screen
// counts them. Bots only steer, as people do: every one has to get round, hard ones ahead of
// easy ones, drifting through the bends.
//   npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TRACKS, trackOf, gridSpot } from '../src/games/race/track.js'
import { STEP, newCar, stepCar, bump } from '../src/games/race/car.js'
import { passGate } from '../src/games/race/race.js'
import { LEVELS, newBrain, botInput } from '../src/games/race/bots.js'

const LAPS = 3
const LINEUP = ['hard', 'normal', 'easy', 'hard', 'normal', 'easy']

function race (trackIndex) {
  const track = trackOf(trackIndex)
  const cars = LINEUP.map((level, slot) => ({
    level,
    car: Object.assign(newCar(track, gridSpot(track, slot)), { power: LEVELS[level].power }),
    brain: newBrain(0.1 + slot * 0.13),
    lap: 0,
    next: 0,
    lapAt: null,
    laps: [],
    done: null
  }))
  let clock = 0
  let slides = 0
  let steps = 0
  while (clock < LAPS * 90 && cars.some(c => c.done === null)) {
    clock += STEP
    for (const c of cars) {
      const others = cars.filter(o => o !== c).map(o => o.car)
      const input = botInput(c.car, c.brain, { track, clock, dt: STEP, go: true, cars: others, pickups: [], ammo: 0 }, LEVELS[c.level])
      if (clock > 1) assert.equal(input.gas || input.brake, true, 'never coasting once off the line')
      steps++
      if (c.car.slide) slides++
      const before = c.car.s
      stepCar(c.car, input, track, STEP)
      const pass = passGate(track, c.lap, c.next, before, c.car.s)
      if (!pass || c.done !== null) continue
      c.lap = pass.lap
      c.next = pass.next
      if (pass.gate !== 0) continue
      if (c.lapAt !== null) c.laps.push(clock - c.lapAt)
      c.lapAt = clock
      if (c.lap > LAPS) c.done = clock
    }
    for (let i = 0; i < cars.length; i++) {
      for (let j = i + 1; j < cars.length; j++) bump(cars[i].car, cars[j].car, 0.5)
    }
  }
  return { track, cars, slides: slides / steps }
}

for (const [index, def] of TRACKS.entries()) {
  test(`six bots race three laps of ${def.id}, and every one finishes`, () => {
    const { track, cars, slides } = race(index)
    assert.ok(slides > 0.05, `the cars drift: ${(slides * 100).toFixed(1)}% of the time`)
    for (const c of cars) {
      assert.notEqual(c.done, null, `a ${c.level} bot finished (it got to lap ${c.lap}, gate ${c.next})`)
      // Laps of a believable length: quicker than walking pace, slower than flat out all the way
      for (const lap of c.laps) assert.ok(lap > track.length / 46 && lap < track.length / 20, `${c.level} lap ${lap.toFixed(1)} s`)
    }
    const average = (level) => cars.filter(c => c.level === level).reduce((sum, c) => sum + c.done, 0) / 2
    assert.ok(average('hard') < average('normal') && average('normal') < average('easy'), 'hard bots beat normal ones, normal beat easy')
  })
}
