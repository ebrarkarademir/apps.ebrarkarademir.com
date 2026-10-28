// The plaza's props, each built from simple shapes and merged into one mesh on the shared
// atlas material: trees (with a lighter far version), benches, lamp posts, flower beds,
// hedges, the fountain and the shop fronts.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Builder } from '../engine/builder.js'
import { mulberry32 } from '../../games/ascii/random.js'

const BOX = new THREE.BoxGeometry(1, 1, 1)
const ROUNDED = new RoundedBoxGeometry(1, 1, 1, 3, 0.12)
const CYLINDER = new THREE.CylinderGeometry(1, 1, 1, 16)
const SPHERE = new THREE.SphereGeometry(1, 16, 12)
const LOW_SPHERE = new THREE.SphereGeometry(1, 7, 5)

export const shade = (hex, k) => `#${new THREE.Color(hex).multiplyScalar(k).getHexString()}`

const mesh = (geometry, material, { shadows = true } = {}) => {
  const m = new THREE.Mesh(geometry, material)
  m.castShadow = shadows
  m.receiveShadow = true
  return m
}

// A lumpy blob for tree crowns and hedges: a smooth sphere with its surface nudged in and out
function lumpy (detail, seed) {
  const random = mulberry32(seed)
  let geometry = new THREE.IcosahedronGeometry(1, detail)
  // Share each corner between its faces, so the nudges can't open cracks and shading is smooth
  geometry.deleteAttribute('normal')
  geometry.deleteAttribute('uv')
  geometry = mergeVertices(geometry)
  const position = geometry.attributes.position
  const uv = new Float32Array(position.count * 2)
  const v = new THREE.Vector3()
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i)
    uv[i * 2] = Math.atan2(v.z, v.x) / (Math.PI * 2) + 0.5
    uv[i * 2 + 1] = v.y * 0.5 + 0.5
    v.multiplyScalar(0.88 + random() * 0.2)
    position.setXYZ(i, v.x, v.y, v.z)
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  geometry.computeVertexNormals()
  return geometry
}

const CROWNS = [['#5fc46b', '#74d47a', '#4fb35e'], ['#ff9ec4', '#ffb3d1', '#f78ab5'], ['#7ed27a', '#94e08a', '#64bf66']]

/** A round cartoon tree; `far` is the cheaper version for a distance. */
export function tree (env, { seed = 1, far = false, blossom = false } = {}) {
  const random = mulberry32(seed)
  const b = new Builder(env.atlas)
  const height = 1.5 + random() * 0.5
  b.add(new THREE.CylinderGeometry(0.13, 0.2, height, far ? 6 : 10), '#9a6b48', { position: [0, height / 2, 0] })
  const colors = CROWNS[blossom ? 1 : (seed % 3 === 0 ? 2 : 0)]
  const crowns = far ? 2 : 4
  for (let i = 0; i < crowns; i++) {
    const a = random() * Math.PI * 2
    const r = i === 0 ? 0 : 0.55 + random() * 0.2
    const size = i === 0 ? 1.15 : 0.75 + random() * 0.25
    b.add(far ? LOW_SPHERE : lumpy(2, seed * 7 + i), colors[i % 3], {
      position: [Math.cos(a) * r, height + 0.6 + (i === 0 ? 0.25 : random() * 0.5), Math.sin(a) * r],
      scale: [size, size * 0.9, size],
      region: far ? undefined : 'leaves'
    })
  }
  return mesh(b.build({ ao: 0.6 }), env.material, { shadows: !far })
}

/** A park bench facing +z. Its two seats are at x = ±0.42. */
export function bench (env, wood = '#c98f5a', metal = '#4a5a7a') {
  const b = new Builder(env.atlas)
  for (let i = 0; i < 3; i++) b.add(ROUNDED, wood, { position: [0, 0.44, -0.16 + i * 0.16], scale: [1.7, 0.06, 0.14] })
  for (let i = 0; i < 2; i++) b.add(ROUNDED, wood, { position: [0, 0.68 + i * 0.17, -0.28], rotation: [-0.12, 0, 0], scale: [1.7, 0.12, 0.05] })
  for (const side of [-1, 1]) {
    b.add(ROUNDED, metal, { position: [side * 0.75, 0.22, -0.04], scale: [0.07, 0.44, 0.52] })
    b.add(ROUNDED, metal, { position: [side * 0.75, 0.6, -0.27], rotation: [-0.12, 0, 0], scale: [0.06, 0.5, 0.06] })
    b.add(ROUNDED, metal, { position: [side * 0.75, 0.58, -0.02], scale: [0.07, 0.05, 0.5] })
  }
  return mesh(b.build({ ao: 0.3, aoStrength: 0.35 }), env.material)
}
export const BENCH_SEATS = [{ x: -0.42, z: 0.05, height: 0.46 }, { x: 0.42, z: 0.05, height: 0.46 }]

/** A street lamp; its glowing globe is a separate mesh on the glow material. */
export function lamp (env) {
  const group = new THREE.Group()
  const b = new Builder(env.atlas)
  b.add(new THREE.CylinderGeometry(0.22, 0.28, 0.3, 12), '#41577a', { position: [0, 0.15, 0] })
  b.add(new THREE.CylinderGeometry(0.06, 0.08, 3.1, 10), '#41577a', { position: [0, 1.75, 0] })
  b.add(new THREE.CylinderGeometry(0.2, 0.14, 0.1, 12), '#41577a', { position: [0, 3.3, 0] })
  b.add(new THREE.ConeGeometry(0.26, 0.22, 12), '#41577a', { position: [0, 3.82, 0] })
  group.add(mesh(b.build({ ao: 0.4 }), env.material))
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), env.glow)
  globe.position.y = 3.55
  group.add(globe)
  return group
}

/** A round flower bed with a stone rim. */
export function flowerBed (env, seed = 1, radius = 1.3) {
  const random = mulberry32(seed)
  const b = new Builder(env.atlas)
  b.add(new THREE.TorusGeometry(radius, 0.13, 8, 32), '#efe7f5', { position: [0, 0.1, 0], rotation: [Math.PI / 2, 0, 0] })
  b.add(new THREE.CylinderGeometry(radius, radius, 0.16, 32), '#8a6247', { position: [0, 0.08, 0] })
  const petals = ['#ff7eb6', '#ffe36e', '#b9a1ff', '#ff9a6b', '#7cc7f4', '#ffffff']
  for (let i = 0; i < 46; i++) {
    const a = random() * Math.PI * 2
    const r = Math.sqrt(random()) * (radius - 0.2)
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    const h = 0.25 + random() * 0.25
    b.add(CYLINDER, '#5fb35e', { position: [x, 0.15 + h / 2, z], scale: [0.015, h, 0.015] })
    b.add(LOW_SPHERE, petals[i % petals.length], { position: [x, 0.17 + h, z], scale: [0.09, 0.06, 0.09] })
    b.add(LOW_SPHERE, '#4fae58', { position: [x + 0.05, 0.2, z], scale: [0.09, 0.05, 0.05] })
  }
  return mesh(b.build({ ao: 0.25, aoStrength: 0.3 }), env.material)
}

/** A row of trimmed hedge, `length` long along x. */
export function hedge (env, length, seed = 1) {
  const random = mulberry32(seed)
  const b = new Builder(env.atlas)
  const blobs = Math.max(2, Math.round(length / 0.9))
  for (let i = 0; i < blobs; i++) {
    const x = -length / 2 + (i + 0.5) * (length / blobs)
    b.add(lumpy(1, seed * 13 + i), i % 2 ? '#5fbf68' : '#55b45f', { position: [x, 0.5, 0], scale: [0.65 + random() * 0.1, 0.6, 0.55] })
  }
  return mesh(b.build({ ao: 0.5 }), env.material)
}

/**
 * The fountain: a stone basin with a water pool, a column and an upper bowl. Returns the
 * stone, the water surfaces (on the water material) and where the water springs from.
 */
export function fountain (env) {
  const group = new THREE.Group()
  const b = new Builder(env.atlas)
  const stone = '#f0e8f7'
  const basin = [[2.6, 0], [3.2, 0], [3.25, 0.5], [3.1, 0.58], [2.95, 0.5], [2.9, 0.25], [2.6, 0.25]].map(([r, y]) => new THREE.Vector2(r, y))
  b.add(new THREE.LatheGeometry(basin, 48), stone)
  b.add(new THREE.CylinderGeometry(2.92, 2.92, 0.2, 48), '#cfc3e0', { position: [0, 0.12, 0] })
  b.add(new THREE.CylinderGeometry(0.35, 0.5, 1.6, 20), stone, { position: [0, 1.0, 0] })
  const bowl = [[0.3, 0], [1.25, 0.25], [1.3, 0.42], [1.18, 0.42], [1.05, 0.3], [0.3, 0.2]].map(([r, y]) => new THREE.Vector2(r, y))
  b.add(new THREE.LatheGeometry(bowl, 40), stone, { position: [0, 1.65, 0] })
  b.add(new THREE.CylinderGeometry(0.12, 0.2, 0.55, 12), stone, { position: [0, 2.15, 0] })
  b.add(SPHERE, '#ffd6e8', { position: [0, 2.48, 0], scale: 0.16 })
  group.add(mesh(b.build({ ao: 0.35, aoStrength: 0.3 }), env.material))

  const pool = new THREE.Mesh(new THREE.CircleGeometry(2.92, 48), env.water)
  pool.rotation.x = -Math.PI / 2
  pool.position.y = 0.38
  const upper = new THREE.Mesh(new THREE.CircleGeometry(1.12, 32), env.water)
  upper.rotation.x = -Math.PI / 2
  upper.position.y = 2.0
  group.add(pool, upper)
  return {
    object: group,
    sources: [
      { x: 0, y: 2.55, z: 0, speed: 3.6, spread: 0.55 },
      { x: 0, y: 2.55, z: 0, speed: 2.8, spread: 0.9 }
    ],
    floor: 0.38
  }
}

const SHOPS = {
  clothes: { wall: '#ffe1ec', trim: '#ff8fb8', awning: 'awning-pink', sign: 'sign-clothes', roof: '#ff9ec4' },
  furniture: { wall: '#dff7ee', trim: '#4fcaa4', awning: 'awning-mint', sign: 'sign-furniture', roof: '#7fe0c0' },
  cafe: { wall: '#fff3d6', trim: '#ffbe5c', awning: 'awning-lemon', sign: 'sign-cafe', roof: '#ffd98a' },
  arcade: { wall: '#ece4ff', trim: '#9a80f5', awning: 'awning-sky', sign: 'sign-star', roof: '#b9a1ff' }
}

/**
 * A shop front facing +z, `width` wide: pastel walls, a striped awning over the door, two
 * windows and a picture sign. Its front face is at z = depth / 2.
 */
export function shopFront (env, kind, width = 7, depth = 6, height = 5) {
  const style = SHOPS[kind]
  const b = new Builder(env.atlas)
  const front = depth / 2
  b.add(BOX, style.wall, { position: [0, height / 2, 0], scale: [width, height, depth], region: 'plaster' })
  b.add(BOX, style.trim, { position: [0, 0.2, 0], scale: [width + 0.1, 0.4, depth + 0.1] })
  b.add(BOX, style.trim, { position: [0, height + 0.1, 0], scale: [width + 0.3, 0.25, depth + 0.3] })
  // A pitched roof made of two tilted slabs
  for (const side of [-1, 1]) {
    b.add(BOX, style.roof, { position: [0, height + 0.95, side * depth * 0.24], rotation: [side * 0.55, 0, 0], scale: [width + 0.5, 0.18, depth * 0.62], region: 'roof' })
  }
  b.add(BOX, style.wall, { position: [0, height + 0.75, 0], scale: [width, 1.3, 0.2] })
  b.add(BOX, '#ffffff', { position: [0, 1.35, front + 0.04], scale: [1.4, 2.5, 0.12], region: 'door' })
  for (const side of [-1, 1]) {
    b.add(BOX, '#ffffff', { position: [side * width * 0.3, 2.0, front + 0.04], scale: [1.7, 1.7, 0.12], region: 'window' })
    b.add(ROUNDED, style.trim, { position: [side * width * 0.3, 1.1, front + 0.18], scale: [1.9, 0.18, 0.35] })
    for (let i = 0; i < 3; i++) b.add(SPHERE, ['#ff7eb6', '#ffe36e', '#b9a1ff'][i], { position: [side * width * 0.3 + (i - 1) * 0.5, 1.28, front + 0.2], scale: 0.13 })
  }
  // The awning: a tilted striped canvas with a scalloped front edge
  b.add(BOX, '#ffffff', { position: [0, 3.15, front + 0.75], rotation: [0.42, 0, 0], scale: [width * 0.85, 0.06, 1.6], region: style.awning })
  for (let i = 0; i < 10; i++) {
    b.add(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 12, 1, false, 0, Math.PI), i % 2 ? '#ffffff' : style.trim, { position: [-width * 0.425 + (i + 0.5) * (width * 0.85 / 10), 2.82, front + 1.48], rotation: [Math.PI / 2, 0, 0] })
  }
  b.add(ROUNDED, '#ffffff', { position: [0, 4.2, front + 0.08], scale: [2.0, 1.2, 0.16], region: style.sign })
  return mesh(b.build({ ao: 0.8, aoStrength: 0.3 }), env.material)
}
