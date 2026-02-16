'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    // No backend route wired yet; display confirmation optimistic message
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password</h1>
        <p className="text-sm text-gray-600 mb-6">
          Enter your email and we&apos;ll guide you to reset your password.
        </p>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                className={`w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-semibold hover:bg-blue-700 transition"
            >
              Continue
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm p-3 rounded-md">
              If an account exists for <span className="font-medium">{email}</span>, you&apos;ll receive next steps shortly.
            </div>
            <p className="text-sm text-gray-600">
              Need help? Email us at{' '}
              <a className="text-blue-600 underline" href="mailto:info@dsatguru.com">
                info@dsatguru.com
              </a>{' '}
              or call <span className="font-medium">1-329-239-8577</span>.
            </p>
          </div>
        )}

        <div className="mt-6 text-sm text-gray-600 flex items-center justify-between">
          <Link href="/login" className="text-blue-600 hover:underline">
            Back to Login
          </Link>
          <Link href="/register" className="text-gray-600 hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  )
}
