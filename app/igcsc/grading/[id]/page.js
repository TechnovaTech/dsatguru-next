'use client'
// One student's written answers as a tutor checks them: the photographed pages
// on one side, every written question with its mark scheme and the AI's
// marking on the other. A flagged paper reaches the student only as
// provisional until a tutor confirms it here.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  FiArrowLeft, FiFlag, FiLoader, FiAlertTriangle, FiCheckCircle, FiRefreshCw, FiSave, FiSend,
  FiImage, FiZoomIn, FiZoomOut, FiRotateCw, FiX, FiChevronLeft, FiChevronRight, FiExternalLink,
  FiCheck, FiChevronDown, FiEdit3, FiCpu, FiUserCheck, FiMinus, FiPlus, FiBookOpen, FiInfo,
} from 'react-icons/fi'
import { apiGet, apiSend } from '../../_components/api'
import { Badge, Loading, ErrorState, EmptyState } from '../../_components/ui'
import { ATTEMPT_STATUS } from '../../../../lib/igcscStoreShared'
import { renderContent } from '../../../components/admin/LatexRenderer'

const POLL_MS = 5000
const QUICK_MARKS_MAX = 10

const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
const BTN_DANGER =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50'
const LB_BTN =
  'flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-30'

const WRITTEN_STATE = {
  not_started: { label: 'Not sent yet', tone: 'slate' },
  grading: { label: 'AI marking…', tone: 'blue' },
  needs_review: { label: 'Needs review', tone: 'violet' },
  graded: { label: 'Marked', tone: 'green' },
  error: { label: 'Marking failed', tone: 'red' },
}
const MCQ_STATE = {
  not_started: 'Not started',
  in_progress: 'In progress',
  submitted: 'Submitted',
}
const BASIS = {
  scheme: 'Marked against the mark scheme',
  final: 'Marked against the final answer only',
  none: 'No mark scheme — marked on merit',
}
const MARK_CLS = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
}

function fmtWhen(d) {
  if (!d) return ''
  const t = new Date(d)
  if (Number.isNaN(t.getTime())) return ''
  return t.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function fmtNum(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

function markTone(awarded, max) {
  if (Number(awarded) >= Number(max) && Number(max) > 0) return 'green'
  if (Number(awarded) > 0) return 'amber'
  return 'red'
}

// Draft values are kept as typed and become numbers only when sent.
function draftsFrom(attempt) {
  const out = {}
  for (const r of attempt?.results || []) {
    if (r.kind !== 'written') continue
    out[r.questionId] = { marks: String(r.marksAwarded ?? 0), feedback: r.feedback || '' }
  }
  return out
}

function marksProblem(value, max) {
  const s = String(value ?? '').trim()
  if (s === '') return 'Enter a mark.'
  const n = Number(s)
  if (!Number.isFinite(n) || !Number.isInteger(n)) return 'Whole marks only.'
  if (n < 0 || n > max) return `Between 0 and ${max}.`
  return ''
}

// Only what the tutor actually changed is sent, so an untouched AI mark keeps
// its "not overridden" status.
function changesOf(attempt, drafts) {
  const out = []
  for (const r of attempt?.results || []) {
    if (r.kind !== 'written') continue
    const d = drafts[r.questionId]
    if (!d) continue
    const u = { questionId: r.questionId }
    const typed = String(d.marks ?? '').trim()
    if (typed === '' || Number(typed) !== Number(r.marksAwarded ?? 0)) u.marksAwarded = Number(typed)
    if ((d.feedback || '') !== (r.feedback || '')) u.feedback = d.feedback || ''
    if (u.marksAwarded !== undefined || u.feedback !== undefined) out.push(u)
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Pieces
// ─────────────────────────────────────────────────────────────────────────────

function ConfirmDialog({ title, children, confirmLabel, danger, busy, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={() => { if (!busy) onCancel() }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-600">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className={BTN_SECONDARY}>Cancel</button>
          <button type="button" onClick={onConfirm} disabled={busy} className={danger ? BTN_DANGER : BTN_PRIMARY}>
            {busy && <FiLoader className="animate-spin" size={14} />}{confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// Full-screen page viewer: zoom, rotate, step through pages.
function Lightbox({ uploads, index, onClose, onIndex }) {
  const [scale, setScale] = useState(1)
  const [rot, setRot] = useState(0)
  const count = uploads.length
  const u = uploads[index]

  useEffect(() => {
    setScale(1)
    setRot(0)
  }, [index])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' && index < count - 1) onIndex(index + 1)
      else if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, count, onClose, onIndex])

  if (!u) return null
  const zoomed = scale > 1
  const imgStyle = {}
  if (rot) imgStyle.transform = `rotate(${rot}deg)`
  if (zoomed) {
    imgStyle.width = `${scale * 100}%`
    imgStyle.maxWidth = 'none'
  }

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-slate-950/95" role="dialog" aria-modal="true" aria-label={`Answer page ${index + 1}`}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-white">
        <span className="text-sm font-semibold">Page {index + 1} of {count}</span>
        <div className="flex items-center gap-1">
          <button type="button" className={LB_BTN} onClick={() => setScale((s) => Math.max(1, s - 0.5))} disabled={!zoomed} aria-label="Zoom out">
            <FiZoomOut size={17} />
          </button>
          <span className="hidden w-12 text-center text-xs text-white/70 sm:inline">{Math.round(scale * 100)}%</span>
          <button type="button" className={LB_BTN} onClick={() => setScale((s) => Math.min(4, s + 0.5))} disabled={scale >= 4} aria-label="Zoom in">
            <FiZoomIn size={17} />
          </button>
          <button type="button" className={LB_BTN} onClick={() => setRot((r) => (r + 90) % 360)} aria-label="Rotate">
            <FiRotateCw size={17} />
          </button>
          <a href={u.url} target="_blank" rel="noopener noreferrer" className={LB_BTN} aria-label="Open in a new tab">
            <FiExternalLink size={17} />
          </a>
          <button type="button" className={LB_BTN} onClick={onClose} aria-label="Close">
            <FiX size={19} />
          </button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <div className="h-full overflow-auto">
          {/* Block, not flex, when zoomed: a flex item would shrink back to fit. */}
          <div className={`min-h-full p-3 sm:p-6 ${zoomed ? '' : 'flex items-center justify-center'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={u.url}
              alt={`Answer page ${index + 1}`}
              onClick={() => setScale((s) => (s > 1 ? 1 : 2))}
              style={imgStyle}
              className={`block select-none rounded-lg bg-white shadow-2xl transition-transform ${zoomed ? 'cursor-zoom-out' : 'max-h-[calc(100vh-6rem)] max-w-full cursor-zoom-in object-contain'}`}
            />
          </div>
        </div>
        {index > 0 && (
          <button
            type="button"
            onClick={() => onIndex(index - 1)}
            className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/70 text-white shadow-lg transition hover:bg-slate-900"
            aria-label="Previous page"
          >
            <FiChevronLeft size={22} />
          </button>
        )}
        {index < count - 1 && (
          <button
            type="button"
            onClick={() => onIndex(index + 1)}
            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/70 text-white shadow-lg transition hover:bg-slate-900"
            aria-label="Next page"
          >
            <FiChevronRight size={22} />
          </button>
        )}
      </div>
    </div>
  )
}

function PhotoPane({ uploads, broken, reloading, onOpen, onBroken, onReload }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <FiImage size={15} className="text-indigo-500" /> Answer pages
        </h3>
        <span className="text-xs text-slate-400">{uploads.length} page{uploads.length === 1 ? '' : 's'}</span>
      </div>
      {broken && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">
          <span>Photo links expire after two hours.</span>
          <button type="button" onClick={onReload} disabled={reloading} className="inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline disabled:opacity-50">
            <FiRefreshCw size={12} className={reloading ? 'animate-spin' : ''} /> Reload photos
          </button>
        </div>
      )}
      {uploads.length === 0 ? (
        <EmptyState icon={FiImage} title="No photos" hint="The student has not uploaded any answer pages." />
      ) : (
        <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-1">
          {uploads.map((u, i) => (
            <button
              key={u.id}
              type="button"
              onClick={() => onOpen(i)}
              className="group relative block overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-left transition hover:border-indigo-300 hover:shadow-md"
              aria-label={`Open page ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={u.url}
                alt={`Answer page ${i + 1}`}
                loading="lazy"
                onError={onBroken}
                className="block h-44 w-full object-cover object-top sm:h-56 lg:h-auto lg:object-contain"
              />
              <span className="absolute left-2 top-2 rounded-md bg-slate-900/75 px-2 py-0.5 text-[11px] font-bold text-white">Page {i + 1}</span>
              <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-slate-700 opacity-0 shadow transition group-hover:opacity-100">
                <FiZoomIn size={14} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ConfidencePill({ value }) {
  const v = Number(value)
  if (!Number.isFinite(v)) return null
  const tone = v >= 0.8 ? 'green' : v >= 0.6 ? 'amber' : 'red'
  return <Badge tone={tone}>AI confidence {Math.round(v * 100)}%</Badge>
}

function Block({ label, icon: Icon, tone = 'slate', children }) {
  const cls = {
    slate: 'border-slate-200 bg-slate-50/60',
    green: 'border-emerald-200 bg-emerald-50/60',
    indigo: 'border-indigo-200 bg-indigo-50/50',
  }[tone] || 'border-slate-200 bg-slate-50/60'
  return (
    <div className={`rounded-xl border ${cls}`}>
      <div className="flex items-center gap-1.5 px-3 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {Icon && <Icon size={12} />} {label}
      </div>
      <div className="max-h-80 overflow-y-auto break-words px-3 pb-3 pt-1.5 text-sm leading-relaxed text-slate-800">{children}</div>
    </div>
  )
}

function MarksControl({ value, max, disabled, problem, onChange }) {
  const n = Number(value)
  const valid = String(value ?? '').trim() !== '' && Number.isFinite(n)
  const step = (d) => {
    const base = valid ? Math.round(n) : 0
    onChange(String(Math.min(max, Math.max(0, base + d))))
  }
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className={`flex items-center overflow-hidden rounded-xl border bg-white ${problem ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'}`}>
          <button type="button" onClick={() => step(-1)} disabled={disabled || (valid && n <= 0)} className="flex h-10 w-10 items-center justify-center text-slate-500 transition hover:bg-slate-50 disabled:opacity-30" aria-label="One mark less">
            <FiMinus size={15} />
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={max}
            step={1}
            value={value ?? ''}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-14 border-x border-slate-200 text-center text-base font-bold text-slate-900 focus:outline-none disabled:bg-slate-50"
            aria-label="Marks awarded"
          />
          <button type="button" onClick={() => step(1)} disabled={disabled || (valid && n >= max)} className="flex h-10 w-10 items-center justify-center text-slate-500 transition hover:bg-slate-50 disabled:opacity-30" aria-label="One mark more">
            <FiPlus size={15} />
          </button>
        </div>
        <span className="text-sm font-semibold text-slate-500">of {max}</span>
      </div>
      {max > 0 && max <= QUICK_MARKS_MAX && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Array.from({ length: max + 1 }, (_, i) => i).map((m) => {
            const on = valid && n === m
            return (
              <button
                key={m}
                type="button"
                disabled={disabled}
                onClick={() => onChange(String(m))}
                className={`h-8 min-w-[2rem] rounded-lg px-2 text-xs font-bold transition disabled:opacity-40 ${on ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
              >
                {m}
              </button>
            )
          })}
        </div>
      )}
      {problem && <p className="mt-1.5 text-xs font-semibold text-rose-600">{problem}</p>}
    </div>
  )
}

function WrittenCard({ row, draft, problem, editable, disabled, onDraft }) {
  const { q, r, n } = row
  const max = Number(r?.maxMarks ?? q?.marks ?? 0)
  const marksValue = draft?.marks ?? ''
  const typed = String(marksValue).trim()
  const markChanged = !!r && typed !== '' && Number(typed) !== Number(r.marksAwarded ?? 0)
  const feedbackChanged = !!r && (draft?.feedback || '') !== (r.feedback || '')
  const shownMarks = r ? (typed !== '' && Number.isFinite(Number(typed)) ? Number(typed) : Number(r.marksAwarded || 0)) : 0

  return (
    <div className={`rounded-2xl border bg-white shadow-sm ${r?.flagged ? 'border-amber-300' : 'border-slate-200'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="flex h-8 min-w-[2rem] items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 px-2 text-sm font-extrabold text-white">
            {n ?? '?'}
          </span>
          <span className="text-xs font-semibold text-slate-500">[{max} mark{max === 1 ? '' : 's'}]</span>
          {r?.flagged && (
            <Badge tone="amber"><FiFlag className="mr-1" size={10} /> Flagged</Badge>
          )}
          {r?.overridden && <Badge tone="indigo"><FiUserCheck className="mr-1" size={10} /> Tutor mark</Badge>}
          {r && <ConfidencePill value={r.confidence} />}
        </div>
        {r ? (
          <span className={`rounded-lg px-2.5 py-1 text-sm font-extrabold ring-1 ${MARK_CLS[markTone(shownMarks, max)]}`}>
            {fmtNum(shownMarks)} / {max}
          </span>
        ) : (
          <Badge tone="slate">Not marked</Badge>
        )}
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        {r?.flagged && r.flagReason && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-800">
            <FiAlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
            <span className="min-w-0 break-words">{r.flagReason}</span>
          </div>
        )}

        {q ? (
          <Block label="Question" icon={FiBookOpen}>
            {renderContent(q.text) || <span className="text-slate-400">No question text.</span>}
            {/* The figure the student answered from - a graph or diagram the
                mark scheme refers to. */}
            {q.image && <img src={q.image} alt={`Question ${q.n} figure`} className="mt-3 max-h-80 w-auto max-w-full rounded-lg border border-slate-200" />}
          </Block>
        ) : (
          <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500">This question is no longer in the bank. Its mark still counts.</div>
        )}

        {q && (q.markScheme || q.finalAnswer) ? (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {q.markScheme && <Block label="Mark scheme" icon={FiCheckCircle} tone="green">{renderContent(q.markScheme)}</Block>}
            {q.finalAnswer && <Block label="Final answer" icon={FiCheck} tone="green">{renderContent(q.finalAnswer)}</Block>}
          </div>
        ) : q ? (
          <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
            <FiInfo size={13} className="mt-0.5 flex-shrink-0" /> No mark scheme or final answer for this question — mark it on its merits.
          </div>
        ) : null}

        {r && (
          <Block label="What the AI read" icon={FiCpu} tone="indigo">
            {r.transcription ? renderContent(r.transcription) : <span className="text-slate-400">Nothing found for this question on the pages.</span>}
          </Block>
        )}

        {r && r.basis && BASIS[r.basis] && <p className="text-[11px] font-medium text-slate-400">{BASIS[r.basis]}</p>}

        {r && (
          <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 md:grid-cols-[auto_minmax(0,1fr)]">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Marks</p>
              {editable ? (
                <MarksControl
                  value={marksValue}
                  max={max}
                  disabled={disabled}
                  problem={problem}
                  onChange={(v) => onDraft(r.questionId, { marks: v })}
                />
              ) : (
                <p className="text-lg font-extrabold text-slate-900">{fmtNum(r.marksAwarded)} <span className="text-sm font-semibold text-slate-400">of {max}</span></p>
              )}
              {markChanged && !problem && (
                <p className="mt-1.5 text-[11px] font-semibold text-amber-600">Unsaved · was {fmtNum(r.marksAwarded)}</p>
              )}
            </div>
            <div className="min-w-0">
              <p className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <span>Feedback to the student</span>
                {feedbackChanged && <span className="normal-case tracking-normal text-amber-600">Unsaved</span>}
              </p>
              {editable ? (
                <textarea
                  value={draft?.feedback ?? ''}
                  onChange={(e) => onDraft(r.questionId, { feedback: e.target.value.slice(0, 1200) })}
                  rows={3}
                  maxLength={1200}
                  disabled={disabled}
                  placeholder="What earned marks, and what was missing."
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-500"
                />
              ) : (
                <p className="whitespace-pre-line break-words rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">{r.feedback || 'No feedback.'}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function McqSection({ attempt, rows, open, onToggle }) {
  const m = attempt.mcq || {}
  if (m.state === 'none') return null
  const submitted = m.state === 'submitted'
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-800">Section A · Online MCQ <span className="font-normal text-slate-400">(marked automatically, for context)</span></h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {submitted
              ? `${m.correct ?? 0} of ${m.count || rows.length} correct${m.autoSubmitted ? ' · submitted when time ran out' : ''}`
              : `${MCQ_STATE[m.state] || m.state} — results appear once the student submits it.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {submitted && (
            <span className={`rounded-lg px-2.5 py-1 text-sm font-extrabold ring-1 ${MARK_CLS[markTone(m.score, m.max)]}`}>
              {fmtNum(m.score)} / {m.max || 0}
            </span>
          )}
          {submitted && rows.length > 0 && (
            <button type="button" onClick={onToggle} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50">
              {open ? 'Hide questions' : 'Show questions'} <FiChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {submitted && rows.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-4 py-3 sm:px-5">
          {rows.map(({ r }) => (
            <span
              key={r.questionId}
              title={`Q${r.n}: chose ${r.selected || 'nothing'} · answer ${r.correctAnswer || '?'}`}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${r.isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}
            >
              Q{r.n} {r.isCorrect ? <FiCheck size={11} /> : <FiX size={11} />}
              <span className="font-semibold opacity-80">{r.selected || '–'}{!r.isCorrect && r.correctAnswer ? `→${r.correctAnswer}` : ''}</span>
            </span>
          ))}
        </div>
      )}

      {submitted && open && (
        <div className="space-y-4 border-t border-slate-100 px-4 py-4 sm:px-5">
          {rows.map(({ r, q }) => (
            <div key={r.questionId} className="rounded-xl border border-slate-100 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-700">Q{r.n}</span>
                <Badge tone={r.isCorrect ? 'green' : 'red'}>{r.isCorrect ? 'Correct' : r.selected ? 'Wrong' : 'Not answered'}</Badge>
              </div>
              {q ? (
                <>
                  <div className="text-sm text-slate-800">{renderContent(q.text)}</div>
                  <div className="mt-2 space-y-1.5">
                    {(q.options || []).map((o) => {
                      const isKey = o.letter === r.correctAnswer
                      const isPick = o.letter === r.selected
                      return (
                        <div
                          key={o.letter}
                          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${isKey ? 'border-emerald-200 bg-emerald-50' : isPick ? 'border-rose-200 bg-rose-50' : 'border-slate-100'}`}
                        >
                          <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${isKey ? 'bg-emerald-600 text-white' : isPick ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            {o.letter}
                          </span>
                          <div className="min-w-0 flex-1 text-slate-700">{renderContent(o.text)}</div>
                          {isPick && <span className="flex-shrink-0 text-[11px] font-semibold text-slate-500">Student</span>}
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-500">This question is no longer in the bank. Chose {r.selected || 'nothing'}, answer {r.correctAnswer || '?'}.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HeroStat({ label, value, hint }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15">
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-white/70">{label}</p>
      <p className="mt-0.5 truncate text-lg font-extrabold text-white sm:text-xl">{value}</p>
      {hint && <p className="truncate text-[11px] text-white/70">{hint}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function GradingReviewPage() {
  const params = useParams()
  const id = String(params?.id || '')

  const [attempt, setAttempt] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [drafts, setDrafts] = useState({})
  const [busy, setBusy] = useState('') // 'save' | 'confirm' | 'regrade' | 'reload'
  const [notice, setNotice] = useState(null) // { tone: 'green' | 'red' | 'blue', text }
  const [ask, setAsk] = useState('') // 'confirm' | 'regrade'
  const [zoom, setZoom] = useState(-1)
  const [photoBroken, setPhotoBroken] = useState(false)
  const [mcqOpen, setMcqOpen] = useState(false)

  const load = useCallback(async ({ keepDrafts = false, quiet = false } = {}) => {
    if (!id) return
    if (!quiet) setLoading(true)
    try {
      const d = await apiGet(`/api/igcsc/grading/${encodeURIComponent(id)}`)
      setAttempt(d?.attempt || null)
      setQuestions(Array.isArray(d?.questions) ? d.questions : [])
      if (!keepDrafts) setDrafts(draftsFrom(d?.attempt))
      setPhotoBroken(false)
      setError('')
    } catch (e) {
      // A failed background poll keeps what is on screen.
      if (!quiet) setError(e.message)
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const wState = attempt?.written?.state || 'none'

  // The AI marks in the background; follow it until it is done. Nothing is
  // editable meanwhile, so replacing the drafts loses nothing.
  useEffect(() => {
    if (wState !== 'grading') return
    const t = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      load({ quiet: true })
    }, POLL_MS)
    return () => clearInterval(t)
  }, [wState, load])

  const prevState = useRef('')
  useEffect(() => {
    if (prevState.current === 'grading' && wState !== 'grading') {
      setNotice(wState === 'error'
        ? { tone: 'red', text: 'The AI could not finish marking. You can run it again.' }
        : { tone: 'green', text: 'The AI has finished marking. Check the answers below.' })
    }
    prevState.current = wState
  }, [wState])

  const questionById = useMemo(() => new Map(questions.map((q) => [q.questionId, q])), [questions])

  // Every written question in printed order with its result, plus any result
  // whose question has since left the bank - it still counts.
  const rows = useMemo(() => {
    const res = (attempt?.results || []).filter((r) => r.kind === 'written')
    const byQ = new Map(res.map((r) => [r.questionId, r]))
    const out = questions
      .filter((q) => q.kind === 'written')
      .map((q) => ({ q, r: byQ.get(q.questionId) || null, n: q.n }))
    const known = new Set(out.map((x) => x.q.questionId))
    for (const r of res) if (!known.has(r.questionId)) out.push({ q: null, r, n: r.n })
    return out.sort((a, b) => (a.n || 0) - (b.n || 0))
  }, [attempt, questions])

  const mcqRows = useMemo(
    () => (attempt?.results || [])
      .filter((r) => r.kind === 'mcq')
      .map((r) => ({ r, q: questionById.get(r.questionId) || null })),
    [attempt, questionById],
  )

  const changes = useMemo(() => changesOf(attempt, drafts), [attempt, drafts])

  const problems = useMemo(() => {
    const out = {}
    for (const r of attempt?.results || []) {
      if (r.kind !== 'written') continue
      const d = drafts[r.questionId]
      if (!d) continue
      const p = marksProblem(d.marks, Number(r.maxMarks) || 0)
      if (p) out[r.questionId] = p
    }
    return out
  }, [attempt, drafts])

  const draftScore = useMemo(() => (attempt?.results || [])
    .filter((r) => r.kind === 'written')
    .reduce((sum, r) => {
      const typed = String(drafts[r.questionId]?.marks ?? '').trim()
      const v = typed !== '' && Number.isFinite(Number(typed)) ? Number(typed) : Number(r.marksAwarded || 0)
      return sum + v
    }, 0), [attempt, drafts])

  const dirty = changes.length > 0
  const problemCount = Object.keys(problems).length

  // Leaving with unsaved marks asks first.
  useEffect(() => {
    if (!dirty) return
    const MESSAGE = 'You have unsaved marks. Leave without saving them?'
    const onBefore = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', onBefore)
    // Next's <Link> navigates without unloading the page, so beforeunload never
    // fires for it. Catch same-site link clicks first and ask.
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target?.closest?.('a[href]')
      if (!a || a.target === '_blank' || a.origin !== window.location.origin) return
      if (!window.confirm(MESSAGE)) { e.preventDefault(); e.stopPropagation() }
    }
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBefore)
      document.removeEventListener('click', onClick, true)
    }
  }, [dirty])

  const setDraft = useCallback((qid, patch) => {
    setDrafts((prev) => ({ ...prev, [qid]: { ...(prev[qid] || { marks: '', feedback: '' }), ...patch } }))
  }, [])

  const closeZoom = useCallback(() => setZoom(-1), [])
  const closeAsk = useCallback(() => setAsk(''), [])
  const markBroken = useCallback(() => setPhotoBroken(true), [])

  const reloadPhotos = async () => {
    setBusy('reload')
    await load({ keepDrafts: true, quiet: true })
    setBusy('')
  }

  const save = async (confirm) => {
    if (problemCount) {
      setNotice({ tone: 'red', text: 'Fix the marks shown in red first.' })
      setAsk('')
      return
    }
    if (!confirm && !dirty) return
    setBusy(confirm ? 'confirm' : 'save')
    setNotice(null)
    try {
      const d = await apiSend(`/api/igcsc/grading/${encodeURIComponent(id)}`, 'PATCH', { updates: changes, confirm: !!confirm })
      if (d?.attempt) {
        setAttempt(d.attempt)
        setDrafts(draftsFrom(d.attempt))
      }
      let text = 'Marks confirmed and released to the student.'
      if (!confirm) {
        text = wState === 'needs_review'
          ? 'Changes saved. The student sees these marks as provisional until you confirm.'
          : 'Changes saved. The student sees the new marks.'
      }
      setNotice({ tone: 'green', text })
    } catch (e) {
      setNotice({ tone: 'red', text: e.message })
    } finally {
      setBusy('')
      setAsk('')
    }
  }

  const regrade = async () => {
    setBusy('regrade')
    setNotice(null)
    try {
      const d = await apiSend(`/api/igcsc/grading/${encodeURIComponent(id)}`, 'POST', { action: 'regrade' })
      if (d?.attempt) {
        setAttempt(d.attempt)
        setDrafts(draftsFrom(d.attempt))
      }
      setNotice({ tone: 'blue', text: 'The AI is marking the answers again. This page updates on its own when it is done.' })
    } catch (e) {
      setNotice({ tone: 'red', text: e.message })
    } finally {
      setBusy('')
      setAsk('')
    }
  }

  if (loading && !attempt) return <Loading label="Loading the answers…" />
  if (!attempt) {
    return (
      <div className="space-y-4">
        <Link href="/igcsc/grading" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-indigo-600">
          <FiArrowLeft size={15} /> Marking queue
        </Link>
        <ErrorState message={error || 'That test was not found.'} />
      </div>
    )
  }

  const w = attempt.written || {}
  const m = attempt.mcq || {}
  const uploads = Array.isArray(w.uploads) ? w.uploads : []
  // The API only accepts changes once the AI has finished and before anyone
  // re-runs it.
  const editable = wState === 'graded' || wState === 'needs_review'
  const canRegrade = uploads.length > 0 && ['not_started', 'error', 'graded', 'needs_review'].includes(wState)
  const flaggedCount = rows.filter((x) => x.r?.flagged).length
  const writtenBadge = WRITTEN_STATE[wState]
  const attemptBadge = ATTEMPT_STATUS[attempt.status]
  const overriddenCount = rows.filter((x) => x.r?.overridden).length

  return (
    <div className="pb-6">
      <Link href="/igcsc/grading" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-indigo-600">
        <FiArrowLeft size={15} /> Marking queue
      </Link>

      {/* Hero */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Checking written answers</p>
            <h1 className="mt-1 break-words text-2xl font-extrabold tracking-tight">{attempt.userName || 'Student'}</h1>
            <p className="mt-1 break-words text-sm text-white/85">
              {attempt.paperTitle}{attempt.paperUnit ? ` · ${attempt.paperUnit}` : ''}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {attemptBadge && <Badge tone={attemptBadge.tone}>{attemptBadge.label}</Badge>}
              {writtenBadge && <Badge tone={writtenBadge.tone}>Written: {writtenBadge.label}</Badge>}
              {flaggedCount > 0 && <Badge tone="amber">{flaggedCount} flagged</Badge>}
            </div>
          </div>
          {canRegrade && wState !== 'not_started' && (
            <button
              type="button"
              onClick={() => setAsk('regrade')}
              disabled={!!busy}
              className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/25 disabled:opacity-50"
            >
              <FiRefreshCw size={15} className={busy === 'regrade' ? 'animate-spin' : ''} /> Re-run AI marking
            </button>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <HeroStat
            label="Written"
            value={editable ? `${fmtNum(dirty ? draftScore : w.score ?? 0)} / ${w.max || 0}` : writtenBadge?.label || '—'}
            hint={editable && dirty ? 'with your unsaved changes' : w.count ? `${w.count} question${w.count === 1 ? '' : 's'}` : ''}
          />
          <HeroStat
            label="MCQ"
            value={m.state === 'none' ? '—' : m.state === 'submitted' ? `${fmtNum(m.score)} / ${m.max || 0}` : MCQ_STATE[m.state] || '—'}
            hint={m.state === 'submitted' ? `${m.correct ?? 0} of ${m.count || 0} correct` : ''}
          />
          <HeroStat
            label="Total"
            value={attempt.maxScore ? `${fmtNum(attempt.score)} / ${attempt.maxScore}` : '—'}
            hint={attempt.percentage != null ? `${attempt.percentage}%${attempt.grade ? ` · grade ${attempt.grade}` : ''}` : 'final once every part is marked'}
          />
          <HeroStat
            label="Marked by"
            value={w.reviewedBy ? w.reviewedBy : w.model ? 'AI' : '—'}
            hint={w.reviewedBy ? 'confirmed by a tutor' : w.model || ''}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/70">
          {w.submittedAt && <span>Sent {fmtWhen(w.submittedAt)}</span>}
          {w.gradedAt && <span>AI marked {fmtWhen(w.gradedAt)}</span>}
          {w.tries > 1 && <span>{w.tries} marking runs</span>}
          {overriddenCount > 0 && <span>{overriddenCount} mark{overriddenCount === 1 ? '' : 's'} changed by a tutor</span>}
        </div>
      </div>

      {notice && (
        <div className={`mt-4 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
          notice.tone === 'green' ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : notice.tone === 'blue' ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'}`}
        >
          <span className="flex min-w-0 items-start gap-2">
            {notice.tone === 'green' ? <FiCheckCircle size={16} className="mt-0.5 flex-shrink-0" />
              : notice.tone === 'blue' ? <FiCpu size={16} className="mt-0.5 flex-shrink-0" />
                : <FiAlertTriangle size={16} className="mt-0.5 flex-shrink-0" />}
            <span className="min-w-0 break-words">{notice.text}</span>
          </span>
          <button type="button" onClick={() => setNotice(null)} className="flex-shrink-0 rounded-lg p-1 transition hover:bg-white/60" aria-label="Dismiss">
            <FiX size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4"><ErrorState message={error} /></div>
      )}

      {/* Where the written section stands, when it is not simply ready to review */}
      {wState === 'grading' && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-800">
          <FiLoader size={18} className="mt-0.5 flex-shrink-0 animate-spin" />
          <div>
            <p className="font-semibold">The AI is marking these answers.</p>
            <p className="mt-0.5 text-blue-700">This usually takes under two minutes. The page updates on its own; marks can be changed once it is done.</p>
          </div>
        </div>
      )}
      {wState === 'error' && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <FiAlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Marking failed.</p>
              <p className="mt-0.5 break-words text-rose-700">{w.error || 'The AI could not mark these answers.'}</p>
            </div>
          </div>
          {canRegrade && (
            <button type="button" onClick={() => setAsk('regrade')} disabled={!!busy} className={`${BTN_PRIMARY} flex-shrink-0`}>
              <FiRefreshCw size={15} /> Try again
            </button>
          )}
        </div>
      )}
      {wState === 'not_started' && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <FiInfo size={18} className="mt-0.5 flex-shrink-0 text-slate-400" />
            <p>
              {attempt.userName || 'The student'} has not sent their written answers for marking yet.
              {uploads.length > 0 ? ` ${uploads.length} page${uploads.length === 1 ? ' is' : 's are'} uploaded so far.` : ''}
            </p>
          </div>
          {canRegrade && (
            <button type="button" onClick={() => setAsk('regrade')} disabled={!!busy} className={`${BTN_SECONDARY} flex-shrink-0`}>
              <FiCpu size={15} /> Mark with AI now
            </button>
          )}
        </div>
      )}
      {wState === 'graded' && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <FiCheckCircle size={17} className="mt-0.5 flex-shrink-0" />
          <p>
            {w.reviewedBy
              ? `Released to the student — confirmed by ${w.reviewedBy}. Any change you save now reaches them straight away.`
              : 'The AI was sure of every answer, so these marks went to the student straight away. Any change you save reaches them too.'}
          </p>
        </div>
      )}

      {/* Section A, for context */}
      {m.state && m.state !== 'none' && (
        <div className="mt-6">
          <McqSection attempt={attempt} rows={mcqRows} open={mcqOpen} onToggle={() => setMcqOpen((o) => !o)} />
        </div>
      )}

      {/* Section B */}
      {wState === 'none' ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <EmptyState icon={FiEdit3} title="No written section" hint="This paper is all online MCQ, so there is nothing to mark by hand." />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
            <PhotoPane
              uploads={uploads}
              broken={photoBroken}
              reloading={busy === 'reload'}
              onOpen={setZoom}
              onBroken={markBroken}
              onReload={reloadPhotos}
            />
          </div>

          <div className="min-w-0 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-800">Section B · Written</h2>
              <span className="text-xs text-slate-400">{rows.length} question{rows.length === 1 ? '' : 's'}</span>
            </div>
            {rows.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <EmptyState icon={FiEdit3} title="No written questions found" hint="The paper's questions may have changed in the bank since this was sat." />
              </div>
            ) : (
              rows.map((row) => {
                const qid = row.r?.questionId || row.q?.questionId
                return (
                  <WrittenCard
                    key={qid}
                    row={row}
                    draft={row.r ? drafts[row.r.questionId] : null}
                    problem={row.r ? problems[row.r.questionId] || '' : ''}
                    editable={editable}
                    disabled={!!busy}
                    onDraft={setDraft}
                  />
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Save bar */}
      {editable && rows.some((x) => x.r) && (
        <div className="sticky bottom-4 z-40 mt-6">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="min-w-0 text-sm">
              {problemCount > 0 ? (
                <span className="font-semibold text-rose-600">{problemCount} mark{problemCount === 1 ? '' : 's'} need fixing</span>
              ) : dirty ? (
                <span className="font-semibold text-amber-700">{changes.length} unsaved change{changes.length === 1 ? '' : 's'}</span>
              ) : (
                <span className="text-slate-500">All changes saved</span>
              )}
              <span className="text-slate-400"> · Written {fmtNum(draftScore)} / {w.max || 0}</span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => save(false)}
                disabled={!dirty || !!busy || problemCount > 0}
                className={BTN_SECONDARY}
              >
                {busy === 'save' ? <FiLoader size={15} className="animate-spin" /> : <FiSave size={15} />} Save changes
              </button>
              <button
                type="button"
                onClick={() => setAsk('confirm')}
                disabled={!!busy || problemCount > 0}
                className={BTN_PRIMARY}
              >
                {busy === 'confirm' ? <FiLoader size={15} className="animate-spin" /> : <FiSend size={15} />}
                {wState === 'needs_review' ? 'Confirm & release to student' : dirty ? 'Save & confirm' : 'Confirm marks'}
              </button>
            </div>
          </div>
        </div>
      )}

      {ask === 'confirm' && (
        <ConfirmDialog
          title="Release these marks?"
          confirmLabel={dirty ? 'Save & release' : 'Release marks'}
          busy={busy === 'confirm'}
          onConfirm={() => save(true)}
          onCancel={closeAsk}
        >
          <p>
            The written mark of <strong className="text-slate-800">{fmtNum(draftScore)} / {w.max || 0}</strong> becomes final
            and {attempt.userName || 'the student'} sees it straight away.
          </p>
          {flaggedCount > 0 && <p>{flaggedCount} flagged answer{flaggedCount === 1 ? '' : 's'} will be marked as checked.</p>}
          {dirty && <p>Your {changes.length} unsaved change{changes.length === 1 ? ' is' : 's are'} saved first.</p>}
        </ConfirmDialog>
      )}

      {ask === 'regrade' && (
        <ConfirmDialog
          title={wState === 'not_started' ? 'Mark these answers now?' : 'Re-run AI marking?'}
          confirmLabel={wState === 'not_started' ? 'Mark now' : 'Re-run marking'}
          danger={wState !== 'not_started' && (overriddenCount > 0 || dirty)}
          busy={busy === 'regrade'}
          onConfirm={regrade}
          onCancel={closeAsk}
        >
          {wState === 'not_started' ? (
            <p>The AI will mark the {uploads.length} uploaded page{uploads.length === 1 ? '' : 's'} as they are now, before the student has sent them in.</p>
          ) : (
            <>
              <p>The AI will mark every written answer again from the {uploads.length} photographed page{uploads.length === 1 ? '' : 's'}.</p>
              {(overriddenCount > 0 || dirty) && (
                <p className="font-semibold text-rose-700">Marks and feedback changed by a tutor will be replaced{dirty ? ', and your unsaved changes are lost' : ''}.</p>
              )}
              <p>The student sees &ldquo;being marked&rdquo; until it finishes.</p>
            </>
          )}
        </ConfirmDialog>
      )}

      {zoom >= 0 && zoom < uploads.length && (
        <Lightbox uploads={uploads} index={zoom} onClose={closeZoom} onIndex={setZoom} />
      )}
    </div>
  )
}
