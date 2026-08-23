// Single source of truth for Digital-SAT adaptive routing + score-band estimation.
//
// The real Digital SAT is: Module 1 (a Medium "base" module) → Module 2 whose difficulty
// tier is chosen from how many Module-1 questions the student got WRONG, done once per
// section (R&W, then Math). This mirrors the routing diagram the product owner supplied:
//
//   Module 1 (Medium)
//      0-2 wrong  → Module 2 HARD
//      3-5 wrong  → Module 2 MEDIUM
//      6+  wrong  → Module 2 EASY
//
// Used by BOTH the server routing API (app/api/tests/[id]/module-routing) and the client
// runner (app/dashboard/tests/[id]/start) so Module 2 is identical no matter which computes it.

import { answersMatch } from './scoring/satScale'

// Questions per module, per section (Digital-SAT format).
export const MODULE_SIZE = { rw: 27, math: 22 }
// Minutes per module, per section (Digital-SAT format): R&W 32, Math 35.
export const MODULE_MINUTES = { rw: 32, math: 35 }

export function moduleSize(section) {
  return MODULE_SIZE[section === 'math' ? 'math' : 'rw']
}

// The real shape of a sections-based adaptive test: 2 modules per enabled section.
//   R&W  → 54 questions (27×2), 64 min (32×2)
//   Math → 44 questions (22×2), 70 min (35×2)
// Used so the catalog/cards never show the raw schema defaults (50 Q / 180 min).
export function adaptiveTestShape(sections) {
  const rw = !!(sections && sections.rw)
  const math = !!(sections && sections.math)
  const questions = (rw ? MODULE_SIZE.rw * 2 : 0) + (math ? MODULE_SIZE.math * 2 : 0)
  const minutes = (rw ? MODULE_MINUTES.rw * 2 : 0) + (math ? MODULE_MINUTES.math * 2 : 0)
  return { questions, minutes, modulesPerSection: 2 }
}

// Module-1 wrong-count → Module-2 difficulty tier. This is the routing rule from the diagram.
export function tierForWrong(wrong) {
  const w = Number(wrong) || 0
  if (w <= 2) return 'Hard'
  if (w <= 5) return 'Medium'
  return 'Easy'
}

// A whole-module distribution at a single tier (Module 2 is one tier per the diagram),
// shaped like the client's { easy, medium, hard } count map.
export function singleTierDistribution(tier, size) {
  const t = String(tier || 'Medium').toLowerCase()
  const n = Number(size) || 0
  return { easy: t === 'easy' ? n : 0, medium: t === 'medium' ? n : 0, hard: t === 'hard' ? n : 0 }
}

// Module 1 is a Medium base module.
export function baseModuleDistribution(section) {
  return singleTierDistribution('Medium', moduleSize(section))
}

// Estimated SECTION score band (200–800) from the Module-2 tier + how many Module-2
// questions were wrong. This is the per-section half of the owner's 1600-scale diagram
// (both-sections-Hard & 0-2 wrong ⇒ 1500-1600; both-Easy & 6-8 wrong ⇒ 800-900).
const SECTION_BAND = {
  Hard:   [[750, 800], [700, 750], [650, 700], [600, 650]],
  Medium: [[650, 700], [600, 650], [550, 600], [500, 550]],
  Easy:   [[500, 550], [450, 500], [400, 450], [350, 400]],
}

// Wrong-count → band bucket index (0:0-2, 1:3-5, 2:6-8, 3:9+).
export function wrongBucket(wrong) {
  const w = Number(wrong) || 0
  if (w <= 2) return 0
  if (w <= 5) return 1
  if (w <= 8) return 2
  return 3
}

// [low, high] section band for a given Module-2 tier + wrong count.
export function sectionBand(tier, wrong) {
  const t = String(tier || 'Medium')
  const key = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  const rows = SECTION_BAND[key] || SECTION_BAND.Medium
  const [lo, hi] = rows[wrongBucket(wrong)]
  return [lo, hi]
}

// Sum the per-section bands into an estimated TOTAL band. `sections` is an array of
// { tier, wrong }. Returns { low, high } or null when there is nothing to estimate.
export function estimatedTotalBand(sections) {
  const rows = (sections || []).filter(s => s && s.tier)
  if (!rows.length) return null
  let low = 0, high = 0
  for (const s of rows) {
    const [lo, hi] = sectionBand(s.tier, s.wrong)
    low += lo; high += hi
  }
  return { low, high }
}

// Grade a Module-1 response set server-side and return the routing decision.
// `qMap` is a Map<idString,{correctAnswer,options}>. Returns { correct, total, wrong, tier, distribution }.
export function routeModule2({ section, responses, qMap }) {
  const size = moduleSize(section)
  let correct = 0
  const total = (responses || []).length
  for (const r of (responses || [])) {
    const q = qMap.get ? qMap.get(String(r.questionId)) : qMap[String(r.questionId)]
    const sel = r.selectedAnswer
    if (q && sel != null && String(sel).trim() !== '' && answersMatch(q.correctAnswer, sel, q.options)) correct += 1
  }
  const wrong = Math.max(0, total - correct)
  const tier = tierForWrong(wrong)
  return { correct, total, wrong, tier, distribution: singleTierDistribution(tier, size) }
}

// Per-module server-graded breakdown from a session's moduleAnswers
// ({ moduleKey: { answers:{qid:sel}, questionIds:[...] } }). `qMap` must include difficulty.
// Returns { moduleKey: { correct, total, difficulty } } — difficulty is the module's majority tier.
export function gradeModules(moduleAnswers, qMap) {
  const out = {}
  if (!moduleAnswers || typeof moduleAnswers !== 'object') return out
  for (const [key, mod] of Object.entries(moduleAnswers)) {
    const answers = (mod && mod.answers) || {}
    const questionIds = (mod && mod.questionIds && mod.questionIds.length)
      ? mod.questionIds
      : Object.keys(answers)
    let correct = 0, total = 0
    const diffCount = {}
    for (const qid of questionIds) {
      total += 1
      const q = qMap.get ? qMap.get(String(qid)) : qMap[String(qid)]
      if (!q) continue
      const d = q.difficulty || ''
      if (d) diffCount[d] = (diffCount[d] || 0) + 1
      const sel = answers[qid]
      if (sel != null && String(sel).trim() !== '' && answersMatch(q.correctAnswer, sel, q.options)) correct += 1
    }
    const difficulty = Object.entries(diffCount).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
    out[key] = { correct, total, difficulty }
  }
  return out
}
