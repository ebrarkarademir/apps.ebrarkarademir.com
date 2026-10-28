// Starts the world server: the game's WebSocket at /world-socket and a health check at /health.
// (Not /world: that's the page the game is on, and in development both share one address.)
//
//   PORT     where to listen (8787)
//   DB_FILE  the SQLite file (backend/data/world.db)
//   ORIGINS  sites allowed to connect, comma-separated, e.g. https://apps-76619.web.app;
//            unset allows any (fine on a laptop, not on the internet)
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { openDatabase } from './db.js'
import { createWorld } from './world.js'
import { acceptUpgrade } from './websocket.js'

export function startServer ({ port = 8787, dbFile = ':memory:', origins = [], rewardMs, today } = {}) {
  const db = openDatabase(dbFile)
  const world = createWorld(db, { rewardMs, today })

  const server = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, ...world.stats() }))
      return
    }
    res.writeHead(404)
    res.end()
  })

  server.on('upgrade', (req, socket, head) => {
    const path = req.url.split('?')[0]
    if (path !== '/world-socket' || (origins.length && !origins.includes(req.headers.origin))) {
      socket.destroy()
      return
    }
    acceptUpgrade(req, socket, head, (ws) => world.connect(ws, req.socket.remoteAddress))
  })

  return new Promise((resolve) => {
    server.listen(port, () => resolve({
      port: server.address().port,
      close: () => new Promise((done) => {
        world.close()
        server.close(() => {
          db.close()
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
  console.log(`world server: ws://localhost:${server.port}/world-socket (database ${dbFile})`)
  const stop = () => server.close().then(() => process.exit(0))
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
}
