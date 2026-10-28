// The third-person camera and the input that drives it. The camera orbits the player: drag
// to turn it, scroll or pinch to zoom, and while walking it swings back behind the player by
// itself. A press that doesn't drag is a click, for walking somewhere or picking something.
// W A S D and the arrow keys walk relative to where the camera looks.

const DRAG_PX = 6
const FOLLOW_AFTER_MS = 1500 // after the last drag, walking brings the camera back behind
const KEYS = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' }

const typing = (target) => !!target?.closest?.('input, textarea, select, [contenteditable="true"]')
const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle))

export function createControls (dom, { onClick }) {
  const held = new Set()
  const view = { yaw: Math.PI, pitch: 0.42, distance: 9, min: 3.2, max: 18, lastDrag: 0 }
  const pointers = new Map()
  let pinch = 0
  let enabled = true

  function onDown (event) {
    if (!enabled) return
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false })
    dom.setPointerCapture?.(event.pointerId)
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      pinch = Math.hypot(a.x - b.x, a.y - b.y)
    }
  }

  function onMove (event) {
    const p = pointers.get(event.pointerId)
    if (!p) return
    const dx = event.clientX - p.x
    const dy = event.clientY - p.y
    p.x = event.clientX
    p.y = event.clientY
    if (!p.moved && Math.hypot(p.x - p.startX, p.y - p.startY) > DRAG_PX) p.moved = true
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      const spread = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinch) zoom((pinch - spread) * 0.01)
      pinch = spread
      return
    }
    if (!p.moved) return
    view.yaw = wrap(view.yaw - dx * 0.008)
    view.pitch = Math.min(1.25, Math.max(0.12, view.pitch + dy * 0.005))
    view.lastDrag = performance.now()
  }

  function onUp (event) {
    const p = pointers.get(event.pointerId)
    if (!p) return
    pointers.delete(event.pointerId)
    if (pointers.size < 2) pinch = 0
    if (!p.moved && pointers.size === 0 && event.type === 'pointerup') onClick(event.clientX, event.clientY)
  }

  function zoom (amount) {
    view.distance = Math.min(view.max, Math.max(view.min, view.distance * (1 + amount)))
  }

  function onWheel (event) {
    if (!enabled) return
    event.preventDefault()
    zoom(Math.sign(event.deltaY) * Math.min(0.25, Math.abs(event.deltaY) * 0.0012))
  }

  function onKey (event) {
    const code = KEYS[event.code]
    if (!code) return
    if (event.type === 'keydown') {
      if (!enabled || typing(event.target) || event.ctrlKey || event.metaKey || event.altKey) return
      held.add(code)
      event.preventDefault()
    } else {
      held.delete(code)
    }
  }

  // Keys held when the window loses focus never see their keyup
  const onBlur = () => held.clear()

  dom.addEventListener('pointerdown', onDown)
  dom.addEventListener('pointermove', onMove)
  dom.addEventListener('pointerup', onUp)
  dom.addEventListener('pointercancel', onUp)
  dom.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKey)
  window.addEventListener('blur', onBlur)

  return {
    view,
    get enabled () {
      return enabled
    },
    set enabled (on) {
      enabled = on
      if (!on) {
        held.clear()
        pointers.clear()
      }
    },

    /** Which way the keys say to walk, on the ground, relative to the camera ({ x, z }, or null). */
    walkInput () {
      const forward = (held.has('f') ? 1 : 0) - (held.has('b') ? 1 : 0)
      const side = (held.has('r') ? 1 : 0) - (held.has('l') ? 1 : 0)
      if (!forward && !side) return null
      const fx = -Math.sin(view.yaw)
      const fz = -Math.cos(view.yaw)
      // Right of the way the camera looks
      const x = fx * forward - fz * side
      const z = fz * forward + fx * side
      const length = Math.hypot(x, z)
      return { x: x / length, z: z / length }
    },

    /** Puts the camera behind and above `target` (a Vector3), easing round behind `heading` while walking. */
    update (camera, target, dt, heading = null) {
      if (heading !== null && performance.now() - view.lastDrag > FOLLOW_AFTER_MS) {
        const behind = heading + Math.PI
        view.yaw = wrap(view.yaw + wrap(behind - view.yaw) * Math.min(1, dt * 1.6))
      }
      const flat = Math.cos(view.pitch) * view.distance
      camera.position.set(
        target.x + Math.sin(view.yaw) * flat,
        target.y + Math.sin(view.pitch) * view.distance,
        target.z + Math.cos(view.yaw) * flat
      )
      camera.lookAt(target)
    },

    dispose () {
      dom.removeEventListener('pointerdown', onDown)
      dom.removeEventListener('pointermove', onMove)
      dom.removeEventListener('pointerup', onUp)
      dom.removeEventListener('pointercancel', onUp)
      dom.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      window.removeEventListener('blur', onBlur)
    }
  }
}
