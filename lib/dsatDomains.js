// DSAT content taxonomy (domain + skill), and the per-module composition the
// adaptive selector targets.
//
// ---------------------------------------------------------------------------
// SOURCE OF TRUTH
// ---------------------------------------------------------------------------
// Taxonomy: the College Board "Digital SAT Suite of Assessments" content-domain
// tables — R&W Table 2, Math Table 3. Domain names here are the exact strings
// stored on Question.domain; skill names are the exact strings stored on
// Question.skill (the per-question subtopic).
//
// Blueprint (domain mix + difficulty mix): pooled from BOTH pattern-analysis
// workbooks in public/ —
//   `DSAT_December_Pattern_Analysis (1) (2).xlsx`  — Dec-2025 I & II
//   `SAT_2024_Pattern_Analysis (1).xlsx`           — INT Dec-24 B/C, US Jun-24 A/B,
//                                                    US Oct-24 A/B
// Together: 28 module-sheets over 10 real forms, every question labelled with its
// domain, skill and difficulty.
//
// Both workbooks state the SAME difficulty targets, and they are the normative anchor:
//     EBRW Module 1 ≈30% Hard   EBRW Module 2 ≈40% Hard
//     Math Module 1 ≈40% Hard   Math Module 2 ≈60% Hard
// Everything else below is the mean over all 28 module-sheets, rounded with a
// largest-remainder pass so each module sums EXACTLY to its length.
//
// Analysis that produced these numbers: scratchpad/vrf/analyze-both-xlsx.py
// (re-run it if a further workbook is added).

// --- canonical taxonomy: domain -> its skills (subtopics) ---
export const RW_SKILLS = {
  'Craft and Structure': ['Words in Context', 'Text Structure and Purpose', 'Cross-Text Connections'],
  'Information and Ideas': ['Central Ideas and Details', 'Command of Evidence: Textual', 'Command of Evidence: Quantitative', 'Inferences'],
  'Standard English Conventions': ['Boundaries', 'Form, Structure, and Sense'],
  'Expression of Ideas': ['Rhetorical Synthesis', 'Transitions'],
}
export const MATH_SKILLS = {
  Algebra: [
    'Linear Equations in One Variable',
    'Linear Equations in Two Variables',
    'Linear Functions',
    'Systems of Two Linear Equations in Two Variables',
    'Linear Inequalities in One or Two Variables',
  ],
  'Advanced Math': [
    'Equivalent Expressions',
    'Nonlinear Equations in One Variable and Systems of Equations in Two Variables',
    'Nonlinear Functions',
  ],
  'Problem-Solving and Data Analysis': [
    'Ratios, Rates, Proportional Relationships, and Units',
    'Percentages',
    'One-Variable Data: Distributions and Measures of Center and Spread',
    'Two-Variable Data: Models and Scatterplots',
    'Probability and Conditional Probability',
    'Inference from Sample Statistics and Margin of Error',
    'Evaluating Statistical Claims: Observational Studies and Experiments',
  ],
  'Geometry and Trigonometry': ['Area and Volume', 'Lines, Angles, and Triangles', 'Right Triangles and Trigonometry', 'Circles'],
}
export const DOMAIN_SKILLS = { ...RW_SKILLS, ...MATH_SKILLS }
export const RW_DOMAINS = Object.keys(RW_SKILLS)
export const MATH_DOMAINS = Object.keys(MATH_SKILLS)
// skill -> its domain (for validating/repairing a question's pair)
export const SKILL_TO_DOMAIN = Object.entries(DOMAIN_SKILLS).reduce((acc, [dom, skills]) => {
  for (const s of skills) acc[s] = dom
  return acc
}, {})

// --- tag → domain keyword rules (checked in order; first match wins) ---
// Fallback only: questions carry a backfilled `domain`, and these rules cover
// anything imported before/outside that backfill.
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

// True when this question belongs to the Math taxonomy. `subject` is the primary
// signal, but some legacy rows carry a CONTENT DOMAIN there ("Geometry",
// "Algebra", "Advanced Math") instead of "Math" — treat those as Math too.
export function isMathQuestion(question) {
  const subj = String(question?.subject || '').toLowerCase()
  if (subj.includes('read') || subj.includes('writing') || subj.includes('verbal') || subj.includes('english')) return false
  if (subj.includes('math')) return true
  const dom = String(question?.domain || '').trim()
  if (MATH_SKILLS[dom]) return true
  if (RW_SKILLS[dom]) return false
  return !!MATH_SKILLS[subj.replace(/\b\w/g, c => c.toUpperCase())]
}

// Classify a question into its DSAT content domain. Prefers the stored `domain`,
// then derives it from a stored `skill`, then falls back to tag rules.
export function domainOf(question) {
  const stored = String(question?.domain || '').trim()
  if (stored && DOMAIN_SKILLS[stored]) return stored
  const skill = String(question?.skill || '').trim()
  if (skill && SKILL_TO_DOMAIN[skill]) return SKILL_TO_DOMAIN[skill]
  if (stored) return stored
  const isMath = isMathQuestion(question)
  const tagStr = parseTags(question?.tags).join(' | ').toLowerCase()
  if (!tagStr) return null
  for (const [dom, re] of (isMath ? MATH_RULES : RW_RULES)) {
    if (re.test(tagStr)) return dom
  }
  return null
}

// The question's skill (subtopic), only when it is a canonical skill of its domain.
export function skillOf(question) {
  const s = String(question?.skill || '').trim()
  return s && SKILL_TO_DOMAIN[s] ? s : null
}

// ---------------------------------------------------------------------------
// BLUEPRINT — per-module domain mix (counts).
// ---------------------------------------------------------------------------
// Pooled from BOTH workbooks — 28 module-sheets across 10 real forms
// (Dec-2025 I & II, INT Dec-2024 B & C, US Jun-2024 A & B, US Oct-2024 A & B):
//
//   EBRW M1 means  Craft 7.86  Info 7.14  Conventions 5.00  Expression 6.86
//   EBRW M2 means  Craft 7.57  Info 7.29  Conventions 5.14  Expression 6.86
//        → both round to 8 / 7 / 5 / 7. R&W keeps the same shape across modules.
//
//   Math M1 means  Algebra 8.29  Advanced 6.43  PSDA 3.71  Geometry 3.43  → 8 / 7 / 4 / 3
//   Math M2 means  Algebra 6.00  Advanced 8.43  PSDA 3.86  Geometry 3.57  → 6 / 8 / 4 / 4
//        → Math genuinely RESHAPES in Module 2: it sheds Algebra for Advanced Math.
//          That shift is consistent across all 7 forms, so the mix is per-module.
export const DOMAIN_MIX = {
  rw: {
    1: [
      { domain: 'Craft and Structure', count: 8 },
      { domain: 'Information and Ideas', count: 7 },
      { domain: 'Standard English Conventions', count: 5 },
      { domain: 'Expression of Ideas', count: 7 },
    ], // = 27
    2: [
      { domain: 'Craft and Structure', count: 8 },
      { domain: 'Information and Ideas', count: 7 },
      { domain: 'Standard English Conventions', count: 5 },
      { domain: 'Expression of Ideas', count: 7 },
    ], // = 27
  },
  math: {
    1: [
      { domain: 'Algebra', count: 8 },
      { domain: 'Advanced Math', count: 7 },
      { domain: 'Problem-Solving and Data Analysis', count: 4 },
      { domain: 'Geometry and Trigonometry', count: 3 },
    ], // = 22
    2: [
      { domain: 'Algebra', count: 6 },
      { domain: 'Advanced Math', count: 8 },
      { domain: 'Problem-Solving and Data Analysis', count: 4 },
      { domain: 'Geometry and Trigonometry', count: 4 },
    ], // = 22
  },
}

// The domain mix for one module of a section.
export function domainBlueprint(section, moduleNum) {
  const key = section === 'math' ? 'math' : 'rw'
  const mod = Number(moduleNum) === 1 ? 1 : 2
  return DOMAIN_MIX[key][mod]
}

// Kept for callers that want a single representative mix per section (Module 2 —
// the routed module the adaptive engine actually varies).
export const RW_MODULE_MIX = DOMAIN_MIX.rw[2]
export const MATH_MODULE_MIX = DOMAIN_MIX.math[2]

// ---------------------------------------------------------------------------
// BLUEPRINT — per-module difficulty mix (counts).
// ---------------------------------------------------------------------------
// Module 1 is the same for everyone. Module 2 exists in an easier and a harder
// form on the real exam; the workbook's Module-2 sheets are the HARDER form
// (they run hotter than their Module 1), so they define the 'Hard' route. The
// 'Easy' route mirrors it, and 'Medium' sits halfway — this is what makes the
// test adaptive in difficulty rather than just re-drawing at one tier.
//
// Means over all 7 forms per module type (both workbooks). The Hard counts are
// identical across both books; the larger 2024 sample corrects the Easy/Medium
// split for Math, which the 4-form December sample had distorted (it binned Math
// Module 1 almost entirely into Easy/Hard, leaving Medium at ~0).
//
//   EBRW M1 means  E 9.43  M 9.43  H 8.00   → 10 /  9 /  8   (29.6% Hard)
//   EBRW M2 means  E 8.00  M 8.00  H 10.86  →  8 /  8 / 11   (40.7% Hard)
//   Math M1 means  E 8.29  M 4.71  H  8.86  →  8 /  5 /  9   (40.9% Hard)
//   Math M2 means  E 4.43  M 4.43  H 13.00  →  5 /  4 / 13   (59.1% Hard)
export const MODULE1_DIFFICULTY = {
  rw: { Easy: 10, Medium: 9, Hard: 8 },  // 27, 29.6% Hard
  math: { Easy: 8, Medium: 5, Hard: 9 }, // 22, 40.9% Hard
}
// Module 2 exists in an easier and a harder form on the real exam. The workbooks
// only ever show the HARDER form (their M2 runs hotter than their M1), so that is
// the 'Hard' route; 'Easy' mirrors it by swapping the Easy and Hard counts, and
// 'Medium' sits halfway. This is what makes Module 2 adaptive rather than a redraw.
export const MODULE2_DIFFICULTY = {
  rw: {
    Hard: { Easy: 8, Medium: 8, Hard: 11 },   // as observed — 40.7% Hard
    Medium: { Easy: 10, Medium: 8, Hard: 9 },
    Easy: { Easy: 11, Medium: 8, Hard: 8 },
  },
  math: {
    Hard: { Easy: 5, Medium: 4, Hard: 13 },   // as observed — 59.1% Hard
    Medium: { Easy: 9, Medium: 4, Hard: 9 },
    Easy: { Easy: 13, Medium: 4, Hard: 5 },
  },
}

// The difficulty target map for one module of a section.
//   moduleNum 1 → the fixed base module; moduleNum 2 → routed by `tier`.
export function difficultyBlueprint(section, moduleNum, tier) {
  const key = section === 'math' ? 'math' : 'rw'
  if (Number(moduleNum) === 1) return { ...MODULE1_DIFFICULTY[key] }
  const t = String(tier || 'Medium')
  const norm = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  const row = MODULE2_DIFFICULTY[key]
  return { ...(row[norm] || row.Medium) }
}

// Rescale a {key: count} blueprint to a different module length, preserving the
// proportions. Uses largest-remainder so the parts always sum EXACTLY to `size`
// (plain rounding drifts, which would make a module short or long).
export function scaleCounts(counts, size) {
  const target = Number(size) || 0
  const entries = Object.entries(counts || {}).map(([k, v]) => [k, Number(v) || 0])
  const total = entries.reduce((s, [, v]) => s + v, 0)
  if (!target || !total) return Object.fromEntries(entries.map(([k]) => [k, 0]))
  const exact = entries.map(([k, v]) => [k, (v * target) / total])
  const out = exact.map(([k, v]) => [k, Math.floor(v)])
  let left = target - out.reduce((s, [, v]) => s + v, 0)
  // Hand the leftovers to the largest fractional parts, biggest first.
  const order = exact
    .map(([k, v], i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  for (let n = 0; n < order.length && left > 0; n++, left--) out[order[n].i][1] += 1
  return Object.fromEntries(out)
}

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
//   - difficulty mix per the workbook blueprint for THIS module (and routed tier)
//   - domain mix per RW_MODULE_MIX / MATH_MODULE_MIX, balanced inside each
//     difficulty band so both axes land as close to target as the pool allows
//   - Math: ~28% student-produced (grid-in) via MATH_SPR_TARGET, swapped in per-domain
//   - ordering: R&W by the real domain order; Math by ascending difficulty
//   - excludes `usedIds` (ids already served this attempt) and never returns short
//     while ANY questions remain (tops up across difficulties, then the whole pool).
//
// `tier` routes Module 2 ('Easy' | 'Medium' | 'Hard'); it is ignored for Module 1.
// `opts` is either a module number (1 | 2) or { moduleNum, size, difficulty }:
//   size       — module length when it is not the standard 27/22 (server Base→Adaptive
//                flow uses the session's own target); blueprints are scaled to it.
//   difficulty — explicit {Easy,Medium,Hard} counts that override the blueprint
//                (an admin-configured customConfig distribution).
export function composeDsatModule(pool, section, tier, usedIds, opts = {}) {
  const o = typeof opts === 'number' ? { moduleNum: opts } : (opts || {})
  const moduleNum = Number(o.moduleNum) || 2
  const isMath = section === 'math'
  const mix = domainBlueprint(section, moduleNum)
  const size = Number(o.size) > 0 ? Number(o.size) : moduleSize(section)
  const used = usedIds || new Set()
  const avail = (pool || []).filter(q => !used.has(String(q._id)))

  const rawDomain = {}
  for (const { domain, count } of mix) rawDomain[domain] = count
  const domainTarget = scaleCounts(rawDomain, size)
  const rawDiff = o.difficulty && Object.keys(o.difficulty).length
    ? { Easy: Number(o.difficulty.Easy || o.difficulty.easy || 0), Medium: Number(o.difficulty.Medium || o.difficulty.medium || 0), Hard: Number(o.difficulty.Hard || o.difficulty.hard || 0) }
    : difficultyBlueprint(section, moduleNum, tier)
  const diffTarget = scaleCounts(rawDiff, size)

  // Pool indexed by difficulty band.
  const byDiff = { Easy: [], Medium: [], Hard: [] }
  for (const q of avail) byDiff[normDiff(q.difficulty)].push(q)
  for (const k of Object.keys(byDiff)) byDiff[k] = shuffle(byDiff[k])

  const picked = []            // [{ q, domain }]
  const pickedIds = new Set()
  const domCount = {}
  const take = (q, domain) => {
    picked.push({ q, domain })
    pickedIds.add(String(q._id))
    domCount[domain] = (domCount[domain] || 0) + 1
  }

  // Fill each difficulty band to its target, always choosing from the domain that is
  // currently furthest below ITS target — this satisfies the difficulty distribution
  // exactly (pool permitting) while pulling the domain mix toward the blueprint.
  const fillBand = (diff, want) => {
    const bucket = byDiff[diff]
    let got = 0
    while (got < want) {
      let bestIdx = -1
      let bestDeficit = -Infinity
      for (let i = 0; i < bucket.length; i++) {
        const q = bucket[i]
        if (pickedIds.has(String(q._id))) continue
        const dom = domainOf(q) || ''
        const deficit = (domainTarget[dom] || 0) - (domCount[dom] || 0)
        if (deficit > bestDeficit) { bestDeficit = deficit; bestIdx = i }
      }
      if (bestIdx === -1) break
      const q = bucket.splice(bestIdx, 1)[0]
      take(q, domainOf(q) || '')
      got++
    }
    return got
  }

  // Hardest first: Hard questions are the scarcest, so claim them before the
  // easier bands consume shared candidates.
  const bandOrder = ['Hard', 'Medium', 'Easy']
  const shortfall = {}
  for (const diff of bandOrder) {
    const want = Number(diffTarget[diff] || 0)
    shortfall[diff] = want - fillBand(diff, want)
  }

  // A band that could not be filled borrows from the nearest bands, so the module is
  // still full-length (and as close to the intended difficulty as the bank allows).
  const NEIGHBOURS = { Hard: ['Medium', 'Easy'], Medium: ['Hard', 'Easy'], Easy: ['Medium', 'Hard'] }
  for (const diff of bandOrder) {
    let need = shortfall[diff]
    for (const alt of NEIGHBOURS[diff]) {
      if (need <= 0) break
      need -= fillBand(alt, need)
    }
  }

  // Last resort: any remaining question, so we never hand back a short module.
  if (picked.length < size) {
    const rest = shuffle(avail.filter(q => !pickedIds.has(String(q._id))))
    for (const q of rest) {
      if (picked.length >= size) break
      take(q, domainOf(q) || '')
    }
  }
  // Never exceed the module size (a borrow pass can overshoot by a question).
  if (picked.length > size) picked.length = size

  // Math: enforce the ~28% student-produced target by same-domain/difficulty swaps.
  if (isMath) {
    const isSpr = q => !hasRealOptionsRaw(q.options ?? q)
    const remaining = avail.filter(q => !pickedIds.has(String(q._id)))
    let spr = picked.filter(p => isSpr(p.q)).length
    if (spr < MATH_SPR_TARGET) {
      for (const p of picked) {
        if (spr >= MATH_SPR_TARGET) break
        if (isSpr(p.q)) continue
        const sameDomDiff = q => !pickedIds.has(String(q._id)) && isSpr(q) && domainOf(q) === p.domain && normDiff(q.difficulty) === normDiff(p.q.difficulty)
        const sameDiff = q => !pickedIds.has(String(q._id)) && isSpr(q) && normDiff(q.difficulty) === normDiff(p.q.difficulty)
        const cand = remaining.find(sameDomDiff) || remaining.find(sameDiff)
        if (cand) { pickedIds.delete(String(p.q._id)); pickedIds.add(String(cand._id)); p.q = cand; p.domain = domainOf(cand) || p.domain; spr++ }
      }
    } else if (spr > MATH_SPR_TARGET + 2) {
      for (const p of picked) {
        if (spr <= MATH_SPR_TARGET + 2) break
        if (!isSpr(p.q)) continue
        const cand = remaining.find(q => !pickedIds.has(String(q._id)) && !isSpr(q) && domainOf(q) === p.domain && normDiff(q.difficulty) === normDiff(p.q.difficulty))
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
