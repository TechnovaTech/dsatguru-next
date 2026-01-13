'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiPlay, FiClock, FiFileText, FiCheckCircle } from 'react-icons/fi'

export default function TestsPage() {
  const router = useRouter()
  const [tests, setTests] = useState([])
  const [completedTestIds, setCompletedTestIds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTests()
  }, [])

  const fetchTests = async () => {
    try {
      const token = localStorage.getItem('token')
      const [testsRes, historyRes] = await Promise.all([
        fetch('/api/admin/tests', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),
        fetch('/api/test-sessions', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
      ])
      
      if (testsRes.ok) {
        const data = await testsRes.json()
        setTests(data.filter(test => test.isActive))
      }
      
      if (historyRes.ok) {
        const historyData = await historyRes.json()
        const sessions = historyData.sessions || historyData || []
        const completed = sessions
          .filter(s => s.status === 'Completed' && s.totalScore !== undefined)
          .map(s => String(s.testId))
        setCompletedTestIds(completed)
      }
    } catch (error) {
      console.error('Error fetching tests:', error)
    } finally {
      setLoading(false)
    }
  }

  const startTest = (testId) => {
    if (completedTestIds.includes(String(testId))) {
      alert('You have already completed this test. Check your Test History to review it.')
      return
    }
    router.push(`/dashboard/tests/${testId}/start`)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📝 Available Tests</h1>
          <p className="text-gray-600">Take practice tests created by your instructors</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/tests/history')}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          📚 Test History
        </button>
      </div>

      {tests.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FiFileText className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Tests Available</h3>
          <p className="text-gray-500">Check back later for new tests</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => {
            const isCompleted = completedTestIds.includes(String(test._id))
            
            return (
              <div key={test._id} className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow ${
                isCompleted ? 'opacity-75 border-2 border-green-500' : ''
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FiFileText className="text-blue-600" size={24} />
                    <h3 className="text-lg font-semibold text-gray-900">{test.title}</h3>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    isCompleted 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {isCompleted ? 'Completed' : 'Active'}
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiClock size={16} />
                    <span>Duration: {test.duration || 180} minutes</span>
                  </div>
                  
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Sections:</p>
                    <div className="flex gap-2">
                      {test.sections?.math && (
                        <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
                          Math
                        </span>
                      )}
                      {test.sections?.rw && (
                        <span className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded">
                          Reading & Writing
                        </span>
                      )}
                    </div>
                  </div>

                  {test.configType && (
                    <div className="text-xs text-gray-500">
                      Type: {test.configType === 'standard' ? 'Standard SAT' : 'Custom'}
                    </div>
                  )}
                </div>

                {isCompleted ? (
                  <button
                    onClick={() => router.push('/dashboard/tests/history')}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FiCheckCircle size={18} />
                    View Results
                  </button>
                ) : (
                  <button
                    onClick={() => startTest(test._id)}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FiPlay size={18} />
                    Start Test
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
