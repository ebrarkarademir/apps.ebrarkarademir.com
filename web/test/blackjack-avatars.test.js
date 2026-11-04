// The people at the Blackjack table (pixel art), and how chips read.
// Run with: npm test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lookOf, avatarUrl, heldKind, canHold, emberOf, DEALER_LOOK, W, H } from '../src/games/blackjack/avatars.js'
import { MENU } from '../src/games/blackjack/social.js'
import { chipLabel, CHIP_LOOKS } from '../src/games/blackjack/chips.js'
import { CHIPS, RULES } from '../src/games/blackjack/table.js'

const svgOf = (url) => decodeURIComponent(url.replace('data:image/svg+xml,', ''))

test('a player looks the same every time, and players differ', () => {
  assert.deepEqual(lookOf('abc123'), lookOf('abc123'))
  const looks = new Set(Array.from({ length: 40 }, (_, i) => JSON.stringify(lookOf(`player-${i}`))))
  assert.ok(looks.size > 30, `only ${looks.size} different looks for 40 players`)
  // Every feature is used by someone
  const styles = new Set(Array.from({ length: 200 }, (_, i) => lookOf(`p${i}`).style))
  assert.ok(styles.size >= 6)
})

test('every layer of a person is an SVG on the 28×30 grid', () => {
  for (const look of [lookOf('a'), lookOf('b'), DEALER_LOOK]) {
    for (const part of ['chair', 'person', 'rail', 'arm', 'all']) {
      const svg = svgOf(avatarUrl(look, { part }))
      assert.ok(svg.startsWith(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"`), part)
    }
    assert.ok(svgOf(avatarUrl(look, { part: 'person' })).includes('<path'))
  }
  // The dealer stands: no chair and no rail
  assert.ok(!svgOf(avatarUrl(DEALER_LOOK, { part: 'chair' })).includes('<path'))
})

test('drinks, smokes and food from the bar can be held, and are used the right way', () => {
  assert.equal(heldKind('beer'), 'drink')
  assert.equal(heldKind('cigarette'), 'smoke')
  assert.equal(heldKind('hookah'), 'smoke')
  assert.equal(heldKind('burger'), 'eat')
  assert.equal(heldKind('duck'), '')
  for (const item of MENU.filter(item => item.cat !== 'fun')) assert.ok(canHold(item.id), item.id)
  // Held up or down, the arm is drawn with it
  const look = lookOf('x')
  assert.notEqual(avatarUrl(look, { part: 'arm', pose: 'up', held: 'beer' }), avatarUrl(look, { part: 'arm', pose: 'down', held: 'beer' }))
  assert.notEqual(avatarUrl(look, { part: 'person', closed: true }), avatarUrl(look, { part: 'person' }))
})

test('a cigarette has a lit end to glow and smoke, in both poses, on the picture', () => {
  for (const id of ['cigarette', 'cigar']) {
    const ember = emberOf(id)
    for (const pose of ['down', 'up']) {
      assert.ok(ember[pose].x > 0 && ember[pose].x < 1 && ember[pose].y > 0 && ember[pose].y < 1, `${id} ${pose}`)
    }
    // Up at the lips it's higher than down in the hand
    assert.ok(ember.up.y < ember.down.y)
  }
  assert.equal(emberOf('beer'), null)
  assert.equal(emberOf('hookah'), null)
})

test('everyone starts with $100,000, and chips read in dollars', () => {
  assert.equal(RULES.startBalance, 10000000)
  assert.deepEqual(CHIPS.map(chipLabel), ['$25', '$100', '$500', '$1K', '$5K', '$25K', '$100K', '$1M'])
  for (const chip of CHIPS) assert.ok(CHIP_LOOKS[chip], `no colours for ${chip}`)
})
