// Chip colours by value (cents) and how money reads, shared by the table and its parts.

// $5 red, $25 green, $100 black, $500 purple, $1K orange, $5K blue, $25K pink, $100K gold and
// $1M white, each with the stripes on its edge
export const CHIP_LOOKS = {
  500: { face: '#d7263d', edge: '#ffffff', text: '#ffffff' },
  2500: { face: '#1b998b', edge: '#ffffff', text: '#ffffff' },
  10000: { face: '#25272b', edge: '#f2c94c', text: '#f2c94c' },
  50000: { face: '#6a4c93', edge: '#f2c94c', text: '#ffffff' },
  100000: { face: '#f2a516', edge: '#1d1d1d', text: '#1d1d1d' },
  500000: { face: '#1f6fd1', edge: '#ffd84a', text: '#ffffff' },
  2500000: { face: '#e84393', edge: '#ffffff', text: '#ffffff' },
  10000000: { face: '#c9a227', edge: '#3a2a05', text: '#2a1d02' },
  100000000: { face: '#f4f1e8', edge: '#d7263d', text: '#1d1d1d' }
}

const formats = new Map()

/** Cents as money: $1,000, or $1,037.50 when there are cents. */
export function money (cents, { sign = false } = {}) {
  const value = Math.abs(cents) / 100
  const whole = Number.isInteger(value)
  const key = whole ? 0 : 2
  if (!formats.has(key)) formats.set(key, new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: key, maximumFractionDigits: 2 }))
  const text = formats.get(key).format(value)
  if (cents < 0) return `-${text}`
  return sign && cents > 0 ? `+${text}` : text
}

/** A chip's value as written on it: $5, $25, $100, $500, $1K, $5K, $25K, $100K, $1M. */
export function chipLabel (cents) {
  const dollars = cents / 100
  if (dollars >= 1000000) return `$${dollars / 1000000}M`
  return dollars >= 1000 ? `$${dollars / 1000}K` : `$${dollars}`
}
