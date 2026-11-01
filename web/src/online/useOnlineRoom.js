import { computed, reactive, onMounted, onUnmounted } from 'vue'
import { session, currentRoom, registerRules, registerRender, unregisterRender } from './session'
import { profile, cleanName } from './profile'

export { currentRoom, cleanName }

// A game page's view of the online room (see session.js): the room this tab is in, shown on
// this page when it plays this game. On any other game's page the room stays open in the
// background, and that page shows its usual "create or join" screen with a way back to it.
//
// The page hands its host-side rules to the room when it opens. They keep running after the
// page closes (the round goes on while the host looks around) until the page opens again.

/**
 * @param {object} options
 * @param {string} options.game         Game id.
 * @param {() => object} options.initialState  Game fields merged into the room state when this game starts.
 * @param {(state, playerId) => object} [options.project]  What one player may see.
 * @param {(state, playerId, action) => void} options.onAction  Host: apply a player's action.
 * @param {(state, player) => void} [options.onJoin]   Host: a player joined or came back.
 * @param {(state, player) => void} [options.onLeave]  Host: a player dropped out.
 * @param {(state, now) => void} [options.onTick]      Host: runs a few times a second (timeouts).
 * @param {(data) => void} [options.onLive]  Everyone: every player's latest live data, by player id.
 * @param {(playerId, data) => void} [options.onGuestLive]  Host: one guest's live data, the moment it arrives.
 * @param {number} [options.liveMs]          How often the host passes on live data.
 * @param {(data, from) => void} [options.onEvent]  Everyone: another player's one-off event.
 * @param {string} [options.initialCode] Room code from an invite link; joins straight away.
 * @param {boolean} [options.hostRoom]   Opens a room straight away (or moves this tab's room here), for a chat invite.
 */
export function useOnlineRoom (options) {
  const { game } = options

  registerRules(game, {
    initialState: options.initialState,
    project: options.project,
    onAction: options.onAction,
    onJoin: options.onJoin,
    onLeave: options.onLeave,
    onTick: options.onTick,
    onGuestLive: options.onGuestLive,
    liveMs: options.liveMs
  })
  const token = registerRender(game, { onLive: options.onLive, onEvent: options.onEvent })

  // The room is on this page while it plays this game
  const here = computed(() => session.screen === 'room' && session.game === game)
  // In a room playing something else
  const elsewhere = computed(() => (session.screen === 'room' && session.game && session.game !== game ? { game: session.game, code: session.roomCode } : null))
  const screen = computed(() => (elsewhere.value ? 'home' : session.screen))
  // A game's screens only show once its part of the state is there
  const view = computed(() => (here.value && session.view?.ready ? session.view : null))
  const me = computed(() => view.value?.players.find(p => p.id === session.myId) || null)
  const shareLink = computed(() => `${window.location.origin}/${session.game || game}?join=${session.roomCode}`)
  const playerName = computed({
    get: () => profile.name,
    set: (name) => {
      profile.name = String(name).slice(0, 18)
      profile.custom = true
    }
  })

  onMounted(() => {
    const code = (options.initialCode || '').toUpperCase()
    if (code) {
      if (session.roomCode !== code || session.screen === 'home') session.joinRoom(code)
    } else if (options.hostRoom) {
      session.hostFor(game)
    }
  })

  onUnmounted(() => unregisterRender(game, token))

  // Creating or joining from here first leaves a room this tab is in elsewhere. Without a name
  // (a new visitor's isn't made yet, or the field was cleared) the room makes one up.
  function createRoom () {
    profile.name = cleanName(profile.name)
    session.createRoom(game)
  }

  function joinRoom () {
    profile.name = cleanName(profile.name)
    session.joinRoom()
  }

  const guard = (fn) => (...args) => (here.value ? fn(...args) : undefined)

  return reactive({
    game,
    screen,
    elsewhere,
    view,
    me,
    shareLink,
    playerName,
    role: computed(() => session.role),
    isHost: computed(() => session.isHost),
    roomCode: computed(() => session.roomCode),
    errorKey: computed(() => session.errorKey),
    joinCode: computed({ get: () => session.joinCode, set: (code) => { session.joinCode = code } }),
    now: computed(() => session.now),
    myId: session.myId,
    connection: session.connection,
    pings: session.pings,
    sessionEnds: computed(() => session.view?.sessionEnds || 0),

    createRoom,
    joinRoom,
    leave: () => session.leave(),
    act: guard((type, payload) => session.act(type, payload)),
    sendLive: guard((data) => session.sendLive(data)),
    sendEvent: guard((data) => session.sendEvent(data)),
    sendEventTo: guard((playerId, data) => session.sendEventTo(playerId, data)),
    switchGame: (next) => session.switchGame(next)
  })
}
