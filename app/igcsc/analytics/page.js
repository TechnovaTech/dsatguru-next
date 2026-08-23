'use client'
import { useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { FiUsers, FiDatabase, FiClipboard, FiTarget } from 'react-icons/fi'
import { apiGetSafe } from '../_components/api'
import { PageHeader, Card, Loading, StatCard, EmptyState } from '../_components/ui'

const TYPE_COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#0ea5e9', '#ef4444']

export default function ReportsAnalyticsPage() {
  const [totals, setTotals] = useState({})
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const [a, s] = await Promise.all([
        apiGetSafe('/api/igcsc/analytics', { totals: {} }),
        apiGetSafe('/api/igcsc/sessions?state=completed', []),
      ])
      setTotals(a?.totals || {}); setSessions(Array.isArray(s) ? s : []); setLoading(false)
    })()
  }, [])

  const byType = useMemo(() => {
    const m = {}; sessions.forEach((r) => { const k = r.testType || 'Other'; m[k] = (m[k] || 0) + 1 })
    return Object.entries(m).map(([name, value]) => ({ name, value }))
  }, [sessions])
  const bySubject = useMemo(() => {
    const m = {}; sessions.forEach((r) => { const k = r.subject || 'General'; m[k] = (m[k] || 0) + 1 })
    return Object.entries(m).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  }, [sessions])

  if (loading) return <Loading label="Loading reports…" />
  const t = totals || {}

  return (
    <div>
      <PageHeader title="Reports" subtitle="Platform-wide IGCSE analytics across students, content and results." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Students" value={t.students ?? 0} icon={FiUsers} tone="indigo" />
        <StatCard label="Questions" value={(t.questions ?? 0).toLocaleString()} icon={FiDatabase} tone="violet" />
        <StatCard label="Tests Taken" value={(t.sessions ?? 0).toLocaleString()} icon={FiClipboard} tone="emerald" />
        <StatCard label="Avg Score" value={t.avgPercentage ? `${t.avgPercentage}%` : '—'} icon={FiTarget} tone="amber" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Sessions by Assessment Type">
          {byType.length === 0 ? <EmptyState title="No sessions yet" /> : (
            <div className="h-72 px-3 py-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {byType.map((d, i) => <Cell key={d.name} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card title="Sessions by Subject">
          {bySubject.length === 0 ? <EmptyState title="No sessions yet" /> : (
            <div className="h-72 px-3 py-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySubject} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>{bySubject.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
