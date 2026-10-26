// Motion shared by the ASCII arcade games: characters flung about as particles, and springs for
// things that should settle into place with a little bounce. Units are each game's own.

/**
 * Moves particles on by dt seconds and drops the ones that have run out. A particle is
 * { ch, x, y, vx, vy, life, ttl, color }, plus any of:
 *   gravity  pulls it down, in units/s²
 *   drag     slows it, as a rate per second; with gravity it falls no faster than gravity/drag
 *   sway     drifts it from side to side at up to that many units/s, `swayRate` times a second
 *   spin     turns its `angle`, in radians/s
 *   trail    leaves that many fading sparks a second behind it
 *   onEnd    runs when its life is up, e.g. for a rocket to burst
 */
export function stepParticles (list, dt) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i]
    p.life -= dt
    if (p.life <= 0) {
      list.splice(i, 1)
      p.onEnd?.(p)
      continue
    }
    if (p.gravity) p.vy += p.gravity * dt
    if (p.drag) {
      const keep = Math.exp(-dt * p.drag)
      p.vx *= keep
      p.vy *= keep
    }
    p.x += p.vx * dt
    p.y += p.vy * dt
    if (p.sway) p.x += Math.sin((p.ttl - p.life) * (p.swayRate || 1) * Math.PI * 2 + (p.phase || 0)) * p.sway * dt
    if (p.spin) p.angle = (p.angle || 0) + p.spin * dt
    if (p.trail) {
      p.trailClock = (p.trailClock || 0) + dt
      for (; p.trailClock >= 1 / p.trail; p.trailClock -= 1 / p.trail) {
        list.push({ ch: p.trailChar || "'", x: p.x, y: p.y, vx: 0, vy: 0, life: 0.3, ttl: 0.3, color: p.trailColor || p.color })
      }
    }
  }
}

/**
 * Throws `count` particles out of (x, y) in every direction at up to `speed`, each living up
 * to `life` seconds. Characters and colors take turns from their lists, and anything else
 * (gravity, drag...) goes on every particle.
 */
export function burst (list, x, y, { chars, colors, count, speed, life, random = Math.random, ...rest }) {
  for (let i = 0; i < count; i++) {
    const angle = random() * Math.PI * 2
    const v = speed * (0.4 + random() * 0.6)
    list.push({
      ch: chars[i % chars.length],
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: life * (0.6 + random() * 0.4),
      ttl: life,
      color: colors[i % colors.length],
      ...rest
    })
  }
}

/**
 * Pulls a spring { value, velocity } toward `target`. Stiffness sets how quickly it gets there
 * and damping how much it overshoots: 2·√stiffness settles without overshooting, less than
 * that bounces. Meant for the fixed simulation step.
 */
export function stepSpring (spring, target, dt, stiffness = 400, damping = 2 * Math.sqrt(stiffness)) {
  spring.velocity += ((target - spring.value) * stiffness - spring.velocity * damping) * dt
  spring.value += spring.velocity * dt
}
