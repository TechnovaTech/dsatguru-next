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
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">Module Test Results</h1>
          <p className="mt-1 text-sm text-slate-500">View and analyse completed module test results</p>
        </div>

        {error && <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><FiX /> {error}</div>}

        <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <label htmlFor="results-search" className="mb-1.5 block text-sm font-medium text-slate-700">Search</label>
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input id="results-search" type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by student name, email or test title..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <h2 className="text-lg font-bold text-slate-900">Results ({filtered.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Test</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Module Scores</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Total Score</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Completed</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Analysis</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-16 text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-16 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiBarChart2 size={22} /></div>
                    <p className="text-sm font-medium text-slate-500">No results found</p>
                    <p className="mt-1 text-xs text-slate-400">Completed module tests will appear here.</p>
                  </td></tr>
                ) : filtered.map(r => (
                  <tr key={r._id} className="transition-colors hover:bg-indigo-50/40">
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-900">{r.studentName}</div>
                      <div className="text-xs text-slate-400">{r.studentEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{r.testTitle || 'Untitled Test'}</td>
                    <td className="px-6 py-4">
                      {r.moduleScores && Object.keys(r.moduleScores).length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {Object.values(r.moduleScores).map((ms, i) => (
                            <span key={i} className="text-xs text-slate-600">
                              M{i+1} {ms.subject}: <b>{ms.correct}/{ms.total}</b> ({ms.score}%)
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{r.totalScore}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {r.completedAt ? new Date(r.completedAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${r.analysisSubmitted ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {r.analysisSubmitted ? 'Submitted' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => router.push(`/admin/tutor/module-tests/results/${r.testId}?session_id=${r._id}`)}
                        className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
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
