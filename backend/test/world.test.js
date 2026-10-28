// End-to-end tests for the world server: real WebSocket clients against a running server.
//   npm test
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startServer } from '../src/main.js'
import { cleanText } from '../src/filter.js'

const dir = mkdtempSync(join(tmpdir(), 'world-test-'))
const dbFile = join(dir, 'world.db')
let day = '2026-01-01'
let server
const clients = []

const AVATAR = { body: 'f', skin: 2, face: 1, eyes: 3, eyeColor: 2, brows: 1, hair: 4, hairColor: 5, top: 'top-tee-white', bottom: 'bottom-jeans-denim', shoes: 'shoes-sneakers-white', acc: null }

// A test client: call() waits for the reply, next() for the next event of a kind
function connect () {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${server.port}/world-socket`)
    const events = []
    const waiters = []
    const pending = new Map()
    let seq = 0
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.t === 'res') {
        pending.get(msg.id)?.(msg)
        pending.delete(msg.id)
        return
      }
      const waiter = waiters.find(w => w.match(msg))
      if (waiter) {
        waiters.splice(waiters.indexOf(waiter), 1)
        waiter.resolve(msg)
      } else {
        events.push(msg)
      }
    }
    const client = {
      ws,
      events,
      closed: new Promise(done => ws.addEventListener('close', done)),
      call: (t, data = {}) => new Promise((done) => {
        const id = ++seq
        pending.set(id, done)
        ws.send(JSON.stringify({ t, id, ...data }))
      }),
      send: (t, data = {}) => ws.send(JSON.stringify({ t, ...data })),
      next (t, match = () => true, ms = 4000) {
        const test = (m) => m.t === t && match(m)
        const found = events.find(test)
        if (found) {
          events.splice(events.indexOf(found), 1)
          return Promise.resolve(found)
        }
        return new Promise((done, fail) => {
          const waiter = { match: test, resolve: (m) => { clearTimeout(timer); done(m) } }
          const timer = setTimeout(() => {
            waiters.splice(waiters.indexOf(waiter), 1)
            fail(new Error(`no "${t}" event`))
          }, ms)
          waiters.push(waiter)
        })
      },
      close: () => ws.close()
    }
    ws.onopen = () => {
      clients.push(client)
      resolve(client)
    }
    ws.onerror = reject
  })
}

async function newPlayer (name, avatar = AVATAR) {
  const c = await connect()
  const res = await c.call('register', { name, pass: 'secret1' })
  assert.equal(res.ok, true, `register ${name}: ${res.err}`)
  c.me = res.me
  c.token = res.token
  if (avatar) assert.equal((await c.call('avatar', { avatar })).ok, true)
  return c
}

before(async () => {
  server = await startServer({ port: 0, dbFile, rewardMs: 250, today: () => day })
})

after(async () => {
  clients.forEach(c => c.close())
  await server.close()
  rmSync(dir, { recursive: true, force: true })
})

test('register checks names and passwords, and names are unique in any script', async () => {
  const c = await connect()
  assert.equal((await c.call('register', { name: 'ab', pass: 'secret1' })).err, 'badName')
  assert.equal((await c.call('register', { name: 'fuckface', pass: 'secret1' })).err, 'badName')
  assert.equal((await c.call('register', { name: 'Ахмет', pass: '123' })).err, 'badPass')
  const ok = await c.call('register', { name: 'Ахмет', pass: 'secret1' })
  assert.equal(ok.ok, true)
  assert.equal(typeof ok.token, 'string')
  assert.ok(ok.catalog.length > 50, 'gets the catalog')
  const c2 = await connect()
  assert.equal((await c2.call('register', { name: 'АХМЕТ', pass: 'secret1' })).err, 'nameTaken')
})

test('a new account starts with coins, the daily bonus, starter items and no avatar yet', async () => {
  const c = await connect()
  const res = await c.call('register', { name: 'Newbie', pass: 'secret1' })
  assert.deepEqual(res.bonus, { coins: 100, xp: 50 })
  assert.equal(res.me.coins, 400)
  assert.equal(res.me.avatar, null)
  assert.equal(res.me.inventory['furniture-bed-sky'], 1)
  assert.equal((await c.call('join', { room: 'plaza' })).err, 'avatar', 'no plaza without an avatar')
})

test('login, wrong password, resume by token, and the bonus once a day', async () => {
  const c = await connect()
  await c.call('register', { name: 'Daily', pass: 'secret1' })
  const d = await connect()
  assert.equal((await d.call('login', { name: 'daily', pass: 'nope123' })).err, 'wrongLogin')
  const login = await d.call('login', { name: 'DAILY', pass: 'secret1' })
  assert.equal(login.ok, true)
  assert.equal(login.bonus, null, 'no second bonus the same day')
  day = '2026-01-02'
  const e = await connect()
  const resumed = await e.call('resume', { token: login.token })
  assert.equal(resumed.ok, true)
  assert.deepEqual(resumed.bonus, { coins: 100, xp: 50 }, 'a new day pays again')
  assert.equal(resumed.me.coins, 500)
  assert.equal((await e.call('resume', { token: 'made-up' })).err, 'signedIn', 'already signed in on this connection')
  assert.equal((await e.call('made-up')).err, 'bad', 'unknown requests still get an answer')
  const f = await connect()
  assert.equal((await f.call('resume', { token: 'made-up' })).err, 'session')
})

test('avatars only take choices in range and clothes the player owns', async () => {
  const c = await newPlayer('Picky', null)
  assert.equal((await c.call('avatar', { avatar: { ...AVATAR, skin: 99 } })).err, 'bad')
  assert.equal((await c.call('avatar', { avatar: { ...AVATAR, top: 'top-hoodie-lilac' } })).err, 'bad')
  assert.equal((await c.call('avatar', { avatar: { ...AVATAR, top: null } })).err, 'bad', 'a top is always worn')
  assert.equal((await c.call('avatar', { avatar: AVATAR })).ok, true)
})

test('plaza: players see each other arrive, move and leave', async () => {
  const a = await newPlayer('Alice')
  const b = await newPlayer('Bob')
  const joinA = await a.call('join', { room: 'plaza' })
  assert.equal(joinA.ok, true)
  assert.equal(joinA.room.kind, 'plaza')
  const joinB = await b.call('join', { room: 'plaza' })
  assert.ok(joinB.players.some(p => p.name === 'Alice'), 'Bob sees Alice already there')
  const enter = await a.next('enter', m => m.player.name === 'Bob')
  assert.equal(enter.player.avatar.top, 'top-tee-white')
  b.send('move', { x: 100, z: -3.5, ry: 1.2, st: 1 })
  const snap = await a.next('snap', m => m.p.some(([id, x]) => id === b.me.id && x === 19))
  const bob = snap.p.find(([id]) => id === b.me.id)
  assert.deepEqual(bob.slice(1), [19, -3.5, 1.2, 1], 'positions are clamped to the plaza')
  b.send('move', { x: 0, z: 0, ry: 0, st: 99 })
  b.close()
  await a.next('exit', m => m.id === b.me.id)
  a.alice = true
})

test('chat: swear words are starred out, and flooding is slowed down', async () => {
  const a = await newPlayer('Talker')
  const b = await newPlayer('Listener')
  await a.call('join', { room: 'plaza' })
  await b.call('join', { room: 'plaza' })
  a.send('chat', { text: '  hello   fucking world ' })
  assert.equal((await b.next('say', m => m.id === a.me.id)).text, 'hello ******* world')
  assert.equal(cleanText('Bu iş sıkıntı oldu, I got it'), 'Bu iş sıkıntı oldu, I got it', 'no false alarms')
  assert.equal(cleanText('сука блять'), '**** *****')
  assert.equal(cleanText('Siktir git'), '****** git')
  for (let i = 0; i < 8; i++) a.send('chat', { text: `spam ${i}` })
  await a.next('notice', m => m.kind === 'slow')
})

test('shop: the server keeps the coins, clothes are bought once', async () => {
  const c = await newPlayer('Shopper')
  const buy = await c.call('buy', { item: 'top-hoodie-lilac' })
  assert.equal(buy.ok, true)
  assert.equal(buy.coins, 400 - 150)
  assert.equal(buy.inventory['top-hoodie-lilac'], 1)
  assert.equal((await c.call('buy', { item: 'top-hoodie-lilac' })).err, 'owned')
  assert.equal((await c.call('buy', { item: 'acc-crown-gold' })).err, 'coins')
  assert.equal((await c.call('buy', { item: 'top-tee-white' })).err, 'bad', 'free items are not sold')
  assert.equal((await c.call('buy', { item: 'made-up' })).err, 'bad')
  await c.call('buy', { item: 'furniture-chair-white' })
  const twice = await c.call('buy', { item: 'furniture-chair-white' })
  assert.equal(twice.inventory['furniture-chair-white'], 2, 'furniture can be bought again')
  assert.equal((await c.call('avatar', { avatar: { ...AVATAR, top: 'top-hoodie-lilac' } })).ok, true, 'and worn once bought')
})

test('home layouts: owned furniture only, inside the room, no overlaps', async () => {
  const c = await newPlayer('Decorator')
  const bed = { i: 'furniture-bed-sky', x: 0, z: 0, r: 0 }
  assert.equal((await c.call('layout', { items: [bed, { i: 'furniture-rug-pink', x: 0, z: 0, r: 0 }] })).ok, true, 'a rug can go under')
  assert.equal((await c.call('layout', { items: [bed, { i: 'furniture-table-wood', x: 0, z: 1, r: 0 }] })).err, 'bad', 'no overlaps')
  assert.equal((await c.call('layout', { items: [bed, bed] })).err, 'bad', 'only one bed owned')
  assert.equal((await c.call('layout', { items: [{ ...bed, x: 7, z: 7 }] })).err, 'bad', 'stays inside')
  assert.equal((await c.call('layout', { items: [{ ...bed, x: 6, z: 7, r: 1 }] })).ok, true, 'turned, it fits')
  assert.equal((await c.call('layout', { items: [{ i: 'furniture-piano-black', x: 0, z: 0, r: 0 }] })).err, 'bad', 'not owned')
})

test('friends: request, accept, visit a home, see layout changes, invites', async () => {
  const a = await newPlayer('Host')
  const b = await newPlayer('Guest')
  const c = await newPlayer('Stranger')
  assert.equal((await b.call('join', { room: 'home', owner: a.me.id })).err, 'notFriend')
  assert.equal((await a.call('friendAdd', { user: b.me.id })).status, 'outgoing')
  const request = await b.next('notice', m => m.kind === 'request')
  assert.equal(request.name, 'Host')
  const accepted = await b.call('friendAdd', { user: a.me.id })
  assert.equal(accepted.status, 'friend')
  await a.next('notice', m => m.kind === 'accepted')
  const list = await a.call('friends')
  assert.deepEqual(list.friends.map(f => [f.name, f.status, f.online]), [['Guest', 'friend', true]])
  const visit = await b.call('join', { room: 'home', owner: a.me.id })
  assert.equal(visit.ok, true)
  assert.equal(visit.room.ownerName, 'Host')
  assert.equal(visit.room.layout.length, 6, 'the furnished starter home')
  await a.call('layout', { items: [{ i: 'furniture-plant-green', x: 3, z: 3, r: 0 }] })
  const change = await b.next('layout')
  assert.deepEqual(change.items, [{ i: 'furniture-plant-green', x: 3, z: 3, r: 0 }])
  assert.equal((await c.call('invite', { user: b.me.id })).err, 'bad', 'only friends invite')
  assert.equal((await a.call('invite', { user: b.me.id })).ok, true)
  await b.next('notice', m => m.kind === 'invite' && m.name === 'Host')
  const profile = await c.call('profile', { user: a.me.id })
  assert.equal(profile.profile.status, 'none')
  assert.equal(profile.profile.level, 1)
  b.close()
  const offline = await a.next('friends', m => m.friends.some(f => f.name === 'Guest' && !f.online))
  assert.ok(offline)
})

test('active players earn coins and XP every minute, and level up', async () => {
  const c = await newPlayer('Earner')
  await c.call('join', { room: 'plaza' })
  c.send('move', { x: 1, z: 1, ry: 0, st: 1 })
  const first = await c.next('wallet')
  assert.equal(first.gain, 5)
  assert.equal(first.coins, 405)
  // 50 XP from the daily bonus; level 2 takes 100, so five more paid minutes
  const up = await c.next('wallet', m => m.levelUp, 5000)
  assert.equal(up.level, 2)
})

test('the plaza holds 30 players, the 31st gets a second one', async () => {
  const crowd = await Promise.all(Array.from({ length: 31 }, (_, i) => newPlayer(`Crowd${i}`)))
  const rooms = []
  for (const c of crowd) rooms.push((await c.call('join', { room: 'plaza' })).room.id)
  const counts = rooms.reduce((acc, id) => ({ ...acc, [id]: (acc[id] || 0) + 1 }), {})
  // Earlier tests left players in plaza-1, so it fills up first
  assert.ok(counts['plaza-2'] >= 1, JSON.stringify(counts))
  crowd.forEach(c => c.close())
})

test('signing in elsewhere signs the older connection out', async () => {
  const a = await newPlayer('Twice')
  const b = await connect()
  assert.equal((await b.call('login', { name: 'Twice', pass: 'secret1' })).ok, true)
  await a.next('kicked')
  await a.closed
})

test('everything is still there after a restart', async () => {
  const a = await newPlayer('Keeper')
  await a.call('buy', { item: 'furniture-sofa-mint' })
  await a.call('layout', { items: [{ i: 'furniture-sofa-mint', x: 2, z: 2, r: 0 }] })
  clients.forEach(c => c.close())
  await server.close()
  server = await startServer({ port: 0, dbFile, rewardMs: 250, today: () => day })
  const b = await connect()
  const login = await b.call('login', { name: 'keeper', pass: 'secret1' })
  assert.equal(login.ok, true)
  assert.equal(login.me.coins, 100)
  assert.equal(login.me.inventory['furniture-sofa-mint'], 1)
  assert.deepEqual(login.me.avatar, AVATAR)
  const home = await b.call('join', { room: 'home' })
  assert.deepEqual(home.room.layout, [{ i: 'furniture-sofa-mint', x: 2, z: 2, r: 0 }])
})
