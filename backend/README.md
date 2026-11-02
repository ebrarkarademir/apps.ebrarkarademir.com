# Sunny Square and Blackjack server

The server behind Sunny Square, the site's 3D social world (`web/src/world/`), and Blackjack
(`web/src/games/BlackjackGame.vue`). For the world it keeps accounts, avatars, coins,
inventories, home layouts and friendships in one SQLite file, and relays positions, chat and
emotes between players over a WebSocket. Coins and the shop are decided here only: the browser
asks, the server checks and answers. Blackjack's tables run here too, for the same reason (see
below).

No dependencies: Node's own `node:http`, `node:sqlite` and `node:crypto`, and a small WebSocket
implementation in `src/websocket.js`.

## Running it

Needs Node 22.5 or newer.

- With the site: `npm run dev` in `web/` starts this server too (port 8787) and passes
  `/world-socket` through the dev server, so the world works at `http://localhost:5173/world`
  and from phones on the same Wi-Fi.
- On its own: `npm start` here.
- Tests: `npm test` (33 tests: 13 for the world over real WebSocket connections — accounts,
  rooms, chat filter and rate limits, shop, homes, friends, rewards, the 30-player plaza limit,
  restarts — and 20 for Blackjack: the rules on stacked shoes, and the server over real
  connections).

| Variable  | Default                 | What it does                                                   |
| --------- | ----------------------- | -------------------------------------------------------------- |
| `PORT`    | `8787`                  | Where to listen                                                |
| `DB_FILE` | `backend/data/world.db` | The world's SQLite file (git ignores `data/`); Blackjack keeps `blackjack.db` beside it |
| `ORIGINS` | any                     | Sites allowed to connect, comma-separated; set it when public |

In `web/`, `WORLD_PORT` moves the dev server's copy off 8787 and `WORLD_SERVER=off` stops it
from starting one.

Endpoints: the world at `/world-socket` and Blackjack at `/blackjack-socket` (WebSockets), and
`GET /health`, which reports the connections, rooms and tables.

## Hosting

Firebase Hosting only serves files, so this server runs on Google Cloud: the VM
`sunny-square-server` (free-tier e2-micro, us-east1-b) in the project `sunny-square-world`,
with a fixed IP and Caddy in front for HTTPS at `wss://35-207-58-30.sslip.io/world-socket`.
Both sites (dev and prod) are built with that address from `web/.env.production`.

- `deploy/gcp-setup.sh` is the VM's startup script: Node 22, this server as the `world`
  service (code in `/opt/world`, database in `/var/lib/world/world.db`, `ORIGINS` set to the
  sites) and Caddy. It restarts by itself after crashes and reboots.
- Updating the code: copy `src/` to `/opt/world/src` (`gcloud compute scp`) and run
  `sudo systemctl restart world`, e.g.
  `gcloud compute scp --recurse src sunny-square-server:/tmp/src --zone us-east1-b --project sunny-square-world`, then on the VM
  `sudo rsync -a /tmp/src/ /opt/world/src/ && sudo chown -R world:world /opt/world && sudo systemctl restart world`.
  Blackjack needs no new settings: its database appears beside the world's.
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

## How Blackjack works

- The rules and the table are plain logic with no networking (`src/blackjack/cards.js`,
  `src/blackjack/table.js`); the page imports the same files to practise offline while this
  server can't be reached. `src/blackjack/casino.js` runs the tables and `src/blackjack/store.js`
  keeps the players.
- A 6-deck shoe, shuffled with `crypto.getRandomValues` and reshuffled when three quarters are
  dealt. Blackjack pays 3:2; the dealer draws to 17 and stands on every 17, soft ones too, and
  checks for Blackjack under an ace or a ten. Double on any first two cards (also after a split);
  split equal values up to four hands, aces once with one card each.
- Nothing a player could cheat with leaves the server: the shoe's order stays here, the dealer's
  face-down card is sent only once it's turned, and chips only move when the table logic says
  so (a stake when the cards are dealt, more for a double or a split, the payout when the round
  settles). Money is in cents, so 3:2 is exact. Bets and moves are checked (limits, balance,
  turn, phase), and messages are rate limited.
- Players need no account: the first visit gets a secret token the browser keeps (only its hash
  is stored), with $1,000 in chips. Balance and stats (hands, wins, losses, pushes, Blackjacks,
  busts, doubles, splits, wagered, net, biggest win, best balance, refills) persist. A broke
  player can get $1,000 again, once a minute at most; an address can make 20 new players an hour.
- Tables: a solo table has one seat and deals as soon as its player is ready; a shared table has
  five, joined by its 4-letter code or link, and listed for everyone unless its host says not.
  It deals once everyone at it is ready, or 15 seconds after the first player is (those without
  a bet sit that hand out). A turn not taken in 20 seconds stands. Someone whose connection drops
  keeps their seat for a minute and plays on when back; one connection per player.
