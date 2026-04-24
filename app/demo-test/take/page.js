'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { FiFlag, FiClock, FiGrid, FiChevronLeft, FiChevronRight, FiX, FiCheck } from 'react-icons/fi'

function formatTime(s) {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export default function DemoTestTake() {
  const router = useRouter()
  const params = useSearchParams()
  const attemptId = params.get('attemptId')

  const [session, setSession] = useState(null)
  const [module, setModule] = useState('math') // 'math' | 'rw'
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({}) // { qid: 'A' }
  const [marked, setMarked] = useState({}) // { qid: true }
  const [timeSpentPerQ, setTimeSpentPerQ] = useState({}) // { qid: seconds }
  const [remaining, setRemaining] = useState(0)
  const [showNavigator, setShowNavigator] = useState(false)
  const [moduleTransition, setModuleTransition] = useState(null) // 'toRW' | 'submitting' | null
  const [error, setError] = useState('')
  const startTimeRef = useRef(Date.now())
  const qStartTimeRef = useRef(Date.now())

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = sessionStorage.getItem('demoTestSession')
    if (!raw) { router.push('/demo-test'); return }
    try {
      const data = JSON.parse(raw)
      if (attemptId && data.attemptId !== attemptId) { router.push('/demo-test'); return }
      setSession(data)
      setRemaining((data.demoTest?.mathDuration || 20) * 60)
    } catch { router.push('/demo-test') }
  }, [attemptId, router])

  const currentList = useMemo(() => {
    if (!session) return []
    return module === 'math' ? session.mathQuestions : session.rwQuestions
  }, [session, module])

  const currentQ = currentList?.[currentIndex] || null

  // Timer
  useEffect(() => {
    if (!session) return
    const t = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(t)
          handleModuleEnd()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, session])

  // Track per-question time
  useEffect(() => {
    qStartTimeRef.current = Date.now()
  }, [currentIndex, module])

  const recordTimeForCurrent = () => {
    if (!currentQ) return
    const qid = currentQ.id
    const elapsed = Math.floor((Date.now() - qStartTimeRef.current) / 1000)
    setTimeSpentPerQ(prev => ({ ...prev, [qid]: (prev[qid] || 0) + elapsed }))
    qStartTimeRef.current = Date.now()
  }

  const selectOption = (letter) => {
    if (!currentQ) return
    setAnswers(prev => ({ ...prev, [currentQ.id]: letter }))
  }

  const toggleMark = () => {
    if (!currentQ) return
    setMarked(prev => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }))
  }

  const goTo = (i) => {
    recordTimeForCurrent()
    setCurrentIndex(i)
    setShowNavigator(false)
  }

  const next = () => {
    recordTimeForCurrent()
    if (currentIndex < currentList.length - 1) setCurrentIndex(currentIndex + 1)
  }
  const prev = () => {
    recordTimeForCurrent()
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }

  const handleModuleEnd = () => {
    recordTimeForCurrent()
    if (module === 'math' && session?.rwQuestions?.length > 0) {
      setModuleTransition('toRW')
    } else {
      submitAll()
    }
  }

  const proceedToRW = () => {
    setModule('rw')
    setCurrentIndex(0)
    setRemaining((session.demoTest?.rwDuration || 20) * 60)
    setModuleTransition(null)
  }

  const submitAll = async () => {
    setModuleTransition('submitting')
    try {
      const mathAns = (session.mathQuestions || []).map(q => ({
        questionId: q.id,
        module: 'math',
        selectedAnswer: answers[q.id] || '',
        timeSpent: timeSpentPerQ[q.id] || 0
      }))
      const rwAns = (session.rwQuestions || []).map(q => ({
        questionId: q.id,
        module: 'rw',
        selectedAnswer: answers[q.id] || '',
        timeSpent: timeSpentPerQ[q.id] || 0
      }))
      const totalTime = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const res = await axios.post('/api/demo-test/submit', {
        attemptId: session.attemptId,
        answers: [...mathAns, ...rwAns],
        timeSpent: totalTime
      })
      try { if (document.fullscreenElement) await document.exitFullscreen() } catch {}
      if (typeof window !== 'undefined') sessionStorage.removeItem('demoTestSession')
      router.push(`/demo-test/result/${res.data.data.attemptId}`)
    } catch (e) {
      setError('Failed to submit. Please try again.')
      setModuleTransition(null)
    }
  }

  if (!session) return <div className="min-h-screen flex items-center justify-center bg-white text-gray-500">Loading...</div>
  if (!currentQ) return <div className="min-h-screen flex items-center justify-center bg-white text-gray-500">No questions available.</div>

  const answeredCount = currentList.filter(q => !!answers[q.id]).length
  const moduleTitle = module === 'math' ? 'Section 1, Module 1: Math' : 'Section 2, Module 2: Reading & Writing'

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Module transition overlay */}
      <AnimatePresence>
        {moduleTransition === 'toRW' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-slate-950/95 flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-2xl p-8 max-w-md text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <FiCheck className="text-green-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Math module complete!</h2>
              <p className="text-gray-600 mb-6">You answered {answeredCount} of {currentList.length} questions. Ready for Reading & Writing?</p>
              <button onClick={proceedToRW} className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700">Start Module 2 →</button>
            </motion.div>
          </motion.div>
        )}
        {moduleTransition === 'submitting' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-slate-950/95 flex items-center justify-center">
            <motion.div className="text-center">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              <div className="text-white text-lg font-medium">Calculating your score...</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">{moduleTitle}</div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${remaining < 60 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
          <FiClock size={16} />
          <span className="font-mono font-semibold">{formatTime(remaining)}</span>
        </div>
        <div className="text-sm text-gray-500">{answeredCount}/{currentList.length} answered</div>
      </div>

      {/* Main split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left - passage */}
        <div className="w-1/2 border-r overflow-y-auto p-8 bg-gray-50">
          {currentQ.questionParagraph ? (
            <div className="prose max-w-none">
              <div className="whitespace-pre-line text-gray-800 leading-relaxed">{currentQ.questionParagraph}</div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">No passage for this question</div>
          )}
        </div>

        {/* Right - question */}
        <div className="w-1/2 overflow-y-auto p-8 bg-white">
          <div className="max-w-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-black text-white w-10 h-10 rounded flex items-center justify-center font-bold">{currentIndex + 1}</div>
              <button onClick={toggleMark} className={`flex items-center gap-2 text-sm ${marked[currentQ.id] ? 'text-amber-600' : 'text-gray-500 hover:text-gray-700'}`}>
                <FiFlag className={marked[currentQ.id] ? 'fill-current' : ''} />
                {marked[currentQ.id] ? 'Marked for Review' : 'Mark for Review'}
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-900 text-base leading-relaxed whitespace-pre-line">{currentQ.content}</p>
            </div>

            {currentQ.imageUrl && (
              <div className="mb-6">
                <img src={currentQ.imageUrl} alt="Question" className="max-w-full h-auto rounded border" />
              </div>
            )}

            <div className="space-y-3">
              {(currentQ.options || []).map((opt, i) => {
                const letter = String.fromCharCode(65 + i)
                const selected = answers[currentQ.id] === letter
                return (
                  <button
                    key={i}
                    onClick={() => selectOption(letter)}
                    className={`w-full text-left border-2 rounded-lg p-4 transition-all ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-semibold ${selected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-400 text-gray-700'}`}>
                        {letter}
                      </div>
                      <div className="flex-1 pt-1"><span className="text-gray-900">{opt}</span></div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="bg-white border-t px-6 py-4 relative">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button onClick={prev} disabled={currentIndex === 0} className="flex items-center gap-1 px-6 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed">
            <FiChevronLeft /> Back
          </button>

          <button onClick={() => setShowNavigator(!showNavigator)} className="flex items-center gap-2 text-sm text-gray-600 border px-4 py-2 rounded-full hover:bg-gray-50">
            <FiGrid /> Question {currentIndex + 1} of {currentList.length}
          </button>

          {currentIndex < currentList.length - 1 ? (
            <button onClick={next} className="flex items-center gap-1 px-6 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700">
              Next <FiChevronRight />
            </button>
          ) : (
            <button onClick={handleModuleEnd} className="px-6 py-2 bg-green-600 text-white rounded-full font-medium hover:bg-green-700">
              {module === 'math' ? 'Finish Math Module' : 'Submit Test'}
            </button>
          )}
        </div>

        {/* Navigator popup */}
        {showNavigator && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white border rounded-xl shadow-2xl p-4 w-[min(90vw,420px)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Jump to question</h3>
              <button onClick={() => setShowNavigator(false)} className="text-gray-400 hover:text-gray-600"><FiX /></button>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {currentList.map((q, i) => {
                const answered = !!answers[q.id]
                const isMarked = !!marked[q.id]
                const current = i === currentIndex
                return (
                  <button
                    key={q.id}
                    onClick={() => goTo(i)}
                    className={`h-10 rounded text-sm font-medium relative ${current ? 'ring-2 ring-blue-600 ring-offset-1' : ''} ${answered ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {i + 1}
                    {isMarked && <FiFlag className="absolute top-0 right-0 text-amber-500" size={10} />}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500" /> Answered</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border" /> Unanswered</span>
              <span className="flex items-center gap-1"><FiFlag className="text-amber-500" /> Marked</span>
            </div>
          </motion.div>
        )}
      </div>

      {error && (
        <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">{error}</div>
      )}
    </div>
  )
}
