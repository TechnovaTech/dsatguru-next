'use client'
import { useState, useEffect } from 'react'
import { FiVideo, FiDownload, FiCalendar, FiFileText, FiSave, FiArrowLeft, FiUsers, FiEdit, FiToggleLeft, FiToggleRight, FiTrash2, FiFolder, FiUpload, FiFile, FiBell, FiEye, FiSearch, FiX, FiImage } from 'react-icons/fi'
import CourseCalendar from './CourseCalendar'
import { useConfirm, useToast } from '../ui/UIProvider'
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
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  const courseList = Array.isArray(courses) ? courses.filter(c => c.type ? c.type === 'course' : true) : []

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">Manage Courses</h1>
      </div>

      {courseList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center shadow-sm">
          <FiFolder size={40} className="mb-3 text-slate-300" />
          <h3 className="text-base font-semibold text-slate-700">No courses yet</h3>
          <p className="mt-1 text-sm text-slate-400">Courses you create will appear here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Course</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Instructor</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Enrollments</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courseList.map((course) => (
                  <tr key={course._id || course.id} className="transition-colors hover:bg-indigo-50/40">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-slate-900">{course.title}</div>
                        <div className="text-sm text-slate-500">{course.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{course.instructor || 'Instructor'}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{course.duration || '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{course.enrollments || 0}</td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <button
                        onClick={() => setSelectedCourse({
                          id: course._id || course.id,
                          title: course.title
                        })}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Manage Content
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function CourseContentManager({ course, onBack }) {
  const confirm = useConfirm()
  const toast = useToast()
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
  const [transcriptSearch, setTranscriptSearch] = useState('')
  const [viewingSummary, setViewingSummary] = useState(null)
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
        toast.success('User enrolled successfully!')
        setShowEnrollModal(false)
        setEnrollForm({ userId: '', accessType: 'lifetime', accessDuration: '' })
        fetchEnrolledUsers()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to enroll user')
      }
    } catch (error) {
      toast.error('Failed to enroll user')
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
        toast.success('Enrollment updated successfully!')
        setShowEditModal(false)
        setEditingEnrollment(null)
        setEnrollForm({ userId: '', accessType: 'lifetime', accessDuration: '' })
        fetchEnrolledUsers()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update enrollment')
        console.error('Update error:', error)
      }
    } catch (error) {
      console.error('Update error:', error)
      toast.error('Failed to update enrollment')
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
        toast.error('Failed to toggle status')
      }
    } catch (error) {
      toast.error('Failed to toggle status')
    }
  }

  const handleDeleteEnrollment = async (enrollmentId) => {
    if (!(await confirm({ message: 'Are you sure you want to remove this enrollment?', tone: 'danger', confirmText: 'Delete' }))) return
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/courses/${course.id}/enrollments/${enrollmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        toast.success('Enrollment removed successfully!')
        fetchEnrolledUsers()
      } else {
        toast.error('Failed to remove enrollment')
      }
    } catch (error) {
      toast.error('Failed to remove enrollment')
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
        toast.success('Content saved successfully!')
      }
    } catch (error) {
      console.error('Error saving content:', error)
      toast.error('Failed to save content')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button onClick={onBack} className="mb-2 flex items-center gap-2 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700">
            <FiArrowLeft /> Back to Courses
          </button>
          <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">{course.title}</h1>
          <p className="mt-1 text-sm text-slate-500">Manage course content and materials</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          <FiSave /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex overflow-x-auto whitespace-nowrap border-b border-slate-100">
          {[
            { id: 'meetings', label: 'Live Meetings', icon: <FiVideo size={16} /> },
            { id: 'transcripts', label: 'Transcripts', icon: <FiFileText size={16} /> },
            { id: 'calendar', label: 'Calendar', icon: <FiCalendar size={16} /> },
            { id: 'materials', label: 'Study Materials', icon: <FiDownload size={16} /> },
            { id: 'syllabus', label: 'Course Timeline', icon: <FiCalendar size={16} /> },
            { id: 'assignments', label: 'Assignments', icon: <FiFileText size={16} /> },
            { id: 'users', label: 'Enrolled Users', icon: <FiUsers size={16} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <>
            {activeTab === 'meetings' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Live Meetings</h2>
              <button
                onClick={() => setCourseData(prev => ({
                  ...prev,
                  meetings: [
                    ...prev.meetings,
                    { title: '', date: '', link: '', transcript: '', transcriptSummary: '' }
                  ]
                }))}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Add Meeting
              </button>
            </div>
            {courseData.meetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                <FiVideo size={40} className="mb-3 text-slate-300" />
                <h3 className="text-base font-semibold text-slate-700">No meetings yet</h3>
                <p className="mt-1 text-sm text-slate-400">Click &quot;Add Meeting&quot; to schedule a live session.</p>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courseData.meetings.map((m, index) => (
                <div key={m._id || index} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <input
                    type="text"
                    value={m.title}
                    onChange={(e) => {
                      const updated = [...courseData.meetings]
                      updated[index] = { ...updated[index], title: e.target.value }
                      setCourseData(prev => ({ ...prev, meetings: updated }))
                    }}
                    className="w-full mb-2 rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full mb-2 rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
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
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
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
                      className="bg-violet-50 text-violet-700 px-3 py-2 rounded-lg hover:bg-violet-100 text-sm whitespace-nowrap transition-colors"
                    >
                      Generate Room
                    </button>
                    {m.link && (
                      <button
                        onClick={() => setActiveAdminMeeting(m)}
                        className="bg-green-50 text-green-700 px-3 py-2 rounded-lg hover:bg-green-100 text-sm whitespace-nowrap flex items-center transition-colors"
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
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
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
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
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
                        className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                      >
                        Add Below
                      </button>
                      <button
                        onClick={() => {
                          const updated = courseData.meetings.filter((_, i) => i !== index)
                          setCourseData(prev => ({ ...prev, meetings: updated }))
                        }}
                        className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-4">
            {courseData.calendarEvents.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-8 text-center">
                <FiCalendar size={36} className="mb-2 text-slate-300" />
                <h3 className="text-sm font-semibold text-slate-700">No calendar events yet</h3>
                <p className="mt-1 text-sm text-slate-400">Click a date on the calendar below to add an event.</p>
              </div>
            )}
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
              onEventClick={async (event) => {
                if (await confirm({ message: `Delete event "${event.title}"?`, tone: 'danger', confirmText: 'Delete' })) {
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
              <h2 className="text-xl font-bold text-slate-900">Study Materials</h2>
              <button
                onClick={() => setShowMaterialModal(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Add Material
              </button>
            </div>

            {/* Materials List */}
            <div className="space-y-4">
              {courseData.materials.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                  <FiDownload size={40} className="mb-3 text-slate-300" />
                  <h3 className="text-base font-semibold text-slate-700">No study materials yet</h3>
                  <p className="mt-1 text-sm text-slate-400">Click &quot;Add Material&quot; to share resources with students.</p>
                </div>
              ) : courseData.materials.map((mat, index) => {
                // Handle both old and new material formats
                const materialName = mat.mainName || mat.title || 'Untitled Material'
                const subMaterialsCount = mat.subMaterials?.length || 0
                const hasSubMaterials = mat.hasSubMaterials || (mat.subMaterials && mat.subMaterials.length > 0)

                return (
                  <div key={mat._id || index} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-lg text-slate-900">{materialName}</h3>
                        <p className="text-sm text-slate-500">
                          {hasSubMaterials ? `${subMaterialsCount} sub-materials` : 'Single material'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setViewingMaterial(mat)}
                          className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            const updated = courseData.materials.filter((_, i) => i !== index)
                            setCourseData(prev => ({ ...prev, materials: updated }))
                          }}
                          className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700 transition-colors"
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
              <h2 className="text-xl font-bold text-slate-900">Course Timeline</h2>
              <button
                onClick={() => setCourseData(prev => ({
                  ...prev,
                  syllabus: [...prev.syllabus, { week: prev.syllabus.length + 1, title: '', description: '' }]
                }))}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Add Topic
              </button>
            </div>
            <div className="space-y-3">
              {courseData.syllabus.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                  <FiCalendar size={40} className="mb-3 text-slate-300" />
                  <h3 className="text-base font-semibold text-slate-700">No timeline topics yet</h3>
                  <p className="mt-1 text-sm text-slate-400">Click &quot;Add Topic&quot; to build the course timeline.</p>
                </div>
              ) : courseData.syllabus.map((t, index) => (
                <div key={t._id || index} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="number"
                      value={t.week}
                      onChange={(e) => {
                        const updated = [...courseData.syllabus]
                        updated[index] = { ...updated[index], week: parseInt(e.target.value) }
                        setCourseData(prev => ({ ...prev, syllabus: updated }))
                      }}
                      className="w-20 rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
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
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    placeholder="Description"
                    rows="2"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setCourseData(prev => ({
                        ...prev,
                        syllabus: [...prev.syllabus.slice(0, index + 1), { week: prev.syllabus.length + 1, title: '', description: '' }, ...prev.syllabus.slice(index + 1)]
                      }))}
                      className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                    >
                      Add Below
                    </button>
                    <button
                      onClick={() => {
                        const updated = courseData.syllabus.filter((_, i) => i !== index)
                        setCourseData(prev => ({ ...prev, syllabus: updated }))
                      }}
                      className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700 transition-colors"
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
              <h2 className="text-xl font-bold text-slate-900">Assignments</h2>
              <button
                onClick={() => {
                  const newIndex = courseData.assignments.length
                  setCourseData(prev => ({
                    ...prev,
                    assignments: [...prev.assignments, { title: '', dueDate: '', status: 'Pending' }]
                  }))
                  setEditingAssignmentIndex(newIndex)
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Add Assignment
              </button>
            </div>
            <div className="space-y-3">
              {courseData.assignments.map((a, index) => (
                <div key={a._id || index} className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                  {editingAssignmentIndex === index ? (
                    /* Edit Mode - Full Form */
                    <div className="p-4 bg-indigo-50/60">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-indigo-700">Editing Assignment</h3>
                        <button
                          onClick={() => setEditingAssignmentIndex(null)}
                          className="text-sm bg-white border border-slate-300 text-slate-600 px-3 py-1 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          Done Editing
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">Assignment Title</label>
                          <input
                            type="text"
                            value={a.title}
                            onChange={(e) => {
                              const updated = [...courseData.assignments]
                              updated[index] = { ...updated[index], title: e.target.value }
                              setCourseData(prev => ({ ...prev, assignments: updated }))
                            }}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                            placeholder="Enter assignment title"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">Description</label>
                          <textarea
                            value={a.description || ''}
                            onChange={(e) => {
                              const updated = [...courseData.assignments]
                              updated[index] = { ...updated[index], description: e.target.value }
                              setCourseData(prev => ({ ...prev, assignments: updated }))
                            }}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                            placeholder="Enter assignment description"
                            rows="3"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Due Date (dd-mm-yyyy)</label>
                            <input
                              type="date"
                              value={a.dueDate}
                              onChange={(e) => {
                                const updated = [...courseData.assignments]
                                updated[index] = { ...updated[index], dueDate: e.target.value }
                                setCourseData(prev => ({ ...prev, assignments: updated }))
                              }}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Status</label>
                            <select
                              value={a.status}
                              onChange={(e) => {
                                const updated = [...courseData.assignments]
                                updated[index] = { ...updated[index], status: e.target.value }
                                setCourseData(prev => ({ ...prev, assignments: updated }))
                              }}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Active">Active</option>
                              <option value="Completed">Completed</option>
                              <option value="Overdue">Overdue</option>
                            </select>
                          </div>
                        </div>

                        {/* Assignment Materials */}
                        <div className="border-t border-slate-200 pt-3 mt-3">
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-slate-600">Attached Materials</label>
                            <button
                              onClick={() => {
                                setCurrentAssignmentIndex(index)
                                setShowAssignmentMaterialModal(true)
                              }}
                              className="text-indigo-600 text-sm flex items-center gap-1 hover:underline"
                            >
                              <FiUpload size={14} /> Add Material
                            </button>
                          </div>
                          <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200">
                            {a.materials && a.materials.length > 0 ? (
                              a.materials.map((mat, matIndex) => (
                                <div key={matIndex} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200 text-sm">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <FiFileText className="text-slate-400 flex-shrink-0" />
                                    <a
                                      href={mat.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-indigo-600 hover:underline truncate"
                                      title={mat.name}
                                    >
                                      {mat.name || 'Untitled Material'}
                                    </a>
                                    <span className="text-xs text-slate-400 uppercase border border-slate-200 px-1 rounded flex-shrink-0">{mat.type}</span>
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
                              <div className="text-sm text-slate-400 italic text-center py-2">No materials attached to this assignment</div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4 pt-4 border-t border-indigo-100">
                        <button
                          onClick={() => setEditingAssignmentIndex(null)}
                          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 w-full transition-colors"
                        >
                          Save & Close Editor
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode - Summary List */
                    <div className="p-4 flex items-center justify-between hover:bg-indigo-50/40 transition-colors">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-slate-900 truncate" title={a.title}>
                            {a.title || '(Untitled Assignment)'}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            a.status === 'Active' ? 'bg-green-50 text-green-700' :
                            a.status === 'Completed' ? 'bg-indigo-50 text-indigo-700' :
                            a.status === 'Overdue' ? 'bg-red-50 text-red-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {a.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
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
                          className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700 flex items-center gap-1 transition-colors"
                        >
                          <FiFileText /> View
                        </button>
                        <button
                          onClick={() => setEditingAssignmentIndex(index)}
                          className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-1 transition-colors"
                        >
                          <FiEdit /> Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (await confirm({ message: 'Are you sure you want to delete this assignment?', tone: 'danger', confirmText: 'Delete' })) {
                              const updated = courseData.assignments.filter((_, i) => i !== index)
                              setCourseData(prev => ({ ...prev, assignments: updated }))
                            }
                          }}
                          className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-red-700 flex items-center gap-1 transition-colors"
                        >
                          <FiTrash2 /> Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {courseData.assignments.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                  <FiFileText size={40} className="mb-3 text-slate-300" />
                  <h3 className="text-base font-semibold text-slate-700">No assignments created yet</h3>
                  <button
                    onClick={() => {
                      setCourseData(prev => ({
                        ...prev,
                        assignments: [...prev.assignments, { title: '', dueDate: '', status: 'Pending' }]
                      }))
                      setEditingAssignmentIndex(0)
                    }}
                    className="text-indigo-600 hover:underline mt-2 text-sm"
                  >
                    Create your first assignment
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'transcripts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Meeting Transcripts</h2>
              <div className="relative w-64">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search in transcripts..."
                  value={transcriptSearch}
                  onChange={(e) => setTranscriptSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Meeting</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Intelligent Recap</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const filteredMeetings = courseData.meetings.filter(m => {
                      if (!m.transcript && !m.transcriptSummary) return false;
                      if (!transcriptSearch) return true;
                      const searchLower = transcriptSearch.toLowerCase();
                      return (
                        (m.title || '').toLowerCase().includes(searchLower) ||
                        (m.transcript || '').toLowerCase().includes(searchLower) ||
                        (m.transcriptSummary || '').toLowerCase().includes(searchLower)
                      );
                    });

                    return filteredMeetings.length > 0 ? (
                      filteredMeetings.map((m, index) => (
                      <tr key={m._id || index} className="transition-colors hover:bg-indigo-50/40">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {m.title || 'Untitled Meeting'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {m.date ? new Date(m.date).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {m.transcriptSummary ? (
                            <div className="max-w-xs truncate text-indigo-600 font-medium" title={m.transcriptSummary}>
                              Recap available
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No recap</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          <div className="flex gap-2">
                            {m.transcript && (
                              <button
                                onClick={async () => {
                                  try {
                                    const jsPDF = (await import('jspdf')).default
                                    const pdf = new jsPDF()
                                    const pageWidth = pdf.internal.pageSize.width
                                    const pageHeight = pdf.internal.pageSize.height
                                    
                                    // Modern Blue Header Background
                                    pdf.setFillColor(36, 36, 56)
                                    pdf.rect(0, 0, pageWidth, 50, 'F')
                                    
                                    // Title
                                    pdf.setFont('helvetica', 'bold')
                                    pdf.setFontSize(24)
                                    pdf.setTextColor(255, 255, 255)
                                    pdf.text('SESSION REPORT', 20, 30)
                                    
                                    // Meta Info
                                    pdf.setFont('helvetica', 'normal')
                                    pdf.setFontSize(10)
                                    pdf.setTextColor(200, 200, 200)
                                    pdf.text(`Meeting: ${m.title || 'Untitled'}`, 20, 42)
                                    pdf.text(`Date: ${m.date ? new Date(m.date).toLocaleString() : 'N/A'}`, pageWidth - 80, 42)
                                    
                                    let y = 65

                                    // 1. Intelligent Recap Section if exists
                                    if (m.transcriptSummary && m.transcriptSummary !== 'Summary generation failed.') {
                                      pdf.setFont('helvetica', 'bold')
                                      pdf.setFontSize(16)
                                      pdf.setTextColor(36, 36, 56)
                                      pdf.text('Intelligent Recap', 20, y)
                                      y += 10

                                      pdf.setFont('helvetica', 'normal')
                                      pdf.setFontSize(10)
                                      pdf.setTextColor(50, 50, 50)
                                      
                                      const summaryLines = pdf.splitTextToSize(m.transcriptSummary, pageWidth - 40)
                                      summaryLines.forEach(line => {
                                        if (y > pageHeight - 20) {
                                          pdf.addPage()
                                          y = 20
                                        }
                                        pdf.text(line, 20, y)
                                        y += 5
                                      })
                                      y += 15
                                    }

                                    // 2. Transcript Section
                                    pdf.setFont('helvetica', 'bold')
                                    pdf.setFontSize(16)
                                    pdf.setTextColor(36, 36, 56)
                                    pdf.text('Class Transcript', 20, y)
                                    y += 10
                                    
                                    pdf.setDrawColor(230, 230, 230)
                                    pdf.line(20, y, pageWidth - 20, y)
                                    y += 10
                                    
                                    pdf.setFontSize(10)
                                    const lines = (m.transcript || '').split('\n').filter(Boolean)
                                    lines.forEach(line => {
                                      const match = line.match(/^\[(.*?)\] (.*?): (.*)$/)
                                      if (match) {
                                        const [_, time, speaker, text] = match
                                        if (y > pageHeight - 30) {
                                          pdf.addPage()
                                          y = 20
                                        }
                                        pdf.setFont('helvetica', 'bold')
                                        pdf.setTextColor(66, 133, 244)
                                        pdf.text(`${speaker}`, 20, y)
                                        pdf.setFont('helvetica', 'italic')
                                        pdf.setTextColor(150, 150, 150)
                                        pdf.text(`[${time}]`, 20 + pdf.getTextWidth(speaker) + 5, y)
                                        y += 6
                                        pdf.setFont('helvetica', 'normal')
                                        pdf.setTextColor(40, 40, 40)
                                        const splitText = pdf.splitTextToSize(text, pageWidth - 40)
                                        splitText.forEach(tLine => {
                                          if (y > pageHeight - 20) {
                                            pdf.addPage()
                                            y = 20
                                          }
                                          pdf.text(tLine, 25, y)
                                          y += 5
                                        })
                                        y += 4
                                      }
                                    })

                                    // 3. Visual Highlights Section
                                    if (m.snapshots && m.snapshots.length > 0) {
                                      pdf.addPage()
                                      pdf.setFillColor(36, 36, 56)
                                      pdf.rect(0, 0, pageWidth, 40, 'F')
                                      pdf.setFont('helvetica', 'bold')
                                      pdf.setFontSize(20)
                                      pdf.setTextColor(255, 255, 255)
                                      pdf.text('VISUAL HIGHLIGHTS', 20, 25)
                                      
                                      y = 55
                                      for (const snap of m.snapshots) {
                                        if (y > pageHeight - 110) {
                                          pdf.addPage()
                                          y = 25
                                        }
                                        pdf.setDrawColor(240, 240, 240)
                                        pdf.setFillColor(252, 252, 252)
                                        pdf.roundedRect(15, y, pageWidth - 30, 105, 3, 3, 'FD')
                                        pdf.setFont('helvetica', 'bold')
                                        pdf.setFontSize(9)
                                        pdf.setTextColor(100, 100, 100)
                                        pdf.text(`Screen Capture - ${snap.timestamp}`, 20, y + 8)
                                        try {
                                          pdf.addImage(snap.imageUrl, 'JPEG', 20, y + 12, pageWidth - 40, 85)
                                          y += 115
                                        } catch (e) {
                                          console.error('Failed to add image to PDF:', e)
                                          y += 10
                                        }
                                      }
                                    }
                                    
                                    pdf.save(`Report-${m.title || 'Meeting'}-${new Date(m.date).toLocaleDateString()}.pdf`)
                                  } catch (error) {
                                    console.error('PDF generation failed:', error)
                                    toast.error('Failed to generate PDF')
                                  }
                                }}
                                className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                title="Download Transcript (PDF)"
                              >
                                <FiDownload /> Download PDF
                              </button>
                            )}
                            {m.transcriptSummary && (
                              <button
                                onClick={() => setViewingSummary(m)}
                                className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                title="View Intelligent Recap"
                              >
                                <FiVideo /> Intelligent Recap
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                if (await confirm({ message: 'Are you sure you want to delete this transcript and all related snapshots?', tone: 'danger', confirmText: 'Delete' })) {
                                  try {
                                    const token = localStorage.getItem('token')
                                    const res = await fetch('/api/admin/meetings/delete-transcript', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        Authorization: `Bearer ${token}`
                                      },
                                      body: JSON.stringify({ 
                                        courseId: selectedCourse?._id || courseData?._id, 
                                        meetingId: m._id 
                                      })
                                    })
                                    const data = await res.json()
                                    if (res.ok) {
                                      // Update local state to reflect deletion
                                      setCourseData(prev => ({
                                        ...prev,
                                        meetings: prev.meetings.map(meet => 
                                          String(meet._id) === String(m._id) 
                                            ? { ...meet, transcript: undefined, transcriptSummary: undefined, snapshots: [] }
                                            : meet
                                        )
                                      }))
                                      toast.success('Transcript deleted successfully')
                                    } else {
                                      toast.error(`Failed: ${data.error || 'Unknown error'}`)
                                    }
                                  } catch (error) {
                                    console.error('Delete transcript error:', error)
                                    toast.error('Failed to connect to server')
                                  }
                                }
                              }}
                              className="text-red-600 hover:text-red-800 flex items-center gap-1 ml-2"
                              title="Delete Transcript"
                            >
                              <FiTrash2 /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                    ) : (
                    <tr>
                      <td colSpan="4" className="px-4 py-12 text-center">
                        <FiFileText size={40} className="mx-auto mb-3 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-700">
                          {transcriptSearch ? 'No transcripts match your search' : 'No transcripts available yet'}
                        </p>
                        {!transcriptSearch && (
                          <p className="mt-1 text-sm text-slate-400">They will appear here after meetings conclude.</p>
                        )}
                      </td>
                    </tr>
                    );
                  })()}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        {/* Intelligent Recap Modal */}
        {viewingSummary && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-fadeIn">
              <div className="p-5 border-b flex items-center justify-between bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <FiVideo size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Intelligent Recap</h3>
                    <p className="text-indigo-100 text-xs">{viewingSummary.title}</p>
                  </div>
                </div>
                <button className="p-2 hover:bg-white/10 rounded-full transition-colors" onClick={() => setViewingSummary(null)}>
                  <FiX size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 custom-scrollbar">
                <div className="prose prose-sm max-w-none prose-indigo">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm whitespace-pre-wrap leading-relaxed text-slate-800 font-sans">
                    {viewingSummary.transcriptSummary}
                  </div>
                </div>

                {viewingSummary.snapshots && viewingSummary.snapshots.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-700 flex items-center gap-2">
                      <FiImage /> Visual Recap
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {viewingSummary.snapshots.map((snap, i) => (
                        <div key={i} className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm space-y-2">
                          <img src={snap.imageUrl} alt={snap.title} className="w-full h-auto rounded border border-slate-200" />
                          <div className="flex justify-between items-center text-[10px] text-slate-500">
                            <span>{snap.title}</span>
                            <span>{snap.timestamp}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t bg-white flex justify-end">
                <button 
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  onClick={() => setViewingSummary(null)}
                >
                  Close Recap
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Enrolled Users</h2>
              <div className="flex items-center gap-4">
                <div className="text-sm text-slate-500">
                  Total: {enrolledUsers.length} students
                </div>
                <button
                  onClick={() => {
                    setShowEnrollModal(true)
                    fetchAllUsers()
                  }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                >
                  <FiUsers size={16} /> Add Enrollment
                </button>
              </div>
            </div>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mr-3"></div>
                <span className="text-slate-500">Loading enrolled users...</span>
              </div>
            ) : enrolledUsers.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Enrolled Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Access</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {enrolledUsers.map((enrollment, index) => (
                      <tr key={enrollment._id || index} className="transition-colors hover:bg-indigo-50/40">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {enrollment.userId?.name || enrollment.userName || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {enrollment.userId?.email || enrollment.userEmail || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {new Date(enrollment.enrolledAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {enrollment.accessType === 'lifetime' ? 'Lifetime' :
                           enrollment.expiresAt ?
                           `Until ${new Date(enrollment.expiresAt).toLocaleDateString()}` :
                           `${enrollment.accessDuration || 0} ${enrollment.accessType || 'days'}`}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            enrollment.isActive !== false
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}>
                            {enrollment.isActive !== false ? 'Active' : 'Inactive'}
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
                              className="text-indigo-600 hover:text-indigo-800"
                              title="Edit Enrollment"
                            >
                              <FiEdit />
                            </button>
                            <button
                              onClick={() => handleToggleEnrollmentStatus(enrollment._id, enrollment.isActive !== false)}
                              className="text-amber-600 hover:text-amber-800"
                              title="Toggle Status"
                            >
                              {enrollment.isActive !== false ? <FiToggleRight /> : <FiToggleLeft />}
                            </button>
                            <button
                              onClick={() => handleDeleteEnrollment(enrollment._id)}
                              className="text-red-600 hover:text-red-800"
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
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                <FiUsers size={40} className="mb-3 text-slate-300" />
                <h3 className="text-base font-semibold text-slate-700">No students enrolled yet</h3>
                <p className="mt-1 text-sm text-slate-400">Click &quot;Add Enrollment&quot; to enroll a student in this course.</p>
              </div>
            )}
          </div>
            )}
          </>
        )}
      </div>

      {/* Add Enrollment Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Add Course Enrollment</h2>
            <form onSubmit={handleAddEnrollment}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Select User</label>
                  <select
                    value={enrollForm.userId}
                    onChange={(e) => setEnrollForm({...enrollForm, userId: e.target.value})}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
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
                  <label className="block text-sm font-medium text-slate-600 mb-1">Access Type</label>
                  <select
                    value={enrollForm.accessType}
                    onChange={(e) => {
                      setEnrollForm({...enrollForm, accessType: e.target.value, accessDuration: ''})
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="lifetime">Lifetime</option>
                    <option value="days">Days</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
                {enrollForm.accessType !== 'lifetime' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      Duration ({enrollForm.accessType === 'days' ? 'Max 31' :
                                enrollForm.accessType === 'months' ? 'Max 12' : 'Any number'})
                    </label>
                    <input
                      type="number"
                      value={enrollForm.accessDuration}
                      onChange={(e) => setEnrollForm({...enrollForm, accessDuration: e.target.value})}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
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
                  className="flex-1 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Add Study Material</h2>
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
                toast.success('Material added and saved successfully!')
              } catch (error) {
                console.error('Error:', error)
                toast.error('Failed to add material: ' + error.message)
              } finally {
                setUploading(false)
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Main Material Name</label>
                  <input
                    type="text"
                    value={materialForm.mainName}
                    onChange={(e) => setMaterialForm({...materialForm, mainName: e.target.value})}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
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
                  <label htmlFor="hasSubMaterials" className="text-sm text-slate-600">Has sub-materials</label>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium text-slate-700">{materialForm.hasSubMaterials ? 'Sub-Materials' : 'Material Details'}</h3>
                  {materialForm.subMaterials.map((sub, index) => (
                    <div key={index} className="rounded-lg border border-slate-200 p-3 space-y-2">
                      <input
                        type="text"
                        value={sub.name}
                        onChange={(e) => {
                          const updated = [...materialForm.subMaterials]
                          updated[index] = { ...updated[index], name: e.target.value }
                          setMaterialForm({...materialForm, subMaterials: updated})
                        }}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
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
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
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
                          <span className="text-sm text-slate-600">Link</span>
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
                          <span className="text-sm text-slate-600">Upload File</span>
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
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
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
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
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
                      className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-indigo-700 transition-colors"
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
                  className="flex-1 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
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
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">{viewingMaterial.mainName || viewingMaterial.title || 'Material Details'}</h2>
              <button
                onClick={() => setViewingMaterial(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <FiX size={20} />
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
                  <div key={index} className="rounded-lg border border-slate-200 p-3 flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-slate-900">{sub.name || 'Untitled'}</h4>
                      <p className="text-sm text-slate-500 capitalize">{sub.type || 'pdf'} file</p>
                    </div>
                    {sub.link && sub.link !== '#' ? (
                      <a
                        href={sub.link}
                        download
                        className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-700 flex items-center gap-1 transition-colors"
                      >
                        <FiDownload size={14} /> Download
                      </a>
                    ) : (
                      <span className="text-slate-400 text-sm">No link available</span>
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
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Edit Enrollment</h2>
            <form onSubmit={handleEditEnrollment}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">User</label>
                  <input
                    type="text"
                    value={editingEnrollment.userId?.name || 'Unknown User'}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-slate-100 text-slate-500"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Access Type</label>
                  <select
                    value={enrollForm.accessType}
                    onChange={(e) => {
                      setEnrollForm({...enrollForm, accessType: e.target.value, accessDuration: ''})
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="lifetime">Lifetime</option>
                    <option value="days">Days</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
                {enrollForm.accessType !== 'lifetime' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      Duration ({enrollForm.accessType === 'days' ? 'Max 31' :
                                enrollForm.accessType === 'months' ? 'Max 12' : 'Any number'})
                    </label>
                    <input
                      type="number"
                      value={enrollForm.accessDuration}
                      onChange={(e) => setEnrollForm({...enrollForm, accessDuration: e.target.value})}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
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
                  className="flex-1 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Add Assignment Material</h2>
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
                toast.success('Material added to assignment! Don\'t forget to save changes.')

              } catch (error) {
                console.error(error)
                toast.error('Failed to add material: ' + error.message)
              } finally {
                setUploading(false)
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Material Name</label>
                  <input
                    type="text"
                    value={assignmentMaterialForm.name}
                    onChange={(e) => setAssignmentMaterialForm({...assignmentMaterialForm, name: e.target.value})}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Question Paper, Reference Doc"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Source Type</label>
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-2 text-slate-600">
                      <input
                        type="radio"
                        checked={assignmentMaterialForm.uploadMethod === 'link'}
                        onChange={() => setAssignmentMaterialForm({...assignmentMaterialForm, uploadMethod: 'link'})}
                      />
                      <span>External Link</span>
                    </label>
                    <label className="flex items-center gap-2 text-slate-600">
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
                    <label className="block text-sm font-medium text-slate-600 mb-1">Link URL</label>
                    <input
                      type="url"
                      value={assignmentMaterialForm.link}
                      onChange={(e) => setAssignmentMaterialForm({...assignmentMaterialForm, link: e.target.value})}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                      placeholder="https://..."
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Select File</label>
                    <input
                      type="file"
                      onChange={(e) => setAssignmentMaterialForm({...assignmentMaterialForm, file: e.target.files[0]})}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">File Type Label</label>
                    <select
                        value={assignmentMaterialForm.type}
                        onChange={(e) => setAssignmentMaterialForm({...assignmentMaterialForm, type: e.target.value})}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
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
                  className="flex-1 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
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
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{viewingAssignment.title || 'Untitled Assignment'}</h2>
                <div className="flex gap-2 mt-1">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    viewingAssignment.status === 'Active' ? 'bg-green-50 text-green-700' :
                    viewingAssignment.status === 'Completed' ? 'bg-indigo-50 text-indigo-700' :
                    viewingAssignment.status === 'Overdue' ? 'bg-red-50 text-red-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {viewingAssignment.status}
                  </span>
                  {viewingAssignment.dueDate && (
                    <span className="text-xs text-slate-500 flex items-center gap-1 border border-slate-200 px-2 py-1 rounded">
                      <FiCalendar size={12} /> Due: {viewingAssignment.dueDate}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setViewingAssignment(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Description */}
              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Description</h3>
                <p className="text-slate-600 whitespace-pre-wrap">
                  {viewingAssignment.description || 'No description provided.'}
                </p>
              </div>

              {/* Materials */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                  <FiDownload /> Attached Materials ({viewingAssignment.materials?.length || 0})
                </h3>

                <div className="space-y-3">
                  {viewingAssignment.materials && viewingAssignment.materials.length > 0 ? (
                    viewingAssignment.materials.map((mat, idx) => (
                      <div key={idx} className="flex items-center justify-between border border-slate-200 p-3 rounded-lg hover:bg-indigo-50/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-50 p-2 rounded text-indigo-600">
                            {mat.type === 'video' ? <FiVideo /> : <FiFileText />}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{mat.name || 'Untitled Material'}</div>
                            <div className="text-xs text-slate-500 uppercase">{mat.type}</div>
                          </div>
                        </div>

                        {mat.link && (
                          <a
                            href={mat.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                          >
                            <FiDownload size={14} /> Download/View
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-400">
                      No materials attached to this assignment.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8 pt-4 border-t border-slate-100">
               <button
                onClick={async () => {
                  if (await confirm({ message: 'Are you sure you want to delete this assignment?', tone: 'danger', confirmText: 'Delete' })) {
                    const updated = courseData.assignments.filter(a => a !== viewingAssignment)
                    setCourseData(prev => ({ ...prev, assignments: updated }))
                    setViewingAssignment(null)
                  }
                }}
                className="text-red-600 hover:text-red-800 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                <FiTrash2 /> Delete Assignment
              </button>

              <button
                onClick={() => setViewingAssignment(null)}
                className="border border-slate-300 text-slate-600 px-6 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Add Calendar Event</h2>
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
                  <label className="block text-sm font-medium text-slate-600 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.start}
                    onChange={(e) => setEventForm({ ...eventForm, start: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.end}
                    onChange={(e) => setEventForm({ ...eventForm, end: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Description</label>
                  <textarea
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEventModal(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
