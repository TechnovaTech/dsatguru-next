'use client'
import { renderContent as renderWithImages } from '../../../components/admin/LatexRenderer'
import { useState, useEffect } from 'react'
import { FiSearch, FiEye, FiTrash, FiClock, FiX, FiArrowLeft, FiSave, FiEdit, FiUserPlus } from 'react-icons/fi'

export default function ModuleTestSheets() {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState('all')
  const [activeTab, setActiveTab] = useState('Math')

  // View/Edit modal
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingTest, setViewingTest] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [testQuestions, setTestQuestions] = useState([])
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

  useEffect(() => { fetchTests() }, [])

  const fetchTests = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/tutor/module-tests/list', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setTests(await res.json())
      } else {
        setError('Failed to load tests')
      }
    } catch (err) {
      setError('Failed to load tests')
    } finally {
      setLoading(false)
    }
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
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingAllStudents(false)
    }
  }

  const handleToggleTestForStudent = async (studentId, testId) => {
    const token = localStorage.getItem('token')
    const current = studentAssignedTests[studentId] || []
    const isAssigned = current.map(id => id.toString()).includes(testId)
    try {
      const res = await fetch('/api/admin/students/assign-test', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ studentId, testId, action: isAssigned ? 'remove' : 'add', showExplanation: assignShowExplanation })
      })
      if (res.ok) {
        const data = await res.json()
        setStudentAssignedTests(prev => ({ ...prev, [studentId]: data.assignedTests }))
        setSuccess(isAssigned ? 'Test unassigned from student' : 'Test assigned to student')
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      setError('Failed to update assignment')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleDeleteTest = async (testId) => {
    if (!confirm('Are you sure you want to delete this test?')) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/admin/tutor/module-tests/list?id=${testId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setSuccess('Test deleted successfully')
        fetchTests()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to delete test')
      }
    } catch (err) {
      setError('Failed to delete test')
    }
  }

  const loadTestQuestions = async (test, editMode) => {
    setViewingTest(test)
    setCurrentQuestionIndex(0)
    setShowViewModal(true)
    setLoadingQuestions(true)
    setIsEditMode(editMode)
    setEditingQuestionId(null)
    setEditedQuestionsData(test.customQuestions || {})
    try {
      const token = localStorage.getItem('token')
      const questionIds = test.questions.join(',')
      const res = await fetch(`/api/questions?ids=${questionIds}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const questions = await res.json()
        if (test.customQuestions) {
          const merged = questions.map(q => {
            const qId = q.id || q._id
            return test.customQuestions[qId] ? { ...q, ...test.customQuestions[qId] } : q
          })
          setTestQuestions(merged)
        } else {
          setTestQuestions(questions)
        }
      }
    } catch (err) {
      console.error('Failed to load questions', err)
    } finally {
      setLoadingQuestions(false)
    }
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
      if (res.ok) {
        setSuccess('Test updated successfully')
        setIsEditMode(false)
        setEditingQuestionId(null)
        fetchTests()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to update test')
      }
    } catch (err) {
      setError('Failed to update test')
    } finally {
      setSavingTest(false)
    }
  }

  const handleQuestionFieldChange = (questionId, field, value) => {
    const current = testQuestions.find(q => (q.id || q._id) === questionId)
    const edited = editedQuestionsData[questionId] || current
    setEditedQuestionsData(prev => ({ ...prev, [questionId]: { ...edited, [field]: value } }))
    setTestQuestions(prev => prev.map(q => (q.id || q._id) === questionId ? { ...q, [field]: value } : q))
  }

  const handleOptionChange = (questionId, optionKey, value) => {
    const current = testQuestions.find(q => (q.id || q._id) === questionId)
    const edited = editedQuestionsData[questionId] || current
    let opts = (() => { try { return typeof edited.options === 'string' ? JSON.parse(edited.options) : (edited.options || {}) } catch(e) { return {} } })()
    if (Array.isArray(opts)) opts = { A: opts[0] || '', B: opts[1] || '', C: opts[2] || '', D: opts[3] || '' }
    const newOpts = { ...opts, [optionKey]: value }
    setEditedQuestionsData(prev => ({ ...prev, [questionId]: { ...edited, options: newOpts } }))
    setTestQuestions(prev => prev.map(q => (q.id || q._id) === questionId ? { ...q, options: newOpts } : q))
  }

  const filteredTests = tests.filter(test => {
    if (test.isReassigned === true) return false
    if (test.subject !== activeTab) return false
    if (searchTerm && !test.title.toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (filterMode === 'timed' && !test.isTimed) return false
    if (filterMode === 'untimed' && test.isTimed) return false
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Module Test Sheets</h1>
          <p className="text-gray-600">View and manage all created module tests</p>
        </div>

        {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-100"><FiX /> {error}</div>}
        {success && <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 border border-green-100"><FiSave /> {success}</div>}

        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {['Math', 'Reading and Writing'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`${activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                  {tab === 'Reading and Writing' ? 'Reading & Writing Tests' : 'Math Tests'}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search by Title</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search test titles..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Mode</label>
              <select value={filterMode} onChange={e => setFilterMode(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="all">All Tests</option>
                <option value="timed">Timed Only</option>
                <option value="untimed">Untimed Only</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm mb-4">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">{activeTab} Tests ({filteredTests.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Questions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Loading tests...</td></tr>
                ) : filteredTests.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No tests found</td></tr>
                ) : (
                  filteredTests.map(test => (
                    <tr key={test._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{test.title}</td>
                      <td className="px-6 py-4 text-sm">
                        {test.isTimed ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium"><FiClock /> {test.duration} min</span>
                        ) : (
                          <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">Untimed</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{test.questions?.length || 0} questions</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(test.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button onClick={() => loadTestQuestions(test, false)} className="inline-flex items-center px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded">
                            <FiEye className="mr-1" /> View
                          </button>
                          <button onClick={() => loadTestQuestions(test, true)} className="inline-flex items-center px-3 py-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded">
                            <FiEdit className="mr-1" /> Edit
                          </button>
                          <button onClick={() => handleOpenAssignToStudentModal(test)} className="inline-flex items-center px-3 py-1 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded">
                            <FiUserPlus className="mr-1" /> Assign
                          </button>
                          <button onClick={() => handleDeleteTest(test._id)} className="inline-flex items-center px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded">
                            <FiTrash className="mr-1" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* View/Edit Modal */}
        {showViewModal && viewingTest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[90vh] flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{isEditMode ? 'Edit Test Questions' : viewingTest.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">Question {currentQuestionIndex + 1} of {testQuestions.length}</p>
                </div>
                <div className="flex items-center gap-3">
                  {isEditMode && (
                    <button onClick={handleSaveTestEdits} disabled={savingTest} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2">
                      <FiSave /> {savingTest ? 'Saving...' : 'Save All Changes'}
                    </button>
                  )}
                  <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600"><FiX className="w-6 h-6" /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingQuestions ? (
                  <div className="flex items-center justify-center h-full"><div className="text-gray-500">Loading questions...</div></div>
                ) : testQuestions.length === 0 ? (
                  <div className="flex items-center justify-center h-full"><div className="text-gray-500">No questions found</div></div>
                ) : (() => {
                  const q = testQuestions[currentQuestionIndex]
                  if (!q) return null
                  const qId = q.id || q._id
                  const isEditing = isEditMode && editingQuestionId === qId
                  let options = null
                  try {
                    const _raw = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
                    if (Array.isArray(_raw)) options = { A: _raw[0] || '', B: _raw[1] || '', C: _raw[2] || '', D: _raw[3] || '' }
                    else if (_raw && typeof _raw === 'object') options = _raw
                  } catch(e) {}
                  if (!options && (q.optionA || q.optionB || q.optionC || q.optionD)) {
                    options = { A: q.optionA || '', B: q.optionB || '', C: q.optionC || '', D: q.optionD || '' }
                  }
                  const tags = typeof q.tags === 'string' ? JSON.parse(q.tags) : (Array.isArray(q.tags) ? q.tags : [])

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

                  return (
                    <div className="max-w-4xl mx-auto">
                      <div className="border rounded-lg p-6 bg-gray-50">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-lg font-bold text-gray-900">Question {currentQuestionIndex + 1}</span>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${q.subject === 'Math' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{q.subject}</span>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${q.difficulty === 'Easy' ? 'bg-green-100 text-green-800' : q.difficulty === 'Hard' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{q.difficulty}</span>
                            <span className="px-2 py-1 text-xs font-mono bg-gray-100 text-gray-700 rounded border border-gray-300">
                              ID: {q.questionId || (q.id || q._id || '').toString().slice(-8)}
                            </span>
                            {tags.map((tag, idx) => <span key={idx} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">{tag}</span>)}
                            {q.remark && <span className="px-3 py-1 text-xs bg-amber-100 text-amber-800 rounded-full">💬 {q.remark}</span>}
                          </div>
                          {isEditMode && (
                            <div className="flex gap-2">
                              {isEditing ? (
                                <button type="button" onClick={() => setEditingQuestionId(null)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"><FiSave /> Save</button>
                              ) : (
                                <button type="button" onClick={() => setEditingQuestionId(qId)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"><FiEdit /> Edit</button>
                              )}
                            </div>
                          )}
                        </div>

                        {q.questionParagraph && (
                          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <span className="text-xs font-semibold text-blue-700 uppercase">Context Paragraph</span>
                            <div className="mt-2 text-sm text-gray-700">{renderWithImages(q.questionParagraph)}</div>
                          </div>
                        )}

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
                          {isEditing ? (
                            <>
                              <textarea value={q.content || q.question} onChange={e => handleQuestionFieldChange(qId, 'content', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm" rows={4} />
                              <ImagePreview text={q.content || q.question} />
                            </>
                          ) : (
                            <div className="text-gray-900 bg-white p-3 rounded-lg border">{renderWithImages(q.content || q.question)}</div>
                          )}
                        </div>

                        {(['A','B','C','D'].filter(k => options && (options[k] || options[k.toLowerCase()]))).length > 0 ? (
                          <>
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options (Multiple Choice)</label>
                              <div className="space-y-2">
                                {['A', 'B', 'C', 'D'].map(letter => {
                                  const optText = (options && (options[letter] || options[letter.toLowerCase()])) || ''
                                  if (!optText) return null
                                  return (
                                    <div key={letter} className={`p-3 border-2 rounded-lg ${q.correctAnswer === letter ? 'bg-green-50 border-green-500' : 'bg-white border-gray-200'}`}>
                                      <div className="flex items-start gap-2">
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                          <span className={`font-bold text-sm ${q.correctAnswer === letter ? 'text-green-700' : 'text-gray-600'}`}>{letter}.</span>
                                          {q.correctAnswer === letter && <span className="text-xs font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">Correct</span>}
                                        </div>
                                        {isEditing ? (
                                          <div className="flex-1">
                                            <textarea value={optText} onChange={e => handleOptionChange(qId, letter, e.target.value)} className="w-full p-2 border border-gray-300 rounded font-mono text-sm" rows={2} />
                                            <ImagePreview text={optText} />
                                          </div>
                                        ) : (
                                          <div className="flex-1 [&_img]:max-h-16 [&_img]:max-w-[200px] [&_img]:object-contain">{renderWithImages(optText)}</div>
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              <span className="inline-flex items-center gap-2">
                                Correct Answer (Fill-in-the-Blank)
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Text Input</span>
                              </span>
                            </label>
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
                            <>
                              <textarea value={q.shortExplanation || ''} onChange={e => handleQuestionFieldChange(qId, 'shortExplanation', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm" rows={3} placeholder="Add short explanation..." />
                              <ImagePreview text={q.shortExplanation || ''} />
                            </>
                          ) : (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 min-h-[48px]">
                              {q.shortExplanation ? renderWithImages(q.shortExplanation) : <span className="text-gray-400 italic text-sm">No short explanation added</span>}
                            </div>
                          )}
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Long Explanation</label>
                          {isEditing ? (
                            <>
                              <textarea value={q.longExplanation || ''} onChange={e => handleQuestionFieldChange(qId, 'longExplanation', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm" rows={5} placeholder="Add detailed explanation..." />
                              <ImagePreview text={q.longExplanation || ''} />
                            </>
                          ) : (
                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 min-h-[48px]">
                              {q.longExplanation ? renderWithImages(q.longExplanation) : <span className="text-gray-400 italic text-sm">No long explanation added</span>}
                            </div>
                          )}
                        </div>

                        {!q.shortExplanation && !q.longExplanation && q.explanation && !isEditing && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Explanation</label>
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                              <div className="text-gray-700 whitespace-pre-wrap text-sm">{renderWithImages(q.explanation)}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
                <button onClick={() => setCurrentQuestionIndex(p => Math.max(0, p-1))} disabled={currentQuestionIndex === 0} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium">
                  <FiArrowLeft /> Previous
                </button>
                <div className="text-sm text-gray-600">{currentQuestionIndex + 1} / {testQuestions.length}</div>
                <button onClick={() => setCurrentQuestionIndex(p => Math.min(testQuestions.length-1, p+1))} disabled={currentQuestionIndex === testQuestions.length - 1} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium">
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
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search students..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {loadingAllStudents ? (
                  <div className="text-center py-8 text-gray-500">Loading students...</div>
                ) : allStudents.filter(s => !studentSearch || s.name?.toLowerCase().includes(studentSearch.toLowerCase()) || s.email?.toLowerCase().includes(studentSearch.toLowerCase())).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No students found</div>
                ) : (
                  <div className="space-y-2">
                    {allStudents
                      .filter(s => !studentSearch || s.name?.toLowerCase().includes(studentSearch.toLowerCase()) || s.email?.toLowerCase().includes(studentSearch.toLowerCase()))
                      .map(student => {
                        const assigned = (studentAssignedTests[student._id] || []).map(id => id.toString()).includes(assignToStudentTest._id.toString())
                        return (
                          <div key={student._id} className={`p-4 border rounded-lg flex items-center justify-between ${assigned ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{student.name}</div>
                              <div className="text-xs text-gray-500">{student.email}</div>
                            </div>
                            <button
                              onClick={() => handleToggleTestForStudent(student._id, assignToStudentTest._id)}
                              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${assigned ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                            >
                              {assigned ? 'Unassign' : 'Assign'}
                            </button>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
              <div className="p-4 border-t bg-gray-50 flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none flex-1">
                  <input type="checkbox" checked={assignShowExplanation} onChange={e => setAssignShowExplanation(e.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">Show explanation on analysis page</span>
                </label>
                <button onClick={() => setShowAssignToStudentModal(false)} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
