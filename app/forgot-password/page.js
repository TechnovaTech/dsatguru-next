'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FiArrowLeft, FiArrowRight, FiCheck, FiMail, FiShield, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import axios from 'axios'
import { Alert, AuthShell, EyeToggle, Field, FormTitle, codeInput, fieldInput, primaryButton, textLink } from '../components/site/auth'

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
    <AuthShell
      kicker="Account recovery"
      title="Back into your account in a minute"
      subtitle="We email you a 6-digit code, you choose a new password, and you are back to your prep."
      perks={['Enter the email you signed up with', 'Type the 6-digit code from your inbox', 'Choose a new password and log in']}
      helpTitle="Still stuck?"
    >
      {/* Step: Email */}
      {step === 'email' && (
        <>
          <FormTitle icon={FiMail} title="Forgot Password" subtitle="Enter your email to receive a reset code" />
          <form onSubmit={handleSendOTP} className="mt-7 grid gap-5">
            <Field label="Email Address" htmlFor="email" icon={FiMail}>
              <input id="email" type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }} placeholder="you@example.com" autoComplete="email" className={fieldInput} />
            </Field>
            {error && <Alert>{error}</Alert>}
            <button type="submit" disabled={loading} className={primaryButton}>
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>
        </>
      )}

      {/* Step: OTP */}
      {step === 'otp' && (
        <>
          <FormTitle
            icon={FiShield}
            title="Enter Reset Code"
            subtitle={
              <>
                Sent to <span className="font-medium text-ink">{email}</span>
              </>
            }
          />
          <form onSubmit={handleVerifyOTP} className="mt-7 grid gap-5">
            <div>
              <label htmlFor="otp" className="mb-1.5 block text-[14px] font-medium text-ink">
                6-digit code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError('') }}
                placeholder="000000"
                className={codeInput(error)}
              />
              {error && <p className="mt-1.5 text-center text-[13px] text-negative">{error}</p>}
              <p className="mt-2 text-center text-[13px] text-muted">Can&apos;t find it? Check your spam or promotions folder — the code expires in 10 minutes.</p>
            </div>
            <button type="submit" disabled={otp.length !== 6} className={primaryButton}>
              Continue <FiArrowRight className="transition-transform group-hover:translate-x-1" />
            </button>
            <div className="flex items-center justify-center gap-2 text-[14px] text-muted">
              <span>Didn&apos;t receive the code?</span>
              <button type="button" onClick={handleResend} disabled={resendCooldown > 0 || loading} className={`${textLink} disabled:cursor-not-allowed disabled:opacity-60`}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setStep('email'); setOtp(''); setError('') }}
              className="inline-flex items-center justify-center gap-1.5 text-[14px] text-muted transition-colors hover:text-ink"
            >
              <FiArrowLeft size={14} /> Change email
            </button>
          </form>
        </>
      )}

      {/* Step: Reset Password */}
      {step === 'reset' && (
        <>
          <FormTitle icon={FiLock} title="Set New Password" subtitle="Choose a strong password" />
          <form onSubmit={handleResetPassword} className="mt-7 grid gap-5">
            <Field
              label="New Password"
              htmlFor="newPassword"
              icon={FiLock}
              after={<EyeToggle shown={showPassword} onToggle={() => setShowPassword(p => !p)} Eye={FiEye} EyeOff={FiEyeOff} />}
            >
              <input id="newPassword" type={showPassword ? 'text' : 'password'} value={newPassword} onChange={e => { setNewPassword(e.target.value); setError('') }} placeholder="Min 6 characters" autoComplete="new-password" className={fieldInput} />
            </Field>
            <Field
              label="Confirm Password"
              htmlFor="confirmPassword"
              icon={FiLock}
              after={<EyeToggle shown={showConfirm} onToggle={() => setShowConfirm(p => !p)} Eye={FiEye} EyeOff={FiEyeOff} />}
            >
              <input id="confirmPassword" type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setError('') }} placeholder="Re-enter password" autoComplete="new-password" className={fieldInput} />
            </Field>
            {error && <Alert>{error}</Alert>}
            <button type="submit" disabled={loading} className={primaryButton}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </>
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <div className="py-6 text-center">
          <span className="mx-auto grid size-14 place-items-center bg-positive text-page">
            <FiCheck size={26} />
          </span>
          <h2 className="display mt-6 text-[2.4rem] leading-tight">Password Reset!</h2>
          <p className="mt-2 text-[15.5px] text-muted">Your password has been updated successfully.</p>
          <button onClick={() => router.push('/login')} className={`${primaryButton} mt-8`}>
            Login with New Password
          </button>
        </div>
      )}

      {step !== 'done' && (
        <div className="mt-8 flex justify-between border-t border-line pt-5 text-[14px]">
          <Link href="/login" className={textLink}>
            Back to Login
          </Link>
          <Link href="/register" className={textLink}>
            Create account
          </Link>
        </div>
      )}
    </AuthShell>
  )
}
