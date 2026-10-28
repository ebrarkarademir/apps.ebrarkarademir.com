// Name tags and speech bubbles: plain HTML laid over the canvas and moved to follow each
// avatar's head every frame, so the text stays sharp at any distance and in any script.
import * as THREE from 'three'

const BUBBLE_MS = 5000
const FAR = 38 // beyond this many meters tags fade out
const point = new THREE.Vector3()

export function createLabels (layer) {
  const labels = new Map() // id -> { root, name, level, bubble, anchor, timer }

  return {
    add (id, anchor, name, level, mine = false) {
      this.remove(id)
      const root = document.createElement('div')
      root.className = `tag${mine ? ' is-mine' : ''}`
      const bubble = document.createElement('div')
      bubble.className = 'bubble'
      const plate = document.createElement('div')
      plate.className = 'plate'
      const badge = document.createElement('span')
      badge.className = 'level'
      const label = document.createElement('span')
      label.className = 'name'
      label.textContent = name
      plate.append(badge, label)
      root.append(bubble, plate)
      layer.appendChild(root)
      const entry = { root, bubble, badge, anchor, timer: null }
      labels.set(id, entry)
      this.level(id, level)
    },

    level (id, level) {
      const entry = labels.get(id)
      if (entry) entry.badge.textContent = level
    },

    /** Shows a speech bubble over the avatar for a few seconds. */
    say (id, text) {
      const entry = labels.get(id)
      if (!entry) return
      entry.bubble.textContent = text
      entry.root.classList.add('is-talking')
      clearTimeout(entry.timer)
      entry.timer = setTimeout(() => entry.root.classList.remove('is-talking'), BUBBLE_MS)
    },

    remove (id) {
      const entry = labels.get(id)
      if (!entry) return
      clearTimeout(entry.timer)
      entry.root.remove()
      labels.delete(id)
    },

    clear () {
      for (const id of [...labels.keys()]) this.remove(id)
    },

    /** Moves every label over its avatar's head. */
    update (camera, width, height) {
      for (const entry of labels.values()) {
        entry.anchor.getWorldPosition(point)
        const distance = point.distanceTo(camera.position)
        point.project(camera)
        const hidden = point.z > 1 || distance > FAR + 6
        entry.root.style.visibility = hidden ? 'hidden' : 'visible'
        if (hidden) continue
        const x = (point.x * 0.5 + 0.5) * width
        const y = (-point.y * 0.5 + 0.5) * height
        // Farther tags get smaller, so a crowd stays readable
        const scale = Math.min(1, Math.max(0.62, 1.25 - distance / 40))
        entry.root.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%) scale(${scale.toFixed(2)})`
        entry.root.style.opacity = distance > FAR ? Math.max(0, 1 - (distance - FAR) / 6).toFixed(2) : '1'
        // Nearer labels on top
        entry.root.style.zIndex = String(1000 - Math.round(distance * 10))
      }
    }
  }
}
