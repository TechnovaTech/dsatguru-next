'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthContext'
import { useRouter } from 'next/navigation'
import { FiBook, FiClock, FiTarget, FiTrendingUp, FiBookmark, FiVideo, FiMessageSquare, FiPlay, FiUsers, FiExternalLink, FiEdit, FiDatabase, FiCalendar, FiActivity, FiBarChart } from 'react-icons/fi'
import { FaCalculator } from 'react-icons/fa'
import axios from 'axios'

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
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome, {user?.name || 'Student'}!</h1>
        <p className="text-blue-100 mb-4">&quot;Success is the sum of small efforts repeated day in and day out.&quot;</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => router.push('/dashboard/tests')}
            className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            Take a Test
          </button>
          <button 
            onClick={() => router.push('/dashboard/study-plan')}
            className="border border-white text-white px-6 py-2 rounded-lg font-medium hover:bg-white/10 transition-colors"
          >
            View Study Plan
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


    </div>
  )
}
