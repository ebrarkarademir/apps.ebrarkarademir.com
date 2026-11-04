// The man in the suit's animations, frame by frame.
// Run with: npm test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { frameAt, LENGTHS } from '../src/games/blackjack/suitAnim.js'
import { suitFrame, POSES } from '../src/games/blackjack/suitFigure.js'

const sameSpot = (a, b) => a.elbow.join() === b.elbow.join() && a.wrist.join() === b.wrist.join()

test('each animation has its frames', () => {
  assert.deepEqual(LENGTHS, { drink: 48, smoke: 60, eat: 41, win: 23, lose: 24 })
})

test('with nothing in hand his own arm hangs, and he blinks now and then', () => {
  const frames = Array.from({ length: 60 }, (_, f) => frameAt(f))
  assert.ok(frames.every(s => s.pose === null))
  assert.ok(frames.some(s => s.eyes === 'closed') && frames.some(s => s.eyes === 'half'))
  assert.ok(frames.some(s => s.breath === 1) && frames.some(s => s.breath === 0))
})

test('a drink goes from his chest to his lips and back, his eyes shut for the sip', () => {
  const frames = Array.from({ length: LENGTHS.drink }, (_, f) => frameAt(f, { held: 'beer' }))
  assert.ok(sameSpot(frames[0].pose, POSES.chest))
  // At his lips for the sip (from the frame the hand gets there), eyes shut throughout it
  const atLips = frames.filter(s => sameSpot(s.pose, POSES.mouth))
  assert.ok(atLips.length >= 10 && atLips.filter(s => s.eyes === 'closed').length >= 10)
  // In between it moves a little each frame, never jumping
  for (let f = 1; f < frames.length; f++) {
    const [a, b] = [frames[f - 1].pose.wrist, frames[f].pose.wrist]
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 15, `jump at frame ${f}`)
  }
})

test('a cigarette smokes, glows bright on a draw, and a cloud comes out after', () => {
  const frames = Array.from({ length: LENGTHS.smoke }, (_, f) => frameAt(f, { held: 'cigarette' }))
  assert.ok(frames.some(s => s.fx.glow === 2))
  assert.ok(frames.some(s => s.mouth === 'o'))
  assert.ok(frames.every(s => s.fx.ember))
  assert.ok(frames.filter(s => s.fx.puffs.length).length > 30)
  // At the lips only once the hand is there
  assert.ok(frames.filter(s => s.pose.atLips).every(s => sameSpot(s.pose, POSES.mouthSmoke)))
})

test('a win or a loss plays once, with what he holds put down on the rail meanwhile', () => {
  const win = (f) => frameAt(f, { held: 'beer', reaction: { kind: 'win', at: 100 } })
  assert.equal(win(110).onRail, true)
  assert.equal(win(110).mouth, 'grin')
  assert.equal(win(100 + LENGTHS.win).onRail, false) // over: back to his beer
  const lose = frameAt(110, { reaction: { kind: 'lose', at: 100 } })
  assert.ok(sameSpot(lose.pose, POSES.forehead) && lose.eyes === 'closed')
})

test('every frame draws', () => {
  for (const held of ['', 'beer', 'cigarette', 'burger', 'hookah']) {
    for (let f = 0; f < 64; f += 3) {
      const layers = suitFrame(frameAt(f, { held }), { held })
      for (const url of Object.values(layers)) assert.ok(url.startsWith('data:image/svg+xml,'))
    }
  }
})
