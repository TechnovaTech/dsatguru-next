'use client'
// The written-marking queue. The AI marks every photographed answer sheet;
// whatever it was unsure about waits here for a tutor to confirm before the
// student's mark is final.
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FiSearch, FiFlag, FiLoader, FiXCircle, FiCheckCircle, FiChevronLeft, FiChevronRight,
  FiRefreshCw, FiArrowRight, FiSend,
} from 'react-icons/fi'
import { apiGet } from '../_components/api'
import { PageHeader, Badge, Loading, EmptyState, ErrorState, Table } from '../_components/ui'

const REFRESH_MS = 10000

const TABS = [
  {
    id: 'needs_review', label: 'Needs review', icon: FiFlag, iconCls: 'bg-brand text-on-brand',
    empty: 'Nothing is waiting for a tutor', hint: 'Answers the AI was unsure about land here for you to check and confirm.',
  },
  {
    id: 'grading', label: 'Being marked', icon: FiLoader, iconCls: 'bg-calm text-white',
    empty: 'Nothing is being marked right now', hint: 'A paper sits here for a minute or two after a student sends their photos.',
  },
  {
    id: 'error', label: 'Failed', icon: FiXCircle, iconCls: 'bg-negative text-white',
    empty: 'No failed marking', hint: 'If the AI cannot mark a paper it shows up here, and you can run it again.',
  },
  {
    id: 'graded', label: 'Marked', icon: FiCheckCircle, iconCls: 'bg-positive text-white',
    empty: 'Nothing marked yet', hint: 'Papers the AI marked with confidence, and those a tutor confirmed, end up here.',
  },
]
const TAB_IDS = TABS.map((t) => t.id)

const STATE_BADGE = {
  needs_review: { label: 'Needs review', tone: 'violet' },
  grading: { label: 'Being marked', tone: 'blue' },
  error: { label: 'Failed', tone: 'red' },
  graded: { label: 'Marked', tone: 'green' },
}

function fmtWhen(d) {
  if (!d) return '—'
  const t = new Date(d)
  if (Number.isNaN(t.getTime())) return '—'
  const mins = Math.round((Date.now() - t.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} h ago`
  return t.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function marksText(a) {
  if (a.writtenScore == null) return '—'
  return `${a.writtenScore} / ${a.writtenMax || 0}`
}

function StateBadge({ state }) {
  const b = STATE_BADGE[state] || { label: state || 'Unknown', tone: 'slate' }
  return (
    <Badge tone={b.tone}>
      {state === 'grading' && <FiLoader className="mr-1 animate-spin" size={10} />}
      {b.label}
    </Badge>
  )
}

function FlagCount({ n }) {
  if (!n) return <span className="text-xs text-subtle">—</span>
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-[#b7791f1a] px-2 py-0.5 font-code text-[11px] text-[#8a5a12]">
      <FiFlag size={10} /> {n}
    </span>
  )
}

function TabCard({ tab, count, active, onPick }) {
  const Icon = tab.icon
  return (
    <button
      type="button"
      onClick={() => onPick(tab.id)}
      aria-pressed={active}
      className={`flex items-center gap-3 border bg-surface p-3 text-left transition-colors sm:p-4 ${active ? 'border-ink' : 'border-line hover:border-line-strong'}`}
    >
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center ${tab.iconCls}`}>
        <Icon size={18} className={tab.id === 'grading' && count ? 'animate-spin' : ''} />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-code text-[11px] uppercase tracking-[0.08em] text-muted">{tab.label}</span>
        <span className="block font-code text-2xl font-medium leading-tight tabular-nums text-ink">{count ?? '—'}</span>
      </span>
    </button>
  )
}

function QueueRow({ a, onOpen }) {
  const href = `/igcsc/grading/${a._id}`
  return (
    <tr onClick={() => onOpen(href)} className="cursor-pointer transition-colors hover:bg-brand-50">
      <td className="px-4 py-3 align-top">
        <div className="max-w-[220px] truncate font-semibold text-ink">{a.userName || 'Student'}</div>
        <div className="max-w-[220px] truncate font-code text-xs text-subtle">{a.userEmail}</div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="max-w-[280px] truncate font-semibold text-ink">{a.paperTitle || 'Paper'}</div>
        <div className="max-w-[280px] truncate text-xs text-muted">{a.paperUnit}</div>
      </td>
      <td className="px-4 py-3 align-top">
        <StateBadge state={a.writtenState} />
        {a.model && <div className="mt-1 max-w-[160px] truncate text-[11px] text-subtle">{a.model}</div>}
      </td>
      <td className="whitespace-nowrap px-4 py-3 align-top font-code text-xs text-ink-2">
        {fmtWhen(a.submittedAt)}
        {a.gradedAt && <div className="text-[11px] text-subtle">marked {fmtWhen(a.gradedAt)}</div>}
      </td>
      <td className="whitespace-nowrap px-4 py-3 align-top font-code font-semibold tabular-nums text-ink">{marksText(a)}</td>
      <td className="px-4 py-3 align-top"><FlagCount n={a.flagged} /></td>
      <td className="px-4 py-3 text-right align-top">
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand-50"
        >
          {a.writtenState === 'needs_review' ? 'Review' : 'Open'} <FiArrowRight size={13} />
        </Link>
      </td>
    </tr>
  )
}

function QueueCard({ a }) {
  return (
    <Link href={`/igcsc/grading/${a._id}`} className="block px-4 py-4 transition-colors hover:bg-brand-50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink">{a.userName || 'Student'}</div>
          <div className="truncate text-xs text-subtle">{a.userEmail}</div>
        </div>
        <StateBadge state={a.writtenState} />
      </div>
      <div className="mt-2 break-words text-sm font-semibold text-ink-2">{a.paperTitle || 'Paper'}</div>
      {a.paperUnit && <div className="break-words text-xs text-muted">{a.paperUnit}</div>}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span>Sent {fmtWhen(a.submittedAt)}</span>
        <span className="font-semibold text-ink-2">Written {marksText(a)}</span>
        {a.flagged > 0 && <FlagCount n={a.flagged} />}
        <span className="ml-auto inline-flex items-center gap-1 font-semibold text-brand">
          {a.writtenState === 'needs_review' ? 'Review' : 'Open'} <FiArrowRight size={12} />
        </span>
      </div>
    </Link>
  )
}

export default function GradingQueuePage() {
  const router = useRouter()
  const [tab, setTab] = useState(null) // null until the URL has been read
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let t = 'needs_review'
    try {
      const want = new URLSearchParams(window.location.search).get('status')
      if (TAB_IDS.includes(want)) t = want
    } catch {}
    setTab(t)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  // Only the newest request may write, so a slow answer for the last tab never
  // lands on the one now showing.
  const seq = useRef(0)
  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!tab) return
    const my = ++seq.current
    if (!quiet) setLoading(true)
    try {
      const qs = new URLSearchParams({ status: tab, page: String(page) })
      if (search) qs.set('q', search)
      const d = await apiGet(`/api/igcsc/grading?${qs.toString()}`)
      if (my !== seq.current) return
      setData(d)
      setError('')
    } catch (e) {
      // A background refresh that fails keeps the list it had.
      if (my === seq.current && !quiet) setError(e.message)
    } finally {
      if (my === seq.current) setLoading(false)
    }
  }, [tab, page, search])

  useEffect(() => { load() }, [load])

  const attempts = Array.isArray(data?.attempts) ? data.attempts : []
  const counts = data?.counts || {}
  const anyGrading = (counts.grading || 0) > 0 || attempts.some((a) => a.writtenState === 'grading')

  // The AI finishes on its own schedule; keep the queue current while it works.
  useEffect(() => {
    if (!anyGrading) return
    const t = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      load({ quiet: true })
    }, REFRESH_MS)
    return () => clearInterval(t)
  }, [anyGrading, load])

  const pickTab = useCallback((id) => {
    setTab(id)
    setPage(1)
    try { window.history.replaceState(null, '', `${window.location.pathname}?status=${id}`) } catch {}
  }, [])

  const openRow = useCallback((href) => router.push(href), [router])

  const current = TABS.find((t) => t.id === tab) || TABS[0]
  const pages = Math.max(1, Number(data?.pages) || 1)
  const total = Number(data?.total) || 0

  // Confirming papers moves them out of this tab, which can leave the page
  // number pointing past the end.
  useEffect(() => {
    if (data && page > pages) setPage(pages)
  }, [data, page, pages])

  return (
    <div>
      <PageHeader
        eyebrow="Staff · Marking queue"
        title={<>The marking <em className="accent">queue</em></>}
        subtitle="The AI marks every photographed answer sheet. Check anything it flagged, then release the marks to the student."
        actions={(
          <>
            <Link
              href="/igcsc/paper-assign"
              className="inline-flex h-10 items-center gap-2 border border-line-strong px-4 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink/5"
            >
              <FiSend size={15} /> Assign papers
            </Link>
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 border border-line-strong px-4 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink/5 disabled:opacity-50"
            >
              <FiRefreshCw size={15} className={loading && data ? 'animate-spin' : ''} /> Refresh
            </button>
          </>
        )}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TABS.map((t) => (
          <TabCard key={t.id} tab={t} count={data ? counts[t.id] ?? 0 : null} active={tab === t.id} onPick={pickTab} />
        ))}
      </div>

      <div className="border border-line bg-surface">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-code text-[11px] uppercase tracking-[0.12em] text-muted">{current.label}</h3>
            {data && <span className="font-code text-xs tabular-nums text-subtle">{total} paper{total === 1 ? '' : 's'}</span>}
            {anyGrading && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-calm">
                <FiLoader size={11} className="animate-spin" /> updating every 10s
              </span>
            )}
          </div>
          <div className="relative sm:w-72">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" size={15} />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search student or paper"
              className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-subtle focus:border-ink focus:outline-none"
            />
          </div>
        </div>

        {!tab || (loading && !data) ? (
          <Loading label="Loading the marking queue…" />
        ) : error && !data ? (
          <div className="p-4"><ErrorState message={error} /></div>
        ) : attempts.length === 0 ? (
          <>
            {error && <div className="px-4 pt-4"><ErrorState message={error} /></div>}
            <EmptyState
              icon={current.icon}
              title={search ? 'Nothing matches that search' : current.empty}
              hint={search ? 'Try a student name, an email or a paper title.' : current.hint}
            />
          </>
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            {error && <div className="px-4 pt-4"><ErrorState message={error} /></div>}
            <div className="divide-y divide-line md:hidden">
              {attempts.map((a) => <QueueCard key={a._id} a={a} />)}
            </div>
            <div className="hidden md:block">
              <Table
                columns={[
                  { label: 'Student' },
                  { label: 'Paper' },
                  { label: 'Status' },
                  { label: 'Sent' },
                  { label: 'Written' },
                  { label: 'Flags' },
                  { label: '', align: 'right' },
                ]}
              >
                {attempts.map((a) => <QueueRow key={a._id} a={a} onOpen={openRow} />)}
              </Table>
            </div>
          </div>
        )}

        {data && pages > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-ink-2 transition hover:bg-ink/5 disabled:opacity-40"
            >
              <FiChevronLeft size={15} /> Previous
            </button>
            <span className="font-code text-xs tabular-nums text-muted">Page {page} of {pages}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages || loading}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-ink-2 transition hover:bg-ink/5 disabled:opacity-40"
            >
              Next <FiChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
