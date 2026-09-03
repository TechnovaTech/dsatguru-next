'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../../../../components/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import {
  FiArrowLeft, FiUser, FiAlertCircle, FiBarChart2,
  FiXCircle, FiClock, FiChevronDown, FiFilter, FiTarget
} from 'react-icons/fi'
// Maps an answer (letter, "B) 240"-style key, or option text — any casing) to its option letter.
import { resolveAnswerLetter } from '../../../../../../lib/scoring/satScale'
// LaTeX + markdown images (incl. data-URI figures) + tables + <u> — same renderer as the exam views.
import { renderContent, renderLatex } from '../../../../../components/admin/LatexRenderer'
// Shared College-Board-aligned topic/subtopic breakdown, identical on every analysis screen.
import SatScoreAnalysis from '../../../../../components/SatScoreAnalysis'

export default function AdminStudentPerformancePage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const studentId = params.id

  const [activeTab, setActiveTab] = useState('topics')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [subjectFilter, setSubjectFilter] = useState('All')
  const [modalTopic, setModalTopic] = useState(null)

  const [pSubject, setPSubject] = useState('All')
  const [pViewType, setPViewType] = useState('All')
  const [pDifficulty, setPDifficulty] = useState('All')
  const [pTimeTaken, setPTimeTaken] = useState('All')
  const [pTopic, setPTopic] = useState('All')
  const [showFilters, setShowFilters] = useState(false)
  const [pPage, setPPage] = useState(1)
  const PAGE_SIZE = 10

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-rose-600"><FiAlertCircle />{error}</div>
    </div>
  )

  const { student, topicRows = [], totalQuestions, totalCorrect, overallAccuracy, allQuestions = [] } = data || {}
  const subjects = ['All', ...new Set(topicRows.map(r => r.subject))]
  const filteredRows = subjectFilter === 'All' ? topicRows : topicRows.filter(r => r.subject === subjectFilter)
  const filteredTotal = filteredRows.reduce((s, r) => s + r.total, 0)
  const filteredCorrect = filteredRows.reduce((s, r) => s + r.correct, 0)
  const filteredAccuracy = filteredTotal > 0 ? ((filteredCorrect / filteredTotal) * 100).toFixed(2) : '0.00'

  const pSubjects = ['All', ...new Set(allQuestions.map(q => q.subject))]
  const pTopics = ['All', ...new Set(allQuestions.map(q => q.topic))]

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
    setPSubject('All'); setPViewType('All'); setPDifficulty('All'); setPTimeTaken('All'); setPTopic('All'); setPPage(1)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900">
          <FiArrowLeft /> Back
        </button>

        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
            <FiUser className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">{student?.name}</h1>
            <p className="text-sm text-slate-500">{student?.email}</p>
          </div>
          <div className="ml-auto flex gap-4 text-center">
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-5 py-3">
              <div className="text-2xl font-bold text-slate-800">{totalQuestions || 0}</div>
              <div className="mt-0.5 text-xs text-slate-500">Total Questions</div>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-5 py-3">
              <div className="text-2xl font-bold text-emerald-600">{totalCorrect || 0}</div>
              <div className="mt-0.5 text-xs text-slate-500">Correct</div>
            </div>
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-5 py-3">
              <div className="text-2xl font-bold text-indigo-600">{overallAccuracy || 0}%</div>
              <div className="mt-0.5 text-xs text-slate-500">Accuracy</div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex gap-2">
          {[{ key: 'topics', label: 'SAT Score Analysis', icon: <FiTarget /> }, { key: 'mistakes', label: 'Mistake Analysis', icon: <FiXCircle /> }, { key: 'parallel', label: 'Parallel Analysis', icon: <FiBarChart2 /> }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'topics' && (
          <SatScoreAnalysis
            rows={allQuestions}
            subtitle={`Every question ${student?.name || 'this student'} has answered, by Subject, Content Domain & Skill (College Board aligned)`}
          />
        )}

        {activeTab === 'mistakes' && (
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600"><FiFilter /> Subject:</div>
              {subjects.map(s => (
                <button key={s} onClick={() => setSubjectFilter(s)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${subjectFilter === s ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-400'}`}>
                  {s === 'Reading and Writing' ? 'R&W' : s}
                </button>
              ))}
            </div>
            <div className="mb-4 grid grid-cols-3 divide-x divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="px-8 py-5 text-center"><div className="text-3xl font-bold text-slate-900">{filteredTotal}</div><div className="mt-1 text-sm text-slate-500">Total Questions</div></div>
              <div className="px-8 py-5 text-center"><div className="text-3xl font-bold text-emerald-600">{filteredCorrect}</div><div className="mt-1 text-sm text-slate-500">Correct Questions</div></div>
              <div className="px-8 py-5 text-center"><div className="text-3xl font-bold text-indigo-600">{filteredAccuracy}%</div><div className="mt-1 text-sm text-slate-500">Accuracy</div></div>
            </div>
            {filteredRows.length === 0 ? (
              <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiBarChart2 size={22} /></div>
                <p className="text-sm font-medium text-slate-500">No data available.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="w-8 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Topic</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Total Qs</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Correct Qs</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Avg Mistakes</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Accuracy</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.map((row, idx) => (
                        <tr key={row.topic} className="transition-colors hover:bg-indigo-50/40">
                          <td className="px-4 py-3 text-sm text-slate-500">{idx + 1}</td>
                          <td className="px-4 py-3"><div className="text-sm font-medium text-slate-900">{row.topic}</div><div className="text-xs text-slate-400">{row.subject}</div></td>
                          <td className="px-4 py-3 text-center text-sm font-medium text-slate-700">{row.total}</td>
                          <td className="px-4 py-3 text-center text-sm font-medium text-emerald-600">{row.correct}</td>
                          <td className="px-4 py-3 text-center text-sm font-medium text-rose-500">{row.avgMistakes}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-sm font-semibold ${row.accuracy >= 80 ? 'text-emerald-600' : row.accuracy >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{row.accuracy}%</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.mistakes.length > 0 ? (
                              <button onClick={() => setModalTopic(row)} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100">
                                {row.wrong} wrong <FiChevronDown />
                              </button>
                            ) : <span className="text-xs text-slate-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {modalTopic && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setModalTopic(null)}>
                <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div><h2 className="text-lg font-bold text-slate-900">{modalTopic.topic}</h2><p className="mt-0.5 text-sm text-slate-500">{modalTopic.wrong} wrong out of {modalTopic.total} questions</p></div>
                    <button onClick={() => setModalTopic(null)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-xl font-bold text-slate-500 hover:bg-slate-100">×</button>
                  </div>
                  <div className="flex-1 space-y-5 overflow-y-auto p-6">
                    {modalTopic.mistakes.map((m, mi) => (
                      <div key={mi} className="rounded-xl border border-slate-200 p-4">
                        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{m.subject}</span>
                          <span className={`rounded-full px-2 py-0.5 ${m.difficulty === 'Hard' ? 'bg-rose-100 text-rose-700' : m.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{m.difficulty}</span>
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">{m.sessionType}</span>
                          {m.timeSpent > 0 && <span className="flex items-center gap-1 text-slate-400"><FiClock />{formatTime(m.timeSpent)}</span>}
                          <span className="text-slate-400">{m.testTitle || 'Untitled Test'} — {formatDate(m.completedAt)}</span>
                        </div>
                        <div className="mb-1 text-xs font-semibold text-indigo-600">Q{mi + 1}</div>
                        <div className="mb-3 text-sm font-medium leading-relaxed text-slate-900">{renderContent(m.question)}</div>
                        {Array.isArray(m.options) && m.options.length > 0 ? (
                          <div className="mb-3 grid grid-cols-1 gap-2">
                            {m.options.map((opt, oi) => {
                              const label = String.fromCharCode(65 + oi)
                              const isCorrect = opt === m.correctAnswer || label === m.correctAnswer
                              const isSelected = opt === m.selectedAnswer || label === m.selectedAnswer
                              return (
                                <div key={oi} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : isSelected ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                                  <span className="w-5 flex-shrink-0 font-semibold">{label}.</span>
                                  <div className="flex-1">{renderContent(opt)}</div>
                                  {isCorrect && <span className="font-bold text-emerald-600">✓</span>}
                                  {isSelected && !isCorrect && <span className="font-bold text-rose-600">✗</span>}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="mb-3 flex gap-3 text-sm">
                            <div className="flex-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2"><span className="mb-0.5 block text-xs text-slate-500">Student answered</span><span className="font-semibold text-rose-700">{m.selectedAnswer ? renderLatex(String(m.selectedAnswer)) : 'No answer'}</span></div>
                            <div className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"><span className="mb-0.5 block text-xs text-slate-500">Correct answer</span><span className="font-semibold text-emerald-700">{renderLatex(String(m.correctAnswer ?? ''))}</span></div>
                          </div>
                        )}
                        {m.explanation && <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-800"><span className="font-semibold">Explanation: </span>{renderContent(m.explanation)}</div>}
                      </div>
                    ))}
                  </div>
                  <div className="flex-shrink-0 border-t border-slate-100 bg-slate-50 px-6 py-3">
                    <button onClick={() => setModalTopic(null)} className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700">Close</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'parallel' && (
          <div className="flex gap-4 relative">
            <div className="flex-1 min-w-0">
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <span className="text-sm font-medium text-slate-600">Selected Filters:</span>
                {[
                  { label: pSubject === 'All' ? 'All Tests' : pSubject, key: 'subject' },
                  { label: pViewType === 'All' ? 'All Questions' : pViewType, key: 'view' },
                  ...(pTopic !== 'All' ? [{ label: pTopic, key: 'topic' }] : []),
                  ...(pDifficulty !== 'All' ? [{ label: pDifficulty, key: 'diff' }] : []),
                  ...(pTimeTaken !== 'All' ? [{ label: `${pTimeTaken}s`, key: 'time' }] : []),
                ].map(chip => (
                  <span key={chip.key} className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white">● {chip.label} ▾</span>
                ))}
                <button onClick={() => setShowFilters(true)} className="ml-auto rounded-full border border-indigo-300 px-4 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50">More Filters</button>
              </div>

              {parallelFiltered.length > 0 && (
                <div className="mb-4 flex items-center gap-1">
                  <button onClick={() => setPPage(p => Math.max(1, p - 1))} disabled={pPage === 1} className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 text-slate-500 hover:bg-slate-100 disabled:opacity-30">‹</button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(pg => (
                    <button key={pg} onClick={() => setPPage(pg)} className={`flex h-8 w-8 items-center justify-center rounded border text-sm font-medium ${pPage === pg ? 'border-indigo-400 bg-indigo-100 text-indigo-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}>{pg}</button>
                  ))}
                  {totalPages > 7 && <><span className="px-1 text-slate-400">…</span><button onClick={() => setPPage(totalPages)} className={`flex h-8 w-8 items-center justify-center rounded border text-sm font-medium ${pPage === totalPages ? 'border-indigo-400 bg-indigo-100 text-indigo-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}>{totalPages}</button></>}
                  <button onClick={() => setPPage(p => Math.min(totalPages, p + 1))} disabled={pPage === totalPages} className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 text-slate-500 hover:bg-slate-100 disabled:opacity-30">›</button>
                  <span className="ml-2 text-xs text-slate-400">{parallelFiltered.length} questions</span>
                </div>
              )}

              {pagedQuestions.length === 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiBarChart2 size={22} /></div>
                  <p className="text-sm font-medium text-slate-500">No questions match the selected filters.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pagedQuestions.map((q, idx) => {
                    const globalIdx = (pPage - 1) * PAGE_SIZE + idx + 1
                    return (
                      <div key={idx} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                          <span className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 font-bold text-slate-700">{globalIdx}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{q.isMCQ ? 'MCQ' : 'Fill-in'}</span>
                          <span className={`rounded-full px-2 py-0.5 font-medium ${q.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{q.isCorrect ? 'Correct' : 'Incorrect'}</span>
                          {q.timeSpent > 0 && <span className="flex items-center gap-1 text-slate-500"><FiClock />{formatTime(q.timeSpent)}</span>}
                          <span className="text-slate-400">Difficulty - {q.difficulty}</span>
                          <span className="text-slate-400">{q.testTitle || 'Untitled Test'}</span>
                          <span className="text-slate-400">{formatDate(q.completedAt)}</span>
                        </div>
                        <div className="mb-1 text-xs font-semibold text-slate-400">Question</div>
                        <div className="mb-4 text-sm font-medium leading-relaxed text-slate-900">{renderContent(q.question)}</div>
                        {q.isMCQ ? (
                          <>
                            <div className="mb-2 text-xs font-semibold text-slate-400">Options</div>
                            <div className="grid grid-cols-1 gap-2">
                              {q.options.map((opt, oi) => {
                                const label = String.fromCharCode(65 + oi)
                                const isCorrect = resolveAnswerLetter(q.correctAnswer, q.options) === label
                                const isSelected = resolveAnswerLetter(q.selectedAnswer, q.options) === label
                                return (
                                  <div key={oi} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : isSelected ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                                    <span className="w-5 flex-shrink-0 font-semibold">{label}.</span>
                                    <div className="flex-1">{renderContent(opt)}</div>
                                    {isCorrect && <span className="font-bold text-emerald-600">✓</span>}
                                    {isSelected && !isCorrect && <span className="font-bold text-rose-600">✗</span>}
                                  </div>
                                )
                              })}
                            </div>
                          </>
                        ) : (
                          <div className="flex gap-3 text-sm">
                            <div className="flex-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2"><span className="mb-0.5 block text-xs text-slate-400">Student answered</span><span className="font-semibold text-rose-700">{q.selectedAnswer ? renderLatex(String(q.selectedAnswer)) : 'No answer'}</span></div>
                            <div className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"><span className="mb-0.5 block text-xs text-slate-400">Correct answer</span><span className="font-semibold text-emerald-700">{renderLatex(String(q.correctAnswer ?? ''))}</span></div>
                          </div>
                        )}
                        {q.explanation && <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-800"><span className="font-semibold">Explanation: </span>{renderContent(q.explanation)}</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {showFilters && (
              <div className="sticky top-6 h-fit w-80 flex-shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">More Filters</h3>
                  <button onClick={() => setShowFilters(false)} aria-label="Close" className="text-xl font-bold text-slate-400 hover:text-slate-600">×</button>
                </div>
                <div className="mb-5">
                  <div className="mb-2 text-xs font-semibold text-slate-700">Select Subject <span className="text-rose-500">*</span></div>
                  <div className="flex flex-wrap gap-2">
                    {pSubjects.map(s => (
                      <button key={s} onClick={() => { setPSubject(s); setPPage(1) }} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${pSubject === s ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 text-slate-600 hover:border-indigo-400'}`}>
                        <span className={`h-3 w-3 rounded-full border-2 ${pSubject === s ? 'border-white bg-white' : 'border-slate-400'}`}></span>
                        {s === 'Reading and Writing' ? 'R&W' : s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-5">
                  <div className="mb-2 text-xs font-semibold text-slate-700">Select View type</div>
                  <div className="flex flex-wrap gap-2">
                    {['All', 'Mistakes Only', 'Correct Only'].map(v => (
                      <button key={v} onClick={() => { setPViewType(v); setPPage(1) }} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${pViewType === v ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 text-slate-600 hover:border-indigo-400'}`}>
                        <span className={`h-3 w-3 rounded-full border-2 ${pViewType === v ? 'border-white bg-white' : 'border-slate-400'}`}></span>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-5">
                  <div className="mb-2 text-xs font-semibold text-slate-700">Select Difficulty</div>
                  <div className="flex flex-wrap gap-2">
                    {['All', 'Easy', 'Medium', 'Hard'].map(d => (
                      <button key={d} onClick={() => { setPDifficulty(d); setPPage(1) }} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${pDifficulty === d ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 text-slate-600 hover:border-indigo-400'}`}>
                        <span className={`h-3 w-3 rounded-full border-2 ${pDifficulty === d ? 'border-white bg-white' : 'border-slate-400'}`}></span>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-5">
                  <div className="mb-2 text-xs font-semibold text-slate-700">Select Time Taken (in sec)</div>
                  <div className="flex flex-wrap gap-2">
                    {['All', '0-30', '30-60', '60+'].map(t => (
                      <button key={t} onClick={() => { setPTimeTaken(t); setPPage(1) }} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${pTimeTaken === t ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 text-slate-600 hover:border-indigo-400'}`}>
                        <span className={`h-3 w-3 rounded-full border-2 ${pTimeTaken === t ? 'border-white bg-white' : 'border-slate-400'}`}></span>
                        {t === '60+' ? 'More than 60' : t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-5">
                  <div className="mb-2 text-xs font-semibold text-slate-700">Select Topic</div>
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {pTopics.map(t => (
                      <button key={t} onClick={() => { setPTopic(t); setPPage(1) }} className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${pTopic === t ? 'border-indigo-300 bg-indigo-50 font-medium text-indigo-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{t}</button>
                    ))}
                  </div>
                </div>
                <button onClick={resetParallelFilters} className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700">Reset</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
