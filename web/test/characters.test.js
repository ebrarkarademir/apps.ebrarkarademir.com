// The people you can be (src/online/characters.js), and their frames (suitFrames.js LOOKS):
// who someone is rides in their avatar number, and every sheet holds the frames its person needs.
//   npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { CHARACTER_IDS, characterOf, withCharacter } from '../src/online/characters.js'
import { LOOKS, FRAME_W, FRAME_H, frameAt } from '../src/games/blackjack/suitFrames.js'
import { lookOf, DEALER_LOOK } from '../src/games/blackjack/figures.js'

test('who someone is rides in their avatar number, and the rest of the number stays', () => {
  for (const id of CHARACTER_IDS) {
    for (const av of [0, 7, 123456789, 2 ** 31 - 1]) {
      const next = withCharacter(av, id)
      assert.equal(characterOf(next), id)
      assert.equal(Math.floor(next / 16), Math.floor(av / 16), 'the part that tells people apart')
    }
  }
  assert.equal(characterOf(withCharacter(5, 'suit')), 'suit')
  assert.equal(characterOf(undefined), 'suit')
  assert.equal(characterOf(-3), 'suit', 'nothing odd breaks it')
  assert.equal(characterOf(16 * 9 + 15), 'suit', 'a slot nobody has yet is the man in the suit')
})

test('every person has a sheet with each of their frames side by side', () => {
  const sheets = { suit: 'suit-frames.png', casual: 'casual-frames.png', explorer: 'explorer-frames.png' }
  for (const id of CHARACTER_IDS) {
    const look = LOOKS[id]
    assert.ok(look, id)
    const png = fs.readFileSync(new URL(`../src/games/blackjack/people/${sheets[id]}`, import.meta.url))
    assert.equal(png.readUInt32BE(16), FRAME_W * look.frames.length, `${id} width`)
    assert.equal(png.readUInt32BE(20), FRAME_H, `${id} height`)
    for (const steps of Object.values(look.sequences)) for (const [frame, n] of steps) assert.ok(look.frames.includes(frame) && n > 0, `${id} ${frame}`)
    assert.ok(look.still >= 0 && look.still < look.frames.length)
  }
})

test('the new people drink and smoke from their own frames, and stand still otherwise', () => {
  for (const id of ['casual', 'explorer']) {
    const look = LOOKS[id]
    const shown = (held, reaction = null) => new Set(Array.from({ length: 120 }, (_, t) => look.frames[frameAt(t, { held, character: id, reaction })]))
    assert.ok(shown('beer').has('drinking_3'), 'a sip')
    assert.ok(shown('cigarette').has('smoking_3'), 'a cloud')
    assert.deepEqual([...shown('')], ['drinking_4'])
    assert.deepEqual([...shown('', { kind: 'win', at: 10 })], ['drinking_4'], 'no win of their own: they keep standing')
  }
})

test('each player sits at the table as who they picked; the dealer is the man in the suit', () => {
  assert.equal(lookOf('a', withCharacter(40, 'explorer')).character, 'explorer')
  assert.equal(lookOf('b', withCharacter(40, 'casual')).character, 'casual')
  assert.equal(lookOf('c').character, 'suit')
  assert.equal(DEALER_LOOK.character, 'suit')
})
