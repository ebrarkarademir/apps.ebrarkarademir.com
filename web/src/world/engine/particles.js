// Particle effects: the fountain's water, a burst of sparkles when something is bought, and
// confetti when a player levels up. Each is one draw call, updated on the CPU.
import * as THREE from 'three'

// Soft round dots and four-pointed sparkles, drawn once on small canvases
function spriteTexture (draw) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  draw(canvas.getContext('2d'))
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

const dot = () => spriteTexture((g) => {
  const gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.8)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gradient
  g.fillRect(0, 0, 64, 64)
})

const star = () => spriteTexture((g) => {
  g.translate(32, 32)
  g.fillStyle = '#fff'
  g.beginPath()
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? 7 : 30
    const a = (i / 8) * Math.PI * 2
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  g.fill()
  const glow = g.createRadialGradient(0, 0, 0, 0, 0, 18)
  glow.addColorStop(0, 'rgba(255,255,255,0.9)')
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = glow
  g.fillRect(-32, -32, 64, 64)
})

/**
 * Water thrown up from `sources` ([{ x, y, z, speed, spread }]) and falling back into the
 * basin at `floor` height.
 */
export function createFountain (sources, floor, count = 700) {
  const positions = new Float32Array(count * 3)
  const velocities = new Float32Array(count * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    size: 0.14,
    map: dot(),
    color: '#e8f8ff',
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false

  function respawn (i) {
    const source = sources[i % sources.length]
    const angle = Math.random() * Math.PI * 2
    const spread = source.spread * (0.6 + Math.random() * 0.4)
    positions.set([source.x, source.y, source.z], i * 3)
    velocities.set([Math.cos(angle) * spread, source.speed * (0.85 + Math.random() * 0.3), Math.sin(angle) * spread], i * 3)
  }

  // Start mid-flight, so the fountain doesn't switch on in a single puff
  for (let i = 0; i < count; i++) {
    respawn(i)
    const t = Math.random() * 1.2
    positions[i * 3] += velocities[i * 3] * t
    positions[i * 3 + 1] += velocities[i * 3 + 1] * t - 4.9 * t * t
    positions[i * 3 + 2] += velocities[i * 3 + 2] * t
    velocities[i * 3 + 1] -= 9.8 * t
  }

  return {
    object: points,
    update (dt) {
      for (let i = 0; i < count; i++) {
        const j = i * 3
        velocities[j + 1] -= 9.8 * dt
        positions[j] += velocities[j] * dt
        positions[j + 1] += velocities[j + 1] * dt
        positions[j + 2] += velocities[j + 2] * dt
        if (positions[j + 1] < floor) respawn(i)
      }
      geometry.attributes.position.needsUpdate = true
    }
  }
}

/** Short-lived bursts: sparkles and confetti. Add `object` to the scene and call update(dt). */
export function createBursts () {
  const group = new THREE.Group()
  const live = []

  const sparkleTexture = star()

  return {
    object: group,

    /** Golden sparkles flying out from a point. */
    sparkle (at, count = 70) {
      const positions = new Float32Array(count * 3)
      const velocities = []
      for (let i = 0; i < count; i++) {
        positions.set([at.x, at.y, at.z], i * 3)
        const a = Math.random() * Math.PI * 2
        const up = Math.random() * 2 - 0.3
        const speed = 1.5 + Math.random() * 2.5
        velocities.push(Math.cos(a) * speed, up * speed, Math.sin(a) * speed)
      }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const material = new THREE.PointsMaterial({ size: 0.35, map: sparkleTexture, color: '#ffe27a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
      const points = new THREE.Points(geometry, material)
      group.add(points)
      live.push({ object: points, age: 0, ttl: 1.2, update: (dt, t) => {
        for (let i = 0; i < count; i++) {
          velocities[i * 3 + 1] -= 3 * dt
          for (let k = 0; k < 3; k++) positions[i * 3 + k] += velocities[i * 3 + k] * dt
        }
        geometry.attributes.position.needsUpdate = true
        material.opacity = 1 - t
        material.size = 0.35 * (1 - t * 0.5)
      } })
    },

    /** Confetti raining down around a point. */
    confetti (at, count = 160) {
      const colors = ['#ff7eb6', '#7cc7f4', '#ffe36e', '#7fe0c0', '#b9a1ff', '#ff9a6b']
      const geometry = new THREE.PlaneGeometry(0.12, 0.07)
      const material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.5 })
      const mesh = new THREE.InstancedMesh(geometry, material, count)
      const pieces = []
      const color = new THREE.Color()
      for (let i = 0; i < count; i++) {
        pieces.push({
          p: new THREE.Vector3(at.x + (Math.random() - 0.5) * 3, at.y + 2 + Math.random() * 2.5, at.z + (Math.random() - 0.5) * 3),
          v: new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2),
          r: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
          spin: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8)
        })
        mesh.setColorAt(i, color.set(colors[i % colors.length]))
      }
      const matrix = new THREE.Matrix4()
      const quaternion = new THREE.Quaternion()
      const one = new THREE.Vector3(1, 1, 1)
      group.add(mesh)
      live.push({ object: mesh, age: 0, ttl: 3.2, update: (dt) => {
        pieces.forEach((piece, i) => {
          piece.v.y -= 2.2 * dt
          piece.v.multiplyScalar(1 - dt * 0.9)
          piece.p.addScaledVector(piece.v, dt)
          piece.r.x += piece.spin.x * dt
          piece.r.y += piece.spin.y * dt
          piece.r.z += piece.spin.z * dt
          matrix.compose(piece.p, quaternion.setFromEuler(piece.r), one)
          mesh.setMatrixAt(i, matrix)
        })
        mesh.instanceMatrix.needsUpdate = true
      } })
    },

    update (dt) {
      for (let i = live.length - 1; i >= 0; i--) {
        const burst = live[i]
        burst.age += dt
        if (burst.age >= burst.ttl) {
          group.remove(burst.object)
          burst.object.geometry.dispose()
          burst.object.material.dispose()
          live.splice(i, 1)
          continue
        }
        burst.update(dt, burst.age / burst.ttl)
      }
    }
  }
}
