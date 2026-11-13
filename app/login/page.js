'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FiArrowRight, FiEye, FiEyeOff, FiMail, FiLock } from 'react-icons/fi'
import { useAuth, isTokenExpired, roleHome } from '../components/AuthContext'
import axios from 'axios'
import { Alert, AuthShell, EyeToggle, Field, FormTitle, fieldInput, primaryButton, textLink } from '../components/site/auth'

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
  const { login, logout } = useAuth()
  // Where to go after login when the user was sent here mid-flow (e.g. from an
  // enrollment page). Falls back to the role-based default.
  const [returnTo, setReturnTo] = useState('')
  useEffect(() => {
    try {
      const raw = new URLSearchParams(window.location.search).get('returnTo') || ''
      // Same-origin paths only: blocks //evil.com, https://…, and javascript: payloads.
      setReturnTo(/^\/(?![\/\\])/.test(raw) ? raw : '')
    } catch {}
  }, [])

  // Already signed in? Only skip the form once the SERVER accepts the stored
  // token (200). A token that merely looks unexpired locally can still be one
  // the server rejects — wrong scope from the old shared IGCSC login, revoked,
  // or bad signature — and redirecting on it bounced users between the login
  // page and a dashboard whose every call 401s. On a definite 401 the stale
  // keys are cleared and the form is shown; on a network error the form is
  // shown without touching the keys.
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const token = localStorage.getItem('token')
        const raw = localStorage.getItem('user')
        if (!token || !raw || isTokenExpired(token)) return
        const res = await fetch('/api/auth/login', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        if (cancelled) return
        if (res.ok) {
          router.replace(roleHome(JSON.parse(raw).role))
        } else if (res.status === 401 && localStorage.getItem('token') === token) {
          // Same-token check: never wipe a fresh session the user just created
          // while this probe of the old token was still in flight.
          logout()
        }
      } catch {}
    }
    check()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const role = response.data.user.role
      const isStaff = role === 'Admin' || role === 'TutorAdmin' || role === 'Tutor'
      const home =
        role === 'Admin' ? '/admin'
        : role === 'TutorAdmin' ? '/admin/tutor/question-bank'
        : role === 'Tutor' ? '/tutor/dashboard'
        : '/dashboard'
      // returnTo is honoured for students, but for STAFF only when it points at
      // a destination that belongs to everyone (a class join link). Following it
      // blindly dropped an admin into the student dashboard after login.
      const neutralReturn = /^\/join\//.test(returnTo || '')
      if (returnTo && (!isStaff || neutralReturn)) router.push(returnTo)
      else router.push(home)
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

  return (
    <AuthShell
      kicker="Welcome back"
      title="Continue your DSAT prep journey"
      subtitle="Sign in to unlock your personalized dashboard, adaptive practice tests, and detailed analytics."
      perks={perks}
      helpTitle="Need help logging in?"
    >
      <FormTitle title="Login to DSATGURU" subtitle="Access your dashboard, tests, and course progress in one place." />
      {authError && <Alert>{authError}</Alert>}

      <form onSubmit={handleSubmit} noValidate className="mt-7 grid gap-5">
        <Field label="Email Address" htmlFor="email" icon={FiMail} error={touched.email && errors.email}>
          <input type="email" id="email" name="email" placeholder="example@email.com" autoComplete="email" className={fieldInput} value={formData.email} onChange={handleChange} onBlur={handleBlur} />
        </Field>
        <div>
          <Field
            label="Password"
            htmlFor="password"
            icon={FiLock}
            error={touched.password && errors.password}
            after={<EyeToggle shown={showPassword} onToggle={() => setShowPassword((p) => !p)} Eye={FiEye} EyeOff={FiEyeOff} />}
          >
            <input type={showPassword ? 'text' : 'password'} id="password" name="password" placeholder="Enter your password" autoComplete="current-password" className={fieldInput} value={formData.password} onChange={handleChange} onBlur={handleBlur} />
          </Field>
          <div className="mt-2 text-right">
            <Link href="/forgot-password" className={`text-[13.5px] ${textLink}`}>
              Forgot Password?
            </Link>
          </div>
        </div>

        <button type="submit" disabled={loading} className={primaryButton}>
          {loading ? 'Logging in…' : 'Login'} {!loading && <FiArrowRight className="transition-transform group-hover:translate-x-1" />}
        </button>
        <p className="text-center text-[14.5px] text-muted">
          Don&apos;t have an account?{' '}
          <Link href={returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : '/register'} className={textLink}>
            Create one
          </Link>
        </p>
      </form>

      <p className="mt-8 border-t border-line pt-5 text-center text-[13.5px] text-muted">
        Trouble signing in? Email{' '}
        <a className={textLink} href="mailto:info@dsatguru.com">
          info@dsatguru.com
        </a>
      </p>
    </AuthShell>
  )
}
