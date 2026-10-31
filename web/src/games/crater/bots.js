import { W, H } from './terrain'
import { GRAVITY, WIND_MAX, WEAPONS, launch } from './physics'

// Bots for Crater Duel. Only the host plays one: when its turn comes it picks one of its units
// and an enemy to aim at, then tries a spread of angles and powers, flying each shot through
// this turn's wind over the real ground, and keeps the one that lands nearest the enemy and
// furthest from its own side. Weaker bots shake their aim before firing.

export const LEVELS = {
  easy: { shake: 0.13, power: 0.12, think: [2.5, 5], special: 0.15 },
  normal: { shake: 0.05, power: 0.05, think: [1.8, 4], special: 0.35 },
  hard: { shake: 0.012, power: 0.012, think: [1.2, 3], special: 0.5 }
}

const DT = 1 / 30
const MAX_FLIGHT = 7 // seconds
const UNIT_HIT = 1.4
const ANGLES = 56
const POWERS = 22

const rand = (min, max) => min + Math.random() * (max - min)
const pick = (list) => list[Math.floor(Math.random() * list.length)]

/** How long a bot waits before it fires, in ms: a person needs a moment too. */
export const thinkTime = (level) => {
  const [min, max] = (LEVELS[level] || LEVELS.normal).think
  return rand(min, max) * 1000
}

// Where a shot comes down: the first ground, sea or unit in its way
function flight (ground, units, shooter, x, y, angle, power, weapon, wind, water) {
  const shot = launch(x, y, angle, power, weapon)
  const drift = wind * WIND_MAX * (weapon === 'grenade' || weapon === 'dynamite' ? 0.6 : 1)
  let { x: px, y: py, vx, vy } = shot
  for (let t = 0; t < MAX_FLIGHT; t += DT) {
    vx += drift * DT
    vy += GRAVITY * DT
    px += vx * DT
    py += vy * DT
    if (py >= water) return { x: px, y: water, wet: true }
    if (px < -12 || px > W + 12 || py > H + 4) return null
    if (ground.solid(px, py)) return { x: px, y: py }
    for (let i = 0; i < units.length; i++) {
      const u = units[i]
      if (!u.alive || (i === shooter && t < 0.25)) continue
      if (Math.hypot(u.x - px, u.y - 1 - py) < UNIT_HIT) return { x: px, y: py }
    }
  }
  return null
}

/**
 * A bot side's shot this turn: { unit, x, y, angle, power, weapon }, or null with nothing to
 * fire with. `ammo` is what's left of the side's limited weapons.
 */
export function planShot ({ ground, units, side, wind, water, ammo, level = 'normal' }) {
  const skill = LEVELS[level] || LEVELS.normal
  const mine = units.map((u, i) => (u.side === side && u.alive ? i : -1)).filter(i => i >= 0)
  const enemies = units.map((u, i) => (u.side !== side && u.alive ? i : -1)).filter(i => i >= 0)
  if (!mine.length || !enemies.length) return null

  // The closest pair of one of its units and an enemy; a weak enemy nearby is worth a little more
  let best = null
  for (const m of mine) {
    for (const e of enemies) {
      const d = Math.abs(units[m].x - units[e].x) + Math.abs(units[m].y - units[e].y) * 0.5 - (100 - units[e].hp) * 0.08
      if (!best || d < best.d) best = { m, e, d }
    }
  }
  const shooter = units[best.m]
  const target = units[best.e]
  const dist = Math.hypot(target.x - shooter.x, target.y - shooter.y)

  const stock = (id) => (WEAPONS[id].ammo ? ammo?.[id] || 0 : Infinity)
  let weapon = 'shell'
  const friendsNear = mine.some(i => i !== best.m && Math.abs(units[i].x - target.x) < 14)
  if (dist < 24 && stock('dynamite') > 0 && !friendsNear && Math.random() < skill.special) weapon = 'dynamite'
  else if (Math.random() < skill.special) {
    const extras = ['grenade', 'cluster', 'molotov'].filter(id => stock(id) > 0)
    if (extras.length) weapon = pick(extras)
  }

  const reach = WEAPONS[weapon].radius + 3
  const aimX = target.x
  const aimY = target.y - 1
  let choice = null
  for (let a = 0; a < ANGLES; a++) {
    const angle = 0.12 + (a / (ANGLES - 1)) * (Math.PI - 0.24)
    for (let p = 0; p < POWERS; p++) {
      const power = 0.12 + (p / (POWERS - 1)) * 0.88
      const hit = flight(ground, units, best.m, shooter.x, shooter.y, angle, power, weapon, wind, water)
      if (!hit) continue
      let score = Math.hypot(hit.x - aimX, hit.y - aimY)
      if (hit.wet) score += 20
      // Its own units near where it lands: a shot to stay well away from
      for (const i of mine) {
        const d = Math.hypot(units[i].x - hit.x, units[i].y - 1 - hit.y)
        if (d < reach) score += (reach - d) * 12
      }
      // Other enemies caught in it too: all the better
      for (const i of enemies) {
        if (i === best.e) continue
        const d = Math.hypot(units[i].x - hit.x, units[i].y - 1 - hit.y)
        if (d < reach) score -= (reach - d) * 0.6
      }
      if (!choice || score < choice.score) choice = { angle, power, score }
    }
  }
  // Nothing comes down anywhere useful: lob one high towards the enemy
  if (!choice) choice = { angle: target.x >= shooter.x ? 1.05 : Math.PI - 1.05, power: 0.7 }

  return {
    unit: best.m,
    x: shooter.x,
    y: shooter.y,
    angle: choice.angle + rand(-1, 1) * skill.shake,
    power: Math.max(0.05, Math.min(1, choice.power + rand(-1, 1) * skill.power)),
    weapon
  }
}
