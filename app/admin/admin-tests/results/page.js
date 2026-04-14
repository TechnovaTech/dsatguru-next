'use client'
import { useState, useEffect } from 'react'
import { FiUsers, FiBarChart, FiRefreshCw, FiCheckSquare, FiClipboard } from 'react-icons/fi'
import Link from 'next/link'

export default function AdminTestResults() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch('/api/admin/admin-tests/results', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (res.ok) {
        const data = await res.json()
        setSessions(data)
      } else {
        console.error('Failed to fetch admin test results:', res.status)
      }
    } catch (error) {
      console.error('Error fetching admin test sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FiClipboard className="text-purple-600" />
            Admin Test Results
          </h1>
          <button
            onClick={fetchSessions}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
          >
            <FiRefreshCw /> Refresh
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {sessions.length === 0 ? (
            <div className="p-8 text-center">
              <FiUsers className="mx-auto text-4xl text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Admin Test Sessions Found</h3>
              <p className="text-gray-500">There are no completed admin practice tests yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sessions.map((session) => (
                    <tr key={session._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{session.studentName}</div>
                        <div className="text-sm text-gray-500">{session.studentEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{session.testTitle}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          session.subject === 'Math' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {session.subject}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(session.completedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-purple-600">
                          {session.totalScore} pts
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {session.analysisSubmitted ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center gap-1 w-fit">
                            <FiCheckSquare className="w-3 h-3" />
                            Analysis Submitted
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Pending Analysis
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link 
                          href={`/admin/admin-tests/results/${session.testId}?session_id=${session._id}`}
                          className="text-purple-600 hover:text-purple-900 flex items-center justify-end gap-1"
                        >
                          <FiBarChart /> View Analysis
                        </Link>
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
