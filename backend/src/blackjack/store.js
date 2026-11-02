// Blackjack's players: their chips and stats, in a SQLite file of its own. A player is known by
// a secret token their browser keeps (only its hash is stored), so there's nothing to sign up
// for. Every change to a balance happens here, in one statement or transaction, and only the
// server's table logic asks for one: a browser can't set its own chips.
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createHash, randomBytes } from 'node:crypto'

const SCHEMA = `
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    balance INTEGER NOT NULL, -- cents
    stats TEXT NOT NULL DEFAULT '{}',
    refilled_at INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    seen_at INTEGER NOT NULL
  );
`

// Stats a player builds up; biggestWin and peak keep the highest, the rest add up
export const STAT_KEYS = ['hands', 'wins', 'losses', 'pushes', 'blackjacks', 'busts', 'doubles', 'splits', 'wagered', 'net', 'biggestWin', 'peak', 'refills']
const HIGHEST = new Set(['biggestWin', 'peak'])

const hashToken = (token) => createHash('sha256').update(String(token)).digest('hex')
const TOKEN = /^[0-9a-f]{48}$/

const readStats = (text) => {
  let stats = {}
  try {
    stats = JSON.parse(text || '{}')
  } catch {
    stats = {}
  }
  return Object.fromEntries(STAT_KEYS.map(key => [key, Number.isFinite(stats[key]) ? stats[key] : 0]))
}

/**
 * @param {string} file  The SQLite file, or ':memory:'
 * @param {object} options
 * @param {number} options.startBalance  Cents a new player starts with
 */
export function openStore (file = ':memory:', { startBalance }) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec(SCHEMA)
  const q = (sql) => db.prepare(sql)
  const s = {
    byHash: q('SELECT * FROM players WHERE token_hash = ?'),
    byId: q('SELECT * FROM players WHERE id = ?'),
    insert: q('INSERT INTO players (token_hash, name, balance, stats, created_at, seen_at) VALUES (?, ?, ?, ?, ?, ?)'),
    rename: q('UPDATE players SET name = ? WHERE id = ?'),
    seen: q('UPDATE players SET seen_at = ? WHERE id = ?'),
    balance: q('SELECT balance FROM players WHERE id = ?'),
    debit: q('UPDATE players SET balance = balance - ? WHERE id = ? AND balance >= ?'),
    credit: q('UPDATE players SET balance = balance + ? WHERE id = ?'),
    stats: q('SELECT stats FROM players WHERE id = ?'),
    setStats: q('UPDATE players SET stats = ? WHERE id = ?'),
    refill: q('UPDATE players SET balance = ?, refilled_at = ? WHERE id = ?'),
    count: q('SELECT COUNT(*) AS n FROM players')
  }

  const transaction = (work) => {
    db.exec('BEGIN IMMEDIATE')
    try {
      const result = work()
      db.exec('COMMIT')
      return result
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
  }

  // Adds a change to the stats; the peak follows the balance
  const record = (id, delta) => transaction(() => {
    const stats = readStats(s.stats.get(id)?.stats)
    for (const [key, value] of Object.entries(delta)) {
      if (!STAT_KEYS.includes(key) || !Number.isFinite(value)) continue
      stats[key] = HIGHEST.has(key) ? Math.max(stats[key], value) : stats[key] + value
    }
    s.setStats.run(JSON.stringify(stats), id)
  })

  const balanceOf = (id) => s.balance.get(id)?.balance ?? 0

  return {
    /** The player a token belongs to, or null. */
    byToken (token) {
      if (!TOKEN.test(String(token))) return null
      const row = s.byHash.get(hashToken(token))
      return row ? { id: row.id, name: row.name } : null
    },

    /** A new player with the starting chips. Returns { token, player }; the token is shown only this once. */
    create (name, now = Date.now()) {
      const token = randomBytes(24).toString('hex')
      const stats = JSON.stringify({ ...readStats('{}'), peak: startBalance })
      const { lastInsertRowid } = s.insert.run(hashToken(token), name, startBalance, stats, now, now)
      return { token, player: { id: Number(lastInsertRowid), name } }
    },

    rename: (id, name) => s.rename.run(name, id),
    seen: (id, now = Date.now()) => s.seen.run(now, id),

    balance: balanceOf,

    /** Takes chips if there are enough; false otherwise. */
    debit (id, cents) {
      if (!Number.isInteger(cents) || cents <= 0) return cents === 0
      return s.debit.run(cents, id, cents).changes === 1
    },

    credit (id, cents) {
      if (!Number.isInteger(cents) || cents <= 0) return
      s.credit.run(cents, id)
      record(id, { peak: balanceOf(id) })
    },

    record,

    /** A broke player's chips back to the start, at most once per `cooldownMs`. */
    refill (id, { below, cooldownMs, now = Date.now() }) {
      return transaction(() => {
        const row = s.byId.get(id)
        if (!row) return { ok: false, err: 'player' }
        if (row.balance >= below) return { ok: false, err: 'notBroke' }
        if (now - row.refilled_at < cooldownMs) return { ok: false, err: 'wait', waitMs: cooldownMs - (now - row.refilled_at) }
        s.refill.run(startBalance, now, id)
        const stats = readStats(row.stats)
        stats.refills++
        s.setStats.run(JSON.stringify(stats), id)
        return { ok: true }
      })
    },

    /** What a player sees of themselves: { name, balance, stats }. */
    profile (id) {
      const row = s.byId.get(id)
      return row ? { name: row.name, balance: row.balance, stats: readStats(row.stats) } : null
    },

    players: () => s.count.get().n,
    close: () => db.close()
  }
}
