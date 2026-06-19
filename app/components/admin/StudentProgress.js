'use client'
import { useState, useEffect } from 'react'
import { FiTrendingUp, FiUser, FiTarget, FiClock, FiBarChart, FiDownload, FiFilter } from 'react-icons/fi'

export default function StudentProgress() {
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    course: '',
    progressRange: ''
  })
  const [courses, setCourses] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchStudents()
    fetchCourses()
  }, [filters])

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchStudents = async () => {
    setError(null)
    try {
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value)
      })

      const response = await fetch(`/api/admin/student-progress?${queryParams}`, { headers: getAuthHeaders() })
      if (!response.ok) {
        throw new Error('Failed to load students')
      }
      const data = await response.json()
      setStudents(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching students:', error)
      setStudents([])
      setError('Failed to load student progress. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/admin/courses', { headers: getAuthHeaders() })
      if (response.ok) {
        const data = await response.json()
        setCourses(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const fetchStudentDetail = async (studentId) => {
    try {
      const response = await fetch(`/api/admin/student-progress/${studentId}`, { headers: getAuthHeaders() })
      if (response.ok) {
        const data = await response.json()
        setSelectedStudent(data)
      }
    } catch (error) {
      console.error('Error fetching student detail:', error)
    }
  }

  const exportProgress = async () => {
    try {
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value)
      })

      const response = await fetch(`/api/admin/student-progress/export?${queryParams}`, { headers: getAuthHeaders() })
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `student_progress_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting progress:', error)
    }
  }

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return 'bg-emerald-500'
    if (percentage >= 60) return 'bg-amber-500'
    if (percentage >= 40) return 'bg-orange-500'
    return 'bg-rose-500'
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600'
    if (score >= 60) return 'text-amber-600'
    return 'text-rose-600'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">📈 Student Progress</h1>
        <button
          onClick={exportProgress}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          <FiDownload /> Export Progress
        </button>
        </div>

      {error && (
        <div role="alert" className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <span className="text-sm text-rose-700">{error}</span>
          <button
            onClick={fetchStudents}
            className="rounded-lg bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="sp-search" className="mb-1 block text-sm font-medium text-slate-600">Search Student</label>
            <input
              id="sp-search"
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
              placeholder="Student name or email..."
            />
          </div>

          <div>
            <label htmlFor="sp-course" className="mb-1 block text-sm font-medium text-slate-600">Course</label>
            <select
              id="sp-course"
              value={filters.course}
              onChange={(e) => setFilters({...filters, course: e.target.value})}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Courses</option>
              {(courses || []).map((course) => (
                <option key={course._id} value={course._id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sp-range" className="mb-1 block text-sm font-medium text-slate-600">Progress Range</label>
            <select
              id="sp-range"
              value={filters.progressRange}
              onChange={(e) => setFilters({...filters, progressRange: e.target.value})}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Progress</option>
              <option value="80-100">80-100%</option>
              <option value="60-79">60-79%</option>
              <option value="40-59">40-59%</option>
              <option value="0-39">0-39%</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Students List */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 p-6">
              <h2 className="text-lg font-bold text-slate-900">Students Overview</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {(students || []).length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiUser size={22} /></div>
                  <p className="text-sm font-medium text-slate-500">No students found</p>
                  <p className="mt-1 text-xs text-slate-400">Try adjusting your filters.</p>
                </div>
              ) : (students || []).map((student) => (
                <div
                  key={student._id}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer p-6 transition-colors hover:bg-indigo-50/40 focus:bg-indigo-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                  onClick={() => fetchStudentDetail(student._id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fetchStudentDetail(student._id) } }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                        <FiUser className="text-xl text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{student.name}</h3>
                        <p className="text-sm text-slate-600">{student.email}</p>
                        <p className="text-sm text-slate-500">
                          Enrolled: {student.enrolledAt ? new Date(student.enrolledAt).toLocaleDateString() : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-slate-600">Overall Progress:</span>
                        <span className="font-semibold text-slate-900">{student.overallProgress || 0}%</span>
                      </div>
                      <div className="h-2 w-32 rounded-full bg-slate-200">
                        <div
                          className={`h-2 rounded-full ${getProgressColor(student.overallProgress || 0)}`}
                          style={{ width: `${student.overallProgress || 0}%` }}
                        ></div>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
                        <span>Tests: {student.testsCompleted || 0}</span>
                        <span className={`font-semibold ${getScoreColor(student.averageScore || 0)}`}>
                          Avg: {student.averageScore || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Student Detail Panel */}
        <div className="lg:col-span-1">
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 p-6">
              <h2 className="text-lg font-bold text-slate-900">Student Details</h2>
            </div>
            {selectedStudent ? (
              <div className="p-6 space-y-6">
                {/* Student Info */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
                      <FiUser className="text-2xl text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{selectedStudent.name}</h3>
                      <p className="text-slate-600">{selectedStudent.email}</p>
                    </div>
                  </div>
                </div>

                {/* Progress Stats */}
                <div className="space-y-4">
                  <div className="rounded-xl bg-indigo-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FiTarget className="text-indigo-600" />
                      <span className="font-medium text-slate-700">Overall Progress</span>
                    </div>
                    <div className="mb-2 text-2xl font-bold text-indigo-600">
                      {selectedStudent.overallProgress || 0}%
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-200">
                      <div
                        className={`h-3 rounded-full ${getProgressColor(selectedStudent.overallProgress || 0)}`}
                        style={{ width: `${selectedStudent.overallProgress || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-emerald-50 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <FiBarChart className="text-emerald-600" />
                        <span className="text-sm font-medium text-slate-700">Tests Completed</span>
                      </div>
                      <div className="text-xl font-bold text-emerald-600">
                        {selectedStudent.testsCompleted || 0}
                      </div>
                    </div>

                    <div className="rounded-xl bg-violet-50 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <FiTrendingUp className="text-violet-600" />
                        <span className="text-sm font-medium text-slate-700">Average Score</span>
                      </div>
                      <div className={`text-xl font-bold ${getScoreColor(selectedStudent.averageScore || 0)}`}>
                        {selectedStudent.averageScore || 0}%
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-amber-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FiClock className="text-amber-600" />
                      <span className="font-medium text-slate-700">Study Time</span>
                    </div>
                    <div className="text-lg font-bold text-amber-600">
                      {Math.round((selectedStudent.totalStudyTime || 0) / 60)} hours
                    </div>
                    <div className="text-sm text-slate-600">
                      Last active: {selectedStudent.lastActive ? new Date(selectedStudent.lastActive).toLocaleDateString() : 'Never'}
                    </div>
                  </div>
                </div>

                {/* Course Progress */}
                {selectedStudent.courseProgress && (
                  <div>
                    <h4 className="mb-3 font-semibold text-slate-900">Course Progress</h4>
                    <div className="space-y-3">
                      {(selectedStudent.courseProgress || []).map((course) => (
                        <div key={course.courseId} className="rounded-lg border border-slate-200 p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-700">{course.courseName}</span>
                            <span className="text-sm font-semibold text-slate-900">{course.progress}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-200">
                            <div
                              className={`h-2 rounded-full ${getProgressColor(course.progress)}`}
                              style={{ width: `${course.progress}%` }}
                            ></div>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {course.completedModules}/{course.totalModules} modules completed
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                {selectedStudent.recentActivity && (
                  <div>
                    <h4 className="mb-3 font-semibold text-slate-900">Recent Activity</h4>
                    <div className="space-y-2">
                      {(selectedStudent.recentActivity || []).map((activity, index) => (
                        <div key={index} className="border-l-2 border-indigo-200 py-1 pl-3 text-sm">
                          <div className="font-medium text-slate-900">{activity.action}</div>
                          <div className="text-slate-600">{activity.description}</div>
                          <div className="text-xs text-slate-500">
                            {activity.timestamp ? new Date(activity.timestamp).toLocaleString() : '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiUser size={22} /></div>
                <p className="text-sm font-medium text-slate-500">Select a student</p>
                <p className="mt-1 text-xs text-slate-400">Choose a student to view detailed progress.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
