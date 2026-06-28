'use client'
import { useState, useEffect } from 'react'
import { textToMarkdownTable } from '../../../lib/markdownTable'
import { renderContent } from './LatexRenderer'

// Paste rows -> live-previewed markdown table -> insert. Shared by the test editors.
export default function TablePasteModal({ open, onClose, onInsert }) {
  const [raw, setRaw] = useState('')
  useEffect(() => { if (open) setRaw('') }, [open])
  if (!open) return null

  const md = textToMarkdownTable(raw)
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Paste a table</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <p className="mb-2 text-xs text-gray-500">
          Paste rows — one row per line, columns separated by a <b>Tab</b> (when you copy from a table/sheet) or 2+ spaces.
          The first row becomes the header. You can use $...$ for math inside cells.
        </p>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={6}
          autoFocus
          className="w-full rounded-lg border border-gray-300 p-2 font-mono text-sm outline-none focus:border-indigo-400"
          placeholder={'Choice\tCheck\tResult\n(a) (5,60.5)\t-17-3(60.5)=-198.5 ≠ 5\tEliminate\n(d) (-32,5)\t-17-3(5)=-32 ✓\tKeep!'}
        />
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
