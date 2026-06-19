'use client'
import { useState, useEffect } from 'react'
import { FiDollarSign, FiCreditCard, FiRefreshCw, FiDownload, FiFilter, FiEye, FiX, FiExternalLink } from 'react-icons/fi'
import { useToast, useConfirm } from '../ui/UIProvider'

export default function PaymentManager() {
  const toast = useToast()
  const confirm = useConfirm()
  const [payments, setPayments] = useState([])
  const [stats, setStats] = useState(null)
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewPayment, setViewPayment] = useState(null)
  const [tablePage, setTablePage] = useState(1)
  const [tablePageSize, setTablePageSize] = useState(10)
  const [methodPage, setMethodPage] = useState(1)
  const [methodPageSize, setMethodPageSize] = useState(4)
  const [revenuePage, setRevenuePage] = useState(1)
  const [revenuePageSize, setRevenuePageSize] = useState(4)

  const fetchPayments = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch('/api/admin/payments', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`)
      }
      {
        const body = await res.json()
        // Endpoint returns { payments, stats }.
        const data = Array.isArray(body) ? body : (body.payments || [])
        const serverStats = (!Array.isArray(body) && body.stats) ? body.stats : {}
        setPayments(data.map(p => ({
          id: p._id,
          studentName: p.studentName || 'Unknown',
          studentEmail: p.studentEmail || '',
          courseName: p.courseName || p.description,
          courseType: p.courseType || '',
          amount: Number(p.amount || 0),
          status: p.status,
          method: p.paymentGateway,
          createdAt: p.createdAt,
          currency: p.currency || 'USD',
          receiptUrl: p.receiptUrl || null
        })))
        const totals = data.reduce((acc, p) => {
          acc.totalRevenue += Number(p.amount || 0)
          const s = (p.status || '').toLowerCase()
          acc.successful += s === 'succeeded' ? 1 : 0
          acc.pending += s === 'pending' ? 1 : 0
          acc.failed += s === 'failed' ? 1 : 0
          acc.refunded += s === 'refunded' ? 1 : 0
          return acc
        }, { totalRevenue: 0, successful: 0, pending: 0, failed: 0, refunded: 0 })
        setStats({
          totalRevenue: totals.totalRevenue,
          monthlyRevenue: serverStats.monthlyRevenue != null ? serverStats.monthlyRevenue : 0,
          pendingPayments: totals.pending,
          refundRequests: serverStats.refundRequests != null ? serverStats.refundRequests : totals.refunded,
          successfulTransactions: totals.successful,
          failedTransactions: totals.failed,
        })
      }
    } catch (e) {
      setError(e?.message || 'Failed to load payments. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  const statusLabel = (status) => {
    const s = (status || "").toLowerCase()
    if (s === "succeeded") return "Completed"
    return s.charAt(0).toUpperCase() + s.slice(1)
  }

  const filteredPayments = payments.filter(payment => {
    if (filter === "all") return true
    return statusLabel(payment.status).toLowerCase() === filter.toLowerCase()
  })
  const totalTablePages = Math.max(1, Math.ceil(filteredPayments.length / tablePageSize))
  const tableStartIndex = (tablePage - 1) * tablePageSize
  const tableEndIndex = tableStartIndex + tablePageSize
  const visiblePayments = filteredPayments.slice(tableStartIndex, tableEndIndex)

  const methodsAgg = (() => {
    const map = new Map()
    for (const p of payments) {
      const key = (p.method || 'Unknown').toLowerCase()
      const prev = map.get(key) || { method: p.method || 'Unknown', count: 0 }
      prev.count += 1
      map.set(key, prev)
    }
    const arr = Array.from(map.values())
    const total = arr.reduce((s, i) => s + i.count, 0) || 1
    return arr.map(i => ({ ...i, percentage: Math.round((i.count / total) * 1000) / 10 }))
  })()
  const totalMethodPages = Math.max(1, Math.ceil(methodsAgg.length / methodPageSize))
  const methodStartIndex = (methodPage - 1) * methodPageSize
  const methodEndIndex = methodStartIndex + methodPageSize
  const visibleMethods = methodsAgg.slice(methodStartIndex, methodEndIndex)

  const revenueAgg = (() => {
    const map = new Map()
    for (const p of payments) {
      const key = p.courseType === 'question_bank' ? 'Question Banks' : 'Courses'
      const prev = map.get(key) || { category: key, revenue: 0, color: key === 'Question Banks' ? 'bg-indigo-500' : 'bg-sky-500' }
      prev.revenue += Number(p.amount || 0)
      map.set(key, prev)
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
  })()
  const totalRevenuePages = Math.max(1, Math.ceil(revenueAgg.length / revenuePageSize))
  const revenueStartIndex = (revenuePage - 1) * revenuePageSize
  const revenueEndIndex = revenueStartIndex + revenuePageSize
  const visibleRevenue = revenueAgg.slice(revenueStartIndex, revenueEndIndex)

  const handleRefund = async (paymentId) => {
    if (!(await confirm({ message: 'Are you sure you want to process this refund?', tone: 'danger', confirmText: 'Refund' }))) return

    const prevStatus = payments.find(p => p.id === paymentId)?.status

    // Optimistically flip the row.
    setPayments(prev =>
      prev.map(payment =>
        payment.id === paymentId
          ? { ...payment, status: "Refunded" }
          : payment
      )
    )

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch('/api/admin/payments/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ paymentIntentId: paymentId })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        // Revert on failure.
        setPayments(prev =>
          prev.map(payment =>
            payment.id === paymentId
              ? { ...payment, status: prevStatus }
              : payment
          )
        )
        toast.error(err?.error || 'Refund failed. Please try again.')
        return
      }

      // Confirmed succeeded; refresh stats from the server.
      setStats(prev => prev ? { ...prev, refundRequests: (prev.refundRequests || 0) + 1 } : prev)
    } catch (e) {
      setPayments(prev =>
        prev.map(payment =>
          payment.id === paymentId
            ? { ...payment, status: prevStatus }
            : payment
        )
      )
      toast.error('Refund failed. Please try again.')
    }
  }

  const handleExport = () => {
    const headers = ['Payment ID', 'Student Name', 'Student Email', 'Course', 'Amount', 'Currency', 'Status', 'Method', 'Date']
    const escape = (val) => {
      const s = String(val ?? '')
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows = filteredPayments.map(p => [
      p.id,
      p.studentName,
      p.studentEmail,
      p.courseName,
      p.amount,
      p.currency,
      statusLabel(p.status),
      p.method,
      new Date(p.createdAt).toLocaleDateString()
    ].map(escape).join(','))
    const csv = [headers.map(escape).join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getStatusColor = (status) => {
    switch (statusLabel(status).toLowerCase()) {
      case "completed": return "bg-emerald-50 text-emerald-700"
      case "pending": return "bg-amber-50 text-amber-700"
      case "failed": return "bg-rose-50 text-rose-700"
      case "refunded": return "bg-slate-100 text-slate-600"
      default: return "bg-slate-100 text-slate-600"
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"><FiDollarSign size={18} /></span>
              Payment Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">Track revenue, transactions, and payment methods.</p>
          </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <FiDownload /> Export
          </button>
          <button onClick={fetchPayments} className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <FiRefreshCw /> Refresh
          </button>
        </div>
        </div>

      {error && (
        <div
          role="alert"
          className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 flex items-center justify-between gap-4"
        >
          <span className="text-sm font-medium">{error}</span>
          <button
            onClick={fetchPayments}
            className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-700 whitespace-nowrap transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Revenue"
          value={`$${stats?.totalRevenue.toLocaleString() || 0}`}
          icon={<FiDollarSign />}
          color="bg-emerald-500"
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${stats?.monthlyRevenue.toLocaleString() || 0}`}
          icon={<FiDollarSign />}
          color="bg-indigo-500"
        />
        <StatCard
          title="Successful"
          value={stats?.successfulTransactions.toLocaleString() || 0}
          icon={<FiCreditCard />}
          color="bg-emerald-500"
        />
        <StatCard
          title="Pending"
          value={stats?.pendingPayments.toString() || 0}
          icon={<FiCreditCard />}
          color="bg-amber-500"
        />
        <StatCard
          title="Failed"
          value={stats?.failedTransactions.toString() || 0}
          icon={<FiCreditCard />}
          color="bg-rose-500"
        />
        <StatCard
          title="Refund Requests"
          value={stats?.refundRequests.toString() || 0}
          icon={<FiRefreshCw />}
          color="bg-indigo-500"
        />
      </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
        <FiFilter className="text-slate-500" />
        <label htmlFor="payment-status-filter" className="sr-only">Filter by status</label>
        <select
          id="payment-status-filter"
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setTablePage(1) }}
          className="rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="all">All Payments</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <span className="text-sm text-slate-500">
          Showing {visiblePayments.length} of {filteredPayments.length} filtered ({payments.length} total)
        </span>
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="payment-page-size" className="sr-only">Rows per page</label>
          <select
            id="payment-page-size"
            value={tablePageSize}
            onChange={(e) => { setTablePageSize(Number(e.target.value)); setTablePage(1) }}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {[10, 20, 50].map(s => <option key={s} value={s}>{s} per page</option>)}
          </select>
          <button
            onClick={() => setTablePage(p => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={tablePage === 1}
          >
            Prev
          </button>
          <span className="text-sm text-slate-600">Page {tablePage} of {totalTablePages}</span>
          <button
            onClick={() => setTablePage(p => Math.min(totalTablePages, p + 1))}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={tablePage >= totalTablePages}
          >
            Next
          </button>
        </div>
      </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Payment ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Student</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Course</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Method</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPayments.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiCreditCard size={22} /></div>
                  <h3 className="text-sm font-semibold text-slate-700">No payments found</h3>
                  <p className="mt-1 text-sm text-slate-400">Payments will appear here once transactions are made.</p>
                </td>
              </tr>
            )}
            {visiblePayments.map((payment) => (
              <tr key={payment.id} className="transition-colors hover:bg-indigo-50/40">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">
                  {payment.id}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-slate-900">{payment.studentName || payment.studentEmail || 'Unknown'}</div>
                  {payment.studentName && payment.studentEmail && <div className="text-xs text-slate-400">{payment.studentEmail}</div>}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {payment.courseName}
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                  ${payment.amount} {payment.currency}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(payment.status)}`}>
                    {statusLabel(payment.status)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {payment.method}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : '—'}
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  <button onClick={() => setViewPayment(payment)} className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800">
                    <FiEye /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Payment Methods Distribution</h3>
          {methodsAgg.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiCreditCard size={22} /></div>
              <h4 className="text-sm font-semibold text-slate-700">No payment methods yet</h4>
              <p className="mt-1 text-sm text-slate-400">Method usage will appear here.</p>
            </div>
          ) : (
          <div className="space-y-3">
            {visibleMethods.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">{item.method}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-slate-500">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
          )}
          <div className="mt-4 flex items-center gap-2">
            <label htmlFor="method-page-size" className="sr-only">Methods per page</label>
            <select
              id="method-page-size"
              value={methodPageSize}
              onChange={(e) => { setMethodPageSize(Number(e.target.value)); setMethodPage(1) }}
              className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {[4, 8, 12].map(s => <option key={s} value={s}>{s} per page</option>)}
            </select>
            <button
              onClick={() => setMethodPage(p => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={methodPage === 1}
            >
              Prev
            </button>
            <span className="text-sm text-slate-600">Page {methodPage} of {totalMethodPages}</span>
            <button
              onClick={() => setMethodPage(p => Math.min(totalMethodPages, p + 1))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={methodPage >= totalMethodPages}
            >
              Next
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Revenue by Course Category</h3>
          {revenueAgg.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiDollarSign size={22} /></div>
              <h4 className="text-sm font-semibold text-slate-700">No revenue data yet</h4>
              <p className="mt-1 text-sm text-slate-400">Revenue breakdown will appear here.</p>
            </div>
          ) : (
          <div className="space-y-3">
            {visibleRevenue.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">{item.category}</span>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                  <span className="text-sm font-semibold text-slate-900">${item.revenue.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
          )}
          <div className="mt-4 flex items-center gap-2">
            <label htmlFor="revenue-page-size" className="sr-only">Categories per page</label>
            <select
              id="revenue-page-size"
              value={revenuePageSize}
              onChange={(e) => { setRevenuePageSize(Number(e.target.value)); setRevenuePage(1) }}
              className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {[4, 8, 12].map(s => <option key={s} value={s}>{s} per page</option>)}
            </select>
            <button
              onClick={() => setRevenuePage(p => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={revenuePage === 1}
            >
              Prev
            </button>
            <span className="text-sm text-slate-600">Page {revenuePage} of {totalRevenuePages}</span>
            <button
              onClick={() => setRevenuePage(p => Math.min(totalRevenuePages, p + 1))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={revenuePage >= totalRevenuePages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      </div>

      {viewPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setViewPayment(null)} role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Payment Details</h3>
              <button onClick={() => setViewPayment(null)} aria-label="Close" className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"><FiX size={20} /></button>
            </div>
            <dl className="space-y-3 text-sm">
              <PaymentRow label="Payment ID" value={viewPayment.id} mono />
              <PaymentRow label="Student" value={viewPayment.studentName || 'Unknown'} />
              <PaymentRow label="Email" value={viewPayment.studentEmail || '—'} />
              <PaymentRow label="Course" value={viewPayment.courseName || '—'} />
              <PaymentRow label="Amount" value={`$${viewPayment.amount} ${viewPayment.currency}`} />
              <PaymentRow label="Status" value={statusLabel(viewPayment.status)} />
              <PaymentRow label="Method" value={viewPayment.method || '—'} />
              <PaymentRow label="Date" value={viewPayment.createdAt ? new Date(viewPayment.createdAt).toLocaleString() : '—'} />
            </dl>
            {viewPayment.receiptUrl && (
              <a href={viewPayment.receiptUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
                <FiExternalLink /> View receipt
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-slate-500">{title}</p>
        <p className="text-lg font-bold text-slate-900">{value}</p>
      </div>
      <div className={`${color} text-white p-2 rounded-full`}>
        {icon}
      </div>
    </div>
  </div>
)

const PaymentRow = ({ label, value, mono }) => (
  <div className="flex justify-between gap-4">
    <dt className="text-slate-500">{label}</dt>
    <dd className={`text-right font-medium text-slate-900 ${mono ? 'break-all font-mono text-xs' : ''}`}>{value}</dd>
  </div>
)
