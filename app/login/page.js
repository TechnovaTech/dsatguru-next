'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FiArrowLeft, FiArrowRight, FiEye, FiEyeOff, FiMail, FiLock, FiCheck, FiAlertCircle } from 'react-icons/fi'
import { useAuth, isTokenExpired, roleHome } from '../components/AuthContext'
import axios from 'axios'

const perks = [
  'Resume live classes and practice tests where you left off',
  'Track strengths, weaknesses, and score gains over time',
  'Premium question banks, assignments, and materials 24/7',
]

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [authError, setAuthError] = useState('')
  const router = useRouter()
  const { login } = useAuth()
  // Where to go after login when the user was sent here mid-flow (e.g. from an
  // enrollment page). Falls back to the role-based default.
  const [returnTo, setReturnTo] = useState('')
  useEffect(() => {
    try { setReturnTo(new URLSearchParams(window.location.search).get('returnTo') || '') } catch {}
  }, [])

  // Already signed in with a still-valid token? Skip the form and send them home.
  useEffect(() => {
    try {
      const token = localStorage.getItem('token')
      const raw = localStorage.getItem('user')
      if (token && raw && !isTokenExpired(token)) {
        const u = JSON.parse(raw)
        // IGCSC-branded staff land in the dedicated IGCSC portal.
        if ((u.email || '').toLowerCase().endsWith('@igcsc.com') && ['Admin', 'TutorAdmin'].includes(u.role)) {
          router.replace('/igcsc')
        } else {
          router.replace(roleHome(u.role))
        }
      }
    } catch {}
  }, [router])

  const validateField = (name, value) => {
    switch (name) {
      case 'email': return !value ? 'Email is required' : !/\S+@\S+\.\S+/.test(value) ? 'Invalid email' : ''
      case 'password': return !value ? 'Password is required' : value.length < 6 ? 'Minimum 6 characters' : ''
      default: return ''
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (touched[name]) setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setAuthError('')
    const newErrors = {}
    Object.keys(formData).forEach((key) => { newErrors[key] = validateField(key, formData[key]) })
    setErrors(newErrors)
    setTouched({ email: true, password: true })
    if (Object.values(newErrors).some((err) => err !== '')) return

    setLoading(true)
    try {
      const cleanData = { email: formData.email.trim(), password: formData.password.trim() }
      const response = await axios.post('/api/auth/login', cleanData)
      login(response.data.token, response.data.user)
      const u = response.data.user
      const role = u.role
      // IGCSC-branded staff accounts open the dedicated IGCSC portal.
      if ((u.email || '').toLowerCase().endsWith('@igcsc.com') && ['Admin', 'TutorAdmin'].includes(role)) router.push('/igcsc')
      else if (role === 'Admin') router.push('/admin')
      else if (role === 'TutorAdmin') router.push('/admin/tutor/question-bank')
      else if (role === 'Tutor') router.push('/tutor/dashboard')
      else router.push(returnTo || '/dashboard')
    } catch (error) {
      console.error('Login error:', error)
      const status = error.response?.status
      if (status === 429) {
        setAuthError('Too many attempts. Please wait a moment and try again.')
      } else if (status === 401) {
        setAuthError('Invalid email or password. Please check your credentials.')
      } else if (status === 403) {
        setAuthError(error.response?.data?.error || 'Your account access is restricted. Please contact support.')
      } else if (!error.response) {
        setAuthError('Network error. Please check your connection and try again.')
      } else {
        setAuthError(error.response?.data?.error || 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputCls = (f) =>
    `w-full rounded-xl border bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 transition-all placeholder:text-slate-400 focus:outline-none focus:ring-4 ${
      errors[f] && touched[f] ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
    }`

  return (
    <section className="dg flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-4 py-10">
      <motion.div
        initial={{ opacity: 1, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="flex w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl"
      >
        {/* Brand panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-700 p-10 text-white md:flex md:w-1/2">
          <div className="dg-blob pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
          <div className="dg-blob-slow pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="absolute inset-0 dg-grid-bg opacity-[0.12]" />
          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-100 transition-colors hover:text-white">
              <FiArrowLeft /> Back to home
            </Link>
            <Image src="/logo-dsg-white.png" alt="DSATGURU" width={242} height={176} className="mt-8 h-14 w-auto object-contain" />
            <span className="mt-8 inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]">Welcome back</span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight">Continue your DSAT prep journey</h1>
            <p className="mt-3 max-w-sm text-sm text-indigo-100/90">
              Sign in to unlock your personalized dashboard, adaptive practice tests, and detailed analytics.
            </p>
            <ul className="mt-7 space-y-3">
              {perks.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm text-indigo-50/95">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/20"><FiCheck size={11} /></span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mt-8 text-xs text-indigo-100/80">
            <p className="font-semibold text-white">Need help logging in?</p>
            <p>Email <a className="underline" href="mailto:info@dsatguru.com">info@dsatguru.com</a> or call 1-329-239-8577.</p>
          </div>
        </div>

        {/* Form panel */}
        <div className="flex w-full flex-col justify-center p-8 md:w-1/2 md:p-10">
          <div className="mb-5 md:hidden">
            <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600"><FiArrowLeft /> Back to home</Link>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900">Login to DSATGURU</h2>
          <p className="mt-1 text-sm text-slate-500">Access your dashboard, tests, and course progress in one place.</p>

          {authError && (
            <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              <FiAlertCircle className="flex-shrink-0" /> {authError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" id="email" name="email" placeholder="example@email.com" className={inputCls('email')} value={formData.email} onChange={handleChange} onBlur={handleBlur} />
              </div>
              {errors.email && touched.email && <p className="mt-1 text-xs font-medium text-rose-500">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPassword ? 'text' : 'password'} id="password" name="password" placeholder="Enter your password" className={inputCls('password')} value={formData.password} onChange={handleChange} onBlur={handleBlur} />
                <button type="button" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setShowPassword((p) => !p)}>{showPassword ? <FiEyeOff /> : <FiEye />}</button>
              </div>
              {errors.password && touched.password && <p className="mt-1 text-xs font-medium text-rose-500">{errors.password}</p>}
            </div>

            <div className="text-right">
              <Link href="/forgot-password" className="text-sm font-semibold text-indigo-600 hover:underline">Forgot Password?</Link>
            </div>

            <button type="submit" disabled={loading} className="dg-shine group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 disabled:opacity-60">
              {loading ? 'Logging in…' : 'Login'} {!loading && <FiArrowRight className="transition-transform group-hover:translate-x-1" />}
            </button>

            <p className="text-center text-sm text-slate-600">
              Don&apos;t have an account? <Link href={returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : '/register'} className="font-semibold text-indigo-600 hover:underline">Create one</Link>
            </p>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500 md:hidden">
            Trouble signing in? Email <a className="font-semibold text-indigo-600 hover:underline" href="mailto:info@dsatguru.com">info@dsatguru.com</a>
          </p>
        </div>
      </motion.div>
    </section>
  )
}
