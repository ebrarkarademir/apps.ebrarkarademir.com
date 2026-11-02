<script setup>
import { emoteUrl } from './pixels'

// An emote over a seat: a pixel speech bubble that pops up, bobs and pops away again, in the
// couple of seconds the stage keeps it. Someone watching without a seat gets their name under it.
defineProps({
  k: { type: String, required: true },
  label: { type: String, default: '' },
  name: { type: String, default: '' }
})
</script>

<template>
  <span class="emote" role="img" :aria-label="name ? `${name}: ${label}` : label">
    <img :src="emoteUrl(k)" alt="" draggable="false" />
    <span v-if="name" class="emote-name">{{ name }}</span>
  </span>
</template>

<style scoped>
.emote {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  pointer-events: none;
  transform-origin: 50% 100%;
  animation: emote 2.6s linear both;
}

.emote img {
  display: block;
  width: var(--emote, 46px);
  max-width: none; /* the page's images shrink to their box, and a bubble's box can be nothing */
  height: auto;
  image-rendering: pixelated;
  filter: drop-shadow(0 3px 0 rgb(0 0 0 / 0.35));
}

.emote-name {
  max-width: 6rem;
  padding: 0 0.35rem;
  overflow: hidden;
  background: rgb(0 0 0 / 0.6);
  color: #fdf6e3;
  font-size: 0.6rem;
  font-weight: 700;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* In jumps rather than glides, like a sprite's frames */
@keyframes emote {
  0% { transform: translateY(10px) scale(0.2); opacity: 0; }
  4% { transform: translateY(2px) scale(0.7); opacity: 1; }
  8% { transform: translateY(-4px) scale(1.12); }
  12% { transform: translateY(0) scale(1); }
  30% { transform: translateY(0); }
  31% { transform: translateY(-2px); }
  48% { transform: translateY(-2px); }
  49% { transform: translateY(0); }
  66% { transform: translateY(0); }
  67% { transform: translateY(-2px); }
  84% { transform: translateY(-2px); opacity: 1; }
  85% { transform: translateY(0); }
  92% { transform: translateY(-3px) scale(1.05); opacity: 1; }
  100% { transform: translateY(-10px) scale(0.6); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .emote {
    animation: emote-fade 2.6s linear both;
  }

  @keyframes emote-fade {
    0%, 100% { opacity: 0; }
    6%, 90% { opacity: 1; }
  }
}
</style>
