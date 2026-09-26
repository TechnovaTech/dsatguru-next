'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FiEdit3, FiBarChart2, FiVideo, FiArrowRight, FiTarget, FiTrendingUp } from 'react-icons/fi'
import { apiGetSafe } from './api'
import { igcscUser } from './auth'
import { PageHeader, Loading, Badge } from './ui'
import { meetingState } from '../../../lib/meetingStatus'

const GRADE_TONE = { 'A*': 'green', A: 'green', B: 'blue', C: 'amber', D: 'amber', E: 'red', U: 'red' }

// What a student sees on landing: how they are doing, what is on now, and the
// one button that matters.
export default function StudentHome() {
  const [me, setMe] = useState(null)
  const [results, setResults] = useState(null)
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMe(igcscUser())
    ;(async () => {
      const [r, m] = await Promise.all([
        apiGetSafe('/api/igcsc/my-results', null),
        apiGetSafe('/api/igcsc/meetings', { meetings: [] }),
      ])
      setResults(r)
      setMeetings(m?.meetings || [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <Loading label="Loading your dashboard…" />

  const s = results?.summary || {}
  const recent = (results?.sessions || []).slice(0, 5)
  const now = new Date()
  const live = meetings.map((x) => ({ ...x, _s: meetingState(x, now) })).filter((x) => x._s.canJoin)
  const weakest = (results?.topics || []).filter((t) => t.accuracy != null).slice(0, 3)

  return (
    <div>
      <PageHeader
        title={`Welcome${me?.name ? `, ${me.name.split(' ')[0]}` : ''}`}
        subtitle="Practise from the question bank, and see exactly what to fix next."
      />

      {live.length > 0 && (
        <div className="mb-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-5">
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-900">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            A class is on right now
          </p>
          {live.slice(0, 2).map((m) => (
            <div key={m._id} className="flex flex-wrap items-center justify-between gap-3 py-1">
              <span className="text-sm font-semibold text-slate-800">{m.title}</span>
              <Link href="/igcsc/meetings"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                Join
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Questions done" value={s.questions ?? 0} icon={FiTarget} tone="bg-violet-500" />
        <Stat label="Accuracy" value={s.accuracy != null ? `${s.accuracy}%` : '—'} icon={FiTrendingUp} tone="bg-emerald-500" />
        <Stat label="Attempts" value={s.attempts ?? 0} icon={FiEdit3} tone="bg-indigo-500" />
        <Stat label="Last grade" value={s.lastGrade || '—'} icon={FiBarChart2} tone="bg-amber-500" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">Recent attempts</p>
              <Link href="/igcsc/my-results" className="text-xs font-semibold text-indigo-600 hover:underline">View all →</Link>
            </div>
            {recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                Nothing yet — your first practice set will show up here.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recent.map((x) => (
                  <div key={x._id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{x.testTitle || 'Practice'}</p>
                      <p className="text-xs text-slate-400">{x.completedAt ? new Date(x.completedAt).toLocaleDateString() : ''}</p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <span className="text-sm text-slate-600">{x.correct}/{x.total}</span>
                      <Badge tone={GRADE_TONE[x.grade] || 'slate'}>{x.grade}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {weakest.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
              <p className="mb-2 text-sm font-bold text-amber-900">Worth working on</p>
              <div className="space-y-1.5">
                {weakest.map((t) => (
                  <div key={t.topic} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-slate-700">{t.topic}</span>
                    <span className="flex-shrink-0 font-bold text-amber-700">{t.accuracy}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Action href="/igcsc/practice" icon={FiEdit3} title="Practice" hint="Pick a topic and answer questions" primary />
          <Action href="/igcsc/my-results" icon={FiBarChart2} title="My Results" hint="Your progress and mistake analysis" />
          <Action href="/igcsc/meetings" icon={FiVideo} title="Live Sessions" hint="Join your classes" />
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
        <p className="text-xl font-extrabold text-slate-900">{value}</p>
        <p className="truncate text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}

function Action({ href, icon: Icon, title, hint, primary }) {
  return (
    <Link href={href}
      className={`flex items-center gap-3 rounded-2xl border p-4 transition ${primary
        ? 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100'
        : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${primary ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-900">{title}</span>
        <span className="block truncate text-xs text-slate-500">{hint}</span>
      </span>
      <FiArrowRight size={15} className="flex-shrink-0 text-slate-300" />
    </Link>
  )
}
