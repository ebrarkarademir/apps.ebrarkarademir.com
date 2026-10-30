// The pieces of Dama ASCII, in the same format as the chess pieces (see chess/pieces.js) so
// the chess board draws them: round stones seen a little from the side, White's white and
// Black's amber. A king (a dama) is two stones stacked, with a crown on top.

const ellipse = (cx, cy, rx, ry) => `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`

// A stone whose top face is centered at y = top: its side first, then its face
const stone = (top, ring = true) => [
  { d: `M12 ${top} L12 ${top + 14} A38 14 0 0 0 88 ${top + 14} L88 ${top} Z` },
  { d: ellipse(50, top, 38, 14) },
  ...(ring ? [{ d: ellipse(50, top, 24, 8.5), line: true }] : [])
]

export const DAMA_PIECES = {
  man: stone(64),
  king: [
    ...stone(64, false),
    ...stone(44, false),
    { d: 'M36 49 L33 33 L42 40 L50 28 L58 40 L67 33 L64 49 Z', ink: true }
  ]
}

// What the chess board needs to draw them
export const DAMA_SET = {
  letters: 'wWbB',
  colorOf: (ch) => ch.toLowerCase(),
  typeOf: (ch) => (ch === 'W' || ch === 'B' ? 'king' : 'man'),
  pieces: DAMA_PIECES
}
