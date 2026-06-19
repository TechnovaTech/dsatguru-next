'use client'
import { useState, useEffect } from 'react'
import { FiUsers, FiAlertCircle, FiClock, FiCheckCircle, FiActivity } from 'react-icons/fi'
import Link from 'next/link'

export default function MasterDashboard() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/master-dashboard', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to fetch data')
      setData(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const count = (s) => data.filter((d) => d.onTrack === s).length
  const stats = [
    { label: 'Total Students', value: data.length, icon: <FiUsers />, grad: 'from-indigo-500 to-indigo-600', ring: '' },
    { label: 'Behind', value: count('Behind'), icon: <FiAlertCircle />, grad: 'from-rose-500 to-rose-600', ring: 'ring-1 ring-rose-100' },
    { label: 'At Risk', value: count('At Risk'), icon: <FiClock />, grad: 'from-amber-500 to-orange-500', ring: 'ring-1 ring-amber-100' },
    { label: 'On Track', value: count('On Track'), icon: <FiCheckCircle />, grad: 'from-emerald-500 to-teal-600', ring: 'ring-1 ring-emerald-100' },
  ]

  const headers = [
    'Student Name', 'Start Date', 'Exam Date', 'Days Left', 'Target', 'Done Today',
    "Total Q's", 'Errors', 'Redo Pending', 'Daily Target', 'On Track?', 'Last Active', 'Tutor Notes', 'Alert',
  ]

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pageData = data.slice(startIndex, startIndex + PAGE_SIZE)

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">
            Master <span className="dg-gradient-text">Student Dashboard</span>
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <span>Real-time progress for all students</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" /> Behind</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> At Risk</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> On Track</span>
          </p>
        </div>
        <span className="rounded-full bg-indigo-600 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white shadow">
          Tutor View
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={i} className={`group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl ${s.ring}`}>
            <div className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${s.grad} opacity-10 blur-xl`} />
            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${s.grad} text-white shadow-lg transition-transform group-hover:scale-110`}>
              {s.icon}
            </div>
            <div className="text-3xl font-extrabold text-slate-900">
              {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-slate-100" /> : s.value}
            </div>
            <div className="mt-1 text-xs font-medium text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="mt-8">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"><FiActivity size={16} /></span>
          <h2 className="text-lg font-bold text-slate-900">Student Overview</h2>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-600">Error: {error}</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    {headers.map((h, i) => (
                      <th key={i} className={`whitespace-nowrap px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 ${['On Track?', 'Alert'].includes(h) ? 'text-center' : ''}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading
                    ? [...Array(6)].map((_, i) => (
                        <tr key={i}>
                          <td colSpan={headers.length} className="px-4 py-4"><div className="h-8 animate-pulse rounded bg-slate-50" /></td>
                        </tr>
                      ))
                    : pageData.map((student) => (
                        <tr key={student.id} className="text-sm transition-colors hover:bg-indigo-50/40">
                          <td className="whitespace-nowrap px-4 py-4">
                            <Link href={`/admin/student-analysis/${student.id}`} className="font-bold text-slate-900 transition-colors hover:text-indigo-600">
                              {student.name}
                            </Link>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                            {student.startDate ? new Date(student.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                            {student.examDate ? new Date(student.examDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                          </td>
                          <td className={`whitespace-nowrap px-4 py-4 font-bold ${student.daysLeft !== '—' && student.daysLeft < 15 ? 'text-rose-600' : 'text-slate-700'}`}>
                            {student.daysLeft}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 font-bold text-indigo-600">{student.targetScore}</td>
                          <td className="px-4 py-4 text-center">
                            <span className={`text-base font-extrabold ${student.questionsDoneToday >= student.dailyTarget ? 'text-emerald-600' : 'text-slate-800'}`}>
                              {student.questionsDoneToday}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center font-semibold text-slate-700">{student.totalQuestionsCompleted}</td>
                          <td className="px-4 py-4 text-center font-semibold text-rose-500">{student.errorsLogged}</td>
                          <td className="px-4 py-4 text-center font-semibold text-amber-500">{student.redoPending}</td>
                          <td className="px-4 py-4 text-center font-semibold text-slate-400">{student.dailyTarget}</td>
                          <td className="px-4 py-4 text-center">
                            <span className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold ${
                              student.onTrack === 'On Track' ? 'bg-emerald-50 text-emerald-700' :
                              student.onTrack === 'At Risk' ? 'bg-amber-50 text-amber-700' :
                              'bg-rose-50 text-rose-700'
                            }`}>
                              {student.onTrack}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                            {student.lastActive ? new Date(student.lastActive).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="max-w-[200px] truncate px-4 py-4 text-xs italic text-slate-400" title={student.tutorNotes}>
                            {student.tutorNotes}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {student.alertStatus !== '—' ? (
                              <span className="inline-block animate-pulse rounded-full bg-rose-100 px-3 py-1 text-[10px] font-bold text-rose-700">{student.alertStatus}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-700">{startIndex + 1}</span>
              –<span className="font-semibold text-slate-700">{Math.min(startIndex + PAGE_SIZE, data.length)}</span>
              {' '}of <span className="font-semibold text-slate-700">{data.length}</span> students
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
