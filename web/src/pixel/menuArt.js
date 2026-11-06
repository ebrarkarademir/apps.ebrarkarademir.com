import { grid, sprite } from './kit'

// Little pictures for the games' menus and results: the Solo and Online choices, and what a
// match ends with (a trophy, a chequered flag, a blast). See kit.js for the color letters.

const person = (shirt) => sprite([
  '.yy.',
  '.yy.',
  shirt.repeat(4),
  '.' + shirt.repeat(2) + '.',
  '.d.d'
])

const paste = (art, piece, x, y) => {
  piece.cells.forEach((row, j) => row.forEach((c, i) => { if (c) art.px(x + i, y + j, c) }))
  return art
}

// One player and a robot to play against
function solo () {
  const art = grid(22, 9)
  paste(art, person('b'), 2, 1)
  paste(art, sprite(['.ss.', 'swws', 'ssss', '.ss.', 's..s'], { colors: { s: 'g', w: 'r' } }), 15, 1)
  art.rect(9, 4, 4, 1, 'y').px(10, 3, 'o').px(11, 5, 'o')
  return art
}

// Players far apart, joined by a signal
function online () {
  const art = grid(26, 11)
  paste(art, person('b'), 0, 3)
  paste(art, person('r'), 10, 3)
  paste(art, person('G'), 20, 3)
  for (const x of [7, 17]) art.px(x, 5, 'c').px(x + 1, 5, 'c').px(x + 2, 5, 'c')
  art.px(12, 0, 'y').px(13, 1, 'y').px(11, 1, 'y')
  return art
}

function trophy () {
  return sprite([
    'yyyyyyyyyy',
    'yYwyyyyyoy',
    '.yYyyyyyo.',
    'y.yyyyyo.y',
    '.y.yyyo.y.',
    '...yyoo...',
    '....yo....',
    '....yo....',
    '..oooooo..',
    '..dddddd..',
    '..dssssd..',
    '..dddddd..'
  ], { colors: { Y: 'w' } })
}

function flag () {
  const art = grid(14, 14)
  art.rect(1, 0, 1, 14, 'g')
  for (let y = 0; y < 4; y++) for (let x = 0; x < 5; x++) art.rect(2 + x * 2, 1 + y * 2, 2, 2, (x + y) % 2 ? 'k' : 'w')
  return art.outline('k')
}

function boom () {
  return sprite([
    '...r..r...',
    '.r.oo.or..',
    '..ooyyo...',
    'rooywwyoor',
    '.oywwwwyo.',
    '.oywwwyoo.',
    'rooyyyyor.',
    '..ooyoo...',
    '.r..o..r..'
  ])
}

// Two soldiers and a shot between them
function duel () {
  const art = grid(24, 8)
  const soldier = sprite(['.y.', 'GGG', '.G.', 'G.G'])
  paste(art, soldier, 0, 2)
  paste(art, soldier, 19, 2)
  art.px(8, 3, 'w').px(11, 2, 'w').px(14, 3, 'w')
  return art
}

// A seal for a solved puzzle, and a broken one for a lost game
function seal (color) {
  const art = grid(14, 14)
  art.disc(6.5, 6.5, 6, color).ring(6.5, 6.5, 4.5, 'w')
  return art.outline('k')
}

export const menuArt = {
  solo: solo(),
  online: online(),
  trophy: trophy(),
  flag: flag(),
  boom: boom(),
  duel: duel(),
  seal: seal('r')
}

// Password Hack: a padlock with a trace meter under it, and a row of letter keys
menuArt.lock = (() => {
  const art = grid(22, 10)
  art.rect(1, 4, 7, 6, 'y').box(2, 0, 5, 5, 'g').rect(4, 6, 1, 2, 'k')
  for (let i = 0; i < 6; i++) art.rect(11 + i * 2, 6, 1, 3, i < 4 ? (i < 3 ? 'l' : 'r') : 'd')
  return art.outline('k')
})()

menuArt.keys = (() => {
  const art = grid(24, 8)
  ;['l', 'y', 'd', 'l'].forEach((c, i) => art.rect(i * 6, 1, 5, 6, c).rect(i * 6, 6, 5, 1, 'k'))
  return art.outline('k')
})()
