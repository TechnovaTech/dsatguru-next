// Shared SAT performance analysis: turns a flat list of answered questions into
// the Subject -> Content Domain -> Skill breakdown used by every results and
// analysis screen, so all of them agree on the numbers and the wording.
//
// The taxonomy itself lives in lib/dsatDomains.js (single source of truth for the
// canonical domain and skill names stored on each Question). This module adds the
// College Board *blueprint* metadata that a score report shows next to it:
// the operational weight and question count each content domain carries on a real
// Digital SAT — from the "Digital SAT Suite of Assessments" content tables
// (R&W Table 2, Math Table 3).

import { RW_SKILLS, MATH_SKILLS, DOMAIN_SKILLS, SKILL_TO_DOMAIN } from './dsatDomains'

export const SUBJECT_RW = 'Reading and Writing'
export const SUBJECT_MATH = 'Math'

// Per-domain operational weight + question count on a full-length test.
export const DOMAIN_BLUEPRINT = {
  // Reading and Writing — 54 operational questions
  'Craft and Structure': { weight: '~28%', questions: '13–15', order: 1, subject: SUBJECT_RW },
  'Information and Ideas': { weight: '~26%', questions: '12–14', order: 2, subject: SUBJECT_RW },
  'Standard English Conventions': { weight: '~26%', questions: '11–15', order: 3, subject: SUBJECT_RW },
  'Expression of Ideas': { weight: '~20%', questions: '8–12', order: 4, subject: SUBJECT_RW },
  // Math — 44 operational questions
  Algebra: { weight: '~35%', questions: '13–15', order: 1, subject: SUBJECT_MATH },
  'Advanced Math': { weight: '~35%', questions: '13–15', order: 2, subject: SUBJECT_MATH },
  'Problem-Solving and Data Analysis': { weight: '~15%', questions: '5–7', order: 3, subject: SUBJECT_MATH },
  'Geometry and Trigonometry': { weight: '~15%', questions: '5–7', order: 4, subject: SUBJECT_MATH },
}

// Short labels for tight spaces (radar axes, chips).
export const DOMAIN_SHORT = {
  'Craft and Structure': 'Craft & Structure',
  'Information and Ideas': 'Information & Ideas',
  'Standard English Conventions': 'Standard English',
  'Expression of Ideas': 'Expression of Ideas',
  Algebra: 'Algebra',
  'Advanced Math': 'Advanced Math',
  'Problem-Solving and Data Analysis': 'Problem-Solving & Data',
  'Geometry and Trigonometry': 'Geometry & Trig',
}

// Performance bands — the legend shown under every breakdown.
export const BANDS = [
  { key: 'strong', label: 'Strong', hint: '70% and above', min: 70, dot: '#16a34a', bar: '#16a34a', text: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'border-emerald-200' },
  { key: 'developing', label: 'Developing', hint: '40%–69%', min: 40, dot: '#eab308', bar: '#eab308', text: 'text-amber-700', bg: 'bg-amber-50', ring: 'border-amber-200' },
  { key: 'needs', label: 'Needs Improvement', hint: 'Below 40%', min: 0, dot: '#dc2626', bar: '#dc2626', text: 'text-rose-700', bg: 'bg-rose-50', ring: 'border-rose-200' },
]

// The band a percentage falls in. `null` (no questions seen) has no band.
export function bandFor(pct) {
  if (pct == null || Number.isNaN(pct)) return null
  for (const b of BANDS) if (pct >= b.min) return b
  return BANDS[BANDS.length - 1]
}

const isMathSubject = (s) => String(s || '').toLowerCase().includes('math')

// Normalise one answered question into { subject, domain, skill, correct }.
// Accepts the shapes the various result APIs already produce.
export function normalizeRow(row) {
  if (!row) return null
  const skill = String(row.skill || '').trim()
  const storedDomain = String(row.domain || '').trim()
  // The skill is authoritative: it always determines its domain.
  const domain = (skill && SKILL_TO_DOMAIN[skill]) || (DOMAIN_SKILLS[storedDomain] ? storedDomain : '')
  if (!domain) return null
  const subject = DOMAIN_BLUEPRINT[domain]?.subject
    || (isMathSubject(row.subject) ? SUBJECT_MATH : SUBJECT_RW)
  const correct = row.correct != null ? !!row.correct
    : row.isCorrect != null ? !!row.isCorrect
    : false
  return { subject, domain, skill: skill && SKILL_TO_DOMAIN[skill] === domain ? skill : '', correct }
}

const pctOf = (c, t) => (t > 0 ? Math.round((c / t) * 100) : null)

// Build the full breakdown.
//   rows: [{ subject, domain, skill, isCorrect|correct }]
//   opts.includeEmpty: also list skills the student saw no questions from
// Returns { subjects: [...], overall, hasData }
export function buildSatBreakdown(rows, opts = {}) {
  const includeEmpty = !!opts.includeEmpty
  const supplied = (rows || []).filter(Boolean).length
  const clean = (rows || []).map(normalizeRow).filter(Boolean)
  // Rows we could not place in the taxonomy at all. Reported so a caller can say so
  // rather than silently showing a total that disagrees with the page around it.
  const unclassified = supplied - clean.length

  const subjects = []
  for (const [subjectName, skillMap] of [[SUBJECT_RW, RW_SKILLS], [SUBJECT_MATH, MATH_SKILLS]]) {
    const subjectRows = clean.filter((r) => r.subject === subjectName)
    const domains = []
    for (const domainName of Object.keys(skillMap)) {
      const domainRows = subjectRows.filter((r) => r.domain === domainName)
      const skills = []
      for (const skillName of skillMap[domainName]) {
        const sr = domainRows.filter((r) => r.skill === skillName)
        const total = sr.length
        if (!total && !includeEmpty) continue
        const correct = sr.filter((r) => r.correct).length
        const pct = pctOf(correct, total)
        skills.push({ skill: skillName, correct, total, pct, band: bandFor(pct) })
      }
      // Questions that resolved to this domain but carry no canonical skill still
      // count toward the domain, so they get their own row — otherwise the skill
      // rows would not add up to the domain total sitting above them.
      const unskilledRows = domainRows.filter((r) => !r.skill)
      const unskilled = unskilledRows.length
      if (unskilled > 0) {
        const uCorrect = unskilledRows.filter((r) => r.correct).length
        const uPct = pctOf(uCorrect, unskilled)
        skills.push({ skill: null, isOther: true, correct: uCorrect, total: unskilled, pct: uPct, band: bandFor(uPct) })
      }
      const dTotal = domainRows.length
      const dCorrect = domainRows.filter((r) => r.correct).length
      const dPct = pctOf(dCorrect, dTotal)
      if (!dTotal && !includeEmpty) continue
      domains.push({
        domain: domainName,
        short: DOMAIN_SHORT[domainName] || domainName,
        ...DOMAIN_BLUEPRINT[domainName],
        skills,
        unskilled,
        correct: dCorrect,
        total: dTotal,
        pct: dPct,
        band: bandFor(dPct),
      })
    }
    const sTotal = subjectRows.length
    const sCorrect = subjectRows.filter((r) => r.correct).length
    const sPct = pctOf(sCorrect, sTotal)
    subjects.push({
      subject: subjectName,
      isMath: subjectName === SUBJECT_MATH,
      domains: domains.sort((a, b) => (a.order || 9) - (b.order || 9)),
      correct: sCorrect,
      total: sTotal,
      pct: sPct,
      band: bandFor(sPct),
    })
  }

  const total = clean.length
  const correct = clean.filter((r) => r.correct).length
  return {
    subjects: subjects.filter((s) => s.total > 0 || includeEmpty),
    overall: { correct, total, pct: pctOf(correct, total) },
    unclassified,
    hasData: total > 0,
  }
}

// The student's strongest / weakest areas, for the summary callouts.
//   minQuestions guards against a 1-question "100%" looking like a strength.
export function highlights(breakdown, opts = {}) {
  const minQuestions = opts.minQuestions ?? 2
  const all = []
  for (const s of breakdown?.subjects || []) {
    for (const d of s.domains) {
      for (const sk of d.skills) {
        if (sk.total >= minQuestions && sk.pct != null) all.push({ ...sk, domain: d.domain, subject: s.subject })
      }
    }
  }
  const byPct = [...all].sort((a, b) => a.pct - b.pct || b.total - a.total)
  return {
    weakest: byPct.filter((x) => x.pct < 70).slice(0, 4),
    strongest: [...byPct].reverse().filter((x) => x.pct >= 70).slice(0, 3),
    strongestDomain: (breakdown?.subjects || [])
      .flatMap((s) => s.domains)
      .filter((d) => d.total >= minQuestions && d.pct != null)
      .sort((a, b) => b.pct - a.pct)[0] || null,
  }
}

// One-paragraph takeaway, phrased for a student. Deterministic — no model needed.
export function takeaway(breakdown) {
  if (!breakdown?.hasData) return ''
  const { weakest, strongest } = highlights(breakdown)
  const list = (arr) => arr.map((x) => x.skill).filter(Boolean).join(', ')
  if (!weakest.length) {
    return strongest.length
      ? `Strong work across the board — you are at 70% or better in every skill with enough questions to judge, including ${list(strongest)}. Keep the volume up and push into harder items.`
      : 'Keep practising to build up enough attempts per skill for a reliable read on your strengths.'
  }
  const strongPart = strongest.length ? `Keep building on ${list(strongest)}. ` : ''
  return `${strongPart}Focus next on ${list(weakest)} — these are the skills costing you the most points right now.`
}

// Data for the by-domain radar chart (recharts RadarChart).
export function radarData(breakdown) {
  const out = []
  for (const s of breakdown?.subjects || []) {
    for (const d of s.domains) {
      if (d.pct == null) continue
      out.push({ domain: d.short, full: d.domain, subject: s.subject, score: d.pct, total: d.total })
    }
  }
  return out
}

// A rough SAT-style section score (200–800) from raw accuracy, used ONLY when the
// caller has no real scaled score to show. Clearly an estimate, never a claim of
// an official score.
export function estimateSectionScore(pct) {
  if (pct == null) return null
  return Math.round((200 + (pct / 100) * 600) / 10) * 10
}
