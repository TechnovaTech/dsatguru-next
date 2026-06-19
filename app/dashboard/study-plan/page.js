'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../components/AuthContext'
import {
  FiCalendar, FiUser, FiTarget, FiTrendingUp, FiBarChart2, FiCheckCircle,
  FiSave, FiCpu, FiAlertCircle, FiZap, FiBookOpen, FiRefreshCw, FiClock,
  FiAlertTriangle, FiAward, FiEdit3, FiActivity
} from 'react-icons/fi'

export default function StudyPlanPage() {
  const { user } = useAuth()

  const [form, setForm] = useState({
    studentName: '',
    startDate: '',
    examDate: '',
    currentScore: '',
    targetScore: '1600'
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  // Personalized plan generated from the student's latest test results
  const [weakTopics, setWeakTopics] = useState([])
  const [dailyPlan, setDailyPlan] = useState([])
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')

  // Load saved plan on mount
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/study-plan', { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          if (data) {
            setForm({
              studentName: data.studentName || '',
              startDate: data.startDate ? data.startDate.slice(0, 10) : '',
              examDate: data.examDate ? data.examDate.slice(0, 10) : '',
              currentScore: data.currentScore?.toString() || '',
              targetScore: data.targetScore?.toString() || '1600'
            })
            setWeakTopics(Array.isArray(data.weakTopics) ? data.weakTopics : [])
            setDailyPlan(Array.isArray(data.dailyPlan) ? data.dailyPlan : [])
          }
        }
      } catch {}
      setLoading(false)
    }
    fetchPlan()
  }, [])

  // Pre-fill student name from auth
  useEffect(() => {
    if (user?.name && !form.studentName) {
      setForm(f => ({ ...f, studentName: user.name }))
    }
  }, [user])

  const calc = useCallback(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const start = form.startDate ? new Date(form.startDate) : null
    const exam = form.examDate ? new Date(form.examDate) : null
    const current = parseInt(form.currentScore) || 0
    const target = parseInt(form.targetScore) || 1600

    const daysUntilExam = exam ? Math.ceil((exam - today) / 86400000) : 0
    const daysFromStart = (start && exam) ? Math.ceil((exam - start) / 86400000) : 0
    const scoreGap = Math.max(0, target - current)

    const examPassed = daysUntilExam <= 0
    let dailyTotal = 0, dailyMath = 0, dailyRW = 0, dailyRedo = 0

    if (!examPassed && daysUntilExam > 0 && scoreGap > 0) {
      // ~10 questions per score point per 100 days baseline
      const rawDaily = Math.ceil((scoreGap / 400) * 20 * (100 / Math.max(daysUntilExam, 1)) * daysUntilExam / daysUntilExam)
      dailyTotal = Math.min(Math.max(Math.ceil(scoreGap * 0.05 + (100 / Math.max(daysUntilExam, 1)) * 5), 10), 60)
      dailyMath = Math.round(dailyTotal * 0.45)
      dailyRW = dailyTotal - dailyMath
      dailyRedo = Math.max(2, Math.round(dailyTotal * 0.15))
    } else if (!examPassed && daysUntilExam > 0 && scoreGap === 0) {
      dailyTotal = 10
      dailyMath = 5
      dailyRW = 5
      dailyRedo = 2
    }

    return { daysUntilExam, daysFromStart, scoreGap, dailyTotal, dailyMath, dailyRW, dailyRedo, examPassed }
  }, [form])

  const stats = calc()
  const currentScore = parseInt(form.currentScore) || 0
  const targetScore = parseInt(form.targetScore) || 1600
  const scorePct = targetScore > 0 ? Math.min(100, Math.round((currentScore / targetScore) * 100)) : 0

  const handleChange = (e) => {
    setSaved(false)
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const persistPlan = async (overrides = {}) => {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/study-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        studentName: form.studentName,
        startDate: form.startDate || new Date().toISOString().slice(0, 10),
        examDate: form.examDate,
        currentScore: parseInt(form.currentScore) || 0,
        targetScore: parseInt(form.targetScore) || 1600,
        weakTopics,
        dailyPlan,
        ...overrides
      })
    })
    return res
  }

  const handleSave = async () => {
    if (!form.examDate) return
    setSaving(true)
    try {
      const res = await persistPlan()
      if (res.ok) setSaved(true)
    } catch {}
    setSaving(false)
  }

  // Generate a personalized plan from the student's latest test results,
  // then persist it (weakTopics + dailyPlan) via the existing save endpoint.
  const handleGenerate = async () => {
    if (!form.examDate) {
      setGenError('Please enter your exam date first.')
      return
    }
    setGenerating(true)
    setGenError('')
    setSaved(false)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/study-plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ examDate: form.examDate })
      })
      if (res.ok) {
        const data = await res.json()
        const newWeak = Array.isArray(data?.weakTopics) ? data.weakTopics : []
        const newDaily = Array.isArray(data?.dailyPlan) ? data.dailyPlan : []
        setWeakTopics(newWeak)
        setDailyPlan(newDaily)
        // Persist alongside the rest of the form via the whitelisted POST.
        const saveRes = await persistPlan({ weakTopics: newWeak, dailyPlan: newDaily })
        if (saveRes.ok) setSaved(true)
      } else {
        let msg = 'Could not generate a plan from your results.'
        if (res.status === 404) msg = 'No completed tests found yet. Take a test first, then generate your plan.'
        else if (res.status === 401) msg = 'Your session expired. Please log in again.'
        setGenError(msg)
      }
    } catch {
      setGenError('Something went wrong while generating your plan.')
    }
    setGenerating(false)
  }

  const formatDay = (d) => {
    if (!d) return '—'
    try {
      return new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    } catch {
      return '—'
    }
  }

  const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
  const labelClass = "mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700"

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-7 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 right-32 h-44 w-44 rounded-full bg-violet-300/20 blur-2xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-100"><FiCalendar className="h-4 w-4" /> Study Plan</p>
              <h1 className="mt-1.5 text-2xl font-extrabold lg:text-3xl">
                {form.studentName ? `${form.studentName.split(' ')[0]}'s DSAT Plan` : 'My DSAT Study Plan'}
              </h1>
              <p className="mt-1.5 max-w-md text-sm text-indigo-100">Your daily targets calculate automatically — personalized to hit your goal.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <HeroPill icon={<FiAward className="h-3.5 w-3.5" />} label="Target" value={form.targetScore || '1600'} />
              <HeroPill icon={<FiClock className="h-3.5 w-3.5" />} label="Days Left" value={form.examDate ? (stats.examPassed ? 'Past' : stats.daysUntilExam) : '—'} />
              <HeroPill icon={<FiEdit3 className="h-3.5 w-3.5" />} label="Daily Qs" value={stats.dailyTotal || '—'} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Input Form */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm lg:col-span-1">
            <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
              <FiEdit3 className="h-4 w-4 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Your Details</h2>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className={labelClass}><FiUser className="h-4 w-4 text-slate-400" /> Student Name</label>
                <input name="studentName" value={form.studentName} onChange={handleChange} placeholder="Enter your name" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}><FiCalendar className="h-4 w-4 text-slate-400" /> Start Date</label>
                <input type="date" name="startDate" value={form.startDate} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}><FiTarget className="h-4 w-4 text-slate-400" /> Exam Date</label>
                <input type="date" name="examDate" value={form.examDate} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}><FiBarChart2 className="h-4 w-4 text-slate-400" /> Current SAT Score</label>
                <input type="number" name="currentScore" value={form.currentScore} onChange={handleChange} placeholder="e.g. 1100" min="400" max="1600" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}><FiAward className="h-4 w-4 text-slate-400" /> Target Score</label>
                <input type="number" name="targetScore" value={form.targetScore} onChange={handleChange} placeholder="1600" min="400" max="1600" className={inputClass} />
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !form.examDate}
                className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
                  saved
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-indigo-600 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50'
                }`}
              >
                {saving ? (
                  <><FiRefreshCw className="h-4 w-4 animate-spin" /> Saving…</>
                ) : saved ? (
                  <><FiCheckCircle className="h-4 w-4" /> Plan Saved!</>
                ) : (
                  <><FiSave className="h-4 w-4" /> Save My Study Plan</>
                )}
              </button>

              <button
                onClick={handleGenerate}
                disabled={generating || !form.examDate}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-700 hover:to-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating ? (
                  <><FiRefreshCw className="h-4 w-4 animate-spin" /> Analyzing your results…</>
                ) : (
                  <><FiCpu className="h-4 w-4" /> Generate from my results</>
                )}
              </button>
              <p className="-mt-1 text-center text-xs text-slate-400">
                Builds a day-by-day plan from your latest test, targeting your weakest topics.
              </p>
              {genError && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-600">
                  <FiAlertCircle className="h-4 w-4 flex-shrink-0" />
                  {genError}
                </div>
              )}
            </div>
          </div>

          {/* Visual plan */}
          <div className="space-y-6 lg:col-span-2">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {/* Score ring */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm">
                <CircularProgress percent={form.currentScore ? scorePct : 0} />
                <p className="mt-3 text-sm font-bold text-slate-800">Score Progress</p>
                <p className="text-xs text-slate-400">{form.currentScore ? `${currentScore} / ${targetScore}` : 'Enter your current score'}</p>
                {form.currentScore ? (
                  <p className="mt-1 text-xs font-semibold text-amber-600">
                    {stats.scoreGap > 0 ? `${stats.scoreGap} pts to target` : '🎉 Target reached!'}
                  </p>
                ) : null}
              </div>

              {/* Daily breakdown tiles */}
              <div className="grid grid-cols-2 gap-4 sm:col-span-2">
                <PlanTile icon={<FiEdit3 className="h-4 w-4" />} label="Questions / day" value={stats.dailyTotal || '—'} chip="bg-violet-500" big />
                <PlanTile icon={<FiZap className="h-4 w-4" />} label="Math / day" value={stats.dailyMath || '—'} chip="bg-indigo-500" />
                <PlanTile icon={<FiBookOpen className="h-4 w-4" />} label="Reading & Writing / day" value={stats.dailyRW || '—'} chip="bg-emerald-500" />
                <PlanTile icon={<FiRefreshCw className="h-4 w-4" />} label="Redo / day" value={stats.dailyRedo || '—'} chip="bg-rose-500" />
              </div>
            </div>

            {/* Plan overview */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-slate-900"><FiActivity className="h-4 w-4 text-indigo-600" /> Plan Overview</h2>
              <p className="mb-2 text-xs text-slate-400">Updates as you fill in your details</p>
              <StatRow icon={<FiCalendar className="h-4 w-4 text-slate-400" />} label="Days Until Exam" value={form.examDate ? stats.daysUntilExam : '—'} color={stats.daysUntilExam < 0 ? 'text-rose-500' : 'text-indigo-600'} />
              <StatRow icon={<FiClock className="h-4 w-4 text-slate-400" />} label="Days from Start to Exam" value={form.startDate && form.examDate ? stats.daysFromStart : '—'} color="text-indigo-600" />
              <StatRow icon={<FiTrendingUp className="h-4 w-4 text-slate-400" />} label="Score Gap to Close" value={form.currentScore ? stats.scoreGap : '—'} color="text-amber-600" />

              {stats.examPassed && form.examDate && (
                <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-600">
                  <FiAlertTriangle className="h-4 w-4" /> Exam date has passed!
                </div>
              )}
              {stats.scoreGap === 0 && form.currentScore && !stats.examPassed && (
                <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                  <FiCheckCircle className="h-4 w-4" /> You've already hit your target score!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Goal Banner */}
        {form.examDate && !stats.examPassed && (
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-center text-white shadow-sm">
            <p className="mb-1 flex items-center justify-center gap-1.5 text-sm font-medium opacity-90">
              <FiTarget className="h-4 w-4" /> Your Goal
            </p>
            <p className="text-lg font-bold">
              → {form.targetScore || 1600} &nbsp;|&nbsp; Days Left: {stats.daysUntilExam} &nbsp;|&nbsp; Daily Q Target: {stats.dailyTotal || '—'} questions
            </p>
          </div>
        )}

        {/* Subject breakdown */}
        {stats.dailyTotal > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SubjectCard
              icon={<FiZap className="h-5 w-5" />}
              subject="Math"
              daily={stats.dailyMath}
              color="indigo"
              tips={['Algebra & Linear Equations', 'Advanced Math', 'Problem Solving & Data']}
            />
            <SubjectCard
              icon={<FiBookOpen className="h-5 w-5" />}
              subject="Reading & Writing"
              daily={stats.dailyRW}
              color="emerald"
              tips={['Information & Ideas', 'Craft & Structure', 'Standard English Conventions', 'Expression of Ideas']}
            />
          </div>
        )}

        {/* Personalized Plan from Results */}
        {(weakTopics.length > 0 || dailyPlan.length > 0) && (
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <FiCpu className="h-4 w-4 text-violet-600" />
                Personalized Plan <span className="font-normal text-slate-400">(from your results)</span>
              </h2>
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                {dailyPlan.length} day{dailyPlan.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <FiTarget className="h-4 w-4 text-rose-500" /> Topics to focus on
                </h3>
                {weakTopics.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {weakTopics.map((t, i) => (
                      <span key={i} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600">{t}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No weak topics detected — great job! Keep practicing a mix of topics.</p>
                )}
              </div>

              {dailyPlan.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <FiCalendar className="h-4 w-4 text-indigo-600" /> Day-by-day plan
                  </h3>
                  <div className="max-h-96 space-y-2.5 overflow-y-auto pr-1">
                    {dailyPlan.map((d, i) => (
                      <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-3 transition-colors hover:bg-indigo-50/50">
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-slate-800">{d.topic || 'General'}</p>
                            <span className="flex-shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">{d.questionCount ?? 0} Qs</span>
                          </div>
                          <p className="text-xs text-slate-400">{formatDay(d.date)} · {d.difficultyMix || 'Mixed'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-amber-800">
            <FiZap className="h-4 w-4" /> Study Tips
          </h3>
          <ul className="space-y-2 text-sm text-amber-700">
            <li className="flex items-start gap-2"><FiCheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" /> Check My Study Plan for today's target. Split your practice between Math and Reading & Writing as recommended.</li>
            <li className="flex items-start gap-2"><FiCheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" /> Use questions from <span className="font-semibold">dsatguru.com</span> for targeted practice.</li>
            <li className="flex items-start gap-2"><FiCheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" /> Remember: <span className="font-semibold">quality over quantity</span> — understand every answer, not just the result.</li>
            <li className="flex items-start gap-2"><FiCheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" /> Redo {stats.dailyRedo || '2–3'} previously wrong questions daily to reinforce weak areas.</li>
            <li className="flex items-start gap-2"><FiCheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" /> Take a full-length practice test every 2 weeks to track your progress.</li>
          </ul>
        </div>

      </div>
    </div>
  )
}

function HeroPill({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-3 text-center backdrop-blur-sm">
      <div className="mb-1 flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-100">{icon} {label}</div>
      <div className="text-xl font-extrabold">{value}</div>
    </div>
  )
}

function CircularProgress({ percent = 0 }) {
  const pct = Math.min(100, Math.max(0, percent))
  const r = 52
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  return (
    <div className="relative h-32 w-32">
      <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="url(#sp-grad)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} className="transition-all duration-700" />
        <defs>
          <linearGradient id="sp-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-slate-900">{pct}%</span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">of target</span>
      </div>
    </div>
  )
}

function PlanTile({ icon, label, value, chip, big }) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-transform hover:-translate-y-0.5 ${big ? 'ring-1 ring-violet-100' : ''}`}>
      <div className="flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${chip} text-white`}>{icon}</span>
        <span className={`font-extrabold text-slate-900 ${big ? 'text-3xl' : 'text-2xl'}`}>{value}</span>
      </div>
      <p className="mt-2 text-xs font-medium text-slate-500">{label}</p>
    </div>
  )
}

function StatRow({ icon, label, value, color, bold }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 py-2 last:border-0">
      <span className="flex items-center gap-2 text-sm text-slate-600">{icon} {label}</span>
      <span className={`text-sm ${bold ? 'font-bold' : 'font-semibold'} ${color}`}>{value}</span>
    </div>
  )
}

function SubjectCard({ icon, subject, daily, color, tips }) {
  const colors = {
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-700', chip: 'bg-indigo-600', badge: 'bg-indigo-600' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', chip: 'bg-emerald-600', badge: 'bg-emerald-600' },
    violet: { bg: 'bg-violet-50', border: 'border-violet-100', text: 'text-violet-700', chip: 'bg-violet-600', badge: 'bg-violet-600' }
  }
  const c = colors[color] || colors.indigo

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-5`}>
      <div className="mb-3 flex items-center justify-between">
        <span className={`flex items-center gap-2 text-sm font-bold ${c.text}`}>
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.chip} text-white`}>{icon}</span>
          {subject}
        </span>
        <span className={`rounded-full ${c.badge} px-2.5 py-1 text-xs font-bold text-white`}>{daily}/day</span>
      </div>
      <ul className="space-y-1">
        {tips.map((t, i) => (
          <li key={i} className={`text-xs ${c.text} opacity-80`}>• {t}</li>
        ))}
      </ul>
    </div>
  )
}
