'use client'
import { renderContent as renderWithImages } from '../../../components/admin/LatexRenderer'
import { useState, useEffect } from 'react'
import { FiSearch, FiEye, FiTrash, FiClock, FiX, FiArrowLeft, FiSave, FiEdit, FiUserPlus, FiUsers } from 'react-icons/fi'

export default function ModuleTestSheets() {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState('all')

  // View/Edit modal
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingTest, setViewingTest] = useState(null)
  const [currentModuleTab, setCurrentModuleTab] = useState(0)
  const [moduleQuestionsMap, setModuleQuestionsMap] = useState({}) // {moduleIdx: questions[]}
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState(null)
  const [editedQuestionsData, setEditedQuestionsData] = useState({})
  const [savingTest, setSavingTest] = useState(false)

  // Assign to student modal
  const [showAssignToStudentModal, setShowAssignToStudentModal] = useState(false)
  const [assignToStudentTest, setAssignToStudentTest] = useState(null)
  const [allStudents, setAllStudents] = useState([])
  const [loadingAllStudents, setLoadingAllStudents] = useState(false)
  const [studentAssignedTests, setStudentAssignedTests] = useState({})
  const [studentSearch, setStudentSearch] = useState('')
  const [assignShowExplanation, setAssignShowExplanation] = useState(false)

  // Assign to tutor modal
  const [showAssignToTutorModal, setShowAssignToTutorModal] = useState(false)
  const [assignToTutorTest, setAssignToTutorTest] = useState(null)
  const [allTutors, setAllTutors] = useState([])
  const [loadingAllTutors, setLoadingAllTutors] = useState(false)
  const [tutorSearch, setTutorSearch] = useState('')
  const [assignedTutorsMap, setAssignedTutorsMap] = useState({}) // testId -> tutorIds[]

  useEffect(() => { fetchTests() }, [])

  const fetchTests = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/tutor/module-tests/list', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setTests(data)
        // Initialize assignedTutorsMap
        const map = {}
        data.forEach(t => { map[t._id] = (t.assignedTutors || []).map(id => id.toString()) })
        setAssignedTutorsMap(map)
      }
      else setError('Failed to load tests')
    } catch { setError('Failed to load tests') } finally { setLoading(false) }
  }

  const handleOpenAssignToTutorModal = async (test) => {
    setAssignToTutorTest(test)
    setShowAssignToTutorModal(true)
    setLoadingAllTutors(true)
    setTutorSearch('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/users?role=Tutor', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setAllTutors(await res.json())
    } finally { setLoadingAllTutors(false) }
  }

  const handleToggleTutorAssignment = async (tutorId, testId) => {
    const token = localStorage.getItem('token')
    const currentAssigned = assignedTutorsMap[testId] || []
    const isAssigned = currentAssigned.includes(tutorId.toString())
    
    try {
      const res = await fetch('/api/admin/tutor/module-tests/assign-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tutorId, testId, action: isAssigned ? 'remove' : 'add' })
      })
      if (res.ok) {
        const data = await res.json()
        setAssignedTutorsMap(prev => ({ ...prev, [testId]: data.assignedTutors.map(id => id.toString()) }))
        setSuccess(isAssigned ? 'Tutor access removed' : 'Tutor access granted')
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch { setError('Failed to update tutor assignment'); setTimeout(() => setError(''), 3000) }
  }

  const handleOpenAssignToStudentModal = async (test) => {
    setAssignToStudentTest(test)
    setShowAssignToStudentModal(true)
    setLoadingAllStudents(true)
    setStudentSearch('')
    setAssignShowExplanation(false)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/users?role=Student', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const students = await res.json()
        setAllStudents(students)
        const map = {}
        await Promise.all(students.map(async s => {
          try {
            const r = await fetch(`/api/admin/students/${s._id}/assigned-tests`, { headers: { Authorization: `Bearer ${token}` } })
            if (r.ok) { const d = await r.json(); map[s._id] = d.assignedTests || [] }
          } catch {}
        }))
        setStudentAssignedTests(map)
      }
    } finally { setLoadingAllStudents(false) }
  }

  const handleToggleTestForStudent = async (studentId, testId) => {
    const token = localStorage.getItem('token')
    const isAssigned = (studentAssignedTests[studentId] || []).map(id => id.toString()).includes(testId)
    try {
      const res = await fetch('/api/admin/students/assign-test', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ studentId, testId, action: isAssigned ? 'remove' : 'add', showExplanation: assignShowExplanation })
      })
      if (res.ok) {
        const data = await res.json()
        setStudentAssignedTests(prev => ({ ...prev, [studentId]: data.assignedTests }))
        setSuccess(isAssigned ? 'Test unassigned' : 'Test assigned')
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch { setError('Failed to update assignment'); setTimeout(() => setError(''), 3000) }
  }

  const handleDeleteTest = async (testId) => {
    if (!confirm('Delete this test?')) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/admin/tutor/module-tests/list?id=${testId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { setSuccess('Test deleted'); fetchTests(); setTimeout(() => setSuccess(''), 3000) }
      else setError('Failed to delete test')
    } catch { setError('Failed to delete test') }
  }

  const loadTestQuestions = async (test, editMode) => {
    setViewingTest(test)
    setCurrentModuleTab(0)
    setCurrentQuestionIndex(0)
    setShowViewModal(true)
    setLoadingQuestions(true)
    setIsEditMode(editMode)
    setEditingQuestionId(null)
    setEditedQuestionsData(test.customQuestions || {})

    try {
      const token = localStorage.getItem('token')
      const modules = test.modules && test.modules.length > 0 ? test.modules : [{ questions: test.questions || [], subject: test.subject }]
      const allIds = modules.flatMap(m => m.questions || [])
      const res = await fetch(`/api/questions?ids=${allIds.join(',')}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const allQuestions = await res.json()
      const qById = {}
      allQuestions.forEach(q => { qById[(q.id || q._id).toString()] = q })

      const customMap = test.customQuestions || {}
      const map = {}
      modules.forEach((m, idx) => {
        map[idx] = (m.questions || []).map(qId => {
          const q = qById[qId.toString()] || {}
          const qKey = (q.id || q._id || '').toString()
          return customMap[qKey] ? { ...q, ...customMap[qKey] } : q
        }).filter(q => q._id || q.id)
      })
      setModuleQuestionsMap(map)
    } catch (err) { console.error(err) } finally { setLoadingQuestions(false) }
  }

  const handleSaveTestEdits = async () => {
    setSavingTest(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/tutor/module-tests/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ testId: viewingTest._id, customQuestions: editedQuestionsData })
      })
      if (res.ok) { setSuccess('Saved'); setIsEditMode(false); setEditingQuestionId(null); fetchTests(); setTimeout(() => setSuccess(''), 3000) }
      else setError('Failed to save')
    } catch { setError('Failed to save') } finally { setSavingTest(false) }
  }

  const handleQuestionFieldChange = (questionId, field, value) => {
    setEditedQuestionsData(prev => ({ ...prev, [questionId]: { ...(prev[questionId] || {}), [field]: value } }))
    setModuleQuestionsMap(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(idx => {
        next[idx] = next[idx].map(q => (q.id || q._id).toString() === questionId.toString() ? { ...q, [field]: value } : q)
      })
      return next
    })
  }

  const handleOptionChange = (questionId, optionKey, value) => {
    setModuleQuestionsMap(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(idx => {
        next[idx] = next[idx].map(q => {
          if ((q.id || q._id).toString() !== questionId.toString()) return q
          let opts = (() => { try { return typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || {}) } catch(e) { return {} } })()
          if (Array.isArray(opts)) opts = { A: opts[0]||'', B: opts[1]||'', C: opts[2]||'', D: opts[3]||'' }
          return { ...q, options: { ...opts, [optionKey]: value } }
        })
      })
      return next
    })
    setEditedQuestionsData(prev => {
      const cur = prev[questionId] || {}
      let opts = (() => { try { return typeof cur.options === 'string' ? JSON.parse(cur.options) : (cur.options || {}) } catch(e) { return {} } })()
      if (Array.isArray(opts)) opts = { A: opts[0]||'', B: opts[1]||'', C: opts[2]||'', D: opts[3]||'' }
      return { ...prev, [questionId]: { ...cur, options: { ...opts, [optionKey]: value } } }
    })
  }

  const filteredTests = tests.filter(test => {
    if (test.isReassigned === true) return false
    if (searchTerm && !test.title.toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (filterMode === 'timed' && !test.isTimed) return false
    if (filterMode === 'untimed' && test.isTimed) return false
    return true
  })

  const currentModuleQuestions = moduleQuestionsMap[currentModuleTab] || []
  const currentModules = viewingTest?.modules && viewingTest.modules.length > 0 ? viewingTest.modules : [{ subject: viewingTest?.subject, questions: viewingTest?.questions || [] }]

  const ImagePreview = ({ text }) => {
    if (!text) return null
    const regex = /!\[(.*?)\]\((.*?)\)/g; const images = []; let match
    while ((match = regex.exec(text)) !== null) images.push({ alt: match[1], src: match[2] })
    if (!images.length) return null
    return <div className="mt-2 p-2 bg-gray-50 rounded border border-dashed border-gray-200"><div className="flex flex-wrap gap-2">{images.map((img, i) => <img key={i} src={img.src} alt={img.alt} className="h-16 w-auto object-contain rounded border bg-white" />)}</div></div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Module Test Sheets</h1>
          <p className="text-gray-600">View and manage all module tests</p>
        </div>

        {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-100"><FiX /> {error}</div>}
        {success && <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 border border-green-100"><FiSave /> {success}</div>}

        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search test titles..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Mode</label>
              <select value={filterMode} onChange={e => setFilterMode(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="all">All Tests</option><option value="timed">Timed Only</option><option value="untimed">Untimed Only</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm mb-4">
          <div className="p-6 border-b"><h2 className="text-lg font-semibold">Module Tests ({filteredTests.length})</h2></div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modules</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Questions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Loading tests...</td></tr>
                ) : filteredTests.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No tests found</td></tr>
                ) : filteredTests.map(test => {
                  const mods = test.modules && test.modules.length > 0 ? test.modules : null
                  const numModules = test.numberOfModules || (mods?.length) || 1
                  return (
                    <tr key={test._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{test.title}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-semibold">{numModules} Module{numModules > 1 ? 's' : ''}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {mods ? (
                          <div className="flex flex-wrap gap-1">
                            {mods.map((m, i) => (
                              <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded border">
                                M{i+1}: {m.subject === 'Reading and Writing' ? 'R&W' : m.subject} • {(m.questions||[]).length}q • {m.isTimed ? `${m.duration}min` : 'Untimed'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Legacy single-module</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{test.questions?.length || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(test.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button onClick={() => loadTestQuestions(test, false)} className="inline-flex items-center px-3 py-1 text-blue-600 hover:bg-blue-100 rounded text-xs"><FiEye className="mr-1" /> View</button>
                          <button onClick={() => loadTestQuestions(test, true)} className="inline-flex items-center px-3 py-1 text-green-600 hover:bg-green-100 rounded text-xs"><FiEdit className="mr-1" /> Edit</button>
                          <button onClick={() => handleOpenAssignToTutorModal(test)} className="inline-flex items-center px-3 py-1 text-amber-600 hover:bg-amber-100 rounded text-xs" title="Assign to Tutor"><FiUsers className="mr-1" /> Tutor</button>
                          <button onClick={() => handleOpenAssignToStudentModal(test)} className="inline-flex items-center px-3 py-1 text-purple-600 hover:bg-purple-100 rounded text-xs"><FiUserPlus className="mr-1" /> Student</button>
                          <button onClick={() => handleDeleteTest(test._id)} className="inline-flex items-center px-3 py-1 text-red-600 hover:bg-red-100 rounded text-xs"><FiTrash className="mr-1" /> Delete</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* View/Edit Modal */}
        {showViewModal && viewingTest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[92vh] flex flex-col">
              <div className="p-5 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{isEditMode ? 'Edit: ' : ''}{viewingTest.title}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Module {currentModuleTab + 1} — Question {currentQuestionIndex + 1} of {currentModuleQuestions.length}</p>
                </div>
                <div className="flex items-center gap-3">
                  {isEditMode && <button onClick={handleSaveTestEdits} disabled={savingTest} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2 text-sm"><FiSave /> {savingTest ? 'Saving...' : 'Save All'}</button>}
                  <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600"><FiX className="w-5 h-5" /></button>
                </div>
              </div>

              {/* Module Tabs */}
              {currentModules.length > 1 && (
                <div className="border-b border-gray-200 bg-gray-50 px-5">
                  <nav className="-mb-px flex gap-1">
                    {currentModules.map((m, idx) => (
                      <button key={idx} onClick={() => { setCurrentModuleTab(idx); setCurrentQuestionIndex(0); setEditingQuestionId(null) }} className={`px-4 py-2.5 border-b-2 font-medium text-sm transition-colors ${currentModuleTab === idx ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        Module {idx + 1}
                        <span className="ml-1 text-xs text-gray-400">({(m.questions||[]).length}q{m.isTimed ? ` • ${m.duration}min` : ' • Untimed'})</span>
                      </button>
                    ))}
                  </nav>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-5">
                {loadingQuestions ? (
                  <div className="flex items-center justify-center h-full text-gray-500">Loading questions...</div>
                ) : currentModuleQuestions.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">No questions in this module</div>
                ) : (() => {
                  const q = currentModuleQuestions[currentQuestionIndex]
                  if (!q) return null
                  const qId = (q.id || q._id || '').toString()
                  const isEditing = isEditMode && editingQuestionId === qId
                  let options = null
                  try {
                    const _raw = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
                    if (Array.isArray(_raw)) options = { A: _raw[0]||'', B: _raw[1]||'', C: _raw[2]||'', D: _raw[3]||'' }
                    else if (_raw && typeof _raw === 'object') options = _raw
                  } catch(e) {}
                  if (!options && (q.optionA || q.optionB)) options = { A: q.optionA||'', B: q.optionB||'', C: q.optionC||'', D: q.optionD||'' }
                  const tags = typeof q.tags === 'string' ? JSON.parse(q.tags) : (Array.isArray(q.tags) ? q.tags : [])

                  return (
                    <div className="max-w-4xl mx-auto">
                      <div className="border rounded-lg p-5 bg-gray-50">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-gray-900">Question {currentQuestionIndex + 1}</span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${q.subject === 'Math' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{q.subject}</span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${q.difficulty === 'Easy' ? 'bg-green-100 text-green-800' : q.difficulty === 'Hard' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{q.difficulty}</span>
                            <span className="px-2 py-0.5 text-xs font-mono bg-gray-100 text-gray-700 rounded border">{q.questionId || qId.slice(-8)}</span>
                            {tags.map((tag, i) => <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">{tag}</span>)}
                            {q.remark && <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full">💬 {q.remark}</span>}
                          </div>
                          {isEditMode && (
                            isEditing
                              ? <button onClick={() => setEditingQuestionId(null)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1"><FiSave /> Done</button>
                              : <button onClick={() => setEditingQuestionId(qId)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1"><FiEdit /> Edit</button>
                          )}
                        </div>

                        {q.questionParagraph && (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <span className="text-xs font-semibold text-blue-700 uppercase">Context Paragraph</span>
                            <div className="mt-2 text-sm text-gray-700">{renderWithImages(q.questionParagraph)}</div>
                          </div>
                        )}

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
                          {isEditing ? (
                            <><textarea value={q.content || q.question || ''} onChange={e => handleQuestionFieldChange(qId, 'content', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm" rows={4} />
                            <ImagePreview text={q.content || q.question} /></>
                          ) : (
                            <div className="bg-white p-3 rounded-lg border text-gray-900">{renderWithImages(q.content || q.question)}</div>
                          )}
                        </div>

                        {options && ['A','B','C','D'].filter(k => options[k] || options[k.toLowerCase()]).length > 0 ? (
                          <>
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options</label>
                              <div className="space-y-2">
                                {['A','B','C','D'].map(letter => {
                                  const optText = (options[letter] || options[letter.toLowerCase()]) || ''; if (!optText) return null
                                  return (
                                    <div key={letter} className={`p-3 border-2 rounded-lg ${q.correctAnswer === letter ? 'bg-green-50 border-green-500' : 'bg-white border-gray-200'}`}>
                                      <div className="flex items-start gap-2">
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                          <span className={`font-bold text-sm ${q.correctAnswer === letter ? 'text-green-700' : 'text-gray-600'}`}>{letter}.</span>
                                          {q.correctAnswer === letter && <span className="text-xs font-semibold text-green-700 bg-green-100 px-1 rounded">✓</span>}
                                        </div>
                                        {isEditing
                                          ? <div className="flex-1"><textarea value={optText} onChange={e => handleOptionChange(qId, letter, e.target.value)} className="w-full p-2 border rounded font-mono text-sm" rows={2} /><ImagePreview text={optText} /></div>
                                          : <div className="flex-1 [&_img]:max-h-16 [&_img]:max-w-[200px] [&_img]:object-contain">{renderWithImages(optText)}</div>}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer</label>
                              {isEditing
                                ? <select value={q.correctAnswer} onChange={e => handleQuestionFieldChange(qId, 'correctAnswer', e.target.value)} className="w-full p-2 border rounded-lg">{['A','B','C','D'].map(l => <option key={l}>{l}</option>)}</select>
                                : <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm font-medium text-green-800">Correct Answer: {q.correctAnswer}</div>}
                            </div>
                          </>
                        ) : (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded ml-1">Fill-in-the-Blank</span></label>
                            {isEditing
                              ? <input type="text" value={q.correctAnswer || ''} onChange={e => handleQuestionFieldChange(qId, 'correctAnswer', e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Enter correct answer..." />
                              : <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm font-medium text-green-800">Correct Answer: {q.correctAnswer}</div>}
                          </div>
                        )}

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Short Explanation</label>
                          {isEditing
                            ? <><textarea value={q.shortExplanation || ''} onChange={e => handleQuestionFieldChange(qId, 'shortExplanation', e.target.value)} className="w-full p-3 border rounded-lg font-mono text-sm" rows={3} placeholder="Short explanation..." /><ImagePreview text={q.shortExplanation || ''} /></>
                            : <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 min-h-[44px] text-sm">{q.shortExplanation ? renderWithImages(q.shortExplanation) : <span className="text-gray-400 italic">No short explanation</span>}</div>}
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Long Explanation</label>
                          {isEditing
                            ? <><textarea value={q.longExplanation || ''} onChange={e => handleQuestionFieldChange(qId, 'longExplanation', e.target.value)} className="w-full p-3 border rounded-lg font-mono text-sm" rows={5} placeholder="Long explanation..." /><ImagePreview text={q.longExplanation || ''} /></>
                            : <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 min-h-[44px] text-sm">{q.longExplanation ? renderWithImages(q.longExplanation) : <span className="text-gray-400 italic">No long explanation</span>}</div>}
                        </div>

                        {!q.shortExplanation && !q.longExplanation && q.explanation && !isEditing && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Explanation</label>
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm">{renderWithImages(q.explanation)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                <button onClick={() => { setCurrentQuestionIndex(p => Math.max(0, p-1)); setEditingQuestionId(null) }} disabled={currentQuestionIndex === 0} className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2 text-sm font-medium">
                  <FiArrowLeft /> Previous
                </button>
                <div className="text-sm text-gray-600">
                  {currentModules.length > 1 && <span className="mr-2 text-indigo-600 font-medium">Module {currentModuleTab + 1}</span>}
                  {currentQuestionIndex + 1} / {currentModuleQuestions.length}
                </div>
                <button onClick={() => { setCurrentQuestionIndex(p => Math.min(currentModuleQuestions.length-1, p+1)); setEditingQuestionId(null) }} disabled={currentQuestionIndex >= currentModuleQuestions.length - 1} className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2 text-sm font-medium">
                  Next <FiArrowLeft className="rotate-180" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign to Student Modal */}
        {showAssignToStudentModal && assignToStudentTest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Assign to Student</h2>
                  <p className="text-sm text-gray-600 mt-1">{assignToStudentTest.title}</p>
                </div>
                <button onClick={() => setShowAssignToStudentModal(false)} className="text-gray-400 hover:text-gray-600"><FiX className="w-6 h-6" /></button>
              </div>
              <div className="p-4 border-b">
                <div className="relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search students..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {loadingAllStudents ? (
                  <div className="text-center py-8 text-gray-500">Loading students...</div>
                ) : (
                  <div className="space-y-2">
                    {allStudents
                      .filter(s => !studentSearch || s.name?.toLowerCase().includes(studentSearch.toLowerCase()) || s.email?.toLowerCase().includes(studentSearch.toLowerCase()))
                      .map(student => {
                        const assigned = (studentAssignedTests[student._id] || []).map(id => id.toString()).includes(assignToStudentTest._id.toString())
                        return (
                          <div key={student._id} className={`p-4 border rounded-lg flex items-center justify-between ${assigned ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                            <div><div className="font-medium text-gray-900 text-sm">{student.name}</div><div className="text-xs text-gray-500">{student.email}</div></div>
                            <button onClick={() => handleToggleTestForStudent(student._id, assignToStudentTest._id)} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${assigned ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                              {assigned ? 'Unassign' : 'Assign'}
                            </button>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
              <div className="p-4 border-t bg-gray-50 flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input type="checkbox" checked={assignShowExplanation} onChange={e => setAssignShowExplanation(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm text-gray-700">Show explanation on analysis page</span>
                </label>
                <button onClick={() => setShowAssignToStudentModal(false)} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Assign to Tutor Modal */}
        {showAssignToTutorModal && assignToTutorTest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Assign Test Access to Tutor</h2>
                  <p className="text-sm text-gray-600 mt-1">{assignToTutorTest.title}</p>
                </div>
                <button onClick={() => setShowAssignToTutorModal(false)} className="text-gray-400 hover:text-gray-600"><FiX className="w-6 h-6" /></button>
              </div>
              <div className="p-4 border-b">
                <div className="relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={tutorSearch} onChange={e => setTutorSearch(e.target.value)} placeholder="Search tutors..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {loadingAllTutors ? (
                  <div className="text-center py-8 text-gray-500">Loading tutors...</div>
                ) : (
                  <div className="space-y-2">
                    {allTutors
                      .filter(t => !tutorSearch || t.name?.toLowerCase().includes(tutorSearch.toLowerCase()) || t.email?.toLowerCase().includes(tutorSearch.toLowerCase()))
                      .map(tutor => {
                        const assigned = (assignedTutorsMap[assignToTutorTest._id] || []).includes(tutor._id.toString())
                        return (
                          <div key={tutor._id} className={`p-4 border rounded-lg flex items-center justify-between ${assigned ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
                            <div><div className="font-medium text-gray-900 text-sm">{tutor.name}</div><div className="text-xs text-gray-500">{tutor.email}</div></div>
                            <button onClick={() => handleToggleTutorAssignment(tutor._id, assignToTutorTest._id)} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${assigned ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-amber-600 text-white hover:bg-amber-700'}`}>
                              {assigned ? 'Remove Access' : 'Grant Access'}
                            </button>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
              <div className="p-4 border-t bg-gray-50 flex justify-end">
                <button onClick={() => setShowAssignToTutorModal(false)} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
