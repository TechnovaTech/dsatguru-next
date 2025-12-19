'use client'
import { useState, useEffect } from 'react'
import { FiVideo, FiDownload, FiCalendar, FiFileText, FiSave, FiArrowLeft, FiUsers } from 'react-icons/fi'

export default function ManageCourses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState(null)

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const response = await fetch('/api/courses', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (response.ok) {
        const data = await response.json()
        setCourses(Array.isArray(data) ? data : data.courses || data.data || [])
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  if (selectedCourse) {
    return (
      <CourseContentManager
        course={selectedCourse}
        onBack={() => setSelectedCourse(null)}
      />
    )
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage Courses</h1>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Instructor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enrollments</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {Array.isArray(courses) ? courses.filter(c => c.type ? c.type === 'course' : true).map((course) => (
              <tr key={course._id || course.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-gray-900">{course.title}</div>
                    <div className="text-sm text-gray-500">{course.description}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{course.instructor || 'Instructor'}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{course.duration || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{course.enrollments || 0}</td>
                <td className="px-6 py-4 text-sm font-medium">
                  <button
                    onClick={() => setSelectedCourse({
                      id: course._id || course.id,
                      title: course.title
                    })}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Manage Content
                  </button>
                </td>
              </tr>
            )) : []}
          </tbody>
        </table>
      </div>
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
  const [enrolledUsers, setEnrolledUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => {
    fetchContent()
    if (activeTab === 'users') {
      fetchEnrolledUsers()
    }
  }, [course.id, activeTab])

  const fetchContent = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/courses/${course.id}/content`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setCourseData(data.content)
      }
    } catch (error) {
      console.error('Error fetching content:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEnrolledUsers = async () => {
    try {
      setLoadingUsers(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/courses/${course.id}/enrollments`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setEnrolledUsers(data.enrollments || [])
      }
    } catch (error) {
      console.error('Error fetching enrolled users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/courses/${course.id}/content`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: courseData })
      })
      if (response.ok) {
        alert('Content saved successfully!')
      }
    } catch (error) {
      console.error('Error saving content:', error)
      alert('Failed to save content')
    } finally {
      setSaving(false)
    }
  }

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
            { id: 'assignments', label: 'Assignments', icon: <FiFileText size={16} /> },
            { id: 'users', label: 'Enrolled Users', icon: <FiUsers size={16} /> }
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

      <div className="bg-white rounded-lg shadow-md p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {activeTab === 'meetings' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Live Meetings</h2>
              <button
                onClick={() => setCourseData(prev => ({
                  ...prev,
                  meetings: [...prev.meetings, { title: '', date: '', link: '' }]
                }))}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Add Meeting
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courseData.meetings.map((m, index) => (
                <div key={m._id || index} className="border rounded-lg p-4">
                  <input
                    type="text"
                    value={m.title}
                    onChange={(e) => {
                      const updated = [...courseData.meetings]
                      updated[index] = { ...updated[index], title: e.target.value }
                      setCourseData(prev => ({ ...prev, meetings: updated }))
                    }}
                    className="w-full mb-2 p-2 border rounded"
                    placeholder="Meeting title"
                  />
                  <input
                    type="text"
                    value={m.date}
                    onChange={(e) => {
                      const updated = [...courseData.meetings]
                      updated[index] = { ...updated[index], date: e.target.value }
                      setCourseData(prev => ({ ...prev, meetings: updated }))
                    }}
                    className="w-full mb-2 p-2 border rounded"
                    placeholder="Date & time"
                  />
                  <input
                    type="url"
                    value={m.link}
                    onChange={(e) => {
                      const updated = [...courseData.meetings]
                      updated[index] = { ...updated[index], link: e.target.value }
                      setCourseData(prev => ({ ...prev, meetings: updated }))
                    }}
                    className="w-full mb-2 p-2 border rounded"
                    placeholder="Meeting link"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCourseData(prev => ({
                        ...prev,
                        meetings: [...prev.meetings.slice(0, index + 1), { title: '', date: '', link: '' }, ...prev.meetings.slice(index + 1)]
                      }))}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Add Below
                    </button>
                    <button
                      onClick={() => {
                        const updated = courseData.meetings.filter((_, i) => i !== index)
                        setCourseData(prev => ({ ...prev, meetings: updated }))
                      }}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Remove
                    </button>
                  </div>
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
                  materials: [...prev.materials, { title: '', link: '' }]
                }))}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Add Material
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courseData.materials.map((mat, index) => (
                <div key={mat._id || index} className="border rounded-lg p-4">
                  <input
                    type="text"
                    value={mat.title}
                    onChange={(e) => {
                      const updated = [...courseData.materials]
                      updated[index] = { ...updated[index], title: e.target.value }
                      setCourseData(prev => ({ ...prev, materials: updated }))
                    }}
                    className="w-full mb-2 p-2 border rounded"
                    placeholder="Material title"
                  />
                  <input
                    type="url"
                    value={mat.link}
                    onChange={(e) => {
                      const updated = [...courseData.materials]
                      updated[index] = { ...updated[index], link: e.target.value }
                      setCourseData(prev => ({ ...prev, materials: updated }))
                    }}
                    className="w-full mb-2 p-2 border rounded"
                    placeholder="Download link"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCourseData(prev => ({
                        ...prev,
                        materials: [...prev.materials.slice(0, index + 1), { title: '', link: '' }, ...prev.materials.slice(index + 1)]
                      }))}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Add Below
                    </button>
                    <button
                      onClick={() => {
                        const updated = courseData.materials.filter((_, i) => i !== index)
                        setCourseData(prev => ({ ...prev, materials: updated }))
                      }}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Remove
                    </button>
                  </div>
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
                  syllabus: [...prev.syllabus, { week: prev.syllabus.length + 1, title: '', description: '' }]
                }))}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Add Topic
              </button>
            </div>
            <div className="space-y-3">
              {courseData.syllabus.map((t, index) => (
                <div key={t._id || index} className="border rounded-lg p-4">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="number"
                      value={t.week}
                      onChange={(e) => {
                        const updated = [...courseData.syllabus]
                        updated[index] = { ...updated[index], week: parseInt(e.target.value) }
                        setCourseData(prev => ({ ...prev, syllabus: updated }))
                      }}
                      className="w-20 p-2 border rounded"
                      placeholder="Week"
                    />
                    <input
                      type="text"
                      value={t.title}
                      onChange={(e) => {
                        const updated = [...courseData.syllabus]
                        updated[index] = { ...updated[index], title: e.target.value }
                        setCourseData(prev => ({ ...prev, syllabus: updated }))
                      }}
                      className="flex-1 p-2 border rounded"
                      placeholder="Topic title"
                    />
                  </div>
                  <textarea
                    value={t.description || ''}
                    onChange={(e) => {
                      const updated = [...courseData.syllabus]
                      updated[index] = { ...updated[index], description: e.target.value }
                      setCourseData(prev => ({ ...prev, syllabus: updated }))
                    }}
                    className="w-full p-2 border rounded"
                    placeholder="Description"
                    rows="2"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setCourseData(prev => ({
                        ...prev,
                        syllabus: [...prev.syllabus.slice(0, index + 1), { week: prev.syllabus.length + 1, title: '', description: '' }, ...prev.syllabus.slice(index + 1)]
                      }))}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Add Below
                    </button>
                    <button
                      onClick={() => {
                        const updated = courseData.syllabus.filter((_, i) => i !== index)
                        setCourseData(prev => ({ ...prev, syllabus: updated }))
                      }}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Remove
                    </button>
                  </div>
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
                  assignments: [...prev.assignments, { title: '', dueDate: '', status: 'Pending' }]
                }))}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Add Assignment
              </button>
            </div>
            <div className="space-y-3">
              {courseData.assignments.map((a, index) => (
                <div key={a._id || index} className="border rounded-lg p-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Assignment Title</label>
                      <input
                        type="text"
                        value={a.title}
                        onChange={(e) => {
                          const updated = [...courseData.assignments]
                          updated[index] = { ...updated[index], title: e.target.value }
                          setCourseData(prev => ({ ...prev, assignments: updated }))
                        }}
                        className="w-full p-2 border rounded"
                        placeholder="Enter assignment title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        value={a.description || ''}
                        onChange={(e) => {
                          const updated = [...courseData.assignments]
                          updated[index] = { ...updated[index], description: e.target.value }
                          setCourseData(prev => ({ ...prev, assignments: updated }))
                        }}
                        className="w-full p-2 border rounded"
                        placeholder="Enter assignment description"
                        rows="3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Due Date (dd-mm-yyyy)</label>
                      <input
                        type="date"
                        value={a.dueDate}
                        onChange={(e) => {
                          const updated = [...courseData.assignments]
                          updated[index] = { ...updated[index], dueDate: e.target.value }
                          setCourseData(prev => ({ ...prev, assignments: updated }))
                        }}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Status</label>
                      <select
                        value={a.status}
                        onChange={(e) => {
                          const updated = [...courseData.assignments]
                          updated[index] = { ...updated[index], status: e.target.value }
                          setCourseData(prev => ({ ...prev, assignments: updated }))
                        }}
                        className="w-full p-2 border rounded"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Active">Active</option>
                        <option value="Completed">Completed</option>
                        <option value="Overdue">Overdue</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setCourseData(prev => ({
                        ...prev,
                        assignments: [...prev.assignments.slice(0, index + 1), { title: '', description: '', dueDate: '', status: 'Pending' }, ...prev.assignments.slice(index + 1)]
                      }))}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Add Below
                    </button>
                    <button
                      onClick={() => {
                        const updated = courseData.assignments.filter((_, i) => i !== index)
                        setCourseData(prev => ({ ...prev, assignments: updated }))
                      }}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Enrolled Users</h2>
              <div className="text-sm text-gray-600">
                Total: {enrolledUsers.length} students
              </div>
            </div>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
                <span>Loading enrolled users...</span>
              </div>
            ) : enrolledUsers.length > 0 ? (
              <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enrolled Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {enrolledUsers.map((enrollment, index) => (
                      <tr key={enrollment._id || index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {enrollment.userId?.name || enrollment.userName || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {enrollment.userId?.email || enrollment.userEmail || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(enrollment.enrolledAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            enrollment.userId?.isActive !== false 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {enrollment.userId?.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FiUsers size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No students enrolled in this course yet.</p>
              </div>
            )}
          </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
