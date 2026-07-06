'use client'
import { useState } from 'react'
import { FiCode, FiX, FiCopy, FiDownload, FiSave, FiClock } from 'react-icons/fi'
import { getOrderedQuestionIds, buildTestJson, jsonToCustomQuestions } from '../../../lib/testJson'

// Load questions in display order, merged with a customQuestions overlay.
// opts.ids restricts to a subset (e.g. a single module); opts.overlay overrides
// which overlay to merge (e.g. the editor's live edits). Defaults to the whole test.
async function loadOrderedMergedQuestions(test, opts = {}) {
  const token = localStorage.getItem('token')
  const ids = ((opts.ids && opts.ids.length ? opts.ids : getOrderedQuestionIds(test)) || []).map(String)
  if (!ids.length) return []
  const res = await fetch(`/api/questions?ids=${ids.join(',')}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error('Failed to load questions')
  const questions = await res.json()
  const byId = {}
  questions.forEach(q => { byId[String(q.id || q._id)] = q })
  const cmap = opts.overlay || test.customQuestions || {}
  return ids.map(id => {
    const base = byId[id] || { _id: id }
    return cmap[id] ? { ...base, ...cmap[id] } : base
  })
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

const fileName = (test) => `${String(test?.title || 'test').replace(/[^a-zA-Z0-9-_]+/g, '_')}.json`

// One-click download of the whole test as JSON (upload format).
export function DownloadTestJsonButton({ test, className, label = 'JSON' }) {
  const [busy, setBusy] = useState(false)
  const handle = async () => {
    setBusy(true)
    try {
      const ordered = await loadOrderedMergedQuestions(test)
      downloadText(fileName(test), JSON.stringify(buildTestJson(ordered), null, 2))
    } catch (e) {
      console.error('JSON download failed', e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <button type="button" onClick={handle} disabled={busy}
      className={className || 'inline-flex items-center text-sm text-slate-600 hover:text-slate-800 disabled:opacity-50'}
      title="Download this test as JSON (upload format)">
      <FiDownload className="mr-1" /> {busy ? '…' : label}
    </button>
  )
}

// Edit a tutor test's name and time (duration) straight from the sheet list.
export function EditTestMetaModal({ test, updateUrl, onSaved, className, label = 'Name / Time' }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [isTimed, setIsTimed] = useState(true)
  const [duration, setDuration] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const openModal = () => {
    setTitle(test.title || '')
    setIsTimed(test.isTimed !== false)
    setDuration(test.duration || 0)
    setError(''); setOpen(true)
  }

  const save = async () => {
    if (!title.trim()) { setError('Please enter a test name.'); return }
    if (isTimed && (!duration || Number(duration) < 1)) { setError('Enter a valid duration (minutes).'); return }
    setSaving(true); setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(updateUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ testId: test._id, title: title.trim(), isTimed, duration: isTimed ? Number(duration) || 0 : 0 }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Save failed'); return }
      onSaved && onSaved(); setOpen(false)
    } catch (e) { setError('Save failed') } finally { setSaving(false) }
  }

  return (
    <>
      <button type="button" onClick={openModal} className={className || 'inline-flex items-center text-sm text-slate-600 hover:text-slate-800'} title="Edit name & time">
        <FiClock className="mr-1" /> {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <h3 className="text-lg font-bold text-slate-900">Edit name &amp; time</h3>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><FiX className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Test name</label>
                <input value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={isTimed} onChange={e => setIsTimed(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  Timed
                </label>
                {isTimed && (
                  <div className="flex items-center gap-2">
                    <input type="number" min="1" value={duration} onChange={e => setDuration(e.target.value)} className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" />
                    <span className="text-sm text-slate-500">minutes</span>
                  </div>
                )}
              </div>
              {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 p-3">
              <button onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={save} disabled={saving} className="inline-flex items-center rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-slate-400"><FiSave className="mr-1" /> {saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// View / copy / download / edit the whole test as one JSON blob. Saving maps edits
// back onto the existing questions (same order) via the test's update endpoint.
export function EditTestJsonModal({ test, updateUrl, onSaved, className, label = 'Edit JSON', orderedQuestionIds, existingCustomQuestions, scopeLabel }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [text, setText] = useState('')
  const [ordered, setOrdered] = useState([])
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')

  const openEditor = async () => {
    setError(''); setWarning(''); setOpen(true); setLoading(true)
    try {
      const merged = await loadOrderedMergedQuestions(test, { ids: orderedQuestionIds, overlay: existingCustomQuestions })
      setOrdered(merged)
      setText(JSON.stringify(buildTestJson(merged), null, 2))
    } catch (e) {
      setError(e.message || 'Failed to load questions')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setError(''); setWarning('')
    let parsed
    try { parsed = JSON.parse(text) } catch (e) { setError('Invalid JSON: ' + e.message); return }
    if (!Array.isArray(parsed)) { setError('The JSON must be an array of questions.'); return }
    const { customQuestions, warning: w } = jsonToCustomQuestions(parsed, ordered, existingCustomQuestions || test.customQuestions || {})
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(updateUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ testId: test._id, customQuestions }),
      })
      if (!res.ok) throw new Error('Save failed')
      onSaved && onSaved()
      if (w) { setWarning(w) } else { setOpen(false) }
    } catch (e) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const copy = async () => { try { await navigator.clipboard.writeText(text) } catch {} }

  return (
    <>
      <button type="button" onClick={openEditor}
        className={className || 'inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800'}
        title="View / copy / edit this test as JSON">
        <FiCode className="mr-1" /> {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setOpen(false)}>
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50 p-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit JSON — {test.title}{scopeLabel ? ` · ${scopeLabel}` : ''}</h3>
                <p className="mt-0.5 text-xs text-slate-500">Edits existing questions (same count &amp; order). Images/tables inside the text apply automatically. Add/remove isn&apos;t supported here.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-600"><FiX className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {loading ? (
                <div className="py-16 text-center text-slate-500">Loading questions…</div>
              ) : (
                <textarea value={text} onChange={e => setText(e.target.value)} spellCheck={false}
                  className="h-[55vh] w-full resize-none rounded-lg border border-slate-300 p-3 font-mono text-xs leading-relaxed outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" />
              )}
              {error && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              {warning && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{warning}</p>}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 p-3">
              <div className="flex gap-2">
                <button onClick={copy} disabled={loading} className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"><FiCopy className="mr-1" /> Copy</button>
                <button onClick={() => downloadText(fileName(test), text)} disabled={loading} className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"><FiDownload className="mr-1" /> Download</button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={handleSave} disabled={saving || loading} className="inline-flex items-center rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-slate-400"><FiSave className="mr-1" /> {saving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
