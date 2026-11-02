// The best lap this device has driven on each track, kept in this browser. A lap counts online
// or solo, against bots or alone.

const KEY = 'raceBestLaps'

function load () {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}')
    return saved && typeof saved === 'object' ? saved : {}
  } catch {
    return {}
  }
}

/** This device's best lap on a track (by its id), in ms, or 0 for none yet. */
export function bestLap (trackId) {
  const ms = load()[trackId]
  return Number.isFinite(ms) && ms > 0 ? ms : 0
}

/** Keeps a lap if it beats the best so far. Returns whether it did. */
export function offerLap (trackId, ms) {
  if (!Number.isFinite(ms) || ms <= 0) return false
  const all = load()
  if (Number.isFinite(all[trackId]) && all[trackId] <= ms) return false
  all[trackId] = Math.round(ms)
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // Remembering it is a nicety only
  }
  return true
}
