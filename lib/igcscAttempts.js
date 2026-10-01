// One sitting of one paper: start, answer, submit, mark, total.
//
// A paper has up to two sections:
//   MCQ     - taken online against a server-held deadline, autosaved per answer,
//             marked the moment it is submitted;
//   written - printed, answered by hand, photographed, marked by the AI
//             (lib/igcscGrader.js), and checked by a tutor when the AI is unsure.
// The attempt is complete when every section it has is marked.
//
// Unlike the DSAT runners, nothing here trusts the browser's clock or keeps
// answers only in page state: the deadline is stored, every answer is saved as
// it is given, and a test whose time ran out is submitted by the server the
// next time anyone looks at it.
import { loadPaperQuestions, studentQuestion, mcqDurationMin } from './igcscPapers'
import { loadAccessContext, accessFor, StoreError, meId, isStaffRole, isOid } from './igcscStore'
import { signedUploadUrl, saveAnswerImage, deleteAnswerImage, MAX_PAGES } from './igcscFiles'
import { gradeFromPct } from './igcscStoreShared'

export const MCQ_GRACE_MS = 45 * 1000

// ─────────────────────────────────────────────────────────────────────────────
// Loading
// ─────────────────────────────────────────────────────────────────────────────

// The attempt, if this caller may see it: its owner, or staff.
export async function loadAttemptFor(models, decoded, attemptId) {
  if (!isOid(attemptId)) throw new StoreError(404, 'That test was not found.')
  const att = await models.PaperAttempt.findById(attemptId).lean()
  if (!att) throw new StoreError(404, 'That test was not found.')
  if (String(att.userId) !== meId(decoded) && !isStaffRole(decoded?.role)) {
    throw new StoreError(403, 'That test belongs to someone else.')
  }
  return att
}

// Only the owner may answer, upload or submit - staff look, they do not sit.
export function assertOwner(att, decoded) {
  if (String(att.userId) !== meId(decoded)) throw new StoreError(403, 'Only the student sitting this test can do that.')
}

// ─────────────────────────────────────────────────────────────────────────────
// Starting
// ─────────────────────────────────────────────────────────────────────────────

// Open a paper: resume the attempt already under way, or begin a new one.
export async function startOrResume(models, decoded, paperId) {
  if (!isOid(paperId)) throw new StoreError(400, 'Unknown paper.')
  const userId = meId(decoded)
  const paper = await models.Paper.findById(paperId).lean()
  if (!paper) throw new StoreError(404, 'Unknown paper.')

  // Someone already sitting this paper may finish it, even if the plan that
  // let them in expired in the meantime.
  const open = await models.PaperAttempt.findOne({ userId, paperId: paper._id, status: 'in_progress' })
    .sort({ createdAt: -1 }).lean()
  if (open) return { attempt: open, resumed: true }

  const ctx = await loadAccessContext(models, userId)
  const access = accessFor(ctx, paper, decoded.role)
  if (!access.allowed) throw new StoreError(402, 'Buy this paper, use a credit, or ask your tutor to assign it.')

  const entries = await loadPaperQuestions(models.Question, paper, {
    fields: 'questionText options correctAnswer answerText marks isMCQ course order',
  })
  const mcq = entries.filter((e) => e.cls.kind === 'mcq')
  const written = entries.filter((e) => e.cls.kind === 'written')
  if (!mcq.length && !written.length) throw new StoreError(409, 'This paper has no questions that can be marked yet.')

  const user = ctx.user || {}
  const sum = (list) => list.reduce((a, e) => a + e.cls.marks, 0)
  const attempt = await models.PaperAttempt.create({
    userId, userName: user.name || decoded.name || '', userEmail: user.email || decoded.email || '',
    paperId: paper._id, paperTitle: paper.title, paperUnit: paper.unit,
    curriculum: paper.curriculum, subject: paper.subject,
    via: access.via,
    numbers: Object.fromEntries([...mcq, ...written].map((e) => [String(e.q._id), e.n])),
    marks: Object.fromEntries([...mcq, ...written].map((e) => [String(e.q._id), e.cls.marks])),
    status: 'in_progress',
    mcq: {
      state: mcq.length ? 'not_started' : 'none',
      questionIds: mcq.map((e) => e.q._id),
      answers: {},
      // Stored as the real figure, so what the page shows is the clock that runs.
      durationMin: paper.mcqDurationMin || mcqDurationMin(mcq.length),
      max: sum(mcq),
      total: mcq.length,
    },
    written: {
      state: written.length ? 'not_started' : 'none',
      questionIds: written.map((e) => e.q._id),
      uploads: [],
      max: sum(written),
    },
    results: [],
  })
  return { attempt: attempt.toObject(), resumed: false }
}

// ─────────────────────────────────────────────────────────────────────────────
// MCQ section
// ─────────────────────────────────────────────────────────────────────────────

async function paperOf(models, att) {
  const paper = await models.Paper.findById(att.paperId).lean()
  if (!paper) throw new StoreError(404, 'This paper no longer exists.')
  return paper
}

// The attempt's own questions with the numbers it started with, in that order.
// Questions removed from the bank since simply drop out.
export async function attemptEntries(models, att, ids, opts) {
  const paper = await paperOf(models, att)
  const want = new Set((ids || []).map(String))
  const nums = att.numbers || {}
  const marks = att.marks || {}
  return (await loadPaperQuestions(models.Question, paper, { ...(opts || {}), any: true }))
    .filter((e) => want.has(String(e.q._id)))
    .map((e) => {
      const id = String(e.q._id)
      const m = Number(marks[id])
      return { ...e, n: Number(nums[id]) || e.n, cls: m > 0 ? { ...e.cls, marks: m } : e.cls }
    })
    .sort((a, b) => a.n - b.n)
}

// The section's questions, in printed order, with nothing that gives the
// answer away.
export async function mcqQuestions(models, att) {
  return (await attemptEntries(models, att, att.mcq?.questionIds)).map(studentQuestion)
}

// Begin the clock. Idempotent: a second call returns the same deadline.
export async function startMcq(models, att) {
  if (att.mcq?.state === 'none') throw new StoreError(409, 'This paper has no online section.')
  if (att.mcq?.state === 'submitted') throw new StoreError(409, 'You have already submitted this section.')
  if (att.mcq?.state === 'in_progress') return att
  const now = new Date()
  const minutes = Math.max(1, Number(att.mcq?.durationMin || 10))
  const updated = await models.PaperAttempt.findOneAndUpdate(
    { _id: att._id, 'mcq.state': 'not_started' },
    { $set: { 'mcq.state': 'in_progress', 'mcq.startedAt': now, 'mcq.deadline': new Date(now.getTime() + minutes * 60000) } },
    { new: true },
  ).lean()
  return updated || models.PaperAttempt.findById(att._id).lean()
}

export function mcqTimeUp(att, now = Date.now()) {
  return att.mcq?.state === 'in_progress' && att.mcq.deadline && now > new Date(att.mcq.deadline).getTime() + MCQ_GRACE_MS
}

// Save one answer. `selected` '' clears it.
export async function saveMcqAnswer(models, att, { questionId, selected, flagged, timeSpent }) {
  if (att.mcq?.state !== 'in_progress') throw new StoreError(409, 'This section is not open.')
  if (mcqTimeUp(att)) throw new StoreError(409, 'Time is up for this section.')
  const qid = String(questionId || '')
  if (!(att.mcq.questionIds || []).some((id) => String(id) === qid)) throw new StoreError(400, 'That question is not in this test.')
  const prev = (att.mcq.answers || {})[qid] || {}
  const sel = selected === undefined ? String(prev.selected || '') : String(selected ?? '').trim().toUpperCase()
  if (sel && !/^[A-E]$/.test(sel)) throw new StoreError(400, 'Choose A to E.')
  const entry = {
    selected: sel,
    flagged: typeof flagged === 'boolean' ? flagged : !!prev.flagged,
    timeSpent: Math.max(0, Math.min(36000, Number(timeSpent ?? prev.timeSpent ?? 0) || 0)),
    at: new Date(),
  }
  const res = await models.PaperAttempt.updateOne(
    { _id: att._id, 'mcq.state': 'in_progress' },
    { $set: { [`mcq.answers.${qid}`]: entry } },
  )
  // The section was submitted between our read and this write: the answer was
  // NOT kept, and the runner must not tell the student it was.
  if (res.matchedCount !== 1) throw new StoreError(409, 'This section has already been submitted.')
  return entry
}

// Mark the MCQ section. Claims it first, so a double submit marks once.
export async function submitMcq(models, attemptId, { auto = false } = {}) {
  const claimed = await models.PaperAttempt.findOneAndUpdate(
    { _id: attemptId, 'mcq.state': 'in_progress' },
    { $set: { 'mcq.state': 'submitted', 'mcq.submittedAt': new Date(), 'mcq.autoSubmitted': !!auto } },
    { new: true },
  ).lean()
  if (!claimed) return models.PaperAttempt.findById(attemptId).lean()

  let entries
  try {
    entries = await attemptEntries(models, claimed, claimed.mcq.questionIds, {
      fields: 'questionText options correctAnswer marks isMCQ course order topic subtopic difficulty',
    })
  } catch (e) {
    // Hand the section back rather than leave it "submitted" with no marks,
    // which would settle as zero for good.
    await models.PaperAttempt.updateOne(
      { _id: claimed._id, 'mcq.state': 'submitted', 'results.kind': { $ne: 'mcq' } },
      { $set: { 'mcq.state': 'in_progress', 'mcq.submittedAt': null } },
    )
    throw e
  }

  const answers = claimed.mcq.answers || {}
  let correct = 0
  let score = 0
  const results = entries.map((e) => {
    const sel = String(answers[String(e.q._id)]?.selected || '')
    const ok = !!sel && sel === e.cls.key
    if (ok) { correct += 1; score += e.cls.marks }
    return {
      questionId: e.q._id, n: e.n, kind: 'mcq', maxMarks: e.cls.marks, marksAwarded: ok ? e.cls.marks : 0,
      selected: sel, correctAnswer: e.cls.key, isCorrect: ok, basis: 'key',
      topic: e.q.topic || '', subtopic: e.q.subtopic || '', difficulty: e.q.difficulty || '',
    }
  })

  await models.PaperAttempt.updateOne(
    { _id: claimed._id },
    {
      $pull: { results: { kind: 'mcq' } },
    },
  )
  await models.PaperAttempt.updateOne(
    { _id: claimed._id },
    {
      $push: { results: { $each: results } },
      $set: { 'mcq.score': score, 'mcq.correct': correct, 'mcq.total': results.length },
    },
  )
  return recomputeTotals(models, claimed._id)
}

// Submit on the student's behalf when their time ran out and they never did.
export async function expireIfDue(models, att) {
  if (mcqTimeUp(att)) return submitMcq(models, att._id, { auto: true })
  return att
}

// ─────────────────────────────────────────────────────────────────────────────
// Written section: photographs
// ─────────────────────────────────────────────────────────────────────────────

export function writtenOpen(att) {
  return att.written?.state === 'not_started' || att.written?.state === 'error'
}

export async function addUpload(models, att, buf, mime) {
  if (!writtenOpen(att)) throw new StoreError(409, 'Your answers have already been sent for marking.')
  if ((att.written.uploads || []).length >= MAX_PAGES) throw new StoreError(409, `You can upload at most ${MAX_PAGES} pages.`)
  const saved = await saveAnswerImage(String(att._id), buf, mime)
  const upload = { ...saved, uploadedAt: new Date() }
  const res = await models.PaperAttempt.updateOne(
    { _id: att._id, 'written.state': { $in: ['not_started', 'error'] }, [`written.uploads.${MAX_PAGES - 1}`]: { $exists: false } },
    { $push: { 'written.uploads': upload } },
  )
  if (res.modifiedCount !== 1) {
    await deleteAnswerImage(String(att._id), saved.file)
    throw new StoreError(409, 'Could not add that page - the test changed. Refresh and try again.')
  }
  return upload
}

export async function removeUpload(models, att, uploadId) {
  if (!writtenOpen(att)) throw new StoreError(409, 'Your answers have already been sent for marking.')
  const u = (att.written.uploads || []).find((x) => x.id === uploadId)
  if (!u) throw new StoreError(404, 'That page was not found.')
  const res = await models.PaperAttempt.updateOne(
    { _id: att._id, 'written.state': { $in: ['not_started', 'error'] } },
    { $pull: { 'written.uploads': { id: uploadId } } },
  )
  if (res.modifiedCount !== 1) throw new StoreError(409, 'Your answers have already been sent for marking.')
  await deleteAnswerImage(String(att._id), u.file)
}

// Move the written section into marking. Atomic, so two clicks start one job.
export async function claimWrittenGrading(models, attemptId, { from = ['not_started', 'error'] } = {}) {
  return models.PaperAttempt.findOneAndUpdate(
    { _id: attemptId, 'written.state': { $in: from }, 'written.uploads.0': { $exists: true } },
    {
      $set: {
        'written.state': 'grading', 'written.gradingStartedAt': new Date(), 'written.error': '', 'written.submittedAt': new Date(),
        // A new AI run starts unconfirmed, whoever signed off the last one.
        'written.reviewedBy': '', 'written.reviewedAt': null,
      },
      $inc: { 'written.tries': 1 },
    },
    { new: true },
  ).lean()
}

// The printable written section, without mark schemes.
export async function writtenSheet(models, att) {
  const paper = await paperOf(models, att)
  const entries = await attemptEntries(models, att, att.written?.questionIds)
  return {
    paper: {
      _id: String(paper._id), title: paper.title, unit: paper.unit, curriculum: paper.curriculum,
      subject: paper.subject, durationMin: paper.durationMin, mcqCount: paper.mcqCount,
    },
    questions: entries.map(studentQuestion),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Totals
// ─────────────────────────────────────────────────────────────────────────────

export function computeTotals(att) {
  const mState = att.mcq?.state || 'none'
  const wState = att.written?.state || 'none'
  const mcqDone = mState === 'none' || mState === 'submitted'
  let status
  if (!mcqDone || wState === 'not_started' || wState === 'error') status = 'in_progress'
  else if (wState === 'grading') status = 'grading'
  else if (wState === 'needs_review') status = 'needs_review'
  else status = 'completed'

  const results = att.results || []
  const score = results.reduce((a, r) => a + (Number(r.marksAwarded) || 0), 0)
  const maxScore = (mState !== 'none' ? Number(att.mcq?.max || 0) : 0) + (wState !== 'none' ? Number(att.written?.max || 0) : 0)
  const finished = status === 'completed' || status === 'needs_review'
  const percentage = finished && maxScore ? Math.round((score / maxScore) * 100) : null
  return {
    status,
    score,
    maxScore,
    percentage,
    grade: percentage == null ? null : gradeFromPct(percentage),
  }
}

export async function recomputeTotals(models, attemptId) {
  const att = await models.PaperAttempt.findById(attemptId).lean()
  if (!att) return null
  const t = computeTotals(att)
  const set = { status: t.status, score: t.score, maxScore: t.maxScore, percentage: t.percentage, grade: t.grade }
  if (t.status === 'completed' && !att.completedAt) set.completedAt = new Date()
  if (t.status !== 'completed') set.completedAt = null
  await models.PaperAttempt.updateOne({ _id: att._id }, { $set: set })
  return { ...att, ...set }
}

// ─────────────────────────────────────────────────────────────────────────────
// What the browser gets
// ─────────────────────────────────────────────────────────────────────────────

// An attempt as its student may see it. MCQ marks appear once that section is
// submitted; written marks once the marker has finished (provisional while a
// tutor checks). Staff see everything.
export function attemptView(att, { staff = false } = {}) {
  const mState = att.mcq?.state || 'none'
  const wState = att.written?.state || 'none'
  const answers = att.mcq?.answers || {}
  const showMcq = staff || mState === 'submitted'
  const showWritten = staff || wState === 'graded' || wState === 'needs_review'
  const results = (att.results || [])
    .filter((r) => (r.kind === 'mcq' ? showMcq : showWritten))
    .sort((a, b) => (a.n || 0) - (b.n || 0))
    .map((r) => ({ ...r, questionId: String(r.questionId) }))
  return {
    _id: String(att._id),
    userId: String(att.userId),
    userName: att.userName || '',
    paperId: String(att.paperId),
    paperTitle: att.paperTitle || '',
    paperUnit: att.paperUnit || '',
    curriculum: att.curriculum || '',
    subject: att.subject || '',
    via: att.via || '',
    status: att.status,
    provisional: att.status === 'needs_review',
    createdAt: att.createdAt,
    completedAt: att.completedAt || null,
    mcq: {
      state: mState,
      count: (att.mcq?.questionIds || []).length,
      durationMin: att.mcq?.durationMin || 0,
      startedAt: att.mcq?.startedAt || null,
      deadline: att.mcq?.deadline || null,
      submittedAt: att.mcq?.submittedAt || null,
      autoSubmitted: !!att.mcq?.autoSubmitted,
      answered: Object.values(answers).filter((a) => a && a.selected).length,
      score: showMcq ? att.mcq?.score ?? null : null,
      max: att.mcq?.max || 0,
      correct: showMcq ? att.mcq?.correct ?? null : null,
    },
    written: {
      state: wState,
      count: (att.written?.questionIds || []).length,
      uploads: (att.written?.uploads || []).map((u) => ({
        id: u.id, size: u.size, uploadedAt: u.uploadedAt, url: signedUploadUrl(String(att._id), u.id),
      })),
      submittedAt: att.written?.submittedAt || null,
      gradedAt: att.written?.gradedAt || null,
      error: wState === 'error' ? att.written?.error || 'Marking failed.' : '',
      tries: att.written?.tries || 0,
      score: showWritten ? att.written?.score ?? null : null,
      max: att.written?.max || 0,
      model: staff ? att.written?.model || '' : undefined,
      reviewedBy: att.written?.reviewedBy || '',
    },
    score: att.score ?? null,
    maxScore: att.maxScore ?? null,
    percentage: att.percentage ?? null,
    grade: att.grade ?? null,
    results,
  }
}

