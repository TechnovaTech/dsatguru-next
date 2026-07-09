'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FiPlay, FiFileText, FiClock, FiCheckCircle, FiAward, FiRefreshCw,
  FiLayers, FiTrendingUp, FiBarChart2, FiTarget
} from 'react-icons/fi'

export default function AdminTestsPage() {
  const router = useRouter()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('Assigned')

  useEffect(() => { fetchTests() }, [])

  const fetchTests = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const userRes = await fetch('/api/user/profile', { headers: { Authorization: `Bearer ${token}` } })
      if (!userRes.ok) throw new Error('Failed to load profile')
      const data = await userRes.json()
      const testIds = data.user.assignedTests || []
      await fetchHistory(testIds)
    } catch (e) {
      console.error('Failed to fetch admin tests', e)
      setError("Couldn't load admin tests.")
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async (testIds) => {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/test-sessions', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to load sessions')
    const data = await res.json()
    const sessions = data.sessions || data || []

    const adminSessions = sessions.filter(s => {
      if (!s.testId) return false
      const isAdmin = s.testId?.practiceMode === 'admin'
      const isAssigned = testIds.length === 0 || testIds.map(id => id?.toString()).includes(s.testId?._id?.toString())
      return isAdmin && isAssigned
    })

    setHistory(adminSessions)
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

  const returnUrl = '/dashboard/admin-tests'

  // Summary stats across all admin sessions
  const completedSessions = completedList
  const avgScore = completedSessions.length
    ? Math.round(completedSessions.reduce((sum, s) => sum + (s.totalScore || 0), 0) / completedSessions.length)
    : 0
  const stats = [
    { label: 'Total Tests', value: effectiveSessions.length, icon: <FiFileText className="h-5 w-5" />, color: 'bg-indigo-500' },
    { label: 'Assigned', value: tabs[0].count, icon: <FiTarget className="h-5 w-5" />, color: 'bg-amber-500' },
    { label: 'Completed', value: completedSessions.length, icon: <FiCheckCircle className="h-5 w-5" />, color: 'bg-emerald-500' },
    { label: 'Avg Score', value: completedSessions.length ? avgScore : '—', icon: <FiTrendingUp className="h-5 w-5" />, color: 'bg-violet-500' },
  ]

  const fmtDate = (x) => (x ? new Date(x).toLocaleDateString() : '—')

  const statusBadge = (status) => {
    if (status === 'Assigned') return 'bg-indigo-50 text-indigo-700 border border-indigo-100'
    if (status === 'Completed') return 'bg-emerald-50 text-emerald-700 border border-emerald-100'
    return 'bg-amber-50 text-amber-700 border border-amber-100'
  }

  const renderSession = (session) => {
    const test = session.testId
    const questionCount = test?.totalQuestions || test?.questions?.length || 0
    const duration = test?.duration || 0
    const isReassigned = session.isReassigned === true
    const sections = []
    if (test?.sections?.rw) sections.push('R&W')
    if (test?.sections?.math) sections.push('Math')

    const isCompleted = session.status === 'Completed'

    return (
      <div
        key={session._id}
        className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md sm:p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex-1 min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(session.status)}`}>
              {session.status === 'InProgress' ? 'In Progress' : session.status}
            </span>
            {sections.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {sections.join(' + ')}
              </span>
            )}
            {test?.subject && sections.length === 0 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {test.subject}
              </span>
            )}
            {test?.difficulty && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 capitalize">
                {test.difficulty}
              </span>
            )}
            {test?.isModuleTest && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 border border-violet-100">
                <FiLayers className="h-3 w-3" />
                {test?.numberOfModules ? `${test.numberOfModules} Modules` : 'Modular'}
              </span>
            )}
            {isReassigned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 border border-amber-100">
                <FiRefreshCw className="h-3 w-3" /> Reassigned
              </span>
            )}
          </div>

          <h3 className="text-lg font-bold text-slate-900">{test?.title || '—'}</h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-600">
            <span className="flex items-center gap-1.5">
              <FiFileText className="h-4 w-4 text-slate-400" />
              <span className="font-medium text-slate-700">{questionCount}</span> Questions
            </span>
            <span className="flex items-center gap-1.5">
              <FiClock className="h-4 w-4 text-slate-400" />
              {test?.isTimed
                ? <span className="font-medium text-slate-700">{duration} min</span>
                : <span className="font-medium text-amber-600">Untimed</span>}
            </span>
            <span className="flex items-center gap-1.5">
              <FiClock className="h-4 w-4 text-slate-400" />
              Assigned {fmtDate(session.createdAt)}
            </span>
            {isCompleted && (
              <span className="flex items-center gap-1.5">
                <FiCheckCircle className="h-4 w-4 text-emerald-500" />
                Completed {fmtDate(session.completedAt)}
              </span>
            )}
          </div>

          {isCompleted && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {typeof session.totalScore === 'number' && session.totalScore > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700">
                  <FiAward className="h-4 w-4" /> Score {session.totalScore}
                </span>
              )}
              {typeof session.rwScore === 'number' && session.rwScore > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600">
                  R&W {session.rwScore}
                </span>
              )}
              {typeof session.mathScore === 'number' && session.mathScore > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600">
                  Math {session.mathScore}
                </span>
              )}
              {typeof session.correctAnswers === 'number' && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                  <FiBarChart2 className="h-4 w-4" />
                  {session.correctAnswers}/{questionCount} Correct
                </span>
              )}
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                session.analysisSubmitted
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-amber-50 text-amber-700 border border-amber-100'
              }`}>
                {session.analysisSubmitted ? `Analysis submitted ${fmtDate(session.analysisSubmittedAt)}` : 'Analysis pending'}
              </span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {session.status === 'Assigned' && (
            <button
              onClick={() => router.push(`/dashboard/tests/${test?._id}/start?sessionId=${session._id}&returnUrl=${returnUrl}`)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              <FiPlay className="h-4 w-4" /> Start Test
            </button>
          )}
          {session.status === 'InProgress' && (
            <button
              onClick={() => router.push(`/dashboard/tests/${test?._id}/start?sessionId=${session._id}&returnUrl=${returnUrl}`)}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
            >
              <FiPlay className="h-4 w-4" /> Resume
            </button>
          )}
          {session.status === 'Completed' && (
            <button
              onClick={() => router.push(`/dashboard/tests/${test?._id}/results?session_id=${session._id}&returnUrl=${returnUrl}`)}
              className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors ${
                session.analysisSubmitted ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {session.analysisSubmitted ? 'View Analysis' : 'Submit Analysis'}
            </button>
          )}
        </div>
      </div>
    )
  }

  const filtered = activeTab === 'Assigned' ? assignedList
    : activeTab === 'In Progress' ? inProgressList
    : activeTab === 'Completed' ? completedList
    : []

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiFileText className="h-5 w-5" />
            </span>
            Admin Tests
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Access your assigned admin practice tests and track your progress.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
          </div>
        ) : (
          <>
            {/* Error */}
            {error && (
              <div role="alert" className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700">
                <span className="text-sm font-medium">{error} Please try again.</span>
                <button
                  onClick={fetchTests}
                  className="flex shrink-0 items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
                >
                  <FiRefreshCw className="h-4 w-4" /> Retry
                </button>
              </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-white ${s.color}`}>
                    {s.icon}
                  </span>
                  <div>
                    <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
                    <p className="text-xs font-medium text-slate-500">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200">
              {tabs.map(tab => (
                <button
                  key={tab.name}
                  onClick={() => setActiveTab(tab.name)}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === tab.name
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.name}
                  {tab.count > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      activeTab === tab.name ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="space-y-3">
              {filtered.length > 0 ? filtered.map(renderSession) : (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <FiFileText className="h-6 w-6" />
                  </span>
                  <h3 className="font-semibold text-slate-700">No tests in this category</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {activeTab === 'Assigned' ? "You don't have any pending admin tests." : `No ${activeTab.toLowerCase()} admin tests.`}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
