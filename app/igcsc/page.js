'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  FiUsers, FiFileText, FiCheckSquare, FiClock, FiTrendingUp, FiArrowRight, FiEdit3, FiAlertTriangle,
  FiShoppingBag, FiSend, FiUserPlus, FiVideo, FiClipboard, FiRefreshCw, FiCheckCircle, FiCalendar,
  FiPlayCircle, FiInbox, FiAward,
} from 'react-icons/fi'
import { apiGet } from './_components/api'
import { igcscUser } from './_components/auth'
import StudentHome from './_components/StudentHome'
import { PageHeader, StatCard, Card, Loading, EmptyState, ErrorState, Badge } from './_components/ui'
import { formatPrice } from '../../lib/igcscStoreShared'

const gradeTone = (g) => (['A*', 'A'].includes(g) ? 'green' : ['B', 'C'].includes(g) ? 'blue' : ['D', 'E'].includes(g) ? 'amber' : 'red')

export default function IgcscDashboard() {
  // Students never load the centre-wide figures — they are not theirs to see.
  const [role, setRole] = useState(undefined)
  useEffect(() => { setRole(igcscUser()?.role || null) }, [])

  if (role === undefined) return <Loading label="Loading…" />
  if (role === 'student') return <StudentHome />
  return <StaffDashboard isAdmin={role === 'admin'} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────

const plural = (n, one, many = `${one}s`) => `${Number(n || 0).toLocaleString()} ${n === 1 ? one : many}`
const paperName = (title, unit) => [title, unit].filter(Boolean).join(' — ') || 'Untitled paper'
const shortDate = (at) => new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

// "just now", "5 min ago", "3 hours ago", "2 days ago", then a plain date.
function ago(at) {
  const t = at ? new Date(at).getTime() : NaN
  if (!Number.isFinite(t)) return ''
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${plural(hours, 'hour')} ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${plural(days, 'day')} ago`
  return shortDate(at)
}

// formatPrice says "Free" for zero, which reads oddly as takings, and a big
// figure is shown whole (then short, "$120K") so it still fits its tile.
function takings(n, currency) {
  const v = Number(n || 0)
  if (v > 0 && v < 1000) return formatPrice(v, currency)
  const big = v >= 100000
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: String(currency || 'usd').toUpperCase(),
      notation: big ? 'compact' : 'standard',
      minimumFractionDigits: 0,
      maximumFractionDigits: big ? 1 : 0,
    }).format(v)
  } catch {
    return `${Math.round(v).toLocaleString()} ${String(currency || '').toUpperCase()}`.trim()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Staff dashboard: what needs doing first, then the numbers, then the way in
// to every part of the portal.
// ─────────────────────────────────────────────────────────────────────────────

function StaffDashboard({ isAdmin }) {
  const [me] = useState(() => igcscUser())
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const seq = useRef(0)

  const load = useCallback(async ({ quiet = false } = {}) => {
    const my = ++seq.current
    if (!quiet) {
      setLoading(true)
      setError('')
    }
    try {
      const d = await apiGet('/api/igcsc/staff-overview')
      if (my !== seq.current) return
      setData(d)
      setError('')
    } catch (e) {
      // A background refresh that fails keeps what is already on screen.
      if (my === seq.current && !quiet) setError(e.message || 'Could not load the dashboard.')
    } finally {
      if (my === seq.current) setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Coming back from checking answers in another tab should show the new count.
  useEffect(() => {
    const onShow = () => { if (!document.hidden) load({ quiet: true }) }
    document.addEventListener('visibilitychange', onShow)
    return () => document.removeEventListener('visibilitychange', onShow)
  }, [load])

  const first = String(me?.name || '').trim().split(/\s+/)[0]
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const header = (
    <PageHeader
      title={`${greeting()}${first ? `, ${first}` : ''}`}
      subtitle="Here is what needs you today."
      actions={(
        <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500">
          <FiCalendar size={13} /> {today}
        </span>
      )}
    />
  )

  if (loading && !data) return <div>{header}<DashboardSkeleton /></div>
  if (!data) return <div>{header}<LoadError message={error} onRetry={() => load()} /></div>

  const c = data.counts || {}
  const store = data.store || {}
  const money = isAdmin ? data.money : null
  const needsReview = Array.isArray(data.needsReview) ? data.needsReview : []
  const recent = Array.isArray(data.recent) ? data.recent : []
  const overdue = Array.isArray(data.overdue) ? data.overdue : []

  // Work waiting on someone, most urgent first. A student is waiting behind
  // every one of these.
  const work = []
  if (c.needsReview > 0) {
    work.push({
      key: 'review', href: '/igcsc/grading', tone: 'violet', icon: FiEdit3,
      title: `${plural(c.needsReview, 'answer sheet')} to check`,
      hint: 'The AI was not sure about some marks. Check them, then release the result to the student.',
      cta: 'Check answers',
    })
  }
  if (c.markingFailed > 0) {
    work.push({
      key: 'failed', href: '/igcsc/grading?status=error', tone: 'rose', icon: FiAlertTriangle,
      title: `${plural(c.markingFailed, 'answer sheet')} could not be marked`,
      hint: 'The AI ran into a problem. Open each one and press "Re-run AI marking".',
      cta: 'Fix marking',
    })
  }
  if (c.overdue > 0) {
    work.push({
      key: 'overdue', href: '/igcsc/paper-assign', tone: 'amber', icon: FiClock,
      title: `${plural(c.overdue, 'assignment')} overdue`,
      hint: 'The due date has passed and the student has not handed in yet.',
      cta: 'See assigned work',
      list: overdue,
      more: c.overdue,
    })
  }
  const shown = work.slice(0, 3)
  // Setting up the store is a tip, not a chore: it only shows when there is
  // room, and never stops the dashboard from reading "All caught up".
  const storeTip = isAdmin && store.open === false && shown.length < 3

  return (
    <div>
      {header}

      <SectionLabel>Needs you</SectionLabel>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.length === 0 && <AllCaughtUp />}
        {shown.map(({ key, ...card }) => <ActionCard key={key} {...card} />)}
        {storeTip && (
          <ActionCard
            href="/igcsc/store-admin"
            tone="indigo"
            icon={FiShoppingBag}
            title="Your store is closed"
            hint="Set your prices and open it so students can buy papers themselves. Papers you assign work either way."
            cta="Set prices and open it"
          />
        )}
      </div>

      <SectionLabel className="mt-6">At a glance</SectionLabel>
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${money ? 'lg:grid-cols-3 xl:grid-cols-5' : 'xl:grid-cols-4'}`}>
        <StatCard
          label="Students"
          value={(c.activeStudents ?? 0).toLocaleString()}
          hint={!c.students ? 'None yet — add one from Students' : c.students === c.activeStudents ? 'All active' : `active, of ${c.students.toLocaleString()} in total`}
          icon={FiUsers}
          tone="indigo"
        />
        <StatCard
          label="Papers on sale"
          value={(c.papersOnSale ?? 0).toLocaleString()}
          hint={c.papersHeld > 0 ? `${c.papersHeld.toLocaleString()} held back for checking` : 'Ready for students'}
          icon={FiFileText}
          tone="blue"
        />
        <StatCard label="Tests marked" value={(c.completed7d ?? 0).toLocaleString()} hint="in the last 7 days" icon={FiAward} tone="emerald" />
        <StatCard label="In progress" value={(c.inProgress ?? 0).toLocaleString()} hint="started, not handed in yet" icon={FiPlayCircle} tone="amber" />
        {money && (
          <div className="sm:col-span-2 lg:col-span-1">
            <StatCard
              label="Revenue"
              value={takings(money.revenue30d, money.currency)}
              hint={`last 30 days · ${plural(money.paidOrders30d || 0, 'sale')}`}
              icon={FiTrendingUp}
              tone="violet"
            />
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Waiting for your check"
          action={<CardLink href="/igcsc/grading">See all</CardLink>}
        >
          <CardNote>Written answers the AI was not sure about. Open one, fix any marks, then release it.</CardNote>
          {c.grading > 0 && (
            <p className="mx-5 mt-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
              <FiClock size={13} className="flex-shrink-0" />
              {plural(c.grading, 'answer sheet')} being marked by the AI right now
            </p>
          )}
          {needsReview.length === 0 ? (
            <EmptyState icon={FiCheckCircle} title="Nothing to check" hint="When the AI is unsure about a mark, the answer sheet comes here for you." />
          ) : (
            <div className="mt-2 divide-y divide-slate-100">
              {needsReview.map((a) => <ReviewRow key={a._id} a={a} />)}
            </div>
          )}
        </Card>

        <Card title="Latest results">
          <CardNote>The newest marked papers. Open one to see the full result.</CardNote>
          {recent.length === 0 ? (
            <EmptyState icon={FiInbox} title="No results yet" hint="Results appear here as soon as a student hands in a paper and it is marked." />
          ) : (
            <div className="mt-2 divide-y divide-slate-100">
              {recent.map((r) => <ResultRow key={r._id} r={r} />)}
            </div>
          )}
        </Card>
      </div>

      <Card title="Quick actions" className="mt-6">
        <CardNote>New here? This is what each part of the portal is for.</CardNote>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {QUICK.filter((q) => !q.only || q.only === (isAdmin ? 'admin' : 'tutor')).map((q) => (
            <QuickAction key={q.title} {...q} />
          ))}
        </div>
      </Card>
    </div>
  )
}

// Tutors cannot create logins (that is an admin job), so they get the list instead.
const QUICK = [
  { href: '/igcsc/question-bank', icon: FiSend, title: 'Assign a paper', hint: 'Pick a paper from the question bank and send it to one or more students.' },
  { href: '/igcsc/grading', icon: FiCheckSquare, title: 'Check answers', hint: 'Look over written answers the AI marked, then release the result.' },
  { href: '/igcsc/users', icon: FiUserPlus, title: 'Add a student', hint: 'Give a student a login so they can sit papers and see their results.', only: 'admin' },
  { href: '/igcsc/users', icon: FiUsers, title: 'Your students', hint: 'See every student and how they are getting on.', only: 'tutor' },
  { href: '/igcsc/paper-assign', icon: FiClipboard, title: 'See assigned work', hint: 'Who has which paper, when it is due, and who has finished.' },
  { href: '/igcsc/meetings', icon: FiVideo, title: 'Live classes', hint: 'Schedule an online class and share the link to join.' },
  { href: '/igcsc/store-admin', icon: FiShoppingBag, title: 'Prices & plans', hint: 'Set paper prices and credit packs, and open or close the store.', only: 'admin' },
]

// Whole Tailwind class strings, so the compiler keeps every one of them.
const ACTION_TONES = {
  violet: { card: 'border-violet-200 bg-violet-50 hover:border-violet-300', icon: 'bg-violet-600', title: 'text-violet-950', text: 'text-violet-800', link: 'text-violet-700' },
  rose: { card: 'border-rose-200 bg-rose-50 hover:border-rose-300', icon: 'bg-rose-600', title: 'text-rose-950', text: 'text-rose-800', link: 'text-rose-700' },
  amber: { card: 'border-amber-200 bg-amber-50 hover:border-amber-300', icon: 'bg-amber-500', title: 'text-amber-950', text: 'text-amber-800', link: 'text-amber-700' },
  indigo: { card: 'border-indigo-200 bg-indigo-50 hover:border-indigo-300', icon: 'bg-indigo-600', title: 'text-indigo-950', text: 'text-indigo-800', link: 'text-indigo-700' },
}

function ActionCard({ href, tone, icon: Icon, title, hint, cta, list, more }) {
  const t = ACTION_TONES[tone] || ACTION_TONES.indigo
  const rows = Array.isArray(list) ? list.slice(0, 3) : []
  const rest = Math.max(0, Number(more || 0) - rows.length)
  return (
    <Link href={href} className={`group flex flex-col rounded-2xl border p-5 shadow-sm transition-colors ${t.card}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white ${t.icon}`}>
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <p className={`text-base font-bold leading-snug ${t.title}`}>{title}</p>
          <p className={`mt-1 text-sm leading-relaxed ${t.text}`}>{hint}</p>
        </div>
      </div>
      {rows.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {rows.map((o) => (
            <li key={o._id} className="flex items-center justify-between gap-3 rounded-lg bg-white/80 px-3 py-2 text-xs">
              <span className="min-w-0 truncate">
                <span className="font-semibold text-slate-800">{o.student?.name || 'A student'}</span>
                <span className="text-slate-500"> · {paperName(o.paper?.title, o.paper?.unit)}</span>
              </span>
              {o.dueAt && <span className="flex-shrink-0 font-semibold text-amber-700">due {shortDate(o.dueAt)}</span>}
            </li>
          ))}
          {rest > 0 && <li className={`px-1 text-xs font-medium ${t.text}`}>and {rest.toLocaleString()} more</li>}
        </ul>
      )}
      <span className={`mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold ${t.link}`}>
        {cta} <FiArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

function AllCaughtUp() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
        <FiCheckCircle size={18} />
      </span>
      <div>
        <p className="text-base font-bold text-emerald-950">All caught up</p>
        <p className="mt-1 text-sm leading-relaxed text-emerald-800">
          Nothing is waiting for you. Answers to check and overdue work will show up here.
        </p>
      </div>
    </div>
  )
}

function SectionLabel({ children, className = '' }) {
  return <h2 className={`mb-3 text-xs font-bold uppercase tracking-wide text-slate-500 ${className}`}>{children}</h2>
}

function CardNote({ children }) {
  return <p className="px-5 pt-3 text-xs leading-relaxed text-slate-500">{children}</p>
}

function CardLink({ href, children }) {
  return (
    <Link href={href} className="flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
      {children} <FiArrowRight size={13} />
    </Link>
  )
}

function Initials({ name }) {
  const letters = String(name || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase()
  return (
    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
      {letters || '?'}
    </span>
  )
}

function ReviewRow({ a }) {
  return (
    <Link href={`/igcsc/grading/${a._id}`} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50">
      <Initials name={a.userName} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{a.userName || 'Student'}</p>
        <p className="truncate text-xs text-slate-500">{paperName(a.paperTitle, a.paperUnit)}</p>
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        {a.flagged > 0 && <Badge tone="violet">{a.flagged} to check</Badge>}
        <span className="text-[11px] text-slate-400">{ago(a.submittedAt)}</span>
      </div>
    </Link>
  )
}

function ResultRow({ r }) {
  const pct = r.percentage != null && Number.isFinite(Number(r.percentage)) ? `${Math.round(Number(r.percentage))}%` : '—'
  return (
    <Link href={`/igcsc/attempt/${r._id}/result`} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50">
      <Initials name={r.userName} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{r.userName || 'Student'}</p>
        <p className="truncate text-xs text-slate-500">{paperName(r.paperTitle, r.paperUnit)}</p>
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <span className="flex items-center gap-2">
          {r.grade && <Badge tone={gradeTone(r.grade)}>{r.grade}</Badge>}
          <span className="text-sm font-bold text-slate-900">{pct}</span>
        </span>
        {r.status === 'needs_review'
          ? <Badge tone="violet">Provisional</Badge>
          : <span className="text-[11px] text-slate-400">{ago(r.completedAt)}</span>}
      </div>
    </Link>
  )
}

function QuickAction({ href, icon: Icon, title, hint }) {
  return (
    <Link href={href} className="group flex items-start gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:border-indigo-200 hover:bg-indigo-50/40">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-100">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-sm font-bold text-slate-800">
          {title}
          <FiArrowRight size={13} className="text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500" />
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{hint}</span>
      </span>
    </Link>
  )
}

function LoadError({ message, onRetry }) {
  return (
    <div className="space-y-3">
      <ErrorState message={message || 'Could not load the dashboard.'} />
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
      >
        <FiRefreshCw size={14} /> Try again
      </button>
    </div>
  )
}

// The same shape as the page, so nothing jumps when the numbers arrive.
function DashboardSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading dashboard">
      <div className="mb-3 h-3 w-20 rounded bg-slate-200" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1].map((i) => <div key={i} className="h-36 rounded-2xl border border-slate-200 bg-white" />)}
      </div>
      <div className="mb-3 mt-6 h-3 w-24 rounded bg-slate-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="h-3 w-20 rounded bg-slate-200" />
            <div className="mt-3 h-7 w-14 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-28 rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4"><div className="h-4 w-40 rounded bg-slate-200" /></div>
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="flex items-center gap-3 px-5 py-3.5">
                <div className="h-9 w-9 rounded-full bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-slate-200" />
                  <div className="h-3 w-2/3 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
