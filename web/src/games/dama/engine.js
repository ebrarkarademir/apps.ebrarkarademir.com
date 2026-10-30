// The rules of Turkish draughts (Dama) for Dama ASCII.
//
// An 8×8 board where every square is used. Each side starts with 16 men on its second and
// third rows; White moves first. A man steps one square forward or sideways, never back or
// diagonally, and takes by jumping an enemy next to it (forward or sideways) onto the empty
// square beyond. A man reaching the far row becomes a king (a dama): it moves any distance
// along rows and columns, and takes from any distance, landing on any empty square past the
// piece it jumps. Taken pieces leave the board at once, a capture goes on as long as it can,
// and a king may not turn straight back between two jumps.
//
// Taking is compulsory, and of all the ways to take, one that takes the most pieces must be
// played (kings count as one piece like any other). A man that reaches the far row in the middle
// of a capture finishes it as a man and is crowned at the end of the move.
//
// You lose when you have no pieces or no move left. A lone king against a lone piece is a draw,
// and so are 50 moves each without a capture or a man moving.
//
// Squares count from 0 (a8) to 63 (h1), row by row from Black's side. A piece is 'w' or 'b'
// for a man and 'W' or 'B' for a king. Positions travel between devices as text: the rows,
// the side to move and the number of moves since the last capture or man move.

export const START_FEN = '8/bbbbbbbb/bbbbbbbb/8/8/wwwwwwww/wwwwwwww/8 w 0'
export const FILES = 'abcdefgh'
const QUIET_LIMIT = 100 // moves (50 each) without a capture or a man moving

export const rowOf = (sq) => sq >> 3
export const colOf = (sq) => sq & 7
export const squareName = (sq) => FILES[colOf(sq)] + (8 - rowOf(sq))
export const colorOf = (piece) => (piece ? piece.toLowerCase() : null)
export const isKing = (piece) => piece === 'W' || piece === 'B'
export const other = (color) => (color === 'w' ? 'b' : 'w')
export const isSquare = (sq) => Number.isInteger(sq) && sq >= 0 && sq < 64

const at = (r, c) => (r >= 0 && r < 8 && c >= 0 && c < 8 ? r * 8 + c : -1)
const UP = [-1, 0]
const DOWN = [1, 0]
const LEFT = [0, -1]
const RIGHT = [0, 1]
const ALL = [UP, DOWN, LEFT, RIGHT]
// A man goes forward (up the board for White) or sideways
const manDirs = (color) => [color === 'w' ? UP : DOWN, LEFT, RIGHT]
const lastRow = (color) => (color === 'w' ? 0 : 7)

// ---------- Text ----------

/** A position from its text: { board, turn, quiet }, or null if it isn't valid. */
export function parseFen (fen) {
  if (typeof fen !== 'string') return null
  const [placement, turn = 'w', quiet = '0'] = fen.trim().split(/\s+/)
  const rows = (placement || '').split('/')
  if (rows.length !== 8) return null
  const board = new Array(64).fill('')
  for (let r = 0; r < 8; r++) {
    let c = 0
    for (const ch of rows[r]) {
      if (/[1-8]/.test(ch)) c += Number(ch)
      else if (/[wWbB]/.test(ch) && c < 8) board[r * 8 + c++] = ch
      else return null
    }
    if (c !== 8) return null
  }
  return { board, turn: turn === 'b' ? 'b' : 'w', quiet: Math.max(0, parseInt(quiet, 10) || 0) }
}

export function toFen (pos) {
  const rows = []
  for (let r = 0; r < 8; r++) {
    let row = ''
    let empty = 0
    for (let c = 0; c < 8; c++) {
      const piece = pos.board[r * 8 + c]
      if (!piece) {
        empty++
        continue
      }
      if (empty) row += empty
      empty = 0
      row += piece
    }
    rows.push(empty ? row + empty : row)
  }
  return `${rows.join('/')} ${pos.turn} ${pos.quiet}`
}

// ---------- Moves ----------

// A move: { from, to, path (every square it lands on, the last being `to`), captures (the
// squares of the pieces it takes, in order), captured (the first of them, '' for none),
// piece, promo ('k' when the man is crowned, else '') }

// Every way the piece now on `from` can go on taking, from `square`: the board has it lifted
// off already, and the pieces taken so far removed
function captureChains (board, piece, from, square, path, captures, lastDir, found) {
  const color = colorOf(piece)
  const enemy = (sq) => sq >= 0 && board[sq] && colorOf(board[sq]) !== color
  let more = false
  const r = rowOf(square)
  const c = colOf(square)
  if (!isKing(piece)) {
    for (const [dr, dc] of manDirs(color)) {
      const over = at(r + dr, c + dc)
      const land = at(r + 2 * dr, c + 2 * dc)
      if (!enemy(over) || land < 0 || board[land]) continue
      more = true
      const taken = board[over]
      board[over] = ''
      captureChains(board, piece, from, land, [...path, land], [...captures, over], [dr, dc], found)
      board[over] = taken
    }
  } else {
    for (const [dr, dc] of ALL) {
      // No turning straight back between two jumps
      if (lastDir && dr === -lastDir[0] && dc === -lastDir[1]) continue
      let k = 1
      while (at(r + k * dr, c + k * dc) >= 0 && !board[at(r + k * dr, c + k * dc)]) k++
      const over = at(r + k * dr, c + k * dc)
      if (!enemy(over)) continue
      const taken = board[over]
      board[over] = ''
      for (let j = k + 1; ; j++) {
        const land = at(r + j * dr, c + j * dc)
        if (land < 0 || board[land]) break
        more = true
        captureChains(board, piece, from, land, [...path, land], [...captures, over], [dr, dc], found)
      }
      board[over] = taken
    }
  }
  if (!more && captures.length) found.push({ from, path, captures })
}

/** Every legal move for the side to move: the longest captures if there's any capture at all. */
export function legalMoves (pos) {
  const { board, turn } = pos
  const make = (from, path, captures) => {
    const piece = board[from]
    const to = path[path.length - 1]
    return { from, to, path, captures, captured: captures.length ? board[captures[0]] : '', piece, promo: !isKing(piece) && rowOf(to) === lastRow(turn) ? 'k' : '' }
  }
  const chains = []
  for (let from = 0; from < 64; from++) {
    const piece = board[from]
    if (!piece || colorOf(piece) !== turn) continue
    const lifted = board.slice()
    lifted[from] = ''
    captureChains(lifted, piece, from, from, [], [], null, chains)
  }
  if (chains.length) {
    const most = Math.max(...chains.map(chain => chain.captures.length))
    return chains.filter(chain => chain.captures.length === most).map(chain => make(chain.from, chain.path, chain.captures))
  }
  const moves = []
  for (let from = 0; from < 64; from++) {
    const piece = board[from]
    if (!piece || colorOf(piece) !== turn) continue
    const r = rowOf(from)
    const c = colOf(from)
    if (!isKing(piece)) {
      for (const [dr, dc] of manDirs(turn)) {
        const to = at(r + dr, c + dc)
        if (to >= 0 && !board[to]) moves.push(make(from, [to], []))
      }
    } else {
      for (const [dr, dc] of ALL) {
        for (let k = 1; ; k++) {
          const to = at(r + k * dr, c + k * dc)
          if (to < 0 || board[to]) break
          moves.push(make(from, [to], []))
        }
      }
    }
  }
  return moves
}

/** The position after a move; the one before is left as it was. */
export function applyMove (pos, move) {
  const board = pos.board.slice()
  board[move.from] = ''
  for (const sq of move.captures) board[sq] = ''
  board[move.to] = move.promo ? move.piece.toUpperCase() : move.piece
  const progress = move.captures.length || !isKing(move.piece)
  return { board, turn: other(pos.turn), quiet: progress ? 0 : pos.quiet + 1 }
}

/** The legal move from a square along a path of landing squares, or null. */
export function findMove (pos, from, path) {
  if (!Array.isArray(path)) return null
  const key = path.join()
  return legalMoves(pos).find(move => move.from === from && move.path.join() === key) || null
}

/** The move written out: c3-c4 for a step, c3xc5xe5 for captures, with * when it crowns. */
export function toSan (pos, move) {
  const squares = [move.from, ...move.path].map(squareName)
  return squares.join(move.captures.length ? 'x' : '-') + (move.promo ? '*' : '')
}

// ---------- The end of a game ----------

const count = (board, color) => board.filter(piece => colorOf(piece) === color).length

/**
 * Whether the game is over in this position: { winner, reason } with reason 'pieces' (the side
 * to move has none left), 'blocked' (it can't move), 'material' (a lone king against a lone
 * piece) or 'quiet' (50 moves each without a capture or a man moving), or null.
 */
export function gameOver (pos) {
  const mine = count(pos.board, pos.turn)
  if (!mine) return { winner: other(pos.turn), reason: 'pieces' }
  if (!legalMoves(pos).length) return { winner: other(pos.turn), reason: 'blocked' }
  const theirs = count(pos.board, other(pos.turn))
  if (mine === 1 && theirs === 1 && pos.board.some(isKing)) return { winner: null, reason: 'material' }
  if (pos.quiet >= QUIET_LIMIT) return { winner: null, reason: 'quiet' }
  return null
}

/**
 * For the players' bars: how many of the other side's pieces each has taken, as 'man' once per
 * piece, and how many pieces ahead each is.
 */
export function material (board) {
  const w = count(board, 'w')
  const b = count(board, 'b')
  return {
    w: { taken: Array(16 - b).fill('man'), lead: Math.max(0, w - b) },
    b: { taken: Array(16 - w).fill('man'), lead: Math.max(0, b - w) }
  }
}
