import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../../lib/igcscDb'
import { requireIgcscAuth } from '../../../../../../lib/igcscAuth'
import { StoreError, meId, isStaffRole } from '../../../../../../lib/igcscStore'
import {
  loadAttemptFor, attemptView, expireIfDue, computeTotals, recomputeTotals,
} from '../../../../../../lib/igcscAttempts'
import { ensureGradingProgress } from '../../../../../../lib/igcscGrader'
import { loadPaperQuestions } from '../../../../../../lib/igcscPapers'

// GET /api/igcsc/attempts/[id]/result → { attempt, questions, topics }
//
// Owner or staff. Marks come from attemptView, so a student sees each section
// only once it is marked. Mark schemes and final answers stay hidden until the
// whole attempt is final: a student whose written section is still being
// marked, or checked by a tutor, must not be able to read the scheme first.
export const dynamic = 'force-dynamic'

// No questionImage: figures are large and this page does not draw them.
const Q_FIELDS = 'questionText options correctAnswer answerText marks isMCQ topic subtopic difficulty order'

function fail(e, where) {
  if (e instanceof StoreError) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error(where, e?.message)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
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

// The attempt's questions in printed order. `kind` is what the attempt was
// sat as, not what the bank says today, and `n`/`marks` are what it was marked
// against when there is a result.
//
// MCQ questions are left out until that section is submitted: its clock only
// starts when the runner opens, so reading them here first would beat the timer.
async function attemptQuestions(models, att, { reveal, showMcq }) {
  const paper = await models.Paper.findById(att.paperId).select('curriculum subject sourceFolder course').lean()
  if (!paper) return []
  const mcqIds = new Set(showMcq ? (att.mcq?.questionIds || []).map(String) : [])
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
      markScheme: reveal ? q.answerText || '' : '',
      finalAnswer: reveal && kind === 'written' ? q.correctAnswer || '' : '',
    })
  }
  return out.sort((a, b) => (a.n || 0) - (b.n || 0))
}

// Marks per topic, over only the results this viewer may already see.
function topicTotals(results) {
  const byTopic = new Map()
  for (const r of results) {
    const topic = r.topic || 'General'
    const t = byTopic.get(topic) || { topic, marks: 0, max: 0 }
    t.marks += Number(r.marksAwarded) || 0
    t.max += Number(r.maxMarks) || 0
    byTopic.set(topic, t)
  }
  return [...byTopic.values()]
}

export async function GET(request, { params }) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    const models = await igcscModels()
    const att = await settle(models, await loadAttemptFor(models, auth.decoded, String(params?.id || '')))

    const staffRole = isStaffRole(auth.decoded.role)
    const owner = String(att.userId) === meId(auth.decoded)
    const attempt = attemptView(att, { staff: staffRole && !owner })
    const questions = await attemptQuestions(models, att, {
      reveal: att.status === 'completed' || staffRole,
      showMcq: staffRole || att.mcq?.state === 'submitted',
    })
    return NextResponse.json({ attempt, questions, topics: topicTotals(attempt.results) })
  } catch (e) { return fail(e, 'GET /api/igcsc/attempts/[id]/result') }
}
