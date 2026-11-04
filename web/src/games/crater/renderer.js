import { W, H, LEVELS } from './terrain.js'
import { GREEN, drawText } from '../ascii/paint.js'
import { sprite, darken, mixHex, rgbOf, SOLDIER, SHOULDER, GRAVE, ARROW, SHOTS, SHOT_COLORS } from './pixel.js'
import { GUN } from './physics.js'

// Draws Crater Duel as pixel art in daylight. The world is painted at a low resolution, P
// pixels to a map cell, into a small picture of its own, then blown up onto the screen with
// hard edges, so every pixel shows: a sky with a sun and hills (or a skyline, or a cave wall),
// grass on top of dirt in bands with an outline round it, bricks of rock, scorch round the
// craters, soldiers, shots and explosions as sprites and blocks of color, and a sea (or lava).
// The view shows the whole height of the map; when the screen is too narrow for its whole width
// it shows part of it (camX, in cells, is its left edge), with a strip along the top showing all
// of it. Words go on top, at the screen's own resolution.

// One color per side, up to six: white, amber, red, violet, pink and sky blue
export const SIDE_COLORS = ['#f2f6ea', '#ffb000', '#ff5c5c', '#c58bff', '#ff8ad8', '#8ec8ff']
const P = 4 // pixels of art to a map cell
const GUN_PX = GUN * P // the rifle's length, in pixels: shots leave from its end
const MINIMAP_H = 16

// Each level's look. sky: bands from the top down; far and near: hills (or towers) behind;
// top: the grass (or snow, or sand) from its lit edge down; dirt: bands from the top down;
// rock: light, mid, dark; sea: foam, light, mid, deep
const THEMES = {
  grass: { sky: ['#4aa4f0', '#62b2f4', '#7cc0f6', '#98cef8', '#b6dcfa'], sun: '#fff2a8', far: '#8cbce0', near: '#6aa86a', top: ['#c4f27a', '#7ad94a', '#4aa83a'], blades: true, dirt: ['#b07440', '#8c5830', '#6c4024', '#4e2c1a'], rock: ['#b4b4c0', '#8c8c9a', '#62626e'], edge: '#2a1a10', sea: ['#e8f6ff', '#5aa6ef', '#3a86d8', '#2462b0'] },
  snow: { sky: ['#8aa8d0', '#9cb6da', '#b0c6e2', '#c6d6ea', '#dce6f2'], sun: '#ffffff', far: '#b8c8de', near: '#9ab0c8', top: ['#ffffff', '#e4eef8', '#b8cce0'], dirt: ['#8c9cb4', '#6e7e98', '#52607a', '#3a445c'], rock: ['#c0c8d4', '#98a2b0', '#6e7888'], edge: '#1e2436', sea: ['#ffffff', '#9ae0f4', '#6cc4e4', '#4a9cc4'] },
  sand: { sky: ['#ff8a4a', '#ffa05a', '#ffb86e', '#ffd088', '#ffe6aa'], sun: '#fff6d0', far: '#e09a6a', near: '#c88250', top: ['#fff0a8', '#f2d27a', '#d8b050'], dirt: ['#d4a258', '#b4843e', '#90642e', '#6a4620'], rock: ['#c8b494', '#a08c6c', '#78664c'], edge: '#3a2410', sea: ['#f0fcff', '#4ab4e6', '#2e92cc', '#1e6ea6'] },
  cave: { sky: ['#2a2018', '#30251c', '#372a20', '#3e3024', '#463628'], cave: true, top: ['#b4d87a', '#86b04a', '#5e8a34'], blades: true, dirt: ['#7a6450', '#5e4c3c', '#463a2e', '#322a22'], rock: ['#8a8478', '#6a655c', '#4a4640'], edge: '#140e0a', sea: ['#fff0a0', '#ffa030', '#f06a1a', '#b83a10'], lava: true },
  sky: { sky: ['#2a86ee', '#3e96f2', '#58a8f6', '#74baf8', '#96ccfa'], sun: '#fff2a8', clouds: true, top: ['#c4f27a', '#7ad94a', '#4aa83a'], blades: true, dirt: ['#b07440', '#8c5830', '#6c4024', '#4e2c1a'], rock: ['#b4b4c0', '#8c8c9a', '#62626e'], edge: '#2a1a10', sea: ['#e8f6ff', '#5aa6ef', '#3a86d8', '#2462b0'] },
  city: { sky: ['#2c2452', '#46306a', '#6c3c74', '#a04c70', '#d8706c'], sun: '#ffd0a0', far: '#3a2c5a', near: '#2a2044', towers: true, top: ['#d0d4dc', '#a4a8b4', '#7c808c'], dirt: ['#8a8c94', '#6c6e78', '#52545e', '#3a3c46'], rock: ['#c87850', '#a45c3a', '#7a4028'], windows: true, edge: '#16141e', sea: ['#e8f0ff', '#5a8ad8', '#3a68b8', '#284c90'] }
}

const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 997
const FIRE = ['#ffffff', '#fff0a0', '#ffc040', '#ff8020', '#e04010']

// A filled round block, a row at a time, so its edge stays hard
function disc (s, cx, cy, r, color) {
  if (r <= 0) return
  s.fillStyle = color
  const x0 = Math.round(cx)
  const y0 = Math.round(cy)
  const R = Math.ceil(r)
  for (let dy = -R; dy <= R; dy++) {
    const span = r * r - dy * dy
    if (span < 0) continue
    const half = Math.floor(Math.sqrt(span))
    s.fillRect(x0 - half, y0 + dy, half * 2 + 1, 1)
  }
}

export function createRenderer (canvas) {
  const ctx = canvas.getContext('2d')
  let width = 0
  let height = 0
  let dpr = 1
  let cell = 6
  let oy = 0 // the map's top edge on screen
  let theme = THEMES.grass
  let sprites = null
  let skyLayer = null
  let ground = null
  let groundVersion = -1
  let groundTerrain = null
  let groundScorch = -1
  const art = document.createElement('canvas') // the view, at the art's resolution
  const g = art.getContext('2d')

  // ---------- Sprites ----------

  function build () {
    const WHITE = { h: '#ffffff', s: '#ffffff', e: '#ffffff', c: '#ffffff', b: '#ffffff', p: '#ffffff', k: '#ffffff' }
    const soldier = (color, mirror, white) => SOLDIER.map(rows => sprite(rows, white
      ? WHITE
      : { h: darken(color, 0.55), s: '#f2c8a0', e: '#1a1a1a', c: color, b: '#3a2a1a', p: '#4a5240', k: '#2a1e14' }, { mirror }))
    sprites = {
      // [color][facing: 0 right, 1 left][pose]
      units: SIDE_COLORS.map(color => [soldier(color, false), soldier(color, true)]),
      hurt: [soldier('#ffffff', false, true), soldier('#ffffff', true, true)],
      graves: SIDE_COLORS.map(color => sprite(GRAVE, { g: '#9a9aa6', c: color })),
      arrows: SIDE_COLORS.map(color => sprite(ARROW, { a: color })),
      shots: SIDE_COLORS.map(color => SHOTS.map(rows => sprite(rows, { ...SHOT_COLORS, c: color })))
    }
    skyLayer = paintSky()
    groundVersion = -1
  }

  // ---------- The sky: bands with a dithered seam, a sun, and hills or towers behind ----------

  function paintSky () {
    const layer = document.createElement('canvas')
    layer.width = W * P
    layer.height = H * P
    const s = layer.getContext('2d')
    const bands = theme.sky
    const bandH = layer.height / bands.length
    for (let i = 0; i < bands.length; i++) {
      s.fillStyle = bands[i]
      s.fillRect(0, Math.floor(i * bandH), layer.width, Math.ceil(bandH))
      // A checkered seam into the next band, the way pixel art blends
      if (i < bands.length - 1) {
        s.fillStyle = bands[i + 1]
        const y0 = Math.floor((i + 1) * bandH) - 2
        for (let y = y0; y < y0 + 2; y++) for (let x = (y % 2); x < layer.width; x += 2) s.fillRect(x, y, 1, 1)
      }
    }
    if (theme.cave) {
      // A cave wall: blotches of a darker stone, and stalactites hanging down
      for (let i = 0; i < 260; i++) {
        s.fillStyle = i % 3 ? '#241b14' : '#4e3e2e'
        s.fillRect(hash(i, 1) % layer.width, hash(i, 2) % layer.height, 2 + (i % 3), 2)
      }
      s.fillStyle = '#1c150f'
      for (let x = 0; x < layer.width; x += 6) {
        const len = 4 + (hash(x, 9) % 22)
        for (let y = 0; y < len; y++) s.fillRect(x + Math.floor(y / 3) % 2, y, Math.max(1, 4 - Math.floor((y / len) * 4)), 1)
      }
      return layer
    }
    // The sun, a round block with a ring of lighter pixels
    const sx = Math.floor(layer.width * 0.78)
    const sy = Math.floor(layer.height * 0.2)
    disc(s, sx, sy, 13, mixHex(theme.sun, bands[1], 0.5))
    disc(s, sx, sy, 10, theme.sun)
    if (theme.towers) {
      // A skyline, two rows, with lit windows in the nearer one
      for (const [row, color] of [[0, theme.far], [1, theme.near]]) {
        let x = 0
        while (x < layer.width) {
          const w = 10 + (hash(x, row) % 16)
          const h = 30 + (hash(x, row + 5) % (row ? 46 : 70))
          const top = layer.height - 40 - h + row * 18
          s.fillStyle = color
          s.fillRect(x, top, w, layer.height - top)
          if (row) {
            for (let wy = top + 3; wy < layer.height - 50; wy += 5) {
              for (let wx = x + 2; wx < x + w - 2; wx += 4) {
                if (hash(wx, wy) % 3 === 0) {
                  s.fillStyle = '#ffd86a'
                  s.fillRect(wx, wy, 2, 2)
                }
              }
            }
          }
          x += w + (hash(x, 7) % 4)
        }
      }
      return layer
    }
    if (theme.clouds) return layer
    // Hills, far then near, as stepped pixel outlines
    for (const [row, color] of [[0, theme.far], [1, theme.near]]) {
      s.fillStyle = color
      for (let x = 0; x < layer.width; x += 2) {
        const u = x / P
        const top = Math.round(layer.height * (0.5 + row * 0.12) - (Math.sin(u * (Math.PI * 4 / W) + row * 2) * 7 + Math.sin(u * (Math.PI * 10 / W) + row) * 3) * P)
        s.fillRect(x, top, 2, layer.height - top)
      }
    }
    return layer
  }

  // ---------- The ground, a pixel at a time ----------

  function paintGround (terrain, scorch) {
    const pw = W * P
    const ph = H * P
    if (!ground) ground = document.createElement('canvas')
    ground.width = pw
    ground.height = ph
    const gg = ground.getContext('2d')
    const image = gg.createImageData(pw, ph)
    const data = image.data
    const cells = terrain.cells
    const at = (x, y) => (x >= 0 && x < W && y >= 0 && y < H ? cells[y * W + x] : 0)
    // How far each cell is under the open air above it
    const depth = new Uint8Array(W * H)
    for (let x = 0; x < W; x++) {
      let d = 0
      for (let y = 0; y < H; y++) {
        d = cells[y * W + x] ? d + 1 : 0
        depth[y * W + x] = Math.max(0, d - 1)
      }
    }
    // How scorched each cell is, from the craters round it
    const burnt = new Float32Array(W * H)
    for (const [cx, cy, r] of scorch) {
      const reach = r + 2.5
      for (let y = Math.max(0, Math.floor(cy - reach)); y <= Math.min(H - 1, cy + reach); y++) {
        for (let x = Math.max(0, Math.floor(cx - reach)); x <= Math.min(W - 1, cx + reach); x++) {
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
          const k = 1 - (d - r) / 2.5
          if (k > burnt[y * W + x]) burnt[y * W + x] = Math.min(1, k)
        }
      }
    }
    const top = theme.top.map(rgbOf)
    const dirt = theme.dirt.map(rgbOf)
    const rock = theme.rock.map(rgbOf)
    const edge = rgbOf(theme.edge)
    const soot = rgbOf('#2a1c12')
    const lit = rgbOf('#ffd86a')
    const put = (i, c, k = 0) => {
      data[i] = k ? c[0] + (soot[0] - c[0]) * k : c[0]
      data[i + 1] = k ? c[1] + (soot[1] - c[1]) * k : c[1]
      data[i + 2] = k ? c[2] + (soot[2] - c[2]) * k : c[2]
      data[i + 3] = 255
    }
    const SEAMS = [8, 22, 44] // where the dirt gets a band darker, in pixels under the surface
    for (let py = 0; py < ph; py++) {
      const cy = py >> 2
      const ly = py & 3
      for (let px = 0; px < pw; px++) {
        const cx = px >> 2
        const lx = px & 3
        const i = (py * pw + px) * 4
        const v = cells[cy * W + cx]
        if (!v) {
          // Blades of grass standing up out of the top of the ground below
          if (theme.blades && ly >= 2 && at(cx, cy + 1) === 1 && !burnt[(cy + 1) * W + cx]) {
            const n = hash(px, 3)
            if (n % 3 === 0 && (ly === 3 || n % 2 === 0)) put(i, top[1])
          }
          continue
        }
        const n = hash(px, py)
        const sooty = burnt[cy * W + cx]
        // Scorch fades out in a checker at its edge
        const k = sooty > 0.6 ? 0.6 : sooty > 0.2 && (px + py) % 2 ? 0.45 : 0
        const openLeft = lx === 0 && !at(cx - 1, cy)
        const openRight = lx === 3 && !at(cx + 1, cy)
        const openBelow = ly === 3 && !at(cx, cy + 1)
        const openAbove = !at(cx, cy - 1)
        if (v === 2) {
          // Rock: bricks, lit along their top and left, with dark mortar
          const mortar = ly === 3 || ((px + (cy % 2) * 4) % 8 === 7)
          if (openLeft || openRight || openBelow || (openAbove && ly === 0)) put(i, edge)
          else if (theme.windows && !mortar && hash(cx, cy) % 4 === 0 && lx > 0 && lx < 3 && ly > 0) put(i, lit)
          else put(i, mortar ? rock[2] : ly === 0 || (px + (cy % 2) * 4) % 8 === 0 ? rock[0] : rock[1], k)
          continue
        }
        if (openLeft || openRight || openBelow) {
          put(i, edge)
          continue
        }
        if (openAbove && ly < 3 && !k) {
          put(i, top[ly])
          continue
        }
        // Dirt in bands, darker deeper, with a checkered seam and a few specks
        const d = depth[cy * W + cx] * P + ly // pixels under the surface
        let band = d >= SEAMS[2] ? 3 : d >= SEAMS[1] ? 2 : d >= SEAMS[0] ? 1 : 0
        if (band < 3 && d >= SEAMS[band] - 2 && (px + py) % 2) band++
        if (n % 29 === 0) band = Math.min(3, band + 1)
        else if (n % 31 === 0) band = Math.max(0, band - 1)
        put(i, dirt[band], k)
      }
    }
    gg.putImageData(image, 0, 0)
    groundVersion = terrain.version
    groundTerrain = terrain
    groundScorch = scorch.length
  }

  // ---------- Drawing in art pixels ----------

  const view = { camX: 0, visible: W, ox: 0 }
  let ax = 0 // the view's left edge on the map, in art pixels
  let origin = 0 // where the picture's left edge is on the map, in art pixels (left of ax past a narrow map's end)
  const AX = (x) => Math.round(x * P - origin)
  const AY = (y) => Math.round(y * P)
  const X = (x) => (x - view.camX) * cell + view.ox
  const Y = (y) => y * cell + oy

  function clouds (time, aw) {
    for (let i = 0; i < 6; i++) {
      const span = aw + 120
      const x = ((hash(i, 5) + time * (3 + i) - origin * 0.4) % span + span) % span - 60
      const y = 14 + (hash(i, 9) % 60)
      const size = 6 + (i % 3) * 3
      for (const [dy, color] of [[2, '#c8def4'], [0, '#ffffff']]) {
        disc(g, x, y + dy, size, color)
        disc(g, x - size, y + dy + 1, size * 0.7, color)
        disc(g, x + size, y + dy + 1, size * 0.75, color)
      }
    }
  }

  // A windsock at the top of the view: its flag points the way the wind blows, longer the stronger
  function windsock (wind, time) {
    const x = AX(view.camX + view.visible / 2)
    const y = 6
    g.fillStyle = '#3a3a44'
    g.fillRect(x, y, 1, 14)
    const n = Math.round(Math.abs(wind) * 5)
    const dir = wind < 0 ? -1 : 1
    for (let k = 0; k < Math.max(1, n); k++) {
      const wave = n ? Math.round(Math.sin(time * 8 - k) * 0.6) : k * 3
      g.fillStyle = k % 2 ? '#ffffff' : '#e83a2a'
      if (n) g.fillRect(x + (dir > 0 ? 1 + k * 3 : -3 - k * 3), y + wave, 3, 3)
      else g.fillRect(x + 1, y + wave, 2, 3) // no wind: the sock hangs down the pole
    }
  }

  // A soldier: its sprite, its rifle at its aim, a bar of health over it, and on the one being
  // aimed with a marching ring under its feet and an arrow bobbing over it
  function unit (u, time) {
    const x = AX(u.x)
    const feet = AY(u.y)
    if (!u.alive) {
      const grave = sprites.graves[u.color] || sprites.graves[0]
      g.drawImage(grave, x - Math.floor(grave.width / 2), feet - grave.height + 1)
      return
    }
    const color = SIDE_COLORS[u.color] || GREEN
    if (u.selected) {
      g.fillStyle = color
      for (let k = 0; k < 32; k++) {
        if ((k + Math.floor(time * 12)) % 4 > 1) continue
        const a = (k / 32) * Math.PI * 2
        g.fillRect(Math.round(x + Math.cos(a) * 10), Math.round(feet + Math.sin(a) * 2.5), 1, 1)
      }
    }
    const pose = u.walking ? Math.floor(time * 8) % 2 : 0
    const facing = u.facing ? 1 : 0
    const body = u.flash > 0 ? sprites.hurt[facing][pose] : (sprites.units[u.color] || sprites.units[0])[facing][pose]
    const bob = u.selected && !u.walking && Math.floor(time * 2) % 2 ? 1 : 0
    const left = x - Math.floor(body.width / 2)
    const topY = feet - body.height + 1 + bob
    g.drawImage(body, left, topY)
    // Soot on it once it's been hurt
    if (u.hp < 50) {
      g.fillStyle = '#2a1c12'
      g.fillRect(left + 4, topY + 10, 2, 1)
      g.fillRect(left + 7, topY + 12, 1, 1)
      if (u.hp < 25) {
        g.fillRect(left + 5, topY + 3, 2, 1)
        g.fillRect(left + 8, topY + 9, 1, 2)
        g.fillRect(left + 4, topY + 14, 1, 1)
      }
    }
    // The rifle, from the shoulder along the aim: a wooden stock, a dark barrel, a hand on it,
    // the side's color at the muzzle, all with an outline
    const angle = u.angle ?? (u.facing ? Math.PI : 0)
    const dx = Math.cos(angle)
    const dy = -Math.sin(angle)
    const sx = left + 1 + SHOULDER.x
    const sy = topY + 1 + SHOULDER.y
    const at = (k) => [Math.round(sx + dx * k), Math.round(sy + dy * k)]
    g.fillStyle = '#141018'
    for (let k = -1; k <= GUN_PX; k++) {
      const [px, py] = at(k)
      g.fillRect(px - 1, py - 1, 4, 4)
    }
    for (let k = -1; k <= GUN_PX; k++) {
      const [px, py] = at(k)
      g.fillStyle = k < 3 ? '#7a4e2c' : k >= GUN_PX - 1 ? color : '#34343e'
      g.fillRect(px, py, 2, 2)
      if (k >= 3 && k < GUN_PX - 1) {
        g.fillStyle = '#6a6a78'
        g.fillRect(px, py, 1, 1)
      }
    }
    const [hx, hy] = at(5)
    g.fillStyle = u.flash > 0 ? '#ffffff' : '#f2c8a0'
    g.fillRect(hx, hy + 1, 2, 2)
    // Health: a bar over its head
    const bx = x - 8
    const by = topY - 6
    g.fillStyle = '#141018'
    g.fillRect(bx - 1, by - 1, 18, 5)
    g.fillStyle = '#3a3440'
    g.fillRect(bx, by, 16, 3)
    g.fillStyle = u.hp < 25 ? '#ff4a3a' : color
    g.fillRect(bx, by, Math.max(0, Math.round((16 * u.hp) / 100)), 3)
    if (u.selected && Math.floor(time * 3) % 3) {
      const arrow = sprites.arrows[u.color] || sprites.arrows[0]
      g.drawImage(arrow, x - Math.floor(arrow.width / 2), by - 19 + (Math.floor(time * 4) % 2))
    }
  }

  // What flies, at twice the size of its sprite so it can be followed
  function shot (s, time) {
    const x = AX(s.x)
    const y = AY(s.y)
    if (s.kind === 6) {
      // A flame: blocks of fire, never the same twice
      for (let k = 0; k < 5; k++) {
        g.fillStyle = FIRE[1 + Math.floor(Math.random() * 4)]
        const size = k < 2 ? 3 : 2
        g.fillRect(x + Math.floor(Math.random() * 5) - 2, y - Math.floor(Math.random() * 6), size, size)
      }
      return
    }
    const list = sprites.shots[s.color] || sprites.shots[1]
    const art = list[s.kind] || list[0]
    const w = art.width * 2
    const h = art.height * 2
    if (s.kind === 4) {
      // A molotov turns over in quarter turns, so it stays crisp
      g.save()
      g.translate(x, y)
      g.rotate((Math.floor(time * 8) % 4) * Math.PI / 2)
      g.drawImage(art, -art.width, -art.height, w, h)
      g.restore()
      return
    }
    g.drawImage(art, x - art.width, y - art.height, w, h)
    // Dynamite's fuse fizzes
    if (s.kind === 5 && Math.random() < 0.75) {
      g.fillStyle = FIRE[Math.floor(Math.random() * 3)]
      g.fillRect(x + Math.floor(Math.random() * 4) - 1, y - art.height - 2 - Math.floor(Math.random() * 3), 2, 2)
    }
  }

  // The aim, kept simple: one line of dots out from the gun along the way the shot will fly.
  // Its way shows the angle, and its length the power: the longer, the stronger. Where this
  // unit's last shot landed is marked with a small X.
  function aim (a, time) {
    const color = SIDE_COLORS[a.color] || GREEN
    if (a.mark && Math.floor(time * 2) % 3) {
      const mx = AX(a.mark.x)
      const my = AY(a.mark.y)
      for (const [c, w] of [['#141018', 3], [color, 1]]) {
        g.fillStyle = c
        for (let k = -2; k <= 2; k++) {
          g.fillRect(mx + k - (w >> 1), my + k - (w >> 1), w, w)
          g.fillRect(mx + k - (w >> 1), my - k - (w >> 1), w, w)
        }
      }
    }
    const pts = a.points
    const n = pts.length / 2
    for (let i = 0; i < n; i += 3) {
      const px = AX(pts[i * 2])
      const py = AY(pts[i * 2 + 1])
      g.fillStyle = '#141018'
      g.fillRect(px - 2, py - 2, 4, 4)
      g.fillStyle = '#ffffff'
      g.fillRect(px - 1, py - 1, 2, 2)
    }
    // A bigger dot at its end, in the side's color
    const ex = AX(pts[pts.length - 2])
    const ey = AY(pts[pts.length - 1])
    g.fillStyle = '#141018'
    g.fillRect(ex - 3, ey - 3, 6, 6)
    g.fillStyle = color
    g.fillRect(ex - 2, ey - 2, 4, 4)
  }

  // Effects (see effects.js): smoke under, then fire, then bits on top
  function particles (list) {
    for (const pass of ['puff', 'disc', 'bit']) {
      for (const p of list) {
        if (p.kind !== pass) continue
        const age = 1 - p.life / p.ttl
        const color = p.colors[Math.min(p.colors.length - 1, Math.floor(age * p.colors.length))]
        if (pass === 'bit') {
          g.fillStyle = color
          g.fillRect(AX(p.x), AY(p.y), p.size || 1, p.size || 1)
        } else {
          disc(g, AX(p.x), AY(p.y), Math.max(0, (p.r + (p.grow || 0) * (p.ttl - p.life)) * P), color)
        }
      }
    }
  }

  // The sea, or lava: a wavy top with foam running along it, then bands, deeper and darker
  function sea (water, time, aw, ah) {
    const [foam, light, mid, deep] = theme.sea
    const base = water * P
    g.save()
    if (!theme.lava) g.globalAlpha = 0.85
    for (let x = 0; x < aw; x++) {
      const wx = x + origin
      const surface = Math.round(base + Math.sin(time * 2 + wx * 0.12) * 1.2)
      g.fillStyle = (wx + Math.floor(time * 10)) % 14 < 4 ? foam : light
      g.fillRect(x, surface, 1, 1)
      g.fillStyle = light
      g.fillRect(x, surface + 1, 1, 2)
      g.fillStyle = mid
      g.fillRect(x, surface + 3, 1, 5)
      g.fillStyle = deep
      g.fillRect(x, surface + 8, 1, Math.max(0, ah - surface - 8))
    }
    g.restore()
    // Light glinting on the water, or lava bubbling up
    for (let i = 0; i < aw / 24; i++) {
      const k = (Math.sin(time * 1.7 + i * 2.1) + 1) / 2
      const x = Math.floor((hash(i, 1) / 997) * aw)
      if (theme.lava) {
        if (k > 0.5) disc(g, x, base + 4 - Math.round(k * 3), Math.round(k * 2), foam)
      } else if (k > 0.6) {
        g.fillStyle = foam
        g.fillRect(x, Math.round(base + 4 + (hash(i, 4) % 6)), 3, 1)
      }
    }
  }

  // ---------- The strip along the top ----------

  function minimapRect () {
    if (view.visible >= W) return null
    const w = Math.min(width - 16, 260)
    return { x: (width - w) / 2, y: 6, w, h: MINIMAP_H }
  }

  function minimap (scene) {
    const rect = minimapRect()
    if (!rect) return
    const sx = rect.w / W
    const sy = rect.h / H
    ctx.save()
    ctx.fillStyle = theme.sky[2]
    ctx.fillRect(rect.x - 2, rect.y - 2, rect.w + 4, rect.h + 4)
    ctx.strokeStyle = '#141018'
    ctx.lineWidth = 2
    ctx.strokeRect(rect.x - 2, rect.y - 2, rect.w + 4, rect.h + 4)
    ctx.fillStyle = theme.dirt[1]
    for (let x = 0; x < W; x += 2) {
      const top = scene.terrain.top(x)
      if (top < H) ctx.fillRect(rect.x + x * sx, rect.y + top * sy, Math.max(1, sx * 2), rect.h - top * sy)
    }
    ctx.fillStyle = theme.sea[2]
    ctx.fillRect(rect.x, rect.y + scene.water * sy, rect.w, rect.h - scene.water * sy)
    for (const u of scene.units) {
      if (!u.alive) continue
      ctx.fillStyle = '#141018'
      ctx.fillRect(rect.x + u.x * sx - 2.5, rect.y + (u.y - 2) * sy - 1, 5, 6)
      ctx.fillStyle = SIDE_COLORS[u.color] || GREEN
      ctx.fillRect(rect.x + u.x * sx - 1.5, rect.y + (u.y - 2) * sy, 3, 4)
    }
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.strokeRect(rect.x + view.camX * sx + 0.5, rect.y - 1.5, view.visible * sx - 1, rect.h + 3)
    ctx.restore()
  }

  /**
   * scene: {
   *   terrain, water, wind, time (seconds), camX, scorch: [[x, y, r], ...] (the craters so far),
   *   units: [{ x, y, color (index into SIDE_COLORS), alive, hp, facing, angle, walking, selected, flash }],
   *   shots: [{ x, y, kind (see SHOTS), color }],
   *   aim: { points: [x, y, ...], color, mark: { x, y } | null } | null,
   *   particles (see effects.js), texts: [{ text, x, y, size, color, alpha }], flash, shake
   * }
   */
  function draw (scene) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!width) return
    const wanted = THEMES[LEVELS[scene.terrain.style]?.theme] || THEMES.grass
    if (wanted !== theme || !sprites) {
      theme = wanted
      build()
    }
    const scorch = scene.scorch || []
    if (scene.terrain !== groundTerrain || scene.terrain.version !== groundVersion || scorch.length !== groundScorch) paintGround(scene.terrain, scorch)
    view.camX = Math.max(0, Math.min(W - view.visible, scene.camX))

    // The view at the art's resolution, the whole width of the screen: a map narrower than the
    // screen has sky and sea on past its ends
    const scale = cell / P
    ax = Math.floor(view.camX * P)
    const mapW = Math.min(W * P - ax, Math.ceil(view.visible * P) + 1) // of the map, in view
    const pad = view.ox > 0 ? Math.ceil(view.ox / scale) : 0
    origin = ax - pad
    const aw = Math.max(mapW, Math.ceil(width / scale) + 2)
    const ah = H * P
    if (art.width !== aw || art.height !== ah) {
      art.width = aw
      art.height = ah
    }
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.imageSmoothingEnabled = false
    g.globalAlpha = 1
    // The sky moves at a little over half the view's speed, and goes on round
    const span = W * P
    const skyAt = ((Math.floor(origin * 0.6) % span) + span) % span
    for (let x = -skyAt; x < aw; x += span) g.drawImage(skyLayer, x, 0)
    if (theme.clouds) clouds(scene.time, aw)
    if (!theme.cave) windsock(scene.wind || 0, scene.time)
    const shake = scene.shake > 0 ? scene.shake * 3 : 0
    g.translate(shake ? Math.round((Math.random() * 2 - 1) * shake) : 0, shake ? Math.round((Math.random() * 2 - 1) * shake) : 0)
    g.drawImage(ground, ax, 0, mapW, ah, pad, 0, mapW, ah)
    for (const u of scene.units) unit(u, scene.time)
    if (scene.aim) aim(scene.aim, scene.time)
    particles(scene.particles)
    for (const s of scene.shots) shot(s, scene.time)
    sea(scene.water, scene.time, aw, ah)
    g.setTransform(1, 0, 0, 1, 0, 0)

    // Blown up onto the screen, with hard edges
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = theme.sky[0]
    ctx.fillRect(0, 0, width, height)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(art, 0, 0, aw, ah, view.ox + (origin - view.camX * P) * scale, oy, aw * scale, ah * scale)

    // Words, on top
    for (const u of scene.units) {
      if (u.alive) drawText(ctx, String(u.hp), X(u.x), Y(u.y) - 30 * scale, { px: Math.max(11, cell * 1.3), dpr, color: '#ffffff', glow: false })
    }
    for (const item of scene.texts) {
      drawText(ctx, item.text, item.screen ? item.x : X(item.x), item.screen ? item.y : Y(item.y), { px: Math.max(item.min || 0, item.size * cell), dpr, color: item.color || '#ffffff', alpha: item.alpha ?? 1, display: item.display ?? true, glow: false })
    }
    minimap(scene)
    if (scene.flash > 0.25) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.5, 0.3 * scene.flash)})`
      ctx.fillRect(0, 0, width, height)
    }
  }

  return {
    // The play area is cssWidth × cssHeight; the map is scaled to its height, and to its width
    // too when the screen is wide enough, and is otherwise seen part at a time
    resize (cssWidth, cssHeight, pixelRatio) {
      width = cssWidth
      height = cssHeight
      dpr = Math.min(2, pixelRatio)
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      const fitAll = Math.min(width / W, height / H)
      cell = fitAll >= 5 ? fitAll : Math.min(height / H, 7.5)
      view.visible = Math.min(W, width / cell)
      view.ox = view.visible >= W ? (width - W * cell) / 2 : 0
      oy = Math.max(0, height - H * cell)
    },
    // Screen point -> map position, in cells
    toMap: (px, py) => ({ x: (px - view.ox) / cell + view.camX, y: (py - oy) / cell }),
    get cell () { return cell },
    get visible () { return view.visible },
    get width () { return width },
    // This level's dirt, grass and sea, for what a blast throws up and a splash
    get dirt () { return theme.dirt },
    get top () { return theme.top },
    get sea () { return theme.sea },
    minimapRect,
    // Nothing is painted from fonts, so there's nothing to do when they load
    rebuild: () => {},
    draw
  }
}
