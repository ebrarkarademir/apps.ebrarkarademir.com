# Sunny Square server

The server behind Sunny Square, the site's 3D social world (`web/src/world/`). It keeps
accounts, avatars, coins, inventories, home layouts and friendships in one SQLite file, and
relays positions, chat and emotes between players over a WebSocket. Coins and the shop are
decided here only: the browser asks, the server checks and answers.

No dependencies: Node's own `node:http`, `node:sqlite` and `node:crypto`, and a small WebSocket
implementation in `src/websocket.js`.

## Running it

Needs Node 22.5 or newer.

- With the site: `npm run dev` in `web/` starts this server too (port 8787) and passes
  `/world-socket` through the dev server, so the world works at `http://localhost:5173/world`
  and from phones on the same Wi-Fi.
- On its own: `npm start` here.
- Tests: `npm test` (13 tests over real WebSocket connections: accounts, rooms, chat filter and
  rate limits, shop, homes, friends, rewards, the 30-player plaza limit, restarts).

| Variable  | Default                 | What it does                                                   |
| --------- | ----------------------- | -------------------------------------------------------------- |
| `PORT`    | `8787`                  | Where to listen                                                |
| `DB_FILE` | `backend/data/world.db` | The SQLite file (git ignores `data/`)                          |
| `ORIGINS` | any                     | Sites allowed to connect, comma-separated; set it when public |

In `web/`, `WORLD_PORT` moves the dev server's copy off 8787 and `WORLD_SERVER=off` stops it
from starting one.

Endpoints: the game at `/world-socket` (WebSocket) and `GET /health`, which reports the
connections and rooms.

## Hosting

Firebase Hosting only serves files, so this server runs on Google Cloud: the VM
`sunny-square-server` (free-tier e2-micro, us-east1-b) in the project `sunny-square-world`,
with a fixed IP and Caddy in front for HTTPS at `wss://35-207-58-30.sslip.io/world-socket`.
Both sites (dev and prod) are built with that address from `web/.env.production`.

- `deploy/gcp-setup.sh` is the VM's startup script: Node 22, this server as the `world`
  service (code in `/opt/world`, database in `/var/lib/world/world.db`, `ORIGINS` set to the
  sites) and Caddy. It restarts by itself after crashes and reboots.
- Updating the code: copy `src/` to `/opt/world/src` (`gcloud compute scp`) and run
  `sudo systemctl restart world`.
- The VM can be stopped and started in the Cloud console; while it's off the world page says
  the server is off and reconnects by itself when it's back.

## How the world works

- Plazas hold 30 players each; when one is full, the next player gets a second copy. Homes take
  their owner plus friends, 12 at a time.
- Players report where they walk ten times a second at most; the server sends each room one
  snapshot of everyone every 100 ms, and browsers draw others 120 ms in the past, gliding
  between snapshots.
- Chat lines are cleaned (rude words in English, Turkish, Russian and Kazakh are starred out,
  also when written with digits or symbols such as 0, 3, @ and $, or with added accents) and
  limited to 5 in a burst, one more every 1.5 seconds.
- A new account starts with 300 coins and a furnished home. The first sign-in of a day pays
  100 coins and 50 XP, and every minute active in a room pays 5 coins and 10 XP. Level L takes
  50·L·(L−1) XP.
- One connection per account: signing in somewhere else signs the older one out.
