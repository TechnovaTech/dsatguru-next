'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiPlay, FiFileText, FiClock, FiCheckCircle } from 'react-icons/fi'

export default function AdminTestsPage() {
  const router = useRouter()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Assigned')

  useEffect(() => { fetchTests() }, [])

  const fetchTests = async () => {
    try {
      const token = localStorage.getItem('token')
      const userRes = await fetch('/api/user/profile', { headers: { Authorization: `Bearer ${token}` } })
      if (userRes.ok) {
        const data = await userRes.json()
        const testIds = data.user.assignedTests || []
        await fetchHistory(testIds)
      }
    } catch (e) {
      console.error('Failed to fetch admin tests', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async (testIds) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/test-sessions', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      const data = await res.json()
      const sessions = data.sessions || data || []

      const adminSessions = sessions.filter(s => {
        if (!s.testId) return false
        const isAdmin = s.testId?.practiceMode === 'admin'
        const isAssigned = testIds.length === 0 || testIds.map(id => id?.toString()).includes(s.testId?._id?.toString())
        return isAdmin && isAssigned
      })

      setHistory(adminSessions)
    } catch (e) {
      console.error('Failed to fetch sessions', e)
    }
  }

  const tabs = [
    { name: 'Assigned', count: history.filter(h => h.status === 'Assigned').length },
    { name: 'In Progress', count: history.filter(h => h.status === 'InProgress').length },
    { name: 'Completed', count: history.filter(h => h.status === 'Completed').length }
  ]

  const returnUrl = '/dashboard/admin-tests'

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" /></div>
  }

  const renderSession = (session) => {
    const test = session.testId
    const questionCount = test?.totalQuestions || test?.questions?.length || 0
    const duration = test?.duration || 0
    const isReassigned = session.isReassigned === true
    const sections = []
    if (test?.sections?.rw) sections.push('R&W')
    if (test?.sections?.math) sections.push('Math')

    return (
      <div key={session._id} className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${
              session.status === 'Assigned' ? 'bg-blue-50 border-blue-100 text-blue-700'
              : session.status === 'Completed' ? 'bg-green-50 border-green-200 text-green-600'
              : 'bg-yellow-50 border-yellow-200 text-yellow-600'
            }`}>
              {session.status === 'InProgress' ? 'In Progress' : session.status}
            </span>
            {sections.length > 0 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">{sections.join(' + ')}</span>
            )}
            {isReassigned && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded border border-amber-100">🔄 Reassigned</span>}
            <span className="text-xs text-gray-400">{new Date(session.createdAt).toLocaleDateString()}</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">{test?.title || 'Admin Test'}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
            <span className="flex items-center gap-1"><FiFileText className="w-4 h-4" /><span className="font-medium">{questionCount}</span> Questions</span>
            <span className="flex items-center gap-1">
              <FiClock className="w-4 h-4" />
              {test?.isTimed ? <span className="font-medium">{duration} min</span> : <span className="font-medium text-orange-600">Untimed</span>}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {session.status === 'Assigned' && (
            <button
              onClick={() => router.push(`/dashboard/tests/${test?._id}/start?sessionId=${session._id}&returnUrl=${returnUrl}`)}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <FiPlay className="w-4 h-4" /> Start Test
            </button>
          )}
          {session.status === 'InProgress' && (
            <button
              onClick={() => router.push(`/dashboard/tests/${test?._id}/start?sessionId=${session._id}&returnUrl=${returnUrl}`)}
              className="px-6 py-2 bg-yellow-600 text-white text-sm font-semibold rounded-lg hover:bg-yellow-700"
            >
              Resume
            </button>
          )}
          {session.status === 'Completed' && (
            <button
              onClick={() => router.push(`/dashboard/tests/${test?._id}/results?session_id=${session._id}&returnUrl=${returnUrl}`)}
              className={`px-6 py-2 text-white text-sm font-semibold rounded-lg ${session.analysisSubmitted ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {session.analysisSubmitted ? 'View Analysis' : 'Submit Analysis'}
            </button>
          )}
        </div>
      </div>
    )
  }

  const filtered = history.filter(h => {
    if (activeTab === 'Assigned') return h.status === 'Assigned'
    if (activeTab === 'In Progress') return h.status === 'InProgress' && !h.isReassigned
    if (activeTab === 'Completed') return h.status === 'Completed' && !h.isReassigned
    return false
  })

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Tests</h1>
          <p className="text-gray-500 mt-1">Access your assigned admin practice tests and track your progress.</p>

          <div className="flex items-center gap-2 mt-6 border-b border-gray-200">
            {tabs.map(tab => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.name ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
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
          {filtered.length > 0 ? filtered.map(renderSession) : (
            <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
              <FiFileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-gray-700 font-medium">No tests in this category</h3>
              <p className="text-gray-400 text-sm mt-1">
                {activeTab === 'Assigned' ? "You don't have any pending admin tests." : `No ${activeTab.toLowerCase()} admin tests.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
