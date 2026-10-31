// Phones zoom a page on a quick double tap or a pinch. In a game, where fingers tap fast and two
// at once (one thumb steering while the other kicks or fires), that happens by accident, and a
// full-screen game leaves no way to pinch back out. So no part of the site can be zoomed: the
// menu, the games and every other page stay at their normal size.
//
// Every browser needs a different part of it, so all of them are used at once:
// - Android follows the viewport's zoom settings (also in index.html, before this runs)
// - touch-action (style.css) holds back double taps and pinches where the browser honours it
// - iPhones ignore the viewport, so their pinch gestures, two-finger moves and quick second taps
//   are cancelled by hand
// - and if a page gets zoomed anyway, it's put straight back to its normal size

const NORMAL = 'width=device-width, initial-scale=1.0'
const LOCKED = `${NORMAL}, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no`
const DOUBLE_TAP_MS = 350
const OPTIONS = { passive: false, capture: true }

const cancel = (event) => event.preventDefault()

// Two fingers moving pinch the page; a page's own touch handling (a game's controls, the world's
// camera) still gets them, the browser doesn't. Safari also says how far a touch is pinching.
const cancelPinch = (event) => {
  if (event.touches.length > 1 || (event.scale !== undefined && event.scale !== 1)) event.preventDefault()
}

// A second tap soon after the first zooms an iPhone, whatever touch-action says. Cancelling the
// end of that second tap stops it; text fields are left alone so they can still be tapped into.
// The cancelled tap loses its click, so it's given one by hand: a button or card tapped twice
// quickly still gets both taps.
let lastTapEnd = 0
const cancelDoubleTap = (event) => {
  const now = event.timeStamp || performance.now()
  const quick = now - lastTapEnd < DOUBLE_TAP_MS
  lastTapEnd = now
  if (!quick || !event.cancelable || event.touches.length > 0 || event.changedTouches.length !== 1) return
  const target = event.target
  if (!(target instanceof Element) || target.closest('input, textarea, select, [contenteditable]')) return
  event.preventDefault()
  if (target.closest(':disabled')) return
  const touch = event.changedTouches[0]
  target.dispatchEvent(new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window,
    detail: 1,
    clientX: touch.clientX,
    clientY: touch.clientY,
    screenX: touch.screenX,
    screenY: touch.screenY
  }))
}

// A page that got zoomed anyway goes back to its normal size: writing the viewport again makes
// the browser apply it afresh
let resetting = false
function unzoom () {
  const scale = window.visualViewport?.scale ?? 1
  if (resetting || scale <= 1.01) return
  resetting = true
  const meta = document.querySelector('meta[name="viewport"]')
  meta?.setAttribute('content', `${NORMAL}, maximum-scale=1.0`)
  requestAnimationFrame(() => {
    meta?.setAttribute('content', LOCKED)
    resetting = false
  })
}

let locked = false

export function lockZoom () {
  if (locked) return
  locked = true
  document.querySelector('meta[name="viewport"]')?.setAttribute('content', LOCKED)
  for (const type of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick']) document.addEventListener(type, cancel, OPTIONS)
  document.addEventListener('touchmove', cancelPinch, OPTIONS)
  document.addEventListener('touchend', cancelDoubleTap, OPTIONS)
  window.visualViewport?.addEventListener('resize', unzoom)
  unzoom()
}
