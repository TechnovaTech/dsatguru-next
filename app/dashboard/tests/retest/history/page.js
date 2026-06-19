'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FiArrowLeft,
  FiEye,
  FiRefreshCw,
  FiBookOpen,
  FiCalendar,
  FiTarget,
  FiCheckCircle,
  FiAlertCircle,
} from 'react-icons/fi'

export default function RetestHistoryPage() {
  const router = useRouter()
  const [retests, setRetests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchRetestHistory()
  }, [])

  const fetchRetestHistory = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/test-sessions', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        const sessions = data.sessions || data || []

        const retestSessions = sessions.filter(s =>
          s.sessionType === 'Retest' && s.status === 'Completed'
        ).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))

        setRetests(retestSessions)
      } else {
        setError('Failed to load retest history')
      }
    } catch (error) {
      console.error('Error fetching retest history:', error)
      setError('Something went wrong while loading your retest history')
    } finally {
      setLoading(false)
    }
  }

  const fmtDate = (x) =>
    x ? new Date(x).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              onClick={() => router.push('/dashboard/tests/retest')}
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
            >
              <FiArrowLeft /> Back to Retest Dashboard
            </button>
            <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <FiBookOpen className="h-5 w-5" />
              </span>
              Retest History
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review every retest you&apos;ve completed and dive into the details.
            </p>
          </div>
          <button
            onClick={fetchRetestHistory}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <FiRefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {/* Error state */}
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-500" />
              <div>
                <p className="font-semibold text-rose-700">{error}</p>
                <button
                  onClick={fetchRetestHistory}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  <FiRefreshCw className="h-4 w-4" /> Retry
                </button>
              </div>
            </div>
          </div>
        ) : retests.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <FiBookOpen className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No retest history yet</h3>
            <p className="mt-1 text-sm text-slate-500">
              Once you complete a retest, your results will show up here.
            </p>
            <button
              onClick={() => router.push('/dashboard/tests/retest')}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              <FiRefreshCw className="h-4 w-4" /> Take a Retest
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {retests.map((retest, idx) => {
              const total = retest.totalQuestions ?? 0
              const answered = retest.answeredQuestions ?? 0
              const correct = retest.correctAnswers ?? 0
              const accuracy = total > 0 ? Math.round((correct / total) * 100) : null
              return (
                <div
                  key={retest._id || idx}
                  className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      {/* Title row */}
                      <div className="mb-4 flex flex-wrap items-center gap-2.5">
                        <h3 className="text-xl font-bold text-slate-900">
                          Retest #{retests.length - idx}
                        </h3>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          <FiCheckCircle className="h-3.5 w-3.5" /> Completed
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          <FiCalendar className="h-3.5 w-3.5" /> {fmtDate(retest.completedAt)}
                        </span>
                      </div>

                      {retest.testId?.title && (
                        <p className="mb-4 truncate text-sm font-medium text-slate-500">
                          {retest.testId.title}
                        </p>
                      )}

                      {/* Score cards */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                          <p className="mb-1 text-xs font-medium text-slate-500">Total Score</p>
                          <p className="text-3xl font-bold text-indigo-600">{retest.totalScore ?? '—'}</p>
                          <p className="text-xs text-slate-400">out of 1600</p>
                        </div>

                        <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
                          <p className="mb-1 text-xs font-medium text-slate-500">Reading &amp; Writing</p>
                          <p className="text-2xl font-bold text-violet-600">{retest.rwScore ?? '—'}</p>
                          <p className="text-xs text-slate-400">out of 800</p>
                        </div>

                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                          <p className="mb-1 text-xs font-medium text-slate-500">Math</p>
                          <p className="text-2xl font-bold text-emerald-600">{retest.mathScore ?? '—'}</p>
                          <p className="text-xs text-slate-400">out of 800</p>
                        </div>
                      </div>

                      {/* Question / accuracy stats */}
                      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <FiCheckCircle className="h-4 w-4 text-emerald-500" />
                          <span className="font-semibold text-slate-900">{correct}</span> correct
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <FiTarget className="h-4 w-4 text-indigo-500" />
                          <span className="font-semibold text-slate-900">{answered}</span> answered
                          {total ? <span className="text-slate-400">/ {total}</span> : null}
                        </span>
                        {accuracy !== null && (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900">{accuracy}%</span> accuracy
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 text-slate-400">
                          <FiCalendar className="h-4 w-4" /> Started {fmtDate(retest.startTime || retest.createdAt)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => router.push(`/dashboard/tests/retest/history/${retest._id}`)}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                    >
                      <FiEye className="h-4 w-4" /> View Details
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
