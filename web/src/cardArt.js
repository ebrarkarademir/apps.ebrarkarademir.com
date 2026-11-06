import { grid, sprite, tinyText } from './pixel/kit'

// Pixel art for the face of each game card, keyed by game id: a little scene from the game,
// 32 by 24 art pixels, like a screenshot on a cartridge label (see pixel/kit.js for the colors).

const W = 32
const H = 24
const scene = (bg) => grid(W, H).rect(0, 0, W, H, bg)

// Pastes a sprite (a grid) into a scene with its top left at (x, y)
const stamp = (art, piece, x, y) => {
  piece.cells.forEach((row, j) => row.forEach((c, i) => { if (c) art.px(x + i, y + j, c) }))
  return art
}

// ---------- Pieces used more than once ----------

// A tank seen from above, facing right (or left), in its own color
function tank (body, dark, facing = 1) {
  const t = grid(16, 11)
  t.rect(0, 0, 12, 3, 'd').rect(0, 8, 12, 3, 'd')
  for (let x = 1; x < 12; x += 2) t.px(x, 1, 's').px(x, 9, 's')
  t.rect(1, 3, 10, 5, body).rect(1, 3, 10, 1, 'w')
  t.disc(5.5, 5, 2.2, dark).rect(8, 5, 8, 1, 'g').rect(14, 4, 2, 3, 'g')
  if (facing < 0) t.flip()
  return t.outline('k')
}

const bird = sprite([
  '..yyyy..',
  '.yyyywk.',
  'wwyyyww.',
  'wwwyyyooo',
  '.yyyyyoo.',
  '..yyyy...'
].map(row => row.padEnd(9, '.')))

const pawnPiece = (c, shade) => sprite([
  '..cc..',
  '.cccs.',
  '..cs..',
  '.cccs.',
  'ccccss'
].map(row => row.replace(/c/g, c).replace(/s/g, shade)))

// ---------- The cards ----------

function tanksArt () {
  const art = scene('K')
  for (let y = 0; y < H; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < W; x += 6) art.rect(x, y, 3, 3, 'P')
  art.rect(0, 0, W, 1, 's').rect(0, H - 1, W, 1, 's')
  art.rect(15, 3, 2, 7, 's').rect(15, 14, 2, 7, 's')
  stamp(art, tank('b', 'n', 1), 0, 2)
  stamp(art, tank('r', 'p', -1), 15, 12)
  art.rect(18, 6, 2, 1, 'y').px(20, 6, 'w').px(17, 6, 'o')
  // A spark where a shell hits
  art.px(9, 16, 'y').px(8, 17, 'o').px(10, 17, 'o').px(9, 18, 'y').px(7, 15, 'w').px(11, 19, 'w')
  return art
}

function futsalArt () {
  const art = scene('G')
  for (let x = 0; x < W; x += 8) art.rect(x, 0, 4, H, 't')
  art.box(2, 2, 28, 20, 'w').rect(15, 2, 2, 20, 'w').ring(15.5, 11.5, 4, 'w')
  art.rect(0, 8, 3, 8, 'g').box(0, 8, 3, 8, 'w').rect(29, 8, 3, 8, 'g').box(29, 8, 3, 8, 'w')
  for (const [x, y, c] of [[8, 7, 'b'], [10, 15, 'b'], [22, 8, 'r'], [24, 16, 'r']]) art.disc(x, y, 1.6, c).px(x, y - 1, 'w')
  art.disc(19, 12, 1, 'w').px(19, 12, 'k')
  return art
}

function flappyArt () {
  const art = scene('c')
  art.rect(0, 12, W, 9, 'C')
  for (const [x, y] of [[3, 4], [20, 2]]) art.rect(x, y + 1, 8, 2, 'w').rect(x + 2, y, 4, 1, 'w')
  // Pipes with a light edge and a dark one, and caps
  const pipe = (x, top, bottom) => {
    art.rect(x, top, 6, bottom - top, 'G').rect(x, top, 1, bottom - top, 'l').rect(x + 5, top, 1, bottom - top, 't')
  }
  pipe(21, 0, 7)
  art.rect(20, 6, 8, 2, 'l').rect(20, 7, 8, 1, 'G').box(20, 6, 8, 2, 'k')
  pipe(21, 15, 21)
  art.rect(20, 14, 8, 2, 'l').rect(20, 15, 8, 1, 'G').box(20, 14, 8, 2, 'k')
  art.rect(0, 20, W, 1, 'l').rect(0, 21, W, 3, 'y')
  for (let x = 1; x < W; x += 4) art.px(x, 22, 'o')
  stamp(art, bird, 6, 8)
  return art
}

function craterArt () {
  const art = scene('c')
  art.rect(0, 0, W, 4, 'b').rect(0, 4, W, 4, 'c').disc(26, 4, 2.5, 'y')
  art.disc(6, 18, 9, 'C')
  // Ground with a crater bitten out of it
  for (let x = 0; x < W; x++) {
    const top = Math.round(15 + Math.sin(x * 0.35) * 1.5)
    const dip = x > 12 && x < 20 ? Math.round(3 - Math.abs(x - 16) * 0.7) : 0
    art.rect(x, top + dip, 1, H, 'o').px(x, top + dip, 'l').px(x, top + dip + 1, 'G')
    if ((x * 7) % 5 === 0) art.px(x, top + dip + 5, 'r')
  }
  // Two soldiers, the shot's arc and the blast
  const soldier = sprite(['.y.', 'GGG', '.G.', 'G.G'])
  stamp(art, soldier, 3, 10)
  stamp(art, soldier, 25, 10)
  for (const [x, y] of [[8, 9], [11, 6], [14, 5], [17, 6]]) art.px(x, y, 'w')
  art.px(16, 13, 'y').px(15, 12, 'o').px(17, 12, 'o').px(16, 11, 'r').px(14, 13, 'y').px(18, 13, 'y')
  return art
}

function raceArt () {
  const art = scene('G')
  for (let y = 0; y < H; y += 3) for (let x = (y % 2) * 2; x < W; x += 5) art.px(x, y, 't')
  // A bend of road with red and white kerbs
  art.rect(0, 7, W, 11, 'd')
  for (let x = 0; x < W; x += 2) art.px(x, 6, x % 4 ? 'w' : 'r').px(x + 1, 6, x % 4 ? 'r' : 'w').px(x, 18, x % 4 ? 'r' : 'w').px(x + 1, 18, x % 4 ? 'w' : 'r')
  for (let x = 1; x < W; x += 6) art.rect(x, 12, 3, 1, 'g')
  // Two cars, nose to the right
  const car = (c) => sprite(['.kk..kk.', c.repeat(6) + 'ww', c + 'ccc' + c.repeat(4), c.repeat(6) + 'ww', '.kk..kk.'].map(r => r.replace(/c/g, 'C')))
  stamp(art, car('r'), 15, 7)
  stamp(art, car('y'), 3, 12)
  // Speed lines behind the leader
  art.rect(9, 9, 4, 1, 'w').rect(11, 11, 3, 1, 'g')
  return art
}

function blackjackArt () {
  const art = scene('G')
  art.rect(0, 0, W, 2, 't').rect(0, H - 2, W, 2, 't')
  const card = (x, y, c, letter, suit) => {
    art.rect(x, y, 11, 15, 'w').box(x, y, 11, 15, 'k')
    tinyText(art, x + 2, y + 2, letter, c)
    art.rows(x + 3, y + 8, suit, { x: c })
  }
  card(3, 3, 'k', 'A', ['..x..', '.xxx.', 'xxxxx', '..x..'])
  card(11, 5, 'r', 'K', ['xx.xx', 'xxxxx', '.xxx.', '..x..'])
  // Stacks of chips
  const chips = (x, n, c, rim) => {
    for (let i = 0; i < n; i++) art.rect(x, 20 - i * 2, 7, 2, i % 2 ? rim : c).px(x, 20 - i * 2, 'k').px(x + 6, 20 - i * 2, 'k')
  }
  chips(23, 5, 'r', 'w')
  chips(24, 2, 'b', 'w')
  return art
}

function sudokuArt () {
  const art = scene('P')
  art.rect(4, 0, 24, H, 'w')
  // One box of the grid, with thick lines round it and thin ones inside
  for (let i = 0; i < 4; i++) {
    art.rect(5 + i * 7, 1, 1, 22, i % 3 ? 'g' : 'k')
    art.rect(5, 1 + i * 7, 22, 1, i % 3 ? 'g' : 'k')
  }
  art.rect(13, 9, 6, 6, 'C')
  const digits = ['53.', '6.1', '.98']
  digits.forEach((row, r) => [...row].forEach((d, c) => {
    if (d !== '.') tinyText(art, 7 + c * 7, 3 + r * 7, d, r === 1 && c === 1 ? 'b' : r + c === 2 ? 'b' : 'k')
  }))
  tinyText(art, 14, 10, '7', 'b')
  return art
}

function chessArt () {
  const art = scene('K')
  for (let y = 0; y < 6; y++) for (let x = 0; x < 8; x++) art.rect(x * 4, y * 4, 4, 4, (x + y) % 2 ? 's' : 'g')
  const knight = sprite([
    '...ww......',
    '..wwww.....',
    '.wwkwww....',
    'wwwwwwwg...',
    'wwwwwwwwg..',
    '.ww..wwwg..',
    '.....wwwg..',
    '....wwwwg..',
    '...wwwwwwg.',
    '..wwwwwwwg.',
    '.wwwwwwwwwg',
    '.ggggggggg.'
  ])
  stamp(art, knight, 3, 6)
  const pawn = pawnPiece('d', 'k')
  stamp(art, pawn, 21, 9)
  stamp(art, sprite(['.y.', 'yyy', '.y.']), 22, 3)
  return art
}

function damaArt () {
  const art = scene('o')
  for (let y = 0; y < 6; y++) for (let x = 0; x < 8; x++) art.rect(x * 4, y * 4, 4, 4, (x + y) % 2 ? 'y' : 'o')
  const man = (x, y, c, rim) => art.disc(x * 4 + 1.5, y * 4 + 1.5, 1.6, c).px(x * 4 + 1, y * 4 + 1, rim)
  for (const [x, y] of [[0, 0], [2, 0], [4, 0], [6, 0], [1, 1], [5, 1], [3, 2]]) man(x, y, 'k', 'd')
  for (const [x, y] of [[1, 5], [3, 5], [5, 5], [7, 5], [0, 4], [4, 4], [6, 3]]) man(x, y, 'w', 'g')
  art.px(25, 13, 'y').px(26, 13, 'y')
  return art
}

function worldArt () {
  const art = scene('C')
  art.disc(4, 3, 2.5, 'y')
  art.rect(0, 15, W, 9, 'G').rect(0, 15, W, 1, 'l')
  // A house
  art.rect(18, 9, 10, 7, 'w').rect(21, 12, 3, 4, 'o').rect(25, 11, 2, 2, 'c')
  for (let i = 0; i < 6; i++) art.rect(17 + i, 9 - i, 12 - i * 2, 1, 'r')
  // A tree
  art.rect(9, 11, 2, 5, 'o').disc(9.5, 8, 3.5, 'G').px(8, 6, 'l').px(10, 7, 'l')
  // Someone out for a walk
  stamp(art, sprite(['.y.', 'bbb', '.b.', 'd.d']), 13, 15)
  art.rect(0, 19, W, 1, 'y').rect(0, 20, W, 1, 'o')
  return art
}

function doodleArt () {
  const art = scene('P')
  // An easel with a drawing on it
  art.line(6, 23, 10, 3, 'o').line(25, 23, 21, 3, 'o')
  art.rect(5, 2, 22, 16, 'w').box(5, 2, 22, 16, 'k')
  art.disc(11, 7, 2, 'y').px(11, 3, 'y').px(7, 7, 'y').px(15, 7, 'y').px(11, 11, 'y')
  art.line(14, 15, 18, 10, 'G').line(18, 10, 23, 15, 'G').line(14, 15, 23, 15, 'G')
  art.rect(4, 18, 24, 2, 'o')
  // A pencil drawing a line
  art.line(24, 5, 28, 1, 'y').px(23, 6, 'k').px(28, 0, 'r').px(29, 1, 'r')
  art.rect(13, 21, 2, 1, 'g').rect(17, 21, 2, 1, 'g').rect(21, 21, 2, 1, 'g')
  return art
}

function hackArt () {
  const art = scene('P')
  // A monitor with code on it
  art.rect(2, 1, 28, 18, 'g').rect(4, 3, 24, 14, 'k')
  art.rect(13, 19, 6, 2, 's').rect(9, 21, 14, 2, 'g')
  const lines = [[6, 5, 9], [6, 7, 14], [8, 9, 8], [6, 11, 12]]
  for (const [x, y, w] of lines) for (let i = 0; i < w; i++) if ((i * 5 + y) % 4) art.px(x + i, y, 'l')
  art.rect(6, 13, 2, 2, 'l')
  // A padlock, unlocked
  art.rect(20, 9, 6, 5, 'y').px(22, 11, 'k').px(22, 12, 'k').box(21, 5, 4, 5, 'g').px(24, 8, null).px(24, 9, 'y')
  return art
}

function quizArt () {
  const art = scene('n')
  for (let i = 0; i < 6; i++) art.px((i * 11) % W, (i * 7) % 12, 'c')
  // A speech bubble with a big question mark
  art.rect(4, 2, 18, 14, 'w').rect(3, 3, 20, 12, 'w').rows(7, 16, ['xxx', 'xx', 'x'], { x: 'w' })
  tinyText(art, 9, 4, '?', 'b', 2)
  // A stopwatch
  art.disc(25, 17, 4.5, 'y').disc(25, 17, 3.2, 'w').rect(24, 11, 3, 1, 'y').px(25, 15, 'k').px(25, 16, 'k').px(26, 17, 'r')
  return art
}

function numberArt () {
  const art = scene('P')
  const tile = (x, ch, c) => {
    art.rect(x, 6, 8, 12, c).box(x, 6, 8, 12, 'k').rect(x + 1, 16, 6, 1, 'd')
    tinyText(art, x + 1, 8, ch, 'k', 2)
  }
  tile(2, '4', 'w')
  tile(12, '2', 'w')
  tile(22, '?', 'y')
  art.rows(24, 1, ['..x..', '.xxx.', 'xxxxx'], { x: 'l' })
  art.rows(24, 20, ['xxxxx', '.xxx.', '..x..'], { x: 'r' })
  return art
}

function bottleArt () {
  const art = scene('P')
  art.ring(15.5, 11.5, 10, 'd')
  for (const [x, y] of [[15, 1], [25, 7], [24, 17], [6, 17], [5, 6]]) art.px(x, y, 'g')
  // The bottle, on its side, neck to the right
  art.rect(6, 9, 13, 6, 'G').rect(7, 8, 11, 8, 'G').rect(7, 9, 10, 1, 'l').rect(8, 14, 9, 1, 't')
  art.rect(19, 10, 4, 4, 'G').rect(23, 11, 3, 2, 'G').rect(26, 10, 1, 4, 'y').rect(10, 10, 5, 4, 'w').rect(11, 11, 3, 2, 'r')
  art.rows(23, 4, ['..x', '.xx', 'xxx'], { x: 'y' })
  return art
}

function casusArt () {
  const art = scene('n')
  for (let x = 0; x < W; x += 5) art.rect(x, 0, 2, 24, 'K')
  // A spy: hat, dark glasses, a raised collar
  art.rect(9, 3, 14, 4, 'd').rect(6, 7, 20, 2, 'd').rect(9, 6, 14, 1, 'r')
  art.rect(10, 9, 12, 8, 'y').rect(10, 11, 12, 3, 'k').rect(12, 12, 2, 1, 'w').rect(18, 12, 2, 1, 'w').rect(15, 11, 2, 1, 'y')
  art.rect(14, 15, 4, 1, 'o')
  art.rect(7, 17, 18, 7, 'o').rect(13, 17, 6, 3, 'y').line(10, 17, 15, 23, 'r').line(22, 17, 17, 23, 'r')
  return art
}

function tabuArt () {
  const art = scene('P')
  art.rect(3, 3, 22, 12, 'w').rect(2, 4, 24, 10, 'w').rows(20, 15, ['xxx', '.xx', '..x'], { x: 'w' })
  tinyText(art, 5, 6, '#!@%', 'k')
  // A big red "no" over it
  art.ring(15.5, 11.5, 8, 'r').ring(15.5, 11.5, 7, 'r').line(10, 6, 21, 17, 'r').line(11, 6, 22, 17, 'r')
  return art
}

function memoryArt () {
  const art = scene('P')
  const back = (x, y) => {
    art.rect(x, y, 8, 10, 'b').box(x, y, 8, 10, 'k').box(x + 2, y + 2, 4, 6, 'c')
  }
  const face = (x, y, ch) => {
    art.rect(x, y, 8, 10, 'w').box(x, y, 8, 10, 'k')
    tinyText(art, x + 3, y + 3, ch, 'r')
  }
  back(2, 1); face(12, 1, 'A'); back(22, 1)
  face(2, 13, 'A'); back(12, 13); face(22, 13, '?')
  return art
}

function wordArt () {
  const art = scene('P')
  const tile = (x, y, ch) => {
    art.rect(x, y, 7, 7, 'y').box(x, y, 7, 7, 'o')
    tinyText(art, x + 2, y + 1, ch, 'k')
  }
  ;[...'WORD'].forEach((ch, i) => tile(2 + i * 7, 2, ch))
  tile(23, 9, 'U')
  tile(23, 16, 'N')
  return art
}

export const cardArt = {
  world: worldArt(),
  flappy: flappyArt(),
  tanks: tanksArt(),
  race: raceArt(),
  crater: craterArt(),
  blackjack: blackjackArt(),
  futsal: futsalArt(),
  doodle: doodleArt(),
  sudoku: sudokuArt(),
  chess: chessArt(),
  dama: damaArt(),
  'quiz-race': quizArt(),
  'number-guess': numberArt(),
  hack: hackArt(),
  'bottle-spin': bottleArt(),
  'casus-kim': casusArt(),
  tabu: tabuArt(),
  'coming-soon-1': memoryArt(),
  'coming-soon-2': wordArt()
}
