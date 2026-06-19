'use client'
import { useState, useEffect } from 'react'
import { FiUsers, FiBarChart, FiRefreshCw, FiCheckSquare, FiClipboard } from 'react-icons/fi'
import Link from 'next/link'

export default function AdminTestResults() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch('/api/admin/admin-tests/results', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (res.ok) {
        const data = await res.json()
        setSessions(data)
      } else {
        console.error('Failed to fetch admin test results:', res.status)
      }
    } catch (error) {
      console.error('Error fetching admin test sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"><FiClipboard size={18} /></span>
              Admin Test Results
            </h1>
            <p className="mt-1 text-sm text-slate-500">Completed admin practice test sessions and their analysis status.</p>
          </div>
          <button
            onClick={fetchSessions}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            <FiRefreshCw /> Refresh
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
              <p className="mt-3 text-sm text-slate-500">Loading results...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiUsers size={22} /></div>
              <h3 className="text-base font-semibold text-slate-600">No Admin Test Sessions Found</h3>
              <p className="mt-1 text-sm text-slate-400">There are no completed admin practice tests yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Student</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Test Title</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Subject</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Score</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.map((session) => (
                    <tr key={session._id} className="transition-colors hover:bg-indigo-50/40">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm font-semibold text-slate-900">{session.studentName}</div>
                        <div className="text-xs text-slate-400">{session.studentEmail}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">{session.testTitle || 'Untitled Test'}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                          session.subject === 'Math'
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-violet-50 text-violet-700'
                        }`}>
                          {session.subject}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                        {session.completedAt ? new Date(session.completedAt).toLocaleString() : '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm font-bold text-indigo-600">
                          {session.totalScore} pts
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {session.analysisSubmitted ? (
                          <span className="flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                            <FiCheckSquare className="h-3 w-3" />
                            Analysis Submitted
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                            Pending Analysis
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <Link
                          href={`/admin/admin-tests/results/${session.testId}?session_id=${session._id}`}
                          className="flex items-center justify-end gap-1 text-indigo-600 transition-colors hover:text-indigo-800"
                        >
                          <FiBarChart /> View Analysis
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
