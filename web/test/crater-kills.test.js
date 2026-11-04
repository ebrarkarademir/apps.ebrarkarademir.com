// Crater Duel's turns (src/games/crater/physics.js): a unit that goes down is credited to the
// side whose blast or fire last hurt it, so the kill list and the kills in the results are right.
//   npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createTerrain, WATER_START } from '../src/games/crater/terrain.js'
import { simulate } from '../src/games/crater/physics.js'

// Two units side by side on flat ground: side 0 fires into the ground between them
function closeCall (hp, weapon = 'shell') {
  const terrain = createTerrain(7, 'plateaus')
  const x = 20
  const y = terrain.groundBelow(x, 0, WATER_START)
  const units = [{ side: 0, x, y, hp: 100, alive: true }, { side: 1, x: x + 3, y, hp, alive: true }]
  return simulate({ terrain, units, shots: [{ unit: 0, angle: -Math.PI / 2 + 0.3, power: 0.05, weapon }], wind: 0, water: WATER_START, random: () => 0.5 })
}

test('a unit taken out by a blast is credited to the side that fired it', () => {
  const result = closeCall(1)
  const death = result.replay.events.find(e => e.k === 'die' && e.u === 1)
  assert.ok(death, 'the weak unit goes down')
  assert.equal(death.by, 0)
  assert.equal(result.units[1].alive, false)
})

test('a unit that loses health but stays up has no death to credit', () => {
  const result = closeCall(100)
  assert.ok(result.replay.events.some(e => e.k === 'dmg' && e.u === 1), 'the blast reaches it')
  assert.ok(!result.replay.events.some(e => e.k === 'die' && e.u === 1))
})

