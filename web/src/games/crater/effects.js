// Crater Duel's effects as particles for stepParticles, in map cells, drawn by Tank's glow
// (tank/glow.js, which has the kinds: flash, fire, smoke, spark, chunk, ring). Dirt that a
// blast throws up is a chunk in the ground's color that falls back down.

export const FIRE = ['#fff3b0', '#ffc24d', '#ff7a2a', '#ff4a1a']
const SMOKE = '#9aa69a'
const SOOT = '#3e463e'
const WATER = '#7fe6ff'
const TAU = Math.PI * 2

const rand = (min, max) => min + Math.random() * (max - min)
const pick = (list) => list[Math.floor(Math.random() * list.length)]

function spray (list, x, y, count, { from = 0, to = TAU, speed: [lo, hi], ...rest }) {
  for (let i = 0; i < count; i++) {
    const a = rand(from, to)
    const v = rand(lo, hi)
    const color = Array.isArray(rest.color) ? rest.color[i % rest.color.length] : rest.color
    const life = Array.isArray(rest.life) ? rand(rest.life[0], rest.life[1]) : rest.life
    const size = Array.isArray(rest.size) ? rand(rest.size[0], rest.size[1]) : rest.size
    list.push({ ...rest, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, color, life, ttl: life, size, angle: rand(0, TAU), spin: rest.spin ? rand(-rest.spin, rest.spin) : 0 })
  }
}

/** The flash and smoke at the end of a gun as it fires along `angle` (up is positive), in the side's color. */
export function muzzle (list, x, y, angle, color) {
  const dx = Math.cos(angle)
  const dy = -Math.sin(angle)
  const a = Math.atan2(dy, dx)
  list.push({ kind: 'flash', x, y, vx: 0, vy: 0, size: 4.2, color, life: 0.12, ttl: 0.12 })
  list.push({ kind: 'flash', x, y, vx: 0, vy: 0, size: 2.2, color: '#fff6dc', life: 0.07, ttl: 0.07 })
  list.push({ kind: 'fire', x: x + dx * 0.5, y: y + dy * 0.5, vx: dx * 9, vy: dy * 9, drag: 12, size: 1.5, color, life: 0.14, ttl: 0.14 })
  spray(list, x, y, 6, { kind: 'spark', from: a - 0.45, to: a + 0.45, speed: [14, 28], drag: 7, color: [color, '#ffffff'], life: [0.08, 0.2] })
  spray(list, x + dx * 0.5, y + dy * 0.5, 4, { kind: 'smoke', from: a - 0.9, to: a + 0.9, speed: [2, 6], drag: 2.5, size: 0.9, grow: 2.6, alpha: 0.32, color: SMOKE, life: [0.5, 0.9] })
}

/**
 * A blast `r` cells across at (x, y): light, a shock wave, a fireball, a column of smoke, sparks,
 * and the ground it blew away (`dirt`, the cells removed, x0 y0 x1 y1 ...) flying out in `ground`
 * colors and falling back.
 */
export function blast (list, x, y, r, dirt = [], ground = ['#2f6f2f', '#1f4f1f']) {
  const big = Math.max(1, r / 3)
  list.push({ kind: 'flash', x, y, vx: 0, vy: 0, size: r * 4.2, color: '#fff2c0', life: 0.24, ttl: 0.24 })
  list.push({ kind: 'ring', x, y, vx: 0, vy: 0, size: r * 0.3, grow: r * 7, color: '#ffd9a0', life: 0.38, ttl: 0.38 })
  list.push({ kind: 'ring', x, y, vx: 0, vy: 0, size: r * 0.2, grow: r * 3.6, color: '#ff9a50', life: 0.55, ttl: 0.55 })
  for (let i = 0; i < 6 + r * 1.5; i++) {
    const a = rand(0, TAU)
    const v = rand(1, 3 + r)
    const life = rand(0.4, 0.85)
    list.push({ kind: 'fire', x: x + rand(-r, r) * 0.35, y: y + rand(-r, r) * 0.35, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, drag: 3, size: rand(2, 3.6) * big, color: FIRE[i % FIRE.length], life, ttl: life })
  }
  spray(list, x, y - r * 0.3, 5 + r, { kind: 'smoke', from: -Math.PI * 0.85, to: -Math.PI * 0.15, speed: [2, 6], drag: 1.4, size: 1.4 * big, grow: 2.4 * big, alpha: 0.5, color: SOOT, life: [1.2, 2.2] })
  spray(list, x, y, 10 + r * 2, { kind: 'spark', speed: [12, 30 + r * 2], drag: 3.5, color: ['#ffe9a8', '#ffb347', '#ff7a2a'], life: [0.25, 0.55] })
  // The ground it blew away flies out, and falls back
  const step = 2 * Math.max(1, Math.floor(dirt.length / 2 / 40))
  for (let i = 0; i < dirt.length; i += step) {
    const cx = dirt[i] + 0.5
    const cy = dirt[i + 1] + 0.5
    const dx = cx - x
    const dy = cy - y
    const d = Math.hypot(dx, dy) || 1
    const life = rand(0.7, 1.3)
    list.push({ kind: 'chunk', x: cx, y: cy, vx: (dx / d) * rand(8, 22), vy: (dy / d) * 8 - rand(10, 22), gravity: 46, drag: 0.5, size: rand(0.45, 0.9), spin: rand(-10, 10), angle: rand(0, TAU), color: pick(ground), life, ttl: life })
  }
}

/** A unit hit: a white flash and a few sparks. */
export function hit (list, x, y, color) {
  list.push({ kind: 'flash', x, y, vx: 0, vy: 0, size: 3, color: '#ffffff', life: 0.12, ttl: 0.12 })
  spray(list, x, y, 7, { kind: 'spark', speed: [6, 16], drag: 5, color: ['#ffffff', color], life: [0.15, 0.35] })
}

/** A unit going down: its color bursting, and a puff of smoke. */
export function knockOut (list, x, y, color) {
  list.push({ kind: 'flash', x, y, vx: 0, vy: 0, size: 6, color, life: 0.25, ttl: 0.25 })
  list.push({ kind: 'ring', x, y, vx: 0, vy: 0, size: 0.5, grow: 12, color, life: 0.4, ttl: 0.4 })
  spray(list, x, y, 12, { kind: 'spark', speed: [6, 18], drag: 4, color: [color, '#ffffff'], life: [0.3, 0.6] })
  spray(list, x, y, 5, { kind: 'smoke', speed: [1, 3], drag: 1.5, size: 1, grow: 2, alpha: 0.45, color: SOOT, life: [0.9, 1.6] })
}

/** Something falling into the sea. */
export function splash (list, x, y, color = WATER) {
  list.push({ kind: 'ring', x, y, vx: 0, vy: 0, size: 0.4, grow: 7, color, life: 0.45, ttl: 0.45 })
  spray(list, x, y, 12, { kind: 'chunk', from: -Math.PI * 0.85, to: -Math.PI * 0.15, speed: [8, 20], gravity: 50, drag: 0.4, size: [0.3, 0.55], glow: true, color: [color, '#ffffff'], life: [0.4, 0.75] })
}

/** A grenade knocking on the ground. */
export function knock (list, x, y) {
  spray(list, x, y, 3, { kind: 'spark', from: -Math.PI, to: 0, speed: [3, 8], drag: 6, color: '#ffe9a8', life: [0.1, 0.2] })
}

/** What a shot leaves behind it in flight: smoke for most, embers for fire. */
export function trail (list, x, y, kind, color) {
  if (kind === 'molotov' || kind === 'flame') {
    const life = rand(0.2, 0.45)
    list.push({ kind: 'fire', x: x + rand(-0.3, 0.3), y: y + rand(-0.3, 0.3), vx: rand(-1, 1), vy: rand(-3, -1), drag: 2, size: rand(0.6, 1.1), color: pick(FIRE), life, ttl: life })
    return
  }
  const life = rand(0.35, 0.6)
  list.push({ kind: 'smoke', x, y, vx: rand(-0.5, 0.5), vy: rand(-0.8, 0), drag: 1, size: 0.5, grow: 1.6, alpha: 0.25, color: SMOKE, life, ttl: life })
  if (Math.random() < 0.5) list.push({ kind: 'fire', x, y, vx: 0, vy: 0, size: 0.7, color, life: 0.16, ttl: 0.16 })
}

/** A puff rising off a hurt unit; dark smoke and embers off one that's burning. */
export function hurtSmoke (list, x, y, wind, burning) {
  const life = rand(1, 1.7)
  list.push({ kind: 'smoke', x: x + rand(-0.5, 0.5), y, vx: wind * 2 + rand(-0.5, 0.5), vy: -rand(2, 3.5), drag: 0.5, size: 0.7, grow: burning ? 1.6 : 1.2, alpha: burning ? 0.5 : 0.28, color: burning ? SOOT : SMOKE, life, ttl: life })
  if (burning) {
    const flame = rand(0.25, 0.45)
    list.push({ kind: 'fire', x: x + rand(-0.6, 0.6), y: y + 1 + rand(-0.4, 0.4), vx: rand(-0.5, 0.5), vy: -rand(2, 4), drag: 2, size: rand(0.6, 1), color: pick(FIRE), life: flame, ttl: flame })
  }
}
