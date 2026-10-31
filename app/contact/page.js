'use client'
import { useState } from 'react'
import {
  FiPhone, FiMail, FiMapPin, FiClock, FiUser, FiTag, FiMessageSquare, FiSend, FiCheckCircle, FiAlertCircle,
} from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import axios from 'axios'
import { Reveal, Stagger, StaggerItem, WordReveal } from '../components/site/motion'
import { Container, Eyebrow, cn } from '../components/site/ui'

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

  // Field frame: lights up on focus, turns red when the field has an error.
  const frame = (field) =>
    cn(
      'flex items-center gap-3 border bg-page px-3.5 transition-colors focus-within:border-brand',
      errors[field] && touched[field] ? 'border-negative' : 'border-line-strong',
    )

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative border-b border-line">
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_50%_0%,#000,transparent_70%)]" />
        <Container className="relative py-16 text-center sm:py-20">
          <Eyebrow n="01" center>
            Contact us
          </Eyebrow>
          <WordReveal text="We're here to help" accent={2} className="mt-6 text-[2.8rem] leading-[1.02] sm:text-[3.8rem]" />
          <p className="animate-rise mx-auto mt-5 max-w-[620px] text-[17.5px] leading-relaxed text-ink-2">
            Have questions about courses, enrollment, or your prep plan? Reach out and our team will happily guide you on
            your DSAT/PSAT journey.
          </p>
        </Container>
      </section>

      <section className="border-b border-line">
        <Container className="grid gap-10 py-16 lg:grid-cols-[1fr_1.35fr] lg:gap-14 lg:py-20">
          {/* ===== LEFT: contact methods ===== */}
          <Reveal>
            <h2 className="display text-[2.2rem] leading-tight">Get in touch</h2>
            <p className="mt-2 text-[15.5px] text-muted">Pick whatever&apos;s easiest — we usually reply within a few hours.</p>
            <div className="mt-6 grid gap-3">
              {methods.map((m) => (
                <a
                  key={m.label}
                  href={m.href}
                  target={m.external ? '_blank' : undefined}
                  rel={m.external ? 'noopener noreferrer' : undefined}
                  data-spotlight
                  className="lift group flex items-center gap-5 border border-line bg-surface p-5"
                >
                  <span className="grid size-12 shrink-0 place-items-center bg-brand text-on-brand transition-transform duration-500 group-hover:-rotate-6">{m.icon}</span>
                  <span className="min-w-0">
                    <span className="block font-code text-[12px] uppercase tracking-[0.1em] text-muted">{m.label}</span>
                    <span className="display block truncate text-[1.6rem] leading-tight group-hover:text-brand">{m.value}</span>
                  </span>
                </a>
              ))}
              {/* WhatsApp + hours */}
              <a
                href="https://wa.me/13292398577"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 items-center justify-center gap-2 bg-[#25D366] text-[15px] font-semibold text-[#0b2a17] transition-transform hover:-translate-y-0.5"
              >
                <FaWhatsapp size={18} /> Chat on WhatsApp
              </a>
              <p className="flex items-center gap-3 border border-line bg-surface p-4 text-[15px] text-ink-2">
                <FiClock className="shrink-0 text-brand" size={18} />
                <span>
                  <b className="font-semibold text-ink">Mon – Sat:</b> 9:00 AM – 8:00 PM
                </span>
              </p>
            </div>
          </Reveal>

          {/* ===== RIGHT: form ===== */}
          <Reveal delay={0.1} className="border border-line bg-surface p-6 sm:p-8">
            <h2 className="display text-[2.2rem] leading-tight">Send us a message</h2>
            <p className="mt-2 text-[15.5px] text-muted">Fill out the form and we&apos;ll get back to you shortly.</p>

            {status === 'success' && (
              <p role="status" className="mt-5 flex items-center gap-2 border border-positive bg-positive/10 p-3.5 text-[15px] text-ink">
                <FiCheckCircle className="shrink-0 text-positive" /> Your message has been sent — we&apos;ll be in touch soon!
              </p>
            )}
            {status === 'error' && (
              <p role="alert" className="mt-5 flex items-center gap-2 border border-negative bg-negative/10 p-3.5 text-[15px] text-ink">
                <FiAlertCircle className="shrink-0 text-negative" /> Something went wrong. Please try again later.
              </p>
            )}

            <form onSubmit={handleSubmit} noValidate className="mt-6 grid gap-5">
              <input type="text" name="honeypot" value={formData.honeypot} onChange={handleChange} className="hidden" aria-hidden="true" autoComplete="off" tabIndex={-1} />
              <div className="grid gap-5 sm:grid-cols-2">
                {fields.map((f) => (
                  <div key={f.name}>
                    <label htmlFor={f.name} className="mb-1.5 block text-[14px] font-medium text-ink">
                      {f.label}
                    </label>
                    <div className={frame(f.name)}>
                      <span className="text-muted">{f.icon}</span>
                      <input
                        type={f.type}
                        id={f.name}
                        name={f.name}
                        placeholder={f.placeholder}
                        className="h-12 w-full min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-subtle"
                        value={formData[f.name]}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        aria-invalid={!!(errors[f.name] && touched[f.name])}
                      />
                    </div>
                    {errors[f.name] && touched[f.name] && <p className="mt-1.5 text-[13px] text-negative">{errors[f.name]}</p>}
                  </div>
                ))}
              </div>
              <div>
                <label htmlFor="message" className="mb-1.5 block text-[14px] font-medium text-ink">
                  Message
                </label>
                <div className={frame('message').replace('items-center', 'items-start')}>
                  <span className="pt-3.5 text-muted">
                    <FiMessageSquare />
                  </span>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    placeholder="Tell us a bit about what you need…"
                    className="w-full min-w-0 resize-y bg-transparent py-3 text-[15px] text-ink outline-none placeholder:text-subtle"
                    value={formData.message}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={!!(errors.message && touched.message)}
                  />
                </div>
                {errors.message && touched.message && <p className="mt-1.5 text-[13px] text-negative">{errors.message}</p>}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="group inline-flex h-[52px] items-center justify-center gap-2 bg-brand px-7 text-[15.5px] font-medium text-on-brand transition-colors hover:bg-brand-hover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Sending…' : 'Send Message'}
                {!loading && <FiSend className="transition-transform group-hover:translate-x-0.5" />}
              </button>
            </form>
          </Reveal>
        </Container>
      </section>

      {/* ===== Info cards ===== */}
      <section>
        <Container className="py-16 lg:py-20">
          <Stagger className="grid gap-5 md:grid-cols-3">
            {infoCards.map((c, i) => (
              <StaggerItem key={c.title} className="border-t-2 border-brand pt-5">
                <span className="font-code text-[12px] text-brand">0{i + 1}</span>
                <h3 className="mt-2 text-[18px] font-semibold">{c.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{c.body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </section>
    </>
  )
}
