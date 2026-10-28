// Small 3D views for the menus: the avatar creator's turntable, the shop's preview of an item,
// and the little pictures on shop and inventory cards. A studio is a scene with soft lights
// and a transparent background, so the menu's own colors show behind it.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { createAvatar, STATE } from './avatar/avatar.js'
import { buildFurniture } from './scenes/furniture.js'
import { createEnv } from './scenes/env.js'
import { DEFAULT_LOOK, parseItem } from './palette.js'

// Camera framing per kind of subject: [looks at height, distance, camera height]
const FRAMES = {
  avatar: [0.95, 4.1, 1.3],
  // The shop's turning preview: the part being tried on, with enough of the player around it
  wearTop: [1.2, 2.5, 1.4],
  wearBottom: [0.6, 2.4, 0.9],
  wearShoes: [0.25, 1.7, 0.6],
  wearAcc: [1.45, 1.7, 1.55],
  top: [1.08, 1.3, 1.25],
  bottom: [0.5, 1.45, 0.75],
  shoes: [0.12, 1.0, 0.5],
  acc: [1.42, 1.0, 1.55],
  furniture: [0.55, 3.6, 2.2]
}

// What clothes thumbnails are shown on
const MANNEQUIN = { ...DEFAULT_LOOK, body: 'f', skin: 1, hair: 7, hairColor: 1, acc: null }

function createStudio (renderer) {
  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.45
  pmrem.dispose()
  scene.add(new THREE.HemisphereLight('#ffffff', '#f3e3ff', 1.2))
  const key = new THREE.DirectionalLight('#fff4e6', 2.3)
  key.position.set(2, 4, 3)
  const rim = new THREE.DirectionalLight('#dce9ff', 1.4)
  rim.position.set(-3, 2, -2)
  scene.add(key, rim)
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60)
  const env = createEnv()
  let subject = null
  let avatar = null
  let animate = null

  function clear () {
    if (!subject) return
    scene.remove(subject)
    if (avatar) avatar.dispose()
    else subject.traverse(node => node.isMesh && node.geometry.dispose())
    subject = null
    avatar = null
    animate = null
  }

  function frame (kind, scale = 1) {
    const [y, distance, height] = FRAMES[kind] ?? FRAMES.avatar
    camera.position.set(0, height * scale, distance * scale)
    camera.lookAt(0, y * scale, 0)
  }

  return {
    camera,
    scene,
    showAvatar (look, kind = 'avatar') {
      clear()
      avatar = createAvatar(look)
      subject = avatar.root
      scene.add(subject)
      frame(kind)
    },
    showFurniture (model, hex, size = [1, 1]) {
      clear()
      const built = buildFurniture(env, model, hex)
      subject = built.object
      animate = built.update
      scene.add(subject)
      frame('furniture', Math.max(0.75, Math.max(...size) * 0.62))
    },
    turn (angle) {
      if (subject) subject.rotation.y = angle
    },
    step (dt, t, state = STATE.idle) {
      avatar?.update(dt, t, { state, speed: 0 })
      animate?.(dt, t)
    },
    clear
  }
}

const settle = (renderer) => {
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.setClearColor(0x000000, 0)
}

let live = null

/** The one live preview: attach it to an element and it fills it, turning slowly. */
export function livePreview () {
  if (live) return live
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  settle(renderer)
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
  renderer.domElement.className = 'preview-canvas'
  const studio = createStudio(renderer)
  const clock = new THREE.Clock()
  let host = null
  let request = 0
  let angle = 0.5
  let drag = null
  let state = STATE.idle
  let observer = null
  let shift = 0

  const fit = () => {
    if (!host) return
    const w = Math.max(1, host.clientWidth)
    const h = Math.max(1, host.clientHeight)
    renderer.setSize(w, h, false)
    studio.camera.aspect = w / h
    // Off-center subjects leave room for text beside them
    if (shift) studio.camera.setViewOffset(w, h, w * shift, 0, w, h)
    else studio.camera.clearViewOffset()
    studio.camera.updateProjectionMatrix()
  }

  function loop () {
    request = requestAnimationFrame(loop)
    const dt = Math.min(0.05, clock.getDelta())
    if (!drag) angle += dt * 0.5
    studio.turn(angle)
    studio.step(dt, clock.elapsedTime, state)
    renderer.render(studio.scene, studio.camera)
  }

  // Drag sideways to spin it by hand
  const canvas = renderer.domElement
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX }
    canvas.setPointerCapture(e.pointerId)
  })
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return
    angle += (e.clientX - drag.x) * 0.012
    drag.x = e.clientX
  })
  const release = () => { drag = null }
  canvas.addEventListener('pointerup', release)
  canvas.addEventListener('pointercancel', release)

  live = {
    /** Fills `element`; `shift` moves the subject left by that share of the width. */
    attach (element, { shift: offset = 0 } = {}) {
      host = element
      shift = offset
      state = STATE.idle
      angle = 0.35 // facing the viewer, a little turned
      element.appendChild(canvas)
      observer?.disconnect()
      observer = new ResizeObserver(fit)
      observer.observe(element)
      fit()
      clock.getDelta()
      cancelAnimationFrame(request)
      loop()
    },
    /** Stops showing in `element`; a newer attach somewhere else is left alone. */
    detach (element) {
      if (host !== element) return
      cancelAnimationFrame(request)
      request = 0
      observer?.disconnect()
      canvas.remove()
      host = null
    },
    showAvatar (look, kind = 'avatar') {
      studio.showAvatar(look, kind)
    },
    /** Furniture on its own; clothes on the player, framed on the part they go on. */
    showItem (item, look) {
      const parsed = parseItem(item.id)
      if (item.kind === 'furniture') studio.showFurniture(item.model, parsed.hex, item.size)
      else studio.showAvatar({ ...look, [item.kind]: item.id }, `wear${item.kind[0].toUpperCase()}${item.kind.slice(1)}`)
    },
    /** Plays a pose on the avatar shown, e.g. a wave when something new is tried on. */
    pose (next) {
      state = next
    },
    /** Frees the renderer and its WebGL context; the next livePreview() makes a new one. */
    dispose () {
      cancelAnimationFrame(request)
      observer?.disconnect()
      canvas.remove()
      studio.clear()
      renderer.dispose()
      renderer.forceContextLoss()
      live = null
    }
  }
  return live
}

// ---------- Card pictures ----------
// Rendered one at a time between frames by a small renderer of their own, then kept as images.

const pictures = new Map() // item id -> data URL
const waiting = new Map() // item id -> [callbacks]
let thumbs = null
let busy = false
const queue = []

function drawNext () {
  if (busy || !queue.length) return
  busy = true
  requestAnimationFrame(() => {
    const item = queue.shift()
    if (!item) {
      busy = false
      return
    }
    if (!thumbs) {
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
      settle(renderer)
      renderer.setSize(160, 160, false)
      thumbs = { renderer, studio: createStudio(renderer) }
      thumbs.studio.camera.aspect = 1
      thumbs.studio.camera.updateProjectionMatrix()
    }
    const { renderer, studio } = thumbs
    const parsed = parseItem(item.id)
    if (item.kind === 'furniture') studio.showFurniture(item.model, parsed.hex, item.size)
    else studio.showAvatar({ ...MANNEQUIN, [item.kind]: item.id }, item.kind)
    studio.turn(item.kind === 'furniture' ? 0.55 : 0.35)
    studio.step(0.5, 1)
    renderer.render(studio.scene, studio.camera)
    const url = renderer.domElement.toDataURL('image/png')
    studio.clear()
    pictures.set(item.id, url)
    waiting.get(item.id)?.forEach(done => done(url))
    waiting.delete(item.id)
    busy = false
    drawNext()
  })
}

/** When the world closes: both renderers let go of their WebGL contexts (pictures already made are kept). */
export function releasePreviews () {
  live?.dispose()
  queue.length = 0
  waiting.clear()
  if (thumbs) {
    thumbs.studio.clear()
    thumbs.renderer.dispose()
    thumbs.renderer.forceContextLoss()
    thumbs = null
  }
}

/** A picture of an item for its card; calls back when it's ready (at once if it already is). */
export function picture (item, done) {
  if (pictures.has(item.id)) return done(pictures.get(item.id))
  if (!waiting.has(item.id)) {
    waiting.set(item.id, [])
    queue.push(item)
  }
  waiting.get(item.id).push(done)
  drawNext()
}
