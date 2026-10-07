import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../lib/igcscDb'
import { requireIgcscAuth, IGCSC_STAFF } from '../../../../../lib/igcscAuth'
import { StoreError, isOid } from '../../../../../lib/igcscStore'
import { deleteSheetFile } from '../../../../../lib/igcscFiles'
import { SHEET_TITLE_MAX, normaliseSlot } from '../../../../../lib/igcscSheetsShared'
import { sheetView } from '../../../../../lib/igcscSheets'

// One practice sheet, staff only.
//   PATCH  { title?, kind?, period?, visibleToStudents? } → { sheet }
//   DELETE                                                → { ok }
export const dynamic = 'force-dynamic'

function fail(e, where) {
  if (e instanceof StoreError) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error(where, e?.message)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

const notFound = () => new StoreError(404, 'That sheet was not found.')

export async function PATCH(request, { params }) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_STAFF)
    if (auth.error) return auth.error
    const id = String(params?.id || '')
    if (!isOid(id)) throw notFound()
    const body = await request.json().catch(() => ({}))
    const { PracticeSheet } = await igcscModels()

    const set = {}
    if (body.title !== undefined) {
      const title = String(body.title || '').trim().slice(0, SHEET_TITLE_MAX)
      if (!title) throw new StoreError(400, 'Give the sheet a name.')
      set.title = title
    }
    if (body.kind !== undefined || body.period !== undefined) {
      const cur = await PracticeSheet.findById(id).select('kind period').lean()
      if (!cur) throw notFound()
      const slot = normaliseSlot(body.kind ?? cur.kind, body.period ?? cur.period)
      if (!slot) throw new StoreError(400, 'Choose a period or the practice sheets.')
      set.kind = slot.kind
      set.period = slot.period
    }
    if (body.visibleToStudents !== undefined) set.visibleToStudents = !!body.visibleToStudents
    if (!Object.keys(set).length) throw new StoreError(400, 'Nothing to change.')

    const doc = await PracticeSheet.findByIdAndUpdate(id, { $set: set }, { new: true }).lean()
    if (!doc) throw notFound()
    return NextResponse.json({ sheet: sheetView(doc) })
  } catch (e) { return fail(e, 'PATCH /api/igcsc/sheets/[id]') }
}

export async function DELETE(request, { params }) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_STAFF)
    if (auth.error) return auth.error
    const id = String(params?.id || '')
    if (!isOid(id)) throw notFound()
    const { PracticeSheet } = await igcscModels()
    // The row goes first: a file with no row is a stray byte on disk, a row
    // with no file is a broken link in front of a student.
    const doc = await PracticeSheet.findByIdAndDelete(id).lean()
    if (!doc) throw notFound()
    if (doc.file) await deleteSheetFile(doc.file)
    return NextResponse.json({ ok: true })
  } catch (e) { return fail(e, 'DELETE /api/igcsc/sheets/[id]') }
}
