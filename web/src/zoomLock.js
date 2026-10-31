// Phones zoom the page on a quick double tap or a pinch. In a game, where fingers tap fast and
// two at once (one thumb steering while the other kicks or fires), that happens by accident, and
// a full-screen game leaves no way to pinch back out. So while a game is open the page can't be
// zoomed, and opening one brings a page that was zoomed back to its normal size. The menu and
// the other pages can still be zoomed.
//
// Every browser needs a different part of it, so all of them are used at once:
// - Android follows the viewport's zoom settings
// - touch-action (style.css) holds back double taps and pinches where the browser honours it
// - iPhones ignore the viewport, so their pinch gestures, two-finger moves and quick second taps
//   are cancelled by hand
// - and if a page gets zoomed anyway, it's put straight back to its normal size

const NORMAL = 'width=device-width, initial-scale=1.0'
const LOCKED = `${NORMAL}, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no`
const DOUBLE_TAP_MS = 350

const cancel = (event) => event.preventDefault()

// Two fingers moving pinch the page; a game's own touch handling doesn't need the browser to do
// anything with them. Safari also says how far a touch is pinching.
const cancelPinch = (event) => {
  if (event.touches.length > 1 || (event.scale !== undefined && event.scale !== 1)) event.preventDefault()
}

// A second tap soon after the first zooms an iPhone, whatever touch-action says. Cancelling the
// end of that second tap stops it; text fields are left alone so they can still be tapped into.
let lastTapEnd = 0
const cancelDoubleTap = (event) => {
  const now = event.timeStamp || performance.now()
  const quick = now - lastTapEnd < DOUBLE_TAP_MS
  lastTapEnd = now
  if (!quick || !event.cancelable || event.touches.length > 0 || event.changedTouches.length > 1) return
  if (event.target.closest?.('input, textarea, select, [contenteditable]')) return
  event.preventDefault()
  // The cancelled tap's click never comes, so a button tapped twice quickly still gets both
  const button = event.target.closest?.('button, a, [role="button"], label')
  if (button && !button.disabled) button.click()
}

// A page that got zoomed anyway goes back to its normal size: writing the viewport again makes
// the browser apply it afresh
let resetting = false
function unzoom () {
  const scale = window.visualViewport?.scale ?? 1
  if (!locked || resetting || scale <= 1.01) return
  resetting = true
  const meta = document.querySelector('meta[name="viewport"]')
  meta?.setAttribute('content', `${NORMAL}, maximum-scale=1.0`)
  requestAnimationFrame(() => {
    if (locked) meta?.setAttribute('content', LOCKED)
    resetting = false
  })
}

const GESTURES = ['gesturestart', 'gesturechange', 'gestureend']
const OPTIONS = { passive: false, capture: true }

let locked = false

export function lockZoom (on) {
  if (on === locked) return
  locked = on
  document.querySelector('meta[name="viewport"]')?.setAttribute('content', on ? LOCKED : NORMAL)
  document.documentElement.classList.toggle('zoom-locked', on)
  const listen = on ? document.addEventListener.bind(document) : document.removeEventListener.bind(document)
  for (const type of GESTURES) listen(type, cancel, OPTIONS)
  listen('touchmove', cancelPinch, OPTIONS)
  listen('touchend', cancelDoubleTap, OPTIONS)
  listen('dblclick', cancel, OPTIONS)
  if (window.visualViewport) {
    if (on) window.visualViewport.addEventListener('resize', unzoom)
    else window.visualViewport.removeEventListener('resize', unzoom)
  }
  if (on) unzoom()
}
