'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiUser, FiMail, FiLock, FiLoader, FiAlertCircle } from 'react-icons/fi'
import { igcscLogin } from '../_components/auth'
import { siteFontVars } from '../../components/siteFonts'

// Student self-registration for the IGCSC portal. Staff accounts are created by
// an admin — this route only ever mints the 'student' role, server-side.
export default function IgcscRegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e?.preventDefault()
    setError('')
    if (!form.name.trim()) return setError('Please enter your name.')
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Please enter a valid email address.')
    if (form.password.length < 6) return setError('Your password must be at least 6 characters.')
    if (form.password !== form.confirm) return setError('The two passwords do not match.')

    setBusy(true)
    try {
      const res = await fetch('/api/igcsc/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim().toLowerCase(), password: form.password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Could not create your account.')
      igcscLogin(data.token, data.user)
      router.push('/igcsc')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`${siteFontVars} ig min-h-screen`}>
      <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
        <div className="w-full max-w-md animate-rise">
          <div className="mb-6 flex items-center justify-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center bg-cta font-display text-lg text-on-cta">iG</span>
            <div className="leading-none">
              <p className="display text-[22px] text-ink">IGCSC</p>
              <p className="mt-1 font-code text-[10px] uppercase tracking-[0.16em] text-brand">Assessment Suite</p>
            </div>
          </div>

          <form onSubmit={submit} className="border border-line bg-surface p-7">
            <p className="font-code text-[11px] uppercase tracking-[0.12em] text-muted">New student</p>
            <h1 className="display mt-1 text-[1.6rem] leading-tight text-ink">Create your <em className="accent">account</em></h1>
            <p className="mt-1 mb-5 text-sm text-muted">Practise from the question bank and join your live classes.</p>

            {error && (
              <div className="mb-4 flex items-start gap-2 border-l-2 border-negative bg-[#b4231814] px-3.5 py-2.5 text-sm text-negative" role="alert">
                <FiAlertCircle className="mt-0.5 flex-shrink-0" size={15} /> {error}
              </div>
            )}

            <Field icon={FiUser} label="Full name" value={form.name} onChange={set('name')} placeholder="Riya Shah" autoFocus />
            <Field icon={FiMail} label="Email" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
            <Field icon={FiLock} label="Password" type="password" value={form.password} onChange={set('password')} placeholder="At least 6 characters" />
            <Field icon={FiLock} label="Confirm password" type="password" value={form.confirm} onChange={set('confirm')} placeholder="Type it again" />

            <button type="submit" disabled={busy}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 bg-cta px-5 text-sm font-medium text-on-cta transition-colors hover:bg-cta-hover disabled:opacity-60">
              {busy ? <><FiLoader className="h-4 w-4 animate-spin" /> Creating…</> : 'Create account'}
            </button>

            <p className="mt-4 text-center text-sm text-muted">
              Already have an account?{' '}
              <Link href="/igcsc/login" className="link-rule font-medium text-ink">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

// Declared at module scope: a component defined inside the page would be a new
// type on every render and the focused input would be unmounted each keystroke.
function Field({ icon: Icon, label, type = 'text', ...rest }) {
  return (
    <div className="mb-3">
      <label className="mb-1.5 block font-code text-[11px] uppercase tracking-[0.12em] text-muted">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" size={15} />
        <input
          type={type}
          className="w-full border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-subtle focus:border-ink"
          {...rest}
        />
      </div>
    </div>
  )
}
