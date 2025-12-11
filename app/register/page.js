'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-8 relative">
        <div className="mb-4">
          <a
            href="/"
            className="text-blue-600 flex items-center text-sm hover:underline mb-4"
          >
            <FiArrowLeft className="mr-1" /> Go Back to Home
          </a>
        </div>
        <h2 className="text-2xl font-bold text-center text-blue-700 mb-6">
          Create Your DSATGURU Account
        </h2>

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
            <a
              href="/login"
              className="text-blue-600 hover:underline font-medium"
            >
              Login here
            </a>
          </p>
        </form>
      </div>
    </section>
  )
}