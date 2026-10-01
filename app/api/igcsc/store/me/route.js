import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { igcscModels } from '../../../../../lib/igcscDb'
import { requireIgcscAuth } from '../../../../../lib/igcscAuth'
import {
  StoreError, meId, isOid, getStoreSettings, loadAccessContext, accessFor, reconcilePending,
} from '../../../../../lib/igcscStore'
import { submitMcq, MCQ_GRACE_MS } from '../../../../../lib/igcscAttempts'
import { ensureGradingProgress } from '../../../../../lib/igcscGrader'

export const dynamic = 'force-dynamic'

// GET /api/igcsc/store/me - everything the student dashboard and "My tests"
// need in one call: credits, plans, papers held, assignments, attempts, orders.
//
// Pending payments are settled with Stripe first. There is no webhook on this
// account, so a buyer who closed the tab before Stripe sent them back is only
// granted what they paid for when they next look - which is here.

const CARD_FIELDS =
  'title unit curriculum subject paperNo difficulty questionCount mcqCount writtenCount totalMarks durationMin mcqDurationMin price isPublished missingFromBank'

function fail(e, where) {
  if (e instanceof StoreError) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error(where, e?.message)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

function callerId(decoded) {
  const id = meId(decoded)
  if (!isOid(id)) throw new StoreError(401, 'Please sign in again.')
  return id
}

function toCard(paper, ctx, role) {
  const a = accessFor(ctx, paper, role)
  return {
    _id: String(paper._id),
    title: paper.title || '',
    unit: paper.unit || '',
    curriculum: paper.curriculum || '',
    subject: paper.subject || '',
    paperNo: paper.paperNo ?? null,
    difficulty: paper.difficulty || '',
    questionCount: paper.questionCount || 0,
    mcqCount: paper.mcqCount || 0,
    writtenCount: paper.writtenCount || 0,
    totalMarks: paper.totalMarks || 0,
    durationMin: paper.durationMin || 0,
    mcqDurationMin: paper.mcqDurationMin || 0,
    price: Number(paper.price || 0),
    isPublished: !!paper.isPublished,
    access: { allowed: !!a.allowed, via: a.via || null, expiresAt: a.expiresAt || null },
  }
}

const newestFirst = (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)

export async function GET(request) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    const role = auth.decoded.role
    const userId = callerId(auth.decoded)
    const uid = new mongoose.Types.ObjectId(userId)
    const models = await igcscModels()
    const { Paper, PaperAttempt, Order } = models

    // A Stripe hiccup must not take the dashboard down with it.
    let reconciled = 0
    try {
      reconciled = await reconcilePending(models, userId)
    } catch (e) {
      console.error('igcsc store/me reconcile failed:', e?.message)
    }

    // Settle attempts the dashboard would otherwise show stale: an online
    // section whose time ran out, a marking job lost to a restart.
    try {
      const overdue = await PaperAttempt.find({
        userId: uid, 'mcq.state': 'in_progress', 'mcq.deadline': { $lt: new Date(Date.now() - MCQ_GRACE_MS) },
      }).select('_id').limit(5).lean()
      for (const a of overdue) await submitMcq(models, a._id, { auto: true })
      const marking = await PaperAttempt.find({ userId: uid, 'written.state': 'grading' }).limit(5).lean()
      for (const a of marking) await ensureGradingProgress(models, a)
    } catch (e) {
      console.error('igcsc store/me settle failed:', e?.message)
    }

    // Loaded after reconciling, so a payment settled just now shows at once.
    const [settings, ctx] = await Promise.all([getStoreSettings(models), loadAccessContext(models, userId)])

    const paperEnts = [...ctx.paperEnts.values()].sort(newestFirst).slice(0, 200)
    const assigns = [...ctx.assignByPaper.values()].sort(newestFirst).slice(0, 200)
    const paperIds = [...new Set([...paperEnts, ...assigns].map((x) => String(x.paperId)))]
    const assignPaperIds = assigns.map((a) => a.paperId)

    const [paperRows, latestRows, attemptRows, orderRows] = await Promise.all([
      paperIds.length ? Paper.find({ _id: { $in: paperIds } }).select(CARD_FIELDS).lean() : [],
      // aggregate() does not cast, so the ids must already be ObjectIds.
      assignPaperIds.length
        ? PaperAttempt.aggregate([
          { $match: { userId: uid, paperId: { $in: assignPaperIds } } },
          { $sort: { createdAt: -1 } },
          { $group: {
            _id: '$paperId',
            attemptId: { $first: '$_id' },
            status: { $first: '$status' },
            percentage: { $first: '$percentage' },
            grade: { $first: '$grade' },
          } },
        ])
        : [],
      PaperAttempt.find({ userId: uid })
        .sort({ createdAt: -1 })
        .limit(50)
        .select('paperId paperTitle paperUnit status percentage grade score maxScore createdAt completedAt mcq.state written.state')
        .lean(),
      Order.find({ userId: uid })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('title kind amount currency status createdAt paidAt')
        .lean(),
    ])

    const paperById = new Map(paperRows.map((p) => [String(p._id), p]))
    const latestByPaper = new Map(latestRows.map((r) => [String(r._id), r]))

    const papers = []
    for (const e of paperEnts) {
      const p = paperById.get(String(e.paperId))
      if (!p) continue
      papers.push({ ...toCard(p, ctx, role), acquiredVia: e.source, acquiredAt: e.createdAt || null })
    }

    const assignments = []
    for (const a of assigns) {
      const p = paperById.get(String(a.paperId))
      if (!p) continue
      const l = latestByPaper.get(String(a.paperId))
      assignments.push({
        _id: String(a._id),
        paper: toCard(p, ctx, role),
        dueAt: a.dueAt || null,
        note: a.note || '',
        assignedByName: a.assignedByName || '',
        createdAt: a.createdAt || null,
        latestAttempt: l
          ? { _id: String(l.attemptId), status: l.status, percentage: l.percentage ?? null, grade: l.grade ?? null }
          : null,
      })
    }

    const plans = [...ctx.accessEnts].sort(newestFirst).map((e) => ({
      _id: String(e._id),
      planName: e.planName || '',
      scope: e.scope || 'all',
      curriculum: e.curriculum || '',
      subject: e.subject || '',
      expiresAt: e.expiresAt || null,
      source: e.source,
    }))

    const attempts = attemptRows.map((a) => ({
      _id: String(a._id),
      paperId: String(a.paperId),
      paperTitle: a.paperTitle || '',
      paperUnit: a.paperUnit || '',
      status: a.status,
      percentage: a.percentage ?? null,
      grade: a.grade ?? null,
      score: a.score ?? null,
      maxScore: a.maxScore ?? null,
      createdAt: a.createdAt || null,
      completedAt: a.completedAt || null,
      mcqState: a.mcq?.state || 'none',
      writtenState: a.written?.state || 'none',
    }))

    const orders = orderRows.map((o) => ({
      _id: String(o._id),
      title: o.title || '',
      kind: o.kind,
      amount: Number(o.amount || 0),
      currency: o.currency || settings.currency,
      status: o.status,
      createdAt: o.createdAt || null,
      paidAt: o.paidAt || null,
    }))

    return NextResponse.json({
      credits: ctx.credits,
      currency: settings.currency,
      plans,
      papers,
      assignments,
      attempts,
      orders,
      reconciled,
    })
  } catch (e) { return fail(e, 'GET /api/igcsc/store/me') }
}
