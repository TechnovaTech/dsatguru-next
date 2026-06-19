'use client'
import { useState, useEffect } from 'react'
import { FiPlus, FiEdit, FiTrash2, FiTarget, FiCalendar, FiBook, FiUsers, FiClock } from 'react-icons/fi'
import { useConfirm } from '../ui/UIProvider'

export default function StudyPlanManagement() {
  const confirm = useConfirm()
  const [studyPlans, setStudyPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [courses, setCourses] = useState([])
  const [error, setError] = useState('')
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

  const closeModal = () => {
    setShowModal(false)
    setEditingPlan(null)
    resetForm()
  }

  useEffect(() => {
    if (!showModal) return
    const onKey = (e) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showModal])

  const fetchStudyPlans = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/study-plans', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setStudyPlans(Array.isArray(data) ? data : [])
        setError('')
      } else {
        setError('Failed to load study plans. Please try again.')
      }
    } catch (error) {
      console.error('Error fetching study plans:', error)
      setError('Failed to load study plans. Please check your connection and try again.')
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
      const token = localStorage.getItem('token')

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setError('')
        fetchStudyPlans()
        setShowModal(false)
        setEditingPlan(null)
        resetForm()
      } else {
        setError(editingPlan ? 'Failed to update study plan. Please try again.' : 'Failed to create study plan. Please try again.')
      }
    } catch (error) {
      console.error('Error saving study plan:', error)
      setError('Failed to save study plan. Please check your connection and try again.')
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
    if (await confirm({ message: 'Are you sure you want to delete this study plan?', tone: 'danger', confirmText: 'Delete' })) {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/admin/study-plans/${planId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        if (response.ok) {
          setError('')
          fetchStudyPlans()
        } else {
          setError('Failed to delete study plan. Please try again.')
        }
      } catch (error) {
        console.error('Error deleting study plan:', error)
        setError('Failed to delete study plan. Please check your connection and try again.')
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
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded-lg w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-44 bg-slate-200 rounded-2xl"></div>
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
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">🎯 Study Plan Management</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
        >
          <FiPlus /> Create Study Plan
        </button>
        </div>

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Dismiss error"
            className="font-semibold text-rose-600 hover:text-rose-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Empty State */}
      {studyPlans.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <FiTarget size={22} />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">No study plans yet</h3>
          <p className="mt-1 text-sm text-slate-400">
            Create your first study plan to get started.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition-colors"
          >
            <FiPlus /> Create Study Plan
          </button>
        </div>
      ) : (
      /* Study Plans Grid */
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {studyPlans.map((plan) => (
          <div key={plan._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <FiTarget className="text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">{plan.title}</h3>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(plan)}
                  className="text-indigo-600 hover:text-indigo-800"
                  aria-label={`Edit study plan${plan.title ? `: ${plan.title}` : ''}`}
                  title="Edit"
                >
                  <FiEdit />
                </button>
                <button
                  onClick={() => handleDelete(plan._id)}
                  className="text-rose-600 hover:text-rose-800"
                  aria-label={`Delete study plan${plan.title ? `: ${plan.title}` : ''}`}
                  title="Delete"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>

            <p className="text-slate-500 text-sm mb-4">{plan.description}</p>

            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <FiClock className="text-slate-400" />
                <span>Duration: {plan.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <FiBook className="text-slate-400" />
                <span>Difficulty: {plan.difficulty}</span>
              </div>
              {plan.targetScore && (
                <div className="flex items-center gap-2">
                  <FiTarget className="text-slate-400" />
                  <span>Target Score: {plan.targetScore}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <FiUsers className="text-slate-400" />
                <span>{plan.modules?.length || 0} Modules</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                plan.isActive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {plan.isActive ? 'Active' : 'Draft'}
              </span>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 overflow-y-auto"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-4xl max-h-screen overflow-y-auto m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">
                {editingPlan ? 'Edit Study Plan' : 'Create New Study Plan'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close dialog"
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label htmlFor="sp-title" className="block text-sm font-medium text-slate-600 mb-1">Title</label>
                  <input
                    id="sp-title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="sp-course" className="block text-sm font-medium text-slate-600 mb-1">Course</label>
                  <select
                    id="sp-course"
                    value={formData.courseId}
                    onChange={(e) => setFormData({...formData, courseId: e.target.value})}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                  <label htmlFor="sp-duration" className="block text-sm font-medium text-slate-600 mb-1">Duration</label>
                  <input
                    id="sp-duration"
                    type="text"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g., 8 weeks"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="sp-difficulty" className="block text-sm font-medium text-slate-600 mb-1">Difficulty</label>
                  <select
                    id="sp-difficulty"
                    value={formData.difficulty}
                    onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="sp-target-score" className="block text-sm font-medium text-slate-600 mb-1">Target Score</label>
                  <input
                    id="sp-target-score"
                    type="number"
                    value={formData.targetScore}
                    onChange={(e) => setFormData({...formData, targetScore: e.target.value})}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g., 1500"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="sp-description" className="block text-sm font-medium text-slate-600 mb-1">Description</label>
                <textarea
                  id="sp-description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows="3"
                  required
                />
              </div>

              {/* Modules Section */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Study Modules</h3>
                  <button
                    type="button"
                    onClick={addModule}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-indigo-700 transition-colors"
                  >
                    <FiPlus /> Add Module
                  </button>
                </div>

                {formData.modules.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-400">
                    No modules added yet. Click &ldquo;Add Module&rdquo; to begin.
                  </div>
                )}

                {formData.modules.map((module, index) => (
                  <div key={index} className="border border-slate-200 rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-slate-800">Module {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeModule(index)}
                        className="text-rose-600 hover:text-rose-800"
                        aria-label={`Remove module ${index + 1}`}
                        title="Remove module"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor={`sp-module-title-${index}`} className="block text-sm font-medium text-slate-600 mb-1">Module Title</label>
                        <input
                          id={`sp-module-title-${index}`}
                          type="text"
                          value={module.title}
                          onChange={(e) => updateModule(index, 'title', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor={`sp-module-hours-${index}`} className="block text-sm font-medium text-slate-600 mb-1">Estimated Hours</label>
                        <input
                          id={`sp-module-hours-${index}`}
                          type="number"
                          value={module.estimatedHours}
                          onChange={(e) => updateModule(index, 'estimatedHours', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label htmlFor={`sp-module-desc-${index}`} className="block text-sm font-medium text-slate-600 mb-1">Description</label>
                      <textarea
                        id={`sp-module-desc-${index}`}
                        value={module.description}
                        onChange={(e) => updateModule(index, 'description', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        rows="2"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
