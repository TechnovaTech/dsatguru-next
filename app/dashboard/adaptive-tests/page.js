'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiPlay, FiFileText, FiClock } from 'react-icons/fi'

export default function AdaptiveTestsPage() {
  const router = useRouter()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Assigned')

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/test-sessions', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      })
      const data = await res.json()
      const sessions = data.sessions || data || []

      // Adaptive tests = from /admin/test-management
      // They have sections.math or sections.rw, and are NOT practiceMode 'admin' or 'tutor', NOT isTutorTest
      const adaptive = sessions.filter(s => {
        const t = s.testId
        if (!t) return false
        return (
          t.practiceMode !== 'admin' &&
          t.practiceMode !== 'tutor' &&
          t.isTutorTest !== true &&
          (t.sections?.math === true || t.sections?.rw === true)
        )
      })

      setHistory(adaptive)
    } catch (error) {
      console.error('Failed to fetch history', error)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { name: 'Assigned', count: history.filter(h => h.status === 'Assigned').length },
    { name: 'In Progress', count: history.filter(h => h.status === 'InProgress').length },
    { name: 'Completed', count: history.filter(h => h.status === 'Completed').length }
  ]

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-[Poppins]">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Adaptive Tests</h1>
          <p className="text-gray-500 mt-1">Access your assigned adaptive SAT practice tests and track your progress.</p>

          <div className="flex items-center gap-2 mt-6 border-b border-gray-200">
            {tabs.map(tab => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.name
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.name}
                {tab.count > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.name ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {activeTab === 'Assigned' && (
            history.filter(h => h.status === 'Assigned').length > 0 ? (
              history.filter(h => h.status === 'Assigned').map(session => {
                const test = session.testId
                const sections = []
                if (test?.sections?.rw) sections.push('R&W')
                if (test?.sections?.math) sections.push('Math')
                const duration = test?.duration || 180

                return (
                  <div key={session._id} className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded border border-blue-100">Assigned</span>
                        <span className="text-xs text-gray-500">{new Date(session.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{test?.title || 'Adaptive Test'}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                        <span className="flex items-center gap-1">
                          <FiFileText className="w-4 h-4" />
                          <span className="font-medium">{sections.join(' + ')}</span> • 2 Modules each
                        </span>
                        <span className="flex items-center gap-1">
                          <FiClock className="w-4 h-4" />
                          <span className="font-medium">{duration} min</span>
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard/tests/${test?._id}/start?sessionId=${session._id}&returnUrl=/dashboard/adaptive-tests`)}
                      className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                    >
                      <FiPlay className="w-4 h-4" /> Start Test
                    </button>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
                <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FiFileText className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-gray-900 font-medium">No adaptive tests assigned</h3>
                <p className="text-gray-500 text-sm mt-1">You don&apos;t have any pending adaptive tests.</p>
              </div>
            )
          )}

          {(activeTab === 'In Progress' || activeTab === 'Completed') && (
            history.filter(h => {
              const statusMatch = activeTab === 'Completed' ? h.status === 'Completed' : h.status === 'InProgress'
              return statusMatch && !h.isReassigned
            }).length > 0 ? (
              history
                .filter(h => {
                  const statusMatch = activeTab === 'Completed' ? h.status === 'Completed' : h.status === 'InProgress'
                  return statusMatch && !h.isReassigned
                })
                .map(session => {
                  const test = session.testId
                  const sections = []
                  if (test?.sections?.rw) sections.push('R&W')
                  if (test?.sections?.math) sections.push('Math')
                  const duration = test?.duration || 180

                  return (
                    <div key={session._id} className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${
                            session.status === 'Completed'
                              ? 'bg-green-50 border-green-200 text-green-600'
                              : 'bg-yellow-50 border-yellow-200 text-yellow-600'
                          }`}>
                            {session.status === 'Completed' ? 'Completed' : 'In Progress'}
                          </span>
                          <span className="text-xs text-gray-500">{new Date(session.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{test?.title || 'Adaptive Test'}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                          <span className="flex items-center gap-1">
                            <FiFileText className="w-4 h-4" />
                            <span className="font-medium">{sections.join(' + ')}</span> • 2 Modules each
                          </span>
                          <span className="flex items-center gap-1">
                            <FiClock className="w-4 h-4" />
                            <span className="font-medium">{duration} min</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {session.status === 'Completed' ? (
                          <button
                            onClick={() => router.push(`/dashboard/tests/${test?._id}/results?session_id=${session._id}&returnUrl=/dashboard/adaptive-tests`)}
                            className={`px-6 py-2 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm ${
                              session.analysisSubmitted
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            {session.analysisSubmitted ? 'View Analysis' : 'Submit Analysis'}
                          </button>
                        ) : (
                          <button
                            onClick={() => router.push(`/dashboard/tests/${test?._id}/start?sessionId=${session._id}&returnUrl=/dashboard/adaptive-tests`)}
                            className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                          >
                            Resume
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
            ) : (
              <div className="text-center py-12 text-gray-500">No adaptive sessions found.</div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
