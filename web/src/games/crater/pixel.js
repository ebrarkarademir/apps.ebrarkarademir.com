// Crater Duel's pixel art: little sprites from rows of letters, each letter a color, drawn with
// a dark outline round them, and the weapon icons the controls show made from the same sprites.

export const OUTLINE = '#141018'

const hexRgb = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
export const rgbOf = hexRgb
export const darken = (hex, f) => '#' + hexRgb(hex).map(v => Math.round(v * f).toString(16).padStart(2, '0')).join('')
export const mixHex = (a, b, k) => '#' + hexRgb(a).map((v, i) => Math.round(v + (hexRgb(b)[i] - v) * k).toString(16).padStart(2, '0')).join('')

/**
 * A sprite as a canvas: `rows` of letters, '.' for nothing, `colors` for each letter. With
 * `outline` it gets a pixel of OUTLINE all round (the canvas is one pixel bigger each side).
 * `mirror` flips it left to right.
 */
export function sprite (rows, colors, { outline = true, mirror = false } = {}) {
  const w = rows[0].length
  const h = rows.length
  const pad = outline ? 1 : 0
  const canvas = document.createElement('canvas')
  canvas.width = w + pad * 2
  canvas.height = h + pad * 2
  const g = canvas.getContext('2d')
  const at = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return '.'
    return rows[y][mirror ? w - 1 - x : x]
  }
  if (outline) {
    g.fillStyle = OUTLINE
    for (let y = -1; y <= h; y++) {
      for (let x = -1; x <= w; x++) {
        if (at(x, y) !== '.') continue
        if (at(x - 1, y) !== '.' || at(x + 1, y) !== '.' || at(x, y - 1) !== '.' || at(x, y + 1) !== '.') g.fillRect(x + pad, y + pad, 1, 1)
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = at(x, y)
      if (ch === '.' || !colors[ch]) continue
      g.fillStyle = colors[ch]
      g.fillRect(x + pad, y + pad, 1, 1)
    }
  }
  return canvas
}

// A soldier facing right, 7 by 12: helmet, face, shirt in the side's color, belt, trousers,
// boots; the second pose is a step. The gun is drawn on its own, at the aim.
export const SOLDIER = [
  [
    '..hhh..',
    '.hhhhhh',
    '..sse..',
    '..sss..',
    '.ccccc.',
    'ccccccc',
    '.ccccc.',
    '.bbbbb.',
    '.pp.pp.',
    '.pp.pp.',
    '.pp.pp.',
    '.kk.kk.'
  ],
  [
    '..hhh..',
    '.hhhhhh',
    '..sse..',
    '..sss..',
    '.ccccc.',
    'ccccccc',
    '.ccccc.',
    '.bbbbb.',
    '.ppppp.',
    'pp...pp',
    'pp...pp',
    'kk...kk'
  ]
]

export const GRAVE = [
  '.ggg.',
  'ggcgg',
  'gcccg',
  'ggcgg',
  'ggcgg',
  'ggggg'
]

export const ARROW = [
  'aaaaa',
  '.aaa.',
  '..a..'
]

// What flies, by its place in KINDS (physics.js): shell, grenade, cluster, bomblet, molotov,
// dynamite (a flame is drawn as loose pixels of fire)
export const SHOTS = [
  ['.c.', 'cwc', '.c.'],
  ['.yy.', 'gggg', 'gGgg', '.gg.'],
  ['.cc.', 'cwcc', 'cccc', '.cc.'],
  ['cc', 'cc'],
  ['.f.', '.n.', 'bbb', 'bwb', 'bbb'],
  ['.s', 'rr', 'rr', 'yy', 'rr', 'rr']
]
export const SHOT_COLORS = { w: '#ffffff', y: '#c8c8c8', g: '#3a5a2a', G: '#7a9a5a', f: '#ffb000', n: '#5a8a4a', b: '#3f7a3a', r: '#d8312a', s: '#ffe070' }

// The weapon icons for the controls, as pictures: each weapon's sprite in a box, in the given color
const ICON_FOR = { shell: 0, grenade: 1, cluster: 2, molotov: 4, dynamite: 5 }
const icons = {}
export function weaponIcon (id, color = '#ffb000') {
  const key = id + color
  if (icons[key]) return icons[key]
  const rows = SHOTS[ICON_FOR[id]]
  const art = sprite(rows, { ...SHOT_COLORS, c: color, y: id === 'dynamite' ? '#ffd27a' : SHOT_COLORS.y })
  const box = document.createElement('canvas')
  box.width = box.height = 10
  const g = box.getContext('2d')
  g.drawImage(art, Math.floor((10 - art.width) / 2), Math.floor((10 - art.height) / 2))
  icons[key] = box.toDataURL()
  return icons[key]
}
