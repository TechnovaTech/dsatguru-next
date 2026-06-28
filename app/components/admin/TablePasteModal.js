'use client'
import { useState, useEffect } from 'react'
import { textToMarkdownTable, detectTableMode } from '../../../lib/markdownTable'
import { renderContent } from './LatexRenderer'

// When copying from a web page / Google Sheet / Docs, the clipboard carries the real table
// structure as HTML. Parse it directly (exact cells) — far more reliable than guessing.
function htmlTableToTabs(html) {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const table = doc.querySelector('table')
    if (!table) return null
    const rows = []
    for (const tr of table.querySelectorAll('tr')) {
      const cells = []
      for (const td of tr.querySelectorAll('th, td')) {
        const text = (td.textContent || '').replace(/\s+/g, ' ').trim()
        const span = parseInt(td.getAttribute('colspan') || '1', 10) || 1
        cells.push(text)
        for (let s = 1; s < span; s++) cells.push('')
      }
      if (cells.some((c) => c.length)) rows.push(cells)
    }
    if (!rows.length) return null
    return rows.map((r) => r.join('\t')).join('\n')
  } catch { return null }
}

// Paste rows -> live-previewed markdown table -> insert. Shared by the test editors.
export default function TablePasteModal({ open, onClose, onInsert }) {
  const [raw, setRaw] = useState('')
  const [cols, setCols] = useState(3)
  useEffect(() => { if (open) { setRaw(''); setCols(3) } }, [open])
  if (!open) return null

  // If the pasted clipboard contains an HTML table, capture its exact structure.
  const handlePaste = (e) => {
    const html = e.clipboardData && e.clipboardData.getData('text/html')
    if (html) {
      const tabs = htmlTableToTabs(html)
      if (tabs) { e.preventDefault(); setRaw(tabs) }
    }
  }

  const mode = detectTableMode(raw)
  const autoDetected = mode === 'grid' || mode === 'numeric'
  const md = textToMarkdownTable(raw, cols)
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Paste a table</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <p className="mb-2 text-xs text-gray-500">
          Paste your table here. Copying from a web page / Google Sheet / Docs keeps the exact table automatically.
          From a PDF or plain text it&apos;s rebuilt smartly (data tables auto-detect columns). The first row is the header; $...$ math works in cells.
        </p>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onPaste={handlePaste}
          rows={7}
          autoFocus
          className="w-full rounded-lg border border-gray-300 p-2 font-mono text-sm outline-none focus:border-indigo-400"
          placeholder={'Choice\nCheck\nResult\n(a) (5,60.5)\n-17-3(60.5)=-198.5 ≠ 5\nEliminate\n...'}
        />

        {autoDetected ? (
          <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            ✓ Columns detected automatically{mode === 'numeric' ? ' (label + number columns)' : ''}. Just check the preview below.
            {mode === 'numeric' && ' If the header looks off, you can tweak its text after inserting.'}
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Columns</label>
            <input
              type="number" min={1} max={12} value={cols}
              onChange={(e) => setCols(Number(e.target.value) || 1)}
              className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
            />
            <span className="text-xs text-gray-500">Couldn&apos;t auto-detect — cells are grouped into rows of this many columns.</span>
          </div>
        )}

        {md && (
          <div className="mt-3">
            <div className="mb-1 text-xs font-semibold text-gray-500">Preview</div>
            <div className="max-h-60 overflow-auto rounded-lg border border-gray-200 p-2">{renderContent(md)}</div>
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
          <button
            onClick={() => { if (md) { onInsert(md); onClose() } }}
            disabled={!md}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Insert table
          </button>
        </div>
      </div>
    </div>
  )
}
