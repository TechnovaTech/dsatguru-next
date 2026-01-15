'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiArrowLeft, FiEye } from 'react-icons/fi'

export default function RetestHistoryPage() {
  const router = useRouter()
  const [retests, setRetests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRetestHistory()
  }, [])

  const fetchRetestHistory = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/test-sessions', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        const sessions = data.sessions || data || []
        
        const retestSessions = sessions.filter(s => 
          s.sessionType === 'Retest' && s.status === 'Completed'
        ).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
        
        setRetests(retestSessions)
      }
    } catch (error) {
      console.error('Error fetching retest history:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard/tests/retest')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <FiArrowLeft /> Back to Retest Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">📚 Retest History</h1>
          <div className="w-32"></div>
        </div>

        {retests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 mb-4">No retest history yet</p>
            <button
              onClick={() => router.push('/dashboard/tests/retest')}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
            >
              Take a Retest
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {retests.map((retest, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-gray-900">
                        Retest #{retests.length - idx}
                      </h3>
                      <span className="text-sm bg-orange-100 text-orange-700 px-3 py-1 rounded">
                        {new Date(retest.completedAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Total Score</p>
                        <p className="text-3xl font-bold text-orange-600">{retest.totalScore}</p>
                        <p className="text-xs text-gray-500">out of 1600</p>
                      </div>
                      
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Reading & Writing</p>
                        <p className="text-2xl font-bold text-blue-600">{retest.rwScore}</p>
                        <p className="text-xs text-gray-500">out of 800</p>
                      </div>
                      
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Math</p>
                        <p className="text-2xl font-bold text-green-600">{retest.mathScore}</p>
                        <p className="text-xs text-gray-500">out of 800</p>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => router.push(`/dashboard/tests/retest/history/${retest._id}`)}
                    className="ml-6 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 flex items-center gap-2"
                  >
                    <FiEye /> View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
