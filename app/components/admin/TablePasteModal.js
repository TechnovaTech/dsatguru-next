'use client'
import { useState, useEffect } from 'react'
import { textToMarkdownTable, detectTableMode } from '../../../lib/markdownTable'
import { renderContent } from './LatexRenderer'

// When copying from a web page / Google Sheet / Docs, the clipboard carries the real table
// structure as HTML. Parse it into a proper grid honoring colspan AND rowspan, drop decorative
// group-headers (a header cell that spans multiple columns), and merge multi-row headers into a
// single clean header row. Far more reliable than guessing from plain text.
// Read a table cell's text WITHOUT mashing multi-value cells together. A cell that stacks
// several values via <br> or block children (e.g. College Board "ways to enter answer":
// 3.5 / 3.50 / 7/2) is joined with ", " instead of being concatenated into "3.53.507/2".
function readCellText(cell) {
  try {
    const clone = cell.cloneNode(true)
    clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'))
    clone.querySelectorAll('p, div, li, tr').forEach((el) => { el.insertAdjacentText('beforeend', '\n') })
    // Each stacked value becomes its own line, joined with <br> so the rendered table cell shows
    // them on separate lines (e.g. 3.5 / 3.50 / 7/2) instead of mashed into "3.53.507/2".
    const lines = (clone.textContent || '').split('\n').map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean)
    return lines.join('<br>')
  } catch {
    return (cell.textContent || '').replace(/\s+/g, ' ').trim()
  }
}

function htmlTableToTabs(html) {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const table = doc.querySelector('table')
    if (!table) return null
    const trs = [...table.querySelectorAll('tr')]
    if (!trs.length) return null

    const matrix = []
    const headerFlag = []
    const occupied = new Set()
    const key = (r, c) => r + ':' + c

    for (let r = 0; r < trs.length; r++) {
      if (!matrix[r]) matrix[r] = []
      const cells = [...trs[r].children].filter((el) => /^(td|th)$/i.test(el.tagName))
      let thCount = 0
      let c = 0
      for (const cell of cells) {
        while (occupied.has(key(r, c))) c++
        const isTh = /^th$/i.test(cell.tagName)
        if (isTh) thCount++
        const cs = parseInt(cell.getAttribute('colspan') || '1', 10) || 1
        const rs = parseInt(cell.getAttribute('rowspan') || '1', 10) || 1
        const text = readCellText(cell)
        // Drop a header cell that spans multiple columns — it's a decorative group label
        // (e.g. "Singlet Color") that a flat markdown table can't represent.
        const cellText = (isTh && cs > 1) ? '' : text
        for (let dr = 0; dr < rs; dr++) {
          for (let dc = 0; dc < cs; dc++) {
            const rr = r + dr, cc = c + dc
            if (!matrix[rr]) matrix[rr] = []
            matrix[rr][cc] = (dr === 0 && dc === 0) ? cellText : ''
            occupied.add(key(rr, cc))
          }
        }
        c += cs
      }
      headerFlag[r] = !!trs[r].closest('thead') || (cells.length > 0 && thCount === cells.length)
    }

    const cols = Math.max(...matrix.map((row) => row.length))
    if (!cols) return null
    const norm = matrix.map((row) => { const x = []; for (let k = 0; k < cols; k++) x[k] = row[k] != null ? row[k] : ''; return x })

    // Leading header rows -> merge into a single header row (column-wise).
    let h = 0
    while (h < norm.length && headerFlag[h]) h++
    let headerRows, bodyRows
    if (h >= 1) { headerRows = norm.slice(0, h); bodyRows = norm.slice(h) }
    else { headerRows = [norm[0]]; bodyRows = norm.slice(1) }

    const header = []
    for (let c = 0; c < cols; c++) {
      const parts = headerRows.map((row) => row[c]).filter(Boolean)
      header.push([...new Set(parts)].join(' ').trim())
    }
    const out = [header, ...bodyRows].filter((r) => r.some((c) => String(c).length))
    if (!out.length) return null
    return out.map((r) => r.join('\t')).join('\n')
  } catch { return null }
}

// Paste rows -> live-previewed markdown table -> insert. Shared by the test editors.
export default function TablePasteModal({ open, onClose, onInsert }) {
  const [raw, setRaw] = useState('')
  const [cols, setCols] = useState(3)
  useEffect(() => { if (open) { setRaw(''); setCols(3) } }, [open])
  // Esc must close THIS modal first — capture phase + stopImmediatePropagation so it doesn't
  // fall through to the edit card behind it (which has its own Escape handler).
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); onClose() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])
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
