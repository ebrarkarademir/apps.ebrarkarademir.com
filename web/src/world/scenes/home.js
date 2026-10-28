// A player's home: a cozy 8×8 room, open on two sides like a dollhouse, furnished from the
// owner's saved layout. The two walls fade out whenever the camera swings behind them.
import * as THREE from 'three'
import { createDaylight, createSky } from '../engine/sky.js'
import { Builder } from '../engine/builder.js'
import { buildFurniture } from './furniture.js'
import { parseItem } from '../palette.js'

export const HOME_CELLS = 8
const WALL_HEIGHT = 3.2

function plankTexture () {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  const g = canvas.getContext('2d')
  // The seams between planks
  g.fillStyle = '#c28c5c'
  g.fillRect(0, 0, 512, 512)
  const tones = ['#e2b07e', '#d9a571', '#e8bb8b', '#dcab78']
  for (let row = 0; row < 8; row++) {
    const offset = (row % 2) * 160
    for (let x = -offset; x < 512; x += 320) {
      g.fillStyle = tones[(row + Math.abs(x)) % tones.length]
      g.fillRect(x + 2, row * 64 + 2, 316, 60)
      g.strokeStyle = 'rgba(140,90,50,0.18)'
      g.lineWidth = 2
      for (let k = 0; k < 4; k++) {
        g.beginPath()
        const y = row * 64 + 10 + k * 13
        g.moveTo(x + 10, y)
        g.bezierCurveTo(x + 100, y + 6, x + 200, y - 6, x + 310, y + 2)
        g.stroke()
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 2)
  texture.anisotropy = 8
  return texture
}

function wallpaperTexture () {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const g = canvas.getContext('2d')
  g.fillStyle = '#ffe3ee'
  g.fillRect(0, 0, 256, 256)
  for (let x = 0; x < 256; x += 64) {
    g.fillStyle = '#fff0f6'
    g.fillRect(x, 0, 28, 256)
  }
  g.fillStyle = '#ffc4da'
  for (let y = 16; y < 256; y += 64) {
    for (let x = 46; x < 256; x += 64) {
      g.beginPath()
      g.arc(x, y + ((x / 64) % 2) * 32, 5, 0, Math.PI * 2)
      g.fill()
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(5, 2)
  return texture
}

export function createHome (env) {
  const scene = new THREE.Scene()
  const daylight = createDaylight(scene, { sunStrength: 2.1, skyStrength: 1.15, span: 7 })
  daylight.follow(new THREE.Vector3(4, 0, 4))
  createSky(scene, { top: '#ffcfe4', horizon: '#fff2e4', bottom: '#fff8f0', clouds: false })

  // Floor: planks on a thick base, edged like a dollhouse
  const floor = new THREE.Mesh(new THREE.BoxGeometry(HOME_CELLS, 0.3, HOME_CELLS), [
    new THREE.MeshStandardMaterial({ color: '#c99568', roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: '#c99568', roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ map: plankTexture(), roughness: 0.65 }),
    new THREE.MeshStandardMaterial({ color: '#b98457', roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: '#c99568', roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: '#c99568', roughness: 0.8 })
  ])
  floor.position.set(HOME_CELLS / 2, -0.15, HOME_CELLS / 2)
  floor.receiveShadow = true
  scene.add(floor)

  // The two walls, each a group so it can fade out as one
  const wallMaterial = new THREE.MeshStandardMaterial({ map: wallpaperTexture(), roughness: 0.9 })
  const wall = (length) => {
    const group = new THREE.Group()
    const panel = new THREE.Mesh(new THREE.BoxGeometry(length, WALL_HEIGHT, 0.24), wallMaterial)
    panel.position.y = WALL_HEIGHT / 2
    panel.receiveShadow = true
    panel.castShadow = true
    group.add(panel)
    return group
  }
  const back = wall(HOME_CELLS + 0.24)
  back.position.set(HOME_CELLS / 2 - 0.12, 0, -0.12)
  const left = wall(HOME_CELLS + 0.24)
  left.rotation.y = Math.PI / 2
  left.position.set(-0.12, 0, HOME_CELLS / 2 - 0.12)
  scene.add(back, left)

  // What hangs on the walls, built in each wall's own frame (its face is at z = 0.12)
  const decor = (group, build) => {
    const b = new Builder(env.atlas)
    build(b)
    const mesh = new THREE.Mesh(b.build(), env.material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  }
  const BOX = new THREE.BoxGeometry(1, 1, 1)
  decor(back, (b) => {
    b.add(BOX, '#ffffff', { position: [0, 0.08, 0.14], scale: [HOME_CELLS + 0.24, 0.16, 0.06] })
    b.add(BOX, '#ffffff', { position: [1.2, 1.75, 0.14], scale: [1.7, 1.5, 0.06], region: 'window' })
    for (const side of [-1, 1]) b.add(BOX, '#ff9ec4', { position: [1.2 + side * 1.0, 1.75, 0.2], scale: [0.32, 1.9, 0.06] })
    b.add(BOX, '#f2c14e', { position: [1.2, 2.72, 0.2], scale: [2.4, 0.06, 0.06] })
    b.add(BOX, '#ffffff', { position: [-2.3, 1.9, 0.15], scale: [0.9, 0.7, 0.05], region: 'sign-star' })
    b.add(BOX, '#c9925a', { position: [-2.3, 1.9, 0.13], scale: [1.0, 0.8, 0.04] })
  })
  decor(left, (b) => {
    b.add(BOX, '#ffffff', { position: [0, 0.08, 0.14], scale: [HOME_CELLS + 0.24, 0.16, 0.06] })
    b.add(BOX, '#ffffff', { position: [2.2, 1.2, 0.15], scale: [1.2, 2.4, 0.06], region: 'door' })
    b.add(BOX, '#ffffff', { position: [-1.5, 1.9, 0.15], scale: [0.8, 0.8, 0.05], region: 'sign-clothes' })
    b.add(BOX, '#c9925a', { position: [-1.5, 1.9, 0.13], scale: [0.9, 0.9, 0.04] })
  })

  // The decorating grid: a line along every cell edge
  const lines = []
  for (let i = 0; i <= HOME_CELLS; i++) lines.push(i, 0.02, 0, i, 0.02, HOME_CELLS, 0, 0.02, i, HOME_CELLS, 0.02, i)
  const grid = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(lines, 3)),
    new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 })
  )
  grid.visible = false
  scene.add(grid)

  const furniture = new THREE.Group()
  scene.add(furniture)
  const colliders = []
  const seats = []
  let animated = []

  /**
   * Furnishes the room. `catalog` maps item ids to catalog items (for their footprint).
   * Each placed piece's object remembers its index in the layout, for picking it up again.
   */
  function setLayout (layout, catalog) {
    furniture.clear()
    colliders.length = 0
    seats.length = 0
    animated = []
    layout.forEach((placed, index) => {
      const item = catalog[placed.i]
      const look = parseItem(placed.i)
      if (!item || !look) return
      const built = buildFurniture(env, item.model, look.hex)
      const [w, d] = placed.r % 2 ? [item.size[1], item.size[0]] : item.size
      const turn = -placed.r * (Math.PI / 2)
      built.object.position.set(placed.x + w / 2, 0, placed.z + d / 2)
      built.object.rotation.y = turn
      built.object.userData.placed = index
      built.object.traverse(node => { node.userData.placed = index })
      furniture.add(built.object)
      if (!item.floor) colliders.push({ minX: placed.x + 0.06, maxX: placed.x + w - 0.06, minZ: placed.z + 0.06, maxZ: placed.z + d - 0.06 })
      for (const seat of built.seats) {
        seats.push({
          x: built.object.position.x + Math.cos(turn) * seat.x + Math.sin(turn) * seat.z,
          z: built.object.position.z - Math.sin(turn) * seat.x + Math.cos(turn) * seat.z,
          height: seat.height,
          ry: seat.ry + turn
        })
      }
      if (built.update) animated.push(built.update)
    })
  }

  return {
    scene,
    kind: 'home',
    colliders,
    seats,
    interactives: [],
    furniture,
    ground: [floor],
    bounds: { min: 0.3, max: HOME_CELLS - 0.3 },
    center: new THREE.Vector3(HOME_CELLS / 2, 1, HOME_CELLS / 2),
    setLayout,
    showGrid (on) {
      grid.visible = on
    },
    update (dt, focus, camera, t = performance.now() / 1000) {
      // A wall between the camera and the room steps aside
      back.visible = camera.position.z > -0.2
      left.visible = camera.position.x > -0.2
      for (const step of animated) step(dt, t)
    }
  }
}
