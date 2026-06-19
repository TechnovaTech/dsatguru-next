'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  FiTrendingUp, FiTrendingDown, FiMinus, FiAlertCircle, FiActivity,
  FiArrowDownRight, FiArrowUpRight, FiAward, FiBarChart2, FiClipboard,
} from 'react-icons/fi'

function getTrend(current, previous, isFirst) {
  if (isFirst) return { label: '—', color: 'text-slate-400', badge: 'bg-slate-100 text-slate-500', Icon: FiMinus }
  if (current < previous) return { label: 'Improved', color: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', Icon: FiArrowDownRight }
  if (current > previous) return { label: 'Worse', color: 'text-rose-600', badge: 'bg-rose-100 text-rose-700', Icon: FiArrowUpRight }
  return { label: 'Same', color: 'text-slate-500', badge: 'bg-slate-100 text-slate-600', Icon: FiMinus }
}

export default function ScoreTrackerPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRows = useCallback(async () => {
    const token = localStorage.getItem('token')
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/score-tracker', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        setError("Couldn't load the score tracker.")
        return
      }
      const data = await res.json()
      if (data.rows) setRows(data.rows)
    } catch (error) {
      console.error('Error fetching score tracker:', error)
      setError("Couldn't load the score tracker.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  const computed = rows.reduce((acc, r) => {
    const rawMisses = r.rawMisses !== null && r.rawMisses !== '' ? Number(r.rawMisses) : r.autoRawMisses
    const timingIssues = r.timingIssues !== null && r.timingIssues !== '' ? Number(r.timingIssues) : r.autoTimingIssues
    const guessCount = r.guessCount !== null && r.guessCount !== '' ? Number(r.guessCount) : r.autoGuessCount
    const carelessMistakes = r.carelessMistakes !== null && r.carelessMistakes !== '' ? Number(r.carelessMistakes) : r.autoCarelessMistakes

    const total = rawMisses + timingIssues + guessCount + carelessMistakes
    const prev = acc[acc.length - 1]
    const prevTotal = prev ? prev.total : null

    acc.push({
      ...r,
      rawMisses,
      timingIssues,
      guessCount,
      carelessMistakes,
      total,
      prevTotal
    })
    return acc
  }, [])

  const totalErrors = computed.reduce((s, r) => s + r.total, 0)
  const improvedDays = computed.filter((r, i) => i > 0 && r.total < (computed[i - 1]?.total ?? r.total)).length
  const bestDay = computed.reduce((best, r) => (!best || r.total < best.total) ? r : best, null)

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
            <p className="text-sm font-medium text-rose-700">{error} Please try again.</p>
            <button
              onClick={fetchRows}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const statCards = [
    { label: 'Total Errors (All Tests)', value: totalErrors, icon: FiAlertCircle, chip: 'bg-rose-500' },
    { label: 'Improvements', value: improvedDays, icon: FiTrendingDown, chip: 'bg-emerald-500' },
    { label: 'Tests Tracked', value: computed.length, icon: FiClipboard, chip: 'bg-indigo-500' },
    { label: 'Best Performance', value: bestDay && bestDay.total > 0 ? `${bestDay.total} Errors` : '—', icon: FiAward, chip: 'bg-violet-500' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiTrendingUp className="h-5 w-5" />
            </span>
            Admin Test Score Tracker
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Automatically tracking your errors from Admin-assigned tests. Lower misses = higher score.
          </p>
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

        {/* Table */}
        {computed.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <FiBarChart2 className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">No tracked tests yet</h3>
            <p className="mt-1 text-sm text-slate-500">
              No completed Admin test sessions found yet. Data will appear here automatically once you finish an assigned test.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Day</th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Test Title</th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Subject</th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Raw Misses<br /><span className="font-normal normal-case tracking-normal text-slate-400 text-[10px]">Wrong answers</span>
                  </th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Timing Issues<br /><span className="font-normal normal-case tracking-normal text-slate-400 text-[10px]">Rushed/missed</span>
                  </th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Guess Count<br /><span className="font-normal normal-case tracking-normal text-slate-400 text-[10px]">Not confident</span>
                  </th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Careless<br /><span className="font-normal normal-case tracking-normal text-slate-400 text-[10px]">Knew but wrong</span>
                  </th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total<br /><span className="font-normal normal-case tracking-normal text-slate-400 text-[10px]">Auto-sum</span>
                  </th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {computed.map((row, idx) => {
                  const trend = getTrend(row.total, computed[idx - 1]?.total, idx === 0)
                  const TrendIcon = trend.Icon

                  return (
                    <tr key={row._id || row.sessionId || idx} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="px-6 py-4 text-center font-medium text-slate-500">{row.day ?? '—'}</td>
                      <td className="px-6 py-4 text-center font-medium text-slate-700">{row.date || '—'}</td>
                      <td className="px-6 py-4 text-left font-semibold text-slate-900">{row.testTitle || '—'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                          row.subject === 'Math'
                            ? 'bg-emerald-100 text-emerald-700'
                            : row.subject === 'Reading and Writing' || row.subject === 'R&W'
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {row.subject || '—'}
                        </span>
                      </td>

                      {/* Raw Misses */}
                      <td className="px-6 py-4 text-center">
                        <span className={`text-base font-bold ${row.rawMisses > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                          {row.rawMisses}
                        </span>
                      </td>

                      {/* Timing Issues */}
                      <td className="px-6 py-4 text-center">
                        <span className={`text-base font-bold ${row.timingIssues > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                          {row.timingIssues}
                        </span>
                      </td>

                      {/* Guess Count */}
                      <td className="px-6 py-4 text-center">
                        <span className={`text-base font-bold ${row.guessCount > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>
                          {row.guessCount}
                        </span>
                      </td>

                      {/* Careless Mistakes */}
                      <td className="px-6 py-4 text-center">
                        <span className={`text-base font-bold ${row.carelessMistakes > 0 ? 'text-violet-600' : 'text-slate-300'}`}>
                          {row.carelessMistakes}
                        </span>
                      </td>

                      {/* Total Errors */}
                      <td className="px-6 py-4 text-center">
                        <span className={`text-lg font-extrabold ${
                          row.total === 0 ? 'text-slate-300'
                            : row.total <= 3 ? 'text-emerald-600'
                            : row.total <= 7 ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}>
                          {row.total}
                        </span>
                      </td>

                      {/* Trend */}
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${trend.badge}`}>
                          <TrendIcon className="h-3 w-3" />
                          {trend.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center gap-6 rounded-2xl border border-slate-100 bg-white p-4 text-xs text-slate-500 shadow-sm">
          <div className="flex items-center gap-2">
            <FiArrowDownRight className="h-3.5 w-3.5 text-emerald-600" />
            <span><span className="font-semibold text-slate-700">Improved</span> — errors decreased</span>
          </div>
          <div className="flex items-center gap-2">
            <FiArrowUpRight className="h-3.5 w-3.5 text-rose-600" />
            <span><span className="font-semibold text-slate-700">Worse</span> — errors increased</span>
          </div>
          <div className="flex items-center gap-2">
            <FiMinus className="h-3.5 w-3.5 text-slate-500" />
            <span><span className="font-semibold text-slate-700">Same</span> — no change</span>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 italic font-medium text-slate-400">
            <FiActivity className="h-3.5 w-3.5" />
            Data is automatically synchronized from your test analysis and performance.
          </span>
        </div>
      </div>
    </div>
  )
}
