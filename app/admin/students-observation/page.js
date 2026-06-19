'use client'
import { useState, useEffect, useCallback } from 'react'
import { renderContent } from '../../components/admin/LatexRenderer'
import { FiX, FiHelpCircle, FiSearch, FiFilter } from 'react-icons/fi'

const SECTIONS = ['Math', 'Reading & Writing']
const DIFFICULTIES = ['E', 'M', 'H']
const REDO_RESULTS = ['', '✓', '✗']

function Cell({ children, className = '' }) {
  return <td className={`border border-slate-200 px-2 py-1 text-xs ${className}`}>{children}</td>
}

function EditableCell({ value, onChange, type = 'text', options, placeholder = '', className = '', onClick, onKeyDown }) {
  if (options) {
    return (
      <Cell className={className}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-transparent focus:outline-none text-xs"
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
          className="w-full text-xs min-w-[60px] cursor-pointer hover:text-indigo-600 underline decoration-dotted truncate max-w-[150px]"
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
        className="w-full bg-transparent focus:outline-none text-xs min-w-[60px]"
      />
    </Cell>
  )
}

export default function StudentsObservationPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  // Modal State
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loadingQuestion, setLoadingQuestion] = useState(false)
  const [currentUserAnswer, setCurrentUserAnswer] = useState('')

  const token = () => typeof window !== 'undefined' ? localStorage.getItem('token') : ''

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/error-logs', {
        headers: { Authorization: `Bearer ${token()}` }
      })
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
      }
    } catch (err) {
      console.error('Failed to fetch logs', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Close question preview modal on Escape key
  useEffect(() => {
    if (!isModalOpen) return
    const onKey = (e) => { if (e.key === 'Escape') { setIsModalOpen(false); setSelectedQuestion(null) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isModalOpen])

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

  const updateTutorAction = async (id, value) => {
    setSavingId(id)
    try {
      const res = await fetch('/api/admin/error-logs', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}` 
        },
        body: JSON.stringify({ id, tutorAction: value })
      })
      if (res.ok) {
        setLogs(prev => prev.map(l => l._id === id ? { ...l, tutorAction: value } : l))
      }
    } catch (err) {
      console.error('Failed to update tutor action', err)
    } finally {
      setSavingId(null)
    }
  }

  const filteredLogs = logs.filter(log => {
    const studentName = (log.userId?.name || '').toLowerCase()
    const studentEmail = (log.userId?.email || '').toLowerCase()
    const qDesc = (log.questionDesc || '').toLowerCase()
    const matchesSearch = studentName.includes(searchTerm.toLowerCase()) || 
                         studentEmail.includes(searchTerm.toLowerCase()) || 
                         qDesc.includes(searchTerm.toLowerCase())
    
    const matchesSection = !filterSection || log.section === filterSection
    const matchesDifficulty = !filterDifficulty || log.difficulty === filterDifficulty
    
    return matchesSearch && matchesSection && matchesDifficulty
  })

  // Reset to the first page whenever any filter changes.
  useEffect(() => { setPage(1) }, [searchTerm, filterSection, filterDifficulty])

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pageLogs = filteredLogs.slice(startIndex, startIndex + PAGE_SIZE)

  return (
    <div className="p-6 lg:p-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">Students Observation</h1>
          <p className="text-slate-500 mt-1 text-sm">Aggregated error logs across all students.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[250px]">
          <label htmlFor="observation-search" className="sr-only">Search observations</label>
          <FiSearch className="text-slate-400" />
          <input
            id="observation-search"
            type="text"
            placeholder="Search by student name, email, or question ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none focus:ring-0 text-sm text-slate-700 placeholder:text-slate-400"
          />
        </div>
        <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
        <div className="flex items-center gap-3">
          <FiFilter className="text-slate-400" />
          <label htmlFor="filter-section" className="sr-only">Filter by section</label>
          <select
            id="filter-section"
            value={filterSection}
            onChange={e => setFilterSection(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-600"
          >
            <option value="">All Sections</option>
            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <label htmlFor="filter-difficulty" className="sr-only">Filter by difficulty</label>
          <select
            id="filter-difficulty"
            value={filterDifficulty}
            onChange={e => setFilterDifficulty(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-600"
          >
            <option value="">All Difficulties</option>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm custom-scrollbar">
        <table className="w-full border-collapse bg-white">
          <thead className="bg-slate-800 text-white sticky top-0">
            <tr>
              <th className="border border-slate-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider w-32">Student Name</th>
              <th className="border border-slate-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider w-24">Date</th>
              <th className="border border-slate-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider w-24">Section</th>
              <th className="border border-slate-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider w-24">Topic</th>
              <th className="border border-slate-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider min-w-[120px]">Question ID</th>
              <th className="border border-slate-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider min-w-[150px]">Why Wrong</th>
              <th className="border border-slate-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider min-w-[150px]">Correct Rule</th>
              <th className="border border-slate-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider w-20">Diff</th>
              <th className="border border-slate-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider w-24">Redo Status</th>
              <th className="border border-slate-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider w-24">Redo Date</th>
              <th className="border border-slate-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider w-20">Redo Result</th>
              <th className="border border-slate-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider min-w-[150px] bg-indigo-900">Tutor Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} className="py-20">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                  <p className="text-sm text-slate-500">Loading observations...</p>
                </div>
              </td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr><td colSpan={12} className="py-12">
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                    <FiSearch size={26} />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-500">No student observations found</h3>
                  <p className="text-sm text-slate-400">
                    {searchTerm || filterSection || filterDifficulty ? 'Try adjusting your filters.' : 'Error logs from students will appear here.'}
                  </p>
                </div>
              </td></tr>
            ) : (
              pageLogs.map((log, idx) => {
                const redoStatus = log.redoResult === '✓' ? 'Completed' : log.redoResult === '✗' ? 'Failed' : 'Pending'
                const statusColor = redoStatus === 'Completed' ? 'text-emerald-600 bg-emerald-50' : redoStatus === 'Failed' ? 'text-red-600 bg-red-50' : 'text-orange-600 bg-orange-50'

                return (
                  <tr key={log._id} className={`border-b border-slate-100 hover:bg-indigo-50/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <Cell className="font-semibold text-slate-700">
                      <div className="flex flex-col">
                        <span>{log.userId?.name}</span>
                        <span className="text-[9px] text-slate-400 font-normal">{log.userId?.email}</span>
                      </div>
                    </Cell>
                    <Cell className="text-center text-slate-600">{log.date}</Cell>
                    <Cell className="text-center text-slate-600">{log.section}</Cell>
                    <Cell className="text-slate-600">{log.topic}</Cell>
                    <Cell
                      onClick={() => fetchQuestion(log.sourceQuestionId, log.selectedAnswer)}
                      className="text-indigo-600 font-medium"
                    >
                      {log.questionDesc}
                    </Cell>
                    <Cell className="italic text-slate-600">{log.whyWrong || '—'}</Cell>
                    <Cell className="text-slate-600">{log.correctRule || '—'}</Cell>
                    <Cell className="text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.difficulty === 'H' ? 'bg-red-50 text-red-600' :
                        log.difficulty === 'M' ? 'bg-orange-50 text-orange-600' :
                        'bg-emerald-50 text-emerald-600'
                      }`}>
                        {log.difficulty}
                      </span>
                    </Cell>
                    <Cell className="text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor}`}>
                        {redoStatus}
                      </span>
                    </Cell>
                    <Cell className="text-center text-slate-500">{log.redoDueDate || '—'}</Cell>
                    <Cell className="text-center font-bold text-slate-700">{log.redoResult || '—'}</Cell>
                    <Cell className="bg-indigo-50/50">
                      <div className="flex items-center gap-2">
                        <label htmlFor={`tutor-action-${log._id}`} className="sr-only">Tutor action for {log.userId?.name}</label>
                        <input
                          id={`tutor-action-${log._id}`}
                          type="text"
                          defaultValue={log.tutorAction}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              updateTutorAction(log._id, e.target.value)
                              e.target.blur()
                            }
                          }}
                          placeholder="Hit Enter to save..."
                          className="w-full bg-transparent focus:outline-none text-xs border-b border-transparent focus:border-indigo-400 transition-all placeholder:italic"
                        />
                        {savingId === log._id && <div className="animate-spin h-3 w-3 border-b-2 border-indigo-600 rounded-full"></div>}
                      </div>
                    </Cell>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && filteredLogs.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
          <p className="text-sm text-slate-500">
            Showing <span className="font-medium text-slate-700">{startIndex + 1}</span>
            –<span className="font-medium text-slate-700">{Math.min(startIndex + PAGE_SIZE, filteredLogs.length)}</span>
            {' '}of <span className="font-medium text-slate-700">{filteredLogs.length}</span> observations
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Question Preview Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { setIsModalOpen(false); setSelectedQuestion(null); }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FiHelpCircle className="text-indigo-500" /> {selectedQuestion?.questionId ? `Question ${selectedQuestion.questionId}` : 'Question Preview'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); setSelectedQuestion(null); }} aria-label="Close dialog" className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <FiX className="text-slate-500" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
              {loadingQuestion ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                  <p className="text-slate-500">Loading question details...</p>
                </div>
              ) : selectedQuestion?.error ? (
                <div className="text-center py-20 text-red-500 font-medium">{selectedQuestion.error}</div>
              ) : (
                <div className="space-y-8">
                  <div className="prose prose-indigo max-w-none text-slate-800 text-lg leading-relaxed">
                    {renderContent(selectedQuestion?.content)}
                  </div>
                  {selectedQuestion?.options && Array.isArray(selectedQuestion.options) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                      {selectedQuestion.options.map((opt, i) => {
                        const key = opt?.key || String.fromCharCode(65 + i)
                        const value = typeof opt === 'string' ? opt : opt?.value || ''
                        const isStudentAnswer = key === currentUserAnswer
                        return (
                          <div key={i} className={`p-4 rounded-xl border-2 flex items-start gap-4 transition-all ${isStudentAnswer ? 'border-red-500 bg-red-50 shadow-sm' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                            <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold ${isStudentAnswer ? 'bg-red-500 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}>{key}</span>
                            <div className="flex-1 text-slate-700 pt-0.5">{renderContent(value)}</div>
                            {isStudentAnswer && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">Student Choice</span>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 pt-6">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-100">{selectedQuestion?.subject}</span>
                    <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold uppercase tracking-wider border border-amber-100">{selectedQuestion?.difficulty}</span>
                    {selectedQuestion?.skill && <span className="px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-xs font-bold border border-slate-100">{selectedQuestion?.skill}</span>}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => { setIsModalOpen(false); setSelectedQuestion(null); }} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-sm active:scale-95">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
