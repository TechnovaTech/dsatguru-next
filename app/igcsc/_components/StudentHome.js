'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  FiEdit3, FiBarChart2, FiVideo, FiArrowRight, FiTarget, FiTrendingUp, FiKey, FiBookOpen, FiAward,
  FiPercent, FiPlayCircle, FiSend, FiCalendar, FiUser, FiShoppingBag, FiCheckCircle, FiStar,
} from 'react-icons/fi'
import { apiGetSafe } from './api'
import { igcscUser } from './auth'
import { Loading, Badge } from './ui'
import { AttemptRow, fmtDate, fmtDue, isOverdue, byDueDate, GRADE_TONE } from './PaperCard'
import { meetingState } from '../../../lib/meetingStatus'
import { scopeLabel } from '../../../lib/igcscStoreShared'

function planLabel(pl) {
  if (pl.planName) return pl.planName
  return pl.scope === 'all' ? 'Every paper' : `All ${scopeLabel(pl)} papers`
}

// What a student sees on landing: what to do next, how they are doing, what is
// on now - papers first, question practice below.
export default function StudentHome() {
  const [me, setMe] = useState(null)
  const [results, setResults] = useState(null)
  const [meetings, setMeetings] = useState([])
  const [store, setStore] = useState(null)
  const [openable, setOpenable] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMe(igcscUser())
    ;(async () => {
      const [r, m, s, o] = await Promise.all([
        apiGetSafe('/api/igcsc/my-results', null),
        apiGetSafe('/api/igcsc/meetings', { meetings: [] }),
        apiGetSafe('/api/igcsc/store/me', null),
        // "Only mine" with one row: its total is every paper this student can
        // open - bought, assigned, free, or inside a plan.
        apiGetSafe('/api/igcsc/store/catalog?owned=1&limit=1', null),
      ])
      setResults(r)
      setMeetings(m?.meetings || [])
      setStore(s)
      setOpenable(o)
      setLoading(false)
    })()
  }, [])

  if (loading) return <Loading label="Loading your dashboard…" />

  const s = results?.summary || {}
  const recent = (results?.sessions || []).slice(0, 5)
  const now = new Date()
  const live = meetings.map((x) => ({ ...x, _s: meetingState(x, now) })).filter((x) => x._s.canJoin)
  const weakest = (results?.topics || []).filter((t) => t.accuracy != null).slice(0, 3)

  const attempts = store?.attempts || []
  const allInProgress = attempts.filter((a) => a.status === 'in_progress')
  const inProgress = allInProgress.slice(0, 3)
  const paperResults = attempts.filter((a) => a.status !== 'in_progress').slice(0, 5)
  const marked = attempts.filter((a) => a.status === 'completed' || a.status === 'needs_review')
  const pcts = marked.map((a) => a.percentage).filter((x) => typeof x === 'number')
  const average = pcts.length ? Math.round(pcts.reduce((x, y) => x + y, 0) / pcts.length) : null
  const allAssigned = store?.assignments || []
  const outstanding = allAssigned
    .filter((a) => !a.latestAttempt || a.latestAttempt.status === 'in_progress')
    .sort(byDueDate)
  const assigned = outstanding.slice(0, 4)
  // An assigned paper already started is counted once, as in progress.
  const todo = allInProgress.length + allAssigned.filter((a) => !a.latestAttempt).length
  const plans = store?.plans || []
  const credits = Number(store?.credits || 0)
  const ownedIds = new Set([
    ...(store?.papers || []).map((p) => p._id),
    ...allAssigned.map((a) => a.paper?._id).filter(Boolean),
  ])
  const canOpen = openable?.total ?? ownedIds.size

  const first = me?.name ? me.name.split(' ')[0] : ''
  let headline = 'Sit a real exam paper, or practise one topic at a time. Every mark shows you what to fix next.'
  let cta = { href: '/igcsc/store', label: 'Browse test papers', icon: FiShoppingBag }
  if (inProgress.length) {
    headline = 'You have a test in progress. Pick up right where you left off.'
    cta = { href: `/igcsc/attempt/${inProgress[0]._id}`, label: 'Continue my test', icon: FiPlayCircle }
  } else if (assigned.length) {
    headline = `Your tutor has set you ${outstanding.length === 1 ? 'a paper' : `${outstanding.length} papers`}.`
    cta = { href: `/igcsc/papers/${assigned[0].paper?._id}`, label: 'Start assigned paper', icon: FiSend }
  }

  return (
    <div>
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-600 px-5 py-7 text-white shadow-lg sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-24 right-40 h-48 w-48 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100">Student dashboard</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Welcome back{first ? `, ${first}` : ''}</h1>
            <p className="mt-2 text-sm leading-relaxed text-indigo-100 sm:text-base">{headline}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={cta.href} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50">
                <cta.icon size={15} /> {cta.label}
              </Link>
              {cta.href !== '/igcsc/store' && (
                <Link href="/igcsc/store" className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/25">
                  <FiShoppingBag size={15} /> Test papers
                </Link>
              )}
              <Link href="/igcsc/practice" className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/25">
                <FiEdit3 size={15} /> Practise
              </Link>
            </div>
          </div>
          <Link href="/igcsc/my-tests" className="flex flex-shrink-0 items-center gap-4 rounded-2xl bg-white/15 px-5 py-4 ring-1 ring-white/25 transition hover:bg-white/20">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-indigo-600"><FiBookOpen size={20} /></span>
            <span>
              <span className="block text-2xl font-extrabold leading-none">{todo || <FiCheckCircle size={22} />}</span>
              <span className="mt-1 block text-xs text-indigo-100">
                {todo ? `test${todo === 1 ? '' : 's'} waiting for you` : 'All caught up'}
              </span>
            </span>
            <FiArrowRight size={16} className="text-indigo-100" />
          </Link>
        </div>
      </section>

      {live.length > 0 && (
        <div className="mb-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-5">
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-900">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            A class is on right now
          </p>
          {live.slice(0, 2).map((m) => (
            <div key={m._id} className="flex flex-wrap items-center justify-between gap-3 py-1">
              <span className="text-sm font-semibold text-slate-800">{m.title}</span>
              <Link href="/igcsc/meetings"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                Join
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Credits" value={credits} icon={FiKey} tone="from-indigo-500 to-indigo-600" hint="1 credit = any 1 paper" />
        <Metric label="Papers you can open" value={canOpen} icon={FiBookOpen} tone="from-blue-500 to-blue-600" hint="Bought, assigned or in a plan" />
        <Metric label="Tests marked" value={marked.length} icon={FiAward} tone="from-emerald-500 to-emerald-600" />
        <Metric label="Average" value={average != null ? `${average}%` : '—'} icon={FiPercent} tone="from-amber-500 to-orange-500" hint={pcts.length ? `Across ${pcts.length} paper${pcts.length === 1 ? '' : 's'}` : ''} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {inProgress.length > 0 && (
            <Panel title="Continue where you left off" icon={FiPlayCircle} href="/igcsc/my-tests?tab=progress">
              <div className="divide-y divide-slate-100">
                {inProgress.map((a) => <AttemptRow key={a._id} attempt={a} />)}
              </div>
            </Panel>
          )}

          {allAssigned.length > 0 && (
            <Panel title="Assigned by your tutor" icon={FiSend} href="/igcsc/my-tests?tab=assigned">
              {assigned.length === 0 ? (
                <p className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
                  <FiCheckCircle size={16} className="text-emerald-500" /> All caught up. Nothing waiting for you.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {assigned.map((a) => <AssignedLine key={a._id} a={a} />)}
                </div>
              )}
            </Panel>
          )}

          <Panel title="Recent paper results" icon={FiAward} href={paperResults.length ? '/igcsc/my-tests?tab=completed' : ''}>
            {paperResults.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-slate-400">No marked papers yet. Your results will show up here.</p>
                <Link href="/igcsc/store" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline">
                  Find a paper to sit <FiArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {paperResults.map((a) => <AttemptRow key={a._id} attempt={a} />)}
              </div>
            )}
          </Panel>

          <Panel title="Question practice" icon={FiEdit3} href="/igcsc/my-results" linkLabel="View all">
            <div className="grid grid-cols-2 gap-3 px-2 pt-1 sm:grid-cols-4 sm:px-3">
              <Stat label="Questions done" value={s.questions ?? 0} icon={FiTarget} tone="bg-violet-500" />
              <Stat label="Accuracy" value={s.accuracy != null ? `${s.accuracy}%` : '—'} icon={FiTrendingUp} tone="bg-emerald-500" />
              <Stat label="Attempts" value={s.attempts ?? 0} icon={FiEdit3} tone="bg-indigo-500" />
              <Stat label="Last grade" value={s.lastGrade || '—'} icon={FiBarChart2} tone="bg-amber-500" />
            </div>
            <div className="mt-3 border-t border-slate-100 px-2 pt-2 sm:px-3">
              {recent.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  Nothing yet — your first practice set will show up here.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recent.map((x) => (
                    <div key={x._id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{x.testTitle || 'Practice'}</p>
                        <p className="text-xs text-slate-400">{x.completedAt ? new Date(x.completedAt).toLocaleDateString() : ''}</p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span className="text-sm text-slate-600">{x.correct}/{x.total}</span>
                        <Badge tone={GRADE_TONE[x.grade] || 'slate'}>{x.grade}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {weakest.length > 0 && (
              <div className="mx-2 mb-1 mt-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:mx-3">
                <p className="mb-2 text-sm font-bold text-amber-900">Worth working on</p>
                <div className="space-y-1.5">
                  {weakest.map((t) => (
                    <div key={t.topic} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-slate-700">{t.topic}</span>
                      <span className="flex-shrink-0 font-bold text-amber-700">{t.accuracy}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <div className="space-y-3">
            <Action href="/igcsc/store" icon={FiShoppingBag} title="Test Papers" hint="Real exam papers, marked for you" primary />
            <Action href="/igcsc/my-tests" icon={FiBookOpen} title="My Tests" hint="In progress, assigned and owned" />
            <Action href="/igcsc/practice" icon={FiEdit3} title="Practice" hint="Pick a topic and answer questions" />
            <Action href="/igcsc/my-results" icon={FiBarChart2} title="My Results" hint="Your progress and mistake analysis" />
            <Action href="/igcsc/meetings" icon={FiVideo} title="Live Sessions" hint="Join your classes" />
          </div>

          {plans.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FiCheckCircle size={16} className="text-emerald-500" /> Active plans
              </p>
              <ul className="mt-3 space-y-2.5">
                {plans.map((pl) => (
                  <li key={pl._id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="min-w-0 text-sm font-semibold text-slate-800">{planLabel(pl)}</span>
                    <span className="text-xs text-slate-500">{pl.expiresAt ? `until ${fmtDate(pl.expiresAt)}` : 'no expiry'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link href="/igcsc/store" className="group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 p-5 text-white shadow-sm transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
            <FiStar size={20} className="relative text-indigo-100" />
            <p className="relative mt-3 text-base font-extrabold">Unlock more papers</p>
            <p className="relative mt-1 text-sm text-indigo-100">
              {credits > 0
                ? `You have ${credits} credit${credits === 1 ? '' : 's'} to spend. Pick any paper you like.`
                : 'Credit packs and plans cost less per paper than buying one at a time.'}
            </p>
            <span className="relative mt-4 inline-flex items-center gap-1.5 text-sm font-bold">
              Go to the store <FiArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}

// The ui.js StatCard truncates its label; two to a row on a phone, these wrap.
function Metric({ label, value, icon: Icon, tone, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase leading-snug tracking-wide text-slate-500">{label}</p>
        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm ${tone}`}>
          <Icon size={15} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{hint}</p>}
    </div>
  )
}

function Panel({ title, icon: Icon, href, linkLabel = 'View all', children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-1 flex items-center justify-between gap-3 px-2 pt-1 sm:px-3">
        <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
          {Icon && <Icon size={15} className="text-indigo-500" />} {title}
        </p>
        {href && (
          <Link href={href} className="flex-shrink-0 text-xs font-semibold text-indigo-600 hover:underline">{linkLabel} →</Link>
        )}
      </div>
      {children}
    </div>
  )
}

function AssignedLine({ a }) {
  const p = a.paper || {}
  const overdue = isOverdue(a)
  const started = a.latestAttempt?.status === 'in_progress'
  const href = started ? `/igcsc/attempt/${a.latestAttempt._id}` : `/igcsc/papers/${p._id}`
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-slate-50 sm:px-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{p.title || 'Test paper'}</p>
        {p.unit && <p className="truncate text-xs text-slate-500">{p.unit}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
          {a.dueAt ? (
            <span className={`inline-flex items-center gap-1 ${overdue ? 'font-bold text-rose-600' : 'font-semibold text-slate-600'}`}>
              <FiCalendar size={11} /> {overdue ? 'Overdue, was due' : 'Due'} {fmtDue(a.dueAt)}
            </span>
          ) : (
            <span className="text-slate-400">No due date</span>
          )}
          {a.assignedByName && (
            <span className="inline-flex items-center gap-1 text-slate-500"><FiUser size={11} /> {a.assignedByName}</span>
          )}
        </div>
        {a.note && <p className="mt-1 truncate text-xs italic text-slate-500">“{a.note}”</p>}
      </div>
      <span className="flex-shrink-0 text-xs font-semibold text-indigo-600">{started ? 'Continue' : 'Start'}</span>
      <FiArrowRight size={14} className="flex-shrink-0 text-slate-300" />
    </Link>
  )
}

function Stat({ label, value, icon: Icon, tone }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-white ${tone}`}>
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-extrabold leading-tight text-slate-900">{value}</p>
        <p className="truncate text-[11px] text-slate-500">{label}</p>
      </div>
    </div>
  )
}

function Action({ href, icon: Icon, title, hint, primary }) {
  return (
    <Link href={href}
      className={`flex items-center gap-3 rounded-2xl border p-4 transition ${primary
        ? 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100'
        : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${primary ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-900">{title}</span>
        <span className="block truncate text-xs text-slate-500">{hint}</span>
      </span>
      <FiArrowRight size={15} className="flex-shrink-0 text-slate-300" />
    </Link>
  )
}
