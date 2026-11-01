import { shallowRef } from 'vue'

// What the online pages need from the app around them: the online games, to pick another one
// for the room ([{ id, title, icon }]), and a way to open a page. The app fills both in.
export const switchTargets = shallowRef([])

export const appNav = {
  openGame: () => {},
  renameSelf: () => {}
}
