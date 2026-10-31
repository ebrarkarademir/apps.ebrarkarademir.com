import { reactive, onUnmounted } from 'vue'

// A room with nobody else in it, for playing against bots alone. It looks like the room from
// useOnlineRoom to the game (view, myId, isHost, act, sendLive, sendEvent), and runs the same
// host-side rules, so a game's solo mode and its online mode play by the same code.

export const LOCAL_ID = 'me'

/**
 * @param {object} options
 * @param {() => object} options.initialState  Game fields merged into a fresh room state.
 * @param {(state, playerId, action) => void} options.onAction  The game's host-side rules.
 * @param {(state, now) => void} [options.onTick]  Runs a few times a second (timeouts).
 * @param {(playerId, data) => void} [options.onGuestLive]  Gets this player's own live data,
 *   as an online host gets a guest's.
 * @param {number} [options.tickMs]
 */
export function useLocalRoom ({ initialState, onAction, onTick, onGuestLive, tickMs = 100 }) {
  let timer = null

  const room = reactive({
    myId: LOCAL_ID,
    isHost: true,
    view: null,
    /** Opens a fresh room with just this player in it; `fields` override the initial state. */
    open (name, fields = {}) {
      room.view = { phase: 'lobby', hostId: LOCAL_ID, players: [{ id: LOCAL_ID, name, online: true }], ...initialState(), ...fields }
      clearInterval(timer)
      if (onTick) timer = setInterval(() => room.view && onTick(room.view, Date.now()), tickMs)
    },
    close () {
      clearInterval(timer)
      timer = null
      room.view = null
    },
    act (type, payload = {}) {
      if (room.view) onAction(room.view, LOCAL_ID, { type, ...payload })
    },
    sendLive (data) {
      if (room.view) onGuestLive?.(LOCAL_ID, data)
    },
    // Nobody to tell
    sendEvent () {}
  })


  onUnmounted(() => clearInterval(timer))
  return room
}
