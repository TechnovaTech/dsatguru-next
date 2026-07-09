'use client'
import { useState, useEffect, useRef } from 'react'
import { renderContent } from '../../components/admin/LatexRenderer'
// Same grading logic the server uses: resolve any stored answer shape (bare letter,
// "B) 240"-style key, or option text) to its option LETTER, and match by letter.
import { answersMatch, resolveAnswerLetter } from '../../../lib/scoring/satScale'
import { FiClock, FiCheckCircle, FiXCircle, FiArrowRight, FiArrowLeft, FiX, FiRefreshCw, FiInbox, FiPlay, FiAlertCircle, FiChevronDown, FiChevronUp, FiBookOpen } from 'react-icons/fi'

const token = () => typeof window !== 'undefined' ? localStorage.getItem('token') : ''

// The redo API sends MCQ options as [{ key, value }]. Fold them into an { A, B, C, D }
// object so the scoring helpers (which expect a question-style options shape) can resolve
// the correct letter. Fill-in-the-blank questions have no options and yield all-blank.
const optionsToObject = (options) => {
  const obj = { A: '', B: '', C: '', D: '' }
  ;(options || []).forEach(o => { if (o && o.key) obj[o.key] = o.value })
  return obj
}

const sectionBadge = (section) => {
  const s = (section || '').toLowerCase()
  if (s.includes('math')) return 'bg-indigo-100 text-indigo-700'
  if (s.includes('read') || s.includes('writing') || s.includes('verbal') || s.includes('english')) return 'bg-violet-100 text-violet-700'
  return 'bg-slate-100 text-slate-600'
}

const difficultyClass = (d) => {
  if (d === 'H' || d === 'Hard') return 'text-rose-600'
  if (d === 'M' || d === 'Medium') return 'text-amber-600'
  if (d === 'E' || d === 'Easy' || d === 'L' || d === 'Low') return 'text-emerald-600'
  return 'text-slate-600'
}

const statusBadge = (status) => status === 'Failed'
  ? 'bg-rose-100 text-rose-700'
  : 'bg-amber-100 text-amber-700'

export default function RedoQueuePage() {
  const [dateGroups, setDateGroups] = useState([])
  const [allQuestions, setAllQuestions] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [questions, setQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [mode, setMode] = useState('list') // list | test | result
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [showReview, setShowReview] = useState(false)
  const [showStartPopup, setShowStartPopup] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const testContainerRef = useRef(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [datesRes, allRes] = await Promise.all([
        fetch('/api/redo-queue?mode=dates', { headers: { Authorization: `Bearer ${token()}` } }),
        fetch('/api/redo-queue?mode=all', { headers: { Authorization: `Bearer ${token()}` } })
      ])

      if (!datesRes.ok || !allRes.ok) {
        setError("Couldn't load your redo queue.")
        return
      }

      const datesData = await datesRes.json()
      const allData = await allRes.json()

      setDateGroups(datesData.dates || [])
      setAllQuestions(allData.questions || [])

      if (allData.questions?.length > 0) {
        setShowStartPopup(true)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setError("Couldn't load your redo queue.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    let timer
    if (mode === 'test' && !submitting) {
      timer = setInterval(() => {
        setTimeElapsed(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [mode, submitting])

  // Close start popup on Escape
  useEffect(() => {
    if (!showStartPopup) return
    const onKey = (e) => { if (e.key === 'Escape') setShowStartPopup(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showStartPopup])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startRedoByDate = async (date) => {
    setLoading(true)
    setSelectedDate(date)
    try {
      const url = `/api/redo-queue?mode=questions&date=${encodeURIComponent(date)}`
      const qRes = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } })
      const data = await qRes.json()
      const loadedQuestions = data.questions || []

      setQuestions(loadedQuestions)
      setAnswers({})
      setCurrentQuestionIndex(0)
      setResult(null)
      setShowReview(false)
      setTimeElapsed(0)
      setMode('test')
      enterFullscreen()
    } catch (error) {
      console.error('Error starting redo:', error)
    } finally {
      setLoading(false)
      setShowStartPopup(false)
    }
  }

  const enterFullscreen = () => {
    if (testContainerRef.current) {
      if (testContainerRef.current.requestFullscreen) {
        testContainerRef.current.requestFullscreen()
      } else if (testContainerRef.current.webkitRequestFullscreen) {
        testContainerRef.current.webkitRequestFullscreen()
      } else if (testContainerRef.current.msRequestFullscreen) {
        testContainerRef.current.msRequestFullscreen()
      }
      setIsFullscreen(true)
    }
  }

  const exitFullscreen = () => {
    const isFull = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    if (!isFull) return;

    if (document.exitFullscreen) {
      document.exitFullscreen()
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen()
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen()
    }
    setIsFullscreen(false)
  }

  const submitRedo = async () => {
    if (!selectedDate || questions.length === 0) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/redo-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ date: selectedDate, answers })
      })
      const data = await res.json()
      setResult(data)
      setMode('result')
      exitFullscreen()

      const listRes = await fetch('/api/redo-queue?mode=dates', { headers: { Authorization: `Bearer ${token()}` } })
      const listData = await listRes.json()
      setDateGroups(listData.dates || [])

      const allRes = await fetch('/api/redo-queue?mode=all', { headers: { Authorization: `Bearer ${token()}` } })
      const allData = await allRes.json()
      setAllQuestions(allData.questions || [])
    } catch (error) {
      console.error('Error submitting redo:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
    </div>
  )

  if (error && mode === 'list') return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700">
          <span className="flex items-center gap-2 text-sm font-medium">
            <FiAlertCircle className="shrink-0" /> {error} Please try again.
          </span>
          <button
            onClick={fetchData}
            className="ml-4 flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
          >
            <FiRefreshCw /> Retry
          </button>
        </div>
      </div>
    </div>
  )

  const pendingCount = allQuestions.filter(q => q.status !== 'Failed').length
  const failedCount = allQuestions.filter(q => q.status === 'Failed').length

  return (
    <div ref={testContainerRef} className="min-h-screen bg-slate-50">
      {/* List mode */}
      {mode === 'list' && (
        <div className="p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                    <FiRefreshCw size={20} />
                  </span>
                  My Redo Queue
                </h1>
                <p className="mt-1 text-sm text-slate-500">Questions you still need to master.</p>
              </div>
              {allQuestions.length > 0 && (
                <button
                  onClick={() => setShowStartPopup(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  <FiPlay /> Start Redo Session
                </button>
              )}
            </div>

            {/* Stat cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-500 text-white">
                  <FiInbox size={20} />
                </span>
                <div>
                  <p className="text-2xl font-extrabold text-slate-900">{allQuestions.length}</p>
                  <p className="text-xs font-medium text-slate-500">Total in Queue</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500 text-white">
                  <FiClock size={20} />
                </span>
                <div>
                  <p className="text-2xl font-extrabold text-slate-900">{pendingCount}</p>
                  <p className="text-xs font-medium text-slate-500">Pending</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-rose-500 text-white">
                  <FiAlertCircle size={20} />
                </span>
                <div>
                  <p className="text-2xl font-extrabold text-slate-900">{failedCount}</p>
                  <p className="text-xs font-medium text-slate-500">Previously Failed</p>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Date Logged</th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Section</th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Topic / Skill</th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Question</th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Why I Got It Wrong</th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Correct Concept</th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Difficulty</th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Redo Due</th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allQuestions.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-6 py-16">
                          <div className="flex flex-col items-center justify-center text-center">
                            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                              <FiCheckCircle size={28} />
                            </span>
                            <h3 className="text-base font-semibold text-slate-800">Your redo queue is clear</h3>
                            <p className="mt-1 text-sm text-slate-500">No pending questions to master right now. Great work!</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      allQuestions.map((q) => (
                        <tr key={q.logId} className="transition-colors hover:bg-indigo-50/40">
                          <td className="px-6 py-4 text-sm text-slate-700">{q.dateLogged || '—'}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${sectionBadge(q.section)}`}>
                              {q.section || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">{q.topic || q.skill || '—'}</td>
                          <td className="max-w-xs truncate px-6 py-4 text-sm text-slate-700" title={q.questionDescription || q.questionLabel}>
                            {q.questionDescription || q.questionLabel || '—'}
                          </td>
                          <td className="max-w-xs truncate px-6 py-4 text-sm text-slate-700" title={q.whyWrong}>{q.whyWrong || '—'}</td>
                          <td className="max-w-xs truncate px-6 py-4 text-sm text-slate-700" title={q.correctConcept}>{q.correctConcept || '—'}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`font-semibold ${difficultyClass(q.difficulty)}`}>{q.difficulty || '—'}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">{q.redoDueDate || '—'}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(q.status)}`}>
                              {q.status || '—'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Start Popup */}
      {showStartPopup && mode === 'list' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setShowStartPopup(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <FiClock size={32} />
              </div>
              <h2 className="mb-2 text-2xl font-extrabold text-slate-900">Ready to Master?</h2>
              <p className="mb-6 text-sm text-slate-500">
                You have <span className="font-bold text-indigo-600">{allQuestions.length}</span> questions waiting in your redo queue. Choose a batch to start your mastery session.
              </p>

              <div className="custom-scrollbar mb-6 max-h-72 space-y-3 overflow-y-auto pr-1">
                {dateGroups.length === 0 ? (
                  <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-6 text-sm text-slate-500">No batches available.</p>
                ) : (
                  dateGroups.map(group => (
                    <button
                      key={group.date}
                      onClick={() => startRedoByDate(group.date)}
                      className="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition-all hover:border-indigo-200 hover:bg-indigo-50"
                    >
                      <div>
                        <p className="font-bold text-slate-800 group-hover:text-indigo-700">{group.date || '—'}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {group.totalQuestions} {group.totalQuestions === 1 ? 'Question' : 'Questions'}
                          {group.pending > 0 && <span className="text-amber-600"> · {group.pending} pending</span>}
                          {group.failed > 0 && <span className="text-rose-600"> · {group.failed} failed</span>}
                        </p>
                        {Array.isArray(group.sections) && group.sections.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {group.sections.map(sec => (
                              <span key={sec.name} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sectionBadge(sec.name)}`}>
                                {sec.name} {sec.count}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <FiArrowRight className="ml-3 shrink-0 text-slate-400 transition-all group-hover:translate-x-1 group-hover:text-indigo-500" />
                    </button>
                  ))
                )}
              </div>

              <button
                onClick={() => setShowStartPopup(false)}
                className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
              >
                Not now, let me browse the list
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Exam UI */}
      {mode === 'test' && questions.length > 0 && (
        <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
          {/* Top Bar */}
          <div className="z-10 flex items-center justify-between bg-slate-900 px-6 py-3 text-white shadow-lg">
            <div className="flex items-center gap-4">
              <div className="rounded bg-indigo-600 px-2 py-1 text-xs font-bold text-white">REDO MODE</div>
              <h2 className="max-w-xs truncate text-sm font-semibold">{selectedDate} Mastery Session</h2>
            </div>

            <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
                <FiClock className="text-indigo-400" />
                <span className="font-mono text-lg font-bold tabular-nums">{formatTime(timeElapsed)}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={submitRedo}
                disabled={submitting}
                className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Finish Session'}
              </button>
              <button
                onClick={() => { exitFullscreen(); setMode('list'); }}
                className="text-white/60 transition-colors hover:text-white"
              >
                <FiX size={24} />
              </button>
            </div>
          </div>

          {/* Main Test Area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left side - Content */}
            <div className="custom-scrollbar flex-1 overflow-y-auto bg-slate-50 p-12">
              <div className="mx-auto max-w-3xl">
                <div className="mb-8 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                  <div className="flex gap-1">
                    {questions.map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-2 w-2 rounded-full ${idx === currentQuestionIndex ? 'bg-indigo-600' : answers[questions[idx].logId] ? 'bg-indigo-200' : 'bg-slate-200'}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="min-h-[400px] rounded-2xl border border-slate-100 bg-white p-10 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    {questions[currentQuestionIndex].questionLabel && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {questions[currentQuestionIndex].questionLabel}
                      </span>
                    )}
                    {questions[currentQuestionIndex].section && (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${sectionBadge(questions[currentQuestionIndex].section)}`}>
                        {questions[currentQuestionIndex].section}
                      </span>
                    )}
                    {(questions[currentQuestionIndex].topic || questions[currentQuestionIndex].skill) && (
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                        {questions[currentQuestionIndex].topic || questions[currentQuestionIndex].skill}
                      </span>
                    )}
                    {questions[currentQuestionIndex].difficulty && (
                      <span className={`text-xs font-semibold ${difficultyClass(questions[currentQuestionIndex].difficulty)}`}>
                        {questions[currentQuestionIndex].difficulty}
                      </span>
                    )}
                  </div>
                  {questions[currentQuestionIndex].questionParagraph && (
                    <div className="prose prose-indigo mb-6 max-w-none rounded-xl border border-slate-100 bg-slate-50 p-6 text-base leading-relaxed text-slate-700">
                      {renderContent(questions[currentQuestionIndex].questionParagraph)}
                    </div>
                  )}
                  {questions[currentQuestionIndex].imageUrl && (
                    <img
                      src={questions[currentQuestionIndex].imageUrl}
                      alt="Question"
                      className="mb-6 max-w-full rounded-lg border border-slate-100"
                    />
                  )}
                  <div className="prose prose-indigo max-w-none text-lg leading-relaxed text-slate-800">
                    {renderContent(questions[currentQuestionIndex].content)}
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Options */}
            <div className="z-10 flex w-[450px] flex-col border-l border-slate-100 bg-white shadow-2xl">
              <div className="custom-scrollbar flex-1 overflow-y-auto p-8">
                <h3 className="mb-8 text-xs font-bold uppercase tracking-widest text-slate-400">
                  {(questions[currentQuestionIndex].isFillInBlank || questions[currentQuestionIndex].options.length === 0) ? 'Your Answer' : 'Select Answer'}
                </h3>
                <div className="space-y-4">
                  {(questions[currentQuestionIndex].isFillInBlank || questions[currentQuestionIndex].options.length === 0) ? (
                    <div>
                      <input
                        type="text"
                        value={answers[questions[currentQuestionIndex].logId] || ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [questions[currentQuestionIndex].logId]: e.target.value }))}
                        placeholder="Type your answer"
                        className="w-full rounded-xl border-2 border-slate-200 px-5 py-4 text-lg font-medium text-slate-800 transition-all focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                      <p className="mt-3 text-xs text-slate-400">Enter your answer exactly as it should appear (e.g. 5, -1/3, 0.75).</p>
                    </div>
                  ) : questions[currentQuestionIndex].options.map((opt) => {
                    const selected = answers[questions[currentQuestionIndex].logId] === opt.key
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setAnswers(prev => ({ ...prev, [questions[currentQuestionIndex].logId]: opt.key }))}
                        className={`group flex w-full items-center gap-5 rounded-xl border-2 p-5 text-left transition-all ${
                          selected
                            ? 'border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-100'
                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold transition-all ${
                          selected
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                        }`}>
                          {opt.key}
                        </div>
                        <div className="flex-1 font-medium text-slate-700">
                          {renderContent(opt.value)}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 bg-slate-50 p-8">
                <button
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 px-6 py-4 font-bold text-slate-600 transition-all hover:border-indigo-200 hover:bg-white hover:text-indigo-600 disabled:pointer-events-none disabled:opacity-30"
                >
                  <FiArrowLeft /> Previous
                </button>
                {currentQuestionIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-4 font-bold text-white shadow-lg transition-all hover:bg-slate-800"
                  >
                    Next Question <FiArrowRight />
                  </button>
                ) : (
                  <button
                    onClick={submitRedo}
                    disabled={submitting}
                    className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 font-bold text-white shadow-lg transition-all hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {submitting ? 'Submitting…' : 'Complete Test'} <FiCheckCircle />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result Mode */}
      {mode === 'result' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 sm:p-6">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="shrink-0 bg-indigo-600 p-8 text-center text-white sm:p-10">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                <FiCheckCircle size={44} />
              </div>
              <h2 className="mb-2 text-3xl font-extrabold tracking-tight">Session Complete!</h2>
              <p className="text-indigo-100">
                Great job on finishing your {result?.date ? `${result.date} ` : ''}mastery batch.
              </p>
            </div>

            <div className="grid shrink-0 grid-cols-3 gap-3 p-6 text-center sm:gap-6 sm:p-10">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:p-6">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:text-xs">Attempted</p>
                <p className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{result?.attempted || 0}</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:p-6">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-500 sm:text-xs">Correct</p>
                <p className="text-2xl font-extrabold text-emerald-600 sm:text-3xl">{result?.correct || 0}</p>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 sm:p-6">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-rose-500 sm:text-xs">Incorrect</p>
                <p className="text-2xl font-extrabold text-rose-600 sm:text-3xl">{result?.wrong || 0}</p>
              </div>
            </div>

            {/* Review answers toggle — reveals per-question feedback so a redo actually teaches */}
            {questions.length > 0 && (
              <div className="shrink-0 px-6 sm:px-10">
                <button
                  onClick={() => setShowReview(v => !v)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-indigo-200 bg-indigo-50 px-6 py-3 text-sm font-bold text-indigo-700 transition-all hover:bg-indigo-100"
                >
                  <FiBookOpen />
                  {showReview ? 'Hide answers' : 'Review answers'}
                  {showReview ? <FiChevronUp /> : <FiChevronDown />}
                </button>
              </div>
            )}

            {/* Per-question review: the question, what you picked, the right answer, and why */}
            {showReview && questions.length > 0 && (
              <div className="custom-scrollbar mt-4 flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-4 sm:px-6">
                {questions.map((q, idx) => {
                  const optsObj = optionsToObject(q.options)
                  const studentAnswer = answers[q.logId]
                  const answered = studentAnswer != null && String(studentAnswer).trim() !== ''
                  const isMcq = !q.isFillInBlank && Array.isArray(q.options) && q.options.length > 0
                  const isRight = answered && answersMatch(q.correctAnswer, studentAnswer, isMcq ? optsObj : null)
                  const correctLetter = isMcq ? resolveAnswerLetter(q.correctAnswer, optsObj) : ''
                  const studentLetter = isMcq ? resolveAnswerLetter(studentAnswer, optsObj) : ''
                  return (
                    <div key={q.logId} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
                      {/* Status row */}
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                          Question {idx + 1}
                        </span>
                        {!answered ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                            <FiAlertCircle size={14} /> Skipped
                          </span>
                        ) : isRight ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                            <FiCheckCircle size={14} /> Correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
                            <FiXCircle size={14} /> Incorrect
                          </span>
                        )}
                      </div>

                      {/* Question content */}
                      {q.questionParagraph && (
                        <div className="prose prose-sm mb-4 max-w-none rounded-xl border border-slate-100 bg-slate-50 p-4 leading-relaxed text-slate-700">
                          {renderContent(q.questionParagraph)}
                        </div>
                      )}
                      {q.imageUrl && (
                        <img src={q.imageUrl} alt="Question" className="mb-4 max-w-full rounded-lg border border-slate-100" />
                      )}
                      <div className="prose prose-sm mb-4 max-w-none leading-relaxed text-slate-800">
                        {renderContent(q.content)}
                      </div>

                      {/* Options (MCQ) with correct/selected highlighting */}
                      {isMcq ? (
                        <div className="space-y-2">
                          {q.options.map((opt) => {
                            const isCorrectOpt = correctLetter && opt.key === correctLetter
                            const isSelectedOpt = studentLetter && opt.key === studentLetter
                            const isWrongSel = isSelectedOpt && !isCorrectOpt
                            let container = 'border-slate-100 bg-white'
                            let badge = 'bg-slate-100 text-slate-500'
                            let text = 'text-slate-600'
                            if (isCorrectOpt) {
                              container = 'border-emerald-200 bg-emerald-50'
                              badge = 'bg-emerald-600 text-white'
                              text = 'text-emerald-900 font-medium'
                            } else if (isWrongSel) {
                              container = 'border-rose-200 bg-rose-50'
                              badge = 'bg-rose-600 text-white'
                              text = 'text-rose-900 font-medium'
                            }
                            return (
                              <div key={opt.key} className={`flex items-start gap-3 rounded-xl border p-3 ${container}`}>
                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${badge}`}>
                                  {opt.key}
                                </span>
                                <div className={`flex-1 text-sm [&_img]:max-h-20 [&_img]:max-w-full ${text}`}>
                                  {renderContent(opt.value)}
                                </div>
                                {isCorrectOpt && <FiCheckCircle className="mt-1 shrink-0 text-emerald-600" size={18} />}
                                {isWrongSel && <FiXCircle className="mt-1 shrink-0 text-rose-600" size={18} />}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        /* Fill-in-the-blank review */
                        <div className="space-y-3">
                          {answered && (
                            <div className={`rounded-xl border-2 p-4 ${isRight ? 'border-emerald-500 bg-emerald-50' : 'border-rose-500 bg-rose-50'}`}>
                              <div className="mb-1 flex items-center gap-2">
                                {isRight
                                  ? <FiCheckCircle className="text-emerald-600" size={18} />
                                  : <FiXCircle className="text-rose-600" size={18} />}
                                <span className={`text-sm font-bold ${isRight ? 'text-emerald-700' : 'text-rose-700'}`}>Your answer</span>
                              </div>
                              <div className={`text-base font-semibold ${isRight ? 'text-emerald-900' : 'text-rose-900'}`}>
                                {studentAnswer}
                              </div>
                            </div>
                          )}
                          {!isRight && q.correctAnswer && (
                            <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-4">
                              <div className="mb-1 flex items-center gap-2">
                                <FiCheckCircle className="text-emerald-600" size={18} />
                                <span className="text-sm font-bold text-emerald-700">Correct answer</span>
                              </div>
                              <div className="text-base font-semibold text-emerald-900">
                                {renderContent(q.correctAnswer)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Explicit correct answer for MCQ when missed or skipped */}
                      {isMcq && !isRight && correctLetter && (
                        <div className="mt-3 rounded-xl border-2 border-emerald-500 bg-emerald-50 p-4">
                          <div className="mb-1 flex items-center gap-2">
                            <FiCheckCircle className="text-emerald-600" size={18} />
                            <span className="text-sm font-bold text-emerald-700">Correct answer</span>
                          </div>
                          <div className="text-sm font-semibold text-emerald-900 [&_img]:max-h-20 [&_img]:max-w-full">
                            <span>{correctLetter}. {optsObj[correctLetter] ? renderContent(optsObj[correctLetter]) : null}</span>
                          </div>
                        </div>
                      )}

                      {!answered && (
                        <p className="mt-3 text-xs font-medium text-slate-400">
                          You didn&apos;t answer this one — check the correct answer above.
                        </p>
                      )}

                      {/* Explanation, when the question has one */}
                      {q.explanation && String(q.explanation).trim() !== '' && (
                        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                          <div className="mb-2 flex items-center gap-2">
                            <FiBookOpen className="text-indigo-600" size={16} />
                            <h4 className="text-xs font-bold uppercase tracking-wide text-indigo-700">Explanation</h4>
                          </div>
                          <div className="prose prose-sm max-w-none leading-relaxed text-slate-700">
                            {renderContent(q.explanation)}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex shrink-0 gap-4 border-t border-slate-100 p-6 sm:px-10 sm:pb-10 sm:pt-6">
              <button
                onClick={() => setMode('list')}
                className="flex-1 rounded-xl border-2 border-slate-200 px-6 py-4 font-bold text-slate-600 transition-all hover:bg-slate-50"
              >
                Back to Queue
              </button>
              <button
                onClick={() => startRedoByDate(selectedDate)}
                className="flex-1 rounded-xl bg-indigo-600 px-6 py-4 font-bold text-white shadow-lg transition-all hover:bg-indigo-700"
              >
                Retry Batch
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  )
}
