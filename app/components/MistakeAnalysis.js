'use client'
import { useMemo } from 'react'
import { FiAlertTriangle, FiClock, FiZap, FiSlash, FiTarget, FiTrendingUp } from 'react-icons/fi'
import { buildMistakeAnalysis, MISTAKE_KINDS, shortDomain } from '../../lib/mistakeAnalysis'

// Why marks are being lost, not just how many. Shared by the student's own
// Progress page and the admin/tutor view of that student, so both read the
// same diagnosis.
const TONE = {
  amber: { chip: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', icon: FiZap },
  rose: { chip: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', icon: FiClock },
  violet: { chip: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500', icon: FiTarget },
  slate: { chip: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400', icon: FiSlash },
}

const DIFF_TONE = {
  Easy: 'bg-emerald-500',
  Medium: 'bg-amber-500',
  Hard: 'bg-rose-500',
}

function fmtSecs(s) {
  if (s == null) return '—'
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

export default function MistakeAnalysis({ rows, subtitle, forWhom = 'you' }) {
  const a = useMemo(() => buildMistakeAnalysis(rows), [rows])
  const possessive = forWhom === 'you' ? 'your' : `${forWhom}'s`

  if (!a.totalSeen) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <FiAlertTriangle className="text-amber-500" /> Mistake Analysis
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          Answer some questions and this will show exactly where — and why — marks are being lost.
        </p>
      </div>
    )
  }

  const kindOrder = ['concept', 'rushed', 'steady', 'skipped']

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <FiAlertTriangle className="text-amber-500" /> Mistake Analysis
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">
            {subtitle || `Why ${possessive} marks are being lost, across every question answered.`}
          </p>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{a.totalLost}</p>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">marks lost</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-emerald-600">{a.accuracy ?? '—'}%</p>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">accuracy</p>
          </div>
        </div>
      </div>

      {/* The single most useful thing to change. */}
      <div className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
        <p className="text-sm font-semibold text-indigo-900">{a.headline}</p>
      </div>

      {/* How the losses break down. */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kindOrder.map((key) => {
          const kind = MISTAKE_KINDS[key]
          const tone = TONE[kind.tone]
          const Icon = tone.icon
          const count = a.kinds[key] || 0
          const share = a.totalLost ? Math.round((count / a.totalLost) * 100) : 0
          return (
            <div key={key} className={`rounded-xl border p-3 ${tone.chip}`}>
              <div className="flex items-center justify-between">
                <Icon size={16} />
                <span className="text-xs font-semibold opacity-70">{share}%</span>
              </div>
              <p className="mt-2 text-xl font-extrabold">{count}</p>
              <p className="text-xs font-bold">{kind.label}</p>
              <p className="mt-1 text-[11px] leading-snug opacity-80">{kind.blurb}</p>
            </div>
          )
        })}
      </div>

      {/* Foundations vs reach. */}
      <div className="mb-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Accuracy by difficulty</p>
        <div className="space-y-2">
          {['Easy', 'Medium', 'Hard'].map((d) => {
            const s = a.byDifficulty[d]
            if (!s || !s.seen) return null
            return (
              <div key={d} className="flex items-center gap-3">
                <span className="w-14 flex-shrink-0 text-xs font-semibold text-slate-600">{d}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${DIFF_TONE[d]}`} style={{ width: `${s.accuracy ?? 0}%` }} />
                </div>
                <span className="w-24 flex-shrink-0 text-right text-xs text-slate-500">
                  <span className="font-bold text-slate-700">{s.accuracy ?? '—'}%</span> of {s.seen}
                </span>
              </div>
            )
          })}
        </div>
        {a.byDifficulty.Easy?.seen >= 5 && a.byDifficulty.Easy.accuracy != null
          && a.byDifficulty.Hard?.accuracy != null
          && a.byDifficulty.Easy.accuracy < a.byDifficulty.Hard.accuracy + 10 && (
          <p className="mt-2 text-[11px] text-amber-700">
            Easy questions are not clearly ahead of hard ones — that points at concentration, not content.
          </p>
        )}
      </div>

      {/* Where the marks actually go. */}
      {a.weakest.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Costing the most marks
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-2 font-semibold">Skill</th>
                  <th className="py-2 px-2 text-right font-semibold">Lost</th>
                  <th className="py-2 px-2 text-right font-semibold">Accuracy</th>
                  <th className="py-2 pl-2 text-right font-semibold">Avg time</th>
                </tr>
              </thead>
              <tbody>
                {a.weakest.slice(0, 6).map((s) => (
                  <tr key={s.skill} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 pr-2">
                      <span className="font-semibold text-slate-800">{s.skill}</span>
                      <span className="ml-1.5 text-[11px] text-slate-400">{shortDomain(s.domain)}</span>
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-rose-600">
                      {s.lost}
                      {s.skipped > 0 && <span className="ml-1 text-[10px] font-medium text-slate-400">({s.skipped} blank)</span>}
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-slate-700">{s.accuracy ?? '—'}%</td>
                    <td className="py-2 pl-2 text-right text-slate-500">{fmtSecs(s.avgSeconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* What to do about it. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
            <FiTarget size={13} /> What to do next
          </p>
          <ul className="space-y-1.5 text-sm text-slate-700">
            {kindOrder
              .filter((k) => (a.kinds[k] || 0) > 0)
              .sort((x, y) => a.kinds[y] - a.kinds[x])
              .slice(0, 3)
              .map((k) => (
                <li key={k} className="flex gap-2">
                  <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${TONE[MISTAKE_KINDS[k].tone].dot}`} />
                  <span>{MISTAKE_KINDS[k].advice}</span>
                </li>
              ))}
          </ul>
        </div>
        {a.strongest.length > 0 && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-700">
              <FiTrendingUp size={13} /> Already solid
            </p>
            <ul className="space-y-1 text-sm text-emerald-900">
              {a.strongest.slice(0, 3).map((s) => (
                <li key={s.skill} className="flex items-baseline justify-between gap-2">
                  <span className="truncate">{s.skill}</span>
                  <span className="flex-shrink-0 text-xs font-bold">{s.accuracy}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
