// Create a tutor test sheet from an upload-format JSON file:
//   1. inserts each question into the `questions` collection (isTutor=true),
//   2. creates a Test (isTutorTest=true) referencing them in order.
//
// Usage (run from /root/dsatguru-next):
//   node scripts/create-tutor-sheet.cjs <json> "<title>" <durationMins> [--dry]
//
// Reads MONGO_URI the way Next.js does (@next/env) — no secret printed.
const fs = require('fs')
const { loadEnvConfig } = require('@next/env')
loadEnvConfig(process.cwd(), false)
const mongoose = require('mongoose')

const args = process.argv.slice(2)
const DRY = args.includes('--dry')
const [jsonFile, title, durationArg, subjectArg] = args.filter(a => a !== '--dry')
if (!jsonFile || !title) { console.error('usage: node scripts/create-tutor-sheet.cjs <json> "<title>" <durationMins> [subject] [--dry]'); process.exit(2) }
const duration = parseInt(durationArg || '0', 10)
// Subject drives which tutor tab the sheet appears under. R&W sheets MUST be
// "Reading and Writing" (the tab filters on exactly that string); default Math.
const subject = (subjectArg || 'Math').trim()
const uri = process.env.MONGO_URI
if (!uri) { console.error('NO_MONGO_URI'); process.exit(2) }

const norm = (v) => (v == null ? '' : String(v).trim())
const isBlank = (v) => { const s = norm(v).toLowerCase(); return s === '' || s === 'n/a' }
const slug = title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')

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
    subject: norm(q.subject) || subject,
    type: 'MultipleChoice', // fill-in is detected by empty options, not by type
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
  console.log(`Parsed ${docs.length} questions (${fillIns} fill-in-the-blank, ${docs.length - fillIns} MCQ). Slug: ${slug}`)
  console.log('Sample doc[0]:', JSON.stringify({ ...docs[0], content: docs[0].content.slice(0, 80) + '…' }, null, 2))

  if (DRY) { console.log('\nDRY RUN — nothing written.'); process.exit(0) }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 })
  const Question = mongoose.model('Q', new mongoose.Schema({}, { strict: false, collection: 'questions', timestamps: true }))
  const Test = mongoose.model('T', new mongoose.Schema({}, { strict: false, collection: 'tests', timestamps: true }))

  const existingTest = await Test.findOne({ title: title.trim(), isTutorTest: true, isActive: { $ne: false } })
  if (existingTest) { console.log(`ABORT: a tutor test titled "${title}" already exists (${existingTest._id}). Update it via Edit JSON instead.`); await mongoose.disconnect(); process.exit(0) }
  const existingQ = await Question.countDocuments({ questionId: { $regex: `^${slug}-Q` } })
  if (existingQ > 0) { console.log(`ABORT: ${existingQ} questions with prefix "${slug}-Q" already exist. Clean up before re-running.`); await mongoose.disconnect(); process.exit(0) }

  const inserted = await Question.insertMany(docs, { ordered: true })
  const ids = inserted.map((d) => d._id)
  const test = await Test.create({
    title: title.trim(), subject: subject, questions: ids,
    duration, isTimed: duration > 0,
    isTutorTest: true, practiceMode: 'tutor', testType: 'Practice', isActive: true,
  })
  console.log(`\nTEST CREATED: ${test._id}\n  title: ${title}\n  questions: ${ids.length}\n  duration: ${duration} min (isTimed=${duration > 0})`)
  await mongoose.disconnect(); process.exit(0)
})().catch((e) => { console.error('ERR', e && e.message); process.exit(1) })
