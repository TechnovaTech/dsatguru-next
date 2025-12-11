'use client'
import { useState, useEffect } from 'react'
import { FiUsers, FiBookOpen, FiDollarSign, FiCalendar, FiHelpCircle, FiPlus } from 'react-icons/fi'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 156,
    totalTutors: 12,
    totalRevenue: 45230,
    upcomingClasses: 8,
    totalQuestions: 4250,
    recentEnrollments: [
      { studentName: 'John Doe', courseName: 'DSAT Math Mastery', enrolledAt: new Date() },
      { studentName: 'Jane Smith', courseName: 'DSAT English Excellence', enrolledAt: new Date() },
      { studentName: 'Mike Johnson', courseName: 'PSAT Prep Complete', enrolledAt: new Date() }
    ],
    next24hClasses: [
      { title: 'Advanced Math Concepts', instructorName: 'Dr. Smith', startTime: new Date() },
      { title: 'Reading Comprehension', instructorName: 'Prof. Johnson', startTime: new Date() },
      { title: 'Writing Strategies', instructorName: 'Ms. Davis', startTime: new Date() }
    ]
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <button className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2">
            <FiPlus /> Add Question
          </button>
          <button className="bg-green-500 text-white px-4 py-2 rounded flex items-center gap-2">
            <FiCalendar /> Schedule Class
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={<FiUsers />}
          color="bg-blue-500"
        />
        <StatCard
          title="Total Tutors"
          value={stats.totalTutors}
          icon={<FiUsers />}
          color="bg-green-500"
        />
        <StatCard
          title="Total Revenue"
          value={`$${stats.totalRevenue}`}
          icon={<FiDollarSign />}
          color="bg-yellow-500"
        />
        <StatCard
          title="Upcoming Classes"
          value={stats.upcomingClasses}
          icon={<FiCalendar />}
          color="bg-purple-500"
        />
        <StatCard
          title="Total Questions"
          value={stats.totalQuestions}
          icon={<FiHelpCircle />}
          color="bg-red-500"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Recent Enrollments</h3>
          <div className="space-y-3">
            {stats.recentEnrollments.map((enrollment, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{enrollment.studentName}</p>
                  <p className="text-sm text-gray-600">{enrollment.courseName}</p>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(enrollment.enrolledAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Next 24h Classes</h3>
          <div className="space-y-3">
            {stats.next24hClasses.map((classItem, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{classItem.title}</p>
                  <p className="text-sm text-gray-600">{classItem.instructorName}</p>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(classItem.startTime).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const StatCard = ({ title, value, icon, color }) => (
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