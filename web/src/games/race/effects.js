// Neon Laps' effects as particles, drawn the way Tank's are (see tank/glow.js). Shell hits,
// shields, muzzle flashes and pickups use Tank's own; these are the car's: tyre smoke, sparks
// off a wall, a boost's flame, and the ground thrown up off the road.

export { impact, muzzle, fizzle, shieldBreak, giftBurst, giftArrive, trail } from '../tank/effects.js'

export const BOOST_COLOR = '#ffb000'
const FIRE = ['#fff3b0', '#ffc24d', '#ff7a2a', '#ff4a1a']
const TAU = Math.PI * 2
const rand = (min, max) => min + Math.random() * (max - min)

/** Tyre smoke off a sliding wheel, thicker the faster it slides. */
export function tyreSmoke (list, x, y, slide, color = '#c8d0c8') {
  const life = rand(0.5, 0.9)
  const a = rand(0, TAU)
  const v = rand(0.3, 1.2)
  list.push({ kind: 'smoke', x: x + rand(-0.2, 0.2), y: y + rand(-0.2, 0.2), vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 1.5, size: 0.8, grow: 2.2, alpha: Math.min(0.4, 0.12 + slide * 0.015), color, life, ttl: life })
}

/** Sparks off a car scraping a wall, thrown back along the way it's going. */
export function scrape (list, x, y, vx, vy, hard) {
  const a = Math.atan2(vy, vx) + Math.PI
  const count = Math.min(14, 3 + Math.round(hard / 3))
  for (let i = 0; i < count; i++) {
    const dir = a + rand(-0.9, 0.9)
    const v = rand(6, 14 + hard * 0.4)
    const life = rand(0.12, 0.35)
    list.push({ kind: 'spark', x, y, vx: Math.cos(dir) * v, vy: Math.sin(dir) * v, drag: 5, color: i % 3 ? '#ffd27a' : '#ffffff', life, ttl: life })
  }
  if (hard > 10) list.push({ kind: 'flash', x, y, vx: 0, vy: 0, size: 2.5, color: '#fff2c0', life: 0.1, ttl: 0.1 })
}

/** Flame out of a boosting car's exhausts. */
export function boostFlame (list, x, y, a) {
  const back = a + Math.PI
  const life = rand(0.12, 0.24)
  const v = rand(6, 12)
  const dir = back + rand(-0.25, 0.25)
  list.push({ kind: 'fire', x, y, vx: Math.cos(dir) * v, vy: Math.sin(dir) * v, drag: 4, size: rand(0.7, 1.2), color: FIRE[Math.floor(Math.random() * 3)], life, ttl: life })
}

/** Grit (or snow) thrown up by a wheel off the road. */
export function spray (list, x, y, a, speed, color) {
  const back = a + Math.PI + rand(-0.6, 0.6)
  const v = rand(2, 4) + speed * 0.12
  const life = rand(0.25, 0.5)
  list.push({ kind: 'smoke', x, y, vx: Math.cos(back) * v, vy: Math.sin(back) * v, drag: 3, size: 0.5, grow: 1.6, alpha: 0.35, color, life, ttl: life })
  if (Math.random() < 0.5) list.push({ kind: 'chunk', x, y, vx: Math.cos(back) * v * 1.4, vy: Math.sin(back) * v * 1.4, drag: 3, size: 0.18, spin: 10, angle: rand(0, TAU), color, life: life * 0.8, ttl: life * 0.8 })
}

/** A car spinning out from a shell: a ring and stars thrown round. */
export function spinBurst (list, x, y, color) {
  list.push({ kind: 'ring', x, y, vx: 0, vy: 0, size: 1, grow: 12, color: '#ffe9a8', life: 0.35, ttl: 0.35 })
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU
    const v = rand(5, 10)
    const life = rand(0.35, 0.6)
    list.push({ kind: 'spark', x, y, vx: Math.cos(a + 0.8) * v, vy: Math.sin(a + 0.8) * v, drag: 3, color: i % 2 ? color : '#fff3b0', life, ttl: life })
  }
}

/** Bits of colored paper over a car that has just finished. */
export function confetti (list, x, y, colors) {
  for (let i = 0; i < 26; i++) {
    const a = rand(0, TAU)
    const v = rand(4, 16)
    const life = rand(0.8, 1.5)
    list.push({ kind: 'chunk', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 2.2, size: rand(0.25, 0.45), spin: 12, angle: rand(0, TAU), glow: true, color: colors[i % colors.length], life, ttl: life })
  }
}
