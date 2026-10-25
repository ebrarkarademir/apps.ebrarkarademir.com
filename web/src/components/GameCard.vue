<script setup>
defineProps({
  game: {
    type: Object,
    required: true
  },
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

// Emit click so parent listeners like @click work
defineEmits(['click'])
</script>

<template>
  <button
    type="button"
    :class="[
      'group relative w-full text-left rounded-xl border p-5 sm:p-6 cursor-pointer transition-all duration-150',
      'hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
      isDarkMode
        ? 'bg-gray-900 border-gray-800 hover:border-gray-600 hover:bg-gray-800/60'
        : 'bg-white border-gray-200 hover:border-gray-400 hover:shadow-lg'
    ]"
    @click="$emit('click')"
  >
    <div class="flex items-start justify-between gap-4 mb-5">
      <div
        :class="[
          'h-12 w-12 rounded-lg border flex items-center justify-center text-2xl',
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
        ]"
      >
        {{ game.icon }}
      </div>
      <span
        :class="[
          'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border',
          isDarkMode
            ? 'text-violet-300 border-violet-500/40 bg-violet-500/10'
            : 'text-violet-700 border-violet-200 bg-violet-50'
        ]"
      >
        beta
      </span>
    </div>

    <h2 class="text-lg sm:text-xl font-semibold mb-1.5">{{ game.title }}</h2>
    <p :class="['text-sm leading-relaxed', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
      {{ game.description }}
    </p>

    <span
      aria-hidden="true"
      :class="[
        'absolute bottom-5 right-5 sm:bottom-6 sm:right-6 text-lg opacity-0 -translate-x-1 transition-all duration-150',
        'group-hover:opacity-100 group-hover:translate-x-0',
        isDarkMode ? 'text-gray-400' : 'text-gray-500'
      ]"
    >
      →
    </span>
  </button>
</template>
