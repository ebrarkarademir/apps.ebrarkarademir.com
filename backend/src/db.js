// The database: accounts, sessions, what everyone owns, their homes and friendships, in one
// SQLite file through Node's built-in node:sqlite. Every coin change happens here, inside a
// transaction.
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomBytes } from 'node:crypto'

const SCHEMA = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    -- Lower-cased name, so Ali and ALI (or Ахмет and АХМЕТ) are the same account
    name_key TEXT NOT NULL UNIQUE,
    pass TEXT NOT NULL,
    avatar TEXT,
    coins INTEGER NOT NULL DEFAULT 0,
    xp INTEGER NOT NULL DEFAULT 0,
    last_daily TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS inventory (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    count INTEGER NOT NULL,
    PRIMARY KEY (user_id, item)
  );
  CREATE TABLE IF NOT EXISTS homes (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    layout TEXT NOT NULL
  );
  -- A request from A to B is two rows: (A, B, 'outgoing') and (B, A, 'incoming').
  -- Accepting turns both into 'friend'.
  CREATE TABLE IF NOT EXISTS friends (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, friend_id)
  );
`

const toUser = (row) => (row ? { ...row, avatar: row.avatar ? JSON.parse(row.avatar) : null } : null)
export const nameKey = (name) => String(name).trim().toLowerCase()

export function openDatabase (file = ':memory:') {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec(SCHEMA)
  const q = (sql) => db.prepare(sql)
  const s = {
    userByName: q('SELECT * FROM users WHERE name_key = ?'),
    userById: q('SELECT * FROM users WHERE id = ?'),
    userByToken: q('SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token = ?'),
    insertUser: q('INSERT INTO users (name, name_key, pass, coins, created_at) VALUES (?, ?, ?, ?, ?)'),
    insertSession: q('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)'),
    deleteSession: q('DELETE FROM sessions WHERE token = ?'),
    setAvatar: q('UPDATE users SET avatar = ? WHERE id = ?'),
    grant: q('UPDATE users SET coins = coins + ?, xp = xp + ? WHERE id = ?'),
    setDaily: q('UPDATE users SET last_daily = ? WHERE id = ?'),
    coins: q('SELECT coins FROM users WHERE id = ?'),
    spend: q('UPDATE users SET coins = coins - ? WHERE id = ?'),
    inventory: q('SELECT item, count FROM inventory WHERE user_id = ?'),
    addItem: q('INSERT INTO inventory (user_id, item, count) VALUES (?, ?, ?) ON CONFLICT (user_id, item) DO UPDATE SET count = count + excluded.count'),
    layout: q('SELECT layout FROM homes WHERE user_id = ?'),
    setLayout: q('INSERT INTO homes (user_id, layout) VALUES (?, ?) ON CONFLICT (user_id) DO UPDATE SET layout = excluded.layout'),
    friendStatus: q('SELECT status FROM friends WHERE user_id = ? AND friend_id = ?'),
    friends: q('SELECT users.id, users.name, users.xp, users.avatar, friends.status FROM friends JOIN users ON users.id = friends.friend_id WHERE friends.user_id = ? ORDER BY users.name'),
    setFriend: q('INSERT INTO friends (user_id, friend_id, status, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (user_id, friend_id) DO UPDATE SET status = excluded.status'),
    deleteFriend: q('DELETE FROM friends WHERE user_id = ? AND friend_id = ?')
  }

  // Runs `work` as one transaction: all of it happens, or none of it
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

  return {
    userByName: (name) => toUser(s.userByName.get(nameKey(name))),
    userById: (id) => toUser(s.userById.get(id)),
    userByToken: (token) => toUser(s.userByToken.get(token)),

    /** A new account with its starting coins, starter items and furnished home. */
    createUser (name, pass, coins, items, layout) {
      return transaction(() => {
        const { lastInsertRowid } = s.insertUser.run(name, nameKey(name), pass, coins, Date.now())
        const id = Number(lastInsertRowid)
        for (const [item, count] of Object.entries(items)) s.addItem.run(id, item, count)
        s.setLayout.run(id, JSON.stringify(layout))
        return toUser(s.userById.get(id))
      })
    },

    createSession (userId) {
      const token = randomBytes(24).toString('hex')
      s.insertSession.run(token, userId, Date.now())
      return token
    },
    deleteSession: (token) => s.deleteSession.run(token),

    setAvatar: (id, avatar) => s.setAvatar.run(JSON.stringify(avatar), id),

    /** Adds coins and XP (once a day too, when `day` is given); returns the account after. */
    grant (id, coins, xp, day = null) {
      return transaction(() => {
        s.grant.run(coins, xp, id)
        if (day) s.setDaily.run(day, id)
        return toUser(s.userById.get(id))
      })
    },

    /** Pays for an item and adds it to the inventory; null when there aren't enough coins. */
    buy (id, item, price) {
      return transaction(() => {
        if ((s.coins.get(id)?.coins ?? 0) < price) return null
        s.spend.run(price, id)
        s.addItem.run(id, item, 1)
        return s.coins.get(id).coins
      })
    },

    inventory: (id) => Object.fromEntries(s.inventory.all(id).map(row => [row.item, row.count])),

    layout: (id) => JSON.parse(s.layout.get(id)?.layout || '[]'),
    setLayout: (id, layout) => s.setLayout.run(id, JSON.stringify(layout)),

    friendStatus: (id, other) => s.friendStatus.get(id, other)?.status || null,
    friends: (id) => s.friends.all(id).map(row => ({ ...row, avatar: row.avatar ? JSON.parse(row.avatar) : null })),
    requestFriend (from, to) {
      transaction(() => {
        s.setFriend.run(from, to, 'outgoing', Date.now())
        s.setFriend.run(to, from, 'incoming', Date.now())
      })
    },
    acceptFriend (id, other) {
      transaction(() => {
        s.setFriend.run(id, other, 'friend', Date.now())
        s.setFriend.run(other, id, 'friend', Date.now())
      })
    },
    removeFriend (id, other) {
      transaction(() => {
        s.deleteFriend.run(id, other)
        s.deleteFriend.run(other, id)
      })
    },

    close: () => db.close()
  }
}
