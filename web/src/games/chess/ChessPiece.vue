<script setup>
import { computed } from 'vue'
import PixelArt from '../../components/PixelArt.vue'
import { pieceArt } from './pixelPieces'

// One chess (or dama) piece on the page, drawn the same as on the board: the players' bars, the
// pieces taken, the promotion choice and the result. It's as big as its font size unless styled.
const props = defineProps({
  type: { type: String, required: true }, // p n b r q k, or man / king
  // Kept for the callers that pass another game's set: the type says which piece it is
  set: { type: Object, default: null },
  color: { type: String, required: true } // w | b
})

const art = computed(() => pieceArt(props.type, props.color))
</script>

<template>
  <PixelArt :art="art" class="chess-piece" />
</template>

<style scoped>
.chess-piece {
  display: inline-block;
  width: 1em;
  height: 1em;
  flex-shrink: 0;
}
</style>
