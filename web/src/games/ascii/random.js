// Seeded random numbers for the ASCII arcade games. The same seed always gives the same
// numbers, which is how every device in an online game can build the same course, map or
// puzzle on its own.

export function mulberry32 (seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Shuffles a list in place, with Math.random or a seeded generator, and returns it. */
export function shuffle (list, random = Math.random) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}
