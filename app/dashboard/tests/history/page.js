'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FiEye, FiClock, FiSearch, FiBookOpen, FiBarChart2, FiPlus,
  FiAlertCircle, FiFileText, FiSettings, FiTarget, FiCheckCircle,
  FiCalendar, FiLayers, FiAward, FiList,
} from 'react-icons/fi'

export default function TestHistoryPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all') // all | standard | custom

  const loadSessions = () => {
    setLoading(true)
    setError(null)
    const token = localStorage.getItem('token')
    fetch('/api/test-sessions', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error('Failed to load test history')
        return r.json()
      })
      .then(data => {
        const all = data.sessions || data || []
        const completed = all.filter(s => s.status === 'Completed' && s.totalScore !== undefined && s.totalScore !== null)
        setSessions(completed.sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt)))
      })
      .catch(err => setError(err.message || 'Something went wrong'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadSessions()
  }, [])

  const getTestMeta = (s) => {
    const configType = s.testId?.configType || (s.testId?.title?.includes('Custom') ? 'custom' : 'standard')
    const isCustom = configType === 'custom'
    const title = s.testId?.title || (isCustom ? 'Custom Practice' : 'Standard DSAT')
    const sections = s.testId?.sections || {}
    const hasRW = sections.rw || s.rwScore > 0
    const hasMath = sections.math || s.mathScore > 0
    const sectionLabel = hasRW && hasMath ? 'Full DSAT' : hasRW ? 'Reading & Writing' : hasMath ? 'Math' : 'Practice'
    const practiceMode = s.testId?.practiceMode || 'timed'
    const date = new Date(s.completedAt || s.createdAt)
    const filters = s.testId?.filters || {}
    const topics = filters.subtopics || []
    return { isCustom, title, sectionLabel, practiceMode, date, topics }
  }

  const filtered = sessions.filter(s => {
    const { isCustom, title, sectionLabel } = getTestMeta(s)
    if (filterType === 'standard' && isCustom) return false
    if (filterType === 'custom' && !isCustom) return false
    if (search) {
      const q = search.toLowerCase()
      return title.toLowerCase().includes(q) || sectionLabel.toLowerCase().includes(q)
    }
    return true
  })

  const stats = {
    total: sessions.length,
    standard: sessions.filter(s => !getTestMeta(s).isCustom).length,
    custom: sessions.filter(s => getTestMeta(s).isCustom).length,
    avgScore: sessions.length
      ? Math.round(sessions.reduce((a, s) => a + (s.totalScore || 0), 0) / sessions.length)
      : 0
  }

  const statCards = [
    { label: 'Total Tests', value: stats.total, icon: FiList, chip: 'bg-indigo-500' },
    { label: 'Standard DSAT', value: stats.standard, icon: FiFileText, chip: 'bg-violet-500' },
    { label: 'Custom Practice', value: stats.custom, icon: FiSettings, chip: 'bg-amber-500' },
    { label: 'Avg Score', value: stats.avgScore || '—', icon: FiAward, chip: 'bg-emerald-500' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 flex flex-col items-center text-center gap-3">
            <FiAlertCircle className="h-8 w-8 text-rose-500" />
            <p className="text-sm font-medium text-rose-700">{error}</p>
            <button
              onClick={loadSessions}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
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
              <FiBookOpen className="h-5 w-5" />
            </span>
            Test History
          </h1>
          <p className="mt-1 text-sm text-slate-500">All your completed practice tests</p>
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

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tests..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {[['all', 'All'], ['standard', 'Standard'], ['custom', 'Custom']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilterType(val)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  filterType === val
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <FiFileText className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">No tests found</h3>
            <p className="mt-1 text-sm text-slate-500">
              {sessions.length === 0
                ? 'You have not completed any practice tests yet.'
                : 'No tests match your current search or filter.'}
            </p>
            <button
              onClick={() => router.push('/dashboard/tests/create')}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              <FiPlus className="h-4 w-4" /> Create a Practice Test
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((session) => {
              const { isCustom, title, sectionLabel, practiceMode, date, topics } = getTestMeta(session)
              const totalScore = session.totalScore || 0
              const rwScore = session.rwScore
              const mathScore = session.mathScore
              const responses = session.responses || []
              const correct = session.correctAnswers ?? responses.filter(r => r.isCorrect).length
              const total = responses.length || session.totalQuestions || 0
              const answered = session.answeredQuestions ?? responses.length
              const accuracy = total > 0 ? Math.round((correct / total) * 100) : null
              // timeSpent (model field) is primary; fall back to start/end delta when not selected.
              const rawSeconds = session.timeSpent
                ?? (session.startTime && session.endTime
                  ? Math.max(0, Math.round((new Date(session.endTime) - new Date(session.startTime)) / 1000))
                  : null)
              const timeSpent = rawSeconds ? Math.round(rawSeconds / 60) : null
              const analysisDone = session.analysisSubmitted

              return (
                <div key={session._id} className="rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* Left: title + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${isCustom ? 'bg-violet-100 text-violet-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {isCustom ? <FiSettings className="h-3 w-3" /> : <FiFileText className="h-3 w-3" />}
                          {isCustom ? 'Custom' : 'Standard'}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600">
                          <FiLayers className="h-3 w-3" />
                          {sectionLabel}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                          practiceMode === 'timed' ? 'bg-amber-100 text-amber-700'
                          : practiceMode === 'tutor' ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                        }`}>
                          <FiClock className="h-3 w-3" />
                          {practiceMode === 'timed' ? 'Timed' : practiceMode === 'tutor' ? 'Tutor' : 'Untimed'}
                        </span>
                        {analysisDone && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700">
                            <FiCheckCircle className="h-3 w-3" /> Analysis submitted
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-slate-900 text-base truncate">{title || '—'}</h3>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1.5 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <FiCalendar className="h-3 w-3" />
                          {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <FiClock className="h-3 w-3" />
                          {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {timeSpent !== null && (
                          <span className="inline-flex items-center gap-1">
                            <FiClock className="h-3 w-3" /> {timeSpent} min
                          </span>
                        )}
                        {accuracy !== null && (
                          <span className="inline-flex items-center gap-1">
                            <FiTarget className="h-3 w-3" /> {accuracy}% accuracy ({correct}/{total})
                          </span>
                        )}
                        {(session.totalQuestions || answered) ? (
                          <span className="inline-flex items-center gap-1">
                            <FiList className="h-3 w-3" /> {answered}/{session.totalQuestions ?? total} answered
                          </span>
                        ) : null}
                      </div>

                      {topics.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {topics.slice(0, 4).map(t => (
                            <span key={t} className="rounded-full px-2.5 py-1 text-xs font-medium bg-violet-50 text-violet-700 border border-violet-100">{t}</span>
                          ))}
                          {topics.length > 4 && (
                            <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-500">+{topics.length - 4} more</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: scores */}
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
                        <p className="text-xl font-bold text-white">{totalScore}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => router.push(`/dashboard/tests/history/${session._id}`)}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                    >
                      <FiEye className="h-4 w-4" /> Review Answers
                    </button>
                    <button
                      onClick={() => router.push(`/dashboard/tests/${session.testId?._id || session.testId}/results?session_id=${session._id}`)}
                      className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
                    >
                      <FiBarChart2 className="h-4 w-4" /> View Analysis
                    </button>
                    <button
                      onClick={() => router.push('/dashboard/tests/create')}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors ml-auto"
                    >
                      <FiPlus className="h-4 w-4" /> New Test
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
