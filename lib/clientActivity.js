// Lightweight client-side activity logger. Fire-and-forget; never throws.

// Turn a route into a readable label, e.g. "/dashboard/tutor/math" -> "Tutor / Math",
// "/dashboard/tests/<id>/start" -> "Tests / # / Start".
export function prettyPath(p) {
  if (!p) return ''
  const parts = p.split('/').filter(Boolean)
    .filter(s => !['dashboard', 'admin'].includes(s))
    .map(s => /^[0-9a-f]{24}$/i.test(s) ? '#' : s)
  if (!parts.length) return p.includes('/admin') ? 'Admin Dashboard' : 'Dashboard'
  return parts.map(s => s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(' / ')
}

export function logActivity(type, action, meta) {
  try {
    if (typeof window === 'undefined') return
    const token = window.localStorage.getItem('token')
    if (!token) return
    fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type, action, meta }),
      keepalive: true, // let logout / unload events still send
    }).catch(() => {})
  } catch { /* ignore */ }
}
