'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  FiBookOpen, FiPlus, FiTrash2, FiStar, FiCheckCircle,
  FiAlertTriangle, FiSave, FiLayers, FiTrendingUp, FiCircle
} from 'react-icons/fi'

const EMPTY_ROW = {
  day: '', date: '', mathFormula: '', grammarRule: '',
  trapToAvoid: '', mastery: 0, reviewNotes: ''
}

function Cell({ children, className = '' }) {
  return <td className={`px-4 py-2 text-sm align-top ${className}`}>{children}</td>
}

function EditableCell({ value, onChange, placeholder = '', className = '' }) {
  return (
    <Cell className={className}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-w-[80px] rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-slate-700 placeholder:text-slate-300 transition-colors hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
    </Cell>
  )
}

function MasteryCell({ value, onChange }) {
  return (
    <Cell className="text-center">
      <div className="flex justify-center gap-1">
        {[1, 2, 3].map(n => (
          <button
            key={n}
            onClick={() => onChange(value === n ? 0 : n)}
            aria-label={`Set mastery to ${n}`}
            className="leading-none transition-transform hover:scale-110"
          >
            <FiStar
              className={`h-5 w-5 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-amber-300'}`}
            />
          </button>
        ))}
      </div>
    </Cell>
  )
}

const STAT_CARDS = [
  { key: 'total', label: 'Total Rules', icon: FiLayers, chip: 'bg-indigo-500' },
  { key: 'mastered', label: 'Mastered', icon: FiCheckCircle, chip: 'bg-emerald-500' },
  { key: 'learning', label: 'Still Learning', icon: FiTrendingUp, chip: 'bg-amber-500' },
  { key: 'notRated', label: 'Not Rated', icon: FiCircle, chip: 'bg-slate-400' },
]

export default function FormulaSheetPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [error, setError] = useState('')

  const token = () => typeof window !== 'undefined' ? localStorage.getItem('token') : ''

  const loadRows = useCallback(() => {
    setLoading(true)
    setError('')
    fetch('/api/formula-sheet', { headers: { Authorization: `Bearer ${token()}` } })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load formula sheet')
        return res.json()
      })
      .then(data => setRows(data.rows || []))
      .catch(err => {
        console.error('Error loading formula sheet:', err)
        setError("Couldn't load your formula sheet.")
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const saveRow = useCallback(async (row) => {
    setSaving(true)
    setSaveFailed(false)
    try {
      const res = await fetch('/api/formula-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(row)
      })
      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      return data.row
    } catch (err) {
      console.error('Error saving formula row:', err)
      setSaving(false)
      setSaveFailed(true)
      setTimeout(() => setSaveFailed(false), 3000)
      return null
    }
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 lg:p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiBookOpen className="h-5 w-5" />
            </span>
            My Formula &amp; Grammar Rule Sheet
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Every math formula, grammar rule, and trap you learn goes here. Review this tab for 5 minutes before every practice session.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
            <span className="flex items-center gap-2 text-sm font-medium">
              <FiAlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error} Please try again.
            </span>
            <button
              onClick={loadRows}
              className="flex-shrink-0 rounded-lg bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {STAT_CARDS.map(({ key, label, icon: Icon, chip }) => (
            <div key={key} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-white ${chip}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-extrabold text-slate-900">{stats[key]}</p>
                <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Actions bar */}
        <div className="mb-4 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium">
            {saving ? (
              <span className="flex items-center gap-1.5 text-slate-500"><FiSave className="h-3.5 w-3.5" /> Saving...</span>
            ) : saveFailed ? (
              <span className="flex items-center gap-1.5 text-rose-600"><FiAlertTriangle className="h-3.5 w-3.5" /> Save failed</span>
            ) : saved ? (
              <span className="flex items-center gap-1.5 text-emerald-600"><FiCheckCircle className="h-3.5 w-3.5" /> Saved</span>
            ) : (
              <span className="text-transparent">·</span>
            )}
          </span>
          <button
            onClick={addRow}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            <FiPlus className="h-4 w-4" /> Add Row
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="w-12 px-4 py-3.5 text-center">Day</th>
                <th className="w-28 px-4 py-3.5 text-left">Date</th>
                <th className="min-w-[160px] px-4 py-3.5 text-left">Math Formula / Concept</th>
                <th className="min-w-[160px] px-4 py-3.5 text-left">Grammar Rule</th>
                <th className="min-w-[140px] px-4 py-3.5 text-left">Trap to Avoid</th>
                <th className="w-28 px-4 py-3.5 text-center">Mastery</th>
                <th className="min-w-[160px] px-4 py-3.5 text-left">Review Notes</th>
                <th className="w-12 px-4 py-3.5 text-center" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                        <FiBookOpen className="h-6 w-6" />
                      </span>
                      <p className="text-sm font-semibold text-slate-700">No entries yet</p>
                      <p className="text-xs text-slate-500">
                        Click <strong className="text-indigo-600">+ Add Row</strong> to start building your sheet.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {rows.map((row, idx) => (
                <tr key={row._id || idx} className="transition-colors hover:bg-indigo-50/40">
                  <EditableCell value={row.day} onChange={v => update(idx, 'day', v)} placeholder="1" className="text-center font-semibold text-slate-500" />
                  <EditableCell value={row.date} onChange={v => update(idx, 'date', v)} placeholder="DD Mon YYYY" className="text-slate-600" />
                  <EditableCell value={row.mathFormula} onChange={v => update(idx, 'mathFormula', v)} placeholder="e.g. slope = (y2-y1)/(x2-x1)" />
                  <EditableCell value={row.grammarRule} onChange={v => update(idx, 'grammarRule', v)} placeholder="e.g. subject-verb agreement" />
                  <EditableCell value={row.trapToAvoid} onChange={v => update(idx, 'trapToAvoid', v)} placeholder="e.g. don't confuse their/there" />
                  <MasteryCell value={row.mastery} onChange={v => update(idx, 'mastery', v)} />
                  <EditableCell value={row.reviewNotes} onChange={v => update(idx, 'reviewNotes', v)} placeholder="Extra notes..." />
                  <Cell className="text-center">
                    <button
                      onClick={() => deleteRow(idx)}
                      aria-label="Delete row"
                      className="rounded-md p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </Cell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
          <FiStar className="h-3.5 w-3.5" />
          Tip: Repetition is what locks rules into long-term memory. Review this sheet for 5 minutes before every practice session.
        </p>
      </div>
    </div>
  )
}
