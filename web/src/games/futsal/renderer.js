import { HALF_W, HALF_H, WALL_X, WALL_Y, GOAL_HALF, GOAL_DEPTH, AREA_R, CIRCLE_R, SECOND_SPOT, PLAYER_R, BALL_R, POST_R, KICK_REACH } from './engine'
import { GREEN, HOT, MONO, DISPLAY, drawText, truncate } from '../ascii/paint'
import { mulberry32 } from '../ascii/random'
import { kitOf, DEFAULT_KITS, DEFAULT_COURT } from './looks'

// Draws Futsal on a canvas, in one of three courts (see looks.js): the hall with its boards, the
// floor, the lines and the goals are painted once per size, and the players, the ball and the
// effects on top every frame. Everything is drawn at exactly the size it is in the engine, so
// what touches on screen touches in the match.
//
// On a screen taller than it is wide the court stands on end, turned so that one team attacks up
// the screen (turn 1: home, turn -1: away). Shapes are drawn in court units through a transform
// that turns with it; writing (numbers, names, the boards' messages) is placed through the same
// mapping but stays upright, or runs along its board.

const BOARD = 1.3 // the advertising boards round the hall, just outside its walls
const VX = WALL_X + BOARD
const VY = WALL_Y + BOARD
export const VIEW_W = VX * 2
export const VIEW_H = VY * 2
const LINE = 0.16 // painted lines, in units
const REACH = PLAYER_R + BALL_R + KICK_REACH // how far from a player's middle a kick reaches

// Each court's colours. glow: lines and the ball shine; led: the boards carry scrolling
// messages in this colour (otherwise they're a fence); scan: scanlines over everything.
const THEMES = {
  neon: {
    outside: '#000000',
    board: '#020a04',
    boardEdge: 'rgba(0, 255, 0, 0.45)',
    boardDots: 'rgba(0, 255, 0, 0.08)',
    led: '#39ff6a',
    runoff: '#010d05',
    runoffMark: 'rgba(0, 255, 0, 0.05)',
    area: 'rgba(0, 255, 0, 0.08)',
    circle: 'rgba(0, 255, 0, 0.05)',
    line: '#4dff7a',
    glow: 'rgba(0, 255, 0, 0.85)',
    frame: '#eaffea',
    frameStripe: null,
    frameDark: '#0b4d1d',
    net: 'rgba(140, 255, 170, 0.4)',
    netEdge: 'rgba(170, 255, 190, 0.85)',
    netFloor: 'rgba(0, 26, 9, 0.95)',
    logo: 'rgba(0, 255, 0, 0.12)',
    label: 'rgba(0, 255, 0, 0.5)',
    zone: 'rgba(170, 255, 190, 0.9)',
    trail: '200, 255, 210',
    me: '#c8ffc8',
    ballGlow: [200, 255, 210, 0.35],
    scan: true
  },
  arena: {
    outside: '#05070c',
    board: '#0a1222',
    boardEdge: 'rgba(255, 255, 255, 0.35)',
    boardDots: 'rgba(255, 255, 255, 0.05)',
    led: '#ffe066',
    runoff: '#183a69',
    runoffMark: 'rgba(255, 255, 255, 0.035)',
    area: 'rgba(30, 92, 186, 0.9)',
    circle: 'rgba(30, 92, 186, 0.9)',
    line: '#f7f7f2',
    glow: null,
    frame: '#ffffff',
    frameStripe: '#e23b3b',
    frameDark: '#4a0c0c',
    net: 'rgba(255, 255, 255, 0.45)',
    netEdge: 'rgba(255, 255, 255, 0.9)',
    netFloor: 'rgba(8, 18, 38, 0.7)',
    logo: 'rgba(255, 255, 255, 0.22)',
    label: 'rgba(255, 255, 255, 0.7)',
    zone: 'rgba(255, 255, 255, 0.9)',
    trail: '255, 255, 255',
    me: '#ffffff',
    ballGlow: null,
    scan: false
  },
  street: {
    outside: '#09090a',
    board: '#141516',
    boardEdge: 'rgba(200, 205, 210, 0.5)',
    fence: 'rgba(185, 190, 196, 0.42)',
    led: null,
    runoff: '#46484b',
    runoffMark: 'rgba(0, 0, 0, 0.2)',
    area: 'rgba(214, 64, 52, 0.3)',
    circle: null,
    line: '#f2eee2',
    glow: null,
    frame: '#d9dcdf',
    frameStripe: null,
    frameDark: '#33363a',
    net: 'rgba(225, 225, 225, 0.38)',
    netEdge: 'rgba(235, 235, 235, 0.8)',
    netFloor: 'rgba(16, 16, 18, 0.82)',
    logo: 'rgba(255, 207, 51, 0.2)',
    label: 'rgba(242, 238, 226, 0.6)',
    zone: 'rgba(255, 207, 51, 0.95)',
    trail: '255, 245, 220',
    me: '#ffffff',
    ballGlow: null,
    scan: false
  }
}

const themeOf = (court) => THEMES[court] || THEMES[DEFAULT_COURT]

/** Screen size in units, and where a court position lands on screen (units from the top left). */
export function screenOf (turn) {
  if (turn === 1) return { w: VIEW_H, h: VIEW_W, at: (x, y) => [y + VY, VX - x] }
  if (turn === -1) return { w: VIEW_H, h: VIEW_W, at: (x, y) => [VY - y, x + VX] }
  return { w: VIEW_W, h: VIEW_H, at: (x, y) => [x + VX, y + VY] }
}

// The transform that draws court units at k pixels each, turned like the screen, shifted by (ox, oy) pixels
function courtTransform (ctx, turn, k, ox = 0, oy = 0) {
  if (turn === 1) ctx.setTransform(0, -k, k, 0, k * VY + ox, k * VX + oy)
  else if (turn === -1) ctx.setTransform(0, k, -k, 0, k * VY + ox, k * VX + oy)
  else ctx.setTransform(k, 0, 0, k, k * VX + ox, k * VY + oy)
}

const strokeLine = (ctx, x0, y0, x1, y1) => {
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.stroke()
}

// The penalty area by goal side s: a quarter circle round each post joined by a straight line
function areaPath (ctx, s) {
  const goalLine = s * HALF_W
  const front = goalLine - s * AREA_R
  ctx.beginPath()
  if (s < 0) {
    ctx.arc(goalLine, -GOAL_HALF, AREA_R, -Math.PI / 2, 0)
    ctx.lineTo(front, GOAL_HALF)
    ctx.arc(goalLine, GOAL_HALF, AREA_R, 0, Math.PI / 2)
  } else {
    ctx.arc(goalLine, -GOAL_HALF, AREA_R, -Math.PI / 2, -Math.PI, true)
    ctx.lineTo(front, GOAL_HALF)
    ctx.arc(goalLine, GOAL_HALF, AREA_R, Math.PI, Math.PI / 2, true)
  }
}

// ---------- Floors ----------

function neonFloor (ctx, th, random) {
  ctx.fillStyle = '#03200d'
  ctx.fillRect(-HALF_W, -HALF_H, HALF_W * 2, HALF_H * 2)
  // Broad panels down the length, and fine seams across
  ctx.fillStyle = '#042812'
  for (let i = 0, x = -HALF_W; x < HALF_W; x += 5, i++) if (i % 2) ctx.fillRect(x, -HALF_H, 5, HALF_H * 2)
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.06)'
  ctx.lineWidth = 0.05
  for (let y = -HALF_H + 2.5; y < HALF_H; y += 2.5) strokeLine(ctx, -HALF_W, y, HALF_W, y)
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(0, 255, 0, ${0.03 + random() * 0.05})`
    ctx.fillRect(-HALF_W + random() * HALF_W * 2, -HALF_H + random() * HALF_H * 2, 0.08, 0.08)
  }
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, HALF_W)
  glow.addColorStop(0, 'rgba(0, 255, 0, 0.08)')
  glow.addColorStop(1, 'rgba(0, 255, 0, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(-HALF_W, -HALF_H, HALF_W * 2, HALF_H * 2)
}

// Varnished planks down the length of the court
function parquet (ctx, th, random) {
  const tones = ['#c48a4c', '#bb8045', '#cf9658', '#b87c42', '#c99050', '#b3773d', '#d29a5c']
  const row = 0.85
  for (let y = -HALF_H; y < HALF_H; y += row) {
    let x = -HALF_W - random() * 6
    while (x < HALF_W) {
      const length = 4 + random() * 6
      ctx.fillStyle = tones[Math.floor(random() * tones.length)]
      ctx.fillRect(x, y, length, row)
      ctx.fillStyle = 'rgba(90, 48, 18, 0.12)'
      ctx.fillRect(x, y + row * (0.25 + random() * 0.5), length, 0.04)
      ctx.fillStyle = 'rgba(60, 28, 8, 0.4)'
      ctx.fillRect(x + length - 0.03, y, 0.03, row)
      x += length
    }
    ctx.fillStyle = 'rgba(60, 28, 8, 0.32)'
    ctx.fillRect(-HALF_W, y, HALF_W * 2, 0.03)
  }
  const sheen = ctx.createLinearGradient(-HALF_W, -HALF_H, HALF_W, HALF_H)
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0)')
  sheen.addColorStop(0.35, 'rgba(255, 255, 255, 0.12)')
  sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0)')
  sheen.addColorStop(0.72, 'rgba(255, 255, 255, 0.07)')
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = sheen
  ctx.fillRect(-HALF_W, -HALF_H, HALF_W * 2, HALF_H * 2)
}

// Asphalt: grit, a few repairs, stains and cracks
function asphalt (ctx, th, random) {
  ctx.fillStyle = '#2b2d31'
  ctx.fillRect(-HALF_W, -HALF_H, HALF_W * 2, HALF_H * 2)
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)'
    ctx.fillRect(-HALF_W + random() * 50, -HALF_H + random() * 24, 3 + random() * 7, 2 + random() * 4)
  }
  const grit = ['rgba(255, 255, 255, 0.09)', 'rgba(0, 0, 0, 0.3)', 'rgba(255, 255, 255, 0.05)', 'rgba(255, 230, 200, 0.06)']
  for (let i = 0; i < 2800; i++) {
    const size = 0.05 + random() * 0.09
    ctx.fillStyle = grit[i % grit.length]
    ctx.fillRect(-HALF_W + random() * HALF_W * 2, -HALF_H + random() * HALF_H * 2, size, size)
  }
  for (let i = 0; i < 4; i++) {
    const x = -HALF_W + 4 + random() * 52
    const y = -HALF_H + 3 + random() * 24
    const stain = ctx.createRadialGradient(x, y, 0, x, y, 1.5 + random() * 2)
    stain.addColorStop(0, 'rgba(0, 0, 0, 0.35)')
    stain.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = stain
    ctx.fillRect(x - 4, y - 4, 8, 8)
  }
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.lineWidth = 0.07
  for (let i = 0; i < 6; i++) {
    let x = -HALF_W + random() * HALF_W * 2
    let y = -HALF_H + random() * HALF_H * 2
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let j = 0; j < 6; j++) {
      x += (random() - 0.5) * 3
      y += (random() - 0.5) * 3
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

const FLOORS = { neon: neonFloor, arena: parquet, street: asphalt }

// ---------- The hall round the court ----------

// The boards' texture, LED dots or a chain-link fence, as a repeating pattern filled into the
// four strips round the hall, in screen pixels. (Drawing it dot by dot through a clip is many
// thousands of draws, too much for some graphics drivers.)
function paintBoardTexture (ctx, th, screen, k) {
  const tile = document.createElement('canvas')
  const t = tile.getContext('2d')
  if (th.fence) {
    const size = Math.max(6, Math.round(0.6 * k))
    tile.width = tile.height = size
    t.strokeStyle = th.fence
    t.lineWidth = Math.max(1, 0.05 * k)
    t.beginPath()
    t.moveTo(0, 0)
    t.lineTo(size, size)
    t.moveTo(size, 0)
    t.lineTo(0, size)
    t.stroke()
  } else {
    const size = Math.max(3, Math.round(0.3 * k))
    const dot = Math.max(1, Math.round(0.1 * k))
    tile.width = tile.height = size
    t.fillStyle = th.boardDots
    t.fillRect(Math.floor((size - dot) / 2), Math.floor((size - dot) / 2), dot, dot)
  }
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = ctx.createPattern(tile, 'repeat')
  for (const [x0, y0, x1, y1] of [[-VX, -VY, VX, -WALL_Y], [-VX, WALL_Y, VX, VY], [-VX, -WALL_Y, -WALL_X, WALL_Y], [WALL_X, -WALL_Y, VX, WALL_Y]]) {
    const [ax, ay] = screen.at(x0, y0)
    const [bx, by] = screen.at(x1, y1)
    ctx.fillRect(Math.min(ax, bx) * k, Math.min(ay, by) * k, Math.abs(bx - ax) * k, Math.abs(by - ay) * k)
  }
  ctx.restore()
}

function paintHall (ctx, th, court, random, screen, k) {
  ctx.fillStyle = th.outside
  ctx.fillRect(-VX - 1, -VY - 1, VX * 2 + 2, VY * 2 + 2)
  // The boards: LED panels with joins, or a fence on posts for the street
  ctx.fillStyle = th.board
  ctx.fillRect(-VX, -VY, VX * 2, VY * 2)
  paintBoardTexture(ctx, th, screen, k)
  ctx.strokeStyle = th.fence ? 'rgba(150, 155, 160, 0.8)' : 'rgba(0, 0, 0, 0.8)'
  ctx.lineWidth = th.fence ? 0.22 : 0.08
  const every = th.fence ? 6 : 7
  for (let x = -VX + every; x < VX; x += every) {
    strokeLine(ctx, x, -VY, x, -WALL_Y)
    strokeLine(ctx, x, WALL_Y, x, VY)
  }

  // The floor round the court, up to the walls
  ctx.fillStyle = th.runoff
  ctx.fillRect(-WALL_X, -WALL_Y, WALL_X * 2, WALL_Y * 2)
  ctx.save()
  ctx.beginPath()
  ctx.rect(-WALL_X, -WALL_Y, WALL_X * 2, WALL_Y * 2)
  ctx.clip()
  ctx.strokeStyle = th.runoffMark
  if (court === 'street') {
    ctx.lineWidth = 0.08
    for (let x = -WALL_X; x < WALL_X; x += 6) strokeLine(ctx, x, -WALL_Y, x, WALL_Y)
    for (let y = -WALL_Y; y < WALL_Y; y += 6) strokeLine(ctx, -WALL_X, y, WALL_X, y)
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.18)'
      ctx.fillRect(-WALL_X + random() * WALL_X * 2, -WALL_Y + random() * WALL_Y * 2, 0.09, 0.09)
    }
  } else {
    ctx.lineWidth = 0.12
    for (let d = -WALL_X - WALL_Y * 2; d < WALL_X + WALL_Y * 2; d += 1.4) strokeLine(ctx, d, -WALL_Y, d + WALL_Y * 2, WALL_Y)
  }
  ctx.restore()
  ctx.strokeStyle = th.boardEdge
  ctx.lineWidth = 0.12
  ctx.strokeRect(-WALL_X, -WALL_Y, WALL_X * 2, WALL_Y * 2)
}

// Each team's bench area, dashed in its colours, on the near side beside halfway
function paintBenches (ctx, kits) {
  ctx.save()
  ctx.lineWidth = 0.12
  ctx.setLineDash([0.5, 0.35])
  kits.forEach((kit, team) => {
    const x = team === 0 ? -16 : 8
    ctx.strokeStyle = kit.main
    ctx.globalAlpha = 0.75
    ctx.strokeRect(x, HALF_H + 1, 8, WALL_Y - HALF_H - 1.5)
    ctx.globalAlpha = 0.35
    ctx.fillStyle = kit.dark
    ctx.fillRect(x + 0.6, WALL_Y - 1.3, 6.8, 0.8)
  })
  ctx.restore()
}

// ---------- Lines and goals ----------

function paintLines (ctx, th, k, court, random) {
  // Painted areas under the lines
  if (th.area) {
    ctx.fillStyle = th.area
    for (const s of [-1, 1]) {
      areaPath(ctx, s)
      ctx.closePath()
      ctx.fill()
    }
  }
  if (th.circle) {
    ctx.fillStyle = th.circle
    ctx.beginPath()
    ctx.arc(0, 0, CIRCLE_R, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.save()
  ctx.strokeStyle = th.line
  ctx.fillStyle = th.line
  ctx.lineWidth = LINE
  if (th.glow) {
    ctx.shadowColor = th.glow
    ctx.shadowBlur = Math.max(2, k * 0.45)
  }
  ctx.strokeRect(-HALF_W, -HALF_H, HALF_W * 2, HALF_H * 2)
  strokeLine(ctx, 0, -HALF_H, 0, HALF_H)
  ctx.beginPath()
  ctx.arc(0, 0, CIRCLE_R, 0, Math.PI * 2)
  ctx.stroke()
  const spot = (x, y, r = 0.24) => {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  spot(0, 0, 0.3)
  for (const s of [-1, 1]) {
    areaPath(ctx, s)
    ctx.stroke()
    const goalLine = s * HALF_W
    spot(goalLine - s * AREA_R, 0)
    spot(goalLine - s * SECOND_SPOT, 0)
    // The second mark's neighbours, five metres either side
    spot(goalLine - s * SECOND_SPOT, -7.5, 0.16)
    spot(goalLine - s * SECOND_SPOT, 7.5, 0.16)
    // Corner arcs, and the marks for the distance at a corner
    for (const sy of [-1, 1]) {
      ctx.beginPath()
      const a = Math.atan2(-sy, -s)
      ctx.arc(goalLine, sy * HALF_H, 0.7, a - Math.PI / 4, a + Math.PI / 4)
      ctx.stroke()
      strokeLine(ctx, goalLine, sy * (HALF_H - 7.5), goalLine + s * 0.6, sy * (HALF_H - 7.5))
    }
    // Substitution zones on the bench side
    for (const x of [7.5, 15]) strokeLine(ctx, s * x, HALF_H - 0.6, s * x, HALF_H + 0.6)
  }
  ctx.restore()

  // Street lines are worn: grit over them
  if (court === 'street') {
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = `rgba(43, 45, 49, ${0.4 + random() * 0.5})`
      ctx.fillRect(-HALF_W - 0.3 + random() * (HALF_W * 2 + 0.6), -HALF_H - 0.3 + random() * (HALF_H * 2 + 0.6), 0.1, 0.1)
    }
  }
}

function paintGoals (ctx, th, k) {
  for (const s of [-1, 1]) {
    const goalLine = s * HALF_W
    const back = s * (HALF_W + GOAL_DEPTH)
    const left = Math.min(goalLine, back)
    // The frame's shadow on the floor
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)'
    ctx.lineWidth = 0.3
    strokeLine(ctx, goalLine + 0.3, -GOAL_HALF + 0.4, goalLine + 0.3, GOAL_HALF + 0.4)
    // The net: its floor, the mesh and its edges
    ctx.fillStyle = th.netFloor
    ctx.fillRect(left, -GOAL_HALF, GOAL_DEPTH, GOAL_HALF * 2)
    ctx.save()
    ctx.beginPath()
    ctx.rect(left, -GOAL_HALF, GOAL_DEPTH, GOAL_HALF * 2)
    ctx.clip()
    ctx.strokeStyle = th.net
    ctx.lineWidth = 0.05
    for (let d = -GOAL_HALF * 2 - 4; d < GOAL_HALF * 2 + 4; d += 0.55) {
      strokeLine(ctx, left - 1, d, left + GOAL_DEPTH + 1, d + GOAL_DEPTH + 2)
      strokeLine(ctx, left - 1, d, left + GOAL_DEPTH + 1, d - GOAL_DEPTH - 2)
    }
    ctx.restore()
    ctx.strokeStyle = th.netEdge
    ctx.lineWidth = 0.1
    ctx.beginPath()
    ctx.moveTo(goalLine, -GOAL_HALF)
    ctx.lineTo(back, -GOAL_HALF)
    ctx.lineTo(back, GOAL_HALF)
    ctx.lineTo(goalLine, GOAL_HALF)
    ctx.stroke()
    // The crossbar over the goal line, striped on the arena's goals, and the posts
    ctx.save()
    if (th.glow) {
      ctx.shadowColor = th.glow
      ctx.shadowBlur = Math.max(2, k * 0.4)
    }
    ctx.lineCap = 'round'
    ctx.strokeStyle = th.frame
    ctx.lineWidth = 0.34
    strokeLine(ctx, goalLine, -GOAL_HALF, goalLine, GOAL_HALF)
    if (th.frameStripe) {
      ctx.lineCap = 'butt'
      ctx.strokeStyle = th.frameStripe
      ctx.setLineDash([0.8, 0.8])
      strokeLine(ctx, goalLine, -GOAL_HALF, goalLine, GOAL_HALF)
      ctx.setLineDash([])
    }
    ctx.restore()
    for (const sy of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(goalLine, sy * GOAL_HALF, POST_R, 0, Math.PI * 2)
      ctx.fillStyle = th.frame
      ctx.fill()
      ctx.lineWidth = 0.1
      ctx.strokeStyle = th.frameDark
      ctx.stroke()
    }
  }
}

/**
 * The court as one picture, `unit` CSS pixels to a unit: the hall, its boards, the floor, the
 * lines and the goals. labels: the two teams' names, [home, away]; kits: theirs, [home, away].
 */
function paintCourt ({ unit, dpr, turn, court, kits, labels }) {
  const k = unit * dpr
  const th = themeOf(court)
  const screen = screenOf(turn)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(screen.w * k))
  canvas.height = Math.max(1, Math.round(screen.h * k))
  const ctx = canvas.getContext('2d')
  const random = mulberry32(court === 'arena' ? 11 : court === 'street' ? 23 : 29)
  courtTransform(ctx, turn, k)

  paintHall(ctx, th, court, random, screen, k)
  paintBenches(ctx, kits)
  ctx.save()
  ctx.beginPath()
  ctx.rect(-HALF_W, -HALF_H, HALF_W * 2, HALF_H * 2)
  ctx.clip()
  FLOORS[court in FLOORS ? court : DEFAULT_COURT](ctx, th, random)
  ctx.restore()
  paintLines(ctx, th, k, court, random)
  paintGoals(ctx, th, k)

  // Upright writing: the name in the middle, and each team's end and which way it plays
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const write = (text, x, y, size, color, font = DISPLAY) => {
    const [sx, sy] = screen.at(x, y)
    ctx.font = `${size * k}px ${font}`
    ctx.fillStyle = color
    ctx.fillText(text, sx * k, sy * k)
  }
  write('FUTSAL', 0, 0, 2.6, th.logo)
  if (labels) {
    // In each team's colours: beside the benches, or on a phone beside the nets
    const label = (team, str, sx, sy) => {
      ctx.font = `700 ${1.05 * k}px ${MONO}`
      ctx.fillStyle = kits[team].main
      ctx.fillText(str, sx * k, sy * k)
    }
    if (turn === 0) {
      label(0, `${labels[0]} >>`, ...screen.at(-24, HALF_H + 2.2))
      label(1, `<< ${labels[1]}`, ...screen.at(24, HALF_H + 2.2))
    } else {
      // The team attacking up the screen defends the bottom end
      const [up, down] = turn === 1 ? [0, 1] : [1, 0]
      label(down, `${labels[down]} v`, 8.5, BOARD + 1.1)
      label(up, `${labels[up]} ^`, 8.5, screen.h - BOARD - 1.1)
    }
  }
  return canvas
}

// ---------- Sprites ----------

// A player: shadow, shirt, rim and number, upright. Away shirts carry an inner ring so the teams
// tell apart without colour; `me` adds a halo and `held` (kick ready) lights the rim.
function paintPlayer ({ unit, dpr, kit, team, me, held, mark, th }) {
  const k = unit * dpr
  const r = PLAYER_R * k
  const pad = Math.ceil(r * 0.9) + 4
  const size = Math.ceil(r * 2 + pad * 2)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const c = size / 2
  // Shadow, down and to the right
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
  ctx.beginPath()
  ctx.ellipse(c + r * 0.16, c + r * 0.26, r * 1.02, r * 0.96, 0, 0, Math.PI * 2)
  ctx.fill()
  if (me) {
    ctx.save()
    ctx.strokeStyle = th.me
    ctx.lineWidth = Math.max(1.5 * dpr, 0.12 * k)
    ctx.shadowColor = th.me
    ctx.shadowBlur = r * 0.5
    ctx.beginPath()
    ctx.arc(c, c, r + 0.3 * k, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
  const shirt = ctx.createRadialGradient(c - r * 0.35, c - r * 0.4, r * 0.1, c, c, r)
  shirt.addColorStop(0, '#ffffff')
  shirt.addColorStop(0.22, kit.main)
  shirt.addColorStop(1, kit.dark)
  ctx.save()
  if (held) {
    ctx.shadowColor = HOT
    ctx.shadowBlur = r * 0.7
  }
  ctx.beginPath()
  ctx.arc(c, c, r - 0.08 * k, 0, Math.PI * 2)
  ctx.fillStyle = shirt
  ctx.fill()
  ctx.restore()
  ctx.lineWidth = held ? 0.26 * k : 0.16 * k
  ctx.strokeStyle = held ? HOT : kit.dark
  ctx.stroke()
  ctx.lineWidth = Math.max(1, 0.05 * k)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)'
  ctx.beginPath()
  ctx.arc(c, c, r, 0, Math.PI * 2)
  ctx.stroke()
  if (team === 1) {
    ctx.globalAlpha = 0.5
    ctx.lineWidth = 0.08 * k
    ctx.strokeStyle = kit.text
    ctx.beginPath()
    ctx.arc(c, c, r * 0.7, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1
  }
  if (mark) {
    ctx.font = `800 ${r * 1.05}px ${MONO}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = Math.max(1, r * 0.12)
    ctx.strokeStyle = kit.dark
    ctx.lineJoin = 'round'
    ctx.strokeText(mark, c, c + r * 0.06)
    ctx.fillStyle = kit.text
    ctx.fillText(mark, c, c + r * 0.06)
  }
  return { canvas, cx: c, cy: c }
}

// A tile of ball skin, white with dark patches, that repeats in both directions: sliding it
// under a round window makes the ball roll
function paintBallSkin (unit, dpr) {
  const r = BALL_R * unit * dpr
  const size = Math.max(8, Math.round(r * 4))
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#f7f7f2'
  ctx.fillRect(0, 0, size, size)
  const patch = (x, y, radius) => {
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        ctx.beginPath()
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i * Math.PI * 2) / 5
          ctx.lineTo(x + ox + Math.cos(a) * radius, y + oy + Math.sin(a) * radius)
        }
        ctx.closePath()
        ctx.fillStyle = '#16181a'
        ctx.fill()
      }
    }
  }
  const step = size / 2
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) patch(col * step + (row % 2) * step * 0.5 + step * 0.25, row * step + step * 0.5, r * 0.42)
  }
  return canvas
}

export function createRenderer (canvas) {
  const ctx = canvas.getContext('2d')
  let width = 0
  let height = 0
  let dpr = 1
  let unit = 0 // CSS pixels per unit
  let turn = 0
  let screen = screenOf(0)
  let labels = null
  let look = { court: DEFAULT_COURT, kits: DEFAULT_KITS.map(kitOf) }
  let th = themeOf(DEFAULT_COURT)
  let court = null
  let ballSkin = null
  let scanlines = null
  const sprites = new Map()
  const textWidths = new Map()
  // The ball's roll: how far its skin has slid, and where it was last frame (CSS pixels)
  const roll = { x: 0, y: 0, last: null }

  function build () {
    sprites.clear()
    textWidths.clear()
    if (!width) return
    th = themeOf(look.court)
    court = paintCourt({ unit, dpr, turn, court: look.court, kits: look.kits, labels })
    ballSkin = paintBallSkin(unit, dpr)
    scanlines = null
    if (th.scan) {
      const tile = document.createElement('canvas')
      tile.width = 1
      tile.height = Math.max(3, Math.round(3 * dpr))
      const t = tile.getContext('2d')
      t.fillStyle = 'rgba(0, 0, 0, 0.22)'
      t.fillRect(0, 0, 1, Math.max(1, Math.round(dpr)))
      scanlines = ctx.createPattern(tile, 'repeat')
    }
  }

  function playerSprite (team, mark, me, held) {
    const kit = look.kits[team]
    const key = `${team}${mark}${me}${held}`
    let sprite = sprites.get(key)
    if (!sprite) {
      sprite = paintPlayer({ unit, dpr, kit, team, me, held, mark, th })
      sprites.set(key, sprite)
    }
    return sprite
  }

  // Court units to CSS pixels on the canvas
  const at = (x, y) => {
    const [sx, sy] = screen.at(x, y)
    return [sx * unit, sy * unit]
  }
  // A direction on the court as an angle on screen
  const screenAngle = (angle) => {
    const [x0, y0] = screen.at(0, 0)
    const [x1, y1] = screen.at(Math.cos(angle), Math.sin(angle))
    return Math.atan2(y1 - y0, x1 - x0)
  }
  // Sizes are in units, but small text never shrinks below `min` CSS pixels, so the court
  // stays readable zoomed out on a phone
  const text = (str, [x, y], { size = 1, min = 0, ...style } = {}) =>
    drawText(ctx, str, x, y, { px: Math.max(min, size * unit), dpr, ...style })

  const shifted = { x: 0, y: 0 }
  const toCourt = () => courtTransform(ctx, turn, unit * dpr, shifted.x * dpr, shifted.y * dpr)
  const toScreen = () => ctx.setTransform(dpr, 0, 0, dpr, shifted.x * dpr, shifted.y * dpr)

  // The boards along the touchlines carry a message that scrolls along them
  function boards (board, time) {
    if (!th.led || !board?.text) return
    const color = board.color || th.led
    if (board.blink && Math.floor(time * 4) % 2) return
    const strip = BOARD * unit
    const px = strip * 0.78
    ctx.font = `${px}px ${DISPLAY}`
    const key = `${board.text}|${px}`
    let w = textWidths.get(key)
    if (!w) {
      w = ctx.measureText(board.text).width
      textWidths.set(key, w)
    }
    if (!w) return
    for (const side of [-1, 1]) {
      const y = side * (WALL_Y + BOARD / 2)
      const [ax, ay] = at(-VX, y)
      const [bx, by] = at(VX, y)
      const angle = Math.atan2(by - ay, bx - ax)
      const length = Math.hypot(bx - ax, by - ay)
      ctx.save()
      toScreen()
      ctx.translate(ax, ay)
      ctx.rotate(angle)
      ctx.beginPath()
      ctx.rect(0, -strip / 2, length, strip)
      ctx.clip()
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = px * 0.35 * dpr
      // The two sides scroll opposite ways
      const offset = (((side > 0 ? time : -time) * 5 * unit) % w + w) % w
      for (let x = -offset; x < length; x += w) ctx.fillText(board.text, x, strip * 0.04)
      ctx.restore()
    }
  }

  function drawBall (x, y, glow) {
    const r = BALL_R * unit
    const [sx, sy] = at(x, y)
    // The skin slides the way the ball goes; a jump (a line-up after a goal) doesn't count
    if (roll.last) {
      const dx = sx - roll.last[0]
      const dy = sy - roll.last[1]
      if (Math.hypot(dx, dy) < unit * 6) {
        roll.x += dx
        roll.y += dy
      }
    }
    roll.last = [sx, sy]
    ctx.save()
    toScreen()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
    ctx.beginPath()
    ctx.ellipse(sx + r * 0.25, sy + r * 0.35, r, r * 0.92, 0, 0, Math.PI * 2)
    ctx.fill()
    if (glow) {
      const [red, green, blue, alpha] = glow
      const halo = ctx.createRadialGradient(sx, sy, r * 0.8, sx, sy, r * 2.4)
      halo.addColorStop(0, `rgba(${red}, ${green}, ${blue}, ${alpha})`)
      halo.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`)
      ctx.fillStyle = halo
      ctx.fillRect(sx - r * 2.5, sy - r * 2.5, r * 5, r * 5)
    }
    ctx.beginPath()
    ctx.arc(sx, sy, r, 0, Math.PI * 2)
    ctx.save()
    ctx.clip()
    const tile = ballSkin.width / dpr
    const ox = ((roll.x % tile) + tile) % tile
    const oy = ((roll.y % tile) + tile) % tile
    for (let ix = -1; ix <= 1; ix++) {
      for (let iy = -1; iy <= 1; iy++) ctx.drawImage(ballSkin, sx - r + ox + ix * tile - tile / 2, sy - r + oy + iy * tile - tile / 2, tile, tile)
    }
    const shade = ctx.createRadialGradient(sx - r * 0.35, sy - r * 0.4, r * 0.1, sx, sy, r)
    shade.addColorStop(0, 'rgba(255, 255, 255, 0.55)')
    shade.addColorStop(0.45, 'rgba(255, 255, 255, 0)')
    shade.addColorStop(1, 'rgba(0, 0, 0, 0.55)')
    ctx.fillStyle = shade
    ctx.fillRect(sx - r, sy - r, r * 2, r * 2)
    ctx.restore()
    ctx.lineWidth = Math.max(1, r * 0.1)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)'
    ctx.stroke()
    ctx.restore()
  }

  /**
   * scene: {
   *   ball: { x, y }, trail: [{ x, y }],
   *   players: [{ x, y, team, mark, look, held, label, marker, facing }] (look: me, mate or foe;
   *     facing: the way they're heading, radians on the court),
   *   zone: { x, y, r } (the ring the kick-off keeps opponents out of), countdown: { x, y, text },
   *   rings: [{ x, y, age, ttl, color, from, to }] (shock rings from hard kicks),
   *   net: { side, y, age, color } (a ball just in the net), board: { text, color, blink },
   *   particles: [{ x, y, ch, color, life, ttl, square, spin }],
   *   texts: [{ text, dy, size, display, color, alpha }] (dy: units below the middle of the screen),
   *   flash, flashColor: 'r, g, b', shake, time
   * }
   * Positions are court units, except the texts, which stay put on screen whichever way it's turned.
   */
  function draw (scene) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    if (!court) return
    shifted.x = scene.shake > 0 ? (Math.random() * 2 - 1) * scene.shake * unit * 0.6 : 0
    shifted.y = scene.shake > 0 ? (Math.random() * 2 - 1) * scene.shake * unit * 0.6 : 0
    ctx.setTransform(1, 0, 0, 1, shifted.x * dpr, shifted.y * dpr)
    ctx.drawImage(court, 0, 0)

    boards(scene.board, scene.time)

    toCourt()
    // A ball in the net: the mesh lights up in the scoring team's colours and ripples
    if (scene.net) {
      const { side, y, age, color } = scene.net
      const fade = Math.max(0, 1 - age / 1.4)
      const left = side > 0 ? HALF_W : -HALF_W - GOAL_DEPTH
      ctx.save()
      ctx.beginPath()
      ctx.rect(left, -GOAL_HALF, GOAL_DEPTH, GOAL_HALF * 2)
      ctx.clip()
      ctx.fillStyle = color
      ctx.globalAlpha = 0.3 * fade
      ctx.fillRect(left, -GOAL_HALF, GOAL_DEPTH, GOAL_HALF * 2)
      ctx.globalAlpha = 0.8 * fade
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 0.12
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.arc(side * (HALF_W + GOAL_DEPTH), y, age * 10 + i * 1.3, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()
    }

    // The kick-off's ring: a dashed circle that slowly turns, so it reads as a rule rather than a line
    if (scene.zone) {
      const { x, y, r } = scene.zone
      ctx.save()
      ctx.strokeStyle = th.zone
      ctx.globalAlpha = 0.75
      ctx.lineWidth = 0.14
      ctx.setLineDash([0.55, 0.65])
      ctx.lineDashOffset = -scene.time * 1.4
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    // A fast ball leaves a streak
    if (scene.trail.length > 1) {
      ctx.save()
      ctx.lineCap = 'round'
      for (let i = 1; i < scene.trail.length; i++) {
        const f = i / scene.trail.length
        ctx.strokeStyle = `rgba(${th.trail}, ${0.45 * f})`
        ctx.lineWidth = BALL_R * 1.6 * f
        strokeLine(ctx, scene.trail[i - 1].x, scene.trail[i - 1].y, scene.trail[i].x, scene.trail[i].y)
      }
      ctx.restore()
    }

    // Shock rings from hard kicks
    for (const ring of scene.rings || []) {
      const f = ring.age / ring.ttl
      if (f >= 1) continue
      ctx.save()
      ctx.strokeStyle = ring.color
      ctx.globalAlpha = (1 - f) * 0.8
      ctx.lineWidth = 0.18 * (1 - f) + 0.04
      ctx.beginPath()
      ctx.arc(ring.x, ring.y, ring.from + (ring.to - ring.from) * Math.sqrt(f), 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    // A player holding kick shows how far it reaches
    for (const p of scene.players) {
      if (!p.held) continue
      ctx.save()
      ctx.strokeStyle = p.look === 'me' ? HOT : look.kits[p.team].main
      ctx.globalAlpha = p.look === 'me' ? 0.7 : 0.35
      ctx.lineWidth = 0.1
      ctx.setLineDash([0.3, 0.3])
      ctx.beginPath()
      ctx.arc(p.x, p.y, REACH, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    // Players: a pointer the way each one's heading, then the shirt
    toScreen()
    for (const p of scene.players) {
      const [x, y] = at(p.x, p.y)
      if (typeof p.facing === 'number') {
        const kit = look.kits[p.team]
        const a = screenAngle(p.facing)
        const r = PLAYER_R * unit
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(a)
        ctx.beginPath()
        ctx.moveTo(r + 0.55 * unit, 0)
        ctx.lineTo(r - 0.1 * unit, -0.42 * unit)
        ctx.lineTo(r - 0.1 * unit, 0.42 * unit)
        ctx.closePath()
        ctx.fillStyle = kit.main
        ctx.fill()
        ctx.lineWidth = Math.max(1, 0.06 * unit)
        ctx.strokeStyle = kit.dark
        ctx.stroke()
        ctx.restore()
      }
      const sprite = playerSprite(p.team, p.mark, p.look === 'me', !!p.held)
      ctx.drawImage(sprite.canvas, x - sprite.cx / dpr, y - sprite.cy / dpr, sprite.canvas.width / dpr, sprite.canvas.height / dpr)
    }

    drawBall(scene.ball.x, scene.ball.y, th.ballGlow)

    // Sparks and confetti
    toScreen()
    for (const p of scene.particles) {
      const alpha = Math.max(0, p.life / p.ttl)
      if (p.square) {
        const [x, y] = at(p.x, p.y)
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.translate(x, y)
        ctx.rotate((p.spin || 6) * p.life)
        ctx.fillStyle = p.color
        ctx.fillRect(-0.24 * unit, -0.14 * unit, 0.48 * unit, 0.28 * unit)
        ctx.restore()
      } else {
        text(p.ch, at(p.x, p.y), { min: 8, color: p.color, alpha, glow: false, outline: false })
      }
    }

    // Names over the players, and a marker over this device's own
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const labelPx = Math.max(9, unit * 0.9)
    for (const p of scene.players) {
      const [x, y] = at(p.x, p.y)
      const above = y - PLAYER_R * unit - labelPx * 0.85
      if (p.marker) drawText(ctx, 'v', x, above, { px: labelPx * 1.15, dpr, color: th.me })
      else if (p.label) drawText(ctx, truncate(p.label, 12), x, above, { px: labelPx, dpr, color: p.look === 'foe' ? '#cfd8cf' : '#ffffff', glow: false })
    }
    if (scene.countdown) text(scene.countdown.text, at(scene.countdown.x, scene.countdown.y), { size: 2.2, min: 16, display: true, color: GREEN })
    for (const item of scene.texts) text(item.text, [width / 2, height / 2 + item.dy * unit], item)
    if (scene.flash > 0) {
      ctx.fillStyle = `rgba(${scene.flashColor || '0, 255, 0'}, ${0.24 * scene.flash})`
      ctx.fillRect(0, 0, width, height)
    }
    if (scanlines) {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = scanlines
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
  }

  return {
    resize (cssWidth, cssHeight, pixelRatio, nextTurn = 0) {
      // The same size again (a resize observer firing twice) needs no new paint
      if (court && cssWidth === width && cssHeight === height && pixelRatio === dpr && nextTurn === turn) return
      width = cssWidth
      height = cssHeight
      dpr = pixelRatio
      turn = nextTurn
      screen = screenOf(turn)
      unit = width / screen.w
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      roll.last = null
      build()
    },
    setLabels (next) {
      if (next?.join() === labels?.join()) return
      labels = next
      build()
    },
    /** The court and the kits: { court, kits: [home, away] } by id. */
    setLook ({ court, kits }) {
      const next = { court: court || DEFAULT_COURT, kits: (kits || DEFAULT_KITS).map(kitOf) }
      if (next.court === look.court && next.kits.every((kit, i) => kit.id === look.kits[i].id)) return
      look = next
      build()
    },
    // Fonts that finish loading later need the court and sprites painted again
    rebuild: build,
    draw
  }
}
