'use client'
import { useEffect, useMemo, useState } from 'react'
import { FiSend, FiSearch, FiCheck, FiPlus } from 'react-icons/fi'
import { apiGet, apiSend } from '../_components/api'
import { PageHeader, Card, Loading, Badge, EmptyState, ErrorState } from '../_components/ui'

export default function TestAllocationPage() {
  const [tests, setTests] = useState([])
  const [students, setStudents] = useState([])
  const [testId, setTestId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState('')      // studentId currently being updated
  const [msg, setMsg] = useState('')

  const load = async () => {
    const [t, u] = await Promise.all([
      apiGet('/api/admin/tests'),
      apiGet('/api/admin/users?role=Student'),
    ])
    setTests(Array.isArray(t) ? t : [])
    setStudents(Array.isArray(u) ? u : [])
    if (Array.isArray(t) && t.length && !testId) setTestId(t[0]._id)
  }

  useEffect(() => {
    (async () => {
      try { await load() } catch (e) { setError(e.message) } finally { setLoading(false) }
    })()
  }, [])

  const isAssigned = (s) => (s.assignedTests || []).map(String).includes(testId)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return students.filter((s) => !needle || `${s.name} ${s.email}`.toLowerCase().includes(needle))
  }, [students, q])

  const toggle = async (student) => {
    if (!testId) return
    const assigned = isAssigned(student)
    setBusy(student._id); setMsg(''); setError('')
    try {
      const res = await apiSend('/api/admin/students/assign-test', 'PUT', {
        studentId: student._id, testId, action: assigned ? 'remove' : 'add', showExplanation: false,
      })
      // Reflect the new assignment locally without a full refetch.
      setStudents((prev) => prev.map((s) => s._id === student._id ? { ...s, assignedTests: res.assignedTests || [] } : s))
      setMsg(`${assigned ? 'Removed from' : 'Assigned to'} ${student.name}.`)
    } catch (e) { setError(e.message) } finally { setBusy('') }
  }

  if (loading) return <Loading label="Loading allocation…" />

  const selectedTest = tests.find((t) => t._id === testId)
  const assignedCount = students.filter(isAssigned).length

  return (
    <div>
      <PageHeader title="Test Allocation" subtitle="Assign tests to students — creates an assigned session they can start." />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      {msg && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">{msg}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="1 · Choose a Test">
          <div className="p-5">
            {tests.length === 0 ? <EmptyState title="No tests to allocate" /> : (
              <>
                <select value={testId} onChange={(e) => setTestId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                  {tests.map((t) => <option key={t._id} value={t._id}>{t.title || 'Untitled test'}</option>)}
                </select>
                {selectedTest && (
                  <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Questions</span><span className="font-semibold text-slate-800">{selectedTest.totalQuestions ?? '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Duration</span><span className="font-semibold text-slate-800">{selectedTest.duration ? `${selectedTest.duration} min` : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Assigned to</span><Badge tone="indigo">{assignedCount} student{assignedCount !== 1 ? 's' : ''}</Badge></div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        <div className="lg:col-span-2">
          <Card
            title="2 · Assign to Students"
            action={
              <div className="relative">
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
                  className="w-48 rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
              </div>
            }
          >
            <div className="max-h-[520px] divide-y divide-slate-50 overflow-y-auto">
              {filtered.length === 0 && <EmptyState title="No students" />}
              {filtered.map((s) => {
                const assigned = isAssigned(s)
                return (
                  <div key={s._id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50/60">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-800">{s.name}</div>
                      <div className="truncate text-xs text-slate-400">{s.email}</div>
                    </div>
                    <button
                      disabled={busy === s._id || !testId}
                      onClick={() => toggle(s)}
                      className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                        assigned ? 'bg-emerald-100 text-emerald-700 hover:bg-rose-100 hover:text-rose-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {busy === s._id ? '…' : assigned ? <><FiCheck size={13} /> Assigned</> : <><FiPlus size={13} /> Assign</>}
                    </button>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
