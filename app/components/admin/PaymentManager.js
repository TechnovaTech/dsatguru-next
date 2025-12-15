'use client'
import { useState, useEffect } from 'react'
import { FiDollarSign, FiCreditCard, FiRefreshCw, FiDownload, FiFilter } from 'react-icons/fi'

export default function PaymentManager() {
  const [payments, setPayments] = useState([])
  const [stats, setStats] = useState(null)
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [tablePage, setTablePage] = useState(1)
  const [tablePageSize, setTablePageSize] = useState(10)
  const [methodPage, setMethodPage] = useState(1)
  const [methodPageSize, setMethodPageSize] = useState(4)
  const [revenuePage, setRevenuePage] = useState(1)
  const [revenuePageSize, setRevenuePageSize] = useState(4)

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const res = await fetch('/api/admin/payments', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        if (res.ok) {
          const data = await res.json()
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
            return acc
          }, { totalRevenue: 0, successful: 0, pending: 0, failed: 0 })
          setStats({
            totalRevenue: totals.totalRevenue,
            monthlyRevenue: Math.round(totals.totalRevenue / 6),
            pendingPayments: totals.pending,
            refundRequests: 0,
            successfulTransactions: totals.successful,
            failedTransactions: totals.failed,
          })
        }
      } finally {
        setLoading(false)
      }
    }
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
      const prev = map.get(key) || { category: key, revenue: 0, color: key === 'Question Banks' ? 'bg-purple-500' : 'bg-blue-500' }
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
    if (window.confirm("Are you sure you want to process this refund?")) {
      setPayments(prev =>
        prev.map(payment =>
          payment.id === paymentId
            ? { ...payment, status: "Refunded" }
            : payment
        )
      )
    }
  }

  const getStatusColor = (status) => {
    switch (statusLabel(status).toLowerCase()) {
      case "completed": return "bg-green-100 text-green-800"
      case "pending": return "bg-yellow-100 text-yellow-800"
      case "failed": return "bg-red-100 text-red-800"
      case "refunded": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-50 p-6">Loading payments...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
        <div className="flex gap-2">
          <button className="bg-green-500 text-white px-4 py-2 rounded flex items-center gap-2">
            <FiDownload /> Export
          </button>
          <button className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2">
            <FiRefreshCw /> Refresh
          </button>
        </div>
        </div>

      {/* Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Revenue"
          value={`$${stats?.totalRevenue.toLocaleString() || 0}`}
          icon={<FiDollarSign />}
          color="bg-green-500"
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${stats?.monthlyRevenue.toLocaleString() || 0}`}
          icon={<FiDollarSign />}
          color="bg-blue-500"
        />
        <StatCard
          title="Successful"
          value={stats?.successfulTransactions.toLocaleString() || 0}
          icon={<FiCreditCard />}
          color="bg-green-500"
        />
        <StatCard
          title="Pending"
          value={stats?.pendingPayments.toString() || 0}
          icon={<FiCreditCard />}
          color="bg-yellow-500"
        />
        <StatCard
          title="Failed"
          value={stats?.failedTransactions.toString() || 0}
          icon={<FiCreditCard />}
          color="bg-red-500"
        />
        <StatCard
          title="Refund Requests"
          value={stats?.refundRequests.toString() || 0}
          icon={<FiRefreshCw />}
          color="bg-purple-500"
        />
      </div>

        <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
        <FiFilter className="text-gray-500" />
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setTablePage(1) }}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Payments</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <span className="text-sm text-gray-600">
          Showing {visiblePayments.length} of {filteredPayments.length} filtered ({payments.length} total)
        </span>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={tablePageSize}
            onChange={(e) => { setTablePageSize(Number(e.target.value)); setTablePage(1) }}
            className="border rounded px-2 py-1 text-sm"
          >
            {[10, 20, 50].map(s => <option key={s} value={s}>{s} per page</option>)}
          </select>
          <button
            onClick={() => setTablePage(p => Math.max(1, p - 1))}
            className="px-2 py-1 border rounded text-sm"
            disabled={tablePage === 1}
          >
            Prev
          </button>
          <span className="text-sm text-gray-600">Page {tablePage} of {totalTablePages}</span>
          <button
            onClick={() => setTablePage(p => Math.min(totalTablePages, p + 1))}
            className="px-2 py-1 border rounded text-sm"
            disabled={tablePage >= totalTablePages}
          >
            Next
          </button>
        </div>
      </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {visiblePayments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {payment.id}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {payment.studentName || payment.studentEmail || 'Unknown'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {payment.courseName}
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                  ${payment.amount} {payment.currency}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(payment.status)}`}>
                    {statusLabel(payment.status)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {payment.method}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {new Date(payment.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  <div className="flex gap-2">
                    <button className="text-blue-600 hover:text-blue-900">
                      View
                    </button>
                    {statusLabel(payment.status) === "Completed" && (
                      <button
                        onClick={() => handleRefund(payment.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Refund
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Payment Methods Distribution</h3>
          <div className="space-y-3">
            {visibleMethods.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm font-medium">{item.method}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <select
              value={methodPageSize}
              onChange={(e) => { setMethodPageSize(Number(e.target.value)); setMethodPage(1) }}
              className="border rounded px-2 py-1 text-sm"
            >
              {[4, 8, 12].map(s => <option key={s} value={s}>{s} per page</option>)}
            </select>
            <button
              onClick={() => setMethodPage(p => Math.max(1, p - 1))}
              className="px-2 py-1 border rounded text-sm"
              disabled={methodPage === 1}
            >
              Prev
            </button>
            <span className="text-sm text-gray-600">Page {methodPage} of {totalMethodPages}</span>
            <button
              onClick={() => setMethodPage(p => Math.min(totalMethodPages, p + 1))}
              className="px-2 py-1 border rounded text-sm"
              disabled={methodPage >= totalMethodPages}
            >
              Next
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue by Course Category</h3>
          <div className="space-y-3">
            {visibleRevenue.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm font-medium">{item.category}</span>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                  <span className="text-sm font-semibold">${item.revenue.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <select
              value={revenuePageSize}
              onChange={(e) => { setRevenuePageSize(Number(e.target.value)); setRevenuePage(1) }}
              className="border rounded px-2 py-1 text-sm"
            >
              {[4, 8, 12].map(s => <option key={s} value={s}>{s} per page</option>)}
            </select>
            <button
              onClick={() => setRevenuePage(p => Math.max(1, p - 1))}
              className="px-2 py-1 border rounded text-sm"
              disabled={revenuePage === 1}
            >
              Prev
            </button>
            <span className="text-sm text-gray-600">Page {revenuePage} of {totalRevenuePages}</span>
            <button
              onClick={() => setRevenuePage(p => Math.min(totalRevenuePages, p + 1))}
              className="px-2 py-1 border rounded text-sm"
              disabled={revenuePage >= totalRevenuePages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-white p-4 rounded-lg shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-600">{title}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
      <div className={`${color} text-white p-2 rounded-full`}>
        {icon}
      </div>
    </div>
  </div>
)
