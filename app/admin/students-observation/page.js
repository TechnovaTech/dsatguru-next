'use client'
import { useState, useEffect, useCallback } from 'react'
import { renderContent } from '../../components/admin/LatexRenderer'
import { FiX, FiHelpCircle, FiSearch, FiFilter } from 'react-icons/fi'

const SECTIONS = ['Math', 'Reading & Writing']
const DIFFICULTIES = ['E', 'M', 'H']
const REDO_RESULTS = ['', '✓', '✗']

function Cell({ children, className = '' }) {
  return <td className={`border border-gray-200 px-2 py-1 text-xs ${className}`}>{children}</td>
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
          className="w-full text-xs min-w-[60px] cursor-pointer hover:text-blue-600 underline decoration-dotted truncate max-w-[150px]"
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

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Students Observation</h1>
          <p className="text-gray-500 mt-1">Aggregated error logs across all students.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[250px]">
          <FiSearch className="text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by student name, email, or question ID..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none focus:ring-0 text-sm"
          />
        </div>
        <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
        <div className="flex items-center gap-3">
          <FiFilter className="text-gray-400" />
          <select 
            value={filterSection} 
            onChange={e => setFilterSection(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-600"
          >
            <option value="">All Sections</option>
            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select 
            value={filterDifficulty} 
            onChange={e => setFilterDifficulty(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-600"
          >
            <option value="">All Difficulties</option>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm custom-scrollbar">
        <table className="w-full border-collapse bg-white">
          <thead className="bg-gray-800 text-white sticky top-0">
            <tr>
              <th className="border border-gray-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider w-32">Student Name</th>
              <th className="border border-gray-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider w-24">Date</th>
              <th className="border border-gray-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider w-24">Section</th>
              <th className="border border-gray-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider w-24">Topic</th>
              <th className="border border-gray-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider min-w-[120px]">Question ID</th>
              <th className="border border-gray-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider min-w-[150px]">Why Wrong</th>
              <th className="border border-gray-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider min-w-[150px]">Correct Rule</th>
              <th className="border border-gray-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider w-20">Diff</th>
              <th className="border border-gray-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider w-24">Redo Status</th>
              <th className="border border-gray-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider w-24">Redo Date</th>
              <th className="border border-gray-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider w-20">Redo Result</th>
              <th className="border border-gray-700 px-2 py-3 text-center text-[10px] uppercase font-bold tracking-wider min-w-[150px] bg-blue-900">Tutor Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} className="text-center py-20 text-gray-500 animate-pulse">Loading observations...</td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr><td colSpan={12} className="text-center py-20 text-gray-400">No student observations found.</td></tr>
            ) : (
              filteredLogs.map((log, idx) => {
                const redoStatus = log.redoResult === '✓' ? 'Completed' : log.redoResult === '✗' ? 'Failed' : 'Pending'
                const statusColor = redoStatus === 'Completed' ? 'text-green-600 bg-green-50' : redoStatus === 'Failed' ? 'text-red-600 bg-red-50' : 'text-orange-600 bg-orange-50'
                
                return (
                  <tr key={log._id} className={`border-b hover:bg-blue-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <Cell className="font-semibold text-gray-700">
                      <div className="flex flex-col">
                        <span>{log.userId?.name}</span>
                        <span className="text-[9px] text-gray-400 font-normal">{log.userId?.email}</span>
                      </div>
                    </Cell>
                    <Cell className="text-center">{log.date}</Cell>
                    <Cell className="text-center">{log.section}</Cell>
                    <Cell>{log.topic}</Cell>
                    <Cell 
                      onClick={() => fetchQuestion(log.sourceQuestionId, log.selectedAnswer)}
                      className="text-blue-600 font-medium"
                    >
                      {log.questionDesc}
                    </Cell>
                    <Cell className="italic text-gray-600">{log.whyWrong || '—'}</Cell>
                    <Cell className="text-gray-600">{log.correctRule || '—'}</Cell>
                    <Cell className="text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.difficulty === 'H' ? 'bg-red-100 text-red-600' : 
                        log.difficulty === 'M' ? 'bg-orange-100 text-orange-600' : 
                        'bg-green-100 text-green-600'
                      }`}>
                        {log.difficulty}
                      </span>
                    </Cell>
                    <Cell className="text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor}`}>
                        {redoStatus}
                      </span>
                    </Cell>
                    <Cell className="text-center text-gray-500">{log.redoDueDate || '—'}</Cell>
                    <Cell className="text-center font-bold">{log.redoResult || '—'}</Cell>
                    <Cell className="bg-blue-50/50">
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          defaultValue={log.tutorAction}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              updateTutorAction(log._id, e.target.value)
                              e.target.blur()
                            }
                          }}
                          placeholder="Hit Enter to save..."
                          className="w-full bg-transparent focus:outline-none text-xs border-b border-transparent focus:border-blue-400 transition-all placeholder:italic"
                        />
                        {savingId === log._id && <div className="animate-spin h-3 w-3 border-b-2 border-blue-600 rounded-full"></div>}
                      </div>
                    </Cell>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Question Preview Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FiHelpCircle className="text-blue-500" /> {selectedQuestion?.questionId ? `Question ${selectedQuestion.questionId}` : 'Question Preview'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); setSelectedQuestion(null); }} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <FiX className="text-gray-500" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
              {loadingQuestion ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  <p className="text-gray-500 animate-pulse">Loading question details...</p>
                </div>
              ) : selectedQuestion?.error ? (
                <div className="text-center py-20 text-red-500 font-medium">{selectedQuestion.error}</div>
              ) : (
                <div className="space-y-8">
                  <div className="prose prose-blue max-w-none text-gray-800 text-lg leading-relaxed">
                    {renderContent(selectedQuestion?.content)}
                  </div>
                  {selectedQuestion?.options && Array.isArray(selectedQuestion.options) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t">
                      {selectedQuestion.options.map((opt, i) => {
                        const key = opt?.key || String.fromCharCode(65 + i)
                        const value = typeof opt === 'string' ? opt : opt?.value || ''
                        const isStudentAnswer = key === currentUserAnswer
                        return (
                          <div key={i} className={`p-4 rounded-xl border-2 flex items-start gap-4 transition-all ${isStudentAnswer ? 'border-red-500 bg-red-50 shadow-sm' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                            <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold ${isStudentAnswer ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}>{key}</span>
                            <div className="flex-1 text-gray-700 pt-0.5">{renderContent(value)}</div>
                            {isStudentAnswer && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">Student Choice</span>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 pt-6">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-100">{selectedQuestion?.subject}</span>
                    <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-bold uppercase tracking-wider border border-purple-100">{selectedQuestion?.difficulty}</span>
                    {selectedQuestion?.skill && <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-xs font-bold border border-gray-100">{selectedQuestion?.skill}</span>}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <button onClick={() => { setIsModalOpen(false); setSelectedQuestion(null); }} className="px-6 py-2 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-900 transition-all shadow-lg active:scale-95">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
