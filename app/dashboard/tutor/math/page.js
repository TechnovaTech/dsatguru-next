'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiPlay, FiFileText, FiClock, FiCheckCircle, FiRefreshCw, FiBookOpen, FiBarChart2, FiAward, FiCheckSquare } from 'react-icons/fi'
import { useToast } from '../../../components/ui/UIProvider'

// A reattempt is offered only when the test was auto-submitted (a violation), the
// session isn't a reassignment, and it's still the first auto-submit (attempt < 2).
const canReattempt = (s) =>
  !!s && !s.isReassigned && (s.autoSubmitted || s.autoSubmitReason) && (s.attemptCount || 1) < 2

const fmtDate = (x) => (x ? new Date(x).toLocaleDateString() : '—')

const diffBadge = (difficulty) => {
  if (difficulty === 'Easy') return 'bg-emerald-100 text-emerald-700'
  if (difficulty === 'Hard') return 'bg-rose-100 text-rose-700'
  return 'bg-amber-100 text-amber-700'
}

export default function TutorMathPage() {
  const router = useRouter()
  const toast = useToast()
  const [stats, setStats] = useState({ domains: [] })
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('Assigned')
  const [assignedTestIds, setAssignedTestIds] = useState([])

  useEffect(() => {
    fetchAssignedTests()
  }, [])

  const fetchAssignedTests = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const userRes = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (userRes.ok) {
        const data = await userRes.json()
        setAssignedTestIds(data.user.assignedTests || [])
        fetchHistory(data.user.assignedTests || [])
      } else {
        setError('Failed to load your tests. Please try again.')
        setLoading(false)
      }
    } catch (error) {
      console.error('Failed to fetch assigned tests', error)
      setError('Failed to load your tests. Please try again.')
      setLoading(false)
    }
  }

  const fetchHistory = async (testIds) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/test-sessions', {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      })
      const data = await res.json()
      const sessions = data.sessions || data || []

      const tutorSessions = sessions.filter(s => {
        // Skip sessions where the test has been deleted
        if (!s.testId) return false

        // Ensure testId exists and is a Tutor test
        // EXCLUDE Admin tests (practiceMode === 'admin')
        const isTutor = (s.testId?.practiceMode === 'tutor' || s.testId?.isTutorTest === true) && s.testId?.practiceMode !== 'admin' && !s.testId?.isModuleTest

        const isMath = s.testId?.subject === 'Math' || (!s.testId?.subject && s.testId?.sections?.math === true)

        // Check if test is assigned to this student
        const isAssigned = testIds.length === 0 || testIds.map(id => id?.toString()).includes(s.testId?._id?.toString())

        return isTutor && isMath && isAssigned
      })

      setHistory(tutorSessions)
    } catch (error) {
      console.error('Failed to fetch history', error)
      setError('Failed to load your tests. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleStartSession = (session) => {
    if (session.testId) {
       router.push(`/dashboard/tests/${session.testId._id}/start?sessionId=${session._id}&returnUrl=/dashboard/tutor/math`)
    } else {
       console.error("Session missing testId", session)
    }
  }

  // Reset the session (server-side) and send the student back into the test.
  const handleReattempt = async (session) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/test-sessions/${session._id}/reattempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        router.push(`/dashboard/tests/${session.testId?._id}/start?sessionId=${session._id}&returnUrl=/dashboard/tutor/math`)
      } else {
        toast.error('Could not start a reattempt. Please try again.')
      }
    } catch (e) {
      toast.error('Could not start a reattempt. Please try again.')
    }
  }

  // One row per test — use the most-advanced session so a completed test never lingers under Assigned.
  const STATUS_RANK = { Completed: 3, InProgress: 2, Assigned: 1 }
  const sessionTime = (h) => new Date(h.completedAt || h.updatedAt || h.createdAt || 0).getTime()
  const effectiveSessions = (() => {
    const m = new Map()
    history.forEach(h => {
      const tid = String(h.testId?._id || h._id)
      const cur = m.get(tid)
      const better = !cur || (STATUS_RANK[h.status] || 0) > (STATUS_RANK[cur.status] || 0) || ((STATUS_RANK[h.status] || 0) === (STATUS_RANK[cur.status] || 0) && sessionTime(h) > sessionTime(cur))
      if (better) m.set(tid, h)
    })
    return [...m.values()]
  })()
  const assignedList = effectiveSessions.filter(h => h.status === 'Assigned')
  const inProgressList = effectiveSessions.filter(h => h.status === 'InProgress' && !h.isReassigned)
  const completedList = effectiveSessions.filter(h => h.status === 'Completed' && !h.isReassigned)

  const tabs = [
    { name: 'Assigned', count: assignedList.length },
    { name: 'In Progress', count: inProgressList.length },
    { name: 'Completed', count: completedList.length }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
            <p className="text-sm font-medium text-rose-700">{error}</p>
            <button
              onClick={fetchAssignedTests}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <FiRefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderEmpty = (heading, helper) => (
    <div className="rounded-2xl border border-slate-100 bg-white py-16 text-center shadow-sm">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <FiFileText className="h-6 w-6 text-slate-400" />
      </div>
      <h3 className="font-semibold text-slate-900">{heading}</h3>
      <p className="mt-1 text-sm text-slate-500">{helper}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiBookOpen className="h-5 w-5" />
            </span>
            Math Tutor Tests
          </h1>
          <p className="mt-1 text-sm text-slate-500">Access your assigned tutor tests and track your progress.</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-500 text-white">
              <FiFileText className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">{tabs[0].count}</p>
              <p className="text-sm text-slate-500">Assigned</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500 text-white">
              <FiClock className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">{tabs[1].count}</p>
              <p className="text-sm text-slate-500">In Progress</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <FiCheckCircle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">{tabs[2].count}</p>
              <p className="text-sm text-slate-500">Completed</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          {tabs.map(tab => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === tab.name
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.name}
              {tab.count > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${activeTab === tab.name ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-3">
          {activeTab === 'Assigned' && (
            assignedList.length > 0 ? (
              assignedList
                .map((session) => {
                  const test = session.testId
                  const questionCount = test?.questions?.length || test?.totalQuestions || 0
                  const difficulty = test?.difficulty || 'Mixed'
                  const duration = test?.duration || 0
                  const isReassigned = test?.isReassigned === true
                  const completedSession = history.find(h => String(h.testId?._id) === String(test?._id) && h.status === 'Completed')

                  return (
                    <div key={session._id} className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md md:flex-row md:items-center md:justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${completedSession ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {completedSession ? 'Completed' : 'Assigned'}
                          </span>
                          <span className="text-xs text-slate-500">{fmtDate(session.createdAt)}</span>
                          {isReassigned && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                              <FiRefreshCw className="h-3 w-3" /> Reassigned
                            </span>
                          )}
                        </div>
                        <h3 className="mb-2 text-lg font-bold text-slate-900">{test?.title || '—'}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <FiFileText className="h-4 w-4 text-slate-400" />
                            <span className="font-medium">{questionCount}</span> Question{questionCount !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <FiClock className="h-4 w-4 text-slate-400" />
                            {test?.isTimed ? (
                              <span className="font-medium">{duration} min</span>
                            ) : (
                              <span className="font-medium text-amber-600">Untimed</span>
                            )}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${diffBadge(difficulty)}`}>
                            {difficulty}
                          </span>
                          {completedSession && (
                            <span className="flex items-center gap-1.5 text-emerald-600">
                              <FiAward className="h-4 w-4" />
                              <span className="font-medium">Score: {completedSession.totalScore ?? completedSession.mathScore ?? '—'}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {completedSession ? (
                        <button
                          onClick={() => router.push(`/dashboard/tests/${test?._id}/results?session_id=${completedSession._id}&returnUrl=/dashboard/tutor/math`)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                        >
                          <FiCheckCircle className="h-4 w-4" /> View Results
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartSession(session)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                        >
                          <FiPlay className="h-4 w-4" /> Start Test
                        </button>
                      )}
                    </div>
                  )
                })
            ) : (
              renderEmpty('No tests assigned', "You don't have any pending math tests.")
            )
          )}

          {(activeTab === 'In Progress' || activeTab === 'Completed') && (
            (activeTab === 'Completed' ? completedList : inProgressList).length > 0 ? (
              (activeTab === 'Completed' ? completedList : inProgressList)
                .map((session) => {
                  const test = session.testId
                  const questionCount = test?.questions?.length || test?.totalQuestions || 0
                  const difficulty = test?.difficulty || 'Mixed'
                  const duration = test?.duration || 0
                  const isCompleted = session.status === 'Completed'

                  return (
                    <div key={session._id} className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md md:flex-row md:items-center md:justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {isCompleted ? 'Completed' : 'In Progress'}
                          </span>
                          <span className="text-xs text-slate-500">{fmtDate(session.createdAt)}</span>
                          {isCompleted && session.completedAt && (
                            <span className="text-xs text-slate-400">Finished {fmtDate(session.completedAt)}</span>
                          )}
                        </div>
                        <h3 className="mb-2 text-lg font-bold text-slate-900">{test?.title || '—'}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <FiFileText className="h-4 w-4 text-slate-400" />
                            <span className="font-medium">{questionCount}</span> Question{questionCount !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <FiClock className="h-4 w-4 text-slate-400" />
                            {test?.isTimed ? (
                              <span className="font-medium">{duration} min</span>
                            ) : (
                              <span className="font-medium text-amber-600">Untimed</span>
                            )}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${diffBadge(difficulty)}`}>
                            {difficulty}
                          </span>
                          {isCompleted && (
                            <>
                              <span className="flex items-center gap-1.5 text-emerald-600">
                                <FiAward className="h-4 w-4" />
                                <span className="font-medium">Score: {session.totalScore ?? session.mathScore ?? '—'}</span>
                              </span>
                              {(session.correctAnswers != null) && (
                                <span className="flex items-center gap-1.5 text-slate-600">
                                  <FiCheckSquare className="h-4 w-4 text-slate-400" />
                                  <span className="font-medium">{session.correctAnswers}</span> correct
                                  {session.answeredQuestions != null ? ` / ${session.answeredQuestions} answered` : ''}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isCompleted ? (
                          <>
                            {canReattempt(session) && (
                              <button
                                onClick={() => handleReattempt(session)}
                                title="This test was auto-submitted — let the student take it again"
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-100"
                              >
                                <FiRefreshCw className="h-4 w-4" /> Reattempt
                              </button>
                            )}
                            <button
                              onClick={() => {
                                router.push(`/dashboard/tests/${session.testId?._id}/results?session_id=${session._id}&returnUrl=/dashboard/tutor/math`)
                              }}
                              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${
                                session.analysisSubmitted
                                  ? 'bg-emerald-600 hover:bg-emerald-700'
                                  : 'bg-indigo-600 hover:bg-indigo-700'
                              }`}
                            >
                              <FiBarChart2 className="h-4 w-4" />
                              {session.analysisSubmitted ? 'View Analysis' : 'Submit Analysis'}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => router.push(`/dashboard/tests/${session.testId?._id}/start?sessionId=${session._id}&returnUrl=/dashboard/tutor/math`)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                          >
                            <FiPlay className="h-4 w-4" /> Resume
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
            ) : (
              renderEmpty(
                activeTab === 'Completed' ? 'No completed tests' : 'No tests in progress',
                activeTab === 'Completed' ? "You haven't completed any math tests yet." : "You don't have any math tests in progress."
              )
            )
          )}
        </div>
      </div>
    </div>
  )
}
