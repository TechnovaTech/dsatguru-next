'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FiUsers, FiUserCheck, FiDatabase, FiClipboard, FiTarget, FiLayers, FiArrowRight } from 'react-icons/fi'
import { apiGetSafe } from './_components/api'
import { PageHeader, StatCard, Card, Loading, Table, EmptyState, Badge } from './_components/ui'

export default function IgcscDashboard() {
  const [totals, setTotals] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const [analytics, results] = await Promise.all([
        apiGetSafe('/api/admin/analytics', { totals: {} }),
        apiGetSafe('/api/admin/user-results', []),
      ])
      setTotals(analytics?.totals || {})
      setRecent(Array.isArray(results) ? results.slice(0, 8) : [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <Loading label="Loading dashboard…" />

  const t = totals || {}
  const avg = t.averageScore ? Math.round(t.averageScore) : '—'

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Live snapshot of your assessment platform." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Students" value={t.students ?? 0} icon={FiUsers} tone="indigo" />
        <StatCard label="Tutors" value={t.tutors ?? 0} icon={FiUserCheck} tone="blue" />
        <StatCard label="Questions" value={(t.questions ?? 0).toLocaleString()} icon={FiDatabase} tone="violet" />
        <StatCard label="Tests Taken" value={(t.sessions ?? 0).toLocaleString()} icon={FiClipboard} tone="emerald" />
        <StatCard label="Avg Score" value={avg} icon={FiTarget} tone="amber" hint="out of 1600" />
        <StatCard label="Enrollments" value={t.enrollments ?? 0} icon={FiLayers} tone="cyan" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card
            title="Recent Test Attempts"
            action={<Link href="/igcsc/reports" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">View all <FiArrowRight size={13} /></Link>}
          >
            <Table
              columns={[
                { label: 'Student' }, { label: 'Test' }, { label: 'Type' },
                { label: 'Score', align: 'right' },
              ]}
              empty={recent.length === 0 && <EmptyState title="No attempts yet" hint="Completed test sessions will appear here." />}
            >
              {recent.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{r.studentName}</div>
                    <div className="text-xs text-slate-400">{r.studentEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.testTitle}</td>
                  <td className="px-4 py-3"><Badge tone="blue">{r.testType}</Badge></td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{r.totalScore || '—'}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>

        <Card title="Quick Actions">
          <div className="flex flex-col divide-y divide-slate-50">
            {[
              { label: 'Manage Users', href: '/igcsc/users', icon: FiUsers },
              { label: 'Browse Question Bank', href: '/igcsc/question-bank', icon: FiDatabase },
              { label: 'Tests Catalog', href: '/igcsc/tests', icon: FiClipboard },
              { label: 'Allocate a Test', href: '/igcsc/test-allocation', icon: FiTarget },
              { label: 'Performance Reports', href: '/igcsc/analytics', icon: FiLayers },
            ].map((a) => (
              <Link key={a.href} href={a.href} className="flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><a.icon size={16} /></span>
                <span className="flex-1">{a.label}</span>
                <FiArrowRight size={15} className="text-slate-300" />
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
