'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { FiCalendar, FiCheckCircle, FiList, FiTarget, FiTrendingUp, FiSave, FiCheck, FiAlertCircle, FiArrowRight, FiPlus, FiMinus, FiChevronDown } from 'react-icons/fi'

function getStatus(total, target) {
  if (total === 0) return { label: '—', badge: 'bg-slate-100 text-slate-500' }
  if (total >= target) return { label: 'On Track', badge: 'bg-emerald-100 text-emerald-700' }
  if (total >= target * 0.7) return { label: 'At Risk', badge: 'bg-amber-100 text-amber-700' }
  return { label: 'Behind', badge: 'bg-rose-100 text-rose-700' }
}

export default function StudentDailyTracker() {
  const [rows, setRows] = useState([])
  const [target, setTarget] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [noPlan, setNoPlan] = useState(false)
  const [dateRange, setDateRange] = useState({ startDate: null, examDate: null })
  const [testSessions, setTestSessions] = useState([])
  const [showFullLog, setShowFullLog] = useState(false)
  const saveTimer = useRef(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

        // 1. Fetch Study Plan for Target Calculation
        const planRes = await fetch('/api/study-plan', { headers })
        let calculatedTarget = 20
        let planData = null
        if (planRes.ok) {
          planData = await planRes.json()
          if (planData) {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const exam = planData.examDate ? new Date(planData.examDate) : today
            const current = planData.currentScore || 0
            const targetScore = planData.targetScore || 1600
            const daysUntilExam = Math.ceil((exam - today) / 86400000)
            const scoreGap = Math.max(0, targetScore - current)
            
            if (daysUntilExam > 0 && scoreGap > 0) {
              calculatedTarget = Math.min(Math.max(Math.ceil(scoreGap * 0.05 + (100 / Math.max(daysUntilExam, 1)) * 5), 10), 60)
            } else if (daysUntilExam > 0) {
              calculatedTarget = 10
            }
          }
        }

        // 2. Fetch Test Sessions for Admin Tests
        const sessionsRes = await fetch('/api/test-sessions', { headers })
        let adminSessions = []
        if (sessionsRes.ok) {
          const data = await sessionsRes.json()
          const sessions = data.sessions || data || []
          // Include all Admin tests (Assigned, InProgress, Completed)
          adminSessions = sessions.filter(s => s.testId?.practiceMode === 'admin')
          setTestSessions(adminSessions)
        }

        // 3. Fetch Error Logs for Redo (count only successful redo)
        const errorLogRes = await fetch('/api/error-log', { headers })
        let solvedRedoLogs = []
        if (errorLogRes.ok) {
          const data = await errorLogRes.json()
          const logs = data.logs || []
          solvedRedoLogs = logs.filter(log =>
            log.redoResult === '✓' &&
            log.date &&
            (log.section === 'Math' || log.section === 'Reading & Writing')
          )
        }

        // 4. Fetch Tracker Rows
        const trackerRes = await fetch('/api/daily-tracker', { headers })
        if (trackerRes.ok) {
          const data = await trackerRes.json()
          if (data.noPlan) { setNoPlan(true); return }
          
          // Merge manual rows with test session data
          const mergedRows = data.rows.map(row => {
            // Find admin tests for this date
            // Row date is in format "11-Apr"
            const rowDateParts = row.date.split('-')
            const rowDay = parseInt(rowDateParts[0])
            const rowMonth = rowDateParts[1]
            
            const sessionsOnDate = adminSessions.filter(s => {
              // Match by completion date if completed, otherwise by creation (assignment) date
              const sDate = new Date(s.completedAt || s.createdAt || s.updatedAt)
              const sDay = sDate.getDate()
              const sMonth = sDate.toLocaleDateString('en-GB', { month: 'short' })
              return sDay === rowDay && sMonth === rowMonth
            })

            // Count solved redo questions on the same date row (from Error Log)
            const redoOnDate = solvedRedoLogs.filter(log => {
              const parts = String(log.date).split(' ')
              if (parts.length < 2) return false
              const d = parseInt(parts[0], 10)
              const m = parts[1]
              return d === rowDay && m === rowMonth
            })

            const redoMathSolved = redoOnDate.filter(log => log.section === 'Math').length
            const redoRWSolved = redoOnDate.filter(log => log.section === 'Reading & Writing').length

            // Calculate correct answers for Math admin tests
            const mathTotal = sessionsOnDate
              .filter(s => s.testId?.subject === 'Math' || (!s.testId?.subject && s.testId?.sections?.math === true))
              .reduce((sum, s) => {
                const correctCount = s.responses?.filter(r => r.isCorrect).length || 0
                return sum + Math.max(s.correctAnswers || 0, correctCount)
              }, 0) + redoMathSolved
            
            // Calculate correct answers for RW admin tests
            const rwTotal = sessionsOnDate
              .filter(s => 
                s.testId?.subject === 'Reading and Writing' || 
                s.testId?.subject === 'Reading & Writing' || 
                (!s.testId?.subject && s.testId?.sections?.rw === true)
              )
              .reduce((sum, s) => {
                const correctCount = s.responses?.filter(r => r.isCorrect).length || 0
                return sum + Math.max(s.correctAnswers || 0, correctCount)
              }, 0) + redoRWSolved

            return {
              ...row,
              math: Math.max(parseInt(row.math) || 0, mathTotal),
              reading: Math.max(parseInt(row.reading) || 0, rwTotal)
            }
          })

          setRows(mergedRows)
          setTarget(calculatedTarget)
          if (data.startDate) setDateRange({ startDate: data.startDate, examDate: data.examDate })
        } else {
          setError("Couldn't load your daily tracker.")
        }
      } catch (err) {
        console.error('Failed to fetch data', err)
        setError("Couldn't load your daily tracker.")
      } finally {
        setLoading(false)
      }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const autoSave = useCallback((newRows, newTarget, immediate = false) => {
    clearTimeout(saveTimer.current)
    
    const doSave = async () => {
      setSaving(true)
      try {
        const token = localStorage.getItem('token')
        await fetch('/api/daily-tracker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ rows: newRows, target: newTarget })
        })
        setSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch (err) {
        console.error('Save failed', err)
        setSaving(false)
      }
    }

    if (immediate) {
      doSave()
    } else {
      saveTimer.current = setTimeout(doSave, 800)
    }
  }, [])

  const update = useCallback((idx, field, value, immediate = false) => {
    setRows(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      autoSave(next, target, immediate)
      return next
    })
  }, [target, autoSave])

  // Stepper for the mobile Today card — computes inside the functional
  // updater so rapid taps never lose a count. Reuses the shared autoSave.
  const bump = useCallback((idx, field, delta) => {
    setRows(prev => {
      const next = [...prev]
      const cur = parseInt(next[idx]?.[field]) || 0
      next[idx] = { ...next[idx], [field]: Math.max(0, cur + delta) }
      autoSave(next, target, true)
      return next
    })
  }, [target, autoSave])

  const updateTarget = (val, immediate = false) => {
    const t = Math.max(1, parseInt(val) || 1)
    setTarget(t)
    autoSave(rows, t, immediate)
  }

  let running = 0
  const computed = rows.map(r => {
    const math = parseInt(r.math) || 0
    const reading = (parseInt(r.reading) || 0) + (parseInt(r.writing) || 0)
    const writing = 0
    const total = math + reading
    running += total
    return { ...r, math, reading, writing, total, running }
  })

  const totalDone = computed.reduce((s, r) => s + r.total, 0)
  const daysWithData = computed.filter(r => r.total > 0).length
  const onTrackDays = computed.filter(r => r.total > 0 && r.total >= target).length

  // Locate today's row for the mobile quick-log card. Row dates are "DD-MMM"
  // (e.g. "09-Jul"); match the same way the session merge above does.
  const now = new Date()
  const todayDay = now.getDate()
  const todayMonthShort = now.toLocaleDateString('en-GB', { month: 'short' })
  const todayLabel = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  const todayIdx = computed.findIndex(r => {
    const parts = String(r.date).split('-')
    return parseInt(parts[0], 10) === todayDay && parts[1] === todayMonthShort
  })
  const todayRow = todayIdx >= 0 ? computed[todayIdx] : null
  const todayStatus = todayRow ? getStatus(todayRow.total, target) : null

  if (loading) return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">
            <FiAlertCircle className="h-5 w-5 shrink-0" /> {error} Please try again.
          </span>
          <button
            onClick={fetchData}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  )

  if (noPlan) return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white px-6 py-20 text-center shadow-sm">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <FiCalendar className="h-6 w-6" />
          </span>
          <h2 className="text-lg font-bold text-slate-900">No Study Plan Found</h2>
          <p className="mt-1 max-w-md text-sm text-slate-500">Please create a study plan first to use the Daily Tracker.</p>
          <a
            href="/dashboard/study-plan"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            Go to Study Plan <FiArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  )

  const stats = [
    { label: 'Total Done', value: totalDone, icon: FiTrendingUp, chip: 'bg-indigo-500' },
    { label: 'Days Logged', value: daysWithData, icon: FiList, chip: 'bg-violet-500' },
    { label: 'On Track Days', value: onTrackDays, icon: FiCheckCircle, chip: 'bg-emerald-500' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <FiCalendar className="h-5 w-5" />
              </span>
              Daily Practice Tracker
            </h1>
            <p className="mt-1 text-sm text-slate-500">Log Math &amp; Reading/Writing questions daily. Auto-saves as you type.</p>
            {dateRange.startDate && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
                <FiCalendar className="h-3.5 w-3.5" />
                {new Date(dateRange.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                <FiArrowRight className="h-3 w-3" />
                Exam: {dateRange.examDate ? new Date(dateRange.examDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} ({rows.length} days)
              </p>
            )}
          </div>
          {(saving || saved) && (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${saving ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {saving ? <><FiSave className="h-3.5 w-3.5" /> Saving…</> : <><FiCheck className="h-3.5 w-3.5" /> Saved</>}
            </span>
          )}
        </div>

        {/* Mobile-first "Today" quick-log card — hidden on desktop where the table is easy to use */}
        <div className="mb-6 md:hidden">
          {todayRow ? (
            <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Today · {todayRow.date}</p>
                  <h2 className="text-lg font-bold text-slate-900">Log today&apos;s practice</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Count the questions you finished today.</p>
                </div>
                {todayStatus && (
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${todayStatus.badge}`}>{todayStatus.label}</span>
                )}
              </div>

              {/* Math */}
              <label htmlFor="today-math" className="mb-1.5 block text-sm font-semibold text-slate-700">Math questions</label>
              <div className="mb-4 flex items-stretch gap-2.5">
                <button type="button" aria-label="One less math question" onClick={() => bump(todayIdx, 'math', -1)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 transition-colors active:bg-indigo-100">
                  <FiMinus className="h-5 w-5" />
                </button>
                <input
                  id="today-math"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={rows[todayIdx].math}
                  onChange={e => update(todayIdx, 'math', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && update(todayIdx, 'math', e.target.value, true)}
                  placeholder="0"
                  className="h-12 w-full min-w-0 rounded-xl border border-indigo-100 bg-indigo-50 text-center text-xl font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button type="button" aria-label="One more math question" onClick={() => bump(todayIdx, 'math', 1)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 transition-colors active:bg-indigo-100">
                  <FiPlus className="h-5 w-5" />
                </button>
              </div>

              {/* Reading & Writing */}
              <label htmlFor="today-rw" className="mb-1.5 block text-sm font-semibold text-slate-700">Reading &amp; Writing questions</label>
              <div className="mb-4 flex items-stretch gap-2.5">
                <button type="button" aria-label="One less reading and writing question" onClick={() => bump(todayIdx, 'reading', -1)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 transition-colors active:bg-emerald-100">
                  <FiMinus className="h-5 w-5" />
                </button>
                <input
                  id="today-rw"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={rows[todayIdx].reading}
                  onChange={e => update(todayIdx, 'reading', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && update(todayIdx, 'reading', e.target.value, true)}
                  placeholder="0"
                  className="h-12 w-full min-w-0 rounded-xl border border-emerald-100 bg-emerald-50 text-center text-xl font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
                <button type="button" aria-label="One more reading and writing question" onClick={() => bump(todayIdx, 'reading', 1)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 transition-colors active:bg-emerald-100">
                  <FiPlus className="h-5 w-5" />
                </button>
              </div>

              {/* Today's total vs goal */}
              <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500"><FiTarget className="h-4 w-4 text-amber-500" /> Today&apos;s total</span>
                <span className="text-sm font-bold text-slate-900">{todayRow.total} <span className="font-normal text-slate-400">/ {target} goal</span></span>
              </div>

              <button
                type="button"
                onClick={() => autoSave(rows, target, true)}
                disabled={saving}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-bold text-white transition-colors active:bg-indigo-700 disabled:opacity-70"
              >
                {saving ? <><FiSave className="h-4 w-4" /> Saving…</> : saved ? <><FiCheck className="h-4 w-4" /> Saved!</> : <><FiSave className="h-4 w-4" /> Save today</>}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm">
              <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <FiCalendar className="h-5 w-5" />
              </span>
              <h2 className="text-base font-bold text-slate-900">Today isn&apos;t in your plan yet</h2>
              <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">{todayLabel} falls outside your study plan dates. Open your full log below to review past days, or update your plan.</p>
              <a href="/dashboard/study-plan" className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition-colors active:bg-indigo-700">
                Update study plan <FiArrowRight className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map(s => (
            <div key={s.label} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${s.chip}`}>
                <s.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
              <FiTarget className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <input
                type="number"
                min={1}
                value={target}
                onChange={e => updateTarget(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && updateTarget(e.target.value, true)}
                className="w-20 border-b-2 border-amber-200 bg-transparent text-2xl font-extrabold text-slate-900 focus:border-amber-400 focus:outline-none"
              />
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Daily Target</p>
            </div>
          </div>
        </div>

        {/* Full history — collapsed on phones (quick-log card above handles today), always open on desktop */}
        <button
          type="button"
          onClick={() => setShowFullLog(v => !v)}
          aria-expanded={showFullLog}
          className="mb-3 flex h-12 w-full items-center justify-between rounded-2xl border border-slate-100 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm md:hidden"
        >
          <span className="flex items-center gap-2"><FiList className="h-4 w-4 text-slate-400" /> {showFullLog ? 'Hide full history' : 'Show full history'}</span>
          <FiChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${showFullLog ? 'rotate-180' : ''}`} />
        </button>

        <div className={`${showFullLog ? 'block' : 'hidden'} md:block`}>
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
                <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider">Day</th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider">Date</th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider">Math Done</th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider">Reading &amp; Writing Done</th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider">Total Done</th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider">Daily Target</th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider">On Track?</th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider">Running Total</th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {computed.map((row, idx) => {
                const status = getStatus(row.total, target)
                return (
                  <tr key={idx} className="transition-colors hover:bg-indigo-50/40">
                    <td className="px-4 py-2.5 text-center font-medium text-slate-400">{row.day}</td>
                    <td className="px-4 py-2.5 text-center font-medium text-slate-700">{row.date}</td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min={0}
                        value={rows[idx].math}
                        onChange={e => update(idx, 'math', e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && update(idx, 'math', e.target.value, true)}
                        placeholder="0"
                        className="w-16 rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-1 text-center font-semibold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min={0}
                        value={rows[idx].reading}
                        onChange={e => update(idx, 'reading', e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && update(idx, 'reading', e.target.value, true)}
                        placeholder="0"
                        className="w-20 rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1 text-center font-semibold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold text-slate-900">{row.total || 0}</td>
                    <td className="px-4 py-2.5 text-center text-slate-500">{target}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${status.badge}`}>{status.label}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center font-semibold text-slate-700">{row.running}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={rows[idx].notes}
                        onChange={e => update(idx, 'notes', e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            update(idx, 'notes', e.target.value, true)
                          }
                        }}
                        placeholder="Add note…"
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> On Track — met daily target</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> At Risk — ≥70% of target</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Behind — &lt;70% of target</span>
        </div>
        </div>
      </div>
    </div>
  )
}
