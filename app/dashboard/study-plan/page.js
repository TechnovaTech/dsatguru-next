'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../components/AuthContext'

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

  const handleChange = (e) => {
    setSaved(false)
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSave = async () => {
    if (!form.examDate) return
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          studentName: form.studentName,
          startDate: form.startDate || new Date().toISOString().slice(0, 10),
          examDate: form.examDate,
          currentScore: parseInt(form.currentScore) || 0,
          targetScore: parseInt(form.targetScore) || 1600
        })
      })
      if (res.ok) setSaved(true)
    } catch {}
    setSaving(false)
  }

  const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 text-sm"
  const labelClass = "flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5"

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-semibold mb-3">
            📅 MY DSAT STUDY PLAN
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Personalized to Hit 1600</h1>
          <p className="text-gray-500 mt-1 text-sm">Fill in your details below — your daily targets will calculate automatically!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Input Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-800 border-b pb-3">✏️ Your Details</h2>

            <div>
              <label className={labelClass}>👤 Student Name</label>
              <input name="studentName" value={form.studentName} onChange={handleChange} placeholder="Enter your name" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>📅 Start Date</label>
              <input type="date" name="startDate" value={form.startDate} onChange={handleChange} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>🎯 Exam Date</label>
              <input type="date" name="examDate" value={form.examDate} onChange={handleChange} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>📊 Current SAT Score</label>
              <input type="number" name="currentScore" value={form.currentScore} onChange={handleChange} placeholder="e.g. 1100" min="400" max="1600" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>🏆 Target Score</label>
              <input type="number" name="targetScore" value={form.targetScore} onChange={handleChange} placeholder="1600" min="400" max="1600" className={inputClass} />
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !form.examDate}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                saved
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {saving ? '💾 Saving...' : saved ? '✅ Plan Saved!' : '💾 Save My Study Plan'}
            </button>
          </div>

          {/* Auto-Calculated Plan */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
            <h2 className="text-base font-bold text-gray-800 border-b pb-3">📊 AUTO-CALCULATED PLAN</h2>
            <p className="text-xs text-gray-400 -mt-1">Updates when you fill in your details</p>

            <StatRow emoji="📆" label="Days Until Exam" value={form.examDate ? stats.daysUntilExam : '—'} color={stats.daysUntilExam < 0 ? 'text-red-500' : 'text-blue-600'} />
            <StatRow emoji="📆" label="Days Remaining from Start" value={form.startDate && form.examDate ? stats.daysFromStart : '—'} color="text-blue-600" />
            <StatRow emoji="📈" label="Score Gap to Close" value={form.currentScore ? stats.scoreGap : '—'} color="text-orange-500" />

            <div className="border-t pt-3 space-y-3">
              {stats.examPassed ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center text-red-600 text-sm font-semibold">
                  ⚠️ Exam date has passed!
                </div>
              ) : stats.scoreGap === 0 && form.currentScore ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center text-green-700 text-sm font-semibold">
                  🎉 You've already hit your target score!
                </div>
              ) : null}

              <StatRow emoji="📝" label="Daily Questions Needed" value={stats.dailyTotal || '—'} color="text-purple-600" bold />
              <StatRow emoji="⚡" label="Daily Math Questions" value={stats.dailyMath || '—'} color="text-blue-600" />
              <StatRow emoji="📖" label="Daily Reading & Writing Questions" value={stats.dailyRW || '—'} color="text-green-600" />
              <StatRow emoji="🔁" label="Redo Questions / Day" value={stats.dailyRedo || '—'} color="text-red-500" />
            </div>
          </div>
        </div>

        {/* Goal Banner */}
        {form.examDate && !stats.examPassed && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-5 text-center shadow-md">
            <p className="text-sm font-medium opacity-90 mb-1">🎯 YOUR GOAL</p>
            <p className="text-lg font-bold">
              → {form.targetScore || 1600} &nbsp;|&nbsp; Days Left: {stats.daysUntilExam} &nbsp;|&nbsp; Daily Q Target: {stats.dailyTotal || '—'} questions
            </p>
          </div>
        )}

        {/* Breakdown Cards */}
        {stats.dailyTotal > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SubjectCard
              emoji="⚡"
              subject="Math"
              daily={stats.dailyMath}
              color="blue"
              tips={['Algebra & Linear Equations', 'Advanced Math', 'Problem Solving & Data']}
            />
            <SubjectCard
              emoji="📖"
              subject="Reading & Writing"
              daily={stats.dailyRW}
              color="green"
              tips={['Information & Ideas', 'Craft & Structure', 'Standard English Conventions', 'Expression of Ideas']}
            />
          </div>
        )}

        {/* Tips */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="font-bold text-amber-800 mb-3">💡 Study Tips</h3>
          <ul className="space-y-2 text-sm text-amber-700">
            <li>✅ Check 📅 My Study Plan for today's target. Split your practice between Math and Reading & Writing as recommended.</li>
            <li>✅ Use questions from <span className="font-semibold">dsatguru.com</span> for targeted practice.</li>
            <li>✅ Remember: <span className="font-semibold">quality over quantity</span> — understand every answer, not just the result.</li>
            <li>✅ Redo {stats.dailyRedo || '2–3'} previously wrong questions daily to reinforce weak areas.</li>
            <li>✅ Take a full-length practice test every 2 weeks to track your progress.</li>
          </ul>
        </div>

      </div>
    </div>
  )
}

function StatRow({ emoji, label, value, color, bold }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-600">{emoji} {label}</span>
      <span className={`text-sm font-${bold ? 'bold' : 'semibold'} ${color}`}>{value}</span>
    </div>
  )
}

function SubjectCard({ emoji, subject, daily, color, tips }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700 bg-blue-600',
    green: 'bg-green-50 border-green-200 text-green-700 bg-green-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-700 bg-purple-600'
  }
  const [bg, border, text, badge] = colors[color].split(' ')

  return (
    <div className={`${bg} ${border} border rounded-2xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-sm font-bold ${text}`}>{emoji} {subject}</span>
        <span className={`${badge} text-white text-xs font-bold px-2.5 py-1 rounded-full`}>{daily}/day</span>
      </div>
      <ul className="space-y-1">
        {tips.map((t, i) => (
          <li key={i} className={`text-xs ${text} opacity-80`}>• {t}</li>
        ))}
      </ul>
    </div>
  )
}
