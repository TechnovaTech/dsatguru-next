'use client'
import { useState, useEffect } from 'react'
import { FiSearch, FiBarChart, FiCheckCircle, FiUser, FiFileText } from 'react-icons/fi'

export default function UserResultManagement() {
  const [results, setResults] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [error, setError] = useState(null)

  useEffect(() => { setPage(1) }, [search, typeFilter, pageSize])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const [resResults, resStats] = await Promise.all([
        fetch('/api/admin/user-results', { headers }),
        fetch('/api/admin/user-results/stats', { headers })
      ])
      if (!resResults.ok || !resStats.ok) {
        throw new Error('Failed to load user results')
      }
      const dataResults = await resResults.json()
      const dataStats = await resStats.json()
      setResults(Array.isArray(dataResults) ? dataResults : [])
      setStats(dataStats || null)
    } catch (e) {
      setResults([])
      setStats(null)
      setError('Failed to load user results. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = (results || []).filter(r => {
    const q = search.trim().toLowerCase()
    const matchesSearch = q
      ? (
        (r.studentName || '').toLowerCase().includes(q) ||
        (r.studentEmail || '').toLowerCase().includes(q) ||
        (r.testTitle || '').toLowerCase().includes(q)
      )
      : true
    const matchesType = typeFilter ? (r.testType || '') === typeFilter : true
    return matchesSearch && matchesType
  })

  // Client-side pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIdx = (currentPage - 1) * pageSize
  const paginated = filtered.slice(startIdx, startIdx + pageSize)

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">User Result Management</h1>
        </div>

        {error && (
          <div role="alert" className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
            <span className="text-sm text-rose-700">{error}</span>
            <button
              onClick={fetchData}
              className="rounded-lg bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Attempts" value={(stats?.totalAttempts ?? 0).toString()} icon={<FiFileText />} grad="from-blue-500 to-blue-600" />
          <StatCard title="Avg Total Score" value={`${stats?.averageScore ?? 0}`} icon={<FiBarChart />} grad="from-violet-500 to-violet-600" />
          <StatCard title="Pass Rate" value={`${stats?.passRate ?? 0}%`} icon={<FiCheckCircle />} grad="from-emerald-500 to-teal-600" />
          <StatCard title="Total Students" value={(stats?.totalStudents ?? 0).toString()} icon={<FiUser />} grad="from-amber-500 to-orange-500" />
        </div>

        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <label htmlFor="result-search" className="sr-only">Search results</label>
            <input
              id="result-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
              placeholder="Search by student, email, or test title"
            />
          </div>
          <label htmlFor="result-type" className="sr-only">Filter by type</label>
          <select
            id="result-type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Types</option>
            <option value="Practice">Practice</option>
            <option value="Mock">Mock</option>
            <option value="Assessment">Assessment</option>
          </select>
          <span className="text-sm text-slate-500">Showing {filtered.length} of {results.length}</span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Student</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Email</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Test</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">R&W Score</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Math Score</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Total Score</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Duration</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((r) => (
                  <tr key={r._id} className="text-sm transition-colors hover:bg-indigo-50/40">
                    <td className="px-6 py-4 font-medium text-slate-900">{r.studentName}</td>
                    <td className="px-6 py-4 text-slate-500">{r.studentEmail}</td>
                    <td className="px-6 py-4 text-slate-700">{r.testTitle || 'Untitled Test'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        r.testType === 'Mock' ? 'bg-violet-50 text-violet-700' :
                        r.testType === 'Practice' ? 'bg-blue-50 text-blue-700' :
                        'bg-emerald-50 text-emerald-700'
                      }`}>{r.testType}</span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-blue-600">{r.rwScore || 0}</td>
                    <td className="px-6 py-4 font-semibold text-emerald-600">{r.mathScore || 0}</td>
                    <td className="px-6 py-4 text-lg font-bold text-indigo-600">{r.totalScore || 0}</td>
                    <td className="px-6 py-4 text-slate-700">{r.duration} min</td>
                    <td className="px-6 py-4 text-slate-500">{r.completedAt ? new Date(r.completedAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td className="px-6 py-12 text-center" colSpan={9}>
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiFileText size={22} /></div>
                      <p className="text-sm font-medium text-slate-500">No results match your filters</p>
                      <p className="mt-1 text-xs text-slate-400">Try adjusting your search or type filter.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <label htmlFor="result-page-size">Rows per page</label>
              <select
                id="result-page-size"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="ml-2">
                {startIdx + 1}–{Math.min(startIdx + pageSize, filtered.length)} of {filtered.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm font-medium text-slate-500">Page {currentPage} of {totalPages}</span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, grad }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${grad} opacity-10 blur-xl`} />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-extrabold text-slate-900">{value}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{title}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-white shadow-lg transition-transform group-hover:scale-110`}>{icon}</div>
      </div>
    </div>
  )
}

