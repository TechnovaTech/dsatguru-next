'use client'
import { useState, useEffect } from 'react'
import { FiUsers, FiBarChart, FiRefreshCw, FiCheckSquare, FiRepeat } from 'react-icons/fi'
import Link from 'next/link'

export default function AdaptiveTestResults() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [reassigning, setReassigning] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchSessions() }, [])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/adaptive-tests/results', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (res.ok) setSessions(await res.json())
    } catch (e) {
      console.error('Failed to fetch adaptive results:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleReassign = async (session) => {
    if (!confirm(`Reassign "${session.testTitle}" to ${session.studentName}? A new test session will be created.`)) return
    setReassigning(session._id)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/adaptive-tests/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          originalSessionId: session._id,
          originalTestId: session.testId,
          userId: session.studentId
        })
      })
      const data = await res.json()
      if (res.ok) {
        alert('Test reassigned successfully!')
        fetchSessions()
      } else {
        alert(`Failed: ${data.error}`)
      }
    } catch (e) {
      alert('Failed to reassign test')
    } finally {
      setReassigning(null)
    }
  }

  const filtered = sessions.filter(s =>
    !search.trim() ||
    s.studentName.toLowerCase().includes(search.toLowerCase()) ||
    s.studentEmail.toLowerCase().includes(search.toLowerCase()) ||
    s.testTitle.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6" />
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-200 rounded" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FiBarChart className="text-blue-600" />
            Adaptive Test Results
          </h1>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search student or test..."
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64"
            />
            <button onClick={fetchSessions} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
              <FiRefreshCw /> Refresh
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <FiUsers className="mx-auto text-4xl text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Results Found</h3>
              <p className="text-gray-500">No completed adaptive tests yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map(session => (
                    <tr key={session._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{session.studentName}</div>
                        <div className="text-sm text-gray-500">{session.studentEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{session.testTitle}</div>
                        {session.isReassigned && (
                          <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Reassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          session.subject === 'Math' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {session.subject}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          session.practiceMode === 'timed' ? 'bg-orange-100 text-orange-700'
                          : session.practiceMode === 'tutor' ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                        }`}>
                          {session.practiceMode === 'timed' ? '⏱ Timed' : session.practiceMode === 'tutor' ? '📖 Tutor' : '🕐 Untimed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(session.completedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-blue-600">{session.totalScore} pts</div>
                        {(session.mathScore > 0 || session.rwScore > 0) && (
                          <div className="text-xs text-gray-500">M:{session.mathScore} R:{session.rwScore}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {session.analysisSubmitted ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center gap-1 w-fit">
                            <FiCheckSquare className="w-3 h-3" /> Analysis Submitted
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Pending Analysis
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/admin/adaptive-tests/results/${session.testId}?session_id=${session._id}`}
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          >
                            <FiBarChart /> View
                          </Link>
                          <button
                            onClick={() => handleReassign(session)}
                            disabled={reassigning === session._id}
                            className="text-amber-600 hover:text-amber-800 flex items-center gap-1 disabled:opacity-50"
                          >
                            <FiRepeat /> {reassigning === session._id ? 'Reassigning...' : 'Reassign'}
                          </button>
                        </div>
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
