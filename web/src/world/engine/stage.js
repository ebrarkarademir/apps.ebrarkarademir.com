// The 3D stage every world screen draws on: one WebGL renderer with soft shadows and PBR
// lighting, then a short chain of effects. A multisampled HDR target smooths the edges, a
// soft bloom lets bright things glow, a gentle depth of field blurs the world behind open
// menus, and the output pass maps it all to the screen's colors.
//
// It keeps itself near 60 frames a second by drawing fewer pixels when frames run slow, and
// more again when there's room.
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

const MAX_PIXEL_RATIO = 1.5
const MIN_PIXEL_RATIO = 0.6
const SLOW_MS = 1000 / 50 // frames slower than this, on average, cost resolution
const FAST_MS = 1000 / 58

export function createStage (canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  // Neutral tone mapping keeps saturated colors saturated, unlike filmic curves
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  // Counted over a whole frame (every pass), not just the last one
  renderer.info.autoReset = false

  // A soft studio environment for the PBR materials' ambient light and gentle highlights
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()

  let scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400)

  const target = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType })
  const composer = new EffectComposer(renderer, target)
  const renderPass = new RenderPass(scene, camera)
  const bokeh = new BokehPass(scene, camera, { focus: 8, aperture: 0.0025, maxblur: 0.008 })
  bokeh.enabled = false
  // Only what's well above sunlit white glows (lamps, sparkles, spray), so a big sunny floor
  // never turns into haze
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3, 0.4, 1.5)
  composer.addPass(renderPass)
  composer.addPass(bokeh)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  let width = 1
  let height = 1
  let pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
  let slowFor = 0
  let fastFor = 0
  const frameTimes = []
  const stats = { fps: 0, pixelRatio, calls: 0, triangles: 0 }

  function applySize () {
    renderer.setPixelRatio(pixelRatio)
    renderer.setSize(width, height, false)
    composer.setPixelRatio(pixelRatio)
    composer.setSize(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  function resize () {
    const box = canvas.parentElement.getBoundingClientRect()
    width = Math.max(1, Math.round(box.width))
    height = Math.max(1, Math.round(box.height))
    applySize()
  }

  // Watches how long frames take and trades resolution for speed, a little at a time
  function adapt (ms) {
    frameTimes.push(ms)
    if (frameTimes.length > 60) frameTimes.shift()
    const average = frameTimes.reduce((sum, t) => sum + t, 0) / frameTimes.length
    stats.fps = Math.round(1000 / average)
    if (frameTimes.length < 60) return
    if (average > SLOW_MS) {
      fastFor = 0
      if (++slowFor > 90 && pixelRatio > MIN_PIXEL_RATIO) {
        pixelRatio = Math.max(MIN_PIXEL_RATIO, pixelRatio - 0.15)
        slowFor = 0
        frameTimes.length = 0
        applySize()
      }
    } else if (average < FAST_MS) {
      slowFor = 0
      const best = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
      if (++fastFor > 240 && pixelRatio < best) {
        pixelRatio = Math.min(best, pixelRatio + 0.15)
        fastFor = 0
        frameTimes.length = 0
        applySize()
      }
    }
    stats.pixelRatio = pixelRatio
  }

  return {
    renderer,
    camera,
    environment,
    stats,
    get scene () {
      return scene
    },
    setScene (next) {
      scene = next
      scene.environment ??= environment
      renderPass.scene = scene
      bokeh.scene = scene
    },
    resize,
    /** Blurs the world behind a menu, focused on what's `focus` away. */
    setBlur (on, focus = 8) {
      bokeh.enabled = on
      bokeh.uniforms.focus.value = focus
    },
    render (ms) {
      adapt(ms)
      renderer.info.reset()
      composer.render()
      stats.calls = renderer.info.render.calls
      stats.triangles = renderer.info.render.triangles
    },
    dispose () {
      composer.dispose()
      target.dispose()
      environment.dispose()
      renderer.dispose()
    }
  }
}
