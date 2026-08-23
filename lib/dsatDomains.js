// DSAT content-domain classification from question tags, and the official
// per-module composition the adaptive selector targets.
//
// Digital SAT blueprint (College Board specification, verified against real
// 2024 exam papers):
//   Reading & Writing (27 Q/module):
//     Craft and Structure          ~28%  → 7-8 Q  (words in context, text structure/purpose, cross-text)
//     Information and Ideas        ~26%  → 7 Q    (central ideas, evidence, inference)
//     Standard English Conventions ~26%  → 7 Q    (boundaries, form/structure/sense — grammar)
//     Expression of Ideas          ~20%  → 5-6 Q  (transitions, rhetorical synthesis)
//   Math (22 Q/module, ~25% student-produced/grid-in):
//     Algebra                       ~35%  → 7-8 Q
//     Advanced Math                 ~35%  → 7-8 Q
//     Problem-Solving & Data Analysis ~15% → 3-4 Q
//     Geometry & Trigonometry       ~15%  → 3-4 Q

// --- tag → domain keyword rules (checked in order; first match wins) ---
const RW_RULES = [
  ['Expression of Ideas', /transition|rhetorical|synthesis|notes\b|student.*notes/],
  ['Standard English Conventions', /punctuat|grammar|boundar|convention|subject-verb|verb (form|tense)|modifier|pronoun|apostrophe|comma|semicolon|colon|sentence structure|plural|possessive|agreement/],
  ['Information and Ideas', /inference|evidence|central idea|main idea|detail|quantitative|data interpretation|logical reasoning|logical completion|conclusion|support|claim/],
  ['Craft and Structure', /vocab|context clue|words? in context|word choice|text structure|purpose|cross-text|structure and purpose|function|connotation|precision/],
]
const MATH_RULES = [
  ['Geometry and Trigonometry', /geometr|trigonometr|circle|triangle|angle|area\b|volume|perimeter|pythagor|sine|cosine|tangent|radians|arc\b|polygon|parallel lines|transversal|congruen|similar/],
  ['Problem-Solving and Data Analysis', /statistic|data|ratio|percent|probability|rate\b|rates\b|proportion|unit conversion|scatter|median|mean\b|mode\b|margin of error|survey|sample|box plot|histogram|frequency/],
  ['Advanced Math', /quadratic|polynomial|exponential|nonlinear|radical|rational (expression|function|equation)|function|parabola|vertex|discriminant|factor|absolute value|advanced math|exponent|logarithm|zeros/],
  ['Algebra', /linear|algebra|slope|system|inequalit|equation|intercept|substitution|elimination|solve for|variable|expression/],
]

// Parse whatever shape `tags` is stored in (array, JSON string, comma string).
export function parseTags(tags) {
  if (Array.isArray(tags)) return tags.map(t => String(t).trim()).filter(Boolean)
  const s = String(tags || '').trim()
  if (!s) return []
  if (s.startsWith('[')) { try { return JSON.parse(s).map(t => String(t).trim()).filter(Boolean) } catch {} }
  return s.split(',').map(t => t.trim()).filter(Boolean)
}

// Classify a question into its DSAT content domain. Prefers the DB-backfilled
// `domain` field; falls back to tag rules. Returns the domain name or null.
export function domainOf(question) {
  const stored = String(question?.domain || '').trim()
  if (stored) return stored
  const isMath = String(question?.subject || '').toLowerCase().includes('math')
  const tagStr = parseTags(question?.tags).join(' | ').toLowerCase()
  if (!tagStr) return null
  for (const [dom, re] of (isMath ? MATH_RULES : RW_RULES)) {
    if (re.test(tagStr)) return dom
  }
  return null
}

// Per-module domain targets (counts), calibrated EMPIRICALLY against 6 real 2024 SAT
// papers (441 classified questions): R&W per-module ≈ Craft 7.1 / Info 7.1 / SEC 6.1 /
// EOI 6.3; Math ≈ Algebra 7.8 / Advanced 7.5 / PSDA 3.3 / Geo 3.4; Math SPR 28% (≈6/22).
export const RW_MODULE_MIX = [
  { domain: 'Craft and Structure', count: 8 },
  { domain: 'Information and Ideas', count: 7 },
  { domain: 'Standard English Conventions', count: 6 },
  { domain: 'Expression of Ideas', count: 6 },
] // = 27
export const MATH_MODULE_MIX = [
  { domain: 'Algebra', count: 8 },
  { domain: 'Advanced Math', count: 7 },
  { domain: 'Problem-Solving and Data Analysis', count: 4 },
  { domain: 'Geometry and Trigonometry', count: 3 },
] // = 22

// Math modules aim for ~28% student-produced (grid-in) questions — real papers run 5-7/module.
export const MATH_SPR_TARGET = 6 // of 22

// The real R&W module presents domains in a fixed order (vocab → … → conventions →
// expression); Math roughly ascends by difficulty. Order the selected questions the same way.
export const RW_DOMAIN_ORDER = ['Craft and Structure', 'Information and Ideas', 'Standard English Conventions', 'Expression of Ideas']

export function hasRealOptionsRaw(optionsField) {
  let o = optionsField
  if (typeof o === 'string') { try { o = JSON.parse(o) } catch { o = [] } }
  if (Array.isArray(o)) return o.some(x => x && String(x).trim())
  if (o && typeof o === 'object') return ['A', 'B', 'C', 'D'].some(k => o[k] && String(o[k]).trim())
  return false
}

const normDiff = d => { const s = String(d || '').toLowerCase(); return s === 'easy' ? 'Easy' : s === 'hard' ? 'Hard' : 'Medium' }
const shuffle = a => [...a].sort(() => Math.random() - 0.5)
// Questions per module (Digital-SAT format) — kept local so this lib is self-contained.
const moduleSize = section => (section === 'math' ? 22 : 27)

// Compose one Digital-SAT module from a same-subject pool, matching the real exam:
//   - domain mix per the blueprint (RW_MODULE_MIX / MATH_MODULE_MIX)
//   - difficulty anchored on `tier` ('Medium' for Module 1; the routed tier for Module 2),
//     topping up from neighbouring difficulties per-domain when a cell is short
//   - Math: ~25% student-produced (grid-in) via MATH_SPR_TARGET, swapped in per-domain
//   - ordering: R&W by the real domain order; Math by ascending difficulty
//   - excludes `usedIds` (ids already served this attempt) and never returns short
//     while ANY questions remain (falls back across domains, then the whole pool).
export function composeDsatModule(pool, section, tier, usedIds) {
  const isMath = section === 'math'
  const mix = isMath ? MATH_MODULE_MIX : RW_MODULE_MIX
  const size = moduleSize(section)
  const used = usedIds || new Set()
  const avail = (pool || []).filter(q => !used.has(String(q._id)))
  const diffOrder = tier === 'Hard' ? ['Hard', 'Medium', 'Easy'] : tier === 'Easy' ? ['Easy', 'Medium', 'Hard'] : ['Medium', 'Easy', 'Hard']

  const byDomain = {}
  const unclassified = []
  for (const q of avail) {
    const dom = domainOf(q)
    if (dom && mix.some(mx => mx.domain === dom)) (byDomain[dom] = byDomain[dom] || []).push(q)
    else unclassified.push(q)
  }

  const picked = []            // [{ q, domain }]
  const pickedIds = new Set()
  const take = (q, domain) => { picked.push({ q, domain }); pickedIds.add(String(q._id)) }

  for (const { domain, count } of mix) {
    const bucket = shuffle(byDomain[domain] || [])
    let got = 0
    for (const diff of diffOrder) {
      for (const q of bucket) {
        if (got >= count) break
        if (pickedIds.has(String(q._id)) || normDiff(q.difficulty) !== diff) continue
        take(q, domain); got++
      }
      if (got >= count) break
    }
  }

  // Shortfall: refill from remaining classified questions (any domain, preferred tier
  // first), then from unclassified — the module must reach full size if questions exist.
  const rest = shuffle([...Object.values(byDomain).flat(), ...unclassified].filter(q => !pickedIds.has(String(q._id))))
  for (const diff of diffOrder) {
    for (const q of rest) {
      if (picked.length >= size) break
      if (pickedIds.has(String(q._id)) || normDiff(q.difficulty) !== diff) continue
      take(q, domainOf(q) || '')
    }
  }
  for (const q of rest) { if (picked.length >= size) break; if (!pickedIds.has(String(q._id))) take(q, domainOf(q) || '') }

  // Math: enforce the ~25% student-produced target by same-domain/difficulty swaps.
  if (isMath) {
    const isSpr = q => !hasRealOptionsRaw(q.options ?? q)
    let spr = picked.filter(p => isSpr(p.q)).length
    if (spr < MATH_SPR_TARGET) {
      for (const p of picked) {
        if (spr >= MATH_SPR_TARGET) break
        if (isSpr(p.q)) continue
        const cand = (byDomain[p.domain] || []).find(q => !pickedIds.has(String(q._id)) && isSpr(q) && normDiff(q.difficulty) === normDiff(p.q.difficulty))
          || (byDomain[p.domain] || []).find(q => !pickedIds.has(String(q._id)) && isSpr(q))
        if (cand) { pickedIds.delete(String(p.q._id)); pickedIds.add(String(cand._id)); p.q = cand; spr++ }
      }
    } else if (spr > MATH_SPR_TARGET + 2) {
      for (const p of picked) {
        if (spr <= MATH_SPR_TARGET + 2) break
        if (!isSpr(p.q)) continue
        const cand = (byDomain[p.domain] || []).find(q => !pickedIds.has(String(q._id)) && !isSpr(q) && normDiff(q.difficulty) === normDiff(p.q.difficulty))
        if (cand) { pickedIds.delete(String(p.q._id)); pickedIds.add(String(cand._id)); p.q = cand; spr-- }
      }
    }
  }

  // Ordering: R&W follows the real exam's domain order; Math ascends by difficulty.
  if (!isMath) {
    const rank = d => { const i = RW_DOMAIN_ORDER.indexOf(d); return i === -1 ? RW_DOMAIN_ORDER.length : i }
    picked.sort((a, b) => rank(a.domain) - rank(b.domain))
  } else {
    const dr = { Easy: 0, Medium: 1, Hard: 2 }
    picked.sort((a, b) => dr[normDiff(a.q.difficulty)] - dr[normDiff(b.q.difficulty)])
  }
  return picked.map(p => p.q)
}
