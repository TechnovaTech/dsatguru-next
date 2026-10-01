'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FiSearch, FiX, FiBookOpen, FiCheckCircle, FiAlertTriangle, FiLock, FiInfo, FiArrowRight, FiLoader, FiKey,
} from 'react-icons/fi'
import { apiGet, apiGetSafe, apiSend } from '../_components/api'
import { EmptyState, ErrorState } from '../_components/ui'
import { PaperCard, PlanCard, ConfirmDialog, checkout, fmtDate, BTN_SECONDARY } from '../_components/PaperCard'
import { scopeLabel } from '../../../lib/igcscStoreShared'

const PAGE_SIZE = 24
const SUBJECTS_SHOWN = 14
const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Very Hard']
const FORMATS = [
  { value: '', label: 'Any format' },
  { value: 'mcq', label: 'Online MCQ' },
  { value: 'written', label: 'Written' },
  { value: 'mixed', label: 'Mixed' },
]

function catalogUrl(f, page) {
  const sp = new URLSearchParams()
  if (f.curriculum) sp.set('curriculum', f.curriculum)
  if (f.subject) sp.set('subject', f.subject)
  if (f.q) sp.set('q', f.q)
  if (f.difficulty) sp.set('difficulty', f.difficulty)
  if (f.format) sp.set('format', f.format)
  if (f.owned) sp.set('owned', '1')
  sp.set('page', String(page))
  sp.set('limit', String(PAGE_SIZE))
  return `/api/igcsc/store/catalog?${sp.toString()}`
}

function planLabel(pl) {
  if (pl.planName) return pl.planName
  return pl.scope === 'all' ? 'Every paper' : `All ${scopeLabel(pl)} papers`
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${active
        ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100'}`}
    >
      {children}
    </button>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active
        ? 'border-indigo-600 bg-indigo-600 text-white'
        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700'}`}
    >
      {children}
    </button>
  )
}

function Banner({ tone, icon: Icon, children, onClose }) {
  const tones = {
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    red: 'border-rose-200 bg-rose-50 text-rose-800',
    slate: 'border-slate-200 bg-slate-100 text-slate-700',
  }
  return (
    <div className={`mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${tones[tone] || tones.slate}`}>
      <Icon size={18} className="mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} className="flex-shrink-0 rounded-lg p-1 opacity-60 hover:bg-black/5 hover:opacity-100" aria-label="Dismiss">
          <FiX size={16} />
        </button>
      )}
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
          <div className="h-5 w-32 rounded-full bg-slate-100" />
          <div className="mt-4 h-5 w-3/4 rounded bg-slate-100" />
          <div className="mt-2 h-4 w-1/2 rounded bg-slate-100" />
          <div className="mt-4 h-3 w-2/3 rounded bg-slate-100" />
          <div className="mt-10 h-9 w-full rounded-xl bg-slate-100" />
        </div>
      ))}
    </div>
  )
}

export default function IgcscStorePage() {
  const router = useRouter()

  const [plansData, setPlansData] = useState(null)
  const [me, setMe] = useState(null)
  const [credits, setCredits] = useState(null)

  const [ready, setReady] = useState(false)
  const [curriculum, setCurriculum] = useState('')
  const [subject, setSubject] = useState('')
  const [query, setQuery] = useState('')
  const [q, setQ] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [format, setFormat] = useState('')
  const [owned, setOwned] = useState(false)
  const [allSubjects, setAllSubjects] = useState(false)

  const [papers, setPapers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [facets, setFacets] = useState([])
  const [currency, setCurrency] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [cancelled, setCancelled] = useState(false)
  const [notice, setNotice] = useState(null)      // { tone: 'green' | 'red', text, href? }
  const [busy, setBusy] = useState(null)          // { id, action }
  const [redeemFor, setRedeemFor] = useState(null)

  const seq = useRef(0)
  const acting = useRef(false)

  // Read once on arrival. Not useSearchParams: on a static page that needs a
  // Suspense boundary or the build fails.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('cancelled') === '1') setCancelled(true)
    if (sp.get('owned') === '1') setOwned(true)
    setReady(true)
  }, [])

  // /store/me also settles any payment whose return trip never happened.
  const loadSide = useCallback(async () => {
    const [pl, m] = await Promise.all([
      apiGetSafe('/api/igcsc/store/plans', null),
      apiGetSafe('/api/igcsc/store/me', null),
    ])
    if (pl) setPlansData(pl)
    if (m) {
      setMe(m)
      setCredits(Number(m.credits || 0))
      // A payment settled just now: the cards on screen predate it.
      if (Number(m.reconciled) > 0) setReloadKey((k) => k + 1)
    }
  }, [])

  useEffect(() => { loadSide() }, [loadSide])

  useEffect(() => {
    const t = setTimeout(() => setQ(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  // Coming back from Stripe with the browser's back button restores this page
  // as it was left: mid-purchase, with a spinning button.
  useEffect(() => {
    const onShow = (e) => {
      if (e.persisted) {
        acting.current = false
        setBusy(null)
      }
    }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, [])

  const load = async (pageNo, append) => {
    const my = ++seq.current
    if (append) setLoadingMore(true)
    else {
      setLoading(true)
      setError('')
    }
    try {
      const r = await apiGet(catalogUrl({ curriculum, subject, q, difficulty, format, owned }, pageNo))
      if (my !== seq.current) return
      const list = Array.isArray(r.papers) ? r.papers : []
      setPapers((prev) => {
        if (!append) return list
        const seen = new Set(prev.map((x) => x._id))
        return [...prev, ...list.filter((x) => !seen.has(x._id))]
      })
      setTotal(Number(r.total || 0))
      setPage(Number(r.page || pageNo))
      setPages(Number(r.pages || 1))
      if (Array.isArray(r.facets)) setFacets(r.facets)
      if (r.currency) setCurrency(r.currency)
      if (r.credits != null) setCredits(Number(r.credits))
    } catch (e) {
      if (my !== seq.current) return
      if (append) setNotice({ tone: 'red', text: e.message })
      else setError(e.message)
    } finally {
      if (my === seq.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }

  useEffect(() => {
    if (!ready) return
    load(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, curriculum, subject, q, difficulty, format, owned, reloadKey])

  const refresh = () => {
    loadSide()
    setReloadKey((k) => k + 1)
  }

  const buy = async (body, id) => {
    if (acting.current) return
    acting.current = true
    setBusy({ id, action: 'buy' })
    setNotice(null)
    let leaving = false
    try {
      const r = await checkout(body)
      if (r === 'redirect') {
        leaving = true
        return
      }
      setNotice({ tone: 'green', text: 'Done. It is on your account now.', href: '/igcsc/my-tests?tab=papers' })
      refresh()
    } catch (e) {
      setNotice({ tone: 'red', text: e.message })
    } finally {
      if (!leaving) {
        acting.current = false
        setBusy(null)
      }
    }
  }

  const confirmRedeem = async () => {
    const p = redeemFor
    if (!p || acting.current) return
    acting.current = true
    setBusy({ id: p._id, action: 'redeem' })
    setNotice(null)
    try {
      const r = await apiSend('/api/igcsc/store/redeem', 'POST', { paperId: String(p._id) })
      if (r?.credits != null) setCredits(Number(r.credits))
      setPapers((prev) => prev.map((x) => (
        x._id === p._id ? { ...x, access: { allowed: true, via: 'credit', expiresAt: null } } : x
      )))
      setNotice({ tone: 'green', text: `${p.title} is unlocked. Start it whenever you are ready.`, href: `/igcsc/papers/${p._id}` })
      loadSide()
    } catch (e) {
      setNotice({ tone: 'red', text: e.message })
    } finally {
      setRedeemFor(null)
      acting.current = false
      setBusy(null)
    }
  }

  const dismissCancelled = () => {
    setCancelled(false)
    try { window.history.replaceState(null, '', window.location.pathname) } catch {}
  }

  const pickCurriculum = (c) => {
    setCurriculum(c)
    setSubject('')
    setAllSubjects(false)
  }

  const clearFilters = () => {
    pickCurriculum('')
    setQuery('')
    setQ('')
    setDifficulty('')
    setFormat('')
    setOwned(false)
  }

  const storeOpen = plansData ? !!plansData.storeOpen : true
  const plans = plansData?.plans || []
  const cur = currency || plansData?.currency || 'usd'
  const activePlans = me?.plans || []
  const totalPapers = facets.reduce((a, f) => a + (f.subjects || []).reduce((b, s) => b + Number(s.papers || 0), 0), 0)
  const subjects = facets.find((f) => f.curriculum === curriculum)?.subjects || []
  const shownSubjects = allSubjects ? subjects : subjects.filter((s, i) => i < SUBJECTS_SHOWN || s.subject === subject)
  const filtered = !!(curriculum || subject || q || difficulty || format || owned)
  const creditCount = credits ?? 0

  return (
    <div>
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-600 px-5 py-7 text-white shadow-lg sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-24 right-32 h-48 w-48 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100">IGCSC test papers</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Real exam papers, marked for you.</h1>
            <p className="mt-2 text-sm leading-relaxed text-indigo-100 sm:text-base">
              {totalPapers ? `${totalPapers.toLocaleString()} papers` : 'Papers'} across every subject. Multiple choice is marked the
              moment you finish. Written answers are marked by AI and checked by a tutor.
            </p>
            {activePlans.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {activePlans.map((pl) => (
                  <span key={pl._id} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25">
                    <FiCheckCircle size={12} className="flex-shrink-0" />
                    <span className="truncate">{planLabel(pl)} · {pl.expiresAt ? `until ${fmtDate(pl.expiresAt)}` : 'no expiry'}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-stretch gap-3">
            <div className="rounded-2xl bg-white/15 px-5 py-3 ring-1 ring-white/25">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-100">
                <FiKey size={12} /> Your credits
              </p>
              <p className="mt-0.5 text-2xl font-extrabold">{credits == null ? '—' : credits}</p>
              <p className="text-[11px] text-indigo-100">1 credit unlocks any 1 paper</p>
            </div>
            <Link href="/igcsc/my-tests" className="inline-flex items-center gap-2 self-center rounded-xl bg-white px-4 py-3 text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50">
              <FiBookOpen size={15} /> My tests
            </Link>
          </div>
        </div>
      </section>

      {cancelled && (
        <Banner tone="amber" icon={FiInfo} onClose={dismissCancelled}>
          <span className="font-semibold">Payment cancelled</span> — nothing was charged.
        </Banner>
      )}
      {!storeOpen && (
        <Banner tone="slate" icon={FiLock}>
          <span className="font-semibold">The store is closed right now.</span> You can still open the papers you have,
          use your credits, and sit anything your tutor assigns.
        </Banner>
      )}
      {notice && (
        <Banner tone={notice.tone} icon={notice.tone === 'green' ? FiCheckCircle : FiAlertTriangle} onClose={() => setNotice(null)}>
          {notice.text}
          {notice.href && (
            <Link href={notice.href} className="ml-2 inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline">
              Open <FiArrowRight size={13} />
            </Link>
          )}
        </Banner>
      )}

      {plans.length > 0 && (
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Plans & credit packs</h2>
            <p className="text-sm text-slate-500">Buying more than one paper? These cost less per paper.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {plans.map((pl) => (
              <PlanCard
                key={pl._id}
                plan={pl}
                currency={cur}
                storeOpen={storeOpen}
                busy={busy?.id === pl._id}
                onBuy={(x) => buy({ planId: String(x._id) }, x._id)}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Browse papers</h2>
          <p className="text-sm text-slate-500">Pick a curriculum and subject, or search for a topic.</p>
        </div>

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex gap-1 overflow-x-auto pb-1">
            <TabButton active={!curriculum} onClick={() => pickCurriculum('')}>All</TabButton>
            {facets.map((f) => (
              <TabButton key={f.curriculum} active={curriculum === f.curriculum} onClick={() => pickCurriculum(f.curriculum)}>
                {f.curriculum}
              </TabButton>
            ))}
          </div>

          {subjects.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 px-1">
              <Chip active={!subject} onClick={() => setSubject('')}>All subjects</Chip>
              {shownSubjects.map((s) => (
                <Chip key={s.subject} active={subject === s.subject} onClick={() => setSubject(s.subject)}>
                  {s.subject}
                  <span className={subject === s.subject ? 'text-indigo-200' : 'text-slate-400'}>{s.papers}</span>
                </Chip>
              ))}
              {subjects.length > SUBJECTS_SHOWN && (
                <button type="button" onClick={() => setAllSubjects((v) => !v)} className="px-2 text-xs font-semibold text-indigo-600 hover:underline">
                  {allSubjects ? 'Show fewer' : `Show all ${subjects.length}`}
                </button>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 px-1 pt-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <FiSearch size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by paper, unit or topic"
                maxLength={100}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-9 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-600" aria-label="Clear search">
                  <FiX size={15} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                aria-label="Difficulty"
              >
                <option value="">Any difficulty</option>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                aria-label="Format"
              >
                {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <button
                type="button"
                role="switch"
                aria-checked={owned}
                onClick={() => setOwned((v) => !v)}
                className={`col-span-2 inline-flex items-center justify-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition ${owned
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <span className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors ${owned ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${owned ? 'left-[18px]' : 'left-0.5'}`} />
                </span>
                Only mine
              </button>
            </div>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-sm text-slate-500">
            {loading ? 'Finding papers…' : (
              <>
                <span className="font-bold text-slate-800">{total.toLocaleString()}</span> paper{total === 1 ? '' : 's'}
                {owned ? ' you can open' : ''}
              </>
            )}
          </p>
          {filtered && (
            <button type="button" onClick={clearFilters} className="text-xs font-semibold text-indigo-600 hover:underline">
              Clear filters
            </button>
          )}
        </div>

        {error ? (
          <div className="space-y-3">
            <ErrorState message={error} />
            <button type="button" onClick={() => setReloadKey((k) => k + 1)} className={BTN_SECONDARY}>Try again</button>
          </div>
        ) : loading ? (
          <SkeletonGrid />
        ) : papers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white">
            <EmptyState
              icon={owned ? FiBookOpen : FiSearch}
              title={owned && !filtered ? 'You have no papers yet' : 'No papers match'}
              hint={owned
                ? 'Buy a paper, use a credit, or ask your tutor to assign one. It will show here.'
                : 'Try another subject, a shorter search, or clear the filters.'}
            />
            {filtered && (
              <div className="-mt-8 pb-10 text-center">
                <button type="button" onClick={clearFilters} className={BTN_SECONDARY}>Clear filters</button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {papers.map((p) => (
                <PaperCard
                  key={p._id}
                  paper={p}
                  currency={cur}
                  credits={creditCount}
                  storeOpen={storeOpen}
                  busy={busy ? (busy.id === p._id ? busy.action : true) : ''}
                  onBuy={(x) => buy({ paperId: String(x._id) }, x._id)}
                  onRedeem={(x) => setRedeemFor(x)}
                  onOpen={(x) => router.push(`/igcsc/papers/${x._id}`)}
                />
              ))}
            </div>
            {page < pages && (
              <div className="mt-8 flex flex-col items-center gap-2">
                <button type="button" onClick={() => load(page + 1, true)} disabled={loadingMore} className={`${BTN_SECONDARY} px-6 py-2.5`}>
                  {loadingMore ? <FiLoader className="animate-spin" size={14} /> : null}
                  {loadingMore ? 'Loading…' : 'Load more papers'}
                </button>
                <p className="text-xs text-slate-400">Showing {papers.length.toLocaleString()} of {total.toLocaleString()}</p>
              </div>
            )}
          </>
        )}
      </section>

      {redeemFor && (
        <ConfirmDialog
          title="Use 1 credit?"
          confirmLabel="Use 1 credit"
          busy={busy?.action === 'redeem'}
          onConfirm={confirmRedeem}
          onCancel={() => setRedeemFor(null)}
        >
          <p>
            Unlock <span className="font-semibold text-slate-900">{redeemFor.title}</span>
            {redeemFor.unit ? ` — ${redeemFor.unit}` : ''}. It stays yours, and you can sit it as often as you like.
          </p>
          <p className="mt-2 text-slate-500">
            You have {creditCount} credit{creditCount === 1 ? '' : 's'}. {Math.max(0, creditCount - 1)} left after this.
          </p>
        </ConfirmDialog>
      )}
    </div>
  )
}
