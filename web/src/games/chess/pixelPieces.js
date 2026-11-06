import { grid } from '../../pixel/kit'

// The chess and dama pieces as pixel art, 16 by 16, for both the board (a canvas) and the page
// round it (an SVG, see ChessPiece.vue). Each shape is a mask of '#'; the light comes from the
// left, so each row's run of pixels gets a highlight at its left end and shade at its right,
// and a dark outline goes round the whole piece. Gaps inside a shape (the bishop's slit, the
// knight's eye) fill with the outline's color.

export const SIDE_COLORS = {
  w: { fill: '#f4f4f4', light: '#ffffff', shade: '#a6b7c6', line: '#10111d' },
  b: { fill: '#3d4766', light: '#6a7fa0', shade: '#1f2438', line: '#0a0b12' }
}

const MASKS = {
  p: [
    '................',
    '................',
    '................',
    '.......##.......',
    '......####......',
    '......####......',
    '.......##.......',
    '......####......',
    '.......##.......',
    '.......##.......',
    '......####......',
    '.....######.....',
    '....########....',
    '....########....'
  ],
  r: [
    '................',
    '................',
    '....##.##.##....',
    '....########....',
    '.....######.....',
    '.....######.....',
    '.....######.....',
    '.....######.....',
    '.....######.....',
    '.....######.....',
    '....########....',
    '...##########...',
    '...##########...',
    '...##########...'
  ],
  n: [
    '................',
    '......#.#.......',
    '.....######.....',
    '....########....',
    '...###.######...',
    '..###########...',
    '.############...',
    '.####..######...',
    '..##..#######...',
    '.....#######....',
    '....########....',
    '....########....',
    '...##########...',
    '...##########...'
  ],
  b: [
    '................',
    '.......##.......',
    '......####......',
    '.....##.###.....',
    '.....#.####.....',
    '.....######.....',
    '......####......',
    '.......##.......',
    '......####......',
    '.......##.......',
    '......####......',
    '.....######.....',
    '....########....',
    '....########....'
  ],
  q: [
    '................',
    '..#...#..#...#..',
    '..#..##..##..#..',
    '..##.##..##.##..',
    '...##########...',
    '...##########...',
    '....########....',
    '.....######.....',
    '......####......',
    '......####......',
    '.....######.....',
    '....########....',
    '...##########...',
    '...##########...'
  ],
  k: [
    '.......##.......',
    '......####......',
    '.......##.......',
    '....########....',
    '...##########...',
    '...##########...',
    '....########....',
    '.....######.....',
    '......####......',
    '......####......',
    '.....######.....',
    '....########....',
    '...##########...',
    '...##########...'
  ]
}

function shaded (mask, side) {
  const c = SIDE_COLORS[side] || SIDE_COLORS.w
  const art = grid(16, 16)
  mask.forEach((row, y) => {
    for (const run of row.matchAll(/#+/g)) {
      const from = run.index
      const len = run[0].length
      const dark = Math.max(1, Math.ceil(len * 0.3))
      for (let i = 0; i < len; i++) {
        const color = i === 0 && len >= 3 ? c.light : i >= len - dark ? c.shade : c.fill
        art.px(from + i, y + 1, color)
      }
    }
  })
  return art.outline(c.line)
}

// A round dama stone from above, with a groove round it; a king wears a gold crown
function stone (side, king) {
  const c = SIDE_COLORS[side] || SIDE_COLORS.w
  const art = grid(16, 16)
  art.disc(7.5, 8, 6.4, c.shade).disc(7, 7.5, 5.6, c.fill).ring(7.5, 8, 4, c.shade)
  art.px(4, 4, c.light).px(5, 3, c.light).px(3, 5, c.light)
  if (king) art.rows(4, 5, ['#..#..#', '##.#.##', '#######', '#######'], { '#': '#ffcd75' }).rows(4, 9, ['#######'], { '#': '#ef7d57' })
  return art.outline(c.line)
}

const cache = new Map()

/** A piece's picture: `type` is a chess letter (p n b r q k) or man / king, `side` w or b. */
export function pieceArt (type, side) {
  const key = type + side
  if (!cache.has(key)) cache.set(key, type === 'man' || type === 'king' ? stone(side, type === 'king') : shaded(MASKS[type] || MASKS.p, side))
  return cache.get(key)
}
