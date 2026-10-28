// The world's colors: the named ones items come in, and the avatar creator's choices.

export const COLORS = {
  white: '#f7f7fb',
  cream: '#f6ead2',
  black: '#363845',
  gray: '#a4abba',
  navy: '#3d4c9e',
  denim: '#5778c4',
  sky: '#7cc7f4',
  mint: '#7fe0c0',
  green: '#66c46a',
  lemon: '#ffe06a',
  peach: '#ffb98a',
  coral: '#ff7f6e',
  red: '#ef5060',
  pink: '#ff9ec4',
  lilac: '#b9a1ff',
  brown: '#9a6b48',
  wood: '#c9925a',
  gold: '#f2c14e',
  sand: '#e6cf9b'
}

export const SKIN = ['#ffe3cc', '#fbd1b0', '#efbd95', '#dca276', '#c4865a', '#a46d45', '#7f5235', '#5e3c27']
export const HAIR = ['#2d2522', '#4a3022', '#7a4a2a', '#a8452a', '#e9c46a', '#f2e8d0', '#ff8fc0', '#6f9cff', '#6fd6b4', '#a77bff']
export const EYES = ['#6b3f22', '#9a7a3a', '#3f9a52', '#3f7fd8', '#7c8a99', '#8b5cd6']

// How many of each choice the creator offers (the server checks the same ranges)
export const CHOICES = { skin: SKIN.length, face: 3, eyes: 5, eyeColor: EYES.length, brows: 4, hair: 8, hairColor: HAIR.length }

/** An item id is kind-model-color, e.g. top-hoodie-lilac. */
export function parseItem (id) {
  if (!id) return null
  const [kind, model, color] = id.split('-')
  return { id, kind, model, color, hex: COLORS[color] || '#cccccc' }
}

export const DEFAULT_LOOK = {
  body: 'f',
  skin: 1,
  face: 0,
  eyes: 0,
  eyeColor: 3,
  brows: 1,
  hair: 4,
  hairColor: 2,
  top: 'top-tee-white',
  bottom: 'bottom-jeans-denim',
  shoes: 'shoes-sneakers-white',
  acc: null
}
