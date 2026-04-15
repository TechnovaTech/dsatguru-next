'use client'
import { useState, useEffect } from 'react'
import { FiUsers, FiAlertCircle, FiCheckCircle, FiClock, FiTarget, FiActivity } from 'react-icons/fi'
import Link from 'next/link'

export default function MasterDashboard() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/master-dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch data')
      const dashboardData = await res.json()
      setData(dashboardData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Master Dashboard...</div>
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>

  return (
    <div className="p-0 min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-50 border-b p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              🏆 DSAT GURU — MASTER STUDENT DASHBOARD
            </h1>
            <p className="text-gray-500 mt-2 text-sm flex items-center gap-2">
              <span className="font-bold text-blue-600">dsatguru.com</span> | 
              <span>Real-time progress for all students</span> | 
              <span className="flex items-center gap-1"><span className="text-red-500">🔴</span> = Needs Attention</span>
              <span className="flex items-center gap-1"><span className="text-yellow-500">🟡</span> = At Risk</span>
              <span className="flex items-center gap-1"><span className="text-green-500">🟢</span> = On Track</span>
            </p>
          </div>
          <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest">
            Tutor View Only
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <div className="flex items-center gap-3 text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">
              <FiUsers /> Total Students
            </div>
            <p className="text-3xl font-black text-gray-900">{data.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm border-l-4 border-l-red-500">
            <div className="flex items-center gap-3 text-red-500 text-xs font-bold uppercase tracking-wider mb-2">
              <FiAlertCircle /> Needs Attention
            </div>
            <p className="text-3xl font-black text-gray-900">{data.filter(s => s.onTrack === '🔴').length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm border-l-4 border-l-yellow-500">
            <div className="flex items-center gap-3 text-yellow-500 text-xs font-bold uppercase tracking-wider mb-2">
              <FiClock /> At Risk
            </div>
            <p className="text-3xl font-black text-gray-900">{data.filter(s => s.onTrack === '🟡').length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm border-l-4 border-l-green-500">
            <div className="flex items-center gap-3 text-green-500 text-xs font-bold uppercase tracking-wider mb-2">
              <FiCheckCircle /> On Track
            </div>
            <p className="text-3xl font-black text-gray-900">{data.filter(s => s.onTrack === '🟢').length}</p>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <FiActivity className="text-blue-600" />
          <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tighter">👥 STUDENT OVERVIEW</h2>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest border-r border-gray-800 whitespace-nowrap">Student Name</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest border-r border-gray-800 whitespace-nowrap">Start Date</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest border-r border-gray-800 whitespace-nowrap">Exam Date</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest border-r border-gray-800 whitespace-nowrap">Days Left</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest border-r border-gray-800 whitespace-nowrap">Target Score</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest border-r border-gray-800 whitespace-nowrap">Questions Done Today</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest border-r border-gray-800 whitespace-nowrap">Total Q's Completed</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest border-r border-gray-800 whitespace-nowrap">Errors Logged</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest border-r border-gray-800 whitespace-nowrap">Redo Q's Pending</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest border-r border-gray-800 whitespace-nowrap">Daily Target</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest border-r border-gray-800 text-center whitespace-nowrap">On Track?</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest border-r border-gray-800 whitespace-nowrap">Last Active</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest border-r border-gray-800 whitespace-nowrap">Tutor Notes</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-center whitespace-nowrap">Alert Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((student) => (
                <tr key={student.id} className="hover:bg-blue-50/50 transition-colors group">
                  <td className="px-4 py-5 border-r border-gray-50">
                    <Link 
                      href={`/admin/student-analysis/${student.id}`}
                      className="font-black text-gray-900 text-sm hover:text-blue-600 transition-colors"
                    >
                      {student.name}
                    </Link>
                  </td>
                  <td className="px-4 py-5 text-sm text-gray-600 font-medium border-r border-gray-50">
                    {student.startDate ? new Date(student.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                  </td>
                  <td className="px-4 py-5 text-sm text-gray-600 font-medium border-r border-gray-50">
                    {student.examDate ? new Date(student.examDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                  </td>
                  <td className={`px-4 py-5 text-sm font-black border-r border-gray-50 ${student.daysLeft < 15 ? 'text-red-600' : 'text-gray-900'}`}>
                    {student.daysLeft}
                  </td>
                  <td className="px-4 py-5 text-sm font-black text-blue-700 border-r border-gray-50">
                    {student.targetScore}
                  </td>
                  <td className="px-4 py-5 text-center border-r border-gray-50">
                    <span className={`text-lg font-black ${student.questionsDoneToday >= student.dailyTarget ? 'text-green-600' : 'text-gray-900'}`}>
                      {student.questionsDoneToday}
                    </span>
                  </td>
                  <td className="px-4 py-5 text-sm font-bold text-gray-800 text-center border-r border-gray-50">
                    {student.totalQuestionsCompleted}
                  </td>
                  <td className="px-4 py-5 text-sm font-bold text-red-500 text-center border-r border-gray-50">
                    {student.errorsLogged}
                  </td>
                  <td className="px-4 py-5 text-sm font-bold text-orange-500 text-center border-r border-gray-50">
                    {student.redoPending}
                  </td>
                  <td className="px-4 py-5 text-sm font-bold text-gray-500 text-center border-r border-gray-50">
                    {student.dailyTarget}
                  </td>
                  <td className="px-4 py-5 text-center text-xl border-r border-gray-50">
                    {student.onTrack}
                  </td>
                  <td className="px-4 py-5 text-xs text-gray-500 font-medium border-r border-gray-50">
                    {student.lastActive ? new Date(student.lastActive).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-4 py-5 text-xs text-gray-400 italic max-w-xs truncate border-r border-gray-50" title={student.tutorNotes}>
                    {student.tutorNotes}
                  </td>
                  <td className="px-4 py-5 text-center">
                    {student.alertStatus !== '—' ? (
                      <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black tracking-tighter animate-pulse">
                        {student.alertStatus}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gray-50 rounded-2xl p-8 border">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
              <FiTarget className="text-blue-600" /> 📋 STATUS LEGEND & INSTRUCTIONS
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="w-24 text-sm font-black text-green-600 bg-green-50 px-3 py-1 rounded-lg border border-green-100 text-center">🟢 On Track</span>
                <span className="text-sm text-gray-600 font-medium">Student is meeting or exceeding daily question targets</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-24 text-sm font-black text-yellow-600 bg-yellow-50 px-3 py-1 rounded-lg border border-yellow-100 text-center">🟡 At Risk</span>
                <span className="text-sm text-gray-600 font-medium">Student is 10-20% below target — consider a check-in</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-24 text-sm font-black text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-100 text-center">🔴 Behind</span>
                <span className="text-sm text-gray-600 font-medium">Student is &gt;20% below target — reach out immediately</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-24 text-sm font-black text-red-700 bg-red-100 px-3 py-1 rounded-lg border border-red-200 text-center">⚠️ REACH OUT</span>
                <span className="text-sm text-gray-600 font-bold">Alert triggered — student needs tutor intervention</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-600 rounded-2xl p-8 text-white shadow-xl shadow-blue-100">
            <h3 className="text-sm font-black uppercase tracking-widest mb-4">Pro Tip for Tutors</h3>
            <p className="text-blue-100 text-sm leading-relaxed font-medium">
              Click on the student's name to see a detailed breakdown of which specific topics the student is struggling with. Students in 🔴 RED should be prioritized for your next 1-on-1 session.
            </p>
            <div className="mt-8 pt-8 border-t border-blue-500/30 flex items-center justify-between">
              <span className="text-xs font-bold text-blue-200 uppercase tracking-tighter">DSAT Guru Performance Engine</span>
              <button 
                onClick={fetchData}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold text-xs hover:bg-blue-50 transition-colors"
              >
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
