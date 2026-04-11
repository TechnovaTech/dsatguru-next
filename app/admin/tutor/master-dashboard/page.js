'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../../components/AuthContext'
import { useRouter } from 'next/navigation'
import { FiRefreshCw, FiExternalLink } from 'react-icons/fi'

export default function MasterDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingNote, setEditingNote] = useState(null)
  const [noteValue, setNoteValue] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/tutor/master-dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setStudents(data.students || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const saveNote = async (studentId) => {
    setSavingNote(true)
    try {
      const token = localStorage.getItem('token')
      await fetch('/api/admin/tutor/master-dashboard', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ studentId, tutorNotes: noteValue })
      })
      setStudents(prev => prev.map(s => s._id === studentId ? { ...s, tutorNotes: noteValue } : s))
      setEditingNote(null)
    } finally {
      setSavingNote(false)
    }
  }

  const fmt = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString() : '—'
  const fmtTime = (dateStr) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const alertColor = (status) => {
    if (status === '⚠️ REACH OUT' || status === 'Behind') return 'bg-red-100 text-red-700'
    if (status === 'At Risk') return 'bg-yellow-100 text-yellow-700'
    return 'bg-green-100 text-green-700'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🏆 DSAT GURU — Master Student Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              dsatguru.com | Real-time progress for all students &nbsp;|&nbsp;
              <span className="text-red-600 font-medium">🔴 Needs Attention</span> &nbsp;
              <span className="text-yellow-600 font-medium">🟡 At Risk</span> &nbsp;
              <span className="text-green-600 font-medium">🟢 On Track</span>
            </p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">👥 Student Overview ({students.length})</h2>
          </div>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left whitespace-nowrap">Student Name</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Start Date</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Exam Date</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Days Left</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Target Score</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Questions Done Today</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Total Q's Completed</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Errors Logged</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Redo Q's Pending</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Daily Target</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">On Track?</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Last Active</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Tutor Notes</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Alert Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-gray-400">Loading...</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-gray-400">No students found</td>
                </tr>
              ) : students.map(s => (
                <tr key={s._id} className={`hover:bg-gray-50 ${s.alertStatus === '⚠️ REACH OUT' ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    <button
                      onClick={() => router.push(`/admin/tutor/students/${s._id}/performance`)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {s.name} <FiExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmt(s.startDate)}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmt(s.examDate)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {s.daysLeft !== null ? (
                      <span className={`font-semibold ${s.daysLeft <= 7 ? 'text-red-600' : s.daysLeft <= 30 ? 'text-yellow-600' : 'text-gray-700'}`}>
                        {s.daysLeft}d
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{s.targetScore ?? '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`font-semibold ${s.questionsDoneToday >= s.dailyTarget ? 'text-green-600' : s.questionsDoneToday === 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                      {s.questionsDoneToday}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{s.totalQsCompleted}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{s.errorsLogged}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={s.redoQsPending > 0 ? 'text-orange-600 font-semibold' : 'text-gray-500'}>
                      {s.redoQsPending}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{s.dailyTarget}</td>
                  <td className="px-4 py-3 text-lg whitespace-nowrap">{s.onTrack}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtTime(s.lastActive)}</td>
                  <td className="px-4 py-3 min-w-[160px]">
                    {editingNote === s._id ? (
                      <div className="flex gap-1">
                        <input
                          autoFocus
                          value={noteValue}
                          onChange={e => setNoteValue(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-xs w-full focus:ring-1 focus:ring-blue-500"
                          onKeyDown={e => { if (e.key === 'Enter') saveNote(s._id); if (e.key === 'Escape') setEditingNote(null) }}
                        />
                        <button onClick={() => saveNote(s._id)} disabled={savingNote} className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">✓</button>
                        <button onClick={() => setEditingNote(null)} className="px-2 py-1 bg-gray-200 rounded text-xs hover:bg-gray-300">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingNote(s._id); setNoteValue(s.tutorNotes || '') }}
                        className="text-left text-xs text-gray-600 hover:text-blue-600 w-full truncate max-w-[160px] block"
                        title={s.tutorNotes || 'Click to add note'}
                      >
                        {s.tutorNotes || <span className="text-gray-300 italic">+ add note</span>}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${alertColor(s.alertStatus)}`}>
                      {s.alertStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Status Legend */}
        <div className="mt-6 bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-3">📋 Status Legend & Instructions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
              <span className="text-lg">🟢</span>
              <div><div className="font-semibold text-green-800">On Track</div><div className="text-green-700 text-xs">Student is meeting or exceeding daily question targets</div></div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
              <span className="text-lg">🟡</span>
              <div><div className="font-semibold text-yellow-800">At Risk</div><div className="text-yellow-700 text-xs">Student is 10–20% below target — consider a check-in</div></div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-100">
              <span className="text-lg">🔴</span>
              <div><div className="font-semibold text-red-800">Behind</div><div className="text-red-700 text-xs">Student is &gt;20% below target — reach out immediately</div></div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg border border-orange-100">
              <span className="text-lg">⚠️</span>
              <div><div className="font-semibold text-orange-800">REACH OUT</div><div className="text-orange-700 text-xs">Alert triggered — student needs tutor intervention</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
