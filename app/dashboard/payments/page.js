'use client'
import { useState, useEffect } from 'react'
import { FiCreditCard, FiDownload, FiCheck, FiClock, FiX, FiDollarSign, FiAlertCircle } from 'react-icons/fi'

const formatAmount = (amount, currency) => {
  const value = typeof amount === 'number' ? amount : 0
  const code = currency || 'USD'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(value)
  } catch {
    return `${code} ${value.toFixed(2)}`
  }
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPayments = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch('/api/payments', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (res.ok) {
        const json = await res.json()
        setPayments(json.payments || [])
      } else {
        setError("Couldn't load payments.")
      }
    } catch (err) {
      console.error('Failed to fetch payments', err)
      setError("Couldn't load payments.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Succeeded':
        return <FiCheck className="text-emerald-600" />
      case 'Pending':
        return <FiClock className="text-amber-600" />
      case 'Failed':
      case 'Cancelled':
        return <FiX className="text-rose-600" />
      default:
        return <FiClock className="text-slate-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Succeeded':
        return 'bg-emerald-100 text-emerald-700'
      case 'Pending':
        return 'bg-amber-100 text-amber-700'
      case 'Failed':
      case 'Cancelled':
        return 'bg-rose-100 text-rose-700'
      default:
        return 'bg-slate-100 text-slate-600'
    }
  }

  const succeeded = payments.filter(p => p.status === 'Succeeded')
  const pendingCount = payments.filter(p => p.status === 'Pending').length
  const primaryCurrency = succeeded[0]?.currency || payments[0]?.currency || 'USD'
  const totalSpent = succeeded.reduce((sum, p) => sum + (p.amount || 0), 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiCreditCard size={20} />
            </span>
            Payments
          </h1>
          <p className="mt-1 text-sm text-slate-500">View your payment history and manage billing</p>
        </div>

        {error && (
          <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
            <span className="flex items-center gap-2 text-sm font-medium">
              <FiAlertCircle className="shrink-0" />
              {error} Please try again.
            </span>
            <button
              onClick={fetchPayments}
              className="ml-4 shrink-0 rounded-lg bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Spent</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{formatAmount(totalSpent, primaryCurrency)}</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500 text-white">
                <FiDollarSign size={20} />
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Successful Payments</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{succeeded.length}</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white">
                <FiCheck size={20} />
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending Payments</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{pendingCount}</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-white">
                <FiClock size={20} />
              </span>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-bold text-slate-900">Payment History</h2>
          </div>

          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <FiCreditCard size={28} />
              </span>
              <h3 className="text-base font-semibold text-slate-900">No payments found</h3>
              <p className="mt-1 text-sm text-slate-500">Your payment history will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Course</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Gateway</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Transaction ID</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="transition-colors hover:bg-indigo-50/40">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">{payment.courseTitle || '—'}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm font-semibold text-slate-900">{formatAmount(payment.amount, payment.currency)}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(payment.status)}`}>
                          {getStatusIcon(payment.status)}
                          {payment.status || '—'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium capitalize text-violet-700">
                          {payment.paymentGateway || '—'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="font-mono text-xs text-slate-500" title={payment.paymentIntentId || ''}>
                          {payment.paymentIntentId || '—'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                        {payment.date ? new Date(payment.date).toLocaleDateString() : '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                        {payment.receiptUrl && payment.status === 'Succeeded' ? (
                          <a
                            href={payment.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                          >
                            <FiDownload size={14} />
                            Receipt
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
