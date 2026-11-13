'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  FiArrowLeft, FiEdit3, FiAward, FiZap, FiPrinter, FiCamera, FiCpu, FiPlay, FiKey, FiShoppingCart,
  FiLoader, FiLock, FiAlertTriangle, FiCheckCircle, FiMonitor, FiX, FiShield, FiLayers,
} from 'react-icons/fi'
import { apiGet, apiSend } from '../../_components/api'
import { Loading, ErrorState } from '../../_components/ui'
import {
  ConfirmDialog, AttemptRow, Chip, checkout, fmtDate, paperMinutes, DIFFICULTY_TONE, BTN_PRIMARY, BTN_SECONDARY,
} from '../../_components/PaperCard'
import { formatPrice, VIA_LABEL } from '../../../../lib/igcscStoreShared'

// The three steps, told for the kind of paper this is.
function stepsFor(p) {
  const mcq = p.mcqCount > 0
  const written = p.writtenCount > 0
  if (mcq && written) {
    return [
      { icon: FiMonitor, title: 'Answer the MCQs online', text: `${p.mcqCount} timed questions. Every answer saves as you go.` },
      { icon: FiPrinter, title: 'Write the rest on paper', text: 'Print the written section, answer by hand, then photograph and upload your pages.' },
      { icon: FiAward, title: 'Get one combined result', text: 'MCQs are marked instantly. AI marks your written answers and a tutor checks anything it is unsure of.' },
    ]
  }
  if (mcq) {
    return [
      { icon: FiPlay, title: 'Start when you are ready', text: 'The clock only starts when you open the questions.' },
      { icon: FiMonitor, title: 'Answer online', text: `${p.mcqCount} questions in ${p.mcqDurationMin || paperMinutes(p)} minutes. Every answer saves as you go.` },
      { icon: FiZap, title: 'Instant result', text: 'Your mark and grade the moment you submit.' },
    ]
  }
  return [
    { icon: FiPrinter, title: 'Print the paper', text: 'Answer by hand, the way you will in the real exam.' },
    { icon: FiCamera, title: 'Photograph your answers', text: 'Upload a clear photo of every page, straight from your phone.' },
    { icon: FiCpu, title: 'AI-marked, tutor-checked', text: 'Marked against the mark scheme. Anything the AI is unsure of goes to a tutor.' },
  ]
}

function Fact({ label, value }) {
  return (
    <div className="bg-surface px-4 py-3">
      <p className="font-code text-[11px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-0.5 font-code text-lg tabular-nums leading-tight text-ink">{value}</p>
    </div>
  )
}

function SectionTile({ icon: Icon, label, tone, children }) {
  const tones = {
    indigo: 'text-brand',
    blue: 'text-calm',
  }
  return (
    <div className="border border-line bg-canvas p-5">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center border border-line bg-surface ${tones[tone] || tones.indigo}`}>
          <Icon size={18} />
        </span>
        <p className="text-sm font-medium text-ink">{label}</p>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-ink-2">{children}</ul>
    </div>
  )
}

function Line({ children }) {
  return (
    <li className="flex items-start gap-2">
      <FiCheckCircle size={15} className="mt-0.5 flex-shrink-0 text-positive" />
      <span className="min-w-0">{children}</span>
    </li>
  )
}

export default function IgcscPaperPage() {
  const params = useParams()
  const id = String(params?.id || '')
  const router = useRouter()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')            // '' | 'buy' | 'redeem' | 'start'
  const [confirmRedeem, setConfirmRedeem] = useState(false)
  const [notice, setNotice] = useState(null)      // { tone: 'green' | 'red', text }
  const acting = useRef(false)

  const load = useCallback(async () => {
    try {
      const r = await apiGet(`/api/igcsc/store/papers/${encodeURIComponent(id)}`)
      setData(r)
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  // Back from Stripe via the back button: the page comes back mid-purchase.
  useEffect(() => {
    const onShow = (e) => {
      if (e.persisted) {
        acting.current = false
        setBusy('')
      }
    }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, [])

  // One action at a time; a function returning 'leave' is navigating away, so
  // its button keeps spinning.
  const run = async (action, fn) => {
    if (acting.current) return
    acting.current = true
    setBusy(action)
    setNotice(null)
    let leaving = false
    try {
      leaving = (await fn()) === 'leave'
    } catch (e) {
      setNotice({ tone: 'red', text: e.message })
    } finally {
      if (!leaving) {
        acting.current = false
        setBusy('')
      }
    }
  }

  const buy = () => run('buy', async () => {
    const r = await checkout({ paperId: id })
    if (r === 'redirect') return 'leave'
    await load()
    return ''
  })

  const redeem = () => run('redeem', async () => {
    try {
      await apiSend('/api/igcsc/store/redeem', 'POST', { paperId: id })
    } finally {
      setConfirmRedeem(false)
    }
    setNotice({ tone: 'green', text: 'Unlocked with 1 credit. Start whenever you are ready.' })
    await load()
    return ''
  })

  const start = () => run('start', async () => {
    const r = await apiSend('/api/igcsc/attempts', 'POST', { paperId: id })
    const attemptId = r?.attempt?._id
    if (!attemptId) throw new Error('Could not open the test. Please try again.')
    router.push(`/igcsc/attempt/${attemptId}`)
    return 'leave'
  })

  if (loading) return <Loading label="Loading paper…" />

  if (error || !data?.paper) {
    return (
      <div className="mx-auto max-w-xl">
        <Link href="/igcsc/store" className="mb-4 inline-flex items-center gap-1.5 font-code text-xs uppercase tracking-[0.08em] text-muted transition hover:text-brand">
          <FiArrowLeft size={15} /> All test papers
        </Link>
        <ErrorState message={error || 'That paper was not found.'} />
      </div>
    )
  }

  const p = data.paper
  const access = data.access || p.access || {}
  const allowed = !!access.allowed
  const credits = Number(data.credits || 0)
  const currency = data.currency || 'usd'
  const storeOpen = !!data.storeOpen
  const attempts = Array.isArray(data.attempts) ? data.attempts : []
  const open = attempts.find((a) => a.status === 'in_progress')
  const minutes = paperMinutes(p)
  const mcq = p.mcqCount > 0
  const written = p.writtenCount > 0
  const formatLabel = mcq && written ? 'MCQ + written' : mcq ? 'Online MCQ' : 'Written'
  const startLabel = open ? 'Continue' : attempts.length ? 'Sit it again' : 'Start'
  const tags = [p.curriculum, p.subject].filter(Boolean).join(' · ')

  return (
    <div>
      <Link href="/igcsc/store" className="mb-4 inline-flex items-center gap-1.5 font-code text-xs uppercase tracking-[0.08em] text-muted transition hover:text-brand">
        <FiArrowLeft size={15} /> All test papers
      </Link>

      <section className="mb-6 border-b border-line pb-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {tags && <span className="font-code text-[11px] uppercase tracking-[0.12em] text-muted">{tags}</span>}
          {p.difficulty && <Chip tone={DIFFICULTY_TONE[p.difficulty] || 'slate'}>{p.difficulty}</Chip>}
          {allowed && (
            <Chip tone="green"><FiCheckCircle size={12} /> {VIA_LABEL[access.via] || 'Unlocked'}</Chip>
          )}
        </div>
        <h1 className="display mt-3 break-words text-[clamp(1.7rem,3vw,2.4rem)] leading-tight text-ink">{p.title || 'Test paper'}</h1>
        {p.unit && <p className="mt-1 text-base text-ink-2">{p.unit}</p>}
        <div className="mt-6 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
          <Fact label="Questions" value={(p.mcqCount || 0) + (p.writtenCount || 0) || p.questionCount || 0} />
          <Fact label="Marks" value={p.totalMarks || '—'} />
          <Fact label="Minutes" value={minutes || '—'} />
          <Fact label="Format" value={formatLabel} />
        </div>
      </section>

      {notice && (
        <div className={`mb-5 flex items-start gap-3 border px-4 py-3 text-sm ${notice.tone === 'green'
          ? 'border-positive/40 bg-[#2f7d4514] text-positive'
          : 'border-negative/40 bg-[#b4231814] text-negative'}`}>
          {notice.tone === 'green' ? <FiCheckCircle size={18} className="mt-0.5 flex-shrink-0" /> : <FiAlertTriangle size={18} className="mt-0.5 flex-shrink-0" />}
          <span className="min-w-0 flex-1">{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="flex-shrink-0 p-1 opacity-60 transition hover:opacity-100" aria-label="Dismiss">
            <FiX size={16} />
          </button>
        </div>
      )}

      {p.holdReason && (
        <div className="mb-5 border border-star/40 bg-[#b7791f14] px-4 py-3 text-sm text-star">
          <span className="font-semibold">Held back from sale (staff only):</span> {p.holdReason}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <aside className="lg:order-2">
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="border border-line bg-surface p-5 sm:p-6">
              {allowed ? (
                <>
                  <div className="flex items-center gap-2 text-positive">
                    <FiCheckCircle size={18} />
                    <span className="text-sm font-medium">{access.via === 'free' ? 'Free to sit' : 'You have this paper'}</span>
                  </div>
                  <p className="mt-1 font-code text-[11px] text-muted">
                    {access.via && access.via !== 'free' ? VIA_LABEL[access.via] : 'No payment needed'}
                    {access.expiresAt ? ` · until ${fmtDate(access.expiresAt)}` : ''}
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-ink-2">
                    {open
                      ? 'You have an attempt in progress. Pick up where you left off.'
                      : mcq
                        ? 'Ready when you are. The timer starts only when you open the MCQ section.'
                        : 'Ready when you are. Print it, answer by hand, then upload photos of your pages.'}
                  </p>
                  <button type="button" onClick={start} disabled={!!busy} className={`${BTN_PRIMARY} mt-5 w-full py-3 text-base`}>
                    {busy === 'start' ? <FiLoader className="animate-spin" size={16} /> : <FiPlay size={16} />} {startLabel}
                  </button>
                </>
              ) : p.isPublished ? (
                <>
                  <p className="font-code text-[11px] uppercase tracking-[0.12em] text-muted">Price</p>
                  <p className="mt-1 font-code text-4xl tabular-nums tracking-tight text-ink">{formatPrice(p.price, currency)}</p>
                  <p className="mt-1 text-xs text-muted">One payment. Yours to keep, and sit as often as you like.</p>
                  {!storeOpen && (
                    <div className="mt-4 flex items-start gap-2 bg-sunken px-3 py-2.5 text-xs font-medium text-ink-2">
                      <FiLock size={14} className="mt-0.5 flex-shrink-0" /> The store is closed right now. Check back soon.
                    </div>
                  )}
                  <div className="mt-5 space-y-2">
                    {credits > 0 && (
                      <button type="button" onClick={() => setConfirmRedeem(true)} disabled={!!busy} className={`${BTN_PRIMARY} w-full py-3`}>
                        {busy === 'redeem' ? <FiLoader className="animate-spin" size={15} /> : <FiKey size={15} />}
                        Use 1 credit <span className="font-code font-normal text-on-cta/70">({credits} left)</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={buy}
                      disabled={!!busy || !storeOpen}
                      className={`${credits > 0 ? BTN_SECONDARY : BTN_PRIMARY} w-full py-3`}
                    >
                      {busy === 'buy' ? <FiLoader className="animate-spin" size={15} /> : <FiShoppingCart size={15} />}
                      Buy <span className="font-code tabular-nums">{formatPrice(p.price, currency)}</span>
                    </button>
                  </div>
                  <p className="mt-3 flex items-center justify-center gap-1.5 font-code text-[11px] text-subtle">
                    <FiShield size={12} /> Secure card payment by Stripe
                  </p>
                  <div className="mt-4 border-t border-line pt-4 text-xs leading-relaxed text-muted">
                    Buying several?{' '}
                    <Link href="/igcsc/store" className="link-rule font-medium text-brand">Plans and credit packs</Link>{' '}
                    cost less per paper. Your tutor can also assign it to you.
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center bg-sunken text-muted"><FiLock size={22} /></span>
                  <p className="mt-3 text-sm font-medium text-ink">Not on sale right now</p>
                  <p className="mt-1 text-xs text-muted">Ask your tutor if you need this paper.</p>
                </div>
              )}
            </div>

            {!allowed && credits > 0 && (
              <div className="flex items-center gap-3 border border-line bg-brand-50 px-4 py-3 text-xs text-ink-2">
                <FiLayers size={16} className="flex-shrink-0 text-brand" />
                You have <span className="font-code tabular-nums">{credits}</span> credit{credits === 1 ? '' : 's'}. One credit unlocks this paper.
              </div>
            )}
          </div>
        </aside>

        <div className="space-y-6 lg:order-1 lg:col-span-2">
          <section className="border border-line bg-surface p-5 sm:p-6">
            <h2 className="display text-xl text-ink">What&apos;s <em className="accent">inside</em></h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {mcq && (
                <SectionTile icon={FiMonitor} label="Section A · Online MCQ" tone="indigo">
                  <Line>{p.mcqCount} multiple-choice question{p.mcqCount === 1 ? '' : 's'}</Line>
                  <Line>{p.mcqDurationMin || minutes} minutes, timed on screen</Line>
                  <Line>Marked instantly when you submit</Line>
                </SectionTile>
              )}
              {written && (
                <SectionTile icon={FiEdit3} label={mcq ? 'Section B · Written' : 'Written paper'} tone="blue">
                  <Line>{p.writtenCount} written question{p.writtenCount === 1 ? '' : 's'}{!mcq && p.totalMarks ? `, ${p.totalMarks} marks` : ''}</Line>
                  <Line>Print, answer by hand, photograph your pages</Line>
                  <Line>AI-marked against the mark scheme, checked by a tutor when unsure</Line>
                </SectionTile>
              )}
            </div>
            {!mcq && !written && (
              <p className="mt-2 text-sm text-muted">This paper has no questions that can be marked yet.</p>
            )}
          </section>

          <section className="border border-line bg-surface p-5 sm:p-6">
            <h2 className="display text-xl text-ink">How it <em className="accent">works</em></h2>
            <ol className="mt-4 grid gap-4 sm:grid-cols-3">
              {stepsFor(p).map((s, i) => (
                <li key={s.title} className="relative border border-line bg-canvas p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-cta font-code text-xs text-on-cta">
                      {i + 1}
                    </span>
                    <s.icon size={16} className="text-brand" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-ink">{s.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{s.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="border border-line bg-surface p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="display text-xl text-ink">My attempts</h2>
              {attempts.length > 0 && <Chip tone="slate">{attempts.length}</Chip>}
            </div>
            {attempts.length === 0 ? (
              <p className="py-8 text-center text-sm text-subtle">
                No attempts yet.{allowed ? ' Press Start when you are ready.' : ''}
              </p>
            ) : (
              <div className="mt-2 divide-y divide-line">
                {attempts.map((a) => <AttemptRow key={a._id} attempt={a} showPaper={false} />)}
              </div>
            )}
          </section>
        </div>
      </div>

      {confirmRedeem && (
        <ConfirmDialog
          title="Use 1 credit?"
          confirmLabel="Use 1 credit"
          busy={busy === 'redeem'}
          onConfirm={redeem}
          onCancel={() => setConfirmRedeem(false)}
        >
          <p>
            Unlock <span className="font-medium text-ink">{p.title}</span>{p.unit ? ` — ${p.unit}` : ''}.
            It stays yours, and you can sit it as often as you like.
          </p>
          <p className="mt-2 text-muted">
            You have {credits} credit{credits === 1 ? '' : 's'}. {Math.max(0, credits - 1)} left after this.
          </p>
        </ConfirmDialog>
      )}
    </div>
  )
}
