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
  const [assignShowExplanation, setAssignShowExplanation] = useState(false)

  // Tutor list popup for student
  const [tutorPopup, setTutorPopup] = useState(null) // student object

  useEffect(() => {
    fetchUsers()
  }, [activeTab])

  // Close any open modal on Escape
  useEffect(() => {
    const anyOpen = showAssignModal || showAssignTestsModal || tutorPopup
    if (!anyOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setShowAssignModal(false)
        setShowAssignTestsModal(false)
        setTutorPopup(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showAssignModal, showAssignTestsModal, tutorPopup])

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
        const assigned = students.filter(s =>
          (s.assignedTutors || []).map(id => id?.toString()).includes(tutor._id?.toString())
        )
        setAssignedStudents(assigned.map(s => s._id?.toString()))
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
      const isCurrentlyAssigned = assignedStudents.includes(studentId.toString())
      
      const res = await fetch(`/api/admin/users/${studentId}/assign-tutor`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tutorId: selectedTutor._id,
          action: isCurrentlyAssigned ? 'remove' : 'add'
        })
      })
      
      if (res.ok) {
        if (isCurrentlyAssigned) {
          setAssignedStudents(prev => prev.filter(id => id !== studentId.toString()))
          setSuccess('Student unassigned successfully')
        } else {
          setAssignedStudents(prev => [...prev, studentId.toString()])
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
    setAssignShowExplanation(false)
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
        body: JSON.stringify({ studentId: selectedStudent._id, testId, action: isAssigned ? 'remove' : 'add', showExplanation: assignShowExplanation })
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
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">Tutor and Students</h1>
          <p className="mt-1 text-sm text-slate-500">View and manage tutors and students</p>
        </div>

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <FiCheck /> {success}
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <FiX /> {error}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="overflow-x-auto whitespace-nowrap border-b border-slate-200">
            <nav className="-mb-px flex space-x-8">
              {user?.role !== 'Tutor' && (
                <button
                  onClick={() => setActiveTab('tutors')}
                  className={`${
                    activeTab === 'tutors'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  } flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
                >
                  <FiUser /> Tutors
                </button>
              )}
              <button
                onClick={() => setActiveTab('students')}
                className={`${
                  activeTab === 'students'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                } flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
              >
                <FiUser /> Students
              </button>
            </nav>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <label htmlFor="user-search" className="mb-1.5 block text-sm font-medium text-slate-700">Search</label>
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="user-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <h2 className="text-lg font-bold text-slate-900">
              {activeTab === 'tutors' ? 'Tutors' : 'Students'} ({filteredUsers.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
                  {activeTab === 'students' && (
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Assigned Tutor</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Joined Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={activeTab === 'tutors' ? 6 : 7} className="px-6 py-16 text-center">
                      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'tutors' ? 6 : 7} className="px-6 py-16 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiUser size={22} /></div>
                      <p className="text-sm font-medium text-slate-500">No {activeTab === 'tutors' ? 'tutors' : 'students'} found</p>
                      <p className="mt-1 text-xs text-slate-400">Try adjusting your search.</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user._id} className="transition-colors hover:bg-indigo-50/40">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
                            <FiUser className="text-indigo-600" />
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <FiMail className="text-slate-400" />
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          user.role === 'Tutor'
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      {activeTab === 'students' && (
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setTutorPopup(user)}
                            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                              user.assignedTutorDetails?.length
                                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            <FiUser className="w-3.5 h-3.5" />
                            {user.assignedTutorDetails?.length
                              ? `${user.assignedTutorDetails.length} Tutor${user.assignedTutorDetails.length > 1 ? 's' : ''}`
                              : 'No Tutor'}
                          </button>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          user.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <FiCalendar className="text-slate-400" />
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                        </div>
                      </td>
                      {activeTab === 'tutors' ? (
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleOpenAssignModal(user)}
                            className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            <FiUserPlus className="mr-1" /> Assign Students
                          </button>
                        </td>
                      ) : (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenAssignTestsModal(user)}
                              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                            >
                              <FiUserPlus className="w-3.5 h-3.5" /> Assign Tests
                            </button>
                            <button
                              onClick={() => router.push(`/admin/tutor/students/${user._id}/performance`)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
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

        {/* Tutor List Popup for Student */}
        {tutorPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setTutorPopup(null)}>
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Assigned Tutors</h2>
                  <p className="mt-0.5 text-sm text-slate-500">{tutorPopup.name}</p>
                </div>
                <button onClick={() => setTutorPopup(null)} aria-label="Close" className="text-slate-400 hover:text-slate-600">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                {tutorPopup.assignedTutorDetails?.length ? (
                  <div className="space-y-2">
                    {tutorPopup.assignedTutorDetails.map((t, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100">
                          <FiUser className="text-indigo-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                          <div className="text-xs text-slate-500">{t.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiUser size={22} /></div>
                    <p className="text-sm text-slate-400">No tutors assigned yet.</p>
                  </div>
                )}
              </div>
              <div className="border-t border-slate-100 p-4">
                <button onClick={() => setTutorPopup(null)} className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Students Modal */}
        {showAssignModal && selectedTutor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setShowAssignModal(false)}>
            <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-100 p-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Assign Students to {selectedTutor.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">Select students to assign to this tutor</p>
                </div>
                <button onClick={() => setShowAssignModal(false)} aria-label="Close" className="text-slate-400 hover:text-slate-600">
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="border-b border-slate-100 p-4">
                <label htmlFor="assign-student-search" className="sr-only">Search students</label>
                <div className="relative">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="assign-student-search"
                    type="text"
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    placeholder="Search students..."
                    className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {loadingStudents ? (
                  <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" /></div>
                ) : filteredStudentsForAssign.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiUser size={22} /></div>
                    <p className="text-sm text-slate-400">No students found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredStudentsForAssign.map((student) => {
                      const isAssigned = assignedStudents.includes(student._id?.toString())
                      const hasOtherTutor = false

                      return (
                        <div
                          key={student._id}
                          className={`flex items-center justify-between rounded-lg border p-4 ${
                            isAssigned ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                              <FiUser className="text-indigo-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{student.name}</div>
                              <div className="text-sm text-slate-500">{student.email}</div>
                              {(student.assignedTutors || []).length > 0 && (
                                <div className="mt-1 text-xs text-indigo-600">
                                  {(student.assignedTutors || []).length} tutor(s) assigned
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleToggleStudentAssignment(student._id)}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                              isAssigned
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                          >
                            {isAssigned ? 'Unassign' : 'Assign'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 bg-slate-50 p-4">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Assign Tests to Student Modal */}
        {showAssignTestsModal && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setShowAssignTestsModal(false)}>
            <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-100 p-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Assign Tests to {selectedStudent.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{studentAssignedTests.length} test(s) currently assigned</p>
                </div>
                <button onClick={() => setShowAssignTestsModal(false)} aria-label="Close" className="text-slate-400 hover:text-slate-600">
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
                <div className="relative min-w-48 flex-1">
                  <label htmlFor="assign-test-search" className="sr-only">Search tests</label>
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="assign-test-search"
                    type="text"
                    value={testSearch}
                    onChange={e => setTestSearch(e.target.value)}
                    placeholder="Search tests..."
                    className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-2">
                  {['All', 'Math', 'Reading and Writing'].map(s => (
                    <button key={s} onClick={() => setTestSubjectFilter(s)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        testSubjectFilter === s ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 text-slate-600 hover:border-indigo-400'
                      }`}>
                      {s === 'Reading and Writing' ? 'R&W' : s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {loadingTests ? (
                  <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" /></div>
                ) : (() => {
                  const filtered = allTests.filter(t => {
                    if (t.isReassigned) return false
                    if (testSubjectFilter !== 'All' && t.subject !== testSubjectFilter) return false
                    if (testSearch && !t.title.toLowerCase().includes(testSearch.toLowerCase())) return false
                    return true
                  })
                  return filtered.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiBarChart2 size={22} /></div>
                      <p className="text-sm text-slate-400">No tests found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filtered.map(test => {
                        const isAssigned = studentAssignedTests.includes(test._id.toString())
                        return (
                          <div key={test._id} className={`flex items-center justify-between rounded-lg border p-4 ${isAssigned ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-slate-900">{test.title}</div>
                              <div className="mt-1 flex items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${test.subject === 'Math' ? 'bg-blue-50 text-blue-700' : 'bg-indigo-50 text-indigo-700'}`}>
                                  {test.subject === 'Reading and Writing' ? 'R&W' : test.subject}
                                </span>
                                <span className="text-xs text-slate-500">{test.questions?.length || 0} questions</span>
                                {test.isTimed && <span className="text-xs text-slate-500">{test.duration} min</span>}
                                {isAssigned && <span className="text-xs font-medium text-emerald-600">✓ Assigned</span>}
                              </div>
                            </div>
                            <button
                              onClick={() => handleToggleTestAssignment(test._id)}
                              className={`ml-4 flex-shrink-0 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                                isAssigned ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-indigo-600 text-white hover:bg-indigo-700'
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

              <div className="flex items-center gap-4 border-t border-slate-100 bg-slate-50 p-4">
                <label className="flex flex-1 cursor-pointer select-none items-center gap-2">
                  <input
                    type="checkbox"
                    checked={assignShowExplanation}
                    onChange={e => setAssignShowExplanation(e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">Show explanation on analysis page</span>
                </label>
                <button onClick={() => setShowAssignTestsModal(false)} className="rounded-lg border border-slate-300 px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
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
