'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { FiClock, FiCheckCircle, FiArrowRight, FiAlertTriangle, FiMoreVertical, FiHelpCircle, FiBookOpen, FiSlash, FiGrid, FiLayers, FiEdit2 } from 'react-icons/fi'

export default function TakeTestPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')
  const returnUrl = searchParams.get('returnUrl') || '/dashboard/tests'
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
  const [showFlagModal, setShowFlagModal] = useState(false)
  const [showHighlights, setShowHighlights] = useState(false)
  const [flagNote, setFlagNote] = useState('')
  const [completedSessionId, setCompletedSessionId] = useState(null)
  const testContainerRef = useRef(null)

  // New Features State
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)
  const [lineReaderActive, setLineReaderActive] = useState(false)
  const [lineReaderPos, setLineReaderPos] = useState(50) // Percentage from top
  const [assistiveTechMode, setAssistiveTechMode] = useState(false)
  const [eliminatedAnswers, setEliminatedAnswers] = useState({}) // { questionId: ['A', 'C'] }
  const [showRWInstructions, setShowRWInstructions] = useState(false)
  const [showMathInstructions, setShowMathInstructions] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false) // For Tutor Mode
  const [showCalculator, setShowCalculator] = useState(false)
  const [calcPosition, setCalcPosition] = useState({ x: 50, y: 100 })
  const [isDraggingCalc, setIsDraggingCalc] = useState(false)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const calculatorRef = useRef(null)
  const [showAutoSubmitModal, setShowAutoSubmitModal] = useState(false)
  const [autoSubmitReason, setAutoSubmitReason] = useState('')
  
  // Time Tracking
  const [questionTimes, setQuestionTimes] = useState({}) 

  useEffect(() => {
    if (!loading && !checkingHistory && !showModuleSummary && !testCompleted && !showRWInstructions && !showMathInstructions && moduleQuestions.length > 0) {
      const timer = setInterval(() => {
        const currentQ = moduleQuestions[currentQuestion]
        if (currentQ) {
          setQuestionTimes(prev => ({
            ...prev,
            [currentQ._id]: (prev[currentQ._id] || 0) + 1
          }))
        }
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [currentQuestion, moduleQuestions, loading, checkingHistory, showModuleSummary, testCompleted, showRWInstructions, showMathInstructions])
  const [desmosLoaded, setDesmosLoaded] = useState(false)
  const [calculatorInstance, setCalculatorInstance] = useState(null)

  // Load Desmos Script
  useEffect(() => {
    if (!document.getElementById('desmos-script')) {
      const script = document.createElement('script')
      script.id = 'desmos-script'
      // Using public demo key from Desmos docs
      script.src = 'https://www.desmos.com/api/v1.10/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6'
      script.async = true
      script.onload = () => setDesmosLoaded(true)
      document.body.appendChild(script)
    } else {
      setDesmosLoaded(true)
    }
  }, [])

  // Initialize Calculator
  useEffect(() => {
    if (desmosLoaded && showCalculator && calculatorRef.current && !calculatorInstance) {
      // Ensure window.Desmos exists before using it
      if (window.Desmos) {
        const calculator = window.Desmos.GraphingCalculator(calculatorRef.current, {
          keypad: true,
          graphpaper: true,
          expressions: true,
          settingsMenu: true,
          zoomButtons: true,
          expressionsCollapsed: false,
          lockViewport: false,
          // Testing calculator specific settings to match standard test environment
          distributions: false,
          pointsOfInterest: true,
          trace: true
        })
        setCalculatorInstance(calculator)
      }
    }
    // Cleanup is handled manually or when component unmounts if we want to reset
  }, [desmosLoaded, showCalculator, calculatorRef])

  const [showReference, setShowReference] = useState(false)
  const [refPosition, setRefPosition] = useState({ x: 100, y: 100 })
  const [isDraggingRef, setIsDraggingRef] = useState(false)
  const dragStartRefPos = useRef({ x: 0, y: 0 })

  const renderWithImages = (text) => {
    if (!text) return null
    const str = String(text)
    const regex = /(!\[.*?\]\(.*?\))/g
    const parts = str.split(regex)
    return parts.map((part, i) => {
      const match = part.match(/!\[(.*?)\]\((.*?)\)/)
      if (match) {
        const alt = match[1] || ''
        const url = match[2] || ''
        return (
          <img
            key={`img-${i}`}
            src={url}
            alt={alt}
            className="max-w-full h-auto my-3 rounded border"
          />
        )
      }
      return <span key={`txt-${i}`}>{part}</span>
    })
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingCalc) {
        setCalcPosition({
          x: e.clientX - dragStartPos.current.x,
          y: e.clientY - dragStartPos.current.y
        })
      }
      if (isDraggingRef) {
        setRefPosition({
          x: e.clientX - dragStartRefPos.current.x,
          y: e.clientY - dragStartRefPos.current.y
        })
      }
    }
    const handleMouseUp = () => {
      setIsDraggingCalc(false)
      setIsDraggingRef(false)
    }

    if (isDraggingCalc || isDraggingRef) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingCalc, isDraggingRef])

  useEffect(() => {
    fetchTestData()
  }, [testId])

  // Reset show answer when question changes
  useEffect(() => {
    setShowAnswer(false)
  }, [currentQuestion])

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (loading || testCompleted || showModuleSummary) return
      
      const key = e.key.toUpperCase()
      const question = moduleQuestions[currentQuestion]
      
      // Toggle Shortcuts Modal
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault()
        setShowShortcutsModal(prev => !prev)
        return
      }

      // If modal is open, don't process other shortcuts
      if (showShortcutsModal || showFlagModal) return

      // Navigation
      if ((e.altKey && e.key === 'ArrowRight') || key === 'N') {
        e.preventDefault()
        if (currentQuestion < moduleQuestions.length - 1) {
          setCurrentQuestion(prev => prev + 1)
        }
      }
      
      if ((e.altKey && e.key === 'ArrowLeft') || key === 'P') {
        e.preventDefault()
        if (currentQuestion > 0) {
          setCurrentQuestion(prev => prev - 1)
        }
      }

      // Answer Selection
      if (['A', 'B', 'C', 'D'].includes(key) && question) {
        // Check if we are typing in an input (like flag note)
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return

        e.preventDefault()
        
        // Auto-uneliminate if selecting
        if (isEliminated(question._id, key)) {
          toggleEliminateAnswer(question._id, key)
        }
        handleAnswer(question._id, key)
      }

      // Actions
      if (key === 'M') {
        // Mark for review logic
        e.preventDefault()
        handleMarkForReview(question._id)
      }
      
      if (key === 'H') {
        // Toggle Line Reader
        e.preventDefault()
        setLineReaderActive(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentQuestion, moduleQuestions, showShortcutsModal, showFlagModal, loading, testCompleted, showModuleSummary])

  // Line Reader Mouse Handler
  useEffect(() => {
    if (!lineReaderActive) return

    const handleMouseMove = (e) => {
      // Calculate percentage from top of the screen
      const percentage = (e.clientY / window.innerHeight) * 100
      setLineReaderPos(Math.min(Math.max(percentage, 5), 95))
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [lineReaderActive])

  // Fullscreen and tab change detection
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && isFullscreen && !testCompleted && !showModuleSummary) {
        // Auto-submit test when tab is changed
        await handleAutoSubmit('You switched tabs or left the test window.')
      }
    }

    const handleFullscreenChange = async () => {
      if (!document.fullscreenElement && isFullscreen && !testCompleted && !showModuleSummary) {
        // Auto-submit test when fullscreen is exited
        await handleAutoSubmit('You exited fullscreen mode.')
      }
    }

    const handleEscKey = async (e) => {
      if (e.key === 'Escape' && isFullscreen && !testCompleted && !showModuleSummary) {
        e.preventDefault()
        // Auto-submit test when ESC is pressed
        if (document.fullscreenElement) {
          await document.exitFullscreen()
        }
        await handleAutoSubmit('You pressed ESC to exit fullscreen.')
      }
    }

    const handleF11Key = async (e) => {
      if (e.key === 'F11' && isFullscreen && !testCompleted && !showModuleSummary) {
        e.preventDefault()
        // Auto-submit test when F11 is pressed
        await handleAutoSubmit('You pressed F11 to exit fullscreen.')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('keydown', handleEscKey)
    document.addEventListener('keydown', handleF11Key)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('keydown', handleEscKey)
      document.removeEventListener('keydown', handleF11Key)
    }
  }, [isFullscreen, testCompleted, showModuleSummary, router, answers, moduleQuestions])

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

  // Auto-enter fullscreen when test starts (for tutor tests)
  useEffect(() => {
    if (test?.practiceMode === 'tutor' && !loading && !checkingHistory && !testCompleted && !showModuleSummary && moduleQuestions.length > 0 && !isFullscreen) {
      enterFullscreen()
    }
  }, [test, loading, checkingHistory, testCompleted, showModuleSummary, moduleQuestions, isFullscreen])

  useEffect(() => {
    // Timer logic:
    // - Tutor mode with duration: TIMER ACTIVE (timed tutor test)
    // - Tutor mode without duration: NO TIMER (untimed tutor test)
    // - Untimed mode: NO TIMER
    // - Timed mode: TIMER ACTIVE
    // - Standard mode: TIMER ACTIVE (always timed)
    
    const isTutor = test?.practiceMode === 'tutor'
    const isUntimed = test?.practiceMode === 'untimed'
    const hasDuration = test?.duration && test.duration > 0
    
    // Skip timer for untimed mode or tutor mode without duration
    if (isUntimed || (isTutor && !hasDuration)) return
    
    if (timeRemaining > 0 && !showModuleSummary && !testCompleted && !showRWInstructions && !showMathInstructions) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Auto-submit when time expires
            handleModuleComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [timeRemaining, showModuleSummary, testCompleted, showRWInstructions, showMathInstructions, test?.practiceMode, test?.duration])

  const fetchTestData = async () => {
    try {
      const token = localStorage.getItem('token')
      
      // Step 1: Fetch Test Data and History first to determine mode
      const [testRes, historyRes] = await Promise.all([
        fetch(`/api/admin/tests/${testId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),
        fetch('/api/test-sessions', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
      ])

      if (testRes.ok) {
        const testData = await testRes.json()
        
        // Step 2: Determine if we need Tutor questions
        const isTutor = testData.practiceMode === 'tutor' || testData.isTutorTest === true
        const questionsUrl = `/api/questions?isTutor=${isTutor}`
        
        console.log(`Fetching questions with isTutor=${isTutor} for test mode: ${testData.practiceMode}, configType: ${testData.configType}`)
        
        const questionsRes = await fetch(questionsUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })

        if (questionsRes.ok) {
            const questions = await questionsRes.json()
            console.log(`Fetched ${questions.length} questions from API`)
            let finalQuestions = questions


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

          // Filter out used questions if requested by test configuration
          if (testData.excludeUsedQuestions) {
            const usedIds = new Set()
            sessions.forEach(s => {
              if (s.responses) s.responses.forEach(r => usedIds.add(String(r.questionId)))
              if (s.adaptiveAssignedQuestionIds) s.adaptiveAssignedQuestionIds.forEach(id => usedIds.add(String(id)))
              if (s.moduleAnswers) {
                Object.values(s.moduleAnswers).forEach(m => {
                  if (m.questionIds) m.questionIds.forEach(id => usedIds.add(String(id)))
                })
              }
            })
            
            finalQuestions = questions.filter(q => !usedIds.has(String(q._id)))
            console.log(`Filtered out used questions: ${questions.length} -> ${finalQuestions.length}`)
          }
        }
        
        // PRIORITY: Explicitly assigned questions (Admin Created Tests)
        // If the test has specific questions assigned, use those directly and skip tag filtering
        if (testData.questions && testData.questions.length > 0) {
            console.log('Using explicitly assigned questions from test config:', testData.questions.length)
            const assignedIds = new Set(testData.questions.map(q => typeof q === 'object' ? q._id : q))
            finalQuestions = finalQuestions.filter(q => assignedIds.has(q._id))
            
            // If it's a tutor test, we still want to ensure we have questions
            if (testData.practiceMode === 'tutor' && finalQuestions.length === 0) {
                console.warn('Admin test has questions assigned but none were found in the full question bank.')
            }
        }
        // PRIORITY: Tutor Mode must enforce strict filtering (Only if no specific questions assigned)
        else if (testData.practiceMode === 'tutor') {
             const { subtopics, domains } = testData.filters || {}
             
             // Normalize string helper - aggressive normalization for better matching
             const normalize = (str) => str?.toLowerCase().trim().replace(/[^a-z0-9]/g, '') || ''

             if (!subtopics || subtopics.length === 0) {
                 console.error("Critical Error: Tutor mode active but no subtopics defined.")
                 alert("Error: No topic specified for this practice session. Please try again.")
                 finalQuestions = [] // Strict empty to prevent leaking all questions
             } else {
                 const normalizedSubtopics = subtopics.map(normalize)
                 console.log('Tutor Mode Filtering for:', normalizedSubtopics)

                 finalQuestions = finalQuestions.filter(q => {
                     if (!q.tags) return false
                     
                     let tags = []
                     try {
                         if (Array.isArray(q.tags)) {
                             tags = q.tags
                         } else if (typeof q.tags === 'string') {
                             if (q.tags.trim().startsWith('[')) {
                                 tags = JSON.parse(q.tags)
                             } else {
                                 tags = q.tags.split(',')
                             }
                         }
                     } catch (e) {
                         if (typeof q.tags === 'string') tags = q.tags.split(',')
                         else return false
                     }
                     
                     const normalizedTags = tags.map(normalize)
                     
                     // Flexible matching:
                     // 1. Exact match
                     // 2. Subtopic contains Tag (e.g. "Linear Equations (1&2)" contains "Linear Equations")
                     // 3. Tag contains Subtopic
                     const match = normalizedSubtopics.some(sub => 
                         normalizedTags.some(t => t && (t === sub || sub.includes(t) || t.includes(sub)))
                     )
                     return match
                 })
                 
                 console.log(`Tutor Mode: Filtered ${questions.length} -> ${finalQuestions.length} questions`)
                 
                 if (finalQuestions.length === 0) {
                     // Try fallback to domain if strictly no subtopic match found?
                     // NO. User explicitly complained about "loading all questions" or "wrong questions".
                     // Better to show 0 than wrong ones.
                     console.warn(`No questions found matching topics: ${subtopics.join(', ')}`)
                     alert(`No questions found matching the topic: ${subtopics[0]}. Please contact admin to add questions with this tag.`)
                 }
             }
        }
        // Standard/Custom Mode Filtering
        else if (testData.filters && (testData.filters.domains?.length > 0 || testData.filters.subtopics?.length > 0)) {
            const { subtopics, domains } = testData.filters
            const normalize = (str) => str?.toLowerCase().trim().replace(/[^a-z0-9]/g, '') || ''
            
            console.log('Standard/Custom Mode Filtering:', { subtopics, domains })
            
            if (subtopics && subtopics.length > 0) {
                const normalizedSubtopics = subtopics.map(normalize)
                console.log('Normalized subtopics for filtering:', normalizedSubtopics)
                
                finalQuestions = finalQuestions.filter(q => {
                    if (!q.tags) return false
                    let tags = []
                    try {
                         if (Array.isArray(q.tags)) tags = q.tags
                         else if (typeof q.tags === 'string') {
                             if (q.tags.trim().startsWith('[')) tags = JSON.parse(q.tags)
                             else tags = q.tags.split(',')
                         }
                    } catch (e) { return false }
                    
                    const normalizedTags = tags.map(normalize)
                    const match = normalizedTags.some(tag => 
                        normalizedSubtopics.some(sub => tag && (tag === sub || tag.includes(sub) || sub.includes(tag)))
                    )
                    return match
                })
                
                console.log(`Filtered by subtopics: ${questions.length} -> ${finalQuestions.length} questions`)
            } else if (domains && domains.length > 0) {
                // If only domains specified, filter by domain
                const normalizedDomains = domains.map(normalize)
                console.log('Normalized domains for filtering:', normalizedDomains)
                
                finalQuestions = finalQuestions.filter(q => {
                    if (!q.domain) return false
                    const normalizedDomain = normalize(q.domain)
                    return normalizedDomains.some(d => normalizedDomain.includes(d) || d.includes(normalizedDomain))
                })
                
                console.log(`Filtered by domains: ${questions.length} -> ${finalQuestions.length} questions`)
            }
        } else if (testData.configType === 'custom' && !testData.practiceMode === 'tutor') {
            // Customize mode with no specific filters - use all admin questions
            console.log('Customize mode with no filters - using all available admin questions')
        }

        setTest(testData)
        setAllQuestions(finalQuestions)
        
        console.log(`Final questions set: ${finalQuestions.length} questions`)
        console.log('Sample question:', finalQuestions[0])
        
        // Don't auto-load module, wait for user to start
        if (testData.sections?.rw) {
          setCurrentSection('rw')
        } else if (testData.sections?.math) {
          setCurrentSection('math')
        }
      } // End of questionsRes.ok check
    } // End of testRes.ok check
    } catch (error) {
      console.error('Error fetching test:', error)
    } finally {
      setCheckingHistory(false)
      setLoading(false)
    }
  }

  const loadModule = (section, moduleNum, questions, testData) => {
    const subject = section === 'rw' ? 'Reading and Writing' : 'Math'
    let questionCount = section === 'rw' ? 27 : 22
    let duration = section === 'rw' ? 32 : 35
    
    // For tutor tests, use the test's duration if specified
    if (testData?.practiceMode === 'tutor' && testData?.duration) {
      duration = testData.duration
    }
    
    console.log(`Loading ${subject} Module ${moduleNum}`)
    console.log('Total questions available:', questions.length)
    console.log('Test config:', { configType: testData?.configType, practiceMode: testData?.practiceMode, isTutorTest: testData?.isTutorTest, duration: duration })
    console.log('Test filters:', testData?.filters)
    
    let filteredQuestions = questions.filter(q => {
      // Try both formats
      return q.subject === subject || 
             q.subject === 'Reading & Writing' && subject === 'Reading and Writing' ||
             q.subject === 'Reading and Writing' && subject === 'Reading and Writing'
    })
    
    console.log(`Filtered ${subject} questions:`, filteredQuestions.length)
    console.log('Sample filtered question:', filteredQuestions[0])
    
    if (filteredQuestions.length === 0) {
      console.error(`No questions found for subject: ${subject}`)
      alert(`No questions available for ${subject}. Please add questions to the question bank.`)
      return
    }
    
    let selectedQuestions = []
    
    // Check if this is a Tutor-Created Test (admin/teacher assigned test)
    const isTutorCreatedTest = testData?.isTutorTest === true || (testData?.questions && testData.questions.length > 0)
    
    if (isTutorCreatedTest) {
      // TUTOR-CREATED TEST: Use all available questions, no module structure enforcement
      console.log('Tutor-created test detected - using all available questions')
      selectedQuestions = shuffleArray(filteredQuestions)
      
      if (selectedQuestions.length === 0) {
        alert(`No questions available for ${subject}.`)
        router.push(returnUrl)
        return
      }
    } else {
      // STUDENT PRACTICE TESTS: Use 2-module structure with fixed question counts
      // Standard: 27 R&W / 22 Math per module
      // Customize: 27 R&W / 22 Math per module
      // Tutor Mode: 27 R&W / 22 Math per module (but shows answers immediately)
      
      if (moduleNum === 1) {
        // Module 1 - Show instructions for all modes
        if (section === 'rw') {
          setShowRWInstructions(true)
        } else if (section === 'math') {
          setShowMathInstructions(true)
        }
        
        // Use standard distribution for Module 1
        const distribution = section === 'rw' 
          ? { easy: 7, medium: 12, hard: 8 }  // R&W Module 1: 27 questions
          : { easy: 6, medium: 11, hard: 5 }  // Math Module 1: 22 questions
        
        selectedQuestions = selectQuestionsByDistribution(filteredQuestions, distribution)
      } else {
        // Module 2 - Adaptive based on Module 1 performance
        const module1Key = `${section}_module1`
        const module1Score = moduleScores[module1Key] || 0
        const routingPath = determineRoutingPath(module1Score, section, questionCount)
        
        const distribution = getAdaptiveDistribution(section, routingPath)
        selectedQuestions = selectQuestionsByDistribution(filteredQuestions, distribution)
      }
      
      // Check if we have enough questions
      if (selectedQuestions.length < questionCount) {
        console.warn(`Not enough questions: need ${questionCount}, have ${selectedQuestions.length}`)
        alert(`Not enough questions available for ${subject}. Need ${questionCount} questions but only ${selectedQuestions.length} available with current filters.`)
        router.push(returnUrl)
        return
      }
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

  // Helper Functions for New Features
  const toggleEliminateAnswer = (questionId, option) => {
    setEliminatedAnswers(prev => {
      const currentEliminations = prev[questionId] || []
      if (currentEliminations.includes(option)) {
        return { ...prev, [questionId]: currentEliminations.filter(o => o !== option) }
      } else {
        return { ...prev, [questionId]: [...currentEliminations, option] }
      }
    })
  }

  const isEliminated = (questionId, option) => {
    return eliminatedAnswers[questionId]?.includes(option)
  }

  const handleMarkForReview = async (questionId) => {
    const isMarked = markedQuestions.has(questionId)
    const question = moduleQuestions.find(q => q._id === questionId)
    if (!question) return

    try {
      const token = localStorage.getItem('token')
      if (isMarked) {
        await fetch(`/api/marked-questions?questionId=${questionId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })
        setMarkedQuestions(prev => {
          const newSet = new Set(prev)
          newSet.delete(questionId)
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
            questionId: questionId,
            testId,
            testDate: new Date(),
            subject: question.subject,
            difficulty: question.difficulty,
            section: currentSection
          })
        })
        setMarkedQuestions(prev => new Set([...prev, questionId]))
      }
    } catch (error) {
      console.error('Error marking question:', error)
    }
  }

  const handleAutoSubmit = async (reason) => {
    try {
      // Show modal instead of alert
      setAutoSubmitReason(reason)
      setShowAutoSubmitModal(true)
      
      // Wait a moment for user to see the message
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Force complete the test immediately
      if (test?.practiceMode === 'tutor') {
        // For tutor mode, calculate and submit
        const correct = Object.keys(answers).filter(qId => {
          const q = moduleQuestions.find(mq => mq._id === qId)
          return q && answers[qId] === q.correctAnswer
        }).length
        
        const token = localStorage.getItem('token')
        if (token) {
          const totalTimeSpent = Object.values(questionTimes).reduce((a, b) => a + b, 0)
          const responses = []
          
          Object.keys(answers).forEach(qId => {
            const q = moduleQuestions.find(mq => mq._id === qId)
            if (q) {
              responses.push({
                questionId: qId,
                selectedAnswer: answers[qId],
                isCorrect: answers[qId] === q.correctAnswer,
                timeSpent: questionTimes[qId] || 0,
                answeredAt: new Date()
              })
            }
          })

          const sessionData = {
            testId,
            status: 'Completed',
            moduleScores,
            moduleAnswers,
            responses,
            rwScore: 0,
            mathScore: 0,
            totalScore: correct,
            timeSpent: totalTimeSpent,
            completedAt: new Date().toISOString()
          }

          const url = sessionId ? `/api/test-sessions/${sessionId}` : '/api/test-sessions'
          const method = sessionId ? 'PUT' : 'POST'

          await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(sessionData)
          })
        }
      }
      
      // Exit fullscreen if still in it
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }
      
      // Redirect back
      router.push(returnUrl)
    } catch (error) {
      console.error('Auto-submit error:', error)
      router.push(returnUrl)
    }
  }

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
    // Removed immediate answer feedback for tutor mode
    // Students will see results only on the analysis page after completing the test
  }

  const handleModuleComplete = () => {
    // Calculate module score
    let correctCount = 0
    moduleQuestions.forEach(q => {
      const userAnswer = answers[q._id]
      const correctAnswer = q.correctAnswer
      
      // Check if it's multiple choice or fill-in-the-blank
      const hasOptions = q.optionA?.trim() && q.optionB?.trim() && q.optionC?.trim() && q.optionD?.trim()
      
      if (hasOptions) {
        // Multiple choice - exact match
        if (userAnswer === correctAnswer) correctCount++
      } else {
        // Fill-in-the-blank - case-insensitive comparison with trimmed whitespace
        if (userAnswer?.trim().toLowerCase() === correctAnswer?.trim().toLowerCase()) {
          correctCount++
        }
      }
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
    
    // If Tutor Mode, skip summary and go straight to completion
    if (test?.practiceMode === 'tutor') {
      // Small delay to ensure state updates
      setTimeout(() => {
        calculateFinalScore()
      }, 100)
    } else {
      setShowModuleSummary(true)
    }
  }

  const handleNextModule = () => {
    setShowModuleSummary(false)
    setEliminatedAnswers({}) // Clear eliminations for new module
    setMarkedQuestions(new Set()) // Clear marks for new module
    
    if (test?.practiceMode === 'tutor') {
        // Tutor mode should not have multiple modules
        calculateFinalScore()
        return
    }

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
    // Check if we are in tutor mode, if so, calculate simple score
    if (test?.practiceMode === 'tutor') {
        const correct = Object.keys(answers).filter(qId => {
            const q = moduleQuestions.find(mq => mq._id === qId)
            if (!q) return false
            
            const userAnswer = answers[qId]
            const correctAnswer = q.correctAnswer
            
            // Check if it's multiple choice or fill-in-the-blank
            const hasOptions = q.optionA?.trim() && q.optionB?.trim() && q.optionC?.trim() && q.optionD?.trim()
            
            if (hasOptions) {
              // Multiple choice - exact match
              return userAnswer === correctAnswer
            } else {
              // Fill-in-the-blank - case-insensitive comparison
              return userAnswer?.trim().toLowerCase() === correctAnswer?.trim().toLowerCase()
            }
        }).length
        
        // For tutor mode, just save the session and redirect
        setFinalScore({ total: correct }) // Simplified score
        setTestCompleted(true)
        
        try {
            const token = localStorage.getItem('token')
            if (!token) return

            // Calculate Total Time Spent (sum of all question times)
            const totalTimeSpent = Object.values(questionTimes).reduce((a, b) => a + b, 0)

            // Generate responses array with time tracking for Tutor Mode
            const responses = []
            Object.keys(answers).forEach(qId => {
                const q = moduleQuestions.find(mq => mq._id === qId)
                if (q) {
                    const userAnswer = answers[qId]
                    const correctAnswer = q.correctAnswer
                    let isCorrect = false
                    
                    // Check if it's multiple choice or fill-in-the-blank
                    const hasOptions = q.optionA?.trim() && q.optionB?.trim() && q.optionC?.trim() && q.optionD?.trim()
                    
                    if (hasOptions) {
                      isCorrect = userAnswer === correctAnswer
                    } else {
                      isCorrect = userAnswer?.trim().toLowerCase() === correctAnswer?.trim().toLowerCase()
                    }
                    
                    responses.push({
                        questionId: qId,
                        selectedAnswer: userAnswer,
                        isCorrect: isCorrect,
                        timeSpent: questionTimes[qId] || 0,
                        answeredAt: new Date()
                    })
                }
            })

            const sessionData = {
                testId,
                status: 'Completed',
                moduleScores,
                moduleAnswers, // This might be partial, but responses is key
                responses,
                rwScore: 0, // Not applicable for single topic
                mathScore: 0, // Not applicable for single topic
                totalScore: correct, // Just raw count for now or scaled if needed
                timeSpent: totalTimeSpent, // Total duration in seconds
                completedAt: new Date().toISOString()
            }

            console.log('Saving Tutor session:', sessionData)
            const url = sessionId ? `/api/test-sessions/${sessionId}` : '/api/test-sessions'
            const method = sessionId ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(sessionData)
            })
            
            const responseData = await response.json()
             if (response.ok) {
                  // Redirect to the new result page with Session ID as query param or part of URL
                  // The new result page expects to fetch data using session ID
                  // Route: /dashboard/tests/[id]/results?session_id=SESSION_ID
                  const finalSessionId = sessionId || responseData.session._id
                  setCompletedSessionId(finalSessionId)
                  // router.push(`/dashboard/tests/${testId}/results?session_id=${finalSessionId}&returnUrl=${encodeURIComponent(returnUrl)}`)
             }
         } catch (e) {
             console.error(e)
         }
         return
     }

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
      
    // Generate responses array with time tracking
    const responses = []
    if (moduleAnswers) {
        Object.values(moduleAnswers).forEach(mod => {
          const modAnswers = mod.answers || {}
          Object.keys(modAnswers).forEach(qId => {
             const q = allQuestions.find(qt => String(qt._id) === String(qId))
             if (q) {
               const userAnswer = modAnswers[qId]
               const correctAnswer = q.correctAnswer
               let isCorrect = false
               
               // Check if it's multiple choice or fill-in-the-blank
               const hasOptions = q.optionA?.trim() && q.optionB?.trim() && q.optionC?.trim() && q.optionD?.trim()
               
               if (hasOptions) {
                 isCorrect = userAnswer === correctAnswer
               } else {
                 isCorrect = userAnswer?.trim().toLowerCase() === correctAnswer?.trim().toLowerCase()
               }
               
               responses.push({
                 questionId: qId,
                 selectedAnswer: userAnswer,
                 isCorrect: isCorrect,
                 timeSpent: questionTimes[qId] || 0,
                 answeredAt: new Date()
               })
             }
          })
        })
    }

    const sessionData = {
        testId,
        status: 'Completed',
        moduleScores,
        moduleAnswers,
        responses,
        rwScore,
        mathScore,
        totalScore: total,
        completedAt: new Date().toISOString()
      }
      
      console.log('Saving test session:', sessionData)
      
      const url = sessionId ? `/api/test-sessions/${sessionId}` : '/api/test-sessions'
      const method = sessionId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(sessionData)
      })
      
      const responseData = await response.json()
      
      if (response.ok) {
        console.log('✅ Test session saved successfully:', responseData)
        setCompletedSessionId(responseData.session._id)
        // router.push(`/dashboard/tests/${testId}/results?returnUrl=${encodeURIComponent(returnUrl)}`)
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
                onClick={() => router.push(returnUrl)}
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
                {test?.practiceMode !== 'untimed' && <li>✓ Timer will start immediately</li>}
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
                onClick={() => router.push(returnUrl)}
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
                disabled={!completedSessionId}
                onClick={() => {
                  if (!completedSessionId) return
                  const url = `/dashboard/tests/${testId}/results?session_id=${completedSessionId}&returnUrl=${encodeURIComponent(returnUrl)}`
                  router.push(url)
                }}
                className={`w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 flex items-center justify-center gap-2 ${!completedSessionId ? 'opacity-70 cursor-wait' : ''}`}
              >
                {!completedSessionId ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Saving Results...</span>
                  </>
                ) : (
                  <>
                    <span>📊</span>
                    <span>View Detailed Analysis</span>
                  </>
                )}
              </button>
              <button
                onClick={() => router.push(returnUrl)}
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
            onClick={() => router.push(returnUrl)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Tests
          </button>
        </div>
      </div>
    )
  }

  const optionsList = (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Choose an Answer
        </span>
      </div>
      
      {['A', 'B', 'C', 'D'].map((option) => {
        const isSelected = answers[currentQ._id] === option
        const isElim = isEliminated(currentQ._id, option)
        // Only show immediate feedback for Tutor MODE (self-practice), NOT tutor-created tests
        const isTutorMode = test?.practiceMode === 'tutor' && !test?.isTutorTest
        const isCorrect = currentQ.correctAnswer === option
        
        let containerStyle = ''
        let circleStyle = ''
        
        if (isTutorMode && answers[currentQ._id]) {
            if (isCorrect) {
                 // Always highlight correct answer in green, whether selected or not
                 containerStyle = 'border-green-500 bg-green-50'
                 circleStyle = 'border-green-600 bg-green-600 text-white'
            } else if (isSelected) {
                // Wrong answer selected
                containerStyle = 'border-red-500 bg-red-50'
                circleStyle = 'border-red-600 bg-red-600 text-white'
            } else if (isElim) {
                 containerStyle = 'border-gray-200 bg-gray-50'
                 circleStyle = 'border-gray-300 text-gray-300 bg-transparent'
            } else {
                containerStyle = 'border-gray-300 opacity-60'
                circleStyle = 'border-gray-400 text-gray-700 bg-white'
            }
        } else {
            if (isSelected) {
                containerStyle = 'border-gray-800 bg-gray-50'
                circleStyle = 'border-gray-800 bg-gray-800 text-white'
            } else if (isElim) {
                containerStyle = 'border-gray-200 bg-gray-50'
                circleStyle = 'border-gray-300 text-gray-300 bg-transparent'
            } else {
                containerStyle = 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                circleStyle = 'border-gray-400 text-gray-700 bg-white group-hover:border-gray-600'
            }
        }

        return (
          <div key={option} className="flex items-stretch gap-3">
            <div
              className={`group flex-1 flex items-stretch border-2 rounded-lg transition-all overflow-hidden relative ${containerStyle}`}
            >
              <button
                onClick={() => {
                   if (isElim) toggleEliminateAnswer(currentQ._id, option);
                   handleAnswer(currentQ._id, option);
                }}
                className="flex-1 text-left p-3 sm:p-4 flex items-start gap-3 sm:gap-4 relative"
                disabled={isTutorMode && answers[currentQ._id]}
              >
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-semibold transition-colors ${circleStyle}`}>
                  {option}
                </div>
                <div className={`flex-1 pt-1 text-base sm:text-lg leading-relaxed ${
                  isElim ? 'text-gray-400 line-through decoration-2 decoration-gray-400' : 'text-gray-900'
                }`}>
                  {currentQ?.[`option${option}`]}
                </div>
              </button>
            </div>

            <button
               onClick={(e) => {
                 e.stopPropagation()
                 toggleEliminateAnswer(currentQ._id, option)
               }}
               className={`group flex-shrink-0 w-10 sm:w-12 flex items-center justify-center rounded-lg border-2 transition-colors ${
                 isElim 
                   ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                   : 'bg-white text-gray-300 border-gray-200 hover:text-gray-500 hover:border-gray-300 hover:bg-gray-50'
               }`}
               title={isElim ? "Undo Elimination" : "Eliminate Answer"}
               disabled={isTutorMode && answers[currentQ._id]}
            >
              {isElim ? (
                <span className="text-xs font-bold">Undo</span>
              ) : (
                <div className="relative w-5 h-5 flex items-center justify-center font-bold text-[10px] border border-current rounded">
                  ABC
                  <div className={`absolute inset-0 border-t border-current transform -rotate-12 top-1/2 ${isElim ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}></div>
                </div>
              )}
            </button>
          </div>
        )
      })}
    </div>
  )

  return (
    <div ref={testContainerRef} className="h-screen flex flex-col bg-white">
      {/* Top Header */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between z-50 relative">
        <div className="text-base font-bold text-gray-900">
          Section 1, Module {currentModule}: {currentSection === 'rw' ? 'Reading and Writing' : 'Math'}
        </div>
        {/* Show timer for timed tests (including timed tutor tests) */}
        {!(test?.practiceMode === 'untimed' || (test?.practiceMode === 'tutor' && (!test?.duration || test.duration === 0))) && (
          <div className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FiClock className="w-5 h-5" />
            {formatTime(timeRemaining)}
          </div>
        )}
        <div className="flex items-center gap-4">
          {currentSection === 'math' && (
            <>
              <button
                onClick={() => setShowCalculator(!showCalculator)}
                className={`p-2 hover:bg-gray-100 rounded transition-colors ${showCalculator ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}
                title="Calculator"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => setShowReference(!showReference)}
                className={`p-2 hover:bg-gray-100 rounded transition-colors ${showReference ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}
                title="Reference"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            </>
          )}
          <button 
            onClick={() => setShowFlagModal(true)}
            className="text-gray-600 hover:text-gray-800 p-2"
            title="Flag Question"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" />
            </svg>
          </button>
          
          {/* More Menu */}
          <div className="relative">
            <button 
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="flex flex-col items-center cursor-pointer hover:bg-gray-100 p-2 rounded"
            >
              <FiMoreVertical className="text-gray-600 mb-1" />
              <span className="text-[10px] font-medium text-gray-600">More</span>
            </button>
            
            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                <button 
                  onClick={() => { 
                    setShowMoreMenu(false); 
                    setShowHighlights(!showHighlights);
                  }}
                  className={`w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-50 ${showHighlights ? 'bg-gray-50' : ''}`}
                >
                  <FiEdit2 className="text-gray-500" />
                  <span className="text-sm font-medium">Highlights & Notes {showHighlights ? '(On)' : ''}</span>
                </button>
                <div className="border-t my-2"></div>
                <button 
                  onClick={() => { setShowMoreMenu(false); /* Implement help */ }}
                  className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-50"
                >
                  <FiHelpCircle className="text-gray-500" />
                  <span className="text-sm font-medium">Help</span>
                </button>
                <button 
                  onClick={() => { setShowMoreMenu(false); setShowShortcutsModal(true) }}
                  className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-50"
                >
                  <FiGrid className="text-gray-500" />
                  <span className="text-sm font-medium">Shortcuts</span>
                </button>
                <button 
                  onClick={() => { 
                    setShowMoreMenu(false); 
                    setAssistiveTechMode(!assistiveTechMode);
                  }}
                  className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-50"
                >
                  <FiLayers className="text-gray-500" />
                  <span className="text-sm font-medium">Assistive Technology {assistiveTechMode ? '(On)' : '(Off)'}</span>
                </button>
                <button 
                  onClick={() => { 
                    setShowMoreMenu(false); 
                    setLineReaderActive(!lineReaderActive);
                  }}
                  className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-50"
                >
                  <FiBookOpen className="text-gray-500" />
                  <span className="text-sm font-medium">Line Reader {lineReaderActive ? '(On)' : '(Off)'}</span>
                </button>
                <div className="border-t my-2"></div>
                <button 
                  onClick={() => { setShowMoreMenu(false); /* Implement Unscheduled Break */ }}
                  className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-50"
                >
                  <FiClock className="text-gray-500" />
                  <span className="text-sm font-medium">Unscheduled Break</span>
                </button>
                <div className="border-t my-2"></div>
                <button 
                  onClick={() => { 
                    setShowMoreMenu(false); 
                    router.push(returnUrl);
                  }}
                  className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-50"
                >
                  <FiAlertTriangle className="text-gray-500" />
                  <span className="text-sm font-medium">Exit the Exam</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Split Content */}
      <div className={`flex-1 flex overflow-hidden ${assistiveTechMode ? 'assistive-mode' : ''}`}>
        
        {/* Line Reader Overlay */}
        {lineReaderActive && (
          <div className="absolute inset-0 z-40 pointer-events-none">
            {/* Top Mask */}
            <div 
              className="w-full bg-black bg-opacity-50 transition-none absolute top-0"
              style={{ height: `${lineReaderPos - 5}%` }}
            />
            {/* Clear Window */}
            <div 
              className="w-full h-[10%] absolute bg-transparent border-y-2 border-yellow-400 shadow-lg" 
              style={{ top: `${lineReaderPos - 5}%` }}
            />
            {/* Bottom Mask */}
            <div 
              className="w-full bg-black bg-opacity-50 transition-none absolute bottom-0"
              style={{ height: `${100 - (lineReaderPos + 5)}%` }}
            />
          </div>
        )}

        {/* Left Side - Passage + Question + (Tutor: Options) */}
        <div className="w-1/2 h-full overflow-y-auto p-8 bg-gray-50 relative border-r border-gray-300">
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

            {/* Removed tutor mode options from left side - all tests now use standard layout */}
          </div>
        </div>

        {/* Right Side */}
        <div className="w-1/2 h-full overflow-y-auto p-8 bg-gray-50 relative">
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-gray-300 text-6xl font-bold transform -rotate-45 opacity-30 select-none">
              www.dsatguru.com
            </div>
          </div>
          
          {/* Content */}
          <div className="max-w-2xl mx-auto relative z-10">
            {/* All tests now use standard timed mode layout - no immediate answers */}
            {/* STANDARD MODE: Question Number + Options */}
              <>
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
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                      markedQuestions.has(currentQ._id) 
                        ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-5 h-5" fill={markedQuestions.has(currentQ._id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <span className="font-medium text-sm">Mark for Review</span>
                  </button>
                </div>

                {/* Answer Options - Check if Multiple Choice or Fill-in-the-Blank */}
                {(currentQ?.optionA?.trim() && currentQ?.optionB?.trim() && currentQ?.optionC?.trim() && currentQ?.optionD?.trim()) ? (
                  // MULTIPLE CHOICE QUESTIONS
                  <div className="space-y-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Choose an Answer
                      </span>
                    </div>
                    
                    {['A', 'B', 'C', 'D'].map((option) => {
                      const isSelected = answers[currentQ._id] === option
                      const isElim = isEliminated(currentQ._id, option)
                      // Only show immediate feedback for Tutor MODE (self-practice), NOT tutor-created tests
                      const isTutorMode = test?.practiceMode === 'tutor' && !test?.isTutorTest
                      const isCorrect = currentQ.correctAnswer === option
                      
                      let containerStyle = ''
                      let circleStyle = ''
                      
                      if (isTutorMode && answers[currentQ._id]) {
                          if (isCorrect) {
                               // Always highlight correct answer in green, whether selected or not
                               containerStyle = 'border-green-500 bg-green-50'
                               circleStyle = 'border-green-600 bg-green-600 text-white'
                          } else if (isSelected) {
                              // Wrong answer selected
                              containerStyle = 'border-red-500 bg-red-50'
                              circleStyle = 'border-red-600 bg-red-600 text-white'
                          } else if (isElim) {
                               containerStyle = 'border-gray-200 bg-gray-50'
                               circleStyle = 'border-gray-300 text-gray-300 bg-transparent'
                          } else {
                              containerStyle = 'border-gray-300 opacity-60'
                              circleStyle = 'border-gray-400 text-gray-700 bg-white'
                          }
                      } else {
                          if (isSelected) {
                              containerStyle = 'border-gray-800 bg-gray-50'
                              circleStyle = 'border-gray-800 bg-gray-800 text-white'
                          } else if (isElim) {
                              containerStyle = 'border-gray-200 bg-gray-50'
                              circleStyle = 'border-gray-300 text-gray-300 bg-transparent'
                          } else {
                              containerStyle = 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                              circleStyle = 'border-gray-400 text-gray-700 bg-white group-hover:border-gray-600'
                          }
                      }
                      
                      return (
                        <div key={option} className="flex items-stretch gap-3">
                          <div
                            className={`group flex-1 flex items-stretch border-2 rounded-lg transition-all overflow-hidden relative ${containerStyle}`}
                          >
                            <button
                              onClick={() => {
                                 if (isElim) toggleEliminateAnswer(currentQ._id, option);
                                 handleAnswer(currentQ._id, option);
                              }}
                              className="flex-1 text-left p-3 sm:p-4 flex items-start gap-3 sm:gap-4 relative"
                              disabled={isTutorMode && answers[currentQ._id]}
                            >
                              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-semibold transition-colors ${circleStyle}`}>
                                {option}
                              </div>
                              <div className={`flex-1 pt-1 text-base sm:text-lg leading-relaxed ${
                                isElim ? 'text-gray-400 line-through decoration-2 decoration-gray-400' : 'text-gray-900'
                              }`}>
                                {currentQ?.[`option${option}`]}
                              </div>
                            </button>
                          </div>

                          <button
                             onClick={(e) => {
                               e.stopPropagation()
                               toggleEliminateAnswer(currentQ._id, option)
                             }}
                             className={`group flex-shrink-0 w-10 sm:w-12 flex items-center justify-center rounded-lg border-2 transition-colors ${
                               isElim 
                                 ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                                 : 'bg-white text-gray-300 border-gray-200 hover:text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                             }`}
                             title={isElim ? "Undo Elimination" : "Eliminate Answer"}
                             disabled={isTutorMode && answers[currentQ._id]}
                          >
                            {isElim ? (
                              <span className="text-xs font-bold">Undo</span>
                            ) : (
                              <div className="relative w-5 h-5 flex items-center justify-center font-bold text-[10px] border border-current rounded">
                                ABC
                                <div className={`absolute inset-0 border-t border-current transform -rotate-12 top-1/2 ${isElim ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}></div>
                              </div>
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  // FILL-IN-THE-BLANK QUESTIONS
                  <div className="space-y-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Enter Your Answer
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={answers[currentQ._id] || ''}
                        onChange={(e) => handleAnswer(currentQ._id, e.target.value)}
                        className="w-full border-2 border-gray-300 rounded-lg p-4 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                        placeholder="Type your answer here..."
                        disabled={test?.practiceMode === 'tutor' && !test?.isTutorTest && answers[currentQ._id]}
                      />
                      
                      {/* Show feedback for tutor mode */}
                      {test?.practiceMode === 'tutor' && !test?.isTutorTest && answers[currentQ._id] && (
                        <div className={`p-4 rounded-lg border-2 ${
                          answers[currentQ._id]?.trim().toLowerCase() === currentQ.correctAnswer?.trim().toLowerCase()
                            ? 'bg-green-50 border-green-500'
                            : 'bg-red-50 border-red-500'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            {answers[currentQ._id]?.trim().toLowerCase() === currentQ.correctAnswer?.trim().toLowerCase() ? (
                              <>
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-bold text-green-700">Correct!</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-bold text-red-700">Incorrect</span>
                              </>
                            )}
                          </div>
                          <div className="text-sm">
                            <span className="font-semibold">Your answer:</span> {answers[currentQ._id]}
                          </div>
                          <div className="text-sm mt-1">
                            <span className="font-semibold">Correct answer:</span> {currentQ.correctAnswer}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tutor Mode: Show Explanation after answer is selected (NOT for tutor-created tests) */}
                {test?.practiceMode === 'tutor' && !test?.isTutorTest && answers[currentQ._id] && currentQ?.explanation && (
                  <div className="mt-6 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-blue-600 rounded-lg text-white flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 text-lg mb-2">Explanation</h4>
                        <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                          {renderWithImages(currentQ.explanation)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Show correct answer */}
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-700">Correct Answer:</span>
                        <span className="px-3 py-1 bg-green-600 text-white rounded-full font-bold">
                          {currentQ.correctAnswer}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
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
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-0 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 w-[calc(100vw-2rem)] sm:w-max max-w-[95vw] sm:max-w-lg md:max-w-3xl max-h-[80vh] overflow-y-auto z-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 text-lg">Question Navigator</h3>
                  <button onClick={() => setShowQuestionNav(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>

                {/* Color Legend */}
                <div className="mb-5 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Status Guide</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-600 ring-2 ring-blue-200"></div>
                      <span className="font-medium text-gray-700">Current</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="font-medium text-gray-700">Marked</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="font-medium text-gray-700">Answered</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-200 border border-gray-300"></div>
                      <span className="font-medium text-gray-700">Unanswered</span>
                    </div>
                  </div>
                </div>

                <div className={`grid gap-3 justify-items-center ${currentSection === 'rw' ? 'grid-cols-5 sm:grid-cols-7 md:grid-cols-9' : 'grid-cols-5 sm:grid-cols-8 md:grid-cols-11'}`}>
                  {moduleQuestions.map((q, idx) => {
                    const qId = String(q._id || q.id)
                    const isAnswered = !!answers[qId]
                    const isCurrent = idx === currentQuestion
                    const isMarked = markedQuestions.has(qId)

                    return (
                      <button
                        key={idx}
                        onClick={() => { setCurrentQuestion(idx); setShowQuestionNav(false) }}
                        className={`w-10 h-10 rounded-full font-semibold text-sm transition-all ${
                          isCurrent ? 'bg-blue-600 text-white ring-2 ring-blue-300 ring-offset-1' :
                          isMarked ? 'bg-orange-500 text-white' :
                          isAnswered ? 'bg-green-500 text-white' :
                          'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title={`Question ${idx + 1}${isMarked ? ' (Marked)' : ''}${isAnswered ? ' (Answered)' : ''}`}
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
            className="px-8 py-2.5 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700"
          >
            {currentQuestion === moduleQuestions.length - 1 ? 'Submit Module' : 'Next'}
          </button>
        </div>
      </div>

      {/* Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-0 max-w-2xl w-full mx-4 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Keyboard Shortcuts</h3>
              <button onClick={() => setShowShortcutsModal(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FiArrowRight className="text-blue-600" /> Navigation
                </h4>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex justify-between">
                    <span>Next Question</span>
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded border">Alt + N</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Previous Question</span>
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded border">Alt + P</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Jump to Question</span>
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded border">Ctrl + G</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FiCheckCircle className="text-green-600" /> Selection
                </h4>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex justify-between">
                    <span>Select A, B, C, D</span>
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded border">A, B, C, D</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Mark for Review</span>
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded border">M</span>
                  </li>
                </ul>
              </div>

              <div className="col-span-2 border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FiLayers className="text-purple-600" /> Tools
                </h4>
                <div className="grid grid-cols-2 gap-8">
                  <ul className="space-y-3 text-sm text-gray-600">
                    <li className="flex justify-between">
                      <span>Toggle Line Reader</span>
                      <span className="font-mono bg-gray-100 px-2 py-0.5 rounded border">H</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Show/Hide Timer</span>
                      <span className="font-mono bg-gray-100 px-2 py-0.5 rounded border">T</span>
                    </li>
                  </ul>
                  <ul className="space-y-3 text-sm text-gray-600">
                    <li className="flex justify-between">
                      <span>Show Shortcuts</span>
                      <span className="font-mono bg-gray-100 px-2 py-0.5 rounded border">Ctrl + /</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 border-t text-center">
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flag Question Modal */}
      {showFlagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Flag Question</h3>
            <p className="text-sm text-gray-600 mb-4">Please note your concern about this question:</p>
            <textarea
              value={flagNote}
              onChange={(e) => setFlagNote(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4"
              rows="4"
              placeholder="Describe your concern..."
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowFlagModal(false)
                  setFlagNote('')
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!flagNote.trim()) {
                    alert('Please enter a note')
                    return
                  }
                  try {
                    const token = localStorage.getItem('token')
                    await fetch('/api/flagged-questions', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        questionId: currentQ._id,
                        testId,
                        testName: test?.title || 'Unknown Test',
                        studentNote: flagNote,
                        subject: currentQ.subject,
                        difficulty: currentQ.difficulty
                      })
                    })
                    setShowFlagModal(false)
                    setFlagNote('')
                    alert('Question flagged successfully!')
                  } catch (error) {
                    console.error('Error flagging question:', error)
                    alert('Failed to flag question')
                  }
                }}
                className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RW Instructions Modal */}
       {showRWInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full overflow-hidden border-[3px] border-blue-600">
            <div className="p-8 space-y-6">
              <div className="space-y-4 text-gray-800 text-lg leading-relaxed">
                <p>
                  The questions in this section address a number of important reading and writing skills. Each question includes one or more passages, which may include a table or graph. Read each passage and question carefully, and then choose the best answer to the question based on the passage(s).
                </p>
                <p>
                  All questions in this section are multiple-choice with four answer choices. Each question has a single best answer.
                </p>
              </div>
              
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setShowRWInstructions(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-10 rounded-full shadow-md transition-all border border-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

       {/* Math Instructions Modal */}
       {showMathInstructions && (
         <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[100] p-4">
           <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full overflow-hidden border-[3px] border-blue-600 flex flex-col max-h-[90vh]">
             <div className="p-8 space-y-6 overflow-y-auto flex-1 text-gray-800 text-base leading-relaxed">
               <p className="font-semibold text-lg">The questions in this section address a number of important math skills.</p>
               <p>Use of a calculator is permitted for all questions. A reference sheet, calculator, and these directions can be accessed throughout the test.</p>
               
               <div className="space-y-2">
                 <p className="font-semibold">Unless otherwise indicated:</p>
                 <ul className="list-disc pl-6 space-y-1">
                   <li>All variables and expressions represent real numbers.</li>
                   <li>Figures provided are drawn to scale.</li>
                   <li>All figures lie in a plane.</li>
                   <li>The domain of a given function f is the set of all real numbers x for which f(x) is a real number.</li>
                 </ul>
               </div>

               <p>For <span className="font-bold">multiple-choice questions</span>, solve each problem and choose the correct answer from the choices provided. Each multiple-choice question has a single correct answer.</p>
               
               <div className="space-y-2">
                 <p>For <span className="font-bold">student-produced response questions</span>, solve each problem and enter your answer as described below.</p>
                 <ul className="list-disc pl-6 space-y-2">
                   <li>If you find <span className="font-bold">more than one correct answer</span>, enter only one answer.</li>
                   <li>You can enter up to 5 characters for a <span className="font-bold">positive answer</span> and up to 6 characters (including the negative sign) for a <span className="font-bold">negative answer</span>.</li>
                   <li>If your answer is a <span className="font-bold">fraction</span> that doesn&apos;t fit in the provided space, enter the decimal equivalent.</li>
                  <li>If your answer is a <span className="font-bold">decimal</span> that doesn&apos;t fit in the provided space, enter it by truncating or rounding at the fourth digit.</li>
                   <li>If your answer is a <span className="font-bold">mixed number</span> (such as 3 1/2), enter it as an improper fraction (7/2) or its decimal equivalent (3.5).</li>
                 </ul>
               </div>
             </div>
             
             <div className="p-6 bg-gray-50 border-t flex justify-end">
               <button
                 onClick={() => setShowMathInstructions(false)}
                 className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-10 rounded-full shadow-md transition-all border border-blue-700"
               >
                 Close
               </button>
             </div>
           </div>
         </div>
       )}
      {/* Reference Sheet */}
       <div 
         style={{ 
           left: refPosition.x, 
           top: refPosition.y,
           position: 'fixed',
           zIndex: 60,
           display: showReference ? 'flex' : 'none'
         }}
         className="bg-white rounded-lg shadow-2xl border border-gray-700 w-[90vw] sm:w-[600px] h-[500px] flex-col overflow-hidden"
       >
         {/* Header (Draggable) */}
         <div 
           className="bg-[#1a1a1a] px-3 py-2 flex justify-between items-center cursor-move select-none flex-shrink-0"
           onMouseDown={(e) => {
             setIsDraggingRef(true)
             dragStartRefPos.current = {
               x: e.clientX - refPosition.x,
               y: e.clientY - refPosition.y
             }
           }}
         >
           {/* Title */}
           <h3 className="font-bold text-white text-sm">
             Reference Sheet
           </h3>
 
           {/* Drag Handle (Dots) */}
           <div className="flex-1 flex justify-center opacity-50 hover:opacity-100 transition-opacity">
               <div className="grid grid-cols-3 gap-0.5">
                 <div className="w-1 h-1 bg-white rounded-full"></div>
                 <div className="w-1 h-1 bg-white rounded-full"></div>
                 <div className="w-1 h-1 bg-white rounded-full"></div>
                 <div className="w-1 h-1 bg-white rounded-full"></div>
                 <div className="w-1 h-1 bg-white rounded-full"></div>
                 <div className="w-1 h-1 bg-white rounded-full"></div>
               </div>
           </div>
 
           {/* Controls */}
           <div className="flex items-center gap-1">
               {/* Close */}
               <button 
                 onClick={() => setShowReference(false)}
                 className="text-gray-400 hover:text-white p-1"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
           </div>
         </div>
         
         {/* Reference Content */}
         <div className="flex-1 bg-white relative overflow-y-auto p-4 text-sm">
             {/* Overlay to prevent interaction while dragging */}
             {isDraggingRef && (
               <div className="absolute inset-0 z-10 bg-transparent"></div>
             )}
             
             <div className="grid grid-cols-2 gap-x-8 gap-y-6 max-w-lg mx-auto">
               {/* Row 1 */}
               <div className="flex flex-col items-center">
                 <svg width="80" height="80" viewBox="0 0 100 100">
                   <circle cx="50" cy="50" r="40" fill="none" stroke="black" strokeWidth="1.5" />
                   <line x1="50" y1="50" x2="90" y2="50" stroke="black" strokeWidth="1" />
                   <text x="70" y="45" fontSize="12" fontFamily="serif">r</text>
                 </svg>
                 <div className="text-center font-serif mt-1">
                   <div>A = πr²</div>
                   <div>C = 2πr</div>
                 </div>
               </div>

               <div className="flex flex-col items-center">
                 <svg width="100" height="60" viewBox="0 0 120 80">
                   <rect x="10" y="20" width="100" height="50" fill="none" stroke="black" strokeWidth="1.5" />
                   <text x="60" y="15" fontSize="12" fontFamily="serif">ℓ</text>
                   <text x="115" y="45" fontSize="12" fontFamily="serif">w</text>
                 </svg>
                 <div className="text-center font-serif mt-1">
                   <div>A = ℓw</div>
                 </div>
               </div>

               {/* Row 2 */}
               <div className="flex flex-col items-center">
                 <svg width="80" height="80" viewBox="0 0 100 100">
                   <path d="M10 90 L90 90 L50 10 Z" fill="none" stroke="black" strokeWidth="1.5" />
                   <line x1="50" y1="10" x2="50" y2="90" stroke="black" strokeWidth="1" strokeDasharray="4" />
                   <rect x="50" y="80" width="10" height="10" fill="none" stroke="black" strokeWidth="1" />
                   <text x="55" y="50" fontSize="12" fontFamily="serif">h</text>
                   <text x="50" y="98" fontSize="12" fontFamily="serif">b</text>
                 </svg>
                 <div className="text-center font-serif mt-1">
                   <div>A = ½bh</div>
                 </div>
               </div>

               <div className="flex flex-col items-center">
                 <svg width="80" height="80" viewBox="0 0 100 100">
                   <path d="M10 10 L10 90 L90 90 Z" fill="none" stroke="black" strokeWidth="1.5" />
                   <rect x="10" y="80" width="10" height="10" fill="none" stroke="black" strokeWidth="1" />
                   <text x="5" y="50" fontSize="12" fontFamily="serif">a</text>
                   <text x="50" y="98" fontSize="12" fontFamily="serif">b</text>
                   <text x="60" y="40" fontSize="12" fontFamily="serif">c</text>
                 </svg>
                 <div className="text-center font-serif mt-1">
                   <div>c² = a² + b²</div>
                 </div>
               </div>
               
               {/* Row 3 - Special Triangles */}
               <div className="col-span-2 flex justify-center gap-12 py-2">
                  <div className="flex flex-col items-center">
                    <svg width="100" height="70" viewBox="0 0 140 80">
                      <path d="M10 70 L130 70 L10 10 Z" fill="none" stroke="black" strokeWidth="1.5" />
                      <text x="30" y="65" fontSize="10" fontFamily="serif">60°</text>
                      <text x="15" y="25" fontSize="10" fontFamily="serif">30°</text>
                      <rect x="10" y="60" width="10" height="10" fill="none" stroke="black" strokeWidth="1" />
                      <text x="5" y="45" fontSize="12" fontFamily="serif">x</text>
                      <text x="70" y="80" fontSize="12" fontFamily="serif">x√3</text>
                      <text x="75" y="35" fontSize="12" fontFamily="serif">2x</text>
                    </svg>
                  </div>
                  <div className="flex flex-col items-center">
                    <svg width="80" height="80" viewBox="0 0 100 100">
                      <path d="M10 90 L90 90 L10 10 Z" fill="none" stroke="black" strokeWidth="1.5" />
                      <text x="65" y="85" fontSize="10" fontFamily="serif">45°</text>
                      <text x="15" y="25" fontSize="10" fontFamily="serif">45°</text>
                      <rect x="10" y="80" width="10" height="10" fill="none" stroke="black" strokeWidth="1" />
                      <text x="5" y="50" fontSize="12" fontFamily="serif">s</text>
                      <text x="50" y="98" fontSize="12" fontFamily="serif">s</text>
                      <text x="60" y="40" fontSize="12" fontFamily="serif">s√2</text>
                    </svg>
                  </div>
               </div>
               <div className="col-span-2 text-center font-serif font-bold mb-4">
                 Special Right Triangles
               </div>

               {/* Row 4 - Volumes */}
               <div className="flex flex-col items-center">
                 <svg width="90" height="70" viewBox="0 0 120 80">
                   <rect x="10" y="30" width="80" height="40" fill="none" stroke="black" strokeWidth="1.5" />
                   <polyline points="10,30 30,10 110,10 110,50 90,70" fill="none" stroke="black" strokeWidth="1.5" />
                   <line x1="30" y1="10" x2="30" y2="50" stroke="black" strokeWidth="1" strokeDasharray="3" />
                   <line x1="30" y1="50" x2="110" y2="50" stroke="black" strokeWidth="1" strokeDasharray="3" />
                   <line x1="30" y1="50" x2="10" y2="70" stroke="black" strokeWidth="1" strokeDasharray="3" /> {/* Adjusted hidden line */}
                   <text x="50" y="80" fontSize="12" fontFamily="serif">ℓ</text>
                   <text x="100" y="80" fontSize="12" fontFamily="serif">w</text>
                   <text x="115" y="30" fontSize="12" fontFamily="serif">h</text>
                 </svg>
                 <div className="text-center font-serif mt-1">
                   <div>V = ℓwh</div>
                 </div>
               </div>

               <div className="flex flex-col items-center">
                 <svg width="70" height="80" viewBox="0 0 100 100">
                   <ellipse cx="50" cy="20" rx="40" ry="10" fill="none" stroke="black" strokeWidth="1.5" />
                   <line x1="10" y1="20" x2="10" y2="80" stroke="black" strokeWidth="1.5" />
                   <line x1="90" y1="20" x2="90" y2="80" stroke="black" strokeWidth="1.5" />
                   <path d="M10 80 A40 10 0 0 0 90 80" fill="none" stroke="black" strokeWidth="1.5" />
                   <path d="M10 80 A40 10 0 0 1 90 80" fill="none" stroke="black" strokeWidth="1.5" strokeDasharray="4" />
                   <line x1="50" y1="20" x2="90" y2="20" stroke="black" strokeWidth="1" />
                   <text x="70" y="15" fontSize="12" fontFamily="serif">r</text>
                   <text x="95" y="50" fontSize="12" fontFamily="serif">h</text>
                 </svg>
                 <div className="text-center font-serif mt-1">
                   <div>V = πr²h</div>
                 </div>
               </div>

               {/* Row 5 */}
               <div className="flex flex-col items-center">
                 <svg width="80" height="80" viewBox="0 0 100 100">
                   <circle cx="50" cy="50" r="40" fill="none" stroke="black" strokeWidth="1.5" />
                   <ellipse cx="50" cy="50" rx="40" ry="10" fill="none" stroke="black" strokeWidth="1" strokeDasharray="4" />
                   <line x1="50" y1="50" x2="90" y2="50" stroke="black" strokeWidth="1" />
                   <text x="70" y="45" fontSize="12" fontFamily="serif">r</text>
                 </svg>
                 <div className="text-center font-serif mt-1">
                   <div>V = 4/3πr³</div>
                 </div>
               </div>

               <div className="flex flex-col items-center">
                 <svg width="70" height="80" viewBox="0 0 100 100">
                   <ellipse cx="50" cy="80" rx="40" ry="10" fill="none" stroke="black" strokeWidth="1.5" strokeDasharray="4,0" />
                   {/* Make bottom ellipse look correct: front arc solid, back dashed */}
                   <path d="M10 80 A40 10 0 0 0 90 80" fill="none" stroke="black" strokeWidth="1.5" />
                   <path d="M10 80 A40 10 0 0 1 90 80" fill="none" stroke="black" strokeWidth="1.5" strokeDasharray="4" />
                   
                   <line x1="50" y1="10" x2="10" y2="80" stroke="black" strokeWidth="1.5" />
                   <line x1="50" y1="10" x2="90" y2="80" stroke="black" strokeWidth="1.5" />
                   <line x1="50" y1="10" x2="50" y2="80" stroke="black" strokeWidth="1" strokeDasharray="4" />
                   <line x1="50" y1="80" x2="90" y2="80" stroke="black" strokeWidth="1" />
                   <text x="70" y="75" fontSize="12" fontFamily="serif">r</text>
                   <text x="52" y="50" fontSize="12" fontFamily="serif">h</text>
                 </svg>
                 <div className="text-center font-serif mt-1">
                   <div>V = 1/3πr²h</div>
                 </div>
               </div>
               
               {/* Row 6 - Pyramid */}
               <div className="col-span-2 flex flex-col items-center">
                 <svg width="100" height="80" viewBox="0 0 120 100">
                   {/* Base */}
                   <path d="M20 70 L50 90 L100 90 L70 70 Z" fill="none" stroke="black" strokeWidth="1.5" strokeDasharray="4" />
                   <path d="M20 70 L50 90 L100 90" fill="none" stroke="black" strokeWidth="1.5" />
                   {/* Apex to base corners */}
                   <line x1="60" y1="10" x2="20" y2="70" stroke="black" strokeWidth="1.5" />
                   <line x1="60" y1="10" x2="50" y2="90" stroke="black" strokeWidth="1.5" />
                   <line x1="60" y1="10" x2="100" y2="90" stroke="black" strokeWidth="1.5" />
                   <line x1="60" y1="10" x2="70" y2="70" stroke="black" strokeWidth="1.5" strokeDasharray="4" />
                   {/* Height */}
                   <line x1="60" y1="10" x2="60" y2="80" stroke="black" strokeWidth="1" strokeDasharray="4" />
                   <text x="65" y="50" fontSize="12" fontFamily="serif">h</text>
                   <text x="80" y="95" fontSize="12" fontFamily="serif">w</text>
                   <text x="30" y="90" fontSize="12" fontFamily="serif">ℓ</text>
                 </svg>
                 <div className="text-center font-serif mt-1">
                   <div>V = 1/3ℓwh</div>
                 </div>
               </div>
             </div>

             <div className="mt-8 space-y-2 font-serif text-sm">
               <p>The number of degrees of arc in a circle is 360.</p>
               <p>The number of radians of arc in a circle is 2π.</p>
               <p>The sum of the measures in degrees of the angles of a triangle is 180.</p>
             </div>
         </div>
       </div>
       
       {/* Desmos Calculator */}
      <div 
        style={{ 
          left: calcPosition.x, 
          top: calcPosition.y,
          position: 'fixed',
          zIndex: 60,
          display: showCalculator ? 'flex' : 'none'
        }}
        className="bg-white rounded-lg shadow-2xl border border-gray-700 w-[90vw] sm:w-[600px] h-[450px] flex-col overflow-hidden"
      >
        {/* Header (Draggable) */}
        <div 
          className="bg-[#1a1a1a] px-3 py-2 flex justify-between items-center cursor-move select-none flex-shrink-0"
          onMouseDown={(e) => {
            setIsDraggingCalc(true)
            dragStartPos.current = {
              x: e.clientX - calcPosition.x,
              y: e.clientY - calcPosition.y
            }
          }}
        >
          {/* Title */}
          <h3 className="font-bold text-white text-sm">
            Calculator
          </h3>

          {/* Drag Handle (Dots) */}
          <div className="flex-1 flex justify-center opacity-50 hover:opacity-100 transition-opacity">
              <div className="grid grid-cols-3 gap-0.5">
                <div className="w-1 h-1 bg-white rounded-full"></div>
                <div className="w-1 h-1 bg-white rounded-full"></div>
                <div className="w-1 h-1 bg-white rounded-full"></div>
                <div className="w-1 h-1 bg-white rounded-full"></div>
                <div className="w-1 h-1 bg-white rounded-full"></div>
                <div className="w-1 h-1 bg-white rounded-full"></div>
              </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
              {/* Maximize (Visual only for now) */}
              <button className="text-gray-400 hover:text-white p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
              {/* Close */}
              <button 
                onClick={() => setShowCalculator(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
          </div>
        </div>
        
        {/* API Content */}
        <div className="flex-1 bg-white relative">
            <div ref={calculatorRef} className="w-full h-full"></div>
            {/* Overlay to prevent interaction while dragging */}
            {isDraggingCalc && (
              <div className="absolute inset-0 z-10 bg-transparent"></div>
            )}
        </div>
      </div>

      {/* Auto-Submit Modal */}
      {showAutoSubmitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-300">
            <div className="text-center">
              <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiAlertTriangle className="w-12 h-12 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Test Auto-Submitted</h2>
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                <p className="text-gray-800 font-medium">{autoSubmitReason}</p>
              </div>
              <p className="text-gray-600 mb-6">
                Your test has been automatically submitted and your progress has been saved.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                <span>Redirecting...</span>
              </div>
            </div>
          </div>
        </div>
      )}
     </div>
    )
}
