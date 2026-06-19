'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiPlay, FiSettings, FiClock, FiBook, FiTarget, FiHelpCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import axios from 'axios'

export default function CreatePracticePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bankId = searchParams.get('bankId')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startingSession, setStartingSession] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [practiceOptions, setPracticeOptions] = useState({
    subjects: ['Math', 'Reading & Writing'],
    totalQuestions: 100,
    difficultyDistribution: { Easy: 30, Medium: 40, Hard: 30 },
    statusCounts: { unused: 80, incorrect: 10, correct: 8, mastered: 2, flagged: 0 }
  })
  const [expandedSections, setExpandedSections] = useState({
    quickSetup: true,
    personalize: false,
    practiceMode: true
  })

  const [config, setConfig] = useState({
    subject: 'Math',
    difficulty: null,
    questionCount: 10,
    mode: 'Mock',
    timeLimit: null
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setLoading(true)
    setError('')
    try {
      if (bankId) {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const res = await axios.get(`/api/questions?bankId=${encodeURIComponent(bankId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        const questions = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.questions || [])
        const total = Array.isArray(questions) ? questions.length : 100
        setPracticeOptions((prev) => ({ ...prev, totalQuestions: total }))
      }
    } catch (err) {
      console.error('Error loading practice options:', err)
      setError("Couldn't load practice options.")
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const handleStartPractice = async () => {
    try {
      setStartingSession(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const payload = {
        questionBankId: bankId,
        subject: config.subject,
        sessionType: config.mode === 'Timed' ? 'Adaptive' : 'Practice',
        status: 'InProgress',
        totalQuestions: config.questionCount,
        answeredQuestions: 0,
        correctAnswers: 0,
        startTime: new Date(),
        timeSpent: 0
      }
      const res = await fetch('/api/test-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        const data = await res.json()
        const sessionId = data?.session?._id || data?.session?.id
        if (sessionId) {
          router.push(`/dashboard/sat-test/${sessionId}`)
        } else {
          router.push('/dashboard/analytics')
        }
      }
    } catch (error) {
    } finally {
      setStartingSession(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading practice options...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Create Practice Test</h1>
              <p className="text-gray-600 mt-1">Customize your practice session and start practicing</p>
            </div>
            <button
              onClick={() => setShowTutorial(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <FiHelpCircle className="w-4 h-4" />
              Launch Tutorial
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div role="alert" className="mb-6 flex items-center justify-between gap-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">
            <span className="text-sm font-medium">{error} Please try again.</span>
            <button
              onClick={loadInitialData}
              className="bg-red-600 text-white text-sm font-semibold px-4 py-1.5 rounded hover:bg-red-700 transition-colors flex-shrink-0"
            >
              Retry
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border">
              <button
                onClick={() => toggleSection('quickSetup')}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiPlay className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Quick Setup</h2>
                    <p className="text-sm text-gray-600">Start practicing with default settings</p>
                  </div>
                </div>
                {expandedSections.quickSetup ? <FiChevronUp /> : <FiChevronDown />}
              </button>

              {expandedSections.quickSetup && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium text-gray-700">Questions:</label>
                      <input
                        type="number"
                        step={1}
                        min={1}
                        max={practiceOptions?.totalQuestions || 100}
                        value={config.questionCount}
                        onChange={(e) => {
                          const num = parseInt(e.target.value, 10)
                          if (Number.isNaN(num)) return
                          const max = practiceOptions?.totalQuestions || 100
                          const clamped = Math.max(1, Math.min(num, max))
                          setConfig((prev) => ({ ...prev, questionCount: clamped }))
                        }}
                        className="px-3 py-2 w-28 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-500">Max {practiceOptions?.totalQuestions || 100}</span>
                    </div>
                    <button
                      onClick={handleStartPractice}
                      disabled={startingSession}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {startingSession ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Starting...
                        </>
                      ) : (
                        <>
                          <FiPlay className="w-4 h-4" />
                          START PRACTICE
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border">
              <button
                onClick={() => toggleSection('personalize')}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FiSettings className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Personalize</h2>
                    <p className="text-sm text-gray-600">Advanced test customization options</p>
                  </div>
                </div>
                {expandedSections.personalize ? <FiChevronUp /> : <FiChevronDown />}
              </button>

              {expandedSections.personalize && (
                <div className="px-6 pb-6 border-t border-gray-100 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subject</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {practiceOptions.subjects.map((subject) => (
                        <button
                          key={subject}
                          onClick={() => setConfig((prev) => ({ ...prev, subject }))}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            config.subject === subject
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <div className="font-medium">{subject}</div>
                          <div className="text-sm text-gray-500 mt-1">{practiceOptions?.totalQuestions || 0} questions</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Difficulty Level</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {['Easy', 'Medium', 'Hard'].map((difficulty) => (
                        <button
                          key={difficulty}
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              difficulty: prev.difficulty === difficulty ? null : difficulty
                            }))
                          }
                          className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                            config.difficulty === difficulty
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          {difficulty}
                          {practiceOptions?.difficultyDistribution?.[difficulty] && (
                            <div className="text-xs text-gray-500 mt-1">
                              {practiceOptions.difficultyDistribution[difficulty]} questions
                            </div>
                          )}
                        </button>
                      ))}
                      <button
                        onClick={() => setConfig((prev) => ({ ...prev, difficulty: null }))}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          config.difficulty === null
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        All Levels
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border">
              <button
                onClick={() => toggleSection('practiceMode')}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FiClock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Practice Mode</h2>
                    <p className="text-sm text-gray-600">Choose how you want to practice</p>
                  </div>
                </div>
                {expandedSections.practiceMode ? <FiChevronUp /> : <FiChevronDown />}
              </button>

              {expandedSections.practiceMode && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div
                      onClick={() => setConfig((prev) => ({ ...prev, mode: 'Mock' }))}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        config.mode === 'Mock' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`w-4 h-4 rounded-full border-2 ${
                            config.mode === 'Mock' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                          }`}
                        >
                          {config.mode === 'Mock' && <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>}
                        </div>
                        <FiBook className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">Mock Mode</span>
                      </div>
                      <p className="text-sm text-gray-600">Practice without time limits, review answers at the end</p>
                    </div>

                    <div
                      onClick={() => setConfig((prev) => ({ ...prev, mode: 'Timed' }))}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        config.mode === 'Timed' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`w-4 h-4 rounded-full border-2 ${
                            config.mode === 'Timed' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                          }`}
                        >
                          {config.mode === 'Timed' && <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>}
                        </div>
                        <FiClock className="w-5 h-5 text-green-600" />
                        <span className="font-medium">Timed Mode</span>
                      </div>
                      <p className="text-sm text-gray-600">Practice with time limits and pressure</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiTarget className="w-5 h-5" />
                Practice Summary
              </h3>

              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="font-medium text-gray-900">{practiceOptions.statusCounts?.unused || 0}</div>
                      <div className="text-gray-600">Unused</div>
                    </div>
                    <div className="bg-red-50 p-2 rounded">
                      <div className="font-medium text-red-900">{practiceOptions.statusCounts?.incorrect || 0}</div>
                      <div className="text-red-600">Incorrect</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded">
                      <div className="font-medium text-green-900">{practiceOptions.statusCounts?.correct || 0}</div>
                      <div className="text-green-600">Correct</div>
                    </div>
                    <div className="bg-blue-50 p-2 rounded">
                      <div className="font-medium text-blue-900">{practiceOptions.statusCounts?.mastered || 0}</div>
                      <div className="text-blue-600">Mastered</div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded">
                      <div className="font-medium text-purple-900">{practiceOptions.statusCounts?.flagged || 0}</div>
                      <div className="text-purple-600">Flagged</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showTutorial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">How to Use Practice Creation</h2>
                <button onClick={() => setShowTutorial(false)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
              <div className="space-y-4 text-sm text-gray-600">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Quick Setup</h3>
                  <p>Use this for immediate practice with default settings. Select the number of questions and start.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Personalize</h3>
                  <p>Customize your practice by choosing specific subjects and difficulty levels.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Practice Mode</h3>
                  <p><strong>Mock Mode:</strong> Practice without time limits.<br/><strong>Timed Mode:</strong> Practice under time pressure.</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setShowTutorial(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
