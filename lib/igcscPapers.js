// Papers: what one is, what is in it, and how each question gets marked.
//
// A "paper" is one source folder of the bank - (curriculum, subject,
// sourceFolder) - exactly as the staff exam-paper page groups it. This module is
// the single place that decides, for every question, whether it is marked
// online (MCQ with a real answer key), on paper by the AI (written), or not at
// all - and how many marks it is worth. The printed paper, the online test, the
// grader and the catalogue all ask here, so they can never disagree.
//
// Server and client both import it: nothing here touches the database except
// the functions that are handed the models.

export const LETTERS = ['A', 'B', 'C', 'D', 'E']

// Fields a paper ever needs from a question. Images are large base64 strings,
// so callers that do not render them should not ask for them.
export const QUESTION_FIELDS =
  'questionText options correctAnswer answerText marks isMCQ hasFigure questionImage topic subtopic difficulty course order curriculum subject sourceFolder'

export function paperKey(curriculum, subject, sourceFolder) {
  return [curriculum || '', subject || '', sourceFolder || ''].join('|')
}

// "6. Deformation of Solids" -> "Deformation of Solids"
export function pretty(seg) {
  return String(seg).replace(/^\d+[_.)\s-]*/, '').trim() || String(seg)
}

// The subtitle the exam-paper page prints: the last two folder segments, joined
// with an em dash. Must stay identical to that page.
export function folderLabel(folder, topic, subtopic) {
  const fromFolder = String(folder || '').split('/').map(pretty).filter(Boolean).slice(-2).join(' — ')
  return fromFolder || [topic, subtopic].filter(Boolean).join(' — ') || 'General'
}

export function paperDifficulty(folder, difficulty) {
  if (difficulty) return difficulty
  const m = String(folder || '').match(/\b(Very Hard|Easy|Medium|Hard)\s*$/i)
  if (!m) return ''
  return m[1].replace(/\b\w/g, (c) => c.toUpperCase()).replace('Very hard', 'Very Hard')
}

export function paperTitle(curriculum, subject, paperNo) {
  return `${curriculum} ${subject} P${paperNo}`
}

// The OCR pipeline wrote this marker into questions whose source page was
// unusable. They are not questions; they are never shown or marked.
export function isDefect(q) {
  return /^\s*\[?\s*SOURCE DEFECT/i.test(String(q?.questionText || ''))
}

export function optionLetters(q) {
  return LETTERS.filter((L) => q?.options && String(q.options[L] ?? '').trim())
}

// How many marks a question is worth.
//
// The stored figure when there is one. Otherwise an MCQ is one mark, and a
// written question is the sum of the "[n]" marks printed inside it, or one mark
// per lettered part - (a), (b), (c) - or one. A third of written questions carry
// no stored marks at all, so without this a paper would print "[0]" against
// half its questions and the grader would have nothing to mark out of.
export function questionMarks(q, kind) {
  const stored = Number(q?.marks)
  if (stored > 0) return stored
  if (kind === 'mcq') return 1
  const text = String(q?.questionText || '')
  const brackets = [...text.matchAll(/(?<!\\sqrt)\[(\d{1,2})\](?!\s*\{)/g)]
    .map((m) => Number(m[1]))
    .filter((n) => n > 0 && n <= 20)
  if (brackets.length) return brackets.reduce((a, b) => a + b, 0)
  const parts = new Set([...text.matchAll(/(?:^|\n)\s*\(([a-h])\)/g)].map((m) => m[1]))
  return Math.max(1, Math.min(parts.size, 12))
}

// What happens to a question when a student sits the paper.
//
//   mcq      - answered online, marked against the stored letter
//   written  - printed, answered by hand, photographed, marked by the AI
//   unscored - an MCQ with no usable answer key. Never guessed: it is left out
//   defect   - a broken source page; not a question at all
//
// `basis` is what a mark rests on: the letter key, the mark scheme, a final
// answer only, or nothing (the AI's mark is then provisional and a tutor sees it).
// `hasScheme` / `hasFinal` may be passed precomputed when the text was not loaded.
export function classifyQuestion(q) {
  if (isDefect(q)) return { kind: 'defect', basis: 'none', marks: 0, letters: [], key: '' }
  const letters = optionLetters(q)
  if (q?.isMCQ && letters.length >= 2) {
    const key = String(q.correctAnswer || '').trim().toUpperCase()
    if (/^[A-E]$/.test(key) && letters.includes(key)) {
      return { kind: 'mcq', basis: 'key', marks: questionMarks(q, 'mcq'), letters, key }
    }
    return { kind: 'unscored', basis: 'none', marks: 0, letters, key: '' }
  }
  const hasScheme = q?.hasScheme ?? !!String(q?.answerText || '').trim()
  const hasFinal = q?.hasFinal ?? !!String(q?.correctAnswer || '').trim()
  return {
    kind: 'written',
    basis: hasScheme ? 'scheme' : hasFinal ? 'final' : 'none',
    marks: questionMarks(q, 'written'),
    letters,
    key: '',
  }
}

// Same rule as the exam-paper page: 2.5 minutes a mark, rounded to 5, 30–180.
export function paperDurationMin(totalMarks) {
  const m = Math.round((Number(totalMarks || 0) * 2.5) / 5) * 5 || 45
  return Math.min(180, Math.max(30, m))
}

// The online MCQ section: 75 seconds a question, 5–180 minutes.
export function mcqDurationMin(count) {
  if (!count) return 0
  return Math.min(180, Math.max(5, Math.ceil(count * 1.25)))
}

// When a folder holds the same questions under two courses (98 A-Level Maths
// folders were imported twice, as Edexcel and as Edexcel IAL), a paper keeps
// ONE course - the larger, then the alphabetically first - or every question
// would be printed and marked twice.
// Code-point order, which is what MongoDB's $sort uses. String#localeCompare
// folds case and would number papers differently from the exam-paper page.
const cmp = (a, b) => { a = String(a ?? ''); b = String(b ?? ''); return a < b ? -1 : a > b ? 1 : 0 }

export function chooseCourse(courseCounts) {
  const entries = [...courseCounts.entries()]
  entries.sort((a, b) => (b[1] - a[1]) || cmp(a[0], b[0]))
  return entries.length ? entries[0][0] : ''
}

// A paper's questions in printed order, numbered 1..N, defects removed.
// Returns [{ q, cls, n }].
export async function loadPaperQuestions(Question, paper, { fields = QUESTION_FIELDS, any = false } = {}) {
  const filter = {
    isActive: { $ne: false },
    curriculum: paper.curriculum,
    subject: paper.subject,
    sourceFolder: paper.sourceFolder ? paper.sourceFolder : { $in: ['', null] },
  }
  let rows = await Question.find(filter).sort({ order: 1, _id: 1 }).select(fields + ' course').limit(600).lean()
  const courses = new Set(rows.map((r) => r.course || ''))
  // `any`: the caller filters by question id itself (an attempt), so keep every
  // course rather than risk dropping the questions it was given.
  if (courses.size > 1 && !any) rows = rows.filter((r) => (r.course || '') === (paper.course || ''))
  const out = []
  let n = 0
  for (const q of rows) {
    const cls = classifyQuestion(q)
    if (cls.kind === 'defect') continue
    n += 1
    out.push({ q, cls, n })
  }
  return out
}

// A question as a STUDENT may see it: no key, no mark scheme, no final answer.
export function studentQuestion({ q, cls, n }) {
  const showImage = !!q.questionImage && (q.hasFigure || cls.kind !== 'mcq')
  return {
    _id: String(q._id),
    n,
    kind: cls.kind,
    marks: cls.marks,
    text: q.questionText || '',
    options: cls.kind === 'mcq' ? cls.letters.map((L) => ({ letter: L, text: q.options[L] })) : undefined,
    image: showImage ? q.questionImage : '',
    topic: q.topic || '',
    difficulty: q.difficulty || '',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Catalogue sync: bank -> Paper documents.
// ─────────────────────────────────────────────────────────────────────────────

function holdReasonFor(stats) {
  const r = []
  if (stats.questionCount === 0) r.push('no questions')
  if (stats.defectCount) r.push(`${stats.defectCount} broken source question${stats.defectCount > 1 ? 's' : ''}`)
  if (stats.unscoredCount) r.push(`${stats.unscoredCount} MCQ without an answer key`)
  if (stats.noSchemeCount) r.push(`${stats.noSchemeCount} written question${stats.noSchemeCount > 1 ? 's' : ''} without a mark scheme`)
  return r.join('; ')
}

// Rebuild the catalogue from the bank. Idempotent.
//
// Never touches what an admin decided (price, publish flag once set by hand),
// never renumbers a paper that already has a number, and takes papers whose
// folder has vanished off sale instead of deleting them - people may own them.
export async function syncPapers({ Question, Paper }, { defaultPrice = 0 } = {}) {
  const started = Date.now()
  const folders = new Map()

  const cursor = Question.find({ isActive: { $ne: false } })
    .select('curriculum subject course sourceFolder topic subtopic difficulty isMCQ options correctAnswer marks questionText order')
    // answerText can be long; only whether it exists matters here.
    .lean()
    .cursor({ batchSize: 2000 })

  // answerText presence, fetched separately as a set of ids - cheaper than
  // dragging every mark scheme through the cursor.
  const withScheme = new Set(
    (await Question.find({ isActive: { $ne: false }, answerText: { $nin: [null, ''] } }).select('_id').lean())
      .map((d) => String(d._id)),
  )

  for await (const q of cursor) {
    if (!q.curriculum || !q.subject) continue
    const key = paperKey(q.curriculum, q.subject, q.sourceFolder || '')
    let f = folders.get(key)
    if (!f) {
      f = { curriculum: q.curriculum, subject: q.subject, sourceFolder: q.sourceFolder || '', byCourse: new Map() }
      folders.set(key, f)
    }
    const c = q.course || ''
    if (!f.byCourse.has(c)) f.byCourse.set(c, [])
    f.byCourse.get(c).push({ ...q, hasScheme: withScheme.has(String(q._id)), hasFinal: !!String(q.correctAnswer || '').trim() })
  }

  const existing = await Paper.find({}).lean()
  const byKey = new Map(existing.map((p) => [p.key, p]))
  const maxNo = new Map()
  for (const p of existing) {
    const s = `${p.curriculum}|${p.subject}`
    maxNo.set(s, Math.max(maxNo.get(s) || 0, p.paperNo || 0))
  }

  // Work out each folder's stats first, then number the new ones in the same
  // order the exam-paper page sorts them: by course, then folder.
  const computed = []
  for (const [key, f] of folders) {
    const counts = new Map([...f.byCourse].map(([c, rows]) => [c, rows.length]))
    // Keep the course a paper already has while it is still there: switching
    // would swap the questions out from under people who bought it.
    const prevCourse = byKey.get(key)?.course
    const course = prevCourse != null && f.byCourse.has(prevCourse) ? prevCourse : chooseCourse(counts)
    const rows = (f.byCourse.get(course) || []).sort((a, b) => ((a.order || 0) - (b.order || 0)) || cmp(String(a._id), String(b._id)))
    const s = {
      questionCount: 0, mcqCount: 0, writtenCount: 0, unscoredCount: 0, noSchemeCount: 0, defectCount: 0,
      totalMarks: 0, mcqMarks: 0, writtenMarks: 0,
    }
    const diffs = new Map()
    for (const q of rows) {
      const cls = classifyQuestion(q)
      if (cls.kind === 'defect') { s.defectCount += 1; continue }
      s.questionCount += 1
      if (q.difficulty) diffs.set(q.difficulty, (diffs.get(q.difficulty) || 0) + 1)
      if (cls.kind === 'mcq') { s.mcqCount += 1; s.mcqMarks += cls.marks }
      else if (cls.kind === 'written') {
        s.writtenCount += 1; s.writtenMarks += cls.marks
        if (cls.basis === 'none') s.noSchemeCount += 1
      } else if (cls.kind === 'unscored') s.unscoredCount += 1
    }
    s.totalMarks = s.mcqMarks + s.writtenMarks
    const topDiff = [...diffs.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || ''
    const first = rows[0] || {}
    computed.push({
      key, course, f, s,
      topic: first.topic || '', subtopic: first.subtopic || '',
      difficulty: paperDifficulty(f.sourceFolder, topDiff),
    })
  }
  computed.sort((a, b) =>
    cmp(a.f.curriculum, b.f.curriculum) || cmp(a.f.subject, b.f.subject) ||
    cmp(a.course, b.course) || cmp(a.f.sourceFolder, b.f.sourceFolder))

  const ops = []
  const summary = { folders: computed.length, created: 0, updated: 0, missing: 0, clean: 0, held: 0, published: 0 }
  const now = new Date()
  for (const c of computed) {
    const prev = byKey.get(c.key)
    const subjKey = `${c.f.curriculum}|${c.f.subject}`
    let paperNo = prev?.paperNo
    if (!paperNo) {
      paperNo = (maxNo.get(subjKey) || 0) + 1
      maxNo.set(subjKey, paperNo)
    }
    const clean = c.s.questionCount > 0 && !c.s.defectCount && !c.s.unscoredCount && !c.s.noSchemeCount &&
      (c.s.mcqCount + c.s.writtenCount) > 0
    if (clean) summary.clean += 1; else summary.held += 1
    const set = {
      curriculum: c.f.curriculum, subject: c.f.subject, sourceFolder: c.f.sourceFolder, course: c.course,
      paperNo,
      title: paperTitle(c.f.curriculum, c.f.subject, paperNo),
      unit: folderLabel(c.f.sourceFolder, c.topic, c.subtopic),
      topic: c.topic, subtopic: c.subtopic, difficulty: c.difficulty,
      ...c.s,
      durationMin: paperDurationMin(c.s.totalMarks),
      mcqDurationMin: mcqDurationMin(c.s.mcqCount),
      clean,
      holdReason: clean ? '' : holdReasonFor(c.s),
      missingFromBank: false,
      syncedAt: now,
    }
    if (prev) {
      // A paper that stopped being clean comes off sale on its own; one an
      // admin published or withdrew by hand stays as they left it.
      if (!prev.publishedManually) set.isPublished = clean
      ops.push({ updateOne: { filter: { _id: prev._id }, update: { $set: set } } })
      summary.updated += 1
      if ((prev.publishedManually ? prev.isPublished : clean)) summary.published += 1
    } else {
      ops.push({
        insertOne: {
          document: {
            key: c.key, ...set,
            price: Number(defaultPrice) || 0,
            isPublished: clean,
            publishedManually: false,
            priceSetManually: false,
          },
        },
      })
      summary.created += 1
      if (clean) summary.published += 1
    }
  }

  const seen = new Set(computed.map((c) => c.key))
  for (const p of existing) {
    if (seen.has(p.key) || p.missingFromBank) continue
    ops.push({ updateOne: { filter: { _id: p._id }, update: { $set: { missingFromBank: true, syncedAt: now } } } })
    summary.missing += 1
  }

  for (let i = 0; i < ops.length; i += 500) {
    await Paper.bulkWrite(ops.slice(i, i + 500), { ordered: false })
  }
  summary.ms = Date.now() - started
  return summary
}
