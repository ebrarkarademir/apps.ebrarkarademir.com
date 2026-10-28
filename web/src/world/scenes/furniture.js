// Furniture for homes (and the shop's previews), built from soft rounded shapes in the item's
// color. Each model stands on the floor centered on its footprint, its front facing +z, and
// lists the places an avatar can sit on it.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { Builder } from '../engine/builder.js'
import { mulberry32 } from '../../games/ascii/random.js'

const SOFT = new RoundedBoxGeometry(1, 1, 1, 3, 0.16)
const BOX = new THREE.BoxGeometry(1, 1, 1)
const CYLINDER = new THREE.CylinderGeometry(1, 1, 1, 20)
const SPHERE = new THREE.SphereGeometry(1, 18, 12)
const WOOD = '#c9925a'
const DARK = '#3a3f52'

const tint = (hex, k) => {
  const color = new THREE.Color(hex)
  return `#${(k > 1 ? color.lerp(new THREE.Color('#ffffff'), k - 1) : color.multiplyScalar(k)).getHexString()}`
}

let screenMaterial = null
function screen () {
  if (!screenMaterial) {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 72
    const g = canvas.getContext('2d')
    const sky = g.createLinearGradient(0, 0, 0, 72)
    sky.addColorStop(0, '#7cc7f4')
    sky.addColorStop(1, '#ffd6e8')
    g.fillStyle = sky
    g.fillRect(0, 0, 128, 72)
    g.fillStyle = '#ffe36e'
    g.beginPath(); g.arc(96, 22, 10, 0, Math.PI * 2); g.fill()
    g.fillStyle = '#7fd27a'
    g.beginPath(); g.ellipse(30, 78, 60, 26, 0, 0, Math.PI * 2); g.fill()
    g.beginPath(); g.ellipse(100, 82, 50, 22, 0, 0, Math.PI * 2); g.fill()
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    screenMaterial = new THREE.MeshStandardMaterial({ map: texture, emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: 0.9, roughness: 0.3 })
  }
  return screenMaterial
}

/**
 * @param {object} env  From createEnv()
 * @param {string} model  Catalog model name
 * @param {string} hex  The item's color
 * @returns {{ object: THREE.Group, seats: Array<{ x, z, height, ry }>, update?: (dt, t) => void }}
 */
export function buildFurniture (env, model, hex) {
  const b = new Builder(env.atlas)
  const group = new THREE.Group()
  const seats = []
  let update = null
  const soft = (color, [w, h, d], [x, y, z], rotation) => b.add(SOFT, color, { position: [x, y, z], scale: [w, h, d], rotation })
  const box = (color, [w, h, d], [x, y, z], rotation) => b.add(BOX, color, { position: [x, y, z], scale: [w, h, d], rotation })
  const cylinder = (color, r, h, [x, y, z], r2 = r) => b.add(r2 === r ? CYLINDER : new THREE.CylinderGeometry(r, r2, 1, 20), color, { position: [x, y, z], scale: r2 === r ? [r, h, r] : [1, h, 1] })
  const ball = (color, [sx, sy, sz], [x, y, z]) => b.add(SPHERE, color, { position: [x, y, z], scale: [sx, sy, sz] })

  switch (model) {
    case 'bed':
      soft(WOOD, [0.96, 0.32, 1.96], [0, 0.16, 0])
      soft('#fbfbff', [0.9, 0.16, 1.86], [0, 0.38, 0.02])
      soft(hex, [0.94, 0.08, 1.25], [0, 0.47, 0.32])
      soft(tint(hex, 0.86), [0.95, 0.1, 0.14], [0, 0.5, -0.3])
      soft('#ffffff', [0.6, 0.14, 0.32], [0, 0.53, -0.66])
      soft(hex, [0.98, 0.85, 0.1], [0, 0.48, -0.95])
      seats.push({ x: 0.3, z: 0.45, height: 0.47, ry: Math.PI / 2 })
      break
    case 'sofa':
    case 'armchair': {
      const wide = model === 'sofa' ? 1.9 : 0.92
      const half = wide / 2 - 0.12
      soft(hex, [wide, 0.36, 0.86], [0, 0.26, 0])
      soft(hex, [wide, 0.62, 0.24], [0, 0.62, -0.31])
      for (const side of [-1, 1]) {
        soft(hex, [0.24, 0.55, 0.86], [side * half, 0.43, 0])
        cylinder(DARK, 0.04, 0.1, [side * half, 0.05, 0.32])
        cylinder(DARK, 0.04, 0.1, [side * half, 0.05, -0.32])
      }
      const cushions = model === 'sofa' ? [-0.4, 0.4] : [0]
      for (const x of cushions) {
        soft(tint(hex, 1.12), [model === 'sofa' ? 0.78 : 0.5, 0.15, 0.6], [x, 0.5, 0.06])
        soft(tint(hex, 1.12), [model === 'sofa' ? 0.76 : 0.5, 0.42, 0.14], [x, 0.74, -0.18])
        seats.push({ x, z: 0.14, height: 0.54, ry: 0 })
      }
      break
    }
    case 'chair':
      soft(hex, [0.5, 0.08, 0.5], [0, 0.46, 0.02])
      for (const x of [-0.2, 0.2]) for (const z of [-0.18, 0.2]) box(hex, [0.06, 0.46, 0.06], [x, 0.23, z])
      soft(hex, [0.5, 0.5, 0.07], [0, 0.76, -0.21])
      seats.push({ x: 0, z: 0.04, height: 0.48, ry: 0 })
      break
    case 'table':
      cylinder(hex, 0.46, 0.06, [0, 0.74, 0])
      cylinder(hex, 0.06, 0.7, [0, 0.37, 0])
      cylinder(hex, 0.26, 0.04, [0, 0.02, 0])
      cylinder('#a8d8f0', 0.06, 0.18, [0.12, 0.86, 0.05], 0.045)
      ball('#ff7eb6', [0.07, 0.07, 0.07], [0.12, 1.0, 0.05])
      break
    case 'dining':
      soft(hex, [1.84, 0.08, 0.86], [0, 0.74, 0])
      for (const x of [-0.82, 0.82]) for (const z of [-0.34, 0.34]) box(hex, [0.08, 0.72, 0.08], [x, 0.36, z])
      ball('#f6f1ea', [0.2, 0.08, 0.2], [0, 0.82, 0])
      for (const [x, color] of [[-0.06, '#ef5060'], [0.07, '#ffe06a'], [0, '#7fd27a']]) ball(color, [0.06, 0.06, 0.06], [x, 0.9, x * 0.5])
      break
    case 'lamp': {
      cylinder(tint(hex, 0.9), 0.2, 0.05, [0, 0.03, 0])
      cylinder(hex === '#f7f7fb' ? '#c8ccd8' : hex, 0.025, 1.4, [0, 0.75, 0])
      b.add(new THREE.CylinderGeometry(0.17, 0.3, 0.32, 20), hex, { position: [0, 1.56, 0] })
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), env.glow)
      bulb.position.y = 1.44
      group.add(bulb)
      break
    }
    case 'plant':
    case 'cactus':
      b.add(new THREE.CylinderGeometry(0.2, 0.15, 0.32, 18), '#e07a5f', { position: [0, 0.16, 0] })
      b.add(new THREE.TorusGeometry(0.2, 0.03, 8, 20), '#ef8f73', { position: [0, 0.32, 0], rotation: [Math.PI / 2, 0, 0] })
      cylinder('#7a5236', 0.18, 0.02, [0, 0.31, 0])
      if (model === 'plant') {
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2
          const tilt = 0.45 + (i % 2) * 0.25
          b.add(SPHERE, i % 2 ? '#5fbf68' : '#4fae58', { position: [Math.sin(a) * 0.13, 0.62 + (i % 3) * 0.06, Math.cos(a) * 0.13], rotation: [Math.cos(a) * tilt, 0, -Math.sin(a) * tilt], scale: [0.09, 0.3, 0.05] })
        }
      } else {
        b.add(new THREE.CapsuleGeometry(0.12, 0.5, 6, 14), '#5fb86a', { position: [0, 0.68, 0] })
        for (const side of [-1, 1]) {
          b.add(new THREE.CapsuleGeometry(0.07, 0.16, 6, 12), '#5fb86a', { position: [side * 0.2, 0.75 + side * 0.06, 0] })
          b.add(new THREE.CapsuleGeometry(0.06, 0.08, 6, 12), '#5fb86a', { position: [side * 0.14, 0.62 + side * 0.06, 0], rotation: [0, 0, Math.PI / 2] })
        }
        ball('#ff7eb6', [0.07, 0.05, 0.07], [0, 1.06, 0])
      }
      break
    case 'rug':
      cylinder(hex, 0.95, 0.025, [0, 0.013, 0])
      cylinder(tint(hex, 1.25), 0.72, 0.028, [0, 0.014, 0])
      cylinder(hex, 0.42, 0.031, [0, 0.016, 0])
      break
    case 'tv': {
      soft('#f2ece4', [1.8, 0.45, 0.5], [0, 0.225, 0.05])
      for (const x of [-0.45, 0.45]) box(tint('#f2ece4', 0.9), [0.8, 0.02, 0.02], [x, 0.3, 0.31])
      soft(DARK, [1.32, 0.8, 0.07], [0, 0.98, -0.12])
      box(DARK, [0.3, 0.05, 0.2], [0, 0.48, -0.1])
      box(DARK, [0.06, 0.14, 0.04], [0, 0.56, -0.12])
      const display = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.68), screen())
      display.position.set(0, 0.98, -0.08)
      group.add(display)
      break
    }
    case 'bookshelf': {
      const random = mulberry32(hex.length * 7 + 3)
      for (const side of [-1, 1]) soft(hex, [0.08, 1.8, 0.4], [side * 0.86, 0.9, 0])
      for (const y of [0.05, 0.62, 1.18, 1.76]) soft(hex, [1.8, 0.06, 0.4], [0, y, 0])
      box(tint(hex, 0.9), [1.7, 1.72, 0.03], [0, 0.9, -0.19])
      const covers = ['#ef5060', '#7cc7f4', '#ffe06a', '#7fe0c0', '#b9a1ff', '#ff9a6b', '#5778c4']
      for (const shelf of [0.08, 0.65, 1.21]) {
        for (let x = -0.78; x < 0.72;) {
          const w = 0.05 + random() * 0.05
          const h = 0.3 + random() * 0.14
          box(covers[Math.floor(random() * covers.length)], [w, h, 0.26], [x + w / 2, shelf + h / 2, 0.02])
          x += w + 0.008
          if (random() < 0.08) x += 0.12
        }
      }
      break
    }
    case 'desk':
      soft(hex, [1.8, 0.07, 0.75], [0, 0.74, 0])
      soft(tint(hex, 0.92), [0.5, 0.7, 0.68], [0.6, 0.35, 0])
      for (const y of [0.2, 0.48]) ball('#f2c14e', [0.03, 0.03, 0.03], [0.6, y, 0.35])
      for (const z of [-0.3, 0.3]) box(tint(hex, 0.92), [0.06, 0.72, 0.06], [-0.84, 0.36, z])
      soft('#9aa3b5', [0.5, 0.025, 0.34], [-0.3, 0.79, 0.08])
      soft('#9aa3b5', [0.5, 0.32, 0.025], [-0.3, 0.95, -0.1], [-0.25, 0, 0])
      box('#a8dcff', [0.44, 0.26, 0.01], [-0.3, 0.95, -0.085], [-0.25, 0, 0])
      break
    case 'wardrobe':
      soft(hex, [1.8, 2.0, 0.6], [0, 1.0, 0])
      soft(tint(hex, 0.9), [1.9, 0.08, 0.66], [0, 2.02, 0])
      box(tint(hex, 0.8), [0.015, 1.8, 0.02], [0, 1.0, 0.3])
      for (const x of [-0.08, 0.08]) ball('#f2c14e', [0.035, 0.035, 0.035], [x, 1.05, 0.31])
      break
    case 'beanbag':
      ball(hex, [0.46, 0.32, 0.46], [0, 0.3, 0])
      ball(tint(hex, 1.12), [0.3, 0.12, 0.3], [0, 0.55, -0.08])
      seats.push({ x: 0, z: 0.05, height: 0.36, ry: 0 })
      break
    case 'teddy': {
      const fur = hex
      const light = tint(hex, 1.35)
      ball(fur, [0.24, 0.28, 0.2], [0, 0.3, 0])
      ball(light, [0.14, 0.16, 0.08], [0, 0.28, 0.13])
      ball(fur, [0.19, 0.18, 0.17], [0, 0.66, 0])
      for (const side of [-1, 1]) {
        ball(fur, [0.07, 0.07, 0.05], [side * 0.13, 0.82, 0])
        ball(light, [0.04, 0.04, 0.03], [side * 0.13, 0.82, 0.03])
        ball(fur, [0.08, 0.14, 0.08], [side * 0.22, 0.38, 0.05])
        ball(fur, [0.09, 0.08, 0.13], [side * 0.12, 0.1, 0.16])
        ball('#2a2230', [0.022, 0.022, 0.015], [side * 0.065, 0.7, 0.16])
      }
      ball(light, [0.08, 0.06, 0.06], [0, 0.62, 0.15])
      ball('#2a2230', [0.03, 0.022, 0.02], [0, 0.64, 0.2])
      b.add(new THREE.TorusGeometry(0.11, 0.022, 8, 18), '#ef5060', { position: [0, 0.5, 0.02], rotation: [Math.PI / 2 - 0.2, 0, 0] })
      break
    }
    case 'aquarium': {
      soft(WOOD, [1.8, 0.62, 0.55], [0, 0.31, 0])
      box(DARK, [1.74, 0.05, 0.52], [0, 0.645, 0])
      box(DARK, [1.74, 0.05, 0.52], [0, 1.43, 0])
      box('#f1d9a8', [1.66, 0.08, 0.46], [0, 0.71, 0])
      for (let i = 0; i < 5; i++) b.add(new THREE.CapsuleGeometry(0.025, 0.25 + (i % 3) * 0.1, 4, 8), '#4fae58', { position: [-0.7 + i * 0.35, 0.9, -0.1 + (i % 2) * 0.12], rotation: [0, 0, (i % 2 - 0.5) * 0.3] })
      const water = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.66, 0.46), env.water)
      water.position.y = 1.07
      water.renderOrder = 1
      const glass = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.8, 0.52), env.glass)
      glass.position.y = 1.04
      glass.renderOrder = 2
      group.add(water, glass)
      const fish = []
      for (let i = 0; i < 3; i++) {
        const fb = new Builder(env.atlas)
        const color = ['#ff9a3c', '#ffe06a', '#ff7eb6'][i]
        fb.add(SPHERE, color, { scale: [0.07, 0.05, 0.03] })
        fb.add(new THREE.ConeGeometry(0.05, 0.08, 8), color, { position: [-0.09, 0, 0], rotation: [0, 0, Math.PI / 2] })
        fb.add(SPHERE, '#2a2230', { position: [0.045, 0.015, 0.02], scale: 0.01 })
        const one = new THREE.Mesh(fb.build(), env.material)
        group.add(one)
        fish.push({ mesh: one, speed: 0.6 + i * 0.25, y: 0.95 + i * 0.12, z: -0.1 + i * 0.1, phase: i * 2 })
      }
      update = (dt, t) => {
        for (const f of fish) {
          const s = Math.sin(t * f.speed + f.phase)
          f.mesh.position.set(s * 0.65, f.y + Math.sin(t * 1.7 + f.phase) * 0.04, f.z)
          f.mesh.rotation.y = Math.cos(t * f.speed + f.phase) >= 0 ? 0 : Math.PI
        }
      }
      break
    }
    case 'piano':
      soft(hex, [1.6, 1.15, 0.55], [0, 0.62, -0.05])
      soft(hex, [1.5, 0.08, 0.32], [0, 0.72, 0.28])
      box('#ffffff', [1.42, 0.03, 0.2], [0, 0.775, 0.31])
      // Black keys in twos and threes, like a real keyboard
      for (let i = 0; i < 20; i++) {
        if (i % 7 === 2 || i % 7 === 6) continue
        box(DARK, [0.03, 0.035, 0.11], [-0.68 + i * 0.07, 0.8, 0.27])
      }
      for (const side of [-1, 1]) soft(hex, [0.08, 0.7, 0.3], [side * 0.72, 0.35, 0.28])
      soft(hex, [0.6, 0.03, 0.2], [0, 1.05, 0.2], [-0.4, 0, 0])
      break
    default:
      soft(hex, [0.8, 0.8, 0.8], [0, 0.4, 0])
  }

  const body = new THREE.Mesh(b.build({ ao: 0.22, aoStrength: 0.35 }), env.material)
  body.castShadow = model !== 'rug'
  body.receiveShadow = true
  group.add(body)
  return { object: group, seats, update }
}
