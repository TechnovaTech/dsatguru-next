'use client'
// Section B: print the written questions, answer by hand, photograph every page
// and send the photos for marking. Photos are shrunk in the browser and go up
// one at a time, so a weak phone connection loses one page, never the lot. Once
// sent, the AI marks them in the background and this page polls until it has.
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  FiArrowLeft, FiArrowRight, FiPrinter, FiCamera, FiImage, FiSend, FiTrash2, FiX, FiLoader,
  FiAlertTriangle, FiCheckCircle, FiRefreshCw, FiUserCheck, FiEdit3, FiCpu, FiSun, FiHash, FiFileText,
  FiLock, FiPenTool, FiInfo, FiCheckSquare,
} from 'react-icons/fi'
import { apiGet, apiSend, authToken } from '../../../_components/api'
import { Loading, ErrorState, EmptyState, Badge } from '../../../_components/ui'
import { igcscUser } from '../../../_components/auth'
import { compressImage } from '../../../_components/imageCompress'

const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50'

// Same limit as MAX_PAGES in lib/igcscFiles.js, which is server-only.
const MAX_PAGES = 20
const POLL_MS = 4000
const EDITABLE = ['not_started', 'error']
const ACTIVE = ['queued', 'compressing', 'uploading']

const UPLOAD_ERRORS = {
  401: 'Your session has expired. Sign in again, then retry.',
  413: 'That photo is too large. Take it again from a little further away.',
  429: 'Too many uploads at once. Wait a moment, then retry.',
}

function fmtNum(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

function safePreview(blob) {
  try { return URL.createObjectURL(blob) } catch { return '' }
}

// FormData with only the Authorization header - apiSend would JSON-encode it.
// XHR rather than fetch, because only XHR reports upload progress.
function uploadPage(attemptId, blob, { onProgress, onStart } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const fail = (status, message) => reject(Object.assign(new Error(message), { status }))
    xhr.open('POST', `/api/igcsc/attempts/${encodeURIComponent(attemptId)}/uploads`)
    xhr.setRequestHeader('Authorization', `Bearer ${authToken()}`)
    xhr.timeout = 180000
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total) onProgress?.(Math.min(100, Math.round((e.loaded / e.total) * 100)))
    }
    xhr.onload = () => {
      let body = null
      try { body = JSON.parse(xhr.responseText || 'null') } catch { body = null }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body || {})
        return
      }
      fail(xhr.status, body?.error || UPLOAD_ERRORS[xhr.status] || `Upload failed (${xhr.status}). Please retry.`)
    }
    xhr.onerror = () => fail(0, 'Network problem. Check your connection, then retry.')
    xhr.ontimeout = () => fail(0, 'The upload timed out. Check your connection, then retry.')
    xhr.onabort = () => fail(-1, 'Upload cancelled.')
    const form = new FormData()
    form.append('file', blob, 'page.jpg')
    onStart?.(xhr)
    xhr.send(form)
  })
}

export default function WrittenSectionPage() {
  const params = useParams()
  const id = String(params?.id || '')

  const [att, setAtt] = useState(null)
  const [error, setError] = useState('')
  const [pollError, setPollError] = useState(false)
  const [me, setMe] = useState(null)
  const [items, setItems] = useState([])            // photos not on the server yet
  const [notice, setNotice] = useState(null)        // { tone: 'red' | 'amber', text }
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState('')
  const [zoom, setZoom] = useState(null)            // { src, label }

  const aliveRef = useRef(true)
  const loadingRef = useRef(false)
  const itemsRef = useRef([])
  const workingRef = useRef(false)
  const xhrRef = useRef(null)
  const seqRef = useRef(0)
  // Bumped by every write that returns the attempt, so a read that started
  // before it cannot put the old page list back.
  const versionRef = useRef(0)
  const urlRefreshRef = useRef(0)

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!id || loadingRef.current) return
    loadingRef.current = true
    const v = versionRef.current
    try {
      const res = await apiGet(`/api/igcsc/attempts/${encodeURIComponent(id)}`)
      if (!aliveRef.current || v !== versionRef.current) return
      setAtt(res?.attempt || null)
      setPollError(false)
      if (!quiet) setError('')
    } catch (e) {
      if (!aliveRef.current) return
      if (quiet) setPollError(true)
      else setError(e.message || 'Could not load this test.')
    } finally {
      loadingRef.current = false
    }
  }, [id])

  useEffect(() => {
    aliveRef.current = true
    setMe(igcscUser())
    return () => {
      aliveRef.current = false
      xhrRef.current?.abort()
      for (const it of itemsRef.current) if (it.preview) URL.revokeObjectURL(it.preview)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Coming back from the print tab, or from another device.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') load({ quiet: true }) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  const wState = att?.written?.state || 'none'
  const editable = EDITABLE.includes(wState)
  const busy = items.some((it) => ACTIVE.includes(it.status))

  useEffect(() => {
    if (wState !== 'grading') return undefined
    const t = setInterval(() => load({ quiet: true }), POLL_MS)
    return () => clearInterval(t)
  }, [wState, load])

  // Sent for marking (here or in another tab): nothing left to upload.
  useEffect(() => {
    if (editable || !itemsRef.current.length) return
    for (const it of itemsRef.current) if (it.preview) URL.revokeObjectURL(it.preview)
    itemsRef.current = []
    setItems([])
  }, [editable])

  useEffect(() => {
    if (!busy) return undefined
    const MESSAGE = 'Photos are still uploading. Leave now and the rest will not be sent?'
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    // Next's <Link> navigates without unloading the page, so beforeunload never
    // fires for it. Catch same-site link clicks first and ask.
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target?.closest?.('a[href]')
      if (!a || a.target === '_blank' || a.origin !== window.location.origin) return
      if (!window.confirm(MESSAGE)) { e.preventDefault(); e.stopPropagation() }
    }
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', warn)
      document.removeEventListener('click', onClick, true)
    }
  }, [busy])

  // ── Upload queue. The ref is the truth; state mirrors it for rendering. ──

  const setQueue = (next) => {
    itemsRef.current = next
    if (aliveRef.current) setItems(next)
  }
  const patchItem = (key, patch) => setQueue(itemsRef.current.map((it) => (it.key === key ? { ...it, ...patch } : it)))
  const dropItem = (key) => {
    const it = itemsRef.current.find((x) => x.key === key)
    if (it?.preview) URL.revokeObjectURL(it.preview)
    setQueue(itemsRef.current.filter((x) => x.key !== key))
  }

  const sendItem = async (item) => {
    let blob = item.blob
    if (!blob) {
      patchItem(item.key, { status: 'compressing', error: '' })
      try {
        blob = await compressImage(item.file)
      } catch (e) {
        patchItem(item.key, {
          status: 'failed',
          retryable: false,
          error: e?.friendly ? e.message : 'This photo could not be read. Take it again, or choose another.',
        })
        return
      }
      patchItem(item.key, { blob, preview: safePreview(blob) })
    }
    patchItem(item.key, { status: 'uploading', progress: 0, error: '' })
    try {
      const res = await uploadPage(id, blob, {
        onProgress: (p) => patchItem(item.key, { progress: p }),
        onStart: (xhr) => { xhrRef.current = xhr },
      })
      xhrRef.current = null
      if (res?.attempt) {
        versionRef.current += 1
        if (aliveRef.current) setAtt(res.attempt)
      }
      dropItem(item.key)
    } catch (e) {
      xhrRef.current = null
      if (e?.status === -1) return
      patchItem(item.key, {
        status: 'failed',
        retryable: e?.status !== 413 && e?.status !== 415,
        error: e?.message || 'Upload failed. Please retry.',
      })
      // The section closed or filled up elsewhere - show what is really there.
      if (e?.status === 409) load({ quiet: true })
    }
  }

  // One photo at a time, in the order they were picked.
  const pump = async () => {
    if (workingRef.current) return
    workingRef.current = true
    try {
      for (;;) {
        if (!aliveRef.current) break
        const next = itemsRef.current.find((it) => it.status === 'queued')
        if (!next) break
        await sendItem(next)
      }
    } finally {
      workingRef.current = false
    }
  }

  const uploads = att?.written?.uploads || []

  const addFiles = (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length) return
    const pending = itemsRef.current.filter((it) => it.status !== 'failed').length
    const room = Math.max(0, MAX_PAGES - uploads.length - pending)
    if (!room) {
      setNotice({ tone: 'amber', text: `You can upload at most ${MAX_PAGES} pages. Remove one to add another.` })
      return
    }
    const take = files.slice(0, room)
    setNotice(files.length > room
      ? { tone: 'amber', text: `Only ${room} more page${room === 1 ? '' : 's'} fit (the limit is ${MAX_PAGES}), so the first ${room} were added.` }
      : null)
    const added = take.map((file) => {
      seqRef.current += 1
      return {
        key: `p${seqRef.current}`,
        file,
        name: file.name || 'Photo',
        status: 'queued',
        progress: 0,
        error: '',
        blob: null,
        preview: '',
        retryable: true,
      }
    })
    setQueue([...itemsRef.current, ...added])
    pump()
  }

  const onPick = (e) => {
    addFiles(e.target.files)
    // Lets the same photo be picked again after it is removed.
    e.target.value = ''
  }

  const retryItem = (key) => {
    patchItem(key, { status: 'queued', error: '', progress: 0 })
    pump()
  }

  const removePage = async (upload, index) => {
    if (deleting || busy) return
    if (!window.confirm(`Remove page ${index + 1}?`)) return
    setDeleting(upload.id)
    setNotice(null)
    try {
      const res = await apiSend(
        `/api/igcsc/attempts/${encodeURIComponent(id)}/uploads/${encodeURIComponent(upload.id)}`,
        'DELETE',
      )
      if (res?.attempt) {
        versionRef.current += 1
        setAtt(res.attempt)
      }
    } catch (e) {
      setNotice({ tone: 'red', text: e.message })
      load({ quiet: true })
    } finally {
      setDeleting('')
    }
  }

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)
    setNotice(null)
    try {
      const res = await apiSend(`/api/igcsc/attempts/${encodeURIComponent(id)}/written`, 'POST')
      versionRef.current += 1
      if (res?.attempt) setAtt(res.attempt)
      else load({ quiet: true })
      setConfirmOpen(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setConfirmOpen(false)
      setNotice({ tone: 'red', text: e.message })
      load({ quiet: true })
    } finally {
      setSubmitting(false)
    }
  }

  // Page links are signed for two hours; a page left open that long re-reads them.
  const onThumbError = () => {
    const now = Date.now()
    if (now - urlRefreshRef.current < 60000) return
    urlRefreshRef.current = now
    load({ quiet: true })
  }

  const hub = `/igcsc/attempt/${encodeURIComponent(id)}`

  if (!att && error) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <BackLink href={hub} label="Back to test" />
        <ErrorState message={error} />
        <button type="button" onClick={() => load()} className={BTN_SECONDARY}><FiRefreshCw size={15} /> Try again</button>
      </div>
    )
  }
  if (!att) return <Loading label="Loading your written section…" />

  if (wState === 'none') {
    return (
      <div className="mx-auto max-w-3xl">
        <BackLink href={hub} label="Back to test" />
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <EmptyState icon={FiFileText} title="This paper has no written section" hint="Everything in it is answered online." />
        </div>
      </div>
    )
  }

  // Only the student sitting the test uploads; staff see the pages.
  const staffViewer = !!me && (me.role === 'admin' || me.role === 'tutor') && String(me.id || '') !== String(att.userId)
  const isOwner = !staffViewer
  const mState = att.mcq?.state || 'none'
  const failed = items.filter((it) => it.status === 'failed')
  const pendingCount = items.filter((it) => it.status !== 'failed').length
  const full = uploads.length + pendingCount >= MAX_PAGES
  const canSubmit = uploads.length > 0 && !busy && !failed.length && !submitting && !deleting
  const done = wState === 'graded' || wState === 'needs_review'
  const submitLabel = uploads.length
    ? `Submit ${uploads.length} page${uploads.length === 1 ? '' : 's'} for marking`
    : 'Submit for marking'

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href={hub} label="Back to test" />

      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-600 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative">
          <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/90">
            Section B · Written
          </span>
          <h1 className="mt-3 break-words text-2xl font-extrabold tracking-tight sm:text-3xl">{att.paperTitle || 'Test paper'}</h1>
          {att.paperUnit && <p className="mt-1 break-words text-sm text-indigo-100 sm:text-base">{att.paperUnit}</p>}
          <p className="mt-4 text-xs text-indigo-100/90">
            {att.written.count} question{att.written.count === 1 ? '' : 's'} · {fmtNum(att.written.max)} marks · answered on paper, marked by AI
            {staffViewer && att.userName ? ` · ${att.userName}'s pages` : ''}
          </p>
        </div>
      </div>

      {pollError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">
          <FiAlertTriangle size={14} /> Could not refresh just now. Retrying…
        </div>
      )}

      {notice && (
        <div className={`mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${notice.tone === 'red'
          ? 'border-rose-200 bg-rose-50 text-rose-800'
          : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
          <FiAlertTriangle size={17} className="mt-0.5 flex-shrink-0" />
          <span className="min-w-0 flex-1">{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="flex-shrink-0 rounded-lg p-1 opacity-60 hover:opacity-100" aria-label="Dismiss">
            <FiX size={16} />
          </button>
        </div>
      )}

      {editable && isOwner ? (
        <div className="space-y-5">
          {wState === 'error' && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <FiAlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-rose-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-rose-800">We could not mark your answers</p>
                  <p className="mt-0.5 text-sm text-rose-700">{att.written.error || 'Marking failed.'}</p>
                  <p className="mt-1 text-xs text-rose-600">Your pages are still here. Change them if you need to, then try again.</p>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={submit} disabled={!canSubmit} className={BTN_PRIMARY}>
                  {submitting ? <FiLoader className="animate-spin" size={15} /> : <FiRefreshCw size={15} />} Try again
                </button>
              </div>
            </div>
          )}

          <StepCard n={1} title="Print the questions" subtitle="Or copy them onto lined paper if you have no printer.">
            <a href={`${hub}/print`} target="_blank" rel="noopener noreferrer" className={`${BTN_SECONDARY} w-full sm:w-auto`}>
              <FiPrinter size={15} /> Print the paper
            </a>
            <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <Tip icon={FiHash}>Write the question number next to every answer, like 7 or 7(b).</Tip>
              <Tip icon={FiFileText}>Use one side of each page only.</Tip>
              <Tip icon={FiPenTool}>Write in dark pen. Pencil is hard to read in a photo.</Tip>
              <Tip icon={FiSun}>Photograph in good light, the whole page in frame, no shadows.</Tip>
            </ul>
          </StepCard>

          <StepCard
            n={2}
            title="Upload a photo of every page"
            subtitle="In page order. Photos are made smaller on your device before they upload."
            done={uploads.length > 0}
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className={`${BTN_PRIMARY} ${full ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}>
                <FiCamera size={16} /> Take a photo
                <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={full} onChange={onPick} />
              </label>
              <label className={`${BTN_SECONDARY} ${full ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}>
                <FiImage size={16} /> Choose photos
                <input type="file" accept="image/*" multiple className="sr-only" disabled={full} onChange={onPick} />
              </label>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-600">
                {uploads.length} of {MAX_PAGES} pages uploaded
              </span>
              {busy && (
                <span className="inline-flex items-center gap-1.5 font-medium text-indigo-600">
                  <FiLoader className="animate-spin" size={13} /> Uploading…
                </span>
              )}
            </div>

            {uploads.length + items.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {uploads.map((u, i) => (
                  <PageThumb
                    key={u.id}
                    upload={u}
                    index={i}
                    canDelete={!busy && !submitting}
                    deleting={deleting === u.id}
                    onDelete={removePage}
                    onZoom={setZoom}
                    onError={onThumbError}
                  />
                ))}
                {items.map((it) => (
                  <PendingThumb key={it.key} item={it} onRetry={retryItem} onRemove={dropItem} />
                ))}
              </div>
            ) : (
              <div className="mt-3 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 px-6 py-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500"><FiCamera size={22} /></span>
                <p className="text-sm font-semibold text-slate-700">No pages yet</p>
                <p className="max-w-xs text-xs text-slate-400">Take a photo of each answer page, or choose them from your gallery.</p>
              </div>
            )}
          </StepCard>

          <StepCard n={3} title="Send for marking" subtitle="Once sent, your pages are locked. Marking usually takes under two minutes.">
            {failed.length > 0 && (
              <p className="mb-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
                <FiAlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                {failed.length} photo{failed.length === 1 ? '' : 's'} did not upload. Retry or remove {failed.length === 1 ? 'it' : 'them'} first.
              </p>
            )}
            {!uploads.length && !busy && (
              <p className="mb-3 text-xs text-slate-500">Upload at least one page to continue.</p>
            )}
            <button type="button" onClick={() => setConfirmOpen(true)} disabled={!canSubmit} className={`${BTN_PRIMARY} w-full py-3 text-base sm:w-auto`}>
              <FiSend size={16} /> {submitLabel}
            </button>
          </StepCard>
        </div>
      ) : (
        <div className="space-y-5">
          {wState === 'grading' && <GradingCard />}

          {done && (
            <div className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${wState === 'needs_review'
              ? 'border-violet-200 bg-gradient-to-br from-violet-50 to-white'
              : 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white'}`}>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ${wState === 'needs_review' ? 'bg-violet-600' : 'bg-emerald-600'}`}>
                    {wState === 'needs_review' ? <FiUserCheck size={24} /> : <FiCheckCircle size={24} />}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold uppercase tracking-wide ${wState === 'needs_review' ? 'text-violet-700' : 'text-emerald-700'}`}>
                      {wState === 'needs_review' ? 'Marked · tutor checking' : 'Marked'}
                    </p>
                    <p className="mt-0.5 text-2xl font-extrabold text-slate-900 tabular-nums">
                      {att.written.score == null ? '—' : fmtNum(att.written.score)}
                      <span className="text-base font-bold text-slate-400"> / {fmtNum(att.written.max)}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {wState === 'needs_review'
                        ? 'The AI was unsure about some answers. A tutor will confirm them, so your mark may change.'
                        : att.written.reviewedBy ? `Checked by ${att.written.reviewedBy}.` : 'Marked against the mark scheme.'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link href={`${hub}/result`} className={BTN_PRIMARY}>See results <FiArrowRight size={15} /></Link>
                  <Link href={hub} className={BTN_SECONDARY}>Back to test</Link>
                </div>
              </div>
            </div>
          )}

          {staffViewer && editable && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <FiInfo size={18} className="mt-0.5 flex-shrink-0 text-slate-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Not sent for marking yet</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {wState === 'error' ? att.written.error || 'The last marking run failed.' : 'The student has not submitted their pages.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <FiLock size={14} className="text-slate-400" /> {staffViewer ? 'Pages' : 'Your pages'}
              </h2>
              <Badge tone="slate">{uploads.length} page{uploads.length === 1 ? '' : 's'}</Badge>
            </div>
            {uploads.length ? (
              <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 md:grid-cols-4">
                {uploads.map((u, i) => (
                  <PageThumb key={u.id} upload={u} index={i} canDelete={false} onZoom={setZoom} onError={onThumbError} />
                ))}
              </div>
            ) : (
              <EmptyState icon={FiImage} title="No pages uploaded" />
            )}
          </div>
        </div>
      )}

      {isOwner && (mState === 'not_started' || mState === 'in_progress') && (
        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <FiCheckSquare size={18} className="mt-0.5 flex-shrink-0 text-indigo-600" />
            <p className="text-sm text-indigo-900">
              <span className="font-semibold">Section A (online MCQ) is still open.</span>{' '}
              Your full result appears once both sections are done.
            </p>
          </div>
          <Link href={hub} className={`${BTN_SECONDARY} flex-shrink-0`}>Go to Section A</Link>
        </div>
      )}

      {confirmOpen && (
        <SubmitDialog
          pages={uploads.length}
          busy={submitting}
          onCancel={() => { if (!submitting) setConfirmOpen(false) }}
          onConfirm={submit}
        />
      )}

      {zoom && <Zoom src={zoom.src} label={zoom.label} onClose={() => setZoom(null)} />}
    </div>
  )
}

// ─── Pieces (module scope, so they keep their state across renders) ───

function BackLink({ href, label }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-indigo-700">
      <FiArrowLeft size={15} /> {label}
    </Link>
  )
}

function StepCard({ n, title, subtitle, done = false, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${done
          ? 'bg-emerald-500'
          : 'bg-gradient-to-br from-indigo-600 to-blue-600'}`}>
          {done ? <FiCheckCircle size={17} /> : n}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Tip({ icon: Icon, children }) {
  return (
    <li className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
      <Icon size={14} className="mt-0.5 flex-shrink-0 text-indigo-500" />
      <span className="min-w-0">{children}</span>
    </li>
  )
}

function PageThumb({ upload, index, canDelete, deleting = false, onDelete, onZoom, onError }) {
  const label = `Page ${index + 1}`
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <button type="button" onClick={() => onZoom({ src: upload.url, label })} className="block w-full" aria-label={`View ${label}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={upload.url} alt={label} loading="lazy" onError={onError} className="aspect-[3/4] w-full object-cover" />
      </button>
      <span className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-slate-900/75 px-2 py-0.5 text-[11px] font-semibold text-white">
        {label}
      </span>
      {canDelete && (
        <button
          type="button"
          onClick={() => onDelete(upload, index)}
          disabled={deleting}
          className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-rose-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-rose-50 disabled:opacity-60"
          aria-label={`Remove ${label}`}
        >
          {deleting ? <FiLoader className="animate-spin" size={14} /> : <FiTrash2 size={14} />}
        </button>
      )}
    </div>
  )
}

function PendingThumb({ item, onRetry, onRemove }) {
  const failed = item.status === 'failed'
  const label = item.status === 'compressing'
    ? 'Preparing…'
    : item.status === 'uploading'
      ? `Uploading ${item.progress || 0}%`
      : item.status === 'queued' ? 'Waiting…' : 'Not uploaded'
  return (
    <div className={`relative flex aspect-[3/4] flex-col overflow-hidden rounded-xl border ${failed ? 'border-rose-200 bg-rose-50' : 'border-indigo-100 bg-indigo-50/50'}`}>
      {item.preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.preview} alt="" className={`absolute inset-0 h-full w-full object-cover ${failed ? 'opacity-30' : 'opacity-50'}`} />
      ) : null}
      <div className="relative flex flex-1 flex-col items-center justify-center gap-2 p-3 text-center">
        {failed ? (
          <FiAlertTriangle size={20} className="text-rose-500" />
        ) : (
          <FiLoader size={20} className="animate-spin text-indigo-600" />
        )}
        <p className={`text-xs font-semibold ${failed ? 'text-rose-700' : 'text-indigo-800'}`}>{label}</p>
        {failed && item.error && <p className="line-clamp-4 text-[11px] leading-snug text-rose-700">{item.error}</p>}
        {!failed && <p className="max-w-full truncate text-[10px] text-slate-500">{item.name}</p>}
      </div>
      {item.status === 'uploading' && (
        <div className="relative h-1.5 w-full bg-indigo-100">
          <div className="h-full bg-gradient-to-r from-indigo-600 to-blue-600 transition-all" style={{ width: `${item.progress || 0}%` }} />
        </div>
      )}
      {(failed || item.status === 'queued') && (
        <div className="relative flex gap-1.5 p-2">
          {failed && item.retryable && (
            <button type="button" onClick={() => onRetry(item.key)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white px-2 py-1.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50">
              <FiRefreshCw size={12} /> Retry
            </button>
          )}
          <button type="button" onClick={() => onRemove(item.key)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
            <FiX size={12} /> Remove
          </button>
        </div>
      )}
    </div>
  )
}

function GradingCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 shadow-sm sm:p-8">
      <div className="flex flex-col items-center text-center">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-indigo-200/60" />
          <span className="absolute inset-2 rounded-full bg-indigo-100" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md">
            <FiCpu size={24} />
          </span>
        </div>
        <h2 className="mt-5 text-lg font-extrabold text-slate-900">Marking your answers…</h2>
        <p className="mt-1 max-w-sm text-sm text-slate-600">
          The AI is reading your pages and marking them against the mark scheme. This usually takes under two minutes.
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
          <FiLoader className="animate-spin" size={12} /> You can leave this page. Your result will be waiting.
        </p>
      </div>
    </div>
  )
}

function SubmitDialog({ pages, busy, onCancel, onConfirm }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><FiSend size={22} /></span>
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50" aria-label="Close">
            <FiX size={18} />
          </button>
        </div>
        <h3 className="mt-4 text-lg font-extrabold text-slate-900">Send {pages} page{pages === 1 ? '' : 's'} for marking?</h3>
        <p className="mt-1 text-sm text-slate-600">You cannot add or change pages after this. Check that:</p>
        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          <li className="flex gap-2"><FiCheckCircle className="mt-0.5 flex-shrink-0 text-indigo-500" size={15} /> Every answer page is uploaded.</li>
          <li className="flex gap-2"><FiCheckCircle className="mt-0.5 flex-shrink-0 text-indigo-500" size={15} /> Question numbers are visible next to your answers.</li>
          <li className="flex gap-2"><FiCheckCircle className="mt-0.5 flex-shrink-0 text-indigo-500" size={15} /> The photos are sharp and easy to read.</li>
        </ul>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className={BTN_SECONDARY}>Not yet</button>
          <button type="button" onClick={onConfirm} disabled={busy} className={BTN_PRIMARY}>
            {busy ? <FiLoader className="animate-spin" size={15} /> : <FiEdit3 size={15} />} Send for marking
          </button>
        </div>
      </div>
    </div>
  )
}

function Zoom({ src, label, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-slate-950/90" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-semibold">{label}</span>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white" aria-label="Close">
          <FiX size={20} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label} onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
      </div>
    </div>
  )
}
