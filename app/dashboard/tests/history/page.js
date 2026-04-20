'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiEye, FiClock, FiFilter, FiSearch } from 'react-icons/fi'

const DIFF_COLOR = { Easy: 'bg-green-100 text-green-700', Medium: 'bg-yellow-100 text-yellow-700', Hard: 'bg-red-100 text-red-700' }

function ScoreBadge({ label, score, color }) {
  return (
    <div className={`rounded-xl p-3 ${color}`}>
      <p className="text-xs font-semibold opacity-70 mb-0.5">{label}</p>
      <p className="text-2xl font-bold">{score ?? '—'}</p>
    </div>
  )
}

export default function TestHistoryPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all') // all | standard | custom

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch('/api/test-sessions', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const all = data.sessions || data || []
        const completed = all.filter(s => s.status === 'Completed' && s.totalScore !== undefined && s.totalScore !== null)
        setSessions(completed.sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt)))
      })
      .finally(() => setLoading(false))
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

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📚 Test History</h1>
        <p className="text-gray-500 text-sm mt-1">All your completed practice tests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Tests', value: stats.total, color: 'bg-blue-50 text-blue-700' },
          { label: 'Standard DSAT', value: stats.standard, color: 'bg-indigo-50 text-indigo-700' },
          { label: 'Custom Practice', value: stats.custom, color: 'bg-purple-50 text-purple-700' },
          { label: 'Avg Score', value: stats.avgScore || '—', color: 'bg-green-50 text-green-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 border ${s.color} border-opacity-30`}>
            <p className="text-xs font-semibold opacity-70 uppercase tracking-wide">{s.label}</p>
            <p className="text-3xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tests..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          />
        </div>
        <div className="flex gap-2">
          {[['all', 'All'], ['standard', 'Standard'], ['custom', 'Custom']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterType(val)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                filterType === val ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-gray-600 font-medium mb-4">No tests found</p>
          <button
            onClick={() => router.push('/dashboard/tests/create')}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Create a Practice Test
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
            const correct = responses.filter(r => r.isCorrect).length
            const total = responses.length
            const accuracy = total > 0 ? Math.round((correct / total) * 100) : null
            const timeSpent = session.timeSpent ? Math.round(session.timeSpent / 60) : null

            return (
              <div key={session._id} className="bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  {/* Left: title + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isCustom ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {isCustom ? '⚙️ Custom' : '📋 Standard'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                        {sectionLabel}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        practiceMode === 'timed' ? 'bg-orange-100 text-orange-700'
                        : practiceMode === 'tutor' ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                      }`}>
                        {practiceMode === 'timed' ? '⏱ Timed' : practiceMode === 'tutor' ? '📖 Tutor' : '🕐 Untimed'}
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 text-base truncate">{title}</h3>

                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500">
                      <span>📅 {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <span>🕐 {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                      {timeSpent && <span>⏱ {timeSpent} min</span>}
                      {accuracy !== null && <span>🎯 {accuracy}% accuracy ({correct}/{total})</span>}
                    </div>

                    {topics.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {topics.slice(0, 4).map(t => (
                          <span key={t} className="px-2 py-0.5 bg-purple-50 text-purple-600 text-xs rounded-full border border-purple-100">{t}</span>
                        ))}
                        {topics.length > 4 && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">+{topics.length - 4} more</span>}
                      </div>
                    )}
                  </div>

                  {/* Right: scores */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {rwScore > 0 && (
                      <div className="text-center bg-blue-50 rounded-xl px-4 py-2">
                        <p className="text-xs text-blue-500 font-semibold">R&W</p>
                        <p className="text-xl font-bold text-blue-700">{rwScore}</p>
                      </div>
                    )}
                    {mathScore > 0 && (
                      <div className="text-center bg-green-50 rounded-xl px-4 py-2">
                        <p className="text-xs text-green-500 font-semibold">Math</p>
                        <p className="text-xl font-bold text-green-700">{mathScore}</p>
                      </div>
                    )}
                    <div className="text-center bg-gray-800 rounded-xl px-4 py-2">
                      <p className="text-xs text-gray-400 font-semibold">Score</p>
                      <p className="text-xl font-bold text-white">{totalScore}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => router.push(`/dashboard/tests/history/${session._id}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    <FiEye className="w-4 h-4" /> Review Answers
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/tests/${session.testId?._id || session.testId}/results?session_id=${session._id}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors"
                  >
                    📊 View Analysis
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/tests/create')}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors ml-auto"
                  >
                    + New Test
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
