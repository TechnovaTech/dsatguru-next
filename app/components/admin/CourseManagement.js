'use client'
import { useState, useEffect } from 'react'
import { FiPlus, FiEdit, FiTrash2, FiEye, FiDollarSign, FiUsers, FiBarChart, FiCalendar, FiVideo, FiDownload, FiFileText, FiSave, FiArrowLeft, FiSearch, FiX, FiBookOpen, FiCheck, FiHelpCircle, FiFolder } from 'react-icons/fi'
import { useToast, useConfirm } from '../ui/UIProvider'

// Accent palette — matches the public website course cards
const ACCENTS = [
  { grad: 'from-indigo-600 to-indigo-800', soft: 'bg-indigo-50', text: 'text-indigo-600' },
  { grad: 'from-blue-600 to-blue-800', soft: 'bg-blue-50', text: 'text-blue-600' },
  { grad: 'from-teal-600 to-teal-800', soft: 'bg-teal-50', text: 'text-teal-600' },
  { grad: 'from-violet-600 to-violet-800', soft: 'bg-violet-50', text: 'text-violet-600' },
  { grad: 'from-sky-600 to-sky-800', soft: 'bg-sky-50', text: 'text-sky-600' },
]

export default function CourseManagement() {
  const toast = useToast()
  const confirm = useConfirm()
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
    if (!(await confirm({ message: 'Are you sure you want to delete this course?', tone: 'danger', confirmText: 'Delete' }))) return

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
      toast.error(error.message)
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
      toast.error(error.message)
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

  // Close the quick-view modal on Escape
  useEffect(() => {
    if (!selectedCourse || showContentManagement) return
    const onKey = (e) => { if (e.key === 'Escape') setSelectedCourse(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedCourse, showContentManagement])

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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-500"></div>
          <p className="text-slate-500">Loading courses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">
            Courses <span className="dg-gradient-text">& Question Banks</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Create, edit and manage your catalog.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          <FiPlus /> Add Course
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Search courses..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition-colors focus:border-indigo-400 focus:bg-white"
          />
        </div>
        <select
          value={filters.type}
          onChange={(e) => handleFilterChange('type', e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-indigo-400 focus:bg-white"
        >
          <option value="">All Types</option>
          <option value="course">Courses</option>
          <option value="question_bank">Question Banks</option>
        </select>
        {(filters.search || filters.type) && (
          <button
            onClick={() => setFilters({ search: '', minPrice: '', maxPrice: '', type: '' })}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <FiX size={15} /> Clear
          </button>
        )}
      </div>

      {/* Cards — same look as the public website */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-[26rem] animate-pulse rounded-[1.75rem] bg-white shadow-sm" />
          ))}
        </div>
      ) : courses.length > 0 ? (
        <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, i) => {
            const a = ACCENTS[i % ACCENTS.length]
            const discount = course.discountedPrice && course.price
              ? Math.round(((course.price - course.discountedPrice) / course.price) * 100)
              : (course.discountPercentage || null)
            const features = (course.highlights || []).map((h) => h.text || h).filter(Boolean).slice(0, 4)
            return (
              <div
                key={course.id}
                className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-lg transition-transform duration-300 hover:-translate-y-1.5"
              >
                {/* gradient header */}
                <div className={`relative bg-gradient-to-br ${a.grad} px-6 pb-12 pt-7 text-center text-white`}>
                  <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
                  {discount ? (
                    <span className="absolute -right-9 top-5 rotate-45 bg-amber-400 px-9 py-1 text-[10px] font-extrabold text-slate-900 shadow">
                      {discount}% OFF
                    </span>
                  ) : null}
                  <span className="relative inline-flex rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest ring-1 ring-white/25">
                    {course.type === 'question_bank' ? 'Question Bank' : 'Course'}
                  </span>
                  <h3 className="relative mt-3 text-lg font-extrabold uppercase leading-tight">{course.title}</h3>
                  {course.description && (
                    <p className="relative mt-1 line-clamp-2 text-xs font-medium text-white/85">{course.description}</p>
                  )}
                </div>

                {/* body */}
                <div className="relative flex flex-1 flex-col px-6 pb-6">
                  {/* floating icon overlapping the seam */}
                  <div className="mx-auto -mt-8 mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-xl ring-4 ring-white">
                    <span className={`flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br ${a.grad} text-white transition-transform duration-300 group-hover:scale-110`}>
                      {course.type === 'question_bank' ? <FiHelpCircle size={26} /> : <FiBookOpen size={26} />}
                    </span>
                  </div>

                  {/* price */}
                  <div className="mb-4 text-center">
                    {course.discountedPrice ? (
                      <div className="flex items-end justify-center gap-2">
                        <span className="pb-1.5 text-sm text-slate-400 line-through">${course.price}</span>
                        <span className="text-3xl font-extrabold tracking-tight text-slate-900">${course.discountedPrice}</span>
                      </div>
                    ) : (
                      <span className="text-3xl font-extrabold tracking-tight text-slate-900">${course.price || 0}</span>
                    )}
                  </div>

                  <div className="mb-4 h-px bg-slate-100" />

                  {/* features (highlights) */}
                  {features.length > 0 ? (
                    <ul className="flex-1 space-y-2.5 text-left text-sm text-slate-700">
                      {features.map((f, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${a.soft} ${a.text}`}>
                            <FiCheck size={12} />
                          </span>
                          <span className="leading-snug">{f}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="flex-1 text-center text-xs italic text-slate-300">No highlights added yet.</p>
                  )}

                  {/* admin stats */}
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-50 py-2 text-center">
                      <div className="text-base font-extrabold text-indigo-600">{course.enrollmentsCount || 0}</div>
                      <div className="text-[10px] font-medium text-slate-500">Enrolled</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 py-2 text-center">
                      <div className="text-base font-extrabold text-emerald-600">${(course.revenue || 0).toLocaleString()}</div>
                      <div className="text-[10px] font-medium text-slate-500">Revenue</div>
                    </div>
                  </div>

                  {/* admin actions */}
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => { setEditingCourse(course); setShowModal(true) }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                    >
                      <FiEdit size={14} /> Edit
                    </button>
                    <button onClick={() => setSelectedCourse(course)} title="View details" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-indigo-600"><FiEye size={15} /></button>
                    <button onClick={() => { setSelectedCourse(course); setShowContentManagement(true) }} title="Manage content" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-amber-50 hover:text-amber-600"><FiFolder size={15} /></button>
                    <button onClick={() => handleDelete(course.id)} title="Delete" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"><FiTrash2 size={15} /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-white py-16 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiBookOpen size={22} /></div>
          <p className="text-sm font-medium text-slate-500">No courses found.</p>
          <p className="mt-1 text-xs text-slate-400">Click &quot;Add Course&quot; to create your first one.</p>
        </div>
      )}

      {/* Pagination */}
      <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="text-sm text-slate-500">
          Showing {totalCount === 0 ? 0 : startIndex + 1}–{endIndex} of {totalCount}
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={pagination.page === 1 || loading}
            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm font-medium text-slate-500">Page {pagination.page} of {totalPages}</span>
          <button
            disabled={pagination.page >= totalPages || loading}
            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {/* Quick view modal */}
      {selectedCourse && !showContentManagement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setSelectedCourse(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${selectedCourse.type === 'question_bank' ? 'bg-violet-50 text-violet-700' : 'bg-indigo-50 text-indigo-700'}`}>
                  {selectedCourse.type === 'question_bank' ? 'Question Bank' : 'Course'}
                </span>
                <h2 className="mt-2 text-xl font-bold text-slate-900">{selectedCourse.title}</h2>
              </div>
              <button onClick={() => setSelectedCourse(null)} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><FiX size={18} /></button>
            </div>
            {selectedCourse.description && <p className="mb-5 text-sm leading-relaxed text-slate-600">{selectedCourse.description}</p>}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <div className="text-lg font-extrabold text-slate-900">${selectedCourse.price || 0}</div>
                <div className="text-[11px] font-medium text-slate-500">Price</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <div className="text-lg font-extrabold text-indigo-600">{selectedCourse.enrollmentsCount || 0}</div>
                <div className="text-[11px] font-medium text-slate-500">Enrolled</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <div className="text-lg font-extrabold text-emerald-600">${(selectedCourse.revenue || 0).toLocaleString()}</div>
                <div className="text-[11px] font-medium text-slate-500">Revenue</div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setEditingCourse(selectedCourse); setSelectedCourse(null); setShowModal(true) }} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
                <FiEdit size={14} /> Edit
              </button>
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
  const toast = useToast()
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

      toast.success('Course content saved successfully!')
    } catch (error) {
      console.error('Error saving content:', error)
      toast.error('Failed to save course content')
    } finally {
      setSaving(false)
    }
  }

  // Load content on mount
  useEffect(() => {
    fetchContent()
  }, [course.id])

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-6 lg:p-8">
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
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          <FiSave /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex overflow-x-auto whitespace-nowrap border-b border-slate-100">
          {[
            { id: 'meetings', label: 'Live Meetings', icon: <FiVideo size={16} /> },
            { id: 'materials', label: 'Study Materials', icon: <FiDownload size={16} /> },
            { id: 'syllabus', label: 'Course Timeline', icon: <FiCalendar size={16} /> },
            { id: 'assignments', label: 'Assignments', icon: <FiFileText size={16} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="mr-3 h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500"></div>
            <span className="text-slate-500">Loading content...</span>
          </div>
        ) : (
          <>
            {activeTab === 'meetings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Live Meetings</h2>
              <button
                onClick={() => setCourseData(prev => ({
                  ...prev,
                  meetings: [...prev.meetings, { title: 'New Meeting', date: 'Fri 6 PM', link: '#' }]
                }))}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                <FiPlus size={15} /> Add Meeting
              </button>
            </div>
            {courseData.meetings.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {courseData.meetings.map((m, index) => (
                  <div key={m._id || index} className="rounded-xl border border-slate-200 p-4">
                    <div className="font-semibold text-slate-900">{m.title}</div>
                    <div className="text-sm text-slate-500">{m.date}</div>
                    <a href={m.link} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">Join</a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiVideo size={22} /></div>
                <p className="text-sm font-medium text-slate-500">No live meetings yet.</p>
                <p className="mt-1 text-xs text-slate-400">Click &quot;Add Meeting&quot; to schedule one.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Study Materials</h2>
              <button
                onClick={() => setCourseData(prev => ({
                  ...prev,
                  materials: [...prev.materials, { title: 'New Material', link: '#' }]
                }))}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                <FiPlus size={15} /> Add Material
              </button>
            </div>
            {courseData.materials.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {courseData.materials.map((mat, index) => (
                  <div key={mat._id || index} className="rounded-xl border border-slate-200 p-4">
                    <div className="font-semibold text-slate-900">{mat.title}</div>
                    <a href={mat.link} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">Download</a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiDownload size={22} /></div>
                <p className="text-sm font-medium text-slate-500">No study materials yet.</p>
                <p className="mt-1 text-xs text-slate-400">Click &quot;Add Material&quot; to upload one.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'syllabus' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Course Timeline</h2>
              <button
                onClick={() => setCourseData(prev => ({
                  ...prev,
                  syllabus: [...prev.syllabus, { week: prev.syllabus.length + 1, title: 'New Topic' }]
                }))}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                <FiPlus size={15} /> Add Topic
              </button>
            </div>
            {courseData.syllabus.length > 0 ? (
              <div className="space-y-3">
                {courseData.syllabus.map((t, index) => (
                  <div key={t._id || index} className="rounded-xl border border-slate-200 p-4">
                    <div className="font-semibold text-slate-900">Week {t.week}: {t.title}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiCalendar size={22} /></div>
                <p className="text-sm font-medium text-slate-500">No timeline topics yet.</p>
                <p className="mt-1 text-xs text-slate-400">Click &quot;Add Topic&quot; to build the timeline.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Assignments</h2>
              <button
                onClick={() => setCourseData(prev => ({
                  ...prev,
                  assignments: [...prev.assignments, { title: 'New Assignment', dueDate: 'TBD', status: 'Pending' }]
                }))}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                <FiPlus size={15} /> Add Assignment
              </button>
            </div>
            {courseData.assignments.length > 0 ? (
              <div className="space-y-3">
                {courseData.assignments.map((a, index) => (
                  <div key={a._id || index} className="rounded-xl border border-slate-200 p-4">
                    <div className="font-semibold text-slate-900">{a.title}</div>
                    <div className="text-sm text-slate-500">Due: {a.dueDate || 'TBD'}</div>
                    <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${a.status === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{a.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiFileText size={22} /></div>
                <p className="text-sm font-medium text-slate-500">No assignments yet.</p>
                <p className="mt-1 text-xs text-slate-400">Click &quot;Add Assignment&quot; to create one.</p>
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

function CourseModal({ course, onSave, onClose }) {
  const [formData, setFormData] = useState({
    id: course?.id,
    title: course?.title || '',
    description: course?.description || '',
    type: course?.type || 'course',
    questionBankType: course?.questionBankType || 'Reading and Writing',
    bannerImageUrl: course?.bannerImageUrl || '',
    price: course?.price || 0,
    discountedPrice: course?.discountedPrice || '',
    discountPercentage: course?.discountPercentage || '',
    backgroundColor: course?.backgroundColor || '#e0ffff',
    highlights: course?.highlights?.map(h => h.text || h) || [''],
    schedules: course?.schedules?.map(s => `${s.day || ''} ${s.time || ''}`.trim()) || [''],
    faqs: course?.faqs?.map(f => ({ question: f.question || '', answer: f.answer || '' })) || [{ question: '', answer: '' }]
  })

  // Auto-calculate discount percentage when price or discounted price changes
  useEffect(() => {
    if (formData.price > 0 && formData.discountedPrice > 0) {
      const discount = Math.round(((formData.price - formData.discountedPrice) / formData.price) * 100)
      setFormData(prev => ({ ...prev, discountPercentage: discount }))
    }
  }, [formData.price, formData.discountedPrice])
  const [loading, setLoading] = useState(false)

  // Close the modal on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const updateSchedule = (index, value) => {
    setFormData(prev => ({
      ...prev,
      schedules: prev.schedules.map((s, i) => (i === index ? value : s))
    }))
  }

  const addSchedule = () => {
    setFormData(prev => ({ ...prev, schedules: [...prev.schedules, ''] }))
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
      const dataToSave = {
        ...formData,
        questionBankType: formData.type === 'question_bank' ? formData.questionBankType : undefined
      }
      await onSave(dataToSave)
    } catch (error) {
      console.error('Error saving course:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">{formData.id ? 'Edit Course' : 'Add Course'}</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"><FiX size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="course-title" className="mb-1 block text-sm font-medium text-slate-600">Title</label>
              <input
                id="course-title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="course-type" className="mb-1 block text-sm font-medium text-slate-600">Type</label>
              <select
                id="course-type"
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
              >
                <option value="course">Course</option>
                <option value="question_bank">Question Bank</option>
              </select>
            </div>
          </div>

          {/* Question Bank Type - ONLY show when question_bank is selected */}
          {formData.type === 'question_bank' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="mb-3 block text-sm font-medium text-slate-600">Question Bank Type *</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex cursor-pointer items-center rounded-lg border-2 border-slate-200 bg-white p-3 transition-colors hover:border-indigo-400">
                  <input
                    type="radio"
                    id="rw-type"
                    name="questionBankType"
                    value="Reading and Writing"
                    checked={formData.questionBankType === 'Reading and Writing'}
                    onChange={(e) => setFormData(prev => ({ ...prev, questionBankType: e.target.value }))}
                    className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="rw-type" className="cursor-pointer text-sm font-medium text-slate-600">Reading and Writing</label>
                </div>
                <div className="flex cursor-pointer items-center rounded-lg border-2 border-slate-200 bg-white p-3 transition-colors hover:border-indigo-400">
                  <input
                    type="radio"
                    id="math-type"
                    name="questionBankType"
                    value="Mathematics"
                    checked={formData.questionBankType === 'Mathematics'}
                    onChange={(e) => setFormData(prev => ({ ...prev, questionBankType: e.target.value }))}
                    className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="math-type" className="cursor-pointer text-sm font-medium text-slate-600">Mathematics</label>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="course-description" className="mb-1 block text-sm font-medium text-slate-600">Description</label>
              <textarea
                id="course-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                rows="3"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="course-price" className="mb-1 block text-sm font-medium text-slate-600">Price</label>
              <input
                id="course-price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value || 0) }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="course-discount-pct" className="mb-1 block text-sm font-medium text-slate-600">Discount % (Auto)</label>
              <input
                id="course-discount-pct"
                type="number"
                value={formData.discountPercentage}
                readOnly
                className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="course-discounted-price" className="mb-1 block text-sm font-medium text-slate-600">Discounted Price</label>
              <input
                id="course-discounted-price"
                type="number"
                value={formData.discountedPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, discountedPrice: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-600">Course Highlights</label>
              <button type="button" onClick={addHighlight} className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700">+ Add Highlight</button>
            </div>
            {formData.highlights.map((h, idx) => (
              <div key={idx} className="mb-2 flex gap-2">
                <input
                  type="text"
                  value={h}
                  onChange={(e) => updateHighlight(idx, e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder={`Highlight #${idx + 1}`}
                />
                <button type="button" onClick={() => removeHighlight(idx)} aria-label="Remove highlight" className="px-2 text-rose-500 transition-colors hover:text-rose-700"><FiX size={16} /></button>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-600">Class Schedules</label>
              <button type="button" onClick={addSchedule} className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700">+ Add Schedule</button>
            </div>
            {formData.schedules.map((schedule, index) => (
              <div key={index} className="mb-2 flex gap-2">
                <input
                  type="text"
                  value={schedule}
                  onChange={(e) => updateSchedule(index, e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Monday 8 PM"
                />
                <button type="button" onClick={() => removeSchedule(index)} aria-label="Remove schedule" className="px-2 text-rose-500 transition-colors hover:text-rose-700"><FiX size={16} /></button>
              </div>
            ))}

          </div>

          <div className="flex justify-end gap-4 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50" disabled={loading}>Cancel</button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50" disabled={loading}>
              {loading ? 'Saving...' : (formData.id ? 'Update' : 'Create')} Course
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
