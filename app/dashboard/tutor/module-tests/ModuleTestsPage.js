'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiPlay, FiFileText, FiCheckCircle, FiLayers, FiClock, FiAlertCircle, FiTarget, FiAward, FiRefreshCw } from 'react-icons/fi'
import { useToast } from '@/app/components/ui/UIProvider'
import { canReattempt, reattemptSession } from '@/lib/reattempt'

export default function ModuleTestsPage({ subject }) {
  const router = useRouter()
  const toast = useToast()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('Assigned')

  useEffect(() => { fetchSessions() }, [])

  const fetchSessions = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/test-sessions', {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      })
      if (!res.ok) throw new Error('Failed to load module tests')
      const data = await res.json()
      const sessions = data.sessions || data || []
      const filtered = sessions.filter(s => {
        if (!s.testId?.isModuleTest) return false
        // If no subject is provided, show all module tests
        if (!subject) return true

        const modules = s.testId?.modules || []
        // Reassigned module tests have no modules array — match by test subject directly
        if (modules.length === 0) return s.testId?.subject === subject
        return modules.some(m => m.subject === subject)
      })
      setHistory(filtered)
    } catch (e) {
      console.error(e)
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { name: 'Assigned', count: history.filter(h => h.status === 'Assigned').length },
    { name: 'In Progress', count: history.filter(h => h.status === 'InProgress').length },
    { name: 'Completed', count: history.filter(h => h.status === 'Completed').length }
  ]

  const statusMap = { Assigned: 'Assigned', 'In Progress': 'InProgress', Completed: 'Completed' }
  const returnUrl = subject
    ? (subject === 'Math' ? '/dashboard/tutor/module-tests/math' : '/dashboard/tutor/module-tests/rw')
    : '/dashboard/tutor/module-tests'

  const heading = subject ? `Module ${subject === 'Math' ? 'Math' : 'Reading & Writing'} Tests` : 'Tutor Module Tests'
  const subtitle = subject
    ? `Multi-module ${subject} tests assigned by your instructor.`
    : 'All multi-module tests (Math & RW) assigned by your instructor.'

  const stats = [
    { label: 'Assigned', value: tabs[0].count, icon: FiFileText, chip: 'bg-indigo-500' },
    { label: 'In Progress', value: tabs[1].count, icon: FiClock, chip: 'bg-amber-500' },
    { label: 'Completed', value: tabs[2].count, icon: FiCheckCircle, chip: 'bg-emerald-500' },
  ]

  if (loading) return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500"></div>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <FiAlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-500" />
          <h3 className="font-semibold text-rose-800">{error}</h3>
          <button onClick={fetchSessions}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
            Retry
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiLayers className="h-5 w-5" />
            </span>
            {heading}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map(stat => (
            <div key={stat.label} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-white ${stat.chip}`}>
                <stat.icon className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl font-extrabold text-slate-900">{stat.value}</div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          {tabs.map(tab => (
            <button key={tab.name} onClick={() => setActiveTab(tab.name)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.name ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {tab.name}
              {tab.count > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${activeTab === tab.name ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-3">
          {(() => {
            const filtered = history.filter(h => {
              if (h.status !== statusMap[activeTab]) return false
              // Hide reassigned sessions from Completed and In Progress tabs
              if (activeTab !== 'Assigned' && h.isReassigned) return false
              return true
            })
            if (!filtered.length) return (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
                <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <FiFileText className="h-6 w-6" />
                </span>
                <h3 className="font-semibold text-slate-900">No {activeTab.toLowerCase()} module tests</h3>
                <p className="mt-1 text-sm text-slate-500">Check back later or contact your instructor.</p>
              </div>
            )
            return filtered.map(session => {
              const test = session.testId
              const modules = test?.modules || []
              const totalQ = modules.reduce((s, m) => s + (m.numberOfQuestions || m.questions?.length || 0), 0)
              const isReassigned = test?.isReassigned === true
              const completedSession = activeTab === 'Assigned'
                ? history.find(h => String(h.testId?._id) === String(test?._id) && h.status === 'Completed')
                : null
              const effectiveStatus = completedSession ? 'Completed' : session.status
              const resultSession = completedSession || session
              const showScore = effectiveStatus === 'Completed'
              const dispTotalQ = totalQ || resultSession.totalQuestions || 0
              return (
                <div key={session._id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md md:flex-row md:items-center">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        effectiveStatus === 'Completed' ? 'bg-emerald-100 text-emerald-700'
                        : effectiveStatus === 'InProgress' ? 'bg-amber-100 text-amber-700'
                        : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {effectiveStatus === 'InProgress' ? 'In Progress' : effectiveStatus}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">
                        <FiLayers className="h-3 w-3" />{modules.length} Modules
                      </span>
                      {isReassigned && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Reassigned</span>
                      )}
                      <span className="text-xs text-slate-400">
                        {session.createdAt ? new Date(session.createdAt).toLocaleDateString() : '—'}
                      </span>
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-slate-900">{test?.title || 'Module Test'}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1"><FiFileText className="h-4 w-4 text-slate-400" /> <b>{dispTotalQ}</b> Questions</span>
                      {showScore && (
                        <>
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <FiTarget className="h-4 w-4" /> <b>{resultSession.correctAnswers ?? 0}</b>/{dispTotalQ} Correct
                          </span>
                          {resultSession.totalScore != null && (
                            <span className="inline-flex items-center gap-1 text-indigo-700">
                              <FiAward className="h-4 w-4" /> Score <b>{resultSession.totalScore}</b>
                            </span>
                          )}
                          {resultSession.completedAt && (
                            <span className="inline-flex items-center gap-1 text-slate-400">
                              <FiCheckCircle className="h-3.5 w-3.5" /> {new Date(resultSession.completedAt).toLocaleDateString()}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {modules.map((m, i) => (
                        <span key={i} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          M{i+1}: {m.subject} • {m.numberOfQuestions || m.questions?.length || 0}q • {m.isTimed ? `${m.duration}min` : 'Untimed'}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    {effectiveStatus === 'Completed' ? (
                      <div className="flex items-center gap-2">
                        {canReattempt(resultSession) && (
                          <button
                            onClick={async () => { try { router.push(await reattemptSession(resultSession, { returnUrl, moduleTest: true })) } catch { toast.error('Could not start a reattempt. Please try again.') } }}
                            title="This test was auto-submitted — let the student take it again"
                            className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100">
                            <FiRefreshCw className="h-4 w-4" /> Reattempt
                          </button>
                        )}
                        <button onClick={() => router.push(`/dashboard/tests/${test?._id}/results?session_id=${resultSession._id}&returnUrl=${returnUrl}`)}
                          className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors ${
                            resultSession.analysisSubmitted ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
                          }`}>
                          <FiCheckCircle className="h-4 w-4" /> {resultSession.analysisSubmitted ? 'View Analysis' : 'Submit Analysis'}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => router.push(`/dashboard/tests/${test?._id}/module-start?sessionId=${session._id}&returnUrl=${returnUrl}`)}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
                        <FiPlay className="h-4 w-4" /> {effectiveStatus === 'InProgress' ? 'Resume' : 'Start Test'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          })()}
        </div>
      </div>
    </div>
  )
}
