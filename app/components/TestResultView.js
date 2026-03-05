'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiArrowLeft, FiChevronDown, FiChevronUp, FiActivity, FiMonitor, FiMaximize, FiCheckSquare, FiUsers } from 'react-icons/fi'

export default function TestResultView({ testId, sessionId, returnUrl, viewMode }) {
  const router = useRouter()
  
  const [session, setSession] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedQuestions, setExpandedQuestions] = useState({}) // { questionId: true/false }
  const [showExplanation, setShowExplanation] = useState({}) // { questionId: true/false }
  const [filterStatus, setFilterStatus] = useState('all') // 'all', 'correct', 'incorrect', 'omitted', 'unattempted'
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [testAnalytics, setTestAnalytics] = useState(null) // For admin view - aggregated stats
  const [incorrectReasons, setIncorrectReasons] = useState({}) // { questionId: { reason: '', otherText: '' } }
  const [showReasonModal, setShowReasonModal] = useState(null) // questionId of modal being shown

  useEffect(() => {
    fetchResult()
    // Fetch test analytics for both admin and student views
    if (testId) {
      fetchTestAnalytics()
    }
  }, [testId, sessionId, viewMode])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFilterDropdown && !event.target.closest('.filter-dropdown-container')) {
        setShowFilterDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFilterDropdown])

  const fetchResult = async () => {
    try {
      const token = localStorage.getItem('token')
      
      let targetSessionId = sessionId
      
      // If no session ID in query, try to find the latest session for this test
      if (!targetSessionId) {
          const sessionsRes = await fetch('/api/test-sessions', {
             headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
          if (sessionsRes.ok) {
              const data = await sessionsRes.json()
              const sessions = data.sessions || data || []
              // Filter for this testId
              const testSessions = sessions.filter(s => 
                  (s.testId?._id === testId || s.testId === testId)
              )
              if (testSessions.length > 0) {
                  // Sort by createdAt descending just in case
                  testSessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  targetSessionId = testSessions[0]._id
              }
          }
      }

      if (!targetSessionId) {
          setLoading(false)
          return
      }

      // Fetch session first
      const sessionRes = await fetch(`/api/test-sessions/${targetSessionId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json()
        let allQuestions = []
        let testQuestions = []

        // Get all questions from the test
        const actualTestId = sessionData.testId?._id || sessionData.testId || testId
        if (actualTestId) {
          try {
            const testRes = await fetch(`/api/tests/${actualTestId}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {}
            })
            if (testRes.ok) {
              const testData = await testRes.json()
              if (testData.questions && testData.questions.length > 0) {
                testQuestions = testData.questions
                console.log('Fetched test questions:', testQuestions.length)
              }
            }
          } catch (err) {
            console.error('Error fetching test questions:', err)
          }
        }

        // Use pre-fetched questions if available (Performance optimization)
        if (sessionData.questions && sessionData.questions.length > 0) {
             allQuestions = sessionData.questions
        } else if (testQuestions.length > 0) {
             allQuestions = testQuestions
        } else {
             // Fallback to fetching all questions
             const questionsRes = await fetch('/api/questions', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
             })
             if (questionsRes.ok) {
                 allQuestions = await questionsRes.json()
             }
        }
        
        // Create a map of responses for quick lookup
        const responsesMap = {}
        const visitedQuestions = new Set()
        
        if (sessionData.responses && sessionData.responses.length > 0) {
            sessionData.responses.forEach(resp => {
                const qId = String(resp.questionId)
                responsesMap[qId] = resp
                visitedQuestions.add(qId) // Mark as visited
            })
        } else if (sessionData.moduleAnswers) {
            // Fallback for older sessions
            Object.keys(sessionData.moduleAnswers).forEach(moduleKey => {
                const moduleData = sessionData.moduleAnswers[moduleKey]
                let answers = moduleData.answers || moduleData
                Object.keys(answers).forEach(qId => {
                    responsesMap[qId] = {
                        questionId: qId,
                        selectedAnswer: answers[qId],
                        isCorrect: false, // Will be calculated
                        timeSpent: 0
                    }
                    visitedQuestions.add(qId)
                })
            })
        }
        
        // Also check for visited questions without answers (omitted)
        if (sessionData.visitedQuestions && Array.isArray(sessionData.visitedQuestions)) {
            sessionData.visitedQuestions.forEach(qId => {
                visitedQuestions.add(String(qId))
            })
        }

        // Get all questions from test (if available) or use all questions
        const questionsToShow = testQuestions.length > 0 ? testQuestions : allQuestions
        
        console.log('Questions to show:', questionsToShow.length)
        console.log('Responses count:', Object.keys(responsesMap).length)
        
        const reviewQuestions = []
        // Show ALL questions from the test
        questionsToShow.forEach(q => {
            const qId = String(q._id)
            const resp = responsesMap[qId]
            const wasVisited = visitedQuestions.has(qId) || !!resp
            
            // Normalize options
            const options = q.options || {
                A: q.optionA,
                B: q.optionB,
                C: q.optionC,
                D: q.optionD
            }

            const questionData = {
                ...q,
                options,
                userAnswer: resp ? resp.selectedAnswer : null,
                isCorrect: resp ? resp.isCorrect : false,
                timeSpent: resp ? resp.timeSpent : 0,
                wasVisited: wasVisited,
                incorrectReason: resp?.incorrectReason || null,
                incorrectReasonOther: resp?.incorrectReasonOther || null,
                _id: q._id
            }
            
            reviewQuestions.push(questionData)
            
            // Debug log for incorrect questions with reasons
            if (!questionData.isCorrect && questionData.userAnswer) {
                console.log('Incorrect question:', q._id, 'Reason:', questionData.incorrectReason, 'Other:', questionData.incorrectReasonOther)
                console.log('Response data:', resp)
            }
            
            // Debug log
            if (!wasVisited) {
                console.log('Unvisited question:', q._id, 'Title:', q.title || q.content?.substring(0, 50))
            } else if (!resp) {
                console.log('Visited but omitted:', q._id, 'Title:', q.title || q.content?.substring(0, 50))
            }
        })
        
        console.log('Total review questions:', reviewQuestions.length)

        setSession(sessionData)
        setQuestions(reviewQuestions)
        
        // Load saved reasons
        const savedReasons = {}
        reviewQuestions.forEach(q => {
          if (q.incorrectReason) {
            savedReasons[q._id] = {
              reason: q.incorrectReason,
              otherText: q.incorrectReasonOther || ''
            }
          }
        })
        setIncorrectReasons(savedReasons)
        
        // Auto-expand all questions and explanations initially
        const initialExpanded = {}
        const initialExplanations = {}
        reviewQuestions.forEach(q => {
          initialExpanded[q._id] = true
          initialExplanations[q._id] = true // Auto-show all explanations
        })
        setExpandedQuestions(initialExpanded)
        setShowExplanation(initialExplanations)
      }
    } catch (error) {
      console.error('Error fetching result:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (id) => {
    setExpandedQuestions(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleExplanation = (id) => {
    setShowExplanation(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const fetchTestAnalytics = async () => {
    try {
      const token = localStorage.getItem('token')
      // Try admin endpoint first, if fails try student endpoint
      let res = await fetch(`/api/admin/tutor/tests/${testId}/analytics`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      // If admin endpoint fails (403/401), try student endpoint
      if (!res.ok && (res.status === 401 || res.status === 403)) {
        res = await fetch(`/api/tests/${testId}/analytics`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
      }
      
      if (res.ok) {
        const data = await res.json()
        setTestAnalytics(data)
      }
    } catch (error) {
      console.error('Error fetching test analytics:', error)
    }
  }

  const getQuestionAnalytics = (questionId) => {
    if (!testAnalytics || !testAnalytics.questions) return null
    return testAnalytics.questions.find(q => String(q.questionId) === String(questionId))
  }

  const reasonOptions = [
    "I did not know the concept clearly",
    "I did not use desmos or made a mistake in desmos",
    "I did not understand what the question was asking clearly",
    "Made a silly mistake like wrong calculation or + or – sign",
    "Other"
  ]

  const handleReasonChange = (questionId, reason) => {
    setIncorrectReasons(prev => ({
      ...prev,
      [questionId]: {
        reason: reason,
        otherText: reason === 'Other' ? (prev[questionId]?.otherText || '') : ''
      }
    }))
  }

  const handleOtherTextChange = (questionId, text) => {
    setIncorrectReasons(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        otherText: text
      }
    }))
  }

  const canSubmitAnalysis = () => {
    const incorrectQuestions = questions.filter(q => !q.isCorrect && q.userAnswer)
    return incorrectQuestions.every(q => {
      const reason = incorrectReasons[q._id]
      if (!reason || !reason.reason) return false
      if (reason.reason === 'Other' && !reason.otherText?.trim()) return false
      return true
    })
  }

  const handleSubmitAnalysis = async () => {
    if (!canSubmitAnalysis()) {
      alert('Please provide reasons for all incorrect answers before submitting.')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/test-sessions/${sessionId}/reasons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reasons: incorrectReasons })
      })

      if (res.ok) {
        alert('Analysis submitted successfully!')
        // Update session to mark as submitted
        setSession(prev => ({ ...prev, analysisSubmitted: true, analysisSubmittedAt: new Date() }))
        
        // Optionally redirect back to the test list after a short delay
        setTimeout(() => {
          if (returnUrl) {
            router.push(returnUrl)
          }
        }, 1500)
      } else {
        alert('Failed to submit analysis')
      }
    } catch (error) {
      console.error('Error submitting analysis:', error)
      alert('Failed to submit analysis')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-900"></div>
      </div>
    )
  }

  if (!session) return <div className="p-8 text-center">Session not found</div>

  // Calculate Stats
  const totalQuestions = questions.length
  const correctCount = questions.filter(q => q.isCorrect).length
  const incorrectCount = questions.filter(q => !q.isCorrect && q.userAnswer).length
  const omittedCount = questions.filter(q => !q.userAnswer && q.wasVisited).length
  const unvisitedCount = questions.filter(q => !q.wasVisited).length
  const accuracy = totalQuestions > 0 ? ((correctCount / totalQuestions) * 100).toFixed(2) : 0
  const totalTime = session.timeSpent || 0
  const formattedTime = `${Math.floor(totalTime / 60)}:${(totalTime % 60).toString().padStart(2, '0')}`

  // Filter questions based on selected filter
  const filteredQuestions = questions.filter(q => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'correct') return q.isCorrect
    if (filterStatus === 'incorrect') return !q.isCorrect && q.userAnswer
    if (filterStatus === 'omitted') return !q.userAnswer && q.wasVisited
    if (filterStatus === 'unattempted') return !q.wasVisited
    return true
  })

  const filterOptions = [
    { value: 'all', label: 'All Questions', count: totalQuestions, color: 'gray' },
    { value: 'correct', label: 'Correct', count: correctCount, color: 'green' },
    { value: 'incorrect', label: 'Incorrect', count: incorrectCount, color: 'red' },
    { value: 'omitted', label: 'Omitted', count: omittedCount, color: 'orange' },
    { value: 'unattempted', label: 'Unvisited', count: unvisitedCount, color: 'gray' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-30 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push(returnUrl)} className="text-gray-400 hover:text-gray-600">
                        <FiArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">
                            {session.subject?.toUpperCase() || 'TEST'} - {session.testId?.title || 'Practice Session'} ({formattedTime} Mins)
                        </h1>
                        <p className="text-xs text-gray-500">
                            Completed on {new Date(session.completedAt || session.updatedAt || session.createdAt).toLocaleString()}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {viewMode !== 'admin' && (
                        <>
                            {session?.analysisSubmitted ? (
                                <button 
                                    className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 flex items-center gap-2"
                                >
                                    <FiCheckCircle /> Analysis Submitted
                                </button>
                            ) : (
                                <button 
                                    onClick={handleSubmitAnalysis}
                                    disabled={!canSubmitAnalysis()}
                                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                                        canSubmitAnalysis() 
                                            ? 'bg-purple-900 text-white hover:bg-purple-800' 
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                                    title={!canSubmitAnalysis() ? 'Please provide reasons for all incorrect answers' : 'Submit Analysis'}
                                >
                                    Submit Analysis
                                </button>
                            )}
                            <button className="px-4 py-2 border border-purple-200 text-purple-900 text-sm font-bold rounded-lg hover:bg-purple-50">
                                View Scaled Score
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
            
            {/* Overall Score */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-sm font-bold text-gray-900 mb-4 border-b pb-2">Overall Score</h2>
                <div className="grid grid-cols-3 gap-8 text-center">
                    <div>
                        <div className="text-3xl font-bold text-gray-900">{correctCount}/{totalQuestions}</div>
                        <div className="text-xs text-gray-500 font-medium uppercase mt-1">Total Questions</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-gray-900">
                            {questions.filter(q => q.domain === 'Reading and Writing').filter(q => q.isCorrect).length} / 
                            {questions.filter(q => q.domain === 'Reading and Writing').length}
                        </div>
                        <div className="text-xs text-gray-500 font-medium uppercase mt-1">Reading and Writing</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-gray-900">
                            {questions.filter(q => q.domain === 'Math').filter(q => q.isCorrect).length} / 
                            {questions.filter(q => q.domain === 'Math').length}
                        </div>
                        <div className="text-xs text-gray-500 font-medium uppercase mt-1">Math</div>
                    </div>
                </div>
            </div>

            {/* Section Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-sm font-bold text-gray-900 mb-4 border-b pb-2">Section Overview</h2>
                <div className="flex flex-wrap gap-6 items-center text-sm">
                    <div className="font-medium text-gray-900">{session.testId?.title || 'General Practice'}</div>
                    <div className="flex items-center gap-2 text-green-600 font-bold">
                        <span>{correctCount} Correct</span>
                    </div>
                    <div className="flex items-center gap-2 text-red-600 font-bold">
                        <span>{incorrectCount} Incorrect</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 font-bold">
                        <span>{omittedCount} Omitted</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 font-bold">
                        <span>{unvisitedCount} Unvisited</span>
                    </div>
                    <div className="bg-gray-100 px-3 py-1 rounded-full text-gray-700 font-bold">
                        {accuracy}% Accuracy
                    </div>
                    <div className="bg-gray-100 px-3 py-1 rounded-full text-gray-700 font-bold">
                        {formattedTime} Minutes Taken
                    </div>
                </div>
            </div>

            {/* Overall Test Analytics - Show for everyone if data available */}
            {testAnalytics && testAnalytics.totalStudents > 0 && (
                <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 rounded-xl shadow-md border border-purple-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <FiUsers className="text-purple-600" />
                            Overall Test Analytics
                        </h2>
                        <span className="px-4 py-2 bg-white rounded-lg border border-purple-200 text-sm font-bold text-purple-900">
                            {testAnalytics.totalStudents} Students Completed
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Average Correct */}
                        <div className="bg-white rounded-lg p-5 border border-green-100 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-semibold text-gray-700">Average Correct Rate</span>
                                <FiCheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="text-3xl font-bold text-green-600 mb-2">
                                {Math.round(testAnalytics.questions.reduce((sum, q) => sum + q.correctPercentage, 0) / testAnalytics.questions.length)}%
                            </div>
                            <div className="text-xs text-gray-500">
                                Across all {testAnalytics.questions.length} questions
                            </div>
                        </div>

                        {/* Average Incorrect */}
                        <div className="bg-white rounded-lg p-5 border border-red-100 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-semibold text-gray-700">Average Incorrect Rate</span>
                                <FiXCircle className="w-5 h-5 text-red-600" />
                            </div>
                            <div className="text-3xl font-bold text-red-600 mb-2">
                                {Math.round(testAnalytics.questions.reduce((sum, q) => sum + q.incorrectPercentage, 0) / testAnalytics.questions.length)}%
                            </div>
                            <div className="text-xs text-gray-500">
                                Across all {testAnalytics.questions.length} questions
                            </div>
                        </div>

                        {/* Average Omitted */}
                        <div className="bg-white rounded-lg p-5 border border-orange-100 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-semibold text-gray-700">Average Omitted Rate</span>
                                <FiAlertCircle className="w-5 h-5 text-orange-600" />
                            </div>
                            <div className="text-3xl font-bold text-orange-600 mb-2">
                                {Math.round(testAnalytics.questions.reduce((sum, q) => sum + q.omittedPercentage, 0) / testAnalytics.questions.length)}%
                            </div>
                            <div className="text-xs text-gray-500">
                                Across all {testAnalytics.questions.length} questions
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <FiActivity className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-bold">Relevant Detected</div>
                        <div className="text-lg font-bold text-blue-600">0 Times</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm flex items-center gap-3">
                    <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                        <FiMonitor className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-bold">Tab Activity</div>
                        <div className="text-lg font-bold text-orange-600">3 Times</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                        <FiClock className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-bold">Test Resumes</div>
                        <div className="text-lg font-bold text-purple-600">0 Resumed</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-cyan-100 shadow-sm flex items-center gap-3">
                    <div className="bg-cyan-100 p-2 rounded-lg text-cyan-600">
                        <FiMaximize className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-bold">Fullscreen</div>
                        <div className="text-lg font-bold text-cyan-600">4 Times</div>
                    </div>
                </div>
            </div>

            {/* Question Wise Report */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h2 className="text-sm font-bold text-gray-900">
                        Question wise report 
                        {filterStatus !== 'all' && (
                            <span className="ml-2 text-xs font-normal text-gray-500">
                                (Showing {filteredQuestions.length} of {totalQuestions})
                            </span>
                        )}
                    </h2>
                    <div className="flex gap-2 relative filter-dropdown-container">
                        <button 
                            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                            className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                            <span>Filter By</span>
                            {filterStatus !== 'all' && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                    filterStatus === 'correct' ? 'bg-green-100 text-green-700' :
                                    filterStatus === 'incorrect' ? 'bg-red-100 text-red-700' :
                                    'bg-orange-100 text-orange-700'
                                }`}>
                                    {filterOptions.find(f => f.value === filterStatus)?.label}
                                </span>
                            )}
                            <FiChevronDown className={`w-4 h-4 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Filter Dropdown */}
                        {showFilterDropdown && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                                <div className="p-2 bg-gray-50 border-b">
                                    <p className="text-xs font-bold text-gray-600 uppercase">Filter Questions By Status</p>
                                </div>
                                <div className="p-1">
                                    {filterOptions.map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => {
                                                setFilterStatus(option.value)
                                                setShowFilterDropdown(false)
                                            }}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                                                filterStatus === option.value 
                                                    ? 'bg-purple-50 text-purple-900 border border-purple-200' 
                                                    : 'hover:bg-gray-50 text-gray-700'
                                            }`}
                                        >
                                            <span className="flex items-center gap-2">
                                                {option.value === 'correct' && <FiCheckCircle className="w-4 h-4 text-green-600" />}
                                                {option.value === 'incorrect' && <FiXCircle className="w-4 h-4 text-red-600" />}
                                                {option.value === 'omitted' && <FiAlertCircle className="w-4 h-4 text-orange-600" />}
                                                {option.value === 'unattempted' && <FiAlertCircle className="w-4 h-4 text-gray-400" />}
                                                {option.value === 'all' && <FiCheckSquare className="w-4 h-4 text-gray-600" />}
                                                {option.label}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                                option.value === 'correct' ? 'bg-green-100 text-green-700' :
                                                option.value === 'incorrect' ? 'bg-red-100 text-red-700' :
                                                option.value === 'omitted' ? 'bg-orange-100 text-orange-700' :
                                                option.value === 'unattempted' ? 'bg-gray-100 text-gray-600' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {option.count}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="divide-y">
                    {filteredQuestions.length === 0 ? (
                        <div className="p-12 text-center">
                            <FiAlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No questions found for this filter</p>
                            <button 
                                onClick={() => setFilterStatus('all')}
                                className="mt-3 text-sm text-purple-600 hover:text-purple-800 font-medium"
                            >
                                Clear filter
                            </button>
                        </div>
                    ) : (
                        filteredQuestions.map((q, idx) => {
                            // Find original question number
                            const originalIndex = questions.findIndex(question => question._id === q._id)
                            return (
                        <div key={q._id} className="p-6">
                            {/* Question Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-red-50 text-red-600 font-bold w-8 h-8 flex items-center justify-center rounded border border-red-100">
                                        {originalIndex + 1}
                                    </div>
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded uppercase">MCQ</span>
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${
                                        q.isCorrect 
                                            ? 'bg-green-100 text-green-700' 
                                            : q.userAnswer 
                                                ? 'bg-red-100 text-red-700'
                                                : q.wasVisited
                                                    ? 'bg-orange-100 text-orange-700'
                                                    : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {q.isCorrect ? 'Correct' : q.userAnswer ? 'Incorrect' : q.wasVisited ? 'Omitted' : 'Unvisited'}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
                                        <FiClock className="w-3 h-3" /> {q.timeSpent ? `${Math.floor(q.timeSpent/60)}:${(q.timeSpent%60).toString().padStart(2,'0')} Mins` : '00:00'}
                                    </span>
                                    {viewMode === 'admin' && q.questionId && (
                                        <div className="flex items-center gap-1">
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded border ${
                                                q.isTutor 
                                                    ? 'bg-blue-100 text-blue-700 border-blue-200' 
                                                    : 'bg-green-100 text-green-700 border-green-200'
                                            }`} title={q.isTutor ? "Tutor Question Bank" : "Admin Question Bank"}>
                                                {q.isTutor ? 'Tutor' : 'Admin'}
                                            </span>
                                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded border border-purple-200" title="Question ID">
                                                {q.questionId}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {q.userAnswer && (
                                        <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200">Answered</span>
                                    )}
                                    {!q.userAnswer && q.wasVisited && (
                                        <span className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-bold rounded-full border border-orange-200">Omitted</span>
                                    )}
                                    {!q.wasVisited && (
                                        <span className="px-3 py-1 bg-gray-50 text-gray-500 text-xs font-bold rounded-full border border-gray-200">Not Attempted</span>
                                    )}
                                </div>
                            </div>

                            {/* Student Analytics - Show for everyone */}
                            {testAnalytics && testAnalytics.totalStudents > 0 && (() => {
                                const analytics = getQuestionAnalytics(q._id)
                                if (!analytics) return null
                                
                                const attemptedCount = analytics.correctCount + analytics.incorrectCount
                                const attemptedPercentage = Math.round((attemptedCount / testAnalytics.totalStudents) * 100)
                                
                                return (
                                    <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                                                Student Analysis ({testAnalytics.totalStudents} Students)
                                            </h4>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            {/* Attempted */}
                                            <div className="bg-white rounded-lg p-3 text-center">
                                                <div className="text-xs text-gray-600 mb-1 font-medium">Attempted</div>
                                                <div className="text-2xl font-bold text-blue-600">{attemptedPercentage}%</div>
                                                <div className="text-xs text-gray-500 mt-1">({attemptedCount} students)</div>
                                            </div>

                                            {/* Correct */}
                                            <div className="bg-white rounded-lg p-3 text-center">
                                                <div className="text-xs text-gray-600 mb-1 font-medium">Correct</div>
                                                <div className="text-2xl font-bold text-green-600">{analytics.correctPercentage}%</div>
                                                <div className="text-xs text-gray-500 mt-1">({analytics.correctCount} students)</div>
                                            </div>

                                            {/* Incorrect */}
                                            <div className="bg-white rounded-lg p-3 text-center">
                                                <div className="text-xs text-gray-600 mb-1 font-medium">Incorrect</div>
                                                <div className="text-2xl font-bold text-red-600">{analytics.incorrectPercentage}%</div>
                                                <div className="text-xs text-gray-500 mt-1">({analytics.incorrectCount} students)</div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })()}

                            {/* Question Content */}
                            <div className="mb-6">
                                <p className="text-gray-800 text-sm leading-relaxed mb-4">{q.content || q.questionText}</p>
                                {/* Options */}
                                <div className="space-y-2">
                                    {q.options ? (
                                        ['A', 'B', 'C', 'D'].map((opt) => {
                                            const isCorrect = q.correctAnswer === opt
                                            const isSelected = q.userAnswer === opt
                                            const isWrongSelection = isSelected && !q.isCorrect

                                            // Determine styles
                                            let containerStyle = 'bg-white border-gray-200'
                                            let badgeStyle = 'bg-white text-gray-500 border-gray-300'
                                            let textStyle = 'text-gray-600'

                                            if (isCorrect) {
                                                containerStyle = 'bg-green-50 border-green-200'
                                                badgeStyle = 'bg-green-600 text-white border-green-600'
                                                textStyle = 'text-green-900 font-medium'
                                            } else if (isWrongSelection) {
                                                containerStyle = 'bg-red-50 border-red-200'
                                                badgeStyle = 'bg-red-600 text-white border-red-600'
                                                textStyle = 'text-red-900 font-medium'
                                            }

                                            return (
                                                <div key={opt} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${containerStyle}`}>
                                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 ${badgeStyle}`}>
                                                        {opt}
                                                    </div>
                                                    <span className={`text-sm ${textStyle}`}>
                                                        {q.options[opt]}
                                                    </span>
                                                    {isCorrect && (
                                                        <FiCheckCircle className="ml-auto text-green-600 w-5 h-5" />
                                                    )}
                                                    {isWrongSelection && (
                                                        <FiXCircle className="ml-auto text-red-600 w-5 h-5" />
                                                    )}
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="text-sm text-gray-500">Options not available</div>
                                        </div>
                                    )}
                                    
                                    {/* Show "No answer selected" for unattempted questions */}
                                    {!q.userAnswer && (
                                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-300 flex items-center gap-2">
                                            <FiAlertCircle className="w-4 h-4 text-gray-500" />
                                            <span className="text-sm font-medium text-gray-600">
                                                {q.wasVisited ? 'No answer selected (Omitted)' : 'Not attempted'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between border-t pt-4">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                                            <FiClock className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-gray-400 block tracking-wider">Time Analysis</span>
                                            <span className="text-sm font-bold text-gray-900">
                                                {q.timeSpent ? `${Math.floor(q.timeSpent/60)}:${(q.timeSpent%60).toString().padStart(2,'0')}` : '0:00'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => toggleExplanation(q._id)}
                                    className="px-4 py-1.5 bg-purple-900 text-white text-xs font-bold rounded hover:bg-purple-800 transition-colors flex items-center gap-2"
                                >
                                    {showExplanation[q._id] ? (
                                        <>
                                            <span>Hide Explanation</span>
                                            <FiChevronUp />
                                        </>
                                    ) : (
                                        <>
                                            <span>Show Explanation</span>
                                            <FiChevronDown />
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Explanation Content */}
                            {showExplanation[q._id] && (
                                <div className="mt-4 space-y-4 animate-in slide-in-from-top-2">
                                    {/* Short Explanation */}
                                    {q.shortExplanation && (
                                        <div className="p-5 bg-blue-50 rounded-xl border border-blue-200">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="p-1 bg-blue-100 text-blue-700 rounded">
                                                    <FiActivity className="w-3 h-3" />
                                                </div>
                                                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Short Explanation</h4>
                                            </div>
                                            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                                                <div dangerouslySetInnerHTML={{ __html: q.shortExplanation }} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Detailed Explanation */}
                                    {q.longExplanation && (
                                        <div className="p-5 bg-green-50 rounded-xl border border-green-200">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="p-1 bg-green-100 text-green-700 rounded">
                                                    <FiActivity className="w-3 h-3" />
                                                </div>
                                                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Detailed Explanation</h4>
                                            </div>
                                            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                                                <div dangerouslySetInnerHTML={{ __html: q.longExplanation }} />
                                            </div>
                                        </div>
                                    )}

                                    {/* No explanation available message */}
                                    {!q.shortExplanation && !q.longExplanation && (
                                        <div className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="p-1 bg-gray-100 text-gray-500 rounded">
                                                    <FiActivity className="w-3 h-3" />
                                                </div>
                                                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Explanation</h4>
                                            </div>
                                            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                                                <p>No explanation available for this question.</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Additional Stats Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Difficulty */}
                                        <div className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${
                                                    q.difficulty === 'Hard' ? 'bg-red-50 text-red-600' :
                                                    q.difficulty === 'Easy' ? 'bg-green-50 text-green-600' :
                                                    'bg-orange-50 text-orange-600'
                                                }`}>
                                                    <FiActivity className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-500 font-bold uppercase">Difficulty</div>
                                                    <div className="text-sm font-bold text-gray-900">{q.difficulty || 'Medium'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Topic */}
                                        <div className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                                    <FiCheckSquare className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-500 font-bold uppercase">Topic</div>
                                                    <div className="text-sm font-bold text-gray-900">{q.subject || 'General'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tell Reason Section - Only for incorrect answers and non-admin */}
                                    {!q.isCorrect && q.userAnswer && viewMode !== 'admin' && (
                                        <div className="p-5 bg-red-50 rounded-xl border border-red-200">
                                            <div className="flex items-center gap-2 mb-3">
                                                <FiAlertCircle className="w-4 h-4 text-red-600" />
                                                <h4 className="text-sm font-bold text-red-900">Tell us why you got this wrong *</h4>
                                            </div>
                                            <div className="space-y-2">
                                                {reasonOptions.map((option, idx) => (
                                                    <label key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-100 hover:border-red-300 cursor-pointer transition-colors">
                                                        <input
                                                            type="radio"
                                                            name={`reason-${q._id}`}
                                                            value={option}
                                                            checked={incorrectReasons[q._id]?.reason === option}
                                                            onChange={(e) => handleReasonChange(q._id, e.target.value)}
                                                            className="mt-1 w-4 h-4 text-red-600"
                                                        />
                                                        <span className="text-sm text-gray-700">{option}</span>
                                                    </label>
                                                ))}
                                                
                                                {incorrectReasons[q._id]?.reason === 'Other' && (
                                                    <textarea
                                                        placeholder="Please explain your reason..."
                                                        value={incorrectReasons[q._id]?.otherText || ''}
                                                        onChange={(e) => handleOtherTextChange(q._id, e.target.value)}
                                                        className="w-full p-3 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
                                                        rows="3"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Show submitted reason for admin - Always visible for incorrect answers */}
                                    {!q.isCorrect && q.userAnswer && viewMode === 'admin' && (
                                        <div className={`p-5 rounded-xl border-2 ${q.incorrectReason ? 'bg-blue-50 border-blue-400' : 'bg-yellow-50 border-yellow-400'}`}>
                                            <div className="flex items-center gap-2 mb-3">
                                                <FiAlertCircle className={`w-5 h-5 ${q.incorrectReason ? 'text-blue-600' : 'text-yellow-600'}`} />
                                                <h4 className={`text-sm font-bold ${q.incorrectReason ? 'text-blue-900' : 'text-yellow-900'}`}>
                                                    Student's Reason for Incorrect Answer
                                                </h4>
                                            </div>
                                            {q.incorrectReason ? (
                                                <div className="space-y-2">
                                                    <div className="p-4 bg-white rounded-lg border-2 border-blue-200 shadow-sm">
                                                        <p className="text-xs text-gray-500 font-bold uppercase mb-1">Selected Reason:</p>
                                                        <p className="text-sm text-gray-900 font-semibold">{q.incorrectReason}</p>
                                                    </div>
                                                    {q.incorrectReasonOther && (
                                                        <div className="p-4 bg-white rounded-lg border-2 border-blue-200 shadow-sm">
                                                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Additional Details:</p>
                                                            <p className="text-sm text-gray-700 italic">"{q.incorrectReasonOther}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-white rounded-lg border-2 border-yellow-200">
                                                    <p className="text-sm text-yellow-700 font-medium flex items-center gap-2">
                                                        <FiAlertCircle className="w-4 h-4" />
                                                        Student has not submitted their analysis yet
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        )
                    }))}
                </div>
            </div>
        </div>
    </div>
  )
}