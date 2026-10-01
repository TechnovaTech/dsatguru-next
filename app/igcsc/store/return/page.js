'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  FiCheckCircle, FiClock, FiAlertCircle, FiLoader, FiRefreshCw, FiArrowRight, FiShoppingBag, FiBookOpen, FiXCircle,
} from 'react-icons/fi'
import { apiGet } from '../../_components/api'
import { BTN_PRIMARY, BTN_SECONDARY } from '../../_components/PaperCard'
import { formatPrice } from '../../../../lib/igcscStoreShared'

// Stripe usually confirms within seconds, occasionally a little later. Ask
// every 5 seconds for a minute, then leave it to the button.
const AUTO_TRIES = 12
const AUTO_EVERY = 5000

const GHOST = 'inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'

function Shell({ icon: Icon, tone, title, children }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-100 text-slate-500',
  }
  return (
    <div className="mx-auto max-w-lg py-4 sm:py-10">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-gradient-to-r from-indigo-600 to-blue-600" />
        <div className="px-6 py-8 text-center sm:px-10 sm:py-10">
          <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${tones[tone] || tones.slate}`}>
            <Icon size={30} className={tone === 'indigo' ? 'animate-spin' : ''} />
          </span>
          <h1 className="mt-5 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  )
}

export default function IgcscStoreReturnPage() {
  const [state, setState] = useState('confirming')   // confirming | paid | pending | cancelled | error
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const sessionId = useRef('')
  const tries = useRef(0)
  const timer = useRef(null)
  const alive = useRef(true)

  const check = useCallback(async () => {
    clearTimeout(timer.current)
    if (!sessionId.current) return
    setChecking(true)
    try {
      const r = await apiGet(`/api/igcsc/store/checkout?session_id=${encodeURIComponent(sessionId.current)}`)
      if (!alive.current) return
      setOrder(r.order || null)
      setError('')
      if (r.paid) {
        setState('paid')
        return
      }
      if (r.order?.status === 'cancelled') {
        setState('cancelled')
        return
      }
      // An old return link for an order since refunded: say so, do not wait.
      if (r.order?.status === 'refunded' || r.order?.revokedAt) {
        setState('refunded')
        return
      }
      setState('pending')
      tries.current += 1
      if (tries.current < AUTO_TRIES) timer.current = setTimeout(check, AUTO_EVERY)
    } catch (e) {
      if (!alive.current) return
      setError(e.message)
      setState('error')
    } finally {
      if (alive.current) setChecking(false)
    }
  }, [])

  // Read from the URL directly: useSearchParams on a static page needs a
  // Suspense boundary or the build fails.
  useEffect(() => {
    alive.current = true
    const id = new URLSearchParams(window.location.search).get('session_id') || ''
    sessionId.current = id.trim()
    if (!sessionId.current) {
      setError('This page needs a payment reference. Open it from the payment page, or go back to the store.')
      setState('error')
    } else {
      check()
    }
    return () => {
      alive.current = false
      clearTimeout(timer.current)
    }
  }, [check])

  const retry = () => {
    tries.current = 0
    check()
  }

  if (state === 'confirming') {
    return (
      <Shell icon={FiLoader} tone="indigo" title="Confirming your payment…">
        <p className="mt-2 text-sm text-slate-500">This takes a few seconds. Please keep this page open.</p>
      </Shell>
    )
  }

  if (state === 'paid') {
    const isPaper = order?.kind === 'paper' && order?.paperId
    return (
      <Shell icon={FiCheckCircle} tone="green" title="Payment received">
        <p className="mt-2 text-sm text-slate-500">
          {isPaper ? 'Your paper is unlocked. Start it whenever you are ready.' : 'It is on your account now.'}
        </p>
        {order && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{isPaper ? 'Test paper' : 'Plan'}</p>
            <div className="mt-1 flex items-start justify-between gap-3">
              <p className="min-w-0 break-words text-sm font-bold text-slate-900">{order.title || 'Your purchase'}</p>
              <p className="flex-shrink-0 text-sm font-extrabold text-slate-900">{formatPrice(order.amount, order.currency)}</p>
            </div>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {isPaper && (
            <Link href={`/igcsc/papers/${order.paperId}`} className={`${BTN_PRIMARY} py-2.5`}>
              Start this paper <FiArrowRight size={14} />
            </Link>
          )}
          <Link href="/igcsc/my-tests?tab=papers" className={`${isPaper ? BTN_SECONDARY : BTN_PRIMARY} py-2.5`}>
            <FiBookOpen size={14} /> Open my tests
          </Link>
          <Link href="/igcsc/store" className={GHOST}>
            <FiShoppingBag size={14} /> Back to store
          </Link>
        </div>
      </Shell>
    )
  }

  if (state === 'pending') {
    return (
      <Shell icon={FiClock} tone="amber" title="Waiting for confirmation">
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          We have not heard back from the payment provider yet. If you were charged, this page updates within a minute.
        </p>
        {order?.title && (
          <p className="mt-4 text-sm font-semibold text-slate-700">
            {order.title} · {formatPrice(order.amount, order.currency)}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" onClick={retry} disabled={checking} className={`${BTN_PRIMARY} py-2.5`}>
            {checking ? <FiLoader className="animate-spin" size={14} /> : <FiRefreshCw size={14} />}
            {checking ? 'Checking…' : 'Check again'}
          </button>
          <Link href="/igcsc/store" className={GHOST}>
            <FiShoppingBag size={14} /> Back to store
          </Link>
        </div>
      </Shell>
    )
  }

  if (state === 'refunded') {
    return (
      <Shell icon={FiXCircle} tone="slate" title="This order was refunded">
        <p className="mt-2 text-sm text-slate-500">The payment for this order was refunded, so it no longer unlocks anything.</p>
        <div className="mt-6 flex justify-center">
          <Link href="/igcsc/store" className={`${BTN_PRIMARY} py-2.5`}>
            <FiShoppingBag size={14} /> Back to store
          </Link>
        </div>
      </Shell>
    )
  }

  if (state === 'cancelled') {
    return (
      <Shell icon={FiXCircle} tone="slate" title="Payment not completed">
        <p className="mt-2 text-sm text-slate-500">This checkout was cancelled or has expired. Nothing was charged.</p>
        <div className="mt-6 flex justify-center">
          <Link href="/igcsc/store" className={`${BTN_PRIMARY} py-2.5`}>
            <FiShoppingBag size={14} /> Back to store
          </Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell icon={FiAlertCircle} tone="red" title="We could not confirm this payment">
      <p className="mt-2 text-sm font-medium text-rose-700">{error || 'Something went wrong.'}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-500">
        If you were charged, your purchase still arrives: payments are checked again every time you open the store.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {sessionId.current && (
          <button type="button" onClick={retry} disabled={checking} className={`${BTN_PRIMARY} py-2.5`}>
            {checking ? <FiLoader className="animate-spin" size={14} /> : <FiRefreshCw size={14} />} Try again
          </button>
        )}
        <Link href="/igcsc/store" className={`${BTN_SECONDARY} py-2.5`}>
          <FiShoppingBag size={14} /> Back to store
        </Link>
        <Link href="/igcsc/my-tests" className={GHOST}>
          <FiBookOpen size={14} /> My tests
        </Link>
      </div>
    </Shell>
  )
}
