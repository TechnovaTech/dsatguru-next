'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthContext'
import { useRouter } from 'next/navigation'
import { FiBook, FiClock, FiTarget, FiTrendingUp, FiBookmark, FiVideo, FiMessageSquare, FiPlay, FiUsers, FiExternalLink, FiEdit, FiDatabase, FiCalendar, FiActivity, FiBarChart, FiBell } from 'react-icons/fi'
import { FaCalculator } from 'react-icons/fa'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [enrolledCourses, setEnrolledCourses] = useState([])
  const [enrolledQuestionBanks, setEnrolledQuestionBanks] = useState([])
  const [stats, setStats] = useState({
    totalAttempted: 0,
    correctAnswers: 0,
    accuracy: 0,
    studyHours: 0,
    latestScores: { math: 400, rw: 400 }
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
        latestScores: analyticsData.latestScores || { math: 400, rw: 400 }
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
            if (session.testId.testType === 'Mock') typeLabel = "Admin Test"
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
      
      // Count assigned-but-not-completed tests per category
      const allSessions = sessions
      const assignedRW = allSessions.filter(s => s.status === 'Assigned' && s.testId?.isTutorTest && s.testId?.subject === 'Reading and Writing' && !s.testId?.isModuleTest).length
      const assignedMath = allSessions.filter(s => s.status === 'Assigned' && s.testId?.isTutorTest && s.testId?.subject === 'Math' && !s.testId?.isModuleTest).length
      const assignedModule = allSessions.filter(s => s.status === 'Assigned' && s.testId?.isModuleTest).length
      const assignedAdmin = allSessions.filter(s => s.status === 'Assigned' && (s.testId?.practiceMode === 'admin' || s.testId?.testType === 'Mock')).length
      const assignedAdaptive = allSessions.filter(s => s.status === 'Assigned' && s.testId && s.testId.practiceMode !== 'admin' && s.testId.practiceMode !== 'tutor' && s.testId.isTutorTest !== true && (s.testId.sections?.math === true || s.testId.sections?.rw === true)).length
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
        { name: 'Admin Test', score: calcAvg(completedAdmin), tests: completedAdmin.length, fill: '#64748b' },
        { name: 'Adaptive', score: calcAvg(completedAdaptive), tests: completedAdaptive.length, fill: '#14b8a6' },
      ])

      setBookmarks([])

    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) return <div>Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl px-6 py-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'S'}
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Welcome back, {user?.name || 'Student'}!</h1>
            <p className="text-blue-100 text-xs mt-0.5">&quot;Success is the sum of small efforts repeated day in and day out.&quot;</p>
          </div>
        </div>
        <div className="flex items-center flex-shrink-0">
          <button onClick={() => router.push('/dashboard/messages')}
            className="relative bg-white text-blue-600 p-2.5 rounded-xl shadow-md hover:shadow-lg transition-all">
            <FiBell size={20} />
            {unreadMessages > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-lg border-2 border-white">
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Questions Attempted</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAttempted}</p>
            </div>
            <FiTarget className="text-blue-600" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Accuracy</p>
              <p className="text-2xl font-bold text-green-600">{stats.accuracy}%</p>
            </div>
            <FiTrendingUp className="text-green-600" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Correct Answers</p>
              <p className="text-2xl font-bold text-blue-600">{stats.correctAnswers}</p>
            </div>
            <FiBook className="text-blue-600" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Study Hours</p>
              <p className="text-2xl font-bold text-purple-600">{stats.studyHours}h</p>
            </div>
            <FiClock className="text-purple-600" size={24} />
          </div>
        </div>
      </div>

      {/* Test Quick Access */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Tutor R&W', path: '/dashboard/tutor/rw', count: testCounts.rw, icon: <FiBookmark size={20} />, iconBg: 'bg-violet-50 text-violet-600' },
          { label: 'Tutor Math', path: '/dashboard/tutor/math', count: testCounts.math, icon: <FiTarget size={20} />, iconBg: 'bg-blue-50 text-blue-600' },
          { label: 'Tutor Module Tests', path: '/dashboard/tutor/module-tests', count: testCounts.module, icon: <FiTrendingUp size={20} />, iconBg: 'bg-indigo-50 text-indigo-600' },
          { label: 'Admin Test', path: '/dashboard/admin-tests', count: testCounts.admin, icon: <FiBarChart size={20} />, iconBg: 'bg-slate-50 text-slate-600' },
          { label: 'Adaptive Test', path: '/dashboard/adaptive-tests', count: testCounts.adaptive, icon: <FiActivity size={20} />, iconBg: 'bg-teal-50 text-teal-600' },
        ].map(({ label, path, count, icon, iconBg }) => (
          <button key={path} onClick={() => router.push(path)}
            className="relative bg-white rounded-xl border border-gray-200 p-5 flex flex-col items-center gap-3 hover:shadow-md transition-all group">
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow">
                {count}
              </span>
            )}
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${iconBg}`}>
              {icon}
            </div>
            <span className="text-sm font-semibold text-gray-700 text-center leading-tight">{label}</span>
            {count > 0 ? (
              <span className="text-xs text-red-500 font-semibold">{count} pending</span>
            ) : (
              <span className="text-xs text-gray-400">No pending</span>
            )}
          </button>
        ))}
      </div>

      {/* Performance Graph */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Performance Overview</h2>
            <p className="text-xs text-gray-400 mt-0.5">Average score % across completed tests per category</p>
          </div>
          <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-3 py-1 rounded-full">Avg. Score %</span>
        </div>
        {performanceData.every(d => d.tests === 0) ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <FiBarChart size={36} className="mb-3 text-gray-300" />
            <p className="text-sm font-medium">No completed tests yet</p>
            <p className="text-xs mt-1">Complete tests to see your performance graph</p>
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
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm">
                      <p className="font-semibold text-gray-800 mb-1">{d.name}</p>
                      <p className="text-gray-600">Avg Score: <span className="font-bold text-gray-900">{d.score}%</span></p>
                      <p className="text-gray-400 text-xs">{d.tests} test{d.tests !== 1 ? 's' : ''} completed</p>
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
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
          {performanceData.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: d.fill }} />
              <span className="text-xs text-gray-500">{d.name}</span>
              <span className="text-xs font-semibold text-gray-700">{d.tests} done</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
