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
    studyHours: 0
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [bookmarks, setBookmarks] = useState([])

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
      
      const [coursesRes, questionsRes, sessionsRes] = await Promise.all([
        axios.get('/api/courses'),
        axios.get('/api/questions'),
        axios.get('/api/test-sessions')
      ])
      
      setEnrolledCourses(coursesRes.data.courses || [])
      setStats({
        totalAttempted: 245,
        correctAnswers: 189,
        accuracy: 77,
        studyHours: 24
      })
      
      setRecentActivity([
        { topic: "Algebra", attempted: 15, score: 80, date: "2024-01-20" },
        { topic: "Reading Comprehension", attempted: 12, score: 75, date: "2024-01-19" },
        { topic: "Geometry", attempted: 18, score: 85, date: "2024-01-18" }
      ])
      
      setBookmarks([
        { id: 1, question: "Solve for x: 2x + 5 = 15", subject: "Math" },
        { id: 2, question: "What is the main idea of the passage?", subject: "Reading" }
      ])
      
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
        <p className="text-blue-100 mb-4">"Success is the sum of small efforts repeated day in and day out."</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors">
            Create Practice Test
          </button>
          <button className="border border-white text-white px-6 py-2 rounded-lg font-medium hover:bg-white/10 transition-colors">
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

      {/* SAT Quick Start */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 border border-blue-100">
        <div className="flex items-center mb-4">
          <div className="bg-blue-600 text-white p-2 rounded-lg mr-3">
            <FiTarget size={24} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">SAT Preparation</h2>
            <p className="text-sm text-gray-600">Start your SAT journey with our adaptive testing system</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button className="flex items-center justify-center p-4 bg-white hover:bg-blue-50 rounded-lg transition-colors group border border-blue-200">
            <FaCalculator className="text-blue-600 mr-3 group-hover:scale-110 transition-transform" size={20} />
            <div className="text-left">
              <div className="text-blue-700 font-medium">Math Practice</div>
              <div className="text-xs text-gray-600">Create custom practice</div>
            </div>
          </button>
          
          <button className="flex items-center justify-center p-4 bg-white hover:bg-green-50 rounded-lg transition-colors group border border-green-200">
            <FiEdit className="text-green-600 mr-3 group-hover:scale-110 transition-transform" size={20} />
            <div className="text-left">
              <div className="text-green-700 font-medium">Reading & Writing Practice</div>
              <div className="text-xs text-gray-600">Create custom practice</div>
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SAT Progress Overview */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">SAT Progress Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Math Progress */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Math Section</h3>
                <span className="text-sm text-gray-600">Last Score: 650</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '65%' }}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>400</span>
                <span>Current: 650</span>
                <span>800</span>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Target: 700 • 50 points to go
              </div>
            </div>
            
            {/* Reading & Writing Progress */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Reading & Writing</h3>
                <span className="text-sm text-gray-600">Last Score: 620</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '62%' }}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>400</span>
                <span>Current: 620</span>
                <span>800</span>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Target: 680 • 60 points to go
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-blue-900">Total SAT Score</div>
                <div className="text-2xl font-bold text-blue-600">1270</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-blue-700">Target: 1380</div>
                <div className="text-xs text-blue-600">110 points to go</div>
              </div>
            </div>
          </div>
          
          <h3 className="text-lg font-semibold mt-6 mb-4">Recent Practice</h3>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">{activity.topic}</h3>
                  <p className="text-sm text-gray-600">{activity.attempted} questions • {activity.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-green-600">{activity.score}%</p>
                  <button className="text-blue-600 text-sm hover:underline">Resume Practice</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bookmarks */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Bookmarks</h2>
            <FiBookmark className="text-gray-400" size={20} />
          </div>
          <div className="space-y-3">
            {bookmarks.map((bookmark) => (
              <div key={bookmark.id} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-900 mb-1">{bookmark.question}</p>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">{bookmark.subject}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Practice by Subject */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Practice by Subject</h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 transition-colors">
              <FaCalculator className="text-blue-600 mx-auto mb-2" size={24} />
              <p className="font-medium">Math</p>
              <p className="text-sm text-gray-600">Custom Practice</p>
            </button>
            <button className="p-4 border-2 border-green-200 rounded-lg hover:border-green-400 transition-colors">
              <FiBook className="text-green-600 mx-auto mb-2" size={24} />
              <p className="font-medium">Reading & Writing</p>
              <p className="text-sm text-gray-600">Custom Practice</p>
            </button>
          </div>
        </div>

        {/* Enrolled Courses */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Your Courses</h2>
          {enrolledCourses.length > 0 ? (
            <div className="space-y-3">
              {enrolledCourses.slice(0, 3).map((course, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{course.title || 'Course'}</h3>
                    <p className="text-sm text-gray-600">Progress: 65%</p>
                  </div>
                  <button className="text-blue-600 text-sm hover:underline">
                    Continue
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No courses enrolled yet</p>
          )}
        </div>
      </div>
    </div>
  )
}