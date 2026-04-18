'use client'
import { useState, useEffect } from 'react'
import { FiPlus, FiEdit, FiTrash2, FiPlay, FiPause, FiUsers, FiFileText, FiUserPlus, FiSearch, FiX, FiCheck } from 'react-icons/fi'

export default function TestManagement() {
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
    if (confirm('Are you sure you want to delete this test?')) {
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
  const [studentAssignedTests, setStudentAssignedTests] = useState({})
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
      const res = await fetch('/api/admin/users?role=Student', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (res.ok) {
        const students = await res.json()
        setAllStudents(students)
        const map = {}
        await Promise.all(students.map(async (s) => {
          try {
            const r = await fetch(`/api/admin/students/${s._id}/assigned-tests`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
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
      setLoadingStudents(false)
    }
  }

  const handleToggleAssign = async (studentId, testId) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const current = studentAssignedTests[studentId] || []
    const isAssigned = current.map(id => id.toString()).includes(testId)
    try {
      const res = await fetch('/api/admin/students/assign-test', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ studentId, testId, action: isAssigned ? 'remove' : 'add', showExplanation: true })
      })
      if (res.ok) {
        const data = await res.json()
        setStudentAssignedTests(prev => ({ ...prev, [studentId]: data.assignedTests }))
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
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">📋 Test Management</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <FiPlus /> Create Test
        </button>
        </div>

      {/* Tests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tests.map((test) => (
          <div key={test._id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <FiFileText className="text-blue-600" />
                <h3 className="text-lg font-semibold">{test.title}</h3>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleOpenAssignModal(test)}
                  className="text-purple-600 hover:text-purple-800"
                  title="Assign to Student"
                >
                  <FiUserPlus />
                </button>
                <button
                  onClick={() => toggleTestStatus(test._id, test.isActive)}
                  className={`${test.isActive ? 'text-orange-600' : 'text-green-600'} hover:opacity-80`}
                  title={test.isActive ? 'Deactivate' : 'Activate'}
                >
                  {test.isActive ? <FiPause /> : <FiPlay />}
                </button>
                <button
                  onClick={() => handleEdit(test)}
                  className="text-blue-600 hover:text-blue-800"
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
            <p className="text-gray-600 text-sm mb-4">{test.description}</p>
            
            <div className="space-y-3 text-sm">
              <div className="font-semibold">Sections</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Reading & Writing</span>
                    <span className={`px-2 py-1 text-xs rounded ${test.sections?.rw ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                      {test.sections?.rw ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="text-gray-700">Base Module: 27 Q • 32 min</div>
                  <div className="text-gray-700">Adaptive Module: 27 Q • 32 min</div>
                </div>
                <div className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Math</span>
                    <span className={`px-2 py-1 text-xs rounded ${test.sections?.math ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                      {test.sections?.math ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="text-gray-700">Base Module: 22 Q • 35 min</div>
                  <div className="text-gray-700">Adaptive Module: 22 Q • 35 min</div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                test.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {test.isActive ? 'Active' : 'Inactive'}
              </span>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <FiUsers />
                <span>{test.attemptCount || 0} attempts</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Assign to Student Modal */}
      {showAssignModal && assigningTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full h-[80vh] flex flex-col overflow-hidden m-4">
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-lg">Assign "{assigningTest.title}" to Students</h3>
              <button onClick={() => setShowAssignModal(false)}><FiX size={24} /></button>
            </div>
            <div className="p-4 border-b">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  placeholder="Search students..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>
              {assignSuccess && <p className="text-green-600 text-sm mt-2 flex items-center gap-1"><FiCheck /> {assignSuccess}</p>}
              {assignError && <p className="text-red-600 text-sm mt-2">{assignError}</p>}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingStudents ? (
                <div className="text-center py-8 text-gray-500">Loading students...</div>
              ) : (
                <div className="space-y-2">
                  {allStudents
                    .filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase()))
                    .map(student => {
                      const isAssigned = (studentAssignedTests[student._id] || []).map(id => id.toString()).includes(assigningTest._id)
                      return (
                        <div key={student._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div>
                            <p className="font-medium text-sm">{student.name}</p>
                            <p className="text-xs text-gray-500">{student.email}</p>
                          </div>
                          <button
                            onClick={() => handleToggleAssign(student._id, assigningTest._id)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium ${
                              isAssigned ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 'bg-purple-600 text-white hover:bg-purple-700'
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
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-screen overflow-y-auto m-4">
            <h2 className="text-xl font-bold mb-4">
              {editingTest ? 'Edit Test' : 'Create New Test'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Name</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., DSAT Mock Test 1"
                    required
                  />
                </div>
                {/* Configuration Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Test Configuration</label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                      formData.configType === 'standard' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}>
                      <input
                        type="radio"
                        name="configType"
                        value="standard"
                        checked={formData.configType === 'standard'}
                        onChange={(e) => setFormData({ ...formData, configType: e.target.value })}
                        className="mr-2"
                      />
                      <span className="font-semibold">Standard SAT</span>
                      <p className="text-xs text-gray-600 mt-1">Official College Board thresholds</p>
                    </label>
                    <label className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                      formData.configType === 'custom' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}>
                      <input
                        type="radio"
                        name="configType"
                        value="custom"
                        checked={formData.configType === 'custom'}
                        onChange={(e) => setFormData({ ...formData, configType: e.target.value })}
                        className="mr-2"
                      />
                      <span className="font-semibold">Custom Configuration</span>
                      <p className="text-xs text-gray-600 mt-1">Customize routing ranges & difficulty</p>
                    </label>
                  </div>
                </div>

                {/* Custom Configuration Settings */}
                {formData.configType === 'custom' && (
                  <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                    <h3 className="font-semibold text-lg mb-4">Custom Configuration Settings</h3>
                    
                    {/* Reading & Writing Config */}
                    <div className="mb-6">
                      <h4 className="font-medium text-md mb-3 text-blue-900">📖 Reading & Writing (27 questions)</h4>
                      
                      {/* Routing Ranges */}
                      <div className="bg-white rounded p-3 mb-3">
                        <p className="text-sm font-medium mb-3">Module 2 Routing Ranges</p>
                        {['low', 'medium', 'high'].map((path) => (
                          <div key={path} className="mb-3">
                            <label className="text-xs font-medium text-gray-700 capitalize block mb-1">{path} Difficulty Path</label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-gray-600">Min Score</label>
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
                                  className="w-full border rounded px-2 py-1 text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-600">Max Score</label>
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
                                  className="w-full border rounded px-2 py-1 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Difficulty Distribution */}
                      <div className="bg-white rounded p-3">
                        <p className="text-sm font-medium mb-2">Module 2 Difficulty Distribution (%)</p>
                        {['low', 'medium', 'high'].map((path) => (
                          <div key={path} className="mb-2">
                            <label className="text-xs font-medium text-gray-700 capitalize">{path} Path:</label>
                            <div className="grid grid-cols-3 gap-2">
                              {['easy', 'medium', 'hard'].map((diff) => (
                                <div key={diff}>
                                  <label className="text-xs text-gray-600 capitalize">{diff}</label>
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
                                    className="w-full border rounded px-2 py-1 text-sm"
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
                      <h4 className="font-medium text-md mb-3 text-blue-900">🔢 Math (22 questions)</h4>
                      
                      {/* Routing Ranges */}
                      <div className="bg-white rounded p-3 mb-3">
                        <p className="text-sm font-medium mb-3">Module 2 Routing Ranges</p>
                        {['low', 'medium', 'high'].map((path) => (
                          <div key={path} className="mb-3">
                            <label className="text-xs font-medium text-gray-700 capitalize block mb-1">{path} Difficulty Path</label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-gray-600">Min Score</label>
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
                                  className="w-full border rounded px-2 py-1 text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-600">Max Score</label>
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
                                  className="w-full border rounded px-2 py-1 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Difficulty Distribution */}
                      <div className="bg-white rounded p-3">
                        <p className="text-sm font-medium mb-2">Module 2 Difficulty Distribution (%)</p>
                        {['low', 'medium', 'high'].map((path) => (
                          <div key={path} className="mb-2">
                            <label className="text-xs font-medium text-gray-700 capitalize">{path} Path:</label>
                            <div className="grid grid-cols-3 gap-2">
                              {['easy', 'medium', 'hard'].map((diff) => (
                                <div key={diff}>
                                  <label className="text-xs text-gray-600 capitalize">{diff}</label>
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
                                    className="w-full border rounded px-2 py-1 text-sm"
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
                  <label className="flex items-center gap-2 border rounded-lg px-3 py-2">
                    <input
                      type="checkbox"
                      checked={formData.sections.rw}
                      onChange={(e) => setFormData({ ...formData, sections: { ...formData.sections, rw: e.target.checked } })}
                    />
                    <span>Enable Reading & Writing</span>
                  </label>
                  <label className="flex items-center gap-2 border rounded-lg px-3 py-2">
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
                  <span className="text-sm font-medium text-gray-700">Active Test</span>
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
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
