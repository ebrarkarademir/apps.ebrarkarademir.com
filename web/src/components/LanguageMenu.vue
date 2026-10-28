<script setup>
import { ref, computed, nextTick, onUnmounted } from 'vue'

const props = defineProps({
  currentLang: {
    type: String,
    required: true
  },
  // [{ code, name }] in menu order, each name in its own language
  languages: {
    type: Array,
    required: true
  },
  label: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['select'])

const open = ref(false)
const root = ref(null)
const toggle = ref(null)
const items = ref([])

const currentName = computed(() => props.languages.find(lang => lang.code === props.currentLang)?.name || props.currentLang)

const focusItem = (index) => {
  const count = props.languages.length
  items.value[(index + count) % count]?.focus()
}

// Opening puts focus on the language in use, so arrow keys start from there
async function show () {
  open.value = true
  await nextTick()
  focusItem(Math.max(0, props.languages.findIndex(lang => lang.code === props.currentLang)))
  document.addEventListener('pointerdown', onPointerDown)
}

function hide ({ refocus = false } = {}) {
  open.value = false
  document.removeEventListener('pointerdown', onPointerDown)
  if (refocus) toggle.value?.focus()
}

const choose = (code) => {
  hide({ refocus: true })
  if (code !== props.currentLang) emit('select', code)
}

const onPointerDown = (e) => {
  if (!root.value?.contains(e.target)) hide()
}

// Tabbing out of the menu closes it. Focus going nowhere doesn't: Safari doesn't focus a tapped
// button, so tapping a language would otherwise close the menu before the tap lands.
const onFocusOut = (e) => {
  if (open.value && e.relatedTarget && !root.value?.contains(e.relatedTarget)) hide()
}

const onKeydown = (e) => {
  if (!open.value) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      show()
    }
    return
  }
  const index = items.value.indexOf(document.activeElement)
  if (e.key === 'Escape') {
    // Handled here, so the app's Esc doesn't also leave the page
    e.stopPropagation()
    hide({ refocus: true })
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    focusItem(index + 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    focusItem(index < 0 ? -1 : index - 1)
  } else if (e.key === 'Home') {
    e.preventDefault()
    focusItem(0)
  } else if (e.key === 'End') {
    e.preventDefault()
    focusItem(-1)
  }
}

onUnmounted(() => document.removeEventListener('pointerdown', onPointerDown))
</script>

<template>
  <div ref="root" class="relative" @keydown="onKeydown" @focusout="onFocusOut">
    <button
      ref="toggle"
      type="button"
      class="term-icon-btn"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-label="`${label}: ${currentName}`"
      :title="label"
      @click="open ? hide() : show()"
    >
      <span class="term-inverse px-1">{{ currentLang }}</span>
      <span class="term-muted" aria-hidden="true">{{ open ? '▴' : '▾' }}</span>
    </button>

    <ul
      v-if="open"
      role="menu"
      :aria-label="label"
      class="term-window absolute right-0 top-full z-40 mt-2 min-w-44 py-1"
    >
      <li v-for="(lang, index) in languages" :key="lang.code" role="none">
        <button
          :ref="el => { items[index] = el }"
          type="button"
          role="menuitemradio"
          :aria-checked="lang.code === currentLang"
          :lang="lang.code.toLowerCase()"
          :class="['lang-item', { 'is-active': lang.code === currentLang }]"
          @click="choose(lang.code)"
        >
          <span aria-hidden="true">{{ lang.code === currentLang ? '(*)' : '( )' }}</span>
          <span class="w-5" aria-hidden="true">{{ lang.code }}</span>
          <span>{{ lang.name }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* Same look as the nav tabs: dim, washed on hover, inverted for the language in use */
.lang-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  height: 2.5rem;
  padding: 0 0.75rem;
  color: var(--color-term-dim);
  font-size: 0.875rem;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
  transition: background-color 80ms, color 80ms;
}
.lang-item:hover,
.lang-item:focus-visible {
  background: var(--color-term-deep);
  color: var(--color-term);
}
.lang-item:focus-visible {
  outline-offset: -3px;
}
.lang-item.is-active {
  background: var(--color-term);
  color: var(--color-black);
  text-shadow: none;
}
</style>
