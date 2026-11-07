import { W, H, GROUND, GOAL_W, GOAL_H, BAR, BAR_Y, BALL_R, HEAD_R, HEAD_Y, KICK_LENGTH, footOf, facing } from './engine.js'
import { CHARACTERS, SHIRTS, SHIRT_DARK, lookOf } from './characters.js'
import { DISPLAY } from '../ascii/paint.js'

// Draws Head Ball as daylight pixel art, like Crater Duel: the pitch is painted W by H pixels
// into a small picture of its own and blown up onto the screen with hard edges. Behind the
// pitch: a sky with a sun and clouds, a stand full of people who jump when someone scores, and
// a row of boards. In front: striped grass, the goals with their nets, the two players and the
// ball. Words go on top at the screen's own resolution.

export const OUTLINE = '#141018'
const WHITE = '#f6f6f0'
const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 997
const CROWD = ['#e8402a', '#2f6ee8', '#ffd23a', '#f6f6f0', '#7ad94a', '#ff8ad8', '#c58bff', '#ff9a3a']
const SKINS = ['#f2c8a0', '#e0a878', '#8a5634', '#c8946a', '#f6d2b0']
const STAND_TOP = 52
const BOARDS_Y = GROUND - 14

// A filled round block, a row at a time, so its edge stays hard
function disc (g, cx, cy, r, color) {
  g.fillStyle = color
  const x0 = Math.round(cx)
  const y0 = Math.round(cy)
  const R = Math.ceil(r)
  for (let dy = -R; dy <= R; dy++) {
    const span = r * r - dy * dy
    if (span < 0) continue
    const half = Math.floor(Math.sqrt(span))
    g.fillRect(x0 - half, y0 + dy, half * 2 + 1, 1)
  }
}

// Part of a round block: only the rows from y0 to y1, and only on one side of x if `side` is given
function discPart (g, cx, cy, r, color, y0, y1, side = 0, from = 0) {
  g.fillStyle = color
  const X = Math.round(cx)
  const Y = Math.round(cy)
  const R = Math.ceil(r)
  for (let dy = -R; dy <= R; dy++) {
    const y = Y + dy
    if (y < y0 || y > y1) continue
    const span = r * r - dy * dy
    if (span < 0) continue
    const half = Math.floor(Math.sqrt(span))
    let a = X - half
    let b = X + half
    if (side > 0) a = Math.max(a, X + from)
    if (side < 0) b = Math.min(b, X - from)
    if (b >= a) g.fillRect(a, y, b - a + 1, 1)
  }
}

function paintBackdrop () {
  const layer = document.createElement('canvas')
  layer.width = W
  layer.height = H
  const g = layer.getContext('2d')
  // The sky, in bands with a checkered seam between them
  const sky = ['#4aa4f0', '#62b2f4', '#7cc0f6', '#98cef8']
  const band = STAND_TOP / sky.length
  sky.forEach((color, i) => {
    g.fillStyle = color
    g.fillRect(0, Math.floor(i * band), W, Math.ceil(band) + 1)
    if (i < sky.length - 1) {
      g.fillStyle = sky[i + 1]
      const y0 = Math.floor((i + 1) * band) - 2
      for (let y = y0; y < y0 + 2; y++) for (let x = y % 2; x < W; x += 2) g.fillRect(x, y, 1, 1)
    }
  })
  disc(g, 262, 18, 11, '#fff8c8')
  disc(g, 262, 18, 8, '#fff2a8')
  // Clouds
  for (const [cx, cy, s] of [[48, 16, 1], [130, 28, 0.8], [200, 12, 0.7]]) {
    disc(g, cx, cy, 6 * s, WHITE)
    disc(g, cx + 7 * s, cy - 2, 7 * s, WHITE)
    disc(g, cx + 15 * s, cy, 5 * s, WHITE)
    g.fillStyle = WHITE
    g.fillRect(Math.round(cx), Math.round(cy), Math.round(15 * s), Math.round(5 * s))
  }
  // Floodlights at both ends
  for (const x of [34, W - 40]) {
    g.fillStyle = '#5a5a6a'
    g.fillRect(x + 2, 8, 2, STAND_TOP - 8)
    g.fillStyle = OUTLINE
    g.fillRect(x - 1, 2, 8, 7)
    g.fillStyle = '#fff6c0'
    for (let i = 0; i < 3; i++) g.fillRect(x + i * 2, 3, 1, 2)
    for (let i = 0; i < 3; i++) g.fillRect(x + i * 2, 6, 1, 2)
  }
  // The stand: a roof edge, then tiers of concrete
  g.fillStyle = '#3a3a52'
  g.fillRect(0, STAND_TOP - 4, W, 4)
  g.fillStyle = OUTLINE
  g.fillRect(0, STAND_TOP, W, 1)
  for (let y = STAND_TOP + 1; y < BOARDS_Y; y++) {
    g.fillStyle = ((y - STAND_TOP) % 9) < 1 ? '#4a4a64' : '#5c5c78'
    g.fillRect(0, y, W, 1)
  }
  return layer
}

// The people in the stand, a layer of their own so they can jump
function paintCrowd () {
  const layer = document.createElement('canvas')
  layer.width = W
  layer.height = BOARDS_Y - STAND_TOP + 4
  const g = layer.getContext('2d')
  for (let row = 0; row < 9; row++) {
    const y = 4 + row * 9
    for (let x = (row % 2) * 3; x < W; x += 6) {
      if (hash(x, row) % 9 === 0) continue // an empty seat
      const shirt = CROWD[hash(x, row + 7) % CROWD.length]
      const skin = SKINS[hash(x + 3, row) % SKINS.length]
      g.fillStyle = shirt
      g.fillRect(x, y + 3, 4, 4)
      g.fillStyle = skin
      g.fillRect(x + 1, y, 2, 3)
      if (hash(x, row + 2) % 5 === 0) {
        g.fillStyle = shirt
        g.fillRect(x - 1, y - 2, 1, 4) // an arm up
      }
    }
  }
  return layer
}

function paintPitch () {
  const layer = document.createElement('canvas')
  layer.width = W
  layer.height = H
  const g = layer.getContext('2d')
  // The boards along the front of the stand
  const boards = ['#ffd23a', '#2f6ee8', '#e8402a', '#7ad94a']
  for (let i = 0; i < 8; i++) {
    const x = i * 40
    g.fillStyle = boards[i % boards.length]
    g.fillRect(x, BOARDS_Y, 40, 14)
    g.fillStyle = 'rgba(255,255,255,0.75)'
    for (let k = 0; k < 4; k++) g.fillRect(x + 8 + k * 7, BOARDS_Y + 5, 4, 4)
    g.fillStyle = OUTLINE
    g.fillRect(x, BOARDS_Y, 1, 14)
  }
  g.fillStyle = OUTLINE
  g.fillRect(0, BOARDS_Y - 1, W, 1)
  // Grass in stripes, with the lit edge on top
  for (let i = 0; i < 10; i++) {
    g.fillStyle = i % 2 ? '#4aa83a' : '#58b844'
    g.fillRect(i * 32, GROUND, 32, H - GROUND)
  }
  g.fillStyle = '#c4f27a'
  g.fillRect(0, GROUND, W, 1)
  g.fillStyle = '#3a8a2e'
  for (let x = 0; x < W; x += 3) if (hash(x, 1) % 3 === 0) g.fillRect(x, GROUND + 1 + (hash(x, 2) % 18), 1, 2)
  // The halfway line and the goal lines, in perspective along the grass
  g.fillStyle = 'rgba(255,255,255,0.8)'
  g.fillRect(W / 2 - 1, GROUND + 1, 2, H - GROUND)
  g.fillRect(GOAL_W - 1, GROUND + 1, 1, H - GROUND)
  g.fillRect(W - GOAL_W, GROUND + 1, 1, H - GROUND)
  disc(g, W / 2, GROUND + 11, 3, 'rgba(255,255,255,0.8)')
  return layer
}

// A goal's net, behind the players: a frame of white with a mesh of lines inside
function paintNet (g, x0, x1, back) {
  const top = BAR_Y + BAR
  g.fillStyle = 'rgba(20,16,24,0.25)'
  g.fillRect(x0, top, x1 - x0, GROUND - top)
  g.fillStyle = 'rgba(246,246,240,0.55)'
  for (let y = top + 3; y < GROUND; y += 4) g.fillRect(x0, y, x1 - x0, 1)
  for (let x = x0 + 2; x < x1; x += 4) g.fillRect(x, top, 1, GROUND - top)
  // The back post at the end of the pitch
  g.fillStyle = OUTLINE
  g.fillRect(back - 1, BAR_Y - 1, 4, GROUND - BAR_Y + 1)
  g.fillStyle = '#c8c8d0'
  g.fillRect(back, BAR_Y, 2, GROUND - BAR_Y)
}

// The crossbar and front post, in front of everything
function paintFrame (g, x0, x1, post) {
  g.fillStyle = OUTLINE
  g.fillRect(x0, BAR_Y - 1, x1 - x0, BAR + 2)
  g.fillRect(post - 2, BAR_Y - 1, 5, GROUND - BAR_Y + 1)
  g.fillStyle = WHITE
  g.fillRect(x0, BAR_Y, x1 - x0, BAR)
  g.fillRect(post - 1, BAR_Y, 3, GROUND - BAR_Y)
  g.fillStyle = '#c8c8d0'
  g.fillRect(x0, BAR_Y + BAR - 1, x1 - x0, 1)
}

// ---------- The players ----------

function drawHair (g, look, hx, hy, dir) {
  const R = HEAD_R
  const { hair, style } = look
  if (style === 'short' || style === 'spiky' || style === 'long') {
    discPart(g, hx, hy, R, hair, hy - R, hy - 5)
    // Down the back of the head
    discPart(g, hx, hy, R, hair, hy - 5, hy + (style === 'long' ? R : 2), -dir, 2)
    if (style === 'long') {
      g.fillStyle = hair
      g.fillRect(dir > 0 ? hx - R - 1 : hx + R - 2, hy, 3, R + 3)
    }
    if (style === 'spiky') {
      for (let i = -2; i <= 2; i++) {
        const x = Math.round(hx + i * 4)
        g.fillStyle = OUTLINE
        g.fillRect(x - 1, hy - R - 5, 3, 5)
        g.fillStyle = hair
        g.fillRect(x, hy - R - 4, 1, 4)
      }
    }
  } else if (style === 'band') {
    g.fillStyle = hair
    discPart(g, hx, hy, R, hair, hy - 7, hy - 4)
    g.fillRect(dir > 0 ? hx - R - 3 : hx + R, hy - 6, 3, 2)
    g.fillRect(dir > 0 ? hx - R - 4 : hx + R + 1, hy - 4, 3, 2)
  } else if (style === 'cap') {
    discPart(g, hx, hy, R + 1, OUTLINE, hy - R - 2, hy - 3)
    discPart(g, hx, hy, R, hair, hy - R, hy - 4)
    g.fillStyle = OUTLINE
    g.fillRect(dir > 0 ? hx + 2 : hx - R - 7, hy - 5, R + 5, 3)
    g.fillStyle = hair
    g.fillRect(dir > 0 ? hx + 3 : hx - R - 6, hy - 4, R + 3, 1)
    g.fillStyle = WHITE
    g.fillRect(hx - 1, hy - R + 2, 2, 2)
  }
}

function drawPlayer (g, p, lookIndex, time, celebrate) {
  const look = CHARACTERS[lookOf(lookIndex)]
  const dir = facing(p.side)
  const x = Math.round(p.x)
  const y = Math.round(p.y)
  const shirt = SHIRTS[p.side]
  const dark = SHIRT_DARK[p.side]
  const hx = x
  const hy = y - HEAD_Y
  const kicking = p.kick > 0
  const air = !p.ground
  // Shadow on the grass, smaller the higher up
  const lift = Math.min(1, (GROUND - p.y) / 60)
  g.fillStyle = 'rgba(0,0,0,0.25)'
  const sw = Math.round(14 - lift * 6)
  g.fillRect(x - sw / 2, GROUND, sw, 2)

  // Legs: the back one, then the front one swinging for a kick
  const step = air ? 0 : Math.round(Math.sin(p.run) * 2)
  const legTop = y - 7
  const leg = (lx, ly, color, boot) => {
    g.fillStyle = OUTLINE
    g.fillRect(lx - 1, legTop - 1, 4, ly - legTop + 2)
    g.fillStyle = color
    g.fillRect(lx, legTop, 2, ly - legTop)
    g.fillStyle = OUTLINE
    g.fillRect(lx - 1 + (dir > 0 ? 0 : -2), ly - 1, 6, 4)
    g.fillStyle = boot
    g.fillRect(lx + (dir > 0 ? 0 : -2), ly, 4, 2)
  }
  leg(x - dir * 2 - step, air ? y - 3 : y - 2, look.skin, '#2a2a2a')
  const foot = footOf(p)
  if (foot && kicking) {
    // The kicking leg, from the hip out to the foot
    const fx = Math.round(foot.x)
    const fy = Math.round(foot.y)
    const steps = 6
    for (let i = 0; i <= steps; i++) {
      const lx = Math.round(x + dir * 2 + (fx - x - dir * 2) * (i / steps))
      const ly = Math.round(legTop + (fy - legTop) * (i / steps))
      g.fillStyle = OUTLINE
      g.fillRect(lx - 1, ly - 1, 4, 4)
    }
    for (let i = 0; i <= steps; i++) {
      const lx = Math.round(x + dir * 2 + (fx - x - dir * 2) * (i / steps))
      const ly = Math.round(legTop + (fy - legTop) * (i / steps))
      g.fillStyle = look.skin
      g.fillRect(lx, ly, 2, 2)
    }
    g.fillStyle = OUTLINE
    g.fillRect(fx - 3, fy - 2, 7, 5)
    g.fillStyle = WHITE
    g.fillRect(fx - 2, fy - 1, 5, 3)
  } else {
    leg(x + dir * 2 + step, air ? y - 4 : y - 2, look.skin, WHITE)
  }

  // The body: shorts and a shirt with a number stripe, arms at the sides (up to celebrate)
  g.fillStyle = OUTLINE
  g.fillRect(x - 6, y - 15, 12, 10)
  g.fillStyle = '#2a2a38'
  g.fillRect(x - 5, y - 8, 10, 2)
  g.fillStyle = shirt
  g.fillRect(x - 5, y - 14, 10, 6)
  g.fillStyle = dark
  g.fillRect(x - 5, y - 9, 10, 1)
  g.fillStyle = WHITE
  g.fillRect(x - 1, y - 13, 2, 3)
  const armUp = celebrate ? Math.round(Math.sin(time * 14) * 2) : 0
  for (const s of [-1, 1]) {
    const ax = x + s * 7 - (s > 0 ? 1 : 0)
    g.fillStyle = OUTLINE
    g.fillRect(ax - 1, y - 15 - (celebrate ? 6 + armUp : 0), 4, celebrate ? 10 : 8)
    g.fillStyle = shirt
    g.fillRect(ax, y - 14 - (celebrate ? 6 + armUp : 0), 2, 3)
    g.fillStyle = look.skin
    g.fillRect(ax, y - 11 - (celebrate ? 6 + armUp : 0), 2, celebrate ? 5 : 3)
  }

  // The head, big: outline, skin, hair, a big eye looking forward, a brow and a mouth
  if (look.style === 'afro') {
    disc(g, hx - dir * 2, hy - 3, HEAD_R + 4, OUTLINE)
    disc(g, hx - dir * 2, hy - 3, HEAD_R + 3, look.hair)
    for (let i = 0; i < 14; i++) {
      g.fillStyle = '#3a2a20'
      g.fillRect(hx - dir * 2 + (hash(i, 3) % 22) - 11, hy - 3 + (hash(i, 5) % 18) - 12, 1, 1)
    }
    disc(g, hx + dir * 2, hy + 1, HEAD_R - 2, look.skin)
  } else {
    disc(g, hx, hy, HEAD_R + 1, OUTLINE)
    disc(g, hx, hy, HEAD_R, look.skin)
    // A shade on the back of the head
    discPart(g, hx, hy, HEAD_R, 'rgba(0,0,0,0.12)', hy - HEAD_R, hy + HEAD_R, -dir, 6)
    drawHair(g, look, hx, hy, dir)
  }
  // The ear on the back of the head
  g.fillStyle = look.skin
  g.fillRect(hx - dir * 6 - 1, hy, 3, 3)
  g.fillStyle = OUTLINE
  g.fillRect(hx - dir * 6, hy + 1, 1, 1)
  // Eye: white with the pupil forward; shut for a moment after a kick
  const ex = hx + dir * 5
  const ey = hy - 1
  if (kicking && p.kick > KICK_LENGTH * 0.5) {
    g.fillStyle = OUTLINE
    g.fillRect(ex - 2, ey + 1, 5, 1)
  } else {
    // A tall oval of white, the pupil at its front edge
    g.fillStyle = WHITE
    g.fillRect(ex - 1, ey - 3, 4, 6)
    g.fillRect(ex - 2, ey - 2, 6, 4)
    g.fillStyle = OUTLINE
    g.fillRect(ex + (dir > 0 ? 1 : -1), ey - 2, 2, 4)
  }
  // Brow, nose and mouth
  g.fillStyle = OUTLINE
  g.fillRect(ex - 2, ey - 5, 6, 1)
  g.fillStyle = 'rgba(0,0,0,0.3)'
  g.fillRect(hx + dir * (HEAD_R - 2) - (dir > 0 ? 0 : 1), hy + 3, 2, 1)
  g.fillStyle = OUTLINE
  if (celebrate) {
    g.fillRect(hx + dir * 4 - 2, hy + 6, 5, 3)
    g.fillStyle = '#c83a3a'
    g.fillRect(hx + dir * 4 - 1, hy + 7, 3, 1)
  } else {
    g.fillRect(hx + dir * 4 - 1, hy + 7, 4, 1)
  }
}

function drawBall (g, ball) {
  const x = Math.round(ball.x)
  const y = Math.round(ball.y)
  // Its shadow on the grass
  const lift = Math.min(1, (GROUND - ball.y) / 80)
  g.fillStyle = `rgba(0,0,0,${0.3 - lift * 0.18})`
  const sw = Math.round(10 - lift * 5)
  g.fillRect(x - Math.floor(sw / 2), GROUND, sw, 2)
  disc(g, x, y, BALL_R + 1, OUTLINE)
  disc(g, x, y, BALL_R, WHITE)
  // Black patches that turn with the ball
  g.fillStyle = OUTLINE
  for (let k = 0; k < 3; k++) {
    const a = ball.spin + (k * Math.PI * 2) / 3
    g.fillRect(Math.round(x + Math.cos(a) * 3) - 1, Math.round(y + Math.sin(a) * 3) - 1, 2, 2)
  }
  g.fillRect(x, y, 1, 1)
  g.fillStyle = '#ffffff'
  g.fillRect(x - 3, y - 4, 2, 1)
}

// A little arrow over this device's player
function drawMarker (g, p, time) {
  const x = Math.round(p.x)
  const y = Math.round(p.y - HEAD_Y - HEAD_R - 8 + Math.sin(time * 6) * 1.5)
  g.fillStyle = OUTLINE
  g.fillRect(x - 4, y - 1, 9, 3)
  g.fillRect(x - 3, y + 2, 7, 2)
  g.fillRect(x - 1, y + 4, 3, 2)
  g.fillStyle = '#ffd23a'
  g.fillRect(x - 3, y, 7, 1)
  g.fillRect(x - 2, y + 1, 5, 1)
  g.fillRect(x - 1, y + 2, 3, 1)
  g.fillRect(x, y + 3, 1, 1)
}

export function createRenderer (canvas) {
  const ctx = canvas.getContext('2d')
  const art = document.createElement('canvas')
  art.width = W
  art.height = H
  const g = art.getContext('2d')
  let width = 0
  let height = 0
  let dpr = 1
  let backdrop = null
  let crowd = null
  let pitch = null

  function build () {
    backdrop = paintBackdrop()
    crowd = paintCrowd()
    pitch = paintPitch()
  }

  function resize (w, h, ratio) {
    width = w
    height = h
    dpr = ratio
    canvas.width = Math.max(1, Math.round(w * dpr))
    canvas.height = Math.max(1, Math.round(h * dpr))
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
  }

  /**
   * scene: { view, looks: [n, n], me (side or -1), cheer (side cheering or -1), crowdJump (0..1),
   * particles: [{ x, y, color, size }], texts: [{ text, dy, size, color, alpha }], flash, shake, time }
   */
  function draw (scene) {
    if (!backdrop) build()
    const { view, time } = scene
    g.drawImage(backdrop, 0, 0)
    // The crowd bobs; after a goal it jumps
    const bob = scene.crowdJump > 0 ? -Math.abs(Math.sin(time * 16)) * 3 * scene.crowdJump : Math.round(Math.sin(time * 2)) * 0
    g.drawImage(crowd, 0, STAND_TOP + Math.round(bob))
    g.drawImage(pitch, 0, 0)
    paintNet(g, 0, GOAL_W, 1)
    paintNet(g, W - GOAL_W, W, W - 3)
    if (view) {
      view.players.forEach((p, i) => drawPlayer(g, p, scene.looks[i], time, scene.cheer === i))
      drawBall(g, view.ball)
      if (scene.me >= 0 && view.phase !== 'end') drawMarker(g, view.players[scene.me], time)
    }
    paintFrame(g, 0, GOAL_W, GOAL_W)
    paintFrame(g, W - GOAL_W, W, W - GOAL_W)
    for (const q of scene.particles) {
      g.fillStyle = q.color
      g.fillRect(Math.round(q.x), Math.round(q.y), q.size, q.size)
    }
    if (scene.flash > 0) {
      g.fillStyle = `rgba(255,255,255,${scene.flash * 0.35})`
      g.fillRect(0, 0, W, H)
    }

    // Onto the screen, every pixel a hard block
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.imageSmoothingEnabled = false
    const sx = scene.shake > 0 ? Math.round((Math.random() - 0.5) * scene.shake * 8 * dpr) : 0
    const sy = scene.shake > 0 ? Math.round((Math.random() - 0.5) * scene.shake * 8 * dpr) : 0
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(art, sx, sy, canvas.width, canvas.height)

    // Words, at the screen's resolution, with a hard black outline
    const unit = height / H
    for (const t of scene.texts) {
      const size = Math.max(t.min || 0, t.size * unit * 6)
      ctx.font = `${Math.round(size * dpr)}px ${DISPLAY}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.globalAlpha = t.alpha ?? 1
      const x = (width / 2) * dpr
      const y = (height / 2 + t.dy * unit * 6) * dpr
      ctx.lineJoin = 'round'
      ctx.lineWidth = Math.max(3, size * 0.16) * dpr
      ctx.strokeStyle = OUTLINE
      ctx.strokeText(t.text, x, y)
      ctx.fillStyle = t.color || WHITE
      ctx.fillText(t.text, x, y)
      ctx.globalAlpha = 1
    }
  }

  return { resize, draw, rebuild: build }
}

/** A picture of one character's head and shirt, for the pickers: a data URL. */
const portraits = {}
export function portrait (lookIndex, side = 0) {
  const key = `${lookIndex}:${side}`
  if (portraits[key]) return portraits[key]
  const c = document.createElement('canvas')
  c.width = 40
  c.height = 46
  const g = c.getContext('2d')
  drawPlayer(g, { side, x: 20, y: 44, kick: 0, ground: true, run: 0 }, lookIndex, 0, false)
  portraits[key] = c.toDataURL()
  return portraits[key]
}

export { GOAL_H }
