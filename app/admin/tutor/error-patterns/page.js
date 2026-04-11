'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../../components/AuthContext'
import { FiRefreshCw, FiSearch, FiFilter, FiXCircle } from 'react-icons/fi'

const COLUMNS = [
  { key: 'studentName', label: 'Student Name' },
  { key: 'date', label: 'Date' },
  { key: 'section', label: 'Section' },
  { key: 'topic', label: 'Topic' },
  { key: 'questionDescription', label: 'Question ID / Description' },
  { key: 'whyWrong', label: 'Why They Got It Wrong' },
  { key: 'correctRule', label: 'Correct Rule/Concept' },
  { key: 'difficulty', label: 'Difficulty' },
  { key: 'redoStatus', label: 'Redo Status' },
  { key: 'redoDate', label: 'Redo Date' },
  { key: 'redoResult', label: 'Redo Result' },
  { key: 'tutorAction', label: 'Tutor Action' },
]

export default function ErrorPatternsPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sectionFilter, setSectionFilter] = useState('All')
  const [difficultyFilter, setDifficultyFilter] = useState('All')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/tutor/error-patterns', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setRows(data.rows || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const sections = ['All', ...new Set(rows.map(r => r.section).filter(s => s && s !== '—'))]
  const difficulties = ['All', ...new Set(rows.map(r => r.difficulty).filter(d => d && d !== '—'))]

  const filtered = rows.filter(r => {
    if (sectionFilter !== 'All' && r.section !== sectionFilter) return false
    if (difficultyFilter !== 'All' && r.difficulty !== difficultyFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return (
        r.studentName?.toLowerCase().includes(s) ||
        r.topic?.toLowerCase().includes(s) ||
        r.questionDescription?.toLowerCase().includes(s) ||
        r.section?.toLowerCase().includes(s)
      )
    }
    return true
  })

  const difficultyColor = (d) => {
    if (d === 'Hard') return 'bg-red-100 text-red-700'
    if (d === 'Medium') return 'bg-yellow-100 text-yellow-700'
    if (d === 'Easy') return 'bg-green-100 text-green-700'
    return 'bg-gray-100 text-gray-600'
  }

  const redoStatusColor = (s) => {
    if (s === 'Done') return 'bg-green-100 text-green-700'
    if (s === 'Pending') return 'bg-orange-100 text-orange-700'
    return 'bg-gray-100 text-gray-500'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiXCircle className="text-red-500" /> ALL INCORRECT QUESTIONS
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Aggregated across all students — auto-populated when students log wrong answers
            </p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search student, topic, question..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-400 text-sm" />
            <span className="text-sm text-gray-500">Section:</span>
            {sections.map(s => (
              <button key={s} onClick={() => setSectionFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${sectionFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
                {s === 'Reading and Writing' ? 'R&W' : s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Difficulty:</span>
            {difficulties.map(d => (
              <button key={d} onClick={() => setDifficultyFilter(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${difficultyFilter === d ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
                {d}
              </button>
            ))}
          </div>
          <span className="ml-auto text-sm text-gray-400">{filtered.length} records</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-red-50 text-xs text-gray-600 uppercase border-b">
              <tr>
                <th className="px-3 py-3 text-left w-8">#</th>
                {COLUMNS.map(col => (
                  <th key={col.key} className="px-3 py-3 text-left whitespace-nowrap">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="px-4 py-12 text-center text-gray-400">Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="px-4 py-12 text-center text-gray-400">
                    No incorrect questions found
                  </td>
                </tr>
              ) : filtered.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-3 py-3 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">{row.studentName}</td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{row.date}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.section === 'Math' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {row.section === 'Reading and Writing' ? 'R&W' : row.section}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-700 max-w-[140px] truncate" title={row.topic}>{row.topic}</td>
                  <td className="px-3 py-3 text-gray-700 max-w-[220px]">
                    <p className="line-clamp-2 text-xs leading-relaxed" title={row.questionDescription}>{row.questionDescription}</p>
                  </td>
                  <td className="px-3 py-3 text-gray-600 max-w-[160px]">
                    <p className="line-clamp-2 text-xs" title={row.whyWrong}>{row.whyWrong}</p>
                  </td>
                  <td className="px-3 py-3 text-gray-600 max-w-[180px]">
                    <p className="line-clamp-2 text-xs" title={row.correctRule}>{row.correctRule}</p>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${difficultyColor(row.difficulty)}`}>
                      {row.difficulty}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${redoStatusColor(row.redoStatus)}`}>
                      {row.redoStatus}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">{row.redoDate}</td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">{row.redoResult}</td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">{row.tutorAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
