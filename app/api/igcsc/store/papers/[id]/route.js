import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../../lib/igcscDb'
import { requireIgcscAuth } from '../../../../../../lib/igcscAuth'
import {
  StoreError, meId, isOid, isStaffRole, getStoreSettings, loadAccessContext, accessFor,
} from '../../../../../../lib/igcscStore'

export const dynamic = 'force-dynamic'

// GET /api/igcsc/store/papers/[id] - one paper's store page: what is in it,
// whether the caller can open it, and their attempts at it.
//
// A student only sees a paper that is on sale or one they already hold - an
// unpublished paper answers 404, not 403, so its existence is not given away.

const DETAIL_FIELDS =
  'title unit curriculum subject paperNo difficulty questionCount mcqCount writtenCount totalMarks mcqMarks writtenMarks durationMin mcqDurationMin price isPublished missingFromBank topic subtopic holdReason'

function fail(e, where) {
  if (e instanceof StoreError) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error(where, e?.message)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

export async function GET(request, { params }) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    const role = auth.decoded.role
    const userId = meId(auth.decoded)
    if (!isOid(userId)) throw new StoreError(401, 'Please sign in again.')
    const id = String(params?.id || '')
    if (!isOid(id)) throw new StoreError(404, 'That paper was not found.')

    const models = await igcscModels()
    const paper = await models.Paper.findById(id).select(DETAIL_FIELDS).lean()
    if (!paper) throw new StoreError(404, 'That paper was not found.')

    const staff = isStaffRole(role)
    const [settings, ctx, attemptRows] = await Promise.all([
      getStoreSettings(models),
      loadAccessContext(models, userId),
      models.PaperAttempt.find({ userId, paperId: paper._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .select('status percentage grade score maxScore createdAt completedAt mcq.state written.state')
        .lean(),
    ])

    const a = accessFor(ctx, paper, role)
    const access = { allowed: !!a.allowed, via: a.via || null, expiresAt: a.expiresAt || null }
    const onSale = paper.isPublished && !paper.missingFromBank
    if (!staff && !onSale && !access.allowed) throw new StoreError(404, 'That paper was not found.')

    const card = {
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
      access,
      topic: paper.topic || '',
      subtopic: paper.subtopic || '',
    }
    // Why a paper is held back is an admin's business, not a buyer's.
    if (staff) card.holdReason = paper.holdReason || ''

    const attempts = attemptRows.map((t) => ({
      _id: String(t._id),
      status: t.status,
      percentage: t.percentage ?? null,
      grade: t.grade ?? null,
      score: t.score ?? null,
      maxScore: t.maxScore ?? null,
      createdAt: t.createdAt || null,
      completedAt: t.completedAt || null,
      mcqState: t.mcq?.state || 'none',
      writtenState: t.written?.state || 'none',
    }))

    return NextResponse.json({
      paper: card,
      access,
      credits: ctx.credits,
      currency: settings.currency,
      storeOpen: !!settings.storeOpen,
      attempts,
    })
  } catch (e) { return fail(e, 'GET /api/igcsc/store/papers/[id]') }
}
