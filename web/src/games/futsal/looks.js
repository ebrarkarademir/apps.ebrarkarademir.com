// How Futsal looks, which the players pick before a match: the court and the two teams' kits.
// Nothing in the match depends on it; every device just draws it.

// main: the shirt; dark: its rim and shading; text: the number on it
export const KITS = [
  { id: 'blue', main: '#3d8bff', dark: '#123a80', text: '#ffffff' },
  { id: 'red', main: '#ff4d4d', dark: '#7d1414', text: '#ffffff' },
  { id: 'green', main: '#2fd655', dark: '#0b5a1f', text: '#021a08' },
  { id: 'yellow', main: '#ffd23f', dark: '#806000', text: '#1a1400' },
  { id: 'white', main: '#f2f6ea', dark: '#7f8a78', text: '#101410' },
  { id: 'orange', main: '#ff8f2e', dark: '#7d3a00', text: '#1a0c00' },
  { id: 'purple', main: '#a77bff', dark: '#3f2785', text: '#ffffff' },
  { id: 'black', main: '#2b302b', dark: '#000000', text: '#f2f6ea' }
]
export const KIT_IDS = KITS.map(kit => kit.id)
export const DEFAULT_KITS = ['blue', 'red']
export const kitOf = (id) => KITS.find(kit => kit.id === id) || KITS[0]

/** Two different kits, [home, away], from whatever was asked for. */
export function pairKits (kits) {
  const home = KIT_IDS.includes(kits?.[0]) ? kits[0] : DEFAULT_KITS[0]
  let away = KIT_IDS.includes(kits?.[1]) ? kits[1] : DEFAULT_KITS[1]
  if (away === home) away = KIT_IDS.find(id => id !== home && id !== 'black') || DEFAULT_KITS[1]
  return [home, away]
}

/** Picks a kit for one team; taking the other team's kit swaps the two. */
export function withKit (kits, team, id) {
  const next = pairKits(kits)
  if (!KIT_IDS.includes(id)) return next
  if (next[1 - team] === id) next[1 - team] = next[team]
  next[team] = id
  return next
}

// The courts: a glowing terminal hall, a wooden indoor arena and a fenced street cage
export const COURTS = ['neon', 'arena', 'street']
export const DEFAULT_COURT = 'neon'
