'use client'
import { useState, useEffect } from 'react'
import { FiUsers, FiClock, FiPlay, FiPause, FiEye, FiRefreshCw, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import { useConfirm } from '../ui/UIProvider'

export default function TestSessionMonitoring() {
  const confirm = useConfirm()
  const [activeSessions, setActiveSessions] = useState([])
  const [completedSessions, setCompletedSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active')
  const [refreshInterval, setRefreshInterval] = useState(null)
  const [error, setError] = useState(null)
  const [compPage, setCompPage] = useState(1)
  const COMP_PAGE_SIZE = 15

  useEffect(() => {
    fetchSessions()
    
    // Set up auto-refresh for active sessions
    const interval = setInterval(() => {
      if (activeTab === 'active') {
        fetchSessions()
      }
    }, 30000) // Refresh every 30 seconds

    setRefreshInterval(interval)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeTab])

  // Reset completed-sessions pagination when switching tabs.
  useEffect(() => { setCompPage(1) }, [activeTab])

  const fetchSessions = async () => {
    setError(null)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const [activeResponse, completedResponse] = await Promise.all([
        fetch('/api/admin/test-sessions/active', { headers }),
        fetch('/api/admin/test-sessions/completed', { headers })
      ])

      if (!activeResponse.ok || !completedResponse.ok) {
        throw new Error('Failed to load test sessions')
      }

      const activeData = await activeResponse.json()
      setActiveSessions(Array.isArray(activeData) ? activeData : [])

      const completedData = await completedResponse.json()
      setCompletedSessions(Array.isArray(completedData) ? completedData : [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
      setError('Failed to load test sessions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatTimeRemaining = (endTime) => {
    const now = new Date()
    const end = new Date(endTime)
    const diff = end - now

    if (diff <= 0) return 'Time Up'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const getProgressPercentage = (currentQuestion, totalQuestions) => {
    return Math.round((currentQuestion / totalQuestions) * 100)
  }

  const terminateSession = async (sessionId) => {
    if (await confirm({ message: 'Are you sure you want to terminate this test session?', tone: 'danger', confirmText: 'Terminate' })) {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const response = await fetch(`/api/admin/test-sessions/${sessionId}/terminate`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        if (response.ok) {
          fetchSessions()
        }
      } catch (error) {
        console.error('Error terminating session:', error)
      }
    }
  }

  const extendTime = async (sessionId, additionalMinutes) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const response = await fetch(`/api/admin/test-sessions/${sessionId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ additionalMinutes })
      })
      if (response.ok) {
        fetchSessions()
      }
    } catch (error) {
      console.error('Error extending time:', error)
    }
  }

  const compTotalPages = Math.max(1, Math.ceil((completedSessions || []).length / COMP_PAGE_SIZE))
  const compCurrentPage = Math.min(compPage, compTotalPages)
  const compStartIndex = (compCurrentPage - 1) * COMP_PAGE_SIZE
  const pageCompleted = (completedSessions || []).slice(compStartIndex, compStartIndex + COMP_PAGE_SIZE)

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">Test Session Monitoring</h1>
        <button
          onClick={fetchSessions}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          <FiRefreshCw /> Refresh
        </button>
        </div>

      {error && (
        <div role="alert" className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <span className="text-sm text-rose-700">{error}</span>
          <button
            onClick={fetchSessions}
            className="rounded-lg bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6 flex gap-6 overflow-x-auto whitespace-nowrap border-b border-slate-200">
        <button
          onClick={() => setActiveTab('active')}
          className={`-mb-px border-b-2 px-1 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'active'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Active Sessions ({(activeSessions || []).length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`-mb-px border-b-2 px-1 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'completed'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Recent Completed ({(completedSessions || []).length})
        </button>
      </div>

      {/* Active Sessions */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {(activeSessions || []).length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white py-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiUsers size={22} /></div>
              <h3 className="text-lg font-semibold text-slate-700">No Active Sessions</h3>
              <p className="mt-1 text-sm text-slate-400">There are currently no students taking tests.</p>
            </div>
          ) : (
            (activeSessions || []).map((session) => (
              <div key={session._id} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{session.testTitle || 'Untitled Test'}</h3>
                    <p className="text-slate-600">Student: {session.studentName || 'Unknown'}</p>
                    <p className="text-sm text-slate-500">Started: {session.startTime ? new Date(session.startTime).toLocaleString() : '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      <FiPlay className="text-xs" />
                      Active
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="rounded-xl bg-blue-50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <FiClock className="text-blue-600" />
                      <span className="text-sm font-medium text-slate-700">Time Remaining</span>
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      {formatTimeRemaining(session.endTime)}
                    </div>
                  </div>

                  <div className="rounded-xl bg-indigo-50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <FiEye className="text-indigo-600" />
                      <span className="text-sm font-medium text-slate-700">Progress</span>
                    </div>
                    <div className="text-lg font-bold text-indigo-600">
                      {session.currentQuestion}/{session.totalQuestions}
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-indigo-600"
                        style={{ width: `${getProgressPercentage(session.currentQuestion, session.totalQuestions)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-amber-50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <FiCheckCircle className="text-amber-600" />
                      <span className="text-sm font-medium text-slate-700">Answered</span>
                    </div>
                    <div className="text-lg font-bold text-amber-600">
                      {session.answeredQuestions || 0}
                    </div>
                  </div>

                  <div className="rounded-xl bg-rose-50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <FiAlertCircle className="text-rose-600" />
                      <span className="text-sm font-medium text-slate-700">Violations</span>
                    </div>
                    <div className="text-lg font-bold text-rose-600">
                      {session.violations || 0}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => extendTime(session._id, 15)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    +15 min
                  </button>
                  <button
                    onClick={() => extendTime(session._id, 30)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    +30 min
                  </button>
                  <button
                    onClick={() => terminateSession(session._id)}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
                  >
                    Terminate
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Completed Sessions */}
      {activeTab === 'completed' && (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Student</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Test</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Duration</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">R&W Score</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Math Score</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Total Score</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Completed</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageCompleted.map((session) => (
                  <tr key={session._id} className="text-sm transition-colors hover:bg-indigo-50/40">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{session.studentName}</div>
                      <div className="text-slate-500">{session.studentEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-slate-700">{session.testTitle || 'Untitled Test'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                      {session.endTime && session.startTime
                        ? `${Math.round((new Date(session.endTime) - new Date(session.startTime)) / (1000 * 60))} min`
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-blue-600">
                        {session.rwScore || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-emerald-600">
                        {session.mathScore || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-bold text-indigo-600">
                        {session.totalScore || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                      {session.completedAt ? new Date(session.completedAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        session.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : session.status === 'terminated'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {session.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {(completedSessions || []).length === 0 && (
                  <tr>
                    <td className="px-6 py-12 text-center" colSpan={8}>
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiCheckCircle size={22} /></div>
                      <p className="text-sm font-medium text-slate-500">No completed sessions yet</p>
                      <p className="mt-1 text-xs text-slate-400">Finished test sessions will appear here.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {compTotalPages > 1 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row">
              <p className="text-sm text-slate-500">
                Showing <span className="font-medium text-slate-700">{compStartIndex + 1}</span>
                –<span className="font-medium text-slate-700">{Math.min(compStartIndex + COMP_PAGE_SIZE, completedSessions.length)}</span>
                {' '}of <span className="font-medium text-slate-700">{completedSessions.length}</span> sessions
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCompPage((p) => Math.max(1, p - 1))}
                  disabled={compCurrentPage <= 1}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600">Page {compCurrentPage} of {compTotalPages}</span>
                <button
                  onClick={() => setCompPage((p) => Math.min(compTotalPages, p + 1))}
                  disabled={compCurrentPage >= compTotalPages}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )
}
