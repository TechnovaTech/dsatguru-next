'use client'
// Shared "SAT Score Analysis" panel — the Subject -> Content Domain -> Skill
// performance breakdown, aligned to the College Board content tables.
//
// Drop it into any results or analysis screen; every screen then reports the same
// numbers in the same words. It only needs the answered questions:
//
//   <SatScoreAnalysis
//      rows={[{ subject, domain, skill, isCorrect }, ...]}
//      scores={{ total, rw, math, rangeLow, rangeHigh, percentile }}  // optional
//   />
//
// Everything else (weights, question counts, bands, takeaway) is derived in
// lib/satAnalysis.js so the logic is testable on its own.
import { useMemo } from 'react'
import { FiBookOpen, FiTarget, FiAward, FiInfo } from 'react-icons/fi'
import { TbMathSymbols } from 'react-icons/tb'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts'
import {
  buildSatBreakdown, radarData, takeaway, highlights, BANDS, SUBJECT_MATH,
} from '../../lib/satAnalysis'

/* ------------------------------------------------------------------ pieces */

// Semicircular gauge for the headline number.
function Gauge({ value, max = 1600, min = 400, label = 'Total Score' }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)))
  const R = 70
  const CX = 90
  const CY = 84
  const arc = (frac) => {
    const a = Math.PI * (1 - frac)
    return `${CX + R * Math.cos(a)} ${CY - R * Math.sin(a)}`
  }
  const large = pct > 0.5 ? 1 : 0
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 100" className="w-44">
        <path d={`M ${arc(0)} A ${R} ${R} 0 1 1 ${arc(1)}`} fill="none" stroke="#334155" strokeWidth="14" strokeLinecap="round" />
        {pct > 0.005 && (
          <path d={`M ${arc(0)} A ${R} ${R} 0 ${large} 1 ${arc(pct)}`} fill="none" stroke="#3b82f6" strokeWidth="14" strokeLinecap="round" />
        )}
      </svg>
      <div className="-mt-6 text-center">
        <div className="text-3xl font-extrabold text-white">{value == null ? '—' : value}</div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, accent = 'text-slate-900' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-center shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold leading-tight ${accent}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>}
    </div>
  )
}

function BandDot({ band }) {
  if (!band) return <span className="text-slate-300">—</span>
  return <span className="inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: band.dot }} title={`${band.label} (${band.hint})`} />
}

// Percentage + the raw fraction it came from, so a "100%" off one question is readable.
function PerfCell({ pct, correct, total }) {
  if (pct == null) return <span className="text-xs text-slate-400">not seen</span>
  const band = BANDS.find((b) => pct >= b.min) || BANDS[BANDS.length - 1]
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className="font-semibold text-slate-800">{pct}%</span>
      <span className="text-[11px] text-slate-400">{correct}/{total}</span>
      <BandDot band={band} />
    </span>
  )
}

function SubjectHeaderBar({ subject }) {
  const isMath = subject.isMath
  return (
    <div className={`flex items-center justify-between rounded-t-xl px-4 py-2.5 ${isMath ? 'bg-blue-600' : 'bg-violet-600'}`}>
      <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-white">
        {isMath ? <TbMathSymbols className="h-4 w-4" /> : <FiBookOpen className="h-4 w-4" />}
        {isMath ? 'Math' : 'Evidence-Based Reading & Writing'}
      </div>
      {subject.pct != null && (
        <div className="text-xs font-semibold text-white/90">{subject.correct}/{subject.total} correct · {subject.pct}%</div>
      )}
    </div>
  )
}

// One subject's Content Domain -> Skill table, domain cells merged across their skills.
function BreakdownTable({ subject }) {
  const rows = []
  for (const d of subject.domains) {
    const skillRows = d.skills.length ? d.skills : [{ skill: null, correct: d.correct, total: d.total, pct: d.pct, band: d.band }]
    skillRows.forEach((sk, i) => {
      rows.push({ d, sk, first: i === 0, span: skillRows.length })
    })
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <SubjectHeaderBar subject={subject} />
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <th className="px-4 py-2.5 text-left font-semibold">Content Domain</th>
              <th className="px-4 py-2.5 text-left font-semibold">Skill / Subtopic</th>
              <th className="px-3 py-2.5 text-center font-semibold">Est. Weight</th>
              <th className="px-3 py-2.5 text-center font-semibold">Questions</th>
              <th className="px-4 py-2.5 text-left font-semibold">Your Performance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <tr key={i} className="align-top transition-colors hover:bg-slate-50/70">
                {r.first && (
                  <td rowSpan={r.span} className="border-r border-slate-100 px-4 py-2.5 align-middle text-[13px] font-semibold text-slate-900">
                    {r.d.domain}
                  </td>
                )}
                <td className="px-4 py-2.5 text-[13px] text-slate-700">
                  {r.sk.skill
                    || <span className="italic text-slate-400">{r.sk.isOther ? 'Other (skill not tagged)' : 'Domain total'}</span>}
                </td>
                {r.first && (
                  <td rowSpan={r.span} className="px-3 py-2.5 text-center align-middle text-xs text-slate-500">{r.d.weight}</td>
                )}
                {r.first && (
                  <td rowSpan={r.span} className="px-3 py-2.5 text-center align-middle text-xs text-slate-500">{r.d.questions}</td>
                )}
                <td className="px-4 py-2.5">
                  <PerfCell pct={r.sk.pct} correct={r.sk.correct} total={r.sk.total} />
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">No questions answered in this section yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs shadow-sm">
      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-500"><FiInfo className="h-3.5 w-3.5" /> Legend</span>
      {BANDS.map((b) => (
        <span key={b.key} className="inline-flex items-center gap-1.5 text-slate-600">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.dot }} />
          {b.label} <span className="text-slate-400">({b.hint})</span>
        </span>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------- main */

export default function SatScoreAnalysis({
  rows,
  scores = null,
  title = 'SAT Score Analysis',
  subtitle = 'Detailed performance by Subject, Content Domain & Skill (College Board aligned)',
  className = '',
  showRadar = true,
  showScores = true,
}) {
  const breakdown = useMemo(() => buildSatBreakdown(rows || []), [rows])
  const radar = useMemo(() => radarData(breakdown), [breakdown])
  const tip = useMemo(() => takeaway(breakdown), [breakdown])
  const hi = useMemo(() => highlights(breakdown), [breakdown])

  if (!breakdown.hasData) {
    return (
      <div className={`rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm ${className}`}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FiTarget size={22} /></div>
        <p className="text-sm font-semibold text-slate-600">No topic-level data yet</p>
        <p className="mt-1 text-xs text-slate-400">Once questions are answered, the domain and skill breakdown appears here.</p>
      </div>
    )
  }

  const rw = breakdown.subjects.find((s) => !s.isMath)
  const math = breakdown.subjects.find((s) => s.isMath)
  const hasScores = showScores && scores && (scores.total != null || scores.rw != null || scores.math != null)

  return (
    <div className={`space-y-4 ${className}`}>
      {/* header + score cards */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
          {breakdown.unclassified > 0 && (
            <p className="mt-1 text-xs text-amber-700">
              {breakdown.unclassified} answered question{breakdown.unclassified > 1 ? 's are' : ' is'} not tagged to a content domain yet and {breakdown.unclassified > 1 ? 'are' : 'is'} excluded below.
            </p>
          )}
        </div>
        {hasScores && (
          <div className="flex flex-wrap gap-3">
            {scores.total != null && <StatCard label="Total Score" value={scores.total} sub="400–1600" />}
            {scores.rw != null && <StatCard label="Reading & Writing" value={scores.rw} sub="200–800" accent="text-violet-600" />}
            {scores.math != null && <StatCard label="Math" value={scores.math} sub="200–800" accent="text-blue-600" />}
            {scores.rangeLow != null && scores.rangeHigh != null && (
              <StatCard label="Score Range" value={`${scores.rangeLow}–${scores.rangeHigh}`} sub={scores.percentile ? `${scores.percentile} percentile` : 'estimated band'} />
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        {/* left: overall */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900 p-5 shadow-sm">
            <div className="mb-1 text-center text-xs font-semibold uppercase tracking-wider text-slate-300">Overall Performance</div>
            {scores?.total != null
              ? <Gauge value={scores.total} min={400} max={1600} label="Total Score" />
              : (
                <div className="py-4 text-center">
                  <div className="text-4xl font-extrabold text-white">{breakdown.overall.pct}%</div>
                  <div className="mt-1 text-xs text-slate-400">{breakdown.overall.correct} of {breakdown.overall.total} correct</div>
                </div>
              )}
          </div>

          {breakdown.subjects.map((s) => (
            <div key={s.subject} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.isMath ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'}`}>
                  {s.isMath ? <TbMathSymbols className="h-4 w-4" /> : <FiBookOpen className="h-4 w-4" />}
                </span>
                <span className="text-sm font-bold text-slate-800">{s.isMath ? 'Math' : 'Evidence-Based Reading & Writing'}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-2xl font-extrabold ${s.isMath ? 'text-blue-600' : 'text-violet-600'}`}>
                  {scores && (s.isMath ? scores.math : scores.rw) != null ? (s.isMath ? scores.math : scores.rw) : `${s.pct}%`}
                </span>
                <span className="text-xs text-slate-400">
                  {scores && (s.isMath ? scores.math : scores.rw) != null ? '/ 800' : `${s.correct}/${s.total} correct`}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${s.isMath ? 'bg-blue-500' : 'bg-violet-500'}`} style={{ width: `${s.pct ?? 0}%` }} />
              </div>
              {(() => {
                // Needs a couple of questions before calling something a strength —
                // otherwise one lucky answer wins the label.
                const best = [...s.domains].filter((d) => d.pct != null && d.total >= 2).sort((a, b) => b.pct - a.pct)[0]
                return best ? <div className="mt-2 text-[11px] text-slate-500">Strongest: {best.short} ({best.pct}%)</div> : null
              })()}
            </div>
          ))}
        </div>

        {/* right: the two breakdown tables */}
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          {rw && <BreakdownTable subject={rw} />}
          {math && <BreakdownTable subject={math} />}
        </div>
      </div>

      {/* radar + legend + takeaway */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {showRadar && radar.length >= 3 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-1 text-sm font-bold text-slate-800">Performance by Content Domain</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radar} outerRadius="72%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="domain" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} angle={90} />
                  <Tooltip
                    formatter={(v, _n, p) => [`${v}%`, p?.payload?.full || 'Score']}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Radar dataKey="score" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className={`space-y-4 ${showRadar && radar.length >= 3 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <Legend />
          {tip && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <div className="mb-1 flex items-center gap-2 text-sm font-bold text-amber-900"><FiAward className="h-4 w-4" /> Key Takeaway</div>
              <p className="text-sm leading-relaxed text-amber-900/90">{tip}</p>
            </div>
          )}
          {hi.weakest.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800"><FiTarget className="h-4 w-4 text-rose-500" /> Focus Areas</div>
              <div className="flex flex-wrap gap-2">
                {hi.weakest.map((w) => (
                  <span key={w.subject + w.skill} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${w.band?.bg || 'bg-slate-50'} ${w.band?.ring || 'border-slate-200'} ${w.band?.text || 'text-slate-600'}`}>
                    {w.skill}
                    <span className="opacity-70">{w.pct}% ({w.correct}/{w.total})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
