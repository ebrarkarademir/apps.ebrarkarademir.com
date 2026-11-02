import { reactive, ref, watch } from 'vue'

// Who this visitor is on the site, kept in this browser: a name, a user number, an ASCII face,
// a few words about themselves, where they're from, and what they've done (for the medals).
//
// A new visitor gets a name made of coding and networking words plus their user number, e.g.
// tomcat_7 or cmd_bash_34. The number is the order they signed on in: the users list keeps a
// counter on the relay brokers (see useUsers.js) and hands the next one out. Anyone can change
// the name, the face and the rest whenever they like.

const KEY = 'profile'
const OLD_NAME_KEY = 'onlineName'
const UID_WAIT_MS = 2500 // how long a name waits for the user number before making do with a random one

export const MAX_NAME = 18
export const MAX_BIO = 120

export const cleanName = (name) => String(name || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME)
export const cleanBio = (bio) => String(bio || '').replace(/\s+/g, ' ').trim().slice(0, MAX_BIO)

// The online games, for the medal that asks for all of them
export const ONLINE_GAME_IDS = ['tanks', 'crater', 'blackjack', 'futsal', 'race', 'doodle', 'sudoku', 'chess', 'dama', 'quiz-race', 'casus-kim', 'tabu']

const blankStats = () => ({ hosted: 0, joined: 0, chats: 0, minutes: 0, wins: {}, played: {} })

function load () {
  let saved = null
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || 'null')
  } catch {
    saved = null
  }
  let oldName = ''
  try {
    oldName = localStorage.getItem(OLD_NAME_KEY) || localStorage.getItem('quizName') || ''
  } catch {
    // Storage blocked: start fresh every time
  }
  const stats = { ...blankStats(), ...(saved?.stats || {}) }
  return {
    name: cleanName(saved?.name ?? oldName),
    // A name the visitor picked (or typed before names were made up) isn't offered for a change
    custom: saved ? !!saved.custom : !!oldName,
    uid: Number.isInteger(saved?.uid) && saved.uid > 0 ? saved.uid : 0,
    avatar: Number.isInteger(saved?.avatar) ? saved.avatar : Math.floor(Math.random() * 2 ** 31),
    bio: cleanBio(saved?.bio),
    country: /^[A-Z]{2}$/.test(saved?.country || '') ? saved.country : '', // '' = from the IP address
    stats
  }
}

export const profile = reactive(load())

// Where the visitor's IP address is, as a country code; their own pick wins over it
export const autoCountry = ref('')
export const countryOf = () => profile.country || autoCountry.value

watch(profile, () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile))
  } catch {
    // A full or blocked storage only means it's forgotten next time
  }
}, { deep: true })

// ---------- Names ----------

const SINGLE = [
  'tomcat', 'nginx', 'apache', 'kernel', 'daemon', 'cron', 'grep', 'vim', 'emacs', 'docker', 'redis', 'mongo',
  'socket', 'packet', 'router', 'proxy', 'gateway', 'subnet', 'netcat', 'nmap', 'curl', 'wget', 'gopher', 'lambda',
  'mutex', 'thread', 'pipe', 'stack', 'heap', 'cache', 'buffer', 'cookie', 'token', 'sudo', 'chmod', 'systemd',
  'regex', 'binary', 'localhost', 'loopback', 'ifconfig', 'netstat', 'firewall', 'modem', 'ethernet', 'telnet',
  'segfault', 'async', 'callback', 'grub', 'unix', 'tux', 'bash', 'zsh', 'awk', 'ping', 'traceroute', 'webhook'
]
const PREFIX = [
  'cmd', 'net', 'sys', 'dev', 'root', 'sudo', 'null', 'void', 'tcp', 'udp', 'http', 'ssh', 'git', 'bin', 'usr',
  'tmp', 'proc', 'async', 'kernel', 'data', 'hex', 'raw', 'lan', 'wan', 'ip', 'mac', 'dns', 'web', 'api', 'cli', 'tty'
]
const SUFFIX = [
  'bash', 'zsh', 'ping', 'packet', 'socket', 'router', 'daemon', 'proxy', 'cache', 'cookie', 'token', 'pipe', 'fork',
  'thread', 'mutex', 'shell', 'stack', 'heap', 'buffer', 'port', 'host', 'node', 'admin', 'user', 'ghost', 'wizard',
  'ninja', 'hacker', 'bot', 'worm', 'byte', 'bit', 'loop', 'hook', 'patch', 'panic', 'dump', 'trace', 'sniffer',
  'tunnel', 'bridge', 'switch', 'hub', 'link', 'frame', 'cable', 'cron', 'grep', 'vim'
]

const pick = (list, random = Math.random) => list[Math.floor(random() * list.length)]

/** A made-up name: one word or two joined by _, then the user number, e.g. tomcat_7 or cmd_bash_34. */
export function randomName (number) {
  let words = ''
  for (let i = 0; i < 20; i++) {
    if (Math.random() < 0.35) {
      words = pick(SINGLE)
    } else {
      const first = pick(PREFIX)
      const second = pick(SUFFIX)
      if (first === second) continue
      words = `${first}_${second}`
    }
    if (words.length + String(number).length + 1 <= MAX_NAME) break
  }
  return cleanName(`${words}_${number}`)
}

// The user number came: a visitor without a name gets one with it
export function setUid (uid) {
  if (profile.uid || !Number.isInteger(uid) || uid < 1) return
  profile.uid = uid
  if (!profile.name) {
    profile.name = randomName(uid)
    profile.custom = false
  }
}

const waitFor = (check, ms) => new Promise((resolve) => {
  const started = Date.now()
  const timer = setInterval(() => {
    if (check() || Date.now() - started > ms) {
      clearInterval(timer)
      resolve(check())
    }
  }, 100)
})

/** Resolves with this visitor's name, making one up first if they have none. */
export async function ensureName () {
  if (profile.name) return profile.name
  if (!profile.uid) await waitFor(() => profile.uid || profile.name, UID_WAIT_MS)
  if (!profile.name) {
    profile.name = randomName(profile.uid || 1 + Math.floor(Math.random() * 999))
    profile.custom = false
  }
  return profile.name
}

// ---------- ASCII faces ----------
// Built from parts picked by a number, so everyone draws the same face for the same number.
// Every line is 9 characters wide.

const TOPS = ['  .---.  ', '  _____  ', ' /\\___/\\ ', '  ,,,,,  ', '   \\|/   ', '  .~~~.  ', '  [###]  ', '  _/^\\_  ', '   ___   ', '  \\\\|//  ', '  .vvv.  ', '  (===)  ']
const EDGES = [['(', ')'], ['[', ']'], ['{', '}'], ['|', '|'], ['<', '>'], ['(', ')']]
const EYES = [' o o ', ' ^ ^ ', ' - o ', ' * * ', ' 0 0 ', ' @ @ ', ' x x ', ' > < ', ' o O ', ' $ $ ', ' # # ', ' . . ', ' = = ', ' u u ']
const MOUTHS = ['  _  ', '  ~  ', '  o  ', '  v  ', '  w  ', ' --- ', '  =  ', ' \\_/ ', '  3  ', ' ___ ', '  D  ', '  ^  ']
const BOTTOMS = ["  '---'  ", "  `---'  ", '  \\___/  ', "  '==='  ", '   \\_/   ', "  '~~~'  "]

// A small seeded random number generator (mulberry32)
function seeded (seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function faceParts (seed) {
  const random = seeded(Number(seed) || 0)
  return { top: pick(TOPS, random), edge: pick(EDGES, random), eyes: pick(EYES, random), mouth: pick(MOUTHS, random), bottom: pick(BOTTOMS, random) }
}

/** The face as four lines of text; `blink` closes the eyes. */
export function faceLines (seed, blink = false) {
  const { top, edge: [left, right], eyes, mouth, bottom } = faceParts(seed)
  return [top, ` ${left}${blink ? ' - - ' : eyes}${right} `, ` ${left}${mouth}${right} `, bottom]
}

/** The same face on one line, for lists: (o_O) */
export function faceLine (seed) {
  const { edge: [left, right], eyes, mouth } = faceParts(seed)
  const [eye1, eye2] = eyes.trim().split(' ')
  const middle = mouth.trim()
  return `${left}${eye1}${middle.length === 3 ? middle[1] : middle}${eye2}${right}`
}

// ---------- Stats and medals ----------
// Medals are named like the groups of a Linux user, and each has a mark for its ASCII badge

const totalWins = (stats) => Object.values(stats.wins || {}).reduce((sum, n) => sum + n, 0)
const gamesPlayed = (stats) => ONLINE_GAME_IDS.filter(game => stats.played?.[game] > 0).length

export const MEDALS = [
  { id: 'sys', gid: 3, mark: '0', goal: 100, have: (s, uid) => (uid > 0 && uid <= 100 ? 100 : 0) },
  { id: 'root', gid: 0, mark: '#', goal: 1, have: (s) => s.hosted },
  { id: 'netdev', gid: 109, mark: '~', goal: 5, have: (s) => s.joined },
  { id: 'sudo', gid: 27, mark: '$', goal: 1, have: totalWins },
  { id: 'wheel', gid: 10, mark: '@', goal: 10, have: totalWins },
  { id: 'staff', gid: 50, mark: '"', goal: 25, have: (s) => s.chats },
  { id: 'daemon', gid: 1, mark: '&', goal: 60, have: (s) => s.minutes },
  { id: 'all_admin', gid: 1337, mark: '*', goal: ONLINE_GAME_IDS.length, have: gamesPlayed }
]
export const MEDAL_IDS = MEDALS.map(medal => medal.id)

/** The medals someone with these stats has earned, by id. */
export const earnedMedals = (stats, uid) =>
  MEDALS.filter(medal => medal.have({ ...blankStats(), ...stats }, uid) >= medal.goal).map(medal => medal.id)

/** How far along this visitor is with a medal: { have, goal } */
export const medalProgress = (medal) => ({ have: Math.min(medal.goal, medal.have(profile.stats, profile.uid)), goal: medal.goal })

export function recordStat (kind, game) {
  const stats = profile.stats
  if (kind === 'win' || kind === 'played') {
    const key = kind === 'win' ? 'wins' : 'played'
    stats[key] = { ...stats[key], [game]: (stats[key]?.[game] || 0) + 1 }
  } else if (kind in stats) {
    stats[kind]++
  }
}

/** A game calls this when this player wins a round. */
export const recordWin = (game) => recordStat('win', game)
