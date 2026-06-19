'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../components/AuthContext'
import { useRouter } from 'next/navigation'
import { useToast } from '../../components/ui/UIProvider'
import {
  FiSearch, FiUser, FiCalendar, FiUserPlus, FiX, FiClock,
  FiUsers, FiBarChart2, FiBookOpen, FiAlertCircle
} from 'react-icons/fi'

export default function TutorStudents() {
  const { user } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Tests data
  const [tests, setTests] = useState([])

  // Assign tests modal
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [selectedStudentName, setSelectedStudentName] = useState('')
  const [assignedTests, setAssignedTests] = useState([])
  const [loadingTests, setLoadingTests] = useState(false)
  const [selectedMathTests, setSelectedMathTests] = useState([])
  const [selectedRWTests, setSelectedRWTests] = useState([])
  const [assignShowExplanation, setAssignShowExplanation] = useState(false)

  // View assigned tests modal
  const [showAssignedTestsModal, setShowAssignedTestsModal] = useState(false)
  const [selectedStudentTests, setSelectedStudentTests] = useState([])
  const [selectedTestSubject, setSelectedTestSubject] = useState('')
  const [loadingAssignedTests, setLoadingAssignedTests] = useState(false)

  useEffect(() => {
    if (user && user.role !== 'Tutor') {
      router.push('/dashboard')
    }
  }, [user, router])

  useEffect(() => {
    fetchStudents()
    fetchTests()
  }, [])

  // Close any open modal on Escape
  useEffect(() => {
    const anyOpen = showAssignModal || showAssignedTestsModal
    if (!anyOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setShowAssignModal(false)
        setShowAssignedTestsModal(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showAssignModal, showAssignedTestsModal])

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/users?role=Student', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setStudents(data)
      } else {
        setError('Failed to load students')
      }
    } catch (err) {
      setError('Failed to load students')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTests = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/tutor/tests/list', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setTests(data)
      }
    } catch (err) {
      console.error('Failed to load tests', err)
    }
  }

  const handleOpenAssignModal = async (student) => {
    setSelectedStudentId(student._id)
    setSelectedStudentName(student.name || 'Unknown')
    setShowAssignModal(true)
    setLoadingTests(true)
    setSelectedMathTests([])
    setSelectedRWTests([])
    setAssignShowExplanation(false)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/tutor/students/${student._id}/assigned-tests`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setAssignedTests(data.assignedTests || [])
      }
    } catch (err) {
      console.error('Failed to load assigned tests', err)
    } finally {
      setLoadingTests(false)
    }
  }

  const handleViewAssignedTests = async (student, subject) => {
    setLoadingAssignedTests(true)
    setShowAssignedTestsModal(true)
    setSelectedTestSubject(subject)
    setSelectedStudentName(student.name || 'Unknown')
    setSelectedStudentTests([])

    try {
      const token = localStorage.getItem('token')
      const assignedRes = await fetch(`/api/tutor/students/${student._id}/assigned-tests`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (assignedRes.ok) {
        const assignedData = await assignedRes.json()
        const assignedTestIds = assignedData.assignedTests || []

        const assignedTests = tests.filter(t =>
          t.subject === subject && assignedTestIds.includes(t._id)
        )
        setSelectedStudentTests(assignedTests)
      }
    } catch (err) {
      console.error('Failed to load assigned tests', err)
      toast.error('Failed to load assigned tests')
    } finally {
      setLoadingAssignedTests(false)
    }
  }

  const handleSelectAllMath = () => {
    const mathTests = tests.filter(t => t.subject === 'Math')
    const mathTestIds = mathTests.map(t => t._id)

    if (selectedMathTests.length === mathTestIds.length) {
      setSelectedMathTests([])
    } else {
      setSelectedMathTests(mathTestIds)
    }
  }

  const handleSelectAllRW = () => {
    const rwTests = tests.filter(t => t.subject === 'Reading and Writing')
    const rwTestIds = rwTests.map(t => t._id)

    if (selectedRWTests.length === rwTestIds.length) {
      setSelectedRWTests([])
    } else {
      setSelectedRWTests(rwTestIds)
    }
  }

  const handleToggleMathTest = (testId) => {
    setSelectedMathTests(prev =>
      prev.includes(testId)
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    )
  }

  const handleToggleRWTest = (testId) => {
    setSelectedRWTests(prev =>
      prev.includes(testId)
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    )
  }

  const handleAssignSelected = async (subject) => {
    const selectedTests = subject === 'Math' ? selectedMathTests : selectedRWTests

    if (selectedTests.length === 0) {
      toast.error('Please select tests to assign')
      return
    }

    try {
      const token = localStorage.getItem('token')

      for (const testId of selectedTests) {
        await fetch('/api/tutor/students/assign-test', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            studentId: selectedStudentId,
            testId,
            action: 'add',
            showExplanation: assignShowExplanation
          })
        })
      }

      setAssignedTests(prev => [...new Set([...prev, ...selectedTests])])

      if (subject === 'Math') {
        setSelectedMathTests([])
      } else {
        setSelectedRWTests([])
      }

      toast.success(`${selectedTests.length} test(s) assigned successfully`)
      fetchStudents()
    } catch (err) {
      toast.error('Failed to assign tests')
    }
  }

  const handleUnassignSelected = async (subject) => {
    const selectedTests = subject === 'Math' ? selectedMathTests : selectedRWTests

    if (selectedTests.length === 0) {
      toast.error('Please select tests to unassign')
      return
    }

    try {
      const token = localStorage.getItem('token')

      for (const testId of selectedTests) {
        await fetch('/api/tutor/students/assign-test', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            studentId: selectedStudentId,
            testId,
            action: 'remove'
          })
        })
      }

      setAssignedTests(prev => prev.filter(id => !selectedTests.includes(id)))

      if (subject === 'Math') {
        setSelectedMathTests([])
      } else {
        setSelectedRWTests([])
      }

      toast.success(`${selectedTests.length} test(s) unassigned successfully`)
      fetchStudents()
    } catch (err) {
      toast.error('Failed to unassign tests')
    }
  }

  const getStudentTestCounts = (student) => {
    const assignedTestIds = student.assignedTests || []
    const mathCount = tests.filter(t => t.subject === 'Math' && assignedTestIds.includes(t._id)).length
    const rwCount = tests.filter(t => t.subject === 'Reading and Writing' && assignedTestIds.includes(t._id)).length
    return { mathCount, rwCount }
  }

  const filteredStudents = students.filter(student => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      student.name?.toLowerCase().includes(search) ||
      student.email?.toLowerCase().includes(search)
    )
  })

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiUsers className="h-5 w-5" />
            </span>
            My Students
          </h1>
          <p className="mt-1 text-sm text-slate-500">View and manage your assigned students</p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <FiAlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Search */}
        <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Students List */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-bold text-slate-900">
              Students <span className="text-slate-400">({filteredStudents.length})</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Student</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tutor(s)</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Math Tests</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">R&amp;W Tests</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Joined</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
                        <span className="text-sm text-slate-400">Loading students...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16">
                      <div className="flex flex-col items-center justify-center gap-2 text-center">
                        <FiUsers className="h-10 w-10 text-slate-300" />
                        <p className="text-sm font-medium text-slate-500">
                          {searchTerm ? 'No students match your search' : 'No students assigned to you yet'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const { mathCount, rwCount } = getStudentTestCounts(student)
                    const tutorNames = (student.assignedTutorDetails || [])
                      .map(t => t?.name)
                      .filter(Boolean)
                    return (
                      <tr key={student._id} className="transition-colors hover:bg-indigo-50/40">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                              <FiUser className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900">{student.name || 'Unknown'}</div>
                              <div className="truncate text-xs text-slate-400">{student.email || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {tutorNames.length > 0 ? (
                            <div className="flex flex-col gap-0.5 text-sm text-slate-600">
                              {tutorNames.map((n, i) => (
                                <span key={i}>{n}</span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleViewAssignedTests(student, 'Math')}
                            className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-200"
                          >
                            {mathCount} Tests
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleViewAssignedTests(student, 'Reading and Writing')}
                            className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-200"
                          >
                            {rwCount} Tests
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            student.isActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {student.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <FiCalendar className="h-3.5 w-3.5 text-slate-400" />
                            {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : '—'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => router.push(`/tutor/students/${student._id}/performance`)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                            >
                              <FiBarChart2 className="h-4 w-4" /> Performance
                            </button>
                            <button
                              onClick={() => handleOpenAssignModal(student)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                            >
                              <FiUserPlus className="h-4 w-4" /> Assign Tests
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* View Assigned Tests Modal */}
        {showAssignedTestsModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            onClick={() => setShowAssignedTestsModal(false)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-6">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    <FiBookOpen className="h-5 w-5 text-indigo-600" />
                    Assigned {selectedTestSubject === 'Reading and Writing' ? 'R&W' : selectedTestSubject} Tests
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">Tests assigned to {selectedStudentName}</p>
                </div>
                <button
                  onClick={() => setShowAssignedTestsModal(false)}
                  className="text-slate-400 transition-colors hover:text-slate-600"
                  aria-label="Close"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingAssignedTests ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
                    <span className="text-sm text-slate-400">Loading tests...</span>
                  </div>
                ) : selectedStudentTests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <FiBookOpen className="h-10 w-10 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">
                      No {selectedTestSubject === 'Reading and Writing' ? 'R&W' : selectedTestSubject} tests assigned
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedStudentTests.map((test) => (
                      <div key={test._id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-slate-900">{test.title || 'Untitled Test'}</div>
                            <div className="mt-0.5 text-xs text-slate-400">
                              Created {test.createdAt ? new Date(test.createdAt).toLocaleDateString() : '—'}
                            </div>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-2">
                            <span className="text-sm text-slate-500">
                              {test.questions?.length || 0} questions
                            </span>
                            {test.isTimed ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                <FiClock className="h-3 w-3" /> {test.duration ?? '—'} min
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                                Untimed
                              </span>
                            )}
                            <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">
                              {test.subject === 'Reading and Writing' ? 'R&W' : (test.subject || '—')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 p-4">
                <button
                  onClick={() => setShowAssignedTestsModal(false)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Tests Modal */}
        {showAssignModal && selectedStudentId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            onClick={() => setShowAssignModal(false)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="flex max-h-[85vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-6">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    <FiUserPlus className="h-5 w-5 text-indigo-600" />
                    Assign Test Sheets
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">Select tests to assign to {selectedStudentName}</p>
                </div>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-slate-400 transition-colors hover:text-slate-600"
                  aria-label="Close"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingTests ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
                    <span className="text-sm text-slate-400">Loading tests...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Math Tests Column */}
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="border-b border-indigo-100 bg-indigo-50 px-4 py-3">
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="flex items-center gap-2 text-base font-semibold text-indigo-900">
                            <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
                            Math Tests ({tests.filter(t => t.subject === 'Math').length})
                          </h3>
                          {tests.filter(t => t.subject === 'Math').length > 0 && (
                            <label className="flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedMathTests.length === tests.filter(t => t.subject === 'Math').length && tests.filter(t => t.subject === 'Math').length > 0}
                                onChange={handleSelectAllMath}
                                className="h-4 w-4 rounded text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                              />
                              <span className="text-sm font-medium text-indigo-900">Select All</span>
                            </label>
                          )}
                        </div>
                        {selectedMathTests.length > 0 && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAssignSelected('Math')}
                              className="flex-1 rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
                            >
                              Assign Selected ({selectedMathTests.length})
                            </button>
                            <button
                              onClick={() => handleUnassignSelected('Math')}
                              className="flex-1 rounded bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-200"
                            >
                              Unassign Selected ({selectedMathTests.length})
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="max-h-96 space-y-2 overflow-y-auto p-4">
                        {tests.filter(t => t.subject === 'Math').length === 0 ? (
                          <div className="py-8 text-center text-sm text-slate-400">No Math tests available</div>
                        ) : (
                          tests.filter(t => t.subject === 'Math').map((test) => {
                            const isAssigned = assignedTests.includes(test._id)
                            const isSelected = selectedMathTests.includes(test._id)
                            return (
                              <div
                                key={test._id}
                                className={`rounded-lg border p-3 transition-colors ${
                                  isAssigned ? 'border-indigo-200 bg-indigo-50' :
                                  isSelected ? 'border-indigo-300 bg-indigo-50' :
                                  'border-slate-200 bg-white hover:border-indigo-300'
                                }`}
                              >
                                <label className="flex cursor-pointer items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleMathTest(test._id)}
                                    className="mt-1 h-4 w-4 rounded text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <div className="text-sm font-medium text-slate-900">{test.title || 'Untitled Test'}</div>
                                      {isAssigned && (
                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                          Assigned
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-500">
                                      {test.questions?.length || 0} questions • {test.isTimed ? `${test.duration ?? '—'} min` : 'Untimed'}
                                    </div>
                                  </div>
                                </label>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>

                    {/* Reading & Writing Tests Column */}
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="border-b border-purple-100 bg-purple-50 px-4 py-3">
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="flex items-center gap-2 text-base font-semibold text-purple-900">
                            <span className="h-2 w-2 rounded-full bg-purple-600"></span>
                            Reading &amp; Writing Tests ({tests.filter(t => t.subject === 'Reading and Writing').length})
                          </h3>
                          {tests.filter(t => t.subject === 'Reading and Writing').length > 0 && (
                            <label className="flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedRWTests.length === tests.filter(t => t.subject === 'Reading and Writing').length && tests.filter(t => t.subject === 'Reading and Writing').length > 0}
                                onChange={handleSelectAllRW}
                                className="h-4 w-4 rounded text-purple-600 focus:ring-2 focus:ring-purple-500"
                              />
                              <span className="text-sm font-medium text-purple-900">Select All</span>
                            </label>
                          )}
                        </div>
                        {selectedRWTests.length > 0 && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAssignSelected('Reading and Writing')}
                              className="flex-1 rounded bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-700"
                            >
                              Assign Selected ({selectedRWTests.length})
                            </button>
                            <button
                              onClick={() => handleUnassignSelected('Reading and Writing')}
                              className="flex-1 rounded bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-200"
                            >
                              Unassign Selected ({selectedRWTests.length})
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="max-h-96 space-y-2 overflow-y-auto p-4">
                        {tests.filter(t => t.subject === 'Reading and Writing').length === 0 ? (
                          <div className="py-8 text-center text-sm text-slate-400">No Reading &amp; Writing tests available</div>
                        ) : (
                          tests.filter(t => t.subject === 'Reading and Writing').map((test) => {
                            const isAssigned = assignedTests.includes(test._id)
                            const isSelected = selectedRWTests.includes(test._id)
                            return (
                              <div
                                key={test._id}
                                className={`rounded-lg border p-3 transition-colors ${
                                  isAssigned ? 'border-purple-200 bg-purple-50' :
                                  isSelected ? 'border-purple-300 bg-purple-50' :
                                  'border-slate-200 bg-white hover:border-purple-300'
                                }`}
                              >
                                <label className="flex cursor-pointer items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleRWTest(test._id)}
                                    className="mt-1 h-4 w-4 rounded text-purple-600 focus:ring-2 focus:ring-purple-500"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <div className="text-sm font-medium text-slate-900">{test.title || 'Untitled Test'}</div>
                                      {isAssigned && (
                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                          Assigned
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-500">
                                      {test.questions?.length || 0} questions • {test.isTimed ? `${test.duration ?? '—'} min` : 'Untimed'}
                                    </div>
                                  </div>
                                </label>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 border-t border-slate-100 p-4">
                <label className="flex flex-1 cursor-pointer select-none items-center gap-2">
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
                  className="rounded-lg border border-slate-300 px-6 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
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
