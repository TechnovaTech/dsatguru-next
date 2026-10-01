'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  FiFileText, FiLayers, FiShoppingBag, FiSettings, FiRefreshCw, FiSearch, FiX, FiCheck, FiPlus,
  FiEdit2, FiTrash2, FiLock, FiAlertTriangle, FiCheckCircle, FiLoader, FiChevronLeft, FiChevronRight,
  FiGift, FiDollarSign, FiRotateCcw, FiSlash, FiTag, FiExternalLink, FiInfo, FiCreditCard, FiEye,
  FiEyeOff, FiPower, FiUser,
} from 'react-icons/fi'
import { apiGet, apiGetSafe, apiSend } from '../_components/api'
import { igcscUser } from '../_components/auth'
import { PageHeader, StatCard, Card, Badge, Loading, EmptyState, ErrorState, Table } from '../_components/ui'
import { CURRENCIES, formatPrice, priceProblem, planSummary } from '../../../lib/igcscStoreShared'

// The store's back office: what each paper costs and whether it is on sale,
// the plans, the sales, and the store's own switches. Every endpoint behind it
// is admin-only, so a tutor is told so up front instead of meeting a 403.

const TABS = [
  { key: 'papers', label: 'Papers', icon: FiFileText },
  { key: 'plans', label: 'Plans', icon: FiLayers },
  { key: 'orders', label: 'Orders', icon: FiShoppingBag },
  { key: 'settings', label: 'Settings', icon: FiSettings },
]

const PAPER_LIMIT = 50
const ORDER_LIMIT = 50
const MAX_IDS = 5000

const STATUS_FILTERS = [
  { value: '', label: 'In the bank' },
  { value: 'published', label: 'Published' },
  { value: 'unpublished', label: 'Unpublished' },
  { value: 'held', label: 'Held back' },
  { value: 'missing', label: 'Missing from bank' },
  { value: 'all', label: 'Everything' },
]

const FORMAT_FILTERS = [
  { value: '', label: 'Any format' },
  { value: 'mcq', label: 'Online MCQ only' },
  { value: 'written', label: 'Written only' },
  { value: 'mixed', label: 'MCQ + written' },
]

const ORDER_STATUSES = [
  { value: '', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
]
const ORDER_TONE = { paid: 'green', pending: 'amber', refunded: 'violet', failed: 'red', cancelled: 'slate' }
const KIND_LABEL = { paper: 'Paper', plan: 'Plan', grant: 'Granted' }
const KIND_TONE = { paper: 'slate', plan: 'indigo', grant: 'cyan' }
const DIFFICULTY_TONE = { Easy: 'green', Medium: 'blue', Hard: 'amber', 'Very Hard': 'rose' }

const DURATION_PRESETS = [
  { value: '0', label: 'Never expires' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '180 days' },
  { value: '365', label: '1 year' },
  { value: 'custom', label: 'Custom…' },
]

const BLANK_FILTERS = { curriculum: '', subject: '', status: '', format: '', q: '' }

const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
const BTN_DANGER =
  'inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50'
const BTN_SMALL =
  'inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
const INPUT =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400'
const CHECKBOX = 'h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const cur = (c) => String(c || 'usd').toUpperCase()

function plural(n, one, many) {
  const v = Number(n || 0)
  return `${v.toLocaleString()} ${v === 1 ? one : many || `${one}s`}`
}

function fmtDate(d) {
  if (!d) return ''
  const t = new Date(d)
  return Number.isNaN(t.getTime()) ? '' : t.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(d) {
  if (!d) return ''
  const t = new Date(d)
  if (Number.isNaN(t.getTime())) return ''
  return t.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDuration(ms) {
  const s = Math.round(Number(ms || 0) / 100) / 10
  if (!s) return '—'
  return s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${s}s`
}

// formatPrice says "Free" for 0, which is right for a price and wrong for a
// revenue total.
function money(amount, currency) {
  const n = Number(amount || 0)
  if (n) return formatPrice(n, currency)
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur(currency) }).format(0)
  } catch {
    return `0.00 ${cur(currency)}`
  }
}

// A cleared box is not 0: it must never quietly make something free.
function readPrice(text, currency) {
  const s = String(text ?? '').trim()
  if (!s) return { error: 'Enter a price (0 makes it free).' }
  const n = Number(s)
  const problem = priceProblem(n, currency)
  return problem ? { error: problem } : { price: n }
}

function papersUrl(f, page, limit = PAPER_LIMIT) {
  const sp = new URLSearchParams()
  for (const k of ['curriculum', 'subject', 'status', 'format', 'q']) {
    if (f[k]) sp.set(k, f[k])
  }
  sp.set('page', String(page))
  sp.set('limit', String(limit))
  return `/api/igcsc/admin/papers?${sp.toString()}`
}

// Exactly the keys the API's filter builder reads, so "apply to all matching"
// changes the same papers the list was showing.
const filterBody = (f) => ({ curriculum: f.curriculum, subject: f.subject, q: f.q, status: f.status, format: f.format })

// The filter in words, so a bulk confirm says exactly what is about to move.
function filterWords(f) {
  const bits = []
  if (f.curriculum) bits.push(f.subject ? `${f.curriculum} ${f.subject}` : f.curriculum)
  else if (f.subject) bits.push(f.subject)
  if (f.status) bits.push((STATUS_FILTERS.find((s) => s.value === f.status)?.label || f.status).toLowerCase())
  if (f.format) bits.push((FORMAT_FILTERS.find((s) => s.value === f.format)?.label || f.format).toLowerCase())
  if (f.q) bits.push(`matching “${f.q}”`)
  return bits.length ? bits.join(' · ') : 'every paper in the bank'
}

function paperStatus(p) {
  if (p.missingFromBank) return { label: 'Missing', tone: 'red' }
  if (p.isPublished) return { label: 'Published', tone: 'green' }
  if (!p.clean) return { label: 'Held', tone: 'amber' }
  return { label: 'Unpublished', tone: 'slate' }
}

function planDraft(p) {
  const days = Number(p?.durationDays || 0)
  return {
    name: p?.name || '',
    description: p?.description || '',
    kind: p?.kind === 'access' ? 'access' : 'credits',
    credits: String(p?.kind === 'credits' && p?.credits ? p.credits : 5),
    scope: p?.scope || 'all',
    curriculum: p?.curriculum || '',
    subject: p?.subject || '',
    durationPreset: DURATION_PRESETS.some((d) => d.value === String(days)) ? String(days) : 'custom',
    durationDays: String(days),
    // A new plan starts blank on purpose: the API refuses a plan with no price
    // rather than putting it on sale for free.
    price: p ? String(p.price ?? 0) : '',
    features: Array.isArray(p?.features) ? p.features.join('\n') : '',
    highlight: !!p?.highlight,
    isActive: p ? p.isActive !== false : true,
    sortOrder: String(p?.sortOrder || 0),
  }
}

const BLANK_PLAN = planDraft(null)

function planBody(d) {
  const days = d.durationPreset === 'custom'
    ? (String(d.durationDays).trim() === '' ? NaN : Number(d.durationDays))
    : Number(d.durationPreset)
  return {
    name: d.name.trim(),
    description: d.description.trim(),
    kind: d.kind,
    credits: Number(String(d.credits).trim() || NaN),
    scope: d.scope,
    curriculum: d.scope === 'all' ? '' : d.curriculum,
    subject: d.scope === 'subject' ? d.subject : '',
    durationDays: days,
    price: Number(String(d.price).trim() || NaN),
    features: d.features.split('\n').map((s) => s.trim()).filter(Boolean),
    highlight: !!d.highlight,
    isActive: !!d.isActive,
    sortOrder: Number(String(d.sortOrder).trim() || 0),
  }
}

// The same rules the API applies, checked here so the admin sees the problem
// next to the field instead of after a round trip.
function planProblem(d, currency) {
  const b = planBody(d)
  if (!b.name) return 'Give the plan a name.'
  if (b.name.length > 80) return 'Keep the name to 80 characters or fewer.'
  if (b.description.length > 400) return 'Keep the description to 400 characters or fewer.'
  if (b.kind === 'credits') {
    if (!Number.isInteger(b.credits) || b.credits < 1 || b.credits > 500) {
      return 'A credits pack holds a whole number of credits from 1 to 500.'
    }
  } else {
    if (b.scope !== 'all' && !b.curriculum) return 'Choose a curriculum.'
    if (b.scope === 'subject' && !b.subject) return 'Choose a subject.'
    if (!Number.isInteger(b.durationDays) || b.durationDays < 0 || b.durationDays > 3650) {
      return 'Duration must be a whole number of days from 0 (never expires) to 3650.'
    }
  }
  const pr = readPrice(d.price, currency)
  if (pr.error) return pr.error
  if (b.features.length > 8) return 'Up to 8 features.'
  if (b.features.some((f) => f.length > 120)) return 'Keep each feature to 120 characters or fewer.'
  if (!Number.isInteger(b.sortOrder)) return 'Sort order must be a whole number.'
  return ''
}

// ─────────────────────────────────────────────────────────────────────────────
// Building blocks
// ─────────────────────────────────────────────────────────────────────────────

const Spin = ({ size = 14 }) => <FiLoader className="animate-spin" size={size} />

function Modal({ title, subtitle, icon: Icon, danger, onClose, children, footer, wide }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${danger ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                <Icon size={18} />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900">{title}</h2>
              {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close"
              className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <FiX size={18} />
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3">{footer}</div>
        )}
      </div>
    </div>
  )
}

function ConfirmDialog({ title, body, confirmLabel = 'Confirm', danger, busy, error, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  return (
    <Modal
      title={title}
      icon={danger ? FiAlertTriangle : FiInfo}
      danger={danger}
      onClose={busy ? undefined : onCancel}
      footer={(
        <>
          <button type="button" onClick={onCancel} disabled={busy} className={BTN_SECONDARY}>Cancel</button>
          <button type="button" onClick={onConfirm} disabled={busy} className={danger ? BTN_DANGER : BTN_PRIMARY}>
            {busy && <Spin />} {confirmLabel}
          </button>
        </>
      )}
    >
      <div className="space-y-3 text-sm leading-relaxed text-slate-600">{body}</div>
      {error && <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
    </Modal>
  )
}

// ask({ title, body, confirmLabel, danger, run }) opens a confirm; `run` is
// awaited, and if it throws the message stays in the dialog so the admin can
// read it and try again.
function useConfirm() {
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const ask = useCallback((opts) => {
    setError('')
    setPending(opts)
  }, [])
  const cancel = useCallback(() => setPending(null), [])

  const confirm = async () => {
    if (!pending) return
    setBusy(true)
    setError('')
    try {
      await pending.run()
      setPending(null)
    } catch (e) {
      setError(e?.message || 'That did not work. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const dialog = pending ? (
    <ConfirmDialog
      title={pending.title}
      body={pending.body}
      confirmLabel={pending.confirmLabel}
      danger={pending.danger}
      busy={busy}
      error={error}
      onConfirm={confirm}
      onCancel={cancel}
    />
  ) : null

  return { ask, dialog }
}

const NOTICE_TONES = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  red: 'border-rose-200 bg-rose-50 text-rose-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-900',
}

function Notice({ notice, onClose }) {
  if (!notice) return null
  const Icon = notice.tone === 'green' ? FiCheckCircle : notice.tone === 'red' ? FiAlertTriangle : FiInfo
  return (
    <div className={`mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${NOTICE_TONES[notice.tone] || NOTICE_TONES.amber}`}>
      <Icon size={18} className="mt-0.5 flex-shrink-0" />
      <p className="min-w-0 flex-1">{notice.text}</p>
      <button type="button" onClick={onClose} aria-label="Dismiss"
        className="flex-shrink-0 rounded-lg p-1 opacity-60 hover:bg-black/5 hover:opacity-100">
        <FiX size={16} />
      </button>
    </div>
  )
}

function Toggle({ on, onChange, disabled, label, title }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!on}
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

function ToggleRow({ label, hint, on, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
      </div>
      <Toggle on={on} onChange={onChange} disabled={disabled} label={label} />
    </div>
  )
}

function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  )
}

function Segmented({ value, options, onChange }) {
  return (
    <div className="flex w-full rounded-xl bg-slate-100 p-1 sm:inline-flex sm:w-auto">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition sm:flex-none ${value === o.value
            ? 'bg-white text-indigo-700 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function SearchBox({ value, onChange, placeholder, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${INPUT} pl-9`} />
    </div>
  )
}

function Pager({ page, pages, total, limit, busy, onPage }) {
  if (!total) return null
  const from = (page - 1) * limit + 1
  const to = Math.min(total, page * limit)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
      <span>{from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onPage(page - 1)} disabled={busy || page <= 1} className={BTN_SMALL}>
          <FiChevronLeft size={14} /> Prev
        </button>
        <span className="px-1.5 font-semibold text-slate-700">{page} / {pages}</span>
        <button type="button" onClick={() => onPage(page + 1)} disabled={busy || page >= pages} className={BTN_SMALL}>
          Next <FiChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

function SectionTitle({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page chrome
// ─────────────────────────────────────────────────────────────────────────────

function StoreHero({ settings, onOpenSettings }) {
  const open = !!settings?.storeOpen
  return (
    <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-5 text-white shadow-sm sm:p-6">
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-16 right-24 h-36 w-36 rounded-full bg-white/5" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-100">Paper store</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Store & pricing</h1>
          <p className="mt-1 max-w-xl text-sm text-indigo-100">
            Set what each paper costs, build plans, follow sales and hand out access.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {settings && (
            <button type="button" onClick={onOpenSettings}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/25 transition hover:bg-white/25">
              <span className={`h-2 w-2 rounded-full ${open ? 'bg-emerald-300' : 'bg-amber-300'}`} />
              {open ? 'Store open' : 'Store closed'}
            </button>
          )}
          {settings && (
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/25">{cur(settings.currency)}</span>
          )}
          <Link href="/igcsc/store"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50">
            <FiExternalLink size={13} /> View store
          </Link>
        </div>
      </div>
    </div>
  )
}

function TabBar({ tab, onPick }) {
  return (
    <div className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onPick(t.key)}
            className={`inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === t.key
              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ClosedBanner({ onOpen }) {
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center">
      <FiLock size={18} className="flex-shrink-0" />
      <p className="min-w-0 flex-1">
        The store is closed: students can browse papers, but nobody can buy. Set your prices and plans, then open it.
      </p>
      <button type="button" onClick={onOpen}
        className="inline-flex flex-shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
        <FiPower size={13} /> Open settings
      </button>
    </div>
  )
}

function AdminsOnly() {
  return (
    <div>
      <PageHeader title="Store & pricing" subtitle="Prices, plans, orders and the store’s settings." />
      <Card>
        <EmptyState
          icon={FiLock}
          title="Admins only"
          hint="Only an admin can change prices, plans and orders. You can still assign papers to students and review AI marking."
        />
        <div className="flex flex-wrap justify-center gap-2 px-4 pb-10">
          <Link href="/igcsc/paper-assign" className={BTN_SECONDARY}>Assign papers</Link>
          <Link href="/igcsc/grading" className={BTN_SECONDARY}>Marking</Link>
        </div>
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Papers
// ─────────────────────────────────────────────────────────────────────────────

function SyncPanel({ settings, summary, syncing, onSync }) {
  const last = summary || settings?.lastSyncSummary
  const chips = last ? [
    ['Folders', last.folders],
    ['Created', last.created],
    ['Updated', last.updated],
    ['Published', last.published],
    ['Held', last.held],
    ['Missing', last.missing],
  ] : []
  return (
    <Card className="mb-4 overflow-hidden">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800">Catalogue</p>
          <p className="mt-0.5 text-xs text-slate-500">
            One paper per question-bank folder. Sync after importing questions — prices and publish choices you made by hand are kept.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {settings?.lastSyncAt ? `Last synced ${fmtDateTime(settings.lastSyncAt)}` : 'Not synced yet'}
          </p>
        </div>
        <button type="button" onClick={onSync} disabled={syncing} className={`${BTN_PRIMARY} flex-shrink-0`}>
          {syncing ? <Spin size={15} /> : <FiRefreshCw size={15} />}
          {syncing ? 'Syncing…' : 'Sync catalogue'}
        </button>
      </div>
      {syncing && (
        <div className="border-t border-indigo-100 bg-indigo-50 px-5 py-2.5 text-xs font-medium text-indigo-800">
          Reading every question in the bank — this can take a minute. Keep this tab open.
        </div>
      )}
      {!syncing && last && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {summary ? 'This sync' : 'Last sync'}
          </span>
          {chips.map(([label, value]) => (
            <span key={label} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-500">
              {label} <b className="text-slate-800">{Number(value || 0).toLocaleString()}</b>
            </span>
          ))}
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-500">
            Took <b className="text-slate-800">{fmtDuration(last.ms)}</b>
          </span>
        </div>
      )}
    </Card>
  )
}

function PaperFilters({ facets, filters, query, onQuery, onChange }) {
  const curricula = facets || []
  const subjects = curricula.find((c) => c.curriculum === filters.curriculum)?.subjects || []
  return (
    <div className="grid gap-2 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
      <SearchBox value={query} onChange={onQuery} placeholder="Search title, unit or topic…" className="sm:col-span-2 lg:col-span-1" />
      <select value={filters.curriculum} onChange={(e) => onChange({ curriculum: e.target.value, subject: '' })} className={INPUT} aria-label="Curriculum">
        <option value="">All curricula</option>
        {curricula.map((c) => (
          <option key={c.curriculum} value={c.curriculum}>
            {c.curriculum} ({(c.subjects || []).reduce((n, s) => n + Number(s.papers || 0), 0).toLocaleString()})
          </option>
        ))}
      </select>
      <select value={filters.subject} onChange={(e) => onChange({ subject: e.target.value })} disabled={!filters.curriculum} className={INPUT} aria-label="Subject">
        <option value="">{filters.curriculum ? 'All subjects' : 'Pick a curriculum first'}</option>
        {subjects.map((s) => (
          <option key={s.subject} value={s.subject}>{s.subject} ({Number(s.published || 0)}/{Number(s.papers || 0)} on sale)</option>
        ))}
      </select>
      <select value={filters.status} onChange={(e) => onChange({ status: e.target.value })} className={INPUT} aria-label="Status">
        {STATUS_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <select value={filters.format} onChange={(e) => onChange({ format: e.target.value })} className={INPUT} aria-label="Format">
        {FORMAT_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
    </div>
  )
}

function BulkBar({ count, allMatching, words, currency, busy, onPrice, onPublish, onClear }) {
  const [price, setPrice] = useState('')
  const [error, setError] = useState('')

  const submitPrice = (e) => {
    e.preventDefault()
    const r = readPrice(price, currency)
    if (r.error) { setError(r.error); return }
    setError('')
    onPrice(r.price)
  }

  return (
    <div className="sticky top-16 z-20 border-b border-indigo-100 bg-indigo-50/95 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto min-w-0">
          <p className="text-sm font-bold text-indigo-900">
            {allMatching ? `All ${plural(count, 'paper')} matching the filter` : `${plural(count, 'paper')} selected`}
          </p>
          {allMatching && <p className="truncate text-xs text-indigo-700">{words}</p>}
        </div>
        <form onSubmit={submitPrice} className="flex items-center gap-1.5">
          <div className="relative">
            <input
              value={price}
              onChange={(e) => { setPrice(e.target.value); setError('') }}
              inputMode="decimal"
              placeholder="New price"
              aria-label="New price"
              className={`${INPUT} w-28 pr-11`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">{cur(currency)}</span>
          </div>
          <button type="submit" disabled={busy} className={BTN_SECONDARY}><FiTag size={14} /> Set price</button>
        </form>
        <button type="button" onClick={() => onPublish(true)} disabled={busy} className={BTN_SECONDARY}>
          <FiEye size={14} /> Publish
        </button>
        <button type="button" onClick={() => onPublish(false)} disabled={busy} className={BTN_SECONDARY}>
          <FiEyeOff size={14} /> Unpublish
        </button>
        <button type="button" onClick={onClear} disabled={busy} aria-label="Clear selection" title="Clear selection"
          className="rounded-xl p-2 text-indigo-700 transition hover:bg-white disabled:opacity-50">
          <FiX size={16} />
        </button>
      </div>
      {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  )
}

// Saves on blur or Enter; Escape puts the stored price back.
function PriceCell({ paper, currency, onSave }) {
  const stored = String(paper.price ?? 0)
  const [value, setValue] = useState(stored)
  const [error, setError] = useState('')
  const [state, setState] = useState('') // '' | 'saving' | 'saved'

  useEffect(() => {
    setValue(stored)
    setError('')
  }, [stored])

  useEffect(() => {
    if (state !== 'saved') return undefined
    const t = setTimeout(() => setState(''), 1500)
    return () => clearTimeout(t)
  }, [state])

  const commit = async () => {
    if (state === 'saving') return
    const r = readPrice(value, currency)
    if (r.error) { setError(r.error); return }
    if (r.price === Number(paper.price || 0)) {
      setValue(stored)
      setError('')
      return
    }
    setError('')
    setState('saving')
    try {
      await onSave(paper._id, r.price)
      setState('saved')
    } catch (e) {
      setError(e?.message || 'Could not save that price.')
      setState('')
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      setValue(stored)
      setError('')
    }
  }

  return (
    <div className="w-32">
      <div className="relative">
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value); setError('') }}
          onBlur={commit}
          onKeyDown={onKeyDown}
          disabled={state === 'saving'}
          inputMode="decimal"
          aria-label={`Price of ${paper.title || 'this paper'}`}
          aria-invalid={!!error}
          className={`${INPUT} pr-11 ${error ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : ''}`}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
          {state === 'saving' ? <Spin size={12} /> : state === 'saved' ? <FiCheck className="text-emerald-500" size={14} /> : cur(currency)}
        </span>
      </div>
      {error
        ? <p className="mt-1 text-[11px] leading-snug text-rose-600">{error}</p>
        : <p className="mt-1 text-[11px] text-slate-400">{formatPrice(paper.price, currency)}{paper.priceSetManually ? ' · set by hand' : ''}</p>}
    </div>
  )
}

function PaperRow({ paper, currency, selected, busy, onSelect, onPrice, onPublish }) {
  const st = paperStatus(paper)
  const cannotPublish = paper.missingFromBank && !paper.isPublished
  return (
    <tr className={selected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/60'}>
      <td className="w-10 px-4 py-3 align-top">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(paper._id, e.target.checked)}
          aria-label={`Select ${paper.title || 'paper'}`}
          className={CHECKBOX}
        />
      </td>
      <td className="min-w-[220px] px-4 py-3 align-top">
        <div className="font-semibold text-slate-800">{paper.title || 'Untitled paper'}</div>
        {paper.unit && <div className="text-xs text-slate-500">{paper.unit}</div>}
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
          <span>{[paper.curriculum, paper.subject].filter(Boolean).join(' · ')}</span>
          {paper.difficulty && <Badge tone={DIFFICULTY_TONE[paper.difficulty] || 'slate'}>{paper.difficulty}</Badge>}
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-slate-600">
        <div>MCQ <b className="text-slate-800">{Number(paper.mcqCount || 0)}</b></div>
        <div>Written <b className="text-slate-800">{Number(paper.writtenCount || 0)}</b></div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 align-top">
        <div className="font-semibold text-slate-800">{Number(paper.totalMarks || 0)}</div>
        <div className="text-[11px] text-slate-400">{Number(paper.durationMin || 0)} min</div>
      </td>
      <td className="min-w-[170px] px-4 py-3 align-top">
        <span title={!paper.clean && paper.holdReason ? paper.holdReason : undefined}>
          <Badge tone={st.tone}>{st.label}</Badge>
        </span>
        {!paper.clean && paper.holdReason && (
          <p className="mt-1 max-w-[240px] text-[11px] leading-snug text-amber-700">
            {paper.isPublished ? 'Held: ' : ''}{paper.holdReason}
          </p>
        )}
        {paper.missingFromBank && (
          <p className="mt-1 max-w-[240px] text-[11px] leading-snug text-rose-600">Its folder is gone from the bank.</p>
        )}
      </td>
      <td className="px-4 py-3 align-top">
        <PriceCell paper={paper} currency={currency} onSave={onPrice} />
      </td>
      <td className="px-4 py-3 text-right align-top">
        <div className="flex items-center justify-end gap-2">
          {busy && <Spin size={12} />}
          <Toggle
            on={!!paper.isPublished}
            onChange={(on) => onPublish(paper, on)}
            disabled={busy || cannotPublish}
            label={`On sale: ${paper.title || 'paper'}`}
            title={cannotPublish ? 'A paper missing from the bank cannot go on sale' : paper.isPublished ? 'Take it off sale' : 'Put it on sale'}
          />
        </div>
      </td>
    </tr>
  )
}

function PapersTab({ currency, settings, facets, onFacets, onSettings }) {
  const [filters, setFilters] = useState(BLANK_FILTERS)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [data, setData] = useState(null) // { papers, total, page, pages, filters }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [allMatching, setAllMatching] = useState(false)
  const [rowBusy, setRowBusy] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncSummary, setSyncSummary] = useState(null)
  const [notice, setNotice] = useState(null)
  const seq = useRef(0)
  const { ask, dialog } = useConfirm()

  // A different filter is a different set of papers: a selection made under the
  // old one must not ride along into a bulk change under the new one.
  const updateFilters = useCallback((patch) => {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(1)
    setSelected(new Set())
    setAllMatching(false)
  }, [])

  useEffect(() => {
    const next = query.trim()
    if (next === filters.q) return undefined
    const t = setTimeout(() => updateFilters({ q: next }), 300)
    return () => clearTimeout(t)
  }, [query, filters.q, updateFilters])

  useEffect(() => {
    const my = ++seq.current
    setLoading(true)
    setError('')
    apiGet(papersUrl(filters, page))
      .then((r) => {
        if (my !== seq.current) return
        const list = Array.isArray(r.papers) ? r.papers : []
        const pages = Math.max(1, Number(r.pages || 1))
        // The last page emptied under us (a bulk unpublish under "Published"):
        // step back rather than show an empty page.
        if (!list.length && page > pages) {
          setPage(pages)
          return
        }
        setData({ papers: list, total: Number(r.total || 0), page: Number(r.page || page), pages, filters })
        if (Array.isArray(r.facets)) onFacets(r.facets)
        if (r.settings) onSettings(r.settings)
      })
      .catch((e) => { if (my === seq.current) setError(e.message) })
      .finally(() => { if (my === seq.current) setLoading(false) })
  }, [filters, page, reloadKey, onFacets, onSettings])

  const papers = data?.papers || []
  const total = data?.total || 0
  const pageIds = papers.map((p) => p._id)
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const someOnPage = pageIds.some((id) => selected.has(id))
  const count = allMatching ? total : selected.size
  const hasFilters = !!(filters.curriculum || filters.subject || filters.status || filters.format || filters.q || query)

  const clearSelection = () => {
    setSelected(new Set())
    setAllMatching(false)
  }

  const toggleOne = (id, on) => {
    if (allMatching) {
      // Leaving "everything matching" for a hand-picked list: keep this page,
      // minus the one just unticked.
      setAllMatching(false)
      setSelected(new Set(pageIds.filter((x) => on || x !== id)))
      return
    }
    setSelected((s) => {
      const n = new Set(s)
      if (on) n.add(id)
      else n.delete(id)
      return n
    })
  }

  const togglePage = (on) => {
    if (allMatching) {
      clearSelection()
      return
    }
    setSelected((s) => {
      const n = new Set(s)
      for (const id of pageIds) {
        if (on) n.add(id)
        else n.delete(id)
      }
      return n
    })
  }

  const selectAllMatching = () => {
    setSelected(new Set())
    setAllMatching(true)
  }

  const savePrice = useCallback(async (id, price) => {
    await apiSend('/api/igcsc/admin/papers', 'PATCH', { ids: [id], set: { price } })
    setData((d) => d && { ...d, papers: d.papers.map((p) => (p._id === id ? { ...p, price, priceSetManually: true } : p)) })
  }, [])

  const setPublished = (paper, on) => {
    const go = async () => {
      setRowBusy(paper._id)
      try {
        await apiSend('/api/igcsc/admin/papers', 'PATCH', { ids: [paper._id], set: { isPublished: on } })
        setData((d) => d && {
          ...d,
          papers: d.papers.map((p) => (p._id === paper._id ? { ...p, isPublished: on, publishedManually: true } : p)),
        })
      } finally {
        setRowBusy('')
      }
    }
    // A held paper has questions that cannot be marked - selling it is a
    // decision, not a click.
    if (on && !paper.clean) {
      ask({
        title: 'Put a held paper on sale?',
        body: (
          <>
            <p><b className="text-slate-800">{paper.title}</b> was held back by the sync:</p>
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900">{paper.holdReason || 'Some of its questions cannot be marked.'}</p>
            <p>Students who buy it may get questions that are not marked. Publish it anyway?</p>
          </>
        ),
        confirmLabel: 'Publish anyway',
        run: go,
      })
      return
    }
    go().catch((e) => setNotice({ tone: 'red', text: e.message }))
  }

  const runBulk = (set, { title, body, confirmLabel, danger }) => {
    if (!count || !data) return
    if (!allMatching && selected.size > MAX_IDS) {
      setNotice({ tone: 'red', text: `Pick at most ${MAX_IDS.toLocaleString()} papers at a time, or apply the change to everything matching the filter.` })
      return
    }
    const target = allMatching ? { filter: filterBody(data.filters) } : { ids: [...selected] }
    ask({
      title,
      body: (
        <>
          {body}
          {allMatching && (
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">Filter: {filterWords(data.filters)}</p>
          )}
        </>
      ),
      confirmLabel,
      danger,
      run: async () => {
        const r = await apiSend('/api/igcsc/admin/papers', 'PATCH', { ...target, set })
        const modified = Number(r?.modified || 0)
        const matched = Number(r?.matched || 0)
        setNotice({
          tone: 'green',
          text: modified === matched
            ? `${plural(modified, 'paper')} updated.`
            : `${plural(modified, 'paper')} updated (${matched.toLocaleString()} matched; the rest were already set).`,
        })
        clearSelection()
        setReloadKey((k) => k + 1)
      },
    })
  }

  const bulkPrice = (price) => runBulk({ price }, {
    title: `Set the price of ${plural(count, 'paper')}?`,
    body: (
      <p>
        {count === 1 ? 'It' : 'Each one'} will cost <b className="text-slate-800">{formatPrice(price, currency)}</b>.
        Prices set here are kept by later syncs.
      </p>
    ),
    confirmLabel: `Set ${formatPrice(price, currency)}`,
  })

  const bulkPublish = (on) => runBulk({ isPublished: on }, on ? {
    title: `Publish ${plural(count, 'paper')}?`,
    body: (
      <>
        <p>They go on sale in the student store straight away, and every plan that covers them starts including them.</p>
        <p>Papers missing from the bank are skipped. Held papers in the selection are published too — check their reasons first if you are not sure.</p>
      </>
    ),
    confirmLabel: 'Publish',
  } : {
    title: `Unpublish ${plural(count, 'paper')}?`,
    body: (
      <>
        <p>They leave the store and plans stop covering them.</p>
        <p>Students who bought one, unlocked it with a credit or were assigned it keep it.</p>
      </>
    ),
    confirmLabel: 'Unpublish',
    danger: true,
  })

  const sync = async () => {
    setSyncing(true)
    setNotice(null)
    try {
      const r = await apiSend('/api/igcsc/admin/papers', 'POST', { action: 'sync' })
      setSyncSummary(r?.summary || null)
      setNotice({ tone: 'green', text: 'Catalogue synced with the question bank.' })
      setReloadKey((k) => k + 1)
    } catch (e) {
      setNotice({ tone: 'red', text: e.message })
    } finally {
      setSyncing(false)
    }
  }

  const resetFilters = () => {
    setQuery('')
    updateFilters(BLANK_FILTERS)
  }

  const columns = [
    {
      label: (
        <input
          type="checkbox"
          aria-label="Select every paper on this page"
          checked={allMatching || allOnPage}
          ref={(el) => { if (el) el.indeterminate = !allMatching && someOnPage && !allOnPage }}
          onChange={(e) => togglePage(e.target.checked)}
          disabled={!papers.length}
          className={CHECKBOX}
        />
      ),
    },
    { label: 'Paper' },
    { label: 'Questions' },
    { label: 'Marks' },
    { label: 'Status' },
    { label: 'Price' },
    { label: 'On sale', align: 'right' },
  ]

  return (
    <div className="min-w-0">
      <SyncPanel settings={settings} summary={syncSummary} syncing={syncing} onSync={sync} />
      <Notice notice={notice} onClose={() => setNotice(null)} />

      <Card>
        <PaperFilters facets={facets} filters={filters} query={query} onQuery={setQuery} onChange={updateFilters} />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-100 px-4 py-2.5 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
            {data ? plural(total, 'paper') : 'Loading…'}
            {loading && data && <Spin size={12} />}
          </span>
          {data && total > 0 && !allMatching && (
            <button type="button" onClick={selectAllMatching} className="font-semibold text-indigo-600 hover:underline">
              Apply a change to all {total.toLocaleString()} matching
            </button>
          )}
          {hasFilters && (
            <button type="button" onClick={resetFilters} className="font-semibold text-slate-500 hover:text-slate-700 hover:underline">
              Clear filters
            </button>
          )}
        </div>

        {allOnPage && !allMatching && total > pageIds.length && (
          <div className="border-b border-indigo-100 bg-indigo-50/60 px-4 py-2 text-xs text-indigo-800">
            All {pageIds.length} papers on this page are selected.{' '}
            <button type="button" onClick={selectAllMatching} className="font-semibold underline">
              Select all {total.toLocaleString()} matching the filter
            </button>
          </div>
        )}

        {count > 0 && (
          <BulkBar
            count={count}
            allMatching={allMatching}
            words={data ? filterWords(data.filters) : ''}
            currency={currency}
            busy={loading}
            onPrice={bulkPrice}
            onPublish={bulkPublish}
            onClear={clearSelection}
          />
        )}

        {error ? (
          <div className="p-4"><ErrorState message={error} /></div>
        ) : !data ? (
          <Loading label="Loading papers…" />
        ) : (
          <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <Table
              columns={columns}
              empty={!papers.length && (
                hasFilters
                  ? <EmptyState icon={FiFileText} title="No papers match these filters" hint="Try another status or clear the search." />
                  : <EmptyState icon={FiFileText} title="No papers yet" hint="Run “Sync catalogue” to build one paper per question-bank folder." />
              )}
            >
              {papers.map((p) => (
                <PaperRow
                  key={p._id}
                  paper={p}
                  currency={currency}
                  selected={allMatching || selected.has(p._id)}
                  busy={rowBusy === p._id}
                  onSelect={toggleOne}
                  onPrice={savePrice}
                  onPublish={setPublished}
                />
              ))}
            </Table>
            <Pager page={data.page} pages={data.pages} total={total} limit={PAPER_LIMIT} busy={loading} onPage={setPage} />
          </div>
        )}
      </Card>

      {dialog}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Plans
// ─────────────────────────────────────────────────────────────────────────────

function AdminPlanCard({ plan, currency, busy, onEdit, onDelete, onToggleActive }) {
  const features = Array.isArray(plan.features) ? plan.features : []
  return (
    <div className={`relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition ${plan.highlight
      ? 'border-indigo-300 ring-2 ring-indigo-100'
      : 'border-slate-200'} ${plan.isActive ? '' : 'opacity-75'}`}>
      {plan.highlight && (
        <span className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
          Best value
        </span>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={plan.kind === 'credits' ? 'violet' : 'blue'}>{plan.kind === 'credits' ? 'Credits pack' : 'Access'}</Badge>
        {!plan.isActive && <Badge tone="slate">Off sale</Badge>}
        <span className="ml-auto text-[11px] text-slate-400">Order {Number(plan.sortOrder || 0)}</span>
      </div>
      <div className="flex-1">
        <h3 className="mt-3 text-lg font-extrabold text-slate-900">{plan.name}</h3>
        <p className="text-sm text-slate-500">{plan.summary || planSummary(plan)}</p>
        <p className="mt-3 text-2xl font-extrabold text-slate-900">{formatPrice(plan.price, currency)}</p>
        {plan.description && <p className="mt-2 text-sm text-slate-600">{plan.description}</p>}
        {features.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <FiCheck size={14} className="mt-0.5 flex-shrink-0 text-emerald-500" /> <span className="min-w-0">{f}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
        <Toggle on={!!plan.isActive} onChange={() => onToggleActive(plan)} disabled={busy} label={`On sale: ${plan.name}`} />
        <span className="text-xs font-semibold text-slate-500">{plan.isActive ? 'On sale' : 'Off sale'}</span>
        {busy && <Spin size={12} />}
        <button type="button" onClick={() => onEdit(plan)} className={`${BTN_SMALL} ml-auto`}>
          <FiEdit2 size={13} /> Edit
        </button>
        <button type="button" onClick={() => onDelete(plan)} disabled={busy} aria-label={`Delete ${plan.name}`} title="Delete"
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50">
          <FiTrash2 size={15} />
        </button>
      </div>
    </div>
  )
}

function PlanForm({ draft, setDraft, editing, currency, facets, saving, error, onSave, onClose }) {
  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }))
  const setFlag = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }))

  // A plan saved against a curriculum or subject that has since left the bank
  // still shows its value instead of a blank select.
  const curricula = (facets || []).map((c) => c.curriculum)
  if (draft.curriculum && !curricula.includes(draft.curriculum)) curricula.push(draft.curriculum)
  const subjects = ((facets || []).find((c) => c.curriculum === draft.curriculum)?.subjects || []).map((s) => s.subject)
  if (draft.subject && !subjects.includes(draft.subject)) subjects.push(draft.subject)

  const pr = readPrice(draft.price, currency)
  const body = planBody(draft)
  const preview = planSummary(body)

  return (
    <Modal
      title={editing ? 'Edit plan' : 'New plan'}
      subtitle={editing ? 'Earlier buyers keep exactly what they bought.' : 'A credits pack or an access pass for the store.'}
      icon={FiLayers}
      onClose={saving ? undefined : onClose}
      wide
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={saving} className={BTN_SECONDARY}>Cancel</button>
          <button type="submit" form="plan-form" disabled={saving} className={BTN_PRIMARY}>
            {saving && <Spin />} {editing ? 'Save plan' : 'Create plan'}
          </button>
        </>
      )}
    >
      <form id="plan-form" onSubmit={(e) => { e.preventDefault(); onSave() }} className="space-y-4">
        <Field label="Name" hint={`${draft.name.length}/80`}>
          <input value={draft.name} onChange={set('name')} maxLength={80} placeholder="5-paper pack" className={INPUT} />
        </Field>

        <Field label="Description" hint={`${draft.description.length}/400 · optional`}>
          <textarea value={draft.description} onChange={set('description')} maxLength={400} rows={2}
            placeholder="Pick any five papers, whenever you are ready." className={INPUT} />
        </Field>

        <div>
          <span className="mb-1 block text-xs font-semibold text-slate-600">What the student gets</span>
          <Segmented
            value={draft.kind}
            onChange={setFlag('kind')}
            options={[{ value: 'credits', label: 'Credits pack' }, { value: 'access', label: 'Access pass' }]}
          />
          <p className="mt-1.5 text-[11px] text-slate-400">
            {draft.kind === 'credits'
              ? 'Each credit unlocks any one paper the student chooses. Credits never expire.'
              : 'Opens every published paper in a slice of the bank, for a set time or for good.'}
          </p>
        </div>

        {draft.kind === 'credits' ? (
          <Field label="Credits in the pack" hint="1 to 500" className="sm:max-w-[200px]">
            <input type="number" min="1" max="500" step="1" inputMode="numeric" value={draft.credits} onChange={set('credits')} className={INPUT} />
          </Field>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Covers">
                <select
                  value={draft.scope}
                  onChange={(e) => {
                    const scope = e.target.value
                    setDraft((d) => ({
                      ...d,
                      scope,
                      curriculum: scope === 'all' ? '' : d.curriculum,
                      subject: scope === 'subject' ? d.subject : '',
                    }))
                  }}
                  className={INPUT}
                >
                  <option value="all">Every paper</option>
                  <option value="curriculum">One curriculum</option>
                  <option value="subject">One subject</option>
                </select>
              </Field>
              {draft.scope !== 'all' && (
                <Field label="Curriculum">
                  <select value={draft.curriculum} onChange={(e) => setDraft((d) => ({ ...d, curriculum: e.target.value, subject: '' }))} className={INPUT}>
                    <option value="">{facets ? 'Choose…' : 'Loading…'}</option>
                    {curricula.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              )}
              {draft.scope === 'subject' && (
                <Field label="Subject">
                  <select value={draft.subject} onChange={set('subject')} disabled={!draft.curriculum} className={INPUT}>
                    <option value="">{draft.curriculum ? 'Choose…' : 'Curriculum first'}</option>
                    {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Lasts">
                <select value={draft.durationPreset} onChange={set('durationPreset')} className={INPUT}>
                  {DURATION_PRESETS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </Field>
              {draft.durationPreset === 'custom' && (
                <Field label="Days" hint="0 to 3650 · 0 never expires">
                  <input type="number" min="0" max="3650" step="1" inputMode="numeric" value={draft.durationDays} onChange={set('durationDays')} className={INPUT} />
                </Field>
              )}
            </div>
          </>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={`Price (${cur(currency)})`} hint="0 makes it free.">
            <input value={draft.price} onChange={set('price')} inputMode="decimal" placeholder="19.99" className={INPUT} />
          </Field>
          <Field label="Sort order" hint="Lower numbers show first in the store.">
            <input type="number" step="1" inputMode="numeric" value={draft.sortOrder} onChange={set('sortOrder')} className={INPUT} />
          </Field>
        </div>

        <Field label="Features" hint="One per line, up to 8. Shown as a checklist on the plan card.">
          <textarea value={draft.features} onChange={set('features')} rows={4}
            placeholder={'Online MCQ marked instantly\nWritten answers marked by AI\nTutor review of anything unsure'}
            className={INPUT} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleRow label="“Best value” ribbon" hint="Makes this plan stand out in the store." on={draft.highlight} onChange={setFlag('highlight')} />
          <ToggleRow label="On sale" hint="Off hides it from the store; buyers keep it." on={draft.isActive} onChange={setFlag('isActive')} />
        </div>

        <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500">Students see</p>
          <p className="mt-0.5 text-sm font-bold text-slate-900">
            {body.name || 'Plan name'} · {pr.error ? '—' : formatPrice(pr.price, currency)}
          </p>
          <p className="text-sm text-slate-600">{preview}</p>
        </div>

        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
      </form>
    </Modal>
  )
}

function PlansTab({ currency, facets, loadFacets }) {
  const [plans, setPlans] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(null)
  const [editing, setEditing] = useState(null) // null = closed, {} = new, { plan } = edit
  const [draft, setDraft] = useState(BLANK_PLAN)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [busyId, setBusyId] = useState('')
  const { ask, dialog } = useConfirm()

  const load = useCallback(async () => {
    setError('')
    try {
      const r = await apiGet('/api/igcsc/admin/plans')
      setPlans(Array.isArray(r.plans) ? r.plans : [])
    } catch (e) {
      setError(e.message)
      setPlans((p) => p || [])
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (!facets) loadFacets() }, [facets, loadFacets])

  const openNew = () => {
    setDraft(BLANK_PLAN)
    setFormError('')
    setEditing({})
  }

  const openEdit = (plan) => {
    setDraft(planDraft(plan))
    setFormError('')
    setEditing({ plan })
  }

  const save = async () => {
    const problem = planProblem(draft, currency)
    if (problem) { setFormError(problem); return }
    setSaving(true)
    setFormError('')
    const existing = editing?.plan
    try {
      const body = planBody(draft)
      if (existing) await apiSend(`/api/igcsc/admin/plans/${existing._id}`, 'PUT', body)
      else await apiSend('/api/igcsc/admin/plans', 'POST', body)
      setEditing(null)
      setNotice({ tone: 'green', text: existing ? `“${body.name}” saved.` : `“${body.name}” created.` })
      await load()
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (plan) => {
    setBusyId(plan._id)
    try {
      const r = await apiSend(`/api/igcsc/admin/plans/${plan._id}`, 'PUT', { isActive: !plan.isActive })
      setPlans((list) => (list || []).map((x) => (x._id === plan._id ? (r?.plan || { ...x, isActive: !plan.isActive }) : x)))
    } catch (e) {
      setNotice({ tone: 'red', text: e.message })
    } finally {
      setBusyId('')
    }
  }

  const remove = (plan) => ask({
    title: `Delete “${plan.name}”?`,
    body: (
      <>
        <p>If nobody has bought or been given this plan, it is deleted for good.</p>
        <p>If it has orders, it is switched off instead: it leaves the store, its order history stays, and everyone who has it keeps what they got.</p>
      </>
    ),
    confirmLabel: 'Delete plan',
    danger: true,
    run: async () => {
      const r = await apiSend(`/api/igcsc/admin/plans/${plan._id}`, 'DELETE')
      setNotice(r?.deactivated
        ? { tone: 'amber', text: `“${plan.name}” has orders, so it was switched off instead of deleted.` }
        : { tone: 'green', text: `“${plan.name}” deleted.` })
      await load()
    },
  })

  return (
    <div className="min-w-0">
      <SectionTitle
        title="Plans"
        subtitle="Credit packs and access passes, shown in the store in this order."
        action={<button type="button" onClick={openNew} className={BTN_PRIMARY}><FiPlus size={15} /> New plan</button>}
      />
      <Notice notice={notice} onClose={() => setNotice(null)} />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {plans === null ? (
        <Loading label="Loading plans…" />
      ) : !plans.length ? (
        !error && (
          <Card>
            <EmptyState
              icon={FiLayers}
              title="No plans yet"
              hint="Try a credits pack (any 5 papers) or an access pass (every IGCSE paper for 3 months)."
            />
            <div className="flex justify-center px-4 pb-10">
              <button type="button" onClick={openNew} className={BTN_PRIMARY}><FiPlus size={15} /> Create the first plan</button>
            </div>
          </Card>
        )
      ) : (
        <div className="grid gap-5 pt-2 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => (
            <AdminPlanCard
              key={p._id}
              plan={p}
              currency={currency}
              busy={busyId === p._id}
              onEdit={openEdit}
              onDelete={remove}
              onToggleActive={toggleActive}
            />
          ))}
        </div>
      )}

      {editing && (
        <PlanForm
          draft={draft}
          setDraft={setDraft}
          editing={!!editing.plan}
          currency={currency}
          facets={facets}
          saving={saving}
          error={formError}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
      {dialog}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Orders
// ─────────────────────────────────────────────────────────────────────────────

function OrderRow({ order: o, onRefund, onRevoke }) {
  const canRefund = o.status === 'paid' && o.kind !== 'grant' && Number(o.amount) > 0
  const canRevoke = o.status === 'paid' && !o.revokedAt
  const statusLabel = ORDER_STATUSES.find((s) => s.value === o.status)?.label || o.status
  return (
    <tr className="hover:bg-slate-50/60">
      <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-slate-500">
        {fmtDateTime(o.createdAt) || '—'}
      </td>
      <td className="min-w-[180px] px-4 py-3 align-top">
        <div className="font-semibold text-slate-800">{o.userName || '—'}</div>
        <div className="break-all text-xs text-slate-400">{o.userEmail}</div>
      </td>
      <td className="min-w-[200px] px-4 py-3 align-top">
        <div className="text-slate-700">{o.title || '—'}</div>
        <div className="mt-1"><Badge tone={KIND_TONE[o.kind] || 'slate'}>{KIND_LABEL[o.kind] || o.kind}</Badge></div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right align-top font-semibold text-slate-800">
        {o.kind === 'grant' ? <span className="font-normal text-slate-400">No charge</span> : formatPrice(o.amount, o.currency)}
      </td>
      <td className="min-w-[130px] px-4 py-3 align-top">
        <div className="flex flex-wrap gap-1">
          <Badge tone={ORDER_TONE[o.status] || 'slate'}>{statusLabel}</Badge>
          {o.revokedAt && <Badge tone="rose">Access revoked</Badge>}
        </div>
        {o.status === 'paid' && o.paidAt && <p className="mt-1 text-[11px] text-slate-400">Paid {fmtDate(o.paidAt)}</p>}
        {o.refundedAt && <p className="mt-1 text-[11px] text-slate-400">Refunded {fmtDate(o.refundedAt)}</p>}
      </td>
      <td className="min-w-[160px] max-w-[260px] px-4 py-3 align-top text-xs text-slate-500">
        {o.grantedBy && <div>Granted by <b className="text-slate-700">{o.grantedBy}</b></div>}
        {o.note && <div className="mt-0.5 break-words text-slate-400">{o.note}</div>}
        {!o.grantedBy && !o.note && <span className="text-slate-300">—</span>}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right align-top">
        <div className="flex justify-end gap-1.5">
          {canRefund && (
            <button type="button" onClick={() => onRefund(o)} className={BTN_SMALL}>
              <FiRotateCcw size={13} /> Refund
            </button>
          )}
          {canRevoke && (
            <button type="button" onClick={() => onRevoke(o)} className={`${BTN_SMALL} hover:border-rose-200 hover:text-rose-600`}>
              <FiSlash size={13} /> Revoke
            </button>
          )}
          {!canRefund && !canRevoke && <span className="text-xs text-slate-300">—</span>}
        </div>
      </td>
    </tr>
  )
}

function StudentPicker({ students, error, student, onPick }) {
  const [who, setWho] = useState('')
  const matches = useMemo(() => {
    const list = students || []
    const n = who.trim().toLowerCase()
    const hit = n ? list.filter((s) => `${s.name || ''} ${s.email || ''}`.toLowerCase().includes(n)) : list
    return hit.slice(0, 30)
  }, [students, who])

  if (student) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-2.5">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 text-xs font-bold text-white">
          {(student.name || student.email || '?').trim().slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{student.name}</p>
          <p className="truncate text-xs text-slate-500">{student.email}</p>
        </div>
        <button type="button" onClick={() => onPick(null)} className={BTN_SMALL}>Change</button>
      </div>
    )
  }

  return (
    <div>
      <SearchBox value={who} onChange={setWho} placeholder="Search students by name or email…" />
      <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200">
        {students === null ? (
          <p className="flex items-center gap-2 px-3 py-3 text-sm text-slate-400"><Spin /> Loading students…</p>
        ) : error ? (
          <p className="px-3 py-3 text-sm text-rose-600">{error}</p>
        ) : !matches.length ? (
          <p className="px-3 py-3 text-sm text-slate-400">{who.trim() ? 'Nobody matches that search.' : 'No students yet.'}</p>
        ) : (
          matches.map((s) => (
            <button key={s._id} type="button" onClick={() => onPick(s)}
              className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-indigo-50">
              <FiUser size={14} className="flex-shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-700">{s.name}</span>
                <span className="block truncate text-xs text-slate-400">{s.email}</span>
              </span>
              {s.isActive === false && <Badge tone="red">Suspended</Badge>}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

function PaperPicker({ paper, onPick }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const seq = useRef(0)

  useEffect(() => {
    if (paper) return undefined
    const term = query.trim()
    const t = setTimeout(() => {
      const my = ++seq.current
      setLoading(true)
      const sp = new URLSearchParams({ page: '1', limit: '20' })
      if (term) sp.set('q', term)
      apiGet(`/api/igcsc/admin/papers?${sp.toString()}`)
        .then((r) => { if (my === seq.current) setResults(Array.isArray(r.papers) ? r.papers : []) })
        .catch(() => { if (my === seq.current) setResults([]) })
        .finally(() => { if (my === seq.current) setLoading(false) })
    }, 300)
    return () => clearTimeout(t)
  }, [query, paper])

  if (paper) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-2.5">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm"><FiFileText size={16} /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{paper.title}</p>
          <p className="truncate text-xs text-slate-500">{paper.unit || [paper.curriculum, paper.subject].filter(Boolean).join(' · ')}</p>
        </div>
        <button type="button" onClick={() => onPick(null)} className={BTN_SMALL}>Change</button>
      </div>
    )
  }

  return (
    <div>
      <SearchBox value={query} onChange={setQuery} placeholder="Search papers by title, unit or topic…" />
      <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200">
        {results === null || (loading && !results.length) ? (
          <p className="flex items-center gap-2 px-3 py-3 text-sm text-slate-400"><Spin /> Searching…</p>
        ) : !results.length ? (
          <p className="px-3 py-3 text-sm text-slate-400">No papers match that search.</p>
        ) : (
          results.map((p) => {
            const st = paperStatus(p)
            return (
              <button key={p._id} type="button" onClick={() => onPick(p)}
                className="flex w-full items-start gap-2 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-indigo-50">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-700">{p.title}</span>
                  <span className="block truncate text-xs text-slate-400">
                    {[p.unit, [p.curriculum, p.subject].filter(Boolean).join(' · ')].filter(Boolean).join(' — ')}
                  </span>
                </span>
                <Badge tone={st.tone}>{st.label}</Badge>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function GrantModal({ currency, onClose, onGranted }) {
  const [students, setStudents] = useState(null)
  const [studentsError, setStudentsError] = useState('')
  const [plans, setPlans] = useState(null)
  const [student, setStudent] = useState(null)
  const [what, setWhat] = useState('paper')
  const [paper, setPaper] = useState(null)
  const [planId, setPlanId] = useState('')
  const [credits, setCredits] = useState('5')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    apiGet('/api/igcsc/students?role=student')
      .then((r) => { if (live) setStudents(Array.isArray(r) ? r : []) })
      .catch((e) => {
        if (!live) return
        setStudents([])
        setStudentsError(e.message)
      })
    apiGet('/api/igcsc/admin/plans')
      .then((r) => { if (live) setPlans(Array.isArray(r.plans) ? r.plans : []) })
      .catch(() => { if (live) setPlans([]) })
    return () => { live = false }
  }, [])

  const plan = (plans || []).find((p) => p._id === planId)

  const submit = async () => {
    if (!student) { setError('Choose a student.'); return }
    const body = { userId: String(student._id) }
    let gift = ''
    if (what === 'paper') {
      if (!paper) { setError('Choose a paper.'); return }
      body.paperId = String(paper._id)
      gift = paper.title
    } else if (what === 'plan') {
      if (!plan) { setError('Choose a plan.'); return }
      body.planId = String(plan._id)
      gift = plan.name
    } else {
      const n = Number(String(credits).trim() || NaN)
      if (!Number.isInteger(n) || n < 1 || n > 500) { setError('Give a whole number of credits from 1 to 500.'); return }
      body.credits = n
      gift = plural(n, 'credit')
    }
    setSaving(true)
    setError('')
    try {
      await apiSend('/api/igcsc/admin/orders', 'POST', body)
      onGranted(`${gift} given to ${student.name || student.email}.`)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Grant access"
      subtitle="No payment. Recorded as an order with your name on it."
      icon={FiGift}
      onClose={saving ? undefined : onClose}
      wide
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={saving} className={BTN_SECONDARY}>Cancel</button>
          <button type="button" onClick={submit} disabled={saving} className={BTN_PRIMARY}>
            {saving ? <Spin /> : <FiGift size={14} />} Grant
          </button>
        </>
      )}
    >
      <div className="space-y-5">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-600">1 · Student</p>
          <StudentPicker students={students} error={studentsError} student={student} onPick={(s) => { setStudent(s); setError('') }} />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-600">2 · What to give</p>
          <Segmented
            value={what}
            onChange={(v) => { setWhat(v); setError('') }}
            options={[{ value: 'paper', label: 'A paper' }, { value: 'plan', label: 'A plan' }, { value: 'credits', label: 'Credits' }]}
          />
          <div className="mt-3">
            {what === 'paper' && <PaperPicker paper={paper} onPick={(p) => { setPaper(p); setError('') }} />}
            {what === 'plan' && (
              plans === null ? (
                <p className="flex items-center gap-2 text-sm text-slate-400"><Spin /> Loading plans…</p>
              ) : !plans.length ? (
                <p className="text-sm text-slate-400">There are no plans yet. Create one on the Plans tab.</p>
              ) : (
                <Field label="Plan" hint={plan ? `${plan.summary || planSummary(plan)} · normally ${formatPrice(plan.price, currency)}` : undefined}>
                  <select value={planId} onChange={(e) => { setPlanId(e.target.value); setError('') }} className={INPUT}>
                    <option value="">Choose a plan…</option>
                    {plans.map((p) => (
                      <option key={p._id} value={p._id}>{p.name}{p.isActive ? '' : ' (off sale)'}</option>
                    ))}
                  </select>
                </Field>
              )
            )}
            {what === 'credits' && (
              <Field label="Credits" hint="Each one unlocks any single paper. 1 to 500." className="sm:max-w-[200px]">
                <input type="number" min="1" max="500" step="1" inputMode="numeric" value={credits}
                  onChange={(e) => { setCredits(e.target.value); setError('') }} className={INPUT} />
              </Field>
            )}
          </div>
        </div>

        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
      </div>
    </Modal>
  )
}

function OrdersTab({ currency }) {
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(null)
  const [granting, setGranting] = useState(false)
  const seq = useRef(0)
  const { ask, dialog } = useConfirm()

  useEffect(() => {
    const next = query.trim()
    if (next === q) return undefined
    const t = setTimeout(() => {
      setQ(next)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [query, q])

  useEffect(() => {
    const my = ++seq.current
    setLoading(true)
    setError('')
    const sp = new URLSearchParams()
    if (status) sp.set('status', status)
    if (q) sp.set('q', q)
    sp.set('page', String(page))
    sp.set('limit', String(ORDER_LIMIT))
    apiGet(`/api/igcsc/admin/orders?${sp.toString()}`)
      .then((r) => {
        if (my !== seq.current) return
        setData({
          orders: Array.isArray(r.orders) ? r.orders : [],
          total: Number(r.total || 0),
          page: Number(r.page || page),
          pages: Math.max(1, Number(r.pages || 1)),
          totals: r.totals || {},
          currency: r.currency || '',
        })
      })
      .catch((e) => { if (my === seq.current) setError(e.message) })
      .finally(() => { if (my === seq.current) setLoading(false) })
  }, [status, q, page, reloadKey])

  const reload = () => setReloadKey((k) => k + 1)
  const who = (o) => o.userName || o.userEmail || 'this student'

  const refund = (o) => ask({
    title: `Refund ${formatPrice(o.amount, o.currency)}?`,
    body: (
      <>
        <p>
          <b className="text-slate-800">{who(o)}</b> gets {formatPrice(o.amount, o.currency)} back on their card through Stripe,
          and loses “{o.title}”.
        </p>
        <p>Unspent credits from a pack are taken back too. This cannot be undone.</p>
      </>
    ),
    confirmLabel: 'Refund',
    danger: true,
    run: async () => {
      await apiSend(`/api/igcsc/admin/orders/${o._id}`, 'POST', { action: 'refund' })
      setNotice({ tone: 'green', text: `Refunded ${formatPrice(o.amount, o.currency)} to ${who(o)}.` })
      reload()
    },
  })

  const revoke = (o) => ask({
    title: 'Take the access back?',
    body: (
      <>
        <p><b className="text-slate-800">{who(o)}</b> loses “{o.title}”. No money moves — the order stays paid.</p>
        <p>Unspent credits from a pack are taken back too.</p>
      </>
    ),
    confirmLabel: 'Revoke access',
    danger: true,
    run: async () => {
      await apiSend(`/api/igcsc/admin/orders/${o._id}`, 'POST', { action: 'revoke' })
      setNotice({ tone: 'green', text: `Access to “${o.title}” taken back from ${who(o)}.` })
      reload()
    },
  })

  const onGranted = (text) => {
    setGranting(false)
    setNotice({ tone: 'green', text })
    setStatus('')
    setPage(1)
    reload()
  }

  const totals = data?.totals || {}
  const totalsCurrency = data?.currency || currency
  const orders = data?.orders || []

  return (
    <div className="min-w-0">
      <SectionTitle
        title="Orders"
        subtitle="Every sale, refund and grant."
        action={<button type="button" onClick={() => setGranting(true)} className={BTN_PRIMARY}><FiGift size={15} /> Grant access</button>}
      />
      <Notice notice={notice} onClose={() => setNotice(null)} />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Revenue" value={data ? money(totals.revenue, totalsCurrency) : '—'} icon={FiDollarSign} tone="emerald"
          hint={`Paid card orders in ${cur(totalsCurrency)}`} />
        <StatCard label="Refunded" value={data ? money(totals.refunded, totalsCurrency) : '—'} icon={FiRotateCcw} tone="rose"
          hint="Money returned to cards" />
        <StatCard label="Paid orders" value={data ? Number(totals.paidCount || 0).toLocaleString() : '—'} icon={FiCreditCard} tone="indigo"
          hint={q ? 'Matching the search' : 'All time'} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
            {ORDER_STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => { setStatus(s.value); setPage(1) }}
                className={`flex-shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${status === s.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <SearchBox value={query} onChange={setQuery} placeholder="Search name, email or item…" className="lg:w-72" />
        </div>

        {error ? (
          <div className="p-4"><ErrorState message={error} /></div>
        ) : !data ? (
          <Loading label="Loading orders…" />
        ) : (
          <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <Table
              columns={[
                { label: 'Date' }, { label: 'Student' }, { label: 'Item' }, { label: 'Amount', align: 'right' },
                { label: 'Status' }, { label: 'Granted by / note' }, { label: 'Actions', align: 'right' },
              ]}
              empty={!orders.length && (
                <EmptyState
                  icon={FiShoppingBag}
                  title={q || status ? 'No orders match' : 'No orders yet'}
                  hint={q || status ? 'Try another status or search.' : 'Sales and grants show up here as soon as they happen.'}
                />
              )}
            >
              {orders.map((o) => <OrderRow key={o._id} order={o} onRefund={refund} onRevoke={revoke} />)}
            </Table>
            <Pager page={data.page} pages={data.pages} total={data.total} limit={ORDER_LIMIT} busy={loading} onPage={setPage} />
          </div>
        )}
      </Card>

      {granting && <GrantModal currency={currency} onClose={() => setGranting(false)} onGranted={onGranted} />}
      {dialog}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────────────────────

function SettingsTab({ onSettings }) {
  const [saved, setSaved] = useState(null)
  const [error, setError] = useState('')
  const [currency, setCurrency] = useState('usd')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState(null)
  const [toggling, setToggling] = useState(false)
  const { ask, dialog } = useConfirm()

  // resetDraft: a store-open toggle must not throw away a half-typed price.
  const apply = useCallback((s, resetDraft) => {
    setSaved(s)
    onSettings(s)
    if (resetDraft) {
      setCurrency(s.currency || 'usd')
      setPrice(String(s.defaultPaperPrice ?? 0))
    }
  }, [onSettings])

  useEffect(() => {
    let live = true
    apiGet('/api/igcsc/admin/store-settings')
      .then((r) => { if (live && r?.settings) apply(r.settings, true) })
      .catch((e) => { if (live) setError(e.message) })
    return () => { live = false }
  }, [apply])

  if (error && !saved) return <ErrorState message={error} />
  if (!saved) return <Loading label="Loading settings…" />

  const open = !!saved.storeOpen
  const currencyChanged = currency !== saved.currency
  const dirty = currencyChanged || String(price).trim() !== String(saved.defaultPaperPrice ?? 0)

  const save = (e) => {
    e.preventDefault()
    const r = readPrice(price, currency)
    if (r.error) { setFormError(r.error); return }
    setFormError('')
    const go = async () => {
      setSaving(true)
      try {
        const res = await apiSend('/api/igcsc/admin/store-settings', 'PUT', { currency, defaultPaperPrice: r.price })
        if (res?.settings) apply(res.settings, true)
        setNotice({ tone: 'green', text: 'Settings saved.' })
      } finally {
        setSaving(false)
      }
    }
    if (currencyChanged) {
      ask({
        title: `Switch the store to ${cur(currency)}?`,
        body: (
          <>
            <p>
              Prices are not converted. Every paper and plan keeps its number, so a {formatPrice(4.99, saved.currency)} paper
              becomes {formatPrice(4.99, currency)}.
            </p>
            <p>Check your paper and plan prices straight after switching. Revenue totals only count orders in the store’s current currency.</p>
          </>
        ),
        confirmLabel: `Switch to ${cur(currency)}`,
        danger: true,
        run: go,
      })
      return
    }
    go().catch((err) => setFormError(err.message))
  }

  const setOpen = (next) => ask({
    title: next ? 'Open the store?' : 'Close the store?',
    body: next ? (
      <p>Students can pay by card for papers and plans straight away, at the prices set now.</p>
    ) : (
      <p>Nobody can buy until you open it again. Papers already bought, plans and assignments keep working.</p>
    ),
    confirmLabel: next ? 'Open the store' : 'Close the store',
    danger: !next,
    run: async () => {
      setToggling(true)
      try {
        const res = await apiSend('/api/igcsc/admin/store-settings', 'PUT', { storeOpen: next })
        if (res?.settings) apply(res.settings, false)
        setNotice({ tone: 'green', text: next ? 'The store is open.' : 'The store is closed.' })
      } finally {
        setToggling(false)
      }
    },
  })

  return (
    <div className="min-w-0 max-w-3xl">
      <SectionTitle title="Settings" subtitle="The switches that apply to the whole store." />
      <Notice notice={notice} onClose={() => setNotice(null)} />

      <Card className="mb-4">
        <div className="flex items-start gap-4 p-5">
          <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${open ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
            <FiPower size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-slate-800">Store</p>
              <Badge tone={open ? 'green' : 'amber'}>{open ? 'Open' : 'Closed'}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {open
                ? 'Students can buy papers and plans by card.'
                : 'Students can browse, but nobody can buy. Free papers, grants and assignments still work.'}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            {toggling && <Spin size={12} />}
            <Toggle on={open} onChange={setOpen} disabled={toggling} label="Store open" />
          </div>
        </div>
      </Card>

      <Card title="Pricing">
        <form onSubmit={save} className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Currency" hint="Every paper and plan is priced in this currency.">
              <select value={currency} onChange={(e) => { setCurrency(e.target.value); setFormError('') }} className={INPUT}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{cur(c)}</option>)}
              </select>
            </Field>
            <Field label={`Default price for new papers (${cur(currency)})`} hint="Given to papers a future sync creates. Existing prices do not change.">
              <input value={price} onChange={(e) => { setPrice(e.target.value); setFormError('') }} inputMode="decimal" className={INPUT} />
            </Field>
          </div>

          {currencyChanged && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <FiAlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
              <p>
                Changing the currency does not convert existing prices: a {formatPrice(4.99, saved.currency)} paper
                becomes {formatPrice(4.99, currency)}. Review paper and plan prices after switching.
              </p>
            </div>
          )}

          <p className="text-xs text-slate-400">
            To reprice papers already in the catalogue, select them on the Papers tab and use “Set price”.
          </p>

          {formError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{formError}</p>}

          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" disabled={saving || !dirty} className={BTN_PRIMARY}>
              {saving && <Spin />} Save pricing
            </button>
            {dirty && (
              <button type="button" disabled={saving}
                onClick={() => { setCurrency(saved.currency); setPrice(String(saved.defaultPaperPrice ?? 0)); setFormError('') }}
                className={BTN_SECONDARY}>
                Undo changes
              </button>
            )}
          </div>
        </form>
      </Card>

      {dialog}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function StoreAdminPage() {
  const [role, setRole] = useState(undefined) // undefined = not read yet
  const [tab, setTab] = useState('papers')
  const [settings, setSettings] = useState(null)
  const [facets, setFacets] = useState(null)
  const facetsLoading = useRef(false)

  // Read on the client only: the user lives in localStorage. Not
  // useSearchParams, which needs a Suspense boundary on a static page.
  useEffect(() => {
    setRole(igcscUser()?.role || null)
    try {
      const t = new URLSearchParams(window.location.search).get('tab')
      if (TABS.some((x) => x.key === t)) setTab(t)
    } catch {}
  }, [])

  const isAdmin = role === 'admin'

  useEffect(() => {
    if (!isAdmin) return
    apiGetSafe('/api/igcsc/admin/store-settings', null).then((r) => { if (r?.settings) setSettings(r.settings) })
  }, [isAdmin])

  // The plan form needs the curriculum / subject lists even when the Papers
  // tab (which normally brings them) was never opened.
  const loadFacets = useCallback(async () => {
    if (facetsLoading.current) return
    facetsLoading.current = true
    const r = await apiGetSafe('/api/igcsc/admin/papers?limit=1', null)
    setFacets(Array.isArray(r?.facets) ? r.facets : [])
    if (r?.settings) setSettings(r.settings)
    facetsLoading.current = false
  }, [])

  const pickTab = (key) => {
    setTab(key)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', key)
      window.history.replaceState(window.history.state, '', url.toString())
    } catch {}
  }

  if (role === undefined) return <Loading />
  if (!isAdmin) return <AdminsOnly />

  const currency = settings?.currency || 'usd'

  return (
    <div className="min-w-0">
      <StoreHero settings={settings} onOpenSettings={() => pickTab('settings')} />
      <TabBar tab={tab} onPick={pickTab} />
      {settings && !settings.storeOpen && tab !== 'settings' && <ClosedBanner onOpen={() => pickTab('settings')} />}

      {tab === 'papers' && (
        <PapersTab currency={currency} settings={settings} facets={facets} onFacets={setFacets} onSettings={setSettings} />
      )}
      {tab === 'plans' && <PlansTab currency={currency} facets={facets} loadFacets={loadFacets} />}
      {tab === 'orders' && <OrdersTab currency={currency} />}
      {tab === 'settings' && <SettingsTab onSettings={setSettings} />}
    </div>
  )
}
