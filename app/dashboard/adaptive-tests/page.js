'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FiPlay, FiFileText, FiClock, FiLayers, FiTarget, FiList,
  FiCalendar, FiCheckCircle, FiAlertCircle, FiInbox, FiActivity,
  FiBarChart2, FiAward, FiRefreshCw,
} from 'react-icons/fi'
import { useToast } from '@/app/components/ui/UIProvider'
import { canReattempt, reattemptSession } from '@/lib/reattempt'

export default function AdaptiveTestsPage() {
  const router = useRouter()
  const toast = useToast()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('Assigned')

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/test-sessions', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      })
      if (!res.ok) throw new Error('Failed to load adaptive tests')
      const data = await res.json()
      const sessions = data.sessions || data || []

      // Adaptive tests = from /admin/test-management
      // They have sections.math or sections.rw, and are NOT practiceMode 'admin' or 'tutor', NOT isTutorTest
      const adaptive = sessions.filter(s => {
        const t = s.testId
        if (!t) return false
        return (
          t.practiceMode !== 'admin' &&
          t.practiceMode !== 'tutor' &&
          t.isTutorTest !== true &&
          (t.sections?.math === true || t.sections?.rw === true)
        )
      })

      setHistory(adaptive)
    } catch (error) {
      console.error('Failed to fetch history', error)
      setError("Couldn't load adaptive tests.")
    } finally {
      setLoading(false)
    }
  }

  // One row per test — collapse to the most-advanced session so a completed test never
  // lingers under Assigned. Self-practice tests belong to the practice flow, not this
  // assigned-tests view, so drop them from every tab/stat entirely.
  const STATUS_RANK = { Completed: 3, InProgress: 2, Assigned: 1 }
  const sessionTime = (h) => new Date(h.completedAt || h.updatedAt || h.createdAt || 0).getTime()
  const effectiveSessions = (() => {
    const m = new Map()
    history.forEach(h => {
      if (h.testId?.isSelfPractice === true) return
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

  const statCards = [
    { label: 'Assigned', value: assignedList.length, icon: FiInbox, chip: 'bg-indigo-500' },
    { label: 'In Progress', value: inProgressList.length, icon: FiActivity, chip: 'bg-amber-500' },
    { label: 'Completed', value: completedList.length, icon: FiCheckCircle, chip: 'bg-emerald-500' },
    { label: 'Total Tests', value: effectiveSessions.length, icon: FiList, chip: 'bg-violet-500' },
  ]

  const returnUrl = '/dashboard/adaptive-tests'

  const renderSession = (session) => {
    const test = session.testId
    const sections = []
    if (test?.sections?.rw) sections.push('R&W')
    if (test?.sections?.math) sections.push('Math')
    const sectionLabel = sections.join(' + ') || '—'
    const duration = test?.duration || 180
    const questionCount = test?.totalQuestions || test?.questions?.length || 0
    const difficulty = test?.difficulty
    const createdAt = session.createdAt ? new Date(session.createdAt) : null
    const completedAt = session.completedAt ? new Date(session.completedAt) : null

    const isAssigned = session.status === 'Assigned'
    const isInProgress = session.status === 'InProgress'
    const isCompleted = session.status === 'Completed'

    // Completed-only derived data
    const responses = session.responses || []
    const correct = session.correctAnswers ?? responses.filter(r => r.isCorrect).length
    const totalQ = responses.length || session.totalQuestions || questionCount || 0
    const answered = session.answeredQuestions ?? responses.length
    const accuracy = totalQ > 0 ? Math.round((correct / totalQ) * 100) : null
    const rwScore = session.rwScore
    const mathScore = session.mathScore
    const totalScore = session.totalScore
    const analysisDone = session.analysisSubmitted

    return (
      <div key={session._id} className="rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Left: status, title, meta */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                isAssigned ? 'bg-indigo-100 text-indigo-700'
                : isCompleted ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
              }`}>
                {isAssigned ? <FiInbox className="h-3 w-3" /> : isCompleted ? <FiCheckCircle className="h-3 w-3" /> : <FiActivity className="h-3 w-3" />}
                {isInProgress ? 'In Progress' : session.status}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600">
                <FiLayers className="h-3 w-3" /> {sectionLabel}
              </span>
              {difficulty && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                  difficulty === 'hard' ? 'bg-rose-100 text-rose-700'
                  : difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
                }`}>
                  <FiBarChart2 className="h-3 w-3" /> {difficulty}
                </span>
              )}
              {isCompleted && analysisDone && (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700">
                  <FiCheckCircle className="h-3 w-3" /> Analysis submitted
                </span>
              )}
            </div>

            <h3 className="font-bold text-slate-900 text-base truncate">{test?.title || 'Adaptive Test'}</h3>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1.5 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <FiFileText className="h-3 w-3" /> {sectionLabel} &middot; 2 Modules each
              </span>
              <span className="inline-flex items-center gap-1">
                <FiClock className="h-3 w-3" /> {duration} min
              </span>
              {questionCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <FiList className="h-3 w-3" /> {questionCount} Questions
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <FiCalendar className="h-3 w-3" /> {createdAt ? createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </span>
              {isCompleted && completedAt && (
                <span className="inline-flex items-center gap-1">
                  <FiCheckCircle className="h-3 w-3" /> Completed {completedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              )}
              {isCompleted && accuracy !== null && (
                <span className="inline-flex items-center gap-1">
                  <FiTarget className="h-3 w-3" /> {accuracy}% accuracy ({correct}/{totalQ})
                </span>
              )}
              {isCompleted && (session.totalQuestions || answered) ? (
                <span className="inline-flex items-center gap-1">
                  <FiList className="h-3 w-3" /> {answered}/{session.totalQuestions ?? totalQ} answered
                </span>
              ) : null}
            </div>
          </div>

          {/* Right: scores (completed) */}
          {isCompleted && (rwScore > 0 || mathScore > 0 || (totalScore !== undefined && totalScore !== null)) && (
            <div className="flex items-center gap-3 flex-shrink-0">
              {rwScore > 0 && (
                <div className="text-center rounded-xl bg-indigo-50 px-4 py-2">
                  <p className="text-xs font-semibold text-indigo-500">R&amp;W</p>
                  <p className="text-xl font-bold text-indigo-700">{rwScore}</p>
                </div>
              )}
              {mathScore > 0 && (
                <div className="text-center rounded-xl bg-emerald-50 px-4 py-2">
                  <p className="text-xs font-semibold text-emerald-500">Math</p>
                  <p className="text-xl font-bold text-emerald-700">{mathScore}</p>
                </div>
              )}
              <div className="text-center rounded-xl bg-slate-900 px-4 py-2">
                <p className="text-xs font-semibold text-slate-400">Score</p>
                <p className="text-xl font-bold text-white">{totalScore ?? '—'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
          {isAssigned && (
            <button
              onClick={() => router.push(`/dashboard/tests/${test?._id}/start?sessionId=${session._id}&returnUrl=${returnUrl}`)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              <FiPlay className="h-4 w-4" /> Start Test
            </button>
          )}
          {isInProgress && (
            <button
              onClick={() => router.push(`/dashboard/tests/${test?._id}/start?sessionId=${session._id}&returnUrl=${returnUrl}`)}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
            >
              <FiPlay className="h-4 w-4" /> Resume
            </button>
          )}
          {isCompleted && canReattempt(session) && (
            <button
              onClick={async () => { try { router.push(await reattemptSession(session, { returnUrl, moduleTest: false })) } catch { toast.error('Could not start a reattempt. Please try again.') } }}
              title="This test was auto-submitted — let the student take it again"
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
            >
              <FiRefreshCw className="h-4 w-4" /> Reattempt
            </button>
          )}
          {isCompleted && (
            <button
              onClick={() => router.push(`/dashboard/tests/${test?._id}/results?session_id=${session._id}&returnUrl=${returnUrl}`)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
                analysisDone ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {analysisDone ? <><FiBarChart2 className="h-4 w-4" /> View Analysis</> : <><FiAward className="h-4 w-4" /> Submit Analysis</>}
            </button>
          )}
        </div>
      </div>
    )
  }

  // Filtered list derived from the same deduped + active arrays as the tabs/stats
  const filtered = activeTab === 'Assigned' ? assignedList
    : activeTab === 'In Progress' ? inProgressList
    : activeTab === 'Completed' ? completedList
    : []

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiTarget className="h-5 w-5" />
            </span>
            Adaptive Tests
          </h1>
          <p className="mt-1 text-sm text-slate-500">Access your assigned adaptive SAT practice tests and track your progress.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {statCards.map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-white ${s.chip}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-3xl font-extrabold text-slate-900">{s.value}</p>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{s.label}</p>
              </div>
            )
          })}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-slate-200">
          {tabs.map(tab => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === tab.name
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.name}
              {tab.count > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.name ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-rose-700">
              <FiAlertCircle className="h-4 w-4 flex-shrink-0" /> {error} Please try again.
            </span>
            <button
              onClick={fetchHistory}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors flex-shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* List */}
        <div className="space-y-4">
          {filtered.length > 0 ? (
            filtered.map(renderSession)
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <FiFileText className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {activeTab === 'Assigned' ? 'No adaptive tests assigned' : `No ${activeTab.toLowerCase()} adaptive tests`}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {activeTab === 'Assigned'
                  ? "You don't have any pending adaptive tests."
                  : `No ${activeTab.toLowerCase()} adaptive sessions found.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
