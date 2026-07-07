// Import questions from an upload-format JSON into the tutor question bank
// (subject-tagged, isTutor=true, NO test sheet). Each question keeps its own
// subject + remark. Idempotency guard on the questionId prefix.
//
// Usage (run from /root/dsatguru-next):
//   node scripts/import-bank-questions.cjs <json> "<tag>" [--dry]
//   (<tag> becomes the questionId prefix, e.g. "Diagnostic-Math-M1")
const fs = require('fs')
const { loadEnvConfig } = require('@next/env')
loadEnvConfig(process.cwd(), false)
const mongoose = require('mongoose')

const args = process.argv.slice(2)
const DRY = args.includes('--dry')
const [jsonFile, tag] = args.filter(a => a !== '--dry')
if (!jsonFile || !tag) { console.error('usage: node scripts/import-bank-questions.cjs <json> "<tag>" [--dry]'); process.exit(2) }
const uri = process.env.MONGO_URI
if (!uri) { console.error('NO_MONGO_URI'); process.exit(2) }

const norm = (v) => (v == null ? '' : String(v).trim())
const isBlank = (v) => { const s = norm(v).toLowerCase(); return s === '' || s === 'n/a' }
const slug = tag.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')

function toDoc(q, i) {
  const A = q['option a'], B = q['option b'], C = q['option c'], D = q['option d']
  const hasOpts = [A, B, C, D].some((v) => v != null && !isBlank(v))
  const options = hasOpts ? [A, B, C, D].map((v) => (isBlank(v) ? '' : String(v))) : []
  const tags = norm(q.tags).split(',').map((s) => s.trim()).filter(Boolean)
  return {
    questionId: `${slug}-Q${i + 1}`,
    content: norm(q.question),
    options: JSON.stringify(options),
    correctAnswer: norm(q['correct answer']),
    difficulty: norm(q.difficulty) || 'Medium',
    subject: norm(q.subject) || 'Math',
    type: 'MultipleChoice', // fill-in detected by empty options, not by type
    tags: JSON.stringify(tags),
    shortExplanation: norm(q.shortexplanation),
    longExplanation: norm(q.longexplanation),
    remark: norm(q.remark),
    isTutor: true,
    isActive: true,
    points: 1,
  }
}

;(async () => {
  const raw = JSON.parse(fs.readFileSync(jsonFile, 'utf8'))
  if (!Array.isArray(raw) || !raw.length) throw new Error('JSON must be a non-empty array')
  const docs = raw.map(toDoc)
  const fillIns = docs.filter((d) => d.options === '[]').length
  const subjects = [...new Set(docs.map((d) => d.subject))].join(', ')
  console.log(`Parsed ${docs.length} questions (${fillIns} fill-in, ${docs.length - fillIns} MCQ) | subject(s): ${subjects} | prefix: ${slug}`)

  if (DRY) { console.log('DRY RUN — nothing written.'); process.exit(0) }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 })
  const Q = mongoose.model('Q', new mongoose.Schema({}, { strict: false, collection: 'questions', timestamps: true }))
  const existing = await Q.countDocuments({ questionId: { $regex: `^${slug}-Q` } })
  if (existing > 0) { console.log(`ABORT: ${existing} questions with prefix "${slug}-Q" already exist. Clean up before re-running.`); await mongoose.disconnect(); process.exit(0) }

  const ins = await Q.insertMany(docs, { ordered: true })
  console.log(`\nIMPORTED ${ins.length} questions into the bank (isTutor=true, subject-tagged, no sheet).`)
  await mongoose.disconnect(); process.exit(0)
})().catch((e) => { console.error('ERR', e && e.message); process.exit(1) })
