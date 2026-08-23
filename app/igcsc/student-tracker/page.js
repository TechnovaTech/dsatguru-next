'use client'
import { useEffect, useMemo, useState } from 'react'
import { FiSearch, FiTrendingUp } from 'react-icons/fi'
import { apiGet, apiGetSafe } from '../_components/api'
import { PageHeader, Card, Loading, Table, Badge, EmptyState, ErrorState } from '../_components/ui'

export default function StudentTrackerPage() {
  const [students, setStudents] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const [u, r] = await Promise.all([
          apiGet('/api/admin/users?role=Student'),
          apiGetSafe('/api/admin/user-results', []),
        ])
        setStudents(Array.isArray(u) ? u : [])
        setResults(Array.isArray(r) ? r : [])
      } catch (e) { setError(e.message) } finally { setLoading(false) }
    })()
  }, [])

  const byEmail = useMemo(() => {
    const m = {}
    results.forEach((r) => {
      const key = r.studentEmail
      if (!key) return
      if (!m[key]) m[key] = { best: 0, attempts: 0 }
      m[key].attempts += 1
      if ((r.totalScore || 0) > m[key].best) m[key].best = r.totalScore || 0
    })
    return m
  }, [results])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return students
      .filter((s) => !needle || `${s.name} ${s.email}`.toLowerCase().includes(needle))
      .map((s) => {
        const stat = byEmail[s.email] || { best: 0, attempts: 0 }
        const target = s.targetScore || 0
        const pct = target ? Math.min(100, Math.round((stat.best / target) * 100)) : 0
        return { ...s, best: stat.best, attempts: stat.attempts, target, pct }
      })
  }, [students, byEmail, q])

  if (loading) return <Loading label="Loading student tracker…" />

  return (
    <div>
      <PageHeader title="Student Tracker" subtitle={`Progress snapshot for ${students.length} students.`} />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      <Card>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-800">Students</h3>
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student…"
              className="w-64 rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
          </div>
        </div>

        <Table
          columns={[
            { label: 'Student' }, { label: 'Target Date' }, { label: 'Attempts', align: 'right' },
            { label: 'Best', align: 'right' }, { label: 'Target', align: 'right' }, { label: 'Progress' },
          ]}
          empty={rows.length === 0 && <EmptyState icon={FiTrendingUp} title="No students found" />}
        >
          {rows.map((s) => (
            <tr key={s._id} className="hover:bg-slate-50/60">
              <td className="px-4 py-3">
                <div className="font-semibold text-slate-800">{s.name}</div>
                <div className="text-xs text-slate-400">{s.email}</div>
              </td>
              <td className="px-4 py-3 text-slate-600">{s.targetExamDate ? new Date(s.targetExamDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
              <td className="px-4 py-3 text-right text-slate-600">{s.attempts}</td>
              <td className="px-4 py-3 text-right"><Badge tone={s.best >= 1200 ? 'green' : s.best ? 'amber' : 'slate'}>{s.best || '—'}</Badge></td>
              <td className="px-4 py-3 text-right text-slate-600">{s.target || '—'}</td>
              <td className="px-4 py-3">
                {s.target ? (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${s.pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${s.pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">{s.pct}%</span>
                  </div>
                ) : <span className="text-xs text-slate-400">No target</span>}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}
