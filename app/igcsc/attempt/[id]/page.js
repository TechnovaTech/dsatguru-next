'use client'
// The attempt hub: where each section of one sitting stands, and the way into
// it. Section A is the online MCQ (timed on the server), Section B the written
// paper (printed, photographed, AI-marked). Marking runs in the background, so
// the page polls while it does.
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  FiArrowLeft, FiArrowRight, FiCheckSquare, FiEdit3, FiClock, FiPlay, FiPrinter, FiUpload,
  FiLoader, FiAward, FiAlertTriangle, FiCheckCircle, FiEye, FiUserCheck, FiRefreshCw, FiX,
} from 'react-icons/fi'
import { apiGet } from '../../_components/api'
import { Loading, ErrorState } from '../../_components/ui'
import { Chip, BTN_PRIMARY, BTN_SECONDARY } from '../../_components/PaperCard'
import { igcscUser } from '../../_components/auth'
import { ATTEMPT_STATUS } from '../../../../lib/igcscStoreShared'

const GRADE_TONE = { 'A*': 'green', A: 'green', B: 'blue', C: 'amber', D: 'amber', E: 'red', U: 'red' }
const POLL_MS = 5000

function fmtNum(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

function fmtClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(h ? 2 : 1, '0')
  return h ? `${h}:${mm}:${String(s).padStart(2, '0')}` : `${mm}:${String(s).padStart(2, '0')}`
}

export default function AttemptHubPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id || '')

  const [att, setAtt] = useState(null)
  const [error, setError] = useState('')
  const [pollError, setPollError] = useState(false)
  const [me, setMe] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const [confirmStart, setConfirmStart] = useState(false)
  // Server clock minus ours, so a countdown never trusts the device clock.
  const offsetRef = useRef(0)
  const loadingRef = useRef(false)

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!id || loadingRef.current) return
    loadingRef.current = true
    if (!quiet) setError('')
    try {
      const t0 = Date.now()
      const res = await apiGet(`/api/igcsc/attempts/${encodeURIComponent(id)}`)
      const t1 = Date.now()
      if (Number.isFinite(Number(res?.serverNow))) offsetRef.current = Number(res.serverNow) - (t0 + t1) / 2
      setAtt(res?.attempt || null)
      setPollError(false)
      setNow(Date.now())
    } catch (e) {
      // A failed background refresh keeps what is on screen.
      if (quiet) setPollError(true)
      else setError(e.message || 'Could not load this test.')
    } finally {
      loadingRef.current = false
    }
  }, [id])

  useEffect(() => { setMe(igcscUser()) }, [])
  useEffect(() => { load() }, [load])

  // Coming back from the upload page, the print tab or the runner.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') load({ quiet: true }) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  const mState = att?.mcq?.state || 'none'
  const wState = att?.written?.state || 'none'
  const deadlineMs = att?.mcq?.deadline ? new Date(att.mcq.deadline).getTime() : null
  const msLeft = mState === 'in_progress' && deadlineMs ? deadlineMs - (now + offsetRef.current) : null
  const mcqExpired = msLeft != null && msLeft <= 0

  // The countdown only matters while the MCQ section is open.
  useEffect(() => {
    if (mState !== 'in_progress') return undefined
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [mState])

  // Marking runs in the background; an MCQ whose time ran out is submitted by
  // the server on a later read - keep reading until either settles.
  const shouldPoll = !!att && (att.status === 'grading' || wState === 'grading' || mcqExpired)
  useEffect(() => {
    if (!shouldPoll) return undefined
    const t = setInterval(() => load({ quiet: true }), POLL_MS)
    return () => clearInterval(t)
  }, [shouldPoll, load])

  if (!att && error) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <BackLink href="/igcsc/my-tests" label="My tests" />
        <ErrorState message={error} />
        <button type="button" onClick={() => load()} className={BTN_SECONDARY}><FiRefreshCw size={15} /> Try again</button>
      </div>
    )
  }
  if (!att) return <Loading label="Loading your test…" />

  const isOwner = !!me?.id && String(me.id) === String(att.userId)
  const isStaffView = !!me && !isOwner && (me.role === 'admin' || me.role === 'tutor')
  const status = ATTEMPT_STATUS[att.status] || { label: att.status, tone: 'slate' }
  const finished = att.status === 'completed' || att.status === 'needs_review'
  const base = `/igcsc/attempt/${att._id}`
  const sectionCount = (mState !== 'none' ? 1 : 0) + (wState !== 'none' ? 1 : 0)
  // What startMcq will actually give: a paper synced without an MCQ time gets 10.
  const mcqMinutes = Math.max(1, Number(att.mcq?.durationMin) || 10)

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink href={isStaffView ? '/igcsc/grading' : '/igcsc/my-tests'} label={isStaffView ? 'Marking' : 'My tests'} />

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
        <p className="mt-3 text-xs text-muted">
          {sectionCount === 2
            ? 'Two sections: an online multiple-choice part and a written part.'
            : mState !== 'none' ? 'One section: online multiple choice.' : 'One section: a written paper.'}
          {isStaffView && att.userName ? ` You are viewing ${att.userName}'s test.` : ''}
        </p>
      </header>

      {pollError && (
        <div className="mb-4 flex items-center gap-2 border border-line bg-canvas px-4 py-2.5 text-xs text-ink-2">
          <FiAlertTriangle size={14} className="text-star" /> Could not refresh just now — showing the last update.
        </div>
      )}

      {/* Final result */}
      {finished && (
        <div className="mb-6 border border-line bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center bg-brand text-on-brand">
                <FiAward size={26} />
              </span>
              <div className="min-w-0">
                <p className="font-code text-[11px] uppercase tracking-[0.12em] text-muted">
                  {att.status === 'needs_review' ? 'Provisional result' : 'Final result'}
                </p>
                <p className="mt-0.5 font-code text-2xl font-bold tabular-nums text-ink">
                  {fmtNum(att.score)} / {fmtNum(att.maxScore)}
                  {att.percentage != null && <span className="ml-2 text-base font-medium text-muted">{att.percentage}%</span>}
                </p>
                {att.status === 'needs_review' && (
                  <p className="mt-0.5 text-xs text-muted">A tutor is checking some answers — your mark may change.</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {att.grade && (
                <div className="text-center">
                  <p className="font-code text-[10px] uppercase tracking-[0.12em] text-subtle">Grade</p>
                  <Chip tone={GRADE_TONE[att.grade] || 'slate'}><span className="px-1 text-base">{att.grade}</span></Chip>
                </div>
              )}
              <Link href={`${base}/result`} className={`group ${BTN_PRIMARY}`}>See full result <FiArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></Link>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {mState !== 'none' && (
          <SectionCard
            letter="A"
            title="Online MCQ"
            icon={FiCheckSquare}
            meta={`${att.mcq.count} question${att.mcq.count === 1 ? '' : 's'} · ${mcqMinutes} minutes · marked instantly`}
            badge={<McqBadge state={mState} expired={mcqExpired} />}
          >
            {mState === 'not_started' && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-md text-sm text-ink-2">
                  The timer starts when you begin and keeps running if you leave. Every answer is saved the moment you pick it.
                </p>
                {isOwner && (
                  <button type="button" className={BTN_PRIMARY} onClick={() => setConfirmStart(true)}>
                    <FiPlay size={15} /> Start ({att.mcq.count} questions, {mcqMinutes} minutes)
                  </button>
                )}
              </div>
            )}

            {mState === 'in_progress' && !mcqExpired && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className={`border px-4 py-3 ${msLeft != null && msLeft < 5 * 60000 ? 'border-negative/40 bg-[#b4231814] text-negative' : 'border-line bg-canvas text-ink'}`}>
                    <p className="font-code text-[10px] uppercase tracking-[0.12em] opacity-80">Time left</p>
                    <p className="font-code text-2xl font-bold tabular-nums">{msLeft != null ? fmtClock(msLeft) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">{att.mcq.answered} of {att.mcq.count} answered</p>
                    <p className="text-xs text-muted">Your answers are saved. The clock is still running.</p>
                  </div>
                </div>
                {isOwner && (
                  <Link href={`${base}/mcq`} className={BTN_PRIMARY}><FiPlay size={15} /> Continue</Link>
                )}
              </div>
            )}

            {mState === 'in_progress' && mcqExpired && (
              <div className="flex items-center gap-3 text-sm text-ink-2">
                <FiLoader className="animate-spin text-brand" size={18} />
                Time is up. Your saved answers are being submitted and marked…
              </div>
            )}

            {mState === 'submitted' && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <ScoreBlock score={att.mcq.score} max={att.mcq.max} tone="indigo" />
                  <div>
                    {att.mcq.correct != null && (
                      <p className="text-sm font-semibold text-ink">{att.mcq.correct} of {att.mcq.count} correct</p>
                    )}
                    <p className="text-xs text-muted">
                      {att.mcq.autoSubmitted ? 'Submitted automatically when the time ran out.' : 'Submitted and marked.'}
                    </p>
                  </div>
                </div>
                <Link href={`${base}/result`} className={BTN_SECONDARY}><FiEye size={15} /> View answers</Link>
              </div>
            )}
          </SectionCard>
        )}

        {wState !== 'none' && (
          <SectionCard
            letter="B"
            title="Written"
            icon={FiEdit3}
            meta={`${att.written.count} question${att.written.count === 1 ? '' : 's'} · ${fmtNum(att.written.max)} marks · answered on paper, marked by AI`}
            badge={<WrittenBadge state={wState} />}
          >
            {(wState === 'not_started' || wState === 'error') && (
              <div className="space-y-4">
                {wState === 'error' && (
                  <div className="flex items-start gap-2 border-l-2 border-negative bg-[#b4231814] px-4 py-3 text-sm text-negative">
                    <FiAlertTriangle className="mt-0.5 flex-shrink-0" size={16} />
                    <span>{att.written.error || 'Marking failed.'} Check your photos and send them again.</span>
                  </div>
                )}
                <ol className="grid gap-3 sm:grid-cols-3">
                  <Step n={1} title="Print" text="Print the paper, or copy the questions onto paper." />
                  <Step n={2} title="Answer" text="Write the question number next to every answer." />
                  <Step n={3} title="Upload" text="Photograph every page and send them for marking." />
                </ol>
                {(att.written.uploads || []).length > 0 && (
                  <p className="font-code text-xs text-muted">
                    {att.written.uploads.length} page{att.written.uploads.length === 1 ? '' : 's'} uploaded — not sent for marking yet.
                  </p>
                )}
                {isOwner && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <a href={`${base}/print`} target="_blank" rel="noopener noreferrer" className={BTN_SECONDARY}>
                      <FiPrinter size={15} /> Print the paper
                    </a>
                    <Link href={`${base}/written`} className={BTN_PRIMARY}>
                      <FiUpload size={15} /> Upload answers
                    </Link>
                  </div>
                )}
              </div>
            )}

            {wState === 'grading' && (
              <div className="flex items-center gap-4">
                <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center bg-sunken text-calm">
                  <FiLoader className="animate-spin" size={22} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">Being marked…</p>
                  <p className="text-xs text-muted">This usually takes under two minutes. You can leave this page — the result will be waiting.</p>
                </div>
              </div>
            )}

            {(wState === 'graded' || wState === 'needs_review') && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <ScoreBlock score={att.written.score} max={att.written.max} tone={wState === 'needs_review' ? 'violet' : 'emerald'} />
                  <div>
                    {wState === 'needs_review' ? (
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-calm"><FiUserCheck size={15} /> Tutor checking</p>
                    ) : (
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-positive"><FiCheckCircle size={15} /> Marked</p>
                    )}
                    <p className="text-xs text-muted">
                      {wState === 'needs_review'
                        ? 'The AI was unsure about some answers. A tutor will confirm them.'
                        : att.written.reviewedBy ? `Checked by ${att.written.reviewedBy}.` : 'Marked against the mark scheme.'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  {isStaffView && (
                    <Link href={`/igcsc/grading/${att._id}`} className={BTN_SECONDARY}><FiUserCheck size={15} /> Review marking</Link>
                  )}
                  <Link href={`${base}/result`} className={BTN_SECONDARY}><FiEye size={15} /> View marking</Link>
                </div>
              </div>
            )}
          </SectionCard>
        )}
      </div>

      {confirmStart && (
        <StartDialog
          count={att.mcq.count}
          minutes={mcqMinutes}
          onCancel={() => setConfirmStart(false)}
          onConfirm={() => { setConfirmStart(false); router.push(`${base}/mcq`) }}
        />
      )}
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

function SectionCard({ letter, title, icon: Icon, meta, badge, children }) {
  return (
    <div className="border border-line bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center bg-sunken text-brand">
            <Icon size={20} />
          </span>
          <div className="min-w-0">
            <p className="font-code text-[11px] uppercase tracking-[0.14em] text-brand">Section {letter}</p>
            <h2 className="display text-lg leading-snug text-ink">{title}</h2>
            {meta && <p className="mt-0.5 text-xs text-muted">{meta}</p>}
          </div>
        </div>
        {badge}
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </div>
  )
}

function McqBadge({ state, expired }) {
  if (state === 'submitted') return <Chip tone="green">Marked</Chip>
  if (state === 'in_progress') return <Chip tone="amber">{expired ? 'Submitting' : 'In progress'}</Chip>
  return <Chip tone="slate">Not started</Chip>
}

function WrittenBadge({ state }) {
  if (state === 'grading') return <Chip tone="blue">Being marked</Chip>
  if (state === 'graded') return <Chip tone="green">Marked</Chip>
  if (state === 'needs_review') return <Chip tone="violet">Tutor checking</Chip>
  if (state === 'error') return <Chip tone="red">Marking failed</Chip>
  return <Chip tone="slate">Not started</Chip>
}

const SCORE_TONES = {
  indigo: 'border-line bg-canvas text-ink',
  emerald: 'border-positive/30 bg-[#2f7d4514] text-positive',
  violet: 'border-calm/30 bg-[#3f6b6414] text-calm',
}

function ScoreBlock({ score, max, tone = 'indigo' }) {
  return (
    <div className={`border px-4 py-3 text-center ${SCORE_TONES[tone] || SCORE_TONES.indigo}`}>
      <p className="font-code text-[10px] uppercase tracking-[0.12em] opacity-80">Score</p>
      <p className="font-code text-2xl font-bold tabular-nums">
        {score == null ? '—' : fmtNum(score)}<span className="text-base font-medium opacity-70"> / {fmtNum(max)}</span>
      </p>
    </div>
  )
}

function Step({ n, title, text }) {
  return (
    <li className="flex items-start gap-3 border border-line bg-canvas p-3">
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-cta font-code text-xs font-bold text-on-cta">{n}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-muted">{text}</p>
      </div>
    </li>
  )
}

function StartDialog({ count, minutes, onCancel, onConfirm }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md border border-line bg-surface p-6 animate-rise">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-12 w-12 items-center justify-center bg-brand-50 text-brand"><FiClock size={22} /></span>
          <button type="button" onClick={onCancel} className="p-1.5 text-subtle transition-colors hover:bg-ink/5 hover:text-ink" aria-label="Close">
            <FiX size={18} />
          </button>
        </div>
        <h3 className="display mt-4 text-[1.4rem] leading-snug text-ink">Ready to <em className="accent">start</em>?</h3>
        <p className="mt-1 text-sm text-ink-2">
          You will have <span className="font-semibold text-ink">{minutes} minutes</span> for {count} question{count === 1 ? '' : 's'}.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-ink-2">
          <li className="flex gap-2"><FiClock className="mt-0.5 flex-shrink-0 text-brand" size={15} /> The timer cannot be paused, even if you close the page.</li>
          <li className="flex gap-2"><FiCheckCircle className="mt-0.5 flex-shrink-0 text-brand" size={15} /> Every answer is saved as soon as you choose it.</li>
          <li className="flex gap-2"><FiAward className="mt-0.5 flex-shrink-0 text-brand" size={15} /> When time runs out, your answers are submitted for you.</li>
        </ul>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className={BTN_SECONDARY}>Not yet</button>
          <button type="button" onClick={onConfirm} className={BTN_PRIMARY}><FiPlay size={15} /> Start now</button>
        </div>
      </div>
    </div>
  )
}
