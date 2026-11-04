// The site's and the games' version numbers (src/versions.js): every list only ever goes up,
// in order by date, and the site's newest number is the one package.json (and so the top bar)
// shows.
//   npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SITE, GAMES, siteVersion, gameVersion } from '../src/versions.js'

const parse = (v) => v.split('.').map(Number)
const after = (a, b) => {
  const [x, y] = [parse(a), parse(b)]
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]
  return false
}

function checkHistory (name, list) {
  assert.ok(list.length, `${name} has a version`)
  for (const entry of list) {
    assert.match(entry.v, /^\d+\.\d+\.\d+$/, `${name} ${entry.v}`)
    assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/, `${name} ${entry.v} date`)
    assert.ok(entry.note, `${name} ${entry.v} note`)
  }
  for (let i = 1; i < list.length; i++) {
    assert.ok(after(list[i].v, list[i - 1].v), `${name}: ${list[i].v} comes after ${list[i - 1].v}`)
    assert.ok(list[i].date >= list[i - 1].date, `${name}: ${list[i].v} is no older than ${list[i - 1].v}`)
  }
}

test('the site\'s versions only go up, and package.json has the newest', () => {
  checkHistory('site', SITE)
  const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(version, siteVersion())
})

test('every game\'s versions start at 1.0.0 and only go up', () => {
  for (const [id, list] of Object.entries(GAMES)) {
    checkHistory(id, list)
    assert.equal(list[0].v, '1.0.0', `${id} starts at 1.0.0`)
    assert.equal(gameVersion(id), list.at(-1).v)
  }
  assert.equal(gameVersion('coming-soon-1'), '')
})

test('every commit named in a game\'s history is one of the site\'s versions', () => {
  const commits = new Set(SITE.map(e => e.commit).filter(Boolean))
  for (const [id, list] of Object.entries(GAMES)) {
    for (const entry of list) if (entry.commit) assert.ok(commits.has(entry.commit), `${id} ${entry.v}: ${entry.commit}`)
  }
})
