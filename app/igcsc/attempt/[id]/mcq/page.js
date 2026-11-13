'use client'
// Section A, the online MCQ, full screen.
//
// The clock is the server's: the countdown runs to the stored deadline,
// corrected by how far this device's clock is from the server's. Every choice
// is saved the moment it is made, one request at a time, and retried with
// backoff until it lands - the choice on screen is never rolled back. At zero
// the section is submitted; if that fails, the server submits it anyway the
// next time the test is opened.
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  FiClock, FiFlag, FiGrid, FiChevronLeft, FiChevronRight, FiChevronUp, FiX, FiCheck,
  FiLoader, FiCloudOff, FiAlertTriangle, FiLogOut, FiSend, FiRefreshCw, FiArrowLeft,
} from 'react-icons/fi'
import { authToken } from '../../../_components/api'
import { renderContent } from '../../../../components/admin/LatexRenderer'
import { siteFontVars } from '../../../../components/siteFonts'

const LETTERS = ['A', 'B', 'C', 'D', 'E']
const FIVE_MIN = 5 * 60 * 1000
const ONE_MIN = 60 * 1000

// This route renders outside the portal layout, so each full-screen surface
// wears the `.ig` paper theme (and the editorial fonts) itself.
const SHELL = `${siteFontVars} ig`

const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 bg-cta px-5 py-2.5 text-sm font-medium text-on-cta transition hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-50'
const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-2 border border-line-strong px-5 py-2.5 text-sm font-medium text-ink transition hover:border-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-50'
const NAV_BTN =
  'inline-flex flex-shrink-0 items-center justify-center gap-1 bg-cta px-4 py-2.5 text-sm font-medium text-on-cta transition hover:bg-cta-hover disabled:cursor-not-allowed disabled:bg-sunken disabled:text-subtle sm:px-7'
const SUBMIT_BTN =
  'inline-flex flex-shrink-0 items-center justify-center gap-1.5 bg-cta px-4 py-2.5 text-sm font-medium text-on-cta transition hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-50 sm:px-7'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// No connection, a busy server or a lapsed sign-in: worth trying again.
// Anything else the server will refuse every time.
const retryable = (status) => status === 0 || status === 401 || status === 408 || status === 429 || status >= 500

// apiSend throws away the status code and the `submitted` flag, and the runner
// needs both to tell "try again" from "this section is over".
async function call(path, method = 'GET', body) {
  // A request on a dead mobile connection can hang for minutes and block every
  // save queued behind it; give up after 15s and let the retry logic take over.
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    const headers = { Authorization: `Bearer ${authToken()}` }
    if (body) headers['Content-Type'] = 'application/json'
    const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', signal: ctrl.signal })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data: data && typeof data === 'object' ? data : {} }
  } catch {
    return { ok: false, status: 0, data: {} }
  } finally {
    clearTimeout(timer)
  }
}

// Only what THIS tab changed since its last save. A time-only save must not
// carry the choice along: a second tab left open with an older choice would
// otherwise overwrite the newer one. The server keeps what is not sent.
function payloadFor(qid, answer, seconds, dirty) {
  const body = { questionId: qid, timeSpent: seconds }
  if (dirty?.selected) body.selected = answer?.selected || ''
  if (dirty?.flagged) body.flagged = !!answer?.flagged
  return body
}

function fmtClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${String(m).padStart(2, '0')}:${s}`
}

export default function McqRunnerPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id || '')
  const apiPath = `/api/igcsc/attempts/${encodeURIComponent(id)}/mcq`
  const hubPath = `/igcsc/attempt/${encodeURIComponent(id)}`

  const [phase, setPhase] = useState('loading')          // loading | error | ready
  const [loadError, setLoadError] = useState({ message: '', retry: false })
  const [reloadKey, setReloadKey] = useState(0)
  const [paper, setPaper] = useState({ title: '', unit: '' })
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})             // qid -> { selected, flagged }
  const [idx, setIdx] = useState(0)
  const [view, setView] = useState('question')           // question | review
  const [navOpen, setNavOpen] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [submitting, setSubmitting] = useState('')       // '' | manual | auto
  const [submitError, setSubmitError] = useState('')
  const [deadlineMs, setDeadlineMs] = useState(null)
  const [offset, setOffset] = useState(0)
  const [saveState, setSaveState] = useState('idle')     // idle | saving | saved | retrying
  const [saveNote, setSaveNote] = useState('')
  const [notice, setNotice] = useState('')

  // Async code (the save queue, the timer, unload handlers) reads these, never
  // a render's stale copy of state.
  const answersRef = useRef({})
  const timeRef = useRef({})                             // qid -> seconds, closed visits only
  const segRef = useRef({ qid: null, start: 0 })         // the visit under way
  const pendingRef = useRef(new Map())                   // qid -> version still to save
  const versionRef = useRef(0)
  const pumpingRef = useRef(false)
  const drainingRef = useRef(false)
  const retryTimerRef = useRef(null)
  const failsRef = useRef(0)
  const stoppedRef = useRef(false)
  // qid -> { selected, flagged }: what this tab has changed and not yet saved.
  const dirtyRef = useRef(new Map())
  const submittingRef = useRef(false)
  const expiredRef = useRef(false)
  const mountedRef = useRef(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    mountedRef.current = true
    stoppedRef.current = false
    return () => {
      mountedRef.current = false
      // A runner left behind must not keep retrying: if the student reopens the
      // test and changes an answer, this old queue would later overwrite it.
      stoppedRef.current = true
      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null }
    }
  }, [])

  // ─── Load (and start the clock - the server does that on the first read) ───
  useEffect(() => {
    if (!id) return undefined
    let cancelled = false
    ;(async () => {
      setPhase('loading')
      const t0 = Date.now()
      const r = await call(apiPath)
      const t1 = Date.now()
      if (cancelled) return
      if (!r.ok) {
        setLoadError({
          message: r.data.error || (r.status === 0 ? 'No connection. Check your internet and try again.' : 'Could not open this test.'),
          retry: retryable(r.status),
        })
        setPhase('error')
        return
      }
      const d = r.data
      if (d.submitted) {
        stoppedRef.current = true
        router.replace(hubPath)
        return
      }
      const qs = Array.isArray(d.questions)
        ? d.questions.filter((q) => q && q._id && Array.isArray(q.options) && q.options.length)
        : []
      if (!qs.length) {
        setLoadError({ message: 'This section has no questions to answer.', retry: false })
        setPhase('error')
        return
      }
      const saved = d.answers && typeof d.answers === 'object' ? d.answers : {}
      const ans = {}
      const times = {}
      for (const q of qs) {
        const a = saved[q._id]
        if (!a || typeof a !== 'object') continue
        ans[q._id] = { selected: typeof a.selected === 'string' ? a.selected : '', flagged: !!a.flagged }
        const t = Number(a.timeSpent)
        if (Number.isFinite(t) && t > 0) times[q._id] = t
      }
      answersRef.current = ans
      timeRef.current = times
      // Half the round trip is the best guess at when the server read its clock.
      const serverNow = Number(d.serverNow)
      setOffset(Number.isFinite(serverNow) ? serverNow - (t0 + t1) / 2 : 0)
      const dl = d.deadline ? new Date(d.deadline).getTime() : NaN
      setDeadlineMs(Number.isFinite(dl) ? dl : null)
      setPaper({ title: d.attempt?.paperTitle || 'Test paper', unit: d.attempt?.paperUnit || '' })
      setAnswers(ans)
      setQuestions(qs)
      // Resuming: pick up at the first question still unanswered.
      const firstOpen = qs.findIndex((q) => !ans[q._id]?.selected)
      setIdx(Object.keys(ans).length && firstOpen > 0 ? firstOpen : 0)
      setView('question')
      setPhase('ready')
    })()
    return () => { cancelled = true }
  }, [id, apiPath, hubPath, router, reloadKey])

  // ─── Saving ───

  const liveSeconds = useCallback((qid) => {
    let t = timeRef.current[qid] || 0
    const seg = segRef.current
    if (seg.qid === qid && seg.start) t += (Date.now() - seg.start) / 1000
    return Math.round(t)
  }, [])

  const leaveToHub = useCallback(() => {
    stoppedRef.current = true
    pendingRef.current.clear()
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null }
    // A save that fails after the student has already left must not yank them back.
    if (mountedRef.current) router.replace(hubPath)
  }, [router, hubPath])

  // One request at a time, oldest change first. An entry leaves the queue only
  // when the server has the version that is on screen now.
  const pump = useCallback(async () => {
    if (pumpingRef.current || stoppedRef.current) return
    pumpingRef.current = true
    try {
      while (pendingRef.current.size && !stoppedRef.current) {
        const [qid, version] = pendingRef.current.entries().next().value
        setSaveState((s) => (s === 'retrying' ? s : 'saving'))
        const r = await call(apiPath, 'PATCH', payloadFor(qid, answersRef.current[qid], liveSeconds(qid), dirtyRef.current.get(qid)))
        if (stoppedRef.current) return
        if (r.ok) {
          if (pendingRef.current.get(qid) === version) {
            pendingRef.current.delete(qid)
            dirtyRef.current.delete(qid)
          }
          failsRef.current = 0
          setSaveNote('')
          setSaveState('saving')
          continue
        }
        // Time is up or the section was submitted elsewhere: nothing more can be saved.
        if (r.status === 409) { leaveToHub(); return }
        if (retryable(r.status)) {
          failsRef.current += 1
          setSaveState('retrying')
          setSaveNote(r.status === 401
            ? 'You have been signed out. Sign in again in another tab — your answers will then save.'
            : r.status === 0 ? 'No connection. Your answers are kept here and will save when it is back.' : '')
          const wait = drainingRef.current ? 1000 : Math.min(30000, 1000 * 2 ** Math.min(5, failsRef.current - 1))
          retryTimerRef.current = setTimeout(() => { retryTimerRef.current = null; pump() }, wait)
          return
        }
        // Refused for good - drop it rather than block every answer behind it.
        if (pendingRef.current.get(qid) === version) pendingRef.current.delete(qid)
        setNotice(r.data.error || 'That answer could not be saved.')
      }
      if (!stoppedRef.current) setSaveState(pendingRef.current.size ? 'saving' : 'saved')
    } finally {
      pumpingRef.current = false
    }
  }, [apiPath, liveSeconds, leaveToHub])

  const queueSave = useCallback((qid) => {
    if (!qid || stoppedRef.current) return
    versionRef.current += 1
    pendingRef.current.set(qid, versionRef.current)
    // A fresh change is a good moment to retry now rather than wait out the backoff.
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null }
    pump()
  }, [pump])

  // Wait for the queue to empty, retrying quickly; false if it did not in time.
  const drain = useCallback(async (maxMs) => {
    const until = Date.now() + maxMs
    drainingRef.current = true
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null }
    try {
      while (pendingRef.current.size && !stoppedRef.current && Date.now() < until) {
        if (!pumpingRef.current && !retryTimerRef.current) pump()
        await sleep(200)
      }
    } finally {
      drainingRef.current = false
    }
    return pendingRef.current.size === 0
  }, [pump])

  // Send the time on the question in view, without leaving it.
  const saveCurrentTime = useCallback(() => {
    const seg = segRef.current
    if (seg.qid && seg.start && Date.now() - seg.start >= 1000) queueSave(seg.qid)
  }, [queueSave])

  const choose = useCallback((qid, letter) => {
    if (submittingRef.current || stoppedRef.current) return
    const prev = answersRef.current[qid] || { selected: '', flagged: false }
    if (prev.selected === letter) return
    const next = { ...answersRef.current, [qid]: { ...prev, selected: letter } }
    answersRef.current = next
    setAnswers(next)
    dirtyRef.current.set(qid, { ...(dirtyRef.current.get(qid) || {}), selected: true })
    queueSave(qid)
  }, [queueSave])

  const toggleFlag = useCallback((qid) => {
    if (submittingRef.current || stoppedRef.current) return
    const prev = answersRef.current[qid] || { selected: '', flagged: false }
    const next = { ...answersRef.current, [qid]: { ...prev, flagged: !prev.flagged } }
    answersRef.current = next
    setAnswers(next)
    dirtyRef.current.set(qid, { ...(dirtyRef.current.get(qid) || {}), flagged: true })
    queueSave(qid)
  }, [queueSave])

  // ─── Time per question: one visit = from showing it until leaving it ───
  const currentQid = phase === 'ready' && view === 'question' ? questions[idx]?._id || null : null
  useEffect(() => {
    if (!currentQid) return undefined
    segRef.current = { qid: currentQid, start: Date.now() }
    return () => {
      const seg = segRef.current
      if (seg.qid !== currentQid || !seg.start) return
      const sec = (Date.now() - seg.start) / 1000
      timeRef.current[currentQid] = (timeRef.current[currentQid] || 0) + sec
      segRef.current = { qid: null, start: 0 }
      if (sec >= 1) queueSave(currentQid)
    }
  }, [currentQid, queueSave])

  // ─── Submitting ───

  const submit = useCallback(async ({ auto = false } = {}) => {
    if (submittingRef.current || stoppedRef.current) return
    submittingRef.current = true
    setConfirmSubmit(false)
    setConfirmExit(false)
    setNavOpen(false)
    setSubmitError('')
    setSubmitting(auto ? 'auto' : 'manual')

    // Out of time, a failed submit still ends at the hub: the server submits
    // the section itself once its grace period has passed. With time left, the
    // student stays and can try again.
    const giveUp = (message) => {
      if (auto || expiredRef.current) { leaveToHub(); return }
      submittingRef.current = false
      setSubmitting('')
      setSubmitError(message)
    }

    saveCurrentTime()
    const saved = await drain(auto ? 10000 : 12000)
    if (stoppedRef.current) return
    if (!saved && !auto && !expiredRef.current) {
      giveUp('Some answers have not reached the server yet. Check your connection, then submit again.')
      return
    }

    const tries = auto ? 5 : 3
    for (let i = 0; i < tries; i += 1) {
      const r = await call(apiPath, 'POST')
      if (stoppedRef.current) return
      if (r.ok || r.status === 409) { leaveToHub(); return }
      if (!retryable(r.status)) { giveUp(r.data.error || 'Could not submit. Please try again.'); return }
      if (i < tries - 1) await sleep(Math.min(8000, 1000 * 2 ** i))
    }
    giveUp('Could not reach the server. Check your connection, then submit again.')
  }, [apiPath, drain, leaveToHub, saveCurrentTime])

  const handleExpire = useCallback(() => {
    expiredRef.current = true
    submit({ auto: true })
  }, [submit])

  const exit = useCallback(async () => {
    if (submittingRef.current || stoppedRef.current) return
    setExiting(true)
    saveCurrentTime()
    const ok = await drain(6000)
    if (stoppedRef.current) return
    if (!ok) {
      setExiting(false)
      setConfirmExit(false)
      setNotice('Some answers have not saved yet. Check your connection, then try again.')
      return
    }
    stoppedRef.current = true
    router.push(hubPath)
  }, [drain, router, hubPath, saveCurrentTime])

  // ─── Navigation ───

  const goNext = useCallback(() => {
    if (view === 'review') return
    if (idx < questions.length - 1) setIdx(idx + 1)
    else setView('review')
  }, [view, idx, questions.length])

  const goBack = useCallback(() => {
    if (view === 'review') { setView('question'); return }
    if (idx > 0) setIdx(idx - 1)
  }, [view, idx])

  const goTo = useCallback((i) => {
    setIdx(Math.max(0, Math.min(questions.length - 1, i)))
    setView('question')
    setNavOpen(false)
  }, [questions.length])

  const openReview = useCallback(() => {
    setView('review')
    setNavOpen(false)
  }, [])

  const closeNav = useCallback(() => setNavOpen(false), [])

  const counts = useMemo(() => {
    let answered = 0
    let flagged = 0
    for (const q of questions) {
      const a = answers[q._id]
      if (a?.selected) answered += 1
      if (a?.flagged) flagged += 1
    }
    return { answered, flagged, unanswered: questions.length - answered }
  }, [questions, answers])

  // ─── Browser glue ───

  useEffect(() => {
    if (phase !== 'ready') return undefined
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (navOpen || confirmSubmit || confirmExit || submitting) return
      const t = e.target
      const tag = t && t.tagName ? String(t.tagName).toLowerCase() : ''
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || (t && t.isContentEditable)) return
      const key = String(e.key || '')
      if (key === 'ArrowRight') { e.preventDefault(); goNext(); return }
      if (key === 'ArrowLeft') { e.preventDefault(); goBack(); return }
      if (view !== 'question' || e.repeat || key.length !== 1) return
      const letter = key.toUpperCase()
      const cq = questions[idx]
      if (cq && LETTERS.includes(letter) && (cq.options || []).some((o) => o.letter === letter)) {
        e.preventDefault()
        choose(cq._id, letter)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, navOpen, confirmSubmit, confirmExit, submitting, view, idx, questions, goNext, goBack, choose])

  // Closing the tab with answers still unsent: warn, and fire them off anyway.
  useEffect(() => {
    const onBefore = (e) => {
      if (stoppedRef.current || !pendingRef.current.size) return undefined
      e.preventDefault()
      e.returnValue = ''
      return ''
    }
    const onHide = () => {
      if (stoppedRef.current || !pendingRef.current.size) return
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` }
      for (const qid of [...pendingRef.current.keys()].slice(0, 20)) {
        try {
          fetch(apiPath, {
            method: 'PATCH',
            keepalive: true,
            headers,
            body: JSON.stringify(payloadFor(qid, answersRef.current[qid], liveSeconds(qid), dirtyRef.current.get(qid))),
          }).catch(() => {})
        } catch { /* the page is going away */ }
      }
    }
    window.addEventListener('beforeunload', onBefore)
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('beforeunload', onBefore)
      window.removeEventListener('pagehide', onHide)
    }
  }, [apiPath, liveSeconds])

  // Back online, or back on the tab: retry now instead of waiting out the backoff.
  useEffect(() => {
    const kick = () => {
      if (stoppedRef.current || !pendingRef.current.size || document.visibilityState === 'hidden') return
      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null }
      pump()
    }
    window.addEventListener('online', kick)
    document.addEventListener('visibilitychange', kick)
    return () => {
      window.removeEventListener('online', kick)
      document.removeEventListener('visibilitychange', kick)
    }
  }, [pump])

  useEffect(() => {
    if (!notice) return undefined
    const t = setTimeout(() => setNotice(''), 6000)
    return () => clearTimeout(t)
  }, [notice])

  useEffect(() => {
    const el = scrollRef.current
    if (el && typeof el.scrollTo === 'function') el.scrollTo({ top: 0 })
  }, [idx, view])

  // ─── Render ───

  if (phase === 'loading') {
    return (
      <div className={`${SHELL} fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 text-muted`}>
        <FiLoader className="animate-spin text-brand" size={30} />
        <p className="font-code text-sm">Preparing your test…</p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className={`${SHELL} fixed inset-0 z-[200] flex items-center justify-center p-4`}>
        <div className="w-full max-w-md border border-line bg-surface p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center bg-[#b4231814] text-negative">
            <FiAlertTriangle size={22} />
          </span>
          <h1 className="display mt-4 text-[1.4rem] leading-snug text-ink">Could not open the test</h1>
          <p className="mt-1 text-sm text-ink-2">{loadError.message}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {loadError.retry && (
              <button type="button" onClick={() => setReloadKey((k) => k + 1)} className={BTN_PRIMARY}>
                <FiRefreshCw size={15} /> Try again
              </button>
            )}
            <button type="button" onClick={() => router.push(hubPath)} className={BTN_SECONDARY}>
              <FiArrowLeft size={15} /> Back to the test
            </button>
          </div>
        </div>
      </div>
    )
  }

  const total = questions.length
  const q = questions[idx]
  const locked = !!submitting
  const onLast = idx >= total - 1

  return (
    <div className={`${SHELL} fixed inset-0 z-[200] flex flex-col`}>
      {/* Top bar */}
      <div className="flex-shrink-0 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink sm:text-base" title={[paper.title, paper.unit].filter(Boolean).join(' — ')}>
              {paper.title}
            </p>
            <p className="truncate font-code text-[10px] uppercase tracking-[0.08em] text-muted sm:text-[11px]">
              {view === 'review' ? 'Review your answers' : `Question ${idx + 1} of ${total}`}
              <span className="hidden sm:inline"> · Section A · Online MCQ</span>
            </p>
          </div>
          {deadlineMs != null && <Countdown deadlineMs={deadlineMs} offset={offset} onExpire={handleExpire} />}
          <div className="flex flex-shrink-0 items-center justify-end gap-1.5 sm:flex-1 sm:gap-3">
            <SaveIndicator state={saveState} />
            <button
              type="button"
              onClick={() => setConfirmExit(true)}
              disabled={locked}
              className="inline-flex items-center gap-1.5 px-2 py-2 text-sm font-medium text-muted transition hover:bg-ink/5 hover:text-ink disabled:opacity-40 sm:px-3"
              title="Save and leave"
            >
              <FiLogOut size={16} /> <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
        {saveState === 'retrying' && (
          <div className="border-t border-line bg-[#b7791f14] px-3 py-1.5 text-center text-[11px] font-medium text-star sm:text-xs" role="status">
            {saveNote || 'Your latest answers are kept on this screen and will save as soon as the server answers.'}
          </div>
        )}
      </div>

      {/* Question or review */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-6 sm:py-8">
          {view === 'question' && q ? (
            <QuestionCard
              q={q}
              pos={idx + 1}
              answer={answers[q._id]}
              onChoose={choose}
              onFlag={toggleFlag}
              locked={locked}
            />
          ) : (
            <ReviewPanel
              questions={questions}
              answers={answers}
              counts={counts}
              onGo={goTo}
              onSubmit={() => setConfirmSubmit(true)}
              error={submitError}
              locked={locked}
            />
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 border-t border-line bg-surface" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-6">
          <button
            type="button"
            onClick={goBack}
            disabled={locked || (view === 'question' && idx === 0)}
            className={NAV_BTN}
          >
            <FiChevronLeft size={16} /> Back
          </button>

          <button
            type="button"
            onClick={() => setNavOpen(true)}
            disabled={locked}
            className="flex min-w-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-2 font-code text-xs text-ink-2 transition chip-hover disabled:opacity-50 sm:px-4"
            aria-label="Show all questions"
          >
            <FiGrid size={14} className="flex-shrink-0" />
            {view === 'review' ? (
              <span className="truncate">All questions</span>
            ) : (
              <>
                <span className="truncate tabular-nums sm:hidden">{idx + 1} / {total}</span>
                <span className="hidden truncate tabular-nums sm:inline">Question {idx + 1} of {total}</span>
              </>
            )}
            <FiChevronUp size={14} className="flex-shrink-0" />
          </button>

          {view === 'review' ? (
            <button type="button" onClick={() => setConfirmSubmit(true)} disabled={locked} className={SUBMIT_BTN}>
              <FiSend size={15} /> Submit<span className="hidden sm:inline"> section</span>
            </button>
          ) : onLast ? (
            <button type="button" onClick={openReview} disabled={locked} className={NAV_BTN}>
              Review <FiChevronRight size={16} />
            </button>
          ) : (
            <button type="button" onClick={goNext} disabled={locked} className={NAV_BTN}>
              Next <FiChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      {navOpen && (
        <NavigatorSheet
          questions={questions}
          answers={answers}
          current={view === 'question' ? idx : -1}
          counts={counts}
          onGo={goTo}
          onReview={openReview}
          onClose={closeNav}
        />
      )}

      {confirmSubmit && (
        <ConfirmDialog
          icon={FiSend}
          title="Submit Section A?"
          confirmLabel="Submit section"
          onCancel={() => setConfirmSubmit(false)}
          onConfirm={() => submit({ auto: false })}
        >
          <p>
            You answered <span className="font-semibold text-ink">{counts.answered} of {total}</span>.
            {counts.unanswered > 0 && <> {counts.unanswered} unanswered — they score zero.</>}
            {counts.flagged > 0 && <> {counts.flagged} still marked for review.</>}
          </p>
          <p className="mt-2">You can&apos;t change your answers after you submit.</p>
        </ConfirmDialog>
      )}

      {confirmExit && (
        <ConfirmDialog
          icon={FiClock}
          title="Leave the test?"
          confirmLabel="Save and leave"
          cancelLabel="Keep going"
          busy={exiting}
          onCancel={() => setConfirmExit(false)}
          onConfirm={exit}
        >
          <p>The timer keeps running while you are away.</p>
          <p className="mt-2">Your answers are saved, so you can come back and finish before the time runs out.</p>
        </ConfirmDialog>
      )}

      {submitting && <SubmittingOverlay auto={submitting === 'auto'} />}

      {notice && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-[230] flex justify-center px-3">
          <div className="pointer-events-auto flex max-w-md items-start gap-2 border border-line-strong bg-cta px-4 py-3 text-sm font-medium text-on-cta" role="alert">
            <FiAlertTriangle className="mt-0.5 flex-shrink-0 text-star" size={16} />
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice('')} className="ml-1 text-on-cta/60 transition-colors hover:text-on-cta" aria-label="Dismiss">
              <FiX size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Pieces (module scope, so they keep their state across renders) ───

// Ticks on its own, so the question - KaTeX and all - is not re-rendered
// twice a second.
function Countdown({ deadlineMs, offset, onExpire }) {
  const [now, setNow] = useState(() => Date.now())
  const firedRef = useRef(false)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [])

  const left = deadlineMs - (now + offset)
  const expired = left <= 0
  useEffect(() => {
    if (expired && onExpire && !firedRef.current) {
      firedRef.current = true
      onExpire()
    }
  }, [expired, onExpire])

  const low = left < FIVE_MIN
  return (
    <div
      role="timer"
      aria-label="Time left"
      className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-code text-sm font-bold tabular-nums sm:text-base ${
        low ? 'border-negative/40 bg-[#b4231814] text-negative' : 'border-line bg-canvas text-ink'
      } ${low && left < ONE_MIN && !expired ? 'animate-pulse' : ''}`}
    >
      <FiClock size={15} className="flex-shrink-0" />
      {fmtClock(left)}
    </div>
  )
}

function SaveIndicator({ state }) {
  if (state === 'saving') {
    return (
      <span className="flex items-center gap-1 font-code text-xs text-muted" role="status">
        <FiLoader className="animate-spin" size={13} /> <span className="hidden sm:inline">Saving…</span>
      </span>
    )
  }
  if (state === 'saved') {
    return (
      <span className="flex items-center gap-1 font-code text-xs text-positive" role="status">
        <FiCheck size={14} /> <span className="hidden sm:inline">Saved</span>
      </span>
    )
  }
  if (state === 'retrying') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-[#b7791f14] px-2 py-1 font-code text-[11px] font-semibold text-star" role="status">
        <FiCloudOff size={13} /> Not saved<span className="hidden sm:inline"> — retrying</span>
      </span>
    )
  }
  return null
}

// Memoised: a save-status change must not re-typeset the question.
const QuestionCard = memo(function QuestionCard({ q, pos, answer, onChoose, onFlag, locked }) {
  const selected = answer?.selected || ''
  const flagged = !!answer?.flagged
  const marks = Number(q.marks) || 1
  return (
    <div className="border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center bg-cta font-code text-base font-bold text-on-cta">{pos}</span>
          <div className="min-w-0">
            <p className="font-code text-xs text-ink-2">[{marks} mark{marks === 1 ? '' : 's'}]</p>
            {q.n && q.n !== pos ? <p className="truncate font-code text-[11px] text-subtle">Question {q.n} on the paper</p> : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onFlag(q._id)}
          disabled={locked}
          aria-pressed={flagged}
          className={`inline-flex flex-shrink-0 items-center gap-1.5 border px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
            flagged ? 'border-star/40 bg-[#b7791f14] text-star' : 'border-transparent text-muted hover:bg-ink/5 hover:text-ink'
          }`}
        >
          <FiFlag size={15} className={flagged ? 'fill-current' : ''} />
          <span className="hidden min-[400px]:inline">{flagged ? 'Marked for review' : 'Mark for review'}</span>
          <span className="min-[400px]:hidden">{flagged ? 'Marked' : 'Mark'}</span>
        </button>
      </div>

      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <div className="overflow-x-auto break-words text-[15px] leading-relaxed text-ink sm:text-base [&_img]:max-w-full">
          {renderContent(String(q.text || ''))}
        </div>
        {q.image ? (
          <div className="mt-4 overflow-hidden border border-line bg-surface p-2">
            <img src={q.image} alt={`Figure for question ${pos}`} className="mx-auto max-h-[420px] max-w-full object-contain" />
          </div>
        ) : null}

        <p className="mb-3 mt-6 font-code text-[11px] uppercase tracking-[0.12em] text-muted">Choose an answer</p>
        <div className="space-y-2.5 sm:space-y-3" role="radiogroup" aria-label={`Answer for question ${pos}`}>
          {(q.options || []).map((o) => {
            const on = selected === o.letter
            return (
              <button
                key={o.letter}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={locked}
                onClick={() => onChoose(q._id, o.letter)}
                className={`group flex w-full items-start gap-3 border p-3 text-left transition disabled:cursor-not-allowed sm:gap-4 sm:p-4 ${
                  on ? 'border-brand bg-brand-50' : 'border-line bg-surface hover:border-line-strong hover:bg-canvas'
                }`}
              >
                <span
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border font-code text-sm font-bold transition ${
                    on ? 'border-brand bg-brand text-on-brand' : 'border-line-strong text-ink-2 group-hover:border-ink'
                  }`}
                >
                  {o.letter}
                </span>
                <div className="min-w-0 flex-1 overflow-x-auto break-words pt-1 text-[15px] leading-relaxed text-ink [&_img]:max-h-40 [&_img]:max-w-full">
                  {renderContent(String(o.text ?? ''))}
                </div>
                {on && <FiCheck className="mt-1.5 flex-shrink-0 text-brand" size={18} />}
              </button>
            )
          })}
        </div>
        <p className="mt-5 hidden font-code text-[11px] text-subtle sm:block">Tip: press a letter key to choose, and ← → to move between questions.</p>
      </div>
    </div>
  )
})

function Legend({ showCurrent = true }) {
  return (
    <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 font-code text-[11px] text-muted">
      <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 bg-cta" /> Answered</span>
      <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 border border-dashed border-line-strong" /> Unanswered</span>
      <span className="flex items-center gap-1.5">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-star text-on-brand"><FiFlag size={8} /></span> For review
      </span>
      {showCurrent && (
        <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 ring-2 ring-ink ring-offset-1 ring-offset-[#faf7f0]" /> Current</span>
      )}
    </div>
  )
}

function QuestionGrid({ questions, answers, current, onGo }) {
  return (
    <div className="grid grid-cols-5 gap-2.5 min-[400px]:grid-cols-6 sm:grid-cols-8">
      {questions.map((q, i) => {
        const a = answers[q._id]
        const done = !!a?.selected
        const flag = !!a?.flagged
        const here = i === current
        return (
          <button
            key={q._id}
            type="button"
            onClick={() => onGo(i)}
            title={`Question ${i + 1}${done ? ' · answered' : ' · unanswered'}${flag ? ' · for review' : ''}`}
            className={`relative flex h-11 items-center justify-center font-code text-sm font-bold transition ${
              done ? 'bg-cta text-on-cta hover:bg-cta-hover' : 'border border-dashed border-line-strong bg-surface text-ink-2 hover:border-ink'
            } ${here ? 'ring-2 ring-ink ring-offset-2 ring-offset-[#faf7f0]' : ''}`}
          >
            {i + 1}
            {flag && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-star text-on-brand ring-2 ring-[#faf7f0]">
                <FiFlag size={10} className="fill-current" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

const TILE_TONES = {
  indigo: 'border-line bg-canvas text-ink',
  rose: 'border-negative/30 bg-[#b4231814] text-negative',
  amber: 'border-star/30 bg-[#b7791f14] text-star',
  slate: 'border-line bg-canvas text-muted',
}

function CountTile({ label, value, tone }) {
  return (
    <div className={`border px-2 py-3 text-center sm:px-4 ${TILE_TONES[tone] || TILE_TONES.slate}`}>
      <p className="font-code text-2xl font-bold tabular-nums sm:text-3xl">{value}</p>
      <p className="mt-0.5 font-code text-[10px] uppercase tracking-[0.12em] opacity-80">{label}</p>
    </div>
  )
}

function ReviewPanel({ questions, answers, counts, onGo, onSubmit, error, locked }) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="border border-line bg-surface p-5 sm:p-6">
        <h2 className="display text-[1.4rem] leading-snug text-ink sm:text-[1.6rem]">Check your <em className="accent">work</em></h2>
        <p className="mt-1 text-sm text-muted">
          Tap a number to go back to that question. Once you submit, you can&apos;t change your answers.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          <CountTile label="Answered" value={counts.answered} tone="indigo" />
          <CountTile label="Unanswered" value={counts.unanswered} tone={counts.unanswered ? 'rose' : 'slate'} />
          <CountTile label="For review" value={counts.flagged} tone={counts.flagged ? 'amber' : 'slate'} />
        </div>
      </div>

      <div className="border border-line bg-surface p-5 sm:p-6">
        <Legend showCurrent={false} />
        <QuestionGrid questions={questions} answers={answers} current={-1} onGo={onGo} />
      </div>

      {error && (
        <div className="flex items-start gap-2 border-l-2 border-negative bg-[#b4231814] px-4 py-3 text-sm font-medium text-negative" role="alert">
          <FiAlertTriangle className="mt-0.5 flex-shrink-0" size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-center pb-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={locked}
          className="inline-flex w-full items-center justify-center gap-2 bg-brand px-6 py-3 text-sm font-medium text-on-brand transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <FiSend size={16} /> Submit section
        </button>
      </div>
    </div>
  )
}

function NavigatorSheet({ questions, answers, current, counts, onGo, onReview, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[210] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="All questions">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-ink/40" />
      <div className="relative flex max-h-[85vh] w-full flex-col border border-line bg-surface sm:max-w-xl">
        <div className="flex-shrink-0 px-5 pt-3 sm:pt-5">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-sunken sm:hidden" />
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="display text-lg leading-snug text-ink">All questions</h3>
              <p className="font-code text-[11px] text-muted">
                {counts.answered} of {questions.length} answered{counts.flagged ? ` · ${counts.flagged} for review` : ''}
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 text-subtle transition-colors hover:bg-ink/5 hover:text-ink" aria-label="Close">
              <FiX size={18} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <Legend showCurrent={current >= 0} />
          <QuestionGrid questions={questions} answers={answers} current={current} onGo={onGo} />
        </div>
        <div className="flex-shrink-0 border-t border-line px-5 pt-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={onReview} className={`${BTN_PRIMARY} w-full`}>
            Go to review page <FiChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmDialog({ icon: Icon = FiAlertTriangle, title, children, confirmLabel, cancelLabel = 'Cancel', busy = false, onCancel, onConfirm }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  return (
    <div className="fixed inset-0 z-[215] flex items-end justify-center bg-ink/60 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md border border-line bg-surface p-6 animate-rise" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <span className="flex h-12 w-12 items-center justify-center bg-brand-50 text-brand">
          <Icon size={22} />
        </span>
        <h3 className="display mt-4 text-[1.4rem] leading-snug text-ink">{title}</h3>
        <div className="mt-2 text-sm text-ink-2">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className={BTN_SECONDARY}>{cancelLabel}</button>
          <button type="button" onClick={onConfirm} disabled={busy} className={BTN_PRIMARY}>
            {busy ? <FiLoader className="animate-spin" size={15} /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function SubmittingOverlay({ auto }) {
  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-ink/95 p-6 text-center" role="alertdialog" aria-live="assertive">
      <div>
        <div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="display text-xl text-on-cta">{auto ? 'Time is up' : 'Submitting your answers…'}</p>
        <p className="mt-1 text-sm text-on-cta/70">
          {auto ? 'Saving and submitting your answers. Please stay on this page.' : 'This takes a moment. Please stay on this page.'}
        </p>
      </div>
    </div>
  )
}
