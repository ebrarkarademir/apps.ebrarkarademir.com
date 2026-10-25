<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  isDarkMode: { type: Boolean, default: false },
  t: { type: Object, required: true }
})

const emit = defineEmits(['go-back'])

const file = ref(null)
const pastedText = ref('')
const extractedText = ref('')
const analyzing = ref(false)
const analysis = ref(null)
const error = ref('')

const hasInput = computed(() => !!(extractedText.value.trim() || pastedText.value.trim()))

function resetAll() {
  file.value = null
  pastedText.value = ''
  extractedText.value = ''
  analysis.value = null
  error.value = ''
}

async function onFileChange(e) {
  error.value = ''
  analysis.value = null
  extractedText.value = ''
  const f = e.target.files?.[0]
  if (!f) return
  file.value = f

  const ext = f.name.split('.').pop()?.toLowerCase()
  if (ext !== 'txt') {
    // Keep it simple for the demo: only accept .txt for parsing.
    error.value = 'cvOnlyTxt'
    return
  }

  try {
    const text = await f.text()
    extractedText.value = text
  } catch (err) {
    console.error(err)
    error.value = 'cvReadError'
  }
}

function getTextToAnalyze() {
  return (extractedText.value || pastedText.value || '').trim()
}

function scoreAts(text) {
  // Naive ATS-like scoring based on simple heuristics
  const checks = {
    hasSections: /(experience|work|education|skills|projects|summary)/i.test(text),
    contact: /(email|@|phone|linkedin|github)/i.test(text),
    bullets: /\n\s*[-•▪·]/.test(text),
    dates: /(20\d{2}|19\d{2})/i.test(text),
    lengthOk: text.split(/\s+/).length >= 200 && text.split(/\s+/).length <= 1200
  }
  const total = Object.keys(checks).length
  const passed = Object.values(checks).filter(Boolean).length
  const score = Math.round((passed / total) * 100)
  return { score, checks }
}

function detectSections(text) {
  const sections = []
  const addIf = (key, regex) => { if (regex.test(text)) sections.push(key) }
  addIf('cvSectionSummary', /summary|objective|profile/i)
  addIf('cvSectionExperience', /experience|work|employment/i)
  addIf('cvSectionEducation', /education|bachelor|master|phd|university|college/i)
  addIf('cvSectionSkills', /skills|technologies|stack|competencies/i)
  addIf('cvSectionProjects', /projects?|portfolio/i)
  addIf('cvSectionLanguages', /languages|english|turkish|german|french|spanish/i)
  return sections
}

function guessSeniority(text) {
  const yoeMatch = text.match(/(\d+)\+?\s*(years|yrs|y\.?o\.?e\.?)/i)
  const years = yoeMatch ? parseInt(yoeMatch[1], 10) : null
  const keywords = {
    senior: /(lead|principal|architect|owner|mentor|designed|scalable|distributed)/i,
    mid: /(built|implemented|ownership|maintained|deployed)/i,
    junior: /(learned|assisted|intern|entry)/i
  }
  if (years !== null) {
    if (years >= 7) return 'cvSenioritySenior'
    if (years >= 3) return 'cvSeniorityMid'
    return 'cvSeniorityJunior'
  }
  if (keywords.senior.test(text)) return 'cvSenioritySenior'
  if (keywords.mid.test(text)) return 'cvSeniorityMid'
  return 'cvSeniorityJunior'
}

function extractSkills(text) {
  const techs = [
    'javascript','typescript','vue','react','angular','node','express','vite','webpack','rollup',
    'html','css','sass','tailwind','bootstrap','jest','vitest','cypress','playwright',
    'python','django','flask','fastapi','java','spring','kotlin','c#','dotnet','go','rust',
    'docker','kubernetes','aws','azure','gcp','sql','mysql','postgres','mongodb','graphql'
  ]
  const counts = {}
  const lower = text.toLowerCase()
  techs.forEach(t => {
    const regex = new RegExp(`(^|[^a-z])${t}([^a-z]|$)`, 'g')
    const matches = lower.match(regex)
    if (matches && matches.length) counts[t] = matches.length
  })
  const top = Object.entries(counts)
    .sort((a,b) => b[1]-a[1])
    .slice(0, 10)
    .map(([name,count]) => ({ name, count }))
  return top
}

function buildSuggestions(text, sections, checks) {
  const s = []
  if (!/(summary|objective|profile)/i.test(text)) s.push('cvSugAddSummary')
  if (!/(projects?)/i.test(text)) s.push('cvSugAddProjects')
  if (!/(linkedin|github)/i.test(text)) s.push('cvSugAddLinks')
  if (!/\n\s*[-•▪·]/.test(text)) s.push('cvSugUseBullets')
  if (!checks.lengthOk) s.push('cvSugLength')
  return s
}

async function analyze() {
  const text = getTextToAnalyze()
  if (!text) {
    error.value = 'cvNoText'
    return
  }
  analyzing.value = true
  error.value = ''
  try {
    const words = text.split(/\s+/).filter(Boolean)
    const chars = text.length
    const ats = scoreAts(text)
    const sections = detectSections(text)
    const seniority = guessSeniority(text)
    const skills = extractSkills(text)
    const strengths = []
    if (sections.includes('cvSectionExperience')) strengths.push('cvStrExp')
    if (skills.length >= 5) strengths.push('cvStrSkills')
    if (/(impact|reduced|increased|optimized|improved)/i.test(text)) strengths.push('cvStrImpact')

    const risks = []
    if (!/(achieved|improved|delivered|launched)/i.test(text)) risks.push('cvRiskResults')
    if (!/(email|@|phone|linkedin|github)/i.test(text)) risks.push('cvRiskContact')

    const suggestions = buildSuggestions(text, sections, ats.checks)

    analysis.value = {
      words: words.length,
      chars,
      atsScore: ats.score,
      checks: ats.checks,
      sections,
      seniority,
      topSkills: skills,
      strengths,
      risks,
      suggestions
    }
  } catch (e) {
    console.error(e)
    error.value = 'cvAnalyzeError'
  } finally {
    analyzing.value = false
  }
}
</script>

<template>
  <div :class="[
    'max-w-5xl mx-auto',
    'rounded-2xl shadow-lg backdrop-blur-sm p-6 sm:p-8 transition-all duration-50',
    isDarkMode 
      ? 'bg-gray-800/90 shadow-gray-900/30' 
      : 'bg-white/90 shadow-gray-200/70'
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
      <h1 class="text-xl sm:text-2xl font-medium">{{ t.cvTitle }}</h1>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Input side -->
      <div>
        <label class="block mb-2 font-medium">{{ t.cvUpload }}</label>
        <input 
          type="file" 
          accept=".txt,.pdf,.doc,.docx"
          @change="onFileChange"
          :class="[
            'w-full file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0',
            'file:text-sm file:font-medium file:cursor-pointer',
            isDarkMode 
              ? 'file:bg-gray-700 file:text-gray-200 bg-gray-900/40 text-gray-200' 
              : 'file:bg-gray-100 file:text-gray-700 bg-gray-50 text-gray-800',
            'rounded-lg p-2'
          ]"
        />
        <p :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'" class="text-sm mt-2">{{ t.cvDropHint }}</p>

        <div class="mt-6">
          <label class="block mb-2 font-medium">{{ t.cvOrPaste }}</label>
          <textarea
            v-model="pastedText"
            rows="12"
            :placeholder="t.cvPastePlaceholder"
            :class="[
              'w-full rounded-xl p-4 focus:outline-none focus:ring-2',
              isDarkMode 
                ? 'bg-gray-900/40 text-gray-100 placeholder:text-gray-500 focus:ring-indigo-500/60' 
                : 'bg-gray-50 text-gray-800 placeholder:text-gray-400 focus:ring-indigo-500/40'
            ]"
          />
        </div>

        <div class="flex gap-3 mt-4">
          <button
            @click="analyze"
            :disabled="analyzing || !hasInput"
            :class="[
              'px-4 py-2 rounded-xl font-medium transition-colors',
              analyzing || !hasInput ? 'opacity-60 cursor-not-allowed' : '',
              isDarkMode ? 'bg-indigo-500 text-white hover:bg-indigo-400' : 'bg-indigo-600 text-white hover:bg-indigo-500'
            ]"
          >
            {{ analyzing ? t.cvAnalyzing : t.cvAnalyze }}
          </button>
          <button
            @click="resetAll"
            :class="[
              'px-4 py-2 rounded-xl font-medium transition-colors',
              isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            ]"
          >
            {{ t.cvReset }}
          </button>
        </div>

        <p v-if="error" class="mt-4 text-sm text-red-500">{{ t[error] }}</p>
      </div>

      <!-- Results side -->
      <div>
        <div
          :class="[
            'rounded-xl p-4 sm:p-5',
            isDarkMode ? 'bg-gray-900/30' : 'bg-gray-100'
          ]"
        >
          <h2 class="text-lg font-medium mb-3">{{ t.cvAnalysis }}</h2>

          <div v-if="analysis" class="space-y-4">
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div class="text-gray-500" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">{{ t.cvWords }}</div>
                <div class="font-semibold">{{ analysis.words }}</div>
              </div>
              <div>
                <div class="text-gray-500" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">{{ t.cvChars }}</div>
                <div class="font-semibold">{{ analysis.chars }}</div>
              </div>
              <div>
                <div class="text-gray-500" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">{{ t.cvSeniority }}</div>
                <div class="font-semibold">{{ t[analysis.seniority] }}</div>
              </div>
              <div>
                <div class="text-gray-500" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">{{ t.cvAtsScore }}</div>
                <div class="font-semibold">{{ analysis.atsScore }}%</div>
              </div>
            </div>

            <div>
              <h3 class="font-medium mb-1">{{ t.cvSectionsDetected }}</h3>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="s in analysis.sections"
                  :key="s"
                  :class="[
                    'px-2 py-1 rounded-lg text-xs',
                    isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800 border border-gray-200'
                  ]"
                >{{ t[s] }}</span>
                <span v-if="analysis.sections.length === 0" class="text-sm" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">{{ t.cvNoSections }}</span>
              </div>
            </div>

            <div>
              <h3 class="font-medium mb-1">{{ t.cvTopSkills }}</h3>
              <div class="flex flex-wrap gap-2">
                <span v-for="sk in analysis.topSkills" :key="sk.name"
                  :class="[
                    'px-2 py-1 rounded-lg text-xs',
                    isDarkMode ? 'bg-indigo-900/40 text-indigo-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                  ]"
                >{{ sk.name }} × {{ sk.count }}</span>
                <span v-if="analysis.topSkills.length === 0" class="text-sm" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">{{ t.cvNoSkills }}</span>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 class="font-medium mb-1">{{ t.cvStrengths }}</h3>
                <ul class="list-disc pl-5 text-sm" :class="isDarkMode ? 'text-gray-200' : 'text-gray-700'">
                  <li v-for="s in analysis.strengths" :key="s">{{ t[s] }}</li>
                  <li v-if="analysis.strengths.length === 0" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">{{ t.cvNoStrengths }}</li>
                </ul>
              </div>
              <div>
                <h3 class="font-medium mb-1">{{ t.cvRisks }}</h3>
                <ul class="list-disc pl-5 text-sm" :class="isDarkMode ? 'text-gray-200' : 'text-gray-700'">
                  <li v-for="r in analysis.risks" :key="r">{{ t[r] }}</li>
                  <li v-if="analysis.risks.length === 0" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">{{ t.cvNoRisks }}</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 class="font-medium mb-1">{{ t.cvSuggestions }}</h3>
              <ul class="list-disc pl-5 text-sm" :class="isDarkMode ? 'text-gray-200' : 'text-gray-700'">
                <li v-for="sug in analysis.suggestions" :key="sug">{{ t[sug] }}</li>
                <li v-if="analysis.suggestions.length === 0" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">{{ t.cvNoSuggestions }}</li>
              </ul>
            </div>

          </div>

          <div v-else :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'" class="text-sm">
            {{ t.cvEmptyState }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.active-bullet::marker {
  color: #6366f1;
}
</style>
