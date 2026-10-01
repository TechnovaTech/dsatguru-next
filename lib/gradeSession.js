import Question from './models/Question'
import Test from './models/Test'
import { gradeAndScore } from './scoring/satScale'
import { getCustomMap, effectiveCorrectAnswer, effectiveOptions } from './tutorCustomQuestions'
import { gradeModules } from './adaptiveRouting'

const OBJECT_ID_RE = /^[a-f\d]{24}$/i

// Every response a session should be graded on: the responses already recorded, plus a
// blank (omitted) response for each question the student was served but never answered —
// the questions referenced by moduleAnswers (new { answers, questionIds } shape or the legacy
// bare { qid: sel } map) and by the adaptive Module-2 assignment. This mirrors what the client
// sends on a normal completion, where skipped questions arrive with selectedAnswer null.
function collectResponses(session) {
  const out = []
  const seen = new Set()
  const add = (r) => {
    const id = String(r.questionId || '')
    if (!OBJECT_ID_RE.test(id) || seen.has(id)) return
    seen.add(id)
    out.push(r)
  }

  for (const r of (session.responses || [])) {
    if (!r || !r.questionId) continue
    add(typeof r.toObject === 'function' ? r.toObject() : { ...r })
  }

  const moduleAnswers = session.moduleAnswers
  if (moduleAnswers && typeof moduleAnswers === 'object') {
    for (const mod of Object.values(moduleAnswers)) {
      if (!mod || typeof mod !== 'object') continue
      // Never treat the wrapper's own keys ("answers"/"questionIds") as question ids.
      const isWrapped = ('answers' in mod) || ('questionIds' in mod)
      const answers = isWrapped
        ? ((mod.answers && typeof mod.answers === 'object') ? mod.answers : {})
        : mod
      const qids = (isWrapped && Array.isArray(mod.questionIds) && mod.questionIds.length)
        ? mod.questionIds
        : Object.keys(answers)
      for (const qid of qids) {
        const sel = answers[String(qid)]
        const hasAnswer = sel != null && String(sel).trim() !== ''
        add({ questionId: String(qid), selectedAnswer: hasAnswer ? sel : null, timeSpent: 0, answeredAt: null })
      }
    }
  }

  for (const qid of (session.adaptiveAssignedQuestionIds || [])) {
    add({ questionId: String(qid), selectedAnswer: null, timeSpent: 0, answeredAt: null })
  }

  return out
}

// Grade a session IN PLACE the same way the PUT completion path in
// app/api/test-sessions/[id]/route.js does: re-grade every response against the question bank
// (honoring tutor customQuestions), then set responses[].isCorrect, correctAnswers,
// answeredQuestions, the scaled rw/math/total scores, `result`, and the per-module breakdown.
// Mutates `session`; the caller saves it. Returns the scored summary, or null when the session
// has nothing gradable (its score fields are then left untouched).
export async function gradeSessionInPlace(session) {
  if (!session) return null
  const toGrade = collectResponses(session)
  if (!toGrade.length) return null

  const ids = toGrade.map(r => String(r.questionId))
  const qs = await Question.find({ _id: { $in: ids } }).select('subject correctAnswer options difficulty')
  const gradeTest = session.testId
    ? await Test.findById(session.testId).select('isTutorTest customQuestions').lean()
    : null
  const customMap = getCustomMap(gradeTest)
  const qMap = new Map(qs.map(q => [String(q._id), {
    subject: q.subject,
    correctAnswer: effectiveCorrectAnswer(customMap, q._id, q.correctAnswer),
    options: effectiveOptions(customMap, q._id, q.options),
    difficulty: q.difficulty,
  }]))

  const scored = gradeAndScore(toGrade, qMap)
  session.responses = toGrade.map((r, i) => ({ ...r, isCorrect: scored.flags[i] }))
  session.correctAnswers = scored.correctAnswers
  session.answeredQuestions = toGrade.filter(r => r.selectedAnswer != null && String(r.selectedAnswer).trim() !== '').length
  session.rwScore = scored.rwScore
  session.mathScore = scored.mathScore
  session.totalScore = scored.totalScore
  session.result = { math: scored.mathScore, readingWriting: scored.rwScore, total: scored.totalScore }
  // Same fallback as the PUT path: derive the total time from per-question times when none was stored.
  if (session.timeSpent == null || session.timeSpent === 0) {
    session.timeSpent = toGrade.reduce((s, r) => s + (Number(r.timeSpent) || 0), 0)
  }

  const moduleAnswers = session.moduleAnswers
  if (moduleAnswers && typeof moduleAnswers === 'object' && Object.keys(moduleAnswers).length) {
    session.moduleScores = gradeModules(moduleAnswers, qMap)
  }

  return scored
}
