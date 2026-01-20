'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { FiCheckCircle, FiArrowRight } from 'react-icons/fi'

export default function RetestStartPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id

  const [allQuestions, setAllQuestions] = useState([])
  const [currentModule, setCurrentModule] = useState(1)
  const [currentSection, setCurrentSection] = useState('rw')
  const [moduleQuestions, setModuleQuestions] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})
  const [moduleAnswers, setModuleAnswers] = useState({})
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showModuleSummary, setShowModuleSummary] = useState(false)
  const [testCompleted, setTestCompleted] = useState(false)
  const [finalScore, setFinalScore] = useState(null)
  const [moduleScores, setModuleScores] = useState({})
  const [showQuestionNav, setShowQuestionNav] = useState(false)
  const testContainerRef = useRef(null)

  useEffect(() => {
    const retestQuestions = localStorage.getItem('retestQuestions')
    if (retestQuestions) {
      const questions = JSON.parse(retestQuestions)
      setAllQuestions(questions)
      setLoading(false)
    } else {
      router.push('/dashboard/tests/retest')
    }
  }, [])

  useEffect(() => {
    if (timeRemaining > 0 && !showModuleSummary && !testCompleted) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleModuleComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [timeRemaining, showModuleSummary, testCompleted])

  const loadModule = (section, moduleNum) => {
    const subject = section === 'rw' ? 'Reading and Writing' : 'Math'
    const questionCount = section === 'rw' ? 27 : 22
    const duration = section === 'rw' ? 32 : 35
    
    let filteredQuestions = allQuestions.filter(q => 
      q.subject === subject || 
      (q.subject === 'Reading & Writing' && subject === 'Reading and Writing')
    )
    
    if (filteredQuestions.length === 0) {
      alert(`Not enough ${subject} questions for retest`)
      router.push('/dashboard/tests/retest')
      return
    }
    
    let selectedQuestions = []
    
    if (moduleNum === 1) {
      selectedQuestions = filteredQuestions.slice(0, questionCount)
    } else {
      const startIndex = questionCount
      selectedQuestions = filteredQuestions.slice(startIndex, startIndex + questionCount)
    }
    
    if (selectedQuestions.length < questionCount) {
      alert(`Not enough questions for ${subject} Module ${moduleNum}`)
      router.push('/dashboard/tests/retest')
      return
    }
    
    setModuleQuestions(selectedQuestions)
    setCurrentQuestion(0)
    setAnswers({})
    setTimeRemaining(duration * 60)
  }

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleModuleComplete = () => {
    let correctCount = 0
    moduleQuestions.forEach(q => {
      if (answers[q._id] === q.correctAnswer) correctCount++
    })
    
    const moduleKey = `${currentSection}_module${currentModule}`
    setModuleScores(prev => ({ ...prev, [moduleKey]: correctCount }))
    setModuleAnswers(prev => ({ 
      ...prev, 
      [moduleKey]: {
        answers: answers,
        questionIds: moduleQuestions.map(q => q._id)
      }
    }))
    setShowModuleSummary(true)
  }

  const handleNextModule = () => {
    setShowModuleSummary(false)
    
    if (currentModule === 1) {
      setCurrentModule(2)
      loadModule(currentSection, 2)
    } else if (currentModule === 2 && currentSection === 'rw') {
      setCurrentSection('math')
      setCurrentModule(1)
      loadModule('math', 1)
    } else if (currentModule === 2 && currentSection === 'math') {
      calculateFinalScore()
    }
  }

  const calculateFinalScore = async () => {
    const rw1 = moduleScores.rw_module1 || 0
    const rw2 = moduleScores.rw_module2 || 0
    const math1 = moduleScores.math_module1 || 0
    const math2 = moduleScores.math_module2 || 0
    
    const rwScore = Math.round(((rw1 + rw2) / 54) * 800)
    const mathScore = Math.round(((math1 + math2) / 44) * 800)
    const total = rwScore + mathScore
    
    setFinalScore({ rwScore, mathScore, total })
    setTestCompleted(true)
    
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
          moduleScores,
          moduleAnswers,
          rwScore,
          mathScore,
          totalScore: total,
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

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (moduleQuestions.length === 0 && !testCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
          <div className="text-center">
            <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Start Retest?</h2>
            <p className="text-gray-600 mb-6">This retest includes all questions you got wrong or didn&apos;t attempt.</p>
            
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6 text-left">
              <ul className="space-y-2 text-sm text-gray-700">
                <li>✓ 4 Modules (2 R&W + 2 Math)</li>
                <li>✓ Timed like real SAT</li>
                <li>✓ Questions from your mistake pool</li>
              </ul>
            </div>

            <button
              onClick={() => loadModule('rw', 1)}
              className="w-full bg-orange-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-orange-700 transition-colors"
            >
              Start Retest
            </button>
            <button
              onClick={() => router.push('/dashboard/tests/retest')}
              className="w-full mt-3 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showModuleSummary) {
    const attemptedCount = Object.keys(answers).length
    const moduleKey = `${currentSection}_module${currentModule}`
    const correctCount = moduleScores[moduleKey]
    
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
          <div className="text-center">
            <FiCheckCircle className="mx-auto text-orange-600 mb-4" size={64} />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {currentSection === 'rw' ? 'Reading & Writing' : 'Math'} Module {currentModule} Complete
            </h2>
            <p className="text-gray-600 mb-6">Review your performance before continuing</p>
            
            <div className="bg-orange-50 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Questions Attempted</p>
                  <p className="text-3xl font-bold text-orange-600">{attemptedCount}/{moduleQuestions.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Correct Answers</p>
                  <p className="text-3xl font-bold text-green-600">{correctCount}</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleNextModule}
              className="w-full bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 flex items-center justify-center gap-2"
            >
              Continue to Next Module <FiArrowRight />
            </button>
          </div>
        </div>
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
            
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-8 mb-6">
              <p className="text-6xl font-bold text-orange-600 mb-4">{finalScore.total}</p>
              <p className="text-gray-700 text-lg mb-6">Total SAT Score</p>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Reading & Writing</p>
                  <p className="text-3xl font-bold text-blue-600">{finalScore.rwScore}</p>
                  <p className="text-xs text-gray-500 mt-1">out of 800</p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Math</p>
                  <p className="text-3xl font-bold text-green-600">{finalScore.mathScore}</p>
                  <p className="text-xs text-gray-500 mt-1">out of 800</p>
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

  const currentQ = moduleQuestions[currentQuestion]

  if (!currentQ) {
    return null
  }

  return (
    <div ref={testContainerRef} className="h-screen flex flex-col bg-white">
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="text-base font-bold text-gray-900">
          🔄 Retest - Section 1, Module {currentModule}: {currentSection === 'rw' ? 'Reading and Writing' : 'Math'}
        </div>
        <div className="text-lg font-bold text-gray-900">
          {formatTime(timeRemaining)}
        </div>
        <div></div>
      </div>

      <div className="flex-1 flex overflow-hidden">
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
              <button 
                onClick={() => {
                  // Intentionally no-op: "Mark for Review" behavior has been removed.
                  // We'll repurpose this button for a new action later.
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
              <span className="text-gray-500 text-sm">Mark for Review</span>
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

      <div className="bg-white border-t px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
            className="px-8 py-2.5 bg-orange-600 text-white rounded-full font-medium hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Back
          </button>
          
          <div className="flex items-center gap-3 relative">
            <span className="text-sm text-gray-600">Question {currentQuestion + 1} of {moduleQuestions.length}</span>
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
                  {moduleQuestions.map((q, idx) => {
                    const qId = String(q._id || q.id)
                    const isAnswered = !!answers[qId]
                    const isCurrent = idx === currentQuestion
                    return (
                      <button
                        key={idx}
                        onClick={() => { setCurrentQuestion(idx); setShowQuestionNav(false) }}
                        className={`w-10 h-10 rounded-full font-semibold text-sm ${
                          isCurrent ? 'bg-orange-600 text-white' :
                          isAnswered ? 'bg-green-500 text-white' :
                          'bg-gray-200 text-gray-700'
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
            onClick={() => {
              if (currentQuestion === moduleQuestions.length - 1) {
                handleModuleComplete()
              } else {
                setCurrentQuestion(prev => Math.min(moduleQuestions.length - 1, prev + 1))
              }
            }}
            className="px-8 py-2.5 bg-orange-600 text-white rounded-full font-medium hover:bg-orange-700"
          >
            {currentQuestion === moduleQuestions.length - 1 ? 'Submit Module' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
