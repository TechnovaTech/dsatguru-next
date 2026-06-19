
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiSearch, FiBarChart2, FiUser, FiActivity, FiUsers } from 'react-icons/fi'

export default function StudentAnalysisList() {
  const router = useRouter()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch('/api/admin/student-analysis', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (!res.ok) {
        throw new Error('Failed to load students')
      }
      const data = await res.json()
      setStudents(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching students:', error)
      setStudents([])
      setError('Failed to load students. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredStudents = (students || []).filter(s =>
    (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(search.toLowerCase())
  )

  // Reset to the first page whenever the search query changes.
  useEffect(() => { setPage(1) }, [search])

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pageStudents = filteredStudents.slice(startIndex, startIndex + PAGE_SIZE)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">Student Analysis</h1>
            <p className="mt-1 text-sm text-slate-500">Monitor student performance and progress</p>
          </div>
          <div className="relative">
            <label htmlFor="student-search" className="sr-only">Search students</label>
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="student-search"
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-slate-300 pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <span className="text-sm text-red-700">{error}</span>
            <button
              onClick={fetchStudents}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Tests Taken</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Tests Completed</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Active</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageStudents.map((student) => (
                  <tr key={student._id} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                          {(student.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">{student.name}</div>
                          <div className="text-sm text-slate-500">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs rounded-full ${
                        student.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {student.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-slate-600">
                      {student.totalTests}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-slate-600">
                      {student.completedTests}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {student.lastActive ? new Date(student.lastActive).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => router.push(`/admin/student-analysis/${student._id}`)}
                        className="inline-flex items-center px-3 py-1.5 border border-indigo-600 text-indigo-600 text-sm font-medium rounded-lg hover:bg-indigo-50 transition-colors"
                      >
                        <FiBarChart2 className="mr-2" />
                        Analyze
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredStudents.length === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                <FiUsers size={26} />
              </div>
              <h3 className="text-sm font-semibold text-slate-500">No students found</h3>
              <p className="mt-1 text-sm text-slate-400">
                {search ? 'No students match your search.' : 'Students will appear here once available.'}
              </p>
            </div>
          )}

          {filteredStudents.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
              <p className="text-sm text-slate-500">
                Showing <span className="font-medium text-slate-700">{startIndex + 1}</span>
                –<span className="font-medium text-slate-700">{Math.min(startIndex + PAGE_SIZE, filteredStudents.length)}</span>
                {' '}of <span className="font-medium text-slate-700">{filteredStudents.length}</span> students
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
