'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'

export default function CourseManagement() {
  const [courses, setCourses] = useState([])
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    price: '',
    type: 'course'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const response = await axios.get('/api/courses')
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
      await axios.post('/api/courses', {
        ...newCourse,
        price: parseFloat(newCourse.price)
      })
      setNewCourse({ title: '', description: '', price: '', type: 'course' })
      fetchCourses()
      alert('Course created successfully')
    } catch (error) {
      alert('Failed to create course')
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
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-indigo-600 hover:text-indigo-900 text-sm">
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
    </div>
  )
}