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

  // Mistake analysis filters
  const [subjectFilter, setSubjectFilter] = useState('All')
  const [modalTopic, setModalTopic] = useState(null)

  // Parallel analysis filters
  const [pSubject, setPSubject] = useState('All')
  const [pViewType, setPViewType] = useState('All') // 'All' | 'Mistakes Only' | 'Correct Only'
  const [pDifficulty, setPDifficulty] = useState('All')
  const [pTimeTaken, setPTimeTaken] = useState('All') // 'All' | '0-30' | '30-60' | '60+'
  const [pTopic, setPTopic] = useState('All')
  const [showFilters, setShowFilters] = useState(false)
  const [pPage, setPPage] = useState(1)
  const PAGE_SIZE = 10

  useEffect(() => {
    if (user && !['Tutor', 'TutorAdmin', 'Admin'].includes(user.role)) router.push('/dashboard')
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

  const { student, topicRows = [], totalQuestions, totalCorrect, overallAccuracy, allQuestions = [] } = data || {}

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

  // Parallel analysis — available filter options
  const pSubjects = ['All', ...new Set(allQuestions.map(q => q.subject))]
  const pTopics = ['All', ...new Set(allQuestions.map(q => q.topic))]

  // Apply parallel filters
  const parallelFiltered = allQuestions.filter(q => {
    if (pSubject !== 'All' && q.subject !== pSubject) return false
    if (pViewType === 'Mistakes Only' && q.isCorrect) return false
    if (pViewType === 'Correct Only' && !q.isCorrect) return false
    if (pDifficulty !== 'All' && q.difficulty !== pDifficulty) return false
    if (pTopic !== 'All' && q.topic !== pTopic) return false
    if (pTimeTaken === '0-30' && q.timeSpent > 30) return false
    if (pTimeTaken === '30-60' && (q.timeSpent <= 30 || q.timeSpent > 60)) return false
    if (pTimeTaken === '60+' && q.timeSpent <= 60) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(parallelFiltered.length / PAGE_SIZE))
  const pagedQuestions = parallelFiltered.slice((pPage - 1) * PAGE_SIZE, pPage * PAGE_SIZE)

  const resetParallelFilters = () => {
    setPSubject('All'); setPViewType('All'); setPDifficulty('All')
    setPTimeTaken('All'); setPTopic('All'); setPPage(1)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Back */}
        <button onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <FiArrowLeft /> Back
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
          <div className="flex gap-4 relative">
            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Active filter chips */}
              <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-600">Selected Filters:</span>
                {[
                  { label: pSubject === 'All' ? 'All Tests' : pSubject, key: 'subject' },
                  { label: pViewType === 'All' ? 'All Questions' : pViewType, key: 'view' },
                  ...(pTopic !== 'All' ? [{ label: pTopic, key: 'topic' }] : []),
                  ...(pDifficulty !== 'All' ? [{ label: pDifficulty, key: 'diff' }] : []),
                  ...(pTimeTaken !== 'All' ? [{ label: `${pTimeTaken}s`, key: 'time' }] : []),
                ].map(chip => (
                  <span key={chip.key} className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-700 text-white rounded-full text-xs font-medium">
                    ● {chip.label} ▾
                  </span>
                ))}
                <button
                  onClick={() => setShowFilters(true)}
                  className="ml-auto px-4 py-1.5 border border-purple-300 text-purple-700 rounded-full text-xs font-medium hover:bg-purple-50"
                >
                  More Filters
                </button>
              </div>

              {/* Pagination */}
              {parallelFiltered.length > 0 && (
                <div className="flex items-center gap-1 mb-4">
                  <button onClick={() => setPPage(p => Math.max(1, p - 1))}
                    disabled={pPage === 1}
                    className="w-8 h-8 flex items-center justify-center rounded border text-gray-500 hover:bg-gray-100 disabled:opacity-30">‹</button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const pg = i + 1
                    return (
                      <button key={pg} onClick={() => setPPage(pg)}
                        className={`w-8 h-8 flex items-center justify-center rounded border text-sm font-medium ${
                          pPage === pg ? 'bg-purple-100 border-purple-400 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
                        }`}>{pg}</button>
                    )
                  })}
                  {totalPages > 7 && <span className="px-1 text-gray-400">…</span>}
                  {totalPages > 7 && (
                    <button onClick={() => setPPage(totalPages)}
                      className={`w-8 h-8 flex items-center justify-center rounded border text-sm font-medium ${
                        pPage === totalPages ? 'bg-purple-100 border-purple-400 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
                      }`}>{totalPages}</button>
                  )}
                  <button onClick={() => setPPage(p => Math.min(totalPages, p + 1))}
                    disabled={pPage === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded border text-gray-500 hover:bg-gray-100 disabled:opacity-30">›</button>
                  <span className="ml-2 text-xs text-gray-400">{parallelFiltered.length} questions</span>
                </div>
              )}

              {/* Question list */}
              {pagedQuestions.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
                  No questions match the selected filters.
                </div>
              ) : (
                <div className="space-y-4">
                  {pagedQuestions.map((q, idx) => {
                    const globalIdx = (pPage - 1) * PAGE_SIZE + idx + 1
                    return (
                      <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                          <span className="w-7 h-7 flex items-center justify-center bg-gray-100 rounded font-bold text-gray-700">{globalIdx}</span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{q.isMCQ ? 'MCQ' : 'Fill-in'}</span>
                          <span className={`px-2 py-0.5 rounded-full font-medium ${q.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {q.isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                          {q.timeSpent > 0 && (
                            <span className="flex items-center gap-1 text-gray-500"><FiClock />{formatTime(q.timeSpent)}</span>
                          )}
                          <span className="text-gray-400">Difficulty - {q.difficulty}</span>
                          <span className="text-gray-400">{q.testTitle}</span>
                          <span className="text-gray-400">{formatDate(q.completedAt)}</span>
                        </div>

                        {/* Question */}
                        <div className="text-xs font-semibold text-gray-400 mb-1">Question</div>
                        <p className="text-gray-900 text-sm font-medium mb-4 leading-relaxed">{q.question}</p>

                        {/* Options */}
                        {q.isMCQ ? (
                          <>
                            <div className="text-xs font-semibold text-gray-400 mb-2">Options</div>
                            <div className="grid grid-cols-1 gap-2">
                              {q.options.map((opt, oi) => {
                                const label = String.fromCharCode(65 + oi)
                                const isCorrect = opt === q.correctAnswer || label === q.correctAnswer
                                const isSelected = opt === q.selectedAnswer || label === q.selectedAnswer
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
                          </>
                        ) : (
                          <div className="flex gap-3 text-sm">
                            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex-1">
                              <span className="text-gray-400 text-xs block mb-0.5">Student answered</span>
                              <span className="font-semibold text-red-700">{q.selectedAnswer || 'No answer'}</span>
                            </div>
                            <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg flex-1">
                              <span className="text-gray-400 text-xs block mb-0.5">Correct answer</span>
                              <span className="font-semibold text-green-700">{q.correctAnswer}</span>
                            </div>
                          </div>
                        )}

                        {q.explanation && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
                            <span className="font-semibold">Explanation: </span>{q.explanation}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* More Filters side panel */}
            {showFilters && (
              <div className="w-80 flex-shrink-0 bg-white rounded-xl shadow-lg border border-gray-200 p-5 h-fit sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">More Filters</h3>
                  <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
                </div>

                {/* Subject */}
                <div className="mb-5">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Select Subject <span className="text-red-500">*</span></div>
                  <div className="flex gap-2 flex-wrap">
                    {pSubjects.map(s => (
                      <button key={s} onClick={() => { setPSubject(s); setPPage(1) }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                          pSubject === s ? 'bg-purple-700 text-white border-purple-700' : 'border-gray-300 text-gray-600 hover:border-purple-400'
                        }`}>
                        <span className={`w-3 h-3 rounded-full border-2 ${pSubject === s ? 'bg-white border-white' : 'border-gray-400'}`}></span>
                        {s === 'Reading and Writing' ? 'R&W' : s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* View type */}
                <div className="mb-5">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Select View type</div>
                  <div className="flex gap-2 flex-wrap">
                    {['All', 'Mistakes Only', 'Correct Only'].map(v => (
                      <button key={v} onClick={() => { setPViewType(v); setPPage(1) }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                          pViewType === v ? 'bg-purple-700 text-white border-purple-700' : 'border-gray-300 text-gray-600 hover:border-purple-400'
                        }`}>
                        <span className={`w-3 h-3 rounded-full border-2 ${pViewType === v ? 'bg-white border-white' : 'border-gray-400'}`}></span>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div className="mb-5">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Select Difficulty</div>
                  <div className="flex gap-2 flex-wrap">
                    {['All', 'Easy', 'Medium', 'Hard'].map(d => (
                      <button key={d} onClick={() => { setPDifficulty(d); setPPage(1) }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                          pDifficulty === d ? 'bg-purple-700 text-white border-purple-700' : 'border-gray-300 text-gray-600 hover:border-purple-400'
                        }`}>
                        <span className={`w-3 h-3 rounded-full border-2 ${pDifficulty === d ? 'bg-white border-white' : 'border-gray-400'}`}></span>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time taken */}
                <div className="mb-5">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Select Time Taken (in sec)</div>
                  <div className="flex gap-2 flex-wrap">
                    {['All', '0-30', '30-60', '60+'].map(t => (
                      <button key={t} onClick={() => { setPTimeTaken(t); setPPage(1) }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                          pTimeTaken === t ? 'bg-purple-700 text-white border-purple-700' : 'border-gray-300 text-gray-600 hover:border-purple-400'
                        }`}>
                        <span className={`w-3 h-3 rounded-full border-2 ${pTimeTaken === t ? 'bg-white border-white' : 'border-gray-400'}`}></span>
                        {t === '60+' ? 'More than 60' : t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Topic */}
                <div className="mb-5">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Select Topic</div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {pTopics.map(t => (
                      <button key={t} onClick={() => { setPTopic(t); setPPage(1) }}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                          pTopic === t ? 'bg-red-50 border-red-300 text-red-700 font-medium' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={resetParallelFilters}
                  className="w-full py-2 bg-purple-700 text-white rounded-lg text-sm font-medium hover:bg-purple-800">
                  Reset
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
