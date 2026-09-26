'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiUser, FiMail, FiLock, FiLoader, FiAlertCircle } from 'react-icons/fi'
import { igcscLogin } from '../_components/auth'

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-lg font-black text-white">iG</span>
          <div>
            <p className="text-xl font-extrabold text-slate-900">IGCSC</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-600">Assessment Suite</p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <h1 className="text-lg font-extrabold text-slate-900">Create your student account</h1>
          <p className="mt-1 mb-5 text-sm text-slate-500">Practise from the question bank and join your live classes.</p>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <FiAlertCircle className="mt-0.5 flex-shrink-0" size={15} /> {error}
            </div>
          )}

          <Field icon={FiUser} label="Full name" value={form.name} onChange={set('name')} placeholder="Riya Shah" autoFocus />
          <Field icon={FiMail} label="Email" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
          <Field icon={FiLock} label="Password" type="password" value={form.password} onChange={set('password')} placeholder="At least 6 characters" />
          <Field icon={FiLock} label="Confirm password" type="password" value={form.confirm} onChange={set('confirm')} placeholder="Type it again" />

          <button type="submit" disabled={busy}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60">
            {busy ? <><FiLoader className="h-4 w-4 animate-spin" /> Creating…</> : 'Create account'}
          </button>

          <p className="mt-4 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/igcsc/login" className="font-semibold text-indigo-600 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

// Declared at module scope: a component defined inside the page would be a new
// type on every render and the focused input would be unmounted each keystroke.
function Field({ icon: Icon, label, type = 'text', ...rest }) {
  return (
    <div className="mb-3">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
        <input
          type={type}
          className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
          {...rest}
        />
      </div>
    </div>
  )
}
