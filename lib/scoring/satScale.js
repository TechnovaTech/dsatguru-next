// Canonical SAT scoring.
//
// NOTE: This is an APPROXIMATE curve, not the official College Board equating table.
// Section scores are clamped to 200–800 (hard 200 floor) and reported in 10-point steps;
// the total is the sum of the two sections (400–1600). When an official per-form raw→scaled
// lookup table becomes available, replace `toScaledScore` with that table — every flow already
// routes through this single function, so nothing else needs to change.

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

// Parse a numeric answer, supporting fractions ("a/b"), decimals, and leading-dot (".5").
function parseNumericAnswer(value) {
  if (value == null) return null
  const str = String(value).trim()
  if (str === '') return null
  const frac = str.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/)
  if (frac) {
    const denom = parseFloat(frac[2])
    if (denom === 0) return null
    return parseFloat(frac[1]) / denom
  }
  if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(str)) return parseFloat(str)
  return null
}

// Grade a single answer: exact (case-insensitive) match for MCQ letters, OR numeric
// equivalence for student-produced/grid-in (SPR) answers — e.g. 1/2 == 0.5 == .5.
export function answersMatch(correctAnswer, selectedAnswer) {
  const correct = String(correctAnswer ?? '').trim()
  const selected = String(selectedAnswer ?? '').trim()
  if (correct === '' || selected === '') return false
  if (correct.toUpperCase() === selected.toUpperCase()) return true
  const a = parseNumericAnswer(correct)
  const b = parseNumericAnswer(selected)
  if (a !== null && b !== null) {
    if (Math.abs(a - b) < 1e-6) return true
    if (Math.abs(a) > 1e-9 && Math.abs(a - b) / Math.abs(a) < 1e-3) return true
  }
  return false
}

// Authoritatively grade a response set against the question bank and compute SAT scores.
// `questionsById` is a Map<string, { correctAnswer, subject }> (or any object exposing those).
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
      isCorrect = answersMatch(q.correctAnswer, selected)
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
