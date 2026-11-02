// End-to-end tests for the Blackjack server: real WebSocket clients against a running server,
// on a stacked shoe so every round is known in advance.
//   npm test
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startServer } from '../src/main.js'
import { RULES } from '../src/blackjack/table.js'

const dir = mkdtempSync(join(tmpdir(), 'blackjack-test-'))
let server
const clients = []
// Every table deals from this shoe, over and over: Player 12 against the dealer's 20 for one
// player; with two players the first has 12, the second 20 and the dealer 12, who then draws
// to 22. Players who stand lose (one player) or the second wins (two players).
const SHOE = ['TS', 'TH', '2D', 'QC']
const SHOE2 = ['TS', 'KS', '9H', '2D', 'QD', '3C', 'TC']
let shoe = SHOE

// Quick rounds: everything but the turn clock takes a few milliseconds
const rules = { ...RULES, cardMs: 1, dealerMs: 5, settleMs: 40, betMs: 300, turnMs: 1500, awayMs: 100 }

// A test client: call() waits for its answer, nextTable() for the next table update matching a test
function connect () {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${server.port}/blackjack-socket`)
    const raw = []
    const updates = []
    const waiters = []
    const pending = new Map()
    let seq = 0
    ws.onmessage = (event) => {
      raw.push(event.data)
      const msg = JSON.parse(event.data)
      if (msg.t === 'res') {
        pending.get(msg.id)?.(msg)
        pending.delete(msg.id)
        return
      }
      if (msg.t !== 'table') return
      client.view = msg.view
      client.me = msg.me
      const waiter = waiters.find(w => w.match(msg))
      if (waiter) {
        waiters.splice(waiters.indexOf(waiter), 1)
        waiter.resolve(msg)
      } else {
        updates.push(msg)
      }
    }
    const client = {
      ws,
      raw,
      view: null,
      me: null,
      call: (t, data = {}) => new Promise((done) => {
        const id = ++seq
        pending.set(id, done)
        ws.send(JSON.stringify({ t, id, ...data }))
      }),
      // The next table update that passes `match` (one already received counts)
      nextTable: (match = () => true, ms = 4000) => new Promise((done, fail) => {
        const index = updates.findIndex(match)
        if (index >= 0) return done(updates.splice(0, index + 1).pop())
        const timer = setTimeout(() => fail(new Error('no such table update')), ms)
        waiters.push({ match, resolve: (msg) => { clearTimeout(timer); done(msg) } })
      }),
      close: () => ws.close()
    }
    ws.onopen = () => resolve(client)
    ws.onerror = reject
    clients.push(client)
  })
}

const phase = (name) => (msg) => msg.view.phase === name

before(async () => {
  server = await startServer({
    port: 0,
    dbFile: join(dir, 'world.db'),
    blackjack: { rules, tickMs: 10, shoeFor: () => shoe }
  })
})

after(async () => {
  for (const client of clients) client.close()
  await server.close()
  rmSync(dir, { recursive: true, force: true })
})

test('a new player gets $1,000 and a token that brings them back', async () => {
  const a = await connect()
  const hi = await a.call('hello', { name: 'Ada' })
  assert.equal(hi.ok, true)
  assert.match(hi.token, /^[0-9a-f]{48}$/)
  assert.equal(hi.profile.balance, 100000)
  assert.equal(hi.profile.name, 'Ada')
  a.close()
  const again = await connect()
  const back = await again.call('hello', { token: hi.token, name: 'Ada L' })
  assert.equal(back.ok, true)
  assert.equal(back.token, null)
  assert.equal(back.profile.name, 'Ada L')
  // Nothing works before hello
  const stranger = await connect()
  assert.equal((await stranger.call('bet', { amount: 1000 })).err, 'hello')
})

test('a solo round: the dealer\'s hidden card never reaches the browser before it\'s turned', async () => {
  shoe = SHOE
  const a = await connect()
  await a.call('hello', { name: 'Solo' })
  const solo = await a.call('create', { kind: 'solo' })
  assert.equal(solo.ok, true)
  assert.equal((await a.call('bet', { amount: 1000 })).ok, true)
  assert.equal((await a.call('ready')).ok, true)
  const dealt = await a.nextTable(phase('playing'))
  assert.equal(dealt.view.dealer.cards[1].c, null)
  assert.deepEqual(dealt.view.seats[0].hands[0].cards.map(card => card.c), ['TS', '2D'])
  assert.equal(dealt.me.balance, 100000 - 1000)
  // QC is the face-down card: no message so far may contain it
  assert.ok(a.raw.every(text => !text.includes('QC')))
  assert.equal((await a.call('act', { action: 'stand' })).ok, true)
  const settled = await a.nextTable(phase('settled'))
  assert.equal(settled.view.dealer.cards[1].c, 'QC')
  assert.equal(settled.view.seats[0].hands[0].outcome, 'lose')
  assert.equal(settled.me.balance, 100000 - 1000)
  assert.equal(settled.me.stats.hands, 1)
  assert.equal(settled.me.stats.losses, 1)
  // Solo tables are private: not listed, and nobody can join one
  const other = await connect()
  await other.call('hello', { name: 'Nosy' })
  assert.ok(!(await other.call('tables')).tables.some(t => t.code === solo.code))
  assert.equal((await other.call('join', { code: solo.code })).err, 'notFound')
})

test('cheating doesn\'t work: chips you don\'t have, odd amounts, made-up messages', async () => {
  shoe = SHOE
  const a = await connect()
  await a.call('hello', { name: 'Mallory' })
  await a.call('create', { kind: 'solo' })
  assert.equal((await a.call('bet', { amount: 100001 })).err, 'amount')
  assert.equal((await a.call('bet', { amount: 999999900 })).err, 'max')
  assert.equal((await a.call('bet', { amount: -500 })).err, 'amount')
  assert.equal((await a.call('bet', { amount: '1000' })).err, 'amount')
  assert.equal((await a.call('act', { action: 'hit' })).err, 'phase')
  assert.equal((await a.call('setBalance', { balance: 99999999 })).err, 'unknown')
  assert.equal((await a.call('act', { action: 'peek' })).err, 'action')
  assert.equal((await a.call('profile')).profile.balance, 100000)
})

test('a shared table: friends join by code, take turns, and each sees the same cards', async () => {
  shoe = SHOE2
  const a = await connect()
  const b = await connect()
  await a.call('hello', { name: 'Host' })
  await b.call('hello', { name: 'Friend' })
  const { code } = await a.call('create', { kind: 'shared' })
  assert.match(code, /^[A-Z0-9]{4}$/)
  const list = await b.call('tables')
  assert.ok(list.tables.some(t => t.code === code && t.players === 1))
  assert.equal((await b.call('join', { code })).ok, true)
  assert.equal((await b.call('join', { code: 'ZZZZ' })).err, 'notFound')
  await a.call('bet', { amount: 1000 })
  await b.call('bet', { amount: 2000 })
  await a.call('ready')
  assert.equal(a.view.phase, 'betting') // waiting for the friend
  await b.call('ready')
  const seenByA = await a.nextTable(phase('playing'))
  const seenByB = await b.nextTable(phase('playing'))
  assert.deepEqual(seenByA.view.seats.map(s => s?.hands[0]?.cards.map(c => c.c)), seenByB.view.seats.map(s => s?.hands[0]?.cards.map(c => c.c)))
  assert.equal(seenByA.view.seats[0].me, true)
  assert.equal(seenByB.view.seats[1].me, true)
  assert.equal((await b.call('act', { action: 'stand' })).err, 'turn')
  assert.equal((await a.call('act', { action: 'stand' })).ok, true)
  assert.equal((await b.call('act', { action: 'stand' })).ok, true)
  const done = await b.nextTable(phase('settled'))
  // Host 12 and Friend 20 against the dealer's 12 + 10 = 22
  assert.equal(done.view.dealer.bust, true)
  assert.deepEqual(done.view.seats.slice(0, 2).map(s => s.hands[0].outcome), ['win', 'win'])
  assert.equal(done.me.balance, 100000 + 2000)
})

test('a dropped line keeps the seat, and coming back picks the table up again', async () => {
  shoe = SHOE2
  const a = await connect()
  const b = await connect()
  await a.call('hello', { name: 'Stays' })
  const hi = await b.call('hello', { name: 'Drops' })
  const { code } = await a.call('create', { kind: 'shared' })
  await b.call('join', { code })
  b.close()
  const away = await a.nextTable(msg => msg.view.seats[1]?.away)
  assert.equal(away.view.seats[1].name, 'Drops')
  const back = await connect()
  await back.call('hello', { token: hi.token, name: 'Drops' })
  const view = await back.nextTable(msg => msg.view.code === code)
  assert.equal(view.view.seats[1].me, true)
  assert.equal(view.view.seats[1].away, false)
})

test('out of chips: a refill back to $1,000, and only when broke', async () => {
  shoe = SHOE
  const a = await connect()
  await a.call('hello', { name: 'Broke' })
  await a.call('create', { kind: 'solo' })
  assert.equal((await a.call('refill')).err, 'notBroke')
  for (let round = 0; round < 2; round++) {
    assert.equal((await a.call('bet', { amount: 50000 })).ok, true)
    await a.call('ready')
    await a.nextTable(phase('playing'))
    await a.call('act', { action: 'stand' })
    await a.nextTable(phase('settled'))
    await a.nextTable(phase('betting'))
  }
  assert.equal((await a.call('profile')).profile.balance, 0)
  assert.equal((await a.call('bet', { amount: 500 })).err, 'funds')
  const refilled = await a.call('refill')
  assert.equal(refilled.ok, true)
  assert.equal(refilled.profile.balance, 100000)
  assert.equal(refilled.profile.stats.refills, 1)
})
