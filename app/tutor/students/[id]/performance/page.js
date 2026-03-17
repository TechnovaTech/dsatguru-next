'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../../../components/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import {
  FiArrowLeft, FiUser, FiAlertCircle, FiBarChart2,
  FiXCircle, FiClock, FiChevronDown, FiFilter
} from 'react-icons/fi'

export default function StudentPerformancePage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const studentId = params.id

  const [activeTab, setActiveTab] = useState('mistakes')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [subjectFilter, setSubjectFilter] = useState('All')
  const [modalTopic, setModalTopic] = useState(null) // { topic, mistakes[] }

  useEffect(() => {
    if (user && user.role !== 'Tutor') router.push('/dashboard')
  }, [user, router])

  useEffect(() => {
    if (studentId) fetchPerformance()
  }, [studentId])

  const fetchPerformance = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/tutor/students/${studentId}/performance`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setData(await res.json())
      else setError('Failed to load performance data')
    } catch {
      setError('Failed to load performance data')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (s) => {
    if (!s) return '0s'
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
  }
  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : 'N/A'

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">Loading performance data...</div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-red-500 flex items-center gap-2"><FiAlertCircle />{error}</div>
    </div>
  )

  const { student, topicRows = [], totalQuestions, totalCorrect, overallAccuracy, parallelData = [] } = data || {}

  // Subjects available
  const subjects = ['All', ...new Set(topicRows.map(r => r.subject))]

  const filteredRows = subjectFilter === 'All'
    ? topicRows
    : topicRows.filter(r => r.subject === subjectFilter)

  const filteredTotal = filteredRows.reduce((s, r) => s + r.total, 0)
  const filteredCorrect = filteredRows.reduce((s, r) => s + r.correct, 0)
  const filteredAccuracy = filteredTotal > 0
    ? ((filteredCorrect / filteredTotal) * 100).toFixed(2)
    : '0.00'

  // Parallel analysis topics
  const allTopics = [...new Set(parallelData.flatMap(s => Object.keys(s.topicBreakdown || {})))]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Back */}
        <button onClick={() => router.push('/tutor/students')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <FiArrowLeft /> Back to Students
        </button>

        {/* Student header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <FiUser className="text-blue-600 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{student?.name}</h1>
            <p className="text-gray-500 text-sm">{student?.email}</p>
          </div>
          <div className="ml-auto flex gap-4 text-center">
            <div className="bg-gray-50 rounded-lg px-5 py-3 border">
              <div className="text-2xl font-bold text-gray-800">{totalQuestions || 0}</div>
              <div className="text-xs text-gray-500 mt-0.5">Total Questions</div>
            </div>
            <div className="bg-green-50 rounded-lg px-5 py-3 border border-green-100">
              <div className="text-2xl font-bold text-green-600">{totalCorrect || 0}</div>
              <div className="text-xs text-gray-500 mt-0.5">Correct</div>
            </div>
            <div className="bg-purple-50 rounded-lg px-5 py-3 border border-purple-100">
              <div className="text-2xl font-bold text-purple-600">{overallAccuracy || 0}%</div>
              <div className="text-xs text-gray-500 mt-0.5">Accuracy</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'mistakes', label: 'Mistake Analysis', icon: <FiXCircle /> },
            { key: 'parallel', label: 'Parallel Analysis', icon: <FiBarChart2 /> }
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'bg-purple-700 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── MISTAKE ANALYSIS TAB ── */}
        {activeTab === 'mistakes' && (
          <div>
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <FiFilter /> Subject:
              </div>
              {subjects.map(s => (
                <button key={s} onClick={() => setSubjectFilter(s)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    subjectFilter === s
                      ? 'bg-purple-700 text-white border-purple-700'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'
                  }`}>
                  {s === 'Reading and Writing' ? 'R&W' : s}
                </button>
              ))}
            </div>

            {/* Stats bar */}
            <div className="bg-white rounded-xl shadow-sm mb-4 grid grid-cols-3 divide-x">
              <div className="px-8 py-5 text-center">
                <div className="text-3xl font-bold text-gray-900">{filteredTotal}</div>
                <div className="text-sm text-gray-500 mt-1">Total Questions</div>
              </div>
              <div className="px-8 py-5 text-center">
                <div className="text-3xl font-bold text-green-600">{filteredCorrect}</div>
                <div className="text-sm text-gray-500 mt-1">Correct Questions</div>
              </div>
              <div className="px-8 py-5 text-center">
                <div className="text-3xl font-bold text-purple-600">{filteredAccuracy}%</div>
                <div className="text-sm text-gray-500 mt-1">Accuracy</div>
              </div>
            </div>

            {/* Topic table */}
            {filteredRows.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
                No data available for this filter.
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-8">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-purple-600 uppercase">Topic</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-purple-600 uppercase">Total Qs</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-purple-600 uppercase">Correct Qs</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-purple-600 uppercase">Avg Mistakes</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-purple-600 uppercase">Accuracy</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRows.map((row, idx) => (
                      <tr key={row.topic} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 text-sm">{row.topic}</div>
                          <div className="text-xs text-gray-400">{row.subject}</div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-gray-700">{row.total}</td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-green-600">{row.correct}</td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-red-500">{row.avgMistakes}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-semibold ${
                            row.accuracy >= 80 ? 'text-green-600' :
                            row.accuracy >= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>{row.accuracy}%</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.mistakes.length > 0 ? (
                            <button
                              onClick={() => setModalTopic(row)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium hover:bg-purple-100 transition-colors"
                            >
                              {row.wrong} wrong <FiChevronDown />
                            </button>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Mistakes Modal */}
            {modalTopic && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh]">
                  {/* Modal header */}
                  <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{modalTopic.topic}</h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {modalTopic.wrong} wrong out of {modalTopic.total} questions
                      </p>
                    </div>
                    <button
                      onClick={() => setModalTopic(null)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-xl font-bold"
                    >
                      ×
                    </button>
                  </div>

                  {/* Scrollable question list */}
                  <div className="overflow-y-auto flex-1 p-6 space-y-5">
                    {modalTopic.mistakes.map((m, mi) => (
                      <div key={mi} className="border border-gray-200 rounded-xl p-4">
                        {/* Meta tags */}
                        <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{m.subject}</span>
                          <span className={`px-2 py-0.5 rounded-full ${
                            m.difficulty === 'Hard' ? 'bg-red-100 text-red-700' :
                            m.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>{m.difficulty}</span>
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{m.sessionType}</span>
                          {m.timeSpent > 0 && (
                            <span className="flex items-center gap-1 text-gray-400"><FiClock />{formatTime(m.timeSpent)}</span>
                          )}
                          <span className="text-gray-400">{m.testTitle} — {formatDate(m.completedAt)}</span>
                        </div>

                        {/* Question number */}
                        <div className="text-xs font-semibold text-purple-600 mb-1">Q{mi + 1}</div>

                        {/* Question text */}
                        <p className="text-gray-900 text-sm font-medium mb-3 leading-relaxed">{m.question}</p>

                        {/* Options (MCQ) */}
                        {Array.isArray(m.options) && m.options.length > 0 ? (
                          <div className="grid grid-cols-1 gap-2 mb-3">
                            {m.options.map((opt, oi) => {
                              const label = String.fromCharCode(65 + oi)
                              const isCorrect = opt === m.correctAnswer || label === m.correctAnswer
                              const isSelected = opt === m.selectedAnswer || label === m.selectedAnswer
                              return (
                                <div key={oi} className={`px-3 py-2 rounded-lg text-sm border flex items-center gap-2 ${
                                  isCorrect ? 'bg-green-50 border-green-300 text-green-800' :
                                  isSelected ? 'bg-red-50 border-red-300 text-red-800' :
                                  'bg-gray-50 border-gray-200 text-gray-700'
                                }`}>
                                  <span className="font-semibold w-5 flex-shrink-0">{label}.</span>
                                  <span className="flex-1">{opt}</span>
                                  {isCorrect && <span className="text-green-600 font-bold">✓</span>}
                                  {isSelected && !isCorrect && <span className="text-red-600 font-bold">✗</span>}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          /* Fill-in-blank */
                          <div className="flex gap-3 mb-3 text-sm">
                            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex-1">
                              <span className="text-gray-500 text-xs block mb-0.5">Student answered</span>
                              <span className="font-semibold text-red-700">{m.selectedAnswer || 'No answer'}</span>
                            </div>
                            <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg flex-1">
                              <span className="text-gray-500 text-xs block mb-0.5">Correct answer</span>
                              <span className="font-semibold text-green-700">{m.correctAnswer}</span>
                            </div>
                          </div>
                        )}

                        {/* Explanation */}
                        {m.explanation && (
                          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
                            <span className="font-semibold">Explanation: </span>{m.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-3 border-t bg-gray-50 flex-shrink-0">
                    <button
                      onClick={() => setModalTopic(null)}
                      className="w-full py-2 bg-purple-700 text-white rounded-lg text-sm font-medium hover:bg-purple-800"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PARALLEL ANALYSIS TAB ── */}
        {activeTab === 'parallel' && (
          <div>
            {parallelData.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
                <FiBarChart2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-lg font-medium">No tutor test data available</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {parallelData.map(session => (
                    <div key={session.sessionId} className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-purple-500">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{session.testTitle}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{formatDate(session.completedAt)}</div>
                        </div>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          session.subject === 'Math' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>{session.subject}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-xl font-bold text-purple-600">{session.accuracy}%</div>
                          <div className="text-xs text-gray-500">Accuracy</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold text-green-600">{session.correctAnswers}</div>
                          <div className="text-xs text-gray-500">Correct</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold text-red-500">{session.totalQuestions - session.correctAnswers}</div>
                          <div className="text-xs text-gray-500">Wrong</div>
                        </div>
                      </div>
                      {session.timeSpent > 0 && (
                        <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                          <FiClock />{formatTime(session.timeSpent)} total
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {allTopics.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b">
                      <h3 className="font-semibold text-gray-900">Topic-wise Comparison Across Tests</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50">Topic</th>
                            {parallelData.map(s => (
                              <th key={s.sessionId} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                                {s.testTitle.length > 18 ? s.testTitle.slice(0, 18) + '…' : s.testTitle}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {allTopics.map(topic => (
                            <tr key={topic} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white">{topic}</td>
                              {parallelData.map(session => {
                                const tb = session.topicBreakdown[topic]
                                if (!tb) return <td key={session.sessionId} className="px-4 py-3 text-center text-gray-300">—</td>
                                const pct = Math.round((tb.correct / tb.total) * 100)
                                return (
                                  <td key={session.sessionId} className="px-4 py-3 text-center">
                                    <div className={`inline-flex flex-col items-center px-2 py-1 rounded-lg ${
                                      pct >= 80 ? 'bg-green-50 text-green-700' :
                                      pct >= 50 ? 'bg-yellow-50 text-yellow-700' :
                                      'bg-red-50 text-red-700'
                                    }`}>
                                      <span className="font-bold">{pct}%</span>
                                      <span className="text-xs">{tb.correct}/{tb.total}</span>
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
