'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FiPlayCircle, FiSend, FiBookOpen, FiAward, FiCalendar, FiUser, FiMessageSquare, FiShoppingBag,
  FiArrowRight, FiKey, FiCheckCircle, FiCreditCard,
} from 'react-icons/fi'
import { apiGet } from '../_components/api'
import { PageHeader, Loading, ErrorState, EmptyState, Badge } from '../_components/ui'
import {
  PaperCard, AttemptRow, fmtDate, fmtDue, isOverdue, byDueDate, BTN_PRIMARY, BTN_SECONDARY,
} from '../_components/PaperCard'
import { ATTEMPT_STATUS, formatPrice, scopeLabel } from '../../../lib/igcscStoreShared'

const TABS = [
  { id: 'progress', label: 'In progress', icon: FiPlayCircle },
  { id: 'assigned', label: 'Assigned', icon: FiSend },
  { id: 'papers', label: 'My papers', icon: FiBookOpen },
  { id: 'completed', label: 'Completed', icon: FiAward },
]

const ORDER_STATUS = {
  paid: { label: 'Paid', tone: 'green' },
  pending: { label: 'Pending', tone: 'amber' },
  failed: { label: 'Failed', tone: 'red' },
  cancelled: { label: 'Cancelled', tone: 'slate' },
  refunded: { label: 'Refunded', tone: 'violet' },
}

const OPEN_STATES = ['in_progress', 'grading']

function planLabel(pl) {
  if (pl.planName) return pl.planName
  return pl.scope === 'all' ? 'Every paper' : `All ${scopeLabel(pl)} papers`
}

function Panel({ children }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:p-3">{children}</div>
}

function StoreCta({ label = 'Browse test papers' }) {
  return (
    <div className="-mt-6 pb-10 text-center">
      <Link href="/igcsc/store" className={BTN_PRIMARY}>
        <FiShoppingBag size={14} /> {label}
      </Link>
    </div>
  )
}

function AssignmentCard({ a }) {
  const p = a.paper || {}
  const la = a.latestAttempt
  const overdue = isOverdue(a)
  const st = la ? ATTEMPT_STATUS[la.status] : null
  let cta
  if (!la) cta = { href: `/igcsc/papers/${p._id}`, label: 'Start' }
  else if (la.status === 'in_progress') cta = { href: `/igcsc/attempt/${la._id}`, label: 'Continue' }
  else if (la.status === 'grading') cta = { href: `/igcsc/attempt/${la._id}`, label: 'View' }
  else cta = { href: `/igcsc/attempt/${la._id}/result`, label: 'View result' }
  const tags = [p.curriculum, p.subject].filter(Boolean).join(' · ')

  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${overdue ? 'border-rose-200' : 'border-slate-200'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {tags && <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">{tags}</span>}
            {st && <Badge tone={st.tone}>{st.label}</Badge>}
            {la?.percentage != null && (
              <span className="text-xs font-bold text-slate-700">{la.percentage}%{la.grade ? ` · ${la.grade}` : ''}</span>
            )}
          </div>
          <Link href={`/igcsc/papers/${p._id}`} className="mt-2 block break-words text-base font-bold text-slate-900 hover:text-indigo-700">
            {p.title || 'Test paper'}
          </Link>
          {p.unit && <p className="text-sm text-slate-500">{p.unit}</p>}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
            {a.dueAt ? (
              <span className={`inline-flex items-center gap-1.5 ${overdue ? 'font-bold text-rose-600' : 'font-semibold text-slate-700'}`}>
                <FiCalendar size={13} /> {overdue ? 'Overdue, was due' : 'Due'} {fmtDue(a.dueAt)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-slate-400"><FiCalendar size={13} /> No due date</span>
            )}
            {a.assignedByName && (
              <span className="inline-flex items-center gap-1.5 text-slate-500"><FiUser size={13} /> From {a.assignedByName}</span>
            )}
            {a.createdAt && <span className="text-slate-400">Assigned {fmtDate(a.createdAt)}</span>}
          </div>
          {a.note && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
              <FiMessageSquare size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
              <p className="min-w-0 whitespace-pre-line break-words">{a.note}</p>
            </div>
          )}
        </div>
        <Link href={cta.href} className={`${BTN_PRIMARY} flex-shrink-0 py-2.5`}>
          {cta.label} <FiArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}

export default function IgcscMyTestsPage() {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await apiGet('/api/igcsc/store/me'))
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab')
    if (TABS.some((x) => x.id === t)) setTab(t)
    load()
  }, [load])

  const pickTab = (id) => {
    setTab(id)
    try { window.history.replaceState(null, '', `${window.location.pathname}?tab=${id}`) } catch {}
  }

  if (loading && !data) return <Loading label="Loading your tests…" />
  if (error && !data) {
    return (
      <div>
        <PageHeader title="My tests" subtitle="Everything you are sitting, have been set, or own." />
        <ErrorState message={error} />
        <button type="button" onClick={load} className={`${BTN_SECONDARY} mt-3`}>Try again</button>
      </div>
    )
  }

  const attempts = data?.attempts || []
  const progress = attempts.filter((a) => OPEN_STATES.includes(a.status))
  const completed = attempts.filter((a) => !OPEN_STATES.includes(a.status))
  const assignments = [...(data?.assignments || [])].sort(byDueDate)
  const papers = data?.papers || []
  const plans = data?.plans || []
  const orders = data?.orders || []
  const credits = Number(data?.credits || 0)
  const currency = data?.currency || 'usd'
  const counts = { progress: progress.length, assigned: assignments.length, papers: papers.length, completed: completed.length }
  const outstanding = assignments.filter((a) => !a.latestAttempt || a.latestAttempt.status === 'in_progress').length
  const active = tab || (progress.length ? 'progress' : outstanding ? 'assigned' : 'papers')

  return (
    <div>
      <PageHeader
        title="My tests"
        subtitle="Everything you are sitting, have been set, or own."
        actions={(
          <Link href="/igcsc/store" className={BTN_PRIMARY}>
            <FiShoppingBag size={14} /> Browse test papers
          </Link>
        )}
      />

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {TABS.map((t) => {
          const on = active === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => pickTab(t.id)}
              className={`inline-flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition ${on
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <t.icon size={15} /> {t.label}
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${on ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {counts[t.id]}
              </span>
            </button>
          )
        })}
      </div>

      {active === 'progress' && (
        progress.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white">
            <EmptyState icon={FiPlayCircle} title="Nothing in progress" hint="Open a paper you own or one your tutor set, and it will wait for you here." />
            <StoreCta />
          </div>
        ) : (
          <Panel>
            <div className="divide-y divide-slate-100">
              {progress.map((a) => <AttemptRow key={a._id} attempt={a} />)}
            </div>
          </Panel>
        )
      )}

      {active === 'assigned' && (
        assignments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white">
            <EmptyState icon={FiSend} title="No papers assigned yet" hint="When your tutor sets you a paper it shows here, with its due date and any note." />
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((a) => <AssignmentCard key={a._id} a={a} />)}
          </div>
        )
      )}

      {active === 'papers' && (
        <div className="space-y-6">
          {(plans.length > 0 || credits > 0) && (
            <div className="grid gap-4 md:grid-cols-2">
              {plans.length > 0 && (
                <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 p-5">
                  <p className="flex items-center gap-2 text-sm font-bold text-indigo-900"><FiCheckCircle size={16} /> Your plans</p>
                  <ul className="mt-3 space-y-2">
                    {plans.map((pl) => (
                      <li key={pl._id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
                        <span className="min-w-0 font-semibold text-slate-800">{planLabel(pl)}</span>
                        <span className="text-xs text-slate-500">{pl.expiresAt ? `until ${fmtDate(pl.expiresAt)}` : 'no expiry'}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/igcsc/store?owned=1" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:underline">
                    Browse the papers in your plans <FiArrowRight size={14} />
                  </Link>
                </div>
              )}
              {credits > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><FiKey size={16} className="text-indigo-500" /> {credits} credit{credits === 1 ? '' : 's'} to spend</p>
                  <p className="mt-1 text-sm text-slate-500">Each credit unlocks any one paper in the store.</p>
                  <Link href="/igcsc/store" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:underline">
                    Choose a paper <FiArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          )}

          {papers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white">
              <EmptyState
                icon={FiBookOpen}
                title="No papers of your own yet"
                hint={plans.length ? 'Papers in your plans are in the store, ready to open.' : 'Buy a paper or a plan, or use a credit. Your papers stay here.'}
              />
              <StoreCta />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {papers.map((p) => (
                <PaperCard
                  key={p._id}
                  paper={p}
                  currency={currency}
                  credits={credits}
                  onOpen={(x) => router.push(`/igcsc/papers/${x._id}`)}
                />
              ))}
            </div>
          )}

          {orders.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                <FiCreditCard size={15} className="text-slate-400" />
                <h3 className="text-sm font-bold text-slate-800">Purchase history</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {orders.map((o) => {
                  const st = ORDER_STATUS[o.status] || { label: o.status, tone: 'slate' }
                  return (
                    <div key={o._id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{o.title || 'Order'}</p>
                        <p className="text-xs text-slate-400">
                          {fmtDate(o.paidAt || o.createdAt)}{o.kind === 'grant' ? ' · given by your centre' : ''}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{formatPrice(o.amount, o.currency || currency)}</span>
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {active === 'completed' && (
        completed.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white">
            <EmptyState icon={FiAward} title="No marked papers yet" hint="Finish a paper and your mark, grade and feedback will be here." />
          </div>
        ) : (
          <Panel>
            <div className="divide-y divide-slate-100">
              {completed.map((a) => <AttemptRow key={a._id} attempt={a} />)}
            </div>
          </Panel>
        )
      )}
    </div>
  )
}
