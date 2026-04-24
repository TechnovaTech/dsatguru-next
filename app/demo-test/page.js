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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 relative overflow-hidden">
      <motion.div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 10, repeat: Infinity }} />
      <motion.div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl" animate={{ scale: [1.2, 1, 1.2] }} transition={{ duration: 12, repeat: Infinity }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 md:py-16">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-4">
            <HiSparkles className="text-yellow-300" />
            <span className="text-xs font-semibold text-white uppercase tracking-wider">100% Free</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">
            DSAT <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent">Demo Test</span>
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Experience the full Digital SAT interface. Two modules, instant scoring, detailed review.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Info panel */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><FiBookOpen /> What's inside</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-gray-300 flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-300 text-sm font-bold">1</span> Module 1: Math</span>
                  <span className="text-white font-semibold">{info?.mathQuestionCount ?? '—'} Qs · {info?.mathDuration ?? 20} min</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-gray-300 flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-300 text-sm font-bold">2</span> Module 2: Reading & Writing</span>
                  <span className="text-white font-semibold">{info?.rwQuestionCount ?? '—'} Qs · {info?.rwDuration ?? 20} min</span>
                </div>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-3">You'll get</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                {[
                  'Realistic Digital SAT interface',
                  'Timer, navigator, mark-for-review',
                  'Scaled score (200–800 per section)',
                  'Full review with explanations',
                  'Personalized course recommendations'
                ].map((t, i) => (
                  <li key={i} className="flex items-center gap-2"><FiCheckCircle className="text-emerald-400 flex-shrink-0" /> {t}</li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Form */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="relative">
            <motion.div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-2xl blur opacity-50" animate={{ opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 3, repeat: Infinity }} />
            <div className="relative bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8">
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><FiZap className="text-cyan-400" /> Start your test</h2>
              <p className="text-sm text-gray-400 mb-6">Enter your details to begin — no signup required.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-300 mb-1 flex items-center gap-2"><FiUser /> Full Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-400 transition" />
                </div>
                <div>
                  <label className="text-sm text-gray-300 mb-1 flex items-center gap-2"><FiMail /> Email Address *</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-400 transition" />
                </div>
                <div>
                  <label className="text-sm text-gray-300 mb-1 flex items-center gap-2"><FiPhone /> Phone (optional)</label>
                  <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 000 0000" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-400 transition" />
                </div>
                {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 text-white font-semibold py-3.5 rounded-lg shadow-xl hover:shadow-cyan-500/30 disabled:opacity-60 flex items-center justify-center gap-2">
                  {submitting ? <><FiLoader className="animate-spin" /> Starting...</> : <>Continue to Rules <FiArrowRight /></>}
                </motion.button>
                <p className="text-xs text-gray-500 text-center">By continuing, you agree to receive your score and optional follow-up emails.</p>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
