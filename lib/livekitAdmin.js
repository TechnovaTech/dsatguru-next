import { RoomServiceClient } from 'livekit-server-sdk'

// Server-side LiveKit admin calls (closing a room, listing participants).
//
// The browser reaches LiveKit over `wss://…/livekit` through nginx, but the
// app runs on the same host as the container, so admin calls should go
// straight to it: no TLS handshake, no proxy hop, and it keeps working even if
// the public hostname changes. Set LIVEKIT_HOST_URL to override.
const LOCAL_FALLBACK = 'http://127.0.0.1:7880'

export function livekitHost() {
  if (process.env.LIVEKIT_HOST_URL) return process.env.LIVEKIT_HOST_URL
  const ws = process.env.LIVEKIT_WS_URL || ''
  try {
    const u = new URL(ws.replace(/^ws/, 'http'))
    // The SDK builds an ABSOLUTE /twirp/... path, discarding anything after the
    // origin. So `wss://host/livekit` would post to `https://host/twirp/...`,
    // which nginx hands to the web app — a silent 404. Only a bare origin is
    // usable; anything else falls back to the local server.
    if (u.pathname && u.pathname !== '/') {
      console.warn(
        `LIVEKIT_WS_URL has a path (${u.pathname}) and cannot be used for admin calls. ` +
        `Falling back to ${LOCAL_FALLBACK} — set LIVEKIT_HOST_URL to silence this.`
      )
      return LOCAL_FALLBACK
    }
    return u.origin
  } catch {
    return LOCAL_FALLBACK
  }
}

export function roomService() {
  const key = process.env.LIVEKIT_API_KEY
  const secret = process.env.LIVEKIT_API_SECRET
  if (!key || !secret) return null
  return new RoomServiceClient(livekitHost(), key, secret)
}

/**
 * Disconnect everyone from a room. Returns true when the room was closed.
 * Never throws — ending a class must not fail because the media server hiccuped.
 */
export async function closeRoom(room) {
  if (!room) return false
  const svc = roomService()
  if (!svc) return false
  try {
    await svc.deleteRoom(String(room))
    return true
  } catch (e) {
    // A room nobody ever joined does not exist server-side; that is a success
    // from the caller's point of view.
    const msg = String(e?.message || '')
    if (/not.?found/i.test(msg)) return true
    console.error('closeRoom failed for', room, '-', msg)
    return false
  }
}
