import { mulberry32, shuffle } from '../ascii/random'

// Sudoku ASCII rules: making puzzles, grading them, and the moves of a game in play, kept free
// of drawing and timing. A board is 81 cells, row by row from the top left, with 0 for an empty
// cell. Where a set of digits is needed it is a bit mask: bit d stands for digit d.

export const CELLS = 81
export const MAX_MISTAKES = 3
export const HINTS = 3
export const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert']

const ALL = 0x3fe // digits 1-9
const HISTORY = 200 // undo steps kept

export const rowOf = (cell) => Math.floor(cell / 9)
export const colOf = (cell) => cell % 9
export const boxOf = (cell) => Math.floor(cell / 27) * 3 + Math.floor((cell % 9) / 3)

const ROW = Array.from({ length: CELLS }, (_, i) => rowOf(i))
const COL = Array.from({ length: CELLS }, (_, i) => colOf(i))
const BOX = Array.from({ length: CELLS }, (_, i) => boxOf(i))

// The 27 units, each a list of its 9 cells: rows are 0-8, columns 9-17 and boxes 18-26
export const UNITS = [
  ...Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => r * 9 + c)),
  ...Array.from({ length: 9 }, (_, c) => Array.from({ length: 9 }, (_, r) => r * 9 + c)),
  ...Array.from({ length: 9 }, (_, b) => Array.from({ length: 9 }, (_, i) => (Math.floor(b / 3) * 3 + Math.floor(i / 3)) * 9 + (b % 3) * 3 + (i % 3)))
]
// For each cell: its row, column and box, and the 20 other cells that share one of them
export const UNITS_OF = Array.from({ length: CELLS }, (_, i) => [ROW[i], 9 + COL[i], 18 + BOX[i]])
export const PEERS = Array.from({ length: CELLS }, (_, i) => {
  const peers = new Set(UNITS_OF[i].flatMap(unit => UNITS[unit]))
  peers.delete(i)
  return [...peers]
})

const bitCount = (mask) => {
  let n = 0
  for (; mask; n++) mask &= mask - 1
  return n
}
const lowestDigit = (mask) => 31 - Math.clz32(mask & -mask)
const digitsOf = (mask) => {
  const list = []
  for (let d = 1; d <= 9; d++) if (mask & (1 << d)) list.push(d)
  return list
}

export const parse = (text) => Uint8Array.from(String(text), ch => (ch >= '1' && ch <= '9' ? ch.charCodeAt(0) - 48 : 0))
export const toText = (board) => Array.from(board).join('')
export const isPuzzleText = (text) => typeof text === 'string' && /^[0-9]{81}$/.test(text)

// ---------- Solving ----------

/**
 * Fills the board by trying digits, most constrained cell first, and counts the solutions it
 * finds up to `limit`. The first one is written to `into`, if given. With `random`, digits are
 * tried in a random order, which is how full grids are made.
 */
function search (board, { limit = 1, into = null, random = null } = {}) {
  const grid = Uint8Array.from(board)
  const rows = new Uint16Array(9)
  const cols = new Uint16Array(9)
  const boxes = new Uint16Array(9)
  const empty = []
  for (let i = 0; i < CELLS; i++) {
    const d = grid[i]
    if (!d) {
      empty.push(i)
      continue
    }
    const bit = 1 << d
    if ((rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]) & bit) return 0
    rows[ROW[i]] |= bit
    cols[COL[i]] |= bit
    boxes[BOX[i]] |= bit
  }
  let found = 0
  const fill = (k) => {
    if (k === empty.length) {
      found++
      if (found === 1 && into) into.set(grid)
      return found >= limit
    }
    let pick = k
    let pickMask = 0
    let fewest = 10
    for (let j = k; j < empty.length; j++) {
      const i = empty[j]
      const mask = ALL & ~(rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]])
      const n = bitCount(mask)
      if (n < fewest) {
        fewest = n
        pick = j
        pickMask = mask
        if (n < 2) break
      }
    }
    if (!fewest) return false
    const cell = empty[pick]
    empty[pick] = empty[k]
    empty[k] = cell
    const r = ROW[cell]
    const c = COL[cell]
    const b = BOX[cell]
    const digits = digitsOf(pickMask)
    if (random) shuffle(digits, random)
    for (const d of digits) {
      const bit = 1 << d
      grid[cell] = d
      rows[r] |= bit
      cols[c] |= bit
      boxes[b] |= bit
      if (fill(k + 1)) return true
      rows[r] &= ~bit
      cols[c] &= ~bit
      boxes[b] &= ~bit
    }
    grid[cell] = 0
    return false
  }
  fill(0)
  return found
}

/** The solution of a puzzle, or null when it has none. */
export function solve (board) {
  const into = new Uint8Array(CELLS)
  return search(board, { into }) ? into : null
}

export const isUnique = (board) => search(board, { limit: 2 }) === 1

// ---------- Grading: how a person would get through it ----------

function candidatesOf (values) {
  const cand = new Uint16Array(CELLS)
  for (let i = 0; i < CELLS; i++) {
    if (values[i]) continue
    let used = 0
    for (const p of PEERS[i]) if (values[p]) used |= 1 << values[p]
    cand[i] = ALL & ~used
  }
  return cand
}

// A cell with only one digit left, or a digit with only one place left in a unit: [cell, digit]
function nextSingle (values, cand) {
  for (let i = 0; i < CELLS; i++) {
    if (!values[i] && cand[i] && !(cand[i] & (cand[i] - 1))) return [i, lowestDigit(cand[i])]
  }
  for (const unit of UNITS) {
    for (let d = 1; d <= 9; d++) {
      const bit = 1 << d
      let spot = -1
      let n = 0
      for (const i of unit) {
        if (cand[i] & bit) {
          spot = i
          if (++n > 1) break
        }
      }
      if (n === 1) return [spot, d]
    }
  }
  return null
}

function settle (values, cand, cell, d) {
  values[cell] = d
  cand[cell] = 0
  for (const p of PEERS[cell]) cand[p] &= ~(1 << d)
}

// The next step up from singles: locked candidates, naked pairs and hidden pairs. They only
// rule digits out; returns whether they ruled any out.
function eliminate (cand) {
  let changed = false
  const remove = (cell, mask) => {
    if (cand[cell] & mask) {
      cand[cell] &= ~mask
      changed = true
    }
  }
  for (let u = 0; u < 27; u++) {
    const unit = UNITS[u]
    for (let d = 1; d <= 9; d++) {
      const bit = 1 << d
      const spots = unit.filter(i => cand[i] & bit)
      if (spots.length < 2) continue
      if (u >= 18) {
        // A digit that can only go in one row or column of a box is gone from the rest of that line
        const box = u - 18
        if (spots.every(i => ROW[i] === ROW[spots[0]])) UNITS[ROW[spots[0]]].forEach(i => BOX[i] !== box && remove(i, bit))
        if (spots.every(i => COL[i] === COL[spots[0]])) UNITS[9 + COL[spots[0]]].forEach(i => BOX[i] !== box && remove(i, bit))
      } else if (spots.every(i => BOX[i] === BOX[spots[0]])) {
        // ...and one that can only go in one box along a line is gone from the rest of that box
        UNITS[18 + BOX[spots[0]]].forEach(i => !unit.includes(i) && remove(i, bit))
      }
    }
    // Two cells that can only hold the same two digits take those digits from the rest of the unit
    for (let a = 0; a < 9; a++) {
      const pair = cand[unit[a]]
      if (bitCount(pair) !== 2) continue
      for (let b = a + 1; b < 9; b++) {
        if (cand[unit[b]] === pair) unit.forEach((i, k) => k !== a && k !== b && remove(i, pair))
      }
    }
    // Two digits that only fit in the same two cells leave those cells nothing else
    const places = new Uint16Array(10)
    unit.forEach((i, k) => {
      for (let d = 1; d <= 9; d++) if (cand[i] & (1 << d)) places[d] |= 1 << k
    })
    for (let d1 = 1; d1 <= 9; d1++) {
      if (bitCount(places[d1]) !== 2) continue
      for (let d2 = d1 + 1; d2 <= 9; d2++) {
        if (places[d2] !== places[d1]) continue
        const keep = (1 << d1) | (1 << d2)
        unit.forEach((i, k) => {
          if (places[d1] & (1 << k)) remove(i, ALL & ~keep)
        })
      }
    }
  }
  return changed
}

/**
 * How hard a puzzle is to solve by reasoning: 1 when spotting singles is enough all the way,
 * 2 when it also takes locked candidates or pairs, 3 when even those get stuck.
 */
export function grade (board) {
  const values = Uint8Array.from(board)
  const cand = candidatesOf(values)
  let level = 1
  for (;;) {
    const single = nextSingle(values, cand)
    if (single) {
      settle(values, cand, single[0], single[1])
      continue
    }
    if (!values.includes(0)) return level
    if (!eliminate(cand)) return 3
    level = 2
  }
}

// ---------- Making puzzles ----------

// Each level keeps at least `givens` clues and never asks for more than `grade` (see above),
// and has to `need` that much: hard needs its pairs, expert needs more than pairs. About one
// try in eight comes out hard and one in four expert, so a few dozen tries all but always do.
const LEVELS = {
  easy: { givens: 38, grade: 1, need: 1 },
  medium: { givens: 30, grade: 1, need: 1 },
  hard: { givens: 26, grade: 2, need: 2 },
  expert: { givens: 22, grade: 3, need: 3 }
}
const ATTEMPTS = 60

/**
 * A new puzzle with exactly one solution, as { puzzle, solution } 81-character strings. Clues
 * come out in pairs mirrored through the middle, so the givens are symmetric the way Nikoli's
 * puzzles are, and only while the puzzle stays within its level.
 */
export function generate (difficulty, seed = Math.floor(Math.random() * 2 ** 31)) {
  const level = LEVELS[difficulty] || LEVELS.medium
  const random = mulberry32(seed)
  let best = null
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const solution = new Uint8Array(CELLS)
    search(new Uint8Array(CELLS), { into: solution, random })
    const board = Uint8Array.from(solution)
    let givens = CELLS
    for (const i of shuffle(Array.from({ length: 41 }, (_, n) => n), random)) {
      const j = CELLS - 1 - i
      const count = i === j ? 1 : 2
      if (givens - count < level.givens) continue
      const kept = [board[i], board[j]]
      board[i] = board[j] = 0
      if (isUnique(board) && grade(board) <= level.grade) {
        givens -= count
      } else {
        board[i] = kept[0]
        board[j] = kept[1]
      }
    }
    const found = { puzzle: toText(board), solution: toText(solution), grade: grade(board), givens }
    if (found.grade >= level.need) return found
    if (!best || found.grade > best.grade || (found.grade === best.grade && found.givens < best.givens)) best = found
  }
  return best
}

// ---------- A game in play ----------

/**
 * A puzzle in play: `values` holds every digit on the board, givens included. The game is over
 * after `maxMistakes`; an online race passes Infinity, as mistakes cost points there instead.
 */
export function createGame (puzzle, solution = null, { maxMistakes = MAX_MISTAKES } = {}) {
  const board = parse(puzzle)
  return {
    givens: Uint8Array.from(board, d => (d ? 1 : 0)),
    solution: solution ? parse(solution) : solve(board),
    values: Uint8Array.from(board),
    notes: new Uint16Array(CELLS),
    mistakes: 0,
    maxMistakes,
    hints: 0,
    history: []
  }
}

export const isGiven = (game, cell) => game.givens[cell] === 1
// Givens and right digits stay put; only empty cells and wrong digits can change
export const isSettled = (game, cell) => game.values[cell] !== 0 && game.values[cell] === game.solution[cell]
export const isWrong = (game, cell) => game.values[cell] !== 0 && game.values[cell] !== game.solution[cell]
export const isSolved = (game) => game.values.every((d, i) => d === game.solution[i])
export const isOver = (game) => game.mistakes >= game.maxMistakes
const isActive = (game) => !isOver(game) && !isSolved(game)

/** How many of each digit are in place: counts[d] for d = 1-9. */
export function placedCounts (game) {
  const counts = new Uint8Array(10)
  for (let i = 0; i < CELLS; i++) if (isSettled(game, i)) counts[game.values[i]]++
  return counts
}

/** Share of the empty cells filled in right, 0-1. */
export function progress (game) {
  let open = 0
  let done = 0
  for (let i = 0; i < CELLS; i++) {
    if (isGiven(game, i)) continue
    open++
    if (isSettled(game, i)) done++
  }
  return open ? done / open : 1
}

/** Cells holding a wrong digit, and the cells that digit clashes with. */
export function clashes (game) {
  const wrong = []
  const against = new Set()
  for (let i = 0; i < CELLS; i++) {
    if (!isWrong(game, i)) continue
    wrong.push(i)
    for (const p of PEERS[i]) if (game.values[p] === game.values[i]) against.add(p)
  }
  return { wrong, against }
}

// Keeps the cells a move is about to change, for undo
function remember (game, cells) {
  game.history.push(cells.map(i => [i, game.values[i], game.notes[i]]))
  if (game.history.length > HISTORY) game.history.shift()
}

/**
 * Puts digit d in a cell. Returns what happened, for the effects, or null if nothing did:
 * { cell, d, right, units (completed now), digitDone, solved } for a right digit, where a
 * right digit also takes itself out of the notes around it, and { cell, d, right: false,
 * clashes, over } for a wrong one, which costs a mistake.
 */
export function place (game, cell, d) {
  if (!isActive(game) || isSettled(game, cell) || game.values[cell] === d) return null
  const right = game.solution[cell] === d
  const bit = 1 << d
  const cleared = right ? PEERS[cell].filter(i => game.notes[i] & bit) : []
  remember(game, [cell, ...cleared])
  game.values[cell] = d
  game.notes[cell] = 0
  for (const i of cleared) game.notes[i] &= ~bit
  if (!right) {
    game.mistakes++
    return { cell, d, right: false, clashes: PEERS[cell].filter(i => game.values[i] === d), over: isOver(game) }
  }
  return {
    cell,
    d,
    right: true,
    units: UNITS_OF[cell].filter(unit => UNITS[unit].every(i => isSettled(game, i))),
    digitDone: placedCounts(game)[d] === 9,
    solved: isSolved(game)
  }
}

/** Turns a pencil mark on or off. A wrong digit in the cell makes way for the notes. */
export function toggleNote (game, cell, d) {
  if (!isActive(game) || isSettled(game, cell)) return false
  remember(game, [cell])
  game.values[cell] = 0
  game.notes[cell] ^= 1 << d
  return true
}

/** Clears a wrong digit or the notes from a cell. */
export function erase (game, cell) {
  if (!isActive(game) || isSettled(game, cell) || (!game.values[cell] && !game.notes[cell])) return false
  remember(game, [cell])
  game.values[cell] = 0
  game.notes[cell] = 0
  return true
}

/**
 * Puts the right digit in a cell another player got first, in an online race. Like a right
 * digit placed here it clears itself from the notes around it. It can't be taken back, and
 * neither can the moves before it. Returns false if the cell already held it.
 */
export function fillIn (game, cell) {
  if (isSettled(game, cell)) return false
  const d = game.solution[cell]
  game.values[cell] = d
  game.notes[cell] = 0
  for (const i of PEERS[cell]) game.notes[i] &= ~(1 << d)
  game.history.length = 0
  return true
}

/** Takes back the last move. Mistakes and hints stay counted. Returns the cell it was in, or -1. */
export function undo (game) {
  const step = isActive(game) && game.history.pop()
  if (!step) return -1
  for (const [i, d, notes] of step) {
    game.values[i] = d
    game.notes[i] = notes
  }
  return step[0][0]
}

// The cell a person would most likely spot next: one digit left in it, or one place left for
// a digit in a unit. Wrong digits on the board are looked past.
function easiestCell (game) {
  const values = game.values.map((d, i) => (d === game.solution[i] ? d : 0))
  const single = nextSingle(values, candidatesOf(values))
  return single ? single[0] : values.indexOf(0)
}

/**
 * Fills in one cell with its digit: `cell` if it still needs one, otherwise the easiest cell
 * on the board. Returns the same as place(), plus hint: true.
 */
export function hint (game, cell = -1) {
  if (!isActive(game) || game.hints >= HINTS) return null
  const target = cell >= 0 && !isSettled(game, cell) ? cell : easiestCell(game)
  if (target < 0) return null
  game.hints++
  return { ...place(game, target, game.solution[target]), hint: true }
}

/** Progress that can be kept and picked up again. */
export const snapshot = (game) => ({
  values: toText(game.values),
  notes: Array.from(game.notes),
  mistakes: game.mistakes,
  hints: game.hints
})

/** Puts saved progress back on a fresh game of the same puzzle; anything that doesn't fit is skipped. */
export function restore (game, saved) {
  if (!saved || !isPuzzleText(saved.values)) return
  const values = parse(saved.values)
  for (let i = 0; i < CELLS; i++) {
    if (isGiven(game, i)) continue
    game.values[i] = values[i]
    const notes = Number(saved.notes?.[i]) || 0
    game.notes[i] = values[i] ? 0 : notes & ALL
  }
  game.mistakes = Math.min(game.maxMistakes - 1, Math.max(0, Math.floor(Number(saved.mistakes)) || 0))
  game.hints = Math.min(HINTS, Math.max(0, Math.floor(Number(saved.hints)) || 0))
}
