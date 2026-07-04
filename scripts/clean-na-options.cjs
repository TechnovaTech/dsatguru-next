// One-time cleanup: fill-in-the-blank questions were uploaded with the literal
// placeholder options ["N/A","N/A","N/A","N/A"]. Because "N/A" is a non-empty
// string, every option-detector treated them as real 4-choice MCQs and rendered
// "A. N/A ... D. N/A" instead of a fill-in-the-blank input.
//
// This script empties those placeholder options (shape-preserving: the value
// stays a JSON array string, just ["","","",""]) so the fill-in-the-blank paths
// that already exist across the app light up. It ONLY touches questions whose
// options are ALL blank/"N/A" — never a question that has any real option.
//
// Usage (run from /root/dsatguru-next):
//   node scripts/clean-na-options.cjs           # DRY RUN: count + write backup, no changes
//   node scripts/clean-na-options.cjs --apply    # back up, then apply the update
//
// Reads MONGO_URI the way Next.js does (via @next/env) — no secret is printed.
const fs = require('fs')
const path = require('path')
const { loadEnvConfig } = require('@next/env')
loadEnvConfig(process.cwd(), false)
const mongoose = require('mongoose')

const APPLY = process.argv.includes('--apply')
const uri = process.env.MONGO_URI
if (!uri) { console.error('NO_MONGO_URI_IN_ENV'); process.exit(2) }

const norm = (v) => (v == null ? '' : String(v).trim().toLowerCase())
const isBlank = (v) => { const s = norm(v); return s === '' || s === 'n/a' }

// Return { shape, vals } for a stored options value (string JSON / array / object).
function parseOpts(raw) {
  let parsed = raw
  if (typeof raw === 'string') { try { parsed = JSON.parse(raw) } catch { parsed = raw } }
  if (Array.isArray(parsed)) return { shape: 'array', vals: parsed }
  if (parsed && typeof parsed === 'object') return { shape: 'object', vals: ['A','B','C','D'].map(k => parsed[k] ?? parsed[k.toLowerCase()]) }
  return { shape: typeof parsed, vals: [] }
}

;(async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 })
  const Q = mongoose.model('Q', new mongoose.Schema({}, { strict: false, collection: 'questions' }))

  const candidates = await Q.find({ options: { $regex: 'N/?A', $options: 'i' } })
    .select('_id options').lean()

  // Keep only docs whose options are ALL blank/"N/A" (true fill-in-the-blank).
  const targets = []
  for (const d of candidates) {
    const { shape, vals } = parseOpts(d.options)
    if (vals.length > 0 && vals.every(isBlank) && vals.some(v => norm(v) === 'n/a')) {
      targets.push({ _id: d._id, shape, before: d.options })
    }
  }

  console.log(`Candidates matching N/A: ${candidates.length}`)
  console.log(`Targets (ALL options blank/N-A): ${targets.length}`)

  // Always write a backup of the exact "before" state.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(process.cwd(), `_ops_backup_na_options_${stamp}.json`)
  fs.writeFileSync(backupPath, JSON.stringify(targets, null, 2))
  console.log(`Backup written: ${backupPath}`)

  if (!APPLY) {
    console.log('\nDRY RUN — no documents modified. Re-run with --apply to update.')
    console.log('Preview of first 3 targets:')
    console.log(JSON.stringify(targets.slice(0, 3), null, 2))
    await mongoose.disconnect(); process.exit(0)
  }

  // Apply: empty each target's options, preserving its shape.
  let updated = 0
  for (const t of targets) {
    const empty = t.shape === 'object'
      ? JSON.stringify({ A: '', B: '', C: '', D: '' })
      : JSON.stringify(['', '', '', ''])
    const res = await Q.updateOne({ _id: t._id }, { $set: { options: empty } })
    if (res.modifiedCount === 1) updated++
  }
  console.log(`\nAPPLIED. Documents updated: ${updated}/${targets.length}`)

  // Verify nothing with an N/A option remains.
  const remaining = await Q.countDocuments({ options: { $regex: 'N/?A', $options: 'i' } })
  console.log(`Remaining questions with an N/A option: ${remaining}`)

  await mongoose.disconnect(); process.exit(0)
})().catch(e => { console.error('ERR', e && e.message); process.exit(1) })
