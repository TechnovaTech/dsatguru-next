'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../../../components/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import {
  FiArrowLeft, FiUser, FiAlertCircle, FiBarChart2,
  FiXCircle, FiClock, FiChevronDown, FiFilter, FiX, FiCheck
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

  // Esc closes the mistakes modal / filter panel
  useEffect(() => {
    if (!modalTopic && !showFilters) return
    const onKey = (e) => {
      if (e.key === 'Escape') { setModalTopic(null); setShowFilters(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalTopic, showFilters])

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
  const formatDate = (d) => d ? new Date(d).toLocaleString() : '—'

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
        <span className="text-sm text-slate-400">Loading performance data...</span>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-100 bg-white px-8 py-10 text-center shadow-sm">
        <FiAlertCircle className="h-10 w-10 text-red-500" />
        <p className="text-sm font-medium text-slate-600">{error}</p>
        <button
          onClick={fetchPerformance}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          Try again
        </button>
      </div>
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

  const diffBadge = (d) =>
    d === 'Hard' ? 'bg-red-100 text-red-700' :
    d === 'Medium' ? 'bg-amber-100 text-amber-700' :
    'bg-emerald-100 text-emerald-700'

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Back */}
        <button onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">
          <FiArrowLeft /> Back
        </button>

        {/* Student header */}
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiUser className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
                {student?.name || 'Unknown'}
              </h1>
              <p className="text-sm text-slate-500">{student?.email || '—'}</p>
            </div>
          </div>
          <div className="flex gap-3 lg:ml-auto">
            <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50 px-5 py-3 text-center lg:flex-none">
              <div className="text-2xl font-bold text-slate-800">{totalQuestions ?? 0}</div>
              <div className="mt-0.5 text-xs text-slate-500">Total Questions</div>
            </div>
            <div className="flex-1 rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-3 text-center lg:flex-none">
              <div className="text-2xl font-bold text-emerald-600">{totalCorrect ?? 0}</div>
              <div className="mt-0.5 text-xs text-slate-500">Correct</div>
            </div>
            <div className="flex-1 rounded-xl border border-indigo-100 bg-indigo-50 px-5 py-3 text-center lg:flex-none">
              <div className="text-2xl font-bold text-indigo-600">{overallAccuracy ?? 0}%</div>
              <div className="mt-0.5 text-xs text-slate-500">Accuracy</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          {[
            { key: 'mistakes', label: 'Mistake Analysis', icon: <FiXCircle /> },
            { key: 'parallel', label: 'Parallel Analysis', icon: <FiBarChart2 /> }
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── MISTAKE ANALYSIS TAB ── */}
        {activeTab === 'mistakes' && (
          <div>
            {/* Filters */}
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <FiFilter /> Subject:
              </div>
              {subjects.map(s => (
                <button key={s} onClick={() => setSubjectFilter(s)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    subjectFilter === s
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-400'
                  }`}>
                  {s === 'Reading and Writing' ? 'R&W' : s}
                </button>
              ))}
            </div>

            {/* Stats bar */}
            <div className="mb-4 grid grid-cols-3 divide-x divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="px-8 py-5 text-center">
                <div className="text-3xl font-bold text-slate-900">{filteredTotal}</div>
                <div className="mt-1 text-sm text-slate-500">Total Questions</div>
              </div>
              <div className="px-8 py-5 text-center">
                <div className="text-3xl font-bold text-emerald-600">{filteredCorrect}</div>
                <div className="mt-1 text-sm text-slate-500">Correct Questions</div>
              </div>
              <div className="px-8 py-5 text-center">
                <div className="text-3xl font-bold text-indigo-600">{filteredAccuracy}%</div>
                <div className="mt-1 text-sm text-slate-500">Accuracy</div>
              </div>
            </div>

            {/* Topic table */}
            {filteredRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
                <FiBarChart2 className="h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">No data available for this filter.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="border-b border-slate-100 bg-slate-50">
                      <tr>
                        <th className="w-8 px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">#</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Topic</th>
                        <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Total Qs</th>
                        <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Correct Qs</th>
                        <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Avg Mistakes</th>
                        <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Accuracy</th>
                        <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.map((row, idx) => (
                        <tr key={row.topic} className="transition-colors hover:bg-indigo-50/40">
                          <td className="px-6 py-4 text-sm text-slate-400">{idx + 1}</td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-slate-900">{row.topic || '—'}</div>
                            <div className="text-xs text-slate-400">
                              {row.subject === 'Reading and Writing' ? 'R&W' : (row.subject || '—')}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-medium text-slate-700">{row.total}</td>
                          <td className="px-6 py-4 text-center text-sm font-medium text-emerald-600">{row.correct}</td>
                          <td className="px-6 py-4 text-center text-sm font-medium text-red-500">{row.avgMistakes}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`text-sm font-semibold ${
                              row.accuracy >= 80 ? 'text-emerald-600' :
                              row.accuracy >= 50 ? 'text-amber-600' : 'text-red-600'
                            }`}>{row.accuracy}%</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {row.mistakes.length > 0 ? (
                              <button
                                onClick={() => setModalTopic(row)}
                                className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-200"
                              >
                                {row.wrong} wrong <FiChevronDown />
                              </button>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Mistakes Modal */}
            {modalTopic && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
                onClick={() => setModalTopic(null)}
                role="dialog"
                aria-modal="true"
              >
                <div
                  className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal header */}
                  <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{modalTopic.topic || '—'}</h2>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {modalTopic.wrong} wrong out of {modalTopic.total} questions
                        {' · '}{modalTopic.subject === 'Reading and Writing' ? 'R&W' : (modalTopic.subject || '—')}
                      </p>
                    </div>
                    <button
                      onClick={() => setModalTopic(null)}
                      className="text-slate-400 transition-colors hover:text-slate-600"
                      aria-label="Close"
                    >
                      <FiX className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Scrollable question list */}
                  <div className="flex-1 space-y-5 overflow-y-auto p-6">
                    {modalTopic.mistakes.map((m, mi) => (
                      <div key={mi} className="rounded-xl border border-slate-200 p-4">
                        {/* Meta tags */}
                        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                            {m.subject === 'Reading and Writing' ? 'R&W' : (m.subject || '—')}
                          </span>
                          {m.subtopic && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">{m.subtopic}</span>
                          )}
                          <span className={`rounded-full px-2.5 py-1 font-medium ${diffBadge(m.difficulty)}`}>
                            {m.difficulty || '—'}
                          </span>
                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700">{m.sessionType || 'Practice'}</span>
                          {m.timeSpent > 0 && (
                            <span className="flex items-center gap-1 text-slate-400"><FiClock />{formatTime(m.timeSpent)}</span>
                          )}
                          <span className="text-slate-400">{m.testTitle || 'Self Practice'} — {formatDate(m.completedAt)}</span>
                        </div>

                        {/* Question number */}
                        <div className="mb-1 text-xs font-semibold text-indigo-600">Q{mi + 1}</div>

                        {/* Question text */}
                        <p className="mb-3 text-sm font-medium leading-relaxed text-slate-900">{m.question || '—'}</p>

                        {/* Options (MCQ) */}
                        {Array.isArray(m.options) && m.options.length > 0 ? (
                          <div className="mb-3 grid grid-cols-1 gap-2">
                            {m.options.map((opt, oi) => {
                              const label = String.fromCharCode(65 + oi)
                              const isCorrect = opt === m.correctAnswer || label === m.correctAnswer
                              const isSelected = opt === m.selectedAnswer || label === m.selectedAnswer
                              return (
                                <div key={oi} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                                  isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-800' :
                                  isSelected ? 'border-red-300 bg-red-50 text-red-800' :
                                  'border-slate-200 bg-slate-50 text-slate-700'
                                }`}>
                                  <span className="w-5 flex-shrink-0 font-semibold">{label}.</span>
                                  <span className="flex-1">{opt}</span>
                                  {isCorrect && <FiCheck className="font-bold text-emerald-600" />}
                                  {isSelected && !isCorrect && <FiX className="font-bold text-red-600" />}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          /* Fill-in-blank */
                          <div className="mb-3 flex gap-3 text-sm">
                            <div className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                              <span className="mb-0.5 block text-xs text-slate-500">Student answered</span>
                              <span className="font-semibold text-red-700">{m.selectedAnswer || 'No answer'}</span>
                            </div>
                            <div className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                              <span className="mb-0.5 block text-xs text-slate-500">Correct answer</span>
                              <span className="font-semibold text-emerald-700">{m.correctAnswer ?? '—'}</span>
                            </div>
                          </div>
                        )}

                        {/* Explanation */}
                        {m.explanation && (
                          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-800">
                            <span className="font-semibold">Explanation: </span>{m.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex-shrink-0 border-t border-slate-100 bg-slate-50 px-6 py-3">
                    <button
                      onClick={() => setModalTopic(null)}
                      className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
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
          <div className="relative flex gap-4">
            {/* Main content */}
            <div className="min-w-0 flex-1">
              {/* Active filter chips */}
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <span className="text-sm font-medium text-slate-600">Selected Filters:</span>
                {[
                  { label: pSubject === 'All' ? 'All Tests' : (pSubject === 'Reading and Writing' ? 'R&W' : pSubject), key: 'subject' },
                  { label: pViewType === 'All' ? 'All Questions' : pViewType, key: 'view' },
                  ...(pTopic !== 'All' ? [{ label: pTopic, key: 'topic' }] : []),
                  ...(pDifficulty !== 'All' ? [{ label: pDifficulty, key: 'diff' }] : []),
                  ...(pTimeTaken !== 'All' ? [{ label: `${pTimeTaken}s`, key: 'time' }] : []),
                ].map(chip => (
                  <span key={chip.key} className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white">
                    {chip.label}
                  </span>
                ))}
                <button
                  onClick={() => setShowFilters(true)}
                  className="ml-auto rounded-full border border-indigo-300 px-4 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-50"
                >
                  More Filters
                </button>
              </div>

              {/* Pagination */}
              {parallelFiltered.length > 0 && (
                <div className="mb-4 flex items-center gap-1">
                  <button onClick={() => setPPage(p => Math.max(1, p - 1))}
                    disabled={pPage === 1}
                    className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30">‹</button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const pg = i + 1
                    return (
                      <button key={pg} onClick={() => setPPage(pg)}
                        className={`flex h-8 w-8 items-center justify-center rounded border text-sm font-medium ${
                          pPage === pg ? 'border-indigo-400 bg-indigo-100 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}>{pg}</button>
                    )
                  })}
                  {totalPages > 7 && <span className="px-1 text-slate-400">…</span>}
                  {totalPages > 7 && (
                    <button onClick={() => setPPage(totalPages)}
                      className={`flex h-8 w-8 items-center justify-center rounded border text-sm font-medium ${
                        pPage === totalPages ? 'border-indigo-400 bg-indigo-100 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}>{totalPages}</button>
                  )}
                  <button onClick={() => setPPage(p => Math.min(totalPages, p + 1))}
                    disabled={pPage === totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30">›</button>
                  <span className="ml-2 text-xs text-slate-400">{parallelFiltered.length} questions</span>
                </div>
              )}

              {/* Question list */}
              {pagedQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
                  <FiFilter className="h-10 w-10 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">No questions match the selected filters.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pagedQuestions.map((q, idx) => {
                    const globalIdx = (pPage - 1) * PAGE_SIZE + idx + 1
                    return (
                      <div key={idx} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                        {/* Meta row */}
                        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                          <span className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 font-bold text-slate-700">{globalIdx}</span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">{q.isMCQ ? 'MCQ' : 'Fill-in'}</span>
                          <span className={`rounded-full px-2.5 py-1 font-medium ${q.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {q.isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                            {q.subject === 'Reading and Writing' ? 'R&W' : (q.subject || '—')}
                          </span>
                          {q.topic && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">{q.topic}</span>
                          )}
                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700">{q.sessionType || 'Practice'}</span>
                          {q.timeSpent > 0 && (
                            <span className="flex items-center gap-1 text-slate-500"><FiClock />{formatTime(q.timeSpent)}</span>
                          )}
                          <span className={`rounded-full px-2.5 py-1 font-medium ${diffBadge(q.difficulty)}`}>{q.difficulty || '—'}</span>
                          <span className="text-slate-400">{q.testTitle || 'Self Practice'}</span>
                          <span className="text-slate-400">{formatDate(q.completedAt)}</span>
                        </div>

                        {/* Question */}
                        <div className="mb-1 text-xs font-semibold text-slate-400">Question</div>
                        <p className="mb-4 text-sm font-medium leading-relaxed text-slate-900">{q.question || '—'}</p>

                        {/* Options */}
                        {q.isMCQ ? (
                          <>
                            <div className="mb-2 text-xs font-semibold text-slate-400">Options</div>
                            <div className="grid grid-cols-1 gap-2">
                              {q.options.map((opt, oi) => {
                                const label = String.fromCharCode(65 + oi)
                                const isCorrect = opt === q.correctAnswer || label === q.correctAnswer
                                const isSelected = opt === q.selectedAnswer || label === q.selectedAnswer
                                return (
                                  <div key={oi} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                                    isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-800' :
                                    isSelected ? 'border-red-300 bg-red-50 text-red-800' :
                                    'border-slate-200 bg-slate-50 text-slate-700'
                                  }`}>
                                    <span className="w-5 flex-shrink-0 font-semibold">{label}.</span>
                                    <span className="flex-1">{opt}</span>
                                    {isCorrect && <FiCheck className="font-bold text-emerald-600" />}
                                    {isSelected && !isCorrect && <FiX className="font-bold text-red-600" />}
                                  </div>
                                )
                              })}
                            </div>
                          </>
                        ) : (
                          <div className="flex gap-3 text-sm">
                            <div className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                              <span className="mb-0.5 block text-xs text-slate-400">Student answered</span>
                              <span className="font-semibold text-red-700">{q.selectedAnswer || 'No answer'}</span>
                            </div>
                            <div className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                              <span className="mb-0.5 block text-xs text-slate-400">Correct answer</span>
                              <span className="font-semibold text-emerald-700">{q.correctAnswer ?? '—'}</span>
                            </div>
                          </div>
                        )}

                        {q.explanation && (
                          <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-800">
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
              <div className="sticky top-6 h-fit w-80 flex-shrink-0 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">More Filters</h3>
                  <button onClick={() => setShowFilters(false)} className="text-slate-400 transition-colors hover:text-slate-600" aria-label="Close">
                    <FiX className="h-5 w-5" />
                  </button>
                </div>

                {/* Subject */}
                <div className="mb-5">
                  <div className="mb-2 text-xs font-semibold text-slate-700">Select Subject <span className="text-red-500">*</span></div>
                  <div className="flex flex-wrap gap-2">
                    {pSubjects.map(s => (
                      <button key={s} onClick={() => { setPSubject(s); setPPage(1) }}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                          pSubject === s ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 text-slate-600 hover:border-indigo-400'
                        }`}>
                        <span className={`h-3 w-3 rounded-full border-2 ${pSubject === s ? 'border-white bg-white' : 'border-slate-400'}`}></span>
                        {s === 'Reading and Writing' ? 'R&W' : s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* View type */}
                <div className="mb-5">
                  <div className="mb-2 text-xs font-semibold text-slate-700">Select View type</div>
                  <div className="flex flex-wrap gap-2">
                    {['All', 'Mistakes Only', 'Correct Only'].map(v => (
                      <button key={v} onClick={() => { setPViewType(v); setPPage(1) }}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                          pViewType === v ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 text-slate-600 hover:border-indigo-400'
                        }`}>
                        <span className={`h-3 w-3 rounded-full border-2 ${pViewType === v ? 'border-white bg-white' : 'border-slate-400'}`}></span>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div className="mb-5">
                  <div className="mb-2 text-xs font-semibold text-slate-700">Select Difficulty</div>
                  <div className="flex flex-wrap gap-2">
                    {['All', 'Easy', 'Medium', 'Hard'].map(d => (
                      <button key={d} onClick={() => { setPDifficulty(d); setPPage(1) }}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                          pDifficulty === d ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 text-slate-600 hover:border-indigo-400'
                        }`}>
                        <span className={`h-3 w-3 rounded-full border-2 ${pDifficulty === d ? 'border-white bg-white' : 'border-slate-400'}`}></span>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time taken */}
                <div className="mb-5">
                  <div className="mb-2 text-xs font-semibold text-slate-700">Select Time Taken (in sec)</div>
                  <div className="flex flex-wrap gap-2">
                    {['All', '0-30', '30-60', '60+'].map(t => (
                      <button key={t} onClick={() => { setPTimeTaken(t); setPPage(1) }}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                          pTimeTaken === t ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 text-slate-600 hover:border-indigo-400'
                        }`}>
                        <span className={`h-3 w-3 rounded-full border-2 ${pTimeTaken === t ? 'border-white bg-white' : 'border-slate-400'}`}></span>
                        {t === '60+' ? 'More than 60' : t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Topic */}
                <div className="mb-5">
                  <div className="mb-2 text-xs font-semibold text-slate-700">Select Topic</div>
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {pTopics.map(t => (
                      <button key={t} onClick={() => { setPTopic(t); setPPage(1) }}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                          pTopic === t ? 'border-indigo-300 bg-indigo-50 font-medium text-indigo-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}>
                        {t === 'Reading and Writing' ? 'R&W' : t}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={resetParallelFilters}
                  className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700">
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
