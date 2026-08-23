'use client'
import { useEffect, useMemo, useState } from 'react'
import { FiFileText, FiSearch } from 'react-icons/fi'
import { apiGet } from '../_components/api'
import { PageHeader, Card, Loading, Table, Badge, EmptyState, ErrorState } from '../_components/ui'

const gradeTone = (g) => (['A*', 'A'].includes(g) ? 'green' : ['B', 'C'].includes(g) ? 'blue' : ['D', 'E'].includes(g) ? 'amber' : 'red')

export default function TestReportPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => {
    (async () => {
      try { setRows(await apiGet('/api/igcsc/sessions?state=completed')) }
      catch (e) { setError(e.message) } finally { setLoading(false) }
    })()
  }, [])

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase()
    return rows.filter((r) => !n || `${r.studentName} ${r.studentEmail} ${r.testTitle} ${r.subject}`.toLowerCase().includes(n))
  }, [rows, q])

  if (loading) return <Loading label="Loading test reports…" />

  return (
    <div>
      <PageHeader title="Test Report" subtitle={`${rows.length} completed IGCSE test sessions.`} />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <Card>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-800">Session Results</h3>
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student, test or subject…" className="w-72 rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
          </div>
        </div>
        <Table
          columns={[{ label: 'Student' }, { label: 'Test' }, { label: 'Subject' }, { label: 'Marks', align: 'right' }, { label: 'Score', align: 'right' }, { label: 'Grade', align: 'right' }, { label: 'Date', align: 'right' }]}
          empty={filtered.length === 0 && <EmptyState icon={FiFileText} title="No results yet" />}
        >
          {filtered.map((r) => (
            <tr key={r._id} className="hover:bg-slate-50/60">
              <td className="px-4 py-3"><div className="font-semibold text-slate-800">{r.studentName}</div><div className="text-xs text-slate-400">{r.studentEmail}</div></td>
              <td className="px-4 py-3 text-slate-600">{r.testTitle}</td>
              <td className="px-4 py-3"><Badge tone="slate">{r.subject}</Badge></td>
              <td className="px-4 py-3 text-right text-slate-600">{r.marks}/{r.maxMarks}</td>
              <td className="px-4 py-3 text-right font-semibold text-slate-900">{r.percentage != null ? `${r.percentage}%` : '—'}</td>
              <td className="px-4 py-3 text-right"><Badge tone={gradeTone(r.grade)}>{r.grade}</Badge></td>
              <td className="px-4 py-3 text-right text-xs text-slate-400">{r.completedAt ? new Date(r.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}
