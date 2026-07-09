'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../components/AuthContext'
import { useRouter } from 'next/navigation'
import {
  FiUsers,
  FiFileText,
  FiAward,
  FiTrendingUp,
  FiLayers,
  FiUserCheck,
  FiActivity,
  FiAlertCircle,
  FiCalendar,
  FiTarget,
  FiClock,
  FiUserX,
} from 'react-icons/fi'

const fmtDate = (x) => (x ? new Date(x).toLocaleDateString() : '—')

export default function TutorDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [students, setStudents] = useState([])
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTests: 0,
    completedTests: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user && user.role !== 'Tutor') {
      router.push('/dashboard')
    }
  }, [user, router])

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      // Fetch assigned students count
      const studentsRes = await fetch('/api/admin/users?role=Student', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (studentsRes.ok) {
        const students = await studentsRes.json()
        const list = Array.isArray(students) ? students : []
        setStudents(list)
        setStats(prev => ({ ...prev, totalStudents: list.length }))
      } else {
        setError('Failed to load dashboard data')
      }

      // Fetch completed test results count (scoped to this tutor's students server-side)
      const resultsRes = await fetch('/api/admin/tutor/results', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (resultsRes.ok) {
        const results = await resultsRes.json()
        const completed = Array.isArray(results) ? results.length : 0
        setStats(prev => ({ ...prev, completedTests: completed }))
      }
    } catch (err) {
      console.error('Failed to fetch stats', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  // Derive richer stats from the full student records the API returns.
  const activeStudents = students.filter(s => s.isActive !== false).length
  const totalDsatAttempts = students.reduce((sum, s) => sum + (s.totalDsatAttempts || 0), 0)

  const statCards = [
    { label: 'Assigned Students', value: stats.totalStudents, icon: FiUsers, chip: 'bg-indigo-500' },
    { label: 'Active Students', value: activeStudents, icon: FiUserCheck, chip: 'bg-emerald-500' },
    { label: 'Total DSAT Attempts', value: totalDsatAttempts, icon: FiActivity, chip: 'bg-amber-500' },
    { label: 'Completed Tests', value: stats.completedTests, icon: FiAward, chip: 'bg-rose-500' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiLayers size={20} />
            </span>
            Tutor Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back, {user?.name ?? '—'}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-100 bg-white py-24 shadow-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-rose-700">
              <FiAlertCircle size={20} className="flex-shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
            <button
              onClick={fetchStats}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map(({ label, value, icon: Icon, chip }) => (
                <div key={label} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="mb-1 text-sm text-slate-500">{label}</p>
                      <p className="text-3xl font-bold text-slate-900">{value}</p>
                    </div>
                    <span className={`flex h-12 w-12 items-center justify-center rounded-lg text-white ${chip}`}>
                      <Icon size={22} />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* My Students */}
            <div className="mb-6 rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <FiUsers className="text-indigo-600" />
                  My Students
                </h2>
                <button
                  onClick={() => router.push('/tutor/students')}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  View all
                </button>
              </div>

              {students.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                    <FiUsers size={24} />
                  </span>
                  <h3 className="text-base font-semibold text-slate-900">No students assigned yet</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Students assigned to you will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-slate-100 bg-slate-50">
                      <tr>
                        <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Student</th>
                        <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                        <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">DSAT Attempts</th>
                        <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Target Score</th>
                        <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Last Attempt</th>
                        <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Next Exam</th>
                        <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Assigned Tutors</th>
                        <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((s) => {
                        const tutors = s.assignedTutorDetails || []
                        return (
                          <tr
                            key={s._id}
                            onClick={() => router.push(`/tutor/students/${s._id}/performance`)}
                            className="cursor-pointer transition-colors hover:bg-indigo-50/40"
                          >
                            <td className="px-6 py-4">
                              <div className="font-medium text-slate-900">{s.name ?? '—'}</div>
                              <div className="text-xs text-slate-500">{s.email ?? '—'}</div>
                            </td>
                            <td className="px-6 py-4">
                              {s.isActive !== false ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                  <FiUserCheck size={12} /> Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
                                  <FiUserX size={12} /> Inactive
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">
                                <FiActivity size={12} /> {s.totalDsatAttempts ?? 0}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              {s.targetScore != null ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">
                                  <FiTarget size={12} /> {s.targetScore}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1.5 text-slate-600">
                                <FiClock size={13} className="text-slate-400" /> {fmtDate(s.lastAttemptDate)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1.5 text-slate-600">
                                <FiCalendar size={13} className="text-slate-400" /> {fmtDate(s.nextExamDate)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {tutors.length === 0 ? (
                                <span className="text-slate-400">—</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {tutors.map((t, i) => (
                                    <span
                                      key={i}
                                      title={t.email || ''}
                                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                                    >
                                      {t.name ?? t.email ?? '—'}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-slate-600">{fmtDate(s.createdAt)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Tutor Module Tests Section */}
            <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <FiLayers className="text-indigo-600" />
                Tutor Module Tests
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <button
                  onClick={() => router.push('/tutor/tests?tab=Module Tests')}
                  className="rounded-xl border border-slate-200 p-4 text-left transition-all hover:border-indigo-500 hover:bg-indigo-50"
                >
                  <FiFileText className="mb-2 text-2xl text-indigo-600" />
                  <h3 className="font-semibold text-slate-900">Module Test Sheets</h3>
                  <p className="text-sm text-slate-500">Assigned by Admin or Tutor Admin</p>
                </button>

                <button
                  onClick={() => router.push('/tutor/results')}
                  className="rounded-xl border border-slate-200 p-4 text-left transition-all hover:border-indigo-500 hover:bg-indigo-50"
                >
                  <FiAward className="mb-2 text-2xl text-indigo-600" />
                  <h3 className="font-semibold text-slate-900">Module Results</h3>
                  <p className="text-sm text-slate-500">Results for your assigned students</p>
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Quick Actions</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <button
                  onClick={() => router.push('/tutor/students')}
                  className="rounded-xl border border-slate-200 p-4 text-left transition-all hover:border-indigo-500 hover:bg-indigo-50"
                >
                  <FiUsers className="mb-2 text-2xl text-indigo-600" />
                  <h3 className="font-semibold text-slate-900">View My Students</h3>
                  <p className="text-sm text-slate-500">Manage your assigned students</p>
                </button>

                <button
                  onClick={() => router.push('/tutor/tests')}
                  className="rounded-xl border border-slate-200 p-4 text-left transition-all hover:border-emerald-500 hover:bg-emerald-50"
                >
                  <FiFileText className="mb-2 text-2xl text-emerald-600" />
                  <h3 className="font-semibold text-slate-900">View Test Sheets</h3>
                  <p className="text-sm text-slate-500">View and manage test sheets</p>
                </button>

                <button
                  onClick={() => router.push('/tutor/results')}
                  className="rounded-xl border border-slate-200 p-4 text-left transition-all hover:border-violet-500 hover:bg-violet-50"
                >
                  <FiAward className="mb-2 text-2xl text-violet-600" />
                  <h3 className="font-semibold text-slate-900">View Test Results</h3>
                  <p className="text-sm text-slate-500">Check student test results</p>
                </button>

                <button
                  onClick={() => router.push('/tutor/students')}
                  className="rounded-xl border border-slate-200 p-4 text-left transition-all hover:border-amber-500 hover:bg-amber-50"
                >
                  <FiTrendingUp className="mb-2 text-2xl text-amber-600" />
                  <h3 className="font-semibold text-slate-900">Student Progress</h3>
                  <p className="text-sm text-slate-500">Track student performance</p>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
