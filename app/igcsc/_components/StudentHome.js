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
      <section className="relative mb-6 overflow-hidden bg-cta px-5 py-7 text-on-cta sm:px-8 sm:py-9 animate-rise">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <p className="font-code text-[11px] uppercase tracking-[0.18em] text-on-cta/60">Student dashboard</p>
            <h1 className="display mt-2 text-[clamp(1.8rem,3vw,2.5rem)] leading-[1.05]">Welcome <em className="accent">back</em>{first ? `, ${first}` : ''}</h1>
            <p className="mt-2 text-sm leading-relaxed text-on-cta/70 sm:text-base">{headline}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={cta.href} className="group inline-flex items-center gap-2 bg-brand px-4 py-2.5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-hover">
                <cta.icon size={15} /> {cta.label}
              </Link>
              {cta.href !== '/igcsc/store' && (
                <Link href="/igcsc/store" className="inline-flex items-center gap-2 border border-on-cta/30 px-4 py-2.5 text-sm font-medium text-on-cta transition-colors hover:border-on-cta hover:bg-on-cta/10">
                  <FiShoppingBag size={15} /> Test papers
                </Link>
              )}
              <Link href="/igcsc/practice" className="inline-flex items-center gap-2 border border-on-cta/30 px-4 py-2.5 text-sm font-medium text-on-cta transition-colors hover:border-on-cta hover:bg-on-cta/10">
                <FiEdit3 size={15} /> Practise
              </Link>
            </div>
          </div>
          <Link href="/igcsc/my-tests" className="group flex flex-shrink-0 items-center gap-4 border border-on-cta/25 px-5 py-4 transition-colors hover:bg-on-cta/10">
            <span className="flex h-11 w-11 items-center justify-center bg-page text-ink"><FiBookOpen size={20} /></span>
            <span>
              <span className="block font-code text-2xl font-medium leading-none tabular-nums">{todo || <FiCheckCircle size={22} />}</span>
              <span className="mt-1 block text-xs text-on-cta/70">
                {todo ? `test${todo === 1 ? '' : 's'} waiting for you` : 'All caught up'}
              </span>
            </span>
            <FiArrowRight size={16} className="text-on-cta/70 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {live.length > 0 && (
        <div className="mb-6 border border-positive/40 bg-positive/5 p-5">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-positive" />
            </span>
            A class is on right now
          </p>
          {live.slice(0, 2).map((m) => (
            <div key={m._id} className="flex flex-wrap items-center justify-between gap-3 py-1">
              <span className="text-sm font-semibold text-ink">{m.title}</span>
              <Link href="/igcsc/meetings"
                className="bg-brand px-4 py-2 text-sm font-medium text-on-brand transition-colors hover:bg-brand-hover">
                Join
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Credits" value={credits} icon={FiKey} tone="text-brand" hint="1 credit = any 1 paper" />
        <Metric label="Papers you can open" value={canOpen} icon={FiBookOpen} tone="text-calm" hint="Bought, assigned or in a plan" />
        <Metric label="Tests marked" value={marked.length} icon={FiAward} tone="text-positive" />
        <Metric label="Average" value={average != null ? `${average}%` : '—'} icon={FiPercent} tone="text-star" hint={pcts.length ? `Across ${pcts.length} paper${pcts.length === 1 ? '' : 's'}` : ''} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {inProgress.length > 0 && (
            <Panel title="Continue where you left off" icon={FiPlayCircle} href="/igcsc/my-tests?tab=progress">
              <div className="divide-y divide-line">
                {inProgress.map((a) => <AttemptRow key={a._id} attempt={a} />)}
              </div>
            </Panel>
          )}

          {allAssigned.length > 0 && (
            <Panel title="Assigned by your tutor" icon={FiSend} href="/igcsc/my-tests?tab=assigned">
              {assigned.length === 0 ? (
                <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted">
                  <FiCheckCircle size={16} className="text-positive" /> All caught up. Nothing waiting for you.
                </p>
              ) : (
                <div className="divide-y divide-line">
                  {assigned.map((a) => <AssignedLine key={a._id} a={a} />)}
                </div>
              )}
            </Panel>
          )}

          <Panel title="Recent paper results" icon={FiAward} href={paperResults.length ? '/igcsc/my-tests?tab=completed' : ''}>
            {paperResults.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-subtle">No marked papers yet. Your results will show up here.</p>
                <Link href="/igcsc/store" className="group mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                  <span className="link-rule">Find a paper to sit</span> <FiArrowRight size={14} className="text-brand transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {paperResults.map((a) => <AttemptRow key={a._id} attempt={a} />)}
              </div>
            )}
          </Panel>

          <Panel title="Question practice" icon={FiEdit3} href="/igcsc/my-results" linkLabel="View all">
            <div className="grid grid-cols-2 gap-3 px-2 pt-1 sm:grid-cols-4 sm:px-3">
              <Stat label="Questions done" value={s.questions ?? 0} icon={FiTarget} tone="text-calm" />
              <Stat label="Accuracy" value={s.accuracy != null ? `${s.accuracy}%` : '—'} icon={FiTrendingUp} tone="text-positive" />
              <Stat label="Attempts" value={s.attempts ?? 0} icon={FiEdit3} tone="text-brand" />
              <Stat label="Last grade" value={s.lastGrade || '—'} icon={FiBarChart2} tone="text-star" />
            </div>
            <div className="mt-3 border-t border-line px-2 pt-2 sm:px-3">
              {recent.length === 0 ? (
                <p className="py-6 text-center text-sm text-subtle">
                  Nothing yet — your first practice set will show up here.
                </p>
              ) : (
                <div className="divide-y divide-line">
                  {recent.map((x) => (
                    <div key={x._id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{x.testTitle || 'Practice'}</p>
                        <p className="font-code text-[11px] text-subtle">{x.completedAt ? new Date(x.completedAt).toLocaleDateString() : ''}</p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span className="font-code text-sm tabular-nums text-muted">{x.correct}/{x.total}</span>
                        <Badge tone={GRADE_TONE[x.grade] || 'slate'}>{x.grade}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {weakest.length > 0 && (
              <div className="mx-2 mb-1 mt-3 border-l-2 border-star bg-star/10 p-4 sm:mx-3">
                <p className="mb-2 text-sm font-semibold text-ink">Worth working on</p>
                <div className="space-y-1.5">
                  {weakest.map((t) => (
                    <div key={t.topic} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-ink-2">{t.topic}</span>
                      <span className="flex-shrink-0 font-code font-semibold tabular-nums text-star">{t.accuracy}%</span>
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
            <div className="border border-line bg-surface p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <FiCheckCircle size={16} className="text-positive" /> Active plans
              </p>
              <ul className="mt-3 space-y-2.5">
                {plans.map((pl) => (
                  <li key={pl._id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="min-w-0 text-sm font-semibold text-ink">{planLabel(pl)}</span>
                    <span className="font-code text-[11px] text-muted">{pl.expiresAt ? `until ${fmtDate(pl.expiresAt)}` : 'no expiry'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link href="/igcsc/store" className="group block bg-cta p-5 text-on-cta">
            <FiStar size={20} className="text-star" />
            <p className="display mt-3 text-[21px]">Unlock more <em className="accent">papers</em></p>
            <p className="mt-1 text-sm text-on-cta/70">
              {credits > 0
                ? `You have ${credits} credit${credits === 1 ? '' : 's'} to spend. Pick any paper you like.`
                : 'Credit packs and plans cost less per paper than buying one at a time.'}
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium">
              Go to the store <FiArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
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
    <div className="border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="font-code text-[11px] uppercase leading-snug tracking-[0.08em] text-muted">{label}</p>
        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center bg-sunken ${tone}`}>
          <Icon size={15} />
        </span>
      </div>
      <p className="mt-2 font-code text-2xl font-medium tabular-nums text-ink sm:text-3xl">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] leading-snug text-subtle">{hint}</p>}
    </div>
  )
}

function Panel({ title, icon: Icon, href, linkLabel = 'View all', children }) {
  return (
    <div className="border border-line bg-surface p-3 sm:p-4">
      <div className="mb-1 flex items-center justify-between gap-3 px-2 pt-1 sm:px-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          {Icon && <Icon size={15} className="text-brand" />} {title}
        </p>
        {href && (
          <Link href={href} className="flex-shrink-0 font-code text-[11px] uppercase tracking-[0.08em] text-brand"><span className="link-rule">{linkLabel}</span> →</Link>
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
    <Link href={href} className="group flex items-center gap-3 px-2 py-3 transition-colors hover:bg-ink/5 sm:px-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{p.title || 'Test paper'}</p>
        {p.unit && <p className="truncate text-xs text-muted">{p.unit}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
          {a.dueAt ? (
            <span className={`inline-flex items-center gap-1 ${overdue ? 'font-semibold text-negative' : 'font-medium text-muted'}`}>
              <FiCalendar size={11} /> {overdue ? 'Overdue, was due' : 'Due'} {fmtDue(a.dueAt)}
            </span>
          ) : (
            <span className="text-subtle">No due date</span>
          )}
          {a.assignedByName && (
            <span className="inline-flex items-center gap-1 text-muted"><FiUser size={11} /> {a.assignedByName}</span>
          )}
        </div>
        {a.note && <p className="mt-1 truncate text-xs italic text-muted">“{a.note}”</p>}
      </div>
      <span className="flex-shrink-0 font-code text-[11px] uppercase tracking-[0.08em] text-brand">{started ? 'Continue' : 'Start'}</span>
      <FiArrowRight size={14} className="flex-shrink-0 text-subtle transition-transform group-hover:translate-x-1" />
    </Link>
  )
}

function Stat({ label, value, icon: Icon, tone }) {
  return (
    <div className="flex items-center gap-3 bg-sunken/50 p-3">
      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center bg-surface ${tone}`}>
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="font-code text-lg font-medium leading-tight tabular-nums text-ink">{value}</p>
        <p className="truncate text-[11px] text-muted">{label}</p>
      </div>
    </div>
  )
}

function Action({ href, icon: Icon, title, hint, primary }) {
  return (
    <Link href={href}
      className={`group flex items-center gap-3 border p-4 transition-colors ${primary
        ? 'border-brand/40 bg-brand-50 hover:bg-brand-soft'
        : 'border-line bg-surface hover:border-line-strong hover:bg-ink/5'}`}>
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center ${primary ? 'bg-brand text-on-brand' : 'bg-sunken text-ink-2'}`}>
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block truncate text-xs text-muted">{hint}</span>
      </span>
      <FiArrowRight size={15} className="flex-shrink-0 text-subtle transition-transform group-hover:translate-x-1" />
    </Link>
  )
}
