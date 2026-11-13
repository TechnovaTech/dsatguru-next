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
        <PageHeader eyebrow="Results" title="My Results" subtitle="Everything you have attempted, and what to work on next." />
        <EmptyState icon={FiBarChart2} title="No attempts yet"
          hint="Finish a practice set and your results and mistake analysis will appear here." />
        <div className="mt-4 text-center">
          <button onClick={() => router.push('/igcsc/practice')}
            className="inline-flex h-11 items-center gap-2 bg-cta px-5 text-sm font-medium text-on-cta transition-colors hover:bg-cta-hover">
            <FiEdit3 size={15} /> Start practising
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader eyebrow="Results" title="My Results" subtitle="Everything you have attempted, and what to work on next." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Attempts" value={s.attempts} icon={FiEdit3} tone="text-brand" />
        <Stat label="Questions" value={s.questions} icon={FiTarget} tone="text-calm" />
        <Stat label="Accuracy" value={s.accuracy != null ? `${s.accuracy}%` : '—'} icon={FiTrendingUp} tone="text-positive" />
        <Stat label="Last grade" value={s.lastGrade || '—'} icon={FiBarChart2} tone="text-star" />
      </div>

      {/* The same diagnosis the DSAT side gives its students. */}
      <div className="mb-6">
        <MistakeAnalysis rows={data.rows || []} forWhom="you" subtitle="Why marks are being lost across everything you have attempted" />
      </div>

      {(data.topics || []).length > 0 && (
        <div className="mb-6 border border-line bg-surface p-5">
          <p className="mb-3 font-code text-[11px] uppercase tracking-[0.12em] text-muted">Accuracy by topic</p>
          <div className="space-y-2">
            {data.topics.slice(0, 10).map((t) => (
              <div key={t.topic} className="flex items-center gap-3">
                <span className="w-44 flex-shrink-0 truncate text-sm text-ink-2" title={t.topic}>{t.topic}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-sunken">
                  <div className={`h-full rounded-full ${t.accuracy >= 70 ? 'bg-positive' : t.accuracy >= 50 ? 'bg-star' : 'bg-negative'}`}
                    style={{ width: `${t.accuracy ?? 0}%` }} />
                </div>
                <span className="w-20 flex-shrink-0 text-right font-code text-xs tabular-nums text-muted">
                  <span className="font-semibold text-ink">{t.accuracy ?? '—'}%</span> of {t.seen}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border border-line bg-surface p-5">
        <p className="mb-3 font-code text-[11px] uppercase tracking-[0.12em] text-muted">Your attempts</p>
        <div className="divide-y divide-line">
          {sessions.map((x) => (
            <div key={x._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{x.testTitle || 'Practice'}</p>
                <p className="font-code text-[11px] text-muted">
                  {x.completedAt ? new Date(x.completedAt).toLocaleString() : ''}
                  {x.mode === 'practice' ? ' · Practice' : ' · Test'}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-3">
                <span className="font-code text-sm tabular-nums text-muted">{x.correct}/{x.total}</span>
                <span className="font-code text-sm font-semibold tabular-nums text-ink">{x.percentage}%</span>
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
    <div className="flex items-center gap-4 border border-line bg-surface p-4">
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center bg-sunken ${tone}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="font-code text-xl font-medium tabular-nums text-ink">{value ?? '—'}</p>
        <p className="truncate font-code text-[11px] uppercase tracking-[0.08em] text-muted">{label}</p>
      </div>
    </div>
  )
}
