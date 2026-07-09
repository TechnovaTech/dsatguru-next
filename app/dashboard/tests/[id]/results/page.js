'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { FiRefreshCw, FiAlertCircle, FiCalendar, FiArrowRight } from 'react-icons/fi'
import TestResultView from '../../../../components/TestResultView'

// Warm, score-aware greeting. We never show a raw number here (that stays in
// TestResultView) — we only pick a tone so we can never contradict the graded
// score. Falls back to an encouraging neutral line when the score is unknown.
const HEADLINES = {
  great: { emoji: '🎉', title: "Great work — you're really improving!", sub: "You're building real momentum. A quick review now locks it in." },
  good:  { emoji: '💪', title: "Nice job — you're on the right track.", sub: 'A little review now turns "almost" into "got it".' },
  grow:  { emoji: '🚀', title: 'Every test makes you sharper.', sub: "Let's turn the ones you missed into easy wins next time." },
}
const NEUTRAL = { emoji: '🎯', title: 'Test complete — nice job finishing!', sub: "Here's the fastest way to keep improving." }

export default function TestResultPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const testId = params.id
  const sessionId = searchParams.get('session_id') || searchParams.get('sessionId')
  const returnUrl = searchParams.get('returnUrl') || '/dashboard/tests'
  const viewMode = searchParams.get('viewMode')
  const viewAnalysis = searchParams.get('viewAnalysis') === 'true'

  const isStudentView = viewMode !== 'admin'
  const [tone, setTone] = useState(null) // 'great' | 'good' | 'grow' | null
  const [loaded, setLoaded] = useState(false) // only true once a real session is found

  // Derive a tone from the server-graded result (same grading TestResultView shows).
  useEffect(() => {
    if (!isStudentView) return
    let cancelled = false
    const run = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const headers = token ? { Authorization: `Bearer ${token}` } : {}

        // Resolve the session the same way TestResultView does: prefer the id in the
        // URL, otherwise fall back to the latest session for this test.
        let sid = sessionId
        if (!sid && testId) {
          const listRes = await fetch('/api/test-sessions', { headers })
          if (listRes.ok) {
            const data = await listRes.json()
            const sessions = data.sessions || data || []
            const mine = sessions
              .filter(s => (s.testId?._id === testId || s.testId === testId))
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            if (mine[0]) sid = mine[0]._id
          }
        }
        if (!sid) return

        const res = await fetch(`/api/test-sessions/${sid}`, { headers })
        if (!res.ok) return
        const s = await res.json()
        if (cancelled) return
        // Only show the "nice job finishing" headline + next-steps for a genuinely
        // completed session (not an in-progress one reached by a stale link).
        if (!(s.status === 'Completed' || s.state === 'COMPLETED')) return
        setLoaded(true)

        const responses = Array.isArray(s.responses) ? s.responses : []
        const correct = responses.length
          ? responses.filter(r => r && r.isCorrect).length
          : (Number(s.correctAnswers) || 0)
        const totalNum = Number(s.totalQuestions)
        const denom = totalNum > 0 ? totalNum : responses.length
        if (!denom) return // unknown → keep the encouraging neutral headline
        const pct = correct / denom
        setTone(pct >= 0.8 ? 'great' : pct >= 0.5 ? 'good' : 'grow')
      } catch (e) {
        // Stay silent — the block just won't render, or shows the neutral line.
      }
    }
    run()
    return () => { cancelled = true }
  }, [testId, sessionId, isStudentView])

  const h = tone ? HEADLINES[tone] : NEUTRAL

  const nextSteps = [
    {
      href: '/dashboard/redo-queue',
      icon: FiRefreshCw,
      tint: 'bg-purple-100 text-purple-700',
      hover: 'hover:border-purple-300 hover:bg-purple-50 active:bg-purple-100',
      arrow: 'group-hover:text-purple-500',
      title: 'Redo your wrong questions',
      desc: "Fix the ones you missed while they're fresh.",
    },
    {
      href: '/dashboard/error-log',
      icon: FiAlertCircle,
      tint: 'bg-amber-100 text-amber-700',
      hover: 'hover:border-amber-300 hover:bg-amber-50 active:bg-amber-100',
      arrow: 'group-hover:text-amber-500',
      title: 'See your mistakes',
      desc: 'Spot the patterns so they stop happening.',
    },
    {
      href: '/dashboard/study-plan',
      icon: FiCalendar,
      tint: 'bg-indigo-100 text-indigo-700',
      hover: 'hover:border-indigo-300 hover:bg-indigo-50 active:bg-indigo-100',
      arrow: 'group-hover:text-indigo-500',
      title: 'Open your Study Plan',
      desc: 'Know exactly what to practise next.',
    },
  ]

  return (
    <>
      {/* Student-only: warm greeting + clear next steps, above the detailed report.
          Hidden for admin/tutor viewers and until a real session has loaded so it
          never stacks on top of a "Session not found" screen. */}
      {isStudentView && loaded && (
        <div className="bg-gray-50 pt-6">
          <div className="max-w-7xl mx-auto px-4">
            {/* Score-aware headline */}
            <div className="mb-5 flex items-start gap-3">
              <span className="text-2xl leading-none sm:text-3xl" aria-hidden="true">{h.emoji}</span>
              <div className="min-w-0">
                <h2 className="text-xl font-black leading-snug text-gray-900 sm:text-2xl">{h.title}</h2>
                <p className="mt-1 text-sm text-gray-600">{h.sub}</p>
              </div>
            </div>

            {/* What to do next */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-base font-bold text-gray-900 sm:text-lg">What to do next</h3>
              <p className="mt-1 text-sm text-gray-500">Small, focused steps beat cramming. Pick one:</p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {nextSteps.map((step) => {
                  const Icon = step.icon
                  return (
                    <Link
                      key={step.href}
                      href={step.href}
                      className={`group flex min-h-[56px] items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-colors ${step.hover}`}
                    >
                      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${step.tint}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-gray-900">{step.title}</span>
                        <span className="mt-0.5 block text-xs text-gray-500">{step.desc}</span>
                      </span>
                      <FiArrowRight className={`h-4 w-4 flex-shrink-0 text-gray-300 transition-colors ${step.arrow}`} aria-hidden="true" />
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <TestResultView
          testId={testId}
          sessionId={sessionId}
          returnUrl={returnUrl}
          viewMode={viewMode}
          viewAnalysis={viewAnalysis}
      />
    </>
  )
}
