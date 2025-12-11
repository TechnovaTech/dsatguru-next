'use client'
import { useState, useEffect } from 'react'
import { FiUsers, FiClock, FiPlay, FiPause, FiEye, FiRefreshCw, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'

export default function TestSessionMonitoring() {
  const [activeSessions, setActiveSessions] = useState([])
  const [completedSessions, setCompletedSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active')
  const [refreshInterval, setRefreshInterval] = useState(null)

  useEffect(() => {
    fetchSessions()
    
    // Set up auto-refresh for active sessions
    const interval = setInterval(() => {
      if (activeTab === 'active') {
        fetchSessions()
      }
    }, 30000) // Refresh every 30 seconds

    setRefreshInterval(interval)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeTab])

  const fetchSessions = async () => {
    try {
      const [activeResponse, completedResponse] = await Promise.all([
        fetch('/api/admin/test-sessions/active'),
        fetch('/api/admin/test-sessions/completed')
      ])

      if (activeResponse.ok) {
        const activeData = await activeResponse.json()
        setActiveSessions(activeData)
      }

      if (completedResponse.ok) {
        const completedData = await completedResponse.json()
        setCompletedSessions(completedData)
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeRemaining = (endTime) => {
    const now = new Date()
    const end = new Date(endTime)
    const diff = end - now

    if (diff <= 0) return 'Time Up'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const getProgressPercentage = (currentQuestion, totalQuestions) => {
    return Math.round((currentQuestion / totalQuestions) * 100)
  }

  const terminateSession = async (sessionId) => {
    if (confirm('Are you sure you want to terminate this test session?')) {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const response = await fetch(`/api/admin/test-sessions/${sessionId}/terminate`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        if (response.ok) {
          fetchSessions()
        }
      } catch (error) {
        console.error('Error terminating session:', error)
      }
    }
  }

  const extendTime = async (sessionId, additionalMinutes) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const response = await fetch(`/api/admin/test-sessions/${sessionId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ additionalMinutes })
      })
      if (response.ok) {
        fetchSessions()
      }
    } catch (error) {
      console.error('Error extending time:', error)
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Test Session Monitoring</h1>
        <button
          onClick={fetchSessions}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <FiRefreshCw /> Refresh
        </button>
        </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'active' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Active Sessions ({activeSessions.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'completed' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Recent Completed ({completedSessions.length})
        </button>
      </div>

      {/* Active Sessions */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {activeSessions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <FiUsers className="mx-auto text-4xl text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Active Sessions</h3>
              <p className="text-gray-500">There are currently no students taking tests.</p>
            </div>
          ) : (
            activeSessions.map((session) => (
              <div key={session._id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{session.testTitle}</h3>
                    <p className="text-gray-600">Student: {session.studentName}</p>
                    <p className="text-sm text-gray-500">Started: {new Date(session.startTime).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold flex items-center gap-1">
                      <FiPlay className="text-xs" />
                      Active
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <FiClock className="text-blue-600" />
                      <span className="text-sm font-medium">Time Remaining</span>
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      {formatTimeRemaining(session.endTime)}
                    </div>
                  </div>

                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <FiEye className="text-purple-600" />
                      <span className="text-sm font-medium">Progress</span>
                    </div>
                    <div className="text-lg font-bold text-purple-600">
                      {session.currentQuestion}/{session.totalQuestions}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${getProgressPercentage(session.currentQuestion, session.totalQuestions)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <FiCheckCircle className="text-orange-600" />
                      <span className="text-sm font-medium">Answered</span>
                    </div>
                    <div className="text-lg font-bold text-orange-600">
                      {session.answeredQuestions || 0}
                    </div>
                  </div>

                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <FiAlertCircle className="text-red-600" />
                      <span className="text-sm font-medium">Violations</span>
                    </div>
                    <div className="text-lg font-bold text-red-600">
                      {session.violations || 0}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => extendTime(session._id, 15)}
                    className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                  >
                    +15 min
                  </button>
                  <button
                    onClick={() => extendTime(session._id, 30)}
                    className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                  >
                    +30 min
                  </button>
                  <button
                    onClick={() => terminateSession(session._id)}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Terminate
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Completed Sessions */}
      {activeTab === 'completed' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {completedSessions.map((session) => (
                  <tr key={session._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{session.studentName}</div>
                      <div className="text-sm text-gray-500">{session.studentEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{session.testTitle}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Math.round((new Date(session.endTime) - new Date(session.startTime)) / (1000 * 60))} min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {session.score ? `${session.score}%` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(session.completedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        session.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : session.status === 'terminated'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {session.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
