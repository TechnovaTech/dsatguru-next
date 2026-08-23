'use client'
import { useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts'
import { FiBarChart2, FiTarget, FiBookOpen, FiActivity } from 'react-icons/fi'
import { apiGet } from '../_components/api'
import { PageHeader, Card, Loading, StatCard, EmptyState, ErrorState } from '../_components/ui'

const BAND_COLORS = ['#f43f5e', '#f59e0b', '#6366f1', '#10b981']

export default function StudentPerformancePage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const r = await apiGet('/api/admin/user-results')
        setRows(Array.isArray(r) ? r : [])
      } catch (e) { setError(e.message) } finally { setLoading(false) }
    })()
  }, [])

  const scored = useMemo(() => rows.filter((r) => r.totalScore > 0), [rows])

  const stats = useMemo(() => {
    if (scored.length === 0) return { avg: 0, rw: 0, math: 0 }
    const sum = (k) => scored.reduce((a, r) => a + (r[k] || 0), 0)
    return {
      avg: Math.round(sum('totalScore') / scored.length),
      rw: Math.round(sum('rwScore') / scored.length),
      math: Math.round(sum('mathScore') / scored.length),
    }
  }, [scored])

  const bands = useMemo(() => {
    const b = [
      { name: '< 1000', count: 0 }, { name: '1000–1199', count: 0 },
      { name: '1200–1399', count: 0 }, { name: '1400+', count: 0 },
    ]
    scored.forEach((r) => {
      const s = r.totalScore
      if (s < 1000) b[0].count++
      else if (s < 1200) b[1].count++
      else if (s < 1400) b[2].count++
      else b[3].count++
    })
    return b
  }, [scored])

  const sectionAvg = useMemo(() => ([
    { name: 'Reading & Writing', score: stats.rw },
    { name: 'Math', score: stats.math },
  ]), [stats])

  if (loading) return <Loading label="Loading performance…" />

  return (
    <div>
      <PageHeader title="Student Performance" subtitle="Aggregate performance across all completed test sessions." />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Scored Sessions" value={scored.length} icon={FiActivity} tone="indigo" />
        <StatCard label="Avg Total" value={stats.avg || '—'} icon={FiTarget} tone="emerald" hint="out of 1600" />
        <StatCard label="Avg Reading & Writing" value={stats.rw || '—'} icon={FiBookOpen} tone="blue" hint="out of 800" />
        <StatCard label="Avg Math" value={stats.math || '—'} icon={FiBarChart2} tone="violet" hint="out of 800" />
      </div>

      {scored.length === 0 ? (
        <Card><EmptyState icon={FiBarChart2} title="No performance data" hint="Charts populate once students complete scored tests." /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Score Distribution">
            <div className="h-72 px-3 py-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bands} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {bands.map((_, i) => <Cell key={i} fill={BAND_COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Average Score by Section">
            <div className="h-72 px-3 py-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectionAvg} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 800]} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]} fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
