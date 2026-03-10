'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../components/AuthContext'
import { useRouter } from 'next/navigation'
import { FiUsers, FiFileText, FiAward, FiTrendingUp } from 'react-icons/fi'

export default function TutorDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTests: 0,
    completedTests: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && user.role !== 'Tutor') {
      router.push('/dashboard')
    }
  }, [user, router])

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token')
      // Fetch assigned students count
      const studentsRes = await fetch('/api/admin/users?role=Student', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (studentsRes.ok) {
        const students = await studentsRes.json()
        setStats(prev => ({ ...prev, totalStudents: students.length }))
      }
    } catch (err) {
      console.error('Failed to fetch stats', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Tutor Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Assigned Students</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalStudents}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FiUsers className="text-blue-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Tests</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalTests}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FiFileText className="text-green-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed Tests</p>
                <p className="text-3xl font-bold text-gray-900">{stats.completedTests}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FiAward className="text-purple-600 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push('/tutor/students')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
            >
              <FiUsers className="text-2xl text-blue-600 mb-2" />
              <h3 className="font-semibold text-gray-900">View My Students</h3>
              <p className="text-sm text-gray-600">Manage your assigned students</p>
            </button>

            <button
              onClick={() => router.push('/tutor/tests')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left"
            >
              <FiFileText className="text-2xl text-green-600 mb-2" />
              <h3 className="font-semibold text-gray-900">View Test Sheets</h3>
              <p className="text-sm text-gray-600">View and manage test sheets</p>
            </button>

            <button
              onClick={() => router.push('/tutor/results')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
            >
              <FiAward className="text-2xl text-purple-600 mb-2" />
              <h3 className="font-semibold text-gray-900">View Test Results</h3>
              <p className="text-sm text-gray-600">Check student test results</p>
            </button>

            <button
              onClick={() => router.push('/tutor/students')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-all text-left"
            >
              <FiTrendingUp className="text-2xl text-amber-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Student Progress</h3>
              <p className="text-sm text-gray-600">Track student performance</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
