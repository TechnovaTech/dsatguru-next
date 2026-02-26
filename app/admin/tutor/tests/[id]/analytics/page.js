'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FiArrowLeft, FiUsers, FiCheckCircle, FiXCircle, FiAlertCircle, FiBarChart2, FiTrendingUp, FiTrendingDown } from 'react-icons/fi'

export default function TestAnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const testId = params.id
  
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('questionNumber') // 'questionNumber', 'correctRate', 'incorrectRate'

  useEffect(() => {
    fetchAnalytics()
  }, [testId])

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/admin/tutor/tests/${testId}/analytics`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (res.ok) {
        const data = await res.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-900"></div>
      </div>
    )
  }

  if (!analytics || analytics.totalStudents === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <button 
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <FiArrowLeft /> Back
          </button>
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <FiUsers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Data Available</h2>
            <p className="text-gray-500">No students have completed this test yet.</p>
          </div>
        </div>
      </div>
    )
  }

  const sortedQuestions = [...analytics.questions].sort((a, b) => {
    if (sortBy === 'correctRate') return b.correctPercentage - a.correctPercentage
    if (sortBy === 'incorrectRate') return b.incorrectPercentage - a.incorrectPercentage
    return 0 // Keep original order for questionNumber
  })

  const avgCorrect = Math.round(analytics.questions.reduce((sum, q) => sum + q.correctPercentage, 0) / analytics.questions.length)
  const avgIncorrect = Math.round(analytics.questions.reduce((sum, q) => sum + q.incorrectPercentage, 0) / analytics.questions.length)
  const avgOmitted = Math.round(analytics.questions.reduce((sum, q) => sum + q.omittedPercentage, 0) / analytics.questions.length)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{analytics.testTitle}</h1>
              <p className="text-sm text-gray-500">Test Analytics Dashboard</p>
            </div>
          </div>
          <div className="px-4 py-2 bg-purple-100 text-purple-900 rounded-lg font-bold">
            <FiUsers className="inline mr-2" />
            {analytics.totalStudents} Students
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">Avg. Correct Rate</span>
              <FiCheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-4xl font-bold text-green-600 mb-2">{avgCorrect}%</div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <FiTrendingUp className="text-green-500" />
              Across {analytics.questions.length} questions
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">Avg. Incorrect Rate</span>
              <FiXCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="text-4xl font-bold text-red-600 mb-2">{avgIncorrect}%</div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <FiTrendingDown className="text-red-500" />
              Across {analytics.questions.length} questions
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">Avg. Omitted Rate</span>
              <FiAlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-4xl font-bold text-orange-600 mb-2">{avgOmitted}%</div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <FiBarChart2 className="text-orange-500" />
              Across {analytics.questions.length} questions
            </div>
          </div>
        </div>

        {/* Question-wise Analytics Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">Question-wise Performance</h2>
            <div className="flex gap-2">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="questionNumber">Sort by Question #</option>
                <option value="correctRate">Sort by Correct Rate</option>
                <option value="incorrectRate">Sort by Incorrect Rate</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Q#</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Question</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Correct</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Incorrect</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Omitted</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedQuestions.map((q, idx) => {
                  const originalIdx = analytics.questions.findIndex(aq => aq.questionId === q.questionId)
                  return (
                    <tr key={q.questionId} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="w-8 h-8 bg-purple-100 text-purple-700 font-bold rounded flex items-center justify-center">
                          {originalIdx + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 line-clamp-2 max-w-md">
                          {q.questionContent || 'Question content'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-lg font-bold text-green-600">{q.correctPercentage}%</span>
                          <span className="text-xs text-gray-500">({q.correctCount})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-lg font-bold text-red-600">{q.incorrectPercentage}%</span>
                          <span className="text-xs text-gray-500">({q.incorrectCount})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-lg font-bold text-orange-600">{q.omittedPercentage}%</span>
                          <span className="text-xs text-gray-500">({q.omittedCount})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          <div 
                            className="h-8 bg-green-500 rounded-l transition-all"
                            style={{ width: `${q.correctPercentage}%` }}
                            title={`${q.correctPercentage}% Correct`}
                          ></div>
                          <div 
                            className="h-8 bg-red-500 transition-all"
                            style={{ width: `${q.incorrectPercentage}%` }}
                            title={`${q.incorrectPercentage}% Incorrect`}
                          ></div>
                          <div 
                            className="h-8 bg-orange-500 rounded-r transition-all"
                            style={{ width: `${q.omittedPercentage}%` }}
                            title={`${q.omittedPercentage}% Omitted`}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
