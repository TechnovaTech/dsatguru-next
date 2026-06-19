'use client'
import { useState, useEffect } from 'react'
import { FiUsers, FiBookOpen, FiBarChart, FiTrendingUp, FiFileText } from 'react-icons/fi'

export default function Analytics() {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch('/api/admin/analytics', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (res.ok) {
        const json = await res.json()
        const totals = json.totals || {}
        setOverview({
          totalStudents: totals.students || 0,
          totalEnrollments: totals.enrollments || 0,
          totalAttempts: totals.sessions || 0,
          averageScore: Math.round((totals.averageScore || 0) * 100) / 100,
          questionUsageCount: totals.questionUsageCount || 0
        })
      } else {
        setError("Couldn't load analytics.")
      }
    } catch {
      setError("Couldn't load analytics.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    </div>
  )

  if (error || !overview) return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div role="alert" className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <span className="text-sm font-medium text-rose-700">{error || "Couldn't load analytics."} Please try again.</span>
          <button
            onClick={fetchAnalytics}
            className="ml-4 rounded-lg bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">Admin Analytics</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            title="Total Students"
            value={overview.totalStudents.toLocaleString()}
            icon={<FiUsers />}
            grad="from-indigo-500 to-indigo-600"
          />
          <MetricCard
            title="Total Enrollments"
            value={overview.totalEnrollments.toLocaleString()}
            icon={<FiBookOpen />}
            grad="from-blue-500 to-blue-600"
          />
          <MetricCard
            title="Total Test Attempts"
            value={overview.totalAttempts.toLocaleString()}
            icon={<FiBarChart />}
            grad="from-violet-500 to-violet-600"
          />
          <MetricCard
            title="Average Score"
            value={`${overview.averageScore}`}
            icon={<FiTrendingUp />}
            grad="from-emerald-500 to-teal-600"
          />
          <MetricCard
            title="Question Usage Count"
            value={overview.questionUsageCount.toLocaleString()}
            icon={<FiFileText />}
            grad="from-amber-500 to-orange-500"
          />
        </div>
      </div>
    </div>
  )
}

const MetricCard = ({ title, value, icon, grad }) => (
  <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
    <div className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${grad} opacity-10 blur-xl`} />
    <div className="flex items-center justify-between">
      <div>
        <p className="text-2xl font-extrabold text-slate-900 lg:text-3xl">{value}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{title}</p>
      </div>
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-white shadow-lg transition-transform group-hover:scale-110`}>
        {icon}
      </div>
    </div>
  </div>
)
