import { ref, onMounted, onUnmounted } from 'vue'

// A game's full-screen view: `full` says whether it's on, and the game decides what that leaves
// on screen. Where the browser can, the element from `target` also takes the whole screen,
// browser bars and all, and with `orientation` (such as 'landscape') a phone turns that way
// for it. An iPhone can't do either for a page, so there the game fills the browser window,
// which is as much as it gets. The browser's own way out (Esc, the back gesture) turns `full`
// off again, and so does leaving the game.

const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement

export function useFullscreen (target, { orientation = null } = {}) {
  const full = ref(false)

  async function enter () {
    if (full.value) return
    full.value = true
    const el = target()
    const request = el?.requestFullscreen || el?.webkitRequestFullscreen
    if (!request) return
    try {
      await request.call(el, { navigationUI: 'hide' })
    } catch {
      // Refused: the game still fills the window
      return
    }
    if (!orientation || !full.value) return
    try {
      await screen.orientation?.lock?.(orientation)
    } catch {
      // Computers and some phones can't turn: the game fits whichever way the screen is
    }
  }

  function leave () {
    full.value = false
    if (!fullscreenElement()) return
    try {
      screen.orientation?.unlock?.()
    } catch {
      // Nothing was locked
    }
    const exit = document.exitFullscreen || document.webkitExitFullscreen
    try {
      exit?.call(document)?.catch?.(() => {})
    } catch {
      // Already on its way out
    }
  }

  // For a button: a clicked one lets go of focus, so Space goes back to the game
  function toggle (event) {
    if (full.value) leave()
    else enter()
    if (event?.detail) event.currentTarget?.blur?.()
  }

  const onChange = () => {
    if (!fullscreenElement()) full.value = false
  }

  onMounted(() => {
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
  })

  onUnmounted(() => {
    document.removeEventListener('fullscreenchange', onChange)
    document.removeEventListener('webkitfullscreenchange', onChange)
    leave()
  })

  return { full, enter, leave, toggle }
}
