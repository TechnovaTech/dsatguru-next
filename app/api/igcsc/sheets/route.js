import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../lib/igcscDb'
import { requireIgcscAuth, IGCSC_STAFF } from '../../../../lib/igcscAuth'
import { StoreError, meId, isStaffRole } from '../../../../lib/igcscStore'
import { sniffSheet, saveSheetFile, deleteSheetFile } from '../../../../lib/igcscFiles'
import { sheetView } from '../../../../lib/igcscSheets'
import {
  MAX_SHEET_BYTES, MAX_SHEET_MB, SHEET_TITLE_MAX, normaliseSlot, cleanFolder,
} from '../../../../lib/igcscSheetsShared'
import { rateLimit } from '../../../../lib/rateLimit'

// Practice sheets and period materials, filed under a Question Bank folder.
//
//   GET  ?curriculum&subject&folder      → { sheets }  one folder's workspace
//   GET  ?mode=counts&curriculum&subject → { counts }  { [folder]: n }, staff
//   GET  ?mode=all                       → { sheets }  everything the caller may see
//   POST multipart                       → 201 { sheet } staff: file + curriculum,
//                                          subject, folder, kind, period, title
//
// A student only ever sees sheets marked visible to students.
export const dynamic = 'force-dynamic'

// Room for the multipart boundary and the text fields around the file.
const FORM_OVERHEAD = 256 * 1024
const FOLDER_MAX = 600
const ALL_LIMIT = 5000

function fail(e, where) {
  if (e instanceof StoreError) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error(where, e?.message)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const tooLarge = () => new StoreError(413, `That file is too large - the limit is ${MAX_SHEET_MB} MB.`)

export async function GET(request) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    const staff = isStaffRole(auth.decoded.role)
    const sp = new URL(request.url).searchParams
    const mode = sp.get('mode') || 'list'
    const { PracticeSheet } = await igcscModels()

    if (mode === 'all') {
      const q = staff ? {} : { visibleToStudents: { $ne: false } }
      const rows = await PracticeSheet.find(q)
        .sort({ curriculum: 1, subject: 1, folder: 1, kind: 1, period: 1, createdAt: 1 })
        .limit(ALL_LIMIT)
        .lean()
      return NextResponse.json({ sheets: rows.map(sheetView) })
    }

    const curriculum = String(sp.get('curriculum') || '')
    const subject = String(sp.get('subject') || '')
    if (!curriculum || !subject) throw new StoreError(400, 'curriculum and subject are required')

    if (mode === 'counts') {
      if (!staff) throw new StoreError(403, 'Forbidden')
      const rows = await PracticeSheet.aggregate([
        { $match: { curriculum, subject } },
        { $group: { _id: { $ifNull: ['$folder', ''] }, n: { $sum: 1 } } },
      ])
      const counts = {}
      for (const r of rows) counts[r._id || ''] = r.n
      return NextResponse.json({ counts })
    }

    const folder = cleanFolder(sp.get('folder'))
    const q = { curriculum, subject, folder }
    if (!staff) q.visibleToStudents = { $ne: false }
    const rows = await PracticeSheet.find(q).sort({ kind: 1, period: 1, createdAt: 1 }).lean()
    return NextResponse.json({ curriculum, subject, folder, sheets: rows.map(sheetView) })
  } catch (e) { return fail(e, 'GET /api/igcsc/sheets') }
}

export async function POST(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_STAFF)
    if (auth.error) return auth.error
    const userId = meId(auth.decoded)
    const rl = rateLimit('igcsc-sheet-upload:' + (userId || 'anon'), { max: 30, windowMs: 60000 })
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many uploads. Please wait a moment and try again.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } },
      )
    }

    // Refuse an oversized body before reading any of it.
    const declared = Number(request.headers.get('content-length') || 0)
    if (declared > MAX_SHEET_BYTES + FORM_OVERHEAD) throw tooLarge()

    let form
    try {
      form = await request.formData()
    } catch {
      throw new StoreError(400, 'Send the sheet as a file upload.')
    }
    const text = (k) => String(form.get(k) ?? '')
    const curriculum = text('curriculum').trim()
    const subject = text('subject').trim()
    const folder = cleanFolder(text('folder'))
    if (!curriculum || !subject) throw new StoreError(400, 'Which subject does this sheet belong to?')
    if (folder.length > FOLDER_MAX) throw new StoreError(400, 'That folder path is too long.')
    const slot = normaliseSlot(text('kind') || 'practice', text('period') || 0)
    if (!slot) throw new StoreError(400, 'Choose a period or the practice sheets.')

    const file = form.get('file')
    if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
      throw new StoreError(400, 'Choose a file to upload.')
    }
    if (Number(file.size) > MAX_SHEET_BYTES) throw tooLarge()
    const buf = Buffer.from(await file.arrayBuffer())
    if (buf.length > MAX_SHEET_BYTES) throw tooLarge()
    if (!buf.length) throw new StoreError(400, 'That file is empty.')
    const fileName = String(file.name || '').slice(0, 255)
    const mime = sniffSheet(buf, fileName)
    if (!mime) throw new StoreError(415, 'Upload a PDF, Word (.docx), JPG or PNG file.')

    const title = (text('title').trim() || fileName.replace(/\.[^.]+$/, '').trim() || 'Sheet').slice(0, SHEET_TITLE_MAX)

    // The folder must be a real place in the bank: a sheet is filed under a
    // node of the tree, which is a prefix of its papers' source folders.
    const models = await igcscModels()
    const where = { curriculum, subject, isActive: { $ne: false } }
    if (folder) where.sourceFolder = { $regex: `^${escapeRe(folder)}(/|$)` }
    const exists = await models.Question.exists(where)
    if (!exists) throw new StoreError(404, 'That folder is not in the Question Bank.')

    const stored = await saveSheetFile(buf, mime)
    let doc
    try {
      doc = await models.PracticeSheet.create({
        curriculum, subject, folder,
        kind: slot.kind, period: slot.period,
        title, fileName, file: stored, mime, size: buf.length,
        visibleToStudents: true,
        uploadedBy: userId,
        uploadedByName: String(auth.decoded.name || auth.decoded.email || ''),
      })
    } catch (e) {
      await deleteSheetFile(stored)
      throw e
    }
    return NextResponse.json({ sheet: sheetView(doc) }, { status: 201 })
  } catch (e) { return fail(e, 'POST /api/igcsc/sheets') }
}
