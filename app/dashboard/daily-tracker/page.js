'use client'
import { useState, useCallback, useEffect, useRef } from 'react'

function getStatus(total, target) {
  if (total === 0) return { emoji: '—', label: '—', color: 'text-gray-400' }
  if (total >= target) return { emoji: '🟢', label: 'On Track', color: 'text-green-600' }
  if (total >= target * 0.7) return { emoji: '🟡', label: 'At Risk', color: 'text-yellow-600' }
  return { emoji: '🔴', label: 'Behind', color: 'text-red-600' }
}

export default function StudentDailyTracker() {
  const [rows, setRows] = useState([])
  const [target, setTarget] = useState(20)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [noPlan, setNoPlan] = useState(false)
  const [dateRange, setDateRange] = useState({ startDate: null, examDate: null })
  const [testSessions, setTestSessions] = useState([])
  const saveTimer = useRef(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
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
            const exam = new Date(planData.examDate)
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

        // 3. Fetch Tracker Rows
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

            // Calculate correct answers for Math admin tests
            const mathTotal = sessionsOnDate
              .filter(s => s.testId?.subject === 'Math' || (!s.testId?.subject && s.testId?.sections?.math === true))
              .reduce((sum, s) => {
                const correctCount = s.responses?.filter(r => r.isCorrect).length || 0
                return sum + Math.max(s.correctAnswers || 0, correctCount)
              }, 0)
            
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
              }, 0)

            return {
              ...row,
              math: Math.max(parseInt(row.math) || 0, mathTotal),
              reading: Math.max(parseInt(row.reading) || 0, rwTotal)
            }
          })

          setRows(mergedRows)
          setTarget(calculatedTarget)
          if (data.startDate) setDateRange({ startDate: data.startDate, examDate: data.examDate })
        }
      } catch (err) {
        console.error('Failed to fetch data', err)
      } finally {
        setLoading(false)
      }
    }

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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading tracker...</div>

  if (noPlan) return (
    <div className="p-8 text-center">
      <p className="text-xl font-semibold text-gray-700 mb-2">No Study Plan Found</p>
      <p className="text-gray-500 mb-4">Please create a study plan first to use the Daily Tracker.</p>
      <a href="/dashboard/study-plan" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Go to Study Plan</a>
    </div>
  )

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📅 Daily Practice Tracker</h1>
          <p className="text-gray-500 mt-1 text-sm">Log Math &amp; Reading/Writing questions daily. Auto-saves as you type.</p>
          {dateRange.startDate && (
            <p className="text-xs text-blue-500 mt-1">
              📆 {new Date(dateRange.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} → Exam: {new Date(dateRange.examDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ({rows.length} days)
            </p>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {saving ? '💾 Saving...' : saved ? '✅ Saved' : ''}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Done</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{totalDone}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Days Logged</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{daysWithData}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">On Track Days</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{onTrackDays}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border flex flex-col gap-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Daily Target</p>
          <input
            type="number"
            min={1}
            value={target}
            onChange={e => updateTarget(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && updateTarget(e.target.value, true)}
            className="text-2xl font-bold text-orange-500 w-20 border-b border-orange-300 focus:outline-none bg-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="px-3 py-3 text-center font-semibold w-12">Day</th>
              <th className="px-3 py-3 text-center font-semibold w-24">Date</th>
              <th className="px-3 py-3 text-center font-semibold w-24">Math<br/><span className="font-normal text-gray-300 text-xs">Done</span></th>
              <th className="px-3 py-3 text-center font-semibold w-32">Reading &amp; Writing<br/><span className="font-normal text-gray-300 text-xs">Done</span></th>
              <th className="px-3 py-3 text-center font-semibold w-24">Total<br/><span className="font-normal text-gray-300 text-xs">Done</span></th>
              <th className="px-3 py-3 text-center font-semibold w-24">Daily<br/><span className="font-normal text-gray-300 text-xs">Target</span></th>
              <th className="px-3 py-3 text-center font-semibold w-32">On Track?</th>
              <th className="px-3 py-3 text-center font-semibold w-28">Running<br/><span className="font-normal text-gray-300 text-xs">Total</span></th>
              <th className="px-3 py-3 text-center font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {computed.map((row, idx) => {
              const status = getStatus(row.total, target)
              const isEven = idx % 2 === 0
              return (
                <tr key={idx} className={`border-b transition-colors hover:bg-blue-50 ${isEven ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-3 py-2 text-center text-gray-500 font-medium">{row.day}</td>
                  <td className="px-3 py-2 text-center text-gray-700 font-medium">{row.date}</td>
                  <td className="px-2 py-1 text-center">
                    <input 
                      type="number" 
                      min={0} 
                      value={rows[idx].math} 
                      onChange={e => update(idx, 'math', e.target.value)} 
                      onKeyDown={e => e.key === 'Enter' && update(idx, 'math', e.target.value, true)}
                      placeholder="0"
                      className="w-16 text-center border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-blue-50 text-blue-700 font-semibold" 
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <input 
                      type="number" 
                      min={0} 
                      value={rows[idx].reading} 
                      onChange={e => update(idx, 'reading', e.target.value)} 
                      onKeyDown={e => e.key === 'Enter' && update(idx, 'reading', e.target.value, true)}
                      placeholder="0"
                      className="w-20 text-center border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-300 bg-green-50 text-green-700 font-semibold" 
                    />
                  </td>
                  <td className="px-3 py-2 text-center font-bold text-gray-800">{row.total || 0}</td>
                  <td className="px-3 py-2 text-center text-gray-500">{target}</td>
                  <td className={`px-3 py-2 text-center font-semibold ${status.color}`}>{status.emoji} {status.label}</td>
                  <td className="px-3 py-2 text-center font-semibold text-gray-700">{row.running}</td>
                  <td className="px-2 py-1">
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
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-gray-300 text-gray-600" 
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex gap-6 text-sm text-gray-500">
        <span>🟢 On Track — met daily target</span>
        <span>🟡 At Risk — ≥70% of target</span>
        <span>🔴 Behind — &lt;70% of target</span>
      </div>
    </div>
  )
}
