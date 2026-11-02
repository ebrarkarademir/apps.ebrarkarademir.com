// Starts the server: Sunny Square's WebSocket at /world-socket, Blackjack's at /blackjack-socket
// and a health check at /health. (Not /world or /blackjack: those are the pages the games are
// on, and in development the pages and the sockets share one address.)
//
//   PORT     where to listen (8787)
//   DB_FILE  the world's SQLite file (backend/data/world.db); Blackjack keeps blackjack.db beside it
//   ORIGINS  sites allowed to connect, comma-separated, e.g. https://apps-76619.web.app;
//            unset allows any (fine on a laptop, not on the internet)
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { openDatabase } from './db.js'
import { createWorld } from './world.js'
import { acceptUpgrade } from './websocket.js'
import { openStore } from './blackjack/store.js'
import { createCasino } from './blackjack/casino.js'
import { RULES } from './blackjack/table.js'

export function startServer ({ port = 8787, dbFile = ':memory:', blackjackDbFile, origins = [], rewardMs, today, blackjack = {} } = {}) {
  const db = openDatabase(dbFile)
  const world = createWorld(db, { rewardMs, today })
  const store = openStore(blackjackDbFile ?? (dbFile === ':memory:' ? ':memory:' : join(dirname(dbFile), 'blackjack.db')), { startBalance: (blackjack.rules || RULES).startBalance })
  const casino = createCasino(store, blackjack)

  const server = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, ...world.stats(), blackjack: casino.stats() }))
      return
    }
    res.writeHead(404)
    res.end()
  })

  server.on('upgrade', (req, socket, head) => {
    const path = req.url.split('?')[0]
    const game = path === '/world-socket' ? world : path === '/blackjack-socket' ? casino : null
    if (!game || (origins.length && !origins.includes(req.headers.origin))) {
      socket.destroy()
      return
    }
    acceptUpgrade(req, socket, head, (ws) => game.connect(ws, req.socket.remoteAddress))
  })

  return new Promise((resolve) => {
    server.listen(port, () => resolve({
      port: server.address().port,
      close: () => new Promise((done) => {
        world.close()
        casino.close()
        server.close(() => {
          db.close()
          store.close()
          done()
        })
      })
    }))
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8787
  const dbFile = process.env.DB_FILE || fileURLToPath(new URL('../data/world.db', import.meta.url))
  const origins = (process.env.ORIGINS || '').split(',').map(origin => origin.trim()).filter(Boolean)
  const server = await startServer({ port, dbFile, origins })
  console.log(`world server: ws://localhost:${server.port}/world-socket and /blackjack-socket (database ${dbFile})`)
  const stop = () => server.close().then(() => process.exit(0))
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
}
