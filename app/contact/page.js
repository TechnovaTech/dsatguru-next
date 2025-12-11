'use client'
import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { FiPhone, FiMail, FiHeadphones } from 'react-icons/fi'
import axios from 'axios'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    sourcePage: 'Contact Us',
    honeypot: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        return !value ? 'Name is required' : ''
      case 'email':
        return !value ? 'Email is required' : !/\S+@\S+\.\S+/.test(value) ? 'Invalid email' : ''
      case 'phone':
        return !value ? 'Phone is required' : !/^\d+$/.test(value) ? 'Phone must contain only numbers' : value.length < 10 ? 'Phone must be at least 10 digits' : ''
      case 'subject':
        return !value ? 'Subject is required' : ''
      case 'message':
        return !value ? 'Message is required' : value.length < 10 ? 'Message too short' : ''
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
    
    // Bot detection
    if (formData.honeypot !== '') {
      console.warn('Bot submission detected.')
      return
    }

    // Validate all fields
    const newErrors = {}
    Object.keys(formData).forEach(key => {
      if (key !== 'sourcePage' && key !== 'honeypot') {
        newErrors[key] = validateField(key, formData[key])
      }
    })
    
    setErrors(newErrors)
    setTouched({
      name: true,
      email: true,
      phone: true,
      subject: true,
      message: true
    })

    const hasErrors = Object.values(newErrors).some(error => error !== '')
    if (hasErrors) return

    setLoading(true)
    
    try {
      await axios.post('/api/contact', formData)
      alert('Your message has been sent successfully!')
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        sourcePage: 'Contact Us',
        honeypot: ''
      })
      setTouched({})
      setErrors({})
    } catch (error) {
      console.error('Contact form error:', error)
      alert('Something went wrong. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="w-full bg-gradient-to-br from-indigo-50 to-blue-100 py-20 px-4 sm:px-6 lg:px-8 font-[Poppins]">
      <div className="max-w-5xl mx-auto flex flex-col items-center justify-center gap-12">
        {/* Full Width Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="w-full bg-white rounded-xl shadow-lg p-6 md:p-8 flex items-center gap-6"
        >
          <div className="text-white bg-blue-600 w-14 h-14 flex items-center justify-center rounded-full text-xl">
            <FiHeadphones />
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-800">
              CONTACT US
            </h3>
            <p className="text-sm text-gray-600 mt-1">We're Here to Help</p>
            <p className="text-sm text-gray-600 mt-1">
              Have questions? Reach out to us by email or call us and we'll be
              happy to assist you on your DSAT/PSAT journey.
            </p>
          </div>
        </motion.div>

        {/* Phone and Email Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl shadow p-6 flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-blue-100 text-blue-700 flex items-center justify-center rounded-full">
              <FiPhone size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">Call Us</h4>
              <p className="text-sm text-gray-600">1-919-578-7724</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-xl shadow p-6 flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-blue-100 text-blue-700 flex items-center justify-center rounded-full">
              <FiMail size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">Email Us</h4>
              <p className="text-sm text-gray-600">info@dsatguru.com</p>
            </div>
          </motion.div>
        </div>

        {/* Contact Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-xl shadow-lg p-8 md:p-10 w-full max-w-7xl"
        >
          <h2 className="text-2xl font-bold text-blue-700 mb-6 text-center">
            Send Us a Message
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <input
              type="text"
              name="honeypot"
              value={formData.honeypot}
              onChange={handleChange}
              className="hidden"
              autoComplete="off"
            />

            {['name', 'email', 'phone', 'subject'].map((field) => (
              <div key={field}>
                <label
                  htmlFor={field}
                  className="block text-sm font-medium text-gray-700 mb-1 capitalize"
                >
                  {field}
                </label>
                <input
                  type={field === 'email' ? 'email' : 'text'}
                  id={field}
                  name={field}
                  className={`w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors[field] && touched[field]
                      ? 'border-red-500'
                      : 'border-gray-300'
                  }`}
                  value={formData[field]}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                {errors[field] && touched[field] && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors[field]}
                  </p>
                )}
              </div>
            ))}

            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows="4"
                className={`w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.message && touched.message
                    ? 'border-red-500'
                    : 'border-gray-300'
                }`}
                value={formData.message}
                onChange={handleChange}
                onBlur={handleBlur}
              ></textarea>
              {errors.message && touched.message && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed hover:bg-blue-800 cursor-pointer text-white py-2 rounded-md text-sm font-semibold hover:bg-blue-700 transition"
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  )
}