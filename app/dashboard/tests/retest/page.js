'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FiArrowLeft,
  FiPlay,
  FiAlertCircle,
  FiRefreshCw,
  FiBookOpen,
  FiList,
  FiClock,
  FiCheckCircle,
  FiTarget,
} from 'react-icons/fi'

export default function RetestPage() {
  const router = useRouter()
  const [allWrongQuestions, setAllWrongQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, rwCount: 0, mathCount: 0 })

  useEffect(() => {
    fetchAllWrongQuestions()
  }, [])

  const fetchAllWrongQuestions = async () => {
    try {
      const token = localStorage.getItem('token')
      const [sessionsRes, questionsRes] = await Promise.all([
        fetch('/api/test-sessions', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/questions', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      if (sessionsRes.ok && questionsRes.ok) {
        const sessionsData = await sessionsRes.json()
        const allQuestions = await questionsRes.json()
        const sessions = sessionsData.sessions || sessionsData || []

        // Get all completed sessions (including retests)
        const completedSessions = sessions.filter(s =>
          s.status === 'Completed' && s.moduleAnswers
        )

        // Track questions that were answered correctly
        const correctlyAnswered = new Set()

        // First pass: collect all correctly answered questions
        completedSessions.forEach(session => {
          const moduleAnswers = session.moduleAnswers || {}
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
                const userAnswer = answers[questionId]
                const isCorrect = userAnswer === question.correctAnswer
                const wasAttempted = userAnswer !== null && userAnswer !== undefined && userAnswer !== ''

                if (isCorrect && wasAttempted) {
                  correctlyAnswered.add(String(questionId))
                }
              }
            })
          })
        })

        // Second pass: collect wrong/unattempted questions (excluding correctly answered ones)
        const wrongQuestionsMap = new Map()

        completedSessions.forEach(session => {
          const moduleAnswers = session.moduleAnswers || {}
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
              // Skip if already answered correctly in any test
              if (correctlyAnswered.has(String(questionId))) return

              const question = allQuestions.find(q => String(q._id) === String(questionId))
              if (question) {
                const userAnswer = answers[questionId]
                const isCorrect = userAnswer === question.correctAnswer
                const wasAttempted = userAnswer !== null && userAnswer !== undefined && userAnswer !== ''

                // Include if wrong OR not attempted
                if (!isCorrect || !wasAttempted) {
                  wrongQuestionsMap.set(String(questionId), {
                    ...question,
                    userAnswer: wasAttempted ? userAnswer : null,
                    wasAttempted,
                    module: moduleKey
                  })
                }
              }
            })
          })
        })

        const wrongQuestions = Array.from(wrongQuestionsMap.values())
        const rwCount = wrongQuestions.filter(q =>
          q.subject === 'Reading and Writing' || q.subject === 'Reading & Writing'
        ).length
        const mathCount = wrongQuestions.filter(q => q.subject === 'Math').length

        setAllWrongQuestions(wrongQuestions)
        setStats({ total: wrongQuestions.length, rwCount, mathCount })
      }
    } catch (error) {
      console.error('Error fetching tests:', error)
    } finally {
      setLoading(false)
    }
  }

  const startRetest = () => {
    if (stats.total < 98) return

    // Use a single id for both the stored session and the URL so the start page can
    // match them. The set is passed via localStorage; the start page guards against it
    // being missing (e.g. after a refresh) with a clear "retest expired" message.
    const sessionId = 'retest-' + Date.now()
    localStorage.setItem('retestQuestions', JSON.stringify(allWrongQuestions))
    localStorage.setItem('retestSessionId', sessionId)
    router.push(`/dashboard/tests/retest/${sessionId}/start`)
  }

  const canStartRetest = stats.total >= 98

  // Derived breakdown surfaced from the per-question data we already compute.
  const attemptedWrong = allWrongQuestions.filter(q => q.wasAttempted).length
  const notAttempted = allWrongQuestions.filter(q => !q.wasAttempted).length
  const progressPct = Math.min(100, Math.round((stats.total / 98) * 100))

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            onClick={() => router.push('/dashboard/tests')}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <FiArrowLeft /> Back to Tests
          </button>
          <button
            onClick={() => router.push('/dashboard/tests/retest/history')}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <FiList /> Retest History
          </button>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiRefreshCw className="h-5 w-5" />
            </span>
            Retest Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Practice every question you got wrong or skipped across all your past tests.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500 text-white">
                <FiTarget className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl font-extrabold text-slate-900">{stats.total}</div>
                <div className="text-xs font-medium text-slate-500">Total Available</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500 text-white">
                <FiBookOpen className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl font-extrabold text-slate-900">{stats.rwCount}</div>
                <div className="text-xs font-medium text-slate-500">Reading &amp; Writing</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white">
                <FiTarget className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl font-extrabold text-slate-900">{stats.mathCount}</div>
                <div className="text-xs font-medium text-slate-500">Math</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-white">
                <FiClock className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl font-extrabold text-slate-900">{notAttempted}</div>
                <div className="text-xs font-medium text-slate-500">Skipped / Unattempted</div>
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown row */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Pool Breakdown</span>
              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
                {attemptedWrong} answered wrong
              </span>
            </div>
            <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
                Wrong answers: <span className="font-semibold text-slate-900">{attemptedWrong}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                Skipped: <span className="font-semibold text-slate-900">{notAttempted}</span>
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Progress to Full Retest</span>
              <span className="text-xs font-medium text-slate-500">{stats.total} / 98</span>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${canStartRetest ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                style={{ width: `${progressPct}%` }}
              ></div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {canStartRetest
                ? 'You have enough questions for a full retest.'
                : `${98 - stats.total} more question${98 - stats.total === 1 ? '' : 's'} needed to unlock a full retest.`}
            </p>
          </div>
        </div>

        {/* Retest Action Card */}
        <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
          {!canStartRetest ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                <FiAlertCircle className="h-8 w-8 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Not Enough Questions</h3>
              <p className="mt-2 text-sm text-slate-600">
                You need at least <span className="font-semibold text-indigo-600">98 questions</span> to start a full retest.
                <br />
                Currently available: <span className="font-semibold text-slate-900">{stats.total} questions</span>
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Take more tests to accumulate questions for retest practice.
              </p>
              <button
                onClick={() => router.push('/dashboard/tests')}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                <FiPlay /> Take a New Test
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                <FiPlay className="h-10 w-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Ready for Retest!</h3>
              <p className="mt-2 text-sm text-slate-600">
                You have <span className="font-semibold text-emerald-600">{stats.total} questions</span> available for practice.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                This retest includes every question you got wrong or didn&apos;t attempt in previous tests.
              </p>

              <button
                onClick={startRetest}
                className="mx-auto mt-6 inline-flex items-center gap-2.5 rounded-lg bg-indigo-600 px-8 py-3 text-base font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
              >
                <FiPlay /> Start Full Retest
              </button>

              <div className="mt-6 flex items-center justify-center gap-2 border-t border-slate-100 pt-6 text-xs text-slate-500">
                <FiCheckCircle className="text-emerald-500" />
                Questions leave this pool only once you answer them correctly.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
