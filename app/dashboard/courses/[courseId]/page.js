'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FiArrowLeft, FiVideo, FiDownload, FiCalendar, FiFileText } from 'react-icons/fi'

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { courseId } = params
  const [courseData, setCourseData] = useState({
    meetings: [],
    materials: [],
    syllabus: [],
    assignments: []
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('meetings')

  useEffect(() => {
    const fetchCourseContent = async () => {
      try {
        setLoading(true)
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const res = await fetch(`/api/courses/${courseId}/content`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        if (res.status === 403) {
          router.push('/dashboard/courses')
          return
        }
        if (res.ok) {
          const json = await res.json()
          const content = json.content || {}
          setCourseData({
            meetings: content.meetings || [],
            materials: content.materials || [],
            syllabus: content.syllabus || [],
            assignments: content.assignments || []
          })
        }
      } finally {
        setLoading(false)
      }
    }
    if (courseId) fetchCourseContent()
  }, [courseId, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard/courses')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <FiArrowLeft /> Back to Courses
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Course Content</h1>
          <p className="text-gray-600 mt-2">Access your course materials, meetings, and assignments</p>
        </div>

        <div className="bg-white rounded-lg shadow-md mb-6">
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
                className={`px-4 py-3 border-b-2 flex items-center gap-2 ${
                  activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-6">
            {activeTab === 'meetings' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Live Meetings</h2>
                {courseData.meetings && courseData.meetings.length > 0 ? (
                  <div className="space-y-4">
                    {courseData.meetings.map((meeting, idx) => (
                      <div key={meeting._id || idx} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{meeting.title}</h3>
                            <p className="text-sm text-gray-600">{meeting.date}</p>
                          </div>
                          {meeting.link && (
                            <a href={meeting.link} className="text-blue-600 text-sm">Join</a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-600">No meetings scheduled yet</div>
                )}
              </div>
            )}

            {activeTab === 'materials' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Study Materials</h2>
                {courseData.materials && courseData.materials.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {courseData.materials.map((material, idx) => (
                      <div key={material._id || idx} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <h3 className="font-medium">{material.title}</h3>
                            <p className="text-sm text-gray-600 capitalize">{material.type}</p>
                            {material.uploadDate && <p className="text-xs text-gray-500 mt-1">Uploaded: {material.uploadDate}</p>}
                          </div>
                          {material.link && (
                            <a href={material.link} className="text-blue-600 text-sm">Download</a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-600">No materials available</div>
                )}
              </div>
            )}

            {activeTab === 'syllabus' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Course Timeline</h2>
                {courseData.syllabus && courseData.syllabus.length > 0 ? (
                  <div className="space-y-4">
                    {courseData.syllabus.map((item, idx) => (
                      <div key={item._id || idx} className="border rounded-lg p-4">
                        <div className="font-medium">Week {item.week}: {item.title}</div>
                        <div className="text-sm text-gray-600">{item.description}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-600">No syllabus entries</div>
                )}
              </div>
            )}

            {activeTab === 'assignments' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Assignments</h2>
                {courseData.assignments && courseData.assignments.length > 0 ? (
                  <div className="space-y-4">
                    {courseData.assignments.map((assignment, idx) => (
                      <div key={assignment._id || idx} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{assignment.title}</div>
                            {assignment.dueDate && <div className="text-sm text-gray-600">Due: {assignment.dueDate}</div>}
                          </div>
                          <div className={`text-sm ${assignment.status === 'Completed' ? 'text-green-600' : 'text-gray-600'}`}>
                            {assignment.status || 'Pending'}
                          </div>
                        </div>
                        {assignment.description && <div className="text-sm text-gray-600 mt-2">{assignment.description}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-600">No assignments yet</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
