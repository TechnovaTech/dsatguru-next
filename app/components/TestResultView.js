'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiArrowLeft, FiChevronDown, FiChevronUp, FiActivity, FiMonitor, FiMaximize, FiCheckSquare, FiUsers, FiRefreshCw, FiDownload, FiShare2, FiX } from 'react-icons/fi'
import ReassignTestModal from './admin/ReassignTestModal'

export default function TestResultView({ testId, sessionId, returnUrl, viewMode, viewAnalysis }) {
  const router = useRouter()
  const contentRef = useRef(null)
  const [downloading, setDownloading] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareTab, setShareTab] = useState('student')
  const [students, setStudents] = useState([])
  const [tutors, setTutors] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [shareMessage, setShareMessage] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [sendingPDF, setSendingPDF] = useState(false)
  
  const [session, setSession] = useState(null)
  const [test, setTest] = useState(null) // Store test data including showExplanation
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedQuestions, setExpandedQuestions] = useState({}) // { questionId: true/false }
  const [showExplanation, setShowExplanation] = useState({}) // { questionId: true/false }
  const [showQuestionInfo, setShowQuestionInfo] = useState({}) // { questionId: true/false }
  const [showWhyWrong, setShowWhyWrong] = useState({}) // { questionId: true/false }
  const [filterStatus, setFilterStatus] = useState('all') // 'all', 'correct', 'incorrect', 'omitted', 'unattempted'
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [testAnalytics, setTestAnalytics] = useState(null) // For admin view - aggregated stats
  const [incorrectReasons, setIncorrectReasons] = useState({}) // { questionId: { reason: '', otherText: '' } }
  const [showReasonModal, setShowReasonModal] = useState(null) // questionId of modal being shown
  const [submittingAnalysis, setSubmittingAnalysis] = useState(false)
  const [analysisSubmitted, setAnalysisSubmitted] = useState(false)
  const [showReassignModal, setShowReassignModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [newTestId, setNewTestId] = useState(null)
  const [unlockSubject, setUnlockSubject] = useState('')
  const [unlockReason, setUnlockReason] = useState('')
  const [submittingUnlock, setSubmittingUnlock] = useState(false)
  const [unlockSubmitted, setUnlockSubmitted] = useState(false)
  const [processingUnlock, setProcessingUnlock] = useState(false)
  const [showUnlockModal, setShowUnlockModal] = useState(false)

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
              console.log('Test data fetched:', { 
                testId: testData._id, 
                showExplanation: testData.showExplanation,
                title: testData.title 
              })
              setTest(testData) // Store test data
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
            let options = q.options
            
            // If options is an array, convert to object with A, B, C, D keys
            if (Array.isArray(q.options)) {
                options = {
                    A: q.options[0] || '',
                    B: q.options[1] || '',
                    C: q.options[2] || '',
                    D: q.options[3] || ''
                }
            } else if (typeof q.options === 'string') {
                // If options is a JSON string, parse it
                try {
                    const parsed = JSON.parse(q.options)
                    if (Array.isArray(parsed)) {
                        options = {
                            A: parsed[0] || '',
                            B: parsed[1] || '',
                            C: parsed[2] || '',
                            D: parsed[3] || ''
                        }
                    } else {
                        options = parsed
                    }
                } catch (e) {
                    options = {
                        A: q.optionA || '',
                        B: q.optionB || '',
                        C: q.optionC || '',
                        D: q.optionD || ''
                    }
                }
            } else if (!options || typeof options !== 'object') {
                // Fallback to individual option fields
                options = {
                    A: q.optionA || '',
                    B: q.optionB || '',
                    C: q.optionC || '',
                    D: q.optionD || ''
                }
            }

            const questionData = {
                ...q,
                options,
                userAnswer: resp ? resp.selectedAnswer : null,
                isCorrect: resp ? resp.isCorrect : false,
                timeSpent: resp ? resp.timeSpent : 0,
                wasVisited: wasVisited,
                incorrectReason: resp?.incorrectReason || null,
                incorrectReasonExplanation: resp?.incorrectReasonExplanation || null,
                _id: q._id
            }
            
            // Debug log for options
            if (!options || !options.A) {
                console.log('Question with missing options:', q._id, 'Options:', options, 'Original:', q.options)
            }
            
            reviewQuestions.push(questionData)
            
            // Debug log for incorrect questions with reasons
            if (!questionData.isCorrect && questionData.userAnswer) {
                console.log('Incorrect question:', q._id, 'Reason:', questionData.incorrectReason, 'Explanation:', questionData.incorrectReasonExplanation)
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
        console.log('Session auto-submit data:', {
          autoSubmitted: sessionData.autoSubmitted,
          autoSubmitReason: sessionData.autoSubmitReason
        })
        
        // Debug: Log the full session data to verify fields
        console.log('Full session data:', JSON.stringify(sessionData, null, 2))

        setSession(sessionData)
        setQuestions(reviewQuestions)
        
        // Set analysis submitted status from session
        if (sessionData.analysisSubmitted) {
          setAnalysisSubmitted(true)
        }
        
        // Load saved reasons
        const savedReasons = {}
        reviewQuestions.forEach(q => {
          if (q.incorrectReason) {
            savedReasons[q._id] = {
              reason: q.incorrectReason,
              explanation: q.incorrectReasonExplanation || ''
            }
          }
        })
        setIncorrectReasons(savedReasons)
        
        // Auto-expand all questions and explanations initially
        const initialExpanded = {}
        const initialExplanations = {}
        const initialWhyWrong = {}
        const canShowExplanation = viewMode === 'admin' || sessionData?.showExplanation === true
        reviewQuestions.forEach(q => {
          initialExpanded[q._id] = true
          initialExplanations[q._id] = canShowExplanation // Auto-show only if allowed
          // Auto-open "Why Wrong" for students on incorrect questions, closed for admins
          if (!q.isCorrect && q.userAnswer) {
            initialWhyWrong[q._id] = viewMode !== 'admin'
          }
        })
        setExpandedQuestions(initialExpanded)
        setShowExplanation(initialExplanations)
        setShowWhyWrong(initialWhyWrong)
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

  const toggleQuestionInfo = (id) => {
    setShowQuestionInfo(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleWhyWrong = (id) => {
    setShowWhyWrong(prev => ({ ...prev, [id]: !prev[id] }))
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
        explanation: prev[questionId]?.explanation || ''
      }
    }))
  }

  const handleExplanationChange = (questionId, text) => {
    setIncorrectReasons(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        explanation: text
      }
    }))
  }

  const canSubmitAnalysis = () => {
    const incorrectQuestions = questions.filter(q => !q.isCorrect && q.userAnswer)
    return incorrectQuestions.every(q => {
      const reason = incorrectReasons[q._id]
      if (!reason || !reason.reason) return false
      if (!reason.explanation?.trim()) return false
      return true
    })
  }

  const handleSubmitAnalysis = async () => {
    if (!canSubmitAnalysis()) {
      alert('Please provide reasons for all incorrect answers before submitting.')
      return
    }

    setSubmittingAnalysis(true)
    
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
        setSession(prev => ({ ...prev, analysisSubmitted: true, analysisSubmittedAt: new Date() }))
        setAnalysisSubmitted(true)
      } else {
        const errorData = await res.json()
        alert(`Failed to submit analysis: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error submitting analysis:', error)
      alert('Failed to submit analysis. Please try again.')
    } finally {
      setSubmittingAnalysis(false)
    }
  }

  const handleReassignTest = async (option) => {
    try {
      const token = localStorage.getItem('token')
      
      // Get question IDs based on option
      let questionIds
      if (option === 'all') {
        questionIds = questions.map(q => q._id)
      } else {
        // Only wrong questions
        questionIds = questions.filter(q => !q.isCorrect && q.userAnswer).map(q => q._id)
      }

      // Determine which reassign API to use
      const apiEndpoint = test?.isTutorTest 
        ? '/api/admin/tutor/tests/reassign' 
        : '/api/admin/admin-tests/reassign'

      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          originalSessionId: sessionId,
          originalTestId: testId,
          questionIds,
          userId: session.userId,
          option
        })
      })

      if (res.ok) {
        const data = await res.json()
        setNewTestId(data.newTestId)
        setShowReassignModal(false)
        setShowSuccessModal(true)
      } else {
        const errorData = await res.json()
        alert(`Failed to reassign test: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error reassigning test:', error)
      alert('Failed to reassign test. Please try again.')
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

  const downloadPDF = async () => {
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const jsPDF = (await import('jspdf')).default
      
      const element = contentRef.current
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f9fafb'
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
      const imgX = (pdfWidth - imgWidth * ratio) / 2
      const imgY = 10
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio)
      
      const studentName = session.userId?.name || 'Student'
      const subject = session.subject || 'Test'
      const testDate = new Date(session.completedAt || session.updatedAt).toISOString().split('T')[0]
      pdf.save(`${studentName}_${subject}_${testDate}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF')
    } finally {
      setDownloading(false)
    }
  }

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const token = localStorage.getItem('token')
      const [studentsRes, tutorsRes] = await Promise.all([
        fetch('/api/admin/users?role=Student', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/users?role=Tutor', { headers: { Authorization: `Bearer ${token}` } })
      ])
      if (studentsRes.ok) setStudents(await studentsRes.json())
      if (tutorsRes.ok) setTutors(await tutorsRes.json())
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const generatePDFBlob = async () => {
    const html2canvas = (await import('html2canvas')).default
    const jsPDF = (await import('jspdf')).default
    
    const element = contentRef.current
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#f9fafb'
    })
    
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = canvas.width
    const imgHeight = canvas.height
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
    const imgX = (pdfWidth - imgWidth * ratio) / 2
    const imgY = 10
    
    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio)
    return pdf.output('blob')
  }

  const handleSharePDF = async () => {
    if (selectedUsers.length === 0) {
      alert('Please select at least one user to share with')
      return
    }
    if (!shareMessage.trim()) {
      alert('Please enter a message')
      return
    }

    setSendingPDF(true)
    try {
      const pdfBlob = await generatePDFBlob()
      const formData = new FormData()
      const studentName = session.userId?.name || 'Student'
      const testName = session.testId?.title || 'Test'
      const subject = session.subject || 'General'
      const testDate = new Date(session.completedAt || session.updatedAt).toISOString().split('T')[0]
      formData.append('pdf', pdfBlob, `${studentName}_${subject}_${testDate}.pdf`)
      formData.append('userIds', JSON.stringify(selectedUsers))
      formData.append('message', shareMessage)
      formData.append('studentName', studentName)
      formData.append('subject', `${testName} (${subject})`)
      formData.append('testDate', testDate)

      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/share-pdf', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })

      if (res.ok) {
        alert('PDF shared successfully!')
        setShowShareModal(false)
        setSelectedUsers([])
        setShareMessage('')
      } else {
        alert('Failed to share PDF')
      }
    } catch (error) {
      console.error('Error sharing PDF:', error)
      alert('Failed to share PDF')
    } finally {
      setSendingPDF(false)
    }
  }

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const handleReattempt = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/test-sessions/${sessionId}/reattempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        router.push(`/dashboard/tests/${testId}/start?sessionId=${sessionId}&returnUrl=${encodeURIComponent(returnUrl)}`)
      } else {
        alert('Failed to reset test. Please try again.')
      }
    } catch (e) {
      alert('Failed to reset test. Please try again.')
    }
  }

  const handleSubmitUnlock = async () => {
    if (!unlockSubject.trim() || !unlockReason.trim()) {
      alert('Please fill in both subject and reason.')
      return
    }
    setSubmittingUnlock(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/test-sessions/${sessionId}/unlock-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject: unlockSubject, reason: unlockReason })
      })
      if (res.ok) {
        setUnlockSubmitted(true)
        setShowUnlockModal(false)
        setSession(prev => ({ ...prev, unlockRequest: { subject: unlockSubject, reason: unlockReason, status: 'pending', requestedAt: new Date() } }))
      } else {
        alert('Failed to submit request. Please try again.')
      }
    } catch (e) {
      alert('Failed to submit request. Please try again.')
    } finally {
      setSubmittingUnlock(false)
    }
  }

  const handleUnlockAction = async (action) => {
    setProcessingUnlock(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/test-sessions/${sessionId}/unlock-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action })
      })
      if (res.ok) {
        setSession(prev => ({ ...prev, unlockRequest: { ...prev.unlockRequest, status: action, reviewedAt: new Date() } }))
      } else {
        alert('Failed to process request.')
      }
    } catch (e) {
      alert('Failed to process request.')
    } finally {
      setProcessingUnlock(false)
    }
  }

  const isSecondAutoSubmit = session?.attemptCount >= 2 && !!(session?.autoSubmitted || session?.autoSubmitReason)
  const unlockReq = session?.unlockRequest
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
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20" ref={contentRef}>
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
                    {viewMode === 'admin' && (
                        <>
                            <button
                                onClick={downloadPDF}
                                disabled={downloading}
                                className="px-6 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-md"
                            >
                                <FiDownload className="w-4 h-4" />
                                {downloading ? 'Generating...' : 'Download PDF'}
                            </button>
                            <button
                                onClick={() => { 
                                  setShowShareModal(true); 
                                  fetchUsers();
                                  const studentName = session.userId?.name || 'Student'
                                  const testName = session.testId?.title || 'Test'
                                  const subject = session.subject || 'General'
                                  const testDate = new Date(session.completedAt || session.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                                  setShareMessage(`Hi,\n\nI'm sharing the test result for ${studentName}.\n\nTest: ${testName}\nSubject: ${subject}\nDate: ${testDate}\n\nPlease review the attached PDF report.`)
                                }}
                                className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md"
                            >
                                <FiShare2 className="w-4 h-4" />
                                Share PDF
                            </button>
                        </>
                    )}
                    {viewMode === 'admin' && (test?.isTutorTest || test?.practiceMode === 'admin') && session?.analysisSubmitted && !session?.isReassigned && (
                        <button
                            onClick={() => setShowReassignModal(true)}
                            className="px-6 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 flex items-center gap-2 shadow-md hover:shadow-lg"
                        >
                            <FiRefreshCw /> Reassign Test
                        </button>
                    )}
                    
                    {viewMode !== 'admin' && (
                        <>
                            {/* Reattempt / Request Unlock button — only show if auto-submitted */}
                            {!session?.isReassigned && (session?.autoSubmitted || session?.autoSubmitReason) && (
                                isSecondAutoSubmit ? (
                                    <button
                                        onClick={() => setShowUnlockModal(true)}
                                        className="px-4 py-2 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700"
                                    >
                                        Request Unlock
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleReattempt}
                                        className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700"
                                    >
                                        Reattempt Test
                                    </button>
                                )
                            )}
                            {/* Submit Analysis Button - For tutor and admin tests */}
                            {(test?.isTutorTest || test?.practiceMode === 'admin') && !session?.analysisSubmitted && !session?.isReassigned && (
                                <button 
                                    onClick={handleSubmitAnalysis}
                                    disabled={!canSubmitAnalysis() || submittingAnalysis}
                                    className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                                        canSubmitAnalysis() && !submittingAnalysis
                                            ? 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg'
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                                    title={!canSubmitAnalysis() ? 'Please provide reasons for all incorrect answers' : 'Submit your analysis'}
                                >
                                    {submittingAnalysis ? 'Submitting...' : 'Submit Analysis'}
                                </button>
                            )}
                            
                            {/* Show submitted status */}
                            {(test?.isTutorTest || test?.practiceMode === 'admin') && session?.analysisSubmitted && !session?.isReassigned && (
                                <div className="px-4 py-2 bg-green-50 border border-green-200 text-green-700 text-sm font-bold rounded-lg flex items-center gap-2">
                                    <FiCheckCircle className="w-4 h-4" />
                                    Analysis Submitted
                                </div>
                            )}
                            
                            {/* Show reassigned status */}
                            {session?.isReassigned && (
                                <div className="px-4 py-2 bg-orange-50 border border-orange-200 text-orange-700 text-sm font-bold rounded-lg flex items-center gap-2">
                                    <FiRefreshCw className="w-4 h-4" />
                                    Test Reassigned
                                </div>
                            )}
                            
                            <button className="px-4 py-2 border border-purple-200 text-purple-900 text-sm font-bold rounded-lg hover:bg-purple-50">
                                View Scaled Score
                            </button>
                            <button 
                                onClick={() => router.push(returnUrl)}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700"
                            >
                                Back to Tests
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>

        {/* Auto-Submit Warning Banner */}
        {(session?.autoSubmitted || session?.autoSubmitReason) && (
            <div className="max-w-7xl mx-auto px-4 pt-6">
                <div className="bg-red-50 border-2 border-red-500 rounded-xl p-5 shadow-lg">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                                <FiAlertCircle className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-red-900 mb-2">🚨 Test Auto-Submitted</h3>
                            <p className="text-red-800 font-semibold mb-2">This test was automatically submitted due to a violation:</p>
                            <div className="bg-white border border-red-300 rounded-lg p-4 mb-3">
                                <p className="text-red-900 font-bold text-base">
                                    "{session.autoSubmitReason || 'Test was auto-submitted due to a violation'}"
                                </p>
                            </div>
                            <p className="text-sm text-red-700">⚠️ Unanswered questions at the time of auto-submit have been marked as omitted.</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Admin/Tutor: Unlock Request Panel */}
        {viewMode === 'admin' && isSecondAutoSubmit && (
            <div className="max-w-7xl mx-auto px-4 pt-4">
                <div className="bg-orange-50 border-2 border-orange-400 rounded-xl p-5 shadow">
                    <h3 className="text-base font-bold text-orange-900 mb-3">🔓 Test Unlock Request</h3>
                    {unlockReq ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white rounded-lg p-3 border border-orange-200">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Subject</p>
                                    <p className="text-sm font-semibold text-gray-900">{unlockReq.subject}</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-orange-200">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Auto-Submit Reason</p>
                                    <p className="text-sm font-semibold text-gray-900">{session.autoSubmitReason || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-orange-200">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Student's Reason for Unlock</p>
                                <p className="text-sm text-gray-900">{unlockReq.reason}</p>
                            </div>
                            {unlockReq.status === 'pending' ? (
                                <div className="flex gap-3 pt-1">
                                    <button
                                        onClick={() => handleUnlockAction('approved')}
                                        disabled={processingUnlock}
                                        className="px-5 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {processingUnlock ? 'Processing...' : 'Approve'}
                                    </button>
                                    <button
                                        onClick={() => handleUnlockAction('declined')}
                                        disabled={processingUnlock}
                                        className="px-5 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 disabled:opacity-50"
                                    >
                                        {processingUnlock ? 'Processing...' : 'Decline'}
                                    </button>
                                </div>
                            ) : (
                                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${
                                    unlockReq.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                    {unlockReq.status === 'approved' ? '✅ Approved' : '❌ Declined'}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-orange-800">No unlock request submitted yet by the student.</p>
                    )}
                </div>
            </div>
        )}

        {/* Student: 2nd auto-submit status banner */}
        {viewMode !== 'admin' && isSecondAutoSubmit && (
            <div className="max-w-7xl mx-auto px-4 pt-4">
                {unlockReq?.status === 'approved' ? (
                    <div className="bg-green-50 border-2 border-green-500 rounded-xl p-6 text-center">
                        <p className="text-lg font-bold text-green-800 mb-4">✅ Your unlock request has been approved!</p>
                        <button onClick={handleReattempt} className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">
                            Start Test (Attempt 3)
                        </button>
                    </div>
                ) : unlockReq?.status === 'declined' ? (
                    <div className="bg-red-50 border-2 border-red-400 rounded-xl p-6 text-center">
                        <p className="text-lg font-bold text-red-800">❌ Your unlock request was declined.</p>
                        <p className="text-sm text-red-600 mt-2">Please contact your tutor or admin for further assistance.</p>
                    </div>
                ) : (unlockSubmitted || unlockReq?.status === 'pending') ? (
                    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 text-center">
                        <p className="text-lg font-bold text-yellow-800">⏳ Unlock request submitted. Waiting for admin/tutor approval.</p>
                    </div>
                ) : (
                    <div className="bg-orange-50 border-2 border-orange-400 rounded-xl p-4 flex items-center justify-between">
                        <p className="text-sm font-semibold text-orange-900">You have been auto-submitted twice. Request an unlock to get a 3rd attempt.</p>
                        <button onClick={() => setShowUnlockModal(true)} className="ml-4 px-5 py-2 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 whitespace-nowrap">
                            Request Unlock
                        </button>
                    </div>
                )}
            </div>
        )}

        {/* Unlock Request Modal */}
        {showUnlockModal && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                    <div className="p-5 border-b flex items-center justify-between">
                        <h3 className="text-base font-bold text-gray-900">🔓 Request Test Unlock</h3>
                        <button onClick={() => setShowUnlockModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
                    </div>
                    <div className="p-5 space-y-4">
                        <p className="text-sm text-gray-600">You have been auto-submitted twice. Fill in the form below to request a 3rd attempt.</p>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Subject <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={unlockSubject}
                                onChange={e => setUnlockSubject(e.target.value)}
                                placeholder="e.g. Math, Reading & Writing"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Reason for unlock <span className="text-red-500">*</span></label>
                            <textarea
                                value={unlockReason}
                                onChange={e => setUnlockReason(e.target.value)}
                                placeholder="Explain why you should be given another attempt..."
                                rows={3}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                            />
                        </div>
                    </div>
                    <div className="p-5 border-t flex gap-3">
                        <button onClick={() => setShowUnlockModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50">Cancel</button>
                        <button
                            onClick={handleSubmitUnlock}
                            disabled={submittingUnlock}
                            className="flex-1 px-4 py-2 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 disabled:opacity-50"
                        >
                            {submittingUnlock ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6" style={(viewMode !== 'admin' && isSecondAutoSubmit) ? { display: 'none' } : {}}>
            
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
                                    {q.options && (typeof q.options === 'object') && (q.options.A || q.options.B || q.options.C || q.options.D) ? (
                                        // MULTIPLE CHOICE QUESTIONS
                                        ['A', 'B', 'C', 'D'].map((opt) => {
                                            const isCorrect = q.correctAnswer === opt
                                            const isSelected = q.userAnswer === opt
                                            const isWrongSelection = isSelected && !q.isCorrect
                                            
                                            // Get option text
                                            const optionText = q.options[opt] || q[`option${opt}`] || ''

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
                                                    <span className={`text-sm ${textStyle} flex-1`}>
                                                        {optionText || <span className="text-gray-400 italic">No text</span>}
                                                    </span>
                                                    {isCorrect && (
                                                        <FiCheckCircle className="ml-auto text-green-600 w-5 h-5 flex-shrink-0" />
                                                    )}
                                                    {isWrongSelection && (
                                                        <FiXCircle className="ml-auto text-red-600 w-5 h-5 flex-shrink-0" />
                                                    )}
                                                </div>
                                            )
                                        })
                                    ) : (
                                        // FILL-IN-THE-BLANK QUESTIONS
                                        <div className="space-y-3">
                                            {/* Student's Answer */}
                                            <div className={`p-4 rounded-lg border-2 ${
                                                q.isCorrect 
                                                    ? 'bg-green-50 border-green-500' 
                                                    : 'bg-red-50 border-red-500'
                                            }`}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    {q.isCorrect ? (
                                                        <>
                                                            <FiCheckCircle className="w-5 h-5 text-green-600" />
                                                            <span className="font-bold text-green-700">Your Answer (Correct)</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FiXCircle className="w-5 h-5 text-red-600" />
                                                            <span className="font-bold text-red-700">Your Answer (Incorrect)</span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className={`text-lg font-semibold ${
                                                    q.isCorrect ? 'text-green-900' : 'text-red-900'
                                                }`}>
                                                    {q.userAnswer || <span className="text-gray-400 italic">No answer provided</span>}
                                                </div>
                                            </div>

                                            {/* Correct Answer (if wrong) */}
                                            {!q.isCorrect && q.correctAnswer && (
                                                <div className="p-4 rounded-lg border-2 bg-green-50 border-green-500">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <FiCheckCircle className="w-5 h-5 text-green-600" />
                                                        <span className="font-bold text-green-700">Correct Answer</span>
                                                    </div>
                                                    <div className="text-lg font-semibold text-green-900">
                                                        {q.correctAnswer}
                                                    </div>
                                                </div>
                                            )}
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

                            {/* Actions - 3 Buttons */}
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

                                <div className="flex items-center gap-2">
                                    {/* Question Info Button */}
                                    <button 
                                        onClick={() => toggleQuestionInfo(q._id)}
                                        className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                                    >
                                        {showQuestionInfo[q._id] ? (
                                            <>
                                                <span>Hide Info</span>
                                                <FiChevronUp />
                                            </>
                                        ) : (
                                            <>
                                                <span>Question Info</span>
                                                <FiChevronDown />
                                            </>
                                        )}
                                    </button>

                                    {/* Why Wrong Button - Only for incorrect answers */}
                                    {!q.isCorrect && q.userAnswer && (
                                        <button 
                                            onClick={() => toggleWhyWrong(q._id)}
                                            className="px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors flex items-center gap-2"
                                        >
                                            {showWhyWrong[q._id] ? (
                                                <>
                                                    <span>Hide Why Wrong</span>
                                                    <FiChevronUp />
                                                </>
                                            ) : (
                                                <>
                                                    <span>Why Wrong?</span>
                                                    <FiChevronDown />
                                                </>
                                            )}
                                        </button>
                                    )}

                                    {/* Explanation Button - Controlled by showExplanation setting */}
                                    {(viewMode === 'admin' || session?.showExplanation === true) && (
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
                                    )}
                                </div>
                            </div>

                            {/* Question Info Content */}
                            {showQuestionInfo[q._id] && (
                                <div className="mt-4 animate-in slide-in-from-top-2">
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

                            {/* Why Wrong Content - Collapsible for incorrect answers */}
                            {!q.isCorrect && q.userAnswer && showWhyWrong[q._id] && (
                                <div className="mt-4 animate-in slide-in-from-top-2">
                                    {/* Tell Reason Section - Optional for students */}
                                    {viewMode !== 'admin' && (
                                        <div className="p-5 bg-red-50 rounded-xl border border-red-200">
                                            <div className="flex items-center gap-2 mb-3">
                                                <FiAlertCircle className="w-4 h-4 text-red-600" />
                                                <h4 className="text-sm font-bold text-red-900">
                                                    Why did you get this wrong? <span className="text-red-600">*</span>
                                                </h4>
                                            </div>
                                            <p className="text-xs text-gray-600 mb-3">
                                                Help us understand your mistake to provide better recommendations
                                            </p>
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
                                                
                                                {incorrectReasons[q._id]?.reason && (
                                                    <div className="mt-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-2">
                                                            Please explain in detail: <span className="text-red-600">*</span>
                                                        </label>
                                                        <textarea
                                                            placeholder="Explain your reasoning in detail..."
                                                            value={incorrectReasons[q._id]?.explanation || ''}
                                                            onChange={(e) => handleExplanationChange(q._id, e.target.value)}
                                                            className="w-full p-3 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
                                                            rows="3"
                                                            required
                                                        />
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Provide specific details about what went wrong
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Show submitted reason for admin - Always visible for incorrect answers */}
                                    {viewMode === 'admin' && (
                                        <div className={`p-5 rounded-xl border-2 ${q.incorrectReason ? 'bg-blue-50 border-blue-400' : 'bg-yellow-50 border-yellow-400'}`}>
                                            <div className="flex items-center gap-2 mb-3">
                                                <FiAlertCircle className={`w-5 h-5 ${q.incorrectReason ? 'text-blue-600' : 'text-yellow-600'}`} />
                                                <h4 className={`text-sm font-bold ${q.incorrectReason ? 'text-blue-900' : 'text-yellow-900'}`}>
                                                    Student's Reason for Incorrect Answer
                                                </h4>
                                            </div>
                                            {q.incorrectReason ? (
                                                <div className="space-y-3">
                                                    <div className="p-4 bg-white rounded-lg border-2 border-blue-200 shadow-sm">
                                                        <p className="text-xs text-gray-500 font-bold uppercase mb-1">Selected Reason:</p>
                                                        <p className="text-sm text-gray-900 font-semibold">{q.incorrectReason}</p>
                                                    </div>
                                                    {q.incorrectReasonExplanation && (
                                                        <div className="p-4 bg-white rounded-lg border-2 border-blue-200 shadow-sm">
                                                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Student's Explanation:</p>
                                                            <p className="text-sm text-gray-900 whitespace-pre-wrap">{q.incorrectReasonExplanation}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-yellow-800">Student has not provided a reason yet.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Explanation Content */}
                            {showExplanation[q._id] && (viewMode === 'admin' || session?.showExplanation === true) && (
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
                                </div>
                            )}
                        </div>
                        )
                    }))}
                </div>
            </div>
        </div>
        
        {/* Reassign Test Modal */}
        {showReassignModal && (
          <ReassignTestModal
            session={session}
            questions={questions}
            onClose={() => setShowReassignModal(false)}
            onReassign={handleReassignTest}
          />
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
                <div className="flex items-center justify-center">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                    <FiCheckCircle className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-8 text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Test Reassigned Successfully!
                </h3>
                <p className="text-gray-600 mb-6">
                  A new test assignment has been created for the student.
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-900 font-semibold mb-2">
                    New Test ID:
                  </p>
                  <p className="text-lg font-mono font-bold text-blue-700">
                    {newTestId}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowSuccessModal(false)
                    window.location.reload()
                  }}
                  className="w-full px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Share Test Result PDF</h2>
                <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600">
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <div className="border-b">
                <div className="flex">
                  <button onClick={() => setShareTab('student')} className={`flex-1 px-6 py-3 font-medium transition-colors ${shareTab === 'student' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>Students</button>
                  <button onClick={() => setShareTab('tutor')} className={`flex-1 px-6 py-3 font-medium transition-colors ${shareTab === 'tutor' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>Tutors</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {loadingUsers ? (
                  <div className="text-center py-8 text-gray-500">Loading users...</div>
                ) : (
                  <div className="space-y-2">
                    {(shareTab === 'student' ? students : tutors).map(user => (
                      <label key={user._id} className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${selectedUsers.includes(user._id) ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:border-blue-200'}`}>
                        <input type="checkbox" checked={selectedUsers.includes(user._id)} onChange={() => toggleUserSelection(user._id)} className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </label>
                    ))}
                    {(shareTab === 'student' ? students : tutors).length === 0 && (
                      <div className="text-center py-8 text-gray-500">No {shareTab}s found</div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-6 border-t bg-gray-50">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea value={shareMessage} onChange={(e) => setShareMessage(e.target.value)} placeholder="Enter a message to send with the PDF..." className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" rows="3" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">{selectedUsers.length} user(s) selected</div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowShareModal(false)} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
                    <button onClick={handleSharePDF} disabled={sendingPDF || selectedUsers.length === 0} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium">{sendingPDF ? 'Sending...' : 'Send PDF'}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}