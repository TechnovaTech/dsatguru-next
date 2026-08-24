'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiAlertCircle } from 'react-icons/fi'
import { igcscLogin, igcscToken, igcscTokenExpired } from '../_components/auth'

export default function IgcscLoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Already signed in with a valid IGCSC token? Skip the form.
  useEffect(() => {
    const t = igcscToken()
    if (t && !igcscTokenExpired(t)) router.replace('/igcsc')
  }, [router])

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/igcsc/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim(), password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Login failed')
      igcscLogin(data.token, data.user)
      router.push('/igcsc')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Brand panel */}
        <div className="relative hidden w-1/2 flex-col justify-between bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-700 p-10 text-white md:flex">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-lg font-black ring-1 ring-white/25">iG</span>
            <div className="leading-none">
              <div className="text-xl font-extrabold tracking-tight">IGCSC</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-200">Assessment Suite</div>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-bold leading-snug">The complete IGCSE assessment platform.</h2>
            <p className="mt-3 text-sm text-indigo-100">Question banks, exams, oral tests and live student tracking — all in one place.</p>
          </div>
          <div className="text-xs text-indigo-200/80">© IGCSC Assessment Suite</div>
        </div>

        {/* Form */}
        <div className="flex w-full flex-col justify-center p-8 md:w-1/2 md:p-12">
          <div className="mb-6 flex items-center gap-2.5 md:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-sm font-black text-white">iG</span>
            <span className="text-lg font-extrabold text-slate-900">IGCSC</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">Enter your IGCSC credentials to continue.</p>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">
              <FiAlertCircle size={15} /> {error}
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Email</label>
              <div className="relative">
                <FiMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@igcsc.com"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Password</label>
              <div className="relative">
                <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type={showPw ? 'text' : 'password'} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Your password"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-10 text-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100" />
                <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60">
              {loading ? 'Signing in…' : <>Sign in <FiArrowRight size={16} /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
