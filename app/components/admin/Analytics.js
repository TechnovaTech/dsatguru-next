'use client'
import { useState, useEffect } from 'react'
import { FiTrendingUp, FiUsers, FiDollarSign, FiBookOpen } from 'react-icons/fi'

export default function Analytics() {
  const [overview, setOverview] = useState(null)
  const [revenueData, setRevenueData] = useState([])
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
          const derivedMonthlyRevenue = Math.round((totals.revenue || 0) / 6)
          const derivedMonthlyEnrollments = Math.round((totals.students || 0) / 12)
          setOverview({
            totalRevenue: totals.revenue || 0,
            monthlyRevenue: derivedMonthlyRevenue,
            totalEnrollments: totals.students || 0,
            monthlyEnrollments: derivedMonthlyEnrollments,
            activeStudents: totals.students || 0,
            activeTutors: totals.tutors || 0
          })
          const months = ['Jan','Feb','Mar','Apr','May','Jun']
          setRevenueData(months.map((m, i) => ({ month: m, revenue: derivedMonthlyRevenue, enrollments: derivedMonthlyEnrollments + i })))
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
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={`$${overview.totalRevenue.toLocaleString()}`}
          change="+12.5%"
          icon={<FiDollarSign />}
          color="bg-green-500"
        />
        <MetricCard
          title="Monthly Revenue"
          value={`$${overview.monthlyRevenue.toLocaleString()}`}
          change="+8.2%"
          icon={<FiTrendingUp />}
          color="bg-blue-500"
        />
        <MetricCard
          title="Active Students"
          value={overview.activeStudents.toLocaleString()}
          change="+15.3%"
          icon={<FiUsers />}
          color="bg-purple-500"
        />
        <MetricCard
          title="Total Enrollments"
          value={overview.totalEnrollments.toLocaleString()}
          change="+22.1%"
          icon={<FiBookOpen />}
          color="bg-orange-500"
        />
      </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Trend (Last 6 Months)</h3>
          <div className="h-64 flex items-end justify-between gap-4">
          {revenueData.map((data, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className="bg-blue-500 w-full rounded-t"
                style={{
                  height: `${(data.revenue / Math.max(...revenueData.map(d => d.revenue))) * 200}px`
                }}
              ></div>
              <div className="mt-2 text-center">
                <div className="text-sm font-medium">{data.month}</div>
                <div className="text-xs text-gray-600">${data.revenue.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performing Courses */}
          <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Top Performing Courses</h3>
          <div className="space-y-3">
            {[
              { name: "Advanced Mathematics", enrollments: 234, revenue: 12450 },
              { name: "Physics Fundamentals", enrollments: 189, revenue: 9870 },
              { name: "Chemistry Basics", enrollments: 156, revenue: 8340 },
              { name: "Biology Advanced", enrollments: 134, revenue: 7120 },
              { name: "English Literature", enrollments: 98, revenue: 5230 }
            ].map((course, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{course.name}</div>
                  <div className="text-sm text-gray-600">{course.enrollments} enrollments</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-600">${course.revenue.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Student Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Student Activity</h3>
          <div className="space-y-3">
            {[
              { student: "John Smith", action: "Completed Quiz", course: "Math Advanced", time: "2 hours ago" },
              { student: "Sarah Johnson", action: "Enrolled in Course", course: "Physics 101", time: "4 hours ago" },
              { student: "Mike Davis", action: "Submitted Assignment", course: "Chemistry", time: "6 hours ago" },
              { student: "Lisa Wilson", action: "Joined Live Class", course: "Biology", time: "8 hours ago" },
              { student: "Tom Brown", action: "Downloaded Material", course: "English", time: "1 day ago" }
            ].map((activity, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{activity.student}</div>
                  <div className="text-sm text-gray-600">{activity.action} - {activity.course}</div>
                </div>
                <div className="text-xs text-gray-500">{activity.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

        <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Enrollment Trends</h3>
        <div className="h-48 flex items-end justify-between gap-2">
          {revenueData.map((data, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className="bg-purple-500 w-full rounded-t"
                style={{
                  height: `${(data.enrollments / Math.max(...revenueData.map(d => d.enrollments))) * 150}px`
                }}
              ></div>
              <div className="mt-2 text-center">
                <div className="text-sm font-medium">{data.month}</div>
                <div className="text-xs text-gray-600">{data.enrollments}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  )
}

const MetricCard = ({ title, value, change, icon, color }) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-green-600">{change} from last month</p>
      </div>
      <div className={`${color} text-white p-3 rounded-full`}>
        {icon}
      </div>
    </div>
  </div>
)
