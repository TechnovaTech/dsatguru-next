// Update shortExplanation + longExplanation on EXISTING bank questions, matched by
// questionId = "<prefix>-Q<q>". Input is an array of { q, shortExplanation, longExplanation }.
//
// Usage (run from /root/dsatguru-next):
//   node scripts/update-explanations.cjs <exp-json> "<prefix>"
const fs = require('fs')
const { loadEnvConfig } = require('@next/env')
loadEnvConfig(process.cwd(), false)
const mongoose = require('mongoose')

const [expFile, prefix] = process.argv.slice(2)
if (!expFile || !prefix) { console.error('usage: node scripts/update-explanations.cjs <exp-json> "<prefix>"'); process.exit(2) }
const uri = process.env.MONGO_URI
if (!uri) { console.error('NO_MONGO_URI'); process.exit(2) }

;(async () => {
  const exps = JSON.parse(fs.readFileSync(expFile, 'utf8'))
  if (!Array.isArray(exps) || !exps.length) throw new Error('exp-json must be a non-empty array')
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 })
  const Q = mongoose.model('Q', new mongoose.Schema({}, { strict: false, collection: 'questions' }))
  let updated = 0, missing = 0
  for (const e of exps) {
    const qid = `${prefix}-Q${e.q}`
    const set = {}
    if (typeof e.shortExplanation === 'string' && e.shortExplanation.trim()) set.shortExplanation = e.shortExplanation
    if (typeof e.longExplanation === 'string' && e.longExplanation.trim()) set.longExplanation = e.longExplanation
    if (!Object.keys(set).length) continue
    const res = await Q.updateOne({ questionId: qid }, { $set: set })
    if (res.matchedCount === 1) updated++; else { missing++; console.log('  not found:', qid) }
  }
  console.log(`\nUpdated ${updated} questions for "${prefix}" (${missing} not matched).`)
  await mongoose.disconnect(); process.exit(0)
})().catch((e) => { console.error('ERR', e && e.message); process.exit(1) })
