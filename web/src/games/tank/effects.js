import { TANK_R, PAD_R, GIFT_R } from './engine'

// Tank's effects as particles for stepParticles, in arena units. Each has a `kind` that says
// how the renderer draws it:
//   flash  a burst of light that fades fast
//   fire   a glowing blob that shrinks as it burns out
//   smoke  a soft puff that grows and fades (alpha: how thick it starts)
//   spark  a bright streak along the way it flies
//   chunk  a turning scrap of metal
//   ring   a circle that grows (or shrinks, with a negative grow) and fades
// size is in units, grow in units per second.

export const SHIELD_COLOR = '#7fe6ff'
export const PAD_COLOR = '#d68cff'
export const FIRE = ['#fff3b0', '#ffc24d', '#ff7a2a', '#ff4a1a']
const SMOKE = '#9aa69a'
const SOOT = '#4a544a'
const TAU = Math.PI * 2

const rand = (min, max) => min + Math.random() * (max - min)

function spray (list, x, y, count, { from = 0, to = TAU, speed: [lo, hi], ...rest }) {
  for (let i = 0; i < count; i++) {
    const a = rand(from, to)
    const v = rand(lo, hi)
    const color = Array.isArray(rest.color) ? rest.color[i % rest.color.length] : rest.color
    const life = Array.isArray(rest.life) ? rand(rest.life[0], rest.life[1]) : rest.life
    list.push({ ...rest, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, color, life, ttl: life, angle: rand(0, TAU), spin: rest.spin ? rand(-rest.spin, rest.spin) : 0 })
  }
}

/** The flash, sparks and smoke at the end of a barrel as it fires along (dx, dy). */
export function muzzle (list, x, y, dx, dy, power = false) {
  const a = Math.atan2(dy, dx)
  list.push({ kind: 'flash', x, y, vx: 0, vy: 0, size: power ? 4.4 : 3, color: power ? '#ff9a50' : '#fff0b8', life: 0.09, ttl: 0.09 })
  list.push({ kind: 'fire', x: x + dx * 0.5, y: y + dy * 0.5, vx: dx * 8, vy: dy * 8, drag: 12, size: power ? 2 : 1.3, color: power ? '#ff8a3d' : '#ffd27a', life: 0.13, ttl: 0.13 })
  spray(list, x, y, power ? 9 : 5, { kind: 'spark', from: a - 0.45, to: a + 0.45, speed: [14, power ? 34 : 26], drag: 7, color: ['#ffe9a8', '#ffb347'], life: [0.08, 0.2] })
  spray(list, x + dx * 0.4, y + dy * 0.4, 3, { kind: 'smoke', from: a - 0.9, to: a + 0.9, speed: [2, 6], drag: 2.5, size: 0.7, grow: 2.4, alpha: 0.3, color: SMOKE, life: [0.45, 0.8] })
}

/** A shell striking a tank: light, sparks, scraps and a little smoke. */
export function impact (list, x, y, color = '#ffd27a') {
  list.push({ kind: 'flash', x, y, vx: 0, vy: 0, size: 4, color: '#fff6d0', life: 0.12, ttl: 0.12 })
  list.push({ kind: 'ring', x, y, vx: 0, vy: 0, size: 0.4, grow: 13, color: '#ffe0a0', life: 0.24, ttl: 0.24 })
  spray(list, x, y, 12, { kind: 'spark', speed: [8, 24], drag: 5, color: ['#ffd27a', '#fff3b0', color], life: [0.15, 0.4] })
  spray(list, x, y, 4, { kind: 'chunk', speed: [6, 13], drag: 4, size: 0.3, spin: 14, color: '#2c332c', life: [0.5, 0.9] })
  spray(list, x, y, 3, { kind: 'smoke', speed: [1, 3], drag: 2, size: 0.9, grow: 2.2, alpha: 0.35, color: SMOKE, life: [0.6, 1] })
}

/** A small burst where a shell breaks on a wall or runs out. */
export function fizzle (list, x, y, color) {
  spray(list, x, y, 5, { kind: 'spark', speed: [4, 10], drag: 6, color: [color, '#ffe9a8'], life: [0.12, 0.3] })
  list.push({ kind: 'flash', x, y, vx: 0, vy: 0, size: 1.6, color, life: 0.1, ttl: 0.1 })
}

/** A tank going up: a fireball, a shock wave, flying scraps and a column of smoke. */
export function explosion (list, x, y, color) {
  list.push({ kind: 'flash', x, y, vx: 0, vy: 0, size: 11, color: '#fff2c0', life: 0.22, ttl: 0.22 })
  list.push({ kind: 'ring', x, y, vx: 0, vy: 0, size: 0.8, grow: 30, color: '#ffd9a0', life: 0.42, ttl: 0.42 })
  list.push({ kind: 'ring', x, y, vx: 0, vy: 0, size: 0.5, grow: 15, color: '#ff9a50', life: 0.6, ttl: 0.6 })
  for (let i = 0; i < 11; i++) {
    const a = rand(0, TAU)
    const v = rand(1, 7)
    const life = rand(0.45, 0.95)
    list.push({ kind: 'fire', x: x + rand(-1, 1), y: y + rand(-1, 1), vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 3, size: rand(1.8, 3.2), color: FIRE[i % FIRE.length], life, ttl: life })
  }
  spray(list, x, y, 12, { kind: 'smoke', speed: [1, 5], drag: 1.6, size: 1.6, grow: 3.2, alpha: 0.55, color: SOOT, life: [1.2, 2.4] })
  spray(list, x, y, 22, { kind: 'spark', speed: [12, 36], drag: 3.5, color: ['#ffe9a8', '#ffb347', '#ff7a2a'], life: [0.3, 0.65] })
  spray(list, x, y, 12, { kind: 'chunk', speed: [8, 22], drag: 2.5, size: 0.45, spin: 10, color: [color, '#1e231e', '#2c332c'], life: [0.8, 1.4] })
}

/** A shield taking a hit for its tank and shattering. */
export function shieldBreak (list, x, y) {
  const r = TANK_R + 1.2
  list.push({ kind: 'flash', x, y, vx: 0, vy: 0, size: 7, color: SHIELD_COLOR, life: 0.16, ttl: 0.16 })
  list.push({ kind: 'ring', x, y, vx: 0, vy: 0, size: r, grow: 11, color: SHIELD_COLOR, life: 0.36, ttl: 0.36 })
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + rand(-0.2, 0.2)
    const v = rand(7, 15)
    const life = rand(0.4, 0.7)
    list.push({ kind: 'chunk', x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 4, size: rand(0.3, 0.55), spin: rand(-12, 12), angle: a, color: SHIELD_COLOR, glow: true, life, ttl: life })
  }
  spray(list, x, y, 8, { kind: 'spark', speed: [8, 18], drag: 5, color: [SHIELD_COLOR, '#ffffff'], life: [0.15, 0.35] })
}

/** A puff of smoke rising off a damaged tank; dark ones off a burning one. */
export function smokePuff (list, x, y, { dark = false, size = 0.8 } = {}) {
  const a = rand(0, TAU)
  const v = rand(0.4, 1.4)
  const life = rand(0.9, 1.6)
  list.push({ kind: 'smoke', x: x + rand(-0.4, 0.4), y: y + rand(-0.4, 0.4), vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.8, size, grow: dark ? 2 : 1.6, alpha: dark ? 0.5 : 0.28, color: dark ? SOOT : SMOKE, life, ttl: life })
}

/** An ember thrown off a fire. */
export function ember (list, x, y) {
  const a = rand(0, TAU)
  const v = rand(1, 4)
  const life = rand(0.3, 0.7)
  list.push({ kind: 'fire', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 2, size: rand(0.3, 0.6), color: FIRE[1 + Math.floor(Math.random() * 3)], life, ttl: life })
}

/** A gift popping as a shell hits it. */
export function giftBurst (list, x, y, color) {
  list.push({ kind: 'flash', x, y, vx: 0, vy: 0, size: 6, color, life: 0.18, ttl: 0.18 })
  list.push({ kind: 'ring', x, y, vx: 0, vy: 0, size: 0.5, grow: 15, color, life: 0.35, ttl: 0.35 })
  list.push({ kind: 'ring', x, y, vx: 0, vy: 0, size: GIFT_R, grow: 4, color: '#ffffff', life: 0.45, ttl: 0.45 })
  spray(list, x, y, 16, { kind: 'spark', speed: [8, 22], drag: 4, color: [color, '#ffffff'], life: [0.25, 0.55] })
}

/** A gift arriving: a ring closing in on its place. */
export function giftArrive (list, x, y, color) {
  list.push({ kind: 'ring', x, y, vx: 0, vy: 0, size: 7, grow: -15, color, life: 0.35, ttl: 0.35 })
  list.push({ kind: 'flash', x, y, vx: 0, vy: 0, size: 4.5, color, life: 0.3, ttl: 0.3 })
}

/** A tank leaving or reaching a teleporter. */
export function warp (list, x, y) {
  list.push({ kind: 'flash', x, y, vx: 0, vy: 0, size: 8, color: PAD_COLOR, life: 0.3, ttl: 0.3 })
  list.push({ kind: 'flash', x, y, vx: 0, vy: 0, size: 3.5, color: '#ffffff', life: 0.15, ttl: 0.15 })
  list.push({ kind: 'ring', x, y, vx: 0, vy: 0, size: 0.6, grow: 16, color: PAD_COLOR, life: 0.45, ttl: 0.45 })
  list.push({ kind: 'ring', x, y, vx: 0, vy: 0, size: PAD_R + 2.5, grow: -9, color: '#f0d0ff', life: 0.3, ttl: 0.3 })
  // Sparks thrown round in a swirl
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU
    const v = rand(6, 14)
    const life = rand(0.3, 0.6)
    list.push({ kind: 'spark', x: x + Math.cos(a) * 0.8, y: y + Math.sin(a) * 0.8, vx: Math.cos(a + 1.1) * v, vy: Math.sin(a + 1.1) * v, drag: 4, color: i % 2 ? PAD_COLOR : '#ffffff', life, ttl: life })
  }
}

/** A mote drawn in to the middle of a teleporter that's charging. */
export function charge (list, x, y) {
  const a = rand(0, TAU)
  const r = PAD_R + rand(0, 1)
  const life = rand(0.3, 0.45)
  list.push({ kind: 'spark', x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: -Math.cos(a) * (r / life), vy: -Math.sin(a) * (r / life), color: PAD_COLOR, life, ttl: life })
}
