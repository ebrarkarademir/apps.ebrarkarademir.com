<script setup>
import { computed } from 'vue'
import qrcode from 'qrcode-generator'

// A QR code drawn as black modules on a phosphor-green block. Dark on light is the way
// round every scanner reads; light-on-dark codes fail on some phone cameras.
const props = defineProps({
  text: { type: String, required: true }
})

// Blank border around the code, in modules, that scanners need to find it
const QUIET_ZONE = 4

const code = computed(() => {
  const qr = qrcode(0, 'M')
  qr.addData(props.text)
  qr.make()

  const count = qr.getModuleCount()
  let path = ''
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`
    }
  }
  return { size: count + QUIET_ZONE * 2, path }
})
</script>

<template>
  <svg
    :viewBox="`0 0 ${code.size} ${code.size}`"
    class="block bg-term"
    shape-rendering="crispEdges"
    aria-hidden="true"
  >
    <path :d="code.path" class="fill-black" />
  </svg>
</template>
