// What every scene shares: the texture atlas and the handful of materials the whole world is
// drawn with (props, glowing lamps, water, glass).
import * as THREE from 'three'
import { createAtlas } from '../engine/atlas.js'
import { propMaterial } from '../engine/builder.js'

function rippleTexture () {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const g = canvas.getContext('2d')
  g.fillStyle = '#9fdcff'
  g.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.35})`
    g.lineWidth = 2 + Math.random() * 3
    g.beginPath()
    g.ellipse(Math.random() * 256, Math.random() * 256, 14 + Math.random() * 30, 5 + Math.random() * 8, 0, 0.3, Math.PI - 0.3)
    g.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 3)
  return texture
}

export function createEnv () {
  const atlas = createAtlas()
  const ripples = rippleTexture()
  return {
    atlas,
    material: propMaterial(atlas),
    // Brighter than white, so the bloom picks it up
    glow: new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#ffe39a', emissiveIntensity: 2.4, roughness: 0.4 }),
    water: new THREE.MeshStandardMaterial({ color: '#9fdcff', map: ripples, transparent: true, opacity: 0.9, roughness: 0.06, metalness: 0.1, emissive: '#3fa6e0', emissiveIntensity: 0.3 }),
    glass: new THREE.MeshStandardMaterial({ color: '#d8f2ff', transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0, depthWrite: false }),
    update (dt) {
      ripples.offset.x += dt * 0.03
      ripples.offset.y += dt * 0.017
    }
  }
}
