'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi'
import { useAuth } from '../components/AuthContext'
import axios from 'axios'

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const router = useRouter()
  const { login } = useAuth()

  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        return !value ? 'Name is required' : value.length < 3 ? 'Min 3 characters' : value.length > 50 ? 'Max 50 characters' : ''
      case 'email':
        return !value ? 'Email is required' : !/\S+@\S+\.\S+/.test(value) ? 'Invalid email' : ''
      case 'password':
        return !value ? 'Password is required' : value.length < 6 ? 'Minimum 6 characters' : ''
      case 'confirmPassword':
        return !value ? 'Please confirm your password' : value !== formData.password ? 'Passwords must match' : ''
      default:
        return ''
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    if (touched[name]) {
      setErrors(prev => ({ ...prev, [name]: validateField(name, value) }))
    }
    
    // Re-validate confirm password when password changes
    if (name === 'password' && touched.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: validateField('confirmPassword', formData.confirmPassword) }))
    }
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate all fields
    const newErrors = {}
    Object.keys(formData).forEach(key => {
      newErrors[key] = validateField(key, formData[key])
    })
    
    setErrors(newErrors)
    setTouched({ name: true, email: true, password: true, confirmPassword: true })

    const hasErrors = Object.values(newErrors).some(error => error !== '')
    if (hasErrors) return

    setLoading(true)
    
    try {
      const response = await axios.post('/api/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password
      })
      login(response.data.token, response.data.user)
      router.push('/dashboard')
    } catch (error) {
      console.error('Signup error:', error)
      alert('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 text-white p-10 flex-col justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex items-center text-xs font-medium text-blue-100 hover:text-white mb-6"
            >
              <FiArrowLeft className="mr-1" /> Back to home
            </Link>
            <p className="inline-flex items-center text-xs uppercase tracking-[0.2em] bg-white/10 px-3 py-1 rounded-full mb-4">
              Create your DSAT profile
            </p>
            <h1 className="text-3xl font-bold leading-tight mb-4">
              One account for all your DSAT learning
            </h1>
            <p className="text-sm text-blue-100/90 mb-6">
              Build a personalized prep journey with live courses, adaptive tests, and clear score
              tracking so you always know what to do next.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                <span>Unlock full access to DSAT and PSAT programs, live classes, and schedules.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-300" />
                <span>Get a personalized study plan and see exactly what to practice each day.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-300" />
                <span>Track improvements with detailed dashboards, analytics, and test history.</span>
              </li>
            </ul>
          </div>
          <div className="mt-8 text-xs text-blue-100/80">
            <p className="font-semibold">Questions before you sign up?</p>
            <p>
              Email <a className="underline" href="mailto:info@dsatguru.com">info@dsatguru.com</a> or call <span className="font-medium">1-329-239-8577</span>.
            </p>
          </div>
        </div>

        <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-center">
          <div className="mb-6 md:hidden">
            <Link
              href="/"
              className="text-blue-600 flex items-center text-sm hover:underline mb-3"
            >
              <FiArrowLeft className="mr-1" /> Back to home
            </Link>
            <h1 className="text-2xl font-bold text-blue-700">
              Create Your DSATGURU Account
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Sign up to start structured prep with tests, courses, and analytics.
            </p>
          </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="John Doe"
              className={`w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name && touched.name
                  ? 'border-red-500'
                  : 'border-gray-300'
              }`}
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {errors.name && touched.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>
          
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="example@email.com"
              className={`w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email && touched.email
                  ? 'border-red-500'
                  : 'border-gray-300'
              }`}
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {errors.email && touched.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                placeholder="Create your password"
                className={`w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.password && touched.password
                    ? 'border-red-500'
                    : 'border-gray-300'
                }`}
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              <span
                className="absolute right-3 top-2.5 text-gray-500 cursor-pointer"
                onClick={() => setShowPassword(prev => !prev)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </span>
            </div>
            {errors.password && touched.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Re-enter your password"
                className={`w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.confirmPassword && touched.confirmPassword
                    ? 'border-red-500'
                    : 'border-gray-300'
                }`}
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              <span
                className="absolute right-3 top-2.5 text-gray-500 cursor-pointer"
                onClick={() => setShowConfirmPassword(prev => !prev)}
              >
                {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
              </span>
            </div>
            {errors.confirmPassword && touched.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-blue-600 text-white py-2 rounded-md text-sm font-semibold hover:bg-blue-700 transition ${
              loading && 'opacity-50 cursor-not-allowed'
            }`}
          >
            {loading ? 'Creating Account...' : 'Signup'}
          </button>

          <p className="text-sm text-center text-gray-600">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-blue-600 hover:underline font-medium"
            >
              Login here
            </Link>
          </p>
        </form>
        </div>
      </div>
    </section>
  )
}
