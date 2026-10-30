<script setup>
import { computed } from 'vue'
import { PIECES, SIDES, LINE_WIDTH } from './pieces'

// One chess piece on the page, drawn the same as on the board: the players' bars, the pieces
// taken, the promotion choice and the result. It's as big as its font size unless styled.
const props = defineProps({
  type: { type: String, required: true }, // p n b r q k
  color: { type: String, required: true } // w | b
})

const side = computed(() => SIDES[props.color] || SIDES.w)
</script>

<template>
  <svg
    viewBox="0 0 100 100"
    class="chess-piece"
    aria-hidden="true"
    :style="{ filter: `drop-shadow(0 0 0.12em ${side.glow})` }"
  >
    <path
      v-for="(part, index) in PIECES[type]"
      :key="index"
      :d="part.d"
      :fill="part.line ? 'none' : part.ink ? side.line : side.fill"
      :stroke="side.line"
      :stroke-width="LINE_WIDTH"
      stroke-linejoin="round"
      stroke-linecap="round"
    />
  </svg>
</template>

<style scoped>
.chess-piece {
  display: inline-block;
  width: 1em;
  height: 1em;
  flex-shrink: 0;
  overflow: visible;
}
</style>
