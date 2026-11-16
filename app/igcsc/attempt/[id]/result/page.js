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
import { Loading, ErrorState } from '../../../_components/ui'
import { Chip, BTN_PRIMARY, BTN_SECONDARY } from '../../../_components/PaperCard'
import { igcscUser } from '../../../_components/auth'
import { ATTEMPT_STATUS } from '../../../../../lib/igcscStoreShared'
import { renderContent } from '../../../../components/admin/LatexRenderer'

const POLL_MS = 5000
const GRADE_TEXT = {
  'A*': 'text-positive', A: 'text-positive', B: 'text-calm', C: 'text-star',
  D: 'text-star', E: 'text-negative', U: 'text-negative',
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
  green: 'border-positive/30 bg-[#2f7d4514] text-positive',
  amber: 'border-star/30 bg-[#b7791f14] text-star',
  red: 'border-negative/30 bg-[#b4231814] text-negative',
  slate: 'border-line bg-sunken text-muted',
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
  if (pct >= 70) return 'bg-positive'
  if (pct >= 40) return 'bg-star'
  return 'bg-negative'
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
  // Tied to whether marks actually arrived, not just to the status: the API
  // withholds the score until a tutor releases it, and this keeps the two from
  // drifting apart (an empty "— / 110" card is worse than the waiting state).
  const finished = att.score != null && (att.status === 'completed' || att.status === 'needs_review')
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

      {/* Header */}
      <header className="mb-6 border-b border-line pb-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {(att.curriculum || att.subject) && (
            <span className="font-code text-[11px] uppercase tracking-[0.12em] text-muted">
              {[att.curriculum, att.subject].filter(Boolean).join(' · ')}
            </span>
          )}
          <Chip tone={status.tone}>{status.label}</Chip>
        </div>
        <h1 className="display mt-2 break-words text-[clamp(1.7rem,3vw,2.4rem)] leading-tight text-ink">{att.paperTitle || 'Test paper'}</h1>
        {att.paperUnit && <p className="mt-1 break-words text-sm text-muted">{att.paperUnit}</p>}
        {staffViewer && att.userName && <p className="mt-2 text-xs text-muted">{att.userName}&apos;s result</p>}
      </header>

      {finished ? (
        <div className="mb-6 border border-line bg-surface p-5 sm:p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <Ring pct={Number(att.percentage) || 0} />
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="font-code text-[11px] uppercase tracking-[0.12em] text-muted">
                {att.provisional ? 'Provisional result' : 'Final result'}
              </p>
              <p className="mt-1 font-code text-4xl font-bold tabular-nums text-ink sm:text-5xl">
                {fmtNum(att.score)}<span className="text-2xl font-medium text-muted sm:text-3xl"> / {fmtNum(att.maxScore)}</span>
              </p>
              <p className="mt-1 text-sm text-muted">
                marks{att.completedAt ? ` · marked ${fmtDate(att.completedAt)}` : ''}
              </p>
            </div>
            {att.grade && (
              <div className="flex-shrink-0 border border-line bg-canvas px-7 py-4 text-center">
                <p className="font-code text-[10px] uppercase tracking-[0.16em] text-subtle">IGCSE grade</p>
                <p className={`display mt-1 text-5xl leading-none ${GRADE_TEXT[att.grade] || 'text-brand'}`}>{att.grade}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-6 border border-line bg-canvas p-4 sm:p-5">
          <div className="flex items-start gap-3">
            {att.status === 'grading'
              ? <FiLoader size={20} className="mt-0.5 flex-shrink-0 animate-spin text-brand" />
              : <FiClock size={20} className="mt-0.5 flex-shrink-0 text-brand" />}
            <div className="min-w-0">
              <p className="text-base font-semibold text-ink">{staffViewer ? 'This result is not ready yet' : 'Your result is not ready yet'}</p>
              <p className="mt-0.5 text-sm text-ink-2">
                {att.status === 'grading'
                  ? 'The written answers are being marked. This usually takes under two minutes.'
                  : att.status === 'needs_review'
                    ? 'A tutor is checking your written answers. Your marks and grade appear here once they release them.'
                    : staffViewer
                      ? 'Not every section is finished yet. Here is what is done so far.'
                      : 'Finish every section to get your final mark and grade. Here is what is done so far.'}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Link href={hub} className={`group ${BTN_PRIMARY}`}>
              Go to the test <FiArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      )}

      {pollError && (
        <div className="mb-4 flex items-center gap-2 border border-line bg-canvas px-4 py-2.5 text-xs text-ink-2">
          <FiAlertTriangle size={14} className="text-star" /> Could not refresh just now. Retrying…
        </div>
      )}

      {att.provisional && finished && (
        <div className="mb-6 flex items-start gap-3 border-l-2 border-calm bg-[#3f6b6414] px-4 py-3.5 text-sm text-ink-2">
          <FiUserCheck size={18} className="mt-0.5 flex-shrink-0 text-calm" />
          <span>
            <span className="font-semibold text-ink">
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
        <section className="mb-6 border border-line bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 display text-lg text-ink">
              <FiPieChart size={16} className="text-brand" /> Marks by topic
            </h2>
            <span className="font-code text-[11px] uppercase tracking-[0.08em] text-subtle">Weakest first</span>
          </div>
          <div className="mt-4 space-y-3.5">
            {topics.map((t) => (
              <div key={t.topic}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium text-ink">{t.topic}</span>
                  <span className="flex-shrink-0 font-code tabular-nums text-muted">
                    {fmtNum(t.marks)} / {fmtNum(t.max)} <span className="font-semibold text-ink-2">· {t.pct}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden bg-sunken">
                  <div className={`h-full ${barColor(t.pct)}`} style={{ width: `${Math.max(2, Math.min(100, t.pct))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Questions */}
      <section className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 display text-lg text-ink">
            <FiList size={16} className="text-brand" /> Question by question
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
          <p className="mb-3 flex items-start gap-2 border border-line bg-canvas px-3.5 py-2.5 text-xs text-ink-2">
            <FiInfo size={14} className="mt-0.5 flex-shrink-0 text-subtle" />
            Mark schemes appear here once your result is final.
          </p>
        )}

        {listed.length === 0 ? (
          <div className="border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
            <p className="text-sm font-semibold text-ink">Nothing marked yet</p>
            <p className="mt-1 text-xs text-muted">Your answers appear here as soon as a section is marked.</p>
          </div>
        ) : shown.length === 0 ? (
          <div className="border border-dashed border-line-strong bg-surface px-6 py-10 text-center text-sm text-muted">
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
        <div className="mb-4 flex items-start gap-3 border-l-2 border-negative bg-[#b4231814] px-4 py-3 text-sm text-negative">
          <FiAlertTriangle size={17} className="mt-0.5 flex-shrink-0" />
          <span className="min-w-0 flex-1">{notice}</span>
          <button type="button" onClick={() => setNotice('')} className="flex-shrink-0 p-1 opacity-60 transition-opacity hover:opacity-100" aria-label="Dismiss">
            <FiX size={16} />
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
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
    <Link href={href} className="mb-4 inline-flex items-center gap-1.5 font-code text-[11px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-brand">
      <FiArrowLeft size={13} /> {label}
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
        <circle cx="60" cy="60" r={r} fill="none" stroke="#0a0a0b1f" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#4f46e5"
          strokeWidth="10"
          strokeLinecap="butt"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p / 100)}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-code text-2xl font-bold tabular-nums text-ink">{p}%</span>
      </div>
    </div>
  )
}

function SectionScore({ letter, title, icon: Icon, score, max, statusLabel, note, busy = false, warn = false }) {
  const marked = score != null
  const pct = marked ? pctOf(score, max) : 0
  return (
    <div className="border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center bg-sunken text-brand">
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <p className="font-code text-[11px] uppercase tracking-[0.14em] text-brand">Section {letter}</p>
            <p className="text-sm font-semibold text-ink">{title}</p>
          </div>
        </div>
        <Chip tone={warn ? 'red' : busy ? 'blue' : marked ? 'green' : 'slate'}>{statusLabel}</Chip>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="font-code text-3xl font-bold tabular-nums text-ink">
          {marked ? fmtNum(score) : '—'}<span className="text-lg font-medium text-muted"> / {fmtNum(max)}</span>
        </p>
        {marked && <span className="font-code text-sm font-bold text-ink-2">{pct}%</span>}
        {busy && <FiLoader size={18} className="animate-spin text-calm" />}
      </div>
      <div className="mt-3 h-2 overflow-hidden bg-sunken">
        {marked && <div className={`h-full ${barColor(pct)}`} style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />}
      </div>
      {note && <p className={`mt-2 text-xs ${warn ? 'text-negative' : 'text-muted'}`}>{note}</p>}
    </div>
  )
}

function FilterChip({ active, onClick, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 font-code text-[11px] uppercase tracking-[0.08em] transition ${active
        ? 'bg-cta text-on-cta'
        : 'border border-line bg-surface text-muted chip-hover'}`}
    >
      {label} <span className="opacity-60">{count}</span>
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
    <article className="border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="flex h-9 min-w-[2.25rem] items-center justify-center bg-cta px-2 font-code text-sm font-bold text-on-cta">
            {row.n ?? '?'}
          </span>
          <Chip tone={isMcq ? 'brand' : 'blue'}>{isMcq ? 'MCQ' : 'Written'}</Chip>
          {r?.overridden && <Chip tone="violet">Adjusted by tutor</Chip>}
        </div>
        <span className={`flex-shrink-0 border px-3 py-1 font-code text-sm font-bold tabular-nums ${MARK_CLS[tone]}`}>
          {r ? fmtNum(awarded) : '—'} / {fmtNum(max)}
        </span>
      </div>

      {row.missing ? (
        <p className="mt-3 text-sm italic text-subtle">This question has since been removed from the bank. Its mark still counts.</p>
      ) : row.text ? (
        <div className="mt-3 overflow-x-auto break-words text-[15px] leading-relaxed text-ink">{renderContent(String(row.text))}</div>
      ) : null}

      {isMcq && (
        <div className="mt-4">
          {r && (
            <p className="mb-2.5 font-code text-xs text-muted">
              {selected ? <>You chose <span className="font-bold text-ink">{selected}</span></> : 'Not answered'}
              {answerKey ? <> · Correct answer <span className="font-bold text-positive">{answerKey}</span></> : null}
            </p>
          )}
          {options.length > 0 && (
            <div className="space-y-2">
              {options.map((o) => {
                const isKey = !!r && o.letter === answerKey
                const isMine = !!r && o.letter === selected
                const cls = isKey
                  ? 'border-positive/40 bg-[#2f7d4514]'
                  : isMine ? 'border-negative/40 bg-[#b4231814]' : 'border-line bg-surface'
                const dot = isKey
                  ? 'border-positive bg-positive text-on-brand'
                  : isMine ? 'border-negative bg-negative text-on-brand' : 'border-line-strong text-ink-2'
                return (
                  <div key={o.letter} className={`flex items-start gap-3 border px-3 py-2.5 ${cls}`}>
                    <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border font-code text-xs font-bold ${dot}`}>
                      {o.letter}
                    </span>
                    <div className="min-w-0 flex-1 overflow-x-auto break-words pt-0.5 text-sm text-ink">{renderContent(String(o.text || ''))}</div>
                    {isKey ? (
                      <span className="inline-flex flex-shrink-0 items-center gap-1 pt-1 font-code text-[11px] font-bold uppercase tracking-[0.06em] text-positive">
                        <FiCheck size={13} /> {isMine ? 'Your answer' : 'Correct'}
                      </span>
                    ) : isMine ? (
                      <span className="inline-flex flex-shrink-0 items-center gap-1 pt-1 font-code text-[11px] font-bold uppercase tracking-[0.06em] text-negative">
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
            <div className="border border-line bg-canvas p-3.5">
              <p className="mb-1.5 flex items-center gap-1.5 font-code text-[11px] uppercase tracking-[0.12em] text-muted">
                <FiEye size={12} /> What we read
              </p>
              {r.transcription
                ? <div className="overflow-x-auto break-words text-sm text-ink">{renderContent(String(r.transcription))}</div>
                : <p className="text-sm italic text-subtle">No answer to this question was found on your pages.</p>}
            </div>
            {r.feedback && (
              <div className="border border-line bg-brand-50 p-3.5">
                <p className="mb-1.5 flex items-center gap-1.5 font-code text-[11px] uppercase tracking-[0.12em] text-brand">
                  <FiMessageSquare size={12} /> Feedback
                </p>
                <div className="overflow-x-auto break-words text-sm text-ink-2">{renderContent(String(r.feedback))}</div>
              </div>
            )}
            {r.flagged && (
              <div className="flex items-start gap-2 border-l-2 border-calm bg-[#3f6b6414] px-3.5 py-2.5 text-sm text-ink-2">
                <FiUserCheck size={15} className="mt-0.5 flex-shrink-0 text-calm" />
                <span>
                  <span className="font-semibold text-ink">A tutor is checking this answer.</span>
                  {r.flagReason ? ` ${r.flagReason}` : ''}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted">
            {writtenState === 'grading'
              ? <><FiLoader className="animate-spin text-calm" size={14} /> Being marked…</>
              : 'Not marked yet.'}
          </p>
        )
      )}

      {hasScheme && (
        <div className="mt-4 overflow-hidden border border-positive/30">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex w-full items-center justify-between gap-2 bg-[#2f7d450d] px-3.5 py-2.5 text-left text-sm font-semibold text-positive transition hover:bg-[#2f7d4514]"
          >
            <span className="flex items-center gap-2"><FiBookOpen size={15} /> {isMcq ? 'Explanation' : 'Mark scheme'}</span>
            <FiChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="space-y-3 border-t border-positive/20 px-3.5 py-3 text-sm text-ink">
              {row.finalAnswer && (
                <div>
                  <p className="mb-1 font-code text-[11px] uppercase tracking-[0.12em] text-positive">Final answer</p>
                  <div className="overflow-x-auto break-words">{renderContent(String(row.finalAnswer))}</div>
                </div>
              )}
              {row.markScheme && (
                <div>
                  {row.finalAnswer && <p className="mb-1 font-code text-[11px] uppercase tracking-[0.12em] text-positive">Mark scheme</p>}
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
