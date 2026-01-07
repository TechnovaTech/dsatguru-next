'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'

export default function CourseManagement() {
  const [courses, setCourses] = useState([])
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    price: '',
    type: 'course',
    questionBankType: 'Reading and Writing'
  })
  const [editingCourse, setEditingCourse] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const response = await axios.get('/api/admin/courses')
      setCourses(response.data.courses || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCourse = async (e) => {
    e.preventDefault()
    try {
      await axios.post('/api/admin/courses', {
        ...newCourse,
        price: parseFloat(newCourse.price)
      })
      setNewCourse({ title: '', description: '', price: '', type: 'course', questionBankType: 'Reading and Writing' })
      fetchCourses()
      alert('Course created successfully')
    } catch (error) {
      alert('Failed to create course')
    }
  }

  const handleEditCourse = (course) => {
    setEditingCourse({
      ...course,
      questionBankType: course.questionBankType || 'Reading and Writing'
    })
    setShowEditModal(true)
  }

  const handleUpdateCourse = async (e) => {
    e.preventDefault()
    try {
      await axios.put(`/api/admin/courses/${editingCourse.id}`, {
        ...editingCourse,
        price: parseFloat(editingCourse.price)
      })
      setShowEditModal(false)
      setEditingCourse(null)
      fetchCourses()
      alert('Course updated successfully')
    } catch (error) {
      alert('Failed to update course')
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Course Management</h1>
        <p className="mt-2 text-sm text-gray-600">Create and manage courses and question banks</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create Course Form */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Course</h2>
          <form onSubmit={handleCreateCourse} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={newCourse.title}
                onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3 border"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                value={newCourse.type}
                onChange={(e) => setNewCourse({...newCourse, type: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3 border"
              >
                <option value="course">Course</option>
                <option value="question-bank">Question Bank</option>
              </select>
            </div>
            {newCourse.type === 'question-bank' && (
              <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
                <label className="block text-sm font-medium mb-3 text-blue-900">Question Bank Type *</label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="rw-type"
                      checked={newCourse.questionBankType === 'Reading and Writing'}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewCourse({...newCourse, questionBankType: 'Reading and Writing'})
                        }
                      }}
                      className="mr-2 w-5 h-5"
                    />
                    <label htmlFor="rw-type" className="text-sm font-medium text-gray-700">Reading and Writing (R/W)</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="math-type"
                      checked={newCourse.questionBankType === 'Mathematics'}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewCourse({...newCourse, questionBankType: 'Mathematics'})
                        }
                      }}
                      className="mr-2 w-5 h-5"
                    />
                    <label htmlFor="math-type" className="text-sm font-medium text-gray-700">Mathematics</label>
                  </div>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={newCourse.description}
                onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Price</label>
              <input
                type="number"
                value={newCourse.price}
                onChange={(e) => setNewCourse({...newCourse, price: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3 border"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Course
            </button>
          </form>
        </div>

        {/* Courses List */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">All Courses ({courses.length})</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {courses.map((course) => (
              <div key={course._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{course.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{course.description}</p>
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        ${course.price}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {course.type}
                      </span>
                      {course.type === 'question-bank' && course.questionBankType && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {course.questionBankType}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleEditCourse(course)}
                      className="text-indigo-600 hover:text-indigo-900 text-sm"
                    >
                      Edit
                    </button>
                    <button className="text-red-600 hover:text-red-900 text-sm">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Course Modal */}
      {showEditModal && editingCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Edit Course</h2>
            <form onSubmit={handleUpdateCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={editingCourse.title}
                  onChange={(e) => setEditingCourse({...editingCourse, title: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3 border"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={editingCourse.type}
                  onChange={(e) => setEditingCourse({...editingCourse, type: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3 border"
                >
                  <option value="course">Course</option>
                  <option value="question-bank">Question Bank</option>
                </select>
              </div>
              {editingCourse.type === 'question-bank' && (
                <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
                  <label className="block text-sm font-medium mb-3 text-blue-900">Question Bank Type *</label>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="edit-rw-type"
                        checked={editingCourse.questionBankType === 'Reading and Writing'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingCourse({...editingCourse, questionBankType: 'Reading and Writing'})
                          }
                        }}
                        className="mr-2 w-5 h-5"
                      />
                      <label htmlFor="edit-rw-type" className="text-sm font-medium text-gray-700">Reading and Writing (R/W)</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="edit-math-type"
                        checked={editingCourse.questionBankType === 'Mathematics'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingCourse({...editingCourse, questionBankType: 'Mathematics'})
                          }
                        }}
                        className="mr-2 w-5 h-5"
                      />
                      <label htmlFor="edit-math-type" className="text-sm font-medium text-gray-700">Mathematics</label>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={editingCourse.description}
                  onChange={(e) => setEditingCourse({...editingCourse, description: e.target.value})}
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Price</label>
                <input
                  type="number"
                  value={editingCourse.price}
                  onChange={(e) => setEditingCourse({...editingCourse, price: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3 border"
                  required
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingCourse(null)
                  }}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Update Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}