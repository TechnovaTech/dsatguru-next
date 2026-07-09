'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { renderContent } from '../../components/admin/LatexRenderer'
import { resolveAnswerLetter } from '../../../lib/scoring/satScale'
import {
  FiX, FiHelpCircle, FiAlertCircle, FiCheckCircle, FiXCircle, FiClock,
  FiPlus, FiDownloadCloud, FiTrash2, FiSave, FiTag, FiRefreshCw, FiTarget, FiArrowRight
} from 'react-icons/fi'

const SECTIONS = ['Math', 'Reading & Writing']
const DIFFICULTIES = ['E', 'M', 'H']
const REDO_RESULTS = ['', '✓', '✗']

const EMPTY_ROW = {
  day: '', date: '', section: 'Math', topic: '', questionDesc: '',
  whyWrong: '', correctRule: '', difficulty: 'M',
  redoDueDate: '', redoAnswer: '', redoResult: ''
}

function Cell({ children, className = '' }) {
  return <td className={`px-3 py-2 text-sm align-top ${className}`}>{children}</td>
}

function EditableCell({ value, onChange, type = 'text', options, placeholder = '', className = '', onClick, onKeyDown }) {
  if (options) {
    return (
      <Cell className={className}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          {options.map(o => <option key={o} value={o}>{o || '—'}</option>)}
        </select>
      </Cell>
    )
  }
  if (onClick) {
    return (
      <Cell className={className}>
        <button
          type="button"
          onClick={onClick}
          className="w-full max-w-[220px] cursor-pointer truncate text-left text-sm font-medium text-indigo-600 underline decoration-dotted underline-offset-2 hover:text-indigo-800"
          title="Click to preview question"
        >
          {value || placeholder}
        </button>
      </Cell>
    )
  }
  return (
    <Cell className={className}>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full min-w-[60px] rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-slate-700 placeholder:text-slate-300 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
    </Cell>
  )
}

function StatCard({ icon, value, label, chipClass }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg text-white ${chipClass}`}>
          {icon}
        </span>
        <div>
          <p className="text-2xl font-extrabold text-slate-900">{value}</p>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  )
}

export default function ErrorLogPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState({ section: '', difficulty: '' })
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  // Modal State
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loadingQuestion, setLoadingQuestion] = useState(false)
  const [currentUserAnswer, setCurrentUserAnswer] = useState('')

  const token = () => typeof window !== 'undefined' ? localStorage.getItem('token') : ''

  const closeModal = useCallback(() => { setIsModalOpen(false); setSelectedQuestion(null) }, [])

  const fetchQuestion = async (questionId, userAnswer) => {
    if (!questionId) return
    setCurrentUserAnswer(userAnswer || '')
    setLoadingQuestion(true)
    setIsModalOpen(true)
    try {
      const res = await fetch(`/api/questions/${questionId}`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSelectedQuestion(data.data)
      } else {
        setSelectedQuestion({ error: 'Question not found' })
      }
    } catch (err) {
      setSelectedQuestion({ error: 'Failed to load question' })
    } finally {
      setLoadingQuestion(false)
    }
  }

  const loadLogs = useCallback(() => {
    setLoading(true)
    setError('')
    fetch('/api/error-log', { headers: { Authorization: `Bearer ${token()}` } })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load error log')
        return res.json()
      })
      .then(data => setRows(data.logs || []))
      .catch(err => {
        console.error('Error loading error log:', err)
        setError("Couldn't load your error log.")
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  // Close modal on Escape
  useEffect(() => {
    if (!isModalOpen) return
    const onKey = (e) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isModalOpen, closeModal])

  const saveRow = useCallback(async (row) => {
    setSaving(true)
    setSaveFailed(false)
    try {
      const res = await fetch('/api/error-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(row)
      })
      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      return data.log
    } catch (err) {
      console.error('Error saving error-log row:', err)
      setSaving(false)
      setSaveFailed(true)
      setTimeout(() => setSaveFailed(false), 3000)
      return null
    }
  }, [])

  const update = useCallback((idx, field, value, immediate = false) => {
    setRows(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }

      const performSave = async () => {
        const saved = await saveRow(next[idx])
        if (saved && !next[idx]._id) {
          setRows(r => {
            const updated = [...r]
            updated[idx] = { ...updated[idx], _id: saved._id }
            return updated
          })
        }
      }

      // debounce save
      clearTimeout(next[idx]._timer)
      if (immediate) {
        performSave()
      } else {
        next[idx]._timer = setTimeout(performSave, 800)
      }
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

  // Weakest areas: rank what the student misses most so we can point them
  // straight at practice. Prefer named topics; if none are filled in, fall
  // back to the broad section (Math / Reading & Writing). Never fabricate —
  // if there's nothing to rank, the block simply doesn't render.
  const rankBy = (keyFn) => rows.reduce((acc, r) => {
    const k = (keyFn(r) || '').trim()
    if (k) acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})
  const namedTopicCounts = rankBy(r => r.topic)
  const weakestSource = Object.keys(namedTopicCounts).length > 0
    ? namedTopicCounts
    : rankBy(r => r.section)
  const weakestAreas = Object.entries(weakestSource)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <FiAlertCircle className="h-5 w-5" />
              </span>
              Error Log &amp; Redo Tracker
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Here are the questions you missed — review them and try again.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={importFromLastTest}
              disabled={importing}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importing
                ? <FiRefreshCw className="h-4 w-4 animate-spin" />
                : <FiDownloadCloud className="h-4 w-4" />}
              {importing ? 'Importing…' : 'Import from last test'}
            </button>
            <button
              onClick={addRow}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <FiPlus className="h-4 w-4" /> Add row
            </button>
          </div>
        </div>

        {importMsg && (
          <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700">
            {importMsg}
          </div>
        )}

        {error && (
          <div role="alert" className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
            <span className="text-sm font-medium">{error} Please try again.</span>
            <button
              onClick={loadLogs}
              className="flex-shrink-0 rounded-lg bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={<FiAlertCircle className="h-5 w-5" />} value={stats.total} label="Total Errors" chipClass="bg-rose-500" />
          <StatCard icon={<FiCheckCircle className="h-5 w-5" />} value={stats.redone} label="Redone ✓" chipClass="bg-emerald-500" />
          <StatCard icon={<FiXCircle className="h-5 w-5" />} value={stats.stillWrong} label="Still Wrong ✗" chipClass="bg-amber-500" />
          <StatCard icon={<FiClock className="h-5 w-5" />} value={stats.pending} label="Pending Redo" chipClass="bg-indigo-500" />
        </div>

        {/* Your weakest areas — turn the counts into a next step */}
        {weakestAreas.length > 0 && (
          <div className="mb-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm">
            <div className="mb-3 flex items-start gap-2.5">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <FiTarget className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">Your weakest areas</p>
                <p className="text-xs text-slate-500">Start here — these are the topics you miss the most.</p>
              </div>
            </div>
            <ul className="space-y-2">
              {weakestAreas.map(([area, count]) => (
                <li
                  key={area}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3"
                >
                  <span className="text-sm text-slate-600">
                    <span className="font-bold text-slate-900">{area}</span>
                    {' — you’ve missed '}
                    {count} question{count === 1 ? '' : 's'}
                  </span>
                  <Link
                    href="/dashboard/redo-queue"
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                  >
                    Practice this <FiArrowRight className="h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Topic Breakdown */}
        {Object.keys(topicCounts).length > 0 && (
          <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <FiTag className="h-3.5 w-3.5" /> Errors by Topic
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).map(([topic, count]) => (
                <span key={topic} className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                  {topic} <span className="rounded-full bg-rose-200 px-1.5 py-0.5 text-xs font-bold text-rose-800">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filters + save status */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            value={filter.section}
            onChange={e => setFilter(f => ({ ...f, section: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">All Sections</option>
            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filter.difficulty}
            onChange={e => setFilter(f => ({ ...f, difficulty: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">All Difficulties</option>
            <option value="E">Easy</option>
            <option value="M">Medium</option>
            <option value="H">Hard</option>
          </select>
          {(saving || saveFailed || saved) && (
            <span className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              saveFailed ? 'bg-rose-50 text-rose-600' : saving ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <FiSave className="h-3.5 w-3.5" />
              {saving ? 'Saving…' : saveFailed ? 'Save failed' : 'Saved'}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Day</th>
                <th className="px-3 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                <th className="px-3 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Section</th>
                <th className="px-3 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Topic</th>
                <th className="min-w-[160px] px-3 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Question ID / Description</th>
                <th className="min-w-[150px] px-3 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Why I Got It Wrong</th>
                <th className="min-w-[150px] px-3 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Correct Rule or Concept</th>
                <th className="px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Difficulty</th>
                <th className="px-3 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Redo Due Date</th>
                <th className="px-3 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Redo Answer</th>
                <th className="px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Redo ✓/✗</th>
                <th className="min-w-[120px] px-3 py-3.5 text-xs font-semibold uppercase tracking-wider text-indigo-600">Tutor Action</th>
                <th className="px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <FiAlertCircle className="h-6 w-6" />
                      </span>
                      <p className="text-sm font-semibold text-slate-700">No errors logged yet</p>
                      <p className="max-w-md text-sm text-slate-400">
                        Mistakes from your completed Mock Exams appear here automatically. You can also import from your last test or add a row manually.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map((row, idx) => {
                const realIdx = rows.indexOf(row)
                const redoBg = row.redoResult === '✓' ? 'bg-emerald-50/60' : row.redoResult === '✗' ? 'bg-rose-50/60' : ''
                return (
                  <tr key={row._id || idx} className={`transition-colors hover:bg-indigo-50/40 ${redoBg}`}>
                    <EditableCell value={row.day} onChange={v => update(realIdx, 'day', v)} onKeyDown={e => e.key === 'Enter' && update(realIdx, 'day', e.target.value, true)} placeholder="1" className="text-center font-medium text-slate-500" />
                    <EditableCell value={row.date} onChange={v => update(realIdx, 'date', v)} onKeyDown={e => e.key === 'Enter' && update(realIdx, 'date', e.target.value, true)} placeholder="DD Mon YYYY" />
                    <EditableCell value={row.section} onChange={v => update(realIdx, 'section', v)} options={SECTIONS} />
                    <EditableCell value={row.topic} onChange={v => update(realIdx, 'topic', v)} onKeyDown={e => e.key === 'Enter' && update(realIdx, 'topic', e.target.value, true)} placeholder="e.g. Algebra" />
                    <EditableCell
                      value={row.questionDesc}
                      onChange={v => update(realIdx, 'questionDesc', v)}
                      onClick={() => fetchQuestion(row.sourceQuestionId, row.selectedAnswer)}
                      placeholder="Q ID or short description"
                    />
                    <EditableCell value={row.whyWrong} onChange={v => update(realIdx, 'whyWrong', v)} onKeyDown={e => e.key === 'Enter' && update(realIdx, 'whyWrong', e.target.value, true)} placeholder="e.g. misread the question" />
                    <EditableCell value={row.correctRule} onChange={v => update(realIdx, 'correctRule', v)} onKeyDown={e => e.key === 'Enter' && update(realIdx, 'correctRule', e.target.value, true)} placeholder="e.g. subject-verb agreement" />
                    <EditableCell value={row.difficulty} onChange={v => update(realIdx, 'difficulty', v)} options={DIFFICULTIES} className="text-center" />
                    <EditableCell value={row.redoDueDate} onChange={v => update(realIdx, 'redoDueDate', v)} onKeyDown={e => e.key === 'Enter' && update(realIdx, 'redoDueDate', e.target.value, true)} placeholder="DD Mon YYYY" />
                    <EditableCell value={row.redoAnswer} onChange={v => update(realIdx, 'redoAnswer', v)} onKeyDown={e => e.key === 'Enter' && update(realIdx, 'redoAnswer', e.target.value, true)} placeholder="Your answer" className="text-center" />
                    <EditableCell value={row.redoResult} onChange={v => update(realIdx, 'redoResult', v)} options={REDO_RESULTS} className="text-center font-bold" />
                    <Cell className="font-medium text-indigo-800">{row.tutorAction || '—'}</Cell>
                    <Cell className="text-center">
                      <button
                        type="button"
                        onClick={() => deleteRow(realIdx)}
                        title="Delete row"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </Cell>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Tip: Don&apos;t just mark it wrong and move on — write <em>why</em> you got it wrong and schedule a redo. That&apos;s what makes it stick.
        </p>
      </div>

      {/* Question Preview Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={closeModal}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <FiHelpCircle className="h-4 w-4" />
                </span>
                {selectedQuestion?.questionId ? `Question ${selectedQuestion.questionId}` : 'Question Preview'}
              </h3>
              <button
                onClick={closeModal}
                className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-200"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="custom-scrollbar flex-1 overflow-y-auto p-8">
              {loadingQuestion ? (
                <div className="flex flex-col items-center justify-center gap-4 py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
                  <p className="animate-pulse text-sm text-slate-500">Loading question details…</p>
                </div>
              ) : selectedQuestion?.error ? (
                <div className="flex flex-col items-center gap-3 py-20 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-500">
                    <FiAlertCircle className="h-6 w-6" />
                  </span>
                  <p className="text-sm font-medium text-rose-600">{selectedQuestion.error}</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Title */}
                  {selectedQuestion?.title && (
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {selectedQuestion.title}
                    </p>
                  )}

                  {/* Question Content */}
                  <div className="prose prose-indigo max-w-none text-lg leading-relaxed text-slate-800">
                    {renderContent(selectedQuestion?.content)}
                  </div>

                  {/* Options */}
                  {selectedQuestion?.options && Array.isArray(selectedQuestion.options) && (() => {
                    // Resolve both the correct answer and the student's answer to option
                    // letters (A–D) so we can highlight correct=green / wrong-choice=red,
                    // regardless of whether the stored value is a letter, a "B) text" key,
                    // or the full option text. Mirrors TestResultView.js.
                    const optionValues = selectedQuestion.options.map((opt) =>
                      typeof opt === 'string' ? opt : opt?.value || '')
                    const correctLetter = resolveAnswerLetter(selectedQuestion.correctAnswer, optionValues)
                    const studentLetter = resolveAnswerLetter(currentUserAnswer, optionValues)

                    return (
                      <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 md:grid-cols-2">
                        {selectedQuestion.options.map((opt, i) => {
                          const key = opt?.key || String.fromCharCode(65 + i)
                          const value = typeof opt === 'string' ? opt : opt?.value || ''

                          const isCorrect = !!correctLetter && key === correctLetter
                          const isStudentAnswer = !!studentLetter && key === studentLetter
                          const isWrongSelection = isStudentAnswer && !isCorrect

                          let containerCls = 'border-slate-100 bg-white hover:border-slate-200'
                          let badgeCls = 'bg-slate-100 text-slate-600'
                          if (isCorrect) {
                            containerCls = 'border-emerald-500 bg-emerald-50 shadow-sm'
                            badgeCls = 'bg-emerald-500 text-white shadow-md'
                          } else if (isWrongSelection) {
                            containerCls = 'border-rose-500 bg-rose-50 shadow-sm'
                            badgeCls = 'bg-rose-500 text-white shadow-md'
                          }

                          return (
                            <div
                              key={i}
                              className={`flex items-start gap-4 rounded-xl border-2 p-4 transition-all ${containerCls}`}
                            >
                              <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg font-bold ${badgeCls}`}>
                                {key}
                              </span>
                              <div className="flex-1 pt-0.5 text-slate-700">
                                {renderContent(value)}
                              </div>
                              <div className="ml-auto flex flex-shrink-0 flex-col items-end gap-1">
                                {isCorrect && (
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter text-emerald-600">
                                    Correct
                                  </span>
                                )}
                                {isStudentAnswer && (
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter ${
                                    isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                                  }`}>
                                    Your Choice
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}

                  {/* Meta Data */}
                  <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-6">
                    {selectedQuestion?.subject && (
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                        {selectedQuestion.subject}
                      </span>
                    )}
                    {selectedQuestion?.difficulty && (
                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                        {selectedQuestion.difficulty}
                      </span>
                    )}
                    {selectedQuestion?.type && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        {selectedQuestion.type}
                      </span>
                    )}
                    {Array.isArray(selectedQuestion?.tags) && selectedQuestion.tags.map((tag, i) => (
                      <span key={i} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                onClick={closeModal}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
