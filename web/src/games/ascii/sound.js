// Retro sound effects for the ASCII arcade games, made on the fly with Web Audio so there are
// no files to load. Browsers only allow audio after a tap or key press, so games call unlock()
// on every input.

const MUTE_KEY = 'arcadeMuted'
const OLD_MUTE_KEY = 'flappyMuted' // where Flappy ASCII kept the setting before

let audio = null
let noise = null
let muted = (() => {
  try {
    return (localStorage.getItem(MUTE_KEY) ?? localStorage.getItem(OLD_MUTE_KEY)) === '1'
  } catch {
    return false
  }
})()

function tone (start, { type = 'square', from, to = from, duration, volume }) {
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, start)
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, start + duration)
  gain.gain.setValueAtTime(volume, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain).connect(audio.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

// A burst of filtered noise, for crashes and explosions
function thud (start, duration, volume, cutoff = 1400) {
  if (!noise) {
    noise = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.6), audio.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  const source = audio.createBufferSource()
  const filter = audio.createBiquadFilter()
  const gain = audio.createGain()
  source.buffer = noise
  filter.type = 'lowpass'
  filter.frequency.value = cutoff
  gain.gain.setValueAtTime(volume, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  source.connect(filter).connect(gain).connect(audio.destination)
  source.start(start)
  source.stop(start + duration)
}

const patches = {
  flap: (t) => tone(t, { from: 380, to: 760, duration: 0.08, volume: 0.035 }),
  score: (t) => {
    tone(t, { type: 'triangle', from: 988, duration: 0.07, volume: 0.07 })
    tone(t + 0.07, { type: 'triangle', from: 1480, duration: 0.12, volume: 0.07 })
  },
  hit: (t) => {
    thud(t, 0.16, 0.25)
    tone(t, { from: 160, to: 55, duration: 0.2, volume: 0.06 })
  },
  fall: (t) => tone(t + 0.2, { type: 'sine', from: 720, to: 160, duration: 0.45, volume: 0.05 }),
  tick: (t) => tone(t, { from: 660, duration: 0.09, volume: 0.04 }),
  go: (t) => tone(t, { from: 990, duration: 0.22, volume: 0.05 }),
  fire: (t) => {
    thud(t, 0.06, 0.12, 2400)
    tone(t, { from: 900, to: 180, duration: 0.09, volume: 0.045 })
  },
  bounce: (t) => tone(t, { type: 'triangle', from: 1300, to: 900, duration: 0.05, volume: 0.025 }),
  boom: (t) => {
    thud(t, 0.55, 0.35, 700)
    tone(t, { from: 110, to: 35, duration: 0.45, volume: 0.07 })
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
