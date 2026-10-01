import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../lib/igcscDb'
import { requireIgcscAuth, IGCSC_STAFF } from '../../../../../lib/igcscAuth'
import { StoreError, meId, isOid } from '../../../../../lib/igcscStore'
import {
  loadAttemptFor, attemptView, expireIfDue, computeTotals, recomputeTotals, claimWrittenGrading,
} from '../../../../../lib/igcscAttempts'
import { ensureGradingProgress, applyReview, enqueueGrading } from '../../../../../lib/igcscGrader'
import { loadPaperQuestions } from '../../../../../lib/igcscPapers'
import { rateLimit } from '../../../../../lib/rateLimit'

// One attempt's written marking, as a tutor reviews it. Staff only.
//
//   GET   → { attempt, questions }   everything, mark schemes included
//   PATCH { updates: [{ questionId, marksAwarded?, feedback? }], confirm? } → { attempt }
//   POST  { action: 'regrade' } → { attempt }   run the AI marker again
//
// Confirming clears every flag and releases the marks to the student as final.
export const dynamic = 'force-dynamic'

const Q_FIELDS = 'questionText options correctAnswer answerText marks isMCQ hasFigure questionImage topic subtopic difficulty order'
const MAX_UPDATES = 300
const REVIEWABLE = ['graded', 'needs_review']

function fail(e, where) {
  if (e instanceof StoreError) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error(where, e?.message)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

function tooMany(rl) {
  return NextResponse.json(
    { error: 'Too many requests. Please wait a moment and try again.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } },
  )
}

// Submit an MCQ section whose time ran out, restart marking lost to a restart,
// and correct a status either of those left behind - before anyone sees it.
async function settle(models, att) {
  let a = await expireIfDue(models, att)
  if (a) a = await ensureGradingProgress(models, a)
  if (a && computeTotals(a).status !== a.status) a = await recomputeTotals(models, a._id)
  if (!a) throw new StoreError(404, 'That test was not found.')
  return a
}

// Every question of the attempt in printed order, with the mark scheme and the
// expected final answer beside it. `kind` is what the attempt was sat as.
async function reviewQuestions(models, att) {
  const paper = await models.Paper.findById(att.paperId).select('curriculum subject sourceFolder course').lean()
  if (!paper) return []
  const mcqIds = new Set((att.mcq?.questionIds || []).map(String))
  const writtenIds = new Set((att.written?.questionIds || []).map(String))
  const resultById = new Map((att.results || []).map((r) => [String(r.questionId), r]))
  const entries = await loadPaperQuestions(models.Question, paper, { fields: Q_FIELDS, any: true })

  const out = []
  for (const { q, cls, n } of entries) {
    const id = String(q._id)
    const kind = mcqIds.has(id) ? 'mcq' : writtenIds.has(id) ? 'written' : ''
    if (!kind) continue
    const r = resultById.get(id)
    out.push({
      questionId: id,
      n: r?.n ?? (Number(att.numbers?.[id]) || n),
      kind,
      marks: r?.maxMarks ?? cls.marks,
      text: q.questionText || '',
      options: kind === 'mcq' ? cls.letters.map((L) => ({ letter: L, text: q.options?.[L] || '' })) : undefined,
      markScheme: q.answerText || '',
      finalAnswer: kind === 'written' ? q.correctAnswer || '' : '',
      // Same rule as the student's paper: the figure when there is one.
      image: q.questionImage && (q.hasFigure || kind !== 'mcq') ? q.questionImage : '',
    })
  }
  return out.sort((a, b) => (a.n || 0) - (b.n || 0))
}

// Only plain values reach applyReview: an id, a number, a string.
function readUpdates(v) {
  if (v === undefined || v === null) return { updates: [] }
  if (!Array.isArray(v)) return { error: 'Send the changes as a list.' }
  if (v.length > MAX_UPDATES) return { error: 'Too many changes at once.' }
  const updates = []
  for (const u of v) {
    if (!u || typeof u !== 'object') return { error: 'One of the changes is not valid.' }
    const questionId = typeof u.questionId === 'string' ? u.questionId.trim() : ''
    if (!isOid(questionId)) return { error: 'One of the changes names an unknown question.' }
    const next = { questionId }
    if (u.marksAwarded !== undefined && u.marksAwarded !== null && u.marksAwarded !== '') {
      const m = typeof u.marksAwarded === 'number' || typeof u.marksAwarded === 'string' ? Number(u.marksAwarded) : NaN
      if (!Number.isFinite(m) || m < 0) return { error: 'Marks must be a number from 0 up to the question\'s maximum.' }
      next.marksAwarded = m
    }
    if (u.feedback !== undefined && u.feedback !== null) {
      if (typeof u.feedback !== 'string') return { error: 'Feedback must be text.' }
      next.feedback = u.feedback.slice(0, 1200)
    }
    updates.push(next)
  }
  return { updates }
}

export async function GET(request, { params }) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_STAFF)
    if (auth.error) return auth.error
    const models = await igcscModels()
    const att = await settle(models, await loadAttemptFor(models, auth.decoded, String(params?.id || '')))
    const questions = await reviewQuestions(models, att)
    return NextResponse.json({ attempt: attemptView(att, { staff: true }), questions })
  } catch (e) { return fail(e, 'GET /api/igcsc/grading/[id]') }
}

export async function PATCH(request, { params }) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_STAFF)
    if (auth.error) return auth.error
    const raw = await request.json().catch(() => null)
    const body = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
    const { updates, error } = readUpdates(body.updates)
    if (error) throw new StoreError(400, error)
    const confirm = body.confirm === true
    if (!updates.length && !confirm) throw new StoreError(400, 'Nothing to save.')

    const models = await igcscModels()
    const att = await loadAttemptFor(models, auth.decoded, String(params?.id || ''))
    // While the AI is marking, its results are about to be replaced; before
    // it has, there is nothing to review.
    const state = att.written?.state || 'none'
    if (state === 'grading') throw new StoreError(409, 'The AI is still marking this paper. Try again in a minute.')
    if (!REVIEWABLE.includes(state)) throw new StoreError(409, 'There are no marked written answers to review.')

    const fresh = await applyReview(models, att._id, {
      updates,
      confirm,
      reviewer: String(auth.decoded.name || auth.decoded.email || ''),
    })
    if (!fresh) throw new StoreError(404, 'That test was not found.')
    return NextResponse.json({ attempt: attemptView(fresh, { staff: true }) })
  } catch (e) { return fail(e, 'PATCH /api/igcsc/grading/[id]') }
}

export async function POST(request, { params }) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_STAFF)
    if (auth.error) return auth.error
    const raw = await request.json().catch(() => null)
    const body = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
    if (body.action !== 'regrade') throw new StoreError(400, 'Unknown action.')
    // Each run is a paid AI call.
    const rl = rateLimit('igcsc-regrade:' + meId(auth.decoded), { max: 10, windowMs: 60000 })
    if (!rl.ok) return tooMany(rl)

    const models = await igcscModels()
    const att = await loadAttemptFor(models, auth.decoded, String(params?.id || ''))
    const claimed = await claimWrittenGrading(models, att._id, { from: ['not_started', 'error', 'graded', 'needs_review'] })
    if (!claimed) {
      const state = att.written?.state || 'none'
      if (state === 'grading') throw new StoreError(409, 'The AI is already marking this paper.')
      if (state === 'none') throw new StoreError(409, 'This paper has no written section.')
      throw new StoreError(409, 'There are no photos of answers to mark.')
    }
    // Before the job is queued, so this can never overwrite what the marker writes.
    const fresh = (await recomputeTotals(models, claimed._id)) || claimed
    enqueueGrading(claimed._id)
    return NextResponse.json({ attempt: attemptView(fresh, { staff: true }) })
  } catch (e) { return fail(e, 'POST /api/igcsc/grading/[id]') }
}
