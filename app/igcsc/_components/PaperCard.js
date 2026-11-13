'use client'
// The store's building blocks: a paper card, a plan card, an attempt row, a
// confirm dialog and the checkout call. The store, the paper page, My tests and
// the dashboard all use them, so a paper looks and buys the same everywhere.
import { useEffect } from 'react'
import Link from 'next/link'
import {
  FiCheckSquare, FiEdit3, FiAward, FiClock, FiUnlock, FiShoppingCart, FiArrowRight,
  FiCheck, FiLoader, FiLayers, FiKey, FiChevronRight,
} from 'react-icons/fi'
import { apiSend } from './api'
import { formatPrice, planSummary, VIA_LABEL, ATTEMPT_STATUS } from '../../../lib/igcscStoreShared'

export const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-1.5 bg-cta px-4 py-2 text-sm font-medium text-on-cta transition hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-50'
export const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-1.5 border border-line-strong px-4 py-2 text-sm font-medium text-ink transition hover:border-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-50'

export const DIFFICULTY_TONE = { Easy: 'green', Medium: 'blue', Hard: 'amber', 'Very Hard': 'rose' }
export const GRADE_TONE = { 'A*': 'green', A: 'green', B: 'blue', C: 'amber', D: 'amber', E: 'red', U: 'red' }

// Editorial status chips. Same tone names the old badges used, so the maps
// above keep working, drawn in the portal's paper-and-ink palette.
const CHIP_BASE =
  'inline-flex max-w-full items-center gap-1 rounded-full border border-line px-2.5 py-0.5 font-code text-[11px] uppercase tracking-[0.08em]'
const CHIP_TONES = {
  green: 'bg-[#2f7d4514] text-positive',
  red: 'bg-[#b4231814] text-negative',
  rose: 'bg-[#b4231814] text-negative',
  amber: 'bg-[#b7791f14] text-star',
  blue: 'bg-[#3f6b6414] text-calm',
  violet: 'bg-[#3f6b6414] text-calm',
  indigo: 'bg-brand-50 text-brand',
  brand: 'bg-brand-50 text-brand',
  slate: 'bg-sunken text-muted',
}
export function Chip({ tone = 'slate', children }) {
  return <span className={`${CHIP_BASE} ${CHIP_TONES[tone] || CHIP_TONES.slate}`}>{children}</span>
}

const DAY_MS = 86400000

// A due date picked without a time arrives as midnight UTC. Shown in local time
// it would slip to the day before west of Greenwich, and it would count as
// overdue from the first minute of the day it is due.
const isDateOnly = (t) => t % DAY_MS === 0

export function fmtDate(d) {
  if (!d) return ''
  const t = new Date(d)
  if (Number.isNaN(t.getTime())) return ''
  return t.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtDue(d) {
  if (!d) return ''
  const t = new Date(d)
  if (Number.isNaN(t.getTime())) return ''
  const opts = { weekday: 'short', day: 'numeric', month: 'short' }
  if (isDateOnly(t.getTime())) opts.timeZone = 'UTC'
  return t.toLocaleDateString(undefined, opts)
}

function dueTime(d) {
  if (!d) return Infinity
  const t = new Date(d).getTime()
  if (!Number.isFinite(t)) return Infinity
  return isDateOnly(t) ? t + DAY_MS - 1 : t
}

// Soonest due first, undated last, then the most recently assigned.
export function byDueDate(a, b) {
  const da = dueTime(a?.dueAt)
  const db = dueTime(b?.dueAt)
  if (da !== db) return da - db
  return new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
}

// Handed in counts as on time: only work not yet submitted can be overdue.
export function isOverdue(assignment) {
  const s = assignment?.latestAttempt?.status
  if (s === 'grading' || s === 'needs_review' || s === 'completed') return false
  const t = dueTime(assignment?.dueAt)
  return Number.isFinite(t) && t < Date.now()
}

// The clock a student sits against: an MCQ-only paper is timed online, anything
// with a written part runs to the full paper time.
export function paperMinutes(p) {
  if (!p) return 0
  if (!p.writtenCount && p.mcqDurationMin) return p.mcqDurationMin
  return p.durationMin || 0
}

export function attemptHref(a) {
  const done = a?.status === 'completed' || a?.status === 'needs_review'
  return `/igcsc/attempt/${a?._id}${done ? '/result' : ''}`
}

const MCQ_NOTE = {
  not_started: 'MCQ not started',
  in_progress: 'MCQ in progress',
  submitted: 'MCQ marked',
}
const WRITTEN_NOTE = {
  not_started: 'Written: upload your answers',
  grading: 'Written: being marked',
  graded: 'Written marked',
  needs_review: 'Written: tutor checking',
  error: 'Written: marking failed, try again',
}

// "MCQ marked · Written: upload your answers" - where each section stands.
export function sectionNotes(a) {
  return [MCQ_NOTE[a?.mcqState], WRITTEN_NOTE[a?.writtenState]].filter(Boolean)
}

// Start paying for a paper or a plan. Leaves for Stripe, or reports that it was
// granted on the spot (a free plan).
export async function checkout(body) {
  const r = await apiSend('/api/igcsc/store/checkout', 'POST', body)
  if (r && typeof r.url === 'string' && /^https:\/\//i.test(r.url)) {
    window.location.href = r.url
    return 'redirect'
  }
  if (r && r.granted) return 'granted'
  throw new Error('Could not start the payment. Please try again.')
}

const Spinner = () => <FiLoader className="animate-spin" size={14} />

// `busy`: '' when idle, 'buy' | 'redeem' | 'open' while that button works, or
// true to lock the card while another one is busy.
export function PaperCard({ paper, currency = 'usd', credits = 0, busy, onBuy, onRedeem, onOpen, storeOpen = true }) {
  const p = paper || {}
  const access = p.access || {}
  const allowed = !!access.allowed
  const free = allowed && access.via === 'free'
  const locked = !!busy
  const href = `/igcsc/papers/${p._id}`
  const minutes = paperMinutes(p)
  const meta = [
    p.mcqCount ? { icon: FiCheckSquare, text: `MCQ ${p.mcqCount}` } : null,
    p.writtenCount ? { icon: FiEdit3, text: `Written ${p.writtenCount}` } : null,
    p.totalMarks ? { icon: FiAward, text: `${p.totalMarks} marks` } : null,
    minutes ? { icon: FiClock, text: `${minutes} min` } : null,
  ].filter(Boolean)
  const tags = [p.curriculum, p.subject].filter(Boolean).join(' · ')

  let side
  if (allowed && free) {
    side = <Chip tone="green"><FiCheck size={12} /> Free</Chip>
  } else if (allowed) {
    side = (
      <div className="min-w-0">
        <Chip tone="green"><FiCheck size={12} /> {VIA_LABEL[access.via] || 'Unlocked'}</Chip>
        {access.expiresAt && <p className="mt-1 font-code text-[11px] text-subtle">until {fmtDate(access.expiresAt)}</p>}
      </div>
    )
  } else if (p.isPublished === false) {
    side = <Chip tone="slate">Not on sale</Chip>
  } else {
    side = (
      <div>
        <p className="font-code text-lg tabular-nums leading-none text-ink">{formatPrice(p.price, currency)}</p>
        <p className="mt-1 font-code text-[11px] text-subtle">one paper</p>
      </div>
    )
  }

  let actions = null
  if (allowed) {
    const label = free ? 'Free · Open' : 'Open'
    actions = onOpen ? (
      <button type="button" className={BTN_PRIMARY} disabled={locked} onClick={() => onOpen(p)}>
        {busy === 'open' ? <Spinner /> : null}{label} <FiArrowRight size={14} />
      </button>
    ) : (
      <Link href={href} className={BTN_PRIMARY}>{label} <FiArrowRight size={14} /></Link>
    )
  } else if (p.isPublished !== false) {
    actions = (
      <>
        {credits > 0 && onRedeem && (
          <button type="button" className={BTN_SECONDARY} disabled={locked} onClick={() => onRedeem(p)}>
            {busy === 'redeem' ? <Spinner /> : <FiKey size={14} />} Use 1 credit
          </button>
        )}
        <button
          type="button"
          className={BTN_PRIMARY}
          disabled={locked || !storeOpen || !onBuy}
          title={storeOpen ? undefined : 'The store is closed right now'}
          onClick={() => onBuy && onBuy(p)}
        >
          {busy === 'buy' ? <Spinner /> : <FiShoppingCart size={14} />} Buy <span className="font-code tabular-nums">{formatPrice(p.price, currency)}</span>
        </button>
      </>
    )
  }

  return (
    <div className="group lift flex h-full flex-col border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-2">
        {tags ? (
          <span className="min-w-0 truncate font-code text-[11px] uppercase tracking-[0.12em] text-muted">{tags}</span>
        ) : <span />}
        {p.difficulty && <Chip tone={DIFFICULTY_TONE[p.difficulty] || 'slate'}>{p.difficulty}</Chip>}
      </div>

      <Link href={href} className="mt-3 block">
        <h3 className="display text-lg leading-snug text-ink transition-colors group-hover:text-brand">{p.title || 'Test paper'}</h3>
        {p.unit && <p className="mt-1 line-clamp-2 text-sm text-muted">{p.unit}</p>}
      </Link>

      {meta.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-code text-[11px] text-muted">
          {meta.map((m) => (
            <span key={m.text} className="inline-flex items-center gap-1">
              <m.icon size={12} className="text-subtle" /> {m.text}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          {side}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  )
}

export function PlanCard({ plan, currency = 'usd', busy, onBuy, storeOpen = true }) {
  const p = plan || {}
  const isCredits = p.kind === 'credits'
  const Icon = isCredits ? FiLayers : FiUnlock
  const price = Number(p.price || 0)
  const perPaper = isCredits && Number(p.credits) > 1 && price > 0 ? price / Number(p.credits) : 0
  const features = Array.isArray(p.features) ? p.features.filter(Boolean) : []

  return (
    <div className={`relative flex h-full flex-col overflow-hidden border bg-surface p-5 ${p.highlight ? 'border-brand' : 'border-line'}`}>
      {p.highlight && (
        <span className="absolute right-0 top-0 bg-brand px-3 py-1 font-code text-[10px] uppercase tracking-[0.1em] text-on-brand">
          Best value
        </span>
      )}
      <div className={`flex items-center gap-3 ${p.highlight ? 'pr-20' : ''}`}>
        <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center border ${p.highlight ? 'border-brand bg-brand text-on-brand' : 'border-line bg-brand-50 text-brand'}`}>
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <p className="font-code text-[11px] uppercase tracking-[0.12em] text-muted">{isCredits ? 'Credit pack' : 'Access pass'}</p>
          <h3 className="display truncate text-lg text-ink">{p.name}</h3>
        </div>
      </div>

      <p className="mt-3 text-sm font-medium text-ink-2">{p.summary || planSummary(p)}</p>
      {p.description && <p className="mt-1 text-xs leading-relaxed text-muted">{p.description}</p>}

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="font-code text-3xl tabular-nums tracking-tight text-ink">{formatPrice(price, currency)}</span>
        {price > 0 && <span className="font-code text-xs text-subtle">one-time</span>}
      </div>
      {perPaper > 0 && (
        <p className="mt-0.5 font-code text-xs text-positive">{formatPrice(perPaper, currency)} a paper</p>
      )}

      {features.length > 0 && (
        <ul className="mt-4 space-y-2">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-ink-2">
              <FiCheck size={15} className="mt-0.5 flex-shrink-0 text-positive" />
              <span className="min-w-0 break-words">{f}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-5">
        <button
          type="button"
          className={`w-full py-2.5 ${p.highlight ? BTN_PRIMARY : BTN_SECONDARY}`}
          disabled={!!busy || !storeOpen || !onBuy}
          title={storeOpen ? undefined : 'The store is closed right now'}
          onClick={() => onBuy && onBuy(p)}
        >
          {busy ? <Spinner /> : <FiShoppingCart size={14} />} {price > 0 ? 'Buy now' : 'Get it free'}
        </button>
      </div>
    </div>
  )
}

// One sitting in a list. Marked attempts show their score; open ones say where
// each section stands.
export function AttemptRow({ attempt, showPaper = true }) {
  const a = attempt || {}
  const st = ATTEMPT_STATUS[a.status] || { label: a.status || 'Unknown', tone: 'slate' }
  const done = a.status === 'completed' || a.status === 'needs_review'
  const notes = done ? [] : sectionNotes(a)
  const when = done ? a.completedAt || a.createdAt : a.createdAt

  return (
    <Link href={attemptHref(a)} className="flex items-center gap-3 px-2 py-3 transition hover:bg-ink/5 sm:px-3">
      <div className="min-w-0 flex-1">
        {showPaper && <p className="truncate text-sm font-medium text-ink">{a.paperTitle || 'Test paper'}</p>}
        {showPaper && a.paperUnit && <p className="truncate text-xs text-muted">{a.paperUnit}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Chip tone={st.tone}>{st.label}</Chip>
          {when && <span className="font-code text-[11px] text-subtle">{done ? '' : 'Started '}{fmtDate(when)}</span>}
        </div>
        {notes.length > 0 && <p className="mt-1 text-[11px] text-muted">{notes.join(' · ')}</p>}
      </div>
      {a.percentage != null ? (
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <span className="font-code text-lg tabular-nums leading-none text-ink">{a.percentage}%</span>
          {a.grade && <Chip tone={GRADE_TONE[a.grade] || 'slate'}>{a.grade}</Chip>}
        </div>
      ) : (
        <span className="flex-shrink-0 font-code text-xs uppercase tracking-[0.08em] text-brand">{a.status === 'in_progress' ? 'Continue' : 'View'}</span>
      )}
      <FiChevronRight size={16} className="flex-shrink-0 text-subtle" />
    </Link>
  )
}

export function ConfirmDialog({ title, children, confirmLabel = 'Confirm', cancelLabel = 'Cancel', busy, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy && onCancel) onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={() => { if (!busy && onCancel) onCancel() }}
    >
      <div className="animate-pop w-full max-w-md border border-line-strong bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="display text-xl text-ink">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-ink-2">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="border border-line-strong px-4 py-2.5 text-sm font-medium text-ink transition hover:border-ink hover:bg-ink/5 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className={`${BTN_PRIMARY} py-2.5`}>
            {busy ? <Spinner /> : null}{confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
