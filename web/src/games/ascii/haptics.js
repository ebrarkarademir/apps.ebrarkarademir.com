// Vibration for the ASCII arcade games, on phones that can (Android browsers; iPhones and
// computers can't). Like the sound it can be switched off, and the choice is remembered.

const KEY = 'arcadeHaptics'

// Patterns in milliseconds: buzz, pause, buzz, ...
const PATTERNS = {
  tap: 8,
  tick: 4,
  hit: 45,
  crash: 70,
  boom: [70, 40, 120],
  wrong: [35, 45, 90],
  combo: [12, 40, 12],
  stamp: 55,
  win: [30, 60, 30, 60, 160],
  over: [90, 60, 90, 60, 260]
}

const supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

let on = (() => {
  try {
    return localStorage.getItem(KEY) !== '0'
  } catch {
    return true
  }
})()

export const haptics = {
  supported,
  get on () {
    return on
  },
  setOn (value) {
    on = value
    try {
      localStorage.setItem(KEY, value ? '1' : '0')
    } catch {
      // Remembering the setting is a convenience only
    }
  },
  buzz (name) {
    if (!supported || !on || document.hidden) return
    try {
      navigator.vibrate(PATTERNS[name] ?? name)
    } catch {
      // Some browsers refuse until the page has been tapped
    }
  }
}
