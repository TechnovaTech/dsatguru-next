'use client'
import { useEffect, useMemo, useState } from 'react'
import { FiSearch, FiTrendingUp } from 'react-icons/fi'
import { apiGet, apiGetSafe } from '../_components/api'
import { PageHeader, Card, Loading, Table, Badge, EmptyState, ErrorState } from '../_components/ui'

const ORDER = ['U', 'E', 'D', 'C', 'B', 'A', 'A*']
const gradeFromPct = (p) => p >= 90 ? 'A*' : p >= 80 ? 'A' : p >= 70 ? 'B' : p >= 60 ? 'C' : p >= 50 ? 'D' : p >= 40 ? 'E' : 'U'
const gradeTone = (g) => (['A*', 'A'].includes(g) ? 'green' : ['B', 'C'].includes(g) ? 'blue' : ['D', 'E'].includes(g) ? 'amber' : 'red')

export default function StudentTrackerPage() {
  const [students, setStudents] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const [u, s] = await Promise.all([apiGet('/api/igcsc/students'), apiGetSafe('/api/igcsc/sessions?state=completed', [])])
        setStudents(u); setSessions(Array.isArray(s) ? s : [])
      } catch (e) { setError(e.message) } finally { setLoading(false) }
    })()
  }, [])

  const stat = useMemo(() => {
    const m = {}
    sessions.forEach((r) => { const k = r.studentEmail; if (!k) return; if (!m[k]) m[k] = { sum: 0, n: 0 }; m[k].sum += r.percentage || 0; m[k].n += 1 })
    return m
  }, [sessions])

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase()
    return students.filter((s) => !n || `${s.name} ${s.email}`.toLowerCase().includes(n)).map((s) => {
      const st = stat[s.email] || { sum: 0, n: 0 }
      const avg = st.n ? Math.round(st.sum / st.n) : 0
      const cur = st.n ? gradeFromPct(avg) : '—'
      const onTrack = s.targetGrade && st.n ? ORDER.indexOf(cur) >= ORDER.indexOf(s.targetGrade) : null
      return { ...s, avg, attempts: st.n, cur, onTrack }
    })
  }, [students, stat, q])

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
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student…" className="w-64 rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
          </div>
        </div>
        <Table
          columns={[{ label: 'Student' }, { label: 'Year' }, { label: 'Tests', align: 'right' }, { label: 'Avg', align: 'right' }, { label: 'Current', align: 'right' }, { label: 'Target', align: 'right' }, { label: 'Status', align: 'right' }]}
          empty={rows.length === 0 && <EmptyState icon={FiTrendingUp} title="No students found" />}
        >
          {rows.map((s) => (
            <tr key={s._id} className="hover:bg-slate-50/60">
              <td className="px-4 py-3"><div className="font-semibold text-slate-800">{s.name}</div><div className="text-xs text-slate-400">{s.email}</div></td>
              <td className="px-4 py-3 text-slate-600">{s.yearGroup || '—'}</td>
              <td className="px-4 py-3 text-right text-slate-600">{s.attempts}</td>
              <td className="px-4 py-3 text-right font-semibold text-slate-900">{s.attempts ? `${s.avg}%` : '—'}</td>
              <td className="px-4 py-3 text-right">{s.cur === '—' ? <span className="text-slate-400">—</span> : <Badge tone={gradeTone(s.cur)}>{s.cur}</Badge>}</td>
              <td className="px-4 py-3 text-right"><Badge tone="indigo">{s.targetGrade || '—'}</Badge></td>
              <td className="px-4 py-3 text-right">{s.onTrack == null ? <span className="text-xs text-slate-400">—</span> : s.onTrack ? <Badge tone="green">On track</Badge> : <Badge tone="amber">Below</Badge>}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}
