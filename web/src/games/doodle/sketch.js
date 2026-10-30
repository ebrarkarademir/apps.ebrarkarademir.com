// The drawing board of Doodle Race. A drawing is a list of operations painted on one fixed
// 800×600 canvas, which every screen then scales to its own size, so each device ends up with
// the same picture: the drawer's, and everyone's who gets the same operations.
//
// Operations:
//   { id, t: 'line', c, w, p: [x, y, x, y, ...] }  a stroke in color c, w wide
//   { id, t: 'fill', c, x, y }                      a flood fill from one point
//   { id, t: 'clear' }                              a blank board
// Undo drops the last operation and paints the others again.

export const WIDTH = 800
export const HEIGHT = 600
// The basic colors, as the palette lays them out in two rows of six, and black to erase with.
// The site's phosphor green is the one a turn starts with.
export const COLORS = [
  '#ffffff', '#ff3b30', '#ff9500', '#ffe100', '#00ff00', '#2f6bff',
  '#9e9e9e', '#8b5a2b', '#ff5fc8', '#a24bff', '#00d5ff', '#007a00'
]
export const START_COLOR = COLORS.indexOf('#00ff00')
export const ERASER = '#000000'
// The greens the palette used to have, so a drawing from a page that hasn't updated yet still shows
const OLD_COLORS = ['#00b300', '#002600']
export const SIZES = [4, 10, 24]
// Points per drawing, so one runaway turn can't flood the network, and a whole drawing still
// fits in one message for someone who joins late
export const MAX_POINTS = 20000
// How far (summed over r, g, b) a pixel may be off the clicked color and still get filled.
// Below the darkest color's distance from the black board, so every color can fill an empty board.
const FILL_TOLERANCE = 24

const rgb = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))

export function createSketch () {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  let ops = []
  let points = 0
  const sketch = {
    canvas,
    // Called after every change, to repaint whatever shows the board
    onChange: null,
    get ops () {
      return ops
    },
    get full () {
      return points >= MAX_POINTS
    },

    /** Starts over with a blank board. */
    reset () {
      ops = []
      points = 0
      repaint()
    },

    /** Adds one operation; false when it isn't a valid one. */
    add (op) {
      const clean = cleanOp(op)
      if (!clean || ops.some(other => other.id === clean.id)) return false
      if (clean.t === 'line') {
        if (points >= MAX_POINTS) return false
        points += clean.p.length / 2
      }
      ops.push(clean)
      paint(clean)
      changed()
      return true
    },

    /** More points for the stroke `id`, drawn on from where it got to. */
    extend (id, more) {
      const op = ops.findLast(other => other.id === id)
      if (!op || op.t !== 'line' || !Array.isArray(more)) return false
      const room = Math.max(0, (MAX_POINTS - points) * 2)
      const pts = coords(more).slice(0, room - (room % 2))
      if (!pts.length) return false
      const from = op.p.length
      op.p.push(...pts)
      points += pts.length / 2
      stroke(op, from)
      changed()
      return true
    },

    undo () {
      if (!ops.length) return false
      const op = ops.pop()
      if (op.t === 'line') points -= op.p.length / 2
      repaint()
      return true
    },

    /** Replaces the whole drawing, e.g. for a player who joined mid-turn. */
    load (list) {
      ops = (Array.isArray(list) ? list : []).map(cleanOp).filter(Boolean)
      points = ops.reduce((sum, op) => sum + (op.t === 'line' ? op.p.length / 2 : 0), 0)
      repaint()
    }
  }

  function changed () {
    sketch.onChange?.()
  }

  function blank () {
    ctx.fillStyle = ERASER
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
  }

  function repaint () {
    blank()
    ops.forEach(paint)
    changed()
  }

  function paint (op) {
    if (op.t === 'line') stroke(op, 0)
    else if (op.t === 'fill') fill(op.x, op.y, op.c)
    else blank()
  }

  // Draws a stroke from point `from` on (an index into p). Always a dot to start with, then
  // each segment on its own: however the points arrived, in one go or a few at a time, every
  // device paints exactly the same pixels, which matters for where a fill stops.
  function stroke (op, from) {
    const p = op.p
    ctx.strokeStyle = op.c
    ctx.fillStyle = op.c
    ctx.lineWidth = op.w
    ctx.lineCap = 'round'
    if (from === 0) {
      ctx.beginPath()
      ctx.arc(p[0], p[1], op.w / 2, 0, Math.PI * 2)
      ctx.fill()
    }
    for (let i = Math.max(2, from); i < p.length; i += 2) {
      ctx.beginPath()
      ctx.moveTo(p[i - 2], p[i - 1])
      ctx.lineTo(p[i], p[i + 1])
      ctx.stroke()
    }
  }

  // Scanline flood fill over every pixel close to the color that was clicked
  function fill (x, y, color) {
    const image = ctx.getImageData(0, 0, WIDTH, HEIGHT)
    const data = image.data
    const [r, g, b] = rgb(color)
    const at = (y * WIDTH + x) * 4
    const target = [data[at], data[at + 1], data[at + 2]]
    if (Math.abs(target[0] - r) + Math.abs(target[1] - g) + Math.abs(target[2] - b) <= FILL_TOLERANCE) return
    const done = new Uint8Array(WIDTH * HEIGHT)
    const matches = (pixel) => {
      if (done[pixel]) return false
      const i = pixel * 4
      return Math.abs(data[i] - target[0]) + Math.abs(data[i + 1] - target[1]) + Math.abs(data[i + 2] - target[2]) <= FILL_TOLERANCE
    }
    const stack = [y * WIDTH + x]
    while (stack.length) {
      const seed = stack.pop()
      if (!matches(seed)) continue
      const row = Math.floor(seed / WIDTH)
      let left = seed
      let right = seed
      while (left % WIDTH > 0 && matches(left - 1)) left--
      while (right % WIDTH < WIDTH - 1 && matches(right + 1)) right++
      for (let pixel = left; pixel <= right; pixel++) {
        done[pixel] = 1
        const i = pixel * 4
        data[i] = r
        data[i + 1] = g
        data[i + 2] = b
        data[i + 3] = 255
        if (row > 0 && matches(pixel - WIDTH)) stack.push(pixel - WIDTH)
        if (row < HEIGHT - 1 && matches(pixel + WIDTH)) stack.push(pixel + WIDTH)
      }
    }
    ctx.putImageData(image, 0, 0)
  }

  blank()
  return sketch
}

// Whole numbers on the board, in pairs
function coords (list) {
  const out = []
  for (let i = 0; i + 1 < list.length; i += 2) {
    const x = Number(list[i])
    const y = Number(list[i + 1])
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    out.push(Math.min(WIDTH - 1, Math.max(0, Math.round(x))), Math.min(HEIGHT - 1, Math.max(0, Math.round(y))))
  }
  return out
}

const allowed = new Set([...COLORS, ...OLD_COLORS, ERASER])

// Operations arrive from other devices, so only well-formed ones get painted
function cleanOp (op) {
  if (!op || typeof op !== 'object' || typeof op.id !== 'string') return null
  if (op.t === 'clear') return { id: op.id, t: 'clear' }
  if (!allowed.has(op.c)) return null
  if (op.t === 'fill') {
    const [x, y] = coords([op.x, op.y])
    return x === undefined ? null : { id: op.id, t: 'fill', c: op.c, x, y }
  }
  if (op.t === 'line' && Array.isArray(op.p) && SIZES.includes(op.w)) {
    const p = coords(op.p)
    return p.length ? { id: op.id, t: 'line', c: op.c, w: op.w, p } : null
  }
  return null
}
