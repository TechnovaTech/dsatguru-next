'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiSearch, FiX, FiBarChart2 } from 'react-icons/fi'

export default function ModuleTestResults() {
  const router = useRouter()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => { fetchResults() }, [])

  const fetchResults = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/tutor/module-tests/results', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setResults(await res.json())
      else setError('Failed to load results')
    } catch { setError('Failed to load results') }
    finally { setLoading(false) }
  }

  const filtered = results.filter(r => {
    if (!searchTerm) return true
    const s = searchTerm.toLowerCase()
    return (r.studentName || '').toLowerCase().includes(s) ||
      (r.studentEmail || '').toLowerCase().includes(s) ||
      (r.testTitle || '').toLowerCase().includes(s)
  })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Module Test Results</h1>
          <p className="text-gray-600">View and analyse completed module test results</p>
        </div>

        {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2"><FiX /> {error}</div>}

        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by student name, email or test title..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Results ({filtered.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module Scores</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Analysis</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No results found</td></tr>
                ) : filtered.map(r => (
                  <tr key={r._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{r.studentName}</div>
                      <div className="text-xs text-gray-500">{r.studentEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{r.testTitle}</td>
                    <td className="px-6 py-4">
                      {r.moduleScores && Object.keys(r.moduleScores).length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {Object.values(r.moduleScores).map((ms, i) => (
                            <span key={i} className="text-xs text-gray-700">
                              M{i+1} {ms.subject}: <b>{ms.correct}/{ms.total}</b> ({ms.score}%)
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{r.totalScore}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {r.completedAt ? new Date(r.completedAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${r.analysisSubmitted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {r.analysisSubmitted ? 'Submitted' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => router.push(`/admin/tutor/module-tests/results/${r.testId}?session_id=${r._id}`)}
                        className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        <FiBarChart2 /> View Analysis
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
