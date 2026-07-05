'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  FiCheckCircle,
  FiXCircle,
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiGrid,
  FiX,
  FiSlash,
  FiAward,
  FiTarget,
  FiBookOpen,
  FiInbox
} from 'react-icons/fi'
// Shared grader (same as the server): MCQ decided by option letter, never by casing;
// fill-in-the-blank by case-insensitive text / numeric match.
import { answersMatch, resolveAnswerLetter } from '../../../../../lib/scoring/satScale'

export default function TestReviewPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id

  const [session, setSession] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [showQuestionNav, setShowQuestionNav] = useState(false)

  useEffect(() => {
    fetchReview()
  }, [sessionId])

  const fetchReview = async () => {
    try {
      const token = localStorage.getItem('token')
      const [sessionRes, questionsRes] = await Promise.all([
        fetch(`/api/test-sessions/${sessionId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),
        fetch('/api/questions', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
      ])

      if (sessionRes.ok && questionsRes.ok) {
        const sessionData = await sessionRes.json()
        const allQuestions = await questionsRes.json()

        const reviewQuestions = []
        const moduleAnswers = sessionData.moduleAnswers || {}

        Object.keys(moduleAnswers).forEach(moduleKey => {
          const moduleData = moduleAnswers[moduleKey]

          let answers = {}
          let questionIds = []

          if (moduleData && typeof moduleData === 'object') {
            if (moduleData.answers && moduleData.questionIds) {
              answers = moduleData.answers
              questionIds = moduleData.questionIds
            } else {
              answers = moduleData
              questionIds = Object.keys(answers)
            }
          }

          questionIds.forEach(questionId => {
            const question = allQuestions.find(q => String(q._id) === String(questionId))
            if (question) {
              const userAnswer = answers[questionId] || null
              const isCorrect = answersMatch(question.correctAnswer, userAnswer, question)
              const wasAttempted = userAnswer !== null && userAnswer !== undefined

              reviewQuestions.push({
                ...question,
                userAnswer,
                isCorrect,
                wasAttempted,
                module: moduleKey
              })
            }
          })
        })

        // Fallback: module/tutor/admin tests store answers in `responses`, not `moduleAnswers`.
        // When moduleAnswers produced nothing, build the review rows from `responses`.
        if (reviewQuestions.length === 0 && Array.isArray(sessionData.responses)) {
          sessionData.responses.forEach(r => {
            const question = allQuestions.find(q => String(q._id) === String(r.questionId))
            if (question) {
              const userAnswer = (r.selectedAnswer !== undefined && r.selectedAnswer !== null && r.selectedAnswer !== '')
                ? r.selectedAnswer
                : null
              const wasAttempted = userAnswer !== null
              const isCorrect = typeof r.isCorrect === 'boolean'
                ? r.isCorrect
                : answersMatch(question.correctAnswer, userAnswer, question)

              reviewQuestions.push({
                ...question,
                userAnswer,
                isCorrect,
                wasAttempted,
                module: r.subject || 'responses'
              })
            }
          })
        }

        setSession(sessionData)
        setQuestions(reviewQuestions)
      }
    } catch (error) {
      console.error('Error fetching review:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (!session || questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8 flex items-center justify-center">
        <div className="flex max-w-md flex-col items-center rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            <FiInbox size={24} />
          </span>
          <h2 className="text-lg font-bold text-slate-900">No review data available</h2>
          <p className="mt-1 text-sm text-slate-500">
            We couldn&apos;t find any answered questions for this test session.
          </p>
          <button
            onClick={() => router.push('/dashboard/tests/history')}
            className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            Back to History
          </button>
        </div>
      </div>
    )
  }

  const correctCount = questions.filter(q => q.isCorrect).length
  const attemptedCount = questions.filter(q => q.wasAttempted).length
  const wrongCount = questions.filter(q => q.wasAttempted && !q.isCorrect).length
  const unattemptedCount = questions.filter(q => !q.wasAttempted).length
  const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0

  const currentQ = questions[currentQuestion]
  const reviewDate = session.completedAt || session.createdAt

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Back link */}
        <button
          onClick={() => router.push('/dashboard/tests/history')}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-indigo-600"
        >
          <FiArrowLeft /> Back to History
        </button>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <FiBookOpen size={20} />
              </span>
              Test Review
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {reviewDate ? new Date(reviewDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
              {session.sessionType ? ` · ${session.sessionType}` : ''}
              {session.subject ? ` · ${session.subject}` : ''}
              {session.attemptCount > 1 ? ` · Attempt ${session.attemptCount}` : ''}
            </p>
          </div>
          {session.autoSubmitted && (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
              Auto-submitted{session.autoSubmitReason ? `: ${session.autoSubmitReason}` : ''}
            </span>
          )}
        </div>

        {/* Stat cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500 text-white">
                <FiAward size={18} />
              </span>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{session.totalScore ?? 0}<span className="text-sm font-medium text-slate-400">/1600</span></p>
                <p className="text-xs font-medium text-slate-500">Total Score</p>
              </div>
            </div>
            {(session.rwScore != null || session.mathScore != null) && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-violet-100 px-2.5 py-1 font-medium text-violet-700">R&amp;W {session.rwScore ?? '—'}</span>
                <span className="rounded-full bg-indigo-100 px-2.5 py-1 font-medium text-indigo-700">Math {session.mathScore ?? '—'}</span>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white">
                <FiCheckCircle size={18} />
              </span>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{correctCount}</p>
                <p className="text-xs font-medium text-slate-500">Correct</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500 text-white">
                <FiXCircle size={18} />
              </span>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{wrongCount}</p>
                <p className="text-xs font-medium text-slate-500">Wrong</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-400 text-white">
                <FiSlash size={18} />
              </span>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{unattemptedCount}</p>
                <p className="text-xs font-medium text-slate-500">Skipped</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-white">
                <FiTarget size={18} />
              </span>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{accuracy}%</p>
                <p className="text-xs font-medium text-slate-500">Accuracy</p>
              </div>
            </div>
          </div>
        </div>

        {/* Review card */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {/* Question status bar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-base font-bold text-white ${
              !currentQ.wasAttempted ? 'bg-slate-400' : currentQ.isCorrect ? 'bg-emerald-500' : 'bg-rose-500'
            }`}>
              {currentQuestion + 1}
            </div>
            <div className="flex items-center gap-2">
              {!currentQ.wasAttempted ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  <FiSlash size={13} /> Not Attempted
                </span>
              ) : currentQ.isCorrect ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <FiCheckCircle size={13} /> Correct
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
                  <FiXCircle size={13} /> Wrong
                </span>
              )}
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {currentQ.subject && (
                <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">{currentQ.subject}</span>
              )}
              {currentQ.domain && currentQ.domain !== currentQ.subject && (
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">{currentQ.domain}</span>
              )}
              {currentQ.skill && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{currentQ.skill}</span>
              )}
              {currentQ.difficulty && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">{currentQ.difficulty}</span>
              )}
            </div>
          </div>

          {/* Split content */}
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left - Passage + Question */}
            <div className="relative border-b border-slate-100 p-6 lg:border-b-0 lg:border-r lg:p-8">
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="-rotate-45 select-none text-5xl font-bold text-slate-100">
                  www.dsatguru.com
                </div>
              </div>
              <div className="relative z-10">
                {currentQ?.questionParagraph && (
                  <div className="mb-6">
                    <p className="whitespace-pre-line leading-relaxed text-slate-700">
                      {currentQ.questionParagraph}
                    </p>
                  </div>
                )}
                {currentQ?.imageUrl && (
                  <img
                    src={currentQ.imageUrl}
                    alt="Question illustration"
                    className="mb-6 max-w-full rounded-xl border border-slate-100"
                  />
                )}
                <p className="text-base font-semibold leading-relaxed text-slate-900">
                  {currentQ?.question || currentQ?.content}
                </p>
              </div>
            </div>

            {/* Right - Options + Explanation */}
            <div className="relative p-6 lg:p-8">
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="-rotate-45 select-none text-5xl font-bold text-slate-100">
                  www.dsatguru.com
                </div>
              </div>
              <div className="relative z-10">
                {/* Answer Options */}
                <div className="space-y-3">
                  {['A', 'B', 'C', 'D'].map((option) => {
                    const isUserAnswer = resolveAnswerLetter(currentQ.userAnswer, currentQ) === option
                    const isCorrectAnswer = resolveAnswerLetter(currentQ.correctAnswer, currentQ) === option

                    return (
                      <div
                        key={option}
                        className={`w-full rounded-xl border-2 p-4 text-left transition-colors ${
                          isCorrectAnswer
                            ? 'border-emerald-400 bg-emerald-50'
                            : isUserAnswer && !isCorrectAnswer
                            ? 'border-rose-400 bg-rose-50'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 font-semibold ${
                            isCorrectAnswer
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : isUserAnswer && !isCorrectAnswer
                              ? 'border-rose-500 bg-rose-500 text-white'
                              : 'border-slate-300 text-slate-600'
                          }`}>
                            {option}
                          </div>
                          <div className="flex-1 pt-1">
                            <span className="text-slate-800">{currentQ?.[`option${option}`]}</span>
                            {isCorrectAnswer && (
                              <span className="ml-2 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                                <FiCheckCircle size={14} /> Correct
                              </span>
                            )}
                            {isUserAnswer && !isCorrectAnswer && (
                              <span className="ml-2 inline-flex items-center gap-1 text-sm font-semibold text-rose-600">
                                <FiXCircle size={14} /> Your Answer
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Explanation Section */}
                {(!currentQ.wasAttempted || !currentQ.isCorrect) && (
                  <div className={`mt-5 rounded-xl border p-4 ${
                    !currentQ.wasAttempted
                      ? 'border-slate-200 bg-slate-50'
                      : 'border-amber-200 bg-amber-50'
                  }`}>
                    <p className={`mb-3 flex items-center gap-2 font-semibold ${
                      !currentQ.wasAttempted ? 'text-slate-900' : 'text-amber-900'
                    }`}>
                      <span className="text-lg">💡</span>
                      {!currentQ.wasAttempted ? 'Answer & Explanation' : 'Explanation'}
                    </p>
                    {currentQ.shortExplanation && (
                      <div className="mb-3">
                        <p className={`mb-1 text-sm font-medium ${
                          !currentQ.wasAttempted ? 'text-slate-600' : 'text-amber-800'
                        }`}>
                          Quick Explanation:
                        </p>
                        <p className={`text-sm leading-relaxed ${!currentQ.wasAttempted ? 'text-slate-700' : 'text-amber-800'}`}>
                          {currentQ.shortExplanation}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className={`mb-1 text-sm font-medium ${
                        !currentQ.wasAttempted ? 'text-slate-600' : 'text-amber-800'
                      }`}>
                        Detailed Explanation:
                      </p>
                      <p className={`text-sm leading-relaxed ${!currentQ.wasAttempted ? 'text-slate-700' : 'text-amber-800'}`}>
                        {currentQ.longExplanation || currentQ.explanation || 'No detailed explanation available'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Success message for correct answers */}
                {currentQ.wasAttempted && currentQ.isCorrect && (
                  <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="flex items-center gap-2 font-semibold text-emerald-800">
                      <FiCheckCircle className="text-emerald-600" size={20} />
                      Great job! You got this one right.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation footer */}
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button
              onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiChevronLeft size={16} /> Back
            </button>

            <div className="relative flex items-center gap-3">
              <div className="text-center">
                <span className="text-sm font-medium text-slate-600">
                  Question {currentQuestion + 1} of {questions.length}
                </span>
                <div className="mt-1 flex justify-center gap-3 text-xs font-medium">
                  <span className="inline-flex items-center gap-1 text-emerald-600"><FiCheckCircle size={12} /> {correctCount}</span>
                  <span className="inline-flex items-center gap-1 text-rose-600"><FiXCircle size={12} /> {wrongCount}</span>
                  <span className="inline-flex items-center gap-1 text-slate-500"><FiSlash size={12} /> {unattemptedCount}</span>
                </div>
              </div>
              <button
                onClick={() => setShowQuestionNav(!showQuestionNav)}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 p-2 text-slate-600 transition-colors hover:bg-white"
                aria-label="Toggle question navigator"
              >
                <FiGrid size={16} />
              </button>

              {showQuestionNav && (
                <div className="absolute bottom-full right-0 z-50 mb-2 max-h-96 w-80 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-4 shadow-lg">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Questions</h3>
                    <button
                      onClick={() => setShowQuestionNav(false)}
                      className="text-slate-400 transition-colors hover:text-slate-600"
                      aria-label="Close navigator"
                    >
                      <FiX size={18} />
                    </button>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {questions.map((q, idx) => {
                      const isCurrent = idx === currentQuestion
                      return (
                        <button
                          key={idx}
                          onClick={() => { setCurrentQuestion(idx); setShowQuestionNav(false) }}
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white transition-transform hover:scale-105 ${
                            isCurrent ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
                          } ${
                            !q.wasAttempted ? 'bg-slate-400' :
                            q.isCorrect ? 'bg-emerald-500' :
                            'bg-rose-500'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
              disabled={currentQuestion === questions.length - 1}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
