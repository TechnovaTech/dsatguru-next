'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiAlertCircle } from 'react-icons/fi'
import { igcscLogin, igcscToken, igcscTokenExpired } from '../_components/auth'
import { siteFontVars } from '../../components/siteFonts'

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
    <div className={`${siteFontVars} ig min-h-screen`}>
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
        <div className="flex w-full max-w-4xl border border-line bg-surface animate-rise">
          {/* Brand panel */}
          <div className="relative hidden w-1/2 flex-col justify-between bg-cta p-10 text-on-cta md:flex">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center bg-brand font-display text-lg text-on-brand">iG</span>
              <div className="leading-none">
                <div className="display text-[22px] text-on-cta">IGCSC</div>
                <div className="mt-1 font-code text-[10px] uppercase tracking-[0.18em] text-on-cta/60">Assessment Suite</div>
              </div>
            </div>
            <div>
              <h2 className="display text-[2rem] leading-[1.1] text-on-cta">The complete IGCSE <em className="accent">assessment</em> platform.</h2>
              <p className="mt-4 text-sm leading-relaxed text-on-cta/70">Exam papers, timed online tests, AI-marked written answers and live classes — all in one place.</p>
            </div>
            <div className="font-code text-[10px] uppercase tracking-[0.12em] text-on-cta/50">© IGCSC Assessment Suite</div>
          </div>

          {/* Form */}
          <div className="flex w-full flex-col justify-center p-8 md:w-1/2 md:p-12">
            <div className="mb-6 flex items-center gap-2.5 md:hidden">
              <span className="flex h-9 w-9 items-center justify-center bg-cta font-display text-base text-on-cta">iG</span>
              <span className="display text-xl text-ink">IGCSC</span>
            </div>
            <p className="font-code text-[11px] uppercase tracking-[0.12em] text-muted">01 · Welcome back</p>
            <h1 className="display mt-2 text-[2rem] leading-tight text-ink">Sign <em className="accent">in</em></h1>
            <p className="mt-1 text-sm text-muted">Enter your IGCSC credentials to continue.</p>

            {error && (
              <div className="mt-4 flex items-center gap-2 border-l-2 border-negative bg-[#b4231814] px-3.5 py-2.5 text-sm text-negative" role="alert">
                <FiAlertCircle size={15} /> {error}
              </div>
            )}

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block font-code text-[11px] uppercase tracking-[0.12em] text-muted">Email</label>
                <div className="relative">
                  <FiMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" size={16} />
                  <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@igcsc.com"
                    className="w-full border border-line bg-surface py-2.5 pl-10 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-subtle focus:border-ink" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block font-code text-[11px] uppercase tracking-[0.12em] text-muted">Password</label>
                <div className="relative">
                  <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" size={16} />
                  <input type={showPw ? 'text' : 'password'} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Your password"
                    className="w-full border border-line bg-surface py-2.5 pl-10 pr-10 text-sm text-ink outline-none transition-colors placeholder:text-subtle focus:border-ink" />
                  <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle transition-colors hover:text-ink">
                    {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="group flex h-11 w-full items-center justify-center gap-2 bg-cta px-5 text-sm font-medium text-on-cta transition-colors hover:bg-cta-hover disabled:opacity-60">
                {loading ? 'Signing in…' : <>Sign in <FiArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></>}
              </button>
              <p className="mt-4 text-center text-sm text-muted">
                New student?{' '}
                <a href="/igcsc/register" className="link-rule font-medium text-ink">Create an account</a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
