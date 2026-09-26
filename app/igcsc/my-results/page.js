'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiBarChart2, FiEdit3, FiTrendingUp, FiTarget } from 'react-icons/fi'
import { apiGet } from '../_components/api'
import { PageHeader, Loading, EmptyState, ErrorState, Badge } from '../_components/ui'
import MistakeAnalysis from '../../components/MistakeAnalysis'

const GRADE_TONE = { 'A*': 'green', A: 'green', B: 'blue', C: 'amber', D: 'amber', E: 'red', U: 'red' }

export default function IgcscMyResultsPage() {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      try {
        setData(await apiGet('/api/igcsc/my-results'))
      } catch (e) { setError(e.message) } finally { setLoading(false) }
    })()
  }, [])

  if (loading) return <Loading label="Loading your results…" />
  if (error) return <ErrorState message={error} />

  const s = data?.summary || {}
  const sessions = data?.sessions || []

  if (!sessions.length) {
    return (
      <div>
        <PageHeader title="My Results" subtitle="Everything you have attempted, and what to work on next." />
        <EmptyState icon={FiBarChart2} title="No attempts yet"
          hint="Finish a practice set and your results and mistake analysis will appear here." />
        <div className="mt-4 text-center">
          <button onClick={() => router.push('/igcsc/practice')}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
            <FiEdit3 size={15} /> Start practising
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="My Results" subtitle="Everything you have attempted, and what to work on next." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Attempts" value={s.attempts} icon={FiEdit3} tone="bg-indigo-500" />
        <Stat label="Questions" value={s.questions} icon={FiTarget} tone="bg-violet-500" />
        <Stat label="Accuracy" value={s.accuracy != null ? `${s.accuracy}%` : '—'} icon={FiTrendingUp} tone="bg-emerald-500" />
        <Stat label="Last grade" value={s.lastGrade || '—'} icon={FiBarChart2} tone="bg-amber-500" />
      </div>

      {/* The same diagnosis the DSAT side gives its students. */}
      <div className="mb-6">
        <MistakeAnalysis rows={data.rows || []} forWhom="you" subtitle="Why marks are being lost across everything you have attempted" />
      </div>

      {(data.topics || []).length > 0 && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Accuracy by topic</p>
          <div className="space-y-2">
            {data.topics.slice(0, 10).map((t) => (
              <div key={t.topic} className="flex items-center gap-3">
                <span className="w-44 flex-shrink-0 truncate text-sm text-slate-700" title={t.topic}>{t.topic}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${t.accuracy >= 70 ? 'bg-emerald-500' : t.accuracy >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${t.accuracy ?? 0}%` }} />
                </div>
                <span className="w-20 flex-shrink-0 text-right text-xs text-slate-500">
                  <span className="font-bold text-slate-700">{t.accuracy ?? '—'}%</span> of {t.seen}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Your attempts</p>
        <div className="divide-y divide-slate-100">
          {sessions.map((x) => (
            <div key={x._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{x.testTitle || 'Practice'}</p>
                <p className="text-xs text-slate-500">
                  {x.completedAt ? new Date(x.completedAt).toLocaleString() : ''}
                  {x.mode === 'practice' ? ' · Practice' : ' · Test'}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-3">
                <span className="text-sm text-slate-600">{x.correct}/{x.total}</span>
                <span className="text-sm font-bold text-slate-900">{x.percentage}%</span>
                <Badge tone={GRADE_TONE[x.grade] || 'slate'}>{x.grade}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, icon: Icon, tone }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white ${tone}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-extrabold text-slate-900">{value ?? '—'}</p>
        <p className="truncate text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}
