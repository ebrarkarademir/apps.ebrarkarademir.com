// The pieces of Dama ASCII, in the same format as the chess pieces (see chess/pieces.js) so
// the chess board draws them: round stones seen straight from above, White's white and
// Black's amber, with grooved rings like a real draughts stone. A king (a dama) carries a
// crown in the middle.

const circle = (cx, cy, r) => `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} Z`

const STONE = [
  { d: circle(50, 52, 38) },
  { d: circle(50, 52, 29), line: true }
]

export const DAMA_PIECES = {
  man: [
    ...STONE,
    { d: circle(50, 52, 17), line: true }
  ],
  king: [
    ...STONE,
    { d: 'M33 63 L29 41 L40 50 L50 35 L60 50 L71 41 L67 63 Z', ink: true }
  ]
}

// What the chess board needs to draw them
export const DAMA_SET = {
  letters: 'wWbB',
  colorOf: (ch) => ch.toLowerCase(),
  typeOf: (ch) => (ch === 'W' || ch === 'B' ? 'king' : 'man'),
  pieces: DAMA_PIECES
}
