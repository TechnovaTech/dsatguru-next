'use client'
import { useState, useEffect } from 'react'
import { FiPlus, FiEdit, FiTrash2, FiTarget, FiCalendar, FiBook, FiUsers, FiClock } from 'react-icons/fi'

export default function StudyPlanManagement() {
  const [studyPlans, setStudyPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [courses, setCourses] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseId: '',
    duration: '',
    difficulty: 'Beginner',
    targetScore: '',
    modules: []
  })

  useEffect(() => {
    fetchStudyPlans()
    fetchCourses()
  }, [])

  const fetchStudyPlans = async () => {
    try {
      const response = await fetch('/api/admin/study-plans')
      if (response.ok) {
        const data = await response.json()
        setStudyPlans(data)
      }
    } catch (error) {
      console.error('Error fetching study plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/courses', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setCourses(data.courses || data || [])
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = editingPlan 
        ? `/api/admin/study-plans/${editingPlan._id}`
        : '/api/admin/study-plans'
      
      const method = editingPlan ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        fetchStudyPlans()
        setShowModal(false)
        setEditingPlan(null)
        resetForm()
      }
    } catch (error) {
      console.error('Error saving study plan:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      courseId: '',
      duration: '',
      difficulty: 'Beginner',
      targetScore: '',
      modules: []
    })
  }

  const handleEdit = (plan) => {
    setEditingPlan(plan)
    setFormData({
      title: plan.title,
      description: plan.description,
      courseId: plan.courseId,
      duration: plan.duration,
      difficulty: plan.difficulty,
      targetScore: plan.targetScore,
      modules: plan.modules || []
    })
    setShowModal(true)
  }

  const handleDelete = async (planId) => {
    if (confirm('Are you sure you want to delete this study plan?')) {
      try {
        const response = await fetch(`/api/admin/study-plans/${planId}`, {
          method: 'DELETE'
        })
        if (response.ok) {
          fetchStudyPlans()
        }
      } catch (error) {
        console.error('Error deleting study plan:', error)
      }
    }
  }

  const addModule = () => {
    setFormData({
      ...formData,
      modules: [...formData.modules, {
        title: '',
        description: '',
        order: formData.modules.length + 1,
        estimatedHours: '',
        topics: []
      }]
    })
  }

  const updateModule = (index, field, value) => {
    const updatedModules = [...formData.modules]
    updatedModules[index][field] = value
    setFormData({...formData, modules: updatedModules})
  }

  const removeModule = (index) => {
    const updatedModules = formData.modules.filter((_, i) => i !== index)
    setFormData({...formData, modules: updatedModules})
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
        <h1 className="text-3xl font-bold text-gray-800">🎯 Study Plan Management</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <FiPlus /> Create Study Plan
        </button>
        </div>

      {/* Study Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {studyPlans.map((plan) => (
          <div key={plan._id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <FiTarget className="text-blue-600" />
                <h3 className="text-lg font-semibold">{plan.title}</h3>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(plan)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <FiEdit />
                </button>
                <button
                  onClick={() => handleDelete(plan._id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <FiClock className="text-gray-400" />
                <span>Duration: {plan.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <FiBook className="text-gray-400" />
                <span>Difficulty: {plan.difficulty}</span>
              </div>
              {plan.targetScore && (
                <div className="flex items-center gap-2">
                  <FiTarget className="text-gray-400" />
                  <span>Target Score: {plan.targetScore}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <FiUsers className="text-gray-400" />
                <span>{plan.modules?.length || 0} Modules</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                plan.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {plan.isActive ? 'Active' : 'Draft'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-screen overflow-y-auto m-4">
            <h2 className="text-xl font-bold mb-4">
              {editingPlan ? 'Edit Study Plan' : 'Create New Study Plan'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                  <select
                    value={formData.courseId}
                    onChange={(e) => setFormData({...formData, courseId: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Select a course...</option>
                    {courses.map((course) => (
                      <option key={course._id || course.id} value={course._id || course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., 8 weeks"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Score</label>
                  <input
                    type="number"
                    value={formData.targetScore}
                    onChange={(e) => setFormData({...formData, targetScore: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., 1500"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows="3"
                  required
                />
              </div>

              {/* Modules Section */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Study Modules</h3>
                  <button
                    type="button"
                    onClick={addModule}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                  >
                    <FiPlus /> Add Module
                  </button>
                </div>

                {formData.modules.map((module, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium">Module {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeModule(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Module Title</label>
                        <input
                          type="text"
                          value={module.title}
                          onChange={(e) => updateModule(index, 'title', e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                        <input
                          type="number"
                          value={module.estimatedHours}
                          onChange={(e) => updateModule(index, 'estimatedHours', e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={module.description}
                        onChange={(e) => updateModule(index, 'description', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        rows="2"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingPlan(null)
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
                  {editingPlan ? 'Update' : 'Create'}
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
