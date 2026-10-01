import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../../lib/igcscDb'
import { requireIgcscAuth } from '../../../../../../lib/igcscAuth'
import { StoreError, meId, isOid } from '../../../../../../lib/igcscStore'
import {
  loadAttemptFor, assertOwner, attemptView, expireIfDue, startMcq, mcqQuestions, mcqTimeUp,
  saveMcqAnswer, submitMcq,
} from '../../../../../../lib/igcscAttempts'
import { rateLimit } from '../../../../../../lib/rateLimit'

// The online MCQ section. Owner only - staff look, they do not sit.
//
//   GET   → { attempt, questions, answers, deadline, serverNow }   starts the clock
//         → { attempt, submitted: true }                           once it is over
//   PATCH { questionId, selected?, flagged?, timeSpent? } → { ok, answer, serverNow }
//         → 409 { error, submitted: true } when time is up or it was already submitted
//   POST  → { attempt }   submit; a second submit just returns the attempt
//
// The deadline lives on the server. The browser shows a countdown, but an
// answer is accepted only while the stored deadline (plus a short grace for a
// slow network) has not passed.
export const dynamic = 'force-dynamic'

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

function tooMany(rl) {
  return NextResponse.json(
    { error: 'Too many requests. Please wait a moment and try again.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } },
  )
}

const over = (error) => NextResponse.json({ error, submitted: true }, { status: 409 })

async function ownAttempt(models, decoded, params) {
  const att = await loadAttemptFor(models, decoded, String(params?.id || ''))
  assertOwner(att, decoded)
  return att
}

export async function GET(request, { params }) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    callerId(auth.decoded)
    const models = await igcscModels()
    let att = await expireIfDue(models, await ownAttempt(models, auth.decoded, params))
    if (!att) throw new StoreError(404, 'That test was not found.')
    if (att.mcq?.state === 'submitted') return NextResponse.json({ attempt: attemptView(att), submitted: true })

    att = await startMcq(models, att)
    if (!att) throw new StoreError(404, 'That test was not found.')
    const questions = await mcqQuestions(models, att)
    return NextResponse.json({
      attempt: attemptView(att),
      questions,
      answers: att.mcq?.answers || {},
      deadline: att.mcq?.deadline || null,
      serverNow: Date.now(),
    })
  } catch (e) { return fail(e, 'GET /api/igcsc/attempts/[id]/mcq') }
}

export async function PATCH(request, { params }) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    const userId = callerId(auth.decoded)
    // Every click autosaves, plus retries: generous, but not unbounded.
    const rl = rateLimit('igcsc-mcq-save:' + userId, { max: 240, windowMs: 60000 })
    if (!rl.ok) return tooMany(rl)

    const raw = await request.json().catch(() => null)
    const body = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
    const questionId = typeof body.questionId === 'string' ? body.questionId.trim() : ''
    if (!isOid(questionId)) throw new StoreError(400, 'That question is not in this test.')

    const models = await igcscModels()
    const att = await ownAttempt(models, auth.decoded, params)
    if (att.mcq?.state === 'submitted') return over('This section has already been submitted.')
    if (mcqTimeUp(att)) {
      await submitMcq(models, att._id, { auto: true })
      return over('Time is up.')
    }

    // Left out means "unchanged": a flag-only save must not wipe the choice,
    // and saveMcqAnswer reads a missing `selected` as "clear it".
    const prev = (att.mcq?.answers || {})[questionId] || {}
    let selected
    if (body.selected === undefined) selected = String(prev.selected || '')
    else if (body.selected === null) selected = ''
    else if (typeof body.selected === 'string') selected = body.selected.slice(0, 4)
    else throw new StoreError(400, 'Choose A to E.')
    const flagged = typeof body.flagged === 'boolean' ? body.flagged : undefined
    const t = body.timeSpent == null || body.timeSpent === '' ? NaN : Number(body.timeSpent)
    const timeSpent = Number.isFinite(t) ? t : undefined

    const answer = await saveMcqAnswer(models, att, { questionId, selected, flagged, timeSpent })
    return NextResponse.json({ ok: true, answer, serverNow: Date.now() })
  } catch (e) { return fail(e, 'PATCH /api/igcsc/attempts/[id]/mcq') }
}

export async function POST(request, { params }) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    callerId(auth.decoded)
    const models = await igcscModels()
    const att = await ownAttempt(models, auth.decoded, params)
    const state = att.mcq?.state || 'none'
    if (state === 'none') throw new StoreError(409, 'This paper has no online section.')
    if (state === 'not_started') throw new StoreError(409, 'Start this section before submitting it.')

    // Claims the section first, so a double click or a late auto-submit marks once.
    const due = att.mcq?.deadline ? new Date(att.mcq.deadline).getTime() : Infinity
    const fresh = await submitMcq(models, att._id, { auto: Date.now() >= due })
    if (!fresh) throw new StoreError(404, 'That test was not found.')
    return NextResponse.json({ attempt: attemptView(fresh) })
  } catch (e) { return fail(e, 'POST /api/igcsc/attempts/[id]/mcq') }
}
