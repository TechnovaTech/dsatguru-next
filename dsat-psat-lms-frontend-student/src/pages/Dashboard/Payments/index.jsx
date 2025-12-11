import { useEffect, useState, useMemo } from "react";
import { getMyPayments } from "../../../services/api/payments";
import { 
  FiDownload, 
  FiRefreshCw, 
  FiSearch, 
  FiFilter, 
  FiCreditCard, 
  FiCheckCircle, 
  FiXCircle, 
  FiClock,
  FiDollarSign,
  FiCalendar,
  FiFileText
} from "react-icons/fi";
import { motion } from "framer-motion";

const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getMyPayments();
      const list = res?.data || [];
      console.log("Payments received from backend:", list);
      setPayments(list);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase() || "unknown";
    switch (statusLower) {
      case "completed":
      case "succeeded":
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            <FiCheckCircle size={12} />
            Completed
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            <FiClock size={12} />
            Pending
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            <FiXCircle size={12} />
            Failed
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            <FiXCircle size={12} />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
            <FiClock size={12} />
            {status || "Unknown"}
          </span>
        );
    }
  };

  const filteredAndSortedPayments = useMemo(() => {
    let filtered = payments.filter(payment => {
      const matchesSearch = !searchTerm || 
        payment.courseTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.paymentIntentId?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "failed_cancelled" && (payment.status?.toLowerCase() === "failed" || payment.status?.toLowerCase() === "cancelled")) ||
        payment.status?.toLowerCase() === statusFilter.toLowerCase();
      
      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "amount":
          aValue = a.amount || 0;
          bValue = b.amount || 0;
          break;
        case "course":
          aValue = a.courseTitle || "";
          bValue = b.courseTitle || "";
          break;
        case "status":
          aValue = a.status || "";
          bValue = b.status || "";
          break;
        default: // date
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
      }
      
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [payments, searchTerm, statusFilter, sortBy, sortOrder]);

  const totalAmount = useMemo(() => {
    return payments
      .filter(p => p.status?.toLowerCase() === "completed" || p.status?.toLowerCase() === "succeeded" || p.status?.toLowerCase() === "paid")
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

  const stats = useMemo(() => {
    const completed = payments.filter(p => p.status?.toLowerCase() === "completed" || p.status?.toLowerCase() === "succeeded" || p.status?.toLowerCase() === "paid").length;
    const pending = payments.filter(p => p.status?.toLowerCase() === "pending").length;
    const failed = payments.filter(p => p.status?.toLowerCase() === "failed" || p.status?.toLowerCase() === "cancelled").length;
    
    return { completed, pending, failed, total: payments.length };
  }, [payments]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment History</h1>
              <p className="text-gray-600">Track your course payments and download receipts</p>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <div className="flex items-center gap-2 text-red-800">
              <FiXCircle />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </motion.div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900">${totalAmount.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FiDollarSign className="text-green-600" size={24} />
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FiCheckCircle className="text-green-600" size={24} />
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <FiClock className="text-yellow-600" size={24} />
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FiCreditCard className="text-blue-600" size={24} />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters and Search */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-6 rounded-lg shadow-sm border mb-6"
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by course name or payment ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <FiFilter className="text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed_cancelled">Failed/Cancelled</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date">Sort by Date</option>
                <option value="amount">Sort by Amount</option>
                <option value="course">Sort by Course</option>
                <option value="status">Sort by Status</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Payments List */}
        {filteredAndSortedPayments.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border p-12 text-center"
          >
            <FiCreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {payments.length === 0 ? "No Payments Found" : "No Matching Payments"}
            </h3>
            <p className="text-gray-500">
              {payments.length === 0 
                ? "You haven't made any payments yet." 
                : "Try adjusting your search or filter criteria."}
            </p>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-lg shadow-sm border overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <FiFileText size={16} />
                        Course
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <FiDollarSign size={16} />
                        Amount
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <FiCalendar size={16} />
                        Date
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Receipt
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedPayments.map((payment, index) => (
                    <motion.tr 
                      key={payment.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {payment.courseTitle || "Unknown Course"}
                          </div>
                          {payment.paymentIntentId && (
                            <div className="text-xs text-gray-500">
                              ID: {payment.paymentIntentId}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          ${payment.amount?.toFixed(2) || "0.00"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {payment.currency?.toUpperCase() || "USD"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(payment.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {payment.receiptUrl ? (
                          <a
                            href={payment.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <FiDownload size={16} />
                            Download
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">Not Available</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Results Count */}
        {filteredAndSortedPayments.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 text-center">
            Showing {filteredAndSortedPayments.length} of {payments.length} payments
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentsPage;