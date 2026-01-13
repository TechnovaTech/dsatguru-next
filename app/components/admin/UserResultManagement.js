'use client'
import { useState, useEffect } from 'react'
import { FiSearch, FiBarChart, FiCheckCircle, FiUser, FiFileText } from 'react-icons/fi'

export default function UserResultManagement() {
  const [results, setResults] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resResults, resStats] = await Promise.all([
          fetch('/api/admin/user-results'),
          fetch('/api/admin/user-results/stats')
        ])
        const dataResults = resResults.ok ? await resResults.json() : []
        const dataStats = resStats.ok ? await resStats.json() : null
        setResults(Array.isArray(dataResults) ? dataResults : [])
        setStats(dataStats)
      } catch (e) {
        setResults([])
        setStats(null)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filtered = results.filter(r => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">User Result Management</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <StatCard title="Total Attempts" value={(stats?.totalAttempts ?? 0).toString()} icon={<FiFileText />} color="bg-blue-500" />
          <StatCard title="Avg Total Score" value={`${stats?.averageScore ?? 0}`} icon={<FiBarChart />} color="bg-purple-500" />
          <StatCard title="Pass Rate" value={`${stats?.passRate ?? 0}%`} icon={<FiCheckCircle />} color="bg-green-500" />
          <StatCard title="Total Students" value={(stats?.totalStudents ?? 0).toString()} icon={<FiUser />} color="bg-orange-500" />
        </div>

        <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2 flex-1">
            <FiSearch className="text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Search by student, email, or test title"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">All Types</option>
            <option value="Practice">Practice</option>
            <option value="Mock">Mock</option>
            <option value="Assessment">Assessment</option>
          </select>
          <span className="text-sm text-gray-600">Showing {filtered.length} of {results.length}</span>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">R&W Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Math Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((r) => (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.studentName}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{r.studentEmail}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{r.testTitle}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      r.testType === 'Mock' ? 'bg-purple-100 text-purple-800' :
                      r.testType === 'Practice' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>{r.testType}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-blue-600">{r.rwScore || 0}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-green-600">{r.mathScore || 0}</td>
                  <td className="px-6 py-4 text-lg font-bold text-purple-600">{r.totalScore || 0}</td>
                  <td className="px-6 py-4 text-sm">{r.duration} min</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{new Date(r.completedAt).toLocaleString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td className="px-6 py-6 text-center text-gray-500" colSpan={9}>No results match your filters</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className={`${color} text-white p-3 rounded-full`}>{icon}</div>
      </div>
    </div>
  )
}

