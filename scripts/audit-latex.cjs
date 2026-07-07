// Audit imported bank questions for LaTeX rendering hazards, using the SAME split
// logic as app/components/admin/LatexRenderer.js. Flags:
//   - a bare unescaped `$` left in a TEXT segment  => unbalanced delimiters (prose bleed)
//   - a raw `%` / `#` inside a MATH segment         => KaTeX comment / macro-param bug
// Usage: node scripts/audit-latex.cjs [prefixRegex]   (default ^(Diagnostic|Mock4|Mock5)-)
const { loadEnvConfig } = require('@next/env')
loadEnvConfig(process.cwd(), false)
const mongoose = require('mongoose')

const re = /((?<!\\)\$\$[\s\S]*?(?<!\\)\$\$|(?<!\\)\$(?:\\\$|[^$\n])+?(?<!\\)\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g
const S = '$', SS = '$$'
function problems(text) {
  if (!text) return []
  const out = []
  const parts = String(text).split(re)
  for (const part of parts) {
    if (part == null) continue
    const isMath =
      (part.startsWith(SS) && part.endsWith(SS) && part.length > 4) ||
      (part.startsWith(S) && part.endsWith(S) && part.length > 2 && !part.startsWith(SS)) ||
      (part.startsWith('\\[') && part.endsWith('\\]')) ||
      (part.startsWith('\\(') && part.endsWith('\\)'))
    if (isMath) {
      const inner = part.replace(/^\${1,2}|\${1,2}$/g, '')
      if (/(?<!\\)%/.test(inner)) out.push('raw % inside math: ' + part.slice(0, 40))
      if (/(?<!\\)#/.test(inner)) out.push('raw # inside math: ' + part.slice(0, 40))
    } else {
      // bare unescaped $ remaining in text => unbalanced delimiter
      if (/(?<!\\)\$/.test(part)) out.push('stray unescaped $ in text: "' + part.slice(0, 50).replace(/\n/g, ' ') + '"')
    }
  }
  return out
}

;(async () => {
  const prefix = process.argv[2] || '^(Diagnostic|Mock4|Mock5)-'
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 })
  const Q = mongoose.model('Q', new mongoose.Schema({}, { strict: false, collection: 'questions' }))
  const docs = await Q.find({ questionId: { $regex: prefix } }).lean()
  console.log(`Auditing ${docs.length} questions matching ${prefix}`)
  let flagged = 0
  const fields = ['content', 'shortExplanation', 'longExplanation']
  for (const d of docs) {
    const hits = []
    for (const f of fields) for (const p of problems(d[f])) hits.push(`  [${f}] ${p}`)
    // options is a JSON-array string
    try {
      const opts = JSON.parse(d.options || '[]')
      if (Array.isArray(opts)) opts.forEach((o, idx) => problems(o).forEach(p => hits.push(`  [option ${idx}] ${p}`)))
    } catch {}
    if (hits.length) { flagged++; console.log(`\n${d.questionId}:`); hits.forEach(h => console.log(h)) }
  }
  console.log(`\n==== ${flagged} of ${docs.length} questions flagged ====`)
  await mongoose.disconnect(); process.exit(0)
})().catch(e => { console.error('ERR', e && e.message); process.exit(1) })
