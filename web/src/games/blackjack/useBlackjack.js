import { reactive, watch, onMounted, onUnmounted } from 'vue'
import { createConnection } from '../../world/net'
import { Table, RULES } from '@blackjack/table.js'
import { ensureName } from '../../online/profile'

// Blackjack in the browser: the connection to the server that runs the tables (see
// backend/src/blackjack), this player's chips and stats, and the table they sit at. The page
// only ever asks: bet, deal, hit, stand, double, split. The server decides and sends back what
// the player may see.
//
// A player is a secret token this browser keeps, handed out by the server the first time.
//
// While the server can't be reached, the same table logic can run here instead, as a practice
// table with chips of its own kept in this browser; nothing from it counts on the server.

const TOKEN_KEY = 'blackjackToken'
const PRACTICE_KEY = 'blackjackPractice'
const ERROR_MS = 3500
const PRACTICE_TICK_MS = 100

export function blackjackUrl () {
  const configured = import.meta.env.VITE_BLACKJACK_URL
  if (configured) return configured
  // Built sites reach the same server as Sunny Square
  const world = import.meta.env.VITE_WORLD_URL
  if (world) return world.replace(/\/world-socket$/, '/blackjack-socket')
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/blackjack-socket`
}

const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

const saveToken = (token) => {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Without storage the chips only last this visit
  }
}

// The table as it arrived, with its countdown turned into a time on this device
const withDeadline = (view) => ({ ...view, deadline: view.msLeft ? Date.now() + view.msLeft : 0 })

/** @param {() => string} nameOf  The player's name, asked for whenever it's sent */
export function useBlackjack (nameOf) {
  const state = reactive({
    status: 'idle', // the connection: idle | connecting | open | down
    ready: false, // signed in with the server
    practice: false, // playing the offline practice table instead
    profile: null, // { name, balance, stats }
    rules: RULES,
    table: null, // the table this player sits at, as they may see it
    tables: [], // open tables others can join
    error: '', // the last thing refused, for a moment
    busy: false
  })

  const conn = createConnection(blackjackUrl())
  let errorTimer = null
  let practice = null

  function showError (err) {
    state.error = err || 'offline'
    clearTimeout(errorTimer)
    errorTimer = setTimeout(() => { state.error = '' }, ERROR_MS)
  }

  // Signs in with the token this browser keeps (or gets one), under the site name, which a
  // first-time visitor may not have yet: it's made up first
  async function hello () {
    await ensureName()
    const res = await conn.call('hello', { token: readToken(), name: nameOf() })
    if (!res.ok) {
      showError(res.err)
      return
    }
    if (res.token) saveToken(res.token)
    state.profile = res.profile
    if (res.rules) state.rules = res.rules
    state.ready = true
    if (!state.table) listTables()
  }

  conn.on('status', (status) => {
    state.status = status
    if (status === 'open') hello()
    else state.ready = false
  })
  conn.on('table', (msg) => {
    if (state.practice) return
    state.table = withDeadline(msg.view)
    if (msg.me) state.profile = msg.me
  })
  conn.on('replaced', () => {
    state.error = 'replaced'
    conn.close()
  })

  // Asks the server, or the practice table; a refusal shows for a moment
  async function call (t, data = {}) {
    if (state.practice) return practice.call(t, data)
    state.busy = true
    const res = await conn.call(t, data)
    state.busy = false
    if (!res.ok) showError(res.err)
    return res
  }

  async function listTables () {
    if (state.practice || !state.ready) return
    const res = await conn.call('tables')
    if (res.ok) state.tables = res.tables
  }

  const actions = {
    playSolo: () => call('create', { kind: 'solo' }),
    openTable: (isPublic = true) => call('create', { kind: 'shared', public: isPublic }),
    join: (code) => call('join', { code: String(code).trim().toUpperCase() }),
    async leave () {
      const res = await call('leave')
      if (res.ok) {
        state.table = null
        listTables()
      }
      return res
    },
    bet: (amount) => call('bet', { amount }),
    deal: () => call('ready'),
    act: (action) => call('act', { action }),
    async refill () {
      const res = await call('refill')
      if (res.ok && res.profile) state.profile = res.profile
      return res
    },
    listTables,
    reconnect: () => conn.open(),
    startPractice () {
      practice ||= createPractice(state, nameOf)
      state.practice = true
      practice.start()
    },
    stopPractice () {
      practice?.stop()
      state.practice = false
      state.table = null
      state.profile = null
      if (conn.state.status === 'open') hello()
    }
  }

  // A new name reaches the table at once
  watch(nameOf, () => {
    if (state.ready && !state.practice) conn.call('hello', { token: readToken(), name: nameOf() })
  })

  onMounted(() => conn.open())
  onUnmounted(() => {
    clearTimeout(errorTimer)
    practice?.stop()
    conn.close()
  })

  return { state, ...actions }
}

// ---------- Practice, while the server is away ----------

function loadPractice () {
  try {
    const saved = JSON.parse(localStorage.getItem(PRACTICE_KEY) || 'null')
    if (saved && Number.isInteger(saved.balance) && saved.stats && typeof saved.stats === 'object') return saved
  } catch {
    // Start over
  }
  return { balance: RULES.startBalance, stats: { peak: RULES.startBalance } }
}

function createPractice (state, nameOf) {
  const saved = loadPractice()
  const persist = () => {
    try {
      localStorage.setItem(PRACTICE_KEY, JSON.stringify(saved))
    } catch {
      // Practice chips only last this visit
    }
  }
  const wallet = {
    balance: () => saved.balance,
    debit (id, cents) {
      if (saved.balance < cents) return false
      saved.balance -= cents
      persist()
      return true
    },
    credit (id, cents) {
      saved.balance += cents
      saved.stats.peak = Math.max(saved.stats.peak || 0, saved.balance)
      persist()
    },
    record (id, delta) {
      for (const [key, value] of Object.entries(delta)) {
        saved.stats[key] = key === 'biggestWin' || key === 'peak' ? Math.max(saved.stats[key] || 0, value) : (saved.stats[key] || 0) + value
      }
      persist()
    }
  }
  let table = null
  let timer = null

  const show = () => {
    state.table = withDeadline(table.view('me', Date.now()))
    state.profile = { name: nameOf(), balance: saved.balance, stats: { ...saved.stats } }
  }

  return {
    start () {
      table = new Table({ id: 'practice', code: '', kind: 'solo', wallet })
      table.sit('me', nameOf())
      clearInterval(timer)
      timer = setInterval(() => {
        if (table.tick(Date.now())) show()
      }, PRACTICE_TICK_MS)
      show()
    },
    stop () {
      clearInterval(timer)
      table = null
    },
    call (t, data) {
      const now = Date.now()
      let res = { ok: false, err: 'unknown' }
      if (t === 'bet') res = table.bet('me', data.amount, now)
      else if (t === 'ready') res = table.ready('me', now)
      else if (t === 'act') res = table.act('me', data.action, now)
      else if (t === 'refill') {
        if (saved.balance >= RULES.minBet) res = { ok: false, err: 'notBroke' }
        else {
          saved.balance = RULES.startBalance
          saved.stats.refills = (saved.stats.refills || 0) + 1
          persist()
          res = { ok: true }
        }
      } else if (t === 'leave') res = { ok: true }
      if (!res.ok) {
        state.error = res.err
        setTimeout(() => { if (state.error === res.err) state.error = '' }, ERROR_MS)
      }
      if (table) show()
      return Promise.resolve(res)
    }
  }
}
