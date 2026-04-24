'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import axios from 'axios'
import { FiZap, FiArrowRight, FiMail, FiUser, FiPhone, FiClock, FiBookOpen, FiCheckCircle, FiLoader } from 'react-icons/fi'
import { HiSparkles } from 'react-icons/hi'

export default function DemoTestLanding() {
  const router = useRouter()
  const [info, setInfo] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    axios.get('/api/demo-test/info').then(r => setInfo(r.data.data)).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.email.trim()) {
      setError('Please fill name and email')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      setError('Please enter a valid email')
      return
    }
    try {
      setSubmitting(true)
      const res = await axios.post('/api/demo-test/start', form)
      const data = res.data.data
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('demoTestSession', JSON.stringify(data))
      }
      router.push(`/demo-test/rules?attemptId=${data.attemptId}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      <motion.div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-100 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 10, repeat: Infinity }} />
      <motion.div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-blue-100 blur-3xl" animate={{ scale: [1.2, 1, 1.2] }} transition={{ duration: 12, repeat: Infinity }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 md:py-16">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 mb-4">
            <HiSparkles className="text-blue-600" />
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">100% Free</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-3">
            DSAT <span className="text-blue-600">Demo Test</span>
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Experience the full Digital SAT interface. Two modules, instant scoring, detailed review.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Info panel */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><FiBookOpen className="text-blue-600" /> What's inside</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <span className="text-gray-700 flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">1</span> Module 1: Math</span>
                  <span className="text-gray-900 font-semibold">{info?.mathQuestionCount ?? '—'} Qs · {info?.mathDuration ?? 20} min</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <span className="text-gray-700 flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">2</span> Module 2: Reading & Writing</span>
                  <span className="text-gray-900 font-semibold">{info?.rwQuestionCount ?? '—'} Qs · {info?.rwDuration ?? 20} min</span>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">You'll get</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                {[
                  'Realistic Digital SAT interface',
                  'Timer, navigator, mark-for-review',
                  'Scaled score (200–800 per section)',
                  'Full review with explanations',
                  'Personalized course recommendations'
                ].map((t, i) => (
                  <li key={i} className="flex items-center gap-2"><FiCheckCircle className="text-blue-600 flex-shrink-0" /> {t}</li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Form */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="relative">
            <motion.div className="absolute -inset-0.5 bg-blue-600 rounded-2xl blur opacity-20" animate={{ opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 3, repeat: Infinity }} />
            <div className="relative bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2"><FiZap className="text-blue-600" /> Start your test</h2>
              <p className="text-sm text-gray-500 mb-6">Enter your details to begin — no signup required.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-700 mb-1 flex items-center gap-2"><FiUser /> Full Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" />
                </div>
                <div>
                  <label className="text-sm text-gray-700 mb-1 flex items-center gap-2"><FiMail /> Email Address *</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" />
                </div>
                <div>
                  <label className="text-sm text-gray-700 mb-1 flex items-center gap-2"><FiPhone /> Phone (optional)</label>
                  <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 000 0000" className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" />
                </div>
                {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-lg shadow disabled:opacity-60 flex items-center justify-center gap-2">
                  {submitting ? <><FiLoader className="animate-spin" /> Starting...</> : <>Continue to Rules <FiArrowRight /></>}
                </motion.button>
                <p className="text-xs text-gray-400 text-center">By continuing, you agree to receive your score and optional follow-up emails.</p>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
