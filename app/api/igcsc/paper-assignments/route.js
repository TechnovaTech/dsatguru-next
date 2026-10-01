import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../lib/igcscDb'
import { requireIgcscAuth, IGCSC_STAFF } from '../../../../lib/igcscAuth'
import { StoreError, meId, isOid } from '../../../../lib/igcscStore'

// Tutors handing papers to students. Staff only.
//
//   GET    ?studentId&paperId&all=1 → { assignments }   newest 300; all=1 includes revoked
//   POST   { studentIds, paperIds, dueAt?, note? } → { assigned }
//   DELETE ?id → { ok }
//
// One row per (paper, student) for good: assigning again updates it and clears
// any revoke, so a student never ends up with two copies of one assignment.
// An assignment opens the paper whether or not it is on sale.
export const dynamic = 'force-dynamic'

const MAX_PEOPLE = 50
const MAX_PAPERS = 50
const MAX_NOTE = 300

function fail(e, where) {
  if (e instanceof StoreError) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error(where, e?.message)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

// A list of distinct ids from a body, or an error message.
function idList(v, max, what) {
  if (!Array.isArray(v) || !v.length) return { error: `Choose at least one ${what}.` }
  const ids = [...new Set(v.map((x) => (typeof x === 'string' ? x.trim() : '')))]
  if (ids.some((id) => !isOid(id))) return { error: `Unknown ${what} in the list.` }
  if (ids.length > max) return { error: `Choose at most ${max} ${what}s at a time.` }
  return { ids }
}

function readDue(v) {
  if (v === undefined || v === null || v === '') return { dueAt: null }
  if (typeof v !== 'string' && typeof v !== 'number') return { error: 'That due date is not valid.' }
  const d = new Date(v)
  const y = d.getUTCFullYear()
  if (Number.isNaN(d.getTime()) || y < 2000 || y > 2100) return { error: 'That due date is not valid.' }
  return { dueAt: d }
}

export async function GET(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_STAFF)
    if (auth.error) return auth.error
    const sp = new URL(request.url).searchParams

    const where = {}
    const studentId = String(sp.get('studentId') || '').trim()
    const paperId = String(sp.get('paperId') || '').trim()
    if (studentId) {
      if (!isOid(studentId)) throw new StoreError(400, 'Unknown student.')
      where.studentId = studentId
    }
    if (paperId) {
      if (!isOid(paperId)) throw new StoreError(400, 'Unknown paper.')
      where.paperId = paperId
    }
    if (sp.get('all') !== '1') where.revokedAt = null

    const { PaperAssignment, Paper, IgcscUser, PaperAttempt } = await igcscModels()
    // updatedAt, so a paper assigned again comes back to the top.
    const rows = await PaperAssignment.find(where).sort({ updatedAt: -1, _id: -1 }).limit(300).lean()
    if (!rows.length) return NextResponse.json({ assignments: [] })

    const paperIds = [...new Map(rows.map((r) => [String(r.paperId), r.paperId])).values()]
    const studentIds = [...new Map(rows.map((r) => [String(r.studentId), r.studentId])).values()]
    const [papers, students, latest] = await Promise.all([
      Paper.find({ _id: { $in: paperIds } }).select('title unit curriculum subject').lean(),
      IgcscUser.find({ _id: { $in: studentIds } }).select('name email').lean(),
      // aggregate() does not cast; the ids came off documents, so they are ObjectIds.
      PaperAttempt.aggregate([
        { $match: { userId: { $in: studentIds }, paperId: { $in: paperIds } } },
        { $sort: { createdAt: -1 } },
        { $group: {
          _id: { u: '$userId', p: '$paperId' },
          attemptId: { $first: '$_id' },
          status: { $first: '$status' },
          percentage: { $first: '$percentage' },
          grade: { $first: '$grade' },
        } },
      ]),
    ])

    const paperById = new Map(papers.map((p) => [String(p._id), p]))
    const studentById = new Map(students.map((s) => [String(s._id), s]))
    const latestByPair = new Map(latest.map((l) => [`${l._id.u}|${l._id.p}`, l]))

    const assignments = rows.map((a) => {
      const p = paperById.get(String(a.paperId)) || {}
      const s = studentById.get(String(a.studentId)) || {}
      const l = latestByPair.get(`${a.studentId}|${a.paperId}`)
      return {
        _id: String(a._id),
        paper: {
          _id: String(a.paperId),
          title: p.title || '',
          unit: p.unit || '',
          curriculum: p.curriculum || '',
          subject: p.subject || '',
        },
        student: { _id: String(a.studentId), name: s.name || '', email: s.email || '' },
        dueAt: a.dueAt || null,
        note: a.note || '',
        assignedByName: a.assignedByName || '',
        createdAt: a.createdAt || null,
        revokedAt: a.revokedAt || null,
        latestAttempt: l
          ? { _id: String(l.attemptId), status: l.status, percentage: l.percentage ?? null, grade: l.grade ?? null }
          : null,
      }
    })
    return NextResponse.json({ assignments })
  } catch (e) { return fail(e, 'GET /api/igcsc/paper-assignments') }
}

export async function POST(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_STAFF)
    if (auth.error) return auth.error
    const raw = await request.json().catch(() => null)
    const body = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}

    const people = idList(body.studentIds, MAX_PEOPLE, 'student')
    if (people.error) throw new StoreError(400, people.error)
    const papersIn = idList(body.paperIds, MAX_PAPERS, 'paper')
    if (papersIn.error) throw new StoreError(400, papersIn.error)
    const due = readDue(body.dueAt)
    if (due.error) throw new StoreError(400, due.error)
    if (body.note != null && typeof body.note !== 'string') throw new StoreError(400, 'The note must be text.')
    const note = String(body.note || '').trim()
    if (note.length > MAX_NOTE) throw new StoreError(400, `Keep the note to ${MAX_NOTE} characters.`)

    const { IgcscUser, Paper, PaperAssignment } = await igcscModels()
    const [students, papers] = await Promise.all([
      IgcscUser.find({ _id: { $in: people.ids }, role: 'student', isActive: { $ne: false } }).select('_id').lean(),
      Paper.find({ _id: { $in: papersIn.ids } }).select('_id missingFromBank').lean(),
    ])
    if (students.length !== people.ids.length) {
      throw new StoreError(400, 'Some of those people are not students, or no longer exist.')
    }
    if (papers.length !== papersIn.ids.length) throw new StoreError(400, 'Some of those papers no longer exist.')
    // Its questions have left the bank, so it could not be started.
    const gone = papers.filter((p) => p.missingFromBank).length
    if (gone) throw new StoreError(400, `${gone} of those papers ${gone === 1 ? 'is' : 'are'} no longer in the question bank.`)

    const set = {
      assignedBy: meId(auth.decoded),
      assignedByName: String(auth.decoded.name || auth.decoded.email || ''),
      dueAt: due.dueAt,
      note,
      revokedAt: null,
    }
    const ops = []
    for (const s of students) {
      for (const p of papers) {
        ops.push({
          updateOne: {
            filter: { paperId: p._id, studentId: s._id },
            // A copy each: casting adds the timestamps into the object it is given.
            update: { $set: { ...set } },
            upsert: true,
          },
        })
      }
    }
    await PaperAssignment.bulkWrite(ops, { ordered: false })
    return NextResponse.json({ assigned: ops.length })
  } catch (e) { return fail(e, 'POST /api/igcsc/paper-assignments') }
}

export async function DELETE(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_STAFF)
    if (auth.error) return auth.error
    const id = String(new URL(request.url).searchParams.get('id') || '').trim()
    if (!isOid(id)) throw new StoreError(404, 'That assignment was not found.')

    const { PaperAssignment } = await igcscModels()
    // A second revoke keeps the first date.
    const r = await PaperAssignment.updateOne({ _id: id, revokedAt: null }, { $set: { revokedAt: new Date() } })
    if (!r.matchedCount && !(await PaperAssignment.exists({ _id: id }))) {
      throw new StoreError(404, 'That assignment was not found.')
    }
    return NextResponse.json({ ok: true })
  } catch (e) { return fail(e, 'DELETE /api/igcsc/paper-assignments') }
}
