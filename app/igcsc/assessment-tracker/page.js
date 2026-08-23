'use client'
import { useCallback, useEffect, useState } from 'react'
import { FiActivity, FiRefreshCw, FiRadio } from 'react-icons/fi'
import { apiGetSafe } from '../_components/api'
import { PageHeader, Card, Loading, Table, Badge, EmptyState, StatCard } from '../_components/ui'

export default function AssessmentTrackerPage() {
  const [active, setActive] = useState([])
  const [completed, setCompleted] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true)
    const [a, c] = await Promise.all([
      apiGetSafe('/api/admin/test-sessions/active', []),
      apiGetSafe('/api/admin/test-sessions/completed', []),
    ])
    setActive(Array.isArray(a) ? a : [])
    setCompleted(Array.isArray(c) ? c : [])
    setLoading(false); setRefreshing(false)
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(() => load(true), 25000) // live-ish refresh
    return () => clearInterval(t)
  }, [load])

  if (loading) return <Loading label="Loading tracker…" />

  return (
    <div>
      <PageHeader
        title="Assessment Tracker"
        subtitle="Live view of who is testing right now, plus recent completions."
        actions={
          <button onClick={() => load(true)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            <FiRefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Live Now" value={active.length} icon={FiRadio} tone="rose" />
        <StatCard label="Recent Completions" value={completed.length} icon={FiActivity} tone="emerald" />
        <StatCard label="Terminated" value={completed.filter((c) => c.status === 'terminated').length} icon={FiActivity} tone="amber" />
      </div>

      <div className="mb-6">
        <Card title={<span className="flex items-center gap-2">Live Sessions {active.length > 0 && <span className="flex h-2 w-2 animate-pulse rounded-full bg-rose-500" />}</span>}>
          <Table
            columns={[{ label: 'Student' }, { label: 'Test' }, { label: 'Progress' }, { label: 'Started', align: 'right' }]}
            empty={active.length === 0 && <EmptyState icon={FiRadio} title="No live sessions" hint="Students currently taking a test will show here in real time." />}
          >
            {active.map((s) => {
              const pct = s.totalQuestions ? Math.round((s.answeredQuestions / s.totalQuestions) * 100) : 0
              return (
                <tr key={s._id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3"><div className="font-semibold text-slate-800">{s.studentName}</div><div className="text-xs text-slate-400">{s.studentEmail}</div></td>
                  <td className="px-4 py-3 text-slate-600">{s.testTitle}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} /></div>
                      <span className="text-xs font-semibold text-slate-500">{s.answeredQuestions}/{s.totalQuestions}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-slate-400">{s.startTime ? new Date(s.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                </tr>
              )
            })}
          </Table>
        </Card>
      </div>

      <Card title="Recent Completions">
        <Table
          columns={[{ label: 'Student' }, { label: 'Test' }, { label: 'Total', align: 'right' }, { label: 'Status', align: 'right' }, { label: 'Finished', align: 'right' }]}
          empty={completed.length === 0 && <EmptyState icon={FiActivity} title="No completions yet" />}
        >
          {completed.map((s) => (
            <tr key={s._id} className="hover:bg-slate-50/60">
              <td className="px-4 py-3"><div className="font-semibold text-slate-800">{s.studentName}</div><div className="text-xs text-slate-400">{s.studentEmail}</div></td>
              <td className="px-4 py-3 text-slate-600">{s.testTitle}</td>
              <td className="px-4 py-3 text-right font-bold text-slate-900">{s.totalScore || '—'}</td>
              <td className="px-4 py-3 text-right">{s.status === 'terminated' ? <Badge tone="red">Terminated</Badge> : <Badge tone="green">Completed</Badge>}</td>
              <td className="px-4 py-3 text-right text-xs text-slate-400">{s.completedAt ? new Date(s.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}
