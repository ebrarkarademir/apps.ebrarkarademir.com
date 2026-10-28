// Retro sound effects for the ASCII arcade games, made on the fly with Web Audio so there are
// no files to load. Browsers only allow audio after a tap or key press, so games call unlock()
// on every input.

const MUTE_KEY = 'arcadeMuted'
const OLD_MUTE_KEY = 'flappyMuted' // where Flappy ASCII kept the setting before

// Hirajōshi, the scale a koto is often tuned to: D E F A B♭, from D4 up past two octaves
const KOTO = [293.66, 329.63, 349.23, 440, 466.16, 587.33, 659.26, 698.46, 880, 932.33, 1174.66, 1318.51, 1396.91, 1760]

let audio = null
let noise = null
const strings = new Map() // frequency -> the sound of that koto string
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

/**
 * Filtered noise, for crashes, explosions and thunder. `to` sweeps the filter, `attack` fades
 * it in instead of starting at full volume.
 */
function hiss (start, { duration, volume, type = 'lowpass', frequency = 1400, to = frequency, attack = 0 }) {
  if (!noise) {
    noise = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.6), audio.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  const source = audio.createBufferSource()
  const filter = audio.createBiquadFilter()
  const gain = audio.createGain()
  source.buffer = noise
  source.loop = duration > 0.6
  filter.type = type
  filter.frequency.setValueAtTime(frequency, start)
  if (to !== frequency) filter.frequency.exponentialRampToValueAtTime(to, start + duration)
  if (attack) {
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(volume, start + attack)
  } else {
    gain.gain.setValueAtTime(volume, start)
  }
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  source.connect(filter).connect(gain).connect(audio.destination)
  source.start(start)
  source.stop(start + duration)
}

// A burst of filtered noise, for crashes and explosions
const thud = (start, duration, volume, cutoff = 1400) => hiss(start, { duration, volume, frequency: cutoff })

// Karplus–Strong: a burst of noise sent round a loop one period long, smoothed a little on every
// pass, rings like a plucked string. Higher strings lose less per pass, so all ring about as long.
function koto (start, frequency, volume) {
  let buffer = strings.get(frequency)
  if (!buffer) {
    const rate = audio.sampleRate
    const length = Math.floor(rate * 1.6)
    buffer = audio.createBuffer(1, length, rate)
    const data = buffer.getChannelData(0)
    const period = Math.max(2, Math.round(rate / frequency))
    const keep = 0.5 * Math.pow(0.03, 1 / frequency)
    for (let i = 0; i < period; i++) data[i] = Math.random() * 2 - 1
    for (let i = period; i < length; i++) data[i] = keep * (data[i - period] + data[i - period + 1])
    const fade = Math.floor(rate * 0.2)
    for (let i = 0; i < fade; i++) data[length - 1 - i] *= i / fade
    strings.set(frequency, buffer)
  }
  const source = audio.createBufferSource()
  const gain = audio.createGain()
  source.buffer = buffer
  gain.gain.value = volume
  source.connect(gain).connect(audio.destination)
  source.start(start)
}

const string = (n) => KOTO[Math.max(0, Math.min(KOTO.length - 1, Math.round(n)))]

// A pea whistle: a high note the pea inside makes warble many times a second
function trill (start, { duration, volume, base = 2650, depth = 170, rate = 27 }) {
  const osc = audio.createOscillator()
  const wobble = audio.createOscillator()
  const depthGain = audio.createGain()
  const gain = audio.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(base, start)
  wobble.frequency.setValueAtTime(rate, start)
  depthGain.gain.setValueAtTime(depth, start)
  wobble.connect(depthGain).connect(osc.frequency)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02)
  gain.gain.setValueAtTime(volume, start + duration - 0.06)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain).connect(audio.destination)
  osc.start(start)
  wobble.start(start)
  osc.stop(start + duration + 0.02)
  wobble.stop(start + duration + 0.02)
}

// A temple bowl: a few out-of-tune partials, the high ones dying first
function bell (start, base, volume) {
  ;[[1, 1, 2.8], [2.76, 0.45, 1.6], [5.4, 0.25, 0.9], [8.93, 0.12, 0.5]].forEach(([ratio, level, decay]) => {
    tone(start, { type: 'sine', from: base * ratio, duration: decay, volume: volume * level })
  })
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
  },
  // A koto string, numbered up the scale from 0
  koto: (t, n = 0) => koto(t, string(n), 0.16),
  // `count` strings swept upward from string `from`
  strum: (t, from = 0, count = 5, gap = 0.05) => {
    for (let i = 0; i < count; i++) koto(t + i * gap, string(from + i), 0.11)
  },
  // A wooden clack, for pencil marks
  tock: (t) => {
    tone(t, { type: 'triangle', from: 1250, to: 950, duration: 0.05, volume: 0.05 })
    hiss(t, { duration: 0.02, volume: 0.03, type: 'highpass', frequency: 3000 })
  },
  // The crack of the strike, then the rumble rolling away
  thunder: (t) => {
    hiss(t, { duration: 0.12, volume: 0.22, type: 'highpass', frequency: 1800 })
    hiss(t + 0.03, { duration: 0.3, volume: 0.16, type: 'bandpass', frequency: 700 })
    hiss(t + 0.05, { duration: 1.6, volume: 0.42, frequency: 520, to: 90, attack: 0.1 })
    tone(t, { type: 'sine', from: 72, to: 30, duration: 1.1, volume: 0.12 })
  },
  taiko: (t) => {
    tone(t, { type: 'sine', from: 150, to: 52, duration: 0.42, volume: 0.3 })
    thud(t, 0.07, 0.22, 700)
  },
  rin: (t) => bell(t, 987.77, 0.05),
  launch: (t) => tone(t, { type: 'sine', from: 420, to: 1500, duration: 0.8, volume: 0.016 }),
  // A shell bursting, then its sparks crackling
  pop: (t) => {
    thud(t, 0.4, 0.26, 900)
    for (let i = 0; i < 9; i++) hiss(t + 0.18 + Math.random() * 0.6, { duration: 0.025, volume: 0.04 + Math.random() * 0.04, type: 'highpass', frequency: 2600 })
  },
  // Data scrambling and settling, for a hint
  glitch: (t) => {
    for (let i = 0; i < 7; i++) tone(t + i * 0.045, { from: 1400 + Math.random() * 1800, duration: 0.03, volume: 0.018 })
  },
  // A boot on the ball: a thump, harder and brighter the harder the kick
  kick: (t, power = 0.5) => {
    thud(t, 0.06, 0.08 + power * 0.16, 700 + power * 1300)
    tone(t, { type: 'sine', from: 150 + power * 90, to: 60, duration: 0.08, volume: 0.05 + power * 0.06 })
  },
  // The ball off a post: a short ring of metal
  post: (t) => {
    ;[[1, 0.05, 0.4], [2.76, 0.025, 0.3], [5.4, 0.015, 0.2]].forEach(([ratio, volume, duration]) => {
      tone(t, { type: 'triangle', from: 740 * ratio, duration, volume })
    })
    thud(t, 0.03, 0.1, 3200)
  },
  // The referee: a short blast, or a long one for full time
  whistle: (t, long = false) => trill(t, { duration: long ? 0.85 : 0.3, volume: 0.045 }),
  // A goal: the crowd roars up and fades
  cheer: (t) => {
    hiss(t, { duration: 2.2, volume: 0.2, type: 'bandpass', frequency: 1100, to: 700, attack: 0.18 })
    hiss(t + 0.05, { duration: 1.8, volume: 0.1, type: 'bandpass', frequency: 2400, to: 1500, attack: 0.25 })
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
  // Extra arguments go to the patch, e.g. play('koto', 4) for the fifth string
  play (name, ...args) {
    if (muted || !audio || audio.state !== 'running') return
    patches[name]?.(audio.currentTime, ...args)
  }
}
