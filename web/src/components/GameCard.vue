<script setup>
defineProps({
  game: {
    type: Object,
    required: true
  }
})

// Emit click so parent listeners like @click work
defineEmits(['click'])
</script>

<template>
  <button
    type="button"
    class="term-card group relative w-full h-full text-left p-5 sm:p-6 flex flex-col"
    @click="$emit('click')"
  >
    <div class="flex items-start justify-between gap-4 mb-5">
      <span class="font-display text-4xl leading-none" aria-hidden="true">{{ game.icon }}</span>
      <span class="term-chip">beta</span>
    </div>

    <h2 class="font-display text-3xl leading-none uppercase mb-2">{{ game.title }}</h2>
    <p class="term-muted text-sm leading-relaxed">
      {{ game.description }}
    </p>

    <span aria-hidden="true" class="mt-auto pt-5 text-sm font-semibold uppercase tracking-widest term-muted group-hover:text-term">
      &gt; run<span class="term-cursor invisible group-hover:visible group-focus-visible:visible"></span>
    </span>
  </button>
</template>
