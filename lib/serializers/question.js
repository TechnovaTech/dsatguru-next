import { STAFF_ROLES } from '../constants/roles'

// Fields that reveal the answer / rationale. The single source of truth for what must be
// hidden from a student who is still taking a test.
export const ANSWER_FIELDS = ['correctAnswer', 'explanation', 'shortExplanation', 'longExplanation']

export function stripAnswerFields(question) {
  if (!question) return question
  const clone = { ...(typeof question.toObject === 'function' ? question.toObject() : question) }
  for (const f of ANSWER_FIELDS) delete clone[f]
  return clone
}

// Whether the requester may see answer fields. Staff always may; a student may only after
// the relevant session is completed (review).
export function canRevealAnswers({ role, sessionCompleted = false } = {}) {
  return STAFF_ROLES.includes(role) || !!sessionCompleted
}

function parseMaybeJSON(value, fallback) {
  if (typeof value !== 'string') return value ?? fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  try { return JSON.parse(trimmed) } catch { return fallback }
}

// Normalize a Question document into the shape the frontend expects, optionally stripping answers.
export function toClientQuestion(doc, { includeAnswers = false } = {}) {
  const q = typeof doc?.toObject === 'function' ? doc.toObject() : { ...doc }
  q.id = q._id ? String(q._id) : q.id

  const options = parseMaybeJSON(q.options, [])
  const arr = Array.isArray(options) ? options : []
  q.options = [0, 1, 2, 3].map(i => (arr[i] != null ? String(arr[i]) : ''))
  q.optionA = q.options[0]; q.optionB = q.options[1]; q.optionC = q.options[2]; q.optionD = q.options[3]
  q.tags = parseMaybeJSON(q.tags, [])
  q.question = q.content || q.title || ''

  if (!includeAnswers) {
    for (const f of ANSWER_FIELDS) delete q[f]
  }
  return q
}
