'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  FiAlertCircle, FiX, FiSend, FiImage, FiArrowLeft, FiPlus, FiClock, FiCheckCircle, FiLoader,
} from 'react-icons/fi'
import { useToast } from './ui/UIProvider'

const STATUS_META = {
  open: { label: 'Open', cls: 'bg-indigo-50 text-indigo-700' },
  'in-progress': { label: 'In progress', cls: 'bg-amber-50 text-amber-700' },
  resolved: { label: 'Resolved', cls: 'bg-emerald-50 text-emerald-700' },
}

function fmtTime(d) {
  if (!d) return ''
  try { return new Date(d).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

// Student-facing "Report Bug" button + slide-over chat panel. Lets a student
// open bug reports, chat with support, and attach screenshots. Mounted once in
// the dashboard layout so it's available on every student page.
export default function BugReportWidget() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('list') // 'list' | 'thread'
  const [reports, setReports] = useState([])
  const [active, setActive] = useState(null) // report object, or null = composing new
  const [loadingList, setLoadingList] = useState(false)
  const [unread, setUnread] = useState(0)

  const [subject, setSubject] = useState('')
  const [text, setText] = useState('')
  const [files, setFiles] = useState([]) // uploaded screenshot URLs pending send
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)

  const fileRef = useRef(null)
  const scrollRef = useRef(null)

  const authHeaders = useCallback((json = false) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const h = token ? { Authorization: `Bearer ${token}` } : {}
    if (json) h['Content-Type'] = 'application/json'
    return h
  }, [])

  const fetchUnread = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) return
      const res = await fetch('/api/bug-reports/unread-count', { headers: authHeaders(), cache: 'no-store' })
      if (res.ok) { const d = await res.json(); setUnread(d.count || 0) }
    } catch { /* ignore */ }
  }, [authHeaders])

  const fetchList = useCallback(async () => {
    setLoadingList(true)
    try {
      const res = await fetch('/api/bug-reports', { headers: authHeaders(), cache: 'no-store' })
      if (res.ok) setReports(await res.json())
    } catch { /* ignore */ } finally { setLoadingList(false) }
  }, [authHeaders])

  const openThread = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/bug-reports/${id}`, { headers: authHeaders(), cache: 'no-store' })
      if (res.ok) {
        const r = await res.json()
        setActive(r)
        setView('thread')
        fetchUnread()
        fetchList()
      }
    } catch { /* ignore */ }
  }, [authHeaders, fetchUnread, fetchList])

  // Poll the badge while mounted.
  useEffect(() => {
    fetchUnread()
    const t = setInterval(fetchUnread, 20000)
    return () => clearInterval(t)
  }, [fetchUnread])

  // Refresh the list when the panel opens.
  useEffect(() => { if (open) fetchList() }, [open, fetchList])

  // Poll the open thread so admin replies show up live.
  useEffect(() => {
    if (!open || view !== 'thread' || !active?._id) return
    const id = active._id
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/bug-reports/${id}`, { headers: authHeaders(), cache: 'no-store' })
        if (res.ok) { setActive(await res.json()); fetchUnread() }
      } catch { /* ignore */ }
    }, 7000)
    return () => clearInterval(t)
  }, [open, view, active?._id, authHeaders, fetchUnread])

  // Auto-scroll to the latest message.
  useEffect(() => {
    if (view === 'thread' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [active?.messages?.length, view])

  const resetComposer = () => { setText(''); setSubject(''); setFiles([]) }

  const startNew = () => { setActive(null); resetComposer(); setView('thread') }

  const handleFiles = async (e) => {
    const list = Array.from(e.target.files || [])
    if (fileRef.current) fileRef.current.value = ''
    if (!list.length) return
    setUploading(true)
    try {
      for (const file of list) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/bug-reports/upload', { method: 'POST', headers: authHeaders(), body: fd })
        const d = await res.json()
        if (res.ok && d.url) setFiles((prev) => [...prev, d.url])
        else toast.error(d.error || 'Upload failed')
      }
    } catch { toast.error('Upload failed') } finally { setUploading(false) }
  }

  const send = async () => {
    const body = text.trim()
    if (!body && !files.length) return
    setSending(true)
    try {
      if (!active) {
        // Create a new report.
        const res = await fetch('/api/bug-reports', {
          method: 'POST', headers: authHeaders(true),
          body: JSON.stringify({ subject: subject.trim(), text: body, attachments: files }),
        })
        const d = await res.json()
        if (res.ok) { setActive(d); resetComposer(); fetchList(); fetchUnread(); toast.success('Bug report sent — we’ll get back to you.') }
        else toast.error(d.error || 'Could not send report')
      } else {
        const res = await fetch(`/api/bug-reports/${active._id}/messages`, {
          method: 'POST', headers: authHeaders(true),
          body: JSON.stringify({ text: body, attachments: files }),
        })
        const d = await res.json()
        if (res.ok) { setActive(d); resetComposer(); fetchList() }
        else toast.error(d.error || 'Could not send message')
      }
    } catch { toast.error('Something went wrong') } finally { setSending(false) }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {/* Trigger button (sits in the top bar, next to the nav menus) */}
      <button
        onClick={() => setOpen(true)}
        title="Report a bug"
        className="relative flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
      >
        <FiAlertCircle size={16} />
        <span className="hidden sm:inline">Report Bug</span>
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[120] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div className="relative flex h-full w-full max-w-md flex-col bg-slate-50 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                {view === 'thread' && (
                  <button onClick={() => { setView('list'); fetchList() }} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Back">
                    <FiArrowLeft size={18} />
                  </button>
                )}
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {view === 'list' ? 'Report a Bug' : (active ? (active.subject || 'Bug report') : 'New Bug Report')}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {view === 'list' ? 'Tell us what’s broken — attach a screenshot too.' : (active ? STATUS_META[active.status]?.label : 'Describe the issue')}
                  </p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Close">
                <FiX size={18} />
              </button>
            </div>

            {/* ===== LIST VIEW ===== */}
            {view === 'list' && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="p-3">
                  <button onClick={startNew} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
                    <FiPlus size={16} /> New Bug Report
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-3 pb-4">
                  {loadingList ? (
                    <div className="flex justify-center py-10 text-slate-400"><FiLoader className="animate-spin" size={22} /></div>
                  ) : reports.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12 text-center text-slate-400">
                      <FiAlertCircle size={32} />
                      <p className="text-sm">No bug reports yet.</p>
                      <p className="text-xs">Found something broken? Click “New Bug Report”.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {reports.map((r) => {
                        const meta = STATUS_META[r.status] || STATUS_META.open
                        const last = r.messages?.[r.messages.length - 1]
                        return (
                          <button
                            key={r._id}
                            onClick={() => openThread(r._id)}
                            className="flex w-full flex-col gap-1 rounded-xl border border-slate-100 bg-white p-3 text-left shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-semibold text-slate-800">{r.subject || 'Bug report'}</span>
                              {r.studentUnread > 0 && <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-rose-500" />}
                            </div>
                            <p className="truncate text-xs text-slate-500">{last?.text || (last?.attachments?.length ? '📎 Screenshot' : '')}</p>
                            <div className="flex items-center justify-between gap-2 pt-0.5">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.cls}`}>{meta.label}</span>
                              <span className="text-[10px] text-slate-400">{fmtTime(r.lastMessageAt)}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== THREAD VIEW ===== */}
            {view === 'thread' && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                  {!active && (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-3">
                      <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Subject (optional) — e.g. “Can’t start test”"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition-colors focus:border-indigo-400"
                      />
                      <p className="mt-2 text-xs text-slate-400">Describe the bug below and attach a screenshot. Our team will reply right here.</p>
                    </div>
                  )}

                  {active?.messages?.map((m, i) => {
                    const mine = m.sender === 'student'
                    return (
                      <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? 'rounded-tr-sm bg-indigo-600 text-white' : 'rounded-tl-sm border border-slate-100 bg-white text-slate-700'}`}>
                          {m.attachments?.map((url, j) => (
                            <a key={j} href={url} target="_blank" rel="noreferrer" className="mb-1 block">
                              <img src={url} alt="screenshot" className="max-h-48 rounded-lg border border-black/5" />
                            </a>
                          ))}
                          {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                          <div className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {!mine && <span className="font-semibold">{m.senderName || 'Support'}</span>}
                            <span>{fmtTime(m.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {active && active.messages?.length > 0 && active.status === 'resolved' && (
                    <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-emerald-600">
                      <FiCheckCircle size={14} /> This report was marked resolved.
                    </div>
                  )}
                </div>

                {/* Composer */}
                <div className="border-t border-slate-200 bg-white p-3">
                  {files.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {files.map((url, i) => (
                        <div key={i} className="relative">
                          <img src={url} alt="upload" className="h-14 w-14 rounded-lg border border-slate-200 object-cover" />
                          <button
                            onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white"
                          >
                            <FiX size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      title="Attach screenshot"
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-50"
                    >
                      {uploading ? <FiLoader className="animate-spin" size={17} /> : <FiImage size={17} />}
                    </button>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={onKeyDown}
                      rows={1}
                      placeholder="Type your message…"
                      className="max-h-28 flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-indigo-400"
                    />
                    <button
                      onClick={send}
                      disabled={sending || (!text.trim() && !files.length)}
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                      title="Send"
                    >
                      {sending ? <FiLoader className="animate-spin" size={17} /> : <FiSend size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
