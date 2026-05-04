'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiArrowLeft, FiEye, FiEyeOff, FiMail, FiLock, FiUser, FiShield } from 'react-icons/fi'
import { useAuth } from '../components/AuthContext'
import axios from 'axios'

export default function Register() {
  const router = useRouter()
  const { login } = useAuth()

  // Step: 'form' | 'otp'
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
    setFormData(prev => ({ ...prev, [name]: value }))
    if (touched[name]) setErrors(prev => ({ ...prev, [name]: validateField(name, value) }))
    if (name === 'password' && touched.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: value !== formData.confirmPassword ? 'Passwords must match' : '' }))
    }
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }))
  }

  const startCooldown = () => {
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown(prev => { if (prev <= 1) { clearInterval(interval); return 0 } return prev - 1 })
    }, 1000)
  }

  // Step 1: Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault()
    const newErrors = {}
    Object.keys(formData).forEach(k => { newErrors[k] = validateField(k, formData[k]) })
    setErrors(newErrors)
    setTouched({ name: true, email: true, password: true, confirmPassword: true })
    if (Object.values(newErrors).some(e => e)) return

    setLoading(true)
    try {
      await axios.post('/api/auth/send-otp', {
        email: formData.email,
        type: 'register',
        name: formData.name,
        password: formData.password
      })
      setStep('otp')
      startCooldown()
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || 'Failed to send OTP. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    if (!otp || otp.length !== 6) { setErrors({ otp: 'Please enter the 6-digit code' }); return }
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/verify-otp', {
        email: formData.email,
        otp,
        type: 'register'
      })
      login(res.data.token, res.data.user)
      router.push('/dashboard')
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
      await axios.post('/api/auth/send-otp', {
        email: formData.email,
        type: 'register',
        name: formData.name,
        password: formData.password
      })
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
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">

        {/* Left panel */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 text-white p-10 flex-col justify-between">
          <div>
            <Link href="/" className="inline-flex items-center text-xs font-medium text-blue-100 hover:text-white mb-6">
              <FiArrowLeft className="mr-1" /> Back to home
            </Link>
            <p className="inline-flex items-center text-xs uppercase tracking-[0.2em] bg-white/10 px-3 py-1 rounded-full mb-4">
              Create your DSAT profile
            </p>
            <h1 className="text-3xl font-bold leading-tight mb-4">One account for all your DSAT learning</h1>
            <p className="text-sm text-blue-100/90 mb-6">
              Build a personalized prep journey with live courses, adaptive tests, and clear score tracking.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-300" /><span>Unlock full access to DSAT and PSAT programs, live classes, and schedules.</span></li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-300" /><span>Get a personalized study plan and see exactly what to practice each day.</span></li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-300" /><span>Track improvements with detailed dashboards, analytics, and test history.</span></li>
            </ul>
          </div>
          <div className="mt-8 text-xs text-blue-100/80">
            <p className="font-semibold">Questions before you sign up?</p>
            <p>Email <a className="underline" href="mailto:info@dsatguru.com">info@dsatguru.com</a> or call <span className="font-medium">1-329-239-8577</span>.</p>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-center">
          <div className="mb-6 md:hidden">
            <Link href="/" className="text-blue-600 flex items-center text-sm hover:underline mb-3"><FiArrowLeft className="mr-1" /> Back to home</Link>
          </div>

          {step === 'form' ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Create Your Account</h2>
              <p className="text-sm text-gray-500 mb-6">We'll send a verification code to your email.</p>

              <form onSubmit={handleSendOTP} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-2.5 text-gray-400" />
                    <input type="text" name="name" placeholder="John Doe"
                      className={`w-full pl-9 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name && touched.name ? 'border-red-500' : 'border-gray-300'}`}
                      value={formData.name} onChange={handleChange} onBlur={handleBlur} />
                  </div>
                  {errors.name && touched.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-2.5 text-gray-400" />
                    <input type="email" name="email" placeholder="you@example.com"
                      className={`w-full pl-9 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email && touched.email ? 'border-red-500' : 'border-gray-300'}`}
                      value={formData.email} onChange={handleChange} onBlur={handleBlur} />
                  </div>
                  {errors.email && touched.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-2.5 text-gray-400" />
                    <input type={showPassword ? 'text' : 'password'} name="password" placeholder="Create your password"
                      className={`w-full pl-9 pr-10 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password && touched.password ? 'border-red-500' : 'border-gray-300'}`}
                      value={formData.password} onChange={handleChange} onBlur={handleBlur} />
                    <span className="absolute right-3 top-2.5 text-gray-400 cursor-pointer" onClick={() => setShowPassword(p => !p)}>
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </span>
                  </div>
                  {errors.password && touched.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-2.5 text-gray-400" />
                    <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" placeholder="Re-enter your password"
                      className={`w-full pl-9 pr-10 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.confirmPassword && touched.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                      value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur} />
                    <span className="absolute right-3 top-2.5 text-gray-400 cursor-pointer" onClick={() => setShowConfirmPassword(p => !p)}>
                      {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                    </span>
                  </div>
                  {errors.confirmPassword && touched.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>

                {errors.submit && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-md px-3 py-2">{errors.submit}</p>}

                <button type="submit" disabled={loading}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-md text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Sending OTP...' : 'Continue →'}
                </button>

                <p className="text-sm text-center text-gray-600">
                  Already have an account? <Link href="/login" className="text-blue-600 hover:underline font-medium">Login here</Link>
                </p>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <FiShield className="text-blue-600" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Verify your email</h2>
                  <p className="text-sm text-gray-500">Code sent to <span className="font-medium text-gray-700">{formData.email}</span></p>
                </div>
              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Enter 6-digit code</label>
                  <input
                    type="text" inputMode="numeric" maxLength={6}
                    value={otp} onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setErrors({}) }}
                    placeholder="000000"
                    className={`w-full text-center text-2xl font-bold tracking-[0.5em] py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.otp ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.otp && <p className="text-red-500 text-xs mt-1 text-center">{errors.otp}</p>}
                </div>

                <button type="submit" disabled={loading || otp.length !== 6}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-md text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
                </button>

                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Didn't receive the code?</p>
                  <button type="button" onClick={handleResend} disabled={resendCooldown > 0 || loading}
                    className="text-sm text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline">
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                  </button>
                </div>

                <button type="button" onClick={() => { setStep('form'); setOtp(''); setErrors({}) }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
                  <FiArrowLeft size={14} /> Change email or details
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
