<script setup>
import { ref, computed, watch } from 'vue'
import TermWindow from '../components/TermWindow.vue'
import HackStage from './hack/HackStage.vue'
import { LANGS, LENGTHS } from './hack/words'

const props = defineProps({
  t: { type: Object, required: true }
})

const emit = defineEmits(['go-back'])

const BEST_KEY = 'hackBest'
const LANG_KEY = 'hackLang'

const TITLE_ART = [
  'login: root',
  'password: [C][_][D][E]_',
  'TRACE [#######.......] 35%',
  '> ACCESS GRANTED'
].join('\n')
const RUN_ART = ['[_][A][_][_]', 'TRACE [##..]'].join('\n')
const PRACTICE_ART = ['[C][O][D][E]', 'TRIES 3'].join('\n')

const LANG_NAMES = { EN: 'English', TR: 'Türkçe', RU: 'Русский', KK: 'Қазақша' }

function readJson (key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback
  } catch {
    return fallback
  }
}

function writeJson (key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Best scores just aren't kept
  }
}

// The passwords' language: the one picked last time, or the page's
const savedLang = readJson(LANG_KEY, null)
const lang = ref(LANGS.includes(savedLang) ? savedLang : (LANGS.includes(props.t.langCode) ? props.t.langCode : 'EN'))
watch(lang, (value) => writeJson(LANG_KEY, value))

// Best run per password language: { score, layer }
const best = ref(readJson(BEST_KEY, {}))
const bestHere = computed(() => best.value[lang.value] || { score: 0, layer: 0 })

const playing = ref(null) // null on the menu, or { mode, length }
const practiceLength = ref(5)

function onOver ({ score, layer }) {
  if (score <= bestHere.value.score) return
  best.value = { ...best.value, [lang.value]: { score, layer } }
  writeJson(BEST_KEY, best.value)
}

const fmt = (str, vars) => str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
const modeCardClass = 'term-card group flex flex-col gap-3 p-5 text-left'
</script>

<template>
  <HackStage
    v-if="playing"
    :t="t"
    :title="t.hackTitle"
    :exitLabel="t.hackMenu"
    :mode="playing.mode"
    :lang="lang"
    :length="playing.length"
    :best="bestHere.score"
    @exit="playing = null"
    @over="onOver"
  />

  <TermWindow v-else class="max-w-2xl" :title="t.hackTitle" :backLabel="t.back" @back="emit('go-back')">
    <div class="space-y-6">
      <div class="overflow-hidden text-center" aria-hidden="true">
        <span class="inline-block whitespace-pre text-left text-xs sm:text-sm leading-relaxed">{{ TITLE_ART }}</span>
      </div>

      <div class="flex flex-wrap items-center gap-2 text-sm">
        <span class="term-label w-full sm:w-auto sm:mr-1">&gt; {{ t.hackLanguage }}</span>
        <button
          v-for="code in LANGS"
          :key="code"
          type="button"
          :class="['term-option min-h-9 px-3 text-sm font-semibold', { 'is-active': lang === code }]"
          @click="lang = code"
        >
          {{ LANG_NAMES[code] }}
        </button>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <button type="button" :class="modeCardClass" @click="playing = { mode: 'run', length: 4 }">
          <span class="whitespace-pre text-sm leading-tight" aria-hidden="true">{{ RUN_ART }}</span>
          <span class="font-display text-3xl leading-none uppercase">{{ t.hackRun }}</span>
          <span class="term-muted text-sm leading-relaxed">{{ t.hackRunDesc }}</span>
          <span class="mt-auto flex items-center justify-between gap-2 pt-1">
            <span class="term-chip tabular-nums">
              {{ t.hackBest }}: {{ bestHere.score }}<template v-if="bestHere.layer"> · {{ fmt(t.hackLayer, { n: bestHere.layer }) }}</template>
            </span>
            <span class="text-sm font-semibold uppercase tracking-widest term-muted group-hover:text-term" aria-hidden="true">&gt; run</span>
          </span>
        </button>

        <div :class="modeCardClass">
          <span class="whitespace-pre text-sm leading-tight" aria-hidden="true">{{ PRACTICE_ART }}</span>
          <span class="font-display text-3xl leading-none uppercase">{{ t.hackPractice }}</span>
          <span class="term-muted text-sm leading-relaxed">{{ t.hackPracticeDesc }}</span>
          <div class="flex flex-wrap items-center gap-1.5" role="group" :aria-label="t.hackLength">
            <span class="term-label mr-1">{{ t.hackLength }}</span>
            <button
              v-for="n in LENGTHS"
              :key="n"
              type="button"
              :class="['term-option min-h-8 min-w-9 px-2 text-sm font-semibold tabular-nums', { 'is-active': practiceLength === n }]"
              @click="practiceLength = n"
            >
              {{ n }}
            </button>
          </div>
          <button type="button" class="term-btn term-btn-primary mt-auto min-h-10 text-sm" @click="playing = { mode: 'practice', length: practiceLength }">
            {{ t.hackStart }}
          </button>
        </div>
      </div>

      <p class="term-muted text-center text-xs sm:text-sm leading-relaxed">{{ t.hackControls }}</p>
    </div>
  </TermWindow>
</template>
