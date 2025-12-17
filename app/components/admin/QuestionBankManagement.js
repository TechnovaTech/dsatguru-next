'use client'
import { useEffect, useState } from 'react'
import { FiSearch, FiEye, FiArrowLeft, FiPlus, FiEdit, FiX, FiCheck, FiEye as FiPreview, FiTrash } from 'react-icons/fi'
import { useRouter } from 'next/navigation'

export default function QuestionBankManagement() {
  const router = useRouter()
  const [questionBanks, setQuestionBanks] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [currentView, setCurrentView] = useState('banks')
  const [selectedBank, setSelectedBank] = useState(null)
  const [questions, setQuestions] = useState([])
  const [qLoading, setQLoading] = useState(false)
  const [filters, setFilters] = useState({ subject: '', difficulty: '', type: '', tag: '', isActive: '', mathTopic: '', mathSubtopic: '', readingWritingTopic: '' })
  const [preview, setPreview] = useState(null)
  const [editItem, setEditItem] = useState(null)

  const mathSubtopics = {
    'algebra': {
      label: 'Algebra',
      subtopics: {
        'expression': 'Expression',
        'linear-equations': 'Linear Equations',
        'linear-system-equations': 'Linear System of Equations',
        'linear-functions': 'Linear Functions',
        'linear-inequalities': 'Linear Inequalities'
      }
    },
    'advance-math': {
      label: 'Advance Math',
      subtopics: {
        'polynomials': 'Polynomials',
        'exponents-radicals': 'Exponents & Radicals',
        'functions-notation': 'Functions & Function Notations',
        'exponential-functions': 'Exponential Functions',
        'quadratics': 'Quadratics'
      }
    },
    'word-problem-data-analysis': {
      label: 'Word Problem and Data Analysis',
      subtopics: {}
    },
    'geometry': {
      label: 'Geometry',
      subtopics: {}
    }
  }
  const readingWritingTopics = {
    'reading': 'Reading',
    'writing': 'Writing'
  }

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/questions?question-banks=true')
        const json = await res.json()
        const data = json.data || []
        setQuestionBanks(data)
      } finally {
        setLoading(false)
      }
    }
    fetchBanks()
  }, [])

  const filteredBanks = questionBanks.filter(b => (b.title || '').toLowerCase().includes(search.toLowerCase()))

  const fetchQuestions = async (bankId) => {
    try {
      setQLoading(true)
      const params = new URLSearchParams()
      if (bankId) params.set('bankId', bankId)
      if (filters.subject) params.set('subject', filters.subject)
      if (filters.difficulty) params.set('difficulty', filters.difficulty)
      if (filters.type) params.set('type', filters.type)
      if (filters.tag) params.set('tag', filters.tag)
      if (filters.isActive !== '') params.set('isActive', String(filters.isActive === 'true'))
      const res = await fetch(`/api/questions?${params.toString()}`)
      const json = await res.json()
      setQuestions(json.data || [])
    } finally {
      setQLoading(false)
    }
  }

  const setBankAndView = (bank) => {
    setSelectedBank(bank)
    setCurrentView('questions')
    fetchQuestions(bank.id)
  }

  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value }
    if (key === 'subject') {
      next.mathTopic = ''
      next.mathSubtopic = ''
      next.readingWritingTopic = ''
      next.tag = ''
    }
    if (next.subject === 'Math') {
      next.tag = next.mathSubtopic || next.mathTopic || next.tag
    } else if (next.subject === 'Reading and Writing') {
      next.tag = next.readingWritingTopic || next.tag
    }
    setFilters(next)
    if (selectedBank) fetchQuestions(selectedBank.id)
  }

  const toggleActive = async (q) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    await fetch(`/api/admin/questions/${q.id}`, {
      method: 'PATCH',
      headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !q.isActive })
    })
    fetchQuestions(selectedBank.id)
  }

  const softDelete = async (q) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    await fetch(`/api/admin/questions/${q.id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    fetchQuestions(selectedBank.id)
  }

  const saveEdit = async () => {
    if (!editItem) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const payload = {
      title: editItem.title || '',
      questionParagraph: editItem.questionParagraph || '',
      content: editItem.content || '',
      explanation: editItem.explanation || '',
      shortExplanation: editItem.shortExplanation || '',
      longExplanation: editItem.longExplanation || '',
      subject: editItem.subject,
      difficulty: editItem.difficulty,
      type: editItem.type,
      correctAnswer: editItem.correctAnswer || 'A',
      options: Array.isArray(editItem.options) ? editItem.options : ['', '', '', ''],
      tags: editItem.tags || [],
      points: typeof editItem.points === 'number' ? editItem.points : 1
    }
    await fetch(`/api/admin/questions/${editItem.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    })
    setEditItem(null)
    fetchQuestions(selectedBank.id)
  }

  if (currentView === 'questions' && selectedBank) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button className="inline-flex items-center text-blue-600 hover:text-blue-800" onClick={() => { setCurrentView('banks'); setSelectedBank(null) }}>
              <FiArrowLeft className="mr-2" />
              <span>Back to Question Banks</span>
            </button>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedBank.title}</h1>
            <p className="text-gray-600">Manage questions for this question bank</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                <select value={filters.subject} onChange={(e) => handleFilterChange('subject', e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                  <option value="">All</option>
                  <option value="Math">Math</option>
                  <option value="Reading and Writing">Reading and Writing</option>
                </select>
              </div>
              {filters.subject === 'Math' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Math Topic</label>
                    <select value={filters.mathTopic} onChange={(e) => handleFilterChange('mathTopic', e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                      <option value="">All</option>
                      {Object.entries(mathSubtopics).map(([key, topic]) => (
                        <option key={key} value={key}>{topic.label}</option>
                      ))}
                    </select>
                  </div>
                  {filters.mathTopic && Object.keys(mathSubtopics[filters.mathTopic]?.subtopics || {}).length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Math Subtopic</label>
                      <select value={filters.mathSubtopic} onChange={(e) => handleFilterChange('mathSubtopic', e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                        <option value="">All</option>
                        {Object.entries(mathSubtopics[filters.mathTopic]?.subtopics || {}).map(([key, sub]) => (
                          <option key={key} value={key}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
              {filters.subject === 'Reading and Writing' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Topic</label>
                  <select value={filters.readingWritingTopic} onChange={(e) => handleFilterChange('readingWritingTopic', e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                    <option value="">All</option>
                    {Object.entries(readingWritingTopics).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Difficulty</label>
                <select value={filters.difficulty} onChange={(e) => handleFilterChange('difficulty', e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                  <option value="">All</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Question Type</label>
                <select value={filters.type} onChange={(e) => handleFilterChange('type', e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                  <option value="">All</option>
                  <option value="MultipleChoice">MultipleChoice</option>
                  <option value="TrueFalse">TrueFalse</option>
                  <option value="ShortAnswer">ShortAnswer</option>
                  <option value="Essay">Essay</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Custom Tag</label>
                <input value={filters.tag} onChange={(e) => handleFilterChange('tag', e.target.value)} placeholder="e.g. algebra" className="w-full border rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select value={filters.isActive} onChange={(e) => handleFilterChange('isActive', e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Manage Questions</h2>
              <div className="text-sm text-gray-500">{qLoading ? 'Loading...' : `${questions.length} result(s)`}</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Topic/Subtopic</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {questions.map(q => (
                    <tr key={q.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{q.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{q.subject}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{q.difficulty}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{q.type}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{(q.tags || []).join(', ')}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${q.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {q.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button className="inline-flex items-center px-2 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded" onClick={() => setEditItem({ ...q })}>
                            <FiEdit className="mr-1" /> Edit
                          </button>
                          <button className="inline-flex items-center px-2 py-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded" onClick={() => setPreview(q)}>
                            <FiPreview className="mr-1" /> Preview
                          </button>
                          <button className="inline-flex items-center px-2 py-1 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded" onClick={() => toggleActive(q)}>
                            {q.isActive ? <><FiX className="mr-1" /> Disable</> : <><FiCheck className="mr-1" /> Enable</>}
                          </button>
                          <button className="inline-flex items-center px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded" onClick={() => softDelete(q)}>
                            <FiTrash className="mr-1" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {questions.length === 0 && !qLoading && (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">No questions found for the selected filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {preview && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-lg max-w-[1200px] w-[90vw]">
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Preview Question</h3>
                  <button className="text-gray-600 hover:text-gray-800" onClick={() => setPreview(null)}><FiX /></button>
                </div>
                <div className="p-4 space-y-4">
                  {preview.questionParagraph && <div className="text-gray-700 whitespace-pre-line">{preview.questionParagraph}</div>}
                  <div className="text-gray-900 whitespace-pre-line">{preview.content}</div>
                  {Array.isArray(preview.options) && preview.options.length > 0 && (
                    <div className="space-y-2">
                      {preview.options.map((opt, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="font-medium">{String.fromCharCode(65 + i)}.</span>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="text-sm text-gray-600">Correct Answer: <span className="font-semibold">{preview.correctAnswer}</span></div>
                  {preview.explanation && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium text-gray-700">Explanation:</span>
                      <p className="text-gray-600 whitespace-pre-line">{preview.explanation}</p>
                    </div>
                  )}
                  {preview.shortExplanation && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium text-gray-700">Short Explanation:</span>
                      <p className="text-gray-600 whitespace-pre-line">{preview.shortExplanation}</p>
                    </div>
                  )}
                  {preview.longExplanation && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium text-gray-700">Long Explanation:</span>
                      <p className="text-gray-600 whitespace-pre-line">{preview.longExplanation}</p>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t text-right">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={() => setPreview(null)}>Close</button>
                </div>
              </div>
            </div>
          )}

          {editItem && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-lg max-w-[1500px] w-[95vw]">
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Edit Question</h3>
                  <button className="text-gray-600 hover:text-gray-800" onClick={() => setEditItem(null)}><FiX /></button>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                    <select value={editItem.subject} onChange={(e) => setEditItem({ ...editItem, subject: e.target.value })} className="w-full border rounded px-2 py-1 text-sm">
                      <option value="Math">Math</option>
                      <option value="Reading and Writing">Reading and Writing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Module Type</label>
                    <select value={editItem.testType} onChange={(e) => setEditItem({ ...editItem, testType: e.target.value })} className="w-full border rounded px-2 py-1 text-sm">
                      <option value="Base">Base</option>
                      <option value="Adaptive">Adaptive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Difficulty</label>
                    <select value={editItem.difficulty} onChange={(e) => setEditItem({ ...editItem, difficulty: e.target.value })} className="w-full border rounded px-2 py-1 text-sm">
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Question Type</label>
                    <select value={editItem.type} onChange={(e) => setEditItem({ ...editItem, type: e.target.value })} className="w-full border rounded px-2 py-1 text-sm">
                      <option value="MultipleChoice">MultipleChoice</option>
                      <option value="TrueFalse">TrueFalse</option>
                      <option value="ShortAnswer">ShortAnswer</option>
                      <option value="Essay">Essay</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                    <input
                      value={(editItem.tags || []).join(', ')}
                      onChange={(e) => setEditItem({ ...editItem, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                    <input
                      value={editItem.title || ''}
                      onChange={(e) => setEditItem({ ...editItem, title: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Question Paragraph</label>
                    <textarea
                      value={editItem.questionParagraph || ''}
                      onChange={(e) => setEditItem({ ...editItem, questionParagraph: e.target.value })}
                      rows={3}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Question Text</label>
                    <textarea
                      value={editItem.content || ''}
                      onChange={(e) => setEditItem({ ...editItem, content: e.target.value })}
                      rows={4}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Explanation</label>
                    <textarea
                      value={editItem.explanation || ''}
                      onChange={(e) => setEditItem({ ...editItem, explanation: e.target.value })}
                      rows={3}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Short Explanation</label>
                    <textarea
                      value={editItem.shortExplanation || ''}
                      onChange={(e) => setEditItem({ ...editItem, shortExplanation: e.target.value })}
                      rows={2}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Long Explanation</label>
                    <textarea
                      value={editItem.longExplanation || ''}
                      onChange={(e) => setEditItem({ ...editItem, longExplanation: e.target.value })}
                      rows={4}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-2">Options</label>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {(Array.isArray(editItem.options) && editItem.options.length > 0 ? editItem.options : ['', '', '', '']).map((opt, idx) => (
                        <div key={idx}>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Option {String.fromCharCode(65 + idx)}</label>
                          <input
                            value={opt || ''}
                            onChange={(e) => {
                              const next = Array.isArray(editItem.options) && editItem.options.length > 0 ? [...editItem.options] : ['', '', '', '']
                              next[idx] = e.target.value
                              setEditItem({ ...editItem, options: next })
                            }}
                            className="w-full border rounded px-2 py-1 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Correct Answer</label>
                    <select
                      value={editItem.correctAnswer || 'A'}
                      onChange={(e) => setEditItem({ ...editItem, correctAnswer: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Points</label>
                    <input
                      type="number"
                      value={typeof editItem.points === 'number' ? editItem.points : 1}
                      onChange={(e) => setEditItem({ ...editItem, points: Number(e.target.value || 1) })}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                </div>
                <div className="p-4 border-t text-right flex gap-2 justify-end">
                  <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded" onClick={() => setEditItem(null)}>Cancel</button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={saveEdit}>Save</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => router.replace('/admin/sat-question-upload')}
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              <FiArrowLeft className="mr-2" />
              <span>Back to SAT Question Management</span>
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Question Bank Management</h1>
          <div className="text-gray-600 text-sm">{loading ? 'Loading question banks...' : `${questionBanks.length} Question Banks`}</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search question banks..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Question Banks ({filteredBanks.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Draft</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBanks.map(bank => (
                  <tr key={bank.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bank.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bank.totalQuestions}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bank.activeQuestions}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bank.draftQuestions}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${bank.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{bank.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(bank.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="inline-flex items-center px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded" onClick={() => setBankAndView(bank)}>
                        <FiEye className="mr-1" /> View
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredBanks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">{loading ? 'Loading...' : 'No question banks found'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
