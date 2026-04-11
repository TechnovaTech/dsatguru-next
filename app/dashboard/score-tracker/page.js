'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

function getTrend(current, previous, isFirst) {
  if (isFirst) return { label: '—', color: 'text-gray-400', icon: '—' }
  if (current < previous) return { label: 'Improved', color: 'text-green-600', icon: '↓ Improved' }
  if (current > previous) return { label: 'Worse', color: 'text-red-500', icon: '↑ Worse' }
  return { label: 'Same', color: 'text-gray-500', icon: '→ Same' }
}

export default function ScoreTrackerPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newRow, setNewRow] = useState({ date: '', rawMisses: '', timingIssues: '', guessCount: '', carelessMistakes: '' })
  const [formSaving, setFormSaving] = useState(false)
  const saveTimer = useRef(null)

  const fetchRows = useCallback(async () => {
    const token = localStorage.getItem('token')
    const data = await fetch('/api/score-tracker', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    if (data.rows) setRows(data.rows)
  }, [])

  useEffect(() => {
    fetchRows().finally(() => setLoading(false))
  }, [fetchRows])

  const saveRow = useCallback(async (row) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      const token = localStorage.getItem('token')
      await fetch('/api/score-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(row)
      })
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 800)
  }, [])

  const update = useCallback((idx, field, value) => {
    setRows(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value === '' ? '' : Number(value) }
      saveRow(next[idx])
      return next
    })
  }, [saveRow])

  const computed = rows.reduce((acc, r) => {
    const rawMisses = r.rawMisses !== null && r.rawMisses !== '' ? Number(r.rawMisses) : r.autoRawMisses
    const timingIssues = r.timingIssues !== null && r.timingIssues !== '' ? Number(r.timingIssues) : r.autoTimingIssues
    const guessCount = Number(r.guessCount) || 0
    const carelessMistakes = Number(r.carelessMistakes) || 0
    const total = rawMisses + timingIssues + guessCount + carelessMistakes
    const prev = acc[acc.length - 1]
    const prevTotal = prev ? prev.total : null
    acc.push({ ...r, rawMisses, timingIssues, guessCount, carelessMistakes, total, prevTotal })
    return acc
  }, [])

  const submitManual = async (e) => {
    e.preventDefault()
    setFormSaving(true)
    const token = localStorage.getItem('token')
    await fetch('/api/score-tracker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        date: newRow.date,
        day: rows.length + 1,
        rawMisses: newRow.rawMisses !== '' ? Number(newRow.rawMisses) : null,
        timingIssues: newRow.timingIssues !== '' ? Number(newRow.timingIssues) : null,
        guessCount: Number(newRow.guessCount) || 0,
        carelessMistakes: Number(newRow.carelessMistakes) || 0,
      })
    })
    setFormSaving(false)
    setShowForm(false)
    setNewRow({ date: '', rawMisses: '', timingIssues: '', guessCount: '', carelessMistakes: '' })
    await fetchRows()
  }

  const totalErrors = computed.reduce((s, r) => s + r.total, 0)
  const improvedDays = computed.filter((r, i) => i > 0 && r.total < (computed[i - 1]?.total ?? r.total)).length
  const bestDay = computed.reduce((best, r) => (!best || r.total < best.total) ? r : best, null)

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Score Tracker...</div>

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📈 Daily Score Tracker</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Log your daily errors and track trends. Lower misses = higher score. Aim to reduce errors week over week!
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{saving ? '💾 Saving...' : saved ? '✅ Saved' : ''}</span>
          <button
            onClick={() => setShowForm(v => !v)}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            {showForm ? 'Cancel' : '+ Add Manual Entry'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Errors (All Days)</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{totalErrors}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Days Improved</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{improvedDays}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Days Logged</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{computed.filter(r => r.total > 0).length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Best Day (Lowest Errors)</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {bestDay && bestDay.total > 0 ? `Day ${bestDay.day} (${bestDay.total})` : '—'}
          </p>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submitManual} className="bg-white rounded-xl shadow-sm border p-5 mb-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="col-span-2 md:col-span-3">
            <h2 className="font-semibold text-gray-700">Manual Entry</h2>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Date</label>
            <input type="date" required value={newRow.date} onChange={e => setNewRow(p => ({ ...p, date: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          {[['rawMisses','Raw Misses'],['timingIssues','Timing Issues'],['guessCount','Guess Count'],['carelessMistakes','Careless Mistakes']].map(([field, label]) => (
            <div key={field} className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">{label}</label>
              <input type="number" min={0} placeholder="0" value={newRow[field]}
                onChange={e => setNewRow(p => ({ ...p, [field]: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          ))}
          <div className="col-span-2 md:col-span-3 flex justify-end">
            <button type="submit" disabled={formSaving}
              className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition">
              {formSaving ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="px-3 py-3 text-center font-semibold w-12">Day</th>
              <th className="px-3 py-3 text-center font-semibold w-24">Date</th>
              <th className="px-3 py-3 text-center font-semibold w-28">
                Raw Misses<br /><span className="font-normal text-gray-300 text-xs">Wrong answers</span>
              </th>
              <th className="px-3 py-3 text-center font-semibold w-28">
                Timing Issues<br /><span className="font-normal text-gray-300 text-xs">Rushed/missed</span>
              </th>
              <th className="px-3 py-3 text-center font-semibold w-28">
                Guess Count<br /><span className="font-normal text-gray-300 text-xs">Not confident</span>
              </th>
              <th className="px-3 py-3 text-center font-semibold w-32">
                Careless Mistakes<br /><span className="font-normal text-gray-300 text-xs">Knew but wrong</span>
              </th>
              <th className="px-3 py-3 text-center font-semibold w-24">
                Total Errors<br /><span className="font-normal text-gray-300 text-xs">Auto-sum</span>
              </th>
              <th className="px-3 py-3 text-center font-semibold w-32">Trend</th>
            </tr>
          </thead>
          <tbody>
            {computed.map((row, idx) => {
              const trend = getTrend(row.total, computed[idx - 1]?.total, idx === 0)
              const isEven = idx % 2 === 0
              const isAutoRaw = rows[idx].rawMisses === null || rows[idx].rawMisses === ''
              const isAutoTiming = rows[idx].timingIssues === null || rows[idx].timingIssues === ''
              return (
                <tr key={idx} className={`border-b transition-colors hover:bg-blue-50 ${isEven ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-3 py-2 text-center text-gray-500 font-medium">{row.day}</td>
                  <td className="px-3 py-2 text-center text-gray-700 font-medium">{row.date}</td>

                  {/* Raw Misses — auto-pulled, overridable */}
                  <td className="px-2 py-1 text-center">
                    <input
                      type="number" min={0}
                      value={rows[idx].rawMisses !== null && rows[idx].rawMisses !== '' ? rows[idx].rawMisses : ''}
                      placeholder={String(row.autoRawMisses)}
                      onChange={e => update(idx, 'rawMisses', e.target.value)}
                      className={`w-16 text-center border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-red-300 font-semibold ${isAutoRaw ? 'bg-red-50 text-red-400 border-red-100' : 'bg-red-100 text-red-700 border-red-300'}`}
                    />
                    {isAutoRaw && row.autoRawMisses > 0 && (
                      <span className="block text-xs text-gray-400 mt-0.5">auto</span>
                    )}
                  </td>

                  {/* Timing Issues — auto-pulled, overridable */}
                  <td className="px-2 py-1 text-center">
                    <input
                      type="number" min={0}
                      value={rows[idx].timingIssues !== null && rows[idx].timingIssues !== '' ? rows[idx].timingIssues : ''}
                      placeholder={String(row.autoTimingIssues)}
                      onChange={e => update(idx, 'timingIssues', e.target.value)}
                      className={`w-16 text-center border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-300 font-semibold ${isAutoTiming ? 'bg-orange-50 text-orange-400 border-orange-100' : 'bg-orange-100 text-orange-700 border-orange-300'}`}
                    />
                    {isAutoTiming && row.autoTimingIssues > 0 && (
                      <span className="block text-xs text-gray-400 mt-0.5">auto</span>
                    )}
                  </td>

                  {/* Guess Count — manual only */}
                  <td className="px-2 py-1 text-center">
                    <input
                      type="number" min={0}
                      value={rows[idx].guessCount || ''}
                      placeholder="0"
                      onChange={e => update(idx, 'guessCount', e.target.value)}
                      className="w-16 text-center border border-yellow-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-yellow-300 bg-yellow-50 text-yellow-700 font-semibold"
                    />
                  </td>

                  {/* Careless Mistakes — manual only */}
                  <td className="px-2 py-1 text-center">
                    <input
                      type="number" min={0}
                      value={rows[idx].carelessMistakes || ''}
                      placeholder="0"
                      onChange={e => update(idx, 'carelessMistakes', e.target.value)}
                      className="w-16 text-center border border-purple-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-purple-50 text-purple-700 font-semibold"
                    />
                  </td>

                  {/* Total Errors — auto-calculated */}
                  <td className="px-3 py-2 text-center">
                    <span className={`font-bold text-base ${row.total === 0 ? 'text-gray-400' : row.total <= 3 ? 'text-green-600' : row.total <= 7 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {row.total}
                    </span>
                  </td>

                  {/* Trend */}
                  <td className={`px-3 py-2 text-center font-semibold text-sm ${trend.color}`}>
                    {trend.icon}
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                  No test sessions found yet. Complete a practice test to see your data here, or entries will appear as you log them.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
        <span>↓ <span className="text-green-600 font-semibold">Improved</span> — errors decreased</span>
        <span>↑ <span className="text-red-500 font-semibold">Worse</span> — errors increased</span>
        <span>→ <span className="text-gray-500 font-semibold">Same</span> — no change</span>
        <span className="ml-auto text-gray-400 italic">Raw Misses &amp; Timing Issues are auto-pulled from your tests. You can override them manually.</span>
      </div>
    </div>
  )
}
