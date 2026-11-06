<script setup>
import { SITE, GAMES } from '../versions'

// Every version of the site and of each game, newest first, behind the version in the top
// bar. Opened from inside a game, that game's history comes first and open.
const props = defineProps({
  t: { type: Object, required: true },
  // [{ id, title, icon }] in menu order
  games: { type: Array, required: true },
  current: { type: String, default: '' }
})

const emit = defineEmits(['close'])

const newestFirst = (list) => [...list].reverse()
const site = newestFirst(SITE)
const withHistory = props.games.filter(g => GAMES[g.id]).map(g => ({ ...g, history: newestFirst(GAMES[g.id]) }))
const currentGame = withHistory.find(g => g.id === props.current)
const others = withHistory.filter(g => g !== currentGame)
const siteOpen = !currentGame
</script>

<template>
  <div class="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4" @click.self="emit('close')">
    <div role="dialog" aria-modal="true" aria-labelledby="versions-title" class="term-window w-full sm:max-w-lg max-h-[90vh] flex flex-col">
      <div class="relative px-5 pt-5 pb-4 border-b border-term-low">
        <button type="button" class="term-icon-btn absolute top-3 right-3" :aria-label="t.versionsClose" @click="emit('close')"><i class="pxi pxi-close" aria-hidden="true"></i></button>
        <h2 id="versions-title" class="font-display text-3xl leading-none uppercase pr-12">{{ t.versionsTitle }}</h2>
        <p class="mt-2 text-sm term-muted">{{ t.versionsSite }} v{{ site[0].v }}</p>
      </div>

      <div class="overflow-y-auto px-5 py-4 space-y-2 text-sm">
        <!-- The game this was opened from, then the site, then every other game -->
        <details v-if="currentGame" open class="versions">
          <summary><span class="flex-1 truncate">{{ currentGame.icon }} {{ currentGame.title }}</span><span class="tabular-nums font-semibold">v{{ currentGame.history[0].v }}</span></summary>
          <ol><li v-for="entry in currentGame.history" :key="entry.v"><span class="ver">v{{ entry.v }}</span><span class="date">{{ entry.date }}</span><span class="note">{{ entry.note }}</span></li></ol>
        </details>

        <details :open="siteOpen" class="versions">
          <summary><span class="flex-1 truncate">{{ t.versionsSite }}</span><span class="tabular-nums font-semibold">v{{ site[0].v }}</span></summary>
          <ol><li v-for="entry in site" :key="entry.v"><span class="ver">v{{ entry.v }}</span><span class="date">{{ entry.date }}</span><span class="note">{{ entry.note }}</span></li></ol>
        </details>

        <h3 class="term-label pt-3">{{ t.versionsGames }}</h3>
        <details v-for="game in others" :key="game.id" class="versions">
          <summary><span class="flex-1 truncate">{{ game.icon }} {{ game.title }}</span><span class="tabular-nums font-semibold">v{{ game.history[0].v }}</span></summary>
          <ol><li v-for="entry in game.history" :key="entry.v"><span class="ver">v{{ entry.v }}</span><span class="date">{{ entry.date }}</span><span class="note">{{ entry.note }}</span></li></ol>
        </details>
      </div>
    </div>
  </div>
</template>

<style scoped>
.versions {
  border: 1px solid var(--color-term-low);
}
.versions summary {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  list-style: none;
}
.versions summary::-webkit-details-marker {
  display: none;
}
.versions summary::before {
  content: '+';
  color: var(--color-gold);
  font-family: var(--font-display);
}
.versions[open] summary::before {
  content: '-';
}
.versions ol {
  border-top: 2px solid var(--color-term-deep);
  padding: 0.4rem 0.75rem 0.6rem;
}
.versions li {
  display: grid;
  grid-template-columns: 4.2rem 5.6rem minmax(0, 1fr);
  gap: 0.5rem;
  padding: 0.15rem 0;
  font-size: 0.8rem;
  line-height: 1.35;
}
.versions .ver {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.versions .date {
  opacity: 0.6;
  font-variant-numeric: tabular-nums;
}
@media (max-width: 30rem) {
  .versions li {
    grid-template-columns: 4.2rem minmax(0, 1fr);
  }
  .versions .date {
    display: none;
  }
}
</style>
