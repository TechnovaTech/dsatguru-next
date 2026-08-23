'use client'
import { useEffect, useMemo, useState } from 'react'
import { FiAward } from 'react-icons/fi'
import { apiGet } from '../_components/api'
import { PageHeader, Card, Loading, Table, Badge, EmptyState, ErrorState } from '../_components/ui'

export default function LeaderboardPage() {
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

  // Best score per student, ranked.
  const board = useMemo(() => {
    const byStudent = {}
    rows.forEach((r) => {
      const key = r.studentEmail || r.studentName
      if (!key) return
      const s = r.totalScore || 0
      if (!byStudent[key] || s > byStudent[key].best) {
        byStudent[key] = { name: r.studentName, email: r.studentEmail, best: s, attempts: 0 }
      }
    })
    rows.forEach((r) => {
      const key = r.studentEmail || r.studentName
      if (byStudent[key]) byStudent[key].attempts += 1
    })
    return Object.values(byStudent).filter((s) => s.best > 0).sort((a, b) => b.best - a.best)
  }, [rows])

  if (loading) return <Loading label="Loading leaderboard…" />

  const medal = ['🥇', '🥈', '🥉']

  return (
    <div>
      <PageHeader title="Leaderboard" subtitle="Top performers ranked by their highest test score." />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {board.length >= 3 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[1, 0, 2].map((idx, pos) => {
            const s = board[idx]
            if (!s) return <div key={pos} />
            const heights = ['pt-8', 'pt-2', 'pt-10']
            return (
              <div key={idx} className={`flex flex-col items-center ${heights[pos]}`}>
                <div className={`w-full rounded-2xl border p-4 text-center shadow-sm ${idx === 0 ? 'border-amber-200 bg-gradient-to-b from-amber-50 to-white' : 'border-slate-200 bg-white'}`}>
                  <div className="text-3xl">{medal[idx]}</div>
                  <div className="mt-1 truncate text-sm font-bold text-slate-800">{s.name}</div>
                  <div className="mt-1 text-2xl font-extrabold text-indigo-600">{s.best}</div>
                  <div className="text-[11px] text-slate-400">{s.attempts} attempt{s.attempts !== 1 ? 's' : ''}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Card title="Full Ranking">
        <Table
          columns={[{ label: 'Rank' }, { label: 'Student' }, { label: 'Attempts', align: 'right' }, { label: 'Best Score', align: 'right' }]}
          empty={board.length === 0 && <EmptyState icon={FiAward} title="No scores yet" hint="Students appear here after completing scored tests." />}
        >
          {board.map((s, i) => (
            <tr key={s.email || s.name} className="hover:bg-slate-50/60">
              <td className="px-4 py-3">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
              </td>
              <td className="px-4 py-3">
                <div className="font-semibold text-slate-800">{s.name}</div>
                <div className="text-xs text-slate-400">{s.email}</div>
              </td>
              <td className="px-4 py-3 text-right text-slate-600">{s.attempts}</td>
              <td className="px-4 py-3 text-right"><Badge tone={s.best >= 1200 ? 'green' : s.best >= 1000 ? 'amber' : 'blue'}>{s.best}</Badge></td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}
