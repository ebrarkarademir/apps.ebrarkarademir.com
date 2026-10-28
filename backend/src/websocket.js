// A small WebSocket server (RFC 6455) on Node's own http module, so the server needs no
// packages: the upgrade handshake, text messages both ways, ping/pong and closing. Binary
// messages aren't used and are ignored.
import { createHash } from 'node:crypto'

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
const MAX_MESSAGE = 64 * 1024
const MAX_BUFFERED = 1024 * 1024 // a client this far behind on reading gets dropped

/** Answers an http 'upgrade' request and hands the new connection to `onConnection`. */
export function acceptUpgrade (req, socket, head, onConnection) {
  const key = req.headers['sec-websocket-key']
  if (req.headers.upgrade?.toLowerCase() !== 'websocket' || !key) {
    socket.destroy()
    return
  }
  const accept = createHash('sha1').update(key + GUID).digest('base64')
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  )
  socket.setNoDelay(true)
  const connection = new Connection(socket)
  onConnection(connection, req)
  if (head?.length) connection.receive(head)
}

export class Connection {
  constructor (socket) {
    this.socket = socket
    this.buffer = Buffer.alloc(0)
    this.fragments = []
    this.open = true
    this.lastSeen = Date.now()
    this.onmessage = null
    this.onclose = null
    socket.on('data', (data) => this.receive(data))
    socket.on('close', () => this.closed())
    socket.on('error', () => this.closed())
  }

  receive (data) {
    this.lastSeen = Date.now()
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, data]) : data
    while (this.open && this.buffer.length >= 2) {
      const first = this.buffer[0]
      const second = this.buffer[1]
      let length = second & 0x7f
      let offset = 2
      if (length === 126) {
        if (this.buffer.length < 4) return
        length = this.buffer.readUInt16BE(2)
        offset = 4
      } else if (length === 127) {
        if (this.buffer.length < 10) return
        const big = this.buffer.readBigUInt64BE(2)
        if (big > BigInt(MAX_MESSAGE)) return this.close(1009)
        length = Number(big)
        offset = 10
      }
      if (length > MAX_MESSAGE) return this.close(1009)
      // Browsers always mask what they send; anything else isn't a browser
      if (!(second & 0x80)) return this.close(1002)
      if (this.buffer.length < offset + 4 + length) return
      const mask = this.buffer.subarray(offset, offset + 4)
      const payload = Buffer.from(this.buffer.subarray(offset + 4, offset + 4 + length))
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3]
      this.buffer = this.buffer.subarray(offset + 4 + length)
      this.frame((first & 0x80) !== 0, first & 0x0f, payload)
    }
  }

  frame (fin, opcode, payload) {
    if (opcode === 0x8) return this.close() // close
    if (opcode === 0x9) return this.write(0xa, payload) // ping: pong
    if (opcode !== 0x1 && opcode !== 0x0) return // pong, binary
    this.fragments.push(payload)
    if (this.fragments.reduce((sum, part) => sum + part.length, 0) > MAX_MESSAGE) return this.close(1009)
    if (!fin) return
    const text = Buffer.concat(this.fragments).toString('utf8')
    this.fragments = []
    this.onmessage?.(text)
  }

  send (text) {
    if (!this.open) return
    if (this.socket.writableLength > MAX_BUFFERED) return this.close(1008)
    this.write(0x1, Buffer.from(text))
  }

  ping () {
    if (this.open) this.write(0x9, Buffer.alloc(0))
  }

  write (opcode, payload) {
    const length = payload.length
    let header
    if (length < 126) {
      header = Buffer.from([0x80 | opcode, length])
    } else if (length < 65536) {
      header = Buffer.alloc(4)
      header[0] = 0x80 | opcode
      header[1] = 126
      header.writeUInt16BE(length, 2)
    } else {
      header = Buffer.alloc(10)
      header[0] = 0x80 | opcode
      header[1] = 127
      header.writeBigUInt64BE(BigInt(length), 2)
    }
    this.socket.write(Buffer.concat([header, payload]))
  }

  close (code = 1000) {
    if (!this.open) return
    const body = Buffer.alloc(2)
    body.writeUInt16BE(code)
    try {
      this.write(0x8, body)
    } catch {
      // The socket may already be gone
    }
    this.socket.end()
    this.closed()
  }

  closed () {
    if (!this.open) return
    this.open = false
    this.onclose?.()
  }
}
