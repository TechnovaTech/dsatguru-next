'use client'
import { renderContent as renderWithImages } from '../../../../components/admin/LatexRenderer'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { FiClock, FiCheckCircle, FiArrowRight, FiAlertTriangle, FiMoreVertical, FiHelpCircle, FiSlash, FiGrid, FiEdit2, FiLayers } from 'react-icons/fi'

export default function ModuleTestPage() {
  const router = useRouter()
  const params = useParams()
  const testId = params.id

  const [test, setTest] = useState(null)
  const [modules, setModules] = useState([]) // [{moduleNumber, subject, questions:[ids], duration, isTimed}]
  const [moduleQsMap, setModuleQsMap] = useState({}) // {idx: [questionObjects]}
  const [currentModuleIdx, setCurrentModuleIdx] = useState(0)
  const [currentQIdx, setCurrentQIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [markedQs, setMarkedQs] = useState(new Set())
  const [eliminated, setEliminated] = useState({})
  const [questionTimes, setQuestionTimes] = useState({})
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [showModuleSummary, setShowModuleSummary] = useState(false)
  const [testCompleted, setTestCompleted] = useState(false)
  const [finalScore, setFinalScore] = useState(null)
  const [completedSessionId, setCompletedSessionId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alreadyTaken, setAlreadyTaken] = useState(false)
  const [autoSubmitReason, setAutoSubmitReason] = useState('')
  const [showStartScreen, setShowStartScreen] = useState(true)
  const [showModuleIntro, setShowModuleIntro] = useState(false)
  const [showBreakScreen, setShowBreakScreen] = useState(false)
  const [breakCountdown, setBreakCountdown] = useState(0)
  const startTime = useRef(new Date())

  // Tools
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fontSize, setFontSize] = useState(1)
  const fontClasses = ['text-sm', 'text-base', 'text-lg', 'text-xl']
  const [lineReaderActive, setLineReaderActive] = useState(false)
  const [lineReaderPos, setLineReaderPos] = useState(50)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)
  const [showFlagModal, setShowFlagModal] = useState(false)
  const [flagNote, setFlagNote] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)
  const [calcPosition, setCalcPosition] = useState({ x: 50, y: 100 })
  const [isDraggingCalc, setIsDraggingCalc] = useState(false)
  const [desmosLoaded, setDesmosLoaded] = useState(false)
  const [calcInstance, setCalcInstance] = useState(null)
  const [showReference, setShowReference] = useState(false)
  const [refPosition, setRefPosition] = useState({ x: 100, y: 100 })
  const [isDraggingRef, setIsDraggingRef] = useState(false)
  const [showQuestionNav, setShowQuestionNav] = useState(false)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const dragStartRefPos = useRef({ x: 0, y: 0 })
  const calcRef = useRef(null)
  const containerRef = useRef(null)

  // Load Desmos
  useEffect(() => {
    if (!document.getElementById('desmos-script')) {
      const s = document.createElement('script')
      s.id = 'desmos-script'
      s.src = 'https://www.desmos.com/api/v1.10/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6'
      s.async = true
      s.onload = () => setDesmosLoaded(true)
      document.body.appendChild(s)
    } else setDesmosLoaded(true)
  }, [])

  useEffect(() => {
    if (desmosLoaded && showCalculator && calcRef.current && !calcInstance && window.Desmos) {
      setCalcInstance(window.Desmos.GraphingCalculator(calcRef.current, { keypad: true, graphpaper: true, expressions: true, settingsMenu: true, zoomButtons: true }))
    }
  }, [desmosLoaded, showCalculator])

  // Drag handlers
  useEffect(() => {
    const onMove = (e) => {
      if (isDraggingCalc) setCalcPosition({ x: e.clientX - dragStartPos.current.x, y: e.clientY - dragStartPos.current.y })
      if (isDraggingRef) setRefPosition({ x: e.clientX - dragStartRefPos.current.x, y: e.clientY - dragStartRefPos.current.y })
    }
    const onUp = () => { setIsDraggingCalc(false); setIsDraggingRef(false) }
    if (isDraggingCalc || isDraggingRef) { window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp) }
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [isDraggingCalc, isDraggingRef])

  // Line reader
  useEffect(() => {
    if (!lineReaderActive) return
    const onMove = (e) => setLineReaderPos(Math.min(95, Math.max(5, (e.clientY / window.innerHeight) * 100)))
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [lineReaderActive])

  // Question time tracking
  useEffect(() => {
    if (loading || showModuleSummary || testCompleted) return
    const qs = moduleQsMap[currentModuleIdx] || []
    const q = qs[currentQIdx]
    if (!q) return
    const timer = setInterval(() => setQuestionTimes(prev => ({ ...prev, [q._id]: (prev[q._id] || 0) + 1 })), 1000)
    return () => clearInterval(timer)
  }, [currentQIdx, currentModuleIdx, loading, showModuleSummary, testCompleted])

  // Reset showAnswer on question change
  useEffect(() => { setShowAnswer(false) }, [currentQIdx, currentModuleIdx])

  // Timer countdown per module
  useEffect(() => {
    const mod = modules[currentModuleIdx]
    if (!mod || !mod.isTimed || !mod.duration || loading || showModuleSummary || testCompleted) return
    if (timeRemaining <= 0) return
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) { handleFinishModule(true); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [timeRemaining, currentModuleIdx, loading, showModuleSummary, testCompleted])

  // Break countdown timer
  useEffect(() => {
    if (!showBreakScreen || breakCountdown <= 0) return
    const timer = setTimeout(() => {
      if (breakCountdown <= 1) {
        setBreakCountdown(0)
        setShowBreakScreen(false)
        setShowModuleIntro(true)
      } else {
        setBreakCountdown(p => p - 1)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [showBreakScreen, breakCountdown])

  // Auto-enter fullscreen only after start screen dismissed
  useEffect(() => {
    if (!loading && !testCompleted && !showModuleSummary && !showStartScreen && modules.length > 0 && !isFullscreen) {
      enterFullscreen()
    }
  }, [loading, modules.length, showStartScreen])

  // Fullscreen & tab detection
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && isFullscreen && !testCompleted && !showModuleSummary && !showStartScreen && !showModuleIntro && !showBreakScreen)
        autoSubmit('You switched tabs during the test.')
    }
    const onFSChange = () => {
      if (!document.fullscreenElement && isFullscreen && !testCompleted && !showModuleSummary && !showStartScreen && !showModuleIntro && !showBreakScreen)
        autoSubmit('You exited fullscreen mode.')
    }
    const onKey = (e) => {
      if (!isFullscreen || testCompleted || showModuleSummary || showStartScreen || showModuleIntro) return
      if (e.key === 'Escape' || e.key === 'F11') { e.preventDefault(); autoSubmit(`You pressed ${e.key} to exit fullscreen.`) }
      if (e.key === 'PrintScreen') { e.preventDefault(); autoSubmit('Screenshot attempt detected.') }
    }
    const onBlur = () => {
      if (isFullscreen && !testCompleted && !showModuleSummary && !showStartScreen && !showModuleIntro)
        setTimeout(() => { if (!document.hasFocus() && isFullscreen && !testCompleted) autoSubmit('You switched away from the test.') }, 500)
    }
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('fullscreenchange', onFSChange)
    window.addEventListener('keydown', onKey)
    window.addEventListener('blur', onBlur)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('fullscreenchange', onFSChange)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', onBlur)
    }
  }, [isFullscreen, testCompleted, showModuleSummary])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (loading || testCompleted || showModuleSummary || showShortcutsModal || showFlagModal) return
      const qs = moduleQsMap[currentModuleIdx] || []
      const q = qs[currentQIdx]
      const key = e.key.toUpperCase()
      if (e.ctrlKey && e.key === '/') { e.preventDefault(); setShowShortcutsModal(p => !p); return }
      if ((e.altKey && e.key === 'ArrowRight') || key === 'N') { e.preventDefault(); if (currentQIdx < qs.length - 1) setCurrentQIdx(p => p + 1) }
      if ((e.altKey && e.key === 'ArrowLeft') || key === 'P') { e.preventDefault(); if (currentQIdx > 0) setCurrentQIdx(p => p - 1) }
      if (['A','B','C','D'].includes(key) && q && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault()
        if (isEliminated(q._id, key)) toggleEliminate(q._id, key)
        setAnswers(prev => ({ ...prev, [q._id]: key }))
      }
      if (key === 'M' && q) { e.preventDefault(); toggleMark(q._id) }
      if (key === 'H') { e.preventDefault(); setLineReaderActive(p => !p) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentQIdx, currentModuleIdx, moduleQsMap, loading, testCompleted, showModuleSummary, showShortcutsModal, showFlagModal])

  const enterFullscreen = async () => {
    try { if (containerRef.current) { await containerRef.current.requestFullscreen(); setIsFullscreen(true) } } catch {}
  }

  const autoSubmit = async (reason) => {
    setAutoSubmitReason(reason)
    await handleSubmitTest(true)
  }

  const fetchTestData = async () => {
    try {
      const token = localStorage.getItem('token')
      const [testRes, historyRes] = await Promise.all([
        fetch(`/api/admin/tests/${testId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/test-sessions', { headers: { Authorization: `Bearer ${token}` } })
      ])
      if (!testRes.ok) { setLoading(false); return }
      const testData = await testRes.json()

      // Already taken check
      if (historyRes.ok) {
        const hData = await historyRes.json()
        const sessions = hData.sessions || hData || []
        const alreadyCompleted = sessions.some(s => String(s.testId?._id || s.testId) === String(testId) && s.status === 'Completed' && s.totalScore !== undefined)
        if (alreadyCompleted) { setAlreadyTaken(true); setLoading(false); return }
      }

      const mods = testData.modules && testData.modules.length > 0 ? testData.modules : [{ moduleNumber: 1, subject: testData.subject || 'Math', questions: testData.questions?.map(q => q._id || q) || [], duration: testData.duration, isTimed: testData.isTimed, numberOfQuestions: testData.questions?.length || 0 }]
      setTest(testData)
      setModules(mods)

      // Fetch questions for all modules
      const allIds = mods.flatMap(m => m.questions || [])
      if (allIds.length > 0) {
        const qRes = await fetch(`/api/questions?ids=${allIds.join(',')}`, { headers: { Authorization: `Bearer ${token}` } })
        if (qRes.ok) {
          const allQs = await qRes.json()
          const qById = {}
          allQs.forEach(q => { qById[(q._id || q.id).toString()] = q })

          // Apply customQuestions overrides if any
          const custom = testData.customQuestions || {}

          const map = {}
          mods.forEach((m, idx) => {
            map[idx] = (m.questions || []).map(qId => {
              const q = qById[qId.toString()] || null
              if (!q) return null
              const qKey = (q._id || q.id).toString()
              return custom[qKey] ? { ...q, ...custom[qKey] } : q
            }).filter(Boolean)
          })
          setModuleQsMap(map)

          // Set timer for first module
          const firstMod = mods[0]
          if (firstMod.isTimed && firstMod.duration) setTimeRemaining(firstMod.duration * 60)
        }
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  useEffect(() => { fetchTestData() }, [testId])

  const isEliminated = (qId, opt) => (eliminated[qId] || []).includes(opt)
  const toggleEliminate = (qId, opt) => setEliminated(prev => {
    const cur = prev[qId] || []
    return { ...prev, [qId]: cur.includes(opt) ? cur.filter(o => o !== opt) : [...cur, opt] }
  })
  const toggleMark = (qId) => setMarkedQs(prev => { const n = new Set(prev); n.has(qId) ? n.delete(qId) : n.add(qId); return n })

  const handleFinishModule = (autoTimed = false) => {
    const isLast = currentModuleIdx === modules.length - 1
    if (isLast) { handleSubmitTest(false) } else { setShowModuleSummary(true) }
  }

  const handleNextModule = () => {
    const nextIdx = currentModuleIdx + 1
    const breakMins = parseInt(modules[currentModuleIdx]?.breakAfter) || 0
    setCurrentModuleIdx(nextIdx)
    setCurrentQIdx(0)
    setShowModuleSummary(false)
    const nextMod = modules[nextIdx]
    if (nextMod?.isTimed && nextMod?.duration) setTimeRemaining(nextMod.duration * 60)
    else setTimeRemaining(0)
    if (breakMins > 0) {
      setBreakCountdown(breakMins * 60)
      setShowBreakScreen(true)
    } else {
      setShowModuleIntro(true)
    }
  }

  const handleSubmitTest = async (isAuto = false) => {
    if (saving) return
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      // Build responses from all modules
      const allResponses = []
      let totalCorrect = 0
      const moduleScores = {}

      modules.forEach((m, idx) => {
        const qs = moduleQsMap[idx] || []
        let modCorrect = 0
        qs.forEach(q => {
          const qId = (q._id || q.id).toString()
          const ans = answers[qId]
          const correct = q.correctAnswer && ans && q.correctAnswer.toString().trim().toUpperCase() === ans.toUpperCase()
          if (correct) { modCorrect++; totalCorrect++ }
          allResponses.push({ questionId: qId, answer: ans || '', isCorrect: correct, timeSpent: questionTimes[qId] || 0, subject: m.subject })
        })
        moduleScores[idx] = { subject: m.subject, correct: modCorrect, total: qs.length, score: qs.length > 0 ? Math.round((modCorrect / qs.length) * 100) : 0 }
      })

      const totalQs = allResponses.length
      const sessionData = {
        testId,
        status: 'Completed',
        totalScore: totalCorrect,
        totalQuestions: totalQs,
        responses: allResponses,
        moduleScores,
        completedAt: new Date().toISOString(),
        startTime: startTime.current.toISOString(),
        endTime: new Date().toISOString()
      }

      const res = await fetch('/api/test-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(sessionData)
      })

      if (res.ok) {
        const data = await res.json()
        setFinalScore(totalCorrect)
        setCompletedSessionId(data.session?._id)
        setTestCompleted(true)
      }
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  const formatTime = (secs) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`

  const currentMod = modules[currentModuleIdx]
  const currentQs = moduleQsMap[currentModuleIdx] || []
  const currentQ = currentQs[currentQIdx]

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>

  // Start onboarding screen
  if (!alreadyTaken && !testCompleted && showStartScreen && modules.length > 0) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <div className="text-center mb-6">
          <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertTriangle className="text-blue-600" size={40} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{test?.title}</h2>
          <p className="text-gray-500">{modules.length} Module{modules.length > 1 ? 's' : ''} • {modules.map((m, i) => {
            const part = `${m.subject === 'Reading and Writing' ? 'R&W' : m.subject} (${m.numberOfQuestions || m.questions?.length || 0}q)`
            const brk = i < modules.length - 1 && parseInt(m.breakAfter) > 0 ? ` → [${m.breakAfter}min break]` : ''
            return part + brk
          }).join(' → ')}</p>
        </div>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✓ Test will run in fullscreen mode</li>
            <li>✓ Each module has its own timer</li>
            {modules.some(m => parseInt(m.breakAfter) > 0) && <li>✓ Scheduled breaks between modules — module starts automatically after break</li>}
            <li>⚠️ Switching tabs will auto-submit the test</li>
            <li>⚠️ Exiting fullscreen will auto-submit the test</li>
            <li>⚠️ Minimizing window will auto-submit the test</li>
            <li>⚠️ Taking screenshots will auto-submit the test</li>
            <li>⚠️ Pressing ESC or F11 will auto-submit the test</li>
          </ul>
          <div className="mt-3 pt-3 border-t border-yellow-300">
            <p className="text-sm font-bold text-red-700">🚨 Any violation will auto-submit immediately. No warnings, no second chances!</p>
          </div>
        </div>
        <div className="space-y-3">
          <button onClick={() => { setShowStartScreen(false); setShowModuleIntro(true) }}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors">
            Start Test in Fullscreen
          </button>
          <button onClick={() => router.push('/dashboard/tests')}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )

  // Break screen between modules
  if (showBreakScreen) {
    const nextMod = modules[currentModuleIdx]
    const mins = Math.floor(breakCountdown / 60)
    const secs = breakCountdown % 60
    const pct = breakCountdown / (parseInt(modules[currentModuleIdx - 1]?.breakAfter) * 60 || 1) * 100
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <FiClock className="text-green-600" size={36} />
          </div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Break Time</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Rest Before Module {currentModuleIdx + 1}</h2>
          <p className="text-gray-500 text-sm mb-6">
            Next: {nextMod?.subject === 'Reading and Writing' ? 'Reading & Writing' : nextMod?.subject} — {nextMod?.numberOfQuestions || nextMod?.questions?.length || 0} Questions
          </p>
          <div className="text-6xl font-mono font-bold text-green-600 mb-2">
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>
          <p className="text-sm text-gray-400 mb-6">Module starts automatically when timer ends</p>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-6">
            <div className="bg-green-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${Math.max(0, Math.min(100, (1 - breakCountdown / (parseInt(modules[currentModuleIdx - 1]?.breakAfter) * 60 || breakCountdown)) * 100))}%` }} />
          </div>
          <button
            onClick={() => { setShowBreakScreen(false); setShowModuleIntro(true) }}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
          >
            Start Module {currentModuleIdx + 1} Early
          </button>
        </div>
      </div>
    )
  }

  // Module intro screen
  if (showModuleIntro) {
    const introMod = modules[currentModuleIdx]
    const totalQ = introMod?.numberOfQuestions || moduleQsMap[currentModuleIdx]?.length || introMod?.questions?.length || 0
    const isMath = introMod?.subject === 'Math'
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-xl w-full text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isMath ? 'bg-blue-100' : 'bg-purple-100'}`}>
            <span className="text-3xl">{isMath ? '📐' : '📖'}</span>
          </div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Module {currentModuleIdx + 1} of {modules.length}</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{introMod?.subject === 'Reading and Writing' ? 'Reading & Writing' : introMod?.subject}</h2>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-600 mb-6">
            <span>{totalQ} Questions</span>
            <span>•</span>
            <span>{introMod?.isTimed ? `${introMod.duration} minutes` : 'Untimed'}</span>
          </div>
          {currentModuleIdx === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm font-semibold text-blue-800 mb-2">Instructions</p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Read each question carefully before selecting your answer</li>
                <li>• Use elimination (⊘) to cross out wrong options</li>
                <li>• Flag questions to review before finishing</li>
                {isMath && <li>• Calculator and reference sheet are available in the toolbar</li>}
              </ul>
            </div>
          )}
          <button onClick={() => setShowModuleIntro(false)}
            className={`w-full py-4 rounded-xl font-semibold text-lg text-white transition-colors ${isMath ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
            Begin Module {currentModuleIdx + 1}
          </button>
        </div>
      </div>
    )
  }

  if (alreadyTaken) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
        <FiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Already Completed</h2>
        <p className="text-gray-600 mb-6">You have already completed this test.</p>
        <button onClick={() => router.push('/dashboard/tests/history')} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">View Results</button>
      </div>
    </div>
  )

  if (testCompleted) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <FiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Test Submitted!</h2>
        {autoSubmitReason && <p className="text-sm text-red-600 mb-3 bg-red-50 p-2 rounded-lg">{autoSubmitReason}</p>}
        <p className="text-gray-600 mb-2">Score: <span className="text-2xl font-bold text-blue-600">{finalScore}</span> / {Object.values(moduleQsMap).flat().length}</p>
        <div className="space-y-2 my-4">
          {modules.map((m, i) => {
            const ms = Object.values(moduleQsMap).flat().length > 0 ? null : null
            const qs = moduleQsMap[i] || []
            const correct = qs.filter(q => { const qId = (q._id||q.id).toString(); return answers[qId] && q.correctAnswer?.toUpperCase() === answers[qId].toUpperCase() }).length
            return (
              <div key={i} className="flex justify-between items-center px-4 py-2 bg-gray-50 rounded-lg text-sm">
                <span className="text-gray-700">Module {i+1} — {m.subject}</span>
                <span className="font-semibold text-gray-900">{correct}/{qs.length}</span>
              </div>
            )
          })}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => router.push('/dashboard/tests')} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">Back to Tests</button>
          {completedSessionId && (
            <button onClick={() => router.push(`/dashboard/tests/${testId}/results?session_id=${completedSessionId}`)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">View Analysis</button>
          )}
        </div>
      </div>
    </div>
  )

  // Module Summary Screen
  if (showModuleSummary) {
    const answered = currentQs.filter(q => answers[(q._id||q.id).toString()]).length
    const marked = currentQs.filter(q => markedQs.has((q._id||q.id).toString())).length
    const isLast = currentModuleIdx === modules.length - 1
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Module {currentModuleIdx + 1} Complete</h2>
            <p className="text-gray-600 mt-1">{currentMod?.subject} — {currentQs.length} questions</p>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-green-600">{answered}</p><p className="text-xs text-gray-600 mt-1">Answered</p></div>
            <div className="bg-gray-50 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-gray-600">{currentQs.length - answered}</p><p className="text-xs text-gray-600 mt-1">Unanswered</p></div>
            <div className="bg-amber-50 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-amber-600">{marked}</p><p className="text-xs text-gray-600 mt-1">Marked</p></div>
          </div>
          {/* Question Grid */}
          <div className="grid grid-cols-10 gap-1.5 mb-6">
            {currentQs.map((q, i) => {
              const qId = (q._id||q.id).toString()
              const isAns = !!answers[qId]
              const isMark = markedQs.has(qId)
              return (
                <button key={i} onClick={() => { setCurrentQIdx(i); setShowModuleSummary(false) }} className={`w-8 h-8 rounded text-xs font-medium transition-colors ${isMark ? 'bg-amber-400 text-white' : isAns ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  {i + 1}
                </button>
              )
            })}
          </div>
          <div className="flex gap-4 justify-center">
            <button onClick={() => setShowModuleSummary(false)} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">Review Answers</button>
            {isLast ? (
              <button onClick={() => handleSubmitTest(false)} disabled={saving} className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2 disabled:opacity-50">
                <FiCheckCircle /> {saving ? 'Submitting...' : 'Submit Test'}
              </button>
            ) : (
              <button onClick={handleNextModule} className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
                Module {currentModuleIdx + 2} <FiArrowRight />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Main Test Screen
  const getOptions = (q) => {
    if (!q) return null
    try {
      const raw = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
      if (Array.isArray(raw)) return { A: raw[0]||'', B: raw[1]||'', C: raw[2]||'', D: raw[3]||'' }
      if (raw && typeof raw === 'object') return raw
    } catch {}
    if (q.optionA) return { A: q.optionA||'', B: q.optionB||'', C: q.optionC||'', D: q.optionD||'' }
    return null
  }

  const options = getOptions(currentQ)
  const currentQId = currentQ ? (currentQ._id||currentQ.id).toString() : null
  const isMathModule = currentMod?.subject === 'Math'

  return (
    <div ref={containerRef} className="min-h-screen bg-white flex flex-col select-none">
      {/* Line Reader */}
      {lineReaderActive && (
        <div className="fixed inset-0 pointer-events-none z-40">
          <div className="absolute inset-0 bg-black opacity-30" style={{ clipPath: `polygon(0 0, 100% 0, 100% ${lineReaderPos - 2}%, 0 ${lineReaderPos - 2}%)` }} />
          <div className="absolute left-0 right-0 h-10 border-2 border-yellow-400 bg-yellow-50 opacity-70" style={{ top: `${lineReaderPos - 2}%` }} />
          <div className="absolute inset-0 bg-black opacity-30" style={{ clipPath: `polygon(0 ${lineReaderPos + 2}%, 100% ${lineReaderPos + 2}%, 100% 100%, 0 100%)` }} />
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between flex-shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {modules.map((m, i) => (
              <div key={i} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${i === currentModuleIdx ? 'bg-blue-100 text-blue-700' : i < currentModuleIdx ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {i < currentModuleIdx && <FiCheckCircle className="w-3 h-3" />}
                M{i+1}: {m.subject === 'Reading and Writing' ? 'R&W' : m.subject}
              </div>
            ))}
          </div>
          <span className="text-sm text-gray-500">Q{currentQIdx + 1}/{currentQs.length}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Timer */}
          {currentMod?.isTimed && timeRemaining > 0 && (
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-mono font-semibold ${timeRemaining < 120 ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
              <FiClock className="w-3.5 h-3.5" />{formatTime(timeRemaining)}
            </div>
          )}
          {currentMod?.isTimed === false && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Untimed</span>}

          {/* Font Size */}
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button onClick={() => setFontSize(f => Math.max(0, f-1))} disabled={fontSize === 0} className="px-2 py-1.5 text-sm font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30">A<sup>-</sup></button>
            <span className="text-gray-300 text-xs">|</span>
            <button onClick={() => setFontSize(f => Math.min(3, f+1))} disabled={fontSize === 3} className="px-2 py-1.5 text-sm font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30">A<sup>+</sup></button>
          </div>

          {/* Flag */}
          <button onClick={() => { setFlagNote(''); setShowFlagModal(true) }} className={`p-2 rounded-lg border transition-colors ${currentQId && markedQs.has(currentQId) ? 'bg-amber-100 border-amber-300 text-amber-700' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`} title="Mark for review (M)">
            <FiEdit2 className="w-4 h-4" />
          </button>

          {/* Question Grid */}
          <button onClick={() => setShowQuestionNav(p => !p)} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100" title="Question Grid">
            <FiGrid className="w-4 h-4" />
          </button>

          {/* Calculator (Math only) */}
          {isMathModule && (
            <button onClick={() => setShowCalculator(p => !p)} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${showCalculator ? 'bg-blue-100 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
              Calc
            </button>
          )}

          {/* Reference (Math only) */}
          {isMathModule && (
            <button onClick={() => setShowReference(p => !p)} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${showReference ? 'bg-purple-100 border-purple-300 text-purple-700' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
              Ref
            </button>
          )}

          {/* Show Answer (tutor mode) */}
          <button onClick={() => setShowAnswer(p => !p)} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${showAnswer ? 'bg-green-100 border-green-300 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
            {showAnswer ? 'Hide Ans' : 'Show Ans'}
          </button>

          {/* More Menu */}
          <div className="relative">
            <button onClick={() => setShowMoreMenu(p => !p)} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100"><FiMoreVertical className="w-4 h-4" /></button>
            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-48 z-50">
                <button onClick={() => { setLineReaderActive(p => !p); setShowMoreMenu(false) }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${lineReaderActive ? 'text-blue-600' : 'text-gray-700'}`}><FiLayers className="w-4 h-4" /> Line Reader {lineReaderActive ? '(On)' : ''}</button>
                <button onClick={() => { setShowShortcutsModal(true); setShowMoreMenu(false) }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><FiHelpCircle className="w-4 h-4" /> Keyboard Shortcuts</button>
              </div>
            )}
          </div>

          {/* Finish Module / Submit */}
          <button onClick={() => handleFinishModule(false)} className={`px-4 py-1.5 text-sm font-medium rounded-lg text-white ${currentModuleIdx === modules.length - 1 ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {currentModuleIdx === modules.length - 1 ? 'Submit' : `Finish M${currentModuleIdx + 1}`}
          </button>
        </div>
      </div>

      {/* Question Navigation Panel */}
      {showQuestionNav && (
        <div className="fixed top-16 right-4 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-40 max-w-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">Module {currentModuleIdx + 1} Questions</h3>
            <button onClick={() => setShowQuestionNav(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>
          <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
            {currentQs.map((q, i) => {
              const qId = (q._id||q.id).toString()
              const isAns = !!answers[qId]; const isMark = markedQs.has(qId)
              return (
                <button key={i} onClick={() => { setCurrentQIdx(i); setShowQuestionNav(false) }} className={`w-8 h-8 rounded text-xs font-medium ${i === currentQIdx ? 'ring-2 ring-blue-500' : ''} ${isMark ? 'bg-amber-400 text-white' : isAns ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {i+1}
                </button>
              )
            })}
          </div>
          <div className="flex gap-3 mt-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded"></span>Answered</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-400 rounded"></span>Marked</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-200 rounded border"></span>Empty</span>
          </div>
        </div>
      )}

      {/* Draggable Calculator */}
      {showCalculator && (
        <div className="fixed z-50 shadow-2xl rounded-xl overflow-hidden" style={{ left: calcPosition.x, top: calcPosition.y, width: 480, height: 380 }}>
          <div className="bg-gray-800 text-white px-3 py-2 flex items-center justify-between cursor-move text-sm font-medium"
            onMouseDown={e => { setIsDraggingCalc(true); dragStartPos.current = { x: e.clientX - calcPosition.x, y: e.clientY - calcPosition.y } }}>
            Desmos Calculator
            <button onClick={() => setShowCalculator(false)} className="text-gray-300 hover:text-white text-lg leading-none">×</button>
          </div>
          <div ref={calcRef} style={{ width: '100%', height: 340 }} />
        </div>
      )}

      {/* Draggable Reference Sheet */}
      {showReference && (
        <div className="fixed z-50 shadow-2xl rounded-xl overflow-hidden bg-white border border-gray-200" style={{ left: refPosition.x, top: refPosition.y, width: 360 }}>
          <div className="bg-gray-800 text-white px-3 py-2 flex items-center justify-between cursor-move text-sm font-medium"
            onMouseDown={e => { setIsDraggingRef(true); dragStartRefPos.current = { x: e.clientX - refPosition.x, y: e.clientY - refPosition.y } }}>
            Math Reference Sheet
            <button onClick={() => setShowReference(false)} className="text-gray-300 hover:text-white text-lg leading-none">×</button>
          </div>
          <div className="p-4 text-xs text-gray-700 overflow-y-auto max-h-80 space-y-2">
            <p className="font-semibold">Area Formulas</p>
            <p>Circle: A = πr² | Circumference: C = 2πr</p>
            <p>Rectangle: A = lw | Triangle: A = ½bh</p>
            <p>Trapezoid: A = ½(b₁+b₂)h</p>
            <p className="font-semibold mt-2">Volume</p>
            <p>Rectangular Prism: V = lwh | Cylinder: V = πr²h</p>
            <p>Cone: V = ⅓πr²h | Sphere: V = 4/3πr³</p>
            <p className="font-semibold mt-2">Special Triangles</p>
            <p>30-60-90: sides 1 : √3 : 2</p>
            <p>45-45-90: sides 1 : 1 : √2</p>
            <p>Pythagorean: a² + b² = c²</p>
          </div>
        </div>
      )}

      {/* Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 mb-4">Keyboard Shortcuts</h3>
            <div className="space-y-2 text-sm">
              {[['A / B / C / D', 'Select answer'],['N or Alt+→', 'Next question'],['P or Alt+←', 'Previous question'],['M', 'Mark for review'],['H', 'Toggle line reader'],['Ctrl+/', 'Toggle this dialog']].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between"><kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">{k}</kbd><span className="text-gray-600">{v}</span></div>
              ))}
            </div>
            <button onClick={() => setShowShortcutsModal(false)} className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Close</button>
          </div>
        </div>
      )}

      {/* Flag Modal */}
      {showFlagModal && currentQId && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 mb-3">{markedQs.has(currentQId) ? 'Remove Mark' : 'Mark for Review'}</h3>
            {!markedQs.has(currentQId) && <textarea className="w-full p-2 border rounded-lg text-sm mb-3" rows={3} placeholder="Optional note..." value={flagNote} onChange={e => setFlagNote(e.target.value)} />}
            <div className="flex gap-3">
              <button onClick={() => setShowFlagModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => { toggleMark(currentQId); setShowFlagModal(false) }} className={`flex-1 px-4 py-2 rounded-lg text-sm text-white font-medium ${markedQs.has(currentQId) ? 'bg-gray-600 hover:bg-gray-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
                {markedQs.has(currentQId) ? 'Remove Mark' : 'Mark Question'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Question Area */}
      <div className="flex-1 overflow-y-auto">
        {!currentQ ? (
          <div className="flex items-center justify-center h-full text-gray-500">No questions in this module.</div>
        ) : (
          <div className="max-w-4xl mx-auto p-6">
            {/* Module badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${isMathModule ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                Module {currentModuleIdx + 1} — {currentMod?.subject}
              </span>
              <span className="text-sm text-gray-500">Question {currentQIdx + 1} of {currentQs.length}</span>
            </div>

            {/* Context Paragraph */}
            {currentQ.questionParagraph && (
              <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-xs font-semibold text-blue-700 uppercase mb-2">Reading Passage</p>
                <div className={`text-gray-800 leading-relaxed ${fontClasses[fontSize]}`}>{renderWithImages(currentQ.questionParagraph)}</div>
              </div>
            )}

            {/* Question */}
            <div className="mb-6">
              <p className={`text-gray-900 leading-relaxed font-medium ${fontClasses[fontSize]}`}>{renderWithImages(currentQ.content || currentQ.question)}</p>
            </div>

            {/* Show Answer (tutor mode) */}
            {showAnswer && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-semibold text-green-800">Correct Answer: {currentQ.correctAnswer}</p>
                {currentQ.shortExplanation && <p className="text-sm text-green-700 mt-1">{renderWithImages(currentQ.shortExplanation)}</p>}
              </div>
            )}

            {/* Options */}
            {options && ['A','B','C','D'].filter(k => options[k]).length > 0 ? (
              <div className="space-y-3">
                {['A','B','C','D'].map(letter => {
                  const optText = options[letter] || ''; if (!optText) return null
                  const isElim = isEliminated(currentQId, letter)
                  const isSelected = answers[currentQId] === letter
                  return (
                    <div key={letter} className={`relative flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : isElim ? 'border-gray-200 bg-gray-50 opacity-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'}`}
                      onClick={() => { if (isElim) return; setAnswers(prev => ({ ...prev, [currentQId]: letter })) }}>
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 ${isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-400 text-gray-600'}`}>{letter}</div>
                      <div className={`flex-1 pt-0.5 leading-relaxed [&_img]:max-h-20 [&_img]:max-w-[240px] [&_img]:object-contain ${fontClasses[fontSize]} ${isElim ? 'line-through' : ''}`}>{renderWithImages(optText)}</div>
                      {/* Eliminate button */}
                      <button onClick={e => { e.stopPropagation(); toggleEliminate(currentQId, letter) }} title="Eliminate option" className="absolute top-2 right-2 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <FiSlash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-2">Enter your answer:</p>
                <input type="text" value={answers[currentQId] || ''} onChange={e => setAnswers(prev => ({ ...prev, [currentQId]: e.target.value }))} className={`w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 outline-none ${fontClasses[fontSize]}`} placeholder="Type your answer..." />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-gray-200 bg-white px-6 py-3 flex items-center justify-between flex-shrink-0">
        <button onClick={() => setCurrentQIdx(p => Math.max(0, p-1))} disabled={currentQIdx === 0} className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">← Previous</button>
        <div className="text-sm text-gray-500">{currentQIdx + 1} / {currentQs.length}</div>
        <button onClick={() => {
          if (currentQIdx < currentQs.length - 1) setCurrentQIdx(p => p + 1)
          else handleFinishModule(false)
        }} className={`px-5 py-2 rounded-lg text-sm font-medium text-white ${currentQIdx < currentQs.length - 1 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}>
          {currentQIdx < currentQs.length - 1 ? 'Next →' : currentModuleIdx === modules.length - 1 ? 'Submit Test' : `Finish Module ${currentModuleIdx + 1}`}
        </button>
      </div>
    </div>
  )
}
