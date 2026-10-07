'use client'
// The "Miscellaneous" workspace of one Question Bank folder: the practice
// sheets and period materials staff upload for that topic. Students get the
// same files read-only under Practice Sheets, through the shared SheetSlots.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiUploadCloud, FiFileText, FiImage, FiFile, FiExternalLink, FiDownload, FiEye, FiEyeOff,
  FiEdit2, FiTrash2, FiPlus, FiLoader, FiChevronRight, FiTrendingUp, FiX, FiCheck, FiAlertTriangle,
} from 'react-icons/fi'
import { apiGet, apiSend, authToken } from './api'
import { Loading, ErrorState } from './ui'
import { ConfirmDialog, fmtDate } from './PaperCard'
import {
  MAX_SHEET_BYTES, MAX_SHEET_MB, MAX_PERIODS, SHEET_ACCEPT, SHEET_EXT_RE, SHEET_TITLE_MAX,
  slotKey, slotLabel, typeLabel, fmtSize, bySlot,
} from '../../../lib/igcscSheetsShared'

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

const ICON_BTN =
  'flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40'
const INPUT =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none'

const UPLOAD_ERRORS = {
  401: 'Your session has ended. Sign in again.',
  403: 'Only staff can upload sheets.',
  404: 'This folder is not in the Question Bank any more.',
  413: `That file is too large - the limit is ${MAX_SHEET_MB} MB. If it is smaller than that, the server's own upload limit is lower; ask whoever runs the server to raise it.`,
  415: 'Upload a PDF, Word (.docx), JPG or PNG file.',
  429: 'Too many uploads at once. Wait a moment, then retry.',
}

// FormData with only the Authorization header - apiSend would JSON-encode it.
// XHR rather than fetch, because only XHR reports upload progress.
function uploadSheet(fields, file, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const fail = (status, message) => reject(Object.assign(new Error(message), { status }))
    xhr.open('POST', '/api/igcsc/sheets')
    xhr.setRequestHeader('Authorization', `Bearer ${authToken()}`)
    xhr.timeout = 10 * 60 * 1000
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
    // A proxy that refuses a big body often drops the connection instead of
    // answering, which the browser reports as a plain network error.
    xhr.onerror = () => fail(0, file.size > 1024 * 1024
      ? 'The upload failed part-way. Check your connection and retry; if it keeps failing with big files, the server\'s upload limit may be below 50 MB.'
      : 'Network problem. Check your connection, then retry.')
    xhr.ontimeout = () => fail(0, 'The upload timed out. Check your connection, then retry.')
    xhr.onabort = () => fail(-1, 'Upload cancelled.')
    const form = new FormData()
    for (const [k, v] of Object.entries(fields)) form.append(k, String(v ?? ''))
    form.append('file', file, file.name)
    xhr.send(form)
  })
}

function parseSlot(key) {
  if (key === 'practice') return { kind: 'practice', period: 0 }
  return { kind: 'period', period: Number(String(key).split('-')[1]) || 1 }
}

function FileIcon({ mime, size = 18 }) {
  if (mime === 'application/pdf') return <FiFileText size={size} />
  if (String(mime || '').startsWith('image/')) return <FiImage size={size} />
  return <FiFile size={size} />
}

// One uploaded sheet: open it, download it; staff also rename, hide, delete.
export function SheetRow({ s, readOnly, busy, onRename, onToggle, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(s.title)
  const hidden = s.visibleToStudents === false

  const cancel = () => { setEditing(false); setDraft(s.title) }
  const save = async (e) => {
    e?.preventDefault()
    const t = draft.trim()
    if (!t || t === s.title) { cancel(); return }
    await onRename(s, t)
    setEditing(false)
  }

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${hidden ? 'border-dashed border-slate-300 bg-slate-50/70' : 'border-slate-200 bg-white'}`}>
      <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <FileIcon mime={s.mime} />
      </span>
      <div className="min-w-0 flex-1">
        {editing ? (
          <form onSubmit={save} className="flex items-center gap-1.5">
            <input
              autoFocus
              value={draft}
              maxLength={SHEET_TITLE_MAX}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') cancel() }}
              className={INPUT}
              aria-label="Sheet name"
            />
            <button type="submit" disabled={busy} className={`${ICON_BTN} text-emerald-600`} title="Save"><FiCheck size={16} /></button>
            <button type="button" onClick={cancel} className={ICON_BTN} title="Cancel"><FiX size={16} /></button>
          </form>
        ) : (
          <a href={s.url} target="_blank" rel="noopener noreferrer" title={s.title}
            className="block truncate text-sm font-semibold text-slate-800 hover:text-indigo-700">
            {s.title}
          </a>
        )}
        <p className="mt-0.5 truncate text-[11px] text-slate-400">
          {typeLabel(s.mime)} · {fmtSize(s.size)}
          {s.uploadedByName ? ` · ${s.uploadedByName}` : ''}
          {s.createdAt ? ` · ${fmtDate(s.createdAt)}` : ''}
          {!readOnly && hidden && <span className="ml-1 font-semibold text-amber-600">· Hidden from students</span>}
        </p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-0.5">
        <a href={s.url} target="_blank" rel="noopener noreferrer" className={ICON_BTN} title="Open in a new tab"><FiExternalLink size={15} /></a>
        <a href={`${s.url}&dl=1`} className={ICON_BTN} title="Download"><FiDownload size={15} /></a>
        {!readOnly && (
          <>
            <button type="button" onClick={() => onToggle(s)} disabled={busy} className={ICON_BTN}
              title={hidden ? 'Hidden from students - click to show it' : 'Students can see this - click to hide it'}>
              {hidden ? <FiEyeOff size={15} /> : <FiEye size={15} />}
            </button>
            <button type="button" onClick={() => setEditing(true)} disabled={busy || editing} className={ICON_BTN} title="Rename">
              <FiEdit2 size={15} />
            </button>
            <button type="button" onClick={() => onDelete(s)} disabled={busy} className={`${ICON_BTN} hover:bg-rose-50 hover:text-rose-600`} title="Delete">
              <FiTrash2 size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function SlotCard({ label, sheets, readOnly, busyId, onPick, onRename, onToggle, onDelete }) {
  const empty = sheets.length === 0
  return (
    <div className={`flex flex-col rounded-2xl border p-4 ${empty ? 'border-dashed border-slate-300 bg-slate-50/50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-800">{label}</h4>
        <span className="text-[11px] text-slate-400">{empty ? 'Empty' : plural(sheets.length, 'file')}</span>
      </div>
      <div className="mt-3 flex-1 space-y-2">
        {sheets.map((s) => (
          <SheetRow key={s._id} s={s} readOnly={readOnly} busy={busyId === s._id}
            onRename={onRename} onToggle={onToggle} onDelete={onDelete} />
        ))}
        {empty && <p className="py-2 text-center text-xs text-slate-400">Nothing here yet.</p>}
      </div>
      {!readOnly && (
        <label className="mt-3 inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
          <FiPlus size={14} /> Upload {label}
          <input type="file" multiple accept={SHEET_ACCEPT} className="sr-only"
            onChange={(e) => { onPick(Array.from(e.target.files || [])); e.target.value = '' }} />
        </label>
      )}
    </div>
  )
}

// The slot grid: Period 1, Period 2, …, then the practice sheets. Staff always
// see Period 1 and 2 and a Practice card so there is somewhere to upload;
// students see only the slots that hold something.
export function SheetSlots({ sheets, readOnly = false, extraPeriods = [], onAddPeriod, busyId = '', onPick, onRename, onToggle, onDelete }) {
  const bySlotKey = useMemo(() => {
    const map = new Map()
    for (const s of sheets) {
      const k = slotKey(s.kind, s.period)
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(s)
    }
    return map
  }, [sheets])

  const periods = useMemo(() => {
    const set = new Set(readOnly ? [] : [1, 2, ...extraPeriods])
    for (const s of sheets) if (s.kind === 'period' && s.period) set.add(s.period)
    return [...set].sort((a, b) => a - b)
  }, [sheets, readOnly, extraPeriods])

  const practice = bySlotKey.get('practice') || []
  const canAdd = !readOnly && onAddPeriod && Math.max(0, ...periods) < MAX_PERIODS
  const noop = () => {}

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {periods.map((n) => (
        <SlotCard key={`period-${n}`} label={slotLabel('period', n)} sheets={bySlotKey.get(`period-${n}`) || []}
          readOnly={readOnly} busyId={busyId} onPick={(files) => onPick?.(files, `period-${n}`)}
          onRename={onRename || noop} onToggle={onToggle || noop} onDelete={onDelete || noop} />
      ))}
      {canAdd && (
        <button type="button" onClick={onAddPeriod}
          className="flex min-h-[9rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-4 text-sm font-semibold text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50/40 hover:text-indigo-700">
          <FiPlus size={20} /> Add Period {Math.max(0, ...periods) + 1}
        </button>
      )}
      {(!readOnly || practice.length > 0) && (
        <SlotCard label={slotLabel('practice')} sheets={practice}
          readOnly={readOnly} busyId={busyId} onPick={(files) => onPick?.(files, 'practice')}
          onRename={onRename || noop} onToggle={onToggle || noop} onDelete={onDelete || noop} />
      )}
    </div>
  )
}

function UploadRow({ u, onDismiss }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${u.error ? 'border-rose-200 bg-rose-50' : 'border-indigo-200 bg-indigo-50/60'}`}>
      <div className="flex items-center gap-2">
        {u.error ? <FiAlertTriangle size={15} className="flex-shrink-0 text-rose-500" /> : <FiLoader size={15} className="flex-shrink-0 animate-spin text-indigo-500" />}
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800" title={u.name}>{u.name}</span>
        <span className="flex-shrink-0 text-[11px] text-slate-500">{slotLabel(parseSlot(u.slot).kind, parseSlot(u.slot).period)}</span>
        {u.error ? (
          <button type="button" onClick={() => onDismiss(u.id)} className={ICON_BTN} title="Dismiss"><FiX size={15} /></button>
        ) : (
          <span className="w-10 text-right text-[11px] font-semibold text-indigo-700">{u.pct}%</span>
        )}
      </div>
      {u.error ? (
        <p className="mt-1 text-xs text-rose-700">{u.error}</p>
      ) : (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-indigo-100">
          <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${u.pct}%` }} />
        </div>
      )}
    </div>
  )
}

// crumbs: [{ label, onClick }] from the subject down to the folder this
// workspace belongs to; onRoot goes back to the Question Bank itself.
export default function SheetWorkspace({ curriculum, subject, folder, crumbs = [], onRoot, onCount }) {
  const [sheets, setSheets] = useState(null)         // null while loading
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [queue, setQueue] = useState([])             // uploads in flight or failed
  const [target, setTarget] = useState('practice')   // where the big drop zone files
  const [extraPeriods, setExtraPeriods] = useState([])
  const [dragging, setDragging] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [toDelete, setToDelete] = useState(null)
  const alive = useRef(true)
  const dragDepth = useRef(0)
  const countRef = useRef(onCount)
  useEffect(() => { countRef.current = onCount })

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const leaf = crumbs.length ? crumbs[crumbs.length - 1].label : `${curriculum} ${subject}`

  // Every change to the list goes through the previous state: an upload can
  // finish while a rename or a delete is still in flight.
  const setList = (fn) => setSheets((prev) => {
    const next = fn(prev || []).slice().sort(bySlot)
    countRef.current?.(next.length)
    return next
  })

  const load = useCallback(async () => {
    setError('')
    try {
      const p = new URLSearchParams({ curriculum, subject, folder })
      const r = await apiGet(`/api/igcsc/sheets?${p.toString()}`)
      if (!alive.current) return
      const sorted = (r.sheets || []).slice().sort(bySlot)
      setSheets(sorted)
      countRef.current?.(sorted.length)
    } catch (e) {
      if (alive.current) { setError(e.message); setSheets([]) }
    }
  }, [curriculum, subject, folder])

  useEffect(() => { setSheets(null); setQueue([]); setExtraPeriods([]); load() }, [load])

  const periodsInUse = useMemo(() => {
    const set = new Set([1, 2, ...extraPeriods])
    for (const s of sheets || []) if (s.kind === 'period' && s.period) set.add(s.period)
    return [...set].sort((a, b) => a - b)
  }, [sheets, extraPeriods])

  const addPeriod = () => {
    const next = Math.max(0, ...periodsInUse) + 1
    if (next <= MAX_PERIODS) setExtraPeriods((p) => [...p, next])
  }

  // Files go up one at a time, each with its own progress bar; a failed one
  // stays in the list with its reason until dismissed.
  const upload = useCallback(async (files, slot) => {
    const { kind, period } = parseSlot(slot)
    for (const file of files) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const item = { id, name: file.name, pct: 0, slot, error: '' }
      if (!SHEET_EXT_RE.test(file.name)) item.error = 'Only PDF, Word (.docx), JPG and PNG files can be uploaded.'
      else if (file.size > MAX_SHEET_BYTES) item.error = `Too large (${fmtSize(file.size)}). The limit is ${MAX_SHEET_MB} MB.`
      else if (!file.size) item.error = 'That file is empty.'
      setQueue((q) => [...q, item])
      if (item.error) continue
      try {
        const r = await uploadSheet({ curriculum, subject, folder, kind, period }, file, {
          onProgress: (pct) => setQueue((q) => q.map((x) => (x.id === id ? { ...x, pct } : x))),
        })
        if (!alive.current) return
        setQueue((q) => q.filter((x) => x.id !== id))
        if (r.sheet) setList((prev) => [...prev, r.sheet])
      } catch (e) {
        if (!alive.current) return
        setQueue((q) => q.map((x) => (x.id === id ? { ...x, error: e.message, pct: 0 } : x)))
      }
    }
  }, [curriculum, subject, folder])

  const patch = async (s, body) => {
    setBusyId(s._id); setNotice('')
    try {
      const r = await apiSend(`/api/igcsc/sheets/${s._id}`, 'PATCH', body)
      if (!alive.current) return
      if (r.sheet) setList((prev) => prev.map((x) => (x._id === s._id ? r.sheet : x)))
    } catch (e) {
      if (alive.current) setNotice(e.message)
    } finally {
      if (alive.current) setBusyId('')
    }
  }
  const rename = (s, title) => patch(s, { title })
  const toggle = (s) => patch(s, { visibleToStudents: s.visibleToStudents === false })

  const remove = async () => {
    const s = toDelete
    if (!s) return
    setBusyId(s._id); setNotice('')
    try {
      await apiSend(`/api/igcsc/sheets/${s._id}`, 'DELETE')
      if (!alive.current) return
      setList((prev) => prev.filter((x) => x._id !== s._id))
      setToDelete(null)
    } catch (e) {
      if (alive.current) { setNotice(e.message); setToDelete(null) }
    } finally {
      if (alive.current) setBusyId('')
    }
  }

  // Drag state by depth: children of the drop zone fire enter/leave too.
  const onDragEnter = (e) => { e.preventDefault(); dragDepth.current += 1; setDragging(true) }
  const onDragLeave = (e) => {
    e.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragging(false)
  }
  const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }
  const onDrop = (e) => {
    e.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    const files = Array.from(e.dataTransfer?.files || [])
    if (files.length) upload(files, target)
  }

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-slate-500">
        <button type="button" onClick={onRoot} className="rounded px-1 hover:text-indigo-700 hover:underline">Question Bank</button>
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            <FiChevronRight size={14} className="text-slate-300" />
            <button type="button" onClick={c.onClick} className="rounded px-1 text-left hover:text-indigo-700 hover:underline">{c.label}</button>
          </span>
        ))}
        <span className="flex items-center gap-1">
          <FiChevronRight size={14} className="text-slate-300" />
          <span className="px-1 font-bold text-slate-900">Miscellaneous</span>
        </span>
      </nav>

      <div className="mb-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-5 text-white shadow-sm">
        <h2 className="flex items-center gap-2 text-xl font-extrabold">Self Improvement <FiTrendingUp size={20} /></h2>
        <p className="mt-1 text-sm text-indigo-100">
          Practice sheets and period materials for this topic. Students find them under Practice Sheets.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h3 className="text-xl font-extrabold text-slate-900">{leaf} - Practice Sheets &amp; Periods Upload</h3>
        <p className="mt-1 text-sm text-slate-500">Upload your practice sheets, PDFs, and period materials below.</p>

        <label
          onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}
          className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
            dragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <FiUploadCloud size={44} className={dragging ? 'text-indigo-500' : 'text-slate-400'} />
          <span className="mt-3 text-base font-bold text-slate-800">Drag &amp; drop files here, or click to browse</span>
          <span className="mt-1 text-xs text-slate-500">Supported formats: PDF, DOCX, JPG, PNG (Max {MAX_SHEET_MB}MB)</span>
          <input type="file" multiple accept={SHEET_ACCEPT} className="sr-only"
            onChange={(e) => { upload(Array.from(e.target.files || []), target); e.target.value = '' }} />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span>Files dropped above go to</span>
          <select value={target} onChange={(e) => setTarget(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-700 focus:border-indigo-400 focus:outline-none">
            <option value="practice">{slotLabel('practice')}</option>
            {periodsInUse.map((n) => <option key={n} value={`period-${n}`}>{slotLabel('period', n)}</option>)}
          </select>
        </div>

        {queue.length > 0 && (
          <div className="mt-4 space-y-2">
            {queue.map((u) => <UploadRow key={u.id} u={u} onDismiss={(id) => setQueue((q) => q.filter((x) => x.id !== id))} />)}
          </div>
        )}
        {notice && <div className="mt-4"><ErrorState message={notice} /></div>}
        {error && <div className="mt-4"><ErrorState message={error} /></div>}

        <h4 className="mt-8 text-sm font-bold text-slate-800">Help organize &ldquo;Periods&rdquo; &amp; Sheets:</h4>
        {sheets === null ? (
          <Loading label="Loading sheets…" />
        ) : (
          <div className="mt-3">
            <SheetSlots sheets={sheets} extraPeriods={extraPeriods} onAddPeriod={addPeriod} busyId={busyId}
              onPick={upload} onRename={rename} onToggle={toggle} onDelete={setToDelete} />
          </div>
        )}
      </div>

      {toDelete && (
        <ConfirmDialog title="Delete this sheet?" confirmLabel="Delete" busy={busyId === toDelete._id}
          onConfirm={remove} onCancel={() => setToDelete(null)}>
          <p><span className="font-semibold text-slate-800">{toDelete.title}</span> will be removed for staff and students. This cannot be undone.</p>
        </ConfirmDialog>
      )}
    </div>
  )
}
