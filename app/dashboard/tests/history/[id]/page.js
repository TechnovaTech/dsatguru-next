'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { FiCheckCircle, FiXCircle, FiArrowLeft } from 'react-icons/fi'

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
              const isCorrect = userAnswer === question.correctAnswer
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
  const attemptedCount = questions.filter(q => q.wasAttempted).length
  const wrongCount = questions.filter(q => q.wasAttempted && !q.isCorrect).length
  const unattemptedCount = questions.filter(q => !q.wasAttempted).length
  const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0

  const currentQ = questions[currentQuestion]

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Top Header */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard/tests/history')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <FiArrowLeft /> Back to History
        </button>
        <div className="text-base font-bold text-gray-900">
          Test Review - {new Date(session.completedAt || session.createdAt).toLocaleDateString()}
        </div>
        <div className="text-sm text-gray-600">
          Score: {session.totalScore || 0} / 1600
        </div>
      </div>

      {/* Main Split Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Passage + Question */}
        <div className="w-1/2 overflow-y-auto p-8 bg-gray-50 relative border-r border-gray-300">
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-gray-300 text-6xl font-bold transform -rotate-45 opacity-30 select-none">
              www.dsatguru.com
            </div>
          </div>
          
          {/* Content */}
          <div className="relative z-10">
            {/* Passage/Context */}
            {currentQ?.questionParagraph && (
              <div className="prose max-w-none mb-8">
                <p className="text-gray-800 leading-relaxed whitespace-pre-line">
                  {currentQ.questionParagraph}
                </p>
              </div>
            )}
            
            {/* Question Text */}
            <div className="mt-6">
              <p className="text-gray-900 text-base leading-relaxed font-medium">
                {currentQ?.question || currentQ?.content}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Question Number & Options */}
        <div className="w-1/2 overflow-y-auto p-8 bg-gray-50 relative">
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-gray-300 text-6xl font-bold transform -rotate-45 opacity-30 select-none">
              www.dsatguru.com
            </div>
          </div>
          
          {/* Content */}
          <div className="max-w-2xl mx-auto relative z-10">
            {/* Question Number & Status */}
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 rounded flex items-center justify-center font-bold text-lg text-white ${
                !currentQ.wasAttempted ? 'bg-gray-500' : currentQ.isCorrect ? 'bg-green-600' : 'bg-red-600'
              }`}>
                {currentQuestion + 1}
              </div>
              <div className="flex items-center gap-2">
                {!currentQ.wasAttempted ? (
                  <span className="text-gray-600 text-sm font-medium">NOT ATTEMPTED</span>
                ) : currentQ.isCorrect ? (
                  <>
                    <FiCheckCircle className="text-green-600" size={20} />
                    <span className="text-green-600 text-sm font-medium">CORRECT</span>
                  </>
                ) : (
                  <>
                    <FiXCircle className="text-red-600" size={20} />
                    <span className="text-red-600 text-sm font-medium">WRONG</span>
                  </>
                )}
              </div>
              <div className="ml-auto flex gap-2">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  {currentQ.subject}
                </span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  {currentQ.difficulty}
                </span>
              </div>
            </div>

            {/* Answer Options */}
            <div className="space-y-3 mb-6">
              {['A', 'B', 'C', 'D'].map((option) => {
                const isUserAnswer = currentQ.userAnswer === option
                const isCorrectAnswer = currentQ.correctAnswer === option
                
                return (
                  <div
                    key={option}
                    className={`w-full text-left border-2 rounded-lg p-4 ${
                      isCorrectAnswer
                        ? 'border-green-500 bg-green-50'
                        : isUserAnswer && !isCorrectAnswer
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-semibold ${
                        isCorrectAnswer
                          ? 'border-green-600 bg-green-600 text-white'
                          : isUserAnswer && !isCorrectAnswer
                          ? 'border-red-600 bg-red-600 text-white'
                          : 'border-gray-400 text-gray-700'
                      }`}>
                        {option}
                      </div>
                      <div className="flex-1 pt-1">
                        <span className="text-gray-900">{currentQ?.[`option${option}`]}</span>
                        {isCorrectAnswer && (
                          <span className="ml-2 text-green-600 text-sm font-semibold">✓ Correct</span>
                        )}
                        {isUserAnswer && !isCorrectAnswer && (
                          <span className="ml-2 text-red-600 text-sm font-semibold">✗ Your Answer</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Explanation Section */}
            {(!currentQ.wasAttempted || !currentQ.isCorrect) && (
              <div className={`border-2 rounded-lg p-4 ${
                !currentQ.wasAttempted 
                  ? 'bg-gray-50 border-gray-300' 
                  : 'bg-yellow-50 border-yellow-300'
              }`}>
                <p className={`font-semibold mb-3 flex items-center gap-2 ${
                  !currentQ.wasAttempted ? 'text-gray-900' : 'text-yellow-900'
                }`}>
                  <span className="text-xl">💡</span>
                  {!currentQ.wasAttempted ? 'Answer & Explanation' : 'Explanation'}
                </p>
                {currentQ.shortExplanation && (
                  <div className="mb-3">
                    <p className={`font-medium text-sm mb-1 ${
                      !currentQ.wasAttempted ? 'text-gray-700' : 'text-yellow-800'
                    }`}>
                      Quick Explanation:
                    </p>
                    <p className={!currentQ.wasAttempted ? 'text-gray-800' : 'text-yellow-800'}>
                      {currentQ.shortExplanation}
                    </p>
                  </div>
                )}
                <div>
                  <p className={`font-medium text-sm mb-1 ${
                    !currentQ.wasAttempted ? 'text-gray-700' : 'text-yellow-800'
                  }`}>
                    Detailed Explanation:
                  </p>
                  <p className={!currentQ.wasAttempted ? 'text-gray-800' : 'text-yellow-800'}>
                    {currentQ.longExplanation || currentQ.explanation || 'No detailed explanation available'}
                  </p>
                </div>
              </div>
            )}

            {/* Show success message for correct answers */}
            {currentQ.wasAttempted && currentQ.isCorrect && (
              <div className="border-2 rounded-lg p-4 bg-green-50 border-green-300">
                <p className="font-semibold text-green-900 flex items-center gap-2">
                  <FiCheckCircle className="text-green-600" size={20} />
                  Great job! You got this one right!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
            className="px-8 py-2.5 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Back
          </button>
          
          <div className="flex items-center gap-3 relative">
            <div className="text-center">
              <span className="text-sm text-gray-600">Question {currentQuestion + 1} of {questions.length}</span>
              <div className="flex gap-2 mt-1 text-xs">
                <span className="text-green-600">✓ {correctCount}</span>
                <span className="text-red-600">✗ {wrongCount}</span>
                <span className="text-gray-600">⊘ {unattemptedCount}</span>
              </div>
            </div>
            <button 
              onClick={() => setShowQuestionNav(!showQuestionNav)}
              className="px-4 py-2 border border-gray-300 rounded-full text-sm hover:bg-gray-50"
            >
              ▲
            </button>
            
            {showQuestionNav && (
              <div className="absolute bottom-full mb-2 right-0 bg-white border-2 border-gray-300 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto z-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Questions</h3>
                  <button onClick={() => setShowQuestionNav(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {questions.map((q, idx) => {
                    const isCurrent = idx === currentQuestion
                    return (
                      <button
                        key={idx}
                        onClick={() => { setCurrentQuestion(idx); setShowQuestionNav(false) }}
                        className={`w-10 h-10 rounded-full font-semibold text-sm ${
                          isCurrent ? 'ring-2 ring-blue-600' : ''
                        } ${
                          !q.wasAttempted ? 'bg-gray-400 text-white' :
                          q.isCorrect ? 'bg-green-500 text-white' :
                          'bg-red-500 text-white'
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
            className="px-8 py-2.5 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
