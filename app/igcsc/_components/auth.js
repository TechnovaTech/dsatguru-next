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
export function igcscTokenExpired(token) {
  try {
    const p = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return p.exp ? p.exp * 1000 <= Date.now() : false
  } catch { return true }
}
