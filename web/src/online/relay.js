// Message relay for when two devices can't open a direct WebRTC link: routers that keep Wi-Fi
// devices apart, mobile data, and no TURN server configured. It speaks just enough MQTT 3.1.1
// over a secure WebSocket to talk to a free public broker: connect, subscribe, publish at
// QoS 0 and keep-alive pings. Topics are namespaced by game and room code; what travels is the
// same game state the direct link carries, nothing secret.

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
 * @param {{ onMessage: (topic: string, message: any) => void, onClose?: () => void }} handlers
 *   onClose runs when an established connection drops, not after close().
 */
export function connectRelay (url, { onMessage, onClose }) {
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
      const header = concat(mqttString('MQTT'), new Uint8Array([4, 0x02, 0, KEEPALIVE_S])) // v3.1.1, clean session
      ws.send(mqttPacket(CONNECT, concat(header, mqttString(clientId))))
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
        }, (KEEPALIVE_S * 1000) / 2)
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
