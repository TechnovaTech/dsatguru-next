'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi'
import { useAuth } from '../components/AuthContext'
import axios from 'axios'

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const router = useRouter()
  const { login } = useAuth()

  const validateField = (name, value) => {
    switch (name) {
      case 'email':
        return !value ? 'Email is required' : !/\S+@\S+\.\S+/.test(value) ? 'Invalid email' : ''
      case 'password':
        return !value ? 'Password is required' : value.length < 6 ? 'Minimum 6 characters' : ''
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
    setTouched({ email: true, password: true })

    const hasErrors = Object.values(newErrors).some(error => error !== '')
    if (hasErrors) return

    setLoading(true)
    
    try {
      const cleanData = {
        email: formData.email.trim(),
        password: formData.password.trim()
      }
      const response = await axios.post('/api/auth/login', cleanData)
      login(response.data.token, response.data.user)
      
      // Check if user is admin and redirect accordingly
      if (response.data.user.role === 'Admin') {
        router.push('/admin')
      } else if (response.data.user.role === 'Tutor') {
        router.push('/admin/tutor/create-test')
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Login error:', error)
      alert('Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-8 relative">
        <div className="mb-4">
          <Link
            href="/"
            className="text-blue-600 flex items-center text-sm hover:underline mb-4"
          >
            <FiArrowLeft className="mr-1" /> Go Back to Home
          </Link>
        </div>
        <h2 className="text-2xl font-bold text-center text-blue-700 mb-6">
          Login to DSATGURU
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="example@email.com"
              className={`w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email && touched.email ? 'border-red-500' : 'border-gray-300'
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
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                placeholder="Enter your password"
                className={`w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.password && touched.password ? 'border-red-500' : 'border-gray-300'
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

          <div className="text-right text-sm">
            <Link href="/forgot-password" className="text-blue-600 hover:underline">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-blue-600 text-white py-2 rounded-md text-sm font-semibold hover:bg-blue-700 transition ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <p className="text-sm text-center text-gray-600">
            Don&apos;t have an account?{' '}
            <a href="/register" className="cursor-pointer text-blue-600 hover:underline font-medium">
              Create one
            </a>
          </p>
        </form>
      </div>
    </section>
  )
}