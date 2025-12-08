"use client"
import { useEffect, useState } from 'react'
import { FiUsers, FiDollarSign, FiCalendar, FiHelpCircle } from 'react-icons/fi'
import { getDashboardStats } from '../../../lib/api/admin'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const data = await getDashboardStats()
        setStats(data)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <StatCard title="Total Students" value={stats?.totalStudents || 0} icon={<FiUsers />} color="bg-blue-500" />
        <StatCard title="Total Tutors" value={stats?.totalTutors || 0} icon={<FiUsers />} color="bg-green-500" />
        <StatCard title="Total Revenue" value={`$${stats?.totalRevenue || 0}`} icon={<FiDollarSign />} color="bg-yellow-500" />
        <StatCard title="Upcoming Classes" value={stats?.upcomingClasses || 0} icon={<FiCalendar />} color="bg-purple-500" />
        <StatCard title="Total Questions" value={stats?.totalQuestions || 0} icon={<FiHelpCircle />} color="bg-red-500" />
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className={`${color} text-white p-3 rounded-full`}>{icon}</div>
      </div>
    </div>
  )
}
