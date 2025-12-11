'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCourses: 0,
    totalQuestions: 0,
    totalSessions: 0
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [usersRes, coursesRes, questionsRes, sessionsRes] = await Promise.all([
        axios.get('/api/admin/users'),
        axios.get('/api/courses'),
        axios.get('/api/questions'),
        axios.get('/api/test-sessions')
      ])
      
      setStats({
        totalUsers: usersRes.data.users?.length || 0,
        totalCourses: coursesRes.data.courses?.length || 0,
        totalQuestions: questionsRes.data.questions?.length || 0,
        totalSessions: sessionsRes.data.sessions?.length || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-medium">U</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.totalUsers}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-medium">C</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Courses</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.totalCourses}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-medium">Q</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Questions</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.totalQuestions}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-medium">T</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Test Sessions</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.totalSessions}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">New user registered</span>
              <span className="text-xs text-gray-400">2 hours ago</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Course created</span>
              <span className="text-xs text-gray-400">4 hours ago</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Test session completed</span>
              <span className="text-xs text-gray-400">6 hours ago</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Create New Course
            </button>
            <button className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
              Add Questions
            </button>
            <button className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">
              View Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}