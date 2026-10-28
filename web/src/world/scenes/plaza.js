// The plaza: a bright town square everyone shares. A fountain in the middle, benches around
// it, lamps, flower beds and trees, hedges at the edge, and shop fronts beyond: clothes and
// furniture to the north (clicking them opens the shop), a café and an arcade east and west.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { createDaylight, createSky } from '../engine/sky.js'
import { createFountain } from '../engine/particles.js'
import { bench, BENCH_SEATS, lamp, flowerBed, hedge, fountain, shopFront, treeLod } from './props.js'

export const PLAZA_EDGE = 19 // walkable from -19 to 19 (the server agrees)
const PAVED = 13.5 // radius of the paved circle

// Grass: a small tile of speckled greens, repeated
function grassTexture () {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const g = canvas.getContext('2d')
  g.fillStyle = '#a3dd88'
  g.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = ['#97d47c', '#afe597', '#9ad882', '#b6e9a0'][i % 4]
    g.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 3, 2 + Math.random() * 5)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(60, 60)
  texture.anisotropy = 8
  return texture
}

// The paved circle: rings of soft stone tiles, with shadows baked in where things stand
function pavingTexture (spots) {
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const g = canvas.getContext('2d')
  const scale = size / (PAVED * 2)
  const c = size / 2
  g.fillStyle = '#c9bcd8'
  g.fillRect(0, 0, size, size)
  const tones = ['#eddcd0', '#e4d6ec', '#efe1cb', '#dce2ee']
  for (let ring = 0, r = 3.4; r < PAVED; ring++, r += 0.85) {
    const pink = ring === 0 || ring === 1
    const count = Math.max(8, Math.round((Math.PI * 2 * r) / 1.05))
    for (let i = 0; i < count; i++) {
      const a0 = (i / count) * Math.PI * 2 + 0.006
      const a1 = ((i + 1) / count) * Math.PI * 2 - 0.006
      g.fillStyle = pink ? (i % 2 ? '#ffc4da' : '#dcc8fb') : tones[(i + ring) % tones.length]
      g.beginPath()
      g.arc(c, c, (r + 0.8) * scale, a0, a1)
      g.arc(c, c, (r + 0.05) * scale, a1, a0, true)
      g.fill()
    }
  }
  // Baked contact shadows ("ambient occlusion") under benches, beds and the fountain rim
  for (const spot of spots) {
    const gradient = g.createRadialGradient(c + spot.x * scale, c + spot.z * scale, 0, c + spot.x * scale, c + spot.z * scale, spot.r * scale)
    gradient.addColorStop(0, `rgba(70,50,90,${spot.k})`)
    gradient.addColorStop(1, 'rgba(70,50,90,0)')
    g.fillStyle = gradient
    g.fillRect(0, 0, size, size)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function tileTexture () {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const g = canvas.getContext('2d')
  g.fillStyle = '#c9bcd8'
  g.fillRect(0, 0, 128, 128)
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 2; x++) {
      g.fillStyle = ['#eddcd0', '#e4d6ec', '#dce2ee', '#efe1cb'][y * 2 + x]
      g.beginPath()
      g.roundRect(x * 64 + 3, y * 64 + 3, 58, 58, 8)
      g.fill()
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 8
  return texture
}

// Rolling hills far off, so the horizon isn't empty
function hills () {
  const parts = []
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.2
    const d = 85 + (i % 3) * 18
    const part = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)
    part.scale(26 + (i % 4) * 7, 9 + (i % 3) * 5, 22)
    part.translate(Math.cos(a) * d, -1, Math.sin(a) * d)
    parts.push(part)
  }
  const geometry = mergeGeometries(parts)
  parts.forEach(part => part.dispose())
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#9bd88a', roughness: 1 }))
}

export function createPlaza (env) {
  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog('#e3f3ff', 50, 150)
  const daylight = createDaylight(scene)
  const sky = createSky(scene)
  const colliders = [] // { x, z, r }
  const seats = [] // { x, z, height, ry }
  const interactives = []
  const aoSpots = []

  const add = (object, x, z, ry = 0) => {
    object.position.set(x, 0, z)
    object.rotation.y = ry
    scene.add(object)
    return object
  }

  // Fountain
  const water = fountain(env)
  scene.add(water.object)
  const spray = createFountain(water.sources, water.floor)
  scene.add(spray.object)
  colliders.push({ x: 0, z: 0, r: 3.35 })
  aoSpots.push({ x: 0, z: 0, r: 4.2, k: 0.28 })

  // Benches around the fountain, facing it
  const benchMesh = bench(env)
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) * (Math.PI / 4)
    const x = Math.sin(a) * 6.6
    const z = Math.cos(a) * 6.6
    const ry = a + Math.PI
    add(benchMesh.clone(), x, z, ry)
    colliders.push({ x: x + Math.sin(a) * 0.1, z: z + Math.cos(a) * 0.1, r: 0.8 })
    aoSpots.push({ x, z, r: 1.4, k: 0.22 })
    for (const seat of BENCH_SEATS) {
      // From the bench's frame to the plaza's
      const sx = Math.cos(ry) * seat.x + Math.sin(ry) * seat.z
      const sz = -Math.sin(ry) * seat.x + Math.cos(ry) * seat.z
      seats.push({ x: x + sx, z: z + sz, height: seat.height, ry })
    }
  }

  // Lamps on the diagonals and at the four entrances
  const lampMesh = lamp(env)
  const lamps = []
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * (Math.PI / 2)
    lamps.push([Math.sin(a) * 10, Math.cos(a) * 10])
    for (const side of [-1, 1]) {
      const b = i * (Math.PI / 2)
      lamps.push([Math.sin(b) * 13.2 + Math.cos(b) * side * 2.6, Math.cos(b) * 13.2 - Math.sin(b) * side * 2.6])
    }
  }
  for (const [x, z] of lamps) {
    add(lampMesh.clone(), x, z)
    colliders.push({ x, z, r: 0.32 })
  }

  // Flower beds
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * (Math.PI / 2)
    const x = Math.sin(a) * 13.6
    const z = Math.cos(a) * 13.6
    add(flowerBed(env, i + 3), x, z)
    colliders.push({ x, z, r: 1.45 })
    aoSpots.push({ x, z, r: 1.9, k: 0.2 })
  }

  // Trees around the edge, leaving the four paths clear; every third one is in blossom
  let seed = 1
  for (let quarter = 0; quarter < 4; quarter++) {
    for (const offset of [0.42, 0.78, 1.15]) {
      const a = quarter * (Math.PI / 2) + offset
      const r = 16.6 + (seed % 2) * 0.8
      const x = Math.sin(a) * r
      const z = Math.cos(a) * r
      add(treeLod(env, { seed, blossom: seed % 3 === 0 }), x, z, seed)
      colliders.push({ x, z, r: 0.5 })
      seed++
    }
  }
  for (const [x, z] of [[-17.5, -17.5], [17.5, -17.5], [-17.5, 17.5], [17.5, 17.5]]) {
    add(treeLod(env, { seed: seed++, blossom: seed % 2 === 0 }), x, z)
    colliders.push({ x, z, r: 0.5 })
  }

  // Hedges along the edge, open where the paths leave
  const edge = PLAZA_EDGE + 0.9
  for (const [x, z, ry] of [[-11, -edge, 0], [11, -edge, 0], [-11, edge, 0], [11, edge, 0], [-edge, -11, Math.PI / 2], [-edge, 11, Math.PI / 2], [edge, -11, Math.PI / 2], [edge, 11, Math.PI / 2]]) {
    add(hedge(env, 16, Math.round(x * 7 + z * 3)), x, z, ry)
  }

  // Shops: their fronts face the plaza
  const shops = [
    { kind: 'clothes', x: -8, z: -25, ry: 0, action: { type: 'shop', tab: 'clothes' } },
    { kind: 'furniture', x: 8, z: -25, ry: 0, action: { type: 'shop', tab: 'furniture' } },
    { kind: 'cafe', x: 25, z: 0, ry: -Math.PI / 2 },
    { kind: 'arcade', x: -25, z: 0, ry: Math.PI / 2 }
  ]
  for (const shop of shops) {
    const building = add(shopFront(env, shop.kind), shop.x, shop.z, shop.ry)
    if (shop.action) {
      building.userData.action = shop.action
      interactives.push(building)
    }
  }

  // Ground: grass everywhere, the paved circle, and four tiled paths out of it
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: 0.95 }))
  grass.rotation.x = -Math.PI / 2
  grass.receiveShadow = true
  scene.add(grass)
  const paving = new THREE.Mesh(new THREE.CircleGeometry(PAVED, 72), new THREE.MeshStandardMaterial({ map: pavingTexture(aoSpots), roughness: 0.85 }))
  paving.rotation.x = -Math.PI / 2
  paving.position.y = 0.012
  paving.receiveShadow = true
  scene.add(paving)
  const tiles = tileTexture()
  const pathParts = []
  for (let i = 0; i < 4; i++) {
    const length = 20
    const part = new THREE.PlaneGeometry(4, length)
    const uv = part.attributes.uv
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 2, uv.getY(k) * length / 2)
    part.rotateX(-Math.PI / 2)
    part.translate(0, 0.008, -(PAVED + length / 2 - 1))
    part.rotateY(i * (Math.PI / 2))
    pathParts.push(part)
  }
  const paths = new THREE.Mesh(mergeGeometries(pathParts), new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.85 }))
  pathParts.forEach(part => part.dispose())
  paths.receiveShadow = true
  scene.add(paths)
  scene.add(hills())

  return {
    scene,
    kind: 'plaza',
    colliders,
    seats,
    interactives,
    ground: [grass, paving, paths],
    bounds: { min: -PLAZA_EDGE, max: PLAZA_EDGE },
    // Where the camera looks while the world loads
    center: new THREE.Vector3(0, 1.2, 7),
    update (dt, focus) {
      daylight.follow(focus)
      spray.update(dt)
      sky.update(dt)
    }
  }
}
