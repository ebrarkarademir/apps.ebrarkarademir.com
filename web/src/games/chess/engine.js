// The rules of chess for Chess ASCII: positions, every legal move (castling, en passant and
// promotion included), check, mate and the draws, and moves written the usual short way
// (SAN: e4, Nxf7+, O-O, e8=Q#). Positions travel between devices as FEN text.
//
// Squares count from 0 (a8) to 63 (h1), row by row from Black's side, the order FEN lists
// them in. A piece is its FEN letter: capitals are White's, small letters Black's.

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
export const FILES = 'abcdefgh'
export const PROMOTIONS = ['q', 'r', 'b', 'n']
export const VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
const START_COUNT = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 }

export const rowOf = (sq) => sq >> 3
export const colOf = (sq) => sq & 7
export const squareName = (sq) => FILES[colOf(sq)] + (8 - rowOf(sq))
export const colorOf = (piece) => (!piece ? null : piece === piece.toUpperCase() ? 'w' : 'b')
export const typeOf = (piece) => piece.toLowerCase()
export const other = (color) => (color === 'w' ? 'b' : 'w')
export const isSquare = (sq) => Number.isInteger(sq) && sq >= 0 && sq < 64

const at = (r, c) => (r >= 0 && r < 8 && c >= 0 && c < 8 ? r * 8 + c : -1)
const pieceOf = (type, color) => (color === 'w' ? type.toUpperCase() : type)

function squareFromName (name) {
  if (!/^[a-h][1-8]$/.test(name)) return -1
  return (8 - Number(name[1])) * 8 + FILES.indexOf(name[0])
}

const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
const ROOK = [[-1, 0], [1, 0], [0, -1], [0, 1]]
const BISHOP = [[-1, -1], [-1, 1], [1, -1], [1, 1]]

// Where the kings and rooks start, for castling
const CASTLES = {
  K: { king: 60, to: 62, rook: 63, rookTo: 61, path: [61, 62], safe: [61, 62] },
  Q: { king: 60, to: 58, rook: 56, rookTo: 59, path: [57, 58, 59], safe: [58, 59] },
  k: { king: 4, to: 6, rook: 7, rookTo: 5, path: [5, 6], safe: [5, 6] },
  q: { king: 4, to: 2, rook: 0, rookTo: 3, path: [1, 2, 3], safe: [2, 3] }
}
// Moving from or capturing on one of these squares loses that castling right
const RIGHTS_AT = { 60: 'KQ', 63: 'K', 56: 'Q', 4: 'kq', 7: 'k', 0: 'q' }

// ---------- FEN ----------

/** A position from FEN text: { board, turn, castling, ep, half, full }, or null if it isn't valid. */
export function parseFen (fen) {
  if (typeof fen !== 'string') return null
  const [placement, turn = 'w', castling = '-', ep = '-', half = '0', full = '1'] = fen.trim().split(/\s+/)
  const rows = (placement || '').split('/')
  if (rows.length !== 8) return null
  const board = new Array(64).fill('')
  for (let r = 0; r < 8; r++) {
    let c = 0
    for (const ch of rows[r]) {
      if (/[1-8]/.test(ch)) c += Number(ch)
      else if (/[pnbrqkPNBRQK]/.test(ch) && c < 8) board[r * 8 + c++] = ch
      else return null
    }
    if (c !== 8) return null
  }
  if (board.filter(p => p === 'K').length !== 1 || board.filter(p => p === 'k').length !== 1) return null
  return {
    board,
    turn: turn === 'b' ? 'b' : 'w',
    castling: { K: castling.includes('K'), Q: castling.includes('Q'), k: castling.includes('k'), q: castling.includes('q') },
    ep: squareFromName(ep),
    half: Math.max(0, parseInt(half, 10) || 0),
    full: Math.max(1, parseInt(full, 10) || 1)
  }
}

function placementOf (board) {
  const rows = []
  for (let r = 0; r < 8; r++) {
    let row = ''
    let empty = 0
    for (let c = 0; c < 8; c++) {
      const piece = board[r * 8 + c]
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
  return rows.join('/')
}

const castlingText = (castling) => ['K', 'Q', 'k', 'q'].filter(side => castling[side]).join('') || '-'

export function toFen (pos) {
  return [placementOf(pos.board), pos.turn, castlingText(pos.castling), pos.ep >= 0 ? squareName(pos.ep) : '-', pos.half, pos.full].join(' ')
}

// ---------- Attacks ----------

/** Whether `by` ('w' or 'b') attacks square `sq` on this board. */
export function attacked (board, sq, by) {
  const r = rowOf(sq)
  const c = colOf(sq)
  // A white pawn attacks up the board, so it sits one row below the square it attacks
  const dr = by === 'w' ? 1 : -1
  const pawn = pieceOf('p', by)
  for (const dc of [-1, 1]) {
    const s = at(r + dr, c + dc)
    if (s >= 0 && board[s] === pawn) return true
  }
  const knight = pieceOf('n', by)
  for (const [kr, kc] of KNIGHT) {
    const s = at(r + kr, c + kc)
    if (s >= 0 && board[s] === knight) return true
  }
  const king = pieceOf('k', by)
  for (const [kr, kc] of KING) {
    const s = at(r + kr, c + kc)
    if (s >= 0 && board[s] === king) return true
  }
  const queen = pieceOf('q', by)
  const slides = (dirs, piece) => dirs.some(([dr2, dc2]) => {
    for (let rr = r + dr2, cc = c + dc2; ; rr += dr2, cc += dc2) {
      const s = at(rr, cc)
      if (s < 0) return false
      if (board[s]) return board[s] === piece || board[s] === queen
    }
  })
  return slides(ROOK, pieceOf('r', by)) || slides(BISHOP, pieceOf('b', by))
}

export const kingSquare = (board, color) => board.indexOf(pieceOf('k', color))

/** Whether `color`'s king (the side to move, unless said) is in check. */
export const inCheck = (pos, color = pos.turn) => attacked(pos.board, kingSquare(pos.board, color), other(color))

// ---------- Moves ----------

// A move: { from, to, piece, captured, promo, ep, castle, double }. `captured` is the piece
// taken ('' for none), `promo` the small letter a pawn becomes, `castle` 'K' or 'Q' (or the
// small letters for Black), `ep` marks an en passant capture and `double` a pawn's two-step.

function pseudoMoves (pos) {
  const { board, turn } = pos
  const moves = []
  const add = (from, to, extra = {}) => moves.push({ from, to, piece: board[from], captured: board[to], promo: '', ep: false, castle: '', double: false, ...extra })
  for (let from = 0; from < 64; from++) {
    const piece = board[from]
    if (!piece || colorOf(piece) !== turn) continue
    const r = rowOf(from)
    const c = colOf(from)
    const type = typeOf(piece)
    if (type === 'p') {
      const dir = turn === 'w' ? -1 : 1
      const last = turn === 'w' ? 0 : 7
      const pawnTo = (to, extra) => {
        if (rowOf(to) === last) PROMOTIONS.forEach(promo => add(from, to, { ...extra, promo }))
        else add(from, to, extra)
      }
      const one = at(r + dir, c)
      if (one >= 0 && !board[one]) {
        pawnTo(one)
        const two = at(r + dir * 2, c)
        if (r === (turn === 'w' ? 6 : 1) && !board[two]) add(from, two, { double: true })
      }
      for (const dc of [-1, 1]) {
        const to = at(r + dir, c + dc)
        if (to < 0) continue
        if (board[to] && colorOf(board[to]) !== turn) pawnTo(to)
        else if (to === pos.ep && !board[to]) add(from, to, { ep: true, captured: pieceOf('p', other(turn)) })
      }
    } else if (type === 'n' || type === 'k') {
      for (const [dr, dc] of type === 'n' ? KNIGHT : KING) {
        const to = at(r + dr, c + dc)
        if (to >= 0 && colorOf(board[to]) !== turn) add(from, to)
      }
    } else {
      const dirs = type === 'r' ? ROOK : type === 'b' ? BISHOP : [...ROOK, ...BISHOP]
      for (const [dr, dc] of dirs) {
        for (let rr = r + dr, cc = c + dc; ; rr += dr, cc += dc) {
          const to = at(rr, cc)
          if (to < 0) break
          if (board[to]) {
            if (colorOf(board[to]) !== turn) add(from, to)
            break
          }
          add(from, to)
        }
      }
    }
  }
  // Castling: the right still held, the king and rook home, nothing between them, and the king
  // not in check, nor passing through or landing on an attacked square
  const sides = turn === 'w' ? ['K', 'Q'] : ['k', 'q']
  for (const side of sides) {
    const castle = CASTLES[side]
    if (!pos.castling[side] || board[castle.king] !== pieceOf('k', turn) || board[castle.rook] !== pieceOf('r', turn)) continue
    if (castle.path.some(sq => board[sq])) continue
    const enemy = other(turn)
    if (attacked(board, castle.king, enemy) || castle.safe.some(sq => attacked(board, sq, enemy))) continue
    add(castle.king, castle.to, { castle: side })
  }
  return moves
}

/** The position after a move; the one before is left as it was. */
export function applyMove (pos, move) {
  const board = pos.board.slice()
  const piece = board[move.from]
  board[move.from] = ''
  // The pawn taken en passant stands beside the mover, one row back from where it lands
  if (move.ep) board[move.to + (pos.turn === 'w' ? 8 : -8)] = ''
  board[move.to] = move.promo ? pieceOf(move.promo, pos.turn) : piece
  if (move.castle) {
    const { rook, rookTo } = CASTLES[move.castle]
    board[rookTo] = board[rook]
    board[rook] = ''
  }
  const castling = { ...pos.castling }
  for (const sq of [move.from, move.to]) {
    for (const side of RIGHTS_AT[sq] || '') castling[side] = false
  }
  return {
    board,
    turn: other(pos.turn),
    castling,
    ep: move.double ? (move.from + move.to) / 2 : -1,
    half: typeOf(piece) === 'p' || move.captured ? 0 : pos.half + 1,
    full: pos.turn === 'b' ? pos.full + 1 : pos.full
  }
}

/** Every legal move for the side to move. */
export function legalMoves (pos) {
  return pseudoMoves(pos).filter(move => !inCheck(applyMove(pos, move), pos.turn))
}

/** The legal move from one square to another (with `promo` for a pawn reaching the end), or null. */
export function findMove (pos, from, to, promo = '') {
  return legalMoves(pos).find(move => move.from === from && move.to === to && move.promo === (promo || '')) || null
}

/** The move in SAN: e4, exd5, Nbd7, R1e2, O-O, e8=Q, with + for check and # for mate. */
export function toSan (pos, move, moves = legalMoves(pos)) {
  let san
  if (move.castle) {
    san = move.castle.toUpperCase() === 'K' ? 'O-O' : 'O-O-O'
  } else if (typeOf(move.piece) === 'p') {
    san = (move.captured ? FILES[colOf(move.from)] + 'x' : '') + squareName(move.to) + (move.promo ? '=' + move.promo.toUpperCase() : '')
  } else {
    // Another piece of the same kind that could also go there: say which file, rank or square
    const rivals = moves.filter(m => m.to === move.to && m.piece === move.piece && m.from !== move.from)
    let which = ''
    if (rivals.length) {
      if (!rivals.some(m => colOf(m.from) === colOf(move.from))) which = FILES[colOf(move.from)]
      else if (!rivals.some(m => rowOf(m.from) === rowOf(move.from))) which = String(8 - rowOf(move.from))
      else which = squareName(move.from)
    }
    san = typeOf(move.piece).toUpperCase() + which + (move.captured ? 'x' : '') + squareName(move.to)
  }
  const next = applyMove(pos, move)
  if (inCheck(next)) san += legalMoves(next).length ? '+' : '#'
  return san
}

// ---------- The end of a game ----------

// Neither side can ever mate: kings alone, a lone bishop or knight, or only bishops all on
// squares of one color
export function insufficient (board) {
  const minors = []
  for (let sq = 0; sq < 64; sq++) {
    const piece = board[sq]
    if (!piece) continue
    const type = typeOf(piece)
    if (type === 'p' || type === 'r' || type === 'q') return false
    if (type === 'b' || type === 'n') minors.push({ type, shade: (rowOf(sq) + colOf(sq)) % 2 })
  }
  if (minors.length <= 1) return true
  return minors.every(m => m.type === 'b') && minors.every(m => m.shade === minors[0].shade)
}

// Whether `color` has enough to mate at all, for when the other side runs out of time: a pawn,
// rook or queen, or two minor pieces
export function canMate (board, color) {
  let minors = 0
  for (const piece of board) {
    if (!piece || colorOf(piece) !== color) continue
    const type = typeOf(piece)
    if (type === 'p' || type === 'r' || type === 'q') return true
    if (type === 'b' || type === 'n') minors++
  }
  return minors >= 2
}

/**
 * What makes positions the same for repetition: the pieces, the side to move, castling rights,
 * and the en passant square only when a pawn can actually take there.
 */
export function positionKey (pos) {
  const ep = pos.ep >= 0 && legalMoves(pos).some(move => move.ep) ? squareName(pos.ep) : '-'
  return [placementOf(pos.board), pos.turn, castlingText(pos.castling), ep].join(' ')
}

/**
 * Whether the game is over in this position: { winner, reason } with reason checkmate,
 * stalemate, material, fifty or repetition, or null while it goes on. `seen` is how many times
 * this position has come up, this time included.
 */
export function gameOver (pos, seen = 1) {
  if (!legalMoves(pos).length) {
    return inCheck(pos) ? { winner: other(pos.turn), reason: 'checkmate' } : { winner: null, reason: 'stalemate' }
  }
  if (insufficient(pos.board)) return { winner: null, reason: 'material' }
  if (pos.half >= 100) return { winner: null, reason: 'fifty' }
  if (seen >= 3) return { winner: null, reason: 'repetition' }
  return null
}

// ---------- For the players' bars ----------

/**
 * The pieces each side has taken, as small letters, best first, and how far ahead on material
 * each is: { w: { taken, lead }, b: { taken, lead } }. A piece beyond the starting set came
 * from a pawn, so that pawn wasn't taken.
 */
export function material (board) {
  const count = { w: {}, b: {} }
  let score = 0
  for (const piece of board) {
    if (!piece) continue
    const color = colorOf(piece)
    const type = typeOf(piece)
    count[color][type] = (count[color][type] || 0) + 1
    score += color === 'w' ? VALUES[type] : -VALUES[type]
  }
  const missing = (color, type) => {
    const have = count[color][type] || 0
    if (type !== 'p') return Math.max(0, START_COUNT[type] - have)
    const promoted = ['q', 'r', 'b', 'n'].reduce((sum, t) => sum + Math.max(0, (count[color][t] || 0) - START_COUNT[t]), 0)
    return Math.max(0, START_COUNT.p - have - promoted)
  }
  const takenFrom = (color) => ['q', 'r', 'b', 'n', 'p'].flatMap(type => Array(missing(color, type)).fill(type))
  return {
    w: { taken: takenFrom('b'), lead: Math.max(0, score) },
    b: { taken: takenFrom('w'), lead: Math.max(0, -score) }
  }
}
