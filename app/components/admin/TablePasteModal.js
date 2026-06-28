'use client'
import { useState, useEffect } from 'react'
import { textToMarkdownTable, isGridPaste } from '../../../lib/markdownTable'
import { renderContent } from './LatexRenderer'

// Paste rows -> live-previewed markdown table -> insert. Shared by the test editors.
export default function TablePasteModal({ open, onClose, onInsert }) {
  const [raw, setRaw] = useState('')
  const [cols, setCols] = useState(3)
  useEffect(() => { if (open) { setRaw(''); setCols(3) } }, [open])
  if (!open) return null

  const grid = isGridPaste(raw)
  const md = textToMarkdownTable(raw, cols)
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Paste a table</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <p className="mb-2 text-xs text-gray-500">
          Paste your table text below. Two ways work: copy straight from a table/sheet (cells keep their Tabs), OR
          paste one cell per line and pick how many columns. The first row is the header. $...$ math works in cells.
        </p>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={7}
          autoFocus
          className="w-full rounded-lg border border-gray-300 p-2 font-mono text-sm outline-none focus:border-indigo-400"
          placeholder={'Choice\nCheck\nResult\n(a) (5,60.5)\n-17-3(60.5)=-198.5 ≠ 5\nEliminate\n...'}
        />

        <div className="mt-3 flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Columns</label>
          <input
            type="number" min={1} max={12} value={cols}
            onChange={(e) => setCols(Number(e.target.value) || 1)}
            disabled={grid}
            className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-400 disabled:bg-gray-100 disabled:text-gray-400"
          />
          <span className="text-xs text-gray-500">
            {grid ? 'Columns detected automatically from your paste (Tab/space separated).' : 'Cells are grouped into rows of this many columns.'}
          </span>
        </div>

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
