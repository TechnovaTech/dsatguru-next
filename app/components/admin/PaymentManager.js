'use client'
import { useState, useEffect } from 'react'
import { FiDollarSign, FiCreditCard, FiRefreshCw, FiDownload, FiFilter } from 'react-icons/fi'

export default function PaymentManager() {
  const [payments, setPayments] = useState([])
  const [stats, setStats] = useState(null)
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  const mockPayments = [
    {
      id: "pay_1234567890",
      studentName: "John Smith",
      courseName: "DSAT Math Mastery",
      amount: 199,
      status: "succeeded",
      method: "Credit Card",
      createdAt: new Date()
    },
    {
      id: "pay_0987654321",
      studentName: "Jane Doe",
      courseName: "DSAT English Excellence",
      amount: 149,
      status: "pending",
      method: "PayPal",
      createdAt: new Date()
    },
    {
      id: "pay_1122334455",
      studentName: "Mike Johnson",
      courseName: "PSAT Prep Complete",
      amount: 99,
      status: "failed",
      method: "Credit Card",
      createdAt: new Date()
    }
  ]

  useEffect(() => {
    setTimeout(() => {
      setPayments(mockPayments)
      const totals = mockPayments.reduce((acc, p) => {
        acc.totalRevenue += Number(p.amount || 0)
        acc.successful += p.status?.toLowerCase() === "succeeded" ? 1 : 0
        acc.pending += p.status?.toLowerCase() === "pending" ? 1 : 0
        acc.failed += p.status?.toLowerCase() === "failed" ? 1 : 0
        return acc
      }, { totalRevenue: 0, successful: 0, pending: 0, failed: 0 })
      
      setStats({
        totalRevenue: totals.totalRevenue,
        monthlyRevenue: totals.totalRevenue,
        pendingPayments: totals.pending,
        refundRequests: 0,
        successfulTransactions: totals.successful,
        failedTransactions: totals.failed,
      })
      setLoading(false)
    }, 1000)
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
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Payments</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <span className="text-sm text-gray-600">
          Showing {filteredPayments.length} of {payments.length} payments
        </span>
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
            {filteredPayments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {payment.id}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {payment.studentName}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {payment.courseName}
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                  ${payment.amount}
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
            {[
              { method: "Credit Card", count: 856, percentage: 58.7 },
              { method: "PayPal", count: 342, percentage: 23.4 },
              { method: "Stripe", count: 198, percentage: 13.6 },
              { method: "Bank Transfer", count: 60, percentage: 4.1 }
            ].map((item, index) => (
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
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue by Course Category</h3>
          <div className="space-y-3">
            {[
              { category: "Mathematics", revenue: 45680, color: "bg-blue-500" },
              { category: "Science", revenue: 38920, color: "bg-green-500" },
              { category: "Languages", revenue: 28340, color: "bg-purple-500" },
              { category: "Arts", revenue: 12740, color: "bg-orange-500" }
            ].map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm font-medium">{item.category}</span>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                  <span className="text-sm font-semibold">${item.revenue.toLocaleString()}</span>
                </div>
              </div>
            ))}
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
