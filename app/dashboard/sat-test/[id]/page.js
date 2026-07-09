'use client'
import { renderContent as renderWithImages } from '../../../components/admin/LatexRenderer'
import { parseOptionsArray, hasRealOptions } from '../../../../lib/questionOptions'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import axios from 'axios'

// Per-module duration (in seconds) for the Digital SAT format, derived from the
// section subject: ~32 min for Reading & Writing, ~35 min for Math. If the test
// carries a configured `duration` (total minutes across its 2 modules), use half
// of it per module as the override.
function moduleDurationSeconds(session) {
  const configured = Number(session?.test?.duration || session?.testDuration || 0)
  if (configured > 0) return Math.round((configured * 60) / 2)
  const subj = String(session?.subject || '').toLowerCase()
  if (subj.includes('math')) return 2100 // 35 minutes
  return 1920 // 32 minutes (Reading & Writing)
}

export default function SatTestRunner() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params?.id
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [session, setSession] = useState(null)
  const [baseQuestions, setBaseQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [remaining, setRemaining] = useState(30 * 60) // 30 minutes default
  const [answeredMap, setAnsweredMap] = useState({})
  const [selectedMap, setSelectedMap] = useState({})
  const [gridMap, setGridMap] = useState({}) // typed answers for grid-in (fill-in-the-blank) questions

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        const token = typeof window !== 'undefined'
          ? (localStorage.getItem('token') || localStorage.getItem('authToken'))
          : null
        if (!token) {
          router.push(`/login?returnTo=${encodeURIComponent(`/dashboard/sat-test/${sessionId}`)}`)
          return
        }
        const sRes = await axios.get(`/api/test-sessions/${sessionId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        const s = sRes.data
        setSession(s)
        // Derive the per-module timer from the section subject (R&W ~32m, Math ~35m),
        // or the test's configured duration when present, instead of a hardcoded value.
        setRemaining(moduleDurationSeconds(s))
        const answeredIds = new Set((s?.responses || []).map(r => String(r.questionId)))
        const amap = {}
        const smap = {}
        ;(s?.responses || []).forEach(r => {
          amap[String(r.questionId)] = true
          smap[String(r.questionId)] = r.selectedAnswer
        })
        setAnsweredMap(amap)
        setSelectedMap(smap)
        if (s?.state === 'IN_PROGRESS_BASE' || s?.state === 'CREATED') {
          const easyRes = await axios.get(`/api/questions?bankId=${s.questionBankId}&testType=Base&difficulty=Easy&isActive=true${s?.subject ? `&subject=${encodeURIComponent(s.subject)}` : ''}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
          const medRes = await axios.get(`/api/questions?bankId=${s.questionBankId}&testType=Base&difficulty=Medium&isActive=true${s?.subject ? `&subject=${encodeURIComponent(s.subject)}` : ''}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
          const allEasy = Array.isArray(easyRes.data) ? easyRes.data : (easyRes.data?.data || easyRes.data?.questions || [])
          const allMed = Array.isArray(medRes.data) ? medRes.data : (medRes.data?.data || medRes.data?.questions || [])
          const all = [...allEasy, ...allMed]
          const seen = new Set()
          const merged = []
          for (const q of all) {
            const id = String(q.id || q._id)
            if (seen.has(id)) continue
            seen.add(id)
            merged.push(q)
          }
          const filtered = merged.filter(q => !answeredIds.has(String(q.id || q._id)))
          const limit = Number(s?.baseTarget || Math.floor(Number(s?.totalQuestions || 50) / 2))
          setBaseQuestions(filtered.slice(0, limit))
        } else if (s?.state === 'IN_PROGRESS_ADAPTIVE') {
          // use adaptiveQuestions provided by session endpoint
          setBaseQuestions((s?.adaptiveQuestions || []).map(q => ({
            id: q.id,
            content: q.content,
            options: q.options,
            questionParagraph: q.questionParagraph,
            imageUrl: q.imageUrl
          })))
        } else if (s?.state === 'COMPLETED') {
          router.push(`/dashboard/analytics`)
        }
      } catch (e) {
        if (e?.response?.status === 401) {
          router.push(`/login?returnTo=${encodeURIComponent(`/dashboard/sat-test/${sessionId}`)}`)
          return
        }
        if (e?.response?.status === 404) {
          router.push('/dashboard/question-banks')
          return
        }
        setError('Failed to initialize test')
      } finally {
        setLoading(false)
      }
    }
    if (sessionId) init()
  }, [sessionId, router])

  const currentQuestion = useMemo(() => {
    return baseQuestions?.[currentIndex] || null
  }, [baseQuestions, currentIndex])

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(timer)
          autoSubmitModule()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const autoSubmitModule = async () => {
    try {
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('token') || localStorage.getItem('authToken'))
        : null
      const res = await axios.post(`/api/test-sessions/${sessionId}/submit`, {}, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const next = res.data?.next
      if (next === 'adaptive') {
        const sRes = await axios.get(`/api/test-sessions/${sessionId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        const s = sRes.data
        setSession(s)
        setBaseQuestions((s?.adaptiveQuestions || []).map(q => ({
          id: q.id,
          content: q.content,
          options: q.options
        })))
        setCurrentIndex(0)
        setRemaining(moduleDurationSeconds(s))
      } else {
        router.push(`/dashboard/analytics`)
      }
    } catch (e) {
      setError('Failed to submit module')
    }
  }

  const submitAnswer = async (opt) => {
    if (!currentQuestion || !sessionId) return
    const qKey = String(currentQuestion.id || currentQuestion._id)
    if (answeredMap[qKey]) return
    try {
      setSubmitting(true)
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('token') || localStorage.getItem('authToken'))
        : null
      await axios.post(`/api/test-sessions/${sessionId}/answer`, {
        questionId: currentQuestion.id || currentQuestion._id,
        selectedOption: opt,
        timeSpent: 30
      }, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      setAnsweredMap(prev => ({ ...prev, [qKey]: true }))
      setSelectedMap(prev => ({ ...prev, [qKey]: opt }))
      const nextIndex = currentIndex + 1
      if (nextIndex < baseQuestions.length) {
        setCurrentIndex(nextIndex)
      } else {
        const sRes = await axios.get(`/api/test-sessions/${sessionId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        const s = sRes.data
        setSession(s)
        if (s?.state === 'IN_PROGRESS_ADAPTIVE' && (s?.adaptiveQuestions || []).length > 0) {
          setBaseQuestions((s.adaptiveQuestions || []).map(q => ({
            id: q.id,
            content: q.content,
            options: q.options,
            questionParagraph: q.questionParagraph,
            imageUrl: q.imageUrl
          })))
          setCurrentIndex(0)
          setRemaining(moduleDurationSeconds(s))
        } else {
          router.push(`/dashboard/analytics`)
        }
      }
    } catch (e) {
      setError('Failed to submit answer')
    } finally {
      setSubmitting(false)
    }
  }

  const navigateIndex = (idx) => {
    if (idx < 0 || idx >= baseQuestions.length) return
    setCurrentIndex(idx)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading test...</div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-600">{error}</div>
      </div>
    )
  }
  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">No questions available</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-3 flex flex-wrap gap-2 items-center justify-between">
        <div className="text-sm font-medium text-gray-700">
          Section 1, Module 1: {session?.subject || 'Reading and Writing'}
        </div>
        <div className="text-sm font-medium text-gray-700">
          {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
        </div>
        <div className="text-sm text-gray-600">
          80% ⚡
        </div>
      </div>

      {/* Main Content - Split Screen */}
      <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden">
        {/* Left Side - Passage/Context */}
        <div className="w-full md:w-1/2 border-b md:border-r md:border-b-0 overflow-y-auto p-4 md:p-8 bg-gray-50">
          {currentQuestion.questionParagraph ? (
            <div className="prose max-w-none">
              <div className="whitespace-pre-line text-gray-800 leading-relaxed">
                {renderWithImages(currentQuestion.questionParagraph)}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No passage for this question</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Question and Options */}
        <div className="w-full md:w-1/2 overflow-y-auto p-4 md:p-8 bg-white">
          <div className="max-w-2xl">
            {/* Question Number Badge */}
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-black text-white w-10 h-10 rounded flex items-center justify-center font-bold">
                {currentIndex + 1}
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {/* Question Text */}
            <div className="mb-6">
              <p className="text-gray-900 text-base leading-relaxed whitespace-pre-line">
                {renderWithImages(currentQuestion.content)}
              </p>
            </div>

            {/* Question Image */}
            {currentQuestion.imageUrl && (
              <div className="mb-6">
                <img src={currentQuestion.imageUrl} alt="Question" className="max-w-full h-auto rounded border" />
              </div>
            )}

            {/* Answer Options */}
            {(() => {
              const qId = String(currentQuestion.id || currentQuestion._id)
              const isAnswered = !!answeredMap[qId]

              // Grid-in (student-produced response): no real answer choices — the
              // student types a numeric/text answer. hasRealOptions/parseOptionsArray
              // normalize any options shape (array, JSON string, {A,B,C,D} object),
              // so an object no longer crashes with "options.map is not a function".
              if (!hasRealOptions(currentQuestion)) {
                const typed = isAnswered ? (selectedMap[qId] || '') : (gridMap[qId] || '')
                const submitTyped = () => {
                  const v = (gridMap[qId] || '').trim()
                  if (v) submitAnswer(v)
                }
                return (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Enter your answer:</p>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={typed}
                        disabled={submitting || isAnswered}
                        onChange={(e) => setGridMap(prev => ({ ...prev, [qId]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') submitTyped() }}
                        className="flex-1 p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                        placeholder="Type your answer..."
                      />
                      <button
                        onClick={submitTyped}
                        disabled={submitting || isAnswered || !(gridMap[qId] || '').trim()}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div className="space-y-3">
                  {parseOptionsArray(currentQuestion).map((opt, i) => {
                    if (!opt) return null
                    const optionLetter = String.fromCharCode(65 + i)
                    const isSelected = selectedMap[qId] === optionLetter

                    return (
                      <button
                        key={i}
                        onClick={() => submitAnswer(optionLetter)}
                        disabled={submitting || isAnswered}
                        className={`w-full text-left border-2 rounded-lg p-4 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                        } ${isAnswered ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-semibold ${
                            isSelected
                              ? 'border-blue-500 bg-blue-500 text-white'
                              : 'border-gray-400 text-gray-700'
                          }`}>
                            {optionLetter}
                          </div>
                          <div className="flex-1 pt-1">
                            <span className="text-gray-900">{renderWithImages(opt)}</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigateIndex(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Back
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 mr-2">Question {currentIndex + 1} of {baseQuestions.length}</span>
            <button className="px-4 py-2 border border-gray-300 rounded-full text-sm hover:bg-gray-50">
              ▲
            </button>
          </div>
          
          <button
            onClick={() => navigateIndex(currentIndex + 1)}
            disabled={currentIndex >= baseQuestions.length - 1}
            className="px-6 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
