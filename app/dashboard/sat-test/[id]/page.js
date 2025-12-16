'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import axios from 'axios'

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
        const s = sRes.data?.session
        setSession(s)
        const answeredIds = new Set((s?.responses || []).map(r => String(r.questionId)))
        const amap = {}
        const smap = {}
        (s?.responses || []).forEach(r => {
          amap[String(r.questionId)] = true
          smap[String(r.questionId)] = r.selectedAnswer
        })
        setAnsweredMap(amap)
        setSelectedMap(smap)
        if (s?.state === 'IN_PROGRESS_BASE' || s?.state === 'CREATED') {
          const easyRes = await axios.get(`/api/questions?bankId=${s.questionBankId}&testType=Base&difficulty=Easy&isActive=true${s?.subject ? `&subject=${encodeURIComponent(s.subject)}` : ''}`)
          const medRes = await axios.get(`/api/questions?bankId=${s.questionBankId}&testType=Base&difficulty=Medium&isActive=true${s?.subject ? `&subject=${encodeURIComponent(s.subject)}` : ''}`)
          const allEasy = easyRes.data?.data || easyRes.data?.questions || []
          const allMed = medRes.data?.data || medRes.data?.questions || []
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
        const s = sRes.data?.session
        setSession(s)
        setBaseQuestions((s?.adaptiveQuestions || []).map(q => ({
          id: q.id,
          content: q.content,
          options: q.options
        })))
        setCurrentIndex(0)
        setRemaining(20 * 60)
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
        const s = sRes.data?.session
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
          setRemaining(20 * 60)
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              Question {currentIndex + 1} of {baseQuestions.length}
            </div>
            <div className="text-sm text-gray-600">
              {session?.state === 'IN_PROGRESS_BASE' ? 'Base Module' : 'Adaptive Module'}
            </div>
          </div>
          <div className="mb-4 text-right text-sm text-gray-700">
            Time left: {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
          </div>
          {currentQuestion.questionParagraph && (
            <div className="whitespace-pre-line text-gray-700 mb-4">
              {currentQuestion.questionParagraph}
            </div>
          )}
          <div className="whitespace-pre-line text-gray-900 mb-6">
            {currentQuestion.content}
          </div>
          {currentQuestion.imageUrl && (
            <div className="mb-4">
              <img src={currentQuestion.imageUrl} alt="Question" className="max-h-64 object-contain" />
            </div>
          )}
          <div className="space-y-3">
            {(currentQuestion.options || []).map((opt, i) => (
              <button
                key={i}
                onClick={() => submitAnswer(String.fromCharCode(65 + i))}
                disabled={submitting || !!answeredMap[String(currentQuestion.id || currentQuestion._id)]}
                className={`w-full text-left border rounded-lg p-3 transition-colors ${
                  answeredMap[String(currentQuestion.id || currentQuestion._id)]
                    ? 'bg-gray-50 cursor-not-allowed'
                    : 'hover:bg-blue-50'
                } ${selectedMap[String(currentQuestion.id || currentQuestion._id)] === String.fromCharCode(65 + i) ? 'border-blue-500 bg-blue-50' : ''}`}
              >
                <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                <span>{opt}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateIndex(currentIndex - 1)}
              className="px-3 py-1 border rounded hover:bg-gray-50"
              disabled={currentIndex === 0}
            >
              Prev
            </button>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {baseQuestions.map((q, idx) => {
              const isCurrent = idx === currentIndex
              const qId = String(q.id || q._id)
              const isAnswered = !!answeredMap[qId]
              return (
                <button
                  key={idx}
                  onClick={() => navigateIndex(idx)}
                  className={`w-8 h-8 text-sm rounded-full border ${
                    isCurrent ? 'bg-blue-600 text-white border-blue-600' :
                    isAnswered ? 'bg-green-100 text-green-700 border-green-300' :
                    'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateIndex(currentIndex + 1)}
              className="px-3 py-1 border rounded hover:bg-gray-50"
              disabled={currentIndex >= baseQuestions.length - 1}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
