'use client'
import { useState, useEffect } from 'react'
import { FiTool } from 'react-icons/fi'

export default function MaintenancePage({ siteName = 'DSATGURU', endsAt = null }) {
  const [remaining, setRemaining] = useState(() =>
    endsAt ? Math.max(0, new Date(endsAt).getTime() - Date.now()) : null
  )

  useEffect(() => {
    if (!endsAt) return
    const tick = () => {
      const ms = Math.max(0, new Date(endsAt).getTime() - Date.now())
      setRemaining(ms)
      // Timer elapsed → re-check settings (maintenance is now auto-off).
      if (ms <= 0) window.location.reload()
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  const fmt = (ms) => {
    const total = Math.floor(ms / 1000)
    const d = Math.floor(total / 86400)
    const h = Math.floor((total % 86400) / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    const pad = (n) => String(n).padStart(2, '0')
    return `${d > 0 ? `${d}d ` : ''}${pad(h)}:${pad(m)}:${pad(s)}`
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
          <FiTool size={30} />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">{siteName} is under maintenance</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          We&rsquo;re making things better and will be back shortly. Thank you for your patience.
        </p>

        {endsAt && remaining != null && remaining > 0 && (
          <div className="mt-6 rounded-xl bg-slate-50 px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Back online in</p>
            <p className="mt-1 font-mono text-2xl font-bold text-indigo-600">{fmt(remaining)}</p>
            <p className="mt-2 text-xs text-slate-400">Expected back by {new Date(endsAt).toLocaleString()}</p>
          </div>
        )}

        <p className="mt-6 text-xs text-slate-400">
          Administrator?{' '}
          <a href="/login" className="font-semibold text-indigo-600 hover:underline">Log in</a>{' '}
          to manage the site.
        </p>
      </div>
    </div>
  )
}
