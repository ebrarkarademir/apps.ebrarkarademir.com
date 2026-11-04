// Crater Duel's effects in pixel art, as particles for stepParticles, in map cells. The
// renderer draws three kinds, each changing color as it ages (through `colors`, first to last):
//   puff  a round block of smoke that grows (r, grow: cells and cells a second)
//   disc  a round block of fire or light, the same but drawn over the smoke
//   bit   a square of `size` pixels: a spark, a clod of dirt, a drop of water

const TAU = Math.PI * 2
const rand = (min, max) => min + Math.random() * (max - min)
const pick = (list) => list[Math.floor(Math.random() * list.length)]

const BLAST = ['#ffffff', '#fff0a0', '#ffc040', '#ff8020', '#e04010', '#6a4a3a']
const FLAME = ['#fff0a0', '#ffc040', '#ff8020', '#e04010']
const SMOKE = ['#8a847c', '#a8a29a', '#c8c2ba', '#e4e0d8']
const SOOT = ['#5e5a54', '#46423e', '#34302c']
const SPARK = ['#ffffff', '#fff0a0', '#ffc040']

function burst (list, x, y, count, { speed: [lo, hi], from = 0, to = TAU, ...rest }) {
  for (let i = 0; i < count; i++) {
    const a = rand(from, to)
    const v = rand(lo, hi)
    const life = Array.isArray(rest.life) ? rand(rest.life[0], rest.life[1]) : rest.life
    list.push({ ...rest, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, ttl: life, colors: Array.isArray(rest.colors[0]) ? pick(rest.colors) : rest.colors })
  }
}

/** The bang at a gun as it fires along `angle` (up is positive): a flash, sparks, a puff. */
export function muzzle (list, x, y, angle) {
  const dx = Math.cos(angle)
  const dy = -Math.sin(angle)
  list.push({ kind: 'disc', x, y, vx: 0, vy: 0, r: 0.9, grow: -3, colors: ['#ffffff', '#fff0a0', '#ffc040'], life: 0.12, ttl: 0.12 })
  burst(list, x, y, 5, { kind: 'bit', speed: [10, 22], from: Math.atan2(dy, dx) - 0.4, to: Math.atan2(dy, dx) + 0.4, drag: 6, colors: SPARK, life: [0.1, 0.25] })
  list.push({ kind: 'puff', x: x + dx * 0.6, y: y + dy * 0.6, vx: dx * 2, vy: dy * 2 - 1, drag: 2, r: 0.5, grow: 1.4, colors: SMOKE, life: 0.6, ttl: 0.6 })
}

/**
 * A blast `r` cells across at (x, y), the classic way: a white flash, a ball of fire that
 * swells and burns down through yellow and orange to smoke, sparks, and the ground it blew away
 * (`dirt`, the cells removed, x0 y0 x1 y1 ...) flying out in `colors` and falling back.
 */
export function blast (list, x, y, r, dirt = [], colors = ['#b07440', '#8c5830', '#6c4024']) {
  list.push({ kind: 'disc', x, y, vx: 0, vy: 0, r: r * 0.9, grow: r * 1.2, colors: BLAST, life: 0.42, ttl: 0.42 })
  for (let i = 0; i < 4 + Math.round(r); i++) {
    const a = rand(0, TAU)
    const d = rand(0.3, 0.8) * r
    const life = rand(0.35, 0.7)
    list.push({ kind: 'disc', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2 - 2, drag: 2, r: rand(0.35, 0.6) * r, grow: r * 0.4, colors: BLAST.slice(1), life, ttl: life })
  }
  burst(list, x, y - r * 0.4, 4 + Math.round(r / 2), { kind: 'puff', speed: [2, 5], from: -Math.PI * 0.85, to: -Math.PI * 0.15, drag: 1.2, r: r * 0.2, grow: r * 0.12, colors: SMOKE, life: [0.7, 1.2] })
  burst(list, x, y, 10 + Math.round(r * 1.5), { kind: 'bit', speed: [10, 26 + r * 2], drag: 2, gravity: 30, colors: SPARK, life: [0.25, 0.55] })
  const step = 2 * Math.max(1, Math.floor(dirt.length / 2 / 45))
  for (let i = 0; i < dirt.length; i += step) {
    const cx = dirt[i] + 0.5
    const cy = dirt[i + 1] + 0.5
    const dx = cx - x
    const dy = cy - y
    const d = Math.hypot(dx, dy) || 1
    const life = rand(0.8, 1.4)
    list.push({ kind: 'bit', x: cx, y: cy, vx: (dx / d) * rand(8, 22), vy: (dy / d) * 6 - rand(12, 24), gravity: 48, drag: 0.4, size: Math.random() < 0.4 ? 2 : 1, colors: [pick(colors)], life, ttl: life })
  }
}

/** A unit hit: a white pop and a few sparks. */
export function hit (list, x, y) {
  list.push({ kind: 'disc', x, y, vx: 0, vy: 0, r: 0.8, grow: 2, colors: ['#ffffff', '#fff0a0'], life: 0.1, ttl: 0.1 })
  burst(list, x, y, 6, { kind: 'bit', speed: [6, 14], drag: 4, gravity: 20, colors: SPARK, life: [0.15, 0.35] })
}

/** A unit going down: a burst of its color, and a puff of smoke. */
export function knockOut (list, x, y, color) {
  burst(list, x, y, 14, { kind: 'bit', speed: [6, 16], drag: 3, gravity: 26, size: 1, colors: [color, '#ffffff'], life: [0.4, 0.8] })
  list.push({ kind: 'puff', x, y, vx: 0, vy: -1.5, drag: 1, r: 0.8, grow: 1.2, colors: SMOKE, life: 0.9, ttl: 0.9 })
}

/** Something falling into the sea: a column of drops. */
export function splash (list, x, y, colors = ['#e8f6ff', '#5aa6ef']) {
  burst(list, x, y, 14, { kind: 'bit', speed: [8, 20], from: -Math.PI * 0.8, to: -Math.PI * 0.2, gravity: 50, drag: 0.4, colors: [colors[0], colors[1]], life: [0.4, 0.8] })
}

/** A grenade knocking on the ground. */
export function knock (list, x, y) {
  burst(list, x, y, 3, { kind: 'bit', speed: [3, 8], from: -Math.PI, to: 0, drag: 5, gravity: 20, colors: SPARK, life: [0.1, 0.2] })
}

/** What a shot leaves behind it: a puff of smoke, or embers for fire. */
export function trail (list, x, y, kind) {
  if (kind === 'molotov' || kind === 'flame') {
    const life = rand(0.2, 0.4)
    list.push({ kind: 'bit', x: x + rand(-0.3, 0.3), y: y + rand(-0.3, 0.3), vx: rand(-1, 1), vy: rand(-4, -1), drag: 2, colors: FLAME, life, ttl: life })
    return
  }
  const life = rand(0.35, 0.55)
  list.push({ kind: 'puff', x, y, vx: 0, vy: -0.5, drag: 1, r: 0.25, grow: 0.5, colors: SMOKE, life, ttl: life })
}

/** A puff rising off a hurt unit; dark smoke and flames off one that's burning. */
export function hurtSmoke (list, x, y, wind, burning) {
  const life = rand(0.9, 1.5)
  list.push({ kind: 'puff', x: x + rand(-0.4, 0.4), y, vx: wind * 2 + rand(-0.4, 0.4), vy: -rand(2, 3), drag: 0.4, r: 0.3, grow: 0.5, colors: burning ? SOOT : SMOKE.slice(1), life, ttl: life })
  if (burning) {
    const flame = rand(0.2, 0.4)
    list.push({ kind: 'bit', x: x + rand(-0.5, 0.5), y: y + 1 + rand(-0.3, 0.3), vx: rand(-0.5, 0.5), vy: -rand(3, 5), drag: 2, size: 1, colors: FLAME, life: flame, ttl: flame })
  }
}
