<script setup>
import { computed } from 'vue'
import { itemUrl } from './pixels'
import { itemOf } from './social'

// What stands at a seat from the bar: the newest few, each with its little animation (smoke off a
// cigarette, steam off a tea, rain out of a cloud), fading away in its last seconds. With `over`,
// only the things that hang above a seat (a rain cloud); otherwise only the rest. The list is
// there even when it's empty, as the spot a gift flies to.
const props = defineProps({
  t: { type: Object, required: true },
  items: { type: Array, default: () => [] }, // { n, k, from, until }
  now: { type: Number, required: true },
  hidden: { type: Object, default: null }, // numbers of the ones still flying in
  nameOf: { type: Function, default: null }, // id -> name, for who it's from
  max: { type: Number, default: 3 },
  over: { type: Boolean, default: false },
  except: { type: Number, default: null } // the one someone holds, drawn in their hand instead
})

const FADE_MS = 3000
// Where the smoke, steam or bubbles come out (x, y: % of the picture), and how many bits each has
const EMIT = {
  tea: [50, 24],
  coffee: [50, 42],
  cigarette: [84, 62],
  cigar: [90, 64],
  hookah: [50, 4],
  beer: [42, 80],
  cola: [52, 82]
}
const PARTS = { steam: 3, smoke: 3, hookah: 5, fizz: 4, sparkle: 3, hearts: 2, stink: 3, rain: 6 }

const live = computed(() => props.items.filter(item => item.until > props.now && item.n !== props.except && !props.hidden?.has(item.n) && !!itemOf(item.k)?.over === props.over))
const shown = computed(() => live.value.slice(-props.max))
const extra = computed(() => live.value.length - shown.value.length)

const fxOf = (item) => itemOf(item.k)?.fx || ''
const nameOfItem = (item) => props.t[`bjItem_${item.k}`] || item.k
function titleOf (item) {
  const from = item.from && props.nameOf ? props.nameOf(item.from) : ''
  return from ? `${nameOfItem(item)} · ${from}` : nameOfItem(item)
}
function emitAt (item) {
  const [x, y] = EMIT[item.k] || [50, 30]
  return { '--ex': `${x}%`, '--ey': `${y}%` }
}
</script>

<template>
  <ul :class="['items', { over }]" data-items>
    <li
      v-for="item in shown"
      :key="item.n"
      :class="['item', fxOf(item) && `fx-${fxOf(item)}`, { leaving: item.until - now < FADE_MS }]"
      :style="emitAt(item)"
      :title="titleOf(item)"
    >
      <img :src="itemUrl(item.k)" :alt="titleOf(item)" draggable="false" />
      <span v-if="fxOf(item)" class="fx" aria-hidden="true">
        <i v-for="i in PARTS[fxOf(item)]" :key="i" :style="{ '--i': i - 1 }"></i>
      </span>
    </li>
    <li v-if="extra > 0" class="more">+{{ extra }}</li>
  </ul>
</template>

<style scoped>
.items {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 1px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  --size: var(--item, 24px);
  --p: calc(var(--size) / 16);
  position: relative;
  flex: none;
  width: var(--size);
  height: var(--size);
  animation: item-in 0.4s steps(4, end) both;
}

.items.over .item {
  --size: var(--item-over, 44px);
}

.item img {
  display: block;
  width: 100%;
  max-width: none;
  height: 100%;
  image-rendering: pixelated;
  filter: drop-shadow(0 2px 0 rgb(0 0 0 / 0.4));
}

.item.leaving {
  opacity: 0;
  transition: opacity 3s linear;
}

.more {
  align-self: center;
  padding: 0 0.2rem;
  background: rgb(0 0 0 / 0.5);
  color: #fdf6e3;
  font-size: 0.6rem;
  font-weight: 700;
}

@keyframes item-in {
  from { transform: translateY(-50%) scale(1.4); opacity: 0; }
  to { transform: none; opacity: 1; }
}

/* ---------- The little animations, in steps like a sprite's frames ---------- */

.fx {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.fx i {
  position: absolute;
  left: var(--ex);
  top: var(--ey);
  width: var(--p);
  height: var(--p);
}

/* Steam off a hot glass */
.fx-steam .fx i {
  left: calc(var(--ex) - 18% + var(--i) * 18%);
  height: calc(var(--p) * 3);
  background: rgb(255 255 255 / 0.75);
  animation: steam 2.4s steps(8) infinite;
  animation-delay: calc(var(--i) * -0.8s);
}

@keyframes steam {
  0% { transform: translate(0, 0); opacity: 0; }
  15% { opacity: 0.9; }
  50% { transform: translate(calc(var(--p) * 1.5), calc(var(--p) * -6)); }
  100% { transform: translate(calc(var(--p) * -1), calc(var(--p) * -12)); opacity: 0; }
}

/* Smoke curling off the lit end, or off the coals of a hookah */
.fx-smoke .fx i,
.fx-hookah .fx i:nth-child(-n+3) {
  width: calc(var(--p) * 2);
  height: calc(var(--p) * 2);
  background: #dfe4e8;
  animation: smoke 2.7s steps(10) infinite;
  animation-delay: calc(var(--i) * -0.9s);
}

.fx-hookah .fx i:nth-child(-n+3) {
  animation-duration: 3.4s;
  animation-delay: calc(var(--i) * -1.13s);
}

@keyframes smoke {
  0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
  12% { opacity: 0.85; }
  100% { transform: translate(calc(var(--p) * -5), calc(var(--p) * -18)) scale(2.4); opacity: 0; }
}

/* ...and bubbling in its water */
.fx-hookah .fx i:nth-child(n+4) {
  left: calc(38% + (var(--i) - 3) * 18%);
  top: 86%;
  background: #fff;
  animation: bubble 1.2s steps(6) infinite;
  animation-delay: calc((var(--i) - 3) * -0.6s);
}

@keyframes bubble {
  0% { transform: translateY(0); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: translateY(calc(var(--p) * -5)); opacity: 0; }
}

/* Bubbles rising in a fizzy drink */
.fx-fizz .fx i {
  left: calc(var(--ex) - 15% + var(--i) * 10%);
  background: rgb(255 255 255 / 0.9);
  animation: fizz 1.6s steps(8) infinite;
  animation-delay: calc(var(--i) * -0.4s);
}

@keyframes fizz {
  0% { transform: translateY(0); opacity: 0; }
  15%, 85% { opacity: 1; }
  100% { transform: translateY(calc(var(--p) * -7)); opacity: 0; }
}

/* Stars twinkling round something shiny */
.fx-sparkle .fx i {
  background: #fff;
  box-shadow: var(--p) 0 #fff3a8, calc(var(--p) * -1) 0 #fff3a8, 0 var(--p) #fff3a8, 0 calc(var(--p) * -1) #fff3a8;
  transform: scale(0);
  animation: twinkle 1.8s steps(3) infinite;
  animation-delay: calc(var(--i) * -0.6s);
}

.fx-sparkle .fx i:nth-child(1) { left: 10%; top: 22%; }
.fx-sparkle .fx i:nth-child(2) { left: 90%; top: 40%; }
.fx-sparkle .fx i:nth-child(3) { left: 68%; top: 90%; }

@keyframes twinkle {
  0%, 55%, 100% { transform: scale(0); }
  65%, 90% { transform: scale(1); }
  78% { transform: scale(1.6); }
}

/* Little hearts floating off a rose */
.fx-hearts .fx i {
  left: calc(22% + var(--i) * 44%);
  top: 14%;
  box-shadow:
    var(--p) 0 #ff8fc0, calc(var(--p) * 3) 0 #ff8fc0,
    0 var(--p) #ff8fc0, var(--p) var(--p) #ff8fc0, calc(var(--p) * 2) var(--p) #ff8fc0, calc(var(--p) * 3) var(--p) #ff8fc0, calc(var(--p) * 4) var(--p) #ff8fc0,
    var(--p) calc(var(--p) * 2) #ff8fc0, calc(var(--p) * 2) calc(var(--p) * 2) #ff8fc0, calc(var(--p) * 3) calc(var(--p) * 2) #ff8fc0,
    calc(var(--p) * 2) calc(var(--p) * 3) #ff8fc0;
  animation: float-up 2.4s steps(8) infinite;
  animation-delay: calc(var(--i) * -1.2s);
}

@keyframes float-up {
  0% { transform: translateY(0); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: translateY(calc(var(--p) * -14)); opacity: 0; }
}

/* A smell coming off the fish, in wavy green lines */
.fx-stink .fx i {
  left: calc(30% + var(--i) * 20%);
  top: 40%;
  height: calc(var(--p) * 2);
  background: #8fdc5a;
  animation: stink 2s steps(8) infinite;
  animation-delay: calc(var(--i) * -0.66s);
}

@keyframes stink {
  0% { transform: translate(0, 0); opacity: 0; }
  15% { opacity: 1; }
  35% { transform: translate(calc(var(--p) * 2), calc(var(--p) * -4)); }
  60% { transform: translate(calc(var(--p) * -1), calc(var(--p) * -8)); }
  100% { transform: translate(var(--p), calc(var(--p) * -13)); opacity: 0; }
}

/* Rain falling out of the cloud onto whoever it hangs over */
.fx-rain .fx i {
  left: calc(16% + var(--i) * 13%);
  top: 62%;
  height: calc(var(--p) * 2);
  background: #6fc3ff;
  animation: rain 0.8s linear infinite;
  animation-delay: calc(var(--i) * -0.27s);
}

@keyframes rain {
  0% { transform: translateY(0); opacity: 0; }
  10% { opacity: 1; }
  100% { transform: translateY(calc(var(--p) * 16)); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .item {
    animation: none;
  }

  .fx {
    display: none;
  }
}
</style>
