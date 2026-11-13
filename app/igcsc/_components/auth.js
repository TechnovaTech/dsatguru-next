'use client'
// IGCSC's own client-side session — separate localStorage keys from DsatGuru,
// so logging into IGCSC never touches the DsatGuru session and vice-versa.
export const IG_TOKEN = 'igcsc_token'
export const IG_USER = 'igcsc_user'

export function igcscLogin(token, user) {
  localStorage.setItem(IG_TOKEN, token)
  localStorage.setItem(IG_USER, JSON.stringify(user))
}
export function igcscLogout() {
  localStorage.removeItem(IG_TOKEN)
  localStorage.removeItem(IG_USER)
}
export function igcscToken() {
  return typeof window !== 'undefined' ? localStorage.getItem(IG_TOKEN) : null
}
export function igcscUser() {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem(IG_USER)) } catch { return null }
}
// Also REMOVES the stored igcsc_token/igcsc_user keys whenever it finds the
// token expired (or unreadable): every caller treats "expired" as "logged out"
// and routes to /igcsc/login, so leaving the dead keys behind only left a stale
// session lying around for other pages/tabs to trip over.
export function igcscTokenExpired(token) {
  let expired
  try {
    const p = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    expired = p.exp ? p.exp * 1000 <= Date.now() : false
  } catch { expired = true }
  if (expired && typeof window !== 'undefined') {
    try { igcscLogout() } catch { /* storage unavailable: nothing to clear */ }
  }
  return expired
}
