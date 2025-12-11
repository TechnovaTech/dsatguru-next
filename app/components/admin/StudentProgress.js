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

  useEffect(() => {
    fetchStudents()
    fetchCourses()
  }, [filters])

  const fetchStudents = async () => {
    try {
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value)
      })

      const response = await fetch(`/api/admin/student-progress?${queryParams}`)
      if (response.ok) {
        const data = await response.json()
        setStudents(data)
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/admin/courses')
      if (response.ok) {
        const data = await response.json()
        setCourses(data)
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const fetchStudentDetail = async (studentId) => {
    try {
      const response = await fetch(`/api/admin/student-progress/${studentId}`)
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

      const response = await fetch(`/api/admin/student-progress/export?${queryParams}`)
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
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 60) return 'bg-yellow-500'
    if (percentage >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
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
        <h1 className="text-3xl font-bold text-gray-800">📈 Student Progress</h1>
        <button
          onClick={exportProgress}
          className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
        >
          <FiDownload /> Export Progress
        </button>
        </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Student</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Student name or email..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <select
              value={filters.course}
              onChange={(e) => setFilters({...filters, course: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Progress Range</label>
            <select
              value={filters.progressRange}
              onChange={(e) => setFilters({...filters, progressRange: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
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
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Students Overview</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {students.map((student) => (
                <div 
                  key={student._id} 
                  className="p-6 hover:bg-gray-50 cursor-pointer"
                  onClick={() => fetchStudentDetail(student._id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <FiUser className="text-blue-600 text-xl" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{student.name}</h3>
                        <p className="text-sm text-gray-600">{student.email}</p>
                        <p className="text-sm text-gray-500">
                          Enrolled: {new Date(student.enrolledAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-gray-600">Overall Progress:</span>
                        <span className="font-semibold">{student.overallProgress}%</span>
                      </div>
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getProgressColor(student.overallProgress)}`}
                          style={{ width: `${student.overallProgress}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span>Tests: {student.testsCompleted}</span>
                        <span className={`font-semibold ${getScoreColor(student.averageScore)}`}>
                          Avg: {student.averageScore}%
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
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Student Details</h2>
            </div>
            {selectedStudent ? (
              <div className="p-6 space-y-6">
                {/* Student Info */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <FiUser className="text-blue-600 text-2xl" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{selectedStudent.name}</h3>
                      <p className="text-gray-600">{selectedStudent.email}</p>
                    </div>
                  </div>
                </div>

                {/* Progress Stats */}
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FiTarget className="text-blue-600" />
                      <span className="font-medium">Overall Progress</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600 mb-2">
                      {selectedStudent.overallProgress}%
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full ${getProgressColor(selectedStudent.overallProgress)}`}
                        style={{ width: `${selectedStudent.overallProgress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <FiBarChart className="text-green-600" />
                        <span className="text-sm font-medium">Tests Completed</span>
                      </div>
                      <div className="text-xl font-bold text-green-600">
                        {selectedStudent.testsCompleted}
                      </div>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <FiTrendingUp className="text-purple-600" />
                        <span className="text-sm font-medium">Average Score</span>
                      </div>
                      <div className={`text-xl font-bold ${getScoreColor(selectedStudent.averageScore)}`}>
                        {selectedStudent.averageScore}%
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FiClock className="text-orange-600" />
                      <span className="font-medium">Study Time</span>
                    </div>
                    <div className="text-lg font-bold text-orange-600">
                      {Math.round(selectedStudent.totalStudyTime / 60)} hours
                    </div>
                    <div className="text-sm text-gray-600">
                      Last active: {new Date(selectedStudent.lastActive).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Course Progress */}
                {selectedStudent.courseProgress && (
                  <div>
                    <h4 className="font-semibold mb-3">Course Progress</h4>
                    <div className="space-y-3">
                      {selectedStudent.courseProgress.map((course) => (
                        <div key={course.courseId} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-sm">{course.courseName}</span>
                            <span className="text-sm font-semibold">{course.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${getProgressColor(course.progress)}`}
                              style={{ width: `${course.progress}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
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
                    <h4 className="font-semibold mb-3">Recent Activity</h4>
                    <div className="space-y-2">
                      {selectedStudent.recentActivity.map((activity, index) => (
                        <div key={index} className="text-sm border-l-2 border-blue-200 pl-3 py-1">
                          <div className="font-medium">{activity.action}</div>
                          <div className="text-gray-600">{activity.description}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(activity.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <FiUser className="mx-auto text-4xl mb-4" />
                <p>Select a student to view detailed progress</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
