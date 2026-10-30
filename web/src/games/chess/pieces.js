// The chess pieces, drawn the way a real set looks, for both the board (a canvas) and the page
// around it (SVG). Each piece is a stack of parts in a 100 × 100 box, standing on y = 92, drawn
// bottom to top: a part is filled in its side's color and outlined; `line` parts are only a
// stroke (the bishop's slit, the knight's mane) and `ink` parts are filled with the outline
// color (the knight's eye).
//
// The two sides glow in the two classic monitor colors: White's pieces white, Black's amber,
// so they never mix with each other or the green board.

export const SIDES = {
  w: { fill: '#f2f6ea', shade: '#aebba3', line: '#28311f', glow: 'rgba(235, 255, 225, 0.5)' },
  b: { fill: '#ffb000', shade: '#c47400', line: '#3d2300', glow: 'rgba(255, 176, 0, 0.55)' }
}

const circle = (cx, cy, r) => `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} Z`
// A band with rounded ends, from x0 to x1 between y0 and y1
const band = (x0, x1, y0, y1) => {
  const r = (y1 - y0) / 2
  return `M${x0 + r} ${y0} L${x1 - r} ${y0} A${r} ${r} 0 0 1 ${x1 - r} ${y1} L${x0 + r} ${y1} A${r} ${r} 0 0 1 ${x0 + r} ${y0} Z`
}

const BASE = { d: 'M18 92 L82 92 Q82 84 73 82 L27 82 Q18 84 18 92 Z' }
const BODY = { d: 'M32 82 Q40 66 42 54 L58 54 Q60 66 68 82 Z' }

export const PIECES = {
  p: [
    BASE,
    { d: 'M32 82 Q38 70 42 60 L58 60 Q62 70 68 82 Z' },
    { d: band(34, 66, 54, 61) },
    { d: circle(50, 40, 14) }
  ],
  r: [
    { d: 'M16 92 L84 92 Q84 84 75 82 L25 82 Q16 84 16 92 Z' },
    { d: 'M29 82 L33 44 L67 44 L71 82 Z' },
    { d: 'M27 41 L27 16 L37 16 L37 25 L45 25 L45 16 L55 16 L55 25 L63 25 L63 16 L73 16 L73 41 Z' },
    { d: band(29, 71, 39, 46) }
  ],
  n: [
    BASE,
    { d: 'M71 82 C73 64 75 44 66 30 L62 13 L55 22 C44 22 33 32 25 46 C21 52 22 58 28 60 C33 61 38 58 42 56 C44 64 36 72 31 82 Z' },
    { d: 'M63 32 C67 46 67 62 65 78', line: true },
    { d: circle(45, 35, 3.2), ink: true }
  ],
  b: [
    BASE,
    { d: 'M34 82 Q40 68 44 58 L56 58 Q60 68 66 82 Z' },
    { d: band(35, 65, 52, 59) },
    { d: 'M50 17 C62 27 67 39 60 53 L40 53 C33 39 38 27 50 17 Z' },
    { d: circle(50, 13, 5.5) },
    { d: 'M56 28 L46 41', line: true }
  ],
  q: [
    BASE,
    BODY,
    { d: 'M36 54 L27 26 L39 40 L38 19 L48 36 L50 14 L52 36 L62 19 L61 40 L73 26 L64 54 Z' },
    { d: band(34, 66, 50, 57) },
    ...[[27, 25], [38, 18], [50, 12], [62, 18], [73, 25]].map(([x, y]) => ({ d: circle(x, y, 3.8) }))
  ],
  k: [
    BASE,
    BODY,
    { d: 'M47 5 L53 5 L53 12 L60 12 L60 18 L53 18 L53 33 L47 33 L47 18 L40 18 L40 12 L47 12 Z' },
    { d: 'M34 52 C27 40 36 29 50 33 C64 29 73 40 66 52 Z' },
    { d: band(34, 66, 50, 57) }
  ]
}

export const LINE_WIDTH = 3
