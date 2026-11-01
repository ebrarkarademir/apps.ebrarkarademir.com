// A small three-line ASCII lettering, like a login banner: names and medal titles on the
// Users page. Letters, digits, _ - . and spaces; accents are dropped. Text with too many
// other characters (another alphabet) gets null, and the page shows it plainly instead.

const GLYPHS = {
  a: [' _ ', '|_|', '| |'],
  b: [' _ ', '|_)', '|_)'],
  c: [' _ ', '|  ', '|_ '],
  d: [' _ ', '| \\', '|_/'],
  e: [' _ ', '|_ ', '|_ '],
  f: [' _ ', '|_ ', '|  '],
  g: [' _ ', '|  ', '|_]'],
  h: ['   ', '|_|', '| |'],
  i: [' ', '|', '|'],
  j: ['  ', ' |', '_|'],
  k: ['  ', '|/', '|\\'],
  l: ['  ', '| ', '|_'],
  m: ['    ', '|\\/|', '|  |'],
  n: ['    ', '|\\ |', '| \\|'],
  o: [' _ ', '| |', '|_|'],
  p: [' _ ', '|_)', '|  '],
  q: [' _ ', '| |', '|_\\'],
  r: [' _ ', '|_)', '| \\'],
  s: [' _ ', '(_ ', ' _)'],
  t: ['___', ' | ', ' | '],
  u: ['   ', '| |', '|_|'],
  v: ['   ', '\\ /', ' v '],
  w: ['    ', '|  |', '|/\\|'],
  x: ['  ', '\\/', '/\\'],
  y: ['   ', '\\_/', ' | '],
  z: ['__', ' /', '/_'],
  0: [' _ ', '|/|', '|_|'],
  1: ['  ', '/|', ' |'],
  2: [' _ ', ' _)', '|_ '],
  3: ['_ ', '_)', '_)'],
  4: ['   ', '|_|', '  |'],
  5: [' _ ', '|_ ', ' _)'],
  6: [' _ ', '|_ ', '|_)'],
  7: ['__', ' /', '/ '],
  8: [' _ ', '(_)', '(_)'],
  9: [' _ ', '(_|', '  |'],
  _: ['   ', '   ', '___'],
  '-': ['  ', '__', '  '],
  '.': [' ', ' ', '.'],
  ' ': ['  ', '  ', '  ']
}

const plain = (text) => String(text || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ı/g, 'i')
  .toLowerCase()

/** The text as three lines of ASCII letters, or null if it isn't written in letters this font has. */
export function banner (text) {
  const chars = [...plain(text)]
  if (!chars.length) return null
  const known = chars.filter(char => GLYPHS[char])
  if (known.length < chars.length * 0.75) return null
  const rows = ['', '', '']
  known.forEach((char, index) => {
    GLYPHS[char].forEach((part, row) => { rows[row] += (index ? ' ' : '') + part })
  })
  return rows.join('\n')
}
