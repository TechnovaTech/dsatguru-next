'use client'
import { useEffect, useState } from 'react'
import { FiDatabase, FiBookOpen } from 'react-icons/fi'
import { apiGet } from '../_components/api'
import { PageHeader, Card, Loading, Badge, EmptyState, ErrorState, StatCard } from '../_components/ui'

export default function QuestionBankPage() {
  const [banks, setBanks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      try { setBanks(await apiGet('/api/igcsc/question-banks')) }
      catch (e) { setError(e.message) } finally { setLoading(false) }
    })()
  }, [])

  if (loading) return <Loading label="Loading question banks…" />
  const totalQ = banks.reduce((a, b) => a + (b.totalQuestions || 0), 0)

  return (
    <div>
      <PageHeader title="Question Bank" subtitle="IGCSE question banks by subject — powering tests and practice." />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Total Questions" value={totalQ.toLocaleString()} icon={FiDatabase} tone="violet" />
        <StatCard label="Subjects / Banks" value={banks.length} icon={FiBookOpen} tone="indigo" />
        <StatCard label="Active Banks" value={banks.filter((b) => b.status === 'Active').length} icon={FiBookOpen} tone="emerald" />
      </div>
      {banks.length === 0 ? (
        <Card><EmptyState icon={FiDatabase} title="No question banks yet" hint="Create IGCSE subject banks to organise questions." /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banks.map((b) => (
            <div key={b._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white"><FiDatabase size={20} /></span>
                <Badge tone={b.status === 'Active' ? 'green' : 'slate'}>{b.status || 'Active'}</Badge>
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">{b.title}</h3>
              {b.subject && <div className="mt-1"><Badge tone="blue">{b.subject}</Badge></div>}
              <p className="mt-2 line-clamp-2 text-sm text-slate-500">{b.description || 'No description provided.'}</p>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className="font-semibold text-slate-700">{(b.totalQuestions || 0).toLocaleString()} questions</span>
                <span className="text-slate-400">{b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
