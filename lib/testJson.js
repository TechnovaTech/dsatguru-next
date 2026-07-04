// Shared "whole-test JSON" representation used by the Edit-JSON / Download-JSON
// tools across every test-sheet surface (tutor tests, module tests, admin tests).
//
// The JSON is the same "upload format" the sheet JSON download already produces:
// an array of question objects. Images and tables live INSIDE the question text
// (markdown ![](url) / LaTeX / HTML), so they are already part of the JSON — edit
// the JSON and they follow the question automatically.
//
// Edit mode is "edit existing questions only": entries map onto the test's
// existing questions by order (index). It never adds/removes/reorders — those
// would require creating/deleting Question records.

// Ordered question IDs for a test: flatten modules when present, else the flat list.
export function getOrderedQuestionIds(test) {
  if (!test) return []
  const modules = Array.isArray(test.modules) && test.modules.length ? test.modules : null
  if (modules) return modules.flatMap(m => (m.questions || []).map(String))
  return (test.questions || []).map(String)
}

function parseTags(t) {
  try { const a = typeof t === 'string' ? JSON.parse(t) : t; if (Array.isArray(a)) return a } catch {}
  return typeof t === 'string' ? t.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(t) ? t : [])
}

function parseOpts(q) {
  let o = null
  try {
    const r = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
    if (Array.isArray(r)) o = { A: r[0] || '', B: r[1] || '', C: r[2] || '', D: r[3] || '' }
    else if (r && typeof r === 'object') o = r
  } catch {}
  if (!o && (q.optionA || q.optionB || q.optionC || q.optionD)) o = { A: q.optionA || '', B: q.optionB || '', C: q.optionC || '', D: q.optionD || '' }
  return o || {}
}

// Build the editable JSON array (upload format) from ordered, merged questions.
// Matches the existing sheet-download format exactly.
export function buildTestJson(orderedQuestions) {
  return (orderedQuestions || []).map(q => {
    const o = parseOpts(q)
    const g = (k) => String(o[k] ?? o[k.toLowerCase()] ?? '').trim()
    const A = g('A'), B = g('B'), C = g('C'), D = g('D')
    const hasOpts = !!(A || B || C || D) // blank options => fill-in-the-blank (no option fields)
    return {
      question: q.content || q.question || '',
      ...(hasOpts ? { 'option a': A, 'option b': B, 'option c': C, 'option d': D } : {}),
      'correct answer': q.correctAnswer || '',
      difficulty: q.difficulty || 'Medium',
      subject: q.subject || 'Math',
      tags: parseTags(q.tags).join(', '),
      shortexplanation: q.shortExplanation || q.explanation || '',
      longexplanation: q.longExplanation || '',
      remark: q.remark || '',
    }
  })
}

// Map an edited JSON array back onto EXISTING questions (by order) and produce a
// customQuestions overlay merged into the test's existing overlay. Extra/missing
// entries are reported via `warning`, not applied.
export function jsonToCustomQuestions(jsonArr, orderedQuestions, existingCustom = {}) {
  const out = { ...(existingCustom || {}) }
  const n = Math.min(jsonArr.length, orderedQuestions.length)
  for (let i = 0; i < n; i++) {
    const e = jsonArr[i] || {}
    const q = orderedQuestions[i]
    const qId = String(q.id || q._id)
    if (!qId) continue
    const A = String(e['option a'] ?? e.optionA ?? '').trim()
    const B = String(e['option b'] ?? e.optionB ?? '').trim()
    const C = String(e['option c'] ?? e.optionC ?? '').trim()
    const D = String(e['option d'] ?? e.optionD ?? '').trim()
    const tags = Array.isArray(e.tags) ? e.tags : String(e.tags || '').split(',').map(s => s.trim()).filter(Boolean)
    out[qId] = {
      ...(out[qId] || {}),
      content: e.question ?? '',
      options: JSON.stringify([A, B, C, D]), // ["","","",""] => fill-in-the-blank
      correctAnswer: e['correct answer'] ?? e.correctAnswer ?? '',
      difficulty: e.difficulty || 'Medium',
      subject: e.subject || 'Math',
      tags: JSON.stringify(tags),
      shortExplanation: e.shortexplanation ?? e.shortExplanation ?? '',
      longExplanation: e.longexplanation ?? e.longExplanation ?? '',
      remark: e.remark ?? '',
    }
  }
  const warning = jsonArr.length !== orderedQuestions.length
    ? `Note: JSON has ${jsonArr.length} question(s) but this test has ${orderedQuestions.length}. Edit mode updates existing questions only — the first ${n} (in order) were saved. Adding/removing questions isn't supported here.`
    : ''
  return { customQuestions: out, warning }
}
