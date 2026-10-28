// The world's sounds: soft, round chimes made on the fly with Web Audio, gentler than the
// arcade's beeps. Browsers only allow audio after a tap or key press, so the world calls
// unlock() on input.

const MUTE_KEY = 'worldMuted'

let audio = null
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
})()

function note (start, { type = 'sine', from, to = from, duration, volume, attack = 0.008 }) {
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, start)
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, start + duration * 0.6)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain).connect(audio.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

// A note with a quiet octave above it, which makes it sound like a little bell
const chime = (start, frequency, duration = 0.3, volume = 0.06) => {
  note(start, { from: frequency, duration, volume })
  note(start, { from: frequency * 2, duration: duration * 0.6, volume: volume * 0.25 })
}

const C6 = 1046.5
const E6 = 1318.51
const G6 = 1567.98
const C7 = 2093

const patches = {
  // A soft bubble pop for buttons
  click: (t) => note(t, { from: 520, to: 880, duration: 0.07, volume: 0.07 }),
  open: (t) => {
    note(t, { type: 'triangle', from: 660, duration: 0.08, volume: 0.045 })
    note(t + 0.06, { type: 'triangle', from: 990, duration: 0.12, volume: 0.045 })
  },
  close: (t) => {
    note(t, { type: 'triangle', from: 880, duration: 0.07, volume: 0.035 })
    note(t + 0.05, { type: 'triangle', from: 620, duration: 0.1, volume: 0.035 })
  },
  // Someone said something
  blip: (t) => note(t, { from: 900, to: 1250, duration: 0.09, volume: 0.035 }),
  coin: (t) => {
    chime(t, 987.77, 0.1, 0.05)
    chime(t + 0.08, E6, 0.35, 0.05)
  },
  // Bought something: a sparkle running up
  buy: (t) => [C6, E6, G6, C7].forEach((f, i) => chime(t + i * 0.06, f, 0.32, 0.045)),
  levelUp: (t) => {
    ;[523.25, 659.25, 783.99].forEach((f, i) => chime(t + i * 0.11, f, 0.25, 0.06))
    chime(t + 0.33, C6, 0.8, 0.07)
    note(t + 0.33, { type: 'triangle', from: 523.25, duration: 0.8, volume: 0.03 })
  },
  // A friend request or an invite
  notify: (t) => {
    chime(t, G6, 0.25, 0.04)
    chime(t + 0.14, E6, 0.45, 0.04)
  },
  // Furniture set down
  place: (t) => {
    note(t, { from: 240, to: 150, duration: 0.14, volume: 0.09 })
    note(t + 0.02, { type: 'triangle', from: 1200, duration: 0.05, volume: 0.015 })
  },
  // Can't do that
  nope: (t) => {
    note(t, { type: 'triangle', from: 330, to: 260, duration: 0.12, volume: 0.05 })
    note(t + 0.1, { type: 'triangle', from: 260, to: 200, duration: 0.16, volume: 0.05 })
  }
}

export const sound = {
  get muted () {
    return muted
  },
  setMuted (value) {
    muted = value
    try {
      localStorage.setItem(MUTE_KEY, value ? '1' : '0')
    } catch {
      // Remembering the setting is a convenience only
    }
  },
  unlock () {
    if (!audio) {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      audio = new AudioContext()
    }
    if (audio.state === 'suspended') audio.resume().catch(() => {})
  },
  play (name) {
    if (muted || !audio || audio.state !== 'running') return
    patches[name]?.(audio.currentTime)
  }
}
