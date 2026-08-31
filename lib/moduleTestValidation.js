// Guard for module-test integrity: the same question must never appear in two
// modules (or twice in one). customQuestions overlays are keyed by question _id,
// so a shared ref makes an edit in one module "change" the other — and students
// would see the same question twice. See memory: module-test-pdf-order-fix.
export function findDuplicateQuestionRefs(modules) {
  const seen = new Set()
  const dups = new Set()
  for (const m of modules || []) {
    for (const id of (m?.questions || [])) {
      const s = String(id)
      if (seen.has(s)) dups.add(s)
      else seen.add(s)
    }
  }
  return [...dups]
}
