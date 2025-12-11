'use client'
import { useState, useEffect } from 'react'
import { FiTrendingUp, FiTarget, FiBook, FiClock } from 'react-icons/fi'

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    totalQuestions: 245,
    correctAnswers: 189,
    accuracy: 77,
    studyHours: 24,
    weeklyProgress: [
      { day: 'Mon', score: 65 },
      { day: 'Tue', score: 72 },
      { day: 'Wed', score: 68 },
      { day: 'Thu', score: 80 },
      { day: 'Fri', score: 75 },
      { day: 'Sat', score: 85 },
      { day: 'Sun', score: 82 }
    ]
  })

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics</h1>
        <p className="text-gray-600">Track your learning progress and performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Questions Attempted</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalQuestions}</p>
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

      {/* Progress Chart */}
      <div className="bg-white rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-semibold mb-4">Weekly Progress</h2>
        <div className="flex items-end justify-between h-64 space-x-2">
          {stats.weeklyProgress.map((day, index) => (
            <div key={index} className="flex flex-col items-center flex-1">
              <div 
                className="bg-blue-500 rounded-t w-full transition-all duration-300 hover:bg-blue-600"
                style={{ height: `${(day.score / 100) * 200}px` }}
              ></div>
              <span className="text-sm text-gray-600 mt-2">{day.day}</span>
              <span className="text-xs text-gray-500">{day.score}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subject Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-semibold mb-4">Math Performance</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Algebra</span>
                <span>85%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Geometry</span>
                <span>72%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '72%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Statistics</span>
                <span>68%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '68%' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-semibold mb-4">Reading & Writing Performance</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Reading Comprehension</span>
                <span>78%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '78%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Grammar</span>
                <span>82%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '82%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Vocabulary</span>
                <span>75%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}