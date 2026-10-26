// The game loop shared by the ASCII arcade games. The simulation moves in fixed steps, so it
// plays the same at any frame rate, and the screen is drawn once per refresh in between.

/**
 * Starts the loop and returns a function that stops it. Every screen refresh runs before(dt),
 * then tick() once for each `step` seconds that have passed, then after(dt), then draw(alpha),
 * where alpha is how far the game is into its next step, for smooth drawing between steps.
 * While paused() is true only draw runs. A long gap, such as a hidden tab, counts as a tenth
 * of a second instead of fast-forwarding the game.
 */
export function startLoop ({ step, tick, draw, before, after, paused = () => false }) {
  let raf = 0
  let last = performance.now()
  let acc = 0
  let alpha = 0
  const frame = (now) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000))
    last = now
    if (!paused()) {
      before?.(dt)
      acc += dt
      while (acc >= step) {
        tick()
        acc -= step
      }
      alpha = acc / step
      after?.(dt)
    }
    draw(alpha)
  }
  raf = requestAnimationFrame(frame)
  return () => cancelAnimationFrame(raf)
}
