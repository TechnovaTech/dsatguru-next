import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../lib/igcscDb'
import { requireIgcscAuth, IGCSC_STAFF } from '../../../../lib/igcscAuth'
import { StoreError, getStoreSettings } from '../../../../lib/igcscStore'

// GET /api/igcsc/staff-overview - everything the staff dashboard shows, in one
// trip. Staff only; the money figures are for admins only.
//
//   → { counts, store, money, needsReview, recent, overdue }
//
// Names, titles and totals only: no answers, transcriptions or keys leave here.
export const dynamic = 'force-dynamic'

const DAY = 86400000
// Assignments are few; this only stops a runaway scan. Past it the overdue
// count is a floor, not exact.
const MAX_OVERDUE_SCAN = 2000

function fail(e, where) {
  if (e instanceof StoreError) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error(where, e?.message)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100
const uniqueIds = (rows, key) => [...new Map(rows.map((r) => [String(r[key]), r[key]])).values()]

// Due date passed, not taken back, and nothing handed in. A sitting still in
// progress has not been handed in, so it does not clear the assignment.
// Most recently due first.
async function findOverdue({ PaperAssignment, PaperAttempt }, now) {
  const due = await PaperAssignment.find({ revokedAt: null, dueAt: { $lt: now } })
    .select('studentId paperId dueAt')
    .sort({ dueAt: -1, _id: -1 })
    .limit(MAX_OVERDUE_SCAN)
    .lean()
  if (!due.length) return []
  // aggregate() does not cast; these came off documents, so they are ObjectIds.
  const handedIn = await PaperAttempt.aggregate([
    { $match: {
      userId: { $in: uniqueIds(due, 'studentId') },
      paperId: { $in: uniqueIds(due, 'paperId') },
      status: { $ne: 'in_progress' },
    } },
    { $group: { _id: { u: '$userId', p: '$paperId' } } },
  ])
  const done = new Set(handedIn.map((h) => `${h._id.u}|${h._id.p}`))
  return due.filter((a) => !done.has(`${a.studentId}|${a.paperId}`))
}

export async function GET(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_STAFF)
    if (auth.error) return auth.error
    const isAdmin = auth.decoded.role === 'admin'
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * DAY)
    const monthAgo = new Date(now.getTime() - 30 * DAY)

    const models = await igcscModels()
    const { IgcscUser, Paper, PaperAttempt, PaperAssignment, Order } = models

    const [
      settings,
      students,
      activeStudents,
      papersOnSale,
      papersHeld,
      writtenTally,
      completed7d,
      inProgress,
      assignedOpen,
      overdueAll,
      reviewRows,
      recentRows,
      sales,
    ] = await Promise.all([
      getStoreSettings(models),
      IgcscUser.countDocuments({ role: 'student' }),
      IgcscUser.countDocuments({ role: 'student', isActive: { $ne: false } }),
      Paper.countDocuments({ isPublished: true, missingFromBank: { $ne: true } }),
      Paper.countDocuments({ clean: { $ne: true }, missingFromBank: { $ne: true } }),
      PaperAttempt.aggregate([
        { $match: { 'written.state': { $in: ['needs_review', 'grading', 'error'] } } },
        { $group: { _id: '$written.state', n: { $sum: 1 } } },
      ]),
      PaperAttempt.countDocuments({ status: 'completed', completedAt: { $gte: weekAgo } }),
      PaperAttempt.countDocuments({ status: 'in_progress' }),
      PaperAssignment.countDocuments({ revokedAt: null }),
      findOverdue(models, now),
      PaperAttempt.aggregate([
        { $match: { 'written.state': 'needs_review' } },
        { $sort: { 'written.submittedAt': -1, _id: -1 } },
        { $limit: 6 },
        // Results carry long transcriptions; only the flag count is wanted.
        { $project: {
          userName: 1,
          paperTitle: 1,
          paperUnit: 1,
          'written.submittedAt': 1,
          flagged: { $size: { $filter: {
            input: { $ifNull: ['$results', []] },
            as: 'r',
            cond: { $and: [{ $eq: ['$$r.kind', 'written'] }, { $eq: ['$$r.flagged', true] }] },
          } } },
        } },
      ]),
      PaperAttempt.aggregate([
        { $match: { status: { $in: ['completed', 'needs_review'] } } },
        // A result still with a tutor has no completedAt yet.
        { $project: {
          userName: 1,
          paperTitle: 1,
          paperUnit: 1,
          percentage: 1,
          grade: 1,
          status: 1,
          completedAt: 1,
          at: { $ifNull: ['$completedAt', '$updatedAt'] },
        } },
        { $sort: { at: -1, _id: -1 } },
        { $limit: 8 },
      ]),
      // Grouped by currency so it can run alongside the settings read; only the
      // store's own currency is reported. Free plan claims add nothing to the
      // takings and are not counted as sales.
      isAdmin
        ? Order.aggregate([
          { $match: { status: 'paid', kind: { $ne: 'grant' }, paidAt: { $gte: monthAgo } } },
          { $group: {
            _id: '$currency',
            revenue: { $sum: '$amount' },
            orders: { $sum: { $cond: [{ $gt: ['$amount', 0] }, 1, 0] } },
          } },
        ])
        : null,
    ])

    const tally = Object.fromEntries(writtenTally.map((t) => [t._id, t.n]))

    const top = overdueAll.slice(0, 6)
    const [who, what] = top.length
      ? await Promise.all([
        IgcscUser.find({ _id: { $in: uniqueIds(top, 'studentId') } }).select('name').lean(),
        Paper.find({ _id: { $in: uniqueIds(top, 'paperId') } }).select('title unit').lean(),
      ])
      : [[], []]
    const nameById = new Map(who.map((u) => [String(u._id), u.name || '']))
    const paperById = new Map(what.map((p) => [String(p._id), p]))

    let money = null
    if (isAdmin) {
      const mine = (sales || []).find((s) => s._id === settings.currency) || {}
      money = { revenue30d: round2(mine.revenue), paidOrders30d: mine.orders || 0, currency: settings.currency }
    }

    return NextResponse.json({
      counts: {
        students,
        activeStudents,
        papersOnSale,
        papersHeld,
        needsReview: tally.needs_review || 0,
        grading: tally.grading || 0,
        markingFailed: tally.error || 0,
        completed7d,
        inProgress,
        assignedOpen,
        overdue: overdueAll.length,
      },
      store: {
        open: !!settings.storeOpen,
        currency: settings.currency,
        lastSyncAt: settings.lastSyncAt || null,
      },
      money,
      needsReview: reviewRows.map((a) => ({
        _id: String(a._id),
        userName: a.userName || '',
        paperTitle: a.paperTitle || '',
        paperUnit: a.paperUnit || '',
        submittedAt: a.written?.submittedAt || null,
        flagged: a.flagged || 0,
      })),
      recent: recentRows.map((a) => ({
        _id: String(a._id),
        userName: a.userName || '',
        paperTitle: a.paperTitle || '',
        paperUnit: a.paperUnit || '',
        percentage: a.percentage ?? null,
        grade: a.grade || '',
        status: a.status,
        completedAt: a.at || null,
      })),
      overdue: top.map((a) => {
        const p = paperById.get(String(a.paperId)) || {}
        return {
          _id: String(a._id),
          student: { _id: String(a.studentId), name: nameById.get(String(a.studentId)) || '' },
          paper: { _id: String(a.paperId), title: p.title || '', unit: p.unit || '' },
          dueAt: a.dueAt || null,
        }
      }),
    })
  } catch (e) { return fail(e, 'GET /api/igcsc/staff-overview') }
}
