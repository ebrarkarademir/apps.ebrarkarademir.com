// Avatars: a semi-cartoon body made of smooth shapes (a slightly big head, big shiny eyes),
// dressed as the look says and posed every frame by a small procedural animator.
//
// Every body part is rigidly tied to one bone of a skeleton and merged into a single skinned
// mesh, plus one for the shiny eyes: an avatar is three draw calls with its contact shadow.
// Far away, the eyes switch off and the avatar stops casting a shadow.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Builder } from '../engine/builder.js'
import { SKIN, HAIR, EYES, parseItem } from '../palette.js'

export const STATE = { idle: 0, walk: 1, wave: 2, dance: 3, sit: 4, laugh: 5 }
export const EMOTES = ['wave', 'dance', 'sit', 'laugh']
// One-shot emotes end by themselves after this long; sit and dance last until you move
export const EMOTE_MS = { wave: 2600, laugh: 2600 }

const R = 0.25 // head radius
const HC = 0.24 // head center above the neck joint
const HIPS = 0.74 // hip height when standing
const DETAIL_FAR = 22 // meters
const NO_ATLAS = { regions: {}, white: { u: 0.5, v: 0.5 } }

const bodyMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0, side: THREE.DoubleSide })
const eyeMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.15, metalness: 0 })

// Unit shapes, scaled into place by the builder
const SPHERE = new THREE.SphereGeometry(1, 24, 16)
const SMALL = new THREE.SphereGeometry(1, 12, 8)
const BOX = new THREE.BoxGeometry(1, 1, 1)
const CYLINDER = new THREE.CylinderGeometry(1, 1, 1, 18)
const capsules = new Map()
const capsule = (r, length) => {
  const key = `${r}:${length}`
  if (!capsules.has(key)) capsules.set(key, new THREE.CapsuleGeometry(r, length, 6, 14))
  return capsules.get(key)
}
const caps = new Map()
const cap = (theta) => {
  if (!caps.has(theta)) caps.set(theta, new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, theta))
  return caps.get(theta)
}

const shade = (hex, k) => `#${new THREE.Color(hex).multiplyScalar(k).getHexString()}`
const mix = (a, b, t) => `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`

const torsos = {}
function torso (female) {
  const key = female ? 'f' : 'm'
  if (!torsos[key]) {
    const profile = female
      ? [[0.001, 0], [0.15, 0], [0.155, 0.05], [0.123, 0.2], [0.148, 0.34], [0.14, 0.44], [0.09, 0.5], [0.001, 0.52]]
      : [[0.001, 0], [0.14, 0], [0.15, 0.06], [0.152, 0.2], [0.176, 0.36], [0.166, 0.45], [0.1, 0.51], [0.001, 0.53]]
    torsos[key] = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 22)
  }
  return torsos[key]
}

// Orientation that turns +y toward `normal`, as Euler angles for the builder
const up = new THREE.Vector3(0, 1, 0)
const toward = (normal) => {
  const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(up, normal.clone().normalize()))
  return [e.x, e.y, e.z]
}

const FACES = [[1, 0.98, 1], [0.93, 1.07, 0.97], [1.07, 0.95, 1]]
const EYE_STYLES = [
  { w: 1, h: 1 }, // round
  { w: 1.18, h: 0.78 }, // almond
  { w: 1.1, h: 0.62 }, // sleepy
  { w: 1.15, h: 1.15, sparkle: true }, // sparkly
  { w: 1.28, h: 1.12 } // wide
]

// Where the face's features sit, measured from the head's center
const EYE_X = 0.085
const EYE_Y = -0.01
const BROW_Y = 0.075
const MOUTH_Y = -0.1

/**
 * A point on the front of a head shaped fx·fy·fz, `out` above the skin, with the turn that lays
 * a flat shape (thin along z) onto the skin there.
 */
function onFace (fx, fy, fz, x, y, out = 0) {
  const a = R * fx
  const b = R * fy
  const c = R * fz
  const z = c * Math.sqrt(Math.max(0, 1 - (x / a) ** 2 - (y / b) ** 2))
  const n = new THREE.Vector3(x / (a * a), y / (b * b), z / (c * c)).normalize()
  return {
    position: [x + n.x * out, HC + y + n.y * out, z + n.z * out],
    rotation: [Math.atan2(-n.y, n.z), Math.asin(n.x), 0]
  }
}
// Brows: tilt of the inner end, and thickness
const BROWS = [{ tilt: 0, r: 0.012 }, { tilt: -0.28, r: 0.012 }, { tilt: 0.32, r: 0.014 }, { tilt: -0.1, r: 0.008 }]

const SLEEVES = { tee: 'upper', hoodie: 'long', sweater: 'long', tank: 'none', dress: 'none' }
const PANTS = { jeans: 'long', joggers: 'long', shorts: 'short', skirt: 'none' }

// Every part's geometry for a look
function buildParts (look) {
  const female = look.body === 'f'
  const skin = SKIN[look.skin] ?? SKIN[0]
  const hair = HAIR[look.hairColor] ?? HAIR[0]
  const eyeColor = EYES[look.eyeColor] ?? EYES[0]
  const [fx, fy, fz] = FACES[look.face] ?? FACES[0]
  const top = parseItem(look.top) ?? { model: 'tee', hex: '#f7f7fb' }
  const bottom = parseItem(look.bottom) ?? { model: 'jeans', hex: '#5778c4' }
  const shoes = parseItem(look.shoes) ?? { model: 'sneakers', hex: '#f7f7fb' }
  const acc = parseItem(look.acc)
  const sleeves = SLEEVES[top.model] ?? 'upper'
  const pants = PANTS[bottom.model] ?? 'long'
  const dress = top.model === 'dress'
  const b = () => new Builder(NO_ATLAS)

  // ----- Hips: pelvis, skirts
  const hips = b()
  hips.add(SPHERE, dress ? top.hex : bottom.hex, { position: [0, 0.02, 0], scale: [0.152, 0.11, 0.115] })
  if (dress || bottom.model === 'skirt') {
    const flare = new THREE.CylinderGeometry(0.165, dress ? 0.29 : 0.26, dress ? 0.32 : 0.24, 22, 1, true)
    hips.add(flare, dress ? top.hex : bottom.hex, { position: [0, dress ? -0.12 : -0.08, 0], scale: [1, 1, 0.86] })
  }

  // ----- Torso: the top, the neck, scarves
  const chest = b()
  chest.add(torso(female), top.hex, { scale: [1, 1, 0.72] })
  chest.add(CYLINDER, skin, { position: [0, 0.53, 0], scale: [0.055, 0.1, 0.055] })
  if (top.model === 'tank' || dress) {
    // Bare shoulders, with a trimmed neckline and armholes so the top reads as clothing
    for (const side of [-1, 1]) chest.add(SMALL, skin, { position: [side * (female ? 0.135 : 0.15), 0.44, 0], scale: 0.06 })
    chest.add(new THREE.TorusGeometry(0.085, 0.016, 6, 20), shade(top.hex, 0.8), { position: [0, 0.47, 0.012], rotation: [Math.PI / 2 - 0.25, 0, 0], scale: [1, 0.75, 1] })
  }
  if (top.model === 'hoodie') {
    chest.add(BOX, shade(top.hex, 0.85), { position: [0, 0.12, 0.112], scale: [0.2, 0.08, 0.02] })
    for (const side of [-1, 1]) chest.add(capsule(0.008, 0.08), '#ffffff', { position: [side * 0.04, 0.4, 0.108] })
  } else if (top.model === 'sweater') {
    chest.add(new THREE.TorusGeometry(0.07, 0.028, 8, 18), shade(top.hex, 0.85), { position: [0, 0.505, 0], rotation: [Math.PI / 2, 0, 0] })
  } else if (top.model === 'tee') {
    chest.add(new THREE.TorusGeometry(0.068, 0.014, 6, 18), shade(top.hex, 0.88), { position: [0, 0.505, 0.005], rotation: [Math.PI / 2, 0, 0] })
  } else if (dress) {
    chest.add(new THREE.TorusGeometry(0.135, 0.016, 6, 22), '#ffffff', { position: [0, 0.2, 0], rotation: [Math.PI / 2, 0, 0], scale: [1, 0.72, 1] })
  }
  if (acc?.model === 'scarf') {
    chest.add(new THREE.TorusGeometry(0.1, 0.045, 10, 20), acc.hex, { position: [0, 0.47, 0], rotation: [Math.PI / 2, 0, 0] })
    chest.add(BOX, acc.hex, { position: [0.06, 0.35, 0.11], rotation: [0.15, 0, 0.12], scale: [0.07, 0.2, 0.03] })
  }

  // ----- Head: face, hair, head-worn accessories. Kept simple: every face feature sits on the
  // head's own surface (whatever its shape), and hair is one shell over the top and back whose
  // front edge stays above the brows, so nothing pokes through anything else.
  const head = b()
  const ra = R * fx
  const rb = R * fy
  const rc = R * fz
  head.add(SPHERE, skin, { position: [0, HC, 0], scale: [ra, rb, rc] })
  const brow = BROWS[look.brows] ?? BROWS[0]
  for (const side of [-1, 1]) {
    const cheek = onFace(fx, fy, fz, side * 0.13, -0.065, 0.002)
    head.add(SMALL, mix(skin, '#ff8fa3', 0.5), { ...cheek, scale: [0.042, 0.024, 0.01] })
    const browAt = onFace(fx, fy, fz, side * EYE_X, BROW_Y, 0.006)
    head.add(capsule(brow.r, 0.05), shade(hair, 0.7), { position: browAt.position, rotation: [browAt.rotation[0], browAt.rotation[1], Math.PI / 2 + side * brow.tilt] })
  }
  head.add(SMALL, shade(skin, 0.92), { ...onFace(fx, fy, fz, 0, -0.045, 0.004), scale: 0.022 })

  const hatted = acc?.model === 'cap'
  const hairR = R * Math.max(fx, fy, fz) * 1.06
  // The shell: `reach` radians from its middle, tilted back until its front edge is `front`
  // radians above the eye line
  const shell = (reach, front, k = 1) => {
    const tilt = front + reach - Math.PI / 2
    head.add(cap(reach), hair, { position: [0, HC, 0], rotation: [-tilt, 0, 0], scale: hairR * k })
  }
  // A point on the hair: up `elevation` radians, round `turn` radians from the front (+ is left)
  const onHair = (elevation, turn, out = 0) => {
    const r = hairR + out
    return [Math.sin(turn) * Math.cos(elevation) * r, HC + Math.sin(elevation) * r, Math.cos(turn) * Math.cos(elevation) * r]
  }
  switch (look.hair) {
    case 0: // short
      shell(Math.PI * 0.52, 0.46)
      break
    case 1: // spiky
      shell(Math.PI * 0.5, 0.45)
      if (!hatted) {
        for (let i = 0; i < 7; i++) {
          const turn = Math.PI + (i - 3) * 0.55
          const elevation = i % 2 ? 0.95 : 1.2
          const n = new THREE.Vector3(...onHair(elevation, turn)).sub(new THREE.Vector3(0, HC, 0)).normalize()
          head.add(new THREE.ConeGeometry(0.05, 0.13, 8), hair, { position: onHair(elevation, turn, 0.03), rotation: toward(n) })
        }
      }
      break
    case 2: // long
      shell(Math.PI * 0.6, 0.48)
      head.add(SPHERE, hair, { position: [0, HC - 0.13, -0.11], scale: [0.25, 0.3, 0.13] })
      break
    case 3: // ponytail
      shell(Math.PI * 0.52, 0.46)
      head.add(SMALL, shade(hair, 0.6), { position: onHair(0.25, Math.PI, -0.005), scale: 0.045 })
      head.add(capsule(0.06, 0.2), hair, { position: [0, HC - 0.07, -hairR - 0.06], rotation: [0.3, 0, 0] })
      break
    case 4: // bob
      shell(Math.PI * 0.66, 0.5)
      break
    case 5: // curly
      shell(Math.PI * 0.52, 0.46, 0.98)
      // Curls round the sides, back and top only, well away from the face
      for (let i = 0; i < 14; i++) {
        const elevation = hatted ? -0.35 + (i % 3) * 0.2 : 0.1 + (i % 4) * 0.3
        const turn = Math.PI + (i - 6.5) * 0.25
        head.add(SMALL, hair, { position: onHair(elevation, turn, -0.01), scale: 0.07 + (i % 3) * 0.01 })
      }
      break
    case 6: // buns
      shell(Math.PI * 0.5, 0.45)
      if (!hatted) for (const side of [-1, 1]) head.add(SPHERE, hair, { position: onHair(1.05, side * 0.75 + Math.PI, 0.02), scale: 0.085 })
      break
    default: // buzz
      shell(Math.PI * 0.5, 0.5, 0.97)
  }

  if (acc) {
    switch (acc.model) {
      case 'cap': {
        const capR = hairR * 1.06
        head.add(cap(Math.PI / 2), acc.hex, { position: [0, HC, 0], rotation: [-0.52, 0, 0], scale: capR })
        head.add(CYLINDER, acc.hex, { position: [0, HC + Math.sin(0.52) * capR - 0.01, Math.cos(0.52) * capR + 0.06], rotation: [0.25, 0, 0], scale: [0.15, 0.014, 0.12] })
        head.add(SMALL, shade(acc.hex, 0.8), { position: [0, HC + capR * 0.88, -capR * 0.45], scale: 0.022 })
        break
      }
      case 'glasses':
        for (const side of [-1, 1]) {
          const ring = onFace(fx, fy, fz, side * EYE_X, EYE_Y, 0.03)
          head.add(new THREE.TorusGeometry(1, 0.13, 6, 20), acc.hex, { ...ring, scale: 0.056 })
        }
        head.add(BOX, acc.hex, { ...onFace(fx, fy, fz, 0, EYE_Y + 0.01, 0.03), scale: [0.06, 0.009, 0.009] })
        break
      case 'bow':
        for (const side of [-1, 1]) head.add(SPHERE, acc.hex, { position: onHair(0.95, 0.75 + side * 0.17, 0.02), rotation: [0, 0.75, side * 0.5], scale: [0.06, 0.042, 0.03] })
        head.add(SMALL, shade(acc.hex, 0.85), { position: onHair(0.95, 0.75, 0.03), scale: 0.024 })
        break
      case 'headphones':
        head.add(new THREE.TorusGeometry(1, 0.05, 8, 28, Math.PI), acc.hex, { position: [0, HC, 0], scale: [hairR * 1.08, hairR * 1.08, 1] })
        for (const side of [-1, 1]) head.add(CYLINDER, acc.hex, { position: [side * hairR * 1.04, HC - 0.02, 0], rotation: [0, 0, Math.PI / 2], scale: [0.075, 0.06, 0.075] })
        break
      case 'flower':
        head.add(SMALL, '#ffd75e', { position: onHair(0.8, -0.85, 0.035), scale: 0.022 })
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2
          const [x, y, z] = onHair(0.8, -0.85, 0.025)
          head.add(SMALL, acc.hex, { position: [x + Math.cos(a) * 0.03, y + Math.sin(a) * 0.03, z], scale: [0.028, 0.02, 0.012], rotation: [0, -0.85, a] })
        }
        break
      case 'crown':
        head.add(new THREE.CylinderGeometry(0.12, 0.11, 0.08, 20, 1, true), acc.hex, { position: [0, HC + hairR * 0.93, 0] })
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2
          head.add(new THREE.ConeGeometry(0.024, 0.07, 6), acc.hex, { position: [Math.sin(a) * 0.115, HC + hairR * 0.93 + 0.07, Math.cos(a) * 0.115] })
          head.add(SMALL, i % 2 ? '#7cc7f4' : '#ef5060', { position: [Math.sin(a) * 0.122, HC + hairR * 0.93, Math.cos(a) * 0.122], scale: 0.015 })
        }
        break
    }
  }

  // ----- Eyes, on their own so they can blink: big cartoon ovals with a shine, laid on the
  // face around the eye line
  const eyes = b()
  const style = EYE_STYLES[look.eyes] ?? EYE_STYLES[0]
  for (const side of [-1, 1]) {
    const at = (out, dx = 0, dy = 0) => {
      const p = onFace(fx, fy, fz, side * EYE_X + dx, EYE_Y + dy, out)
      p.position[1] -= HC + EYE_Y
      return p
    }
    eyes.add(SPHERE, mix(eyeColor, '#1d1b2a', 0.25), { ...at(0.004), scale: [0.04 * style.w, 0.05 * style.h, 0.012] })
    eyes.add(SPHERE, '#1d1b2a', { ...at(0.009), scale: [0.022 * style.w, 0.03 * style.h, 0.01] })
    eyes.add(SMALL, '#ffffff', { ...at(0.017, -0.012, 0.014 * style.h), scale: 0.011 })
    if (style.sparkle) eyes.add(SMALL, '#ffffff', { ...at(0.017, 0.012, -0.016 * style.h), scale: 0.006 })
  }

  // ----- Mouth: a smile, and an open laugh, tipped to the face below the nose
  const tip = onFace(fx, fy, fz, 0, MOUTH_Y, 0).rotation[0]
  const smile = b().add(new THREE.TorusGeometry(0.03, 0.007, 6, 14, Math.PI), '#c2565f', { rotation: [tip, 0, Math.PI] })
  const laugh = b()
  laugh.add(SPHERE, '#8c2f3b', { rotation: [tip, 0, 0], scale: [0.04, 0.03, 0.012] })
  laugh.add(SMALL, '#ff8fa3', { position: [0, -0.013, 0.004], rotation: [tip, 0, 0], scale: [0.02, 0.011, 0.008] })

  // ----- Arms and legs (one geometry for both sides). Each starts with a ball at its joint,
  // so bending never opens a gap.
  const sleeve = sleeves === 'none' ? skin : top.hex
  const lowerSleeve = sleeves === 'long' ? top.hex : skin
  const upperArm = b()
  upperArm.add(SPHERE, sleeve, { scale: 0.064 })
  upperArm.add(capsule(0.055, 0.17), sleeve, { position: [0, -0.13, 0] })
  if (sleeves === 'upper') upperArm.add(new THREE.TorusGeometry(0.056, 0.012, 6, 14), shade(top.hex, 0.88), { position: [0, -0.19, 0], rotation: [Math.PI / 2, 0, 0] })
  const forearm = b()
  forearm.add(SPHERE, lowerSleeve, { scale: 0.051 })
  forearm.add(capsule(0.048, 0.15), lowerSleeve, { position: [0, -0.12, 0] })
  forearm.add(SPHERE, skin, { position: [0, -0.258, 0.005], scale: [0.055, 0.062, 0.048] })
  const leg = pants === 'none' ? skin : bottom.hex
  const lowerLeg = pants === 'long' ? bottom.hex : skin
  const thigh = b()
  thigh.add(SPHERE, leg, { scale: 0.075 })
  thigh.add(capsule(0.072, 0.22), leg, { position: [0, -0.18, 0] })
  const shin = b()
  shin.add(SPHERE, lowerLeg, { scale: 0.064 })
  shin.add(capsule(0.061, 0.22), lowerLeg, { position: [0, -0.165, 0] })
  if (bottom.model === 'joggers') shin.add(new THREE.TorusGeometry(0.058, 0.014, 6, 14), shade(bottom.hex, 0.8), { position: [0, -0.255, 0], rotation: [Math.PI / 2, 0, 0] })
  const sole = shoes.hex === '#f7f7fb' ? '#e3e4ee' : '#ffffff'
  if (shoes.model === 'boots') {
    shin.add(CYLINDER, shoes.hex, { position: [0, -0.25, 0], scale: [0.066, 0.15, 0.066] })
    shin.add(SPHERE, shoes.hex, { position: [0, -0.315, 0.035], scale: [0.072, 0.06, 0.12] })
    shin.add(BOX, '#5b3b28', { position: [0, -0.358, 0.03], scale: [0.13, 0.026, 0.23] })
  } else if (shoes.model === 'sandals') {
    shin.add(SPHERE, skin, { position: [0, -0.32, 0.035], scale: [0.058, 0.045, 0.11] })
    shin.add(BOX, shoes.hex, { position: [0, -0.358, 0.035], scale: [0.12, 0.022, 0.22] })
    shin.add(new THREE.TorusGeometry(0.055, 0.012, 6, 14), shoes.hex, { position: [0, -0.32, 0.06], rotation: [0.3, 0, 0], scale: [1, 0.8, 1] })
  } else {
    shin.add(SPHERE, shoes.hex, { position: [0, -0.315, 0.035], scale: [0.07, 0.055, 0.115] })
    shin.add(BOX, sole, { position: [0, -0.355, 0.03], scale: [0.13, 0.03, 0.22] })
    shin.add(BOX, sole, { position: [0, -0.275, 0.07], scale: [0.05, 0.012, 0.06] })
  }

  return {
    hips: hips.build(),
    chest: chest.build(),
    head: head.build(),
    eyes: eyes.build(),
    smile: smile.build(),
    laugh: laugh.build(),
    upperArm: upperArm.build(),
    forearm: forearm.build(),
    thigh: thigh.build(),
    shin: shin.build()
  }
}

// A soft dark disc under the feet, the contact shadow
let blobTexture = null
function blob () {
  if (!blobTexture) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const g = canvas.getContext('2d')
    const gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(40,30,60,0.42)')
    gradient.addColorStop(1, 'rgba(40,30,60,0)')
    g.fillStyle = gradient
    g.fillRect(0, 0, 64, 64)
    blobTexture = new THREE.CanvasTexture(canvas)
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), new THREE.MeshBasicMaterial({ map: blobTexture, transparent: true, depthWrite: false }))
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = 0.012
  mesh.renderOrder = -1
  return mesh
}

const lerp = (a, b, t) => a + (b - a) * t

// ---------- Poses ----------
// A pose is a set of joint angles (radians) and a hip offset. Each state has a target pose
// that moves with time; the avatar eases toward it, which also blends one state into the next.

const NEUTRAL = {
  hipsY: 0, hipsX: 0, hipsZ: 0, hipsTwist: 0, spineX: 0, spineY: 0, spineZ: 0, headX: 0, headY: 0, headZ: 0,
  lArmX: 0, lArmZ: 0.08, lElbow: -0.1, lElbowZ: 0, rArmX: 0, rArmZ: -0.08, rElbow: -0.1, rElbowZ: 0,
  lLeg: 0, lKnee: 0, rLeg: 0, rKnee: 0, mouth: 0
}

function targetPose (state, t, phase, seat) {
  const p = { ...NEUTRAL }
  const breath = Math.sin(t * 1.7)
  p.spineX = 0.015 * breath
  p.headY = Math.sin(t * 0.37) * 0.14
  p.headX = Math.sin(t * 0.53) * 0.04
  switch (state) {
    case STATE.walk: {
      const s = Math.sin(phase)
      p.lLeg = -s * 0.6
      p.rLeg = s * 0.6
      p.lKnee = 0.12 + 0.75 * Math.max(0, Math.sin(phase - 1.3))
      p.rKnee = 0.12 + 0.75 * Math.max(0, Math.sin(phase + Math.PI - 1.3))
      p.lArmX = s * 0.5
      p.rArmX = -s * 0.5
      p.lElbow = p.rElbow = -0.35
      p.hipsY = 0.03 * Math.abs(Math.cos(phase))
      p.hipsTwist = s * 0.08
      p.spineY = -s * 0.1
      p.spineX = 0.05
      p.headY = 0
      break
    }
    case STATE.wave:
      p.rArmZ = -2.5
      p.rArmX = -0.25
      p.rElbow = -0.2
      p.rElbowZ = Math.sin(t * 10) * 0.55
      p.headZ = 0.07
      p.headY = -0.1
      break
    case STATE.dance: {
      const beat = Math.sin(t * 7)
      p.hipsY = 0.05 * Math.max(0, beat)
      p.hipsZ = Math.sin(t * 3.5) * 0.1
      p.spineZ = -Math.sin(t * 3.5) * 0.12
      p.lArmZ = 2.35 + beat * 0.35
      p.rArmZ = -(2.35 - beat * 0.35)
      p.lElbow = p.rElbow = -0.55
      p.lKnee = p.rKnee = 0.25 + 0.25 * Math.max(0, beat)
      p.lLeg = p.rLeg = -0.12 * Math.max(0, beat)
      p.headX = beat * 0.1
      p.headY = Math.sin(t * 3.5) * 0.15
      p.mouth = 1
      break
    }
    case STATE.sit: {
      const height = seat?.height ?? 0.12
      const onSeat = height > 0.25
      p.hipsY = height + 0.06 - HIPS
      p.lLeg = p.rLeg = -1.45
      p.lKnee = p.rKnee = onSeat ? 1.45 : 0.2
      p.spineX = onSeat ? 0 : -0.12
      p.lArmX = p.rArmX = onSeat ? -0.5 : 0.35
      p.lElbow = p.rElbow = onSeat ? -0.65 : -0.1
      p.lArmZ = onSeat ? 0.12 : 0.25
      p.rArmZ = -p.lArmZ
      break
    }
    case STATE.laugh: {
      const shake = Math.sin(t * 17)
      p.headX = -0.28 + shake * 0.05
      p.spineX = -0.08 + shake * 0.03
      p.hipsY = 0.01 + Math.abs(shake) * 0.012
      p.lArmX = p.rArmX = -0.55
      p.lElbow = p.rElbow = -1.45
      p.lArmZ = 0.2
      p.rArmZ = -0.2
      p.mouth = 1
      break
    }
  }
  return p
}

/**
 * An avatar dressed as `look` says: one skinned mesh for the body and one for the shiny eyes,
 * on a skeleton of rigid parts (each part follows one bone completely).
 * @returns {{ root: THREE.Group, label: THREE.Object3D, setLook(look), update(dt, t, motion), setDistance(meters), dispose() }}
 */
export function createAvatar (look) {
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body, blob())

  const bones = []
  const bone = (parent, x, y, z = 0) => {
    const node = new THREE.Bone()
    node.position.set(x, y, z)
    parent?.add(node)
    bones.push(node)
    return node
  }
  const hips = bone(null, 0, HIPS)
  const spine = bone(hips, 0, 0.02)
  const neck = bone(spine, 0, 0.52)
  const head = bone(neck, 0, 0.04)
  const eyesBone = bone(head, 0, HC + EYE_Y)
  const smileBone = bone(head, 0, HC - 0.105, 0.234)
  const laughBone = bone(head, 0, HC - 0.105, 0.234)
  const shoulderL = bone(spine, 0.2, 0.45)
  const shoulderR = bone(spine, -0.2, 0.45)
  const elbowL = bone(shoulderL, 0, -0.27)
  const elbowR = bone(shoulderR, 0, -0.27)
  const hipL = bone(hips, 0.092, -0.02)
  const hipR = bone(hips, -0.092, -0.02)
  const kneeL = bone(hipL, 0, -0.36)
  const kneeR = bone(hipR, 0, -0.36)
  body.add(hips)
  const rest = bones.map(node => node.position.clone())
  // Name tags hang over this point
  const label = new THREE.Object3D()
  label.position.set(0, HC + R + 0.2, 0)
  head.add(label)

  let mesh = null
  let eyeMesh = null
  let skeleton = null
  let detailed = true
  const pose = { ...NEUTRAL }
  let phase = 0
  let blinkAt = 2 + Math.random() * 3
  let blinkLeft = 0
  const toBody = new THREE.Matrix4()
  const bodyInverse = new THREE.Matrix4()

  // A part's geometry moved from its bone into the body, every vertex tied to that bone
  function place (geometry, node) {
    const part = geometry.clone()
    part.applyMatrix4(toBody.multiplyMatrices(bodyInverse, node.matrixWorld))
    const count = part.attributes.position.count
    const index = new Uint16Array(count * 4)
    const weight = new Float32Array(count * 4)
    const which = bones.indexOf(node)
    for (let i = 0; i < count; i++) {
      index[i * 4] = which
      weight[i * 4] = 1
    }
    part.setAttribute('skinIndex', new THREE.BufferAttribute(index, 4))
    part.setAttribute('skinWeight', new THREE.BufferAttribute(weight, 4))
    return part
  }

  function setLook (next) {
    // Bind in the rest pose, with this look's proportions
    const female = next.body === 'f'
    body.scale.setScalar(female ? 0.97 : 1)
    bones.forEach((node, i) => {
      node.position.copy(rest[i])
      node.rotation.set(0, 0, 0)
      node.scale.set(1, 1, 1)
    })
    shoulderL.position.x = female ? 0.185 : 0.205
    shoulderR.position.x = -shoulderL.position.x
    const [, mouthY, mouthZ] = onFace(...(FACES[next.face] ?? FACES[0]), 0, MOUTH_Y, 0.004).position
    smileBone.position.set(0, mouthY, mouthZ)
    laughBone.position.set(0, mouthY, mouthZ)
    root.updateMatrixWorld(true)
    bodyInverse.copy(body.matrixWorld).invert()

    const parts = buildParts(next)
    const pieces = [
      place(parts.hips, hips), place(parts.chest, spine), place(parts.head, head),
      place(parts.smile, smileBone), place(parts.laugh, laughBone),
      place(parts.upperArm, shoulderL), place(parts.upperArm, shoulderR),
      place(parts.forearm, elbowL), place(parts.forearm, elbowR),
      place(parts.thigh, hipL), place(parts.thigh, hipR),
      place(parts.shin, kneeL), place(parts.shin, kneeR)
    ]
    const eyes = place(parts.eyes, eyesBone)
    Object.values(parts).forEach(geometry => geometry.dispose())

    if (mesh) {
      body.remove(mesh, eyeMesh)
      mesh.geometry.dispose()
      eyeMesh.geometry.dispose()
      skeleton.dispose()
    }
    mesh = new THREE.SkinnedMesh(mergeGeometries(pieces), bodyMaterial)
    eyeMesh = new THREE.SkinnedMesh(eyes, eyeMaterial)
    pieces.forEach(piece => piece.dispose())
    for (const m of [mesh, eyeMesh]) {
      m.receiveShadow = true
      // Generous fixed bounds: posed avatars reach a little beyond the rest pose
      m.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.85, 0), 1.3)
      m.userData.avatar = true
      body.add(m)
    }
    skeleton = new THREE.Skeleton(bones)
    mesh.bind(skeleton)
    eyeMesh.bind(skeleton)
    setDetail(detailed, true)
  }

  function setDetail (on, force = false) {
    if (on === detailed && !force) return
    detailed = on
    eyeMesh.visible = on
    mesh.castShadow = on
    eyeMesh.castShadow = false
  }

  setLook(look)

  return {
    root,
    label,
    setLook,
    /** The meshes a click can hit. */
    get hitTargets () {
      return [mesh]
    },
    /** Face details and shadows only up close: the avatar's level of detail. */
    setDistance (meters) {
      setDetail(meters < DETAIL_FAR)
    },
    /**
     * Poses the avatar for this frame.
     * @param {object} motion  { state, speed (m/s, moves the walk cycle), seat: { height } }
     */
    update (dt, t, motion) {
      const state = motion.state ?? STATE.idle
      phase += (motion.speed ?? 0) * dt * 4.4
      const goal = targetPose(state, t, phase, motion.seat)
      const k = 1 - Math.exp(-dt * (state === STATE.walk ? 18 : 10))
      for (const key in pose) pose[key] = lerp(pose[key], goal[key], k)

      hips.position.y = HIPS + pose.hipsY
      hips.rotation.set(pose.hipsX, pose.hipsTwist, pose.hipsZ)
      spine.rotation.set(pose.spineX, pose.spineY, pose.spineZ)
      head.rotation.set(pose.headX, pose.headY, pose.headZ)
      shoulderL.rotation.set(pose.lArmX, 0, pose.lArmZ)
      shoulderR.rotation.set(pose.rArmX, 0, pose.rArmZ)
      elbowL.rotation.set(pose.lElbow, 0, pose.lElbowZ)
      elbowR.rotation.set(pose.rElbow, 0, pose.rElbowZ)
      hipL.rotation.set(pose.lLeg, 0, 0.02)
      hipR.rotation.set(pose.rLeg, 0, -0.02)
      kneeL.rotation.x = pose.lKnee
      kneeR.rotation.x = pose.rKnee
      // The open mouth replaces the smile while laughing or dancing
      const open = pose.mouth >= 0.5
      smileBone.scale.setScalar(open ? 0.001 : 1)
      laughBone.scale.setScalar(open ? 1 : 0.001)

      if (detailed) {
        blinkAt -= dt
        if (blinkAt <= 0) {
          blinkLeft = 0.13
          blinkAt = 2.5 + Math.random() * 3.5
        }
        blinkLeft = Math.max(0, blinkLeft - dt)
        eyesBone.scale.y = blinkLeft > 0 ? 0.12 : 1
      }
    },
    dispose () {
      root.removeFromParent()
      mesh.geometry.dispose()
      eyeMesh.geometry.dispose()
      skeleton.dispose()
      root.children[1].geometry.dispose()
      root.children[1].material.dispose()
    }
  }
}
