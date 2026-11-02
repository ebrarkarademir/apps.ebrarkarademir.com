<script setup>
import { ref, computed, onMounted } from 'vue'
import { sound } from '../ascii/sound'

// One playing card. It flies in from the shoe when it first appears (after `delay` ms, so a
// deal goes round the table card by card), and a face-down card flips over when its face
// arrives. Number cards carry their pips laid out as on a real deck.
const props = defineProps({
  card: { type: String, default: null }, // 'AS', 'TD'…; null for face down
  delay: { type: Number, default: 0 },
  // Where the shoe is on screen, for the flight in; null to just appear
  origin: { type: Function, default: null }
})

const SUITS = { S: '♠', H: '♥', D: '♦', C: '♣' }
// Pip positions (x %, y %) for 2 to 10; those in the bottom half stand upside down
const PIPS = {
  2: [[50, 18], [50, 82]],
  3: [[50, 18], [50, 50], [50, 82]],
  4: [[29, 18], [71, 18], [29, 82], [71, 82]],
  5: [[29, 18], [71, 18], [50, 50], [29, 82], [71, 82]],
  6: [[29, 18], [71, 18], [29, 50], [71, 50], [29, 82], [71, 82]],
  7: [[29, 18], [71, 18], [50, 34], [29, 50], [71, 50], [29, 82], [71, 82]],
  8: [[29, 18], [71, 18], [50, 34], [29, 50], [71, 50], [50, 66], [29, 82], [71, 82]],
  9: [[29, 18], [71, 18], [29, 39], [71, 39], [50, 50], [29, 61], [71, 61], [29, 82], [71, 82]],
  10: [[29, 18], [71, 18], [50, 29], [29, 39], [71, 39], [29, 61], [71, 61], [50, 71], [29, 82], [71, 82]]
}

const el = ref(null)
const rank = computed(() => (props.card ? props.card[0] : ''))
const label = computed(() => (rank.value === 'T' ? '10' : rank.value))
const suit = computed(() => (props.card ? SUITS[props.card[1]] : ''))
const red = computed(() => props.card && 'HD'.includes(props.card[1]))
const pips = computed(() => PIPS[Number(label.value)] || null)
const face = computed(() => 'JQK'.includes(rank.value))

onMounted(() => {
  const from = props.origin?.()
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (!from || reduce || !el.value?.animate) return
  const to = el.value.getBoundingClientRect()
  const dx = from.left + from.width / 2 - (to.left + to.width / 2)
  const dy = from.top + from.height / 2 - (to.top + to.height / 2)
  el.value.animate([
    { transform: `translate(${dx}px, ${dy}px) rotate(-28deg) scale(0.72)`, opacity: 0 },
    { opacity: 1, offset: 0.12 },
    { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 }
  ], { duration: 430, delay: props.delay, easing: 'cubic-bezier(0.2, 0.8, 0.25, 1)', fill: 'backwards' })
  setTimeout(() => sound.play('card'), props.delay)
})
</script>

<template>
  <div ref="el" :class="['card', { 'is-down': !card, 'is-red': red }]" :aria-label="card ? `${label}${suit}` : undefined">
    <div class="card-inner">
      <div class="side front" aria-hidden="true">
        <template v-if="card">
          <span class="corner top">{{ label }}<br>{{ suit }}</span>
          <span class="corner bottom">{{ label }}<br>{{ suit }}</span>
          <span v-if="pips" class="pips">
            <span v-for="([x, y], i) in pips" :key="i" :class="['pip', { flip: y > 50 }]" :style="{ left: `${x}%`, top: `${y}%` }">{{ suit }}</span>
          </span>
          <span v-else-if="face" class="royal">
            <span class="royal-letter">{{ label }}</span>
            <span class="royal-suit">{{ suit }}</span>
          </span>
          <span v-else class="ace">{{ suit }}</span>
        </template>
      </div>
      <div class="side back" aria-hidden="true"></div>
    </div>
  </div>
</template>

<style scoped>
.card {
  --cw: var(--card-w, 64px);
  position: relative;
  width: var(--cw);
  height: calc(var(--cw) * 1.4);
  perspective: calc(var(--cw) * 8);
  font-family: Georgia, 'Times New Roman', serif;
  text-shadow: none;
}

.card-inner {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transition: transform 0.5s cubic-bezier(0.3, 0.7, 0.3, 1);
}

.is-down .card-inner {
  transform: rotateY(180deg);
}

.side {
  position: absolute;
  inset: 0;
  border-radius: calc(var(--cw) * 0.09);
  backface-visibility: hidden;
  box-shadow: 0 calc(var(--cw) * 0.03) calc(var(--cw) * 0.1) rgb(0 0 0 / 0.45), 0 0 0 1px rgb(0 0 0 / 0.25);
}

.front {
  background: linear-gradient(160deg, #ffffff 0%, #f4f1e8 100%);
  color: #16181a;
  overflow: hidden;
}

.is-red .front {
  color: #c8102e;
}

.back {
  transform: rotateY(180deg);
  background:
    repeating-linear-gradient(45deg, rgb(255 215 120 / 0.28) 0 2px, transparent 2px 9px),
    repeating-linear-gradient(-45deg, rgb(255 215 120 / 0.28) 0 2px, transparent 2px 9px),
    linear-gradient(160deg, #a3132b, #6e0b1c);
  border: calc(var(--cw) * 0.06) solid #f4f1e8;
}

.corner {
  position: absolute;
  font-weight: 700;
  font-size: calc(var(--cw) * 0.2);
  line-height: 0.95;
  text-align: center;
  letter-spacing: -0.04em;
}

.corner.top {
  left: calc(var(--cw) * 0.06);
  top: calc(var(--cw) * 0.06);
}

.corner.bottom {
  right: calc(var(--cw) * 0.06);
  bottom: calc(var(--cw) * 0.06);
  transform: rotate(180deg);
}

.pips {
  position: absolute;
  inset: 12% 18%;
}

.pip {
  position: absolute;
  font-size: calc(var(--cw) * 0.21);
  line-height: 1;
  transform: translate(-50%, -50%);
}

.pip.flip {
  transform: translate(-50%, -50%) rotate(180deg);
}

.ace {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(var(--cw) * 0.62);
}

.royal {
  position: absolute;
  inset: 14% 16%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid currentColor;
  border-radius: calc(var(--cw) * 0.05);
  background: linear-gradient(160deg, rgb(255 210 63 / 0.25), rgb(200 16 46 / 0.08));
}

.royal-letter {
  font-size: calc(var(--cw) * 0.48);
  font-weight: 700;
  line-height: 1;
}

.royal-suit {
  font-size: calc(var(--cw) * 0.26);
  line-height: 1;
}
</style>
