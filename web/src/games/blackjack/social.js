// The table's social side: emotes, the bar and gifts. The list of what there is, and the host's
// rules for it, with no networking; room.js keeps it in the room's state (`social`), so everyone
// at the table sees the same thing.
//
// An emote is a pixel-art bubble over the sender's seat for a moment. The bar sells drinks,
// smokes, food and a few silly things for chips, as many as anyone likes. Whatever someone orders
// stands at a seat, theirs or, as a gift, someone else's or the dealer's, until it's finished.
// The dealer says thank you for a gift (or makes a face at a cheeky one).
//
// The state: `feed` is the last few things that happened, numbered, for the browsers to show once
// each; `items` is what stands at each seat (by player id, or 'dealer'); `last` is when each
// player last sent an emote or ordered, so nobody can flood the table.

export const DEALER = 'dealer'

export const EMOTES = ['heart', 'laugh', 'cry', 'angry', 'cool', 'money', 'wow', 'think', 'thumbs', 'gg', 'fire', 'skull', 'sweat', 'sleep', 'party', 'clover']

export const CATEGORIES = ['drinks', 'smoke', 'food', 'fun']

// price: cents; ms: how long it stands at the seat; fx: the little animation that goes with it;
// over: shows above the seat rather than on the table in front of it; thanks: the dealer's emote
// when it's a gift for them (a heart unless it says otherwise)
export const MENU = [
  { id: 'tea', cat: 'drinks', price: 500, ms: 90000, fx: 'steam' },
  { id: 'coffee', cat: 'drinks', price: 1000, ms: 90000, fx: 'steam' },
  { id: 'cola', cat: 'drinks', price: 1000, ms: 90000, fx: 'fizz' },
  { id: 'beer', cat: 'drinks', price: 2500, ms: 120000, fx: 'fizz' },
  { id: 'wine', cat: 'drinks', price: 4000, ms: 120000 },
  { id: 'raki', cat: 'drinks', price: 5000, ms: 150000 },
  { id: 'cocktail', cat: 'drinks', price: 5000, ms: 120000 },
  { id: 'whiskey', cat: 'drinks', price: 7500, ms: 150000, thanks: 'cool' },
  { id: 'champagne', cat: 'drinks', price: 25000, ms: 150000, fx: 'sparkle', thanks: 'party' },

  { id: 'cigarette', cat: 'smoke', price: 1000, ms: 60000, fx: 'smoke' },
  { id: 'cigar', cat: 'smoke', price: 10000, ms: 120000, fx: 'smoke', thanks: 'cool' },
  { id: 'hookah', cat: 'smoke', price: 15000, ms: 240000, fx: 'hookah', thanks: 'cool' },

  { id: 'nuts', cat: 'food', price: 1000, ms: 90000 },
  { id: 'simit', cat: 'food', price: 1000, ms: 90000 },
  { id: 'fries', cat: 'food', price: 1500, ms: 90000 },
  { id: 'pizza', cat: 'food', price: 2500, ms: 90000 },
  { id: 'burger', cat: 'food', price: 3000, ms: 90000 },
  { id: 'doner', cat: 'food', price: 3500, ms: 90000 },

  { id: 'rose', cat: 'fun', price: 2500, ms: 90000, fx: 'hearts' },
  { id: 'duck', cat: 'fun', price: 2000, ms: 90000, thanks: 'laugh' },
  { id: 'lemon', cat: 'fun', price: 500, ms: 60000, thanks: 'angry' },
  { id: 'tissues', cat: 'fun', price: 1000, ms: 60000, thanks: 'cry' },
  { id: 'toilet', cat: 'fun', price: 1000, ms: 60000, thanks: 'sweat' },
  { id: 'fish', cat: 'fun', price: 1500, ms: 60000, fx: 'stink', thanks: 'skull' },
  { id: 'cloud', cat: 'fun', price: 5000, ms: 30000, fx: 'rain', over: true, thanks: 'cry' },
  { id: 'horseshoe', cat: 'fun', price: 5000, ms: 120000, fx: 'sparkle', thanks: 'clover' },
  { id: 'trophy', cat: 'fun', price: 10000, ms: 120000, fx: 'sparkle', thanks: 'party' },
  { id: 'crown', cat: 'fun', price: 20000, ms: 120000, fx: 'sparkle', thanks: 'cool' }
]

const ITEMS = Object.fromEntries(MENU.map(item => [item.id, item]))

/** A menu item by id, or null. */
export const itemOf = (id) => (typeof id === 'string' && Object.hasOwn(ITEMS, id) ? ITEMS[id] : null)

const EMOTE_GAP = 1000 // ms between one player's emotes
const ORDER_GAP = 500 // ...and between their orders
const FEED_MS = 8000 // how long something stays in the feed
const FEED_MAX = 24
const ITEMS_MAX = 6 // at one seat; the oldest goes when there's another
const THANKS_MS = 1400 // the dealer's answer to a gift, this long after it lands

export const socialState = (n = 0) => ({ n, feed: [], items: {}, last: {} })

function post (social, event, at) {
  social.n++
  social.feed.push({ n: social.n, at, ...event })
  if (social.feed.length > FEED_MAX) social.feed.splice(0, social.feed.length - FEED_MAX)
}

function tooSoon (social, key, gap, now) {
  if (now - (social.last[key] || 0) < gap) return true
  social.last[key] = now
  return false
}

/** An emote from a player. Returns why it was refused ('emote', 'slow'), or ''. */
export function sendEmote (social, from, k, now) {
  if (!EMOTES.includes(k)) return 'emote'
  if (tooSoon(social, `e:${from}`, EMOTE_GAP, now)) return 'slow'
  post(social, { type: 'emote', from, k }, now)
  return ''
}

/**
 * An order at the bar: item `k` for `to`, which is the buyer (the default), someone else at the
 * table, or the dealer. It's paid from the buyer's chips through `wallet` ({ debit(id, cents),
 * record(id, delta) }); `seated(id)` says who is at the table to be given something.
 * Returns why it was refused ('item', 'seat', 'giftSeat', 'slow', 'funds'), or ''.
 */
export function placeOrder (social, wallet, from, { k, to }, now, seated) {
  const item = itemOf(k)
  if (!item) return 'item'
  const target = typeof to === 'string' && to ? to : from
  if (target !== DEALER && !seated(target)) return target === from ? 'seat' : 'giftSeat'
  if (tooSoon(social, `o:${from}`, ORDER_GAP, now)) return 'slow'
  if (!wallet.debit(from, item.price)) {
    delete social.last[`o:${from}`]
    return 'funds'
  }
  const gift = target !== from
  wallet.record(from, { barTab: item.price, gifts: gift ? 1 : 0 })
  post(social, { type: gift ? 'gift' : 'order', from, to: target, k }, now)
  const list = (social.items[target] ||= [])
  list.push({ n: social.n, k, from, until: now + item.ms })
  if (list.length > ITEMS_MAX) list.splice(0, list.length - ITEMS_MAX)
  if (target === DEALER) post(social, { type: 'emote', from: DEALER, k: item.thanks || 'heart' }, now + THANKS_MS)
  return ''
}

/** Clears out what's been finished and what's old news. Returns whether anything changed. */
export function pruneSocial (social, now) {
  let changed = false
  const fresh = social.feed.filter(event => event.at > now - FEED_MS)
  if (fresh.length !== social.feed.length) {
    social.feed = fresh
    changed = true
  }
  for (const [id, list] of Object.entries(social.items)) {
    const left = list.filter(item => item.until > now)
    if (left.length === list.length) continue
    changed = true
    if (left.length) social.items[id] = left
    else delete social.items[id]
  }
  return changed
}

/**
 * What everyone sees, with times relative to now (devices' clocks differ): each event's age (ms,
 * negative while it's still to come) and how long each item has left.
 */
export function projectSocial (social, now) {
  if (!social) return { feed: [], items: {} }
  return {
    feed: social.feed.map(({ at, ...event }) => ({ ...event, age: now - at })),
    items: Object.fromEntries(Object.entries(social.items).map(([id, list]) => [
      id,
      list.map(({ until, ...item }) => ({ ...item, left: Math.max(0, until - now) }))
    ]))
  }
}
