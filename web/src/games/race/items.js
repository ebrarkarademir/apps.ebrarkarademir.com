import { locate, WALL, ROAD } from './track.js'
import { AXLE, CAR_R, CAR_LENGTH } from './car.js'

// Pickups and shells. Pickups lie about the road, one somewhere along each stretch of the lap,
// so there's always one coming up wherever a car is, the leader's or the last one's. A car that
// drives through one gets it, and a few seconds later another turns up somewhere else along
// that stretch, as whatever kind turns up then:
//   boost   a burst of speed, at once
//   shield  a bubble that takes the next shell instead of the car, for a while
//   shell   one shot, fired straight ahead; it bounces off the walls and spins out the car it hits
// With weapons off for a pure race, every pickup is a boost.
//
// A shell's path depends only on where it was fired from and how fast, so every screen flies
// it the same way, bounces and all.

export const PICKUP_KINDS = ['boost', 'shield', 'shell']
const ODDS = [['boost', 0.42], ['shell', 0.33], ['shield', 0.25]]
export const PICKUP_R = 1.5
export const PICKUP_COUNT = 12 // one along each twelfth of the lap
export const RESPAWN_MS = 6000 // a pickup comes back this long after it's taken
export const SHIELD_MS = 12000 // a shield lasts this long if nothing hits it
export const MAX_AMMO = 3 // shells a car can carry

export const SHELL_SPEED = 64 // units/s, plus some of the speed of the car that fires it
export const SHELL_R = 0.45
export const SHELL_LIFE = 4 // seconds
export const SHELL_BOUNCES = 2 // walls a shell bounces off; the next one breaks it
const SAFE_TIME = 0.25 // a shell can't hit the car that fired it this soon

const round4 = (value) => Math.round(value * 10000) / 10000

/** The kind for a pickup that's just turned up. */
export function pickKind (weapons = true, random = Math.random) {
  if (!weapons) return 'boost'
  let r = random()
  for (const [kind, odds] of ODDS) {
    r -= odds
    if (r < 0) return kind
  }
  return 'boost'
}

/**
 * Where pickup `id` lies: somewhere along its own stretch of the lap, anywhere across the road
 * but not up against its edge. Returns { s, d }, rounded so they travel well.
 */
export function pickupSpot (track, id, random = Math.random) {
  const stretch = track.length / PICKUP_COUNT
  const s = (id + 0.1 + random() * 0.8) * stretch
  const d = (random() * 2 - 1) * (ROAD - 1.8)
  return { s: Math.round(s * 10) / 10, d: Math.round(d * 10) / 10 }
}

/** Whether a car is driving through a pickup. */
export const touchesPickup = (car, pickup) => Math.hypot(car.x - pickup.x, car.y - pickup.y) < CAR_R + AXLE * 0.6 + PICKUP_R

/**
 * A shell leaving the front of a car: where from and its velocity, rounded so it's the same
 * when it reaches the other screens.
 */
export function fireShell (car) {
  const dx = Math.cos(car.a)
  const dy = Math.sin(car.a)
  const ahead = Math.max(0, car.vx * dx + car.vy * dy)
  const speed = SHELL_SPEED + ahead * 0.5
  return {
    x: round4(car.x + dx * (CAR_LENGTH / 2 + 0.6)),
    y: round4(car.y + dy * (CAR_LENGTH / 2 + 0.6)),
    vx: round4(dx * speed),
    vy: round4(dy * speed)
  }
}

/** A shell in flight, from a fired one: { x, y, vx, vy, age, bounces, hint }. */
export function newShell (shot, track) {
  return { x: shot.x, y: shot.y, vx: shot.vx, vy: shot.vy, age: 0, bounces: 0, hint: locate(track, shot.x, shot.y).i }
}

/** One step for a shell. Returns 'bounce', 'gone' (spent, or broken on a wall) or null. */
export function stepShell (shell, track, dt) {
  shell.age += dt
  if (shell.age >= SHELL_LIFE) return 'gone'
  shell.x += shell.vx * dt
  shell.y += shell.vy * dt
  const at = locate(track, shell.x, shell.y, shell.hint)
  shell.hint = at.i
  const over = Math.abs(at.d) - (WALL - SHELL_R)
  if (over <= 0) return null
  // Off the wall like a ball: the speed into it turns round
  const sign = Math.sign(at.d)
  const nx = at.nx * sign
  const ny = at.ny * sign
  const into = shell.vx * nx + shell.vy * ny
  if (into > 0) {
    shell.vx -= 2 * into * nx
    shell.vy -= 2 * into * ny
  }
  shell.x -= nx * over
  shell.y -= ny * over
  shell.bounces++
  return shell.bounces > SHELL_BOUNCES ? 'gone' : 'bounce'
}

/** Whether a shell is hitting a car (its owner only once it's clear of it). */
export function shellHits (shell, car, own = false) {
  if (own && shell.age < SAFE_TIME) return false
  const fx = Math.cos(car.a) * AXLE
  const fy = Math.sin(car.a) * AXLE
  const reach = CAR_R + SHELL_R
  return Math.hypot(shell.x - car.x - fx, shell.y - car.y - fy) < reach || Math.hypot(shell.x - car.x + fx, shell.y - car.y + fy) < reach
}
