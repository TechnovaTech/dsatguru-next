'use client'
import { useState, useEffect } from 'react'
import { FiUsers, FiBarChart, FiRefreshCw, FiCheckSquare, FiRepeat, FiSearch, FiCheckCircle, FiXCircle, FiX, FiClock } from 'react-icons/fi'
import Link from 'next/link'

export default function AdaptiveTestResults() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [reassigning, setReassigning] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => { fetchSessions() }, [])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/adaptive-tests/results', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (res.ok) setSessions(await res.json())
    } catch (e) {
      console.error('Failed to fetch adaptive results:', e)
    } finally {
      setLoading(false)
    }
  }

  const showToast = (type, message) => setToast({ type, message })

  const doReassign = async () => {
    const session = confirmTarget
    if (!session) return
    setConfirmTarget(null)
    setReassigning(session._id)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/adaptive-tests/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          originalSessionId: session._id,
          originalTestId: session.testId,
          userId: session.studentId
        })
      })
      const data = await res.json()
      if (res.ok) {
        showToast('success', 'Test reassigned successfully!')
        fetchSessions()
      } else {
        showToast('error', data.error || 'Failed to reassign test')
      }
    } catch (e) {
      showToast('error', 'Failed to reassign test')
    } finally {
      setReassigning(null)
    }
  }

  // Auto-dismiss the toast after a few seconds.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // Close the confirm modal on Escape.
  useEffect(() => {
    if (!confirmTarget) return
    const onKey = (e) => { if (e.key === 'Escape') setConfirmTarget(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmTarget])

  const filtered = sessions.filter(s =>
    !search.trim() ||
    (s.studentName || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.studentEmail || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.testTitle || '').toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => { setPage(1) }, [search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pageSessions = filtered.slice(startIndex, startIndex + PAGE_SIZE)

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"><FiBarChart size={18} /></span>
              Adaptive Test Results
            </h1>
            <p className="mt-1 text-sm text-slate-500">Review completed adaptive test sessions and reassign as needed.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <label htmlFor="adaptive-results-search" className="sr-only">Search student or test</label>
              <input
                id="adaptive-results-search"
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search student or test..."
                className="w-64 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button onClick={fetchSessions} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
              <FiRefreshCw /> Refresh
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
              <p className="mt-3 text-sm text-slate-500">Loading results...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiUsers size={22} /></div>
              <h3 className="text-base font-semibold text-slate-600">No Results Found</h3>
              <p className="mt-1 text-sm text-slate-400">No completed adaptive tests yet.</p>
            </div>
          ) : (
            <div>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Student</th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Test Title</th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Subject</th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Mode</th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Score</th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageSessions.map(session => (
                    <tr key={session._id} className="transition-colors hover:bg-indigo-50/40">
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-slate-900">{session.studentName}</div>
                        <div className="text-xs text-slate-400">{session.studentEmail}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-slate-900">{session.testTitle || 'Untitled Test'}</div>
                        {session.isReassigned && (
                          <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">Reassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                          session.subject === 'Math' ? 'bg-indigo-50 text-indigo-700' : 'bg-violet-50 text-violet-700'
                        }`}>
                          {session.subject}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          session.practiceMode === 'timed' ? 'bg-orange-50 text-orange-700'
                          : session.practiceMode === 'tutor' ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                        }`}>
                          {session.practiceMode === 'timed' ? '⏱ Timed' : session.practiceMode === 'tutor' ? '📖 Tutor' : '🕐 Untimed'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-500">
                        {session.completedAt ? new Date(session.completedAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-bold text-indigo-600">{session.totalScore} pts</div>
                        {(session.mathScore > 0 || session.rwScore > 0) && (
                          <div className="text-xs text-slate-400">M:{session.mathScore} R:{session.rwScore}</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {session.analysisSubmitted ? (
                          <span className="flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                            <FiCheckSquare className="h-3 w-3" /> Analysis Submitted
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                            Pending Analysis
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/admin/adaptive-tests/results/${session.testId}?session_id=${session._id}`}
                            className="flex items-center gap-1 text-indigo-600 transition-colors hover:text-indigo-800"
                          >
                            <FiBarChart /> View
                          </Link>
                          {session.reassignPending ? (
                            <span
                              title="Waiting for the student to take the reassigned test"
                              className="flex cursor-not-allowed items-center gap-1 text-slate-400"
                            >
                              <FiClock /> Awaiting attempt
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmTarget(session)}
                              disabled={reassigning === session._id}
                              className="flex items-center gap-1 text-amber-600 transition-colors hover:text-amber-800 disabled:opacity-50"
                            >
                              <FiRepeat /> {reassigning === session._id ? 'Reassigning...' : 'Reassign'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row">
                  <p className="text-sm text-slate-500">
                    Showing <span className="font-medium text-slate-700">{startIndex + 1}</span>
                    –<span className="font-medium text-slate-700">{Math.min(startIndex + PAGE_SIZE, filtered.length)}</span>
                    {' '}of <span className="font-medium text-slate-700">{filtered.length}</span> results
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
          )}
        </div>
      </div>

      {confirmTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setConfirmTarget(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <FiRepeat size={20} />
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900">Reassign test?</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  Reassign <span className="font-semibold text-slate-700">&ldquo;{confirmTarget.testTitle || 'this test'}&rdquo;</span> to{' '}
                  <span className="font-semibold text-slate-700">{confirmTarget.studentName || 'this student'}</span>? A new test session will be created for the student.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={doReassign}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                <FiRepeat /> Reassign
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-[60] flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {toast.type === 'success'
            ? <FiCheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600" />
            : <FiXCircle className="h-5 w-5 flex-shrink-0 text-red-600" />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} aria-label="Dismiss notification" className="ml-1 text-slate-400 transition-colors hover:text-slate-600">
            <FiX className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
