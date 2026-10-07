// Practice sheets and period materials: what the browser and the server must
// agree on. Browser-safe - no Node imports.
//
// Every folder of the Question Bank carries a "Miscellaneous" entry. Opening it
// shows a workspace where staff upload their own PDFs, Word files and images
// for that topic: one sheet per lesson period (Period 1, Period 2, …) and any
// number of practice sheets. Students see them under Practice Sheets.

export const MAX_SHEET_MB = 50
export const MAX_SHEET_BYTES = MAX_SHEET_MB * 1024 * 1024
export const SHEET_TITLE_MAX = 160
export const MAX_PERIODS = 20

export const SHEET_KINDS = ['period', 'practice']

// The file picker's filter. The server reads the type from the bytes anyway.
export const SHEET_ACCEPT = '.pdf,.docx,.jpg,.jpeg,.png'
export const SHEET_EXT_RE = /\.(pdf|docx|jpe?g|png)$/i

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export const SHEET_TYPES = {
  'application/pdf': { ext: 'pdf', label: 'PDF' },
  [DOCX_MIME]: { ext: 'docx', label: 'Word' },
  'image/jpeg': { ext: 'jpg', label: 'JPG' },
  'image/png': { ext: 'png', label: 'PNG' },
}

export function typeLabel(mime) {
  return SHEET_TYPES[mime]?.label || 'File'
}

// One slot of the workspace: "period-1", "period-2", … or "practice".
export function slotKey(kind, period) {
  return kind === 'period' ? `period-${Number(period) || 0}` : 'practice'
}

export function slotLabel(kind, period) {
  return kind === 'period' ? `Period ${Number(period) || 0} Sheet` : 'Practice Sheet'
}

// Checks what the browser sent for kind/period; null when it makes no sense.
export function normaliseSlot(kind, period) {
  const k = SHEET_KINDS.includes(kind) ? kind : null
  if (!k) return null
  if (k !== 'period') return { kind: k, period: 0 }
  const p = Number(period)
  if (!Number.isInteger(p) || p < 1 || p > MAX_PERIODS) return null
  return { kind: k, period: p }
}

// A raw source-folder segment, as the Question Bank shows it ("01_Algebra" → "Algebra").
export function prettySeg(seg) {
  return String(seg || '').replace(/^\d+[_.)\s-]*/, '').trim() || String(seg || '')
}

export function folderCrumbs(folder) {
  return String(folder || '').split('/').filter(Boolean).map(prettySeg)
}

// A folder path as sent by the browser, with empty segments dropped. Segments
// are NOT trimmed: a few real bank folders end in a space, and the sheet's
// folder must match the bank's sourceFolder prefix exactly.
export function cleanFolder(folder) {
  return String(folder || '').split('/').filter(Boolean).join('/')
}

export function fmtSize(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  const mb = n / (1024 * 1024)
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
}

// Periods first, in order, then practice; within a slot, upload order.
export function bySlot(a, b) {
  if (a.kind !== b.kind) return a.kind === 'period' ? -1 : 1
  if (a.kind === 'period' && a.period !== b.period) return a.period - b.period
  return String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
}
