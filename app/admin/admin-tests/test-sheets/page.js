'use client'
import { renderContent as renderWithImages } from '../../../components/admin/LatexRenderer'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiSearch, FiEye, FiTrash, FiClock, FiX, FiArrowLeft, FiSave, FiEdit, FiUserPlus, FiCheck, FiAlertCircle } from 'react-icons/fi'

export default function AdminTestSheets() {
  const router = useRouter()
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState('all') // all, timed, untimed
  
  // View test modal
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingTest, setViewingTest] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [testQuestions, setTestQuestions] = useState([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  
  // Edit mode
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState(null)
  const [editedQuestionsData, setEditedQuestionsData] = useState({})
  const [savingTest, setSavingTest] = useState(false)

  // Assign test to student modal
  const [showAssignToStudentModal, setShowAssignToStudentModal] = useState(false)
  const [assignToStudentTest, setAssignToStudentTest] = useState(null)
  const [allStudents, setAllStudents] = useState([])
  const [loadingAllStudents, setLoadingAllStudents] = useState(false)
  const [studentAssignedTests, setStudentAssignedTests] = useState({}) // studentId -> [testIds]
  const [studentSearch, setStudentSearch] = useState('')
  const [assignShowExplanation, setAssignShowExplanation] = useState(false)

  useEffect(() => {
    fetchTests()
  }, [])

  const fetchTests = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/admin-tests/list', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const data = await res.json()
        setTests(data)
      } else {
        setError('Failed to load tests')
      }
    } catch (err) {
      setError('Failed to load tests')
      console.error(err)
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
      const res = await fetch('/api/admin/users?role=Student', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const students = await res.json()
        setAllStudents(students)
        const map = {}
        await Promise.all(students.map(async (s) => {
          try {
            const r = await fetch(`/api/admin/students/${s._id}/assigned-tests`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            if (r.ok) {
              const d = await r.json()
              map[s._id] = d.assignedTests || []
            }
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
      const res = await fetch(`/api/admin/admin-tests/list?id=${testId}`, {
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
      console.error(err)
    }
  }

  const handleViewTest = async (test) => {
    setViewingTest(test)
    setCurrentQuestionIndex(0)
    setShowViewModal(true)
    setLoadingQuestions(true)
    setIsEditMode(false)
    setEditingQuestionId(null)
    setEditedQuestionsData(test.customQuestions || {})
    
    try {
      const token = localStorage.getItem('token')
      const questionIds = test.questions.join(',')
      const res = await fetch(`/api/questions?ids=${questionIds}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const questions = await res.json()
        if (test.customQuestions) {
          const customQuestionsMap = test.customQuestions
          const mergedQuestions = questions.map(q => {
            const qId = q.id || q._id
            return customQuestionsMap[qId] ? { ...q, ...customQuestionsMap[qId] } : q
          })
          setTestQuestions(mergedQuestions)
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

  const handleEditTest = async (test) => {
    setViewingTest(test)
    setCurrentQuestionIndex(0)
    setShowViewModal(true)
    setLoadingQuestions(true)
    setIsEditMode(true)
    setEditingQuestionId(null)
    setEditedQuestionsData(test.customQuestions || {})
    
    try {
      const token = localStorage.getItem('token')
      const questionIds = test.questions.join(',')
      const res = await fetch(`/api/questions?ids=${questionIds}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const questions = await res.json()
        if (test.customQuestions) {
          const customQuestionsMap = test.customQuestions
          const mergedQuestions = questions.map(q => {
            const qId = q.id || q._id
            return customQuestionsMap[qId] ? { ...q, ...customQuestionsMap[qId] } : q
          })
          setTestQuestions(mergedQuestions)
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
      const res = await fetch('/api/admin/admin-tests/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          testId: viewingTest._id,
          customQuestions: editedQuestionsData
        })
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
      console.error(err)
    } finally {
      setSavingTest(false)
    }
  }

  const handleQuestionFieldChange = (questionId, field, value) => {
    const currentQuestion = testQuestions.find(q => (q.id || q._id) === questionId)
    const currentEdited = editedQuestionsData[questionId] || currentQuestion
    setEditedQuestionsData(prev => ({ ...prev, [questionId]: { ...currentEdited, [field]: value } }))
    setTestQuestions(prev => prev.map(q => (q.id || q._id) === questionId ? { ...q, [field]: value } : q))
  }

  const handleOptionChange = (questionId, optionIndex, value) => {
    const currentQuestion = testQuestions.find(q => (q.id || q._id) === questionId)
    const currentEdited = editedQuestionsData[questionId] || currentQuestion
    const currentOptions = typeof currentEdited.options === 'string' ? JSON.parse(currentEdited.options) : currentEdited.options
    const newOptions = [...currentOptions]
    newOptions[optionIndex] = value
    setEditedQuestionsData(prev => ({ ...prev, [questionId]: { ...currentEdited, options: newOptions } }))
    setTestQuestions(prev => prev.map(q => (q.id || q._id) === questionId ? { ...q, options: newOptions } : q))
  }

  const filteredTests = tests.filter(test => {
    if (test.isReassigned) return false
    if (searchTerm && !test.title.toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (filterMode === 'timed' && !test.isTimed) return false
    if (filterMode === 'untimed' && test.isTimed) return false
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Test Sheets</h1>
            <p className="text-gray-600">View and manage all custom Admin tests</p>
          </div>
          <button onClick={() => router.push('/admin/admin-tests/create-test')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <FiEdit /> Create New Test
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-100">
            <FiX /> {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 border border-green-100">
            <FiCheck /> {success}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search test titles..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className="p-2 border rounded-lg">
            <option value="all">All Modes</option>
            <option value="timed">Timed Only</option>
            <option value="untimed">Untimed Only</option>
          </select>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Questions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Loading tests...</td></tr>
              ) : filteredTests.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No tests found</td></tr>
              ) : (
                filteredTests.map((test) => (
                  <tr key={test._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{test.title}</td>
                    <td className="px-6 py-4 text-sm">
                      {test.isTimed ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium"><FiClock /> {test.duration}m</span> : <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">Untimed</span>}
                    </td>
                    <td className="px-6 py-4 text-sm">{test.questions?.length || 0} Qs</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(test.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button onClick={() => handleViewTest(test)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded" title="View"><FiEye /></button>
                        <button onClick={() => handleEditTest(test)} className="text-green-600 hover:bg-green-50 p-1.5 rounded" title="Edit"><FiEdit /></button>
                        <button onClick={() => handleOpenAssignToStudentModal(test)} className="text-purple-600 hover:bg-purple-50 p-1.5 rounded" title="Assign"><FiUserPlus /></button>
                        <button onClick={() => handleDeleteTest(test._id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded" title="Delete"><FiTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* View/Edit Modal */}
        {showViewModal && viewingTest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full h-[90vh] flex flex-col overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{isEditMode ? 'Edit Test' : viewingTest.title}</h3>
                  <p className="text-sm text-gray-500">Question {currentQuestionIndex + 1} of {testQuestions.length}</p>
                </div>
                <div className="flex items-center gap-3">
                  {isEditMode && (
                    <button onClick={handleSaveTestEdits} disabled={savingTest} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2">
                      <FiSave /> {savingTest ? 'Saving...' : 'Save Changes'}
                    </button>
                  )}
                  <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={24} /></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {loadingQuestions ? (
                  <div className="h-full flex items-center justify-center">Loading questions...</div>
                ) : (
                  (() => {
                    const q = testQuestions[currentQuestionIndex]
                    if (!q) return null
                    const isEditing = isEditMode && editingQuestionId === (q.id || q._id)
                    const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
                    return (
                      <div className="max-w-4xl mx-auto space-y-6">
                        <div className="flex justify-end">
                          {isEditMode && (
                            isEditing ? <button onClick={() => setEditingQuestionId(null)} className="px-4 py-2 bg-green-600 text-white rounded-lg">Done Editing</button> : <button onClick={() => setEditingQuestionId(q.id || q._id)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Edit Question</button>
                          )}
                        </div>
                        <div className="space-y-4">
                          <label className="font-bold">Content</label>
                          {isEditing ? <textarea className="w-full p-3 border rounded font-mono" rows={6} value={q.content} onChange={e => handleQuestionFieldChange(q.id || q._id, 'content', e.target.value)} /> : <div className="p-4 bg-gray-50 border rounded">{renderWithImages(q.content)}</div>}
                        </div>
                        {options && options.length > 0 && (
                          <div className="space-y-3">
                            {options.map((opt, i) => (
                              <div key={i} className={`p-3 border rounded flex gap-3 ${q.correctAnswer === String.fromCharCode(65+i) ? 'bg-green-50 border-green-500' : ''}`}>
                                <span className="font-bold">{String.fromCharCode(65+i)}.</span>
                                {isEditing ? <textarea className="flex-1 p-2 border rounded" rows={2} value={opt} onChange={e => handleOptionChange(q.id || q._id, i, e.target.value)} /> : <div className="flex-1">{renderWithImages(opt)}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()
                )}
              </div>
              <div className="p-4 border-t bg-gray-50 flex justify-between">
                <button disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(prev => prev - 1)} className="px-6 py-2 border rounded-lg disabled:opacity-50 flex items-center gap-2"><FiArrowLeft /> Previous</button>
                <button disabled={currentQuestionIndex === testQuestions.length - 1} onClick={() => setCurrentQuestionIndex(prev => prev + 1)} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2">Next <FiArrowLeft className="rotate-180" /></button>
              </div>
            </div>
          </div>
        )}

        {/* Assign to Student Modal */}
        {showAssignToStudentModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full h-[80vh] flex flex-col overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                <h3 className="font-bold">Assign "{assignToStudentTest.title}" to Students</h3>
                <button onClick={() => setShowAssignToStudentModal(false)}><FiX size={24} /></button>
              </div>
              <div className="p-4 bg-white border-b flex gap-3">
                <div className="relative flex-1">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search students..." className="w-full pl-10 pr-4 py-2 border rounded-lg" />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={assignShowExplanation} onChange={e => setAssignShowExplanation(e.target.checked)} />
                  Show Explanations
                </label>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {loadingAllStudents ? <div>Loading students...</div> : (
                  <div className="space-y-2">
                    {allStudents.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase())).map(student => {
                      const isAssigned = (studentAssignedTests[student._id] || []).map(id => id.toString()).includes(assignToStudentTest._id)
                      return (
                        <div key={student._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-xs text-gray-500">{student.email}</p>
                          </div>
                          <button onClick={() => handleToggleTestForStudent(student._id, assignToStudentTest._id)} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${isAssigned ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-600 text-white'}`}>
                            {isAssigned ? 'Unassign' : 'Assign'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
