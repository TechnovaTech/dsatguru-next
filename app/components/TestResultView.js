'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiArrowLeft, FiChevronDown, FiChevronUp, FiActivity, FiMonitor, FiMaximize, FiCheckSquare } from 'react-icons/fi'

export default function TestResultView({ testId, sessionId, returnUrl, viewMode }) {
  const router = useRouter()
  
  const [session, setSession] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedQuestions, setExpandedQuestions] = useState({}) // { questionId: true/false }
  const [showExplanation, setShowExplanation] = useState({}) // { questionId: true/false }

  useEffect(() => {
    fetchResult()
  }, [testId, sessionId])

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

        // Use pre-fetched questions if available (Performance optimization)
        if (sessionData.questions && sessionData.questions.length > 0) {
             allQuestions = sessionData.questions
        } else {
             // Fallback to fetching all questions
             const questionsRes = await fetch('/api/questions', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
             })
             if (questionsRes.ok) {
                 allQuestions = await questionsRes.json()
             }
        }
        
        const reviewQuestions = []
        // Merge session responses with question details
        if (sessionData.responses && sessionData.responses.length > 0) {
            sessionData.responses.forEach(resp => {
                const q = allQuestions.find(q => String(q._id) === String(resp.questionId))
                if (q) {
                    // Normalize options if they come as optionA, optionB etc
                    const options = q.options || {
                        A: q.optionA,
                        B: q.optionB,
                        C: q.optionC,
                        D: q.optionD
                    }

                    reviewQuestions.push({
                        ...q,
                        options,
                        userAnswer: resp.selectedAnswer,
                        isCorrect: resp.isCorrect,
                        timeSpent: resp.timeSpent,
                        _id: q._id
                    })
                }
            })
        } else if (sessionData.moduleAnswers) {
            // Fallback for older sessions or structure
            Object.keys(sessionData.moduleAnswers).forEach(moduleKey => {
                const moduleData = sessionData.moduleAnswers[moduleKey]
                let answers = moduleData.answers || moduleData
                
                Object.keys(answers).forEach(qId => {
                     const q = allQuestions.find(curr => String(curr._id) === String(qId))
                     if (q) {
                         const uAns = answers[qId]
                         // Normalize options
                         const options = q.options || {
                            A: q.optionA,
                            B: q.optionB,
                            C: q.optionC,
                            D: q.optionD
                         }

                         reviewQuestions.push({
                             ...q,
                             options,
                             userAnswer: uAns,
                             isCorrect: uAns === q.correctAnswer,
                             timeSpent: 0, // Fallback
                             _id: q._id
                         })
                     }
                })
            })
        }

        setSession(sessionData)
        setQuestions(reviewQuestions)
        
        // Auto-expand all questions initially like the image
        const initialExpanded = {}
        reviewQuestions.forEach(q => initialExpanded[q._id] = true)
        setExpandedQuestions(initialExpanded)
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
  const omittedCount = questions.filter(q => !q.userAnswer).length
  const accuracy = totalQuestions > 0 ? ((correctCount / totalQuestions) * 100).toFixed(2) : 0
  const totalTime = session.timeSpent || 0
  const formattedTime = `${Math.floor(totalTime / 60)}:${(totalTime % 60).toString().padStart(2, '0')}`

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
                            <button className="px-4 py-2 bg-purple-900 text-white text-sm font-bold rounded-lg hover:bg-purple-800">
                                Submit Analysis
                            </button>
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
                        <span>0 Unvisited</span>
                    </div>
                    <div className="bg-gray-100 px-3 py-1 rounded-full text-gray-700 font-bold">
                        {accuracy}% Accuracy
                    </div>
                    <div className="bg-gray-100 px-3 py-1 rounded-full text-gray-700 font-bold">
                        {formattedTime} Minutes Taken
                    </div>
                </div>
            </div>

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
                    <h2 className="text-sm font-bold text-gray-900">Question wise report</h2>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 text-xs font-medium bg-white border rounded hover:bg-gray-50">Filter By</button>
                    </div>
                </div>

                <div className="divide-y">
                    {questions.map((q, idx) => (
                        <div key={q._id} className="p-6">
                            {/* Question Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-red-50 text-red-600 font-bold w-8 h-8 flex items-center justify-center rounded border border-red-100">
                                        {idx + 1}
                                    </div>
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded uppercase">MCQ</span>
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${
                                        q.isCorrect 
                                            ? 'bg-green-100 text-green-700' 
                                            : q.userAnswer 
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {q.isCorrect ? 'Correct' : q.userAnswer ? 'Incorrect' : 'Omitted'}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
                                        <FiClock className="w-3 h-3" /> {q.timeSpent ? `${Math.floor(q.timeSpent/60)}:${(q.timeSpent%60).toString().padStart(2,'0')} Mins` : '00:00'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200">Answered</span>
                                    <span className="px-3 py-1 bg-gray-50 text-gray-500 text-xs font-bold rounded-full border border-gray-200">Visited</span>
                                </div>
                            </div>

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
                                    {/* Explanation Text */}
                                    <div className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="p-1 bg-purple-100 text-purple-700 rounded">
                                                <FiActivity className="w-3 h-3" />
                                            </div>
                                            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Detailed Explanation</h4>
                                        </div>
                                        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                                            {q.explanation ? (
                                                <div dangerouslySetInnerHTML={{ __html: q.explanation }} />
                                            ) : (
                                                <p>No explanation available for this question.</p>
                                            )}
                                        </div>
                                    </div>

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
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  )
}