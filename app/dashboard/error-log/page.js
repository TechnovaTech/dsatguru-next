'use client'
import { useState, useEffect, useCallback } from 'react'

const SECTIONS = ['Math', 'Reading & Writing']
const DIFFICULTIES = ['E', 'M', 'H']
const REDO_RESULTS = ['', '✓', '✗']

const EMPTY_ROW = {
  day: '', date: '', section: 'Math', topic: '', questionDesc: '',
  whyWrong: '', correctRule: '', difficulty: 'M',
  redoDueDate: '', redoAnswer: '', redoResult: ''
}

function Cell({ children, className = '' }) {
  return <td className={`border border-gray-200 px-2 py-1 text-sm ${className}`}>{children}</td>
}

function EditableCell({ value, onChange, type = 'text', options, placeholder = '', className = '' }) {
  if (options) {
    return (
      <Cell className={className}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-transparent focus:outline-none text-sm"
        >
          {options.map(o => <option key={o} value={o}>{o || '—'}</option>)}
        </select>
      </Cell>
    )
  }
  return (
    <Cell className={className}>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent focus:outline-none text-sm min-w-[60px]"
      />
    </Cell>
  )
}

export default function ErrorLogPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [filter, setFilter] = useState({ section: '', difficulty: '' })
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  const token = () => typeof window !== 'undefined' ? localStorage.getItem('token') : ''

  useEffect(() => {
    fetch('/api/error-log', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(data => setRows(data.logs || []))
      .finally(() => setLoading(false))
  }, [])

  const saveRow = useCallback(async (row) => {
    setSaving(true)
    const res = await fetch('/api/error-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(row)
    })
    const data = await res.json()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    return data.log
  }, [])

  const update = useCallback((idx, field, value) => {
    setRows(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      // debounce save
      clearTimeout(next[idx]._timer)
      next[idx]._timer = setTimeout(async () => {
        const saved = await saveRow(next[idx])
        if (saved && !next[idx]._id) {
          setRows(r => {
            const updated = [...r]
            updated[idx] = { ...updated[idx], _id: saved._id }
            return updated
          })
        }
      }, 800)
      return next
    })
  }, [saveRow])

  const importFromLastTest = async () => {
    setImporting(true)
    setImportMsg('')
    try {
      const res = await fetch('/api/error-log/import-from-test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` }
      })
      const data = await res.json()
      if (!res.ok) {
        setImportMsg(data.error || 'Import failed')
      } else if (data.imported === 0) {
        setImportMsg(data.message || 'Nothing new to import')
      } else {
        setImportMsg(`✅ Imported ${data.imported} wrong answer${data.imported > 1 ? 's' : ''}`)
        // Refresh logs
        const r = await fetch('/api/error-log', { headers: { Authorization: `Bearer ${token()}` } })
        const d = await r.json()
        setRows(d.logs || [])
      }
    } catch {
      setImportMsg('Import failed')
    } finally {
      setImporting(false)
      setTimeout(() => setImportMsg(''), 4000)
    }
  }

  const addRow = () => {
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const dayNum = rows.length + 1
    setRows(prev => [...prev, { ...EMPTY_ROW, day: dayNum, date: today }])
  }

  const deleteRow = async (idx) => {
    const row = rows[idx]
    if (row._id) {
      await fetch('/api/error-log', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ id: row._id })
      })
    }
    setRows(prev => prev.filter((_, i) => i !== idx))
  }

  const filtered = rows.filter(r => {
    if (filter.section && r.section !== filter.section) return false
    if (filter.difficulty && r.difficulty !== filter.difficulty) return false
    return true
  })

  const stats = {
    total: rows.length,
    redone: rows.filter(r => r.redoResult === '✓').length,
    stillWrong: rows.filter(r => r.redoResult === '✗').length,
    pending: rows.filter(r => !r.redoResult).length,
  }

  const topicCounts = rows.reduce((acc, r) => {
    const t = r.topic || 'Unknown'
    acc[t] = (acc[t] || 0) + 1
    return acc
  }, {})

  if (loading) return <div className="p-8 text-center text-gray-500">Loading error log...</div>

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">❌ Error Log &amp; Redo Tracker</h1>
        <p className="text-gray-500 text-sm mt-1">Log EVERY wrong answer. Complete the Redo column when you retry it!</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Errors</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Redone ✓</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.redone}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Still Wrong ✗</p>
          <p className="text-2xl font-bold text-orange-500 mt-1">{stats.stillWrong}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pending Redo</p>
          <p className="text-2xl font-bold text-blue-500 mt-1">{stats.pending}</p>
        </div>
      </div>

      {/* Topic Breakdown */}
      {Object.keys(topicCounts).length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">Errors by Topic</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).map(([topic, count]) => (
              <span key={topic} className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1 text-xs font-medium">
                {topic} <span className="bg-red-200 text-red-800 rounded-full px-1.5 py-0.5 text-xs font-bold">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters + actions */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={filter.section}
          onChange={e => setFilter(f => ({ ...f, section: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">All Sections</option>
          {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filter.difficulty}
          onChange={e => setFilter(f => ({ ...f, difficulty: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">All Difficulties</option>
          <option value="E">Easy</option>
          <option value="M">Medium</option>
          <option value="H">Hard</option>
        </select>
        <span className="ml-auto text-xs text-gray-400">
          {importMsg || (saving ? '💾 Saving...' : saved ? '✅ Saved' : '')}
        </span>
        <button
          onClick={importFromLastTest}
          disabled={importing}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
        >
          {importing ? 'Importing...' : '⬇ Import from Last Test'}
        </button>
        <button
          onClick={addRow}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
        >
          + Add Error
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-800 text-white text-xs">
              <th className="border border-gray-600 px-2 py-3 text-center w-10">Day</th>
              <th className="border border-gray-600 px-2 py-3 text-center w-24">Date</th>
              <th className="border border-gray-600 px-2 py-3 text-center w-28">Section</th>
              <th className="border border-gray-600 px-2 py-3 text-center w-28">Topic</th>
              <th className="border border-gray-600 px-2 py-3 text-center min-w-[140px]">Question ID / Description</th>
              <th className="border border-gray-600 px-2 py-3 text-center min-w-[140px]">Why I Got It Wrong</th>
              <th className="border border-gray-600 px-2 py-3 text-center min-w-[140px]">Correct Rule or Concept</th>
              <th className="border border-gray-600 px-2 py-3 text-center w-20">Difficulty</th>
              <th className="border border-gray-600 px-2 py-3 text-center w-24">Redo Due Date</th>
              <th className="border border-gray-600 px-2 py-3 text-center w-24">Redo Answer</th>
              <th className="border border-gray-600 px-2 py-3 text-center w-20">Redo Result ✓/✗</th>
              <th className="border border-gray-600 px-2 py-3 text-center w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="text-center py-10 text-gray-400">
                  No errors logged yet. Click <strong>+ Add Error</strong> to start tracking.
                </td>
              </tr>
            )}
            {filtered.map((row, idx) => {
              const realIdx = rows.indexOf(row)
              const isEven = idx % 2 === 0
              const redoBg = row.redoResult === '✓' ? 'bg-green-50' : row.redoResult === '✗' ? 'bg-red-50' : ''
              return (
                <tr key={row._id || idx} className={`border-b hover:bg-blue-50 transition-colors ${isEven ? 'bg-white' : 'bg-gray-50'} ${redoBg}`}>
                  <EditableCell value={row.day} onChange={v => update(realIdx, 'day', v)} placeholder="1" className="text-center text-gray-500 font-medium" />
                  <EditableCell value={row.date} onChange={v => update(realIdx, 'date', v)} placeholder="DD Mon YYYY" className="text-center" />
                  <EditableCell value={row.section} onChange={v => update(realIdx, 'section', v)} options={SECTIONS} />
                  <EditableCell value={row.topic} onChange={v => update(realIdx, 'topic', v)} placeholder="e.g. Algebra" />
                  <EditableCell value={row.questionDesc} onChange={v => update(realIdx, 'questionDesc', v)} placeholder="Q ID or short description" />
                  <EditableCell value={row.whyWrong} onChange={v => update(realIdx, 'whyWrong', v)} placeholder="e.g. misread the question" />
                  <EditableCell value={row.correctRule} onChange={v => update(realIdx, 'correctRule', v)} placeholder="e.g. subject-verb agreement" />
                  <EditableCell value={row.difficulty} onChange={v => update(realIdx, 'difficulty', v)} options={DIFFICULTIES} className="text-center" />
                  <EditableCell value={row.redoDueDate} onChange={v => update(realIdx, 'redoDueDate', v)} placeholder="DD Mon YYYY" className="text-center" />
                  <EditableCell value={row.redoAnswer} onChange={v => update(realIdx, 'redoAnswer', v)} placeholder="Your answer" className="text-center" />
                  <EditableCell value={row.redoResult} onChange={v => update(realIdx, 'redoResult', v)} options={REDO_RESULTS} className="text-center font-bold" />
                  <Cell className="text-center">
                    <button onClick={() => deleteRow(realIdx)} className="text-gray-300 hover:text-red-500 transition-colors text-base leading-none">✕</button>
                  </Cell>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        💡 Tip: Don&apos;t just mark it wrong and move on — write <em>why</em> you got it wrong and schedule a redo. That&apos;s what makes it stick.
      </p>
    </div>
  )
}
