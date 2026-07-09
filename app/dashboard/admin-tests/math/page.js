'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiPlay, FiFileText, FiClock, FiCheckCircle, FiRefreshCw, FiInbox, FiLoader, FiAward, FiTarget, FiCalendar } from 'react-icons/fi'
import { useToast } from '@/app/components/ui/UIProvider'
import { canReattempt, reattemptSession } from '@/lib/reattempt'

export default function AdminMathPage() {
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
        setError('Failed to load your assigned tests.')
        setLoading(false)
      }
    } catch (error) {
      console.error('Failed to fetch assigned tests', error)
      setError('Failed to load your assigned tests.')
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

        // STRICT Filtering: Only show tests explicitly marked as 'Math'
        const isMath = s.testId?.subject === 'Math' || (!s.testId?.subject && s.testId?.sections?.math === true)

        // Check if test is assigned to this student
        const isAssigned = testIds.length === 0 || testIds.includes(s.testId?._id)

        return isAdmin && isMath && isAssigned
      })

      setHistory(adminSessions)
    } catch (error) {
      console.error('Failed to fetch history', error)
      setError('Failed to load your practice history.')
    } finally {
      setLoading(false)
    }
  }

  const handleStartSession = (session) => {
    if (session.testId) {
       router.push(`/dashboard/tests/${session.testId._id}/start?sessionId=${session._id}&returnUrl=/dashboard/admin-tests/math`)
    } else {
       console.error("Session missing testId", session)
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
  // A deactivated (isActive===false) test is a dead/duplicate sheet — never surface it as
  // something the student can start. Completed history for such a test is left untouched.
  const assignedList = effectiveSessions.filter(h => h.status === 'Assigned' && h.testId?.isActive !== false)
  const inProgressList = effectiveSessions.filter(h => h.status === 'InProgress' && !h.isReassigned && h.testId?.isActive !== false)
  const completedList = effectiveSessions.filter(h => h.status === 'Completed' && !h.isReassigned)

  const tabs = [
    { name: 'Assigned', count: assignedList.length },
    { name: 'In Progress', count: inProgressList.length },
    { name: 'Completed', count: completedList.length }
  ]

  const fmtDate = (x) => (x ? new Date(x).toLocaleDateString() : '—')

  const difficultyBadge = (difficulty) =>
    difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-700' :
    difficulty === 'Hard' ? 'bg-rose-100 text-rose-700' :
    'bg-amber-100 text-amber-700'

  const statCards = [
    { label: 'Assigned', value: tabs[0].count, icon: <FiInbox className="h-5 w-5" />, chip: 'bg-indigo-500' },
    { label: 'In Progress', value: tabs[1].count, icon: <FiLoader className="h-5 w-5" />, chip: 'bg-amber-500' },
    { label: 'Completed', value: tabs[2].count, icon: <FiCheckCircle className="h-5 w-5" />, chip: 'bg-emerald-500' },
  ]

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
            <p className="font-semibold text-rose-700">{error}</p>
            <button
              onClick={fetchAssignedTests}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
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
              <FiTarget className="h-5 w-5" />
            </span>
            Math Mock Exams
          </h1>
          <p className="mt-1 text-sm text-slate-500">Your assigned full-length Math practice.</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {statCards.map((card) => (
            <div key={card.label} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-white ${card.chip}`}>
                {card.icon}
              </span>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{card.value}</p>
                <p className="text-sm text-slate-500">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200">
          {tabs.map(tab => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
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
            assignedList.length > 0 ? (
              assignedList
                .map((session) => {
                  const test = session.testId
                  const questionCount = test?.questions?.length || test?.totalQuestions || 0
                  const difficulty = test?.difficulty || 'Mixed'
                  const duration = test?.duration || 0
                  const isReassigned = test?.isReassigned === true

                  return (
                    <div key={session._id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md md:flex-row md:items-center">
                      <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">Assigned</span>
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <FiCalendar className="h-3.5 w-3.5" /> {fmtDate(session.createdAt)}
                          </span>
                          {isReassigned && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                              <FiRefreshCw className="h-3 w-3" /> Reassigned
                            </span>
                          )}
                        </div>
                        <h3 className="mb-2 text-lg font-bold text-slate-900">{test?.title || '—'}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <FiFileText className="h-4 w-4 text-slate-400" />
                            <span className="font-medium">{questionCount}</span> Question{questionCount !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1">
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
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                      >
                        <FiPlay className="h-4 w-4" /> Start Test
                      </button>
                    </div>
                  )
                })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <FiFileText className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="font-semibold text-slate-900">No admin tests assigned</h3>
                <p className="mt-1 text-sm text-slate-500">You don&apos;t have any pending math admin tests.</p>
              </div>
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
                  const answered = session.answeredQuestions ?? session.totalQuestions ?? questionCount

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
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <FiCalendar className="h-3.5 w-3.5" /> {fmtDate(session.createdAt)}
                          </span>
                          {isCompleted && (
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${session.analysisSubmitted ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
                              {session.analysisSubmitted ? 'Analysis Submitted' : 'Analysis Pending'}
                            </span>
                          )}
                        </div>
                        <h3 className="mb-2 text-lg font-bold text-slate-900">{test?.title || '—'}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <FiFileText className="h-4 w-4 text-slate-400" />
                            <span className="font-medium">{questionCount}</span> Question{questionCount !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1">
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
                            <span className="flex items-center gap-1">
                              <FiCheckCircle className="h-4 w-4 text-emerald-500" />
                              <span className="font-medium">{session.correctAnswers ?? 0}</span> / {answered} correct
                            </span>
                          )}
                          {isCompleted && (session.mathScore ?? session.totalScore) != null && (
                            <span className="flex items-center gap-1">
                              <FiAward className="h-4 w-4 text-indigo-500" />
                              <span className="font-medium">{session.mathScore ?? session.totalScore}</span> score
                            </span>
                          )}
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                              <FiCalendar className="h-3.5 w-3.5" /> Completed {fmtDate(session.completedAt)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isCompleted ? (
                          <>
                            {canReattempt(session) && (
                              <button
                                onClick={async () => { try { router.push(await reattemptSession(session, { returnUrl: '/dashboard/admin-tests/math', moduleTest: false })) } catch { toast.error('Could not start a reattempt. Please try again.') } }}
                                title="This test was auto-submitted — let the student take it again"
                                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-100"
                              >
                                <FiRefreshCw className="h-4 w-4" /> Reattempt
                              </button>
                            )}
                            <button
                              onClick={() => {
                                router.push(`/dashboard/tests/${session.testId?._id}/results?session_id=${session._id}&returnUrl=/dashboard/admin-tests/math`)
                              }}
                              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${
                                session.analysisSubmitted
                                  ? 'bg-emerald-600 hover:bg-emerald-700'
                                  : 'bg-indigo-600 hover:bg-indigo-700'
                              }`}
                            >
                              {session.analysisSubmitted ? 'Review answers' : 'See my results'}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => router.push(`/dashboard/tests/${session.testId?._id}/start?sessionId=${session._id}&returnUrl=/dashboard/admin-tests/math`)}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                          >
                            Resume
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <FiInbox className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="font-semibold text-slate-900">No admin sessions found</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {activeTab === 'Completed' ? 'You have not completed any math admin tests yet.' : 'You have no math admin tests in progress.'}
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
