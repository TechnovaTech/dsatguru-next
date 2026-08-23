'use client'
import { useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { FiUsers, FiDatabase, FiClipboard, FiDollarSign } from 'react-icons/fi'
import { apiGetSafe } from '../_components/api'
import { PageHeader, Card, Loading, StatCard, EmptyState } from '../_components/ui'

const ROLE_COLORS = { Students: '#6366f1', Tutors: '#8b5cf6', Admins: '#0ea5e9' }
const TYPE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6']

export default function ReportsAnalyticsPage() {
  const [totals, setTotals] = useState({})
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const [a, r] = await Promise.all([
        apiGetSafe('/api/admin/analytics', { totals: {} }),
        apiGetSafe('/api/admin/user-results', []),
      ])
      setTotals(a?.totals || {})
      setResults(Array.isArray(r) ? r : [])
      setLoading(false)
    })()
  }, [])

  const roleData = useMemo(() => ([
    { name: 'Students', value: totals.students || 0 },
    { name: 'Tutors', value: totals.tutors || 0 },
    { name: 'Admins', value: totals.admins || 0 },
  ].filter((d) => d.value > 0)), [totals])

  const typeData = useMemo(() => {
    const m = {}
    results.forEach((r) => { const k = r.testType || 'Practice'; m[k] = (m[k] || 0) + 1 })
    return Object.entries(m).map(([name, count]) => ({ name, count }))
  }, [results])

  if (loading) return <Loading label="Loading reports…" />

  return (
    <div>
      <PageHeader title="Reports" subtitle="Platform-wide analytics across users, content and revenue." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Users" value={(totals.students || 0) + (totals.tutors || 0) + (totals.admins || 0)} icon={FiUsers} tone="indigo" />
        <StatCard label="Questions" value={(totals.questions || 0).toLocaleString()} icon={FiDatabase} tone="violet" />
        <StatCard label="Sessions" value={(totals.sessions || 0).toLocaleString()} icon={FiClipboard} tone="emerald" />
        <StatCard label="Revenue" value={totals.revenue ? `$${Number(totals.revenue).toLocaleString()}` : '$0'} icon={FiDollarSign} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="User Distribution">
          {roleData.length === 0 ? <EmptyState title="No users yet" /> : (
            <div className="h-72 px-3 py-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={roleData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {roleData.map((d) => <Cell key={d.name} fill={ROLE_COLORS[d.name]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Sessions by Test Type">
          {typeData.length === 0 ? <EmptyState title="No sessions yet" /> : (
            <div className="h-72 px-3 py-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {typeData.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
