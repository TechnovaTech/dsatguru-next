'use client'
import { useState, useEffect } from 'react'
import { FiPlus, FiEdit, FiTrash2, FiPlay, FiPause, FiClock, FiUsers, FiFileText, FiSettings } from 'react-icons/fi'

export default function TestManagement() {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTest, setEditingTest] = useState(null)
  const [questionBanks, setQuestionBanks] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    isActive: true,
    sections: { math: true, rw: true },
    questionBankId: ''
  })

  useEffect(() => {
    fetchTests()
    fetchQuestionBanks()
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

  const fetchQuestionBanks = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const response = await fetch('/api/admin/question-banks', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (response.ok) {
        const data = await response.json()
        setQuestionBanks(data)
      }
    } catch (error) {
      console.error('Error fetching question banks:', error)
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
      questionBankId: ''
    })
  }

  const handleEdit = (test) => {
    setEditingTest(test)
    setFormData({
      title: test.title,
      isActive: test.isActive,
      sections: test.sections || { math: true, rw: true },
      questionBankId: test.questionBankId || ''
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
            {test.questionBankId && (
              <div className="mb-3">
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                  Question Bank: {questionBanks.find(q => String(q._id) === String(test.questionBankId))?.title || 'Selected'}
                </span>
              </div>
            )}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-xl max-h-screen overflow-y-auto m-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Bank</label>
                  <select
                    value={formData.questionBankId}
                    onChange={(e) => setFormData({ ...formData, questionBankId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Select Question Bank</option>
                    {questionBanks.map((bank) => (
                      <option key={bank._id} value={bank._id}>
                        {bank.title}
                      </option>
                    ))}
                  </select>
                </div>
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

              <div className="mb-6">
                <div className="text-sm font-semibold mb-2">Test Structure (read-only)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Reading & Writing</span>
                      <span className={`px-2 py-1 text-xs rounded ${formData.sections.rw ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                        {formData.sections.rw ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="text-gray-700">Base Module: 27 Q • 32 min</div>
                    <div className="text-gray-700">Adaptive Module: 27 Q • 32 min</div>
                  </div>
                  <div className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Math</span>
                      <span className={`px-2 py-1 text-xs rounded ${formData.sections.math ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                        {formData.sections.math ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="text-gray-700">Base Module: 22 Q • 35 min</div>
                    <div className="text-gray-700">Adaptive Module: 22 Q • 35 min</div>
                  </div>
                </div>
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
