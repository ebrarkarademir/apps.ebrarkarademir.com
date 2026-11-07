// Head Ball's players: six big heads to pick from, each a skin, a hair color and a hair style.
// The shirt goes by the side: red on the left, blue on the right.

export const CHARACTERS = [
  { id: 'kid', skin: '#f2c8a0', hair: '#4a2a14', style: 'short' },
  { id: 'spike', skin: '#e0a878', hair: '#ffd23a', style: 'spiky' },
  { id: 'afro', skin: '#8a5634', hair: '#1c1410', style: 'afro' },
  { id: 'band', skin: '#f6d2b0', hair: '#e8402a', style: 'band' },
  { id: 'long', skin: '#f2c8a0', hair: '#c8642a', style: 'long' },
  { id: 'cap', skin: '#c8946a', hair: '#2a8a4a', style: 'cap' }
]

export const SHIRTS = ['#e8402a', '#2f6ee8']
export const SHIRT_DARK = ['#9a2216', '#1a3e94']

export const lookOf = (n) => (Number.isInteger(n) && n >= 0 && n < CHARACTERS.length ? n : 0)

/** A different look from `n`, at random, for the computer player. */
export function otherLook (n) {
  const pick = Math.floor(Math.random() * (CHARACTERS.length - 1))
  return pick >= n ? pick + 1 : pick
}
