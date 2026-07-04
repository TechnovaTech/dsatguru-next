// Single source of truth for "is this a multiple-choice question or a
// fill-in-the-blank (student-produced response) question?"
//
// Background: SAT/DSAT Math modules contain grid-in questions that have no
// answer choices — the student types a numeric answer (e.g. "5", "-1/3").
// In uploaded JSON these arrive with the four options set to the literal
// placeholder "N/A" (or left empty). Because "N/A" is a non-empty string,
// every naive `option && ...` / `option.trim()` check treated such a
// question as a real 4-option MCQ and rendered "A. N/A  B. N/A ...".
//
// This module collapses those placeholders to empty so the fill-in-the-blank
// paths that already exist across the app light up consistently.

// A blank option is one that is empty or the literal "N/A" (any case / spacing).
// Keep this list intentionally narrow (per product decision: N/A + empty only).
const BLANK_OPTION_TOKENS = new Set(['', 'n/a'])

export function isBlankOption(value) {
  if (value == null) return true
  return BLANK_OPTION_TOKENS.has(String(value).trim().toLowerCase())
}

// Coerce a single option to its stored form: '' when blank, otherwise the
// original string (untrimmed content is preserved — only detection is lenient).
export function cleanOption(value) {
  return isBlankOption(value) ? '' : String(value)
}

// Accept any option shape the codebase uses — a JSON string, an array
// [a,b,c,d], an object {A,B,C,D} (or lowercase), or loose optionA..optionD
// fields on the question — and return a normalized { A, B, C, D } object where
// every blank/"N/A" slot is ''.
export function parseOptions(question) {
  if (!question) return { A: '', B: '', C: '', D: '' }

  let raw = question.options
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    try { raw = trimmed ? JSON.parse(trimmed) : null } catch { raw = null }
  }

  let obj = {}
  if (Array.isArray(raw)) {
    obj = { A: raw[0], B: raw[1], C: raw[2], D: raw[3] }
  } else if (raw && typeof raw === 'object') {
    obj = { A: raw.A ?? raw.a, B: raw.B ?? raw.b, C: raw.C ?? raw.c, D: raw.D ?? raw.d }
  } else {
    obj = { A: question.optionA, B: question.optionB, C: question.optionC, D: question.optionD }
  }

  return {
    A: cleanOption(obj.A),
    B: cleanOption(obj.B),
    C: cleanOption(obj.C),
    D: cleanOption(obj.D),
  }
}

// True when at least one real (non-blank) option exists → multiple choice.
export function hasRealOptions(question) {
  const o = parseOptions(question)
  return o.A !== '' || o.B !== '' || o.C !== '' || o.D !== ''
}

// True when every option is blank/"N/A" → fill-in-the-blank / grid-in.
export function isFillInBlank(question) {
  return !hasRealOptions(question)
}

// Normalize an options value for STORAGE: returns a 4-element array with
// blank/"N/A" slots emptied. For a fill-in-the-blank question this is
// ['', '', '', ''] which downstream detectors read as "no options".
export function normalizeOptionsForStorage(optionsValue) {
  return parseOptionsArray({ options: optionsValue })
}

// Mongoose setter for the Question.options String field. Empties blank/"N/A"
// placeholder options while PRESERVING the stored shape (array stays a JSON
// array string, object stays a JSON object string) so no reader is surprised.
// Always returns a string (the field type). Idempotent, and a no-op on values
// it can't parse. This is the single write-side chokepoint that keeps future
// JSON uploads from re-introducing "N/A" options.
export function optionsSetter(value) {
  if (value == null) return value
  let parsed = value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return value
    try { parsed = JSON.parse(trimmed) } catch { return value } // non-JSON string: leave untouched
  }
  if (Array.isArray(parsed)) return JSON.stringify(parsed.map(cleanOption))
  if (parsed && typeof parsed === 'object') {
    const out = {}
    for (const k of Object.keys(parsed)) out[k] = cleanOption(parsed[k])
    return JSON.stringify(out)
  }
  return value
}

// Same normalization but returns the array form [A, B, C, D].
export function parseOptionsArray(question) {
  const o = parseOptions(question)
  return [o.A, o.B, o.C, o.D]
}
