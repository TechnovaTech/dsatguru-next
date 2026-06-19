'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { FiSettings, FiUsers, FiSave, FiTrash2, FiEdit2, FiSearch, FiX, FiEye, FiPlus } from 'react-icons/fi'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token') || localStorage.getItem('authToken')
}

const SOURCE_OPTIONS = [
  { id: 'admin', label: 'Admin Question Bank', desc: 'Direct-upload admin bank' },
  { id: 'admintest', label: 'Admin Test Bank', desc: 'Questions uploaded for admin tests' },
  { id: 'tutor', label: 'Tutor Bank', desc: 'Tutor-owned questions' }
]

// Auto-resolve bankId from source + module — no bank dropdown needed
function getBankId(source, module) {
  const suffix = module === 'math' ? 'math' : 'rw'
  if (source === 'admin') return `admin-${suffix}`
  if (source === 'admintest') return `admintest-${suffix}`
  if (source === 'tutor') return `tutor-${suffix}`
  return `admin-${suffix}`
}

function resolveBankIdFromConfig(savedBankId) {
  if (!savedBankId) return { source: 'admin' }
  if (savedBankId === 'admin-math' || savedBankId === 'admin-rw') return { source: 'admin' }
  if (savedBankId === 'admintest-math' || savedBankId === 'admintest-rw') return { source: 'admintest' }
  if (savedBankId === 'tutor-math' || savedBankId === 'tutor-rw') return { source: 'tutor' }
  return { source: 'admin' }
}

const mathSubtopics = {
  'algebra': { label: 'Algebra', subtopics: { 'expression': 'Expression', 'linear-equations': 'Linear Equations', 'linear-system-equations': 'Linear System of Equations', 'linear-functions': 'Linear Functions', 'linear-inequalities': 'Linear Inequalities' } },
  'advance-math': { label: 'Advance Math', subtopics: { 'polynomials': 'Polynomials', 'exponents-radicals': 'Exponents & Radicals', 'functions-notation': 'Functions & Function Notations', 'exponential-functions': 'Exponential Functions', 'quadratics': 'Quadratics' } },
  'word-problem-data-analysis': { label: 'Word Problem and Data Analysis', subtopics: {} },
  'geometry': { label: 'Geometry', subtopics: {} }
}
const readingWritingTopics = { 'craft-structure': 'Craft and Structure', 'information-ideas': 'Information and Ideas', 'standard-english-conventions': 'Standard English Conventions', 'expression-ideas': 'Expression of Ideas' }

export default function AdminDemoTestPage() {
  const [activeTab, setActiveTab] = useState('config')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [demoTest, setDemoTest] = useState(null)

  // Source selection per module
  const [mathSource, setMathSource] = useState('admin')
  const [rwSource, setRwSource] = useState('admin')

  // Questions in current selected bank (fetched on source change)
  const [mathBankQuestions, setMathBankQuestions] = useState([])
  const [rwBankQuestions, setRwBankQuestions] = useState([])
  const [mathQuestionsLoading, setMathQuestionsLoading] = useState(false)
  const [rwQuestionsLoading, setRwQuestionsLoading] = useState(false)

  // Picker filters per module
  const [mathFilters, setMathFilters] = useState({ difficulty: '', mathTopic: '', mathSubtopic: '', tag: '', remark: '' })
  const [rwFilters, setRwFilters] = useState({ difficulty: '', readingWritingTopic: '', tag: '', remark: '' })
  const [mathSearch, setMathSearch] = useState('')
  const [rwSearch, setRwSearch] = useState('')

  const [pickerOpen, setPickerOpen] = useState(null) // 'math' | 'rw' | null
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerFilters, setPickerFilters] = useState({ difficulty: '', mathTopic: '', mathSubtopic: '', readingWritingTopic: '', tag: '', remark: '' })

  const [editingQuestion, setEditingQuestion] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [attemptsLoading, setAttemptsLoading] = useState(false)
  const [attemptDetail, setAttemptDetail] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    loadDemoTest()
  }, [])

  useEffect(() => {
    if (activeTab === 'attempts') loadAttempts()
  }, [activeTab])

  // Auto-fetch questions when source changes for math
  useEffect(() => {
    loadBankQuestions(getBankId(mathSource, 'math'), 'math')
  }, [mathSource])

  // Auto-fetch questions when source changes for rw
  useEffect(() => {
    loadBankQuestions(getBankId(rwSource, 'rw'), 'rw')
  }, [rwSource])

  const loadDemoTest = async () => {
    try {
      setLoading(true)
      const token = getToken()
      const res = await axios.get('/api/admin/demo-test', { headers: { Authorization: `Bearer ${token}` } })
      setDemoTest(res.data.data)
      const mathResolved = resolveBankIdFromConfig(res.data.data.mathBankId)
      const rwResolved = resolveBankIdFromConfig(res.data.data.rwBankId)
      setMathSource(mathResolved.source)
      setRwSource(rwResolved.source)
    } catch (e) {
      showToast('Failed to load demo test', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadBankQuestions = async (bankId, module) => {
    const setLoadingFn = module === 'math' ? setMathQuestionsLoading : setRwQuestionsLoading
    const setQsFn = module === 'math' ? setMathBankQuestions : setRwBankQuestions
    try {
      setLoadingFn(true)
      const subject = module === 'math' ? 'Math' : 'Reading and Writing'
      const isTutor = bankId.startsWith('tutor')
      const isAdminTest = bankId.startsWith('admintest')
      let url = `/api/questions?subject=${encodeURIComponent(subject)}&isActive=true`
      if (isTutor) url += '&isTutor=true'
      else if (isAdminTest) url += '&isAdminTest=true'
      else url += `&bankId=${bankId}`
      const res = await axios.get(url)
      const arr = Array.isArray(res.data) ? res.data : (res.data.data || res.data.questions || [])
      setQsFn(arr)
    } catch (e) {
      setQsFn([])
    } finally {
      setLoadingFn(false)
    }
  }

  const loadAttempts = async () => {
    try {
      setAttemptsLoading(true)
      const token = getToken()
      const res = await axios.get('/api/admin/demo-test/attempts?page=1&limit=200', { headers: { Authorization: `Bearer ${token}` } })
      setAttempts(res.data.data || [])
    } catch (e) {
      showToast('Failed to load attempts', 'error')
    } finally {
      setAttemptsLoading(false)
    }
  }

  const viewAttempt = async (id) => {
    try {
      const token = getToken()
      const res = await axios.get(`/api/admin/demo-test/attempts/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      setAttemptDetail(res.data.data)
    } catch (e) {
      showToast('Failed to load attempt', 'error')
    }
  }

  const save = async () => {
    try {
      setSaving(true)
      const token = getToken()
      const payload = {
        title: demoTest.title,
        description: demoTest.description,
        instructions: demoTest.instructions,
        mathQuestionCount: demoTest.mathQuestionCount,
        rwQuestionCount: demoTest.rwQuestionCount,
        mathDuration: demoTest.mathDuration,
        rwDuration: demoTest.rwDuration,
        mathBankId: getBankId(mathSource, 'math'),
        rwBankId: getBankId(rwSource, 'rw'),
        mathQuestionIds: (demoTest.mathQuestions || []).map(q => q.id || q._id),
        rwQuestionIds: (demoTest.rwQuestions || []).map(q => q.id || q._id),
        customQuestions: demoTest.customQuestions || {},
        isActive: demoTest.isActive
      }
      await axios.put('/api/admin/demo-test', payload, { headers: { Authorization: `Bearer ${token}` } })
      showToast('Saved successfully')
      await loadDemoTest()
    } catch (e) {
      showToast('Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const openPicker = (module) => {
    setPickerOpen(module)
    if (module === 'math') { setMathSearch(''); setMathFilters({ difficulty: '', mathTopic: '', mathSubtopic: '', tag: '', remark: '' }) }
    else { setRwSearch(''); setRwFilters({ difficulty: '', readingWritingTopic: '', tag: '', remark: '' }) }
  }

  const toggleQuestion = (qid, module) => {
    const key = module === 'math' ? 'mathQuestions' : 'rwQuestions'
    const list = demoTest[key] || []
    const existingIds = new Set(list.map(x => String(x.id || x._id)))
    if (existingIds.has(String(qid))) {
      setDemoTest({ ...demoTest, [key]: list.filter(x => String(x.id || x._id) !== String(qid)) })
    } else {
      const source = module === 'math' ? mathBankQuestions : rwBankQuestions
      const q = source.find(x => String(x.id || x._id) === String(qid))
      if (q) setDemoTest({ ...demoTest, [key]: [...list, q] })
    }
  }

  const removeQuestion = (qid, module) => {
    const list = module === 'math' ? (demoTest.mathQuestions || []) : (demoTest.rwQuestions || [])
    const newList = list.filter(x => String(x.id || x._id) !== String(qid))
    setDemoTest({ ...demoTest, [module === 'math' ? 'mathQuestions' : 'rwQuestions']: newList })
  }

  const openEdit = (q, module) => {
    const id = String(q.id || q._id)
    const custom = (demoTest.customQuestions || {})[id] || {}
    setEditingQuestion({
      id,
      module,
      original: q,
      data: {
        content: custom.content ?? q.content ?? '',
        questionParagraph: custom.questionParagraph ?? q.questionParagraph ?? '',
        options: custom.options ?? (Array.isArray(q.options) ? [...q.options] : ['', '', '', '']),
        correctAnswer: custom.correctAnswer ?? q.correctAnswer ?? 'A',
        explanation: custom.explanation ?? q.explanation ?? ''
      }
    })
  }

  const saveEdit = () => {
    const newCustom = { ...(demoTest.customQuestions || {}) }
    newCustom[editingQuestion.id] = editingQuestion.data
    setDemoTest({ ...demoTest, customQuestions: newCustom })
    setEditingQuestion(null)
    showToast('Edit staged — click Save to persist')
  }

  const resetEdit = () => {
    const newCustom = { ...(demoTest.customQuestions || {}) }
    delete newCustom[editingQuestion.id]
    setDemoTest({ ...demoTest, customQuestions: newCustom })
    setEditingQuestion(null)
    showToast('Reset to original')
  }

  const getFilteredQuestions = (module) => {
    const source = module === 'math' ? mathBankQuestions : rwBankQuestions
    const filters = module === 'math' ? mathFilters : rwFilters
    const search = module === 'math' ? mathSearch : rwSearch
    return (source || []).filter(q => {
      if (filters.difficulty && q.difficulty !== filters.difficulty) return false
      if (filters.remark && filters.remark.trim()) {
        if (!(q.remark || '').toLowerCase().includes(filters.remark.toLowerCase().trim())) return false
      }
      if (filters.tag) {
        const tags = typeof q.tags === 'string' ? JSON.parse(q.tags || '[]') : (q.tags || [])
        if (!tags.some(t => t.toLowerCase().includes(filters.tag.toLowerCase()))) return false
      }
      if (module === 'math') {
        const tags = typeof q.tags === 'string' ? JSON.parse(q.tags || '[]') : (q.tags || [])
        if (filters.mathTopic && !tags.includes(filters.mathTopic)) return false
        if (filters.mathSubtopic && !tags.includes(filters.mathSubtopic)) return false
      } else {
        const tags = typeof q.tags === 'string' ? JSON.parse(q.tags || '[]') : (q.tags || [])
        if (filters.readingWritingTopic && !tags.includes(filters.readingWritingTopic)) return false
      }
      if (search.trim()) {
        const s = search.toLowerCase().trim()
        return (q.questionId || '').toLowerCase().includes(s) ||
               (q.content || '').toLowerCase().includes(s) ||
               (q.remark || '').toLowerCase().includes(s) ||
               (q.questionId ? q.questionId.split('-').pop() : '') === s.replace('#', '')
      }
      return true
    })
  }

  if (loading) {
    return <div className="p-8 text-gray-500">Loading demo test...</div>
  }
  if (!demoTest) return null

  const renderModuleConfig = (module) => {
    const isMath = module === 'math'
    const label = isMath ? 'Math (Module 1)' : 'Reading & Writing (Module 2)'
    const selected = (isMath ? demoTest.mathQuestions : demoTest.rwQuestions) || []
    const targetCount = isMath ? demoTest.mathQuestionCount : demoTest.rwQuestionCount

    return (
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{label}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {selected.length} question{selected.length !== 1 ? 's' : ''} selected
              {targetCount ? ` (target: ${targetCount})` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${selected.length === targetCount ? 'bg-green-100 text-green-700' : selected.length > targetCount ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
              {selected.length} / {targetCount || 0}
            </span>
            <button
              onClick={() => openPicker(module)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <FiPlus size={14} /> Pick Questions
            </button>
            {selected.length > 0 && (
              <button
                onClick={() => setDemoTest({ ...demoTest, [isMath ? 'mathQuestions' : 'rwQuestions']: [] })}
                className="text-xs text-red-600 hover:text-red-800 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-50"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Selected questions summary */}
        {selected.length > 0 && (
          <div className="border-t">
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Question ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Content</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selected.map((q, i) => {
                    const qid = String(q.id || q._id)
                    return (
                      <tr key={qid} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-2 font-mono text-xs text-gray-600 whitespace-nowrap">{q.questionId || qid.slice(-6)}</td>
                        <td className="px-4 py-2 max-w-xs">
                          <div className="text-sm text-gray-800 line-clamp-1">{q.content || q.title || '(no content)'}</div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${q.difficulty === 'Easy' ? 'bg-green-100 text-green-700' : q.difficulty === 'Hard' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{q.difficulty || 'Medium'}</span>
                        </td>
                        <td className="px-4 py-2">
                          <button onClick={() => toggleQuestion(qid, module)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded">
                            <FiX size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-[200] px-4 py-3 rounded-lg shadow-lg ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'} text-white`}>
          {toast.msg}
        </div>
      )}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Demo Test</h1>
        <p className="text-sm text-gray-500">Manage the single public free demo test and view attempts.</p>
      </div>

      <div className="flex gap-2 border-b mb-6">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition ${activeTab === 'config' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <FiSettings /> Test Configuration
        </button>
        <button
          onClick={() => setActiveTab('attempts')}
          className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition ${activeTab === 'attempts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <FiUsers /> User Attempts
        </button>
      </div>

      {activeTab === 'config' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Basic Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Title</label>
                <input type="text" value={demoTest.title || ''} onChange={e => setDemoTest({ ...demoTest, title: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1" />
              </div>
              <div className="flex items-center gap-3 mt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!demoTest.isActive} onChange={e => setDemoTest({ ...demoTest, isActive: e.target.checked })} />
                  <span className="text-sm">Live on frontend</span>
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea rows={2} value={demoTest.description || ''} onChange={e => setDemoTest({ ...demoTest, description: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Instructions (shown on rules page)</label>
                <textarea rows={3} value={demoTest.instructions || ''} onChange={e => setDemoTest({ ...demoTest, instructions: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Math Duration (min)</label>
                <input type="number" min={1} value={demoTest.mathDuration || 20} onChange={e => setDemoTest({ ...demoTest, mathDuration: Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">RW Duration (min)</label>
                <input type="number" min={1} value={demoTest.rwDuration || 20} onChange={e => setDemoTest({ ...demoTest, rwDuration: Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Target # of Math Questions</label>
                <input type="number" min={0} value={demoTest.mathQuestionCount || 0} onChange={e => setDemoTest({ ...demoTest, mathQuestionCount: Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Target # of RW Questions</label>
                <input type="number" min={0} value={demoTest.rwQuestionCount || 0} onChange={e => setDemoTest({ ...demoTest, rwQuestionCount: Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 mt-1" />
              </div>
            </div>
          </div>

          {renderModuleConfig('math')}
          {renderModuleConfig('rw')}

          <div className="sticky bottom-4 flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl shadow-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              <FiSave /> {saving ? 'Saving...' : 'Save Demo Test'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'attempts' && (
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">User Attempts ({attempts.length})</h2>
            <div className="text-sm text-gray-500">
              {(demoTest.mathQuestions || []).length} Math + {(demoTest.rwQuestions || []).length} RW questions
            </div>
          </div>
          {attemptsLoading ? (
            <div className="p-6 text-gray-500">Loading...</div>
          ) : attempts.length === 0 ? (
            <div className="p-6 text-gray-500 text-center">No attempts yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-left">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Math</th>
                    <th className="px-4 py-3">RW</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Correct</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map(a => (
                    <tr key={a.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{a.name}</td>
                      <td className="px-4 py-3">{a.email}</td>
                      <td className="px-4 py-3 text-gray-600">{a.phone || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3">{a.mathScore || '-'}</td>
                      <td className="px-4 py-3">{a.rwScore || '-'}</td>
                      <td className="px-4 py-3 font-semibold">{a.totalScore || '-'}</td>
                      <td className="px-4 py-3 text-gray-500">{(a.mathCorrect || 0) + (a.rwCorrect || 0)}/{(a.mathTotal || 0) + (a.rwTotal || 0)}</td>
                      <td className="px-4 py-3 text-gray-500">{Math.floor((a.timeSpent || 0) / 60)}m</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${a.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{a.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => viewAttempt(a.id)} className="text-blue-600 hover:text-blue-800"><FiEye /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}


      {/* Question Picker Modal */}
      {pickerOpen && (() => {
        const isMath = pickerOpen === 'math'
        const source = isMath ? mathSource : rwSource
        const setSource = isMath ? setMathSource : setRwSource
        const questionsLoading = isMath ? mathQuestionsLoading : rwQuestionsLoading
        const allQs = isMath ? mathBankQuestions : rwBankQuestions
        const filteredQs = getFilteredQuestions(pickerOpen)
        const filters = isMath ? mathFilters : rwFilters
        const setFilters = isMath ? setMathFilters : setRwFilters
        const search = isMath ? mathSearch : rwSearch
        const setSearch = isMath ? setMathSearch : setRwSearch
        const selected = (isMath ? demoTest.mathQuestions : demoTest.rwQuestions) || []
        const selectedIds = new Set(selected.map(x => String(x.id || x._id)))
        const label = isMath ? 'Math (Module 1)' : 'Reading & Writing (Module 2)'

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
              {/* Modal header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Pick Questions — {label}</h3>
                  <p className="text-sm text-gray-500">{selectedIds.size} selected</p>
                </div>
                <button onClick={() => setPickerOpen(null)} className="p-2 hover:bg-gray-100 rounded text-gray-500"><FiX /></button>
              </div>

              {/* Source picker */}
              <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-3 flex-wrap">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Source:</span>
                {SOURCE_OPTIONS.map(opt => (
                  <label key={opt.id} className={`flex items-center gap-1.5 border rounded-lg px-3 py-1.5 cursor-pointer transition text-sm ${source === opt.id ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                    <input type="radio" name={`picker-source-${pickerOpen}`} checked={source === opt.id} onChange={() => setSource(opt.id)} className="hidden" />
                    {opt.label}
                  </label>
                ))}
                <span className="text-xs text-gray-400 ml-auto">{questionsLoading ? 'Loading...' : `${allQs.length} questions available`}</span>
              </div>

              {/* Filters */}
              <div className="px-4 py-3 border-b">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <div className="relative md:col-span-2">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by ID, content, remark..." className="w-full border rounded px-2 py-1.5 pl-8 text-sm" />
                  </div>
                  <select value={filters.difficulty} onChange={e => setFilters({ ...filters, difficulty: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm">
                    <option value="">All Difficulty</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                  {isMath ? (
                    <>
                      <select value={filters.mathTopic} onChange={e => setFilters({ ...filters, mathTopic: e.target.value, mathSubtopic: '' })} className="w-full border rounded px-2 py-1.5 text-sm">
                        <option value="">All Topics</option>
                        {Object.entries(mathSubtopics).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                      <select value={filters.mathSubtopic} onChange={e => setFilters({ ...filters, mathSubtopic: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" disabled={!filters.mathTopic}>
                        <option value="">All Subtopics</option>
                        {filters.mathTopic && Object.entries(mathSubtopics[filters.mathTopic]?.subtopics || {}).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </>
                  ) : (
                    <select value={filters.readingWritingTopic} onChange={e => setFilters({ ...filters, readingWritingTopic: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm">
                      <option value="">All Topics</option>
                      {Object.entries(readingWritingTopics).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  )}
                </div>
              </div>

              {/* Question table */}
              <div className="flex-1 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10">✓</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Content</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {questionsLoading ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading questions...</td></tr>
                    ) : filteredQs.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No questions found.</td></tr>
                    ) : filteredQs.map(q => {
                      const qid = String(q.id || q._id)
                      const isSelected = selectedIds.has(qid)
                      const parsedTags = typeof q.tags === 'string' ? JSON.parse(q.tags || '[]') : (q.tags || [])
                      return (
                        <tr key={qid} className={`hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`} onClick={() => toggleQuestion(qid, pickerOpen)}>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleQuestion(qid, pickerOpen)} className="rounded border-gray-300" />
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">{q.questionId || qid.slice(-6)}</td>
                          <td className="px-4 py-3 max-w-xs">
                            <div className="text-sm text-gray-800 line-clamp-2">{q.content || q.title || '(no content)'}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${q.difficulty === 'Easy' ? 'bg-green-100 text-green-700' : q.difficulty === 'Hard' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{q.difficulty || 'Medium'}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px] truncate">{parsedTags.join(', ') || '-'}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px] truncate" title={q.remark || ''}>{q.remark || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="p-4 border-t flex items-center justify-between bg-gray-50">
                <span className="text-sm text-gray-600">{selectedIds.size} question{selectedIds.size !== 1 ? 's' : ''} selected</span>
                <button onClick={() => setPickerOpen(null)} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
                  Done
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Edit question modal */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Edit question (demo test only)</h3>
              <button onClick={() => setEditingQuestion(null)} className="p-1 hover:bg-gray-100 rounded"><FiX /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Passage / Paragraph (optional)</label>
                <textarea rows={3} value={editingQuestion.data.questionParagraph} onChange={e => setEditingQuestion({ ...editingQuestion, data: { ...editingQuestion.data, questionParagraph: e.target.value } })} className="w-full border rounded-lg px-3 py-2 mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Question</label>
                <textarea rows={3} value={editingQuestion.data.content} onChange={e => setEditingQuestion({ ...editingQuestion, data: { ...editingQuestion.data, content: e.target.value } })} className="w-full border rounded-lg px-3 py-2 mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {['A', 'B', 'C', 'D'].map((letter, i) => (
                  <div key={letter}>
                    <label className="text-sm font-medium text-gray-700">Option {letter}</label>
                    <input type="text" value={editingQuestion.data.options[i] || ''} onChange={e => {
                      const newOpts = [...editingQuestion.data.options]
                      newOpts[i] = e.target.value
                      setEditingQuestion({ ...editingQuestion, data: { ...editingQuestion.data, options: newOpts } })
                    }} className="w-full border rounded-lg px-3 py-2 mt-1" />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Correct Answer</label>
                <select value={editingQuestion.data.correctAnswer} onChange={e => setEditingQuestion({ ...editingQuestion, data: { ...editingQuestion.data, correctAnswer: e.target.value } })} className="w-full border rounded-lg px-3 py-2 mt-1">
                  {['A', 'B', 'C', 'D'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Explanation</label>
                <textarea rows={3} value={editingQuestion.data.explanation} onChange={e => setEditingQuestion({ ...editingQuestion, data: { ...editingQuestion.data, explanation: e.target.value } })} className="w-full border rounded-lg px-3 py-2 mt-1" />
              </div>
            </div>
            <div className="p-4 border-t flex justify-between">
              <button onClick={resetEdit} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg">Reset to original</button>
              <div className="flex gap-2">
                <button onClick={() => setEditingQuestion(null)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button onClick={saveEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Stage Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attempt detail modal */}
      {attemptDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold">{attemptDetail.name}</h3>
                <p className="text-sm text-gray-500">{attemptDetail.email}</p>
                {attemptDetail.phone && <p className="text-sm text-gray-500">{attemptDetail.phone}</p>}
              </div>
              <button onClick={() => setAttemptDetail(null)} className="p-1 hover:bg-gray-100 rounded"><FiX /></button>
            </div>
            <div className="p-4 border-b grid grid-cols-3 gap-4 text-center">
              <div><div className="text-xs text-gray-500">Math</div><div className="text-2xl font-bold text-blue-600">{attemptDetail.mathScore}</div><div className="text-xs">{attemptDetail.mathCorrect}/{attemptDetail.mathTotal} correct</div></div>
              <div><div className="text-xs text-gray-500">RW</div><div className="text-2xl font-bold text-purple-600">{attemptDetail.rwScore}</div><div className="text-xs">{attemptDetail.rwCorrect}/{attemptDetail.rwTotal} correct</div></div>
              <div><div className="text-xs text-gray-500">Total</div><div className="text-2xl font-bold text-green-600">{attemptDetail.totalScore}</div><div className="text-xs">{Math.floor((attemptDetail.timeSpent || 0) / 60)}m total</div></div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(attemptDetail.responses || []).map((r, i) => (
                <div key={i} className={`border rounded-lg p-3 ${r.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-1">Q{i + 1} · {r.module === 'math' ? 'Math' : 'RW'}</div>
                      <div className="text-sm text-gray-800 line-clamp-2">{r.question?.content || '(question deleted)'}</div>
                      <div className="text-xs mt-2 flex gap-3">
                        <span>Answered: <b>{r.selectedAnswer || '-'}</b></span>
                        <span>Correct: <b>{r.correctAnswer}</b></span>
                        <span>{r.timeSpent}s</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${r.isCorrect ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                      {r.isCorrect ? 'Correct' : 'Wrong'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
