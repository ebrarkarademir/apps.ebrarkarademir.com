// What makes the plaza feel like part of a town: flower arches where the paths leave, bunting
// strung between the lamps, cottages and a forest beyond the hedges, a pond with a bridge and
// ducks, a windmill turning on a hill and a hot-air balloon drifting by.
//
// Everything that stands still is built on the shared atlas material, so the plaza can merge
// it all into one mesh; only the windmill's sails, the balloon and the ducks move, one small
// mesh each.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { Builder } from '../engine/builder.js'
import { mulberry32 } from '../../games/ascii/random.js'
import { tree } from './props.js'

const BOX = new THREE.BoxGeometry(1, 1, 1)
const ROUNDED = new RoundedBoxGeometry(1, 1, 1, 2, 0.1)
const SPHERE = new THREE.SphereGeometry(1, 12, 8)
const CYLINDER = new THREE.CylinderGeometry(1, 1, 1, 10)
// A pennant: a thin triangle hanging point down, facing z
const FLAG = new THREE.CylinderGeometry(0.17, 0.17, 0.02, 3).rotateX(Math.PI / 2)
const PASTELS = ['#ff9ec4', '#ffe06a', '#7fe0c0', '#7cc7f4', '#b9a1ff', '#ffb98a']

const mesh = (builder, env, { shadows = true, ao = 0.4 } = {}) => {
  const m = new THREE.Mesh(builder.build({ ao, aoStrength: 0.3 }), env.material)
  m.castShadow = shadows
  m.receiveShadow = true
  return m
}

/** An arch of flowers over a path, facing +z, 5 m wide. */
export function arch (env, seed = 1) {
  const random = mulberry32(seed)
  const b = new Builder(env.atlas)
  for (const side of [-1, 1]) {
    b.add(ROUNDED, '#fbf6ef', { position: [side * 2.6, 1.7, 0], scale: [0.36, 3.4, 0.36] })
    b.add(ROUNDED, '#e8dccd', { position: [side * 2.6, 0.12, 0], scale: [0.6, 0.24, 0.6] })
  }
  // The curve over the top, and flowers along it
  b.add(new THREE.TorusGeometry(2.6, 0.16, 8, 24, Math.PI), '#fbf6ef', { position: [0, 3.4, 0] })
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI
    const x = Math.cos(a) * 2.6
    const y = 3.4 + Math.sin(a) * 2.6
    b.add(SPHERE, i % 3 === 1 ? '#6cc76d' : '#7fd47a', { position: [x, y, (random() - 0.5) * 0.2], scale: 0.24 + random() * 0.08, region: 'leaves' })
    b.add(SPHERE, PASTELS[(i + seed) % 4], { position: [x * 1.02, y + 0.1, 0.2], scale: 0.12 })
  }
  return mesh(b, env)
}

/**
 * Bunting from `from` to `to` (points at the tops of two posts), sagging in the middle, with
 * pennants in turn of the pastel colors.
 */
export function bunting (env, from, to, sag = 0.7) {
  const b = new Builder(env.atlas)
  const span = Math.hypot(to.x - from.x, to.z - from.z)
  const yaw = Math.atan2(to.x - from.x, to.z - from.z) - Math.PI / 2
  const at = (t) => [
    from.x + (to.x - from.x) * t,
    from.y + (to.y - from.y) * t - sag * 4 * t * (1 - t),
    from.z + (to.z - from.z) * t
  ]
  const pieces = Math.max(8, Math.round(span * 1.6))
  for (let i = 0; i < pieces; i++) {
    const a = at(i / pieces)
    const c = at((i + 1) / pieces)
    const length = Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2])
    const direction = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]).normalize()
    const turn = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction))
    b.add(CYLINDER, '#f4ede4', { position: [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2], rotation: [turn.x, turn.y, turn.z], scale: [0.02, length, 0.02] })
    if (i > 0) {
      const [x, y, z] = a
      b.add(FLAG, PASTELS[i % PASTELS.length], { position: [x, y - 0.17, z], rotation: [0, yaw, 0] })
    }
  }
  return mesh(b, env, { shadows: false, ao: 0 })
}

/** A cottage facing +z: plaster walls, a pitched roof, a door, two windows and a chimney. */
function cottage (b, x, z, ry, random) {
  const wall = ['#fff1e0', '#ffe4ef', '#e7f6ff', '#effbe9', '#fff7d6'][Math.floor(random() * 5)]
  const roof = ['#ef7f86', '#7aa6e8', '#f2a65a', '#8fcf8a', '#b493e8'][Math.floor(random() * 5)]
  const w = 3.6 + random() * 1.4
  const d = 3.4 + random() * 0.8
  const h = 2.6 + random() * 1.2
  const place = (lx, ly, lz) => [x + Math.cos(ry) * lx + Math.sin(ry) * lz, ly, z - Math.sin(ry) * lx + Math.cos(ry) * lz]
  b.add(BOX, wall, { position: place(0, h / 2, 0), rotation: [0, ry, 0], scale: [w, h, d], region: 'plaster' })
  for (const side of [-1, 1]) {
    b.add(BOX, roof, { position: place(side * w * 0.26, h + w * 0.2, 0), rotation: [0, ry, side * -0.62], scale: [w * 0.62, 0.16, d + 0.5], region: 'roof' })
  }
  b.add(BOX, wall, { position: place(0, h + w * 0.1, 0), rotation: [0, ry, 0], scale: [w * 0.4, w * 0.22, d - 0.05] })
  b.add(BOX, '#ffffff', { position: place(0, 0.95, d / 2 + 0.03), rotation: [0, ry, 0], scale: [0.9, 1.8, 0.1], region: 'door' })
  for (const side of [-1, 1]) b.add(BOX, '#ffffff', { position: place(side * w * 0.3, 1.55, d / 2 + 0.03), rotation: [0, ry, 0], scale: [0.85, 0.85, 0.1], region: 'window' })
  b.add(BOX, '#c98f7a', { position: place(w * 0.25, h + w * 0.3, -d * 0.15), rotation: [0, ry, 0], scale: [0.4, 1, 0.4], region: 'bricks' })
}

/**
 * The town around the plaza: rings of cottages between the shops, then a forest belt. Leaves
 * the four shop fronts and the paths to them clear.
 */
export function town (env) {
  const random = mulberry32(42)
  const group = new THREE.Group()
  const b = new Builder(env.atlas)
  for (let quarter = 0; quarter < 4; quarter++) {
    for (const [offset, r] of [[0.42, 33], [0.66, 37], [0.9, 33], [1.14, 37], [0.54, 46], [1.02, 46]]) {
      const a = quarter * (Math.PI / 2) + offset + (random() - 0.5) * 0.06
      const x = Math.sin(a) * r
      const z = Math.cos(a) * r
      // Facing the plaza
      cottage(b, x, z, Math.atan2(-x, -z), random)
    }
  }
  // Out past the sun's shadow area, so no shadows to cast
  group.add(mesh(b, env, { ao: 0.6, shadows: false }))
  // Trees between the cottages, and a forest belt further out
  for (let i = 0; i < 46; i++) {
    const near = i < 16
    const a = (i / (near ? 16 : 30)) * Math.PI * 2 + random() * 0.15
    const r = near ? 41 + random() * 3 : 54 + random() * 14
    const x = Math.sin(a) * r
    const z = Math.cos(a) * r
    // Not in front of the shops, nor on the far path to the pond
    if (near && Math.min(...[0, Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI * 2].map(s => Math.abs(a - s))) < 0.22) continue
    const t = tree(env, { seed: 100 + i, far: true, blossom: i % 5 === 0 })
    t.position.set(x, 0, z)
    t.scale.setScalar(1.3 + random() * 0.6)
    group.add(t)
  }
  return group
}

/** A pond with stones round it, lily pads, reeds and a little wooden bridge; ducks swim on it. */
export function pond (env, radius = 6.5) {
  const random = mulberry32(7)
  const group = new THREE.Group()
  // Matter than the fountain's water: a pond this big, glassy, would mirror the sun into a glare
  const matte = env.water.clone()
  matte.roughness = 0.45
  matte.emissiveIntensity = 0.2
  const water = new THREE.Mesh(new THREE.CircleGeometry(radius, 40), matte)
  water.rotation.x = -Math.PI / 2
  water.position.y = 0.06
  group.add(water)
  const b = new Builder(env.atlas)
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2
    const s = 0.45 + random() * 0.35
    b.add(SPHERE, ['#d9d4e6', '#cfc8de', '#e6e0ee'][i % 3], { position: [Math.cos(a) * radius, 0.1, Math.sin(a) * radius], scale: [s, s * 0.5, s * 0.8], rotation: [0, a, 0], region: 'stone' })
  }
  for (let i = 0; i < 9; i++) {
    const a = random() * Math.PI * 2
    const r = random() * (radius - 1.5)
    b.add(CYLINDER, '#5fbf6a', { position: [Math.cos(a) * r, 0.08, Math.sin(a) * r], scale: [0.45, 0.03, 0.45] })
    if (i % 3 === 0) b.add(SPHERE, '#ffb3d1', { position: [Math.cos(a) * r, 0.17, Math.sin(a) * r], scale: [0.14, 0.1, 0.14] })
  }
  for (let i = 0; i < 12; i++) {
    const a = 2.3 + random() * 1.4
    const r = radius - 0.4 - random() * 0.6
    const h = 0.9 + random() * 0.6
    b.add(CYLINDER, '#6aa860', { position: [Math.cos(a) * r, h / 2, Math.sin(a) * r], scale: [0.03, h, 0.03] })
    b.add(SPHERE, '#8a5a3a', { position: [Math.cos(a) * r, h, Math.sin(a) * r], scale: [0.05, 0.16, 0.05] })
  }
  // The bridge: planks over an arch
  for (let i = 0; i <= 12; i++) {
    const t = i / 12
    const x = (t - 0.5) * (radius * 2 + 1.2)
    const y = 0.25 + Math.sin(t * Math.PI) * 0.9
    b.add(BOX, i % 2 ? '#c9925a' : '#b98250', { position: [x, y, 0], rotation: [0, 0, Math.cos(t * Math.PI) * -0.45], scale: [0.62, 0.1, 1.6] })
    if (i % 3 === 0) {
      for (const side of [-1, 1]) b.add(CYLINDER, '#9a6b48', { position: [x, y + 0.35, side * 0.78], scale: [0.05, 0.7, 0.05] })
    }
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 12; i++) {
      const t0 = i / 12
      const t1 = (i + 1) / 12
      const x0 = (t0 - 0.5) * (radius * 2 + 1.2)
      const x1 = (t1 - 0.5) * (radius * 2 + 1.2)
      const y0 = 0.95 + Math.sin(t0 * Math.PI) * 0.9
      const y1 = 0.95 + Math.sin(t1 * Math.PI) * 0.9
      b.add(BOX, '#9a6b48', { position: [(x0 + x1) / 2, (y0 + y1) / 2, side * 0.78], rotation: [0, 0, Math.atan2(y1 - y0, x1 - x0)], scale: [Math.hypot(x1 - x0, y1 - y0) + 0.02, 0.06, 0.06] })
    }
  }
  group.add(mesh(b, env, { ao: 0.3, shadows: false }))

  // Ducks: one small moving mesh
  const ducks = new Builder(env.atlas)
  for (const [x, z, k] of [[1.5, 2.2, 1], [2.3, 2.9, 0.8], [3, 2.1, 0.75]]) {
    ducks.add(SPHERE, '#ffe06a', { position: [x, 0.14 * k, z], scale: [0.26 * k, 0.16 * k, 0.18 * k] })
    ducks.add(SPHERE, '#ffe06a', { position: [x + 0.2 * k, 0.32 * k, z], scale: 0.12 * k })
    ducks.add(SPHERE, '#ff9a3c', { position: [x + 0.32 * k, 0.3 * k, z], scale: [0.07 * k, 0.03 * k, 0.05 * k] })
  }
  const flock = new THREE.Mesh(ducks.build(), env.material)
  flock.userData.dynamic = true
  flock.position.y = 0.06
  group.add(flock)
  let t = 0
  return {
    object: group,
    update (dt) {
      t += dt
      flock.rotation.y = t * 0.12
      flock.position.y = 0.06 + Math.sin(t * 2) * 0.02
    }
  }
}

/** A windmill with turning sails. */
export function windmill (env) {
  const group = new THREE.Group()
  const b = new Builder(env.atlas)
  b.add(new THREE.CylinderGeometry(1.5, 2.3, 9, 12), '#fbf6ef', { position: [0, 4.5, 0], region: 'plaster' })
  b.add(new THREE.ConeGeometry(2.0, 2.4, 12), '#ef7f86', { position: [0, 10.2, 0], region: 'roof' })
  b.add(BOX, '#ffffff', { position: [0, 1.1, 2.15], scale: [1, 2, 0.2], region: 'door' })
  b.add(BOX, '#ffffff', { position: [0, 5.5, 1.8], scale: [0.8, 0.8, 0.2], region: 'window' })
  group.add(mesh(b, env, { ao: 0.5, shadows: false }))
  const s = new Builder(env.atlas)
  s.add(CYLINDER, '#9a6b48', { position: [0, 0, 0.2], rotation: [Math.PI / 2, 0, 0], scale: [0.35, 0.6, 0.35] })
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2
    s.add(BOX, '#9a6b48', { position: [Math.sin(a) * 2.6, Math.cos(a) * 2.6, 0.45], rotation: [0, 0, -a], scale: [0.18, 5.2, 0.1] })
    s.add(BOX, '#fff4e6', { position: [Math.sin(a) * 2.9 + Math.cos(a) * 0.45, Math.cos(a) * 2.9 - Math.sin(a) * 0.45, 0.5], rotation: [0, 0, -a], scale: [0.85, 4, 0.05] })
  }
  const sails = new THREE.Mesh(s.build(), env.material)
  sails.userData.dynamic = true
  sails.position.set(0, 8.4, 2.3)
  group.add(sails)
  return {
    object: group,
    update (dt) {
      sails.rotation.z -= dt * 0.6
    }
  }
}

/** A striped hot-air balloon that drifts round the sky. */
export function balloon (env) {
  const b = new Builder(env.atlas)
  const gores = 10
  for (let i = 0; i < gores; i++) {
    const part = new THREE.SphereGeometry(1, 4, 12, (i / gores) * Math.PI * 2, (Math.PI * 2) / gores)
    b.add(part, i % 2 ? '#ffffff' : ['#ff7eb6', '#ffd75e', '#7cc7f4'][Math.floor(i / 2) % 3], { position: [0, 3, 0], scale: [2.4, 2.9, 2.4] })
  }
  b.add(new THREE.CylinderGeometry(0.9, 0.55, 0.9, 10, 1, true), '#ff7eb6', { position: [0, 0.55, 0] })
  b.add(ROUNDED, '#b98250', { position: [0, -1.2, 0], scale: [0.9, 0.7, 0.9] })
  for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) b.add(CYLINDER, '#6e5640', { position: [x * 1.1, -0.35, z * 1.1], scale: [0.025, 1.2, 0.025] })
  const object = new THREE.Mesh(b.build(), env.material)
  object.userData.dynamic = true
  let t = 30
  return {
    object,
    update (dt) {
      t += dt
      const a = t * 0.02
      object.position.set(Math.cos(a) * 48, 24 + Math.sin(t * 0.4) * 1.2, Math.sin(a) * 48 - 10)
      object.rotation.y = t * 0.05
    }
  }
}
