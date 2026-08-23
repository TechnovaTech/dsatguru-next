'use client'
import { useEffect, useMemo, useState } from 'react'
import { FiAward } from 'react-icons/fi'
import { apiGet } from '../_components/api'
import { PageHeader, Card, Loading, Table, Badge, EmptyState, ErrorState } from '../_components/ui'

const gradeTone = (g) => (['A*', 'A'].includes(g) ? 'green' : ['B', 'C'].includes(g) ? 'blue' : ['D', 'E'].includes(g) ? 'amber' : 'red')
const gradeFromPct = (p) => p >= 90 ? 'A*' : p >= 80 ? 'A' : p >= 70 ? 'B' : p >= 60 ? 'C' : p >= 50 ? 'D' : p >= 40 ? 'E' : 'U'

export default function LeaderboardPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      try { setRows(await apiGet('/api/igcsc/sessions?state=completed')) }
      catch (e) { setError(e.message) } finally { setLoading(false) }
    })()
  }, [])

  // Average percentage per student, ranked.
  const board = useMemo(() => {
    const m = {}
    rows.forEach((r) => {
      const k = r.studentEmail || r.studentName
      if (!k) return
      if (!m[k]) m[k] = { name: r.studentName, email: r.studentEmail, sum: 0, n: 0, best: 0 }
      m[k].sum += r.percentage || 0; m[k].n += 1; m[k].best = Math.max(m[k].best, r.percentage || 0)
    })
    return Object.values(m).map((s) => ({ ...s, avg: Math.round(s.sum / s.n) }))
      .filter((s) => s.n > 0).sort((a, b) => b.avg - a.avg)
  }, [rows])

  if (loading) return <Loading label="Loading leaderboard…" />
  const medal = ['🥇', '🥈', '🥉']

  return (
    <div>
      <PageHeader title="Leaderboard" subtitle="Top performers ranked by average score across all tests." />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      {board.length >= 3 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[1, 0, 2].map((idx, pos) => {
            const s = board[idx]; if (!s) return <div key={pos} />
            const pad = ['pt-8', 'pt-2', 'pt-10']
            return (
              <div key={idx} className={pad[pos]}>
                <div className={`rounded-2xl border p-4 text-center shadow-sm ${idx === 0 ? 'border-amber-200 bg-gradient-to-b from-amber-50 to-white' : 'border-slate-200 bg-white'}`}>
                  <div className="text-3xl">{medal[idx]}</div>
                  <div className="mt-1 truncate text-sm font-bold text-slate-800">{s.name}</div>
                  <div className="mt-1 text-2xl font-extrabold text-indigo-600">{s.avg}%</div>
                  <div className="text-[11px] text-slate-400">{s.n} test{s.n !== 1 ? 's' : ''}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <Card title="Full Ranking">
        <Table
          columns={[{ label: 'Rank' }, { label: 'Student' }, { label: 'Tests', align: 'right' }, { label: 'Best', align: 'right' }, { label: 'Avg', align: 'right' }, { label: 'Grade', align: 'right' }]}
          empty={board.length === 0 && <EmptyState icon={FiAward} title="No scores yet" />}
        >
          {board.map((s, i) => (
            <tr key={s.email || s.name} className="hover:bg-slate-50/60">
              <td className="px-4 py-3"><span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span></td>
              <td className="px-4 py-3"><div className="font-semibold text-slate-800">{s.name}</div><div className="text-xs text-slate-400">{s.email}</div></td>
              <td className="px-4 py-3 text-right text-slate-600">{s.n}</td>
              <td className="px-4 py-3 text-right text-slate-600">{s.best}%</td>
              <td className="px-4 py-3 text-right font-bold text-slate-900">{s.avg}%</td>
              <td className="px-4 py-3 text-right"><Badge tone={gradeTone(gradeFromPct(s.avg))}>{gradeFromPct(s.avg)}</Badge></td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}
