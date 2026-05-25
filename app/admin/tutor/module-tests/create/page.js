'use client'
import { renderContent as renderWithImages } from '../../../../components/admin/LatexRenderer'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiSave, FiAlertCircle, FiCheck, FiClock, FiX, FiEye, FiSearch, FiArrowLeft } from 'react-icons/fi'

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
  'word-problem-data-analysis': { label: 'Word Problem and Data Analysis', subtopics: {} },
  'geometry': { label: 'Geometry', subtopics: {} }
}

const readingWritingTopics = {
  'craft-structure': 'Craft and Structure',
  'information-ideas': 'Information and Ideas',
  'standard-english-conventions': 'Standard English Conventions',
  'expression-ideas': 'Expression of Ideas'
}

export default function CreateModuleTest() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showQuestionSelector, setShowQuestionSelector] = useState(false)
  const [availableQuestions, setAvailableQuestions] = useState([])
  const [selectedQuestions, setSelectedQuestions] = useState([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [questionSearch, setQuestionSearch] = useState('')
  const [editedQuestionsData, setEditedQuestionsData] = useState({})
  const [editingQuestionId, setEditingQuestionId] = useState(null)
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0)

  const [filters, setFilters] = useState({
    subject: 'Math',
    difficulty: '',
    type: '',
    tag: '',
    remark: '',
    mathTopic: '',
    mathSubtopic: '',
    readingWritingTopic: ''
  })

  const [formData, setFormData] = useState({
    title: '',
    subject: 'Math',
    numberOfQuestions: 10,
    isTimed: true,
    duration: 30
  })

  const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }))

  const handleSelectQuestions = async () => {
    setLoadingQuestions(true)
    setShowQuestionSelector(true)
    setFilters(prev => ({ ...prev, subject: formData.subject }))
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/questions?isTutor=true&subject=${formData.subject}&isActive=true`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setAvailableQuestions(data)
      } else {
        setError('Failed to load questions')
      }
    } catch (err) {
      setError('Failed to load questions')
    } finally {
      setLoadingQuestions(false)
    }
  }

  const handleQuestionToggle = (questionId) => {
    setSelectedQuestions(prev => {
      if (prev.includes(questionId)) return prev.filter(id => id !== questionId)
      if (prev.length >= formData.numberOfQuestions) {
        setError(`You can only select ${formData.numberOfQuestions} questions`)
        setTimeout(() => setError(''), 3000)
        return prev
      }
      return [...prev, questionId]
    })
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const toSelect = getFilteredQuestions().slice(0, formData.numberOfQuestions).map(q => q.id || q._id)
      setSelectedQuestions(toSelect)
    } else {
      setSelectedQuestions([])
    }
  }

  const handleDoneSelection = () => {
    if (selectedQuestions.length !== parseInt(formData.numberOfQuestions)) {
      setError(`Please select exactly ${formData.numberOfQuestions} questions`)
      return
    }
    setShowQuestionSelector(false)
  }

  const handlePreview = () => {
    setCurrentPreviewIndex(0)
    setShowPreview(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.title.trim()) { setError('Please enter a test title'); return }
    if (selectedQuestions.length !== parseInt(formData.numberOfQuestions)) {
      setError(`Please select exactly ${formData.numberOfQuestions} questions`)
      return
    }
    if (formData.isTimed && (!formData.duration || formData.duration < 5)) {
      setError('Please enter a valid time limit (minimum 5 minutes)')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/tutor/module-tests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: formData.title,
          subject: formData.subject,
          questionIds: selectedQuestions,
          customQuestions: Object.keys(editedQuestionsData).length > 0 ? editedQuestionsData : null,
          duration: formData.isTimed ? parseInt(formData.duration) : 0,
          isTimed: formData.isTimed
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create test')
      setSuccess('Module test created successfully!')
      setTimeout(() => router.push('/admin/tutor/module-tests'), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredQuestions = () => {
    return availableQuestions.filter(q => {
      if (filters.remark?.trim()) {
        if (!(q.remark || '').toLowerCase().includes(filters.remark.toLowerCase().trim())) return false
      }
      if (filters.difficulty && q.difficulty !== filters.difficulty) return false
      if (filters.type && q.type !== filters.type) return false
      if (filters.tag) {
        const tags = typeof q.tags === 'string' ? JSON.parse(q.tags) : q.tags
        if (!tags.some(t => t.toLowerCase().includes(filters.tag.toLowerCase()))) return false
      }
      if (filters.subject === 'Math') {
        const tags = typeof q.tags === 'string' ? JSON.parse(q.tags) : q.tags
        if (filters.mathTopic && !tags.includes(filters.mathTopic)) return false
        if (filters.mathSubtopic && !tags.includes(filters.mathSubtopic)) return false
      }
      if (filters.subject === 'Reading and Writing' && filters.readingWritingTopic) {
        const tags = typeof q.tags === 'string' ? JSON.parse(q.tags) : q.tags
        if (!tags.includes(filters.readingWritingTopic)) return false
      }
      if (questionSearch.trim()) {
        const s = questionSearch.toLowerCase().trim()
        const qId = (q.questionId || '').toLowerCase()
        const content = (q.content || '').toLowerCase()
        const remark = (q.remark || '').toLowerCase()
        return qId.includes(s) || content.includes(s) || remark.includes(s)
      }
      return true
    })
  }

  const getSelectedQuestionsData = () =>
    availableQuestions
      .filter(q => selectedQuestions.includes(q.id || q._id))
      .map(q => {
        const qId = q.id || q._id
        return editedQuestionsData[qId] || q
      })

  const handleQuestionFieldChange = (questionId, field, value) => {
    const original = availableQuestions.find(q => (q.id || q._id) === questionId)
    const current = editedQuestionsData[questionId] || original
    setEditedQuestionsData(prev => ({ ...prev, [questionId]: { ...current, [field]: value } }))
  }

  const handleOptionChange = (questionId, optionKey, value) => {
    const original = availableQuestions.find(q => (q.id || q._id) === questionId)
    const current = editedQuestionsData[questionId] || original
    let opts = (() => { try { return typeof current.options === 'string' ? JSON.parse(current.options) : (current.options || {}) } catch(e) { return {} } })()
    if (Array.isArray(opts)) opts = { A: opts[0] || '', B: opts[1] || '', C: opts[2] || '', D: opts[3] || '' }
    setEditedQuestionsData(prev => ({ ...prev, [questionId]: { ...current, options: { ...opts, [optionKey]: value } } }))
  }

  const ImagePreview = ({ text }) => {
    if (!text) return null
    const regex = /!\[(.*?)\]\((.*?)\)/g
    const images = []
    let match
    while ((match = regex.exec(text)) !== null) images.push({ alt: match[1], src: match[2] })
    if (images.length === 0) return null
    return (
      <div className="mt-2 p-2 bg-gray-50 rounded border border-dashed border-gray-200">
        <span className="text-xs text-gray-500 block mb-2">Image Preview:</span>
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => <img key={i} src={img.src} alt={img.alt} className="h-20 w-auto object-contain rounded border bg-white" />)}
        </div>
      </div>
    )
  }

  const filteredQuestions = getFilteredQuestions()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {!showQuestionSelector ? (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Create Module Test</h1>
              <p className="text-sm text-gray-500 mt-1">Create a module test using tutor question bank</p>
            </div>

            {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-100"><FiAlertCircle /> {error}</div>}
            {success && <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 border border-green-100"><FiCheck /> {success}</div>}

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Test Title</label>
                  <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., Module 1 - Algebra" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Number of Questions</label>
                  <input type="number" min="1" max="50" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.numberOfQuestions} onChange={e => { setFormData({...formData, numberOfQuestions: e.target.value}); setSelectedQuestions([]) }} required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <div className="flex gap-3">
                  {['Math', 'Reading and Writing'].map(subj => (
                    <label key={subj} className={`flex-1 flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all ${formData.subject === subj ? (subj === 'Math' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-purple-50 border-purple-500 text-purple-700') : 'border-gray-300 hover:bg-gray-50'}`}>
                      <input type="radio" name="subject" value={subj} checked={formData.subject === subj} onChange={e => { setFormData({...formData, subject: e.target.value}); setSelectedQuestions([]) }} className="hidden" />
                      <span className="font-medium">{subj === 'Reading and Writing' ? 'Reading & Writing' : subj}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <button type="button" onClick={handleSelectQuestions} className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium">
                  Select Questions from {formData.subject} Question Bank
                </button>
                {selectedQuestions.length > 0 && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-green-600 font-medium">✓ {selectedQuestions.length} of {formData.numberOfQuestions} selected</span>
                    <button type="button" onClick={handlePreview} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"><FiEye /> Preview Selected</button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Mode</label>
                <div className="flex gap-3">
                  <label className={`flex-1 flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all ${formData.isTimed ? 'bg-green-50 border-green-500 text-green-700' : 'border-gray-300 hover:bg-gray-50'}`}>
                    <input type="radio" checked={formData.isTimed} onChange={() => setFormData({...formData, isTimed: true, duration: 30})} className="hidden" />
                    <FiClock className="mr-2" /><span className="font-medium">Timed</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all ${!formData.isTimed ? 'bg-orange-50 border-orange-500 text-orange-700' : 'border-gray-300 hover:bg-gray-50'}`}>
                    <input type="radio" checked={!formData.isTimed} onChange={() => setFormData({...formData, isTimed: false, duration: null})} className="hidden" />
                    <span className="font-medium">Untimed</span>
                  </label>
                </div>
              </div>

              {formData.isTimed && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Limit (minutes)</label>
                  <input type="number" min="5" max="180" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.duration || ''} onChange={e => setFormData({...formData, duration: e.target.value})} placeholder="Enter time limit" required />
                </div>
              )}

              <button type="submit" disabled={loading || selectedQuestions.length !== parseInt(formData.numberOfQuestions)} className="w-full p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium">
                <FiSave /> {loading ? 'Creating Test...' : 'Create Module Test'}
              </button>
            </form>
          </>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Select Questions</h1>
                <p className={`text-lg font-medium ${selectedQuestions.length === parseInt(formData.numberOfQuestions) ? 'text-green-600' : 'text-gray-600'}`}>
                  Selected {selectedQuestions.length} of {formData.numberOfQuestions}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedQuestions.length === parseInt(formData.numberOfQuestions) && (
                  <button type="button" onClick={handleDoneSelection} className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium text-lg">
                    <FiCheck /> Done
                  </button>
                )}
                <button type="button" onClick={() => setShowQuestionSelector(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                  <FiArrowLeft /> Back
                </button>
              </div>
            </div>

            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {['Math', 'Reading and Writing'].map(subj => (
                    <button key={subj} type="button" onClick={() => handleFilterChange('subject', subj)} className={`${filters.subject === subj ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                      {subj === 'Reading and Writing' ? 'Reading & Writing Database' : 'Math Database'}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                {filters.subject === 'Math' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Math Topic</label>
                      <select value={filters.mathTopic} onChange={e => handleFilterChange('mathTopic', e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                        <option value="">All</option>
                        {Object.entries(mathSubtopics).map(([key, t]) => <option key={key} value={key}>{t.label}</option>)}
                      </select>
                    </div>
                    {filters.mathTopic && Object.keys(mathSubtopics[filters.mathTopic]?.subtopics || {}).length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Math Subtopic</label>
                        <select value={filters.mathSubtopic} onChange={e => handleFilterChange('mathSubtopic', e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                          <option value="">All</option>
                          {Object.entries(mathSubtopics[filters.mathTopic]?.subtopics || {}).map(([key, sub]) => <option key={key} value={key}>{sub}</option>)}
                        </select>
                      </div>
                    )}
                  </>
                )}
                {filters.subject === 'Reading and Writing' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Topic</label>
                    <select value={filters.readingWritingTopic} onChange={e => handleFilterChange('readingWritingTopic', e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                      <option value="">All</option>
                      {Object.entries(readingWritingTopics).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Difficulty</label>
                  <select value={filters.difficulty} onChange={e => handleFilterChange('difficulty', e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                    <option value="">All</option>
                    <option>Easy</option><option>Medium</option><option>Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select value={filters.type} onChange={e => handleFilterChange('type', e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                    <option value="">All</option>
                    <option>MultipleChoice</option><option>ShortAnswer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Remark</label>
                  <input value={filters.remark} onChange={e => handleFilterChange('remark', e.target.value)} placeholder="Search remarks..." className="w-full border rounded px-2 py-1 text-sm" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">Questions</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input type="text" value={questionSearch} onChange={e => setQuestionSearch(e.target.value)} placeholder="Search by Question ID or Remark..." className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="text-sm text-gray-500">{loadingQuestions ? 'Loading...' : `${filteredQuestions.length} result(s)`}</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left"><input type="checkbox" checked={selectedQuestions.length === filteredQuestions.length && filteredQuestions.length > 0} onChange={handleSelectAll} className="rounded border-gray-300" /></th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredQuestions.map((q, index) => {
                      const parsedTags = typeof q.tags === 'string' ? JSON.parse(q.tags) : (Array.isArray(q.tags) ? q.tags : [])
                      const isSelected = selectedQuestions.includes(q.id || q._id)
                      return (
                        <tr key={q.id || q._id} className={`hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`} onClick={() => handleQuestionToggle(q.id || q._id)}>
                          <td className="px-6 py-4"><input type="checkbox" checked={isSelected} onChange={() => {}} className="rounded border-gray-300" /></td>
                          <td className="px-6 py-4 text-sm font-mono text-gray-900">{q.questionId || `Q-${index + 1}`}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${q.difficulty === 'Easy' ? 'bg-green-100 text-green-800' : q.difficulty === 'Hard' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{q.difficulty}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{q.type || 'MultipleChoice'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{parsedTags.join(', ') || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{q.remark || <span className="text-gray-400 italic">-</span>}</td>
                        </tr>
                      )
                    })}
                    {filteredQuestions.length === 0 && !loadingQuestions && (
                      <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No questions found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[90vh] flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-gray-900">Preview & Edit Questions</h2>
                  <span className="text-sm text-gray-600">Question {currentPreviewIndex + 1} of {getSelectedQuestionsData().length}</span>
                </div>
                <button type="button" onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600"><FiX className="w-6 h-6" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {(() => {
                  const selectedData = getSelectedQuestionsData()
                  const q = selectedData[currentPreviewIndex]
                  if (!q) return null
                  const qId = q.id || q._id
                  const isEditing = editingQuestionId === qId
                  let options = null
                  try {
                    const _raw = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
                    if (Array.isArray(_raw)) options = { A: _raw[0] || '', B: _raw[1] || '', C: _raw[2] || '', D: _raw[3] || '' }
                    else if (_raw && typeof _raw === 'object') options = _raw
                  } catch(e) {}

                  return (
                    <div className="max-w-4xl mx-auto">
                      <div className="border rounded-lg p-6 bg-gray-50">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-lg font-bold text-gray-900">Question {currentPreviewIndex + 1}</span>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${q.subject === 'Math' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{q.subject}</span>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${q.difficulty === 'Easy' ? 'bg-green-100 text-green-800' : q.difficulty === 'Hard' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{q.difficulty}</span>
                          </div>
                          <button type="button" onClick={() => isEditing ? setEditingQuestionId(null) : setEditingQuestionId(qId)} className={`px-4 py-2 ${isEditing ? 'bg-green-600' : 'bg-blue-600'} text-white rounded-lg hover:opacity-90 flex items-center gap-2`}>
                            <FiSave /> {isEditing ? 'Save' : 'Edit'}
                          </button>
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
                          {isEditing ? (
                            <textarea value={q.content || q.question} onChange={e => handleQuestionFieldChange(qId, 'content', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm" rows={4} />
                          ) : (
                            <div className="text-gray-900 bg-white p-3 rounded-lg border">{renderWithImages(q.content || q.question)}</div>
                          )}
                        </div>

                        {options && ['A','B','C','D'].filter(k => options[k]).length > 0 ? (
                          <>
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options</label>
                              <div className="space-y-2">
                                {['A', 'B', 'C', 'D'].map(letter => {
                                  const optText = options[letter] || ''
                                  if (!optText) return null
                                  return (
                                    <div key={letter} className={`p-3 border-2 rounded-lg ${q.correctAnswer === letter ? 'bg-green-50 border-green-500' : 'bg-white border-gray-200'}`}>
                                      <div className="flex items-start gap-2">
                                        <span className={`font-bold text-sm flex-shrink-0 ${q.correctAnswer === letter ? 'text-green-700' : 'text-gray-600'}`}>{letter}.</span>
                                        {isEditing ? (
                                          <textarea value={optText} onChange={e => handleOptionChange(qId, letter, e.target.value)} className="flex-1 p-2 border border-gray-300 rounded font-mono text-sm" rows={2} />
                                        ) : (
                                          <div className="flex-1">{renderWithImages(optText)}</div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer</label>
                              {isEditing ? (
                                <select value={q.correctAnswer} onChange={e => handleQuestionFieldChange(qId, 'correctAnswer', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg">
                                  {['A','B','C','D'].map(l => <option key={l}>{l}</option>)}
                                </select>
                              ) : (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                  <span className="text-sm font-medium text-green-800">Correct Answer: {q.correctAnswer}</span>
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer (Fill-in-the-Blank)</label>
                            {isEditing ? (
                              <input type="text" value={q.correctAnswer || ''} onChange={e => handleQuestionFieldChange(qId, 'correctAnswer', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg" placeholder="Enter the correct answer..." />
                            ) : (
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <span className="text-sm font-medium text-green-800">Correct Answer: {q.correctAnswer}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Short Explanation</label>
                          {isEditing ? (
                            <textarea value={q.shortExplanation || ''} onChange={e => handleQuestionFieldChange(qId, 'shortExplanation', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm" rows={3} placeholder="Add short explanation..." />
                          ) : (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 min-h-[48px]">
                              {q.shortExplanation ? renderWithImages(q.shortExplanation) : <span className="text-gray-400 italic text-sm">No short explanation added</span>}
                            </div>
                          )}
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Long Explanation</label>
                          {isEditing ? (
                            <textarea value={q.longExplanation || ''} onChange={e => handleQuestionFieldChange(qId, 'longExplanation', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm" rows={5} placeholder="Add detailed explanation..." />
                          ) : (
                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 min-h-[48px]">
                              {q.longExplanation ? renderWithImages(q.longExplanation) : <span className="text-gray-400 italic text-sm">No long explanation added</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
                <button type="button" onClick={() => { setCurrentPreviewIndex(p => Math.max(0, p-1)); setEditingQuestionId(null) }} disabled={currentPreviewIndex === 0} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium">
                  <FiArrowLeft /> Previous
                </button>
                <div className="text-sm text-gray-600">{currentPreviewIndex + 1} / {getSelectedQuestionsData().length}</div>
                <button type="button" onClick={() => { setCurrentPreviewIndex(p => Math.min(getSelectedQuestionsData().length - 1, p+1)); setEditingQuestionId(null) }} disabled={currentPreviewIndex === getSelectedQuestionsData().length - 1} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium">
                  Next <FiArrowLeft className="rotate-180" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
