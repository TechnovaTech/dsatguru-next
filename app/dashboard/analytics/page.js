'use client'
import { useState, useEffect } from 'react'
import { FiTrendingUp, FiTarget, FiBook, FiClock, FiBarChart2, FiAward, FiAlertCircle } from 'react-icons/fi'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    totalQuestions: 0,
    correctAnswers: 0,
    accuracy: 0,
    studyHours: 0,
    weeklyProgress: [],
    subjectPerformance: {
      math: [],
      rw: []
    },
    latestScores: {
      math: 0,
      rw: 0
    }
  })

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/user-results/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      } else {
        setError("Couldn't load analytics.")
      }
    } catch (error) {
      console.error('Failed to fetch analytics', error)
      setError("Couldn't load analytics.")
    } finally {
      setLoading(false)
    }
  }

  const scoreBadgeClass = (score) => {
    if (score >= 75) return 'bg-emerald-100 text-emerald-700'
    if (score >= 50) return 'bg-amber-100 text-amber-700'
    return 'bg-rose-100 text-rose-700'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500"></div>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Questions Attempted',
      value: stats.totalQuestions ?? 0,
      icon: FiTarget,
      chip: 'bg-indigo-500'
    },
    {
      label: 'Accuracy',
      value: `${stats.accuracy ?? 0}%`,
      icon: FiTrendingUp,
      chip: 'bg-emerald-500'
    },
    {
      label: 'Correct Answers',
      value: stats.correctAnswers ?? 0,
      icon: FiBook,
      chip: 'bg-violet-500'
    },
    {
      label: 'Study Hours',
      value: `${stats.studyHours ?? 0}h`,
      icon: FiClock,
      chip: 'bg-amber-500'
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiBarChart2 size={20} />
            </span>
            Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500">Track your learning progress and performance</p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
            <span className="flex items-center gap-2 text-sm font-medium">
              <FiAlertCircle size={16} />
              {error} Please try again.
            </span>
            <button
              onClick={fetchAnalytics}
              className="ml-4 rounded-lg bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.label}
                className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{card.label}</p>
                    <p className="mt-1 text-3xl font-extrabold text-slate-900">{card.value}</p>
                  </div>
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-white ${card.chip}`}>
                    <Icon size={22} />
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Latest Scaled Scores */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <FiAward className="text-indigo-500" size={16} />
                  Latest Math Score
                </p>
                <p className="mt-1 text-3xl font-extrabold text-slate-900">
                  {stats.latestScores?.math ?? '—'}
                </p>
              </div>
              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">
                Most recent
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <FiAward className="text-emerald-500" size={16} />
                  Latest Reading &amp; Writing Score
                </p>
                <p className="mt-1 text-3xl font-extrabold text-slate-900">
                  {stats.latestScores?.rw ?? '—'}
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                Most recent
              </span>
            </div>
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-bold text-slate-900">Weekly Progress</h2>
          {stats.weeklyProgress?.length > 0 ? (
            <div className="flex h-64 items-end justify-between gap-2">
              {stats.weeklyProgress.map((day, index) => (
                <div key={index} className="flex flex-1 flex-col items-center justify-end">
                  <span className="mb-1 text-xs font-semibold text-slate-700">{day.score ?? 0}%</span>
                  <div className="flex w-full justify-center">
                    <div
                      className="w-full max-w-[2.5rem] rounded-t-lg bg-indigo-500 transition-all duration-300 hover:bg-indigo-600"
                      style={{ height: `${Math.max((day.score ?? 0) / 100 * 200, 4)}px` }}
                    ></div>
                  </div>
                  <span className="mt-2 text-xs font-medium text-slate-500">{day.day ?? '—'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <FiBarChart2 size={24} />
              </span>
              <p className="text-sm font-semibold text-slate-700">No weekly activity yet</p>
              <p className="mt-1 text-sm text-slate-500">Complete some questions to see your progress here.</p>
            </div>
          )}
        </div>

        {/* Subject Performance */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Math */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-bold text-slate-900">Math Performance</h2>
            <div className="space-y-5">
              {stats.subjectPerformance?.math?.length > 0 ? (
                stats.subjectPerformance.math.map((item, idx) => (
                  <div key={idx}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{item.name || '—'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{item.total ?? 0} attempted</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${scoreBadgeClass(item.score ?? 0)}`}>
                          {item.score ?? 0}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-indigo-500 transition-all"
                        style={{ width: `${item.score ?? 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <FiTarget size={22} />
                  </span>
                  <p className="text-sm font-semibold text-slate-700">No Math data yet</p>
                  <p className="mt-1 text-sm text-slate-500">Attempt Math questions to unlock domain insights.</p>
                </div>
              )}
            </div>
          </div>

          {/* Reading & Writing */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-bold text-slate-900">Reading &amp; Writing Performance</h2>
            <div className="space-y-5">
              {stats.subjectPerformance?.rw?.length > 0 ? (
                stats.subjectPerformance.rw.map((item, idx) => (
                  <div key={idx}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{item.name || '—'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{item.total ?? 0} attempted</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${scoreBadgeClass(item.score ?? 0)}`}>
                          {item.score ?? 0}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${item.score ?? 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <FiBook size={22} />
                  </span>
                  <p className="text-sm font-semibold text-slate-700">No Reading &amp; Writing data yet</p>
                  <p className="mt-1 text-sm text-slate-500">Attempt R&amp;W questions to unlock domain insights.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
