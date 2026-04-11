'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../components/AuthContext'
import { useRouter } from 'next/navigation'
import { FiBarChart2, FiAlertCircle, FiSave } from 'react-icons/fi'

function getWeekMonday(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

export default function ProgressMonitorPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [weekOf, setWeekOf] = useState(getWeekMonday())
  const [saving, setSaving] = useState({})
  const [edits, setEdits] = useState({})

  useEffect(() => {
    if (user && !['Tutor', 'TutorAdmin', 'Admin'].includes(user.role)) router.push('/dashboard')
  }, [user, router])

  const fetchRows = useCallback(() => {
    setLoading(true)
    const token = localStorage.getItem('token')
    fetch(`/api/tutor/progress-monitor?weekOf=${weekOf}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.rows) {
          setRows(data.rows)
          setEdits({})
        } else setError('Failed to load data')
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [weekOf])

  useEffect(() => { fetchRows() }, [fetchRows])

  const handleEdit = (studentId, field, value) => {
    setEdits(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value }
    }))
  }

  const handleSave = async (row) => {
    const sid = row.studentId.toString()
    if (!edits[sid]) return
    setSaving(prev => ({ ...prev, [sid]: true }))
    const token = localStorage.getItem('token')
    try {
      await fetch('/api/tutor/progress-monitor', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: sid, weekOf, ...edits[sid] })
      })
      setEdits(prev => { const n = { ...prev }; delete n[sid]; return n })
      fetchRows()
    } finally {
      setSaving(prev => ({ ...prev, [sid]: false }))
    }
  }

  const val = (row, field) => {
    const sid = row.studentId?.toString()
    return edits[sid]?.[field] !== undefined ? edits[sid][field] : (row[field] ?? '')
  }

  const isDirty = (row) => !!edits[row.studentId?.toString()]

  if (loading) return <div className="p-8 text-center text-gray-500">Loading progress monitor...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <FiBarChart2 className="text-blue-600 w-6 h-6" />
            <h1 className="text-2xl font-bold text-gray-900">📊 STUDENT PROGRESS MONITOR — Weekly Review</h1>
          </div>
          <p className="text-gray-500 text-sm ml-9">Fill this in weekly — use it to report to Rahul and plan your tutoring sessions</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-100">
            <FiAlertCircle /> {error}
          </div>
        )}

        {/* Week selector */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-4 flex items-center gap-4">
          <label className="text-sm font-semibold text-gray-700">Week Of:</label>
          <input
            type="date"
            value={weekOf}
            onChange={e => setWeekOf(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <span className="text-xs text-gray-400">Select the Monday of the week you are reviewing</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="px-4 py-3 text-left font-semibold">#</th>
                <th className="px-4 py-3 text-left font-semibold">Student Name</th>
                <th className="px-4 py-3 text-center font-semibold">Week Of</th>
                <th className="px-4 py-3 text-center font-semibold">Questions This Week</th>
                <th className="px-4 py-3 text-center font-semibold">Errors This Week</th>
                <th className="px-4 py-3 text-center font-semibold">Redos Completed</th>
                <th className="px-4 py-3 text-center font-semibold">On Track?</th>
                <th className="px-4 py-3 text-center font-semibold">Biggest Weakness</th>
                <th className="px-4 py-3 text-center font-semibold">Contacted Student?</th>
                <th className="px-4 py-3 text-center font-semibold">Action Taken</th>
                <th className="px-4 py-3 text-center font-semibold">Flag for Rahul?</th>
                <th className="px-4 py-3 text-center font-semibold">Save</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-gray-400">
                    No students assigned to you yet.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const sid = row.studentId?.toString()
                  const dirty = isDirty(row)
                  return (
                    <tr key={sid} className={`border-b hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-4 py-2 text-gray-400 font-medium">{idx + 1}</td>
                      <td className="px-4 py-2">
                        <div className="font-semibold text-gray-900">{row.name}</div>
                        <div className="text-xs text-gray-400">{row.email}</div>
                      </td>
                      <td className="px-4 py-2 text-center text-gray-600 text-xs">{weekOf}</td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={val(row, 'questionsThisWeek')}
                          onChange={e => handleEdit(sid, 'questionsThisWeek', e.target.value)}
                          className="w-16 text-center border border-gray-200 rounded px-1 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={val(row, 'errorsThisWeek')}
                          onChange={e => handleEdit(sid, 'errorsThisWeek', e.target.value)}
                          className="w-16 text-center border border-gray-200 rounded px-1 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={val(row, 'redosCompleted')}
                          onChange={e => handleEdit(sid, 'redosCompleted', e.target.value)}
                          className="w-16 text-center border border-gray-200 rounded px-1 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <select
                          value={val(row, 'onTrack')}
                          onChange={e => handleEdit(sid, 'onTrack', e.target.value)}
                          className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                          <option value="">—</option>
                          <option value="Yes">✅ Yes</option>
                          <option value="Partial">⚠️ Partial</option>
                          <option value="No">❌ No</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="text"
                          value={val(row, 'biggestWeakness')}
                          onChange={e => handleEdit(sid, 'biggestWeakness', e.target.value)}
                          placeholder="e.g. Algebra"
                          className="w-28 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <select
                          value={val(row, 'contactedStudent')}
                          onChange={e => handleEdit(sid, 'contactedStudent', e.target.value)}
                          className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                          <option value="">—</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="text"
                          value={val(row, 'actionTaken')}
                          onChange={e => handleEdit(sid, 'actionTaken', e.target.value)}
                          placeholder="e.g. Sent redo sheet"
                          className="w-36 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={!!val(row, 'flagForRahul')}
                          onChange={e => handleEdit(sid, 'flagForRahul', e.target.checked)}
                          className="w-4 h-4 accent-red-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => handleSave(row)}
                          disabled={!dirty || saving[sid]}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${dirty ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                        >
                          <FiSave className="w-3 h-3" />
                          {saving[sid] ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
