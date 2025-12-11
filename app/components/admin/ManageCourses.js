'use client'
import { useState, useEffect } from 'react'
import { FiVideo, FiDownload, FiCalendar, FiFileText, FiSave, FiArrowLeft } from 'react-icons/fi'

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
      const response = await fetch('/api/admin/courses', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (response.ok) {
        const data = await response.json()
        setCourses(data)
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
            {(courses || []).filter(c => c.type ? c.type === 'course' : true).map((course) => (
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CourseContentManager({ course, onBack }) {
  const [activeTab, setActiveTab] = useState('meetings')
  const [courseData, setCourseData] = useState({
    meetings: [
      { id: 1, title: 'Kickoff Meeting', date: 'Mon 8 PM', link: 'https://zoom.us/j/123' }
    ],
    materials: [
      { id: 1, title: 'Algebra Basics PDF', link: '#' }
    ],
    syllabus: [
      { id: 1, week: 1, title: 'Algebra' },
      { id: 2, week: 2, title: 'Geometry' }
    ],
    assignments: [
      { id: 1, title: 'Practice Set 1', dueDate: 'Next Mon', status: 'Pending' }
    ]
  })

  const handleSave = () => {
    console.log('Saved', courseData)
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
          className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700"
        >
          <FiSave /> Save Changes
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

      <div className="bg-white rounded-lg shadow-md p-6">
        {activeTab === 'meetings' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Live Meetings</h2>
              <button
                onClick={() => setCourseData(prev => ({
                  ...prev,
                  meetings: [...prev.meetings, { id: Date.now(), title: 'New Meeting', date: 'Fri 6 PM', link: '#' }]
                }))}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Add Meeting
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courseData.meetings.map((m) => (
                <div key={m.id} className="border rounded-lg p-4">
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
                  materials: [...prev.materials, { id: Date.now(), title: 'New Material', link: '#' }]
                }))}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Add Material
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courseData.materials.map((mat) => (
                <div key={mat.id} className="border rounded-lg p-4">
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
                  syllabus: [...prev.syllabus, { id: Date.now(), week: prev.syllabus.length + 1, title: 'New Topic' }]
                }))}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Add Topic
              </button>
            </div>
            <div className="space-y-3">
              {courseData.syllabus.map((t) => (
                <div key={t.id} className="border rounded-lg p-4">
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
                  assignments: [...prev.assignments, { id: Date.now(), title: 'New Assignment', dueDate: 'TBD', status: 'Pending' }]
                }))}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Add Assignment
              </button>
            </div>
            <div className="space-y-3">
              {courseData.assignments.map((a) => (
                <div key={a.id} className="border rounded-lg p-4">
                  <div className="font-medium">{a.title}</div>
                  <div className="text-sm text-gray-600">Due: {a.dueDate}</div>
                  <span className={`inline-block px-2 py-1 rounded text-xs ${a.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{a.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
