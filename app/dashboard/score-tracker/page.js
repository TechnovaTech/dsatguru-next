'use client'
import { useState, useEffect, useCallback } from 'react'

function getTrend(current, previous, isFirst) {
  if (isFirst) return { label: '—', color: 'text-gray-400', icon: '—' }
  if (current < previous) return { label: 'Improved', color: 'text-green-600', icon: '↓ Improved' }
  if (current > previous) return { label: 'Worse', color: 'text-red-500', icon: '↑ Worse' }
  return { label: 'Same', color: 'text-gray-500', icon: '→ Same' }
}

export default function ScoreTrackerPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchRows = useCallback(async () => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/score-tracker', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.rows) setRows(data.rows)
    } catch (error) {
      console.error('Error fetching score tracker:', error)
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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Score Tracker...</div>

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📈 Admin Test Score Tracker</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Automatically tracking your errors from Admin-assigned tests. Lower misses = higher score.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Errors (All Tests)</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{totalErrors}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Improvements</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{improvedDays}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Tests Tracked</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{computed.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Best Performance</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {bestDay && bestDay.total > 0 ? `${bestDay.total} Errors` : '—'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="px-3 py-4 text-center font-semibold w-12">Day</th>
              <th className="px-3 py-4 text-center font-semibold w-24">Date</th>
              <th className="px-3 py-4 text-left font-semibold">Test Title</th>
              <th className="px-3 py-4 text-center font-semibold w-28">Subject</th>
              <th className="px-3 py-4 text-center font-semibold w-28">
                Raw Misses<br /><span className="font-normal text-gray-300 text-xs">Wrong answers</span>
              </th>
              <th className="px-3 py-4 text-center font-semibold w-28">
                Timing Issues<br /><span className="font-normal text-gray-300 text-xs">Rushed/missed</span>
              </th>
              <th className="px-3 py-4 text-center font-semibold w-28">
                Guess Count<br /><span className="font-normal text-gray-300 text-xs">Not confident</span>
              </th>
              <th className="px-3 py-4 text-center font-semibold w-32">
                Careless Mistakes<br /><span className="font-normal text-gray-300 text-xs">Knew but wrong</span>
              </th>
              <th className="px-3 py-4 text-center font-semibold w-24">
                Total Errors<br /><span className="font-normal text-gray-300 text-xs">Auto-sum</span>
              </th>
              <th className="px-3 py-4 text-center font-semibold w-32">Trend</th>
            </tr>
          </thead>
          <tbody>
            {computed.map((row, idx) => {
              const trend = getTrend(row.total, computed[idx - 1]?.total, idx === 0)
              const isEven = idx % 2 === 0
              
              return (
                <tr key={idx} className={`border-b transition-colors hover:bg-blue-50 ${isEven ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-3 py-4 text-center text-gray-500 font-medium">{row.day}</td>
                  <td className="px-3 py-4 text-center text-gray-700 font-medium">{row.date}</td>
                  <td className="px-3 py-4 text-left font-semibold text-gray-800">{row.testTitle}</td>
                  <td className="px-3 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${
                      row.subject === 'Math' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {row.subject}
                    </span>
                  </td>

                  {/* Raw Misses */}
                  <td className="px-3 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`text-base font-bold ${row.rawMisses > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {row.rawMisses}
                      </span>
                    </div>
                  </td>

                  {/* Timing Issues */}
                  <td className="px-3 py-4 text-center">
                    <span className={`text-base font-bold ${row.timingIssues > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                      {row.timingIssues}
                    </span>
                  </td>

                  {/* Guess Count */}
                  <td className="px-3 py-4 text-center">
                    <span className={`text-base font-bold ${row.guessCount > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                      {row.guessCount}
                    </span>
                  </td>

                  {/* Careless Mistakes */}
                  <td className="px-3 py-4 text-center">
                    <span className={`text-base font-bold ${row.carelessMistakes > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                      {row.carelessMistakes}
                    </span>
                  </td>

                  {/* Total Errors */}
                  <td className="px-3 py-4 text-center">
                    <span className={`font-black text-lg ${row.total === 0 ? 'text-gray-400' : row.total <= 3 ? 'text-green-600' : row.total <= 7 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {row.total}
                    </span>
                  </td>

                  {/* Trend */}
                  <td className={`px-3 py-4 text-center font-bold text-sm ${trend.color}`}>
                    {trend.icon}
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-gray-400 italic">
                  No completed Admin test sessions found yet. Data will appear here automatically once you finish an assigned test.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap gap-6 text-xs text-gray-500 bg-white p-4 rounded-lg border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-600"></div>
          <span><span className="font-bold">Improved</span> — errors decreased</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span><span className="font-bold">Worse</span> — errors increased</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-500"></div>
          <span><span className="font-bold">Same</span> — no change</span>
        </div>
        <span className="ml-auto text-gray-400 italic font-medium">Note: Data is automatically synchronized from your test analysis and performance.</span>
      </div>
    </div>
  )
}
