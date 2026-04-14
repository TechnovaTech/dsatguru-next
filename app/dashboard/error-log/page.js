'use client'
import { useState, useEffect, useCallback } from 'react'
import { renderContent } from '../../components/admin/LatexRenderer'
import { FiX, FiHelpCircle } from 'react-icons/fi'

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

function EditableCell({ value, onChange, type = 'text', options, placeholder = '', className = '', onClick, onKeyDown }) {
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
  if (onClick) {
    return (
      <Cell className={className}>
        <div
          onClick={onClick}
          className="w-full text-sm min-w-[60px] cursor-pointer hover:text-blue-600 underline decoration-dotted truncate max-w-[200px]"
          title="Click to preview question"
        >
          {value || placeholder}
        </div>
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

  // Modal State
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loadingQuestion, setLoadingQuestion] = useState(false)
  const [currentUserAnswer, setCurrentUserAnswer] = useState('')

  const token = () => typeof window !== 'undefined' ? localStorage.getItem('token') : ''

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
          {saving ? '💾 Saving...' : saved ? '✅ Saved' : ''}
        </span>
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
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="text-center py-10 text-gray-400 font-medium">
                  No errors logged yet. Mistakes from your completed Admin Tests will appear here automatically.
                </td>
              </tr>
            )}
            {filtered.map((row, idx) => {
              const realIdx = rows.indexOf(row)
              const isEven = idx % 2 === 0
              const redoBg = row.redoResult === '✓' ? 'bg-green-50' : row.redoResult === '✗' ? 'bg-red-50' : ''
              return (
                <tr key={row._id || idx} className={`border-b hover:bg-blue-50 transition-colors ${isEven ? 'bg-white' : 'bg-gray-50'} ${redoBg}`}>
                  <EditableCell value={row.day} onChange={v => update(realIdx, 'day', v)} onKeyDown={e => e.key === 'Enter' && update(realIdx, 'day', e.target.value, true)} placeholder="1" className="text-center text-gray-500 font-medium" />
                  <EditableCell value={row.date} onChange={v => update(realIdx, 'date', v)} onKeyDown={e => e.key === 'Enter' && update(realIdx, 'date', e.target.value, true)} placeholder="DD Mon YYYY" className="text-center" />
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
                  <EditableCell value={row.redoDueDate} onChange={v => update(realIdx, 'redoDueDate', v)} onKeyDown={e => e.key === 'Enter' && update(realIdx, 'redoDueDate', e.target.value, true)} placeholder="DD Mon YYYY" className="text-center" />
                  <EditableCell value={row.redoAnswer} onChange={v => update(realIdx, 'redoAnswer', v)} onKeyDown={e => e.key === 'Enter' && update(realIdx, 'redoAnswer', e.target.value, true)} placeholder="Your answer" className="text-center" />
                  <EditableCell value={row.redoResult} onChange={v => update(realIdx, 'redoResult', v)} options={REDO_RESULTS} className="text-center font-bold" />
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        💡 Tip: Don&apos;t just mark it wrong and move on — write <em>why</em> you got it wrong and schedule a redo. That&apos;s what makes it stick.
      </p>

      {/* Question Preview Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FiHelpCircle className="text-blue-500" /> {selectedQuestion?.questionId ? `Question ${selectedQuestion.questionId}` : 'Question Preview'}
              </h3>
              <button 
                onClick={() => { setIsModalOpen(false); setSelectedQuestion(null); }}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <FiX className="text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
              {loadingQuestion ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  <p className="text-gray-500 animate-pulse">Loading question details...</p>
                </div>
              ) : selectedQuestion?.error ? (
                <div className="text-center py-20 text-red-500 font-medium">
                  {selectedQuestion.error}
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Question Content */}
                  <div className="prose prose-blue max-w-none text-gray-800 text-lg leading-relaxed">
                    {renderContent(selectedQuestion?.content)}
                  </div>

                  {/* Options */}
                  {selectedQuestion?.options && Array.isArray(selectedQuestion.options) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t">
                      {selectedQuestion.options.map((opt, i) => {
                        const key = opt?.key || String.fromCharCode(65 + i)
                        const value = typeof opt === 'string' ? opt : opt?.value || ''
                        
                        const isStudentAnswer = key === currentUserAnswer

                        return (
                          <div 
                            key={i} 
                            className={`p-4 rounded-xl border-2 flex items-start gap-4 transition-all ${
                              isStudentAnswer
                                ? 'border-red-500 bg-red-50 shadow-sm'
                                : 'border-gray-100 hover:border-gray-200 bg-white'
                            }`}
                          >
                            <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                              isStudentAnswer
                                ? 'bg-red-500 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {key}
                            </span>
                            <div className="flex-1 text-gray-700 pt-0.5">
                              {renderContent(value)}
                            </div>
                            {isStudentAnswer && (
                              <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                Your Choice
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Meta Data */}
                  <div className="flex flex-wrap gap-3 pt-6">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-100">
                      {selectedQuestion?.subject}
                    </span>
                    <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-bold uppercase tracking-wider border border-purple-100">
                      {selectedQuestion?.difficulty}
                    </span>
                    {selectedQuestion?.skill && (
                      <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-xs font-bold border border-gray-100">
                        {selectedQuestion?.skill}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <button 
                onClick={() => { setIsModalOpen(false); setSelectedQuestion(null); }}
                className="px-6 py-2 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-900 transition-all shadow-lg active:scale-95"
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
