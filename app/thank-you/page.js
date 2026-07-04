'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { FiCheckCircle, FiArrowRight } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import axios from 'axios'

const WHATSAPP_GROUP = 'https://chat.whatsapp.com/Kra2KjiCrzSHIKBOSd03bU'

export default function ThankYouPage() {
  const router = useRouter()
  const [enrollStatus, setEnrollStatus] = useState('idle') // idle | confirming | done | error

  useEffect(() => {
    // 1) Fire the Meta Pixel conversion. The base pixel is loaded site-wide in the
    //    root layout; reaching this page counts as a Lead (+ Purchase for value/ROAS).
    try {
      if (typeof window !== 'undefined' && window.fbq) {
        const amount = Number(new URLSearchParams(window.location.search).get('amount')) || undefined
        window.fbq('track', 'Lead')
        window.fbq('track', 'Purchase', amount ? { value: amount, currency: 'USD' } : { currency: 'USD' })
      }
    } catch (e) { /* pixel is best-effort */ }

    // 2) Confirm the enrollment against the Stripe session (there is no webhook — the
    //    return page records the enrollment). /api/enroll is idempotent and verifies
    //    the payment against Stripe metadata, so this is safe to call here.
    const params = new URLSearchParams(window.location.search)
    const courseId = params.get('courseId')
    const sessionId = params.get('session_id')
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!courseId || !sessionId || !token) return
    setEnrollStatus('confirming')
    axios
      .post('/api/enroll', { courseId, sessionId }, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => setEnrollStatus('done'))
      .catch(() => setEnrollStatus('error'))
  }, [])

  return (
    <section className="dg flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-4 py-10">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
        {/* header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-700 px-8 pb-10 pt-9 text-center text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <FiCheckCircle size={34} />
          </div>
          <h1 className="relative text-2xl font-extrabold md:text-3xl">Thank you for your purchase! 🎉</h1>
          <p className="relative mx-auto mt-2 max-w-sm text-sm text-indigo-100/90">
            Your enrollment is confirmed. Welcome to DSATGURU — let&apos;s get you scoring higher.
          </p>
        </div>

        {/* body */}
        <div className="px-8 py-8">
          {/* enrollment status */}
          <div className="mb-6 text-center text-sm">
            {enrollStatus === 'confirming' && <span className="text-slate-500">Confirming your enrollment…</span>}
            {enrollStatus === 'done' && <span className="font-medium text-emerald-600">✓ You&apos;re enrolled and ready to go.</span>}
            {enrollStatus === 'error' && (
              <span className="text-amber-600">
                Payment received. If your course isn&apos;t visible yet, refresh your dashboard or contact support.
              </span>
            )}
          </div>

          {/* WhatsApp group */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white">
              <FaWhatsapp size={26} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Join our WhatsApp group</h3>
            <p className="mt-1 text-sm text-slate-600">
              Get class updates, resources, and support directly from the DSATGURU team.
            </p>
            <a
              href={WHATSAPP_GROUP}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-transform hover:-translate-y-0.5 hover:bg-emerald-600"
            >
              <FaWhatsapp size={18} /> Join the WhatsApp Group
            </a>
          </div>

          {/* continue */}
          <button
            onClick={() => router.push('/dashboard')}
            className="dg-shine group mt-4 inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:-translate-y-0.5 hover:bg-indigo-700"
          >
            Continue to Dashboard <FiArrowRight className="transition-transform group-hover:translate-x-1" />
          </button>

          <p className="mt-5 text-center text-xs text-slate-400">
            Need help? Email <a className="underline" href="mailto:info@dsatguru.com">info@dsatguru.com</a> or call 1-329-239-8577.
          </p>
        </div>
      </div>
    </section>
  )
}
