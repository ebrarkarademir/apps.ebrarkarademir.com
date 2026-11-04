// The man in the suit, played from his frames.
// Run with: npm test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { FRAMES, FRAME_W, FRAME_H, SEQUENCES, LENGTHS, frameAt, animationFor, breathAt } from '../src/games/blackjack/suitFrames.js'
import { lookOf, DEALER_LOOK, holdsOrders } from '../src/games/blackjack/figures.js'

const at = (name) => FRAMES.indexOf(name)

test('everyone at the table is the man in the suit, and orders stay on the table in front of him', () => {
  for (const id of ['a', 'b']) assert.equal(lookOf(id).figure, 'suit')
  assert.equal(DEALER_LOOK.figure, 'suit')
  assert.equal(holdsOrders(lookOf('a')), false)
})

test('the sheet holds every frame side by side', () => {
  const png = fs.readFileSync(new URL('../src/games/blackjack/people/suit-frames.png', import.meta.url))
  assert.equal(png.readUInt32BE(16), FRAME_W * FRAMES.length)
  assert.equal(png.readUInt32BE(20), FRAME_H)
  for (const steps of Object.values(SEQUENCES)) for (const [frame, n] of steps) assert.ok(FRAMES.includes(frame) && n > 0, frame)
})

test('drinks are drunk, smokes smoked, and anything else leaves him standing', () => {
  assert.equal(animationFor('beer'), 'drink')
  assert.equal(animationFor('whiskey'), 'drink')
  assert.equal(animationFor('cigarette'), 'smoke')
  assert.equal(animationFor('hookah'), 'smoke')
  assert.equal(animationFor('burger'), 'idle')
  assert.equal(animationFor(''), 'idle')
  const shown = (held) => new Set(Array.from({ length: 100 }, (_, t) => FRAMES[frameAt(t, { held })]))
  assert.ok([...shown('beer')].every(name => name.startsWith('drinking')))
  assert.ok(shown('beer').has('drinking_3')) // the sip
  assert.ok(shown('cigar').has('smoking_3')) // the cloud
  assert.ok([...shown('')].every(name => name.startsWith('empty_hand')))
})

test('a win plays once, then he goes back to what he was doing', () => {
  const reaction = { kind: 'win', at: 50 }
  assert.ok(FRAMES[frameAt(52, { held: 'beer', reaction })].startsWith('empty_hand'))
  assert.ok(FRAMES[frameAt(50 + LENGTHS.win, { held: 'beer', reaction })].startsWith('drinking'))
  // A loss has no frames of its own: he carries on
  assert.ok(FRAMES[frameAt(52, { held: 'beer', reaction: { kind: 'lose', at: 50 } })].startsWith('drinking'))
  assert.notEqual(at('empty_hand_4'), -1)
})

test('he breathes', () => {
  const ups = new Set(Array.from({ length: 40 }, (_, t) => breathAt(t)))
  assert.deepEqual([...ups].sort(), [0, 1])
})
