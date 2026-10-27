// End-to-end encryption for chats between online users. Each tab makes an ECDH key pair when it
// opens and shares only the public half; two tabs derive the same AES-GCM key from their pairs,
// so the public broker that carries the chat, and anyone listening on it, only ever sees
// ciphertext. The private key can't be exported and only lives in the tab's memory: once the
// tab closes, nothing it sent or received can be read again.
//
// Web Crypto only exists on secure pages (https and localhost), so elsewhere chat is off.

const subtle = globalThis.crypto?.subtle
const CURVE = { name: 'ECDH', namedCurve: 'P-256' }

export const canEncrypt = !!subtle

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const toBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)))
const fromBase64 = (text) => Uint8Array.from(atob(text), char => char.charCodeAt(0))

/** A new key pair: the private key, and the public key as base64 to share. */
export async function makeKeys () {
  const pair = await subtle.generateKey(CURVE, false, ['deriveKey'])
  return { privateKey: pair.privateKey, publicKey: toBase64(await subtle.exportKey('raw', pair.publicKey)) }
}

/** The chat key two tabs share: my private key with their public key gives the same as theirs with mine. */
export async function sharedKey (privateKey, theirPublicKey) {
  const theirs = await subtle.importKey('raw', fromBase64(theirPublicKey), CURVE, false, [])
  return subtle.deriveKey({ name: 'ECDH', public: theirs }, privateKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

export async function seal (key, message) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = await subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(message)))
  return { iv: toBase64(iv), data: toBase64(data) }
}

/** Rejects if the message was changed on the way or wasn't sealed with this key. */
export async function unseal (key, { iv, data }) {
  const plain = await subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, key, fromBase64(data))
  return JSON.parse(decoder.decode(plain))
}
