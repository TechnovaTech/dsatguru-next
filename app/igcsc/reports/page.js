'use client'
import { useEffect, useMemo, useState } from 'react'
import { FiFileText, FiSearch } from 'react-icons/fi'
import { apiGet } from '../_components/api'
import { PageHeader, Card, Loading, Table, Badge, EmptyState, ErrorState } from '../_components/ui'

export default function TestReportPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const r = await apiGet('/api/admin/user-results')
        setRows(Array.isArray(r) ? r : [])
      } catch (e) { setError(e.message) } finally { setLoading(false) }
    })()
  }, [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((r) => `${r.studentName} ${r.studentEmail} ${r.testTitle}`.toLowerCase().includes(needle))
  }, [rows, q])

  if (loading) return <Loading label="Loading test reports…" />

  const scoreTone = (s) => (s >= 1200 ? 'green' : s >= 1000 ? 'amber' : s ? 'red' : 'slate')

  return (
    <div>
      <PageHeader title="Test Report" subtitle={`${rows.length} completed test sessions.`} />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      <Card>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-800">Session Results</h3>
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search student or test…"
              className="w-64 rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <Table
          columns={[
            { label: 'Student' }, { label: 'Test' }, { label: 'R&W', align: 'right' }, { label: 'Math', align: 'right' },
            { label: 'Total', align: 'right' }, { label: 'Correct', align: 'right' }, { label: 'Date', align: 'right' },
          ]}
          empty={filtered.length === 0 && <EmptyState icon={FiFileText} title="No results yet" hint="Completed sessions will appear here." />}
        >
          {filtered.map((r) => (
            <tr key={r._id} className="hover:bg-slate-50/60">
              <td className="px-4 py-3">
                <div className="font-semibold text-slate-800">{r.studentName}</div>
                <div className="text-xs text-slate-400">{r.studentEmail}</div>
              </td>
              <td className="px-4 py-3 text-slate-600">{r.testTitle}</td>
              <td className="px-4 py-3 text-right text-slate-700">{r.rwScore || '—'}</td>
              <td className="px-4 py-3 text-right text-slate-700">{r.mathScore || '—'}</td>
              <td className="px-4 py-3 text-right"><Badge tone={scoreTone(r.totalScore)}>{r.totalScore || '—'}</Badge></td>
              <td className="px-4 py-3 text-right text-slate-600">{r.correctAnswers}/{r.answeredQuestions}</td>
              <td className="px-4 py-3 text-right text-xs text-slate-400">{r.completedAt ? new Date(r.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}
