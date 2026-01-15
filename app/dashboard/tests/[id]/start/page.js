'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { FiClock, FiCheckCircle, FiArrowRight, FiAlertTriangle } from 'react-icons/fi'

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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [tabChangeWarning, setTabChangeWarning] = useState(false)
  const [alreadyTaken, setAlreadyTaken] = useState(false)
  const [checkingHistory, setCheckingHistory] = useState(true)
  const [showQuestionNav, setShowQuestionNav] = useState(false)
  const [markedQuestions, setMarkedQuestions] = useState(new Set())
  const testContainerRef = useRef(null)

  useEffect(() => {
    fetchTestData()
  }, [testId])

  // Fullscreen and tab change detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isFullscreen && !testCompleted && !showModuleSummary) {
        alert('Test terminated: You switched tabs or left the test window.')
        router.push('/dashboard/tests')
      }
    }

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen && !testCompleted && !showModuleSummary) {
        alert('Test terminated: You exited fullscreen mode.')
        router.push('/dashboard/tests')
      }
    }

    const handleEscKey = (e) => {
      if (e.key === 'Escape' && isFullscreen && !testCompleted && !showModuleSummary) {
        e.preventDefault()
        alert('Test terminated: You pressed ESC to exit fullscreen.')
        if (document.fullscreenElement) {
          document.exitFullscreen()
        }
        router.push('/dashboard/tests')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('keydown', handleEscKey)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [isFullscreen, testCompleted, showModuleSummary, router])

  const enterFullscreen = async () => {
    try {
      if (testContainerRef.current) {
        await testContainerRef.current.requestFullscreen()
        setIsFullscreen(true)
      }
    } catch (error) {
      console.error('Failed to enter fullscreen:', error)
      alert('Please allow fullscreen mode to start the test.')
    }
  }

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
      const [testRes, questionsRes, historyRes] = await Promise.all([
        fetch(`/api/admin/tests/${testId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),
        fetch('/api/questions', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),
        fetch('/api/test-sessions', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
      ])

      if (testRes.ok && questionsRes.ok) {
        const testData = await testRes.json()
        const questions = await questionsRes.json()
        
        // Check if user already took this test
        if (historyRes.ok) {
          const historyData = await historyRes.json()
          const sessions = historyData.sessions || historyData || []
          const alreadyCompleted = sessions.some(s => 
            String(s.testId) === String(testId) && 
            s.status === 'Completed' && 
            s.totalScore !== undefined
          )
          
          if (alreadyCompleted) {
            setAlreadyTaken(true)
            setCheckingHistory(false)
            setLoading(false)
            return
          }
        }
        
        setTest(testData)
        setAllQuestions(questions)
        
        // Don't auto-load module, wait for user to start
        if (testData.sections?.rw) {
          setCurrentSection('rw')
        } else if (testData.sections?.math) {
          setCurrentSection('math')
        }
      }
    } catch (error) {
      console.error('Error fetching test:', error)
    } finally {
      setCheckingHistory(false)
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
      
      if (!token) {
        console.error('No authentication token found')
        alert('Session not saved: Please log in again')
        return
      }
      
      const sessionData = {
        testId,
        status: 'Completed',
        moduleScores,
        moduleAnswers,
        rwScore,
        mathScore,
        totalScore: total,
        completedAt: new Date().toISOString()
      }
      
      console.log('Saving test session:', sessionData)
      
      const response = await fetch('/api/test-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(sessionData)
      })
      
      const responseData = await response.json()
      
      if (response.ok) {
        console.log('✅ Test session saved successfully:', responseData)
      } else {
        console.error('❌ Failed to save test session:', responseData)
        alert(`Failed to save test: ${responseData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('❌ Error saving test session:', error)
      alert('Failed to save test session. Please check console for details.')
    }
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Start test confirmation screen
  if (loading || checkingHistory) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Already taken test screen
  if (alreadyTaken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
          <div className="text-center">
            <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Test Already Completed</h2>
            <p className="text-gray-600 mb-6">
              You have already taken this test. Each test can only be attempted once to maintain test integrity.
            </p>
            
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 text-left">
              <p className="text-sm text-gray-700">
                💡 You can review your previous attempt in the Test History section.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard/tests/history')}
                className="w-full bg-purple-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-purple-700 transition-colors"
              >
                📚 View Test History
              </button>
              <button
                onClick={() => router.push('/dashboard/tests')}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Back to Tests
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isFullscreen && moduleQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
          <div className="text-center">
            <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiAlertTriangle className="text-blue-600" size={40} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Start?</h2>
            <p className="text-gray-600 mb-6">This test will open in fullscreen mode. Please note:</p>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 text-left">
              <ul className="space-y-2 text-sm text-gray-700">
                <li>✓ Test will run in fullscreen mode</li>
                <li>✓ Timer will start immediately</li>
                <li>⚠️ Switching tabs will terminate the test</li>
                <li>⚠️ Exiting fullscreen will terminate the test</li>
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  if (test.sections?.rw) {
                    loadModule('rw', 1, allQuestions, test)
                  } else if (test.sections?.math) {
                    loadModule('math', 1, allQuestions, test)
                  }
                  enterFullscreen()
                }}
                className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
              >
                Start Test in Fullscreen
              </button>
              <button
                onClick={() => router.push('/dashboard/tests')}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
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
    <div ref={testContainerRef} className="h-screen flex flex-col bg-white">
      {/* Top Header */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="text-base font-bold text-gray-900">
          Section 1, Module {currentModule}: {currentSection === 'rw' ? 'Reading and Writing' : 'Math'}
        </div>
        <div className="text-lg font-bold text-gray-900">
          {formatTime(timeRemaining)}
        </div>
        <button 
          className="text-gray-600 hover:text-gray-800 p-2"
          title="Flag"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" />
          </svg>
        </button>
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
            
            {/* Question Text - No Card */}
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
            {/* Question Number & Actions */}
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-black text-white w-12 h-12 rounded flex items-center justify-center font-bold text-lg">
                {currentQuestion + 1}
              </div>
              <button 
                onClick={async () => {
                  const qId = currentQ._id
                  const isMarked = markedQuestions.has(qId)
                  
                  try {
                    const token = localStorage.getItem('token')
                    if (isMarked) {
                      await fetch(`/api/marked-questions?questionId=${qId}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` }
                      })
                      setMarkedQuestions(prev => {
                        const newSet = new Set(prev)
                        newSet.delete(qId)
                        return newSet
                      })
                    } else {
                      await fetch('/api/marked-questions', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          questionId: qId,
                          testId,
                          testDate: new Date(),
                          subject: currentQ.subject,
                          difficulty: currentQ.difficulty,
                          section: currentSection
                        })
                      })
                      setMarkedQuestions(prev => new Set([...prev, qId]))
                    }
                  } catch (error) {
                    console.error('Error marking question:', error)
                  }
                }}
                className={markedQuestions.has(currentQ._id) ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-gray-600'}
              >
                <svg className="w-6 h-6" fill={markedQuestions.has(currentQ._id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
              <span className="text-gray-500 text-sm">Mark for Review</span>
              <button className="ml-auto text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>

            {/* Answer Options */}
            <div className="space-y-3">
              {['A', 'B', 'C', 'D'].map((option) => {
                const isSelected = answers[currentQ._id] === option
                return (
                  <button
                    key={option}
                    onClick={() => handleAnswer(currentQ._id, option)}
                    className={`w-full text-left border-2 rounded-lg p-4 transition-all ${
                      isSelected
                        ? 'border-gray-400 bg-gray-50'
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-semibold ${
                        isSelected
                          ? 'border-gray-600 bg-gray-600 text-white'
                          : 'border-gray-400 text-gray-700'
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
            className="px-8 py-2.5 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
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
                          isCurrent ? 'bg-blue-600 text-white' :
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
            onClick={() => setCurrentQuestion(prev => Math.min(moduleQuestions.length - 1, prev + 1))}
            disabled={currentQuestion === moduleQuestions.length - 1}
            className="px-8 py-2.5 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
