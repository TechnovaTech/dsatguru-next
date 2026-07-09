'use client'
import { useState, useEffect } from 'react'
import { FiPlus, FiEdit, FiTrash2, FiPlay, FiPause, FiUsers, FiFileText, FiUserPlus, FiSearch, FiX, FiCheck } from 'react-icons/fi'
import { useConfirm } from '../ui/UIProvider'

export default function TestManagement() {
  const confirm = useConfirm()
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTest, setEditingTest] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    isActive: true,
    sections: { math: true, rw: true },
    configType: 'standard',
    customConfig: {
      rw: {
        routing: { 
          low: { min: 0, max: 11 },
          medium: { min: 12, max: 20 },
          high: { min: 21, max: 27 }
        },
        distribution: {
          low: { easy: 50, medium: 30, hard: 20 },
          medium: { easy: 20, medium: 45, hard: 35 },
          high: { easy: 20, medium: 10, hard: 70 }
        }
      },
      math: {
        routing: { 
          low: { min: 0, max: 9 },
          medium: { min: 10, max: 16 },
          high: { min: 17, max: 22 }
        },
        distribution: {
          low: { easy: 50, medium: 30, hard: 20 },
          medium: { easy: 20, medium: 45, hard: 35 },
          high: { easy: 20, medium: 10, hard: 70 }
        }
      }
    }
  })

  useEffect(() => {
    fetchTests()
  }, [])

  const fetchTests = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const response = await fetch('/api/admin/tests', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (response.ok) {
        const data = await response.json()
        setTests(data)
      }
    } catch (error) {
      console.error('Error fetching tests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = editingTest 
        ? `/api/admin/tests/${editingTest._id}`
        : '/api/admin/tests'
      
      const method = editingTest ? 'PUT' : 'POST'
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        fetchTests()
        setShowModal(false)
        setEditingTest(null)
        resetForm()
      }
    } catch (error) {
      console.error('Error saving test:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      isActive: true,
      sections: { math: true, rw: true },
      configType: 'standard',
      customConfig: {
        rw: {
          routing: { 
            low: { min: 0, max: 11 },
            medium: { min: 12, max: 20 },
            high: { min: 21, max: 27 }
          },
          distribution: {
            low: { easy: 50, medium: 30, hard: 20 },
            medium: { easy: 20, medium: 45, hard: 35 },
            high: { easy: 20, medium: 10, hard: 70 }
          }
        },
        math: {
          routing: { 
            low: { min: 0, max: 9 },
            medium: { min: 10, max: 16 },
            high: { min: 17, max: 22 }
          },
          distribution: {
            low: { easy: 50, medium: 30, hard: 20 },
            medium: { easy: 20, medium: 45, hard: 35 },
            high: { easy: 20, medium: 10, hard: 70 }
          }
        }
      }
    })
  }

  const handleEdit = (test) => {
    setEditingTest(test)
    setFormData({
      title: test.title,
      isActive: test.isActive,
      sections: test.sections || { math: true, rw: true },
      configType: test.configType || 'standard',
      customConfig: test.customConfig || {
        rw: {
          routing: { 
            low: { min: 0, max: 11 },
            medium: { min: 12, max: 20 },
            high: { min: 21, max: 27 }
          },
          distribution: {
            low: { easy: 50, medium: 30, hard: 20 },
            medium: { easy: 20, medium: 45, hard: 35 },
            high: { easy: 20, medium: 10, hard: 70 }
          }
        },
        math: {
          routing: { 
            low: { min: 0, max: 9 },
            medium: { min: 10, max: 16 },
            high: { min: 17, max: 22 }
          },
          distribution: {
            low: { easy: 50, medium: 30, hard: 20 },
            medium: { easy: 20, medium: 45, hard: 35 },
            high: { easy: 20, medium: 10, hard: 70 }
          }
        }
      }
    })
    setShowModal(true)
  }

  const handleDelete = async (testId) => {
    if (await confirm({ message: 'Are you sure you want to delete this test?', tone: 'danger', confirmText: 'Delete' })) {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const response = await fetch(`/api/admin/tests/${testId}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        if (response.ok) {
          fetchTests()
        }
      } catch (error) {
        console.error('Error deleting test:', error)
      }
    }
  }

  // Assign to student state
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assigningTest, setAssigningTest] = useState(null)
  const [allStudents, setAllStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  // Set of student ids the currently-open test is assigned to (resolved in one query).
  const [assignedStudentIds, setAssignedStudentIds] = useState(new Set())
  const [studentSearch, setStudentSearch] = useState('')
  const [assignSuccess, setAssignSuccess] = useState('')
  const [assignError, setAssignError] = useState('')

  const handleOpenAssignModal = async (test) => {
    setAssigningTest(test)
    setShowAssignModal(true)
    setLoadingStudents(true)
    setStudentSearch('')
    setAssignSuccess('')
    setAssignError('')
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      // Fetch the full student roster and this test's assigned students in parallel —
      // ONE query each, instead of one /assigned-tests request per student (N+1 storm).
      const [studentsRes, assignedRes] = await Promise.all([
        fetch('/api/admin/users?role=Student', { headers }),
        fetch(`/api/admin/tests/${test._id}/assigned-students`, { headers }),
      ])
      if (studentsRes.ok) {
        setAllStudents(await studentsRes.json())
      }
      if (assignedRes.ok) {
        const data = await assignedRes.json()
        setAssignedStudentIds(new Set((data.students || []).map(s => String(s._id))))
      } else {
        setAssignedStudentIds(new Set())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingStudents(false)
    }
  }

  const handleToggleAssign = async (studentId, testId) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const isAssigned = assignedStudentIds.has(String(studentId))
    try {
      const res = await fetch('/api/admin/students/assign-test', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ studentId, testId, action: isAssigned ? 'remove' : 'add', showExplanation: true })
      })
      if (res.ok) {
        setAssignedStudentIds(prev => {
          const next = new Set(prev)
          if (isAssigned) next.delete(String(studentId))
          else next.add(String(studentId))
          return next
        })
        setAssignSuccess(isAssigned ? 'Test unassigned' : 'Test assigned successfully')
        setTimeout(() => setAssignSuccess(''), 3000)
      }
    } catch (err) {
      setAssignError('Failed to update assignment')
      setTimeout(() => setAssignError(''), 3000)
    }
  }

  const toggleTestStatus = async (testId, currentStatus) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const response = await fetch(`/api/admin/tests/${testId}/toggle-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ isActive: !currentStatus })
      })
      if (response.ok) {
        fetchTests()
      }
    } catch (error) {
      console.error('Error toggling test status:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-slate-200 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900">📋 Adaptive Test Management</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
        >
          <FiPlus /> Create Test
        </button>
        </div>

      {/* Tests Grid */}
      {tests.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm py-12 text-center">
          <FiFileText className="mx-auto text-4xl text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-2">No Tests Yet</h3>
          <p className="text-slate-400 text-sm">Create your first adaptive test to get started.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tests.map((test) => (
          <div key={test._id} className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <FiFileText className="text-indigo-600" />
                <h3 className="text-lg font-semibold text-slate-900">{test.title}</h3>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleOpenAssignModal(test)}
                  className="text-indigo-600 hover:text-indigo-800"
                  title="Assign to Student"
                >
                  <FiUserPlus />
                </button>
                <button
                  onClick={() => toggleTestStatus(test._id, test.isActive)}
                  className={`${test.isActive ? 'text-amber-600' : 'text-emerald-600'} hover:opacity-80`}
                  title={test.isActive ? 'Deactivate' : 'Activate'}
                >
                  {test.isActive ? <FiPause /> : <FiPlay />}
                </button>
                <button
                  onClick={() => handleEdit(test)}
                  className="text-slate-500 hover:text-indigo-600"
                >
                  <FiEdit />
                </button>
                <button
                  onClick={() => handleDelete(test._id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
            <p className="text-slate-500 text-sm mb-4">{test.description}</p>

            <div className="space-y-3 text-sm">
              <div className="font-semibold text-slate-700">Sections</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-700">Reading & Writing</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${test.sections?.rw ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {test.sections?.rw ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="text-slate-600">Base Module: 27 Q • 32 min</div>
                  <div className="text-slate-600">Adaptive Module: 27 Q • 32 min</div>
                </div>
                <div className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-700">Math</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${test.sections?.math ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {test.sections?.math ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="text-slate-600">Base Module: 22 Q • 35 min</div>
                  <div className="text-slate-600">Adaptive Module: 22 Q • 35 min</div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                test.isActive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {test.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Assign to Student Modal */}
      {showAssignModal && assigningTest && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50" onClick={() => setShowAssignModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full h-[80vh] flex flex-col overflow-hidden m-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-lg text-slate-900">Assign "{assigningTest.title}" to Students</h3>
              <button onClick={() => setShowAssignModal(false)} aria-label="Close" className="text-slate-400 hover:text-slate-600 transition-colors"><FiX size={24} /></button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <label htmlFor="assign-student-search" className="sr-only">Search students</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="assign-student-search"
                  type="text"
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  placeholder="Search students..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              {assignSuccess && <p className="text-emerald-600 text-sm mt-2 flex items-center gap-1"><FiCheck /> {assignSuccess}</p>}
              {assignError && <p className="text-red-600 text-sm mt-2">{assignError}</p>}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingStudents ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                  <p className="mt-3 text-sm text-slate-500">Loading students...</p>
                </div>
              ) : (() => {
                const filtered = allStudents
                  .filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase()))
                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center">
                      <FiUsers className="mx-auto text-4xl text-slate-400 mb-4" />
                      <h4 className="text-base font-semibold text-slate-600 mb-1">No Students Found</h4>
                      <p className="text-slate-400 text-sm">{studentSearch ? 'Try a different search term.' : 'There are no students to assign.'}</p>
                    </div>
                  )
                }
                return (
                <div className="space-y-2">
                  {filtered
                    .map(student => {
                      const isAssigned = assignedStudentIds.has(String(student._id))
                      return (
                        <div key={student._id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-indigo-50/40 transition-colors">
                          <div>
                            <p className="font-medium text-sm text-slate-900">{student.name}</p>
                            <p className="text-xs text-slate-500">{student.email}</p>
                          </div>
                          <button
                            onClick={() => handleToggleAssign(student._id, assigningTest._id)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              isAssigned ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 'bg-indigo-600 text-white hover:bg-indigo-700'
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
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 overflow-y-auto"
          onClick={() => { setShowModal(false); setEditingTest(null); resetForm() }}
        >
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-4xl max-h-screen overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">
                {editingTest ? 'Edit Test' : 'Create New Test'}
              </h2>
              <button
                type="button"
                onClick={() => { setShowModal(false); setEditingTest(null); resetForm() }}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <FiX size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 mb-4">
                <div>
                  <label htmlFor="test-title" className="block text-sm font-medium text-slate-700 mb-1">Test Name</label>
                  <input
                    id="test-title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g., DSAT Mock Test 1"
                    required
                  />
                </div>
                {/* Configuration Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Test Configuration</label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                      formData.configType === 'standard'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}>
                      <input
                        type="radio"
                        name="configType"
                        value="standard"
                        checked={formData.configType === 'standard'}
                        onChange={(e) => setFormData({ ...formData, configType: e.target.value })}
                        className="mr-2"
                      />
                      <span className="font-semibold text-slate-900">Standard SAT</span>
                      <p className="text-xs text-slate-500 mt-1">Official College Board thresholds</p>
                    </label>
                    <label className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                      formData.configType === 'custom'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}>
                      <input
                        type="radio"
                        name="configType"
                        value="custom"
                        checked={formData.configType === 'custom'}
                        onChange={(e) => setFormData({ ...formData, configType: e.target.value })}
                        className="mr-2"
                      />
                      <span className="font-semibold text-slate-900">Custom Configuration</span>
                      <p className="text-xs text-slate-500 mt-1">Customize routing ranges & difficulty</p>
                    </label>
                  </div>
                </div>

                {/* Custom Configuration Settings */}
                {formData.configType === 'custom' && (
                  <div className="border-2 border-indigo-200 rounded-lg p-4 bg-indigo-50">
                    <h3 className="font-semibold text-lg mb-4 text-slate-900">Custom Configuration Settings</h3>

                    {/* Reading & Writing Config */}
                    <div className="mb-6">
                      <h4 className="font-medium text-md mb-3 text-indigo-900">📖 Reading & Writing (27 questions)</h4>

                      {/* Routing Ranges */}
                      <div className="bg-white rounded-lg p-3 mb-3 border border-slate-100">
                        <p className="text-sm font-medium mb-3 text-slate-700">Module 2 Routing Ranges</p>
                        {['low', 'medium', 'high'].map((path) => (
                          <div key={path} className="mb-3">
                            <label className="text-xs font-medium text-slate-700 capitalize block mb-1">{path} Difficulty Path</label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-slate-500">Min Score</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="27"
                                  value={formData.customConfig.rw.routing[path].min}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    customConfig: {
                                      ...formData.customConfig,
                                      rw: {
                                        ...formData.customConfig.rw,
                                        routing: {
                                          ...formData.customConfig.rw.routing,
                                          [path]: { ...formData.customConfig.rw.routing[path], min: parseInt(e.target.value) }
                                        }
                                      }
                                    }
                                  })}
                                  className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-500">Max Score</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="27"
                                  value={formData.customConfig.rw.routing[path].max}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    customConfig: {
                                      ...formData.customConfig,
                                      rw: {
                                        ...formData.customConfig.rw,
                                        routing: {
                                          ...formData.customConfig.rw.routing,
                                          [path]: { ...formData.customConfig.rw.routing[path], max: parseInt(e.target.value) }
                                        }
                                      }
                                    }
                                  })}
                                  className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Difficulty Distribution */}
                      <div className="bg-white rounded-lg p-3 border border-slate-100">
                        <p className="text-sm font-medium mb-2 text-slate-700">Module 2 Difficulty Distribution (%)</p>
                        {['low', 'medium', 'high'].map((path) => (
                          <div key={path} className="mb-2">
                            <label className="text-xs font-medium text-slate-700 capitalize">{path} Path:</label>
                            <div className="grid grid-cols-3 gap-2">
                              {['easy', 'medium', 'hard'].map((diff) => (
                                <div key={diff}>
                                  <label className="text-xs text-slate-500 capitalize">{diff}</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.customConfig.rw.distribution[path][diff]}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      customConfig: {
                                        ...formData.customConfig,
                                        rw: {
                                          ...formData.customConfig.rw,
                                          distribution: {
                                            ...formData.customConfig.rw.distribution,
                                            [path]: {
                                              ...formData.customConfig.rw.distribution[path],
                                              [diff]: parseInt(e.target.value)
                                            }
                                          }
                                        }
                                      }
                                    })}
                                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Math Config */}
                    <div>
                      <h4 className="font-medium text-md mb-3 text-indigo-900">🔢 Math (22 questions)</h4>

                      {/* Routing Ranges */}
                      <div className="bg-white rounded-lg p-3 mb-3 border border-slate-100">
                        <p className="text-sm font-medium mb-3 text-slate-700">Module 2 Routing Ranges</p>
                        {['low', 'medium', 'high'].map((path) => (
                          <div key={path} className="mb-3">
                            <label className="text-xs font-medium text-slate-700 capitalize block mb-1">{path} Difficulty Path</label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-slate-500">Min Score</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="22"
                                  value={formData.customConfig.math.routing[path].min}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    customConfig: {
                                      ...formData.customConfig,
                                      math: {
                                        ...formData.customConfig.math,
                                        routing: {
                                          ...formData.customConfig.math.routing,
                                          [path]: { ...formData.customConfig.math.routing[path], min: parseInt(e.target.value) }
                                        }
                                      }
                                    }
                                  })}
                                  className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-500">Max Score</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="22"
                                  value={formData.customConfig.math.routing[path].max}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    customConfig: {
                                      ...formData.customConfig,
                                      math: {
                                        ...formData.customConfig.math,
                                        routing: {
                                          ...formData.customConfig.math.routing,
                                          [path]: { ...formData.customConfig.math.routing[path], max: parseInt(e.target.value) }
                                        }
                                      }
                                    }
                                  })}
                                  className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Difficulty Distribution */}
                      <div className="bg-white rounded-lg p-3 border border-slate-100">
                        <p className="text-sm font-medium mb-2 text-slate-700">Module 2 Difficulty Distribution (%)</p>
                        {['low', 'medium', 'high'].map((path) => (
                          <div key={path} className="mb-2">
                            <label className="text-xs font-medium text-slate-700 capitalize">{path} Path:</label>
                            <div className="grid grid-cols-3 gap-2">
                              {['easy', 'medium', 'hard'].map((diff) => (
                                <div key={diff}>
                                  <label className="text-xs text-slate-500 capitalize">{diff}</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.customConfig.math.distribution[path][diff]}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      customConfig: {
                                        ...formData.customConfig,
                                        math: {
                                          ...formData.customConfig.math,
                                          distribution: {
                                            ...formData.customConfig.math.distribution,
                                            [path]: {
                                              ...formData.customConfig.math.distribution[path],
                                              [diff]: parseInt(e.target.value)
                                            }
                                          }
                                        }
                                      }
                                    })}
                                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.sections.rw}
                      onChange={(e) => setFormData({ ...formData, sections: { ...formData.sections, rw: e.target.checked } })}
                    />
                    <span>Enable Reading & Writing</span>
                  </label>
                  <label className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.sections.math}
                      onChange={(e) => setFormData({ ...formData, sections: { ...formData.sections, math: e.target.checked } })}
                    />
                    <span>Enable Math</span>
                  </label>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-slate-700">Active Test</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingTest(null)
                    resetForm()
                  }}
                  className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {editingTest ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
