'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  FiPhone, FiMail, FiMapPin, FiClock, FiUser, FiTag, FiMessageSquare, FiSend, FiCheckCircle, FiAlertCircle,
} from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import axios from 'axios'

const MAPS_URL = 'https://maps.app.goo.gl/1u9TRFga5tZzcW276'

const fields = [
  { name: 'name', label: 'Full Name', type: 'text', icon: <FiUser />, placeholder: 'Jane Doe' },
  { name: 'email', label: 'Email Address', type: 'email', icon: <FiMail />, placeholder: 'you@example.com' },
  { name: 'phone', label: 'Phone Number', type: 'text', icon: <FiPhone />, placeholder: '1234567890' },
  { name: 'subject', label: 'Subject', type: 'text', icon: <FiTag />, placeholder: 'How can we help?' },
]

const methods = [
  { icon: <FiPhone size={18} />, label: 'Call Us', value: '1-329-239-8577', href: 'tel:+13292398577', grad: 'from-indigo-600 to-indigo-700' },
  { icon: <FiMail size={18} />, label: 'Email Us', value: 'info@dsatguru.com', href: 'mailto:info@dsatguru.com', grad: 'from-blue-600 to-blue-700' },
  { icon: <FiMapPin size={18} />, label: 'Visit Us', value: 'View on Google Maps', href: MAPS_URL, grad: 'from-rose-500 to-pink-600', external: true },
]

const infoCards = [
  { title: 'How We Can Help', body: 'Whether you are a student, parent, or school, reach out for help with course options, enrollment, billing, or technical issues. We guide you toward the best DSAT/PSAT prep path.' },
  { title: 'Support Channels', body: 'Reach us by phone at 1-329-239-8577 or email info@dsatguru.com. We respond quickly during working hours.' },
  { title: 'Your Privacy', body: 'We use your contact details only to respond to your inquiry. Sensitive information is never requested on this page.' },
]

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', subject: '', message: '', sourcePage: 'Contact Us', honeypot: '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [status, setStatus] = useState(null) // 'success' | 'error'

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
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (touched[name]) setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus(null)
    if (formData.honeypot !== '') return

    const newErrors = {}
    Object.keys(formData).forEach((key) => {
      if (key !== 'sourcePage' && key !== 'honeypot') newErrors[key] = validateField(key, formData[key])
    })
    setErrors(newErrors)
    setTouched({ name: true, email: true, phone: true, subject: true, message: true })
    if (Object.values(newErrors).some((err) => err !== '')) return

    setLoading(true)
    try {
      await axios.post('/api/contact', formData)
      setStatus('success')
      setFormData({ name: '', email: '', phone: '', subject: '', message: '', sourcePage: 'Contact Us', honeypot: '' })
      setTouched({})
      setErrors({})
    } catch (error) {
      console.error('Contact form error:', error)
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = (field) =>
    `w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-sm text-slate-800 transition-all placeholder:text-slate-400 focus:outline-none focus:ring-4 ${
      errors[field] && touched[field]
        ? 'border-rose-400 focus:ring-rose-100'
        : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
    }`

  return (
    <section className="dg w-full bg-white text-slate-900">
      {/* ===== HERO ===== */}
      <div className="relative -mt-28 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/80 via-white to-white" />
          <div className="dg-blob absolute -right-24 -top-24 h-[30rem] w-[30rem] rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="dg-blob-slow absolute -left-20 top-1/3 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />
          <div className="absolute inset-0 dg-grid-bg opacity-[0.5] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl px-6 pb-8 pt-40 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-wider text-indigo-600 shadow-sm backdrop-blur">
            Contact Us
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 md:text-5xl">
            We&apos;re Here to <span className="dg-gradient-text">Help</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
            Have questions about courses, enrollment, or your prep plan? Reach out and our team will happily guide you on
            your DSAT/PSAT journey.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-20 lg:px-12">
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.15fr]">
          {/* ===== LEFT: contact methods ===== */}
          <motion.div
            initial={{ opacity: 1, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-extrabold text-slate-900">Get in touch</h2>
            <p className="text-sm text-slate-600">Pick whatever&apos;s easiest — we usually reply within a few hours.</p>

            <div className="space-y-3 pt-2">
              {methods.map((m) => (
                <a
                  key={m.label}
                  href={m.href}
                  target={m.external ? '_blank' : undefined}
                  rel={m.external ? 'noopener noreferrer' : undefined}
                  className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <span className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${m.grad} text-white shadow-lg transition-transform group-hover:scale-110`}>
                    {m.icon}
                  </span>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{m.label}</div>
                    <div className="text-sm font-bold text-slate-800 group-hover:text-indigo-700">{m.value}</div>
                  </div>
                </a>
              ))}
            </div>

            {/* WhatsApp + hours */}
            <a
              href="https://wa.me/13292398577"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3.5 text-sm font-bold text-white shadow-lg shadow-green-500/30 transition-transform hover:-translate-y-0.5"
            >
              <FaWhatsapp size={18} /> Chat on WhatsApp
            </a>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
              <FiClock className="flex-shrink-0 text-indigo-600" size={18} />
              <span><b className="text-slate-800">Mon – Sat:</b> 9:00 AM – 8:00 PM</span>
            </div>
          </motion.div>

          {/* ===== RIGHT: form ===== */}
          <motion.div
            initial={{ opacity: 1, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-3xl border border-slate-100 bg-white p-7 shadow-xl sm:p-9"
          >
            <h2 className="text-2xl font-extrabold text-slate-900">Send us a message</h2>
            <p className="mt-1 text-sm text-slate-500">Fill out the form and we&apos;ll get back to you shortly.</p>

            {status === 'success' && (
              <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                <FiCheckCircle className="flex-shrink-0" /> Your message has been sent — we&apos;ll be in touch soon!
              </div>
            )}
            {status === 'error' && (
              <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                <FiAlertCircle className="flex-shrink-0" /> Something went wrong. Please try again later.
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <input type="text" name="honeypot" value={formData.honeypot} onChange={handleChange} className="hidden" autoComplete="off" tabIndex={-1} />

              <div className="grid gap-5 sm:grid-cols-2">
                {fields.map((f) => (
                  <div key={f.name}>
                    <label htmlFor={f.name} className="mb-1.5 block text-sm font-semibold text-slate-700">{f.label}</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{f.icon}</span>
                      <input
                        type={f.type}
                        id={f.name}
                        name={f.name}
                        placeholder={f.placeholder}
                        className={inputClass(f.name)}
                        value={formData[f.name]}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </div>
                    {errors[f.name] && touched[f.name] && <p className="mt-1 text-xs font-medium text-rose-500">{errors[f.name]}</p>}
                  </div>
                ))}
              </div>

              <div>
                <label htmlFor="message" className="mb-1.5 block text-sm font-semibold text-slate-700">Message</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-4 text-slate-400"><FiMessageSquare /></span>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    placeholder="Tell us a bit about what you need…"
                    className={`w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-sm text-slate-800 transition-all placeholder:text-slate-400 focus:outline-none focus:ring-4 ${
                      errors.message && touched.message ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
                    }`}
                    value={formData.message}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </div>
                {errors.message && touched.message && <p className="mt-1 text-xs font-medium text-rose-500">{errors.message}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="dg-shine group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Sending…' : 'Send Message'}
                {!loading && <FiSend className="transition-transform group-hover:translate-x-1" />}
              </button>
            </form>
          </motion.div>
        </div>

        {/* ===== Info cards ===== */}
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {infoCards.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 1, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg"
            >
              <h3 className="font-bold text-slate-900">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{c.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
