// Phones zoom the page on a quick double tap or a pinch. In a game, where fingers tap fast and
// two at once (one thumb steering while the other kicks or fires), that happens by accident, and
// a full-screen game leaves no way to pinch back out. So while a game is open the page can't be
// zoomed, and opening one brings a page that was zoomed back to its normal size. The menu and
// the other pages can still be zoomed.
//
// Every browser needs a different part of it: Android follows the viewport, a double tap is held
// back by touch-action, and iPhones, which ignore the viewport's zoom settings, get their pinch
// gestures cancelled.

const NORMAL = 'width=device-width, initial-scale=1.0'
const LOCKED = `${NORMAL}, maximum-scale=1.0, user-scalable=no`

const cancel = (event) => event.preventDefault()
// Two fingers moving on an iPhone pinch the page; a game's own touch handling doesn't need the
// browser to do anything with them
const cancelPinch = (event) => {
  if (event.touches.length > 1) event.preventDefault()
}
const GESTURES = ['gesturestart', 'gesturechange', 'gestureend']

let locked = false

export function lockZoom (on) {
  if (on === locked) return
  locked = on
  document.querySelector('meta[name="viewport"]')?.setAttribute('content', on ? LOCKED : NORMAL)
  document.documentElement.classList.toggle('zoom-locked', on)
  for (const type of GESTURES) {
    if (on) document.addEventListener(type, cancel, { passive: false })
    else document.removeEventListener(type, cancel)
  }
  if (on) document.addEventListener('touchmove', cancelPinch, { passive: false })
  else document.removeEventListener('touchmove', cancelPinch)
}
