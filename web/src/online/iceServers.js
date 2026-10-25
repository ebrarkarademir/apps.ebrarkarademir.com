// How two devices find a network path to each other.
//
// STUN servers tell each device its public address so they can connect directly. That fails
// between many networks (mobile data, routers that isolate devices), and then the traffic has
// to go through a TURN relay. PeerJS's built-in relay servers no longer exist, so the relay
// comes from build-time settings (see .env.example):
//   VITE_TURN_URLS=turn:relay.example.com:3478,turns:relay.example.com:443?transport=tcp
//   VITE_TURN_USERNAME=...
//   VITE_TURN_CREDENTIAL=...
const env = import.meta.env

const turnUrls = (env.VITE_TURN_URLS || '').split(',').map(url => url.trim()).filter(Boolean)

export const iceServers = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: 'stun:stun.cloudflare.com:3478' },
  ...(turnUrls.length
    ? [{ urls: turnUrls, username: env.VITE_TURN_USERNAME, credential: env.VITE_TURN_CREDENTIAL }]
    : [])
]
