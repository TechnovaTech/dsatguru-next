'use client'
import { useState, useEffect } from 'react'
import { FiUsers, FiBarChart, FiRefreshCw, FiCheckSquare } from 'react-icons/fi'
import Link from 'next/link'

export default function TutorTests() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch('/api/admin/tutor/results', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (res.ok) {
        const data = await res.json()
        console.log('Fetched tutor results:', data)
        setSessions(data)
      } else {
        console.error('Failed to fetch tutor results:', res.status, res.statusText)
      }
    } catch (error) {
      console.error('Error fetching tutor sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-sm text-slate-500">Loading tutor sessions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <FiCheckSquare className="text-indigo-600" />
            Tutor Tests
          </h1>
          <button
            onClick={fetchSessions}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
          >
            <FiRefreshCw /> Refresh
          </button>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          {sessions.length === 0 ? (
            <div className="py-12 text-center">
              <FiUsers className="mx-auto text-4xl text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">No Tutor Sessions Found</h3>
              <p className="text-slate-400 text-sm">There are no completed tutor mode tests yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Test Title</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.map((session) => (
                    <tr key={session._id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{session.studentName}</div>
                        <div className="text-sm text-slate-500">{session.studentEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">{session.testTitle || 'Untitled Test'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          session.subject === 'Math'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-indigo-50 text-indigo-700'
                        }`}>
                          {session.subject}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {session.completedAt ? new Date(session.completedAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-indigo-600">
                          {session.totalScore} pts
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {session.analysisSubmitted ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-1 w-fit">
                            <FiCheckSquare className="w-3 h-3" />
                            Analysis Submitted
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700">
                            Pending Analysis
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/admin/tutor/results/${session.testId}?sessionId=${session._id}`}
                          className="text-indigo-600 hover:text-indigo-800 flex items-center justify-end gap-1"
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
