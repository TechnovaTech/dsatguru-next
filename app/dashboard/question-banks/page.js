'use client'
import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { useAuth } from '../../components/AuthContext'
import { useRouter } from 'next/navigation'
import FloatingContactButtons from '../../components/FloatingContactButtons'
import {
  FiDatabase,
  FiLayers,
  FiHelpCircle,
  FiCheckCircle,
  FiCalendar,
  FiAlertCircle,
  FiPlayCircle,
  FiLock,
  FiSearch,
  FiArrowRight,
} from 'react-icons/fi'

export default function QuestionBanksPage() {
  const [questionBanks, setQuestionBanks] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    fetchQuestionBanks()
    fetchEnrollments()
  }, [])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('success') === 'true') {
      const courseId = urlParams.get('courseId')
      const sessionId = urlParams.get('session_id')
      if (courseId) {
        enrollAfterPayment(courseId, sessionId)
      }
    }
  }, [])

  const fetchQuestionBanks = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get('/api/questions?question-banks=true')
      // Defense-in-depth: only real question_bank Course docs have 24-hex ids. Synthetic
      // buckets (admin-math/admin-rw) route to /enrollment/admin-math -> "Course Not Found",
      // so never render them in the student listing regardless of what the API returns.
      const banks = (response.data.data || []).filter(b => /^[0-9a-fA-F]{24}$/.test(String(b?.id)))
      setQuestionBanks(banks)
    } catch (error) {
      console.error('Error fetching question banks:', error)
      setError("Couldn't load question banks.")
    } finally {
      setLoading(false)
    }
  }

  const fetchEnrollments = async () => {
    try {
      const res = await axios.get('/api/enrollment')
      const list = res.data?.data || res.data?.enrollments || []
      setEnrollments(list)
    } catch (error) {
      setEnrollments([])
    }
  }

  const enrolledIds = useMemo(() => {
    const enrollmentMap = new Map()
    enrollments.forEach(e => {
      const id = (e.courseId?._id || e.courseId || e.id)?.toString()
      if (id) {
        enrollmentMap.set(id, {
          hasAccess: true,
          accessType: e.accessType || 'stripe',
          type: e.type || 'course'
        })
      }
    })
    return enrollmentMap
  }, [enrollments])

  const handlePurchase = (bankId) => {
    if (!user) {
      router.push(`/login?returnTo=/enrollment/${bankId}`)
      return
    }
    router.push(`/enrollment/${bankId}`)
  }

  const enrollAfterPayment = async (courseId, sessionId) => {
    try {
      const token = localStorage.getItem('token')
      await axios.post('/api/enroll', { courseId, sessionId }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchEnrollments()
      window.history.replaceState({}, '', '/dashboard/question-banks')
    } catch (error) {
    }
  }

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : '—')

  // Whole-dollar unless there are cents (e.g. $49 or $49.50). Used for price + CTA labels.
  const formatMoney = (n) => {
    const num = Number(n)
    if (!isFinite(num)) return ''
    return `$${Number.isInteger(num) ? num : num.toFixed(2)}`
  }

  const totalQuestionsAll = useMemo(
    () => questionBanks.reduce((sum, b) => sum + (Number(b.totalQuestions) || 0), 0),
    [questionBanks]
  )
  const enrolledBanksCount = useMemo(
    () => questionBanks.filter(b => enrolledIds.get(String(b.id))?.hasAccess).length,
    [questionBanks, enrolledIds]
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <FloatingContactButtons />

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiDatabase className="h-5 w-5" />
            </span>
            Question Banks
          </h1>
          <p className="mt-1 text-sm text-slate-500">Practice with our comprehensive question collections</p>
        </div>

        {/* Error alert */}
        {error && (
          <div role="alert" className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
            <span className="flex items-center gap-2 text-sm font-medium">
              <FiAlertCircle className="h-4 w-4 flex-shrink-0" />
              {error} Please try again.
            </span>
            <button
              onClick={fetchQuestionBanks}
              className="flex-shrink-0 rounded-lg bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stat cards */}
        {questionBanks.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500 text-white">
                <FiLayers className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{questionBanks.length}</p>
                <p className="text-sm text-slate-500">Question Banks</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white">
                <FiCheckCircle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{enrolledBanksCount}</p>
                <p className="text-sm text-slate-500">Your Access</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500 text-white">
                <FiHelpCircle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{totalQuestionsAll.toLocaleString()}</p>
                <p className="text-sm text-slate-500">Total Questions</p>
              </div>
            </div>
          </div>
        )}

        {/* Banks grid */}
        {questionBanks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white px-6 py-16 text-center shadow-sm">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <FiSearch className="h-7 w-7" />
            </span>
            <h3 className="text-base font-semibold text-slate-900">No question banks available yet</h3>
            <p className="mt-1 text-sm text-slate-500">Check back soon — new question collections are added regularly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {questionBanks.map((bank) => {
              const enrollment = enrolledIds.get(String(bank.id))
              const isEnrolled = enrollment?.hasAccess || false

              // Only show a subject chip when it's a real subject — hide the internal
              // 'Mixed' placeholder, which means nothing to a student.
              const rawSubject = bank.subject || bank.questionBankType || ''
              const subjectLabel = rawSubject && !/^mixed$/i.test(rawSubject.trim()) ? rawSubject : null

              // Questions a student can actually practice (active), falling back to the total.
              const questionCount = Number(bank.activeQuestions ?? bank.totalQuestions ?? 0) || 0

              // Pricing. NOTE: /api/questions?question-banks=true does NOT currently return
              // price fields. The Course model already has price / discountedPrice /
              // discountPercentage (see lib/models/Course.js) — the API should include them
              // in the question-banks payload so real prices show here. Until it does, this
              // block simply hides pricing and shows a plain value line (never a fake number).
              const hasPrice = bank.price !== undefined && bank.price !== null && bank.price !== ''
              const priceNum = hasPrice ? Number(bank.price) : null
              const discountedNum =
                bank.discountedPrice !== undefined && bank.discountedPrice !== null && bank.discountedPrice !== ''
                  ? Number(bank.discountedPrice)
                  : null
              const hasDiscount =
                discountedNum != null && priceNum != null && discountedNum >= 0 && discountedNum < priceNum
              const payNum = hasDiscount ? discountedNum : priceNum
              const isFree = hasPrice && payNum === 0
              const discountPct =
                bank.discountPercentage != null && bank.discountPercentage !== ''
                  ? Math.round(Number(bank.discountPercentage))
                  : hasDiscount
                    ? Math.round((1 - discountedNum / priceNum) * 100)
                    : null

              let ctaLabel = 'Get Access'
              if (hasPrice && !isFree && payNum != null) ctaLabel = `Buy for ${formatMoney(payNum)}`

              return (
                <div
                  key={bank.id}
                  className="flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-slate-900">{bank.title || 'Question Bank'}</h3>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                      {subjectLabel && (
                        <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">
                          {subjectLabel}
                        </span>
                      )}
                      {isEnrolled && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          Unlocked
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mb-4 line-clamp-3 text-sm text-slate-500">
                    {bank.description || 'A focused set of practice questions to help you get exam-ready.'}
                  </p>

                  {/* Plain-English question count — replaces the internal Total/Active/Draft breakdown */}
                  <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <FiHelpCircle className="h-4 w-4 flex-shrink-0 text-indigo-500" />
                    {questionCount > 0
                      ? `${questionCount.toLocaleString()} practice questions`
                      : 'New questions added regularly'}
                  </div>

                  {/* Meta */}
                  <div className="mb-4 mt-auto flex items-center gap-2 text-xs text-slate-400">
                    <FiCalendar className="h-3.5 w-3.5" />
                    Added {formatDate(bank.createdAt)}
                  </div>

                  {isEnrolled ? (
                    <button
                      onClick={() => router.push(`/dashboard/practice/create?bankId=${bank.id}`)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                    >
                      <FiPlayCircle className="h-4 w-4" />
                      Start Practice
                    </button>
                  ) : (
                    <>
                      {/* Price — shown only when the bank actually carries a price field */}
                      {hasPrice ? (
                        isFree ? (
                          <div className="mb-3 flex items-baseline gap-2">
                            <span className="text-lg font-extrabold text-emerald-600">Free</span>
                          </div>
                        ) : (
                          <div className="mb-3 flex flex-wrap items-baseline gap-2">
                            <span className="text-lg font-extrabold text-slate-900">{formatMoney(payNum)}</span>
                            {hasDiscount && (
                              <>
                                <span className="text-sm text-slate-400 line-through">{formatMoney(priceNum)}</span>
                                {discountPct != null && discountPct > 0 && (
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                    {discountPct}% off
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        )
                      ) : (
                        <p className="mb-3 text-xs text-slate-500">
                          Unlock every question in this bank and practice as much as you want.
                        </p>
                      )}

                      <button
                        onClick={() => handlePurchase(bank.id)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                      >
                        <FiLock className="h-4 w-4" />
                        {ctaLabel}
                        <FiArrowRight className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
