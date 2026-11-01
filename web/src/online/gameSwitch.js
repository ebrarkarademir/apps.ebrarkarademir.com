import { shallowRef } from 'vue'

// Moving a whole online room to another game. The host picks the game in the lobby; every
// guest is told, and everyone opens the new game with the same room code: the host opens the
// room there again and the guests join it on their own, so nobody types a code or a name.

// The games a lobby can switch to, [{ id, title, icon }]; the app fills this in
export const switchTargets = shallowRef([])

// { game, code, host }: the app opens that game when this changes
export const switchRequest = shallowRef(null)

// Picked up by the new game's room when it opens, so it knows to reopen or rejoin that code
let handoff = null
const HANDOFF_MS = 15000

export function requestSwitch (next) {
  handoff = { ...next, at: Date.now() }
  switchRequest.value = next
}

export function takeHandoff (game) {
  if (!handoff || handoff.game !== game || Date.now() - handoff.at > HANDOFF_MS) return null
  const taken = handoff
  handoff = null
  return taken
}
