'use client'
import { useEffect, useMemo, useState } from 'react'
import { FiSearch, FiUsers } from 'react-icons/fi'
import { apiGet } from '../_components/api'
import { PageHeader, Card, Loading, Table, Badge, EmptyState, ErrorState, Pill } from '../_components/ui'

export default function StudentsPage() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [year, setYear] = useState('All')

  useEffect(() => {
    (async () => {
      try { setStudents(await apiGet('/api/igcsc/students')) }
      catch (e) { setError(e.message) } finally { setLoading(false) }
    })()
  }, [])

  const years = useMemo(() => ['All', ...Array.from(new Set(students.map((s) => s.yearGroup).filter(Boolean)))], [students])
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase()
    return students.filter((s) => (year === 'All' || s.yearGroup === year) && (!n || `${s.name} ${s.email}`.toLowerCase().includes(n)))
  }, [students, q, year])

  if (loading) return <Loading label="Loading students…" />

  return (
    <div>
      <PageHeader title="Students" subtitle={`${students.length} enrolled IGCSE students.`} />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap gap-1.5">
            {years.map((y) => (
              <button key={y} onClick={() => setYear(y)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${year === y ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{y}</button>
            ))}
          </div>
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="w-64 rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
          </div>
        </div>
        <Table
          columns={[{ label: '#' }, { label: 'Student' }, { label: 'Year' }, { label: 'Subjects' }, { label: 'Target' }, { label: 'Status', align: 'right' }]}
          empty={filtered.length === 0 && <EmptyState icon={FiUsers} title="No students match" />}
        >
          {filtered.map((s, i) => (
            <tr key={s._id} className="hover:bg-slate-50/60">
              <td className="px-4 py-3 text-slate-400">{i + 1}</td>
              <td className="px-4 py-3"><div className="font-semibold text-slate-800">{s.name}</div><div className="text-xs text-slate-400">{s.email}</div></td>
              <td className="px-4 py-3 text-slate-600">{s.yearGroup || '—'}</td>
              <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{(s.subjects || []).slice(0, 3).map((sub) => <Pill key={sub}>{sub}</Pill>)}</div></td>
              <td className="px-4 py-3"><Badge tone="indigo">{s.targetGrade || '—'}</Badge></td>
              <td className="px-4 py-3 text-right">{s.isActive === false ? <Badge tone="red">Inactive</Badge> : <Badge tone="green">Active</Badge>}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}
