'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiPlay, FiFileText, FiCheckCircle, FiLayers } from 'react-icons/fi'

export default function ModuleTestsPage({ subject }) {
  const router = useRouter()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Assigned')

  useEffect(() => { fetchSessions() }, [])

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/test-sessions', {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      })
      const data = await res.json()
      const sessions = data.sessions || data || []
      const filtered = sessions.filter(s => {
        if (!s.testId?.isModuleTest) return false
        const modules = s.testId?.modules || []
        return modules.some(m => m.subject === subject)
      })
      setHistory(filtered)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { name: 'Assigned', count: history.filter(h => h.status === 'Assigned').length },
    { name: 'In Progress', count: history.filter(h => h.status === 'InProgress').length },
    { name: 'Completed', count: history.filter(h => h.status === 'Completed').length }
  ]

  const statusMap = { Assigned: 'Assigned', 'In Progress': 'InProgress', Completed: 'Completed' }
  const returnUrl = subject === 'Math' ? '/dashboard/tutor/module-tests/math' : '/dashboard/tutor/module-tests/rw'

  if (loading) return (
    <div className="p-8 flex justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Module {subject === 'Math' ? 'Math' : 'Reading & Writing'} Tests</h1>
          <p className="text-gray-500 mt-1">Multi-module {subject} tests assigned by your instructor.</p>
          <div className="flex items-center gap-2 mt-6 border-b border-gray-200">
            {tabs.map(tab => (
              <button key={tab.name} onClick={() => setActiveTab(tab.name)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.name ? 'border-purple-700 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {tab.name}
                {tab.count > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.name ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {(() => {
            const filtered = history.filter(h => h.status === statusMap[activeTab])
            if (!filtered.length) return (
              <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
                <FiFileText className="mx-auto w-8 h-8 text-gray-400 mb-3" />
                <h3 className="text-gray-900 font-medium">No {activeTab.toLowerCase()} module tests</h3>
                <p className="text-gray-500 text-sm mt-1">Check back later or contact your instructor.</p>
              </div>
            )
            return filtered.map(session => {
              const test = session.testId
              const modules = test?.modules || []
              const totalQ = modules.reduce((s, m) => s + (m.numberOfQuestions || m.questions?.length || 0), 0)
              return (
                <div key={session._id} className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${
                        session.status === 'Completed' ? 'bg-green-50 border-green-200 text-green-600'
                        : session.status === 'InProgress' ? 'bg-yellow-50 border-yellow-200 text-yellow-600'
                        : 'bg-blue-50 border-blue-100 text-blue-700'
                      }`}>
                        {session.status === 'InProgress' ? 'In Progress' : session.status}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded border border-purple-100">
                        <FiLayers className="inline w-3 h-3 mr-1" />{modules.length} Modules
                      </span>
                      <span className="text-xs text-gray-500">{new Date(session.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{test?.title || 'Module Test'}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                      <span className="flex items-center gap-1"><FiFileText className="w-4 h-4" /> <b>{totalQ}</b> Questions</span>
                      {modules.map((m, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                          M{i+1}: {m.subject} • {m.numberOfQuestions || m.questions?.length || 0}q • {m.isTimed ? `${m.duration}min` : 'Untimed'}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    {session.status === 'Completed' ? (
                      <button onClick={() => router.push(`/dashboard/tests/${test?._id}/results?session_id=${session._id}&returnUrl=${returnUrl}`)}
                        className="px-6 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                        <FiCheckCircle className="w-4 h-4" /> View Results
                      </button>
                    ) : (
                      <button onClick={() => router.push(`/dashboard/tests/${test?._id}/module-start`)}
                        className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                        <FiPlay className="w-4 h-4" /> {session.status === 'InProgress' ? 'Resume' : 'Start Test'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          })()}
        </div>
      </div>
    </div>
  )
}
