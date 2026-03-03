'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiChevronDown, FiChevronRight, FiPlay, FiFileText, FiBarChart2, FiClock, FiCheckCircle } from 'react-icons/fi'

export default function TutorMathPage() {
  const router = useRouter()
  const [stats, setStats] = useState({ domains: [] })
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
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      })
      const data = await res.json()
      const sessions = data.sessions || data || []
      
      const tutorSessions = sessions.filter(s => {
        // Ensure testId exists and is a Tutor test
        const isTutor = s.testId?.practiceMode === 'tutor' || s.testId?.isTutorTest === true
        
        // STRICT Filtering: Only show tests explicitly marked as 'Math'
        // FALLBACK: If 'subject' is missing (legacy data), check 'sections.math'
        const isMath = s.testId?.subject === 'Math' || (!s.testId?.subject && s.testId?.sections?.math === true)
        
        return isTutor && isMath
      })
      setHistory(tutorSessions)
    } catch (error) {
      console.error('Failed to fetch history', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartSession = (session) => {
    if (session.testId) {
       router.push(`/dashboard/tests/${session.testId._id}/start?sessionId=${session._id}&returnUrl=/dashboard/tutor/math`)
    } else {
       console.error("Session missing testId", session)
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Math Tutor Tests</h1>
          <p className="text-gray-500 mt-1">Access your assigned tutor tests and track your progress.</p>
          
          <div className="flex items-center gap-2 mt-6 border-b border-gray-200">
            {tabs.map(tab => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.name 
                    ? 'border-purple-700 text-purple-700' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
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
          {activeTab === 'Assigned' && (
            history.filter(h => h.status === 'Assigned').length > 0 ? (
              history
                .filter(h => h.status === 'Assigned')
                .map((session) => (
                  <div key={session._id} className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all">
                    <div className="flex-1">
                       <div className="flex items-center gap-2 mb-2">
                         <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded border border-blue-100">Assigned</span>
                         <span className="text-xs text-gray-500">{new Date(session.createdAt).toLocaleDateString()}</span>
                       </div>
                       <h3 className="text-lg font-bold text-gray-900 mb-1">{session.testId?.title || 'Assigned Test'}</h3>
                       <div className="flex items-center gap-4 text-sm text-gray-500">
                         <span className="flex items-center gap-1"><FiFileText /> {session.testId?.questions?.length || session.testId?.totalQuestions || 0} Questions</span>
                         <span className="flex items-center gap-1"><FiBarChart2 /> {session.testId?.difficulty || 'Mixed'} Difficulty</span>
                       </div>
                    </div>
                    
                    <button
                       onClick={() => handleStartSession(session)}
                       className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                     >
                       <FiPlay className="w-4 h-4" /> Start Test
                     </button>
                  </div>
                ))
            ) : (
              <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
                <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FiFileText className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-gray-900 font-medium">No tests assigned</h3>
                <p className="text-gray-500 text-sm mt-1">You don&apos;t have any pending math tests.</p>
              </div>
            )
          )}

          {(activeTab === 'In Progress' || activeTab === 'Completed') && (
            history.filter(h => activeTab === 'Completed' ? h.status === 'Completed' : h.status === 'InProgress').length > 0 ? (
              history
                .filter(h => activeTab === 'Completed' ? h.status === 'Completed' : h.status === 'InProgress')
                .map((session) => (
                  <div key={session._id} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-sm transition-all">
                    <div className="flex-1">
                       <div className="text-xs text-gray-500 mb-1">#{session._id.slice(-6)} • {new Date(session.createdAt).toLocaleDateString()}</div>
                       <h3 className="text-base font-bold text-gray-900">{session.testId?.title || 'Practice Session'}</h3>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1"><FiClock className="w-4 h-4" /> {session.duration || '20 Mins'}</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                         <span className={`px-3 py-1 border text-xs font-semibold rounded uppercase tracking-wider ${
                           session.status === 'Completed'
                             ? 'bg-green-50 border-green-200 text-green-600' 
                             : 'bg-yellow-50 border-yellow-200 text-yellow-600'
                         }`}>
                           {session.status === 'Completed' ? 'Completed' : 'In Progress'}
                         </span>
                         {session.status === 'Completed' ? (
                           <button
                             onClick={() => {
                               console.log('Session:', session._id, 'analysisSubmitted:', session.analysisSubmitted)
                               router.push(`/dashboard/tests/${session.testId?._id}/results?session_id=${session._id}&returnUrl=/dashboard/tutor/math`)
                             }}
                             className={`px-6 py-2 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm ${
                               session.analysisSubmitted 
                                 ? 'bg-green-600 hover:bg-green-700' 
                                 : 'bg-purple-900 hover:bg-purple-800'
                             }`}
                           >
                             {session.analysisSubmitted ? 'View Analysis' : 'Submit Analysis'}
                           </button>
                         ) : (
                           <button
                             onClick={() => router.push(`/dashboard/tests/${session.testId?._id}/start?sessionId=${session._id}&returnUrl=/dashboard/tutor/math`)}
                             className="px-6 py-2 bg-purple-900 text-white text-sm font-semibold rounded-lg hover:bg-purple-800 transition-colors shadow-sm"
                           >
                             Resume
                           </button>
                         )}
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-12 text-gray-500">No sessions found.</div>
            )
          )}
          
          {(activeTab === 'Scheduled' || activeTab === 'Expired') && (
             <div className="text-center py-12 text-gray-500">No items found in this category.</div>
          )}
        </div>
      </div>
    </div>
  )
}
