'use client'
import { useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts'
import { FiBarChart2, FiTarget, FiActivity, FiAward } from 'react-icons/fi'
import { apiGet } from '../_components/api'
import { PageHeader, Card, Loading, StatCard, EmptyState, ErrorState } from '../_components/ui'

const GRADES = ['A*', 'A', 'B', 'C', 'D', 'E', 'U']
const GRADE_COLORS = { 'A*': '#10b981', A: '#22c55e', B: '#3b82f6', C: '#6366f1', D: '#f59e0b', E: '#f97316', U: '#ef4444' }

export default function StudentPerformancePage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      try { setRows(await apiGet('/api/igcsc/sessions?state=completed')) }
      catch (e) { setError(e.message) } finally { setLoading(false) }
    })()
  }, [])

  const avg = useMemo(() => rows.length ? Math.round(rows.reduce((a, r) => a + (r.percentage || 0), 0) / rows.length) : 0, [rows])
  const topGrades = useMemo(() => rows.filter((r) => ['A*', 'A'].includes(r.grade)).length, [rows])

  const gradeDist = useMemo(() => GRADES.map((g) => ({ name: g, count: rows.filter((r) => r.grade === g).length })), [rows])
  const subjectAvg = useMemo(() => {
    const m = {}
    rows.forEach((r) => { const s = r.subject || 'General'; if (!m[s]) m[s] = { sum: 0, n: 0 }; m[s].sum += r.percentage || 0; m[s].n += 1 })
    return Object.entries(m).map(([name, v]) => ({ name, score: Math.round(v.sum / v.n) })).sort((a, b) => b.score - a.score)
  }, [rows])

  if (loading) return <Loading label="Loading performance…" />

  return (
    <div>
      <PageHeader title="Student Performance" subtitle="Aggregate IGCSE performance across all completed tests." />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Completed Tests" value={rows.length} icon={FiActivity} tone="indigo" />
        <StatCard label="Average Score" value={`${avg}%`} icon={FiTarget} tone="emerald" />
        <StatCard label="A*/A Grades" value={topGrades} icon={FiAward} tone="amber" />
        <StatCard label="Subjects" value={subjectAvg.length} icon={FiBarChart2} tone="violet" />
      </div>
      {rows.length === 0 ? (
        <Card><EmptyState icon={FiBarChart2} title="No performance data" hint="Charts populate once students complete tests." /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Grade Distribution">
            <div className="h-72 px-3 py-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeDist} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>{gradeDist.map((g) => <Cell key={g.name} fill={GRADE_COLORS[g.name]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Average Score by Subject">
            <div className="h-72 px-3 py-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectAvg} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="score" radius={[0, 6, 6, 0]} fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
