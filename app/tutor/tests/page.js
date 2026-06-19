'use client'
import { renderContent as renderWithImages } from '../../components/admin/LatexRenderer'
import { useState, useEffect } from 'react'
import { useAuth } from '../../components/AuthContext'
import { useRouter } from 'next/navigation'
import { FiSearch, FiEye, FiClock, FiX, FiArrowLeft, FiFileText, FiUserPlus, FiUsers } from 'react-icons/fi'
import { useToast } from '../../components/ui/UIProvider'

export default function TutorTests() {
  const toast = useToast()
  const { user } = useAuth()
  const router = useRouter()
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState('all')
  const [activeTab, setActiveTab] = useState('Reading and Writing')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab) setActiveTab(tab)
  }, [])

  // View test modal
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingTest, setViewingTest] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [testQuestions, setTestQuestions] = useState([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)

  // Assign test modal
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assigningTest, setAssigningTest] = useState(null)
  const [students, setStudents] = useState([])
  const [selectedStudents, setSelectedStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [assigningInProgress, setAssigningInProgress] = useState(false)
  const [assignShowExplanation, setAssignShowExplanation] = useState(false)

  // View assigned students modal
  const [showAssignedStudentsModal, setShowAssignedStudentsModal] = useState(false)
  const [viewingAssignedTest, setViewingAssignedTest] = useState(null)
  const [assignedStudentsList, setAssignedStudentsList] = useState([])
  const [loadingAssignedStudents, setLoadingAssignedStudents] = useState(false)

  useEffect(() => {
    if (user && user.role !== 'Tutor') {
      router.push('/dashboard')
    }
  }, [user, router])

  useEffect(() => {
    fetchTests()
  }, [])

  const fetchTests = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const [testsRes, moduleTestsRes, studentsRes] = await Promise.all([
        fetch('/api/admin/tutor/tests/list', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/tutor/module-tests/list', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/users?role=Student', { headers: { Authorization: `Bearer ${token}` } })
      ])

      if (testsRes.ok && moduleTestsRes.ok && studentsRes.ok) {
        const testsData = await testsRes.json()
        const moduleTestsData = await moduleTestsRes.json()
        const studentsData = await studentsRes.json()

        // Combine all tests
        const allTestsData = [...testsData, ...moduleTestsData]

        // Filter students assigned to this tutor
        const myStudents = studentsData.filter(s => s.assignedTutor === user?.id || s.assignedTutor?._id === user?.id)

        // Add student count to each test
        const testsWithCount = allTestsData.map(test => ({
          ...test,
          assignedStudentsCount: myStudents.filter(s =>
            s.assignedTests && s.assignedTests.includes(test._id)
          ).length
        }))

        setTests(testsWithCount)
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

  const handleViewTest = async (test) => {
    setViewingTest(test)
    setCurrentQuestionIndex(0)
    setShowViewModal(true)
    setLoadingQuestions(true)

    try {
      const token = localStorage.getItem('token')

      // Handle module tests differently
      if (test.isModuleTest) {
        const modules = test.modules && test.modules.length > 0 ? test.modules : [{ questions: test.questions || [], subject: test.subject }]
        const allIds = modules.flatMap(m => m.questions || [])
        const res = await fetch(`/api/questions?ids=${allIds.join(',')}`, { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const allQuestions = await res.json()
          const qById = {}
          allQuestions.forEach(q => { qById[(q.id || q._id).toString()] = q })

          const customMap = test.customQuestions || {}
          const mergedQuestions = allIds.map(qId => {
            const q = qById[qId.toString()] || {}
            const qKey = (q.id || q._id || '').toString()
            return customMap[qKey] ? { ...q, ...customMap[qKey] } : q
          }).filter(q => q._id || q.id)
          setTestQuestions(mergedQuestions)
        }
      } else {
        const questionIds = test.questions.join(',')
        const res = await fetch(`/api/questions?ids=${questionIds}`, { headers: { Authorization: `Bearer ${token}` } })
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
      }
    } catch (err) {
      console.error('Failed to load questions', err)
    } finally {
      setLoadingQuestions(false)
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < testQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleAssignTest = async (test) => {
    setAssigningTest(test)
    setShowAssignModal(true)
    setLoadingStudents(true)
    setSelectedStudents([])
    setAssignShowExplanation(false)

    try {
      const token = localStorage.getItem('token')
      // Fetch students assigned to this tutor
      const res = await fetch('/api/admin/users?role=Student', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        // Filter students assigned to this tutor
        const myStudents = data.filter(s => s.assignedTutor === user.id || s.assignedTutor?._id === user.id)
        setStudents(myStudents)

        // Pre-select students who already have this test assigned
        const alreadyAssigned = myStudents
          .filter(s => s.assignedTests && s.assignedTests.includes(test._id))
          .map(s => s._id)
        setSelectedStudents(alreadyAssigned)
      }
    } catch (err) {
      console.error('Failed to load students', err)
    } finally {
      setLoadingStudents(false)
    }
  }

  const handleToggleStudent = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleConfirmAssign = async () => {
    if (!assigningTest || selectedStudents.length === 0) return

    setAssigningInProgress(true)
    try {
      const token = localStorage.getItem('token')

      // Assign test to each selected student
      for (const studentId of selectedStudents) {
        await fetch('/api/tutor/students/assign-test', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            studentId,
            testId: assigningTest._id,
            action: 'add',
            showExplanation: assignShowExplanation
          })
        })
      }

      // Unassign from students who were deselected
      const studentsWithTest = students
        .filter(s => s.assignedTests && s.assignedTests.includes(assigningTest._id))
        .map(s => s._id)

      const toUnassign = studentsWithTest.filter(id => !selectedStudents.includes(id))

      for (const studentId of toUnassign) {
        await fetch('/api/tutor/students/assign-test', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            studentId,
            testId: assigningTest._id,
            action: 'remove',
            showExplanation: assignShowExplanation
          })
        })
      }

      toast.success('Test assigned successfully!')
      setShowAssignModal(false)
      // Refresh tests to update student count
      fetchTests()
    } catch (err) {
      console.error('Failed to assign test', err)
      toast.error('Failed to assign test')
    } finally {
      setAssigningInProgress(false)
    }
  }

  const handleViewAssignedStudents = async (test) => {
    setViewingAssignedTest(test)
    setShowAssignedStudentsModal(true)
    setLoadingAssignedStudents(true)

    try {
      const token = localStorage.getItem('token')
      // Fetch all students assigned to this tutor
      const res = await fetch('/api/admin/users?role=Student', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        // Filter students who have this test assigned
        const studentsWithTest = data.filter(s =>
          (s.assignedTutor === user.id || s.assignedTutor?._id === user.id) &&
          s.assignedTests &&
          s.assignedTests.includes(test._id)
        )
        setAssignedStudentsList(studentsWithTest)
      }
    } catch (err) {
      console.error('Failed to load assigned students', err)
    } finally {
      setLoadingAssignedStudents(false)
    }
  }

  const getAssignedStudentsCount = (test) => {
    // This will be calculated from the students data when we fetch it
    // For now, we'll fetch it on demand
    return test.assignedStudentsCount || 0
  }

  const filteredTests = tests.filter(test => {
    if (test.subject !== activeTab) return false
    if (searchTerm && !(test.title || '').toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (filterMode === 'timed' && !test.isTimed) return false
    if (filterMode === 'untimed' && test.isTimed) return false
    return true
  })

  const tabs = [
    { key: 'Reading and Writing', label: 'Reading & Writing Tests' },
    { key: 'Math', label: 'Math Tests' },
    { key: 'Module Tests', label: 'Module Tests' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"><FiFileText size={18} /></span>
            Test Sheets
          </h1>
          <p className="mt-1 text-sm text-slate-500">Browse, preview, and assign test sheets to your students.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Subject Tabs */}
        <div className="mb-6 border-b border-slate-200">
          <nav className="-mb-px flex flex-wrap gap-x-8">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap border-b-2 px-1 py-3.5 text-sm font-semibold transition-colors ${
                  activeTab === tab.key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Filters */}
        <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Search by Title</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search test titles..."
                  className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Filter by Mode</label>
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Tests</option>
                <option value="timed">Timed Only</option>
                <option value="untimed">Untimed Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tests List */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              {activeTab} <span className="text-slate-400">({filteredTests.length})</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Test Title</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Mode</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Difficulty</th>
                  {activeTab === 'Module Tests' ? (
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Modules</th>
                  ) : (
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Questions</th>
                  )}
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Assigned Students</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Created Date</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16">
                      <div className="flex flex-col items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
                        <p className="mt-3 text-sm text-slate-500">Loading tests...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredTests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12">
                      <div className="text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiFileText size={22} /></div>
                        <h3 className="text-base font-semibold text-slate-600">No tests found</h3>
                        <p className="mt-1 text-sm text-slate-400">No {activeTab.toLowerCase()} match your filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTests.map((test) => (
                    <tr key={test._id} className="transition-colors hover:bg-indigo-50/40">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-900">{test.title || 'Untitled Test'}</div>
                        {test.description && (
                          <div className="mt-0.5 max-w-xs truncate text-xs text-slate-400">{test.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {test.isTimed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            <FiClock /> {test.duration || (test.modules ? test.modules.reduce((acc, m) => acc + (m.duration || 0), 0) : 0)} min
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                            Untimed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          test.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700' :
                          test.difficulty === 'Hard' ? 'bg-red-50 text-red-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {test.difficulty || 'Medium'}
                        </span>
                      </td>
                      {activeTab === 'Module Tests' ? (
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {test.numberOfModules || test.modules?.length || 1} Modules
                        </td>
                      ) : (
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {test.questions?.length || 0} questions
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleViewAssignedStudents(test)}
                          className="font-medium text-indigo-600 transition-colors hover:text-indigo-800 hover:underline"
                        >
                          {test.assignedStudentsCount || 0} student{test.assignedStudentsCount !== 1 ? 's' : ''}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {test.createdAt ? new Date(test.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewTest(test)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                          >
                            <FiEye /> View
                          </button>
                          <button
                            onClick={() => handleAssignTest(test)}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
                          >
                            <FiUserPlus /> Assign
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

        {/* View Test Modal - read-only */}
        {showViewModal && viewingTest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="flex h-[90vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 p-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{viewingTest.title || 'Untitled Test'}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Question {currentQuestionIndex + 1} of {testQuestions.length}
                  </p>
                </div>
                <button onClick={() => setShowViewModal(false)} className="text-slate-400 transition-colors hover:text-slate-600">
                  <FiX className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingQuestions ? (
                  <div className="flex h-full flex-col items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
                    <p className="mt-3 text-sm text-slate-500">Loading questions...</p>
                  </div>
                ) : testQuestions.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">No questions found</div>
                ) : (
                  (() => {
                    const q = testQuestions[currentQuestionIndex]
                    if (!q) return null

                    const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
                    const tags = typeof q.tags === 'string' ? JSON.parse(q.tags) : (Array.isArray(q.tags) ? q.tags : [])

                    return (
                      <div className="mx-auto max-w-4xl">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
                          <div className="mb-4 flex flex-wrap items-center gap-3">
                            <span className="text-lg font-bold text-slate-900">Question {currentQuestionIndex + 1}</span>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              q.subject === 'Math' ? 'bg-indigo-50 text-indigo-700' : 'bg-violet-50 text-violet-700'
                            }`}>
                              {q.subject}
                            </span>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700' :
                              q.difficulty === 'Hard' ? 'bg-red-50 text-red-700' :
                              'bg-amber-50 text-amber-700'
                            }`}>
                              {q.difficulty}
                            </span>
                            {tags.length > 0 && tags.map((tag, idx) => (
                              <span key={idx} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                                {tag}
                              </span>
                            ))}
                            {q.remark && (
                              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
                                💬 {q.remark}
                              </span>
                            )}
                          </div>

                          <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium text-slate-700">Question</label>
                            <div className="rounded-lg border border-slate-200 bg-white p-3 text-slate-900">
                              {renderWithImages(q.content || q.question)}
                            </div>
                          </div>

                          <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium text-slate-700">Answer Options</label>
                            <div className="space-y-2">
                              {['A', 'B', 'C', 'D'].map((letter, i) => (
                                <div key={letter} className={`rounded-lg border p-3 ${q.correctAnswer === letter ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                                  <div className="flex items-start gap-2">
                                    <span className="font-medium">{letter}.</span>
                                    <div className="flex-1">{renderWithImages(options[i] || '')}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="mb-4">
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                              <span className="text-sm font-medium text-emerald-800">Correct Answer: {q.correctAnswer}</span>
                            </div>
                          </div>

                          {q.shortExplanation && (
                            <div className="mb-4">
                              <label className="mb-2 block text-sm font-medium text-slate-700">Short Explanation</label>
                              <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                                <div className="whitespace-pre-wrap text-sm text-slate-700">
                                  {renderWithImages(q.shortExplanation)}
                                </div>
                              </div>
                            </div>
                          )}

                          {q.longExplanation && (
                            <div className="mb-4">
                              <label className="mb-2 block text-sm font-medium text-slate-700">Long Explanation</label>
                              <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                                <div className="whitespace-pre-wrap text-sm text-slate-700">
                                  {renderWithImages(q.longExplanation)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 p-6">
                <button
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiArrowLeft /> Previous
                </button>

                <div className="text-sm text-slate-500">
                  {currentQuestionIndex + 1} / {testQuestions.length}
                </div>

                <button
                  onClick={handleNextQuestion}
                  disabled={currentQuestionIndex === testQuestions.length - 1}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next <FiArrowLeft className="rotate-180" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Test Modal */}
        {showAssignModal && assigningTest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
              <div className="border-b border-slate-100 p-6">
                <h2 className="text-xl font-bold text-slate-900">Assign Test to Students</h2>
                <p className="mt-1 text-sm text-slate-500">{assigningTest.title || 'Untitled Test'}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingStudents ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
                    <p className="mt-3 text-sm text-slate-500">Loading students...</p>
                  </div>
                ) : students.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiUsers size={22} /></div>
                    <p className="text-sm text-slate-500">No students assigned to you</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {students.map((student) => (
                      <div
                        key={student._id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-indigo-50/40"
                        onClick={() => handleToggleStudent(student._id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student._id)}
                          onChange={() => handleToggleStudent(student._id)}
                          className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">{student.name}</div>
                          <div className="text-sm text-slate-500">{student.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 p-6">
                <label className="mr-auto flex cursor-pointer select-none items-center gap-2">
                  <input
                    type="checkbox"
                    checked={assignShowExplanation}
                    onChange={e => setAssignShowExplanation(e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">Show explanation on analysis page</span>
                </label>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="rounded-lg border border-slate-300 px-6 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white"
                  disabled={assigningInProgress}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAssign}
                  disabled={assigningInProgress || selectedStudents.length === 0}
                  className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {assigningInProgress ? 'Assigning...' : `Assign to ${selectedStudents.length} Student${selectedStudents.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Assigned Students Modal */}
        {showAssignedStudentsModal && viewingAssignedTest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
              <div className="border-b border-slate-100 p-6">
                <h2 className="text-xl font-bold text-slate-900">Assigned Students</h2>
                <p className="mt-1 text-sm text-slate-500">{viewingAssignedTest.title || 'Untitled Test'}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingAssignedStudents ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
                    <p className="mt-3 text-sm text-slate-500">Loading students...</p>
                  </div>
                ) : assignedStudentsList.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiUsers size={22} /></div>
                    <p className="text-sm text-slate-500">No students have been assigned this test yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assignedStudentsList.map((student) => (
                      <div
                        key={student._id}
                        className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">{student.name}</div>
                          <div className="text-sm text-slate-500">{student.email}</div>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                          Assigned
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50 p-6">
                <button
                  onClick={() => setShowAssignedStudentsModal(false)}
                  className="rounded-lg border border-slate-300 px-6 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
