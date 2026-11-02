// The table's pixel art (src/games/blackjack/pixels.js): every sprite the right size, only colours
// from the palette, and a picture for every emote and everything on the bar's menu.
//   npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PALETTE, EMOTE_ART, ITEM_ART, UI_ART, BUBBLE, spriteSvg, compose } from '../src/games/blackjack/pixels.js'
import { EMOTES, MENU } from '../src/games/blackjack/social.js'

function checkSprite (name, rows, width, height) {
  assert.equal(rows.length, height, `${name}: ${rows.length} rows`)
  rows.forEach((row, y) => {
    assert.equal(row.length, width, `${name}, row ${y}: "${row}" is ${row.length} wide`)
    for (const ch of row) assert.ok(ch === '.' || PALETTE[ch], `${name}, row ${y}: no colour "${ch}"`)
  })
  assert.ok(rows.some(row => /[^.]/.test(row)), `${name} is empty`)
}

test('emotes are 12×12 and fit their 18×19 bubble', () => {
  for (const [name, rows] of Object.entries(EMOTE_ART)) checkSprite(name, rows, 12, 12)
  checkSprite('bubble', BUBBLE, 18, 19)
  for (const id of EMOTES) assert.ok(EMOTE_ART[id], `no art for the ${id} emote`)
})

test('the bar’s things and the buttons are 16×16, one for every item on the menu', () => {
  for (const [name, rows] of Object.entries(ITEM_ART)) checkSprite(name, rows, 16, 16)
  for (const [name, rows] of Object.entries(UI_ART)) checkSprite(name, rows, 16, 16)
  for (const item of MENU) assert.ok(ITEM_ART[item.id], `no art for ${item.id}`)
})

test('sprites become SVG with one path per colour, and layers paint over one another', () => {
  const svg = spriteSvg(['k.k', 'kkr'])
  assert.match(svg, /viewBox="0 0 3 2"/)
  assert.equal((svg.match(/<path/g) || []).length, 2)
  assert.match(svg, /M0 1h2v1h-2z/)
  assert.deepEqual(compose(3, 2, [{ rows: ['www', 'www'] }, { rows: ['k'], x: 1, y: 1 }]), ['www', 'wkw'])
})
