// Canonical SAT scoring.
//
// NOTE: This is an APPROXIMATE curve, not the official College Board equating table.
// Section scores are clamped to 200–800 (hard 200 floor) and reported in 10-point steps;
// the total is the sum of the two sections (400–1600). When an official per-form raw→scaled
// lookup table becomes available, replace `toScaledScore` with that table — every flow already
// routes through this single function, so nothing else needs to change.

import { parseOptions } from '../questionOptions'

export const satScaleConfig = {
  linear: {
    min: 200,
    max: 800
  }
}

export const SECTION_MIN = 200
export const SECTION_MAX = 800

// Raw correct (out of maxRaw) → scaled section score (200–800, 200 floor, 10-pt steps).
export function toScaledScore(raw, maxRaw) {
  if (!maxRaw || maxRaw <= 0) return SECTION_MIN
  const ratio = Math.max(0, Math.min(1, raw / maxRaw))
  // Mild concavity approximates the shape of a real SAT section curve.
  const curved = Math.pow(ratio, 0.92)
  const scaled = SECTION_MIN + (SECTION_MAX - SECTION_MIN) * curved
  return Math.round(scaled / 10) * 10
}

// Parse a numeric answer, supporting fractions ("a/b" or "a÷b"), decimals, leading-dot
// (".5"), and surrounding parentheses / spaces — e.g. "(1 ÷ 2)" parses like "1/2".
function parseNumericAnswer(value) {
  if (value == null) return null
  const str = String(value).trim()
    .replace(/[÷∕⁄]/g, '/')   // division signs → slash
    .replace(/[()\s]/g, '')    // drop parentheses and whitespace
  if (str === '') return null
  const frac = str.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/)
  if (frac) {
    const denom = parseFloat(frac[2])
    if (denom === 0) return null
    return parseFloat(frac[1]) / denom
  }
  if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(str)) return parseFloat(str)
  return null
}

// Normalize an answer string so equivalent representations compare equal:
// division sign vs slash, surrounding parentheses, and whitespace are ignored.
function normalizeAnswer(s) {
  return String(s ?? '')
    .replace(/[÷∕⁄]/g, '/')
    .replace(/[()\s]/g, '')
    .toUpperCase()
}

// An answer key that leads with its option letter — "B) 240", "B. 240", "(B) 240", "B: 240".
const LETTER_PREFIX_RE = /^\(?([A-Da-d])[).:]\s*(.*)$/

// Coerce whatever a caller has on hand — a question object (with .options or optionA–D),
// a raw options field (JSON string / array / {A,B,C,D}), or nothing — into a normalized
// { A, B, C, D } object. Returns null when there are no real options (fill-in-the-blank).
function toOptionsObject(optionsLike) {
  if (optionsLike == null) return null
  const isQuestionShaped = typeof optionsLike === 'object' && !Array.isArray(optionsLike) &&
    (optionsLike.options !== undefined || optionsLike.optionA !== undefined ||
     optionsLike.optionB !== undefined || optionsLike.optionC !== undefined ||
     optionsLike.optionD !== undefined)
  const o = parseOptions(isQuestionShaped ? optionsLike : { options: optionsLike })
  return (o.A !== '' || o.B !== '' || o.C !== '' || o.D !== '') ? o : null
}

// Resolve an answer value to its option letter (A–D), or '' when it can't be resolved.
// Accepts a bare letter ("b"), the full text of one of the options (case/space-insensitive),
// or a letter-prefixed key ("B) 240"). Letter identity — not answer text or casing — is what
// decides MCQ correctness.
export function resolveAnswerLetter(value, optionsLike) {
  const v = String(value ?? '').trim()
  if (!v) return ''
  if (/^[A-Da-d]$/.test(v)) return v.toUpperCase()
  const opts = toOptionsObject(optionsLike)
  if (opts) {
    const nv = normalizeAnswer(v)
    for (const L of ['A', 'B', 'C', 'D']) {
      if (opts[L] !== '' && normalizeAnswer(opts[L]) === nv) return L
    }
  }
  const prefixed = v.match(LETTER_PREFIX_RE)
  if (prefixed) return prefixed[1].toUpperCase()
  return ''
}

// Grade a single answer.
//
// MCQ (when `optionsLike` carries real options): correctness is decided by option LETTER
// only. Both sides are resolved to a letter — bare letter, "B) 240"-style prefixed key, or
// option-text match (case/space-insensitive) — so an uploaded JSON key like "B) 240" or
// "D) C < A < B" grades a student's "240" / "c < a < b" as correct. Casing never matters.
//
// Fill-in-the-blank: normalized text match (case/space/parens-insensitive, "1/2" == "1÷2")
// OR numeric equivalence — e.g. 1/2 == 0.5 == .5.
export function answersMatch(correctAnswer, selectedAnswer, optionsLike) {
  const correct = String(correctAnswer ?? '').trim()
  const selected = String(selectedAnswer ?? '').trim()
  if (correct === '' || selected === '') return false

  const opts = toOptionsObject(optionsLike)
  if (opts) {
    const cL = resolveAnswerLetter(correct, opts)
    const sL = resolveAnswerLetter(selected, opts)
    if (cL && sL) return cL === sL
  }

  // Letter-prefixed keys still grade correctly when options weren't passed: match by the
  // prefix letter (vs a bare-letter answer) or by the remainder text (vs an option-text answer).
  const cPre = correct.match(LETTER_PREFIX_RE)
  const sPre = selected.match(LETTER_PREFIX_RE)
  if (cPre && /^[A-Da-d]$/.test(selected)) return cPre[1].toUpperCase() === selected.toUpperCase()
  if (sPre && /^[A-Da-d]$/.test(correct)) return sPre[1].toUpperCase() === correct.toUpperCase()
  const cText = (cPre && cPre[2] !== '') ? cPre[2] : correct
  const sText = (sPre && sPre[2] !== '') ? sPre[2] : selected

  if (normalizeAnswer(cText) === normalizeAnswer(sText)) return true
  const a = parseNumericAnswer(cText)
  const b = parseNumericAnswer(sText)
  if (a !== null && b !== null) {
    if (Math.abs(a - b) < 1e-6) return true
    if (Math.abs(a) > 1e-9 && Math.abs(a - b) / Math.abs(a) < 1e-3) return true
  }
  return false
}

// Authoritatively grade a response set against the question bank and compute SAT scores.
// `questionsById` is a Map<string, { correctAnswer, subject, options? }> (or any object
// exposing those). Include `options` so MCQ grading can decide by option letter.
// Grading is server-side here — client-supplied `isCorrect` is never trusted.
// Returns: { flags, correctAnswers, rwScore, mathScore, totalScore, rwRaw, rwTotal, mathRaw, mathTotal }
export function gradeAndScore(responses, questionsById) {
  let mathRaw = 0, mathTotal = 0, rwRaw = 0, rwTotal = 0, correctAnswers = 0
  const flags = []

  for (const r of (responses || [])) {
    const q = questionsById.get ? questionsById.get(String(r.questionId)) : questionsById[String(r.questionId)]
    const selected = r.selectedAnswer
    let isCorrect = false
    if (q && selected != null && String(selected).trim() !== '') {
      isCorrect = answersMatch(q.correctAnswer, selected, q.options)
    }
    flags.push(isCorrect)
    if (isCorrect) correctAnswers += 1

    if (q) {
      const isMath = String(q.subject || '').toLowerCase().includes('math')
      if (isMath) { mathTotal += 1; if (isCorrect) mathRaw += 1 }
      else { rwTotal += 1; if (isCorrect) rwRaw += 1 }
    }
  }

  const mathScore = toScaledScore(mathRaw, mathTotal)
  const rwScore = toScaledScore(rwRaw, rwTotal)
  return {
    flags,
    correctAnswers,
    rwScore,
    mathScore,
    totalScore: mathScore + rwScore,
    rwRaw, rwTotal, mathRaw, mathTotal
  }
}
