'use client'
import { renderContent as renderWithImages } from '../../../../components/admin/LatexRenderer'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiSave, FiAlertCircle, FiCheck, FiClock, FiX, FiEye, FiSearch, FiArrowLeft } from 'react-icons/fi'

const mathSubtopics = {
  'algebra': { label: 'Algebra', subtopics: { 'expression': 'Expression', 'linear-equations': 'Linear Equations', 'linear-system-equations': 'Linear System of Equations', 'linear-functions': 'Linear Functions', 'linear-inequalities': 'Linear Inequalities' } },
  'advance-math': { label: 'Advance Math', subtopics: { 'polynomials': 'Polynomials', 'exponents-radicals': 'Exponents & Radicals', 'functions-notation': 'Functions & Function Notations', 'exponential-functions': 'Exponential Functions', 'quadratics': 'Quadratics' } },
  'word-problem-data-analysis': { label: 'Word Problem & Data Analysis', subtopics: {} },
  'geometry': { label: 'Geometry', subtopics: {} }
}
const rwTopics = { 'craft-structure': 'Craft and Structure', 'information-ideas': 'Information and Ideas', 'standard-english-conventions': 'Standard English Conventions', 'expression-ideas': 'Expression of Ideas' }

const makeDefaultModule = (subject = 'Reading and Writing') => ({ subject, numberOfQuestions: 10, isTimed: true, duration: 30, breakAfter: 0 })

export default function CreateModuleTest() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [title, setTitle] = useState('')
  const [numberOfModules, setNumberOfModules] = useState(4)
  const [activeModuleTab, setActiveModuleTab] = useState(0)
  const [moduleConfigs, setModuleConfigs] = useState([
    { subject: 'Reading and Writing', numberOfQuestions: 27, isTimed: true, duration: 32, breakAfter: 0 },
    { subject: 'Reading and Writing', numberOfQuestions: 27, isTimed: true, duration: 32, breakAfter: 10 },
    { subject: 'Math', numberOfQuestions: 22, isTimed: true, duration: 35, breakAfter: 0 },
    { subject: 'Math', numberOfQuestions: 22, isTimed: true, duration: 35, breakAfter: 0 }
  ])
  const [selectedQuestions, setSelectedQuestions] = useState([[], [], [], []])
  const [availableQuestions, setAvailableQuestions] = useState([[], [], [], []])
  const [loadingQMap, setLoadingQMap] = useState({})
  const [editedQuestionsData, setEditedQuestionsData] = useState({})

  // Selector
  const [showSelector, setShowSelector] = useState(false)
  const [selectorModule, setSelectorModule] = useState(0)
  const [questionSearch, setQuestionSearch] = useState('')
  const [filters, setFilters] = useState({ subject: 'Reading and Writing', difficulty: '', mathTopic: '', mathSubtopic: '', rwTopic: '', remark: '' })

  // Preview
  const [showPreview, setShowPreview] = useState(false)
  const [previewModule, setPreviewModule] = useState(0)
  const [previewIdx, setPreviewIdx] = useState(0)
  const [editingQId, setEditingQId] = useState(null)

  const updateModuleConfig = (idx, key, value) => {
    setModuleConfigs(prev => { const n = [...prev]; n[idx] = { ...n[idx], [key]: value }; return n })
  }

  const handleSelectQuestions = async (moduleIdx) => {
    const targetSubject = moduleConfigs[moduleIdx].subject
    setSelectorModule(moduleIdx)
    setShowSelector(true)
    setQuestionSearch('')
    setFilters({ subject: targetSubject, difficulty: '', mathTopic: '', mathSubtopic: '', rwTopic: '', remark: '' })

    if (availableQuestions[moduleIdx].length === 0) {
      setLoadingQMap(prev => ({ ...prev, [moduleIdx]: true }))
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`/api/questions?isTutor=true&subject=${encodeURIComponent(targetSubject)}&isActive=true`, { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          setAvailableQuestions(prev => { const n = [...prev]; n[moduleIdx] = data; return n })
        }
      } finally {
        setLoadingQMap(prev => ({ ...prev, [moduleIdx]: false }))
      }
    }
  }

  const handleFilterSubjectChange = async (subj) => {
    setFilters(prev => ({ ...prev, subject: subj, mathTopic: '', mathSubtopic: '', rwTopic: '' }))
    const idx = selectorModule
    setLoadingQMap(prev => ({ ...prev, [idx]: true }))
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/questions?isTutor=true&subject=${encodeURIComponent(subj)}&isActive=true`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setAvailableQuestions(prev => { const n = [...prev]; n[idx] = data; return n })
      }
    } finally {
      setLoadingQMap(prev => ({ ...prev, [idx]: false }))
    }
  }

  const getFilteredQuestions = () => {
    const qs = availableQuestions[selectorModule] || []
    return qs.filter(q => {
      if (filters.remark?.trim() && !(q.remark || '').toLowerCase().includes(filters.remark.toLowerCase().trim())) return false
      if (filters.difficulty && q.difficulty !== filters.difficulty) return false
      const tags = typeof q.tags === 'string' ? JSON.parse(q.tags) : (Array.isArray(q.tags) ? q.tags : [])
      if (filters.subject === 'Math') {
        if (filters.mathTopic && !tags.includes(filters.mathTopic)) return false
        if (filters.mathSubtopic && !tags.includes(filters.mathSubtopic)) return false
      }
      if ((filters.subject === 'Reading and Writing' || filters.subject === 'Reading & Writing') && filters.rwTopic && !tags.includes(filters.rwTopic)) return false
      if (questionSearch.trim()) {
        const s = questionSearch.toLowerCase().trim()
        return (q.questionId || '').toLowerCase().includes(s) || (q.content || '').toLowerCase().includes(s) || (q.remark || '').toLowerCase().includes(s)
      }
      return true
    })
  }

  const toggleQuestion = (qId) => {
    const idx = selectorModule
    const cfg = moduleConfigs[idx]
    setSelectedQuestions(prev => {
      const n = [...prev]
      if (n[idx].includes(qId)) {
        n[idx] = n[idx].filter(id => id !== qId)
      } else {
        if (n[idx].length >= parseInt(cfg.numberOfQuestions)) {
          setError(`Module ${idx + 1}: Max ${cfg.numberOfQuestions} questions`)
          setTimeout(() => setError(''), 3000)
          return prev
        }
        n[idx] = [...n[idx], qId]
      }
      return n
    })
  }

  const getPreviewQuestions = (moduleIdx) => {
    const qs = availableQuestions[moduleIdx] || []
    const sel = selectedQuestions[moduleIdx] || []
    return qs.filter(q => sel.includes(q.id || q._id)).map(q => {
      const qId = q.id || q._id
      return editedQuestionsData[qId] ? { ...q, ...editedQuestionsData[qId] } : q
    })
  }

  const handleQFieldChange = (qId, field, value) => {
    setEditedQuestionsData(prev => ({ ...prev, [qId]: { ...(prev[qId] || {}), [field]: value } }))
  }
  const handleOptionChange = (qId, optKey, value) => {
    const current = editedQuestionsData[qId]?.options || {}
    let opts = typeof current === 'string' ? JSON.parse(current) : current
    if (Array.isArray(opts)) opts = { A: opts[0]||'', B: opts[1]||'', C: opts[2]||'', D: opts[3]||'' }
    setEditedQuestionsData(prev => ({ ...prev, [qId]: { ...(prev[qId] || {}), options: { ...opts, [optKey]: value } } }))
  }

  const isAllComplete = () => {
    if (!title.trim()) return false
    for (let i = 0; i < numberOfModules; i++) {
      const cfg = moduleConfigs[i]
      if (selectedQuestions[i].length !== parseInt(cfg.numberOfQuestions)) return false
      if (cfg.isTimed && (!cfg.duration || cfg.duration < 5)) return false
    }
    return true
  }

  const handleSubmit = async () => {
    setError('')
    if (!title.trim()) { setError('Please enter a test title'); return }
    for (let i = 0; i < numberOfModules; i++) {
      const cfg = moduleConfigs[i]
      if (selectedQuestions[i].length !== parseInt(cfg.numberOfQuestions)) {
        setError(`Module ${i + 1}: Please select exactly ${cfg.numberOfQuestions} questions`); return
      }
      if (cfg.isTimed && (!cfg.duration || cfg.duration < 5)) {
        setError(`Module ${i + 1}: Time limit must be at least 5 minutes`); return
      }
    }
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const modules = moduleConfigs.map((cfg, i) => ({
        moduleNumber: i + 1,
        subject: cfg.subject,
        questions: selectedQuestions[i],
        duration: cfg.isTimed ? parseInt(cfg.duration) : 0,
        isTimed: cfg.isTimed,
        numberOfQuestions: parseInt(cfg.numberOfQuestions),
        breakAfter: i < moduleConfigs.length - 1 ? (parseInt(cfg.breakAfter) || 0) : 0
      }))
      const res = await fetch('/api/admin/tutor/module-tests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, numberOfModules, modules, customQuestions: Object.keys(editedQuestionsData).length > 0 ? editedQuestionsData : null })
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

  const ImagePreview = ({ text }) => {
    if (!text) return null
    const regex = /!\[(.*?)\]\((.*?)\)/g; const images = []; let match
    while ((match = regex.exec(text)) !== null) images.push({ alt: match[1], src: match[2] })
    if (!images.length) return null
    return <div className="mt-2 p-2 bg-gray-50 rounded border border-dashed border-gray-200"><div className="flex flex-wrap gap-2">{images.map((img, i) => <img key={i} src={img.src} alt={img.alt} className="h-16 w-auto object-contain rounded border bg-white" />)}</div></div>
  }

  const filteredQs = getFilteredQuestions()
  const cfg = moduleConfigs[activeModuleTab] || { subject: 'Reading and Writing', numberOfQuestions: 27, isTimed: true, duration: 32 }
  const selCount = (selectedQuestions[activeModuleTab] || []).length

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {!showSelector ? (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Create Full DSAT Module Test</h1>
              <p className="text-sm text-gray-500 mt-1">4 Modules (2 R&W, 2 Math) with fixed question counts</p>
            </div>

            {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-100"><FiAlertCircle /> {error}</div>}
            {success && <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 border border-green-100"><FiCheck /> {success}</div>}

            {/* Title */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Title <span className="text-red-500">*</span></label>
                <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., Full SAT Practice Test 1" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
            </div>

            {/* Module Tabs */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex flex-wrap">
                  {/* Section 1 Header */}
                  <div className="px-4 py-3 bg-purple-50 border-r flex items-center gap-2">
                    <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Section 1: R&W</span>
                  </div>
                  {Array.from({ length: 2 }, (_, i) => {
                    const mSel = (selectedQuestions[i] || []).length
                    const mCfg = moduleConfigs[i]
                    const isComplete = mSel === parseInt(mCfg.numberOfQuestions)
                    return (
                      <button key={i} onClick={() => setActiveModuleTab(i)} className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors ${activeModuleTab === i ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        M{i + 1}
                        {isComplete
                          ? <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"><FiCheck className="text-white w-3 h-3" /></span>
                          : <span className="text-xs text-gray-400 font-normal">{mSel}/{mCfg.numberOfQuestions}</span>
                        }
                      </button>
                    )
                  })}
                  {/* Section 2 Header */}
                  <div className="px-4 py-3 bg-blue-50 border-x flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Section 2: Math</span>
                  </div>
                  {Array.from({ length: 2 }, (_, i) => {
                    const idx = i + 2
                    const mSel = (selectedQuestions[idx] || []).length
                    const mCfg = moduleConfigs[idx]
                    const isComplete = mSel === parseInt(mCfg.numberOfQuestions)
                    return (
                      <button key={idx} onClick={() => setActiveModuleTab(idx)} className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors ${activeModuleTab === idx ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        M{idx + 1}
                        {isComplete
                          ? <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"><FiCheck className="text-white w-3 h-3" /></span>
                          : <span className="text-xs text-gray-400 font-normal">{mSel}/{mCfg.numberOfQuestions}</span>
                        }
                      </button>
                    )
                  })}
                </nav>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-800">Module {activeModuleTab + 1} Configuration</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${cfg.subject === 'Math' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {cfg.subject}
                  </span>
                </div>

                {/* Number of Questions + Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Number of Questions</label>
                    <div className="w-full p-3 border border-gray-100 bg-gray-50 rounded-lg text-gray-500 font-medium">
                      {cfg.numberOfQuestions} Questions (Fixed)
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time Mode</label>
                    <div className="flex gap-3 h-[46px]">
                      {[true, false].map(timed => (
                        <label key={String(timed)} className={`flex-1 flex items-center justify-center border-2 rounded-lg cursor-pointer transition-all text-sm font-medium ${cfg.isTimed === timed ? (timed ? 'bg-green-50 border-green-500 text-green-700' : 'bg-orange-50 border-orange-500 text-orange-700') : 'border-gray-300'}`}>
                          <input type="radio" checked={cfg.isTimed === timed} onChange={() => updateModuleConfig(activeModuleTab, 'isTimed', timed)} className="hidden" />
                          {timed ? <><FiClock className="mr-1" />Timed</> : 'Untimed'}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {cfg.isTimed && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time Limit (minutes)</label>
                    <input type="number" min="5" max="180" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={cfg.duration || ''} onChange={e => updateModuleConfig(activeModuleTab, 'duration', e.target.value)} placeholder="Enter time limit" />
                  </div>
                )}

                {activeModuleTab === 1 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-amber-800 mb-2">
                      <FiClock className="inline w-4 h-4 mr-1" />
                      Break Time after Section 1 (R&W) → Section 2 (Math) (minutes)
                    </label>
                    <input
                      type="number" min="0" max="60"
                      className="w-full p-3 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none bg-white"
                      value={cfg.breakAfter ?? 0}
                      onChange={e => updateModuleConfig(activeModuleTab, 'breakAfter', parseInt(e.target.value) || 0)}
                      placeholder="0 = no break"
                    />
                    <p className="text-xs text-amber-700 mt-1">Scheduled break after the second Reading & Writing module</p>
                  </div>
                )}

                {/* Select Questions */}
                <div>
                  <button type="button" onClick={() => handleSelectQuestions(activeModuleTab)} className={`w-full p-3 text-white rounded-lg flex items-center justify-center gap-2 font-medium ${cfg.subject === 'Math' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                    Select Questions from {cfg.subject === 'Reading and Writing' ? 'R&W' : cfg.subject} Question Bank
                  </button>
                  {selCount > 0 && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`text-sm font-medium ${selCount === parseInt(cfg.numberOfQuestions) ? 'text-green-600' : 'text-amber-600'}`}>
                        {selCount === parseInt(cfg.numberOfQuestions) ? `✓ ${selCount}/${cfg.numberOfQuestions} questions selected` : `${selCount}/${cfg.numberOfQuestions} questions selected`}
                      </span>
                      <button type="button" onClick={() => { setPreviewModule(activeModuleTab); setPreviewIdx(0); setEditingQId(null); setShowPreview(true) }} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"><FiEye /> Preview</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Module Summary */}
            <div className="mt-4 bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Test Structure Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {Array.from({ length: numberOfModules }, (_, i) => {
                  const mCfg = moduleConfigs[i]
                  const mSel = (selectedQuestions[i] || []).length
                  const isComplete = mSel === parseInt(mCfg.numberOfQuestions)
                  return (
                    <div key={i} onClick={() => setActiveModuleTab(i)} className={`p-3 rounded-lg border cursor-pointer transition-colors ${isComplete ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'} ${activeModuleTab === i ? 'ring-2 ring-blue-400' : ''}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold">Module {i + 1}</span>
                        {isComplete && <FiCheck className="text-green-600 w-4 h-4" />}
                      </div>
                      <div className={`text-xs font-bold ${mCfg.subject === 'Math' ? 'text-blue-600' : 'text-purple-600'}`}>
                        {mCfg.subject === 'Reading and Writing' ? 'R&W' : mCfg.subject}
                      </div>
                      <div className="text-xs text-gray-600">{mSel}/{mCfg.numberOfQuestions} questions • {mCfg.isTimed ? `${mCfg.duration} min` : 'Untimed'}</div>
                      {mCfg.breakAfter > 0 && <div className="text-[10px] text-amber-600 font-bold mt-1">+{mCfg.breakAfter}min Break</div>}
                    </div>
                  )
                })}
              </div>
            </div>

            <button type="button" onClick={handleSubmit} disabled={loading || !isAllComplete()} className="mt-4 w-full p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium text-base">
              <FiSave /> {loading ? 'Creating...' : 'Create Module Test'}
            </button>
          </>
        ) : (
          /* Question Selector */
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Select Questions — Module {selectorModule + 1}</h1>
                <p className={`text-sm font-medium mt-1 ${(selectedQuestions[selectorModule] || []).length === parseInt(moduleConfigs[selectorModule]?.numberOfQuestions || 22) ? 'text-green-600' : 'text-gray-600'}`}>
                  {(selectedQuestions[selectorModule] || []).length} / {moduleConfigs[selectorModule]?.numberOfQuestions} selected
                </p>
              </div>
              <div className="flex items-center gap-3">
                {(selectedQuestions[selectorModule] || []).length === parseInt(moduleConfigs[selectorModule]?.numberOfQuestions) && (
                  <button type="button" onClick={() => setShowSelector(false)} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium">
                    <FiCheck /> Done
                  </button>
                )}
                <button type="button" onClick={() => setShowSelector(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                  <FiArrowLeft /> Back
                </button>
              </div>
            </div>

            {/* Subject locked label */}
            <div className="mb-4 border-b border-gray-200 pb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${moduleConfigs[selectorModule]?.subject === 'Math' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                {moduleConfigs[selectorModule]?.subject === 'Reading and Writing' ? 'Reading & Writing' : moduleConfigs[selectorModule]?.subject} Questions Only
              </span>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {filters.subject === 'Math' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Topic</label>
                      <select value={filters.mathTopic} onChange={e => setFilters(prev => ({ ...prev, mathTopic: e.target.value, mathSubtopic: '' }))} className="w-full border rounded px-2 py-1 text-sm">
                        <option value="">All</option>
                        {Object.entries(mathSubtopics).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
                      </select>
                    </div>
                    {filters.mathTopic && Object.keys(mathSubtopics[filters.mathTopic]?.subtopics || {}).length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Subtopic</label>
                        <select value={filters.mathSubtopic} onChange={e => setFilters(prev => ({ ...prev, mathSubtopic: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm">
                          <option value="">All</option>
                          {Object.entries(mathSubtopics[filters.mathTopic]?.subtopics || {}).map(([k, s]) => <option key={k} value={k}>{s}</option>)}
                        </select>
                      </div>
                    )}
                  </>
                )}
                {filters.subject === 'Reading and Writing' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Topic</label>
                    <select value={filters.rwTopic} onChange={e => setFilters(prev => ({ ...prev, rwTopic: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm">
                      <option value="">All</option>
                      {Object.entries(rwTopics).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Difficulty</label>
                  <select value={filters.difficulty} onChange={e => setFilters(prev => ({ ...prev, difficulty: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm">
                    <option value="">All</option>
                    <option>Easy</option><option>Medium</option><option>Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Remark</label>
                  <input value={filters.remark} onChange={e => setFilters(prev => ({ ...prev, remark: e.target.value }))} placeholder="Search..." className="w-full border rounded px-2 py-1 text-sm" />
                </div>
              </div>
            </div>

            {/* Question Table */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-base font-semibold">Questions</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={questionSearch} onChange={e => setQuestionSearch(e.target.value)} placeholder="Search ID, content, remark..." className="pl-10 pr-4 py-2 border rounded-md text-sm w-64 focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <span className="text-sm text-gray-500">{loadingQMap[selectorModule] ? 'Loading...' : `${filteredQs.length} results`}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left w-10">
                        <input type="checkbox" checked={filteredQs.length > 0 && filteredQs.every(q => (selectedQuestions[selectorModule] || []).includes(q.id || q._id))} onChange={e => {
                          if (e.target.checked) {
                            const maxRemaining = parseInt(moduleConfigs[selectorModule]?.numberOfQuestions || 10) - (selectedQuestions[selectorModule]?.length || 0)
                            const toAdd = filteredQs.filter(q => !(selectedQuestions[selectorModule] || []).includes(q.id || q._id)).slice(0, maxRemaining).map(q => q.id || q._id)
                            setSelectedQuestions(prev => { const n = [...prev]; n[selectorModule] = [...new Set([...(n[selectorModule]||[]), ...toAdd])]; return n })
                          } else {
                            const filteredIds = new Set(filteredQs.map(q => q.id || q._id))
                            setSelectedQuestions(prev => { const n = [...prev]; n[selectorModule] = (n[selectorModule]||[]).filter(id => !filteredIds.has(id)); return n })
                          }
                        }} className="rounded border-gray-300" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredQs.map((q, idx) => {
                      const qId = q.id || q._id
                      const isSelected = (selectedQuestions[selectorModule] || []).includes(qId)
                      const tags = typeof q.tags === 'string' ? JSON.parse(q.tags) : (Array.isArray(q.tags) ? q.tags : [])
                      return (
                        <tr key={qId} className={`hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`} onClick={() => toggleQuestion(qId)}>
                          <td className="px-4 py-3"><input type="checkbox" checked={isSelected} onChange={() => {}} className="rounded border-gray-300" /></td>
                          <td className="px-4 py-3 text-sm font-mono text-gray-900">{q.questionId || `Q-${idx + 1}`}</td>
                          <td className="px-4 py-3 text-sm"><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${q.difficulty === 'Easy' ? 'bg-green-100 text-green-800' : q.difficulty === 'Hard' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{q.difficulty}</span></td>
                          <td className="px-4 py-3 text-sm text-gray-700">{q.type || 'MCQ'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{tags.join(', ') || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{q.remark || <span className="text-gray-400 italic">-</span>}</td>
                        </tr>
                      )
                    })}
                    {filteredQs.length === 0 && !loadingQMap[selectorModule] && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">No questions found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full h-[90vh] flex flex-col">
              <div className="p-5 border-b flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-bold">Module {previewModule + 1} — Preview & Edit</h2>
                  <span className="text-sm text-gray-600">{previewIdx + 1} / {getPreviewQuestions(previewModule).length}</span>
                </div>
                <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600"><FiX className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {(() => {
                  const qs = getPreviewQuestions(previewModule)
                  const q = qs[previewIdx]
                  if (!q) return <div className="text-center text-gray-500 py-8">No questions selected for this module.</div>
                  const qId = q.id || q._id
                  const isEditing = editingQId === qId
                  let options = null
                  try {
                    const _raw = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
                    if (Array.isArray(_raw)) options = { A: _raw[0]||'', B: _raw[1]||'', C: _raw[2]||'', D: _raw[3]||'' }
                    else if (_raw && typeof _raw === 'object') options = _raw
                  } catch(e) {}

                  return (
                    <div className="max-w-3xl mx-auto">
                      <div className="border rounded-lg p-5 bg-gray-50">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-gray-900">Q{previewIdx + 1}</span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${q.difficulty === 'Easy' ? 'bg-green-100 text-green-800' : q.difficulty === 'Hard' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{q.difficulty}</span>
                            <span className="px-2 py-0.5 text-xs font-mono bg-gray-100 text-gray-700 rounded border">{q.questionId || (qId || '').toString().slice(-8)}</span>
                          </div>
                          <button onClick={() => isEditing ? setEditingQId(null) : setEditingQId(qId)} className={`px-3 py-1.5 ${isEditing ? 'bg-green-600' : 'bg-blue-600'} text-white rounded-lg text-sm flex items-center gap-1`}>
                            <FiSave className="w-3.5 h-3.5" /> {isEditing ? 'Done' : 'Edit'}
                          </button>
                        </div>

                        <div className="mb-3">
                          {isEditing
                            ? <textarea value={q.content || q.question || ''} onChange={e => handleQFieldChange(qId, 'content', e.target.value)} className="w-full p-3 border rounded-lg font-mono text-sm" rows={4} />
                            : <div className="bg-white p-3 rounded-lg border text-gray-900">{renderWithImages(q.content || q.question)}</div>}
                        </div>

                        {options && ['A','B','C','D'].filter(k => options[k]).length > 0 ? (
                          <>
                            <div className="space-y-2 mb-3">
                              {['A','B','C','D'].map(letter => {
                                const optText = options[letter] || ''; if (!optText) return null
                                return (
                                  <div key={letter} className={`p-2.5 border-2 rounded-lg flex gap-2 ${q.correctAnswer === letter ? 'bg-green-50 border-green-500' : 'bg-white border-gray-200'}`}>
                                    <span className={`font-bold text-sm flex-shrink-0 ${q.correctAnswer === letter ? 'text-green-700' : 'text-gray-600'}`}>{letter}.</span>
                                    {isEditing
                                      ? <textarea value={optText} onChange={e => handleOptionChange(qId, letter, e.target.value)} className="flex-1 p-1 border rounded font-mono text-sm" rows={2} />
                                      : <div className="flex-1 text-sm">{renderWithImages(optText)}</div>}
                                  </div>
                                )
                              })}
                            </div>
                            <div className="mb-3">
                              {isEditing
                                ? <select value={q.correctAnswer} onChange={e => handleQFieldChange(qId, 'correctAnswer', e.target.value)} className="w-full p-2 border rounded-lg text-sm">
                                    {['A','B','C','D'].map(l => <option key={l}>{l}</option>)}
                                  </select>
                                : <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 font-medium">Correct: {q.correctAnswer}</div>}
                            </div>
                          </>
                        ) : (
                          <div className="mb-3">
                            {isEditing
                              ? <input type="text" value={q.correctAnswer || ''} onChange={e => handleQFieldChange(qId, 'correctAnswer', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" placeholder="Correct answer..." />
                              : <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 font-medium">Correct: {q.correctAnswer}</div>}
                          </div>
                        )}

                        {['shortExplanation','longExplanation'].map(field => (
                          <div key={field} className="mb-3">
                            <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">{field === 'shortExplanation' ? 'Short Explanation' : 'Long Explanation'}</label>
                            {isEditing
                              ? <textarea value={q[field] || ''} onChange={e => handleQFieldChange(qId, field, e.target.value)} className={`w-full p-2 border rounded-lg font-mono text-sm ${field === 'longExplanation' ? '' : ''}`} rows={field === 'shortExplanation' ? 2 : 4} placeholder={`Add ${field === 'shortExplanation' ? 'short' : 'long'} explanation...`} />
                              : <div className={`p-3 rounded-lg border min-h-[36px] text-sm ${field === 'shortExplanation' ? 'bg-blue-50 border-blue-100' : 'bg-indigo-50 border-indigo-100'}`}>
                                  {q[field] ? renderWithImages(q[field]) : <span className="text-gray-400 italic">None</span>}
                                </div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
              <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                <button onClick={() => { setPreviewIdx(p => Math.max(0, p-1)); setEditingQId(null) }} disabled={previewIdx === 0} className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2 text-sm font-medium">
                  <FiArrowLeft /> Previous
                </button>
                <div className="text-sm text-gray-600">{previewIdx + 1} / {getPreviewQuestions(previewModule).length}</div>
                <button onClick={() => { setPreviewIdx(p => Math.min(getPreviewQuestions(previewModule).length-1, p+1)); setEditingQId(null) }} disabled={previewIdx >= getPreviewQuestions(previewModule).length - 1} className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2 text-sm font-medium">
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
