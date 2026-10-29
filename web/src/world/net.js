// The connection to the world server: one WebSocket, requests that wait for their answer,
// events the server pushes, and reconnecting by itself when the line drops.
//
// In development the server runs next to Vite and is reached through it at /world-socket. A
// site hosted without it points VITE_WORLD_URL at wherever the server runs (wss://…/world-socket).

const RETRY_MS = [500, 1000, 2000, 4000, 8000]
const CALL_TIMEOUT_MS = 10000
// A switched-off server may never answer at all; give up on an attempt after this and say it's off
const CONNECT_TIMEOUT_MS = 6000

export function worldUrl () {
  const configured = import.meta.env.VITE_WORLD_URL
  if (configured) return configured
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/world-socket`
}

export function createConnection (url = worldUrl()) {
  const listeners = new Map() // event type -> Set of functions
  const pending = new Map()
  let ws = null
  let seq = 0
  let attempts = 0
  let closedByUs = false
  let retryTimer = null
  const state = { status: 'idle' } // idle | connecting | open | down

  const emit = (type, data) => listeners.get(type)?.forEach(fn => fn(data))

  function open () {
    clearTimeout(retryTimer)
    state.status = 'connecting'
    emit('status', state.status)
    ws = new WebSocket(url)
    const socket = ws
    ws.onopen = () => {
      clearTimeout(connectTimer)
      attempts = 0
      state.status = 'open'
      emit('status', state.status)
    }
    ws.onmessage = (event) => {
      let msg
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }
      if (msg.t === 'res') {
        const call = pending.get(msg.id)
        if (call) {
          pending.delete(msg.id)
          clearTimeout(call.timer)
          call.resolve(msg)
        }
        return
      }
      emit(msg.t, msg)
    }
    ws.onclose = () => {
      ws = null
      // Calls still waiting won't get an answer from this connection
      for (const call of pending.values()) {
        clearTimeout(call.timer)
        call.resolve({ ok: false, err: 'offline' })
      }
      pending.clear()
      if (closedByUs) return
      state.status = 'down'
      emit('status', state.status)
      retryTimer = setTimeout(open, RETRY_MS[Math.min(attempts++, RETRY_MS.length - 1)])
    }
    // Handled here rather than by waiting for close: not every WebSocket reports one for an
    // attempt cut short
    const connectTimer = setTimeout(() => {
      if (socket.readyState !== WebSocket.CONNECTING) return
      const lost = socket.onclose
      socket.onclose = null
      socket.close()
      lost()
    }, CONNECT_TIMEOUT_MS)
  }

  return {
    state,
    open () {
      closedByUs = false
      if (!ws) open()
    },
    close () {
      closedByUs = true
      clearTimeout(retryTimer)
      ws?.close()
    },
    on (type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type).add(fn)
      return () => listeners.get(type)?.delete(fn)
    },
    /** Sends a request and resolves with the server's answer ({ ok, ... } or { ok: false, err }). */
    call (t, data = {}) {
      return new Promise((resolve) => {
        if (ws?.readyState !== WebSocket.OPEN) {
          resolve({ ok: false, err: 'offline' })
          return
        }
        const id = ++seq
        const timer = setTimeout(() => {
          pending.delete(id)
          resolve({ ok: false, err: 'offline' })
        }, CALL_TIMEOUT_MS)
        pending.set(id, { resolve, timer })
        ws.send(JSON.stringify({ t, id, ...data }))
      })
    },
    /** Sends without waiting for an answer (movement, chat). */
    send (t, data = {}) {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t, ...data }))
    }
  }
}
