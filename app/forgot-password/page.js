'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FiArrowLeft, FiMail, FiShield, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import axios from 'axios'

export default function ForgotPasswordPage() {
  const router = useRouter()
  // step: 'email' | 'otp' | 'reset' | 'done'
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const startCooldown = () => {
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown(prev => { if (prev <= 1) { clearInterval(interval); return 0 } return prev - 1 })
    }, 1000)
  }

  // Step 1: Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) { setError('Please enter a valid email address'); return }
    setLoading(true)
    try {
      await axios.post('/api/auth/send-otp', { email, type: 'forgot-password' })
      setStep('otp')
      startCooldown()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setError('')
    // Client-side guard: require exactly 6 digits before advancing. The code is
    // still verified by the server in the reset step below — this only prevents
    // moving on with an obviously incomplete/invalid code.
    if (!/^\d{6}$/.test(otp)) { setError('Please enter the 6-digit code'); return }
    setStep('reset')
  }

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    if (!newPassword || newPassword.length < 6) { setError('Password must be at least 6 characters'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      await axios.post('/api/auth/verify-otp', {
        email,
        otp,
        type: 'forgot-password',
        newPassword
      })
      setStep('done')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Please try again.')
      // If OTP is invalid, go back to OTP step
      if (err.response?.data?.error?.toLowerCase().includes('otp') || err.response?.data?.error?.toLowerCase().includes('invalid')) {
        setStep('otp')
        setOtp('')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setLoading(true)
    try {
      await axios.post('/api/auth/send-otp', { email, type: 'forgot-password' })
      setOtp('')
      setError('')
      startCooldown()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">

        {/* Step: Email */}
        {step === 'email' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FiMail className="text-blue-600" size={22} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Forgot Password</h1>
                <p className="text-sm text-gray-500">Enter your email to receive a reset code</p>
              </div>
            </div>
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-2.5 text-gray-400" />
                  <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
                    placeholder="you@example.com"
                    className={`w-full pl-9 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300'}`} />
                </div>
                {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-md text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>
            </form>
          </>
        )}

        {/* Step: OTP */}
        {step === 'otp' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FiShield className="text-blue-600" size={22} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Enter Reset Code</h1>
                <p className="text-sm text-gray-500">Sent to <span className="font-medium text-gray-700">{email}</span></p>
              </div>
            </div>
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">6-digit code</label>
                <input type="text" inputMode="numeric" maxLength={6}
                  value={otp} onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError('') }}
                  placeholder="000000"
                  className={`w-full text-center text-2xl font-bold tracking-[0.5em] py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300'}`} />
                {error && <p className="text-red-500 text-xs mt-1 text-center">{error}</p>}
                <p className="mt-2 text-center text-xs text-gray-500">Can&apos;t find it? Check your spam or promotions folder — the code expires in 10 minutes.</p>
              </div>
              <button type="submit" disabled={otp.length !== 6}
                className="w-full bg-blue-600 text-white py-2.5 rounded-md text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                Continue →
              </button>
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Didn't receive the code?</p>
                <button type="button" onClick={handleResend} disabled={resendCooldown > 0 || loading}
                  className="text-sm text-blue-600 hover:underline disabled:text-gray-400">
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>
              <button type="button" onClick={() => { setStep('email'); setOtp(''); setError('') }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
                <FiArrowLeft size={14} /> Change email
              </button>
            </form>
          </>
        )}

        {/* Step: Reset Password */}
        {step === 'reset' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <FiLock className="text-green-600" size={22} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Set New Password</h1>
                <p className="text-sm text-gray-500">Choose a strong password</p>
              </div>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-2.5 text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'} value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setError('') }}
                    placeholder="Min 6 characters"
                    className="w-full pl-9 pr-10 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <span className="absolute right-3 top-2.5 text-gray-400 cursor-pointer" onClick={() => setShowPassword(p => !p)}>
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-2.5 text-gray-400" />
                  <input type={showConfirm ? 'text' : 'password'} value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError('') }}
                    placeholder="Re-enter password"
                    className="w-full pl-9 pr-10 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <span className="absolute right-3 top-2.5 text-gray-400 cursor-pointer" onClick={() => setShowConfirm(p => !p)}>
                    {showConfirm ? <FiEyeOff /> : <FiEye />}
                  </span>
                </div>
              </div>
              {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-green-600 text-white py-2.5 rounded-md text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Password Reset!</h2>
            <p className="text-sm text-gray-500 mb-6">Your password has been updated successfully.</p>
            <button onClick={() => router.push('/login')}
              className="w-full bg-blue-600 text-white py-2.5 rounded-md text-sm font-semibold hover:bg-blue-700 transition">
              Login with New Password
            </button>
          </div>
        )}

        {step !== 'done' && (
          <div className="mt-6 text-sm text-gray-600 flex items-center justify-between">
            <Link href="/login" className="text-blue-600 hover:underline">Back to Login</Link>
            <Link href="/register" className="text-gray-500 hover:underline">Create account</Link>
          </div>
        )}
      </div>
    </div>
  )
}
