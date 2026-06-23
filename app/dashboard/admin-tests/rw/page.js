'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiPlay, FiFileText, FiClock, FiCheckCircle, FiBookOpen, FiRefreshCw, FiAlertCircle, FiAward, FiCalendar, FiTarget, FiBarChart2 } from 'react-icons/fi'
import { useToast } from '@/app/components/ui/UIProvider'
import { canReattempt, reattemptSession } from '@/lib/reattempt'

const fmtDate = (x) => (x ? new Date(x).toLocaleDateString() : '—')

export default function AdminRWPage() {
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
        setError('Failed to load your profile. Please try again.')
        setLoading(false)
      }
    } catch (error) {
      console.error('Failed to fetch assigned tests', error)
      setError('Failed to load your assigned tests. Please try again.')
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

      const adminSessions = sessions.filter(s => {
        // Ensure testId exists and is an Admin test
        const isAdmin = s.testId?.practiceMode === 'admin'

        // STRICT Filtering: Only show tests explicitly marked as 'Reading and Writing'
        const isRW = s.testId?.subject === 'Reading and Writing' || (!s.testId?.subject && s.testId?.sections?.rw === true)

        // Check if test is assigned to this student
        const isAssigned = testIds.length === 0 || testIds.includes(s.testId?._id)

        return isAdmin && isRW && isAssigned
      })
      setHistory(adminSessions)
    } catch (error) {
      console.error('Failed to fetch history', error)
      setError('Failed to load your test history. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleStartSession = (session) => {
    if (session.testId) {
        router.push(`/dashboard/tests/${session.testId._id}/start?sessionId=${session._id}&returnUrl=/dashboard/admin-tests/rw`)
    } else {
        console.error("Session missing testId", session)
    }
  }

  const assignedCount = history.filter(h => h.status === 'Assigned').length
  const inProgressCount = history.filter(h => h.status === 'InProgress' && !h.isReassigned).length
  const completedCount = history.filter(h => h.status === 'Completed' && !h.isReassigned).length

  const tabs = [
    { name: 'Assigned', count: assignedCount },
    { name: 'In Progress', count: inProgressCount },
    { name: 'Completed', count: completedCount }
  ]

  const difficultyBadge = (difficulty) => {
    if (difficulty === 'Easy') return 'bg-emerald-100 text-emerald-700'
    if (difficulty === 'Hard') return 'bg-rose-100 text-rose-700'
    return 'bg-amber-100 text-amber-700'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-rose-100 bg-rose-50 p-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <FiAlertCircle className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-rose-800">Something went wrong</h3>
              <p className="mt-1 text-sm text-rose-600">{error}</p>
            </div>
            <button
              onClick={fetchAssignedTests}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              <FiRefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiBookOpen className="h-5 w-5" />
            </span>
            Reading &amp; Writing Admin Practice
          </h1>
          <p className="mt-1 text-sm text-slate-500">Access your assigned admin practice and track your progress.</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500 text-white">
                <FiFileText className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{assignedCount}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Assigned</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-white">
                <FiClock className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{inProgressCount}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">In Progress</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white">
                <FiCheckCircle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{completedCount}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200">
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
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${activeTab === tab.name ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-3">
          {activeTab === 'Assigned' && (
            assignedCount > 0 ? (
              history
                .filter(h => h.status === 'Assigned')
                .map((session) => {
                  const test = session.testId
                  const questionCount = test?.questions?.length || test?.totalQuestions || session.totalQuestions || 0
                  const difficulty = test?.difficulty || 'Mixed'
                  const duration = test?.duration || 0
                  const isReassigned = test?.isReassigned === true

                  return (
                    <div key={session._id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md md:flex-row md:items-center">
                      <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">Assigned</span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <FiCalendar className="h-3.5 w-3.5" /> {fmtDate(session.createdAt)}
                          </span>
                          {isReassigned && (
                            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                              <FiRefreshCw className="h-3 w-3" /> Reassigned
                            </span>
                          )}
                        </div>
                        <h3 className="mb-2 text-lg font-bold text-slate-900">{test?.title || 'Assigned Admin Test'}</h3>
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
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${difficultyBadge(difficulty)}`}>
                            {difficulty}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleStartSession(session)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                      >
                        <FiPlay className="h-4 w-4" /> Start Test
                      </button>
                    </div>
                  )
                })
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <FiFileText className="h-6 w-6" />
                </span>
                <h3 className="font-semibold text-slate-900">No admin tests assigned</h3>
                <p className="text-sm text-slate-500">You don&apos;t have any pending Reading &amp; Writing admin tests.</p>
              </div>
            )
          )}

          {(activeTab === 'In Progress' || activeTab === 'Completed') && (
            history.filter(h => {
              const statusMatch = activeTab === 'Completed' ? h.status === 'Completed' : h.status === 'InProgress'
              const notReassigned = !h.isReassigned
              return statusMatch && notReassigned
            }).length > 0 ? (
              history
                .filter(h => {
                  const statusMatch = activeTab === 'Completed' ? h.status === 'Completed' : h.status === 'InProgress'
                  const notReassigned = !h.isReassigned
                  return statusMatch && notReassigned
                })
                .map((session) => {
                  const test = session.testId
                  const questionCount = test?.questions?.length || test?.totalQuestions || session.totalQuestions || 0
                  const difficulty = test?.difficulty || 'Mixed'
                  const duration = test?.duration || 0
                  const isCompleted = session.status === 'Completed'

                  return (
                    <div key={session._id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md md:flex-row md:items-center">
                      <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {isCompleted ? 'Completed' : 'In Progress'}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <FiCalendar className="h-3.5 w-3.5" /> {fmtDate(session.createdAt)}
                          </span>
                          {isCompleted && (
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              session.analysisSubmitted ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {session.analysisSubmitted ? 'Analysis submitted' : 'Analysis pending'}
                            </span>
                          )}
                        </div>
                        <h3 className="mb-2 text-lg font-bold text-slate-900">{test?.title || 'Admin Practice Session'}</h3>
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
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${difficultyBadge(difficulty)}`}>
                            {difficulty}
                          </span>
                          {isCompleted && (
                            <>
                              <span className="flex items-center gap-1.5">
                                <FiAward className="h-4 w-4 text-slate-400" />
                                <span className="font-medium text-slate-900">{session.rwScore ?? session.totalScore ?? '—'}</span> Score
                              </span>
                              <span className="flex items-center gap-1.5">
                                <FiTarget className="h-4 w-4 text-slate-400" />
                                <span className="font-medium">{session.correctAnswers ?? '—'}</span> Correct
                              </span>
                              <span className="flex items-center gap-1.5">
                                <FiCheckCircle className="h-4 w-4 text-slate-400" />
                                Completed {fmtDate(session.completedAt)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isCompleted ? (
                          <>
                            {canReattempt(session) && (
                              <button
                                onClick={async () => { try { router.push(await reattemptSession(session, { returnUrl: '/dashboard/admin-tests/rw', moduleTest: false })) } catch { toast.error('Could not start a reattempt. Please try again.') } }}
                                title="This test was auto-submitted — let the student take it again"
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-100"
                              >
                                <FiRefreshCw className="h-4 w-4" /> Reattempt
                              </button>
                            )}
                            <button
                              onClick={() => router.push(`/dashboard/tests/${session.testId?._id}/results?session_id=${session._id}&returnUrl=/dashboard/admin-tests/rw`)}
                              className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${
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
                            onClick={() => router.push(`/dashboard/tests/${session.testId?._id}/start?sessionId=${session._id}&returnUrl=/dashboard/admin-tests/rw`)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                          >
                            <FiPlay className="h-4 w-4" /> Resume
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <FiBarChart2 className="h-6 w-6" />
                </span>
                <h3 className="font-semibold text-slate-900">No admin sessions found</h3>
                <p className="text-sm text-slate-500">
                  {activeTab === 'Completed'
                    ? 'You haven’t completed any Reading & Writing admin tests yet.'
                    : 'You don’t have any Reading & Writing admin tests in progress.'}
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
