import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Listen on the local network so phones on the same Wi-Fi can open the dev server
  server: {
    host: true
  },
})
