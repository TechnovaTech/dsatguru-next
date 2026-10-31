'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiArrowLeft, FiArrowRight, FiEye, FiEyeOff, FiMail, FiLock, FiUser, FiShield } from 'react-icons/fi'
import { useAuth, isTokenExpired, roleHome } from '../components/AuthContext'
import axios from 'axios'
import { Alert, AuthShell, EyeToggle, Field, FormTitle, codeInput, fieldInput, primaryButton, textLink } from '../components/site/auth'

const perks = [
  'Full access to DSAT & PSAT programs, live classes, and schedules',
  'A personalized study plan — know exactly what to practice daily',
  'Dashboards, analytics, and full test history to track every gain',
]

export default function Register() {
  const router = useRouter()
  const { login } = useAuth()
  // Resume the pre-signup flow (e.g. enrollment) after the account is created.
  const [returnTo, setReturnTo] = useState('')
  useEffect(() => {
    try {
      const raw = new URLSearchParams(window.location.search).get('returnTo') || ''
      // Same-origin paths only: blocks //evil.com, https://…, and javascript: payloads.
      setReturnTo(/^\/(?![\/\\])/.test(raw) ? raw : '')
    } catch {}
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

  return (
    <AuthShell
      kicker="Create your profile"
      title="One account for all your DSAT learning"
      subtitle="Build a personalized prep journey with live courses, adaptive tests, and clear score tracking."
      perks={perks}
      helpTitle="Questions before you sign up?"
    >
      {step === 'form' ? (
        <>
          <FormTitle title="Create your account" subtitle="We'll send a verification code to your email." />
          <form onSubmit={handleSendOTP} noValidate className="mt-7 grid gap-5">
            <Field label="Full Name" htmlFor="name" icon={FiUser} error={touched.name && errors.name}>
              <input type="text" id="name" name="name" placeholder="John Doe" autoComplete="name" className={fieldInput} value={formData.name} onChange={handleChange} onBlur={handleBlur} />
            </Field>
            <Field label="Email Address" htmlFor="email" icon={FiMail} error={touched.email && errors.email}>
              <input type="email" id="email" name="email" placeholder="you@example.com" autoComplete="email" className={fieldInput} value={formData.email} onChange={handleChange} onBlur={handleBlur} />
            </Field>
            <Field
              label="Password"
              htmlFor="password"
              icon={FiLock}
              error={touched.password && errors.password}
              after={<EyeToggle shown={showPassword} onToggle={() => setShowPassword((p) => !p)} Eye={FiEye} EyeOff={FiEyeOff} />}
            >
              <input type={showPassword ? 'text' : 'password'} id="password" name="password" placeholder="Create your password" autoComplete="new-password" className={fieldInput} value={formData.password} onChange={handleChange} onBlur={handleBlur} />
            </Field>
            <Field
              label="Confirm Password"
              htmlFor="confirmPassword"
              icon={FiLock}
              error={touched.confirmPassword && errors.confirmPassword}
              after={<EyeToggle shown={showConfirmPassword} onToggle={() => setShowConfirmPassword((p) => !p)} Eye={FiEye} EyeOff={FiEyeOff} />}
            >
              <input type={showConfirmPassword ? 'text' : 'password'} id="confirmPassword" name="confirmPassword" placeholder="Re-enter your password" autoComplete="new-password" className={fieldInput} value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur} />
            </Field>
            {errors.submit && <Alert>{errors.submit}</Alert>}
            <button type="submit" disabled={loading} className={primaryButton}>
              {loading ? 'Sending OTP…' : 'Continue'} {!loading && <FiArrowRight className="transition-transform group-hover:translate-x-1" />}
            </button>
            <p className="text-center text-[14.5px] text-muted">
              Already have an account?{' '}
              <Link href={returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login'} className={textLink}>
                Login here
              </Link>
            </p>
          </form>
        </>
      ) : (
        <>
          <FormTitle
            icon={FiShield}
            title="Verify your email"
            subtitle={
              <>
                Code sent to <span className="font-medium text-ink">{formData.email}</span>
              </>
            }
          />
          <form onSubmit={handleVerifyOTP} className="mt-7 grid gap-5">
            <div>
              <label htmlFor="otp" className="mb-1.5 block text-[14px] font-medium text-ink">
                Enter 6-digit code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setErrors({}) }}
                placeholder="000000"
                className={codeInput(errors.otp)}
              />
              {errors.otp && <p className="mt-1.5 text-center text-[13px] text-negative">{errors.otp}</p>}
              <p className="mt-2 text-center text-[13px] text-muted">Can&apos;t find it? Check your spam or promotions folder — the code expires in 10 minutes.</p>
            </div>
            <button type="submit" disabled={loading || otp.length !== 6} className={primaryButton}>
              {loading ? 'Verifying…' : 'Verify & Create Account'}
            </button>
            <div className="flex items-center justify-center gap-2 text-[14px] text-muted">
              <span>Didn&apos;t receive the code?</span>
              <button type="button" onClick={handleResend} disabled={resendCooldown > 0 || loading} className={`${textLink} disabled:cursor-not-allowed disabled:opacity-60`}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setStep('form'); setOtp(''); setErrors({}) }}
              className="inline-flex items-center justify-center gap-1.5 text-[14px] text-muted transition-colors hover:text-ink"
            >
              <FiArrowLeft size={14} /> Change email or details
            </button>
          </form>
        </>
      )}

      <p className="mt-8 border-t border-line pt-5 text-center text-[13.5px] text-muted">
        Trouble signing in? Email{' '}
        <a className={textLink} href="mailto:info@dsatguru.com">
          info@dsatguru.com
        </a>
      </p>
    </AuthShell>
  )
}
