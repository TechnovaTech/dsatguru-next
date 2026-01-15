'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiArrowLeft, FiPlay } from 'react-icons/fi'

export default function RetestPage() {
  const router = useRouter()
  const [completedTests, setCompletedTests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCompletedTests()
  }, [])

  const fetchCompletedTests = async () => {
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
        
        const completedSessions = sessions.filter(s => 
          s.status === 'Completed' && s.totalScore !== undefined && s.moduleAnswers
        )

        const testsWithWrongQuestions = completedSessions.map(session => {
          let wrongQuestions = []
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
                
                // Include if wrong OR not attempted
                if (!isCorrect || !wasAttempted) {
                  wrongQuestions.push({
                    ...question,
                    userAnswer: wasAttempted ? userAnswer : null,
                    wasAttempted,
                    module: moduleKey
                  })
                }
              }
            })
          })

          const rwWrong = wrongQuestions.filter(q => 
            q.subject === 'Reading and Writing' || q.subject === 'Reading & Writing'
          ).length
          const mathWrong = wrongQuestions.filter(q => q.subject === 'Math').length

          return {
            session,
            wrongQuestions,
            rwWrong,
            mathWrong,
            totalWrong: wrongQuestions.length
          }
        }).filter(t => t.totalWrong > 0)

        setCompletedTests(testsWithWrongQuestions)
      }
    } catch (error) {
      console.error('Error fetching tests:', error)
    } finally {
      setLoading(false)
    }
  }

  const startRetest = (testData) => {
    localStorage.setItem('retestQuestions', JSON.stringify(testData.wrongQuestions))
    localStorage.setItem('retestSessionId', testData.session._id)
    router.push(`/dashboard/tests/retest/${testData.session._id}/start`)
  }

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

        {completedTests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 mb-4">No completed tests with wrong answers</p>
            <button
              onClick={() => router.push('/dashboard/tests')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Take a Test
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {completedTests.map((testData, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Test from {new Date(testData.session.completedAt || testData.session.createdAt).toLocaleDateString()}
                    </h3>
                    <div className="flex gap-3 mb-3">
                      <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded">
                        Score: {testData.session.totalScore}/1600
                      </span>
                      <span className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded font-semibold">
                        {testData.totalWrong} Questions to Practice
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => startRetest(testData)}
                    className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 flex items-center gap-2 font-medium"
                  >
                    <FiPlay /> Start Retest
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-blue-900">📖 Reading & Writing</h4>
                      <span className="text-2xl font-bold text-blue-600">{testData.rwWrong}</span>
                    </div>
                    <p className="text-sm text-blue-700">Questions to practice</p>
                    <div className="mt-2 text-xs text-blue-600">
                      Score: {testData.session.rwScore || 0}/800
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-green-900">🔢 Math</h4>
                      <span className="text-2xl font-bold text-green-600">{testData.mathWrong}</span>
                    </div>
                    <p className="text-sm text-green-700">Questions to practice</p>
                    <div className="mt-2 text-xs text-green-600">
                      Score: {testData.session.mathScore || 0}/800
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    💡 Retake this test with questions you got wrong or didn't attempt to improve your score
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
