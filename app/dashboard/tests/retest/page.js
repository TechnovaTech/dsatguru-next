'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiArrowLeft, FiPlay, FiAlertCircle } from 'react-icons/fi'

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
    
    localStorage.setItem('retestQuestions', JSON.stringify(allWrongQuestions))
    localStorage.setItem('retestSessionId', 'retest-' + Date.now())
    router.push(`/dashboard/tests/retest/retest-${Date.now()}/start`)
  }

  const canStartRetest = stats.total >= 98

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard/tests')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <FiArrowLeft /> Back to Tests
          </button>
          <h1 className="text-3xl font-bold text-gray-900">🔄 Retest Dashboard</h1>
          <div className="w-32"></div>
        </div>

        {/* Main Stats Card */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg shadow-lg p-8 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Available Questions for Retest</h2>
              <p className="text-orange-100">Questions you got wrong or didn&apos;t attempt from all past tests</p>
            </div>
            <div className="text-6xl font-bold">{stats.total}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-white/20 rounded-lg p-4">
              <div className="text-sm opacity-90">Reading & Writing</div>
              <div className="text-3xl font-bold">{stats.rwCount}</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <div className="text-sm opacity-90">Math</div>
              <div className="text-3xl font-bold">{stats.mathCount}</div>
            </div>
          </div>
        </div>

        {/* Retest Action Card */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {!canStartRetest ? (
            <div className="text-center">
              <FiAlertCircle className="mx-auto text-yellow-500 w-16 h-16 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Not Enough Questions</h3>
              <p className="text-gray-600 mb-4">
                You need at least <span className="font-bold text-orange-600">98 questions</span> to start a full retest.
                <br />
                Currently available: <span className="font-bold">{stats.total} questions</span>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Take more tests to accumulate questions for retest practice.
              </p>
              <button
                onClick={() => router.push('/dashboard/tests')}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium"
              >
                Take a New Test
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                  <FiPlay className="text-green-600 w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready for Retest!</h3>
                <p className="text-gray-600 mb-2">
                  You have <span className="font-bold text-green-600">{stats.total} questions</span> available for practice.
                </p>
                <p className="text-sm text-gray-500">
                  This retest will include all questions you got wrong or didn&apos;t attempt from previous tests.
                </p>
              </div>
              
              <button
                onClick={startRetest}
                className="bg-orange-600 text-white px-10 py-4 rounded-lg hover:bg-orange-700 flex items-center gap-3 font-bold text-lg mx-auto shadow-lg"
              >
                <FiPlay /> Start Full Retest
              </button>
              
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-gray-600">
                  💡 Questions will be removed from this pool only when you answer them correctly.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
