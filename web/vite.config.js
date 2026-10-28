import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Sunny Square, the 3D world, needs its own server (../backend). The dev server starts it too
// and passes the world's WebSocket through, so the page and the game share one address, also
// for phones on the same Wi-Fi. WORLD_PORT moves the world server off 8787; WORLD_SERVER=off
// leaves starting it to you.
const WORLD_PORT = Number(process.env.WORLD_PORT) || 8787

function worldServer () {
  return {
    name: 'world-server',
    apply: 'serve',
    configureServer (server) {
      if (process.env.WORLD_SERVER === 'off') return
      let child = spawn(process.execPath, ['--experimental-sqlite', '--disable-warning=ExperimentalWarning', 'src/main.js'], {
        cwd: fileURLToPath(new URL('../backend', import.meta.url)),
        env: { ...process.env, PORT: String(WORLD_PORT) },
        stdio: 'inherit'
      })
      child.on('exit', (code) => {
        child = null
        if (code) server.config.logger.warn(`world server stopped (exit ${code}); if port ${WORLD_PORT} is taken by another copy, that one is used`)
      })
      const stop = () => child?.kill()
      server.httpServer?.on('close', stop)
      process.on('exit', stop)
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), worldServer()],
  server: {
    // Listen on the local network so phones on the same Wi-Fi can open the dev server
    host: true,
    proxy: {
      '/world-socket': { target: `http://localhost:${WORLD_PORT}`, ws: true }
    }
  },
})
