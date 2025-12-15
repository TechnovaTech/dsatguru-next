'use client'
import { useState, useEffect } from 'react'
import { FiUsers, FiBookOpen, FiBarChart, FiTrendingUp, FiFileText } from 'react-icons/fi'

export default function Analytics() {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
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
        }
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  if (loading) return <div className="min-h-screen bg-gray-50 p-6">Loading analytics...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Analytics</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <MetricCard
            title="Total Students"
            value={overview.totalStudents.toLocaleString()}
            icon={<FiUsers />}
            color="bg-purple-500"
          />
          <MetricCard
            title="Total Enrollments"
            value={overview.totalEnrollments.toLocaleString()}
            icon={<FiBookOpen />}
            color="bg-blue-500"
          />
          <MetricCard
            title="Total Test Attempts"
            value={overview.totalAttempts.toLocaleString()}
            icon={<FiBarChart />}
            color="bg-indigo-500"
          />
          <MetricCard
            title="Average Score"
            value={`${overview.averageScore}`}
            icon={<FiTrendingUp />}
            color="bg-green-500"
          />
          <MetricCard
            title="Question Usage Count"
            value={overview.questionUsageCount.toLocaleString()}
            icon={<FiFileText />}
            color="bg-orange-500"
          />
        </div>
      </div>
    </div>
  )
}

const MetricCard = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <div className={`${color} text-white p-3 rounded-full`}>
        {icon}
      </div>
    </div>
  </div>
)
