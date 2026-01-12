'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiClock, FiCheckCircle, FiXCircle, FiDownload, FiEye } from 'react-icons/fi'

export default function TestHistoryPage() {
  const router = useRouter()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/test-sessions', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      if (response.ok) {
        const data = await response.json()
        const sessions = data.sessions || data || []
        
        // Show sessions that have totalScore (completed SAT tests)
        const completedSessions = sessions.filter(s => 
          s.totalScore !== undefined && s.totalScore !== null
        )
        
        console.log('Completed SAT tests:', completedSessions)
        setHistory(completedSessions)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoading(false)
    }
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📚 Test History</h1>
        <p className="text-gray-600">Review your past test attempts and performance</p>
      </div>

      {history.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-600 mb-4">No test history yet</p>
          <button
            onClick={() => router.push('/dashboard/tests')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Take Your First Test
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {history.map((session) => {
            const totalScore = session.totalScore || 0
            const rwScore = session.rwScore || 0
            const mathScore = session.mathScore || 0
            const completedDate = session.completedAt || session.createdAt
            
            return (
              <div key={session._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">SAT Practice Test</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(completedDate).toLocaleDateString()} at {new Date(completedDate).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-600">{totalScore}</p>
                    <p className="text-sm text-gray-600">Total Score</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {rwScore > 0 && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Reading & Writing</p>
                      <p className="text-2xl font-bold text-blue-600">{rwScore}</p>
                    </div>
                  )}
                  {mathScore > 0 && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Math</p>
                      <p className="text-2xl font-bold text-green-600">{mathScore}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => router.push(`/dashboard/tests/history/${session._id}`)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <FiEye /> Review Answers
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
