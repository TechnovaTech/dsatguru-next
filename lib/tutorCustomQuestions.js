// Tutor tests store edited question versions (correctAnswer, options, content, …) in
// Test.customQuestions, keyed by the original question's _id (as a string). The admin
// views already merge these, but student-facing grading / reveal / analytics historically
// used the ORIGINAL Question docs — so a student who picked the tutor's edited correct
// answer was graded wrong and the correct option never highlighted. These helpers are the
// single source of truth for applying customQuestions everywhere.

export function getCustomMap(test) {
  const cq = test?.customQuestions
  return cq && typeof cq === 'object' && !Array.isArray(cq) ? cq : {}
}

// The correct answer to grade against — the tutor's edited value when present, else original.
export function effectiveCorrectAnswer(customMap, questionId, originalCorrect) {
  const cv = customMap?.[String(questionId)]
  const ca = cv && cv.correctAnswer
  return (ca != null && String(ca).trim() !== '') ? ca : originalCorrect
}

// The options to grade against — the tutor's edited options when present, else original.
// (MCQ correctness is decided by option letter, so grading needs the same options the
// student saw.)
export function effectiveOptions(customMap, questionId, originalOptions) {
  const co = customMap?.[String(questionId)]?.options
  if (co == null) return originalOptions
  if (typeof co === 'string' && co.trim() === '') return originalOptions
  return co
}

// Merge a custom version over a plain question object (never lets it overwrite _id).
export function mergeCustomQuestion(customMap, q) {
  const cv = customMap?.[String(q._id)]
  if (!cv) return q
  return { ...q, ...cv, _id: q._id }
}
