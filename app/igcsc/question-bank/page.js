'use client'
import { useEffect, useState } from 'react'
import { FiDatabase, FiBookOpen } from 'react-icons/fi'
import { apiGet, apiGetSafe } from '../_components/api'
import { PageHeader, Card, Loading, Badge, EmptyState, ErrorState, StatCard } from '../_components/ui'

export default function QuestionBankPage() {
  const [banks, setBanks] = useState([])
  const [totalQ, setTotalQ] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const [b, a] = await Promise.all([
          apiGet('/api/admin/question-banks'),
          apiGetSafe('/api/admin/analytics', { totals: {} }),
        ])
        setBanks(Array.isArray(b) ? b : [])
        setTotalQ(a?.totals?.questions || 0)
      } catch (e) { setError(e.message) } finally { setLoading(false) }
    })()
  }, [])

  if (loading) return <Loading label="Loading question banks…" />

  return (
    <div>
      <PageHeader title="Question Bank" subtitle="Curated banks powering practice, adaptive and mock assessments." />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Total Questions" value={totalQ.toLocaleString()} icon={FiDatabase} tone="violet" />
        <StatCard label="Banks" value={banks.length} icon={FiBookOpen} tone="indigo" />
        <StatCard label="Active Banks" value={banks.filter((b) => b.status === 'Active').length} icon={FiBookOpen} tone="emerald" />
      </div>

      {banks.length === 0 ? (
        <Card><EmptyState icon={FiDatabase} title="No question banks yet" hint="Create a bank to start organising questions by topic." /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banks.map((b) => (
            <div key={b._id} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white"><FiDatabase size={20} /></span>
                <Badge tone={b.status === 'Active' ? 'green' : 'slate'}>{b.status || 'Active'}</Badge>
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">{b.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{b.description || 'No description provided.'}</p>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                <span>Created {b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
