'use client'
import { useState, useEffect } from 'react'
import { FiSearch, FiUser, FiMail, FiCalendar, FiUserPlus, FiX, FiCheck, FiBarChart2 } from 'react-icons/fi'
import { useAuth } from '../../../components/AuthContext'
import { useRouter } from 'next/navigation'

export default function TutorAndStudents() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(user?.role === 'Tutor' ? 'students' : 'tutors')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Assign students modal
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedTutor, setSelectedTutor] = useState(null)
  const [allStudents, setAllStudents] = useState([])
  const [assignedStudents, setAssignedStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [studentSearchTerm, setStudentSearchTerm] = useState('')

  // Assign tests to student modal
  const [showAssignTestsModal, setShowAssignTestsModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [allTests, setAllTests] = useState([])
  const [studentAssignedTests, setStudentAssignedTests] = useState([])
  const [loadingTests, setLoadingTests] = useState(false)
  const [testSearch, setTestSearch] = useState('')
  const [testSubjectFilter, setTestSubjectFilter] = useState('All')

  useEffect(() => {
    fetchUsers()
  }, [activeTab])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const role = activeTab === 'tutors' ? 'Tutor' : 'Student'
      const res = await fetch(`/api/admin/users?role=${role}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      } else {
        setError('Failed to load users')
      }
    } catch (err) {
      setError('Failed to load users')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAssignModal = async (tutor) => {
    setSelectedTutor(tutor)
    setShowAssignModal(true)
    setLoadingStudents(true)
    
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/users?role=Student', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const students = await res.json()
        setAllStudents(students)
        // Filter students already assigned to this tutor
        const assigned = students.filter(s => s.assignedTutor === tutor._id)
        setAssignedStudents(assigned.map(s => s._id))
      }
    } catch (err) {
      console.error('Failed to load students', err)
    } finally {
      setLoadingStudents(false)
    }
  }

  const handleToggleStudentAssignment = async (studentId) => {
    try {
      const token = localStorage.getItem('token')
      const isCurrentlyAssigned = assignedStudents.includes(studentId)
      
      const res = await fetch(`/api/admin/users/${studentId}/assign-tutor`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tutorId: isCurrentlyAssigned ? null : selectedTutor._id
        })
      })
      
      if (res.ok) {
        if (isCurrentlyAssigned) {
          setAssignedStudents(prev => prev.filter(id => id !== studentId))
          setSuccess('Student unassigned successfully')
        } else {
          setAssignedStudents(prev => [...prev, studentId])
          setSuccess('Student assigned successfully')
        }
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update assignment')
        setTimeout(() => setError(''), 3000)
      }
    } catch (err) {
      setError('Failed to update assignment')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleOpenAssignTestsModal = async (student) => {
    setSelectedStudent(student)
    setShowAssignTestsModal(true)
    setLoadingTests(true)
    setTestSearch('')
    setTestSubjectFilter('All')
    try {
      const token = localStorage.getItem('token')
      const [testsRes, assignedRes] = await Promise.all([
        fetch('/api/admin/tutor/tests/list', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/students/${student._id}/assigned-tests`, { headers: { Authorization: `Bearer ${token}` } })
      ])
      if (testsRes.ok) setAllTests(await testsRes.json())
      if (assignedRes.ok) {
        const d = await assignedRes.json()
        setStudentAssignedTests((d.assignedTests || []).map(id => id.toString()))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingTests(false)
    }
  }

  const handleToggleTestAssignment = async (testId) => {
    const token = localStorage.getItem('token')
    const isAssigned = studentAssignedTests.includes(testId.toString())
    try {
      const res = await fetch('/api/admin/students/assign-test', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ studentId: selectedStudent._id, testId, action: isAssigned ? 'remove' : 'add' })
      })
      if (res.ok) {
        const data = await res.json()
        setStudentAssignedTests((data.assignedTests || []).map(id => id.toString()))
        setSuccess(isAssigned ? 'Test unassigned' : 'Test assigned')
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch {
      setError('Failed to update')
      setTimeout(() => setError(''), 3000)
    }
  }

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      user.name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search)
    )
  })

  const filteredStudentsForAssign = allStudents.filter(student => {
    if (!studentSearchTerm) return true
    const search = studentSearchTerm.toLowerCase()
    return (
      student.name?.toLowerCase().includes(search) ||
      student.email?.toLowerCase().includes(search)
    )
  })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tutor and Students</h1>
          <p className="text-gray-600">View and manage tutors and students</p>
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

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {user?.role !== 'Tutor' && (
                <button
                  onClick={() => setActiveTab('tutors')}
                  className={`${
                    activeTab === 'tutors'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                >
                  <FiUser /> Tutors
                </button>
              )}
              <button
                onClick={() => setActiveTab('students')}
                className={`${
                  activeTab === 'students'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <FiUser /> Students
              </button>
            </nav>
          </div>
        </div>

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

        {/* Users List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">
              {activeTab === 'tutors' ? 'Tutors' : 'Students'} ({filteredUsers.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  {activeTab === 'students' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Tutor</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={activeTab === 'tutors' ? 6 : 6} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'tutors' ? 6 : 6} className="px-6 py-4 text-center text-sm text-gray-500">
                      No {activeTab === 'tutors' ? 'tutors' : 'students'} found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <FiUser className="text-blue-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FiMail className="text-gray-400" />
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          user.role === 'Tutor' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      {activeTab === 'students' && (
                        <td className="px-6 py-4">
                          {user.assignedTutorDetails ? (
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">{user.assignedTutorDetails.name}</div>
                              <div className="text-gray-500 text-xs">{user.assignedTutorDetails.email}</div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 italic">Not assigned</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          user.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FiCalendar className="text-gray-400" />
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      {activeTab === 'tutors' ? (
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleOpenAssignModal(user)}
                            className="inline-flex items-center px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded text-sm"
                          >
                            <FiUserPlus className="mr-1" /> Assign Students
                          </button>
                        </td>
                      ) : (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenAssignTestsModal(user)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                            >
                              <FiUserPlus className="w-3.5 h-3.5" /> Assign Tests
                            </button>
                            <button
                              onClick={() => router.push(`/admin/tutor/students/${user._id}/performance`)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                            >
                              <FiBarChart2 className="w-3.5 h-3.5" /> View Performance
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Assign Students Modal */}
        {showAssignModal && selectedTutor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Assign Students to {selectedTutor.name}</h2>
                  <p className="text-sm text-gray-600 mt-1">Select students to assign to this tutor</p>
                </div>
                <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="p-4 border-b">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    placeholder="Search students..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {loadingStudents ? (
                  <div className="text-center py-8 text-gray-500">Loading students...</div>
                ) : filteredStudentsForAssign.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No students found</div>
                ) : (
                  <div className="space-y-2">
                    {filteredStudentsForAssign.map((student) => {
                      const isAssigned = assignedStudents.includes(student._id)
                      const hasOtherTutor = student.assignedTutor && student.assignedTutor !== selectedTutor._id
                      
                      return (
                        <div
                          key={student._id}
                          className={`p-4 border rounded-lg flex items-center justify-between ${
                            isAssigned ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <FiUser className="text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{student.name}</div>
                              <div className="text-sm text-gray-600">{student.email}</div>
                              {hasOtherTutor && (
                                <div className="text-xs text-amber-600 mt-1">
                                  Already assigned to another tutor
                                </div>
                              )}
                            </div>
                          </div>
                          {hasOtherTutor && !isAssigned ? (
                            <div className="flex items-center gap-2">
                              <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium">
                                Assigned
                              </span>
                              <button
                                onClick={() => handleToggleStudentAssignment(student._id)}
                                className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
                              >
                                Unassign
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleToggleStudentAssignment(student._id)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                isAssigned
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {isAssigned ? 'Unassign' : 'Assign'}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 border-t bg-gray-50">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Assign Tests to Student Modal */}
        {showAssignTestsModal && selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Assign Tests to {selectedStudent.name}</h2>
                  <p className="text-sm text-gray-600 mt-1">{studentAssignedTests.length} test(s) currently assigned</p>
                </div>
                <button onClick={() => setShowAssignTestsModal(false)} className="text-gray-400 hover:text-gray-600">
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="p-4 border-b flex gap-3 items-center flex-wrap">
                <div className="relative flex-1 min-w-48">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={testSearch}
                    onChange={e => setTestSearch(e.target.value)}
                    placeholder="Search tests..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  {['All', 'Math', 'Reading and Writing'].map(s => (
                    <button key={s} onClick={() => setTestSubjectFilter(s)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        testSubjectFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'
                      }`}>
                      {s === 'Reading and Writing' ? 'R&W' : s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {loadingTests ? (
                  <div className="text-center py-8 text-gray-500">Loading tests...</div>
                ) : (() => {
                  const filtered = allTests.filter(t => {
                    if (t.isReassigned) return false
                    if (testSubjectFilter !== 'All' && t.subject !== testSubjectFilter) return false
                    if (testSearch && !t.title.toLowerCase().includes(testSearch.toLowerCase())) return false
                    return true
                  })
                  return filtered.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No tests found</div>
                  ) : (
                    <div className="space-y-2">
                      {filtered.map(test => {
                        const isAssigned = studentAssignedTests.includes(test._id.toString())
                        return (
                          <div key={test._id} className={`p-4 border rounded-lg flex items-center justify-between ${isAssigned ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-sm truncate">{test.title}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${test.subject === 'Math' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                  {test.subject === 'Reading and Writing' ? 'R&W' : test.subject}
                                </span>
                                <span className="text-xs text-gray-500">{test.questions?.length || 0} questions</span>
                                {test.isTimed && <span className="text-xs text-gray-500">{test.duration} min</span>}
                                {isAssigned && <span className="text-xs text-green-600 font-medium">✓ Assigned</span>}
                              </div>
                            </div>
                            <button
                              onClick={() => handleToggleTestAssignment(test._id)}
                              className={`ml-4 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
                                isAssigned ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {isAssigned ? 'Unassign' : 'Assign'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>

              <div className="p-4 border-t bg-gray-50">
                <button onClick={() => setShowAssignTestsModal(false)} className="w-full py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
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
