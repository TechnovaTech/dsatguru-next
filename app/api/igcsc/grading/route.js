import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../lib/igcscDb'
import { requireIgcscAuth, IGCSC_STAFF } from '../../../../lib/igcscAuth'
import { StoreError } from '../../../../lib/igcscStore'
import { computeTotals, recomputeTotals } from '../../../../lib/igcscAttempts'
import { ensureGradingProgress } from '../../../../lib/igcscGrader'

// GET /api/igcsc/grading ?status&q&page&limit - the written-marking queue.
// Staff only.
//
//   status: needs_review (default) | grading | error | graded | all
//   → { attempts, total, page, pages, counts: { needs_review, grading, error, graded } }
//
// Only attempts whose written answers were sent for marking appear here.
// Counts follow the search but not the status tab - they ARE the tabs.
//
// The page refreshes this while anything is being marked, so it also restarts
// a marking job lost to a server restart - the student may have closed their tab.
export const dynamic = 'force-dynamic'

const STATES = ['needs_review', 'grading', 'error', 'graded']

function fail(e, where) {
  if (e instanceof StoreError) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error(where, e?.message)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const int = (v, fallback) => {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : fallback
}

export async function GET(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_STAFF)
    if (auth.error) return auth.error
    const sp = new URL(request.url).searchParams
    const page = Math.max(1, int(sp.get('page'), 1))
    const limit = Math.min(100, Math.max(1, int(sp.get('limit'), 30)))
    const asked = sp.get('status')
    const status = asked === 'all' || STATES.includes(asked) ? asked : 'needs_review'

    const search = {}
    const q = String(sp.get('q') || '').trim().slice(0, 100)
    if (q) {
      const rx = new RegExp(escapeRe(q), 'i')
      search.$or = [{ userName: rx }, { userEmail: rx }, { paperTitle: rx }, { paperUnit: rx }]
    }
    const where = { ...search, 'written.state': status === 'all' ? { $in: STATES } : status }

    const models = await igcscModels()
    const { PaperAttempt } = models
    const [rows, total, tally] = await Promise.all([
      PaperAttempt.aggregate([
        { $match: where },
        { $sort: { 'written.submittedAt': -1, _id: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        // Results carry long transcriptions; only the flag count is wanted.
        { $project: {
          userName: 1,
          userEmail: 1,
          paperTitle: 1,
          paperUnit: 1,
          status: 1,
          'written.state': 1,
          'written.submittedAt': 1,
          'written.gradedAt': 1,
          'written.score': 1,
          'written.max': 1,
          'written.model': 1,
          'written.gradingStartedAt': 1,
          'written.tries': 1,
          flagged: { $size: { $filter: {
            input: { $ifNull: ['$results', []] },
            as: 'r',
            cond: { $and: [{ $eq: ['$$r.kind', 'written'] }, { $eq: ['$$r.flagged', true] }] },
          } } },
        } },
      ]),
      PaperAttempt.countDocuments(where),
      PaperAttempt.aggregate([
        { $match: { ...search, 'written.state': { $in: STATES } } },
        { $group: { _id: '$written.state', n: { $sum: 1 } } },
      ]),
    ])

    const counts = Object.fromEntries(STATES.map((s) => [s, 0]))
    for (const t of tally) if (STATES.includes(t._id)) counts[t._id] = t.n

    for (const row of rows) {
      if (row.written?.state !== 'grading') continue
      // The same object back means nothing needed doing; otherwise it is the
      // whole document, re-read.
      let fresh = await ensureGradingProgress(models, row)
      if (!fresh || fresh === row) continue
      if (computeTotals(fresh).status !== fresh.status) fresh = (await recomputeTotals(models, fresh._id)) || fresh
      row.status = fresh.status
      row.written.state = fresh.written?.state || row.written.state
    }

    const attempts = rows.map((a) => ({
      _id: String(a._id),
      userName: a.userName || '',
      userEmail: a.userEmail || '',
      paperTitle: a.paperTitle || '',
      paperUnit: a.paperUnit || '',
      status: a.status,
      writtenState: a.written?.state || 'none',
      submittedAt: a.written?.submittedAt || null,
      gradedAt: a.written?.gradedAt || null,
      writtenScore: a.written?.score ?? null,
      writtenMax: a.written?.max || 0,
      flagged: a.flagged || 0,
      model: a.written?.model || '',
    }))

    return NextResponse.json({
      attempts,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      counts,
    })
  } catch (e) { return fail(e, 'GET /api/igcsc/grading') }
}
