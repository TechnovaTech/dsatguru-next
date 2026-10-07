#!/usr/bin/env node
// Fill the IGCSC bank's missing MCQ answer keys and written mark schemes - the
// way every key in this project is made: three independent solves that must
// all agree, then an independent verifier. Anything short of that stays empty.
// Nothing is ever guessed, and an answer that already exists is never touched.
//
// Run on the VPS from the repo root:
//   node scripts/igcsc-answer-keys.cjs calibrate-mcq 20      # real keys hidden: measures precision
//   node scripts/igcsc-answer-keys.cjs calibrate-written 10  # official final answers hidden
//   node scripts/igcsc-answer-keys.cjs run-mcq     [--curriculum IGCSE] [--limit 500]
//   node scripts/igcsc-answer-keys.cjs run-written [--curriculum IGCSE] [--limit 500]
//   node scripts/igcsc-answer-keys.cjs import <accepted.json>  # results from the Claude solver/verifier agents
//   node scripts/igcsc-answer-keys.cjs apply       # writes accepted results into EMPTY fields only
//   node scripts/igcsc-answer-keys.cjs report
//
// Env: GEMINI_API_KEY; KEYS_MODEL (default gemini-2.5-flash); KEYS_RPM (default 4:
// the free tier allows 5 a minute, and students' answer marking shares that).
// Every run is resumable: results live in the igcsc `answerkeyjobs` collection.
require('dotenv').config({ path: require('path').join(process.cwd(), '.env') })
const mongoose = require('mongoose')

const MODEL = process.env.KEYS_MODEL || 'gemini-2.5-flash'
const RPM = Math.max(1, Number(process.env.KEYS_RPM || 4))
const LETTERS = ['A', 'B', 'C', 'D', 'E']
const MIN_CONFIDENCE = 0.6

// ── must match lib/igcscPapers.js questionMarks / isDefect ──────────────────
function questionMarks(q, kind) {
  const stored = Number(q?.marks)
  if (stored > 0) return stored
  if (kind === 'mcq') return 1
  const text = String(q?.questionText || '')
  const brackets = [...text.matchAll(/(?<!\\sqrt)\[(\d{1,2})\](?!\s*\{)/g)].map((m) => Number(m[1])).filter((n) => n > 0 && n <= 20)
  if (brackets.length) return brackets.reduce((a, b) => a + b, 0)
  const parts = new Set([...text.matchAll(/(?:^|\n)\s*\(([a-h])\)/g)].map((m) => m[1]))
  return Math.max(1, Math.min(parts.size, 12))
}
const isDefect = (q) => /^\s*\[?\s*SOURCE DEFECT/i.test(String(q?.questionText || ''))
const optionLetters = (q) => LETTERS.filter((L) => q?.options && String(q.options[L] ?? '').trim())
// Options beyond the stored ones (a sixth choice, an "(E)" that never made it
// into options): the right answer may not be storable, so the question is skipped.
const optionsLost = (q) => /\(F\)|choice F\b|six lettered|Additional answer option|Option F is|Fifth option, beyond/i.test(String(q.questionText || '')) ||
  (/\(E\)/.test(String(q.questionText || '')) && !String(q.options?.E || '').trim())

// ── rate limit + Gemini ──────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let nextSlot = 0
async function slot() {
  const gap = 60000 / RPM
  const now = Date.now()
  const wait = Math.max(0, nextSlot - now)
  nextSlot = Math.max(now, nextSlot) + gap
  if (wait) await sleep(wait)
}

class DailyQuota extends Error {}
const usage = { calls: 0, input: 0, output: 0, thoughts: 0 }

async function gemini(parts, schema, { temperature = 0 } = {}) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await slot()
    let res, j
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature, responseMimeType: 'application/json', responseSchema: schema, maxOutputTokens: 16384 },
        }),
        signal: AbortSignal.timeout(180000),
      })
      j = await res.json().catch(() => ({}))
    } catch (e) {
      await sleep(5000)
      continue
    }
    if (res.status === 429) {
      const details = j?.error?.details || []
      const ids = details.flatMap((d) => (d.violations || []).map((v) => v.quotaId || ''))
      if (ids.some((id) => /PerDay/i.test(id))) throw new DailyQuota(`daily quota reached (${ids.join(', ')})`)
      const delay = details.find((d) => d.retryDelay)?.retryDelay
      await sleep((parseFloat(delay) || 15) * 1000 + 1000)
      continue
    }
    if (res.status >= 500) { await sleep(10000 * (attempt + 1)); continue }
    if (!res.ok) throw new Error(`${res.status} ${j?.error?.message || ''}`.slice(0, 200))
    const c = j.candidates?.[0]
    const text = (c?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('')
    const u = j.usageMetadata || {}
    usage.calls += 1; usage.input += u.promptTokenCount || 0; usage.output += u.candidatesTokenCount || 0; usage.thoughts += u.thoughtsTokenCount || 0
    try { return JSON.parse(text) } catch { await sleep(2000); continue }
  }
  throw new Error('no usable reply after retries')
}

function questionParts(q, intro) {
  const parts = [{ text: intro }]
  const m = String(q.questionImage || '').match(/^data:(image\/[a-z]+);base64,(.+)$/)
  if (m) {
    parts.push({ text: 'The original question page (use it for any figure, graph or table):' })
    parts.push({ inlineData: { mimeType: m[1], data: m[2] } })
  }
  return parts
}

const S = {
  OBJ: 'OBJECT', STR: 'STRING', NUM: 'NUMBER', INT: 'INTEGER', BOOL: 'BOOLEAN', ARR: 'ARRAY',
}

// ── MCQ ──────────────────────────────────────────────────────────────────────
const MCQ_SOLVERS = [
  { id: 'direct', temperature: 0, how: 'Solve the problem fully, step by step, then choose the one correct option.' },
  { id: 'eliminate', temperature: 0.4, how: 'Test every option against the problem. Eliminate each wrong option with a concrete reason and keep the one that is right.' },
  { id: 'fresh', temperature: 0.8, how: 'Work the answer out from first principles WITHOUT looking at the options first; only then match your result to an option.' },
]
const MCQ_SOLVE_SCHEMA = {
  type: S.OBJ,
  properties: { answer: { type: S.STR, enum: [...LETTERS, 'NONE'] }, confidence: { type: S.NUM }, reason: { type: S.STR } },
  required: ['answer', 'confidence', 'reason'],
}
const MCQ_VERIFY_SCHEMA = {
  type: S.OBJ,
  properties: { verdict: { type: S.STR, enum: ['CORRECT', 'INCORRECT', 'UNSURE'] }, answer: { type: S.STR, enum: [...LETTERS, 'NONE'] }, reason: { type: S.STR } },
  required: ['verdict', 'answer', 'reason'],
}

function mcqBlock(q) {
  const opts = optionLetters(q).map((L) => `${L}) ${q.options[L]}`).join('\n')
  return `QUESTION:\n${String(q.questionText || '').trim()}\n\nOPTIONS:\n${opts}`
}

async function solveMcq(q) {
  const letters = optionLetters(q)
  const solves = []
  for (const s of MCQ_SOLVERS) {
    const r = await gemini(questionParts(q, `You are an expert examiner checking a ${q.curriculum} ${q.subject} multiple-choice question.
${s.how}
If the question cannot be answered as given - text broken or incomplete, a needed figure missing, or no option is right - answer NONE.
Give your confidence from 0 to 1 and a reason of at most three sentences. Maths in LaTeX like $x^2$.

${mcqBlock(q)}`), MCQ_SOLVE_SCHEMA, { temperature: s.temperature })
    solves.push({ solver: s.id, answer: r.answer, confidence: Number(r.confidence) || 0, reason: String(r.reason || '').slice(0, 600) })
    const first = solves[0].answer
    // A disagreement or a doubt ends it: nothing below can make that acceptable.
    if (r.answer === 'NONE' || r.answer !== first || !letters.includes(r.answer) || (Number(r.confidence) || 0) < MIN_CONFIDENCE) {
      return { status: 'rejected', why: r.answer === 'NONE' ? 'a solver found it unanswerable' : r.answer !== first ? 'solvers disagree' : 'low confidence or unstored letter', solves }
    }
  }
  const L = solves[0].answer
  const src = String(q.answerText || '').trim()
  const v = await gemini(questionParts(q, `You are an independent senior examiner. Another examiner proposes that the correct answer to this multiple-choice question is ${L}) ${q.options[L]}.
Re-solve the question yourself from scratch. Then give your verdict on the proposal: CORRECT only if you are certain ${L} is right; INCORRECT if another option is right; UNSURE otherwise. Also give the letter you believe is right.
${src ? `\nA worked solution that came with the question (it may be incomplete or end at a lost option):\n${src.slice(0, 3000)}\n` : ''}
${mcqBlock(q)}`), MCQ_VERIFY_SCHEMA, { temperature: 0 })
  const verify = { verdict: v.verdict, answer: v.answer, reason: String(v.reason || '').slice(0, 600) }
  if (v.verdict === 'CORRECT' && v.answer === L) return { status: 'accepted', letter: L, solves, verify }
  return { status: 'rejected', why: 'verifier did not confirm', solves, verify }
}

// ── written ──────────────────────────────────────────────────────────────────
const W_SCHEME_SCHEMA = {
  type: S.OBJ,
  properties: {
    solvable: { type: S.BOOL },
    finalAnswer: { type: S.STR },
    markScheme: { type: S.ARR, items: { type: S.OBJ, properties: { point: { type: S.STR }, marks: { type: S.INT } }, required: ['point', 'marks'] } },
    reason: { type: S.STR },
  },
  required: ['solvable', 'finalAnswer', 'markScheme', 'reason'],
}
const W_FINAL_SCHEMA = {
  type: S.OBJ,
  properties: { solvable: { type: S.BOOL }, finalAnswer: { type: S.STR }, confidence: { type: S.NUM } },
  required: ['solvable', 'finalAnswer', 'confidence'],
}
const W_VERIFY_SCHEMA = {
  type: S.OBJ,
  properties: {
    verdict: { type: S.STR, enum: ['CORRECT', 'INCORRECT', 'UNSURE'] },
    allThreeEquivalent: { type: S.BOOL },
    schemeSound: { type: S.BOOL },
    reason: { type: S.STR },
  },
  required: ['verdict', 'allThreeEquivalent', 'schemeSound', 'reason'],
}

async function solveWritten(q) {
  const max = questionMarks(q, 'written')
  const block = `QUESTION (${max} mark${max === 1 ? '' : 's'} in total):\n${String(q.questionText || '').trim()}`
  const g1 = await gemini(questionParts(q, `You are an experienced ${q.curriculum} ${q.subject} examiner writing the official mark scheme for this question.
Solve it completely. Then write a mark scheme of marking points that an examiner would award, with marks that add up to EXACTLY ${max}. For a part (a), (b)... say which part each point belongs to. For a sketch or diagram, describe the features that earn the marks.
finalAnswer: the final answer(s) only, concise, per part. Maths in LaTeX like $x^2$.
If the question cannot be answered as given (text broken, a needed figure missing), set solvable to false.

${block}`), W_SCHEME_SCHEMA, { temperature: 0 })
  if (!g1.solvable) return { status: 'rejected', why: 'unanswerable as given', g1 }
  const scheme = (g1.markScheme || []).filter((p) => String(p.point || '').trim() && Number(p.marks) > 0)
  const total = scheme.reduce((a, p) => a + Number(p.marks), 0)
  if (!scheme.length || total !== max) return { status: 'rejected', why: `scheme totals ${total}, not ${max}`, g1 }

  const finals = []
  for (const [i, temp] of [[2, 0.5], [3, 0.9]]) {
    const r = await gemini(questionParts(q, `Solve this ${q.curriculum} ${q.subject} question independently and give only the final answer(s), per part, concise. Maths in LaTeX.
If it cannot be answered as given, set solvable to false. Confidence 0 to 1.

${block}`), W_FINAL_SCHEMA, { temperature: temp })
    finals.push({ solver: i, ...r })
    if (!r.solvable || (Number(r.confidence) || 0) < MIN_CONFIDENCE) return { status: 'rejected', why: `solver ${i} unsure or found it unanswerable`, g1, finals }
  }

  const v = await gemini(questionParts(q, `You are an independent senior examiner. Re-solve this question yourself, then judge.

${block}

Three examiners' final answers:
1) ${g1.finalAnswer}
2) ${finals[0].finalAnswer}
3) ${finals[1].finalAnswer}

Proposed mark scheme (${max} marks):
${scheme.map((p) => `- ${p.point} [${p.marks}]`).join('\n')}

verdict: CORRECT only if answer 1 is right and you are certain; INCORRECT if it is wrong; UNSURE otherwise.
allThreeEquivalent: true only if answers 1, 2 and 3 are mathematically / factually the same for every part.
schemeSound: true only if the scheme awards marks for the right working and answers and adds up to ${max}.`), W_VERIFY_SCHEMA, { temperature: 0 })
  const verify = { verdict: v.verdict, allThreeEquivalent: !!v.allThreeEquivalent, schemeSound: !!v.schemeSound, reason: String(v.reason || '').slice(0, 800) }
  if (v.verdict === 'CORRECT' && v.allThreeEquivalent && v.schemeSound) {
    return { status: 'accepted', finalAnswer: String(g1.finalAnswer).trim(), markScheme: scheme, max, g1: { reason: g1.reason }, finals, verify }
  }
  return { status: 'rejected', why: 'verifier did not confirm', g1, finals, verify }
}

function schemeText(r) {
  return [`Final answer: ${r.finalAnswer}`, '', 'Mark scheme:', ...r.markScheme.map((p) => `- ${p.point} [${p.marks} mark${p.marks === 1 ? '' : 's'}]`)].join('\n')
}

// The OCR pipeline appended an option it could not store as a note at the end
// of the question text. Once the option is stored the note goes - but only a
// note of a known shape, at the very end, that really carries that option.
const squash = (s) => String(s || '').replace(/[\s$]/g, '').toLowerCase()
const E_NOTES = [
  /\s*\(Fifth option, beyond A.D:\s*\(E\)[^\n]*\)\s*$/,
  /\s*\[Option \(E\):[^\]\n]*\]\s*$/,
  /\s*Option \(E\):[^\n]*$/,
  /\s*\(E\)\s*[^\n]*$/,
]
function stripOptionNote(text, optionE) {
  for (const re of E_NOTES) {
    const m = text.match(re)
    if (!m) continue
    if (!squash(m[0]).includes(squash(optionE))) return null
    const out = text.slice(0, m.index).trimEnd()
    return out.length >= 20 ? out : null
  }
  return null
}
const F_NOTES = [
  /\s*\(This question has six lettered options[^\n]*\)\s*$/i,
  /\s*\(Additional answer option:[^\n]*\)\s*$/i,
  /\s*\[Note: this question is printed with SIX lettered choices[^\]\n]*\]\s*$/i,
]
function stripSixthOptionNote(text) {
  for (const re of F_NOTES) {
    const m = text.match(re)
    if (!m) continue
    const out = text.slice(0, m.index).trimEnd()
    return out.length >= 20 ? out : null
  }
  return null
}

// ── selection ────────────────────────────────────────────────────────────────
const ACTIVE = { isActive: { $ne: false } }
const FIELDS = { questionText: 1, options: 1, correctAnswer: 1, answerText: 1, marks: 1, isMCQ: 1, questionImage: 1, curriculum: 1, subject: 1, sourceFolder: 1 }

function arg(name, def) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : def
}

async function main() {
  const mode = process.argv[2]
  await mongoose.connect(process.env.MONGO_URI)
  const db = mongoose.connection.useDb(process.env.IGCSC_DB_NAME || 'igcsc')
  const Q = db.collection('questions')
  const JOBS = db.collection('answerkeyjobs')
  const CAL = db.collection('answerkeycalib')
  const started = Date.now()
  const curriculum = arg('--curriculum')
  const limit = Number(arg('--limit', 1000000))
  const scope = curriculum ? { curriculum } : {}

  if (mode === 'report') {
    const rows = await JOBS.aggregate([{ $group: { _id: { k: '$kind', s: '$status', c: '$curriculum' }, n: { $sum: 1 }, applied: { $sum: { $cond: ['$appliedAt', 1, 0] } } } }, { $sort: { '_id.k': 1, '_id.c': 1 } }]).toArray()
    rows.forEach((r) => console.log(`${r._id.k.padEnd(8)} ${String(r._id.c).padEnd(14)} ${r._id.s.padEnd(9)} ${String(r.n).padStart(5)}  applied ${r.applied}`))
    return
  }

  // Results solved outside this script (the Claude solver/verifier agents) come in
  // as a JSON array of accepted items and go through the same `apply` guards.
  if (mode === 'import') {
    const rows = JSON.parse(require('fs').readFileSync(process.argv[3], 'utf8'))
    const model = arg('--model', 'claude-fable-5-1 + claude-opus-5-5, verified')
    let n = 0
    for (const r of rows) {
      const _id = new mongoose.Types.ObjectId(r.id)
      const q = await Q.findOne({ _id }, { projection: { curriculum: 1, subject: 1 } })
      if (!q) continue
      const set = { kind: r.kind, curriculum: q.curriculum, subject: q.subject, status: 'accepted', model, note: r.note || '', updatedAt: new Date() }
      if (r.kind === 'mcq') Object.assign(set, { letter: r.answer, optionE: r.optionE || null })
      else Object.assign(set, { finalAnswer: r.finalAnswer, markScheme: r.markScheme, max: r.total, setMarks: !!r.setMarks })
      await JOBS.updateOne({ _id }, { $set: set, $setOnInsert: { createdAt: new Date(), appliedAt: null } }, { upsert: true })
      n += 1
    }
    console.log(`imported ${n} accepted results`)
    return
  }

  if (mode === 'apply') {
    let mcq = 0, written = 0, skipped = 0, eFixed = 0, marksSet = 0
    for await (const j of JOBS.find({ status: 'accepted', appliedAt: null })) {
      const now = new Date()
      const prov = { keySource: 'ai-verified', keyCheckedAt: now, keyModel: j.model || MODEL }
      let r
      if (j.kind === 'mcq') {
        // Only while it still has no key: a key added by hand since then wins.
        const filter = { _id: j._id, isMCQ: true, correctAnswer: { $nin: LETTERS } }
        const set = { correctAnswer: j.letter, ...prov }
        if (j.optionE) {
          // An option (E) that only survived in the question text: store it, and
          // drop the note that carried it (the original text is kept on the job).
          const q = await Q.findOne({ _id: j._id }, { projection: { questionText: 1, options: 1 } })
          if (!q || String(q.options?.E || '').trim()) { skipped += 1; await JOBS.updateOne({ _id: j._id }, { $set: { appliedAt: now, appliedChanged: false } }); continue }
          set['options.E'] = j.optionE
          const stripped = stripOptionNote(String(q.questionText || ''), j.optionE)
          if (stripped !== null) { set.questionText = stripped; await JOBS.updateOne({ _id: j._id }, { $set: { textBefore: q.questionText } }) }
          eFixed += 1
        } else {
          const q = await Q.findOne({ _id: j._id }, { projection: { questionText: 1 } })
          const stripped = q ? stripSixthOptionNote(String(q.questionText || '')) : null
          if (stripped !== null) { set.questionText = stripped; await JOBS.updateOne({ _id: j._id }, { $set: { textBefore: q.questionText } }) }
        }
        r = await Q.updateOne(filter, { $set: set })
        if (r.modifiedCount) mcq += 1; else skipped += 1
      } else {
        const set = { answerText: schemeText(j), correctAnswer: j.finalAnswer, ...prov }
        if (j.setMarks && j.max > 0) {
          const q = await Q.findOne({ _id: j._id }, { projection: { marks: 1 } })
          if (q && !(Number(q.marks) > 0)) { set.marks = j.max; marksSet += 1 }
        }
        r = await Q.updateOne(
          { _id: j._id, $and: [{ $or: [{ answerText: null }, { answerText: '' }] }, { $or: [{ correctAnswer: null }, { correctAnswer: '' }] }] },
          { $set: set },
        )
        if (r.modifiedCount) written += 1; else skipped += 1
      }
      await JOBS.updateOne({ _id: j._id }, { $set: { appliedAt: now, appliedChanged: !!r.modifiedCount } })
    }
    console.log(`applied: ${mcq} MCQ keys (${eFixed} with option E restored), ${written} mark schemes (${marksSet} with marks set); ${skipped} skipped (already filled since)`)
    return
  }

  const calibrate = mode.startsWith('calibrate-')
  const kind = mode.endsWith('mcq') ? 'mcq' : 'written'
  let pool
  if (kind === 'mcq') {
    const base = calibrate
      ? { ...ACTIVE, ...scope, isMCQ: true, correctAnswer: { $in: LETTERS } }
      : { ...ACTIVE, ...scope, isMCQ: true, correctAnswer: { $nin: LETTERS } }
    pool = calibrate
      ? await Q.aggregate([{ $match: base }, { $sample: { size: Number(process.argv[3] || 20) * 3 } }, { $project: FIELDS }]).toArray()
      : await Q.find(base).project(FIELDS).sort({ curriculum: 1, _id: 1 }).toArray()
    pool = pool.filter((q) => !isDefect(q) && optionLetters(q).length >= 2 && !optionsLost(q))
    if (calibrate) pool = pool.filter((q) => optionLetters(q).includes(String(q.correctAnswer).trim().toUpperCase()))
  } else {
    const empty = { $and: [{ $or: [{ answerText: null }, { answerText: '' }] }, { $or: [{ correctAnswer: null }, { correctAnswer: '' }] }] }
    const base = calibrate
      ? { ...ACTIVE, ...scope, isMCQ: { $ne: true }, correctAnswer: { $nin: [null, ''] }, answerText: { $nin: [null, ''] } }
      : { ...ACTIVE, ...scope, isMCQ: { $ne: true }, ...empty }
    pool = calibrate
      ? await Q.aggregate([{ $match: base }, { $sample: { size: Number(process.argv[3] || 10) * 3 } }, { $project: FIELDS }]).toArray()
      : await Q.find(base).project(FIELDS).sort({ curriculum: 1, _id: 1 }).toArray()
    pool = pool.filter((q) => !isDefect(q) && String(q.questionText || '').trim().length >= 40)
  }
  if (calibrate) pool = pool.slice(0, Number(process.argv[3] || (kind === 'mcq' ? 20 : 10)))

  const store = calibrate ? CAL : JOBS
  let done = 0, accepted = 0, rejected = 0, right = 0, wrong = 0, errors = 0
  const wrongList = []
  for (const q of pool) {
    if (done >= limit) break
    if (!calibrate && await JOBS.findOne({ _id: q._id, status: { $in: ['accepted', 'rejected'] } }, { projection: { _id: 1 } })) continue
    // In calibration the real key is hidden from every solver.
    const hidden = calibrate ? { ...q, correctAnswer: '', answerText: '' } : q
    let r
    try {
      r = kind === 'mcq' ? await solveMcq(hidden) : await solveWritten(hidden)
    } catch (e) {
      if (e instanceof DailyQuota) { console.log('STOP:', e.message); break }
      errors += 1
      await store.updateOne({ _id: q._id }, { $set: { kind, curriculum: q.curriculum, status: 'error', error: String(e.message).slice(0, 300), updatedAt: new Date() } }, { upsert: true })
      continue
    }
    done += 1
    if (r.status === 'accepted') accepted += 1; else rejected += 1
    let truth = null
    if (calibrate && r.status === 'accepted') {
      if (kind === 'mcq') {
        truth = String(q.correctAnswer).trim().toUpperCase() === r.letter
      } else {
        const j = await gemini([{ text: `Are these two final answers to the same ${q.subject} question mathematically / factually equivalent for every part? Ignore formatting.\n\nQUESTION:\n${q.questionText}\n\nOFFICIAL: ${q.correctAnswer}\nCANDIDATE: ${r.finalAnswer}` }],
          { type: S.OBJ, properties: { equivalent: { type: S.BOOL }, reason: { type: S.STR } }, required: ['equivalent', 'reason'] })
        truth = !!j.equivalent
      }
      if (truth) right += 1; else { wrong += 1; wrongList.push({ id: String(q._id), curriculum: q.curriculum, official: kind === 'mcq' ? q.correctAnswer : q.correctAnswer, ours: kind === 'mcq' ? r.letter : r.finalAnswer }) }
    }
    await store.updateOne({ _id: q._id }, {
      $set: {
        kind, curriculum: q.curriculum, subject: q.subject, status: r.status, why: r.why || '',
        letter: r.letter, finalAnswer: r.finalAnswer, markScheme: r.markScheme, max: r.max,
        detail: { solves: r.solves, finals: r.finals, verify: r.verify, g1: r.g1 }, truth, model: MODEL, updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    }, { upsert: true })
    const tag = r.status === 'accepted' ? (truth === null ? 'ACCEPT' : truth ? 'ACCEPT ✓' : 'ACCEPT ✗ WRONG') : `reject (${r.why})`
    console.log(`[${done}/${pool.length}] ${q.curriculum} ${q.subject} ${String(q._id).slice(-6)}  ${tag}`)
  }

  const mins = ((Date.now() - started) / 60000).toFixed(1)
  console.log(`\n${mode}: ${done} done in ${mins} min | accepted ${accepted} | rejected ${rejected} | errors ${errors}`)
  if (calibrate) console.log(`calibration: of ${accepted} accepted, ${right} right, ${wrong} WRONG${wrong ? ' -> ' + JSON.stringify(wrongList) : ''}`)
  const cost = (usage.input * 0.30 + (usage.output + usage.thoughts) * 2.50) / 1e6
  console.log(`usage: ${usage.calls} calls, ${usage.input} in, ${usage.output} out, ${usage.thoughts} thinking  ≈ $${cost.toFixed(3)} at paid-tier prices; per question ≈ $${done ? (cost / done).toFixed(4) : '0'}`)
}

main().then(() => process.exit(0)).catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
