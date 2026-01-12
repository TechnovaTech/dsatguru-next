'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { FiClock, FiCheckCircle, FiArrowRight } from 'react-icons/fi'

export default function TakeTestPage() {
  const router = useRouter()
  const params = useParams()
  const testId = params.id

  const [test, setTest] = useState(null)
  const [allQuestions, setAllQuestions] = useState([])
  const [currentModule, setCurrentModule] = useState(1)
  const [currentSection, setCurrentSection] = useState('rw') // 'rw' or 'math'
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

  useEffect(() => {
    fetchTestData()
  }, [testId])

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

  const fetchTestData = async () => {
    try {
      const token = localStorage.getItem('token')
      const [testRes, questionsRes] = await Promise.all([
        fetch(`/api/admin/tests/${testId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),
        fetch('/api/questions', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
      ])

      if (testRes.ok && questionsRes.ok) {
        const testData = await testRes.json()
        const questions = await questionsRes.json()
        
        console.log('Test data:', testData)
        console.log('Questions loaded:', questions.length)
        console.log('Sample question:', questions[0])
        
        setTest(testData)
        setAllQuestions(questions)
        
        // Start with R&W Module 1 if enabled, else Math Module 1
        if (testData.sections?.rw) {
          loadModule('rw', 1, questions, testData)
        } else if (testData.sections?.math) {
          setCurrentSection('math')
          loadModule('math', 1, questions, testData)
        }
      }
    } catch (error) {
      console.error('Error fetching test:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadModule = (section, moduleNum, questions, testData) => {
    const subject = section === 'rw' ? 'Reading and Writing' : 'Math'
    const questionCount = section === 'rw' ? 27 : 22
    const duration = section === 'rw' ? 32 : 35
    
    console.log(`Loading ${subject} Module ${moduleNum}`)
    console.log('Total questions available:', questions.length)
    
    let filteredQuestions = questions.filter(q => {
      // Try both formats
      return q.subject === subject || 
             q.subject === 'Reading & Writing' && subject === 'Reading and Writing' ||
             q.subject === 'Reading and Writing' && subject === 'Reading and Writing'
    })
    
    console.log(`Filtered ${subject} questions:`, filteredQuestions.length)
    
    if (filteredQuestions.length === 0) {
      console.error(`No questions found for subject: ${subject}`)
      alert(`No questions available for ${subject}. Please add questions to the question bank.`)
      return
    }
    
    let selectedQuestions = []
    
    if (moduleNum === 1) {
      // Module 1 (Baseline) - Balanced distribution
      const distribution = section === 'rw' 
        ? { easy: 7, medium: 12, hard: 8 }  // R&W Module 1
        : { easy: 6, medium: 11, hard: 5 }  // Math Module 1
      
      selectedQuestions = selectQuestionsByDistribution(filteredQuestions, distribution)
    } else {
      // Module 2 (Adaptive) - Based on Module 1 performance
      const module1Key = `${section}_module1`
      const module1Score = moduleScores[module1Key] || 0
      const routingPath = determineRoutingPath(module1Score, section, questionCount)
      
      const distribution = getAdaptiveDistribution(section, routingPath)
      selectedQuestions = selectQuestionsByDistribution(filteredQuestions, distribution)
    }
    
    console.log('Selected questions:', selectedQuestions.length)
    
    setModuleQuestions(selectedQuestions)
    setCurrentQuestion(0)
    setAnswers({})
    setTimeRemaining(duration * 60)
  }

  const selectQuestionsByDistribution = (questions, distribution) => {
    const easy = questions.filter(q => q.difficulty === 'Easy')
    const medium = questions.filter(q => q.difficulty === 'Medium')
    const hard = questions.filter(q => q.difficulty === 'Hard')
    
    const selected = [
      ...shuffleArray(easy).slice(0, distribution.easy),
      ...shuffleArray(medium).slice(0, distribution.medium),
      ...shuffleArray(hard).slice(0, distribution.hard)
    ]
    
    return shuffleArray(selected)
  }

  const shuffleArray = (array) => {
    return [...array].sort(() => Math.random() - 0.5)
  }

  const getAdaptiveDistribution = (section, path) => {
    if (section === 'rw') {
      // R&W Module 2 distributions (27 questions)
      if (path === 'low') return { easy: 13, medium: 10, hard: 4 }
      if (path === 'medium') return { easy: 7, medium: 12, hard: 8 }
      return { easy: 3, medium: 10, hard: 14 } // high
    } else {
      // Math Module 2 distributions (22 questions)
      if (path === 'low') return { easy: 11, medium: 8, hard: 3 }
      if (path === 'medium') return { easy: 6, medium: 10, hard: 6 }
      return { easy: 2, medium: 8, hard: 12 } // high
    }
  }

  const determineRoutingPath = (score, section, totalQuestions) => {
    const percentage = (score / totalQuestions) * 100
    
    if (section === 'rw') {
      // R&W routing: ≤40% = low, 45-74% = medium, ≥75% = high
      if (percentage <= 40) return 'low'
      if (percentage <= 74) return 'medium'
      return 'high'
    } else {
      // Math routing: ≤40% = low, 45-74% = medium, ≥75% = high
      if (percentage <= 40) return 'low'
      if (percentage <= 74) return 'medium'
      return 'high'
    }
  }

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleModuleComplete = () => {
    // Calculate module score
    let correctCount = 0
    moduleQuestions.forEach(q => {
      if (answers[q._id] === q.correctAnswer) correctCount++
    })
    
    const moduleKey = `${currentSection}_module${currentModule}`
    setModuleScores(prev => ({ ...prev, [moduleKey]: correctCount }))
    setModuleAnswers(prev => ({ ...prev, [moduleKey]: answers }))
    setShowModuleSummary(true)
  }

  const handleNextModule = () => {
    setShowModuleSummary(false)
    
    if (currentModule === 1) {
      // Move to Module 2 of same section
      setCurrentModule(2)
      loadModule(currentSection, 2, allQuestions, test)
    } else if (currentModule === 2 && currentSection === 'rw' && test.sections?.math) {
      // Move to Math Module 1
      setCurrentSection('math')
      setCurrentModule(1)
      loadModule('math', 1, allQuestions, test)
    } else if (currentModule === 2 && currentSection === 'math') {
      // Test complete
      calculateFinalScore()
    } else {
      // Test complete (only one section)
      calculateFinalScore()
    }
  }

  const calculateFinalScore = async () => {
    let rwScore = 0, mathScore = 0
    
    // Calculate R/W score
    if (test.sections?.rw) {
      const rw1 = moduleScores.rw_module1 || 0
      const rw2 = moduleScores.rw_module2 || 0
      rwScore = Math.round(((rw1 + rw2) / 54) * 800)
    }
    
    // Calculate Math score
    if (test.sections?.math) {
      const math1 = moduleScores.math_module1 || 0
      const math2 = moduleScores.math_module2 || 0
      mathScore = Math.round(((math1 + math2) / 44) * 800)
    }
    
    const total = rwScore + mathScore
    
    setFinalScore({ rwScore, mathScore, total })
    setTestCompleted(true)
    
    // Save to database with all required fields
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/test-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          testId,
          status: 'Completed',
          moduleScores,
          moduleAnswers,
          rwScore,
          mathScore,
          totalScore: total,
          completedAt: new Date().toISOString()
        })
      })
      
      if (response.ok) {
        console.log('Test session saved successfully')
      } else {
        console.error('Failed to save test session:', await response.text())
      }
    } catch (error) {
      console.error('Error saving test session:', error)
    }
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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
            <FiCheckCircle className="mx-auto text-blue-600 mb-4" size={64} />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {currentSection === 'rw' ? 'Reading & Writing' : 'Math'} Module {currentModule} Complete
            </h2>
            <p className="text-gray-600 mb-6">Review your performance before continuing</p>
            
            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Questions Attempted</p>
                  <p className="text-3xl font-bold text-blue-600">{attemptedCount}/{moduleQuestions.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Correct Answers</p>
                  <p className="text-3xl font-bold text-green-600">{correctCount}</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleNextModule}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">🎉 Test Completed!</h2>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8 mb-6">
              <p className="text-6xl font-bold text-blue-600 mb-4">{finalScore.total}</p>
              <p className="text-gray-700 text-lg mb-6">Total SAT Score</p>
              
              <div className="grid grid-cols-2 gap-6">
                {test.sections?.rw && (
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Reading & Writing</p>
                    <p className="text-3xl font-bold text-blue-600">{finalScore.rwScore}</p>
                    <p className="text-xs text-gray-500 mt-1">out of 800</p>
                  </div>
                )}
                {test.sections?.math && (
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Math</p>
                    <p className="text-3xl font-bold text-green-600">{finalScore.mathScore}</p>
                    <p className="text-xs text-gray-500 mt-1">out of 800</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard/tests/history')}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700"
              >
                📚 View Test History
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No questions available</p>
          <button
            onClick={() => router.push('/dashboard/tests')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Tests
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{test?.title}</h1>
            <p className="text-sm text-gray-600">
              {currentSection === 'rw' ? 'Reading & Writing' : 'Math'} - Module {currentModule}
            </p>
            <p className="text-xs text-gray-500">
              Question {currentQuestion + 1} of {moduleQuestions.length}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <FiClock className="text-blue-600" />
              {formatTime(timeRemaining)}
            </div>
            <button
              onClick={handleModuleComplete}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700"
            >
              Complete Module
            </button>
          </div>
        </div>
      </div>

      {/* Question Area */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <div className="flex items-start gap-3 mb-6">
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
              {currentQ?.subject}
            </span>
            <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm">
              {currentQ?.difficulty}
            </span>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            {currentQ?.question}
          </h2>

          <div className="space-y-3">
            {['A', 'B', 'C', 'D'].map((option) => (
              <button
                key={option}
                onClick={() => handleAnswer(currentQ._id, option)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  answers[currentQ._id] === option
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400'
                }`}
              >
                <span className="font-semibold text-gray-900">{option}.</span>{' '}
                {currentQ?.[`option${option}`]}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
            className="px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="text-sm text-gray-600">
            {Object.keys(answers).length} of {moduleQuestions.length} answered
          </div>

          <button
            onClick={() => setCurrentQuestion(prev => Math.min(moduleQuestions.length - 1, prev + 1))}
            disabled={currentQuestion === moduleQuestions.length - 1}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>

        {/* Question Navigator */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Question Navigator</h3>
          <div className="grid grid-cols-10 gap-2">
            {moduleQuestions.map((q, idx) => (
              <button
                key={q._id}
                onClick={() => setCurrentQuestion(idx)}
                className={`w-10 h-10 rounded-lg font-medium ${
                  idx === currentQuestion
                    ? 'bg-blue-600 text-white'
                    : answers[q._id]
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
