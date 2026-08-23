'use client'
import { useEffect, useMemo, useState } from 'react'
import { FiClipboard, FiSearch, FiClock, FiHelpCircle } from 'react-icons/fi'
import { apiGet } from '../_components/api'
import { PageHeader, Card, Loading, Table, Badge, EmptyState, ErrorState } from '../_components/ui'

export default function TestsPage() {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const t = await apiGet('/api/admin/tests')
        setTests(Array.isArray(t) ? t : [])
      } catch (e) { setError(e.message) } finally { setLoading(false) }
    })()
  }, [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return tests
    return tests.filter((t) => (t.title || '').toLowerCase().includes(needle))
  }, [tests, q])

  if (loading) return <Loading label="Loading tests…" />

  const typeOf = (t) => t.testType || (t.sections ? 'Adaptive' : 'Standard')

  return (
    <div>
      <PageHeader title="Tests" subtitle={`${tests.length} adaptive & standard assessments in the catalog.`} />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      <Card>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-800">Test Catalog</h3>
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tests…"
              className="w-64 rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <Table
          columns={[
            { label: 'Test' }, { label: 'Type' }, { label: 'Subject' },
            { label: 'Questions', align: 'right' }, { label: 'Duration', align: 'right' }, { label: 'Status', align: 'right' },
          ]}
          empty={filtered.length === 0 && <EmptyState icon={FiClipboard} title="No tests found" hint="Adaptive and standard tests will show up here." />}
        >
          {filtered.map((t) => (
            <tr key={t._id} className="hover:bg-slate-50/60">
              <td className="px-4 py-3 font-semibold text-slate-800">{t.title || 'Untitled test'}</td>
              <td className="px-4 py-3"><Badge tone="blue">{typeOf(t)}</Badge></td>
              <td className="px-4 py-3 text-slate-600">{t.subject || (t.sections ? 'R&W · Math' : '—')}</td>
              <td className="px-4 py-3 text-right text-slate-700"><span className="inline-flex items-center gap-1"><FiHelpCircle size={13} className="text-slate-300" />{t.totalQuestions ?? '—'}</span></td>
              <td className="px-4 py-3 text-right text-slate-700"><span className="inline-flex items-center gap-1"><FiClock size={13} className="text-slate-300" />{t.duration ? `${t.duration}m` : '—'}</span></td>
              <td className="px-4 py-3 text-right">{t.isActive === false ? <Badge tone="slate">Draft</Badge> : <Badge tone="green">Active</Badge>}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}
