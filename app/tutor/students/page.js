'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../components/AuthContext'
import { useRouter } from 'next/navigation'
import { FiSearch, FiUser, FiMail, FiCalendar, FiUserPlus, FiX, FiCheck, FiClock } from 'react-icons/fi'

export default function TutorStudents() {
  const { user } = useAuth()
  const router = useRouter()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Tests data
  const [tests, setTests] = useState([])
  
  // Assign tests modal
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState(null)
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
      setError('Failed to load assigned tests')
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
      setError('Please select tests to assign')
      setTimeout(() => setError(''), 3000)
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
      
      setSuccess(`${selectedTests.length} test(s) assigned successfully`)
      setTimeout(() => setSuccess(''), 3000)
      fetchStudents()
    } catch (err) {
      setError('Failed to assign tests')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleUnassignSelected = async (subject) => {
    const selectedTests = subject === 'Math' ? selectedMathTests : selectedRWTests
    
    if (selectedTests.length === 0) {
      setError('Please select tests to unassign')
      setTimeout(() => setError(''), 3000)
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
      
      setSuccess(`${selectedTests.length} test(s) unassigned successfully`)
      setTimeout(() => setSuccess(''), 3000)
      fetchStudents()
    } catch (err) {
      setError('Failed to unassign tests')
      setTimeout(() => setError(''), 3000)
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Students</h1>
          <p className="text-gray-600">View and manage your assigned students</p>
        </div>

        {success && (
          <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg border border-green-100 flex items-center gap-2">
            <FiCheck /> {success}
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 flex items-center gap-2">
            <FiX /> {error}
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Students List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">
              Students ({filteredStudents.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Math Tests</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">R&W Tests</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                      No students assigned to you yet
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const { mathCount, rwCount } = getStudentTestCounts(student)
                    return (
                      <tr key={student._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <FiUser className="text-blue-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{student.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FiMail className="text-gray-400" />
                            {student.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => handleViewAssignedTests(student, 'Math')}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {mathCount} Tests
                            </span>
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => handleViewAssignedTests(student, 'Reading and Writing')}
                            className="text-purple-600 hover:text-purple-800 hover:underline"
                          >
                            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                              {rwCount} Tests
                            </span>
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            student.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {student.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FiCalendar className="text-gray-400" />
                            {new Date(student.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/tutor/students/${student._id}/performance`)}
                              className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                            >
                              View Performance
                            </button>
                            <button
                              onClick={() => handleOpenAssignModal(student)}
                              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                            >
                              <FiUserPlus className="mr-2" /> Assign Tests
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Assigned {selectedTestSubject} Tests</h2>
                  <p className="text-sm text-gray-600 mt-1">Tests assigned to this student</p>
                </div>
                <button onClick={() => setShowAssignedTestsModal(false)} className="text-gray-400 hover:text-gray-600">
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingAssignedTests ? (
                  <div className="text-center py-8 text-gray-500">Loading tests...</div>
                ) : selectedStudentTests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No {selectedTestSubject} tests assigned</div>
                ) : (
                  <div className="space-y-3">
                    {selectedStudentTests.map((test) => (
                      <div key={test._id} className={`p-4 border rounded-lg ${
                        selectedTestSubject === 'Math' ? 'border-blue-200 bg-blue-50' : 'border-purple-200 bg-purple-50'
                      }`}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="font-medium text-gray-900 flex-1">{test.title}</div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm text-gray-600">
                              {test.questions?.length || 0} questions
                            </span>
                            <span className="text-gray-300">•</span>
                            {test.isTimed ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                <FiClock /> {test.duration} min
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
                                Untimed
                              </span>
                            )}
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              selectedTestSubject === 'Math' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {test.subject}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t bg-gray-50">
                <button
                  onClick={() => setShowAssignedTestsModal(false)}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Tests Modal - Similar to admin assign modal */}
        {showAssignModal && selectedStudentId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[80vh] flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Assign Test Sheets</h2>
                  <p className="text-sm text-gray-600 mt-1">Select tests to assign to this student</p>
                </div>
                <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingTests ? (
                  <div className="text-center py-8 text-gray-500">Loading tests...</div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Math Tests Column */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                            Math Tests ({tests.filter(t => t.subject === 'Math').length})
                          </h3>
                          {tests.filter(t => t.subject === 'Math').length > 0 && (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedMathTests.length === tests.filter(t => t.subject === 'Math').length && tests.filter(t => t.subject === 'Math').length > 0}
                                onChange={handleSelectAllMath}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-sm font-medium text-blue-900">Select All</span>
                            </label>
                          )}
                        </div>
                        {selectedMathTests.length > 0 && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAssignSelected('Math')}
                              className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                            >
                              Assign Selected ({selectedMathTests.length})
                            </button>
                            <button
                              onClick={() => handleUnassignSelected('Math')}
                              className="flex-1 px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200"
                            >
                              Unassign Selected ({selectedMathTests.length})
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                        {tests.filter(t => t.subject === 'Math').length === 0 ? (
                          <div className="text-center py-8 text-gray-500">No Math tests available</div>
                        ) : (
                          tests.filter(t => t.subject === 'Math').map((test) => {
                            const isAssigned = assignedTests.includes(test._id)
                            const isSelected = selectedMathTests.includes(test._id)
                            return (
                              <div
                                key={test._id}
                                className={`p-3 border rounded-lg transition-colors ${
                                  isAssigned ? 'bg-blue-50 border-blue-200' : 
                                  isSelected ? 'bg-blue-50 border-blue-300' :
                                  'bg-white border-gray-200 hover:border-blue-300'
                                }`}
                              >
                                <label className="flex items-start gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleMathTest(test._id)}
                                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <div className="font-medium text-gray-900 text-sm">{test.title}</div>
                                      {isAssigned && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                          Assigned
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                      {test.questions?.length || 0} questions • {test.isTimed ? `${test.duration} min` : 'Untimed'}
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
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                            <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                            Reading & Writing Tests ({tests.filter(t => t.subject === 'Reading and Writing').length})
                          </h3>
                          {tests.filter(t => t.subject === 'Reading and Writing').length > 0 && (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedRWTests.length === tests.filter(t => t.subject === 'Reading and Writing').length && tests.filter(t => t.subject === 'Reading and Writing').length > 0}
                                onChange={handleSelectAllRW}
                                className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                              />
                              <span className="text-sm font-medium text-purple-900">Select All</span>
                            </label>
                          )}
                        </div>
                        {selectedRWTests.length > 0 && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAssignSelected('Reading and Writing')}
                              className="flex-1 px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700"
                            >
                              Assign Selected ({selectedRWTests.length})
                            </button>
                            <button
                              onClick={() => handleUnassignSelected('Reading and Writing')}
                              className="flex-1 px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200"
                            >
                              Unassign Selected ({selectedRWTests.length})
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                        {tests.filter(t => t.subject === 'Reading and Writing').length === 0 ? (
                          <div className="text-center py-8 text-gray-500">No Reading & Writing tests available</div>
                        ) : (
                          tests.filter(t => t.subject === 'Reading and Writing').map((test) => {
                            const isAssigned = assignedTests.includes(test._id)
                            const isSelected = selectedRWTests.includes(test._id)
                            return (
                              <div
                                key={test._id}
                                className={`p-3 border rounded-lg transition-colors ${
                                  isAssigned ? 'bg-purple-50 border-purple-200' : 
                                  isSelected ? 'bg-purple-50 border-purple-300' :
                                  'bg-white border-gray-200 hover:border-purple-300'
                                }`}
                              >
                                <label className="flex items-start gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleRWTest(test._id)}
                                    className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <div className="font-medium text-gray-900 text-sm">{test.title}</div>
                                      {isAssigned && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                          Assigned
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                      {test.questions?.length || 0} questions • {test.isTimed ? `${test.duration} min` : 'Untimed'}
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

              <div className="p-4 border-t bg-gray-50 flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none flex-1">
                  <input
                    type="checkbox"
                    checked={assignShowExplanation}
                    onChange={e => setAssignShowExplanation(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Show explanation on analysis page</span>
                </label>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
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
