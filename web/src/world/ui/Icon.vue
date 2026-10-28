<script setup>
// Simple rounded line icons for the world's buttons
defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 24 }
})

const PATHS = {
  chat: 'M5 5.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-4.5 3.5V16.5H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z M8 10.5h.01 M12 10.5h.01 M16 10.5h.01',
  smile: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M8.5 14.5c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2 M9 9.5h.01 M15 9.5h.01',
  shop: 'M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8z M9 10V7a3 3 0 0 1 6 0v3',
  bag: 'M4 9.5h16v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-9z M8 9.5V7.5a4 4 0 0 1 8 0v2 M4 13.5h16',
  friends: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5 M16 4.3a3.3 3.3 0 0 1 0 6.4 M17.5 14.7c2.2.6 3.7 2.4 4 5.3',
  home: 'M3.5 11 12 4l8.5 7 M5.5 9.5V19a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V9.5 M10 20.5v-5.5h4v5.5',
  plaza: 'M12 3c-3 0-5 2-5 4.5S9 11 12 11s5-1 5-3.5S15 3 12 3z M12 11v6 M4 21h16 M7 17h10',
  close: 'M6 6l12 12 M18 6 6 18',
  send: 'M4 12 20 4l-6 16-3-7-7-1z',
  sound: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4z M16 9a4 4 0 0 1 0 6 M18.5 6.5a7.5 7.5 0 0 1 0 11',
  mute: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4z M16.5 9.5l5 5 M21.5 9.5l-5 5',
  exit: 'M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14 M10 8l-4 4 4 4 M6 12h10',
  pencil: 'M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5 4 20z M13.5 7l3 3',
  rotate: 'M19 12a7 7 0 1 1-2.1-5 M19 4.5v4h-4',
  move: 'M12 3v18 M3 12h18 M12 3l-3 3 M12 3l3 3 M12 21l-3-3 M12 21l3-3 M3 12l3-3 M3 12l3 3 M21 12l-3-3 M21 12l-3 3',
  trash: 'M5 7h14 M9.5 7V5h5v2 M7 7l.8 12.2a2 2 0 0 0 2 1.8h4.4a2 2 0 0 0 2-1.8L17 7',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chevron: 'M7 10l5 5 5-5',
  plus: 'M12 5v14 M5 12h14',
  userPlus: 'M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M3 20c.6-3.4 3.2-5.5 6.5-5.5 1.6 0 3 .5 4.2 1.3 M18 13v6 M15 16h6',
  dice: 'M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M8.5 8.5h.01 M15.5 8.5h.01 M12 12h.01 M8.5 15.5h.01 M15.5 15.5h.01',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z',
  shirt: 'M8 4.5 4 7l2 3.5 2-1V20h8V9.5l2 1L20 7l-4-2.5c-.6 1.4-2 2.3-4 2.3S8.6 5.9 8 4.5z',
  sofa: 'M5 11V8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5V11 M3 12.5a2 2 0 0 1 4 0V15h10v-2.5a2 2 0 0 1 4 0V18H3z M5 18v2 M19 18v2',
  door: 'M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21 M4 21h16 M14.5 12h.01',
  user: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4.5 21c.7-4 3.7-6.5 7.5-6.5s6.8 2.5 7.5 6.5'
}
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path :d="PATHS[name]" />
  </svg>
</template>
