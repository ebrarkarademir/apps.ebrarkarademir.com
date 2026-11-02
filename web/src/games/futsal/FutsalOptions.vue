<script setup>
import CourtPreview from './CourtPreview.vue'
import { MAX_TEAM, MINUTES, GOAL_LIMITS, PACES } from './engine'
import { LEVELS } from './bots'
import { KITS, COURTS, withKit } from './looks'

// A match's options, for a solo game and an online room alike: how it looks (the court and
// both kits, with a picture of them) and how it plays. Changes go out as `change` with just
// what changed; whoever owns the options applies them.
const props = defineProps({
  t: { type: Object, required: true },
  // { size, level, minutes, goals, golden, pace, court, kits }; size only for a solo game
  options: { type: Object, required: true },
  editable: { type: Boolean, default: true },
  showSize: { type: Boolean, default: false }
})

const emit = defineEmits(['change'])

const LEVEL_NAMES = Object.keys(LEVELS)
const PACE_NAMES = Object.keys(PACES)

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const cap = (word) => word[0].toUpperCase() + word.slice(1)
const levelName = (level) => props.t[`futsal${cap(level)}`]

const set = (patch) => {
  if (props.editable) emit('change', patch)
}
const pickKit = (team, id) => set({ kits: withKit(props.options.kits, team, id) })

const optionClass = (active) => ['term-option min-h-8 px-3 text-sm font-semibold', { 'is-active': active }]
const rowLabel = 'term-label w-full sm:w-40 shrink-0'
</script>

<template>
  <div class="space-y-5">
    <CourtPreview
      :court="options.court"
      :kits="options.kits"
      :labels="[t.futsalHome, t.futsalAway]"
      :label="t.futsalPreview"
      class="border border-term-low"
    />

    <!-- How it looks -->
    <section class="space-y-3" aria-labelledby="futsal-look">
      <h3 id="futsal-look" class="term-label border-b border-term-low pb-1">{{ t.futsalLookSection }}</h3>
      <div class="flex flex-wrap items-center gap-2">
        <span :class="rowLabel">&gt; {{ t.futsalCourt }}</span>
        <button v-for="court in COURTS" :key="court" type="button" :disabled="!editable" :class="optionClass(options.court === court)" @click="set({ court })">
          {{ t[`futsalCourt${cap(court)}`] }}
        </button>
      </div>
      <div v-for="team in [0, 1]" :key="team" class="flex flex-wrap items-center gap-2">
        <span :class="rowLabel">&gt; {{ team === 0 ? t.futsalHomeKit : t.futsalAwayKit }}</span>
        <span class="flex flex-wrap gap-1.5" role="group" :aria-label="team === 0 ? t.futsalHomeKit : t.futsalAwayKit">
          <button
            v-for="kit in KITS"
            :key="kit.id"
            type="button"
            :disabled="!editable"
            :class="['swatch', { 'is-picked': options.kits[team] === kit.id, 'is-other': options.kits[1 - team] === kit.id }]"
            :style="{ '--kit': kit.main, '--kit-dark': kit.dark, '--kit-text': kit.text }"
            :title="t[`futsalKit${cap(kit.id)}`]"
            :aria-label="t[`futsalKit${cap(kit.id)}`]"
            :aria-pressed="options.kits[team] === kit.id"
            @click="pickKit(team, kit.id)"
          >
            <span aria-hidden="true">{{ options.kits[team] === kit.id ? (team === 0 ? '#' : 'o') : options.kits[1 - team] === kit.id ? (team === 0 ? 'o' : '#') : '' }}</span>
          </button>
        </span>
      </div>
    </section>

    <!-- How it plays -->
    <section class="space-y-3" aria-labelledby="futsal-match">
      <h3 id="futsal-match" class="term-label border-b border-term-low pb-1">{{ t.futsalMatchSection }}</h3>
      <div v-if="showSize" class="flex flex-wrap items-center gap-2">
        <span :class="rowLabel">&gt; {{ t.futsalTeamSize }}</span>
        <button v-for="size in MAX_TEAM" :key="size" type="button" :disabled="!editable" :class="optionClass(options.size === size)" @click="set({ size })">{{ size }} v {{ size }}</button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span :class="rowLabel">&gt; {{ t.futsalLevel }}</span>
        <button v-for="level in LEVEL_NAMES" :key="level" type="button" :disabled="!editable" :class="optionClass(options.level === level)" @click="set({ level })">{{ levelName(level) }}</button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span :class="rowLabel">&gt; {{ t.futsalLength }}</span>
        <button v-for="minutes in MINUTES" :key="minutes" type="button" :disabled="!editable" :class="optionClass(options.minutes === minutes)" @click="set({ minutes })">{{ fmt(t.futsalMinutes, { n: minutes }) }}</button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span :class="rowLabel">&gt; {{ t.futsalGoalsToWin }}</span>
        <button v-for="goals in GOAL_LIMITS" :key="goals" type="button" :disabled="!editable" :class="optionClass(options.goals === goals)" @click="set({ goals })">{{ goals ? goals : t.futsalNoLimit }}</button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span :class="rowLabel">&gt; {{ t.futsalLevelEnd }}</span>
        <button type="button" :disabled="!editable" :class="optionClass(options.golden)" @click="set({ golden: true })">{{ t.futsalGolden }}</button>
        <button type="button" :disabled="!editable" :class="optionClass(!options.golden)" @click="set({ golden: false })">{{ t.futsalDraw }}</button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span :class="rowLabel">&gt; {{ t.futsalPace }}</span>
        <button v-for="pace in PACE_NAMES" :key="pace" type="button" :disabled="!editable" :class="optionClass(options.pace === pace)" @click="set({ pace })">{{ t[`futsalPace${cap(pace)}`] }}</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* A kit colour: the picked one is ringed and carries the team's mark; the other team's shows its mark small */
.swatch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 2px solid var(--kit-dark);
  background: radial-gradient(circle at 35% 30%, #ffffff 0, var(--kit) 30%, var(--kit-dark) 100%);
  color: var(--kit-text);
  font-weight: 800;
  font-size: 0.8rem;
  text-shadow: none;
  border-radius: 9999px;
  transition: transform 0.1s ease;
}

.swatch:not(:disabled):hover {
  transform: scale(1.12);
}

.swatch.is-picked {
  box-shadow: 0 0 0 2px #000, 0 0 0 4px var(--kit), 0 0 12px var(--kit);
}

.swatch.is-other {
  opacity: 0.55;
}

.swatch:disabled {
  cursor: default;
}
</style>
