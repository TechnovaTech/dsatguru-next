'use client'
// Tiny fetch helpers for the IGCSC portal. The portal reuses DsatGuru's existing
// /api/admin/* endpoints, so every call carries the logged-in staff token.

export function authToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('igcsc_token')
}

export async function apiGet(path) {
  const res = await fetch(path, {
    headers: { Authorization: `Bearer ${authToken()}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}))
    throw new Error(msg?.error || `Request failed (${res.status})`)
  }
  return res.json()
}

export async function apiSend(path, method, body) {
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}))
    throw new Error(msg?.error || `Request failed (${res.status})`)
  }
  return res.json().catch(() => ({}))
}

// Fetch several endpoints at once; a failing one resolves to `fallback`
// instead of rejecting the whole page.
export async function apiGetSafe(path, fallback = null) {
  try {
    return await apiGet(path)
  } catch {
    return fallback
  }
}
