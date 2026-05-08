'use client'
import { useState, useEffect } from 'react'
import { FiVideo, FiDownload, FiCalendar, FiFileText, FiSave, FiArrowLeft, FiUsers, FiEdit, FiToggleLeft, FiToggleRight, FiTrash2, FiFolder, FiUpload, FiFile, FiBell } from 'react-icons/fi'
import CourseCalendar from './CourseCalendar'
import moment from 'moment'
import dynamic from 'next/dynamic'
const LiveKitMeeting = dynamic(() => import('../LiveKitMeeting'), { ssr: false })

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
    materialCategories: [],
    syllabus: [],
    assignments: [],
    calendarEvents: []
  })
  const [enrolledUsers, setEnrolledUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingEnrollment, setEditingEnrollment] = useState(null)
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [eventForm, setEventForm] = useState({ title: '', start: '', end: '', description: '' })
  const [materialForm, setMaterialForm] = useState({
    mainName: '',
    hasSubMaterials: false,
    subMaterials: [{ name: '', file: null, link: '', type: 'pdf', uploadMethod: 'link' }]
  })
  const [uploading, setUploading] = useState(false)
  const [viewingMaterial, setViewingMaterial] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [enrollForm, setEnrollForm] = useState({
    userId: '',
    accessType: 'lifetime',
    accessDuration: ''
  })
  const [showAssignmentMaterialModal, setShowAssignmentMaterialModal] = useState(false)
  const [currentAssignmentIndex, setCurrentAssignmentIndex] = useState(null)
  const [assignmentMaterialForm, setAssignmentMaterialForm] = useState({
    name: '',
    file: null,
    link: '',
    type: 'pdf',
    uploadMethod: 'link'
  })
  const [viewingAssignment, setViewingAssignment] = useState(null)
  const [editingAssignmentIndex, setEditingAssignmentIndex] = useState(null)
  const [activeAdminMeeting, setActiveAdminMeeting] = useState(null)

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
        setCourseData({
          meetings: data.content?.meetings || [],
          materials: data.content?.materials || [],
          materialCategories: data.content?.materialCategories || [],
          syllabus: data.content?.syllabus || [],
          assignments: data.content?.assignments || [],
          calendarEvents: data.content?.calendarEvents || []
        })
      } else {
        // Initialize with empty arrays if API fails
        setCourseData({
          meetings: [],
          materials: [],
          materialCategories: [],
          syllabus: [],
          assignments: [],
          calendarEvents: []
        })
      }
    } catch (error) {
      console.error('Error fetching content:', error)
      // Initialize with empty arrays on error
      setCourseData({
        meetings: [],
        materials: [],
        materialCategories: [],
        syllabus: [],
        assignments: [],
        calendarEvents: []
      })
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

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const users = await response.json()
        setAllUsers(users.filter(u => u.role === 'Student'))
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleAddEnrollment = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/courses/${course.id}/enrollments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(enrollForm)
      })
      if (response.ok) {
        alert('User enrolled successfully!')
        setShowEnrollModal(false)
        setEnrollForm({ userId: '', accessType: 'lifetime', accessDuration: '' })
        fetchEnrolledUsers()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to enroll user')
      }
    } catch (error) {
      alert('Failed to enroll user')
    }
  }

  const handleEditEnrollment = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const updateData = {
        accessType: enrollForm.accessType,
        accessDuration: enrollForm.accessType !== 'lifetime' ? enrollForm.accessDuration : null
      }
      
      const response = await fetch(`/api/admin/courses/${course.id}/enrollments/${editingEnrollment._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      })
      
      if (response.ok) {
        alert('Enrollment updated successfully!')
        setShowEditModal(false)
        setEditingEnrollment(null)
        setEnrollForm({ userId: '', accessType: 'lifetime', accessDuration: '' })
        fetchEnrolledUsers()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update enrollment')
        console.error('Update error:', error)
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('Failed to update enrollment')
    }
  }

  const handleToggleEnrollmentStatus = async (enrollmentId, currentStatus) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/courses/${course.id}/enrollments/${enrollmentId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !currentStatus })
      })
      if (response.ok) {
        fetchEnrolledUsers()
      } else {
        alert('Failed to toggle status')
      }
    } catch (error) {
      alert('Failed to toggle status')
    }
  }

  const handleDeleteEnrollment = async (enrollmentId) => {
    if (!confirm('Are you sure you want to remove this enrollment?')) return
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/courses/${course.id}/enrollments/${enrollmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        alert('Enrollment removed successfully!')
        fetchEnrolledUsers()
      } else {
        alert('Failed to remove enrollment')
      }
    } catch (error) {
      alert('Failed to remove enrollment')
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
            { id: 'calendar', label: 'Calendar', icon: <FiCalendar size={16} /> },
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
                  meetings: [
                    ...prev.meetings,
                    { title: '', date: '', link: '', transcript: '', transcriptSummary: '' }
                  ]
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
                    type="datetime-local"
                    value={m.date}
                    onChange={(e) => {
                      const updated = [...courseData.meetings]
                      updated[index] = { ...updated[index], date: e.target.value }
                      setCourseData(prev => ({ ...prev, meetings: updated }))
                    }}
                    className="w-full mb-2 p-2 border rounded"
                    placeholder="Date & time"
                  />
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={m.link}
                      onChange={(e) => {
                        const updated = [...courseData.meetings]
                        updated[index] = { ...updated[index], link: e.target.value }
                        setCourseData(prev => ({ ...prev, meetings: updated }))
                      }}
                      className="flex-1 p-2 border rounded"
                      placeholder="Meeting link or Room Name"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...courseData.meetings]
                        const randomId = Math.random().toString(36).substring(7)
                        const roomName = `DSATGuru-${Date.now()}-${randomId}`
                        updated[index] = { ...updated[index], link: roomName }
                        setCourseData(prev => ({ ...prev, meetings: updated }))
                      }}
                      className="bg-purple-100 text-purple-700 px-3 py-2 rounded hover:bg-purple-200 text-sm whitespace-nowrap"
                    >
                      Generate Room
                    </button>
                    {m.link && (
                      <button
                        onClick={() => setActiveAdminMeeting(m)}
                        className="bg-green-100 text-green-700 px-3 py-2 rounded hover:bg-green-200 text-sm whitespace-nowrap flex items-center"
                        title="Join Meeting"
                      >
                        <FiVideo className="mr-1" /> Join
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 mt-2">
                    <textarea
                      value={m.transcript || ''}
                      onChange={(e) => {
                        const updated = [...courseData.meetings]
                        updated[index] = { ...updated[index], transcript: e.target.value }
                        setCourseData(prev => ({ ...prev, meetings: updated }))
                      }}
                      className="w-full p-2 border rounded text-sm"
                      rows={4}
                      placeholder="Paste or write meeting transcript here"
                    />
                    <textarea
                      value={m.transcriptSummary || ''}
                      onChange={(e) => {
                        const updated = [...courseData.meetings]
                        updated[index] = { ...updated[index], transcriptSummary: e.target.value }
                        setCourseData(prev => ({ ...prev, meetings: updated }))
                      }}
                      className="w-full p-2 border rounded text-sm"
                      rows={3}
                      placeholder="Short summary of key points (optional)"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCourseData(prev => ({
                          ...prev,
                          meetings: [
                            ...prev.meetings.slice(0, index + 1),
                            { title: '', date: '', link: '', transcript: '', transcriptSummary: '' },
                            ...prev.meetings.slice(index + 1)
                          ]
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
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <CourseCalendar
              events={courseData.calendarEvents.map(evt => ({
                title: evt.title,
                start: new Date(evt.start || evt.date),
                end: new Date(evt.end || evt.date),
                allDay: !evt.start,
                resource: evt
              }))}
              onAddEvent={({ start, end } = {}) => {
                const now = new Date()
                const startStr = start ? moment(start).format('YYYY-MM-DDTHH:mm') : moment(now).format('YYYY-MM-DDTHH:mm')
                const endStr = end ? moment(end).format('YYYY-MM-DDTHH:mm') : moment(now).add(1, 'hour').format('YYYY-MM-DDTHH:mm')
                setEventForm({ title: '', start: startStr, end: endStr, description: '' })
                setShowEventModal(true)
              }}
              onEventClick={(event) => {
                if (confirm(`Delete event "${event.title}"?`)) {
                  const updated = courseData.calendarEvents.filter(e => e !== event.resource)
                  setCourseData(prev => ({ ...prev, calendarEvents: updated }))
                }
              }}
            />
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Study Materials</h2>
              <button
                onClick={() => setShowMaterialModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Add Material
              </button>
            </div>
            
            {/* Materials List */}
            <div className="space-y-4">
              {courseData.materials.map((mat, index) => {
                // Handle both old and new material formats
                const materialName = mat.mainName || mat.title || 'Untitled Material'
                const subMaterialsCount = mat.subMaterials?.length || 0
                const hasSubMaterials = mat.hasSubMaterials || (mat.subMaterials && mat.subMaterials.length > 0)
                
                return (
                  <div key={mat._id || index} className="border rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-lg">{materialName}</h3>
                        <p className="text-sm text-gray-600">
                          {hasSubMaterials ? `${subMaterialsCount} sub-materials` : 'Single material'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setViewingMaterial(mat)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            const updated = courseData.materials.filter((_, i) => i !== index)
                            setCourseData(prev => ({ ...prev, materials: updated }))
                          }}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
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
                onClick={() => {
                  const newIndex = courseData.assignments.length
                  setCourseData(prev => ({
                    ...prev,
                    assignments: [...prev.assignments, { title: '', dueDate: '', status: 'Pending' }]
                  }))
                  setEditingAssignmentIndex(newIndex)
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Add Assignment
              </button>
            </div>
            <div className="space-y-3">
              {courseData.assignments.map((a, index) => (
                <div key={a._id || index} className="border rounded-lg bg-white shadow-sm overflow-hidden">
                  {editingAssignmentIndex === index ? (
                    /* Edit Mode - Full Form */
                    <div className="p-4 bg-blue-50">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-blue-800">Editing Assignment</h3>
                        <button 
                          onClick={() => setEditingAssignmentIndex(null)}
                          className="text-sm bg-white border border-gray-300 px-3 py-1 rounded hover:bg-gray-50"
                        >
                          Done Editing
                        </button>
                      </div>
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
                        <div className="grid grid-cols-2 gap-4">
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
                        
                        {/* Assignment Materials */}
                        <div className="border-t pt-3 mt-3">
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-700">Attached Materials</label>
                            <button
                              onClick={() => {
                                setCurrentAssignmentIndex(index)
                                setShowAssignmentMaterialModal(true)
                              }}
                              className="text-blue-600 text-sm flex items-center gap-1 hover:underline"
                            >
                              <FiUpload size={14} /> Add Material
                            </button>
                          </div>
                          <div className="space-y-2 bg-white p-3 rounded border">
                            {a.materials && a.materials.length > 0 ? (
                              a.materials.map((mat, matIndex) => (
                                <div key={matIndex} className="flex items-center justify-between bg-gray-50 p-2 rounded border text-sm">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <FiFileText className="text-gray-500 flex-shrink-0" />
                                    <a 
                                      href={mat.link} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-blue-600 hover:underline truncate"
                                      title={mat.name}
                                    >
                                      {mat.name || 'Untitled Material'}
                                    </a>
                                    <span className="text-xs text-gray-400 uppercase border px-1 rounded flex-shrink-0">{mat.type}</span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      const updated = [...courseData.assignments]
                                      const updatedMaterials = updated[index].materials.filter((_, i) => i !== matIndex)
                                      updated[index] = { ...updated[index], materials: updatedMaterials }
                                      setCourseData(prev => ({ ...prev, assignments: updated }))
                                    }}
                                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 flex-shrink-0"
                                    title="Remove Material"
                                  >
                                    <FiTrash2 size={14} />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-gray-400 italic text-center py-2">No materials attached to this assignment</div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4 pt-4 border-t border-blue-200">
                        <button
                          onClick={() => setEditingAssignmentIndex(null)}
                          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 w-full"
                        >
                          Save & Close Editor
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode - Summary List */
                    <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate" title={a.title}>
                            {a.title || '(Untitled Assignment)'}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            a.status === 'Active' ? 'bg-green-100 text-green-800' :
                            a.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                            a.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {a.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <FiCalendar size={14} /> 
                            {a.dueDate ? `Due: ${a.dueDate}` : 'No due date'}
                          </span>
                          <span className="flex items-center gap-1">
                            <FiFileText size={14} />
                            {a.materials?.length || 0} Materials
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setViewingAssignment(a)}
                          className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 flex items-center gap-1"
                        >
                          <FiFileText /> View
                        </button>
                        <button
                          onClick={() => setEditingAssignmentIndex(index)}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 flex items-center gap-1"
                        >
                          <FiEdit /> Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this assignment?')) {
                              const updated = courseData.assignments.filter((_, i) => i !== index)
                              setCourseData(prev => ({ ...prev, assignments: updated }))
                            }
                          }}
                          className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700 flex items-center gap-1"
                        >
                          <FiTrash2 /> Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {courseData.assignments.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed rounded-lg text-gray-400">
                  <FiFileText size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No assignments created yet.</p>
                  <button
                    onClick={() => {
                      setCourseData(prev => ({
                        ...prev,
                        assignments: [...prev.assignments, { title: '', dueDate: '', status: 'Pending' }]
                      }))
                      setEditingAssignmentIndex(0)
                    }}
                    className="text-blue-600 hover:underline mt-2"
                  >
                    Create your first assignment
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Enrolled Users</h2>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  Total: {enrolledUsers.length} students
                </div>
                <button
                  onClick={() => {
                    setShowEnrollModal(true)
                    fetchAllUsers()
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
                >
                  <FiUsers size={16} /> Add Enrollment
                </button>
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Access</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {enrollment.accessType === 'lifetime' ? 'Lifetime' : 
                           enrollment.expiresAt ? 
                           `Until ${new Date(enrollment.expiresAt).toLocaleDateString()}` : 
                           `${enrollment.accessDuration || 0} ${enrollment.accessType || 'days'}`}
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
                        <td className="px-4 py-3 text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingEnrollment(enrollment)
                                setEnrollForm({
                                  userId: enrollment.userId?._id || enrollment.userId,
                                  accessType: enrollment.accessType || 'lifetime',
                                  accessDuration: enrollment.accessDuration || ''
                                })
                                setShowEditModal(true)
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit Enrollment"
                            >
                              <FiEdit />
                            </button>
                            <button
                              onClick={() => handleToggleEnrollmentStatus(enrollment._id, enrollment.userId?.isActive !== false)}
                              className="text-orange-600 hover:text-orange-900"
                              title="Toggle Status"
                            >
                              {enrollment.userId?.isActive !== false ? <FiToggleRight /> : <FiToggleLeft />}
                            </button>
                            <button
                              onClick={() => handleDeleteEnrollment(enrollment._id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Enrollment"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
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

      {/* Add Enrollment Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Course Enrollment</h2>
            <form onSubmit={handleAddEnrollment}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Select User</label>
                  <select
                    value={enrollForm.userId}
                    onChange={(e) => setEnrollForm({...enrollForm, userId: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="">Choose a student...</option>
                    {allUsers.filter(user => 
                      !enrolledUsers.some(enrollment => 
                        (enrollment.userId?._id || enrollment.userId) === user._id
                      )
                    ).map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Access Type</label>
                  <select
                    value={enrollForm.accessType}
                    onChange={(e) => {
                      setEnrollForm({...enrollForm, accessType: e.target.value, accessDuration: ''})
                    }}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="lifetime">Lifetime</option>
                    <option value="days">Days</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
                {enrollForm.accessType !== 'lifetime' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Duration ({enrollForm.accessType === 'days' ? 'Max 31' : 
                                enrollForm.accessType === 'months' ? 'Max 12' : 'Any number'})
                    </label>
                    <input
                      type="number"
                      value={enrollForm.accessDuration}
                      onChange={(e) => setEnrollForm({...enrollForm, accessDuration: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                      min="1"
                      max={enrollForm.accessType === 'days' ? '31' : 
                           enrollForm.accessType === 'months' ? '12' : undefined}
                      required
                      placeholder={`Enter number of ${enrollForm.accessType}`}
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEnrollModal(false)
                    setEnrollForm({ userId: '', accessType: 'lifetime', accessDuration: '' })
                  }}
                  className="flex-1 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Enroll User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Material Modal */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add Study Material</h2>
            <form onSubmit={async (e) => {
              e.preventDefault()
              setUploading(true)
              
              try {
                const processedSubMaterials = []
                
                for (const sub of materialForm.subMaterials) {
                  let finalLink = sub.link
                  
                  if (sub.uploadMethod === 'upload' && sub.file) {
                    const formData = new FormData()
                    formData.append('file', sub.file)
                    
                    const uploadResponse = await fetch('/api/upload/materials', {
                      method: 'POST',
                      body: formData
                    })
                    
                    if (uploadResponse.ok) {
                      const uploadResult = await uploadResponse.json()
                      finalLink = uploadResult.url
                    } else {
                      throw new Error('File upload failed')
                    }
                  }
                  
                  processedSubMaterials.push({
                    name: sub.name,
                    link: finalLink,
                    type: sub.type
                  })
                }
                
                const newMaterial = {
                  mainName: materialForm.mainName,
                  hasSubMaterials: materialForm.hasSubMaterials,
                  subMaterials: materialForm.hasSubMaterials ? processedSubMaterials : [{
                    name: materialForm.mainName,
                    link: processedSubMaterials[0]?.link || '',
                    type: processedSubMaterials[0]?.type || 'pdf'
                  }]
                }
                
                const updatedCourseData = {
                  ...courseData,
                  materials: [...courseData.materials, newMaterial]
                }
                
                setCourseData(updatedCourseData)
                
                // Auto-save to database
                console.log('Saving material data:', JSON.stringify(updatedCourseData, null, 2))
                const token = localStorage.getItem('token')
                const saveResponse = await fetch(`/api/admin/courses/${course.id}/content`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                  },
                  body: JSON.stringify({ content: updatedCourseData })
                })
                
                console.log('Save response status:', saveResponse.status)
                
                if (!saveResponse.ok) {
                  throw new Error('Failed to save to database')
                }
                
                setShowMaterialModal(false)
                setMaterialForm({
                  mainName: '',
                  hasSubMaterials: false,
                  subMaterials: [{ name: '', file: null, link: '', type: 'pdf', uploadMethod: 'link' }]
                })
                alert('Material added and saved successfully!')
              } catch (error) {
                console.error('Error:', error)
                alert('Failed to add material: ' + error.message)
              } finally {
                setUploading(false)
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Main Material Name</label>
                  <input
                    type="text"
                    value={materialForm.mainName}
                    onChange={(e) => setMaterialForm({...materialForm, mainName: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    placeholder="e.g., Mathematics"
                    required
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasSubMaterials"
                    checked={materialForm.hasSubMaterials}
                    onChange={(e) => setMaterialForm({
                      ...materialForm, 
                      hasSubMaterials: e.target.checked,
                      subMaterials: e.target.checked ? [{ name: '', file: null, link: '', type: 'pdf', uploadMethod: 'link' }] : materialForm.subMaterials
                    })}
                  />
                  <label htmlFor="hasSubMaterials" className="text-sm">Has sub-materials</label>
                </div>
                
                <div className="space-y-3">
                  <h3 className="font-medium">{materialForm.hasSubMaterials ? 'Sub-Materials' : 'Material Details'}</h3>
                  {materialForm.subMaterials.map((sub, index) => (
                    <div key={index} className="border rounded p-3 space-y-2">
                      <input
                        type="text"
                        value={sub.name}
                        onChange={(e) => {
                          const updated = [...materialForm.subMaterials]
                          updated[index] = { ...updated[index], name: e.target.value }
                          setMaterialForm({...materialForm, subMaterials: updated})
                        }}
                        className="w-full border rounded px-3 py-2"
                        placeholder={materialForm.hasSubMaterials ? `${materialForm.mainName} ${index + 1}` : 'Material name'}
                        required
                      />
                      <select
                        value={sub.type}
                        onChange={(e) => {
                          const updated = [...materialForm.subMaterials]
                          updated[index] = { ...updated[index], type: e.target.value }
                          setMaterialForm({...materialForm, subMaterials: updated})
                        }}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="pdf">PDF</option>
                        <option value="doc">Word Document</option>
                        <option value="video">Video</option>
                      </select>
                      
                      <div className="flex gap-2 mb-2">
                        <label className="flex items-center gap-1">
                          <input
                            type="radio"
                            name={`uploadMethod-${index}`}
                            value="link"
                            checked={sub.uploadMethod === 'link'}
                            onChange={(e) => {
                              const updated = [...materialForm.subMaterials]
                              updated[index] = { ...updated[index], uploadMethod: e.target.value, file: null }
                              setMaterialForm({...materialForm, subMaterials: updated})
                            }}
                          />
                          <span className="text-sm">Link</span>
                        </label>
                        <label className="flex items-center gap-1">
                          <input
                            type="radio"
                            name={`uploadMethod-${index}`}
                            value="upload"
                            checked={sub.uploadMethod === 'upload'}
                            onChange={(e) => {
                              const updated = [...materialForm.subMaterials]
                              updated[index] = { ...updated[index], uploadMethod: e.target.value, link: '' }
                              setMaterialForm({...materialForm, subMaterials: updated})
                            }}
                          />
                          <span className="text-sm">Upload File</span>
                        </label>
                      </div>
                      
                      {sub.uploadMethod === 'link' ? (
                        <input
                          type="url"
                          value={sub.link || ''}
                          onChange={(e) => {
                            const updated = [...materialForm.subMaterials]
                            updated[index] = { ...updated[index], link: e.target.value }
                            setMaterialForm({...materialForm, subMaterials: updated})
                          }}
                          className="w-full border rounded px-3 py-2"
                          placeholder="Enter file URL"
                          required
                        />
                      ) : (
                        <div>
                          <input
                            type="file"
                            accept={sub.type === 'pdf' ? '.pdf' : sub.type === 'doc' ? '.doc,.docx' : sub.type === 'video' ? '.mp4,.avi,.mov' : '*'}
                            onChange={(e) => {
                              const updated = [...materialForm.subMaterials]
                              updated[index] = { ...updated[index], file: e.target.files[0] }
                              setMaterialForm({...materialForm, subMaterials: updated})
                            }}
                            className="w-full border rounded px-3 py-2"
                            required
                          />
                          {sub.file && (
                            <p className="text-sm text-green-600 mt-1">Selected: {sub.file.name}</p>
                          )}
                        </div>
                      )}
                      
                      {materialForm.hasSubMaterials && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = materialForm.subMaterials.filter((_, i) => i !== index)
                            setMaterialForm({...materialForm, subMaterials: updated})
                          }}
                          className="text-red-600 text-sm hover:text-red-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {materialForm.hasSubMaterials && (
                    <button
                      type="button"
                      onClick={() => setMaterialForm({
                        ...materialForm,
                        subMaterials: [...materialForm.subMaterials, { name: '', file: null, link: '', type: 'pdf', uploadMethod: 'link' }]
                      })}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Add More Sub-Material
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowMaterialModal(false)
                    setMaterialForm({
                      mainName: '',
                      hasSubMaterials: false,
                      subMaterials: [{ name: '', file: null, link: '', type: 'pdf', uploadMethod: 'link' }]
                    })
                  }}
                  className="flex-1 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Saving...' : 'Save Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* View Material Modal */}
      {viewingMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{viewingMaterial.mainName || viewingMaterial.title || 'Material Details'}</h2>
              <button
                onClick={() => setViewingMaterial(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {(() => {
                // Handle both old and new material formats
                let materialsToShow = []
                
                if (viewingMaterial.subMaterials && viewingMaterial.subMaterials.length > 0) {
                  // New format with sub-materials
                  materialsToShow = viewingMaterial.subMaterials
                } else if (viewingMaterial.title && viewingMaterial.link) {
                  // Old format - single material
                  materialsToShow = [{
                    name: viewingMaterial.title,
                    link: viewingMaterial.link,
                    type: viewingMaterial.type || 'pdf'
                  }]
                } else {
                  // Fallback
                  materialsToShow = [{
                    name: viewingMaterial.mainName || 'Untitled',
                    link: '#',
                    type: 'pdf'
                  }]
                }
                
                return materialsToShow.map((sub, index) => (
                  <div key={index} className="border rounded p-3 flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{sub.name || 'Untitled'}</h4>
                      <p className="text-sm text-gray-600 capitalize">{sub.type || 'pdf'} file</p>
                    </div>
                    {sub.link && sub.link !== '#' ? (
                      <a
                        href={sub.link}
                        download
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1"
                      >
                        <FiDownload size={14} /> Download
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm">No link available</span>
                    )}
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Edit Enrollment Modal */}
      {showEditModal && editingEnrollment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Enrollment</h2>
            <form onSubmit={handleEditEnrollment}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">User</label>
                  <input
                    type="text"
                    value={editingEnrollment.userId?.name || 'Unknown User'}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Access Type</label>
                  <select
                    value={enrollForm.accessType}
                    onChange={(e) => {
                      setEnrollForm({...enrollForm, accessType: e.target.value, accessDuration: ''})
                    }}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="lifetime">Lifetime</option>
                    <option value="days">Days</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
                {enrollForm.accessType !== 'lifetime' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Duration ({enrollForm.accessType === 'days' ? 'Max 31' : 
                                enrollForm.accessType === 'months' ? 'Max 12' : 'Any number'})
                    </label>
                    <input
                      type="number"
                      value={enrollForm.accessDuration}
                      onChange={(e) => setEnrollForm({...enrollForm, accessDuration: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                      min="1"
                      max={enrollForm.accessType === 'days' ? '31' : 
                           enrollForm.accessType === 'months' ? '12' : undefined}
                      required
                      placeholder={`Enter number of ${enrollForm.accessType}`}
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingEnrollment(null)
                    setEnrollForm({ userId: '', accessType: 'lifetime', accessDuration: '' })
                  }}
                  className="flex-1 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Update Enrollment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Assignment Material Modal */}
      {showAssignmentMaterialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Assignment Material</h2>
            <form onSubmit={async (e) => {
              e.preventDefault()
              setUploading(true)
              try {
                let finalLink = assignmentMaterialForm.link
                
                if (assignmentMaterialForm.uploadMethod === 'upload' && assignmentMaterialForm.file) {
                    const formData = new FormData()
                    formData.append('file', assignmentMaterialForm.file)
                    
                    const uploadResponse = await fetch('/api/upload/materials', {
                      method: 'POST',
                      body: formData
                    })
                    
                    if (uploadResponse.ok) {
                      const uploadResult = await uploadResponse.json()
                      finalLink = uploadResult.url
                    } else {
                      throw new Error('File upload failed')
                    }
                }

                const newMaterial = {
                    name: assignmentMaterialForm.name,
                    link: finalLink,
                    type: assignmentMaterialForm.type
                }

                const updated = [...courseData.assignments]
                const currentMaterials = updated[currentAssignmentIndex].materials || []
                updated[currentAssignmentIndex] = { 
                    ...updated[currentAssignmentIndex], 
                    materials: [...currentMaterials, newMaterial] 
                }
                setCourseData(prev => ({ ...prev, assignments: updated }))

                setShowAssignmentMaterialModal(false)
                setAssignmentMaterialForm({
                    name: '',
                    file: null,
                    link: '',
                    type: 'pdf',
                    uploadMethod: 'link'
                })
                alert('Material added to assignment! Don\'t forget to save changes.')

              } catch (error) {
                console.error(error)
                alert('Failed to add material: ' + error.message)
              } finally {
                setUploading(false)
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Material Name</label>
                  <input
                    type="text"
                    value={assignmentMaterialForm.name}
                    onChange={(e) => setAssignmentMaterialForm({...assignmentMaterialForm, name: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    placeholder="e.g. Question Paper, Reference Doc"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Source Type</label>
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={assignmentMaterialForm.uploadMethod === 'link'}
                        onChange={() => setAssignmentMaterialForm({...assignmentMaterialForm, uploadMethod: 'link'})}
                      />
                      <span>External Link</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={assignmentMaterialForm.uploadMethod === 'upload'}
                        onChange={() => setAssignmentMaterialForm({...assignmentMaterialForm, uploadMethod: 'upload'})}
                      />
                      <span>File Upload</span>
                    </label>
                  </div>
                </div>

                {assignmentMaterialForm.uploadMethod === 'link' ? (
                  <div>
                    <label className="block text-sm font-medium mb-1">Link URL</label>
                    <input
                      type="url"
                      value={assignmentMaterialForm.link}
                      onChange={(e) => setAssignmentMaterialForm({...assignmentMaterialForm, link: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                      placeholder="https://..."
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-1">Select File</label>
                    <input
                      type="file"
                      onChange={(e) => setAssignmentMaterialForm({...assignmentMaterialForm, file: e.target.files[0]})}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                )}

                <div>
                    <label className="block text-sm font-medium mb-1">File Type Label</label>
                    <select
                        value={assignmentMaterialForm.type}
                        onChange={(e) => setAssignmentMaterialForm({...assignmentMaterialForm, type: e.target.value})}
                        className="w-full border rounded px-3 py-2"
                    >
                        <option value="pdf">PDF Document</option>
                        <option value="video">Video</option>
                        <option value="doc">Word Document</option>
                        <option value="link">Web Link</option>
                        <option value="other">Other</option>
                    </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAssignmentMaterialModal(false)}
                  className="flex-1 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Add Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Assignment Modal */}
      {viewingAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">{viewingAssignment.title || 'Untitled Assignment'}</h2>
                <div className="flex gap-2 mt-1">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    viewingAssignment.status === 'Active' ? 'bg-green-100 text-green-800' :
                    viewingAssignment.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                    viewingAssignment.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {viewingAssignment.status}
                  </span>
                  {viewingAssignment.dueDate && (
                    <span className="text-xs text-gray-500 flex items-center gap-1 border px-2 py-1 rounded">
                      <FiCalendar size={12} /> Due: {viewingAssignment.dueDate}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setViewingAssignment(null)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Description */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Description</h3>
                <p className="text-gray-600 whitespace-pre-wrap">
                  {viewingAssignment.description || 'No description provided.'}
                </p>
              </div>

              {/* Materials */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                  <FiDownload /> Attached Materials ({viewingAssignment.materials?.length || 0})
                </h3>
                
                <div className="space-y-3">
                  {viewingAssignment.materials && viewingAssignment.materials.length > 0 ? (
                    viewingAssignment.materials.map((mat, idx) => (
                      <div key={idx} className="flex items-center justify-between border p-3 rounded hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded text-blue-600">
                            {mat.type === 'video' ? <FiVideo /> : <FiFileText />}
                          </div>
                          <div>
                            <div className="font-medium">{mat.name || 'Untitled Material'}</div>
                            <div className="text-xs text-gray-500 uppercase">{mat.type}</div>
                          </div>
                        </div>
                        
                        {mat.link && (
                          <a
                            href={mat.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors"
                          >
                            <FiDownload size={14} /> Download/View
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 border-2 border-dashed rounded-lg text-gray-400">
                      No materials attached to this assignment.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8 pt-4 border-t">
               <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this assignment?')) {
                    const updated = courseData.assignments.filter(a => a !== viewingAssignment)
                    setCourseData(prev => ({ ...prev, assignments: updated }))
                    setViewingAssignment(null)
                  }
                }}
                className="text-red-600 hover:text-red-800 flex items-center gap-2 px-3 py-2 rounded hover:bg-red-50"
              >
                <FiTrash2 /> Delete Assignment
              </button>
              
              <button
                onClick={() => setViewingAssignment(null)}
                className="bg-gray-200 text-gray-800 px-6 py-2 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Calendar Event</h2>
            <form onSubmit={(e) => {
              e.preventDefault()
              setCourseData(prev => ({
                ...prev,
                calendarEvents: [...prev.calendarEvents, eventForm]
              }))
              setShowEventModal(false)
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.start}
                    onChange={(e) => setEventForm({ ...eventForm, start: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.end}
                    onChange={(e) => setEventForm({ ...eventForm, end: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    className="w-full p-2 border rounded"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEventModal(false)}
                    className="px-4 py-2 border rounded hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add Event
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LiveKit Meeting Modal */}
      {activeAdminMeeting && (
        <LiveKitMeeting
          roomName={activeAdminMeeting.link}
          displayName="Admin"
          isAdmin={true}
          onClose={() => setActiveAdminMeeting(null)}
        />
      )}
    </div>
  )
}
