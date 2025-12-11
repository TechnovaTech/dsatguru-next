'use client'
import { useState, useEffect } from 'react'
import { FiCreditCard, FiDownload, FiCheck, FiClock, FiX } from 'react-icons/fi'

export default function PaymentsPage() {
  const [payments, setPayments] = useState([
    {
      id: '1',
      courseTitle: 'DSAT Math Mastery',
      amount: 199,
      status: 'Succeeded',
      date: '2024-01-15',
      receiptUrl: '#'
    },
    {
      id: '2',
      courseTitle: 'DSAT English Excellence',
      amount: 149,
      status: 'Succeeded',
      date: '2024-01-10',
      receiptUrl: '#'
    },
    {
      id: '3',
      courseTitle: 'PSAT Prep Complete',
      amount: 99,
      status: 'Pending',
      date: '2024-01-20',
      receiptUrl: null
    }
  ])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Succeeded':
        return <FiCheck className="text-green-600" />
      case 'Pending':
        return <FiClock className="text-yellow-600" />
      case 'Failed':
        return <FiX className="text-red-600" />
      default:
        return <FiClock className="text-gray-600" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Succeeded':
        return 'bg-green-100 text-green-800'
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'Failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const totalSpent = payments
    .filter(p => p.status === 'Succeeded')
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payments</h1>
        <p className="text-gray-600">View your payment history and manage billing</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">${totalSpent}</p>
            </div>
            <FiCreditCard className="text-blue-600" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Successful Payments</p>
              <p className="text-2xl font-bold text-green-600">
                {payments.filter(p => p.status === 'Succeeded').length}
              </p>
            </div>
            <FiCheck className="text-green-600" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pending Payments</p>
              <p className="text-2xl font-bold text-yellow-600">
                {payments.filter(p => p.status === 'Pending').length}
              </p>
            </div>
            <FiClock className="text-yellow-600" size={24} />
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Payment History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Course
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {payment.courseTitle}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">${payment.amount}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(payment.status)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(payment.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {payment.receiptUrl && payment.status === 'Succeeded' && (
                      <button className="text-blue-600 hover:text-blue-900 flex items-center">
                        <FiDownload className="mr-1" size={16} />
                        Receipt
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {payments.length === 0 && (
        <div className="text-center py-12">
          <FiCreditCard className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500 text-lg">No payments found.</p>
          <p className="text-gray-400">Your payment history will appear here.</p>
        </div>
      )}
    </div>
  )
}