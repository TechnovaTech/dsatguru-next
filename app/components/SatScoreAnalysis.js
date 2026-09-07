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
import { useMemo, useState } from 'react'
import { FiBookOpen, FiTarget, FiAward, FiInfo, FiClock, FiXCircle, FiCheckCircle, FiSlash, FiZap, FiBarChart2, FiList } from 'react-icons/fi'
import { TbMathSymbols } from 'react-icons/tb'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend as RLegend, Cell,
  ScatterChart, Scatter, ZAxis,
} from 'recharts'
import {
  buildSatBreakdown, radarData, takeaway, highlights, BANDS, SUBJECT_MATH,
  unitRows, proficiencyPoints, comparisonRows, formatDuration, STATUS, normalizeRow,
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

/* ---------------------------------------------- score-report style sections */

const CHART_TIP = { fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }
const AXIS_TICK = { fontSize: 10, fill: '#64748b' }
// Bar colour follows the same band thresholds as the dots, so the charts and the
// tables can never tell different stories about the same number.
const barColour = (pct) => (BANDS.find((b) => pct >= b.min) || BANDS[BANDS.length - 1]).bar

function Panel({ title, subtitle, icon, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-800">{icon}{title}</div>
      {subtitle && <p className="mb-2 text-xs leading-relaxed text-slate-500">{subtitle}</p>}
      {children}
    </div>
  )
}

// "Unit Level Analysis" — one card per content domain.
function UnitCards({ units }) {
  if (!units.length) return null
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {units.map((u) => (
        <div key={u.unit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[13px] font-bold leading-snug text-slate-800">{u.short}</div>
            <span className={`mt-0.5 inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full`} style={{ backgroundColor: u.band?.dot || '#cbd5e1' }} />
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">{u.isMath ? 'Math' : 'Reading & Writing'}</div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold" style={{ color: u.band?.dot || '#334155' }}>{u.accuracy ?? '—'}%</span>
            <span className="text-[11px] text-slate-400">accuracy</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
            <div>
              <div className="text-sm font-bold text-rose-600">{u.incorrect}</div>
              <div className="text-[10px] leading-tight text-slate-400">Incorrect</div>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-500">{u.missed}</div>
              <div className="text-[10px] leading-tight text-slate-400">Missed</div>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-700">{u.avgSeconds != null ? `${u.avgSeconds}s` : '—'}</div>
              <div className="text-[10px] leading-tight text-slate-400">Avg / Qst</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function AccuracyByUnit({ units }) {
  const data = [...units].filter((u) => u.accuracy != null).sort((a, b) => a.accuracy - b.accuracy)
  if (data.length < 2) return null
  return (
    <Panel
      title="Accuracy Analysis"
      subtitle="How often each unit is answered correctly. The weakest units sit on the left — that is where practice pays most."
      icon={<FiBarChart2 className="h-4 w-4 text-indigo-500" />}
    >
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 58 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="short" tick={AXIS_TICK} interval={0} angle={-32} textAnchor="end" height={64} />
            <YAxis domain={[0, 100]} tick={AXIS_TICK} unit="%" />
            <Tooltip contentStyle={CHART_TIP} formatter={(v, _n, p) => [`${v}%  (${p.payload.correct}/${p.payload.total})`, p.payload.unit]} />
            <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
              {data.map((d) => <Cell key={d.unit} fill={barColour(d.accuracy)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}

function SpeedByUnit({ units }) {
  const data = [...units].filter((u) => u.avgSeconds != null).sort((a, b) => b.avgSeconds - a.avgSeconds)
  if (data.length < 2) return null
  return (
    <Panel
      title="Latency Analysis"
      subtitle="Average seconds spent per question in each unit. Slow AND inaccurate means the topic needs teaching; slow but accurate means it needs drilling for speed."
      icon={<FiClock className="h-4 w-4 text-blue-500" />}
    >
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 58 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="short" tick={AXIS_TICK} interval={0} angle={-32} textAnchor="end" height={64} />
            <YAxis tick={AXIS_TICK} unit="s" />
            <Tooltip contentStyle={CHART_TIP} formatter={(v, _n, p) => [`${v} sec average`, p.payload.unit]} />
            <Bar dataKey="avgSeconds" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}

// Accuracy against latency — the quadrant read that tells you WHY a unit is weak.
function Proficiency({ points }) {
  if (points.length < 2) return null
  const COLOURS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2', '#c026d3', '#65a30d']
  return (
    <Panel
      title="Proficiency Measurement"
      subtitle="Aim for the bottom-right: high accuracy, low time. Bottom-left means guessing fast; top-right means you know it but are slow; top-left needs teaching. Bubble size is the number of questions."
      icon={<FiZap className="h-4 w-4 text-violet-500" />}
    >
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 16, left: -12, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis type="number" dataKey="x" name="Accuracy" unit="%" domain={[0, 100]} tick={AXIS_TICK} label={{ value: 'Average Accuracy (%)', position: 'insideBottom', offset: -4, fontSize: 10, fill: '#64748b' }} />
            <YAxis type="number" dataKey="y" name="Avg time" unit="s" tick={AXIS_TICK} />
            <ZAxis type="number" dataKey="z" range={[120, 620]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={CHART_TIP}
              formatter={(v, n) => [n === 'Accuracy' ? `${v}%` : `${v} sec`, n]}
              labelFormatter={() => ''}
              content={({ payload }) => {
                const p = payload && payload[0] && payload[0].payload
                if (!p) return null
                return (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow">
                    <div className="font-semibold text-slate-800">{p.unit}</div>
                    <div className="text-slate-500">{p.x}% accuracy · {p.y} sec avg · {p.z} questions</div>
                  </div>
                )
              }}
            />
            <Scatter data={points}>
              {points.map((p, i) => <Cell key={p.unit} fill={COLOURS[i % COLOURS.length]} fillOpacity={0.75} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {points.map((p, i) => (
          <span key={p.unit} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOURS[i % COLOURS.length] }} />
            {p.short}
          </span>
        ))}
      </div>
    </Panel>
  )
}

function DifficultyAnalysis({ rows }) {
  const data = (rows || []).filter((d) => d.total > 0 || d.missed > 0)
  if (!data.length) return null
  return (
    <Panel
      title="Difficulty Analysis"
      subtitle="How many Easy, Medium and Hard questions were answered correctly, missed, or left blank."
      icon={<FiTarget className="h-4 w-4 text-amber-500" />}
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 16, left: 8, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={AXIS_TICK} allowDecimals={false} />
            <YAxis type="category" dataKey="difficulty" tick={{ fontSize: 11, fill: '#475569' }} width={64} />
            <Tooltip contentStyle={CHART_TIP} />
            <RLegend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="correct" name="Correct" stackId="a" fill="#16a34a" radius={[0, 0, 0, 0]} />
            <Bar dataKey="incorrect" name="Incorrect" stackId="a" fill="#dc2626" />
            <Bar dataKey="missed" name="Missed / blank" stackId="a" fill="#94a3b8" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}

// You vs the best performer vs the cohort average, per unit.
function Comparative({ rows }) {
  const acc = rows.filter((r) => r.you != null && (r.best != null || r.average != null))
  if (acc.length < 2) return null
  const speed = rows.filter((r) => r.youSeconds != null && (r.bestSeconds != null || r.averageSeconds != null))
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Panel
        title="Accuracy Comparison"
        subtitle="Your accuracy per unit next to the best performer on this test and the average of everyone who took it."
        icon={<FiBarChart2 className="h-4 w-4 text-emerald-500" />}
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={acc} layout="vertical" margin={{ top: 5, right: 16, left: 8, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={AXIS_TICK} unit="%" />
              <YAxis type="category" dataKey="short" tick={{ fontSize: 10, fill: '#475569' }} width={116} />
              <Tooltip contentStyle={CHART_TIP} formatter={(v) => `${v}%`} />
              <RLegend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="you" name="You" fill="#16a34a" radius={[0, 3, 3, 0]} />
              <Bar dataKey="best" name="Best" fill="#2563eb" radius={[0, 3, 3, 0]} />
              <Bar dataKey="average" name="Average" fill="#f59e0b" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      {speed.length >= 2 && (
        <Panel
          title="Speed Comparison"
          subtitle="Seconds per question against the quickest student and the average. Being slower is only a problem where accuracy is also low."
          icon={<FiClock className="h-4 w-4 text-blue-500" />}
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={speed} layout="vertical" margin={{ top: 5, right: 16, left: 8, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK} unit="s" />
                <YAxis type="category" dataKey="short" tick={{ fontSize: 10, fill: '#475569' }} width={116} />
                <Tooltip contentStyle={CHART_TIP} formatter={(v) => `${v} sec`} />
                <RLegend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="youSeconds" name="You" fill="#16a34a" radius={[0, 3, 3, 0]} />
                <Bar dataKey="bestSeconds" name="Best" fill="#2563eb" radius={[0, 3, 3, 0]} />
                <Bar dataKey="averageSeconds" name="Average" fill="#f59e0b" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}
    </div>
  )
}

const STATUS_STYLE = {
  [STATUS.CORRECT]: { label: 'Correct', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  [STATUS.INCORRECT]: { label: 'Incorrect', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  [STATUS.OMITTED]: { label: 'Omitted', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
  [STATUS.UNSEEN]: { label: 'Not seen', cls: 'bg-slate-50 text-slate-400 border-slate-200' },
}

// Per-question response list: what was chosen, what was right, and where it sits
// in the taxonomy. Collapsed by default because it is long.
function ResponsesTable({ rows }) {
  const [open, setOpen] = useState(false)
  const [only, setOnly] = useState('all')
  if (!rows.length) return null
  const shown = only === 'all' ? rows : rows.filter((r) => r.status === only)
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <FiList className="h-4 w-4 text-slate-400" /> Question-by-question responses
          <span className="font-normal text-slate-400">({rows.length})</span>
        </span>
        <span className="text-xs font-semibold text-indigo-600">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-2">
            {[['all', `All (${rows.length})`], ...Object.entries(STATUS_STYLE).map(([k, v]) => {
              const n = rows.filter((r) => r.status === k).length
              return n ? [k, `${v.label} (${n})`] : null
            }).filter(Boolean)].map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setOnly(k)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${only === k ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="max-h-[28rem] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2 text-left font-semibold">#</th>
                  <th className="px-3 py-2 text-center font-semibold">Response</th>
                  <th className="px-3 py-2 text-center font-semibold">Correct</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                  <th className="px-3 py-2 text-left font-semibold">Skill / Subtopic</th>
                  <th className="px-3 py-2 text-left font-semibold">Content Domain</th>
                  <th className="px-3 py-2 text-center font-semibold">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((r) => {
                  const st = STATUS_STYLE[r.status] || STATUS_STYLE[STATUS.UNSEEN]
                  return (
                    <tr key={r.number} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2 text-slate-500">{r.number}</td>
                      <td className="px-3 py-2 text-center font-mono text-xs text-slate-700">{r.response || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono text-xs font-semibold text-emerald-700">{r.correctAnswer || '—'}</td>
                      <td className="px-3 py-2"><span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${st.cls}`}>{st.label}</span></td>
                      <td className="px-3 py-2 text-[13px] text-slate-700">{r.skill || <span className="italic text-slate-400">—</span>}</td>
                      <td className="px-3 py-2 text-[13px] text-slate-500">{r.domain}</td>
                      <td className="px-3 py-2 text-center text-xs text-slate-500">{r.seconds ? `${r.seconds}s` : '—'}</td>
                    </tr>
                  )
                })}
                {!shown.length && <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-400">Nothing in this filter.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
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
  // Per-unit cohort numbers for the comparison charts:
  //   { [contentDomain]: { bestAccuracy, avgAccuracy, bestSeconds, avgSeconds } }
  cohort = null,
  // Per-question rows for the response table. Falls back to `rows` when the caller
  // has answer keys on them (the result view does).
  responses = null,
  // The response table reveals the answer key — a caller that must withhold it
  // (an auto-submitted attempt, say) sets this false.
  showResponses = true,
}) {
  const breakdown = useMemo(() => buildSatBreakdown(rows || []), [rows])
  const radar = useMemo(() => radarData(breakdown), [breakdown])
  const tip = useMemo(() => takeaway(breakdown), [breakdown])
  const hi = useMemo(() => highlights(breakdown), [breakdown])
  const units = useMemo(() => unitRows(breakdown), [breakdown])
  const prof = useMemo(() => proficiencyPoints(breakdown), [breakdown])
  const compare = useMemo(() => comparisonRows(breakdown, cohort), [breakdown, cohort])
  // Build the response list from whatever the caller gave us, keeping only rows we
  // can actually place in the taxonomy (same rule the breakdown uses).
  const responseRows = useMemo(() => {
    // `responses` may legitimately be an empty array (answer key withheld); only
    // fall back to `rows` when it was not supplied at all.
    const src = responses != null ? responses : (rows || [])
    const out = []
    src.forEach((r, i) => {
      const n = normalizeRow(r)
      if (!n) return
      out.push({
        number: i + 1,
        response: r.userAnswer ?? r.selectedAnswer ?? r.response ?? '',
        correctAnswer: r.correctAnswer ?? '',
        status: n.status,
        skill: n.skill,
        domain: n.domain,
        seconds: n.seconds,
      })
    })
    return out
  }, [responses, rows])
  const hasAnswerKeys = responseRows.some((r) => r.correctAnswer !== '' || r.response !== '')

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
  // Any of these is worth a card of its own — a non-module test has no scaled score
  // but still has a time and, once a cohort exists, a percentile.
  const hasScores = showScores && scores && (
    scores.total != null || scores.rw != null || scores.math != null
    || scores.percentile != null || scores.totalSeconds != null
  )

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
              <StatCard label="Score Range" value={`${scores.rangeLow}–${scores.rangeHigh}`} sub={scores.percentile != null ? `${scores.percentile} percentile` : 'estimated band'} />
            )}
            {scores.rangeLow == null && scores.percentile != null && (
              <StatCard label="Percentile" value={scores.percentile} sub="vs everyone who took it" />
            )}
            {breakdown.overall.totalSeconds > 0 && (
              <StatCard label="Total Time" value={formatDuration(scores.totalSeconds ?? breakdown.overall.totalSeconds)} sub={breakdown.overall.avgSeconds != null ? `${breakdown.overall.avgSeconds} sec / question` : null} />
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

      {/* Unit Level Analysis */}
      {units.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Unit Level Analysis</h3>
          <UnitCards units={units} />
        </div>
      )}

      {/* accuracy / latency / proficiency / difficulty */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AccuracyByUnit units={units} />
        <SpeedByUnit units={units} />
        <Proficiency points={prof} />
        <DifficultyAnalysis rows={breakdown.difficulty} />
      </div>

      {/* You vs Best vs Average. The heading is gated on the SAME condition the
          charts use, so it can never sit above an empty space. */}
      {compare.filter((r) => r.you != null && (r.best != null || r.average != null)).length >= 2 && (
        <div>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Comparative Analysis</h3>
          <Comparative rows={compare} />
        </div>
      )}

      {/* per-question responses — hidden whenever the answer key must be withheld */}
      {showResponses && hasAnswerKeys && <ResponsesTable rows={responseRows} />}

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
                {hi.weakest.map((w, i) => (
                  <span key={`${w.subject}|${w.domain}|${w.skill || 'other'}|${i}`} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${w.band?.bg || 'bg-slate-50'} ${w.band?.ring || 'border-slate-200'} ${w.band?.text || 'text-slate-600'}`}>
                    {w.skill || w.domain}
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
