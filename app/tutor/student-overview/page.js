'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../components/AuthContext'
import { useRouter } from 'next/navigation'
import { FiUsers, FiSearch, FiAlertCircle } from 'react-icons/fi'

export default function StudentOverviewPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (user && !['Tutor', 'TutorAdmin', 'Admin'].includes(user.role)) router.push('/dashboard')
  }, [user, router])

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch('/api/tutor/students/overview', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.students) setStudents(data.students)
        else setError('Failed to load data')
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = students.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="p-8 text-center text-gray-500">Loading student overview...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <FiUsers className="text-blue-600 w-6 h-6" />
            <h1 className="text-2xl font-bold text-gray-900">👥 MY STUDENTS — At a Glance</h1>
          </div>
          <p className="text-gray-500 text-sm ml-9">Your personal student roster — live data from their activity</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-100">
            <FiAlertCircle /> {error}
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
          <div className="relative max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
            <div className="text-2xl font-bold text-blue-600">{students.length}</div>
            <div className="text-xs text-gray-500 mt-1">Total Students</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
            <div className="text-2xl font-bold text-green-600">{students.filter(s => s.onTrackToday).length}</div>
            <div className="text-xs text-gray-500 mt-1">On Track Today</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
            <div className="text-2xl font-bold text-gray-800">{students.reduce((s, st) => s + st.totalQsDone, 0)}</div>
            <div className="text-xs text-gray-500 mt-1">Total Qs Done</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
            <div className="text-2xl font-bold text-red-500">{students.reduce((s, st) => s + st.redoPending, 0)}</div>
            <div className="text-xs text-gray-500 mt-1">Redo Pending</div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="px-4 py-3 text-left font-semibold">#</th>
                <th className="px-4 py-3 text-left font-semibold">Student Name</th>
                <th className="px-4 py-3 text-center font-semibold">Exam Date</th>
                <th className="px-4 py-3 text-center font-semibold">Days Left</th>
                <th className="px-4 py-3 text-center font-semibold">Target Score</th>
                <th className="px-4 py-3 text-center font-semibold">Today On Track?</th>
                <th className="px-4 py-3 text-center font-semibold">Total Q's Done</th>
                <th className="px-4 py-3 text-center font-semibold">Errors Logged</th>
                <th className="px-4 py-3 text-center font-semibold">Redo Pending</th>
                <th className="px-4 py-3 text-center font-semibold">Last Message Sent</th>
                <th className="px-4 py-3 text-center font-semibold">Tutor Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-gray-400">
                    {students.length === 0 ? 'No students assigned to you yet.' : 'No students match your search.'}
                  </td>
                </tr>
              ) : (
                filtered.map((s, idx) => (
                  <tr key={s._id} className={`border-b hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-3 text-gray-400 font-medium">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{s.name}</div>
                      <div className="text-xs text-gray-400">{s.email}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">
                      {s.examDate || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.daysLeft === null ? (
                        <span className="text-gray-300">—</span>
                      ) : s.daysLeft === 0 ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">Today!</span>
                      ) : s.daysLeft < 0 ? (
                        <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-semibold">{Math.abs(s.daysLeft)}d passed</span>
                      ) : (
                        <span className={`font-bold text-xs ${s.daysLeft <= 7 ? 'text-red-500' : s.daysLeft <= 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {s.daysLeft}d left
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-800">
                      {s.targetScore || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.onTrackToday
                        ? <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">✅ Yes</span>
                        : <span className="px-2 py-1 bg-red-50 text-red-500 rounded-full text-xs font-semibold">❌ No</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-800">{s.totalQsDone}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${s.errorsLogged > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {s.errorsLogged}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${s.redoPending > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                        {s.redoPending}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500 text-xs">
                      {s.lastMessageSent || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 text-xs max-w-[160px] truncate">
                      {s.tutorNotes || <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
