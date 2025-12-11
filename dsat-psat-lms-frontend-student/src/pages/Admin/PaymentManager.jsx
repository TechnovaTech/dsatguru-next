import { useState, useEffect } from "react";
import { FiDollarSign, FiCreditCard, FiRefreshCw, FiDownload, FiFilter } from "react-icons/fi";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const getHeaders = () => ({
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    "ngrok-skip-browser-warning": "69420",
  },
});

const PaymentManager = () => {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/admin/payments`, getHeaders());
        const items = response.data?.data || [];
        setPayments(items);
        const totals = items.reduce((acc, p) => {
          acc.totalRevenue += Number(p.amount || 0);
          acc.successful += p.status?.toLowerCase() === "succeeded" ? 1 : 0;
          acc.pending += p.status?.toLowerCase() === "pending" ? 1 : 0;
          acc.failed += p.status?.toLowerCase() === "failed" ? 1 : 0;
          return acc;
        }, { totalRevenue: 0, successful: 0, pending: 0, failed: 0 });
        setStats({
          totalRevenue: totals.totalRevenue,
          monthlyRevenue: totals.totalRevenue,
          pendingPayments: totals.pending,
          refundRequests: 0,
          successfulTransactions: totals.successful,
          failedTransactions: totals.failed,
        });
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load payments");
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  const statusLabel = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "succeeded") return "Completed";
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const filteredPayments = payments.filter(payment => {
    if (filter === "all") return true;
    return statusLabel(payment.status).toLowerCase() === filter.toLowerCase();
  });

  const handleRefund = async (paymentId) => {
    if (window.confirm("Are you sure you want to process this refund?")) {
      setPayments(prev =>
        prev.map(payment =>
          payment.id === paymentId
            ? { ...payment, status: "Refunded" }
            : payment
        )
      );
    }
  };

  const getStatusColor = (status) => {
    switch (statusLabel(status).toLowerCase()) {
      case "completed": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "failed": return "bg-red-100 text-red-800";
      case "refunded": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) return <div className="p-6">Loading payments...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Payment Management</h1>
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
          value={`$${stats.totalRevenue.toLocaleString()}`}
          icon={<FiDollarSign />}
          color="bg-green-500"
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${stats.monthlyRevenue.toLocaleString()}`}
          icon={<FiDollarSign />}
          color="bg-blue-500"
        />
        <StatCard
          title="Successful"
          value={stats.successfulTransactions.toLocaleString()}
          icon={<FiCreditCard />}
          color="bg-green-500"
        />
        <StatCard
          title="Pending"
          value={stats.pendingPayments.toString()}
          icon={<FiCreditCard />}
          color="bg-yellow-500"
        />
        <StatCard
          title="Failed"
          value={stats.failedTransactions.toString()}
          icon={<FiCreditCard />}
          color="bg-red-500"
        />
        <StatCard
          title="Refund Requests"
          value={stats.refundRequests.toString()}
          icon={<FiRefreshCw />}
          color="bg-purple-500"
        />
      </div>

      {/* Filters */}
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

      {/* Payments Table */}
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
                    {payment.status}
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

      {/* Recent Transactions Summary */}
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
  );
};

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
);

export default PaymentManager;