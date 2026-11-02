// Neon Laps' tracks and cars (src/games/race): the roads close on themselves and never cross,
// a place on the road is found where it is, the walls hold every car and shell in, and cars
// bump and spin as they should.
//   npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TRACKS, trackOf, locate, pointAt, gridSpot, surfaceAt, wrapS, ROAD, WALL, GATES } from '../src/games/race/track.js'
import { STEP, newCar, stepCar, bump, spinOut, forwardSpeed, CAR_R, TOP_SPEED } from '../src/games/race/car.js'
import { fireShell, newShell, stepShell, shellHits, pickupSpot, SHELL_LIFE, PICKUP_COUNT } from '../src/games/race/items.js'

const tracks = TRACKS.map((_, i) => trackOf(i))

test('every track is a closed road with gentle enough bends and no part near another', () => {
  for (const track of tracks) {
    assert.ok(track.length > 900, `${track.id} is a decent lap`)
    // Each step along the middle line is the same length, all the way round and back to the start
    for (let k = 0; k < track.n; k++) {
      const k1 = (k + 1) % track.n
      assert.ok(Math.abs(Math.hypot(track.x[k1] - track.x[k], track.y[k1] - track.y[k]) - track.step) < 0.05, `${track.id} step ${k}`)
    }
    // The inside wall of a bend doesn't fold over itself
    for (const corner of track.corners) assert.ok(corner.r > WALL, `${track.id} corner radius ${corner.r}`)
    // Parts of the lap far apart along the road are far apart on the ground too: the walls
    // between them never touch
    for (let i = 0; i < track.n; i += 3) {
      for (let j = i + 1; j < track.n; j += 3) {
        if (Math.abs(wrapS(track.s[j] - track.s[i], track.length)) < WALL * 4) continue
        assert.ok(Math.hypot(track.x[i] - track.x[j], track.y[i] - track.y[j]) > WALL * 2 + 2, `${track.id}: points ${i} and ${j} too close`)
      }
    }
  }
})

test('a point is found where it is: how far round, and how far to the side', () => {
  for (const track of tracks) {
    for (const s of [0, 100.3, track.length / 2, track.length - 7]) {
      for (const d of [-9, -3, 0, 4.5, 10]) {
        const p = pointAt(track, s, d)
        const at = locate(track, p.x, p.y)
        assert.ok(Math.abs(wrapS(at.s - s, track.length)) < 0.6, `${track.id} s ${s} d ${d}: found s ${at.s}`)
        assert.ok(Math.abs(at.d - d) < 0.25, `${track.id} s ${s} d ${d}: found d ${at.d}`)
        // And the same again from a nearby hint
        const near = locate(track, p.x, p.y, (at.i + 5) % track.n)
        assert.ok(Math.abs(wrapS(near.s - at.s, track.length)) < 1e-6)
      }
    }
    assert.equal(surfaceAt(track, ROAD - 0.5), track.road)
    assert.equal(surfaceAt(track, -(ROAD + 1)), track.verge)
  }
})

test('the gates go round the lap from the start line, and the grid is just behind it', () => {
  for (const track of tracks) {
    assert.equal(track.gates.length, GATES)
    assert.equal(track.gates[0], 0)
    for (let g = 1; g < GATES; g++) assert.ok(track.gates[g] > track.gates[g - 1])
    for (let slot = 0; slot < 6; slot++) {
      const spot = gridSpot(track, slot)
      const behind = wrapS(spot.s, track.length)
      assert.ok(behind < -2 && behind > -40, `${track.id} slot ${slot} at ${behind}`)
      assert.ok(Math.abs(locate(track, spot.x, spot.y).d) < ROAD - 1.5, 'on the tarmac')
    }
    // A pickup lies on the road, somewhere along its own stretch of the lap, a different place each time
    const stretch = track.length / PICKUP_COUNT
    for (let id = 0; id < PICKUP_COUNT; id++) {
      const spots = Array.from({ length: 20 }, () => pickupSpot(track, id))
      for (const spot of spots) {
        assert.ok(spot.s >= id * stretch && spot.s <= (id + 1) * stretch, `${track.id} pickup ${id} at ${spot.s}`)
        const p = pointAt(track, spot.s, spot.d)
        assert.ok(Math.abs(locate(track, p.x, p.y).d) < ROAD - 1, 'on the tarmac')
      }
      assert.ok(new Set(spots.map(spot => spot.s)).size > 10, 'all over its stretch')
    }
  }
})

test('a car pulls away, reaches its top speed and stops again', () => {
  const track = tracks[0]
  const car = newCar(track, gridSpot(track, 0))
  for (let i = 0; i < 120 * 2; i++) stepCar(car, { gas: true, steer: 0 }, track, STEP)
  const after2s = forwardSpeed(car)
  assert.ok(after2s > 30 && after2s <= TOP_SPEED, `2 s of gas: ${after2s}`)
  let steps = 0
  while (forwardSpeed(car) > 0.5 && steps < 600) {
    stepCar(car, { brake: true, steer: 0 }, track, STEP)
    steps++
  }
  assert.ok(steps * STEP < 1, `stopped in ${(steps * STEP).toFixed(2)} s`)
  // Brake still held at a standstill reverses
  for (let i = 0; i < 120; i++) stepCar(car, { brake: true, steer: 0 }, track, STEP)
  assert.ok(forwardSpeed(car) < -5, 'reversing')
})

test('turning hard at speed slides the car, and it can never get past the walls', () => {
  for (const track of tracks) {
    const car = newCar(track, gridSpot(track, 0))
    let slid = false
    let worst = 0
    for (let i = 0; i < 120 * 30; i++) {
      // Flat out, steering one way then the other, into the walls again and again
      const steer = Math.floor(i / 200) % 2 ? 1 : -1
      stepCar(car, { gas: true, steer }, track, STEP)
      slid ||= car.slide
      worst = Math.max(worst, Math.abs(locate(track, car.x, car.y).d))
    }
    assert.ok(slid, `${track.id}: the car slid`)
    assert.ok(worst <= WALL - CAR_R + 0.6, `${track.id}: furthest from the middle ${worst}`)
  }
})

test('two cars that touch are pushed apart, and a shell hit spins a car out', () => {
  const track = tracks[0]
  const a = newCar(track, gridSpot(track, 0))
  const b = { ...newCar(track, gridSpot(track, 0)) }
  b.x += 1
  a.vx = 10
  const knock = bump(a, b, 0.5)
  assert.ok(knock > 0)
  const apart = Math.hypot(a.x - b.x, a.y - b.y)
  assert.ok(apart > 1.5, `apart ${apart}`)
  // Another player's car (share 1) doesn't move here: only this one is pushed away
  const ghost = { x: a.x + 1, y: a.y, a: a.a, vx: 0, vy: 0 }
  const ghostX = ghost.x
  const before = a.x
  bump(a, ghost, 1)
  assert.equal(ghost.x, ghostX)
  assert.notEqual(a.x, before)
  a.vx = 40
  spinOut(a, 1)
  assert.ok(a.spin > 0 && Math.hypot(a.vx, a.vy) < 15)
})

test('a shell flies straight, bounces off the walls a couple of times, then breaks', () => {
  for (const track of tracks) {
    const car = newCar(track, gridSpot(track, 0))
    // Aim it across the road, so it meets a wall at once
    car.a += Math.PI / 2.5
    const shell = newShell(fireShell(car), track)
    const outcomes = []
    for (let t = 0; t < SHELL_LIFE + 1; t += STEP) {
      const result = stepShell(shell, track, STEP)
      if (result) outcomes.push(result)
      if (result === 'gone') break
      assert.ok(Math.abs(locate(track, shell.x, shell.y).d) < WALL, 'inside the walls')
    }
    assert.ok(outcomes.filter(o => o === 'bounce').length >= 1, `${track.id}: it bounced`)
    assert.equal(outcomes.at(-1), 'gone')
  }
  // It hits a car it reaches, but not the one that fired it, at first
  const track = tracks[0]
  const shooter = newCar(track, gridSpot(track, 0))
  const shell = newShell(fireShell(shooter), track)
  assert.equal(shellHits(shell, shooter, true), false)
  const target = { ...shooter, x: shell.x + 1, y: shell.y }
  assert.equal(shellHits(shell, target), true)
})
