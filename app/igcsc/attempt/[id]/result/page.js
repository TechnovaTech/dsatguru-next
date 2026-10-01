'use client'
// The result of one sitting: score and grade, each section, marks by topic, and
// every question with the student's answer and how it was marked. The API
// decides what may be shown - a section's marks once it is marked, mark
// schemes only once the whole attempt is final - so this page shows what it gets.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  FiArrowLeft, FiArrowRight, FiCheckSquare, FiEdit3, FiUserCheck, FiLoader, FiAlertTriangle, FiRefreshCw,
  FiRotateCcw, FiBookOpen, FiChevronDown, FiCheck, FiX, FiEye, FiPieChart, FiClock, FiInfo, FiList,
  FiMessageSquare,
} from 'react-icons/fi'
import { apiGet, apiSend } from '../../../_components/api'
import { Loading, ErrorState, Badge } from '../../../_components/ui'
import { igcscUser } from '../../../_components/auth'
import { ATTEMPT_STATUS } from '../../../../../lib/igcscStoreShared'
import { renderContent } from '../../../../components/admin/LatexRenderer'

const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50'

const POLL_MS = 5000
const GRADE_TEXT = {
  'A*': 'text-emerald-600', A: 'text-emerald-600', B: 'text-blue-600', C: 'text-amber-600',
  D: 'text-amber-600', E: 'text-rose-600', U: 'text-rose-600',
}
const MCQ_STATE = { not_started: 'Not started', in_progress: 'In progress', submitted: 'Marked' }
const WRITTEN_STATE = {
  not_started: 'Not sent for marking',
  grading: 'Being marked…',
  graded: 'Marked',
  needs_review: 'Tutor checking',
  error: 'Marking failed',
}
const MARK_CLS = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  slate: 'bg-slate-50 text-slate-500 ring-slate-200',
}

function fmtNum(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

function fmtDate(d) {
  if (!d) return ''
  const t = new Date(d)
  if (Number.isNaN(t.getTime())) return ''
  return t.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function pctOf(marks, max) {
  const m = Number(max)
  return m > 0 ? Math.round((Number(marks || 0) / m) * 100) : 0
}

function markTone(awarded, max) {
  if (!(Number(max) > 0)) return 'slate'
  if (Number(awarded) >= Number(max)) return 'green'
  if (Number(awarded) > 0) return 'amber'
  return 'red'
}

function barColor(pct) {
  if (pct >= 70) return 'bg-emerald-500'
  if (pct >= 40) return 'bg-amber-500'
  return 'bg-rose-500'
}

// Questions joined to their results. A result whose question has since left
// the bank still counts towards the mark, so it is listed too.
function buildRows(questions, results) {
  const list = Array.isArray(questions) ? questions : []
  const res = Array.isArray(results) ? results : []
  const byId = new Map(res.map((r) => [String(r.questionId), r]))
  const seen = new Set()
  const rows = list.map((q) => {
    seen.add(String(q.questionId))
    return { ...q, result: byId.get(String(q.questionId)) || null }
  })
  for (const r of res) {
    if (seen.has(String(r.questionId))) continue
    rows.push({
      questionId: String(r.questionId), n: r.n, kind: r.kind, marks: r.maxMarks, text: '',
      options: undefined, markScheme: '', finalAnswer: '', result: r, missing: true,
    })
  }
  return rows.sort((a, b) => (a.n || 0) - (b.n || 0))
}

const lostMarks = (row) => !!row.result && Number(row.result.marksAwarded || 0) < Number(row.result.maxMarks ?? row.marks ?? 0)

export default function AttemptResultPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id || '')

  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [pollError, setPollError] = useState(false)
  const [me, setMe] = useState(null)
  const [filter, setFilter] = useState('all')
  const [starting, setStarting] = useState(false)
  const [notice, setNotice] = useState('')
  const loadingRef = useRef(false)

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!id || loadingRef.current) return
    loadingRef.current = true
    try {
      const res = await apiGet(`/api/igcsc/attempts/${encodeURIComponent(id)}/result`)
      setData(res || null)
      setPollError(false)
      if (!quiet) setError('')
    } catch (e) {
      if (quiet) setPollError(true)
      else setError(e.message || 'Could not load this result.')
    } finally {
      loadingRef.current = false
    }
  }, [id])

  useEffect(() => { setMe(igcscUser()) }, [])
  useEffect(() => { load() }, [load])

  const grading = data?.attempt?.status === 'grading' || data?.attempt?.written?.state === 'grading'
  useEffect(() => {
    if (!grading) return undefined
    const t = setInterval(() => load({ quiet: true }), POLL_MS)
    return () => clearInterval(t)
  }, [grading, load])

  const rows = useMemo(() => buildRows(data?.questions, data?.attempt?.results), [data])

  const sitAgain = async () => {
    const paperId = data?.attempt?.paperId
    if (starting || !paperId) return
    setStarting(true)
    setNotice('')
    try {
      const r = await apiSend('/api/igcsc/attempts', 'POST', { paperId })
      const nextId = r?.attempt?._id
      if (!nextId) throw new Error('Could not start a new attempt. Please try again.')
      router.push(`/igcsc/attempt/${encodeURIComponent(nextId)}`)
    } catch (e) {
      setNotice(e.message)
      setStarting(false)
    }
  }

  const hub = `/igcsc/attempt/${encodeURIComponent(id)}`

  if (!data && error) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <BackLink href="/igcsc/my-tests" label="My tests" />
        <ErrorState message={error} />
        <button type="button" onClick={() => load()} className={BTN_SECONDARY}><FiRefreshCw size={15} /> Try again</button>
      </div>
    )
  }
  if (!data?.attempt) return <Loading label="Loading your result…" />

  const att = data.attempt
  const staffViewer = !!me && (me.role === 'admin' || me.role === 'tutor') && String(me.id || '') !== String(att.userId)
  const mState = att.mcq?.state || 'none'
  const wState = att.written?.state || 'none'
  const finished = att.status === 'completed' || att.status === 'needs_review'
  const status = ATTEMPT_STATUS[att.status] || { label: att.status, tone: 'slate' }
  const results = Array.isArray(att.results) ? att.results : []
  const flaggedCount = results.filter((r) => r.kind === 'written' && r.flagged).length
  const topics = (Array.isArray(data.topics) ? data.topics : [])
    .filter((t) => Number(t.max) > 0)
    .map((t) => ({ ...t, pct: pctOf(t.marks, t.max) }))
    .sort((a, b) => a.pct - b.pct || String(a.topic).localeCompare(String(b.topic)))
  const showTopics = topics.length > 1 || (topics.length === 1 && topics[0].topic !== 'General')

  // Until the attempt is final, list only what has been marked.
  const listed = finished ? rows : rows.filter((r) => r.result)
  const hasMcq = listed.some((r) => r.kind === 'mcq')
  const hasWritten = listed.some((r) => r.kind === 'written')
  const counts = {
    all: listed.length,
    lost: listed.filter(lostMarks).length,
    mcq: listed.filter((r) => r.kind === 'mcq').length,
    written: listed.filter((r) => r.kind === 'written').length,
  }
  const activeFilter = (filter === 'mcq' && !hasMcq) || (filter === 'written' && !hasWritten) ? 'all' : filter
  const shown = listed.filter((r) => (activeFilter === 'lost' ? lostMarks(r) : activeFilter === 'all' ? true : r.kind === activeFilter))
  const schemesHidden = !staffViewer && att.status !== 'completed' && listed.length > 0

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink href={hub} label="Back to test" />

      {/* Hero */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-600 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            {(att.curriculum || att.subject) && (
              <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/90">
                {[att.curriculum, att.subject].filter(Boolean).join(' · ')}
              </span>
            )}
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-indigo-700">{status.label}</span>
          </div>
          <h1 className="mt-3 break-words text-2xl font-extrabold tracking-tight sm:text-3xl">{att.paperTitle || 'Test paper'}</h1>
          {att.paperUnit && <p className="mt-1 break-words text-sm text-indigo-100 sm:text-base">{att.paperUnit}</p>}
          {staffViewer && att.userName && <p className="mt-2 text-xs text-indigo-100/90">{att.userName}&apos;s result</p>}

          {finished ? (
            <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row">
              <Ring pct={Number(att.percentage) || 0} />
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">
                  {att.provisional ? 'Provisional result' : 'Final result'}
                </p>
                <p className="mt-1 text-4xl font-extrabold tabular-nums sm:text-5xl">
                  {fmtNum(att.score)}<span className="text-2xl font-bold text-indigo-200 sm:text-3xl"> / {fmtNum(att.maxScore)}</span>
                </p>
                <p className="mt-1 text-sm text-indigo-100">
                  marks{att.completedAt ? ` · marked ${fmtDate(att.completedAt)}` : ''}
                </p>
              </div>
              {att.grade && (
                <div className="flex-shrink-0 rounded-2xl bg-white px-7 py-4 text-center shadow-md">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">IGCSE grade</p>
                  <p className={`mt-1 text-5xl font-black leading-none ${GRADE_TEXT[att.grade] || 'text-indigo-600'}`}>{att.grade}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 sm:p-5">
              <div className="flex items-start gap-3">
                {att.status === 'grading'
                  ? <FiLoader size={20} className="mt-0.5 flex-shrink-0 animate-spin" />
                  : <FiClock size={20} className="mt-0.5 flex-shrink-0" />}
                <div className="min-w-0">
                  <p className="text-base font-bold">{staffViewer ? 'This result is not ready yet' : 'Your result is not ready yet'}</p>
                  <p className="mt-0.5 text-sm text-indigo-100">
                    {att.status === 'grading'
                      ? 'The written answers are being marked. This usually takes under two minutes.'
                      : staffViewer
                        ? 'Not every section is finished yet. Here is what is done so far.'
                        : 'Finish every section to get your final mark and grade. Here is what is done so far.'}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <Link href={hub} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50">
                  Go to the test <FiArrowRight size={15} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {pollError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">
          <FiAlertTriangle size={14} /> Could not refresh just now. Retrying…
        </div>
      )}

      {att.provisional && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3.5 text-sm text-violet-900">
          <FiUserCheck size={18} className="mt-0.5 flex-shrink-0 text-violet-600" />
          <span>
            <span className="font-semibold">
              {flaggedCount
                ? `A tutor is checking ${flaggedCount} answer${flaggedCount === 1 ? '' : 's'}`
                : 'A tutor is checking some answers'}
            </span>
            {' '}— your mark may change.
          </span>
        </div>
      )}

      {/* Sections */}
      {(mState !== 'none' || wState !== 'none') && (
        <div className={`mb-6 grid gap-4 ${mState !== 'none' && wState !== 'none' ? 'sm:grid-cols-2' : ''}`}>
          {mState !== 'none' && (
            <SectionScore
              letter="A"
              title="Online MCQ"
              icon={FiCheckSquare}
              score={att.mcq.score}
              max={att.mcq.max}
              statusLabel={MCQ_STATE[mState] || mState}
              note={att.mcq.score != null
                ? `${att.mcq.correct ?? 0} of ${att.mcq.count} correct${att.mcq.autoSubmitted ? ' · submitted when time ran out' : ''}`
                : mState === 'in_progress' ? `${att.mcq.answered} of ${att.mcq.count} answered so far` : `${att.mcq.count} questions`}
            />
          )}
          {wState !== 'none' && (
            <SectionScore
              letter="B"
              title="Written"
              icon={FiEdit3}
              score={att.written.score}
              max={att.written.max}
              statusLabel={WRITTEN_STATE[wState] || wState}
              busy={wState === 'grading'}
              warn={wState === 'error'}
              note={wState === 'needs_review'
                ? 'A tutor is confirming some marks'
                : wState === 'graded'
                  ? att.written.reviewedBy ? `Checked by ${att.written.reviewedBy}` : 'Marked against the mark scheme'
                  : wState === 'error' ? att.written.error || 'Marking failed' : `${att.written.count} questions`}
            />
          )}
        </div>
      )}

      {/* Topics */}
      {showTopics && (
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <FiPieChart size={16} className="text-indigo-500" /> Marks by topic
            </h2>
            <span className="text-xs text-slate-400">Weakest first</span>
          </div>
          <div className="mt-4 space-y-3.5">
            {topics.map((t) => (
              <div key={t.topic}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-semibold text-slate-700">{t.topic}</span>
                  <span className="flex-shrink-0 tabular-nums text-slate-500">
                    {fmtNum(t.marks)} / {fmtNum(t.max)} <span className="font-semibold text-slate-700">· {t.pct}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${barColor(t.pct)}`} style={{ width: `${Math.max(2, Math.min(100, t.pct))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Questions */}
      <section className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
            <FiList size={16} className="text-indigo-500" /> Question by question
          </h2>
          {listed.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={activeFilter === 'all'} onClick={() => setFilter('all')} label="All" count={counts.all} />
              <FilterChip active={activeFilter === 'lost'} onClick={() => setFilter('lost')} label="Lost marks" count={counts.lost} />
              {hasMcq && hasWritten && (
                <>
                  <FilterChip active={activeFilter === 'mcq'} onClick={() => setFilter('mcq')} label="MCQ" count={counts.mcq} />
                  <FilterChip active={activeFilter === 'written'} onClick={() => setFilter('written')} label="Written" count={counts.written} />
                </>
              )}
            </div>
          )}
        </div>

        {schemesHidden && (
          <p className="mb-3 flex items-start gap-2 rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs text-slate-600">
            <FiInfo size={14} className="mt-0.5 flex-shrink-0" />
            Mark schemes appear here once your result is final.
          </p>
        )}

        {listed.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-700">Nothing marked yet</p>
            <p className="mt-1 text-xs text-slate-400">Your answers appear here as soon as a section is marked.</p>
          </div>
        ) : shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
            {activeFilter === 'lost' ? 'Full marks on every question here. Well done!' : 'Nothing to show for this filter.'}
          </div>
        ) : (
          <div className="space-y-4">
            {shown.map((row) => (
              <QuestionCard key={row.questionId} row={row} writtenState={wState} />
            ))}
          </div>
        )}
      </section>

      {notice && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <FiAlertTriangle size={17} className="mt-0.5 flex-shrink-0" />
          <span className="min-w-0 flex-1">{notice}</span>
          <button type="button" onClick={() => setNotice('')} className="flex-shrink-0 rounded-lg p-1 opacity-60 hover:opacity-100" aria-label="Dismiss">
            <FiX size={16} />
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
        {staffViewer ? (
          <>
            <Link href="/igcsc/grading" className={BTN_SECONDARY}><FiArrowLeft size={15} /> Back to marking</Link>
            {wState !== 'none' && (
              <Link href={`/igcsc/grading/${encodeURIComponent(att._id)}`} className={BTN_PRIMARY}>
                <FiUserCheck size={15} /> Review marking
              </Link>
            )}
          </>
        ) : (
          <>
            <Link href="/igcsc/my-tests" className={BTN_SECONDARY}><FiArrowLeft size={15} /> Back to my tests</Link>
            {att.status === 'completed' && (
              <button type="button" onClick={sitAgain} disabled={starting} className={BTN_PRIMARY}>
                {starting ? <FiLoader className="animate-spin" size={15} /> : <FiRotateCcw size={15} />} Sit again
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Pieces (module scope, so they keep their state across renders) ───

function BackLink({ href, label }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-indigo-700">
      <FiArrowLeft size={15} /> {label}
    </Link>
  )
}

function Ring({ pct }) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0))
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-32 w-32 flex-shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#ffffff"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p / 100)}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold tabular-nums">{p}%</span>
      </div>
    </div>
  )
}

function SectionScore({ letter, title, icon: Icon, score, max, statusLabel, note, busy = false, warn = false }) {
  const marked = score != null
  const pct = marked ? pctOf(score, max) : 0
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-sm">
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-500">Section {letter}</p>
            <p className="text-sm font-bold text-slate-900">{title}</p>
          </div>
        </div>
        <Badge tone={warn ? 'red' : busy ? 'blue' : marked ? 'green' : 'slate'}>{statusLabel}</Badge>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-3xl font-extrabold tabular-nums text-slate-900">
          {marked ? fmtNum(score) : '—'}<span className="text-lg font-bold text-slate-400"> / {fmtNum(max)}</span>
        </p>
        {marked && <span className="text-sm font-bold text-slate-500">{pct}%</span>}
        {busy && <FiLoader size={18} className="animate-spin text-blue-500" />}
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        {marked && <div className={`h-full rounded-full ${barColor(pct)}`} style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />}
      </div>
      {note && <p className={`mt-2 text-xs ${warn ? 'text-rose-600' : 'text-slate-500'}`}>{note}</p>}
    </div>
  )
}

function FilterChip({ active, onClick, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${active
        ? 'bg-indigo-600 text-white shadow-sm'
        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
    >
      {label} <span className={active ? 'text-indigo-200' : 'text-slate-400'}>{count}</span>
    </button>
  )
}

function QuestionCard({ row, writtenState }) {
  const [open, setOpen] = useState(false)
  const r = row.result
  const max = Number(r?.maxMarks ?? row.marks ?? 0)
  const awarded = Number(r?.marksAwarded || 0)
  const tone = r ? markTone(awarded, max) : 'slate'
  const isMcq = row.kind === 'mcq'
  const options = Array.isArray(row.options) ? row.options : []
  const selected = String(r?.selected || '')
  const answerKey = String(r?.correctAnswer || '')
  const hasScheme = !!(row.markScheme || row.finalAnswer)

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl bg-slate-900 px-2 text-sm font-bold text-white">
            {row.n ?? '?'}
          </span>
          <Badge tone={isMcq ? 'indigo' : 'blue'}>{isMcq ? 'MCQ' : 'Written'}</Badge>
          {r?.overridden && <Badge tone="violet">Adjusted by tutor</Badge>}
        </div>
        <span className={`flex-shrink-0 rounded-xl px-3 py-1 text-sm font-bold tabular-nums ring-1 ${MARK_CLS[tone]}`}>
          {r ? fmtNum(awarded) : '—'} / {fmtNum(max)}
        </span>
      </div>

      {row.missing ? (
        <p className="mt-3 text-sm italic text-slate-400">This question has since been removed from the bank. Its mark still counts.</p>
      ) : row.text ? (
        <div className="mt-3 overflow-x-auto break-words text-[15px] leading-relaxed text-slate-800">{renderContent(String(row.text))}</div>
      ) : null}

      {isMcq && (
        <div className="mt-4">
          {r && (
            <p className="mb-2.5 text-xs font-semibold text-slate-500">
              {selected ? <>You chose <span className="text-slate-800">{selected}</span></> : 'Not answered'}
              {answerKey ? <> · Correct answer <span className="text-emerald-700">{answerKey}</span></> : null}
            </p>
          )}
          {options.length > 0 && (
            <div className="space-y-2">
              {options.map((o) => {
                const isKey = !!r && o.letter === answerKey
                const isMine = !!r && o.letter === selected
                const cls = isKey
                  ? 'border-emerald-300 bg-emerald-50'
                  : isMine ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white'
                const dot = isKey
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : isMine ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-300 text-slate-600'
                return (
                  <div key={o.letter} className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${cls}`}>
                    <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold ${dot}`}>
                      {o.letter}
                    </span>
                    <div className="min-w-0 flex-1 overflow-x-auto break-words pt-0.5 text-sm text-slate-800">{renderContent(String(o.text || ''))}</div>
                    {isKey ? (
                      <span className="inline-flex flex-shrink-0 items-center gap-1 pt-1 text-[11px] font-bold text-emerald-700">
                        <FiCheck size={13} /> {isMine ? 'Your answer' : 'Correct'}
                      </span>
                    ) : isMine ? (
                      <span className="inline-flex flex-shrink-0 items-center gap-1 pt-1 text-[11px] font-bold text-rose-700">
                        <FiX size={13} /> Your answer
                      </span>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {!isMcq && (
        r ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <FiEye size={12} /> What we read
              </p>
              {r.transcription
                ? <div className="overflow-x-auto break-words text-sm text-slate-800">{renderContent(String(r.transcription))}</div>
                : <p className="text-sm italic text-slate-400">No answer to this question was found on your pages.</p>}
            </div>
            {r.feedback && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5">
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-indigo-600">
                  <FiMessageSquare size={12} /> Feedback
                </p>
                <div className="overflow-x-auto break-words text-sm text-slate-700">{renderContent(String(r.feedback))}</div>
              </div>
            )}
            {r.flagged && (
              <div className="flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2.5 text-sm text-violet-800">
                <FiUserCheck size={15} className="mt-0.5 flex-shrink-0" />
                <span>
                  <span className="font-semibold">A tutor is checking this answer.</span>
                  {r.flagReason ? ` ${r.flagReason}` : ''}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            {writtenState === 'grading'
              ? <><FiLoader className="animate-spin text-blue-500" size={14} /> Being marked…</>
              : 'Not marked yet.'}
          </p>
        )
      )}

      {hasScheme && (
        <div className="mt-4 overflow-hidden rounded-xl border border-emerald-200">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex w-full items-center justify-between gap-2 bg-emerald-50/60 px-3.5 py-2.5 text-left text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
          >
            <span className="flex items-center gap-2"><FiBookOpen size={15} /> {isMcq ? 'Explanation' : 'Mark scheme'}</span>
            <FiChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="space-y-3 border-t border-emerald-100 px-3.5 py-3 text-sm text-slate-800">
              {row.finalAnswer && (
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">Final answer</p>
                  <div className="overflow-x-auto break-words">{renderContent(String(row.finalAnswer))}</div>
                </div>
              )}
              {row.markScheme && (
                <div>
                  {row.finalAnswer && <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">Mark scheme</p>}
                  <div className="overflow-x-auto break-words">{renderContent(String(row.markScheme))}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  )
}
