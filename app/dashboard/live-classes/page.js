'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../components/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { FiCalendar, FiVideo, FiClock, FiRefreshCw, FiBell, FiExternalLink } from 'react-icons/fi'

export default function LiveClassesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [meetings, setMeetings] = useState([])
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user) {
      fetchMeetings()
    }
  }, [user, authLoading, router])

  const fetchMeetings = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/enrollment', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (response.data.success) {
        const enrollments = response.data.data || []
        
        const allMeetings = enrollments
          .filter(e => e.type === 'course' && e.courseId && Array.isArray(e.courseId.meetings))
          .flatMap(e => e.courseId.meetings.map(m => ({
            ...m,
            courseTitle: e.courseId.title,
            courseId: e.courseId._id,
            parsedDate: new Date(m.date)
          })))
          .sort((a, b) => {
            const dateA = !isNaN(a.parsedDate) ? a.parsedDate : new Date(0)
            const dateB = !isNaN(b.parsedDate) ? b.parsedDate : new Date(0)
            return dateA - dateB
          })
        
        setMeetings(allMeetings)

        const allNotifications = enrollments
          .filter(e => e.type === 'course' && e.courseId && Array.isArray(e.courseId.calendarEvents))
          .flatMap(e => e.courseId.calendarEvents.map(evt => ({
            ...evt,
            courseTitle: e.courseId.title,
            parsedDate: new Date(evt.start || evt.date)
          })))
          .sort((a, b) => b.parsedDate - a.parsedDate)
        
        setNotifications(allNotifications)
      }
    } catch (error) {
      console.error('Error fetching meetings:', error)
      if (error.response?.status === 401) {
        // Token expired or invalid
        // Optionally redirect to login or show specific message
      }
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  const now = new Date()
  const upcomingMeetings = meetings.filter(m => !isNaN(m.parsedDate) && m.parsedDate > now)
  const pastMeetings = meetings.filter(m => isNaN(m.parsedDate) || m.parsedDate <= now).reverse()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Live Classes</h1>
        <div className="flex gap-4">
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              title="Notifications"
            >
              <FiBell size={24} />
              {notifications.length > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 border border-gray-200 max-h-96 overflow-y-auto">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-gray-800">Notifications</h3>
                </div>
                {notifications.length > 0 ? (
                  <div className="divide-y">
                    {notifications.map((note, idx) => (
                      <div key={idx} className="p-4 hover:bg-gray-50">
                        <div className="font-medium text-gray-900">{note.title}</div>
                        <div className="text-sm text-gray-600 mt-1">{note.description}</div>
                        <div className="text-xs text-gray-400 mt-2 flex justify-between">
                          <span>{note.courseTitle}</span>
                          <span>{note.parsedDate.toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No notifications
                  </div>
                )}
              </div>
            )}
          </div>
          <button 
            onClick={fetchMeetings} 
            className="flex items-center gap-2 text-sm text-blue-600 hover:bg-blue-50 px-3 py-2 rounded transition-colors"
          >
            <FiRefreshCw /> Refresh Schedule
          </button>
        </div>
      </div>

      {meetings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-100">
          <FiCalendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No scheduled classes</h3>
          <p className="mt-2 text-gray-500">You don&apos;t have any live classes scheduled at the moment.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming Classes */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-blue-800">
              <FiClock className="text-blue-600" /> Upcoming Classes
            </h2>
            {upcomingMeetings.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingMeetings.map((meeting, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {meeting.courseTitle}
                      </span>
                      {isClassLive(meeting.parsedDate) && (
                        <span className="flex items-center gap-1 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full animate-pulse">
                          <span className="w-2 h-2 bg-red-600 rounded-full"></span> LIVE NOW
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{meeting.title}</h3>
                    <div className="text-sm text-gray-500 mb-6 flex items-center gap-2">
                      <FiCalendar />
                      {isValidDate(meeting.parsedDate) ? meeting.parsedDate.toLocaleString() : meeting.date}
                    </div>
                    <button
                      onClick={() => meeting.link && window.open(meeting.link.startsWith('http') ? meeting.link : `https://meet.jit.si/${meeting.link}`, '_blank')}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                    >
                      <FiExternalLink /> Join Class
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No upcoming classes scheduled.</p>
            )}
          </div>

          {/* Past Classes */}
          {pastMeetings.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-700">
                <FiClock className="text-gray-500" /> Past Classes
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 opacity-75">
                {pastMeetings.map((meeting, idx) => (
                  <div key={idx} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <div className="mb-2">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {meeting.courseTitle}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-700 mb-2">{meeting.title}</h3>
                    <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                      <FiCalendar />
                      {isValidDate(meeting.parsedDate) ? meeting.parsedDate.toLocaleString() : meeting.date}
                    </div>
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-500 font-medium py-2.5 px-4 rounded-lg cursor-not-allowed"
                    >
                      Ended
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function isClassLive(dateObj) {
  if (!isValidDate(dateObj)) return false
  const now = new Date()
  const diffInMinutes = (now - dateObj) / 1000 / 60
  return diffInMinutes > -15 && diffInMinutes < 120
}

function isValidDate(d) {
  return d instanceof Date && !isNaN(d)
}
