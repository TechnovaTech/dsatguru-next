'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  FiAlertCircle, FiSearch, FiSend, FiImage, FiLoader, FiTrash2, FiX, FiInbox,
} from 'react-icons/fi'
import { useToast, useConfirm } from '../ui/UIProvider'

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

export default function BugReports() {
  const toast = useToast()
  const confirm = useConfirm()
  const [reports, setReports] = useState([])
  const [active, setActive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const [text, setText] = useState('')
  const [files, setFiles] = useState([])
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

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch('/api/bug-reports', { headers: authHeaders(), cache: 'no-store' })
      if (res.ok) setReports(await res.json())
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [authHeaders])

  const openReport = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/bug-reports/${id}`, { headers: authHeaders(), cache: 'no-store' })
      if (res.ok) { setActive(await res.json()); fetchList() }
    } catch { /* ignore */ }
  }, [authHeaders, fetchList])

  useEffect(() => { fetchList() }, [fetchList])

  // Poll list + the open thread for new student messages.
  useEffect(() => {
    const t = setInterval(() => {
      fetchList()
      if (active?._id) {
        fetch(`/api/bug-reports/${active._id}`, { headers: authHeaders(), cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setActive(d) }).catch(() => {})
      }
    }, 12000)
    return () => clearInterval(t)
  }, [active?._id, authHeaders, fetchList])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [active?.messages?.length, active?._id])

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
    if (!active) return
    const body = text.trim()
    if (!body && !files.length) return
    setSending(true)
    try {
      const res = await fetch(`/api/bug-reports/${active._id}/messages`, {
        method: 'POST', headers: authHeaders(true),
        body: JSON.stringify({ text: body, attachments: files }),
      })
      const d = await res.json()
      if (res.ok) { setActive(d); setText(''); setFiles([]); fetchList() }
      else toast.error(d.error || 'Could not send reply')
    } catch { toast.error('Something went wrong') } finally { setSending(false) }
  }

  const changeStatus = async (status) => {
    if (!active) return
    try {
      const res = await fetch(`/api/bug-reports/${active._id}`, {
        method: 'PATCH', headers: authHeaders(true), body: JSON.stringify({ status }),
      })
      const d = await res.json()
      if (res.ok) { setActive(d); fetchList(); toast.success('Status updated') }
      else toast.error(d.error || 'Could not update status')
    } catch { toast.error('Something went wrong') }
  }

  const removeReport = async () => {
    if (!active) return
    const ok = await confirm({ title: 'Delete this report?', message: 'This permanently removes the bug report and its conversation.', tone: 'danger', confirmText: 'Delete' })
    if (!ok) return
    try {
      const res = await fetch(`/api/bug-reports/${active._id}`, { method: 'DELETE', headers: authHeaders() })
      if (res.ok) { setActive(null); fetchList(); toast.success('Report deleted') }
      else toast.error('Could not delete report')
    } catch { toast.error('Something went wrong') }
  }

  const onKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  const counts = {
    all: reports.length,
    open: reports.filter((r) => r.status === 'open').length,
    'in-progress': reports.filter((r) => r.status === 'in-progress').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
  }

  const visible = reports.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (r.subject || '').toLowerCase().includes(q) ||
        (r.userName || '').toLowerCase().includes(q) ||
        (r.userEmail || '').toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">Bug <span className="dg-gradient-text">Reports</span></h1>
          <p className="mt-1 text-sm text-slate-500">Student-reported issues. Reply, attach screenshots, and update status.</p>
        </div>

        {/* Status filter pills */}
        <div className="mb-4 flex flex-wrap gap-2">
          {[['all', 'All'], ['open', 'Open'], ['in-progress', 'In progress'], ['resolved', 'Resolved']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${filter === key ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {label} <span className="opacity-70">({counts[key]})</span>
            </button>
          ))}
        </div>

        <div className="flex h-[calc(100vh-220px)] min-h-[480px] gap-4">
          {/* Left: report list */}
          <div className="flex w-80 flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-3">
              <div className="relative">
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search reports…"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-indigo-400"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-10 text-slate-400"><FiLoader className="animate-spin" size={22} /></div>
              ) : visible.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center text-slate-400">
                  <FiInbox size={30} /><p className="text-sm">No reports here.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {visible.map((r) => {
                    const meta = STATUS_META[r.status] || STATUS_META.open
                    return (
                      <button
                        key={r._id}
                        onClick={() => openReport(r._id)}
                        className={`flex w-full flex-col gap-1 border-l-4 p-3 text-left transition-colors ${active?._id === r._id ? 'border-l-indigo-500 bg-indigo-50/60' : 'border-l-transparent hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-800">{r.subject || 'Bug report'}</span>
                          {r.adminUnread > 0 && <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{r.adminUnread}</span>}
                        </div>
                        <span className="truncate text-xs text-slate-500">{r.userName || 'Unknown'} · {r.userEmail || ''}</span>
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

          {/* Right: thread */}
          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            {!active ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-slate-400">
                <FiAlertCircle size={40} />
                <p className="text-sm">Select a bug report to view the conversation.</p>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
                  <div className="min-w-0">
                    <h2 className="truncate font-bold text-slate-900">{active.subject || 'Bug report'}</h2>
                    <p className="truncate text-xs text-slate-500">{active.userName || 'Unknown'} · {active.userEmail || ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={active.status}
                      onChange={(e) => changeStatus(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400"
                    >
                      <option value="open">Open</option>
                      <option value="in-progress">In progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    <button onClick={removeReport} title="Delete report" className="rounded-lg bg-rose-50 p-2 text-rose-600 transition-colors hover:bg-rose-100">
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 px-4 py-4">
                  {active.messages?.map((m, i) => {
                    const mine = m.sender === 'admin'
                    return (
                      <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? 'rounded-tr-sm bg-indigo-600 text-white' : 'rounded-tl-sm border border-slate-100 bg-white text-slate-700'}`}>
                          {m.attachments?.map((url, j) => (
                            <a key={j} href={url} target="_blank" rel="noreferrer" className="mb-1 block">
                              <img src={url} alt="screenshot" className="max-h-60 rounded-lg border border-black/5" />
                            </a>
                          ))}
                          {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                          <div className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? 'text-indigo-200' : 'text-slate-400'}`}>
                            <span className="font-semibold">{m.senderName || (mine ? 'Support' : 'Student')}</span>
                            <span>· {fmtTime(m.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Reply composer */}
                <div className="border-t border-slate-100 p-3">
                  {files.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {files.map((url, i) => (
                        <div key={i} className="relative">
                          <img src={url} alt="upload" className="h-14 w-14 rounded-lg border border-slate-200 object-cover" />
                          <button onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white">
                            <FiX size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading} title="Attach screenshot" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-50">
                      {uploading ? <FiLoader className="animate-spin" size={17} /> : <FiImage size={17} />}
                    </button>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={onKeyDown}
                      rows={1}
                      placeholder="Type your reply…"
                      className="max-h-28 flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-indigo-400"
                    />
                    <button onClick={send} disabled={sending || (!text.trim() && !files.length)} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:opacity-50" title="Send">
                      {sending ? <FiLoader className="animate-spin" size={17} /> : <FiSend size={16} />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
