
'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FiArrowLeft, FiCheckCircle, FiBook, FiCpu, FiTarget, FiTrendingUp } from 'react-icons/fi'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function StudentAnalysisDetail() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/admin/student-analysis/${params.id}`)
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch (error) {
        console.error('Error fetching analysis:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-900"></div>
      </div>
    )
  }

  if (!data) return <div className="p-8 text-center">Student not found</div>

  const { user, practiceCounts, subjectStats, topicStats, difficultyStats, performanceHistory } = data

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <FiArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-gray-500">{user.email} • {user.role}</p>
          </div>
        </div>

        {/* Practice Type Counters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Self Practice</p>
              <h3 className="text-2xl font-bold text-purple-600">{practiceCounts.selfPractice}</h3>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
              <FiCpu className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Tutor Assigned</p>
              <h3 className="text-2xl font-bold text-blue-600">{practiceCounts.tutorAssigned}</h3>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <FiBook className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Admin Assigned</p>
              <h3 className="text-2xl font-bold text-green-600">{practiceCounts.adminAssigned}</h3>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              <FiCheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Subject Performance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Math */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Math Performance</h3>
                <div className="flex items-center gap-6">
                    <div className="relative h-24 w-24 flex items-center justify-center">
                        <svg className="h-full w-full" viewBox="0 0 36 36">
                            <path
                                className="text-gray-100"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                            <path
                                className="text-blue-500"
                                strokeDasharray={`${subjectStats.Math.score}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                        </svg>
                        <span className="absolute text-xl font-bold text-blue-600">{subjectStats.Math.score}%</span>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Questions Attempted: <span className="font-semibold text-gray-800">{subjectStats.Math.total}</span></p>
                        <p className="text-sm text-gray-500">Correct: <span className="font-semibold text-green-600">{subjectStats.Math.correct}</span></p>
                    </div>
                </div>
            </div>

            {/* Reading & Writing */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Reading & Writing Performance</h3>
                <div className="flex items-center gap-6">
                    <div className="relative h-24 w-24 flex items-center justify-center">
                        <svg className="h-full w-full" viewBox="0 0 36 36">
                            <path
                                className="text-gray-100"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                            <path
                                className="text-purple-500"
                                strokeDasharray={`${subjectStats['Reading & Writing'].score}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                        </svg>
                        <span className="absolute text-xl font-bold text-purple-600">{subjectStats['Reading & Writing'].score}%</span>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Questions Attempted: <span className="font-semibold text-gray-800">{subjectStats['Reading & Writing'].total}</span></p>
                        <p className="text-sm text-gray-500">Correct: <span className="font-semibold text-green-600">{subjectStats['Reading & Writing'].correct}</span></p>
                    </div>
                </div>
            </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance History */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FiTrendingUp /> Performance Trend
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={performanceHistory}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                            <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis domain={[0, 100]} fontSize={12} tickLine={false} axisLine={false} />
                            <RechartsTooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Line type="monotone" dataKey="score" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Topic Performance */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FiTarget /> Topic Mastery
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={topicStats.slice(0, 5)}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis dataKey="name" type="category" width={120} fontSize={11} tickLine={false} axisLine={false} />
                            <RechartsTooltip cursor={{ fill: '#f3f4f6' }} />
                            <Bar dataKey="score" fill="#82ca9d" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Difficulty Analysis */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Performance by Difficulty</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['Easy', 'Medium', 'Hard'].map((level) => {
                    const stats = difficultyStats[level] || { total: 0, correct: 0 }
                    const percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
                    const color = level === 'Easy' ? 'text-green-600' : level === 'Medium' ? 'text-yellow-600' : 'text-red-600'
                    const bg = level === 'Easy' ? 'bg-green-100' : level === 'Medium' ? 'bg-yellow-100' : 'bg-red-100'
                    
                    return (
                        <div key={level} className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                            <div>
                                <span className={`text-sm font-bold px-2 py-1 rounded ${bg} ${color}`}>{level}</span>
                                <div className="mt-2 text-2xl font-bold text-gray-800">{percentage}%</div>
                                <div className="text-xs text-gray-500">{stats.correct}/{stats.total} Correct</div>
                            </div>
                            <div className={`h-2 w-full max-w-[60px] rounded-full bg-gray-200 overflow-hidden`}>
                                <div className={`h-full ${level === 'Easy' ? 'bg-green-500' : level === 'Medium' ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${percentage}%` }}></div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>

      </div>
    </div>
  )
}
