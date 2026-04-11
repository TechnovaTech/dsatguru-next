'use client'
import { useState, useEffect, useCallback } from 'react'

const EMPTY_ROW = {
  day: '', date: '', mathFormula: '', grammarRule: '',
  trapToAvoid: '', mastery: 0, reviewNotes: ''
}

function Cell({ children, className = '' }) {
  return <td className={`border border-gray-200 px-2 py-1 text-sm ${className}`}>{children}</td>
}

function EditableCell({ value, onChange, placeholder = '', className = '' }) {
  return (
    <Cell className={className}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent focus:outline-none text-sm min-w-[80px]"
      />
    </Cell>
  )
}

function MasteryCell({ value, onChange }) {
  return (
    <Cell className="text-center">
      <div className="flex justify-center gap-0.5">
        {[1, 2, 3].map(n => (
          <button
            key={n}
            onClick={() => onChange(value === n ? 0 : n)}
            className={`text-lg leading-none transition-colors ${n <= value ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}
          >
            ★
          </button>
        ))}
      </div>
    </Cell>
  )
}

export default function FormulaSheetPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const token = () => typeof window !== 'undefined' ? localStorage.getItem('token') : ''

  useEffect(() => {
    fetch('/api/formula-sheet', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(data => setRows(data.rows || []))
      .finally(() => setLoading(false))
  }, [])

  const saveRow = useCallback(async (row) => {
    setSaving(true)
    const res = await fetch('/api/formula-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(row)
    })
    const data = await res.json()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    return data.row
  }, [])

  const update = useCallback((idx, field, value) => {
    setRows(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      clearTimeout(next[idx]._timer)
      next[idx]._timer = setTimeout(async () => {
        const savedRow = await saveRow(next[idx])
        if (savedRow && !next[idx]._id) {
          setRows(r => {
            const updated = [...r]
            updated[idx] = { ...updated[idx], _id: savedRow._id }
            return updated
          })
        }
      }, 800)
      return next
    })
  }, [saveRow])

  const addRow = () => {
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    setRows(prev => [...prev, { ...EMPTY_ROW, day: prev.length + 1, date: today }])
  }

  const deleteRow = async (idx) => {
    const row = rows[idx]
    if (row._id) {
      await fetch('/api/formula-sheet', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ id: row._id })
      })
    }
    setRows(prev => prev.filter((_, i) => i !== idx))
  }

  const stats = {
    total: rows.length,
    mastered: rows.filter(r => r.mastery === 3).length,
    learning: rows.filter(r => r.mastery === 1 || r.mastery === 2).length,
    notRated: rows.filter(r => !r.mastery).length,
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading formula sheet...</div>

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📐 My Formula &amp; Grammar Rule Sheet</h1>
        <p className="text-gray-500 text-sm mt-1">
          Every math formula, grammar rule, and trap you learn goes here. Review this tab for 5 minutes before every practice session.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Rules</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Mastered ★★★</p>
          <p className="text-2xl font-bold text-yellow-500 mt-1">{stats.mastered}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Still Learning</p>
          <p className="text-2xl font-bold text-orange-500 mt-1">{stats.learning}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Not Rated</p>
          <p className="text-2xl font-bold text-gray-400 mt-1">{stats.notRated}</p>
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-400">
          {saving ? '💾 Saving...' : saved ? '✅ Saved' : ''}
        </span>
        <button
          onClick={addRow}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
        >
          + Add Row
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-800 text-white text-xs">
              <th className="border border-gray-600 px-2 py-3 text-center w-10">Day</th>
              <th className="border border-gray-600 px-2 py-3 text-center w-24">Date</th>
              <th className="border border-gray-600 px-2 py-3 text-center min-w-[160px]">Math Formula / Concept</th>
              <th className="border border-gray-600 px-2 py-3 text-center min-w-[160px]">Grammar Rule</th>
              <th className="border border-gray-600 px-2 py-3 text-center min-w-[140px]">Trap to Avoid</th>
              <th className="border border-gray-600 px-2 py-3 text-center w-28">Mastery ⭐⭐⭐</th>
              <th className="border border-gray-600 px-2 py-3 text-center min-w-[160px]">Review Notes</th>
              <th className="border border-gray-600 px-2 py-3 text-center w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-gray-400">
                  No entries yet. Click <strong>+ Add Row</strong> to start building your sheet.
                </td>
              </tr>
            )}
            {rows.map((row, idx) => (
              <tr key={row._id || idx} className={`border-b hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <EditableCell value={row.day} onChange={v => update(idx, 'day', v)} placeholder="1" className="text-center text-gray-500 font-medium" />
                <EditableCell value={row.date} onChange={v => update(idx, 'date', v)} placeholder="DD Mon YYYY" className="text-center" />
                <EditableCell value={row.mathFormula} onChange={v => update(idx, 'mathFormula', v)} placeholder="e.g. slope = (y2-y1)/(x2-x1)" />
                <EditableCell value={row.grammarRule} onChange={v => update(idx, 'grammarRule', v)} placeholder="e.g. subject-verb agreement" />
                <EditableCell value={row.trapToAvoid} onChange={v => update(idx, 'trapToAvoid', v)} placeholder="e.g. don't confuse their/there" />
                <MasteryCell value={row.mastery} onChange={v => update(idx, 'mastery', v)} />
                <EditableCell value={row.reviewNotes} onChange={v => update(idx, 'reviewNotes', v)} placeholder="Extra notes..." />
                <Cell className="text-center">
                  <button onClick={() => deleteRow(idx)} className="text-gray-300 hover:text-red-500 transition-colors text-base leading-none">✕</button>
                </Cell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        💡 Tip: Repetition is what locks rules into long-term memory. Review this sheet for 5 minutes before every practice session.
      </p>
    </div>
  )
}
