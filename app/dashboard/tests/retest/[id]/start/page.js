'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { FiCheckCircle, FiArrowRight } from 'react-icons/fi'

export default function RetestStartPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id

  const [questions, setQuestions] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [testCompleted, setTestCompleted] = useState(false)
  const [finalScore, setFinalScore] = useState(null)
  const [showQuestionNav, setShowQuestionNav] = useState(false)
  const testContainerRef = useRef(null)

  useEffect(() => {
    const retestQuestions = localStorage.getItem('retestQuestions')
    if (retestQuestions) {
      setQuestions(JSON.parse(retestQuestions))
      setLoading(false)
    } else {
      router.push('/dashboard/tests/retest')
    }
  }, [])

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleComplete = async () => {
    let correctCount = 0
    questions.forEach(q => {
      if (answers[q._id] === q.correctAnswer) correctCount++
    })

    const accuracy = Math.round((correctCount / questions.length) * 100)
    
    setFinalScore({
      correct: correctCount,
      total: questions.length,
      accuracy
    })
    setTestCompleted(true)

    // Save retest result
    try {
      const token = localStorage.getItem('token')
      await fetch('/api/test-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          testId: null,
          status: 'Completed',
          sessionType: 'Retest',
          totalQuestions: questions.length,
          correctAnswers: correctCount,
          score: accuracy,
          completedAt: new Date().toISOString(),
          originalSessionId: sessionId
        })
      })
    } catch (error) {
      console.error('Error saving retest:', error)
    }

    localStorage.removeItem('retestQuestions')
    localStorage.removeItem('retestSessionId')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (testCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-3xl w-full">
          <div className="text-center">
            <FiCheckCircle className="mx-auto text-green-600 mb-4" size={64} />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">🎉 Retest Completed!</h2>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8 mb-6">
              <p className="text-6xl font-bold text-blue-600 mb-4">{finalScore.accuracy}%</p>
              <p className="text-gray-700 text-lg mb-6">Accuracy</p>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Correct</p>
                  <p className="text-3xl font-bold text-green-600">{finalScore.correct}</p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Total</p>
                  <p className="text-3xl font-bold text-blue-600">{finalScore.total}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard/tests/retest')}
                className="w-full bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700"
              >
                Back to Retest Dashboard
              </button>
              <button
                onClick={() => router.push('/dashboard/tests')}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
              >
                Back to Tests
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentQ = questions[currentQuestion]

  return (
    <div ref={testContainerRef} className="h-screen flex flex-col bg-white">
      {/* Top Header */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="text-base font-bold text-gray-900">
          🔄 Retest - Wrong & Unattempted Questions
        </div>
        <div className="text-lg font-bold text-gray-900">
          Question {currentQuestion + 1} of {questions.length}
        </div>
        <div></div>
      </div>

      {/* Main Split Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Passage + Question */}
        <div className="w-1/2 overflow-y-auto p-8 bg-gray-50 relative border-r border-gray-300">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-gray-300 text-6xl font-bold transform -rotate-45 opacity-30 select-none">
              www.dsatguru.com
            </div>
          </div>
          
          <div className="relative z-10">
            {currentQ?.questionParagraph && (
              <div className="prose max-w-none mb-8">
                <p className="text-gray-800 leading-relaxed whitespace-pre-line">
                  {currentQ.questionParagraph}
                </p>
              </div>
            )}
            
            <div className="mt-6">
              <p className="text-gray-900 text-base leading-relaxed font-medium">
                {currentQ?.question || currentQ?.content}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Options */}
        <div className="w-1/2 overflow-y-auto p-8 bg-gray-50 relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-gray-300 text-6xl font-bold transform -rotate-45 opacity-30 select-none">
              www.dsatguru.com
            </div>
          </div>
          
          <div className="max-w-2xl mx-auto relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-orange-600 text-white w-12 h-12 rounded flex items-center justify-center font-bold text-lg">
                {currentQuestion + 1}
              </div>
              <div className="flex gap-2">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  {currentQ?.subject}
                </span>
                <span className={`text-xs px-2 py-1 rounded ${
                  currentQ?.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                  currentQ?.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {currentQ?.difficulty}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {['A', 'B', 'C', 'D'].map((option) => {
                const isSelected = answers[currentQ._id] === option
                return (
                  <button
                    key={option}
                    onClick={() => handleAnswer(currentQ._id, option)}
                    className={`w-full text-left border-2 rounded-lg p-4 transition-all ${
                      isSelected ? 'border-orange-400 bg-orange-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-semibold ${
                        isSelected ? 'border-orange-600 bg-orange-600 text-white' : 'border-gray-400 text-gray-700'
                      }`}>
                        {option}
                      </div>
                      <div className="flex-1 pt-1">
                        <span className="text-gray-900">{currentQ?.[`option${option}`]}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
            className="px-8 py-2.5 bg-orange-600 text-white rounded-full font-medium hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Back
          </button>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              Answered: {Object.keys(answers).length}/{questions.length}
            </span>
          </div>
          
          {currentQuestion === questions.length - 1 ? (
            <button
              onClick={handleComplete}
              className="px-8 py-2.5 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 flex items-center gap-2"
            >
              Complete <FiCheckCircle />
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
              className="px-8 py-2.5 bg-orange-600 text-white rounded-full font-medium hover:bg-orange-700"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
