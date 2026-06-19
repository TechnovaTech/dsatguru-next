'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiPlay, FiClock, FiFileText, FiCheckCircle, FiRefreshCw, FiBookOpen, FiBarChart2, FiHelpCircle, FiLayers, FiAlertCircle } from 'react-icons/fi'
import { useToast } from '../../components/ui/UIProvider'

const DIFFICULTY_STYLES = {
  Easy: 'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  Hard: 'bg-rose-100 text-rose-700',
}

export default function TestsPage() {
  const toast = useToast()
  const router = useRouter()
  const [tests, setTests] = useState([])
  const [completedTestIds, setCompletedTestIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTests()
  }, [])

  const fetchTests = async () => {
    setLoading(true)
    setError('')
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

      if (!testsRes.ok) throw new Error('Failed to load tests')

      const data = await testsRes.json()
      setTests(data.filter(test => test.isActive))

      if (historyRes.ok) {
        const historyData = await historyRes.json()
        const sessions = historyData.sessions || historyData || []
        const completed = sessions
          .filter(s => s.status === 'Completed' && s.totalScore !== undefined)
          .map(s => String(s.testId?._id || s.testId))
        setCompletedTestIds(completed)
      }
    } catch (error) {
      console.error('Error fetching tests:', error)
      setError("Couldn't load tests.")
    } finally {
      setLoading(false)
    }
  }

  const startTest = (test) => {
    if (completedTestIds.includes(String(test._id))) {
      toast.info('You have already completed this test. Check your Test History to review it.')
      return
    }
    if (test.isModuleTest) {
      router.push(`/dashboard/tests/${test._id}/module-start`)
    } else {
      router.push(`/dashboard/tests/${test._id}/start`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="mx-auto flex max-w-7xl items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500"></div>
        </div>
      </div>
    )
  }

  const activeCount = tests.filter(t => !completedTestIds.includes(String(t._id))).length
  const completedCount = tests.filter(t => completedTestIds.includes(String(t._id))).length

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <FiFileText size={20} />
              </span>
              Available Tests
            </h1>
            <p className="mt-1 text-sm text-slate-500">Take practice tests created by your instructors</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push('/dashboard/tests/retest')}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <FiRefreshCw size={16} />
              Retest
            </button>
            <button
              onClick={() => router.push('/dashboard/tests/history')}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              <FiBookOpen size={16} />
              Test History
            </button>
          </div>
        </div>

        {/* Stat cards */}
        {!error && tests.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-500 text-white">
                <FiFileText size={20} />
              </span>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{tests.length}</p>
                <p className="text-sm text-slate-500">Total Tests</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500 text-white">
                <FiPlay size={20} />
              </span>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{activeCount}</p>
                <p className="text-sm text-slate-500">Available to Take</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500 text-white">
                <FiCheckCircle size={20} />
              </span>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{completedCount}</p>
                <p className="text-sm text-slate-500">Completed</p>
              </div>
            </div>
          </div>
        )}

        {error ? (
          <div role="alert" className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700">
            <span className="flex items-center gap-2 text-sm font-medium">
              <FiAlertCircle size={18} />
              {error} Please try again.
            </span>
            <button
              onClick={fetchTests}
              className="flex-shrink-0 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        ) : tests.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <FiFileText size={28} />
            </span>
            <h3 className="text-lg font-semibold text-slate-900">No Tests Available</h3>
            <p className="mt-1 text-sm text-slate-500">Check back later for new tests from your instructors.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tests.map((test) => {
              const isCompleted = completedTestIds.includes(String(test._id))

              // Determine display info based on test source/type
              const isSelfTest = test.title === 'Self Practice Test' || test.configType === 'custom'
              let displayTitle = test.title
              let category = 'Admin Practice'
              let typeLabel = test.configType === 'standard' ? 'Standard SAT' : 'Custom'

              if (isSelfTest) {
                const type = test.configType === 'standard' ? 'Standard' : 'Custom'
                const mode = test.practiceMode === 'tutor' ? 'Tutor' : 'Timed'
                displayTitle = `${type} ${mode}`
                category = 'Self Practice'
                typeLabel = `${type} ${mode}`
              }

              return (
                <div
                  key={test._id}
                  className={`flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md ${
                    isCompleted ? 'border-emerald-200' : 'border-slate-100 hover:border-indigo-200'
                  }`}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                        isSelfTest ? 'bg-violet-100 text-violet-600' : 'bg-indigo-100 text-indigo-600'
                      }`}>
                        <FiFileText size={20} />
                      </span>
                      <div>
                        <h3 className="text-base font-semibold leading-tight text-slate-900">{displayTitle || '—'}</h3>
                        <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-slate-400">{category}</p>
                      </div>
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {isCompleted ? 'Completed' : 'Active'}
                    </span>
                  </div>

                  {test.description && (
                    <p className="mb-4 line-clamp-2 text-sm text-slate-500">{test.description}</p>
                  )}

                  {/* Meta badges: difficulty, test type, total questions */}
                  <div className="mb-4 flex flex-wrap gap-2">
                    {test.difficulty && (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${DIFFICULTY_STYLES[test.difficulty] || 'bg-slate-100 text-slate-600'}`}>
                        {test.difficulty}
                      </span>
                    )}
                    {test.testType && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {test.testType}
                      </span>
                    )}
                    {!test.isModuleTest && test.totalQuestions != null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        <FiHelpCircle size={12} />
                        {test.totalQuestions} Questions
                      </span>
                    )}
                  </div>

                  <div className="mb-6 flex-1 space-y-3">
                    {test.isModuleTest && Array.isArray(test.modules) ? (
                      <>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                          <FiLayers size={16} className="text-slate-400" />
                          <span>{test.modules.length} Module{test.modules.length > 1 ? 's' : ''}</span>
                        </div>
                        <div className="space-y-1.5 border-t border-slate-100 pt-3">
                          {test.modules.map((m, i) => (
                            <div key={i} className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                              <span className="font-semibold text-slate-700">M{i + 1}:</span>
                              <span>{m.subject ?? '—'}</span>
                              <span className="text-slate-300">•</span>
                              <span>{m.numberOfQuestions || m.questions?.length || 0}q</span>
                              <span className="text-slate-300">•</span>
                              <span>{m.isTimed ? `${m.duration ?? '—'}min` : 'Untimed'}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <FiClock size={16} className="text-slate-400" />
                          <span>Duration: {test.practiceMode === 'tutor' ? 'Untimed' : `${test.duration || 180} minutes`}</span>
                        </div>
                        <div className="border-t border-slate-100 pt-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Sections</p>
                          <div className="flex flex-wrap gap-2">
                            {test.sections?.math && (
                              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">Math</span>
                            )}
                            {test.sections?.rw && (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Reading &amp; Writing</span>
                            )}
                            {!test.sections?.math && !test.sections?.rw && (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <FiBarChart2 size={14} className="text-slate-400" />
                      <span>Type: {test.isModuleTest ? 'Module Test' : typeLabel}</span>
                    </div>
                  </div>

                  {isCompleted ? (
                    <button
                      onClick={() => router.push('/dashboard/tests/history')}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                    >
                      <FiCheckCircle size={16} />
                      View Results
                    </button>
                  ) : (
                    <button
                      onClick={() => startTest(test)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                    >
                      <FiPlay size={16} />
                      Start Test
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
