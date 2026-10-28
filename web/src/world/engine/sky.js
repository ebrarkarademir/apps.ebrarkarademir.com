// Daytime light and sky: a warm sun with soft shadows that follow the player, a pale blue
// bounce from the sky and a green one from the grass, under a gradient sky with puffy clouds.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const SHADOW_SPAN = 22 // meters of shadow around the player

/** Sun and sky light. follow(point) keeps the sharp shadows where the player is. */
export function createDaylight (scene, { sunColor = '#fff1d6', sunStrength = 2.4, skyStrength = 1.0, span = SHADOW_SPAN } = {}) {
  // The studio environment map only adds a touch of reflection; sun and sky do the lighting
  scene.environmentIntensity = 0.35
  const hemisphere = new THREE.HemisphereLight('#dbeeff', '#efe6d2', skyStrength)
  const sun = new THREE.DirectionalLight(sunColor, sunStrength)
  const offset = new THREE.Vector3(18, 30, 14)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.radius = 5
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.02
  const shadowCamera = sun.shadow.camera
  shadowCamera.left = -span
  shadowCamera.right = span
  shadowCamera.top = span
  shadowCamera.bottom = -span
  shadowCamera.near = 1
  shadowCamera.far = 90
  scene.add(hemisphere, sun, sun.target)

  return {
    sun,
    hemisphere,
    follow (point) {
      // Whole shadow-map texels, so shadows don't shimmer as the player walks
      const texel = (span * 2) / sun.shadow.mapSize.x
      const x = Math.round(point.x / texel) * texel
      const z = Math.round(point.z / texel) * texel
      sun.target.position.set(x, 0, z)
      sun.position.set(x + offset.x, offset.y, z + offset.z)
    }
  }
}

const SKY_VERTEX = `
  varying vec3 vDirection;
  void main () {
    vDirection = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`

const SKY_FRAGMENT = `
  uniform vec3 top;
  uniform vec3 horizon;
  uniform vec3 bottom;
  uniform vec3 sunDirection;
  varying vec3 vDirection;
  void main () {
    float h = vDirection.y;
    vec3 color = h > 0.0 ? mix(horizon, top, pow(h, 0.6)) : mix(horizon, bottom, min(1.0, -h * 4.0));
    float sun = max(0.0, dot(vDirection, sunDirection));
    color += vec3(1.0, 0.93, 0.78) * (pow(sun, 900.0) * 3.0 + pow(sun, 18.0) * 0.18);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

/** A gradient sky dome with a glowing sun and a ring of soft clouds. */
export function createSky (scene, { top = '#62b5f5', horizon = '#dff2ff', bottom = '#f3fbff', sunDirection = new THREE.Vector3(18, 30, 14), clouds: withClouds = true } = {}) {
  const material = new THREE.ShaderMaterial({
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    uniforms: {
      top: { value: new THREE.Color(top) },
      horizon: { value: new THREE.Color(horizon) },
      bottom: { value: new THREE.Color(bottom) },
      sunDirection: { value: sunDirection.clone().normalize() }
    },
    side: THREE.BackSide,
    depthWrite: false
  })
  const dome = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), material)
  dome.frustumCulled = false
  dome.renderOrder = -10
  scene.add(dome)

  if (!withClouds) return { update () {} }

  // Clouds: clusters of white puffs, merged into one mesh
  const puffs = []
  const puff = new THREE.SphereGeometry(1, 14, 10)
  for (let c = 0; c < 14; c++) {
    const angle = (c / 14) * Math.PI * 2 + Math.random() * 0.3
    const distance = 150 + Math.random() * 60
    const center = new THREE.Vector3(Math.cos(angle) * distance, 38 + Math.random() * 30, Math.sin(angle) * distance)
    const size = 6 + Math.random() * 5
    for (let i = 0; i < 6; i++) {
      const part = puff.clone()
      const r = size * (0.55 + Math.random() * 0.5)
      part.scale(r * 1.4, r * 0.75, r)
      part.translate(center.x + (Math.random() - 0.5) * size * 2.6, center.y + Math.random() * size * 0.5, center.z + (Math.random() - 0.5) * size * 1.4)
      puffs.push(part)
    }
  }
  const clouds = new THREE.Mesh(
    mergeGeometries(puffs),
    new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#e8f2ff', emissiveIntensity: 0.55, roughness: 1, fog: false })
  )
  puffs.forEach(part => part.dispose())
  scene.add(clouds)

  return {
    update (dt) {
      clouds.rotation.y += dt * 0.004
    }
  }
}
