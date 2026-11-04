// Who sits at the Blackjack table: for now everyone is the man in the navy suit.
// Run with: npm test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lookOf, DEALER_LOOK, figureOf } from '../src/games/blackjack/figures.js'
import { SUIT } from '../src/games/blackjack/people/suit.js'

const svgOf = (url) => decodeURIComponent(url.replace('data:image/svg+xml,', ''))

test('every player and the dealer is the man in the suit', () => {
  for (const id of ['a', 'b', 'someone-else']) assert.equal(lookOf(id).figure, 'suit')
  assert.equal(DEALER_LOOK.figure, 'suit')
})

test('his picture is whole: every row as wide as the grid, every letter a colour', () => {
  assert.equal(SUIT.rows.length, SUIT.h)
  for (const row of SUIT.rows) {
    assert.equal(row.length, SUIT.w)
    for (const ch of row) assert.ok(ch === '.' || SUIT.palette[ch], `no colour for ${ch}`)
  }
})

test('his layers are SVGs on his own grid, with and without a drink', () => {
  const figure = figureOf(lookOf('a'))
  assert.equal(figure.w, SUIT.w)
  for (const options of [{ part: 'person' }, { part: 'person', closed: true }, { part: 'rail' }, { part: 'arm', pose: 'down', held: 'beer' }, { part: 'arm', pose: 'up', held: 'cigarette' }]) {
    assert.ok(svgOf(figure.url(options)).includes(`viewBox="0 0 ${SUIT.w} ${SUIT.h}"`))
  }
  // Eyes shut is a different picture; the dealer has no rail in front of him
  assert.notEqual(figure.url({ part: 'person', closed: true }), figure.url({ part: 'person' }))
  assert.ok(!svgOf(figureOf(DEALER_LOOK).url({ part: 'rail' })).includes('<path'))
  // A cigarette's lit end is on the picture, higher at his lips than in the ashtray
  const ember = figure.ember('cigarette')
  assert.ok(ember.up.y < ember.down.y && ember.up.x > 0 && ember.down.x < 1)
  assert.equal(figure.ember('beer'), null)
})
