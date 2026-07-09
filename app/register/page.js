'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { FiArrowLeft, FiArrowRight, FiEye, FiEyeOff, FiMail, FiLock, FiUser, FiShield, FiCheck } from 'react-icons/fi'
import { useAuth, isTokenExpired, roleHome } from '../components/AuthContext'
import axios from 'axios'

const perks = [
  'Full access to DSAT & PSAT programs, live classes, and schedules',
  'A personalized study plan — know exactly what to practice daily',
  'Dashboards, analytics, and full test history to track every gain',
]

function BrandPanel({ kicker, title, subtitle }) {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-700 p-10 text-white md:flex md:w-1/2">
      <div className="dg-blob pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
      <div className="dg-blob-slow pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="absolute inset-0 dg-grid-bg opacity-[0.12]" />
      <div className="relative">
        <Link href="/" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-100 transition-colors hover:text-white">
          <FiArrowLeft /> Back to home
        </Link>
        <Image src="/logo-dsg-white.png" alt="DSATGURU" width={242} height={176} className="mt-8 h-14 w-auto object-contain" />
        <span className="mt-8 inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]">
          {kicker}
        </span>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight">{title}</h1>
        <p className="mt-3 max-w-sm text-sm text-indigo-100/90">{subtitle}</p>
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
        <p className="font-semibold text-white">Questions before you sign up?</p>
        <p>Email <a className="underline" href="mailto:info@dsatguru.com">info@dsatguru.com</a> or call 1-329-239-8577.</p>
      </div>
    </div>
  )
}

export default function Register() {
  const router = useRouter()
  const { login } = useAuth()
  // Resume the pre-signup flow (e.g. enrollment) after the account is created.
  const [returnTo, setReturnTo] = useState('')
  useEffect(() => {
    try { setReturnTo(new URLSearchParams(window.location.search).get('returnTo') || '') } catch {}
  }, [])

  // Already signed in with a still-valid token? No need to register — go home.
  useEffect(() => {
    try {
      const token = localStorage.getItem('token')
      const raw = localStorage.getItem('user')
      if (token && raw && !isTokenExpired(token)) {
        router.replace(roleHome(JSON.parse(raw).role))
      }
    } catch {}
  }, [router])

  const [step, setStep] = useState('form')
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [otp, setOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [resendCooldown, setResendCooldown] = useState(0)

  const validateField = (name, value) => {
    switch (name) {
      case 'name': return !value ? 'Name is required' : value.length < 3 ? 'Min 3 characters' : ''
      case 'email': return !value ? 'Email is required' : !/\S+@\S+\.\S+/.test(value) ? 'Invalid email' : ''
      case 'password': return !value ? 'Password is required' : value.length < 6 ? 'Minimum 6 characters' : ''
      case 'confirmPassword': return !value ? 'Please confirm your password' : value !== formData.password ? 'Passwords must match' : ''
      default: return ''
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (touched[name]) setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
    if (name === 'password' && touched.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: value !== formData.confirmPassword ? 'Passwords must match' : '' }))
    }
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
  }

  const startCooldown = () => {
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown((prev) => { if (prev <= 1) { clearInterval(interval); return 0 } return prev - 1 })
    }, 1000)
  }

  const handleSendOTP = async (e) => {
    e.preventDefault()
    const newErrors = {}
    Object.keys(formData).forEach((k) => { newErrors[k] = validateField(k, formData[k]) })
    setErrors(newErrors)
    setTouched({ name: true, email: true, password: true, confirmPassword: true })
    if (Object.values(newErrors).some((er) => er)) return
    setLoading(true)
    try {
      await axios.post('/api/auth/send-otp', { email: formData.email, type: 'register', name: formData.name, password: formData.password })
      setStep('otp')
      startCooldown()
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || 'Failed to send OTP. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    if (!otp || otp.length !== 6) { setErrors({ otp: 'Please enter the 6-digit code' }); return }
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/verify-otp', { email: formData.email, otp, type: 'register' })
      login(res.data.token, res.data.user)
      router.push(returnTo || '/dashboard')
    } catch (err) {
      setErrors({ otp: err.response?.data?.error || 'Invalid OTP. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setLoading(true)
    try {
      await axios.post('/api/auth/send-otp', { email: formData.email, type: 'register', name: formData.name, password: formData.password })
      setOtp('')
      setErrors({})
      startCooldown()
    } catch (err) {
      setErrors({ otp: err.response?.data?.error || 'Failed to resend OTP' })
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
        <BrandPanel
          kicker="Create your profile"
          title="One account for all your DSAT learning"
          subtitle="Build a personalized prep journey with live courses, adaptive tests, and clear score tracking."
        />

        <div className="flex w-full flex-col justify-center p-8 md:w-1/2 md:p-10">
          <div className="mb-5 md:hidden">
            <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600"><FiArrowLeft /> Back to home</Link>
          </div>

          {step === 'form' ? (
            <>
              <h2 className="text-2xl font-extrabold text-slate-900">Create your account</h2>
              <p className="mt-1 text-sm text-slate-500">We&apos;ll send a verification code to your email.</p>

              <form onSubmit={handleSendOTP} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Full Name</label>
                  <div className="relative">
                    <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" name="name" placeholder="John Doe" className={inputCls('name')} value={formData.name} onChange={handleChange} onBlur={handleBlur} />
                  </div>
                  {errors.name && touched.name && <p className="mt-1 text-xs font-medium text-rose-500">{errors.name}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email Address</label>
                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" name="email" placeholder="you@example.com" className={inputCls('email')} value={formData.email} onChange={handleChange} onBlur={handleBlur} />
                  </div>
                  {errors.email && touched.email && <p className="mt-1 text-xs font-medium text-rose-500">{errors.email}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type={showPassword ? 'text' : 'password'} name="password" placeholder="Create your password" className={inputCls('password')} value={formData.password} onChange={handleChange} onBlur={handleBlur} />
                    <button type="button" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setShowPassword((p) => !p)}>{showPassword ? <FiEyeOff /> : <FiEye />}</button>
                  </div>
                  {errors.password && touched.password && <p className="mt-1 text-xs font-medium text-rose-500">{errors.password}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Confirm Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" placeholder="Re-enter your password" className={inputCls('confirmPassword')} value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur} />
                    <button type="button" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setShowConfirmPassword((p) => !p)}>{showConfirmPassword ? <FiEyeOff /> : <FiEye />}</button>
                  </div>
                  {errors.confirmPassword && touched.confirmPassword && <p className="mt-1 text-xs font-medium text-rose-500">{errors.confirmPassword}</p>}
                </div>

                {errors.submit && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{errors.submit}</p>}

                <button type="submit" disabled={loading} className="dg-shine group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 disabled:opacity-60">
                  {loading ? 'Sending OTP…' : 'Continue'} {!loading && <FiArrowRight className="transition-transform group-hover:translate-x-1" />}
                </button>

                <p className="text-center text-sm text-slate-600">
                  Already have an account? <Link href={returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login'} className="font-semibold text-indigo-600 hover:underline">Login here</Link>
                </p>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600"><FiShield size={22} /></div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Verify your email</h2>
                  <p className="text-sm text-slate-500">Code sent to <span className="font-medium text-slate-700">{formData.email}</span></p>
                </div>
              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Enter 6-digit code</label>
                  <input
                    type="text" inputMode="numeric" maxLength={6}
                    value={otp} onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setErrors({}) }}
                    placeholder="000000"
                    className={`w-full rounded-xl border py-3.5 text-center text-2xl font-bold tracking-[0.5em] text-slate-800 focus:outline-none focus:ring-4 ${errors.otp ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'}`}
                  />
                  {errors.otp && <p className="mt-1 text-center text-xs font-medium text-rose-500">{errors.otp}</p>}
                  <p className="mt-2 text-center text-xs text-slate-500">Can&apos;t find it? Check your spam or promotions folder — the code expires in 10 minutes.</p>
                </div>

                <button type="submit" disabled={loading || otp.length !== 6} className="inline-flex w-full items-center justify-center rounded-full bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 disabled:opacity-60">
                  {loading ? 'Verifying…' : 'Verify & Create Account'}
                </button>

                <div className="text-center">
                  <p className="mb-1 text-sm text-slate-500">Didn&apos;t receive the code?</p>
                  <button type="button" onClick={handleResend} disabled={resendCooldown > 0 || loading} className="text-sm font-semibold text-indigo-600 hover:underline disabled:text-slate-400 disabled:no-underline">
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                  </button>
                </div>

                <button type="button" onClick={() => { setStep('form'); setOtp(''); setErrors({}) }} className="flex w-full items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-700">
                  <FiArrowLeft size={14} /> Change email or details
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-xs text-slate-500 md:hidden">
            Trouble signing in? Email <a className="font-semibold text-indigo-600 hover:underline" href="mailto:info@dsatguru.com">info@dsatguru.com</a>
          </p>
        </div>
      </motion.div>
    </section>
  )
}
