// One painted texture for every printed detail in the world: awning stripes, shop signs,
// windows, doors, roof tiles. Everything else samples its plain white corner and takes its
// color from the vertices, so a whole scene of props can share one material and one texture.
import * as THREE from 'three'

const SIZE = 1024
const GRID = 4 // 4×4 regions of 256 pixels
const CELL = SIZE / GRID

const roundRect = (g, x, y, w, h, r) => {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
}

// Simple, original pictograms for the shop signs
const ICONS = {
  shirt (g) {
    g.beginPath()
    g.moveTo(-60, -50); g.lineTo(-25, -70); g.quadraticCurveTo(0, -50, 25, -70); g.lineTo(60, -50)
    g.lineTo(80, -10); g.lineTo(52, 2); g.lineTo(48, 70); g.lineTo(-48, 70); g.lineTo(-52, 2); g.lineTo(-80, -10)
    g.closePath()
    g.fill()
  },
  sofa (g) {
    roundRect(g, -70, -35, 140, 50, 18); g.fill()
    roundRect(g, -90, -10, 40, 60, 16); g.fill()
    roundRect(g, 50, -10, 40, 60, 16); g.fill()
    roundRect(g, -60, 10, 120, 40, 12); g.fill()
    g.fillRect(-70, 50, 14, 20); g.fillRect(56, 50, 14, 20)
  },
  cup (g) {
    roundRect(g, -50, -30, 80, 80, 20); g.fill()
    g.lineWidth = 14
    g.beginPath(); g.arc(38, 8, 22, -Math.PI / 2, Math.PI / 2); g.stroke()
    g.lineWidth = 8
    for (const x of [-30, -6, 18]) {
      g.beginPath(); g.moveTo(x, -45); g.bezierCurveTo(x - 10, -60, x + 10, -70, x, -85); g.stroke()
    }
  },
  star (g) {
    g.beginPath()
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 32 : 78
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    g.closePath()
    g.fill()
  }
}

export function createAtlas () {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const g = canvas.getContext('2d')
  const regions = {}

  const region = (name, col, row, draw) => {
    g.save()
    g.translate(col * CELL, row * CELL)
    g.beginPath()
    g.rect(0, 0, CELL, CELL)
    g.clip()
    draw(g, CELL)
    g.restore()
    // A pixel's margin keeps filtering from bleeding in from the neighbors
    const m = 2 / SIZE
    regions[name] = { u0: col / GRID + m, v0: 1 - (row + 1) / GRID + m, u1: (col + 1) / GRID - m, v1: 1 - row / GRID - m }
  }

  const awning = (a, b) => (c, s) => {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? b : a
      c.fillRect((i * s) / 8, 0, s / 8, s)
    }
    // A soft fold shadow along the bottom
    const shade = c.createLinearGradient(0, s * 0.7, 0, s)
    shade.addColorStop(0, 'rgba(0,0,0,0)')
    shade.addColorStop(1, 'rgba(0,0,0,0.18)')
    c.fillStyle = shade
    c.fillRect(0, 0, s, s)
  }

  const sign = (bg, fg, icon) => (c, s) => {
    const gradient = c.createLinearGradient(0, 0, 0, s)
    gradient.addColorStop(0, bg[0])
    gradient.addColorStop(1, bg[1])
    c.fillStyle = gradient
    c.fillRect(0, 0, s, s)
    c.fillStyle = 'rgba(255,255,255,0.35)'
    roundRect(c, 14, 12, s - 28, s * 0.32, 30)
    c.fill()
    c.translate(s / 2, s / 2 + 6)
    c.fillStyle = fg
    c.strokeStyle = fg
    ICONS[icon](c)
  }

  // Row 0: plain white (for everything untextured), windows, door
  region('white', 0, 0, (c, s) => {
    c.fillStyle = '#fff'
    c.fillRect(0, 0, s, s)
  })
  region('window', 1, 0, (c, s) => {
    c.fillStyle = '#fffaf0'
    c.fillRect(0, 0, s, s)
    const glass = c.createLinearGradient(0, 0, s, s)
    glass.addColorStop(0, '#bfe9ff')
    glass.addColorStop(0.55, '#8fd0f5')
    glass.addColorStop(1, '#6fb6e8')
    c.fillStyle = glass
    c.fillRect(24, 24, s - 48, s - 48)
    c.fillStyle = 'rgba(255,255,255,0.55)'
    c.beginPath(); c.moveTo(40, s - 60); c.lineTo(120, 40); c.lineTo(150, 40); c.lineTo(70, s - 60); c.fill()
    c.fillStyle = '#fffaf0'
    c.fillRect(s / 2 - 8, 24, 16, s - 48)
    c.fillRect(24, s / 2 - 8, s - 48, 16)
  })
  region('door', 2, 0, (c, s) => {
    c.fillStyle = '#b97a4f'
    c.fillRect(0, 0, s, s)
    c.fillStyle = '#a5683f'
    for (let y = 0; y < s; y += 32) c.fillRect(0, y, s, 4)
    c.fillStyle = '#9fd8f7'
    roundRect(c, 50, 30, s - 100, 80, 40)
    c.fill()
    c.fillStyle = '#ffd36e'
    c.beginPath(); c.arc(s - 60, s / 2 + 30, 12, 0, Math.PI * 2); c.fill()
  })
  region('roof', 3, 0, (c, s) => {
    c.fillStyle = '#e58a74'
    c.fillRect(0, 0, s, s)
    for (let row = 0; row < 8; row++) {
      for (let col = -1; col < 5; col++) {
        const x = col * 64 + (row % 2) * 32
        c.fillStyle = row % 2 ? '#d97862' : '#ec9884'
        roundRect(c, x + 3, row * 32 + 3, 58, 30, 14)
        c.fill()
      }
    }
  })

  // Row 1: awnings
  region('awning-pink', 0, 1, awning('#ff8fb8', '#fff4f8'))
  region('awning-mint', 1, 1, awning('#5fd6b0', '#f2fffa'))
  region('awning-sky', 2, 1, awning('#6ab8f2', '#f2f9ff'))
  region('awning-lemon', 3, 1, awning('#ffd75e', '#fffdf2'))

  // Row 2: shop signs
  region('sign-clothes', 0, 2, sign(['#ff9ec4', '#ff7eb0'], '#fff', 'shirt'))
  region('sign-furniture', 1, 2, sign(['#7fe0c0', '#4fcaa4'], '#fff', 'sofa'))
  region('sign-cafe', 2, 2, sign(['#ffd98a', '#ffbe5c'], '#7a4a2a', 'cup'))
  region('sign-star', 3, 2, sign(['#b9a1ff', '#9a80f5'], '#fff', 'star'))

  // Row 3: walls
  region('bricks', 0, 3, (c, s) => {
    c.fillStyle = '#f1d9c4'
    c.fillRect(0, 0, s, s)
    for (let row = 0; row < 8; row++) {
      for (let col = -1; col < 5; col++) {
        c.fillStyle = (row + col) % 3 ? '#f7e4d3' : '#ecd0b8'
        roundRect(c, col * 64 + (row % 2) * 32 + 3, row * 32 + 3, 58, 26, 6)
        c.fill()
      }
    }
  })
  region('plaster', 1, 3, (c, s) => {
    c.fillStyle = '#ffffff'
    c.fillRect(0, 0, s, s)
    for (let i = 0; i < 900; i++) {
      c.fillStyle = `rgba(0,0,0,${Math.random() * 0.03})`
      c.fillRect(Math.random() * s, Math.random() * s, 3, 3)
    }
  })
  region('stone', 2, 3, (c, s) => {
    c.fillStyle = '#e9e4f2'
    c.fillRect(0, 0, s, s)
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        c.fillStyle = ['#f3eff9', '#e6e0f0', '#efe9f6'][(row * 3 + col) % 3]
        roundRect(c, col * 64 + 3, row * 64 + 3, 58, 58, 10)
        c.fill()
      }
    }
  })
  region('leaves', 3, 3, (c, s) => {
    c.fillStyle = '#fff'
    c.fillRect(0, 0, s, s)
    for (let i = 0; i < 260; i++) {
      c.fillStyle = `rgba(0,60,0,${0.04 + Math.random() * 0.06})`
      c.beginPath()
      c.ellipse(Math.random() * s, Math.random() * s, 10, 6, Math.random() * 3, 0, Math.PI * 2)
      c.fill()
    }
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.generateMipmaps = true

  return {
    texture,
    regions,
    /** The texel every untextured surface samples: plain white, so vertex colors show as they are. */
    white: { u: (regions.white.u0 + regions.white.u1) / 2, v: (regions.white.v0 + regions.white.v1) / 2 }
  }
}
