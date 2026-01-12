'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { FiCheckCircle, FiXCircle, FiDownload, FiArrowLeft } from 'react-icons/fi'

export default function TestReviewPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id

  const [session, setSession] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)

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
        
        console.log('Session data:', sessionData)
        console.log('Module answers:', sessionData.moduleAnswers)
        console.log('Total questions available:', allQuestions.length)
        
        // Match questions with answers from moduleAnswers
        const reviewQuestions = []
        const moduleAnswers = sessionData.moduleAnswers || {}
        
        Object.keys(moduleAnswers).forEach(moduleKey => {
          const answers = moduleAnswers[moduleKey]
          console.log(`Processing ${moduleKey}:`, Object.keys(answers).length, 'answers')
          
          Object.keys(answers).forEach(questionId => {
            const question = allQuestions.find(q => String(q._id) === String(questionId) || String(q.id) === String(questionId))
            if (question) {
              const userAnswer = answers[questionId]
              const isCorrect = userAnswer === question.correctAnswer
              reviewQuestions.push({
                ...question,
                userAnswer,
                isCorrect,
                module: moduleKey
              })
            } else {
              console.log('Question not found:', questionId)
            }
          })
        })

        console.log('Review questions matched:', reviewQuestions.length)
        setSession(sessionData)
        setQuestions(reviewQuestions)
      }
    } catch (error) {
      console.error('Error fetching review:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadWrongAnswers = () => {
    const wrongQuestions = questions.filter(q => !q.isCorrect)
    
    if (wrongQuestions.length === 0) {
      alert('No wrong answers to download!')
      return
    }
    
    let pdfContent = `WRONG ANSWERS PRACTICE SHEET\n`
    pdfContent += `${'='.repeat(80)}\n\n`
    pdfContent += `Test Date: ${new Date(session.completedAt || session.createdAt).toLocaleDateString()}\n`
    pdfContent += `Total Wrong: ${wrongQuestions.length}\n`
    pdfContent += `Total Score: ${session.totalScore || 0}\n\n`
    pdfContent += `${'='.repeat(80)}\n\n`

    wrongQuestions.forEach((q, idx) => {
      pdfContent += `QUESTION ${idx + 1}\n`
      pdfContent += `Subject: ${q.subject} | Difficulty: ${q.difficulty}\n`
      pdfContent += `${'-'.repeat(80)}\n\n`
      pdfContent += `${q.question || q.content}\n\n`
      pdfContent += `A) ${q.optionA}\n`
      pdfContent += `B) ${q.optionB}\n`
      pdfContent += `C) ${q.optionC}\n`
      pdfContent += `D) ${q.optionD}\n\n`
      pdfContent += `Your Answer: ${q.userAnswer} ✗\n`
      pdfContent += `Correct Answer: ${q.correctAnswer} ✓\n\n`
      pdfContent += `SHORT EXPLANATION:\n${q.shortExplanation || 'N/A'}\n\n`
      pdfContent += `DETAILED EXPLANATION:\n${q.longExplanation || q.explanation || 'No detailed explanation available'}\n\n`
      pdfContent += `${'='.repeat(80)}\n\n`
    })

    const blob = new Blob([pdfContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wrong-answers-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!session || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No review data available</p>
          <button
            onClick={() => router.push('/dashboard/tests/history')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to History
          </button>
        </div>
      </div>
    )
  }

  const correctCount = questions.filter(q => q.isCorrect).length
  const wrongCount = questions.length - correctCount
  const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard/tests/history')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <FiArrowLeft /> Back to History
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📝 Test Review</h1>
          <p className="text-gray-600">
            Completed on {new Date(session.completedAt || session.createdAt).toLocaleDateString()} at {new Date(session.completedAt || session.createdAt).toLocaleTimeString()}
          </p>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">{session.totalScore || 0}</p>
              <p className="text-sm text-gray-600">Total Score</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600">{correctCount}</p>
              <p className="text-sm text-gray-600">Correct</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-red-600">{wrongCount}</p>
              <p className="text-sm text-gray-600">Wrong</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-purple-600">{accuracy}%</p>
              <p className="text-sm text-gray-600">Accuracy</p>
            </div>
          </div>

          {session.rwScore > 0 || session.mathScore > 0 ? (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {session.rwScore > 0 && (
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 mb-1">Reading & Writing</p>
                  <p className="text-3xl font-bold text-blue-600">{session.rwScore}</p>
                </div>
              )}
              {session.mathScore > 0 && (
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 mb-1">Math</p>
                  <p className="text-3xl font-bold text-green-600">{session.mathScore}</p>
                </div>
              )}
            </div>
          ) : null}

          {wrongCount > 0 && (
            <button
              onClick={downloadWrongAnswers}
              className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 font-medium"
            >
              <FiDownload /> Download Wrong Answers for Practice ({wrongCount} questions)
            </button>
          )}
        </div>

        {/* Questions Review */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Question-by-Question Review</h2>
          
          {questions.map((q, idx) => {
            const options = q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : []
            
            return (
              <div
                key={q._id || idx}
                className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                  q.isCorrect ? 'border-green-500' : 'border-red-500'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {q.isCorrect ? (
                      <FiCheckCircle className="text-green-600 flex-shrink-0" size={24} />
                    ) : (
                      <FiXCircle className="text-red-600 flex-shrink-0" size={24} />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">Question {idx + 1}</h3>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {q.subject}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {q.difficulty}
                        </span>
                        {q.module && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            {q.module.replace('_', ' ').toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-gray-900 mb-4 text-lg">{q.question || q.content}</p>

                <div className="space-y-2 mb-4">
                  {['A', 'B', 'C', 'D'].map((option) => {
                    const optionText = q[`option${option}`] || options[option.charCodeAt(0) - 65] || ''
                    const isUserAnswer = q.userAnswer === option
                    const isCorrectAnswer = q.correctAnswer === option
                    
                    return (
                      <div
                        key={option}
                        className={`p-3 rounded-lg border-2 ${
                          isCorrectAnswer
                            ? 'border-green-500 bg-green-50'
                            : isUserAnswer && !isCorrectAnswer
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>
                            <span className="font-semibold">{option}.</span> {optionText}
                          </span>
                          {isCorrectAnswer && (
                            <span className="text-green-600 text-sm font-semibold">✓ Correct Answer</span>
                          )}
                          {isUserAnswer && !isCorrectAnswer && (
                            <span className="text-red-600 text-sm font-semibold">✗ Your Answer</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {!q.isCorrect && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="font-semibold text-yellow-900 mb-2">📝 Explanation:</p>
                    {q.shortExplanation && (
                      <p className="text-yellow-800 mb-2">
                        <span className="font-medium">Quick:</span> {q.shortExplanation}
                      </p>
                    )}
                    <p className="text-yellow-800">
                      <span className="font-medium">Detailed:</span> {q.longExplanation || q.explanation || 'No detailed explanation available'}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
