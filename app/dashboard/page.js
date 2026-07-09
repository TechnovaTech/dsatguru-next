'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthContext'
import { useRouter } from 'next/navigation'
import { FiBook, FiClock, FiTarget, FiTrendingUp, FiBookmark, FiVideo, FiMessageSquare, FiPlay, FiUsers, FiExternalLink, FiEdit, FiDatabase, FiCalendar, FiActivity, FiBarChart, FiBell, FiAward, FiGrid } from 'react-icons/fi'
import { FaCalculator } from 'react-icons/fa'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [enrolledCourses, setEnrolledCourses] = useState([])
  const [enrolledQuestionBanks, setEnrolledQuestionBanks] = useState([])
  const [stats, setStats] = useState({
    totalAttempted: 0,
    correctAnswers: 0,
    accuracy: 0,
    studyHours: 0,
    latestScores: { math: null, rw: null }
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [bookmarks, setBookmarks] = useState([])
  const [testCounts, setTestCounts] = useState({ rw: 0, math: 0, module: 0, admin: 0, adaptive: 0 })
  const [performanceData, setPerformanceData] = useState([])
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        const res = await fetch('/api/messages', { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          const total = (data.conversations || []).reduce((sum, c) => sum + (c.unread || 0), 0)
          setUnreadMessages(total)
        }
      } catch {}
    }
    fetchUnread()
  }, [])

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchDashboardData()
  }, [user])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('token')
      const [enrollmentsRes, sessionsRes, analyticsRes] = await Promise.all([
        axios.get('/api/enrollment', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        axios.get('/api/test-sessions', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        axios.get('/api/user-results/analytics', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      ])

      // Process Enrollments
      const enrollments = enrollmentsRes.data.enrollments || enrollmentsRes.data.data || []
      const enrolledOnlyCourses = enrollments
        .map(e => e.courseId)
        .filter(c => c && c.type === 'course')
        .map(c => ({
          id: c._id || c.id,
          title: c.title,
          description: c.description,
          type: c.type
        }))
      setEnrolledCourses(enrolledOnlyCourses)

      // Process Stats from Analytics API
      const analyticsData = analyticsRes.data
      setStats({
        totalAttempted: analyticsData.totalQuestions || 0,
        correctAnswers: analyticsData.correctAnswers || 0,
        accuracy: analyticsData.accuracy || 0,
        studyHours: analyticsData.studyHours || 0,
        latestScores: analyticsData.latestScores || { math: null, rw: null }
      })

      // Process Recent Activity from Sessions
      const sessions = sessionsRes.data.sessions || sessionsRes.data || []
      const recent = sessions.slice(0, 5).map(session => {
        // Calculate score percentage if not directly available
        let score = 0
        if (session.score !== undefined) score = session.score
        else if (session.result?.total !== undefined) score = session.result.total
        else if (session.correctAnswers && session.totalQuestions) {
          score = Math.round((session.correctAnswers / session.totalQuestions) * 100)
        }

        // Determine session type
        let typeLabel = "Practice"
        if (session.testId) {
            if (session.testId.testType === 'Mock') typeLabel = "Mock Exam"
            else if (session.testId.testType === 'Adaptive') typeLabel = "Adaptive Test"
            else if (session.testId.practiceMode === 'tutor') typeLabel = "Tutor Mode"
            else if (session.testId.practiceMode === 'timed') typeLabel = "Timed Practice"
        } else if (session.practiceMode === 'tutor') {
            typeLabel = "Tutor Mode"
        }

        return {
          id: session._id,
          testId: session.testId?._id,
          topic: session.testId?.title || session.subject || "Practice Session",
          type: typeLabel,
          attempted: session.totalQuestions || session.responses?.length || 0,
          score: score,
          date: new Date(session.createdAt || session.updatedAt).toLocaleDateString()
        }
      })
      setRecentActivity(recent)

      // Count assigned-but-not-completed tests per category.
      // Match the tutor pages exactly: one row per test (most-advanced session wins) so a
      // completed-then-reassigned test isn't double-counted, and DROP deactivated
      // (isActive===false) tests so dead/duplicate sheets never show as "pending".
      const allSessions = sessions
      const STATUS_RANK = { Completed: 3, InProgress: 2, Assigned: 1 }
      const sTime = s => new Date(s.completedAt || s.updatedAt || s.createdAt || 0).getTime()
      const perTest = new Map()
      for (const s of allSessions) {
        if (!s.testId || s.testId.isActive === false) continue
        const tid = String(s.testId._id || s._id)
        const cur = perTest.get(tid)
        const better = !cur || (STATUS_RANK[s.status] || 0) > (STATUS_RANK[cur.status] || 0) ||
          ((STATUS_RANK[s.status] || 0) === (STATUS_RANK[cur.status] || 0) && sTime(s) > sTime(cur))
        if (better) perTest.set(tid, s)
      }
      const pendingSessions = [...perTest.values()].filter(s => s.status === 'Assigned')
      const assignedRW = pendingSessions.filter(s => s.testId?.isTutorTest && s.testId?.subject === 'Reading and Writing' && !s.testId?.isModuleTest).length
      const assignedMath = pendingSessions.filter(s => s.testId?.isTutorTest && s.testId?.subject === 'Math' && !s.testId?.isModuleTest).length
      const assignedModule = pendingSessions.filter(s => s.testId?.isModuleTest).length
      const assignedAdmin = pendingSessions.filter(s => s.testId?.practiceMode === 'admin' || s.testId?.testType === 'Mock').length
      const assignedAdaptive = pendingSessions.filter(s => s.testId && s.testId.practiceMode !== 'admin' && s.testId.practiceMode !== 'tutor' && s.testId.isTutorTest !== true && (s.testId.sections?.math === true || s.testId.sections?.rw === true)).length
      setTestCounts({ rw: assignedRW, math: assignedMath, module: assignedModule, admin: assignedAdmin, adaptive: assignedAdaptive })

      // Build performance data per category (completed sessions only)
      const calcAvg = (arr) => {
        if (!arr.length) return 0
        const scores = arr.map(s => s.totalQuestions > 0 ? Math.round((s.correctAnswers / s.totalQuestions) * 100) : 0)
        return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      }
      const completedRW = allSessions.filter(s => s.status === 'Completed' && s.testId?.isTutorTest && s.testId?.subject === 'Reading and Writing' && !s.testId?.isModuleTest)
      const completedMath = allSessions.filter(s => s.status === 'Completed' && s.testId?.isTutorTest && s.testId?.subject === 'Math' && !s.testId?.isModuleTest)
      const completedModule = allSessions.filter(s => s.status === 'Completed' && s.testId?.isModuleTest)
      const completedAdmin = allSessions.filter(s => s.status === 'Completed' && (s.testId?.practiceMode === 'admin' || s.testId?.testType === 'Mock'))
      const completedAdaptive = allSessions.filter(s => s.status === 'Completed' && s.testId && s.testId.practiceMode !== 'admin' && s.testId.practiceMode !== 'tutor' && s.testId.isTutorTest !== true && (s.testId.sections?.math === true || s.testId.sections?.rw === true))
      setPerformanceData([
        { name: 'Tutor R&W', score: calcAvg(completedRW), tests: completedRW.length, fill: '#8b5cf6' },
        { name: 'Tutor Math', score: calcAvg(completedMath), tests: completedMath.length, fill: '#3b82f6' },
        { name: 'Module Tests', score: calcAvg(completedModule), tests: completedModule.length, fill: '#6366f1' },
        { name: 'Mock Exam', score: calcAvg(completedAdmin), tests: completedAdmin.length, fill: '#64748b' },
        { name: 'Adaptive', score: calcAvg(completedAdaptive), tests: completedAdaptive.length, fill: '#14b8a6' },
      ])

      setBookmarks([])

    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setError("Couldn't load your dashboard data.")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  // Total only when BOTH sections exist (a real /1600 SAT); otherwise show — so a
  // student who has only done one section never sees a misleading partial total.
  const _ls = stats.latestScores || {}
  const totalScore = (_ls.math != null && _ls.rw != null) ? _ls.math + _ls.rw : null

  // A brand-new student (nothing attempted, no activity) gets a "start here" greeting
  // instead of "Welcome back", and a create-your-first-test nudge.
  const firstName = user?.name?.split(' ')[0] || 'there'
  const isNewUser = (stats.totalAttempted || 0) === 0 && recentActivity.length === 0
  const pendingTotal = (testCounts.rw || 0) + (testCounts.math || 0) + (testCounts.module || 0) + (testCounts.admin || 0) + (testCounts.adaptive || 0)

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiGrid size={18} />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">
                {isNewUser ? `Welcome, ${firstName}! Let's get you started.` : `Welcome back, ${user?.name || 'Student'}`}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {isNewUser
                  ? 'Set your goal, take your first practice test, and track every point you gain.'
                  : 'Success is the sum of small efforts repeated day in and day out.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/messages')}
            className="relative rounded-lg border border-slate-300 p-2.5 text-slate-600 transition-colors hover:bg-slate-50"
            aria-label="Messages"
          >
            <FiBell size={20} />
            {unreadMessages > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[10px] font-bold text-white shadow">
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </span>
            )}
          </button>
        </div>

        {error && (
          <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
            <span className="text-sm font-medium text-rose-700">{error} Please try again.</span>
            <button
              onClick={fetchDashboardData}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Questions Attempted</p>
                <p className="mt-1 text-3xl font-extrabold text-slate-900">{stats.totalAttempted ?? 0}</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500 text-white">
                <FiTarget size={20} />
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Accuracy</p>
                <p className="mt-1 text-3xl font-extrabold text-slate-900">{stats.accuracy ?? 0}%</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white">
                <FiTrendingUp size={20} />
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Correct Answers</p>
                <p className="mt-1 text-3xl font-extrabold text-slate-900">{stats.correctAnswers ?? 0}</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500 text-white">
                <FiBook size={20} />
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Study Hours</p>
                <p className="mt-1 text-3xl font-extrabold text-slate-900">{stats.studyHours ?? 0}h</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-white">
                <FiClock size={20} />
              </span>
            </div>
          </div>
        </div>

        {/* Latest SAT Scores */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiAward size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Latest SAT Score</h2>
              <p className="mt-0.5 text-xs text-slate-500">Your most recent scaled section scores</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total</p>
              <p className="mt-1 text-3xl font-extrabold text-indigo-600">{totalScore ?? '—'}</p>
              <p className="mt-1 text-xs text-slate-400">out of 1600</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Reading &amp; Writing</p>
              <p className="mt-1 text-3xl font-extrabold text-violet-600">{stats.latestScores?.rw ?? '—'}</p>
              <p className="mt-1 text-xs text-slate-400">out of 800</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Math</p>
              <p className="mt-1 text-3xl font-extrabold text-emerald-600">{stats.latestScores?.math ?? '—'}</p>
              <p className="mt-1 text-xs text-slate-400">out of 800</p>
            </div>
          </div>
        </div>

        {/* Test Quick Access */}
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Your Tests</h2>
            <button onClick={() => router.push('/dashboard/tests')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">View all →</button>
          </div>
          {pendingTotal > 0 ? (
            <button
              onClick={() => router.push('/dashboard/tests')}
              className="mb-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4 text-left transition-colors hover:bg-indigo-100"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white"><FiPlay size={18} /></span>
                <span>
                  <span className="block text-base font-bold text-slate-900">You have {pendingTotal} test{pendingTotal > 1 ? 's' : ''} to do</span>
                  <span className="block text-xs text-slate-500">Tap to see everything assigned to you</span>
                </span>
              </span>
              <FiExternalLink className="flex-shrink-0 text-indigo-500" />
            </button>
          ) : (
            <div className="mb-4 flex flex-col items-start gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-slate-600">No tests assigned yet — your tutor's tests will show up here. Want to practice now?</span>
              <button
                onClick={() => router.push('/dashboard/tests/create')}
                className="flex-shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                Create a practice test
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: 'Tutor R&W', path: '/dashboard/tutor/rw', count: testCounts.rw, icon: <FiBookmark size={20} />, iconBg: 'bg-violet-100 text-violet-600' },
              { label: 'Tutor Math', path: '/dashboard/tutor/math', count: testCounts.math, icon: <FiTarget size={20} />, iconBg: 'bg-indigo-100 text-indigo-600' },
              { label: 'Tutor Module Tests', path: '/dashboard/tutor/module-tests', count: testCounts.module, icon: <FiTrendingUp size={20} />, iconBg: 'bg-blue-100 text-blue-600' },
              { label: 'Mock Exam', path: '/dashboard/admin-tests', count: testCounts.admin, icon: <FiBarChart size={20} />, iconBg: 'bg-slate-100 text-slate-600' },
              { label: 'Adaptive', path: '/dashboard/adaptive-tests', count: testCounts.adaptive, icon: <FiActivity size={20} />, iconBg: 'bg-emerald-100 text-emerald-600' },
            ].map(({ label, path, count, icon, iconBg }) => (
              <button
                key={path}
                onClick={() => router.push(path)}
                className="group relative flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
              >
                {count > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white shadow">
                    {count}
                  </span>
                )}
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${iconBg}`}>
                  {icon}
                </div>
                <span className="text-center text-sm font-semibold leading-tight text-slate-700">{label}</span>
                {count > 0 ? (
                  <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">{count} pending</span>
                ) : (
                  <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-400">No pending</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Performance Graph */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <FiBarChart size={18} />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">Performance Overview</h2>
                <p className="mt-0.5 text-xs text-slate-500">Average score % across completed tests per category</p>
              </div>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">Avg. Score %</span>
          </div>
          {performanceData.every(d => d.tests === 0) ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                <FiBarChart size={26} />
              </div>
              <h3 className="text-sm font-semibold text-slate-500">No completed tests yet</h3>
              <p className="mt-1 text-sm text-slate-400">Complete tests to see your performance graph.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={performanceData} barSize={48} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-lg">
                        <p className="mb-1 font-semibold text-slate-800">{d.name}</p>
                        <p className="text-slate-600">Avg Score: <span className="font-bold text-slate-900">{d.score}%</span></p>
                        <p className="text-xs text-slate-400">{d.tests} test{d.tests !== 1 ? 's' : ''} completed</p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {performanceData.map((entry, i) => <Cell key={i} fill={entry.fill} fillOpacity={entry.tests === 0 ? 0.2 : 1} />)}
                  <LabelList dataKey="score" position="top" formatter={v => v > 0 ? `${v}%` : ''} style={{ fontSize: 12, fontWeight: 600, fill: '#374151' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-4">
            {performanceData.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="h-3 w-3 flex-shrink-0 rounded-sm" style={{ backgroundColor: d.fill }} />
                <span className="text-xs text-slate-500">{d.name}</span>
                <span className="text-xs font-semibold text-slate-700">{d.tests} done</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-slate-100 px-6 py-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiClock size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Activity</h2>
              <p className="mt-0.5 text-xs text-slate-500">Your last few test sessions</p>
            </div>
          </div>
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                <FiActivity size={26} />
              </div>
              <h3 className="text-sm font-semibold text-slate-500">No activity yet</h3>
              <p className="mt-1 text-sm text-slate-400">Your completed test sessions will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Test / Topic</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Attempted</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Score</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentActivity.map((item) => (
                    <tr key={item.id} className="text-sm transition-colors hover:bg-indigo-50/40">
                      <td className="px-6 py-4 font-medium text-slate-900">{item.topic || '—'}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">{item.type || '—'}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{item.attempted ?? 0}</td>
                      <td className="px-6 py-4 font-semibold text-slate-700">{item.score ?? 0}</td>
                      <td className="px-6 py-4 text-slate-500">{item.date || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Enrolled Courses */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-slate-100 px-6 py-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiBook size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">My Courses</h2>
              <p className="mt-0.5 text-xs text-slate-500">Courses you are currently enrolled in</p>
            </div>
          </div>
          {enrolledCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                <FiBook size={26} />
              </div>
              <h3 className="text-sm font-semibold text-slate-500">No enrolled courses</h3>
              <p className="mt-1 text-sm text-slate-400">Browse the catalog to enroll in a course.</p>
              <button
                onClick={() => router.push('/dashboard/courses')}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                Browse Courses
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
              {enrolledCourses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => router.push(`/dashboard/courses/${course.id}`)}
                  className="group flex flex-col rounded-xl border border-slate-100 bg-slate-50 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-md"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 transition-transform group-hover:scale-110">
                    <FiBook size={18} />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">{course.title || '—'}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{course.description || 'No description available.'}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">
                    Open course <FiExternalLink size={12} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
