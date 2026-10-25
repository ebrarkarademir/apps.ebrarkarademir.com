<script setup>
// Frame shared by every game screen: a green wireframe window with its title set into the
// top border, like a terminal UI dialog, and a back command in the corner
defineProps({
  title: { type: String, required: true },
  backLabel: { type: String, required: true }
})

defineEmits(['back'])
</script>

<template>
  <section class="term-window mx-auto w-full mt-4 px-4 pt-6 pb-5 sm:px-8 sm:pb-8">
    <h1 class="absolute -top-3.5 left-3 sm:left-6 max-w-[calc(100%-1.5rem)] truncate bg-black px-2 font-display text-2xl leading-7 uppercase">
      [ {{ title }} ]
    </h1>

    <div class="flex items-center justify-between gap-3 mb-6">
      <button @click="$emit('back')" class="term-link -ml-1.5">
        <span aria-hidden="true">[&lt;]</span>
        <span>{{ backLabel }}</span>
      </button>
      <slot name="status" />
    </div>

    <slot />
  </section>
</template>
