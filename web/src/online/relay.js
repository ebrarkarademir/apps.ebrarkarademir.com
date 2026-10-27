// Message relay for when two devices can't open a direct WebRTC link: routers that keep Wi-Fi
// devices apart, mobile data, and no TURN server configured. It speaks just enough MQTT 3.1.1
// over a secure WebSocket to talk to a free public broker: connect (optionally with a will),
// subscribe, publish at QoS 0 and keep-alive pings. Topics are namespaced by game and room
// code; what travels is the same game state the direct link carries, nothing secret.
// The online users list uses it too (see useUsers.js), with its chats encrypted end to end.

// The host listens on every broker, a guest uses the first one that gets an answer
export const RELAY_BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt']

const TOPIC_ROOT = 'ebrarkarademir-games/v1'
const KEEPALIVE_S = 30
const CONNECT_TIMEOUT_MS = 6000

const CONNECT = 0x10
const CONNACK = 2
const PUBLISH = 0x30
const PUBLISH_IN = 3
const SUBSCRIBE = 0x82
const SUBACK = 9
const PINGREQ = new Uint8Array([0xc0, 0])
const DISCONNECT = new Uint8Array([0xe0, 0])

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const relayTopic = (...parts) => [TOPIC_ROOT, ...parts].join('/')

const concat = (...chunks) => {
  const out = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0))
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

// MQTT strings: 2-byte length, then UTF-8
const mqttString = (text) => {
  const bytes = encoder.encode(text)
  return concat(new Uint8Array([bytes.length >> 8, bytes.length & 255]), bytes)
}

// Fixed header: packet type, then the body length as a 7-bits-per-byte varint
const mqttPacket = (type, body) => {
  const length = []
  let n = body.length
  do {
    let digit = n % 128
    n = Math.floor(n / 128)
    if (n > 0) digit |= 128
    length.push(digit)
  } while (n > 0)
  return concat(new Uint8Array([type, ...length]), body)
}

/**
 * Connects to one broker. Resolves with { subscribe, publish, close } once the broker accepts
 * the connection, rejects if it can't be reached in time.
 * @param {string} url
 * @param {object} handlers
 * @param {(topic: string, message: any) => void} handlers.onMessage
 * @param {() => void} [handlers.onClose]  Runs when an established connection drops, not after close().
 * @param {{ topic: string, message: any }} [handlers.will]  Published by the broker when the
 *   connection drops without close(): a closed tab, lost network, or keep-alive pings stopping.
 * @param {number} [handlers.keepAlive]  Seconds; the broker gives up after 1.5 times this without a ping.
 */
export function connectRelay (url, { onMessage, onClose, will, keepAlive = KEEPALIVE_S }) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, 'mqtt')
    ws.binaryType = 'arraybuffer'
    let buffer = new Uint8Array(0)
    let ready = false
    let closedByUs = false
    let pingTimer = null
    let packetId = 0
    const pendingSubscriptions = new Map()

    const connectTimer = setTimeout(() => {
      ws.close()
      reject(new Error('relay timeout'))
    }, CONNECT_TIMEOUT_MS)

    const client = {
      subscribe (topic) {
        return new Promise((done) => {
          packetId = (packetId % 65535) + 1
          pendingSubscriptions.set(packetId, done)
          ws.send(mqttPacket(SUBSCRIBE, concat(new Uint8Array([packetId >> 8, packetId & 255]), mqttString(topic), new Uint8Array([0]))))
        })
      },
      publish (topic, message) {
        if (ws.readyState !== WebSocket.OPEN) return
        ws.send(mqttPacket(PUBLISH, concat(mqttString(topic), encoder.encode(JSON.stringify(message)))))
      },
      close () {
        closedByUs = true
        clearInterval(pingTimer)
        if (ws.readyState === WebSocket.OPEN) ws.send(DISCONNECT)
        ws.close()
      }
    }

    ws.onopen = () => {
      const clientId = 'ebrar-' + Math.random().toString(36).slice(2, 12)
      // v3.1.1, clean session, plus the will flag when there is one (QoS 0, not retained)
      const flags = will ? 0x06 : 0x02
      const header = concat(mqttString('MQTT'), new Uint8Array([4, flags, keepAlive >> 8, keepAlive & 255]))
      const payload = will
        ? concat(mqttString(clientId), mqttString(will.topic), mqttString(JSON.stringify(will.message)))
        : mqttString(clientId)
      ws.send(mqttPacket(CONNECT, concat(header, payload)))
    }

    ws.onmessage = (event) => {
      buffer = concat(buffer, new Uint8Array(event.data))
      // A frame can hold several packets, or part of one
      while (buffer.length >= 2) {
        let length = 0
        let multiplier = 1
        let index = 1
        let byte
        do {
          if (index >= buffer.length) return
          byte = buffer[index++]
          length += (byte & 127) * multiplier
          multiplier *= 128
        } while (byte & 128)
        if (buffer.length < index + length) return
        const type = buffer[0] >> 4
        const body = buffer.slice(index, index + length)
        buffer = buffer.slice(index + length)
        handlePacket(type, body)
      }
    }

    ws.onclose = () => {
      clearTimeout(connectTimer)
      clearInterval(pingTimer)
      if (!ready) reject(new Error('relay closed'))
      else if (!closedByUs) onClose?.()
    }

    function handlePacket (type, body) {
      if (type === CONNACK) {
        if (body[1] !== 0) {
          ws.close()
          return
        }
        ready = true
        clearTimeout(connectTimer)
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(PINGREQ)
        }, (keepAlive * 1000) / 2)
        resolve(client)
      } else if (type === SUBACK) {
        const id = (body[0] << 8) | body[1]
        pendingSubscriptions.get(id)?.()
        pendingSubscriptions.delete(id)
      } else if (type === PUBLISH_IN) {
        // QoS 0: topic, then the payload (no packet id)
        const topicLength = (body[0] << 8) | body[1]
        const topic = decoder.decode(body.subarray(2, 2 + topicLength))
        let message
        try {
          message = JSON.parse(decoder.decode(body.subarray(2 + topicLength)))
        } catch {
          return
        }
        onMessage(topic, message)
      }
    }
  })
}
