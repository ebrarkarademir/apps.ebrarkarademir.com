<script setup>
import { ref } from 'vue'

// Sign in or create an account
defineProps({
  t: { type: Object, required: true },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const emit = defineEmits(['submit'])

const mode = ref('register')
const name = ref('')
const pass = ref('')

function submit () {
  if (!name.value.trim() || !pass.value) return
  emit('submit', { mode: mode.value, name: name.value.trim(), pass: pass.value })
}
</script>

<template>
  <form class="auth panel" @submit.prevent="submit">
    <div class="brand" aria-hidden="true">
      <span class="sun"></span>
      <span class="hill a"></span>
      <span class="hill b"></span>
    </div>
    <h1>{{ t.worldTitle }}</h1>
    <p class="muted">{{ t.worldTagline }}</p>

    <div class="switch" role="tablist">
      <button type="button" role="tab" :aria-selected="mode === 'register'" :class="['chip', { on: mode === 'register' }]" @click="mode = 'register'">{{ t.worldRegister }}</button>
      <button type="button" role="tab" :aria-selected="mode === 'login'" :class="['chip', { on: mode === 'login' }]" @click="mode = 'login'">{{ t.worldLogin }}</button>
    </div>

    <label class="block">
      <span class="label">{{ t.worldName }}</span>
      <input v-model="name" class="field" maxlength="16" autocomplete="username" autocapitalize="off" spellcheck="false" />
    </label>
    <label class="block">
      <span class="label">{{ t.worldPassword }}</span>
      <input v-model="pass" class="field" type="password" maxlength="72" :autocomplete="mode === 'register' ? 'new-password' : 'current-password'" />
    </label>
    <p v-if="mode === 'register'" class="muted hint">{{ t.worldNameHint }}</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <button type="submit" class="btn wide" :disabled="busy || !name.trim() || !pass">
      {{ mode === 'register' ? t.worldCreate : t.worldEnter }}
    </button>
  </form>
</template>

<style scoped>
.auth {
  width: min(24rem, calc(100% - 2rem));
  padding: 1.6rem 1.5rem 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  text-align: center;
}
h1 { margin: 0.2rem 0 0; font-size: 2rem; font-weight: 900; }
p { margin: 0; }
.brand { position: relative; height: 5rem; margin: -0.4rem auto 0; width: 8rem; }
.sun { position: absolute; left: 50%; top: 0.2rem; width: 3.4rem; height: 3.4rem; margin-left: -1.7rem; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #fff6c4, #ffcf4d 55%, #ffb11a); box-shadow: 0 0 30px 6px rgba(255, 207, 77, 0.55); }
.hill { position: absolute; bottom: 0; border-radius: 50% 50% 0 0; }
.hill.a { left: 0; width: 5.2rem; height: 2.6rem; background: linear-gradient(180deg, #8ff0cf, #3fcfa2); }
.hill.b { right: 0; width: 4.6rem; height: 2.1rem; background: linear-gradient(180deg, #ffb2d3, #ff7fb3); }
.switch { display: flex; justify-content: center; gap: 0.5rem; }
.block { display: flex; flex-direction: column; gap: 0.3rem; text-align: left; }
.label { padding-left: 0.9rem; font-size: 0.85rem; font-weight: 800; color: var(--ink-soft); }
.hint { font-size: 0.78rem; }
.error { color: #d6336c; font-weight: 800; }
.wide { width: 100%; margin-top: 0.3rem; }
</style>
