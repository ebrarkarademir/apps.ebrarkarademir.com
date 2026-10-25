<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'

const props = defineProps({
  isDarkMode: { type: Boolean, default: false },
  t: { type: Object, required: true }
})
const emit = defineEmits(['go-back'])

// Post preview
const postUrl = ref('')
const embedError = ref('')

function isValidInstagramUrl(url) {
  try {
    const u = new URL((url || '').trim())
    const host = u.hostname.toLowerCase()
    // Accept www.instagram.com, m.instagram.com, instagram.com, and short instagr.am
    return host.endsWith('instagram.com') || host.endsWith('instagr.am')
  } catch { return false }
}

async function ensureEmbedScript() {
  // Load Instagram embed script once
  if (window.instgrm && window.instgrm.Embeds) return
  await new Promise((resolve) => {
    const existing = document.querySelector('script#ig-embed')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      if (window.instgrm && window.instgrm.Embeds) resolve()
      return
    }
    const s = document.createElement('script')
    s.id = 'ig-embed'
    s.src = 'https://www.instagram.com/embed.js'
    s.async = true
    s.onload = () => resolve()
    document.body.appendChild(s)
  })
}

async function renderEmbed() {
  embedError.value = ''
  const raw = (postUrl.value || '').trim()
  if (!isValidInstagramUrl(raw)) {
    embedError.value = 'instaInvalidUrl'
    return
  }
  // Ensure trailing slash for embed permalink
  postUrl.value = /\/$/.test(raw) ? raw : raw + '/'
  await ensureEmbedScript()
  await nextTick()
  if (window.instgrm && window.instgrm.Embeds && window.instgrm.Embeds.process) {
    try {
      window.instgrm.Embeds.process()
    } catch (e) {
      embedError.value = 'instaPreviewError'
    }
  }
}

onMounted(() => {
  // Prefill example for UX
  // postUrl.value = 'https://www.instagram.com/p/Cx123456789/'
})
watch(postUrl, () => {
  // debounce could be added; keep manual render via button to avoid noisy calls
})

// Comments parsing
const commentsRaw = ref('')
const parsedComments = ref([]) // [{username, comment}]
const fileError = ref('')

function parseLinesToComments(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const out = []
  for (const line of lines) {
    // Try: username: comment
    const m = line.match(/^([^:]{1,64})\s*:\s*(.+)$/)
    if (m) {
      out.push({ username: m[1].trim(), comment: m[2].trim() })
      continue
    }
    // Fallback: entire line is comment
    out.push({ username: 'anonymous', comment: line })
  }
  return out
}

function parseCsv(text) {
  // naive CSV: username,comment (comma not quoted)
  const lines = text.split(/\r?\n/).filter(Boolean)
  const out = []
  for (const l of lines) {
    const idx = l.indexOf(',')
    if (idx === -1) { out.push({ username: 'anonymous', comment: l.trim() }); continue }
    const u = l.slice(0, idx).trim()
    const c = l.slice(idx + 1).trim()
    out.push({ username: u || 'anonymous', comment: c })
  }
  return out
}

function tryParseJson(text) {
  try {
    const data = JSON.parse(text)
    if (Array.isArray(data)) {
      return data
        .map(x => ({ username: x.username || 'anonymous', comment: x.comment || '' }))
        .filter(x => x.comment && String(x.comment).trim())
    }
    return []
  } catch { return null }
}

function parseCommentsText(text) {
  // Try JSON -> CSV -> lines
  const j = tryParseJson(text)
  if (j) return j
  // Heuristically treat comma usage as CSV if many commas
  const commaCount = (text.match(/,/g) || []).length
  if (commaCount >= 3) return parseCsv(text)
  return parseLinesToComments(text)
}

function onParseClick() {
  fileError.value = ''
  parsedComments.value = parseCommentsText(commentsRaw.value)
}

// Auto-parse as user pastes/types
watch(commentsRaw, (val) => {
  try {
    parsedComments.value = parseCommentsText(val)
  } catch {
    // keep previous parsedComments on transient errors while typing
  }
})

async function onFileChange(e) {
  fileError.value = ''
  const f = e.target.files?.[0]
  if (!f) return
  try {
    const text = await f.text()
    const ext = (f.name.split('.').pop() || '').toLowerCase()
    let list = []
    if (ext === 'json') list = tryParseJson(text) || []
    else if (ext === 'csv') list = parseCsv(text)
    else list = parseCommentsText(text)
    parsedComments.value = list
    commentsRaw.value = text
  } catch (err) {
    console.error(err)
    fileError.value = 'instaFileReadError'
  }
}

// Filtering & selection
const keyword = ref('')
const regexInput = ref('')
const regexError = ref('')
const uniqueUsers = ref(true)
const winnersCount = ref(1) // 1..5

const activeRegex = computed(() => {
  if (!regexInput.value.trim()) return null
  try {
    regexError.value = ''
    return new RegExp(regexInput.value.trim(), 'i')
  } catch (e) {
    regexError.value = 'instaInvalidRegex'
    return null
  }
})

const filteredComments = computed(() => {
  let items = parsedComments.value
  if (keyword.value.trim()) {
    const k = keyword.value.trim().toLowerCase()
    items = items.filter(x => x.comment.toLowerCase().includes(k) || x.username.toLowerCase().includes(k))
  }
  if (activeRegex.value) {
    items = items.filter(x => activeRegex.value.test(x.comment) || activeRegex.value.test(x.username))
  }
  if (uniqueUsers.value) {
    const seen = new Set()
    items = items.filter(x => {
      const u = x.username.toLowerCase()
      if (seen.has(u)) return false
      seen.add(u)
      return true
    })
  }
  return items
})

const stats = computed(() => ({
  total: parsedComments.value.length,
  matched: filteredComments.value.length
}))

function pickRandom(array, n) {
  const copy = array.slice()
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

const winners = ref([])
function pickWinners() {
  const m = filteredComments.value
  if (m.length === 0) {
    winners.value = []
    return
  }
  let n = Number(winnersCount.value) || 1
  if (n < 1) n = 1
  if (n > 5) n = 5
  winners.value = pickRandom(m, Math.min(n, m.length))
}

function resetAll() {
  postUrl.value = ''
  embedError.value = ''
  commentsRaw.value = ''
  parsedComments.value = []
  keyword.value = ''
  regexInput.value = ''
  regexError.value = ''
  uniqueUsers.value = true
  winnersCount.value = 1
  winners.value = []
}
</script>

<template>
  <div :class="[
    'max-w-5xl mx-auto',
    'rounded-2xl shadow-lg backdrop-blur-sm p-6 sm:p-8 transition-all duration-50',
    isDarkMode ? 'bg-gray-800/90 shadow-gray-900/30' : 'bg-white/90 shadow-gray-200/70'
  ]">
    <div class="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
      <button 
        @click="emit('go-back')"
        :class="[
          'px-4 py-2 rounded-xl transition-all duration-50 flex items-center gap-2',
          isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700/50' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100/50'
        ]"
      >
        <span class="text-lg">←</span>
        <span>{{ t.back }}</span>
      </button>
      <h1 class="text-xl sm:text-2xl font-medium">{{ t.instaTitle }}</h1>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: URL + Preview + Input -->
      <div>
        <label class="block mb-2 font-medium">{{ t.instaPostUrl }}</label>
        <div class="flex gap-2">
          <input
            v-model="postUrl"
            :placeholder="t.instaUrlPlaceholder"
            :class="[
              'flex-1 rounded-xl p-3 focus:outline-none focus:ring-2',
              isDarkMode ? 'bg-gray-900/40 text-gray-100 placeholder:text-gray-500 focus:ring-indigo-500/60' : 'bg-gray-50 text-gray-800 placeholder:text-gray-400 focus:ring-indigo-500/40'
            ]"
          />
          <button @click="renderEmbed"
            :class="[
              'px-4 py-2 rounded-xl font-medium transition-colors',
              isDarkMode ? 'bg-indigo-500 text-white hover:bg-indigo-400' : 'bg-indigo-600 text-white hover:bg-indigo-500'
            ]"
          >{{ t.instaLoadPreview }}</button>
        </div>
        <p v-if="embedError" class="text-sm mt-2 text-red-500">{{ t[embedError] }}</p>

        <div class="mt-4">
          <div v-if="isValidInstagramUrl(postUrl)" class="overflow-hidden rounded-xl">
            <!-- Instagram embed blockquote -->
            <blockquote 
              class="instagram-media" 
              :data-instgrm-permalink="postUrl" 
              data-instgrm-version="14" 
              style="background:#FFF; border:0; margin: 1px; max-width:540px; width:calc(100% - 2px);">
              <a :href="postUrl" target="_blank" rel="noopener noreferrer"></a>
            </blockquote>
          </div>
          <p v-else :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'" class="text-sm">
            {{ t.instaPreviewHint }}
          </p>
        </div>

        <div class="mt-6">
          <label class="block mb-2 font-medium">{{ t.instaUploadFile }}</label>
          <input type="file" accept=".txt,.csv,.json" @change="onFileChange"
            :class="[
              'w-full file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0',
              'file:text-sm file:font-medium file:cursor-pointer',
              isDarkMode ? 'file:bg-gray-700 file:text-gray-200 bg-gray-900/40 text-gray-200' : 'file:bg-gray-100 file:text-gray-700 bg-gray-50 text-gray-800',
              'rounded-lg p-2'
            ]"
          />
          <p :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'" class="text-sm mt-2">{{ t.instaFileHint }}</p>
          <p v-if="fileError" class="text-sm mt-2 text-red-500">{{ t[fileError] }}</p>
        </div>

        <div class="mt-6">
          <label class="block mb-2 font-medium">{{ t.instaPasteComments }}</label>
          <textarea v-model="commentsRaw" rows="8" :placeholder="t.instaPastePlaceholder"
            :class="[
              'w-full rounded-xl p-4 focus:outline-none focus:ring-2',
              isDarkMode ? 'bg-gray-900/40 text-gray-100 placeholder:text-gray-500 focus:ring-indigo-500/60' : 'bg-gray-50 text-gray-800 placeholder:text-gray-400 focus:ring-indigo-500/40'
            ]"
          />
          <div class="flex gap-3 mt-3">
            <button @click="onParseClick" :class="[
              'px-4 py-2 rounded-xl font-medium transition-colors',
              isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            ]">{{ t.instaParseNow }}</button>
            <button @click="resetAll" :class="[
              'px-4 py-2 rounded-xl font-medium transition-colors',
              isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            ]">{{ t.instaReset }}</button>
          </div>
          <p class="text-xs mt-2" :class="isDarkMode ? 'text-gray-500' : 'text-gray-500'">{{ t.instaHelpFormat }}</p>
        </div>
      </div>

      <!-- Right: Filters + Results -->
      <div>
        <div :class="['rounded-xl p-4 sm:p-5', isDarkMode ? 'bg-gray-900/30' : 'bg-gray-100']">
          <h2 class="text-lg font-medium mb-3">{{ t.instaPicker }}</h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <div :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">{{ t.instaParsedCount }}</div>
              <div class="font-semibold">{{ stats.total }}</div>
            </div>
            <div>
              <div :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">{{ t.instaMatchedCount }}</div>
              <div class="font-semibold">{{ stats.matched }}</div>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-3">
            <div>
              <label class="block mb-1 text-sm">{{ t.instaKeywordFilter }}</label>
              <input v-model="keyword" :placeholder="t.instaKeywordPH" :class="[
                'w-full rounded-xl p-3 focus:outline-none focus:ring-2',
                isDarkMode ? 'bg-gray-900/40 text-gray-100 placeholder:text-gray-500 focus:ring-indigo-500/60' : 'bg-gray-50 text-gray-800 placeholder:text-gray-400 focus:ring-indigo-500/40'
              ]"/>
            </div>
            <div>
              <label class="block mb-1 text-sm">{{ t.instaRegexFilter }}</label>
              <input v-model="regexInput" :placeholder="t.instaRegexPH" :class="[
                'w-full rounded-xl p-3 focus:outline-none focus:ring-2',
                isDarkMode ? 'bg-gray-900/40 text-gray-100 placeholder:text-gray-500 focus:ring-indigo-500/60' : 'bg-gray-50 text-gray-800 placeholder:text-gray-400 focus:ring-indigo-500/40'
              ]"/>
              <p v-if="regexError" class="text-xs mt-1 text-red-500">{{ t[regexError] }}</p>
            </div>
            <div class="flex items-center gap-2">
              <input id="uniq" type="checkbox" v-model="uniqueUsers" />
              <label for="uniq" class="text-sm">{{ t.instaUniqueUsers }}</label>
            </div>
            <div>
              <label class="block mb-1 text-sm">{{ t.instaWinnersCount }}</label>
              <div class="flex items-center gap-3">
                <input type="number" min="1" max="5" step="1" v-model.number="winnersCount"
                  :class="[
                    'w-24 rounded-xl p-3 focus:outline-none focus:ring-2',
                    isDarkMode ? 'bg-gray-900/40 text-gray-100 focus:ring-indigo-500/60' : 'bg-gray-50 text-gray-800 focus:ring-indigo-500/40'
                  ]"
                />
                <span :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'" class="text-sm">1–5</span>
              </div>
            </div>
            <div class="flex gap-3">
              <button @click="pickWinners" :disabled="stats.matched === 0" :class="[
                'px-4 py-2 rounded-xl font-medium transition-colors',
                stats.matched === 0 ? 'opacity-60 cursor-not-allowed' : '',
                isDarkMode ? 'bg-indigo-500 text-white hover:bg-indigo-400' : 'bg-indigo-600 text-white hover:bg-indigo-500'
              ]">{{ t.instaPickWinners }}</button>
            </div>
          </div>

          <div class="mt-5">
            <h3 class="font-medium mb-2">{{ t.instaWinners }}</h3>
            <div v-if="winners.length > 0" class="space-y-2">
              <div v-for="(w,i) in winners" :key="i" :class="[
                'rounded-lg p-3',
                isDarkMode ? 'bg-indigo-900/40 text-indigo-100' : 'bg-indigo-50 text-indigo-800 border border-indigo-100'
              ]">
                <div class="text-sm opacity-80">#{{ i+1 }}</div>
                <div class="font-semibold">@{{ w.username === 'anonymous' ? t.instaAnonymous : w.username }}</div>
                <div class="text-sm mt-1">{{ w.comment }}</div>
              </div>
            </div>
            <p v-else :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'" class="text-sm">{{ stats.matched === 0 ? t.instaNoMatches : t.instaNoWinnersYet }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
