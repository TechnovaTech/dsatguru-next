'use client'
import { useState, useEffect } from 'react'
import { FiPlus, FiEdit, FiTrash2, FiEye, FiDollarSign, FiUsers, FiBarChart, FiCalendar, FiVideo, FiDownload, FiFileText, FiSave, FiArrowLeft } from 'react-icons/fi'

export default function CourseManagement() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showContentManagement, setShowContentManagement] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    minPrice: '',
    maxPrice: '',
    type: ''
  })
  const [pagination, setPagination] = useState({ 
    page: 1, 
    pageSize: 10, 
    totalCount: 0, 
    totalPages: 1 
  })

  // Fetch courses from API
  const fetchCourses = async () => {
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('token')
      if (!token) {
        setError('No authentication token found')
        return
      }

      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.type && { type: filters.type }),
        ...(filters.minPrice && { minPrice: filters.minPrice }),
        ...(filters.maxPrice && { maxPrice: filters.maxPrice })
      })

      const response = await fetch(`/api/admin/courses?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch courses')
      }

      const data = await response.json()
      setCourses(data.courses || [])
      setPagination(prev => ({
        ...prev,
        totalCount: data.totalCount || 0,
        totalPages: data.totalPages || 1
      }))
    } catch (error) {
      console.error('Error fetching courses:', error)
      setError('Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete course')
      }

      // Refresh courses list
      fetchCourses()
    } catch (error) {
      console.error('Error deleting course:', error)
      alert(error.message)
    }
  }

  const handleSaveCourse = async (courseData) => {
    try {
      const token = localStorage.getItem('token')
      const isEditing = courseData.id
      const url = isEditing ? `/api/admin/courses/${courseData.id}` : '/api/admin/courses'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(courseData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save course')
      }

      // Refresh courses list
      fetchCourses()
      setShowModal(false)
      setEditingCourse(null)
    } catch (error) {
      console.error('Error saving course:', error)
      alert(error.message)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // Load courses on component mount and when filters/pagination change
  useEffect(() => {
    fetchCourses()
  }, [pagination.page, pagination.pageSize])

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (pagination.page === 1) {
        fetchCourses()
      } else {
        setPagination(prev => ({ ...prev, page: 1 }))
      }
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [filters.search, filters.type, filters.minPrice, filters.maxPrice])

  const totalCount = pagination.totalCount || 0
  const totalPages = pagination.totalPages || 1
  const startIndex = (pagination.page - 1) * pagination.pageSize
  const endIndex = Math.min(startIndex + pagination.pageSize, totalCount)

  if (showContentManagement && selectedCourse) {
    return (
      <CourseContentManager
        course={selectedCourse}
        onBack={() => {
          setShowContentManagement(false)
          setSelectedCourse(null)
        }}
      />
    )
  }

  if (loading && courses.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading courses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Course & Question Bank Management</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-600"
          disabled={loading}
        >
          <FiPlus /> Add Course
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search courses..."
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Types</option>
              <option value="course">Courses</option>
              <option value="question_bank">Question Banks</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Min Price</label>
            <input
              type="number"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              placeholder="0"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Price</label>
            <input
              type="number"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              placeholder="1000"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ search: '', minPrice: '', maxPrice: '', type: '' })}
              className="w-full bg-gray-500 text-white px-4 py-2 rounded"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enrollments</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Content</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading...</p>
                </td>
              </tr>
            ) : courses.length > 0 ? courses.map((course) => (
              <tr key={course.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-gray-900">{course.title}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {course.description}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="font-semibold text-green-600">
                    ${course.price || 0}
                  </div>
                  {course.discountedPrice && (
                    <div className="text-xs text-red-600">
                      ${course.discountedPrice}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="flex items-center gap-1">
                    <FiUsers className="text-gray-400" />
                    {course.enrollmentsCount || 0}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-green-600">
                  ${(course.revenue || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="space-y-1">
                    <div>{course.highlightsCount || 0} highlights</div>
                    <div>{course.schedulesCount || 0} schedules</div>
                    <div>{course.faqsCount || 0} FAQs</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(course.updatedAt || course.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedCourse(course)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Details"
                    >
                      <FiEye />
                    </button>
                    <button
                      onClick={() => {
                        setEditingCourse(course)
                        setShowModal(true)
                      }}
                      className="text-green-600 hover:text-green-900"
                      title="Edit Course"
                    >
                      <FiEdit />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCourse(course)
                        setShowContentManagement(true)
                      }}
                      className="text-orange-600 hover:text-orange-900"
                      title="Manage Content"
                    >
                      <FiVideo />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCourse(course)
                        setShowAnalytics(true)
                      }}
                      className="text-purple-600 hover:text-purple-900"
                      title="View Analytics"
                    >
                      <FiBarChart />
                    </button>
                    <button
                      onClick={() => handleDelete(course.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete Course"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                  No courses found. Click "Add Course" to create your first course.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-700">
          Showing {totalCount === 0 ? 0 : startIndex + 1} to {endIndex} of {totalCount} courses
        </div>
        <div className="flex gap-2 items-center">
          <button
            disabled={pagination.page === 1 || loading}
            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            Page {pagination.page} of {totalPages}
          </span>
          <button
            disabled={pagination.page >= totalPages || loading}
            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
            className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>

      {selectedCourse && !showAnalytics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{selectedCourse.title}</h2>
              <button onClick={() => setSelectedCourse(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-gray-700">{selectedCourse.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Price</h3>
                  <p className="text-2xl font-bold text-green-600">${selectedCourse.price || 0}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Enrollments</h3>
                  <p className="text-2xl font-bold text-blue-600">{selectedCourse.enrollmentsCount || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAnalytics && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Analytics - {selectedCourse.title}</h2>
              <button onClick={() => { setShowAnalytics(false); setSelectedCourse(null) }} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{selectedCourse.enrollmentsCount}</div>
                <div className="text-sm text-gray-600">Total Enrollments</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">${selectedCourse.revenue.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">87%</div>
                <div className="text-sm text-gray-600">Completion Rate</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">4.6</div>
                <div className="text-sm text-gray-600">Rating</div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <CourseModal
          course={editingCourse}
          onSave={handleSaveCourse}
          onClose={() => {
            setShowModal(false)
            setEditingCourse(null)
          }}
        />
      )}
    </div>
  )
}

function CourseContentManager({ course, onBack }) {
  const [activeTab, setActiveTab] = useState('meetings')
  const [courseData, setCourseData] = useState({
    meetings: [],
    materials: [],
    syllabus: [],
    assignments: []
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Fetch course content
  const fetchContent = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/courses/${course.id}/content`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch course content')
      }

      const data = await response.json()
      setCourseData(data.content)
    } catch (error) {
      console.error('Error fetching content:', error)
      setError('Failed to load course content')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/courses/${course.id}/content`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: courseData })
      })

      if (!response.ok) {
        throw new Error('Failed to save course content')
      }

      alert('Course content saved successfully!')
    } catch (error) {
      console.error('Error saving content:', error)
      alert('Failed to save course content')
    } finally {
      setSaving(false)
    }
  }

  // Load content on mount
  useEffect(() => {
    fetchContent()
  }, [course.id])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={onBack} className="text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-2">
            <FiArrowLeft /> Back to Courses
          </button>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-gray-600">Manage course content and materials</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700 disabled:opacity-50"
        >
          <FiSave /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="flex border-b">
          {[
            { id: 'meetings', label: 'Live Meetings', icon: <FiVideo size={16} /> },
            { id: 'materials', label: 'Study Materials', icon: <FiDownload size={16} /> },
            { id: 'syllabus', label: 'Course Timeline', icon: <FiCalendar size={16} /> },
            { id: 'assignments', label: 'Assignments', icon: <FiFileText size={16} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium ${
                activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
            <span>Loading content...</span>
          </div>
        ) : (
        {activeTab === 'meetings' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Live Meetings</h2>
              <button
                onClick={() => setCourseData(prev => ({
                  ...prev,
                  meetings: [...prev.meetings, { title: 'New Meeting', date: 'Fri 6 PM', link: '#' }]
                }))}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Add Meeting
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courseData.meetings.map((m, index) => (
                <div key={m._id || index} className="border rounded-lg p-4">
                  <div className="font-medium">{m.title}</div>
                  <div className="text-sm text-gray-600">{m.date}</div>
                  <a href={m.link} className="text-blue-600 text-sm">Join</a>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Study Materials</h2>
              <button
                onClick={() => setCourseData(prev => ({
                  ...prev,
                  materials: [...prev.materials, { title: 'New Material', link: '#' }]
                }))}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Add Material
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courseData.materials.map((mat, index) => (
                <div key={mat._id || index} className="border rounded-lg p-4">
                  <div className="font-medium">{mat.title}</div>
                  <a href={mat.link} className="text-blue-600 text-sm">Download</a>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'syllabus' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Course Timeline</h2>
              <button
                onClick={() => setCourseData(prev => ({
                  ...prev,
                  syllabus: [...prev.syllabus, { week: prev.syllabus.length + 1, title: 'New Topic' }]
                }))}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Add Topic
              </button>
            </div>
            <div className="space-y-3">
              {courseData.syllabus.map((t, index) => (
                <div key={t._id || index} className="border rounded-lg p-4">
                  <div className="font-medium">Week {t.week}: {t.title}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Assignments</h2>
              <button
                onClick={() => setCourseData(prev => ({
                  ...prev,
                  assignments: [...prev.assignments, { title: 'New Assignment', dueDate: 'TBD', status: 'Pending' }]
                }))}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Add Assignment
              </button>
            </div>
            <div className="space-y-3">
              {courseData.assignments.map((a, index) => (
                <div key={a._id || index} className="border rounded-lg p-4">
                  <div className="font-medium">{a.title}</div>
                  <div className="text-sm text-gray-600">Due: {a.dueDate}</div>
                  <span className={`inline-block px-2 py-1 rounded text-xs ${a.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{a.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        )}
      </div>
    </div>
  )
}

function CourseModal({ course, onSave, onClose }) {
  const [formData, setFormData] = useState({
    id: course?.id,
    title: course?.title || '',
    description: course?.description || '',
    type: course?.type || 'course',
    bannerImageUrl: course?.bannerImageUrl || '',
    price: course?.price || 0,
    discountedPrice: course?.discountedPrice || '',
    discountPercentage: course?.discountPercentage || '',
    backgroundColor: course?.backgroundColor || '#e0ffff',
    highlights: course?.highlights?.map(h => h.text || h) || [''],
    schedules: course?.schedules?.map(s => ({ day: s.day || '', time: s.time || '' })) || [{ day: '', time: '' }],
    faqs: course?.faqs?.map(f => ({ question: f.question || '', answer: f.answer || '' })) || [{ question: '', answer: '' }]
  })
  const [loading, setLoading] = useState(false)

  const updateSchedule = (index, key, value) => {
    setFormData(prev => ({
      ...prev,
      schedules: prev.schedules.map((s, i) => (i === index ? { ...s, [key]: value } : s))
    }))
  }

  const addSchedule = () => {
    setFormData(prev => ({ ...prev, schedules: [...prev.schedules, { day: '', time: '' }] }))
  }

  const removeSchedule = (index) => {
    setFormData(prev => ({ ...prev, schedules: prev.schedules.filter((_, i) => i !== index) }))
  }

  const updateHighlight = (index, value) => {
    setFormData(prev => ({
      ...prev,
      highlights: prev.highlights.map((h, i) => (i === index ? value : h))
    }))
  }

  const addHighlight = () => {
    setFormData(prev => ({ ...prev, highlights: [...prev.highlights, ''] }))
  }

  const removeHighlight = (index) => {
    setFormData(prev => ({ ...prev, highlights: prev.highlights.filter((_, i) => i !== index) }))
  }

  const updateFAQ = (index, key, value) => {
    setFormData(prev => ({
      ...prev,
      faqs: prev.faqs.map((f, i) => (i === index ? { ...f, [key]: value } : f))
    }))
  }

  const addFAQ = () => {
    setFormData(prev => ({ ...prev, faqs: [...prev.faqs, { question: '', answer: '' }] }))
  }

  const removeFAQ = (index) => {
    setFormData(prev => ({ ...prev, faqs: prev.faqs.filter((_, i) => i !== index) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await onSave(formData)
    } catch (error) {
      console.error('Error saving course:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{formData.id ? 'Edit Course' : 'Add Course'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              >
                <option value="course">Course</option>
                <option value="question_bank">Question Bank</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full border rounded px-3 py-2"
                rows="3"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Price</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value || 0) }))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Discount %</label>
              <input
                type="number"
                value={formData.discountPercentage}
                onChange={(e) => setFormData(prev => ({ ...prev, discountPercentage: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Discounted Price</label>
              <input
                type="number"
                value={formData.discountedPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, discountedPrice: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Course Highlights</label>
              <button type="button" onClick={addHighlight} className="text-blue-500 hover:text-blue-700 text-sm">+ Add Highlight</button>
            </div>
            {formData.highlights.map((h, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={h}
                  onChange={(e) => updateHighlight(idx, e.target.value)}
                  className="flex-1 border rounded px-3 py-2"
                  placeholder={`Highlight #${idx + 1}`}
                />
                <button type="button" onClick={() => removeHighlight(idx)} className="text-red-500 hover:text-red-700 px-2">✕</button>
              </div>
            ))}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Class Schedules</label>
              <button type="button" onClick={addSchedule} className="text-blue-500 hover:text-blue-700 text-sm">+ Add Schedule</button>
            </div>
            {formData.schedules.map((schedule, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <select
                  value={schedule.day}
                  onChange={(e) => updateSchedule(index, 'day', e.target.value)}
                  className="flex-1 border rounded px-3 py-2"
                >
                  <option value="">Select Day</option>
                  <option value="monday">Monday</option>
                  <option value="tuesday">Tuesday</option>
                  <option value="wednesday">Wednesday</option>
                  <option value="thursday">Thursday</option>
                  <option value="friday">Friday</option>
                  <option value="saturday">Saturday</option>
                  <option value="sunday">Sunday</option>
                </select>
                <input
                  type="text"
                  value={schedule.time}
                  onChange={(e) => updateSchedule(index, 'time', e.target.value)}
                  className="flex-1 border rounded px-3 py-2"
                  placeholder="Time (e.g., 8 pm)"
                />
                <button type="button" onClick={() => removeSchedule(index)} className="text-red-500 hover:text-red-700 px-2">✕</button>
              </div>
            ))}

            <div className="mt-6 border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Course Card Preview</h4>
              <div className="w-64 rounded-lg overflow-hidden shadow-lg" style={{ backgroundColor: formData.backgroundColor || '#e0ffff', height: '450px' }}>
                <div className="p-4">
                  <h3 className="text-lg font-bold uppercase text-center">{formData.title || 'MATHS REASONING'}</h3>
                  <div className="flex justify-center my-2">
                    {formData.schedules.length > 0 && formData.schedules[0].day && formData.schedules[0].time ? (
                      <span className="bg-white rounded-full px-4 py-1 text-sm">
                        {formData.schedules[0].day} {formData.schedules[0].time}
                      </span>
                    ) : (
                      <span className="bg-white rounded-full px-4 py-1 text-sm">monday 8 pm</span>
                    )}
                  </div>
                  <div className="flex justify-center mt-8 mb-2">
                    {formData.discountPercentage ? (
                      <span className="bg-white bg-opacity-70 rounded-full px-4 py-1 text-sm font-medium text-green-600">
                        {formData.discountPercentage}% OFF
                      </span>
                    ) : (
                      <span className="bg-white bg-opacity-70 rounded-full px-4 py-1 text-sm font-medium text-green-600">20% OFF</span>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    {formData.price > 0 ? (
                      <div>
                        {formData.discountedPrice ? (
                          <div>
                            <div className="text-gray-500 line-through">${formData.price}</div>
                            <div className="text-blue-600 text-xl font-bold">${formData.discountedPrice}</div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-gray-500 line-through">$100</div>
                            <div className="text-blue-600 text-xl font-bold">$80</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-gray-500 line-through">$100</div>
                        <div className="text-blue-600 text-xl font-bold">$80</div>
                      </div>
                    )}
                  </div>
                  <div className="mt-8">
                    {formData.highlights.filter(h => h.trim() !== '').length > 0 ? (
                      formData.highlights.filter(h => h.trim() !== '').map((highlight, idx) => (
                        <div key={idx} className="flex items-center gap-3 mb-3">
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 text-white rounded-full text-xs font-bold">{idx + 1}</span>
                          <span className="text-sm text-gray-700">{highlight}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 text-white rounded-full text-xs font-bold">1</span>
                          <span className="text-sm text-gray-700">maths question</span>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 text-white rounded-full text-xs font-bold">2</span>
                          <span className="text-sm text-gray-700">maths videos</span>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 text-white rounded-full text-xs font-bold">3</span>
                          <span className="text-sm text-gray-700">maths mcq</span>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 text-white rounded-full text-xs font-bold">4</span>
                          <span className="text-sm text-gray-700">matrhs</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Frequently Asked Questions</label>
              <button type="button" onClick={addFAQ} className="text-blue-500 hover:text-blue-700 text-sm">+ Add FAQ</button>
            </div>
            {formData.faqs.map((faq, index) => (
              <div key={index} className="border rounded p-3 mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">FAQ #{index + 1}</span>
                  <button type="button" onClick={() => removeFAQ(index)} className="text-red-500 hover:text-red-700">✕</button>
                </div>
                <input
                  type="text"
                  value={faq.question}
                  onChange={(e) => updateFAQ(index, 'question', e.target.value)}
                  className="w-full border rounded px-3 py-2 mb-2"
                  placeholder="Question"
                />
                <textarea
                  value={faq.answer}
                  onChange={(e) => updateFAQ(index, 'answer', e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  rows="2"
                  placeholder="Answer"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-4 justify-end pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50" disabled={loading}>Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50" disabled={loading}>
              {loading ? 'Saving...' : (formData.id ? 'Update' : 'Create')} Course
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
