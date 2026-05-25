'use client'
import { useState, useEffect } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'

export default function ModuleTestResults() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchResults()
  }, [])

  const fetchResults = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/tutor/module-tests/results', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setResults(data)
      } else {
        setError('Failed to load results')
      }
    } catch (err) {
      setError('Failed to load results')
    } finally {
      setLoading(false)
    }
  }

  const filteredResults = results.filter(r => {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Module Test Results</h1>
          <p className="text-gray-600">View completed module test results for all students</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-100">
            <FiX /> {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by student name, email or test title..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Results ({filteredResults.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Analysis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Loading results...</td></tr>
                ) : filteredResults.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No results found</td></tr>
                ) : (
                  filteredResults.map(result => (
                    <tr key={result._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{result.studentName}</div>
                        <div className="text-xs text-gray-500">{result.studentEmail}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{result.testTitle}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${result.subject === 'Math' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                          {result.subject}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{result.totalScore}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {result.completedAt ? new Date(result.completedAt).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${result.analysisSubmitted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {result.analysisSubmitted ? 'Submitted' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
