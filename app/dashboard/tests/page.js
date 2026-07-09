'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiPlay, FiClock, FiFileText, FiCheckCircle, FiRefreshCw, FiBookOpen, FiBarChart2, FiHelpCircle, FiLayers, FiAlertCircle, FiAward } from 'react-icons/fi'

const DIFFICULTY_STYLES = {
  Easy: 'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  Hard: 'bg-rose-100 text-rose-700',
}

// One row per test — most-advanced session wins (so a completed-then-reassigned test
// never lingers under Assigned). Matches the dashboard + tutor pages exactly.
const STATUS_RANK = { Completed: 3, InProgress: 2, Assigned: 1 }
const sTime = (s) => new Date(s.completedAt || s.updatedAt || s.createdAt || 0).getTime()

const categoryOf = (test) => {
  if (!test) return 'Practice'
  if (test.isModuleTest) return 'Module Test'
  if (test.isTutorTest || test.practiceMode === 'tutor') {
    if (test.subject === 'Math') return 'Tutor Math'
    if (test.subject === 'Reading and Writing') return 'Tutor R&W'
    return 'Tutor Test'
  }
  if (test.practiceMode === 'admin' || test.testType === 'Mock') return 'Mock Exam'
  if (test.configType === 'custom' || test.title === 'Self Practice Test') return 'Self Practice'
  return 'Adaptive'
}

const fmtDate = (x) => (x ? new Date(x).toLocaleDateString() : '—')

export default function TestsPage() {
  const router = useRouter()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('Assigned')

  useEffect(() => {
    fetchTests()
  }, [])

  const fetchTests = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      // Source strictly from the caller's own sessions (user-scoped on the server) so a
      // student can only ever see tests actually assigned to / taken by them — never the
      // global test catalog.
      const res = await fetch('/api/test-sessions', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('Failed to load tests')
      const data = await res.json()
      const sessions = data.sessions || data || []

      // Collapse to one session per test (most-advanced wins).
      const perTest = new Map()
      for (const s of sessions) {
        if (!s.testId) continue
        const tid = String(s.testId._id || s.testId)
        const cur = perTest.get(tid)
        const better = !cur ||
          (STATUS_RANK[s.status] || 0) > (STATUS_RANK[cur.status] || 0) ||
          ((STATUS_RANK[s.status] || 0) === (STATUS_RANK[cur.status] || 0) && sTime(s) > sTime(cur))
        if (better) perTest.set(tid, s)
      }
      // Drop deactivated sheets from anything the student could start (keep completed history).
      const collapsed = [...perTest.values()].filter(
        (s) => s.status === 'Completed' || s.testId?.isActive !== false
      )
      setRows(collapsed)
    } catch (e) {
      console.error('Error fetching tests:', e)
      setError("Couldn't load tests.")
    } finally {
      setLoading(false)
    }
  }

  const startPath = (session) => {
    const test = session.testId
    const base = test?.isModuleTest
      ? `/dashboard/tests/${test._id}/module-start`
      : `/dashboard/tests/${test._id}/start`
    // Pass the existing sessionId so the attempt updates this session instead of
    // creating a duplicate one.
    return `${base}?sessionId=${session._id}&returnUrl=/dashboard/tests`
  }

  const assigned = rows.filter((s) => s.status === 'Assigned')
  const inProgress = rows.filter((s) => s.status === 'InProgress' && !s.isReassigned)
  const completed = rows.filter((s) => s.status === 'Completed' && !s.isReassigned)

  const tabs = [
    { name: 'Assigned', count: assigned.length },
    { name: 'In Progress', count: inProgress.length },
    { name: 'Completed', count: completed.length },
  ]
  const list = activeTab === 'Assigned' ? assigned : activeTab === 'In Progress' ? inProgress : completed

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="mx-auto flex max-w-7xl items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500"></div>
        </div>
      </div>
    )
  }

  const renderCard = (session) => {
    const test = session.testId
    const isCompleted = session.status === 'Completed'
    const isInProgress = session.status === 'InProgress'
    const questionCount = test?.totalQuestions || test?.questions?.length || 0
    const category = categoryOf(test)

    return (
      <div
        key={session._id}
        className={`flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md ${
          isCompleted ? 'border-emerald-200' : 'border-slate-100 hover:border-indigo-200'
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
              category === 'Self Practice' ? 'bg-violet-100 text-violet-600' : 'bg-indigo-100 text-indigo-600'
            }`}>
              <FiFileText size={20} />
            </span>
            <div>
              <h3 className="text-base font-semibold leading-tight text-slate-900">{test?.title || '—'}</h3>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-slate-400">{category}</p>
            </div>
          </div>
          <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            isCompleted ? 'bg-emerald-100 text-emerald-700' : isInProgress ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
          }`}>
            {isInProgress ? 'In Progress' : session.status}
          </span>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {test?.difficulty && (
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${DIFFICULTY_STYLES[test.difficulty] || 'bg-slate-100 text-slate-600'}`}>
              {test.difficulty}
            </span>
          )}
          {!test?.isModuleTest && questionCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              <FiHelpCircle size={12} />
              {questionCount} Questions
            </span>
          )}
          {test?.isModuleTest && Array.isArray(test.modules) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              <FiLayers size={12} />
              {test.modules.length} Module{test.modules.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="mb-6 flex-1 space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <FiClock size={16} className="text-slate-400" />
            <span>{test?.isTimed === false || test?.practiceMode === 'tutor' ? 'Untimed' : `${test?.duration || 180} minutes`}</span>
          </div>
          <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <FiBarChart2 size={14} className="text-slate-400" />
            <span>Assigned {fmtDate(session.createdAt)}</span>
            {isCompleted && (
              <span className="ml-auto inline-flex items-center gap-1 font-medium text-emerald-600">
                <FiAward size={14} /> Score {session.totalScore ?? '—'}
              </span>
            )}
          </div>
        </div>

        {isCompleted ? (
          <button
            onClick={() => router.push(`/dashboard/tests/${test?._id}/results?session_id=${session._id}&returnUrl=/dashboard/tests`)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <FiBarChart2 size={16} />
            {session.analysisSubmitted ? 'Review answers' : 'See my results'}
          </button>
        ) : (
          <button
            onClick={() => router.push(startPath(session))}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            <FiPlay size={16} />
            {isInProgress ? 'Resume Test' : 'Start Test'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <FiFileText size={20} />
              </span>
              My Tests
            </h1>
            <p className="mt-1 text-sm text-slate-500">Tests assigned to you by your instructors</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push('/dashboard/tests/retest')}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <FiRefreshCw size={16} />
              Retest
            </button>
            <button
              onClick={() => router.push('/dashboard/tests/history')}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              <FiBookOpen size={16} />
              Test History
            </button>
          </div>
        </div>

        {/* Stat cards */}
        {!error && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: 'Assigned', value: assigned.length, icon: <FiFileText size={20} />, color: 'bg-indigo-500' },
              { label: 'In Progress', value: inProgress.length, icon: <FiPlay size={20} />, color: 'bg-amber-500' },
              { label: 'Completed', value: completed.length, icon: <FiCheckCircle size={20} />, color: 'bg-emerald-500' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <span className={`flex h-11 w-11 items-center justify-center rounded-lg text-white ${s.color}`}>{s.icon}</span>
                <div>
                  <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
                  <p className="text-sm text-slate-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {error ? (
          <div role="alert" className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700">
            <span className="flex items-center gap-2 text-sm font-medium">
              <FiAlertCircle size={18} />
              {error} Please try again.
            </span>
            <button
              onClick={fetchTests}
              className="flex-shrink-0 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200">
              {tabs.map((tab) => (
                <button
                  key={tab.name}
                  onClick={() => setActiveTab(tab.name)}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                    activeTab === tab.name ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
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

            {list.length === 0 ? (
              <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <FiFileText size={28} />
                </span>
                <h3 className="text-lg font-semibold text-slate-900">
                  {activeTab === 'Assigned' ? 'No tests assigned' : `No ${activeTab.toLowerCase()} tests`}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {activeTab === 'Assigned' ? 'Check back later for new tests from your instructors.' : `You have no ${activeTab.toLowerCase()} tests yet.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {list.map(renderCard)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
