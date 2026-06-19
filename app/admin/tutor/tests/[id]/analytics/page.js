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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (!analytics || analytics.totalStudents === 0) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            <FiArrowLeft /> Back
          </button>
          <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiUsers className="h-8 w-8" /></div>
            <h2 className="mb-2 text-xl font-bold text-slate-900">No Data Available</h2>
            <p className="text-sm text-slate-500">No students have completed this test yet.</p>
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
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-slate-400 hover:text-slate-600"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">{analytics.testTitle}</h1>
              <p className="text-sm text-slate-500">Test Analytics Dashboard</p>
            </div>
          </div>
          <div className="rounded-lg bg-indigo-50 px-4 py-2 font-bold text-indigo-700">
            <FiUsers className="inline mr-2" />
            {analytics.totalStudents} Students
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-600">Avg. Correct Rate</span>
              <FiCheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="text-4xl font-extrabold text-emerald-600 mb-2">{avgCorrect}%</div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <FiTrendingUp className="text-emerald-500" />
              Across {analytics.questions.length} questions
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-600">Avg. Incorrect Rate</span>
              <FiXCircle className="w-6 h-6 text-rose-600" />
            </div>
            <div className="text-4xl font-extrabold text-rose-600 mb-2">{avgIncorrect}%</div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <FiTrendingDown className="text-rose-500" />
              Across {analytics.questions.length} questions
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-600">Avg. Omitted Rate</span>
              <FiAlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="text-4xl font-extrabold text-amber-600 mb-2">{avgOmitted}%</div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <FiBarChart2 className="text-amber-500" />
              Across {analytics.questions.length} questions
            </div>
          </div>
        </div>

        {/* Question-wise Analytics Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-6">
            <h2 className="text-lg font-bold text-slate-900">Question-wise Performance</h2>
            <div className="flex gap-2">
              <label htmlFor="analytics-sort" className="sr-only">Sort questions</label>
              <select
                id="analytics-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
              >
                <option value="questionNumber">Sort by Question #</option>
                <option value="correctRate">Sort by Correct Rate</option>
                <option value="incorrectRate">Sort by Incorrect Rate</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Q#</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Question</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Correct</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Incorrect</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Omitted</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedQuestions.map((q, idx) => {
                  const originalIdx = analytics.questions.findIndex(aq => aq.questionId === q.questionId)
                  return (
                    <tr key={q.questionId} className="transition-colors hover:bg-indigo-50/40">
                      <td className="px-6 py-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-100 font-bold text-indigo-700">
                          {originalIdx + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900 line-clamp-2 max-w-md">
                          {q.questionContent || 'Question content'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-lg font-bold text-emerald-600">{q.correctPercentage}%</span>
                          <span className="text-xs text-slate-500">({q.correctCount})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-lg font-bold text-rose-600">{q.incorrectPercentage}%</span>
                          <span className="text-xs text-slate-500">({q.incorrectCount})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-lg font-bold text-amber-600">{q.omittedPercentage}%</span>
                          <span className="text-xs text-slate-500">({q.omittedCount})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          <div
                            className="h-8 bg-emerald-500 rounded-l transition-all"
                            style={{ width: `${q.correctPercentage}%` }}
                            title={`${q.correctPercentage}% Correct`}
                          ></div>
                          <div
                            className="h-8 bg-rose-500 transition-all"
                            style={{ width: `${q.incorrectPercentage}%` }}
                            title={`${q.incorrectPercentage}% Incorrect`}
                          ></div>
                          <div
                            className="h-8 bg-amber-500 rounded-r transition-all"
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
